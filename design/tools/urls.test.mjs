import assert from 'node:assert/strict';
import { test } from 'node:test';
import { absoluteUrls } from './urls.mjs';

const BASE = '/src/sections/projects-panel/';
const rewrite = (css) => absoluteUrls(css, BASE);

/** The `grain` Variant's picture, inline: single quotes inside, so the URI can be
 *  wrapped in double ones, and its own url() reaching its own filter. Written
 *  here rather than read out of the Section, for the reason
 *  design/eater-cards/rows.test.mjs gives — a fixture that is the shipped
 *  declaration fails the day somebody legitimately moves it. */
const INLINE_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E" +
  "%3Cfilter id='grain'%3E%3CfeTurbulence baseFrequency='0.62' /%3E%3C/filter%3E" +
  "%3Crect width='200' height='200' filter='url(%23grain)' /%3E%3C/svg%3E";

test('a relative url() is named from the server root', () => {
  assert.equal(rewrite('url(assets/grain.svg)'), `url(${BASE}assets/grain.svg)`);
  assert.equal(rewrite("url('assets/grain.svg')"), `url('${BASE}assets/grain.svg')`);
  assert.equal(rewrite('url("assets/grain.svg")'), `url("${BASE}assets/grain.svg")`);
});

test('every url() in a declaration is rewritten, not just the first', () => {
  assert.equal(
    rewrite("background-image: url('assets/a.svg'), url(assets/b.png);"),
    `background-image: url('${BASE}assets/a.svg'), url(${BASE}assets/b.png);`,
  );
});

test('whitespace inside the parens is not part of the URL', () => {
  assert.equal(rewrite('url(  assets/grain.svg  )'), `url(${BASE}assets/grain.svg)`);
  assert.equal(rewrite("url( 'assets/grain.svg' )"), `url('${BASE}assets/grain.svg')`);
});

/* The regression. The pattern this replaced gated on a lookahead standing behind
   an OPTIONAL quote, so the engine could take the quote, fail the lookahead on
   `data:`, hand the quote back, and pass the lookahead against the quote itself.
   Each of these came out as url(/src/sections/projects-panel/"…") — invalid, so
   the CSS parser dropped the declaration and the Variant rendered as bare
   ground with nothing anywhere to say that it had. */
test('a data: URI is left alone, quoted or not', () => {
  for (const written of [
    'url(data:image/svg+xml,%3Csvg /%3E)',
    'url("data:image/svg+xml,%3Csvg /%3E")',
    "url('data:image/svg+xml,%3Csvg /%3E')",
  ]) {
    assert.equal(rewrite(written), written);
  }
});

test('an absolute URL and an absolute path are left alone, quoted or not', () => {
  for (const written of [
    'url(https://example.com/a.svg)',
    'url("https://example.com/a.svg")',
    "url('http://example.com/a.svg')",
    'url(/fonts/a.woff2)',
    'url("/fonts/a.woff2")',
    "url('/fonts/a.woff2')",
  ]) {
    assert.equal(rewrite(written), written);
  }
});

/* The other half of the same fix. A body that stopped at the first quote of
   either kind would end at the SVG's own single quote, leaving the scan inside
   the URI — where the next url() it finds is the picture's reference to its own
   filter. Rewriting that one is a picture that loads and draws nothing. */
test("a data: URI carrying a url() of its own comes back whole", () => {
  const written = `url("${INLINE_SVG}")`;
  assert.equal(rewrite(written), written);
  assert.ok(rewrite(written).includes("filter='url(%23grain)'"));
});

test('a quoted body may carry the other quote, and a paren', () => {
  assert.equal(rewrite(`url("assets/a(1).svg")`), `url("${BASE}assets/a(1).svg")`);
  assert.equal(rewrite(`url("assets/it's.svg")`), `url("${BASE}assets/it's.svg")`);
});

test('url() with nothing in it is left as it was written', () => {
  for (const written of ['url()', 'url("")', "url('')"]) {
    assert.equal(rewrite(written), written);
  }
});
