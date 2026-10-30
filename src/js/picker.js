/* "اختار لي" — رحلة فوق البحر: الزائر راكب مركبة (قطار/سيارة/قارب/طيارة يختارها بنفسه)،
   وعناصر القسم المختار بطاقات تطفو بالهوا وتمر من الشباك، لين توقف المركبة على وحدة
   و"يطلّع راسه" من الشباك فتقرّب البطاقة وتصير النتيجة.
   تُحمَّل بصفحة picker.html فقط (pageScript)، بعد main.js، وتستخدم دواله العامة (t،
   itemTitle، sectionLabel، tagLabel، buildActionsHtml، wireItemActions، isSoundEnabled،
   getAudioContext، playClickSound، lsGet/lsSet). main.js يستدعي initRandomPicker.

   الأداء (أجهزة قديمة وجوالات): كل الحركة transform/opacity بـrAF على طبقات GPU — بلا
   blur ولا mix-blend-mode ولا صور. البطاقات اللي برا الشاشة ما تنرسم، والحركة الهادية
   وقت الانتظار تتوقف لما المشهد يطلع من الشاشة. حبيبات الفيلم بلاطة 128px تُرسم مرة
   وحدة، والقمر كذلك. */

// مسار السكربت نفسه — منه نبني مسار الأصوات بغض النظر عن مسار الموقع الأساسي
const PICKER_SCRIPT_URL = document.currentScript?.src || location.href;
const PICKER_AUDIO = (name) =>
  new URL(`../assets/audio/picker/${name}.mp3`, PICKER_SCRIPT_URL).href;

// كل مركبة لها طريقة وقوف: over = كم تتعدى الهدف (بكسل) قبل ما ترجع له، settle = مدة
// الرجوع. القارب ينزلق أطول ويتمايل، والطيارة تبطأ بنعومة بلا رجوع تقريباً.
// stopAt: صوت الوقوف يبدأ لما تنزل السرعة تحت هالنسبة (0 = عند الوقوف نفسه)
const TRIP_VEHICLES = {
  train: { icon: "🚆", dur: 4200, over: 14, settle: 500, stopAt: 0.35 },
  car: { icon: "🚗", dur: 4000, over: 26, settle: 650, stopAt: 0.2 },
  boat: { icon: "🛥️", dur: 4800, over: 60, settle: 1300, rock: 1, stopAt: 0.12 },
  plane: { icon: "✈️", dur: 4400, over: 8, settle: 900, rock: 0.5, stopAt: 0 },
};
const TRIP_VEHICLE_KEY = "pickerVehicle";
const TRIP_BOB_MS = 900 * 2 * Math.PI; // دورة تمايل البطاقات: نفس sin(t/900)
const TRIP_DIST = 5200; // مسافة الرحلة بوحدات الطبقة القريبة
// ثلاث طبقات عمق: البعيد صغير وبطيء وقريب من الأفق، القريب كبير وسريع
const TRIP_LANES = [
  { depth: 0.35, y: 0.4, gap: 330 },
  { depth: 0.62, y: 0.27, gap: 400 },
  { depth: 1, y: 0.47, gap: 470 },
];

// منحنى السرعة: تسارع سريع ثم فرملة طويلة ناعمة؛ نجمّعه مسبقاً لجدول مسافات
const TRIP_CURVE = (() => {
  const n = 400;
  const v = [];
  const acc = [0];
  for (let i = 0; i < n; i++) v.push(Math.min(1, i / n / 0.1) * (1 - i / n) ** 2.2);
  for (let i = 0; i < n; i++) acc.push(acc[i] + v[i]);
  const vMax = Math.max(...v);
  return (t) => {
    const i = Math.min(n - 1, Math.floor(t * n));
    return [acc[i] / acc[n], v[i] / vMax];
  };
})();

const tripEase = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const tripBack = (t) => 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2;

// كل الحركات بـrAF (مو CSS transitions) عشان تمشي على نفس الساعة
function tripTween(ms, fn, done) {
  const t0 = performance.now();
  (function frame(now) {
    const t = Math.min(1, (now - t0) / ms);
    fn(t);
    if (t < 1) requestAnimationFrame(frame);
    else done?.();
  })(t0);
}

/* ===== الصوت =====
   يتبع زر الصوت العام بالهيدر (مطفأ افتراضياً). يتحمّل فقط بعد أول ضغطة على "اختر لي!"
   وأصوات المركبة الحالية بس. صوت المركبة حلقة واحدة: ارتفاعها وحدّتها (playbackRate)
   يتبعون السرعة، فتسمع التسارع والفرملة بنفس الملف. الموسيقى بعنصر <audio> (تشتغل
   وهي تتحمّل)، والمؤثرات أخفض منها. الحقوق بصفحة "من نحن" (#credits). */
