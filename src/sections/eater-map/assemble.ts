/**
 * The **assembly**: everything on this Section that is not a Card, coming on as
 * the Cards leave the map — laid onto the Lift's own playhead, so it is the same
 * one named seekable Timeline (ADR 0003) and a Check's seek or the Editor's scrub
 * lands on a frame of all of it at once.
 *
 * In order: the grid's three verticals draw down the frame and each Point's
 * hairline shoots out of its row across it; the serif title rises out of its four
 * lines and the copy comes up under it; the four Points arrive a row at a time
 * with their icons drawing themselves; a scan line passes down the map;
 * and as each Card leaves the map its rule draws out of the row that names it,
 * turns its shoulder, and lands on the part with the lit dot popping and a ring
 * going out from it. NOTES.md, "The assembly", has the layout and the rule it is
 * built round.
 *
 * PAINT ONLY, AND GATED. Every rule this drives is a descendant of
 * `data-eater-map-assembling` on the Section, and the attribute is there only
 * while the playhead is short of 1 IN THE BAND — so the resting page is the page
 * as it was, a reader whose scripts never arrived gets the finished composition,
 * and below the band, where the playhead RESTS at 0 (#179), none of it applies.
 * What it touches is a clip, a dash, an opacity, a scale about a dot's own centre
 * and a translate on a box no rule is drawn from, so no box the `eater-map` Check
 * measures — a hook, an anchor, a Card, the plane — is a pixel off at any moment.
 */

/** The Cards' own layout on the playhead, which the rules are timed against. */
export interface Climb {
  readonly lag: number;
  readonly rise: number;
  readonly stagger: number;
}

export interface Assembly {
  /** Put the gate where `progress` says, which the Lift's onUpdate calls. */
  gate(progress: number): void;
  /** Tell the gate which regime the window is in: collapsed, it is never on. */
  regime(collapsed: boolean): void;
}

/** The gate's own thousandth: the last frame of the Lift is the resting page. */
const REST = 1e-4;

/** How far along a rule its shoulder is, as a share of the whole rule — its first
 *  leg over the two. A rule not drawn yet answers a guess rather than nothing. */
function shoulder(rule: Element): number {
  const [start, turn, end] = (rule.getAttribute('points') ?? '')
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(',').map(Number));
  if (!start || !turn || !end) return 0.1;
  const leg = (a: number[], b: number[]) =>
    Math.hypot((b[0] ?? NaN) - (a[0] ?? NaN), (b[1] ?? NaN) - (a[1] ?? NaN));
  const first = leg(start, turn);
  const whole = first + leg(turn, end);
  return Number.isFinite(whole) && whole > 0 ? first / whole : 0.1;
}

/** When a `power2.inOut` draw has drawn `share` of its line, as a share of its time. */
function reached(share: number): number {
  const f = Math.min(1, Math.max(0, share));
  return f <= 0.5 ? Math.sqrt(f / 2) : 1 - Math.sqrt((1 - f) / 2);
}

/** A tween kept inside the ruler, so progress stays the share of the Lift. */
const at = (start: number, length: number): number => Math.max(0, Math.min(start, 1 - length));

