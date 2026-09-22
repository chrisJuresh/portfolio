/* ============================================================================
   urls.mjs — a Variant's own assets, addressed from the sheet.

   The sheet injects a Section's variants.css into the real page as a <style>,
   so a relative url() in it would resolve against the route the page is on and
   not against src/sections/<section>/. This is the rewrite that fixes it: every
   url() that does not already say where it is gets the Section's folder put in
   front of it, and render-variants.mjs's server answers /src/ for exactly that.

   WHY IT IS A SEAM, in a folder where everything else fails loudly and at once.
   A url() this gets wrong is not an error and not a warning: the CSS parser
   drops the whole declaration it is in, and the shot comes back as a Variant
   that declared nothing. The sheet's `identical` digest says so only when the
   Variant declared nothing ELSE, so the ordinary case is a picture captioned
   like a considered direction that is a picture of bare ground. It cost a
   bisect. That is the same argument design/eater-cards/rows.mjs makes for a
   fixture, and the reason this is a module with a test beside it rather than
   six lines inside the renderer.

   THE QUOTE IS MATCHED, NOT LOOKED PAST. What this replaces was

       /url\(\s*(['"]?)(?!data:|https?:|\/)/g

   and the optional group made the lookahead worthless. On url("data:…") the
   engine took the quote, failed the lookahead on `data:`, gave the quote BACK,
   and then passed the lookahead against the `"` itself — so what reached the
   browser was url(/src/sections/<section>/"data:…"). Quoted https: URLs and
   quoted absolute paths went the same way. So the body is captured and TESTED
   as a string, rather than gated by a lookahead standing behind an optional
   group, which is a thing a regex engine is free to step around.

   AND IT RUNS TO THE MATCHING QUOTE, not to the first quote of either kind. An
   inline SVG is written with single quotes inside a double-quoted data: URI —
   that is what makes the URI quotable at all — and it carries url()s of its
   own, because `filter='url(%23grain)'` is how it reaches its own filter. A
   body that stopped at the first quote would leave the scan INSIDE the URI,
   where it finds that url() and rewrites it into a path: a picture that loads,
   draws, and is missing the only thing it was there for. Consuming one token
   whole is what keeps the scan out of it.
   ========================================================================== */

/** A url() that already says where it is — a data: URI, an origin of its own, or
 *  a path from the server root. Everything else is the Section's own file. */
const ELSEWHERE = /^(?:data:|https?:|\/)/;

/** One url() token: a body in either quote, or bare up to the paren. A function
 *  rather than a shared constant, because a `g` regex carries `lastIndex` — the
 *  argument scripts/variant-sheet.mjs's RULE() already makes, at the same cost
 *  if it is got wrong. */
const URL_TOKEN = () => /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"]*?))\s*\)/g;

/**
 * Every url() in a sheet that names one of its Section's own files, rewritten to
 * name it from the server root instead. Anything that already says where it is
 * comes back untouched, and so does `url()` with nothing in it — a declaration
 * that was already invalid is not this function's to make plausible.
 *
 * @param {string} css a Section's variants.css, with its comments already out
 * @param {string} base the Section's folder, trailing slash included
 * @returns {string}
 */
export function absoluteUrls(css, base) {
  return css.replace(URL_TOKEN(), (whole, double, single, bare) => {
    const body = double ?? single ?? bare;
    if (!body || ELSEWHERE.test(body)) return whole;
    const quote = double !== undefined ? '"' : single !== undefined ? "'" : '';
    return `url(${quote}${base}${body}${quote})`;
  });
}
