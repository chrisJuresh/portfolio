// The Frame's titlebar material, ported from chrisJuresh/photos
// `ui/src/lib/glass.js` — which is itself iyinchao/liquid-glass-studio reduced
// to what a backdrop filter can carry.
//
// THIS IS THE STUDIO'S COPY, NOT THE SHIPPED ONE. It exists so the direction can
// be chosen by eye before any of it is written into the Section; see README.md,
// which also says when this folder is deleted. What it must not become is a
// second material that agrees with the shipped one only while somebody keeps
// checking — the whole point of it is to be short-lived.
//
// The four visible parts, each in the one CSS mechanism that can carry it:
//
//   * Refraction is an SVG feDisplacementMap used as a backdrop filter. A map is
//     drawn whose red channel says how far to move each backdrop pixel
//     horizontally and whose green says vertically, 128 meaning "not at all".
//   * Dispersion is that pass run three times at slightly different scales, one
//     per colour channel, recombined with feBlend. Red bends further than blue.
//   * Fresnel and glare are two masked rings on ::before and ::after — the first
//     a flat wash, the second a conic gradient laid out off the pane's OWN
//     outline, because brightness varies with the surface normal and not with
//     the direction from the centre. On a 1033x36 strip those are nowhere near
//     the same thing.
//   * Blur, tint, saturation and shadow are ordinary CSS driven by custom
//     properties.
//
// Two things are load-bearing, and both are upstream's:
//
//   * The filter lives in this document and is referenced as url(#id).
//   * Chromium is the only engine that runs url() in a backdrop filter today, so
//     the declaration is set, the computed value is read back, and if it did not
//     survive it is removed and the pane stays frosted. That readback IS the
//     fallback the brief asked for: no UA sniff, no @supports that cannot test
//     for this, just asking the engine what it kept.

const SVG_NS = 'http://www.w3.org/2000/svg';

/** liquid-glass-studio's own editor defaults, key for key. */
export const STUDIO = {
  refThickness: 20,
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
  blurRadius: 1,
  blurEdge: true,
  saturation: 100,
  shadowExpand: 25,
  shadowFactor: 15,
  shadowX: 0,
  shadowY: -10,
  shapeRadius: 80,
  shapeRoundness: 5,
  tint: { r: 255, g: 255, b: 255, a: 0 },
};

/** What the photos site ships, from a /tune session over its own grid. */
export const PHOTOS = {
  ...STUDIO,
  refFactor: 2,
  refFresnelRange: 0,
  glareRange: 14,
  glareHardness: 0,
  glareFactor: 120,
  glareConvergence: 100,
  blurRadius: 2,
  shadowFactor: 50,
  shapeRoundness: 2,
  saturation: 130,
};

function clamp(value, lo, hi) {
  return value < lo ? lo : value > hi ? hi : value;
}

function round(value, places = 2) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

// ------------------------------------------------------------------- the rings

// The ring the shader draws as a per-pixel falloff off the signed distance
// field, as a masked border. `range` is 0-100 and becomes the band's width;
// `hardness` is how much of that width is a soft edge, so it runs backwards into
// a blur radius.
function ring(range, hardness) {
  const width = 0.4 + (clamp(range, 0, 100) / 100) * 5;
  return { width, blur: width * (1 - clamp(hardness, 0, 100) / 100) };
}

// Studio's glare, per surface normal, term for term from its
// fragment-main.glsl. The doubling is the whole character of it: brightness has
// a period of 180 degrees in the normal, so it is a raised sine with two peaks
// on opposite arcs. glareConvergence is the exponent that sine is taken to, not
// a lobe width.
function glareAt(theta, s) {
  const angle = (theta - Math.PI / 4 + s.glareAngle * (Math.PI / 180)) * 2;
  const far = (angle > Math.PI * 1.5 && angle < Math.PI * 3.5) || angle < Math.PI * -0.5;
  const lobe = 1.2 * (far ? clamp(s.glareOppositeFactor, 0, 100) / 100 : 1);
  const lit = ((0.5 + Math.sin(angle) * 0.5) * lobe * Math.max(s.glareFactor, 0)) / 100;
  return clamp(lit ** (0.1 + (clamp(s.glareConvergence, 0, 100) / 100) * 2), 0, 1);
}