const TripSound = (() => {
  let ctx = null;
  let sfx = null;
  let master = null;
  let loopSrc = null;
  let loopGain = null;
  let music = null;
  let musicGain = null;
  const cache = {};

  function init() {
    if (ctx) return true;
    try {
      ctx = getAudioContext();
    } catch {
      return false;
    }
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
    sfx = ctx.createGain();
    sfx.gain.value = 0.22;
    sfx.connect(master);
    return true;
  }
  const load = (name) =>
    (cache[name] ||= fetch(PICKER_AUDIO(name))
      .then((r) => r.arrayBuffer())
      .then((b) => ctx.decodeAudioData(b))
      .catch(() => null));

  function play(name, gain = 1, rate = 1) {
    if (!ctx || !isSoundEnabled()) return;
    load(name).then((buf) => {
      if (!buf) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = rate;
      const g = ctx.createGain();
      g.gain.value = gain;
      src.connect(g).connect(sfx);
      src.start();
    });
  }

  function stopLoop(fade = 1.2) {
    if (!loopSrc) return;
    const src = loopSrc;
    loopSrc = null;
    loopGain.gain.setTargetAtTime(0, ctx.currentTime, fade / 4);
    src.stop(ctx.currentTime + fade);
  }

  function startMusic() {
    if (!music) {
      music = new Audio(PICKER_AUDIO("music"));
      music.loop = true;
      musicGain = ctx.createGain();
      musicGain.gain.value = 0;
      ctx.createMediaElementSource(music).connect(musicGain).connect(master);
      musicGain.gain.setTargetAtTime(0.25, ctx.currentTime, 0.8);
    }
    if (music.paused) music.play().catch(() => {});
  }

  async function start(vehicle, isRunning) {
    if (!isSoundEnabled() || !init()) return;
    startMusic();
    stopLoop(0.1);
    load(`${vehicle}-stop`);
    ["whoosh", "headout", "wind"].forEach(load);
    const buf = await load(`${vehicle}-loop`);
    if (!buf || !isRunning()) return;
    loopSrc = ctx.createBufferSource();
    loopSrc.buffer = buf;
    loopSrc.loop = true;
    loopGain = ctx.createGain();
    loopGain.gain.value = 0;
    loopSrc.connect(loopGain).connect(sfx);
    loopSrc.start();
  }

  function speed(v) {
    if (!loopSrc) return;
    loopGain.gain.setTargetAtTime(0.15 + 0.55 * v, ctx.currentTime, 0.1);
    loopSrc.playbackRate.setTargetAtTime(0.8 + 0.35 * v, ctx.currentTime, 0.1);
  }

  // نغمة النجاح: جرسين ناعمين (D5 ثم A5)، كل جرس نغمة أساسية + توافقيات الجرس الخافتة
  function chime() {
    if (!ctx || !isSoundEnabled()) return;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 3200;
    lp.connect(sfx);
    [
      [587.33, 0],
      [880, 0.13],
    ].forEach(([f, at]) => {
      [
        [1, 0.22],
        [2.76, 0.045],
        [5.4, 0.015],
      ].forEach(([k, gain]) => {
        const t0 = ctx.currentTime + at;
        const o = ctx.createOscillator();
        o.frequency.value = f * k;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.8 / k ** 0.3);
        o.connect(g).connect(lp);
        o.start(t0);
        o.stop(t0 + 2);
      });
    });
  }

  // الزائر طفّى الصوت من الهيدر: نوقف الموسيقى والمحرك فوراً
  function silence() {
    if (!ctx) return;
    stopLoop(0.2);
    music?.pause();
  }

  return { start, speed, play, stopLoop, chime, silence };
})();

// شريط SVG مكرر مرتين: ننقله نص عرضه ونرجع = حركة لا نهائية بلا فراغ
function tripStrip(path, fill) {
  const svg = `<svg viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true"><path d="${path}" fill="${fill}"/></svg>`;
  return svg + svg;
}

