import { luminance } from '../lib/colour.mjs';
import { DESK, open, settle } from '../lib/page.mjs';

/**
 * The Eater Map Section's Exploded View — the thirteen things about it that break
 * without anybody noticing.
 *
 * None is aesthetic. Every Token in `src/sections/eater-map/tokens.css` may be set
 * to anything without failing most of what is here: the Slab may take any share of
 * the stage, the Cards may sit anywhere on it, and the plane may be tilted to any
 * attitude. What is asserted is a RELATIONSHIP that has to hold whatever those are
 * set to, and facts about the markup. **FIVE TOKENS THIS CHECK HAS AN OPINION
 * ABOUT**, each named where its opinion is: the rise, the three depths, and
 * `--eater-map-glass-blur`, which may be dragged anywhere except to zero — a copy
 * of the map that is not smeared is a window rather than a surface, and the whole
 * of #190 is that the Cards read as glass.
 *
 * EVERY GEOMETRY IS READ AT A MOMENT OF THE LIFT AND NOT WHEREVER THE PAGE LEFT
 * IT. The Timeline runs from flat to raised, the markup rests at raised, and what
 * a Check finds on an unheld page is whatever the scroll last drove it to —
 * mid-flight as often as not. So the Timeline is held, both ends are read inside
 * one hold, and the page is put back. `hold()` before seeking is not optional
 * here for the usual reason (scripts/checks/NOTES.md) and for one more: this
 * Section's Timeline is driven by a transport tween, and a seek without a hold is
 * scrubbed back out from under the read within a frame.
 *
 * ONE. THE CARDS ARE DRAWN AT THE SLAB'S OWN SCALE. The whole trick of this
 * Section is that a photograph and three live surfaces read as one screenshot,
 * and the only thing making that true is that the Cards are scaled by the Slab's
 * drawn width over the phone Eater was captured at. The composition derives that
 * with `tan(atan2(…))`, because CSS cannot otherwise divide one length by
 * another, and it carries a constant to fall back on. So the failure this exists
 * for is the derivation quietly going away: the fallback renders a perfectly
 * plausible screenshot, and it is a plausible screenshot at ONE window and an
 * interface floating over a map of the wrong scale at every other.
 *
 * READ WITH THE PROJECTION LIFTED, AND THAT IS #189's DOING. A Card's rect is the
 * axis-aligned bounding box of a quad projected under the plane's rotation, which
 * is not the Card's drawn width — the two agreed while the Lift's flat end was an
 * untilted screenshot, and the Slab stands at its attitude at every moment now. So
 * the plane's transform comes off for the length of one read and goes straight back
 * on. The alternative is reading `--eater-map-app-scale` off the element, which
 * would be asking the composition to confirm its own arithmetic.
 *
 * TWO WINDOWS FOR EXACTLY THAT REASON, and it is the lesson `front-screen`
 * already paid for. At DESK the constant is within a third of a per cent of the
 * derived answer, so a Check run only there passes with the derivation deleted.
 * At the short end of the band they are a quarter apart.
 *
 * TWO. THE PICTURE IS NOT PART OF THE DOCUMENT'S FURNITURE. The Cards are the
 * Eater app's own markup, so they arrive with a text field, links off to other
 * sites, buttons that do nothing here, and a restaurant's name marked up as the
 * page's top-level heading. Left alone that is thirteen tab stops in the middle
 * of the Portfolio and a restaurant in its outline — every one of them invisible
 * to a reader looking at the page and a surprise to one navigating it by keyboard
 * or by heading. `cards.ts` takes them out, and takes them out IN THE MARKUP
 * rather than in a stylesheet, which is exactly the kind of thing that is quietly
 * undone by a regeneration.
 *
 * THREE. THE LIFT LIFTS SOMETHING. Every Card's box differs between the two ends
 * of the Timeline — and NO PARTICULAR DISTANCE IS ASSERTED, because how far a
 * Card climbs is the author's and lives in a Token. `moments` already asks
 * whether a Timeline moves ANYTHING; this asks whether it moves all three, which
 * is the failure that would otherwise ship as a Card left on the map while the
 * other two came off it.
 *
 * SEVEN. THE SLAB DOES NOT MOVE, AND IT STANDS IN A PARALLEL PROJECTION (#189).
 * The two halves of the Section's headline invariant, and the author's own first
 * concern: turning onto the Section must not resize the thing being looked at. The
 * plane's projected box is read at both ends of the Lift and has to be the same
 * box, which fails the moment either angle goes back inside a `calc()` with the
 * playhead in it. And two identical PROBES — boxes this Check puts on the plane at
 * the Slab's head and foot and takes back off — have to project to the same size,
 * which is the only way to ask whether a projection converges: the head leans away
 * from the reader and the foot leans towards them, so a `perspective()` at any
 * distance anybody would compose with draws one bigger than the other. Restoring
 * the camera the Section shipped with before #189 fails it by 12%.
 *
 * EIGHT. THE THREE CARDS RISE TOGETHER, AND STILL IN THE APP'S ORDER. Each Card's
 * screen-space rise is measured against the same Card with its rise taken away, and
 * the three have to agree within a stated tolerance — which is the difference
 * between one object taken apart and three objects hanging at three heights, and is
 * the one place this Check has an opinion about a Token's VALUE rather than about a
 * relationship. Two mutations fall out of it and both are meant to: spreading the
 * depths back out to 1 / 0.62 / 0.26 fails the tolerance, and setting all three
 * equal fails the ordering underneath it. **And a floor under each rise is what
 * makes a dead drawing fail**: a depth under a parallel projection reaches the
 * screen only through the attitude, so a plane at zero attitude has three Cards
 * that climb and never move — which SEVEN's two assertions both pass.
 *
 * NINE. THE CARDS ARE GLASS, AND THEY ARE DARK (#190). Four failures in one
 * sentence, and every one of them reads as a composition rather than as a break.
 * A raised Card that is OPAQUE — which is what this Section shipped until #190,
 * because it mixed every surface towards a white plate in step with the climb, so
 * the mutation that puts the mix back fails at the raised end and passes at the
 * flat one. A search Card drawn as ONE box round its pills, which welds a component
 * the app does not have. A backdrop cut to
 * a radius somebody TYPED here — the mockup's `24 / 18 / 22` against the export's
 * own 24 / 14 / 28 — asked by reading `cards.css`'s stated number and clamping it
 * the way a browser clamps it. And a glass surface with NO EDGE, which is #197's
 * rebuild bug: the clear is per box and the host is per Card, so the second
 * surface's clear deletes the first surface's slices and the survivor looks
 * perfect.
 *
 * TEN. THE FOURTH SURFACE, AND THE TWO THINGS ITS ARRIVAL COSTS (#194). The search
 * Card draws THREE glass surfaces now — its two pills and the results dropdown hung
 * off them — and the dropdown is a surface of the search PART rather than a fifth
 * part, so the drawing is four parts across five surfaces and the leader lines are
 * unchanged.
 *
 * NOTHING IS DRAWN ON TOP OF ANYTHING, asked ON THE PLANE with the projection
 * lifted. That is the only form of the question with an answer: two rotated quads
 * can have overlapping bounding boxes and share no pixel, and two Cards at
 * different depths may legitimately be drawn over one another, which is what an
 * exploded view is. It replaces the one-axis gap this used to assert between the
 * two pills — the same claim, in two dimensions, over every pair in the drawing —
 * and it is what the rail popup moving down the Slab answers to: at the search
 * bar's own place the dropdown lands exactly where the popup stood. Read at BOTH
 * ends of the Lift, because the Cards drift by different amounts as they climb and
 * the flat arrangement is also what a reader below the band is looking at.
 *
 * AND THE DROPDOWN SHOWS THE ROWS IT WAS CAPPED TO. The panel's height is
 * `calc(var(--mobile-search-visible-results, 4) * 56px)` set INLINE on its shell by
 * the app, and a root's inline style is exactly what the app's collector strips —
 * that is where a surface's placement is written and the whole thing the export
 * drops. So a Section that lost the restatement draws the app's own FOUR rows out
 * of the bottom of a host box the export sized for two, and the overflow is
 * invisible unless somebody counts. Two assertions, and the first needs no number:
 * a scrolling surface may not be taller than the box the export sized for it.
 *
 * Beside them, two claims about the mechanism rather than about the look. The dark
 * theme has to be an OVERRIDE of names `cards.css` already publishes, or a
 * re-vendoring undoes it silently — asked of the cascade, not of the colour. And a
 * BOOSTED Card's backdrop has to be counter-scaled, asked by putting a boost on for
 * the length of one read and requiring one capture pixel to be the same size inside
 * the glass as it is on the map beside it.
 *
 * WHAT IS DELIBERATELY NOT HERE is whether any of it looks good — whether the map
 * reads through the glass, whether the smear is the right smear, whether the
 * details paragraph is comfortable on it. Those are the author's, looking.
 *
 * FOUR. NOTHING IS HIDDEN AND UNCOVERED. A reveal written the obvious way puts
 * `opacity: 0` in the stylesheet and lets the Timeline take it off — and then a
 * reader whose script never arrived gets a hole where the composition should be.
 * The Section's own boxes are checked at BOTH ends, because at the raised end
 * they are what a scriptless reader is looking at.
 *
 * FIVE. EVERY RULE IS STILL ATTACHED TO THE PART IT NAMES. The four leader lines
 * are the correspondence between the numbered points and the pieces of the
 * drawing, and each one's far end is a Card's own corner while that Card is
 * turned in three dimensions. So the failure is a rule computed from where the
 * Card's UNTRANSFORMED box is, or computed once and never again: both look right
 * at the flat end of the Lift, which is the one frame a still is most likely to
 * be taken at, and are wrong at every other. Read at THREE moments for that
 * reason — flat, half way, raised — against the anchor's own projected position,
 * which is a fact this Check reads off the page rather than one the drawing
 * hands it. An anchor that is not inside the camera passes all of that, and is
 * caught by the anchors themselves having to move between the Lift's two ends.
 *
 * AND THE CORRESPONDENCE IS COUNTED. No part without a number and no number
 * without a part: one rule per numbered point, and the parts they name are
 * exactly the parts that carry an anchor. The Content's own schema fails the
 * build on the first half of that; this is the half a schema cannot see, because
 * a part is a thing on the page rather than a string in a file.
 *
 * NO POSITION AND NO ANGLE IS ASSERTED. Which corner a rule ends on is a Token
 * and how far its shoulder runs is another; what is asserted is that the end of
 * the rule is where the anchor is and that the anchor is somewhere on the part.
 *
 * AND WHETHER AN ANCHOR IS INSIDE THE CAMERA IS ASKED OF THE MARKUP NOW. It was
 * geometry — an anchor outside the projection stands still while its part turns, so
 * both ends of the Lift found it in one place — and the SLAB's anchor stands still
 * legitimately since #189, because the Slab does. Containment is what that
 * assertion was asking all along; the movement half is kept for the three Cards,
 * which are what the Lift carries.
 *
 * SIX. BELOW THE BAND THE DRAWING HAS COLLAPSED, AND EVERY READER GETS THE SAME
 * ONE. An Exploded View is fitted to a wide window; a column has no width to
 * spend on a camera. So down there the Slab lies flat and full-bleed with the four
 * features as a list under it, and the Lift never runs (#179). Four of the five
 * things asserted about it fail invisibly — a perspective left standing on a
 * column is a drawing skewed by a degree or two, a Slab that stops short of the
 * window's edge is a composition rather than a fault, a Card at the wrong scale
 * is a plausible screenshot of another phone, and a Lift still running is a phone
 * quietly tilting itself under a column. THE LAST IS THE ONE #179 IS ABOUT: the narrow reader, the reader
 * who asked for no motion and the reader whose scripts never arrived are handed
 * the same composition, and that is asserted as an EQUALITY between the three
 * rather than as three separate descriptions — which is what stops a fourth
 * arrangement growing under one of them.
 *
 * TEN. PROJECTS STANDS IN THE GALLERY'S OWN BOX, AND THE TWO ARE COMPARED (#191).
 * The Section's masthead is the word the reader met on the Panel, and the claim
 * the recomposition makes is that turning the page does not move it. So both
 * mastheads are read at their own Section's RESTING PLACE — the box within the
 * Section plus that Section's `scroll-margin-top`, which is what a snap target's
 * margin means and is what the Panel spends its whole lift on — and compared.
 * NOTHING IS TYPED: the ticket quotes six measurements off the live page and this
 * asserts the relationship they are measurements of, so the day the landing
 * measure moves both move together and this still passes. The INK is compared as
 * well as the box, because both mastheads are blocks filling their own grid areas
 * and their rect widths are columns rather than words: a Range over the contents
 * is the one number a font size, a weight and a tracking all reach.
 *
 * ELEVEN. THE TITLE'S TWO RATIOS ARE BETWEEN CAP HEIGHTS, AND A TYPED FONT SIZE FAILS
 * THEM. The serif title's cap is a share of PROJECTS' cap and its first cap top a
 * number of PROJECTS cap-heights below the masthead's baseline — both measured off
 * the two faces' real ink at runtime, because a grotesque draws 0.70 of its em as
 * cap and this serif 0.67, so the obvious stylesheet spelling lands 4.3% low. Both
 * are read here the way `title.ts` writes them: the cap at a reference size and
 * scaled, which is the ink without the rasteriser's grid, and the baseline off a
 * zero-sized inline-block. **AND THE COMPOSITION AROUND THEM IS ASSERTED TOO** —
 * the copy at the FOOT of the column PROJECTS heads, the four Points to the RIGHT
 * of the drawing, and the writing to its left. Each of those is a `grid-area` that
 * a Variant may move and the shipped page may not.
 *
 * AND EVERY RULE ENDS IN A LIT DOT ON ITS PART, checked at each of the three
 * moments beside the rule it belongs to. Three ways for a dot to be wrong and each
 * fails separately: not drawn at all — an SVG circle with no centre sits at the
 * overlay's origin, and the radius is gated on the centre precisely so a
 * scriptless reader gets nothing rather than four dots in the corner — drawn away
 * from the terminus, or drawn with no radius or in a colour that rasterises to
 * nothing, which is a dot that is there and invisible.
 *
 * WHAT IS NOT HERE. That the Cards render at all, that the map is the right map,
 * that the tilt is a good tilt, and that any of it looks right: a person opening
 * the page sees all four. And the Slab's bytes — `assets` already asserts that
 * everything the page fetches arrives, and how EARLY a lazy image is fetched is
 * Chromium's own distance policy rather than this page's. NOTES.md in the Section
 * says what was measured.
 */

/** Inside the band, and the window every other Check reads. */
const WIDE = DESK;

/** The short corner of the band. The derived scale here is about 0.56 against
 *  DESK's 0.72, which is what makes a constant impossible to hide at both. */
const SHORT = { width: 1100, height: 700 };

/** Below the band, and a phone rather than a number chosen to be under it: the
 *  collapse exists for a reader holding one, and 390 is the window Eater itself
 *  was captured at. Nothing about the number is asserted — every assertion down
 *  there is a relationship or a fact about the markup. */
const NARROW = { width: 390, height: 844 };

/** How far the full-bleed Slab may miss the window's edges by, in px. Tight,
 *  because the two ways of getting this wrong — `100vw` where a scrollbar has a
 *  gutter, and a margin that does not spend the whole of the page's — both miss
 *  by the width of something rather than by a rounding. */
const BLEED_TOLERANCE = 0.5;

/** How far the three readers' compositions may differ, in px. They are the same
 *  stylesheet answering the same window, so this is subpixel rounding and not an
 *  allowance for a difference. */
const SAME_TOLERANCE = 1;

/** The Cards are laid out in whole pixels and the rects are subpixel, so this is
 *  loose enough for rounding and nowhere near loose enough to swallow a fallback
 *  standing in for the derivation. As a share of the scale. */
const SCALE_TOLERANCE = 0.005;

/** What counts as a Card having moved between the two ends of the Lift, in px.
 *  A floor on this Check's own honesty rather than a distance it asserts: without
 *  one, two rects that differ by a rounding read as a Card that climbed. */
const MOVED = 0.5;

/** How far out of the Section the reader is walked, a pixel per frame, before the
 *  turn back is finished with a jump. Wide enough to cross wherever the Lift is
 *  armed — which is just above the resting place, and is the only place the
 *  question "has the reader left" can be answered wrongly. */
const CREEP = 12;

/** Everything the browser will let a reader focus, and the query cards.ts is
 *  written against. `[tabindex]` catches one added by hand later. */
const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex], [contenteditable]';

/** How far a leader line's end may sit from the corner it is drawn to, in px.
 *  The two are read one after the other out of one layout, so this is rounding
 *  and nothing else — measured at a hundredth of a pixel — and it is nowhere near
 *  loose enough to swallow a rule drawn to an untransformed box, which is tens of
 *  pixels out at the first degree of tilt. */
const ATTACHED = 1;

/** How far outside its part's own box an anchor may sit, in px. A point inside
 *  the unit square of a rotated Card is inside that Card's bounding box by
 *  convexity, whatever the two placement Tokens are set to — so this is rounding
 *  again, and the failure it names is an anchor that is not on the part at all. */
const ON_THE_PART = 1;

/** The moment between the two ends, where a rule drawn once and never again is
 *  wrong and a still of either end would not say so. */
const HALF_WAY = 0.5;

/** How far the Slab's projected box may move between the two ends of the Lift, in
 *  px. Rounding and nothing else: it is one element under one constant transform
 *  read twice out of the same layout, so the two answers are the same number or
 *  the attitude is a term of the playhead again (#189). */
const STILL = 0.5;

/** The two probes' size, in px, and how far their projected boxes may differ as a
 *  share of the larger.
 *
 *  A PROBE IS A BOX THIS CHECK PUTS ON THE PLANE AND TAKES BACK OFF, which is the
 *  only way to ask whether a projection converges: two identical boxes at opposite
 *  ends of the Slab project to the same size under a parallel projection and to
 *  different sizes under any camera standing at a finite distance. Measured with
 *  the composition's own camera restored, the two differed by 12% at DESK — so
 *  this tolerance is antialiasing on two rects and nowhere near loose enough to
 *  swallow a `perspective()` anybody would compose with. */
const PROBE = 40;
const PARALLEL = 0.01;

/** How far the three Cards' screen-space rises may differ, as a share of the
 *  largest, and the floor under each one in px.
 *
 *  THE FIRST IS THE ONE OPINION THIS CHECK HAS ABOUT THREE TOKENS, and it is
 *  #189's own: the three Cards RISE TOGETHER, so the drawing reads as one object
 *  taken apart rather than as three objects hanging at three heights. The depths
 *  that shipped before it were 1 / 0.62 / 0.26, which is 74% apart; 1 / 0.94 /
 *  0.88 is 12%. The author may move all three and may reorder nothing.
 *
 *  THE SECOND IS WHAT MAKES A DEAD DRAWING FAIL. A rise is a translation along the
 *  plane's own normal, and under a parallel projection a normal pointing at the
 *  reader projects to nothing at all — so a plane at zero attitude has three Cards
 *  that climb and never move, which is the Exploded View switched off while every
 *  other assertion here passes. */
const TOGETHER = 0.2;
const RISEN = 1;

