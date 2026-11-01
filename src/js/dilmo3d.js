/* دلمو ثلاثي الأبعاد: رسم فقط. المنطق كله (الفيزياء، المزاج، الكلام، اللمس) يبقى في dilmo.js،
   وهذا الملف يستلم لقطة الحالة كل إطار ويرسمها بـWebGL بلا أي مكتبة. يتحمّل فقط لما يضغط الزائر زر البوابة.
   الإحداثيات نفس إحداثيات الـ2D (بكسل، y للأسفل، z نحو المشاهد): كل ما على مستوى z=0 يطابق مكانه في الـ2D
   بالضبط، فوجوه الـSVG تبقى فوق الكرات وتنطبق عليها. */
(function () {
  var VS = [
    "attribute vec3 aPos; attribute vec3 aNrm; attribute vec2 aUv;",
    "uniform mat4 uP, uM; uniform mat3 uN; uniform float uR, uPt; uniform vec4 uRim[24]; uniform mediump int uMode;",  // mediump: the fragment side's default
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
    "uniform int uMode; uniform vec4 uC0, uC1, uC2; uniform vec3 uLight, uLc, uAmb, uTint, uCam, uB0, uB1, uB2;",
    "uniform float uA, uRot, uHor;",
    "float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }",
    "void main() {",
    "  vec3 c = uC0.rgb; float al = uC0.a; vec3 n = normalize(vN); vec3 V = normalize(uCam - vW); float nd = dot(n, uLight);",
    "  if (uMode == 3) c = mix(uC0.rgb, uC1.rgb, clamp(vUv.y / uHor, 0.0, 1.0)) + (hash(floor(gl_FragCoord.xy / 2.0)) - 0.5) * 0.025;",  // sky
    "  else if (uMode == 4) {",  // ground: a lawn where everyone stands, soil nearer, haze toward the horizon
    "    vec3 soil = mix(uC1.rgb, uC2.rgb, smoothstep(-1400.0, 300.0, vW.z));",
    "    c = mix(soil, uC0.rgb, smoothstep(-90.0, -40.0, vW.z));",
    "    c += (hash(floor(vW.xz / 3.0)) - 0.5) * 0.05;",
    "    c = mix(c, uAmb, smoothstep(-700.0, -3200.0, vW.z) * 0.9);",
    "  }",
    "  else if (uMode == 1) {",  // a character: three colours like the 2D gradient, plus a highlight, sky light on the edge and grain
    "    c = mix(uC2.rgb, uC1.rgb, smoothstep(-0.75, 0.3, nd)); c = mix(c, uC0.rgb, smoothstep(0.35, 1.0, nd) * 0.9);",
    "    vec3 h = normalize(uLight + V); c += uLc * pow(max(dot(n, h), 0.0), 36.0) * 0.3;",
    "    c += uAmb * pow(1.0 - max(dot(n, V), 0.0), 3.0) * 0.3;",
    "    c += (hash(floor(gl_FragCoord.xy / 1.5)) - 0.5) * 0.14;",
    "  }",
    "  else if (uMode == 2) {",  // the ball: six colour sectors turning with it
    "    float a = mod(atan(vL.y, vL.x) + uRot, 6.2831853); int s = int(floor(a / 1.0471976));",
    "    c = s == 0 ? uB0 : s == 2 ? uB2 : s == 4 ? vec3(0.95, 0.76, 0.3) : uB1;",
    "    c *= 0.6 + 0.4 * max(nd, 0.0); vec3 h2 = normalize(uLight + V); c += vec3(pow(max(dot(n, h2), 0.0), 50.0) * 0.5);",
    "  }",
    "  else if (uMode == 5) { float d = length(vUv * 2.0 - 1.0); al *= 1.0 - smoothstep(uA, 1.0, d); }",  // a soft disc: shadows, sun, moon, clouds
    "  else if (uMode == 6) { float d = length(gl_PointCoord - 0.5) * 2.0; al *= 1.0 - smoothstep(0.4, 1.0, d); }",  // stars
    "  else if (uMode == 0) c = uC0.rgb * (0.55 + 0.45 * max(nd, 0.0)) + uAmb * 0.06;",  // plain lit solid
    "  if (uMode != 5 && uMode != 6 && uMode != 7) c *= uTint;",
    "  gl_FragColor = vec4(c, al);",
    "}"].join("\n");

  // ---- tiny matrix kit (column-major, like WebGL wants) ----
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
  function chain() { var m = arguments[0]; for (var i = 1; i < arguments.length; i++) m = mul(m, arguments[i]); return m; }
  function n3(m) { return new Float32Array([m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]]); }

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
      var u = n[1] ? [1, 0, 0] : [0, 1, 0], w = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
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
    var out = /^#/.test(h) ? [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255] : (fb || [.5, .5, .5]);
    if (h === "#010203") out = fb || [.5, .5, .5];
    return (ccache[s] = out);
  }
  function mix(a, b, p) { return [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p, a[2] + (b[2] - a[2]) * p]; }
  function seeded(s) { return function () { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

  function create(host, W, H, K) {
    var canvas = document.createElement("canvas"); canvas.className = "d3";
    var gl = canvas.getContext("webgl", { antialias: true, alpha: false, premultipliedAlpha: false, powerPreference: "low-power" });
    if (!gl) return null;
    host.insertBefore(canvas, host.firstChild);

    function shader(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
    var prog = gl.createProgram(); gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    var U = {}; ["uP", "uM", "uN", "uR", "uPt", "uRim", "uMode", "uC0", "uC1", "uC2", "uLight", "uLc", "uAmb", "uTint", "uCam", "uB0", "uB1", "uB2", "uA", "uRot", "uHor"].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    var A = { pos: gl.getAttribLocation(prog, "aPos"), nrm: gl.getAttribLocation(prog, "aNrm"), uv: gl.getAttribLocation(prog, "aUv") };
    function mesh(m) {
      var vb = gl.createBuffer(), ib = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(m.v), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(m.ix), gl.STATIC_DRAW);
      return { vb: vb, ib: ib, n: m.ix.length };
    }
    var SPH = mesh(sphere(28, 18)), CUBE = mesh(cube()), QD = mesh(QUAD), starBuf = gl.createBuffer(), NSTAR = 70;
    var bound = null;
    function bind(m) {
      if (bound === m) return; bound = m;
      gl.bindBuffer(gl.ARRAY_BUFFER, m.vb); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.ib);
      gl.vertexAttribPointer(A.pos, 3, gl.FLOAT, false, 32, 0); gl.vertexAttribPointer(A.nrm, 3, gl.FLOAT, false, 32, 12); gl.vertexAttribPointer(A.uv, 2, gl.FLOAT, false, 32, 24);
    }
    gl.enableVertexAttribArray(A.pos); gl.enableVertexAttribArray(A.nrm); gl.enableVertexAttribArray(A.uv);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.enable(gl.DEPTH_TEST);
    var ZERO = new Float32Array(96), ID = I();
    gl.uniform4fv(U.uRim, ZERO);

    var P, D, cx, cy, town = [], palms = [], stars = [];
    function resize(w, h, k) {
      W = w; H = h; K = k || 1; cx = W / 2; cy = H / 2; D = H * 1.5;
      var dpr = Math.min(2, devicePixelRatio || 1) * K;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); canvas.style.width = W + "px"; canvas.style.height = H + "px";
      gl.viewport(0, 0, canvas.width, canvas.height);
      // perspective whose z=0 plane maps 1:1 onto the stage's pixels (so the SVG faces land on the spheres)
      var n = 40, f = 7000, a = (f + n) / (f - n);
      P = new Float32Array([2 * D / W, 0, 0, 0, 0, -2 * D / H, 0, 0, 0, 0, -a, -1, -2 * D * cx / W, 2 * D * cy / H, a * D - 2 * n * f / (f - n), D]);
      // the far town and the palms: fixed per width, so they never jump between frames
      var rnd = seeded(7), x; town = []; palms = [];
      [[-760, 55, 150, 0], [-470, 35, 110, 1]].forEach(function (row) {
        for (x = -300; x < W + 300;) { var w2 = 30 + rnd() * 70, hh = row[1] + rnd() * (row[2] - row[1]), b = { x: x, w: w2, h: hh, z: row[0], row: row[3], win: [] };
          if (row[3]) for (var q = 0; q < 1 + Math.floor(rnd() * 3); q++) b.win.push([x + 5 + rnd() * (w2 - 14), hh - 8 - rnd() * (hh - 20)]);
          town.push(b); x += w2 + 10 + rnd() * 70; }
      });
      for (var i = 0; i < 6; i++) palms.push({ x: -100 + rnd() * (W + 200), z: -420 + rnd() * 300, h: 90 + rnd() * 60, ph: rnd() * 6 });
      palms.push({ x: W * .86, z: -26, h: 150, ph: 1 });  // the near palm, where the 2D one stands
      stars = []; var sr = seeded(3); for (i = 0; i < NSTAR; i++) stars.push(sr() * 2 - 1, 1 - sr() * .9, 0, 0, 0, 0, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, starBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(stars), gl.STATIC_DRAW); bound = null;
    }
    resize(W, H, K);

    var rimBuf = new Float32Array(96);
    function draw(m, mode, M, c0, c1, c2) {
      bind(m); gl.uniform1i(U.uMode, mode); gl.uniformMatrix4fv(U.uM, false, M); gl.uniformMatrix3fv(U.uN, false, n3(M));
      if (c0) gl.uniform4f(U.uC0, c0[0], c0[1], c0[2], c0.length > 3 ? c0[3] : 1);
      if (c1) gl.uniform4f(U.uC1, c1[0], c1[1], c1[2], 1);
      if (c2) gl.uniform4f(U.uC2, c2[0], c2[1], c2[2], 1);
      gl.drawElements(gl.TRIANGLES, m.n, gl.UNSIGNED_SHORT, 0);
    }
    // a quad in stage pixels, flat on the screen (sun, moon, clouds): drawn with the identity projection
    function screenQuad(x, y, w, h, c, soft) {
      gl.uniformMatrix4fv(U.uP, false, ID); gl.uniform1f(U.uA, soft);
      draw(QD, 5, chain(T(x / W * 2 - 1, 1 - y / H * 2, 0), S(w * 2 / W, h * 2 / H, 1)), c);
    }
    function body(b, fl, z) {
      // same transform as the 2D body: spin about the centre, tilt and squash about the point touching the floor
      var r = b.r, M = chain(T(b.x, b.y, z || 0), Rz(b.spin), T(0, r, 0), Rz(b.tilt), S(r * b.sx, r * b.sy, r * Math.min(b.sx, b.sy)), T(0, -1, 0));
      for (var i = 0; i < 48; i++) { var p = b.pts[i]; rimBuf[i * 2] = p.x; rimBuf[i * 2 + 1] = p.y; }
      gl.uniform4fv(U.uRim, rimBuf); gl.uniform1f(U.uR, r);
      draw(SPH, 1, M, col(b.cols[0]), col(b.cols[1]), col(b.cols[2]));
      gl.uniform4fv(U.uRim, ZERO);
    }
    function shadow(x, fl, w, a, z) {
      gl.depthMask(false); gl.uniform1f(U.uA, .15);
      draw(QD, 5, chain(T(x, fl - .6, z || 0), Rx(90), S(w, w * .32, 1)), [.08, .09, .16, a]);
      gl.depthMask(true);
    }

    var last = null;
    function frame(s) {
      last = s;
      var sk = s.sky, fl = s.fl, t = s.t;
      var skyTop = col(sk["--sky-top"]), skyHor = col(sk["--sky-hor"]), far1 = col(sk["--far1"]), far2 = col(sk["--far2"]), grass = col(sk["--grass"]);
      var gBack = col(sk["--g-back"]), gFront = col(sk["--g-front"]), tint = col(sk["--tint"], [1, 1, 1]), cloud = col(sk["--cloud"], [1, 1, 1]);
      var palm = mix(grass, [.12, .24, .18], .45), trunk = mix(palm, [.42, .29, .18], .45), bush = mix(grass, [.11, .23, .17], .2), soil = mix(gBack, gFront, .5);
      // the light of the hour: from the sun by day, the moon by night; the pointer bends it a little so the spheres answer the hand
      var L, lc, px = s.ptr ? (s.ptr.x - cx) / W : 0;
      if (sk.sun) { L = [sk.sun.x - cx, sk.sun.y - fl, 700]; lc = mix([1, .97, .9], [1, .78, .55], sk.sun.warm || 0); }
      else if (sk.moon) { L = [sk.moon.x - cx, sk.moon.y - fl, 700]; lc = [.6, .66, .9]; }
      else { L = [-200, -500, 700]; lc = [.5, .55, .75]; }
      L[0] += px * 500; var ll = Math.hypot(L[0], L[1], L[2]); L = [L[0] / ll, L[1] / ll, L[2] / ll];
      gl.uniform3fv(U.uLight, L); gl.uniform3fv(U.uLc, lc); gl.uniform3fv(U.uAmb, skyHor); gl.uniform3fv(U.uTint, tint); gl.uniform3f(U.uCam, cx, cy, D);
      gl.uniform1f(U.uHor, .5);

      gl.clearColor(skyTop[0], skyTop[1], skyTop[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      // sky, stars, sun or moon, clouds: all flat on the screen, no depth
      gl.disable(gl.DEPTH_TEST); gl.uniformMatrix4fv(U.uP, false, ID);
      draw(QD, 3, chain(T(0, 0, 0), S(2, -2, 1)), skyTop, skyHor);
      if (sk.stars > .02) {
        gl.bindBuffer(gl.ARRAY_BUFFER, starBuf); bound = null;
        gl.vertexAttribPointer(A.pos, 3, gl.FLOAT, false, 32, 0); gl.vertexAttribPointer(A.nrm, 3, gl.FLOAT, false, 32, 12); gl.vertexAttribPointer(A.uv, 2, gl.FLOAT, false, 32, 24);
        gl.uniform1i(U.uMode, 6); gl.uniformMatrix4fv(U.uM, false, ID); gl.uniform1f(U.uPt, 2.6 * canvas.width / W); gl.uniform4f(U.uC0, 1, 1, 1, sk.stars * .9);
        gl.drawArrays(gl.POINTS, 0, NSTAR);
      }
      var skyY = function (y) { return y * cy / fl; };  // the 2D sky runs down to the floor; here it ends at the horizon
      if (sk.sun) { var sc = mix([1, .9, .66], [1, .6, .3], sk.sun.warm || 0); screenQuad(sk.sun.x, skyY(sk.sun.y), 230, 230, [sc[0], sc[1], sc[2], .35], .05); screenQuad(sk.sun.x, skyY(sk.sun.y), 46, 46, [1, .98, .92, 1], .7); }
      if (sk.moon) { screenQuad(sk.moon.x, skyY(sk.moon.y), 120, 120, [.85, .88, 1, .14], .05); screenQuad(sk.moon.x, skyY(sk.moon.y), 30, 30, [.95, .94, .88, 1], .75); }
      [[190, 40, .18, 1], [260, 150, .38, .7], [230, 90, .08, 1.2]].forEach(function (c) {  // the same three clouds as the CSS, drifting at the same pace
        var x = ((t / 1000 / c[0] * (W + 420) + c[1] * 9) % (W + 420)) - 210, y = c[2] * .9 * cy, k = c[3];
        [[.30, .70, 40, 22], [.55, .50, 46, 30], [.78, .72, 36, 20], [.54, .86, 70, 12]].forEach(function (e) { screenQuad(x + (e[0] - .5) * 170 * k, y + (e[1] - .5) * 52 * k, e[2] * 2 * k, e[3] * 2 * k, [cloud[0], cloud[1], cloud[2], .85], .55); });
      });
      gl.enable(gl.DEPTH_TEST); gl.uniformMatrix4fv(U.uP, false, P);
      // the ground: one big plane from in front of the stage to the horizon
      draw(QD, 4, chain(T(cx, fl, -1400), Rx(-90), S(W + 6000, 3200, 1)), grass, gBack, gFront);
      // the town: two rows of boxes, the back row paler (atmospheric perspective); windows light up at night
      town.forEach(function (b) { draw(CUBE, 0, chain(T(b.x + b.w / 2, fl - b.h / 2, b.z), S(b.w, b.h, 40)), b.row ? far2 : far1); });
      if (sk.lights > .02) { gl.uniform1f(U.uA, 0); town.forEach(function (b) { b.win.forEach(function (w) { draw(QD, 7, chain(T(w[0] + 3.5, fl - w[1], b.z + 20.5), S(7, 9, 1)), [1, .82, .48, sk.lights * .9]); }); }); }
      palms.forEach(function (p) {
        draw(CUBE, 0, chain(T(p.x, fl - p.h / 2, p.z), S(7, p.h, 7)), trunk);
        var sway = s.reduce ? 0 : Math.sin(t / 950 + p.ph) * 2.4, len = p.h * .5;
        [200, 235, 262, 278, 305, 340].forEach(function (ang, k) { draw(SPH, 0, chain(T(p.x, fl - p.h + 2, p.z + (k & 1 ? 5 : -5)), Rz(ang + sway), T(len / 2, 0, 0), S(len / 2, len * .11, 3)), palm); });
      });
      // the bench: seat, backrest, legs
      var bn = s.bench;
      draw(CUBE, 0, chain(T(bn.x + bn.w / 2, bn.top + 3.5, 0), S(bn.w, 7, 30)), [.6, .42, .26]);
      draw(CUBE, 0, chain(T(bn.x + bn.w / 2, bn.top - 12, -13), S(bn.w - 4, 7, 4)), [.69, .49, .31]);
      [bn.x + 12, bn.x + bn.w - 12].forEach(function (lx) { draw(CUBE, 0, chain(T(lx, bn.top + 17, 8), S(5, 20, 5)), [.43, .29, .17]); draw(CUBE, 0, chain(T(lx, bn.top + 17, -10), S(5, 20, 5)), [.43, .29, .17]); });
      s.bushes.forEach(function (bx) {
        draw(SPH, 0, chain(T(bx, fl + 2, 30), S(42, 10, 26)), soil);
        [[-17, -16, 17], [3, -24, 22], [21, -15, 16]].forEach(function (k) { draw(SPH, 0, chain(T(bx + k[0], fl + k[1] + 4, 30), S(k[2], k[2], k[2])), bush); });
      });
      var bl = s.ball;
      gl.uniform3f(U.uB0, .94, .42, .36); gl.uniform3f(U.uB1, 1, 1, 1); gl.uniform3f(U.uB2, .25, .71, .78); gl.uniform1f(U.uRot, bl.rot * Math.PI / 180);
      draw(SPH, 2, chain(T(bl.x, bl.y, 0), S(bl.r, bl.r, bl.r)), [1, 1, 1]);
      shadow(bl.x, fl, bl.r * 2.2, .3 * Math.max(.3, 1 - (fl - bl.r - bl.y) / 200));
      // the characters: Dilmo and everyone else, each on its 2D spot; a crouching friend slips back behind the bush
      var all = s.buddies.slice(); if (s.main) all.push(s.main);
      all.forEach(function (b) {
        var z = b.crouch ? -54 : 0, fy = b.floor || fl, sc2 = Math.max(.35, Math.min(1, 1 - (fy - b.r - b.y) / 300));
        shadow(b.x, fy, b.r * 1.7 * sc2, .38 * sc2, z);
        body(b, fl, z);
      });
    }
    return { canvas: canvas, frame: frame, resize: resize,
      snapshot: function () { if (last) frame(last); return canvas; },
      destroy: function () { var ext = gl.getExtension("WEBGL_lose_context"); if (ext) ext.loseContext(); canvas.remove(); } };
  }
  window.Dilmo3D = { create: create };
})();
