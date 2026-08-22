/* ============================================================================
   render-variants.mjs — render every Variant of every Section into one sheet.

     pnpm variants
     pnpm variants -- --sections stub --variants split,plate
     pnpm variants -- --progress 0,0.5,1        # a Variant that is only motion
     pnpm variants -- --turn 1                  # past the crossing into dark
     pnpm variants -- --viewports desktop,mobile --themes light
     pnpm variants -- --format jpeg              # a wide matrix, a fifth the bytes

   Choosing between Variants is looking, not describing, and this is the looking:
   the matrix rendered and assembled into design/sheets/index.html, captioned
   with what each Variant actually declares so the choice can be made without
   opening a file.

   THIS SCRIPT DEFINES NO STYLING. Every Variant it renders is written in a
   Section's own variants.css and selected by the attribute that file's selectors
   gate on. What is here is the matrix, the harness, and the sheet.

   Three things about it that are decisions rather than details:

   IT SERVES THE dist/ OF THE TREE IT IS RUN FROM, for the reason
   scripts/serve-dist.mjs exists at all — the in-app preview serves the main
   checkout, so in a worktree it reports on `development` while looking like it
   reports on the branch. It needs `pnpm build` to have run and says so.

   THE VARIANT SHEET IS INJECTED, NOT BUILT IN. Nothing imports variants.css —
   that is what makes an unselected Variant cost the shipped page nothing, and
   check-source.mjs fails the build if anything starts to. So this reads the file
   off disk and puts it into the page itself, as a <style> written before any of
   the page's own scripts run. Not a <link>: a Section's Timeline reads Tokens
   with getComputedStyle as it mounts, and a stylesheet that is still in flight at
   that moment would silently give it the shipped value under a Variant's name.

   IT ASKS THE TIMELINE FOR THE MOMENT, WITH hold() FIRST. A scrubbed Timeline is
   recomputed from the scroll position on the next tick, so a bare seek survives
   about one frame — src/kernel/NOTES.md has the whole of that, and it cost a
   wrong diagnosis once already.

   Playwright resolves out of design/tools/node_modules, like every other tool in
   this directory:  npm --prefix design/tools install
   ========================================================================== */

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { contentType, resolveFile } from '../../scripts/static-tree.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const DIST = join(ROOT, 'dist');
const SECTIONS = join(ROOT, 'src', 'sections');

/* ---- the matrix --------------------------------------------------------- */

/** The route the Sections are on. Temporary by construction — /portfolio is
 *  still the live document, and the ticket that flips the route moves this. */
const ROUTE = '/next';

const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  tablet: { width: 820, height: 1000 },
  mobile: { width: 390, height: 844 },
};

/* ---- args --------------------------------------------------------------- */

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    out[key] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
  }
  return out;
}

const opt = args(process.argv.slice(2));
const list = (value, fallback) =>
  value ? value.split(',').map((one) => one.trim()).filter(Boolean) : fallback;

const wanted = {
  sections: list(opt.sections, null),
  variants: list(opt.variants, null),
};
const themes = list(opt.themes, ['light', 'dark']);
const viewKeys = list(opt.viewports, ['desktop']);
const progresses = list(opt.progress, ['0']).map(Number);
/** The Turn is the Kernel's, not a Section's, so it is pinned rather than
 *  crossed: one value for the whole run, or left where the scroll put it. */
const turn = opt.turn === undefined ? null : Number(opt.turn);
const scale = Number(opt.scale || 1);
const route = opt.route || ROUTE;
const full = opt.full === 'true';
/* PNG is faithful and PNG is what these cost: the Effect Stack's grain and
   halftone are noise by construction, so a screen of nearly blank paper comes
   out at over a megabyte and a full matrix at forty. JPEG is a fifth of that and
   smears the grain, which is the one thing on the page nobody chooses a Variant
   on — so it is the right answer for a wide matrix and the wrong one for judging
   a texture. Hence a flag rather than a default. */
const format = (opt.format || 'png').toLowerCase();
const quality = Number(opt.quality || 92);
if (format !== 'png' && format !== 'jpeg') fail('--format must be png or jpeg');
const out = resolve(ROOT, opt.out || join('design', 'sheets'));

for (const key of viewKeys) if (!VIEWPORTS[key]) fail(`unknown viewport "${key}" — have: ${Object.keys(VIEWPORTS).join(', ')}`);
for (const p of progresses) if (!Number.isFinite(p) || p < 0 || p > 1) fail(`--progress takes numbers from 0 to 1, not "${p}"`);
if (turn !== null && (!Number.isFinite(turn) || turn < 0 || turn > 1)) fail('--turn takes a number from 0 to 1');
for (const theme of themes) if (theme !== 'light' && theme !== 'dark') fail(`unknown theme "${theme}" — have: light, dark`);

