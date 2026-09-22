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
 * DRAWN ONCE, NOT PER FRAME. One canvas at the display's density, painted when
 * the band's size changes and at no other time. What moves — the breath, the
 * twinkle, a meteor — is opacity and transform on layers that are already
 * painted, which the compositor does without the main thread.
 */

const SKY_W = 1600;
const SKY_H = 900;
const SEED = 0x5eed_c0de;

/** How many of each, in the virtual sky. */
const FIELD = 720;
const BRIGHT = 14;
const TWINKLES = 28;

/** Star colours by temperature, weighted: mostly white, some blue, a few warm. */
const TINTS: readonly [string, number][] = [
  ['255 255 255', 0.62],
  ['214 226 255', 0.2],
  ['255 236 214', 0.12],
  ['255 214 180', 0.06],
];

interface Star {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly a: number;
  readonly tint: string;
  readonly halo: boolean;
}

interface Sky {
  readonly stars: readonly Star[];
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

function sky(): Sky {
  const rand = mulberry32(SEED);
  const tint = (): string => {
    let pick = rand();
    for (const [rgb, weight] of TINTS) {
      pick -= weight;
      if (pick <= 0) return rgb;
    }
    return TINTS[0]![0];
  };

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

  return { stars, twinkles };
}

/** Where the virtual sky lands on a band of w by h, as `cover` would put it. */
function cover(w: number, h: number): { s: number; ox: number; oy: number } {
  const s = Math.max(w / SKY_W, h / SKY_H);
  return { s, ox: (w - SKY_W * s) / 2, oy: (h - SKY_H * s) / 2 };
}

export function mountStars(): void {
  const layer = document.querySelector<HTMLElement>('.kernel-corners .stars');
  const field = layer?.querySelector<HTMLCanvasElement>('canvas.field');
  if (!layer || !field) return;

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
