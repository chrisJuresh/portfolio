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
 */

import { AXES, annotate, list, name, nudge, restate } from './lib/annotations.mjs';
import { CORNERS, label as cornerLabel, resize } from './lib/corners.mjs';
import { DISPLAY, asSelector, rule as ruleFor } from './lib/overrides.mjs';

/** Which of the parent's two sides each axis is measured down. `AXES` itself is
 *  the Annotation's, imported rather than spelled again. */
const DOWN = { left: 'x', width: 'x', top: 'y', height: 'y' };

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
    this.picked = null;
    this.panel = null;
    this.marquee = null;
    this.dragging = null;
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
    for (const axis of AXES) {
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

  pick(element) {
    if (this.picked) this.restore(false);
    const selector = selectorFor(element);
    const parent = element.parentElement;
    const computed = getComputedStyle(element);
    this.picked = {
      element,
      named: this.describe(element),
      selector,
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
      wanted: { dx: 0, dy: 0, width: null, height: null },
      was: {
        display: element.style.display,
        translate: element.style.translate,
        width: element.style.width,
        height: element.style.height,
      },
      governs: this.governing(element),
    };
    if (this.picked.promoted) {
      element.style.setProperty('display', DISPLAY, 'important');
      this.picked.before = this.box(element);
      this.picked.after = this.box(element);
    }
    this.paintPicked();
    this.say(
      selector === null
        ? `picked ${this.picked.named.phrase} — nothing here can address it uniquely, so an Annotation can be` +
            ' taken but an Override cannot be written'
        : `picked ${this.picked.named.phrase}${
            this.picked.promoted ? ` — an inline box, so it is measured as ${DISPLAY}` : ''
          } — drag it, drag a corner to resize it, or type its numbers`,
      selector === null,
    );
  }

  /** Put the element back the way the page had it — including a promotion this
   *  surface made in order to be able to measure it at all. */
  restore(report = true) {
    if (!this.picked) return;
    const { element, was } = this.picked;
    for (const [property, held] of Object.entries(was)) {
      element.style.removeProperty(property);
      if (held !== '') element.style.setProperty(property, held);
    }
    this.picked.wanted = { dx: 0, dy: 0, width: null, height: null };
    this.picked.after = this.box(element);
    this.paintPicked();
    if (report) this.say(`${this.picked.named.phrase} is back where the page had it`);
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
   */
  apply() {
    const { element, wanted, base } = this.picked;
    const set = (property, value) => {
      element.style.removeProperty(property);
      if (value === null) {
        if (this.picked.was[property] !== '') element.style.setProperty(property, this.picked.was[property]);
      } else {
        element.style.setProperty(property, value, 'important');
      }
    };
    if (this.picked.promoted) set('display', DISPLAY);
    // base + delta, and never the delta alone: see the note on `base` in pick().
    set(
      'translate',
      wanted.dx === 0 && wanted.dy === 0 && base.x === 0 && base.y === 0
        ? null
        : `${round(base.x + wanted.dx)}px ${round(base.y + wanted.dy)}px`,
    );
    set('width', wanted.width === null ? null : `${wanted.width}px`);
    set('height', wanted.height === null ? null : `${wanted.height}px`);
    // MEASURED and not computed: a flex child whose width is capped ends up
    // somewhere other than where it was dragged to, and the number the author
    // wants in the Annotation is where it actually is.
    this.picked.after = this.box(element);
    this.paintPicked();
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

  /** The whole measurement, as `annotate()` wants it. */
  measurement() {
    const { element, before, after, governs } = this.picked;
    const root = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    const font = Number.parseFloat(getComputedStyle(element).fontSize);
    const viewport = { width: innerWidth, height: innerHeight };
    const parent = { width: this.picked.parent.width, height: this.picked.parent.height };

    const tokens = [];
    for (const axis of AXES) {
      const by = round(after[axis] - before[axis]);
      if (by === 0) continue;
      const governed = governs[axis];
      if (!governed) continue;
      const ctx = { root, font, parent, viewport, axis: DOWN[axis] };

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
        (Number.isFinite(governed.computed) && Math.abs(governed.computed - before[axis]) < 0.5);
      const wants = !onTheBound
        ? null
        : axis === 'width' || axis === 'height'
          ? restate(token.value, after[axis], ctx)
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
            : `it is a ${governed.property} and the box is not standing on it — ${px(before[axis])} against a` +
              ` bound of ${px(governed.computed)} — so writing the measured size there would not move the page`,
        }),
      );
    }

    return {
      named: this.picked.named,
      selector: this.picked.selector ?? '(nothing on this page addresses it uniquely)',
      viewport,
      root,
      parent: this.picked.parent,
      before,
      after,
      // The absolute translate the page is showing, base included: an Override
      // REPLACES the composition's own, so the delta alone would move the element
      // back to zero and then out again by however far it was dragged.
      translate: {
        x: round(this.picked.base.x + this.picked.wanted.dx),
        y: round(this.picked.base.y + this.picked.wanted.dy),
      },
      promoted: this.picked.promoted,
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
        <button type="button" data-editor-measuring aria-pressed="false">measure</button>
        <small>then click anything on the page. Dragging moves it, any of its four corners resizes
        it from the opposite one, and nothing here writes to a Section — see below for what it
        hands back.</small>
      </div>
      <div data-editor-measured></div>
      <div data-editor-annotation>
        <label><span>Annotations</span>
          <textarea data-editor-annotations rows="8" readonly
            placeholder="nothing measured yet — pick something and drag it, then press Annotation"></textarea>
        </label>
        <div data-editor-annotation-buttons>
          <button type="button" data-editor-copy>copy</button>
          <button type="button" data-editor-forget>clear</button>
        </div>
      </div>
      <div data-editor-overrides-list></div>`;

    into.querySelector('[data-editor-measuring]').addEventListener('click', () => this.arm(!this.armed));
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

  /** Arm or disarm. While armed the page is a measuring surface and not a page:
   *  a click picks rather than following a link or editing a word. */
  arm(on) {
    this.armed = on;
    document.documentElement.toggleAttribute('data-editor-armed', on);
    const button = this.panel?.querySelector('[data-editor-measuring]');
    if (button) {
      button.setAttribute('aria-pressed', String(on));
      button.textContent = on ? 'stop measuring' : 'measure';
    }
    if (!on) {
      this.restore(false);
      this.picked = null;
      this.paintPicked();
    }
    this.say(
      on
        ? 'measuring — click anything on the page. Clicking text no longer edits it.'
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
    const { named, before, after } = this.picked;
    const open = new Set(
      [...into.querySelectorAll('[data-editor-nudge]')].filter((input) => input === document.activeElement),
    );
    into.textContent = '';

    const title = document.createElement('p');
    title.dataset.editorPicked = '';
    title.textContent = named.phrase;
    into.append(title);

    for (const axis of AXES) {
      const row = document.createElement('div');
      row.dataset.editorAxis = axis;
      const label = document.createElement('span');
      label.textContent = axis;
      const box = document.createElement('input');
      box.type = 'number';
      box.step = '1';
      box.dataset.editorNudge = axis;
      box.value = String(after[axis]);
      box.addEventListener('change', () => this.want(axis, Number(box.value)));
      const moved = document.createElement('small');
      const by = round(after[axis] - before[axis]);
      moved.textContent = by === 0 ? `was ${before[axis]}` : `was ${before[axis]}, ${by > 0 ? '+' : ''}${by}`;
      if (by !== 0) row.dataset.editorMoved = '';
      row.append(label, box, moved);
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

    // Where a change maps onto a Token, say so here as well as in the Annotation
    // — and offer it, because an offer the author has to read a paragraph to find
    // is not an offer.
    for (const found of this.measurement().tokens) {
      const row = document.createElement('p');
      row.dataset.editorOffer = found.axis;
      if (found.wants === null || found.section === null) {
        row.textContent = `${found.axis} is ${found.token} — ${found.why}`;
        into.append(row);
        continue;
      }
      row.textContent = `${found.axis} is ${found.token} (${found.was})`;
      const write = document.createElement('button');
      write.type = 'button';
      write.dataset.editorWriteToken = found.axis;
      write.textContent = `write ${found.wants}`;
      write.addEventListener('click', () => void this.writeToken(found));
      row.append(' ', write);
      into.append(row);
    }

    for (const input of into.querySelectorAll('[data-editor-nudge]')) {
      if ([...open].some((was) => was.dataset.editorNudge === input.dataset.editorNudge)) input.focus();
    }
    this.paintMarquee();
  }

  /** Where an axis should be. A width and a height are sizes; a left and a top
   *  are where the box stands, so those move the translate. */
  want(axis, to) {
    if (!this.picked || !Number.isFinite(to)) return;
    const { before, wanted } = this.picked;
    if (axis === 'width' || axis === 'height') wanted[axis] = Math.max(0, to);
    else if (axis === 'left') wanted.dx = round(to - before.left);
    else wanted.dy = round(to - before.top);
    this.apply();
  }

  /** The box drawn over what is picked, and the four corners that resize it. */
  paintMarquee() {
    if (!this.picked) {
      this.marquee?.remove();
      this.marquee = null;
      return;
    }
    if (!this.marquee) {
      this.marquee = document.createElement('div');
      // NOT data-editor: that attribute carries the panel's whole paint, and this
      // is a box drawn over the page. Nothing needs it either — while this exists
      // the surface is armed, and everything that would have looked for it is
      // already standing down on data-editor-measuring.
      this.marquee.dataset.editorMarquee = '';
      // One per corner, and each one carries WHICH corner it is — the arithmetic
      // that follows is different for all four, and `lib/corners.mjs` is told the
      // name rather than working it out from where the pointer went down.
      for (const corner of CORNERS) {
        const handle = document.createElement('button');
        handle.type = 'button';
        handle.dataset.editorHandle = corner;
        handle.setAttribute('aria-label', cornerLabel(corner));
        this.marquee.append(handle);
      }
      document.body.append(this.marquee);
    }
    const rect = this.picked.element.getBoundingClientRect();
    this.marquee.style.left = `${rect.left}px`;
    this.marquee.style.top = `${rect.top}px`;
    this.marquee.style.width = `${rect.width}px`;
    this.marquee.style.height = `${rect.height}px`;
  }

  // -------------------------------------------------------------------------
  // The two things it hands back
  // -------------------------------------------------------------------------

  annotation() {
    if (!this.picked) return;
    const { text } = annotate(this.measurement());
    const box = this.annotations();
    box.value = box.value === '' ? text : `${box.value}\n${'-'.repeat(78)}\n\n${text}`;
    box.scrollTop = box.scrollHeight;
    this.say('Annotation taken — copy it and paste it to an agent');
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

  async override() {
    if (!this.picked) return;
    const { selector, named, element } = this.picked;
    if (selector === null) {
      return this.say('nothing on this page addresses that element uniquely, so no Override can name it', true);
    }
    const measured = this.measurement();
    const { declarations, note } = annotate(measured);
    // `display` alone is not a change the author asked for: it is the promotion
    // this surface made in order to measure an inline box at all, so on its own it
    // would write an Override for having looked at something.
    if (Object.keys(declarations).filter((property) => property !== 'display').length === 0) {
      return this.say('nothing has moved, so there is no Override to write');
    }
    const wanted = { ...measured.after };
    try {
      const answer = await this.post('/overrides', { selector, name: named.phrase, note, declarations });
      this.overrides = answer.overrides;
      this.paint();
      // The inline styles go, because from here the page is moved by what the
      // file says — through this surface's own stylesheet until the next build.
      this.restore(false);
      // And then it is CHECKED. An Override that lost to the composition would
      // otherwise be a file with a rule in it and a page that never moved.
      const landed = this.box(element);
      const off = AXES.filter((axis) => Math.abs(landed[axis] - wanted[axis]) > 1);
      this.say(
        off.length === 0
          ? `wrote an Override on ${named.phrase} in ${answer.file} — ${Object.keys(declarations).join(', ')}`
          : `wrote the Override, but the page did not follow on ${off.join(' and ')} — something on the page` +
              ' outranks it, so this one needs the Annotation and an agent',
        off.length > 0,
      );
      this.paintPicked();
    } catch (error) {
      this.say(`refused: ${error.message}`, true);
    }
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
      this.restore(false);
      this.pick(this.picked.element);
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
        if (this.picked?.element !== element) this.pick(element);
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
        if (this.dragging.how === 'move') {
          this.picked.wanted.dx = round(from.dx + dx);
          this.picked.wanted.dy = round(from.dy + dy);
        } else {
          // A resize moves the box as well as sizing it, unless the corner under
          // the pointer is the bottom right — the corner OPPOSITE the one being
          // dragged has to stay where it is, and that is the whole of
          // `lib/corners.mjs`.
          Object.assign(this.picked.wanted, resize(this.dragging.corner, { dx, dy }, from));
        }
        this.apply();
      },
      true,
    );

    for (const done of ['pointerup', 'pointercancel']) {
      document.addEventListener(
        done,
        () => {
          if (!this.dragging) return;
          this.dragging = null;
          if (this.picked) this.say(`${this.picked.named.phrase}: ${annotate(this.measurement()).headline}`);
        },
        true,
      );
    }

    // The box drawn over what is picked is in fixed coordinates, so it follows
    // the page rather than the document.
    for (const moved of ['scroll', 'resize']) {
      window.addEventListener(moved, () => this.paintMarquee(), { passive: true });
    }
  }
}
