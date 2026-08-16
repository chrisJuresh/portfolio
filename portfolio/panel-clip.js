/* The recording inside the Projects Panel's Frame — the photo vault's grid,
 * scrolling — and the copy of it lying in the marble.
 *
 * ALL THIS FILE DOES IS GIVE THE <video>s THEIR SOURCES, and that is the whole
 * design rather than an implementation detail. The elements are in the markup
 * with a poster and no source at all, so:
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
 *
 * THERE ARE TWO OF THEM NOW, AND THE SECOND IS THE REFLECTION. #68 stands the
 * Frame on marble and casts a live copy of it into the stone, and the copy is a
 * clone of the whole window — so it contains a second `.panel-clip`, and it is
 * this file that decides whether either of them ever fetches anything. That is
 * the point of serving all of them from one place rather than teaching
 * panel-mirror.js to fetch: the reduced-motion refusal above is written once and
 * covers the reflection without knowing it exists, so the marble freezes with
 * the poster because there was never a decision to get wrong. See
 * portfolio/panel-mirror.js, which runs before this and makes the copy.
 *
 * WHY A SECOND ELEMENT RATHER THAN A CANVAS FED FROM THE FIRST. Painting frames
 * out of one <video> into a <canvas> would be one decode instead of two — and a
 * requestAnimationFrame loop for as long as the page is open, which is exactly
 * the per-frame cost the rest of this Panel is built without. Two elements on
 * one URL is a second decode of a 1.2 MB clip and no script running at all
 * between the two corrections below; the compositor draws the reflection for
 * free because it is drawing the copy anyway.
 */
(function () {
  "use strict";

  var clips = document.querySelectorAll(".panel-clip");
  if (!clips.length) return;

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

  /* How far the reflection is allowed to drift before it is put back, in
     seconds. Generous on purpose: the copy is squashed to a thirtieth of its own
     height, so a frame or two of lag is a smear that is a frame or two old and
     nobody can see it — while `currentTime =` is a seek, and a seek every tick
     to chase a difference nobody can see would cost more than the drift does.
     A tenth of a second is about three frames of the clip. */
  var DRIFT = 0.1;

  function serve(clip) {
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
  }

  var lead = clips[0];
  serve(lead);
  if (clips.length < 2) return;

  /* THE FOLLOWERS ARE SERVED LATE, AND THAT IS THE WHOLE OF WHY THIS IS NOT A
     LOOP. Both elements name the same URL, and two media elements asking for one
     URL at the same instant are not reliably coalesced into one request — the
     spec does not require it and engines differ, so the honest worst case is the
     1.2 MB clip fetched twice on a cold visit. Waiting for the lead's first
     frame means the response is in the HTTP cache before the copy asks for it,
     which turns the second fetch into a cache hit on every engine.
     What it costs is that the marble is a still for as long as the clip takes to
     start, and then catches up. That is the right way round: the reflection is
     the thing that may arrive late, not the window. */
  function follow() {
    for (var i = 1; i < clips.length; i++) {
      (function (clip) {
        serve(clip);
        clip.currentTime = lead.currentTime;
        /* `timeupdate` fires about four times a second, which is the cheapest
           clock in the element and far more often than the drift needs. Nothing
           here runs between ticks. */
        lead.addEventListener("timeupdate", function () {
          if (Math.abs(clip.currentTime - lead.currentTime) > DRIFT) {
            clip.currentTime = lead.currentTime;
          }
        });
      })(clips[i]);
    }
  }

  if (lead.readyState >= 2) follow();
  else lead.addEventListener("loadeddata", follow, { once: true });
})();
