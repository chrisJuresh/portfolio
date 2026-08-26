/* ============================================================================
   capture-frame.mjs — the room the Frame's titlebar needs at the top of the
   page being filmed, and the two numbers that follow from it.

   Node builtins only; nothing here is deployed (.vercelignore excludes
   design/). It holds no behaviour of its own — it is the one place the
   capture's geometry is stated, so that the origin that serves the page, the
   collector that walks it and the check that vets it cannot disagree about it.

   WHAT IT IS THE ANSWER TO
   ------------------------
   The Panel stands the clip inside a Safari-style window whose titlebar is a
   Lens — glass, at 0.75 tint — and the recording runs FLUSH to the window on
   all four sides, so the strip is OVER the top of the page rather than above
   it. ProjectsPanel.astro says why at length: with the band at zero there is a
   photograph behind the Lens instead of a flat fill, which is what the material
   is for.

   What that costs is the top of the page. The vault's floating toolbar sits
   14px down and stands 56px tall, and the titlebar covers the first 50 of
   those — so the row of controls that says this is an application rather than a
   wall of pictures was cut through the middle by the glass, and what showed
   under the strip was the bottom two pixels of a pill.

   So the page is filmed with the titlebar's height of ITS OWN GROUND above the
   toolbar. Not a bar painted over the clip, and not a lid: a margin at the top
   of the DOCUMENT, so at rest the strip has the page's ground behind it and the
   toolbar is clear of it, and the moment the clip scrolls, photographs travel
   up into that band and pass under the glass — which is the thing the Lens
   exists to do. It is white because the capture is seeded light and white is
   what the vault's own `--bg` is under `[data-theme="light"]`; no colour is
   invented here.

   WHY IT IS NOT A CHANGE TO THE VAULT
   -----------------------------------
   The margin exists because of something standing in front of the page, and
   nothing about the photo vault wants 64px of white above its toolbar. So it
   belongs to the capture, beside the two settings that are already seeded for
   the same reason — the grid is filmed stacked and light, neither of which is
   the vault's own default either. capture-origin.mjs's header has the whole of
   that argument; this is a third entry on the same list.

   WHY THE TRAVEL MOVES WITH IT, AND WHY THAT IS THE POINT
   -------------------------------------------------------
   Pushing the page down moves every tile down with it, and roll.json is the
   list of photographs the camera passes over. Its band is `[0, travel +
   height]` and its identity — `roll_digest` — is the hashes it holds in the
   order the clip meets them, so a shifted page over an unchanged travel drops
   the last row out of the band, changes the digest, and orphans a review of 84
   photographs that a person made by looking at each one.

   Moving the travel by the SAME shift is what makes that a non-event. Every
   tile's top goes up by `BAR` and so does the band's far edge, so
   `top + BAR < travel + BAR + height` is the test that was already being
   applied: the same photographs, in the same order, under the same digest. The
   clip's far end shows the same rows it always did. Which is why these two are
   one module and not two constants in two files — separating them is how the
   review quietly stops covering the clip.
   ========================================================================== */

/**
 * record's viewport, restated.
 *
 * From design/record/projects/photos-censored/project.toml, and copied here for
 * collect-roll.mjs's reason rather than parsed out of it: this is one number in
 * a file record owns the format of, and a regex over TOML that quietly finds
 * nothing is worse than a copy that can be caught going stale. What catches it
 * is roll.json, which records the geometry it was assembled at, and
 * `collect-roll.mjs --check`, which reports a roll that no longer matches.
 */
export const CAPTURE = { width: 1440, height: 900 };

/**
 * The titlebar's height in the page's own pixels — the whole of what this
 * module is derived from.
 *
 * `--projects-panel-frame-bar` is 0.034583 of the Frame's WIDTH, and the
 * recording is laid into the Frame with `object-fit: cover` from the top edge,
 * so it is scaled to the Frame's width whatever the window is: 0.034583 x 1440
 * = 49.79 page pixels of the capture, at every size the Panel is ever drawn at.
 * Measured on the built page as well as derived — the Frame came out 1271.5
 * wide with a 43.97 strip, which is 49.79 recording rows.
 *
 * A STATED NUMBER AND NOT ONE READ OUT OF tokens.css, which would be the
 * obvious move and is the wrong one. The Token is free to move; this is what
 * the clip on disk was CUT with, and a clip cannot be re-derived by reading a
 * stylesheet. Deriving it would mean the recording silently needed re-cutting
 * the moment somebody nudged the Lens — and nothing would say so, because the
 * shift and the travel would move together and the roll would still agree with
 * itself. So the direction of the check is reversed instead: the number lives
 * here, and scripts/checks/ asserts that the Frame's titlebar still fits inside
 * the clearance the clip was cut with. A Lens that grows past it fails the
 * build rather than shipping a covered toolbar.
 *
 * Rounded up rather than to nearest. The half-pixel is free and the failure it
 * buys off is the toolbar's top row being clipped.
 */
export const BAR = Math.ceil(0.034583 * CAPTURE.width);