/* ---- what the Sections declare ------------------------------------------
   Read off the source rather than listed here, for the reason the Kernel's
   loader globs for a Section's Timeline instead of keeping a register: adding a
   Variant is writing one, and there is nowhere to forget to add it. */

const COMMENTS = /\/\*[\s\S]*?\*\//g;
const RULE = /([^{}]+)\{([^{}]*)\}/g;
const GATE = /:root\[data-variant=(?:'([^']*)'|"([^"]*)"|([^\]]*))\]/;

/** A Variant's rules, as CSS, keyed by the name its selectors gate on. */
function byVariant(css) {
  const found = new Map();
  for (const [, selector, body] of css.replace(COMMENTS, '').matchAll(RULE)) {
    const gate = GATE.exec(selector);
    if (!gate) continue;
    const name = (gate[1] ?? gate[2] ?? gate[3] ?? '').trim();
    const rule = `${selector.trim().replace(/\s*\n\s*/g, '\n')} {${body.replace(/\s+$/, '')}\n}`;
    found.set(name, [...(found.get(name) ?? []), rule]);
  }
  return found;
}

/** The declarations of a flat stylesheet, for the sheet to caption `base` with. */
function declarations(css) {
  const found = [];
  for (const [, , body] of css.replace(COMMENTS, '').matchAll(RULE)) {
    for (const declaration of body.split(';')) {
      const trimmed = declaration.trim().replace(/\s+/g, ' ');
      if (trimmed) found.push(`${trimmed};`);
    }
  }
  return found.join('\n');
}

/** A Variant may reach for one of its Section's own assets, and a relative URL
 *  in an injected <style> would resolve against the page instead of the sheet. */
