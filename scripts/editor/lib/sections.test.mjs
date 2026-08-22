import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import { Refused } from './content.mjs';
import { CONTENT, contentFile, discover } from './sections.mjs';

/**
 * The half of "the Editor writes Content and nothing else" that is a path and
 * not a parser.
 *
 * The boundary in content.mjs can only produce the bytes of a Content file; this
 * decides WHICH file those bytes are written to, and it is the only thing in the
 * Editor that turns a name off the wire into a path. So the interesting tests
 * here are all the same test: a request cannot name a file.
 */

const root = mkdtempSync(join(tmpdir(), 'editor-sections-'));
after(() => rmSync(root, { recursive: true, force: true }));

for (const section of ['front-screen', 'projects-panel']) {
  mkdirSync(join(root, section), { recursive: true });
  writeFileSync(join(root, section, CONTENT), 'export const content = defineContent(schema, {});');
}
// A directory with no Content in it is not a Section the Editor can write.
mkdirSync(join(root, 'not-a-section'), { recursive: true });
// A file the Editor must never reach, sitting where a traversal would land.
writeFileSync(join(root, 'tokens.css'), '.x {}');

test('discover finds the Sections that hold a Content file, sorted', () => {
  assert.deepEqual(discover(root), ['front-screen', 'projects-panel']);
});

test('contentFile names a Section’s content.ts and nothing else', () => {
  assert.equal(contentFile(root, 'front-screen'), join(root, 'front-screen', CONTENT));
});

test('contentFile refuses a Section that does not exist', () => {
  assert.throws(() => contentFile(root, 'not-a-section'), Refused);
  assert.throws(() => contentFile(root, 'invented'), Refused);
});

test('contentFile refuses a traversal, in every spelling of one', () => {
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
    assert.throws(() => contentFile(root, name), Refused, `accepted ${JSON.stringify(name)}`);
  }
});

test('contentFile refuses anything that is not a plain Section name', () => {
  for (const name of ['', ' ', 'Front-Screen', 'front_screen', 'front screen', '-leading', 'front-screen.ts', null, 7]) {
    assert.throws(() => contentFile(root, name), Refused, `accepted ${JSON.stringify(name)}`);
  }
});

test('the file named is always called content.ts', () => {
  // The name is not a parameter anywhere, which is the point: there is no
  // argument to any of this that could make it write tokens.css or a component.
  assert.equal(CONTENT, 'content.ts');
  for (const section of discover(root)) {
    assert.ok(contentFile(root, section).endsWith(join(section, CONTENT)));
  }
});
