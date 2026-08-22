import { DESK, open, settle } from '../lib/page.mjs';

/**
 * The Frame's measured geometry, as assertions.
 *
 * The browser window at the foot of the Projects Panel is the largest single
 * piece of bespoke drawing in the repository, and until this file every number
 * in it was protected by a paragraph saying where it came from. Each of those
 * paragraphs describes a failure a person looking at the running page would not
 * notice: a glyph a pixel off the centre the design render measured, a window
 * whose corner and whose titlebar's corner are cut to two different lengths, a
 * recording box that stops being inset on exactly three sides, an occlusion that
 * is lucky rather than exact, a titlebar that is neither of its three materials.
 *
 * None of them is aesthetic. Every measured share is the author's to change
 * through a Token, and every assertion here reads that Token back — so moving
 * the sidebar's centre moves the glyph AND what this expects of it, and nothing
 * fails. What cannot change without failing is the RELATIONSHIP: that the glyph
 * lands where its own Token says, that two lengths which have to be equal are,
 * and that the drawing is still built out of the pair of numbers the render
 * gives up rather than out of a coordinate somebody wrote down once.
 *
 * TWO WINDOWS, AND THE SECOND ONE IS THE POINT OF THE SECOND HALF. The chrome
 * sheds its small glyphs below a Frame of 520px, and the gate is a CONTAINER
 * query rather than a viewport one — the question is how wide the Frame is, not
 * how wide the window is, and the composition is fitted to the smaller of the
 * page's width and what its height will carry. So a short, wide window draws a
 * small Frame, and that is the one window where the two questions give different
 * answers. Measured at DESK alone, the whole of that mechanism could be a media
 * query and this Check would not notice.
 */

/** Wide enough that a viewport gate at 520 would not fire, short enough that the
 *  fit solves the Frame to well under 520. Measured: 468px of Frame at 1440 of
 *  window. Its width is DESK's, and DESK is the suite's own rather than a copy,
 *  so this Check cannot drift away from the window the others measure at. */
const SHORT = { width: DESK.width, height: 450 };

/** A share of the Frame's width, and it is TIGHT ON PURPOSE. 0.0003 is 0.28px at
 *  DESK, which is fifteen times the largest disagreement the chrome actually
 *  shows (2e-5 of the Frame) and three times the worst case of Chromium's own
 *  1/64px layout units accumulating down a row of five margins.
 *
 *  It has to be that tight to catch the thing it exists for. The live page's own
 *  sidebar gap was written as the coordinate `1.79cqw`, derived from a measured
 *  edge that disagrees with the pitch the same table states by half a per cent —
 *  so the glyph landed 0.0005 of the Frame past its measured centre, 0.46px here.
 *  At three quarters of a pixel of tolerance that mutation passed, which is a
 *  Check permitting exactly the flattening it exists to prevent. */
const CENTRE_TOLERANCE = 0.0003;

/** Two lengths that are meant to be the same length, in px. */
const LENGTH_TOLERANCE = 0.1;

/** The drop into the subheading's second line, in px. */
const DROP_TOLERANCE = 0.5;

/** Every control, by the pair of Tokens that places it: where its centre is and
 *  how wide its ink is. This list IS the render's table — the CSS computes each
 *  gap from the pair either side of it, and this asserts that the arithmetic
 *  came out at the centres it was solved for. */
const CONTROLS = [
  { name: 'the sidebar toggle', part: 'sidebar', centre: 'sidebar-centre', width: 'sidebar-w' },
  { name: 'the back chevron', part: 'back', centre: 'back-centre', width: 'chevron-w' },
  { name: 'the forward chevron', part: 'fwd', centre: 'fwd-centre', width: 'chevron-w' },
  { name: 'the share glyph', part: 'share', centre: 'share-centre', width: 'share-w' },
  { name: 'the new-tab glyph', part: 'new', centre: 'new-centre', width: 'new-w' },
  { name: 'the tabs glyph', part: 'tabs', centre: 'tabs-centre', width: 'tabs-w' },
];

/** What the small-Frame reduction takes away, and what it must leave. Part names
 *  rather than selectors: the Section's class prefix is written once, in the page. */
const SHED = ['sidebar', 'back', 'fwd', 'share', 'new', 'tabs', 'reload', 'address-text'];
const KEPT = ['lights', 'address'];

