/* ============================================================================
   render.mjs — screenshot every typography variant on the real pages.

   Serves the repo root itself (so it needs nothing else running), drives
   headless Chromium over the variant matrix, and writes design/shots/.

     node render.mjs
     node render.mjs --variants cm,cmfix --themes dark
     node render.mjs --viewports desktop,mobile --pages panel,portfolio,portal
     node render.mjs --format jpeg --quality 90     # smaller files
     node render.mjs --pages panel --glass blur     # see the Frame's second rung

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
/* `panel`, and NOT `projects`, which is the key this replaces. #71 retired
   /projects and the wall of cards that was there; what is worth shooting now is
   the Panel at the foot of /portfolio, so the entry points at the fragment and
   CLIP below cuts the shot down to the section.

   THE RENAME IS THE POINT, not tidiness. Shot filenames are built from the page
   key, so a repointed `projects` key would write `projects__<variant>__…` over
   the sixteen committed card-wall shots — the only surviving picture of a page
   this same change deletes, and the thing type-lab.html now tells you to go and
   look at. It would overwrite them silently, one run at a time, and a
   deterministic renderer gives no hint that the bytes underneath were a
   different page. Under a new key the two sets sit side by side. */
const PAGES = {
  panel:     "/portfolio/#projects",
  portfolio: "/portfolio/",
  portal:    "/"
};
/* Pages whose shot is one element rather than the whole document, and the
   selector to probe inside it — the page-wide probe would otherwise measure type
   that is not in the frame. */
