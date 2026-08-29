import { onTurn } from '../../kernel/turn';
import data from './assets/cut-morph.json';

/**
 * The Cut Title's morph: PROJECTS turning out of Friz Quadrata and into a sans
 * as the page turns. Eight letters drawn against one number, and the number is
 * the Turn.
 *
 * ONE PROJECTS, EVER, and that rule is kept in the stylesheet rather than here:
 * the Panel's own masthead goes `visibility: hidden` at every window, and inside
 * the landing band this word stands in its slot — so the reader never sees two of
 * the word, not at rest on either screen, not at any frame of the turn between
 * them, and not on the scroll that replaces the turn outside the band.
 *
 * THE WORD NEITHER MOVES NOR RESIZES, and neither half of that is in this file.
 * It is drawn at the Panel masthead's own cap from the start (src/kernel/
 * landing.css publishes the cap; FrontScreen.astro fits the drawing to it), and
 * it stands still while the document scrolls past it, which puts it at the top of
 * the second screen for free. There is no translate here and no scale, and the
 * `turn` Check asserts that the drawn box is the same width, the same height and
 * at the same x at every moment of the crossing.
 *
 * NOTHING ON THE PAGE DEPENDS ON THIS FILE. A browser that never runs it —
 * blocked script, a chunk that did not arrive, a reader who asked for less motion
 * — gets the Cut Title exactly as the Section ships it: the one baked Friz
 * outline FrontScreen.astro puts inline, on screen at first paint. All this does
 * is swap that single path for the same outlines split into eight, and then move
 * them.
 *
 * WHAT THE TWEEN IS. Both ends are the real typeface: at rest each letter is its
 * own Bézier outline, Friz's at the start and the sans's at the end, and the
 * polygons in `assets/cut-morph.json` are used only in between. The
 * correspondence they encode — which point of Friz's P becomes which point of the
 * sans's — is not obvious and is not computed here; design/cut-title/morph/ works
 * it out and design/bake/morph/ is the Bake that chooses the face. Two things
 * from there matter for reading this file:
 *
 *   * Friz's P and R have NO COUNTER. The bowl tapers to a point and never
 *     reaches the stem, so each is one contour where every sans has two. The bay
 *     is closed with a chord across its mouth to make the counts match, which is
 *     why the animation reads as the bowl closing rather than a hole appearing.
 *   * The letters are STAGGERED, so the word turns rather than switching.
 *
 * The geometry is the same in both faces by construction: every candidate is
 * scaled to Friz's cap height and its tracking solved so the ink spans the same
 * width. So the viewBox and the drawing's two measured constants are all still
 * Friz's and none of them moves during the morph — the cap line stays exactly
 * where the cut is taken from.
 */

/** The polygons' precision, and how finely a letter's own transition is sampled. */
const STEPS = 240;

interface Letter {
  ch: string;
  /** The two polygons, point for point: Friz's, and the face's. */
  a: string;
  b: string;
  /** The face's real outline, which is what the letter is at the far end. */
  t: string;
}

interface Compiled {
  path: SVGPathElement;
  from: string;
  to: string;
  /** The two polygons flattened to one array each, with the contour lengths. */
  a: number[];
  b: number[];
  lens: number[];
  drawn: number;
}

/**
 * The tween ends are polygons — `M x y L x y … Z` and nothing else — so this does
 * not need to be a path parser and deliberately is not one. The Bézier outlines
 * at either end are never parsed; they are handed to the browser as they are.
 */
function parse(d: string): number[][] {
  const out: number[][] = [];
  let contour: number[] | null = null;
  for (const part of d.split(/(?=[MLZ])/)) {
    const command = part.charAt(0);
    if (command === 'Z') {
      contour = null;
      continue;
    }
    const [x, y] = part.slice(1).split(' ').map(Number);
    if (x === undefined || y === undefined) continue;
    if (command === 'M') {
      contour = [x, y];
      out.push(contour);
    } else contour?.push(x, y);
  }
  return out;
}

