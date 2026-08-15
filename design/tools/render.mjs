/* ============================================================================
   render.mjs — screenshot every typography variant on the real pages.

   Serves the repo root itself (so it needs nothing else running), drives
   headless Chromium over the variant matrix, and writes design/shots/.

     node render.mjs
     node render.mjs --variants cm,cmfix --themes dark
     node render.mjs --viewports desktop,mobile --pages projects,portfolio,portal
     node render.mjs --format jpeg --quality 90     # smaller files

   Variants come from design/variants.css — this script does not define any
   styling of its own, it only toggles data-variant on the real pages.
   ========================================================================== */

import http from "node:http";
import { createReadStream } from "node:fs";
import { stat, mkdir, readdir, writeFile } from "node:fs/promises";
import { extname, join, resolve, dirname, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");           // repo root
const SHOTS = resolve(HERE, "..", "shots");

/* ---- the matrix ---------------------------------------------------------- */
const ALL_VARIANTS = ["asis", "cm", "cm-swap", "cmfix", "cm-all", "hybrid", "georgia-all", "sitka"];
/* `projects` is a SECTION now, not a page. #71 retired /projects and the wall of
   cards that was there; what the name means is the Panel at the foot of
   /portfolio, so the entry points at the fragment and CLIP below cuts the shot
   down to the section rather than handing back the whole portfolio page. */
const PAGES = {
  projects:  "/portfolio/#projects",
  portfolio: "/portfolio/",
  portal:    "/"
};
/* Pages whose shot is one element rather than the whole document. */
const CLIP = {
  projects: "#projects"
};
const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  tablet:  { width: 820,  height: 1000 },
  mobile:  { width: 390,  height: 844 }
};

/* ---- args --------------------------------------------------------------- */
function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const key = argv[i].slice(2);
    const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
    out[key] = val;
  }
  return out;
}
const opt = args(process.argv.slice(2));
const list = (v, fallback) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : fallback);

const variants  = list(opt.variants, ALL_VARIANTS);
/* `projects` is off the default list, and not because it is dead — it is the
   Panel, and the Panel is set in Host Grotesk and painted from its own --panel-*
   palette, so not one of the eight variants or two themes reaches it. Rendering
   it by default would be sixteen copies of the same picture. Ask for it by name
   when the section is what changed: --pages projects --viewports desktop,mobile */
const pageKeys  = list(opt.pages, ["portfolio"]);
const themes    = list(opt.themes, ["light", "dark"]);
const viewKeys  = list(opt.viewports, ["desktop"]);
const scale     = Number(opt.scale || 2);
const format    = (opt.format || "auto").toLowerCase();
const quality   = Number(opt.quality || 92);

/* Pick the codec that actually wins for the content. The portal page and the
   projects Panel are flat colour and type, where PNG beats JPEG outright (399 KB
   vs 477 KB measured on the old card wall, and the Panel is flatter still — its
   Frame is a placeholder, not a photograph). The portfolio page carries
   photographs, where JPEG wins by more than 3x (345 KB vs 1161 KB). "auto" is
   therefore the sane default. */
const PHOTO_PAGES = new Set(["portfolio"]);
const formatFor = (pageKey) =>
  format === "auto" ? (PHOTO_PAGES.has(pageKey) ? "jpeg" : "png") : format;

for (const v of variants)  if (!ALL_VARIANTS.includes(v)) fail(`unknown variant "${v}" — have: ${ALL_VARIANTS.join(", ")}`);
for (const p of pageKeys)  if (!PAGES[p])                 fail(`unknown page "${p}" — have: ${Object.keys(PAGES).join(", ")}`);
for (const k of viewKeys)  if (!VIEWPORTS[k])             fail(`unknown viewport "${k}" — have: ${Object.keys(VIEWPORTS).join(", ")}`);
if (!["png", "jpeg", "auto"].includes(format)) fail(`format must be png, jpeg or auto`);

