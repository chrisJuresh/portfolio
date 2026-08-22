/**
 * The Frame's titlebar, made of glass: four WebGL2 passes — a backdrop, two
 * halves of a separable gaussian, and the glass — rendered ONCE into a canvas
 * the size of the titlebar.
 *
 * THE SHADERS AND THEIR NUMBERS ARE NOT THIS FILE'S. The shaders are
 * `iyinchao/liquid-glass-studio`'s with their `#include`s inlined (MIT); the
 * parameters are #66's, settled against the design render. This is the port of
 * that decision and not a second opinion about it.
 *
 * ONE RUNG OF A LADDER, AND THE ONE THAT MIGHT NOT ARRIVE. The component paints
 * a titlebar without any of this, in the cascade rather than behind a script.
 * All this does is put a better one on top when it can, and say which happened —
 * `bar.dataset.glass = 'webgl' | 'blur' | 'flat'`, read back off the page rather
 * than predicted, and the same attribute that shows the canvas.
 *
 * IT RENDERS ONCE PER BACKDROP. The bake carries what it was baked against, so a
 * backdrop the Turn has moved is a stale canvas the same way a resized box is.
 *
 * NOTES.md carries the rest: the three rungs and what each was measured at, what
 * of the live page's `frame-glass.js` is deliberately not ported, and why the
 * canvas is in the markup here rather than created below.
 */

/** #66's export, minus the rows that only drove the tuner and the five that
 *  describe the shape, which are measured off the Frame instead.
 *
 *  EVERY LENGTH HERE IS A CSS PX AT A FRAME 1200 WIDE, so they are scaled by the
 *  ratio on the way in — a bevel tuned at 1200 is a smear at 600 without it.
 *  The tint is not here: the stylesheet needs it too, so it is a Token. */
const GLASS = {
  refThickness: 10,
  refFactor: 1.5,
  refDispersion: 7,
  refFresnelRange: 34,
  refFresnelHardness: 20,
  refFresnelFactor: 11.5,
  glareRange: 34,
  glareHardness: 20,
  glareFactor: 26,
  glareConvergence: 50,
  glareOppositeFactor: 100,
  glareAngle: 90,
  blurRadius: 24,
  blurEdge: true,
  /* Intensity is at the render's own value, which is none, and the other three
     are inert while it is. Carried anyway, because FRAG_BG spreads the shadow
     symmetrically about the WHOLE doubled shape — so raising the intensity gives
     no shadow under the titlebar and a phantom band a strip-height below it.
     Whoever wants a shadow has to clip it inside FRAG_BG first. */
  shadowExpand: 25,
  shadowFactor: 0,
  shadowX: 0,
  shadowY: -10,
};

/** The width every length in GLASS is stated against. */
const REFERENCE_W = 1200;

/** THE CANVAS HEIGHT #66'S RIMS WERE SETTLED AT, in device px, and a
 *  measurement rather than a round number: the tuner's stage was 1552x1035. See
 *  the `rim` line in FRAG_MAIN for what goes wrong without it. */
const REFERENCE_H = 1035;

/** The superellipse the render's two top corners fit, to within half a pixel of
 *  rms over 32 sampled columns. All but a circular arc, and the single most
 *  surprising number #66 produced. */
const ROUNDNESS = 2.2;

/** How finely the Turn is sampled for the re-bake: sixteen renders over a whole
 *  crossing at most, and none once the page is at rest. */
const TURN_STEPS = 16;

/** Upstream's own cap, and the size of the weights array the shader declares. */
const MAX_BLUR = 200;

const VERT = [
  '#version 300 es',
  'in vec4 a_position;',
  'out vec2 v_uv;',
  'void main() {',
  '  v_uv = (a_position.xy + 1.0) * 0.5;',
  '  gl_Position = a_position;',
  '}',
].join('\n');

/* Verbatim from upstream. Do not "tidy" these: the odd-looking constants (the
   1500.0 divisor, the pow(...,5.0), the 0.05 offset scale) are what the control
   ranges — and therefore #66's settled values — were chosen around.
   Two passes upstream has are not here. The debug ladder is a tuner affordance
   and nothing on a shipping page can reach it, so FRAG_MAIN is upstream's last
   branch alone; and the second metaball shape is gone with it, since the subject
   is one bar. */
const SDF = [
  'float superellipseCornerSDF(vec2 p, float r, float n) {',
  '  p = abs(p);',
  '  float v = pow(pow(p.x, n) + pow(p.y, n), 1.0 / n);',
  '  return v - r;',
  '}',
  'float roundedRectSDF(vec2 p, vec2 center, float width, float height, float cornerRadius, float n) {',
  '  p -= center;',
  '  float cr = cornerRadius * u_dpr;',
  '  vec2 d = abs(p) - vec2(width * u_dpr, height * u_dpr) * 0.5;',
  '  float dist;',
  '  if (d.x > -cr && d.y > -cr) {',
  '    vec2 cornerCenter = sign(p) * (vec2(width * u_dpr, height * u_dpr) * 0.5 - vec2(cr));',
  '    vec2 cornerP = p - cornerCenter;',
  '    dist = superellipseCornerSDF(cornerP, cr, n);',
  '  } else {',
  '    dist = min(max(d.x, d.y), 0.0) + length(max(d, 0.0));',
  '  }',
  '  return dist;',
  '}',
  'float mainSDF(vec2 p2, vec2 p) {',
  '  vec2 p2n = p2 + p / u_resolution.y;',
  '  return roundedRectSDF(',
  '    p2n,',
  '    vec2(0.0),',
  '    u_shapeWidth / u_resolution.y,',
  '    u_shapeHeight / u_resolution.y,',
  '    u_shapeRadius / u_resolution.y,',
  '    u_shapeRoundness',
  '  );',
  '}',
].join('\n');

