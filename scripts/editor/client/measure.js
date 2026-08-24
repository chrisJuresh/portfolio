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
 *     chain and `↑`/`↓` walk it.
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
 */

import { AXES, TEXT, annotate, list, name, nudge, restate } from './lib/annotations.mjs';
import { asWritten, insets } from './lib/boxes.mjs';
import { CORNERS, label as cornerLabel, drift, resize, word as cornerWord } from './lib/corners.mjs';
import { DISPLAY, asSelector, rule as ruleFor } from './lib/overrides.mjs';

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
function authored(element, property) {
  let found = null;
  const walk = (rules) => {
    for (const rule of rules) {
      // A style rule IS a grouping rule now — CSS nesting gave `CSSStyleRule` a
      // `cssRules` of its own, empty for a rule with nothing nested in it. So a
      // rule is read AND descended into, never one or the other: the first
      // version of this treated a truthy `cssRules` as "not a declaration" and
      // therefore found nothing at all, anywhere, silently.
      if (rule.selectorText && rule.style) {
        const value = rule.style.getPropertyValue(property);
        let matches = false;
        try {
          matches = element.matches(rule.selectorText);
        } catch {
          matches = false;
        }
        if (value !== '' && matches) found = { value: value.trim(), selector: stripScope(rule.selectorText) };
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
   */
  constructor({ glossary, overrides, tokens, surface, post, say, standing }) {
    this.glossary = glossary ?? [];
    this.overrides = overrides ?? [];
    this.tokens = tokens ?? [];
    this.surface = surface;
    this.post = post;
    this.say = say;
    this.standing = standing ?? (() => {});
    this.armed = false;
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
   * The Token that governs each axis, if the composition has one.
   *
   * Read once, when the element is picked: what governs a length does not change
   * because the length did, and walking every stylesheet on every frame of a drag
   * would be the one thing in this surface that felt slow.
   */
  governing(element) {
    const found = {};
    for (const axis of MEASURES) {
      for (const [property, sign] of GOVERNED[axis]) {
        const declaration = authored(element, property);
        if (!declaration) continue;
        const one = ONE_TOKEN.exec(declaration.value);
        found[axis] = {
          property,
          sign,
          on: declaration.selector,
          was: declaration.value,
          token: one?.[1] ?? null,
          // What the bound itself comes to, so a measurement can ask whether the
          // box is actually standing on it before offering to restate it.
          computed: Number.parseFloat(getComputedStyle(element).getPropertyValue(property)),
          // Every Token the value mentions, for the case where it mentions
          // several: naming the constants a `calc()` is built out of is most of
          // what an agent needs to decide which of them moved.
          inside: [...new Set([...declaration.value.matchAll(EVERY_TOKEN)].map((seen) => seen[1]))],
        };
        break;
      }
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

  /** Everything this surface tracks about one element, ready to be dragged. */
  record(element) {
    const parent = element.parentElement;
    const computed = getComputedStyle(element);
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
      // of `AXES` and so does this.
      type: { before: this.typeSize(element), after: this.typeSize(element) },
      wanted: { dx: 0, dy: 0, width: null, height: null, size: null },
      was: {
        display: element.style.display,
        'font-size': element.style.fontSize,
        translate: element.style.translate,
        width: element.style.width,
        height: element.style.height,
      },
      governs: this.governing(element),
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
        // Out again — restoring only this one, because the rest are still picked.
        this.put(this.selection[at]);
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
            ' drag it, drag a corner, scrub a row, or shift-click to pick more',
      selector === null,
    );
  }

  /** Pick the same elements again, from where the page now is. What a Token write
   *  needs: the page has moved under the selection, so every `before` is stale. */
  repick() {
    const elements = this.selection.map((held) => held.element);
    this.clear();
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
    held.wanted = { dx: 0, dy: 0, width: null, height: null, size: null };
    held.after = this.box(held.element);
    held.type.after = this.typeSize(held.element);
  }

  /** Every picked element back where the page had it, still picked. */
  restore(report = true) {
    if (this.selection.length === 0) return;
    for (const held of this.selection) this.put(held);
    this.paintPicked();
    if (report) this.say(`${this.spoken()} back where the page had it`);
  }

  /** Nothing picked, and nothing left behind on the page. */
  clear() {
    for (const held of this.selection) this.put(held);
    this.selection = [];
    this.came = null;
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
    set('font-size', wanted.size === null ? null : `${wanted.size}px`);
    // A MEASURED size is a BORDER box and a WRITTEN one is a CONTENT box unless
    // the element says otherwise, so the two are converted rather than confused.
    // `lib/boxes.mjs` is the whole reason, and it is not cosmetic: `resize()`
    // derives a corner's MOVE from the size it asked for, so an inflated box
    // drifts its anchor by padding-plus-border and stays drifted.
    const sizes = asWritten(wanted, insets(getComputedStyle(element)));
    set('width', sizes.width === null ? null : `${sizes.width}px`);
    set('height', sizes.height === null ? null : `${sizes.height}px`);
    // MEASURED and not computed: a flex child whose width is capped ends up
    // somewhere other than where it was dragged to, and a text size the page
    // clamps lands somewhere other than where it was scrubbed. The number the
    // author wants in the Annotation is where it actually is.
    held.after = this.box(element);
    held.type.after = this.typeSize(element);
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
      text: { before: type.before, after: type.after },
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
        <kbd>↑</kbd> and <kbd>↓</kbd> climb to a parent and back, dragging moves it, a corner
        resizes it from the opposite one, and scrubbing a row writes the Token that governs it
        where there is one. <kbd>Esc</kbd> drops the selection.</small>
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

    into.querySelector('[data-editor-copy]').addEventListener('click', () => this.copy());
    into.querySelector('[data-editor-forget]').addEventListener('click', () => {
      this.annotations().value = '';
      this.say('the Annotations are cleared');
    });

    this.listen();
    this.paint();
    this.paintPicked();
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

      const box = document.createElement('input');
      box.type = 'number';
      box.step = text ? '0.1' : '1';
      box.dataset.editorNudge = axis;
      box.value = String(to);
      // Typing a number is the same deliberate change as scrubbing one, so it
      // lands the same way: preview, then write whatever the row is backed by.
      box.addEventListener('change', () => {
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
    this.apply();
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
    const found = this.measurement().tokens.find((one) => one.axis === axis);
    if (!found || found.wants === null || found.section === null || found.key === null) return;
    if (this.selection.length > 1) {
      const theirs = this.selection.map((held) => held.governs[axis]?.token ?? null);
      if (theirs.some((token) => token !== found.token)) {
        return this.say(
          `${axis} is ${found.token} on ${this.picked.named.phrase}, and something else on the rest of the` +
            ' selection — so nothing was written. Take the Annotation, or pick them one at a time.',
          true,
        );
      }
    }
    await this.writeToken(found);
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
    for (const held of this.selection) {
      const { selector, named, element } = held;
      if (selector === null) {
        unnamed.push(named.phrase);
        continue;
      }
      const measured = this.measurement(held);
      const { declarations, note } = annotate(measured);
      // `display` alone is not a change the author asked for: it is the promotion
      // this surface made in order to measure an inline box at all, so on its own
      // it would write an Override for having looked at something.
      if (Object.keys(declarations).filter((property) => property !== 'display').length === 0) continue;
      const wanted = { ...measured.after };
      try {
        const answer = await this.post('/overrides', { selector, name: named.phrase, note, declarations });
        this.overrides = answer.overrides;
        this.paint();
        // The inline styles go, because from here the page is moved by what the
        // file says — through this surface's own stylesheet until the next build.
        this.put(held);
        // And then it is CHECKED. An Override that lost to the composition would
        // otherwise be a file with a rule in it and a page that never moved.
        const landed = this.box(element);
        const off = AXES.filter((axis) => Math.abs(landed[axis] - wanted[axis]) > 1);
        if (off.length > 0) missed.push(`${named.phrase} on ${list(off)}`);
        else wrote.push(named.phrase);
      } catch (error) {
        return this.say(`refused: ${error.message}`, true);
      }
    }
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

  /** Write the Token a measurement landed on, through the control that owns it. */
  async writeToken(found) {
    if (!this.surface) return this.say('the Tokens surface is not here to write through', true);
    try {
      await this.surface.writeKey(found.section, found.key, found.wants);
      // The page has moved through the Tokens surface's own preview, so this
      // one's inline styles would double the change. Dropping them and measuring
      // again from where the page now is means the next drag starts from the
      // truth rather than from a stack of two.
      this.repick();
      this.say(`wrote ${found.token} = ${found.wants} — measured again from where the page now is`);
    } catch (error) {
      this.say(`refused: ${error.message}`, true);
    }
  }

  async discard(selector) {
    try {
      const answer = await this.post('/overrides', { selector, declarations: {} });
      this.overrides = answer.overrides;
      this.paint();
      this.say(`discarded the Override on ${selector}`);
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
          this.dragging = {
            how: 'resize',
            corner: handle.dataset.editorHandle,
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
        if (!this.selection.some((held) => held.element === element)) this.pick(element);
        this.dragging = { how: 'move', x: event.clientX, y: event.clientY, from: { ...this.picked.wanted } };
      },
      true,
    );

    document.addEventListener(
      'pointermove',
      (event) => {
        if (!this.dragging || !this.picked) return;
        event.preventDefault();
        const dx = event.clientX - this.dragging.x;
        const dy = event.clientY - this.dragging.y;
        const { from } = this.dragging;
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
        const wanted =
          this.dragging.how === 'move'
            ? { dx: round(from.dx + dx), dy: round(from.dy + dy) }
            : // A resize moves the box as well as sizing it, unless the corner
              // under the pointer is the bottom right — the corner OPPOSITE the one
              // being dragged has to stay where it is, and that is the whole of
              // `lib/corners.mjs`.
              resize(this.dragging.corner, { dx, dy }, from);
        for (const held of this.selection) Object.assign(held.wanted, wanted);
        this.apply();
      },
      true,
    );

    for (const done of ['pointerup', 'pointercancel']) {
      document.addEventListener(
        done,
        (event) => {
          if (!this.dragging) return;
          const { how, axis, corner, was } = this.dragging;
          this.dragging = null;
          if (!this.picked) return;
          // A scrub is a deliberate change to the value the row names, so letting
          // go of one lands it. A drag on the page is exploration, and stays a
          // measurement until the author says otherwise — `land()` is the whole
          // note on why the two differ.
          if (how === 'scrub' && event.type === 'pointerup') return void this.land(axis);
          const headline = annotate(this.measurement()).headline;
          // Only a resize can lose an anchor: a move translates the box and asks
          // the layout for nothing.
          const anchor = how === 'resize' ? this.anchored(corner, was) : '';
          this.say(`${this.picked.named.phrase}: ${headline}${anchor}`, anchor !== '');
        },
        true,
      );
    }

    // The keyboard, which is the other half of "click its parents": the chain is
    // in the breadcrumb and this walks it without the pointer leaving the page.
    document.addEventListener(
      'keydown',
      (event) => {
        if (!this.armed || !this.picked) return;
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