function fail(msg) { console.error("error: " + msg); process.exit(1); }

/* ---- a minimal static server for the repo root -------------------------- */
const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2",
  ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8", ".md": "text/markdown; charset=utf-8"
};

async function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  // contain the path inside ROOT — no traversal out of the repo
  const target = resolve(ROOT, "." + normalize(clean).replace(/^([/\\])+/, sep));
  if (target !== ROOT && !target.startsWith(ROOT + sep)) return null;
  try {
    const s = await stat(target);
    if (s.isDirectory()) {
      const idx = join(target, "index.html");
      await stat(idx);
      return idx;
    }
    return target;
  } catch {
    return null;
  }
}

function serve() {
  const server = http.createServer(async (req, res) => {
    const file = await resolveFile(req.url);
    if (!file) { res.writeHead(404).end("not found"); return; }
    res.writeHead(200, { "Content-Type": MIME[extname(file).toLowerCase()] || "application/octet-stream" });
    createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => ok(server)));
}

/* ---- capture ------------------------------------------------------------ */
const DETERMINISTIC = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
  }
  /* the carousel fades are hover-state dependent; pin them to their resting
     look so shots of the same variant are byte-comparable between runs */
  .veil { opacity: 1 !important; }
`;

async function capture(page, origin, pagePath, variant, theme) {
  await page.goto(origin + pagePath, { waitUntil: "load" });

  // activate the fonts and the variant on the real page
  await page.addStyleTag({ url: "/fonts/fonts.css" });
  await page.addStyleTag({ url: "/design/variants.css" });
  await page.evaluate(([v, t]) => {
    document.documentElement.setAttribute("data-variant", v);
    document.documentElement.setAttribute("data-theme", t);
  }, [variant, theme]);
  await page.addStyleTag({ content: DETERMINISTIC });

  // let lazy images in and give layout a chance to settle
  await page.evaluate(async () => {
    const step = Math.max(200, window.innerHeight / 2);
    for (let y = 0; y < document.body.scrollHeight; y += step) window.scrollTo(0, y);
    window.scrollTo(0, 0);
    await document.fonts.ready;
  });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(150);

  // prove the variant actually took, rather than trusting it
  return page.evaluate(() => {
    const probe = document.createElement("canvas").getContext("2d");
    const w = (f) => { probe.font = "40px " + f; return probe.measureText("Handgloves 123").width; };
    const known = {
      "generic serif": w("serif"), Georgia: w("Georgia"),
      "Latin Modern Roman": w('"Latin Modern Roman"'),
      "LM Roman 9": w('"LM Roman 9"'), "LM Roman 8": w('"LM Roman 8"'),
      "Sitka Text": w('"Sitka Text"')
    };
    /* `.card__desc` was the projects wall's body copy and went with it in #71.
       The fallback is what every remaining page probes. */
    const sel = ".intro p + p, .intro .lead, body";
    const el = document.querySelector(sel) || document.body;
    const cs = getComputedStyle(el);
    const width = w(cs.fontFamily);
    let hit = "unrecognised";
    for (const k in known) if (Math.abs(width - known[k]) < 0.01) { hit = k; break; }
    return { probe: sel, face: hit, size: Math.round(parseFloat(cs.fontSize) * 10) / 10 };
  });
}

/* ---- contact sheet ------------------------------------------------------ */
async function contactSheet(rows) {
  const groups = {};
  for (const r of rows) {
    const key = `${r.page} · ${r.viewport} · ${r.theme}`;
    (groups[key] ||= []).push(r);
  }
  const section = (key) => {
    const items = groups[key].map((r) => `
        <figure>
          <figcaption><b>${r.variant}</b> <span>${r.face} ${r.size}px</span></figcaption>
          <a href="${r.file}" target="_blank" rel="noopener"><img src="${r.file}" alt="${r.variant}" loading="lazy"></a>
        </figure>`).join("");
    return `    <section><h2>${key}</h2><div class="strip">${items}</div></section>`;
  };
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Type variants — contact sheet</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; padding: 1.5rem; font: 13px/1.5 "Segoe UI", system-ui, sans-serif; }
  h1 { font-size: 1.1rem; margin: 0 0 0.2rem; }
  .meta { opacity: 0.65; margin: 0 0 1.5rem; }
  h2 { font-size: 0.78rem; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.6; margin: 2rem 0 0.6rem; }
  .strip { display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 0.5rem; align-items: flex-start; }
  figure { margin: 0; flex: 0 0 auto; width: 420px; }
  figcaption { display: flex; justify-content: space-between; gap: 0.5rem; padding: 0 0 0.3rem; }
  figcaption span { opacity: 0.6; font-family: ui-monospace, monospace; font-size: 11px; }
  img { width: 100%; height: auto; border: 1px solid rgba(128,128,128,0.35); border-radius: 4px; display: block; }
</style></head>
<body>
  <h1>Typography variants</h1>
  <p class="meta">${rows.length} renders · generated by <code>design/tools/render.mjs</code> · scale ${scale}x ·
     click any image for full size. Definitions live in <code>design/variants.css</code>.</p>
${Object.keys(groups).sort().map(section).join("\n")}
</body></html>
`;
  await writeFile(join(SHOTS, "index.html"), html, "utf8");
}