const FRAG_BG = [
  '#version 300 es',
  'precision highp float;',
  'in vec2 v_uv;',
  'out vec4 fragColor;',
  'uniform vec2 u_resolution;',
  'uniform float u_dpr;',
  'uniform vec2 u_shapeCentre;',
  'uniform float u_shapeWidth;',
  'uniform float u_shapeHeight;',
  'uniform float u_shapeRadius;',
  'uniform float u_shapeRoundness;',
  'uniform float u_shadowExpand;',
  'uniform float u_shadowFactor;',
  'uniform vec2 u_shadowPosition;',
  'uniform sampler2D u_bgTexture;',
  SDF,
  'void main() {',
  '  vec2 u_resolution1x = u_resolution.xy / u_dpr;',
  '  vec3 bgColor = texture(u_bgTexture, v_uv).rgb;',
  '  vec2 p2 =',
  '    (vec2(0, 0) - u_shapeCentre + vec2(u_shadowPosition.x * u_dpr, u_shadowPosition.y * u_dpr)) /',
  '    u_resolution.y;',
  '  float merged = mainSDF(p2, gl_FragCoord.xy);',
  '  float shadow = exp(-1.0 / u_shadowExpand * abs(merged) * u_resolution1x.y) * 0.6 * u_shadowFactor;',
  '  fragColor = vec4(bgColor - vec3(shadow), 1.0);',
  '}',
].join('\n');

/** Upstream names the two blur passes v/h and then blurs along x in the "v" one;
 *  the names are back to front, the result is not. Kept as found, so this file
 *  and the originals still line up. */
function blurFrag(axis: string): string {
  return [
    '#version 300 es',
    'precision highp float;',
    `#define MAX_BLUR_RADIUS (${MAX_BLUR})`,
    'in vec2 v_uv;',
    'uniform sampler2D u_prevPassTexture;',
    'uniform vec2 u_resolution;',
    'uniform int u_blurRadius;',
    'uniform float u_blurWeights[MAX_BLUR_RADIUS + 1];',
    'out vec4 fragColor;',
    'void main() {',
    '  vec2 texelSize = 1.0 / u_resolution;',
    '  vec4 color = texture(u_prevPassTexture, v_uv) * u_blurWeights[0];',
    '  for (int i = 1; i <= u_blurRadius; ++i) {',
    '    float w = u_blurWeights[i];',
    '    vec2 offset = vec2(float(i)) * texelSize;',
    `    color += texture(u_prevPassTexture, v_uv + ${axis}) * w;`,
    `    color += texture(u_prevPassTexture, v_uv - ${axis}) * w;`,
    '  }',
    '  fragColor = color;',
    '}',
  ].join('\n');
}

