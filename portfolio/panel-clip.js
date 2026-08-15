/* The recording inside the Projects Panel's Frame — the photo vault's grid,
 * scrolling.
 *
 * ALL THIS FILE DOES IS GIVE THE <video> ITS SOURCES, and that is the whole
 * design rather than an implementation detail. The element is in the markup with
 * a poster and no source at all, so:
 *
 *   * a reader who asks for reduced motion gets the poster and NOTHING IS
 *     FETCHED — not a range request, not a metadata probe. #57's user story 25
 *     asks for the setting to save bandwidth as well as movement, and the only
 *     way to honour that is to never name the file. A CSS rule cannot do it, and
 *     nor can `preload="none"`, which still fetches the moment it plays.
 *   * a browser that never runs this file — blocked script, parse error, an
 *     ad-blocker that took the whole tag — gets the same poster rather than a
 *     black rectangle. This is the stance effects.js and cut-morph.js take, and
 *     the Panel is whole without it in the same way.
 *
 * `<source media="...">` is in the resource selection algorithm and would do the
 * first of those declaratively — but only for a browser that honours it, and one
 * that does not fetches both files with nothing in the page able to find out
 * that it did. So the media query is asked here, where the answer can be acted
 * on, and the attribute is written onto each <source> below as well: two
 * independent refusals rather than one, on the criterion where a single point of
 * failure costs a reader bandwidth they asked not to spend.
 *
 * The setting is read once. A reader who changes it mid-visit is not chased —
 * the same thing cut-morph.js does, and for the same reason: the preference is
 * about how a page behaves when it arrives.
 */
(function () {
  "use strict";

  var clip = document.querySelector(".panel-clip");
  if (!clip) return;

  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  if (still && still.matches) return;

  /* Relative, and resolved against <base href="/portfolio/"> like every other
     asset this page names. The query string is the same content stamp the
     textures carry in styles.css, and here it is load-bearing rather than
     tidy: vercel.json caches /portfolio/video/ as immutable, so a re-cut clip
     that kept this URL would be served from cache for a year. Re-cutting the
     clip means changing this stamp — design/censor/README.md says so where the
     recording is made. */
  var VERSION = "?v=21f8d5ea";
  var SOURCES = [
    /* WebM first: it is a fifth of the MP4's bytes at the quality record
       encodes both at, so every browser that can take it should. */
    { src: "video/photos-grid.webm" + VERSION, type: "video/webm" },
    { src: "video/photos-grid.mp4" + VERSION, type: "video/mp4" }
  ];

  for (var i = 0; i < SOURCES.length; i++) {
    var source = document.createElement("source");
    source.src = SOURCES[i].src;
    source.type = SOURCES[i].type;
    /* Belt and braces with the check above: a browser that honours this cannot
       be talked into fetching by a stale matchMedia answer either. */
    source.media = "(prefers-reduced-motion: no-preference)";
    clip.appendChild(source);
  }

  /* Selection has already ended in failure by now — the element was parsed with
     no source — so appending is not enough on its own. load() restarts it. */
  clip.load();

  /* Autoplay is the attribute's job, and it is left to do it. This only catches
     the browsers that hand back a rejected promise instead: the poster stays up,
     which is the same still the reduced-motion reader gets, so there is nothing
     to repair and nothing to report. */
  var played = clip.play();
  if (played && typeof played.catch === "function") played.catch(function () {});
})();