/**
 * The vault's own margin above its toolbar, restated from photos
 * `ui/src/app.css` (`--header-top`, and `SHIPPED.headerTop` in
 * `ui/src/lib/glass.js`, which are one number written twice for the same
 * reason).
 *
 * Kept as its own term rather than folded into the sum below, because the
 * capture is not choosing where the toolbar sits: it is inserting a band ABOVE
 * a page whose own composition is unchanged. If the vault moves its margin,
 * this moves with it and the band does not.
 */
const VAULT_HEADER_TOP = 14;

/**
 * The travel roll.json was originally collected over, from
 * design/record/projects/photos-censored/actions/scroll-peek.overrides.toml as
 * it stood when the review was signed.
 *
 * Frozen, and it has to be: it is half of the arithmetic that keeps the
 * digest. The file now says `TRAVEL`, and that file's own comment points here.
 */
const ROLL_TRAVEL = 1200;

/** Where the vault's toolbar sits while it is being filmed. */
export const HEADER_TOP = VAULT_HEADER_TOP + BAR;

/**
 * How far the clip travels, and the number record is actually given.
 *
 * `ROLL_TRAVEL + BAR` rather than 1250 written out, so that the reason the two
 * are what they are survives a change to either. The header above has why they
 * cannot be moved apart.
 */
export const TRAVEL = ROLL_TRAVEL + BAR;

/** The band of the document the camera ever sees, in the page's coordinates. */
export const BAND = TRAVEL + CAPTURE.height;

/**
 * The whole of the intervention: one custom property, on the root.
 *
 * `--header-top` is the only thing that has to move. app.css pads the sheet by
 * `--header-top + --header-h + --page-top`, so the toolbar and the first row of
 * photographs come down together and the gap between them is the vault's own
 * `--page-top` — the band goes in above the composition rather than through it.
 *
 * `!important`, WHICH IS LOAD-BEARING. photos `ui/src/main.js` calls
 * `glass.apply()` before the app mounts, and that writes `--header-top` as an
 * INLINE declaration on the root element. An inline declaration outranks every
 * stylesheet rule that is not `!important`, whatever the order, so without it
 * this sheet is served, parsed, and has no effect at all — which is exactly the
 * shape of failure the rest of this folder is built to refuse: a capture that
 * runs, looks plausible, and is not the page anybody asked for. Both tools that
 * apply it read the toolbar's box back afterwards rather than trusting that it
 * landed.
 */
export const CSS =
  '/* Written by design/censor/capture-frame.mjs. See design/censor/README.md. */\n' +
  ':root {\n' +
  `  --header-top: ${HEADER_TOP}px !important;\n` +
  '}\n';

/** Where the origin serves it, and the tag that asks for it. */
export const CSS_PATH = '/__capture/frame.css';
export const LINK_TAG = `<link rel="stylesheet" href="${CSS_PATH}">`;

/**
 * The same sheet, for a tool that drives the VAULT rather than the origin.
 *
 * collect-roll.mjs walks the grid directly — the origin refuses to start
 * against a roll that has not been signed yet, so the collector cannot go
 * through it — and has to lay the same band over the page itself. Playwright's
 * `addStyleTag` builds a `<style>` element, which the vault's
 * `style-src 'self'` refuses without throwing: the sheet's `sheet` comes back
 * null and nothing applies. A CONSTRUCTED stylesheet is not inline content and
 * is allowed. README.md has both measurements.
 */
export const ADOPT = `
  (() => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(${JSON.stringify(CSS)});
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  })()
`;

/**
 * What the toolbar's own box says about whether the band is really there.
 *
 * Asked of the DOM by every tool that has a page in front of it, for the reason
 * `decks` is asked: a stylesheet that was served and did not win, or a vault
 * that has renamed the property, produces a capture that is sharp, correctly
 * framed, correctly obscured, and has its toolbar cut in half by the glass.
 * `.topbar` is the fixed row (photos `ui/src/lib/Header.svelte`); it is
 * `position: fixed` at `--header-top`, so its viewport top IS the margin.
 */
export const TOOLBAR_TOP = `
  (() => {
    const row = document.querySelector(".topbar");
    return row === null ? null : Math.round(row.getBoundingClientRect().top);
  })()
`;

/**
 * Whether a toolbar at that offset clears the titlebar, and what to say if it
 * does not. `null` means it does.
 */
export function clearance(top) {
  if (top === null) {
    return 'no .topbar on the page — the vault has renamed its fixed row, so nothing here can say whether the toolbar clears the Frame\'s titlebar. Check photos ui/src/lib/Header.svelte.';
  }
  if (top < BAR) {
    return (
      `the vault's toolbar sits ${top}px down and the Frame's titlebar covers the first ${BAR}px — ` +
      'the capture-only stylesheet did not land. Its one declaration is `!important` because ' +
      'photos ui/src/main.js writes --header-top inline; if the vault has renamed the property, ' +
      'design/censor/capture-frame.mjs is where it is stated.'
    );
  }
  return null;
}
