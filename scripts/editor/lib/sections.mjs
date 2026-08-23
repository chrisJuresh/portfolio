/**
 * Which files the Editor is allowed to write, and how a NAME becomes one of
 * those paths.
 *
 * ADR 0004 says the Editor writes Content and Tokens and nothing else, and it is
 * now both. That limit is worth nothing as a rule and everything as a mechanism,
 * so this is the mechanism: the only thing in the Editor that turns anything off
 * the wire into a filesystem path, and it takes a NAME rather than a path. WHICH
 * KIND of file a request gets is decided by the route it arrived on and never by
 * anything in it — `/content` reaches a Section's `content.ts` and `/tokens`
 * reaches a Tokens file — and every path is composed out of this module's own
 * constants and a name that was found on disk first. So there is no argument to
 * any of this that could make the Editor write a component, a stylesheet that is
 * not Tokens, or a script — not a malformed one, not a traversal, not a clever
 * encoding.
 *
 * TOKENS ARE NOT ONLY A SECTION'S. The Effect Stack's hundred numbers and the
 * three corner pictures' placement are Tokens by every part of CONTEXT.md's
 * definition except the word `Section`, and #146 is the ticket that has to reach
 * them: they are what two of the five tuners it absorbs were for. So the Kernel
 * keeps its Tokens in `src/kernel/tokens/`, one file per part, and those answer
 * to `kernel-<stem>`. Discovered rather than listed, exactly as a Section is —
 * the Kernel growing a fourth Tokens file gets controls for free.
 *
 * The two families cannot collide, because a Section whose folder began
 * `kernel-` would not be discovered as a Section at all. That is a rule the
 * build already makes unreachable and the assertion is here anyway, because it
 * is what decides which file a write lands in.
 *
 * A BAKE IS A THIRD FAMILY, and the same two rules hold for it: `recipe.json`
 * and `params.json` are constants, and a Bake's folder name is found on disk
 * before anything is composed out of it. Only one of the two is ever written,
 * and the recipe's own read is what tells the Editor which parameters exist —
 * `bakes.mjs` is the boundary and the reasoning.
 *
 * A name that is not one of the holders actually on disk is refused before any
 * of the path handling runs, which makes the allowlist the first gate rather
 * than the last.
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

import { PARAMS, RECIPE, recipe, values, write as writeParam } from './bakes.mjs';
import { Refused, fields, write as writeContent } from './content.mjs';
import { tokens, write as writeToken } from './tokens.mjs';

/** The two file names the Editor writes inside a Section. Neither is a
 *  parameter, anywhere. */
export const CONTENT = 'content.ts';
export const TOKENS = 'tokens.css';

/** The Kernel's Tokens live one file per part, under this directory of it, and
 *  answer to KERNEL + the file's stem. The directory is a constant; the stem is
 *  discovered, exactly as a Section's folder name is. */
export const KERNEL_TOKENS = 'tokens';

/** What a Kernel Tokens file is called on the wire. A Section cannot take one of
 *  these names, because `discover` will not return a folder that starts with it. */
export const KERNEL = 'kernel-';

/** A holder's name: lower case, digits and single dashes. Exported because
 *  Publish has to recognise the Editor's own files, and a second, looser copy of
 *  this pattern there would be a path shape two files disagreed about. */
export const NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/**
 * The Sections under `sectionsRoot` that hold a Content file, sorted.
 *
 * A folder with no `content.ts` is not a Section the Editor can write, whatever
 * else is in it — and every Section has both files, because
 * `scripts/check-source.mjs` fails the build on a Section folder missing either.
 *
 * A folder whose name begins `kernel-` is skipped, so a Section can never take
 * the name of one of the Kernel's Tokens files. The build makes that unreachable
 * anyway; it is here because this is the function that decides which file a
 * write lands in.
 */
export function discover(sectionsRoot) {
  let entries;
  try {
    entries = readdirSync(sectionsRoot, { withFileTypes: true });
  } catch (error) {
    throw new Refused(`cannot read ${sectionsRoot} — ${error.message}`);
  }
  return entries
    .filter((entry) => entry.isDirectory() && NAME.test(entry.name) && !entry.name.startsWith(KERNEL))
    .map((entry) => entry.name)
    .filter((name) => {
      try {
        return statSync(join(sectionsRoot, name, CONTENT)).isFile();
      } catch {
        return false;
      }
    })
    .sort();
}

