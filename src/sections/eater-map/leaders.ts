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
 * AND THE ANCHOR SITS INSIDE THE SURFACE ITS PART NAMES, WHICH IS NOT THE SAME
 * BOX AS THE CARD. A part is a COMPONENT of the app — the search bar, the Offline
 * button, the rail popup, the detail sheet — and the search Card carries two of
 * them side by side in one topbar. So `--eater-map-anchor-<part>-x/-y` are a
 * share of the SURFACE, and the anchor is planted inside that surface by
 * `cards.ts` rather than beside the Card's own markup: a percentage of the box
 * the rule ends on is the browser's own arithmetic, and the alternative is
 * measuring a pill's offset inside a topbar and typing the answer here, which is
 * a second opinion about a number the vendored export already holds.
 *
 * THE SHOULDER, AND WHY IT IS A BOX RATHER THAN A NUMBER. Each rule leaves its
 * point horizontally for `--eater-map-leader-reach` before turning towards the
 * part. That length is the `.eater-map__hook`'s own width, so this module reads
 * two x's off one rect and never parses a Token: a custom property's computed
 * value is its token stream — `getPropertyValue` hands back `0.9rem`, not pixels
 * — so a length Token read from script has to be spent by the stylesheet on a
 * real property first. Which of the hook's two edges the rule starts at is
 * decided by which side of it the part is on, so **#191 moving the Points across
 * the page cost this file nothing**: the shoulder turned round on its own, and
 * the one declaration it needed — which edge of the ROW the hook stands on — is a
 * composition decision and is in the stylesheet.
 *
 * AND THE HOOK CARRIES THE y AS WELL, FOR THE SAME REASON AND AT THE SAME PRICE.
 * Its box is the row rule's box — lifted by `--eater-map-rule-weight` and given
 * it as a height — so the rule's CENTRELINE is a midpoint of the same rect these
 * two x's come off, and the leader is collinear with the accent rule it
 * continues rather than half a weight below it. Reading the hook's TOP edge is
 * what put it there: a border is painted inside its box and a stroke is centred
 * on its path, so the two disagreed by half a rule-weight — one device pixel at
 * DPR 1, at the junction, which is the one part of the line a reader following
 * it actually looks at.
 *
 * AND TWO DOTS, WHICH ARE VERTICES OF THE RULE ITSELF (#191). A lit one at the
 * part, which is the polyline's own last point, and a smaller one at the shoulder
 * where it turns, which is the polyline's middle point. Written from the same two
 * numbers the rule is written from rather than computed again, so "the rule ends
 * in a dot ON the part" is true by construction and not by two calculations
 * agreeing. Both carry no centre until this runs, and a circle with no `cx` paints
 * nothing — the same promise the polylines make.
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
export const CARD_NAMES = ['search', 'lines', 'details'] as const;

export type CardName = (typeof CARD_NAMES)[number];

/**
 * Every part of the Exploded View a numbered point may name, in the order the
 * points read.
 *
 * FOUR PARTS AND THREE CARDS, which is the thing to know before reading anything
 * else here. A part is a COMPONENT of the app rather than a piece of the drawing:
 * the search Card is a topbar carrying two of them — the bar itself and the
 * Offline button beside it — and the two are exactly what the first two points
 * are about. The Slab is no longer one. It was, while `04.` claimed the offline
 * basemap and the picture was the only thing to point at; the claim belongs to
 * the button that says so, and a number on the map itself pointed at everything
 * and therefore at nothing.
 */
export const PARTS = ['search', 'offline', 'lines', 'details'] as const;

export type Part = (typeof PARTS)[number];

/**
 * Where each part IS: the Card it is drawn on, and the surface inside that Card
 * it actually is.
 *
 * ONE PLACE, BECAUSE THREE THINGS ASK IT. A leader line ends on this surface, the
 * Drop lowers the Card underneath it when the reader hovers the point, and
 * `glass.ts` gives it a copy of the map and an edge — and a correspondence that
 * disagrees with itself between those three is a rule ending on one component
 * while the number beside it lowers another. `cards.ts` builds a Card's glass
 * surfaces out of this rather than restating them.
 *
 * THE SELECTOR IS THE APP'S OWN CLASS and is the one thing here that answers to
 * another repository. A re-vendoring that renames a surface fails loudly:
 * `glass.ts` says so on the console and the `console` Check makes that a build
 * failure, and the leader line to it finds no anchor and is not drawn.
 */
export const ANCHORED_AT: Record<Part, { readonly card: CardName; readonly surface: string }> = {
  search: { card: 'search', surface: '.search' },
  offline: { card: 'search', surface: '.offline-button' },
  lines: { card: 'lines', surface: '.lines-popup' },
  details: { card: 'details', surface: '.details-panel' },
};

/** Which Card a part is drawn on, for a name that may not be a part at all —
 *  `data-eater-map-point` reaches `drop.ts` as a plain string. */
export function cardOf(part: string): CardName | null {
  return ANCHORED_AT[part as Part]?.card ?? null;
}

/** One rule, and the two elements whose screen positions are its two ends. */
interface Leader {
  readonly part: string;
  /** the `<polyline>` in the overlay */
  readonly rule: SVGPolylineElement;
  /** the box in the point's row: its width IS the shoulder's reach */
  readonly hook: HTMLElement;
  /** the zero-sized point at the part's own corner, inside the transform */
  readonly anchor: HTMLElement;
  /** the lit dot ON the part, at the rule's far end (#191) */
  readonly tip: SVGCircleElement | null;
  /** the smaller dot at the shoulder, where the rule turns */
  readonly knee: SVGCircleElement | null;
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
    // The two dots are OPTIONAL and the rule is not. A composition that draws no
    // dots is a leader line that reaches its corner and stops, which is a drawing
    // rather than a fault; a rule with no hook or no anchor has nowhere to be
    // drawn between, which is the hole above.
    const tip = overlay.querySelector<SVGCircleElement>(`[data-eater-map-tip="${part}"]`);
    const knee = overlay.querySelector<SVGCircleElement>(`[data-eater-map-knee="${part}"]`);
    leaders.push({ part, rule, hook, anchor, tip, knee });
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
    for (const { rule, hook, anchor, tip, knee } of leaders) {
      const from = hook.getBoundingClientRect();
      const to = anchor.getBoundingClientRect();
      // THE HOOK'S CENTRELINE AND NOT ITS TOP EDGE, because the hook IS the row
      // rule's box — the stylesheet lifts it by the rule's weight and gives it
      // that weight as a height, precisely so this line can be a midpoint. A
      // stroke is centred on its path, a border is drawn inside its box, and
      // taking the top edge put the two half a rule-weight apart: one device
      // pixel of step at DPR 1, right where the rule leaves the row, which is the
      // one place on it a reader is looking.
      const y = (from.top + from.bottom) / 2 - frame.top;
      const x = to.left - frame.left;
      const at = to.top - frame.top;
      // Out of the near edge of the hook and across it: which edge is near is
      // which side the part is on.
      const towards = x >= (from.left + from.right) / 2 - frame.left;
      const start = (towards ? from.left : from.right) - frame.left;
      const turn = (towards ? from.right : from.left) - frame.left;
      rule.setAttribute(
        'points',
        `${start.toFixed(2)},${y.toFixed(2)} ${turn.toFixed(2)},${y.toFixed(2)} ` +
          `${x.toFixed(2)},${at.toFixed(2)}`,
      );
      // THE TWO DOTS SIT ON TWO OF THE THREE POINTS THE RULE IS ALREADY MADE OF,
      // which is what stops them being a second opinion about where the rule goes:
      // the lit one is the polyline's own last vertex, so "the rule ends in a dot
      // on the part" is true by construction rather than by two calculations
      // agreeing. Their radii are the stylesheet's, gated on the centre written
      // here — a circle with no `cx` paints nothing, which is what a reader whose
      // scripts never arrived gets (#191).
      tip?.setAttribute('cx', x.toFixed(2));
      tip?.setAttribute('cy', at.toFixed(2));
      knee?.setAttribute('cx', turn.toFixed(2));
      knee?.setAttribute('cy', y.toFixed(2));
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
