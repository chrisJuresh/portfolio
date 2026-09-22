import { onThemeChange, theme } from './theme';

/**
 * The Stars: the night sky the DARK theme's first screen is printed on, behind
 * the Moonlight and the three corner pictures. stars.css places and masks it,
 * tokens/stars.css is its numbers, and src/kernel/NOTES.md says why it is drawn
 * this way.
 *
 * THE SKY IS ONE SKY. Every star is placed once, from a fixed seed, in a
 * virtual sky of SKY_W by SKY_H, and that sky is laid onto the band the way
 * `background-size: cover` lays a picture — scaled to fill, centred, cropped —
 * so a reload, a resize and a phone all show the same constellations, and a
 * narrower window shows fewer of them rather than a different sky.
 *
 * DRAWN ONCE, NOT PER FRAME. Two canvases, painted when the band's size changes
 * and at no other time: the stars at the display's density, and the Milky Way at
 * half a CSS pixel, because it is nothing but blur. What moves — the breath, the
 * twinkle, a meteor — is opacity and transform on layers that are already
 * painted, which the compositor does without the main thread.
 */

const SKY_W = 1600;
const SKY_H = 900;
const SEED = 0x5eed_c0de;

/** How many of each, in the virtual sky. */
const FIELD = 720;
const BRIGHT = 14;
const BAND = 1100;
const HAZE = 36;
const GLOW = 320;
const CORE_GLOW = 60;
const DUST = 90;
const TWINKLES = 28;

/** The Milky Way's spine: a gentle arch rising out of the foot of the page
 *  between the photographs and the wheel, and leaving across the top left. */
const SPINE: readonly [Point, Point, Point] = [
  [0.7 * SKY_W, 1.12 * SKY_H],
  [0.5 * SKY_W, 0.3 * SKY_H],
  [0.04 * SKY_W, -0.1 * SKY_H],
];

/** Where along the spine the galaxy's core is brightest, as a share of it. */
const CORE = 0.2;

/** Star colours by temperature, weighted: mostly white, some blue, a few warm. */
const TINTS: readonly [string, number][] = [
  ['255 255 255', 0.62],
  ['214 226 255', 0.2],
  ['255 236 214', 0.12],
  ['255 214 180', 0.06],
];

type Point = readonly [number, number];

interface Star {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly a: number;
  readonly tint: string;
  readonly halo: boolean;
}

interface Blob {
  readonly x: number;
  readonly y: number;
  readonly rx: number;
  readonly ry: number;
  readonly a: number;
  readonly rgb: string;
  /** the spine's heading where the blob sits, so the band bends as one */
  readonly angle: number;
}

interface Sky {
  readonly stars: readonly Star[];
  readonly glow: readonly Blob[];
  readonly dust: readonly Blob[];
  readonly twinkles: readonly Star[];
}

/** A small seeded generator, so the sky is the same on every load. */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function along(t: number): Point {
  const [a, c, b] = SPINE;
  const u = 1 - t;
  return [u * u * a[0] + 2 * t * u * c[0] + t * t * b[0], u * u * a[1] + 2 * t * u * c[1] + t * t * b[1]];
}

/** The spine's heading at t, in radians. */
function heading(t: number): number {
  const [a, c, b] = SPINE;
  const dx = 2 * (1 - t) * (c[0] - a[0]) + 2 * t * (b[0] - c[0]);
  const dy = 2 * (1 - t) * (c[1] - a[1]) + 2 * t * (b[1] - c[1]);
  return Math.atan2(dy, dx);
}

