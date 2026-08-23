/**
 * An Annotation: what the Editor hands back when the change the author wants is
 * not a Token.
 *
 * ADR 0004 says dragging and resizing in the Editor is MEASUREMENT and not
 * authoring, and this file is that sentence made into a function. These
 * compositions are held together by relationships rather than coordinates — a
 * Frame's edge is a fraction of its stage, a masthead's cap-height is another
 * element's — so a tool that moved boxes freely would destroy the relationship
 * instead of editing it. What it does instead is report what the author did, in
 * words and numbers, and let an agent decide which constant moved.
 *
 * TEXT AND NUMBERS RATHER THAN A SCREENSHOT, because exact numbers cost almost
 * nothing and read better than pixels (#145). The output is plain text on plain
 * lines, pasteable as it stands.
 *
 * THE ELEMENT IS NAMED OUT OF THE GLOSSARY, and nothing here holds a second copy
 * of it. `terms()` reads `CONTEXT.md`, `name()` matches an element's own class
 * against what it found, and where the glossary has no word the Annotation says
 * so rather than inventing one. So a term landing in `CONTEXT.md` reaches these
 * sentences for free — the same mechanism as the Section folder glob in
 * `src/kernel/loader.ts` and the Token discovery in `lib/tokens.mjs`: the thing
 * that knows is the file that declares it.
 *
 * IT HAS NO NODE IMPORTS, on purpose. The measuring surface runs in the browser
 * and the geometry only exists there, so the browser imports this module and the
 * tests run the same functions in node. Two spellings of one sentence, one of
 * which nothing tests, is exactly what this repository pays for elsewhere.
 */

/** How many decimal places a restated length keeps. Four is finer than any
 *  Token in the repository is written to, so nothing is rounded away. */
const PLACES = 4;

/** A plain number with a unit. Anything else — a `clamp()`, a `calc()`, a
 *  `var()` — is a RELATIONSHIP, and restating one as a length destroys it. */
const MEASURED = /^(-?(?:\d+\.?\d*|\.\d+))([a-z]+|%)$/i;

/** The four numbers a drag or a resize can move, in the order they are reported.
 *  Exported because the measuring surface walks the same four. */
export const AXES = ['left', 'top', 'width', 'height'];

/**
 * The fifth thing a measurement can carry, which is NOT one of the four.
 *
 * A text size has no share of a parent, no opposite corner and no sign to get
 * wrong, so folding it into `AXES` would put it through arithmetic that means
 * nothing for it. It travels beside them instead: its own line in the report, its
 * own governor in `tokens`, and one name here so the surface and the sentence
 * spell it the same way (#166).
 */
export const TEXT = 'text size';

/** How wide the label column in the report is. Wide enough for `TEXT`, which is
 *  the longest of the five. */
const COLUMN = 10;

/** Which of the parent's two sides an axis is a share of. */
const ALONG = { left: 'width', width: 'width', top: 'height', height: 'height' };

// ---------------------------------------------------------------------------
// The vocabulary
// ---------------------------------------------------------------------------

/**
 * Every term `CONTEXT.md` defines.
 *
 * A term is a bolded phrase alone on its line, ending in a colon — which is how
 * the glossary is written, and narrow enough that a bolded phrase inside a
 * sentence is not mistaken for one.
 *
 * @param {string} markdown the contents of CONTEXT.md
 * @returns {string[]}
 */
export function terms(markdown) {
  const found = [];
  for (const [, term] of String(markdown ?? '').matchAll(/^\*\*(.+?)\*\*:\s*$/gm)) found.push(term.trim());
  return found;
}

/** `projects-panel` as the glossary would write it. */
const titled = (slug) =>
  String(slug)
    .split('-')
    .filter((word) => word !== '')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');

