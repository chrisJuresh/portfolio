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
import { parse as parseOverrides } from './editor/lib/overrides.mjs';
import { tokens as tokensIn } from './editor/lib/tokens.mjs';
import { VARIANT_GATE, compounds, outsideAnyRule, rules } from './variant-sheet.mjs';

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

/** Every module specifier in a source file, from either import form. */
function imports(code) {
  const found = [];
  for (const [, specifier] of code.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) found.push(specifier);
  for (const [, specifier] of code.matchAll(/\bimport\s+['"]([^'"]+)['"]/g)) found.push(specifier);
  return found;
}

/** Comments carry examples of the things being banned, so they come out first.
 *  Only the .astro/.ts scans need this here; the stylesheets go through
 *  variant-sheet.mjs, which strips them itself. */
function withoutComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
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

/**
 * Every compound after the gate has to be one the Section owns, and only the
 * first one does: `.a-section__points li` can match nothing outside `.a-section__points`,
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

    // Anything left once every top-level rule is taken out. An @media block is
    // the case this exists for, and it is worth being exact about why: the
    // query's INNER rule is a perfectly good match for a rule pattern, so
    // without this the wrapper is skipped in silence and the file is checked as
    // though the query were not there. The Editor writes a value and not a
    // breakpoint, and a Variant is a direction rather than something that
    // arrives at a width.
    const outside = outsideAnyRule(css);
    if (outside) {
      const shown = outside.replace(/\s+/g, ' ').slice(0, 48);
      fail(file, `"${shown}" is outside any rule — this file is a flat list of rules`);
    }

    for (const rule of rules(css)) {
      for (const selector of rule.selectors) {
        if (name === 'tokens.css') {
          if (!new RegExp(`\\.${section}$`).test(selector)) {
            fail(file, `selector "${selector}" does not end in .${section}`);
          }
        } else {
          checkVariantSelector(file, section, selector);
        }
      }
      for (const declaration of rule.declarations) {
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
// The half of the Variant mechanism that does not live in a Section.
// ---------------------------------------------------------------------------

// A Variant is selected by `:root[data-variant='…']` in front of a selector the
// composition already wrote, and it has to WIN that pairing. It only does because
// of two things that are nowhere near each other: the gate above, checked per
// selector, and one line of Astro configuration.
//
// Astro narrows every compound of a scoped rule so it cannot match another
// component's elements. HOW it narrows decides the arithmetic. The default
// strategy appends a bare attribute selector, worth (0,1,0) — PER COMPOUND — so a
// scoped rule's weight grows with the length of its selector, and a Variant, which
// is one fixed gate in front of the same selector, wins or loses on how many
// compounds the composition happened to write. A two-compound selector came out
// an exact tie, settled by whichever stylesheet the bundler emitted second.
// `scopedStyleStrategy: 'where'` wraps the same narrowing in :where(), which
// selects identically and weighs nothing, so the gate outranks the composition by
// (0,2,0) in every case.
//
// This was a paragraph in five files and an assertion in none, which is exactly
// what ADR 0006 says not to do: a comment saying "do not break this" is a wish.
// The failure it is guarding against is silent — a Variant that renders as though
// it had not been selected — so it is worth the eleven lines.
const astroConfig = join(repoRoot, 'astro.config.mjs');
if (exists(astroConfig)) {
  const config = withoutComments(readFileSync(astroConfig, 'utf8'));
  const strategy = /scopedStyleStrategy\s*:\s*['"]([a-z-]+)['"]/.exec(config);
  if (!strategy) {
    fail(astroConfig, "no scopedStyleStrategy — Variants need 'where' to outrank a Section's own rules");
  } else if (strategy[1] !== 'where') {
    fail(
      astroConfig,
      `scopedStyleStrategy is '${strategy[1]}' — Variants need 'where', or a scoped rule's` +
        " specificity grows with its selector and :root[data-variant='…'] stops outranking it",
    );
  }
}

// ---------------------------------------------------------------------------
// The Kernel's Tokens files hold Tokens, and nothing else.
// ---------------------------------------------------------------------------

// src/kernel/tokens/ is what #146 gave the Editor so that the Effect Stack's
// hundred numbers and the three corner pictures' placement are reachable from
// it - the two of the five tuners it absorbed that were entirely custom
// properties. The Editor's Tokens parser is the grammar: a flat list of rules,
// nothing in one but a custom property, no @media, no comment inside a value.
// It REFUSES a file it cannot read wholly, so a declaration slipped into one of
// these files does not half-load the surface, it takes every control in the file
// down - which is a thing to be told about at build time rather than at the
// panel. The parser is imported rather than a second copy of the rule, for the
// reason the Editor's own two files give: two spellings of one grammar is a
// disagreement about what may be written where.
const kernelTokens = join(kernelDir, 'tokens');
if (exists(kernelTokens)) {
  const files = readdirSync(kernelTokens).filter((name) => name.endsWith('.css'));
  if (files.length === 0) fail(kernelTokens, 'no Tokens files — the directory is the Editor’s allowlist');
  for (const name of files) {
    const file = join(kernelTokens, name);
    try {
      const held = tokensIn(readFileSync(file, 'utf8'));
      if (held.length === 0) fail(file, 'declares no Tokens');
    } catch (error) {
      fail(file, `the Editor cannot read this as Tokens - ${error.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// The Kernel's two invariants that a comment cannot hold.
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

// The body is what the Effect Stack is measured against, and it is the second
// place the invariant above can be broken from — one the warning in
// effect-stack.css cannot reach, because the rule is in a different file and the
// person editing it is thinking about the ground rather than about the stack.
//
// TWO CLAIMS, both silent when they break. The stack says `bottom: 0` and means
// the foot of the DOCUMENT, which is only true while the body is its containing
// block: drop `position` and the treatment shrinks back to the first screen and
// stops dead at the fold, which is the bug that put it there. And a stacking context
// here hands every blending layer a transparent backdrop instead of the page, so
// the layers stop blending and start painting — the failure that reads as the
// strengths being too high and costs a day of tuning the wrong numbers.
const groundCss = join(kernelDir, 'ground.css');
if (exists(groundCss)) {
  const css = withoutComments(readFileSync(groundCss, 'utf8'));
  const body = /(^|\})\s*body\s*\{([^}]*)\}/.exec(css);
  if (!body) fail(groundCss, 'no body rule found — the Effect Stack is measured against it');
  else {
    if (!/(^|;)\s*position\s*:\s*relative\s*(;|$)/.test(body[2])) {
      fail(
        groundCss,
        'body does not declare `position: relative` — the Effect Stack’s `bottom: 0` then means the foot of the first screen and the treatment stops at the fold',
      );
    }
    // Every way an element becomes a stacking context that a body plausibly
    // grows one from. `position` is already pinned to `relative` above, so the
    // one that is missing here is a `z-index` other than `auto` — which is the
    // next line, and the reason the list is a list.
    for (const banned of [
      'z-index',
      'isolation',
      'filter',
      'backdrop-filter',
      'opacity',
      'mix-blend-mode',
      'mask',
      'mask-image',
      'transform',
      'perspective',
      'contain',
      'will-change',
    ]) {
      if (new RegExp(`(^|;)\\s*${banned}\\s*:`).test(body[2])) {
        fail(
          groundCss,
          `body declares ${banned} — that makes it a stacking context, which isolates the Effect Stack and stops it blending`,
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// The Overrides file holds only what the Editor put there.
// ---------------------------------------------------------------------------

// The Editor is the only author of src/overrides.css, and the guarantee that
// replaces "it only replaces one span" for that boundary is that it only ever
// reads its own output (scripts/editor/lib/overrides.mjs). So a hand edit stops
// the tool rather than being clobbered by it — which is a good refusal to get at
// a build rather than the next time the author drags something.
//
// One spelling of the grammar, imported rather than restated: a second copy here
// would be a file the build accepted and the Editor refused, or worse the reverse.
const overridesFile = join(repoRoot, 'src', 'overrides.css');
if (!exists(overridesFile)) {
  failures.push('src/overrides.css: missing — the Shell imports it, so the build needs it there');
} else {
  try {
    const records = parseOverrides(readFileSync(overridesFile, 'utf8'));
    if (records.length > 0) {
      console.log(
        `check-source: ${records.length} Override(s) are standing outside a composition —` +
          ' the Editor lists them, and they are waiting to be folded in.',
      );
    }
  } catch (error) {
    fail(overridesFile, `${error.message} — the Editor writes every byte of this file`);
  }
}
if (failures.length > 0) {
  console.error('check-source: the source boundaries are broken.\n');
  for (const failure of failures) console.error(`  ${failure}`);
  console.error(`\n${failures.length} failure${failures.length === 1 ? '' : 's'}.`);
  process.exit(1);
}

console.log(`check-source: ${sections.length} Section(s) and the Kernel pass.`);
