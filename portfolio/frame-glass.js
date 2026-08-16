/* The browser Frame's titlebar, made of glass.
 *
 * WHAT THIS FILE IS. Four WebGL2 passes — background, two halves of a separable
 * gaussian, and the glass itself — rendered ONCE into a canvas the size of the
 * titlebar. The shaders are the ones design/glass-tuner.html carries, which are
 * iyinchao/liquid-glass-studio's src/shaders/*.glsl with their `#include`s
 * inlined (MIT). The parameters are the ones #66 settled against the design
 * render and exported through the tuner's drawer. Neither is invented here, and
 * neither should be edited here: the tuner is where the material is judged,
 * because it is the only place the result can be compared with the render.
 *
 * ONE RUNG OF A LADDER, AND THE ONE THAT MIGHT NOT ARRIVE. styles.css paints a
 * titlebar without any of this — a flat translucent fill, and a blurred one with
 * two rings where the browser has `backdrop-filter` — and both are in the
 * cascade rather than behind a script, so a reader with no JavaScript gets the
 * best of the two their browser can actually draw. All this file does is put a
 * better one on top when it can, and say which one happened:
 *
 *     bar.dataset.glass = "webgl" | "blur" | "flat"
 *
 * THAT ATTRIBUTE IS READ BACK OFF THE PAGE, NOT PREDICTED. `blur` is not "the
 * browser claims to support backdrop-filter", it is `getComputedStyle` returning
 * something other than `none` for the bar that is actually on screen — so the
 * attribute cannot say a tier engaged that did not. design/tools/render.mjs
 * reports it beside every shot and can force the lower two, which is what
 * #67 means by each tier having been seen rather than assumed.
 *
 * IT RENDERS ONCE, which is the promise #57 makes about this Frame. What sits
 * behind the titlebar is the Frame's own fill and the page's backdrop outside
 * its corners — both constant — so there is nothing to redraw until the box
 * changes size. #66 built three treatments of that backdrop and measured them:
 * the render cannot tell the Frame's fill from the page showing through it,
 * because it is near-black behind its own titlebar either way, and only the
 * recording carrying on up under the chrome is visibly not the render. The
 * recording is also the only one of the three that costs anything — a moving
 * backdrop is four passes a frame, forever, on a page that promises none. So the
 * static one ships. #68 was expected to be where the first half of that stopped
 * being true, and it is not: the marble it added stands the Frame UP rather than
 * sitting behind it, so what is behind the titlebar is still the Frame's own
 * fill and this still renders once. The recording carrying on up under the
 * chrome remains a change to paintScene() and to this paragraph, and the tuner's
 * `panel · recording` chip is where to look at it before making it.
 *
 * IT IS DRAWN TWICE NOW AND RENDERED ONCE. #68's reflection is a clone of the
 * whole Frame lying in the stone, so there is a second titlebar on the page that
 * has to be made of the same glass. It is not a second render: the picture this
 * file produces is blitted into a 2D canvas on every other `.frame-bar` it can
 * find — see paintEchoes at the foot of the file, and portfolio/panel-mirror.js
 * for who makes the copy and when.
 */
