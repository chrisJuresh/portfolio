import gsap from 'gsap';
import { seconds } from './duration';
import { cardOf } from './leaders';

/**
 * The **Drop**: one piece put back on the map while the reader is asking about
 * it (#213), and since #215 the piece is the one the reader actually named.
 *
 * THE EXPLODED VIEW'S WHOLE CLAIM IS THE CORRESPONDENCE — this number names that
 * piece — and the leader lines say it as far as a drawn rule can. What they
 * cannot say is WHERE ON THE MAP the piece came from: a reader who wants to know
 * where the search bar actually sits has to imagine it back down. So hovering a
 * Card, or hovering the numbered Point that names one of the components on it,
 * lowers that one piece back onto the Slab and leaves everything else standing.
 *
 * AND A POINT'S PIECE IS A COMPONENT WHERE A CARD'S PIECE IS THE CARD, which is
 * the whole of #215 and is the one asymmetry in this file. Two of the four parts
 * are pills in the search Card's own topbar, so lowering the Card when the reader
 * hovers `01.` put the Offline button back as well — and `01.` does not name the
 * Offline button, `02.` does. Hovering the DRAWING is still the whole Card: what
 * the pointer is on out there is the topbar, which is one piece of the drawing,
 * and taking half of it out from under the cursor would answer a question the
 * reader did not ask.
 *
 * IT IS THE LIFT'S ANTONYM AND NOT A SECOND LIFT. `timeline.ts` owns
 * `--eater-map-card-lift`, this owns `--eater-map-card-drop` and
 * `--eater-map-part-drop`, and the stylesheets compose all three into the one
 * coefficient the Card's rise and both of its slides are already terms of.
 * Neither module can overwrite the other's number, so a reader who hovers a piece
 * part way up the Lift gets both rather than whichever wrote last — which is the
 * failure a single shared playhead has, and it is silent, because the drawing
 * still moves. The two drops compose the same way with each other: a pointer
 * travelling from a Card to a Point crosses between them continuously.
 *
 * THE PAINT ORDER IS THE ONE THING A COMPONENT CANNOT SORT FOR ITSELF, and
 * `--eater-map-card-sunk` is what this writes about it. A Card is a stacking
 * context, so a pill lying on the map cannot be put behind another CARD from
 * inside one; the Card takes its lowest component's height instead, and the pill
 * still standing beside it is sorted as though it had come down too.
 * `EaterMap.astro` carries why that is the lesser of the two errors.
 *
 * WHAT PUTS A PIECE BACK UP IS NOT LEAVING IT, AND THAT IS THE ONE THING IN THIS
 * FILE THAT LOOKS LIKE A MISTAKE. A Card that lowers moves out from under the
 * cursor; on `pointerleave` it would rise, arrive back under the cursor, be
 * hovered again, and lower — a piece that flickers for as long as the pointer is
 * held still. So the piece stays down while the pointer is anywhere it covered
 * WHEN IT WAS RAISED, and `standing()` below is what records that footprint. The
 * footprint always contains the pointer that chose the piece, so a still pointer
 * can never fall out of it, whatever the drawing does in between.
 *
 * AND IT IS READ WITH THE DROP TAKEN OFF rather than remembered from before the
 * drop started, because a reader who re-enters a piece half way back up has never
 * seen it raised in this gesture and there is nothing to have remembered.
 *
 * THE POINTER IS THE MOUSE'S. A tap is not a hover: a touch pointer is destroyed
 * on release, so a finger would lower a piece and leave it lowered with nothing
 * to raise it, and a finger dragging the page across the drawing would lower each
 * piece it crossed. Asked of the EVENT rather than of `(hover: hover)`, so a
 * laptop with a touchscreen answers both ways rather than once at mount.
 *
 * WHAT A READER WHOSE SCRIPTS NEVER ARRIVED LOSES is a way of asking, and no
 * claim: both drops rest at 0 in the stylesheets, which is the finished Exploded
 * View, and the four Points still say in words what the four pieces are. The same
 * is true below the band, where nothing is raised to be put back — `collapsed()`
 * is asked before a piece is ever chosen, so nothing down there is left holding a
 * drop it cannot spend.
 */

