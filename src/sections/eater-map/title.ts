/**
 * The **serif project title**, sized and placed off the masthead's own ink (#191).
 *
 * TWO RATIOS AND NEITHER IS A LENGTH. The reference sets the title's cap height
 * at `--eater-map-title-cap` of PROJECTS' cap, and its first cap top
 * `--eater-map-title-drop` PROJECTS cap-heights below the masthead's baseline.
 * Both are Tokens, both are ratios, and what this module does is turn them into
 * the two lengths a stylesheet can spend: a font size and a lead.
 *
 * WHY A SCRIPT AND NOT A `calc()`. A ratio between two CAP HEIGHTS is not a ratio
 * between two font sizes: the masthead is a grotesque whose cap is about 0.70 of
 * its em and the title is a serif whose cap is about 0.67 of its, so
 * `font-size: calc(0.566 * var(--the-masthead))` draws a title 4% short of the
 * ratio it appears to state and drifts further the day either face is replaced.
 * The cap heights are a fact about the INK, and the only way to read ink from a
 * page is to measure it — `actualBoundingBoxAscent` of a capital, off a canvas set
 * to the element's own computed font. The same goes for the drop: it is measured
 * from the masthead's BASELINE, which no box on the page is an edge of.
 *
 * SO A TYPED FONT SIZE FAILS THE CHECK, and that is the point of the acceptance
 * criterion rather than a side effect of it. `eater-map` measures both ratios off
 * the served page the same way this writes them, at both ends of the band.
 *
 * THE BASELINE IS READ WITH A ZERO-SIZED INLINE-BLOCK, which is the one thing on
 * a line box whose bottom edge IS the baseline: an empty `inline-block` with no
 * height has its own baseline at its margin bottom, and an inline box sits on the
 * line's baseline. So `probe.getBoundingClientRect().bottom` is the baseline, in
 * viewport pixels, for whatever the line happens to be doing. Nothing else on the
 * line moves, because the probe is zero-sized in both axes.
 *
 * WHAT A READER WITH NO SCRIPT GETS. The stylesheet's own fallbacks: the title at
 * the ratio applied to the masthead's SIZE rather than to its cap, and the lead
 * from the two face literals the Kernel already writes for the landing. That is a
 * whole composition about four per cent small — which is the honest thing for a
 * fallback to be, and is what the tolerance in the Check is set narrow enough to
 * tell apart from the measured answer.
 *
 * WHEN IT RE-MEASURES. On a resize, through a ResizeObserver on the Section, and
 * once the faces have arrived — a canvas asked for a font it does not yet have
 * measures the fallback face's ink and answers a plausible wrong number, which is
 * exactly the failure `document.fonts.ready` exists to close.
 *
 * AND WHERE IT DOES NOT WRITE AT ALL: below the band. The collapse is one
 * composition for three readers, one of whom runs no script (#179), and a length
 * written here moves the title's box and every block under it in a one-column
 * page — so down there the stylesheet's fallbacks are the answer for everybody.
 * See the guard, which asks the stylesheet rather than repeating its breakpoint.
 */

/** The capital the cap height is read off. */
const CAP = 'H';

/**
 * The size the ink is measured at, in px, before being scaled to the size it is
 * drawn at.
 *
 * `actualBoundingBoxAscent` IS QUANTISED TO THE RASTERISER'S GRID, and measuring
 * at the drawn size is what that costs: read at 51px the serif's cap came back
 * 1.4% out, which is a third of the whole difference between this face's cap
 * ratio and the masthead's — so a Check tight enough to fail a typed font size
 * would have been failing the measured one at the short corner of the band. Cap
 * height is LINEAR in font size for a static face, so one reading at a size where
 * the grid is a rounding, divided by that size, is the face's ratio to five
 * figures and every size follows from it exactly.
 */
const REFERENCE = 1000;

/** The cap height of `font`, in px, read off the ink rather than off the metrics
 *  the face declares. One canvas for the module, because a 2D context is not free
 *  and nothing here draws. */
const ink = (() => {
  let context: CanvasRenderingContext2D | null = null;
  return (font: string): number => {
    context ??= document.createElement('canvas').getContext('2d');
    if (!context) return Number.NaN;
    context.font = font;
    const measured = context.measureText(CAP);
    return measured.actualBoundingBoxAscent;
  };
})();

/** A face's cap height as a share of its em, measured at REFERENCE. This is the
 *  number the two faces differ by — about 0.70 for the masthead's grotesque
 *  against about 0.67 for the title's serif — and it is the whole reason a cap
 *  ratio cannot be spent as a font-size ratio in a stylesheet. */
function capRatio(element: HTMLElement): number {
  const style = getComputedStyle(element);
  return (
    ink(`${style.fontStyle} ${style.fontWeight} ${REFERENCE}px ${style.fontFamily}`) / REFERENCE
  );
}

/** The baseline of `element`'s FIRST line box, in viewport pixels. */
function baselineOf(element: HTMLElement): number {
  const probe = document.createElement('span');
  probe.style.cssText = 'display:inline-block;width:0;height:0';
  // Prepended, so it joins the first line rather than the last: the drop is
  // measured off the masthead's own baseline and off the title's first one.
  element.prepend(probe);
  const at = probe.getBoundingClientRect().bottom;
  probe.remove();
  return at;
}

/**
 * Size and place the serif title against the masthead, and answer with the
 * function that does it again.
 *
 * Returns nothing when either element is missing or the ratios are not numbers,
 * which is the same refusal `mountLeaders` makes: a measurement wired to a page
 * that has neither of the two things being compared is a thing that runs on every
 * resize and asserts nothing.
 */
