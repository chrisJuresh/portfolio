import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Refused } from './content.mjs';
import { command, effective, moved, parameters, recipe, values, write } from './bakes.mjs';

/**
 * The Bake boundary, at the bytes and at the argv.
 *
 * THE SAME SEAM AS THE OTHER TWO, and a third reason for it. `content.mjs` and
 * `tokens.mjs` are tested at the bytes because a bug in them corrupts a source
 * file; this one is tested at the bytes AND at the argument list, because a bug
 * in it either corrupts the file a generator reads or hands a generator an
 * argument nobody typed. Both of those are silent — a bake that ran with the
 * wrong number produces an asset that looks plausible and is wrong.
 *
 * WHAT IS WRITTEN IS ONLY THE OVERRIDES, which is why this boundary
 * re-serialises where the other two refuse to. A `recipe.json` carries every
 * default, every label and every paragraph and is NEVER written; a `params.json`
 * carries nothing but the keys that have moved off those defaults, so there is
 * no comment, no ordering and no formatting in it worth preserving. Writing it
 * back sorted is what makes two sessions that tuned the same two numbers produce
 * the same file.
 *
 * A VALUE PUT BACK LOSES ITS LINE. Setting a parameter to its recipe's default
 * removes the key rather than writing it, so the file reads as exactly what has
 * been tuned — the same rule the Tokens surface's preview stylesheet follows,
 * for the same reason.
 */

const RECIPE = `{
  "title": "The corner pictures",
  "note": "Three photographs, graded and cut to a ladder of WebP.",
  "needs": "the original frame — gitignored, so point source at your own copy",
  "run": ["python", "design/plate/build-plate.py", "{source}", "{picture}"],
  "shows": ["portfolio/img/"],
  "groups": [
    {
      "name": "What is being baked",
      "note": "One picture per run; the script names every file after its stem.",
      "params": [
        { "key": "source", "label": "the frame", "value": "photos/dome.rw2" },
        { "key": "picture", "label": "which picture", "value": "plate",
          "options": ["plate", "car", "eye"] }
      ]
    },
    {
      "name": "Grade — the plate, light",
      "note": "The pipeline in order.",
      "params": [
        { "key": "PLATE_LIGHT.EXPOSURE_TARGET", "label": "exposure", "value": "0.34",
          "min": 0.1, "max": 0.8, "step": 0.005,
          "note": "Where the percentile lands, in linear light." },
        { "key": "PLATE_LIGHT.SHADOW", "label": "blacks land on", "value": "#b8b8b8" }
      ]
    }
  ]
}
`;

const read = () => recipe(RECIPE);

// ---------------------------------------------------------------------------
// Reading a recipe
// ---------------------------------------------------------------------------

test('a recipe gives up its parameters in source order, carrying their group', () => {
  const params = parameters(read());
  assert.deepEqual(
    params.map((param) => param.key),
    ['source', 'picture', 'PLATE_LIGHT.EXPOSURE_TARGET', 'PLATE_LIGHT.SHADOW'],
  );
  assert.equal(params[0].group, 'What is being baked');
  assert.equal(params[2].group, 'Grade — the plate, light');
  assert.equal(params[2].groupNote, 'The pipeline in order.');
});

test('a declared range is kept, and an undeclared one is not invented', () => {
  const params = parameters(read());
  const exposure = params.find((param) => param.key === 'PLATE_LIGHT.EXPOSURE_TARGET');
  assert.deepEqual([exposure.min, exposure.max, exposure.step], [0.1, 0.8, 0.005]);
  const shadow = params.find((param) => param.key === 'PLATE_LIGHT.SHADOW');
  assert.equal(shadow.min, null);
  assert.equal(shadow.step, null);
});

test('a recipe that is not JSON is refused rather than half-read', () => {
  assert.throws(() => recipe('{ "title": '), Refused);
});

test('a recipe with no run is refused — a Bake that cannot be run is not one', () => {
  assert.throws(() => recipe('{"title":"x","groups":[]}'), /run/);
});

test('a run whose first word is not a program is refused', () => {
  assert.throws(() => recipe('{"title":"x","run":[],"groups":[]}'), /run/);
  assert.throws(() => recipe('{"title":"x","run":["python",7],"groups":[]}'), /run/);
});

test('two parameters with one key are refused — a write could reach either', () => {
  const twice = JSON.stringify({
    title: 'x',
    run: ['python', 'x.py'],
    groups: [
      { name: 'a', params: [{ key: 'k', value: '1' }] },
      { name: 'b', params: [{ key: 'k', value: '2' }] },
    ],
  });
  assert.throws(() => recipe(twice), /k/);
});