/**
 * How far along a corner's own PLAN radius the page is sampled for an open corner,
 * as a share of it, measured outwards from the corner's arc centre.
 *
 * HALF, BECAUSE THAT IS THE MIDDLE OF THE NOTCH. The region a hinged wall would
 * leave empty runs from the corner's centre out to a full radius along the
 * diagonal, so half a radius is as far from both boundaries as it is possible to
 * stand — about 5.8px at DESK. Measured at both windows: every corner finds a
 * slice at 0.3 through 1.0, and 1.6 — which puts the probe outside the Slab's own
 * outline — reads three of the four as open at each. Three and not four because a
 * Card stands over the fourth, which is the same reason `covered` asks the whole
 * stack rather than the topmost. That failure is what says this assertion can
 * still fail, and it was run rather than assumed.
 *
 * THE PLAN RADIUS, AND SINCE #200 THAT IS NOT `min(radius, thickness)`. The share
 * is unchanged and so is the point it names; what changed is which Token it is a
 * share OF. While one Token was the plan corner and the fillet at once the clamp
 * was invisible here, because the two were the same number; split, clamping would
 * stand the probe half a WALL out from a corner that is half as round again as the
 * wall is deep, which is a point chosen against a solid neither stage draws.
 *
 * AND IT IS THE FULL PERIMETER THIS ASKS ABOUT, NOT THE FILLET. Every wall slice
 * is a whole rounded rect at the outline, so the stack covers the corner from the
 * arc centre right out to the plan radius and a probe anywhere inside that is
 * covered. That is the assertion: four hinged walls, each inset by the radius,
 * leave the quarter-disc empty and fail at every one of these positions.
 */
const AT_THE_CORNER = 0.5;

/**
 * How different two of an edge's sides have to be to count as differently lit, as
 * a share of the brighter — and the same margin the Slab's foot has to beat its
 * right flank by. In WCAG luminance, which is what `lib/colour.mjs` turns three
 * channels into.
 *
 * Measured 56.6% on the Slab, which is 60.7% before #200 split the plan corner
 * from the fillet: a shallower roll spends less of the perimeter facing the
 * reader, so the four sides sit further apart in the wall and closer together
 * across the sweep. The mutation this floor exists for — the lateral normal
 * dropped, which is what the code did before #197 — measures exactly 0, so the
 * number only has to be off the floor rather than tuned.
 */
const DIRECTED = 0.05;

/**
 * How far apart on SCREEN a surface's shallowest and deepest wall slices have to
 * land, in CSS px, for its thickness to be a thickness at all.
 *
 * THE ONE THING THE GROUP ABOVE CANNOT SEE. Every assertion beside this one reads
 * the gradients a slice was BUILT with, and an edge can be built perfectly and then
 * painted flat underneath its own face: that is what shipped for three tickets,
 * because `.eater-map__card` was `transform-style: flat`, so every slice's
 * `translateZ` was discarded and all twenty-four of a Card's landed on one rect.
 * The Cards read as decals and the whole group here went on passing (#203).
 *
 * TWO SLICES OF THE SAME BOX AT TWO DEPTHS, which is what makes this a measurement
 * of the rendering context and of nothing else: both wall slices are at inset 0, so
 * they differ by their `translateZ` and by nothing at all besides. Under a
 * `preserve-3d` chain they project apart; under a flat one they are pixel-identical.
 *
 * Measured 1.11px on every Card surface and 5.34px on the Slab; the mutation this
 * floor exists for — the Card forced back to `flat` — measures EXACTLY 0 on the
 * Cards and leaves the Slab untouched at 5.34, which is the Slab's slices being the
 * `preserve-3d` plane's own children and never having had the fault. So the number
 * only has to be off zero rather than tuned.
 */
const OFF_THE_FACE = 0.25;

/**
 * How much of the Slab's plan corner has to survive into the INNERMOST ring of its
 * fillet, as a share of the corner itself.
 *
 * THIS IS THE ASSERTION THAT KEEPS #200's SPLIT SPLIT. Every slice is cut to
 * `plan corner - its own inset` and the fillet's insets run out to the fillet, so
 * the two Tokens collapsing back onto one number — a plan corner dragged down to
 * the fillet, or a fillet dragged up to the corner — takes the innermost ring's
 * radius to nothing. The roll then goes square exactly AT THE CORNERS, where the
 * normal turns through ninety degrees in one step, and the hard light/dark break
 * that produces runs round the object like a strap. That shipped, and it was
 * reported as the Slab looking "strongly wrapped around" rather than as a corner.
 *
 * A QUARTER, against 0.67 drawn and 0.098 for the collapse. The Slab is 16.3px of
 * plan corner and 5.4px of the fillet's deepest inset, so the innermost ring keeps
 * 10.9px; with the two Tokens equal it keeps 0.7px of 7.2px, which is the state
 * this Section shipped in. There is a lot of room between those, so the floor only
 * has to sit in it rather than be tuned.
 *
 * AND IT READS THE SLICES AND NOT THE TOKENS, which is the opposite source from the
 * corner probe below and for the opposite reason. That probe asks WHERE the
 * composition says its corner is, so reading an element would let a slice drawn to
 * the wrong outline move the sample onto itself and pass. This asks what the stack
 * actually drew, and the two radii it compares are two elements of the same stack —
 * so the Tokens are exactly what it must not be told.
 */
const CORNER_SURVIVES = 0.25;

/**
 * The largest step between two consecutive stops, as a share of the whole
 * gradient's spread.
 *
 * Measured 22.4% on the Slab. With the corner sweeps taken out the largest step IS
 * the whole spread and it measures 100%, so half is well clear of both.
 */
const CONTINUOUS = 0.5;

/** How close two stops' angles have to be to count as the SAME angle, in degrees.
 *  `edge.ts` writes them at two decimal places, so two coincident points come back
 *  identical and this is only guarding the comparison. */
const SAME_ANGLE = 0.005;

/** Something the edge is definitely not, for asking whether the Token is live
 *  inside the gradient. Any colour would do; a saturated one is unmistakable in a
 *  screenshot if the restore ever fails. */
const MUTANT_EDGE = '#ff0000';

/**
 * A light pointed somewhere the composition's is not, for asking whether a page
 * with no Editor rebuilds its edge (#196).
 *
 * The azimuth turned half a turn, which is the one mutation the group above
 * already measures the effect of: it swaps which of the two flanks facing the
 * reader is the brighter, so a rebuild that DID happen changes every gradient on
 * the page rather than a stop or two.
 */
const MUTANT_LIGHT = '135deg';

/** The two renderers `src/sections/eater-map/stage.ts` will admit to being, so a
 *  stage that never mounted can be told from the one this suite was asked to
 *  compare against. Written out rather than lifted from that module, for the reason
 *  `lib/page.mjs` lifts `THEME_KEY` and cannot here: this is a `.mjs` script and
 *  Node will not import a `.ts` one. A rename shows up as this Check reporting that
 *  the Exploded View never came up. */
const STAGES = ['dom', 'webgl'];

/**
 * How many glass surfaces each Card draws — `cards.ts`'s own list written a second
 * time, for the same reason the stack order below it is: this file cannot import
 * that one, and a MISSED NAME HAS TO BE A FAILURE rather than a skip.
 *
 * THREE FOR THE SEARCH CARD IS THE WHOLE OF IT. Its `.topbar` holds two separate
 * pills with an 8px gap between them, and one backdrop and one extrusion round the
 * pair weld them into a single long component with two buttons stuck on the end,
 * which is not an interface the app has. The third is the results dropdown #194
 * hung off the bar — a SURFACE of the search part and not a fifth part, because
 * there are four numbered points and the dropdown is what point 01 is already
 * about. So: FOUR PARTS ACROSS FIVE SURFACES, and a build that draws one box round
 * any of the search Card's three fails this and fails the overlap below it too.
 */
const SURFACES = { search: 3, lines: 1, details: 1 };

/** The hung surface, and how many rows of it the drawing shows.
 *
 *  `design/eater-cards/config.json`'s `results.rows` is where that number is
 *  chosen and the manifest is what carries it to the Section; this is it written a
 *  third time, on purpose and for the reason `SURFACES` is written twice — a Check
 *  that read the number off the page it is checking would assert that the panel
 *  shows as many rows as it shows.
 *
 *  WHAT IT CATCHES is the one thing the app's own collector cannot carry: the
 *  panel's height is `calc(var(--mobile-search-visible-results, 4) * 56px)` set
 *  INLINE on its shell, a root's inline style is what the export strips, and a
 *  Section that lost the restatement would draw FOUR rows inside a host box sized
 *  for two — which reads as a composition rather than as a break. */
const DROPDOWN = 'search .results-panel';
const ROWS = 2;

/** How far two glass surfaces may come to each other ON THE PLANE before they are
 *  the same surface, in drawn px. Zero would be the claim; this is the rounding
 *  two rects read out of one layout carry. */
const APART = 0.5;

/** How far a drawn backdrop's corner may sit from the corner `cards.css` states
 *  for the surface it is drawn round, in px. The two are the same number read two
 *  ways — the stylesheet's own, clamped the way a browser clamps it — so this is
 *  the integer rounding `offsetWidth` does and nothing else. A radius TYPED in this
 *  repository is out by tens of pixels: the mockup's `24 / 18 / 22` against the
 *  export's 24 / 14 / 28. */
const RADIUS = 0.5;

/** The widest disagreement between two sets of four corners, in px — the shape
 *  both radius questions below take. `-Infinity` on an empty pair rather than 0,
 *  so "there was nothing to compare" reaches its own branch instead of reading as
 *  a match; both callers ask `Number.isFinite` first for that reason.
 *
 *  @param {number[]} drawn @param {number[]} against */
const furthest = (drawn, against) =>
  Math.max(...drawn.map((r, index) => Math.abs(r - against[index])));

/** How far the map seen THROUGH a Card's glass may differ in size from the map
 *  beside it, as a share of the Slab's own drawn width. A Card's backdrop is one
 *  division away from being the wrong size, and this is that division asserted. */
const SAME_MAP = 0.005;

/** A boost to put on the Cards for the length of one read, so that the
 *  counter-scale is exercised rather than merely present. #187 adopts 1.10 for the
 *  rail popup; any number that is not 1 asks the same question. */
const BOOSTED = 1.1;
/** How far PROJECTS may stand from where the Gallery's own masthead stands, in
 *  px, measured at each Section's resting place.
 *
 *  THE WHOLE POINT IS THAT NO NUMBER IS TYPED HERE (#191). The Eater Map's
 *  masthead is the same word in the same face at the same size as the Projects
 *  Panel's, standing at the same place on the screen — so this Check reads BOTH
 *  and compares them, and the acceptance criterion is an equality rather than the
 *  six measurements the ticket happens to quote. A pixel is the two Sections'
 *  own sub-pixel rounding: measured, they differ by 0.02px at 1600x900, and the
 *  mutation that takes the Section back off the landing measure misses by 33px
 *  down and 33px across. */
const GALLERY = 1;

/** How far the title's two ratios may sit from the Tokens that state them, as a
 *  share of each.
 *
 *  TIGHT ENOUGH THAT A TYPED FONT SIZE FAILS, which is what the acceptance
 *  criterion asks for. The masthead's grotesque draws 0.7006 of its em as cap and
 *  the title's serif 0.6702, so `font-size: calc(0.566 * <the masthead>)` — the
 *  obvious stylesheet spelling, and the one the Section falls back to with no
 *  script — lands the cap ratio at 0.5414, which is 4.3% low. Both faces' ink is
 *  measured at a reference size and scaled, so what is left on this side is
 *  arithmetic rather than the rasteriser's grid: measured at four windows across
 *  the band, both ratios came back exact to three figures. */
const RATIO = 0.02;

/** How far the copy's foot may sit from the foot of the column it is at the
 *  foot OF, in px. The two are the same grid area, one end-aligned; this is
 *  rounding. */
const FOOT = 1;

