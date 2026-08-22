/**
 * Which file the Editor is allowed to write, and how a Section's name becomes
 * that path.
 *
 * ADR 0004 says the Editor writes Content and Tokens and nothing else, and this
 * ticket delivers Content. That limit is worth nothing as a rule and everything
 * as a mechanism, so this is the mechanism: the only thing in the Editor that
 * turns anything off the wire into a filesystem path, and it takes a Section
 * NAME rather than a path. The filename is a constant. There is no argument to
 * anything here that could make the Editor write a component, a stylesheet or a
 * Token — not a malformed one, not a traversal, not a clever encoding — because
 * the file name is never composed from input at all.
 *
 * A name that is not one of the Sections actually on disk is refused before any
 * of the path handling runs, which makes the allowlist the first gate rather
 * than the last.
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

import { Refused, fields, write } from './content.mjs';

/** The one file name the Editor writes. Not a parameter, anywhere. */
export const CONTENT = 'content.ts';

/** A Section's folder name: lower case, digits and single dashes. */
const NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/**
 * The Sections under `sectionsRoot` that hold a Content file, sorted.
 *
 * A folder with no `content.ts` is not a Section the Editor can write, whatever
 * else is in it.
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
 * The absolute path of a Section's Content file.
 *
 * @param {string} sectionsRoot
 * @param {string} section a Section's folder name, and never a path
 * @returns {string}
 */
export function contentFile(sectionsRoot, section) {
  if (typeof section !== 'string' || !NAME.test(section)) {
    throw new Refused(
      `"${section}" is not a Section name — lower case, digits and dashes, and never a path`,
    );
  }
  if (!discover(sectionsRoot).includes(section)) {
    throw new Refused(
      `there is no ${section} Section with a ${CONTENT} in it — have ${discover(sectionsRoot).join(', ')}`,
    );
  }
  // Belt and braces on top of the name pattern and the allowlist, both of which
  // already make this unreachable. It stays because it is the assertion that
  // survives someone loosening one of those two later.
  const file = resolve(sectionsRoot, section, CONTENT);
  const root = resolve(sectionsRoot);
  if (!file.startsWith(root + sep) || !file.endsWith(sep + CONTENT)) {
    throw new Refused(`${section} resolves outside ${root} — refused`);
  }
  return file;
}

/** Every Section's Content, as the Editor's surface needs it. */
export function readAll(sectionsRoot) {
  return discover(sectionsRoot).map((section) => ({
    section,
    fields: fields(readFileSync(contentFile(sectionsRoot, section), 'utf8')),
  }));
}

/**
 * Put `value` at `key` in a Section's Content, on disk.
 *
 * The bytes are produced by the boundary and only then written, so a refusal
 * never reaches the filesystem. `utf8` and no newline translation: a Content
 * file is LF in git and rewriting it as CRLF on Windows would turn a one-word
 * edit into a whole-file diff.
 *
 * @returns {{ file: string, key: string, value: string, changed: boolean }}
 */
export function put(sectionsRoot, section, key, value) {
  const file = contentFile(sectionsRoot, section);
  const source = readFileSync(file, 'utf8');
  const bytes = write(source, key, value);
  if (bytes === source) return { file, key, value, changed: false };
  writeFileSync(file, bytes, 'utf8');
  return { file, key, value, changed: true };
}
