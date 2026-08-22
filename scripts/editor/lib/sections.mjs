/**
 * Which files the Editor is allowed to write, and how a Section's name becomes
 * one of those paths.
 *
 * ADR 0004 says the Editor writes Content and Tokens and nothing else, and it is
 * now both. That limit is worth nothing as a rule and everything as a mechanism,
 * so this is the mechanism: the only thing in the Editor that turns anything off
 * the wire into a filesystem path, and it takes a Section NAME rather than a
 * path. There are exactly TWO file names, both constants, and WHICH of the two a
 * request gets is decided by the route it arrived on and never by anything in it
 * — `/content` reaches `content.ts` and `/tokens` reaches `tokens.css`, and
 * neither name is a parameter anywhere. So there is no argument to any of this
 * that could make the Editor write a component, a stylesheet that is not a
 * Section's Tokens, or a script — not a malformed one, not a traversal, not a
 * clever encoding — because a file name is never composed from input at all.
 *
 * A name that is not one of the Sections actually on disk is refused before any
 * of the path handling runs, which makes the allowlist the first gate rather
 * than the last.
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

import { Refused, fields, write as writeContent } from './content.mjs';
import { tokens, write as writeToken } from './tokens.mjs';

/** The two file names the Editor writes. Neither is a parameter, anywhere. */
export const CONTENT = 'content.ts';
export const TOKENS = 'tokens.css';

/** A Section's folder name: lower case, digits and single dashes. Exported
 *  because Publish has to recognise the Editor's own files, and a second, looser
 *  copy of this pattern there would be a path shape two files disagreed about. */
export const NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/**
 * The Sections under `sectionsRoot` that hold a Content file, sorted.
 *
 * A folder with no `content.ts` is not a Section the Editor can write, whatever
 * else is in it — and every Section has both files, because
 * `scripts/check-source.mjs` fails the build on a Section folder missing either.
 */
export function discover(sectionsRoot) {
  let entries;
  try {
    entries = readdirSync(sectionsRoot, { withFileTypes: true });
  } catch (error) {
    throw new Refused(`cannot read ${sectionsRoot} — ${error.message}`);
  }
  return entries
    .filter((entry) => entry.isDirectory() && NAME.test(entry.name))
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
 * The absolute path of one of a Section's two writable files.
 *
 * `file` is one of this module's own two constants and comes from the route
 * rather than from the request — see the note at the top of the file.
 *
 * @param {string} sectionsRoot
 * @param {string} section a Section's folder name, and never a path
 * @param {string} file CONTENT or TOKENS
 */
function fileIn(sectionsRoot, section, file) {
  if (file !== CONTENT && file !== TOKENS) {
    throw new Refused(`the Editor writes ${CONTENT} and ${TOKENS}, and "${file}" is neither`);
  }
  if (typeof section !== 'string' || !NAME.test(section)) {
    throw new Refused(
      `"${section}" is not a Section name — lower case, digits and dashes, and never a path`,
    );
  }
  const sections = discover(sectionsRoot);
  if (!sections.includes(section)) {
    throw new Refused(`there is no ${section} Section with a ${CONTENT} in it — have ${sections.join(', ')}`);
  }
  // Belt and braces on top of the name pattern and the allowlist, both of which
  // already make this unreachable. It stays because it is the assertion that
  // survives someone loosening one of those two later.
  const path = resolve(sectionsRoot, section, file);
  const root = resolve(sectionsRoot);
  if (!path.startsWith(root + sep) || !path.endsWith(sep + file)) {
    throw new Refused(`${section} resolves outside ${root} — refused`);
  }
  try {
    if (!statSync(path).isFile()) throw new Error('not a file');
  } catch {
    throw new Refused(`the ${section} Section has no ${file}`);
  }
  return path;
}

/** The absolute path of a Section's Content file. */
export const contentFile = (sectionsRoot, section) => fileIn(sectionsRoot, section, CONTENT);

/** The absolute path of a Section's Tokens file. */
export const tokensFile = (sectionsRoot, section) => fileIn(sectionsRoot, section, TOKENS);

/** Every Section's Content, as the Editor's surface needs it. */
export function readAll(sectionsRoot) {
  return discover(sectionsRoot).map((section) => ({
    section,
    fields: fields(readFileSync(contentFile(sectionsRoot, section), 'utf8')),
  }));
}

/**
 * Every Section's Tokens, as the Editor's surface needs them.
 *
 * Discovered and never listed, which is the ticket's first acceptance criterion:
 * a Section that promotes a new number to a Token gets a control for free,
 * because the only thing that knows the Tokens exist is the file that declares
 * them. A Section with no Tokens file is skipped rather than refused — the build
 * requires one, so its absence is a tree mid-edit and not a request to answer.
 */
export function readAllTokens(sectionsRoot) {
  return discover(sectionsRoot)
    .map((section) => {
      let path;
      try {
        path = tokensFile(sectionsRoot, section);
      } catch {
        return null;
      }
      return { section, tokens: tokens(readFileSync(path, 'utf8')) };
    })
    .filter((entry) => entry !== null);
}

/**
 * Put `value` at `key` in one of a Section's two writable files, on disk.
 *
 * The bytes are produced by the boundary and only then written, so a refusal
 * never reaches the filesystem. `utf8` and no newline translation: both files are
 * LF in git and rewriting one as CRLF on Windows would turn a one-value edit into
 * a whole-file diff.
 */
function place(file, boundary, sectionsRoot, section, key, value) {
  const path = fileIn(sectionsRoot, section, file);
  const source = readFileSync(path, 'utf8');
  const bytes = boundary(source, key, value);
  if (bytes === source) return { file: path, key, value, changed: false };
  writeFileSync(path, bytes, 'utf8');
  return { file: path, key, value, changed: true };
}

/**
 * @returns {{ file: string, key: string, value: string, changed: boolean }}
 */
export const put = (sectionsRoot, section, key, value) =>
  place(CONTENT, writeContent, sectionsRoot, section, key, value);

/**
 * @returns {{ file: string, key: string, value: string, changed: boolean }}
 */
export const putToken = (sectionsRoot, section, key, value) =>
  place(TOKENS, writeToken, sectionsRoot, section, key, value);
