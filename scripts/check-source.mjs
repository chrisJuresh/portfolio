#!/usr/bin/env node
/**
 * The two boundaries the build enforces, checked before Astro is asked to
 * compile anything.
 *
 * ADR 0006: an invariant stops being a comment and becomes a Check, and a Check
 * blocks rather than reports. Both groups below are things a legitimate change
 * cannot trip, which is the price of being allowed to block.
 *
 *   pnpm check:sections     — run it on its own
 *   pnpm build              — runs it first, and stops on a failure
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const sectionsDir = join(repoRoot, 'src', 'sections');
const kernelDir = join(repoRoot, 'src', 'kernel');

/** @type {string[]} */
const failures = [];

function fail(file, message) {
  failures.push(`${relative(repoRoot, file).replace(/\\/g, '/')}: ${message}`);
}

function exists(path) {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

function filesUnder(dir) {
  /** @type {string[]} */
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...filesUnder(path));
    else found.push(path);
  }
  return found;
}

/** Comments carry examples of the things being banned, so they come out first. */
function withoutComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
}

/** Every module specifier in a source file, from either import form. */
function imports(code) {
  const found = [];
  for (const [, specifier] of code.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) found.push(specifier);
  for (const [, specifier] of code.matchAll(/\bimport\s+['"]([^'"]+)['"]/g)) found.push(specifier);
  return found;
}

/**
 * A selector split into its compounds, on the combinators between them — or
 * null if it uses a sibling combinator.
 *
 * The split has to know about brackets and quotes, because `[data-x~='a']` and
 * `:is(a + b)` both carry characters that mean something else at the top level.
 * Sibling combinators are refused outright rather than reasoned about: the
 * guarantee below is that a Variant's rule can only match inside its own
 * Section, and a sibling of a Section's root is another Section.
 */
