/* ============================================================================
   render-stages.mjs — the two stages, side by side, so one can be chosen (#181).

     pnpm stages
     pnpm stages -- --viewports short,desk,wide --themes light
     pnpm stages -- --progress 0,1           # the flat frame as well as the raised

   WHAT IS BEING COMPARED. The Eater Map Section's Exploded View is drawn by a
   STAGE — `src/sections/eater-map/stage.ts` is the boundary — and there are two
   behind it: the shipped DOM one, and a WebGL one built so the choice is made by
   looking rather than by argument. Crossed with what each can make the Slab's
   edge out of, that is six cells:

                   flat          thick               wrapped
     dom           shipped       the solid sliced    —
     webgl         one quad      a real extrusion    the pixels round the fillet

   THE EMPTY CELL IS THE RESULT AND NOT A GAP — and it is asked of the page
   rather than listed here, so this file cannot disagree with `stage.ts` about
   what is reachable. DOM has no extrusion; a thickness in it is the solid
   SLICED, one flat element per section, which reaches the silhouette, the
   rounded outline and a shaded fillet and stops there. Six faces would not help
   and neither would six hundred slices: a slice is one element and an element
   has one background, so the captured pixels stop at the flat face and the edge
   is paint. That is the one thing the alternative exists to show, and it is
   drawn here rather than described.

   IT SHOOTS AT THE RAISED END BY DEFAULT, because the thing being compared only
   exists there. Every depth in this Section is spent by `--eater-map-lift`, so at
   progress 0 both stages draw the same flat screenshot — which is worth seeing
   too (`--progress 0`), and is exactly the assertion that the two stages agree
   about the composition.

   AND IT SHOOTS IN THE PAGE. Judged on a bench — no Turn, no theme, none of the
   Kernel's layers over the top — this would be a comparison of a different thing,
   so the matrix is windows and themes of the real `/portfolio` and the shot is of
   the drawing inside it.

   Three things it shares with render-variants.mjs beside it, for the same
   reasons that file gives at length: it SERVES THE dist/ OF THE TREE IT IS RUN
   FROM, it ASKS THE TIMELINE FOR THE MOMENT WITH hold() FIRST, and Playwright
   resolves out of design/tools/node_modules —  cd design/tools && npm ci
   ========================================================================== */

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentType, resolveFile } from '../../scripts/static-tree.mjs';
// Every picture the Section is made of, arrived and decoded before a shot — and a
// refusal rather than a shot if one never did (#185). Shared with
// render-variants.mjs: two spellings of one wait is how two sheets come to
// disagree about whether a picture was there.
import { pictures } from './pictures.mjs';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch (error) {
  if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  console.error(
    'error: playwright is not installed for design/tools.\n' +
      '  cd design/tools && npm ci\n' +
      '  (it is not part of `pnpm install`, and a fresh worktree never has it —\n' +
      '   design/tools/node_modules is gitignored. docs/agents/variants.md)',
  );
  process.exit(1);
}

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const DIST = join(ROOT, 'dist');
const ROUTE = '/portfolio';
const SECTION = 'eater-map';

/* ---- the matrix --------------------------------------------------------- */

/**
 * The windows the landing band spans, and nothing outside it.
 *
 * The band is `min-width: 1100px and min-height: 700px` — below it the Section
 * is one column with the Slab flat and no camera at all, so there is no
 * thickness to compare and the cell would be six copies of one picture. `short`
 * is the band's own corner and `wide` is a large desktop; `desk` is the window
 * every Check reads, kept so a shot here can be put beside one from there.
 */
const VIEWPORTS = {
  short: { width: 1100, height: 700 },
  desk: { width: 1440, height: 900 },
  wide: { width: 2560, height: 1440 },
};

/** Which stage, and what each is asked to make the Slab's edge out of. */
const STAGES = ['dom', 'webgl'];
const EDGES = ['flat', 'thick', 'wrapped'];

