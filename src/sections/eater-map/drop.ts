import gsap from 'gsap';
import { seconds } from './duration';

/**
 * The **Drop**: one piece put back on the map while the reader is asking about
 * it (#213).
 *
 * THE EXPLODED VIEW'S WHOLE CLAIM IS THE CORRESPONDENCE — this number names that
 * piece — and the leader lines say it as far as a drawn rule can. What they
 * cannot say is WHERE ON THE MAP the piece came from: a reader who wants to know
 * where the search bar actually sits has to imagine it back down. So hovering a
 * Card, or hovering the numbered Point that names it, lowers that one piece back
 * onto the Slab and leaves everything else standing.
 *
 * IT IS THE LIFT'S ANTONYM AND NOT A SECOND LIFT. `timeline.ts` owns
 * `--eater-map-card-lift`, this owns `--eater-map-card-drop`, and the stylesheet
 * composes the two into the one coefficient the Card's rise and both of its
 * slides are already terms of. Neither module can overwrite the other's number,
 * so a reader who hovers a piece part way up the Lift gets both rather than
 * whichever wrote last — which is the failure a single shared playhead has, and
 * it is silent, because the drawing still moves.
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
 * claim: `--eater-map-card-drop` rests at 0 in the stylesheet, which is the
 * finished Exploded View, and the four Points still say in words what the four
 * pieces are. The same is true below the band, where nothing is raised to be put
 * back — `collapsed()` is asked before a piece is ever chosen, so nothing down
 * there is left holding a drop it cannot spend.
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

/** One Card, its playhead, and the tween that is moving it. */
interface Piece {
  readonly card: HTMLElement;
  /** the drop this Card is at, which is also what is written on it */
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
 * Where this Card stands with the Drop taken off, as a screen rect.
 *
 * THE AXIS-ALIGNED BOX AND NOT THE QUAD, and here that is the right answer rather
 * than the trap it is for the leader lines. A Card is turned under the plane's
 * rotation, so this box is bigger than the Card — which makes the footprint a
 * SUPERSET of what the reader was pointing at, and the error is therefore a piece
 * that stays down a moment longer than it might have rather than one that
 * flickers. The leader lines want the corner itself and use an anchor for it.
 */
function standing(card: HTMLElement): DOMRect {
  const held = card.style.getPropertyValue('--eater-map-card-drop');
  card.style.setProperty('--eater-map-card-drop', '0');
  const box = card.getBoundingClientRect();
  if (held) card.style.setProperty('--eater-map-card-drop', held);
  else card.style.removeProperty('--eater-map-card-drop');
  return box;
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
  const pieces = new Map<string, Piece>();
  for (const card of root.querySelectorAll<HTMLElement>('[data-eater-map-card]')) {
    const part = card.getAttribute('data-eater-map-card');
    if (part) pieces.set(part, { card, head: { at: 0 }, tween: null });
  }
  // Nothing to put back. A listener on a Section with no Cards is a thing that
  // runs on every mouse move and can never do anything, which is the refusal
  // `mountLift` and `mountLeaders` both make.
  if (pieces.size === 0) return;

  const lessMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');

  function put(piece: Piece, at: number): void {
    piece.head.at = at;
    piece.card.style.setProperty('--eater-map-card-drop', String(at));
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
    footprint = to ? standing(to.card) : null;
    if (to) towards(to, 1);
  }

  /**
   * Which piece a pointer over this element is asking about, and whether it is
   * asking at all.
   *
   * Three answers rather than two. A Card or a Point NAMES a piece; the Slab's
   * own Point is a trigger that names none, because the fourth number is about
   * the picture the reader is already looking at and there is nothing standing
   * off it to put back — so hovering it puts everything back, which is the honest
   * reading of pointing at the map. Anything else is not a trigger, and the
   * footprint decides.
   */
  function asked(target: EventTarget | null): { piece: Piece | null } | null {
    if (!(target instanceof Element)) return null;
    const owner = target.closest<HTMLElement>('[data-eater-map-card], [data-eater-map-point]');
    if (!owner) return null;
    const part =
      owner.getAttribute('data-eater-map-card') ?? owner.getAttribute('data-eater-map-point');
    return { piece: (part && pieces.get(part)) || null };
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
