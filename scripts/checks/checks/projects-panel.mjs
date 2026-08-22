import { DESK, open, settle, withoutOrigin } from '../lib/page.mjs';

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

/** The Plinth's three depths, as shares of the Frame, and it is looser than the
 *  chrome's for one stated reason: a depth is a share of a Frame width DERIVED
 *  from the composition, which over-states the laid-out Frame by whatever the
 *  Rail's floor costs — 2.4px at DESK, so every depth reads 0.26% high. On the
 *  largest of the three that is 0.00023, and this is eight times it. The Section's
 *  NOTES.md is explicit that the over-statement is inherited rather than a drift.
 *
 *  It is still tight enough for the mistakes that matter: a depth taken as a
 *  share of the COMPOSITION instead of the Frame is 34% out, and `top` read as
 *  `behind` — the pair whose confusion once made the whole top face read as a lit
 *  strip — is 0.0027 out, nine times this. Everything HORIZONTAL is a percentage
 *  of the stage and exact, so it is held to LENGTH_TOLERANCE instead. */
const DEPTH_TOLERANCE = 0.002;

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
      const plinth = document.querySelector('.projects-panel__plinth');
      const mirror = document.querySelector('.projects-panel__mirror');
      const absent = [
        ['the Section', section],
        ['the stage', stage],
        ['the Frame', frame],
        ['the titlebar', bar],
        ['the glass canvas', glass],
        ['the content box', content],
        ["the subheading's second line", secondLine],
        ['the Plinth', plinth],
        ['the reflection box', mirror],
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

      // ---- the Plinth, the reflection and the recording --------------------
      /** A Plinth Token off the Frame. Custom properties inherit, so the four
       *  unitless shares read back here as plainly as the chrome's do. The three
       *  DEPTHS are deliberately not read: they are lengths, so they would come
       *  back as `calc(…)`, and asserting a length against itself would assert
       *  nothing. Each is checked against the share it is made of instead. */
      const slab = (name) => Number(style.getPropertyValue(`--projects-panel-plinth-${name}`));
      const reflection = mirror.querySelector('.projects-panel__frame');
      const pl = plinth.getBoundingClientRect();
      const mi = mirror.getBoundingClientRect();
      const re = reflection?.getBoundingClientRect() ?? null;
      const plinthStyle = getComputedStyle(plinth);
      const contactStyle = getComputedStyle(plinth, '::after');
      // Just inside the Frame's foot, in the strip where the slab runs BEHIND the
      // window. The marble there is drawn and then covered by the thing standing
      // on it, which is the whole of why it is visible only at the two ends.
      const behind =
        fr.bottom > 1 && fr.bottom < window.innerHeight
          ? document.elementFromPoint((fr.left + fr.right) / 2, fr.bottom - 1)
          : null;

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
        // Every one of these is a distance between the Frame's own edge and the
        // slab's, as a share of the Frame's width — which is the only form any
        // of the Plinth's numbers is stated in.
        plinth: {
          behind: (fr.bottom - pl.top) / fr.width,
          depth: (pl.bottom - fr.bottom) / fr.width,
          left: (fr.left - pl.left) / fr.width,
          right: (pl.right - fr.right) / fr.width,
          // What the stage measures, which is what the fit constant assumes: the
          // slab costs the flow its depth and not the strip behind the window.
          stageFoot: stage.getBoundingClientRect().bottom - fr.bottom,
          plate: plinthStyle.backgroundImage,
          sized: plinthStyle.backgroundSize,
          covered: behind ? frame.contains(behind) : null,
          coveredBy: behind ? behind.className || behind.tagName : null,
        },
        slabToken: {
          behind: slab('behind'),
          top: slab('top'),
          front: slab('front'),
          overhang: slab('overhang'),
        },
        mirror: {
          // The contact line: the reflection starts at the Frame's foot, not at
          // the slab's back edge, because the marble back there has a window
          // standing on it rather than a reflection lying in it.
          contact: mi.top - fr.bottom,
          left: mi.left - fr.left,
          right: mi.right - fr.right,
          depth: mi.height / fr.width,
          clips: getComputedStyle(mirror).overflow,
          children: mirror.children.length,
        },
        reflection: re && {
          // A mirror image is the SAME SIZE as the thing it reflects. Both of
          // these are zero or the share was read as a scale and the whole window
          // was squashed into the thirteen pixels that are the bottom 3.28% of it
          // seen life-size.
          width: re.width - fr.width,
          height: re.height - fr.height,
          // AFTER the fold, so it is the copy's TOP edge that has to land on the
          // contact line: `scaleY(-1)` about the bottom origin turns the window's
          // foot into the topmost row of the image and hangs its head downwards.
          stands: re.top - fr.bottom,
          folded: getComputedStyle(reflection).transform,
          parts: reflection.querySelectorAll('*').length,
        },
        frameParts: frame.querySelectorAll('*').length,
        contact: {
          drawn: contactStyle.content,
          height: parseFloat(contactStyle.height),
          top: parseFloat(contactStyle.top),
        },
        clips: [...document.querySelectorAll('video.projects-panel__clip')].map((clip) => ({
          inReflection: mirror.contains(clip),
          loop: clip.loop,
          muted: clip.muted,
          autoplay: clip.autoplay,
          inline: clip.playsInline,
          poster: clip.getAttribute('poster') ?? '',
          markupSrc: clip.getAttribute('src'),
          sources: [...clip.querySelectorAll('source')].map((source) => source.getAttribute('src') ?? ''),
          fit: getComputedStyle(clip).objectFit,
          from: getComputedStyle(clip).objectPosition,
        })),
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

/**
 * The Plinth: the marble the Frame stands on, measured off the Frame's own edges.
 *
 * Every number the slab is drawn from is a distance between one of the window's
 * edges and one of the block's, and the whole of what this asserts is that they
 * still are — the depths against the shares they are made of, the two overhangs
 * against each other, and the slab's flow height against the depth the
 * composition's fit constant has counted since before any of this was on the
 * page. A Plinth stated against the composition instead of against the Frame
 * draws a picture that looks right at one window and is 34% out at the next, and
 * nothing on the page says so.
 *
 * `behind` and `top` are the pair worth naming: reading the first as zero is what
 * once made the whole top face 31 render pixels instead of 67, and the block read
 * as a lit strip rather than as a slab with a window standing on it.
 */
function stands(read) {
  /** @type {string[]} */
  const failures = [];
  const where = atWindow(read);
  const px = (share) => share * read.frame.width;

  for (const [what, measured, wanted, why] of [
    [
      'runs behind the window',
      read.plinth.behind,
      read.slabToken.behind,
      'the Frame stands ON the top face rather than at the back of it, and this strip is the marble ' +
        'between the two — hidden under the window in the middle and visible at both ends',
    ],
    [
      'costs the composition',
      read.plinth.depth,
      read.slabToken.top + read.slabToken.front,
      'the top face and the front face together, which is the number --projects-panel-fit counts and ' +
        'the whole reason the drawing solves onto one screen',
    ],
  ]) {
    if (Math.abs(measured - wanted) > DEPTH_TOLERANCE) {
      failures.push(
        `at ${where} the Plinth ${what} ${measured.toFixed(5)} of the Frame's width and its Tokens ask for ` +
          `${wanted.toFixed(5)} — ${px(measured - wanted).toFixed(2)}px. ${why}.`,
      );
    }
  }

  // The slab is symmetric about the window, which is the shortest way to say
  // that the Frame sits in the middle of the stone it stands on. Both ends
  // against the Token AND against each other: a rule that restated one and left
  // the other is the failure this exists for, and it once left the window
  // standing off the end of its own plinth.
  for (const [end, measured] of [
    ['left', read.plinth.left],
    ['right', read.plinth.right],
  ]) {
    if (Math.abs(px(measured) - px(read.slabToken.overhang)) > LENGTH_TOLERANCE) {
      failures.push(
        `at ${where} the slab overhangs the Frame by ${px(measured).toFixed(2)}px on the ${end} and the ` +
          `measured overhang asks for ${px(read.slabToken.overhang).toFixed(2)}px`,
      );
    }
  }
  if (Math.abs(px(read.plinth.left) - px(read.plinth.right)) > LENGTH_TOLERANCE) {
    failures.push(
      `at ${where} the slab overhangs ${px(read.plinth.left).toFixed(2)}px on the left and ` +
        `${px(read.plinth.right).toFixed(2)}px on the right — a window standing off the end of its own plinth`,
    );
  }

  // In flow, so the stage is as tall as the Frame PLUS the slab's depth. Placed
  // out of flow at `top: 100%` it draws the same picture and the stage stays
  // exactly as tall as the Frame, so the composition comes out short by the
  // Plinth at every window size while the fit constant says otherwise.
  if (Math.abs(read.plinth.stageFoot - px(read.plinth.depth)) > LENGTH_TOLERANCE) {
    failures.push(
      `at ${where} the stage ends ${read.plinth.stageFoot.toFixed(2)}px below the Frame's foot and the slab is ` +
        `${px(read.plinth.depth).toFixed(2)}px deep — the Plinth is out of flow, so the composition is short ` +
        'by exactly its depth and the fit constant is counting something that is not there',
    );
  }

  // The plate, and the one declaration in the block that would be a bug if it
  // were the usual thing: it is rendered at this box's aspect ratio, so
  // stretching it to the box is an identity and `cover` would crop off either
  // the far edge or the block's base.
  if (!read.plinth.plate.startsWith('url(')) {
    failures.push(
      `at ${where} the Plinth's background-image is ${read.plinth.plate} — the marble is a rendered plate, ` +
        'and without it the slab is a rectangle of nothing under the window',
    );
  }
  if (read.plinth.sized !== '100% 100%') {
    failures.push(
      `at ${where} the plate is drawn at background-size: ${read.plinth.sized} — it is rendered at this box's ` +
        'own aspect ratio, so anything but 100% 100% crops off the far edge or the block turning under at its base',
    );
  }

  // Under the Frame. The marble behind the contact line is drawn and then
  // covered by the window standing on it.
  if (read.plinth.covered === false) {
    failures.push(
      `at ${where} what is painted just inside the Frame's foot is "${read.plinth.coveredBy}" and not the ` +
        'window — the slab is painting OVER the thing standing on it',
    );
  }

  return failures;
}

/**
 * The reflection, and the contact shadow over it.
 *
 * THE ONE THING THIS EXISTS FOR is that the reflection is the Frame — the same
 * width, the same height, folded through the contact line — rather than a picture
 * of it. Both halves of that fail silently. A copy written out in the markup
 * instead of cloned looks identical on the day it is written and drifts from the
 * window the first time a glyph moves, which is a thing nobody sees for months;
 * and a mirror image scaled to the depth of the marble rather than CUT to it
 * draws thirty rows of chrome averaged into every row of stone, which reads as a
 * grey band that changes when the clip changes rather than as a reflection.
 *
 * That the copy is not in the markup is asserted from the other end, in the pass
 * with scripting turned off.
 */
function reflects(read) {
  /** @type {string[]} */
  const failures = [];
  const where = atWindow(read);
  const face = read.slabToken.top * read.frame.width;

  // ---- the box: the top face and nothing else ----------------------------
  if (Math.abs(read.mirror.contact) > LENGTH_TOLERANCE) {
    failures.push(
      `at ${where} the reflection starts ${read.mirror.contact.toFixed(2)}px from the Frame's foot — it lies in ` +
        'the marble IN FRONT of the window, so its top edge is the contact line and not the slab\'s back edge',
    );
  }
  for (const [end, measured] of [
    ['left', read.mirror.left],
    ['right', read.mirror.right],
  ]) {
    if (Math.abs(measured) > LENGTH_TOLERANCE) {
      failures.push(
        `at ${where} the reflection's ${end} edge is ${measured.toFixed(2)}px off the Frame's — the overhanging ` +
          'marble at each end has no window above it to reflect, so the box is the window\'s width and not the slab\'s',
      );
    }
  }
  if (Math.abs(read.mirror.depth * read.frame.width - face) > LENGTH_TOLERANCE) {
    failures.push(
      `at ${where} the reflection is ${(read.mirror.depth * read.frame.width).toFixed(2)}px deep and the top face ` +
        `is ${face.toFixed(2)}px — a reflection deeper than the face reaches the front, which is a vertical ` +
        'surface and reflects nothing',
    );
  }
  if (read.mirror.clips === 'visible') {
    failures.push(
      `at ${where} the reflection box does not clip — what cuts the copy to the marble available is this box's ` +
        'own overflow, which is the front arris of the slab and is exactly the thing that cuts it in life',
    );
  }

  // ---- the copy: the Frame, at the one magnification a mirror has ---------
  if (!read.reflection) {
    failures.push(
      `at ${where} there is no Frame in the marble — mirror.ts clones the window into it, and a Plinth with ` +
        'nothing lying in it is what a browser that never ran the script is meant to get, not this one',
    );
    return failures;
  }
  if (read.mirror.children !== 1) {
    failures.push(
      `at ${where} the reflection box holds ${read.mirror.children} children — the clone is made once, and a ` +
        'second call that reflected the reflection would draw the same picture and cost a second recording',
    );
  }
  for (const [axis, measured] of [
    ['wide', read.reflection.width],
    ['tall', read.reflection.height],
  ]) {
    if (Math.abs(measured) > LENGTH_TOLERANCE) {
      failures.push(
        `at ${where} the copy in the marble is ${measured.toFixed(2)}px ${axis === 'wide' ? 'wider' : 'taller'} ` +
          'than the window — a planar mirror puts the image as far behind the surface as the object is in front ' +
          'of it, so the two subtend the same angle and project to the same size. The strip is short because the ' +
          'SLAB is short, and squashing the window into it averages thirty rows of chrome into every row of stone.',
      );
    }
  }
  if (Math.abs(read.reflection.stands) > LENGTH_TOLERANCE) {
    failures.push(
      `at ${where} the copy's foot is ${read.reflection.stands.toFixed(2)}px from the window's — the fold is ` +
        'about the contact line, so the two feet meet there',
    );
  }
  // `matrix(1, 0, 0, -1, 0, 0)` is scaleY(-1) resolved. Anything else is either
  // no fold at all — a second window standing in the stone — or a scale.
  if (!/^matrix\(1,\s*0,\s*0,\s*-1,\s*0,\s*0\)$/.test(read.reflection.folded)) {
    failures.push(
      `at ${where} the copy's transform is "${read.reflection.folded}" — a reflection is a fold about the ` +
        'contact line and nothing else: no scale, because the image is life-size, and no translation, because ' +
        'the fold is what puts it where it goes',
    );
  }
  // Derived and not hand-kept. Two copies of a hundred lines of measured drawing
  // is one copy that gets edited and one that does not, and the one that does
  // not is the reflection.
  if (read.reflection.parts !== read.frameParts) {
    failures.push(
      `at ${where} the window holds ${read.frameParts} elements and the copy in the marble holds ` +
        `${read.reflection.parts} — the reflection is meant to BE the Frame, cloned, so the two cannot disagree ` +
        'about what a window is made of',
    );
  }

  // ---- the contact shadow ------------------------------------------------
  // The cue the eye uses to decide whether two objects are touching at all. It
  // sits on the top face and stops there: the front face is a vertical plane a
  // Frame width away in the depth direction and the window occludes none of it.
  if (read.contact.drawn === 'none') {
    failures.push(
      `at ${where} the Plinth draws no contact shadow — the Frame ends, the marble begins, and nothing happens ` +
        'at the join, which is what a sticker on a photograph looks like',
    );
  }
  if (Math.abs(read.contact.height - face) > LENGTH_TOLERANCE) {
    failures.push(
      `at ${where} the contact shadow is ${read.contact.height.toFixed(2)}px deep against the ${face.toFixed(2)}px ` +
        'of top face — it belongs on the face the window stands on and nowhere else',
    );
  }

  return failures;
}

/**
 * The recording, and the copy of it lying in the stone.
 *
 * Two elements on one URL, both of them parsed with a poster and NO SOURCE — and
 * that last one is the whole of the reduced-motion refusal, which is asserted at
 * the other end in its own pass. A `src` written into the markup would fetch the
 * clip before any script had a chance to decline, and nothing on the page would
 * say so.
 *
 * `object-position` is the one assertion here that is about a number, and it is a
 * safety property rather than a taste one: the clip is 1440x900 and the box it
 * fills is not that shape, so something is cropped. Cropping from the top edge
 * takes it all off the BOTTOM, and removing what the recording shows is the only
 * direction the censored list is safe in — the list was signed against the
 * frames the clip passes over, and re-centring the crop shows rows nobody
 * reviewed.
 */
function records(read) {
  /** @type {string[]} */
  const failures = [];
  const where = atWindow(read);
  const clips = read.clips;

  if (clips.length !== 2) {
    failures.push(
      `at ${where} the page holds ${clips.length} recording(s) — one in the window and one in the marble, and ` +
        'the second is the reflection\'s: a still reflection under a moving clip reads as broken immediately',
    );
    return failures;
  }
  if (clips.filter((clip) => clip.inReflection).length !== 1) {
    failures.push(
      `at ${where} ${clips.filter((clip) => clip.inReflection).length} of the two recordings are in the marble ` +
        '— one belongs to the window and one to its reflection',
    );
  }

  for (const clip of clips) {
    const which = clip.inReflection ? "the marble's" : "the window's";
    for (const [attribute, set] of [
      ['loop', clip.loop],
      ['muted', clip.muted],
      ['autoplay', clip.autoplay],
      ['playsinline', clip.inline],
    ]) {
      if (!set) {
        failures.push(
          `at ${where} ${which} recording is not ${attribute} — ${
            attribute === 'muted'
              ? 'and muted is not decoration: it is what lets autoplay run at all, and the Portfolio never makes a sound'
              : attribute === 'playsinline'
                ? 'so a phone takes it fullscreen the moment it plays'
                : 'the clip is a silent loop standing in a picture of a browser'
          }`,
        );
      }
    }
    if (clip.markupSrc !== null) {
      failures.push(
        `at ${where} ${which} recording carries src="${clip.markupSrc}" in the markup — the element ships with a ` +
          'poster and NO source so that a reader who asked for reduced motion never fetches the bytes, and an ' +
          'attribute here fetches them before any script can decline',
      );
    }
    if (clip.poster === '') {
      failures.push(
        `at ${where} ${which} recording has no poster — the poster is what a browser that plays neither file ` +
          'shows, and it is the whole of what a reduced-motion reader is given',
      );
    }
    if (clip.fit !== 'cover') {
      failures.push(
        `at ${where} ${which} recording is drawn with object-fit: ${clip.fit} — the clip and the content box are ` +
          'not the same shape and cannot be reconciled by choosing better numbers, so something is cropped',
      );
    }
    if (!/^\S+\s+0(px)?$/.test(clip.from)) {
      failures.push(
        `at ${where} ${which} recording is cropped from object-position: ${clip.from} — it has to be pinned to ` +
          'the TOP, so the whole of the cut comes off the bottom. Removing what the clip shows is the only ' +
          'direction the censored list is safe in; re-centring it shows rows nobody reviewed.',
      );
    }
  }

  // One URL, or the marble is showing a different film from the window.
  const [first, second] = clips;
  if (first.poster !== second.poster) {
    failures.push(
      `at ${where} the two recordings name different posters, "${first.poster}" and "${second.poster}" — the ` +
        'reflection is a copy of the window and not a second recording',
    );
  }
  if (first.sources.join('|') !== second.sources.join('|')) {
    failures.push(
      `at ${where} the two recordings were served different sources, [${first.sources}] and [${second.sources}] ` +
        '— both are handed their sources from one list, which is what makes the marble show what the window shows',
    );
  }
  if (first.sources.length === 0) {
    failures.push(
      `at ${where} neither recording was given a source — the elements are parsed without one and clip.ts is ` +
        'what hands them over, so an empty pair is the module never having run',
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

/**
 * What the page draws with no script at all.
 *
 * The reflection is a clone the page makes at runtime, and the trade that buys is
 * stated in three files: a browser that never runs the script gets the marble and
 * no reflection, which is deliberate rather than broken. This is the assertion
 * that it IS that, and it does two jobs at once. It says the Plinth is whole
 * without script — a slab at its full depth with the plate on it, not a hole
 * where a composition should be — and it says the reflection is genuinely
 * derived, because a second window written out in the markup would still be
 * standing in the stone here.
 *
 * Nothing is settled, and nothing can be: no loader runs, so no Section mounts.
 * Everything read is prerendered, which is exactly what is being asked about.
 */
async function withoutScript(browser, origin) {
  const { context, page } = await open(browser, origin, { javaScriptEnabled: false });
  try {
    const read = await page.evaluate(() => {
      const plinth = document.querySelector('.projects-panel__plinth');
      const mirror = document.querySelector('.projects-panel__mirror');
      if (!plinth || !mirror) return { missing: true };
      const style = getComputedStyle(plinth);
      return {
        missing: false,
        depth: plinth.getBoundingClientRect().height,
        plate: style.backgroundImage,
        reflections: mirror.children.length,
        frames: document.querySelectorAll('.projects-panel__frame').length,
        clips: document.querySelectorAll('video.projects-panel__clip').length,
        sources: document.querySelectorAll('video.projects-panel__clip source').length,
      };
    });

    /** @type {string[]} */
    const failures = [];
    if (read.missing) {
      return ['with no script the Plinth is not in the document at all — the marble is markup and a stylesheet, ' +
        'and only the reflection in it is script\'s'];
    }
    if (read.depth <= 0 || !read.plate.startsWith('url(')) {
      failures.push(
        `with no script the Plinth is ${read.depth.toFixed(1)}px deep and its plate is ${read.plate} — polished ` +
          'stone with nothing in it is a plinth, and this is the reader who is meant to get one',
      );
    }
    if (read.frames !== 1 || read.reflections !== 0) {
      failures.push(
        `with no script the page holds ${read.frames} Frame(s) and ${read.reflections} of them are in the marble ` +
          '— the reflection is a CLONE, and a second copy of a hundred lines of measured drawing written out in ' +
          'the markup is one copy that gets edited and one that does not',
      );
    }
    if (read.clips !== 1 || read.sources !== 0) {
      failures.push(
        `with no script the page holds ${read.clips} recording(s) carrying ${read.sources} source(s) — the ` +
          'element is parsed with a poster and nothing to fetch, and a browser that runs nothing keeps the poster',
      );
    }
    return failures;
  } finally {
    await context.close();
  }
}

/**
 * What a reader who asked for reduced motion is not charged for.
 *
 * NOT A RULE AND NOT `preload="none"`. The promise is that the recording's bytes
 * are never requested — not a range request, not a metadata probe — and no
 * stylesheet can decline a fetch. The elements ship with no source and clip.ts
 * asks the query before naming a file, so what this asserts is the one thing a
 * person could never notice: that nothing went over the wire. A `src` that crept
 * back into the markup, or a refusal that stopped being asked, both look
 * identical on screen.
 */
async function withoutMotion(browser, origin) {
  const { context, page, record } = await open(browser, origin, { reducedMotion: 'reduce' });
  try {
    // Not settle(): under this setting nothing scrubs, and the Section still
    // mounts on approach. The scroll is what puts the Frame near the viewport,
    // and networkidle is what gives a fetch time to have happened.
    await page.evaluate(() => document.querySelector('.projects-panel')?.scrollIntoView());
    await page.waitForLoadState('networkidle').catch(() => {});

    /** @type {string[]} */
    const failures = [];
    const fetched = record.responses
      .map(({ url }) => withoutOrigin(url, origin))
      .filter((url) => /\.(webm|mp4)(\?|$)/.test(url));
    if (fetched.length > 0) {
      failures.push(
        `a reader asking for reduced motion fetched ${[...new Set(fetched)].join(', ')} — the setting is asked ` +
          'to save bandwidth as well as movement, and the only way to honour that is to never name the file',
      );
    }

    const served = await page.evaluate(
      () => document.querySelectorAll('video.projects-panel__clip source').length,
    );
    if (served > 0) {
      failures.push(
        `a reader asking for reduced motion was given ${served} source(s) — the refusal is written once, in ` +
          'clip.ts, and it covers the reflection without knowing it exists',
      );
    }
    return failures;
  } finally {
    await context.close();
  }
}

export const check = {
  name: 'projects-panel',
  title: "the Frame and the Plinth: geometry, occlusion, reflection, ladder and reduction",

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
          failures.push(...stands(read));
          failures.push(...reflects(read));
          failures.push(...records(read));
          notes.push(
            `the slab: ${(read.plinth.depth * read.frame.width).toFixed(1)}px deep over a Frame ` +
              `${read.frame.width.toFixed(0)}px wide, overhanging ${(read.plinth.left * read.frame.width).toFixed(1)}px ` +
              `each end, with ${(read.mirror.depth * read.frame.width).toFixed(1)}px of the window lying in it`,
          );
        }
        notes.push(
          `at ${viewport.width}x${viewport.height}: a Frame ${read.frame.width.toFixed(0)}px wide, titlebar ` +
            `"${read.ladder.tier}", dropped ${read.occlusion.drop.toFixed(1)}px into the second line`,
        );
      } finally {
        await context.close();
      }
    }

    failures.push(...(await withoutScript(browser, origin)));
    notes.push('with no script: the marble is drawn and nothing is lying in it');
    failures.push(...(await withoutMotion(browser, origin)));
    notes.push('with reduced motion: the poster, and not one byte of the recording');

    return { failures, notes };
  },
};