async function atWindow(browser, origin, viewport) {
  const { context, page } = await open(browser, origin, { viewport });
  try {
    const failures = (await settle(page)).map((why) => `${viewport.width}x${viewport.height}: ${why}`);

    const seen = await page.evaluate(async ({ focusable, onThePart, halfWay, probe, boosted }) => {
      const slab = document.querySelector('.eater-map__slab');
      if (!slab) return { missing: 'no .eater-map__slab on the page' };
      const section = document.querySelector('.eater-map');
      if (!section) return { missing: 'no .eater-map on the page' };
      const kernel = window.portfolio;
      const lift = kernel?.timelines.get('eater-map');
      if (!lift) {
        const have = [...(kernel?.timelines.keys() ?? [])];
        return {
          missing:
            'no Timeline is registered as "eater-map", so the Exploded View has no flat end to be' +
            ` read at — registered: ${have.length ? have.join(', ') : '(none)'}`,
        };
      }

      const round = (n) => Math.round(n * 100) / 100;
      const cardBoxes = () =>
        [...document.querySelectorAll('[data-eater-card]')].map((card) => {
          const box = card.getBoundingClientRect();
          return {
            name: card.getAttribute('data-eater-card') ?? '(unnamed)',
            // The rect is the TRANSFORMED box and the computed width is the one
            // the vendored stylesheet froze it to, so their ratio is the scale
            // actually applied — which is the thing being asserted, rather than
            // the property it happens to be written in.
            drawn: round(box.width),
            height: round(box.height),
            x: round(box.x),
            y: round(box.y),
            declared: Number.parseFloat(getComputedStyle(card).width),
          };
        });

      // WHICH ELEMENT EACH POINT NAMES. Three of the four are Cards and the
      // fourth is the picture itself, and knowing that here is the point: it is
      // the claim being checked rather than something the drawing hands over.
      const partNamed = (part) =>
        part === 'slab'
          ? document.querySelector('.eater-map__plane')
          : document.querySelector(`[data-eater-map-card="${part}"]`);

      // A COLOUR, RASTERISED RATHER THAN COMPARED AS A SPELLING, and read for its
      // ALPHA rather than for its channels: what is asserted about a dot is that
      // it PAINTS, and a `fill` that computes to a fully transparent colour is a
      // dot that is drawn and invisible. `ground` reads the page's ground the same
      // way and says why a spelling is not a colour.
      const paint = (() => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const ink = canvas.getContext('2d');
        return (colour) => {
          if (!ink || !colour || colour === 'none') return null;
          ink.clearRect(0, 0, 1, 1);
          ink.fillStyle = colour;
          ink.fillRect(0, 0, 1, 1);
          return ink.getImageData(0, 0, 1, 1).data[3];
        };
      })();

      /** One of the two dots on a rule: where it is, how big, and whether it
       *  paints. `r` is read computed, because the radius is a Token spent by the
       *  stylesheet and the attribute is never set. */
      const dot = (element, frame) => {
        if (!element) return null;
        const style = getComputedStyle(element);
        const has = element.hasAttribute('cx');
        const box = element.getBoundingClientRect();
        return {
          drawn: has,
          x: has ? round(box.left + box.width / 2 - frame.left) : null,
          y: has ? round(box.top + box.height / 2 - frame.top) : null,
          r: Number.parseFloat(style.r),
          alpha: paint(style.fill),
        };
      };

      const overlay = document.querySelector('[data-eater-map-leaders]');
      const rules = () => {
        if (!overlay) return [];
        const frame = overlay.getBoundingClientRect();
        return [...overlay.querySelectorAll('[data-eater-map-leader]')].map((line) => {
          const part = line.getAttribute('data-eater-map-leader') ?? '(unnamed)';
          const anchor = document.querySelector(`[data-eater-map-anchor="${part}"]`);
          const hook = document.querySelector(`[data-eater-map-hook="${part}"]`);
          const on = partNamed(part);
          const tip = dot(overlay.querySelector(`[data-eater-map-tip="${part}"]`), frame);
          const knee = dot(overlay.querySelector(`[data-eater-map-knee="${part}"]`), frame);
          // The drawn geometry, exactly as the overlay carries it.
          const drawn = (line.getAttribute('points') ?? '')
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .map((pair) => pair.split(',').map(Number));
          // A zero-sized box inside the camera projects to a POINT, so this rect
          // IS the corner's position on screen — which is the whole difference
          // between the anchor and the Card's own axis-aligned bounding box.
          const at = anchor?.getBoundingClientRect();
          const box = on?.getBoundingClientRect();
          return {
            part,
            drawn,
            tip,
            knee,
            anchor: at ? { x: round(at.left - frame.left), y: round(at.top - frame.top) } : null,
            hookY: hook ? round(hook.getBoundingClientRect().top - frame.top) : null,
            named: Boolean(on),
            sits:
              at && box
                ? at.left >= box.left - onThePart &&
                  at.left <= box.right + onThePart &&
                  at.top >= box.top - onThePart &&
                  at.top <= box.bottom + onThePart
                : null,
          };
        });
      };

      // Only the boxes this Section drew. The Eater app's own markup may hide
      // whatever it likes inside a Card — that is another repository's decision
      // about its own interface, and this is a claim about the Portfolio's.
      const invisible = () =>
        [...document.querySelectorAll('.eater-map__stage [class*="eater-map__"]')]
          .filter((element) => {
            const style = getComputedStyle(element);
            return Number.parseFloat(style.opacity) === 0 || style.visibility === 'hidden';
          })
          .map((element) => element.className);

      // NAMED RATHER THAN DEREFERENCED, for the reason the Slab and the Timeline
      // are above and every box in `collapsedBelowTheBand` is: a renamed box
      // otherwise makes this Check reject with `Cannot read properties of null`
      // out of an `evaluate`, which fails the run and says nothing about why.
      const plane = document.querySelector('.eater-map__plane');
      const cardHost = document.querySelector('.eater-map__cards');
      if (!plane || !cardHost) {
        return {
          missing:
            'the Exploded View has no ' +
            (plane ? '.eater-map__cards' : '.eater-map__plane') +
            ', so nothing about the projection, the Slab standing still or the ' +
            "Cards' rise could be read",
        };
      }

      /** The Slab's own projected box, which #189 asks to be the same at both ends
       *  of the Lift. The plane is the picture's box exactly — `inset: 0` on the
       *  Slab — so this rect IS the drawing's outline under the projection. */
      const planeBox = () => {
        const box = plane.getBoundingClientRect();
        return { x: round(box.x), y: round(box.y), w: round(box.width), h: round(box.height) };
      };

      /** TWO IDENTICAL BOXES AT OPPOSITE ENDS OF THE SLAB, projected. Put on the
       *  plane and taken back off inside one read, because a probe is a question
       *  and not part of the composition — and put on `.eater-map__cards`, which is
       *  the box inside the projection whose own transform is nothing, so what
       *  moves them is the plane's projection and nothing else.
       *
       *  THE TILT IS WHAT MAKES THIS THE RIGHT PAIR: the head of the Slab leans
       *  away from the reader and the foot leans towards them, so under a camera at
       *  a finite distance these two are at different distances from the lens and
       *  are drawn at different sizes. `top: 100%` puts the second one just PAST
       *  the foot rather than on it — its own height below the Slab's bottom edge —
       *  which is further along the same axis and so a wider separation, not a
       *  different question. Under a parallel projection they are
       *  congruent, and `getBoundingClientRect` on a rotated box is the projected
       *  quad's axis-aligned bounding box — which is the same box for two congruent
       *  quads wherever they stand. */
      const probes = () => {
        const at = (top) => {
          const box = document.createElement('div');
          box.style.cssText =
            `position:absolute;left:50%;top:${top}%;width:${probe}px;height:${probe}px;` +
            'pointer-events:none;visibility:hidden';
          cardHost.append(box);
          const rect = box.getBoundingClientRect();
          box.remove();
          return { w: round(rect.width), h: round(rect.height) };
        };
        return { head: at(0), foot: at(100) };
      };

      /** Each Card's SCREEN-SPACE RISE off the plane, in px.
       *
       *  Measured against the same Card with its rise taken away rather than
       *  against a second element, so what is being read is the Card the reader is
       *  looking at. `--eater-map-card-rise` is the derived length the transform
       *  spends, so setting it to 0 removes the depth and leaves the along-plane
       *  slide standing — which is the difference between "how far did it come off
       *  the map" and "where did it end up".
       *
       *  OFF THE ANCHOR AND NOT OFF THE CARD'S OWN RECT, for the reason the leader
       *  lines are: a zero-sized box projects to a POINT, and the bounding box of a
       *  projected quad moves by a different amount from the quad itself. */
      const rises = () =>
        [...document.querySelectorAll('.eater-map__card')].map((card) => {
          const anchor = card.querySelector('.eater-map__anchor');
          const name = card.getAttribute('data-eater-map-card') ?? '(unnamed)';
          if (!anchor) return { name, rise: null };
          const up = anchor.getBoundingClientRect();
          const held = card.style.getPropertyValue('--eater-map-card-rise');
          card.style.setProperty('--eater-map-card-rise', '0');
          const down = anchor.getBoundingClientRect();
          if (held) card.style.setProperty('--eater-map-card-rise', held);
          else card.style.removeProperty('--eater-map-card-rise');
          return { name, rise: round(Math.hypot(up.x - down.x, up.y - down.y)) };
        });

      /**
       * A serialised colour, as how much light it puts on this page and how much of
       * what is behind it it lets through.
       *
       * COMPOSITED OVER BLACK, and the alpha is what makes that the right question
       * rather than a convenience. The details sheet is `rgba(255, 255, 255, 0.045)`
       * — a WHITE wash at four per cent, which is the darkest of the three surfaces
       * and the lightest of them read as a bare hex. What a surface contributes to
       * this page is its colour times its alpha, because the page under it is a
       * near-black map; ignoring the alpha reports the float sheet as a white panel
       * and it is very nearly a hole.
       */
      const colour = (serialised) => {
        const parts = (serialised.match(/[\d.]+/g) ?? []).map(Number);
        if (parts.length < 3) return null;
        const alpha = parts.length > 3 ? parts[3] : 1;
        const channel = (v) => {
          const s = (v / 255) * alpha;
          return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        };
        return {
          lit: 0.2126 * channel(parts[0]) + 0.7152 * channel(parts[1]) + 0.0722 * channel(parts[2]),
          alpha,
        };
      };

      /** Four radii clamped the way a browser clamps them — CSS Backgrounds 3
       *  §5.5, one factor over all eight. `border-radius: 999px` on a pill is what
       *  the stylesheet STATES and what the computed value hands back; the used
       *  value is arithmetic no property exposes, so this is that arithmetic done a
       *  second time, from the stated number, to ask whether the drawn backdrop was
       *  drawn to it. */
      const clamped = (w, h, r) => {
        let k = 1;
        const pair = (a, b, span) => {
          if (a + b > span && a + b > 0) k = Math.min(k, span / (a + b));
        };
        pair(r[0], r[1], w);
        pair(r[3], r[2], w);
        pair(r[0], r[3], h);
        pair(r[1], r[2], h);
        return r.map((v) => Math.max(0, v * k));
      };

      const corners = (style) =>
        ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].map(
          (side) => Number.parseFloat(style[`border${side}Radius`]) || 0,
        );

      /**
       * Every Card's glass, READ IN THE CARD'S OWN UNITS.
       *
       * `offsetLeft` and `offsetWidth` and not a rect, and that is the whole reason
       * these are answerable at all: a rect on this plane is the axis-aligned
       * bounding box of a projected quad, so "is there a gap between the two search
       * pills" is a question a rect cannot be asked. The offsets are layout, taken
       * before the projection touches anything.
       */
      const glass = () =>
        [...document.querySelectorAll('.eater-map__card')].map((card) => {
          const name = card.getAttribute('data-eater-map-card') ?? '(unnamed)';
          /**
           * THE OUTLINE EACH EDGE WAS ACTUALLY DRAWN TO, per surface — the widest
           * corner anywhere in that surface's slice stack.
           *
           * A slice taken `i` in from the outline is rounded by `r - i`
           * (`edge.ts`), so the LARGEST corner in a stack is the one at inset 0 —
           * the wall, which is the solid's own outline. Taking the maximum per
           * corner asks the slices themselves rather than working out which of the
           * twenty-four is the wall, and it is the same answer.
           *
           * READ HERE RATHER THAN INFERRED FROM THE BACKDROP, because they are two
           * different elements built from two different expressions out of one
           * measurement, and a build that rounds the glass and leaves the drawn
           * edge square is the failure #195 names — it looks almost right.
           */
          const outline = {};
          for (const one of card.querySelectorAll(':scope > .eater-map__slice')) {
            const of = one.getAttribute('data-eater-map-edge');
            if (of === null) continue;
            const r = corners(getComputedStyle(one));
            const held = outline[of];
            outline[of] = held ? held.map((v, i) => Math.max(v, r[i])) : r;
          }
          const surfaces = [...card.querySelectorAll('[data-eater-map-glass]')].map((box) => {
            const drawn = box.getAttribute('data-eater-map-glass') ?? '(unnamed)';
            // `<card> <selector>` — the Section says which element each backdrop
            // was cut to, so this reads the claim back rather than knowing it.
            const selector = drawn.slice(drawn.indexOf(' ') + 1);
            let surface = null;
            try {
              surface = card.querySelector(selector);
            } catch {
              surface = null;
            }
            const skin = surface ? getComputedStyle(surface) : null;
            const map = box.querySelector('img');
            // A SURFACE THAT SCROLLS, and what it is showing of what it holds.
            // Only the results dropdown does: the app keeps every matching
            // restaurant in the DOM behind the panel's own scroll and shows a
            // stated number of them, so this is the one surface whose drawn height
            // is arithmetic on a variable rather than a size.
            const scroller =
              surface && surface.scrollHeight > surface.clientHeight + 1
                ? {
                    shown: [...surface.children].filter(
                      (row) => row.offsetTop + row.offsetHeight <= surface.clientHeight + 0.5,
                    ).length,
                    held: surface.children.length,
                    own: surface.offsetHeight,
                    // The box the export sized for it. A panel taller than its own
                    // shell is the restatement lost and the `var()` default taken.
                    host: surface.parentElement?.clientHeight ?? null,
                  }
                : null;
            return {
              name: drawn,
              left: box.offsetLeft,
              top: box.offsetTop,
              width: box.offsetWidth,
              height: box.offsetHeight,
              scroller,
              radii: corners(getComputedStyle(box)),
              stated: skin
                ? clamped(surface.offsetWidth, surface.offsetHeight, corners(skin))
                : null,
              // Keyed by the same string the backdrop is named by, which is what
              // `glass.ts` writes on both. `undefined` means this surface has no
              // slices at all — a different failure, and one `edged` below already
              // reports, so this is left null rather than defaulted to zeroes.
              edge: outline[drawn] ?? null,
              fill: skin ? colour(skin.backgroundColor) : null,
              ink: skin ? colour(skin.color) : null,
              blurred: map ? /blur\(\s*(?!0\w*\s*\))/.test(getComputedStyle(map).filter) : null,
              // The Slab's own bytes and not a second picture: `currentSrc` is what
              // the browser actually fetched, so a copy pointed somewhere else is a
              // different map behind the glass.
              theMap: map ? map.currentSrc : null,
            };
          });
          return {
            name,
            width: card.offsetWidth,
            surfaces,
            // WHICH SURFACES CARRY AN EDGE, as a set. A Card with two glass
            // surfaces has two slice stacks under one host, and #197 carries the
            // rebuild that deletes the first when it builds the second — silently,
            // because the surviving surface looks perfect.
            edged: [
              ...new Set(
                [...card.querySelectorAll(':scope > .eater-map__slice')].map((one) =>
                  one.getAttribute('data-eater-map-edge'),
                ),
              ),
            ],
          };
        });

      /**
       * Which vendored variables this Section re-themes, and whether the export
       * publishes each one.
       *
       * THE DARK CARDS ARE AN OVERRIDE AND NOT A FORK, and this is that stated
       * mechanically: every custom property the Section sets on a Card that is not
       * one of its own has to be a name `cards.css` already declares on its host.
       * A theme built out of names the export does not have is a theme a
       * re-vendoring cannot carry, and it would look perfectly right until the day
       * somebody regenerated the Cards.
       */
      const rethemed = () => {
        const names = new Set();
        const owned = /\.eater-map__card(?![\w-])/;
        const walk = (rules) => {
          for (const rule of rules ?? []) {
            if (rule.cssRules) walk(rule.cssRules);
            if (!rule.selectorText || !owned.test(rule.selectorText)) continue;
            for (const property of rule.style) {
              if (property.startsWith('--') && !property.startsWith('--eater-map-')) {
                names.add(property);
              }
            }
          }
        };
        for (const sheet of document.styleSheets) {
          try {
            walk(sheet.cssRules);
          } catch {
            // A stylesheet from another origin. There are none here, and a throw
            // that stopped the walk would report "no re-theme" rather than "could
            // not look".
          }
        }
        return [...names].map((name) => ({
          name,
          published: getComputedStyle(cardHost).getPropertyValue(name).trim().length > 0,
        }));
      };

      /**
       * The projection taken off the plane for the length of one read, and put
       * straight back.
       *
       * A rect on this plane is the axis-aligned bounding box of a PROJECTED
       * QUAD, whose corners are nowhere on the element — so every question that
       * is about a distance rather than about a position has to be asked with the
       * rotation lifted. `transform-style: flat` goes with it, or the Cards'
       * depths would still be carried under a plane that no longer turns.
       *
       * Restored the way the playhead and the scroll are: an inline
       * `transform: none` left standing would outlive the failure that caused it,
       * so a screenshot taken to work out why the run broke would show a drawing
       * nobody composed.
       */
      const lifted = (read) => {
        const heldTransform = plane.style.transform;
        const heldStyle = plane.style.transformStyle;
        try {
          plane.style.transform = 'none';
          plane.style.transformStyle = 'flat';
          return read();
        } finally {
          plane.style.transform = heldTransform;
          plane.style.transformStyle = heldStyle;
        }
      };

      /**
       * Every glass surface's rectangle ON THE PLANE, in drawn pixels.
       *
       * WITH THE PROJECTION LIFTED, which is what makes "do these two overlap" an
       * answerable question at all: two rotated quads can have overlapping
       * bounding boxes and share no pixel, and two quads at different depths can
       * legitimately be drawn over each other — that is what an exploded view is.
       * What the composition actually claims is about the PLANE the pieces lie on:
       * the map shows through between them, and a surface underneath another is a
       * surface nobody composed. Everything on this plane is a share of the Slab's
       * width, so this arrangement is the same one at every window.
       */
      const onThePlane = () =>
        lifted(() =>
          [...document.querySelectorAll('[data-eater-map-glass]')].map((box) => {
            const rect = box.getBoundingClientRect();
            return {
              // `<card> <selector>`, which is what the Section wrote on it — so a
              // failure names both pieces without this having to look either up.
              name: box.getAttribute('data-eater-map-glass') ?? '(unnamed)',
              left: round(rect.left),
              top: round(rect.top),
              right: round(rect.right),
              bottom: round(rect.bottom),
            };
          }),
        );

      /** How wide the map behind each Card's glass is DRAWN, which only means
       *  anything with the projection lifted — see below. */
      const mapWidths = () =>
        [...document.querySelectorAll('[data-eater-map-glass] img')].map((map) => ({
          name: map.parentElement?.getAttribute('data-eater-map-glass') ?? '(unnamed)',
          drawn: round(map.getBoundingClientRect().width),
        }));

      // ---- PROJECTS, AND THE GALLERY'S OWN BOX (#191) -----------------------
      // WHERE A MASTHEAD STANDS AT ITS SECTION'S RESTING PLACE, which is the only
      // frame in which the two are comparable: they are one screen apart in the
      // document, so a comparison in document coordinates says only that the
      // Sections are in different places. A Section comes to rest with its top
      // edge `scroll-margin-top` below the scrollport's — that is what the margin
      // MEANS on a snap target, and the Panel spends its whole lift on it so the
      // word's cap top lands where the landing measure says. So the box a reader
      // sees at rest is the box within the Section plus that margin, and it is
      // arithmetic on two rects rather than a scroll this Check would then have to
      // undo.
      //
      // AND THE INK IS COMPARED AS WELL AS THE BOX. Both mastheads are block
      // elements filling their own grid areas — four twelfths here against six
      // there — so their `getBoundingClientRect().width` is the COLUMN and says
      // nothing about the word. A Range over the element's contents is the word's
      // own advance, which is what a font size, a weight and a tracking add up to:
      // it is the one number that fails if any of the three drifts out of
      // agreement with the Panel's.
      const restBox = (element, host) => {
        if (!element || !host) return null;
        const box = element.getBoundingClientRect();
        const at = host.getBoundingClientRect();
        const port = Number.parseFloat(getComputedStyle(host).scrollMarginTop) || 0;
        const range = document.createRange();
        range.selectNodeContents(element);
        return {
          x: round(box.x),
          y: round(box.y - at.y + port),
          h: round(box.height),
          ink: round(range.getBoundingClientRect().width),
        };
      };
      const eaterMast = document.querySelector('[data-eater-map-masthead]');
      const galleryMast = document.querySelector('.projects-panel__masthead');
      const masthead = {
        here: restBox(eaterMast, document.querySelector('.eater-map')),
        gallery: restBox(galleryMast, document.querySelector('.projects-panel')),
        says: (eaterMast?.textContent ?? '').trim().toUpperCase(),
        gallerySays: (galleryMast?.textContent ?? '').trim().toUpperCase(),
      };

      // ---- the serif title, against the two ratios that state it ------------
      // MEASURED THE WAY `title.ts` WRITES IT — a face's cap read at a reference
      // size and scaled, rather than read at the size it is drawn at. Both are the
      // ink; only one of them is free of the rasteriser's grid, which is 1.4% at
      // the short corner of the band and a third of the whole difference this
      // assertion exists to see.
      const titleEl = document.querySelector('[data-eater-map-title]');
      const capRatio = (element) => {
        const canvas = document.createElement('canvas');
        const pen = canvas.getContext('2d');
        if (!pen) return Number.NaN;
        const style = getComputedStyle(element);
        pen.font = `${style.fontStyle} ${style.fontWeight} 1000px ${style.fontFamily}`;
        return pen.measureText('H').actualBoundingBoxAscent / 1000;
      };
      /** The baseline of an element's FIRST line, which is the bottom edge of a
       *  zero-sized inline-block sitting on it. */
      const baselineOf = (element) => {
        const probe = document.createElement('span');
        probe.style.cssText = 'display:inline-block;width:0;height:0';
        element.prepend(probe);
        const on = probe.getBoundingClientRect().bottom;
        probe.remove();
        return on;
      };
      const title =
        eaterMast && titleEl
          ? (() => {
              const mastCap =
                capRatio(eaterMast) * Number.parseFloat(getComputedStyle(eaterMast).fontSize);
              const ownCap =
                capRatio(titleEl) * Number.parseFloat(getComputedStyle(titleEl).fontSize);
              const style = getComputedStyle(document.querySelector('.eater-map'));
              return {
                cap: ownCap / mastCap,
                drop: (baselineOf(titleEl) - ownCap - baselineOf(eaterMast)) / mastCap,
                wantCap: Number.parseFloat(style.getPropertyValue('--eater-map-title-cap')),
                wantDrop: Number.parseFloat(style.getPropertyValue('--eater-map-title-drop')),
                lines: titleEl.querySelectorAll('span').length,
              };
            })()
          : null;

      // ---- and where the three standing blocks stand ------------------------
      const block = (selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const box = element.getBoundingClientRect();
        return {
          left: round(box.left),
          right: round(box.right),
          top: round(box.top),
          bottom: round(box.bottom),
        };
      };
      const columns = {
        inner: block('.eater-map__inner'),
        head: block('.eater-map__head'),
        copy: block('.eater-map__copy'),
        stage: block('.eater-map__stage'),
        points: block('.eater-map__points'),
      };

      const was = { progress: lift.progress(), scroll: window.scrollY };
      kernel.hold?.();
      try {
        lift.progress(0);
        const down = cardBoxes();
        const flatPlane = planeBox();
        const flatHidden = invisible();
        const rulesFlat = rules();
        // BOTH ENDS, because the two Cards a dropdown can land on drift by
        // different amounts as they climb — so the arrangement that clears at one
        // end is not the arrangement at the other, and the flat one is also what a
        // reader below the band is looking at.
        const flatGlassPlane = onThePlane();
        lift.progress(halfWay);
        const rulesHalfWay = rules();
        lift.progress(1);
        const raised = cardBoxes();
        const raisedPlane = planeBox();
        const raisedHidden = invisible();
        const rulesRaised = rules();
        const probed = probes();
        const risen = rises();
        // THE GLASS IS READ AT THE RAISED END, which is where "a raised Card is not
        // opaque" is a claim at all: the plate mix this replaced was spent BY the
        // playhead, so it was the app's own translucency at the flat end and solid
        // white here. A read taken at progress 0 would have passed it.
        const glassed = glass();
        const raisedGlassPlane = onThePlane();

        // THE CAMERA IS LIFTED FOR ONE READ, AND ONLY FOR THE SCALE. A Card's
        // `getBoundingClientRect` is the axis-aligned bounding box of a quad
        // projected under the plane's rotation, which is not the Card's own drawn
        // width and never was — it agreed with it while the Lift's flat end was an
        // untilted screenshot, and #189 took that frame away. So the projection is
        // taken off the plane for the length of this read and put straight back: the
        // Card's own `scale()` is what is left, and its rect over its declared width
        // IS the scale the composition applied.
        const heldBoost = section.style.getPropertyValue('--eater-map-card-scale');
        let square;
        // AND THE MAP INSIDE THE GLASS IS MEASURED IN THE SAME BREATH, for the same
        // reason and against the same read. The Slab's own box is never projected —
        // `.eater-map__slab` is the plane's PARENT — so the two are comparable only
        // while the plane's transform is off, and what is being asked is whether one
        // capture pixel is the same size inside a Card's glass as it is on the map
        // beside it. Read twice: once as the composition stands, and once with a
        // BOOST on, because a counter-scale that is missing is invisible at 1.
        let plainMap;
        let boostedMap;
        try {
          lifted(() => {
            square = cardBoxes();
            plainMap = mapWidths();
            section.style.setProperty('--eater-map-card-scale', String(boosted));
            boostedMap = mapWidths();
          });
        } finally {
          if (heldBoost) section.style.setProperty('--eater-map-card-scale', heldBoost);
          else section.style.removeProperty('--eater-map-card-scale');
        }

        const stage = document.querySelector('.eater-map__stage');
        const reachable = stage
          ? [...stage.querySelectorAll(focusable)].filter((el) => el.tabIndex >= 0).length
          : 0;
        // A heading whose role has been taken off it is text; one that still has
        // it is an entry in the page's outline.
        const announced = stage
          ? [...stage.querySelectorAll('h1, h2, h3, h4, h5, h6')].filter(
              (el) => !['presentation', 'none'].includes(el.getAttribute('role') ?? ''),
            ).length
          : 0;

        return {
          // The phone Eater was captured at, off the element the component writes
          // it on — so this reads the composition's own number rather than a copy.
          app: Number.parseFloat(getComputedStyle(slab).getPropertyValue('--eater-map-app-w')),
          slabWidth: round(slab.getBoundingClientRect().width),
          square,
          glassed,
          onThePlane: { flat: flatGlassPlane, raised: raisedGlassPlane },
          rethemed: rethemed(),
          plainMap,
          boostedMap,
          down,
          raised,
          flatPlane,
          raisedPlane,
          probed,
          risen,
          flatHidden,
          raisedHidden,
          reachable,
          announced,
          masthead,
          title,
          columns,
          overlay: overlay
            ? {
                spoken: overlay.getAttribute('aria-hidden') !== 'true',
                says: (overlay.textContent ?? '').trim(),
              }
            : null,
          numbered: document.querySelectorAll('.eater-map__points > li').length,
          // AND WHETHER EACH ONE IS INSIDE THE CAMERA, which is a fact about the
          // markup and has to be, since #189. An anchor outside the transformed
          // subtree used to be caught by geometry — it stood still while its part
          // was turned, and both ends of the Lift found it in one place — and the
          // Slab's own anchor now stands still legitimately, because the Slab does.
          // Containment is the question that assertion was asking all along.
          anchored: [...document.querySelectorAll('[data-eater-map-anchor]')].map((element) => ({
            part: element.getAttribute('data-eater-map-anchor'),
            projected: plane.contains(element),
          })),
          rules: { flat: rulesFlat, halfWay: rulesHalfWay, raised: rulesRaised },
        };
      } finally {
        window.scrollTo(0, was.scroll);
        lift.progress(was.progress);
        kernel.release?.();
      }
    }, {
      focusable: FOCUSABLE,
      onThePart: ON_THE_PART,
      halfWay: HALF_WAY,
      probe: PROBE,
      boosted: BOOSTED,
    });

    const where = `${viewport.width}x${viewport.height}`;
    if (seen.missing) {
      failures.push(`${where}: ${seen.missing}`);
      return failures;
    }

    if (!(seen.app > 0)) {
      failures.push(`${where}: the Slab does not say what phone it was captured at — --eater-map-app-w is ${seen.app}`);
    }
    if (!(seen.slabWidth > 0)) {
      failures.push(`${where}: the Slab has no width, so nothing about the scale on it could be read`);
    }
    if (seen.square.length === 0) {
      failures.push(`${where}: no Card on the Slab, so nothing about their scale was checked`);
    }

    const slabScale = seen.slabWidth / seen.app;
    for (const card of seen.square) {
      const drawnScale = card.drawn / card.declared;
      // EVERY COMPARISON BELOW IS FALSE WHEN EITHER SIDE IS NaN, which is the
      // shape scripts/checks/NOTES.md warns about three times: a Card that is
      // `display: none` computes a width of `auto`, parses to NaN, and would sail
      // through the tolerance while reading as though it had been measured.
      if (!Number.isFinite(drawnScale) || !Number.isFinite(slabScale) || drawnScale <= 0) {
        failures.push(
          `${where}: the ${card.name} Card cannot be measured — ${card.drawn}px drawn over ` +
            `${card.declared}px declared. Nothing about its scale was asserted`,
        );
        continue;
      }
      const off = Math.abs(drawnScale - slabScale) / slabScale;
      if (off > SCALE_TOLERANCE) {
        failures.push(
          `${where}: with the projection lifted, the ${card.name} Card is drawn at ` +
            `${drawnScale.toFixed(4)} and the Slab at ${slabScale.toFixed(4)} — the Card is not at the ` +
            "map's scale, so this is three stickers on a photograph rather than one screenshot",
        );
      }
    }

    for (const card of seen.down) {
      const up = seen.raised.find((other) => other.name === card.name);
      if (!up) {
        failures.push(`${where}: the ${card.name} Card is down on the map and not on the raised drawing`);
        continue;
      }
      const apart = Math.max(
        Math.abs(up.x - card.x),
        Math.abs(up.y - card.y),
        Math.abs(up.drawn - card.drawn),
        Math.abs(up.height - card.height),
      );
      if (!(apart > MOVED)) {
        failures.push(
          `${where}: the ${card.name} Card is in the same place at both ends of the Lift — ` +
            `${card.drawn}x${card.height} at ${card.x},${card.y} down and ${up.drawn}x${up.height} at ` +
            `${up.x},${up.y} raised. The Exploded View is not exploding this one`,
        );
      }
    }

    // ---- PROJECTS stands in the Gallery's own box (#191) ---------------------
    // The first thing the reader sees is the word they were already looking at,
    // and the claim is that it has not moved. Both mastheads are read at their own
    // Section's resting place and compared, so there is no typed number here to go
    // stale — the ticket quotes six measurements off the live page at 1600x900 and
    // this asserts the relationship they are measurements OF.
    const { here, gallery } = seen.masthead;
    if (!here || !gallery) {
      failures.push(
        `${where}: there is no ${here ? 'Projects Panel' : 'Eater Map'} masthead to compare — the word ` +
          'this Section prints is the Gallery\'s own, and nothing about it standing in the Gallery\'s box ' +
          'was asserted',
      );
    } else {
      if (seen.masthead.says !== seen.masthead.gallerySays) {
        failures.push(
          `${where}: this Section's masthead reads "${seen.masthead.says}" and the Gallery's reads ` +
            `"${seen.masthead.gallerySays}" — the reader turning onto this screen is meant to be looking ` +
            'at the word they were already looking at',
        );
      }
      const apart = Math.max(
        Math.abs(here.x - gallery.x),
        Math.abs(here.y - gallery.y),
        Math.abs(here.h - gallery.h),
        Math.abs(here.ink - gallery.ink),
      );
      if (!Number.isFinite(apart)) {
        failures.push(
          `${where}: the two mastheads cannot be compared — ${JSON.stringify(here)} here against ` +
            `${JSON.stringify(gallery)} on the Gallery. Nothing about the word standing still was asserted`,
        );
      } else if (apart > GALLERY) {
        failures.push(
          `${where}: PROJECTS stands at ${here.x},${here.y} — ${here.ink}px of ink in a ${here.h}px line — ` +
            `where the Gallery's masthead stands at ${gallery.x},${gallery.y} with ${gallery.ink}px in ` +
            `${gallery.h}px, ${apart.toFixed(2)}px apart at the two resting places. It is the same word in ` +
            'the same box on both screens, so turning the page does not move it',
        );
      }
    }

    // ---- and the serif title is sized and placed off its ink -----------------
    if (!seen.title) {
      failures.push(
        `${where}: the Section has no serif title under PROJECTS, so neither ratio could be read`,
      );
    } else {
      for (const [what, got, want] of [
        ["the title's cap height, as a share of PROJECTS' cap", seen.title.cap, seen.title.wantCap],
        [
          "the title's first cap top below the masthead's baseline, in PROJECTS cap-heights",
          seen.title.drop,
          seen.title.wantDrop,
        ],
      ]) {
        if (!Number.isFinite(got) || !Number.isFinite(want) || want === 0) {
          failures.push(
            `${where}: ${what} is ${got} against a declared ${want} — nothing about it was asserted`,
          );
          continue;
        }
        const off = Math.abs(got - want) / Math.abs(want);
        if (off > RATIO) {
          failures.push(
            `${where}: ${what} is ${got.toFixed(4)} against the ${want} this Section declares — ` +
              `${(off * 100).toFixed(1)}% out. Both ratios are derived from the masthead's real INK at ` +
              'runtime, and a font size proportional to the masthead instead lands 4% low because a ' +
              "grotesque's cap is not a serif's",
          );
        }
      }
    }

    // ---- the copy at the foot of the left column, the Points to the right ----
    const { inner, head: writing, copy, stage, points } = seen.columns;
    if (!inner || !writing || !copy || !stage || !points) {
      failures.push(
        `${where}: the composition is missing its ${
          [
            [inner, 'inner'],
            [writing, 'head'],
            [copy, 'copy'],
            [stage, 'stage'],
            [points, 'points'],
          ]
            .filter(([box]) => !box)
            .map(([, name]) => name)
            .join(', ')
        } — nothing about where the three blocks stand was asserted`,
      );
    } else {
      if (Math.abs(copy.left - writing.left) > FOOT) {
        failures.push(
          `${where}: the copy's left edge is at ${copy.left} and the head's at ${writing.left} — the copy is ` +
            'at the foot of the column PROJECTS heads, which is the same column',
        );
      }
      if (Math.abs(copy.bottom - inner.bottom) > FOOT) {
        failures.push(
          `${where}: the copy ends at y=${copy.bottom} in a composition that ends at y=${inner.bottom} — ` +
            'it stands at the FOOT of its column, and a copy that floats above it is the top-right band ' +
            'this Section shipped with by another route',
        );
      }
      if (!(copy.top >= writing.bottom - FOOT)) {
        failures.push(
          `${where}: the copy starts at y=${copy.top} and the title ends at y=${writing.bottom} — the head and ` +
            'the copy are the two ENDS of one column and are printed over each other',
        );
      }
      if (!(points.left >= stage.right - FOOT)) {
        failures.push(
          `${where}: the four Points start at x=${points.left} and the stage ends at x=${stage.right} — they ` +
            'stand to the RIGHT of the drawing they annotate, which is what moving them across the page ' +
            'was for',
        );
      }
      if (!(writing.right <= stage.left + FOOT)) {
        failures.push(
          `${where}: the writing ends at x=${writing.right} and the stage starts at x=${stage.left} — the ` +
            'drawing has the middle of the screen and the writing the left of it',
        );
      }
    }

    // ---- the Slab stands still, and it stands in a parallel projection --------
    // THE INVARIANT #189 IS ABOUT, and the one the author cares most about: a
    // reader turning onto the Section does not watch the thing they are looking at
    // resize itself. Both angles were terms of `--eater-map-lift` before it, so the
    // plane tipped up as the page arrived; the mutation that puts either of them
    // back inside a `calc()` with the playhead in it fails here.
    const slabMoved = Math.max(
      Math.abs(seen.raisedPlane.x - seen.flatPlane.x),
      Math.abs(seen.raisedPlane.y - seen.flatPlane.y),
      Math.abs(seen.raisedPlane.w - seen.flatPlane.w),
      Math.abs(seen.raisedPlane.h - seen.flatPlane.h),
    );
    if (!Number.isFinite(slabMoved)) {
      failures.push(
        `${where}: the Slab's projected box cannot be measured — ${JSON.stringify(seen.flatPlane)} down ` +
          `against ${JSON.stringify(seen.raisedPlane)} raised. Nothing about it standing still was asserted`,
      );
    } else if (slabMoved > STILL) {
      failures.push(
        `${where}: the Slab is drawn ${seen.flatPlane.w}x${seen.flatPlane.h} at ` +
          `${seen.flatPlane.x},${seen.flatPlane.y} at one end of the Lift and ` +
          `${seen.raisedPlane.w}x${seen.raisedPlane.h} at ${seen.raisedPlane.x},${seen.raisedPlane.y} at ` +
          `the other — ${slabMoved.toFixed(2)}px apart. It does not change when the reader turns onto ` +
          'the Section; only the Cards move',
      );
    }

    const { head, foot } = seen.probed;
    const spread = Math.max(
      Math.abs(head.w - foot.w) / Math.max(head.w, foot.w),
      Math.abs(head.h - foot.h) / Math.max(head.h, foot.h),
    );
    if (!Number.isFinite(spread)) {
      failures.push(
        `${where}: the two probes cannot be measured — ${head.w}x${head.h} at the Slab's head and ` +
          `${foot.w}x${foot.h} at its foot. Nothing about the projection was asserted`,
      );
    } else if (spread > PARALLEL) {
      failures.push(
        `${where}: two identical ${PROBE}px probes are drawn ${head.w}x${head.h} at the Slab's head and ` +
          `${foot.w}x${foot.h} at its foot — ${(spread * 100).toFixed(1)}% apart. The projection is ` +
          'converging, and this drawing is parallel: nothing may grow because it is nearer the reader',
      );
    }

    // ---- and the three Cards rise together -----------------------------------
    const rises = seen.risen.filter((one) => Number.isFinite(one.rise));
    if (rises.length !== seen.risen.length) {
      failures.push(
        `${where}: ${seen.risen.length - rises.length} Card(s) have no measurable rise off the plane — ` +
          `${JSON.stringify(seen.risen)}. Nothing about the Lift's distance was asserted`,
      );
    }
    for (const one of rises) {
      if (!(one.rise > RISEN)) {
        failures.push(
          `${where}: the ${one.name} Card rises ${one.rise}px off the plane — a depth under a parallel ` +
            'projection reaches the screen only through the attitude, so a plane standing at none is an ' +
            'Exploded View with nothing exploded, and every other assertion here passes',
        );
      }
    }
    if (rises.length > 1) {
      const highest = Math.max(...rises.map((one) => one.rise));
      const lowest = Math.min(...rises.map((one) => one.rise));
      const apart = (highest - lowest) / highest;
      if (apart > TOGETHER) {
        failures.push(
          `${where}: the three Cards rise ${rises.map((one) => `${one.name} ${one.rise}px`).join(', ')} — ` +
            `${(apart * 100).toFixed(0)}% apart, against ${TOGETHER * 100}% allowed. They come off the map ` +
            'TOGETHER, so the drawing reads as one object taken apart rather than three objects hanging ' +
            'at three heights',
        );
      }
      // AND THEY ARE STILL A STACK. Rising together is half of it; the other half
      // is that the app's own order survives — the detail panel is a sheet on the
      // map, the lines popup floats above it, the search bar is on top. Three equal
      // depths satisfy the tolerance above perfectly and draw one raised plate.
      const order = ['search', 'lines', 'details'];
      for (let index = 1; index < order.length; index += 1) {
        const above = rises.find((one) => one.name === order[index - 1]);
        const below = rises.find((one) => one.name === order[index]);
        // A MISSED NAME IS A FAILURE AND NOT A SKIP. `order` is the app's own
        // stacking order written a second time — `cards.ts` owns the first copy
        // and this file cannot import it — so a renamed Card would otherwise make
        // both lookups miss, the loop skip, and this assertion pass while having
        // read nothing. That is the shape scripts/checks/NOTES.md warns about
        // three times, and it is worth the noisier branch.
        if (!above || !below) {
          failures.push(
            `${where}: no Card is named ${above ? order[index] : order[index - 1]} — this Check knows the ` +
              `stack as ${order.join(' over ')}, which is cards.ts's own order written a second time. ` +
              'Nothing about the stack having an order was asserted',
          );
          continue;
        }
        if (!(above.rise - below.rise > RISEN)) {
          failures.push(
            `${where}: the ${order[index - 1]} Card rises ${above.rise}px and the ${order[index]} Card ` +
              `${below.rise}px — the stack has lost its order, and three Cards at one depth are a raised ` +
              'plate rather than an exploded assembly',
          );
        }
      }
    }

    // ---- the Cards are glass, and they are dark ------------------------------
    // NINE. #190's whole claim, and it is four separate failures wearing one
    // sentence: a Card that is opaque, a Card drawn as one box round two pills, a
    // backdrop cut to a radius somebody typed here, and a surface with no edge.
    // Each is a thing a still of the raised drawing would not settle.
    for (const [name, wanted] of Object.entries(SURFACES)) {
      const card = seen.glassed.find((one) => one.name === name);
      // A MISSED NAME IS A FAILURE AND NOT A SKIP. `SURFACES` is cards.ts's own
      // list written a second time — this file cannot import it — so a renamed
      // Card would otherwise make the lookup miss and this loop assert nothing.
      if (!card) {
        failures.push(
          `${where}: no Card is named ${name} — this Check knows the drawing as ` +
            `${Object.keys(SURFACES).join(', ')}, which is cards.ts's own list written a second ` +
            'time. Nothing about its glass was asserted',
        );
        continue;
      }
      if (card.surfaces.length !== wanted) {
        failures.push(
          `${where}: the ${name} Card draws ${card.surfaces.length} glass surface(s) and the app gives it ` +
            `${wanted} — a Card is its GLASS SURFACES and not its bounding box, and one backdrop round ` +
            'the search bar and the offline button welds them into a component the app does not have',
        );
      }
      // AND THEY DO NOT FILL THE BOX THAT HOLDS THEM. Three boxes is satisfied by
      // three boxes covering everything between them; the app's own 8px gap
      // between the pills, and the clearance the dropdown hangs at, are where the
      // map has to show through. Areas rather than widths since #194: the search
      // Card's surfaces are a row and a panel under it, so their widths sum past
      // the Card's own and always did the moment a surface stopped being beside
      // the others.
      const span = card.surfaces.reduce(
        (box, one) => ({
          left: Math.min(box.left, one.left),
          top: Math.min(box.top, one.top),
          right: Math.max(box.right, one.left + one.width),
          bottom: Math.max(box.bottom, one.top + one.height),
        }),
        { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity },
      );
      const held = (span.right - span.left) * (span.bottom - span.top);
      const covered = card.surfaces.reduce((sum, one) => sum + one.width * one.height, 0);
      if (card.surfaces.length > 1 && !(covered < held)) {
        failures.push(
          `${where}: the ${name} Card's glass covers ${covered} of the ${held} square pixels its own ` +
            'surfaces span — they have grown into the box round them, which is the one thing drawing them ' +
            'separately was for',
        );
      }
      for (const surface of card.surfaces) {
        if (surface.fill === null || surface.ink === null || surface.stated === null) {
          failures.push(
            `${where}: the ${surface.name} backdrop names a surface that is not on the Card — nothing ` +
              'about its colour, its outline or its edge was asserted',
          );
          continue;
        }
        // NOT OPAQUE, WHICH IS THE MUTATION THIS EXISTS FOR. The Section used to
        // mix every surface towards a white plate in step with the Card's climb,
        // so a raised Card was solid; #190 is that reversed, and putting the mix
        // back fails here at the raised end and nowhere else.
        if (!(surface.fill.alpha < 1)) {
          failures.push(
            `${where}: the ${surface.name} is opaque at the raised end of the Lift — the map has to be ` +
              'visibly present THROUGH the Cards, and a surface filled to a plate is a panel lying on a ' +
              'photograph rather than glass',
          );
        }
        // AND DARK, WITH ITS OWN INK LIGHT ON IT. No hex and no threshold: what is
        // asserted is the RELATIONSHIP a dark theme is, so deleting the override
        // block puts the export's own black label on its own white glass and fails.
        if (!(surface.ink.lit > surface.fill.lit)) {
          failures.push(
            `${where}: the ${surface.name} is painted lighter than the text on it — the Cards read as ` +
              'DARK surfaces on this page, and a light interface floating over a dark map is what the ' +
              'variable overrides exist to stop',
          );
        }
        if (surface.blurred !== true) {
          failures.push(
            `${where}: the ${surface.name}'s copy of the map is not blurred — the map is meant to be ` +
              'SMEARED behind the glass, and a sharp map behind text is a window rather than a surface',
          );
        }
        if (surface.theMap === null || !surface.theMap.includes('slab')) {
          failures.push(
            `${where}: the ${surface.name} has no copy of the Slab behind it — it is showing ` +
              `${surface.theMap ?? 'nothing'}, and glass shows the thing it is lying on`,
          );
        }
        // EVERY RADIUS IS THE EXPORT'S OWN. `cards.css` states `--r-full`,
        // `--r-menu: 14px` and `--r-sheet: 28px 28px 0 0`; the mockup typed
        // `24 / 18 / 22` and two of the three were wrong. This reads the
        // stylesheet's own number, clamps it the way a browser clamps it, and
        // requires the drawn backdrop to have been cut to that.
        const off = furthest(surface.radii, surface.stated);
        if (!Number.isFinite(off)) {
          failures.push(
            `${where}: the ${surface.name}'s corners cannot be measured — drawn ` +
              `${surface.radii.join('/')} against ${surface.stated.join('/')} stated. Nothing about the ` +
              'outline was asserted',
          );
        } else if (off > RADIUS) {
          failures.push(
            `${where}: the ${surface.name} is drawn with corners ${surface.radii.join('/')} where ` +
              `cards.css states ${surface.stated.join('/')} — a radius written in this repository is a ` +
              'second opinion about a number the vendored export already holds',
          );
        }
        // EVERY CORNER IN THE DRAWING TURNS THE SAME WAY (#195), asked of EVERY
        // glass surface and not of the details sheet alone — that is the
        // composition's rule rather than one surface's detail. NOTES.md, "A shape
        // is the one thing a variable cannot carry", carries the trap that makes
        // this worth a Check: the sheet's square foot is the export's own default,
        // and the obvious undo — overriding `--r-sheet` — is a no-op.
        if (surface.stated.some((r) => !(r > 0))) {
          failures.push(
            `${where}: the ${surface.name} is drawn with corners ${surface.stated.join('/')} — a zero ` +
              'is a right angle in a drawing where the Slab, the pills and the popup all curve. If ' +
              'this is the details sheet, the square foot is the export\'s own and overriding ' +
              '--r-sheet does NOT undo it: the zeroes are in the border-radius rule, so the override ' +
              'has to be of the rule',
          );
        }
        // AND THE DRAWN EDGE FOLLOWS THAT CORNER, asked at the corner itself. The
        // backdrop above and the slice stack here are two elements built from two
        // expressions out of one measurement, so rounding the glass while leaving
        // the edge square is a build that looks almost right.
        //
        // WHAT THE OUTLINE PROVES AND WHAT IT DOES NOT. It is the widest corner in
        // the stack, so it is the wall's — the solid's own outline — and that is
        // the corner this compares. It says nothing about the slices INSIDE it,
        // which `edge.ts` derives from the same four numbers by subtracting each
        // slice's own inset; a fillet drawn to some other outline under a correct
        // wall would pass here.
        if (surface.edge === null) {
          failures.push(
            `${where}: the ${surface.name} has no slices to read an outline off — nothing about the ` +
              'shape of its drawn edge was asserted',
          );
        } else {
          const bent = furthest(surface.edge, surface.stated);
          if (!Number.isFinite(bent)) {
            failures.push(
              `${where}: the ${surface.name}'s edge cannot be measured — drawn ` +
                `${surface.edge.join('/')} against ${surface.stated.join('/')} stated. Nothing about ` +
                'the shape of its drawn edge was asserted',
            );
          } else if (bent > RADIUS) {
            failures.push(
              `${where}: the ${surface.name}'s edge is drawn to an outline of ` +
                `${surface.edge.join('/')} where the surface itself is ${surface.stated.join('/')} — ` +
                'the extrusion is cut to the corners the served stylesheet states, so an edge that ' +
                'disagrees with its own face is a radius that came from somewhere else',
            );
          }
        }
      }
      // EVERY GLASS SURFACE CARRIES AN EDGE, AND NOT MERELY SOME. The rebuild #197
      // carries clears per box and builds per host, so the second surface's clear
      // deletes the first surface's slices — and the surviving one looks perfect,
      // which is why this counts sets rather than slices.
      for (const surface of card.surfaces) {
        if (!card.edged.includes(surface.name)) {
          failures.push(
            `${where}: the ${surface.name} has no edge — ${
              card.edged.length ? `only ${card.edged.join(', ')} does` : 'nothing on this Card does'
            }. A Card with two glass surfaces has two slice stacks under one host, and a clear written ` +
              'per surface deletes the one built before it',
          );
        }
      }
    }

    // ---- and no surface is drawn on top of another ---------------------------
    // #194's own claim, and it is why the rail popup moved down the Slab: at the
    // search bar's own place the results dropdown lands exactly where the popup
    // stood. Asked ON THE PLANE and not on the screen, which is the only form of
    // the question that has an answer — two rotated quads can have overlapping
    // bounding boxes and share no pixel, and two Cards at different depths may
    // legitimately be drawn over one another, since that is what an exploded view
    // is. What the composition claims is about the plane the pieces lie on.
    for (const [when, drawn] of [
      ['flat', seen.onThePlane.flat],
      ['at rest', seen.onThePlane.raised],
    ]) {
      if (drawn.length === 0) {
        failures.push(
          `${where}, ${when}: no glass surface could be read on the plane — nothing about the pieces of ` +
            'the drawing lying clear of each other was asserted',
        );
        continue;
      }
      for (let a = 0; a < drawn.length; a += 1) {
        for (let b = a + 1; b < drawn.length; b += 1) {
          const one = drawn[a];
          const other = drawn[b];
          const over =
            one.left < other.right - APART &&
            other.left < one.right - APART &&
            one.top < other.bottom - APART &&
            other.top < one.bottom - APART;
          if (over) {
            failures.push(
              `${where}, ${when}: the ${one.name} and the ${other.name} overlap on the plane — ` +
                `${one.left},${one.top} to ${one.right},${one.bottom} against ${other.left},${other.top} ` +
                `to ${other.right},${other.bottom}. Every piece of this drawing lies on one plane, so a ` +
                'surface under another is a surface nobody composed and a gap the map cannot show through',
            );
          }
        }
      }
    }

    // ---- and the dropdown shows the rows it was capped to ---------------------
    // THE TRAP #194 PAID FOR. The panel's height is
    // `calc(var(--mobile-search-visible-results, 4) * 56px)`, set inline on its
    // shell by the app — and a root's inline style is exactly what the collector
    // strips, because that is where the app writes a surface's placement. So the
    // card arrives with the variable gone, falls back to the FOUR in its own
    // `var()` default, and draws four rows inside a host box the collector sized
    // for two. Two assertions, and the first needs no number at all.
    const scrollers = seen.glassed.flatMap((card) =>
      card.surfaces.filter((one) => one.scroller).map((one) => one),
    );
    for (const one of scrollers) {
      const { own, host } = one.scroller;
      if (host !== null && own > host + 0.5) {
        failures.push(
          `${where}: the ${one.name} is drawn ${own}px tall inside a ${host}px box — the export sized that ` +
            'box for the surface it captured, so a surface taller than it is one drawn to a number the ' +
            'vendored markup no longer carries',
        );
      }
    }
    const dropdown = scrollers.find((one) => one.name === DROPDOWN);
    if (!dropdown) {
      // A MISSED NAME IS A FAILURE AND NOT A SKIP, for the third time in this
      // file: without this the whole of #194's row cap would go unasserted the
      // moment the surface stopped scrolling, which is exactly what losing the
      // restatement does not do and exactly what deleting the dropdown does.
      failures.push(
        `${where}: no surface is named ${DROPDOWN} with rows behind its own scroll — the drawing shows ` +
          `${ROWS} of the app's matching restaurants, and nothing about that was asserted`,
      );
    } else if (dropdown.scroller.shown !== ROWS) {
      failures.push(
        `${where}: the ${DROPDOWN} shows ${dropdown.scroller.shown} of the ${dropdown.scroller.held} rows ` +
          `it holds, against the ${ROWS} the capture capped it to — the Section restates the app's own ` +
          '--mobile-search-visible-results, which the collector cannot carry, and a build that lost it ' +
          "draws the app's own four rows out of the bottom of a box sized for two",
      );
    }

    // THE DARK THEME IS AN OVERRIDE AND NOT A FORK, asked of the cascade rather
    // than of the look: every vendored variable the Section sets on a Card has to
    // be a name `cards.css` already publishes, or a re-vendoring cannot carry it.
    if (seen.rethemed.length === 0) {
      failures.push(
        `${where}: the Section sets no vendored variable on a Card at all — the dark theme IS those ` +
          'overrides, so there is nothing here re-theming another repository\'s interface',
      );
    }
    for (const { name, published } of seen.rethemed) {
      if (!published) {
        failures.push(
          `${where}: the Section overrides ${name} on a Card and the vendored export does not publish ` +
            'it — a theme built out of names cards.css does not have is one a re-vendoring silently ' +
            'undoes',
        );
      }
    }

    // A BOOSTED CARD'S BACKDROP IS COUNTER-SCALED. Scaling a Card scales the copy
    // of the map inside it, so without the division a boosted surface shows a map
    // through itself larger than the map it is lying on — which is the mechanical
    // cost #187 pays for the rail popup's 1.10, and the whole of it.
    for (const [what, drawn] of [
      ['as the composition stands', seen.plainMap],
      [`with every Card boosted to ${BOOSTED}`, seen.boostedMap],
    ]) {
      if (drawn.length === 0) {
        failures.push(
          `${where}: no Card has a copy of the map behind it, ${what} — nothing about the size of the ` +
            'map inside the glass was asserted',
        );
        continue;
      }
      for (const one of drawn) {
        const apart = Math.abs(one.drawn - seen.slabWidth) / seen.slabWidth;
        if (!Number.isFinite(apart)) {
          failures.push(
            `${where}: the ${one.name}'s map cannot be measured — ${one.drawn}px against the Slab's ` +
              `${seen.slabWidth}px. Nothing about it was asserted`,
          );
        } else if (apart > SAME_MAP) {
          failures.push(
            `${where}, ${what}: the map behind the ${one.name} is drawn ${one.drawn}px wide and the map ` +
              `beside it ${seen.slabWidth}px — ${(apart * 100).toFixed(1)}% apart. One capture pixel is ` +
              "the same size inside a Card's glass as it is on the Slab, or the Card is a lens",
          );
        }
      }
    }

    for (const [end, hidden] of [
      ['flat', seen.flatHidden],
      ['raised', seen.raisedHidden],
    ]) {
      if (hidden.length > 0) {
        failures.push(
          `${where}: ${hidden.length} of the Section's own boxes are invisible at the Lift's ${end} end — ` +
            `${hidden.join(', ')}. Nothing here may be hidden in CSS and uncovered by the Timeline: the ` +
            'raised end is what a reader whose scripts never arrived is looking at',
        );
      }
    }

    // ---- the leader lines -------------------------------------------------
    if (seen.overlay === null) {
      failures.push(
        `${where}: the composition has no leader-line overlay, so nothing joins the four numbered ` +
          'points to the parts of the Exploded View they name',
      );
    } else {
      if (seen.overlay.spoken) {
        failures.push(
          `${where}: the leader lines are not aria-hidden — they carry nothing that is not already ` +
            "in the four points' own words, and a reader listening is owed the words rather than " +
            'four rules read out as graphics',
        );
      }
      if (seen.overlay.says.length > 0) {
        failures.push(
          `${where}: the leader-line overlay carries text — "${seen.overlay.says.slice(0, 40)}". A rule ` +
            'may say nothing the text does not',
        );
      }

      const named = seen.rules.raised.map((rule) => rule.part);
      // ONE RULE PER POINT AND ONE PART PER RULE. The schema fails the build if a
      // point names no part or if two name one; this is the half a schema cannot
      // see — whether the parts named are the parts that are actually there.
      if (named.length !== seen.numbered) {
        failures.push(
          `${where}: ${seen.numbered} numbered point(s) and ${named.length} leader line(s) — every point ` +
            'is joined to the part it names, and no rule belongs to no point',
        );
      }
      for (const { part } of seen.anchored) {
        if (!named.includes(part)) {
          failures.push(
            `${where}: the ${part} is part of the Exploded View and no numbered point names it — ` +
              'no part without a number',
          );
        }
      }
      for (const rule of seen.rules.raised) {
        if (!rule.named) {
          failures.push(
            `${where}: a point names "${rule.part}", which is nothing in the Exploded View — ` +
              'no number without a part',
          );
        }
      }
    }

    // EVERY MOMENT, NOT JUST THE TWO ENDS. A rule computed from a Card's
    // untransformed box, or computed once and never again, is right at the flat
    // frame and wrong everywhere else — and the flat frame is the one a still is
    // most likely to be taken at.
    for (const [when, drawn] of [
      ['flat', seen.rules.flat],
      [`${HALF_WAY} of the way up`, seen.rules.halfWay],
      ['raised', seen.rules.raised],
    ]) {
      for (const rule of drawn) {
        if (rule.anchor === null || rule.hookY === null) {
          failures.push(
            `${where}: the ${rule.part} rule has no ${rule.anchor === null ? 'anchor' : 'hook'} to be ` +
              'drawn between, so nothing about where it lands was checked',
          );
          continue;
        }
        if (rule.drawn.length < 2) {
          failures.push(
            `${where}, ${when}: the ${rule.part} rule is not drawn — ${rule.drawn.length} point(s) on it. ` +
              'A numbered point with no line is a claim with nothing to attach it to',
          );
          continue;
        }
        const [tipX, tipY] = rule.drawn[rule.drawn.length - 1];
        const off = Math.hypot(tipX - rule.anchor.x, tipY - rule.anchor.y);
        // NaN on either side is a comparison that is false, which would read as a
        // pass — the shape scripts/checks/NOTES.md warns about three times.
        if (!Number.isFinite(off)) {
          failures.push(
            `${where}, ${when}: the ${rule.part} rule cannot be measured — it ends at ${tipX},${tipY} and ` +
              `the corner is at ${rule.anchor.x},${rule.anchor.y}. Nothing about it was asserted`,
          );
        } else if (off > ATTACHED) {
          failures.push(
            `${where}, ${when}: the ${rule.part} rule ends ${off.toFixed(1)}px from the corner it names — ` +
              `at ${tipX},${tipY} against ${rule.anchor.x},${rule.anchor.y}. A leader line beginning in ` +
              'empty space is the fault the design reference has and this Section does not',
          );
        }
        const [footX, footY] = rule.drawn[0];
        if (Math.abs(footY - rule.hookY) > ATTACHED) {
          failures.push(
            `${where}, ${when}: the ${rule.part} rule leaves its point at ${footX},${footY} and the point's ` +
              `own row is at ${rule.hookY} — the rule is not attached to the number it belongs to`,
          );
        }
        if (rule.sits === false) {
          failures.push(
            `${where}, ${when}: the ${rule.part} rule's anchor is not on the part it names — it is drawn ` +
              'from a corner of something else, so the correspondence is wrong wherever it looks right',
          );
        }

        // ---- AND THE RULE ENDS IN A LIT DOT ON THE PART (#191) --------------
        // Three things about it, and each fails a different way. It is DRAWN —
        // an SVG circle with no centre sits at the overlay's origin, and the
        // stylesheet gates its radius on the centre precisely so that a
        // scriptless reader gets nothing rather than four dots in the corner, so
        // "not drawn" and "drawn in the wrong place" are two different faults. It
        // is ON the terminus, read off the circle's own painted box rather than
        // off the attribute the script wrote, which is what makes this a claim
        // about the drawing instead of about the write. And it PAINTS: a radius
        // of nothing and a fill that computes transparent are both a dot that is
        // there and invisible, and both would leave every assertion above passing.
        const [turnX, turnY] = rule.drawn[1] ?? rule.drawn[0];
        for (const [name, mark, on] of [
          ['lit dot', rule.tip, { x: tipX, y: tipY }],
          ['shoulder dot', rule.knee, { x: turnX, y: turnY }],
        ]) {
          if (!mark) {
            failures.push(
              `${where}, ${when}: the ${rule.part} rule has no ${name} — a leader line that reaches its ` +
                'part and stops is the fault the design reference has, and the dot is what says "this, ' +
                'here, is the thing the number is about"',
            );
            continue;
          }
          if (!mark.drawn) {
            failures.push(
              `${where}, ${when}: the ${rule.part} rule's ${name} carries no centre, so it is not drawn ` +
                'at all',
            );
            continue;
          }
          const off = Math.hypot(mark.x - on.x, mark.y - on.y);
          if (!Number.isFinite(off) || off > ATTACHED) {
            failures.push(
              `${where}, ${when}: the ${rule.part} rule's ${name} is painted at ${mark.x},${mark.y} and ` +
                `the rule's own point is at ${on.x},${on.y} — ${Number.isFinite(off) ? `${off.toFixed(1)}px` : 'no distance'} ` +
                'apart. The dot is a vertex of the rule and not a second opinion about where it goes',
            );
          }
          if (!(mark.r > 0)) {
            failures.push(
              `${where}, ${when}: the ${rule.part} rule's ${name} has a radius of ${mark.r} — it is in the ` +
                'document and paints nothing',
            );
          }
          if (!(mark.alpha > 0)) {
            failures.push(
              `${where}, ${when}: the ${rule.part} rule's ${name} is filled with something that rasterises ` +
                `to alpha ${mark.alpha} — a dot drawn in a transparent colour is a dot nobody can see`,
            );
          }
        }
      }
    }

    // THE ANCHOR RIDES THE CAMERA, AND SINCE #189 THAT IS ASKED OF THE MARKUP. An
    // anchor outside the transformed subtree stands still while its part is turned,
    // and a rule to it stays attached to the anchor and detaches from the PART —
    // which every assertion above would still pass. It used to be caught by
    // geometry: both ends of the Lift found such an anchor in one place. The SLAB's
    // anchor is in one place at both ends now because the Slab is, which is the
    // whole point of the ticket, so the geometry can no longer tell the two apart
    // and containment is the question that assertion was asking all along.
    for (const { part, projected } of seen.anchored) {
      if (!projected) {
        failures.push(
          `${where}: the ${part}'s anchor is not inside .eater-map__plane — it stands outside the ` +
            'projection, so what the rule is drawn to is where the part would be if it were never turned',
        );
      }
    }

    // AND THE THREE CARDS' ANCHORS STILL MOVE, which is the geometry half and is
    // the Cards' alone: they are what the Lift carries, so an anchor of theirs that
    // stands still is one that is not riding the depth even though it is inside the
    // projection — a `position: fixed` in the vendored markup would do it, and
    // containment would not notice.
    for (const rule of seen.rules.flat) {
      if (rule.part === 'slab') continue;
      const up = seen.rules.raised.find((other) => other.part === rule.part);
      if (!rule.anchor || !up?.anchor) continue;
      if (Math.hypot(up.anchor.x - rule.anchor.x, up.anchor.y - rule.anchor.y) <= ATTACHED) {
        failures.push(
          `${where}: the ${rule.part}'s anchor is in the same place at both ends of the Lift — ` +
            `${rule.anchor.x},${rule.anchor.y}. It is inside the projection and is not riding its Card's ` +
            'own climb, so a rule to it comes off the map rather than off the Card',
        );
      }
    }

    if (seen.reachable > 0) {
      failures.push(
        `${where}: ${seen.reachable} focusable element(s) inside the Exploded View — it is a ` +
          'picture of an app, and its controls belong to no page a reader can be sent to',
      );
    }
    if (seen.announced > 0) {
      failures.push(
        `${where}: ${seen.announced} heading(s) inside the Exploded View — a restaurant's name is ` +
          "the app's heading and not this document's, and it is in the outline a reader navigates by",
      );
    }

    return failures;
  } finally {
    await context.close();
  }
}