/** A thousandth of the travel is "already there", as it is for the Lift. */
const SLACK = 0.001;

/**
 * How the piece travels down and back.
 *
 * `inOut` where the Lift is `out`, and the difference is what starts the two. The
 * Lift begins when the page comes to rest from a turn, so its pieces should leave
 * at once; this begins when a pointer arrives, so it should take the pointer's
 * gesture up rather than jump away from it.
 */
const EASE = 'power2.inOut';

/** What the Card itself is placed by, and what one component of it owes the Card
 *  on top of that. Two names because they are two claims and the stylesheet
 *  multiplies them; one name would be the two modules taking turns. */
const CARD_DROP = '--eater-map-card-drop';
const PART_DROP = '--eater-map-part-drop';

/** How far the LOWEST component on a Card has gone, which decides what covers
 *  what and decides nothing about where the Card stands. */
const SUNK = '--eater-map-card-sunk';

/**
 * One piece the reader can put back, and everything it takes to move it.
 *
 * A CARD IS ONE ELEMENT AND A COMPONENT IS THREE, and that is why this is a list
 * rather than a node. A component's blurred copy of the map and its edge stack
 * are absolutely-placed boxes in the Card's own coordinates rather than children
 * of the surface they are drawn for (`glass.ts`), so all three carry
 * `data-eater-map-part` and all three have to be written.
 */
interface Piece {
  /** the Card this piece is, or the Card the component is drawn on */
  readonly card: HTMLElement;
  /**
   * Every element the drop is written on, ASKED FOR EACH TIME rather than held.
   *
   * `mountGlass` runs again whenever a Token moves under the Cards or the window
   * leaves the band (`redraw.ts`), and it BUILDS THE BACKDROP AND THE EDGE AFRESH
   * — so a list captured at mount is two detached nodes and one live one the
   * moment an author drags a Token, and the component would come apart with
   * nothing on the console to say why. The vendored surface survives a re-glass;
   * the other two do not.
   */
  readonly on: () => readonly HTMLElement[];
  /** which of the two drops this piece spends */
  readonly property: string;
  /** the box the footprint is measured from — the Card, or the surface itself */
  readonly box: () => HTMLElement | null;
  /** the drop this piece is at, which is also what is written on it */
  readonly head: { at: number };
  tween: gsap.core.Tween | null;
}

/**
 * Has the composition collapsed — is there anything raised to put back?
 *
 * The same question `timeline.ts` asks, asked the same way and for the same
 * reason: the breakpoint is the stylesheet's, and a `matchMedia` here would be it
 * written a second time in a second language. Below the band the Lift never runs,
 * so every Card's own lift is 0 and a drop would multiply to nothing — this is
 * what stops a piece being CHOSEN down there at all, so a window carried back
 * across the boundary finds nothing holding a drop.
 */
function collapsed(root: HTMLElement): boolean {
  return Number(getComputedStyle(root).getPropertyValue('--eater-map-collapsed')) === 1;
}

/** Is the pointer inside the box this piece covered when it was raised? */
function within(box: DOMRect, x: number, y: number): boolean {
  return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
}

/**
 * Where this piece stands with the Drop taken off, as a screen rect.
 *
 * THE AXIS-ALIGNED BOX AND NOT THE QUAD, and here that is the right answer rather
 * than the trap it is for the leader lines. A Card is turned under the plane's
 * rotation, so this box is bigger than the Card — which makes the footprint a
 * SUPERSET of what the reader was pointing at, and the error is therefore a piece
 * that stays down a moment longer than it might have rather than one that
 * flickers. The leader lines want the corner itself and use an anchor for it.
 */
function standing(piece: Piece): DOMRect | null {
  const box = piece.box();
  if (!box) return null;
  const on = piece.on();
  const held = on.map((element) => element.style.getPropertyValue(piece.property));
  for (const element of on) element.style.setProperty(piece.property, '0');
  const rect = box.getBoundingClientRect();
  on.forEach((element, at) => {
    if (held[at]) element.style.setProperty(piece.property, held[at]);
    else element.style.removeProperty(piece.property);
  });
  return rect;
}

