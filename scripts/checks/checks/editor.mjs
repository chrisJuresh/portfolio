import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';

import { discover, discoverBakes, discoverKernel } from '../../editor/lib/sections.mjs';
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
 * THREE FAMILIES NOW, not one: a Section's two files, one Tokens file per part of
 * the Kernel, and a Bake's recipe and parameters. Every one of them is a file the
 * Editor writes, so every one of them has to be copied — a Check that let the
 * real tree be written would put a file it wrote into the commit it was gating.
 * The originals are read here and compared at the end.
 */
function copySources(repoRoot) {
  const from = { sections: join(repoRoot, 'src', 'sections'), kernel: join(repoRoot, 'src', 'kernel'), bakes: join(repoRoot, 'design', 'bake') };
  const root = mkdtempSync(join(tmpdir(), 'editor-check-'));
  const to = { sections: join(root, 'sections'), kernel: join(root, 'kernel'), bakes: join(root, 'bakes') };
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

  return { repoRoot, root, to, originals };
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
