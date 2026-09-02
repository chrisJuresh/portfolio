import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { auditRetheme, planRetheme, renderValue, rethemeHeld, rethemeReport, rewriteModule } from './retheme.mjs';

const SHIPPED = JSON.parse(readFileSync(new URL('./slab.json', import.meta.url), 'utf8')).retheme;

/** The declaration, with some of its parameters moved. */
const declared = (moved = {}) => ({ ...SHIPPED, ...moved });

/** Eater's style module, reduced to the two things the rewrites reach for. */
const STYLE = [
  "import { layers, namedFlavor } from '@protomaps/basemaps';",
  '',
  'function composeTransit(baseLayers) {',
  '  const styled = baseLayers.map(recolourBasemap);',
  '  return styled;',
  '}',
  '',
  'export function buildLocalStyle() {',
  "  const flavor = namedFlavor('light');",
  '  return { layers: composeTransit(layers("gb", flavor)) };',
  '}',
  '',
  'export function buildOnlineStyle() {',
  "  const flavor = namedFlavor('light');",
  '  return { layers: composeTransit(layers("world", flavor)) };',
  '}',
].join('\n');

const CONSTANTS = ['export const MARKER_LAYER_OPACITY = 0.42;', 'export const PRICED_MARKER_LAYER_OPACITY = 1;'].join(
  '\n',
);

const STYLE_URL = 'http://127.0.0.1:5173/src/lib/map/style.js';
const CONSTANTS_URL = 'http://127.0.0.1:5173/src/lib/constants.js?t=1756800000000';

/** What one fetch of `url` reports, for feeding auditRetheme(). */
const serve = (url, source, plan) => {
  const { found } = rewriteModule(url, source, plan);
  return { url, found };
};

// ---------------------------------------------------------------------------
// The plan
// ---------------------------------------------------------------------------

test('the shipped declaration plans all three rewrites, with its own values in them', () => {
  const plan = planRetheme(SHIPPED);
  assert.deepEqual(
    plan.map((one) => one.id),
    ['flavor', 'drop', 'markerOpacity'],
  );
  assert.equal(plan.find((one) => one.id === 'flavor').replace, "namedFlavor('dark')");
  assert.match(plan.find((one) => one.id === 'drop').replace, /pois\|address_label/);
  assert.match(plan.find((one) => one.id === 'markerOpacity').replace, /= 0\.82$/);
  // The count each one has to make, carried out of the declaration untouched.
  assert.deepEqual(
    plan.map((one) => one.expect),
    [2, 1, 1],
  );
});

test('a value is rendered for a JavaScript source: a string as itself, a list as an alternation', () => {
  assert.equal(renderValue('dark'), 'dark');
  assert.equal(renderValue(0.82), '0.82');
  assert.equal(renderValue(['pois', 'address_label']), 'pois|address_label');
});

test('set back to what Eater already says, the plan is EMPTY — nothing is intercepted at all', () => {
  // This is the whole reversibility claim: not "the rewrites happen to be
  // no-ops" but "there are no rewrites", so the browser is handed the bytes
  // Eater's own dev server served.
  assert.deepEqual(planRetheme(declared({ flavor: 'light', drop: [], markerOpacity: null })), []);
});

test('each parameter drops out of the plan on its own', () => {
  assert.deepEqual(
    planRetheme(declared({ flavor: 'light' })).map((one) => one.id),
    ['drop', 'markerOpacity'],
  );
  assert.deepEqual(
    planRetheme(declared({ drop: [] })).map((one) => one.id),
    ['flavor', 'markerOpacity'],
  );
  assert.deepEqual(
    planRetheme(declared({ markerOpacity: null })).map((one) => one.id),
    ['flavor', 'drop'],
  );
});

test('a parameter is turned off by writing null, not by deleting the line', () => {
  // The two would otherwise be indistinguishable from a MISSPELLED parameter,
  // and one of the two has to be a refusal. Spelling every parameter out is
  // what makes the typo catchable, and the reversal is a value either way.
  const { markerOpacity, ...deleted } = declared();
  assert.throws(() => planRetheme(deleted), /markerOpacity/);
});