function compile(path: SVGPathElement, letter: Letter): Compiled {
  const from = parse(letter.a);
  const to = parse(letter.b);
  const a: number[] = [];
  const b: number[] = [];
  const lens: number[] = [];
  for (const [index, contour] of from.entries()) {
    lens.push(contour.length);
    for (const [at, value] of contour.entries()) {
      a.push(value);
      b.push(to[index]?.[at] ?? value);
    }
  }
  return { path, from: '', to: letter.t, a, b, lens, drawn: -1 };
}

function between(shape: Compiled, t: number): string {
  let d = '';
  let k = 0;
  for (const length of shape.lens) {
    for (let i = 0; i < length; i += 2) {
      const ax = shape.a[k] as number;
      const ay = shape.a[k + 1] as number;
      const x = Math.round((ax + ((shape.b[k] as number) - ax) * t) * 10) / 10;
      const y = Math.round((ay + ((shape.b[k + 1] as number) - ay) * t) * 10) / 10;
      d += `${i ? 'L' : 'M'}${x} ${y}`;
      k += 2;
    }
    d += 'Z';
  }
  return d;
}

export default function mountCutMorph(root: HTMLElement): void {
  const word = root.querySelector<SVGSVGElement>('.front-screen__cut-word');
  const face = data.face as { letters: Letter[] };
  const friz = data.friz as Record<string, string>;
  if (!word || face.letters.length === 0) return;

  const letters: Compiled[] = [];
  word.replaceChildren();
  for (const letter of face.letters) {
    const outline = friz[letter.ch];
    if (!outline) continue;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', outline);
    word.append(path);
    const shape = compile(path, letter);
    shape.from = outline;
    letters.push(shape);
  }
  if (letters.length === 0) return;

  /**
   * How much of its own transition a letter waits out before starting, as a
   * fraction of the whole. A Token because it is the feel of the word turning:
   * at 0 the eight letters change together and the word switches, and eight of
   * them at 0.05 leaves each 0.65 of the crossing to travel in.
   */
  const stagger = () => {
    const value = Number.parseFloat(getComputedStyle(root).getPropertyValue('--front-screen-cut-stagger'));
    return Number.isFinite(value) && value >= 0 && value * (letters.length - 1) < 1 ? value : 0.05;
  };

  /**
   * Each letter's own share of the crossing, eased with SMOOTHSTEP, and the
   * choice of curve matters more than it looks. Two easings multiply on the way
   * to a shape: the page turn shapes the crossing against time, and this shapes
   * the letter against the crossing. Peak rates multiply with them — so an
   * ease-in-out cubic here, twice as fast at its middle as its average, meeting a
   * turn nearly twice as fast at its own peak, whips the letters caught by both
   * through their transition at several times their own rate. Smoothstep is the
   * gentlest curve that still leaves and arrives at rest, which is all this end
   * needs: the drama belongs to the paper, and a letter only has to not start and
   * stop with a jolt.
   *
   * Both ends land exactly on 0 and 1, so at either resting place every letter is
   * the real outline of a real typeface and not a polygon. Quantised to STEPS,
   * which is finer than the eye can follow at this size and stops a one-pixel
   * scroll from rebuilding eight path strings.
   */
  function draw(turn: number): void {
    const step = stagger();
    const span = 1 - step * (letters.length - 1);
    for (const [index, shape] of letters.entries()) {
      const own = span > 0 ? (turn - index * step) / span : turn;
      const eased = own <= 0 ? 0 : own >= 1 ? 1 : own * own * (3 - 2 * own);
      const at = Math.round(eased * STEPS);
      if (at === shape.drawn) continue;
      shape.drawn = at;
      shape.path.setAttribute(
        'd',
        at <= 0 ? shape.from : at >= STEPS ? shape.to : between(shape, at / STEPS),
      );
    }
  }

  // A reader who asked for less motion gets the word as the Section ships it: the
  // eight letters are built — so the drawing is the same one either way — and
  // nothing ever advances them off Friz.
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  onTurn(draw);
}
