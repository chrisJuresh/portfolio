/**
 * The Frame's reflection in the marble.
 *
 * ALL THIS FILE DOES IS COPY THE FRAME INTO THE STONE. It clones the window into
 * `.projects-panel__reflection`, and the stylesheet does everything after that: the
 * copy is stood on the contact line, folded through it, and cut to the depth of
 * the marble in front of the window. The reflection block in `ProjectsPanel.astro`
 * is where the geometry is and why.
 *
 * WHY A CLONE AND NOT A SECOND COPY IN THE MARKUP. The Frame is a hundred lines
 * of chrome whose every length is a measured share of the window's width — ten
 * glyphs at their own ink widths, a field centred to a fifth of a per cent. Two
 * copies of that in the component is one copy that gets edited and one that does
 * not, and the one that does not is the reflection, where nobody would notice for
 * months. `cloneNode` is the only arrangement in which the reflection cannot
 * disagree with the thing it reflects.
 *
 * What it costs is a browser with no JavaScript, which gets the marble with
 * nothing lying in it. That is the same trade every other script in this Section
 * makes and it is the mild end of it: polished stone with no reflection is a
 * plinth, and nothing on the page says one was promised. The Check asserts that
 * outcome rather than leaving it to be believed.
 *
 * IT RUNS BEFORE THE OTHER TWO, and that ordering is the design rather than an
 * accident of the order in the component's script:
 *
 *   * `clip.ts` hands sources to every recording on the page, so the copy's
 *     `<video>` is served by the same file, from the same list, under the same
 *     reduced-motion refusal. A reader who asks for reduced motion gets two
 *     posters and no fetch, and the reflection freezes with the still — arrived
 *     at by not writing anything.
 *   * `lens.ts` gives every titlebar it finds its material, so the reflected one
 *     is the same Lens rather than an imitation of it. It already read every
 *     OTHER titlebar on the page and said so before there was one.
 *
 * Both are one call in a file that already knew how to do the work. Running this
 * last instead would have made the reflection a special case in three files.
 *
 * THE ONE ASYMMETRY, AND IT IS lens.ts's TO KNOW ABOUT: the copy gets the
 * FROSTED rung. The Plinth's top face is `--projects-panel-plinth-top` of the
 * Frame's width, so at a Frame 1033 wide the whole reflection is 17.4px of stone
 * against a 531px window and the reflected titlebar is about 1.2 pixels tall. A
 * displacement map for that is a canvas encode and a second filter subtree for
 * something with no room to exist in. The rings and the tint carry it, and this
 * file does not have to know — which is the point of the ordering.
 *
 * THE CLONE IS INERT, and it was already: everything inside the Frame is a
 * `<span>`, an `<i>`, an `<svg>` or the recording, there is no `id` anywhere in
 * it to duplicate, and the whole stage is `aria-hidden`, so the copy carries no
 * accessible name, no focus stop and no handler. It used to carry a `<canvas>`
 * too, whose pixels `cloneNode` cannot copy — the material is custom properties
 * and a filter now, both of which a clone simply inherits, so that case is gone
 * rather than handled.
 */

/**
 * Put a live copy of the Frame in the marble.
 *
 * Nothing here is required for the Plinth to render, and this returning early is
 * the same outcome as it never being called.
 */
export function mountReflection(): void {
  const box = document.querySelector<HTMLElement>('.projects-panel__reflection');
  /* The stage's own Frame and not any Frame: run twice — a hot reload, a second
     mount — the second call would otherwise reflect the reflection. */
  const frame = document.querySelector<HTMLElement>(
    '.projects-panel__stage > .projects-panel__frame',
  );
  if (!box || !frame || box.firstElementChild) return;

  box.appendChild(frame.cloneNode(true));
}
