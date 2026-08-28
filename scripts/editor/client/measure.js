/**
 * The Editor's third surface: move and resize anything, and get back a measured
 * instruction rather than a rewritten composition.
 *
 * WHAT IT IS FOR IS THE CHANGE THE EDITOR CANNOT EXPRESS. Content is words and
 * Tokens are named numbers; everything else — where a box stands, how big it is,
 * which constant governs it — is composition, and ADR 0004 says a tool that moved
 * boxes freely would destroy the relationship instead of editing it. So this one
 * MEASURES: it drags for real so the author can see it, and hands back an
 * Annotation in words and numbers for an agent to apply. `lib/annotations.mjs`
 * writes the sentence and is tested in node; this file is the part that needs a
 * page.
 *
 * NOTHING IT DOES TOUCHES A SECTION. A drag is an inline style on one element,
 * which is the DOM and not the source. An Override is the one thing here that
 * reaches a file, and it reaches `src/overrides.css` — outside every composition,
 * written by the boundary in `lib/overrides.mjs`, and listed here so it cannot
 * become invisible debt.
 *
 * AN OVERRIDE'S PAGE AND ITS FILE ARE TWO DIFFERENT THINGS, exactly as a Token's
 * are. The served page is a build, so a rule written into `src/overrides.css` now
 * is in the bundled stylesheet at the NEXT build and not before — so this surface
 * keeps a stylesheet of its own holding every Override the file holds, written the
 * same way the file writes them. That sheet is what makes an Override look right
 * immediately, and it is also why the drag's inline styles are dropped the moment
 * one lands: from then on the page is being moved by what the file says, which is
 * the only thing worth looking at.
 *
 * IT NAMES THINGS OUT OF THE GLOSSARY. The server reads `CONTEXT.md` and hands the
 * terms over; an element's own `section__part` class is matched against them. Where
 * there is no term the Annotation says so instead of inventing one — which is the
 * honest answer and also a nudge towards putting the word in the glossary.
 *
 * AND IT IS AN INSPECTOR, WHICH IS WHAT #166 CHANGED. Four things, and all four are
 * the same complaint: the tool measured well and was slow to reach.
 *
 *   - BEING ON THIS SURFACE IS BEING ARMED. `editor.js` arms it as the surface
 *     comes forward. There was a press for this, and it was a second gate on a
 *     decision the author had already made by choosing the surface.
 *   - A SELECTION, NOT AN ELEMENT. `this.selection` is a list, primary first;
 *     shift-click adds and removes. Every change is made to all of them — the same
 *     absolute size, the same distance moved — because "click a series of text and
 *     resize them" is what was asked for.
 *   - THE ANCESTORS ARE DRAWN. A click lands on the deepest element under the
 *     pointer, which is almost never the box the author means. `crumbs()` lists the
 *     chain and `↑`/`↓` walk it. And once one of them IS picked, a press anywhere
 *     inside it drags it rather than re-picking whatever the pointer happened to be
 *     over — `this.pending` is that, and how a click still gets back in.
 *   - A ROW IS SCRUBBED, AND LETTING GO WRITES THE TOKEN. Five rows now: the box's
 *     four and the TEXT SIZE, which is the one thing the author kept reaching for
 *     and could not touch. Seventeen of the nineteen `font-size` declarations under
 *     `src/` are exactly `var(--…)`, so scrubbing one almost always writes a real
 *     Token through the Tokens surface's own control — and `font-size` joined the
 *     Override's properties for the two that are built out of a `calc()`.
 *
 * WHAT DID NOT CHANGE IS THE ASYMMETRY, and it is ADR 0004 rather than an
 * unfinished half: a row backed by a Token writes on release, and a row backed by
 * nothing stays a measurement however hard it is scrubbed. A Token is a named
 * number the author is entitled to move. A coordinate in a composition is not.
 *
 * AND THEN TWO TOGGLES AND A RECORDING, which are the same complaint again: the
 * tool measured one element well and a SESSION of them badly.
 *
 *   - SCALE TEXT. Enlarging a box almost never means "the same words bigger", so
 *     while this is on a resize carries the text size with it, by the ratio the box
 *     changed by. `lib/typefit.mjs` is that ratio and the note on why it is a scale
 *     and not a search. It is off by default, because a resize that silently
 *     changed a second thing would be the tool taking a judgement. AND THE SIZE IT
 *     SCALES IS THE TEXT'S AND NOT THE BOX'S — `typeHolders()` is why, and it is
 *     the difference between the toggle working on the Projects Panel's Rail and
 *     appearing to do nothing at all there.
 *   - KEEP. Picking something else used to put the last thing back, which is right
 *     while a measurement is one element and wrong the moment the author is
 *     arranging several: half the point of moving two boxes is looking at them
 *     together. While this is on, a change that was actually made STAYS on the page
 *     when the selection leaves it — `release()` rather than `put()` — and picking
 *     it again resumes its own record, so a box moved twice reads as one change from
 *     where it started rather than two from wherever it got to.
 *   - THE RECORDING. Every completed gesture goes into `client/changes.js`, one
 *     entry per element, and `lib/changes.mjs` renders the lot as one document to
 *     paste to an agent. It is not the Annotation twenty times over, and the note at
 *     the top of that file is why.
 *
 * NOTHING ABOUT ANY OF THE THREE LOOSENS WHAT THIS SURFACE WRITES. A scaled text
 * size is an inline style like every other preview, a kept change is the same
 * inline style left alone, and the Recording is text in a box.
 *
 * AND THEN UNDO, WHICH IS WHAT MAKES A GESTURE CHEAP TO TRY. *put back* was the
 * only way out of a bad drag and it takes the whole element to where the
 * composition had it, so the four good gestures before the bad one went with it.
 * `undo`, `redo` and Ctrl-Z take one gesture back. `lib/history.mjs` is the stack —
 * pure, tested in node, and the note there is on the two rules that are easy to get
 * quietly wrong. What is HERE is what a step means, and the thing worth reading
 * twice is that it means more than the page: **a scrubbed row writes a Token, so
 * undoing it writes that Token back**, and an Override is discarded or restored the
 * same way. An undo that put the page back and left the file where the gesture put
 * it would be the exact failure "a Token's page and its file are two different
 * things" exists to prevent, with the author looking at a page that says otherwise.
 */

import { AXES, TEXT, annotate, holderFile, list, name, nudge, restate } from './lib/annotations.mjs';
import { asWritten, insets } from './lib/boxes.mjs';
import {
  CORNERS,
  label as cornerLabel,
  drift,
  proportional,
  ratio,
  resize,
  word as cornerWord,
} from './lib/corners.mjs';
import { EDGES, closing, scale as scaleBy, sides } from './lib/fills.mjs';
import { History } from './lib/history.mjs';
import { DISPLAY, asSelector, rule as ruleFor } from './lib/overrides.mjs';
import { carried, fitted } from './lib/typefit.mjs';

/** Which of the parent's two sides each axis is measured down. `AXES` itself is
 *  the Annotation's, imported rather than spelled again. */
const DOWN = { left: 'x', width: 'x', top: 'y', height: 'y' };

/** Everything this surface draws a row for: the box's four, and the text size
 *  beside them rather than among them. */
const MEASURES = [...AXES, TEXT];

/** How far the pointer travels for one unit of a scrubbed row, and the finer step
 *  a held Shift asks for. A text size wants tenths where a box wants pixels, so
 *  the coarse step is the row's and not the surface's. */
const SCRUB = { [TEXT]: 0.5, default: 1 };
const FINE = 0.1;

/** How far the pointer travels before a press INSIDE what is already picked is a
 *  drag of that box rather than a click through to what is under it. Below this a
 *  press and release picks the deepest element under the pointer, exactly as it
 *  always did — which is what keeps the way into a box open now that pressing
 *  inside one moves it. Three pixels, because a hand holding still is not still. */
const SLOP = 3;

/**
 * Which authored properties could be the one that governs an axis, in the order
 * they are looked for.
 *
 * A move is expressed a dozen ways in CSS and a resize two or three, so this is
 * a list rather than a lookup — and the sign matters: dragging right INCREASES
 * `left` and DECREASES `right`, so an Annotation that ignored that would offer a
 * Token value with the wrong sign, which is worse than offering none.
 */
const GOVERNED = {
  left: [
    ['left', 1],
    ['right', -1],
    ['margin-left', 1],
    ['margin-right', -1],
    ['inset-inline-start', 1],
  ],
  top: [
    ['top', 1],
    ['bottom', -1],
    ['margin-top', 1],
    ['margin-bottom', -1],
    ['inset-block-start', 1],
  ],
  width: [
    ['width', 1],
    ['inline-size', 1],
    ['max-width', 1],
    ['min-width', 1],
    ['flex-basis', 1],
  ],
  height: [
    ['height', 1],
    ['block-size', 1],
    ['max-height', 1],
    ['min-height', 1],
    // Last, and only ever reported: the Projects Panel's Frame has no height at
    // all — it has a width and a ratio — so an Annotation that said nothing
    // governs its height would be wrong about the one thing that does.
    ['aspect-ratio', 1],
  ],
  // One property and one sign, because a text size is set one way. It earns a
  // place here rather than a lookup of its own so that everything downstream —
  // the offer, the Annotation's paragraph, the refusals — is the code that
  // already worked for a length (#166).
  [TEXT]: [['font-size', 1]],
};

/** The properties that BOUND a size rather than being it. A box may sit anywhere
 *  below its `max-width`, so restating one to the measured size is only exact when
 *  the box is actually standing on the bound — which is checked, per measurement,
 *  rather than assumed. `flex-basis` is here too: what a flex item ends up at is
 *  the algorithm's answer and not this number. */
const BOUND = new Set(['max-width', 'min-width', 'max-height', 'min-height', 'flex-basis']);

/**
 * The bounds a PREVIEW has to lift, per axis, and why lifting them is the
 * difference between a drag that works and one that silently does nothing.
 *
 * A preview writes an inline `width`, and `max-width` clamps a `width` however
 * `!important` the `width` is — the two are different properties and importance
 * does not settle a fight between them. So a box the composition sizes as
 * `width: 100%` inside `max-width: var(--some-token)` could not be dragged WIDER
 * at all: the inline style was written, the box did not move, `applyTo()`
 * re-measured it truthfully as unchanged, and the commit had no delta to write.
 * The Front Screen's column is exactly that shape, and "I cannot make it any
 * wider" is what it looks like from the outside.
 *
 * Lifting the bound to the size being asked for is what makes the preview show
 * what committing is GOING to do — the commit writes the Token behind the bound,
 * which is the same number. It is only ever done to the property `governing()`
 * chose, so a bound the composition is not sizing this box with is left alone.
 *
 * `flex-basis` and `aspect-ratio` are deliberately not here even though the first
 * is a `BOUND`: writing either inline changes what the layout SOLVES rather than
 * lifting a clamp on the answer, and this surface reports a layout instead of
 * arguing with it.
 */
const LIFTS = {
  width: ['max-width', 'min-width'],
  height: ['max-height', 'min-height'],
};

/** Every property `applyTo()` may write and therefore has to be able to put back.
 *  The four axes' bounds included, because a preview lifts the one that governs. */
const WRITES = ['display', 'translate', 'width', 'height', ...LIFTS.width, ...LIFTS.height];

/**
 * The page's own zoom: the one Token every ladder on the page is a multiple of.
 *
 * WHY A BOX CANNOT ANSWER "MAKE EVERYTHING BIGGER". The four rows are one
 * element's, and an element's width is a width — scaling it takes the box with it
 * and leaves the photographs, the gaps and the type inside exactly where they
 * were. Worse, most boxes here have no size of their own to scale: the Front
 * Screen's column is a measure inside a Section pinned to the fold, so its height
 * is a fill that cannot be given anything at all. "Everything, at one percentage"
 * is therefore not a property of any box on the page. It is the root font-size,
 * because every measure, every gap and every glyph in both Sections is authored in
 * rem — `src/kernel/tokens/faces.css` is the three numbers and says so.
 *
 * NAMED HERE RATHER THAN DISCOVERED, and that is a decision rather than a
 * shortcut: there is exactly one zoom on this page, and a protocol for a Section
 * to declare its own would be machinery for a single number nobody has asked for
 * twice. If a second one ever exists, this is the line that has to become a
 * lookup. The surface degrades honestly meanwhile — `zoomToken()` answers null
 * where nothing declares it and the toggle says so rather than arming a gesture
 * with nothing behind it.
 */
const ZOOM = '--type-zoom';

/** A zoom, to the thousandth: it is a multiplier rather than a length, so the
 *  hundredth every box measurement is rounded to would be a visible step. */
const factor = (n) => Math.round(n * 1000) / 1000;

/** The same as a percentage, which is the unit the author actually asks in — "make
 *  it 30% bigger" — and the one the report line uses. */
const percent = (n) => `${Math.round(n * 1000) / 10}%`;

/** A declaration that is exactly one Token and nothing else. Anything else — a
 *  `calc()` holding one, a sum of two — is a relationship, and the Annotation
 *  says which Tokens it saw rather than offering to write it. */
const ONE_TOKEN = /^var\(\s*(--[a-z0-9-]+)\s*\)$/i;

/** Every Token named anywhere inside a value, for the case where it is not just
 *  one: naming the three constants a `calc()` is built out of is most of what an
 *  agent needs to decide which of them moved. */
const EVERY_TOKEN = /var\(\s*(--[a-z0-9-]+)/gi;

/** Astro's scoping, as it appears in a rule's own `selectorText`. Stripped before
 *  a selector is shown to anybody: `:where(.astro-yyvwusc4)` is the build's
 *  fingerprint, it is not in the source the author would go and edit, and it
 *  makes a one-line report three lines long. */
const stripScope = (selector) => selector.replace(/:where\(\.astro-[a-z0-9]+\)/gi, '').trim();

/** Astro's own scoping class, which is a build's fingerprint and changes with the
 *  component's bytes. Anything built out of it would name a different element
 *  after the next build, so an Override's selector never carries one. */
const SCOPED = /^astro-[a-z0-9]+$/i;

const round = (n) => Math.round(n * 100) / 100;

/** Whether this element draws words of its OWN — a child text node with something
 *  in it — rather than only containing elements that do. It is the question
 *  "whose `font-size` is this text drawn at" starts from. */
function owns(element) {
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim() !== '') return true;
  }
  return false;
}

/**
 * How many text-owning descendants are worth walking before a box is treated as
 * having no single text size.
 *
 * A CAP AND NOT A PERFORMANCE HEDGE, though it is that too. `authored()` walks
 * every rule in every stylesheet, so resolving the holders inside a whole Section
 * would be hundreds of those walks at the moment of a click — but the reason the
 * answer is refused rather than computed slowly is that a box holding forty
 * different pieces of text has no ONE text size, and a row claiming otherwise
 * would be worse than a row that says nothing.
 */
const TEXT_OWNERS = 32;

/**
 * Whether the keystroke belongs to a field the browser already has an undo for.
 *
 * A TEXT FIELD, AND DELIBERATELY NOT A NUMBER BOX. The Annotation textarea and the
 * Content surface's inputs hold prose being typed, and taking Ctrl-Z off them would
 * be this surface reaching into a field it does not own. A row's number box is the
 * opposite case: typing into one and committing it IS a gesture on this surface —
 * it goes through the same `commit()` a scrub does and writes the same Token — and
 * `paintPicked()` puts the focus back in that box afterwards. Standing down there
 * would make the press the author reaches for straight after the change they want
 * to take back do nothing at all, and the browser's own undo of a committed number
 * box gives them nothing in exchange.
 */
const TYPED = new Set(['text', 'search', 'url', 'email', 'tel', 'password']);

const typing = (target) =>
  target instanceof Element &&
  (target.matches('textarea') ||
    (target instanceof HTMLInputElement && TYPED.has(target.type)) ||
    target.closest('[contenteditable]') !== null);

/** The Recording's line for an Override standing in the file. One spelling, used
 *  by the press that writes one and by the undo that puts one back — two would
 *  drift, and the written list is keyed on what it says. */
const wroteOverride = (selector, declarations) => ({
  kind: 'override',
  what: selector,
  value: Object.entries(declarations)
    .map(([property, value]) => `${property}: ${value}`)
    .join('; '),
  file: 'src/overrides.css',
  where: 'an Override, and therefore debt',
});
const px = (n) => `${round(n)}px`;

/** A computed `translate` as two numbers. `none` and a single value are both
 *  ordinary answers: one axis omitted means zero. */
function reading(value) {
  const parts = String(value ?? '')
    .trim()
    .split(/\s+/)
    .map((part) => Number.parseFloat(part));
  return { x: Number.isFinite(parts[0]) ? parts[0] : 0, y: Number.isFinite(parts[1]) ? parts[1] : 0 };
}

/** The stylesheet holding every Override the file holds — see the note above. */
const sheet = () => {
  let style = document.querySelector('style[data-editor-overrides-sheet]');
  if (!style) {
    style = document.createElement('style');
    style.dataset.editorOverridesSheet = '';
    style.dataset.editor = '';
    // The BODY, so it is later in the document than the bundled stylesheet — and
    // last among the Editor's own sheets, because an Override outranks a Token.
    document.body.append(style);
  }
  return style;
};

