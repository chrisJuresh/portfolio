import assert from 'node:assert/strict';
import { test } from 'node:test';
import { auditRowCap, capModule, planRowCap, rowCapReport } from './rows.mjs';

/**
 * A `results` declaration, written HERE rather than read out of `config.json`.
 *
 * The tests below are about plan, cap, audit and report, and none of them is
 * about what `config.json` happens to hold today — #199 is the entry that cost:
 * a test whose fixture was the shipped declaration failed the moment a
 * legitimate author action moved it, so the only gate this repository has broke
 * for a change that was correct. Drift between the two is not the risk it looks
 * like: a `find` that stops matching Eater's source is caught by `auditRowCap`
 * on the next capture, loudly and by name, which is the whole point.
 */
const RESULTS = {
  query: 'Bar',
  rows: 2,
  cap: {
    id: 'rows',
    is: "how many result rows the panel shows at once; the app's own is four",
    module: '/src/lib/constants\\.js(?:$|\\?)',
    find: 'MOBILE_SEARCH_VISIBLE_RESULTS\\s*=\\s*\\d+',
    replace: 'MOBILE_SEARCH_VISIBLE_RESULTS = {value}',
    expect: 1,
  },
};

/** The declaration, with something moved. */
const declared = (moved = {}) => ({ ...RESULTS, ...moved });

/** The declaration, with one field of the cap moved. */
const capped = (moved) => ({ ...RESULTS, cap: { ...RESULTS.cap, ...moved } });

/** Eater's constants module, reduced to the one line the cap reaches for. */
const CONSTANTS = [
  'export const MOBILE_LAYOUT_MAX_WIDTH = 820;',
  'export const MOBILE_SEARCH_VISIBLE_RESULTS = 4;',
  'export const MARKER_LAYER_OPACITY = 0.42;',
].join('\n');

const CONSTANTS_URL = 'http://127.0.0.1:5199/src/lib/constants.js?t=1';
const OTHER_URL = 'http://127.0.0.1:5199/src/lib/map/style.js';

/** One intercepted fetch, as the capture records it. */
const serve = (url, source, plan) => ({ url, count: capModule(url, source, plan).count });

// ---------------------------------------------------------------------------
// The plan
// ---------------------------------------------------------------------------

test('a declaration with no results block plans nothing, which is the reversal', () => {
  assert.equal(planRowCap(undefined), null);
  assert.equal(planRowCap(null), null);
});

test('the plan carries the rows, the count and the compiled patterns', () => {
  const plan = planRowCap(RESULTS);
  assert.equal(plan.id, 'rows');
  assert.equal(plan.rows, 2);
  assert.equal(plan.expect, 1);
  assert.equal(plan.replace, 'MOBILE_SEARCH_VISIBLE_RESULTS = 2');
  assert.ok(plan.module.test(CONSTANTS_URL));
  assert.ok(!plan.module.test(OTHER_URL));
  // GLOBAL, ALWAYS. The count is the whole assertion, and a non-global regex
  // stops at the first match, so `expect: 2` would be unsatisfiable and a second
  // call site would go un-rewritten while the run reported success.
  assert.ok(plan.find.global);
});

test('a row count that is not a whole number above zero is refused, and says so', () => {
  for (const rows of [0, -1, 2.5, '2', null, undefined]) {
    assert.throws(() => planRowCap(declared({ rows })), /results\.rows in config\.json/);
  }
});

test('every field of the cap is read, and the refusal names the field', () => {
  const wrong = {
    id: '',
    is: '',
    module: '',
    find: '',
    replace: 'MOBILE_SEARCH_VISIBLE_RESULTS = 2',
    expect: 0,
  };
  for (const [field, value] of Object.entries(wrong)) {
    assert.throws(
      () => planRowCap(capped({ [field]: value })),
      new RegExp(`declares ${field} as`),
      `${field} was accepted`,
    );
  }
});

test('a replace with no slot in it is refused rather than pasting nothing', () => {
  // The failure this names is silent in the worst way: the module is rewritten,
  // the count agrees, and the constant is left at whatever the replacement
  // happened to hardcode.
  assert.throws(() => planRowCap(capped({ replace: 'MOBILE_SEARCH_VISIBLE_RESULTS = 2' })), /\{value\}/);
});

test('a pattern that is not a regular expression is refused here rather than later', () => {
  for (const field of ['module', 'find']) {
    assert.throws(() => planRowCap(capped({ [field]: '(' })), /is not a regular expression/);
  }
});

test('a missing cap block is a throw and not a null — the two are different questions', () => {
  // `null` is "no fourth surface was asked for". A declaration that asks for one
  // and cannot describe how is a run that would write three cards while
  // reporting four.
  assert.throws(() => planRowCap({ rows: 2, query: 'Bar' }), /the cap with no id/);
});

// ---------------------------------------------------------------------------
// The rewrite
// ---------------------------------------------------------------------------

test('the cap is applied to the module it claims, and counted', () => {
  const plan = planRowCap(RESULTS);
  const { source, count } = capModule(CONSTANTS_URL, CONSTANTS, plan);
  assert.equal(count, 1);
  assert.match(source, /MOBILE_SEARCH_VISIBLE_RESULTS = 2;/);
  // And nothing else in the module moved.
  assert.match(source, /MARKER_LAYER_OPACITY = 0\.42;/);
  assert.match(source, /MOBILE_LAYOUT_MAX_WIDTH = 820;/);
});

