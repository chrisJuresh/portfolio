/**
 * The **Lens** — the material the Frame's titlebar is made of.
 *
 * Refraction, dispersion, Fresnel, glare and tint, and a named fallback for an
 * engine that cannot refract. `CONTEXT.md` defines the term; this file is the
 * whole of it, and `NOTES.md` says which of the numbers below were chosen by
 * looking and where that looking happened.
 *
 * IT IS A PORT OF chrisJuresh/photos `ui/src/lib/glass.js`, which is itself
 * iyinchao/liquid-glass-studio reduced to what a backdrop filter can carry. The
 * optics are upstream's term for term. What is not upstream's is where the
 * numbers come from: every one is a Token on the Frame, read back here, so the
 * material is the Editor's to move and not an agent's to argue about.
 *
 * WHAT IT REPLACED, AND WHY THAT IS A SIMPLIFICATION RATHER THAN A SWAP. The
 * titlebar was four WebGL2 passes rendered into a canvas the size of the strip,
 * and because the Panel's colours are all mixes against the Turn, that canvas
 * had to be re-rendered as the page crossed — keyed on the Turn quantised to
 * sixteen steps, plus a `data-theme` watcher, because the Frame's near end is
 * the page's own paper. None of that survives. The material is now custom
 * properties and one displacement map, and a custom property interpolates
 * through the crossing for free: **the map depends on the pane's SIZE and on the
 * optical Tokens, and on nothing else.** So it is rebuilt on a resize and never
 * on a scroll, there is no bake to invalidate, and there is no theme to watch.
 *
 * The four parts, each in the one CSS mechanism that can carry it:
 *
 *   * **Refraction** is an SVG `feDisplacementMap` used as a backdrop filter. A
 *     map is drawn whose red channel says how far to move each backdrop pixel
 *     horizontally and whose green says vertically, 128 meaning "not at all".
 *   * **Dispersion** is that pass run three times at slightly different scales,
 *     one per colour channel, recombined with `feBlend`. Red bends further than
 *     blue, which is the coloured fringe at a real lens's edge.
 *   * **Fresnel** and **glare** are two masked rings on `::before` and `::after`
 *     — a flat wash and a conic gradient. A ring with a blur is the same falloff
 *     as the shader's per-pixel one at a hundredth of the cost.
 *   * **Blur, saturation and tint** are ordinary CSS driven by custom properties.
 *
 * THE FALLBACK ASKS THE ENGINE WHAT IT KEPT. Chromium is the only engine that
 * runs `url()` inside a backdrop filter today, and an engine that does not drops
 * the **whole** declaration — which would cost the blur and the saturation too,
 * not just the refraction. So the declaration is set, the computed value is read
 * back, and if the `url()` did not survive it is removed and the pane keeps the
 * blur, the tint and the two rings. That is the `frosted` rung, `data-lens`
 * says which one engaged, and the Check drives both.
 *
 * THE REFLECTION GETS THE FROSTED RUNG ON PURPOSE. `reflection.ts` clones the
 * whole window into the marble, and the Plinth's top face is
 * `--projects-panel-plinth-top` of the Frame's width — at a Frame 1033 wide that
 * is 17.4px of stone against a 531px window, so the reflected titlebar is about
 * **1.2 pixels tall**. A displacement map for that is a canvas encode and a
 * second filter subtree to produce something with no room to exist in. The rings
 * and the tint carry it, and the clone needs to know nothing.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** The strip, and the copy of it lying in the marble. */
const BAR = '.projects-panel__bar';
const REFLECTION = '.projects-panel__reflection';

/**
 * The Lens's settings, as they are read off the Frame.
 *
 * Upstream's names, because upstream's shader is where the meaning of each one
 * is, and a rename here would make its source unreadable against this. The three
 * that are SHARES of the Frame's width rather than pixels are marked: a bevel
 * measured in pixels is a different material on a small window, and the whole
 * chrome around it is already a share.
 */
type Settings = {
  /** share — how deep the bevel band is, which also sets how hard it bends. */
  refThickness: number;
  refFactor: number;
  refDispersion: number;
  refFresnelRange: number;
  refFresnelHardness: number;
  refFresnelFactor: number;
  glareRange: number;
  glareHardness: number;
  glareFactor: number;
  glareConvergence: number;
  glareOppositeFactor: number;
  glareAngle: number;
  /** share — the blur behind the pane. */
  blurRadius: number;
  saturation: number;
  /** The corner's EXPONENT, which is what the map takes. CSS takes its log. */
  roundness: number;
  /** Whether the refraction runs after the blur (1) or before it (0). */
  blurEdge: number;
};

