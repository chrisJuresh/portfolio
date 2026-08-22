import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import { Refused } from './content.mjs';
import { CONTENT, TOKENS, contentFile, discover, tokensFile } from './sections.mjs';

/**
 * The half of "the Editor writes Content and Tokens and nothing else" that is a
 * path and not a parser.
 *
 * The boundaries in content.mjs and tokens.mjs can only produce the bytes of one
 * file each; this decides WHICH file those bytes are written to, and it is the
 * only thing in the Editor that turns a name off the wire into a path. So the
 * interesting tests here are all the same test: a request cannot name a file.
 *
 * There are two writable names now rather than one, and every case below is run
 * against BOTH resolvers — because "the Editor writes two files" would otherwise
 * be a rule the tests only checked on one of them.
 */

const root = mkdtempSync(join(tmpdir(), 'editor-sections-'));
after(() => rmSync(root, { recursive: true, force: true }));

for (const section of ['front-screen', 'projects-panel']) {
  mkdirSync(join(root, section), { recursive: true });
  writeFileSync(join(root, section, CONTENT), 'export const content = defineContent(schema, {});');
  writeFileSync(join(root, section, TOKENS), `.${section} { --${section}-rule: 1px; }`);
}
// A directory with no Content in it is not a Section the Editor can write.
mkdirSync(join(root, 'not-a-section'), { recursive: true });
// A file the Editor must never reach, sitting where a traversal would land: a
// Tokens file OUTSIDE any Section, which is the shape `tokensFile` would produce
// if a name were ever allowed to carry a `..` in it.
writeFileSync(join(root, TOKENS), '.x { --x-rule: 1px; }');

/** Both resolvers, so every refusal below is asserted of each. */
const resolvers = [
  ['contentFile', contentFile],
  ['tokensFile', tokensFile],
];

test('discover finds the Sections that hold a Content file, sorted', () => {
  assert.deepEqual(discover(root), ['front-screen', 'projects-panel']);
});

test('each resolver names its own file in a Section and nothing else', () => {
  assert.equal(contentFile(root, 'front-screen'), join(root, 'front-screen', CONTENT));
  assert.equal(tokensFile(root, 'front-screen'), join(root, 'front-screen', TOKENS));
});

test('a resolver refuses a Section that does not exist', () => {
  for (const [name, resolve] of resolvers) {
    assert.throws(() => resolve(root, 'not-a-section'), Refused, name);
    assert.throws(() => resolve(root, 'invented'), Refused, name);
  }
});

test('a resolver refuses a traversal, in every spelling of one', () => {
  for (const name of [
    '..',
    '../..',
    '../../src/kernel',
    'front-screen/../..',
    '..\\..\\src',
    '/etc/passwd',
    'C:\\Windows',
    './front-screen',
    'front-screen/nested',
    'front-screen%2f..',
  ]) {
    for (const [which, resolve] of resolvers) {
      assert.throws(() => resolve(root, name), Refused, `${which} accepted ${JSON.stringify(name)}`);
    }
  }
});

test('a resolver refuses anything that is not a plain Section name', () => {
  for (const name of ['', ' ', 'Front-Screen', 'front_screen', 'front screen', '-leading', 'front-screen.ts', null, 7]) {
    for (const [which, resolve] of resolvers) {
      assert.throws(() => resolve(root, name), Refused, `${which} accepted ${JSON.stringify(name)}`);
    }
  }
});

test('the file named is always one of the two constants, and never a third', () => {
  // Neither name is a parameter anywhere, which is the point: there is no
  // argument to any of this that could make it write a component or a script.
  // The two are told apart by WHICH resolver was called — by the route, that is
  // — so a request cannot ask a Content edit to land in a stylesheet.
  assert.equal(CONTENT, 'content.ts');
  assert.equal(TOKENS, 'tokens.css');
  for (const section of discover(root)) {
    assert.ok(contentFile(root, section).endsWith(join(section, CONTENT)));
    assert.ok(tokensFile(root, section).endsWith(join(section, TOKENS)));
  }
});

test('a resolver refuses a Section whose file is not on disk', () => {
  // `discover` asks only for a Content file, so a Section mid-edit can be a
  // Section with no Tokens in it — and that is a refusal rather than an ENOENT
  // thrown from under the boundary.
  mkdirSync(join(root, 'half-a-section'), { recursive: true });
  writeFileSync(join(root, 'half-a-section', CONTENT), 'export const content = defineContent(schema, {});');

  assert.equal(contentFile(root, 'half-a-section'), join(root, 'half-a-section', CONTENT));
  assert.throws(() => tokensFile(root, 'half-a-section'), Refused);
});
