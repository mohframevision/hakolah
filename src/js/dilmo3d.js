/* دلمو ثلاثي الأبعاد: رسم فقط، بـWebGL بلا أي مكتبة، ويتحمّل عند الضغط على زر البوابة فقط.
   المنطق كله (الفيزياء، المزاج، الكلام، اللمس) يبقى في dilmo.js، وهذا الملف يستلم لقطة الحالة كل إطار ويرسمها،
   ويعيد لـdilmo.js ثلاث دوال: scr (نقطة في العالم → مكانها على الشاشة) وunscr (العكس، للسحب) وground (مؤشر → نقطة على الأرض).
   الإحداثيات نفس إحداثيات dilmo.js: بكسل، x يميناً، y للأسفل، z العمق (0 الخلف، DZ الأمام). الساحة محاطة بسياج.
   الشكل (بحث 2026-11-02): إضاءة ملفوفة (half-Lambert) مع إضاءة سماء/أرض، ضباب مسافة على كل شيء، سماء تتبع اتجاه النظر
   مع قرص شمس وهالة، عشب مقصوص، رصيف حجري، سياج بأوراق، مبانٍ بنوافذ تضيء ليلاً، نخيل بسعف منحنٍ، أعمدة إنارة، وظلال
   تمتد بعيداً عن الضوء. ثم تظليل نهائي خفيف (vignette + dither) بلا تمريرة ثانية. */