function sky(): Sky {
  const rand = mulberry32(SEED);
  const gauss = (): number => {
    const u = Math.max(rand(), 1e-9);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
  };
  const tint = (): string => {
    let pick = rand();
    for (const [rgb, weight] of TINTS) {
      pick -= weight;
      if (pick <= 0) return rgb;
    }
    return TINTS[0]![0];
  };

  const across = (t: number): Point => [-Math.sin(heading(t)), Math.cos(heading(t))];
  // How wide the band is at t: widest through the core, narrowing to the ends.
  const width = (t: number): number => 0.55 + 0.9 * Math.exp(-(((t - CORE) / 0.28) ** 2));
  const offset = (t: number, off: number): Point => {
    const [x, y] = along(t);
    const [nx, ny] = across(t);
    return [x + nx * off, y + ny * off];
  };
  const onBand = (t: number, spread: number): Point => offset(t, gauss() * spread * width(t));

  const stars: Star[] = [];
  // The field: many faint, few bright — brightness falls off as a power.
  for (let i = 0; i < FIELD; i++) {
    const m = rand() ** 2.6;
    stars.push({
      x: rand() * SKY_W,
      y: rand() * SKY_H,
      r: 0.65 + 1.0 * m,
      a: 0.7 + 0.3 * m,
      tint: tint(),
      halo: false,
    });
  }
  // The few that carry a halo.
  for (let i = 0; i < BRIGHT; i++) {
    stars.push({
      x: rand() * SKY_W,
      y: rand() * SKY_H * 0.85,
      r: 1.1 + 0.6 * rand(),
      a: 1,
      tint: tint(),
      halo: true,
    });
  }
  // The band's own dust of stars, thickest through the core.
  for (let i = 0; i < BAND; i++) {
    const t = rand() < 0.35 ? CORE + gauss() * 0.14 : rand();
    const [x, y] = onBand(t, 40);
    const m = rand() ** 2;
    stars.push({ x, y, r: 0.5 + 0.45 * m, a: 0.4 + 0.5 * m, tint: tint(), halo: false });
  }

  // The glow, in three sizes: a wide faint haze the band sits in, a great many
  // small lumps along the spine that give it texture rather than an edge, and
  // the core — warmer, brighter, and low on the page, rising out of the foot.
  const glow: Blob[] = [];
  const cool = (): string => (rand() < 0.5 ? '190 204 236' : '212 214 232');
  for (let i = 0; i < HAZE; i++) {
    const t = rand() * 1.1 - 0.05;
    const [x, y] = onBand(t, 26);
    glow.push({
      x,
      y,
      rx: 200 + 180 * rand(),
      ry: (70 + 50 * rand()) * width(t),
      a: 0.04 + 0.03 * rand(),
      rgb: cool(),
      angle: heading(t),
    });
  }
  for (let i = 0; i < GLOW; i++) {
    const t = rand() * 1.1 - 0.05;
    const [x, y] = onBand(t, 34);
    const near = Math.exp(-(((t - CORE) / 0.22) ** 2));
    glow.push({
      x,
      y,
      rx: 22 + 60 * rand(),
      ry: (10 + 22 * rand()) * width(t),
      a: (0.04 + 0.06 * rand()) * (0.6 + 0.8 * near),
      rgb: near > 0.6 && rand() < 0.6 ? '238 224 206' : cool(),
      angle: heading(t),
    });
  }
  for (let i = 0; i < CORE_GLOW; i++) {
    const t = CORE + gauss() * 0.07;
    const [x, y] = onBand(t, 20);
    glow.push({
      x,
      y,
      rx: 30 + 70 * rand(),
      ry: 16 + 30 * rand(),
      a: 0.06 + 0.07 * rand(),
      rgb: '240 224 204',
      angle: heading(t),
    });
  }
  // The dust lanes: taken OUT of the glow rather than painted over it, so they
  // are darker only where there was light to take and never below the ground.
  // Each lane wanders along the spine on a slow wave, so it reads as one rift
  // and not as a scatter of holes.
  const dust: Blob[] = [];
  const lanes = [
    { from: CORE - 0.12, to: CORE + 0.55, off: 4, wave: 9, freq: 11, phase: 0.4 },
    { from: CORE + 0.05, to: 0.95, off: -14, wave: 7, freq: 17, phase: 2.1 },
  ];
  for (let i = 0; i < DUST; i++) {
    const lane = lanes[i % lanes.length]!;
    const t = lane.from + rand() * (lane.to - lane.from);
    const off = (lane.off + lane.wave * Math.sin(lane.freq * t + lane.phase)) * width(t) + gauss() * 5;
    const [x, y] = offset(t, off);
    dust.push({
      x,
      y,
      rx: 26 + 50 * rand(),
      ry: 6 + 10 * rand(),
      a: 0.12 + 0.22 * rand(),
      rgb: '0 0 0',
      angle: heading(t),
    });
  }

  // The twinkles are real elements, so each can flicker on the compositor.
  const twinkles: Star[] = [];
  for (let i = 0; i < TWINKLES; i++) {
    twinkles.push({
      x: rand() * SKY_W,
      y: rand() * SKY_H * 0.9,
      r: 0.8 + 0.6 * rand(),
      a: 0.7 + 0.3 * rand(),
      tint: tint(),
      halo: true,
    });
  }

  return { stars, glow, dust, twinkles };
}