const FRAG_MAIN = [
  '#version 300 es',
  'precision highp float;',
  '#define PI (3.14159265359)',
  /* The three indices of refraction the dispersion is taken across: red bends 2%
     less than green and blue 2% more, which is what puts colour on the bevel. */
  'const float N_R = 1.0 - 0.02;',
  'const float N_G = 1.0;',
  'const float N_B = 1.0 + 0.02;',
  'in vec2 v_uv;',
  'uniform sampler2D u_blurredBg;',
  'uniform sampler2D u_bg;',
  'uniform vec2 u_resolution;',
  'uniform float u_dpr;',
  'uniform vec2 u_shapeCentre;',
  'uniform float u_shapeWidth;',
  'uniform float u_shapeHeight;',
  'uniform float u_shapeRadius;',
  'uniform float u_shapeRoundness;',
  'uniform vec4 u_tint;',
  'uniform float u_refThickness;',
  'uniform float u_refFactor;',
  'uniform float u_refDispersion;',
  'uniform float u_refFresnelRange;',
  'uniform float u_refFresnelFactor;',
  'uniform float u_refFresnelHardness;',
  'uniform float u_glareRange;',
  'uniform float u_glareConvergence;',
  'uniform float u_glareOppositeFactor;',
  'uniform float u_glareFactor;',
  'uniform float u_glareHardness;',
  'uniform float u_glareAngle;',
  'uniform int u_blurEdge;',
  'uniform float u_rimReference;',
  'out vec4 fragColor;',
  SDF,
  'float safeAsin(float x) { return asin(clamp(x, -1.0, 1.0)); }',
  'vec2 getNormal(vec2 p2, vec2 p) {',
  '  vec2 h = vec2(max(abs(dFdx(p.x)), 0.0001), max(abs(dFdy(p.y)), 0.0001));',
  '  vec2 grad =',
  '    vec2(',
  '      mainSDF(p2, p + vec2(h.x, 0.0)) - mainSDF(p2, p - vec2(h.x, 0.0)),',
  '      mainSDF(p2, p + vec2(0.0, h.y)) - mainSDF(p2, p - vec2(0.0, h.y))',
  '    ) /',
  '    (2.0 * h);',
  '  return grad * 1.414213562 * 1000.0;',
  '}',
  /* sRGB to LCh and back. The rim and the glare are added as LIGHTNESS rather
     than as white, which is why they keep the tint's hue instead of washing it
     out — and why this whole block has to come across with the shader. */
  'const vec3 D65_WHITE = vec3(0.95045592705, 1.0, 1.08905775076);',
  'vec3 WHITE = D65_WHITE;',
  'const mat3 RGB_TO_XYZ_M = mat3(',
  '  0.4124, 0.3576, 0.1805,',
  '  0.2126, 0.7152, 0.0722,',
  '  0.0193, 0.1192, 0.9505',
  ');',
  'const mat3 XYZ_TO_RGB_M = mat3(',
  '   3.2406255, -1.537208 , -0.4986286,',
  '  -0.9689307,  1.8757561,  0.0415175,',
  '   0.0557101, -0.2040211,  1.0569959',
  ');',
  'float UNCOMPAND_SRGB(float a) { return a > 0.04045 ? pow((a + 0.055) / 1.055, 2.4) : a / 12.92; }',
  'float COMPAND_RGB(float a) { return a <= 0.0031308 ? 12.92 * a : 1.055 * pow(a, 0.41666666666) - 0.055; }',
  'vec3 RGB_TO_XYZ(vec3 rgb) { return rgb * RGB_TO_XYZ_M; }',
  'vec3 SRGB_TO_RGB(vec3 s) { return vec3(UNCOMPAND_SRGB(s.x), UNCOMPAND_SRGB(s.y), UNCOMPAND_SRGB(s.z)); }',
  'vec3 RGB_TO_SRGB(vec3 c) { return vec3(COMPAND_RGB(c.x), COMPAND_RGB(c.y), COMPAND_RGB(c.z)); }',
  'vec3 SRGB_TO_XYZ(vec3 s) { return RGB_TO_XYZ(SRGB_TO_RGB(s)); }',
  'float XYZ_TO_LAB_F(float x) { return x > 0.00885645167 ? pow(x, 0.333333333) : 7.78703703704 * x + 0.13793103448; }',
  'vec3 XYZ_TO_LAB(vec3 xyz) {',
  '  vec3 s = xyz / WHITE;',
  '  s = vec3(XYZ_TO_LAB_F(s.x), XYZ_TO_LAB_F(s.y), XYZ_TO_LAB_F(s.z));',
  '  return vec3(116.0 * s.y - 16.0, 500.0 * (s.x - s.y), 200.0 * (s.y - s.z));',
  '}',
  'vec3 LAB_TO_LCH(vec3 Lab) {',
  '  return vec3(Lab.x, sqrt(dot(Lab.yz, Lab.yz)), atan(Lab.z, Lab.y) * 57.2957795131);',
  '}',
  'vec3 SRGB_TO_LCH(vec3 srgb) { return LAB_TO_LCH(XYZ_TO_LAB(SRGB_TO_XYZ(srgb))); }',
  'vec3 XYZ_TO_RGB(vec3 xyz) { return xyz * XYZ_TO_RGB_M; }',
  'float LAB_TO_XYZ_F(float x) { return x > 0.206897 ? x * x * x : 0.12841854934 * (x - 0.137931034); }',
  'vec3 LAB_TO_XYZ(vec3 Lab) {',
  '  float w = (Lab.x + 16.0) / 116.0;',
  '  return WHITE * vec3(LAB_TO_XYZ_F(w + Lab.y / 500.0), LAB_TO_XYZ_F(w), LAB_TO_XYZ_F(w - Lab.z / 200.0));',
  '}',
  'vec3 LAB_TO_SRGB(vec3 lab) { return RGB_TO_SRGB(XYZ_TO_RGB(LAB_TO_XYZ(lab))); }',
  'vec3 LCH_TO_LAB(vec3 LCh) {',
  '  return vec3(LCh.x, LCh.y * cos(LCh.z * 0.01745329251), LCh.y * sin(LCh.z * 0.01745329251));',
  '}',
  'vec3 LCH_TO_SRGB(vec3 lch) { return LAB_TO_SRGB(LCH_TO_LAB(lch)); }',
  'float vec2ToAngle(vec2 v) {',
  '  float angle = atan(v.y, v.x);',
  '  if (angle < 0.0) angle += 2.0 * PI;',
  '  return angle;',
  '}',
  'vec4 getTextureDispersion(sampler2D tex1, sampler2D tex2, float mixRate, vec2 offset, float factor) {',
  '  vec4 pixel = vec4(1.0);',
  '  float bgR = texture(tex1, v_uv + offset * (1.0 - (N_R - 1.0) * factor)).r;',
  '  float bgG = texture(tex1, v_uv + offset * (1.0 - (N_G - 1.0) * factor)).g;',
  '  float bgB = texture(tex1, v_uv + offset * (1.0 - (N_B - 1.0) * factor)).b;',
  '  float blurR = texture(tex2, v_uv + offset * (1.0 - (N_R - 1.0) * factor)).r;',
  '  float blurG = texture(tex2, v_uv + offset * (1.0 - (N_G - 1.0) * factor)).g;',
  '  float blurB = texture(tex2, v_uv + offset * (1.0 - (N_B - 1.0) * factor)).b;',
  '  pixel.r = mix(bgR, blurR, mixRate);',
  '  pixel.g = mix(bgG, blurG, mixRate);',
  '  pixel.b = mix(bgB, blurB, mixRate);',
  '  return pixel;',
  '}',
  'void main() {',
  '  vec2 u_resolution1x = u_resolution.xy / u_dpr;',
  '  vec2 p2 = (vec2(0, 0) - u_shapeCentre) / u_resolution.y;',
  '  float merged = mainSDF(p2, gl_FragCoord.xy);',
  '  vec4 outColor;',
  '  if (merged < 0.005) {',
  '    float nmerged = -1.0 * (merged * u_resolution1x.y);',
  /* Snell's law across the bevel band: the incidence angle is taken from how far
     in from the edge this pixel is, refracted through u_refFactor, and the
     tangent of the difference is how far the backdrop sample is dragged. */
  '    float x_R_ratio = 1.0 - nmerged / u_refThickness;',
  '    float thetaI = safeAsin(pow(x_R_ratio, 2.0));',
  '    float thetaT = safeAsin(1.0 / u_refFactor * sin(thetaI));',
  '    float edgeFactor = -1.0 * tan(thetaT - thetaI);',
  '    if (nmerged >= u_refThickness) edgeFactor = 0.0;',
  '    if (edgeFactor <= 0.0) {',
  '      outColor = texture(u_blurredBg, v_uv);',
  '      outColor = mix(outColor, vec4(u_tint.r, u_tint.g, u_tint.b, 1.0), u_tint.a * 0.8);',
  '    } else {',
  '      float edgeH = nmerged / u_refThickness;',
  '      vec2 normal = getNormal(p2, gl_FragCoord.xy);',
  /* THE ONE LINE OF THE GLASS THAT IS NOT UPSTREAM'S, and it is here because
     this is the first canvas the shader has ever been asked to fill that is a
     strip rather than a stage. getNormal returns the SDF's gradient, and the SDF
     is normalised by u_resolution.y — so |normal| is 1414.2/u_resolution.y and
     not 1, and upstream then uses it as the GAIN on the two edge terms below. On
     the tuner's ~1035px stage that gain is 1.366, which is what #66 measured its
     rims at; on a titlebar 63px tall it is 22.4, sixteen times too much, and
     mix() with a factor past 1 does not saturate, it extrapolates — the rims come
     out pure white and the glare's LCh lands so far out of gamut that the corners
     go black. That is what a verbatim port renders here, and it is why this line
     exists rather than being tidied away. Dividing the gain by the height it was
     settled at makes it the constant it was always meant to be, at any canvas
     size.
     The refraction offset needs no such correction: it multiplies normal by
     u_resolution.y again further down, so the height cancels and the bend is
     already the same at every size. Only the two mixes are affected. */
  '      float rim = length(normal) * u_resolution.y / u_rimReference;',
  '      vec4 blurredPixel = getTextureDispersion(',
  '        u_bg,',
  '        u_blurredBg,',
  '        u_blurEdge > 0 ? 1.0 : edgeH,',
  '        -normal * edgeFactor * 0.05 * u_dpr * vec2(u_resolution.y / (u_resolution1x.x * u_dpr), 1.0),',
  '        u_refDispersion',
  '      );',
  '      outColor = mix(blurredPixel, vec4(u_tint.r, u_tint.g, u_tint.b, 1.0), u_tint.a * 0.8);',
  '      float fresnelFactor = clamp(',
  '        pow(',
  '          1.0 +',
  '            merged * u_resolution1x.y / 1500.0 * pow(500.0 / u_refFresnelRange, 2.0) +',
  '            u_refFresnelHardness,',
  '          5.0',
  '        ),',
  '        0.0,',
  '        1.0',
  '      );',
  '      vec3 fresnelTintLCH = SRGB_TO_LCH(',
  '        mix(vec3(1.0), vec3(u_tint.r, u_tint.g, u_tint.b), u_tint.a * 0.5)',
  '      );',
  '      fresnelTintLCH.x += 20.0 * fresnelFactor * u_refFresnelFactor;',
  '      fresnelTintLCH.x = clamp(fresnelTintLCH.x, 0.0, 100.0);',
  '      outColor = mix(',
  '        outColor,',
  '        vec4(LCH_TO_SRGB(fresnelTintLCH), 1.0),',
  '        fresnelFactor * u_refFresnelFactor * 0.7 * rim',
  '      );',
  '      float glareGeoFactor = clamp(',
  '        pow(',
  '          1.0 +',
  '            merged * u_resolution1x.y / 1500.0 * pow(500.0 / u_glareRange, 2.0) +',
  '            u_glareHardness,',
  '          5.0',
  '        ),',
  '        0.0,',
  '        1.0',
  '      );',
  /* The shader DOUBLES the angle, which is why #66's 90 lights the two ends
     rather than one side. */
  '      float glareAngle = (vec2ToAngle(normalize(normal)) - PI / 4.0 + u_glareAngle) * 2.0;',
  '      int glareFarside = 0;',
  '      if (',
  '        glareAngle > PI * (2.0 - 0.5) && glareAngle < PI * (4.0 - 0.5) ||',
  '        glareAngle < PI * (0.0 - 0.5)',
  '      ) {',
  '        glareFarside = 1;',
  '      }',
  '      float glareAngleFactor =',
  '        (0.5 + sin(glareAngle) * 0.5) *',
  '        (glareFarside == 1 ? 1.2 * u_glareOppositeFactor : 1.2) *',
  '        u_glareFactor;',
  '      glareAngleFactor = clamp(pow(glareAngleFactor, 0.1 + u_glareConvergence * 2.0), 0.0, 1.0);',
  '      vec3 glareTintLCH = SRGB_TO_LCH(',
  '        mix(blurredPixel.rgb, vec3(u_tint.r, u_tint.g, u_tint.b), u_tint.a * 0.5)',
  '      );',
  '      glareTintLCH.x += 150.0 * glareAngleFactor * glareGeoFactor;',
  '      glareTintLCH.y += 30.0 * glareAngleFactor * glareGeoFactor;',
  '      glareTintLCH.x = clamp(glareTintLCH.x, 0.0, 120.0);',
  '      outColor = mix(',
  '        outColor,',
  '        vec4(LCH_TO_SRGB(glareTintLCH), 1.0),',
  '        glareAngleFactor * glareGeoFactor * rim',
  '      );',
  '    }',
  '  } else {',
  '    outColor = texture(u_bg, v_uv);',
  '  }',
  '  outColor = mix(outColor, texture(u_bg, v_uv), smoothstep(-0.001, 0.001, merged));',
  '  fragColor = outColor;',
  '}',
].join('\n');

