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

// ---------------------------------------------------------------------------
// A Section is a folder, and the folder shape is the same every time.
// ---------------------------------------------------------------------------

const REQUIRED = ['content.ts', 'tokens.css', 'timeline.ts', 'variants.css', 'NOTES.md', 'assets'];

/** Source only. NOTES.md is prose ABOUT these rules and quotes the things being
 *  banned, so scanning it would fail the build for saying `is:global` out loud. */
const SOURCE = /\.(astro|ts|css)$/;

/** A Section may read its own folder and the Kernel. Nothing else. */
const ALLOWED_IMPORT = /^(?:\.\/|gsap(?:\/|$)|astro(?:\/|$)|\.\.\/\.\.\/kernel\/)/;

/** `is:global` and `:global(` are the escape hatches out of Astro's scoping. */
const SCOPE_ESCAPES = [
  [/\bis:global\b/, 'is:global — a Section may not write a global rule'],
  [/:global\s*\(/, ':global() — a Section may not write a global rule'],
  [/<style[^>]*\bis:inline\b/, '<style is:inline> — an inline style block is not scoped'],
];

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

    // Reaching another Section, whether by relative path or by alias.
    for (const [, specifier] of code.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) {
      if (!ALLOWED_IMPORT.test(specifier)) {
        fail(file, `imports "${specifier}" — a Section may read its own folder and src/kernel/ only`);
      }
    }
    for (const [, specifier] of code.matchAll(/\bimport\s+['"]([^'"]+)['"]/g)) {
      if (!ALLOWED_IMPORT.test(specifier)) {
        fail(file, `imports "${specifier}" — a Section may read its own folder and src/kernel/ only`);
      }
    }
  }

  // tokens.css and variants.css are not scoped by the compiler — Astro never
  // looks inside a plain stylesheet — so what they may contain is what makes
  // them safe, and it is checked rather than trusted. Custom properties only,
  // every one prefixed with the Section's name, on a selector ending in the
  // Section's own root class.
  for (const name of ['tokens.css', 'variants.css']) {
    const file = join(dir, name);
    if (!exists(file)) continue;
    const css = withoutComments(readFileSync(file, 'utf8'));

    for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const trimmed = selector.trim().replace(/\s+/g, ' ');
      for (const one of trimmed.split(',')) {
        if (!new RegExp(`\\.${section}$`).test(one.trim())) {
          fail(file, `selector "${one.trim()}" does not end in .${section}`);
        }
      }
      for (const declaration of body.split(';')) {
        const property = declaration.split(':')[0]?.trim();
        if (!property) continue;
        if (!property.startsWith(`--${section}-`)) {
          fail(file, `"${property}" is not a Token — expected a custom property named --${section}-…`);
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