/** The window a reading was taken at, which every failure names. */
const atWindow = (read) => `${read.viewport.width}x${read.viewport.height}`;

/**
 * Everything this Check reads off the page, in one round trip.
 *
 * The Panel is scrolled to first. Not for the layout, which does not depend on
 * where the reader is, but for `elementFromPoint`: the Frame is below the fold at
 * every window this runs at, and a hit test outside the viewport returns null —
 * which would make the one assertion that reads paint order rather than
 * arithmetic pass by never being asked.
 */
async function readPage(page) {
  await page.evaluate(async () => {
    document.querySelector('.projects-panel')?.scrollIntoView();
    await new Promise((frame) => requestAnimationFrame(frame));
  });

  return page.evaluate(
    ({ controls, shed: shedParts, kept }) => {
      const section = document.querySelector('.projects-panel');
      const stage = document.querySelector('.projects-panel__stage');
      const frame = document.querySelector('.projects-panel__frame');
      const bar = document.querySelector('.projects-panel__bar');
      const glass = document.querySelector('.projects-panel__glass');
      const content = document.querySelector('.projects-panel__content');
      const secondLine = document.querySelector('.projects-panel__sub span:last-child');
      const absent = [
        ['the Section', section],
        ['the stage', stage],
        ['the Frame', frame],
        ['the titlebar', bar],
        ['the glass canvas', glass],
        ['the content box', content],
        ["the subheading's second line", secondLine],
      ].filter(([, found]) => !found);
      if (absent.length > 0) {
        return { missing: `the Frame is missing a part this Check reads: ${absent.map(([what]) => what).join(', ')}` };
      }

      const style = getComputedStyle(frame);
      /** A Token off the Frame. Every one of these is a plain number, so it comes
       *  back usable rather than as a token sequence with a unit in it. */
      const token = (name) => Number(style.getPropertyValue(`--projects-panel-frame-${name}`));

      const fr = frame.getBoundingClientRect();
      /** A box as the render states one: a centre and a width, both as shares of
       *  the Frame. Named by its part, which is the Section's class prefix and
       *  the part's own name — the one place either is written. */
      const placed = (part) => {
        const element = frame.querySelector(`.projects-panel__${part}`);
        if (!element) return null;
        const r = element.getBoundingClientRect();
        if (getComputedStyle(element).display === 'none') return { hidden: true };
        return {
          hidden: false,
          centre: (r.left + r.width / 2 - fr.left) / fr.width,
          width: r.width / fr.width,
          // Against the Frame's WIDTH as well, because that is what every
          // measured share in the chrome is a share of.
          height: r.height / fr.width,
          right: (r.right - fr.left) / fr.width,
        };
      };

      /** A computed `border-radius` corner, resolved to px. It is a percentage on
       *  the Frame — the only form that reads the box it is cutting — and a
       *  length on the titlebar, and the whole assertion is that the two are the
       *  same measure. */
      const corner = (element, box) =>
        getComputedStyle(element)
          .borderTopLeftRadius.trim()
          .split(/\s+/)
          .map((part, axis) =>
            part.endsWith('%')
              ? (parseFloat(part) / 100) * (axis === 0 ? box.width : box.height)
              : parseFloat(part),
          );

      const lights = [...frame.querySelectorAll('.projects-panel__lights i')].map((light) => {
        const r = light.getBoundingClientRect();
        return { centre: (r.left + r.width / 2 - fr.left) / fr.width, width: r.width / fr.width };
      });

      const cr = content.getBoundingClientRect();
      const sub = secondLine.getBoundingClientRect();
      // Inside the overlap of the Frame and the line it bites into — which is
      // where the window has to be the thing that is painted.
      const overlaps = fr.left < sub.right && fr.top < sub.bottom && fr.right > sub.left;
      const over = overlaps
        ? document.elementFromPoint(
            (fr.left + Math.min(fr.right, sub.right)) / 2,
            (fr.top + Math.min(fr.bottom, sub.bottom)) / 2,
          )
        : null;

      const stageStyle = getComputedStyle(stage);

      return {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        frame: { width: fr.width, height: fr.height, ratio: fr.width / fr.height },
        ratioToken: token('ratio'),
        bar: bar.getBoundingClientRect().height,
        cornerToken: token('corner'),
        insetToken: token('inset'),
        barToken: token('bar'),
        dropToken: token('drop-share'),
        lightToken: { width: token('light-w'), pitch: token('light-pitch'), centre: token('light-centre') },
        frameCorner: corner(frame, fr),
        barCorner: corner(bar, { width: fr.width, height: fr.height }),
        lights,
        controls: Object.fromEntries(
          controls.map((control) => [
            control.part,
            {
              measured: placed(control.part),
              centre: token(control.centre),
              width: token(control.width),
            },
          ]),
        ),
        address: placed('address'),
        reload: placed('reload'),
        addressToken: {
          width: token('address-w'),
          height: token('address-h'),
          centre: token('address-centre'),
        },
        reloadToken: { width: token('reload-w'), centre: token('reload-centre') },
        content: {
          top: cr.top - fr.top,
          left: cr.left - fr.left,
          right: fr.right - cr.right,
          bottom: fr.bottom - cr.bottom,
        },
        occlusion: {
          overlaps,
          drop: fr.top - sub.top,
          line: sub.height,
          painted: over ? frame.contains(over) : null,
          over: over ? over.className || over.tagName : null,
        },
        // No z-index, no opacity, no filter and no transform on the stage: any of
        // them makes it a stacking context, which traps the Frame's own z-index
        // inside it and stops the window painting over the type it occludes.
        // Keyed by each property's own CSS name, so the assertion reads as the
        // list of things a stacking context can be made of.
        stacking: {
          'z-index': stageStyle.zIndex,
          opacity: stageStyle.opacity,
          filter: stageStyle.filter,
          transform: stageStyle.transform,
          isolation: stageStyle.isolation,
        },
        ladder: {
          tier: bar.dataset.glass ?? '',
          canvasShown: getComputedStyle(glass).display !== 'none',
          fill: getComputedStyle(bar).backgroundColor,
          backdrop:
            getComputedStyle(bar).backdropFilter ||
            getComputedStyle(bar).getPropertyValue('-webkit-backdrop-filter') ||
            'none',
        },
        chrome: {
          hidden: stage.getAttribute('aria-hidden') === 'true',
          interactive: [...stage.querySelectorAll('a, button, input, select, textarea, [tabindex], [role]')].map(
            (element) => element.tagName.toLowerCase(),
          ),
        },
        shed: Object.fromEntries(
          [...shedParts, ...kept].map((part) => [part, placed(part)?.hidden ?? null]),
        ),
      };
    },
    { controls: CONTROLS, shed: SHED, kept: KEPT },
  );
}

