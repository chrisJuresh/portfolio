import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';

import { EMPTY, PROPERTIES, parse as parseOverrides } from '../../editor/lib/overrides.mjs';
import { OVERRIDES, discover, discoverBakes, discoverKernel } from '../../editor/lib/sections.mjs';
import { start } from '../../editor/server.mjs';
import { PAGE, open, settle } from '../lib/page.mjs';

/**
 * The Editor, driven end to end: open it, click a piece of text, change it, find
 * the change in the file — and then drag a Token, watch the page move, and find
 * that in its file too.
 *
 * ONE SMOKE CHECK AND NO MORE, on purpose. #129's testing decisions put the
 * Editor's tests at its write boundaries — `scripts/editor/lib/*.test.mjs`, which
 * assert the bytes — because that is where a bug corrupts a source file, and
 * driving a browser is both slower and flakier than the thing it would be
 * asserting. What a boundary cannot see is whether the surface is WIRED to it:
 * whether a click reaches a key, whether a drag reaches a property, whether a
 * refusal comes back as a refusal, whether the page follows. That is this Check,
 * and it is the whole of it.
 *
 * A TOKEN'S PAGE AND ITS FILE ARE TWO ASSERTIONS, and separating them is the
 * point rather than thoroughness. A Token lives in a stylesheet the build baked,
 * so writing the file cannot move the page — the surface has to. So the drag is
 * driven in two halves: an `input` event, after which the page must have moved
 * and the file must NOT have, and then a `change`, after which the file must have.
 * A surface that wrote on every frame of a drag, or one that wrote the file and
 * left the page alone, fails one half each.
 *
 * IT WRITES TO A COPY. The Editor takes the Sections root it is given, so this
 * hands it a temporary copy of every Section's Content AND Tokens and asserts on
 * those bytes. Nothing under `src/` is touched — which matters more than it
 * sounds, because this Check runs from the pre-commit hook, and a Check that
 * edited the tree it was gating would put a file it wrote into the commit it was
 * checking. The real files are compared before and after anyway: a Check nobody
 * can be sure about is worse than none.
 *
 * IT OPENS THE PAGE THROUGH `lib/page.mjs`, like every other Check, and the one
 * thing it hands that helper differently is the ORIGIN: the Editor's own, not the
 * suite's. So the response, console and throw recording is the shared one rather
 * than a second hand-rolled copy of it.
 *
 * IT DOES NOT SETTLE THE PAGE IT CLICKS, which is the one place this Check
 * disagrees with every other one. `settle()` exists because a Section mounts on
 * approach, so its TIMELINE is not there at load — but the markup and every word
 * in it are prerendered and present immediately, and the Editor binds to words.
 * Scrolling the document first would assert nothing extra and would move the
 * element this Check is about to click.
 *
 * ONE GROUP OPENS A SECOND PAGE AND DOES SETTLE IT (#196), and the split is the
 * reason rather than an exception to it. The Eater Map's extruded edge is
 * GENERATED from its Tokens rather than expressed in them, so a drag reaches it
 * only through a rebuild — and a rebuild is a thing that mounts on approach. That
 * assertion needs a settled page and the one above needs an unsettled one, so it
 * gets a page of its own rather than a compromise.
 */

const MARKER = 'Edited by the smoke Check';

/**
 * Wait for something OFF the page to become true — a file on disk, which is where
 * the half of an undo that can be silently wrong actually lives.
 *
 * `waitForFunction` cannot answer this: it runs in the browser, and the browser
 * cannot read the tree. The write is a POST, so it lands a moment after the
 * keystroke that asked for it, and asserting immediately would report a race
 * rather than a stack.
 */
async function holds(page, answered, ms = 10_000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (answered()) return true;
    await page.waitForTimeout(50);
  }
  return answered();
}

/** Both of the Editor's files, for every Section. */
const WRITABLE = ['content.ts', 'tokens.css'];

/**
 * Copy everything the Editor may write into a temporary tree of the same shape.
 *
 * FOUR FAMILIES NOW, not one: a Section's two files, one Tokens file per part of
 * the Kernel, a Bake's recipe and parameters, and the one Overrides file. Every one of them is a file the
 * Editor writes, so every one of them has to be copied — a Check that let the
 * real tree be written would put a file it wrote into the commit it was gating.
 * The originals are read here and compared at the end.
 */
function copySources(repoRoot) {
  const from = { sections: join(repoRoot, 'src', 'sections'), kernel: join(repoRoot, 'src', 'kernel'), bakes: join(repoRoot, 'design', 'bake'), overrides: join(repoRoot, 'src') };
  const root = mkdtempSync(join(tmpdir(), 'editor-check-'));
  const to = { sections: join(root, 'sections'), kernel: join(root, 'kernel'), bakes: join(root, 'bakes'), overrides: join(root, 'overrides') };
  const originals = new Map();

  const keep = (where, path) => originals.set(where, readFileSync(path, 'utf8'));

  for (const section of discover(from.sections)) {
    mkdirSync(join(to.sections, section), { recursive: true });
    for (const file of WRITABLE) {
      cpSync(join(from.sections, section, file), join(to.sections, section, file));
      keep(join('src', 'sections', section, file), join(from.sections, section, file));
    }
  }

  mkdirSync(join(to.kernel, 'tokens'), { recursive: true });
  for (const holder of discoverKernel(from.kernel)) {
    const name = `${holder.replace(/^kernel-/, '')}.css`;
    cpSync(join(from.kernel, 'tokens', name), join(to.kernel, 'tokens', name));
    keep(join('src', 'kernel', 'tokens', name), join(from.kernel, 'tokens', name));
  }

  // The recipe is copied because the Bake cannot be read without it; the
  // parameters are copied only where they exist, because a Bake standing at
  // every default has never been written.
  for (const bake of discoverBakes(from.bakes)) {
    mkdirSync(join(to.bakes, bake), { recursive: true });
    cpSync(join(from.bakes, bake, 'recipe.json'), join(to.bakes, bake, 'recipe.json'));
    keep(join('design', 'bake', bake, 'recipe.json'), join(from.bakes, bake, 'recipe.json'));
    try {
      cpSync(join(from.bakes, bake, 'params.json'), join(to.bakes, bake, 'params.json'));
      keep(join('design', 'bake', bake, 'params.json'), join(from.bakes, bake, 'params.json'));
    } catch {
      // never tuned, so there is nothing to copy and nothing to compare
    }
  }

  // The Overrides file, into a root of its own: the Editor is handed a DIRECTORY
  // for this family and composes the one file name itself, so the copy has to be
  // the same shape.
  mkdirSync(to.overrides, { recursive: true });
  cpSync(join(from.overrides, OVERRIDES), join(to.overrides, OVERRIDES));
  keep(join('src', OVERRIDES), join(from.overrides, OVERRIDES));

  return { repoRoot, root, to, originals };
}

/**
 * Every file under a directory, by its path relative to it.
 *
 * Used to assert that measuring writes NOTHING: the whole copied tree before,
 * the whole copied tree after, and no map from a repo-relative key back to a
 * copied path to get wrong.
 */
function snapshot(root, at = root, into = new Map()) {
  for (const entry of readdirSync(at, { withFileTypes: true })) {
    const path = join(at, entry.name);
    if (entry.isDirectory()) snapshot(root, path, into);
    else if (statSync(path).isFile()) into.set(path.slice(root.length + 1), readFileSync(path, 'utf8'));
  }
  return into;
}