/**
 * Leaving the Section part way up puts the drawing back down.
 *
 * The Lift runs when the reader comes to rest here and reverses if they leave
 * before it finishes, and **the failure this catches is one that shipped for an
 * afternoon**: `arrived()` compared the scroll against the trigger's start with
 * `>=` where ScrollTrigger's own `isActive` is strict, the leaving toggle is
 * delivered at exactly that position about half the time, and the Lift ran on to
 * the raised end instead of coming back down on half the turns back. A reader who
 * turns away meets a Section that carried on without them, and it is invisible on
 * any still of either end.
 *
 * NO WHEEL AND NO CLOCK IN IT. The page is put on the port and taken off it, which
 * is what the Lift's trigger actually reads — `turn` is where a wheel notch is
 * asserted, and borrowing it here would make this Check fail for the Kernel's
 * reasons. Both waits are `waitForFunction` rather than a sleep, so there is no
 * sampling window to miss: one waits for the Lift to be genuinely part way up, the
 * other for it to arrive back down.
 *
 * NO DISTANCE AND NO DURATION IS ASSERTED. How high, how fast and how far into the
 * Lift the reader gets are the author's; that it comes back down is the device.
 */
async function reversesOnTheWayOut(browser, origin) {
  const { context, page } = await open(browser, origin, { viewport: WIDE });
  try {
    const failures = await settle(page);

    // The Section's own resting place, and the one before it. Read off the Kernel
    // rather than computed here, so a Section that changes where it lands does not
    // need this Check changed with it.
    const ports = await page.evaluate(() => window.portfolio?.ports?.() ?? []);
    if (ports.length < 2) {
      failures.push(
        `the page has ${ports.length} resting place(s) at ${WIDE.width}x${WIDE.height}, so there is no ` +
          'turn to take and nothing about leaving the Section part way up was checked',
      );
      return failures;
    }
    const here = ports[ports.length - 1];
    const before = ports[ports.length - 2];

    const partWay = await page
      .evaluate((to) => {
        window.portfolio?.snapping?.(false);
        window.scrollTo(0, to);
      }, here)
      .then(() =>
        page.waitForFunction(
          () => {
            const at = window.portfolio?.timelines.get('eater-map')?.progress() ?? 0;
            return at > 0.05 && at < 0.95 ? at : false;
          },
          undefined,
          { timeout: 5000 },
        ),
      )
      .then((handle) => handle.jsonValue())
      .catch(() => null);

    if (partWay === null) {
      const at = await page.evaluate(
        () => window.portfolio?.timelines.get('eater-map')?.progress() ?? null,
      );
      failures.push(
        `arriving at the Section left the Lift at ${at} rather than running it — nothing was checked ` +
          'about a reader who turns back part way up',
      );
      return failures;
    }

    const back = await page
      .evaluate(async ([to, creep]) => {
        // OUT A PIXEL AT A TIME BEFORE THE JUMP, and this is the whole strength of
        // this Check rather than a flourish. The Lift is armed a hair ABOVE the
        // resting place — a trigger starting exactly on it would be at progress 0
        // when the reader is standing there and would never fire — so leaving is a
        // question asked at a boundary, and the answer is only wrong AT that
        // boundary. A reader easing out crosses it; a `scrollTo` past it does not,
        // and the version of this Check that only jumped passed the bug it was
        // written for three times in a row.
        for (let step = 1; step <= creep; step += 1) {
          window.scrollTo(0, window.scrollY - 1);
          await new Promise((frame) => requestAnimationFrame(frame));
        }
        window.scrollTo(0, to);
      }, [before, CREEP])
      .then(() =>
        page.waitForFunction(
          () => (window.portfolio?.timelines.get('eater-map')?.progress() ?? 1) < 0.001,
          undefined,
          { timeout: 5000 },
        ),
      )
      .then(() => true)
      .catch(() => false);

    if (!back) {
      const at = await page.evaluate(
        () => window.portfolio?.timelines.get('eater-map')?.progress() ?? null,
      );
      failures.push(
        `the reader left the Section at ${partWay.toFixed(3)} of the Lift and it went on to ${at} instead ` +
          'of reversing — the Section carried on without them',
      );
    }

    await page.evaluate(() => window.portfolio?.snapping?.(true));
    return failures;
  } finally {
    await context.close();
  }
}