/** One element's own compound selector: its tag, its id and its authored classes. */
function simple(element) {
  const tag = /^[a-z][a-z0-9]*$/.test(element.tagName.toLowerCase()) ? element.tagName.toLowerCase() : '';
  const id = /^[A-Za-z][A-Za-z0-9_-]*$/.test(element.id) ? `#${element.id}` : '';
  const classes = [...element.classList]
    .filter((one) => /^[A-Za-z_-][A-Za-z0-9_-]*$/.test(one) && !SCOPED.test(one))
    .map((one) => `.${one}`)
    .join('');
  return `${tag}${id}${classes}`;
}

/** The same, with a position among same-tag siblings when the compound alone does
 *  not tell them apart. */
function positioned(element) {
  const own = simple(element);
  const same = [...(element.parentElement?.children ?? [])].filter(
    (other) => other.tagName === element.tagName && simple(other) === own,
  );
  if (same.length < 2) return own;
  return `${own}:nth-of-type(${[...element.parentElement.children].filter((other) => other.tagName === element.tagName).indexOf(element) + 1})`;
}

const addresses = (candidate, element) => {
  let found;
  try {
    found = document.querySelectorAll(candidate);
  } catch {
    return false;
  }
  return found.length === 1 && found[0] === element;
};

/**
 * A selector that addresses this element and only this element.
 *
 * Built from the element upwards and stopped as soon as it is unique, so an
 * Override's selector is the shortest one that does the job — and CHECKED against
 * the page rather than assumed, because a selector that matched two elements would
 * move something the author was not looking at.
 *
 * Each level is tried as a CHILD chain before a descendant one, because that is
 * the only thing that separates the Projects Panel's Frame from the live clone of
 * it lying in the Plinth: the two carry the same classes, so no chain of
 * descendants ever tells them apart, and the composition's own stylesheet writes
 * `.projects-panel__stage > .projects-panel__frame` for exactly that reason. The
 * descendant form is still tried, and preferred at the SAME level, because it
 * survives a wrapper being introduced between two of the levels it skips.
 */
