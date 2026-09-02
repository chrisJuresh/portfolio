import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MANIFEST, files, report, stamp, staleness, withoutStamp } from './compare.mjs';

const CONFIG = { eater: { repo: 'chrisJuresh/eater-map-site' } };
const AT = { commit: 'a'.repeat(40), subject: 'the first one' };
const LATER = { commit: 'b'.repeat(40), subject: 'the second one' };

const payload = (css = '.eater-cards { color: red }') => ({
  restaurant: { id: 'x', name: 'Bar Italia', address: '22 Frith St' },
  viewport: { width: 390, height: 844 },
  host: 'eater-cards',
  cards: [
    { name: 'search', width: 366, height: 48, html: '<div data-eater-card="search"></div>' },
    { name: 'lines', width: 260, height: 176, html: '<div data-eater-card="lines"></div>' },
  ],
  css,
});

test('every generated file says where it came from, and the manifest says it in a field', () => {
  const made = files(payload(), AT, CONFIG);
  assert.deepEqual([...made.keys()].sort(), ['cards.css', 'cards.json', 'lines.html', 'search.html']);
  for (const name of ['cards.css', 'search.html', 'lines.html']) {
    assert.match(made.get(name), /GENERATED — do not edit/);
    assert.match(made.get(name), new RegExp(AT.commit));
  }
  // JSON carries no comment, so the same fact is a field.
  assert.equal(JSON.parse(made.get(MANIFEST)).eater.commit, AT.commit);
  assert.equal(JSON.parse(made.get(MANIFEST)).eater.repo, CONFIG.eater.repo);
});

test('the output is LF whatever line endings the app was checked out with', () => {
  // A CSS value can be several lines long, and CSSOM hands back the breaks the
  // source file had — so a CRLF checkout of the app would otherwise put carriage
  // returns in the vendored stylesheet and make the report fire on a difference
  // that is somebody's git config rather than the app's interface.
  const crlf = files(
    { ...payload('.a {\r\n  box-shadow: 0 1px,\r\n    0 2px;\r\n}'), cards: [{ name: 'search', width: 1, height: 1, html: '<div>\r\n</div>' }] },
    AT,
    CONFIG,
  );
  for (const [, text] of crlf) assert.ok(!text.includes('\r'), 'a carriage return survived');
  // And a lone CR, which a text-mode round trip would otherwise turn into a
  // whole extra line somewhere else.
  assert.ok(!files(payload('.a { color: red }\r.b {}'), AT, CONFIG).get('cards.css').includes('\r'));
});

test("the manifest records each Card's file and measured size, and no placement", () => {
  const held = JSON.parse(files(payload(), AT, CONFIG).get(MANIFEST));
  assert.deepEqual(held.cards, [
    { name: 'search', file: 'search.html', width: 366, height: 48 },
    { name: 'lines', file: 'lines.html', width: 260, height: 176 },
  ]);
  assert.equal(held.viewport.width, 390);
});

test('a stamp comes off whichever way its file spells a comment', () => {
  assert.equal(withoutStamp('a.css', `${stamp('css', 'r', AT)}\n.a { color: red }`), '.a { color: red }');
  assert.equal(withoutStamp('a.html', `${stamp('html', 'r', AT)}<div></div>\n`), '<div></div>\n');
  // Only the LEADING one — a comment inside the exported markup is the app's.
  assert.equal(withoutStamp('a.html', '<div><!-- theirs --></div>'), '<div><!-- theirs --></div>');
});

test('nothing changed reads as nothing changed', () => {
  const made = files(payload(), AT, CONFIG);
  const { moved, lines } = report(made, files(payload(), AT, CONFIG), CONFIG.eater.repo);
  assert.deepEqual(moved, []);
  assert.deepEqual(lines, []);
});

test('a first run names every file as added', () => {
  const { moved, surfacesMoved, lines } = report(new Map(), files(payload(), AT, CONFIG), CONFIG.eater.repo);
  assert.equal(moved.length, 4);
  assert.equal(surfacesMoved, true);
  assert.ok(lines.every((line) => line.trim().startsWith('+')));
});

test('a surface that moved is reported as a surface that moved', () => {
  const before = files(payload(), AT, CONFIG);
  const after = files(payload('.eater-cards { color: blue }'), LATER, CONFIG);
  const { moved, surfacesMoved, lines } = report(before, after, CONFIG.eater.repo);
  assert.ok(moved.includes('cards.css'));
  assert.equal(surfacesMoved, true);
  assert.match(lines.join('\n'), /aaaaaaaa → bbbbbbbb/);
  assert.match(lines.join('\n'), /was {2}the first one/);
  assert.doesNotMatch(lines.join('\n'), /only the stamp moved/);
});

test('a commit that did not touch a surface says so, rather than crying wolf', () => {
  // Every commit over there moves the stamp whether it reached an interface or
  // not, and a report that cannot tell the two apart is one that gets skimmed.
  const before = files(payload(), AT, CONFIG);
  const after = files(payload(), LATER, CONFIG);
  const { moved, surfacesMoved, lines } = report(before, after, CONFIG.eater.repo);
  assert.equal(moved.length, 4, 'the stamp is in every file, so every file differs');
  assert.equal(surfacesMoved, false);
  assert.match(lines.join('\n'), /only the stamp moved/);
});

test('a file that went away, and one that arrived, both count as the surfaces moving', () => {
  const before = files(payload(), AT, CONFIG);
  const after = files({ ...payload(), cards: payload().cards.slice(0, 1) }, AT, CONFIG);
  const { moved, surfacesMoved, lines } = report(before, after, CONFIG.eater.repo);
  assert.ok(moved.includes('lines.html'));
  assert.equal(surfacesMoved, true);
  assert.match(lines.join('\n'), /- lines\.html/);
});

test('--check does not call a commit stale for touching nothing a Card is made of', () => {
  // The cheap mode is the one most likely to be run out of habit, so it is the
  // worst one to have failing on a change to that repository's README. A SHA
  // comparison alone would.
  assert.equal(staleness({ vendored: 'a', head: 'a', changed: [] }), 'current');
  assert.equal(staleness({ vendored: 'a', head: 'b', changed: [] }), 'stamp-behind');
  assert.equal(staleness({ vendored: 'a', head: 'b', changed: ['src/lib/ui/TopBar.svelte'] }), 'surfaces-moved');
});

test('--check says it cannot tell, rather than guessing, when the stamp names a commit git has not got', () => {
  // Unfetched, or rewritten. Reporting "current" there would be the one wrong
  // answer this whole mechanism exists to prevent.
  assert.equal(staleness({ vendored: 'a', head: 'b', changed: null }), 'unknown');
  // …but a stamp that matches HEAD is current whatever else is unknown.
  assert.equal(staleness({ vendored: 'a', head: 'a', changed: null }), 'current');
});

test('a hand-mangled manifest is not read as unchanged', () => {
  // The stamp-stripped comparison parses JSON, and a file somebody broke must
  // not come back as "the same once you take the stamp off".
  const before = new Map([[MANIFEST, '{ not json']]);
  const after = files(payload(), AT, CONFIG);
  const { surfacesMoved } = report(before, after, CONFIG.eater.repo);
  assert.equal(surfacesMoved, true);
});