/**
 * The Section's own boxes, in the SECTION'S OWN COORDINATES.
 *
 * Relative to `.eater-map`'s top-left rather than to the document's, and that is
 * the whole of what makes the three readers comparable: a scriptless page has no
 * Front Screen reveal and a Panel that answers `@media (scripting: none)`, so the
 * Sections ABOVE this one are not the same height in all three — and a comparison
 * in document coordinates would report every box in this Section as moved by the
 * same number and say nothing at all about this Section.
 */
function composition(page) {
  return page.evaluate(() => {
    const section = document.querySelector('.eater-map');
    if (!section) return null;
    const origin = section.getBoundingClientRect();
    const round = (n) => Math.round(n * 100) / 100;
    /** @type {Record<string, { x: number, y: number, w: number, h: number }>} */
    const boxes = {};
    const put = (name, element) => {
      if (!element) return;
      const box = element.getBoundingClientRect();
      boxes[name] = {
        x: round(box.x - origin.x),
        y: round(box.y - origin.y),
        w: round(box.width),
        h: round(box.height),
      };
    };
    for (const part of ['__head', '__copy', '__stage', '__slab', '__points']) {
      put(part, section.querySelector('.eater-map' + part));
    }
    for (const card of section.querySelectorAll('[data-eater-card]')) {
      put('card:' + card.getAttribute('data-eater-card'), card);
    }
    // THE PLAYHEAD TRAVELS WITH THE BOXES, because it is spent on more than them.
    // Collapsed, the geometry is pinned by `transform: none` whatever the playhead
    // holds — so a reader left at the raised end gets an IDENTICALLY SHAPED drawing
    // whose Cards show a piece of map through their glass that is not the piece
    // underneath them, because each backdrop is offset by that Card's RESTING place
    // and the drift is what the playhead spends. A comparison of rects alone
    // reports that as one composition; this is what makes it a difference.
    return { lift: getComputedStyle(section).getPropertyValue('--eater-map-lift').trim(), boxes };
  });
}

