import { onThemeChange, theme, type Theme } from './theme';

/**
 * The corner pictures.
 *
 * Each is baked at four widths and, where its grade needed a second answer on
 * black, again per theme — so this picks one file out of a grid rather than off a
 * list, and picks again when the theme or the display changes under it.
 *
 * THE ONE LINE POINTING AT THE OLD TREE. The ladder is still the one
 * design/plate/build-plate.py writes into portfolio/img/, because /next is not
 * replacing /portfolio yet; the ticket that flips the route moves these bytes and
 * changes this constant. Nothing else here knows where they live.
 */
const LADDER_BASE = '/portfolio/img/';

/** Keep this equal to OUT_WIDTHS in design/plate/build-plate.py. */
const RUNGS = [800, 1300, 2000, 2800] as const;

/**
 * A digest of every ladder file, appended to each URL. Not a cache-buster in the
 * usual sense: a rung's filename is content-independent, and the deployment
 * caches /portfolio/img/ for a day, so this is the only thing that makes a
 * re-bake visible. build-plate.py prints the current value at the end of a run.
 */
const LADDER_VERSION = 'cd5a41c7';

interface Picture {
  /** the file stem, and Picture.out_path()'s in build-plate.py */
  readonly stem: string;
  /** the custom property corners.css draws it from */
  readonly property: string;
  /** drawn width as a share of the first screen. Keep equal to --<stem>-fill. */
  readonly fill: number;
  /** the ceiling on --<stem>-w, in CSS pixels */
  readonly max: number;
  /** the widest rung that has actually resolved, per theme */
  shown: Record<Theme, number>;
  /** and the URL it resolved to, so a theme flip is a repaint and not a fetch */
  src: Record<Theme, string | null>;
}

function picture(stem: string, fill: number): Picture {
  return {
    stem,
    property: `--${stem}-src`,
    fill,
    max: 2400,
    shown: { light: 0, dark: 0 },
    src: { light: null, dark: null },
  };
}

/** Light is unsuffixed. Keep this spelling and build-plate.py's together. */
function rungUrl(p: Picture, width: number, forTheme: Theme): string {
  const dark = forTheme === 'dark' ? 'dark-' : '';
  return `${LADDER_BASE}${p.stem}-${dark}${width}.webp?v=${LADDER_VERSION}`;
}

export function mountCorners(): void {
  const root = document.documentElement;

  // Metered or genuinely slow connections do not get them at all. They are
  // ornaments, and this is the one honest way to treat them as optional.
  const link = (navigator as { connection?: { saveData?: boolean; effectiveType?: string } })
    .connection;
  if (link?.saveData === true || /^(slow-)?2g$/.test(link?.effectiveType ?? '')) return;

  const pictures = [picture('plate', 0.863), picture('car', 0.497), picture('eye', 0.582)];

  const rungFor = (p: Picture): number => {
    const drawnAt = Math.min(p.max, p.fill * (window.innerHeight || 1080));
    const want = drawnAt * (window.devicePixelRatio || 1);
    return RUNGS.find((rung) => rung >= want) ?? RUNGS[RUNGS.length - 1]!;
  };

  // Every picture, at whatever each has resolved to for the theme on screen —
  // off the stored URLs rather than off the load that triggered it, so a flip
  // repaints all of them from cache and none is blanked while another decides.
  const paint = (): void => {
    const current = theme();
    for (const p of pictures) {
      const src = p.src[current];
      if (src) root.style.setProperty(p.property, `url("${src}")`);
    }
  };

  // A miss on a dark file is the ordinary untuned state and not an error:
  // build-plate.py writes no dark ladder while dark's grade matches light's. So
  // one retry against the light rung of the same width, and only then give up.
  const fetchRung = (p: Picture, width: number, forTheme: Theme): void => {
    const attempt = (url: string, fallback: string | null): void => {
      const img = new Image();
      const land = (resolved: string | null): void => {
        img.onload = img.onerror = null;
        if (resolved && width > p.shown[forTheme]) {
          p.shown[forTheme] = width;
          p.src[forTheme] = resolved;
        }
        paint();
      };
      img.onload = () => land(url);
      img.onerror = () => {
        img.onload = img.onerror = null;
        if (fallback) attempt(fallback, null);
        else land(null);
      };
      img.src = url;
      if (img.complete && img.naturalWidth > 0) land(url);
    };
    attempt(rungUrl(p, width, forTheme), forTheme === 'light' ? null : rungUrl(p, width, 'light'));
  };

  // Upgrade only, and for the theme on screen only: a rung already good enough
  // is left alone so dragging a window cannot thrash, and the other theme is
  // upgraded if and when it is next shown.
  const upgrade = (): void => {
    const current = theme();
    for (const p of pictures) {
      const need = rungFor(p);
      if (need > p.shown[current]) fetchRung(p, need, current);
    }
  };

  upgrade();
  onThemeChange(() => {
    paint();
    upgrade();
  });

  // Dragged onto a denser screen, or pulled taller. Both now ask for more; width
  // asks for nothing, because no picture here changes size with the window's.
  let timer: number | undefined;
  window.addEventListener('resize', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(upgrade, 250);
  });
}
