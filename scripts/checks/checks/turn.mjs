import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { open, settle } from '../lib/page.mjs';

/**
 * The page turn, and the landing it arrives at.
 *
 * Two Sections, one crossing, and one word standing in both of them. Everything
 * here is a relationship the reader cannot see holding and would not see break in
 * any obvious way — the failures all look like the page working slightly less
 * well rather than like a page that is broken.
 *
 * WHAT IT ASSERTS AND WHY EACH ONE IS SILENT:
 *
 *   * The Kernel's landing measure agrees with the Panel's own arithmetic. The
 *     Cut Title is drawn at the Panel masthead's cap and the two Sections cannot
 *     read each other, so the measure they share is restated in the Kernel
 *     (src/kernel/tokens/landing.css). Drift, and the word is a different size
 *     from the masthead it stands in for — which nobody sees, because that
 *     masthead is invisible. The Plinth's overhang is restated there for the same
 *     reason and asserted here beside it: the width branch spends the page across
 *     on the composition AND that stone, so a share that drifts is a marble slab
 *     that stops short of the page's corner or runs off it.
 *   * One PROJECTS. The Panel's masthead goes `visibility: hidden` and KEEPS ITS
 *     BOX: it is row one's stated height, the line the subheading hangs off, and
 *     the slot the word occupies. `display: none` would draw the same page with
 *     the composition an inch out of true.
 *   * The word neither moves nor resizes across the crossing. It is drawn at the
 *     landing's size from the start and stands still while the document scrolls
 *     past it, so the whole of the animation is the letterforms. A translate or a
 *     scale creeping in reads as "the morph" and is the one thing it is not.
 *   * At both resting places every letter is the outline the Bake wrote, read
 *     back out of the Section's own asset. The tween's ends are the two real
 *     typefaces and only its middle is the polygons that carry one into the
 *     other, so a letter left on its polygon at 0 or 1 is a word that is subtly
 *     not the face it claims to be — and "is it a polygon" cannot be asked of the
 *     shape itself, because a sans E is one either way.
 *   * One wheel notch turns the page, and one notch back brings it home.
 *   * AND ONE TRACKPAD PUSH TURNS ONE PAGE — NO MORE AND NO FEWER, which is the
 *     same claim about the device most readers actually have, and both ways of
 *     getting it wrong have shipped. A mouse notch is a single event of about a
 *     hundred pixels; a light two-finger flick is a rise under the fingers and
 *     then a decaying tail still arriving a second after they have lifted.
 *     Decided per EVENT, that tail took the port after the one it had just
 *     reached and ran the document to its end, so the Panel could not be stopped
 *     on from a trackpad in either direction (#205). Decided per GESTURE, one
 *     flick behaves and a SECOND flick into the first one's momentum is swallowed
 *     whole, so the reader waits out an animation to be allowed to scroll (#210).
 *     One flick moves one port, two flicks move two, and each fault passes the
 *     other's assertion. Every other assertion in this Check passed through both.
 *   * A notch begun on the photographs belongs to the photographs. Without the
 *     arbitration the page turns out from under a reader who is spinning the
 *     strip, which is the loudest of these and still easy to reintroduce.
 *   * The Panel's copy is painted at neither end by accident. It sits in the row
 *     the Panel begins above the fold with, so at the top of the document it is
 *     standing on the Front Screen beside the cut word unless something takes it
 *     away, and at the landing it has to be the palette's own two colours and not
 *     a fraction of them. It arrives without moving, like the word — and with
 *     nothing composited over the type, because a paragraph on its own layer is
 *     rasterised without subpixel antialiasing and the resting page is meant to be
 *     one the arrival never touched. Every one of them is silent on screen.
 *
 *   * AND THE WORD IS HELD ACROSS THE SECOND TURN (#193). The Sections that
 *     stand PROJECTS in their own masthead's slot mark themselves
 *     `data-landing-word`, and the Kernel holds the word from the first one's
 *     resting place to the last one's — so turning between two Showcases moves
 *     the composition and leaves the word alone. Read in VIEWPORT coordinates at
 *     both resting places and compared, never against a typed number, which is
 *     the criterion that ticket asks for in those words. Every failure it can
 *     have is silent: the hold is one `position` and one derived offset, and a
 *     word held a hundred pixels off its own resting place still looks like a
 *     word standing still if you only ever look at one screen. The premise is
 *     asserted first and on its own — two Sections have to CARRY the word, or
 *     every claim below it passes by having nothing to say.
 *   * THE ROOF IS UP ONLY BETWEEN THE TWO RESTING PLACES. What the held word
 *     needs is for the document to pass BEHIND it, and the roof is what the
 *     document passes behind; a roof standing at either port instead cuts a
 *     composition nobody is turning away from — measured, the Gallery's
 *     subheading at one end and the Eater Map's first grid hairline at the
 *     other. Both of those are invisible in a still of the crossing and obvious
 *     in a still of the rest, which is the wrong way round for a person looking.
 *   * AND IT NEVER REACHES THE GALLERY'S COPY. The roof is the word's own drawn
 *     width because that is wide enough to hide everything that crosses and
 *     narrow enough to miss the one block up there that stands BESIDE the word
 *     rather than under it. The margin is 33 to 69px across the band, so this is
 *     the assertion that fails when a Content edit makes the word narrower or the
 *     composition's gutter closes.
 *   * AND THE WORD LEAVES WITH THE SECTION IT HEADS. Past the last marked
 *     Section's port it travels at the document's own rate and is gone by the
 *     last resting place, because the Catalogue is not a Showcase and does not
 *     carry the word (`src/sections/catalogue/NOTES.md`). Letting the box simply
 *     revert instead is the word VANISHING at the moment the reader asks for the
 *     next Section, which is a single frame and reads as a glitch rather than as
 *     a mistake.
 *
 * IT ASSERTS NOTHING ABOUT THE CURVE. How the turn is eased and how fast is the
 * author's, and so is the stagger; what is asserted is that a notch arrives.
 */

/**
 * The pause the KERNEL ends a gesture at, lifted out of its source rather than
 * written down here.
 *
 * Both of this Check's wheel claims are bounded by it and from opposite sides —
 * two notches have to be FURTHER apart than this to be two gestures, and a
 * flick's events have to be CLOSER than it to be one — so a copy going stale on
 * a change to the Kernel is a Check that quietly asserts the opposite of what it
 * reads as asserting: two gestures merging into one, or a flick splitting into
 * dozens. `page.mjs` lifts `THEME_KEY` the same way and for the same reason;
 * failing here instead names the file.
 */
