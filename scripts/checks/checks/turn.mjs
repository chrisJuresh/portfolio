import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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
 *   * A notch begun on the photographs belongs to the photographs. Without the
 *     arbitration the page turns out from under a reader who is spinning the
 *     strip, which is the loudest of these and still easy to reintroduce.
 *
 * IT ASSERTS NOTHING ABOUT THE CURVE. How the turn is eased and how fast is the
 * author's, and so is the stagger; what is asserted is that a notch arrives.
 */

/** How long to leave a gesture alone so the next notch starts a fresh one. */
const GESTURE_GAP = 260;

/** How many frames a turn is given to land before it is called stuck. */
const FRAMES = 90;

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
      if (landing.ports.length !== 2) {
        failures.push(
          `the page has ${landing.ports.length} resting place(s) — inside the landing band it is two, the top ` +
            'of the document and the Panel’s own landing, and nothing between',
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

      return { failures, notes };
    } finally {
      await context.close();
    }
  },
};
