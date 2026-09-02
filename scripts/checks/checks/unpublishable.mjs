import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PATTERNS, localPatterns, scan } from '../lib/denylist.mjs';
import { open, settle } from '../lib/page.mjs';

/**
 * Nothing the page draws says anything the employment record marks as
 * unpublishable.
 *
 * READ OFF THE BUILT PAGE, and off every Section that mounted, rather than out of
 * the source. The words reach a Section as Content, and Content is data — so a
 * term can be introduced in `content.ts`, in a Variant, or in an asset's alt
 * text, and the only place all three meet is the rendered document. Every Section
 * is mounted before the grep for exactly that reason.
 *
 * AND THE RAIL, WHICH IS NOT A SECTION. It was two Sections' Content until #192
 * and is the Kernel's now, standing outside every `[data-section]` on the page —
 * so a scan of the Sections alone would quietly stop reading the one list on the
 * page that names things by name. It is the only element outside a Section that
 * draws Content, which is why this is two attributes and not "the whole
 * document": the Shell holds no composition, and its head is a different question
 * with no Check.
 *
 * The attributes are read as well as the text: a name in an `alt` or an
 * `aria-label` is read aloud to a screen reader and is invisible to a person
 * looking at the page, which makes it the version of this failure nobody notices.
 *
 * The denylist is in ../lib/denylist.mjs, and it is shapes rather than names —
 * a list of the actual names would put every one of them in a public repository.
 * The names go in `denylist.local.txt` beside it, which `.gitignore` keeps out.
 */

/** Attributes whose value is read to somebody even though it is not on screen. */
const SPOKEN = ['alt', 'title', 'aria-label', 'aria-description', 'aria-roledescription'];

export const check = {
  name: 'unpublishable',
  title: 'nothing the page draws says anything the record marks unpublishable',

  /** @param {{ browser: import('playwright').Browser, origin: string, repoRoot: string }} ctx */
  async run({ browser, origin, repoRoot }) {
    const localFile = join(repoRoot, 'scripts', 'checks', 'lib', 'denylist.local.txt');
    let local = [];
    let localNote = 'denylist.local.txt is not present — shapes only';
    try {
      const terms = localPatterns(readFileSync(localFile, 'utf8'));
      local = terms;
      localNote = `denylist.local.txt adds ${terms.length} term(s)`;
    } catch {
      // Absent is the ordinary state on a fresh clone and not a failure: the
      // shapes below stand on their own, and the file is the author's own.
    }
    const patterns = [...PATTERNS, ...local];

    const { context, page } = await open(browser, origin);
    try {
      /** @type {string[]} */
      const failures = [...(await settle(page))];

      const said = await page.evaluate((spoken) => {
        return [...document.querySelectorAll('[data-section], [data-rail]')].map((root) => {
          const attributes = [];
          for (const element of [root, ...root.querySelectorAll('*')]) {
            for (const name of spoken) {
              const value = element.getAttribute(name);
              if (value) attributes.push(`${name}="${value}"`);
            }
          }
          // ONE LINE PER TEXT NODE, and not `root.textContent`. textContent
          // concatenates adjacent elements with nothing between them, so a
          // heading ending in a name and a paragraph beginning with a capital
          // arrive as one word — "HoldingsA Section" — and a denylist term at an
          // element boundary is then invisible to a whole-word match. It also
          // manufactures words that were never on the page, which is the same
          // failure pointing the other way. This cost a wrong diagnosis: the
          // patterns were right and the haystack was wrong.
          const lines = [];
          const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
          for (let node = walk.nextNode(); node !== null; node = walk.nextNode()) {
            const line = (node.nodeValue ?? '').replace(/\s+/g, ' ').trim();
            if (line.length > 0) lines.push(line);
          }
          return {
            section: root.dataset.section ?? (root.hasAttribute('data-rail') ? 'the Rail' : '(unnamed)'),
            rail: root.hasAttribute('data-rail'),
            text: lines.join('\n'),
            attributes: attributes.join('\n'),
          };
        });
      }, SPOKEN);

      const sections = said.filter((one) => !one.rail).length;
      if (sections === 0) {
        failures.push('no Section mounted, so no Section text was read — nothing was checked');
      }
      if (said.length === sections) {
        failures.push('no [data-rail] on the page — the one list of words outside a Section went unread');
      }

      for (const { section, text, attributes } of said) {
        for (const [where, haystack] of [
          ['text', text],
          ['a spoken attribute', attributes],
        ]) {
          for (const hit of scan(haystack, patterns)) {
            failures.push(
              `${section}: ${where} contains "${hit.match}" — ${hit.why} [${hit.name}]\n` +
                `              in: ${quote(lineAt(haystack, hit.at))}`,
            );
          }
        }
      }

      return {
        failures,
        notes: [`${sections} Section(s) and ${said.length - sections} Rail read; ${localNote}`],
      };
    } finally {
      await context.close();
    }
  },
};

/** The one line the hit is on, so the failure says where in the Section to look. */
function lineAt(haystack, at) {
  const start = haystack.lastIndexOf('\n', at) + 1;
  const end = haystack.indexOf('\n', at);
  return haystack.slice(start, end === -1 ? undefined : end);
}

function quote(line) {
  return `"${line.length > 90 ? `${line.slice(0, 90)}…` : line}"`;
}
