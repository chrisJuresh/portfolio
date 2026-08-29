/**
 * The Slab — the still of the Eater map the Cards lie on.
 *
 * ALL THIS FILE DOES IS SAY WHERE THE PICTURE IS AND WHAT SHAPE IT IS, and the
 * reason it is a module rather than three attributes in the markup is that the
 * component and the composition would otherwise each carry their own copy of the
 * same three numbers. `clip.ts` in the Projects Panel is the same arrangement for
 * the same reason.
 *
 * Every number here comes off ONE run of `design/eater-slab/capture-slab.mjs`,
 * and the script prints all of them at the end of a run. Re-capturing means
 * pasting them back — there is nothing to derive, and nothing that can be
 * derived: the file is laid into `dist/` rather than built, so no build step
 * ever looks inside it.
 */

/**
 * Where the Slab's bytes are, and one of four lines in the tree that know.
 * `src/kernel/corners.ts`, the Front Screen's photographs and the Panel's
 * recording are the others. `/portfolio/img/` is not built by anything: it is
 * laid into dist/ beside the document by scripts/assemble-dist.mjs.
 */
const SLAB_BASE = '/portfolio/img/eater/';

/**
 * A digest of the file, appended to the URL.
 *
 * Load-bearing rather than tidy, and the same job the recording's stamp does in
 * the Projects Panel: the deployment caches `/portfolio/img/` for a day, so a
 * re-captured Slab that kept this URL is a Slab nobody is served. `capture-slab.mjs`
 * prints the value to put here as the last line of a run.
 */
const VERSION = '?v=04642f38';

/**
 * The picture, and the phone it is a picture of.
 *
 * `pixels` is the file's own size, and goes on the element as `width`/`height`
 * so the box has an intrinsic ratio before a byte has decoded. `viewport` is the
 * window Eater was driven at — `viewport.deviceScaleFactor` times it IS `pixels`
 * — and it is the one that matters to the composition, because it is the
 * coordinate system the app drew in and therefore the one the Cards were
 * measured in. The Section divides the Slab's drawn width by it to get the scale
 * everything on the plane is drawn at; NOTES.md carries that arithmetic.
 */
export const SLAB = {
  src: `${SLAB_BASE}slab.webp${VERSION}`,
  pixels: { width: 786, height: 1704 },
  viewport: { width: 393, height: 852 },
} as const;
