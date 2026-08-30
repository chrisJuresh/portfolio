import {
  BufferAttribute,
  BufferGeometry,
  Color,
  LinearMipmapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Texture,
  WebGLRenderer,
} from 'three';
import { EDGE_AMBIENT, EDGE_LIGHT, type Stage, type StageParts } from './stage';

/**
 * The WebGL stage: the same Exploded View, drawn with a Slab that has real
 * thickness (#181).
 *
 * WHY THERE IS A SECOND STAGE AT ALL. Not so the Portfolio can have a renderer —
 * so the renderer is chosen by LOOKING. The shipped stage is DOM and it is very
 * good, and the one thing it genuinely cannot do is a Slab whose captured pixels
 * continue over a rounded edge: DOM would need six faces to get the silhouette,
 * and six faces still cannot run a continuous texture round a fillet. That gap is
 * the finding, and `design/tools/render-stages.mjs` is where it is rendered.
 *
 * IT DRAWS THE SLAB AND NOTHING ELSE. The Cards stay DOM, on the same CSS plane,
 * positioned by the same rules — they are the Eater app's own markup and have to
 * stay selectable, screen-readable text (#171, #176). So this module replaces one
 * `<img>` with one `<canvas>` and matches the CSS camera exactly, and everything
 * else about the composition is untouched.
 *
 * THE CAMERA IS THE SAME CAMERA, ARITHMETICALLY AND NOT BY EYE. `EaterMap.astro`
 * writes `perspective(P) translateZ(-D) rotateX(T) rotateZ(S)`, which is a camera
 * standing P in front of the plane's own centre. CSS's axes are x right, y DOWN,
 * z toward the reader; three's are x right, y UP, z toward the reader — so the two
 * rotations come across NEGATED, and the order survives because a CSS transform
 * list applies right to left and three's default Euler order 'XYZ' composes
 * Rx.Ry.Rz, which is the same "Z first". The projection is matched by choosing the
 * field of view rather than by scaling anything afterwards:
 *
 *     fov = 2 x atan(canvas height / 2P)
 *
 * which makes the plane at z = 0 land on the canvas one CSS pixel to one CSS
 * pixel. That is the whole of why the flat frame of this stage is the flat frame
 * of the other one, and it is why the Cards — which are still on the CSS plane —
 * sit exactly where the drawn map says they should.
 *
 * IT NEVER ANIMATES. `--eater-map-lift` is read off the page each frame and the
 * drawing follows it; nothing here has a clock. That is what makes reduced motion
 * free, exactly as it is for the DOM stage: `timeline.ts` rests the playhead at 1
 * and builds no trigger, this reads 1, and the finished Exploded View is what is
 * drawn without a frame of movement.
 *
 * THE CANVAS IS OUTSIDE THE ROTATION AND BIGGER THAN THE SLAB. It is a sibling of
 * `.eater-map__plane` rather than a child, because a child would be turned by the
 * CSS rotation and then turned again by this one; and a tilted slab with a
 * thickness reaches outside the box the flat picture fitted, so the canvas is
 * grown to the extent the projection actually needs — measured by projecting the
 * corners at several moments of the Lift rather than guessed at.
 */

/** Samples per quadrant of the Slab's outline, and rings across the fillet.
 *
 *  Counts and not Tokens: they are how finely a curve is chopped before it reads
 *  as one, which is a property of the drawing machinery rather than anything the
 *  author composes with. Six hundred-odd triangles either way. */
const ARC = 10;
const RINGS = 8;

/** Points around one ring. */
const RING = 4 * ARC;

/** Moments of the Lift the canvas is sized against. The extent is not monotonic
 *  in the progress — the plane turns while the camera pulls back — so the box is
 *  the union of a few frames rather than the raised one. */
const SAMPLES = [0, 0.25, 0.5, 0.75, 1];

/** Slack around that box, in CSS pixels, for the half-pixel a rounded canvas
 *  loses at each edge. */
const PAD = 2;

/**
 * A computed colour as three numbers, or null for anything this cannot read.
 *
 * NULL RATHER THAN A GUESS, AND NEVER `Color.setStyle`. That method warns to the
 * console on a syntax it does not know, and the `console` Check fails a page that
 * logs — so a Variant setting the edge to a `color-mix()` would turn a colour
 * nobody chose into a failing build. Chromium serialises a computed `color` as
 * `rgb()` or `rgba()` for anything in sRGB, which is what the Token is.
 */