export function mountTitle(root: HTMLElement): (() => void) | void {
  const masthead = root.querySelector<HTMLElement>('[data-eater-map-masthead]');
  const title = root.querySelector<HTMLElement>('[data-eater-map-title]');
  if (!masthead || !title) return;

  /**
   * Write a property, and only when it would change.
   *
   * NOT AN OPTIMISATION. Both of these move the title's box, the title's box is
   * inside the Section, and the Section's height is its content's below the band
   * — so an unconditional write feeds the observer below its own output on every
   * pass. The numbers converge, because the solve is idempotent, but a
   * ResizeObserver that is still delivering when the frame ends is an uncaught
   * "loop completed with undelivered notifications", which `console` fails the run
   * for. Writing nothing when nothing changed is what ends the cycle in one pass.
   */
  const write = (name: string, value: string): void => {
    if (root.style.getPropertyValue(name) === value) return;
    root.style.setProperty(name, value);
  };

  const measure = (): void => {
    const style = getComputedStyle(root);

    // ---- AND NOT AT ALL BELOW THE BAND, WHICH IS WHAT KEEPS ONE COMPOSITION --
    // The collapse is written as rules on the markup's own resting state (#179),
    // and that is not a style: it is what makes the narrow reader, the reader who
    // asked for no motion and the reader whose scripts never arrived all get the
    // same drawing — asserted as an EQUALITY by `eater-map`, not as three
    // descriptions. A length written HERE is a length the third of those readers
    // does not get, and this one moves the title's box, which moves every block
    // under it in a one-column composition. So down there the stylesheet's own
    // fallbacks are the answer for everybody, and they are about four per cent
    // small in a regime where nothing was measured against a Gallery box anyway:
    // the two ratios are the band's, where PROJECTS is the Gallery's word in the
    // Gallery's own box and a share of its cap is a share of something.
    //
    // REMOVED RATHER THAN LEFT STANDING, because a window dragged across the
    // boundary would otherwise carry the band's two lengths into the collapse and
    // hand the scriptless reader a different column from everybody else — the
    // resize half of the same invariant. `timeline.ts` asks this declaration too,
    // and for the same reason: one breakpoint, in the stylesheet.
    if (Number.parseFloat(style.getPropertyValue('--eater-map-collapsed')) === 1) {
      root.style.removeProperty('--eater-map-title-size');
      root.style.removeProperty('--eater-map-title-lead');
      return;
    }

    const cap = Number.parseFloat(style.getPropertyValue('--eater-map-title-cap'));
    const drop = Number.parseFloat(style.getPropertyValue('--eater-map-title-drop'));
    const mastRatio = capRatio(masthead);
    const titleRatio = capRatio(title);
    const mastCap = mastRatio * Number.parseFloat(getComputedStyle(masthead).fontSize);
    // EVERY GUARD IS A `!Number.isFinite`, and not a `> 0` on its own. A canvas
    // that could not be got, a Token that has been dragged to nothing and a face
    // that has not arrived all answer NaN, and NaN compares false against every
    // bound — so a size written from one would be `NaNpx`, which the cascade
    // discards, and the title would silently keep the stylesheet's fallback while
    // this module read as though it had placed it.
    if (!Number.isFinite(cap) || !Number.isFinite(drop)) return;
    if (!(mastCap > 0) || !(titleRatio > 0)) return;

    // ---- the size: the cap height the ratio asks for, over this face's own ---
    // ONE DIVISION AND NOT A SOLVE. The wanted cap is a length; the title's face
    // draws `titleRatio` of its em as cap; so the em that draws it is the one over
    // the other. What made this look like a search problem is measuring the cap at
    // the drawn size, where the grid rounds — measured at REFERENCE it is exact.
    const size = (cap * mastCap) / titleRatio;
    if (!(size > 0)) return;
    write('--eater-map-title-size', `${size.toFixed(3)}px`);

    // ---- the lead: the first cap top, under the masthead's baseline ----------
    // SOLVED FROM THREE THINGS THE LEAD ITSELF DOES NOT MOVE, which is what makes
    // this idempotent — re-running it on a page it has already placed answers the
    // same number rather than walking the title down the column by the residue
    // each time. The masthead's bottom edge and its baseline are above the title
    // and cannot be moved by it; the title's own box-top-to-cap-top is a distance
    // INSIDE its box, so a margin moves the box and the offset with it. The
    // alternative — zeroing the lead, measuring, and writing the difference — is a
    // second layout per pass and a frame of the title in the wrong place.
    const titleCap = titleRatio * size;
    const box = title.getBoundingClientRect();
    const inset = baselineOf(title) - titleCap - box.top;
    const under = baselineOf(masthead) + drop * mastCap;
    const lead = under - inset - masthead.getBoundingClientRect().bottom;
    if (!Number.isFinite(lead)) {
      root.style.removeProperty('--eater-map-title-lead');
      return;
    }
    write('--eater-map-title-lead', `${lead.toFixed(3)}px`);
  };

  measure();
  // The Section's box changes with the window, and the masthead's size is a share
  // of a landing measure that is a function of both of the window's axes — so a
  // resize is the whole of when this has to run again. One observer, on the box
  // every length here is downstream of.
  const watching = new ResizeObserver(measure);
  watching.observe(root);
  // AND ONCE THE FACES HAVE ARRIVED. Until then the canvas measures whichever
  // fallback face the system offered, which is a different cap for the same size
  // in both directions at once — and no resize follows a face landing when the
  // line's height happens not to change.
  document.fonts?.ready.then(measure).catch(() => {});

  return measure;
}