function absoluteUrls(css, base) {
  return css.replace(/url\(\s*(['"]?)(?!data:|https?:|\/)/g, (_, quote) => `url(${quote}${base}`);
}

async function present(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function declaredVariants() {
  const found = [];
  for (const entry of await readdir(SECTIONS, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (wanted.sections && !wanted.sections.includes(entry.name)) continue;
    const dir = join(SECTIONS, entry.name);
    if (!(await present(join(dir, 'variants.css')))) continue;
    const css = await readFile(join(dir, 'variants.css'), 'utf8');
    const tokens = await readFile(join(dir, 'tokens.css'), 'utf8');
    const rules = byVariant(css);
    let names = [...rules.keys()];
    if (wanted.variants) names = names.filter((name) => wanted.variants.includes(name));
    found.push({
      name: entry.name,
      // `base` first and always: the direction that ships is the thing every
      // Variant is an argument against, so it belongs in the picture beside them.
      names: ['base', ...names],
      rules,
      tokens: declarations(tokens),
      style: absoluteUrls(css.replace(COMMENTS, ''), `/src/sections/${entry.name}/`),
    });
  }
  return found;
}

/* ---- the server: dist/, plus src/ for a Variant's own assets ------------ */

function serve() {
  const server = createServer((request, response) => {
    const pathname = (request.url ?? '/').split('?')[0];
    const file = pathname.startsWith('/src/')
      ? resolveFile(ROOT, pathname, { statSync })
      : resolveFile(DIST, pathname, { statSync });
    if (!file) {
      response.statusCode = 404;
      response.end('not found\n');
      return;
    }
    response.setHeader('content-type', contentType(file));
    createReadStream(file)
      .on('error', () => response.destroy())
      .pipe(response);
  });
  // An ephemeral port, but not any ephemeral port. Chromium refuses to navigate
  // to about eighty low ports outright — ERR_UNSAFE_PORT, which reads as a
  // broken page rather than as a bad number — and this machine's dynamic range
  // starts inside them. Every blocked port is under 10081, so ask again until
  // the kernel offers one above them.
  return new Promise((ok) => {
    const listen = () =>
      server.listen(0, '127.0.0.1', () => {
        if (server.address().port >= 10100) return ok(server);
        server.close(listen);
      });
    listen();
  });
}

/* ---- the page ----------------------------------------------------------- */

/** Written before any of the page's own scripts run: the attribute a Variant is
 *  selected by, and the sheet that reads it. A MutationObserver because at
 *  document start there is no documentElement to hang either off yet. */
const INJECT = (variant, css) => `
  new MutationObserver((_, o) => {
    if (!document.documentElement) return;
    ${variant === 'base' ? '' : `document.documentElement.setAttribute("data-variant", ${JSON.stringify(variant)});`}
    const style = document.createElement("style");
    style.textContent = ${JSON.stringify(css)};
    (document.head || document.documentElement).appendChild(style);
    o.disconnect();
  }).observe(document, { childList: true, subtree: true });
`;

/** Two shots of the same Variant should differ only where the Variant does. */
const STILL = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
  }
`;

async function settle(page, section) {
  await page.waitForLoadState('load');
  if ((await page.locator(`[data-section="${section}"]`).count()) === 0) {
    fail(`the ${section} Section is not on ${route} — nothing mounts it, so there is nothing to render`);
  }
  // The Section's top at the top of the window: where its own Timeline starts,
  // and the one scroll position every shot of it can share.
  await page.evaluate((name) => {
    const root = document.querySelector(`[data-section="${name}"]`);
    window.scrollTo(0, Math.round(root.getBoundingClientRect().top + window.scrollY));
  }, section);
  // Mounting is what fetches the Timeline, so this has to be waited for and not
  // guessed at. IntersectionObserver delivers in a real headless browser; it
  // never does in the in-app preview pane, which is why this tool exists rather
  // than a preview.
  await page.waitForSelector(`[data-section="${section}"][data-mounted="true"]`);
  await page.waitForFunction(() => Boolean(window.portfolio?.hold));
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.addStyleTag({ content: STILL });
}

async function moment(page, section, progress) {
  return page.evaluate(
    ([name, p, t]) => {
      const kernel = window.portfolio;
      // hold() first, or the scroll recomputes the frame a tick later and the
      // shot is of whatever the page settled back to.
      kernel.hold();
      kernel.timelines.get(name)?.progress(p);
      if (t !== null) kernel.timelines.get('turn')?.progress(t);

      const root = document.querySelector(`[data-section="${name}"]`);
      const box = root.getBoundingClientRect();
      const heading = root.querySelector('h1, h2, h3');
      const style = heading ? getComputedStyle(heading) : null;
      return {
        box: `${Math.round(box.width)}×${Math.round(box.height)}`,
        face: style ? style.fontFamily.split(',')[0].replace(/["']/g, '') : '—',
        size: style ? `${Math.round(parseFloat(style.fontSize) * 10) / 10}px` : '',
        turn: Math.round(Number(getComputedStyle(document.documentElement).getPropertyValue('--turn')) * 100) / 100,
      };
    },
    [section, progress, turn],
  );
}

/* ---- the sheet ---------------------------------------------------------- */

function escape(text) {
  return String(text).replace(/[&<>]/g, (one) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[one]);
}

async function sheet(rows, declared) {
  const groups = new Map();
  for (const row of rows) {
    const key =
      `${row.section} · ${row.viewport} · ${row.theme}` +
      (progresses.length > 1 ? ` · progress ${row.progress}` : '');
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  const source = new Map(declared.map((one) => [one.name, one]));
  const css = (row) => {
    const section = source.get(row.section);
    if (row.variant === 'base')
      return `/* tokens.css — the direction that ships */\n${section.tokens}`;
    return (section.rules.get(row.variant) ?? []).join('\n\n');
  };

  const figures = (key) =>
    groups
      .get(key)
      .map(
        (row) => `
        <figure>
          <figcaption>
            <b>${escape(row.variant)}</b>
            <span>${escape(row.face)} ${escape(row.size)} · ${escape(row.box)} · turn ${escape(row.turn)}</span>
          </figcaption>
          <a href="${row.file}" target="_blank" rel="noopener"
            ><img src="${row.file}" alt="${escape(row.section)} under ${escape(row.variant)}" loading="lazy"
          /></a>
          <pre>${escape(css(row))}</pre>
        </figure>`,
      )
      .join('');

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Variants — the sheet</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; padding: 1.5rem; font: 13px/1.55 "Segoe UI", system-ui, sans-serif; }
  h1 { font-size: 1.1rem; margin: 0 0 0.2rem; }
  .meta { opacity: 0.65; margin: 0 0 1.5rem; max-width: 70ch; }
  h2 { font-size: 0.78rem; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.6; margin: 2.2rem 0 0.6rem; }
  .strip { display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 0.5rem; align-items: flex-start; }
  figure { margin: 0; flex: 0 0 auto; width: 460px; display: flex; flex-direction: column; gap: 0.35rem; }
  figcaption { display: flex; justify-content: space-between; gap: 0.5rem; align-items: baseline; }
  figcaption b { font-size: 0.95rem; }
  figcaption span { opacity: 0.6; font-family: ui-monospace, monospace; font-size: 11px; text-align: right; }
  img { width: 100%; height: auto; border: 1px solid rgba(128,128,128,0.35); border-radius: 4px; display: block; }
  /* Capped and scrolling, so a Variant that declares a lot does not push the
     next group's pictures out of line with this one's. Comparing them is the
     entire point of a strip. */
  pre { margin: 0; padding: 0.6rem 0.7rem; max-height: 13rem; overflow: auto;
        font-family: ui-monospace, monospace; font-size: 11px; line-height: 1.5;
        border: 1px solid rgba(128,128,128,0.25); border-radius: 4px;
        background: rgba(128,128,128,0.08); }
</style></head>
<body>
  <h1>Variants</h1>
  <p class="meta">${rows.length} render${rows.length === 1 ? '' : 's'} of ${route}, at ${scale}x, by
     <code>design/tools/render-variants.mjs</code>. Under each picture is what that
     Variant declares and nothing else, so the choice can be made here rather than
     in the files. <b>base</b> is the direction that ships — what is in
     <code>tokens.css</code>, with no Variant selected. Click a picture for full
     size. Every run rewrites this directory.</p>
${/* In the order the run made them — viewport, then theme, then Section — rather
      than alphabetically, which would put dark before light for no reason. */
   [...groups.keys()].map((key) => `    <section><h2>${escape(key)}</h2><div class="strip">${figures(key)}</div></section>`).join('\n')}
</body></html>
`;
  await writeFile(join(out, 'index.html'), html, 'utf8');
}

/* ---- run ---------------------------------------------------------------- */

if (!(await present(DIST))) {
  fail('dist/ does not exist — run `pnpm build` first, in this tree');
}

const declared = await declaredVariants();
if (declared.length === 0) fail('no Section declares a Variant to render');

// Wiped rather than written over. The sheet is one command's output and is
// regenerable in a minute, so a directory holding half of one run and half of
// another would only ever be a way to look at a picture that is not there.
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

const server = await serve();
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const rows = [];
const total =
  viewKeys.length *
  themes.length *
  progresses.length *
  declared.reduce((sum, one) => sum + one.names.length, 0);

console.log(`serving ${DIST}\n  on ${origin}${route}`);
console.log(
  `rendering ${total} shot(s) — ${declared.map((one) => `${one.name} (${one.names.length})`).join(', ')}` +
    ` x ${themes.length} theme(s) x ${viewKeys.length} viewport(s) x ${progresses.length} moment(s)\n`,
);

let n = 0;
for (const viewport of viewKeys) {
  for (const theme of themes) {
    for (const section of declared) {
      for (const variant of section.names) {
        const context = await browser.newContext({
          viewport: VIEWPORTS[viewport],
          deviceScaleFactor: scale,
          colorScheme: theme,
        });
        // The Shell reads this before first paint, so it has to be here rather
        // than set on the page afterwards.
        await context.addInitScript(
          `try { localStorage.setItem("portfolio-theme", "${theme}"); } catch (e) {}`,
        );
        await context.addInitScript(INJECT(variant, section.style));
        const page = await context.newPage();
        await page.goto(origin + route, { waitUntil: 'load' });
        await settle(page, section.name);

        for (const progress of progresses) {
          const info = await moment(page, section.name, progress);
          const file =
            `${section.name}__${variant}__${theme}__${viewport}` +
            (progresses.length > 1 || progress !== 0 ? `__p${Math.round(progress * 100)}` : '') +
            (turn === null ? '' : `__turn${Math.round(turn * 100)}`) +
            `.${format}`;
          const target = {
            path: join(out, file),
            ...(format === 'jpeg' ? { type: 'jpeg', quality } : { type: 'png' }),
          };
          if (full) await page.locator(`[data-section="${section.name}"]`).screenshot(target);
          else await page.screenshot(target);
          const bytes = (await stat(join(out, file))).size;
          rows.push({ section: section.name, variant, theme, viewport, progress, file, ...info });
          console.log(
            `  [${String(++n).padStart(String(total).length)}/${total}] ${file}` +
              `  ${info.face} ${info.size} · ${info.box} · turn ${info.turn}` +
              `  (${Math.round(bytes / 1024)} KB)`,
          );
        }
        await context.close();
      }
    }
  }
}

await browser.close();
server.close();
await sheet(rows, declared);

console.log(`\nwrote ${rows.length} shot(s) + index.html to ${opt.out || 'design/sheets'}/`);
console.log('open design/sheets/index.html — the sheet');