/**
 * Which Token each setting is read from. One list, so a setting cannot be read
 * under one name and written under another — the fault that costs an afternoon
 * is a Token renamed in `tokens.css` and still spelled the old way here, which
 * silently falls back to a default that looks nearly right.
 */
const TOKENS: Record<keyof Settings, string> = {
  refThickness: '--projects-panel-lens-thickness',
  refFactor: '--projects-panel-lens-index',
  refDispersion: '--projects-panel-lens-dispersion',
  refFresnelRange: '--projects-panel-lens-fresnel-range',
  refFresnelHardness: '--projects-panel-lens-fresnel-hardness',
  refFresnelFactor: '--projects-panel-lens-fresnel-factor',
  glareRange: '--projects-panel-lens-glare-range',
  glareHardness: '--projects-panel-lens-glare-hardness',
  glareFactor: '--projects-panel-lens-glare-factor',
  glareConvergence: '--projects-panel-lens-glare-convergence',
  glareOppositeFactor: '--projects-panel-lens-glare-opposite',
  glareAngle: '--projects-panel-lens-glare-angle',
  blurRadius: '--projects-panel-lens-blur',
  saturation: '--projects-panel-lens-saturate',
  roundness: '--projects-panel-lens-roundness',
  blurEdge: '--projects-panel-lens-blur-edge',
};

/**
 * What the material is if a Token is missing or unparseable.
 *
 * NOT a second copy of the shipped values, and the difference matters: these are
 * upstream's studio defaults, so a Token that fails to parse produces a pane
 * that is visibly not the one that was chosen rather than one that is subtly
 * wrong. A default equal to the shipped value is a missing Token nobody finds.
 */
const FALLBACK: Settings = {
  refThickness: 0.02,
  refFactor: 1.4,
  refDispersion: 7,
  refFresnelRange: 30,
  refFresnelHardness: 20,
  refFresnelFactor: 20,
  glareRange: 30,
  glareHardness: 20,
  glareFactor: 90,
  glareConvergence: 50,
  glareOppositeFactor: 80,
  glareAngle: -45,
  blurRadius: 0.001,
  saturation: 100,
  roundness: 2,
  blurEdge: 1,
};

function clamp(value: number, lo: number, hi: number): number {
  return value < lo ? lo : value > hi ? hi : value;
}

function round(value: number, places = 2): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/** The settings on one Frame, read off its own computed style. */
function settingsOf(frame: Element): Settings {
  const style = getComputedStyle(frame);
  const out = { ...FALLBACK };
  for (const [key, token] of Object.entries(TOKENS) as [keyof Settings, string][]) {
    const parsed = Number.parseFloat(style.getPropertyValue(token));
    if (Number.isFinite(parsed)) out[key] = parsed;
  }
  return out;
}

// ------------------------------------------------------------------- the rings

/**
 * The ring the shader draws as a per-pixel falloff off the signed distance
 * field, as a masked border. `range` is 0–100 and becomes the band's width;
 * `hardness` is how much of that width is a soft edge, so it runs backwards into
 * a blur radius.
 */
function ring(range: number, hardness: number): { width: number; blur: number } {
  const width = 0.4 + (clamp(range, 0, 100) / 100) * 5;
  return { width, blur: width * (1 - clamp(hardness, 0, 100) / 100) };
}

/**
 * Upstream's glare, per surface normal, term for term from its
 * `fragment-main.glsl`.
 *
 * The doubling is the whole character of it: brightness has a period of 180° in
 * the normal, so it is a raised sine with two peaks on opposite arcs falling to
 * nothing at the two normals perpendicular to them. `glareConvergence` is the
 * exponent that sine is taken to and NOT a lobe width — at 40 it is 0.9, which
 * is a rim lit most of the way round, and at 100 it is 2.1, which is two
 * highlights with dark between them.
 */
