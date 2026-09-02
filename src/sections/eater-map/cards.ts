import type { CardPart } from './leaders';
import manifest from './assets/cards/cards.json';
import details from './assets/cards/details.html?raw';
import lines from './assets/cards/lines.html?raw';
import results from './assets/cards/results.html?raw';
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
 *
 * AND WHY THERE IS A THIRD REFUSAL SINCE #194
 * -------------------------------------------
 * The search results dropdown is a SCROLL CONTAINER — 81 matching rows behind
 * `overflow: auto`, which is what the app has and what the capture keeps. Left
 * alone that is a third input route, and the worst of the three: the app also
 * sets `overscroll-behavior: contain` on it, so a reader dragging the page with
 * a finger over the panel scrolls the restaurants instead of the page and the
 * scroll does NOT chain when the panel reaches its end. The page appears stuck.
 *
 * `pointer-events: none` on the panel is the refusal, and it has to be INLINE
 * for a second reason on top of the scoping one: `results.css` gives the panel
 * `pointer-events: auto` explicitly — it is a live control floating inside a
 * shell the app has made inert — so nothing this Section could write in a
 * stylesheet outweighs it without `!important`, and an inline declaration does.
 *
 * AND IT LANDS ON THAT ONE ELEMENT AND NOWHERE ELSE. Refusing the pointer on
 * every glass surface would be the tidier rule and it is the wrong one: it would
 * take the details sheet's own paragraph out of reach of a selection, which is
 * exactly the thing `inert` was rejected for above and an acceptance criterion of
 * #176. Nothing is lost on the dropdown, because every row in it is a `<button>`
 * and the first refusal has already made those unselectable.
 */

/** Everything the browser will let a reader focus or press. */
const CONTROL = /<(a|button|input|select|textarea)\b/gi;

/** Every rank, because which one a surface reaches for is the app's business. */
const HEADING = /<(h[1-6])\b/gi;

/** A surface named by its class, which is every one the Cards have. */
const BY_CLASS = /^\.([\w-]+)$/;

/**
 * Every element carrying one whole class token, by tag name.
 *
 * A WHOLE TOKEN, which is the difference between `.search` and `.search-glyph`:
 * `\b` reads a hyphen as a word boundary, so a naive test for `search` matches
 * three other classes in the same Card.
 */
const carrying = (owned: string) =>
  new RegExp(`(<[a-z][\\w-]*\\b)(?=[^>]*\\bclass="(?:[^"]*\\s)?${owned}(?:\\s[^"]*)?")`, 'gi');

/**
 * The attributes go in FIRST, immediately after the tag name.
 *
 * Not decoration: the HTML parser keeps the first of two attributes with the
 * same name, so an element that already carries a `style`, a `tabindex` or a
 * `role` of its own is overridden by this rather than overriding it. Nothing in
 * today's export does, and that is a fact about a generated file rather than a
 * guarantee — and it is what makes the two `style` attributes an element can
 * collect below harmless, since both say the same thing.
 *
 * `scrolls` is the third refusal and is deliberately not "every surface" — the
 * header above says what refusing one too many would cost.
 */
function asPicture(html: string, scrolls: readonly string[] = []): string {
  let out = html
    .replace(CONTROL, '<$1 tabindex="-1" style="pointer-events:none"')
    .replace(HEADING, '<$1 role="presentation"');
  for (const selector of scrolls) {
    const owned = BY_CLASS.exec(selector)?.[1];
    if (!owned) continue;
    out = out.replace(carrying(owned), '$1 style="pointer-events:none"');
  }
  return out;
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
  /**
   * A second vendored surface that HANGS off this Card's own, or nothing.
   *
   * One Card has one: the search bar's results dropdown (#194). It is a surface
   * of the search PART and not a fifth part — there are four numbered points and
   * the dropdown is what point 01 is already about — so it arrives inside the
   * search Card rather than as a Card of its own, carries no anchor, and its
   * leader line is the search Card's one leader line.
   *
   * IT IS A SECOND ROOT AND NOT A SECOND CARD, which is what makes the two draw
   * at the SAME scale for nothing: a dropdown narrower or wider than the bar it
   * hangs from reads as a different component, and inside one Card there is one
   * `scale()` and nothing to keep in step. `EaterMap.astro` puts it in a box of
   * its own so that the gap between the two can be a length — see the clearance
   * there, which is derived from the Card's thickness and the plane's tilt
   * rather than typed.
   */
  readonly hung?: string;
  /**
   * How many rows the hung surface shows at once, off the capture's own manifest.
   *
   * THE ONE THING THE COLLECTOR CANNOT CARRY. The app sets
   * `--mobile-search-visible-results` INLINE on the dropdown's shell and the
   * collector strips a root's inline style — that is where the app writes a
   * surface's placement, which is the whole thing the export exists to drop. So
   * the panel arrives with `max-height: calc(var(--mobile-search-visible-results,
   * 4) * 56px)` and no variable, falls back to FOUR rows inside a host box the
   * collector sized for two, and the overflow is invisible unless somebody counts
   * the rows. The Section restates the variable — as the app's variable, never as
   * a height — and this is the number it restates, read back out of the manifest
   * the capture wrote rather than typed here a second time.
   */
  readonly rows?: number;
}

/** The manifest, read for the one number the markup could not carry. Widened
 *  rather than inferred, because a JSON literal types every card by what that
 *  card happens to hold and only one of the four has a cap. */
const VENDORED: readonly { readonly name: string; readonly rows?: number }[] = manifest.cards;

/**
 * The results dropdown's own panel, and it is one name used twice for two
 * different claims: it is a glass surface the search Card draws, and it is the
 * one vendored element that SCROLLS and therefore has to be refused the pointer.
 * Written once so the two cannot drift; kept apart below because the second must
 * not spread to the other surfaces.
 */
const DROPDOWN = '.results-panel';

/**
 * Stacked back to front, which is also how the app stacks them: the detail panel
 * is a sheet over the map, the lines popup floats above that, and the search bar
 * is the one thing always on top.
 */
export const CARDS: readonly Card[] = [
  { name: 'details', html: asPicture(details), surfaces: ['.details-panel'] },
  { name: 'lines', html: asPicture(lines), surfaces: ['.lines-popup'] },
  {
    name: 'search',
    html: asPicture(search),
    surfaces: ['.search', '.offline-button', DROPDOWN],
    hung: asPicture(results, [DROPDOWN]),
    rows: VENDORED.find((one) => one.name === 'results')?.rows,
  },
];
