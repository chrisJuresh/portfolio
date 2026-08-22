/**
 * The recording inside the Frame — the photo vault's grid, scrolling — and the
 * copy of it lying in the marble.
 *
 * ALL THIS FILE DOES IS GIVE THE `<video>`s THEIR SOURCES, and that is the whole
 * design rather than an implementation detail. The elements are in the markup
 * with a poster and no source at all, so:
 *
 *   * a reader who asks for reduced motion gets the poster and NOTHING IS
 *     FETCHED — not a range request, not a metadata probe. The setting is asked
 *     to save bandwidth as well as movement, and the only way to honour that is
 *     to never name the file. A CSS rule cannot do it, and nor can
 *     `preload="none"`, which still fetches the moment it plays.
 *   * a browser that never runs this module — blocked script, a chunk that did
 *     not arrive — gets the same poster rather than a black rectangle, which is
 *     the stance every other script in this Section takes.
 *
 * `<source media="…">` is in the resource selection algorithm and would do the
 * first of those declaratively — but only for a browser that honours it, and one
 * that does not fetches both files with nothing in the page able to find out
 * that it did. So the query is asked here, where the answer can be acted on, AND
 * written onto each `<source>`: two independent refusals rather than one, on the
 * criterion where a single point of failure costs a reader bandwidth they asked
 * not to spend.
 *
 * The setting is read once. A reader who changes it mid-visit is not chased —
 * the preference is about how a page behaves when it arrives.
 *
 * THERE ARE TWO OF THEM, AND THE SECOND IS THE REFLECTION. `mirror.ts` clones
 * the whole window into the stone, so the copy contains a second clip, and it is
 * this file that decides whether either of them ever fetches anything. That is
 * the point of serving all of them from one place rather than teaching the
 * mirror to fetch: the refusal above is written once and covers the reflection
 * without knowing it exists, so the marble freezes with the poster because there
 * was never a decision to get wrong.
 *
 * WHY A SECOND ELEMENT RATHER THAN A CANVAS FED FROM THE FIRST. Painting frames
 * out of one video into a canvas would be one decode instead of two — and a
 * `requestAnimationFrame` loop for as long as the page is open, which is exactly
 * the per-frame cost the rest of this Section is built without. Two elements on
 * one URL is a second decode and no script running at all between the two
 * corrections below; the compositor draws the reflection for free because it is
 * drawing the copy anyway.
 */

/**
 * Where the recording's bytes are, and one of the three lines in `/next` that
 * point at the old tree — `src/kernel/corners.ts` and the Front Screen's
 * photographs are the others. The files are still the ones `/portfolio` serves,
 * because `/next` is not replacing it yet; the ticket that flips the route moves
 * the bytes and changes this constant.
 */
const RECORDING_BASE = '/portfolio/video/';

/**
 * The content stamp every file of the recording carries.
 *
 * Load-bearing rather than tidy: the deployment caches `/portfolio/video/` as
 * immutable, so a re-cut clip that kept these URLs would be served from cache
 * for a year. Re-cutting the clip means changing this — design/censor/README.md
 * says so where the recording is made.
 *
 * It is written by hand here where the Plinth's plate needs no digest at all,
 * and the difference is what the build can SEE: a `url()` in a stylesheet is
 * fingerprinted for us, and these URLs are assembled in script, where nothing
 * can. `src/kernel/corners.ts` carries its own for the same reason.
 *
 * It is a module constant and not Content, for the same reason `LADDER_VERSION`
 * in the Kernel is: the Editor's business is a word the author chose, and this is
 * a digest a tool prints. Nothing here is authored.
 */
const VERSION = '?v=21f8d5ea';

/**
 * The still the window shows before — and instead of — the recording.
 *
 * Exported because the `poster` attribute is in the markup, where the element
 * is: this module and the component name one URL between them rather than two
 * that have to be kept equal.
 */
export const POSTER = `${RECORDING_BASE}photos-grid.webp${VERSION}`;

