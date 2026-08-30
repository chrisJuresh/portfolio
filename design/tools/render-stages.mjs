/* ============================================================================
   render-stages.mjs — the two stages, side by side, so one can be chosen (#181).

     pnpm stages
     pnpm stages -- --viewports short,desk,wide --themes light
     pnpm stages -- --progress 0.5           # part way up the Lift
     pnpm stages -- --full                   # the whole Section, not the drawing

   WHAT IS BEING COMPARED. The Eater Map Section's Exploded View is drawn by a
   STAGE — `src/sections/eater-map/stage.ts` is the boundary — and there are two
   behind it: the shipped DOM one, and a WebGL one built so the choice is made by
   looking rather than by argument. Crossed with what each can make the Slab's
   edge out of, that is six cells:

                   flat          thick               wrapped
     dom           shipped       stacked layers      —
     webgl         one quad      a real extrusion    the pixels round the fillet

   THE EMPTY CELL IS THE RESULT AND NOT A GAP. DOM has no extrusion; a thickness
   in it is a stack of solid layers, which gives an honest silhouette and an
   honest edge colour and stops there. Six faces would not help: no number of
   flat faces runs a continuous texture round a fillet. That is the one thing the
   alternative exists to show, and it is drawn here rather than described.

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
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
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

/** Which stage, and what each can make the Slab's edge out of. Kept in step with
 *  `src/sections/eater-map/stage.ts` by being read back off the page: a cell that
 *  asks for an edge the stage refuses comes back reporting the one it drew, and
 *  the sheet says so rather than captioning a picture wrongly. */
const STAGES = ['dom', 'webgl'];
const EDGES = ['flat', 'thick', 'wrapped'];

/** What the cell says instead of a picture, when the stage cannot draw the edge. */
const UNREACHABLE = {
  'dom|wrapped':
    'DOM has no extrusion and no fillet. A thickness here is a stack of solid ' +
    'layers, so the silhouette and the edge colour are reachable and a continuous ' +
    'texture running round a rounded edge is not — six faces would still be six ' +
    'flat faces. This cell is the finding.',
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

function number(name, value, fallback) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) fail(`--${name} takes a positive number, not "${value}"`);
  return parsed;
}

function flag(name, value) {
  if (value === undefined) return false;
  if (value !== 'true') fail(`--${name} takes no value — got "${value}"`);
  return true;
}

const themes = list(opt.themes, ['light', 'dark']);
/** The two ends of the band by default: the corner it starts at, and a large
 *  desktop. One window would not show that the drawing holds its shape. */
const viewKeys = list(opt.viewports, ['short', 'wide']);
const progresses = list(opt.progress, ['1']).map(Number);
const scale = number('scale', opt.scale, 1);
const full = flag('full', opt.full);
const format = (opt.format || 'png').toLowerCase();
const quality = number('quality', opt.quality, 92);
if (format !== 'png' && format !== 'jpeg') fail('--format must be png or jpeg');

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
        slices: root.querySelectorAll('.eater-map__slice').length,
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
          <b>${escape(row.stage)} · ${escape(row.edge)}${row.drifted ? ' <i>not what was asked for</i>' : ''}</b>
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
  <p class="meta">${rows.filter((row) => !row.unreachable).length} render(s) of ${ROUTE}, at ${scale}x, by
     <code>design/tools/render-stages.mjs</code> (#181). Two stages behind one boundary —
     <code>src/sections/eater-map/stage.ts</code> — crossed with what each can make the
     Slab's edge out of. <b>The empty cell is the result</b>: DOM can fake a thickness with
     a stack of solid layers and cannot run the captured pixels round a rounded edge at
     all. Every depth here is spent by the Lift, so <code>--progress 0</code> renders the
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
        const unreachable = UNREACHABLE[`${stage}|${edge}`];
        if (unreachable) {
          for (const progress of progresses) {
            rows.push({ stage, edge, theme, viewport, progress, unreachable });
            console.log(`  [${String(++n).padStart(String(total).length)}/${total}] ${stage} · ${edge} — unreachable`);
          }
          continue;
        }

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
        await context.addInitScript(INJECT(stage, edge));
        const page = await context.newPage();
        await page.goto(origin + ROUTE, { waitUntil: 'load' });
        await settle(page);

        for (const progress of progresses) {
          const info = await moment(page, progress);
          const file = `${stage}__${edge}__${theme}__${viewport}__p${Math.round(progress * 100)}.${format}`;
          const target = {
            path: join(out, file),
            ...(format === 'jpeg' ? { type: 'jpeg', quality } : { type: 'png' }),
          };
          const shot = full
            ? page.locator(`[data-section="${SECTION}"]`)
            : page.locator('.eater-map__stage');
          await shot.screenshot(target);
          const bytes = (await stat(join(out, file))).size;
          const drifted = info.stage !== stage || info.edge !== edge;
          rows.push({
            ...info,
            theme,
            viewport,
            progress,
            file,
            drifted,
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
              `  ${info.slab} · lift ${info.lift}  (${Math.round(bytes / 1024)} KB)` +
              (drifted ? `  — asked for ${stage}/${edge}, drew ${info.stage}/${info.edge}` : ''),
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

const drifted = rows.filter((row) => row.drifted);
console.log(`\nwrote ${OUT_REL.replace(/\\/g, '/')}/index.html`);
if (drifted.length > 0) {
  console.log(
    `\n${drifted.length} cell(s) did not draw what they were asked for. The sheet marks each one;` +
      ' a stage refuses an edge it cannot reach rather than drawing something else by the same name.',
  );
}