// Each corner clockwise from the top edge's midpoint: the sign of its x and y in
// screen coordinates, and whether the arc is walked down the parameter or up it.
const CORNERS = [
  [1, -1, true],
  [1, 1, false],
  [-1, 1, true],
  [-1, -1, false],
];

// That brightness as a conic gradient, indexed by the NORMAL rather than by the
// direction from the centre — which is why this needs the pane's own size. On a
// 1033x36 bar the top edge is most of the sweep round the centre and each end cap
// is a couple of degrees of it, so a gradient read straight off that angle puts a
// lobe halfway along a long edge and leaves every corner unlit.
function glare(width, height, s) {
  const k = clamp(s.shapeRoundness, 2, 7);
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const radius = Math.min(s.shapeRadius, halfWidth, halfHeight);
  const insetX = halfWidth - radius;
  const insetY = halfHeight - radius;

  const N = 8;
  const arc = [];
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * (Math.PI / 2);
    arc.push([radius * Math.cos(t) ** (2 / k), radius * Math.sin(t) ** (2 / k)]);
  }

  const stops = [];
  const add = (x, y, nx, ny) => {
    let turn = Math.atan2(x, -y);
    if (turn < 0) turn += Math.PI * 2;
    let theta = Math.atan2(ny, nx);
    if (theta < 0) theta += Math.PI * 2;
    const alpha = round(glareAt(theta, s), 3);
    stops.push(`rgba(255, 255, 255, ${alpha}) ${round((turn / (Math.PI * 2)) * 100, 2)}%`);
  };

  add(0, -halfHeight, 0, 1);
  for (const [sx, sy, down] of CORNERS) {
    for (let i = 0; i <= N; i++) {
      const [qx, qy] = arc[down ? N - i : i];
      add(sx * (insetX + qx), sy * (insetY + qy), sx * qx ** (k - 1), -sy * qy ** (k - 1));
    }
  }
  stops.push(`rgba(255, 255, 255, ${round(glareAt(Math.PI / 2, s), 3)}) 100%`);

  return `conic-gradient(${stops.join(', ')})`;
}

// ------------------------------------------------------------------- the optics

// The signed distance to a superellipse-cornered rectangle: negative inside,
// positive outside. Kept in step with the corner-shape: superellipse() the
// stylesheet asks for, so the map's idea of the boundary is the painted one.
function sdf(x, y, halfWidth, halfHeight, radius, k) {
  const qx = Math.abs(x) - halfWidth + radius;
  const qy = Math.abs(y) - halfHeight + radius;
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  const corner = k === 2 ? Math.hypot(ox, oy) : (ox ** k + oy ** k) ** (1 / k);
  return Math.min(Math.max(qx, qy), 0) + corner - radius;
}

// The angle of incidence is not derived from a surface at all: it is read
// straight off how far through the bevel band you are, thetaI = asin((1 -
// d/thickness)^2). So the outermost pixel is at a grazing 90 degrees and the
// bend collapses quickly — a hot rim over a quiet middle.
function sampler(width, height, s) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const k = clamp(s.shapeRoundness, 2, 7);
  const radius = Math.min(s.shapeRadius, Math.min(width, height) / 2);
  const reach = Math.max(1, Math.min(s.refThickness, Math.min(width, height) / 2.5));
  const ior = Math.max(1.0001, s.refFactor);
  const at = (x, y) => sdf(x - halfWidth, y - halfHeight, halfWidth, halfHeight, radius, k);

  const N = 256;
  const table = new Float32Array(N + 1);
  for (let i = 0; i <= N; i++) {
    const ratio = 1 - i / N;
    const thetaI = Math.asin(clamp(ratio * ratio, 0, 1));
    const thetaT = Math.asin(clamp(Math.sin(thetaI) / ior, 0, 1));
    table[i] = Math.tan(thetaI - thetaT) * reach;
  }

  return (x, y) => {
    const inside = -at(x, y);
    if (inside < 0) return null;
    if (inside >= reach) return null;
    const magnitude = table[Math.round((inside / reach) * N)];
    if (magnitude === 0) return null;
    const e = 0.75;
    const nx = at(x + e, y) - at(x - e, y);
    const ny = at(x, y + e) - at(x, y - e);
    const length = Math.hypot(nx, ny);
    if (length === 0) return null;
    // Against the outward normal, as upstream's is: this magnifies rather than
    // compressing the backdrop into the band.
    const scale = -magnitude / length;
    return { dx: nx * scale, dy: ny * scale };
  };
}

