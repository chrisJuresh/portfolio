/* The Frame's reflection in the marble plinth — the Projects Panel, #68.
 *
 * ALL THIS FILE DOES IS COPY THE FRAME INTO THE STONE. It clones `.panel-frame`
 * into `.panel-mirror`, and the stylesheet does everything after that: the copy
 * is stood on the contact line, folded through it, and squashed to the depth of
 * the marble in front of the window. See the reflection block in styles.css,
 * which is where the geometry is and why.
 *
 * WHY A CLONE AND NOT A SECOND COPY IN THE MARKUP. The Frame is a hundred lines
 * of chrome whose every length is a measured share of the window's width — ten
 * icons at their own ink widths, a pill centred to a fifth of a percent. Two
 * copies of that in index.html is one copy that gets edited and one that does
 * not, and the one that does not is the reflection, where nobody would notice
 * for months. cloneNode is the only arrangement in which the reflection cannot
 * disagree with the thing it reflects.
 *
 * What it costs is a browser with no JavaScript, which gets the plinth with
 * nothing lying in it. That is the same trade panel-clip.js, cut-morph.js and
 * frame-glass.js all make and it is the mild end of it: polished stone with no
 * reflection is a plinth, and nothing on the page says one was promised.
 *
 * IT RUNS BEFORE THE OTHER TWO, and that ordering is the design rather than an
 * accident of the tag order in index.html:
 *
 *   * panel-clip.js hands sources to every `.panel-clip` on the page, so the
 *     copy's <video> is served by the same file, from the same list, under the
 *     same reduced-motion refusal. A reader who asks for reduced motion gets two
 *     posters and no fetch, and the reflection freezes with the still — which is
 *     what #68 asks for, arrived at by not writing anything.
 *   * frame-glass.js renders the material once and blits it onto every
 *     `.frame-bar`, so the reflected titlebar is the same glass rather than an
 *     imitation of it.
 *
 * Both of those are one-word changes in files that already knew how to do the
 * work. Running this last instead would have made the reflection a special case
 * in three files.
 *
 * THE CLONE IS INERT, and it was already: everything inside `.panel-frame` is a
 * <span>, an <i> or an <svg>, there is no id anywhere in it to duplicate, and
 * the whole stage is `aria-hidden`, so the copy carries no accessible name, no
 * focus stop and no handler. The one thing cloneNode cannot copy is a <canvas>'s
 * pixels — which is exactly the case frame-glass.js handles, and the reason it
 * handles it rather than this file.
 */
(function () {
  "use strict";

  var mirror = document.querySelector(".panel-mirror");
  var frame = document.querySelector(".panel-stage > .panel-frame");
  if (!mirror || !frame) return;

  mirror.appendChild(frame.cloneNode(true));
})();