interface Program {
  program: WebGLProgram;
  locations: Map<string, WebGLUniformLocation | null>;
}

interface Target {
  texture: WebGLTexture;
  buffer: WebGLFramebuffer;
  w: number;
  h: number;
}

/**
 * Put the glass on the Frame's titlebar, and on every other titlebar the page
 * turns out to hold.
 *
 * Everything it needs is measured off the laid-out elements rather than restated
 * from the stylesheet — see `metrics`. Nothing here is required for the Frame to
 * render: a browser that cannot run any of it gets the rung the cascade gives it,
 * and this function returning early is the same outcome as it never being called.
 */
export function mountGlass(): void {
  const bar = document.querySelector<HTMLElement>(
    '.projects-panel__stage > .projects-panel__frame > .projects-panel__bar',
  );
  const frame = bar?.parentElement ?? null;
  const canvas = bar?.querySelector<HTMLCanvasElement>('.projects-panel__glass') ?? null;
  if (!bar || !frame || !canvas) return;

  /* EVERY OTHER TITLEBAR ON THE PAGE, which today is none — #140's reflection
     is the first. The rule is that the material is rendered once and every
     titlebar gets the result: a canvas element clones as a canvas but its pixels
     do not come with it, so the copies are blitted rather than each holding a
     second WebGL2 context for the life of the page. */
  const echoes = (): HTMLElement[] =>
    [...document.querySelectorAll<HTMLElement>('.projects-panel__bar')].filter(
      (other) => other !== bar,
    );

  /**
   * NOT ONE GEOMETRY NUMBER IS REPEATED FROM THE STYLESHEET, so a glass that
   * disagreed with the chrome standing on it by a pixel is not a thing this file
   * can produce. And read as USED values: the chrome's lengths are container
   * units, and an unregistered custom property hands back the string `3.4583cqw`,
   * which parseFloat turns into 3.4583 pixels without complaining.
   */
  const metrics = (): { w: number; h: number; r: number } => {
    const rect = bar.getBoundingClientRect();
    return {
      // The bar is inset 0 on both sides of the Frame, so its width is the
      // Frame's — which is the width every length in GLASS is stated against.
      w: rect.width,
      h: rect.height,
      r: parseFloat(getComputedStyle(bar).borderTopLeftRadius) || 0,
    };
  };

  /** A custom property off the Frame, as the token sequence it computes to.
   *  These are the page behind the titlebar; see `paintScene`. */
  const token = (property: string): string =>
    getComputedStyle(frame).getPropertyValue(property).trim();

  /* ---- the tier ----------------------------------------------------------
     From what the page resolved, never from what the browser says it can do. The
     attribute has to come OFF before the computed style is read: the webgl rule
     sets `backdrop-filter: none` itself, so leaving it on would read the rung
     above's own suppression and call a blur-capable browser flat. */
  const setTier = (shaderDrew: boolean): void => {
    let tier = 'webgl';
    if (!shaderDrew) {
      bar.removeAttribute('data-glass');
      const resolved = getComputedStyle(bar);
      const filter =
        resolved.backdropFilter || resolved.getPropertyValue('-webkit-backdrop-filter') || 'none';
      tier = filter && filter !== 'none' ? 'blur' : 'flat';
    }
    bar.dataset.glass = tier;
    /* The copies are told the same thing: the attribute is what turns the two
       lower rungs off, and a reflection is made of whatever the Frame is. */
    for (const echo of echoes()) echo.dataset.glass = tier;
  };

  /* `preserveDrawingBuffer` IS LOAD-BEARING and is not the usual debugging flag:
     a drawing buffer's contents are undefined once presented, and this canvas is
     drawn once and never again. Everything that renders per frame can leave it
     off; everything that renders once cannot. */
  let gl: WebGL2RenderingContext | null = null;
  try {
    gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      preserveDrawingBuffer: true,
      // The bar is a thin strip of the Frame — something a laptop can draw four
      // passes over without waking a discrete GPU, and a page that renders once
      // has nothing to gain from one.
      powerPreference: 'low-power',
    });
  } catch {
    gl = null;
  }
  if (!gl) {
    setTier(false);
    return;
  }
  const glc = gl;

  const compile = (type: number, source: string): WebGLShader => {
    const shader = glc.createShader(type);
    if (!shader) throw new Error('glass: no shader');
    glc.shaderSource(shader, source);
    glc.compileShader(shader);
    if (!glc.getShaderParameter(shader, glc.COMPILE_STATUS)) {
      throw new Error(glc.getShaderInfoLog(shader) ?? 'glass: the shader would not compile');
    }
    return shader;
  };

  const build = (fragment: string): Program => {
    const program = glc.createProgram();
    if (!program) throw new Error('glass: no program');
    glc.attachShader(program, compile(glc.VERTEX_SHADER, VERT));
    glc.attachShader(program, compile(glc.FRAGMENT_SHADER, fragment));
    glc.bindAttribLocation(program, 0, 'a_position');
    glc.linkProgram(program);
    if (!glc.getProgramParameter(program, glc.LINK_STATUS)) {
      throw new Error(glc.getProgramInfoLog(program) ?? 'glass: the program would not link');
    }
    return { program, locations: new Map() };
  };

  const at = (prog: Program, name: string): WebGLUniformLocation | null => {
    if (!prog.locations.has(name)) {
      prog.locations.set(name, glc.getUniformLocation(prog.program, name));
    }
    return prog.locations.get(name) ?? null;
  };
  const u1f = (prog: Program, name: string, value: number): void =>
    glc.uniform1f(at(prog, name), value);
  const u1i = (prog: Program, name: string, value: number): void =>
    glc.uniform1i(at(prog, name), value);
  const u2f = (prog: Program, name: string, a: number, b: number): void =>
    glc.uniform2f(at(prog, name), a, b);

  const makeTarget = (): Target => {
    const texture = glc.createTexture();
    const buffer = glc.createFramebuffer();
    if (!texture || !buffer) throw new Error('glass: no render target');
    glc.bindTexture(glc.TEXTURE_2D, texture);
    glc.texParameteri(glc.TEXTURE_2D, glc.TEXTURE_MIN_FILTER, glc.LINEAR);
    glc.texParameteri(glc.TEXTURE_2D, glc.TEXTURE_MAG_FILTER, glc.LINEAR);
    glc.texParameteri(glc.TEXTURE_2D, glc.TEXTURE_WRAP_S, glc.CLAMP_TO_EDGE);
    glc.texParameteri(glc.TEXTURE_2D, glc.TEXTURE_WRAP_T, glc.CLAMP_TO_EDGE);
    glc.bindFramebuffer(glc.FRAMEBUFFER, buffer);
    glc.framebufferTexture2D(glc.FRAMEBUFFER, glc.COLOR_ATTACHMENT0, glc.TEXTURE_2D, texture, 0);
    return { texture, buffer, w: 0, h: 0 };
  };

  /** Everything the four passes need, or nothing. Built in one place and handed
   *  back whole, so a failure anywhere in it is one branch rather than five
   *  variables that may or may not have been assigned. */
  const assemble = (): {
    programs: { bg: Program; blurV: Program; blurH: Program; main: Program };
    targets: { bg: Target; v: Target; h: Target };
    sceneTexture: WebGLTexture;
    internalFormat: number;
    internalType: number;
  } | null => {
    try {
      /* RGBA16F targets keep the blur from banding on a dark backdrop — and this
         backdrop is as dark as backdrops get. Renderability is an extension even
         in WebGL2, so fall back to 8-bit rather than fail: banding in the
         frosting is a worse titlebar, not an absent one. */
      const float =
        glc.getExtension('EXT_color_buffer_float') ??
        glc.getExtension('EXT_color_buffer_half_float');
      const sceneTexture = glc.createTexture();
      if (!sceneTexture) throw new Error('glass: no scene texture');
      return {
        programs: {
          bg: build(FRAG_BG),
          blurV: build(blurFrag('vec2(offset.x, 0.0)')),
          blurH: build(blurFrag('vec2(0.0, offset.y)')),
          main: build(FRAG_MAIN),
        },
        targets: { bg: makeTarget(), v: makeTarget(), h: makeTarget() },
        sceneTexture,
        internalFormat: float ? glc.RGBA16F : glc.RGBA8,
        internalType: float ? glc.HALF_FLOAT : glc.UNSIGNED_BYTE,
      };
    } catch {
      return null;
    }
  };

  const kit = assemble();
  if (!kit) {
    // A context that exists and cannot compile is the same to a reader as no
    // context at all.
    setTier(false);
    return;
  }
  const { programs, targets, sceneTexture, internalFormat, internalType } = kit;

  const vao = glc.createVertexArray();
  glc.bindVertexArray(vao);
  const buffer = glc.createBuffer();
  glc.bindBuffer(glc.ARRAY_BUFFER, buffer);
  // One oversized triangle rather than two, which is the ordinary way to cover a
  // viewport without a seam down the diagonal.
  glc.bufferData(glc.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), glc.STATIC_DRAW);
  glc.enableVertexAttribArray(0);
  glc.vertexAttribPointer(0, 2, glc.FLOAT, false, 0, 0);

  glc.bindTexture(glc.TEXTURE_2D, sceneTexture);
  glc.texParameteri(glc.TEXTURE_2D, glc.TEXTURE_MIN_FILTER, glc.LINEAR);
  glc.texParameteri(glc.TEXTURE_2D, glc.TEXTURE_MAG_FILTER, glc.LINEAR);
  glc.texParameteri(glc.TEXTURE_2D, glc.TEXTURE_WRAP_S, glc.CLAMP_TO_EDGE);
  glc.texParameteri(glc.TEXTURE_2D, glc.TEXTURE_WRAP_T, glc.CLAMP_TO_EDGE);
  glc.pixelStorei(glc.UNPACK_FLIP_Y_WEBGL, true);

  const sizeTarget = (target: Target, w: number, h: number): void => {
    if (target.w === w && target.h === h) return;
    glc.bindTexture(glc.TEXTURE_2D, target.texture);
    glc.texImage2D(glc.TEXTURE_2D, 0, internalFormat, w, h, 0, glc.RGBA, internalType, null);
    target.w = w;
    target.h = h;
  };

  /** Upstream's own gaussian kernel, padded to the array the shader declares so
   *  the upload is one call whatever the radius is. */
  const weights = new Float32Array(MAX_BLUR + 1);
  const buildWeights = (radius: number): void => {
    weights.fill(0);
    const sigma = radius / 3;
    let sum = 0;
    for (let i = 0; i <= radius; i += 1) {
      const w = Math.exp((-0.5 * (i * i)) / (sigma * sigma));
      weights[i] = w;
      sum += i === 0 ? w : w * 2;
    }
    for (let i = 0; i <= radius; i += 1) weights[i] = (weights[i] ?? 0) / sum;
  };

  /* ---- the backdrop ------------------------------------------------------
     WHAT THE GLASS IS STANDING ON, painted in 2D and handed over as one texture:
     the Panel's ground outside the window's corners and the Frame's fill inside
     them. Nothing else is behind the titlebar, so this IS the real backdrop
     rather than a stand-in for it, which is what makes a single render honest.
     The rect runs off the bottom of the canvas, so its two bottom corners never
     exist. The hand-drawn arcs are for a browser with no `roundRect`: without
     them a square-cornered fill refracted through round-cornered glass is a
     bright wedge in each corner, which is the more obvious wrong. */
  const scene = document.createElement('canvas');
  const sctx = scene.getContext('2d');
  if (!sctx) {
    setTier(false);
    return;
  }

  /** A colour Token resolved to `#rrggbb`, by asking the 2D context to parse it
   *  rather than by parsing hex here — so the tint may be authored in any form
   *  CSS accepts and this still reads the colour the page is drawing. */
  const parseColour = (value: string): [number, number, number] => {
    sctx.fillStyle = '#000000';
    sctx.fillStyle = value;
    const hex = String(sctx.fillStyle);
    const found = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (!found) return [0, 0, 0];
    return [
      parseInt(found[1] ?? '0', 16) / 255,
      parseInt(found[2] ?? '0', 16) / 255,
      parseInt(found[3] ?? '0', 16) / 255,
    ];
  };

  const paintScene = (w: number, h: number, radius: number): void => {
    scene.width = w;
    scene.height = h;
    sctx.fillStyle = token('--projects-panel-bg');
    sctx.fillRect(0, 0, w, h);
    sctx.fillStyle = token('--projects-panel-frame-fill');
    sctx.beginPath();
    if (sctx.roundRect) {
      sctx.roundRect(0, 0, w, h * 2, [radius, radius, 0, 0]);
    } else {
      sctx.moveTo(0, h * 2);
      sctx.lineTo(0, radius);
      sctx.arcTo(0, 0, radius, 0, radius);
      sctx.lineTo(w - radius, 0);
      sctx.arcTo(w, 0, w, radius, radius);
      sctx.lineTo(w, h * 2);
      sctx.closePath();
    }
    sctx.fill();
  };

  /* What is already on the canvas. RENDERING ONCE IS THE POINT OF THIS FILE,
     and without this it renders twice on every visit: ResizeObserver delivers a
     callback for the initial size the moment observe() is called. `backdrop` is
     the third term and is a correctness fix rather than an optimisation. */
  const drawn = { w: 0, h: 0, ok: false, backdrop: '' };

  /** The identity of the backdrop, as a string: the Turn quantised, and both
   *  colours paintScene reads. Two property reads rather than a paint — and
   *  quantised because the Turn writes a new value on every scroll tick. */
  const backdropKey = (): string => {
    const turn =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--turn')) || 0;
    return [
      Math.round(turn * TURN_STEPS),
      token('--projects-panel-bg'),
      token('--projects-panel-frame-fill'),
    ].join('|');
  };

  const render = (): boolean => {
    const m = metrics();
    if (!m.w || !m.h) return false;

    /* Capped at 2 for the reason every renderer caps it: the fourth pass is
       per-pixel and a 3x phone would pay 2.25x for a difference nobody can see on
       a strip this thin. The shader is handed the SAME number — the refraction
       offset is scaled by it, so a canvas rendered at one ratio and told another
       bends by the wrong amount. */
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(m.w * dpr));
    const h = Math.max(1, Math.round(m.h * dpr));

    /* Same pixels AND the same backdrop as last time, so the canvas already holds
       the right picture. Device px and not CSS px, because that is what actually
       decides whether a redraw would differ. */
    const backdrop = backdropKey();
    if (drawn.ok && drawn.w === w && drawn.h === h && drawn.backdrop === backdrop) return true;

    /* THE EXPORT'S LENGTHS ARE PX AT A FRAME 1200 WIDE. This is the ratio that
       makes them px at the Frame that is actually on screen. */
    const k = m.w / REFERENCE_W;

    canvas.width = w;
    canvas.height = h;
    sizeTarget(targets.bg, w, h);
    sizeTarget(targets.v, w, h);
    sizeTarget(targets.h, w, h);

    paintScene(w, h, m.r * dpr);
    glc.bindTexture(glc.TEXTURE_2D, sceneTexture);
    glc.texImage2D(glc.TEXTURE_2D, 0, glc.RGBA, glc.RGBA, glc.UNSIGNED_BYTE, scene);

    /* THE SHAPE IS TWICE THE TITLEBAR AND HALF OF IT IS OFF THE CANVAS, which is
       how a rounded rect grows a straight bottom edge: the SDF's rect has four
       corners and a titlebar has two. gl_FragCoord counts from the bottom, so a
       shape of height 2h centred on y = 0 has its top edge at exactly h. */
    const shapeW = m.w;
    const shapeH = m.h * 2;
    const centreX = (m.w / 2) * dpr;
    const centreY = 0;
    /* A LENGTH, NOT UPSTREAM'S SHARE OF HALF THE SHORT SIDE — half the short side
       here IS the bar's height, so the two resolve to the same thing. */
    const shapeR = m.r;

    const shape = (prog: Program): void => {
      u2f(prog, 'u_resolution', w, h);
      u1f(prog, 'u_dpr', dpr);
      u2f(prog, 'u_shapeCentre', centreX, centreY);
      u1f(prog, 'u_shapeWidth', shapeW);
      u1f(prog, 'u_shapeHeight', shapeH);
      u1f(prog, 'u_shapeRadius', shapeR);
      u1f(prog, 'u_shapeRoundness', ROUNDNESS);
    };

    glc.bindVertexArray(vao);
    glc.viewport(0, 0, w, h);

    /* pass 1 — the backdrop, with the shape's drop shadow subtracted from it.
       Inert at the render's shadow of 0, and kept because removing it would put
       this file out of step with the export over a uniform that costs one
       exponential. */
    glc.bindFramebuffer(glc.FRAMEBUFFER, targets.bg.buffer);
    glc.useProgram(programs.bg.program);
    shape(programs.bg);
    u1f(programs.bg, 'u_shadowExpand', GLASS.shadowExpand);
    u1f(programs.bg, 'u_shadowFactor', GLASS.shadowFactor / 100);
    // Negated on the way in, as the export's own host does.
    u2f(programs.bg, 'u_shadowPosition', -GLASS.shadowX, -GLASS.shadowY);
    glc.activeTexture(glc.TEXTURE0);
    glc.bindTexture(glc.TEXTURE_2D, sceneTexture);
    u1i(programs.bg, 'u_bgTexture', 0);
    glc.drawArrays(glc.TRIANGLES, 0, 3);

    /* passes 2 and 3 — the separable gaussian. Scaled with the Frame like every
       other length, and floored at 1: a radius of 0 is a loop the shader never
       enters, which is a titlebar with no frosting rather than a small one. */
    const radius = Math.max(1, Math.min(MAX_BLUR, Math.round(GLASS.blurRadius * k)));
    buildWeights(radius);
    const blurPass = (prog: Program, from: WebGLTexture, into: WebGLFramebuffer): void => {
      glc.bindFramebuffer(glc.FRAMEBUFFER, into);
      glc.useProgram(prog.program);
      u2f(prog, 'u_resolution', w, h);
      u1i(prog, 'u_blurRadius', radius);
      glc.uniform1fv(at(prog, 'u_blurWeights[0]'), weights);
      glc.activeTexture(glc.TEXTURE0);
      glc.bindTexture(glc.TEXTURE_2D, from);
      u1i(prog, 'u_prevPassTexture', 0);
      glc.drawArrays(glc.TRIANGLES, 0, 3);
    };
    blurPass(programs.blurV, targets.bg.texture, targets.v.buffer);
    blurPass(programs.blurH, targets.v.texture, targets.h.buffer);

    /* pass 4 — the glass, to the canvas. The percentage controls are divided by
       100 here exactly as the export's host does on the way into the uniform; the
       three that are lengths are multiplied by k instead. */
    glc.bindFramebuffer(glc.FRAMEBUFFER, null);
    glc.useProgram(programs.main.program);
    shape(programs.main);
    const [r, g, b] = parseColour(token('--projects-panel-frame-tint'));
    const alpha = parseFloat(token('--projects-panel-frame-tint-alpha')) || 0;
    glc.uniform4f(at(programs.main, 'u_tint'), r, g, b, alpha);
    u1f(programs.main, 'u_refThickness', GLASS.refThickness * k);
    u1f(programs.main, 'u_refFactor', GLASS.refFactor);
    u1f(programs.main, 'u_refDispersion', GLASS.refDispersion);
    u1f(programs.main, 'u_refFresnelRange', GLASS.refFresnelRange);
    u1f(programs.main, 'u_refFresnelHardness', GLASS.refFresnelHardness / 100);
    u1f(programs.main, 'u_refFresnelFactor', GLASS.refFresnelFactor / 100);
    u1f(programs.main, 'u_glareRange', GLASS.glareRange);
    u1f(programs.main, 'u_glareHardness', GLASS.glareHardness / 100);
    u1f(programs.main, 'u_glareConvergence', GLASS.glareConvergence / 100);
    u1f(programs.main, 'u_glareOppositeFactor', GLASS.glareOppositeFactor / 100);
    u1f(programs.main, 'u_glareFactor', GLASS.glareFactor / 100);
    u1f(programs.main, 'u_glareAngle', (GLASS.glareAngle * Math.PI) / 180);
    u1i(programs.main, 'u_blurEdge', GLASS.blurEdge ? 1 : 0);
    u1f(programs.main, 'u_rimReference', REFERENCE_H);
    glc.activeTexture(glc.TEXTURE0);
    glc.bindTexture(glc.TEXTURE_2D, targets.h.texture);
    u1i(programs.main, 'u_blurredBg', 0);
    glc.activeTexture(glc.TEXTURE1);
    glc.bindTexture(glc.TEXTURE_2D, targets.bg.texture);
    u1i(programs.main, 'u_bg', 1);
    glc.drawArrays(glc.TRIANGLES, 0, 3);

    /* A GL error means some part of the four passes did not happen, and a
       half-drawn titlebar is exactly the broken chrome the ladder exists to
       prevent. Better to hand the reader the rung below, which cannot fail. */
    drawn.w = w;
    drawn.h = h;
    drawn.backdrop = backdrop;
    drawn.ok = glc.getError() === glc.NO_ERROR;
    return drawn.ok;
  };

  /* The finished picture, copied onto the other titlebars: one drawImage each,
     at the moments the real one is rendered and at no other time. */
  const paintEchoes = (ok: boolean): void => {
    for (const echo of echoes()) {
      const into = echo.querySelector<HTMLCanvasElement>('.projects-panel__glass');
      if (!into) continue;
      const ctx = into.getContext('2d');
      if (!ctx) continue;
      if (into.width !== canvas.width || into.height !== canvas.height) {
        into.width = canvas.width;
        into.height = canvas.height;
      }
      ctx.clearRect(0, 0, into.width, into.height);
      // A copy still holding the last blit would leave the reflection showing a
      // titlebar the Frame above it no longer has.
      if (ok) ctx.drawImage(canvas, 0, 0);
    }
  };

  /* Set once the context has gone for good. Without it the observers go on
     driving programs that no longer exist, to reach a conclusion that cannot
     change. */
  let dead = false;

  const attempt = (): void => {
    if (dead) return;
    let ok = false;
    try {
      ok = render();
    } catch {
      ok = false;
    }
    setTier(ok);
    paintEchoes(ok);
  };

  attempt();

  /* Re-rendered when the box changes and at no other time, or the bevel is a
     stretched copy of the old one. ResizeObserver and not a `resize` listener,
     because the Frame's width is not the window's. */
  let sizePending = 0;
  new ResizeObserver(() => {
    // Coalesced to one frame: a drag across a desktop fires this per pixel, and
    // four passes per pixel of drag is the per-frame cost this whole file is
    // arranged to avoid.
    if (sizePending) return;
    sizePending = requestAnimationFrame(() => {
      sizePending = 0;
      attempt();
    });
  }).observe(bar);

  /* Re-baked when the backdrop crosses. THE ROOT'S ATTRIBUTES AND NOT A SCROLL
     LISTENER: `--turn` is not a scroll position, it is what the Kernel's Turn
     writes from one — inline, on the root, already coalesced to a frame — so the
     attribute changing is the signal itself and at exactly the right rate.
     `data-theme` because the Frame's NEAR end is the page's own paper. The guard
     in render() turns a spurious callback into two property reads. */
  let backdropPending = 0;
  new MutationObserver(() => {
    if (backdropPending) return;
    backdropPending = requestAnimationFrame(() => {
      backdropPending = 0;
      attempt();
    });
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['style', 'data-theme'],
  });

  /* A context can be taken away — a driver reset, a switched adapter, a tab
     backgrounded long enough to reclaim — and the default is a canvas that goes
     blank and stays blank.
     IT GOES DOWN THE LADDER AND DOES NOT COME BACK UP, deliberately: rebuilding
     every program and texture is a path that would run on almost no visit, could
     not be exercised from the harness, and whose failure mode is the blank strip
     this handler exists to prevent. `preventDefault` is not called for the same
     reason — without it the browser offers no restore, and nothing here wants
     one. */
  canvas.addEventListener('webglcontextlost', () => {
    dead = true;
    drawn.ok = false;
    setTier(false);
    paintEchoes(false);
  });
}