function srgb(value: string): [number, number, number] | null {
  const numbers = /^rgba?\(([^)]*)\)$/.exec(value.trim());
  const parts = (numbers?.[1] ?? '')
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map((one) => Number.parseFloat(one));
  const [red, green, blue] = parts;
  if (red === undefined || green === undefined || blue === undefined) return null;
  if (![red, green, blue].every((one) => Number.isFinite(one))) return null;
  return [red / 255, green / 255, blue / 255];
}

/** What the composition currently says the Slab is. Everything here is read off
 *  the page rather than held, so a Token dragged in the Editor moves the drawing
 *  on the next frame exactly as it moves the DOM stage's. */
interface Look {
  width: number;
  height: number;
  lift: number;
  camera: number;
  dolly: number;
  tilt: number;
  swing: number;
  thickness: number;
  radius: number;
}

/** The eight corners of the Slab, projected the way the CSS camera projects them,
 *  as the box in CSS pixels the canvas has to cover. */
function extent(look: Look): { width: number; height: number } {
  const eye = look.camera * look.width;
  let x = look.width / 2;
  let y = look.height / 2;
  for (const lift of SAMPLES) {
    const tilt = (look.tilt * lift * Math.PI) / 180;
    const swing = (look.swing * lift * Math.PI) / 180;
    const depth = look.thickness * lift * look.width;
    const dolly = look.dolly * lift * look.width;
    for (const sx of [-0.5, 0.5]) {
      for (const sy of [-0.5, 0.5]) {
        for (const sz of [0, -depth]) {
          // CSS's own order: swing about z, then tilt about x, then the dolly
          // along the view's axis. Written in CSS's axes — y down — because this
          // is asking what the stylesheet would have drawn.
          const px = sx * look.width;
          const py = sy * look.height;
          const rx = px * Math.cos(swing) - py * Math.sin(swing);
          const ry = px * Math.sin(swing) + py * Math.cos(swing);
          const ty = ry * Math.cos(tilt) - sz * Math.sin(tilt);
          const tz = ry * Math.sin(tilt) + sz * Math.cos(tilt) - dolly;
          const near = eye - tz;
          if (!(near > 1)) continue;
          x = Math.max(x, Math.abs((rx * eye) / near));
          y = Math.max(y, Math.abs((ty * eye) / near));
        }
      }
    }
  }
  return { width: Math.ceil(2 * (x + PAD)), height: Math.ceil(2 * (y + PAD)) };
}

/**
 * The Slab, as a rounded-edge extrusion whose topology never changes.
 *
 * THE TOPOLOGY IS FIXED AND THE POSITIONS ARE REWRITTEN IN PLACE, because the
 * thickness is spent by the Lift and therefore moves every frame. Only the index
 * buffer says how the surface is joined up, and that is a function of the two
 * counts above and of nothing the composition can change — so it is built once
 * and the three float arrays are refilled.
 *
 * HOW A POINT ON THE OUTLINE IS FOUND. The Slab is a rectangle inset by the edge
 * radius, offset outwards by a distance: at offset 0 that is the inner rectangle,
 * at offset r it is the Slab's own outline, and in between it is the same shape
 * with rounder corners. One angle walks all the way round it, and the outward
 * direction there is just (cos, sin) — which is what makes both the fillet's shape
 * and its shading fall out of one parameter.
 *
 * AND HOW THE PIXELS WRAP. The fillet's SHAPE puts the ring at plan distance
 * r sin(phi) and depth -r(1 - cos phi); its TEXTURE reads the picture at plan
 * distance r (2 phi / pi), which is the same band of pixels spread evenly along
 * the arc. Both ends meet the rest of the drawing exactly: at phi = 0 the ring is
 * the edge of the flat face and reads the same pixels it does, and at phi = pi/2
 * the ring is the Slab's silhouette and reads the picture's own last row. So the
 * captured pixels run off the front, round the corner, and stop precisely where
 * the object does. That is the cell the DOM stage has no way to fill.
 */
class Slab {
  readonly geometry = new BufferGeometry();

