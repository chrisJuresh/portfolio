import type { CardPart } from './leaders';
import details from './assets/cards/details.html?raw';
import lines from './assets/cards/lines.html?raw';
import search from './assets/cards/search.html?raw';

/**
 * The three Cards, ready to be put on the Slab.
 *
 * The markup itself is the Eater app's own, vendored by #174 and generated —
 * `design/eater-cards/README.md` is the authority and NOTES.md says why the
 * words in it are not Content. Nothing here rewrites what is on screen. What this
 * module does is two things the component cannot do in its template and one it
 * should not have to:
 *
 *   * name the three in the order they are stacked, once, so the component is a
 *     loop rather than three copies of the same six lines;
 *   * take the Cards OUT OF THE TAB ORDER, out of reach of a click, and out of
 *     the document's outline, all below;
 *   * and hand each one the class the placement Tokens are named for, so a
 *     Token reads as `--eater-map-card-search-x` rather than as an index.
 *
 * WHY THE CONTROLS ARE NEUTERED, AND WHY IT TAKES TWO REFUSALS
 * ------------------------------------------------------------
 * The Cards are a PICTURE of an app, and the app is not here. Left alone they put
 * thirteen tab stops in the middle of the Portfolio — a text field to type in,
 * buttons that share and close nothing, and links that leave for eater.com — all
 * of them invisible to a reader looking at the page and every one of them a
 * surprise to a reader tabbing through it.
 *
 * `inert` is the obvious answer and is the wrong one twice over: it takes the
 * Cards out of the accessibility tree, which is exactly the thing #171 asks for
 * them to be in, and it makes their text unselectable, which is an acceptance
 * criterion of #176. So the two input routes are refused separately —
 * `tabindex="-1"` for the keyboard and `pointer-events: none` for the pointer —
 * and everything else about the Card is left alone. The text stays selectable,
 * stays in the document, and is read to a screen reader as the Card's own words.
 *
 * BOTH ARE WRITTEN HERE AND NEITHER IS A STYLESHEET RULE, which is the part that
 * looks like a mistake until the reason is given: Astro scopes a component's
 * `<style>` by stamping an attribute on every element ITS OWN TEMPLATE renders,
 * and these arrive through `set:html`, so they carry no such attribute and no
 * scoped selector can reach them. `:global()` is the escape hatch and
 * `scripts/check-source.mjs` fails the build on it. An inline style is the one
 * thing that lands on an element without a selector.
 *
 * WHY THE CARD'S TITLE STOPS BEING A HEADING
 * ------------------------------------------
 * The detail panel's restaurant name is an `<h1>` in the app, where it is the
 * only thing on the screen and that is right. Here it is a word inside a picture
 * two thirds of the way down a portfolio, and a reader navigating by headings
 * would meet a restaurant at the top level of the document.
 * `role="presentation"` takes the heading semantics off it and leaves the TEXT
 * exposed, which is the distinction that matters: the Card's words are still
 * read, they are just not an entry in the outline. The four numbered points
 * beside it are the outline.
 *
 * That is a claim about the Portfolio's document rather than about Eater's
 * interface, which is why it is allowed where rewriting the markup would not be:
 * nothing on screen moves.
 */

/** Everything the browser will let a reader focus or press. */
const CONTROL = /<(a|button|input|select|textarea)\b/gi;

/** Every rank, because which one a surface reaches for is the app's business. */
const HEADING = /<(h[1-6])\b/gi;

/**
 * The attributes go in FIRST, immediately after the tag name.
 *
 * Not decoration: the HTML parser keeps the first of two attributes with the
 * same name, so an element that already carries a `style`, a `tabindex` or a
 * `role` of its own is overridden by this rather than overriding it. Nothing in
 * today's export does, and that is a fact about a generated file rather than a
 * guarantee.
 */
function asPicture(html: string): string {
  return html
    .replace(CONTROL, '<$1 tabindex="-1" style="pointer-events:none"')
    .replace(HEADING, '<$1 role="presentation"');
}

export interface Card {
  /**
   * The Token stem: `--eater-map-card-<name>-x` and `-y` place it, and
   * `--eater-map-anchor-<name>-x` and `-y` put its leader line's anchor on one
   * of its corners. Typed against `leaders.ts` rather than left a string, so a
   * Card renamed here without its point being renamed with it is a build error
   * rather than a rule that draws to nothing.
   */
  readonly name: CardPart;
  /** the Eater surface, as a picture of one: no tab stop, no click, no heading */
  readonly html: string;
  /**
   * Which elements of this Card are actually GLASS — the surfaces `glass.ts`
   * gives a blurred copy of the map and an edge (#190).
   *
   * A CARD IS ITS GLASS SURFACES AND NOT ITS BOUNDING BOX, and the search Card
   * is why this is a list. Its `.topbar` is a flex row holding TWO separate
   * pills — `.search` and `.offline-button`, with an 8px gap between them — and
   * one backdrop round the pair welds them into a single long component with two
   * buttons stuck on the end, which is not an interface the app has. The other
   * two Cards are one surface each, and their surface is the vendored root
   * itself.
   *
   * SELECTORS AND NEVER SIZES OR RADII. This says which elements to measure; it
   * says nothing about what the measurement will be. Every number `glass.ts`
   * draws with is read off the served `cards.css` at runtime, because a radius
   * stated in this repository is a second opinion about a number the vendored
   * export already holds — the mockup typed `24 / 18 / 22` against the
   * stylesheet's own `--r-full`, `--r-menu: 14px` and `--r-sheet: 28px 28px 0 0`,
   * and two of the three were wrong.
   */
  readonly surfaces: readonly string[];
}

/**
 * Stacked back to front, which is also how the app stacks them: the detail panel
 * is a sheet over the map, the lines popup floats above that, and the search bar
 * is the one thing always on top.
 */
export const CARDS: readonly Card[] = [
  { name: 'details', html: asPicture(details), surfaces: ['.details-panel'] },
  { name: 'lines', html: asPicture(lines), surfaces: ['.lines-popup'] },
  { name: 'search', html: asPicture(search), surfaces: ['.search', '.offline-button'] },
];
