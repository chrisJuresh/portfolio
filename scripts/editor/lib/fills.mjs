/**
 * The arithmetic behind a box whose size is not its own.
 *
 * WHY THERE IS A FILE FOR THIS. Most boxes on this page have a size the author
 * can drag. A few have none at all: they are flex items told to fill whatever
 * their parent has left over, so the number that decides how tall one is lives on
 * the PARENT, as the padding holding it off the parent's edge. `.front-screen__col`
 * is the one this was built for — `flex: 1 1 auto` inside a Section pinned to the
 * fold — and the symptom, for as long as the surface had nothing to say about it,
 * was a corner drag that wrote an inline `height`, watched the flex algorithm
 * discard it, re-measured the box truthfully as unchanged, and reported nothing.
 * "I still cannot make it taller" is what that looks like from the outside.
 *
 * So a corner on a fill drags the parent's padding on the edge under the pointer,
 * and the two things that takes are here: reading a padding out of the shorthand
 * that declared it, and moving a value `restate()` refuses.
 *
 * WHY `restate()` IS NOT ENOUGH, which is the whole reason for `scale()`. That one
 * rewrites a plain `<number><unit>` to a wanted size, and answers null for
 * anything else — `clamp(3rem, 9vh, 6.5rem)` included, on the grounds that
 * restating a relationship destroys it. It is right about that and `scale()` does
 * not argue: it never restates a term, it multiplies EVERY term by one ratio,
 * which is a different operation with a different guarantee. See its own note.
 *
 * IT IS PURE SO IT CAN BE TESTED. Like `lib/corners.mjs` and `lib/boxes.mjs` it
 * takes strings and numbers, touches no DOM, imports nothing from node, and is
 * served to the browser as it stands. `fills.test.mjs` is the assertions.
 */

/** How many digits a written number keeps. `lib/annotations.mjs` picked four and
 *  the two files write into the same stylesheets, so a second answer here would
 *  be a Token that changed precision depending on which gesture moved it. */
const PLACES = 4;

/** A plain length: a number and a unit, and nothing else. The same shape
 *  `annotations.mjs` calls MEASURED — restated rather than imported because this
 *  file is a boundary of its own and the two are allowed to diverge. */
const MEASURED = /^(-?(?:\d+\.?\d*|\.\d+))([a-z]+|%)$/i;

/** A bare zero, which is a length with no unit and the one value a stylesheet is
 *  allowed to write that way. Scaling it is still zero, so it survives without
 *  needing a unit invented for it. */
const ZERO = /^-?0(?:\.0+)?$/;

/** The functions whose arguments are all lengths, so scaling every one of them
 *  scales the function. `calc()` is deliberately absent: its arguments are an
 *  expression rather than a list, and `2 * var(--x) + 4px` scaled term by term is
 *  not the same number. */
const HOMOGENEOUS = /^(clamp|min|max)\((.*)\)$/is;

/** A number written the way a stylesheet is read: no float noise, no trailing
 *  zeros, never in exponent form. */
function figure(n) {
  if (!Number.isFinite(n)) return null;
  return n.toFixed(PLACES).replace(/0+$/, '').replace(/\.$/, '');
}

/**
 * `text` split on top-level whitespace, with anything inside parentheses left
 * whole.
 *
 * A `padding` shorthand's sides are separated by spaces, and so are the insides of
 * the `calc()` that might be one of them — so a plain `split(/\s+/)` reads
 * `calc(1rem + 2px)` as three sides and gets every side after it wrong. Depth is
 * the only difference between the two, so depth is what this counts.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function parts(text) {
  const found = [];
  let depth = 0;
  let at = '';
  for (const ch of String(text ?? '')) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (depth === 0 && /\s/.test(ch)) {
      if (at !== '') found.push(at);
      at = '';
      continue;
    }
    at += ch;
  }
  if (at !== '') found.push(at);
  return found;
}

/**
 * The four sides a box shorthand declares, in the order CSS names them.
 *
 * WHY THIS IS READ RATHER THAN ASKED FOR. `getPropertyValue('padding-top')` on a
 * rule is the obvious way to do this and it answers the EMPTY STRING whenever the
 * shorthand contains a `var()` — the longhands of a shorthand with a variable in
 * it are pending-substitution, and CSSOM serialises them as nothing at all. The
 * Front Screen declares `padding: var(--front-screen-rhyme) var(--front-screen-side) 0`,
 * so the property this whole gesture is about is exactly the one CSSOM will not
 * hand over. It cost a wrong diagnosis before it was found: the surface looked as
 * though it had decided nothing governed the padding, when it had never been able
 * to see it.
 *
 * @param {string} shorthand  a `padding` or `margin` value
 * @returns {{ top: string, right: string, bottom: string, left: string } | null}
 *   null where it is not one, two, three or four values — which includes the empty
 *   string CSSOM hands back for a longhand it would not expand
 */
export function sides(shorthand) {
  const read = parts(shorthand);
  const [a, b, c, d] = read;
  switch (read.length) {
    case 1:
      return { top: a, right: a, bottom: a, left: a };
    case 2:
      return { top: a, right: b, bottom: a, left: b };
    case 3:
      return { top: a, right: b, bottom: c, left: b };
    case 4:
      return { top: a, right: b, bottom: c, left: d };
    default:
      return null;
  }
}