  /** front cap centre, (RINGS + 1) fillet rings, the wall's two rings, back centre */
  private static readonly VERTICES = 1 + (RINGS + 1) * RING + 2 * RING + 1;

  /** Where each run of triangles starts in the index buffer. */
  private static readonly FILLET = 3 * RING;
  private static readonly WALL = Slab.FILLET + 6 * RINGS * RING;
  private static readonly BACK = Slab.WALL + 6 * RING;
  private static readonly INDICES = Slab.BACK + 3 * RING;

  private readonly position = new Float32Array(3 * Slab.VERTICES);
  private readonly uv = new Float32Array(2 * Slab.VERTICES);
  private readonly colour = new Float32Array(3 * Slab.VERTICES);

  constructor() {
    const index = new Uint16Array(Slab.INDICES);
    let at = 0;
    const ring = (j: number, k: number) => 1 + j * RING + (k % RING);
    const wallFront = (k: number) => 1 + (RINGS + 1) * RING + (k % RING);
    const wallBack = (k: number) => wallFront(k) + RING;
    const backCentre = Slab.VERTICES - 1;

    for (let k = 0; k < RING; k += 1) {
      index[at++] = 0;
      index[at++] = ring(0, k);
      index[at++] = ring(0, k + 1);
    }
    for (let j = 0; j < RINGS; j += 1) {
      for (let k = 0; k < RING; k += 1) {
        index[at++] = ring(j, k);
        index[at++] = ring(j + 1, k);
        index[at++] = ring(j + 1, k + 1);
        index[at++] = ring(j, k);
        index[at++] = ring(j + 1, k + 1);
        index[at++] = ring(j, k + 1);
      }
    }
    for (let k = 0; k < RING; k += 1) {
      index[at++] = wallFront(k);
      index[at++] = wallBack(k);
      index[at++] = wallBack(k + 1);
      index[at++] = wallFront(k);
      index[at++] = wallBack(k + 1);
      index[at++] = wallFront(k + 1);
    }
    for (let k = 0; k < RING; k += 1) {
      index[at++] = backCentre;
      index[at++] = wallBack(k + 1);
      index[at++] = wallBack(k);
    }

    this.geometry.setIndex(new BufferAttribute(index, 1));
    this.geometry.setAttribute('position', new BufferAttribute(this.position, 3));
    this.geometry.setAttribute('uv', new BufferAttribute(this.uv, 2));
    this.geometry.setAttribute('color', new BufferAttribute(this.colour, 3));
  }

  /**
   * Which runs of triangles are the picture and which are the edge.
   *
   * The only difference between a Slab with a plain edge and a Slab the pixels
   * wrap over — the geometry is identical, and what changes is whether the fillet
   * is drawn with the photograph or with a colour. Groups rather than a rebuild,
   * so switching between them costs nothing.
   */
  faces(wrapped: boolean): void {
    this.geometry.clearGroups();
    const front = wrapped ? Slab.WALL : Slab.FILLET;
    this.geometry.addGroup(0, front, 0);
    this.geometry.addGroup(front, Slab.INDICES - front, 1);
  }

