/* ============================================================================
   pictures.mjs — every picture a Section is made of, arrived and decoded.

   ONE SPELLING, READ BY BOTH SHEETS. `render-variants.mjs` and
   `render-stages.mjs` both photograph a Section of the real page, so both meet
   the same race and both have to refuse the same way — and two copies of a wait
   is how two tools come to disagree about whether a picture is there. It is the
   argument scripts/variant-sheet.mjs already makes about one parser for
   variants.css, at a smaller scale.

   `fail` is the caller's, because a refusal has to name the command the author
   ran. Everything else here is #185's, moved rather than rewritten.
   ========================================================================== */

/** How long one Section's pictures are given before the run is called off.
 *  Not a network budget: the server is on the loopback and the files are on the
 *  same disk. It is long enough that a slow decode is never reported as a broken
 *  asset, and short enough that a broken asset is not left looking like a slow
 *  decode. A picture that has already failed is answered at once, below, and
 *  never waits for this. */
const PICTURES_MS = 15_000;

/* Every picture the Section is made of, fetched AND DECODED, before anything is
   shot — and a refusal rather than a shot if one never arrives.

   The Slab the Eater Map's Exploded View is composed on is `loading="lazy"
   decoding="async"`, and rightly so: a quarter of a megabyte that arrives as the
   reader comes down the page. Neither of those is part of `load` or of
   `document.fonts.ready`, so settling returned with the fetch that scrolling had
   just started still in flight, and one shot in thirty-six came back as three
   Cards over bare ground. Nothing downstream would have caught it: the digest
   compares a Variant against `unselected` in its own group, and a picture that
   is missing differs from it, so the sheet captioned it as a normal render. The
   only signal was the byte count — 111 KB against 156 KB for every sibling.

   THAT IS THIS TOOL'S WORST FAILURE MODE, which is why it is a refusal and not a
   retry. The sheet exists so that a direction is chosen by LOOKING, so a picture
   missing a composition's largest element does not read as a dropped frame: it
   reads as a broken Variant. The losing Variants are then kept as the record of
   a judgement made against something that was never true. A refusal costs a run.

   IT PROMOTES EVERY PICTURE TO EAGER FIRST, which is the decision STILL is and
   is made for the same reason — two shots of one Variant should differ only
   where the Variant does. A Section is taller than a screen and `--full` shoots
   all of it, so waiting on a lazy picture that is still below the fold would
   hang on a page that is behaving perfectly. Loading them removes the race
   rather than narrowing it, and load order is not a thing any Variant is judged
   on.

   ONLY <img>. A picture a Variant reaches for through `background-image` is not
   covered, because there is nothing to ask: CSS gives no per-element load state.
   Every picture on a Section today is an element.

   IT IS ASKED TWICE, AND THE SECOND ONE IS THE ONE THAT IS LOAD-BEARING. Once in
   settle(), which is what starts a lazy fetch early and ends the run on a broken
   asset before a single file has been written; and once per moment, after the
   Timeline has been scrubbed and immediately before the shot. The reason for the
   second is that settling is not the state that gets photographed: the Eater
   Map's markup RESTS RAISED (#177), so seeking to progress 0 changes the Slab's
   drawn box from 361x535 to 282x612 — the picture is re-rastered at a size it
   was not decoded at, in the window between the seek and the shutter. Every
   missing-Slab shot ever seen, the reported one and the one reproduced here, was
   at progress 0 and none was at 1, which is the half of the matrix that needs no
   resize. Honestly: the load half is proven — holding the Slab back by a second
   and a half shot 112 KB without this wait and 160 KB with it — while the resize
   half is reasoning from where the failures fell. It has not been reproduced
   against a settle-time-only wait in 180 further shots. A second call is a
   decode() on an already-decoded picture, which is close to free, so it is asked
   where the answer has to be true rather than where it is cheapest. */
export async function pictures(page, section, fail) {
  const missing = await page.evaluate(
    async ([name, ms]) => {
      const root = document.querySelector(`[data-section="${name}"]`);
      const images = [...root.querySelectorAll('img')];
      for (const image of images) image.loading = 'eager';
      const named = (image) => image.currentSrc || image.getAttribute('src') || '(no src)';
      const settled = await Promise.all(
        images.map(async (image) => {
          try {
            if (!image.complete) {
              await new Promise((arrived, no) => {
                const giveUp = setTimeout(() => no(new Error(`gave up after ${ms / 1000}s`)), ms);
                const once = (then) => () => {
                  clearTimeout(giveUp);
                  then();
                };
                image.addEventListener('load', once(arrived), { once: true });
                image.addEventListener('error', once(() => no(new Error('the request failed'))), { once: true });
              });
            }
            // `complete` with no intrinsic width is a picture that FAILED rather
            // than one that arrived, and the two are worth telling apart: this
            // answers by its src at once instead of by a timeout that would read
            // as a slow disk.
            if (image.naturalWidth === 0) throw new Error('the request failed');
            // decode() is the difference between the bytes being here and the
            // next paint having the picture in it, which is the whole race.
            await image.decode();
            return null;
          } catch (error) {
            return `${named(image)} — ${error.message}`;
          }
        }),
      );
      return settled.filter(Boolean);
    },
    [section, PICTURES_MS],
  );
  if (missing.length === 0) return;
  fail(
    `${missing.length} picture(s) of the ${section} Section never arrived, so nothing was shot:\n` +
      missing.map((one) => `  ${one}`).join('\n') +
      '\n  A shot taken without them would read as a broken Variant rather than a broken run,\n' +
      '  which is why this stops. Check that `pnpm build` and scripts/assemble-dist.mjs put the\n' +
      '  file into dist/, and that the Section still points at it.',
  );
}