test('a module the cap does not claim is handed back untouched, and counts nothing', () => {
  const plan = planRowCap(RESULTS);
  const { source, count } = capModule(OTHER_URL, CONSTANTS, plan);
  assert.equal(source, CONSTANTS);
  // `null` and not `0`: this fetch was not the cap's business, and reporting it
  // as "found nothing" would make every unrelated module a refusal.
  assert.equal(count, null);
});

test('no plan rewrites nothing, so a run taking three cards routes nothing', () => {
  const { source, count } = capModule(CONSTANTS_URL, CONSTANTS, null);
  assert.equal(source, CONSTANTS);
  assert.equal(count, null);
});

test('the replacement is pasted literally, dollars and all', () => {
  // `String.replace` reads `$&`, `$'` and `$1` out of a replacement STRING, so a
  // replacement carrying one would quietly become something else.
  const plan = planRowCap(capped({ replace: "MOBILE_SEARCH_VISIBLE_RESULTS = {value} /* $& $' $1 */" }));
  const { source } = capModule(CONSTANTS_URL, CONSTANTS, plan);
  assert.match(source, /MOBILE_SEARCH_VISIBLE_RESULTS = 2 \/\* \$& \$' \$1 \*\//);
});

// ---------------------------------------------------------------------------
// The refusal — which is what this whole file exists for
// ---------------------------------------------------------------------------

test('a run where every count agrees refuses nothing', () => {
  const plan = planRowCap(RESULTS);
  assert.deepEqual(auditRowCap(plan, [serve(CONSTANTS_URL, CONSTANTS, plan)]), []);
});

test('a count that does not agree is reported, and names the rewrite and the module', () => {
  const plan = planRowCap(capped({ expect: 2 }));
  const refusals = auditRowCap(plan, [serve(CONSTANTS_URL, CONSTANTS, plan)]);
  assert.equal(refusals.length, 1);
  assert.match(refusals[0], /the rows rewrite expected 2 match\(es\)/);
  assert.match(refusals[0], /found 1/);
  assert.match(refusals[0], /constants\.js/);
});

test('a source with nothing to match is REPORTED rather than silently passed', () => {
  // THE FAILURE THIS FILE IS FOR. Eater renames the constant, the module is
  // served, nothing matches, and the panel comes out at the app's own four rows
  // inside a host box sized for two — which on disk looks exactly like the right
  // card until somebody counts the rows.
  const plan = planRowCap(RESULTS);
  const moved = CONSTANTS.replace('MOBILE_SEARCH_VISIBLE_RESULTS', 'SEARCH_ROWS_VISIBLE');
  const refusals = auditRowCap(plan, [serve(CONSTANTS_URL, moved, plan)]);
  assert.equal(refusals.length, 1);
  assert.match(refusals[0], /found 0/);
});

test('a module that was never served at all is a refusal of its own', () => {
  // Eater MOVES the constant rather than renaming it. Nothing the cap claims is
  // ever fetched, so there is no count to disagree with — and a run that read
  // that as "no disagreement" would write the uncapped card.
  const plan = planRowCap(RESULTS);
  const refusals = auditRowCap(plan, [serve(OTHER_URL, CONSTANTS, plan)]);
  assert.equal(refusals.length, 1);
  assert.match(refusals[0], /never served a module matching/);
  assert.match(refusals[0], /uncapped panel/);
});

test('an empty run is the same refusal, and not a vacuous pass', () => {
  const plan = planRowCap(RESULTS);
  assert.equal(auditRowCap(plan, []).length, 1);
});

test('EVERY fetch has to agree, so one good one cannot cover for a bad one', () => {
  // vite re-serves a module on an HMR round trip, and a total that only had to
  // reach its count would pass on the sum of a hit and a miss.
  const plan = planRowCap(RESULTS);
  const refusals = auditRowCap(plan, [
    serve(CONSTANTS_URL, CONSTANTS, plan),
    serve(CONSTANTS_URL, '// gone\n', plan),
  ]);
  assert.equal(refusals.length, 1);
  assert.match(refusals[0], /found 0/);
});

test('no plan refuses nothing, however little was served', () => {
  assert.deepEqual(auditRowCap(null, []), []);
});

// ---------------------------------------------------------------------------
// What the run says it did
// ---------------------------------------------------------------------------

test('the report names the rewrite, the rows and the count, and says the checkout is untouched', () => {
  const said = rowCapReport(planRowCap(RESULTS), 'D:/somewhere/eater').join('\n');
  assert.match(said, /nothing in D:\/somewhere\/eater is edited/);
  assert.match(said, /rows {2}2/);
  assert.match(said, /x1/);
  assert.match(said, /how many result rows/);
});

test('a run taking no dropdown says so, and does not claim to have edited anything', () => {
  const said = rowCapReport(null, 'D:/somewhere/eater').join('\n');
  assert.match(said, /no results dropdown declared/);
  assert.ok(!/edited/.test(said), 'a run that capped nothing should not mention editing');
});