(function () {
  "use strict";

  var bar = document.querySelector(".panel-stage > .panel-frame > .frame-bar");
  if (!bar) return;

  /* EVERY OTHER TITLEBAR ON THE PAGE, which today is exactly one: the copy of the
     Frame that panel-mirror.js clones into the marble for the reflection. This
     file does not know what a reflection is and does not need to — the rule is
     that the material is rendered once and every titlebar gets the result, which
     is true of a mirror and would be true of anything else that wanted a second
     window later.
     A CLONE ARRIVES WITH AN EMPTY CANVAS, AND THAT IS THE ONE THING cloneNode
     CANNOT DO. A canvas element clones as a canvas; its pixels do not come with
     it. So the copies are given a 2D context and the finished picture is blitted
     into them below, rather than each running the four passes again — which
     would be a second WebGL2 context held for the life of the page to draw the
     picture that is already sitting in the first one. */
  var echoes = [];
  var allBars = document.querySelectorAll(".frame-bar");
  for (var b = 0; b < allBars.length; b++) {
    if (allBars[b] !== bar) echoes.push(allBars[b]);
  }

  /* ---- the settled material ------------------------------------------------
     #66's export, verbatim, minus the rows that only ever drove the tuner (the
     backdrop chips, the drag spring, the debug step). The five that describe the
     SHAPE are gone too and are computed from the Frame below instead — the tuner
     has to be told what it is drawing and this file can measure it.

     EVERY LENGTH HERE IS A CSS PX AT A FRAME 1200 WIDE, which is what the export
     says and what REFERENCE_W is. The Frame on this page is nine of twelve
     columns and is nothing like 1200 at most window widths, so they are scaled
     by the ratio on the way in — halve the Frame and the bevel, the blur and the
     rims all halve with it, which is the only way a material holds its look
     across sizes. Missing that is how a bevel tuned at 1200 becomes a smear at
     600. */
  var REFERENCE_W = 1200;
  var GLASS = {
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
    tintColor: "#fab2ff",
    tintAlpha: 0.135,
    /* Intensity is at the render's own value, which is none, and the other three
       are inert while it is — carried anyway so this and the tuner's export list
       the same rows. FRAG_BG spreads the shadow symmetrically about the WHOLE
       doubled shape, so raising the intensity gives no shadow under the titlebar
       and a phantom band a strip-height below it — measured in #66 and written
       down on that control. Whoever wants a shadow has to clip it inside FRAG_BG
       first. */
    shadowExpand: 25,
    shadowFactor: 0,
    shadowX: 0,
    shadowY: -10
  };
  /* The superellipse the render's two top corners fit, to within half a pixel of
     rms over 32 sampled columns. The studio's default is 5; this is all but a
     circular arc, and it is the single most surprising number #66 produced. */
  var ROUNDNESS = 2.2;
  /* THE CANVAS HEIGHT #66'S RIMS WERE SETTLED AT, in device px, and the second
     reference this file needs after REFERENCE_W. See the `rim` line in FRAG_MAIN
     for what goes wrong without it.
     It is a measurement and not a round number: the tuner's stage is whatever is
     left of the window beside its control panel, and at 1920x1080 with one
     device pixel per CSS pixel that is 1552x1035. Reading the tuner's own canvas
     back at that size gives a body of (43,37,47), a top rim peaking at 68 and
     both side rims at 87 — which is #92's table to the integer, so 1035 is the
     height those numbers are true at. Upstream's own `1.414 * 1000.0` implies it
     meant 1414, where the normal would be exactly unit length; nothing was ever
     judged there, so the settled height is what is pinned. */
  var REFERENCE_H = 1035;
  var frame = bar.parentNode;

  /* NOT ONE GEOMETRY NUMBER IS REPEATED FROM THE STYLESHEET. The bar's height,
     its width and its corner are read back off the laid-out element, so a glass
     that disagreed with the chrome standing on it by a pixel is not a thing this
     file can produce. It also sidesteps a trap worth naming: --frame-bar is
     `3.4583cqw`, and an UNREGISTERED custom property computes to its own token
     sequence rather than to a length, so `getPropertyValue("--frame-bar")` hands
     back the string "3.4583cqw" and parseFloat turns that into 3.4583 pixels
     without complaining. Used values from getBoundingClientRect and
     borderTopLeftRadius have already been through the container. */
  function metrics() {
    var rect = bar.getBoundingClientRect();
    return {
      /* The bar is inset 0 on both sides of the Frame, so its width is the
         Frame's — which is the width every #66 length is stated against. */
      w: rect.width,
      h: rect.height,
      r: parseFloat(getComputedStyle(bar).borderTopLeftRadius) || 0
    };
  }
  /* Colours are read the same way and for the same reason, and here the custom
     property is a colour token rather than a length, so it does come back
     usable. These two ARE the page behind the titlebar; see the backdrop
     comment below. */
  function cssColor(prop) {
    return getComputedStyle(frame).getPropertyValue(prop).trim();
  }

  /* ---- shader sources ------------------------------------------------------
     Verbatim from design/glass-tuner.html, which took them verbatim from
     upstream. Do not "tidy" these: the odd-looking constants (the 1500.0
     divisor, the pow(...,5.0), the 0.05 offset scale) are what the control
     ranges — and therefore #66's settled values — were chosen around.
     Two passes upstream has are not here. The debug ladder (STEP 0..8) is a
     tuner affordance and nothing on a shipping page can reach it, so FRAG_MAIN
     is upstream's STEP 9 branch alone; and the second metaball shape is gone
     with it, since the subject is one bar. */
  var VERT = [
    "#version 300 es",
    "in vec4 a_position;",
    "out vec2 v_uv;",
    "void main() {",
    "  v_uv = (a_position.xy + 1.0) * 0.5;",
    "  gl_Position = a_position;",
    "}"
  ].join("\n");

  var SDF = [
    "float superellipseCornerSDF(vec2 p, float r, float n) {",
    "  p = abs(p);",
    "  float v = pow(pow(p.x, n) + pow(p.y, n), 1.0 / n);",
    "  return v - r;",
    "}",
    "float roundedRectSDF(vec2 p, vec2 center, float width, float height, float cornerRadius, float n) {",
    "  p -= center;",
    "  float cr = cornerRadius * u_dpr;",
    "  vec2 d = abs(p) - vec2(width * u_dpr, height * u_dpr) * 0.5;",
    "  float dist;",
    "  if (d.x > -cr && d.y > -cr) {",
    "    vec2 cornerCenter = sign(p) * (vec2(width * u_dpr, height * u_dpr) * 0.5 - vec2(cr));",
    "    vec2 cornerP = p - cornerCenter;",
    "    dist = superellipseCornerSDF(cornerP, cr, n);",
    "  } else {",
    "    dist = min(max(d.x, d.y), 0.0) + length(max(d, 0.0));",
    "  }",
    "  return dist;",
    "}",
    "float mainSDF(vec2 p2, vec2 p) {",
    "  vec2 p2n = p2 + p / u_resolution.y;",
    "  return roundedRectSDF(",
    "    p2n,",
    "    vec2(0.0),",
    "    u_shapeWidth / u_resolution.y,",
    "    u_shapeHeight / u_resolution.y,",
    "    u_shapeRadius / u_resolution.y,",
    "    u_shapeRoundness",
    "  );",
    "}"
  ].join("\n");

  var FRAG_BG = [
    "#version 300 es",
    "precision highp float;",
    "in vec2 v_uv;",
    "out vec4 fragColor;",
    "uniform vec2 u_resolution;",
    "uniform float u_dpr;",
    "uniform vec2 u_shapeCentre;",
    "uniform float u_shapeWidth;",
    "uniform float u_shapeHeight;",
    "uniform float u_shapeRadius;",
    "uniform float u_shapeRoundness;",
    "uniform float u_shadowExpand;",
    "uniform float u_shadowFactor;",
    "uniform vec2 u_shadowPosition;",
    "uniform sampler2D u_bgTexture;",
    SDF,
    "void main() {",
    "  vec2 u_resolution1x = u_resolution.xy / u_dpr;",
    "  vec3 bgColor = texture(u_bgTexture, v_uv).rgb;",
    "  vec2 p2 =",
    "    (vec2(0, 0) - u_shapeCentre + vec2(u_shadowPosition.x * u_dpr, u_shadowPosition.y * u_dpr)) /",
    "    u_resolution.y;",
    "  float merged = mainSDF(p2, gl_FragCoord.xy);",
    "  float shadow = exp(-1.0 / u_shadowExpand * abs(merged) * u_resolution1x.y) * 0.6 * u_shadowFactor;",
    "  fragColor = vec4(bgColor - vec3(shadow), 1.0);",
    "}"
  ].join("\n");

  /* Upstream names the two blur passes v/h and then blurs along x in the "v"
     one; the names are back to front, the result is not. Kept as found so this
     file and the tuner still line up with the originals. */
  function blurFrag(axis) {
    return [
      "#version 300 es",
      "precision highp float;",
      "#define MAX_BLUR_RADIUS (200)",
      "in vec2 v_uv;",
      "uniform sampler2D u_prevPassTexture;",
      "uniform vec2 u_resolution;",
      "uniform int u_blurRadius;",
      "uniform float u_blurWeights[MAX_BLUR_RADIUS + 1];",
      "out vec4 fragColor;",
      "void main() {",
      "  vec2 texelSize = 1.0 / u_resolution;",
      "  vec4 color = texture(u_prevPassTexture, v_uv) * u_blurWeights[0];",
      "  for (int i = 1; i <= u_blurRadius; ++i) {",
      "    float w = u_blurWeights[i];",
      "    vec2 offset = vec2(float(i)) * texelSize;",
      "    color += texture(u_prevPassTexture, v_uv + " + axis + ") * w;",
      "    color += texture(u_prevPassTexture, v_uv - " + axis + ") * w;",
      "  }",
      "  fragColor = color;",
      "}"
    ].join("\n");
  }

  var FRAG_MAIN = [
    "#version 300 es",
    "precision highp float;",
    "#define PI (3.14159265359)",
    /* The three indices of refraction the dispersion is taken across: red bends
       2% less than green and blue 2% more, which is what puts colour on the
       bevel. */
    "const float N_R = 1.0 - 0.02;",
    "const float N_G = 1.0;",
    "const float N_B = 1.0 + 0.02;",
    "in vec2 v_uv;",
    "uniform sampler2D u_blurredBg;",
    "uniform sampler2D u_bg;",
    "uniform vec2 u_resolution;",
    "uniform float u_dpr;",
    "uniform vec2 u_shapeCentre;",
    "uniform float u_shapeWidth;",
    "uniform float u_shapeHeight;",
    "uniform float u_shapeRadius;",
    "uniform float u_shapeRoundness;",
    "uniform vec4 u_tint;",
    "uniform float u_refThickness;",
    "uniform float u_refFactor;",
    "uniform float u_refDispersion;",
    "uniform float u_refFresnelRange;",
    "uniform float u_refFresnelFactor;",
    "uniform float u_refFresnelHardness;",
    "uniform float u_glareRange;",
    "uniform float u_glareConvergence;",
    "uniform float u_glareOppositeFactor;",
    "uniform float u_glareFactor;",
    "uniform float u_glareHardness;",
    "uniform float u_glareAngle;",
    "uniform int u_blurEdge;",
    "uniform float u_rimReference;",
    "out vec4 fragColor;",
    SDF,
    "float safeAsin(float x) { return asin(clamp(x, -1.0, 1.0)); }",
    "vec2 getNormal(vec2 p2, vec2 p) {",
    "  vec2 h = vec2(max(abs(dFdx(p.x)), 0.0001), max(abs(dFdy(p.y)), 0.0001));",
    "  vec2 grad =",
    "    vec2(",
    "      mainSDF(p2, p + vec2(h.x, 0.0)) - mainSDF(p2, p - vec2(h.x, 0.0)),",
    "      mainSDF(p2, p + vec2(0.0, h.y)) - mainSDF(p2, p - vec2(0.0, h.y))",
    "    ) /",
    "    (2.0 * h);",
    "  return grad * 1.414213562 * 1000.0;",
    "}",
    /* sRGB to LCh and back. The rim and the glare are added as LIGHTNESS rather
       than as white, which is why they keep the tint's hue instead of washing it
       out — and why this whole block has to come across with the shader. */
    "const vec3 D65_WHITE = vec3(0.95045592705, 1.0, 1.08905775076);",
    "vec3 WHITE = D65_WHITE;",
    "const mat3 RGB_TO_XYZ_M = mat3(",
    "  0.4124, 0.3576, 0.1805,",
    "  0.2126, 0.7152, 0.0722,",
    "  0.0193, 0.1192, 0.9505",
    ");",
    "const mat3 XYZ_TO_RGB_M = mat3(",
    "   3.2406255, -1.537208 , -0.4986286,",
    "  -0.9689307,  1.8757561,  0.0415175,",
    "   0.0557101, -0.2040211,  1.0569959",
    ");",
    "float UNCOMPAND_SRGB(float a) { return a > 0.04045 ? pow((a + 0.055) / 1.055, 2.4) : a / 12.92; }",
    "float COMPAND_RGB(float a) { return a <= 0.0031308 ? 12.92 * a : 1.055 * pow(a, 0.41666666666) - 0.055; }",
    "vec3 RGB_TO_XYZ(vec3 rgb) { return rgb * RGB_TO_XYZ_M; }",
    "vec3 SRGB_TO_RGB(vec3 s) { return vec3(UNCOMPAND_SRGB(s.x), UNCOMPAND_SRGB(s.y), UNCOMPAND_SRGB(s.z)); }",
    "vec3 RGB_TO_SRGB(vec3 c) { return vec3(COMPAND_RGB(c.x), COMPAND_RGB(c.y), COMPAND_RGB(c.z)); }",
    "vec3 SRGB_TO_XYZ(vec3 s) { return RGB_TO_XYZ(SRGB_TO_RGB(s)); }",
    "float XYZ_TO_LAB_F(float x) { return x > 0.00885645167 ? pow(x, 0.333333333) : 7.78703703704 * x + 0.13793103448; }",
    "vec3 XYZ_TO_LAB(vec3 xyz) {",
    "  vec3 s = xyz / WHITE;",
    "  s = vec3(XYZ_TO_LAB_F(s.x), XYZ_TO_LAB_F(s.y), XYZ_TO_LAB_F(s.z));",
    "  return vec3(116.0 * s.y - 16.0, 500.0 * (s.x - s.y), 200.0 * (s.y - s.z));",
    "}",
    "vec3 LAB_TO_LCH(vec3 Lab) {",
    "  return vec3(Lab.x, sqrt(dot(Lab.yz, Lab.yz)), atan(Lab.z, Lab.y) * 57.2957795131);",
    "}",
    "vec3 SRGB_TO_LCH(vec3 srgb) { return LAB_TO_LCH(XYZ_TO_LAB(SRGB_TO_XYZ(srgb))); }",
    "vec3 XYZ_TO_RGB(vec3 xyz) { return xyz * XYZ_TO_RGB_M; }",
    "float LAB_TO_XYZ_F(float x) { return x > 0.206897 ? x * x * x : 0.12841854934 * (x - 0.137931034); }",
    "vec3 LAB_TO_XYZ(vec3 Lab) {",
    "  float w = (Lab.x + 16.0) / 116.0;",
    "  return WHITE * vec3(LAB_TO_XYZ_F(w + Lab.y / 500.0), LAB_TO_XYZ_F(w), LAB_TO_XYZ_F(w - Lab.z / 200.0));",
    "}",
    "vec3 LAB_TO_SRGB(vec3 lab) { return RGB_TO_SRGB(XYZ_TO_RGB(LAB_TO_XYZ(lab))); }",
    "vec3 LCH_TO_LAB(vec3 LCh) {",
    "  return vec3(LCh.x, LCh.y * cos(LCh.z * 0.01745329251), LCh.y * sin(LCh.z * 0.01745329251));",
    "}",
    "vec3 LCH_TO_SRGB(vec3 lch) { return LAB_TO_SRGB(LCH_TO_LAB(lch)); }",
    "float vec2ToAngle(vec2 v) {",
    "  float angle = atan(v.y, v.x);",
    "  if (angle < 0.0) angle += 2.0 * PI;",
    "  return angle;",
    "}",
    "vec4 getTextureDispersion(sampler2D tex1, sampler2D tex2, float mixRate, vec2 offset, float factor) {",
    "  vec4 pixel = vec4(1.0);",
    "  float bgR = texture(tex1, v_uv + offset * (1.0 - (N_R - 1.0) * factor)).r;",
    "  float bgG = texture(tex1, v_uv + offset * (1.0 - (N_G - 1.0) * factor)).g;",
    "  float bgB = texture(tex1, v_uv + offset * (1.0 - (N_B - 1.0) * factor)).b;",
    "  float blurR = texture(tex2, v_uv + offset * (1.0 - (N_R - 1.0) * factor)).r;",
    "  float blurG = texture(tex2, v_uv + offset * (1.0 - (N_G - 1.0) * factor)).g;",
    "  float blurB = texture(tex2, v_uv + offset * (1.0 - (N_B - 1.0) * factor)).b;",
    "  pixel.r = mix(bgR, blurR, mixRate);",
    "  pixel.g = mix(bgG, blurG, mixRate);",
    "  pixel.b = mix(bgB, blurB, mixRate);",
    "  return pixel;",
    "}",
    "void main() {",
    "  vec2 u_resolution1x = u_resolution.xy / u_dpr;",
    "  vec2 p2 = (vec2(0, 0) - u_shapeCentre) / u_resolution.y;",
    "  float merged = mainSDF(p2, gl_FragCoord.xy);",
    "  vec4 outColor;",
    "  if (merged < 0.005) {",
    "    float nmerged = -1.0 * (merged * u_resolution1x.y);",
    /* Snell's law across the bevel band: the incidence angle is taken from how
       far in from the edge this pixel is, refracted through u_refFactor, and the
       tangent of the difference is how far the backdrop sample is dragged. */
    "    float x_R_ratio = 1.0 - nmerged / u_refThickness;",
    "    float thetaI = safeAsin(pow(x_R_ratio, 2.0));",
    "    float thetaT = safeAsin(1.0 / u_refFactor * sin(thetaI));",
    "    float edgeFactor = -1.0 * tan(thetaT - thetaI);",
    "    if (nmerged >= u_refThickness) edgeFactor = 0.0;",
    "    if (edgeFactor <= 0.0) {",
    "      outColor = texture(u_blurredBg, v_uv);",
    "      outColor = mix(outColor, vec4(u_tint.r, u_tint.g, u_tint.b, 1.0), u_tint.a * 0.8);",
    "    } else {",
    "      float edgeH = nmerged / u_refThickness;",
    "      vec2 normal = getNormal(p2, gl_FragCoord.xy);",
    /* THE ONE LINE OF THE GLASS THAT IS NOT UPSTREAM'S, and it is here because
       this is the first canvas the shader has ever been asked to fill that is a
       strip rather than a stage. getNormal returns the SDF's gradient, and the
       SDF is normalised by u_resolution.y — so |normal| is 1414.2/u_resolution.y
       and not 1, and upstream then uses it as the GAIN on the two edge terms
       below. On the tuner's ~1035px stage that gain is 1.366, which is what #66
       measured its rims at; on a titlebar 63px tall it is 22.4, sixteen times
       too much, and mix() with a factor past 1 does not saturate, it
       extrapolates — the rims come out pure white and the glare's LCh lands so
       far out of gamut that the corners go black. That is what a verbatim port
       renders here, and it is why this line exists rather than being tidied
       away. Dividing the gain by the height it was settled at makes it the
       constant it was always meant to be, at any canvas size.
       The refraction offset needs no such correction: it multiplies normal by
       u_resolution.y again further down, so the height cancels and the bend is
       already the same at every size. Only the two mixes are affected. */
    "      float rim = length(normal) * u_resolution.y / u_rimReference;",
    "      vec4 blurredPixel = getTextureDispersion(",
    "        u_bg,",
    "        u_blurredBg,",
    "        u_blurEdge > 0 ? 1.0 : edgeH,",
    "        -normal * edgeFactor * 0.05 * u_dpr * vec2(u_resolution.y / (u_resolution1x.x * u_dpr), 1.0),",
    "        u_refDispersion",
    "      );",
    "      outColor = mix(blurredPixel, vec4(u_tint.r, u_tint.g, u_tint.b, 1.0), u_tint.a * 0.8);",
    "      float fresnelFactor = clamp(",
    "        pow(",
    "          1.0 +",
    "            merged * u_resolution1x.y / 1500.0 * pow(500.0 / u_refFresnelRange, 2.0) +",
    "            u_refFresnelHardness,",
    "          5.0",
    "        ),",
    "        0.0,",
    "        1.0",
    "      );",
    "      vec3 fresnelTintLCH = SRGB_TO_LCH(",
    "        mix(vec3(1.0), vec3(u_tint.r, u_tint.g, u_tint.b), u_tint.a * 0.5)",
    "      );",
    "      fresnelTintLCH.x += 20.0 * fresnelFactor * u_refFresnelFactor;",
    "      fresnelTintLCH.x = clamp(fresnelTintLCH.x, 0.0, 100.0);",
    "      outColor = mix(",
    "        outColor,",
    "        vec4(LCH_TO_SRGB(fresnelTintLCH), 1.0),",
    "        fresnelFactor * u_refFresnelFactor * 0.7 * rim",
    "      );",
    "      float glareGeoFactor = clamp(",
    "        pow(",
    "          1.0 +",
    "            merged * u_resolution1x.y / 1500.0 * pow(500.0 / u_glareRange, 2.0) +",
    "            u_glareHardness,",
    "          5.0",
    "        ),",
    "        0.0,",
    "        1.0",
    "      );",
    /* The shader DOUBLES the angle, which is why #66's 90 lights the two ends
       rather than one side — the tuner's control says so where it is set. */
    "      float glareAngle = (vec2ToAngle(normalize(normal)) - PI / 4.0 + u_glareAngle) * 2.0;",
    "      int glareFarside = 0;",
    "      if (",
    "        glareAngle > PI * (2.0 - 0.5) && glareAngle < PI * (4.0 - 0.5) ||",
    "        glareAngle < PI * (0.0 - 0.5)",
    "      ) {",
    "        glareFarside = 1;",
    "      }",
    "      float glareAngleFactor =",
    "        (0.5 + sin(glareAngle) * 0.5) *",
    "        (glareFarside == 1 ? 1.2 * u_glareOppositeFactor : 1.2) *",
    "        u_glareFactor;",
    "      glareAngleFactor = clamp(pow(glareAngleFactor, 0.1 + u_glareConvergence * 2.0), 0.0, 1.0);",
    "      vec3 glareTintLCH = SRGB_TO_LCH(",
    "        mix(blurredPixel.rgb, vec3(u_tint.r, u_tint.g, u_tint.b), u_tint.a * 0.5)",
    "      );",
    "      glareTintLCH.x += 150.0 * glareAngleFactor * glareGeoFactor;",
    "      glareTintLCH.y += 30.0 * glareAngleFactor * glareGeoFactor;",
    "      glareTintLCH.x = clamp(glareTintLCH.x, 0.0, 120.0);",
    "      outColor = mix(",
    "        outColor,",
    "        vec4(LCH_TO_SRGB(glareTintLCH), 1.0),",
    "        glareAngleFactor * glareGeoFactor * rim",
    "      );",
    "    }",
    "  } else {",
    "    outColor = texture(u_bg, v_uv);",
    "  }",
    "  outColor = mix(outColor, texture(u_bg, v_uv), smoothstep(-0.001, 0.001, merged));",
    "  fragColor = outColor;",
    "}"
  ].join("\n");

  /* ---- the tier ------------------------------------------------------------
     Set from what the page actually resolved, never from what the browser says
     it can do. `blur` is a computed `backdrop-filter` that is not `none`, which
     is true only if the @supports block in styles.css really applied — so an
     override that turns the declaration off (design/tools/render.mjs does
     exactly that, to see the bottom rung) moves the reported tier with it.
     The attribute has to come OFF before the computed style is read: the webgl
     rule sets `backdrop-filter: none` itself, so leaving it on would read the
     rung above's own suppression and call a blur-capable browser flat. */
  function setTier(shaderDrew) {
    var tier;
    if (shaderDrew) {
      tier = "webgl";
    } else {
      bar.removeAttribute("data-glass");
      var cs = getComputedStyle(bar);
      var bf = cs.backdropFilter || cs.webkitBackdropFilter || "none";
      tier = bf && bf !== "none" ? "blur" : "flat";
    }
    bar.dataset.glass = tier;
    /* The copies are told the same thing, because the attribute is what turns
       the two lower rungs OFF — a reflected titlebar left on `blur` under a
       canvas would be drawing a backdrop-filter behind an opaque child, which is
       the per-composite cost the webgl rule exists to remove. It is also the
       honest reading: the reflection is made of whatever the Frame is made of,
       and reporting anything else would make design/tools/render.mjs's probe a
       liar about half the windows on the page. */
    for (var i = 0; i < echoes.length; i++) echoes[i].dataset.glass = tier;
    return tier;
  }

  /* ---- WebGL --------------------------------------------------------------- */
  var canvas = document.createElement("canvas");
  canvas.className = "frame-glass";
  /* `alpha: false` because the canvas covers the whole bar and there is nothing
     underneath it worth compositing — the rungs below are turned off by the
     stylesheet the moment this one lands.
     `preserveDrawingBuffer` IS LOAD-BEARING HERE and is not the usual debugging
     flag. A drawing buffer's contents are undefined after it has been presented,
     and this canvas is drawn once and then never again; without it the titlebar
     is entitled to go blank the next time the compositor wants the memory back.
     Everything that renders per frame can leave it off. Everything that renders
     once cannot. */
  var gl = null;
  try {
    gl = canvas.getContext("webgl2", {
      antialias: false,
      alpha: false,
      preserveDrawingBuffer: true,
      /* The bar is 3.5% of the Frame — a strip a laptop can draw four passes over
         without waking a discrete GPU, and a page that renders once has nothing
         to gain from one. */
      powerPreference: "low-power"
    });
  } catch (e) {
    gl = null;
  }

  if (!gl) { setTier(false); return; }

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  function program(frag) {
    var p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, frag));
    gl.bindAttribLocation(p, 0, "a_position");
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return { p: p, loc: {} };
  }

  var progBg, progV, progH, progMain, floatOK, IFMT, ITYPE;
  try {
    /* RGBA16F targets keep the blur from banding on a dark backdrop — and this
       backdrop is as dark as backdrops get. Renderability is an extension even
       in WebGL2, so fall back to 8-bit rather than fail: banding in the frosting
       is a worse titlebar, not an absent one. */
    floatOK = !!(gl.getExtension("EXT_color_buffer_float") || gl.getExtension("EXT_color_buffer_half_float"));
    IFMT = floatOK ? gl.RGBA16F : gl.RGBA8;
    ITYPE = floatOK ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
    progBg = program(FRAG_BG);
    progV = program(blurFrag("vec2(offset.x, 0.0)"));
    progH = program(blurFrag("vec2(0.0, offset.y)"));
    progMain = program(FRAG_MAIN);
  } catch (e) {
    /* A context that exists and cannot compile is the same to a reader as no
       context at all. */
    setTier(false);
    return;
  }

  function loc(prog, name) {
    if (!(name in prog.loc)) prog.loc[name] = gl.getUniformLocation(prog.p, name);
    return prog.loc[name];
  }
  function u1f(prog, n, v) { gl.uniform1f(loc(prog, n), v); }
  function u1i(prog, n, v) { gl.uniform1i(loc(prog, n), v); }
  function u2f(prog, n, a, b) { gl.uniform2f(loc(prog, n), a, b); }

  var vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  /* One oversized triangle rather than two, which is the ordinary way to cover a
     viewport without a seam down the diagonal. */
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  function makeTarget() {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    var fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex: tex, fbo: fbo, w: 0, h: 0 };
  }

  var tBg = makeTarget(), tV = makeTarget(), tH = makeTarget();

  function sizeTarget(t, w, h) {
    if (t.w === w && t.h === h) return;
    gl.bindTexture(gl.TEXTURE_2D, t.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, IFMT, w, h, 0, gl.RGBA, ITYPE, null);
    t.w = w; t.h = h;
  }

  var sceneTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, sceneTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  /* Upstream's computeGaussianKernelByRadius, padded to the array the shader
     declares so the upload is one call whatever the radius is. */
  var MAXR = 200;
  var weights = new Float32Array(MAXR + 1);
  function buildWeights(radius) {
    weights.fill(0);
    var sigma = radius / 3.0;
    var sum = 0;
    for (var i = 0; i <= radius; i++) {
      var w = Math.exp(-0.5 * (i * i) / (sigma * sigma));
      weights[i] = w;
      sum += i === 0 ? w : w * 2;
    }
    for (var j = 0; j <= radius; j++) weights[j] /= sum;
  }

  /* ---- the backdrop --------------------------------------------------------
     WHAT THE GLASS IS STANDING ON, painted in 2D and handed over as one texture.
     It is the page: the Panel's own background outside the window's corners, and
     the Frame's fill inside them. Nothing else is behind the titlebar — the
     recording starts below it — so this is not a stand-in for the real backdrop,
     it IS the real backdrop, which is what makes a single render honest.

     The rounded rect drawn here has the shader's own top corners and runs off
     the bottom of the canvas, so its two BOTTOM corners never exist. `roundRect`
     with a four-value radius does that in one call; where it is missing the two
     arcs are drawn by hand, because a browser without it would otherwise get a
     square-cornered fill refracted through round-cornered glass — a bright
     wedge in each corner rather than a missing rounding, which is much the more
     obvious wrong. */
  var scene = document.createElement("canvas");
  var sctx = scene.getContext("2d");

  function paintScene(w, h, radius) {
    scene.width = w;
    scene.height = h;
    sctx.fillStyle = cssColor("--panel-bg");
    sctx.fillRect(0, 0, w, h);
    sctx.fillStyle = cssColor("--panel-frame-fill");
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
  }

  /* ---- render --------------------------------------------------------------- */
  var W = 0, H = 0;
  /* What is already on the canvas. RENDERING ONCE IS THE POINT OF THIS FILE, and
     without this it renders twice on every visit: ResizeObserver delivers a
     callback for the element's initial size the moment observe() is called, so
     the four passes run again immediately for the box attempt() has just drawn.
     Nothing about the result changes, which is exactly why it would never have
     been noticed. */
  var drawn = { w: 0, h: 0, ok: false };

  function render() {
    var m = metrics();
    if (!m.w || !m.h) return false;

    /* Capped at 2 for the reason every renderer caps it: the fourth pass is
       per-pixel and a 3x phone would pay 2.25x for a difference nobody can see
       on a strip this thin. The shader is handed the SAME number — the
       refraction offset is scaled by it, so a canvas rendered at one ratio and
       told another bends by the wrong amount. */
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(m.w * dpr));
    var h = Math.max(1, Math.round(m.h * dpr));

    /* Same pixels as last time, so the canvas already holds the right picture.
       Device px and not CSS px, because that is what actually decides whether a
       redraw would differ — a fractional CSS width that rounds to the same
       device size is the same canvas. */
    if (drawn.ok && drawn.w === w && drawn.h === h) return true;

    /* THE EXPORT'S LENGTHS ARE PX AT A FRAME 1200 WIDE. This is the ratio that
       makes them px at the Frame that is actually on screen. */
    var k = m.w / REFERENCE_W;
    var barH = m.h;
    var radius = m.r;

    W = w; H = h;
    canvas.width = W;
    canvas.height = H;
    sizeTarget(tBg, W, H);
    sizeTarget(tV, W, H);
    sizeTarget(tH, W, H);

    paintScene(W, H, radius * dpr);
    gl.bindTexture(gl.TEXTURE_2D, sceneTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, scene);

    /* THE SHAPE IS TWICE THE TITLEBAR AND HALF OF IT IS OFF THE CANVAS, which is
       how a rounded rect grows a straight bottom edge. The SDF draws one rect
       and a rect has four corners; a titlebar has two, at the top, and a cut
       where the content starts. The tuner does this with a scissor pass because
       its canvas is the whole stage. Here the canvas IS the strip, so the cut is
       the canvas's own bottom edge and there is nothing to put back.
       gl_FragCoord counts from the bottom, so a shape of height 2*barH whose
       centre sits on y = 0 has its top edge at exactly barH — the canvas's top —
       and its bottom edge a full strip below the bottom of the canvas. */
    var shapeW = m.w;
    var shapeH = barH * 2;
    var centreX = (m.w / 2) * dpr;
    var centreY = 0;
    /* A LENGTH, NOT THE TUNER'S PERCENTAGE. Upstream's corner control is a share
       of half the shape's short side and App.tsx multiplies it out on the way
       into the uniform, which is why the tuner's 47.2 does not look like a
       radius. Half the short side here IS barH, so that arithmetic resolves to
       the window's own corner and the conversion has nowhere to go wrong. */
    var shapeR = radius;

    function shapeUniforms(prog) {
      u2f(prog, "u_resolution", W, H);
      u1f(prog, "u_dpr", dpr);
      u2f(prog, "u_shapeCentre", centreX, centreY);
      u1f(prog, "u_shapeWidth", shapeW);
      u1f(prog, "u_shapeHeight", shapeH);
      u1f(prog, "u_shapeRadius", shapeR);
      u1f(prog, "u_shapeRoundness", ROUNDNESS);
    }

    gl.bindVertexArray(vao);
    gl.viewport(0, 0, W, H);

    /* pass 1 — the backdrop, with the shape's drop shadow subtracted from it.
       Inert at the render's shadow of 0, and kept because removing it would put
       this file and the tuner's port out of step over a uniform that costs one
       exponential. */
    gl.bindFramebuffer(gl.FRAMEBUFFER, tBg.fbo);
    gl.useProgram(progBg.p);
    shapeUniforms(progBg);
    u1f(progBg, "u_shadowExpand", GLASS.shadowExpand);
    u1f(progBg, "u_shadowFactor", GLASS.shadowFactor / 100);
    /* Negated on the way in, as App.tsx does. */
    u2f(progBg, "u_shadowPosition", -GLASS.shadowX, -GLASS.shadowY);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneTex);
    u1i(progBg, "u_bgTexture", 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    /* passes 2 and 3 — the separable gaussian. Scaled with the Frame like every
       other length, and floored at 1: a radius of 0 is a loop the shader never
       enters, which is a titlebar with no frosting rather than a small one. */
    var radiusPx = Math.max(1, Math.min(MAXR, Math.round(GLASS.blurRadius * k)));
    buildWeights(radiusPx);
    function blurPass(prog, srcTex, dstFbo) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, dstFbo);
      gl.useProgram(prog.p);
      u2f(prog, "u_resolution", W, H);
      u1i(prog, "u_blurRadius", radiusPx);
      gl.uniform1fv(loc(prog, "u_blurWeights[0]"), weights);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, srcTex);
      u1i(prog, "u_prevPassTexture", 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    blurPass(progV, tBg.tex, tV.fbo);
    blurPass(progH, tV.tex, tH.fbo);

    /* pass 4 — the glass, to the canvas. The percentage controls are divided by
       100 here exactly as App.tsx does on the way into the uniform; the three
       that are lengths are multiplied by k instead. */
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(progMain.p);
    shapeUniforms(progMain);
    gl.uniform4f(
      loc(progMain, "u_tint"),
      parseInt(GLASS.tintColor.slice(1, 3), 16) / 255,
      parseInt(GLASS.tintColor.slice(3, 5), 16) / 255,
      parseInt(GLASS.tintColor.slice(5, 7), 16) / 255,
      GLASS.tintAlpha
    );
    u1f(progMain, "u_refThickness", GLASS.refThickness * k);
    u1f(progMain, "u_refFactor", GLASS.refFactor);
    u1f(progMain, "u_refDispersion", GLASS.refDispersion);
    u1f(progMain, "u_refFresnelRange", GLASS.refFresnelRange);
    u1f(progMain, "u_refFresnelHardness", GLASS.refFresnelHardness / 100);
    u1f(progMain, "u_refFresnelFactor", GLASS.refFresnelFactor / 100);
    u1f(progMain, "u_glareRange", GLASS.glareRange);
    u1f(progMain, "u_glareHardness", GLASS.glareHardness / 100);
    u1f(progMain, "u_glareConvergence", GLASS.glareConvergence / 100);
    u1f(progMain, "u_glareOppositeFactor", GLASS.glareOppositeFactor / 100);
    u1f(progMain, "u_glareFactor", GLASS.glareFactor / 100);
    u1f(progMain, "u_glareAngle", GLASS.glareAngle * Math.PI / 180);
    u1i(progMain, "u_blurEdge", GLASS.blurEdge ? 1 : 0);
    u1f(progMain, "u_rimReference", REFERENCE_H);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tH.tex);
    u1i(progMain, "u_blurredBg", 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, tBg.tex);
    u1i(progMain, "u_bg", 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    /* A GL error means some part of the four passes did not happen, and a
       half-drawn titlebar is exactly the "broken chrome" #57's user story 9 is
       about. Better to hand the reader the rung below, which cannot fail. */
    drawn.w = w;
    drawn.h = h;
    drawn.ok = gl.getError() === gl.NO_ERROR;
    return drawn.ok;
  }

  /* Set once the context has gone for good — see the handler at the foot of the
     file. Without it the ResizeObserver goes on calling render() for the rest of
     the session, driving programs and textures that no longer exist, once per
     resize, to reach a conclusion that cannot change. */
  var dead = false;

  /* The finished picture, copied onto the other titlebars. One 2D canvas each,
     the same pixel size as the source, and a single drawImage — so the material
     is identical rather than similar, and the copies cost a blit apiece at the
     moments the real one is rendered and at no other time.
     `getContext` is asked for on every call rather than cached: a canvas's
     context is stable, so this is a lookup, and it is the only way the function
     survives an echo whose canvas was removed by a failed attempt. */
  function paintEchoes(ok) {
    for (var i = 0; i < echoes.length; i++) {
      var into = echoes[i].querySelector(".frame-glass");
      if (!ok) {
        if (into) into.parentNode.removeChild(into);
        continue;
      }
      if (!into) {
        into = document.createElement("canvas");
        into.className = "frame-glass";
        /* First child, for the reason the real one is: the chrome sits ON the
           glass. The clone brought its own chrome with it. */
        echoes[i].insertBefore(into, echoes[i].firstChild);
      }
      if (into.width !== canvas.width || into.height !== canvas.height) {
        into.width = canvas.width;
        into.height = canvas.height;
      }
      var ctx = into.getContext("2d");
      if (!ctx) continue;
      ctx.clearRect(0, 0, into.width, into.height);
      ctx.drawImage(canvas, 0, 0);
    }
  }

  function attempt() {
    if (dead) return false;
    var ok = false;
    try { ok = render(); } catch (e) { ok = false; }
    if (ok) {
      /* First child, so the chrome is drawn over it — the controls sit ON the
         glass, not under it. */
      if (canvas.parentNode !== bar) bar.insertBefore(canvas, bar.firstChild);
      setTier(true);
    } else {
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      setTier(false);
    }
    paintEchoes(ok);
    return ok;
  }

  attempt();

  /* Re-rendered when the box changes and at no other time. The Frame is nine of
     twelve columns of a fluid composition, so this fires on window resize and on
     the 900px reflow — and the canvas has to be repainted at the new size or the
     bevel is a stretched copy of the old one. ResizeObserver rather than a
     `resize` listener because the Frame's width is not the window's. */
  if (window.ResizeObserver) {
    var pending = 0;
    new ResizeObserver(function () {
      /* Coalesced to one frame: a drag across a desktop fires this per pixel,
         and four passes per pixel of drag is the per-frame cost this whole file
         is arranged to avoid. */
      if (pending) return;
      pending = requestAnimationFrame(function () { pending = 0; attempt(); });
    }).observe(bar);
  }

  /* A context can be taken away — a laptop switching graphics adapters, a driver
     reset, a tab backgrounded long enough for the browser to reclaim it — and
     the default is that the canvas goes blank and stays blank, which is the one
     outcome #57's user story 9 is written against.
     IT GOES DOWN THE LADDER AND DOES NOT COME BACK UP, deliberately. Every
     program, texture and buffer above is invalid after a loss, so restoring
     means building all of it a second time — a path that would run on almost no
     visit, could not be exercised from the harness, and whose failure mode is
     the blank titlebar this handler exists to prevent. The rung below is a
     titlebar that cannot fail, and a reader who never sees the change is better
     served by it than by an untested rebuild. `preventDefault` is not called for
     the same reason: without it the browser does not offer a restore, and there
     is nothing here that wants one. */
  canvas.addEventListener("webglcontextlost", function () {
    dead = true;
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    setTier(false);
    /* The copies go down with it. A 2D canvas still holding the last blit would
       leave the reflection showing a titlebar the Frame above it no longer has. */
    paintEchoes(false);
  });
})();