export function assemble(
  root: HTMLElement,
  lift: gsap.core.Timeline,
  cards: HTMLElement[],
  climb: Climb,
): Assembly {
  const all = <T extends Element>(selector: string): T[] => [...root.querySelectorAll<T>(selector)];

  /** One property on `targets` from 0 to 1, at `start` for `length`. */
  const track = (
    targets: Element | Element[],
    name: string,
    start: number,
    length: number,
    ease: string,
    stagger = 0,
  ): void => {
    const list = Array.isArray(targets) ? targets : [targets];
    if (list.length === 0) return;
    const spread = stagger * (list.length - 1);
    lift.fromTo(
      list,
      { [name]: 0 },
      { [name]: 1, duration: length, ease, stagger },
      at(start, length + spread),
    );
  };

  // ---- the frame ------------------------------------------------------------
  // The three verticals down the frame, left to right, and each Point's hairline
  // out of its row and across it, top to bottom — the grid the composition
  // stands on, drawn before anything stands on it.
  track(all('.eater-map__grid i'), '--eater-map-draw', 0, 0.26, 'power3.inOut', 0.04);
  const rows = all<HTMLElement>('.eater-map__points > li');
  track(rows, '--eater-map-row', 0.05, 0.3, 'expo.out', 0.045);

  // ---- the words --------------------------------------------------------------
  // The title a line at a time out of its own line box, then the copy under it.
  track(all('.eater-map__title span'), '--eater-map-in', 0.03, 0.24, 'power3.out', 0.045);
  // The rule over the copy is drawn across first, and the copy comes up under it.
  track(all('.eater-map__copy'), '--eater-map-rule-in', 0.02, 0.3, 'power3.inOut');
  track(all('.eater-map__copy p'), '--eater-map-in', 0.22, 0.26, 'power2.out', 0.05);

  // ---- the Points ---------------------------------------------------------------
  // Each row's number, title and figure, staggered inside the row by the
  // stylesheet off this one number; and its icon drawn as the row arrives.
  track(rows, '--eater-map-row-in', 0.08, 0.28, 'power3.out', 0.05);
  track(all('.eater-map__icon'), '--eater-map-ink', 0.12, 0.3, 'power2.inOut', 0.05);

  // ---- the map ------------------------------------------------------------------
  // One scan line down the Slab from its head to its foot, over a map that is
  // never dimmed.
  // Timed to cross while the Cards are coming off the map, because the map is
  // mostly Cards until they have: a scan that has finished before the first one
  // leaves is a scan nobody sees.
  const sheen = root.querySelector<HTMLElement>('.eater-map__sheen');
  const still = root.querySelector<HTMLElement>('[data-eater-map-still]');
  if (sheen) track(sheen, '--eater-map-sweep', 0.12, 0.5, 'power2.inOut');

  // ---- the rules ----------------------------------------------------------------
  // Each part's rule is timed off the Card it is drawn on, so the line leaves its
  // row as that Card leaves the map and reaches the part while it is still
  // climbing. Two parts on one Card — the search bar and its Offline button — go
  // a beat apart, in the Points' own order.
  const overlay = root.querySelector('[data-eater-map-leaders]');
  const onCard = new Map<Element, number>();
  for (const rule of overlay?.querySelectorAll('[data-eater-map-leader]') ?? []) {
    const part = rule.getAttribute('data-eater-map-leader');
    if (!part || !overlay) continue;
    const anchor = root.querySelector(`[data-eater-map-anchor="${part}"]`);
    const card = anchor?.closest<HTMLElement>('[data-eater-map-card]');
    const index = card ? cards.indexOf(card) : -1;
    if (index < 0) continue;
    const beat = onCard.get(card!) ?? 0;
    onCard.set(card!, beat + 1);

    const from = climb.lag + index * climb.stagger + 0.04 + beat * 0.04;
    const draw = 0.26;
    track(rule, '--eater-map-draw', from, draw, 'power2.inOut');
    // The shoulder's dot pops as the drawn line reaches it, which is the share of
    // the rule its first leg is — read off the rule as the flat frame drew it,
    // and turned back through the draw's own ease into a moment.
    const knee = overlay.querySelector(`[data-eater-map-knee="${part}"]`);
    const turns = from + draw * reached(shoulder(rule)) - 0.01;
    if (knee) track(knee, '--eater-map-pop', turns, 0.12, 'back.out(3)');
    const tip = overlay.querySelector(`[data-eater-map-tip="${part}"]`);
    if (tip) track(tip, '--eater-map-pop', from + draw - 0.03, 0.14, 'back.out(3.2)');
    const ping = overlay.querySelector(`[data-eater-map-ping="${part}"]`);
    if (ping) track(ping, '--eater-map-ping', from + draw, 0.18, 'power2.out');
  }

  let collapsed = false;
  let on: boolean | null = null;

  function gate(progress: number): void {
    const now = !collapsed && progress < 1 - REST;
    if (now === on) return;
    on = now;
    // THE SCAN IS CUT TO THE PICTURE'S OWN OUTLINE, which the stage writes on the
    // Still and may write again whenever a Token moves — so it is copied at the
    // moment it is needed rather than once. The two share a containing block and a
    // container, so the one expression resolves to the same shape on both.
    if (now && sheen && still) sheen.style.clipPath = still.style.clipPath;
    root.toggleAttribute('data-eater-map-assembling', now);
  }

  return {
    gate,
    regime(next: boolean): void {
      if (next === collapsed) return;
      collapsed = next;
      on = null;
      gate(lift.progress());
    },
  };
}