function glareAt(theta: number, s: Settings): number {
  const angle = (theta - Math.PI / 4 + s.glareAngle * (Math.PI / 180)) * 2;
  const far = (angle > Math.PI * 1.5 && angle < Math.PI * 3.5) || angle < Math.PI * -0.5;
  const lobe = 1.2 * (far ? clamp(s.glareOppositeFactor, 0, 100) / 100 : 1);
  const lit = ((0.5 + Math.sin(angle) * 0.5) * lobe * Math.max(s.glareFactor, 0)) / 100;
  return clamp(lit ** (0.1 + (clamp(s.glareConvergence, 0, 100) / 100) * 2), 0, 1);
}

/**
 * Each corner clockwise from the top edge's midpoint: the sign of its x and y in
 * screen coordinates, and whether the arc is walked down the parameter or up it,
 * which is what keeps that walk clockwise all the way round.
 */
const CORNERS: [number, number, boolean][] = [
  [1, -1, true],
  [1, 1, false],
  [-1, 1, true],
  [-1, -1, false],
];

/**
 * That brightness as a conic gradient — indexed by the NORMAL rather than by the
 * direction from the pane's centre, which is why this needs the pane's own size.
 *
 * The two are the same thing only on a square. **On this titlebar they are
 * nowhere near it**: the strip is 36px tall on a Frame 1033 wide, so its top
 * edge is 177° of the sweep round the centre and each end cap is under 2° of it.
 * A gradient read straight off the position angle puts a lobe halfway along a
 * long edge, leaves every corner unlit, and squeezes the brightest part of the
 * rim into three pixels of end cap. Handed the same numbers the reflection's
 * copy looks nearly right and the strip looks wrong, which is exactly the
 * symptom to expect if this is ever simplified back.
 *
 * So the stops are laid out off the outline itself: walk the boundary of the
 * same superellipse-cornered rectangle `sdf()` measures, and at each point emit
 * `glareAt(normal)` at the position angle that point actually sits at. Straight
 * edges contribute only their endpoints — the normal does not turn along one —
 * and the corner arcs, where it turns through the whole 90°, are sampled.
 */
function glare(width: number, height: number, radius: number, s: Settings): string {
  const k = clamp(s.roundness, 2, 7);
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const r = Math.min(radius, halfWidth, halfHeight);
  const insetX = halfWidth - r;
  const insetY = halfHeight - r;

  const N = 8;
  const arc: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * (Math.PI / 2);
    arc.push([r * Math.cos(t) ** (2 / k), r * Math.sin(t) ** (2 / k)]);
  }

  const stops: string[] = [];
  /* `turn` is the conic gradient's own coordinate — zero at twelve o'clock,
     clockwise, as a percentage. `theta` is the shader's, off a y-up normal. */
  const add = (x: number, y: number, nx: number, ny: number): void => {
    let turn = Math.atan2(x, -y);
    if (turn < 0) turn += Math.PI * 2;
    let theta = Math.atan2(ny, nx);
    if (theta < 0) theta += Math.PI * 2;
    stops.push(
      `rgb(255 255 255 / ${round(glareAt(theta, s), 3)}) ${round((turn / (Math.PI * 2)) * 100, 2)}%`,
    );
  };

  add(0, -halfHeight, 0, 1);
  for (const [sx, sy, down] of CORNERS) {
    for (let i = 0; i <= N; i++) {
      const point = arc[down ? N - i : i];
      if (!point) continue;
      const [qx, qy] = point;
      add(sx * (insetX + qx), sy * (insetY + qy), sx * qx ** (k - 1), -sy * qy ** (k - 1));
    }
  }
  stops.push(`rgb(255 255 255 / ${round(glareAt(Math.PI / 2, s), 3)}) 100%`);

  return `conic-gradient(${stops.join(', ')})`;
}

// ------------------------------------------------------------------- the optics

/**
 * The signed distance to a superellipse-cornered rectangle: negative inside,
 * positive outside. `k` is the corner exponent — 2 is the ordinary circular
 * round that `border-radius` draws. Kept in step with the
 * `corner-shape: superellipse()` the stylesheet asks for, so the map's idea of
 * the boundary is the painted one.
 */
function sdf(
  x: number,
  y: number,
  halfWidth: number,
  halfHeight: number,
  radius: number,
  k: number,
): number {
  const qx = Math.abs(x) - halfWidth + radius;
  const qy = Math.abs(y) - halfHeight + radius;
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  const corner = k === 2 ? Math.hypot(ox, oy) : (ox ** k + oy ** k) ** (1 / k);
  return Math.min(Math.max(qx, qy), 0) + corner - radius;
}