/** Where the virtual sky lands on a band of w by h, as `cover` would put it. */
function cover(w: number, h: number): { s: number; ox: number; oy: number } {
  const s = Math.max(w / SKY_W, h / SKY_H);
  return { s, ox: (w - SKY_W * s) / 2, oy: (h - SKY_H * s) / 2 };
}

function ellipse(ctx: CanvasRenderingContext2D, blob: Blob, s: number): void {
  ctx.save();
  ctx.translate(blob.x, blob.y);
  ctx.rotate(blob.angle);
  ctx.scale(blob.rx * s, blob.ry * s);
  const fill = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  fill.addColorStop(0, `rgb(${blob.rgb} / ${blob.a})`);
  fill.addColorStop(1, `rgb(${blob.rgb} / 0)`);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function mountStars(): void {
  const layer = document.querySelector<HTMLElement>('.kernel-corners .stars');
  const field = layer?.querySelector<HTMLCanvasElement>('canvas.field');
  const galaxy = layer?.querySelector<HTMLCanvasElement>('canvas.galaxy');
  if (!layer || !field || !galaxy) return;

  const drawn = sky();
  const points = drawn.twinkles.map((star, i) => {
    const el = document.createElement('i');
    el.style.setProperty('--size', `${(star.r * 2).toFixed(2)}px`);
    el.style.setProperty('--tint', star.tint);
    el.style.setProperty('--peak', star.a.toFixed(2));
    // Each its own share of the period and its own place in it, so none keep time.
    el.style.setProperty('--pace', (0.6 + 0.9 * ((i * 0.618) % 1)).toFixed(3));
    el.style.setProperty('--phase', ((i * 0.381) % 1).toFixed(3));
    layer.append(el);
    return el;
  });

  let size = '';
  const paint = (): void => {
    // Only the dark theme draws a sky, so only the dark theme pays for one.
    if (theme() !== 'dark') return;
    const w = layer.clientWidth;
    const h = layer.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const key = `${w}x${h}@${dpr}`;
    if (w === 0 || h === 0 || key === size) return;
    size = key;

    const { s, ox, oy } = cover(w, h);
    // A star is a point: its size follows the display a little, not the sky's scale.
    const grow = Math.min(1.3, Math.max(0.85, Math.sqrt(s)));

    field.width = Math.round(w * dpr);
    field.height = Math.round(h * dpr);
    const stars = field.getContext('2d');
    if (stars) {
      stars.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars.clearRect(0, 0, w, h);
      for (const star of drawn.stars) {
        const x = ox + star.x * s;
        const y = oy + star.y * s;
        if (x < -8 || y < -8 || x > w + 8 || y > h + 8) continue;
        const r = star.r * grow;
        if (star.halo) {
          const halo = stars.createRadialGradient(x, y, 0, x, y, r * 7);
          halo.addColorStop(0, `rgb(${star.tint} / 0.32)`);
          halo.addColorStop(0.25, `rgb(${star.tint} / 0.08)`);
          halo.addColorStop(1, `rgb(${star.tint} / 0)`);
          stars.fillStyle = halo;
          stars.fillRect(x - r * 7, y - r * 7, r * 14, r * 14);
        }
        stars.fillStyle = `rgb(${star.tint} / ${star.a})`;
        stars.beginPath();
        stars.arc(x, y, r, 0, Math.PI * 2);
        stars.fill();
      }
    }

    // The galaxy at half a CSS pixel: it is all blur, and a quarter of the pixels.
    const g = 0.5;
    galaxy.width = Math.round(w * g);
    galaxy.height = Math.round(h * g);
    const glow = galaxy.getContext('2d');
    if (glow) {
      glow.setTransform(g, 0, 0, g, 0, 0);
      glow.clearRect(0, 0, w, h);
      const place = (blob: Blob): Blob => ({ ...blob, x: ox + blob.x * s, y: oy + blob.y * s });
      glow.globalCompositeOperation = 'lighter';
      for (const blob of drawn.glow) ellipse(glow, place(blob), s);
      glow.globalCompositeOperation = 'destination-out';
      for (const blob of drawn.dust) ellipse(glow, place(blob), s);
      glow.globalCompositeOperation = 'source-over';
    }

    drawn.twinkles.forEach((star, i) => {
      const el = points[i]!;
      el.style.left = `${(ox + star.x * s).toFixed(1)}px`;
      el.style.top = `${(oy + star.y * s).toFixed(1)}px`;
    });
  };

  new ResizeObserver(paint).observe(layer);
  onThemeChange(paint);
  paint();
}