/**
 * Below the band: the drawing has collapsed, and every reader gets the same one.
 *
 * Six things, and the reason each is here rather than left to a person looking
 * at the page is that each fails by a few pixels or by nothing visible at all.
 *
 * ONE. IT IS ACTUALLY COLLAPSED. Asked first and answered with a bail, because
 * every assertion under it is about the collapsed composition and would pass
 * VACUOUSLY against the wide one — a Check reading the Exploded View and finding
 * the Exploded View intact is the shape scripts/checks/NOTES.md warns about three
 * times.
 *
 * TWO. NO PART OF THE PERSPECTIVE SURVIVES. The plane carries no transform and
 * stands in no 3D rendering context, and every Card is drawn at the Slab's own
 * scale — which is the flat frame's one relationship, asserted here for the same
 * reason it is asserted in the band and with more force: down here it is not a
 * frame the drawing passes through, it is where the drawing stays.
 *
 * THREE. THE SLAB IS FULL-BLEED. Both edges, against the DOCUMENT'S client width
 * and not `100vw` — the scrollbar's gutter is the difference between the two, the
 * suite runs with the gutter on for exactly that reason, and a box centred in what
 * it overflows would hang half the error out of each edge.
 *
 * FOUR. THE FOUR FEATURES ARE AN ORDINARY LIST BENEATH IT, in the LAYOUT and in
 * the DOCUMENT both. The second half is the one worth writing down: the collapse
 * could have been had with `order` or a `grid-row`, and then a reader looking at
 * the page and a reader hearing it would be given two different sequences — which
 * is invisible to everyone who can see the screen.
 *
 * FIVE. THERE ARE NO LEADER LINES. The points stand BENEATH the picture out
 * here, so a rule from one to its part would run back up the page and join a
 * paragraph to a corner off the top of the screen (#178). The rules may go —
 * everything they carry is in the points' own words — and they have to, because
 * a rule drawn before a resize would otherwise still be lying across the stack
 * afterwards. Asserted of the overlay's own `display`, which is the declaration
 * leaders.ts reads, so this is the same question the drawing asks itself.
 *
 * SIX. THE LIFT DOES NOT RUN. Waited out rather than sampled: the Lift takes
 * `--eater-map-lift-time` end to end, so the page is put on the Section and the
 * playhead is watched for longer than that. A Lift that ran would be well off 0
 * within a frame or two of arriving. **The pass is a TIMEOUT and not merely a
 * rejection**, and the two are told apart on purpose — a predicate that throws
 * rejects exactly as a playhead that never moved does, and taking either for the
 * answer is how a Check comes to assert nothing while reading as though it does.
 */
async function collapsedBelowTheBand(browser, origin) {
  const { context, page } = await open(browser, origin, { viewport: NARROW });
  const where = `${NARROW.width}x${NARROW.height}`;
  try {
    const failures = (await settle(page)).map((why) => `${where}: ${why}`);

    const seen = await page.evaluate(
      (focusable) => {
        const section = document.querySelector('.eater-map');
        const slab = document.querySelector('.eater-map__slab');
        const plane = document.querySelector('.eater-map__plane');
        const cardHost = document.querySelector('.eater-map__cards');
        const stage = document.querySelector('.eater-map__stage');
        const points = document.querySelector('.eater-map__points');
        if (!section || !slab || !plane || !cardHost || !stage || !points) {
          return { missing: 'the Section, the Slab, the plane, the Cards or the points are not on the page' };
        }

        const round = (n) => Math.round(n * 100) / 100;
        const slabBox = slab.getBoundingClientRect();
        const stageBox = stage.getBoundingClientRect();
        const pointsBox = points.getBoundingClientRect();
        const items = [...points.children].map((item) => {
          const box = item.getBoundingClientRect();
          return { top: round(box.top), bottom: round(box.bottom) };
        });

        return {
          missing: null,
          collapsed: getComputedStyle(section).getPropertyValue('--eater-map-collapsed').trim(),
          lift: getComputedStyle(section).getPropertyValue('--eater-map-lift').trim(),
          planeTransform: getComputedStyle(plane).transform,
          planeStyle: getComputedStyle(plane).transformStyle,
          cardsStyle: getComputedStyle(cardHost).transformStyle,
          app: Number.parseFloat(getComputedStyle(slab).getPropertyValue('--eater-map-app-w')),
          slabWidth: round(slabBox.width),
          slabLeft: round(slabBox.left),
          clientWidth: document.documentElement.clientWidth,
          stageBottom: round(stageBox.bottom),
          pointsTop: round(pointsBox.top),
          items,
          // `DOCUMENT_POSITION_FOLLOWING` on the stage's answer about the points:
          // the picture comes first in the markup as well as on the screen.
          pointsFollowTheStage: Boolean(
            stage.compareDocumentPosition(points) & Node.DOCUMENT_POSITION_FOLLOWING,
          ),
          cards: [...document.querySelectorAll('[data-eater-card]')].map((card) => {
            const box = card.getBoundingClientRect();
            return {
              name: card.getAttribute('data-eater-card') ?? '(unnamed)',
              drawn: round(box.width),
              declared: Number.parseFloat(getComputedStyle(card).width),
            };
          }),
          hidden: [...document.querySelectorAll('.eater-map__stage [class*="eater-map__"]')]
            .filter((element) => {
              const style = getComputedStyle(element);
              return Number.parseFloat(style.opacity) === 0 || style.visibility === 'hidden';
            })
            .map((element) => element.className),
          reachable: [...stage.querySelectorAll(focusable)].filter((el) => el.tabIndex >= 0).length,
          leaders: (() => {
            const overlay = document.querySelector('[data-eater-map-leaders]');
            return overlay ? getComputedStyle(overlay).display : null;
          })(),
        };
      },
      FOCUSABLE,
    );

    if (seen.missing) {
      failures.push(`${where}: ${seen.missing}`);
      return { failures, composition: null };
    }

    // ONE, and it bails: everything under it reads the collapsed composition, and
    // against the wide one every line of it would pass while asserting nothing.
    if (seen.collapsed !== '1') {
      failures.push(
        `${where}: the Section says --eater-map-collapsed is "${seen.collapsed}" — this window is below the ` +
          'band and the composition is meant to have collapsed here, so nothing about the collapse was ' +
          'checked. Either the breakpoint moved or this Check is reading the wrong window',
      );
      return { failures, composition: null };
    }

    // Read before the page is moved onto the Section below, and handed back so
    // the two other readers are compared against a composition rather than
    // against a second description of one.
    const ordinary = await composition(page);

    // TWO.
    if (seen.planeTransform !== 'none' || seen.planeStyle !== 'flat' || seen.cardsStyle !== 'flat') {
      failures.push(
        `${where}: the plane is drawn with transform ${seen.planeTransform} in a ${seen.planeStyle} ` +
          `rendering context and the Cards stand in a ${seen.cardsStyle} one — no part of the Exploded ` +
          "View's perspective may survive the collapse, and a camera with every angle at zero still " +
          'projects',
      );
    }
    if (Number.parseFloat(seen.lift) !== 0) {
      failures.push(
        `${where}: --eater-map-lift computes to ${seen.lift} on a collapsed composition — the geometry is ` +
          "pinned by `transform: none` down here whatever the playhead holds, but each Card's glass " +
          'carries a copy of the map offset by that Card\'s RESTING place, so a drifted Card shows a map ' +
          'behind its glass that is not the map underneath it',
      );
    }

    const slabScale = seen.slabWidth / seen.app;
    for (const card of seen.cards) {
      const drawnScale = card.drawn / card.declared;
      if (!Number.isFinite(drawnScale) || !Number.isFinite(slabScale) || drawnScale <= 0) {
        failures.push(
          `${where}: the ${card.name} Card cannot be measured — ${card.drawn}px drawn over ` +
            `${card.declared}px declared. Nothing about its scale was asserted`,
        );
        continue;
      }
      if (Math.abs(drawnScale - slabScale) / slabScale > SCALE_TOLERANCE) {
        failures.push(
          `${where}: collapsed, the ${card.name} Card is drawn at ${drawnScale.toFixed(4)} and the Slab at ` +
            `${slabScale.toFixed(4)} — the flat composition is a screenshot of the app, and a Card at any ` +
            'other scale is a sticker on a photograph',
        );
      }
    }

    // THREE.
    if (
      Math.abs(seen.slabWidth - seen.clientWidth) > BLEED_TOLERANCE ||
      Math.abs(seen.slabLeft) > BLEED_TOLERANCE
    ) {
      failures.push(
        `${where}: the Slab is ${seen.slabWidth}px wide at x=${seen.slabLeft} in a ${seen.clientWidth}px ` +
          'document — collapsed it runs to both edges of the window, and the page\'s own margin on either ' +
          'side is what it has to spend back',
      );
    }
    // NOT "does the DOCUMENT overflow", which is the obvious next assertion and
    // is a claim about the whole page rather than about this Section. The Section
    // is `overflow-x: clip`, so it could not push the page sideways if it tried,
    // and the assertion would be answering for whichever Section happens to have
    // a full-bleed box in it — it caught the Front Screen's `100vw` photograph
    // strip on its first run, which is a real 7.5px on either side and none of
    // this ticket's business. THAT ASSERTION NOW HAS ITS OWN CHECK — `across`,
    // added by #186, which fixed the strip — so what is left here is deliberately
    // narrower rather than missing. The two lines above are the claim with teeth:
    // a `100vw` Slab in a window with a scrollbar is 15px too wide and CENTRED in
    // what it overflows, so it misses both edges by half of that, and neither
    // half is something `across` could say about this Section.

    // FOUR.
    if (!(seen.pointsTop >= seen.stageBottom - 1)) {
      failures.push(
        `${where}: the four features start at y=${seen.pointsTop} and the Slab ends at y=${seen.stageBottom} ` +
          '— collapsed they read as an ordinary list BENEATH the picture, not beside it or above it',
      );
    }
    if (!seen.pointsFollowTheStage) {
      failures.push(
        `${where}: the points come BEFORE the stage in the document while coming after it on the screen — a ` +
          'reader hearing the page and a reader looking at it are being given two different sequences',
      );
    }
    if (seen.items.length !== 4) {
      failures.push(
        `${where}: the list under the Slab has ${seen.items.length} item(s) — the Exploded View names four ` +
          'features and the collapse is where they are read as a list',
      );
    }
    for (let index = 1; index < seen.items.length; index += 1) {
      const above = seen.items[index - 1];
      const item = seen.items[index];
      if (!(item.top >= above.bottom - 1)) {
        failures.push(
          `${where}: feature ${index + 1} starts at y=${item.top} and feature ${index} ends at ` +
            `y=${above.bottom} — collapsed the four are one under another, which is what "an ordinary list" ` +
            'means and what a column has room for',
        );
      }
    }

    if (seen.hidden.length > 0) {
      failures.push(
        `${where}: ${seen.hidden.length} of the Section's own boxes are invisible — ${seen.hidden.join(', ')}. ` +
          'The collapsed composition is what a reader down here is looking at, and nothing in it may be ' +
          'hidden in CSS waiting for a Timeline that never runs',
      );
    }
    if (seen.reachable > 0) {
      failures.push(
        `${where}: ${seen.reachable} focusable element(s) inside the collapsed picture — it is a picture of ` +
          'an app, and its controls belong to no page a reader can be sent to',
      );
    }

    // FIVE.
    if (seen.leaders !== null && seen.leaders !== 'none') {
      failures.push(
        `${where}: the leader lines are still drawn (display: ${seen.leaders}) where the Exploded View has ` +
          'collapsed — the points stand beneath the picture out here, so a rule from one to its part runs ' +
          'back up the page to a corner off the top of the screen',
      );
    }

    // SIX. Long enough that a Lift which ran would be at its far end, read off
    // the Section's own Token rather than guessed at, so a slower Lift does not
    // quietly turn this into a sampling window that misses.
    const lifted = await page
      .evaluate(async () => {
        const section = document.querySelector('.eater-map');
        if (!section) return 0;
        const raw = getComputedStyle(section).getPropertyValue('--eater-map-lift-time');
        const value = Number.parseFloat(raw);
        const seconds = Number.isFinite(value) ? (raw.trim().endsWith('ms') ? value / 1000 : value) : 1.15;
        // Onto the Section, which is where the Lift would be armed if anything
        // armed it. No snapping to lift: below the band there is one port and no
        // page turn, which is the whole reason the composition collapsed.
        window.scrollTo(0, section.getBoundingClientRect().top + window.scrollY);
        return Math.max(1, seconds);
      })
      .then((seconds) =>
        page.waitForFunction(
          () => (window.portfolio?.timelines.get('eater-map')?.progress() ?? 0) > 0.001,
          undefined,
          { timeout: seconds * 1000 + 500 },
        ),
      )
      .then(() => 'ran')
      // A TIMEOUT IS THE PASS AND EVERY OTHER REJECTION IS NOT, which is the
      // difference between an assertion and the appearance of one. `waitForFunction`
      // rejects with a TimeoutError when the playhead never moved — that is the
      // answer this wants. It rejects the same way if the predicate throws, if the
      // page navigated, or if the Kernel stopped registering a Timeline under this
      // name, and a bare `catch(() => null)` reports every one of those as "the
      // Lift correctly did not run" while having read nothing.
      .catch((error) => (error?.name === 'TimeoutError' ? null : error));

    if (lifted === 'ran') {
      const at = await page.evaluate(
        () => window.portfolio?.timelines.get('eater-map')?.progress() ?? null,
      );
      failures.push(
        `${where}: coming to rest on the Section ran the Lift to ${at} — below the band there is no page ` +
          'turn to settle and no Exploded View to assemble, and a phone quietly tilting itself under a ' +
          'column is the composition this window collapsed to get away from',
      );
    } else if (lifted !== null) {
      failures.push(
        `${where}: watching the Lift's playhead failed rather than timing out — ${lifted}. Nothing was ` +
          'asserted about whether the Lift runs below the band',
      );
    }

    return { failures, composition: ordinary };
  } finally {
    await context.close();
  }
}