function selectorFor(element) {
  const parts = [];
  for (let node = element; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
    parts.unshift(positioned(node));
    for (const candidate of [`:root ${parts.join(' ')}`, `:root ${parts.join(' > ')}`]) {
      if (!addresses(candidate, element)) continue;
      try {
        return asSelector(candidate);
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Whether a grouping rule's condition holds right now.
 *
 * This is not defensive tidying: the Projects Panel writes `margin-left: 0px`
 * inside a `@media` that does not apply at a desktop width, and the first version
 * of this walk reported that 0 as what governed the Frame's position — a wrong
 * number in an Annotation, which is the one thing an Annotation may never carry.
 * A condition that cannot be evaluated here (`@container`) is treated as not
 * holding, because reporting a rule that may not apply is worse than reporting
 * none.
 */
function inForce(rule) {
  if (typeof rule.media?.mediaText === 'string') {
    try {
      return matchMedia(rule.media.mediaText).matches;
    } catch {
      return false;
    }
  }
  if (typeof rule.conditionText === 'string') {
    if (rule.cssText?.startsWith('@supports')) {
      try {
        return CSS.supports(rule.conditionText);
      } catch {
        return false;
      }
    }
    return false;
  }
  return true;
}

/**
 * What a stylesheet on this page declares for one property on this element.
 *
 * Every matching rule that is in force, in document order, last one wins — which
 * is specificity ignored, and deliberately: this is looking for the Token that
 * GOVERNS a length, and a composition does not declare the same length twice from
 * two different Tokens. The Editor's own sheets are skipped, or a Token this
 * surface previewed a moment ago would look like the composition's own
 * declaration.
 */
function declared(element, read) {
  let found = null;
  const walk = (rules) => {
    for (const rule of rules) {
      // A style rule IS a grouping rule now — CSS nesting gave `CSSStyleRule` a
      // `cssRules` of its own, empty for a rule with nothing nested in it. So a
      // rule is read AND descended into, never one or the other: the first
      // version of this treated a truthy `cssRules` as "not a declaration" and
      // therefore found nothing at all, anywhere, silently.
      if (rule.selectorText && rule.style) {
        let matches = false;
        try {
          matches = element.matches(rule.selectorText);
        } catch {
          matches = false;
        }
        const value = matches ? read(rule.style) : null;
        if (value) found = { value: String(value).trim(), selector: stripScope(rule.selectorText) };
      }
      if (rule.cssRules && inForce(rule)) walk(rule.cssRules);
    }
  };
  for (const style of document.styleSheets) {
    if (style.ownerNode?.dataset?.editor !== undefined) continue;
    let rules;
    try {
      rules = style.cssRules;
    } catch {
      continue;
    }
    walk(rules);
  }
  return found;
}

function authored(element, property) {
  return declared(element, (style) => style.getPropertyValue(property));
}

/**
 * The same walk, for ONE SIDE of a box shorthand.
 *
 * WHY IT CANNOT JUST ASK FOR THE LONGHAND, which is the trap that made this a
 * function rather than a call. `getPropertyValue('padding-top')` on a rule answers
 * the EMPTY STRING whenever the `padding` shorthand that set it carries a `var()`
 * — the longhands of such a shorthand are pending-substitution, and CSSOM
 * serialises them as nothing at all. The Front Screen declares
 * `padding: var(--front-screen-rhyme) var(--front-screen-side) 0`, so the one
 * property the fill gesture is about is exactly the one CSSOM will not hand over,
 * and `authored()` reported "nothing declares it" about a declaration in plain
 * sight.
 *
 * The longhand still comes FIRST where there is one, because CSSOM resolves the
 * two against each other correctly whenever it can: a `padding-top` after a
 * `padding` wins, and a `padding` after a `padding-top` overwrites it. Only the
 * case CSSOM blanks falls through to reading the shorthand.
 */
function authoredSide(element, group, side) {
  return declared(element, (style) => {
    const longhand = style.getPropertyValue(`${group}-${side}`);
    if (longhand !== '') return longhand;
    return sides(style.getPropertyValue(group))?.[side] ?? null;
  });
}

export class Measure {
  /**
   * @param {object} wiring
   * @param {string[]} wiring.glossary   CONTEXT.md's terms, from the server
   * @param {object[]} wiring.overrides  every Override the file holds
   * @param {{ section: string, tokens: object[] }[]} wiring.tokens  the state's Tokens
   * @param {import('./tokens.js').Tokens} wiring.surface  the Tokens surface, so a
   *   Token this one found is written through the control that already owns it
   * @param {(route: string, body: object) => Promise<any>} wiring.post
   * @param {(text: string, bad?: boolean) => void} wiring.say
   * @param {(n: number) => void} wiring.standing  told how many Overrides are standing
   * @param {import('./changes.js').Changes} [wiring.log]  the Recording, told about
   *   every completed gesture. Optional so this surface still works without one —
   *   a measurement is a measurement whether anything is keeping a list of them.
   */
  constructor({ glossary, overrides, tokens, surface, post, say, standing, log }) {
    this.glossary = glossary ?? [];
    this.overrides = overrides ?? [];
    this.tokens = tokens ?? [];
    this.surface = surface;
    this.post = post;
    this.say = say;
    this.standing = standing ?? (() => {});
    this.log = log ?? null;
    this.armed = false;
    /**
     * Whether a resize carries the text size with it.
     *
     * Off by default and said out loud when it goes on: a resize that silently
     * changed a second thing would be this tool taking a judgement instead of
     * reporting one, which is the line ADR 0004 draws. `lib/typefit.mjs` is the
     * ratio, and the reason it is a scale rather than a search.
     */
    this.fitting = false;
    /**
     * Whether a corner drag moves both axes by ONE ratio.
     *
     * "Scale the whole thing up or down by dragging the four corners" is the
     * gesture this is, and it is a mode rather than the default for the reason the
     * two beside it are: a corner that stopped following the pointer on one axis
     * without being asked would be this surface deciding what the author meant.
     * `lib/corners.mjs` is the arithmetic and which of the two ratios wins.
     *
     * IT COMPOSES WITH `scale text`, and that pair is the point of it: one ratio on
     * the box, the same ratio on the type, and a Recording that says what the ratio
     * was. Holding Shift through a corner drag is the same thing for one gesture.
     */
    this.scaling = false;
    /**
     * Whether a corner drag scales the WHOLE COMPOSITION rather than the box.
     *
     * The gesture behind "let me drag a corner diagonally and make everything
     * bigger by a percentage — the photographs and the text too". It is a different
     * thing from `resize by one ratio` and not a stronger version of it: that one
     * scales the picked box and leaves the page around it alone, and this one does
     * not touch the box at all — it multiplies the page's zoom, and the box follows
     * because its measure is in rem like everything else. `ZOOM` is which Token and
     * why a box could never have answered this.
     *
     * It writes on release, like a scrubbed row and unlike every other drag on this
     * surface, and the asymmetry is the same one `land()` describes: a drag that
     * moves a box is exploration and stays a measurement, and a drag that moves a
     * TOKEN is a change to the composition the author is entitled to make.
     */
    this.zooming = false;
    /**
     * Whether a change stays on the page when the selection leaves it.
     *
     * Off by default because the old behaviour is the right one for measuring ONE
     * element: put it back, and the page is the page again. It is the wrong one for
     * arranging several, which is what this exists for.
     */
    this.keeping = false;
    /**
     * Records whose inline styles are still standing but which are no longer
     * picked. `release()` puts one here instead of putting it back, and `record()`
     * takes it straight out again if it is picked a second time — which is what
     * makes a box moved twice read as one change from where it started rather than
     * two from wherever it got to.
     */
    this.kept = [];
    /**
     * Which lands are in flight, as the row plus the numbers being asked for.
     *
     * A GUARD ON AN ASYNC SEAM, and not a fix for anything seen on the page — worth
     * saying, because a note claiming a symptom nobody reproduced sends the next
     * session hunting one. `land()` awaits a POST, and a second commit of the SAME
     * row at the SAME numbers arriving inside that window would run `logged()` a
     * second time after `repick()` had already reset the measurement it recorded:
     * that reads as a measurement of nothing, and the Recording drops the entry the
     * first one had just put in it — the change on the page, in the file, and
     * missing from the document the author pastes.
     *
     * Keyed on the numbers as well as the row, so it can only ever skip a commit
     * that would have written exactly what is already being written. A genuine
     * second gesture at a different value has a different key and lands.
     */
    this.landing = new Set();
    /**
     * What is picked, primary first.
     *
     * A LIST and not one element (#166): "click a series of text and resize them"
     * is the thing the author asked for, and a series is what shift-click builds.
     * The first is the PRIMARY — its numbers are the ones in the rows, its
     * ancestors are the ones in the breadcrumb — and every change made to it is
     * made to the rest as well: the same absolute size, or the same distance
     * moved. One element is the ordinary case and is a list of one, so there is no
     * second code path for it.
     */
    this.selection = [];
    /** Where `↓` goes back to: the element the last `↑` climbed away from. */
    this.came = null;
    this.panel = null;
    this.marquees = [];
    this.dragging = null;
    /**
     * A press inside what is already picked, waiting to find out which gesture it
     * is: `{ element, x, y }`. Past `SLOP` it becomes a move of the SELECTION; if
     * the pointer never goes anywhere it was a click, and picks `element` — the
     * deepest thing under it — the way a press used to straight away.
     *
     * WHY IT WAITS: a box reached by climbing, or by a crumb, covers children, and
     * a press over one of them used to re-pick that child and drag it instead. So
     * the box the author had just chosen could not be moved by pressing anywhere it
     * actually covers — only on whatever bare strip of it was not a child. Pressing
     * inside now moves what is picked, and the click still goes deeper.
     *
     * Nothing is begun and nothing moves while a press is pending, which is what
     * makes that cheap: the click it may turn out to be leaves no step on the undo
     * stack and no block on the Recording.
     */
    this.pending = null;
    /**
     * What can be taken back, gesture by gesture. `lib/history.mjs` is the stack
     * and the rules; `replay()` below is what a step MEANS.
     */
    this.history = new History();
    /**
     * The `wanted` every picked element stood at when the gesture now under way
     * began, as `{ element, from }`.
     *
     * Taken at the pointerdown and NEVER read off `before`, for the same reason
     * `lib/corners.mjs` resolves its sizes there: an element being dragged for the
     * second time is standing on the first drag, so `before` is where the
     * composition had it and `from` is where THIS gesture found it. Undo has to go
     * back one gesture and not all the way home — *put back* is the press for all
     * the way home, and it is a step of its own.
     */
    this.gesture = null;
    /** Whether an undo or a redo is in flight. It writes Tokens and Overrides, so
     *  it awaits POSTs, and a second press inside that window would reverse a step
     *  against a page half way through the last one. */
    this.replaying = false;
  }

  /** The primary — whose numbers the rows show, and whose ancestors the
   *  breadcrumb lists. */
  get picked() {
    return this.selection[0] ?? null;
  }

  // -------------------------------------------------------------------------
  // Naming, and finding the Token behind a length
  // -------------------------------------------------------------------------

  /** The tail of a `section__part` class — the one the glossary names if any of
   *  them is, and otherwise the most specific. */
  partOf(element, section) {
    const parts = [...element.classList]
      .filter((one) => one.startsWith(`${section}__`))
      .map((one) => one.slice(section.length + 2))
      .filter((one) => one !== '');
    if (parts.length === 0) return null;
    const known = parts.find((part) => name({ section, part }, this.glossary).vocabulary);
    return known ?? parts.at(-1);
  }

  /** Everything `name()` needs to say what an element is. */
  describe(element) {
    const root = element.closest('[data-section]');
    const section = root?.dataset.section ?? null;
    const inside = [];
    if (section) {
      for (let node = element.parentElement; node && root.contains(node); node = node.parentElement) {
        const part = this.partOf(node, section);
        if (part) inside.push(part);
      }
    }
    const siblings = [...(element.parentElement?.children ?? [])].filter(
      (other) => other.tagName === element.tagName,
    );
    return name(
      {
        section,
        root: root === element,
        part: section ? this.partOf(element, section) : null,
        inside,
        tag: element.tagName,
        nth: siblings.length > 1 ? siblings.indexOf(element) + 1 : null,
        of: siblings.length > 1 ? siblings.length : null,
      },
      this.glossary,
    );
  }

  /** Every Token in the state declaring one custom property. */
  declaring(property) {
    const found = [];
    for (const { section, tokens } of this.tokens) {
      for (const token of tokens) {
        if (token.property === property) found.push({ section, token });
      }
    }
    return found;
  }

  /**
   * The page's zoom, as everything needed to preview it and write it — or null.
   *
   * Read through `declaring()` rather than out of a field of its own, which is what
   * keeps the value CURRENT: the Tokens surface writes `token.value` back onto the
   * very object the state handed both surfaces, so a second zoom in one session
   * reads what the first one left rather than what the build was made from. That is
   * exactly what makes undo of the second gesture land on the first's value instead
   * of all the way home.
   *
   * Null is an ordinary answer and not a failure: a page that declares no zoom
   * cannot be zoomed, and the toggle says so rather than arming a gesture with
   * nothing behind it.
   */
  zoomToken() {
    const declaring = this.declaring(ZOOM);
    // More than one is refused for the same reason a Token declared on two rules is
    // refused everywhere else here: which one the page is using is a judgement, and
    // this surface reports a judgement rather than taking one.
    if (declaring.length !== 1) return null;
    const { section, token } = declaring[0];
    const at = Number.parseFloat(token.value);
    if (!Number.isFinite(at) || at <= 0) return null;
    return { section, token, at };
  }

  /**
   * The Token that governs each axis, if the composition has one.
   *
   * Read once, when the element is picked: what governs a length does not change
   * because the length did, and walking every stylesheet on every frame of a drag
   * would be the one thing in this surface that felt slow.
   *
   * THE TEXT ROW IS READ OFF THE ELEMENT THAT CARRIES THE TYPE and the four box
   * rows off the box, which is `typeHolders()`'s whole point: the words inside a
   * list are set by the rule on its items, so asking the list what governs its
   * `font-size` finds nothing at all and offers a row backed by nothing for a size
   * the composition names.
   *
   * A TOKEN OUTRANKS THE ORDER, and that is the one rule here that is not simply
   * `GOVERNED`'s list read top to bottom. `GOVERNED` is ordered by how directly a
   * property states a length, and it used to stop at the FIRST property the
   * composition declared — so `width: 100%` beside `max-width: var(--a-token)`
   * answered "a literal, and not a Token at all", because `width` comes first and
   * `100%` is not a Token. That is the wrong half of the pair: `100%` says the box
   * FILLS, the `max-width` says how wide it may get, and the number the author
   * measured is the second one. The Front Screen's column is that shape, and the
   * symptom is a row that reports a length nothing can write and a drag that moves
   * nothing.
   *
   * So every declared candidate is collected, and the first that is exactly ONE
   * TOKEN wins — provided that, where it is a bound, the box is actually STANDING
   * on it, because a `max-width` the box is nowhere near is not what decided its
   * size. Failing all that, the first candidate is the answer, exactly as before.
   * The order among Tokens is still `GOVERNED`'s, so this can only ever turn "no
   * Token governs this" into a Token, and never one Token into another.
   */
  governing(element, type = element) {
    const found = {};
    for (const axis of MEASURES) {
      const on = axis === TEXT ? type : element;
      const candidates = [];
      for (const [property, sign] of GOVERNED[axis]) {
        const declaration = authored(on, property);
        if (!declaration) continue;
        const one = ONE_TOKEN.exec(declaration.value);
        candidates.push({
          property,
          sign,
          on: declaration.selector,
          was: declaration.value,
          token: one?.[1] ?? null,
          // What the bound itself comes to, so a measurement can ask whether the
          // box is actually standing on it before offering to restate it.
          computed: Number.parseFloat(getComputedStyle(on).getPropertyValue(property)),
          // Every Token the value mentions, for the case where it mentions
          // several: naming the constants a `calc()` is built out of is most of
          // what an agent needs to decide which of them moved.
          inside: [...new Set([...declaration.value.matchAll(EVERY_TOKEN)].map((seen) => seen[1]))],
        });
      }
      if (candidates.length === 0) continue;
      // The size to test a bound against, and only the two axes that HAVE one: a
      // `left` and a text size have no bound in `GOVERNED` at all, so the question
      // never arises for them and asking it would need a number that means nothing.
      const size = axis === 'width' || axis === 'height' ? this.box(element)[axis] : null;
      found[axis] = candidates.find((one) => this.settles(one, size)) ?? candidates[0];
    }
    return found;
  }

  /**
   * Whether one candidate is the Token that settled this length.
   *
   * The bound test is the same arithmetic `measurement()` does before offering to
   * restate one, and it is here as well rather than only there because the two
   * questions are the same question at two moments: *is this bound what decided the
   * size* at the pick, and *is it still* at the commit. Both are exact rather than
   * approximate — every Section sets `box-sizing: border-box`, so a computed
   * `max-width` and a measured border box are the same number — and a candidate
   * this cannot settle is passed over rather than guessed at, which lands on the
   * behaviour that was there before.
   */
  settles(candidate, size) {
    if (candidate.token === null) return false;
    if (!BOUND.has(candidate.property)) return true;
    return (
      Number.isFinite(size) && Number.isFinite(candidate.computed) && Math.abs(candidate.computed - size) < 0.5
    );
  }

  // -------------------------------------------------------------------------
  // A box that has no size of its own
  // -------------------------------------------------------------------------

  /**
   * Whether writing a size on this axis moves the box at all.
   *
   * ASKED OF THE PAGE RATHER THAN OF THE STYLESHEET, and that is the decision here.
   * The obvious implementation reads `flex-grow` and the parent's `display` and
   * reasons about the flex algorithm — and it would be wrong about `align-self:
   * stretch`, about a grid item, about a box stretched by `top` and `bottom`
   * together, and about whatever the next composition does. "A size was written and
   * the box did not move" is not a proxy for the failure this gesture exists for:
   * it IS the failure, exactly, whatever caused it.
   *
   * One forced layout, at the moment a corner is taken hold of and never per frame.
   * The probe is put back before it returns — including a size that was already
   * standing, with its priority, because a drag on a kept change starts from an
   * inline style this surface itself wrote.
   */
  swallowed(element, axis) {
    const from = element.getBoundingClientRect()[axis];
    if (!(from > 0)) return false;
    const was = element.style.getPropertyValue(axis);
    const priority = element.style.getPropertyPriority(axis);
    element.style.setProperty(axis, `${round(from + 16)}px`, 'important');
    const to = element.getBoundingClientRect()[axis];
    element.style.removeProperty(axis);
    if (was !== '') element.style.setProperty(axis, was, priority);
    return Math.abs(to - from) < 0.5;
  }

  /**
   * The parent's padding a corner drag would have to close to move this edge, as
   * everything needed to preview it and write it — or a refusal saying why not.
   *
   * WHY THE PARENT'S PADDING IS THE ANSWER. A box that is its parent's remainder
   * has no size of its own: the flex algorithm hands it whatever is left, so the
   * only numbers that decide how tall it is are the parent's own height and the
   * padding holding it off the parent's edges. The height is the composition's
   * (the Front Screen's is `calc(var(--fold) - …)`, a budget rather than a
   * measure); the padding is the margin the author is looking at. So the edge under
   * the pointer is the padding on that side of the parent, and dragging the box's
   * corner closes it.
   *
   * IT REFUSES RATHER THAN GUESSING, three ways, and each refusal is a sentence the
   * author gets: a padding declared as something other than exactly one Token is a
   * relationship this may not rewrite; a Token no Section declares belongs to the
   * Kernel, which ADR 0004's surface cannot reach; and a padding already at zero
   * has no ratio that opens it again.
   */
  fill(element, axis, corner) {
    const edge = EDGES[corner]?.[axis];
    const parent = element.parentElement;
    if (!edge || !parent) return null;

    const declaration = authoredSide(parent, 'padding', edge);
    const from = Number.parseFloat(getComputedStyle(parent).getPropertyValue(`padding-${edge}`));
    const named = { axis, edge, parent, from };
    if (!declaration) {
      return { ...named, why: `nothing declares a padding-${edge} on the box around it` };
    }
    const one = ONE_TOKEN.exec(declaration.value);
    if (!one) {
      const inside = [...new Set([...declaration.value.matchAll(EVERY_TOKEN)].map((seen) => seen[1]))];
      return {
        ...named,
        why:
          `its padding-${edge} is ${declaration.value}` +
          (inside.length > 0
            ? `, a relationship built out of ${list(inside)} — which of those moved is the decision rather` +
              ' than a length to write'
            : ', a literal in the composition and not a Token at all'),
      };
    }
    const declaring = this.declaring(one[1]);
    if (declaring.length !== 1) {
      return {
        ...named,
        why:
          declaring.length === 0
            ? `${one[1]} is not in any Section’s tokens.css, so it belongs to the Kernel and ADR 0004’s` +
              ' surface cannot reach it'
            : `${one[1]} is declared on ${declaring.length} rules, so which one the page is using here is a` +
              ' judgement rather than a lookup',
      };
    }
    if (!(from > 0)) {
      return { ...named, why: `its padding-${edge} is already nothing, and no ratio opens it again` };
    }
    return { ...named, token: one[1], section: declaring[0].section, held: declaring[0].token };
  }

  /**
   * Every axis of this corner that is a fill, resolved.
   *
   * ONLY WHERE `governing()` FOUND NOTHING, which is what keeps this out of the way
   * of the two gestures that already work. A box the composition sizes with a Token
   * — including one it sizes with a `max-width` the drag LIFTS — is not a fill
   * however the flex algorithm treats it, and the existing path owns it. The Front
   * Screen's column is one of each: its width is `--front-screen-measure` and its
   * height is the Section's remainder, so a corner on it drags a size one way and a
   * padding the other.
   */
  fills(corner) {
    if (!this.picked) return [];
    const found = [];
    for (const axis of ['width', 'height']) {
      if (this.picked.governs[axis]) continue;
      if (!this.swallowed(this.picked.element, axis)) continue;
      const one = this.fill(this.picked.element, axis, corner);
      if (one) found.push(one);
    }
    return found;
  }

  // -------------------------------------------------------------------------
  // Picking, dragging, measuring
  // -------------------------------------------------------------------------

  box(element) {
    const rect = element.getBoundingClientRect();
    const parent = element.parentElement?.getBoundingClientRect();
    return {
      left: round(rect.left - (parent?.left ?? 0)),
      top: round(rect.top - (parent?.top ?? 0)),
      width: round(rect.width),
      height: round(rect.height),
    };
  }

  /** The element's own text size, in px. Computed, because that is the number the
   *  reader is looking at whatever the file says. */
  typeSize(element) {
    return round(Number.parseFloat(getComputedStyle(element).fontSize));
  }

  /**
   * The elements whose `font-size` the words inside this one are actually drawn
   * at.
   *
   * THIS IS THE ANSWER TO "RESIZING IT DOES NOTHING TO THE TEXT". Every box has a
   * `font-size` — an inherited one where it declares none — so the old row always
   * had a number to show and `scale text` always had a number to multiply. But a
   * box that draws no words of its own passes that number to nothing: the
   * elements inside it that DO draw words declare their own, and an inherited size
   * loses to a declared one. The Projects Panel's Rail is exactly that shape, and
   * so is every other list on this page: the author resizes the list and each item
   * inside it sets `font-size` for itself, so the row read 16px that governed
   * nothing and the type never moved.
   *
   * SO THE HOLDER IS THE NEAREST ANCESTOR OF EACH PIECE OF TEXT THAT DECLARES ONE,
   * and the element itself where nothing between them does — which is the case
   * where the old behaviour was already right, and it stays exactly as it was.
   * `authored()` is memoised across the walk because the chains overlap: a list of
   * five items is eleven elements and five distinct questions.
   *
   * A DESCENDANT WITH NO BOX IS NOT TEXT ON THE PAGE. `display: none` draws
   * nothing, and letting it into the answer would let a size nobody can see
   * disagree with the size everybody can and take the row away from both.
   */
  typeHolders(element) {
    if (owns(element)) return [element];
    const owners = [];
    for (const node of element.querySelectorAll('*')) {
      if (!owns(node)) continue;
      if (node.getClientRects().length === 0) continue;
      owners.push(node);
      if (owners.length > TEXT_OWNERS) return [element];
    }
    if (owners.length === 0) return [element];
    const seen = new Map();
    // AN INLINE `font-size` IS A DECLARATION TOO, which matters here for exactly one
    // reason: the `keep` toggle leaves this surface's own previews standing, so an
    // element whose type was scaled and then let go of is drawn at a size no
    // stylesheet holds. Picking its parent afterwards has to find it there, or the
    // row would report a size the page stopped showing several gestures ago.
    const declares = (node) => {
      if (node.style.fontSize !== '') return true;
      if (!seen.has(node)) seen.set(node, authored(node, 'font-size'));
      return seen.get(node) !== null;
    };
    const holders = [];
    for (const owner of owners) {
      let holder = element;
      for (let node = owner; node && node !== element; node = node.parentElement) {
        if (declares(node)) {
          holder = node;
          break;
        }
      }
      if (!holders.includes(holder)) holders.push(holder);
    }
    return holders;
  }

  /**
   * The selector an Override of this text size would have to be written on.
   *
   * NOT `selectorFor()`, and that is the point. That one builds a path to ONE
   * element, which is right for a box and wrong for the type inside a list: five
   * items set by one rule are one declaration in the composition, and five
   * Overrides naming five items would be the tool inventing a distinction the page
   * does not make. So the selector is the composition's own — the rule the holders
   * answer to — and it is CHECKED against the page before it is offered: a rule
   * that also reaches text outside the box the author is looking at would move
   * something they never picked, which is the one guarantee the Override boundary
   * makes.
   */
  typeSelector(element, on) {
    if (typeof on !== 'string' || on === '') return null;
    let selector;
    try {
      selector = asSelector(`:root ${on}`);
    } catch {
      return null;
    }
    let found;
    try {
      found = [...document.querySelectorAll(selector)];
    } catch {
      return null;
    }
    if (found.length === 0) return null;
    if (found.some((node) => !element.contains(node))) return null;
    return selector;
  }

  /**
   * Everything one record tracks about the type inside an element: where it is
   * written, what it reads now, and what the inline styles there were before this
   * surface touched them.
   *
   * `own` is the ordinary case — the element draws its own words — and everything
   * downstream of here reads the same as it always did for it. Where it is false
   * the row has been taken off the box and put on the text, and the Annotation, the
   * Recording and the Override all have to say so rather than describing a
   * `font-size` on an element that would ignore it.
   */
  typeRecord(element) {
    const holders = this.typeHolders(element);
    const own = holders.length === 1 && holders[0] === element;
    const answer = own
      ? { size: this.typeSize(element), selector: null }
      : carried(
          holders.map((node) => ({
            size: this.typeSize(node),
            selector: authored(node, 'font-size')?.selector ?? null,
          })),
        );
    // No single answer means the words inside are set at several sizes, and one row
    // cannot show two numbers. Back to the element's own inherited size, which is
    // what the row has always shown — and `split` is what the row's own tooltip
    // says about it, because "this does nothing" with no reason given is the
    // complaint this whole walk exists to answer.
    if (answer === null) {
      return {
        on: [{ element, was: element.style.fontSize }],
        own: true,
        split: holders.length,
        selector: null,
        before: this.typeSize(element),
        after: this.typeSize(element),
      };
    }
    return {
      on: (own ? [element] : holders).map((node) => ({ element: node, was: node.style.fontSize })),
      own,
      split: 0,
      selector: own ? null : this.typeSelector(element, answer.selector),
      before: answer.size,
      after: answer.size,
    };
  }

  /** What the type inside a record reads right now. Off the holder and never off
   *  the element, or a resized list would report the size it inherited while the
   *  page showed the size its items were scaled to. */
  typeNow(held) {
    return this.typeSize(held.type.on[0].element);
  }

  /**
   * Everything this surface tracks about one element, ready to be dragged.
   *
   * A KEPT ELEMENT IS RESUMED RATHER THAN RECORDED AGAIN, and that is the whole of
   * why `kept` is a list of records and not a list of elements. Its `before` box,
   * its `base` translate, its picked text size and the Tokens governing it were all
   * read when the page still had it where the composition put it; reading them
   * again now would read a page this surface has already moved, so "move it, pick
   * something else, come back and move it a bit more" would report the second
   * nudge and lose the first — and the Recording, the Annotation and the Override
   * would every one of them describe a change nobody made.
   */
  record(element) {
    const at = this.kept.findIndex((held) => held.element === element);
    if (at !== -1) {
      const [held] = this.kept.splice(at, 1);
      // Where it actually stands now, which is the one thing that has to be read
      // fresh: `after` is a measurement and everything else on the record is the
      // starting point the measurement is against.
      held.after = this.box(element);
      held.type.after = this.typeNow(held);
      return held;
    }
    const parent = element.parentElement;
    const computed = getComputedStyle(element);
    const type = this.typeRecord(element);
    const held = {
      element,
      named: this.describe(element),
      selector: selectorFor(element),
      parent: parent
        ? { phrase: this.describe(parent).phrase, ...this.box(parent) }
        : { phrase: 'the page', width: innerWidth, height: innerHeight },
      // `translate` is a DELTA, and the element may already have one from its own
      // composition or from an Override standing on it. So the base is read here
      // and every later translate is written as base + delta: without it, the
      // first drag of an already-translated element jumps by the original amount
      // and the Annotation's numbers describe a position nobody asked for.
      base: reading(computed.translate),
      // `width`, `height` and `translate` do not apply to a non-replaced INLINE
      // box, so a <span> or an <a> — most of the text on this page — could be
      // dragged with no effect at all. Promoting it is the only way to measure it,
      // and it is said out loud rather than done quietly, because it is a real
      // difference between what was measured and what the page does today.
      promoted: computed.display === 'inline',
      before: this.box(element),
      after: this.box(element),
      // The text size, tracked beside the box rather than in it: it has no share
      // of a parent and no opposite corner, so `lib/annotations.mjs` keeps it out
      // of `AXES` and so does this. It carries its own `was` per holder rather than
      // joining the four below, because the holders are not always this element —
      // see `typeHolders()`.
      type,
      wanted: { dx: 0, dy: 0, width: null, height: null, size: null },
      /**
       * The one ratio the last gesture on this element asked for, where that
       * gesture was a proportional resize, and null where it was anything else.
       *
       * PER MEMBER AND NOT PER GESTURE, for the reason `fitType()` derives per
       * member: `want()` gives every picked element the same absolute size, so a
       * series of five boxes of five different widths is five different ratios,
       * and each one's own is the number its block in the Recording has to carry.
       *
       * Measured from `before` — the box at the PICK — and not from where the drag
       * started, so it agrees with the table printed above it. An element picked,
       * dragged, and dragged again reports one ratio from where the composition had
       * it, which is the number an agent can act on.
       */
      by: null,
      // Every property `applyTo()` may write, so *put back* can put every one of
      // them back. `WRITES` and not four names spelled here: a preview lifts the
      // bound that governs a size, and a bound this forgot to record would be
      // lifted and then left lifted — the box staying where a discarded drag put
      // it, which reads as an Override that was never written.
      was: Object.fromEntries(WRITES.map((property) => [property, element.style.getPropertyValue(property)])),
      governs: this.governing(element, type.on[0].element),
    };
    if (held.promoted) {
      element.style.setProperty('display', DISPLAY, 'important');
      held.before = this.box(element);
      held.after = this.box(element);
    }
    return held;
  }

  /**
   * Pick an element, or add it to what is already picked.
   *
   * `add` is shift-click, and it is the whole of the multi-selection: a second
   * click on something already in the selection takes it out again, so a series is
   * built and corrected with one gesture rather than a mode.
   */
  pick(element, add = false) {
    if (!add) {
      this.clear();
      this.selection = [this.record(element)];
    } else {
      const at = this.selection.findIndex((held) => held.element === element);
      if (at !== -1) {
        // Out again — releasing only this one, because the rest are still picked.
        // `release` and not `put`: a shift-click out of a series it has already been
        // dragged with is "I am done with that one", and one out of a series that
        // has not moved is the wrong-pick correction this gesture was added for.
        // `release` tells those two apart by whether anything was asked for, so one
        // rule covers both.
        this.release(this.selection[at]);
        this.selection.splice(at, 1);
        this.paintPicked();
        this.say(
          this.selection.length === 0
            ? 'nothing is picked'
            : `dropped it — ${this.selection.length} still picked`,
        );
        return;
      }
      if (this.selection.length === 0) this.selection = [this.record(element)];
      else this.selection.push(this.record(element));
    }
    this.came = null;
    this.paintPicked();
    if (this.selection.length > 1) {
      return this.say(
        `${this.selection.length} picked — the rows are ${this.picked.named.phrase}’s, and every change is made` +
          ' to all of them',
      );
    }
    const { selector, named, promoted } = this.picked;
    this.say(
      selector === null
        ? `picked ${named.phrase} — nothing here can address it uniquely, so an Annotation can be` +
            ' taken but an Override cannot be written'
        : `picked ${named.phrase}${promoted ? ` — an inline box, so it is measured as ${DISPLAY}` : ''} —` +
            ' drag from anywhere inside it to move it, drag a corner, scrub a row, click inside it to pick' +
            ' something smaller, or shift-click to pick more',
      selector === null,
    );
  }

  /**
   * Pick the same elements again, from where the page now is. What a Token write
   * needs: the page has moved under the selection, so every `before` is stale.
   *
   * IT PUTS BACK RATHER THAN RELEASING, whatever the keep toggle says, and it is
   * the one place in this file that does. Keeping is for a change this surface is
   * still holding in an inline style; by the time this runs the change is in a
   * Token and the page is showing it through the Tokens surface's own preview, so
   * keeping the inline styles would show it TWICE — which is exactly what
   * `writeTokens`'s note says this call exists to prevent. It does not go through
   * `clear()` for the same reason.
   */
  repick() {
    const elements = this.selection.map((held) => held.element);
    for (const held of this.selection) this.put(held);
    this.selection = [];
    this.came = null;
    this.selection = elements.map((element) => this.record(element));
    this.paintPicked();
  }

  /** Put one element back the way the page had it — including a promotion this
   *  surface made in order to be able to measure it at all. */
  put(held) {
    for (const [property, was] of Object.entries(held.was)) {
      held.element.style.removeProperty(property);
      if (was !== '') held.element.style.setProperty(property, was);
    }
    // The type separately, because it is not always on this element — a list's
    // words are on its items, and putting the list back has to put those back.
    for (const { element, was } of held.type.on) {
      element.style.removeProperty('font-size');
      if (was !== '') element.style.setProperty('font-size', was);
    }
    held.wanted = { dx: 0, dy: 0, width: null, height: null, size: null };
    held.by = null;
    held.after = this.box(held.element);
    held.type.after = this.typeNow(held);
  }

  /** Whether anything has actually been asked of this element yet. A pick with
   *  nothing asked of it is not a change, however long it was looked at — which is
   *  what lets `release()` tell a finished arrangement from a wrong pick. */
  changed(held) {
    const { dx, dy, width, height, size } = held.wanted;
    return dx !== 0 || dy !== 0 || width !== null || height !== null || size !== null;
  }

  /**
   * Let go of one element: keep the change standing, or put it back.
   *
   * The keep toggle's one decision, in one place, so everything that lets go of a
   * selection — a new pick, a shift-click out of a series, Escape, leaving the
   * surface — behaves the same way. An element nothing was asked of is put back
   * whatever the toggle says, and that is not an exception to the rule but the
   * reason there is only one: it takes the `display: inline-block` promotion off
   * something that was picked and looked at, which is not a change anybody made.
   */
  release(held) {
    if (this.keeping && this.changed(held)) {
      const at = this.kept.findIndex((one) => one.element === held.element);
      if (at !== -1) this.kept.splice(at, 1);
      this.kept.push(held);
      // The Recording has to say this once at the top of the document: a change
      // left standing means anything measured after it — and anything measured
      // INSIDE it — was measured against a page that already had it, so the
      // measurements compose. Told here rather than read off the toggle, because
      // what matters is whether it actually happened.
      this.log?.composed();
      return;
    }
    this.put(held);
    // AND THE UNDO STACK LOSES IT. The page has just dropped every gesture this
    // element carried, and there is no record left to put them back into — so a
    // step still naming it would either do nothing at all or, worse, appear to work
    // while restoring numbers measured against a page that has moved. This is the
    // one place that forgets, and it is the `keep`-off branch on purpose: with the
    // toggle ON the record goes to `this.kept` and every step naming it is still
    // reversible.
    this.history.forget(held.element);
    this.paintHistory();
  }

  /** Every picked element back where the page had it, still picked. */
  restore(report = true) {
    if (this.selection.length === 0) return;
    // A STEP OF ITS OWN, and the press undo exists beside rather than replaces:
    // this one goes all the way home and undo goes back one gesture. Recorded, so a
    // mis-press here costs nothing either.
    this.begin();
    for (const held of this.selection) {
      this.put(held);
      // Putting back is undoing, so the Recording loses it too. Anything else and
      // a change the author took off the page would still be in the document they
      // paste, which is the one way this log can be actively wrong.
      this.log?.forget(held.element);
    }
    this.finish(`putting ${this.naming()} back`);
    this.paintPicked();
    if (report) this.say(`${this.spoken()} back where the page had it`);
  }

  /**
   * The whole page back the way the build had it — the selection AND everything
   * the keep toggle left standing.
   *
   * Without this there is no way back from a kept arrangement short of a reload,
   * and a reload takes the Recording with it. `put back` next to the rows is the
   * primary's; this is the session's, so it lives on the Recording beside the list
   * it empties.
   */
  putAllBack() {
    const n = this.selection.length + this.kept.length;
    const all = [...this.selection, ...this.kept];
    // The kept records go on the step rather than being thrown away with the list.
    // They are the only thing that knows where those elements started, and without
    // them an undo of this press would have nothing to apply its numbers to.
    const kept = [...this.kept];
    this.begin(all);
    for (const held of all) {
      this.put(held);
      this.log?.forget(held.element);
    }
    this.kept = [];
    this.finish('putting the whole page back', { of: all, kept });
    this.paintPicked();
    this.say(
      n === 0
        ? 'nothing was standing on the page to put back'
        : `${n} element(s) back where the page had it — the Recording lost them too`,
    );
  }

  /** Nothing picked, and nothing left behind on the page unless the keep toggle
   *  says otherwise. */
  clear() {
    for (const held of this.selection) this.release(held);
    this.selection = [];
    this.came = null;
    // A press waiting to find out what it is was waiting inside one of THESE, so it
    // goes with them: Escape or leaving the surface between the press and the
    // release must not leave a click behind to pick something afterwards.
    this.pending = null;
  }

  /** What to call the selection in a report line. */
  spoken() {
    if (this.selection.length === 0) return 'nothing';
    return this.selection.length === 1
      ? `${this.picked.named.phrase} is`
      : `all ${this.selection.length} picked are`;
  }

  /**
   * Show what has been dragged so far, and measure what actually happened.
   *
   * Written `!important`, which is the thing here worth reading twice: an element
   * that already carries an OVERRIDE is being held by a rule that is itself
   * `!important`, and a plain inline style loses to it. Without this, the second
   * measurement of anything already overridden moves nothing and reports
   * "unchanged" — so a standing Override would quietly make its own element
   * unmeasurable, and the only way to adjust one would be to discard it first.
   *
   * Every picked element, because the selection is what a change is made to.
   */
  apply() {
    for (const held of this.selection) this.applyTo(held);
    this.paintPicked();
  }

  /**
   * The text size that follows a resize, while the `scale text` toggle is on.
   *
   * CALLED FROM THE TWO PLACES A RESIZE IS EXPRESSED and never from `apply()`,
   * which is the one thing here that would look tidier and be wrong: `apply()` also
   * runs after the text-size row is scrubbed, so deriving there would overwrite the
   * number the author had just typed or dragged with the box's ratio, and the row
   * would appear to do nothing at all.
   *
   * PER MEMBER, because the ratio is each element's own. `want()` gives every
   * picked element the same absolute width, so five boxes of five different widths
   * are five different ratios — and each one's type following its own box is what
   * "scale text" means. The size is derived from the size it was PICKED at, so
   * fifty frames of one drag arrive at one answer rather than compounding fifty.
   *
   * It asks a question and answers it in the `wanted` it was given; what the ratio
   * WAS is `scaled()`, which is the same question asked without moving anything.
   */
  fitType() {
    if (!this.fitting) return;
    for (const held of this.selection) {
      const answer = fitted(held.type.before, held.before, held.wanted);
      if (answer === null) continue;
      held.wanted.size = answer.size;
    }
  }

  /** What the `scale text` toggle derived for the primary, where it derived
   *  anything — which is what the Recording carries so the block can say the text
   *  size was not scrubbed. */
  scaled() {
    if (!this.fitting || !this.picked) return null;
    const answer = fitted(this.picked.type.before, this.picked.before, this.picked.wanted);
    return answer === null ? null : { by: answer.by };
  }

  applyTo(held) {
    const { element, wanted, base } = held;
    const set = (property, value) => {
      element.style.removeProperty(property);
      if (value === null) {
        if (held.was[property] !== '') element.style.setProperty(property, held.was[property]);
      } else {
        element.style.setProperty(property, value, 'important');
      }
    };
    if (held.promoted) set('display', DISPLAY);
    // base + delta, and never the delta alone: see the note on `base` in record().
    set(
      'translate',
      wanted.dx === 0 && wanted.dy === 0 && base.x === 0 && base.y === 0
        ? null
        : `${round(base.x + wanted.dx)}px ${round(base.y + wanted.dy)}px`,
    );
    // BEFORE the sizes, and the order is load-bearing: a padding in `em` is a
    // share of this very number, and the inset subtracted below is read off the
    // page once it is standing at it.
    //
    // AND ON THE HOLDERS, WHICH ARE NOT ALWAYS THIS ELEMENT. A size written on a
    // box whose words are set by the rule on its own children is a declaration
    // nothing ever reads — the whole of what "resizing the Rail does nothing to
    // its text" was. `typeHolders()` is which elements, and it answers this one
    // in the ordinary case.
    for (const { element: node, was } of held.type.on) {
      node.style.removeProperty('font-size');
      if (wanted.size === null) {
        if (was !== '') node.style.setProperty('font-size', was);
      } else {
        node.style.setProperty('font-size', `${wanted.size}px`, 'important');
      }
    }
    // A MEASURED size is a BORDER box and a WRITTEN one is a CONTENT box unless
    // the element says otherwise, so the two are converted rather than confused.
    // `lib/boxes.mjs` is the whole reason, and it is not cosmetic: `resize()`
    // derives a corner's MOVE from the size it asked for, so an inflated box
    // drifts its anchor by padding-plus-border and stays drifted.
    const sizes = asWritten(wanted, insets(getComputedStyle(element)));
    set('width', sizes.width === null ? null : `${sizes.width}px`);
    set('height', sizes.height === null ? null : `${sizes.height}px`);
    // AND THE BOUND THAT WOULD CLAMP IT, where the composition sizes this box with
    // one. `LIFTS` is the whole reason; the short version is that `max-width` beats
    // an `!important` inline `width` because importance does not settle a fight
    // between two different properties, so without this the drag writes a style and
    // the box does not move. Only the property `governing()` chose, and only while
    // a size is being asked for — a `null` puts it back like everything else here.
    for (const axis of ['width', 'height']) {
      const governed = held.governs[axis];
      if (!governed || !LIFTS[axis].includes(governed.property)) continue;
      set(governed.property, sizes[axis] === null ? null : `${sizes[axis]}px`);
    }
    // MEASURED and not computed: a flex child whose width is capped ends up
    // somewhere other than where it was dragged to, and a text size the page
    // clamps lands somewhere other than where it was scrubbed. The number the
    // author wants in the Annotation is where it actually is.
    held.after = this.box(element);
    held.type.after = this.typeNow(held);
  }

  /**
   * The one thing a corner drag can fail at that its own numbers do not show.
   *
   * `resize()` holds the anchor by translating the box by exactly what its width
   * lost, which is right only when the LAYOUT holds the left edge still. A box
   * placed by `margin-inline: auto` moves both edges as it narrows, so the anchor
   * drifts by half the delta; one placed by `justify-content: flex-end` or
   * `margin-left: auto` drifts by all of it.
   *
   * Nothing here fights that, and that is the decision rather than the shortfall.
   * `applyTo()` re-measures, so the read-out and the Annotation already say
   * truthfully where the box landed — a tool that moved the layout to hold a
   * corner would be COMPUTING a position instead of reporting one, which is the
   * line ADR 0004 draws. What was missing is that the author was not told, so the
   * drag felt wrong under the pointer with nothing on screen saying why.
   *
   * Measured from where the box stood when THIS DRAG started, and not from where
   * it was picked. An element that was moved first is standing on a translate the
   * author asked for, and blaming the layout for it would fire this line on the
   * ordinary "drag it over there, then size it" and teach the author to ignore it.
   *
   * Returns a clause to hang off the report line, or '' when the anchor held.
   */
  anchored(corner, was) {
    const moved = drift(corner, was, this.picked.after);
    if (moved.held) return '';
    const by = [];
    if (moved.dx !== 0) by.push(`${Math.abs(moved.dx)}px ${moved.dx > 0 ? 'right' : 'left'}`);
    if (moved.dy !== 0) by.push(`${Math.abs(moved.dy)}px ${moved.dy > 0 ? 'down' : 'up'}`);
    return (
      ` — but the ${cornerWord(moved.corner)} corner could not be held: the page has it ${list(by)} of where the` +
      ' drag started, because this box is placed by its layout rather than by its left edge. The numbers above are' +
      ' measured, so they are true; the anchor is not.'
    );
  }

  /**
   * One line of "what governs this axis", however that turned out.
   *
   * Four sites used to build this nine-field record by hand; the shape is the same
   * every time and only the reason differs, so the reason is the argument.
   */
  governor(axis, governed, { token, selector, section, key, was, wants, why }) {
    return { axis, property: governed.property, token, selector, section, key, was, wants: wants ?? null, why: why ?? null };
  }

  /**
   * The whole measurement of one picked element, as `annotate()` wants it.
   *
   * Defaults to the primary, because that is what the rows and the read-out are
   * about — and takes a record, because an Annotation over a selection is one of
   * these per member.
   */
  measurement(of = this.picked) {
    const { element, before, after, governs, type } = of;
    const root = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    const font = Number.parseFloat(getComputedStyle(element).fontSize);
    const viewport = { width: innerWidth, height: innerHeight };
    const parent = { width: of.parent.width, height: of.parent.height };

    const tokens = [];
    for (const axis of MEASURES) {
      const type_ = axis === TEXT;
      const from = type_ ? type.before : before[axis];
      const to = type_ ? type.after : after[axis];
      const by = round(to - from);
      if (by === 0) continue;
      const governed = governs[axis];
      if (!governed) continue;
      // A text size gets NEITHER `parent` NOR `font`, and both omissions are the
      // honest answer rather than an oversight. A `%` font-size is a share of the
      // PARENT's font-size and an `em` one is a share of the same thing — so the
      // parent's width would be the wrong base and the element's own size is the
      // very number being changed. `asUnit` answers null without them, and a
      // relationship this cannot restate is reported instead of guessed.
      const ctx = type_ ? { root, viewport } : { root, font, parent, viewport, axis: DOWN[axis] };

      if (governed.token === null) {
        // Two different answers, and telling them apart is most of the value of
        // saying anything at all. A value built out of Tokens is a RELATIONSHIP,
        // and naming the constants inside it is the decision an agent has to make.
        // A value with no Token in it is a literal in the composition, and the
        // change to make is to promote it to one — which is ADR 0004's "anything
        // the author will want to adjust must first be promoted to a Token",
        // arrived at from the other end.
        tokens.push(
          this.governor(axis, governed, {
            token: governed.property,
            selector: governed.on,
            section: null,
            key: null,
            was: governed.was,
            why:
              governed.inside.length > 0
                ? `it is a relationship built out of ${list(governed.inside)}, so which of those moved is the` +
                  ' decision rather than a length to write'
                : 'it is a literal in the composition and not a Token at all, so promoting that number to one is' +
                  ' the change to make',
          }),
        );
        continue;
      }

      const declaring = this.declaring(governed.token);
      if (declaring.length === 0) {
        tokens.push(
          this.governor(axis, governed, {
            token: governed.token,
            selector: governed.on,
            section: null,
            key: null,
            was: '(not in any Section’s tokens.css)',
            why: 'no Section declares it, so it belongs to the Kernel and ADR 0004’s surface cannot reach it',
          }),
        );
        continue;
      }
      if (declaring.length > 1) {
        tokens.push(
          this.governor(axis, governed, {
            token: governed.token,
            selector: declaring.map(({ token }) => token.selector).join(' and '),
            section: null,
            key: null,
            was: declaring.map(({ token }) => token.value).join(' / '),
            why:
              `it is declared on ${declaring.length} rules, so which one the page is using here is a judgement` +
              ' rather than a lookup',
          }),
        );
        continue;
      }

      const { section, token } = declaring[0];
      // A bound is only the length while the box is standing on it. Off the bound,
      // restating it to the measured size offers a number that will not move the
      // page — worse than offering none, because an offer reads as certainty.
      const onTheBound =
        !BOUND.has(governed.property) ||
        (Number.isFinite(governed.computed) && Math.abs(governed.computed - from) < 0.5);
      // A size is restated to what it now is; a position is nudged by how far it
      // went. A text size is a size.
      const wants = !onTheBound
        ? null
        : type_ || axis === 'width' || axis === 'height'
          ? restate(token.value, to, ctx)
          : nudge(token.value, by * governed.sign, ctx);
      tokens.push(
        this.governor(axis, governed, {
          token: governed.token,
          selector: token.selector,
          section,
          key: token.key,
          was: token.value,
          wants,
          why: onTheBound
            ? wants === null
              ? `${token.value} is not a plain length, so restating it would destroy it`
              : null
            : `it is a ${governed.property} and the box is not standing on it — ${px(from)} against a` +
              ` bound of ${px(governed.computed)} — so writing the measured size there would not move the page`,
        }),
      );
    }

    return {
      named: of.named,
      selector: of.selector ?? '(nothing on this page addresses it uniquely)',
      viewport,
      root,
      parent: of.parent,
      before,
      after,
      // `own` and `on` are how far the text row reached: false means the words are
      // not this element's own, and every reader of a measurement — the Annotation,
      // the Recording, the Override — has to say so rather than describing a
      // `font-size` on a box that would ignore one. `on` is the selector an
      // Override would have to be written on, and null where there is none to
      // offer.
      text: { before: type.before, after: type.after, own: type.own, on: type.selector },
      // The absolute translate the page is showing, base included: an Override
      // REPLACES the composition's own, so the delta alone would move the element
      // back to zero and then out again by however far it was dragged.
      translate: {
        x: round(of.base.x + of.wanted.dx),
        y: round(of.base.y + of.wanted.dy),
      },
      promoted: of.promoted,
      tokens,
    };
  }

  // -------------------------------------------------------------------------
  // The panel
  // -------------------------------------------------------------------------

  mount(into) {
    this.panel = into;
    into.innerHTML = `
      <div data-editor-arm>
        <small data-editor-measuring>Click anything on the page. Shift-click picks more,
        <kbd>↑</kbd> and <kbd>↓</kbd> climb to a parent and back, dragging from anywhere inside
        what is picked moves it, a click inside it picks something smaller instead, a corner
        resizes it from the opposite one — or scales it, below — and scrubbing a row writes the
        Token that governs it where there is one. <kbd>Esc</kbd> drops the selection.</small>
        <div data-editor-toggles>
          <label><input type="checkbox" data-editor-toggle="zoom" />
            <span>scale everything</span>
            <small>a corner drag scales the whole composition by a percentage — the photographs, the gaps
            and the type — instead of the box, and writes it on release</small>
          </label>
          <label><input type="checkbox" data-editor-toggle="scale" />
            <span>resize by one ratio</span>
            <small>a corner drag scales the box instead of sizing its two axes separately, so it keeps its
            shape. <kbd>Shift</kbd> through a drag means the other one, either way round</small>
          </label>
          <label><input type="checkbox" data-editor-toggle="fit" />
            <span>scale text with the box</span>
            <small>a resize carries the text size with it, by the ratio the box changed by</small>
          </label>
          <label><input type="checkbox" data-editor-toggle="keep" />
            <span>keep changes when picking something else</span>
            <small>a change that was made stays on the page, so several can be arranged together</small>
          </label>
        </div>
        <div data-editor-history>
          <button type="button" data-editor-undo disabled>undo</button>
          <button type="button" data-editor-redo disabled>redo</button>
          <small>one gesture at a time — <kbd>Ctrl</kbd>+<kbd>Z</kbd>, and
          <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> to put it back. A row that wrote a Token writes it
          back. <em data-editor-history-next></em></small>
        </div>
      </div>
      <div data-editor-measured></div>
      <div data-editor-annotation>
        <label><span>Annotations</span>
          <textarea data-editor-annotations rows="8" readonly
            placeholder="nothing measured yet — a change no Token expresses leaves by here: pick something, move it, then press Annotation"></textarea>
        </label>
        <div data-editor-annotation-buttons>
          <button type="button" data-editor-copy>copy</button>
          <button type="button" data-editor-forget>clear</button>
        </div>
      </div>
      <div data-editor-overrides-list></div>`;

    into.querySelector('[data-editor-undo]').addEventListener('click', () => void this.undo());
    into.querySelector('[data-editor-redo]').addEventListener('click', () => void this.redo());

    into.querySelector('[data-editor-copy]').addEventListener('click', () => this.copy());
    into.querySelector('[data-editor-forget]').addEventListener('click', () => {
      this.annotations().value = '';
      this.say('the Annotations are cleared');
    });

    // The four toggles. Each one says on arrival what it now does and what it does
    // NOT do, because all of them change what a gesture the author already knows
    // means — and a mode nobody was told about is worse than a press.
    into.querySelector('[data-editor-toggle="zoom"]').addEventListener('change', (event) => {
      this.zooming = event.currentTarget.checked;
      if (!this.zooming) {
        this.say('sizing again — a corner drag is about the box, and the zoom stays wherever it was written');
        return;
      }
      // ASKED HERE AND NOT AT THE FIRST DRAG, so a page with nothing to zoom says so
      // while the author is deciding rather than under their finger. It is asked
      // again at the pointerdown, because a Token can be written between the two.
      const zoom = this.zoomToken();
      if (!zoom) {
        this.say(
          `nothing on this page declares ${ZOOM}, so there is no zoom to drag. The four rows still measure` +
            ' this box.',
          true,
        );
        return;
      }
      this.say(
        `scaling everything — the page is at ${percent(zoom.at)}, and a corner drag now moves ${ZOOM} instead` +
          ' of the box. Every measure, gap and glyph on the page is in rem, so all of it scales together and' +
          ' the box you are holding follows. It WRITES on release, unlike every other drag here, because a' +
          ' zoom is a Token and not a coordinate.',
      );
    });
    into.querySelector('[data-editor-toggle="scale"]').addEventListener('change', (event) => {
      this.scaling = event.currentTarget.checked;
      this.say(
        this.scaling
          ? 'scaling — a corner drag now moves both axes by one ratio, whichever of the two the pointer' +
              ' travelled further along, so the box keeps its shape. The rows still set one axis each,' +
              ' holding Shift through a drag sizes the two axes separately for that drag, and turning on' +
              ' “scale text” as well carries the type by the same ratio.'
          : 'sizing — a corner drag moves each axis by whatever the pointer did on it, as it did before,' +
              ' and Shift through a drag scales by one ratio. Anything already scaled stays where it is' +
              ' until it is put back.',
      );
    });
    into.querySelector('[data-editor-toggle="fit"]').addEventListener('change', (event) => {
      this.fitting = event.currentTarget.checked;
      this.say(
        this.fitting
          ? 'scaling text with the box — resizing now carries the text size with it, by the smaller of the' +
              ' two ratios the resize makes. Scrubbing the text size row still sets it outright.'
          : 'the text size is its own again — a resize changes the box and nothing else. Anything already' +
              ' scaled stays scaled until it is put back.',
      );
    });
    into.querySelector('[data-editor-toggle="keep"]').addEventListener('change', (event) => {
      this.keeping = event.currentTarget.checked;
      if (!this.keeping) {
        // Turning it OFF does not sweep the page: the changes standing on it are
        // ones the author made deliberately, and taking them away as a side effect
        // of a checkbox is the kind of surprise nothing here should be capable of.
        // *put the page back* on the Recording is how they go.
        this.say(
          this.kept.length === 0
            ? 'not keeping — picking something else puts the last thing back, as it did before'
            : `not keeping from here on. The ${this.kept.length} already standing stay standing —` +
                ' “put the page back” on the Recording is what takes them off.',
        );
        return;
      }
      this.say(
        'keeping — a change stays on the page when the selection leaves it, and picking it again resumes' +
          ' the same measurement rather than starting a new one from where it got to.',
      );
    });

    this.listen();
    this.paint();
    this.paintPicked();
    this.paintHistory();
  }

  annotations() {
    return this.panel.querySelector('[data-editor-annotations]');
  }

  /**
   * Arm or disarm. While armed the page is a measuring surface and not a page: a
   * click picks rather than following a link or editing a word.
   *
   * NOBODY PRESSES THIS. Being on this surface IS being armed — `editor.js` calls
   * it as the surface comes to the front and again as it leaves (#166). The press
   * that used to be here was a second gate on a decision the author had already
   * made by choosing the surface, and the thing it protected against — a click
   * picking instead of editing a word — is what the report line says on arrival.
   */
  arm(on) {
    if (on === this.armed) return;
    this.armed = on;
    document.documentElement.toggleAttribute('data-editor-armed', on);
    if (!on) {
      this.clear();
      this.paintPicked();
    }
    this.say(
      on
        ? 'measuring — click anything on the page, and shift-click to pick a series. Clicking text no' +
            ' longer edits it.'
        : 'not measuring — clicking text edits it again',
    );
  }

  /** The read-out, the number boxes, and what can be done with them. */
  paintPicked() {
    const into = this.panel?.querySelector('[data-editor-measured]');
    if (!into) return;
    if (!this.picked) {
      into.textContent = '';
      this.paintMarquee();
      return;
    }
    const { named, before, after, type } = this.picked;
    const open = new Set(
      [...into.querySelectorAll('[data-editor-nudge]')].filter((input) => input === document.activeElement),
    );
    into.textContent = '';

    const title = document.createElement('p');
    title.dataset.editorPicked = '';
    title.textContent =
      this.selection.length === 1 ? named.phrase : `${named.phrase}, and ${this.selection.length - 1} more`;
    into.append(title);

    if (this.selection.length > 1) {
      const rest = document.createElement('p');
      rest.dataset.editorAlso = '';
      rest.textContent = `also picked: ${list(this.selection.slice(1).map((held) => held.named.phrase))}`;
      into.append(rest);
    }

    into.append(this.crumbs());

    // Which Token, if any, each row would write. Read once for the whole paint:
    // it decides whether a row is a Token control or a measurement, and asking
    // per row would walk every stylesheet five times.
    const offers = new Map(this.measurement().tokens.map((found) => [found.axis, found]));

    for (const axis of MEASURES) {
      const text = axis === TEXT;
      const from = text ? type.before : before[axis];
      const to = text ? type.after : after[axis];
      const row = document.createElement('div');
      row.dataset.editorAxis = axis;

      // The label is the scrub handle. A row with a Token behind it says so on the
      // handle, because that is where the pointer already is.
      const label = document.createElement('span');
      label.dataset.editorScrub = axis;
      label.textContent = axis;
      const offered = offers.get(axis);
      const governed = this.picked.governs[axis];
      if (governed?.token) {
        label.title = `${governed.property} is ${governed.token} — scrubbing this writes it`;
        row.dataset.editorGoverned = governed.token;
      } else {
        label.title = `nothing the Editor can see declares ${axis} here — scrubbing this measures it`;
      }
      // WHERE THE TEXT ROW IS READING FROM, on the handle the pointer is already
      // over. Both answers below are "why did resizing this not move the type",
      // answered before it is asked: the words are the items' and not the list's,
      // or there are several sizes inside and no one number for a row to hold.
      if (text && this.picked.type.split > 0) {
        label.title +=
          ` — but the text inside is set at ${this.picked.type.split} different sizes, so this row is` +
          ' this box’s own inherited size and moves nothing on the page. Pick the words themselves.';
        row.dataset.editorSplit = String(this.picked.type.split);
      } else if (text && !this.picked.type.own) {
        label.title +=
          ` — read off the ${this.picked.type.on.length} element(s) inside that carry the type, because this` +
          ' box draws no words of its own. A resize writes it there.';
        row.dataset.editorInside = String(this.picked.type.on.length);
      }

      const box = document.createElement('input');
      box.type = 'number';
      box.step = text ? '0.1' : '1';
      box.dataset.editorNudge = axis;
      box.value = String(to);
      // Typing a number is the same deliberate change as scrubbing one, so it
      // lands the same way: preview, then write whatever the row is backed by.
      box.addEventListener('change', () => {
        // The gesture starts here rather than at a pointerdown, because typing is
        // the whole of it — and `land()` reaches the same `commit()` a scrub does,
        // so it ends in the same place.
        this.begin();
        this.want(axis, Number(box.value));
        void this.land(axis);
      });

      const moved = document.createElement('small');
      const by = round(to - from);
      moved.textContent = by === 0 ? `was ${from}` : `was ${from}, ${by > 0 ? '+' : ''}${by}`;
      if (by !== 0) row.dataset.editorMoved = '';

      row.append(label, box, moved);
      // The offer, on the row rather than in a list underneath it: "in one place"
      // is the whole of #166, and a number and the constant it writes are one
      // thing to read.
      if (offered) {
        const said = document.createElement('small');
        said.dataset.editorOffer = axis;
        said.textContent =
          offered.wants === null || offered.section === null
            ? `${offered.token} — ${offered.why}`
            : `${offered.token}: ${offered.was} → ${offered.wants}`;
        row.append(said);
      }
      into.append(row);
    }

    const buttons = document.createElement('div');
    buttons.dataset.editorMeasureButtons = '';
    for (const [what, label, run] of [
      ['annotation', 'Annotation', () => this.annotation()],
      ['override', 'Override', () => void this.override()],
      ['restore', 'put back', () => this.restore()],
    ]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.editorMeasure = what;
      button.textContent = label;
      button.addEventListener('click', run);
      buttons.append(button);
    }
    into.append(buttons);

    for (const input of into.querySelectorAll('[data-editor-nudge]')) {
      if ([...open].some((was) => was.dataset.editorNudge === input.dataset.editorNudge)) input.focus();
    }
    this.paintMarquee();
  }

  /**
   * The primary's ancestors, nearest last, each one a button that picks it.
   *
   * A click picks the deepest element under the pointer, which is almost never the
   * box the author means — the box is a parent of the word they clicked. So the
   * chain is drawn rather than hunted for, named the way the read-out is named,
   * and `↑`/`↓` walk the same chain from the keyboard (#166).
   */
  crumbs() {
    const strip = document.createElement('div');
    strip.dataset.editorCrumbs = '';
    const chain = [];
    for (
      let node = this.picked.element;
      node && node !== document.body && node !== document.documentElement;
      node = node.parentElement
    ) {
      chain.unshift(node);
    }
    for (const node of chain) {
      const crumb = document.createElement('button');
      crumb.type = 'button';
      crumb.dataset.editorCrumb = '';
      crumb.textContent = this.describe(node).phrase.replace(/^the /, '');
      if (node === this.picked.element) crumb.setAttribute('aria-pressed', 'true');
      crumb.addEventListener('click', () => this.pick(node));
      strip.append(crumb);
    }
    return strip;
  }

  /** Climb to the parent, or back down to whatever the last climb came from. */
  climb(up) {
    if (!this.picked) return;
    const from = this.picked.element;
    if (up) {
      const to = from.parentElement;
      if (!to || to === document.body || to === document.documentElement) {
        return this.say('nothing above that but the page itself');
      }
      this.pick(to);
      // AFTER the pick, because picking clears it: `↓` has to know where `↑` came
      // from, and there is nothing else on the page that records it.
      this.came = from;
      return;
    }
    // Back to where the last climb started, if that is still inside — otherwise
    // the first element child, which is the only unambiguous descent there is.
    const back = this.came && from.contains(this.came) && this.came !== from ? this.came : null;
    const to = back ?? from.firstElementChild;
    if (!to) return this.say('nothing inside that to go into');
    this.pick(to);
  }

  /**
   * Where an axis should be. A width, a height and a text size are sizes; a left
   * and a top are where the box stands, so those move the translate.
   *
   * The primary is told the number, and everything else in the selection is told
   * the same thing: an absolute size, because a series of text set to one size is
   * the point, and the same DISTANCE for a position, because a series moved to one
   * coordinate would be a stack.
   */
  want(axis, to) {
    if (!this.picked || !Number.isFinite(to)) return;
    // Measured off the PRIMARY, once, and given to all of them — which is what
    // makes a left a distance rather than a coordinate.
    const dx = round(to - this.picked.before.left);
    const dy = round(to - this.picked.before.top);
    for (const { wanted } of this.selection) {
      if (axis === TEXT) wanted.size = Math.max(0, to);
      else if (axis === 'width' || axis === 'height') wanted[axis] = Math.max(0, to);
      else if (axis === 'left') wanted.dx = dx;
      else wanted.dy = dy;
    }
    // A size, and only a size, carries the type with it. Not a `left` or a `top`,
    // which move the box and change nothing about how much room it has; and not the
    // text-size row itself, or the toggle would make that row unusable.
    if (axis === 'width' || axis === 'height') this.fitType();
    // AND A ROW IS NEVER A PROPORTIONAL GESTURE, whatever the toggle says: it sets
    // one axis and leaves the other where it was, so a stale ratio left standing
    // here would have the Recording claim the shape was held by a gesture that
    // deliberately did not hold it.
    for (const held of this.selection) held.by = null;
    this.apply();
  }

  /**
   * Show the page at a zoom, without writing anything.
   *
   * THROUGH THE TOKENS SURFACE'S OWN PREVIEW SHEET and not through an inline style,
   * which is the only thing that could work: the zoom is a custom property on
   * `:root` that the whole document reads, and there is no element to put it on.
   * That sheet is also what the Tokens panel's own slider previews through, so the
   * control and this gesture cannot disagree about what the page is showing.
   *
   * The picked records are re-measured afterwards rather than being told a size,
   * because the box did not move — the PAGE did, and where its measure landed under
   * a new rem is layout's answer and not this surface's. That is what keeps the
   * read-out and the Annotation truthful about a gesture that never touched the box.
   */
  showZoom(at) {
    const zoom = this.dragging?.zoom;
    if (!zoom || !this.surface) return;
    // WHAT THE PAGE IS SHOWING, kept on the drag, because that is the number the
    // release writes. Deriving it again at the pointerup from the box's ratio would
    // multiply the zoom by a ratio it has ALREADY been multiplied by — the box the
    // ratio is read off has moved because the zoom moved it.
    this.dragging.at = at;
    this.surface.preview(zoom.section, zoom.token, String(at));
    for (const held of this.selection) {
      held.after = this.box(held.element);
      held.type.after = this.typeNow(held);
    }
    // `paintPicked()` redraws the rows and the marquee, so the box's four numbers
    // follow the page as it scales. The PERCENTAGE is not one of those numbers and
    // is the one the author is actually watching, so it goes on the report line —
    // per frame, which is what that line is for.
    this.paintPicked();
    this.say(`the zoom: ${percent(this.dragging.from.at)} → ${percent(at)} — let go to write it`);
  }

  /**
   * Let go of a zoom: write the Token.
   *
   * WHY THIS WRITES WHERE A CORNER DRAG DOES NOT. Every other drag here leaves an
   * inline style and stays a measurement until the author says otherwise, because
   * what it moved is a coordinate in a composition and ADR 0004 keeps those out of
   * the Editor's hands. A zoom is not a coordinate: it is a named number the author
   * owns, and the only thing to do with a dragged one is write it — the same
   * asymmetry `land()` is about, arrived at from the other end.
   *
   * `writeTokens()` and not a second way to write a Token: the Recording's line,
   * the repick that drops this surface's now-doubled inline styles, and the record
   * an undo reverses all come from there.
   */
  async landZoom(zoom, was, at) {
    const held = zoom.token.value;
    const wants = String(at);
    if (wants === held) {
      this.say(`the zoom is still ${percent(at)} — nothing to write`);
      return;
    }
    const wrote = await this.writeTokens(
      [{ section: zoom.section, key: zoom.token.key, token: ZOOM, was: held, wants, axis: 'zoom' }],
      'zoom',
    );
    // AFTER the write, and the write's own line is not enough on its own: it says
    // the Token and the value, and what the author asked in is a percentage. This is
    // the sentence they will quote.
    this.say(
      `the zoom: ${percent(was)} → ${percent(at)} — every STATED size on the page is now ${percent(at / was)}` +
        ' of what it was. A box that is a budget’s REMAINDER cannot be, and gets smaller instead as the rest' +
        ' grows: above 1100x700 the Front Screen is composed to exactly one screen, and its photograph strip' +
        ' is that remainder. undo writes it back.',
    );
    this.finish(`the zoom, ${percent(was)} → ${percent(at)}`, { tokens: wrote });
  }

  /**
   * Show the parent's padding closed to where the pointer has taken it, without
   * writing anything.
   *
   * THROUGH THE TOKENS SURFACE'S PREVIEW SHEET, for the reason `showZoom()` gives:
   * the number is a custom property the composition reads, there is no element to
   * put it on, and that sheet is the one the Tokens panel's own control previews
   * through — so the control and this gesture cannot disagree about what the page
   * is showing.
   *
   * THE RATIO IS THE PADDING'S AND THE SCALE IS THE TOKEN'S, which is the step
   * worth reading twice. The pointer says where the padding should land; the
   * padding's declaration is exactly one Token, so what the padding did to itself
   * is what the Token has to do to itself; and `lib/fills.mjs`'s `scale()` is the
   * one operation that does that to a value the Tokens panel would only let the
   * author type — a `clamp()` scaled term by term is the same relationship at a
   * different magnitude, with its breakpoints in the same places. That note is on
   * `scale()` itself and it is the whole argument for this gesture being allowed.
   *
   * ONE TOKEN MAY MOVE MORE THAN THE EDGE UNDER THE POINTER, and nothing here
   * pretends otherwise. `--front-screen-rhyme` is the Front Screen's top padding
   * AND, through `--front-screen-cut-gap`, its bottom one — so closing the top by
   * twenty pixels closes the bottom too and the column grows by forty. The boxes
   * are re-measured rather than told a size, exactly as a zoom re-measures, so the
   * rows and the Annotation report what the page actually did.
   */
  showFills(by) {
    const fills = this.dragging?.fills;
    if (!fills || !this.surface) return;
    let moved = false;
    for (const one of fills) {
      const close = closing(one.from, one.axis === 'height' ? by.dy : by.dx, one.edge);
      // Null is the padding having bottomed out at zero — `closing()` derives the
      // ratio from where it LANDED, so past the bottom there is no ratio and the
      // preview stays where it was rather than the page running away under a
      // pointer that is still travelling.
      if (close === null) continue;
      // BACK WHERE IT STARTED IS NOT A WRITE OF THE SAME NUMBER. A corner nudged
      // out and brought home again is the author deciding against it, so the file's
      // own value goes back on the sheet and `wants` is cleared — otherwise letting
      // go POSTs the value the file already holds, which is a history step, a line
      // in the Recording and a round trip for a gesture that changed nothing.
      const home = Math.abs(close.to - one.from) < 0.5;
      const wants = home ? one.held.value : scaleBy(one.held.value, close.by);
      // `showing` and not `wants`, because those are two different questions: what
      // the page is being shown, and what the release should write. They are the
      // same number until the drag comes home, and then one of them is nothing.
      if (wants === null || wants === one.showing) continue;
      one.showing = wants;
      one.wants = home ? null : wants;
      one.to = close.to;
      this.surface.preview(one.section, one.held, wants);
      moved = true;
    }
    if (!moved) return;
    for (const held of this.selection) {
      held.after = this.box(held.element);
      held.type.after = this.typeNow(held);
    }
    this.paintPicked();
    const closing_ = fills.filter((one) => one.wants);
    this.say(
      closing_.length === 0
        ? `${list(fills.map((one) => `the ${one.edge} margin`))} is back where the file has it — there is` +
            ' nothing left for letting go to write'
        : `${list(closing_.map((one) => `${one.edge} margin ${px(one.from)} → ${px(one.to)}`))}` +
            ` — this box has no ${list(closing_.map((one) => one.axis))} of its own, so the corner is closing` +
            ' the padding around it. Let go to write it.',
    );
  }

  /**
   * The clause naming a padding this gesture may not write, or ''.
   *
   * SAID AT THE RELEASE AND NOT AT THE GRAB, which is where the first version of
   * this put it and was wrong: the report line is one line, so a refusal said as
   * the corner was taken hold of was overwritten by the drag's own reporting on the
   * very next frame and the author never saw it. The end of the gesture is the only
   * moment nothing overwrites.
   */
  refusal(refused) {
    if (!refused || refused.length === 0) return '';
    return (
      ` — and it has no ${list(refused.map((one) => one.axis))} of its own either, but the` +
      ` ${list(refused.map((one) => `${one.edge} padding`))} that would move it cannot be written:` +
      ` ${list(refused.map((one) => one.why))}. The Recording still measures it.`
    );
  }

  /**
   * Let go of a fill: write the padding's Token.
   *
   * WHY THIS WRITES WHERE THE REST OF A CORNER DRAG DOES NOT — the same asymmetry
   * `landZoom()` is about, arrived at from a third direction. An ordinary resize
   * leaves an inline style and stays a measurement, because what it moved is a
   * coordinate in a composition and ADR 0004 keeps those out of the Editor's hands.
   * A padding declared as exactly one Token is not a coordinate: it is a named
   * number the author owns, and the only thing to do with a dragged one is write it.
   *
   * THE OTHER HALF OF THE GESTURE IS STILL A MEASUREMENT. A corner on the Front
   * Screen's column drags a width the composition governs with `--front-screen-measure`
   * and a height it governs with nothing at all, and only the second half is
   * written here — the first is an inline style like every other preview, dropped
   * by the repick `writeTokens()` does. The report line says which was which,
   * because a gesture that wrote half of what it moved and said nothing would be
   * the worst version of this.
   */
  async landFills(fills, corner, was, refused) {
    this.logged();
    const found = fills.map((one) => ({
      section: one.section,
      key: one.held.key,
      token: one.token,
      was: one.held.value,
      wants: one.wants,
      axis: one.axis,
    }));
    // WHERE THE BOXES ENDED UP, READ BEFORE ANYTHING IS WRITTEN, for the reason
    // `commit()` gives: `writeTokens()` repicks, and after a repick every `wanted`
    // is back to nothing — so a redo reading them off the selection afterwards
    // would replay a gesture that asked for zero.
    const after = this.selection.map((held) => ({ element: held.element, to: { ...held.wanted } }));
    const edges = list(fills.map((one) => `the ${one.edge} margin of ${this.naming()}`));
    const wrote = await this.writeTokens(found, fills[0].axis);
    // THE MEASUREMENT HALF OF THE GESTURE SURVIVES THE WRITE, and putting it back
    // is not undoing the repick — it is the reason the repick exists, read the
    // right way round. `writeTokens()` drops this surface's inline styles because
    // they would DOUBLE what the Token just did; the size on the other axis doubles
    // nothing, because a padding is not a width. Without this a corner dragged
    // diagonally wrote the padding and then snapped the width back to the file on
    // release, which reads as the tool undoing half of what the hand just did.
    if (wrote.length > 0) {
      for (const held of this.selection) {
        const asked = after.find((one) => one.element === held.element)?.to;
        if (asked) Object.assign(held.wanted, asked);
      }
      this.apply();
    }
    this.finish(edges, { after, tokens: wrote });
    // The anchor clause, because a fill loses one more often than an ordinary
    // resize does: one Token is frequently BOTH of a parent's paddings — closing
    // the Front Screen's top closes its bottom, through `--front-screen-cut-gap` —
    // so the corner opposite the pointer moves and the author has to be told.
    //
    // NOT REPORTED AS A FAULT, which is the one place this differs from the same
    // clause on an ordinary resize. There a drifting anchor is the layout refusing
    // the gesture and the author needs warning; here it is the Token doing exactly
    // what it says on the other three rules that read it, and the box got bigger
    // because of it rather than in spite of it.
    const anchor = this.anchored(corner, was);
    this.say(
      `${edges}: ${list(fills.map((one) => `${px(one.from)} → ${px(one.to)}`))} —` +
        ` ${list(fills.map((one) => one.token))} written, so the box took the room` +
        `${anchor === '' ? '.' : anchor} undo writes it back.${this.refusal(refused)}`,
    );
  }

  /**
   * A box drawn over every picked element, and the four corners on the primary.
   *
   * The corners are the primary's alone, and that is a decision rather than a
   * shortcut: `lib/corners.mjs` resizes from the corner opposite the one dragged,
   * and five elements have five opposite corners, so a handle on each would be
   * five different anchors under one pointer. Resizing a series is the rows —
   * which set an absolute size and mean the same thing for all of them.
   */
  paintMarquee() {
    for (const stale of this.marquees.slice(this.selection.length)) stale.remove();
    this.marquees.length = Math.min(this.marquees.length, this.selection.length);
    this.selection.forEach((held, at) => {
      let marquee = this.marquees[at];
      if (!marquee) {
        marquee = document.createElement('div');
        // NOT data-editor: that attribute carries the panel's whole paint, and this
        // is a box drawn over the page. Nothing needs it either — while this exists
        // the surface is armed, and everything that would have looked for it is
        // already standing down on data-editor-measuring.
        marquee.dataset.editorMarquee = '';
        if (at === 0) {
          // One per corner, and each one carries WHICH corner it is — the
          // arithmetic that follows is different for all four, and
          // `lib/corners.mjs` is told the name rather than working it out from
          // where the pointer went down.
          for (const corner of CORNERS) {
            const handle = document.createElement('button');
            handle.type = 'button';
            handle.dataset.editorHandle = corner;
            handle.setAttribute('aria-label', cornerLabel(corner));
            marquee.append(handle);
          }
        } else {
          marquee.dataset.editorAlso = '';
        }
        document.body.append(marquee);
        this.marquees[at] = marquee;
      }
      const rect = held.element.getBoundingClientRect();
      marquee.style.left = `${rect.left}px`;
      marquee.style.top = `${rect.top}px`;
      marquee.style.width = `${rect.width}px`;
      marquee.style.height = `${rect.height}px`;
    });
  }

  // -------------------------------------------------------------------------
  // Landing a change: the Token where there is one, and nothing where there is not
  // -------------------------------------------------------------------------

  /**
   * What happens when a row is let go of.
   *
   * THIS IS THE BUTTON THAT IS NOT THERE. A scrub previews through inline styles,
   * exactly as a drag on the page does; letting go writes the TOKEN that governs
   * the row, if one does — which is #166's "in one place, without pressing a bunch
   * of buttons", and it is a real change to the composition rather than debt.
   * Where nothing governs the row the drag stays what it always was, a
   * measurement, and the Annotation and the Override are still how it leaves. That
   * asymmetry is ADR 0004 and not a half-finished feature: a Token is a named
   * number the author is entitled to move, and a coordinate is not.
   *
   * A SELECTION SHARING ONE TOKEN IS ONE WRITE. Five sizes governed by
   * `--projects-panel-copy-size` are one constant, so writing it five times would
   * be five posts saying the same thing and four of them reporting no change.
   * Where the members do NOT share it, nothing is written and the report says so:
   * which of several constants moved is a judgement, and this surface's rule
   * everywhere else is to report a judgement rather than take one.
   */
  async land(axis) {
    if (!this.picked) return;
    // One commit, one land — see the note on `landing`.
    const gesture = `${axis} ${JSON.stringify(this.picked.wanted)}`;
    if (this.landing.has(gesture)) return;
    this.landing.add(gesture);
    try {
      await this.commit(axis);
    } finally {
      this.landing.delete(gesture);
    }
  }

  /** What a committed row does, once. `land()` is the guard around it, so this is
   *  reached exactly once per gesture however many times the row raises `change`. */
  async commit(axis) {
    // BEFORE anything is written, because writing repicks: the Recording holds the
    // measurement that was made, and after a write there is no measurement left to
    // hold. `logged()` is idempotent per element, so one gesture is one entry.
    this.logged();

    // WITH `scale text` ON, A RESIZE CHANGED TWO THINGS, so letting go of it lands
    // two. Landing only the size would leave the file describing a box whose type
    // did not move while the page in front of the author shows type that did — and
    // the next build would silently take the text back, which is the one failure
    // this surface's whole "a Token's page and its file are two things" note exists
    // to prevent.
    const axes = [axis];
    if (this.fitting && (axis === 'width' || axis === 'height') && this.scaled() !== null) {
      axes.push(TEXT);
    }

    const measured = this.measurement();
    const found = [];
    const split = [];
    for (const one of axes) {
      const on = measured.tokens.find((token) => token.axis === one);
      if (!on || on.wants === null || on.section === null || on.key === null) continue;
      // A SELECTION SHARING ONE TOKEN IS ONE WRITE, and one that does not is none —
      // asked per axis, because with `scale text` on a series can share the size's
      // Token and not the text's, or the other way round.
      if (this.selection.length > 1) {
        const theirs = this.selection.map((held) => held.governs[one]?.token ?? null);
        if (theirs.some((token) => token !== on.token)) {
          split.push(one);
          continue;
        }
      }
      found.push(on);
    }

    // WHERE THE NUMBERS ENDED UP, READ BEFORE ANYTHING IS WRITTEN. `writeTokens`
    // repicks, and after a repick every `wanted` is back to nothing — so a redo
    // reading them off the selection afterwards would replay a gesture that asked
    // for zero.
    const after = this.selection.map((held) => ({ element: held.element, to: { ...held.wanted } }));
    const label = `the ${axis} of ${this.naming()}`;

    if (split.length > 0) {
      this.say(
        `${list(split)} ${split.length === 1 ? 'is' : 'are'} governed by one Token on` +
          ` ${this.picked.named.phrase} and by something else on the rest of the selection, so` +
          ` ${split.length === 1 ? 'it was' : 'they were'} not written. Take the Recording, or pick them one` +
          ' at a time.',
        true,
      );
    }
    // RECORDED WHETHER OR NOT A TOKEN WAS FOUND, because both outcomes changed the
    // page: a row backed by a Token wrote it, and a row backed by nothing left an
    // inline style standing. Undo has to reverse either one.
    const wrote = found.length === 0 ? [] : await this.writeTokens(found, axis);
    this.finish(label, { after, tokens: wrote });
  }

  /**
   * Put every picked element's measurement into the Recording.
   *
   * ONE ENTRY PER ELEMENT AND NOT ONE PER GESTURE, which is the decision that makes
   * the pasted document readable: "resize a whole load of different elements" is
   * twenty elements and two hundred gestures, and a keystroke history of it is not
   * a description of the page the author wants. So an element measured again
   * replaces its own entry, and the document is the latest state of each.
   *
   * AN ELEMENT PUT BACK TO WHERE IT STARTED LOSES ITS ENTRY. Dragging something out
   * and then dragging it back is the author deciding against it, and a Recording
   * that reported it anyway would be asking an agent to make a change nobody wants.
   *
   * Called once per completed gesture — a pointerup, or a number typed into a row —
   * and never per frame: `measurement()` walks a stylesheet per axis, and doing that
   * sixty times a second is the one thing on this surface that would feel slow.
   */
  logged() {
    if (!this.log) return;
    const scaled = this.scaled();
    for (const held of this.selection) {
      // The primary's ratio for the primary only: the others were given the same
      // absolute size and so have ratios of their own, and `fitType()` has already
      // applied each of them. What this carries is the sentence for the block.
      this.log.measured(held.element, this.measurement(held), held === this.picked ? scaled : null, held.by);
    }
  }

  // -------------------------------------------------------------------------
  // Taking a gesture back
  // -------------------------------------------------------------------------

  /** Whichever record this surface is holding for an element right now — picked,
   *  or standing on the page because the `keep` toggle left it there. A STEP NAMES
   *  THE ELEMENT AND NOT THE RECORD, because writing a Token repicks and throws
   *  every record away. */
  holding(element) {
    return (
      this.selection.find((held) => held.element === element) ??
      this.kept.find((held) => held.element === element) ??
      null
    );
  }

  /** What to call the selection in a step's label — a phrase, where `spoken()` is
   *  a clause. */
  naming() {
    if (!this.picked) return 'the page';
    return this.selection.length === 1 ? this.picked.named.phrase : `${this.selection.length} elements`;
  }

  /**
   * A gesture is starting: remember where every element it is about stands now.
   *
   * AT THE POINTERDOWN AND NEVER OFF `before`. `before` is where the composition
   * had the element, and an element being dragged for the second time is standing
   * on the first drag — so undoing to `before` would take four gestures back
   * instead of one. *put back* is the press for all the way home, and it is a step
   * of its own.
   */
  begin(of = this.selection) {
    this.gesture = of.map((held) => ({ element: held.element, from: { ...held.wanted } }));
  }

  /**
   * The gesture ended: put it on the stack.
   *
   * BOTH SIDES ARE RECORDED HERE, so redo is the same walk in the other direction
   * rather than a second recording made while undoing — which would measure the
   * state being left rather than the one being restored.
   *
   * @param {string} label            what the buttons and the report line call it
   * @param {object} [options]
   * @param {object[]} [options.of]   the records it was about, where that is not
   *   the selection — `putAllBack` is about the kept ones too
   * @param {object[]} [options.after] where they ended up, where the page has moved
   *   since: writing a Token repicks, and after a repick there is no `wanted` left
   *   to read
   * @param {object[]} [options.tokens]     Token writes to reverse
   * @param {object[]} [options.overrides]  Override writes to reverse
   * @param {object[]} [options.kept]  records this gesture took off `this.kept`, so
   *   an undo has something to apply its measures TO
   */
  finish(label, options = {}) {
    const started = this.gesture;
    this.gesture = null;
    const { of = this.selection, after = null, tokens = [], overrides = [], kept = [] } = options;
    const now = after ?? of.map((held) => ({ element: held.element, to: { ...held.wanted } }));
    const measures = (started ?? []).map(({ element, from }) => ({
      element,
      from,
      to: now.find((one) => one.element === element)?.to ?? { ...from },
    }));
    this.history.record({ label, measures, tokens, overrides, kept });
    this.paintHistory();
  }

  async undo() {
    if (this.replaying) return;
    if (!this.history.canUndo) {
      return this.say('there is nothing to undo — no gesture on this surface has changed anything yet');
    }
    const step = this.history.undo();
    const missing = await this.replay(step, true);
    this.paintHistory();
    if (missing === null) return;
    this.say(
      `undid ${step.label}${missing > 0 ? ` — ${missing} of the elements it named is no longer held, so that` +
        ' much of it stayed' : ''} — redo, or Ctrl-Shift-Z, puts it back`,
      missing > 0,
    );
  }

  async redo() {
    if (this.replaying) return;
    if (!this.history.canRedo) return this.say('there is nothing to redo — nothing has been undone');
    const step = this.history.redo();
    const missing = await this.replay(step, false);
    this.paintHistory();
    if (missing === null) return;
    this.say(`redid ${step.label}`, missing > 0);
  }

  /**
   * What a step MEANS, in whichever direction.
   *
   * THE FILE HALF FIRST AND THE PAGE HALF SECOND, because writing a Token repicks:
   * a `wanted` applied before the write would be thrown away by it. And the file
   * half is the reason this is async at all — undoing a scrubbed row is a POST,
   * because that row wrote a Token when it was let go of. An undo that put the page
   * back and left the file where the gesture put it would be the exact failure "a
   * Token's page and its file are two different things" exists to prevent, and the
   * author would be looking at a page that disagreed with the source.
   *
   * @returns {Promise<number|null>} how many of the step's elements this surface is
   *   no longer holding — so the report can say that much of it stayed — or null where
   *   a write was refused and the line has already been said
   */
  async replay(step, back) {
    this.replaying = true;
    try {
      // The records a *put the page back* took off `this.kept`, which have to be
      // held again before anything can be applied to them.
      for (const held of step.kept ?? []) {
        const at = this.kept.indexOf(held);
        if (back && at === -1 && !this.holding(held.element)) this.kept.push(held);
        if (!back && at !== -1) this.kept.splice(at, 1);
      }
      for (const one of step.overrides ?? []) {
        const going = back ? one.had : one.now;
        try {
          const answer = await this.post('/overrides', {
            selector: one.selector,
            name: going?.name ?? one.selector,
            note: going?.note ?? [],
            declarations: going?.declarations ?? {},
          });
          this.overrides = answer.overrides;
          this.paint();
        } catch (error) {
          this.say(`could not put the Override on ${one.selector} back: ${error.message}`, true);
          return null;
        }
        // The line for the value being restored, and never the one for the value it
        // replaced: an Override put back to what it held before is a different
        // instruction from the one that was undone.
        if (going === null) this.log?.unwrote('override', one.selector);
        else if (going.record) this.log?.wrote(going.record);
      }
      for (const one of step.tokens ?? []) {
        try {
          await this.surface.writeKey(one.section, one.key, back ? one.was : one.wants);
        } catch (error) {
          this.say(`could not put ${one.token} back: ${error.message}`, true);
          return null;
        }
        if (back) this.log?.unwrote('token', one.token);
        else if (one.record) this.log?.wrote(one.record);
      }
      // The page has moved through the Tokens surface's own preview, so the inline
      // styles have to go the same way they do after a write — `writeTokens`'s note
      // is the whole of why.
      if ((step.tokens ?? []).length > 0) this.repick();

      let missing = 0;
      const touched = [];
      for (const { element, from, to } of step.measures ?? []) {
        // Resolved NOW rather than held on the step: a repick, two lines up or in
        // the gesture that recorded this, has made fresh records for every one of
        // them.
        const held = this.holding(element);
        if (!held) {
          missing += 1;
          continue;
        }
        Object.assign(held.wanted, back ? from : to);
        this.applyTo(held);
        touched.push(held);
      }
      // The Recording follows the page, or the document the author pastes would ask
      // an agent for a gesture that was taken back.
      for (const held of touched) {
        this.log?.measured(held.element, this.measurement(held), held === this.picked ? this.scaled() : null);
      }
      this.paintPicked();
      return missing;
    } finally {
      this.replaying = false;
    }
  }

  /** The two buttons: whether they can be pressed, and what they would reverse. */
  paintHistory() {
    const undo = this.panel?.querySelector('[data-editor-undo]');
    const redo = this.panel?.querySelector('[data-editor-redo]');
    if (!undo || !redo) return;
    const { next } = this.history;
    undo.disabled = !this.history.canUndo;
    redo.disabled = !this.history.canRedo;
    // On the button rather than only in the report line: the author reads it
    // BEFORE pressing, which is the moment "which gesture is this going to take
    // back" is actually a question.
    undo.title = next.undo === null ? 'nothing on this surface has changed anything yet' : `undo ${next.undo}`;
    redo.title = next.redo === null ? 'nothing has been undone' : `redo ${next.redo}`;
    const said = this.panel?.querySelector('[data-editor-history-next]');
    if (said) said.textContent = next.undo === null ? '' : next.undo;
  }

  // -------------------------------------------------------------------------
  // The two things it hands back
  // -------------------------------------------------------------------------

  /** One Annotation per picked element, because each is its own instruction. */
  annotation() {
    if (!this.picked) return;
    const box = this.annotations();
    for (const held of this.selection) {
      const { text } = annotate(this.measurement(held));
      box.value = box.value === '' ? text : `${box.value}\n${'-'.repeat(78)}\n\n${text}`;
    }
    box.scrollTop = box.scrollHeight;
    this.say(
      this.selection.length === 1
        ? 'Annotation taken — copy it and paste it to an agent'
        : `${this.selection.length} Annotations taken — copy them and paste them to an agent`,
    );
  }

  async copy() {
    const text = this.annotations().value;
    if (text === '') return this.say('there is no Annotation to copy yet');
    try {
      await navigator.clipboard.writeText(text);
      this.say('the Annotations are on the clipboard');
    } catch (error) {
      // Selecting it is the fallback rather than the failure: the clipboard needs
      // permission the page may not have, and the text is right there.
      this.annotations().select();
      this.say(`could not reach the clipboard (${error.message}) — the text is selected, so copy it`, true);
    }
  }

  /**
   * An Override per picked element, because an Override names one element.
   *
   * A selection is not one Override with five selectors: the boundary's whole
   * guarantee is that a record addresses the element the author was looking at, so
   * five elements are five records with five selectors and five discards. What is
   * shared is the geometry, which is what the rows already made the same.
   */
  async override() {
    if (this.selection.length === 0) return;
    const wrote = [];
    const missed = [];
    const unnamed = [];
    // The gesture this press ends is everything standing in the inline styles it is
    // about to drop, so undoing it puts those back and discards the rule.
    this.begin();
    const steps = [];
    for (const held of this.selection) {
      const { selector, named, element } = held;
      if (selector === null) {
        unnamed.push(named.phrase);
        continue;
      }
      const measured = this.measurement(held);
      const { declarations, note } = annotate(measured);
      const { text } = measured;
      const retyped = Math.abs(text.after - text.before) >= 0.005;
      // THE TEXT INSIDE A BOX IS A RECORD OF ITS OWN, on the composition's own
      // rule. `annotate()` leaves `font-size` out of the box's declarations when
      // the words are not the box's own, because a size declared there is one
      // nothing on the page ever reads — and five items set by one rule are ONE
      // declaration in the source, so this is one record and not five selectors.
      // Where there is no rule to name, it is reported as unnamed rather than
      // written somewhere it would move text nobody picked.
      const records = [{ selector, name: named.phrase, note, declarations }];
      if (retyped && !text.own) {
        if (text.on === null) unnamed.push(`the text inside ${named.phrase}`);
        else {
          records.push({
            selector: text.on,
            name: `the text inside ${named.phrase}`,
            note: [`text set to ${px(text.after)}`, note.at(-1)],
            declarations: { 'font-size': px(text.after) },
          });
        }
      }
      // `display` alone is not a change the author asked for: it is the promotion
      // this surface made in order to measure an inline box at all, so on its own
      // it would write an Override for having looked at something.
      const writing = records.filter(
        (one) => Object.keys(one.declarations).filter((property) => property !== 'display').length > 0,
      );
      if (writing.length === 0) continue;
      const wanted = { ...measured.after };
      try {
        for (const one of writing) {
          // What the file held for this selector before, read before the post: the
          // answer comes back holding the new one, and this is the only thing that
          // knows what an undo has to put back — including nothing at all.
          const had = this.standingOn(one.selector);
          const answer = await this.post('/overrides', {
            selector: one.selector,
            name: one.name,
            note: one.note,
            declarations: one.declarations,
          });
          this.overrides = answer.overrides;
          this.paint();
          steps.push({
            selector: one.selector,
            had,
            now: { ...one, record: wroteOverride(one.selector, one.declarations) },
          });
          // On the Recording as ALREADY WRITTEN, and as debt: an Override is a value
          // standing outside every composition, and folding it back in is the work
          // whoever reads that document is being asked to do.
          this.log?.wrote(wroteOverride(one.selector, one.declarations));
        }
        this.log?.forget(element);
        // The inline styles go, because from here the page is moved by what the
        // file says — through this surface's own stylesheet until the next build.
        this.put(held);
        // And then it is CHECKED. An Override that lost to the composition would
        // otherwise be a file with a rule in it and a page that never moved. The
        // type is checked the same way and for the same reason: an Override on the
        // items' own rule can still lose to something more specific, and a text
        // size that did not follow is exactly the failure this whole change is
        // about.
        const landed = this.box(element);
        const off = AXES.filter((axis) => Math.abs(landed[axis] - wanted[axis]) > 1);
        if (retyped && Math.abs(this.typeNow(held) - text.after) > 0.5) off.push(TEXT);
        if (off.length > 0) missed.push(`${named.phrase} on ${list(off)}`);
        else wrote.push(named.phrase);
      } catch (error) {
        // Whatever landed before the refusal still landed, so it goes on the stack
        // rather than being lost with the press.
        if (steps.length > 0) this.finish(`the Override on ${this.naming()}`, { overrides: steps });
        return this.say(`refused: ${error.message}`, true);
      }
    }
    if (steps.length > 0) this.finish(`the Override on ${this.naming()}`, { overrides: steps });
    else this.gesture = null;
    this.paintPicked();
    if (wrote.length === 0 && missed.length === 0 && unnamed.length === 0) {
      return this.say('nothing has moved, so there is no Override to write');
    }
    const said = [
      wrote.length > 0 && `wrote ${wrote.length} Override(s) into src/overrides.css`,
      missed.length > 0 && `the page did not follow on ${list(missed)} — something on it outranks the Override`,
      unnamed.length > 0 && `${list(unnamed)} cannot be addressed uniquely, so no Override can name it`,
    ].filter(Boolean);
    this.say(list(said), missed.length > 0 || unnamed.length > 0);
  }

  /**
   * Write the Tokens a measurement landed on, through the controls that own them.
   *
   * A LIST AND NOT ONE, because `scale text` makes one gesture two writes: the size
   * and the type that followed it. They go one at a time through the Tokens
   * surface's own `writeKey` — the page, the control, the preview sheet and the file
   * move together — and the repick happens ONCE at the end, not per write, because
   * repicking between them would reset the measurement the second one is derived
   * from and it would land a number nobody asked for.
   *
   * IT HANDS BACK WHAT LANDED, because that is the half of the gesture undo cannot
   * see on the page: the value went into a file, and the only way back is to write
   * the old one. Each entry carries the line the Recording was given as well, so a
   * redo can put that line back rather than composing a second spelling of it.
   *
   * @returns {Promise<{ section: string, key: string, token: string, was: string,
   *   wants: string, record: object }[]>}
   */
  async writeTokens(found, gesture = null) {
    if (!this.surface) {
      this.say('the Tokens surface is not here to write through', true);
      return [];
    }
    const wrote = [];
    let refused = null;
    for (const one of found) {
      // The value the file holds NOW, read before the write rather than off the
      // measurement afterwards — `was` on the offer is the same number, and reading
      // it here is what makes that true whatever else has moved since the pick.
      const was = one.was;
      try {
        await this.surface.writeKey(one.section, one.key, one.wants);
        // On the Recording as ALREADY WRITTEN, so an agent handed the document does
        // not apply it a second time — which is arithmetic on a number that has
        // already moved, and therefore silently wrong rather than a no-op. The row
        // NAMED is the one the author let go of and not the axis this Token governs:
        // with `scale text` on those are two different rows, and "written when the
        // text size row was let go of" about a width scrub would be a sentence that
        // did not happen.
        const record = {
          kind: 'token',
          what: one.token,
          value: one.wants,
          file: holderFile(one.section),
          where:
            gesture === null || gesture === one.axis
              ? `a Token, written when the ${one.axis} row was let go of`
              : `a Token governing ${one.axis}, written when the ${gesture} row was let go of and the text` +
                ' followed the box',
        };
        this.log?.wrote(record);
        wrote.push({ section: one.section, key: one.key, token: one.token, was, wants: one.wants, record });
      } catch (error) {
        refused = error.message;
        break;
      }
    }
    // The page has moved through the Tokens surface's own preview, so this one's
    // inline styles would double the change. Dropping them and measuring again from
    // where the page now is means the next drag starts from the truth rather than
    // from a stack of two — and it happens even after a refusal, because whatever
    // did land has already moved the page.
    if (wrote.length > 0) this.repick();
    if (refused !== null) {
      this.say(`refused: ${refused}`, true);
      return wrote;
    }
    this.say(
      `wrote ${list(wrote.map((one) => `${one.token} = ${one.wants}`))} — measured again from where the` +
        ' page now is, and undo writes it back',
    );
    return wrote;
  }

  /**
   * The record the file holds for a selector right now, in the shape the write
   *  boundary takes one — which is what an undo has to post back.
   *
   * ONE SIDE OF A STEP, and it carries the Recording's line as well as the
   * declarations: an Override standing in the file is a line in the written list,
   * so putting it back has to put that line back too, and the line for the value
   * being REPLACED is not the line for the value replacing it.
   */
  standingOn(selector) {
    const record = this.overrides.find((one) => one.selector === selector);
    if (!record) return null;
    const declarations = Object.fromEntries(record.declarations.map(({ property, value }) => [property, value]));
    return { name: record.name, note: record.note, declarations, record: wroteOverride(selector, declarations) };
  }

  async discard(selector) {
    // Read BEFORE the post, because the answer comes back without it — and it is
    // the only thing that knows what to put back.
    const had = this.standingOn(selector);
    try {
      const answer = await this.post('/overrides', { selector, declarations: {} });
      this.overrides = answer.overrides;
      this.paint();
      this.log?.unwrote('override', selector);
      this.begin([]);
      this.finish(`discarding the Override on ${selector}`, {
        of: [],
        overrides: [{ selector, had, now: null }],
      });
      this.say(`discarded the Override on ${selector} — undo writes it back`);
    } catch (error) {
      this.say(`refused: ${error.message}`, true);
    }
  }

  /** The Overrides: the stylesheet that makes them show, and the list that makes
   *  them impossible to forget. */
  paint() {
    // `ruleFor` is the BOUNDARY's own renderer rather than a second spelling of
    // it. This sheet is what the author judges the page by, so a preview that
    // drifted from the file would be the worst kind of wrong — right on screen and
    // wrong on disk, with nothing to notice until the next build.
    sheet().textContent = this.overrides.map((record) => `/* ${record.name} */\n${ruleFor(record)}`).join('\n');

    this.standing(this.overrides.length);
    const into = this.panel?.querySelector('[data-editor-overrides-list]');
    if (!into) return;
    into.textContent = '';

    const head = document.createElement('p');
    head.dataset.editorNote = '';
    head.textContent =
      this.overrides.length === 0
        ? 'No Overrides. One is a value standing outside a Section so the page looks right' +
          ' now — it is debt, so they are all listed here until an agent folds them in.'
        : `${this.overrides.length} Override(s) standing outside a composition, in src/overrides.css:`;
    into.append(head);

    for (const record of this.overrides) {
      const row = document.createElement('div');
      row.dataset.editorOverride = record.selector;
      const what = document.createElement('span');
      what.textContent = record.name;
      what.title = record.note.join('\n');
      const declared = document.createElement('small');
      declared.textContent = record.declarations
        .map(({ property, value }) => `${property}: ${value}`)
        .join('; ');
      const drop = document.createElement('button');
      drop.type = 'button';
      drop.dataset.editorDiscard = record.selector;
      drop.textContent = 'discard';
      drop.addEventListener('click', () => void this.discard(record.selector));
      row.append(what, declared, drop);
      into.append(row);
    }
  }

  // -------------------------------------------------------------------------
  // Listening
  // -------------------------------------------------------------------------

  listen() {
    // Capture, and only while armed: a click on the page has to pick rather than
    // follow a link, throw the theme switch, or start editing a word.
    document.addEventListener(
      'pointerdown',
      (event) => {
        if (!this.armed) return;
        const handle = event.target.closest?.('[data-editor-handle]');
        // A row's label is the scrub handle, and it IS inside the panel — so it is
        // taken before the panel is stood down on, and nothing else in there is.
        const scrub = event.target.closest?.('[data-editor-scrub]');
        if (scrub) {
          if (!this.picked) return;
          event.preventDefault();
          // Where every picked element stands as this gesture begins — the undo
          // stack's `from`. Taken at the pointerdown for the same reason the
          // scrub's own `from` is: anything read later has already moved.
          this.begin();
          const axis = scrub.dataset.editorScrub;
          this.dragging = {
            how: 'scrub',
            axis,
            x: event.clientX,
            step: SCRUB[axis] ?? SCRUB.default,
            // Where the row stands now, resolved once for the same reason a
            // corner's sizes are: reading it back off `after` every frame reads a
            // box the previous frame already moved, and the drag outruns the
            // pointer.
            from: axis === TEXT ? this.picked.type.after : this.picked.after[axis],
          };
          return;
        }
        if (!handle && event.target.closest?.('[data-editor]')) return;
        event.preventDefault();
        event.stopPropagation();

        if (handle) {
          if (!this.picked) return;
          // A ZOOM TAKES THE HANDLE FIRST, because it is a different gesture on the
          // same grip rather than a variation of the resize: nothing about the box is
          // asked for, so `wanted` is never touched and there is no `begin()` to
          // pair with — the step this gesture puts on the stack is the Token write.
          if (this.zooming) {
            const zoom = this.zoomToken();
            if (!zoom) {
              this.say(
                `nothing on this page declares ${ZOOM}, so there is no zoom to drag — the toggle is on and` +
                  ' this gesture has nothing behind it',
                true,
              );
              return;
            }
            this.dragging = {
              how: 'zoom',
              corner: handle.dataset.editorHandle,
              x: event.clientX,
              y: event.clientY,
              zoom,
              // The box the ratio is read off, and the zoom the drag started at.
              // Resolved once here for the reason the resize's sizes are: the page
              // MOVES under this gesture, so reading either back per frame reads a
              // page the previous frame already zoomed and the drag runs away.
              from: { ...this.picked.after, dx: 0, dy: 0, at: zoom.at },
            };
            return;
          }
          // WHICH AXES HAVE NO SIZE OF THEIR OWN, asked once as the corner is taken
          // hold of. `fills()` probes the page — it writes a size and sees whether
          // the box moved — so it is a forced layout, and asking it per frame is the
          // one thing on this surface that would feel slow. The refusals are carried
          // to the RELEASE rather than said here: this panel has one report line, so
          // anything said at the grab is overwritten by the drag's own reporting on
          // the very next frame. `refusal()` is where they are said.
          const corner = handle.dataset.editorHandle;
          const asked = this.fills(corner);
          this.begin();
          this.dragging = {
            how: 'resize',
            corner,
            // The axes this drag closes a padding for instead of sizing, and the
            // ones it found no padding it may write for. Both empty for every
            // ordinary box, which is what keeps this out of the way.
            fills: asked.filter((one) => one.token),
            refused: asked.filter((one) => one.why),
            x: event.clientX,
            y: event.clientY,
            // Where the box stands NOW, which is what "the anchor did not move"
            // is measured against when this drag is let go — see `anchored()`.
            // Not `before`: an element already moved is standing on a translate
            // the author asked for, and that is not the layout refusing to let go.
            was: { ...this.picked.after },
            // The sizes are RESOLVED here rather than each frame. `wanted.width`
            // is null until something has asked for one, and reading the fallback
            // off `after` on every move would read a box the previous frame had
            // already resized — so a slow drag compounded and outran the pointer.
            from: {
              dx: this.picked.wanted.dx,
              dy: this.picked.wanted.dy,
              width: this.picked.wanted.width ?? this.picked.after.width,
              height: this.picked.wanted.height ?? this.picked.after.height,
            },
          };
          return;
        }
        const element = event.target;
        if (!(element instanceof Element) || element === document.body) return;
        // Shift is the series: it adds to the selection, or takes back out
        // something already in it, and never starts a drag — a shift-click that
        // also dragged would move the thing it was picking.
        if (event.shiftKey) {
          this.pick(element, true);
          return;
        }
        // Inside something already picked — its own box, or anything the DOM puts
        // within it. Which gesture this is cannot be known at the press, so it
        // waits: `this.pending` is the whole of why.
        //
        // DESCENDANCE AND NOT GEOMETRY, deliberately. "Anywhere inside the box" is
        // what it is for, but the Panel's Frame is drawn OVER the subheading at some
        // widths, and a press on the Frame that moved the subheading underneath it
        // would be this surface moving something the pointer was not on.
        if (this.selection.some((held) => held.element === element || held.element.contains(element))) {
          this.pending = { element, x: event.clientX, y: event.clientY };
          return;
        }
        this.pick(element);
        // AFTER the pick, because picking clears the selection this is about.
        this.begin();
        this.dragging = { how: 'move', x: event.clientX, y: event.clientY, from: { ...this.picked.wanted } };
      },
      true,
    );

    document.addEventListener(
      'pointermove',
      (event) => {
        // A press inside what is already picked turns into a drag of it HERE, once
        // the pointer has actually gone somewhere. The origin stays the press, so
        // nothing jumps as it is promoted: the box moves by exactly what the pointer
        // has travelled, the slop included. And `wanted` is read here rather than at
        // the press because it cannot have changed between the two — nothing else
        // runs in that window — so this is the same numbers a frame later.
        if (this.pending) {
          const far =
            Math.abs(event.clientX - this.pending.x) >= SLOP || Math.abs(event.clientY - this.pending.y) >= SLOP;
          if (!far) return;
          const { x, y } = this.pending;
          this.pending = null;
          if (!this.picked) return;
          this.begin();
          this.dragging = { how: 'move', x, y, from: { ...this.picked.wanted } };
        }
        if (!this.dragging || !this.picked) return;
        event.preventDefault();
        const dx = event.clientX - this.dragging.x;
        const dy = event.clientY - this.dragging.y;
        const { from } = this.dragging;
        if (this.dragging.how === 'zoom') {
          // The same ratio a scale uses — `lib/corners.mjs` says why it is the axis
          // the pointer travelled further along and not the smaller of the two. Here
          // it matters more than it does there: the Front Screen's column can only
          // grow sideways, so a ratio that averaged the two axes in would leave the
          // corner lagging the pointer by half on the one gesture this exists for.
          const asked = ratio(resize(this.dragging.corner, { dx, dy }, from), from);
          return this.showZoom(factor(from.at * (asked ?? 1)));
        }
        if (this.dragging.how === 'scrub') {
          // A held Shift is the fine step, because a text size is chosen in tenths
          // and a pointer is not that precise over sixteen pixels.
          const step = event.shiftKey ? FINE : this.dragging.step;
          return this.want(this.dragging.axis, round(from + dx * step));
        }
        // Worked out from the PRIMARY and given to every picked element, which is
        // what `want()` does for a typed number and for the same reason: an
        // absolute size means the same thing for all of them, a coordinate does
        // not.
        // A resize moves the box as well as sizing it, unless the corner under the
        // pointer is the bottom right — the corner OPPOSITE the one being dragged
        // has to stay where it is, and that is the whole of `lib/corners.mjs`.
        //
        // ONE RATIO OR TWO AXES, and Shift INVERTS whichever the toggle says — so
        // the answer is one exclusive-or rather than two modes, and the key means
        // "the other one, just for this drag" in both directions. Shift is free to
        // mean that here: on a scrub it is the fine step and on a press it builds
        // the series, and a corner drag is neither. Read per frame, so a Shift
        // pressed part way through takes effect where the pointer already is
        // rather than at the next press.
        const wanted =
          this.dragging.how === 'move'
            ? { dx: round(from.dx + dx), dy: round(from.dy + dy) }
            : (this.scaling !== event.shiftKey ? proportional : resize)(
                this.dragging.corner,
                { dx, dy },
                from,
              );
        // A FILL AXIS IS NOT SIZED — it closes a padding — so the size this corner
        // would have asked for on it is taken back out before anything is written.
        // Writing it anyway is what this gesture used to do, and the flex algorithm
        // discarded it every frame: `null` is "nothing asked for", which is the
        // truth of what this half of the drag does to the box. The translate that
        // holds the anchor comes out with it, for the same reason — the box is not
        // changing size by this surface's doing, so moving it to compensate for a
        // change it did not make would drag it off the composition for nothing.
        for (const one of this.dragging.fills ?? []) {
          wanted[one.axis] = null;
          const along = one.axis === 'height' ? 'dy' : 'dx';
          wanted[along] = from[along];
        }
        // The ratio each member's own box was asked to take, where this gesture was
        // a scale — see the note on `by` in `record()` for why it is per member and
        // measured from the pick. Cleared on anything else, including a move, so the
        // number never outlives the gesture it describes.
        const scaling = this.dragging.how === 'resize' && this.scaling !== event.shiftKey;
        for (const held of this.selection) {
          Object.assign(held.wanted, wanted);
          held.by = scaling ? ratio(held.wanted, held.before) : null;
        }
        // The other of the two places a resize is expressed — see `fitType()`. A
        // move is not one, so a drag across the page never touches the type.
        if (this.dragging.how === 'resize') this.fitType();
        this.apply();
        // AFTER the sizes, so the last thing to measure the page is the thing that
        // moved it last: closing a padding reflows the box, and a read taken before
        // that would report the frame before the one on screen.
        if (this.dragging.fills?.length > 0) this.showFills({ dx, dy });
      },
      true,
    );

    for (const done of ['pointerup', 'pointercancel']) {
      document.addEventListener(
        done,
        (event) => {
          // A press inside what is already picked that never went anywhere is a
          // click, and a click picks the deepest element under it — which is the way
          // INTO a box after its parent has been picked, and the only one the pointer
          // has. Nothing was begun, so there is nothing here to land, log or record.
          if (this.pending) {
            const { element } = this.pending;
            this.pending = null;
            // Not on a cancel: that is the gesture being taken away rather than let
            // go of, and it should leave the selection where it found it. And not on
            // something already picked — a click on what the author is holding is not
            // a change of mind, and re-picking one of a series would drop the rest.
            const held = this.selection.some((one) => one.element === element);
            if (event.type === 'pointerup' && !held) this.pick(element);
            return;
          }
          if (!this.dragging) return;
          const { how, axis, corner, was, fills, refused } = this.dragging;
          // A ZOOM IS LET GO OF BEFORE `this.dragging` IS CLEARED, because both
          // halves of it — the value the page is showing and the Token to write it
          // to — are on the drag and nowhere else. A cancel puts the page back
          // instead: the gesture was taken away rather than finished, and writing a
          // Token nobody let go of would be this surface deciding it had been.
          if (how === 'zoom') {
            const { zoom, from, at = from.at } = this.dragging;
            this.dragging = null;
            if (event.type !== 'pointerup') {
              // The value the FILE holds, which is where the page goes back to: the
              // preview sheet is the only thing showing anything else.
              this.surface?.preview(zoom.section, zoom.token, zoom.token.value);
              this.repick();
              return void this.say('the zoom gesture was cancelled — the page is back where it was');
            }
            return void this.landZoom(zoom, from.at, at);
          }
          this.dragging = null;
          if (!this.picked) return;
          // A scrub is a deliberate change to the value the row names, so letting
          // go of one lands it. A drag on the page is exploration, and stays a
          // measurement until the author says otherwise — `land()` is the whole
          // note on why the two differ.
          if (how === 'scrub' && event.type === 'pointerup') return void this.land(axis);
          // A FILL THAT MOVED A PADDING IS THE THIRD KIND, and it lands like a
          // scrub rather than like the drag it arrived on: what it moved is a
          // Token, and `landFills()` is the note on why that is written where the
          // rest of the same gesture is not. A cancel puts the page back instead —
          // the gesture was taken away rather than finished, and writing a Token
          // nobody let go of would be this surface deciding it had been.
          const closed = (fills ?? []).filter((one) => one.wants);
          if (closed.length > 0) {
            if (event.type !== 'pointerup') {
              // The value the FILE holds, which is where the page goes back to: the
              // preview sheet is the only thing showing anything else.
              for (const one of closed) this.surface?.preview(one.section, one.held, one.held.value);
              this.repick();
              return void this.say('the drag was cancelled — the padding is back where the file has it');
            }
            return void this.landFills(closed, corner, was, refused);
          }
          // A completed gesture, so the Recording gets it — including a cancelled
          // one, because a pointercancel leaves the page wherever the last frame put
          // it and a document that did not mention it would be describing a
          // different page from the one on screen.
          this.logged();
          // And the undo stack, for the same reason and at the same moment: a
          // gesture is one step whether it ended under the pointer or was cancelled
          // out from under it, because the page is left where the last frame put it
          // either way.
          this.finish(
            how === 'scrub'
              ? `the ${axis} of ${this.naming()}`
              : `${how === 'resize' ? 'resizing' : 'moving'} ${this.naming()}`,
          );
          const headline = annotate(this.measurement()).headline;
          // Only a resize can lose an anchor: a move translates the box and asks
          // the layout for nothing.
          const anchor = how === 'resize' ? this.anchored(corner, was) : '';
          // The ratio a scale asked for, said out loud: it is the number the author
          // is going to quote, and reading it off the four rows is arithmetic the
          // surface can do for them. The rows still say what the box actually took.
          const scale = this.picked.by === null ? '' : ` — scaled ×${round(this.picked.by)}`;
          // And the padding this gesture could not write, where the corner was on a
          // box with no size of its own — said HERE because the report line is one
          // line and the release is the only moment nothing overwrites it.
          this.say(
            `${this.picked.named.phrase}: ${headline}${scale}${anchor}${this.refusal(refused)}`,
            anchor !== '',
          );
        },
        true,
      );
    }

    // The keyboard, which is the other half of "click its parents": the chain is
    // in the breadcrumb and this walks it without the pointer leaving the page.
    document.addEventListener(
      'keydown',
      (event) => {
        if (!this.armed) return;
        // Ctrl-Z, and Ctrl-Shift-Z or Ctrl-Y the other way. BEFORE the panel stands
        // down, and before the "something has to be picked" gate: a kept change is
        // still standing on the page with nothing picked at all, and the whole point
        // of the stack is that it survives the selection moving on.
        if ((event.metaKey || event.ctrlKey) && !event.altKey) {
          const key = event.key.toLowerCase();
          const undo = key === 'z' && !event.shiftKey;
          const redo = key === 'y' || (key === 'z' && event.shiftKey);
          if (!undo && !redo) return;
          // Except where the browser has an undo of its own to give: a number box
          // and the Annotation textarea are text being typed, and taking Ctrl-Z off
          // them would be this surface reaching into a field it does not own.
          if (typing(event.target)) return;
          event.preventDefault();
          event.stopPropagation();
          void (undo ? this.undo() : this.redo());
          return;
        }
        if (!this.picked) return;
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        // Not while a number is being typed, and not while anything else in the
        // panel has the focus: an arrow key in a number box belongs to the box.
        const inside = event.target instanceof Element && event.target.closest('[data-editor]');
        if (inside) return;
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          event.preventDefault();
          this.climb(event.key === 'ArrowUp');
          return;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          this.clear();
          this.paintPicked();
          this.say('nothing is picked — still measuring, so a click picks again');
        }
      },
      true,
    );

    // The box drawn over what is picked is in fixed coordinates, so it follows
    // the page rather than the document.
    for (const moved of ['scroll', 'resize']) {
      window.addEventListener(moved, () => this.paintMarquee(), { passive: true });
    }
  }
}
