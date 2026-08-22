// Reading a Section's plain stylesheets, named once.
//
// Two things read `variants.css` and they have to agree about what is in it: the
// Check that decides whether it is legal, and the tool that renders every Variant
// it declares. They did not. Each had its own rule pattern and its own gate
// pattern, and the two had already drifted — the Check anchored the gate and
// validated every comma-separated selector in a rule, the renderer matched the
// first gate anywhere in one and stopped. So this passed the build:
//
//   :root[data-variant='a'] .stub,
//   :root[data-variant='b'] .stub { --stub-gap: 2rem }
//
// and `b` was never rendered. Not an error, not a warning, not a shot — a Variant
// that exists, is legal, and cannot be looked at. One parser, read by both.

/** Comments carry examples of the things being banned, so they come out first. */
export function withoutComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
}

/** One top-level `selector { … }`. Both stylesheets are a flat list of them, and
 *  `check-source.mjs` is what makes that an assertion rather than an assumption.
 *  A function rather than a shared constant: a `g` regex carries `lastIndex`, and
 *  two callers sharing one is a bug waiting for a `while` loop. */
const RULE = () => /([^{}]+)\{([^{}]*)\}/g;

/** How a Variant is selected: an attribute on the document's root element.
 *
 *  `:root` is not decoration and not a habit. Together with
 *  `scopedStyleStrategy: 'where'` in astro.config.mjs it is the whole mechanism —
 *  that strategy narrows a component's rules with `:where()`, which weighs
 *  nothing, so `:root[data-variant='…']` in front of the same selector outranks it
 *  by (0,2,0) every time. `check-source.mjs` asserts both halves, because prose
 *  cannot: drop either and Variants start losing silently. */
export const VARIANT_GATE = /^:root\[data-variant=(?:'([^']*)'|"([^"]*)"|([^\]]*))\]$/;

/**
 * A selector split into its compounds, on the combinators between them — or null
 * if it uses a sibling combinator.
 *
 * The split has to know about brackets and quotes, because `[data-x~='a']` and
 * `:is(a + b)` both carry characters that mean something else at the top level.
 * Sibling combinators come back as null rather than as a compound: the guarantee
 * the Check is built on is that a Variant's rule can only match inside its own
 * Section, and a sibling of a Section's root is another Section.
 */
export function compounds(selector) {
  const parts = [];
  let current = '';
  let depth = 0;
  let quote = null;
  for (const character of selector) {
    if (quote) {
      current += character;
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      current += character;
      continue;
    }
    if (character === '[' || character === '(') depth += 1;
    if (character === ']' || character === ')') depth -= 1;
    if (depth === 0) {
      if (character === '+' || character === '~') return null;
      if (character === '>' || /\s/.test(character)) {
        if (current) parts.push(current);
        current = '';
        continue;
      }
    }
    current += character;
  }
  if (current) parts.push(current);
  return parts;
}

/**
 * A stylesheet as a flat list of `{ selectors, declarations, text }`.
 *
 * `selectors` is already split on commas and whitespace-normalised, because every
 * caller wants them one at a time — and the one that did not is the reason this
 * module exists.
 */
export function rules(css) {
  const found = [];
  for (const [text, selector, body] of withoutComments(css).matchAll(RULE())) {
    found.push({
      selectors: selector
        .split(',')
        .map((one) => one.trim().replace(/\s+/g, ' '))
        .filter(Boolean),
      declarations: body
        .split(';')
        .map((one) => one.trim().replace(/\s+/g, ' '))
        .filter(Boolean),
      text: text.trim(),
    });
  }
  return found;
}

/** Anything in the file that is not inside a top-level rule — an `@media` wrapper
 *  being the case worth naming, since its inner rule matches the pattern above
 *  perfectly and the wrapper would otherwise be skipped in silence. */
export function outsideAnyRule(css) {
  return withoutComments(css).replace(RULE(), '').trim();
}

/** The Variant a selector is gated on, or null if it is not gated at all. */
export function gatedOn(selector) {
  const gate = VARIANT_GATE.exec(compounds(selector)?.[0] ?? '');
  if (!gate) return null;
  return (gate[1] ?? gate[2] ?? gate[3] ?? '').trim();
}

/**
 * Every Variant a sheet declares, in the order it declares them, each with the
 * rules that belong to it as CSS.
 *
 * A rule reached by more than one gate belongs to each of them, which is the
 * behaviour the renderer used to be missing.
 */
export function variantsIn(css) {
  const found = new Map();
  for (const rule of rules(css)) {
    for (const selector of rule.selectors) {
      const name = gatedOn(selector);
      if (!name) continue;
      // Shown to each Variant as the one selector that reached it rather than as
      // the whole list: the other half of a shared list is a different Variant's
      // business, and this text is what the sheet captions the picture with.
      const text = `${selector} {${rule.text.slice(rule.text.indexOf('{') + 1)}`;
      const own = found.get(name) ?? [];
      if (!own.includes(text)) own.push(text);
      found.set(name, own);
    }
  }
  return found;
}
