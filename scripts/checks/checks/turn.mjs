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
 *   * AND ONE TRACKPAD FLICK TURNS ONE PAGE, which is the same claim about the
 *     device most readers actually have and was false for as long as it was only
 *     asserted about a notch. A mouse notch is a single event of about a hundred
 *     pixels; a light two-finger flick is thirty or more events of five or six,
 *     and its momentum tail is still arriving after the turn has landed. Decided
 *     per event, that tail took the port after the one it had just reached and
 *     ran the document to its end — so the Panel, which is what this whole file
 *     is about, could not be stopped on from a trackpad in either direction
 *     (#205). Every other assertion in this Check passed throughout.
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
 * How many frames a flick keeps delivering events for, one per frame.
 *
 * PACED ON THE FRAME AND NOT ON A TIMER, so the stream is bounded by the browser's
 * own rendering rather than by a clock: a page with a turn in flight is running
 * `requestAnimationFrame`, so consecutive events are a frame apart. It is long
 * enough to outlast a turn ON PURPOSE — the tail still arriving AFTER the turn has
 * landed is the whole failure, and a flick that stopped when the turn did would
 * assert nothing about it.
 *
 * SIXTY AND NOT NINETY, because every gap is a chance for the machine to stall
 * past the boundary and split the stream. At a frame apiece this is about a
 * second against a turn that eases for under six hundred milliseconds, so a third
 * of the events arrive after the landing — the failure needs one — and there are
 * thirty fewer gaps to get through than the first version had.
 */
const FLICK = 60;

/** The delta one event of a flick carries, in px: a real trackpad's, not a notch's. */
const FLICK_DELTA = 6;

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

      // ---- and one flick turns one page ----------------------------------
      // A stream rather than an event, in both directions, from the two ends of
      // the document. The Panel's port is the answer BOTH times, which is what
      // makes this a pair: the failure it exists for overshoots the Panel going
      // down and overshoots it coming up, and either half alone still reads as a
      // page that turns.
      //
      // WHAT MAKES THE STREAM ONE GESTURE IS THIS FILE'S OWN MEASUREMENT, and
      // that is the second version of this Check rather than a flourish. The
      // first asked the Kernel how many gestures it had counted and asserted
      // "no more turns than gestures" — which the per-event mutation walked
      // straight through, because a Kernel that has stopped grouping events
      // reports ninety gestures for one flick and the invariant goes slack. The
      // count was part of what was under test. So the gap between events is
      // timed HERE, against the Kernel's own boundary lifted out of its source,
      // and a stream with no gap over that boundary is one gesture whatever the
      // Kernel thinks it is.
      const flicked = await page.evaluate(
        async ({ frames: budget, events, delta, gap, tries: allowed, boundary }) => {
          const frame = () => new Promise((next) => requestAnimationFrame(next));
          const rest = () => new Promise((next) => setTimeout(next, gap));
          const notch = (deltaY) =>
            document.documentElement.dispatchEvent(
              new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true }),
            );

          /** Put the page on a port and wait until it is actually standing there. */
          const put = async (y) => {
            window.scrollTo(0, y);
            for (let waited = 0; Math.abs(window.scrollY - y) > 1 && waited < budget; waited += 1) {
              await frame();
            }
            await frame();
          };

          const flick = async (from, deltaY) => {
            await put(from);
            await rest(); // whatever gesture came before this one is over
            let widest = 0;
            // HOW MANY GESTURES THIS STREAM IS, BY THIS FILE'S OWN CLOCK: one,
            // plus every gap wide enough for the Kernel to have ended a gesture
            // at. Counted here rather than asked of the page because the grouping
            // is the thing under test, and a Kernel that has stopped grouping
            // would be handed the excuse for its own failure.
            let gestures = 1;
            let last = performance.now();
            for (let event = 0; event < events; event += 1) {
              const now = performance.now();
              if (event > 0 && now - last > boundary) gestures += 1;
              if (event > 0) widest = Math.max(widest, now - last);
              last = now;
              notch(deltaY);
              await frame();
            }
            // The stream has stopped; give the turn it asked for time to arrive.
            for (let held = 0; held < budget; held += 1) await frame();
            return { from, landed: window.scrollY, widest, gestures, tries: 1 };
          };

          /**
           * The same flick until the machine delivers one as a single gesture, or
           * `allowed` tries.
           *
           * A frame long enough to be a pause splits the stream, and two turns
           * are then CORRECT rather than a failure — so this is not a retry until
           * the answer is liked. It is a retry for the STRONG claim, which is
           * "one gesture lands on the Panel's port"; a stream that stayed split
           * for every try is still asserted against the weak one, "no more turns
           * than gestures", and the note says which claim the run got.
           */
          const attempt = async (from, deltaY) => {
            let read = await flick(from, deltaY);
            for (let tries = 2; tries <= allowed && read.gestures > 1; tries += 1) {
              read = { ...(await flick(from, deltaY)), tries };
            }
            return read;
          };

          const ports = window.portfolio?.ports?.() ?? [];
          const down = await attempt(0, delta);
          const up = await attempt(ports[ports.length - 1] ?? 0, -delta);
          window.scrollTo(0, 0);
          return { ports, down, up };
        },
        {
          frames: FRAMES,
          events: FLICK,
          delta: FLICK_DELTA,
          gap: GESTURE_GAP,
          tries: FLICK_TRIES,
          boundary: KERNEL_GAP,
        },
      );

      /** Which port a scroll position is standing on, or -1 if it is between two. */
      const standing = (y) => flicked.ports.findIndex((port) => Math.abs(port - y) <= SLACK);
      for (const [label, read, wants] of [
        ['down from the top', flicked.down, 1],
        ['up from the foot', flicked.up, flicked.ports.length - 2],
      ]) {
        const at = standing(read.landed);
        const moved = Math.abs(at - standing(read.from));
        const where =
          at < 0
            ? `${read.landed.toFixed(1)}px, which is not a port at all`
            : `port ${at} at ${read.landed.toFixed(1)}px`;
        if (read.gestures === 1 && at !== wants) {
          failures.push(
            `a flick ${label} — ${FLICK} events of ${FLICK_DELTA}px, no two more than ` +
              `${read.widest.toFixed(0)}ms apart against the Kernel's ${KERNEL_GAP}ms boundary, so one ` +
              `gesture — left the page on ${where} rather than on port ${wants} at ` +
              `${(flicked.ports[wants] ?? 0).toFixed(1)}px. ONE GESTURE TURNS ONE PAGE: a trackpad delivers a ` +
              'flick as a stream whose tail is still arriving after the turn has landed, so a turn decided ' +
              'per EVENT chains through every port and runs the document to its end. #205, and the decision ' +
              'the wheel handler holds in src/kernel/page-turn.ts.',
          );
        } else if (read.gestures > 1 && moved > read.gestures) {
          failures.push(
            `a flick ${label} stalled into ${read.gestures} gestures — its widest gap was ` +
              `${read.widest.toFixed(0)}ms against a ${KERNEL_GAP}ms boundary — and moved the page ${moved} ` +
              `ports, to ${where}. A gesture may turn at most one page. src/kernel/page-turn.ts, and #205.`,
          );
        }
      }
      notes.push(
        `a ${FLICK}-event flick: down ${flicked.down.from.toFixed(0)} → ${flicked.down.landed.toFixed(0)}px ` +
          `as ${flicked.down.gestures} gesture(s) in ${flicked.down.tries}, up ` +
          `${flicked.up.from.toFixed(0)} → ${flicked.up.landed.toFixed(0)}px as ${flicked.up.gestures} ` +
          `gesture(s) in ${flicked.up.tries}; widest gaps ${flicked.down.widest.toFixed(0)}ms and ` +
          `${flicked.up.widest.toFixed(0)}ms against a ${KERNEL_GAP}ms boundary`,
      );

      return { failures, notes };
    } finally {
      await context.close();
    }
  },
};