test('a whole retheme block that is absent plans nothing rather than throwing', () => {
  assert.deepEqual(planRetheme(undefined), []);
  assert.deepEqual(planRetheme(null), []);
});

test('a value that would not survive being inlined is refused rather than inlined', () => {
  // `dark'); evil(` closes the call it is pasted into. The guard is not about
  // hostile input — it is that a typo here produces a module that throws deep
  // inside vite, minutes into a run, with nothing pointing back at this field.
  assert.throws(() => planRetheme(declared({ flavor: "dark'); evil(" })), /flavor/);
  assert.throws(() => planRetheme(declared({ drop: ['pois', 'a.*'] })), /drop/);
  assert.throws(() => planRetheme(declared({ markerOpacity: 'quite dark' })), /markerOpacity/);
});

test('a rewrite naming a parameter the block does not declare is refused', () => {
  const bent = declared({ rewrites: [{ ...SHIPPED.rewrites[0], parameter: 'flavour' }] });
  assert.throws(() => planRetheme(bent), /flavour/);
});

// ---------------------------------------------------------------------------
// The declaration is checked WHOLE, and here rather than three minutes in
// ---------------------------------------------------------------------------

/** The shipped block with one field of the `flavor` rewrite bent. */
const bend = (field, to) => {
  const [first, ...rest] = SHIPPED.rewrites;
  const bent = { ...first };
  if (to === undefined) delete bent[field];
  else bent[field] = to;
  return declared({ rewrites: [bent, ...rest] });
};

test('every field a rewrite needs is checked, and the refusal names the rewrite and the field', () => {
  // The point is WHERE this happens. planRetheme runs before Eater's dev server
  // is started; auditRetheme runs three minutes later, behind a boot, a page
  // load and a settle. A missing `expect` used to plan fine and refuse there.
  for (const [field, to] of [
    ['expect', undefined],
    ['expect', '2'],
    ['expect', 1.5],
    ['expect', 0],
    ['find', undefined],
    ['find', ''],
    ['module', undefined],
    ['replace', undefined],
    ['is', undefined],
  ]) {
    assert.throws(
      () => planRetheme(bend(field, to)),
      (error) => error.message.includes(field) && /flavor/.test(error.message),
      `${field} = ${JSON.stringify(to)} was accepted`,
    );
  }
});

test('a rewrite with no id is refused, and says so instead of naming a rewrite it cannot name', () => {
  assert.throws(() => planRetheme(bend('id', '')), /a rewrite with no id/);
  assert.throws(() => planRetheme(bend('id', undefined)), /a rewrite with no id/);
});

test('a pattern that is not a regex is refused where it is written, not where it is used', () => {
  assert.throws(() => planRetheme(bend('find', 'namedFlavor(')), /find/);
  assert.throws(() => planRetheme(bend('module', '[')), /module/);
});

test('a replacement that does not carry {value} is refused — the parameter would be inert', () => {
  // This is the silent one the whole file is against: the rewrite still fires,
  // every count still agrees, and the parameter reaches nothing. Moving `flavor`
  // to "dark" would leave the map light and the run would report success.
  assert.throws(() => planRetheme(bend('replace', "namedFlavor('dark')")), /replace/);
});

test('a rewrite is checked even when its own parameter is turned off', () => {
  // A skipped rewrite is still part of the declaration, and a broken entry in it
  // is broken whichever way the parameters happen to be set today.
  assert.throws(() => planRetheme({ ...bend('expect', undefined), flavor: 'light' }), /expect/);
});

// ---------------------------------------------------------------------------
// The rewrite
// ---------------------------------------------------------------------------

test('the flavour rewrite reaches both of Eater style call sites, and says it made two', () => {
  const plan = planRetheme(SHIPPED);
  const { source, found } = rewriteModule(STYLE_URL, STYLE, plan);
  assert.equal((source.match(/namedFlavor\('dark'\)/g) ?? []).length, 2);
  assert.ok(!source.includes("namedFlavor('light')"));
  assert.equal(found.find((one) => one.id === 'flavor').count, 2);
});

