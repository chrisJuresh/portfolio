import { DESK, open, settle } from '../lib/page.mjs';

/**
 * The Effect Stack covers everything the reader can see while its veil is open,
 * and nothing they cannot.
 *
 * TWO ASSERTIONS AND THEY PULL OPPOSITE WAYS, which is the whole reason this
 * Check is worth its runtime. The stack used to run the full height of the
 * document, and before that one screen. One screen left a SEAM — the treatment
 * stopped at the fold with the second Section untreated below it. The full
 * document has no seam and costs a phone a `mix-blend-mode` layer with a
 * `filter` on it around 17,000 device pixels tall, which is two to four times
 * `MAX_TEXTURE_SIZE` on the hardware this page is read on, and a layer that
 * cannot be handed out in one piece is a layer whose tiles come back missing.
 * That was reported twice as content vanishing and leaving its own gap behind.
 * effect-stack.css carries the arithmetic that lands between the two; this is
 * what stops the next edit sliding off either end of it.
 *
 * WHY THE VEIL AND NOT `--turn-span`. The published span is the mechanism, not
 * the requirement — a Check that read it back could only ever say the stack
 * agrees with itself, and would pass a veil that had stopped closing. So the
 * sweep asks the page two things it can answer without knowing why: how much
 * veil is left, and where the box is. `--fx-veil` is an unregistered custom
 * property, so `getPropertyValue` hands back the token stream and not a number;
 * a probe element carrying `opacity: var(--fx-veil)` makes CSSOM do the
 * clamp and resolve it, which is the same trick the strip's Timeline uses to
 * turn a Token into a length.
 *
 * WHY THE SNAPPING COMES OFF. Inside the band the page is two resting places
 * and nothing between, so every `scrollTo` in between is pulled straight back
 * onto the port it left and the sweep reads one position forty times.
 * scripts/checks/NOTES.md carries that trap by name.
 */

/** The phone this suite already measures at, and one short enough to be a
 *  different fit — the stack's height is a function of the window, so one
 *  window measures one branch of it. */
const PHONE = { width: 390, height: 844 };
const SHORT_PHONE = { width: 360, height: 640 };

const WINDOWS = [
  { name: `${DESK.width}x${DESK.height}`, viewport: DESK },
  { name: `${PHONE.width}x${PHONE.height}`, viewport: PHONE },
  { name: `${SHORT_PHONE.width}x${SHORT_PHONE.height}`, viewport: SHORT_PHONE },
];

/** How many places down the document to look. */
const STEPS = 40;

