/**
 * The Front Screen's Timeline: there is not one yet, deliberately.
 *
 * NOTES.md carries the argument. The short of it is that everything that moves
 * on this Section belongs to something else — the crossing into dark and the
 * corner pictures' lift are the Kernel's Turn, the switch's pill is a transition
 * on its own state, and the opening reveal runs TOWARDS the settled state, which
 * is the one thing a Timeline here may never do. What is left is the photo
 * carousel, and that is #137.
 *
 * The file exists because every Section holds one and because the loader is what
 * makes `data-mounted` reach `true`. Exporting nothing registers no Timeline,
 * which is why `moments` never asks this Section for a moment.
 */
export default function frontScreenTimeline(): void {}