const KERNEL_GAP = (() => {
  const file = fileURLToPath(new URL('../../../src/kernel/wheel.ts', import.meta.url));
  const found = /GESTURE_GAP\s*=\s*(\d+)/.exec(readFileSync(file, 'utf8'));
  if (!found) throw new Error(`turn.mjs: no GESTURE_GAP in ${file} — the Kernel renamed it`);
  return Number(found[1]);
})();

/** How long to leave a gesture alone so the next notch starts a fresh one: the
 *  Kernel's own boundary and a margin over it, never a number of its own. */
const GESTURE_GAP = KERNEL_GAP + 60;

/** How many frames a turn is given to land before it is called stuck. */
const FRAMES = 90;

/**
 * A FLICK, AS A SHAPE RATHER THAN A STREAM OF ONE NUMBER, because a flick is a
 * shape and the page turn now reads it as one.
 *
 * A trackpad delivers a rise under the fingers and then a decaying momentum tail,
 * and the turn tells one from the other by exactly that: a push rises, a tail
 * decays (src/kernel/page-turn.ts). So a Check that delivered sixty identical
 * notches — as the first version of this one did — is not modelling a trackpad at
 * all. It is modelling a finger held down at a constant speed forever, which the
 * page is entitled to read as push after push, and it would fail the shipped
 * behaviour while asserting nothing about the device it names.
 *
 * Peak, rise and decay are a device's, measured off a real flick rather than
 * chosen: about fifty pixels at the peak, six notches of rise, and a tail losing
 * seven per cent a notch, which runs about a second before it dies.
 */
const FLICK_PEAK = 50;
const FLICK_RISE = 6;
const FLICK_DECAY = 0.93;

/** The smallest notch a dying tail delivers, in px. Held rather than stopped at,
 *  so a stream that has to outlast a turn stays continuous — and a flat run this
 *  small must not read as a push, which is the FLOOR the Kernel keeps. */
const FLICK_DEAD = 0.4;

/** How many tail notches to let by after the turn has landed before flicking a
 *  second time: enough that the page is standing still and the reader would be
 *  looking at it, and few enough to be inside the same momentum. */
const FLICK_AFTER = 3;

/** How many flicks to spend looking for one the machine delivered without a stall. */
const FLICK_TRIES = 3;

/** Two px of scroll is "there". */
const SLACK = 2;

/** A moment of the crossing is this many px from another before it counts as moved. */
const STILL = 0.5;