/**
 * WHETHER A CELL IS REACHABLE IS ASKED OF THE PAGE, NEVER LISTED HERE.
 *
 * `src/sections/eater-map/stage.ts` is the only authority on what each stage can
 * draw, and it answers by refusing: a stage handed an edge it cannot reach falls
 * back to `flat` and writes that on the Section's root. So every cell is loaded,
 * and a cell that comes back drawing something other than what it was asked for
 * IS the empty one. A list here would be a second copy of `REACHES` — and the
 * first version of this file had one, under a comment claiming it was read off
 * the page.
 *
 * What is listed below is only the PROSE — why a particular cell cannot be
 * reached — which is a thing to say and not a thing to decide. A refusal with no
 * entry here still renders as unreachable, with the general sentence.
 */
const WHY = {
  'dom|wrapped':
    'DOM has no extrusion and no fillet to run a texture over. A thickness here ' +
    'is the solid SLICED — one flat element per section — which reaches the ' +
    'silhouette, the rounded outline and a shaded fillet, and stops there: a ' +
    'slice is one element and an element has one background, so the captured ' +
    'pixels stop at the flat face and the edge is paint. Six faces would still ' +
    'be six flat faces. This cell is the finding.',
};

const REFUSED = (stage, edge) =>
  WHY[`${stage}|${edge}`] ??
  `The ${stage} stage was asked for a ${edge} edge and drew something else, so it ` +
    'cannot reach this cell. src/sections/eater-map/stage.ts says which edges each ' +
    'stage lists.';

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

const themes = list(opt.themes, ['light', 'dark']);
/** The two ends of the band by default: the corner it starts at, and a large
 *  desktop. One window would not show that the drawing holds its shape. */
const viewKeys = list(opt.viewports, ['short', 'wide']);
const progresses = list(opt.progress, ['1']).map(Number);
/** BESIDE `design/sheets/` AND NOT INSIDE IT. The Variant sheet wipes its whole
 *  directory on every run, so a comparison written under it would be deleted by
 *  the next `pnpm variants` — two regenerable outputs, and one of them silently
 *  gone. Its own directory, ignored by the same rule's neighbour. */
const OUT_REL = join('design', 'stages');
const out = resolve(ROOT, OUT_REL);

for (const key of viewKeys) {
  if (!VIEWPORTS[key]) fail(`unknown viewport "${key}" — have: ${Object.keys(VIEWPORTS).join(', ')}`);
}
for (const p of progresses) {
  if (!Number.isFinite(p) || p < 0 || p > 1) fail(`--progress takes numbers from 0 to 1, not "${p}"`);
}
for (const theme of themes) {
  if (theme !== 'light' && theme !== 'dark') fail(`unknown theme "${theme}" — have: light, dark`);
}

/* ---- the server --------------------------------------------------------- */