/** Everything that is true at any window the Frame is drawn wide at. */
function drawn(read) {
  /** @type {string[]} */
  const failures = [];
  const where = atWindow(read);
  const px = (share) => share * read.frame.width;

  // ---- the window's own proportion ---------------------------------------
  if (Math.abs(read.frame.ratio - read.ratioToken) > 0.005) {
    failures.push(
      `at ${where} the Frame is drawn at ${read.frame.ratio.toFixed(4)} and its Token asks for ` +
        `${read.ratioToken} — the window is not the shape the composition is fitted around`,
    );
  }

  // ---- one radius, one value ---------------------------------------------
  // The Frame's corner is a percentage of its own box and the titlebar's is a
  // container unit, and the whole reason the first is written that way is that
  // the two have to come out the same length. They stop agreeing silently — a
  // cqw on the Frame resolves against the VIEWPORT, which at 2560 is a curve half
  // again too big on the window's outer corners against the titlebar's.
  const corners = [...read.frameCorner, ...read.barCorner];
  const wanted = px(read.cornerToken);
  for (const [name, value] of [
    ["the Frame's horizontal", read.frameCorner[0]],
    ["the Frame's vertical", read.frameCorner[1] ?? read.frameCorner[0]],
    ["the titlebar's", read.barCorner[0]],
  ]) {
    if (Math.abs(value - wanted) > LENGTH_TOLERANCE) {
      failures.push(
        `at ${where} ${name} corner is ${value.toFixed(3)}px and the measured share asks for ` +
          `${wanted.toFixed(3)}px — the window and its titlebar are cut to two different radii`,
      );
    }
  }
  if (Math.max(...corners) - Math.min(...corners) > LENGTH_TOLERANCE) {
    failures.push(
      `at ${where} the window's corners range over ${(Math.max(...corners) - Math.min(...corners)).toFixed(3)}px ` +
        '— one radius has resolved against a different box from the others',
    );
  }

  // ---- the titlebar's height ---------------------------------------------
  if (Math.abs(read.bar - px(read.barToken)) > LENGTH_TOLERANCE) {
    failures.push(
      `at ${where} the titlebar is ${read.bar.toFixed(2)}px against the ${px(read.barToken).toFixed(2)}px its ` +
        'share of the Frame asks for',
    );
  }

  // ---- every control on its measured centre ------------------------------
  // The gaps in the stylesheet are computed from the pair of controls either side
  // of them. This is the other end of that: the arithmetic has to come out at the
  // centres it was solved for, or the chrome has quietly become a row of gaps
  // that happen to look right.
  for (const { name, part } of CONTROLS) {
    const control = read.controls[part];
    if (!control?.measured) {
      failures.push(`at ${where} ${name} is not in the chrome`);
      continue;
    }
    if (control.measured.hidden) {
      failures.push(`at ${where} ${name} is not drawn — the Frame is wide enough for every glyph here`);
      continue;
    }
    if (Math.abs(control.measured.centre - control.centre) > CENTRE_TOLERANCE) {
      failures.push(
        `at ${where} ${name}'s centre is at ${control.measured.centre.toFixed(5)} of the Frame and its Token ` +
          `says ${control.centre} — ${(px(control.measured.centre - control.centre)).toFixed(2)}px off the ` +
          'render, so a gap is computed from the wrong pair',
      );
    }
    if (Math.abs(control.measured.width - control.width) > CENTRE_TOLERANCE) {
      failures.push(
        `at ${where} ${name} is ${control.measured.width.toFixed(5)} of the Frame wide and its Token says ` +
          `${control.width} — the glyph is not drawn at its measured ink width`,
      );
    }
  }

  // ---- the three lights are one width and one pitch ----------------------
  if (read.lights.length !== 3) {
    failures.push(`at ${where} the traffic lights are ${read.lights.length} discs rather than three`);
  } else {
    for (const [index, light] of read.lights.entries()) {
      const centre = read.lightToken.centre + index * read.lightToken.pitch;
      if (Math.abs(light.centre - centre) > CENTRE_TOLERANCE) {
        failures.push(
          `at ${where} light ${index + 1} is centred at ${light.centre.toFixed(5)} of the Frame and its pitch ` +
            `puts it at ${centre.toFixed(5)} — the discs are spaced by something other than the measured pitch`,
        );
      }
      if (Math.abs(light.width - read.lightToken.width) > CENTRE_TOLERANCE) {
        failures.push(
          `at ${where} light ${index + 1} is ${light.width.toFixed(5)} of the Frame across against the measured ` +
            `${read.lightToken.width}`,
        );
      }
    }
  }

  // ---- the address field, and the glyph that travels inside it -----------
  // The field is DRAWN on the Frame's middle rather than at its own measured
  // centre, because being centred on the window is what it is and the two differ
  // by a fifth of a per cent. The reload is the other half of that decision: it
  // is placed against the field's right edge with the clearance the render
  // measures between the two, so it keeps its place INSIDE the field however the
  // field is drawn. Placed at its own absolute centre instead it drifts off the
  // end of the field by exactly the offset the field gave up.
  if (!read.address || read.address.hidden || !read.reload || read.reload.hidden) {
    failures.push(`at ${where} the address field or its reload glyph is not drawn`);
  } else {
    if (Math.abs(read.address.centre - 0.5) > CENTRE_TOLERANCE) {
      failures.push(
        `at ${where} the address field is centred at ${read.address.centre.toFixed(5)} of the Frame — it is ` +
          'drawn on the middle of the window, which is what makes it the same field at every size',
      );
    }
    for (const [axis, measured, wanted] of [
      ['wide', read.address.width, read.addressToken.width],
      ['tall', read.address.height, read.addressToken.height],
    ]) {
      if (Math.abs(measured - wanted) > CENTRE_TOLERANCE) {
        failures.push(
          `at ${where} the address field is ${measured.toFixed(5)} of the Frame ${axis} against the measured ` +
            `${wanted}`,
        );
      }
    }
    if (Math.abs(read.reload.width - read.reloadToken.width) > CENTRE_TOLERANCE) {
      failures.push(
        `at ${where} the reload glyph is ${read.reload.width.toFixed(5)} of the Frame wide against the measured ` +
          `${read.reloadToken.width}`,
      );
    }
    const clearance =
      read.addressToken.centre +
      read.addressToken.width / 2 -
      read.reloadToken.centre -
      read.reloadToken.width / 2;
    const inside = read.address.right - read.reload.right;
    if (Math.abs(inside - clearance) > CENTRE_TOLERANCE) {
      failures.push(
        `at ${where} the reload glyph sits ${inside.toFixed(5)} of the Frame inside the field's right edge and ` +
          `the two measured edges put it at ${clearance.toFixed(5)} — the glyph has stopped travelling with the ` +
          'field it belongs to',
      );
    }
  }

  // ---- the recording's box is inset on three sides and flush at the top ---
  // The render is explicit about it, and it is why the box's two top corners are
  // rounded against a straight titlebar above them. A fourth inset at the top, or
  // one of the three going missing, is a window whose picture is off centre by a
  // band nobody measures.
  const band = px(read.insetToken);
  for (const [side, value] of [
    ['left', read.content.left],
    ['right', read.content.right],
    ['bottom', read.content.bottom],
  ]) {
    if (Math.abs(value - band) > LENGTH_TOLERANCE) {
      failures.push(
        `at ${where} the content box's ${side} inset is ${value.toFixed(2)}px against the ${band.toFixed(2)}px ` +
          'the measured band asks for',
      );
    }
  }
  if (Math.abs(read.content.top - read.bar) > LENGTH_TOLERANCE) {
    failures.push(
      `at ${where} the content box starts ${read.content.top.toFixed(2)}px down and the titlebar ends at ` +
        `${read.bar.toFixed(2)}px — the recording is meant to be flush with the chrome, not inset from it`,
    );
  }

  // ---- the stage is not a stacking context -------------------------------
  const traps = [
    ['z-index', 'auto'],
    ['opacity', '1'],
    ['filter', 'none'],
    ['transform', 'none'],
    ['isolation', 'auto'],
  ].filter(([property, inert]) => read.stacking[property] !== inert);
  if (traps.length > 0) {
    const declared = traps.map(([property]) => `${property}: ${read.stacking[property]}`).join(', ');
    failures.push(
      `at ${where} the stage declares ${declared} — any one of them makes it a stacking context, which traps ` +
        "the Frame's z-index inside it and stops the window painting over the type it occludes",
    );
  }

  return failures;
}