/**
 * Wire the Drop up, and answer with nothing.
 *
 * `redraw` is the leader lines', and it is the whole of "a rule stays attached to
 * the piece it names while that piece is moving" — the same one line
 * `timeline.ts` hangs on the Lift's own `onUpdate`, for the same reason and with
 * the same cost. Optional, because a composition with no rules to redraw is a
 * drawing rather than a fault.
 */
export default function mountDrop(root: HTMLElement, redraw?: (() => void) | void): void {
  /** Every Card, by the name a Card names itself with. */
  const cards = new Map<string, Piece>();
  /** Every component, by the word its Point carries. */
  const parts = new Map<string, Piece>();
  /** Which components are drawn on each Card, for the paint order below. */
  const onCard = new Map<HTMLElement, Piece[]>();

  for (const card of root.querySelectorAll<HTMLElement>('[data-eater-map-card]')) {
    const name = card.getAttribute('data-eater-map-card');
    if (name) {
      cards.set(name, {
        card,
        on: () => [card],
        property: CARD_DROP,
        box: () => card,
        head: { at: 0 },
        tween: null,
      });
    }
    // GROUPED BY THE WORD AND NOT ONE PIECE PER ELEMENT, because a component is
    // three boxes that have to travel together. The PIECE is what is held here
    // and the elements are asked for each time — `Piece.on` says why.
    for (const element of card.querySelectorAll<HTMLElement>('[data-eater-map-part]')) {
      const part = element.getAttribute('data-eater-map-part');
      if (!part || parts.has(part)) continue;
      // Escaped nowhere because the word came out of the schema's own enum, which
      // is four lower-case words — the same promise `mountLeaders` makes.
      const on = () => [...card.querySelectorAll<HTMLElement>(`[data-eater-map-part="${part}"]`)];
      const piece: Piece = {
        card,
        on,
        property: PART_DROP,
        // THE SURFACE AND NOT THE UNION OF THE THREE, which is what the two
        // `glass.ts` builds are excluded for. An edge stack is a zero-sized box at
        // the CARD's own origin — its slices overflow it — so a union would reach
        // from there to the component and hold a piece down for a pointer standing
        // somewhere on the map between the two.
        box: () =>
          on().find(
            (one) =>
              !one.hasAttribute('data-eater-map-glass') && !one.hasAttribute('data-eater-map-edge'),
          ) ?? null,
        head: { at: 0 },
        tween: null,
      };
      parts.set(part, piece);
      onCard.set(card, [...(onCard.get(card) ?? []), piece]);
    }
  }
  // Nothing to put back. A listener on a Section with no Cards is a thing that
  // runs on every mouse move and can never do anything, which is the refusal
  // `mountLift` and `mountLeaders` both make.
  if (cards.size === 0) return;

  const lessMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');

  function put(piece: Piece, at: number): void {
    piece.head.at = at;
    for (const element of piece.on()) element.style.setProperty(piece.property, String(at));
    // AND THE CARD IS TOLD HOW FAR ITS LOWEST COMPONENT HAS GONE. Read across the
    // Card's components rather than written from this one, because two of them can
    // be moving at once — one going back up as the other comes down — and a value
    // written per piece would be whichever wrote last.
    if (piece.property === PART_DROP) {
      const deepest = (onCard.get(piece.card) ?? []).reduce(
        (low, one) => Math.max(low, one.head.at),
        0,
      );
      piece.card.style.setProperty(SUNK, String(deepest));
    }
    redraw?.();
  }

  /** Take this piece to `to`, from wherever it has got to. */
  function towards(piece: Piece, to: number): void {
    piece.tween?.kill();
    piece.tween = null;
    const from = piece.head.at;
    const distance = Math.abs(to - from);
    // PER GESTURE AND NOT AT MOUNT, which is the one thing a Token a Timeline
    // reads has to do to be draggable: the Editor writes the file and the next
    // hover is the next reading. `--eater-map-lift-time` is read the same way.
    const time = seconds(getComputedStyle(root).getPropertyValue('--eater-map-drop-time'), 0.45);
    // A READER WHO ASKED FOR STILLNESS STILL GETS THE ANSWER, and gets it with no
    // animation to watch — the correspondence is the point of the gesture and the
    // travel is only how it is told. Asked live, because a setting is the
    // reader's and may change under a page that is already open.
    if (distance < SLACK || !(time > 0) || lessMotion?.matches === true) {
      put(piece, to);
      return;
    }
    // The distance LEFT rather than the whole travel, so a piece caught on its way
    // down and sent back up takes as long as it has to go, exactly as a turn back
    // part way up the Lift undoes part of a Lift.
    piece.tween = gsap.to(piece.head, {
      at: to,
      duration: time * distance,
      ease: EASE,
      onUpdate: () => put(piece, piece.head.at),
      onComplete: () => {
        piece.tween = null;
      },
    });
  }

  /** The piece the reader is pointing at, and the box it covered when raised. */
  let chosen: Piece | null = null;
  let footprint: DOMRect | null = null;

  function choose(next: Piece | null): void {
    // BEFORE THE STYLE READ BELOW AND NOT AFTER IT. Every mouse move across a
    // Card arrives here naming the piece already chosen, and `collapsed()` is a
    // forced style recalculation — asked on each of those it would be one per
    // frame for as long as a pointer is moving over the drawing.
    if (next === chosen) return;
    const to = next !== null && collapsed(root) ? null : next;
    if (to === chosen) return;
    if (chosen) towards(chosen, 0);
    chosen = to;
    // READ BEFORE THE TWEEN AND NOT AFTER IT: this is where the piece stands with
    // no drop on it, and a frame later it is on its way down.
    footprint = to ? standing(to) : null;
    if (to) towards(to, 1);
  }

  /**
   * Which piece a pointer over this element is asking about, and whether it is
   * asking at all.
   *
   * A CARD NAMES ITSELF AND A POINT NAMES A COMPONENT, which is the one asymmetry
   * here and is what the Offline button costs. A Point names a PART — a component
   * of the app — and two of the four parts are pills in the search Card's own
   * topbar, so what goes back on the map is that COMPONENT and not the Card it is
   * drawn on. A Card hovered directly is still the whole Card.
   *
   * AND A POINT WHOSE COMPONENT HAS NO ELEMENTS FALLS BACK TO THE CARD, which is
   * `cardOf` and is the only thing left of what this used to do. It is a
   * re-vendoring that renamed a surface: `cards.ts` then plants no attribute,
   * `glass.ts` says so on the console and the `console` Check makes it a build
   * failure — and until it does, the Point lowers the piece it is drawn on rather
   * than nothing at all.
   *
   * Three answers rather than two. A trigger that names nothing answers with no
   * piece — which puts everything back, the honest reading of pointing at
   * something the drawing does not take apart. Anything that is not a trigger at
   * all answers `null`, and the footprint decides.
   */
  function asked(target: EventTarget | null): { piece: Piece | null } | null {
    if (!(target instanceof Element)) return null;
    const owner = target.closest<HTMLElement>('[data-eater-map-card], [data-eater-map-point]');
    if (!owner) return null;
    const card = owner.getAttribute('data-eater-map-card');
    if (card) return { piece: cards.get(card) ?? null };
    const point = owner.getAttribute('data-eater-map-point');
    if (!point) return { piece: null };
    const named = parts.get(point);
    if (named) return { piece: named };
    const fallback = cardOf(point);
    return { piece: (fallback && cards.get(fallback)) || null };
  }

  root.addEventListener(
    'pointermove',
    (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const trigger = asked(event.target);
      if (trigger) {
        choose(trigger.piece);
        return;
      }
      // NOT A TRIGGER, so the only thing keeping a piece down is the ground it
      // used to stand on — which is the pointer standing still while the piece
      // moved out from under it.
      if (chosen && footprint && within(footprint, event.clientX, event.clientY)) return;
      choose(null);
    },
    { passive: true },
  );

  // The pointer leaving the Section altogether delivers no move inside it, so the
  // footprint above would hold the last piece down for the rest of the session.
  root.addEventListener(
    'pointerleave',
    (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      choose(null);
    },
    { passive: true },
  );
}
