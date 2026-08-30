/**
 * The **leader lines**: four thin rules, each running from one numbered point to
 * the part of the Exploded View it names (#178).
 *
 * THE CORRESPONDENCE IS THE DESIGN'S BEST IDEA AND IT HAS TO BE EXACT — no part
 * without a number and no number without a part. This module owns the vocabulary
 * that makes that mechanical: `PARTS` is what a point may name, `content.ts`
 * types its `part` field against it, and the Content parse fails the build if a
 * part goes unnamed or is named twice. The design reference breaks the rule —
 * its lines begin in empty space and one ends nowhere — and that is precisely
 * what the ticket fixes.
 *
 * WHY THIS IS DRAWN BY A SCRIPT AND CANNOT BE DRAWN BY A STYLESHEET. A line has
 * to begin at a Card's own corner while that Card is turned in three dimensions
 * under the plane's camera, and end at a text row that is not turned at all. The
 * two ends are in different coordinate systems, and CSS has no way to ask where
 * a projected corner LANDED — the arithmetic exists only in the compositor. So
 * the geometry is read back off the page rather than computed here.
 *
 * WHAT MAKES THE ANCHOR THE CORNER RATHER THAN AN APPROXIMATION OF IT. Each part
 * carries a zero-sized `.eater-map__anchor` INSIDE the transformed subtree, at
 * the corner two Tokens name. A zero-sized box projects to a POINT, so its
 * `getBoundingClientRect()` is that corner's screen position exactly. The obvious
 * alternative — reading the Card's own rect — gives the axis-aligned bounding box
 * of the projected quad, whose corners are nowhere on the Card at all once it is
 * rotated. That is the failure this arrangement exists to avoid, and it looks
 * right at the flat end of the Lift and wrong everywhere else.
 *
 * THE SHOULDER, AND WHY IT IS A BOX RATHER THAN A NUMBER. Each rule leaves its
 * point horizontally for `--eater-map-leader-reach` before turning towards the
 * part. That length is the `.eater-map__hook`'s own width, so this module reads
 * two x's off one rect and never parses a Token: a custom property's computed
 * value is its token stream — `getPropertyValue` hands back `0.9rem`, not pixels
 * — so a length Token read from script has to be spent by the stylesheet on a
 * real property first. Which of the hook's two edges the rule starts at is
 * decided by which side of it the part is on, so a Variant that moves the points
 * to the far side of the composition needs nothing from this file.
 *
 * WHEN IT REDRAWS. On every tick of the Lift, which is what keeps the rules
 * attached through the whole of it — `timeline.ts` hands this module's redraw to
 * the Timeline's `onUpdate`, so a Check seeking a moment and the Editor scrubbing
 * one are covered by the same line. On a resize, through a ResizeObserver. And
 * once the faces have arrived, because the points' text moves under them.
 *
 * WHERE THERE ARE NO LINES. Below the band the composition collapses to one
 * column with the four points BENEATH the picture (#179), and a rule between
 * them would run back up the page and join a paragraph to a corner off the top
 * of the screen. The stylesheet takes the overlay away there, and this module
 * asks the stylesheet rather than repeating its breakpoint.
 *
 * IT ASKS THE OVERLAY'S OWN `display` AND NOT `--eater-map-collapsed`, which is
 * the flag `timeline.ts` reads, and the difference is which question is being
 * asked. The Lift wants to know which REGIME the composition is in; these rules
 * want to know whether they are drawn — a narrower thing, declared on the
 * element itself, and the one declaration that also has to be true for a rule
 * drawn before a resize not to be left lying across the stack afterwards.
 */

/** The three Cards, by the Token stem each one's placement is named for. */
export const CARD_PARTS = ['search', 'lines', 'details'] as const;

/** The fourth part is the Slab itself: the offline basemap is the artefact the
 *  reader is already looking at, so its point names the picture rather than
 *  anything standing on it. */
export const SLAB_PART = 'slab';

/** Every part of the Exploded View a numbered point may name. */
export const PARTS = [...CARD_PARTS, SLAB_PART] as const;

export type CardPart = (typeof CARD_PARTS)[number];
export type Part = (typeof PARTS)[number];

/** One rule, and the two elements whose screen positions are its two ends. */
interface Leader {
  readonly part: string;
  /** the `<polyline>` in the overlay */
  readonly rule: SVGPolylineElement;
  /** the box in the point's row: its width IS the shoulder's reach */
  readonly hook: HTMLElement;
  /** the zero-sized point at the part's own corner, inside the transform */
  readonly anchor: HTMLElement;
}

/**
 * Draw the leader lines, and answer with the function that redraws them.
 *
 * Returns nothing when there is no overlay to draw into or nothing to join,
 * which is the same refusal `mountLift` makes: a redraw wired to an empty
 * overlay is a thing that runs every frame and asserts nothing.
 */
export function mountLeaders(root: HTMLElement): (() => void) | void {
  const overlay = root.querySelector<SVGSVGElement>('[data-eater-map-leaders]');
  if (!overlay) return;

  const leaders: Leader[] = [];
  for (const rule of overlay.querySelectorAll<SVGPolylineElement>('[data-eater-map-leader]')) {
    const part = rule.getAttribute('data-eater-map-leader');
    if (!part) continue;
    // Escaped nowhere because the part came out of the schema's own enum, which
    // is four lower-case words.
    const hook = root.querySelector<HTMLElement>(`[data-eater-map-hook="${part}"]`);
    const anchor = root.querySelector<HTMLElement>(`[data-eater-map-anchor="${part}"]`);
    if (!hook || !anchor) continue;
    leaders.push({ part, rule, hook, anchor });
  }
  if (leaders.length === 0) return;

  const draw = (): void => {
    // The stylesheet decides where the composition has collapsed, and there is
    // exactly one breakpoint in this Section rather than one here and one there.
    if (getComputedStyle(overlay).display === 'none') return;
    // The overlay covers the composition, so every coordinate below is relative
    // to it and NOTHING here depends on the scroll — which is what stops a
    // reader turning the page from dragging four rules across it.
    const frame = overlay.getBoundingClientRect();
    for (const { rule, hook, anchor } of leaders) {
      const from = hook.getBoundingClientRect();
      const to = anchor.getBoundingClientRect();
      const y = from.top - frame.top;
      const x = to.left - frame.left;
      // Out of the near edge of the hook and across it: which edge is near is
      // which side the part is on.
      const towards = x >= (from.left + from.right) / 2 - frame.left;
      const start = (towards ? from.left : from.right) - frame.left;
      const turn = (towards ? from.right : from.left) - frame.left;
      rule.setAttribute(
        'points',
        `${start.toFixed(2)},${y.toFixed(2)} ${turn.toFixed(2)},${y.toFixed(2)} ` +
          `${x.toFixed(2)},${(to.top - frame.top).toFixed(2)}`,
      );
    }
  };

  draw();
  // The points' rows and the Slab both change size without the Section's own box
  // changing — a face arriving reflows a title, and the picture is a share of
  // what row two has left. Observing all three costs one observer.
  const watching = new ResizeObserver(draw);
  watching.observe(root);
  for (const part of root.querySelectorAll<HTMLElement>('[data-eater-map-watch]')) {
    watching.observe(part);
  }
  // A face landing moves the text the rules leave from, and no resize follows it
  // when the row's height happens not to change.
  document.fonts?.ready.then(draw).catch(() => {});

  return draw;
}