function compounds(selector) {
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

// ---------------------------------------------------------------------------
// A Section is a folder, and the folder shape is the same every time.
// ---------------------------------------------------------------------------

const REQUIRED = ['content.ts', 'tokens.css', 'timeline.ts', 'variants.css', 'NOTES.md', 'assets'];

/** Source only. NOTES.md is prose ABOUT these rules and quotes the things being
 *  banned, so scanning it would fail the build for saying `is:global` out loud. */
const SOURCE = /\.(astro|ts|css)$/;

/** A Section may read its own folder and the Kernel. Nothing else. */
const ALLOWED_IMPORT = /^(?:\.\/|gsap(?:\/|$)|astro(?:\/|$)|\.\.\/\.\.\/kernel\/)/;

/** Nothing in a Section imports variants.css: the sheet is not part of the build
 *  at all, which is what makes an unselected Variant cost the shipped page
 *  nothing. design/tools/render-variants.mjs injects it at render time. */
const VARIANT_SHEET = /(^|\/)variants\.css$/;

/** `is:global` and `:global(` are the escape hatches out of Astro's scoping. */
const SCOPE_ESCAPES = [
  [/\bis:global\b/, 'is:global — a Section may not write a global rule'],
  [/:global\s*\(/, ':global() — a Section may not write a global rule'],
  [/<style[^>]*\bis:inline\b/, '<style is:inline> — an inline style block is not scoped'],
];

/** One top-level `selector { … }`. Both stylesheets are a flat list of them, and
 *  the check just above the loop is what makes that an assertion. Global, so
 *  that stripping every rule out of the file really does strip every one —
 *  without the flag `replace` takes the first and the leftover reads as an
 *  error in every file that has more than one rule in it. */
const RULE = /([^{}]+)\{([^{}]*)\}/g;

/** How a Variant is selected: an attribute on the document's root element.
 *
 *  `:root` is not decoration and not a habit. It is what makes a Variant win.
 *  Together with `scopedStyleStrategy: 'where'` in astro.config.mjs it is the
 *  whole of the mechanism: that strategy narrows a component's rules with
 *  :where(), which weighs nothing, so a scoped rule keeps the specificity it is
 *  written with and `:root[data-variant='…']` in front of the same selector
 *  outranks it by (0,2,0) every time. Drop either half and a Variant starts
 *  winning or losing on how many compounds the composition happened to write —
 *  which reads as a Variant that "did not apply". docs/agents/variants.md. */
const VARIANT_GATE = /^:root\[data-variant=(?:'([^']*)'|"([^"]*)"|([^\]]*))\]$/;

/**
 * Every compound after the gate has to be one the Section owns, and only the
 * first one does: `.stub__points li` can match nothing outside `.stub__points`,
 * which is why the rest of a selector is the Variant's business.
 */
function ownedBy(section, compound) {
  return new RegExp(`^(?:\\.${section}(?:__[a-z0-9-]+)*|\\[data-${section}-[a-z0-9-]+\\])`).test(compound);
}

/**
 * A Variant's selector: the gate, then something this Section owns, then
 * whatever the direction needs.
 *
 * That grammar is the boundary. It is not that a Variant may not write a
 * layout — it must be able to, or a Variant is a set of Tokens by another name —
 * it is that whatever it writes can only land inside its own Section.
 */
function checkVariantSelector(file, section, selector) {
  const parts = compounds(selector);
  if (!parts) {
    fail(file, `selector "${selector}" uses a sibling combinator — a sibling of a Section is another Section`);
    return;
  }
  const gate = VARIANT_GATE.exec(parts[0] ?? '');
  if (!gate) {
    fail(file, `selector "${selector}" does not begin with :root[data-variant='…'] — that is how a Variant is selected`);
    return;
  }
  const named = (gate[1] ?? gate[2] ?? gate[3] ?? '').trim();
  if (!/^[a-z][a-z0-9-]*$/.test(named)) {
    fail(file, `"${named}" is not a Variant name — lower case, digits and dashes`);
  }
  if (parts.length < 2) {
    fail(file, `selector "${selector}" names a Variant and nothing in the Section — it would style the whole document`);
    return;
  }
  if (!ownedBy(section, parts[1])) {
    fail(file, `selector "${selector}": "${parts[1]}" is not this Section's — expected .${section}, .${section}__… or [data-${section}-…]`);
  }
}

const sections = exists(sectionsDir)
  ? readdirSync(sectionsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
  : [];

if (sections.length === 0) failures.push('src/sections: no Sections found');

for (const section of sections) {
  const dir = join(sectionsDir, section);

  for (const required of REQUIRED) {
    if (!exists(join(dir, required))) fail(join(dir, required), 'missing — every Section holds one');
  }
  const component = readdirSync(dir).filter((name) => name.endsWith('.astro'));
  if (component.length !== 1) {
    fail(dir, `expected exactly one .astro component, found ${component.length}`);
  }

  for (const file of filesUnder(dir).filter((path) => SOURCE.test(path))) {
    const source = readFileSync(file, 'utf8');
    const code = withoutComments(source);

    for (const [pattern, why] of SCOPE_ESCAPES) {
      if (pattern.test(code)) fail(file, why);
    }

    for (const specifier of imports(code)) {
      // Reaching another Section, whether by relative path or by alias.
      if (!ALLOWED_IMPORT.test(specifier)) {
        fail(file, `imports "${specifier}" — a Section may read its own folder and src/kernel/ only`);
      }
      if (VARIANT_SHEET.test(specifier)) {
        fail(
          file,
          `imports "${specifier}" — a Variant that is not selected costs the shipped page nothing,` +
            ' so nothing in a Section imports its Variants; the render tool injects the sheet',
        );
      }
    }
  }

  // tokens.css and variants.css are not scoped by the compiler — Astro never
  // looks inside a plain stylesheet — so what they may contain is what makes
  // them safe, and it is checked rather than trusted.
  //
  // The two files are NOT held to the same rule, and the difference is the whole
  // of what a Variant is. tokens.css is the Editor's file (ADR 0004), so it stays
  // as narrow as it can be: Tokens, on the Section's own root. variants.css is
  // written by an agent, is not imported by anything, and never reaches a reader
  // — so it may write whole compositional directions, layout and palette
  // included. What keeps it safe is the guarantee Astro's scoping gives the
  // component: a rule here cannot match an element in another Section. Here that
  // is a grammar rather than a hash.
  for (const name of ['tokens.css', 'variants.css']) {
    const file = join(dir, name);
    if (!exists(file)) continue;
    const css = withoutComments(readFileSync(file, 'utf8'));

    // Anything left once every top-level `selector { … }` is taken out. An
    // @media block is the case this exists for, and it is worth being exact
    // about why: the query's INNER rule is a perfectly good match for the
    // pattern below, so without this the wrapper is skipped in silence and the
    // file is checked as though the query were not there. NOTES.md has claimed
    // an @media here fails the build since the convention was written; this is
    // the line that makes that true. The Editor writes a value and not a
    // breakpoint, and a Variant is a direction rather than something that
    // arrives at a width.
    const outside = css.replace(RULE, '').trim();
    if (outside) {
      const shown = outside.replace(/\s+/g, ' ').slice(0, 48);
      fail(file, `"${shown}" is outside any rule — this file is a flat list of rules`);
    }

    for (const [, selector, body] of css.matchAll(RULE)) {
      for (const one of selector.split(',')) {
        const trimmed = one.trim().replace(/\s+/g, ' ');
        if (!trimmed) continue;
        if (name === 'tokens.css') {
          if (!new RegExp(`\\.${section}$`).test(trimmed)) {
            fail(file, `selector "${trimmed}" does not end in .${section}`);
          }
        } else {
          checkVariantSelector(file, section, trimmed);
        }
      }
      for (const declaration of body.split(';')) {
        const property = declaration.split(':')[0]?.trim();
        if (!property) continue;
        const own = property.startsWith(`--${section}-`);
        if (name === 'tokens.css') {
          if (!own) {
            fail(file, `"${property}" is not a Token — expected a custom property named --${section}-…`);
          }
        } else if (property.startsWith('--') && !own) {
          // A custom property inherits, so one not named for this Section is how
          // a Variant would reach out and rewrite the Kernel's values for
          // everything below it. Ordinary properties are the Variant's business.
          fail(file, `"${property}" is a custom property this Section does not own — expected --${section}-…`);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// The Kernel's one invariant that a comment cannot hold.
// ---------------------------------------------------------------------------

// A z-index, `isolation` or a mask on .fx makes it an isolated group, and an
// isolated group hands every blending layer a transparent backdrop instead of
// the page. The stack then stops blending and starts painting, which looks
// exactly like the strengths being too high — so the failure is a day of tuning
// the wrong numbers rather than a broken page. effect-stack.css says the rest.
const effectStack = join(kernelDir, 'effect-stack', 'effect-stack.css');
if (exists(effectStack)) {
  const css = withoutComments(readFileSync(effectStack, 'utf8'));
  const container = /(^|\})\s*\.fx\s*\{([^}]*)\}/.exec(css);
  if (!container) fail(effectStack, 'no .fx container rule found');
  else {
    for (const banned of ['z-index', 'isolation', 'mask', 'mask-image', 'filter', 'opacity']) {
      if (new RegExp(`(^|;)\\s*${banned}\\s*:`).test(container[2])) {
        fail(effectStack, `.fx declares ${banned} — that isolates the stack and stops it blending`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error('check-source: the source boundaries are broken.\n');
  for (const failure of failures) console.error(`  ${failure}`);
  console.error(`\n${failures.length} failure${failures.length === 1 ? '' : 's'}.`);
  process.exit(1);
}

console.log(`check-source: ${sections.length} Section(s) and the Kernel pass.`);
