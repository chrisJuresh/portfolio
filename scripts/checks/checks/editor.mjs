import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';

import { EMPTY, PROPERTIES, parse as parseOverrides } from '../../editor/lib/overrides.mjs';
import { OVERRIDES, discover, discoverBakes, discoverKernel } from '../../editor/lib/sections.mjs';
import { start } from '../../editor/server.mjs';
import { PAGE, open } from '../lib/page.mjs';

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
 * IT DOES NOT SETTLE THE PAGE, which is the one place this Check disagrees with
 * every other one. `settle()` exists because a Section mounts on approach, so its
 * TIMELINE is not there at load — but the markup and every word in it are
 * prerendered and present immediately, and the Editor binds to words. Scrolling
 * the document first would assert nothing extra and would move the element this
 * Check is about to click.
 */

const MARKER = 'Edited by the smoke Check';

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
  title: 'the Editor changes a word and drags a Token, on the real page and in the file',

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
          failures.push(`the marquee has no ${corner} handle — that corner cannot be dragged at all`);
          continue;
        }
        const { before, after } = dragged;
        if (Math.abs(before.width - after.width - 40) > 2 || Math.abs(before.height - after.height - 25) > 2) {
          failures.push(
            `dragging the ${corner} corner inwards by 40x25 took ${before.width - after.width}x` +
              `${before.height - after.height} off the box`,
          );
        }
        const drifted = anchors[corner].filter((edge) => Math.abs(after[edge] - before[edge]) > 2);
        if (drifted.length > 0) {
          failures.push(
            `dragging the ${corner} corner moved the ${anchors[corner].join(' and ')} of the box` +
              ` (${drifted.map((edge) => `${edge} ${before[edge]} → ${after[edge]}`).join(', ')}) — the corner` +
              ' opposite the one being dragged is the anchor and does not move',
          );
        } else {
          cornered.push(corner);
        }
        await page.locator('[data-editor-measure="restore"]').click();
      }
      if (cornered.length === 4) notes.push(`resized by dragging all four corners (${cornered.join(', ')})`);
      await page.locator('[data-editor-choose="content"]').click();
      await page.evaluate(() => document.getElementById('editor-check-corners')?.remove());
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

        await page.evaluate(() => document.getElementById('editor-check-governs')?.remove());
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
