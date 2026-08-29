/**
 * The Eater Map Section's Timeline — and there is not one yet.
 *
 * The Section's motion is the **Lift**, the Exploded View going from flat to
 * raised, and it arrives with the Exploded View itself (#177). Until then this
 * Section is an ordinary text composition with a box standing where the Slab
 * will go, and it has nothing to animate.
 *
 * IT USED TO EXPORT AN EMPTY `gsap.timeline({ paused: true })` (#174), on the
 * reasoning that an empty Timeline is still one a Check can hold and seek. Both
 * halves of that are false, and it survived only because that Section was on no
 * page and so registered nothing. Mounted, it fails `moments` TWICE: a Timeline
 * with no duration cannot be seeked to a fraction — `progress(0.25)` reads back 0
 * — and it moves nothing between 0 and 1, which is the shape that Check exists to
 * catch. Measured, not reasoned; NOTES.md has both failures verbatim.
 *
 * THE FILE IS STILL HERE BECAUSE IT IS THE HANDLE, not because the convention
 * asks for a file to be full. `src/kernel/loader.ts` globs `sections/*\/timeline.ts`
 * to discover the Sections, so this module is what makes `data-section="eater-map"`
 * a chunk the loader fetches as the Section approaches — which is the whole of
 * how this Section mounts lazily rather than at load. The loader's own type says
 * the default export is optional: a Section with no motion still mounts, it just
 * registers no Timeline, and `moments` therefore has nothing to ask this Section
 * for and does not ask.
 *
 * WHEN THE LIFT LANDS IT IS ONE NAMED SEEKABLE OBJECT (ADR 0003), running FROM
 * the raised state rather than towards it, so this module never arriving costs
 * the motion and nothing else.
 *
 * `export {}` is what makes this a module rather than a script, so the loader's
 * dynamic import gets an object with no `default` on it instead of a parse that
 * means something else.
 */
export {};