(function () {
  var VS = [
    "attribute vec3 aPos; attribute vec3 aNrm; attribute vec2 aUv; attribute vec3 aLoc, aCol, aSize; attribute vec2 aSeed;",
    "uniform mediump float uBk; uniform float uTv;",
    "varying vec3 vCol, vSize; varying vec2 vSeed;",
    "uniform mat4 uP, uM; uniform mat3 uN; uniform float uR, uPt; uniform vec4 uRim[24]; uniform mediump int uMode;",
    "varying vec3 vN, vW, vL; varying vec2 vUv;",
    // the 2D rim (48 points of x,y offsets, in px) packed two per vec4
    "vec2 rimAt(int i) { i = i - (i / 48) * 48; vec4 v = uRim[i / 2]; return (i - (i / 2) * 2) == 0 ? v.xy : v.zw; }",
    "void main() {",
    "  vec3 p = aPos; vUv = aUv; vL = uBk > 0.5 ? aLoc : aPos; vCol = aCol; vSize = aSize; vSeed = aSeed;",
    // baked fronds sway in the vertex shader: the tip moves most (t = how far along the leaf)
    "  if (uBk > 0.5 && uMode == 13) p += vec3(sin(uTv * 1.1 + aSeed.x), 0.0, cos(uTv * 0.9 + aSeed.x)) * aLoc.x * aLoc.x * 5.0;",
    "  if (uMode == 1) {",  // soft body: push the sphere out along the 2D rim, fully at the silhouette, not at all at the poles
    "    float a = atan(p.y, p.x); if (a < 0.0) a += 6.2831853;",
    "    float fi = a / 6.2831853 * 48.0; int i0 = int(floor(fi)); float f = fract(fi);",
    "    p.xy += mix(rimAt(i0), rimAt(i0 + 1), f) / uR * length(p.xy);",
    "  }",
    "  vec4 w = uM * vec4(p, 1.0); vW = w.xyz; vN = normalize(uN * aNrm);",
    "  gl_Position = uP * w; gl_PointSize = uPt;",
    "}"].join("\n");
  // modes: 0 lit solid · 1 character · 2 ball · 3 sky · 4 ground · 5 soft disc (sun glow, moon, lamp glow) · 6 stars · 7 unlit
  //        8 hedge · 9 building · 10 shadow (multiplied into the ground) · 11 palm trunk · 12 cloud puff · 13 frond
  var FS = [
    "#ifdef GL_FRAGMENT_PRECISION_HIGH", "precision highp float;", "#else", "precision mediump float;", "#endif",
    "varying vec3 vN, vW, vL; varying vec2 vUv; varying vec3 vCol, vSize; varying vec2 vSeed; uniform mediump float uBk;",
    "uniform int uMode; uniform vec4 uC0, uC1, uC2; uniform vec3 uLight, uLc, uSky, uGnd, uTint, uCam, uFogC, uSunDir, uSunC, uB0, uB1, uB2, uRight, uUp, uFwd;",
    "uniform vec2 uArena, uRes, uFxy; uniform float uA, uRot, uFl, uLights, uFlat, uT, uExpo, uLite; uniform sampler2D uFace;",
    "float hash(vec2 p) { p = mod(p, 289.0); return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }",
    "float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);",
    "  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }",
    "float fbm(vec2 p) { return vnoise(p) * 0.5 + vnoise(p * 2.03) * 0.3 + vnoise(p * 4.1) * 0.2; }",
    // soft outdoor light: wrapped sun/moon + sky from above, warm ground bounce from below (y is down)
    "vec3 shade(vec3 alb, vec3 n, float w) {",
    "  float dif = clamp((dot(n, uLight) + w) / (1.0 + w), 0.0, 1.0);",
    "  return alb * (mix(uGnd, uSky, 0.5 - 0.5 * n.y) * 0.62 + uLc * dif * 0.78);",
    "}",
    "void main() {",
    "  vec3 c = uBk > 0.5 && uMode != 13 ? vCol * uExpo : uC0.rgb; float al = uC0.a; vec3 n = normalize(vN); vec3 V = normalize(uCam - vW); vec3 glow = vec3(0.0);",
    "  float fogOn = 1.0;",
    "#ifdef FLAT",
    "  if (uFlat > 0.5) n = normalize(cross(dFdx(vW), dFdy(vW)));",  // faceted low-poly look for bushes, crowns, coconuts
    "#endif",
    "  if (dot(n, V) < 0.0 && (uMode == 13 || uMode == 0)) n = -n;",  // fronds and thin pieces are two-sided
    "  if (uMode == 3) {",  // sky: the real view direction per pixel, so it stays put when the camera turns
    "    vec3 d = normalize(uRight * ((vUv.x * 2.0 - 1.0) / uFxy.x) + uUp * ((1.0 - vUv.y * 2.0) / uFxy.y) + uFwd);",
    "    float up = clamp(-d.y, 0.0, 1.0);",
    "    c = mix(uC1.rgb, uC0.rgb, smoothstep(0.0, 0.55, up));",
    "    c = mix(c, uC1.rgb * 1.06, exp(-up * 16.0) * 0.55);",  // bright haze hugging the horizon
    "    float sd = max(dot(d, uSunDir), 0.0);",
    "    c += uSunC * (smoothstep(0.99935, 0.99965, sd) * 1.4 + pow(sd, 10.0) * 0.32 + pow(sd, 2.0) * 0.08 * (1.0 - up));",
    "    c *= uTint; fogOn = 0.0;",
    "  }",
    "  else if (uMode == 4) {",  // ground: a mown lawn inside the hedge, a stone walk round it, sand beyond
    "    vec2 xz = vW.xz;",
    "    float ring = max(max(-xz.x, xz.x - uArena.x), max(-xz.y, xz.y - uArena.y));",  // how far outside the hedge line (negative inside)
    "    vec3 lawn = uC0.rgb * mix(0.93, 1.07, smoothstep(-0.25, 0.25, sin(xz.x * 0.05)));",  // mown stripes
    "    if (uLite < 0.5) {",  // soft colour variation and a few dry patches (light mode keeps the plain stripes)
    "      lawn *= 1.0 + (fbm(xz * 0.018) - 0.5) * 0.22;",
    "      lawn = mix(lawn, lawn * vec3(1.05, 1.0, 0.72), smoothstep(0.62, 0.8, vnoise(xz * 0.006)) * 0.7);",
    "    }",
    "    vec2 tg = xz / 26.0, tf = abs(fract(tg) - 0.5);",
    "    vec3 stone = vec3(0.86, 0.82, 0.74) * (0.94 + 0.12 * hash(floor(tg))) * (1.0 - 0.25 * smoothstep(0.44, 0.49, max(tf.x, tf.y))) * uExpo;",  // paving with grout lines
    "    vec3 sand = mix(uC1.rgb, uC2.rgb, 0.45);",
    "    if (uLite < 0.5) sand *= 1.0 + (fbm(xz * 0.01) - 0.5) * 0.3 + sin(xz.x * 0.06 + fbm(xz * 0.004) * 9.0) * 0.025;",
    "    c = ring < 0.0 ? lawn : mix(stone, sand, smoothstep(60.0, 72.0, ring));",
    "    c *= 1.0 - 0.32 * exp(-abs(ring) * 0.09);",  // a dark gutter along both sides of the hedge
    "    c = shade(c, vec3(0.0, -1.0, 0.0), 0.0);",
    "  }",
    "  else if (uMode == 1) {",  // a character: the three colours of the 2D gradient in soft bands, a rim of sky, a glossy pin, warmth in the shadow, its face on the front
    "    float hl = dot(n, uLight) * 0.5 + 0.5;",
    "    c = mix(uC2.rgb, uC1.rgb, smoothstep(0.2, 0.5, hl)); c = mix(c, uC0.rgb, smoothstep(0.62, 0.88, hl) * 0.85);",
    "    c *= mix(vec3(1.0), uLc, 0.3);",
    "    c += mix(uGnd, uSky, 0.5 - 0.5 * n.y) * pow(1.0 - max(dot(n, V), 0.0), 2.5) * 0.32;",
    "    c += uC1.rgb * vec3(0.16, 0.05, 0.02) * smoothstep(0.45, 0.1, hl);",
    "    vec3 h = normalize(uLight + V + vec3(0.1, -0.2, 0.0)); c = mix(c, vec3(1.0), smoothstep(0.5, 0.7, pow(max(dot(n, h), 0.0), 40.0)) * 0.42);",
    "    if (vL.z > 0.0) { vec4 fc = texture2D(uFace, vec2(0.5 + vL.x * 0.4, 0.5 + vL.y * 0.4)); c = mix(c, fc.rgb * mix(0.8, 1.0, hl), fc.a); }",
    "  }",
    "  else if (uMode == 2) {",  // the ball: six colour panels rolling with it
    "    float a = mod(atan(vL.y, vL.z) + uRot, 6.2831853); int s = int(floor(a / 1.0471976));",
    "    c = s == 0 ? uB0 : s == 2 ? uB2 : s == 4 ? vec3(0.95, 0.76, 0.3) : uB1;",
    "    c = shade(c, n, 0.4); vec3 h2 = normalize(uLight + V); c = mix(c, vec3(1.0), smoothstep(0.5, 0.7, pow(max(dot(n, h2), 0.0), 50.0)) * 0.5);",
    "  }",
    "  else if (uMode == 5) { float d = length(vUv * 2.0 - 1.0); al *= 1.0 - smoothstep(uA, 1.0, d); fogOn = 0.0; }",
    "  else if (uMode == 12) { float d = length(vUv * 2.0 - 1.0); al *= 1.0 - smoothstep(0.55, 1.0, d); c *= 0.82 + 0.3 * vUv.y; fogOn = 0.3; }",  // cloud puffs, lit from above
    "  else if (uMode == 6) { float d = length(gl_PointCoord - 0.5) * 2.0; al *= 1.0 - smoothstep(0.4, 1.0, d); fogOn = 0.0; }",
    "  else if (uMode == 10) { float d = length(vUv * 2.0 - 1.0); gl_FragColor = vec4(0.0, 0.0, 0.0, al * (1.0 - smoothstep(0.25, 1.0, d * d))); return; }",
    "  else if (uMode == 7) { fogOn = 0.4; }",
    "  else if (uMode == 8) {",  // hedge: clipped leaves, darker toward its foot, a lighter top
    "    float leaf = uLite > 0.5 ? 0.5 + 0.25 * sin((vW.x + vW.z) * 0.3) : fbm(vec2(vW.x + vW.z, vW.y) * 0.13);",
    "    c = mix(uC0.rgb * 0.72, uC0.rgb * 1.18, smoothstep(0.3, 0.7, leaf));",
    "    c *= mix(0.68, 1.0, clamp((uFl - vW.y) / 26.0, 0.0, 1.0));",
    "    if (n.y < -0.9) c *= 1.1;",
    "    c = shade(c, n, 0.5);",
    "  }",
    "  else if (uMode == 9) {",  // a building: plaster walls, a grid of windows (some lit at night), a flat roof, dusky at its foot
    "    vec2 fuv = abs(n.x) > 0.5 ? vec2(vL.z * vSize.z, vL.y * vSize.y) : vec2(vL.x * vSize.x, vL.y * vSize.y);",
    "    vec2 g = fuv / vec2(19.0, 24.0), cell = floor(g), f = fract(g);",
    "    float side = step(abs(n.y), 0.5), above = step(14.0, uFl - vW.y) * step(8.0, (vL.y + 0.5) * vSize.y);",
    "    float win = side * above * step(0.28, f.x) * step(f.x, 0.72) * step(0.22, f.y) * step(f.y, 0.7) * step(0.3, hash(cell + floor(vSeed + 0.5)));",
    "    float far = 1.0 - smoothstep(1800.0, 3200.0, length(uCam - vW)); win *= far;",
    "    c *= mix(0.74, 1.0, clamp((uFl - vW.y) / 40.0, 0.0, 1.0));",
    "    if (n.y < -0.5) c *= 0.9;",
    "    c = mix(c, vec3(0.32, 0.38, 0.46), win * 0.85);",
    "    c = shade(c, n, 0.35);",
    "    glow = vec3(1.0, 0.8, 0.46) * win * step(hash(cell * 1.7 + floor(vSeed.yx + 0.5)), 0.55) * uLights * 0.95;",
    "  }",
    "  else if (uMode == 11) { c *= 0.86 + 0.14 * step(0.5, fract(vL.y * 16.0)); c = shade(c, n, 0.4); }",  // palm trunk with rings
    "  else if (uMode == 13) { c *= 0.72 + 0.4 * vUv.x; c = shade(c, n, 0.6); }",  // frond, darker at its base
    "  else if (uMode == 0) c = shade(c, n, 0.45);",
    "  if (uMode != 3 && uMode != 5 && uMode != 6 && uMode != 7 && uMode != 12) c *= uTint;",
    "  c += glow;",
    // distance haze toward the horizon colour (warmer looking toward the sun): far things melt into the sky
    "  float dist = length(uCam - vW), fog = (1.0 - exp(-max(dist - 900.0, 0.0) / 3000.0)) * fogOn;",
    "  vec3 fc2 = mix(uFogC, uFogC * 0.6 + uSunC * 0.4, pow(max(dot(-V, uSunDir), 0.0), 6.0) * 0.6);",
    "  c = mix(c, mix(vec3(dot(c, vec3(0.3, 0.59, 0.11))), c, 0.75), fog * 0.6);",
    "  c = mix(c, fc2, clamp(fog, 0.0, 0.92));",
    // finishing: a soft vignette and an ordered dither against banding in the sky and the haze
    "  if (uLite < 0.5) { vec2 q = gl_FragCoord.xy / uRes; c *= mix(0.8, 1.0, smoothstep(1.15, 0.35, length(q - 0.5) * 1.4142)); }",  // a soft vignette, no grain
    "  gl_FragColor = vec4(c, al);",
    "}"].join("\n");

  // ---- tiny vector / matrix kit (column-major, like WebGL wants) ----
  function I() { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); }
  function mul(a, b) {
    var o = new Float32Array(16);
    for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    return o;
  }
  function T(x, y, z) { var m = I(); m[12] = x; m[13] = y; m[14] = z; return m; }
  function S(x, y, z) { var m = I(); m[0] = x; m[5] = y; m[10] = z; return m; }
  function Rz(deg) { var a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), m = I(); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; }
  function Rx(deg) { var a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), m = I(); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; }
  function Ry(rad) { var c = Math.cos(rad), s = Math.sin(rad), m = I(); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; }
  function chain() { var m = arguments[0]; for (var i = 1; i < arguments.length; i++) m = mul(m, arguments[i]); return m; }
  // normal matrix: the inverse-transpose of the upper 3×3, so squashed shapes (fronds, bodies) light correctly
  function n3(m) {
    var a = m[0], b = m[1], c = m[2], d = m[4], e = m[5], f = m[6], g = m[8], h = m[9], i = m[10];
    var A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C || 1;
    return new Float32Array([A / det, B / det, C / det, -(b * i - c * h) / det, (a * i - c * g) / det, -(a * h - b * g) / det, (b * f - c * e) / det, -(a * f - c * d) / det, (a * e - b * d) / det]);
  }
  function norm(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

  // ---- meshes, all unit sized ----
  function sphere(seg, rings) {
    var v = [], ix = [];
    for (var r = 0; r <= rings; r++) {
      var ph = r / rings * Math.PI, y = Math.cos(ph), rr = Math.sin(ph);
      for (var s = 0; s <= seg; s++) { var th = s / seg * Math.PI * 2, x = Math.cos(th) * rr, z = Math.sin(th) * rr; v.push(x, y, z, x, y, z, s / seg, r / rings); }
    }
    for (r = 0; r < rings; r++) for (s = 0; s < seg; s++) { var a = r * (seg + 1) + s, b = a + seg + 1; ix.push(a, b, a + 1, b, b + 1, a + 1); }
    return { v: v, ix: ix };
  }
  function cube() {
    var v = [], ix = [], F = [[0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]];
    F.forEach(function (n, f) {
      var u = n[1] ? [1, 0, 0] : [0, 1, 0], w = cross(n, u);
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (q, k) {
        v.push(n[0] * .5 + u[0] * q[0] * .5 + w[0] * q[1] * .5, n[1] * .5 + u[1] * q[0] * .5 + w[1] * q[1] * .5, n[2] * .5 + u[2] * q[0] * .5 + w[2] * q[1] * .5, n[0], n[1], n[2], k & 1, k >> 1);
      });
      ix.push(f * 4, f * 4 + 1, f * 4 + 2, f * 4, f * 4 + 2, f * 4 + 3);
    });
    return { v: v, ix: ix };
  }
  function cyl(seg, top) {  // a tapered tube from y = 0 (radius 1) up to y = -1 (radius top)
    var v = [], ix = [];
    for (var k = 0; k <= 1; k++) for (var s = 0; s <= seg; s++) { var a = s / seg * Math.PI * 2, r = k ? top : 1; v.push(Math.cos(a) * r, -k, Math.sin(a) * r, Math.cos(a), 0, Math.sin(a), s / seg, k); }
    for (s = 0; s < seg; s++) ix.push(s, s + seg + 1, s + 1, s + 1, s + seg + 1, s + seg + 2);
    return { v: v, ix: ix };
  }
  function frond(segs) {  // a palm leaf: unit length along +x, drooping (+y is down) toward a narrow tip
    var v = [], ix = [];
    for (var i = 0; i <= segs; i++) {
      var t = i / segs, y = .55 * t * t, hw = .17 * Math.sin(Math.PI * Math.min(1, t * 1.1 + .06)), tn = Math.hypot(1, 1.1 * t), nx = 1.1 * t / tn, ny = -1 / tn;
      v.push(t, y, -hw, nx, ny, 0, t, 0, t, y + .03, 0, nx, ny, 0, t, .5, t, y, hw, nx, ny, 0, t, 1);  // the middle rib sits a little low: a folded leaf
      if (i) { var a = 3 * (i - 1), b = 3 * i; ix.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2); }
    }
    return { v: v, ix: ix };
  }
  var QUAD = { v: [-.5, -.5, 0, 0, 0, 1, 0, 0, .5, -.5, 0, 0, 0, 1, 1, 0, .5, .5, 0, 0, 0, 1, 1, 1, -.5, .5, 0, 0, 0, 1, 0, 1], ix: [0, 1, 2, 0, 2, 3] };

  // colour strings ("#hex", "rgb()", "hsl()", oklab…) → [r,g,b] 0..1, through a 2D canvas so every CSS form works
  var cc = document.createElement("canvas").getContext("2d"), ccache = {};
  function col(s, fb) {
    if (!s) return fb || [.5, .5, .5];
    if (ccache[s]) return ccache[s];
    cc.fillStyle = "#010203"; cc.fillStyle = s; var h = cc.fillStyle;
    var out = /^#/.test(h) && h !== "#010203" ? [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255] : (fb || [.5, .5, .5]);
    return (ccache[s] = out);
  }
  function mix(a, b, p) { return [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p, a[2] + (b[2] - a[2]) * p]; }
  function lum(c, to) { var l = .3 * c[0] + .59 * c[1] + .11 * c[2] || 1; return [c[0] * to / l, c[1] * to / l, c[2] * to / l]; }  // same hue, set brightness
  function seeded(s) { return function () { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
  function clamp(v, a, b) { return Math.min(Math.max(v, a), b); }
  // plaster colours of a Gulf town: sand, cream, white, a pale stone, a faded terracotta now and then
  var PLASTER = [[.93, .87, .76], [.88, .82, .7], [.95, .93, .88], [.84, .78, .68], [.9, .85, .79], [.86, .7, .58]];

  // host: the .world element; W × DZ: the arena in world px; paintFace(ctx, el): dilmo.js draws a body's current face into a canvas
  function create(host, W, H, K, DZ, paintFace) {
    var canvas = document.createElement("canvas"); canvas.className = "d3";
    // light mode for old computers and cheap phones: no anti-aliasing, fewer pixels, no noise textures, only the near ring of houses
    var weak = (navigator.hardwareConcurrency || 4) <= 2 || (navigator.deviceMemory || 4) <= 2;
    var gl = canvas.getContext("webgl", { antialias: !weak, alpha: false, premultipliedAlpha: false, powerPreference: "high-performance" });  // the visitor chose the heavier world: ask for the strong GPU (laptops with two)
    if (!gl) return null;
    host.insertBefore(canvas, host.firstChild);
    var api = null;  // the renderer dies with its context (a phone dropping the GPU): tell dilmo.js so it can step back to the flat world
    canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); if (api && api.onLost) api.onLost(); });

    var dbg = gl.getExtension("WEBGL_debug_renderer_info"), gpuName = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
    var lite = weak || /SwiftShader|llvmpipe|Software|Basic Render|Mali-[4T]|Adreno \(TM\) [2-4]\d\d|PowerVR SGX|Intel.*(GMA|HD Graphics( [2-5]\d{3})?\b)/i.test(gpuName) || gl.getParameter(gl.MAX_TEXTURE_SIZE) < 4096;
    var flatExt = gl.getExtension("OES_standard_derivatives");
    function shader(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
    var prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, (flatExt ? "#extension GL_OES_standard_derivatives : enable\n#define FLAT\n" : "") + FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    var U = {};
    ["uP", "uM", "uN", "uR", "uPt", "uRim", "uMode", "uC0", "uC1", "uC2", "uLight", "uLc", "uSky", "uGnd", "uTint", "uCam", "uFogC", "uSunDir", "uSunC", "uB0", "uB1", "uB2",
      "uRight", "uUp", "uFwd", "uArena", "uRes", "uFxy", "uA", "uRot", "uFl", "uLights", "uFlat", "uT", "uExpo", "uFace", "uBk", "uTv", "uLite"].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    var A = { pos: gl.getAttribLocation(prog, "aPos"), nrm: gl.getAttribLocation(prog, "aNrm"), uv: gl.getAttribLocation(prog, "aUv"),
      loc: gl.getAttribLocation(prog, "aLoc"), col: gl.getAttribLocation(prog, "aCol"), size: gl.getAttribLocation(prog, "aSize"), seed: gl.getAttribLocation(prog, "aSeed") };
    var EXTRA = [A.loc, A.col, A.size, A.seed].filter(function (a) { return a >= 0; });
    function mesh(m) {
      var vb = gl.createBuffer(), ib = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(m.v), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(m.ix), gl.STATIC_DRAW);
      return { vb: vb, ib: ib, n: m.ix.length };
    }
    var G = { low: sphere(9, 6), cube: cube(), cyl: cyl(7, .62), frond: frond(7) };
    var SPH = mesh(sphere(32, 20)), LOW = mesh(G.low), CUBE = mesh(G.cube), QD = mesh(QUAD), CYL = mesh(G.cyl), starBuf = gl.createBuffer(), NSTAR = 140;
    // ---- baking: everything that never moves (the town, palm trunks, fronds, coconuts) is merged once into a few big buffers,
    //      in world space, so a frame makes ~150 draw calls instead of ~1300 ----
    var BK = 19;  // floats per baked vertex: pos 3, normal 3, uv 2, local pos 3, colour 3, size 3, seed 2
    function bake(parts) {
      var v = [], ix = [], base = 0;
      parts.forEach(function (pt) {
        var g = pt.g, M = pt.M, N = n3(M);
        for (var i = 0; i < g.v.length; i += 8) {
          var x = g.v[i], y = g.v[i + 1], z = g.v[i + 2], nx = g.v[i + 3], ny = g.v[i + 4], nz = g.v[i + 5];
          var wx = M[0] * x + M[4] * y + M[8] * z + M[12], wy = M[1] * x + M[5] * y + M[9] * z + M[13], wz = M[2] * x + M[6] * y + M[10] * z + M[14];
          var n = norm([N[0] * nx + N[3] * ny + N[6] * nz, N[1] * nx + N[4] * ny + N[7] * nz, N[2] * nx + N[5] * ny + N[8] * nz]);
          v.push(wx, wy, wz, n[0], n[1], n[2], g.v[i + 6], g.v[i + 7], x, y, z, pt.col[0], pt.col[1], pt.col[2], pt.size[0], pt.size[1], pt.size[2], pt.seed[0], pt.seed[1]);
        }
        g.ix.forEach(function (k) { ix.push(k + base); });
        base += g.v.length / 8;
      });
      var big = base > 65535, ext = big && gl.getExtension("OES_element_index_uint");
      if (big && !ext) return null;
      var vb = gl.createBuffer(), ib = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, big ? new Uint32Array(ix) : new Uint16Array(ix), gl.STATIC_DRAW);
      bound = null;
      return { vb: vb, ib: ib, n: ix.length, type: big ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT };
    }
    function drawBaked(B, mode, c0) {
      if (!B) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, B.vb); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, B.ib); bound = null;
      var st = BK * 4;
      gl.vertexAttribPointer(A.pos, 3, gl.FLOAT, false, st, 0); gl.vertexAttribPointer(A.nrm, 3, gl.FLOAT, false, st, 12); gl.vertexAttribPointer(A.uv, 2, gl.FLOAT, false, st, 24);
      if (A.loc >= 0) gl.vertexAttribPointer(A.loc, 3, gl.FLOAT, false, st, 32);
      if (A.col >= 0) gl.vertexAttribPointer(A.col, 3, gl.FLOAT, false, st, 44);
      if (A.size >= 0) gl.vertexAttribPointer(A.size, 3, gl.FLOAT, false, st, 56);
      if (A.seed >= 0) gl.vertexAttribPointer(A.seed, 2, gl.FLOAT, false, st, 68);
      EXTRA.forEach(function (a) { gl.enableVertexAttribArray(a); });
      gl.uniform1f(U.uBk, 1); gl.uniform1i(U.uMode, mode); gl.uniformMatrix4fv(U.uM, false, ID); gl.uniformMatrix3fv(U.uN, false, ID3);
      if (c0) gl.uniform4f(U.uC0, c0[0], c0[1], c0[2], 1);
      gl.drawElements(gl.TRIANGLES, B.n, B.type, 0);
      EXTRA.forEach(function (a) { gl.disableVertexAttribArray(a); });
      gl.uniform1f(U.uBk, 0);
    }
    var ID3 = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]), baked = null, bakedFor = "";
    var bound = null;
    function bind(m) {
      if (bound === m) return; bound = m;
      gl.bindBuffer(gl.ARRAY_BUFFER, m.vb); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.ib);
      gl.vertexAttribPointer(A.pos, 3, gl.FLOAT, false, 32, 0); gl.vertexAttribPointer(A.nrm, 3, gl.FLOAT, false, 32, 12); gl.vertexAttribPointer(A.uv, 2, gl.FLOAT, false, 32, 24);
    }
    gl.enableVertexAttribArray(A.pos); gl.enableVertexAttribArray(A.nrm); gl.enableVertexAttribArray(A.uv);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.enable(gl.DEPTH_TEST);
    var ZERO = new Float32Array(96), ID = I();
    gl.uniform4fv(U.uRim, ZERO); gl.uniform1i(U.uFace, 0); gl.uniform1f(U.uFlat, 0); gl.uniform1f(U.uBk, 0);
    // a blank face texture for things that have none (the ball, props)
    var blank = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, blank); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));

    // ---- the camera: orbits the middle of the arena; drag on empty ground turns it, wheel or pinch zooms ----
    // views: "orbit" (the whole arena), "third" (behind a character), "first" (through its eyes), "second" (through Dilmo's eyes, looking at you)
    var cam = { yaw: .55, pitch: .5, p3: .38, p1: .12, zoom: 1, orbiting: false, mode: "orbit" }, view = { mode: "orbit", subj: null, from: null, t0: -1e9 }, focus = null, lead = [0, 0], lastOrbit = -1e9, trauma = 0, base = 1000, fl = H * .85, eye = [0, 0, 0], fwd = [0, 0, -1], right = [1, 0, 0], cup = [0, -1, 0], PV = I(), fy = 1, fx = 1;
    var intro = null;  // the portal brings the camera from the flat view to its place
    // the camera follows your character softly: small hops do not move it (a dead zone), it leads a little where you are going,
    // and after a few seconds without touching the camera it swings round behind you. With nobody to follow and no one
    // touching anything, it drifts slowly round the arena (Catlike Coding orbit camera)
    function follow(s, dt) {
      var p = view.mode === "third" ? view.subj : null, tx = W / 2, tz = DZ / 2;
      if (p) {
        lead[0] += (clamp(p.vx * 12, -70, 70) - lead[0]) * (1 - Math.pow(.85, dt)); lead[1] += (clamp(p.vz * 12, -70, 70) - lead[1]) * (1 - Math.pow(.85, dt));
        tx = p.x + lead[0]; tz = p.z + lead[1];
      }
      if (!focus) focus = [W / 2, DZ / 2];
      var dx = tx - focus[0], dz = tz - focus[1], d = Math.hypot(dx, dz);
      if (d > 40) { focus[0] += dx * (1 - 40 / d); focus[1] += dz * (1 - 40 / d); }
      var k = 1 - Math.pow(.4, dt / 60); focus[0] += (tx - focus[0]) * k; focus[1] += (tz - focus[1]) * k;
      focus[0] = clamp(focus[0], -60, W + 60); focus[1] = clamp(focus[1], -60, DZ + 60);
      if (cam.orbiting) return;
      var sp = p ? Math.hypot(p.vx, p.vz) : 0;
      if (p && s.t - lastOrbit > 3000 && sp > .5) {
        var want = Math.atan2(-p.vx, -p.vz), delta = Math.atan2(Math.sin(want - cam.yaw), Math.cos(want - cam.yaw));
        if (Math.abs(delta) < Math.PI * .75) {  // never flip round when you walk toward the camera
          var step = Math.PI / 2 / 60 * dt * Math.min(1, sp / 4); if (Math.abs(delta) < Math.PI / 4) step *= Math.abs(delta) / (Math.PI / 4);
          cam.yaw += clamp(delta, -step, step);
        }
      } else if (view.mode === "orbit" && s.idle > 20000 && !s.reduce) cam.yaw += .0012 * dt;
    }
    function viewUpdate() {
      var vm = view.mode, sj = view.subj, third = vm === "third";
      var tgt = [focus ? focus[0] : W / 2, third ? sj.y - sj.r * .4 - 10 : fl - 40 - DZ * .04, focus ? focus[1] : DZ / 2], d = third ? 330 * cam.zoom : base * cam.zoom, pitch = third ? cam.p3 : cam.pitch, yaw = cam.yaw;
      // the eye stays inside the ring of houses: where they are close, the camera looks down more steeply instead of going through them
      var hx = Math.sin(yaw), hz = Math.cos(yaw), tMax = 1e9;
      if (hx > .01) tMax = Math.min(tMax, (W + 470 - tgt[0]) / hx); if (hx < -.01) tMax = Math.min(tMax, (-470 - tgt[0]) / hx);
      if (hz < -.01) tMax = Math.min(tMax, (-470 - tgt[2]) / hz); if (hz > .01) tMax = Math.min(tMax, (DZ + 1900 - tgt[2]) / hz);
      if (!intro && d * Math.cos(pitch) > tMax) pitch = Math.acos(clamp(tMax / d, 0, 1));
      if (trauma > 0) { var sh = trauma * trauma; yaw += (Math.random() - .5) * .03 * sh; pitch += (Math.random() - .5) * .03 * sh; tgt[1] += (Math.random() - .5) * 8 * sh; }
      eye = [tgt[0] + d * Math.sin(yaw) * Math.cos(pitch), tgt[1] - d * Math.sin(pitch), tgt[2] + d * Math.cos(yaw) * Math.cos(pitch)];
      if (vm === "first") {  // through the character's eyes: a little above its middle, looking where the camera yaw points
        var p1 = cam.p1; eye = [sj.x, sj.y - sj.r * .45 + Math.sin(view.bob) * .8 * (view.bobA || 0), sj.z];
        tgt = [eye[0] - Math.sin(yaw) * Math.cos(p1) * 100, eye[1] + Math.sin(p1) * 100, eye[2] - Math.cos(yaw) * Math.cos(p1) * 100];
      } else if (vm === "second") {  // through Dilmo's eyes, at you
        var m = view.from; eye = [m.x, m.y - m.r * .45, m.z]; tgt = [sj.x, sj.y - sj.r * .3, sj.z];
      }
      // a short glide when the view changes, so you see where you went
      var bt = clamp((performance.now() - view.t0) / 650, 0, 1);
      if (bt < 1 && view.eye0) { var e2 = bt * bt * (3 - 2 * bt); for (var q = 0; q < 3; q++) { eye[q] = view.eye0[q] + (eye[q] - view.eye0[q]) * e2; tgt[q] = view.tgt0[q] + (tgt[q] - view.tgt0[q]) * e2; } }
      view.eye = eye.slice(); view.tgt = tgt.slice();
      fwd = norm([tgt[0] - eye[0], tgt[1] - eye[1], tgt[2] - eye[2]]);
      right = norm(cross([0, -1, 0], fwd)); cup = cross(fwd, right);
      var V = new Float32Array([right[0], cup[0], -fwd[0], 0, right[1], cup[1], -fwd[1], 0, right[2], cup[2], -fwd[2], 0, -dot(right, eye), -dot(cup, eye), dot(fwd, eye), 1]);
      var n = 20, f = 9000; fy = 1 / Math.tan(.36); fx = fy * H / W;
      var P = new Float32Array([fx, 0, 0, 0, 0, fy, 0, 0, 0, 0, -(f + n) / (f - n), -1, 0, 0, -2 * f * n / (f - n), 0]);
      PV = mul(P, V);
    }
    function scr(x, y, z) {  // world → stage px (world units) + the on-screen scale of one world px there
      var cx = PV[0] * x + PV[4] * y + PV[8] * z + PV[12], cy = PV[1] * x + PV[5] * y + PV[9] * z + PV[13], cw = PV[3] * x + PV[7] * y + PV[11] * z + PV[15];
      if (cw < 1) return { x: -1e4, y: -1e4, s: .001 };
      return { x: (cx / cw + 1) / 2 * W, y: (1 - cy / cw) / 2 * H, s: fy * H / 2 / cw };
    }
    function ray(sx, sy) {
      var nx = sx / W * 2 - 1, ny = 1 - sy / H * 2, dx = nx / fx, dy = ny / fy;
      return norm([right[0] * dx + cup[0] * dy + fwd[0], right[1] * dx + cup[1] * dy + fwd[1], right[2] * dx + cup[2] * dy + fwd[2]]);
    }
    function ground(sx, sy) {  // the floor point under a pixel, and whether it is inside the hedge
      var d = ray(sx, sy), t = (fl - eye[1]) / d[1];
      if (!(t > 0)) return null;
      var x = eye[0] + d[0] * t, z = eye[2] + d[2] * t;
      return { x: x, z: z, inside: x > -30 && x < W + 30 && z > -30 && z < DZ + 30 };
    }
    function unscr(sx, sy, p) {  // the point under a pixel on the vertical plane through p that faces the camera (dragging)
      var d = ray(sx, sy), n = norm([fwd[0], 0, fwd[2]]), t = ((p.x - eye[0]) * n[0] + (p.z - eye[2]) * n[2]) / (d[0] * n[0] + d[2] * n[2] || 1e-6);
      return { x: eye[0] + d[0] * t, y: eye[1] + d[1] * t, z: eye[2] + d[2] * t };
    }
    var ptrs = {}, pinch = 0;
    // a quick tap on the lawn is a tap (Dilmo comes over); a drag turns the camera; two fingers zoom
    canvas.addEventListener("pointerdown", function (e) {
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: false }; if (document.pointerLockElement !== canvas) canvas.setPointerCapture(e.pointerId); e.preventDefault();
      var ks = Object.keys(ptrs); if (ks.length === 2) { pinch = Math.hypot(ptrs[ks[0]].x - ptrs[ks[1]].x, ptrs[ks[0]].y - ptrs[ks[1]].y); ks.forEach(function (k) { ptrs[k].moved = true; }); cam.orbiting = true; }
    });
    canvas.addEventListener("pointermove", function (e) {
      var p = ptrs[e.pointerId]; if (!p) return;
      var ks = Object.keys(ptrs);
      if (!p.moved && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 8) { p.moved = true; cam.orbiting = true; }
      if (!p.moved) return;
      lastOrbit = performance.now();
      if (ks.length === 1) {
        var ddx = (e.clientX - p.x), ddy = (e.clientY - p.y), vm = view.mode;
        if (vm === "first") { cam.yaw -= ddx * .005; cam.p1 = clamp(cam.p1 + ddy * .004, -.6, 1.1); }
        else if (vm === "third") { cam.yaw += ddx * .006; cam.p3 = clamp(cam.p3 - ddy * .005, .1, 1.2); }
        else if (vm === "orbit") { cam.yaw += ddx * .006; cam.pitch = clamp(cam.pitch - ddy * .005, .14, 1.15); }
      }
      p.x = e.clientX; p.y = e.clientY;
      if (ks.length === 2) { var d = Math.hypot(ptrs[ks[0]].x - ptrs[ks[1]].x, ptrs[ks[0]].y - ptrs[ks[1]].y); if (pinch) cam.zoom = clamp(cam.zoom * pinch / d, .55, 1.8); pinch = d; }
    });
    // first person on a computer: a click on the arena captures the mouse (Esc gives it back); moving it turns your head
    function locked() { return document.pointerLockElement === canvas; }
    function onMouseLook(e) {
      if (!locked() || view.mode !== "first") return;
      cam.yaw -= e.movementX * .0024; cam.p1 = clamp(cam.p1 + e.movementY * .0022, -.6, 1.1);
    }
    document.addEventListener("mousemove", onMouseLook);
    function pup(e) {
      var p = ptrs[e.pointerId]; delete ptrs[e.pointerId]; pinch = 0;
      if (p && !p.moved && e.type === "pointerup" && e.pointerType === "mouse" && view.mode === "first" && !locked() && canvas.requestPointerLock) {
        try { var pr = canvas.requestPointerLock(); if (pr && pr.catch) pr.catch(function () { /* the browser said no: drag still works */ }); } catch { /* not allowed here */ }
        if (!Object.keys(ptrs).length) cam.orbiting = false;
        return;
      }
      if (p && !p.moved && e.type === "pointerup" && performance.now() - p.t < 350 && api && api.onTap) api.onTap(e);
      if (!Object.keys(ptrs).length) cam.orbiting = false;
    }
    canvas.addEventListener("pointerup", pup); canvas.addEventListener("pointercancel", pup);
    canvas.addEventListener("wheel", function (e) { cam.zoom = clamp(cam.zoom * (e.deltaY > 0 ? 1.08 : .93), .55, 1.8); e.preventDefault(); }, { passive: false });

    var town = [], palms = [], clouds = [], lamps = [], quality = lite ? .7 : 1, ft = { sum: 0, n: 0, good: 0, slow: 0 };
    function applyScale() {
      var dpr = Math.min(lite ? 1 : 1.5, devicePixelRatio || 1) * K * quality;
      canvas.width = Math.max(2, Math.round(W * dpr)); canvas.height = Math.max(2, Math.round(H * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform2f(U.uRes, canvas.width, canvas.height);
    }
    // every second: if frames take too long, draw fewer pixels (down to 55 %); when there is room again, go back up
    function adapt(ms) {
      if (!(ms > 0 && ms < 120)) return;  // a background tab or a hitch is not a trend
      ft.sum += ms; ft.n++;
      if (ft.n < 60) return;
      var avg = ft.sum / ft.n; ft.sum = ft.n = 0;
      var floorQ = lite ? .42 : .55;
      if (avg > 21 && quality > floorQ + .01) { quality = Math.max(floorQ, quality * .85); ft.good = 0; applyScale(); }
      else if (avg > 24 && !lite && ++ft.slow >= 3) { lite = true; ft.slow = 0; applyScale(); }  // still slow at the lowest resolution: light mode
      else if (avg < 18 && quality < 1) { ft.slow = 0; if (++ft.good >= 4) { quality = Math.min(1, quality / .88); ft.good = 0; applyScale(); } }
      else ft.good = 0;
    }
    function resize(w, h, k, dz) {
      W = w; H = h; K = k || 1; if (dz) DZ = dz;
      canvas.style.width = W + "px"; canvas.style.height = H + "px"; applyScale();
      base = Math.max(W * 1.25 / (.75 * W / H), (DZ + 500) / .75, 700);
      // the town stands in two rings around the arena, palms in the sandy band between the walk and the town
      var rnd = seeded(7); town = []; palms = []; clouds = []; lamps = [];
      // the side the camera starts on (south, +z) is kept clear right up to the far ring, so nothing stands between you and the arena
      [[520, 46, 120], [860, 80, 190]].forEach(function (ring) {
        var m = ring[0], ms = m + 1500, sides = [[-m, -m, W + m, -m], [-m, DZ + ms, W + m, DZ + ms], [-m, -m, -m, DZ + ms], [W + m, -m, W + m, DZ + ms]];
        sides.forEach(function (sd) {
          var len = Math.hypot(sd[2] - sd[0], sd[3] - sd[1]), ux = (sd[2] - sd[0]) / len, uz = (sd[3] - sd[1]) / len;
          for (var p = 0; p < len;) {
            var w2 = 46 + rnd() * 80, dep = 36 + rnd() * 40, hh = ring[1] + rnd() * (ring[2] - ring[1]);
            hh = Math.round(hh / 24) * 24 + 6;  // whole storeys, so the window rows line up
            town.push({ x: sd[0] + ux * (p + w2 / 2), z: sd[1] + uz * (p + w2 / 2), w: ux ? w2 : dep, d: ux ? dep : w2, h: hh, col: PLASTER[Math.floor(rnd() * PLASTER.length)], seed: [Math.floor(rnd() * 97), Math.floor(rnd() * 89)], ring: ring[0] > 600 ? 1 : 0,
              box: rnd() < .45 ? [(rnd() - .5) * .5, (rnd() - .5) * .5, 10 + rnd() * 8] : null });  // a water tank or a stair hut on some roofs
            p += w2 + 8 + rnd() * 50;
          }
        });
      });
      for (var i = 0; i < 14; i++) {
        var side = [0, 2, 3][Math.floor(rnd() * 3)], off = 110 + rnd() * 340, along = rnd();  // none on the south side, where the camera starts
        palms.push({ x: side === 0 ? -300 + along * (W + 600) : (side === 2 ? -off : W + off), z: side === 0 ? -off : -300 + along * (DZ + 600), h: 100 + rnd() * 80, ph: rnd() * 6, lean: (rnd() - .5) * 14, turn: rnd() * 6.28 });
      }
      [[-34, -34], [W + 34, -34], [-34, DZ + 34], [W + 34, DZ + 34], [W / 2, -34]].forEach(function (p) { lamps.push({ x: p[0], z: p[1] }); });
      for (i = 0; i < 6; i++) clouds.push({ a: rnd() * 6.28, r: 1500 + rnd() * 900, y: 560 + rnd() * 320, k: .8 + rnd() * .9, sp: .6 + rnd() * .8 });
      var st = [], sr = seeded(3);
      for (i = 0; i < NSTAR; i++) { var az = sr() * 6.2832, el = .08 + sr() * 1.3, cr = Math.cos(el); st.push(Math.cos(az) * cr * 4000, -Math.sin(el) * 4000, Math.sin(az) * cr * 4000, 0, 0, 0, 0, 0); }
      gl.bindBuffer(gl.ARRAY_BUFFER, starBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(st), gl.STATIC_DRAW); bound = null;
    }
    function rebake() {  // the floor line is only known once dilmo.js has measured the stage, so this runs from frame()
      if (baked) for (var bk in baked) if (baked[bk]) { gl.deleteBuffer(baked[bk].vb); gl.deleteBuffer(baked[bk].ib); }  // free the old merge first
      var tn = [], tf = [], tr = [], fr = [], co = [];
      town.forEach(function (b) {
        var tw = b.ring ? tf : tn;
        tw.push({ g: G.cube, M: chain(T(b.x, fl - b.h / 2, b.z), S(b.w, b.h, b.d)), col: b.col, size: [b.w, b.h, b.d], seed: b.seed });
        tw.push({ g: G.cube, M: chain(T(b.x, fl - b.h - 2.5, b.z), S(b.w + 3, 5, b.d + 3)), col: mix(b.col, [.5, .45, .4], .12), size: [0, 0, 0], seed: [0, 0] });
        if (b.box) tw.push({ g: G.cube, M: chain(T(b.x + b.box[0] * b.w, fl - b.h - b.box[2] / 2, b.z + b.box[1] * b.d), S(b.box[2] * 1.2, b.box[2], b.box[2] * 1.2)), col: mix(b.col, [1, 1, 1], .3), size: [0, 0, 0], seed: [0, 0] });
      });
      palms.forEach(function (p) {
        tr.push({ g: G.cyl, M: chain(T(p.x, fl, p.z), Rz(p.lean), S(6, p.h, 6)), col: [.55, .42, .3], size: [0, 0, 0], seed: [0, 0] });
        var tx = p.x + Math.sin(p.lean * Math.PI / 180) * p.h, ty = fl - Math.cos(p.lean * Math.PI / 180) * p.h, len = p.h * .55;
        for (var k = 0; k < 8; k++) fr.push({ g: G.frond, M: chain(T(tx, ty, p.z), Ry(p.turn + k * .785), Rz(-18 - (k % 2) * 10), S(len, len, len)), col: [0, 0, 0], size: [0, 0, 0], seed: [p.ph + k * .7, 0] });
        [[4, 3], [-3, 4], [0, -4]].forEach(function (o) { co.push({ g: G.low, M: chain(T(tx + o[0], ty + 6, p.z + o[1]), S(4.5, 4.5, 4.5)), col: [.45, .32, .18], size: [0, 0, 0], seed: [0, 0] }); });
      });
      baked = { town: bake(tn), far: bake(tf), trunks: bake(tr), fronds: bake(fr), nuts: bake(co) };
    }
    resize(W, H, K, DZ);

    var rimBuf = new Float32Array(96), faces = new Map(), L = [0, -1, 0], sunUp = 1;
    function draw(m, mode, M, c0, c1, c2) {
      bind(m); gl.uniform1i(U.uMode, mode); gl.uniformMatrix4fv(U.uM, false, M); gl.uniformMatrix3fv(U.uN, false, n3(M));
      if (c0) gl.uniform4f(U.uC0, c0[0], c0[1], c0[2], c0.length > 3 ? c0[3] : 1);
      if (c1) gl.uniform4f(U.uC1, c1[0], c1[1], c1[2], 1);
      if (c2) gl.uniform4f(U.uC2, c2[0], c2[1], c2[2], 1);
      gl.drawElements(gl.TRIANGLES, m.n, gl.UNSIGNED_SHORT, 0);
    }
    function flat(on) { if (flatExt) gl.uniform1f(U.uFlat, on ? 1 : 0); }
    function billboard(x, y, z, w, h, c, soft, mode) {  // a soft disc that always faces the camera
      gl.uniform1f(U.uA, soft);
      var M = new Float32Array([right[0] * w, right[1] * w, right[2] * w, 0, cup[0] * h, cup[1] * h, cup[2] * h, 0, fwd[0], fwd[1], fwd[2], 0, x, y, z, 1]);
      draw(QD, mode || 5, M, c);
    }
    function faceTex(b, t) {  // the body's face, as dilmo.js draws it right now, into a small texture on the front of the sphere
      var fc = faces.get(b.el);
      if (!fc) { fc = { cv: document.createElement("canvas"), tex: gl.createTexture(), yaw: 0, up: 0, at: 0 }; fc.cv.width = fc.cv.height = 128; fc.ctx = fc.cv.getContext("2d"); faces.set(b.el, fc); fc.touched = t;
        gl.bindTexture(gl.TEXTURE_2D, fc.tex); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); }
      fc.touched = t;
      if (t - fc.at < 30) return fc;  // faces change at 30 fps at most: half the texture uploads
      fc.at = t;
      var x = fc.ctx; x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, 128, 128); x.translate(64, 64); x.scale(64 / (1.25 * b.r), 64 / (1.25 * b.r));
      paintFace(x, b.el);
      gl.bindTexture(gl.TEXTURE_2D, fc.tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fc.cv);
      return fc;
    }
    function body(b, t, dt, sink) {
      var r = b.r, fc = faceTex(b, t);
      gl.bindTexture(gl.TEXTURE_2D, fc.tex);
      // faces the way it moves; standing still, it turns to the camera
      var sp = Math.hypot(b.vx, b.vz), toCam = !(sp > .9 && !b.drag), want = toCam ? Math.atan2(eye[0] - b.x, eye[2] - b.z) : Math.atan2(b.vx, b.vz);
      var da = Math.atan2(Math.sin(want - fc.yaw), Math.cos(want - fc.yaw)); fc.yaw += da * Math.min(1, .12 * dt);
      // looking at you, it also lifts its face toward the camera (you see it from above)
      var wantUp = toCam ? Math.atan2(b.y - eye[1], Math.hypot(eye[0] - b.x, eye[2] - b.z)) : 0; fc.up += (wantUp - fc.up) * Math.min(1, .12 * dt);
      var M = chain(T(b.x, b.y + (sink || 0), b.z), Ry(fc.yaw), Rx(fc.up * 180 / Math.PI - (toCam ? 0 : Math.min(25, sp * 3))), Rz(b.spin), T(0, r, 0), Rz(toCam ? b.tilt : 0), S(r * b.sx, r * b.sy, r * Math.min(b.sx, b.sy)), T(0, -1, 0));
      for (var i = 0; i < 48; i++) { var p = b.pts[i]; rimBuf[i * 2] = p.x; rimBuf[i * 2 + 1] = p.y; }
      gl.uniform4fv(U.uRim, rimBuf); gl.uniform1f(U.uR, r);
      draw(SPH, 1, M, col(b.cols[0]), col(b.cols[1]), col(b.cols[2]));
      gl.uniform4fv(U.uRim, ZERO); gl.bindTexture(gl.TEXTURE_2D, blank);
    }
    // shadows darken the ground (multiplied, so they never turn it grey or blue) and stretch away from the light, longer when it is low
    var shadows = [];
    function shadow(x, z, w, a, hgt) {
      var k = (hgt || 0) / Math.max(.3, -L[1]), len = Math.hypot(L[0], L[2]) || 1, off = Math.min(w * 1.4, k * .55), sx = x - L[0] / len * off, sz = z - L[2] / len * off;
      var stretch = 1 + Math.min(1.2, .9 * (1 - Math.min(1, -L[1])));
      shadows.push([sx, sz, w * stretch, w, Math.atan2(L[2], L[0]), a * sunUp]);
      if (hgt != null && hgt < w * 2) shadows.push([x, z, w * .55, w * .55, 0, a * .55]);  // a tight dark core right under it: weight
    }
    function flushShadows() {
      gl.depthMask(false); gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_ALPHA);
      shadows.forEach(function (s) { draw(QD, 10, chain(T(s[0], fl - .6, s[1]), Ry(-s[4]), Rx(90), S(s[2], s[3], 1)), [0, 0, 0, s[5]]); });
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(true); shadows = [];
    }

    var ballR = I(), ballN = 0;
    function rot3(ax, ay, az, a) {  // rotation by a radians about the unit axis (ax, ay, az), as a 4x4
      var c = Math.cos(a), s2 = Math.sin(a), t2 = 1 - c, m = I();
      m[0] = t2 * ax * ax + c; m[1] = t2 * ax * ay + s2 * az; m[2] = t2 * ax * az - s2 * ay;
      m[4] = t2 * ax * ay - s2 * az; m[5] = t2 * ay * ay + c; m[6] = t2 * ay * az + s2 * ax;
      m[8] = t2 * ax * az + s2 * ay; m[9] = t2 * ay * az - s2 * ax; m[10] = t2 * az * az + c;
      return m;
    }
    function ortho(m) {  // keep the accumulated rotation a clean rotation (rounding drifts it over thousands of frames)
      var x = norm([m[0], m[1], m[2]]), z = norm(cross(x, [m[4], m[5], m[6]])), y = cross(z, x), o = I();
      o[0] = x[0]; o[1] = x[1]; o[2] = x[2]; o[4] = y[0]; o[5] = y[1]; o[6] = y[2]; o[8] = z[0]; o[9] = z[1]; o[10] = z[2];
      return o;
    }
    var last = null, lastT = 0;
    function frame(s) {
      last = s; fl = s.fl; var t = s.t, dt = Math.min(3, (t - lastT) / 16.67 || 1); adapt(t - lastT); lastT = t;
      gl.uniform1f(U.uLite, lite ? 1 : 0);
      var key = fl.toFixed(1) + "|" + W + "|" + DZ; if (key !== bakedFor) { bakedFor = key; rebake(); }
      gl.uniform1f(U.uTv, s.reduce ? 0 : t / 1000);
      if (intro) {
        var ip = clamp((t - intro.t0) / intro.dur, 0, 1), e = ip * ip * (3 - 2 * ip); if (intro.back) e = 1 - e;
        cam.yaw = intro.yaw * e; cam.pitch = .03 + (intro.pitch - .03) * e; cam.zoom = intro.zoom + (1.25 - intro.zoom) * (1 - e);
        if (ip >= 1) intro = null;
      }
      // which view can run now: first and third need someone to be (you, or Dilmo); second needs both you and Dilmo
      var want = intro ? "orbit" : cam.mode, sj = s.player || s.main;
      if (want === "second" && !(s.player && s.main)) want = "first";
      if ((want === "first" || want === "third") && !sj) want = "orbit";
      if (want !== view.mode) { view.eye0 = view.eye; view.tgt0 = view.tgt; view.t0 = performance.now(); if (want === "first" && sj) cam.yaw = Math.hypot(sj.vx, sj.vz) > .5 ? Math.atan2(-sj.vx, -sj.vz) : Math.atan2(-(W / 2 - sj.x), -(DZ / 2 - sj.z)); }
      view.mode = want; view.subj = want === "second" ? s.player : sj; view.from = s.main;
      if (want !== "first" && locked()) document.exitPointerLock();
      if (sj) { var wsp = Math.hypot(sj.vx, sj.vz); view.bob = (view.bob || 0) + wsp * dt * .035; view.bobA = (view.bobA || 0) + (Math.min(1, wsp / 6) - (view.bobA || 0)) * Math.min(1, .15 * dt); }
      api.hideEl = want === "first" && sj ? sj.el : want === "second" ? s.main.el : null;
      follow(s, dt);
      trauma = Math.max(0, trauma - .025 * dt);
      viewUpdate();
      var sk = s.sky, cx = W / 2, cz = DZ / 2;
      var skyTop = col(sk["--sky-top"]), skyHor = col(sk["--sky-hor"]), grass = col(sk["--grass"]);
      var gBack = col(sk["--g-back"]), gFront = col(sk["--g-front"]), tint = col(sk["--tint"], [1, 1, 1]), cloud = col(sk["--cloud"], [1, 1, 1]);
      // things with their own colour (stone, plaster, wood, metal) dim with the hour; the palette colours already do
      var ex = 1 - .62 * (sk.stars || 0), X = function (c) { return [c[0] * ex, c[1] * ex, c[2] * ex]; };
      var palm = mix(grass, [.16, .34, .2], .5), bush = mix(grass, [.13, .3, .18], .35), hedge = mix(grass, [.12, .28, .16], .45);
      // sun and moon on a big arc around the arena (east on the left of the flat view); the light of the hour comes from them
      var span = fl * .86, sunP = null, moonP = null, lc;
      if (sk.sun) { var az = sk.sun.x / W * Math.PI, el = (fl - 10 - sk.sun.y) / (span * .85); sunP = [cx - Math.cos(az) * 2600, fl - 150 - el * 2000, cz - Math.sin(az) * 2600]; }
      if (sk.moon) { var az2 = sk.moon.x / W * Math.PI, el2 = (fl - 30 - sk.moon.y) / (span * .8); moonP = [cx - Math.cos(az2) * 2600, fl - 150 - el2 * 1800, cz - Math.sin(az2) * 2600]; }
      var warm = sk.sun ? sk.sun.warm || 0 : 0;
      if (sunP) { L = [sunP[0] - cx, sunP[1] - fl, sunP[2] - cz]; lc = mix([1, .96, .88], [1, .72, .5], warm); sunUp = 1; }
      else if (moonP) { L = [moonP[0] - cx, moonP[1] - fl, moonP[2] - cz]; lc = [.62, .68, .92]; sunUp = .45; }
      else { L = [-300, -600, 400]; lc = [.5, .55, .75]; sunUp = .3; }
      L = norm(L);
      var sunC = sunP ? mix([1, .93, .78], [1, .58, .28], warm) : [0, 0, 0], sunDir = sunP ? norm([sunP[0] - eye[0], sunP[1] - eye[1], sunP[2] - eye[2]]) : [0, 0, 0];
      gl.uniform3fv(U.uLight, L); gl.uniform3fv(U.uLc, lc); gl.uniform3fv(U.uTint, tint); gl.uniform3fv(U.uCam, eye);
      gl.uniform3fv(U.uSky, lum(mix(skyHor, skyTop, .45), .78)); gl.uniform3fv(U.uGnd, lum(mix(grass, [.8, .66, .48], .5), .5));  // hue from the hour; the tint sets how dark
      gl.uniform3fv(U.uFogC, [skyHor[0] * tint[0], skyHor[1] * tint[1], skyHor[2] * tint[2]]); gl.uniform3fv(U.uSunC, sunC); gl.uniform3fv(U.uSunDir, sunDir);
      gl.uniform3fv(U.uRight, right); gl.uniform3fv(U.uUp, cup); gl.uniform3fv(U.uFwd, fwd); gl.uniform2f(U.uFxy, fx, fy);
      gl.uniform2f(U.uArena, W, DZ); gl.uniform1f(U.uFl, fl); gl.uniform1f(U.uLights, sk.lights || 0); gl.uniform1f(U.uT, t / 1000); gl.uniform1f(U.uExpo, ex);

      gl.clearColor(skyTop[0], skyTop[1], skyTop[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.disable(gl.DEPTH_TEST);
      gl.uniformMatrix4fv(U.uP, false, ID); draw(QD, 3, S(2, -2, 1), skyTop, skyHor);
      gl.uniformMatrix4fv(U.uP, false, PV);
      if (sk.stars > .02) {
        gl.bindBuffer(gl.ARRAY_BUFFER, starBuf); bound = null;
        gl.vertexAttribPointer(A.pos, 3, gl.FLOAT, false, 32, 0); gl.vertexAttribPointer(A.nrm, 3, gl.FLOAT, false, 32, 12); gl.vertexAttribPointer(A.uv, 2, gl.FLOAT, false, 32, 24);
        gl.uniform1i(U.uMode, 6); gl.uniformMatrix4fv(U.uM, false, T(cx, fl, cz)); gl.uniform1f(U.uPt, 2.8 * canvas.width / W); gl.uniform4f(U.uC0, 1, 1, 1, sk.stars * .9);
        gl.drawArrays(gl.POINTS, 0, NSTAR);
      }
      if (moonP) { billboard(moonP[0], moonP[1], moonP[2], 520, 520, [.85, .88, 1, .12], .05); billboard(moonP[0], moonP[1], moonP[2], 120, 120, [.96, .95, .88, 1], .8); }
      clouds.forEach(function (c) {
        var a = c.a + t / 1000 * c.sp * .01, x = cx + Math.cos(a) * c.r, z = cz + Math.sin(a) * c.r, y = fl - c.y;
        [[-.22, .22, 100, 60], [.05, 0, 120, 82], [.3, .2, 92, 56], [.04, .34, 190, 34], [-.08, .1, 80, 60]].forEach(function (e) { billboard(x + e[0] * 300 * c.k, y + e[1] * 100 * c.k, z, e[2] * 2 * c.k, e[3] * 2 * c.k, [cloud[0], cloud[1], cloud[2], .9], 0, 12); });
      });
      gl.enable(gl.DEPTH_TEST);
      // the ground, then every shadow multiplied into it
      draw(QD, 4, chain(T(cx, fl, cz), Rx(-90), S(9000, 9000, 1)), grass, gBack, gFront);
      palms.forEach(function (p) { var tx = p.x + Math.sin(p.lean * Math.PI / 180) * p.h * .5; shadow(tx, p.z, p.h * .32, .17, p.h * .35); });
      s.bushes.forEach(function (bu) { shadow(bu.x, bu.z, 40, .3, 12); });
      shadow(s.bench.x + s.bench.w / 2, s.bench.z, s.bench.w * .55, .28, 20);
      lamps.forEach(function (l) { shadow(l.x, l.z, 8, .25, 60); });
      var bl = s.ball; shadow(bl.x, bl.z, bl.r * 1.3, .32 * Math.max(.3, 1 - (fl - bl.r - bl.y) / 200), fl - bl.y);
      var all = s.buddies.slice(); if (s.main) all.push(s.main);
      all.forEach(function (b) { if (b.el === api.hideEl) return; var fy2 = b.floor || fl, sc2 = Math.max(.35, Math.min(1, 1 - (fy2 - b.r - b.y) / 300)); shadow(b.x, b.z, b.r * 1.05 * sc2, .42 * sc2, fl - b.y); });
      flushShadows();
      // the hedge round the lawn
      [[cx, -9, W + 36, 18], [cx, DZ + 9, W + 36, 18], [-9, cz, 18, DZ + 36], [W + 9, cz, 18, DZ + 36]].forEach(function (h) { draw(CUBE, 8, chain(T(h[0], fl - 14, h[1]), S(h[2], 28, h[3])), hedge); });
      // the town: plaster blocks with windows, a parapet, sometimes something on the roof
      drawBaked(baked.town, 9); if (!lite) drawBaked(baked.far, 9);
      // palms: a ringed, slightly leaning trunk, a crown of drooping fronds swaying one by one, coconuts
      drawBaked(baked.trunks, 11); drawBaked(baked.fronds, 13, palm);
      flat(true); drawBaked(baked.nuts, 0); flat(false);
      // lamp posts at the corners of the walk; at night a warm head, a halo and a pool of light on the ground
      lamps.forEach(function (l) {
        draw(CYL, 0, chain(T(l.x, fl, l.z), S(2.6, 78, 2.6)), X([.24, .26, .28]));
        draw(CUBE, 0, chain(T(l.x, fl - 80, l.z), S(10, 4, 10)), X([.22, .24, .26]));
        var on = sk.lights || 0;
        draw(SPH, 7, chain(T(l.x, fl - 74, l.z), S(5, 5, 5)), mix(X([.8, .8, .78]), [1, .86, .55], on));
      });
      if (sk.lights > .02) {
        gl.depthMask(false); gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        lamps.forEach(function (l) {
          billboard(l.x, fl - 74, l.z, 70, 70, [1, .78, .45, .35 * sk.lights], 0);
          gl.uniform1f(U.uA, 0); draw(QD, 5, chain(T(l.x, fl - .8, l.z), Rx(90), S(150, 150, 1)), [1, .75, .42, .3 * sk.lights]);
        });
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(true);
      }
      // the bench: two seat planks, a backrest, legs
      var bn = s.bench, wood = X([.62, .44, .28]);
      [-6, 6].forEach(function (o) { draw(CUBE, 0, chain(T(bn.x + bn.w / 2, bn.top + 3.5, bn.z + o), S(bn.w, 5, 11)), wood); });
      draw(CUBE, 0, chain(T(bn.x + bn.w / 2, bn.top - 12, bn.z - 13), S(bn.w - 4, 8, 4)), mix(wood, [1, 1, 1], .08));
      [bn.x + 12, bn.x + bn.w - 12].forEach(function (lx) {
        draw(CUBE, 0, chain(T(lx, bn.top + 17, bn.z + 8), S(5, 20, 5)), X([.3, .3, .32])); draw(CUBE, 0, chain(T(lx, bn.top + 8, bn.z - 12), S(5, 38, 5)), X([.3, .3, .32]));
      });
      // bushes: faceted clumps on a little mound
      flat(true);
      s.bushes.forEach(function (bu) {
        draw(LOW, 0, chain(T(bu.x, fl + 2, bu.z), S(42, 9, 30)), mix(gBack, [.45, .35, .25], .3));
        [[-17, -16, 17, 6], [3, -24, 22, -4], [21, -15, 16, 8], [-4, -14, 15, -14], [10, -12, 14, 16], [-10, -28, 12, 2]].forEach(function (k, i) {
          draw(LOW, 0, chain(T(bu.x + k[0], fl + k[1] + 4, bu.z + k[3]), Ry(i), S(k[2], k[2] * .92, k[2])), mix(bush, [.3, .5, .25], (i % 3) * .08));
        });
      });
      flat(false);
      // rolling: it turns about the axis across its path (w = up x v / r), so the panels roll the right way whichever way it goes
      var bsp = Math.hypot(bl.vx, bl.vz);
      if (bsp > .01 && bl.y >= fl - bl.r - 1) ballR = mul(rot3(-bl.vz / bsp, 0, bl.vx / bsp, bsp * dt / bl.r), ballR);
      if (++ballN % 120 === 0) ballR = ortho(ballR);
      gl.uniform3f(U.uB0, .94, .42, .36); gl.uniform3f(U.uB1, 1, 1, 1); gl.uniform3f(U.uB2, .25, .71, .78); gl.uniform1f(U.uRot, 0);
      draw(SPH, 2, chain(T(bl.x, bl.y, bl.z), ballR, S(bl.r, bl.r, bl.r)), [1, 1, 1]);
      // the characters: Dilmo and everyone else; a crouching friend sinks into the bush
      all.forEach(function (b) { if (b.el !== api.hideEl) body(b, t, dt, b.crouch ? b.r * .45 : 0); });
      faces.forEach(function (fc, el) { if (t - fc.touched > 5000) { gl.deleteTexture(fc.tex); faces.delete(el); } });
    }
    return (api = { canvas: canvas, frame: frame, resize: resize, scr: scr, unscr: unscr, ground: ground, cam: cam,
      axes: function () { var l = Math.hypot(fwd[0], fwd[2]) || 1; return { rx: right[0], rz: right[2], fx: fwd[0] / l, fz: fwd[2] / l }; },
      setView: function (m) { cam.mode = m; if (m !== "first" && locked()) document.exitPointerLock(); },
      viewNow: function () { return view.mode; }, locked: locked,
      shake: function (a) { if (!(last && last.reduce)) trauma = Math.min(1, trauma + a); },
      intro: function (dur, back) { cam.yaw = Math.atan2(Math.sin(cam.yaw), Math.cos(cam.yaw)); intro = { t0: performance.now(), dur: dur, back: back, yaw: cam.yaw, pitch: cam.pitch, zoom: cam.zoom }; },
      snapshot: function () { if (last) frame(last); return canvas; },
      lite: function () { return lite; },
      destroy: function () { api.onLost = null; document.removeEventListener("mousemove", onMouseLook); if (locked()) document.exitPointerLock(); var ext = gl.getExtension("WEBGL_lose_context"); if (ext) ext.loseContext(); canvas.remove(); } });
  }
  window.Dilmo3D = { create: create };
})();