test('the drop rewrite puts one filter on the seam every basemap layer passes through', () => {
  const plan = planRetheme(SHIPPED);
  const { source, found } = rewriteModule(STYLE_URL, STYLE, plan);
  assert.equal(found.find((one) => one.id === 'drop').count, 1);
  // The filter is real code, not a comment: run the module's own predicate over
  // the ids Eater namespaces, so the test fails if the alternation is malformed.
  const predicate = /baseLayers = baseLayers\.filter\((.*?)\);/.exec(source)?.[1];
  assert.ok(predicate, 'the filter was not inserted');
  const keeps = new Function(`return ${predicate}`)();
  assert.equal(keeps({ id: 'pois' }), false);
  assert.equal(keeps({ id: 'detail_address_label' }), false);
  assert.equal(keeps({ id: 'roads_minor' }), true);
  assert.equal(keeps({ id: 'poison_labels' }), true);
});

test('the marker opacity rewrite moves the one constant, and no other', () => {
  const plan = planRetheme(SHIPPED);
  const { source, found } = rewriteModule(CONSTANTS_URL, CONSTANTS, plan);
  assert.match(source, /^export const MARKER_LAYER_OPACITY = 0\.82;$/m);
  assert.match(source, /^export const PRICED_MARKER_LAYER_OPACITY = 1;$/m);
  assert.equal(found.find((one) => one.id === 'markerOpacity').count, 1);
});

test('only the rewrites that claim a module are offered it', () => {
  const plan = planRetheme(SHIPPED);
  assert.deepEqual(
    rewriteModule(STYLE_URL, STYLE, plan).found.map((one) => one.id),
    ['flavor', 'drop'],
  );
  assert.deepEqual(
    rewriteModule(CONSTANTS_URL, CONSTANTS, plan).found.map((one) => one.id),
    ['markerOpacity'],
  );
});

test('a module nothing claims comes back byte for byte, with nothing to report', () => {
  const plan = planRetheme(SHIPPED);
  const other = 'http://127.0.0.1:5173/src/lib/map/markers.js';
  const { source, found } = rewriteModule(other, STYLE, plan);
  assert.equal(source, STYLE);
  assert.deepEqual(found, []);
});

test('a module regex is anchored past the path, so a sourcemap beside it is not claimed', () => {
  const plan = planRetheme(SHIPPED);
  assert.deepEqual(rewriteModule(`${STYLE_URL}.map`, STYLE, plan).found, []);
});

test('the replacement is pasted literally — a $ in it is text and not a capture group', () => {
  // The drop rewrite's replacement ends `$/.test(l.id))`, and String.replace
  // reads `$&`, `$'` and `$1` in a replacement string. If it ever went in as a
  // string rather than through a function, the filter would silently become
  // some other regex — which is a light Slab with a dark declaration.
  const plan = planRetheme(SHIPPED);
  const { source } = rewriteModule(STYLE_URL, STYLE, plan);
  assert.ok(source.includes('!/(^|_)(pois|address_label)$/.test(l.id)'));
});

test('nothing is rewritten when the plan is empty', () => {
  assert.deepEqual(rewriteModule(STYLE_URL, STYLE, []), { source: STYLE, found: [] });
});

// ---------------------------------------------------------------------------
// The audit — the half that makes a miss a refusal rather than a light Slab
// ---------------------------------------------------------------------------

test('every count agreeing is no refusal at all', () => {
  const plan = planRetheme(SHIPPED);
  const served = [serve(STYLE_URL, STYLE, plan), serve(CONSTANTS_URL, CONSTANTS, plan)];
  assert.deepEqual(auditRetheme(plan, served), []);
});