  /** @param edge the Slab's side colour, already in the renderer's working space */
  write(width: number, height: number, depth: number, round: number, edge: Color): void {
    const radius = Math.max(0, Math.min(round, depth, width / 2, height / 2));
    const ax = width / 2 - radius;
    const ay = height / 2 - radius;
    const { position, uv, colour } = this;
    const step = Math.PI / 2 / ARC;

    let vertex = 0;
    const put = (x: number, y: number, z: number, u: number, v: number, shade: number) => {
      position[3 * vertex] = x;
      position[3 * vertex + 1] = y;
      position[3 * vertex + 2] = z;
      uv[2 * vertex] = u;
      uv[2 * vertex + 1] = v;
      colour[3 * vertex] = edge.r * shade;
      colour[3 * vertex + 1] = edge.g * shade;
      colour[3 * vertex + 2] = edge.b * shade;
      vertex += 1;
    };
    /** The plan point on the outline at ring index k, offset outwards by `out`. */
    const plan = (k: number, out: number): [number, number] => {
      const angle = k * step;
      const quadrant = Math.floor(k / ARC);
      const sx = quadrant === 0 || quadrant === 3 ? ax : -ax;
      const sy = quadrant === 0 || quadrant === 1 ? ay : -ay;
      return [sx + out * Math.cos(angle), sy + out * Math.sin(angle)];
    };
    const lit = (nx: number, ny: number, nz: number) =>
      EDGE_AMBIENT + (1 - EDGE_AMBIENT) * Math.max(0, nx * EDGE_LIGHT[0] + ny * EDGE_LIGHT[1] + nz * EDGE_LIGHT[2]);
    const u = (x: number) => (x + width / 2) / width;
    const v = (y: number) => (y + height / 2) / height;

    put(0, 0, 0, 0.5, 0.5, lit(0, 0, 1));
    for (let j = 0; j <= RINGS; j += 1) {
      const phi = (Math.PI / 2) * (j / RINGS);
      const out = radius * Math.sin(phi);
      const outTexture = radius * ((2 * phi) / Math.PI);
      const z = -radius * (1 - Math.cos(phi));
      for (let k = 0; k < RING; k += 1) {
        const angle = k * step;
        const [x, y] = plan(k, out);
        const [tx, ty] = plan(k, outTexture);
        put(
          x,
          y,
          z,
          u(tx),
          v(ty),
          lit(Math.cos(angle) * Math.sin(phi), Math.sin(angle) * Math.sin(phi), Math.cos(phi)),
        );
      }
    }
    for (const z of [-radius, -depth]) {
      for (let k = 0; k < RING; k += 1) {
        const angle = k * step;
        const [x, y] = plan(k, radius);
        put(x, y, z, u(x), v(y), lit(Math.cos(angle), Math.sin(angle), 0));
      }
    }
    put(0, 0, -depth, 0.5, 0.5, lit(0, 0, -1));

    for (const attribute of ['position', 'uv', 'color']) {
      this.geometry.getAttribute(attribute).needsUpdate = true;
    }
    this.geometry.computeBoundingSphere();
  }
}

/** Every number the drawing turns on, as one string, so a frame that would draw
 *  the same picture is not drawn again. */
function signature(look: Look, edge: string, colour: string): string {
  return `${Object.values(look).join('|')}|${edge}|${colour}`;
}