/* ---- run ---------------------------------------------------------------- */
const server = await serve();
const origin = `http://127.0.0.1:${server.address().port}`;
await mkdir(SHOTS, { recursive: true });

const browser = await chromium.launch();
const rows = [];
let n = 0;
const total = pageKeys.length * variants.length * themes.length * viewKeys.length;

console.log(`serving ${ROOT}\n  on ${origin}`);
console.log(`rendering ${total} shots — ${viewKeys.length} viewport(s) x ${pageKeys.length} page(s) x ${variants.length} variant(s) x ${themes.length} theme(s)\n`);

for (const viewport of viewKeys) {
  for (const pageKey of pageKeys) {
    for (const theme of themes) {
      const context = await browser.newContext({
        viewport: VIEWPORTS[viewport],
        deviceScaleFactor: scale,
        reducedMotion: "reduce",
        colorScheme: theme
      });
      // the pages read this on boot, before any of our JS could run
      await context.addInitScript(`try { localStorage.setItem("portfolio-theme", "${theme}"); } catch (e) {}`);
      const page = await context.newPage();

      for (const variant of variants) {
        const ext = formatFor(pageKey);
        const name = `${pageKey}__${variant}__${theme}__${viewport}.${ext}`;
        const info = await capture(page, origin, PAGES[pageKey], variant, theme);
        const shot = {
          path: join(SHOTS, name),
          ...(ext === "jpeg" ? { type: "jpeg", quality } : { type: "png" })
        };
        /* A clipped key shoots the element; everything else shoots the document.
           `fullPage` is not a locator option and would be ignored if passed. */
        if (CLIP[pageKey]) await page.locator(CLIP[pageKey]).screenshot(shot);
        else await page.screenshot({ ...shot, fullPage: true });
        const bytes = (await stat(join(SHOTS, name))).size;
        rows.push({ page: pageKey, variant, theme, viewport, file: name, ...info });
        console.log(`  [${String(++n).padStart(String(total).length)}/${total}] ${name}` +
                    `  ${info.probe} → ${info.face} ${info.size}px  (${Math.round(bytes / 1024)} KB)`);
      }
      await context.close();
    }
  }
}

await browser.close();
server.close();

await contactSheet(rows);

const files = await readdir(SHOTS);
let totalBytes = 0;
for (const f of files) totalBytes += (await stat(join(SHOTS, f))).size;
console.log(`\nwrote ${rows.length} shots + index.html to design/shots/  (${(totalBytes / 1048576).toFixed(1)} MB total)`);
console.log(`open design/shots/index.html for the contact sheet`);