test('a count that does not agree names the rewrite, what it wanted and what it found', () => {
  const plan = planRetheme(SHIPPED);
  // Eater renames one of its two call sites: the flavour rewrite now makes one.
  const moved = STYLE.replace("const flavor = namedFlavor('light');\n  return { layers: composeTransit(layers(\"world\"", 'const flavor = namedFlavor(FLAVOUR);\n  return { layers: composeTransit(layers("world"');
  assert.notEqual(moved, STYLE);
  const [refusal, ...rest] = auditRetheme(plan, [serve(STYLE_URL, moved, plan), serve(CONSTANTS_URL, CONSTANTS, plan)]);
  assert.deepEqual(rest, []);
  assert.match(refusal, /flavor/);
  assert.match(refusal, /\b2\b/);
  assert.match(refusal, /\b1\b/);
  assert.match(refusal, /style\.js/);
});

test('a source with nothing to match is reported rather than silently passed', () => {
  const plan = planRetheme(SHIPPED);
  const nothing = '// Eater moved its basemap style somewhere else entirely.\n';
  const refusals = auditRetheme(plan, [serve(STYLE_URL, nothing, plan), serve(CONSTANTS_URL, CONSTANTS, plan)]);
  assert.equal(refusals.length, 2);
  assert.ok(refusals.some((why) => /flavor/.test(why) && /found 0/.test(why)));
  assert.ok(refusals.some((why) => /drop/.test(why) && /found 0/.test(why)));
});

test('a module that was never served at all is a refusal, not a silent pass', () => {
  const plan = planRetheme(SHIPPED);
  const [refusal, ...rest] = auditRetheme(plan, [serve(STYLE_URL, STYLE, plan)]);
  assert.deepEqual(rest, []);
  assert.match(refusal, /markerOpacity/);
  assert.match(refusal, /never served|never offered/);
});

test('nothing served at all refuses once per rewrite rather than passing vacuously', () => {
  const plan = planRetheme(SHIPPED);
  assert.equal(auditRetheme(plan, []).length, plan.length);
});

test('an empty plan audits clean over an empty run — the reversal does not refuse itself', () => {
  assert.deepEqual(auditRetheme([], []), []);
});

// ---------------------------------------------------------------------------
// What the run says it did
// ---------------------------------------------------------------------------

test('the report names every rewrite, its value and its count, and says the checkout is untouched', () => {
  const said = rethemeReport(planRetheme(SHIPPED), 'D:/somewhere/eater').join('\n');
  assert.match(said, /nothing in D:\/somewhere\/eater is edited/);
  for (const rewrite of planRetheme(SHIPPED)) {
    assert.ok(said.includes(rewrite.id), `${rewrite.id} is not in the report`);
    assert.ok(said.includes(rewrite.value), `${rewrite.id}'s value is not in the report`);
    assert.ok(said.includes(rewrite.is), `${rewrite.id} does not say what it does`);
  }
  assert.match(said, /x2/);
});

test('an empty plan says so, and does not claim to have edited anything', () => {
  const said = rethemeReport([], 'D:/somewhere/eater').join('\n');
  assert.match(said, /no re-theme declared/);
  assert.ok(!/edited/.test(said), 'a run that rewrote nothing should not mention editing');
});

test('the tally counts substitutions and fetches, and is nothing over an empty run', () => {
  const plan = planRetheme(SHIPPED);
  const served = [serve(STYLE_URL, STYLE, plan), serve(CONSTANTS_URL, CONSTANTS, plan)];
  assert.match(rethemeHeld(served), /4 substitution\(s\) over 2 module fetch\(es\)/);
  assert.equal(rethemeHeld([]), null);
});

test('a module served twice has to agree BOTH times', () => {
  // vite re-serves a module on an HMR round trip, and a total that only had to
  // reach its count would let one good fetch cover for a bad one.
  const plan = planRetheme(SHIPPED);
  const refusals = auditRetheme(plan, [
    serve(STYLE_URL, STYLE, plan),
    serve(STYLE_URL, '// gone\n', plan),
    serve(CONSTANTS_URL, CONSTANTS, plan),
  ]);
  assert.equal(refusals.length, 2);
  for (const why of refusals) assert.match(why, /found 0/);
});