/**
 * The recording's own pixels, on the element as `width`/`height`.
 *
 * `record`'s viewport, and the geometry design/censor/roll.json was assembled
 * at, so it is not free to move: change it and the clip passes over photographs
 * nobody reviewed. On the element it is an intrinsic ratio for the layout to use
 * before a frame has decoded, which is what stops the box collapsing under the
 * poster.
 */
export const RECORDING = { width: 1440, height: 900 } as const;

/** WebM first: it is a fifth of the MP4's bytes at the quality `record` encodes
 *  both at, so every browser that can take it should. */
const SOURCES = [
  { src: `${RECORDING_BASE}photos-grid.webm${VERSION}`, type: 'video/webm' },
  { src: `${RECORDING_BASE}photos-grid.mp4${VERSION}`, type: 'video/mp4' },
] as const;

/**
 * How far the reflection is allowed to drift before it is put back, in seconds.
 *
 * Generous on purpose: the copy is cut to a thirtieth of the window's height, so
 * a frame or two of lag is a smear that is a frame or two old and nobody can see
 * it — while `currentTime =` is a seek, and a seek every tick to chase a
 * difference nobody can see would cost more than the drift does. A tenth of a
 * second is about three frames of the clip.
 */
const DRIFT = 0.1;

/** The media query both refusals are written from. */
const STILL = '(prefers-reduced-motion: reduce)';

function serve(clip: HTMLVideoElement): void {
  for (const { src, type } of SOURCES) {
    const source = document.createElement('source');
    source.src = src;
    source.type = type;
    /* Belt and braces with the check in `mountClip`: a browser that honours this
       cannot be talked into fetching by a stale matchMedia answer either. */
    source.media = '(prefers-reduced-motion: no-preference)';
    clip.appendChild(source);
  }

  /* Selection has already ended in failure by now — the element was parsed with
     no source — so appending is not enough on its own. load() restarts it. */
  clip.load();

  /* Autoplay is the attribute's job, and it is left to do it. This only catches
     the browsers that hand back a rejected promise instead: the poster stays up,
     which is the same still the reduced-motion reader gets, so there is nothing
     to repair and nothing to report. */
  void clip.play().catch(() => {});
}

/**
 * Hand every recording on the page its sources, unless the reader asked for
 * stillness.
 *
 * Nothing here is required for the Frame to render, and this returning early is
 * the same outcome as it never being called.
 */
export function mountClip(): void {
  const clips = [...document.querySelectorAll<HTMLVideoElement>('.projects-panel__clip')];
  if (clips.length === 0) return;
  if (window.matchMedia?.(STILL).matches) return;

  const [lead, ...followers] = clips;
  if (!lead) return;
  serve(lead);
  if (followers.length === 0) return;

  /* THE FOLLOWERS ARE SERVED LATE, AND THAT IS THE WHOLE OF WHY THIS IS NOT A
     LOOP. Both elements name the same URL, and two media elements asking for one
     URL at the same instant are not reliably coalesced into one request — the
     spec does not require it and engines differ, so the honest worst case is the
     clip fetched twice on a cold visit. Waiting for the lead's first frame means
     the response is in the HTTP cache before the copy asks for it, which turns
     the second fetch into a cache hit on every engine.
     What it costs is that the marble is a still for as long as the clip takes to
     start, and then catches up. That is the right way round: the reflection is
     the thing that may arrive late, not the window. */
  const follow = (): void => {
    for (const clip of followers) {
      serve(clip);
      clip.currentTime = lead.currentTime;
      /* `timeupdate` fires about four times a second, which is the cheapest
         clock in the element and far more often than the drift needs. Nothing
         here runs between ticks. */
      lead.addEventListener('timeupdate', () => {
        if (Math.abs(clip.currentTime - lead.currentTime) > DRIFT) {
          clip.currentTime = lead.currentTime;
        }
      });
    }
  };

  if (lead.readyState >= 2) follow();
  else lead.addEventListener('loadeddata', follow, { once: true });
}