const CLIP = {
  panel: { shot: "#projects", probe: ".panel-copy p" }
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
/* `panel` is off the default list, and not because it is dead — it is the one
   thing here set in Host Grotesk and painted from its own --panel-* palette, so
   not one of the eight variants or two themes reaches it and a default run would
   write sixteen copies of one picture. The axis it DOES move on is the viewport,
   which is what #57 wants reviewable, so ask for it with the variant and theme
   pinned and the viewports opened up:

     node render.mjs --pages panel --variants sitka --themes light \
                     --viewports desktop,tablet,mobile                         */
const pageKeys  = list(opt.pages, ["portfolio"]);
const themes    = list(opt.themes, ["light", "dark"]);
const viewKeys  = list(opt.viewports, ["desktop"]);
const scale     = Number(opt.scale || 2);
const format    = (opt.format || "auto").toLowerCase();
const quality   = Number(opt.quality || 92);

/* ---- which rung of the Frame's glass to shoot -------------------------------
   The Panel's titlebar is drawn three ways and #67 asks for each one to have
   been SEEN rather than assumed — so this takes the top two away rather than
   trusting a note that says what would happen if they were gone.

     auto   whatever this browser does. Headless Chromium has WebGL2 through
            SwiftShader, so it is the top rung, which is the trap: a run that
            only ever shoots `auto` has never once looked at a fallback.
     blur   WebGL2 removed at the browser. Chromium's --disable-webgl2 is a real
            switch and getContext("webgl2") returns null under it, which is the
            same thing frame-glass.js sees on a browser that never had it.
     flat   that, and the backdrop-filter declaration overridden away.

   THE BOTTOM RUNG CANNOT BE FORCED THE SAME WAY, and the asymmetry is worth
   writing down because the obvious flag does not work.
   --disable-blink-features=CSSBackdropFilter leaves CSS.supports() answering
   true and the @supports block applying, so the page is unchanged and the shot
   would be captioned `flat` while showing a blur. The declarations have to be
   overridden instead — and they have to land BEFORE the page's own script runs,
   because frame-glass.js reads the computed value to decide what to report.
   addStyleTag is after load and therefore too late; the init script below is
   the earliest a stylesheet can be got in.

   BOTH DECLARATIONS, NOT JUST THE BLUR. A browser without backdrop-filter never
   applies that @supports block at all, so it gets neither the blur nor the two
   rings inside it — and overriding only the blur would shoot a bar wearing rims
   no such browser would ever draw, captioned `flat`. */
/* ---- which stone the Panel's plinth is cut from -----------------------------
   --panel-plinth-src is declared on `.panel-plinth` itself, and design/plinth/
   build-slab.py writes a plate per candidate into portfolio/img/tex/. Comparing
   them is the whole acceptance test for #57's plinth — the plate on its own is
   3000x269 of stone with no Frame standing on it, no reflection, no contact
   shadow and none of the page's own colour anywhere near it, and every one of
   those changes what the marble looks like.

     node render.mjs --pages panel --variants sitka --themes dark \
                     --stones nero,gemini,gemini-gold

   The stone lands in the filename whenever one is asked for, for exactly the
   reason the glass mode does: a run that wrote over the committed
   panel__…__dark__desktop.png with a candidate would destroy the only picture
   of what is actually shipping, and look like an ordinary re-run doing it. */
const stones = list(opt.stones, []);

const GLASS_MODES = ["auto", "blur", "flat"];
const glass = (opt.glass || "auto").toLowerCase();
if (!GLASS_MODES.includes(glass)) fail(`glass must be one of: ${GLASS_MODES.join(", ")}`);

const LAUNCH_ARGS = glass === "auto" ? [] : ["--disable-webgl2"];
const FLATTEN = `
  new MutationObserver((_, o) => {
    if (!document.documentElement) return;
    const s = document.createElement("style");
    s.textContent = ".frame-bar { backdrop-filter: none !important;" +
                    " -webkit-backdrop-filter: none !important;" +
                    " box-shadow: none !important }";
    (document.head || document.documentElement).appendChild(s);
    o.disconnect();
  }).observe(document, { childList: true, subtree: true });
`;

/* Pick the codec that actually wins for the content. The portal page and the
   Panel are flat colour and type, where PNG beats JPEG outright (399 KB vs
   477 KB measured on the old card wall, and the Panel is flatter still — its
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

async function capture(page, origin, pagePath, variant, theme, clipProbe, stone) {
  await page.goto(origin + pagePath, { waitUntil: "load" });

  // activate the fonts and the variant on the real page
  await page.addStyleTag({ url: "/fonts/fonts.css" });
  await page.addStyleTag({ url: "/design/variants.css" });
  /* The plate swap, and it has to be `!important` on the same element: the
     custom property is declared on `.panel-plinth`, so a :root override is
     shadowed by it and would silently shoot the stylesheet's stone under the
     candidate's filename. No ?v= — this server sends no cache headers. */
  if (stone) await page.addStyleTag({ content:
    `.panel-plinth { --panel-plinth-src: url("/portfolio/img/tex/plinth-${stone}.webp") !important }` });
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
  return page.evaluate((clipProbe) => {
    const probe = document.createElement("canvas").getContext("2d");
    const w = (f) => { probe.font = "40px " + f; return probe.measureText("Handgloves 123").width; };
    const known = {
      "generic serif": w("serif"), Georgia: w("Georgia"),
      "Latin Modern Roman": w('"Latin Modern Roman"'),
      "LM Roman 9": w('"LM Roman 9"'), "LM Roman 8": w('"LM Roman 8"'),
      "Sitka Text": w('"Sitka Text"'), "Host Grotesk": w('"Host Grotesk"')
    };
    /* A clipped page probes inside its own clip. Measuring the default selector
       would report the CV's lead — type that is not in the frame — and caption
       the shot with a face it does not contain. `.card__desc` was the projects
       wall's body copy and went with it in #71; the default is what every
       unclipped page probes. */
    const sel = clipProbe || ".intro p + p, .intro .lead, body";
    const el = document.querySelector(sel) || document.body;
    const cs = getComputedStyle(el);
    const width = w(cs.fontFamily);
    let hit = "unrecognised";
    for (const k in known) if (Math.abs(width - known[k]) < 0.01) { hit = k; break; }

    /* WHICH RUNG OF THE FRAME'S GLASS ACTUALLY ENGAGED — read off the page, not
       predicted from it. frame-glass.js writes this attribute from the computed
       `backdrop-filter` of the bar that is on screen and from whether its four
       passes really drew, so a shot captioned `blur` is one where the blur is in
       the picture. A bar with no attribute at all is a bar the script never
       reached, which is its own answer and is reported as `no script` rather
       than guessed at. `—` is a page with no Frame in it. */
    const bar = document.querySelector(".frame-bar");
    const tier = !bar ? "—" : (bar.dataset.glass || "no script");

    return { probe: sel, face: hit, size: Math.round(parseFloat(cs.fontSize) * 10) / 10, tier };
  }, clipProbe);
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
          <figcaption><b>${r.variant}</b> <span>${r.face} ${r.size}px${
            r.tier === "—" ? "" : ` · glass ${r.tier}`}</span></figcaption>
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
     glass <code>${glass}</code> · click any image for full size.
     Definitions live in <code>design/variants.css</code>.</p>
${Object.keys(groups).sort().map(section).join("\n")}
</body></html>
`;
  await writeFile(join(SHOTS, "index.html"), html, "utf8");
}

/* ---- run ---------------------------------------------------------------- */
const server = await serve();
const origin = `http://127.0.0.1:${server.address().port}`;
await mkdir(SHOTS, { recursive: true });

const browser = await chromium.launch({ args: LAUNCH_ARGS });
const rows = [];
let n = 0;
const total = pageKeys.length * variants.length * themes.length * viewKeys.length
            * Math.max(stones.length, 1);

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
      if (glass === "flat") await context.addInitScript(FLATTEN);
      const page = await context.newPage();

      for (const variant of variants) {
       for (const stone of (stones.length ? stones : [null])) {
        const ext = formatFor(pageKey);
        /* The glass mode is in the filename whenever it is not the default, for
           the reason the page-key comment above gives at length: shots are
           addressed by name, and a forced rung written over the same name as the
           unforced one destroys the only picture of the top rung while looking
           like an ordinary re-run. `auto` keeps the bare name so the committed
           set does not churn. */
        const suffix = (glass === "auto" ? "" : `__glass-${glass}`)
                     + (stone ? `__stone-${stone}` : "");
        const name = `${pageKey}__${variant}__${theme}__${viewport}${suffix}.${ext}`;
        const clip = CLIP[pageKey];
        const info = await capture(page, origin, PAGES[pageKey], variant, theme, clip && clip.probe, stone);
        const shot = {
          path: join(SHOTS, name),
          ...(ext === "jpeg" ? { type: "jpeg", quality } : { type: "png" })
        };
        /* A clipped key shoots the element; everything else shoots the document.
           `fullPage` is not a locator option and would be ignored if passed. */
        if (clip) await page.locator(clip.shot).screenshot(shot);
        else await page.screenshot({ ...shot, fullPage: true });
        const bytes = (await stat(join(SHOTS, name))).size;
        rows.push({ page: pageKey, variant: stone || variant, theme, viewport, file: name, ...info });
        console.log(`  [${String(++n).padStart(String(total).length)}/${total}] ${name}` +
                    `  ${info.probe} → ${info.face} ${info.size}px` +
                    (info.tier === "—" ? "" : `  glass → ${info.tier}`) +
                    `  (${Math.round(bytes / 1024)} KB)`);
       }
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