/**
 * Upstream's refraction. The angle of incidence is not derived from a surface at
 * all: it is read straight off how far through the bevel band you are,
 * θᵢ = asin((1 − d/thickness)²). So the outermost pixel is at a grazing 90° —
 * maximal bend — and because the ratio is squared the bend collapses quickly,
 * reaching a tenth of its peak about a third of the way in. That is a much
 * sharper falloff than a height profile produces, and it is what gives this
 * material a hot rim over a quiet middle.
 *
 * The offset is `tan(θᵢ − θₜ)` times the thickness, which is a slope times a
 * depth and so is already in pixels: there is no gain constant to tune.
 */
function sampler(
  width: number,
  height: number,
  radius: number,
  reachPx: number,
  s: Settings,
): (x: number, y: number) => { dx: number; dy: number } | null {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const k = clamp(s.roundness, 2, 7);
  const r = Math.min(radius, Math.min(width, height) / 2);
  const reach = Math.max(1, Math.min(reachPx, Math.min(width, height) / 2.5));
  const ior = Math.max(1.0001, s.refFactor);
  const at = (x: number, y: number): number =>
    sdf(x - halfWidth, y - halfHeight, halfWidth, halfHeight, r, k);

  /* Depth only, so the trigonometry runs 257 times rather than once per pixel. */
  const N = 256;
  const table = new Float32Array(N + 1);
  for (let i = 0; i <= N; i++) {
    const ratio = 1 - i / N;
    const thetaI = Math.asin(clamp(ratio * ratio, 0, 1));
    const thetaT = Math.asin(clamp(Math.sin(thetaI) / ior, 0, 1));
    /* Finite even at the grazing rim — 1.12 at n = 1.5 — so this needs no cap. */
    table[i] = Math.tan(thetaI - thetaT) * reach;
  }

  return (x, y) => {
    const inside = -at(x, y);
    if (inside < 0 || inside >= reach) return null;
    const magnitude = table[Math.round((inside / reach) * N)] ?? 0;
    if (magnitude === 0) return null;
    const e = 0.75;
    const nx = at(x + e, y) - at(x - e, y);
    const ny = at(x, y + e) - at(x, y - e);
    const length = Math.hypot(nx, ny);
    if (length === 0) return null;
    /* Against the outward normal, as upstream's is: this MAGNIFIES rather than
       compressing the backdrop into the band. */
    const scale = -magnitude / length;
    return { dx: nx * scale, dy: ny * scale };
  };
}

/**
 * One RGBA map, normalised so the largest displacement lands on 255, plus the
 * `scale` that turns that back into the pixel count it stood for.
 */