// القمر: قرص يغمق عند الحافة + بحار قمرية رمادية + فوهات صغيرة + حبيبات سطح
function tripMoonTexture() {
  const N = 128;
  const r = N / 2;
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const g = c.getContext("2d");
  const base = g.createRadialGradient(r * 0.8, r * 0.75, r * 0.1, r, r, r);
  base.addColorStop(0, "#f6f3e8");
  base.addColorStop(0.7, "#dcd8cb");
  base.addColorStop(1, "#a9a597");
  g.fillStyle = base;
  g.beginPath();
  g.arc(r, r, r - 1, 0, Math.PI * 2);
  g.fill();
  g.save();
  g.clip();
  g.filter = "blur(2.5px)";
  g.fillStyle = "rgba(110, 108, 100, .38)";
  for (const [x, y, rx, ry, rot] of [
    [0.38, 0.32, 0.16, 0.11, 0.4],
    [0.55, 0.28, 0.12, 0.09, 0],
    [0.6, 0.45, 0.14, 0.1, 0.6],
    [0.33, 0.52, 0.1, 0.13, 0],
    [0.47, 0.62, 0.09, 0.07, 0],
    [0.7, 0.6, 0.07, 0.06, 0],
  ]) {
    g.beginPath();
    g.ellipse(x * N, y * N, rx * N, ry * N, rot, 0, Math.PI * 2);
    g.fill();
  }
  g.filter = "none";
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * N;
    const y = Math.random() * N;
    const cr = 1 + Math.random() * 3;
    g.fillStyle = "rgba(80, 78, 72, .18)";
    g.beginPath();
    g.arc(x, y, cr, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "rgba(255, 255, 255, .12)";
    g.beginPath();
    g.arc(x - cr * 0.3, y - cr * 0.3, cr * 0.6, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
  const img = g.getImageData(0, 0, N, N);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL();
}

// بلاطة حبيبات الفيلم
function tripGrainTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const img = g.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.random() * 255;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL();
}

const TRIP_CLOUD_SVG =
  '<svg viewBox="0 0 220 100" aria-hidden="true"><g fill="var(--cl)"><ellipse cx="62" cy="64" rx="50" ry="28"/><ellipse cx="112" cy="46" rx="54" ry="40"/><ellipse cx="162" cy="62" rx="46" ry="30"/><rect x="24" y="62" width="176" height="30" rx="15"/></g><ellipse cx="112" cy="88" rx="86" ry="9" fill="var(--cl2)" opacity=".6"/></svg>';

function createTrip(stage, { onStart, onDone }) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scene = document.createElement("div");
  scene.className = "trip-scene";
  scene.setAttribute("aria-hidden", "true");
  scene.innerHTML = `
    <div class="trip-view">
      <div class="trip-sky"></div><div class="trip-sun"></div>
      <div class="trip-band trip-islands"></div>
      <div class="trip-sea"></div>
      <div class="trip-band trip-waves1"></div>
      <div class="trip-band trip-waves2"></div>
      <div class="trip-clouds trip-cfar"></div>
      <div class="trip-carpet"></div>
      <div class="trip-cards"></div>
      <div class="trip-clouds trip-cnear"></div>
      <div class="trip-band trip-fg"></div>
    </div>
    <svg class="trip-frame" aria-hidden="true"><path fill-rule="evenodd"/></svg>
    <div class="trip-window"></div>
    <div class="trip-grain"></div>`;
  stage.prepend(scene);
  const $ = (cls) => scene.querySelector(`.trip-${cls}`);
  const view = $("view");
  const cardsBox = $("cards");
  const win = $("window");
  const frame = $("frame");
  const fg = $("fg");
  const bands = { islands: $("islands"), waves1: $("waves1"), waves2: $("waves2") };

  bands.islands.innerHTML = tripStrip(
    "M0 100 L0 80 Q60 60 120 78 L180 82 Q260 40 330 76 L520 84 Q600 55 680 80 L760 86 Q860 50 930 78 L1000 82 L1000 100Z",
    "var(--isl)"
  );
  const wave =
    "M0 50 Q62 20 125 50 T250 50 T375 50 T500 50 T625 50 T750 50 T875 50 T1000 50 L1000 100 L0 100Z";
  bands.waves1.innerHTML = tripStrip(wave, "var(--wv1)");
  bands.waves2.innerHTML = tripStrip(wave, "var(--wv2)");
  stage.style.setProperty("--trip-grain", `url(${tripGrainTexture()})`);
  stage.style.setProperty("--trip-moon", `url(${tripMoonTexture()})`);

  // الغيوم (مشهد الطيارة): كل غيمة عنصر بحجمه الطبيعي، يلف من جديد لما يطلع من الشاشة.
  // البعيدة صغيرة وبطيئة فوق؛ القريبة كبيرة وسريعة عند حافة بساط الغيوم
  const clouds = [];
  function addClouds(box, n, depth, y0, y1, s0, s1) {
    for (let i = 0; i < n; i++) {
      const el = document.createElement("div");
      el.className = "trip-cloud";
      el.innerHTML = TRIP_CLOUD_SVG;
      box.append(el);
      clouds.push({
        el,
        x0: (i + Math.random() * 0.6) / n,
        depth,
        y: y0 + Math.random() * (y1 - y0),
        s: s0 + Math.random() * (s1 - s0),
      });
    }
  }
  addClouds($("cfar"), 6, 0.18, 0.1, 0.42, 0.5, 1);
  addClouds($("cnear"), 6, 1.3, 0.58, 0.62, 1.4, 2);

  let vehicle = "train";
  let items = [];
  let cards = [];
  let cam = 0;
  let over = 0;
  let running = false;
  let idleFrame = 0;
  let visible = true;
  let result = null;
  // المقاس محفوظ (ResizeObserver) بدل قراءة clientWidth كل إطار — القراءة بعد كتابة
  // transform تجبر المتصفح يعيد التخطيط (forced synchronous layout) بكل إطار
  let W = stage.clientWidth;
  let H = stage.clientHeight;
  // "حارات": كل طبقة عمق حاوية وحدة تتحرك (transform واحد)، والبطاقات ثابتة داخلها —
  // بدل ما نحرك كل بطاقة وظلها لوحدهم بكل إطار (60+ كتابة ← 6)
  let lanes = [];
  // البطاقات اللي تتحرك وقت الانتظار هي نفسها بطاقات الرحلة الجاية (مبنية ومرسومة
  // مسبقاً) — فالضغطة ما تبني 45 عنصر وترسمهم بنفس اللحظة، والمشهد ما "ينط" لورا
  let deckWinner = null;

  // أقرب طبقة للعين (تمر أسرع من البطاقات): أعمدة وسلك القطار، أو سياج جسر السيارة
  function drawForeground() {
    let d = "";
    if (vehicle === "train") {
      d =
        "M247 0 h5 v100 h-5z M747 0 h5 v100 h-5z M0 9 Q250 15 500 9 T1000 9 v1.2 Q750 16.2 500 10.2 T0 10.2z";
    } else if (vehicle === "car") {
      d = "M0 68 h1000 v2.4 h-1000z M0 75 h1000 v1.6 h-1000z";
      for (let x = 0; x < 1000; x += 40) d += ` M${x} 68 h3 v32 h-3z`;
    }
    fg.innerHTML = d ? tripStrip(d, vehicle === "train" ? "#3b4148" : "#8b939c") : "";
  }

  function makeCard(item, lane, x, z) {
    const el = document.createElement("div");
    el.className = "trip-card";
    const hue = Math.floor(Math.random() * 360);
    el.style.setProperty("--h", hue);
    el.innerHTML = `<span class="trip-card-icon">${escapeHtml(item.icon || "⭐")}</span><span class="trip-card-title">${escapeHtml(itemTitle(item))}</span>`;
    const sh = document.createElement("div");
    sh.className = "trip-shadow";
    lanes[z].sh.append(sh);
    lanes[z].el.append(el);
    const phase = Math.random() * 6.28;
    // التمايل نفسه (sin بدورة 900ms×2π) لكن كـCSS animation يشغّلها المعالج الرسومي
    el.style.animationDelay = `${Math.round((-phase / 6.28) * TRIP_BOB_MS)}ms`;
    return {
      el,
      sh,
      item,
      lane,
      x,
      hue,
      z,
      phase,
      dy: (Math.random() - 0.5) * 0.08,
    };
  }

  const pick = () => items[Math.floor(Math.random() * items.length)];

  // الفائز: عدالة + "عشوائية يحسّها الناس عشوائية" —
  // 1) بالمحل مو بالفرع: محل له 5 فروع كان حظه 5 أضعاف محل بفرع واحد. نجمع الفروع
  //    باسم المحل (اللي قبل " - " بالعنوان) ونختار محل ثم فرع منه.
  // 2) كيس خلط (shuffle bag): كل المحلات تطلع مرة قبل ما يتكرر أي محل، وما يطلع نفس
  //    المحل مرتين ورا بعض حتى بين كيس وكيس.
  let bag = [];
  let lastBrand = null;
  const brandOf = (it) => (it.title || "").split(" - ")[0].trim();
  function pickWinner() {
    const groups = new Map();
    for (const it of items) {
      const k = brandOf(it);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(it);
    }
    bag = bag.filter((k) => groups.has(k));
    if (!bag.length) {
      bag = [...groups.keys()];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      if (bag.length > 1 && bag[bag.length - 1] === lastBrand) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    }
    lastBrand = bag.pop();
    const g = groups.get(lastBrand);
    return g[Math.floor(Math.random() * g.length)];
  }

  // يبني البطاقات على طول الرحلة؛ الفائزة بالطبقة القريبة، موقعها يجيها بالضبط بنص الشباك
  // آخر الرحلة، وأي بطاقة قريبة تغطيها تنشال
  function build() {
    cardsBox.textContent = "";
    cards = [];
    const shWrap = document.createElement("div");
    shWrap.className = "trip-lane-shadows";
    cardsBox.append(shWrap);
    lanes = TRIP_LANES.map((lane, z) => {
      const sh = document.createElement("div");
      const el = document.createElement("div");
      sh.className = el.className = "trip-lane";
      el.style.zIndex = z;
      el.dataset.z = z;
      shWrap.append(sh);
      cardsBox.append(el);
      return { lane, sh, el, trail: -1 };
    });
    TRIP_LANES.forEach((lane, z) => {
      const span = (TRIP_DIST + W * 2) * lane.depth + W;
      for (
        let x = -W * 0.2 + Math.random() * lane.gap;
        x < span;
        x += lane.gap * (0.8 + Math.random() * 0.5)
      ) {
        cards.push(makeCard(pick(), lane, x, z));
      }
    });
    const near = TRIP_LANES[2];
    const winner = makeCard(pickWinner(), near, W / 2 + TRIP_DIST, 2);
    winner.dy = 0;
    cards = cards.filter((c) => {
      if (c.lane !== near || Math.abs(c.x - winner.x) > near.gap * 0.7) return true;
      c.el.remove();
      c.sh.remove();
      return false;
    });
    cards.push(winner);
    placeCards();
    return winner;
  }

  // مكان كل بطاقة داخل حارتها: يتحسب مرة (وعند تغيّر المقاس)، مو كل إطار
  function placeCards() {
    const horizon = H * 0.62;
    for (const c of cards) {
      if (c.free) continue;
      const s = 0.45 + 0.55 * c.lane.depth;
      c.el.style.transform = `translate3d(${W - c.x}px, ${H * (c.lane.y + c.dy)}px, 0) scale(${s})`;
      c.sh.style.transform = `translate3d(${W - c.x}px, ${horizon + (H - horizon) * (0.15 + 0.5 * c.lane.depth)}px, 0) scale(${s})`;
    }
  }

  // جدار المركبة: شكل SVG واحد بحجم المشهد فيه فتحة بشكل الشباك بالضبط (من
  // border-radius المحسوب نفسه). كان box-shadow بانتشار 2000px = طبقة 4300×4450px
  // (~19 ميجابكسل، ٨٠ ضعف المشهد) تكبر 1.9× لحظة الكشف
  function drawFrame() {
    const st = stage.getBoundingClientRect();
    const r = win.getBoundingClientRect();
    if (!st.width || !r.width) return;
    const cs = getComputedStyle(win);
    // كل شي بإحداثيات المستطيل الظاهر (بالكسور) و viewBox بنفس المقاس مع
    // preserveAspectRatio=none — فالفتحة تنطبق على الشباك بالبكسل. z = تكبير الصفحة
    // (CSS zoom) لأن border-radius المحسوب بوحدات ما قبل التكبير
    const z = st.width / (stage.offsetWidth || st.width);
    let x = r.left - st.left;
    let y = r.top - st.top;
    let w = r.width;
    let h = r.height;
    const px = (u, side) => (u.endsWith("%") ? (parseFloat(u) / 100) * side : (parseFloat(u) || 0) * z);
    const rad = (v) => {
      const [a, b = a] = v.split(" ");
      return [px(a, w), px(b, h)];
    };
    let corners = [
      cs.borderTopLeftRadius,
      cs.borderTopRightRadius,
      cs.borderBottomRightRadius,
      cs.borderBottomLeftRadius,
    ].map(rad);
    const [tl0, tr0, br0, bl0] = corners;
    // نفس قاعدة CSS: لو مجموع نصفي قطرين أكبر من الضلع، كل الأنصاف تصغر بنفس النسبة
    const f = Math.min(
      1,
      w / (tl0[0] + tr0[0] || 1),
      w / (bl0[0] + br0[0] || 1),
      h / (tl0[1] + bl0[1] || 1),
      h / (tr0[1] + br0[1] || 1)
    );
    // الفتحة أصغر بـ2px من الشباك من كل جهة: حافتها (anti-aliasing) تنطبق تحت الحافة
    // المعتمة للشباك (inset 10px)، فما يطلع خط شعري من المنظر بين الجدار والحافة
    const d = 2 * z;
    corners = corners.map(([a, b]) => [Math.max(0, a * f - d), Math.max(0, b * f - d)]);
    const [tl, tr, br, bl] = corners;
    const cx = x + w / 2;
    const cy = y + h / 2;
    x += d;
    y += d;
    w -= 2 * d;
    h -= 2 * d;
    frame.setAttribute("viewBox", `0 0 ${st.width} ${st.height}`);
    frame.setAttribute("preserveAspectRatio", "none");
    frame.style.transformOrigin = `${cx / z}px ${cy / z}px`;
    frame.firstChild.setAttribute(
      "d",
      `M0 0H${st.width}V${st.height}H0Z` +
        `M${x + tl[0]} ${y}H${x + w - tr[0]}A${tr[0]} ${tr[1]} 0 0 1 ${x + w} ${y + tr[1]}` +
        `V${y + h - br[1]}A${br[0]} ${br[1]} 0 0 1 ${x + w - br[0]} ${y + h}` +
        `H${x + bl[0]}A${bl[0]} ${bl[1]} 0 0 1 ${x} ${y + h - bl[1]}` +
        `V${y + tl[1]}A${tl[0]} ${tl[1]} 0 0 1 ${x + tl[0]} ${y}Z`
    );
  }

  function render(time, speed) {
    // تمايل القارب/الطيارة: transform واحد للمنظر كله داخل الشباك
    const rock = TRIP_VEHICLES[vehicle].rock || 0;
    view.style.transform = rock
      ? `rotate(${Math.sin(time / 1400) * 0.8 * rock}deg) translateY(${Math.sin(time / 1100) * 4 * rock}px)`
      : "";
    // الحركة من اليمين لليسار؛ ذيل السرعة يطول مع السرعة (اتجاهه عكس الحركة)
    for (const L of lanes) {
      L.el.style.transform = L.sh.style.transform = `translate3d(${cam * L.lane.depth}px,0,0)`;
      const trail = Math.round(Math.min(0.8, speed * L.lane.depth) * 20) / 20;
      if (trail !== L.trail) {
        L.trail = trail;
        L.el.style.setProperty("--trail", trail);
      }
    }
    // البطاقات برا الشاشة تنشال من الرسم (display:none) — نكتب بس لما تتغير حالتها،
    // فما في كتابة كل إطار، والبعيدة ما تاخذ طبقة ولا حركة تمايل
    for (const c of cards) {
      if (c.free) continue;
      const sx = c.x - cam * c.lane.depth;
      const out = sx < -200 || sx > W + 200;
      if (out !== c.out) {
        c.out = out;
        c.el.classList.toggle("off", out);
        c.sh.classList.toggle("off", out);
      }
    }
    // الطبقات: كل وحدة بسرعة مختلفة حسب بعدها (parallax)
    const loop = (v) => -(((v % W) + W) % W);
    bands.islands.style.transform = `translate3d(${loop(-cam * 0.05)}px,0,0)`;
    bands.waves1.style.transform = `translate3d(${loop(-cam * 0.3)}px,0,0)`;
    bands.waves2.style.transform = `translate3d(${loop(-cam * 0.7)}px,0,0)`;
    fg.style.transform = `translate3d(${loop(-cam * 1.6)}px,0,0)`;
    if (vehicle === "plane") {
      const span = W + 600;
      for (const c of clouds) {
        const sx = ((((c.x0 * span - cam * c.depth) % span) + span) % span) - 300;
        c.el.style.transform = `translate3d(${W - sx}px, ${c.y * H}px, 0) scale(${c.s})`;
      }
    }
  }

  // وقت الانتظار المشهد يمشي ببطء (حي بس هادي) — ويتوقف لما يطلع من الشاشة
  function idle(now) {
    idleFrame = 0;
    if (running || !visible) return;
    cam += 0.25;
    render(now, 0);
    idleFrame = requestAnimationFrame(idle);
  }
  function resumeIdle() {
    if (!idleFrame && !running && visible && !reduceMotion) idleFrame = requestAnimationFrame(idle);
  }
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    resumeIdle();
  }).observe(stage);
  new ResizeObserver(() => {
    W = stage.clientWidth;
    H = stage.clientHeight;
    placeCards();
    if (!win.style.transform) drawFrame();
    render(performance.now(), 0);
  }).observe(stage);

  function clearResult() {
    result?.remove();
    result = null;
    win.style.cssText = "";
    frame.style.transform = frame.style.opacity = "";
    fg.style.opacity = "";
  }

  function setVehicle(v) {
    vehicle = v;
    stage.dataset.vehicle = v;
    drawForeground();
    drawFrame();
    render(performance.now(), 0);
  }

  function setItems(list) {
    items = list;
    bag = [];
    if (running) return;
    clearResult();
    cam = 0;
    deckWinner = null;
    if (items.length) deckWinner = build();
    else {
      cardsBox.textContent = "";
      cards = [];
      lanes = [];
    }
    render(performance.now(), 0);
    resumeIdle();
  }

  function go() {
    if (running || !items.length) return;
    running = true;
    cancelAnimationFrame(idleFrame);
    idleFrame = 0;
    over = TRIP_VEHICLES[vehicle].over;
    // نكمل من مكان المشهد الحالي لو بطاقات الانتظار لسا ما وصلت نص الطريق
    const fresh = deckWinner && !result && cam < TRIP_DIST * 0.3;
    if (!fresh) {
      clearResult();
      cam = 0;
    }
    const winner = fresh ? deckWinner : build();
    deckWinner = null;
    const cam0 = cam;
    onStart();
    TripSound.start(vehicle, () => running);
    if (reduceMotion) {
      cam = TRIP_DIST;
      render(0, 0);
      reveal(winner);
      return;
    }
    const V = TRIP_VEHICLES[vehicle];
    const t0 = performance.now();
    let braked = false;
    let lastWhoosh = 0;
    (function frame(now) {
      const t = Math.min(1, (now - t0) / V.dur);
      const [p, v] = TRIP_CURVE(t);
      cam = cam0 + (TRIP_DIST + over - cam0) * p;
      render(now, v);
      TripSound.speed(v);
      if (!braked && V.stopAt && t > 0.3 && v < V.stopAt) {
        braked = true;
        TripSound.play(`${vehicle}-stop`, 0.8);
      }
      // "ووش" لما بطاقة قريبة تعدّي نص الشباك — بحد أدنى 140ms بينها
      const mid = W / 2;
      for (const c of cards) {
        if (c.lane.depth !== 1) continue;
        const side = c.x - cam > mid;
        if (c.side !== undefined && c.side !== side && v > 0.2 && now - lastWhoosh > 140) {
          lastWhoosh = now;
          TripSound.play("whoosh", 0.1 + 0.2 * v, 0.9 + Math.random() * 0.2);
        }
        c.side = side;
      }
      if (t < 1) requestAnimationFrame(frame);
      else stop(winner);
    })(t0);
  }

  function stop(winner) {
    // الوقوف: تتعدى الهدف شوي ثم ترجع له بنعومة، مثل المركبة لما توقف
    tripTween(
      TRIP_VEHICLES[vehicle].settle,
      (t) => {
        cam = TRIP_DIST + over * (1 - tripEase(t));
        render(performance.now(), 0);
      },
      () => {
        // "طلّة الراس": الشباك يكبر ويطلع برا المشهد (ومعه الأعمدة/السياج)، باقي
        // البطاقات تبهت، والفائزة تقرّب للنص
        const y0 = H * winner.lane.y;
        // الفائزة تطلع من حارتها لطبقة فوق الكل (مكانها بالشاشة نفسه)، فالحارات
        // تبهت كلها مرة وحدة بدل بطاقة بطاقة
        winner.free = true;
        winner.el.style.zIndex = 3;
        winner.el.style.setProperty("--trail", 0);
        winner.el.style.transform = `translate3d(${W / 2}px, ${y0}px, 0)`;
        cardsBox.append(winner.el);
        winner.sh.style.transform = `translate3d(${W / 2}px, ${H * 0.62 + H * 0.38 * 0.65}px, 0)`;
        cardsBox.firstChild.append(winner.sh);
        if (TRIP_VEHICLES[vehicle].stopAt === 0) TripSound.play(`${vehicle}-stop`, 0.7);
        TripSound.stopLoop(1.5);
        TripSound.play("headout", 0.6);
        TripSound.play("wind", 0.45);
        tripTween(
          850,
          (t) => {
            const e = tripEase(t);
            win.style.transform = frame.style.transform = `scale(${1 + 0.9 * e})`;
            win.style.opacity = frame.style.opacity = 1 - e;
            fg.style.opacity = 1 - e;
            for (const L of lanes) L.el.style.opacity = L.sh.style.opacity = 1 - 0.7 * e;
            winner.el.style.transform = `translate3d(${W / 2}px, ${y0 + (H * 0.46 - y0) * e}px, 0) scale(${1 + 0.7 * e})`;
          },
          () => reveal(winner)
        );
      }
    );
  }

  function reveal(winner) {
    const item = winner.item;
    // متغيّر محلي: "جرّب مرة ثانية" وسط حركة الظهور يصفّر result قبل ما تخلص الحركة
    const box = document.createElement("div");
    result = box;
    box.className = "trip-result";
    box.setAttribute("role", "group");
    box.setAttribute("aria-label", itemTitle(item));
    box.style.setProperty("--h", winner.hue);
    const meta = (item.tags || [])
      .slice(0, 2)
      .map((tag) => tagLabel(tag))
      .join(" · ");
    // "اقرأ التفاصيل" + الخريطة للعناصر اللي لها صفحة تفاصيل، وإلا أزرار العنصر العادية
    // الخريطة صارت ضمن buildActionsHtml لكل العناصر؛ هنا بس لو ما لها رابط بالبيانات
    const maps =
      item.mapsUrl && !item.links?.maps
        ? `<a class="btn secondary" href="${safeUrl(item.mapsUrl)}" target="_blank" rel="noopener noreferrer">${LINK_META.maps.icon} ${t("link_maps")}</a>`
        : "";
    box.innerHTML = `
      <div class="trip-result-top"><span class="trip-result-icon">${escapeHtml(item.icon || "⭐")}</span><h2>${escapeHtml(itemTitle(item))}</h2></div>
      ${meta ? `<p class="trip-result-meta">${escapeHtml(meta)}</p>` : ""}
      <div class="trip-result-actions">${buildActionsHtml(item)}${maps}</div>
      <button type="button" class="trip-again">${t("try_again")}</button>`;
    stage.append(box);
    wireItemActions(box, item);
    box.querySelector(".trip-again").addEventListener("click", () => {
      playClickSound();
      go();
    });
    running = false;
    onDone(item);
    TripSound.chime();
    box.querySelector("a, button")?.focus({ preventScroll: true });
    if (reduceMotion) return;
    box.style.opacity = 0;
    tripTween(500, (t) => {
      box.style.opacity = Math.min(1, t * 3);
      box.style.scale = 0.75 + 0.25 * tripBack(t);
      winner.el.style.opacity = 1 - Math.min(1, t * 3);
    });
  }

  // يتبع مظهر الموقع: اختيار صريح (data-theme) أولاً، وإلا إعداد الجهاز
  const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const applyTheme = () => {
    const pref = document.documentElement.dataset.theme;
    stage.classList.toggle(
      "trip-night",
      pref === "dark" || (pref !== "light" && darkQuery.matches)
    );
  };
  applyTheme();
  darkQuery.addEventListener?.("change", applyTheme);
  new MutationObserver(applyTheme).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  return { setVehicle, setItems, go, isRunning: () => running };
}

