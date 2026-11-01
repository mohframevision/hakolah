/* دلمو ثلاثي الأبعاد: رسم فقط، بـWebGL بلا أي مكتبة، ويتحمّل عند الضغط على زر البوابة فقط.
   المنطق كله (الفيزياء، المزاج، الكلام، اللمس) يبقى في dilmo.js، وهذا الملف يستلم لقطة الحالة كل إطار ويرسمها،
   ويعيد لـdilmo.js ثلاث دوال: scr (نقطة في العالم → مكانها على الشاشة) وunscr (العكس، للسحب) وground (مؤشر → نقطة على الأرض).
   الإحداثيات نفس إحداثيات dilmo.js: بكسل، x يميناً، y للأسفل، z العمق (0 الخلف، DZ الأمام). الساحة محاطة بسياج. */
(function () {
  var VS = [
    "attribute vec3 aPos; attribute vec3 aNrm; attribute vec2 aUv;",
    "uniform mat4 uP, uM; uniform mat3 uN; uniform float uR, uPt; uniform vec4 uRim[24]; uniform mediump int uMode;",
    "varying vec3 vN, vW, vL; varying vec2 vUv;",
    // the 2D rim (48 points of x,y offsets, in px) packed two per vec4
    "vec2 rimAt(int i) { i = i - (i / 48) * 48; vec4 v = uRim[i / 2]; return (i - (i / 2) * 2) == 0 ? v.xy : v.zw; }",
    "void main() {",
    "  vec3 p = aPos; vUv = aUv; vL = aPos;",
    "  if (uMode == 1) {",  // soft body: push the sphere out along the 2D rim, fully at the silhouette, not at all at the poles
    "    float a = atan(p.y, p.x); if (a < 0.0) a += 6.2831853;",
    "    float fi = a / 6.2831853 * 48.0; int i0 = int(floor(fi)); float f = fract(fi);",
    "    p.xy += mix(rimAt(i0), rimAt(i0 + 1), f) / uR * length(p.xy);",
    "  }",
    "  vec4 w = uM * vec4(p, 1.0); vW = w.xyz; vN = normalize(uN * aNrm);",
    "  gl_Position = uP * w; gl_PointSize = uPt;",
    "}"].join("\n");
  var FS = [
    "precision mediump float;",
    "varying vec3 vN, vW, vL; varying vec2 vUv;",
    "uniform int uMode; uniform vec4 uC0, uC1, uC2; uniform vec3 uLight, uLc, uAmb, uTint, uCam, uB0, uB1, uB2; uniform vec2 uArena;",
    "uniform float uA, uRot, uHor; uniform sampler2D uFace;",
    "float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }",
    "void main() {",
    "  vec3 c = uC0.rgb; float al = uC0.a; vec3 n = normalize(vN); vec3 V = normalize(uCam - vW); float nd = dot(n, uLight);",
    "  if (uMode == 3) c = mix(uC0.rgb, uC1.rgb, clamp(vUv.y / uHor, 0.0, 1.0)) + (hash(floor(gl_FragCoord.xy / 2.0)) - 0.5) * 0.025;",  // sky
    "  else if (uMode == 4) {",  // ground: a lawn inside the hedge, soil outside, haze far away
    "    float inA = smoothstep(-8.0, 8.0, vW.x) * smoothstep(-8.0, 8.0, uArena.x - vW.x) * smoothstep(-8.0, 8.0, vW.z) * smoothstep(-8.0, 8.0, uArena.y - vW.z);",
    "    c = mix(mix(uC1.rgb, uC2.rgb, 0.5), uC0.rgb, inA) + (hash(floor(vW.xz / 3.0)) - 0.5) * 0.05;",
    "    c = mix(c, uAmb, smoothstep(1400.0, 5200.0, length(uCam - vW)) * 0.9);",
    "  }",
    "  else if (uMode == 1) {",  // a character: the three colours of the 2D gradient, a highlight, sky light on the edge, and its face as a decal on the front
    "    c = mix(uC2.rgb, uC1.rgb, smoothstep(-0.75, 0.3, nd)); c = mix(c, uC0.rgb, smoothstep(0.35, 1.0, nd) * 0.9);",
    "    vec3 h = normalize(uLight + V); c += uLc * pow(max(dot(n, h), 0.0), 36.0) * 0.3;",
    "    c += uAmb * pow(1.0 - max(dot(n, V), 0.0), 3.0) * 0.3;",
    "    if (vL.z > 0.0) { vec4 fc = texture2D(uFace, vec2(0.5 + vL.x * 0.4, 0.5 + vL.y * 0.4)); c = mix(c, fc.rgb, fc.a); }",
    "  }",
    "  else if (uMode == 2) {",  // the ball: six colour sectors turning with it
    "    float a = mod(atan(vL.y, vL.z) + uRot, 6.2831853); int s = int(floor(a / 1.0471976));",
    "    c = s == 0 ? uB0 : s == 2 ? uB2 : s == 4 ? vec3(0.95, 0.76, 0.3) : uB1;",
    "    c *= 0.6 + 0.4 * max(nd, 0.0); vec3 h2 = normalize(uLight + V); c += vec3(pow(max(dot(n, h2), 0.0), 50.0) * 0.5);",
    "  }",
    "  else if (uMode == 5) { float d = length(vUv * 2.0 - 1.0); al *= 1.0 - smoothstep(uA, 1.0, d); }",  // a soft disc: shadows, sun, moon, clouds
    "  else if (uMode == 6) { float d = length(gl_PointCoord - 0.5) * 2.0; al *= 1.0 - smoothstep(0.4, 1.0, d); }",  // stars
    "  else if (uMode == 0) c = uC0.rgb * (0.55 + 0.45 * max(nd, 0.0)) + uAmb * 0.06;",  // plain lit solid
    "  if (uMode != 5 && uMode != 6 && uMode != 7) c *= uTint;",
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
  function n3(m) { return new Float32Array([m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]]); }
  function norm(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

  // ---- meshes: a sphere, a cube, a quad, all unit sized ----
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
  function seeded(s) { return function () { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
  function clamp(v, a, b) { return Math.min(Math.max(v, a), b); }

  // host: the .world element; W × DZ: the arena in world px; paintFace(ctx, el): dilmo.js draws a body's current face into a canvas
  function create(host, W, H, K, DZ, paintFace) {
    var canvas = document.createElement("canvas"); canvas.className = "d3";
    var gl = canvas.getContext("webgl", { antialias: true, alpha: false, premultipliedAlpha: false, powerPreference: "low-power" });
    if (!gl) return null;
    host.insertBefore(canvas, host.firstChild);
    var api = null;  // the renderer dies with its context (a phone dropping the GPU): tell dilmo.js so it can step back to the flat world
    canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); if (api && api.onLost) api.onLost(); });

    function shader(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
    var prog = gl.createProgram(); gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    var U = {}; ["uP", "uM", "uN", "uR", "uPt", "uRim", "uMode", "uC0", "uC1", "uC2", "uLight", "uLc", "uAmb", "uTint", "uCam", "uB0", "uB1", "uB2", "uA", "uRot", "uHor", "uFace", "uArena"].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    var A = { pos: gl.getAttribLocation(prog, "aPos"), nrm: gl.getAttribLocation(prog, "aNrm"), uv: gl.getAttribLocation(prog, "aUv") };
    function mesh(m) {
      var vb = gl.createBuffer(), ib = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(m.v), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(m.ix), gl.STATIC_DRAW);
      return { vb: vb, ib: ib, n: m.ix.length };
    }
    var SPH = mesh(sphere(32, 20)), CUBE = mesh(cube()), QD = mesh(QUAD), starBuf = gl.createBuffer(), NSTAR = 110;
    var bound = null;
    function bind(m) {
      if (bound === m) return; bound = m;
      gl.bindBuffer(gl.ARRAY_BUFFER, m.vb); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.ib);
      gl.vertexAttribPointer(A.pos, 3, gl.FLOAT, false, 32, 0); gl.vertexAttribPointer(A.nrm, 3, gl.FLOAT, false, 32, 12); gl.vertexAttribPointer(A.uv, 2, gl.FLOAT, false, 32, 24);
    }
    gl.enableVertexAttribArray(A.pos); gl.enableVertexAttribArray(A.nrm); gl.enableVertexAttribArray(A.uv);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.enable(gl.DEPTH_TEST);
    var ZERO = new Float32Array(96), ID = I();
    gl.uniform4fv(U.uRim, ZERO); gl.uniform1i(U.uFace, 0);
    // a blank face texture for things that have none (the ball, props)
    var blank = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, blank); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));

    // ---- the camera: orbits the middle of the arena; drag on empty ground turns it, wheel or pinch zooms ----
    var cam = { yaw: .55, pitch: .5, zoom: 1, orbiting: false }, base = 1000, fl = H * .85, eye = [0, 0, 0], fwd = [0, 0, -1], right = [1, 0, 0], cup = [0, -1, 0], PV = I(), fy = 1, fx = 1;
    var intro = null;  // the portal brings the camera from the flat view to its place
    function viewUpdate() {
      var tgt = [W / 2, fl - 40 - DZ * .04, DZ / 2], d = base * cam.zoom;
      eye = [tgt[0] + d * Math.sin(cam.yaw) * Math.cos(cam.pitch), tgt[1] - d * Math.sin(cam.pitch), tgt[2] + d * Math.cos(cam.yaw) * Math.cos(cam.pitch)];
      fwd = norm([tgt[0] - eye[0], tgt[1] - eye[1], tgt[2] - eye[2]]);
      right = norm(cross([0, -1, 0], fwd)); cup = cross(fwd, right);
      var V = new Float32Array([right[0], cup[0], -fwd[0], 0, right[1], cup[1], -fwd[1], 0, right[2], cup[2], -fwd[2], 0, -dot(right, eye), -dot(cup, eye), dot(fwd, eye), 1]);
      var n = 20, f = 9000; fy = 1 / Math.tan(.36); fx = fy * H / W;
      var P = new Float32Array([fx, 0, 0, 0, 0, fy, 0, 0, 0, 0, -(f + n) / (f - n), -1, 0, 0, -2 * f * n / (f - n), 0]);
      PV = mul(P, V);
    }
    function scr(x, y, z) {  // world → stage px (world units) + the on-screen scale of one world px there
      var cx = PV[0] * x + PV[4] * y + PV[8] * z + PV[12], cy = PV[1] * x + PV[5] * y + PV[9] * z + PV[13], cw = PV[3] * x + PV[7] * y + PV[11] * z + PV[15];
      if (cw < 1) cw = 1;
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
    canvas.addEventListener("pointerdown", function (e) {
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); cam.orbiting = true; e.preventDefault();
      var ks = Object.keys(ptrs); if (ks.length === 2) pinch = Math.hypot(ptrs[ks[0]].x - ptrs[ks[1]].x, ptrs[ks[0]].y - ptrs[ks[1]].y);
    });
    canvas.addEventListener("pointermove", function (e) {
      var p = ptrs[e.pointerId]; if (!p) return;
      var ks = Object.keys(ptrs);
      if (ks.length === 1) { cam.yaw += (e.clientX - p.x) * .006; cam.pitch = clamp(cam.pitch - (e.clientY - p.y) * .005, .12, 1.15); }
      p.x = e.clientX; p.y = e.clientY;
      if (ks.length === 2) { var d = Math.hypot(ptrs[ks[0]].x - ptrs[ks[1]].x, ptrs[ks[0]].y - ptrs[ks[1]].y); if (pinch) cam.zoom = clamp(cam.zoom * pinch / d, .55, 1.8); pinch = d; }
    });
    function pup(e) { delete ptrs[e.pointerId]; pinch = 0; if (!Object.keys(ptrs).length) cam.orbiting = false; }
    canvas.addEventListener("pointerup", pup); canvas.addEventListener("pointercancel", pup);
    canvas.addEventListener("wheel", function (e) { cam.zoom = clamp(cam.zoom * (e.deltaY > 0 ? 1.08 : .93), .55, 1.8); e.preventDefault(); }, { passive: false });

    var town = [], palms = [], clouds = [];
    function resize(w, h, k, dz) {
      W = w; H = h; K = k || 1; if (dz) DZ = dz;
      var dpr = Math.min(2, devicePixelRatio || 1) * K;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); canvas.style.width = W + "px"; canvas.style.height = H + "px";
      gl.viewport(0, 0, canvas.width, canvas.height);
      base = Math.max(W * 1.25 / (.75 * W / H), (DZ + 500) / .75, 700);
      // the town stands in two rings around the arena (the far ring paler), palms in the band between the hedge and the town
      var rnd = seeded(7); town = []; palms = []; clouds = [];
      // the side the camera starts on (south, +z) is kept clear right up to the far ring, so nothing stands between you and the arena
      [[520, 40, 120, 1], [860, 70, 180, 0]].forEach(function (ring) {
        var m = ring[0], ms = m + 1500, sides = [[-m, -m, W + m, -m, 0, 1], [-m, DZ + ms, W + m, DZ + ms, 0, -1], [-m, -m, -m, DZ + ms, 1, 0], [W + m, -m, W + m, DZ + ms, -1, 0]];  // x0 z0 x1 z1, inward normal
        sides.forEach(function (sd) {
          var len = Math.hypot(sd[2] - sd[0], sd[3] - sd[1]), ux = (sd[2] - sd[0]) / len, uz = (sd[3] - sd[1]) / len;
          for (var p = 0; p < len;) {
            var w2 = 40 + rnd() * 80, hh = ring[1] + rnd() * (ring[2] - ring[1]), b = { x: sd[0] + ux * (p + w2 / 2), z: sd[1] + uz * (p + w2 / 2), w: ux ? w2 : 40, d: ux ? 40 : w2, h: hh, row: ring[3], nx: sd[4], nz: sd[5], win: [], tone: .88 + rnd() * .24 };
            if (ring[3]) for (var q = 0; q < 1 + Math.floor(rnd() * 3); q++) b.win.push([(rnd() - .5) * (w2 - 16), hh - 10 - rnd() * (hh - 24)]);
            town.push(b); p += w2 + 12 + rnd() * 60;
          }
        });
      });
      for (var i = 0; i < 12; i++) {
        var side = [0, 2, 3][Math.floor(rnd() * 3)], off = 70 + rnd() * 380, along = rnd();  // none on the south side, where the camera starts
        palms.push({ x: side === 0 ? -300 + along * (W + 600) : (side === 2 ? -off : W + off), z: side === 0 ? -off : -300 + along * (DZ + 600), h: 90 + rnd() * 70, ph: rnd() * 6 });
      }
      for (i = 0; i < 5; i++) clouds.push({ a: rnd() * 6.28, r: 1300 + rnd() * 900, y: 520 + rnd() * 300, k: .8 + rnd() * .8, sp: .6 + rnd() * .8 });
      var st = [], sr = seeded(3);
      for (i = 0; i < NSTAR; i++) { var az = sr() * 6.2832, el = .08 + sr() * 1.3, cr = Math.cos(el); st.push(Math.cos(az) * cr * 4000, -Math.sin(el) * 4000, Math.sin(az) * cr * 4000, 0, 0, 0, 0, 0); }
      gl.bindBuffer(gl.ARRAY_BUFFER, starBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(st), gl.STATIC_DRAW); bound = null;
    }
    resize(W, H, K, DZ);

    var rimBuf = new Float32Array(96), faces = new Map();
    function draw(m, mode, M, c0, c1, c2) {
      bind(m); gl.uniform1i(U.uMode, mode); gl.uniformMatrix4fv(U.uM, false, M); gl.uniformMatrix3fv(U.uN, false, n3(M));
      if (c0) gl.uniform4f(U.uC0, c0[0], c0[1], c0[2], c0.length > 3 ? c0[3] : 1);
      if (c1) gl.uniform4f(U.uC1, c1[0], c1[1], c1[2], 1);
      if (c2) gl.uniform4f(U.uC2, c2[0], c2[1], c2[2], 1);
      gl.drawElements(gl.TRIANGLES, m.n, gl.UNSIGNED_SHORT, 0);
    }
    function billboard(x, y, z, w, h, c, soft) {  // a soft disc that always faces the camera
      gl.uniform1f(U.uA, soft);
      var M = new Float32Array([right[0] * w, right[1] * w, right[2] * w, 0, cup[0] * h, cup[1] * h, cup[2] * h, 0, fwd[0], fwd[1], fwd[2], 0, x, y, z, 1]);
      draw(QD, 5, M, c);
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
      // faces the way it moves; standing still, it turns to the camera
      gl.bindTexture(gl.TEXTURE_2D, fc.tex);
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
    function shadow(x, z, w, a) {
      gl.depthMask(false); gl.uniform1f(U.uA, .15);
      draw(QD, 5, chain(T(x, fl - .6, z), Rx(90), S(w, w, 1)), [.08, .09, .16, a]);
      gl.depthMask(true);
    }

    var last = null, lastT = 0;
    function frame(s) {
      last = s; fl = s.fl; var t = s.t, dt = Math.min(3, (t - lastT) / 16.67 || 1); lastT = t;
      if (intro) {
        var ip = clamp((t - intro.t0) / intro.dur, 0, 1), e = ip * ip * (3 - 2 * ip); if (intro.back) e = 1 - e;
        cam.yaw = intro.yaw * e; cam.pitch = .03 + (intro.pitch - .03) * e; cam.zoom = intro.zoom + (1.25 - intro.zoom) * (1 - e);
        if (ip >= 1) intro = null;
      }
      viewUpdate();
      var sk = s.sky, cx = W / 2, cz = DZ / 2;
      var skyTop = col(sk["--sky-top"]), skyHor = col(sk["--sky-hor"]), far1 = col(sk["--far1"]), far2 = col(sk["--far2"]), grass = col(sk["--grass"]);
      var gBack = col(sk["--g-back"]), gFront = col(sk["--g-front"]), tint = col(sk["--tint"], [1, 1, 1]), cloud = col(sk["--cloud"], [1, 1, 1]);
      var palm = mix(grass, [.12, .24, .18], .45), trunk = mix(palm, [.42, .29, .18], .45), bush = mix(grass, [.11, .23, .17], .2), soil = mix(gBack, gFront, .5);
      // sun and moon on a big arc around the arena (east on the left of the flat view), the light of the hour comes from them
      var span = fl * .86, sunP = null, moonP = null, L, lc;
      if (sk.sun) { var az = sk.sun.x / W * Math.PI, el = (fl - 10 - sk.sun.y) / (span * .85); sunP = [cx - Math.cos(az) * 2600, fl - 150 - el * 2000, cz - Math.sin(az) * 2600]; }
      if (sk.moon) { var az2 = sk.moon.x / W * Math.PI, el2 = (fl - 30 - sk.moon.y) / (span * .8); moonP = [cx - Math.cos(az2) * 2600, fl - 150 - el2 * 1800, cz - Math.sin(az2) * 2600]; }
      if (sunP) { L = [sunP[0] - cx, sunP[1] - fl, sunP[2] - cz]; lc = mix([1, .97, .9], [1, .78, .55], sk.sun.warm || 0); }
      else if (moonP) { L = [moonP[0] - cx, moonP[1] - fl, moonP[2] - cz]; lc = [.6, .66, .9]; }
      else { L = [-300, -600, 400]; lc = [.5, .55, .75]; }
      L = norm(L);
      gl.uniform3fv(U.uLight, L); gl.uniform3fv(U.uLc, lc); gl.uniform3fv(U.uAmb, skyHor); gl.uniform3fv(U.uTint, tint); gl.uniform3fv(U.uCam, eye); gl.uniform2f(U.uArena, W, DZ);
      // where the horizon falls on screen, for the sky gradient
      var hz = norm([fwd[0], 0, fwd[2]]), hy = dot(hz, cup) / Math.max(.05, dot(hz, fwd));
      gl.uniform1f(U.uHor, clamp((1 - fy * hy) / 2, .15, .95));

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
      if (sunP) { var sc = mix([1, .9, .66], [1, .6, .3], sk.sun.warm || 0); billboard(sunP[0], sunP[1], sunP[2], 900, 900, [sc[0], sc[1], sc[2], .35], .05); billboard(sunP[0], sunP[1], sunP[2], 190, 190, [1, .98, .92, 1], .7); }
      if (moonP) { billboard(moonP[0], moonP[1], moonP[2], 460, 460, [.85, .88, 1, .14], .05); billboard(moonP[0], moonP[1], moonP[2], 120, 120, [.95, .94, .88, 1], .75); }
      clouds.forEach(function (c) {
        var a = c.a + t / 1000 * c.sp * .01, x = cx + Math.cos(a) * c.r, z = cz + Math.sin(a) * c.r, y = fl - c.y;
        [[-.2, .2, 100, 55], [.05, 0, 115, 75], [.28, .22, 90, 50], [.04, .36, 175, 30]].forEach(function (e) { billboard(x + e[0] * 300 * c.k, y + e[1] * 100 * c.k, z, e[2] * 2 * c.k, e[3] * 2 * c.k, [cloud[0], cloud[1], cloud[2], .85], .55); });
      });
      gl.enable(gl.DEPTH_TEST);
      // the ground, the hedge round the arena, the town, the palms
      draw(QD, 4, chain(T(cx, fl, cz), Rx(-90), S(9000, 9000, 1)), grass, gBack, gFront);
      [[cx, -9, W + 36, 18], [cx, DZ + 9, W + 36, 18], [-9, cz, 18, DZ + 36], [W + 9, cz, 18, DZ + 36]].forEach(function (h) { draw(CUBE, 0, chain(T(h[0], fl - 13, h[1]), S(h[2], 26, h[3])), bush); });
      town.forEach(function (b) { var tc = b.row ? far2 : far1; draw(CUBE, 0, chain(T(b.x, fl - b.h / 2, b.z), S(b.w, b.h, b.d)), [tc[0] * b.tone, tc[1] * b.tone, tc[2] * b.tone]); });
      if (sk.lights > .02) {
        gl.uniform1f(U.uA, 0);
        town.forEach(function (b) {
          if (!b.win.length) return;
          var rot = b.nz === 1 ? Ry(0) : b.nz === -1 ? Ry(Math.PI) : b.nx === 1 ? Ry(Math.PI / 2) : Ry(-Math.PI / 2);
          b.win.forEach(function (w) { draw(QD, 7, chain(T(b.x + b.nx * (b.w / 2 + .5) + (b.nz ? w[0] : 0), fl - w[1], b.z + b.nz * (b.d / 2 + .5) + (b.nx ? w[0] : 0)), rot, S(7, 9, 1)), [1, .82, .48, sk.lights * .9]); });
        });
      }
      palms.forEach(function (p) {
        draw(CUBE, 0, chain(T(p.x, fl - p.h / 2, p.z), S(7, p.h, 7)), trunk);
        var sway = s.reduce ? 0 : Math.sin(t / 950 + p.ph) * 2.4, len = p.h * .5;
        [200, 235, 262, 278, 305, 340].forEach(function (ang, k) { draw(SPH, 0, chain(T(p.x, fl - p.h + 2, p.z), Ry(k * 1.05), Rz(ang + sway), T(len / 2, 0, 0), S(len / 2, len * .11, 3)), palm); });
      });
      // the bench, the bushes, the ball
      var bn = s.bench;
      draw(CUBE, 0, chain(T(bn.x + bn.w / 2, bn.top + 3.5, bn.z), S(bn.w, 7, 30)), [.6, .42, .26]);
      draw(CUBE, 0, chain(T(bn.x + bn.w / 2, bn.top - 12, bn.z - 13), S(bn.w - 4, 7, 4)), [.69, .49, .31]);
      [bn.x + 12, bn.x + bn.w - 12].forEach(function (lx) { draw(CUBE, 0, chain(T(lx, bn.top + 17, bn.z + 8), S(5, 20, 5)), [.43, .29, .17]); draw(CUBE, 0, chain(T(lx, bn.top + 17, bn.z - 10), S(5, 20, 5)), [.43, .29, .17]); });
      s.bushes.forEach(function (bu) {
        draw(SPH, 0, chain(T(bu.x, fl + 2, bu.z), S(42, 10, 30)), soil);
        [[-17, -16, 17, 6], [3, -24, 22, -4], [21, -15, 16, 8], [-4, -14, 15, -14], [10, -12, 14, 16]].forEach(function (k) { draw(SPH, 0, chain(T(bu.x + k[0], fl + k[1] + 4, bu.z + k[3]), S(k[2], k[2], k[2])), bush); });
      });
      var bl = s.ball;
      gl.uniform3f(U.uB0, .94, .42, .36); gl.uniform3f(U.uB1, 1, 1, 1); gl.uniform3f(U.uB2, .25, .71, .78); gl.uniform1f(U.uRot, bl.rot * Math.PI / 180);
      draw(SPH, 2, chain(T(bl.x, bl.y, bl.z), Ry(Math.atan2(bl.vx, bl.vz || 1e-6)), S(bl.r, bl.r, bl.r)), [1, 1, 1]);
      shadow(bl.x, bl.z, bl.r * 2.2, .3 * Math.max(.3, 1 - (fl - bl.r - bl.y) / 200));
      // the characters: Dilmo and everyone else; a crouching friend sinks into the bush
      var all = s.buddies.slice(); if (s.main) all.push(s.main);
      all.forEach(function (b) {
        var fy2 = b.floor || fl, sc2 = Math.max(.35, Math.min(1, 1 - (fy2 - b.r - b.y) / 300));
        shadow(b.x, b.z, b.r * 1.7 * sc2, .38 * sc2);
        body(b, t, dt, b.crouch ? b.r * .45 : 0);
      });
      faces.forEach(function (fc, el) { if (t - fc.touched > 5000) { gl.deleteTexture(fc.tex); faces.delete(el); } });
    }
    return (api = { canvas: canvas, frame: frame, resize: resize, scr: scr, unscr: unscr, ground: ground, cam: cam,
      axes: function () { var l = Math.hypot(fwd[0], fwd[2]) || 1; return { rx: right[0], rz: right[2], fx: fwd[0] / l, fz: fwd[2] / l }; },
      intro: function (dur, back) { cam.yaw = Math.atan2(Math.sin(cam.yaw), Math.cos(cam.yaw)); intro = { t0: performance.now(), dur: dur, back: back, yaw: cam.yaw, pitch: cam.pitch, zoom: cam.zoom }; },
      snapshot: function () { if (last) frame(last); return canvas; },
      destroy: function () { api.onLost = null; var ext = gl.getExtension("WEBGL_lose_context"); if (ext) ext.loseContext(); canvas.remove(); } });
  }
  window.Dilmo3D = { create: create };
})();