function serve() {
  const server = createServer((request, response) => {
    const file = resolveFile(DIST, (request.url ?? '/').split('?')[0], { statSync });
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
  // Above the ports Chromium refuses outright — render-variants.mjs says why.
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

/** The two attributes the Section's stage boundary reads, written before any of
 *  the page's own scripts run. A MutationObserver because at document start there
 *  is no documentElement to hang them off yet. */
const INJECT = (stage, edge) => `
  new MutationObserver((_, o) => {
    if (!document.documentElement) return;
    document.documentElement.dataset.eaterMapStage = ${JSON.stringify(stage)};
    document.documentElement.dataset.eaterMapEdge = ${JSON.stringify(edge)};
    o.disconnect();
  }).observe(document, { childList: true, subtree: true });
`;

/** Two shots of the same cell should differ only where the cell does. */
const STILL = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
  }
`;

async function settle(page) {
  await page.waitForLoadState('load');
  if ((await page.locator(`[data-section="${SECTION}"]`).count()) === 0) {
    fail(`the ${SECTION} Section is not on ${ROUTE} — there is nothing to draw`);
  }
  await page.evaluate((name) => {
    const root = document.querySelector(`[data-section="${name}"]`);
    window.scrollTo(0, Math.round(root.getBoundingClientRect().top + window.scrollY));
  }, SECTION);
  await page.waitForSelector(`[data-section="${SECTION}"][data-mounted="true"]`);
  // The stage is started by the Section's mount and finishes after it: it waits
  // for the Slab's own bytes to decode. `data-eater-map-stage` on the Section's
  // root is what it writes when it is up, and without waiting for it the WebGL
  // cells would be shot as the DOM ones.
  await page.waitForSelector(`[data-section="${SECTION}"][data-eater-map-stage]`);
  await page.waitForFunction(() => Boolean(window.portfolio?.hold));
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  // AND THE SLAB'S OWN BYTES, which are `loading="lazy"` and therefore in
  // neither of the two waits above. A shot taken before they decode is a picture
  // of three Cards over bare ground — it happened here in one cell of
  // twenty-four before this line existed, and #185 is the same failure caught in
  // the Variant sheet. Under the WebGL stage there is no `<img>` left to wait
  // for, because that stage takes it off the page once it has a texture of it;
  // the shared wait asks whatever is there and is content with none.
  await pictures(page, SECTION, fail);
  await page.addStyleTag({ content: STILL });
}

async function moment(page, progress) {
  const seen = await page.evaluate(
    async ([name, p]) => {
      const kernel = window.portfolio;
      // hold() first, or the scroll recomputes the frame a tick later and the
      // shot is of whatever the page settled back to.
      kernel.hold();
      kernel.timelines.get(name)?.progress(p);
      const root = document.querySelector(`[data-section="${name}"]`);
      const slab = root.querySelector('.eater-map__slab');
      // THE WEBGL STAGE DRAWS ON A FRAME AND NOT ON A SEEK. It reads the Lift off
      // the page each frame rather than being told about it, so a screenshot
      // taken in the same tick as the seek is a picture of the previous moment.
      // Two frames: one for the style to land, one for the draw.
      await new Promise((frame) => requestAnimationFrame(frame));
      await new Promise((frame) => requestAnimationFrame(frame));
      const box = slab.getBoundingClientRect();
      const value = (property) =>
        getComputedStyle(slab).getPropertyValue(property).trim();
      return {
        // Read back off the page rather than assumed: a stage that refused the
        // edge it was asked for reports the one it drew.
        stage: root.dataset.eaterMapStage ?? '(none)',
        edge: root.dataset.eaterMapEdge ?? '(none)',
        canvas: root.querySelectorAll('canvas').length,
        image: root.querySelectorAll('.eater-map__still').length,
        // THE PLANE'S OWN, and the child combinator is why it is right (#190).
        // Every glass surface on every Card carries a slice stack of its own now,
        // built by the same `edge.ts` — so a bare `.eater-map__slice` counts the
        // Cards' hundred-odd along with the Slab's twenty-four and captions this
        // sheet, which is a comparison of two SLAB renderers, with a number about
        // something else.
        slices: root.querySelectorAll('.eater-map__plane > .eater-map__slice').length,
        slab: `${Math.round(box.width)}×${Math.round(box.height)}`,
        thickness: value('--eater-map-slab-thickness'),
        radius: value('--eater-map-slab-edge-radius'),
        lift: Math.round(Number(value('--eater-map-lift')) * 1000) / 1000,
      };
    },
    [SECTION, progress],
  );
  // ASKED AGAIN, AFTER THE SEEK, and render-variants.mjs carries the whole of
  // why: settling is not the state that gets photographed. This Section's markup
  // rests RAISED, so seeking the Lift re-rasters the Slab at a size it was not
  // decoded at, in the window between the seek and the shutter.
  await pictures(page, SECTION, fail);
  return seen;
}

/* ---- the sheet ---------------------------------------------------------- */

function escape(text) {
  return String(text).replace(/[&<>]/g, (one) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[one]);
}

async function sheet(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key =
      `${row.viewport} ${VIEWPORTS[row.viewport].width}×${VIEWPORTS[row.viewport].height} · ${row.theme}` +
      (progresses.length > 1 ? ` · lift ${row.progress}` : '');
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  const cell = (row) => {
    if (row.unreachable) {
      return `
        <figure class="gone">
          <figcaption><b>${escape(row.stage)} · ${escape(row.edge)}</b><span>unreachable</span></figcaption>
          <div class="empty"><p>${escape(row.unreachable)}</p></div>
        </figure>`;
    }
    return `
      <figure>
        <figcaption>
          <b>${escape(row.stage)} · ${escape(row.edge)}</b>
          <span>${escape(row.slab)} · lift ${escape(row.lift)}${
            row.edge === 'flat' ? '' : ` · ${escape(row.thickness)}/${escape(row.radius)}`
          }</span>
        </figcaption>
        <a href="${row.file}" target="_blank" rel="noopener"
          ><img src="${row.file}" alt="the Exploded View, ${escape(row.stage)} stage, ${escape(row.edge)} edge" loading="lazy"
        /></a>
        <p class="note">${escape(row.drawn)}</p>
      </figure>`;
  };

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The two stages — the sheet</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; padding: 1.5rem; font: 13px/1.55 "Segoe UI", system-ui, sans-serif; }
  h1 { font-size: 1.1rem; margin: 0 0 0.2rem; }
  .meta { opacity: 0.7; margin: 0 0 1.5rem; max-width: 76ch; }
  h2 { font-size: 0.78rem; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.6; margin: 2.2rem 0 0.6rem; }
  .strip { display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 0.5rem; align-items: flex-start; }
  figure { margin: 0; flex: 0 0 auto; width: 420px; display: flex; flex-direction: column; gap: 0.35rem; }
  figcaption { display: flex; justify-content: space-between; gap: 0.5rem; align-items: baseline; }
  figcaption b { font-size: 0.95rem; }
  figcaption i { font-weight: 400; font-style: normal; opacity: 0.55; font-size: 0.8rem; color: #c33; }
  figcaption span { opacity: 0.6; font-family: ui-monospace, monospace; font-size: 11px; text-align: right; }
  img { width: 100%; height: auto; border: 1px solid rgba(128,128,128,0.35); border-radius: 4px; display: block; }
  .note { margin: 0; opacity: 0.6; font-size: 11px; font-family: ui-monospace, monospace; }
  /* An unreachable cell is drawn as a cell and not skipped: a hole in a row of
     six reads as a run that failed, and this one is the answer. */
  .empty { border: 1px dashed rgba(128,128,128,0.5); border-radius: 4px; display: flex;
           align-items: center; min-height: 12rem; padding: 1rem; }
  .empty p { margin: 0; opacity: 0.75; }
</style></head>
<body>
  <h1>The Exploded View, drawn twice</h1>
  <p class="meta">${rows.filter((row) => !row.unreachable).length} render(s) of ${ROUTE} by
     <code>design/tools/render-stages.mjs</code> (#181). Two stages behind one boundary —
     <code>src/sections/eater-map/stage.ts</code> — crossed with what each can make the
     Slab's edge out of. <b>There is no empty cell any more</b> (#206): DOM ran out of
     reach at <code>wrapped</code> until a slice was given the picture instead of a
     gradient, and both stages draw all three edges now. What is left to judge is the
     one thing this sheet was always for — whether a faceted 24-slice fillet is
     distinguishable from a swept one at the size the Slab is actually drawn, which
     depends on the roll and crosses over around
     <code>--eater-map-slab-fillet: 0.015</code>.
     Every depth here is spent by the Lift, so <code>--progress 0</code> renders the
     flat screenshot, where the two stages should agree exactly. Click a picture for full
     size. Every run rewrites this directory.</p>
${[...groups.keys()]
  .map((key) => `    <section><h2>${escape(key)}</h2><div class="strip">${groups.get(key).map(cell).join('')}</div></section>`)
  .join('\n')}
</body></html>
`;
  await writeFile(join(out, 'index.html'), html, 'utf8');
}

/* ---- run ---------------------------------------------------------------- */

async function present(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

if (!(await present(DIST))) {
  fail('dist/ does not exist — run `pnpm build` first, in this tree');
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

const server = await serve();
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const rows = [];
const cells = STAGES.length * EDGES.length;
const total = viewKeys.length * themes.length * progresses.length * cells;

console.log(`serving ${DIST}\n  on ${origin}${ROUTE}`);
console.log(
  `rendering ${total} cell(s) — ${STAGES.join('/')} x ${EDGES.join('/')}` +
    ` x ${themes.length} theme(s) x ${viewKeys.length} viewport(s) x ${progresses.length} moment(s)\n`,
);

let n = 0;
for (const viewport of viewKeys) {
  for (const theme of themes) {
    for (const stage of STAGES) {
      for (const edge of EDGES) {
        const context = await browser.newContext({
          viewport: VIEWPORTS[viewport],
          colorScheme: theme,
        });
        // The Shell reads this before first paint, so it has to be here rather
        // than set on the page afterwards.
        await context.addInitScript(
          `try { localStorage.setItem("portfolio-theme", "${theme}"); } catch (e) {}`,
        );
        await context.addInitScript(INJECT(stage, edge));
        const page = await context.newPage();
        await page.goto(origin + ROUTE, { waitUntil: 'load' });
        await settle(page);

        for (const progress of progresses) {
          const info = await moment(page, progress);
          // THE REFUSAL IS THE ANSWER. `stage.ts` holds a stage to the edges it
          // lists and falls back to `flat` for anything else, so a cell that
          // comes back drawing something it was not asked for IS the unreachable
          // one — asked of the page rather than looked up here, which is what
          // stops this file keeping a second copy of `REACHES`.
          if (info.stage !== stage || info.edge !== edge) {
            rows.push({ stage, edge, theme, viewport, progress, unreachable: REFUSED(stage, edge) });
            console.log(
              `  [${String(++n).padStart(String(total).length)}/${total}] ${stage} · ${edge}` +
                ` — unreachable: the page drew ${info.stage} · ${info.edge}`,
            );
            continue;
          }
          const file = `${stage}__${edge}__${theme}__${viewport}__p${Math.round(progress * 100)}.png`;
          await page.locator('.eater-map__stage').screenshot({ path: join(out, file), type: 'png' });
          const bytes = (await stat(join(out, file))).size;
          rows.push({
            ...info,
            theme,
            viewport,
            progress,
            file,
            // WHAT ACTUALLY DREW IT, counted on the page rather than inferred
            // from the cell's name. It is the one line under each picture that
            // says which machinery is being looked at, and a stage that quietly
            // did not take over would otherwise be captioned as though it had.
            drawn:
              info.canvas > 0
                ? `${info.canvas} canvas, and the <img> taken off the page`
                : `the composition's own boxes: ${info.image} <img>, ${info.slices} slice(s)`,
          });
          console.log(
            `  [${String(++n).padStart(String(total).length)}/${total}] ${file}` +
              `  ${info.slab} · lift ${info.lift}  (${Math.round(bytes / 1024)} KB)`,
          );
        }
        await context.close();
      }
    }
  }
}

await browser.close();
server.close();
await sheet(rows);

const refused = rows.filter((row) => row.unreachable);
console.log(`\nwrote ${OUT_REL.split(sep).join('/')}/index.html`);
console.log(
  `${rows.length - refused.length} cell(s) drawn and ${refused.length} unreachable — each refusal asked` +
    ' of the page and answered by the stage, never listed in this script.',
);