const mountWebglStage = async (parts: StageParts): Promise<Stage> => {
  const { slab, still, edge } = parts;

  // The photograph has to be decoded before it can be a texture, and this is also
  // what makes the Slab's bytes arrive: the markup asks for them lazily, and the
  // stage mounts as the Section approaches, which is the same moment.
  await still.decode().catch(() => undefined);

  const canvas = document.createElement('canvas');
  canvas.className = 'eater-map__gl';
  canvas.style.cssText = 'position:absolute;pointer-events:none;color:var(--eater-map-slab-edge)';
  // The picture's claim moves to the thing now drawing it: `alt` is Content, and a
  // reader who cannot see either one is owed it.
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', still.alt);
  slab.prepend(canvas);
  // AND THE `<img>` GOES — but only after it has decoded, because it is still the
  // texture's source and an element out of the document is a perfectly good one.
  // Not HIDDEN: `opacity: 0` or `visibility: hidden` on one of this Section's own
  // boxes is exactly what the `eater-map` Check refuses, and rightly, since a
  // hidden box is how a composition becomes contingent on a script. Taken out,
  // the Section is drawn entirely by whatever is standing in for it.
  still.remove();

  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearAlpha(0);

  const texture = new Texture(still);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.needsUpdate = true;

  const picture = new MeshBasicMaterial({ map: texture });
  const side = new MeshBasicMaterial({ vertexColors: true });
  const shape = new Slab();
  shape.faces(edge === 'wrapped');

  const mesh = new Mesh(shape.geometry, [picture, side]);
  const scene = new Scene();
  scene.add(mesh);
  const camera = new PerspectiveCamera();

  const colour = new Color();
  /** The last frame's inputs, so a still page costs one style read and no draw. */
  let drawn = '';
  /** And the last drawing buffer, because remaking one is not free. */
  let sized = '';

  function read(): Look | null {
    const box = slab.getBoundingClientRect();
    if (!(box.width > 0) || !(box.height > 0)) return null;
    const style = getComputedStyle(slab);
    const token = (name: string, fallback: number) => {
      const value = Number.parseFloat(style.getPropertyValue(name));
      return Number.isFinite(value) ? value : fallback;
    };
    return {
      width: box.width,
      height: box.height,
      lift: token('--eater-map-lift', 1),
      camera: token('--eater-map-camera', 2.3),
      dolly: token('--eater-map-dolly', 0),
      tilt: token('--eater-map-tilt', 0),
      swing: token('--eater-map-swing', 0),
      // A Slab with no thickness is what the FLAT edge is, and it is also the
      // honest answer when the Token is missing: this stage's job is to draw the
      // composition, and adding a depth nobody asked for would not be it.
      thickness: edge === 'flat' ? 0 : token('--eater-map-slab-thickness', 0),
      radius: edge === 'flat' ? 0 : token('--eater-map-slab-edge-radius', 0),
    };
  }

  function draw(): void {
    const look = read();
    if (!look) return;
    const stated = getComputedStyle(canvas).color;
    const now = signature(look, edge, stated);
    if (now === drawn) return;
    drawn = now;

    const rgb = srgb(stated);
    if (rgb) colour.setRGB(rgb[0], rgb[1], rgb[2], SRGBColorSpace);

    // THE BOX IS SET ONLY WHEN IT MOVES, and that is not tidiness: `setSize`
    // reallocates the drawing buffer, so calling it on every frame of the Lift
    // would throw away and remake a couple of megabytes sixty times a second. The
    // extent is a function of the Slab's box and the Tokens and is deliberately
    // NOT a function of the playhead — it is the union over five moments of the
    // Lift — so during a Lift there is nothing here to do.
    const box = extent(look);
    const ratio = window.devicePixelRatio || 1;
    const buffer = `${box.width}x${box.height}@${ratio}`;
    if (buffer !== sized) {
      sized = buffer;
      canvas.style.width = `${box.width}px`;
      canvas.style.height = `${box.height}px`;
      canvas.style.left = `${(look.width - box.width) / 2}px`;
      canvas.style.top = `${(look.height - box.height) / 2}px`;
      renderer.setPixelRatio(ratio);
      // `false`: the two lengths above are the CSS size, and this call must not
      // overwrite them with the device-pixel one. THE BOX IS COMPARED AGAINST A
      // STRING AND NOT AGAINST `canvas.width`, which is the device-pixel width
      // and therefore a different number on any display that is not 1x.
      renderer.setSize(box.width, box.height, false);
    }

    const eye = look.camera * look.width;
    camera.fov = (2 * Math.atan(box.height / (2 * eye)) * 180) / Math.PI;
    camera.aspect = box.width / box.height;
    camera.position.set(0, 0, eye);
    camera.updateProjectionMatrix();

    // CSS's y points down and three's points up, so both angles cross negated.
    // The order needs no thought: a CSS transform list applies right to left, so
    // the swing happens first, and three's default Euler order composes Rx.Ry.Rz,
    // which is the same thing said the other way round.
    mesh.rotation.set(
      (-look.tilt * look.lift * Math.PI) / 180,
      0,
      (-look.swing * look.lift * Math.PI) / 180,
    );
    mesh.position.set(0, 0, -look.dolly * look.lift * look.width);

    shape.write(
      look.width,
      look.height,
      look.thickness * look.lift * look.width,
      look.radius * look.lift * look.width,
      colour,
    );
    renderer.render(scene, camera);
  }

  // A LOOP AND NOT A SUBSCRIPTION, and it is the cheaper of the two here. The
  // drawing turns on `--eater-map-lift`, on eight Tokens, on the Slab's box and on
  // the page's theme, and a custom property is the one thing on that list nothing
  // will tell you about — no event, no observer. So the frame reads them, and the
  // signature above is what stops a page that is not moving from DRAWING at all.
  //
  // IT RUNS FOR THE LIFE OF THE PAGE, and nothing stops it. A Section is mounted
  // as the reader approaches and is never unmounted, so there is no moment to
  // stop on — and the standing cost is one rect and one computed style per frame,
  // which is affordable precisely because this stage is never the shipped one: it
  // is mounted only when somebody has asked for it. If #182 chooses it, that
  // arithmetic changes and this is the line to revisit.
  function tick(): void {
    requestAnimationFrame(tick);
    draw();
  }
  tick();

  return { name: 'webgl', edge };
};

export default mountWebglStage;
