import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hex, luminance } from './colour.mjs';

test('hex spells a rasterised pixel the way the stylesheet would', () => {
  assert.equal(hex([255, 255, 255]), '#ffffff');
  assert.equal(hex([0, 0, 0]), '#000000');
  assert.equal(hex([19, 18, 17]), '#131211');
  assert.equal(hex([14, 13, 12]), '#0e0d0c');
});

test('luminance puts the two papers where the eye does', () => {
  // The endpoints ground.css declares. These are the numbers the ground Check's
  // bands are drawn around, so they are asserted here rather than trusted.
  assert.equal(luminance([255, 255, 255]), 1);
  assert.equal(luminance([0, 0, 0]), 0);
  assert.ok(luminance([19, 18, 17]) < 0.02, 'dark paper #131211 is near black');
  assert.ok(luminance([14, 13, 12]) < 0.02, 'the Turn arrives at #0e0d0c, near black');
});

test('luminance is the sRGB-linearised one, not the channel mean', () => {
  // Mid grey is 0.5 of the way up the byte range and about a fifth of the way up
  // in light. A check written against the mean would call #808080 "paper".
  const mid = luminance([128, 128, 128]);
  assert.ok(mid > 0.2 && mid < 0.24, `#808080 reads ${mid}`);
  // Green carries most of the weight, blue almost none.
  assert.ok(luminance([0, 255, 0]) > luminance([255, 0, 0]));
  assert.ok(luminance([255, 0, 0]) > luminance([0, 0, 255]));
});

test('luminance rejects anything that is not three bytes', () => {
  assert.throws(() => luminance([255, 255]), /three channels/);
  assert.throws(() => luminance([0, 0, 300]), /0-255/);
});
