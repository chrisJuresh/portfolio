// The studio: one Frame you can compose, and one row of Frames per axis so the
// options along it can be judged side by side. Every Frame plays the real
// recording, because a material over a photograph is the only version of it
// anybody sees.
//
// README.md says what this is for and when it goes.

import { PHOTOS, STUDIO, apply, refract } from './glass.js';

const CLIP = '/portfolio/video/photos-grid.webm';
const POSTER = '/portfolio/video/photos-grid.webp';
const ADDRESS = '127.0.0.1:8770';

// ---------------------------------------------------------------- the glyph sets

// Each set gives the ink's own bounding box as its viewBox, which is what lets
// the stylesheet set a width and leave the height alone — the share in the rule
// is then the share in the render's table. A full 24x24 icon-font box would draw
// a 5.6px-wide chevron as 1.4px of ink in 4px of air.
const GLYPHS = {
  current: {
    name: 'As shipped',
    note: 'Gemini-derived. The reload head is a bare hook and the share tray is square-cornered.',
    back: { box: '0 0 10 18', w: 1.5, d: ['M8.5 1.5 1.5 9l7 7.5'] },
    reload: { box: '0 0 16 18', w: 1.5, d: ['M13.5 9a5.5 5.5 0 1 1-1.9-4.2', 'M13.9 1.4v3.6h-3.6'] },
    share: {
      box: '0 0 22 21',
      w: 1.5,
      d: ['M6 8.2H2.75v11.05h16.5V8.2H16', 'M11 1v11.4M11 1 7.3 4.8M11 1l3.7 3.8'],
    },
  },
  safari: {
    name: 'Safari-faithful',
    note: 'Drawn to Safari 26 geometry: a slim tall chevron, a reload whose head is a chevron on the arc, a tray with a real corner radius. No dependency and no licence.',
    back: { box: '0 0 9 16', w: 1.6, d: ['M7.6 1.2 1.4 8l6.2 6.8'] },
    reload: {
      box: '0 0 16 16',
      w: 1.5,
      d: ['M14 8A6 6 0 1 1 12.24 3.76', 'M14.3 2v3.4h-3.4'],
    },
    share: {
      box: '0 0 20 21',
      w: 1.5,
      d: [
        'M6.2 7.8H3.6a1.6 1.6 0 0 0-1.6 1.6v8.4a1.6 1.6 0 0 0 1.6 1.6h12.8a1.6 1.6 0 0 0 1.6-1.6V9.4a1.6 1.6 0 0 0-1.6-1.6h-2.6',
        'M10 1.2v10.8',
        'M6.6 4.6 10 1.2l3.4 3.4',
      ],
    },
  },
  lucide: {
    name: 'Lucide',
    note: 'ISC. 2px stroke on a 24 grid, so it is heavier than Safari at this size.',
    back: { box: '8 5 8 14', w: 2, d: ['M15 18l-6-6 6-6'] },
    reload: {
      box: '2 2 20 20',
      w: 2,
      d: ['M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8', 'M21 3v5h-5'],
    },
    share: {
      box: '3 1 18 22',
      w: 2,
      d: ['M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8', 'M16 6l-4-4-4 4', 'M12 2v13'],
    },
  },
  phosphor: {
    name: 'Phosphor',
    note: 'MIT. A 256 grid at 16 stroke, which is the closest of the three libraries to Apple geometry.',
    back: { box: '72 40 96 176', w: 16, d: ['M160 208 80 128l80-80'] },
    reload: {
      box: '32 32 208 192',
      w: 16,
      d: ['M176 104h56V48', 'M191.9 191.9a88 88 0 1 1 0-127.8L232 104'],
    },
    share: {
      box: '40 16 176 200',
      w: 16,
      d: ['M86 66 128 24l42 42', 'M128 24v112', 'M48 144v56a8 8 0 0 0 8 8h144a8 8 0 0 0 8-8v-56'],
    },
  },
  heroicons: {
    name: 'Heroicons',
    note: 'MIT. 1.5 stroke on a 24 grid — the lightest of the three, and the closest in weight to the render.',
    back: { box: '7.5 3.75 9 16.5', w: 1.5, d: ['M15.75 19.5 8.25 12l7.5-7.5'] },
    reload: {
      box: '2.25 3.6 19.5 16.8',
      w: 1.5,
      d: [
        'M16.023 9.348h4.992V4.356m0 4.992-3.181-3.183a8.25 8.25 0 0 0-13.803 3.7',
        'M2.985 19.644V14.65m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7',
      ],
    },
    share: {
      box: '2.25 2.25 19.5 19.5',
      w: 1.5,
      d: [
        'M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5',
        'M7.5 7.5 12 3l4.5 4.5',
        'M12 3v13.5',
      ],
    },
  },
};