/**
 * One composition, and not a third arrangement.
 *
 * The collapse is written as rules on the markup's own resting state, so the
 * narrow reader, the reader who asked for no motion and the reader whose scripts
 * never arrived are all handed the same drawing — and this is that stated as an
 * EQUALITY rather than as three descriptions of what each one should get. Three
 * descriptions is three things to keep true; one equality is what actually stops
 * a fourth arrangement growing under one reader while nobody is looking at that
 * reader's window.
 *
 * NEITHER OF THE TWO IS SETTLED, and for two different reasons. Nothing scrubs
 * under reduced motion, and nothing MOUNTS with no script at all — everything
 * compared here is prerendered and laid out by a stylesheet, which is exactly the
 * claim. What is waited for instead is the faces, because three of the boxes are
 * text and a comparison taken mid-swap would report a difference that is a font
 * arriving.
 */
async function everyReaderGetsIt(browser, origin, ordinary) {
  /** @type {string[]} */
  const failures = [];
  const where = `${NARROW.width}x${NARROW.height}`;

  for (const [reader, options] of [
    ['who asked for no motion', { reducedMotion: 'reduce' }],
    ['whose scripts never arrived', { javaScriptEnabled: false }],
  ]) {
    const { context, page } = await open(browser, origin, { viewport: NARROW, ...options });
    try {
      await page.evaluate(() => document.fonts.ready).catch(() => {});
      const theirs = await composition(page);
      if (theirs === null) {
        failures.push(`${where}: the reader ${reader} has no Eater Map Section on the page at all`);
        continue;
      }
      if (theirs.lift !== ordinary.lift) {
        failures.push(
          `${where}: the reader ${reader} is given --eater-map-lift ${theirs.lift} where an ordinary reader ` +
            `gets ${ordinary.lift} — collapsed, the playhead is what fills the Cards' glass, and a drawing ` +
            'the same shape with different glass in it is still a second composition',
        );
      }
      for (const [name, box] of Object.entries(ordinary.boxes)) {
        const mine = theirs.boxes[name];
        if (!mine) {
          failures.push(
            `${where}: the reader ${reader} has no ${name} in the Section — the collapsed composition is ` +
              'one drawing every reader down here gets, and this one is missing a piece of it',
          );
          continue;
        }
        const apart = Math.max(
          Math.abs(mine.x - box.x),
          Math.abs(mine.y - box.y),
          Math.abs(mine.w - box.w),
          Math.abs(mine.h - box.h),
        );
        if (apart > SAME_TOLERANCE) {
          failures.push(
            `${where}: the reader ${reader} gets ${name} at ${mine.x},${mine.y} ${mine.w}x${mine.h} where an ` +
              `ordinary reader gets ${box.x},${box.y} ${box.w}x${box.h} — the collapse is meant to be ONE ` +
              'composition serving all three, and this is a third arrangement',
          );
        }
      }
    } finally {
      await context.close();
    }
  }
  return failures;
}

/**
 * What the slice stack baked into its gradients, read off the page.
 *
 * SERIALISED INTO THE PAGE AND CALLED TWICE — once at each end of the band — so it
 * closes over nothing and takes its two numbers as arguments. Everything it reads
 * is `edge.ts`'s OWN OUTPUT: the string each slice was written with, the colours the
 * browser resolved that string to, and what is actually under the four corners of
 * the Slab. Nothing here recomputes the shading, because a Check that re-derived it
 * would be asking the composition to confirm its own arithmetic.
 *
 * CHANNELS AND NOT A BRIGHTNESS. Turning three bytes into the one number a Check
 * asserts on is `lib/colour.mjs`'s job and it is emphatic about how: WCAG
 * luminance, linearised and weighted, never a channel mean. So this half reads the
 * colour and the node half weighs it, which is the arrangement the `ground` Check
 * already has.
 *
 * IT PUTS THE SECTION ON SCREEN FIRST, and it has to: `elementsFromPoint` takes
 * VIEWPORT coordinates, and `settle()` leaves the page at the top with the Exploded
 * View a couple of thousand pixels below the fold — where every rect still reads
 * correctly and every hit test finds nothing at all. The snapping is lifted for the
 * scroll for the reason `scripts/checks/NOTES.md` gives, and put back.
 *
 * @param {{ corner: number, mutant: string }} spec
 */
async function edgeAsBuilt(spec) {
  const section = document.querySelector('.eater-map');
  const slab = document.querySelector('.eater-map__slab');
  const cards = document.querySelector('.eater-map__cards');
  if (!section || !slab || !cards) {
    return { missing: 'the Section, the Slab or the Cards are not on the page' };
  }

  const kernel = window.portfolio;
  const ports = kernel?.ports?.() ?? [];
  kernel?.snapping?.(false);
  window.scrollTo(0, ports[ports.length - 1] ?? 0);
  await new Promise((frame) => requestAnimationFrame(frame));
  await new Promise((frame) => requestAnimationFrame(frame));

  const stage = section.dataset.eaterMapStage ?? '(never mounted)';
  const slices = [...document.querySelectorAll('.eater-map__slice')];
  const style = getComputedStyle(section);
  const token = (name) => Number.parseFloat(style.getPropertyValue(name));

  /** Every stop of a resolved gradient, as an angle and three 0-255 channels.
   *
   *  Chromium serialises a computed gradient's colours with the `var()` and the
   *  `color-mix()` already resolved — as `color(srgb …)` for anything in sRGB — so
   *  these are the colours the reader is shown and not the expressions `edge.ts`
   *  wrote. `rgb()` is read too, because which of the two an engine picks is its
   *  own business. Clamped, because `lib/colour.mjs` refuses a channel outside
   *  0-255 and a `color(srgb …)` may serialise one a hair over after a mix. */
  const stopsIn = (value) =>
    [
      ...value.matchAll(
        /(?:color\(srgb ([-\d.]+) ([-\d.]+) ([-\d.]+)[^)]*\)|rgba?\(([^)]*)\))\s+([-\d.]+)deg/g,
      ),
    ].map((found) => {
      const channels = found[4]
        ? found[4]
            .split(/[\s,/]+/)
            .filter(Boolean)
            .slice(0, 3)
            .map((one) => Number.parseFloat(one))
        : [Number(found[1]) * 255, Number(found[2]) * 255, Number(found[3]) * 255];
      return {
        at: Number(found[5]),
        rgb: channels.map((one) => Math.min(255, Math.max(0, one))),
      };
    });

  /** The stop nearest one bearing, wrapping. For 0, 90, 180 and 270 that is always
   *  an ENDPOINT OF THE SIDE those bearings point at — a rectangle's four sides
   *  each contain one of them — and a side's two endpoints carry the same normal
   *  and therefore the same colour, so a tie between them is not a choice. */
  const near = (stops, bearing) =>
    stops.reduce(
      (best, stop) => {
        const apart = Math.abs(((stop.at - bearing + 540) % 360) - 180);
        return apart < best.apart ? { apart, rgb: stop.rgb } : best;
      },
      { apart: Number.POSITIVE_INFINITY, rgb: null },
    ).rgb;

  // ---- one report per extruded SURFACE ------------------------------------
  // THE SLAB AND EVERY GLASS SURFACE OF EVERY CARD, which since #190 all come out
  // of `edge.ts` and are therefore all lit by the one light `stage.ts` holds. That
  // is the claim #197 makes and it is only checkable per surface: a build that lit
  // the Slab and left the Cards flat would pass any assertion about the Slab alone.
  const surfaces = {};
  for (const slice of slices) {
    const name = slice.dataset.eaterMapEdge ?? '(unnamed)';
    surfaces[name] ??= {
      slices: 0,
      walls: 0,
      blank: 0,
      unnamed: 0,
      flat: 0,
      ring: [],
      sides: null,
      shallow: null,
      deep: null,
      roundest: 0,
      squarest: Infinity,
    };
    const seen = surfaces[name];
    seen.slices += 1;
    // THE WIDEST AND THE NARROWEST CORNER ANYWHERE IN THIS STACK, for
    // `CORNER_SURVIVES`. The wall slices stand at inset 0 and carry the whole plan
    // corner, and the fillet's first ring stands at its deepest inset and carries
    // the least of it — so the two extremes are the plan corner and what is left of
    // it, without this having to know which slice is which.
    const corner = Number.parseFloat(getComputedStyle(slice).borderTopLeftRadius);
    if (Number.isFinite(corner)) {
      seen.roundest = Math.max(seen.roundest, corner);
      seen.squarest = Math.min(seen.squarest, corner);
    }
    const authored = slice.style.background;
    if (!authored.startsWith('conic-gradient(')) seen.flat += 1;
    if (!authored.includes('var(--eater-map-')) seen.unnamed += 1;
    const computed = getComputedStyle(slice).backgroundImage;
    if (computed === 'none') seen.blank += 1;
    // THE DEEPEST WALL, and named rather than counted: the wall is where the whole
    // normal is lateral, so its gradient carries the four sides at their full
    // difference. `edge.ts` writes which part each slice is.
    if (slice.dataset.eaterMapSlice === 'wall') {
      seen.walls += 1;
      // WHERE THE FIRST AND THE LAST WALL SLICE LAND, for `OFF_THE_FACE`. Both are
      // at inset 0 and differ only in depth, so the distance between them on screen
      // is the projection of this surface's own thickness and nothing else.
      const at = slice.getBoundingClientRect();
      seen.shallow ??= { left: at.left, top: at.top };
      seen.deep = { left: at.left, top: at.top };
      const stops = stopsIn(computed);
      if (stops.length > 0) {
        // THE ANGLES ARE KEPT WITH THE COLOURS, and that is not for the report. Two
        // stops at the SAME angle are a hard stop, which is what a SQUARE corner
        // draws and is correct — the details sheet's plan corner really is
        // `28px 28px 0 0`, so two of its four corners have no arc to ramp along.
        // Without the angle a Check cannot tell that from a shading that steps.
        seen.ring = stops.map((stop) => ({ at: stop.at, rgb: stop.rgb }));
        seen.sides = {
          head: near(stops, 0),
          right: near(stops, 90),
          foot: near(stops, 180),
          left: near(stops, 270),
        };
      }
    }
  }

  // ---- the four corners of the Slab ---------------------------------------
  // WHERE THE NOTCH WOULD BE. Four hinged walls have to be inset by the corner
  // radius at both ends, so they leave an empty quarter-disc at each corner —
  // between the picture, which is clipped back to a rounded rect inset by the
  // FILLET and cut to `plan corner - fillet`, and the Slab's own rounded outline.
  // Along the outward diagonal from the corner's arc centre that region runs from
  // nothing out to a full PLAN radius, so half a radius is its middle and the most
  // margin there is to have.
  //
  // A ZERO-SIZED PROBE ON THE PLANE IS WHAT PROJECTS IT, which is the same device
  // the parallel-projection assertion above uses and for the same reason: the Check
  // states the point in the drawing's own plan and lets the composition's rotation
  // say where that lands, rather than doing the projection itself.
  //
  // AND THE TWO RADII COME FROM THE TOKENS, NOT FROM A SLICE'S OWN BORDER-RADIUS.
  // That looks like the thing NOTES.md warns against — recomputing what the page
  // could be asked for — and here it is the opposite. The point being sampled is
  // where the composition SAYS its corner is; taking it off the element instead
  // would let a slice drawn to the wrong outline move the sample onto itself and
  // pass. Measured: with every slice's radius multiplied by 4, reading the Tokens
  // fails three corners and reading the element fails none.
  //
  // AND IT IS THE PLAN CORNER ALONE SINCE #200 — no `min()` against the thickness.
  // That clamp belongs to the fillet, which is a different Token now and is not
  // what draws this outline: every wall slice is a whole rounded rect cut to the
  // plan corner, so the corner the probe is looking for is the plan corner's.
  const plan = Math.max(0, token('--eater-map-slab-edge-radius'));
  const box = slab.getBoundingClientRect();
  // A percentage `left` resolves against the containing block's width and a
  // percentage `top` against its height, and the radius is a share of the WIDTH —
  // so the two are not the same number on a box 2.17 times as tall as it is wide.
  const across = plan * 100;
  const down = box.height > 0 ? ((plan * box.width) / box.height) * 100 : 0;
  const offAcross = (spec.corner / Math.SQRT2) * across;
  const offDown = (spec.corner / Math.SQRT2) * down;
  const held = slices.map((slice) => slice.style.pointerEvents);
  // LIFTED FOR THE LENGTH OF THE READ AND PUT STRAIGHT BACK. A slice is
  // `pointer-events: none` so that the drawing is not a hit target, and an element
  // with it is not in `elementsFromPoint`'s answer at all — so without this every
  // corner reads as open and the assertion is inverted rather than merely wrong.
  for (const slice of slices) slice.style.pointerEvents = 'auto';
  const corners = {};
  for (const [name, at] of Object.entries({
    head_left: [across - offAcross, down - offDown],
    head_right: [100 - across + offAcross, down - offDown],
    foot_right: [100 - across + offAcross, 100 - down + offDown],
    foot_left: [across - offAcross, 100 - down + offDown],
  })) {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;left:${at[0]}%;top:${at[1]}%;width:0;height:0`;
    cards.append(probe);
    const point = probe.getBoundingClientRect();
    probe.remove();
    const under = document.elementsFromPoint(point.left, point.top);
    corners[name] = {
      onScreen:
        point.left >= 0 &&
        point.top >= 0 &&
        point.left < window.innerWidth &&
        point.top < window.innerHeight,
      // ANYWHERE IN THE STACK AND NOT THE TOPMOST. A Card is allowed to stand in
      // front of a corner of the Slab — the search bar does, at 1440x900 — and the
      // question is whether the SOLID is closed there, which a slice under the
      // point answers whatever else is over it.
      covered: under.some((element) => element.classList?.contains('eater-map__slice')),
      top: under[0] ? String(under[0].className || under[0].tagName).split(' ')[0] : '(nothing)',
    };
  }
  for (const [index, slice] of slices.entries()) {
    const was = held[index];
    if (was) slice.style.pointerEvents = was;
    else slice.style.removeProperty('pointer-events');
  }

  // ---- is the Token still live inside the gradient? -----------------------
  // ASKED OF THE RESOLVED VALUE, because the authored string naming the Token is
  // only half the claim: a `var()` that resolves to nothing leaves a stop the parser
  // drops, and "the string mentions it" would still pass.
  const wall = slices.find(
    (slice) => slice.dataset.eaterMapEdge === 'slab' && slice.dataset.eaterMapSlice === 'wall',
  );
  const wasEdge = section.style.getPropertyValue('--eater-map-slab-edge');
  const before = wall ? getComputedStyle(wall).backgroundImage : '';
  section.style.setProperty('--eater-map-slab-edge', spec.mutant);
  const after = wall ? getComputedStyle(wall).backgroundImage : '';
  if (wasEdge) section.style.setProperty('--eater-map-slab-edge', wasEdge);
  else section.style.removeProperty('--eater-map-slab-edge');

  kernel?.snapping?.(true);
  return {
    stage,
    count: slices.length,
    /** The strings `edge.ts` WROTE, which is what a second mount must reproduce. */
    authored: slices.map((slice) => slice.style.background),
    surfaces,
    moved: before !== '' && after !== '' && before !== after,
    // The three light Tokens, so a Token deleted while `stage.ts`'s fallbacks
    // quietly hold the drawing together is a failure rather than a silence.
    light: {
      azimuth: style.getPropertyValue('--eater-map-light-azimuth').trim(),
      elevation: style.getPropertyValue('--eater-map-light-elevation').trim(),
      ambient: style.getPropertyValue('--eater-map-light-ambient').trim(),
    },
    corners,
  };
}

/**
 * TWELVE. THE EDGE HAS A DIRECTION, AND ONE LIGHT GIVES IT (#197).
 *
 * Every slice of every extrusion was one flat colour, and `stage-dom.ts` said why
 * in its own comment: a slice is one element with one background, so it cannot be
 * brighter on the side facing the light. A `conic-gradient` VARIES a background
 * around a box, so each slice now carries one stop per point of its own perimeter —
 * and what this asserts is the five things that go wrong with that.
 *
 * READ AS WCAG LUMINANCE AND NEVER AS A CHANNEL MEAN, which is `lib/colour.mjs`'s
 * own rule: the browser half hands back three channels and the node half weighs
 * them, the same split the `ground` Check has.
 *
 * ONE. THE SIDES DIFFER, ON EVERY SURFACE. `edge.ts` is the Slab's extrusion and
 * every glass surface of every Card since #190, so this is asked per surface rather
 * than of the Slab: a build that lit the Slab and left the Cards flat passes any
 * assertion about the Slab alone. What a build that dropped the lateral normal
 * fails — the shipped code before #197, exactly — is all of them at once, and it
 * measures zero rather than something small.
 *
 * TWO. THE LIGHT SAYS WHICH WAY ROUND, and this is the one opinion here about the
 * light's own Tokens. It is #187's: the light stands above and to the LEFT of the
 * page, which at the plane's attitude makes the Slab's FOOT the brighter of the two
 * flanks facing the reader. Rotate the azimuth by 180deg and the two swap, which is
 * the whole point of a light that is page-fixed rather than object-fixed. Asked of
 * the Slab alone, because the Cards are turned by the same plane and a second
 * statement of the same fact is not a second assertion.
 *
 * **ONLY TWO OF THE FOUR SIDES CAN BE LIT AT ONCE, and that is geometry rather than
 * a weakness here.** Opposite sides of a rectangle carry exactly opposite normals,
 * so one of each pair always faces away and sits at the ambient — the Slab's head
 * and right flank both measure 0.0488 against its foot's 0.1243. "Every side a
 * different brightness" is therefore read as the sides DIFFERING.
 *
 * THREE. THE BRIGHTNESS RUNS CONTINUOUSLY ROUND EACH ROUND CORNER. A corner is
 * where a shading that is really four flat sides gives itself away, so what is
 * asserted is that no single step between two consecutive stops is a large share of
 * the whole gradient's spread. Measured: 22.3% on the Slab, and 100% with the corner
 * sweeps taken out, because then the largest step IS the whole spread.
 *
 * **A STEP BETWEEN TWO STOPS AT THE SAME ANGLE IS SKIPPED, and leaving that out
 * made this fail a surface that is drawn correctly.** A SQUARE corner is two
 * coincident points carrying two different normals — a hard transition, and the
 * right drawing, because there is no arc to run a ramp along. The details sheet's
 * plan corner is `28px 28px 0 0` in the vendored stylesheet's own words, so two of
 * its four corners are exactly that and it measured 100% while looking perfect. The
 * angle is what tells a hard CORNER from a shading that steps, which is why the
 * stops are carried with theirs.
 *
 * FOUR. NO CORNER OF THE SLAB IS OPEN. The page is sampled at each of its four
 * corners, half a radius out along the diagonal — see `edgeAsBuilt` for why that is
 * the point with the most margin — and a corner with no slice under it is a corner
 * showing the page behind the Slab. This is the assertion #189's abandoned
 * prescription would have failed: four hinged walls leave a 17.1 x 11.4px notch at
 * each corner.
 *
 * FIVE. THE TOKEN IS STILL INSIDE THE GRADIENT. `--eater-map-slab-edge` has to
 * survive into every stop, or the Editor's drag of it moves nothing — which is
 * exactly what resolving the colour in JavaScript would cost, and it is the cheapest
 * thing to do by accident. Asked twice: the authored string has to name a Token, and
 * MUTATING it has to move the colour the browser resolved it to. The first alone
 * passes for a `var()` that resolves to nothing, and a gradient the parser rejected
 * computes to `none` — a slice that is present, named, full-perimeter and
 * TRANSPARENT, which is the half of "the page's ground rather than the edge's
 * colour" that element identity cannot answer.
 *
 * AND THE GRADIENT DOES NOT DEPEND ON THE WINDOW, which is two questions and not
 * one — and the obvious way of asking them asks neither.
 *
 * **"Resize the page and compare the strings" CANNOT FAIL, and it reads exactly as
 * though it can.** The gradient is computed once at mount, so a resize does not
 * touch it and the two strings are the same string; a build that DID recompute would
 * produce the same string anyway, because the gradient is exactly scale-invariant
 * (`edge.ts`). Measured, with the outline taken off `getBoundingClientRect` and
 * rounded to whole pixels: it passes. So the two halves are asked separately. The
 * SAME page is resized across the band and every assertion above is run again on it
 * — a build whose edge is wrong once the Slab has changed size fails there, whatever
 * its string says. And a SECOND page is opened at the short end, so its own mount's
 * strings can be compared with the first mount's: that is the scale invariance, and
 * it is what an outline measured off a box rather than stated as a proportion fails.
 *
 * UNDER `--stage webgl` THERE IS NOTHING HERE TO ASK ABOUT THE SLAB, and the skip is
 * printed rather than silent. That stage draws the Slab's edge into a canvas with a
 * real normal per vertex and no slices at all, so the Slab's assertions are about an
 * implementation it does not have — while a stage that never mounted at all looks
 * identical from here and is a failure. It reads the same light off the same
 * boundary, which is what putting the light there was for.
 */
async function theEdgeHasADirection(browser, origin) {
  const { context, page } = await open(browser, origin, { viewport: WIDE });
  /** What the edge actually measured, so a passing run says what it saw. Every
   *  tolerance in this group was chosen off these. */
  const notes = [];
  try {
    const failures = await settle(page);
    const spec = { corner: AT_THE_CORNER, mutant: MUTANT_EDGE };
    const wide = await page.evaluate(edgeAsBuilt, spec);
    if (wide.missing) {
      failures.push(`${WIDE.width}x${WIDE.height}: ${wide.missing}`);
      return { failures, notes };
    }
    // A STAGE THAT NEVER MOUNTED IS A FAILURE AND NOT A SKIP, and the two look
    // identical from here — both are "the stage is not dom".
    if (wide.stage !== 'dom') {
      if (STAGES.includes(wide.stage)) {
        notes.push(`the edge: skipped — the ${wide.stage} stage draws the Slab's in a canvas`);
      } else {
        failures.push(
          `${WIDE.width}x${WIDE.height}: the Section reports its stage as ${wide.stage}, so the Exploded ` +
            'View never came up and nothing about the edge was checked',
        );
      }
      return { failures, notes };
    }

    // THE SAME PAGE, CARRIED ACROSS THE BAND. Not a second page: what is asked here
    // is whether THIS mount's edge is still right once the Slab has changed size
    // under it, and a second page would answer with a second mount.
    await page.setViewportSize(SHORT);
    const short = await page.evaluate(edgeAsBuilt, spec);
    if (short.missing) failures.push(`${SHORT.width}x${SHORT.height} resized: ${short.missing}`);

    for (const [at, now] of [
      [WIDE, wide],
      [SHORT, short],
    ]) {
      if (now.missing) continue;
      const where = `${at.width}x${at.height}`;
      if (now.count === 0) {
        failures.push(
          `${where}: nothing on the page is a slice, so no object has an edge — the whole of this was ` +
            'checked against nothing',
        );
        continue;
      }
      if (!now.moved) {
        failures.push(
          `${where}: setting --eater-map-slab-edge to ${MUTANT_EDGE} left the Slab wall's resolved ` +
            'gradient unchanged, so the Token is not live inside it however the string reads',
        );
      }
      for (const [name, value] of Object.entries(now.light)) {
        if (value === '') {
          failures.push(
            `${where}: --eater-map-light-${name} is not declared, so the light is whatever stage.ts ` +
              'falls back to and the author has no control to drag — the fallbacks are a guard against ' +
              'an unreadable Token, not a home for the value',
          );
        }
      }

      // EVERY EXTRUDED SURFACE, which is the Slab and every glass surface of every
      // Card. Named in the failure, because "the edge is flat" is a different bug
      // from "the search bar's edge is flat".
      const lit = {};
      for (const [name, seen] of Object.entries(now.surfaces)) {
        if (seen.flat > 0) {
          failures.push(
            `${where}: ${seen.flat} of the ${name} edge's ${seen.slices} slices are painted with one flat ` +
              'colour rather than a conic-gradient, so that much of it has no direction',
          );
        }
        if (seen.unnamed > 0) {
          failures.push(
            `${where}: ${seen.unnamed} of the ${name} edge's ${seen.slices} slices name no Token in the ` +
              'gradient they were written with — the colour has been resolved in JavaScript, and the ' +
              "Editor's drag of that Token now moves nothing",
          );
        }
        if (seen.blank > 0) {
          failures.push(
            `${where}: ${seen.blank} of the ${name} edge's ${seen.slices} slices resolved to no background ` +
              'image at all, so that much of it is a transparent element standing where the solid should ' +
              'be — a gradient the parser rejected computes to none, and one bad stop rejects the whole ' +
              'declaration',
          );
        }
        // DOES THE CORNER SURVIVE THE ROLL — the Slab's alone, because it is the
        // only surface whose plan corner this repository states. A Card's comes from
        // `cards.css`, and a pill's 24px against a 1.8px fillet cannot collapse the
        // way two Tokens dragged together can (#200).
        if (name === 'slab' && seen.roundest > 0 && Number.isFinite(seen.squarest)) {
          const kept = seen.squarest / seen.roundest;
          if (kept < CORNER_SURVIVES) {
            failures.push(
              `${where}: the Slab's plan corner is ${seen.roundest.toFixed(1)}px and its fillet's ` +
                `innermost ring keeps only ${seen.squarest.toFixed(1)}px of it — ${(kept * 100).toFixed(
                  0,
                )}% against ${(CORNER_SURVIVES * 100).toFixed(0)}% required, so the roll goes square at ` +
                'the corners and the shading breaks there in one step. The plan corner and the fillet ' +
                'have collapsed back onto one number, which is what --eater-map-slab-fillet was split ' +
                'out of --eater-map-slab-edge-radius to stop',
            );
          }
        }
        // AND IS IT ON SCREEN AT ALL — asked before anything about its colour,
        // because a surface whose depth never reaches the screen has an edge that
        // is drawn and not one that is seen (#203).
        if (seen.shallow && seen.deep) {
          const off = Math.max(
            Math.abs(seen.shallow.left - seen.deep.left),
            Math.abs(seen.shallow.top - seen.deep.top),
          );
          if (off < OFF_THE_FACE) {
            failures.push(
              `${where}: the ${name} edge's ${seen.walls} wall slices all land within ${off.toFixed(
                2,
              )}px of each other against ${OFF_THE_FACE}px required, so its thickness is not reaching the ` +
                'screen — the slices are built at a depth and then flattened onto their own face, which ' +
                'is what a parent that is not `transform-style: preserve-3d` does to them. The edge is ' +
                'drawn correctly and cannot be seen',
            );
          }
        }
        if (!seen.sides || Object.values(seen.sides).some((one) => one === null)) {
          failures.push(
            `${where}: the ${name} edge has ${seen.walls} wall slice(s) and no readable gradient on them, ` +
              'so which colour each of its four sides is drawn in could not be read — nothing about its ' +
              'direction was checked',
          );
          continue;
        }
        // WEIGHED HERE AND NOT IN THE PAGE, because `lib/colour.mjs` owns the one
        // number three bytes become and forbids the obvious wrong answer.
        const sides = {
          head: luminance(seen.sides.head),
          right: luminance(seen.sides.right),
          foot: luminance(seen.sides.foot),
          left: luminance(seen.sides.left),
        };
        lit[name] = sides;
        const ring = seen.ring.map((stop) => ({ at: stop.at, lit: luminance(stop.rgb) }));
        const brightnesses = ring.map((stop) => stop.lit);
        const spread = ring.length ? Math.max(...brightnesses) - Math.min(...brightnesses) : 0;
        // THE LARGEST STEP ACROSS AN ARC, and a step BETWEEN TWO STOPS AT THE SAME
        // ANGLE is skipped rather than measured. That is a square corner, where a
        // hard transition is the right drawing because there is no arc to run a
        // ramp along — the details sheet has two of them, and measuring them made
        // this read 100% on a surface that is drawn correctly. What is left is the
        // failure the assertion is for: a large jump ACROSS an angular range, which
        // is a shading stepping between four flat sides.
        let step = 0;
        for (let index = 1; index < ring.length; index += 1) {
          const from = ring[index - 1];
          const to = ring[index];
          if (Math.abs(to.at - from.at) < SAME_ANGLE) continue;
          step = Math.max(step, Math.abs(to.lit - from.lit));
        }
        const four = Object.values(sides);
        const brightest = Math.max(...four);
        const darkest = Math.min(...four);
        if (brightest <= 0 || (brightest - darkest) / brightest < DIRECTED) {
          failures.push(
            `${where}: the ${name} edge's four sides are drawn at ${four
              .map((one) => one.toFixed(4))
              .join(' / ')} — ${(((brightest - darkest) / (brightest || 1)) * 100).toFixed(1)}% apart ` +
              `against ${(DIRECTED * 100).toFixed(0)}% required, so it is one colour all the way round ` +
              'and the lateral normal has been dropped',
          );
        }
        if (spread > 0 && step / spread > CONTINUOUS) {
          failures.push(
            `${where}: the largest step between two consecutive stops of the ${name} edge is ${(
              (step / spread) *
              100
            ).toFixed(1)}% of its whole spread against ${(CONTINUOUS * 100).toFixed(0)}% allowed — the ` +
              'brightness is stepping between four flat sides rather than running round the corners',
          );
        }
        notes.push(
          `${where}: the ${name} edge's four sides at ${four.map((one) => one.toFixed(4)).join(' / ')} ` +
            `(head/right/foot/left), ${(((brightest - darkest) / (brightest || 1)) * 100).toFixed(
              1,
            )}% apart` + (spread > 0 ? `, largest step ${((step / spread) * 100).toFixed(1)}%` : ''),
        );
      }

      // WHICH WAY ROUND, asked of the Slab alone: the Cards are turned by the same
      // plane, so a second statement of it would not be a second assertion.
      const slab = lit.slab;
      if (!slab) {
        failures.push(
          `${where}: no edge on the page is named "slab", so which way round the light points was not ` +
            'checked — edge.ts writes that name and stage-dom.ts asks for it',
        );
      } else if (slab.foot <= slab.right * (1 + DIRECTED)) {
        failures.push(
          `${where}: the Slab's foot is drawn at ${slab.foot.toFixed(4)} against its right flank's ` +
            `${slab.right.toFixed(4)} — those two are the flanks that face the reader, and the light ` +
            '#187 signed off stands above and to the LEFT, which makes the foot the brighter of them. ' +
            'This is what an azimuth pointed the other way looks like',
        );
      }

      for (const [name, corner] of Object.entries(now.corners)) {
        if (!corner.onScreen) {
          failures.push(
            `${where}: the Slab's ${name.replace('_', ' ')} corner projects off the window, so whether ` +
              'it is closed could not be sampled',
          );
        } else if (!corner.covered) {
          failures.push(
            `${where}: nothing under the Slab's ${name.replace('_', ' ')} corner is a slice — the ` +
              `topmost element there is ${corner.top}, so half a radius in from that corner the reader ` +
              'is looking at the page behind the drawing rather than at the edge. This is the notch four ' +
              'hinged walls leave',
          );
        }
      }
    }

    // ---- and the gradient is a proportion, not a measurement ---------------
    // A SECOND MOUNT, AT THE OTHER END OF THE BAND. The Slab is drawn 282px wide at
    // DESK and 220px at the short corner, and every gradient has to come out byte
    // for byte the same both times — which it does because every stop's angle is
    // `atan2` of a point whose coordinates all scale together. An outline measured
    // off `getBoundingClientRect` instead of stated as a proportion drifts here by a
    // hundredth of a degree per stop, which `toFixed(2)` is fine enough to see.
    const { context: second, page: other } = await open(browser, origin, { viewport: SHORT });
    try {
      failures.push(...(await settle(other)).map((why) => `${SHORT.width}x${SHORT.height}: ${why}`));
      const fresh = await other.evaluate(edgeAsBuilt, spec);
      if (fresh.missing) {
        failures.push(`${SHORT.width}x${SHORT.height} mounted: ${fresh.missing}`);
      } else if (fresh.count !== wide.count) {
        failures.push(
          `${SHORT.width}x${SHORT.height} mounted: the page is made of ${fresh.count} slices against ` +
            `${wide.count} at ${WIDE.width}x${WIDE.height} — how finely a solid is chopped is a count in ` +
            'edge.ts and not a function of the window',
        );
      } else {
        const drifted = fresh.authored.filter((one, index) => one !== wide.authored[index]).length;
        if (drifted > 0) {
          failures.push(
            `${SHORT.width}x${SHORT.height} mounted: ${drifted} of ${fresh.count} slices came out with a ` +
              `different gradient than the same slices at ${WIDE.width}x${WIDE.height} — the gradient is ` +
              'exactly scale-invariant, so one that moved with the window was computed from a measurement ' +
              'of a box rather than from an outline stated as a proportion',
          );
        } else {
          notes.push(
            `a second mount at ${SHORT.width}x${SHORT.height} wrote all ${fresh.count} gradients byte ` +
              `for byte as ${WIDE.width}x${WIDE.height} did`,
          );
        }
      }
    } finally {
      await second.close();
    }
    return { failures, notes };
  } finally {
    await context.close();
  }
}