test('a default that is not a string is refused — every value crosses as text', () => {
  const numeric = JSON.stringify({
    title: 'x',
    run: ['python', 'x.py'],
    groups: [{ name: 'a', params: [{ key: 'k', value: 1 }] }],
  });
  assert.throws(() => recipe(numeric), /k/);
});

// ---------------------------------------------------------------------------
// Reading and writing the overrides
// ---------------------------------------------------------------------------

test('an empty params file is no overrides at all', () => {
  assert.deepEqual(values(''), {});
  assert.deepEqual(values('{}\n'), {});
});

test('a params file that is not a flat object of strings is refused', () => {
  assert.throws(() => values('[]'), Refused);
  assert.throws(() => values('{"k": 1}'), /k/);
  assert.throws(() => values('{"k": {"a": "b"}}'), /k/);
});

test('a write puts one override in, sorted, with a trailing newline', () => {
  const bytes = write('{}\n', read(), 'PLATE_LIGHT.EXPOSURE_TARGET', '0.41');
  assert.equal(bytes, '{\n  "PLATE_LIGHT.EXPOSURE_TARGET": "0.41"\n}\n');
});

test('a write leaves every other override exactly where it was', () => {
  const one = write('', read(), 'picture', 'car');
  const two = write(one, read(), 'PLATE_LIGHT.EXPOSURE_TARGET', '0.41');
  assert.deepEqual(values(two), { picture: 'car', 'PLATE_LIGHT.EXPOSURE_TARGET': '0.41' });
  // Sorted, so two sessions that tuned the same two numbers wrote the same file.
  assert.equal(Object.keys(JSON.parse(two))[0], 'PLATE_LIGHT.EXPOSURE_TARGET');
});

test('a value put back to the recipe’s default loses its line rather than repeating it', () => {
  const moved = write('', read(), 'picture', 'car');
  const back = write(moved, read(), 'picture', 'plate');
  assert.equal(back, '{}\n');
});

test('a write that changes nothing returns the source untouched', () => {
  const source = '{\n  "picture": "car"\n}\n';
  assert.equal(write(source, read(), 'picture', 'car'), source);
});

test('putting back what was never moved leaves NO file rather than an empty one', () => {
  // The comparison is on the overrides and not on the bytes, because the two are
  // different questions when the file does not exist yet: `{}` written to disk
  // reads in git as a Bake somebody tuned, which is exactly what this file is
  // supposed to be able to say.
  assert.equal(write('', read(), 'picture', 'plate'), '');
  assert.equal(write('', read(), 'PLATE_LIGHT.SHADOW', '#b8b8b8'), '');
});

test('a key the recipe does not declare is refused, and the refusal says what is there', () => {
  assert.throws(() => write('', read(), 'PLATE_DARK.SHADOW', '#000'), /PLATE_LIGHT.SHADOW/);
});

test('a value that is not a string is refused', () => {
  assert.throws(() => write('', read(), 'picture', 4), Refused);
  assert.throws(() => write('', read(), 'picture', null), Refused);
});

test('a value outside a parameter’s options is refused rather than passed on', () => {
  assert.throws(() => write('', read(), 'picture', 'moon'), /plate, car, eye/);
});

test('a value that is not a number is refused where the default was one', () => {
  assert.throws(() => write('', read(), 'PLATE_LIGHT.EXPOSURE_TARGET', 'quite bright'), /number/);
});

test('a parameter that opens EMPTY still takes only a number when it declares a range', () => {
  // Several of the plinth's parameters open empty on purpose — empty is what
  // makes add-stone.py fall back to the style's own answer — so "the default is
  // a number" cannot be the whole test. A declared range is the recipe saying
  // what kind of thing may go in instead.
  const optional = recipe(
    JSON.stringify({
      title: 'x',
      run: ['python', 'x.py'],
      groups: [
        { name: 'a', params: [{ key: 'scale', value: '', arg: '--scale', min: 0.1, max: 3, step: 0.01 }] },
      ],
    }),
  );
  assert.throws(() => write('', optional, 'scale', 'a bit bigger'), /number/);
  assert.deepEqual(values(write('', optional, 'scale', '0.42')), { scale: '0.42' });
  // ...and putting it back empties it again, which is the flag not being passed.
  assert.equal(write(write('', optional, 'scale', '0.42'), optional, 'scale', ''), '{}\n');
});