export const check = {
  name: 'turn',
  title: 'the page turn, the landing it arrives at, and the word that stands in both',

  async run({ browser, origin, repoRoot }) {
    // What the Bake wrote, so the two ends can be compared against the source
    // rather than against a guess about what an outline looks like.
    const asset = JSON.parse(
      readFileSync(join(repoRoot, 'src/sections/front-screen/assets/cut-morph.json'), 'utf8'),
    );
    const wanted = {
      first: asset.face.letters.map((letter) => asset.friz[letter.ch] ?? ''),
      last: asset.face.letters.map((letter) => letter.t),
    };

    /** @type {string[]} */
    const failures = [];
    /** @type {string[]} */
    const notes = [];
    const { context, page } = await open(browser, origin);
    try {
      await settle(page);

      // ---- the landing --------------------------------------------------
      const landing = await page.evaluate(() => {
        const root = document.documentElement;
        const panel = document.querySelector('.projects-panel');
        const masthead = document.querySelector('.projects-panel__masthead');
        const cut = document.querySelector('.front-screen__cut > a');
        if (!panel || !masthead || !cut) {
          return { missing: 'the Panel, its masthead or the Cut Title is not on the page' };
        }
        // A custom property comes back off getComputedStyle as the token sequence
        // it was declared as, so both sides are spent on a throwaway element's
        // padding instead, which computes to px. The Kernel's and the Panel's are
        // measured the same way and in the same frame, so this compares two
        // answers rather than two spellings.
        const probe = document.createElement('div');
        probe.style.position = 'absolute';
        probe.style.visibility = 'hidden';
        const spend = (top, bottom) => {
          probe.style.paddingTop = top;
          probe.style.paddingBottom = bottom;
          panel.append(probe);
          const style = getComputedStyle(probe);
          const read = [Number.parseFloat(style.paddingTop), Number.parseFloat(style.paddingBottom)];
          probe.remove();
          return read;
        };
        const [kernelCap, kernelDrop] = spend('var(--landing-cap)', 'var(--landing-mast-top)');
        const [panelCap, panelDrop] = spend(
          'var(--projects-panel-masthead-cap)',
          'var(--projects-panel-mast-top)',
        );
        // The third restated number, and the newest: the stone's overhang, which
        // the width branch spends the page across on so the marble's right end
        // lands on the page's. Both sides as a LENGTH — the Kernel's share times
        // the width it solved, against the Panel's own share times the Frame it
        // resolved — because a share of the composition and a share of the Frame
        // are not comparable numbers and the thing that has to agree is the px.
        const [kernelStone, panelStone] = spend(
          'calc(var(--landing-plinth-share) * var(--landing-w))',
          'calc(var(--projects-panel-plinth-overhang) * var(--projects-panel-frame-w))',
        );

        const shown = getComputedStyle(masthead);
        const box = masthead.getBoundingClientRect();
        const word = cut.getBoundingClientRect();
        return {
          kernelCap,
          kernelDrop,
          panelCap,
          panelDrop,
          kernelStone,
          panelStone,
          visibility: shown.visibility,
          display: shown.display,
          mastheadHeight: box.height,
          // Both cap tops, in DOCUMENT coordinates so the scroll position cannot
          // enter the comparison: the masthead's is its own drop below its line
          // box's top edge, and the word's is the box it is pinned by.
          slot: box.top + window.scrollY + panelDrop,
          capTop: word.top + window.scrollY,
          ports: window.portfolio?.ports?.() ?? [],
          panelPort:
            panel.getBoundingClientRect().top +
            window.scrollY -
            (Number.parseFloat(getComputedStyle(panel).scrollMarginTop) || 0),
        };
      });
      if (landing.missing) return { failures: [landing.missing], notes };

      if (Math.abs(landing.kernelCap - landing.panelCap) > 0.5) {
        failures.push(
          `the Kernel publishes a masthead cap of ${landing.kernelCap.toFixed(2)}px and the Panel solves ` +
            `${landing.panelCap.toFixed(2)}px — the Cut Title is being drawn at a different size from the ` +
            'masthead it stands in for. src/kernel/tokens/landing.css restates the Panel’s two constants.',
        );
      }
      if (Math.abs(landing.kernelDrop - landing.panelDrop) > 0.5) {
        failures.push(
          `the Kernel publishes a masthead drop of ${landing.kernelDrop.toFixed(2)}px and the Panel solves ` +
            `${landing.panelDrop.toFixed(2)}px — the Panel begins the wrong distance above the word`,
        );
      }
      if (Math.abs(landing.kernelStone - landing.panelStone) > 0.5) {
        failures.push(
          `the Kernel leaves ${landing.kernelStone.toFixed(2)}px for the Plinth to overhang by and the Panel ` +
            `draws ${landing.panelStone.toFixed(2)}px — the width branch is spending the page across on a ` +
            'stone that is not the size of the one on the page, so the marble either stops short of the ' +
            'corner or runs past it. src/kernel/tokens/landing.css restates the Panel’s overhang.',
        );
      }
      if (landing.visibility !== 'hidden') {
        failures.push(
          `the Panel's masthead is \`visibility: ${landing.visibility}\` — it draws a second PROJECTS ` +
            'underneath the one the Cut Title is standing in its slot',
        );
      }
      if (landing.display === 'none' || !(landing.mastheadHeight > 0)) {
        failures.push(
          `the Panel's masthead has no box (display ${landing.display}, ${landing.mastheadHeight.toFixed(1)}px ` +
            'tall) — it is row one’s stated height and the line the subheading hangs off, so the composition ' +
            'collapses onto itself with nothing on screen to say so',
        );
      }
      if (Math.abs(landing.slot - landing.capTop) > 1) {
        failures.push(
          `the word's cap top is at ${landing.capTop.toFixed(1)}px in the document and the masthead's slot is ` +
            `at ${landing.slot.toFixed(1)}px — the word is not standing where the masthead would`,
        );
      }
      // AT LEAST TWO, AND THE SECOND IS THE PANEL'S — not "exactly two". This
      // counted them until #175, and a third Section is exactly the legitimate
      // change a blocking Check may not fail: the page turn reads its ports off
      // the cascade and has always generalised to any number of them (ADR 0007),
      // so the number is the page's business and only the landing is this
      // Check's. What matters here is that the FIRST notch ends on the Panel's
      // own landing, which is where the word the Cut Title stands in for is.
      if (landing.ports.length < 2) {
        failures.push(
          `the page has ${landing.ports.length} resting place(s) — inside the landing band the top of the ` +
            'document and the Panel’s own landing are both ports, and there is nothing between them to stop at',
        );
      } else if (Math.abs((landing.ports[1] ?? 0) - landing.panelPort) > 1) {
        failures.push(
          `the far port is at ${(landing.ports[1] ?? 0).toFixed(1)}px and the Panel's landing is at ` +
            `${landing.panelPort.toFixed(1)}px — the turn does not end where the Section rests`,
        );
      }
      notes.push(
        `the landing: a ${landing.kernelCap.toFixed(1)}px cap, the Panel beginning ` +
          `${landing.kernelDrop.toFixed(1)}px above the word, ${landing.kernelStone.toFixed(1)}px of page ` +
          `left for the stone, ports at ${landing.ports.map((port) => port.toFixed(0)).join(' and ')}`,
      );

      // ---- the word across the crossing ----------------------------------
      // Held, and then seeked: a scrubbed Timeline is recomputed from the scroll
      // position on the next tick, so a bare seek survives about a frame.
      const morph = await page.evaluate(async () => {
        const word = document.querySelector('.front-screen__cut-word');
        const turn = window.portfolio?.timelines?.get('turn');
        if (!word || !turn) return { missing: 'the Cut Title drawing or the Turn is not on the page' };
        window.portfolio?.hold?.();
        /** @type {{ at: number, box: number[], curved: number, letters: number }[]} */
        const sampled = [];
        /** @type {string[][]} */
        const drawn = [];
        for (let step = 0; step <= 10; step += 1) {
          const at = step / 10;
          turn.progress(at);
          await new Promise((next) => requestAnimationFrame(next));
          const paths = [...word.querySelectorAll('path')].map((one) => one.getAttribute('d') ?? '');
          const rect = word.getBoundingClientRect();
          sampled.push({
            at,
            // Width, height and LEFT, in document coordinates. Not the top: the
            // word is pinned to the fold and the document is what moves.
            box: [rect.width, rect.height, rect.left],
            letters: paths.length,
          });
          drawn.push(paths);
        }
        turn.progress(0);
        window.portfolio?.release?.();
        return { sampled, first: drawn[0], last: drawn[drawn.length - 1] };
      });
      if (morph.missing) return { failures: [...failures, morph.missing], notes };

      const frames = morph.sampled ?? [];
      const opening = frames[0];
      const closing = frames[frames.length - 1];
      if (!opening || !closing || !(opening.letters > 1)) {
        failures.push(
          `the Cut Title is drawn as ${opening?.letters ?? 0} path(s) — the morph never took it apart, so the ` +
            'word cannot turn. cut-morph.ts is what splits it into one path per letter.',
        );
      } else {
        // NEITHER MOVES NOR RESIZES. The whole of the animation is the
        // letterforms; a translate or a scale creeping into it is the one thing
        // the device is defined as not doing.
        for (const frame of frames) {
          const off = frame.box.map((value, index) => Math.abs(value - (opening.box[index] ?? 0)));
          if (off.some((away) => away > STILL)) {
            failures.push(
              `at ${frame.at.toFixed(1)} of the crossing the word is ${frame.box[0]?.toFixed(2)}x` +
                `${frame.box[1]?.toFixed(2)} at x ${frame.box[2]?.toFixed(2)}, against ` +
                `${opening.box[0]?.toFixed(2)}x${opening.box[1]?.toFixed(2)} at x ${opening.box[2]?.toFixed(2)} ` +
                'at the start — the word is moving or resizing through the morph, and it may do neither',
            );
            break;
          }
        }
        // At either resting place every letter is exactly the outline the Bake
        // wrote — Friz's at the start, the chosen face's at the end.
        for (const [end, drawn, want] of [
          ['the start', morph.first ?? [], wanted.first],
          ['the end', morph.last ?? [], wanted.last],
        ]) {
          const wrong = want.filter((one, index) => drawn[index] !== one).length;
          if (drawn.length !== want.length || wrong > 0) {
            failures.push(
              `at ${end} of the crossing ${wrong || 'all'} of ${want.length} letters are not the outline ` +
                'assets/cut-morph.json holds — the tween’s ends are the two real typefaces and only its ' +
                'middle is the polygons that carry one into the other',
            );
          }
        }
        // And it actually turns.
        const same = wanted.first.every((one, index) => one === wanted.last[index]);
        if (same) {
          failures.push(
            'the two faces in assets/cut-morph.json are the same drawing — the word would be drawn ' +
              'identically at both ends of the crossing and nothing would morph',
          );
        }
        notes.push(
          `the morph: ${opening.letters} letters, ${opening.box[0]?.toFixed(1)}x${opening.box[1]?.toFixed(1)} at ` +
            `x ${opening.box[2]?.toFixed(1)} at every moment of the crossing`,
        );
      }

      // ---- the paragraph that arrives with the crossing -------------------
      // The Panel begins above the fold, so its first row is drawn on the screen
      // ABOVE — which is the device, because that strip is where the word is cut.
      // The masthead in that row is invisible and the subheading hangs below it,
      // so the copy is the one thing up there that has to ARRIVE rather than
      // simply be, and it is drawn against this same Turn.
      const arriving = await page.evaluate(async () => {
        const copy = document.querySelector('.projects-panel__copy');
        const turn = window.portfolio?.timelines?.get('turn');
        if (!copy || !turn) return { missing: "the Panel's copy or the Turn is not on the page" };

        // The ink is a colour-mix of a colour-mix, so how much of it is actually
        // painted is not a string comparison. Rasterised into a 1x1 and read back
        // instead, which is how `ground` reads the page's own ground and for the
        // same reason.
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const ink = canvas.getContext('2d');
        if (!ink) return { missing: "no 2d context — the copy's ink cannot be rasterised" };
        const painted = (colour) => {
          ink.clearRect(0, 0, 1, 1);
          ink.fillStyle = colour;
          ink.fillRect(0, 0, 1, 1);
          return (ink.getImageData(0, 0, 1, 1).data[3] ?? 0) / 255;
        };

        // WHAT THE ARRIVAL IS FINISHED AGAINST IS THE PALETTE AND NOT THE NUMBER
        // 1. The hairline's own colour is a sixth of an alpha at the far end, so
        // "arrived" for it is the Section's own rule and nothing brighter — spent
        // on a throwaway element the same way the landing measures above are, and
        // re-read at every step because the palette crosses with the Turn too.
        const probe = document.createElement('div');
        probe.style.position = 'absolute';
        probe.style.visibility = 'hidden';
        const wants = () => {
          copy.append(probe);
          probe.style.color = 'var(--projects-panel-ink-soft)';
          const wantInk = painted(getComputedStyle(probe).color);
          probe.style.color = 'var(--projects-panel-rule)';
          const wantRule = painted(getComputedStyle(probe).color);
          probe.remove();
          return { wantInk, wantRule };
        };

        // WHAT THE PARAGRAPH ACTUALLY PAINTS IS THE INK TIMES THE BOX, and reading
        // both is deliberate. Fading the ink is how the arrival IS written, and
        // fading the box is the other legitimate way to write it — `opacity` costs
        // the resting page nothing as long as it lands back on 1 — so an assertion
        // that read only the colour would fail an implementation that was fine and
        // would say the wrong thing while doing it. Everything else CSS could hide
        // the paragraph with (a mask, a filter, a clip) cannot be conditional on a
        // number, so it survives to the landing, where `between` catches it.

        window.portfolio?.hold?.();
        /** @type {{ at: number, ink: number, rule: number, dim: number, wantInk: number, wantRule: number, box: number[], between: string }[]} */
        const sampled = [];
        for (let step = 0; step <= 10; step += 1) {
          const at = step / 10;
          turn.progress(at);
          await new Promise((next) => requestAnimationFrame(next));
          const style = getComputedStyle(copy);
          const rect = copy.getBoundingClientRect();
          sampled.push({
            at,
            ink: painted(style.color),
            rule: painted(style.borderLeftColor),
            dim: Number(style.opacity) || 0,
            ...wants(),
            // The whole box, and the top as well as the left: the scroll is held,
            // so anything here that moves is the arrival moving it.
            box: [rect.width, rect.height, rect.left, rect.top],
            // The five ways an arrival gets written that would leave the paragraph
            // on its own compositing layer once it has arrived.
            between: [style.opacity, style.transform, style.maskImage, style.filter, style.clipPath].join(
              ' ',
            ),
          });
        }
        turn.progress(0);
        window.portfolio?.release?.();
        return { sampled };
      });
      if (arriving.missing) return { failures: [...failures, arriving.missing], notes };

      const arrival = arriving.sampled ?? [];
      const atTop = arrival[0];
      const atLanding = arrival[arrival.length - 1];
      if (!atTop || !atLanding) {
        failures.push("the crossing could not be sampled for the Panel's copy");
      } else {
        const paints = (frame) => [frame.ink * frame.dim, frame.rule * frame.dim];
        const [topInk, topRule] = paints(atTop);
        if (topInk > 0.01 || topRule > 0.01) {
          failures.push(
            `at the top of the document the Panel's copy paints at ${topInk.toFixed(2)} and its rule at ` +
              `${topRule.toFixed(2)} — the Section begins above the fold, so anything painted in its first ` +
              'row is standing on the Front Screen beside the cut word, and that word is the one thing the ' +
              'strip is for',
          );
        }
        const [landedInk, landedRule] = paints(atLanding);
        if (
          Math.abs(landedInk - atLanding.wantInk) > 0.01 ||
          Math.abs(landedRule - atLanding.wantRule) > 0.01
        ) {
          failures.push(
            `at the landing the Panel's copy paints at ${landedInk.toFixed(2)} and its rule at ` +
              `${landedRule.toFixed(2)}, against the palette's own ${atLanding.wantInk.toFixed(2)} and ` +
              `${atLanding.wantRule.toFixed(2)} — the paragraph is still arriving at the place the turn comes ` +
              'to rest, so the reader is left reading it through the arrival',
          );
        }
        // NEITHER MOVES NOR RESIZES, which is the assertion the word already
        // carries and for the same reason: this Section is the far end of a device
        // whose whole claim is that the type stands still and the document moves.
        for (const frame of arrival) {
          const off = frame.box.map((value, index) => Math.abs(value - (atTop.box[index] ?? 0)));
          if (off.some((away) => away > STILL)) {
            failures.push(
              `at ${frame.at.toFixed(1)} of the crossing the Panel's copy is ${frame.box[0]?.toFixed(2)}x` +
                `${frame.box[1]?.toFixed(2)} at ${frame.box[2]?.toFixed(2)},${frame.box[3]?.toFixed(2)}, ` +
                `against ${atTop.box[0]?.toFixed(2)}x${atTop.box[1]?.toFixed(2)} at ` +
                `${atTop.box[2]?.toFixed(2)},${atTop.box[3]?.toFixed(2)} at the start — the paragraph is ` +
                'travelling or resizing into place, and it may do neither',
            );
            break;
          }
        }
        // AND NOTHING STANDS BETWEEN THE TYPE AND THE PAGE ONCE IT HAS ARRIVED.
        // Every one of those four composites the paragraph, and composited text is
        // text rasterised without subpixel antialiasing — measured at up to 136
        // levels on a channel against the same type painted directly. The page the
        // reader comes to rest on is meant to be one the arrival never touched.
        if (atLanding.between !== '1 none none none none') {
          failures.push(
            `at the landing the Panel's copy is drawn through \`${atLanding.between}\` rather than ` +
              '`1 none none none none` (opacity, transform, mask, filter, clip) — each of those leaves the ' +
              'paragraph on its own compositing layer and costs the type its subpixel antialiasing, so the ' +
              'page the reader rests on is not the page the composition drew. `blur(0px)` and `inset(0)` are ' +
              'this failure too, and read as though they were nothing.',
          );
        }
        notes.push(
          `the copy arrives: painted ${topInk.toFixed(2)} at the top and ${landedInk.toFixed(2)} at the ` +
            `landing, ${atTop.box[0]?.toFixed(1)}x${atTop.box[1]?.toFixed(1)} at every moment between`,
        );
      }

      // ---- one notch turns the page --------------------------------------
      const wheeled = await page.evaluate(
        async ({ frames: budget, gap }) => {
          const rest = () => new Promise((next) => setTimeout(next, gap));
          const settleScroll = async () => {
            for (let frame = 0; frame < budget; frame += 1) {
              await new Promise((next) => requestAnimationFrame(next));
            }
            return window.scrollY;
          };
          const notch = (target, deltaY) =>
            target.dispatchEvent(new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true }));

          window.scrollTo(0, 0);
          await rest();
          notch(document.documentElement, 100);
          const down = await settleScroll();

          await rest();
          notch(document.documentElement, -100);
          const up = await settleScroll();

          // A notch begun on the photographs is the photographs', even though the
          // page has somewhere to go: the strip holds the gesture until the wheel
          // stops, so the scroll that reaches the end of the roll cannot also turn
          // the page.
          await rest();
          const track = document.querySelector('.front-screen__photos');
          notch(track ?? document.documentElement, 100);
          const held = await settleScroll();

          window.scrollTo(0, 0);
          return { down, up, held, hadTrack: Boolean(track) };
        },
        { frames: FRAMES, gap: GESTURE_GAP },
      );

      const far = landing.ports[1] ?? 0;
      if (Math.abs(wheeled.down - far) > SLACK) {
        failures.push(
          `one wheel notch left the page at ${wheeled.down.toFixed(1)}px rather than on the Panel's landing at ` +
            `${far.toFixed(1)}px — the turn is not being taken on one notch`,
        );
      }
      if (Math.abs(wheeled.up) > SLACK) {
        failures.push(
          `one notch back left the page at ${wheeled.up.toFixed(1)}px rather than at the top — the turn does ` +
            'not reverse',
        );
      }
      if (!wheeled.hadTrack) {
        failures.push('no .front-screen__photos to take a wheel gesture — the arbitration cannot be asserted');
      } else if (Math.abs(wheeled.held) > SLACK) {
        failures.push(
          `a wheel notch begun on the photographs moved the page to ${wheeled.held.toFixed(1)}px — the strip ` +
            'owns a gesture that began on it, or the page turns out from under a reader spinning the roll. ' +
            'src/kernel/wheel.ts is the arbitration.',
        );
      }
      notes.push(
        `one notch: 0 → ${wheeled.down.toFixed(0)}px and back to ${wheeled.up.toFixed(0)}px; a notch on the ` +
          `photographs left the page at ${wheeled.held.toFixed(0)}px`,
      );

      // ---- and one PUSH turns one page, in both directions ----------------
      // Three streams, and the pair of failures they stand against are opposite
      // ones that the same file has shipped in turn. A flick decided per EVENT
      // chains through every port and runs the document to its end (#205); a
      // flick decided per GESTURE cannot be followed by a second one until its
      // own momentum has died, so the reader waits out an animation to be allowed
      // to scroll (#210). One flick must move ONE port and two flicks must move
      // TWO, and neither claim catches both faults: the per-event fault passes
      // the second, and the per-gesture fault passes the first.
      //
      // WHAT MAKES THE STREAM ONE GESTURE IS THIS FILE'S OWN MEASUREMENT, and
      // that is the second version of this Check rather than a flourish. The
      // first asked the Kernel how many gestures it had counted and asserted "no
      // more turns than gestures" — which the per-event mutation walked straight
      // through, because a Kernel that has stopped grouping events reports sixty
      // gestures for one flick and the invariant goes slack. The count was part
      // of what was under test. So the gap between notches is timed HERE, against
      // the Kernel's own boundary lifted out of its source.
      const flicked = await page.evaluate(
        async ({ frames: budget, peak, rise, decay, dead, after, slack, tries: allowed, boundary }) => {
          const frame = () => new Promise((next) => requestAnimationFrame(next));
          const rest = () => new Promise((next) => setTimeout(next, boundary + 60));
          const notch = (deltaY) =>
            document.documentElement.dispatchEvent(
              new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true }),
            );

          const ports = window.portfolio?.ports?.() ?? [];
          const standing = () => ports.findIndex((port) => Math.abs(port - window.scrollY) <= slack);

          /** Put the page on a port and wait until it is actually standing there. */
          const put = async (y) => {
            window.portfolio?.snapping?.(false);
            window.scrollTo(0, y);
            window.portfolio?.snapping?.(true);
            for (let waited = 0; Math.abs(window.scrollY - y) > 1 && waited < budget; waited += 1) {
              await frame();
            }
            await frame();
          };

          /**
           * One gesture: a flick, and optionally a SECOND flick delivered into
           * the first one's tail once the page has finished arriving.
           *
           * The second flick's moment is found rather than counted to. The turn
           * eases for something over half a second and a notch is a frame, so
           * "flick again at notch twenty-six" is a race against the frame rate:
           * fast frames put the second push mid-flight, where it retargets the
           * turn already heading for the same port and correctly does nothing,
           * and the Check would fail for the machine's reasons. So the tail runs
           * until the page is STANDING on a port, and the second flick goes a few
           * notches after that — which is also the thing being claimed, in the
           * reader's own terms: the page has arrived, they push again, and it
           * goes.
           */
          const flick = async (from, sign, again) => {
            await put(from);
            await rest(); // whatever gesture came before this one is over
            const began = standing();
            let widest = 0;
            let gestures = 1;
            let last = performance.now();
            let notches = 0;
            const send = async (px) => {
              const now = performance.now();
              if (notches > 0 && now - last > boundary) gestures += 1;
              if (notches > 0) widest = Math.max(widest, now - last);
              last = now;
              notches += 1;
              notch(sign * px);
              await frame();
            };

            for (let step = 1; step <= rise; step += 1) await send((peak * step) / rise);
            let px = peak;
            let arrived = 0;
            let pushed = false;
            for (let tail = 0; tail < budget; tail += 1) {
              px = Math.max(dead, px * decay);
              await send(px);
              if (!again || pushed) {
                if (px <= dead) break; // the momentum is spent
                continue;
              }
              // Standing on a port that is not the one this began on: the turn
              // has landed, and the momentum is still arriving.
              const at = standing();
              if (at >= 0 && at !== began) arrived += 1;
              if (arrived < after) continue;
              pushed = true;
              for (let step = 1; step <= rise; step += 1) await send((peak * step) / rise);
              let again2 = peak;
              for (let more = 0; more < rise * 3; more += 1) {
                again2 = Math.max(dead, again2 * decay);
                await send(again2);
              }
              break;
            }

            for (let held = 0; held < budget; held += 1) await frame();
            return {
              from,
              began,
              landed: window.scrollY,
              at: standing(),
              notches,
              widest,
              gestures,
              secondSent: pushed,
              tries: 1,
            };
          };

          /**
           * The same stream until the machine delivers it as a single gesture, or
           * `allowed` tries. A frame long enough to be a pause splits the stream
           * and adds a push, and the extra turn is then CORRECT — so this is a
           * retry for the STRONG claim, not until the answer is liked, and a
           * stream that stayed split is asserted against the weak one instead.
           */
          const attempt = async (from, sign, again) => {
            let read = await flick(from, sign, again);
            for (let count = 2; count <= allowed && read.gestures > 1; count += 1) {
              read = { ...(await flick(from, sign, again)), tries: count };
            }
            return read;
          };

          const last = ports[ports.length - 1] ?? 0;
          const down = await attempt(0, 1, false);
          const up = await attempt(last, -1, false);
          const twice = await attempt(0, 1, true);
          window.scrollTo(0, 0);
          return { ports, down, up, twice };
        },
        {
          frames: FRAMES,
          peak: FLICK_PEAK,
          rise: FLICK_RISE,
          decay: FLICK_DECAY,
          dead: FLICK_DEAD,
          after: FLICK_AFTER,
          slack: SLACK,
          tries: FLICK_TRIES,
          boundary: KERNEL_GAP,
        },
      );

      // PORTS MOVED EQUALS PUSHES DELIVERED, which is the whole invariant and is
      // why the three streams are asserted by one rule rather than three. Too
      // many is #205 — a tail read as a push, chaining through every port; too
      // few is #210 — a push read as a tail, so the reader cannot flick again.
      // A stall splits the stream and adds a push nobody made, which can only
      // raise the CEILING: the floor is the reader's own pushes and holds
      // however badly the machine behaved, so the direction that matters most —
      // the page refusing to move — is never asserted vacuously.
      for (const [label, read, pushes] of [
        ['one flick down from the top', flicked.down, 1],
        ['one flick up from the foot', flicked.up, 1],
        ['a second flick into the first one’s momentum', flicked.twice, 2],
      ]) {
        const moved = Math.abs(read.at - read.began);
        const where =
          read.at < 0
            ? `${read.landed.toFixed(1)}px, which is not a port at all`
            : `port ${read.at} at ${read.landed.toFixed(1)}px`;
        const stream =
          `${read.notches} notches, no two more than ${read.widest.toFixed(0)}ms apart against the Kernel's ` +
          `${KERNEL_GAP}ms boundary`;
        if (pushes > 1 && !read.secondSent) {
          failures.push(
            `${label}: the page never finished arriving, so the second flick was never delivered — ` +
              `${read.notches} notches went by with the page at ${read.landed.toFixed(1)}px. A turn that does ` +
              'not land inside one flick’s own momentum is not something this Check can tell from a turn that ' +
              'never happened, so it refuses to report either.',
          );
        } else if (moved < pushes) {
          failures.push(
            `${label} — ${stream} — moved the page ${moved} port(s), to ${where}, and ${pushes} push(es) were ` +
              'delivered. A PUSH THE READER MAKES HAS TO TURN A PAGE: a second flick into the first one’s ' +
              'momentum is a fresh push and not a tail, and swallowing it makes the reader wait out an ' +
              'animation to be allowed to scroll (#210). The shape the wheel handler follows in ' +
              'src/kernel/page-turn.ts is what tells the two apart — a push rises, a tail decays.',
          );
        } else if (moved > pushes + read.gestures - 1) {
          failures.push(
            `${label} — ${stream}, so ${read.gestures} gesture(s) carrying ${pushes} push(es) — moved the page ` +
              `${moved} port(s), to ${where}. ONE PUSH TURNS ONE PAGE: a momentum tail is not a push, and read ` +
              'as one it takes the port after the one it just reached, chains through every port and runs the ' +
              'document to its end (#205). src/kernel/page-turn.ts.',
          );
        }
      }
      notes.push(
        `one flick: down ${flicked.down.from.toFixed(0)} → ${flicked.down.landed.toFixed(0)}px over ` +
          `${flicked.down.notches} notches, up ${flicked.up.from.toFixed(0)} → ` +
          `${flicked.up.landed.toFixed(0)}px over ${flicked.up.notches}; flicked again into the tail: ` +
          `${flicked.twice.from.toFixed(0)} → ${flicked.twice.landed.toFixed(0)}px over ` +
          `${flicked.twice.notches}; ${flicked.down.tries}/${flicked.up.tries}/${flicked.twice.tries} ` +
          `try/tries, widest gaps ${flicked.down.widest.toFixed(0)}/${flicked.up.widest.toFixed(0)}/` +
          `${flicked.twice.widest.toFixed(0)}ms against a ${KERNEL_GAP}ms boundary`,
      );

      // ---- the word, HELD across the second turn (#193) ------------------
      // Placed rather than flicked: what is being asserted is where the word IS
      // at each of two resting places and between them, not how it got there —
      // and the snapping has to come off first or every position in between is
      // pulled straight back onto the port it left.
      const hold = await page.evaluate(async () => {
        const kernel = window.portfolio;
        const marked = [...document.querySelectorAll('[data-section][data-landing-word]')];
        const list = kernel.ports();
        // THE PREMISE, HANDED BACK ON ITS OWN so it fails as a premise rather
        // than as four confusing consequences: with fewer than two Sections
        // carrying the word there is nothing to hold it across, and every
        // assertion below would pass by comparing a box to itself.
        if (marked.length < 2 || list.length < 3) {
          return { marked: marked.length, ports: list.length };
        }

        const portOf = (el) => {
          const style = getComputedStyle(el);
          return (
            el.getBoundingClientRect().top +
            window.scrollY -
            (Number.parseFloat(style.scrollMarginTop) || 0)
          );
        };
        // Read before anything is placed: a port is measured from a box, and the
        // box moves as the page does.
        const from = portOf(marked[0]);
        const to = portOf(marked[marked.length - 1]);
        const last = list[list.length - 1];

        kernel.snapping(false);
        const frame = () => new Promise((f) => requestAnimationFrame(() => requestAnimationFrame(f)));
        const box = (el) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom };
        };
        /** A drawing of PROJECTS the reader can actually see. */
        const shown = (el) => {
          if (!el) return false;
          const style = getComputedStyle(el);
          if (style.visibility === 'hidden' || style.display === 'none') return false;
          if (Number(style.opacity) === 0) return false;
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return false;
          return r.bottom > 0 && r.top < window.innerHeight;
        };
        const at = async (y) => {
          window.scrollTo(0, y);
          await frame();
          const roof = document.querySelector('.front-screen__cut-roof');
          const copy = document.querySelector('.projects-panel__copy');
          return {
            y: window.scrollY,
            word: box(document.querySelector('.front-screen__cut-word')),
            roof: roof && getComputedStyle(roof).display !== 'none' ? box(roof) : null,
            copyLeft: copy ? copy.getBoundingClientRect().left : null,
            words: [
              document.querySelector('.front-screen__cut-word'),
              document.querySelector('.projects-panel__masthead'),
              document.querySelector('[data-eater-map-masthead]'),
            ].filter((el) => shown(el)).length,
          };
        };

        // JUST BEFORE THE HOLD ENGAGES, where the word is still this Section's
        // own box in the document — which is the only reading that can say
        // whether the pinned offset is the word's own resting place. Two
        // readings of a HELD word agree with each other however wrong both are:
        // a 40px error in the derived offset moved the word at both resting
        // places by the same 40px and the comparison below passed.
        const APPROACH = 2;
        const before = await at(from - APPROACH);
        const rest = { first: await at(from), second: await at(to) };
        const between = [];
        for (const share of [0.05, 0.25, 0.5, 0.75, 0.95]) {
          between.push(await at(from + (to - from) * share));
        }
        // One screen past the last marked Section, where the word has to have
        // travelled with the document rather than stayed on the window.
        const leaving = await at(to + window.innerHeight / 2);
        const gone = await at(last);

        window.scrollTo(0, 0);
        await frame();
        kernel.snapping(true);
        return {
          marked: marked.length,
          ports: list.length,
          from,
          to,
          approach: APPROACH,
          before,
          rest,
          between,
          leaving,
          gone,
        };
      });

      if (hold.marked < 2 || hold.ports < 3) {
        failures.push(
          `the hold has nothing to hold across: ${hold.marked} Section(s) carry data-landing-word ` +
            `and the document has ${hold.ports} resting place(s). Two Sections have to stand the ` +
            `word in their own masthead's slot for #193's device to exist at all, and with fewer ` +
            `than that every claim about it passes without asserting anything.`,
        );
      } else {
        // THE BOX AT ONE RESTING PLACE AGAINST THE BOX AT THE OTHER, which is
        // #193's criterion in its own words: an equality between two readings
        // rather than either of them against a number somebody typed.
        for (const side of ['x', 'y', 'w', 'h']) {
          const a = hold.rest.first.word[side];
          const b = hold.rest.second.word[side];
          if (Math.abs(a - b) > STILL) {
            failures.push(
              `PROJECTS moved between the two resting places: ${side} ${a.toFixed(1)} at the ` +
                `landing against ${b.toFixed(1)} at the Section after it. The word is meant to be ` +
                `the one thing the second page turn does not move.`,
            );
          }
        }

        // AND THE OFFSET IT IS HELD AT IS THE WORD'S OWN RESTING PLACE, which
        // is the assertion the two readings above CANNOT make. Approached from
        // two pixels above the landing the word is still an ordinary box in this
        // Section's document, so its viewport position there is the composition's
        // own answer; pinned, it has to be that position less the two pixels of
        // scroll. Without this a wrong derivation is invisible: the box agrees
        // with itself at both resting places no matter where it is standing.
        const engaged = hold.before.word.y - hold.approach - hold.rest.first.word.y;
        if (Math.abs(engaged) > STILL) {
          failures.push(
            `PROJECTS moved ${engaged.toFixed(1)}px as the hold engaged: it stands at ` +
              `${hold.before.word.y.toFixed(1)} two pixels above the landing and is pinned at ` +
              `${hold.rest.first.word.y.toFixed(1)}, where the composition puts it at ` +
              `${(hold.before.word.y - hold.approach).toFixed(1)}. The pinned offset is derived from ` +
              `the landing rather than measured off the page, so this is what says the derivation ` +
              `still agrees with the box it replaces.`,
          );
        }

        // ONE WORD, EVERYWHERE. At most one drawing of PROJECTS is visible at
        // any of these positions, and exactly one wherever a Section that
        // carries it owns the screen — the Catalogue carries none by decision,
        // so none is the right answer at the last port and is asserted below
        // rather than here.
        for (const [where, seen] of [
          ['the landing', hold.rest.first],
          ['the Section after it', hold.rest.second],
          ...hold.between.map((seen, i) => [`${(i + 1) * 20 - 15}% through the turn`, seen]),
        ]) {
          if (seen.words !== 1) {
            failures.push(
              `${seen.words} drawing(s) of PROJECTS visible at ${where}, not 1 — the held word, ` +
                `the Panel's hidden masthead and the Eater Map's own masthead are three elements ` +
                `and the reader may only ever meet one of them.`,
            );
          }
        }

        // THE ROOF IS UP ONLY BETWEEN THEM.
        for (const [where, seen] of [
          ['the landing', hold.rest.first],
          ['the Section after it', hold.rest.second],
        ]) {
          if (seen.roof) {
            failures.push(
              `the roof is up at ${where}, where nothing is crossing: it paints the ground over ` +
                `the word's own column, so at rest it is cutting a composition instead of hiding ` +
                `one going past — the Gallery's subheading at one end, the Eater Map's first grid ` +
                `hairline at the other.`,
            );
          }
        }
        for (const [i, seen] of hold.between.entries()) {
          if (!seen.roof) {
            failures.push(
              `the roof is down ${(i + 1) * 20 - 15}% through the turn, so the Section going past ` +
                `is drawing straight through the letters.`,
            );
            continue;
          }
          // THE ROOF REACHES THE WINDOW'S TOP EDGE AND IS THE WORD'S OWN
          // COLUMN. Both are relationships between two readings rather than
          // numbers: the roof's top is written by undoing the hold, so a roof
          // that does not reach the edge is the two spending different lengths
          // for the same name — which shipped once, as a custom property
          // carrying a container query unit resolving differently on a parent
          // and on a child.
          if (seen.roof.y > STILL) {
            failures.push(
              `the roof starts ${seen.roof.y.toFixed(1)}px down the window ${(i + 1) * 20 - 15}% ` +
                `through the turn instead of at its top edge, so the composition going past is ` +
                `visible in the air above the word.`,
            );
          }
          if (
            Math.abs(seen.roof.x - seen.word.x) > STILL ||
            Math.abs(seen.roof.w - seen.word.w) > STILL
          ) {
            failures.push(
              `the roof is not the word's own column ${(i + 1) * 20 - 15}% through the turn: ` +
                `${seen.roof.x.toFixed(1)}+${seen.roof.w.toFixed(1)} against a word at ` +
                `${seen.word.x.toFixed(1)}+${seen.word.w.toFixed(1)}.`,
            );
          }
          if (seen.copyLeft !== null && seen.roof.right > seen.copyLeft + STILL) {
            failures.push(
              `the roof reaches the Gallery's copy ${(i + 1) * 20 - 15}% through the turn: its ` +
                `right edge is at ${seen.roof.right.toFixed(1)} against a copy that starts at ` +
                `${seen.copyLeft.toFixed(1)}. That block stands BESIDE the word, not under it, and ` +
                `is meant to cross the screen in full.`,
            );
          }
        }

        // AND IT LEAVES WITH THE SECTION IT HEADS.
        const travelled = hold.rest.second.word.y - hold.leaving.word.y;
        const scrolled = hold.leaving.y - hold.rest.second.y;
        if (Math.abs(travelled - scrolled) > 1) {
          failures.push(
            `past the last Section that carries it, PROJECTS travelled ${travelled.toFixed(1)}px ` +
              `against ${scrolled.toFixed(1)}px of scroll — it has to go up at exactly the ` +
              `document's rate from there, or it is either stuck on the window or gone in one frame.`,
          );
        }
        if (hold.gone.word.bottom > 0) {
          failures.push(
            `PROJECTS is still on screen at the last resting place, ${hold.gone.word.bottom.toFixed(1)}px ` +
              `down: the Catalogue is not a Showcase and does not carry the word, so it has to have ` +
              `left with the Section above it.`,
          );
        }
        if (hold.gone.words !== 0) {
          failures.push(
            `${hold.gone.words} drawing(s) of PROJECTS visible at the last resting place, where the ` +
              `Section deliberately carries none.`,
          );
        }

        notes.push(
          `PROJECTS held from ${hold.from.toFixed(0)}px to ${hold.to.toFixed(0)}px across ` +
            `${hold.marked} Section(s) that carry it: box ${hold.rest.first.word.x.toFixed(1)},` +
            `${hold.rest.first.word.y.toFixed(1)} ${hold.rest.first.word.w.toFixed(1)}x` +
            `${hold.rest.first.word.h.toFixed(1)} at both resting places; roof ` +
            `${hold.between[2].roof ? hold.between[2].roof.w.toFixed(1) + 'px wide, ' + (hold.between[2].copyLeft - hold.between[2].roof.right).toFixed(1) + 'px clear of the copy' : 'down'} ` +
            `mid-turn and down at both; travelled ${travelled.toFixed(0)}px against ` +
            `${scrolled.toFixed(0)}px of scroll after it, and gone by the last port`,
        );
      }

      return { failures, notes };
    } finally {
      await context.close();
    }
  },
};
