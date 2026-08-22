import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { PAGE, start } from '../../editor/server.mjs';
import { discover } from '../../editor/lib/sections.mjs';

/**
 * The Editor, driven end to end: open it, click a piece of text, change it, and
 * find the change in the file.
 *
 * ONE SMOKE CHECK AND NO MORE, on purpose. #129's testing decisions put the
 * Editor's tests at its write boundary — `scripts/editor/lib/*.test.mjs`, which
 * assert the bytes — because that is where a bug corrupts a source file, and
 * driving a browser is both slower and flakier than the thing it would be
 * asserting. What the boundary cannot see is whether the surface is WIRED to it:
 * whether a click reaches a key, whether a refusal comes back as a refusal,
 * whether the page follows. That is this Check, and it is the whole of it.
 *
 * IT WRITES TO A COPY. The Editor takes the Sections root it is given, so this
 * hands it a temporary copy of every Section's Content and asserts on those
 * bytes. Nothing under `src/` is touched — which matters more than it sounds,
 * because this Check runs from the pre-commit hook, and a Check that edited the
 * tree it was gating would put a file it wrote into the commit it was checking.
 * The real files are compared before and after anyway: a Check nobody can be sure
 * about is worse than none.
 *
 * IT DOES NOT SETTLE THE PAGE, which is the one place this Check disagrees with
 * every other one. `settle()` exists because a Section mounts on approach, so its
 * TIMELINE is not there at load — but the markup and every word in it are
 * prerendered and present immediately, and the Editor binds to words. Scrolling
 * the document first would assert nothing extra and would move the element this
 * Check is about to click.
 */

const MARKER = 'Edited by the smoke Check';

/** Copy every Section's Content into a temporary tree of the same shape. */
function copyContent(repoRoot) {
  const from = join(repoRoot, 'src', 'sections');
  const to = mkdtempSync(join(tmpdir(), 'editor-check-'));
  const originals = new Map();
  for (const section of discover(from)) {
    mkdirSync(join(to, section), { recursive: true });
    cpSync(join(from, section, 'content.ts'), join(to, section, 'content.ts'));
    originals.set(section, readFileSync(join(from, section, 'content.ts'), 'utf8'));
  }
  return { from, to, originals };
}

export const check = {
  name: 'editor',
  title: 'the Editor changes a word on the real page, and in the file',

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

    const { from, to, originals } = copyContent(repoRoot);
    let served;
    let context;
    try {
      served = await start({ dist, sectionsRoot: to, repoRoot, canPublish: false });
      context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();

      /** @type {string[]} */
      const thrown = [];
      page.on('pageerror', (error) => thrown.push(String(error?.message ?? error)));

      await page.goto(served.origin + PAGE, { waitUntil: 'load' });
      await page.waitForSelector('aside[data-editor]', { timeout: 15_000 });

      const bound = await page.$$eval('[data-editor-bound]', (elements) =>
        elements.map((element) => element.dataset.editorKey),
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
      // keeps this Check from failing the day a Section's words change.
      const key = bound[0];
      const [section, ...rest] = key.split('.');
      const field = rest.join('.');
      const element = page.locator(`[data-editor-key="${key}"]`).first();
      const before = (await element.textContent()) ?? '';

      await element.click();
      await page.keyboard.press('ControlOrMeta+A');
      await page.keyboard.type(MARKER);
      await page.keyboard.press('Enter');
      await page.waitForFunction(
        (wanted) => document.querySelector('[data-editor-said]')?.textContent?.includes(wanted),
        'wrote',
        { timeout: 10_000 },
      ).catch(() => {});

      const after = ((await element.textContent()) ?? '').trim();
      if (after !== MARKER) {
        failures.push(`clicking ${key} and typing did not change the page — it still reads "${after}"`);
      }

      const written = readFileSync(join(to, section, 'content.ts'), 'utf8');
      if (!written.includes(MARKER)) {
        failures.push(`${key} was typed on the page and is not in ${section}/content.ts — the surface is not reaching the boundary`);
      }
      const was = originals.get(section) ?? '';
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
      await page.waitForFunction(
        () => document.querySelector('[data-editor-said]')?.hasAttribute('data-editor-bad'),
        undefined,
        { timeout: 10_000 },
      ).catch(() => {});

      const said = (await page.textContent('[data-editor-said]')) ?? '';
      if (!said.startsWith('refused')) {
        failures.push(`an empty value was not refused — the Editor said "${said}"`);
      }
      const stillThere = readFileSync(join(to, section, 'content.ts'), 'utf8');
      if (!stillThere.includes(MARKER) || stillThere !== written) {
        failures.push(`a refused value reached ${section}/content.ts — it must be refused before anything is written`);
      }
      notes.push(`refused an empty ${key}, and the file did not move`);

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

      if (thrown.length > 0) failures.push(`the Editor threw: ${thrown.join(' / ')}`);
    } finally {
      await context?.close();
      await served?.close();
      // The real files, asserted rather than assumed: this Check runs from the
      // pre-commit hook, and one that quietly edited the tree it was gating
      // would be the worst possible failure in this suite.
      for (const [section, was] of originals) {
        if (readFileSync(join(from, section, 'content.ts'), 'utf8') !== was) {
          failures.push(`this Check changed src/sections/${section}/content.ts — it must only ever write to its copy`);
        }
      }
      rmSync(to, { recursive: true, force: true });
    }

    return { failures, notes };
  },
};