test('a value carrying a control character is refused — it reaches a command line', () => {
  assert.throws(() => write('', read(), 'source', 'photos/a\nb.rw2'), /control/);
});

test('an empty value is refused', () => {
  assert.throws(() => write('', read(), 'source', '   '), Refused);
});

// ---------------------------------------------------------------------------
// What the generator is actually run with
// ---------------------------------------------------------------------------

test('the effective values are the recipe’s defaults with the overrides over them', () => {
  const now = effective(read(), values('{"picture": "car"}'));
  assert.equal(now.picture, 'car');
  assert.equal(now.source, 'photos/dome.rw2');
  assert.equal(now['PLATE_LIGHT.EXPOSURE_TARGET'], '0.34');
});

test('an override of a key the recipe dropped is ignored rather than passed on', () => {
  const now = effective(read(), { gone: 'x' });
  assert.equal(now.gone, undefined);
});

test('moved says which parameters are not at their default', () => {
  assert.deepEqual(moved(read(), { picture: 'car' }), ['picture']);
  assert.deepEqual(moved(read(), { picture: 'plate' }), []);
});

test('a placeholder in the run is filled from the effective value', () => {
  const now = effective(read(), { picture: 'eye' });
  assert.deepEqual(command(read(), now), [
    'python',
    'design/plate/build-plate.py',
    'photos/dome.rw2',
    'eye',
  ]);
});

test('a placeholder naming no parameter is refused — nothing is run half-addressed', () => {
  const wrong = recipe(
    JSON.stringify({
      title: 'x',
      run: ['python', 'x.py', '{nope}'],
      groups: [{ name: 'a', params: [{ key: 'k', value: '1' }] }],
    }),
  );
  assert.throws(() => command(wrong, effective(wrong, {})), /nope/);
});

test('a parameter declared as a flag becomes one, and an empty one is left off', () => {
  const flagged = recipe(
    JSON.stringify({
      title: 'x',
      run: ['python', 'x.py'],
      groups: [
        {
          name: 'a',
          params: [
            { key: 'scale', value: '0.84', arg: '--scale' },
            { key: 'title', value: '', arg: '--title' },
            { key: 'crack', value: 'no', arg: '--crack', when: 'yes' },
            { key: 'room', value: 'flat', arg: '--room' },
          ],
        },
      ],
    }),
  );
  assert.deepEqual(command(flagged, effective(flagged, {})), [
    'python',
    'x.py',
    '--scale',
    '0.84',
    '--room',
    'flat',
  ]);
  assert.deepEqual(command(flagged, effective(flagged, { crack: 'yes' })), [
    'python',
    'x.py',
    '--scale',
    '0.84',
    '--crack',
    '--room',
    'flat',
  ]);
});

test('a flag that takes two numbers gets two argv words and not one', () => {
  // `add-stone.py --bump 0.22 0.00035` is argparse's nargs=2, so the control
  // holds two words and they arrive as two arguments.
  const paired = recipe(
    JSON.stringify({
      title: 'x',
      run: ['python', 'x.py'],
      groups: [
        {
          name: 'a',
          params: [
            { key: 'bump', value: '0.22 0.00035', arg: '--bump', words: true },
            { key: 'name', value: 'a stone', arg: '--name' },
          ],
        },
      ],
    }),
  );
  assert.deepEqual(command(paired, effective(paired, {})), [
    'python',
    'x.py',
    '--bump',
    '0.22',
    '0.00035',
    // Not split, because it did not ask to be: a value with a space in it is one
    // argument unless the flag says otherwise.
    '--name',
    'a stone',
  ]);
});

test('words without a flag is refused — nothing else is split', () => {
  const wrong = JSON.stringify({
    title: 'x',
    run: ['python', 'x.py'],
    groups: [{ name: 'a', params: [{ key: 'k', value: '1 2', words: true }] }],
  });
  assert.throws(() => recipe(wrong), /words/);
});

test('a parameter that is neither a placeholder nor a flag reaches the file and not the argv', () => {
  const now = effective(read(), {});
  const argv = command(read(), now);
  assert.equal(argv.includes('0.34'), false);
});

test('an effective value with a control character in it never reaches an argv', () => {
  // Unreachable through `write`, which refuses it â this is the assertion that
  // survives a params.json edited by hand. A SPACE is deliberately not one of
  // these: nothing here goes through a shell, so an argv element holding one is a
  // path with a space in it rather than two arguments.
  const tampered = { ...effective(read(), {}), source: 'photos/' + String.fromCharCode(9) + '.rw2' };
  assert.throws(() => command(read(), tampered), /control/);
});
