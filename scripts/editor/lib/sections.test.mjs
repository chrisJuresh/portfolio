import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import { Refused } from './content.mjs';
import {
  CONTENT,
  KERNEL_TOKENS,
  TOKENS,
  contentFile,
  discover,
  discoverBakes,
  discoverKernel,
  paramsOf,
  putParam,
  recipeOf,
  tokensFile,
} from './sections.mjs';

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

// The Kernel's Tokens, which are the second family of holders (#146): one file
// per part, under one constant directory, answering to `kernel-<stem>`.
const kernel = mkdtempSync(join(tmpdir(), 'editor-kernel-'));
after(() => rmSync(kernel, { recursive: true, force: true }));
mkdirSync(join(kernel, KERNEL_TOKENS), { recursive: true });
writeFileSync(join(kernel, KERNEL_TOKENS, 'effects.css'), ':root { --fx-grain-size: 600px; }');
writeFileSync(join(kernel, KERNEL_TOKENS, 'corners.css'), ':root { --plate-opacity: 0.12; }');
// Not a stylesheet, so not one of them: the discovery is by extension and the
// directory is a constant, so a README beside them is not a holder.
writeFileSync(join(kernel, KERNEL_TOKENS, 'README.md'), 'not a Tokens file');

// And the third family: a Bake, which is a folder holding a recipe.
const bakes = mkdtempSync(join(tmpdir(), 'editor-bakes-'));
after(() => rmSync(bakes, { recursive: true, force: true }));
mkdirSync(join(bakes, 'plate'), { recursive: true });
writeFileSync(
  join(bakes, 'plate', 'recipe.json'),
  JSON.stringify({
    title: 'The corner pictures',
    run: ['python', 'design/plate/build-plate.py', '{source}'],
    groups: [{ name: 'a', params: [{ key: 'source', value: 'photos/dome.rw2' }] }],
  }),
);
// A folder with no recipe is not a Bake, whatever else is in it.
mkdirSync(join(bakes, 'not-a-bake'), { recursive: true });

const roots = { sections: root, kernel, bakes };

/** Both resolvers, so every refusal below is asserted of each. */
const resolvers = [
  ['contentFile', contentFile],
  ['tokensFile', tokensFile],
];

test('discover finds the Sections that hold a Content file, sorted', () => {
  assert.deepEqual(discover(root), ['front-screen', 'projects-panel']);
});

test('each resolver names its own file in a Section and nothing else', () => {
  assert.equal(contentFile(roots, 'front-screen'), join(root, 'front-screen', CONTENT));
  assert.equal(tokensFile(roots, 'front-screen'), join(root, 'front-screen', TOKENS));
});

test('a resolver refuses a Section that does not exist', () => {
  for (const [name, resolve] of resolvers) {
    assert.throws(() => resolve(roots, 'not-a-section'), Refused, name);
    assert.throws(() => resolve(roots, 'invented'), Refused, name);
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
      assert.throws(() => resolve(roots, name), Refused, `${which} accepted ${JSON.stringify(name)}`);
    }
  }
});