/** The occlusion: the Frame's top edge a measured fraction into the subheading's
 *  second line, and the window actually painting there. */
function occludes(read) {
  /** @type {string[]} */
  const failures = [];
  const where = atWindow(read);
  const wanted = read.dropToken * read.occlusion.line;

  if (!read.occlusion.overlaps) {
    failures.push(
      `at ${where} the Frame does not reach the subheading's second line at all — the occlusion the whole ` +
        'composition is built on is what the drop and the nine-column placement are for',
    );
    return failures;
  }
  if (Math.abs(read.occlusion.drop - wanted) > DROP_TOLERANCE) {
    failures.push(
      `at ${where} the Frame's top edge is ${read.occlusion.drop.toFixed(2)}px below the second line's top and ` +
        `the drop asks for ${wanted.toFixed(2)}px — ${read.dropToken} of a ${read.occlusion.line.toFixed(2)}px ` +
        'line. The drop is measured from that edge and nothing else, so this is the row seam having moved.',
    );
  }
  if (read.occlusion.painted === false) {
    failures.push(
      `at ${where} what is painted where the Frame crosses the second line is "${read.occlusion.over}" and not ` +
        'the window — the Frame is being painted under the type it is meant to bite into',
    );
  }
  return failures;
}

/** The ladder, and the chrome being furniture rather than controls. */
function honest(read) {
  /** @type {string[]} */
  const failures = [];
  const { tier, canvasShown, fill, backdrop } = read.ladder;

  if (!['flat', 'blur', 'webgl'].includes(tier)) {
    failures.push(
      `the titlebar reports data-glass="${tier}" — it is one of flat, blur or webgl, written from what the page ` +
        'resolved. An empty one means the module never ran and never said so.',
    );
  }
  // The attribute is the whole of the ladder: it turns the two lower rungs off
  // AND shows the canvas. A canvas shown with no picture in it, or a shader that
  // drew under a hidden canvas, are both a titlebar that is not there.
  if (canvasShown !== (tier === 'webgl')) {
    failures.push(
      `the titlebar reports "${tier}" and its canvas is ${canvasShown ? 'shown' : 'hidden'} — the attribute is ` +
        'what decides both, so the two disagreeing means one rung is painting over another or none is painting',
    );
  }
  // And whichever rung it is, the strip is made of something. The webgl rule
  // turns the fill and the blur off, so the canvas has to be there instead.
  const painted =
    (tier === 'webgl' && canvasShown) || backdrop !== 'none' || !/^rgba\(.*,\s*0\)$/.test(fill);
  if (!painted) {
    failures.push(
      `the titlebar paints nothing: tier "${tier}", fill ${fill}, backdrop-filter ${backdrop}, canvas ` +
        `${canvasShown ? 'shown' : 'hidden'} — every rung of the ladder ends in a visible strip`,
    );
  }

  // ---- furniture, not controls -------------------------------------------
  // A window's chrome announced to a screen reader is three traffic lights and a
  // back button that go nowhere. The stage is out of the accessibility tree and
  // nothing in it is focusable, and both halves are silent when they break.
  if (!read.chrome.hidden) {
    failures.push(
      'the stage is not aria-hidden — a screen reader is then offered a decorative browser window, its three ' +
        'lights and a back button that goes nowhere',
    );
  }
  if (read.chrome.interactive.length > 0) {
    failures.push(
      `the stage holds ${read.chrome.interactive.join(', ')} — nothing in the Frame is a control, and an ` +
        'aria-hidden subtree with something focusable in it is a focus trap for anyone using a keyboard',
    );
  }

  return failures;
}