function initRandomPicker() {
  const categoriesWrap = document.getElementById("pickerCategories");
  const spinBtn = document.getElementById("pickerSpinBtn");
  const vehicleBtn = document.getElementById("pickerVehicleBtn");
  const soundBtn = document.getElementById("pickerSoundBtn");
  const stage = document.getElementById("pickerStage");
  const areaSelect = document.getElementById("pickerArea");
  if (!categoriesWrap || !spinBtn || !stage || !areaSelect) return;

  // أقسام "وين أروح" بس، بترتيب الأهم — المقالات والتجارب ما لها معنى بالقرعة
  const sectionKeys = ["restaurants", "cafes", "bakeries", "places", "stores", "car-shops"].filter(
    (key) => (SITE_DATA[key]?.items || []).length > 0
  );
  const trip = createTrip(stage, {
    onStart: () => {
      spinBtn.disabled = true;
      vehicleBtn.disabled = true;
      areaSelect.disabled = true;
    },
    onDone: () => {
      spinBtn.disabled = false;
      vehicleBtn.disabled = false;
      areaSelect.disabled = false;
    },
  });

  categoriesWrap.innerHTML = sectionKeys
    .map(
      (key) => `
      <button class="picker-category" data-section="${key}" aria-pressed="false">
        <span class="picker-category-icon">${SITE_DATA[key].icon}</span>
        <span>${sectionLabel(key)}</span>
      </button>`
    )
    .join("");

  function choose(btn) {
    categoriesWrap.querySelectorAll(".picker-category").forEach((b) => {
      b.classList.toggle("active", b === btn);
      b.setAttribute("aria-pressed", String(b === btn));
    });
    section = btn.dataset.section;
    fillAreas();
    applyPool();
  }

  // المنطقة: «اختار لي» يختار من منطقتك أو من أقرب الأماكن لك، مو من كل البحرين
  const NEAR_COUNT = 8;
  let section = null;
  let nearPool = [];
  function fillAreas() {
    const items = SITE_DATA[section].items;
    const counts = {};
    items.forEach((it) =>
      (it.tags || []).forEach(
        (tg) => AREA_NAMES.includes(tg) && (counts[tg] = (counts[tg] || 0) + 1)
      )
    );
    const hasLoc = items.some((it) => (it.lat != null && it.lng != null) || it.branches?.length);
    areaSelect.innerHTML = [
      `<option value="">${t("picker_area_all").replace("{n}", items.length)}</option>`,
      hasLoc ? `<option value="near">${t("picker_area_near")}</option>` : "",
      ...Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([area, n]) => `<option value="${area}">${tagLabel(area)} (${n})</option>`),
    ].join("");
  }
  function applyPool() {
    const items = SITE_DATA[section].items;
    const v = areaSelect.value;
    const pool =
      v === "near" ? nearPool : v ? items.filter((it) => (it.tags || []).includes(v)) : items;
    trip.setItems(pool);
    spinBtn.disabled = trip.isRunning() || !pool.length;
  }
  function resetArea(msg) {
    showToast(msg);
    areaSelect.value = "";
    applyPool();
  }
  areaSelect.addEventListener("change", () => {
    playClickSound();
    if (areaSelect.value !== "near") return applyPool();
    if (!navigator.geolocation) return resetArea(t("geolocation_unsupported"));
    spinBtn.disabled = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (areaSelect.value !== "near") return;
        const me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        nearPool = SITE_DATA[section].items
          .map((it) => ({ it, near: nearestBranch(it, me) }))
          .filter((x) => x.near)
          .sort((a, b) => a.near.km - b.near.km)
          .slice(0, NEAR_COUNT)
          .map((x) => x.it);
        applyPool();
        showToast(t("picker_area_near_done").replace("{n}", nearPool.length));
      },
      () => resetArea(t("geolocation_denied")),
      { enableHighAccuracy: false, timeout: 10000 }
    );
  });
  categoriesWrap.querySelectorAll(".picker-category").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (trip.isRunning()) return;
      choose(btn);
      playClickSound();
    });
  });
  // قانون هيك: الزر يشتغل من أول لحظة — المطاعم مختارة افتراضياً (أكثر قسم يُسأل عنه)
  const preset =
    categoriesWrap.querySelector('[data-section="restaurants"]') ||
    categoriesWrap.querySelector(".picker-category");

  // المركبة: يختارها الزائر بنفسه، وتنحفظ له
  const vehicles = Object.keys(TRIP_VEHICLES);
  function setVehicle(v) {
    trip.setVehicle(v);
    vehicleBtn.textContent = TRIP_VEHICLES[v].icon;
    const label = `${t("picker_vehicle")}: ${t(`picker_vehicle_${v}`)}`;
    vehicleBtn.setAttribute("aria-label", label);
    vehicleBtn.title = label;
  }
  const saved = lsGet(TRIP_VEHICLE_KEY);
  setVehicle(TRIP_VEHICLES[saved] ? saved : "train");
  vehicleBtn.addEventListener("click", () => {
    const current = stage.dataset.vehicle;
    const next = vehicles[(vehicles.indexOf(current) + 1) % vehicles.length];
    setVehicle(next);
    lsSet(TRIP_VEHICLE_KEY, next);
    playClickSound();
  });

  // زر الصوت بالمشهد يضغط زر الصوت العام بالهيدر (نفس الإعداد بكل الموقع)
  const headerSound = document.querySelector(".sound-toggle");
  function syncSound() {
    const on = isSoundEnabled();
    soundBtn.textContent = on ? "🔊" : "🔇";
    soundBtn.setAttribute("aria-label", on ? t("sound_on") : t("sound_off"));
    soundBtn.title = soundBtn.getAttribute("aria-label");
    if (!on) TripSound.silence();
  }
  if (headerSound) {
    soundBtn.addEventListener("click", () => headerSound.click());
    headerSound.addEventListener("click", syncSound);
    syncSound();
  } else {
    soundBtn.hidden = true;
  }

  if (preset) choose(preset);

  spinBtn.addEventListener("click", () => {
    playClickSound();
    stage.scrollIntoView({ block: "center", behavior: "smooth" });
    trip.go();
  });
}