export const check = {
  name: 'editor',
  title:
    'the Editor changes a word and drags a Token, on the real page and in the file — including one the ' +
    'drawing is generated from rather than one a stylesheet reads',

  /** @param {{ browser: import('playwright').Browser, origin: string, repoRoot: string, dist: string }} ctx */
  async run({ browser, origin, repoRoot, dist }) {
    /** @type {string[]} */
    const failures = [];
    /** @type {string[]} */
    const notes = [];

    // Nothing about the Editor ships. Asserted against the build the rest of the
    // suite is served from, not against the Editor's own origin — a page that
    // came through the Editor is SUPPOSED to carry it.
    const built = await fetch(origin + PAGE).then((response) => response.text());
    if (built.includes('__editor') || built.includes('data-editor')) {
      failures.push(`${PAGE} in the built tree carries the Editor — it must exist only in the Editor's own responses`);
    }

    const { root, to, originals } = copySources(repoRoot);
    let served;
    let context;
    try {
      served = await start({ dist, roots: to, repoRoot, canPublish: false, canBake: false });
      // The Editor's origin, through the suite's own opener.
      const opened = await open(browser, served.origin, { path: PAGE });
      context = opened.context;
      const { page, record } = opened;

      await page.waitForSelector('aside[data-editor]', { timeout: 15_000 });

      const bound = await page.$$eval('[data-editor-bound]', (elements) =>
        elements.map((element) => ({
          key: element.dataset.editorKey,
          section: element.dataset.editorSection,
          field: element.dataset.editorField,
        })),
      );
      if (bound.length === 0) {
        failures.push(
          'the Editor bound nothing on the page — no element’s text matched a Content value,' +
            ' so either the served build is not this tree’s or the surface is not matching',
        );
        return { failures, notes };
      }
      notes.push(`${bound.length} element(s) bound to Content`);

      // Any bound field will do, and taking the first rather than naming one
      // keeps this Check from failing the day a Section's words change. The
      // Section and the field come off their own attributes: a field key holds
      // dots of its own, so splitting the composite one would be a guess.
      const { key, section, field } = bound[0];
      const element = page.locator(`[data-editor-key="${key}"]`).first();
      const before = (await element.textContent()) ?? '';

      await element.click();
      await page.keyboard.press('ControlOrMeta+A');
      await page.keyboard.type(MARKER);
      await page.keyboard.press('Enter');
      // A wait that times out is its own failure. Swallowing it would leave the
      // assertions below to notice, which they do — but ten seconds later and
      // without saying that the surface never reported anything at all.
      const reported = await page
        .waitForFunction(
          (wanted) => document.querySelector('[data-editor-said]')?.textContent?.includes(wanted),
          'wrote',
          { timeout: 10_000 },
        )
        .then(() => true)
        .catch(() => false);
      if (!reported) {
        failures.push(`the Editor never reported writing ${key} — the surface did not answer the click`);
      }

      const after = ((await element.textContent()) ?? '').trim();
      if (after !== MARKER) {
        failures.push(`clicking ${key} and typing did not change the page — it still reads "${after}"`);
      }

      const written = readFileSync(join(to.sections, section, 'content.ts'), 'utf8');
      if (!written.includes(MARKER)) {
        failures.push(`${key} was typed on the page and is not in ${section}/content.ts — the surface is not reaching the boundary`);
      }
      const was = originals.get(join('src', 'sections', section, 'content.ts')) ?? '';
      if (written.split('\n').length !== was.split('\n').length) {
        failures.push(
          `writing ${key} changed ${section}/content.ts from ${was.split('\n').length} lines to` +
            ` ${written.split('\n').length} — the boundary rewrote more than one literal`,
        );
      }

      // A refusal has to come back as a refusal and leave the file alone. Empty
      // is the one every Content schema forbids, so it needs no knowledge of
      // which field was picked.
      await page.locator('aside[data-editor] details').filter({ has: page.locator(`[data-editor-input="${section} ${field}"]`) }).locator('summary').click();
      const input = page.locator(`[data-editor-input="${section} ${field}"]`);
      await input.fill('   ');
      await input.press('Enter');
      const complained = await page
        .waitForFunction(
          () => document.querySelector('[data-editor-said]')?.hasAttribute('data-editor-bad'),
          undefined,
          { timeout: 10_000 },
        )
        .then(() => true)
        .catch(() => false);
      if (!complained) failures.push('the Editor never reported the refusal of an empty value');

      const said = (await page.textContent('[data-editor-said]')) ?? '';
      if (!said.startsWith('refused')) {
        failures.push(`an empty value was not refused — the Editor said "${said}"`);
      }
      const stillThere = readFileSync(join(to.sections, section, 'content.ts'), 'utf8');
      if (!stillThere.includes(MARKER) || stillThere !== written) {
        failures.push(`a refused value reached ${section}/content.ts — it must be refused before anything is written`);
      }
      notes.push(`refused an empty ${key}, and the file did not move`);

      // ---- Tokens ---------------------------------------------------------

      await page.locator('[data-editor-choose="tokens"]').click();
      // Every group collapsed is how the panel opens — a hundred and sixty
      // controls otherwise — so this opens them all rather than naming one, for
      // the same reason the Content half takes the first bound field it finds: a
      // Check that named a Token would fail the day the composition renamed it.
      await page.evaluate(() => {
        for (const group of document.querySelectorAll('[data-editor-surface="tokens"] details')) {
          group.open = true;
        }
      });

      const dragged = page.locator('[data-editor-kind="number"]').first();
      if ((await page.locator('[data-editor-kind="number"]').count()) === 0) {
        failures.push('the Editor drew no control for any Token — the Tokens surface is not discovering them');
        return { failures, notes };
      }
      const at = (await dragged.getAttribute('data-editor-token')) ?? '';
      const tokenSection = at.slice(0, at.indexOf(' '));
      const tokenKey = at.slice(at.indexOf(' ') + 1);
      const property = tokenKey.split(':')[1];
      const tokenFile = join(to.sections, tokenSection, 'tokens.css');
      const tokensWere = readFileSync(tokenFile, 'utf8');
      const contentWas = readFileSync(join(to.sections, tokenSection, 'content.ts'), 'utf8');

      /** What the page currently computes that Token to. */
      const computed = () =>
        page.evaluate(
          ([name, prop]) =>
            getComputedStyle(document.querySelector(`[data-section="${name}"]`)).getPropertyValue(prop).trim(),
          [tokenSection, property],
        );

      const slider = dragged.locator('input[type="range"]');
      const stood = await computed();

      // Half one: a drag in progress. The page must move and the file must not.
      await slider.evaluate((input) => {
        const wanted = Number(input.value) + Number(input.step) * 40;
        input.value = String(Math.min(Number(input.max), wanted));
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      const during = await computed();
      if (during === stood) {
        failures.push(
          `dragging ${property} did not move the page — it still computes to "${stood}", so the surface is` +
            ' writing the file and hoping the build catches up',
        );
      }
      if (readFileSync(tokenFile, 'utf8') !== tokensWere) {
        failures.push(`${property} reached ${tokenSection}/tokens.css mid-drag — a drag previews and a release writes`);
      }

      // Half two: the release.
      await slider.dispatchEvent('change');
      const wrote = await page
        .waitForFunction(
          (wanted) => document.querySelector('[data-editor-said]')?.textContent?.includes(wanted),
          property,
          { timeout: 10_000 },
        )
        .then(() => true)
        .catch(() => false);
      if (!wrote) failures.push(`the Editor never reported writing ${property} — the drag did not reach the boundary`);

      const tokensNow = readFileSync(tokenFile, 'utf8');
      if (tokensNow === tokensWere) {
        failures.push(`releasing ${property} wrote nothing to ${tokenSection}/tokens.css`);
      }
      if (tokensNow.split('\n').length !== tokensWere.split('\n').length) {
        failures.push(
          `writing ${property} changed ${tokenSection}/tokens.css from ${tokensWere.split('\n').length} lines to` +
            ` ${tokensNow.split('\n').length} — the boundary rewrote more than one value`,
        );
      }
      if (readFileSync(join(to.sections, tokenSection, 'content.ts'), 'utf8') !== contentWas) {
        failures.push(
          `writing ${property} also touched ${tokenSection}/content.ts — a Token edit reaches tokens.css only`,
        );
      }
      notes.push(`dragged ${property}, and released it`);

      // A refused Token value must leave the file exactly as it was. A semicolon
      // is the one every Token file forbids, so it needs no knowledge of which
      // Token the drag happened to pick.
      const smuggle = await fetch(`${served.origin}/__editor/tokens`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-editor': '1' },
        body: JSON.stringify({ section: tokenSection, key: tokenKey, value: '1px; color: red' }),
      });
      if (smuggle.ok) failures.push('the Editor accepted a Token value carrying a second declaration');
      if (readFileSync(tokenFile, 'utf8') !== tokensNow) {
        failures.push(`a refused Token value reached ${tokenSection}/tokens.css`);
      }

      // And it can be put back to what it was before the session.
      await dragged.locator('[data-editor-was]').click();
      const back = await page
        .waitForFunction(
          (wanted) => document.querySelector('[data-editor-said]')?.textContent?.includes(wanted),
          'put back',
          { timeout: 10_000 },
        )
        .then(() => true)
        .catch(() => false);
      if (!back) failures.push(`the Editor never reported putting ${property} back`);
      if (readFileSync(tokenFile, 'utf8') !== tokensWere) {
        failures.push(`putting ${property} back did not restore ${tokenSection}/tokens.css to what it was`);
      }
      notes.push(`put ${property} back to what it was before the session`);

      // ---- a Token the page GENERATES from, and not one it reads (#196) ----

      // THE ONE TOKEN THIS CHECK NAMES, AND WHY IT HAS TO. Everything above is
      // deliberately blind to which Token it picked, because a Check that named
      // one would fail the day the composition renamed it. This half cannot be:
      // the claim is about a particular mechanism rather than about the surface.
      // The Eater Map's extruded edge bakes its shading into a `conic-gradient`
      // at mount — arithmetic, not a length — so a preview sheet moves every
      // other Token in that Section on its own and cannot move this one.
      // `src/sections/eater-map/redraw.ts` is what makes it move, by watching the
      // sheet the Editor was already writing, and it is GATED on this page having
      // an Editor over it. The `eater-map` Check asserts the same gate from the
      // shipped side, where nothing may rebuild at all; either half alone is
      // satisfied by a mechanism that never runs.
      //
      // A PAGE OF ITS OWN, AND SETTLED. A Section mounts on approach, so its
      // slices are not on a page nobody has scrolled — and the page above is
      // deliberately left unsettled, because the Content half binds to words and
      // scrolling would move the element it clicks.
      //
      // PREVIEWED AND NEVER RELEASED: an `input` and no `change`, so this group
      // posts nothing and writes no file. That a release writes is asserted above,
      // on whichever Token the surface happened to draw first.
      const { context: shown, page: view } = await open(browser, served.origin, { path: PAGE });
      try {
        failures.push(...(await settle(view)).map((why) => `the Exploded View: ${why}`));
        await view.waitForSelector('aside[data-editor]', { timeout: 15_000 });

        /**
         * TWO READINGS, BECAUSE THERE ARE TWO CLAIMS AND THEY ARE NOT THE SAME SET.
         *
         * `edges` is the slices, grouped by the surface they belong to. That is what
         * has to CHANGE when the light moves, and it is per surface because a redraw
         * wired to the stage and not to the Cards moves the Slab and leaves three
         * Cards lit by the light the page loaded with — while every whole-page count
         * agrees with itself.
         *
         * `built` is every element a redraw puts on the page, the blurred copies of
         * the map included. That is what has to be UNCHANGED after a drag out and
         * back, and the backdrops belong in it rather than in `edges` for a reason
         * worth stating: `mountGlass` clears the slices and the copies on
         * consecutive lines, so a comparison that counted only slices would let a
         * regression in the second clear double the copies per drag with nothing to
         * fail — one line from the clear that IS covered. A copy of the map is not
         * lit by the light, so requiring it to move would fail a correct drawing.
         */
        const read = () =>
          view.evaluate(() => {
            const section = document.querySelector('.eater-map');
            /** @type {Record<string, string[]>} */
            const edges = {};
            for (const slice of document.querySelectorAll('.eater-map__slice')) {
              const name = slice.dataset.eaterMapEdge ?? '(unnamed)';
              (edges[name] ??= []).push(slice.style.background);
            }
            const built = [
              ...document.querySelectorAll('.eater-map__slice, .eater-map__glass'),
            ].map((one) => `${one.className}|${one.getAttribute('style') ?? ''}`);
            // THE TWO WAYS OF HAVING NO MARKER ARE NAMED APART. `section?.dataset.x`
            // is undefined both for a Section that is not on the page and for one
            // that is and never wired the observer, and those are a different
            // diagnosis — the first would mean this group checked nothing.
            return {
              redraw: section ? (section.dataset.eaterMapRedraw ?? '(not wired)') : '(no Section)',
              edges,
              built,
            };
          });
        /** Two frames: one for a rebuild coalesced onto the next frame to happen,
         *  and one for it to be on the page to read. */
        const settled = () =>
          view.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))));

        const stood = await read();
        const surfaces = Object.keys(stood.edges);
        const azimuth = view.locator('[data-editor-token$="--eater-map-light-azimuth"]').first();
        if (surfaces.length === 0) {
          failures.push(
            'nothing on the page under the Editor is a slice, so there was no generated geometry to drag a' +
              ' Token into — the Exploded View never mounted and nothing about the rebuild was checked',
          );
        } else if (stood.redraw !== 'editor') {
          failures.push(
            `the Eater Map Section reports data-eater-map-redraw="${stood.redraw}" on a page with the Editor` +
              ' over it — nothing is watching the preview sheet, so its light, its thickness and its radii' +
              ' are Tokens that write their file and leave the drawing where it was until a reload',
          );
        } else if ((await azimuth.count()) === 0) {
          failures.push(
            'the Tokens surface drew no control for --eater-map-light-azimuth — the light is declared in' +
              ' eater-map/tokens.css, so this is the Token being renamed or the surface not finding it',
          );
        } else {
          const slider = azimuth.locator('input[type="range"]').first();
          const was = await slider.inputValue();
          // Kept whole rather than looked for by value: what has to be true is that
          // a preview writes NOTHING, and a search for the number this drag happens
          // to produce stops asking that the day the light is pointed elsewhere.
          const lightFile = join(to.sections, 'eater-map', 'tokens.css');
          const lightWas = readFileSync(lightFile, 'utf8');
          // THE ROW'S FAR END, AND NOT A NUMBER OF DEGREES. `control()` derives a
          // slider's range from the value in the file — four times it, on the side
          // the author chose it on — so "add 180 and clamp" is half a turn at
          // today's 315deg and silently less than that at a small one, which would
          // leave this group blaming the redraw for a drag too small to see. The
          // end furthest from where the row is standing is a real move at every
          // value, and `moved` below is what stops that being an assumption.
          const end = await slider.evaluate((input, here) => {
            const far =
              Math.abs(Number(input.max) - Number(here)) > Math.abs(Number(here) - Number(input.min))
                ? input.max
                : input.min;
            input.value = far;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            return input.value;
          }, was);
          await settled();
          const during = await read();
          if (end === was) {
            failures.push(
              `dragging --eater-map-light-azimuth to the end of its row left it at ${was}, so the gesture` +
                ' this group is built on never moved and everything below it asserted nothing',
            );
          }

          for (const name of surfaces) {
            const before = stood.edges[name] ?? [];
            const dragged = during.edges[name] ?? [];
            if (dragged.length !== before.length) {
              failures.push(
                `dragging the light took the ${name} edge from ${before.length} slices to ${dragged.length}` +
                  ' — a rebuild has to land on the DOM it started from',
              );
              continue;
            }
            if (before.every((one, index) => one === dragged[index])) {
              failures.push(
                `dragging --eater-map-light-azimuth left all ${before.length} of the ${name} edge's slices` +
                  ' painted exactly as they were, so the drag moved the file and not the drawing — which is' +
                  ' what a Token generated FROM rather than read by a stylesheet does without a rebuild',
              );
            }
          }
          if (readFileSync(lightFile, 'utf8') !== lightWas) {
            failures.push('previewing the light wrote eater-map/tokens.css — a drag previews and a release writes');
          }

          // ...and back, which is the whole of "the same number of elements in the
          // DOM as it started with": every element a redraw builds, in the same
          // number and carrying the same style the mount wrote it with.
          await slider.evaluate((input, back) => {
            input.value = back;
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }, was);
          await settled();
          const after = await read();
          if (after.built.length !== stood.built.length) {
            failures.push(
              `the Exploded View is made of ${after.built.length} generated element(s) after a drag out and` +
                ` back, against ${stood.built.length} before it — the redraw leaks elements, and a session of` +
                ' tuning by eye is a great many drags',
            );
          } else if (!stood.built.every((one, index) => one === after.built[index])) {
            failures.push(
              'the Exploded View came back from a drag out and back drawn differently to how it mounted, with' +
                ' the same Token values — the redraw is not a function of the Tokens alone',
            );
          }

          // THE THICKNESS IS NOT DRAGGED HERE, AND THAT IS A JUDGEMENT RATHER THAN
          // AN OVERSIGHT. It reaches the drawing two ways: the depth of every
          // slice is a CSS expression naming it, which the browser re-evaluates
          // with nothing observed at all, and the gradient's own outline is
          // arithmetic — the same read path the light's assertion above covers,
          // through the same signature and the same redraw. What is left that is
          // specific to the thickness is only the `min(radius, thickness)` clamp,
          // and a Slab dragged THICKER leaves that clamp where it was: an
          // assertion built on it would have to drag the row to zero and would
          // fail the day the author chose a square-edged Slab, which is a
          // legitimate Token value. NOTES.md carries the whole of it.
          //
          // WHAT WAS DONE AND NOT WHAT WAS CONCLUDED: a note saying the surfaces
          // followed the light contradicts any failure standing beside it, and this
          // is printed on a failing run too.
          notes.push(
            `dragged --eater-map-light-azimuth ${was} → ${end} → ${was} over ${surfaces.length} extruded` +
              ` surface(s) and ${stood.built.length} generated element(s): ${surfaces.join(', ')}`,
          );
        }
      } finally {
        await shown.close();
      }

      // ---- the Kernel's Tokens --------------------------------------------

      // #146 gave the Editor the Effect Stack's hundred numbers and the three
      // corner pictures' placement, which are Tokens under src/kernel/tokens/
      // rather than under any Section. Two halves, and they fail separately: the
      // surface has to DISCOVER them, and a write has to reach the right file.
      const kernelHolders = discoverKernel(to.kernel);
      if (kernelHolders.length === 0) {
        failures.push('the Check copied no Kernel Tokens files — src/kernel/tokens/ is where they live');
      } else {
        const holder = kernelHolders[0];
        const drawn = await page.locator(`[data-editor-tokens="${holder}"]`).count();
        if (drawn === 0) {
          // Returned rather than carried on with: everything below asks the page
          // for a control inside a group that is not there, and a locator that
          // is not there is thirty seconds of waiting and then a timeout, which
          // reads as a flaky Check rather than as the answer it already has.
          failures.push(
            `the Tokens surface drew nothing for ${holder} — the Kernel's own Tokens are not being discovered,` +
              ' so two of the five tuners #146 absorbed are unreachable from the Editor',
          );
          return { failures, notes };
        }
        const kernelFile = join(to.kernel, 'tokens', `${holder.replace(/^kernel-/, '')}.css`);
        const kernelWas = readFileSync(kernelFile, 'utf8');
        const kernelKey = await page
          .locator(`[data-editor-tokens="${holder}"] [data-editor-token]`)
          .first()
          .getAttribute('data-editor-token');
        const kernelToken = (kernelKey ?? '').slice((kernelKey ?? '').indexOf(' ') + 1);
        const reached = await fetch(`${served.origin}/__editor/tokens`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-editor': '1' },
          body: JSON.stringify({ section: holder, key: kernelToken, value: '0.4321px' }),
        });
        if (!reached.ok) {
          failures.push(`a write to ${holder} ${kernelToken} was refused — ${(await reached.text()).slice(0, 120)}`);
        }
        const kernelNow = readFileSync(kernelFile, 'utf8');
        if (kernelNow === kernelWas) failures.push(`writing ${holder} ${kernelToken} changed nothing in ${kernelFile}`);
        if (kernelNow.split('\n').length !== kernelWas.split('\n').length) {
          failures.push(`writing ${holder} ${kernelToken} rewrote more than one value`);
        }
        notes.push(`${kernelHolders.length} Kernel Tokens file(s), and one written`);
      }

      // ---- the Bakes -------------------------------------------------------

      // Three things, and each is a different way for this surface to be wrong:
      // it has to LIST the Bakes, a parameter has to reach params.json, and a
      // run has to be refused while canBake is off. The generators themselves are
      // never run here — every one of them needs something this repository
      // deliberately does not carry, so a Check that ran one would be asserting
      // the machine rather than the code.
      await page.locator('[data-editor-choose="bakes"]').click();
      const listed = await page.locator('[data-editor-bake]').count();
      const onDisk = discoverBakes(to.bakes);
      if (listed !== onDisk.length) {
        failures.push(
          `the Bakes surface listed ${listed} Bake(s) and design/bake/ holds ${onDisk.length}` +
            ` (${onDisk.join(', ')}) — they are discovered, so a mismatch is the surface and not the tree`,
        );
      } else {
        notes.push(`${listed} Bake(s) listed`);
      }

      if (onDisk.length > 0) {
        const bake = onDisk[0];
        const paramsFile = join(to.bakes, bake, 'params.json');
        const recipe = JSON.parse(readFileSync(join(to.bakes, bake, 'recipe.json'), 'utf8'));
        // The first parameter that is plain text: one with options only takes
        // what it declares, and one with a range only takes a number, so neither
        // can be moved without this Check knowing something about the recipe it
        // is deliberately not reading.
        const first = recipe.groups
          .flatMap((group) => group.params)
          .find((param) => !param.options && param.min === undefined);
        if (!first) {
          failures.push(`${bake} declares no plain-text parameter — this Check cannot move one without naming it`);
        } else {
          // Through the route rather than the control, for the same reason the
          // Kernel half is: which control a parameter draws is decided by the
          // recipe, and naming one here would make this Check fail the day a
          // range was added to it.
          const put = await fetch(`${served.origin}/__editor/bake`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-editor': '1' },
            body: JSON.stringify({ bake, key: first.key, value: `${first.value}-moved` }),
          });
          if (!put.ok) failures.push(`a write to ${bake}.${first.key} was refused — ${(await put.text()).slice(0, 120)}`);
          const held = JSON.parse(readFileSync(paramsFile, 'utf8'));
          if (held[first.key] !== `${first.value}-moved`) {
            failures.push(`writing ${bake}.${first.key} did not reach ${bake}/params.json`);
          } else {
            notes.push(`wrote ${bake}.${first.key} to ${bake}/params.json`);
          }
          // ...and putting it back takes the line away rather than repeating the
          // recipe, so the file reads as exactly what has been tuned.
          await fetch(`${served.origin}/__editor/bake`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-editor': '1' },
            body: JSON.stringify({ bake, key: first.key, value: first.value }),
          });
          if (Object.keys(JSON.parse(readFileSync(paramsFile, 'utf8'))).includes(first.key)) {
            failures.push(`putting ${bake}.${first.key} back left a line for it — the file is what has MOVED`);
          }
        }

        // A parameter no recipe declares must not reach the file at all.
        const invented = await fetch(`${served.origin}/__editor/bake`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-editor': '1' },
          body: JSON.stringify({ bake, key: 'nothing-declares-this', value: '1' }),
        });
        if (invented.ok) failures.push(`the Editor wrote ${bake}.nothing-declares-this, which no recipe declares`);

        // Re-baking is off for this Check, and it has to SAY so rather than
        // start a generator inside the suite.
        const ran = await fetch(`${served.origin}/__editor/bake/run`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-editor': '1' },
          body: JSON.stringify({ bake }),
        });
        if (ran.ok) failures.push('the Editor started a generator from inside a Check — canBake was ignored');

        // ...and it needs the handshake, like every other write.
        const drivenBy = await fetch(`${served.origin}/__editor/bake`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ bake, key: first.key, value: 'from somewhere else' }),
        });
        if (drivenBy.ok) failures.push('the Editor took a Bake parameter with no handshake header');
      }

      // ---- a Timeline, scrubbed -------------------------------------------

      await page.locator('[data-editor-choose="motion"]').click();
      if ((await page.locator('[data-editor-scrub="turn"]').count()) === 0) {
        failures.push(
          'the Editor listed no Timeline for the Turn — it is registered at boot, so the register is not being read',
        );
      } else {
        await page.locator('[data-editor-scrub="turn"]').evaluate((input) => {
          input.value = '0.62';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        });
        const held = await page.evaluate(
          () => document.querySelector('[data-editor-surface="motion"]')?.hasAttribute('data-editor-held') ?? false,
        );
        if (!held) {
          failures.push(
            'scrubbing did not hold — a seek that is not held is recomputed from the scroll on the next tick,' +
              ' so the moment it produces survives about one frame',
          );
        }
        // Two frames later: a moment the scroll took back would read right here
        // and wrong immediately afterwards, which is the wrong diagnosis
        // src/kernel/NOTES.md records.
        await page.evaluate(
          () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))),
        );
        const turn = await page.evaluate(() =>
          Number(getComputedStyle(document.documentElement).getPropertyValue('--turn')),
        );
        if (Math.abs(turn - 0.62) > 0.01) {
          failures.push(`scrubbing the Turn to 0.62 left --turn at ${turn} — the moment did not stay put`);
        } else {
          notes.push('scrubbed the Turn to 0.62, and it stayed there');
        }
      }

      // ---- measuring, an Annotation and an Override -----------------------

      // A pointer event dispatched ON a chosen element rather than a real mouse
      // at a point, and that is not a shortcut: a real click lands on whatever
      // is DEEPEST under the cursor, so this Check would have to name an element
      // of the composition to know what it had picked — and would then fail the
      // day that element was renamed. The listeners are on `document` in the
      // capture phase, so an event dispatched on a descendant reaches them
      // exactly as the author's own would.
      const overridesFile = join(to.overrides, OVERRIDES);
      // Every writable file as it stands NOW, rather than as it started: the two
      // halves above have legitimately written a Content field and put a Token
      // back, and what this half asserts is that measuring writes nothing on top
      // of that.
      const standing = snapshot(root);
      const overridesWere = readFileSync(overridesFile, 'utf8');

      // Choosing the surface IS arming it (#166). There is no press for this any
      // more, and the pair is the assertion: on the surface a click picks, off it a
      // click edits a word again — a surface that armed and never disarmed would
      // leave the whole Editor unable to change text with nothing to turn off.
      await page.locator('[data-editor-choose="measure"]').click();
      const armed = await page.evaluate(() => document.documentElement.hasAttribute('data-editor-armed'));
      if (!armed) failures.push('choosing the Measure surface did not arm it — a click on the page still edits text');
      await page.locator('[data-editor-choose="content"]').click();
      if (await page.evaluate(() => document.documentElement.hasAttribute('data-editor-armed'))) {
        failures.push('leaving the Measure surface left it armed — clicking text would never edit it again');
      }
      await page.locator('[data-editor-choose="measure"]').click();

      // A Section's own mount point: always there, always a block, and named by
      // the loader rather than by a composition.
      const picked = await page.evaluate(() => {
        const element = document.querySelector('[data-section]');
        if (!element) return null;
        const box = element.getBoundingClientRect();
        const at = (type, x, y) =>
          element.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y }));
        const x = Math.round(box.left + box.width / 2);
        const y = Math.round(box.top + 20);
        at('pointerdown', x, y);
        at('pointermove', x + 30, y + 10);
        at('pointerup', x + 30, y + 10);
        return { section: element.dataset.section, width: Math.round(box.width) };
      });
      if (picked === null) {
        failures.push('no Section mount point on the page to measure');
        return { failures, notes };
      }

      const pickedName = (await page.textContent('[data-editor-picked]')) ?? '';
      if (pickedName.trim() === '') failures.push('dragging picked nothing — the surface reported no element');

      // A drag moves the page and writes NOTHING. That pair is the acceptance
      // criterion, so it is two assertions and not one.
      const moved = await page.evaluate(
        (name) => {
          const element = document.querySelector(`[data-section="${name}"]`);
          return getComputedStyle(element).translate;
        },
        picked.section,
      );
      if (!/30px/.test(moved)) {
        failures.push(`dragging ${picked.section} did not move it — its translate is "${moved}"`);
      }
      if (readFileSync(overridesFile, 'utf8') !== overridesWere) {
        failures.push('a drag wrote to src/overrides.css — moving and resizing writes to no source at all');
      }
      for (const [where, was] of snapshot(root)) {
        if (was !== standing.get(where)) {
          failures.push(`a drag reached ${where} — moving and resizing writes to no source at all`);
        }
      }
      notes.push(`dragged the ${picked.section} mount point 30px, and no file moved`);

      // Resized by the number box, which is the exact half of the same gesture.
      const narrower = picked.width - 120;
      await page.locator('[data-editor-nudge="width"]').fill(String(narrower));
      await page.locator('[data-editor-nudge="width"]').press('Enter');
      const narrowed = await page.evaluate(
        (name) => Math.round(document.querySelector(`[data-section="${name}"]`).getBoundingClientRect().width),
        picked.section,
      );
      if (Math.abs(narrowed - narrower) > 2) {
        failures.push(`resizing ${picked.section} to ${narrower}px left it ${narrowed}px wide`);
      }

      // The Annotation: text, with the element's name and both numbers in it.
      await page.locator('[data-editor-measure="annotation"]').click();
      const annotation = await page.inputValue('[data-editor-annotations]');
      if (annotation.trim() === '') failures.push('pressing Annotation produced no text');
      for (const [what, wantedIn] of [
        ['the name it gave the element', pickedName.trim()],
        ['a before and an after', 'px → '],
        ['what changed', '+'],
        ['the selector an Override would use', ':root '],
        ['the size it was measured at', String(Math.round(page.viewportSize()?.width ?? 0))],
      ]) {
        if (!annotation.includes(wantedIn)) {
          failures.push(`the Annotation carries no ${what} ("${wantedIn}") — the text is the output, so it has to`);
        }
      }
      notes.push(`took an Annotation of ${annotation.split('\n').length} lines`);

      // The Override: the file, the list, the badge, and the page still right.
      await page.locator('[data-editor-measure="override"]').click();
      const wroteOverride = await page
        .waitForFunction(
          () => document.querySelector('[data-editor-said]')?.textContent?.includes('Override'),
          undefined,
          { timeout: 10_000 },
        )
        .then(() => true)
        .catch(() => false);
      if (!wroteOverride) failures.push('the Editor never reported writing an Override');

      const overridesNow = readFileSync(overridesFile, 'utf8');
      let standingRecords = [];
      try {
        standingRecords = parseOverrides(overridesNow);
      } catch (error) {
        failures.push(`the Editor wrote an Overrides file its own boundary cannot read — ${error.message}`);
      }
      if (standingRecords.length !== 1) {
        failures.push(`writing one Override left ${standingRecords.length} in src/overrides.css`);
      } else {
        if (!overridesNow.includes('!important')) {
          failures.push('an Override was written without !important — it would not outrank the rule it argues with');
        }
        if (!standingRecords[0].selector.startsWith(':root ')) {
          failures.push(`an Override's selector is "${standingRecords[0].selector}", which does not start at :root`);
        }
      }
      if (!overridesNow.startsWith(EMPTY.slice(0, EMPTY.indexOf('*/')))) {
        failures.push('writing an Override did not keep the Overrides file’s header');
      }

      // Immediately, and without a rebuild: the page still shows the change, and
      // it is the sheet the surface writes from the FILE that does it now — the
      // drag's inline styles are gone by this point.
      // The properties this surface sets, and not the whole style attribute: a
      // Section legitimately writes inline custom properties of its own, and one
      // of those holding the word "width" would read as a drag that was left on.
      // The list comes from the boundary rather than being spelled again here.
      // The properties themselves and not a joined string: a string has to be
      // matched, a match needs a pattern, and a pattern is where an assertion
      // quietly stops asserting. This one cannot — it is a list, and the claim is
      // that the list is empty.
      const leftInline = await page.evaluate(
        ([name, properties]) => {
          const style = document.querySelector(`[data-section="${name}"]`).style;
          return properties
            .map((property) => [property, style.getPropertyValue(property)])
            .filter(([, value]) => value !== '')
            .map(([property, value]) => `${property}: ${value}`);
        },
        [picked.section, PROPERTIES],
      );
      if (leftInline.length > 0) {
        failures.push(
          `writing an Override left the drag's inline styles on the element (${leftInline.join(', ')}) — the page` +
            ' would then be showing the drag rather than what the file says',
        );
      }
      const stillNarrow = await page.evaluate(
        (name) => Math.round(document.querySelector(`[data-section="${name}"]`).getBoundingClientRect().width),
        picked.section,
      );
      if (Math.abs(stillNarrow - narrower) > 2) {
        failures.push(
          `the Override did not make the page look right immediately — ${picked.section} went back to` +
            ` ${stillNarrow}px instead of ${narrower}px, so it is waiting for a build`,
        );
      }

      const listedOverrides = await page.locator('[data-editor-override]').count();
      if (listedOverrides !== 1) {
        failures.push(`the Editor listed ${listedOverrides} Overrides after writing one`);
      }
      const badge = (await page.textContent('[data-editor-owed]')) ?? '';
      if (!badge.includes('1 Override')) {
        failures.push(`the panel's header says "${badge}" rather than counting the Override — it would be invisible debt`);
      }
      notes.push('wrote an Override, and the page followed without a build');

      // An element that already carries an Override must still be measurable. The
      // Override is `!important`, so a drag written as a plain inline style loses
      // to it — the page would not move, the surface would report "unchanged", and
      // the only way to adjust an Override would be to discard it first. Nothing
      // about that failure looks like a bug from the outside, which is why it is
      // asserted here rather than trusted.
      // Off the surface and back on: the same thing the two presses used to do,
      // which is drop the selection and start again.
      await page.locator('[data-editor-choose="content"]').click();
      await page.locator('[data-editor-choose="measure"]').click();
      await page.evaluate((name) => {
        const element = document.querySelector(`[data-section="${name}"]`);
        const at = (type) => element.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true }));
        at('pointerdown');
        at('pointerup');
      }, picked.section);
      const again = narrower - 60;
      await page.locator('[data-editor-nudge="width"]').fill(String(again));
      await page.locator('[data-editor-nudge="width"]').press('Enter');
      const remeasured = await page.evaluate(
        (name) => Math.round(document.querySelector(`[data-section="${name}"]`).getBoundingClientRect().width),
        picked.section,
      );
      if (Math.abs(remeasured - again) > 2) {
        failures.push(
          `an element already carrying an Override could not be measured again — it went to ${remeasured}px` +
            ` instead of ${again}px, so the Override is outranking the drag and its own element is now frozen`,
        );
      } else {
        notes.push('measured it again with the Override standing');
      }
      await page.locator('[data-editor-measure="restore"]').click();

      // A refused Override leaves the file exactly as it was. A selector no
      // surface would build is the one every Overrides file forbids.
      const smuggleOverride = await fetch(`${served.origin}/__editor/overrides`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-editor': '1' },
        body: JSON.stringify({
          selector: '.projects-panel { } .a',
          name: 'from somewhere else',
          note: [],
          declarations: { width: '1px' },
        }),
      });
      if (smuggleOverride.ok) failures.push('the Editor accepted an Override selector carrying a rule');
      if (readFileSync(overridesFile, 'utf8') !== overridesNow) {
        failures.push('a refused Override reached src/overrides.css');
      }

      const driveOverride = await fetch(`${served.origin}/__editor/overrides`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ selector: ':root #front-screen', declarations: { width: '1px' } }),
      });
      if (driveOverride.ok) {
        failures.push('the Editor wrote an Override with no handshake header — any page in any tab could');
      }

      // And it can be discarded, which is the other half of the debt being
      // visible: a list nothing can be taken off is a list nobody trusts.
      await page.locator('[data-editor-discard]').first().click();
      const dropped = await page
        .waitForFunction(
          () => document.querySelector('[data-editor-said]')?.textContent?.includes('discarded'),
          undefined,
          { timeout: 10_000 },
        )
        .then(() => true)
        .catch(() => false);
      if (!dropped) failures.push('the Editor never reported discarding the Override');
      if (readFileSync(overridesFile, 'utf8') !== overridesWere) {
        failures.push('discarding the only Override did not put src/overrides.css back to what it was');
      }
      if ((await page.locator('[data-editor-override]').count()) !== 0) {
        failures.push('a discarded Override is still in the list');
      }
      notes.push('discarded it, and the file went back');

      // "Anything on the page can be moved and resized" includes the inline boxes,
      // which is most of the text here — and `width`, `height` and `translate` do
      // not apply to a non-replaced inline box at all, so without the promotion in
      // pick() a <span> drags with no effect whatever and the Annotation reads
      // "unchanged". The element is found by its computed display rather than
      // named, and marked so this Check can address it without naming a
      // composition.
      const anInline = await page.evaluate(() => {
        for (const element of document.querySelectorAll('[data-section] *')) {
          if (element.closest('[data-editor]') || getComputedStyle(element).display !== 'inline') continue;
          const box = element.getBoundingClientRect();
          if (box.width < 8 || box.height < 8) continue;
          element.setAttribute('data-editor-check-inline', '');
          return { tag: element.tagName, left: Math.round(box.left) };
        }
        return null;
      });
      if (!anInline) {
        notes.push('no inline box on the page, so the promotion is not asserted');
      } else {
        await page.locator('[data-editor-choose="content"]').click();
        await page.locator('[data-editor-choose="measure"]').click();
        const drifted = await page.evaluate(() => {
          const element = document.querySelector('[data-editor-check-inline]');
          const box = element.getBoundingClientRect();
          const at = (type, x, y) =>
            element.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y }));
          const x = Math.round(box.left + 2);
          const y = Math.round(box.top + 2);
          at('pointerdown', x, y);
          at('pointermove', x + 30, y);
          at('pointerup', x + 30, y);
          return Math.round(element.getBoundingClientRect().left - box.left);
        });
        if (Math.abs(drifted - 30) > 2) {
          failures.push(
            `dragging an inline <${anInline.tag.toLowerCase()}> 30px moved it ${drifted}px — width, height and` +
              ' translate do not apply to a non-replaced inline box, so it has to be promoted to be measured at all',
          );
        } else {
          notes.push(`dragged an inline <${anInline.tag.toLowerCase()}>, promoted so it could move`);
        }
        await page.locator('[data-editor-measure="restore"]').click();
        await page.locator('[data-editor-choose="content"]').click();
        await page.locator('[data-editor-choose="measure"]').click();
        await page.evaluate(() =>
          document.querySelector('[data-editor-check-inline]')?.removeAttribute('data-editor-check-inline'),
        );
      }

      // ---- a press inside what is already picked ---------------------------
      //
      // Two assertions, because they are the two halves of one decision and each
      // is invisible in the other's absence. A box reached by `↑` or by a crumb
      // COVERS children, so a press over one of them that re-picked the child left
      // the box the author had just chosen movable only on whatever bare strip of
      // it happened not to be a child. And the pointer is the only way INTO a box —
      // `↓` goes back only where `↑` came from — so a press inside that always
      // dragged would seal every parent shut the moment it was picked. A drag from
      // inside moves what is picked; a click from inside goes deeper.
      //
      // A pair found by shape rather than named, for the same reason the inline box
      // above is: naming one would fail the day it was renamed.
      const nested = await page.evaluate(() => {
        for (const parent of document.querySelectorAll('[data-section] *')) {
          if (parent.closest('[data-editor]')) continue;
          const box = parent.getBoundingClientRect();
          if (box.width < 60 || box.height < 30) continue;
          const child = [...parent.children].find((one) => {
            const inner = one.getBoundingClientRect();
            return inner.width > 12 && inner.height > 12;
          });
          if (!child) continue;
          parent.setAttribute('data-editor-check-outer', '');
          child.setAttribute('data-editor-check-inner', '');
          return { parent: parent.tagName.toLowerCase(), child: child.tagName.toLowerCase() };
        }
        return null;
      });
      if (!nested) {
        notes.push('no nested pair on the page, so a press inside what is picked is not asserted');
      } else {
        await page.locator('[data-editor-choose="content"]').click();
        await page.locator('[data-editor-choose="measure"]').click();
        // Every event below is dispatched AT THE CHILD, which is the whole point:
        // the author's pointer is over the child both times, and what differs is
        // only whether it travelled.
        const inside = await page.evaluate(() => {
          const parent = document.querySelector('[data-editor-check-outer]');
          const child = document.querySelector('[data-editor-check-inner]');
          const at = (target, type, x, y) =>
            target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y }));
          const midOf = (element) => {
            const box = element.getBoundingClientRect();
            return [Math.round(box.left + box.width / 2), Math.round(box.top + box.height / 2)];
          };
          // The parent is picked by pressing on the parent — a dispatched event
          // lands on the element it is dispatched at, so this needs no bare strip
          // of it to aim for and stays true of any composition.
          const [px, py] = midOf(parent);
          at(parent, 'pointerdown', px, py);
          at(parent, 'pointerup', px, py);

          const [x, y] = midOf(child);
          const parentWas = parent.getBoundingClientRect().left;
          at(child, 'pointerdown', x, y);
          at(child, 'pointermove', x + 40, y);
          at(child, 'pointerup', x + 40, y);
          const dragged = {
            parent: Math.round(parent.getBoundingClientRect().left - parentWas),
            // Who was actually dragged, and the only reading that tells them apart:
            // the child rides along inside the parent either way, but a translate is
            // written on whatever is PICKED.
            child: getComputedStyle(child).translate,
          };

          // And now the same press with the pointer standing still, which is a
          // click and picks the child. Both baselines are read AFTER it, so it
          // does not matter whether picking put the parent back.
          at(child, 'pointerdown', x, y);
          at(child, 'pointerup', x, y);
          const before = { parent: parent.getBoundingClientRect().left, child: child.getBoundingClientRect().left };
          at(child, 'pointerdown', x, y);
          at(child, 'pointermove', x + 25, y);
          at(child, 'pointerup', x + 25, y);
          const clicked = {
            parent: Math.round(parent.getBoundingClientRect().left - before.parent),
            child: Math.round(child.getBoundingClientRect().left - before.child),
          };

          // And a hand that is not quite still is still a click. The parent back,
          // and then two pixels of travel — under the slop, so it must pick rather
          // than move. Picking puts the parent back and the parent is carrying
          // nothing at this point, so anything at all here is the drag firing.
          at(parent, 'pointerdown', px, py);
          at(parent, 'pointerup', px, py);
          const steady = parent.getBoundingClientRect().left;
          at(child, 'pointerdown', x, y);
          at(child, 'pointermove', x + 2, y);
          at(child, 'pointerup', x + 2, y);
          return { dragged, clicked, shaky: parent.getBoundingClientRect().left - steady };
        });
        const pair = `<${nested.child}> inside <${nested.parent}>`;
        if (Math.abs(inside.dragged.parent - 40) > 2) {
          failures.push(
            `with <${nested.parent}> picked, dragging 40px from inside it moved it ${inside.dragged.parent}px —` +
              ` the press re-picked the ${nested.child} under the pointer instead, so a box can only be moved` +
              ' by the part of it that covers nothing',
          );
        } else if (/40px/.test(inside.dragged.child)) {
          failures.push(
            `dragging from inside <${nested.parent}> moved it, but wrote the translate on the <${nested.child}>` +
              ' as well — two elements are being dragged by one gesture',
          );
        } else {
          notes.push(`dragged ${pair} by pressing on the child, and the parent is what moved`);
        }
        if (Math.abs(inside.clicked.child - 25) > 2 || Math.abs(inside.clicked.parent) > 2) {
          failures.push(
            `a click inside <${nested.parent}> did not pick the <${nested.child}> under it — the next drag moved` +
              ` the child ${inside.clicked.child}px and the parent ${inside.clicked.parent}px, so the pointer has` +
              ' no way into a box once its parent is picked',
          );
        } else {
          notes.push('and a click inside it picked the child, which is the way back in');
        }
        if (Math.abs(inside.shaky) > 0.5) {
          failures.push(
            `two pixels of travel inside <${nested.parent}> moved it ${inside.shaky.toFixed(2)}px — a click is` +
              ' being read as a drag, so a hand that is not quite still can no longer pick anything smaller',
          );
        } else {
          notes.push('and two pixels of travel is still a click');
        }
        await page.locator('[data-editor-measure="restore"]').click();
        await page.locator('[data-editor-choose="content"]').click();
        await page.locator('[data-editor-choose="measure"]').click();
        await page.evaluate(() => {
          document.querySelector('[data-editor-check-outer]')?.removeAttribute('data-editor-check-outer');
          document.querySelector('[data-editor-check-inner]')?.removeAttribute('data-editor-check-inner');
        });
      }

      // ---- the four corners -----------------------------------------------
      //
      // Resizing used to be one handle in the bottom right, which needed no
      // arithmetic: the top left never moved. Four corners is four different
      // sums, because three of them MOVE the box as well as sizing it — the
      // corner OPPOSITE the one under the pointer is the anchor, and that is the
      // whole rule. `scripts/editor/lib/corners.mjs` is the arithmetic and is
      // asserted in node; what cannot be asserted there is the wiring from a
      // handle to it, so this drags all four on a real page.
      //
      // On an element of its own, injected and taken back out. A composition's
      // box may be held to a size by something else, and then a corner that asks
      // for a smaller one gets the size it had — which is the honest answer for a
      // page and a false failure for a Check about signs.
      await page.evaluate(() => {
        const element = document.createElement('div');
        element.id = 'editor-check-corners';
        element.style.cssText = 'position: fixed; left: 200px; top: 200px; width: 240px; height: 160px;';
        document.body.append(element);
      });
      // A corner has to be VISIBLE to be dragged, and every assertion below this
      // one dispatches its pointer events straight at an element — so all of them
      // pass on a marquee that is not drawn at all. That is not hypothetical: one
      // unclosed rule earlier in `client/editor.css` made the parser drop every
      // rule after it, and the entire measuring section — the marquee, the
      // handles, the cursors — was dead while this Check went on passing. So the
      // computed styles are read once, here, and it is the truncation this
      // catches rather than the look.
      const drawn = await page.evaluate(() => {
        const element = document.getElementById('editor-check-corners');
        const box = element.getBoundingClientRect();
        const at = (type) =>
          element.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              cancelable: true,
              clientX: Math.round(box.left + box.width / 2),
              clientY: Math.round(box.top + box.height / 2),
            }),
          );
        at('pointerdown');
        at('pointerup');
        const marquee = document.querySelector('[data-editor-marquee]');
        return {
          marquee: marquee === null ? null : getComputedStyle(marquee).position,
          handles: [...document.querySelectorAll('[data-editor-handle]')].map((handle) => {
            const computed = getComputedStyle(handle);
            return [handle.dataset.editorHandle, computed.position, computed.cursor];
          }),
        };
      });
      if (drawn.marquee !== 'fixed') {
        failures.push(
          `the marquee over a picked element computes to position: ${drawn.marquee} — it is not being drawn over` +
            ' the page, so nothing here can be grabbed by hand',
        );
      }
      for (const [corner, position, cursor] of drawn.handles) {
        if (position !== 'absolute' || !cursor.endsWith('-resize')) {
          failures.push(
            `the ${corner} handle computes to position: ${position} and cursor: ${cursor} — it is not sitting on` +
              " its corner, so the Editor's stylesheet is not reaching it",
          );
        }
      }
      await page.locator('[data-editor-measure="restore"]').click();

      const anchors = { nw: ['right', 'bottom'], ne: ['left', 'bottom'], sw: ['right', 'top'], se: ['left', 'top'] };
      // TWO shapes, and the same four corners on each. The second is #165: a
      // MEASURED size is a BORDER box, because it is read off
      // `getBoundingClientRect()`, and a WRITTEN one is a CONTENT box unless the
      // element says otherwise — and this repository has no global
      // `box-sizing: border-box`. So a padded content box was given back a box
      // padding-plus-border WIDER than the one asked for, and because
      // `lib/corners.mjs` derives the corner's MOVE from the size it asked for,
      // the anchor drifted by exactly that and stayed drifted for the whole drag.
      // The plain shape is first and deliberately carries no padding at all,
      // which is what keeps its four assertions about SIGNS and nothing else.
      const shapes = [
        ['a plain box', 'position: fixed; left: 200px; top: 200px; width: 240px; height: 160px;'],
        [
          'a padded content box',
          'position: fixed; left: 200px; top: 200px; width: 240px; height: 160px; box-sizing: content-box;' +
            ' padding: 12px 18px; border: 3px solid transparent;',
        ],
      ];
      for (const [shape, css] of shapes) {
        // A FRESH element per shape, rather than restyling the one above. What is
        // picked stays picked through a *put back*, and a pointerdown on something
        // already picked does not re-record it — so restyling it under the
        // selection left `before` measuring the previous shape, and every number
        // below was out by the padding whether the code was right or wrong. A new
        // element is not in the selection, so the pointerdown that starts each
        // drag picks it properly.
        await page.evaluate((style) => {
          document.getElementById('editor-check-corners')?.remove();
          const element = document.createElement('div');
          element.id = 'editor-check-corners';
          element.style.cssText = style;
          document.body.append(element);
        }, css);
        const cornered = [];
        // Every corner dragged INWARDS, so all four take the same 40x25 off the box
        // and one comparison reads for all of them.
        for (const [corner, dx, dy] of [
          ['nw', 40, 25],
          ['ne', -40, 25],
          ['sw', 40, -25],
          ['se', -40, -25],
        ]) {
          const dragged = await page.evaluate(
            ([which, byX, byY]) => {
              const element = document.getElementById('editor-check-corners');
              const at = (target, type, x, y) =>
                target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y }));
              const start = element.getBoundingClientRect();
              const mid = [Math.round(start.left + start.width / 2), Math.round(start.top + start.height / 2)];
              at(element, 'pointerdown', ...mid);
              at(element, 'pointerup', ...mid);
              const handle = document.querySelector(`[data-editor-handle="${which}"]`);
              if (!handle) return null;
              const grip = handle.getBoundingClientRect();
              const x = Math.round(grip.left + grip.width / 2);
              const y = Math.round(grip.top + grip.height / 2);
              at(handle, 'pointerdown', x, y);
              at(handle, 'pointermove', x + byX, y + byY);
              at(handle, 'pointerup', x + byX, y + byY);
              const box = ({ left, top, right, bottom, width, height }) => ({
                left: Math.round(left),
                top: Math.round(top),
                right: Math.round(right),
                bottom: Math.round(bottom),
                width: Math.round(width),
                height: Math.round(height),
              });
              return { before: box(start), after: box(element.getBoundingClientRect()) };
            },
            [corner, dx, dy],
          );
          if (dragged === null) {
            failures.push(`the marquee over ${shape} has no ${corner} handle — that corner cannot be dragged at all`);
            continue;
          }
          const { before, after } = dragged;
          if (Math.abs(before.width - after.width - 40) > 2 || Math.abs(before.height - after.height - 25) > 2) {
            failures.push(
              `dragging the ${corner} corner of ${shape} inwards by 40x25 took` +
                ` ${before.width - after.width}x${before.height - after.height} off the box`,
            );
          }
          const drifted = anchors[corner].filter((edge) => Math.abs(after[edge] - before[edge]) > 2);
          if (drifted.length > 0) {
            failures.push(
              `dragging the ${corner} corner of ${shape} moved its ${anchors[corner].join(' and ')}` +
                ` (${drifted.map((edge) => `${edge} ${before[edge]} → ${after[edge]}`).join(', ')}) — the corner` +
                ' opposite the one being dragged is the anchor and does not move',
            );
          } else {
            cornered.push(corner);
          }
          // The other half of #165 is a report line for an anchor the LAYOUT would
          // not let go of, and a line that fires on every drag would say nothing.
          // Both shapes here are `position: fixed` with a `left`, so the layout
          // does hold their left edge and there is nothing to warn about.
          const reported = (await page.textContent('[data-editor-said]')) ?? '';
          if (reported.includes('could not be held')) {
            failures.push(
              `dragging the ${corner} corner of ${shape} reported a lost anchor — "${reported}" — on a box whose` +
                ' left edge the layout does hold, so that warning fires on every drag and says nothing',
            );
          }
          await page.locator('[data-editor-measure="restore"]').click();
        }
        if (cornered.length === 4) notes.push(`resized ${shape} by dragging all four corners (${cornered.join(', ')})`);
      }
      await page.evaluate(() => document.getElementById('editor-check-corners')?.remove());

      // ---- moved first, then resized ---------------------------------------
      //
      // The lost-anchor line is measured from where the box stood when the RESIZE
      // started, and not from where it was picked. "Drag it over there, then size
      // it" is the ordinary gesture, and an element standing on a translate the
      // author asked for is not the layout refusing to let a corner go — a line
      // that fired on it would fire on most drags and teach the author to skip it.
      await page.evaluate(() => {
        const element = document.createElement('div');
        element.id = 'editor-check-moved';
        element.style.cssText = 'position: fixed; left: 200px; top: 300px; width: 200px; height: 80px;';
        document.body.append(element);
      });
      const pushed = await page.evaluate(() => {
        const element = document.getElementById('editor-check-moved');
        const at = (target, type, x, y) =>
          target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y }));
        const start = element.getBoundingClientRect();
        const x = Math.round(start.left + start.width / 2);
        const y = Math.round(start.top + start.height / 2);
        at(element, 'pointerdown', x, y);
        at(element, 'pointermove', x + 60, y);
        at(element, 'pointerup', x + 60, y);
        const shifted = Math.round(element.getBoundingClientRect().left);
        const handle = document.querySelector('[data-editor-handle="se"]');
        if (!handle) return null;
        const grip = handle.getBoundingClientRect();
        const gx = Math.round(grip.left + grip.width / 2);
        const gy = Math.round(grip.top + grip.height / 2);
        at(handle, 'pointerdown', gx, gy);
        at(handle, 'pointermove', gx - 30, gy - 20);
        at(handle, 'pointerup', gx - 30, gy - 20);
        return { from: Math.round(start.left), shifted };
      });
      if (pushed === null || pushed.from === pushed.shifted) {
        failures.push(
          'a box dragged 60px right did not move, so the Check that a prior move is not reported as a lost anchor' +
            ' is staging nothing',
        );
      } else {
        const reported = (await page.textContent('[data-editor-said]')) ?? '';
        if (reported.includes('could not be held')) {
          failures.push(
            `a box moved ${pushed.shifted - pushed.from}px and then resized reported a lost anchor — "${reported}" —` +
              " but the translate it is standing on is the author's own, so this fires on the ordinary gesture",
          );
        } else {
          notes.push('did not call the author’s own move a lost anchor');
        }
      }
      await page.locator('[data-editor-measure="restore"]').click();
      await page.evaluate(() => document.getElementById('editor-check-moved')?.remove());

      // ---- an anchor the layout will not let go of -------------------------
      //
      // `lib/corners.mjs` holds the anchor by translating the box by exactly what
      // its width lost, which is right only when the layout holds the box's LEFT
      // edge still. A box placed by `margin-inline: auto` moves both edges as it
      // narrows, so the anchor drifts by half the delta whatever this surface
      // does about it.
      //
      // #165 decided not to fight that: this surface MEASURES, so `applyTo()`
      // re-reads the box and the read-out and the Annotation are already truthful
      // about where it landed — a tool that moved the layout to hold a corner
      // would be computing a position rather than reporting one, which is the
      // line ADR 0004 draws. What it owes the author is to SAY so, and that
      // sentence is the deliverable, so it is what is asserted.
      await page.evaluate(() => {
        const around = document.createElement('div');
        around.id = 'editor-check-centred';
        around.style.cssText = 'position: fixed; left: 100px; top: 420px; width: 400px; height: 80px;';
        const inside = document.createElement('div');
        inside.id = 'editor-check-centred-box';
        inside.style.cssText = 'width: 200px; height: 60px; margin-inline: auto;';
        around.append(inside);
        document.body.append(around);
      });
      const centred = await page.evaluate(() => {
        const element = document.getElementById('editor-check-centred-box');
        const at = (target, type, x, y) =>
          target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y }));
        const start = element.getBoundingClientRect();
        at(element, 'pointerdown', Math.round(start.left + start.width / 2), Math.round(start.top + start.height / 2));
        at(element, 'pointerup', Math.round(start.left + start.width / 2), Math.round(start.top + start.height / 2));
        const handle = document.querySelector('[data-editor-handle="se"]');
        if (!handle) return null;
        const grip = handle.getBoundingClientRect();
        const x = Math.round(grip.left + grip.width / 2);
        const y = Math.round(grip.top + grip.height / 2);
        at(handle, 'pointerdown', x, y);
        at(handle, 'pointermove', x - 40, y - 25);
        at(handle, 'pointerup', x - 40, y - 25);
        return { left: Math.round(start.left), now: Math.round(element.getBoundingClientRect().left) };
      });
      if (centred === null) {
        failures.push('the marquee over a centred box has no se handle, so nothing here could be dragged');
      } else if (centred.left === centred.now) {
        // Not the surface's failure to report — the situation did not arise, so
        // the assertion below would pass on a page that had nothing to say.
        failures.push(
          `a box placed by margin-inline: auto did not move its left edge when it narrowed (${centred.left} both` +
            ' times), so this Check is no longer staging the case it is about',
        );
      } else {
        const reported = (await page.textContent('[data-editor-said]')) ?? '';
        if (!reported.includes('top left corner could not be held')) {
          failures.push(
            `resizing a centred box moved its left edge from ${centred.left} to ${centred.now} and the Editor said` +
              ` "${reported}" — the anchor could not be held and the author was not told`,
          );
        } else {
          notes.push('said so when a centred box would not let its anchor be held');
        }
      }
      await page.locator('[data-editor-measure="restore"]').click();
      await page.locator('[data-editor-choose="content"]').click();
      await page.evaluate(() => document.getElementById('editor-check-centred')?.remove());
      await page.locator('[data-editor-choose="measure"]').click();

      // ---- a measurement that lands on a Token ----------------------------
      //
      // The Editor offers to write a Token when the length that moved is declared
      // as exactly one, and finding that out means walking the page's own
      // stylesheets — which is the part of this surface that failed SILENTLY while
      // reading as though it worked. (A `CSSStyleRule` has a `cssRules` of its own
      // now that CSS nesting exists, empty for a rule with nothing nested; a walk
      // that read that as "a group, not a declaration" found nothing anywhere, and
      // the only symptom was an Annotation that never mentioned a Token.)
      //
      // So this Check MAKES the situation rather than looking for it: one rule of
      // its own, declaring a real Token as a real length on the element it is about
      // to measure. Injected rather than named, because naming an element of a
      // composition would fail the day the composition renamed it — and taken back
      // out afterwards.
      const state = await fetch(`${served.origin}/__editor/state`).then((response) => response.json());
      const lengths = state.tokens.flatMap(({ section: owner, tokens }) =>
        tokens.map((token) => ({ owner, ...token })),
      );
      // A plain length, declared on exactly one rule: two rules is two Tokens and
      // the Editor deliberately offers neither, and a value that is not a length
      // cannot be restated as one.
      const governs = lengths.find(
        (token) =>
          /^-?\d*\.?\d+(?:px|rem)$/.test(token.value) &&
          lengths.filter((other) => other.property === token.property).length === 1,
      );
      if (!governs) {
        notes.push('no Section declares a plain-length Token on one rule, so the Token offer is not asserted');
      } else {
        await page.evaluate(
          ([name, property]) => {
            const style = document.createElement('style');
            style.id = 'editor-check-governs';
            // The second rule is the other half of this assertion, and it is a
            // trap rather than decoration. It stands LATER in the sheet and would
            // win on source order — but its condition never holds, so a walk that
            // ignored conditions would report `1px` as what governs the width and
            // offer nothing. The Projects Panel really does write a `margin-left`
            // inside a `@media` that does not apply at desktop widths, and the
            // first version of this surface reported that number.
            style.textContent =
              `[data-section="${name}"] { width: var(${property}); }\n` +
              `@media not all { [data-section="${name}"] { width: 1px; } }`;
            document.head.append(style);
          },
          [picked.section, governs.property],
        );
        // Off the surface and back on before picking, because what governs a
        // length is read ONCE, when the element is picked — a pointerdown on what
        // is already picked starts a drag rather than picking it afresh, which is
        // the right answer for an author's finger and the wrong one for a Check
        // that has just changed the stylesheet under it.
        await page.locator('[data-editor-choose="content"]').click();
        await page.locator('[data-editor-choose="measure"]').click();
        await page.evaluate((name) => {
          const element = document.querySelector(`[data-section="${name}"]`);
          const at = (type) => element.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true }));
          at('pointerdown');
          at('pointerup');
        }, picked.section);

        const tokenPath = join(to.sections, governs.owner, 'tokens.css');
        const held = readFileSync(tokenPath, 'utf8');
        // The row names the constant it will write BEFORE anything is changed,
        // which is the other half of "in one place": a number that moves a Token
        // has to say which Token while the author is deciding, not afterwards.
        // Read here rather than after the write, because a write RESETS the
        // measurement — the page has moved by then, so the offer is legitimately
        // gone and reading it there would assert the wrong moment.
        const names = await page.locator('[data-editor-axis="width"]').getAttribute('data-editor-governed');
        if (names !== governs.property) {
          failures.push(
            `the width row is marked as governed by "${names}" rather than ${governs.property} — the number and` +
              ' the constant it writes have to be one thing to read',
          );
        }
        const width = await page.locator('[data-editor-nudge="width"]').inputValue();
        // NO SECOND PRESS AFTER THIS ONE, and that is the assertion (#166).
        // Committing the row IS the write, where a Token governs it — the button
        // that used to stand between the two was the "bunch of buttons" the ticket
        // is about.
        await page.locator('[data-editor-nudge="width"]').fill(String(Math.round(Number(width) * 0.8)));
        await page.locator('[data-editor-nudge="width"]').press('Enter');

        const wroteToken = await page
          .waitForFunction(
            (property) => document.querySelector('[data-editor-said]')?.textContent?.includes(property),
            governs.property,
            { timeout: 10_000 },
          )
          .then(() => true)
          .catch(() => false);
        if (!wroteToken) {
          failures.push(
            `resizing something whose width is declared as var(${governs.property}) never wrote it — the surface` +
              " is not reading the page's own stylesheets, or the row is not landing",
          );
        }
        if (readFileSync(tokenPath, 'utf8') === held) {
          failures.push(
            `committing the width row wrote nothing to ${governs.owner}/tokens.css — the row is not reaching` +
              ' the Tokens surface’s own control',
          );
        }
        if (wroteToken) notes.push(`committed the width row and it wrote ${governs.property}, with no second press`);

        // ---- and Ctrl-Z writes it back ------------------------------------
        //
        // THE HALF OF AN UNDO ON THIS SURFACE THAT IS INVISIBLE, which is why it
        // is asserted at the bytes and not on the page. Everything else a gesture
        // here does is an inline style, so a stack that only reversed those would
        // look completely right: the page goes back, the read-out goes back, the
        // marquee goes back. The FILE would still hold what the gesture put there,
        // and the disagreement would surface at the next build — with the author
        // having watched the change be taken back. That is the exact failure "a
        // Token's page and its file are two different things" exists to prevent.
        //
        // The keystroke and not the button, because the keystroke is the one that
        // has a way of being wrong that the button does not: it is delivered to
        // whatever has the focus, and `paintPicked()` puts the focus back in the
        // number box this Check just typed into.
        const pressable = await page.locator('[data-editor-undo]').isEnabled();
        if (!pressable) {
          failures.push('a committed row left the undo button disabled — the gesture never reached the stack');
        }
        // An undo AWAITS the POST that writes the Token back, and a second press
        // inside that window is deliberately dropped — so the file matching is not
        // the same thing as the surface being ready for the next press. The report
        // line is what says the walk finished.
        const said = (word) =>
          page
            .waitForFunction(
              (text) => document.querySelector('[data-editor-said]')?.textContent?.includes(text),
              word,
              { timeout: 10_000 },
            )
            .then(() => true)
            .catch(() => false);

        await page.keyboard.press('Control+z');
        if (!(await said('undid'))) {
          failures.push('Ctrl-Z after committing the width row said nothing — the keystroke never reached the surface');
        }
        if (!(await holds(page, () => readFileSync(tokenPath, 'utf8') === held))) {
          failures.push(
            `Ctrl-Z after committing the width row left ${governs.owner}/tokens.css holding the new value —` +
              ' the page was put back and the file was not, which is the one way this stack can be silently' +
              ' wrong',
          );
        } else {
          notes.push(`Ctrl-Z wrote ${governs.property} back to the value the build was made from`);
        }
        // And forward again, because a redo that did nothing would leave the
        // author's only way back from an undo being to make the gesture again.
        await page.keyboard.press('Control+Shift+z');
        if (!(await said('redid')) || !(await holds(page, () => readFileSync(tokenPath, 'utf8') !== held))) {
          failures.push(
            `Ctrl-Shift-Z did not write ${governs.property} again — the redo stack is not reaching the Tokens` +
              ' surface',
          );
        } else {
          notes.push('Ctrl-Shift-Z wrote it forward again');
        }
        // Back to what the build was made from, so nothing after this measures a
        // page this Check moved.
        await page.keyboard.press('Control+z');
        await said('undid');
        await holds(page, () => readFileSync(tokenPath, 'utf8') === held);

        await page.evaluate(() => document.getElementById('editor-check-governs')?.remove());

        // ---- and the same Token BEHIND A BOUND, which is the shape that was
        // ---- silent ------------------------------------------------------
        //
        // WHAT THIS ADDS OVER THE BLOCK ABOVE, and it is two things the direct
        // `width: var(--token)` shape cannot see.
        //
        // A composition almost never declares a box's width as a Token outright.
        // It writes `width: 100%` beside `max-width: var(--a-token)` — fill the
        // parent, up to the measure — which is the Front Screen's column exactly.
        // Against that, this surface used to fail TWICE and silently: the walk for
        // what governs the width stopped at `width`, saw `100%`, and answered "a
        // literal, not a Token at all"; and the preview wrote an inline `width`
        // that `max-width` clamped, however `!important` it was, so the box did not
        // move, the re-measure truthfully said "unchanged", and the commit had no
        // delta to write. The author's report was "I cannot make it any wider",
        // twice, with nothing on screen saying why — which is precisely a failure a
        // person cannot notice the cause of, and therefore a Check.
        //
        // So this asserts the two halves at the two places they broke: the ROW
        // names the Token, and a corner drag actually MOVES the box.
        //
        // INSIDE THE ELEMENT THE TOKEN IS DECLARED ON, exactly as the text-size
        // block below is, and for a reason that cost this Check a run: a Section's
        // Token is declared on the Section's own root, so `max-width: var(--it)` on
        // an element outside that subtree resolves to nothing, the declaration is
        // invalid at computed-value time, `max-width` computes to `none` — and the
        // Check then asserts a cap that was never there and reads as the surface
        // failing.
        const capped = await page.evaluate(
          ([property, selector]) => {
            const host = document.querySelector(selector);
            if (!host) return null;
            const element = document.createElement('div');
            element.id = 'editor-check-capped';
            element.textContent = 'Aa';
            // Taken out of flow so the composition around it does not move, and
            // `width: 100%` against the viewport is wider than any measure Token —
            // which is the point: the box has to be STANDING on the bound when it
            // is picked, or the bound is legitimately not what sized it. Clipped,
            // because what is measured is the box and not what the words do in it.
            element.style.cssText = 'position: fixed; left: 12px; top: 12px; height: 24px; overflow: hidden;';
            host.append(element);
            const style = document.createElement('style');
            style.id = 'editor-check-capped-sheet';
            style.textContent = `#editor-check-capped { width: 100%; max-width: var(${property}); }`;
            document.head.append(style);
            return element.getBoundingClientRect().width;
          },
          [governs.property, governs.selector],
        );
        if (capped === null) {
          failures.push(
            `nothing on the page matches "${governs.selector}", which is where ${governs.property} is declared`,
          );
        }
        await page.locator('[data-editor-choose="content"]').click();
        await page.locator('[data-editor-choose="measure"]').click();
        await page.evaluate(() => {
          const element = document.getElementById('editor-check-capped');
          const at = (kind) => element.dispatchEvent(new PointerEvent(kind, { bubbles: true, cancelable: true }));
          at('pointerdown');
          at('pointerup');
        });

        const behind = await page.locator('[data-editor-axis="width"]').getAttribute('data-editor-governed');
        if (capped !== null && behind !== governs.property) {
          failures.push(
            `a box written as width: 100% inside max-width: var(${governs.property}) reports its width as` +
              ` governed by "${behind}" — the walk is stopping at the first declared property instead of` +
              ' preferring the one that is a Token, so the row offers a length nothing can write',
          );
        }

        // The corner and not the row, because the row sets a number directly and
        // the DRAG is what the clamp swallowed. `boundingBox()` of the handle, so
        // this is the same gesture a hand makes.
        const grip = capped === null ? null : await page.locator('[data-editor-handle="se"]').boundingBox();
        if (!grip && capped !== null) {
          failures.push('no bottom-right handle on a picked element — the marquee is not drawn');
        } else if (grip) {
          await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
          await page.mouse.down();
          await page.mouse.move(grip.x + grip.width / 2 + 120, grip.y + grip.height / 2 + 12, { steps: 8 });
          const dragged = await page.evaluate(
            () => document.getElementById('editor-check-capped').getBoundingClientRect().width,
          );
          await page.mouse.up();
          if (dragged < capped + 100) {
            failures.push(
              `dragging the corner of a box capped by max-width: var(${governs.property}) took it from` +
                ` ${capped.toFixed(1)}px to ${dragged.toFixed(1)}px against 120px of pointer — the preview is` +
                ' not lifting the bound it is going to write, so the drag writes a style and the box stays put',
            );
          } else {
            notes.push(
              `dragged a box capped by max-width: var(${governs.property}) from ${capped.toFixed(1)}px to` +
                ` ${dragged.toFixed(1)}px, and the row named the Token behind the cap`,
            );
          }
          await page.locator('[data-editor-measure="restore"]').click();
        }
        await page.evaluate(() => {
          document.getElementById('editor-check-capped')?.remove();
          document.getElementById('editor-check-capped-sheet')?.remove();
        });
      }

      // ---- the zoom, which is not any box's and is dragged all the same ----
      //
      // WHAT THIS ASSERTS THAT NO ROW CAN. The four rows are one element's, and
      // "make everything bigger by a percentage" is not a property of any element:
      // it is the root font-size, because every measure, gap and glyph in both
      // Sections is authored in rem. So the `scale everything` toggle turns a corner
      // drag into a drag of ONE KERNEL TOKEN, previewed through the Tokens surface's
      // own sheet because there is no element to put it on, and written on release
      // rather than left as a measurement — a zoom is a Token and not a coordinate.
      //
      // Three things can be silently wrong about that and none of them is visible
      // from a boundary test: the drag can fail to reach the Token, the preview can
      // fail to reach the page, and the release can move the page without writing
      // the file. So this asserts the root font-size MOVED and the file HOLDS it.
      const zoomFile = join(to.kernel, 'tokens', 'faces.css');
      const zoomHeld = (() => {
        try {
          return readFileSync(zoomFile, 'utf8');
        } catch {
          return null;
        }
      })();
      if (zoomHeld === null || !zoomHeld.includes('--type-zoom')) {
        notes.push('the Kernel declares no --type-zoom, so the zoom gesture is not asserted');
      } else {
        await page.locator('[data-editor-choose="content"]').click();
        await page.locator('[data-editor-choose="measure"]').click();
        await page.evaluate((name) => {
          const element = document.querySelector(`[data-section="${name}"] *`);
          const at = (kind) => element.dispatchEvent(new PointerEvent(kind, { bubbles: true, cancelable: true }));
          at('pointerdown');
          at('pointerup');
        }, picked.section);
        await page.locator('[data-editor-toggle="zoom"]').check();
        const rootWas = await page.evaluate(() => getComputedStyle(document.documentElement).fontSize);
        const zoomGrip = await page.locator('[data-editor-handle="se"]').boundingBox();
        if (!zoomGrip) {
          failures.push('no handle to drag the zoom by — nothing was picked, or the marquee is not drawn');
        } else {
          await page.mouse.move(zoomGrip.x + zoomGrip.width / 2, zoomGrip.y + zoomGrip.height / 2);
          await page.mouse.down();
          await page.mouse.move(zoomGrip.x + zoomGrip.width / 2 + 90, zoomGrip.y + zoomGrip.height / 2 + 60, {
            steps: 10,
          });
          const rootDuring = await page.evaluate(() => getComputedStyle(document.documentElement).fontSize);
          await page.mouse.up();
          // The PAGE first: a preview that never reached the document is a gesture
          // the author cannot see, whatever the file ends up holding.
          if (Number.parseFloat(rootDuring) <= Number.parseFloat(rootWas)) {
            failures.push(
              `dragging a corner with "scale everything" on left the root font-size at ${rootDuring} from` +
                ` ${rootWas} — the preview is not reaching the page, so nothing about the gesture is visible`,
            );
          }
          // Then the FILE, which is the half a moving page cannot vouch for: the
          // preview is a stylesheet of the Editor's own, so a release that wrote
          // nothing would look completely right until the next build took it back.
          const wroteZoom = await holds(page, () => readFileSync(zoomFile, 'utf8') !== zoomHeld);
          if (!wroteZoom) {
            failures.push(
              'letting go of a zoom wrote nothing to src/kernel/tokens/faces.css — the gesture is not reaching' +
                ' the Tokens surface’s own control, so the page and the file disagree',
            );
          } else {
            notes.push(`dragged the zoom: root font-size ${rootWas} → ${rootDuring}, and --type-zoom was written`);
          }
          // AND BACK — but not until the STEP is on the stack, which is a moment
          // later than the file changing and cost this Check a run. `landZoom` is
          // not awaited by the pointerup handler, so the write lands inside
          // `writeKey` and the step is recorded after it: a Ctrl-Z fired the instant
          // the bytes changed reverses whatever was on the stack BEFORE this
          // gesture, and reads as an undo that did not reach the Token. The button's
          // own title is the honest signal that the step exists.
          await page
            .waitForFunction(
              () => document.querySelector('[data-editor-undo]')?.title?.includes('the zoom'),
              null,
              { timeout: 10_000 },
            )
            .catch(() => {
              failures.push('a zoom never reached the undo stack — the button is still offering an older gesture');
            });
          await page.keyboard.press('Control+z');
          if (!(await holds(page, () => readFileSync(zoomFile, 'utf8') === zoomHeld))) {
            failures.push('Ctrl-Z after a zoom left --type-zoom written — the Token write is not on the stack');
          } else {
            notes.push('Ctrl-Z wrote the zoom back to what the build was made from');
          }
        }
        await page.locator('[data-editor-toggle="zoom"]').uncheck();
      }

      // ---- the text size, which is the fifth row and the reason for #166 ---
      //
      // Same mechanism as the width above and a different property, so what this
      // adds is the wiring: `font-size` has to be in `GOVERNED`, the row has to be
      // drawn, and `restate` has to be given a context WITHOUT the parent and
      // without the element's own font — a `%` font-size is a share of the
      // parent's size and an `em` one is a share of the number being changed, so
      // either would be restated wrong rather than refused.
      //
      // On an element of its own, because a Token declared as a Section's width is
      // any length at all and putting a 680px font-size on a composition would
      // measure the reflow rather than the row.
      const type = lengths.find(
        (token) =>
          /^-?\d*\.?\d+px$/.test(token.value) &&
          Number.parseFloat(token.value) >= 4 &&
          Number.parseFloat(token.value) <= 64 &&
          lengths.filter((other) => other.property === token.property).length === 1,
      );
      if (!type) {
        notes.push('no Section declares a plain px Token of a plausible size, so the text-size row is not asserted');
      } else {
        // INSIDE the element the Token is declared on, and that is the assertion
        // rather than the setting: a Token's preview is a declaration written under
        // the selector it came from, so an element outside that selector inherits
        // nothing and the page never follows the write. This one is a descendant,
        // so what is asserted is the whole chain — row, Token, preview sheet, page.
        const hosted = await page.evaluate(
          ([property, selector]) => {
            const host = document.querySelector(selector);
            if (!host) return false;
            const element = document.createElement('div');
            element.id = 'editor-check-type';
            element.textContent = 'Aa';
            // Fixed and clipped: the Token behind this may be any length, and what
            // is being measured is the row rather than the reflow.
            element.style.cssText =
              'position: fixed; left: 12px; bottom: 12px; width: 40px; height: 24px; overflow: hidden;';
            host.append(element);
            const style = document.createElement('style');
            style.id = 'editor-check-type-sheet';
            style.textContent = `#editor-check-type { font-size: var(${property}); }`;
            document.head.append(style);
            return true;
          },
          [type.property, type.selector],
        );
        if (!hosted) {
          failures.push(`nothing on the page matches "${type.selector}", which is where ${type.property} is declared`);
        }
        await page.locator('[data-editor-choose="content"]').click();
        await page.locator('[data-editor-choose="measure"]').click();
        await page.evaluate(() => {
          const element = document.getElementById('editor-check-type');
          const at = (kind) => element.dispatchEvent(new PointerEvent(kind, { bubbles: true, cancelable: true }));
          at('pointerdown');
          at('pointerup');
        });

        const row = page.locator('[data-editor-nudge="text size"]');
        if ((await row.count()) === 0) {
          failures.push('there is no text-size row on a picked element — the one thing #166 asked for');
        } else {
          const typePath = join(to.sections, type.owner, 'tokens.css');
          const typeHeld = readFileSync(typePath, 'utf8');
          const was = Number(await row.inputValue());
          const wanted = Math.round((was + 4) * 10) / 10;
          const names = await page.locator('[data-editor-axis="text size"]').getAttribute('data-editor-governed');
          if (names !== type.property) {
            failures.push(`the text-size row is marked as governed by "${names}" rather than ${type.property}`);
          }
          // DRAGGED, and not typed. The width above is the typed half; this is the
          // gesture #166 is actually about, and it is a different path — a
          // pointerdown on the row's label, a move, and a release that lands it.
          // The label is destroyed and rebuilt on every frame of the drag, because
          // every change repaints the read-out; the listeners are on `document`, so
          // that is survivable, and asserting it here is what says so.
          await page.evaluate((by) => {
            const label = document.querySelector('[data-editor-scrub="text size"]');
            const box = label.getBoundingClientRect();
            const x = Math.round(box.left + 2);
            const y = Math.round(box.top + 2);
            const at = (kind, clientX) =>
              label.dispatchEvent(
                new PointerEvent(kind, { bubbles: true, cancelable: true, clientX, clientY: y }),
              );
            at('pointerdown', x);
            document.dispatchEvent(
              new PointerEvent('pointermove', { bubbles: true, cancelable: true, clientX: x + by, clientY: y }),
            );
            document.dispatchEvent(
              new PointerEvent('pointerup', { bubbles: true, cancelable: true, clientX: x + by, clientY: y }),
            );
          }, Math.round((wanted - was) / 0.5));
          const wroteType = await page
            .waitForFunction(
              (property) => document.querySelector('[data-editor-said]')?.textContent?.includes(property),
              type.property,
              { timeout: 10_000 },
            )
            .then(() => true)
            .catch(() => false);
          if (!wroteType || readFileSync(typePath, 'utf8') === typeHeld) {
            failures.push(
              `a text size declared as var(${type.property}) did not write it — ${type.owner}/tokens.css is` +
                ' unchanged',
            );
          } else {
            // The file, and then the PAGE — and after the write rather than before
            // it, because the drag's inline styles are dropped the moment a Token
            // lands. What is showing 18.4px by now is the Token's own preview,
            // which is the only thing worth looking at: a row that moved the page
            // and wrote nothing, and a row that wrote the file and moved nothing,
            // are two different bugs that read the same from either side alone.
            const shown = await page.evaluate(() =>
              Number.parseFloat(getComputedStyle(document.getElementById('editor-check-type')).fontSize),
            );
            if (Math.abs(shown - wanted) > 1) {
              failures.push(
                `writing ${type.property} from the text-size row left the element at ${shown}px rather than` +
                  ` ${wanted}px — the file moved and the page did not`,
              );
            } else {
              notes.push(`scrubbed the text size and it wrote ${type.property}, with no second press`);
            }
          }
        }
        await page.evaluate(() => {
          document.getElementById('editor-check-type')?.remove();
          document.getElementById('editor-check-type-sheet')?.remove();
        });
      }

      // ---- reaching a parent, and picking a series -------------------------
      //
      // A click lands on the DEEPEST element under the pointer, which is almost
      // never the box the author means — so the ancestors are drawn as a
      // breadcrumb and `↑`/`↓` walk the same chain (#166). Both are asserted,
      // because the strip and the keys are two paths to one method and either can
      // be wired wrong on its own.
      // On a nest of its own, injected and taken back out, for the same reason the
      // four corners are: what is being asserted is the chain and the keys, and a
      // composition's own nesting is a shape that can be renamed. The crumb COUNT
      // is what the climb is read off — two elements of a composition can honestly
      // have the same name, so comparing the read-out's words would be a false
      // failure waiting for one.
      await page.evaluate(() => {
        const outer = document.createElement('div');
        outer.id = 'editor-check-nest';
        outer.style.cssText = 'position: fixed; left: 260px; bottom: 40px; width: 120px; height: 60px;';
        const middle = document.createElement('div');
        middle.style.cssText = 'width: 100px; height: 40px;';
        const inner = document.createElement('div');
        inner.id = 'editor-check-nest-inner';
        inner.style.cssText = 'width: 60px; height: 20px;';
        middle.append(inner);
        outer.append(middle);
        document.body.append(outer);
      });
      await page.locator('[data-editor-choose="content"]').click();
      await page.locator('[data-editor-choose="measure"]').click();
      await page.evaluate(() => {
        const element = document.getElementById('editor-check-nest-inner');
        const at = (kind) => element.dispatchEvent(new PointerEvent(kind, { bubbles: true, cancelable: true }));
        at('pointerdown');
        at('pointerup');
      });
      const crumbs = await page.locator('[data-editor-crumb]').count();
      if (crumbs !== 3) {
        failures.push(`a three-deep element's breadcrumb listed ${crumbs} crumbs — the chain is not being drawn`);
      }
      if ((await page.locator('[data-editor-crumb]').last().getAttribute('aria-pressed')) !== 'true') {
        failures.push('the last crumb is not marked as the picked one, so the strip says nothing about where you are');
      }
      // The keyboard, dispatched on the BODY: the handler stands down while the
      // focus is inside the panel, because an arrow key in a number box belongs to
      // the box.
      const arrow = (key) =>
        page.evaluate(
          (which) => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: which, bubbles: true })),
          key,
        );
      await arrow('ArrowUp');
      const afterUp = await page.locator('[data-editor-crumb]').count();
      if (afterUp !== crumbs - 1) {
        failures.push(`↑ left ${afterUp} crumbs where climbing one level should leave ${crumbs - 1}`);
      }
      await arrow('ArrowDown');
      const afterDown = await page.locator('[data-editor-crumb]').count();
      if (afterDown !== crumbs) {
        failures.push(`↓ left ${afterDown} crumbs — it did not come back to where ↑ started`);
      }
      // Clicking a crumb reaches the same place, which is the pointer half of the
      // same method.
      await page.locator('[data-editor-crumb]').first().click();
      const byCrumb = await page.locator('[data-editor-crumb]').count();
      if (byCrumb !== 1) {
        failures.push(`clicking the outermost crumb left ${byCrumb} crumbs rather than one`);
      }
      // Escape drops the selection without leaving the surface, which is the other
      // thing there is no button for.
      await arrow('Escape');
      if ((await page.locator('[data-editor-crumb]').count()) !== 0) {
        failures.push('Escape did not drop the selection');
      }
      if (!await page.evaluate(() => document.documentElement.hasAttribute('data-editor-armed'))) {
        failures.push('Escape disarmed the surface as well as dropping the selection');
      }
      notes.push('climbed to a parent by the breadcrumb and by the keyboard, and dropped it with Escape');
      await page.evaluate(() => document.getElementById('editor-check-nest')?.remove());

      // A series: shift-click adds, and one row moves all of them. This is the
      // whole of "click a series of text and resize them", so the assertion is
      // that BOTH elements followed one number — not that the read-out counted
      // them.
      await page.evaluate(() => {
        // Two boxes of this Check's own, again: a composition's box may be held to
        // a size by something else, and a row that asked for a smaller one would
        // then get the size it had — the honest answer for a page and a false
        // failure for a Check about a selection.
        for (const [at, left] of [
          [0, 420],
          [1, 560],
        ]) {
          const element = document.createElement('div');
          element.dataset.editorCheckSeries = String(at);
          element.style.cssText = `position: fixed; left: ${left}px; bottom: 40px; width: 100px; height: 30px;`;
          document.body.append(element);
        }
      });
      await page.locator('[data-editor-choose="content"]').click();
      await page.locator('[data-editor-choose="measure"]').click();
      await page.evaluate(() => {
        const at = (element, kind, shift) =>
          element.dispatchEvent(new PointerEvent(kind, { bubbles: true, cancelable: true, shiftKey: shift }));
        const one = document.querySelector('[data-editor-check-series="0"]');
        const two = document.querySelector('[data-editor-check-series="1"]');
        at(one, 'pointerdown', false);
        at(one, 'pointerup', false);
        at(two, 'pointerdown', true);
        at(two, 'pointerup', true);
      });
      const also = await page.locator('[data-editor-marquee][data-editor-also]').count();
      if (also !== 1) {
        failures.push(`shift-clicking a second element drew ${also} secondary marquees rather than one`);
      }
      const narrow = 64;
      await page.locator('[data-editor-nudge="width"]').fill(String(narrow));
      await page.locator('[data-editor-nudge="width"]').press('Enter');
      const landed = await page.evaluate(() =>
        [...document.querySelectorAll('[data-editor-check-series]')].map((element) =>
          Math.round(element.getBoundingClientRect().width),
        ),
      );
      if (landed.some((width) => Math.abs(width - narrow) > 2)) {
        failures.push(
          `one row set to ${narrow}px left the series at ${landed.join(', ')}px — a change made to a series has` +
            ' to reach every element in it',
        );
      } else {
        notes.push('shift-clicked a series, and one row resized both');
      }
      // And shift-clicking one of them again takes it back out, which is what makes
      // a wrong pick correctable without starting over.
      await page.evaluate(() => {
        const two = document.querySelector('[data-editor-check-series="1"]');
        const at = (kind) =>
          two.dispatchEvent(new PointerEvent(kind, { bubbles: true, cancelable: true, shiftKey: true }));
        at('pointerdown');
        at('pointerup');
      });
      const stillAlso = await page.locator('[data-editor-marquee][data-editor-also]').count();
      if (stillAlso !== 0) {
        failures.push(`shift-clicking a picked element again left ${stillAlso} secondary marquees rather than none`);
      }
      const putBack = await page.evaluate(() =>
        Math.round(document.querySelector('[data-editor-check-series="1"]').getBoundingClientRect().width),
      );
      if (Math.abs(putBack - 100) > 2) {
        failures.push(`taking an element out of the series left it at ${putBack}px rather than back at 100px`);
      }
      await page.locator('[data-editor-measure="restore"]').click();
      await page.evaluate(() => {
        for (const element of document.querySelectorAll('[data-editor-check-series]')) element.remove();
      });

      // ---- the two toggles, and the Recording -----------------------------
      //
      // THREE THINGS A BOUNDARY CANNOT SEE, and each of them is a whole feature
      // that would fail silently. `lib/typefit.mjs` and `lib/changes.mjs` are
      // tested at their own bytes; what is asserted here is that the toggles are
      // WIRED — that ticking one changes what the next gesture does, and that a
      // gesture reaches the document the author pastes.
      //
      // Injected elements again, and for the series' own reason: this needs two
      // boxes of a known size with a known text size and nothing else governing
      // either, and naming an element of a composition would make the Check fail
      // the next time somebody chose that number differently.
      //
      // The tree as it stands NOW, and not the measure section's own baseline: that
      // section has legitimately written an Override and a Token since, so what is
      // asserted at the foot of this half is the narrower and stronger thing —
      // three features that touch the page on every frame, and not one byte on disk.
      const untouched = snapshot(root);
      // How many elements the Recording already holds. RELATIVE and not absolute,
      // because the Recording is the SESSION's: every drag, corner and series
      // earlier in this Check is legitimately in it, so an assertion of "two"
      // would be an assertion about how many halves run before this one.
      const recordedBefore = await page.locator('[data-editor-record-row]').count();
      await page.evaluate(() => {
        for (const [at, left] of [
          [0, 420],
          [1, 560],
        ]) {
          const element = document.createElement('div');
          element.dataset.editorCheckFit = String(at);
          element.textContent = 'measured';
          element.style.cssText =
            `position: fixed; left: ${left}px; bottom: 90px; width: 100px; height: 30px; font-size: 10px;`;
          document.body.append(element);
        }
      });
      /** One of the two injected boxes, as the page has it now. */
      const fitBox = (at) =>
        page.evaluate((which) => {
          const element = document.querySelector(`[data-editor-check-fit="${which}"]`);
          return {
            width: Math.round(element.getBoundingClientRect().width),
            size: Math.round(Number.parseFloat(getComputedStyle(element).fontSize)),
          };
        }, at);
      /** Pick one of them, the way a pointer would. */
      const pickFit = (at) =>
        page.evaluate((which) => {
          const element = document.querySelector(`[data-editor-check-fit="${which}"]`);
          for (const kind of ['pointerdown', 'pointerup']) {
            element.dispatchEvent(new PointerEvent(kind, { bubbles: true, cancelable: true }));
          }
        }, at);
      /** Set the primary's width through the row, which is the deliberate half of
       *  the same gesture a corner drag makes. */
      const widen = async (to) => {
        await page.locator('[data-editor-nudge="width"]').fill(String(to));
        await page.locator('[data-editor-nudge="width"]').press('Enter');
      };

      // SCALE TEXT. Off, a resize changes the box and nothing else — which is the
      // half worth asserting first, because a toggle that was on by default would
      // pass every assertion below and change the tool for everybody.
      await pickFit(0);
      await widen(200);
      const unscaled = await fitBox(0);
      if (unscaled.size !== 10) {
        failures.push(
          `resizing with "scale text" off moved the text size to ${unscaled.size}px — off, a resize has to` +
            ' change the box and nothing else',
        );
      }
      await page.locator('[data-editor-measure="restore"]').click();

      await page.locator('[data-editor-toggle="fit"]').check();
      await pickFit(0);
      await widen(200);
      const scaled = await fitBox(0);
      // Twice the width and nothing asked of the height, so the ratio is the
      // width's alone: 10px of type becomes 20px.
      if (Math.abs(scaled.width - 200) > 2 || scaled.size !== 20) {
        failures.push(
          `doubling the width with "scale text" on left the box ${scaled.width}px wide at ${scaled.size}px type` +
            ' — the text has to follow the box by the ratio the box changed by',
        );
      } else {
        notes.push('scaled the text with the box: 100px → 200px took 10px of type to 20px');
      }
      // And the row says so, because the number the author reads is the measured
      // one and not the one that was asked for.
      const typeRow = await page.inputValue(`[data-editor-nudge="text size"]`);
      if (Math.round(Number(typeRow)) !== 20) {
        failures.push(`the text size row reads ${typeRow} after a scaled resize rather than the 20 on the page`);
      }
      // A deliberate scrub of the text size still sets it outright: a toggle that
      // made its own row unusable would be a worse tool than no toggle.
      await page.locator(`[data-editor-nudge="text size"]`).fill('13');
      await page.locator(`[data-editor-nudge="text size"]`).press('Enter');
      const typed = await fitBox(0);
      if (typed.size !== 13) {
        failures.push(
          `scrubbing the text size with "scale text" on left it at ${typed.size}px — the toggle derives a size` +
            ' from a RESIZE, and must never overwrite one the author set',
        );
      }

      // KEEP. Off, picking something else puts the last thing back — the behaviour
      // that has always been there, asserted so the toggle cannot quietly become
      // the only one.
      await pickFit(1);
      const unkept = await fitBox(0);
      if (Math.abs(unkept.width - 100) > 2) {
        failures.push(
          `with "keep" off, picking something else left the first box at ${unkept.width}px — off, letting go` +
            ' has to put it back',
        );
      }

      await page.locator('[data-editor-toggle="keep"]').check();
      await pickFit(0);
      await widen(200);
      await pickFit(1);
      const kept = await fitBox(0);
      if (Math.abs(kept.width - 200) > 2 || kept.size !== 20) {
        failures.push(
          `with "keep" on, picking something else put the first box back to ${kept.width}px at ${kept.size}px` +
            ' — the whole point of the toggle is that a change made stays on the page',
        );
      } else {
        notes.push('kept a change standing while something else was picked');
      }

      // AND PICKING IT AGAIN RESUMES ITS OWN RECORD, which is the assertion this
      // half exists for. Recorded afresh, the row would read "was 200" — the box
      // as this surface had already left it — so a second nudge would report as
      // the whole change and the first would vanish from every document the Editor
      // produces. Resumed, it reads "was 100": one change, from where the page had
      // it before anything was measured.
      await pickFit(0);
      const resumed = (await page.textContent('[data-editor-axis="width"] > small:not([data-editor-offer])')) ?? '';
      if (!resumed.includes('was 100')) {
        failures.push(
          `picking a kept element again reported "${resumed.trim()}" — it has to resume the record it was` +
            ' measured with, or the change it already carries is lost from the read-out and the Recording',
        );
      } else {
        notes.push(`picking a kept element again resumed its measurement (${resumed.trim()})`);
      }

      // THE RECORDING. Both boxes moved, so both are in it — one block each, with
      // the numbers and the sentence that says the type followed the box.
      await pickFit(1);
      await widen(150);
      await page.locator('[data-editor-choose="changes"]').click();
      const recording = await page.inputValue('[data-editor-record]');
      for (const [what, wantedIn] of [
        ['both elements', `${recordedBefore + 2} elements measured`],
        ['the block numbers', '100px'],
        ['what changed', '+100px'],
        ['the axis that moved', 'width'],
        ['the scaled text size', 'followed the box'],
        ['the note that kept measurements compose', 'they COMPOSE'],
        ['the standing caveat', 'not an instruction to hard-code them'],
      ]) {
        if (!recording.includes(wantedIn)) {
          failures.push(
            `the Recording carries no ${what} ("${wantedIn}") — the text is the whole output of the surface,` +
              ' so it has to',
          );
        }
      }
      const blocks = await page.locator('[data-editor-record-row]').count();
      if (blocks !== recordedBefore + 2) {
        failures.push(
          `the Recording listed ${blocks} elements after two more were measured, and held ${recordedBefore}` +
            ' before — every completed gesture has to reach it, and each element only once',
        );
      } else {
        notes.push(`recorded ${blocks} measured elements in ${recording.split('\n').length} lines`);
      }
      // Measuring still writes nothing, toggles and Recording included: the same
      // assertion the drag half makes, made again after three features that each
      // touch the page on every frame.
      for (const [where, was] of snapshot(root)) {
        if (was !== untouched.get(where)) {
          failures.push(`the toggles or the Recording reached ${where} — neither writes to any source`);
        }
      }

      // And the page goes back, which is the only way out of a kept arrangement
      // short of a reload — and a reload would take the Recording with it.
      await page.locator('[data-editor-record-back]').click();
      const restored = await Promise.all([fitBox(0), fitBox(1)]);
      if (restored.some((box) => Math.abs(box.width - 100) > 2 || box.size !== 10)) {
        failures.push(
          `"put the page back" left the boxes at ${restored.map((box) => `${box.width}px/${box.size}px`).join(' and ')}` +
            ' rather than back at 100px/10px',
        );
      } else {
        notes.push('put the page back, and every kept change came off it');
      }
      // The two it put back are off the Recording, and nothing else is: putting a
      // change back is undoing it, and a document that still asked for it would be
      // asking for a change nobody wants — but this button reaches what is STANDING
      // on the page, so anything already put back by hand stays exactly as it was.
      const blocksAfter = await page.locator('[data-editor-record-row]').count();
      if (blocksAfter !== recordedBefore) {
        failures.push(
          `putting the page back left ${blocksAfter} elements in the Recording rather than the ${recordedBefore}` +
            ' that were in it before this half — a change taken off the page has to come off the document too',
        );
      }

      await page.locator('[data-editor-choose="measure"]').click();
      await page.locator('[data-editor-toggle="fit"]').uncheck();
      await page.locator('[data-editor-toggle="keep"]').uncheck();
      await page.evaluate(() => {
        for (const element of document.querySelectorAll('[data-editor-check-fit]')) element.remove();
      });

      // ---- the text a box does not own ------------------------------------
      //
      // THE SHAPE OF EVERY LIST ON THIS PAGE, and the one `scale text` used to do
      // nothing at all for. A box that draws no words itself still has a
      // `font-size` — the one it inherited — so the row always had a number and the
      // toggle always had something to multiply, and both of them wrote a
      // declaration that the elements inside, which declare their own, never read.
      // The Projects Panel's Rail is exactly this, and "resizing it does not make
      // the text bigger" is how it was reported.
      //
      // Injected for the same reason the two boxes above are: this needs a known
      // size on a known rule, and naming an element of a composition would make the
      // Check fail the next time somebody chose that number differently. A
      // stylesheet and not an inline style, because the rule is half of what is
      // being asserted — the size has to be found where the composition declares it.
      await page.evaluate(() => {
        const style = document.createElement('style');
        style.dataset.editorCheckSheet = '';
        style.textContent = '.editor-check-item { font-size: 10px; }';
        document.head.append(style);
        const list = document.createElement('div');
        list.dataset.editorCheckList = '';
        list.style.cssText = 'position: fixed; left: 700px; bottom: 90px; width: 100px; height: 30px;';
        for (const word of ['one', 'two']) {
          const item = document.createElement('span');
          item.className = 'editor-check-item';
          item.textContent = word;
          list.append(item);
        }
        document.body.append(list);
      });
      await page.locator('[data-editor-toggle="fit"]').check();
      await page.evaluate(() => {
        const list = document.querySelector('[data-editor-check-list]');
        for (const kind of ['pointerdown', 'pointerup']) {
          list.dispatchEvent(new PointerEvent(kind, { bubbles: true, cancelable: true }));
        }
      });
      // FIRST THAT THE ROW FOUND IT AT ALL. 16 here is the inherited size the old
      // row showed — a number that governs nothing on the page — and 10 is the size
      // the words are actually drawn at.
      const insideRow = Math.round(Number(await page.inputValue('[data-editor-nudge="text size"]')));
      if (insideRow !== 10) {
        failures.push(
          `the text size row read ${insideRow} on a box that draws no words of its own — it has to read the` +
            ' size the elements inside it are set at, which is 10, and not the one it inherited',
        );
      }
      await widen(200);
      const insideSizes = await page.evaluate(() =>
        [...document.querySelectorAll('.editor-check-item')].map((item) =>
          Math.round(Number.parseFloat(getComputedStyle(item).fontSize)),
        ),
      );
      if (insideSizes.some((size) => size !== 20)) {
        failures.push(
          `doubling a box whose words are set by its items left them at ${insideSizes.join('px, ')}px rather` +
            ' than 20px — the size has to be written where the text actually is, or the toggle moves nothing',
        );
      } else {
        notes.push('scaled the text a box does not own: 100px → 200px took its items from 10px to 20px');
      }
      // AND THE ANNOTATION SAYS WHOSE TEXT IT IS. The pasted text is the deliverable,
      // and one that read as "give this box a font-size" would be asking an agent
      // for a declaration nothing on the page reads.
      await page.locator('[data-editor-measure="annotation"]').click();
      const insideNote = await page.inputValue('[data-editor-annotations]');
      if (!/draws no words itself/.test(insideNote) || !insideNote.includes('.editor-check-item')) {
        failures.push(
          'the Annotation for a box whose text is set by its items does not say so, or does not name the rule' +
            ' it is set by — an agent handed it would write the size back onto the box',
        );
      }
      await page.locator('[data-editor-measure="restore"]').click();
      const insideBack = await page.evaluate(() =>
        [...document.querySelectorAll('.editor-check-item')].map((item) =>
          Math.round(Number.parseFloat(getComputedStyle(item).fontSize)),
        ),
      );
      if (insideBack.some((size) => size !== 10)) {
        failures.push(
          `putting it back left its items at ${insideBack.join('px, ')}px — a size written inside an element` +
            ' has to come off it again with the element it was written for',
        );
      }
      await page.locator('[data-editor-toggle="fit"]').uncheck();
      await page.evaluate(() => {
        for (const element of document.querySelectorAll('[data-editor-check-list], [data-editor-check-sheet]')) {
          element.remove();
        }
      });

      // ---- a box with no size of its own ----------------------------------
      //
      // The Front Screen's column is `flex: 1 1 auto` inside a Section pinned to
      // the fold, so it has no height to drag: an inline one becomes its flex-basis
      // and is grown straight back to the fill. For as long as the surface had
      // nothing to say about that, a corner drag wrote a size, watched the layout
      // discard it, re-measured the box truthfully as unchanged, and reported
      // nothing — "I still cannot make it taller" is what that looks like.
      //
      // NAMED ELEMENTS, WHICH THIS CHECK OTHERWISE AVOIDS. Everything above picks
      // a Section's mount point precisely so it cannot go stale, and this cannot:
      // the gesture is only reachable on a box the composition gives no size, and
      // one has to be found to reach it. `.front-screen__col` is that box, and a
      // rename breaking this Check is the correct outcome — the note it fails with
      // says so.
      //
      // A TOKEN'S PAGE AND ITS FILE ARE TWO ASSERTIONS here as well, split the same
      // way the Timeline half above splits them: the drag must move the page and
      // write nothing, and only the release may reach the file.
      const fillFile = join(to.sections, 'front-screen', 'tokens.css');
      const rhymeIn = (text) => /--front-screen-rhyme:\s*([^;]+);/.exec(text)?.[1]?.trim() ?? null;
      const rhyme = () => rhymeIn(readFileSync(fillFile, 'utf8'));
      const column = () =>
        page.evaluate(() => {
          const col = document.querySelector('.front-screen__col');
          const section = document.querySelector('.front-screen');
          if (!col || !section) return null;
          const box = col.getBoundingClientRect();
          const around = section.getBoundingClientRect();
          return {
            height: Math.round(box.height),
            top: Math.round(box.top - around.top),
            bottom: Math.round(around.bottom - box.bottom),
          };
        });

      const fillWas = rhyme();
      const columnWas = await column();
      if (columnWas === null || fillWas === null) {
        failures.push(
          'no .front-screen__col, or no --front-screen-rhyme declaring its padding — the fill gesture is' +
            ' only reachable on a box the composition gives no size, and this Check needs one to reach it',
        );
      } else {
        await page.locator('[data-editor-choose="measure"]').click();
        // Two pixels inside its left edge, which is the column's own box rather
        // than any of the blocks stacked down it.
        await page.evaluate(() => {
          const col = document.querySelector('.front-screen__col');
          const box = col.getBoundingClientRect();
          const x = Math.round(box.left + 2);
          const y = Math.round(box.top + box.height / 2);
          for (const kind of ['pointerdown', 'pointerup']) {
            col.dispatchEvent(new PointerEvent(kind, { bubbles: true, cancelable: true, clientX: x, clientY: y }));
          }
        });

        // The top left corner, forty pixels up, held rather than let go.
        const grabbed = await page.evaluate(() => {
          const handle = document.querySelector('[data-editor-handle="nw"]');
          if (!handle) return false;
          const box = handle.getBoundingClientRect();
          const x = Math.round(box.left + box.width / 2);
          const y = Math.round(box.top + box.height / 2);
          const at = (kind, cy) =>
            handle.dispatchEvent(new PointerEvent(kind, { bubbles: true, cancelable: true, clientX: x, clientY: cy }));
          at('pointerdown', y);
          at('pointermove', y - 20);
          at('pointermove', y - 40);
          return true;
        });
        if (!grabbed) failures.push('the Measure surface drew no top left corner to drag');

        const holding = await column();
        if (holding.top >= columnWas.top || holding.height <= columnWas.height) {
          failures.push(
            `dragging the column's top corner up moved nothing: its top margin is ${holding.top}px against` +
              ` ${columnWas.top}px and it is ${holding.height}px tall against ${columnWas.height}px. A box` +
              ' with no size of its own has to drag the padding around it, or the gesture writes a style the' +
              ' layout discards',
          );
        }
        // The BOTTOM margin too, and it is the assertion that says the Token was
        // what moved rather than an inline style on the box: one number is both of
        // the Section's paddings, through --front-screen-cut-gap.
        if (holding.bottom >= columnWas.bottom) {
          failures.push(
            `closing the column's top margin left its bottom one at ${holding.bottom}px — the padding is` +
              ' declared as one Token that both ends read, so moving it has to move both',
          );
        }
        if (rhyme() !== fillWas) {
          failures.push(
            `dragging wrote ${fillFile.split(sep).pop()} before it was let go of — a drag previews through` +
              ' the Tokens surface’s own sheet, and only a release reaches a file',
          );
        }

        await page.evaluate(() => {
          const handle = document.querySelector('[data-editor-handle="nw"]');
          const box = handle.getBoundingClientRect();
          handle.dispatchEvent(
            new PointerEvent('pointerup', {
              bubbles: true,
              cancelable: true,
              clientX: Math.round(box.left + box.width / 2),
              clientY: Math.round(box.top + box.height / 2),
            }),
          );
        });
        await holds(page, () => rhyme() !== fillWas);
        const wrote = rhyme();
        if (wrote === fillWas) {
          failures.push('letting go of a fill wrote nothing — the padding moved on the page and not in its file');
        } else if (/var\(/.test(wrote) || !/clamp\(/.test(wrote)) {
          // Scaled term by term rather than restated: clamp is positively
          // homogeneous, so one ratio across all three terms is the same
          // relationship at a different magnitude with its breakpoints in the same
          // places. A restatement would have replaced it with a single length.
          failures.push(
            `--front-screen-rhyme was written as "${wrote}" — a clamp has to come back a clamp, scaled term` +
              ' by term, or the gesture has flattened a relationship into a length',
          );
        } else {
          notes.push(`a box with no height of its own dragged its padding: ${fillWas} → ${wrote}`);
        }

        // AND THE CORNER WHOSE PADDING IT MAY NOT WRITE REFUSES, out loud. The
        // Section's bottom padding is a calc of two Tokens, so there is no single
        // number to move — and a gesture that silently did nothing there is the
        // failure this whole block is about, one corner along.
        const beforeRefusal = rhyme();
        await page.evaluate(() => {
          const handle = document.querySelector('[data-editor-handle="sw"]');
          if (!handle) return;
          const box = handle.getBoundingClientRect();
          const x = Math.round(box.left + box.width / 2);
          const y = Math.round(box.top + box.height / 2);
          const at = (kind, cy) =>
            handle.dispatchEvent(new PointerEvent(kind, { bubbles: true, cancelable: true, clientX: x, clientY: cy }));
          at('pointerdown', y);
          at('pointermove', y + 40);
          at('pointerup', y + 40);
        });
        await page.waitForTimeout(200);
        const refusal = (await page.textContent('[data-editor-said]')) ?? '';
        if (!/cannot be written/.test(refusal)) {
          failures.push(
            `dragging a corner whose padding is built out of two Tokens said "${refusal.trim().slice(0, 120)}"` +
              ' — it has to say it cannot write that one, or the gesture fails silently again',
          );
        }
        if (rhyme() !== beforeRefusal) {
          failures.push('a refused fill wrote a Token anyway — the refusal is the whole of what it may do');
        }
      }

      await page.locator('[data-editor-choose="content"]').click();

      // Publishing is off for this Check, and it has to say so rather than run.
      const publish = await fetch(`${served.origin}/__editor/publish`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-editor': '1' },
        body: '{}',
      });
      if (publish.ok) failures.push('the Editor published from inside a Check — canPublish was ignored');

      // A page in another tab must not be able to write to this.
      const drive = await fetch(`${served.origin}/__editor/content`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ section, key: field, value: 'from somewhere else' }),
      });
      if (drive.ok) {
        failures.push('the Editor accepted a write with no handshake header — any page in any tab could edit the repository');
      }

      if (record.thrown.length > 0) failures.push(`the Editor threw: ${record.thrown.join(' / ')}`);
    } finally {
      await context?.close();
      await served?.close();
      // The real files, asserted rather than assumed: this Check runs from the
      // pre-commit hook, and one that quietly edited the tree it was gating
      // would be the worst possible failure in this suite.
      for (const [where, was] of originals) {
        if (readFileSync(join(repoRoot, where), 'utf8') !== was) {
          failures.push(`this Check changed ${where.split(sep).join('/')} — it must only ever write to its copy`);
        }
      }
      rmSync(root, { recursive: true, force: true });
    }

    return { failures, notes };
  },
};