/**
 * The small-Frame reduction, at both ends of its gate.
 *
 * The gate asks about the FRAME and not the window, and SHORT is the window where
 * the two questions give different answers: 1440 across, and a Frame the fit
 * solves to 468. A media query at the same number would leave every glyph on
 * screen there, which is what this catches and what nothing measured at DESK
 * could.
 */
function reduced(read, { expectShed }) {
  /** @type {string[]} */
  const failures = [];
  const where = atWindow(read);

  for (const part of SHED) {
    const hidden = read.shed[part];
    const element = `.projects-panel__${part}`;
    if (hidden === null) {
      failures.push(`at ${where} ${element} is not in the chrome at all`);
    } else if (hidden !== expectShed) {
      failures.push(
        expectShed
          ? `at ${where} the Frame is ${read.frame.width.toFixed(0)}px wide and ${element} is still drawn — ` +
            'below 520px of FRAME the small glyphs are dropped rather than approximated, and the gate is a ' +
            'container query because a wide window can draw a small Frame'
          : `at ${where} the Frame is ${read.frame.width.toFixed(0)}px wide and ${element} is hidden — the ` +
            'reduction has fired on a Frame that is big enough for every glyph',
      );
    }
  }
  for (const part of KEPT) {
    if (read.shed[part] !== false) {
      failures.push(
        `at ${where} .projects-panel__${part} is not drawn — the lights and the address field stay at every ` +
          'size, and between them they are what still makes the strip a browser window',
      );
    }
  }

  return failures;
}

export const check = {
  name: 'projects-panel',
  title: "the Frame's measured geometry, its occlusion, its ladder and its reduction",

  /** @param {{ browser: import('playwright').Browser, origin: string }} ctx */
  async run({ browser, origin }) {
    /** @type {string[]} */
    const failures = [];
    /** @type {string[]} */
    const notes = [];

    for (const [viewport, expectShed] of [
      [DESK, false],
      [SHORT, true],
    ]) {
      const { context, page } = await open(browser, origin, { viewport });
      try {
        failures.push(...(await settle(page)));
        const read = await readPage(page);
        if ('missing' in read) {
          failures.push(read.missing);
          continue;
        }

        failures.push(...reduced(read, { expectShed }));
        failures.push(...occludes(read));
        if (!expectShed) {
          failures.push(...drawn(read));
          failures.push(...honest(read));
        }
        notes.push(
          `at ${viewport.width}x${viewport.height}: a Frame ${read.frame.width.toFixed(0)}px wide, titlebar ` +
            `"${read.ladder.tier}", dropped ${read.occlusion.drop.toFixed(1)}px into the second line`,
        );
      } finally {
        await context.close();
      }
    }

    return { failures, notes };
  },
};