/**
 * THIRTEEN. THE REDRAW IS THE EDITOR'S, AND THIS PAGE HAS NO EDITOR (#196).
 *
 * `redraw.ts` draws the generated geometry again when the Editor previews one of
 * this Section's Tokens, and it is GATED on the Editor being on the page. This is
 * that gate from the shipped side; the `editor` Check is the other half, and
 * `src/sections/eater-map/NOTES.md` says why one half alone asserts nothing.
 *
 * THE MUTATION IS THE EDITOR'S OWN GESTURE AND NOT THE TOKEN — a `<style
 * data-editor>` appended to the body, which is what `client/tokens.js` does on
 * every frame of a drag. An inline Token on the root is not something the observer
 * watches, so that version passes whether the gate is there or not: it reads as
 * though it asks something and asks nothing.
 *
 * AND IT ASKS WHETHER THE MUTATION LANDED, or the two readings either side of it
 * agree for a reason that has nothing to do with the gate.
 */
async function nothingWatchesTheTokens(browser, origin) {
  const { context, page } = await open(browser, origin, { viewport: WIDE });
  try {
    const failures = await settle(page);
    const seen = await page.evaluate(async (mutant) => {
      const section = document.querySelector('.eater-map');
      if (!section) return { missing: 'the Section is not on the page' };
      // EVERY ELEMENT A REDRAW BUILDS, which is the slices AND the blurred copy of
      // the map behind each glass surface. `mountGlass` clears the two on
      // consecutive lines, so counting only the slices leaves a regression in the
      // second clear doubling elements per drag with nothing to fail.
      const drawn = () =>
        [...document.querySelectorAll('.eater-map__slice, .eater-map__glass')].map(
          (one) => `${one.className} ${one.style.background}`,
        );
      const azimuth = () => getComputedStyle(section).getPropertyValue('--eater-map-light-azimuth').trim();

      const before = drawn();
      const was = azimuth();

      // The Editor's own preview: one declaration, under the selector the
      // composition declared it on, in a sheet at the end of the body so it wins
      // the specificity tie.
      const sheet = document.createElement('style');
      sheet.dataset.editor = '';
      sheet.dataset.editorPreview = '';
      sheet.textContent = `.eater-map { --eater-map-light-azimuth: ${mutant}; }`;
      document.body.append(sheet);
      // Two frames: one for a rebuild coalesced onto the next frame to happen, and
      // one for it to be on the page to read.
      await new Promise((frame) => requestAnimationFrame(frame));
      await new Promise((frame) => requestAnimationFrame(frame));

      const now = azimuth();
      const after = drawn();
      sheet.remove();
      return {
        redraw: section.dataset.eaterMapRedraw ?? '',
        was,
        now,
        before: before.length,
        after: after.length,
        rebuilt: after.filter((one, index) => one !== before[index]).length,
      };
    }, MUTANT_LIGHT);

    if (seen.missing) {
      failures.push(`${WIDE.width}x${WIDE.height}: ${seen.missing}`);
      return failures;
    }
    if (seen.before === 0) {
      failures.push(
        `${WIDE.width}x${WIDE.height}: nothing on the page is a slice or a glass backdrop, so there was no ` +
          'generated geometry to draw again and nothing about the gate was checked — the Cards carry both ' +
          'under either stage, so this is the Exploded View never having come up',
      );
      return failures;
    }
    if (seen.was === seen.now) {
      failures.push(
        `${WIDE.width}x${WIDE.height}: an Editor preview sheet left --eater-map-light-azimuth at ` +
          `"${seen.now}", so the mutation this group is built on never landed and it asserted nothing`,
      );
      return failures;
    }
    if (seen.redraw !== '') {
      failures.push(
        `${WIDE.width}x${WIDE.height}: the Section reports data-eater-map-redraw="${seen.redraw}" on a page ` +
          'with no Editor attached — the observer is wired for every reader, and redraw.ts’s gate is what ' +
          'makes it free',
      );
    }
    if (seen.after !== seen.before) {
      failures.push(
        `${WIDE.width}x${WIDE.height}: the page went from ${seen.before} generated element(s) to ${seen.after} ` +
          'when an Editor preview sheet was put on it — something drew again, and it did not land on the DOM ' +
          'it started from',
      );
    }
    if (seen.rebuilt > 0) {
      failures.push(
        `${WIDE.width}x${WIDE.height}: ${seen.rebuilt} of ${seen.before} generated element(s) were built again ` +
          'when an Editor preview sheet was put on a page with no Editor — the redraw is ungated, so every ' +
          'reader carries an observer and a redraw for a Token nobody is dragging',
      );
    }
    return failures;
  } finally {
    await context.close();
  }
}

export const check = {
  name: 'eater-map',
  title:
    'PROJECTS stands in the Gallery’s own box with the serif title sized off its ink, the copy at the ' +
    'foot and the Points to the right; the Cards lie on the Slab at its own scale, come off it and go ' +
    'back, are joined to their numbers by rules that end in a lit dot, are only a picture, and lie flat ' +
    'and full-bleed below the band',

  /** @param {{ browser: import('playwright').Browser, origin: string }} ctx */
  async run({ browser, origin }) {
    const found = [];
    for (const viewport of [WIDE, SHORT]) {
      found.push(...(await atWindow(browser, origin, viewport)));
    }
    found.push(...(await reversesOnTheWayOut(browser, origin)));
    // THE ONE GROUP THAT REPORTS WHAT IT SAW, because every tolerance in it was
    // chosen off a measurement and a reader of a passing log should be able to tell
    // a comfortable pass from one sitting on a threshold.
    const edge = await theEdgeHasADirection(browser, origin);
    found.push(...edge.failures);
    found.push(...(await nothingWatchesTheTokens(browser, origin)));

    const collapse = await collapsedBelowTheBand(browser, origin);
    found.push(...collapse.failures);
    // Only when there IS a collapsed composition to compare against. Without the
    // guard the equality would be asserted against nothing and pass, which is the
    // whole failure mode the bail above exists to avoid rather than to relocate.
    if (collapse.composition) {
      found.push(...(await everyReaderGetsIt(browser, origin, collapse.composition)));
    }
    return { failures: found, notes: edge.notes };
  },
};