/**
 * The Kernel's Tokens files, as the names they answer to, sorted.
 *
 * `src/kernel/tokens/effects.css` is `kernel-effects`. Discovered and never
 * listed, for the same reason a Section's Tokens are: the Kernel promoting a
 * fourth part's numbers into a file of their own gets controls for free.
 *
 * A missing directory is an empty list rather than a refusal — a Kernel with no
 * Tokens of its own is a tree, not a question.
 */
export function discoverKernel(kernelRoot) {
  let entries;
  try {
    entries = readdirSync(join(kernelRoot, KERNEL_TOKENS), { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.css'))
    .map((entry) => `${KERNEL}${entry.name.slice(0, -4)}`)
    .filter((name) => NAME.test(name))
    .sort();
}

/**
 * The absolute path a name resolves to, checked against what is on disk first.
 *
 * `file` is one of this module's own constants and comes from the ROUTE rather
 * than from the request — see the note at the top of the file. A Kernel name
 * reaches a Tokens file and can reach nothing else, because there is no Content
 * for it to name.
 *
 * @param {{ sections: string, kernel: string }} roots
 * @param {string} name a Section's folder name or `kernel-<stem>`, never a path
 * @param {string} file CONTENT or TOKENS
 */
function fileIn(roots, name, file) {
  if (file !== CONTENT && file !== TOKENS) {
    throw new Refused(`the Editor writes ${CONTENT} and ${TOKENS}, and "${file}" is neither`);
  }
  if (typeof name !== 'string' || !NAME.test(name)) {
    throw new Refused(
      `"${name}" is not a Section or Kernel Tokens name — lower case, digits and dashes, and never a path`,
    );
  }

  if (name.startsWith(KERNEL)) {
    if (file !== TOKENS) {
      throw new Refused(`${name} is the Kernel's Tokens — there is no ${CONTENT} to write there`);
    }
    const holders = discoverKernel(roots.kernel);
    if (!holders.includes(name)) {
      throw new Refused(
        `there is no ${name} — the Kernel's Tokens are ${holders.join(', ') || 'none'}`,
      );
    }
    return within(
      resolve(roots.kernel, KERNEL_TOKENS),
      `${name.slice(KERNEL.length)}.css`,
      name,
    );
  }

  const sections = discover(roots.sections);
  if (!sections.includes(name)) {
    throw new Refused(`there is no ${name} Section with a ${CONTENT} in it — have ${sections.join(', ')}`);
  }
  return within(resolve(roots.sections, name), file, name);
}

/**
 * `<root>/<leaf>`, proved to be a file under `root` and named `leaf`.
 *
 * Belt and braces on top of the name pattern and the allowlist, both of which
 * already make this unreachable. It stays because it is the assertion that
 * survives someone loosening one of those two later.
 */
function within(root, leaf, name) {
  const path = resolve(root, leaf);
  if (!path.startsWith(resolve(root) + sep) || !path.endsWith(sep + leaf)) {
    throw new Refused(`${name} resolves outside ${root} — refused`);
  }
  try {
    if (!statSync(path).isFile()) throw new Error('not a file');
  } catch {
    throw new Refused(`${name} has no ${leaf}`);
  }
  return path;
}

/** The absolute path of a Section's Content file. */
export const contentFile = (roots, section) => fileIn(roots, section, CONTENT);

/** The absolute path of a holder's Tokens file. */
export const tokensFile = (roots, holder) => fileIn(roots, holder, TOKENS);

/** Every Section's Content, as the Editor's surface needs it. */
export function readAll(roots) {
  return discover(roots.sections).map((section) => ({
    section,
    fields: fields(readFileSync(contentFile(roots, section), 'utf8')),
  }));
}

/**
 * Every holder's Tokens, as the Editor's surface needs them: the Sections first,
 * in name order, and then the Kernel's.
 *
 * Discovered and never listed, which is #144's first acceptance criterion and
 * #146's reach into the Kernel: a Section that promotes a new number to a Token,
 * or a Kernel part that gets a Tokens file, gets controls for free, because the
 * only thing that knows the Tokens exist is the file that declares them.
 *
 * A Section with no Tokens file is skipped rather than refused — the build
 * requires one, so its absence is a tree mid-edit and not a request to answer.
 */
export function readAllTokens(roots) {
  return [...discover(roots.sections), ...discoverKernel(roots.kernel)]
    .map((section) => {
      let path;
      try {
        path = tokensFile(roots, section);
      } catch {
        return null;
      }
      return { section, tokens: tokens(readFileSync(path, 'utf8')) };
    })
    .filter((entry) => entry !== null);
}

/**
 * Put `value` at `key` in one of the Editor's writable files, on disk.
 *
 * The bytes are produced by the boundary and only then written, so a refusal
 * never reaches the filesystem. `utf8` and no newline translation: both files are
 * LF in git and rewriting one as CRLF on Windows would turn a one-value edit into
 * a whole-file diff.
 */
function place(file, boundary, roots, name, key, value) {
  const path = fileIn(roots, name, file);
  const source = readFileSync(path, 'utf8');
  const bytes = boundary(source, key, value);
  if (bytes === source) return { file: path, key, value, changed: false };
  writeFileSync(path, bytes, 'utf8');
  return { file: path, key, value, changed: true };
}

/**
 * @returns {{ file: string, key: string, value: string, changed: boolean }}
 */
export const put = (roots, section, key, value) =>
  place(CONTENT, writeContent, roots, section, key, value);

/**
 * @returns {{ file: string, key: string, value: string, changed: boolean }}
 */
export const putToken = (roots, holder, key, value) =>
  place(TOKENS, writeToken, roots, holder, key, value);

// ---------------------------------------------------------------------------
// The Bakes
// ---------------------------------------------------------------------------

/**
 * The Bakes under `bakesRoot` that hold a recipe, sorted.
 *
 * A folder with no `recipe.json` is not a Bake, whatever else is in it — the
 * recipe is the whole of what makes one addressable, because it is what declares
 * the command and every parameter.
 */
export function discoverBakes(bakesRoot) {
  let entries;
  try {
    entries = readdirSync(bakesRoot, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isDirectory() && NAME.test(entry.name))
    .map((entry) => entry.name)
    .filter((name) => {
      try {
        return statSync(join(bakesRoot, name, RECIPE)).isFile();
      } catch {
        return false;
      }
    })
    .sort();
}

/**
 * The absolute path of one of a Bake's two files.
 *
 * Same shape as `fileIn` and for the same reason: the file name is one of this
 * module's own constants and the folder name was found on disk before anything
 * was composed. `params.json` is the one file in the Editor that may not exist
 * yet — a Bake standing at every default has never been written — so its
 * existence is not required, only its folder's.
 */
function bakeFile(roots, bake, file) {
  if (file !== RECIPE && file !== PARAMS) {
    throw new Refused(`a Bake holds ${RECIPE} and ${PARAMS}, and "${file}" is neither`);
  }
  if (typeof bake !== 'string' || !NAME.test(bake)) {
    throw new Refused(`"${bake}" is not a Bake name — lower case, digits and dashes, and never a path`);
  }
  const bakes = discoverBakes(roots.bakes);
  if (!bakes.includes(bake)) {
    throw new Refused(`there is no ${bake} Bake — have ${bakes.join(', ') || 'none'}`);
  }
  const folder = resolve(roots.bakes, bake);
  const path = resolve(folder, file);
  if (!path.startsWith(folder + sep) || !path.endsWith(sep + file)) {
    throw new Refused(`${bake} resolves outside ${roots.bakes} — refused`);
  }
  return path;
}

/** A Bake's declaration, read and validated. */
export const recipeOf = (roots, bake) => recipe(readFileSync(bakeFile(roots, bake, RECIPE), 'utf8'));

/** What has been tuned away from that Bake's defaults, or nothing. */
export function paramsOf(roots, bake) {
  const path = bakeFile(roots, bake, PARAMS);
  try {
    return values(readFileSync(path, 'utf8'));
  } catch (error) {
    if (error instanceof Refused) throw error;
    return {};
  }
}

/**
 * Put `value` at `key` in a Bake's parameters, on disk.
 *
 * The bytes are produced by the boundary and only then written, so a refusal
 * never reaches the filesystem — and a value put back to its default removes its
 * line rather than repeating the recipe.
 *
 * @returns {{ file: string, key: string, value: string, changed: boolean }}
 */
export function putParam(roots, bake, key, value) {
  const path = bakeFile(roots, bake, PARAMS);
  const read = recipeOf(roots, bake);
  let source = '';
  try {
    source = readFileSync(path, 'utf8');
  } catch {
    source = '';
  }
  const bytes = writeParam(source, read, key, value);
  const now = values(bytes)[key];
  const held = { file: path, key, value: now ?? read.params.find((param) => param.key === key).value };
  if (bytes === source) return { ...held, changed: false };
  writeFileSync(path, bytes, 'utf8');
  return { ...held, changed: true };
}