export const check = {
  name: 'effect-stack',
  title: 'the Effect Stack reaches everything its veil is open over, and stops there',

  /** @param {{ browser: import('playwright').Browser, origin: string }} ctx */
  async run({ browser, origin }) {
    /** @type {string[]} */
    const failures = [];
    /** @type {string[]} */
    const notes = [];

    for (const { name, viewport } of WINDOWS) {
      const { context, page } = await open(browser, origin, { viewport });
      try {
        failures.push(...(await settle(page)).map((why) => `${name}: ${why}`));

        const read = await page.evaluate(async (steps) => {
          const root = document.documentElement;
          const fx = document.querySelector('.fx');
          if (!fx) return { missing: 'no .fx in the document — the Effect Stack never rendered' };

          const kernel = /** @type {any} */ (window).portfolio;
          kernel?.snapping?.(false);

          // A real property, so CSSOM resolves the veil's clamp to a number.
          const probe = document.createElement('div');
          probe.style.cssText = 'position:absolute;visibility:hidden;opacity:var(--fx-veil)';
          root.append(probe);
          const veil = () => Number(getComputedStyle(probe).opacity);

          const frame = () => new Promise((go) => requestAnimationFrame(() => go(undefined)));

          const height = root.scrollHeight;
          const reach = Math.max(1, height - window.innerHeight);
          const step = reach / steps;

          /** @type {{ y: number, veil: number, top: number, bottom: number }[]} */
          const samples = [];
          for (let i = 0; i <= steps; i += 1) {
            const y = Math.min(reach, Math.round(i * step));
            window.scrollTo(0, y);
            await frame();
            await frame();
            const box = fx.getBoundingClientRect();
            samples.push({
              y: Math.round(window.scrollY),
              veil: veil(),
              top: box.top,
              bottom: box.bottom,
            });
          }

          probe.remove();
          window.scrollTo(0, 0);
          kernel?.snapping?.(true);

          const foot = (() => {
            const box = fx.getBoundingClientRect();
            return box.bottom + window.scrollY;
          })();

          // AND THE ROTATED LAYER STILL REACHES THE CORNERS. The halftone is
          // oversized and rotated so the corners of the stack stay covered; that
          // oversize is a PERCENTAGE of the stack, so shortening the stack
          // changes the box the invariant is about. A rotated rectangle's
          // bounding box is not the rectangle, so this asks the only question
          // that means anything: is each corner of .fx inside the layer's own
          // quad, measured in the layer's frame.
          const halftone = fx.querySelector('.fx-halftone');
          const lit = halftone && getComputedStyle(halftone).display !== 'none';
          let uncovered = null;
          let unreadable = null;
          if (lit) {
            const style = getComputedStyle(halftone);
            // THE ROTATION IS THE `rotate` PROPERTY AND NOT `transform`, and
            // reading the wrong one is not a wrong answer — it is NO answer.
            // `new DOMMatrixReadOnly('none')` is the identity, so a Check that
            // reads `transform` here compares an axis-aligned box against
            // itself, every corner lands exactly on the edge, and it passes
            // whatever the layer is doing. That is how this assertion first
            // shipped, and stripping the oversize walked straight through it.
            const matrix = new DOMMatrixReadOnly(
              style.transform === 'none' ? undefined : style.transform,
            );
            const spun = /([-\d.eE+]+)\s*(deg|rad|grad|turn)\s*$/.exec(style.rotate ?? '');
            const scale = { deg: Math.PI / 180, rad: 1, grad: Math.PI / 200, turn: Math.PI * 2 };
            const declared = (style.rotate ?? '').trim();
            if (declared && declared !== 'none' && !spun) {
              unreadable = declared;
            }
            const angle =
              Math.atan2(matrix.b, matrix.a) +
              (spun ? Number(spun[1]) * scale[spun[2]] : 0);

            const box = fx.getBoundingClientRect();
            const around = halftone.getBoundingClientRect();
            const centre = { x: around.left + around.width / 2, y: around.top + around.height / 2 };
            const half = { x: halftone.offsetWidth / 2, y: halftone.offsetHeight / 2 };
            const cos = Math.cos(-angle);
            const sin = Math.sin(-angle);
            for (const corner of [
              { x: box.left, y: box.top },
              { x: box.right, y: box.top },
              { x: box.left, y: box.bottom },
              { x: box.right, y: box.bottom },
            ]) {
              const dx = corner.x - centre.x;
              const dy = corner.y - centre.y;
              const local = { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
              const over = Math.max(
                Math.abs(local.x) - half.x,
                Math.abs(local.y) - half.y,
              );
              if (over > 0.5 && (!uncovered || over > uncovered.over)) {
                uncovered = {
                  over,
                  layer: `${halftone.offsetWidth}x${halftone.offsetHeight}`,
                  stack: `${Math.round(box.width)}x${Math.round(box.height)}`,
                  degrees: (angle * 180) / Math.PI,
                };
              }
            }
          }

          return {
            window: window.innerHeight,
            docHeight: height,
            foot,
            step,
            samples,
            lit,
            uncovered,
            unreadable,
          };
        }, STEPS);

        if (read.missing) {
          failures.push(`${name}: ${read.missing}`);
          continue;
        }

        const open_ = read.samples.filter((sample) => sample.veil > 0);
        if (open_.length === 0) {
          failures.push(
            `${name}: the veil is 0 at all ${read.samples.length} places down the document, so the ` +
              'Effect Stack is never drawn anywhere and this Check is asserting nothing. Either ' +
              '--fx-veil-from/--fx-veil-to no longer straddle the Turn, or the Turn is not moving.',
          );
          continue;
        }

        // 1. NO SEAM. Wherever any veil is left, the stack has to cover the
        //    whole window — a gap at either edge is treatment stopping in the
        //    middle of the page with the reader looking at it.
        for (const sample of open_) {
          if (sample.top > 0.5) {
            failures.push(
              `${name}: at scroll ${sample.y} the veil is ${sample.veil.toFixed(3)} but the stack's ` +
                `top edge is ${sample.top.toFixed(1)}px below the top of the window — that band of ` +
                'the page is untreated while the treatment is still on',
            );
            break;
          }
          if (sample.bottom < read.window - 0.5) {
            failures.push(
              `${name}: at scroll ${sample.y} the veil is ${sample.veil.toFixed(3)} but the stack ` +
                `ends ${(read.window - sample.bottom).toFixed(1)}px above the foot of the window ` +
                `(box bottom ${sample.bottom.toFixed(1)} of ${read.window}) — that is the seam`,
            );
            break;
          }
        }

        // 1b. AND THE ROTATED LAYER REACHES THE STACK'S OWN CORNERS, which is
        //     the same seam one layer down: a corner the halftone misses is a
        //     corner of the page with a layer of the treatment absent from it.
        if (read.unreadable) {
          failures.push(
            `${name}: the halftone declares \`rotate: ${read.unreadable}\`, which this Check cannot ` +
              'read as an angle — so it would be comparing an unrotated box and asserting nothing. ' +
              'Teach it that form rather than deleting the assertion.',
          );
        }
        if (read.uncovered) {
          failures.push(
            `${name}: the halftone is ${read.uncovered.layer} at ` +
              `${read.uncovered.degrees.toFixed(1)}deg over a ${read.uncovered.stack} stack and ` +
              `misses a corner of it by ` +
              `${read.uncovered.over.toFixed(1)}px — its oversize is a share of a box that has ` +
              'changed height, so the share no longer covers the rotation',
          );
        }

        // 2. AND NOTHING PAST IT. The last place the veil is open, plus a
        //    window, is the deepest pixel the stack can ever be seen at. Height
        //    past that is a filtered, blended, masked layer nobody will look at,
        //    and on a phone it is what makes the texture too big to hand out.
        const last = open_[open_.length - 1];
        const useful = last.y + read.window;
        const slack = read.foot - useful;
        // One sweep step, because the sweep can only locate the veil's close to
        // within one, plus a pixel for the rounding underneath.
        const allowed = read.step + 1;
        if (slack > allowed) {
          failures.push(
            `${name}: the stack's foot is at ${Math.round(read.foot)} but nothing below ` +
              `${Math.round(useful)} is ever visible with any veil left — ${Math.round(slack)}px of ` +
              `layer (of ${Math.round(read.docHeight)} document) is filtered, blended and masked for ` +
              'nobody. effect-stack.css says why that height is a phone bug and not just waste.',
          );
        } else {
          const saved = Math.round(read.docHeight - read.foot);
          notes.push(
            `${name}: veil open to scroll ${last.y}, stack ${Math.round(read.foot)} tall of a ` +
              `${Math.round(read.docHeight)} document (${saved}px not built)`,
          );
        }
      } finally {
        await context.close();
      }
    }

    return { failures, notes };
  },
};