test('a resolver refuses anything that is not a plain Section name', () => {
  for (const name of ['', ' ', 'Front-Screen', 'front_screen', 'front screen', '-leading', 'front-screen.ts', null, 7]) {
    for (const [which, resolve] of resolvers) {
      assert.throws(() => resolve(roots, name), Refused, `${which} accepted ${JSON.stringify(name)}`);
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
    assert.ok(contentFile(roots, section).endsWith(join(section, CONTENT)));
    assert.ok(tokensFile(roots, section).endsWith(join(section, TOKENS)));
  }
});

test('a resolver refuses a Section whose file is not on disk', () => {
  // `discover` asks only for a Content file, so a Section mid-edit can be a
  // Section with no Tokens in it — and that is a refusal rather than an ENOENT
  // thrown from under the boundary.
  mkdirSync(join(root, 'half-a-section'), { recursive: true });
  writeFileSync(join(root, 'half-a-section', CONTENT), 'export const content = defineContent(schema, {});');

  assert.equal(contentFile(roots, 'half-a-section'), join(root, 'half-a-section', CONTENT));
  assert.throws(() => tokensFile(roots, 'half-a-section'), Refused);
});

// ---------------------------------------------------------------------------
// The Kernel's Tokens — the second family of holders (#146)
// ---------------------------------------------------------------------------

test('the Kernel names its Tokens files by their stem, sorted, and nothing else', () => {
  assert.deepEqual(discoverKernel(kernel), ['kernel-corners', 'kernel-effects']);
});

test('a Kernel holder resolves to its one file under the constant directory', () => {
  assert.equal(tokensFile(roots, 'kernel-effects'), join(kernel, KERNEL_TOKENS, 'effects.css'));
});

test('a Kernel holder has no Content, so asking for one is a refusal and not a path', () => {
  assert.throws(() => contentFile(roots, 'kernel-effects'), Refused);
});

test('a Kernel name that is not on disk is refused, whatever it looks like', () => {
  for (const name of ['kernel-invented', 'kernel-readme', 'kernel-', 'kernel-corners-x']) {
    assert.throws(() => tokensFile(roots, name), Refused, name);
  }
});

test('a Section cannot take a Kernel holder name, so a write cannot land in either', () => {
  mkdirSync(join(root, 'kernel-effects'), { recursive: true });
  writeFileSync(join(root, 'kernel-effects', CONTENT), 'export const content = defineContent(schema, {});');
  writeFileSync(join(root, 'kernel-effects', TOKENS), '.x { --x-rule: 1px; }');

  assert.equal(discover(root).includes('kernel-effects'), false);
  // Still the Kernel's file, and never the Section folder that shadowed it.
  assert.equal(tokensFile(roots, 'kernel-effects'), join(kernel, KERNEL_TOKENS, 'effects.css'));
  assert.throws(() => contentFile(roots, 'kernel-effects'), Refused);
  rmSync(join(root, 'kernel-effects'), { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// The Bakes — the third
// ---------------------------------------------------------------------------

test('a Bake is a folder with a recipe in it, and a folder without one is not', () => {
  assert.deepEqual(discoverBakes(bakes), ['plate']);
  assert.deepEqual(discoverBakes(join(bakes, 'nowhere')), []);
});

test('a Bake that is not there is refused, in every spelling of a path', () => {
  for (const name of ['not-a-bake', 'invented', '..', '../..', 'plate/..', '/etc', 'C:', '', 7, null]) {
    assert.throws(() => recipeOf(roots, name), Refused, JSON.stringify(name));
    assert.throws(() => paramsOf(roots, name), Refused, JSON.stringify(name));
    assert.throws(() => putParam(roots, name, 'source', 'x'), Refused, JSON.stringify(name));
  }
});

test('a Bake with nothing tuned has no parameters file and is not a failure', () => {
  assert.deepEqual(paramsOf(roots, 'plate'), {});
  assert.equal(recipeOf(roots, 'plate').title, 'The corner pictures');
});

test('putting a parameter writes it, and putting it back takes the line away again', () => {
  const written = putParam(roots, 'plate', 'source', 'photos/other.rw2');
  assert.equal(written.changed, true);
  assert.equal(written.value, 'photos/other.rw2');
  assert.deepEqual(paramsOf(roots, 'plate'), { source: 'photos/other.rw2' });

  const again = putParam(roots, 'plate', 'source', 'photos/other.rw2');
  assert.equal(again.changed, false);

  const back = putParam(roots, 'plate', 'source', 'photos/dome.rw2');
  assert.equal(back.changed, true);
  // The value reported is the recipe's own, because that is what the Bake now
  // holds — not an empty string, and not the key that has just been removed.
  assert.equal(back.value, 'photos/dome.rw2');
  assert.deepEqual(paramsOf(roots, 'plate'), {});
});

test('a parameter the recipe does not declare never reaches the file', () => {
  assert.throws(() => putParam(roots, 'plate', 'invented', 'x'), Refused);
  assert.deepEqual(paramsOf(roots, 'plate'), {});
});