function glyph(set, which) {
  const g = GLYPHS[set][which];
  const paths = g.d.map((d) => `<path d="${d}"></path>`).join('');
  return (
    `<svg viewBox="${g.box}" fill="none" stroke="currentColor" stroke-width="${g.w}" ` +
    `stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
  );
}

// ------------------------------------------------------------------- the axes

const OPTICS = {
  apple: {
    name: 'Apple-conservative',
    note: 'A thin bevel, little dispersion, and a Fresnel wash lit most of the way round rather than two hot lobes. The blur does the work and the rim only says where the edge is.',
    s: {
      ...PHOTOS,
      refThickness: 13,
      refFactor: 1.5,
      refDispersion: 3,
      refFresnelRange: 22,
      refFresnelHardness: 45,
      refFresnelFactor: 30,
      glareRange: 26,
      glareHardness: 35,
      glareFactor: 85,
      glareConvergence: 40,
      blurRadius: 7,
      saturation: 118,
      shadowFactor: 24,
      shapeRoundness: 2,
    },
  },
  photos: {
    name: 'Photos, as shipped',
    note: 'The settings a /tune session over the real grid arrived at: a harder bend, no Fresnel wash, a narrow clipped glare, a heavy shadow, blur of 2.',
    s: { ...PHOTOS },
  },
  studio: {
    name: 'liquid-glass-studio defaults',
    note: "Upstream's own editor defaults, key for key. A rim lit almost the whole way round and a blur of 1.",
    s: { ...STUDIO, saturation: 100 },
  },
  bend: {
    name: 'Heavier bend',
    note: 'A thicker bevel at a higher index with four times the dispersion — the coloured fringe becomes the point.',
    s: { ...PHOTOS, refThickness: 26, refFactor: 3, refDispersion: 14, blurRadius: 4 },
  },
  glare: {
    name: 'Glare-forward',
    note: 'No Fresnel at all and a narrow glare driven past white, so the edge is two short highlights on opposite corners with dark between them.',
    s: {
      ...PHOTOS,
      refFresnelRange: 0,
      glareRange: 9,
      glareHardness: 0,
      glareFactor: 150,
      glareConvergence: 100,
      blurRadius: 3,
    },
  },
  squircle: {
    name: 'Squircle corner',
    note: "The same optics as Apple-conservative on a superellipse corner rather than a circular one — Apple's actual corner. The map refracts the same arc the paint draws.",
    s: {
      ...PHOTOS,
      refThickness: 13,
      refFactor: 1.5,
      refDispersion: 3,
      refFresnelRange: 22,
      refFresnelHardness: 45,
      refFresnelFactor: 30,
      glareRange: 26,
      glareHardness: 35,
      glareFactor: 85,
      glareConvergence: 40,
      blurRadius: 7,
      saturation: 118,
      shadowFactor: 24,
      shapeRoundness: 4,
    },
  },
  frost: {
    name: 'Frosted (the fallback)',
    note: 'What every engine that is not Chromium gets, and what this page falls back to on its own when the url() declaration is refused. Blur, tint, saturation and the two rings — no refraction, no dispersion.',
    s: { ...PHOTOS, refThickness: 0 },
  },
};

const TINTS = {
  clear: { name: 'Clear', note: 'No tint at all. The photograph behind it is the only colour.', v: { r: 255, g: 255, b: 255, a: 0 } },
  'white-06': { name: 'White 0.06', note: 'A breath of white — the least that still reads as a pane.', v: { r: 255, g: 255, b: 255, a: 0.06 } },
  'white-13': { name: 'White 0.13', note: "Photos' own light-theme tint.", v: { r: 255, g: 255, b: 255, a: 0.13 } },
  'white-22': { name: 'White 0.22', note: 'Enough that the glyphs need no ground of their own.', v: { r: 255, g: 255, b: 255, a: 0.22 } },
  'black-32': { name: 'Black 0.32', note: "Photos' own count-pane tint: darkened glass rather than lightened.", v: { r: 16, g: 16, b: 21, a: 0.32 } },
  'black-55': { name: 'Black 0.55', note: 'Heavily smoked. The recording under it is a suggestion.', v: { r: 10, g: 10, b: 12, a: 0.55 } },
  'magenta-135': { name: "Magenta 0.135 (today's)", note: "#66's #fab2ff at its shipped alpha — the hue the brief calls out as not matching the rim.", v: { r: 250, g: 178, b: 255, a: 0.135 } },
  'magenta-05': { name: 'Magenta 0.05', note: 'The same hue kept only as a trace, as a signature rather than a colour.', v: { r: 250, g: 178, b: 255, a: 0.05 } },
  'paper-10': { name: 'Paper 0.10', note: "The page's own paper, #f2f1ee — the pane tinted with the ink of the document it sits in.", v: { r: 242, g: 241, b: 238, a: 0.1 } },
  'cool-10': { name: 'Cool 0.10', note: 'A blue-grey, which is the direction the dark grey-blue band round the recording already leans.', v: { r: 143, g: 168, b: 200, a: 0.1 } },
  'warm-08': { name: 'Warm 0.08', note: 'Amber, against the marble the window stands on.', v: { r: 200, g: 168, b: 127, a: 0.08 } },
  'graphite-35': { name: 'Graphite 0.35', note: "The band's own #131518, so the strip and the border round the recording are one colour by construction.", v: { r: 19, g: 21, b: 24, a: 0.35 } },
  turn: { name: 'Crossed with the Turn', note: 'Paper at the near end, graphite at the far one — the one tint that costs nothing to interpolate now that the material is custom properties rather than a baked canvas.', turn: true },
};

const BACKDROPS = {
  flat: { name: 'Flat fill (today)', note: "The Frame's own #131518. A displacement map over a uniform colour returns the same uniform colour, so the refraction computes to nothing and only the rings are visible." },
  clip: { name: 'The recording, under the glass', note: 'The content box goes to the top of the window and the bar floats over the photographs. What Safari 26 actually does — and it puts the app’s own liquid glass bar under the page’s.' },
  type: { name: "The subheading, under the glass", note: 'The window keeps its fill everywhere except behind the strip, so what the bar refracts is PHOTO GALLERY — the words the Frame already overlaps by two thirds of a line.' },
  marble: { name: "The Plinth's stone, carried up", note: 'The marble the window stands on, extended behind the titlebar. Texture to bend, and it belongs to the composition already.' },
};

const RIMS = {
  bar: { name: "Bar only", note: "The window keeps its hairline ring and the bar's tint goes neutral. The smallest change that answers the hue complaint." },
  one: { name: 'One glass object', note: "The window's rim IS the material's Fresnel ring, so the edge round the recording and the edge round the bar are the same declaration rather than two that match." },
  whole: { name: 'The whole window is the pane', note: 'The Frame itself carries the material and the recording is a hole cut in it. The largest change, and it puts glass over the marble reflection.' },
  none: { name: 'No ring at all', note: 'The glare alone draws the edge. Honest to the shader and, on a dark ground, very nearly invisible.' },
};

const BANDS = {
  'as-is': { name: '0.00816 (today)', note: "8.4px at a Frame 1033 wide. This is the dark grey-blue border the brief describes — it is the window's own fill, not anything /record put in the file." },
  half: { name: '0.00408', note: 'Half of it. The recording nearly reaches the rim.' },
  none: { name: '0', note: 'Gone. The recording is flush to the ring on all three sides.' },
  neutral: { name: 'Recoloured', note: "The band kept at its measured width but mixed towards the rim's own paper, so it reads as part of the window's edge rather than as a second frame." },
};

const CROPS = {
  'as-is': { name: 'As recorded', note: "The clip carries the grid's own 14px page inset, near-black, INSIDE the video — so on the left and right there are two borders stacked." },
  cropped: { name: 'Page inset cropped out', note: 'What a re-record with the app’s --page-inset at 0 would look like. Simulated by scale here, because that answers whether it is worth re-recording without re-recording.' },
};

const LIGHTS = {
  grey: { name: 'Grey discs (today)', note: 'What the render shows: three identical grey discs, an unfocused window.' },
  traffic: { name: 'Red, amber, green', note: "macOS with the window focused. More literal, and it puts three saturated dots next to nothing else that is coloured." },
  rings: { name: 'Hollow rings', note: 'Outlines rather than fills, which is what the rest of the chrome is.' },
};

// ------------------------------------------------------------------ the Frame

let panes = [];

function makeFrame(opts) {
  const o = {
    backdrop: 'clip',
    tint: 'white-06',
    rim: 'one',
    optics: 'apple',
    band: 'as-is',
    crop: 'as-is',
    icons: 'safari',
    lights: 'grey',
    reloadPad: 0.008,
    material: 'glass',
    ...opts,
  };

  const frame = document.createElement('div');
  frame.className = 'frame';
  frame.dataset.backdrop = o.backdrop;
  frame.dataset.rim = o.rim;
  frame.dataset.crop = o.crop;
  if (o.band === 'none') frame.style.setProperty('--band', '0');
  if (o.band === 'half') frame.style.setProperty('--band', '0.00408');
  if (o.band === 'neutral') frame.classList.add('band-neutral');
  frame.style.setProperty('--reload-pad', String(o.reloadPad));

  frame.innerHTML =
    '<div class="fill"></div>' +
    '<div class="stone"></div>' +
    `<div class="content"><video class="clip" muted loop playsinline preload="none" poster="${POSTER}" width="1440" height="900"></video></div>` +
    `<div class="bar" data-material="${o.material}" data-rings="${o.rim === 'none' ? 'off' : 'on'}">` +
    `<div class="chrome">` +
    `<span class="lights" data-lights="${o.lights}"><i></i><i></i><i></i></span>` +
    `<span class="icon back">${glyph(o.icons, 'back')}</span>` +
    `<span class="icon fwd">${glyph(o.icons, 'back')}</span>` +
    `<span class="address"><span class="address-text">${ADDRESS}</span>` +
    `<span class="icon reload">${glyph(o.icons, 'reload')}</span></span>` +
    `<span class="icon share">${glyph(o.icons, 'share')}</span>` +
    '</div></div>';

  // The forward chevron is the back one turned round, which is one glyph in the
  // set rather than two that have to be kept mirror-images of each other.
  frame.querySelector('.fwd svg').style.transform = 'scaleX(-1)';

  frame.__opts = o;
  return frame;
}

/** Give one Frame's panes their settings, and report which rung each landed on. */
function dress(frame) {
  const o = frame.__opts;
  const s = { ...OPTICS[o.optics].s };
  const tint = TINTS[o.tint];
  s.tint = tint.turn ? turnTint() : tint.v;
  if (window.__forceFallback) s.refThickness = 0;

  apply(frame, s);

  for (const pane of frame.__panes ?? []) pane.destroy();
  const targets = o.rim === 'whole' ? [frame] : [frame.querySelector('.bar')];
  if (o.rim === 'one') targets.push(frame);
  frame.__panes = targets.map((node) => {
    const pane = refract(node);
    pane.draw(s, s.refThickness <= 0);
    return pane;
  });
  frame.__refracting = frame.__panes.some((pane) => pane.refracting());
}

function turnTint() {
  const t = Number(document.documentElement.style.getPropertyValue('--turn') || 1);
  const paper = { r: 242, g: 241, b: 238 };
  const graphite = { r: 19, g: 21, b: 24 };
  const mix = (a, b) => Math.round(a + (b - a) * t);
  return { r: mix(paper.r, graphite.r), g: mix(paper.g, graphite.g), b: mix(paper.b, graphite.b), a: 0.28 };
}

// ---------------------------------------------------------------- the recording

// A row's clips are not given a source until the row is on screen, and are
// paused again when it leaves. Forty decoding videos is not a comparison,
// it is a slideshow.
const watcher = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      for (const clip of entry.target.querySelectorAll('video')) {
        if (entry.isIntersecting) {
          if (!clip.src) clip.src = CLIP;
          void clip.play().catch(() => {});
        } else {
          clip.pause();
        }
      }
    }
  },
  { rootMargin: '200px' },
);

// ------------------------------------------------------------------- the sheet

function card(width, opts, name, note) {
  const figure = document.createElement('figure');
  figure.className = 'card';
  figure.style.margin = '0';
  figure.style.setProperty('--card-w', `${width}px`);

  const ground = document.createElement('div');
  ground.className = 'ground';
  ground.style.setProperty('--frame-w', `${width}px`);
  if (opts.backdrop === 'type') {
    const words = document.createElement('div');
    words.className = 'words';
    words.textContent = 'PHOTO GALLERY';
    ground.appendChild(words);
  }

  const frame = makeFrame(opts);
  ground.appendChild(frame);

  const caption = document.createElement('figcaption');
  caption.innerHTML = `<b></b>`;
  caption.firstChild.textContent = name;
  caption.append(document.createTextNode(note));

  figure.append(ground, caption);
  panes.push(frame);
  return figure;
}

function axis(title, blurb, options, key, width, base) {
  const section = document.createElement('section');
  section.className = 'axis';
  const h2 = document.createElement('h2');
  h2.textContent = title;
  const p = document.createElement('p');
  p.textContent = blurb;
  const row = document.createElement('div');
  row.className = 'row';
  for (const [value, meta] of Object.entries(options)) {
    row.appendChild(card(width, { ...base(), [key]: value }, meta.name, ` ${meta.note}`));
  }
  section.append(h2, p, row);
  watcher.observe(row);
  return section;
}

// -------------------------------------------------------------------- the page

const controls = {};
const composer = { ...{}, backdrop: 'clip', tint: 'white-06', rim: 'one', optics: 'apple', band: 'as-is', crop: 'as-is', icons: 'safari', lights: 'grey' };

function selector(label, options, key) {
  const field = document.createElement('label');
  field.className = 'field';
  field.textContent = label;
  const select = document.createElement('select');
  for (const [value, meta] of Object.entries(options)) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = meta.name;
    select.appendChild(option);
  }
  select.value = composer[key];
  select.addEventListener('change', () => {
    composer[key] = select.value;
    rebuildComposer();
  });
  field.appendChild(select);
  controls[key] = select;
  return field;
}

let composerHost = null;

function rebuildComposer() {
  composerHost.textContent = '';
  panes = panes.filter((frame) => frame.isConnected);
  const width = Number(document.getElementById('size').value);
  const figure = card(
    width,
    { ...composer, reloadPad: Number(document.getElementById('pad').value) / 1000 },
    'Composed',
    ` ${OPTICS[composer.optics].note}`,
  );
  composerHost.appendChild(figure);
  watcher.observe(figure.querySelector('.ground'));
  const frame = figure.querySelector('.frame');
  dress(frame);
  const clip = figure.querySelector('video');
  clip.src = CLIP;
  void clip.play().catch(() => {});
  document.getElementById('rung').innerHTML = frame.__refracting
    ? '<b>refracting</b> — url() in a backdrop filter was accepted'
    : '<b data-frosted>frosted</b> — the url() declaration was refused, rings and blur only';
}

function build() {
  const top = document.querySelector('.top');
  top.append(
    selector('Backdrop', BACKDROPS, 'backdrop'),
    selector('Tint', TINTS, 'tint'),
    selector('Rim', RIMS, 'rim'),
    selector('Optics', OPTICS, 'optics'),
    selector('Band', BANDS, 'band'),
    selector('Clip crop', CROPS, 'crop'),
    selector('Glyphs', GLYPHS, 'icons'),
    selector('Lights', LIGHTS, 'lights'),
  );

  composerHost = document.querySelector('.composer');
  const main = document.querySelector('main');

  const base = () => ({ ...composer });

  main.append(
    axis(
      'A — what is behind the glass',
      'Refraction of a uniform colour is that colour. This is the axis everything optical depends on, and it is the one that costs geometry.',
      BACKDROPS,
      'backdrop',
      520,
      base,
    ),
    axis(
      'B — the tint',
      'Every hue I can argue for, at the alpha that hue wants. The rim and the window body are neutral, which is the whole of the complaint about the magenta.',
      TINTS,
      'tint',
      430,
      base,
    ),
    axis(
      'C — the rim, and whether the window is one object',
      'The brief says the bar does not match the border round the edge and foot. These are four different readings of what matching would mean.',
      RIMS,
      'rim',
      520,
      base,
    ),
    axis(
      'D — the optics',
      "Upstream's parameters, the photos site's tuned ones, and three departures. The last is the fallback every non-Chromium engine gets, shown on purpose.",
      OPTICS,
      'optics',
      520,
      base,
    ),
    axis(
      'E — the band round the recording',
      "The dark grey-blue border. It is --projects-panel-frame-inset showing the window's own fill, inset on three sides and deliberately flush at the top.",
      BANDS,
      'band',
      520,
      base,
    ),
    axis(
      'F — the recording’s own margin',
      'Inside the video there is a second border: the grid keeps 14px from every edge of its own window, and that is in the file.',
      CROPS,
      'crop',
      520,
      base,
    ),
    axis(
      'G — the glyphs',
      'Three lights, back, forward, the field with its reload, and share. The sidebar toggle and the two tab glyphs are gone from all of these.',
      GLYPHS,
      'icons',
      520,
      base,
    ),
    axis('H — the lights', 'Three discs, and two other things they could be.', LIGHTS, 'lights', 520, base),
  );

  for (const frame of panes) dress(frame);
  rebuildComposer();
}

document.getElementById('turn').addEventListener('input', (event) => {
  document.documentElement.style.setProperty('--turn', event.target.value);
  for (const frame of panes) if (frame.__opts.tint === 'turn') dress(frame);
});

document.getElementById('size').addEventListener('input', rebuildComposer);
document.getElementById('pad').addEventListener('input', rebuildComposer);

const fallback = document.getElementById('fallback');
fallback.addEventListener('click', () => {
  window.__forceFallback = !window.__forceFallback;
  fallback.setAttribute('aria-pressed', String(!!window.__forceFallback));
  for (const frame of panes) dress(frame);
});

build();
