import { open, settle } from '../lib/page.mjs';

/**
 * Every face the Kernel declares actually loads.
 *
 * ASKED FOR RATHER THAN OBSERVED, and that is the whole mechanism here. A browser
 * only fetches the faces the page currently sets type in, so reading
 * `document.fonts` after load finds most of them `unloaded` on a healthy page —
 * a Check written that way would fail a working tree, and one that only counted
 * the loaded ones would pass a tree where five of the six files are missing. So
 * each declared face is asked to load and the fetch is what is asserted.
 *
 * This is the Check that catches a renamed woff2, a face declared with a path
 * that Vite could not fingerprint, and the whole `/fonts` tree going missing from
 * the assembled dist.
 */
export const check = {
  name: 'faces',
  title: 'every declared face loads',

  /** @param {{ browser: import('playwright').Browser, origin: string }} ctx */
  async run({ browser, origin }) {
    const { context, page } = await open(browser, origin);
    try {
      await settle(page);

      const result = await page.evaluate(async () => {
        const declared = [...document.fonts].map((face) => ({
          family: face.family,
          weight: face.weight,
          style: face.style,
        }));

        /** @type {{ face: string, why: string }[]} */
        const broken = [];
        for (const face of document.fonts) {
          const named = `${face.family} ${face.weight} ${face.style}`;
          try {
            await face.load();
            if (face.status !== 'loaded') broken.push({ face: named, why: `status is ${face.status}` });
          } catch (error) {
            broken.push({ face: named, why: String(error?.message ?? error) });
          }
        }

        // The families the Kernel's face Tokens name first. A face Token whose
        // first family is not one of the declared ones is a typo that leaves the
        // page silently on the fallback.
        const tokens = ['body', 'label', 'lead', 'year', 'panel'].map((token) => {
          const value = getComputedStyle(document.documentElement)
            .getPropertyValue(`--face-${token}`)
            .trim();
          return { token: `--face-${token}`, first: (value.split(',')[0] ?? '').replace(/['"]/g, '').trim() };
        });

        return { declared, broken, tokens };
      });

      /** @type {string[]} */
      const failures = result.broken.map(({ face, why }) => `${face} did not load — ${why}`);

      if (result.declared.length === 0) {
        failures.push('the page declares no @font-face at all — faces.css did not arrive');
      }

      const families = new Set(result.declared.map((face) => face.family));
      for (const { token, first } of result.tokens) {
        if (first.length === 0) {
          failures.push(`${token} is empty — the Kernel's face Tokens did not arrive`);
        }
      }

      // A Token naming a family nothing declares is a page on the fallback. Not a
      // failure on its own — `--face-lead` is Georgia on purpose — so it is only
      // a failure when NO Token reaches a declared family, which is the shape of
      // faces.css having been renamed out from under the Tokens.
      if (families.size > 0 && !result.tokens.some(({ first }) => families.has(first))) {
        failures.push(
          `no face Token names a declared family — declared: ${[...families].join(', ')}; ` +
            `Tokens name: ${result.tokens.map(({ first }) => first).join(', ')}`,
        );
      }

      return failures;
    } finally {
      await context.close();
    }
  },
};