// One RGBA map, normalised so the largest displacement lands on 255, plus the
// scale that turns that back into the pixel count it stood for.
function encode(width, height, sample) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
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

  const norm = maxima > 0 ? 127 / maxima : 0;
  for (let index = 0; index < count; index++) {
    const out = index * 4;
    pixels[out] = 128 + clamp(Math.round(xs[index] * norm), -127, 127);
    pixels[out + 1] = 128 + clamp(Math.round(ys[index] * norm), -127, 127);
    pixels[out + 2] = 128;
    pixels[out + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  // 255 is half of `scale` away from neutral, so the scale that reproduces
  // `maxima` pixels of movement is twice it.
  return { url: canvas.toDataURL(), scale: maxima * 2 };
}

// One feDisplacementMap + feColorMatrix pair per channel. The matrix keeps that
// channel and nothing else, so the three passes screen back together each
// having sampled the backdrop from a slightly different place.
const KEEP = [
  '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0',
  '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0',
  '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0',
];

function pass(scale, keep, result) {
  return (
    `<feDisplacementMap in="SourceGraphic" in2="map" scale="${round(scale, 3)}" ` +
    'xChannelSelector="R" yChannelSelector="G"/>' +
    `<feColorMatrix type="matrix" values="${keep}" result="${result}"/>`
  );
}

// ------------------------------------------------------------------- the defs

let defs = null;
let seq = 0;

// One hidden svg for every filter on the page, OUTSIDE any glass element:
// nesting it inside one would put the filter's own subtree in the backdrop it is
// filtering.
function container() {
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

// --------------------------------------------------------------- the interface

/**
 * Write the settings that are the same for every pane onto one element as custom
 * properties. Everything here is read by the stylesheet, so it costs one style
 * recalculation and — for all but the radius — no layout.
 */
export function apply(host, s) {
  const style = host.style;
  const fresnel = ring(s.refFresnelRange, s.refFresnelHardness);
  const glareRing = ring(s.glareRange, s.glareHardness);

  style.setProperty('--glass-blur', `${round(s.blurRadius)}px`);
  style.setProperty('--glass-saturate', `${round(Math.max(s.saturation, 0))}%`);
  style.setProperty('--glass-tint', rgba(s.tint));
  style.setProperty(
    '--glass-shadow-geometry',
    `${round(s.shadowX)}px ${round(-s.shadowY)}px ${round(s.shadowExpand)}px`,
  );
  style.setProperty('--glass-shadow-alpha', String(round(clamp(s.shadowFactor, 0, 100) / 100, 3)));
  // CSS's superellipse(k) is LOGARITHMIC: the curve is |x|^(2^k) + |y|^(2^k) = 1,
  // so `round` (exponent 2) is superellipse(1) and `squircle` (exponent 4) is
  // superellipse(2). Upstream's shapeRoundness is the exponent itself, which is
  // what sdf() takes, so the painted corner needs its logarithm. Handed over raw
  // it paints a corner with no curve left in it while the map goes on refracting
  // the arc it was asked for.
  style.setProperty('--glass-roundness', String(round(Math.log2(clamp(s.shapeRoundness, 2, 7)), 3)));
  style.setProperty('--glass-fresnel-w', `${round(fresnel.width)}px`);
  style.setProperty('--glass-fresnel-blur', `${round(fresnel.blur)}px`);
  style.setProperty(
    '--glass-fresnel',
    `rgba(255, 255, 255, ${round((clamp(s.refFresnelFactor, 0, 100) / 100) * 0.55, 3)})`,
  );
  style.setProperty('--glass-glare-w', `${round(glareRing.width)}px`);
  style.setProperty('--glass-glare-blur', `${round(glareRing.blur)}px`);
  // Not --glass-glare: the ring's brightness depends on the pane's own
  // proportions, so refract() writes that one per node.
}

function rgba({ r, g, b, a }) {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${round(a, 3)})`;
}

/**
 * Keep a displacement filter sized to one pane, and expose it in whichever of
 * --glass-pre and --glass-post blurEdge asks for. Also writes that pane's own
 * --glass-glare.
 *
 * Returns { draw(settings), refracting(), destroy() }. `refracting()` is what
 * the studio reads to say which rung a pane actually landed on — the answer
 * comes from the engine rather than from a guess about it.
 */
export function refract(node) {
  const base = `glass-refract-${++seq}`;
  const filter = document.createElementNS(SVG_NS, 'filter');
  filter.setAttribute('color-interpolation-filters', 'sRGB');
  filter.setAttribute('filterUnits', 'userSpaceOnUse');
  container().appendChild(filter);

  let version = 0;
  let url = '';
  let took = false;

  function place(blurEdge) {
    node.style.setProperty('--glass-pre', blurEdge ? '' : url);
    node.style.setProperty('--glass-post', blurEdge ? url : '');
  }

  function draw(s, forceFallback) {
    const box = node.getBoundingClientRect();
    const width = Math.round(box.width);
    const height = Math.round(box.height);
    if (width < 2 || height < 2) return;

    node.style.setProperty('--glass-glare', glare(width, height, s));

    if (forceFallback || s.refThickness <= 0) {
      url = '';
      took = false;
      place(s.blurEdge);
      return;
    }

    const map = encode(width, height, sampler(width, height, s));
    // Upstream's chromatic aberration, offset * (1 - (N - 1) * factor) with the
    // three indices 0.98, 1.0 and 1.02: red comes out wider than blue by twice
    // refDispersion percent, and at 0 the three passes coincide.
    const spread = (s.refDispersion * 2) / 100;
    filter.setAttribute('x', '0');
    filter.setAttribute('y', '0');
    filter.setAttribute('width', String(width));
    filter.setAttribute('height', String(height));
    filter.innerHTML =
      `<feImage x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" ` +
      `href="${map.url}" result="map"/>` +
      pass(map.scale * (1 + spread), KEEP[0], 'r') +
      pass(map.scale, KEEP[1], 'g') +
      pass(map.scale * (1 - spread), KEEP[2], 'b') +
      '<feBlend in="r" in2="g" mode="screen"/>' +
      '<feBlend in2="b" mode="screen"/>';

    // A NEW ID EVERY REDRAW. A backdrop filter is composited, and rewriting the
    // filter it points at does not invalidate it — the pane keeps rendering
    // through the map it was rasterised with, which after a resize is the wrong
    // size. Changing the referenced id changes the declared value, and that does.
    filter.id = `${base}-${++version}`;

    // Ask for it, then check it was taken. An engine without url() in a backdrop
    // filter drops the WHOLE declaration, which would cost the blur too.
    url = `url(#${filter.id})`;
    place(s.blurEdge);
    took = getComputedStyle(node).backdropFilter.includes('url(');
    if (!took) {
      url = '';
      place(s.blurEdge);
    }
  }

  return {
    draw,
    refracting: () => took,
    destroy() {
      filter.remove();
      node.style.removeProperty('--glass-pre');
      node.style.removeProperty('--glass-post');
      node.style.removeProperty('--glass-glare');
    },
  };
}