/**
 * `value`, multiplied by `by`.
 *
 * THE GUARANTEE, and it is the reason this gesture may touch a `clamp()` at all
 * while the Tokens panel's own control refuses to. `clamp()`, `min()` and `max()`
 * are positively homogeneous: for any k > 0, `clamp(ka, kb, kc)` is exactly
 * `k * clamp(a, b, c)`, because multiplying by a positive number preserves the
 * order of the three terms and so preserves which of them is selected. So scaling
 * every term is not a restatement that happens to land on the right number at this
 * viewport — it is the same relationship at a different magnitude, correct at
 * every viewport, with its breakpoints in exactly the same places.
 *
 * `--front-screen-rhyme: clamp(3rem, 9vh, 6.5rem)` is the case. It pins to its
 * floor below a 533px-tall window and to its ceiling above 1156px; scaled by 0.75
 * it becomes `clamp(2.25rem, 6.75vh, 4.875rem)`, which pins at those same two
 * windows and is three quarters of the height in between. Nothing about the
 * composition's relationship to the viewport has been decided by this tool — only
 * how much of it there is, which is the number the author dragged.
 *
 * ADR 0004 keeps a relationship out of the Editor's hands and that is not being
 * argued with here: the Tokens panel draws a `clamp()` as a text field because a
 * SLIDER moves one end of it, and moving one end of a clamp does destroy it. One
 * ratio across all three ends is the operation that does not.
 *
 * WHY IT REFUSES A `var()`. A value mentioning another Token is a relationship to
 * a number this function cannot see, and scaling the mention scales nothing —
 * `calc(var(--a) + 4px)` times two is `calc(var(--a) + 8px)`, which is not twice
 * the value. Null, and the caller says which Tokens are inside it instead.
 *
 * @param {string} value  what the file holds
 * @param {number} by  the ratio, strictly positive
 * @returns {string | null} null where the value is not something one ratio can
 *   move — a `calc()`, anything mentioning a `var()`, anything with no number in it
 */
export function scale(value, by) {
  const text = String(value ?? '').trim();
  if (!Number.isFinite(by) || by <= 0) return null;
  if (text === '' || /var\(/i.test(text)) return null;

  if (ZERO.test(text)) return text;

  const measured = MEASURED.exec(text);
  if (measured) {
    const written = figure(Number.parseFloat(measured[1]) * by);
    return written === null ? null : `${written}${measured[2]}`;
  }

  const homogeneous = HOMOGENEOUS.exec(text);
  if (!homogeneous) return null;
  // Split on commas at the top level, for the reason `parts()` counts depth: a
  // `min()` nested inside a `clamp()` carries commas of its own, and each of its
  // terms is scaled by the recursion rather than by this split.
  const terms = [];
  let depth = 0;
  let at = '';
  for (const ch of homogeneous[2]) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) {
      terms.push(at);
      at = '';
      continue;
    }
    at += ch;
  }
  terms.push(at);

  const scaled = terms.map((term) => scale(term.trim(), by));
  if (scaled.some((term) => term === null)) return null;
  return `${homogeneous[1].toLowerCase()}(${scaled.join(', ')})`;
}

/**
 * Which of a parent's four paddings a corner is dragging, per axis.
 *
 * The corner already says which edges the hand is on — `lib/corners.mjs`'s HOLDS
 * is the same fact for the box's own size — so a fill needs no rule of its own
 * about which end of the parent gives way. A north corner dragged upwards is the
 * top padding closing; a south corner dragged down is the bottom one.
 */
export const EDGES = {
  nw: { height: 'top', width: 'left' },
  ne: { height: 'top', width: 'right' },
  sw: { height: 'bottom', width: 'left' },
  se: { height: 'bottom', width: 'right' },
};

/** Which way the pointer moves that padding. Dragging the north edge UP is a
 *  negative dy and a SMALLER top padding, so the two agree in sign; dragging the
 *  south edge down is a positive dy and a smaller bottom padding, so they do not.
 *  Written once here rather than remembered at the call site with one sign wrong,
 *  which is the same reason `lib/corners.mjs` exists. */
export const TOWARDS = { top: 1, left: 1, bottom: -1, right: -1 };

/**
 * What a padding should come to, and the ratio that gets it there.
 *
 * A padding cannot go negative — a box does not overlap its parent's edge by being
 * dragged at — so it is clamped at zero, and the ratio is derived from where it
 * LANDED rather than from where the pointer is. That is what keeps the preview and
 * the written Token agreeing once the padding has bottomed out: past zero the
 * margin stops closing and the Token stops moving, instead of the file quietly
 * recording a negative multiple of itself.
 *
 * @param {number} from  the padding now, in px
 * @param {number} travel  how far the pointer has come along the axis, in px
 * @param {string} edge  one of `top`, `right`, `bottom`, `left`
 * @returns {{ to: number, by: number } | null} null where the padding is zero
 *   already, or not a number — there is no ratio that moves nothing to something
 */
export function closing(from, travel, edge) {
  const sign = TOWARDS[edge];
  if (sign === undefined) return null;
  if (!Number.isFinite(from) || !Number.isFinite(travel) || from <= 0) return null;
  const to = Math.max(0, from + sign * travel);
  return { to: Math.round(to * 100) / 100, by: to / from };
}
