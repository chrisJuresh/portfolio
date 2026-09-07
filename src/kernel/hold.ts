import { portOf, ports } from './page-turn';

/**
 * PROJECTS, HELD AT THE LANDING for as long as the Sections that stand it in
 * their masthead's slot are the ones going past.
 *
 * WHAT THE READER GETS, AND IT IS #193's OWN SENTENCE. Turning from the Gallery
 * to the Eater Map moves the composition and nothing else: the Rail's highlight
 * changes (#192) and the word does not move, so the two screens read as one
 * place rather than as two pages that happen to share a heading. Before this the
 * word was a box at the Front Screen's foot, two screens above the Eater Map by
 * the time that Section owned the window, so it left with the Panel it is the
 * title of and the Eater Map drew the word a second time to stand in for it.
 *
 * THE FIRST PAGE TURN IS UNTOUCHED, and that is the half of this file worth
 * reading first. Everything from the opening screen to the Gallery is the page
 * it was: the word is still the Front Screen's own absolutely positioned box at
 * `--fold`, still cut by the bottom of the window on the first screen, still
 * morphing out of Friz Quadrata across the Turn, and still arriving at the
 * masthead's slot because the DOCUMENT moved and the word did not. Nothing here
 * is true below the landing.
 *
 * THREE STATES ON THE ROOT AND NOT ONE ELEMENT TOUCHED. The Kernel may not read
 * a Section (CONTEXT.md) and the word is the Front Screen's element, so what
 * this publishes is a fact about the PAGE and each Section spends it in its own
 * stylesheet: the Front Screen pins its own word and draws its own roof, and the
 * Eater Map hides its own masthead. That is the same division `--turn` is under
 * — the Kernel owns the number, every Section owns what it does about it — and
 * the same one `data-rail-away` is under, for the reason that one exists:
 * `--landing-past` is a length and a stylesheet cannot branch on one, so the two
 * things CSS has to branch on are attributes.
 *
 * WHICH SECTIONS, ASKED RATHER THAN NAMED. A Section marks itself
 * `data-landing-word` when it stands the landing's word in its own masthead's
 * slot, and the hold runs from the FIRST such Section's resting place to the
 * LAST one's. Two Sections carry it today and the Catalogue deliberately does
 * not — it is not a Showcase, its head is centred over its spine, and a PROJECTS
 * over a Section that is not a project would be a label on the wrong box
 * (`src/sections/catalogue/NOTES.md`, which asked for this decision by name). So
 * a third Showcase joins the hold by marking itself and nothing here learns its
 * name, and the Catalogue stays out of it by saying nothing — which is the
 * property `data-turn` has and the reason this is an attribute rather than a
 * list of Sections in the Kernel.
 *
 * WHERE IT LETS GO IS THE LAST MARKED SECTION'S OWN RESTING PLACE, and the
 * release is a TRAVEL rather than a switch. Past that port the word goes up at
 * exactly the rate the document does, so it leaves with the Section it is the
 * head of and goes off the top of the screen on the turn onto the Catalogue.
 * Letting the box simply revert there instead is the failure #192 deleted for
 * the Rail: the held word stands at `--landing-top` and its own document
 * position is a screen and a half above the window by then, so reverting is the
 * word VANISHING at the moment the reader asks for the next Section rather than
 * leaving with the one they are reading. `--landing-past` is that travel, and it
 * is the one number here that has to be written per scroll.
 *
 * NOTHING ON THE PAGE DEPENDS ON THIS FILE, in the sense `cut-morph.ts` means
 * it: a browser that never runs it gets the page exactly as it was before this
 * landed — one PROJECTS per screen, the word leaving with the Panel, the Eater
 * Map drawing its own. Below the landing band there is one resting place and no
 * turn to stand still across, so this is inert there by construction rather
 * than by a second copy of the band's two numbers.
 */

/** A pixel of travel is "already there" — the slack page-turn.ts uses. */
const SLACK = 1;

/**
 * The run the word is held across: from the landing to the resting place the
 * last Section that draws the word comes to rest on.
 *
 * `null` when there is nothing to hold across, and there are two ways for that
 * to be true rather than one. OUT OF THE BAND the document is an ordinary scroll
 * with a single port, so the word is the head of the Section below it and leaves
 * with it — asked as `ports()` rather than as the band's own two numbers, which
 * is the same gate the page turn uses and not a second copy of it. And with only
 * ONE Section drawing the word there is no second screen for it to stand still
 * across, which is the page as it was before #191 gave the Eater Map the
 * Gallery's own box.
 */
function run(): { from: number; to: number } | null {
  if (ports().length < 2) return null;
  const words = [...document.querySelectorAll<HTMLElement>('[data-section][data-landing-word]')];
  const first = words[0];
  const last = words[words.length - 1];
  if (!first || !last || first === last) return null;
  return { from: portOf(first), to: portOf(last) };
}

export function mountHold(): void {
  const root = document.documentElement;
  /** The travel already written, so a resting page writes nothing per scroll. */
  let wrote: number | null = null;

  const draw = (): void => {
    const held = run();
    if (!held) {
      root.removeAttribute('data-landing-held');
      root.removeAttribute('data-landing-crossing');
      root.style.removeProperty('--landing-past');
      wrote = null;
      return;
    }

    const y = window.scrollY;
    const past = Math.max(0, y - held.to);
    /**
     * Held from the landing onward, and LET GO once the word has travelled a
     * whole screen past the last port — by then it is off the top of the window
     * whether it is pinned or in the document, so the two positions agree about
     * everything the reader can see and the swap between them is invisible. What
     * that buys is a `top` that stays a real length instead of running to minus
     * ten thousand pixels down inside a Section that is taller than a screen.
     */
    const on = y >= held.from - SLACK && past <= window.innerHeight;
    root.toggleAttribute('data-landing-held', on);
    /**
     * AND THE ROOF IS UP ONLY BETWEEN THE TWO RESTING PLACES, which is the whole
     * of why it is a second state rather than the same one.
     *
     * The roof hides what would otherwise pass through the letters, and at REST
     * there is nothing passing — so a roof standing at either port is a roof
     * cutting a composition nobody is turning away from. Measured at #172's four
     * windows, both ends cost something real: at the landing the Gallery's
     * subheading has its cap tops 22 to 48px ABOVE the word's ink bottom, so a
     * permanent roof clips the top of SELF-STACKING at every window in the band;
     * and at the Eater Map's port that Section's first Point draws a hairline
     * across the whole frame 26 to 47px down, with its first grid vertical
     * running from above the window's top edge, so a permanent roof puts a gap
     * in one and starts the other half way down the word.
     *
     * Strictly between, so landing on either port takes it down. The 800ms ease
     * is what the reader sees it during, and there is nothing to see: what
     * changes at the moment it goes up is a subheading's cap tops that are about
     * to be behind the word anyway, and what changes when it comes down is a
     * hairline at eight per cent of the page's ink.
     */
    root.toggleAttribute('data-landing-crossing', on && y > held.from + SLACK && y < held.to - SLACK);

    if (past !== wrote) {
      wrote = past;
      root.style.setProperty('--landing-past', `${past}px`);
    }
  };

  draw();
  window.addEventListener('scroll', draw, { passive: true });
  window.addEventListener('resize', draw);
}