const ordinal = (n) => {
  const rest = n % 100;
  if (rest >= 11 && rest <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
};

/** A part of a Section, in the glossary's words if the glossary has any. */
function word(part, glossary) {
  const candidate = titled(part);
  if (glossary.includes(candidate)) return { text: candidate, vocabulary: true };
  return { text: String(part).replace(/-/g, ' '), vocabulary: false };
}

/**
 * What to call the element the author dragged.
 *
 * @param {{ section: string | null, root?: boolean, part?: string | null,
 *           inside?: string[], tag?: string, nth?: number, of?: number }} where
 *   `part` is the element's own name inside its Section — the tail of a
 *   `section__part` class — and `inside` is the same for its ancestors, nearest
 *   first, which is what names an element that has no class of its own.
 * @param {string[]} glossary  what `terms()` read out of CONTEXT.md
 * @returns {{ phrase: string, vocabulary: boolean, part: string | null }}
 */
export function name(where, glossary = []) {
  const at = where.nth && where.of ? `${ordinal(where.nth)} of ${where.of} ` : '';
  const tag = where.tag ? `<${String(where.tag).toLowerCase()}>` : 'element';

  if (!where.section) {
    return { phrase: `the ${at}${tag} on the page`, vocabulary: false, part: null };
  }
  const section = titled(where.section);

  if (where.root) {
    return { phrase: `the ${section}`, vocabulary: glossary.includes(section), part: null };
  }
  if (where.part) {
    const own = word(where.part, glossary);
    return {
      phrase: `the ${section}’s ${own.text}`,
      vocabulary: own.vocabulary && glossary.includes(section),
      part: `${where.section}__${where.part}`,
    };
  }

  // No class of its own, so it is named by the nearest thing that has one. Not
  // vocabulary either way: the glossary named the box, not what is inside it.
  const nearest = where.inside?.[0];
  const under = nearest ? `${word(nearest, glossary).text}, its ` : '';
  return { phrase: `the ${section}’s ${under}${at}${tag}`.replace(/, its $/, ''), vocabulary: false, part: null };
}

// ---------------------------------------------------------------------------
// The numbers
// ---------------------------------------------------------------------------

/** A number, written the way a stylesheet is read: no float noise, no trailing
 *  zeros, and never in exponent form. */
function figure(n, places = PLACES) {
  if (!Number.isFinite(n)) return null;
  const fixed = n.toFixed(places);
  return places === 0 ? fixed : fixed.replace(/0+$/, '').replace(/\.$/, '');
}

/**
 * `px` expressed in `unit`, or null where nothing here can say.
 *
 * Null rather than a guess: a `ch` or a `lh` depends on a face this cannot see,
 * and a wrong number in an Annotation is worse than an absent one, because the
 * whole premise is that the numbers are exact.
 *
 * @param {number} px
 * @param {string} unit
 * @param {{ root?: number, font?: number, parent?: { width: number, height: number },
 *           viewport?: { width: number, height: number }, axis?: 'x' | 'y' }} ctx
 * @returns {number | null}
 */
export function asUnit(px, unit, ctx = {}) {
  if (!Number.isFinite(px)) return null;
  const over = (base) => (Number.isFinite(base) && base !== 0 ? px / base : null);
  switch (String(unit).toLowerCase()) {
    case 'px':
      return px;
    case 'rem':
      return over(ctx.root);
    case 'em':
      return over(ctx.font);
    case '%': {
      const along = ctx.axis === 'y' ? ctx.parent?.height : ctx.parent?.width;
      const share = over(along);
      return share === null ? null : share * 100;
    }
    case 'vw': {
      const share = over(ctx.viewport?.width);
      return share === null ? null : share * 100;
    }
    case 'vh': {
      const share = over(ctx.viewport?.height);
      return share === null ? null : share * 100;
    }
    default:
      return null;
  }
}

/**
 * `wanted` px, written in whatever unit `value` is already in.
 *
 * The unit comes from the file rather than from this function, because the unit
 * a composition chose is part of the composition: a ladder written in rem stays
 * in rem, or one Token stops moving with the page's type size.
 *
 * @returns {string | null} null when the value is not a plain length
 */
export function restate(value, wanted, ctx = {}) {
  const read = MEASURED.exec(String(value ?? '').trim());
  if (!read) return null;
  const unit = read[2];
  const number = asUnit(wanted, unit, ctx);
  if (number === null) return null;
  const written = figure(number);
  return written === null ? null : `${written}${unit}`;
}

/**
 * `value`, moved by `delta` px.
 *
 * The other half of `restate`: a resize knows the size it wants, and a move only
 * knows how far it went.
 *
 * @returns {string | null}
 */
export function nudge(value, delta, ctx = {}) {
  const read = MEASURED.exec(String(value ?? '').trim());
  if (!read) return null;
  const unit = read[2];
  const by = asUnit(delta, unit, ctx);
  if (by === null) return null;
  const written = figure(Number.parseFloat(read[1]) + by);
  return written === null ? null : `${written}${unit}`;
}

// ---------------------------------------------------------------------------
// The Annotation
// ---------------------------------------------------------------------------

const px = (n) => `${figure(n, 2)}px`;
const signed = (n) => (n === 0 ? 'unchanged' : `${n > 0 ? '+' : '-'}${px(Math.abs(n))}`);
/** "a", "a and b", "a, b and c". Exported for the same reason `AXES` is: the
 *  surface says the same kind of sentence about the Tokens it found. */
export const list = (words) =>
  words.length <= 1 ? (words[0] ?? '') : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`;

/** A paragraph, wrapped to the width the rest of the report is written to, so a
 *  pasted Annotation reads the same in a terminal as it does in a text box. */
function paragraph(text, width = 88) {
  const lines = [];
  let line = '  ';
  for (const word of text.split(' ')) {
    if (line.trim() !== '' && line.length + 1 + word.length > width) {
      lines.push(line);
      line = '  ';
    }
    line += line.trim() === '' ? word : ` ${word}`;
  }
  if (line.trim() !== '') lines.push(line);
  return lines;
}

/**
 * The measured instruction, as text.
 *
 * @param {object} measured
 * @param {{ phrase: string, vocabulary: boolean, part: string | null }} measured.named
 * @param {string} measured.selector      how the surface would address it in an Override
 * @param {{ width: number, height: number }} measured.viewport
 * @param {number} measured.root          the root font-size, in px
 * @param {{ phrase: string, width: number, height: number }} measured.parent
 * @param {{ left: number, top: number, width: number, height: number }} measured.before
 * @param {{ left: number, top: number, width: number, height: number }} measured.after
 * @param {{ before: number, after: number } | null} [measured.text]  the element's
 *   font-size in px, before and after. Absent where the caller did not look at the
 *   type, which is not the same as a size that did not change.
 * @param {Array<{ axis: string, property: string, token: string, selector: string,
 *                 section: string | null, key: string | null, was: string,
 *                 wants: string | null, why?: string | null }>} measured.tokens
 * @returns {{ headline: string, note: string[], text: string,
 *             declarations: Record<string, string> }}
 */
export function annotate(measured) {
  const { named, before, after, parent, viewport, tokens = [] } = measured;
  const by = {
    left: after.left - before.left,
    top: after.top - before.top,
    width: after.width - before.width,
    height: after.height - before.height,
  };
  const moved = by.left !== 0 || by.top !== 0;
  const resized = by.width !== 0 || by.height !== 0;

  // The text size, if the caller measured one. Absent is an ordinary answer: the
  // four axes are a box's and every caller has them, and a caller that did not
  // look at the type says nothing about it rather than reporting a zero.
  const text = measured.text ?? null;
  const grew = text ? text.after - text.before : 0;
  // A hundredth of a pixel, because that is what `px()` prints to: a difference
  // that rounds away would read as a change and report as none.
  const retyped = text !== null && Math.abs(grew) >= 0.005;

  const did = [moved && 'moved', resized && 'resized', retyped && 'its text size changed'].filter(Boolean);
  const what = did.length === 0 ? 'unchanged' : list(did);
  const headline = `${named.phrase} — ${what}`;

  const lines = [
    headline,
    `measured in the Editor at ${figure(viewport.width, 0)}×${figure(viewport.height, 0)},` +
      ` root font-size ${px(measured.root)}`,
    '',
  ];

  for (const axis of AXES) {
    lines.push(
      `  ${axis.padEnd(COLUMN)}${`${px(before[axis])} → ${px(after[axis])}`.padEnd(24)}${signed(by[axis])}`,
    );
  }
  if (text) {
    lines.push(
      `  ${TEXT.padEnd(COLUMN)}${`${px(text.before)} → ${px(text.after)}`.padEnd(24)}${signed(grew)}`,
    );
  }

  // The shares, because that is what the composition is actually written in: a
  // Frame's edge is a fraction of its stage, so the fraction is the number an
  // agent needs and the pixels are how it was reached.
  const along = { width: parent?.width, height: parent?.height };
  if (parent && (along.width > 0 || along.height > 0)) {
    lines.push('', `  as a share of ${parent.phrase} (${px(parent.width)} × ${px(parent.height)}):`);
    for (const axis of AXES) {
      const base = along[ALONG[axis]];
      if (!(base > 0)) continue;
      lines.push(`    ${axis.padEnd(COLUMN)}${figure(before[axis] / base, 3)} → ${figure(after[axis] / base, 3)}`);
    }
  }

  // The text size as a multiple of the root, because that is the unit a type
  // ladder is written in: a size in rem moves with the page and a size in px does
  // not, and which of the two this is, is the change an agent has to make.
  if (retyped && measured.root > 0) {
    lines.push(
      '',
      `  as a multiple of the root font-size (${px(measured.root)}):`,
      `    ${TEXT.padEnd(COLUMN)}${figure(text.before / measured.root, 3)} → ${figure(text.after / measured.root, 3)}`,
    );
  }

  lines.push('', `  on the page: ${measured.selector}`);

  if (measured.promoted) {
    lines.push(
      '',
      ...paragraph(
        'This is a non-replaced inline box, so width, height and translate do not apply to it at' +
          ' all. It was measured as display: inline-block — which means the numbers above describe' +
          ' a box the page does not currently make, and whatever change is made has to decide' +
          ' whether that promotion is part of it.',
      ),
    );
  }

  if (!named.vocabulary) {
    lines.push(
      '',
      ...paragraph(
        named.part
          ? `The glossary in CONTEXT.md has no word for this part, so it is named after its own class,` +
              ` ${named.part}. If it deserves a term, that file is where one goes.`
          : 'This element has no name of its own in the glossary — it is named by what it stands' +
              ' inside, so say which one you mean if the position is what matters.',
      ),
    );
  }

  const changed = [...AXES.filter((axis) => by[axis] !== 0), ...(retyped ? [TEXT] : [])];
  if (tokens.length === 0) {
    lines.push(
      '',
      ...paragraph(
        `No Token expresses this. Nothing the Editor can see declares ${list(changed.length === 0 ? AXES : changed)}` +
          ' here, so this is a change to the composition rather than a value to write.',
      ),
    );
  } else {
    for (const token of tokens) {
      lines.push(
        '',
        ...paragraph(
          token.wants === null
            ? `${token.axis} is set from ${token.token} on ${token.selector}, which holds "${token.was}" —` +
                ` and the Editor will not write it: ${token.why ?? 'it is a relationship rather than a length'}.`
            : `${token.axis} maps onto a Token: ${token.token}, declared on ${token.selector} in` +
                ` src/sections/${token.section}/tokens.css. It holds ${token.was}, and the measurement` +
                ` makes it ${token.wants} — the Editor can write that one directly.`,
        ),
      );
    }
    const missing = changed.filter((axis) => !tokens.some((token) => token.axis === axis));
    if (missing.length > 0) {
      lines.push('', `  No Token the Editor can see governs ${list(missing)}.`);
    }
  }

  lines.push(
    '',
    ...paragraph(
      'These are numbers read off the page and not an instruction to hard-code them. This' +
        ' composition is held together by relationships rather than coordinates, so the question is' +
        ' which constant moved — not where to put a translate.',
    ),
  );

  // What an Override would have to declare to make the page look like this. A
  // resize sets both sides, because the handle moves both and half a box is not
  // a measurement anybody took.
  //
  // `translate` is the ABSOLUTE value the page is showing, not the delta that was
  // dragged — an Override declares it `!important` and so REPLACES whatever the
  // composition had, and an element that already carried one would otherwise jump
  // by the original amount. The caller tracks the base it started from; a caller
  // that has not says so by leaving it out, and then the delta is all there is.
  //
  // `display` appears only when the caller had to promote a non-replaced inline
  // box to measure it at all: `width`, `height` and `translate` do not apply to
  // one, so an Override without the promotion would not look like the measurement.
  const at = measured.translate ?? { x: by.left, y: by.top };
  const declarations = {};
  if (measured.promoted) declarations.display = 'inline-block';
  // The measured size and not the delta, for the same reason `translate` is
  // absolute: an Override declares it `!important` and therefore replaces whatever
  // the composition had, rather than adding to it.
  if (retyped) declarations['font-size'] = px(text.after);
  if (moved) declarations.translate = `${px(at.x)} ${px(at.y)}`;
  if (resized) {
    declarations.width = px(after.width);
    declarations.height = px(after.height);
  }

  const said = [
    moved && `moved by ${px(by.left)}, ${px(by.top)}`,
    resized && `resized to ${px(after.width)} × ${px(after.height)}`,
    retyped && `text set to ${px(text.after)}`,
  ].filter(Boolean);
  const note = [
    said.length === 0 ? 'measured, and neither moved nor resized' : list(said),
    `measured in the Editor at ${figure(viewport.width, 0)}×${figure(viewport.height, 0)}`,
  ];

  return { headline, note, text: lines.join('\n') + '\n', declarations };
}