function encode(
  width: number,
  height: number,
  sample: (x: number, y: number) => { dx: number; dy: number } | null,
): { url: string; scale: number } | null {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const image = context.createImageData(width, height);
  const pixels = image.data;
  const count = width * height;
  const xs = new Float32Array(count);
  const ys = new Float32Array(count);

  let maxima = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const point = sample(x + 0.5, y + 0.5);
      if (!point) continue;
      const index = y * width + x;
      xs[index] = point.dx;
      ys[index] = point.dy;
      const magnitude = Math.hypot(point.dx, point.dy);
      if (magnitude > maxima) maxima = magnitude;
    }
  }
  if (maxima === 0) return null;

  const norm = 127 / maxima;
  for (let index = 0; index < count; index++) {
    const out = index * 4;
    pixels[out] = 128 + clamp(Math.round((xs[index] ?? 0) * norm), -127, 127);
    pixels[out + 1] = 128 + clamp(Math.round((ys[index] ?? 0) * norm), -127, 127);
    pixels[out + 2] = 128;
    pixels[out + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  /* 255 is half of `scale` away from neutral, so the scale that reproduces
     `maxima` pixels of movement is twice it. */
  return { url: canvas.toDataURL(), scale: maxima * 2 };
}

/**
 * One `feDisplacementMap` + `feColorMatrix` pair per channel. The matrix keeps
 * that channel and nothing else, so the three passes screen back together each
 * having sampled the backdrop from a slightly different place.
 */
const KEEP = [
  '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0',
  '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0',
  '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0',
];

function pass(scale: number, keep: string, result: string): string {
  return (
    `<feDisplacementMap in="SourceGraphic" in2="map" scale="${round(scale, 3)}" ` +
    'xChannelSelector="R" yChannelSelector="G"/>' +
    `<feColorMatrix type="matrix" values="${keep}" result="${result}"/>`
  );
}

// -------------------------------------------------------------------- the defs

let defs: SVGDefsElement | null = null;
let seq = 0;

/**
 * One hidden `<svg>` for every filter on the page, appended to the BODY and not
 * to the Frame. Nesting it inside a pane would put the filter's own subtree into
 * the backdrop it is filtering.
 */
function container(): SVGDefsElement {
  if (defs) return defs;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  defs = document.createElementNS(SVG_NS, 'defs');
  svg.appendChild(defs);
  document.body.appendChild(svg);
  return defs;
}

// --------------------------------------------------------------------- the pane

/** What one titlebar's material is written from, and what it reports back. */
type Pane = {
  /** `refracting` or `frosted`, from what the engine kept. */
  draw(): 'refracting' | 'frosted';
};

function mountPane(bar: HTMLElement, frame: HTMLElement, refracting: boolean): Pane {
  const base = `projects-panel-lens-${++seq}`;
  let filter: SVGFilterElement | null = null;
  let version = 0;

  if (refracting) {
    filter = document.createElementNS(SVG_NS, 'filter');
    filter.setAttribute('color-interpolation-filters', 'sRGB');
    filter.setAttribute('filterUnits', 'userSpaceOnUse');
    container().appendChild(filter);
  }

  function draw(): 'refracting' | 'frosted' {
    const s = settingsOf(frame);
    const box = bar.getBoundingClientRect();
    const width = Math.round(box.width);
    const height = Math.round(box.height);

    /* The rings first, because they are the frosted rung and the frosted rung is
       what is left if everything below fails. */
    const fresnel = ring(s.refFresnelRange, s.refFresnelHardness);
    const glareRing = ring(s.glareRange, s.glareHardness);
    bar.style.setProperty('--lens-fresnel-w', `${round(fresnel.width)}px`);
    bar.style.setProperty('--lens-fresnel-blur', `${round(fresnel.blur)}px`);
    bar.style.setProperty(
      '--lens-fresnel',
      `rgb(255 255 255 / ${round((clamp(s.refFresnelFactor, 0, 100) / 100) * 0.55, 3)})`,
    );
    bar.style.setProperty('--lens-glare-w', `${round(glareRing.width)}px`);
    bar.style.setProperty('--lens-glare-blur', `${round(glareRing.blur)}px`);

    /* CSS's `superellipse(k)` is LOGARITHMIC — the curve it draws is
       |x|^(2ᵏ) + |y|^(2ᵏ) = 1, so the circular corner (exponent 2) is
       `superellipse(1)` and a squircle (exponent 4) is `superellipse(2)`. The
       Token is the EXPONENT, because that is what a person means and what
       `sdf()` takes, so the logarithm is written here. Handed over raw, the
       shipped 4 would paint an exponent of 16 — a corner with almost no curve
       left in it — while the map went on refracting the arc it was asked for.
       The stylesheet's own default is 1, so an engine with no `corner-shape`
       draws the circular corner `border-radius` gives it anyway.

       ON THE FRAME AND NOT ON THE PANE, which is the whole of the fix for the
       double corner: the window's rim and the crop over the recording are cut to
       the window's shape by `inherit`, and a property written on the strip never
       reaches either of them. So the strip drew the squircle and its two
       neighbours drew the arc at the same radius, one corner over the other. */
    frame.style.setProperty('--lens-shape', String(round(Math.log2(clamp(s.roundness, 2, 7)), 3)));

    if (width < 2 || height < 2) return 'frosted';

    /* THE MAP'S RADIUS IS THE PAINTED RADIUS, READ OFF THE PANE. Upstream owns
       its own blob and lets one setting decide both; here the corner is
       `--projects-panel-frame-corner`, a share of the window, and the window and
       its titlebar are cut to it by construction. A separate radius would
       refract an arc the paint never drew — the same fault as handing
       `corner-shape` the exponent, and just as invisible. */
    const radius = Number.parseFloat(getComputedStyle(bar).borderTopLeftRadius);
    const painted = Number.isFinite(radius) ? radius : 0;

    bar.style.setProperty('--lens-glare', glare(width, height, painted, s));

    if (!filter) return 'frosted';

    /* Both shares of the FRAME's width, not of the pane's: the bevel and the
       blur belong to the window, and the strip is 3.5% of its height. */
    const frameWidth = frame.getBoundingClientRect().width;
    const map = encode(
      width,
      height,
      sampler(width, height, painted, s.refThickness * frameWidth, s),
    );
    if (!map) return 'frosted';

    /* Upstream's chromatic aberration, `offset * (1 - (N - 1) * factor)` with the
       three indices 0.98, 1.0 and 1.02: red comes out wider than blue by twice
       `refDispersion` percent, and at 0 the three passes coincide. */
    const spread = (s.refDispersion * 2) / 100;
    filter.setAttribute('x', '0');
    filter.setAttribute('y', '0');
    filter.setAttribute('width', String(width));
    filter.setAttribute('height', String(height));
    filter.innerHTML =
      `<feImage x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" ` +
      `href="${map.url}" result="map"/>` +
      pass(map.scale * (1 + spread), KEEP[0] ?? '', 'r') +
      pass(map.scale, KEEP[1] ?? '', 'g') +
      pass(map.scale * (1 - spread), KEEP[2] ?? '', 'b') +
      '<feBlend in="r" in2="g" mode="screen"/>' +
      '<feBlend in2="b" mode="screen"/>';

    /* A NEW ID EVERY REDRAW. A backdrop filter is composited, and rewriting the
       filter it points at does not invalidate it — the pane keeps rendering
       through the map it was rasterised with, which after a resize is the wrong
       size. Changing the referenced id changes the declared value, and that
       does. */
    filter.id = `${base}-${++version}`;

    /* ASK FOR IT, THEN CHECK IT WAS TAKEN. An engine without `url()` in a
       backdrop filter drops the WHOLE declaration, so a pane that assumed it had
       worked would lose the blur and the saturation as well as the refraction.
       Which slot it goes in is what is left of upstream's `blurEdge` once there
       is one filter chain rather than a shader that can choose per pixel: after
       the blur the rim lenses an already-smeared backdrop, before it the rim
       lenses the sharp one and the blur softens the result. CSS cannot reorder a
       list from a variable, so both slots exist and one is always empty. */
    const slot = s.blurEdge >= 0.5 ? '--lens-post' : '--lens-pre';
    const other = s.blurEdge >= 0.5 ? '--lens-pre' : '--lens-post';
    bar.style.setProperty(other, '');
    bar.style.setProperty(slot, `url(#${filter.id})`);
    if (getComputedStyle(bar).backdropFilter.includes('url(')) return 'refracting';

    bar.style.setProperty(slot, '');
    return 'frosted';
  }

  return { draw };
}

/**
 * Give every titlebar on the page its material.
 *
 * Called after `mountReflection`, so the copy in the marble is one more titlebar
 * rather than a special case — the same arrangement `mountClip` has, and the
 * reason the component's script is in that order.
 */
export function mountLens(): void {
  const bars = [...document.querySelectorAll<HTMLElement>(BAR)];
  if (bars.length === 0) return;

  const panes = bars.map((bar) => {
    const frame = bar.closest<HTMLElement>('.projects-panel__frame') ?? bar.parentElement;
    if (!frame) return null;
    /* The clone in the marble is a pane and a half a pixel of bevel. See the
       header: it gets the rings and the tint and nothing that costs a canvas. */
    const reflected = bar.closest(REFLECTION) !== null;
    const pane = mountPane(bar, frame, !reflected);
    bar.dataset.lens = pane.draw();
    return { bar, pane };
  });

  const live = panes.filter((one): one is NonNullable<typeof one> => one !== null);
  if (live.length === 0) return;

  /* A resize is the ONLY thing that rebuilds a map — not the Turn, not a theme,
     not a scroll. Coalesced into one frame, because a drag on a window edge
     fires this per pointer move and each redraw is a canvas the width of the
     strip plus a PNG encode of it. */
  let frame = 0;
  const schedule = (): void => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      for (const { bar, pane } of live) bar.dataset.lens = pane.draw();
    });
  };

  const observer = new ResizeObserver(schedule);
  for (const { bar } of live) observer.observe(bar);
}
