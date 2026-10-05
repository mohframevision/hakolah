/* global audioBufferToMp3, audioBufferToWav, makeRoomImpulse, playClickSound, playSound, showToast */
/* صوتيات هكوله — تُحمَّل بصفحة sounds.html فقط (pageScript بالواجهة)، لا بكل
   صفحات الموقع. تعتمد على دوال عامة من main.js (المؤثرات، الترميز، التنبيه)
   لأن الملفين سكربتان عاديان يتشاركان النطاق العام، وmain.js يُحمَّل قبله. */

/* ===== تجربة "موسيقى بيب هادئة" (src/ai-experiments/calm-beep-music.md) =====
   نغمات Web Audio من سلّم خماسي (Pentatonic) بأوكتافين، بمفتاح موسيقي عشوائي
   لكل تشغيلة (ROOT_NOTES). التأليف بجمل موسيقية (Motifs) لا نغمات مستقلة —
   انظر تعليق playSequence بالتفصيل. مساحة الاحتمالات (مفتاح + جمل + إيقاع)
   كبيرة كفاية إن أي تشغيلتين ما تتكرران عملياً. النص على الزر ولوحة المفاتيح
   يجيان من data-play-label/data-stop-label بالـ HTML نفسه عشان يشتغل بأي لغة
   بدون تكرار الدالة. */

// مسار السكربت نفسه — منه نبني مسار عيّنات البيانو (assets/audio/piano) بغض النظر
// عن مسار الموقع الأساسي. currentScript متاح فقط وقت تنفيذ الملف، لا داخل الدوال.
const SOUNDS_SCRIPT_URL = document.currentScript?.src || location.href;

function initBeepMelodyExperiment() {
  const btn = document.getElementById("beepMelodyPlay");
  if (!btn) return;

  /* لوحتان: المبسطة (أوكتافة وحدة، مكتوبة بالصفحة) تضيء حسب فئة النغمة
     (Pitch Class 0-11)، والكاملة (٤ أوكتافات = ٤٨ مفتاح) تُبنى هنا بالجافاسكربت
     وتضيء حسب النغمة المطلقة. نبنيها بالكود لا بالـ HTML عشان ما نكرر ٤٨ مفتاح
     يدوياً بملفَّي المحتوى (عربي وإنجليزي). */
  const keyByPitchClass = {};
  document.querySelectorAll("#beepKeys [data-pitch-class]").forEach((el) => {
    keyByPitchClass[el.dataset.pitchClass] = el;
  });

  const FULL_OCTAVES = 4; // النطاق اللي يعزف فيه المولّد فعلاً (دو٣ إلى سي٦)
  const FULL_BASE_FREQ = 130.81; // دو٣ — نقطة الصفر للوحة الكاملة
  // نفس مقاسات CSS (‎.beep-keys-full‎) — يلزم يتطابقون عشان تقع السوداء بمكانها
  const FULL_WHITE_W = 22;
  const FULL_BLACK_W = 13;
  const WHITE_PITCH_CLASSES = [0, 2, 4, 5, 7, 9, 11];
  const BLACK_PITCH_CLASSES = [1, 3, 6, 8, 10];
  // المفتاح الأسود يقع على حدّ المفتاح الأبيض رقم كذا داخل الأوكتافة
  const BLACK_AFTER_WHITE = [1, 2, 4, 5, 6];

  const keyByAbsolute = {};
  const fullBoard = document.getElementById("beepKeysFull");
  if (fullBoard) {
    for (let octave = 0; octave < FULL_OCTAVES; octave++) {
      WHITE_PITCH_CLASSES.forEach((pitchClass) => {
        const el = document.createElement("div");
        el.className = "beep-white";
        keyByAbsolute[octave * 12 + pitchClass] = el;
        fullBoard.appendChild(el);
      });
    }
    for (let octave = 0; octave < FULL_OCTAVES; octave++) {
      BLACK_PITCH_CLASSES.forEach((pitchClass, i) => {
        const el = document.createElement("div");
        el.className = "beep-black";
        el.style.left = `${(octave * 7 + BLACK_AFTER_WHITE[i]) * FULL_WHITE_W - FULL_BLACK_W / 2}px`;
        keyByAbsolute[octave * 12 + pitchClass] = el;
        fullBoard.appendChild(el);
      });
    }
    fullBoard.style.width = `${FULL_OCTAVES * 7 * FULL_WHITE_W}px`;
  }

  function pitchClassOf(freq) {
    const semitonesFromC4 = Math.round(12 * Math.log2(freq / 261.63));
    return ((semitonesFromC4 % 12) + 12) % 12;
  }

  /* مولّد عشوائية ببذرة (mulberry32) بدل Math.random — بدونه ما يقدر أحد
     يعيد سماع نفس المقطوعة مرتين، وهذا يمنع استخدامها كمثال ثابت بمحاضرة أو
     مشاركتها برابط. البذرة تُعرض بلوحة التحليل وتنحفظ بالرابط. */
  function createRng(seed) {
    let state = seed >>> 0;
    return function random() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  let rand = createRng((Math.random() * 4294967296) >>> 0);
  let pinnedSeed = null; // بذرة جاية من الرابط — تُستخدم مرة وحدة بأول تشغيل
  let lastPiece = null; // آخر قطعة أُلّفت — التصدير يصدّرها هي لا وحدة جديدة

  /* سجلّ المقطوعات المسموعة عشان زر "السابقة". نخزّن الآلة والطابع مع البذرة
     لا البذرة وحدها: البذرة تعطي نفس اللحن فقط لو بقي الطابع نفسه، فلو غيّر
     المستخدم الطابع ثم رجع للخلف بيسمع مقطوعة أخرى بنفس البذرة لا نفس اللي سمعها. */
  const seedHistory = [];
  let historyPos = -1;
  let navigatingHistory = false;

  function allKeys() {
    return Object.values(keyByPitchClass).concat(Object.values(keyByAbsolute));
  }

  // نضيء المفتاح باللوحتين معاً (الظاهرة وحدة بس) — أبسط من تتبّع أي وحدة معروضة
  function keysForFreq(freq) {
    const found = [];
    const byClass = keyByPitchClass[pitchClassOf(freq)];
    if (byClass) found.push(byClass);
    const byAbsolute = keyByAbsolute[Math.round(12 * Math.log2(freq / FULL_BASE_FREQ))];
    if (byAbsolute) found.push(byAbsolute);
    return found;
  }

  // سبع مفاتيح موسيقية ممكنة (C D E F G A B) — كل تشغيلة تختار وحدة عشوائياً.
  const ROOT_NOTES = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88];

  /* سلّم كامل (٧ درجات) بدل الخماسي (٥). الخماسي كان "آمن" لأنه بلا أنصاف
     نغمات = بلا تنافر، لكن هذا بالضبط سبب إحساس التوهان: بلا توتر ما فيه شي
     يُحَلّ، فما فيه حكاية. الكامل فيه درجات متوترة (الرابعة والسابعة) تشدّ
     للاستقرار — والهارموني (الكوردات) هي اللي تحمينا من النشاز، مو حذف
     النغمات المتوترة أصلاً. */
  const SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
  };

  /* السلّم مبني على ٣ أوكتافات = ٢٢ درجة. الدرجة ٧ هي التونيك (المفتاح نفسه):
     ٠-٦ أوكتاف الباص (المرافقة)، ٧-٢٠ نطاق اللحن. فصل النطاقين يخلي الباص
     تحت اللحن دايماً زي أي توزيع حقيقي. */
  const BASS_LOW = 0;
  const MELODY_LOW = 7;
  const MELODY_HIGH = 20;

  function buildScale(root, mode) {
    const steps = SCALES[mode];
    return Array.from({ length: 29 }, (_, d) => {
      const semitone = steps[d % 7] + 12 * (Math.floor(d / 7) - 1);
      return root * 2 ** (semitone / 12);
    });
  }

  /* تتابعات كوردات حقيقية مستخدمة بآلاف الأغاني — بأرقام درجات السلّم
     (٠=I، ٣=IV، ٤=V، ٥=vi). الكوردات هي اللي تعطي الإحساس بالذهاب والوصول،
     وهي الطبقة اللي كانت ناقصة تماماً قبل. */
  /* تتابعات كلاسيكية/ترتيلية. حُذفت عمداً تتابعات البوب الأشهر
     (I–V–vi–IV و I–vi–IV–V و vi–IV–I–V) لأنها أكثر ما يميّزه السامع كألحان
     مستعملة بمجالس اللهو، وهذا هو ضابط المسألة لا كون اللحن مفرحاً أو محزناً. */
  const PROGRESSIONS = [
    [0, 3, 4, 0], // I–IV–V–I
    [0, 3, 0, 4], // I–IV–I–V
    [0, 5, 1, 4], // I–vi–ii–V
    [0, 2, 3, 4], // I–iii–IV–V
    [0, 1, 4, 0], // I–ii–V–I
    [0, 3, 1, 4], // I–IV–ii–V
    [0, 5, 3, 0], // I–vi–IV–I
    [0, 2, 5, 3], // I–iii–vi–IV
  ];

  /* أنماط المرافقة — نفس النغمات بأشكال عزف مختلفة تماماً. هذا أقوى مصدر
     تنويع بين مقطوعة وأخرى: نفس الوتر بنمط "مقطّع" يحس قطعة ثانية كلياً
     مقارنة بنمط "ممدود". */
  /* حُذف نمط "النبض" (ضرب الوتر على الضربات القوية) لأنه أقرب ما يكون
     لإيقاع راقص يميّزه السامع. الباقي أنماط مرافقة ممدودة أو وتر مكسور. */
  const ACCOMPANIMENT_STYLES = ["pad", "arpeggio", "bassOnly"];

  let NOTES = buildScale(ROOT_NOTES[0], "major");
  let audioCtx = null;
  let delayNode = null; // مسار صدى مشترك (Delay + Feedback) — كل نغمة ترسل له
  let delayFeedbackGain = null; // مرجع خارجي عشان نضبط كمية الصدى حسب المزاج بكل تشغيلة
  let delayWetGain = null;
  let masterInput = null; // مدخل مسار الخروج — كل النغمات تمر منه
  let volumeGain = null; // منزلق الصوت (التشغيل الحي فقط، لا يأثر على الملفات المصدَّرة)
  let playing = false;
  let stopRequested = false;
  let activeOscillators = [];
  let activeTimeouts = [];

  // يُنشأ مرة وحدة لكل AudioContext — شبكة الصدى تحتاج تبقى نفسها طول التشغيلة
  // عشان الصدى يتراكم طبيعياً بين النغمات، لا يتصفّر كل نغمة. القيم الفعلية
  // (كمية الصدى) تُضبط بدالة applyMood كل تشغيلة حسب المزاج المختار
  function ensureAudioGraph() {
    if (delayNode) return;
    volumeGain = audioCtx.createGain();
    volumeGain.gain.value = volumeLevel * volumeLevel;
    volumeGain.connect(audioCtx.destination);
    const bus = buildOutput(audioCtx, volumeGain);
    liveMaster = bus.master;
    masterInput = bus.input;
    delayNode = bus.delay;
    delayFeedbackGain = bus.feedback;
    delayWetGain = bus.wet;
    delayFeedbackGain.gain.value = MOODS[currentMood].delayFeedback;
    delayWetGain.gain.value = MOODS[currentMood].delayWet;
  }

  /* مسار الخروج — نفس فكرة مسار مؤثرات الموقع: فلتر يليّن الحدّة، صدى غرفة
     حقيقي (يعطي مساحة بدل الصدى القصير الجاف لحاله)، وضاغط ناعم بالآخر
     يمنع التشوّه لما تتجمع النغمات أو تكون الديناميكية "قوي" */
  function buildOutput(ctx, out, preset = masterPreset) {
    const input = ctx.createGain();
    const soften = ctx.createBiquadFilter();
    soften.type = "lowpass";
    soften.frequency.value = 5500;
    const verb = ctx.createConvolver();
    verb.buffer = makeRoomImpulse(ctx, 2.4);
    const verbWet = ctx.createGain();
    verbWet.gain.value = 0.3;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 12;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.25;
    input.connect(soften).connect(comp);
    soften.connect(verb).connect(verbWet).connect(comp);

    // الماستر: آخر محطة قبل السماعة/الملف — معادل عريض + محدِّد + رفع، حسب الإعداد المختار
    const master = {
      low: ctx.createBiquadFilter(),
      high: ctx.createBiquadFilter(),
      limiter: ctx.createDynamicsCompressor(),
      makeup: ctx.createGain(),
      ceiling: ctx.createDynamicsCompressor(),
    };
    master.low.type = "lowshelf";
    master.low.frequency.value = 120;
    master.high.type = "highshelf";
    master.high.frequency.value = 8000;
    // سقف أمان أخير (لكل الإعدادات، حتى "بلا"): يمسك القمم قبل ما تتشوّه عند ٠ ديسيبل
    master.ceiling.threshold.value = -3;
    master.ceiling.knee.value = 0;
    master.ceiling.ratio.value = 20;
    master.ceiling.attack.value = 0.001;
    master.ceiling.release.value = 0.08;
    comp.connect(master.low).connect(master.high).connect(master.limiter).connect(master.makeup).connect(master.ceiling).connect(out);
    applyMaster(master, preset, ctx);

    const delay = ctx.createDelay();
    delay.delayTime.value = 0.22;
    const feedback = ctx.createGain();
    const wet = ctx.createGain();
    delay.connect(feedback).connect(delay);
    delay.connect(wet).connect(input);
    return { input, delay, feedback, wet, master };
  }

  /* إعدادات الماستر الجاهزة (مثل BandLab Mastering): "بلا" يمرّر الصوت كما هو.
     المحدِّد يمنع التشوّه لما نرفع الصوت، فالرفع (makeup) آمن حتى بـ"قوي". */
  const MASTER_PRESETS = {
    none: { low: 0, high: 0, threshold: 0, ratio: 1, knee: 0, makeup: 1 },
    warm: { low: 3, high: -2, threshold: -12, ratio: 2.5, knee: 8, makeup: 1.15 },
    balanced: { low: 1.5, high: 2, threshold: -14, ratio: 3, knee: 6, makeup: 1.25 },
    loud: { low: 3, high: 3, threshold: -18, ratio: 8, knee: 4, makeup: 1.7 },
  };
  let masterPreset = "none";
  try {
    const saved = localStorage.getItem("beepMaster");
    if (MASTER_PRESETS[saved]) masterPreset = saved;
  } catch {
    // التخزين محجوب — بلا ماستر
  }
  let liveMaster = null; // عُقد الماستر بالتشغيل الحي — نغيّرها فوراً لما يتغيّر الإعداد

  function applyMaster(master, id, ctx) {
    const p = MASTER_PRESETS[id] || MASTER_PRESETS.none;
    const at = ctx.currentTime;
    master.low.gain.setTargetAtTime(p.low, at, 0.05);
    master.high.gain.setTargetAtTime(p.high, at, 0.05);
    master.limiter.threshold.setValueAtTime(p.threshold, at);
    master.limiter.ratio.setValueAtTime(p.ratio, at);
    master.limiter.knee.setValueAtTime(p.knee, at);
    master.limiter.attack.setValueAtTime(0.004, at);
    master.limiter.release.setValueAtTime(0.2, at);
    master.makeup.gain.setTargetAtTime(p.makeup, at, 0.05);
  }

  /* 10 "آلات" مصنوعة كلها تركيب توافقيات (Harmonics) — نفس الأسلوب، بس بنِسَب
     وأشكال مغلاف مختلفة تحاكي طبيعة كل آلة (لا عيّنات صوت حقيقية، الكل تخليق):
     - وترية مقروعة/منتوفة (بيانو، بانجو): هجوم فوري/شبه فوري وتلاشٍ
       أُسّي مباشر بلا استقرار. الفرق بينها بسرعة الهجوم وميزان التوافقيات
       (بانجو أسرع اهتزازاً وتوافقياته الفردية العليا أقوى = طنين "رنّان").
     - نفخية (فلوت، ترمبيت، ساكسفون، أكورديون): هجوم أبطأ ويستقر بمستوى شبه
       ثابت أغلب مدة النغمة (sustainRatio)، عكس المقروعة تماماً. الترمبيت
       أسطع فلتراً وتوافقياته أقوى (نفخة نحاسية)، الفلوت والساكس تهتز بخفة
       (Vibrato) وسمتها أنقى (تركيبة توافقيات أبسط).
     - كمان: مزيج الاثنين — هجوم متوسط (قوس لا نقرة) واستقرار جزئي، مع اهتزاز.
     - جرس وصندوق موسيقى: توافقيات بنِسَب غير صحيحة عمداً (Inharmonicity) —
       هذا اللي يعطي الطنين المعدني المميز بدل نغمة موسيقية "نظيفة". */
  const INSTRUMENTS = {
    piano: {
      sampled: "piano", // بيانو حقيقي مسجّل (Salamander) لما تجهز العيّنات، والتخليق بديل لحين تحميلها
      harmonics: [
        { mult: 1, weight: 1, type: "triangle" },
        { mult: 2, weight: 0.5, type: "sine" },
        { mult: 3, weight: 0.22, type: "sine" },
        { mult: 4, weight: 0.12, type: "sine" },
      ],
      attack: 0.008,
      sustainRatio: 0,
      filterBrightMult: 9,
      filterDarkMult: 2,
      ringScale: 1,
    },
    flute: {
      harmonics: [
        { mult: 1, weight: 1, type: "sine" },
        { mult: 2, weight: 0.15, type: "sine" },
        { mult: 3, weight: 0.05, type: "sine" },
      ],
      attack: 0.09,
      sustainRatio: 0.7,
      filterBrightMult: 4,
      filterDarkMult: 3,
      vibrato: { rateHz: 5.5, depthRatio: 0.007 },
      ringScale: 1.15,
    },
    violin: {
      harmonics: [
        { mult: 1, weight: 1, type: "sawtooth" },
        { mult: 2, weight: 0.3, type: "sine" },
        { mult: 3, weight: 0.25, type: "sine" },
        { mult: 4, weight: 0.15, type: "sine" },
      ],
      attack: 0.05,
      sustainRatio: 0.65,
      filterBrightMult: 7,
      filterDarkMult: 2.5,
      vibrato: { rateHz: 6, depthRatio: 0.008 },
      ringScale: 1.05,
    },
    trumpet: {
      harmonics: [
        { mult: 1, weight: 1, type: "sawtooth" },
        { mult: 2, weight: 0.6, type: "sawtooth" },
        { mult: 3, weight: 0.45, type: "sine" },
        { mult: 4, weight: 0.3, type: "sine" },
        { mult: 5, weight: 0.18, type: "sine" },
      ],
      attack: 0.025,
      sustainRatio: 0.6,
      filterBrightMult: 14,
      filterDarkMult: 5,
      ringScale: 0.95,
    },
    sax: {
      harmonics: [
        { mult: 1, weight: 1, type: "triangle" },
        { mult: 2, weight: 0.2, type: "sine" },
        { mult: 3, weight: 0.4, type: "sine" },
        { mult: 5, weight: 0.2, type: "sine" },
      ],
      attack: 0.04,
      sustainRatio: 0.65,
      filterBrightMult: 6,
      filterDarkMult: 2.2,
      vibrato: { rateHz: 5, depthRatio: 0.006 },
      ringScale: 1.05,
    },
    banjo: {
      harmonics: [
        { mult: 1, weight: 1, type: "sawtooth" },
        { mult: 2, weight: 0.4, type: "sine" },
        { mult: 4, weight: 0.3, type: "sine" },
        { mult: 6, weight: 0.15, type: "sine" },
      ],
      attack: 0.002,
      sustainRatio: 0,
      filterBrightMult: 13,
      filterDarkMult: 3,
      ringScale: 0.55,
    },
    bell: {
      // نِسَب توافقيات غير صحيحة (2.4، 3.9، 5.4 بدل 2، 3، 4) عمداً — هذا اللي
      // يعطي طنين الجرس المعدني المميز (Inharmonicity)، عكس بقية الآلات هنا
      harmonics: [
        { mult: 1, weight: 1, type: "sine" },
        { mult: 2.4, weight: 0.5, type: "sine" },
        { mult: 3.9, weight: 0.3, type: "sine" },
        { mult: 5.4, weight: 0.15, type: "sine" },
      ],
      attack: 0.004,
      sustainRatio: 0,
      filterBrightMult: 10,
      filterDarkMult: 3,
      ringScale: 1.6,
    },
    accordion: {
      harmonics: [
        { mult: 1, weight: 1, type: "square" },
        { mult: 2, weight: 0.35, type: "sine" },
        { mult: 3, weight: 0.3, type: "sine" },
        { mult: 4, weight: 0.2, type: "sine" },
      ],
      attack: 0.02,
      sustainRatio: 0.85,
      filterBrightMult: 6,
      filterDarkMult: 4.5,
      ringScale: 1,
    },
    musicbox: {
      harmonics: [
        { mult: 1, weight: 1, type: "sine" },
        { mult: 2.02, weight: 0.35, type: "sine" },
        { mult: 4.05, weight: 0.15, type: "sine" },
      ],
      attack: 0.003,
      sustainRatio: 0,
      filterBrightMult: 12,
      filterDarkMult: 4,
      ringScale: 0.85,
    },
    /* INSTRUMENTS-EXTRA-START — مولَّد بـgen-instruments، لا تعدّله يدوياً */
    epiano: {
      harmonics: [{ mult: 1, weight: 1, type: "sine" }, { mult: 2, weight: 0.35, type: "sine" }, { mult: 3, weight: 0.06, type: "sine" }, { mult: 7, weight: 0.05, type: "sine" }],
      attack: 0.005,
      sustainRatio: 0,
      filterBrightMult: 8,
      filterDarkMult: 3,
      ringScale: 1.3,
      level: 0.93,
    },
    organ: {
      harmonics: [{ mult: 1, weight: 1, type: "sine" }, { mult: 2, weight: 0.6, type: "sine" }, { mult: 3, weight: 0.4, type: "sine" }, { mult: 4, weight: 0.3, type: "sine" }, { mult: 6, weight: 0.2, type: "sine" }, { mult: 8, weight: 0.12, type: "sine" }],
      attack: 0.04,
      sustainRatio: 0.92,
      filterBrightMult: 6,
      filterDarkMult: 5,
      ringScale: 1.3,
      level: 0.31,
    },
    harpsichord: {
      harmonics: [{ mult: 1, weight: 1, type: "sawtooth" }, { mult: 2, weight: 0.5, type: "sawtooth" }, { mult: 3, weight: 0.3, type: "square" }, { mult: 4, weight: 0.2, type: "sine" }],
      attack: 0.001,
      sustainRatio: 0,
      filterBrightMult: 14,
      filterDarkMult: 4,
      ringScale: 0.55,
      level: 1.29,
    },
    celesta: {
      harmonics: [{ mult: 1, weight: 1, type: "sine" }, { mult: 4, weight: 0.35, type: "sine" }, { mult: 5, weight: 0.2, type: "sine" }, { mult: 6, weight: 0.1, type: "sine" }],
      attack: 0.003,
      sustainRatio: 0,
      filterBrightMult: 12,
      filterDarkMult: 5,
      ringScale: 1.3,
      level: 0.9,
    },
    melodica: {
      harmonics: [{ mult: 1, weight: 1, type: "square" }, { mult: 2, weight: 0.3, type: "sine" }, { mult: 3, weight: 0.25, type: "sine" }],
      attack: 0.05,
      sustainRatio: 0.85,
      filterBrightMult: 5,
      filterDarkMult: 4,
      ringScale: 1,
      vibrato: { rateHz: 5, depthRatio: 0.004 },
      level: 0.37,
    },
    harp: {
      harmonics: [{ mult: 1, weight: 1, type: "triangle" }, { mult: 2, weight: 0.35, type: "sine" }, { mult: 3, weight: 0.15, type: "sine" }, { mult: 4, weight: 0.08, type: "sine" }],
      attack: 0.004,
      sustainRatio: 0,
      filterBrightMult: 6,
      filterDarkMult: 2,
      ringScale: 1.6,
      level: 1.04,
    },
    guitar: {
      harmonics: [{ mult: 1, weight: 1, type: "triangle" }, { mult: 2, weight: 0.5, type: "sine" }, { mult: 3, weight: 0.3, type: "sine" }, { mult: 4, weight: 0.15, type: "sine" }, { mult: 5, weight: 0.1, type: "sine" }],
      attack: 0.003,
      sustainRatio: 0,
      filterBrightMult: 8,
      filterDarkMult: 2.2,
      ringScale: 0.9,
      level: 0.99,
    },
    oud: {
      harmonics: [{ mult: 1, weight: 1, type: "sawtooth" }, { mult: 2, weight: 0.5, type: "sine" }, { mult: 3, weight: 0.35, type: "sine" }, { mult: 4, weight: 0.2, type: "sine" }, { mult: 5, weight: 0.12, type: "sine" }],
      attack: 0.002,
      sustainRatio: 0,
      filterBrightMult: 7,
      filterDarkMult: 2.2,
      ringScale: 0.8,
      level: 1.12,
    },
    qanun: {
      harmonics: [{ mult: 1, weight: 1, type: "triangle" }, { mult: 2, weight: 0.6, type: "sine" }, { mult: 3, weight: 0.5, type: "sine" }, { mult: 4, weight: 0.4, type: "sine" }, { mult: 5, weight: 0.3, type: "sine" }, { mult: 6, weight: 0.2, type: "sine" }],
      attack: 0.002,
      sustainRatio: 0,
      filterBrightMult: 13,
      filterDarkMult: 4,
      ringScale: 1.1,
      level: 0.68,
    },
    santoor: {
      harmonics: [{ mult: 1, weight: 1, type: "triangle" }, { mult: 1, weight: 0.7, type: "triangle", cents: 6 }, { mult: 2, weight: 0.5, type: "sine" }, { mult: 3.02, weight: 0.4, type: "sine" }, { mult: 4, weight: 0.3, type: "sine" }, { mult: 5.03, weight: 0.2, type: "sine" }],
      attack: 0.002,
      sustainRatio: 0,
      filterBrightMult: 12,
      filterDarkMult: 3.5,
      ringScale: 1.2,
      level: 0.69,
    },
    kalimba: {
      harmonics: [{ mult: 1, weight: 1, type: "sine" }, { mult: 5.4, weight: 0.35, type: "sine" }, { mult: 8.9, weight: 0.08, type: "sine" }],
      attack: 0.002,
      sustainRatio: 0,
      filterBrightMult: 10,
      filterDarkMult: 4,
      ringScale: 0.95,
      level: 0.97,
    },
    cello: {
      harmonics: [{ mult: 1, weight: 1, type: "sawtooth" }, { mult: 2, weight: 0.5, type: "sawtooth" }, { mult: 3, weight: 0.3, type: "sine" }, { mult: 4, weight: 0.2, type: "sine" }],
      attack: 0.12,
      sustainRatio: 0.75,
      filterBrightMult: 4,
      filterDarkMult: 2,
      ringScale: 1.1,
      vibrato: { rateHz: 5.2, depthRatio: 0.006 },
      level: 0.57,
    },
    strings: {
      harmonics: [{ mult: 1, weight: 1, type: "sawtooth", cents: -8 }, { mult: 1, weight: 1, type: "sawtooth", cents: 8 }, { mult: 2, weight: 0.3, type: "sine" }, { mult: 3, weight: 0.2, type: "sine" }],
      attack: 0.25,
      sustainRatio: 0.9,
      filterBrightMult: 5,
      filterDarkMult: 3,
      ringScale: 1.3,
      vibrato: { rateHz: 5, depthRatio: 0.005 },
      level: 0.39,
    },
    doublebass: {
      harmonics: [{ mult: 1, weight: 1, type: "sine" }, { mult: 2, weight: 0.6, type: "triangle" }, { mult: 3, weight: 0.3, type: "sine" }, { mult: 4, weight: 0.15, type: "sine" }],
      attack: 0.02,
      sustainRatio: 0.6,
      filterBrightMult: 3,
      filterDarkMult: 1.5,
      ringScale: 1.1,
      level: 0.41,
    },
    nay: {
      harmonics: [{ mult: 1, weight: 1, type: "sine" }, { mult: 2, weight: 0.12, type: "sine" }, { mult: 3, weight: 0.06, type: "sine" }, { mult: 4, weight: 0.03, type: "sine" }],
      attack: 0.14,
      sustainRatio: 0.75,
      filterBrightMult: 3,
      filterDarkMult: 2.5,
      ringScale: 1.2,
      vibrato: { rateHz: 5.2, depthRatio: 0.011 },
      level: 0.48,
    },
    clarinet: {
      harmonics: [{ mult: 1, weight: 1, type: "sine" }, { mult: 3, weight: 0.5, type: "sine" }, { mult: 5, weight: 0.3, type: "sine" }, { mult: 7, weight: 0.15, type: "sine" }, { mult: 2, weight: 0.05, type: "sine" }],
      attack: 0.04,
      sustainRatio: 0.8,
      filterBrightMult: 5,
      filterDarkMult: 3.5,
      ringScale: 1,
      level: 0.41,
    },
    oboe: {
      harmonics: [{ mult: 1, weight: 1, type: "sawtooth" }, { mult: 2, weight: 0.6, type: "sine" }, { mult: 3, weight: 0.5, type: "sine" }, { mult: 4, weight: 0.35, type: "sine" }, { mult: 5, weight: 0.25, type: "sine" }],
      attack: 0.03,
      sustainRatio: 0.8,
      filterBrightMult: 8,
      filterDarkMult: 4,
      ringScale: 1,
      vibrato: { rateHz: 5.5, depthRatio: 0.006 },
      level: 0.36,
    },
    horn: {
      harmonics: [{ mult: 1, weight: 1, type: "sine" }, { mult: 2, weight: 0.5, type: "sine" }, { mult: 3, weight: 0.3, type: "triangle" }, { mult: 4, weight: 0.2, type: "sine" }],
      attack: 0.07,
      sustainRatio: 0.8,
      filterBrightMult: 3,
      filterDarkMult: 2.5,
      ringScale: 1.1,
      level: 0.37,
    },
    trombone: {
      harmonics: [{ mult: 1, weight: 1, type: "sawtooth" }, { mult: 2, weight: 0.7, type: "sawtooth" }, { mult: 3, weight: 0.4, type: "sine" }, { mult: 4, weight: 0.25, type: "sine" }],
      attack: 0.05,
      sustainRatio: 0.75,
      filterBrightMult: 6,
      filterDarkMult: 3,
      ringScale: 1,
      level: 0.52,
    },
    harmonica: {
      harmonics: [{ mult: 1, weight: 1, type: "square" }, { mult: 2, weight: 0.4, type: "sawtooth" }, { mult: 3, weight: 0.25, type: "sine" }],
      attack: 0.03,
      sustainRatio: 0.85,
      filterBrightMult: 7,
      filterDarkMult: 4,
      ringScale: 1,
      vibrato: { rateHz: 5, depthRatio: 0.008 },
      level: 0.38,
    },
    recorder: {
      harmonics: [{ mult: 1, weight: 1, type: "sine" }, { mult: 2, weight: 0.08, type: "sine" }, { mult: 3, weight: 0.03, type: "sine" }],
      attack: 0.06,
      sustainRatio: 0.8,
      filterBrightMult: 3,
      filterDarkMult: 2.5,
      ringScale: 1,
      vibrato: { rateHz: 5, depthRatio: 0.003 },
      level: 0.53,
    },
    marimba: {
      harmonics: [{ mult: 1, weight: 1, type: "sine" }, { mult: 4, weight: 0.25, type: "sine" }, { mult: 10, weight: 0.08, type: "sine" }],
      attack: 0.002,
      sustainRatio: 0,
      filterBrightMult: 6,
      filterDarkMult: 2,
      ringScale: 0.75,
      level: 1.16,
    },
    xylophone: {
      harmonics: [{ mult: 1, weight: 1, type: "sine" }, { mult: 3, weight: 0.45, type: "sine" }, { mult: 6, weight: 0.25, type: "sine" }],
      attack: 0.001,
      sustainRatio: 0,
      filterBrightMult: 11,
      filterDarkMult: 4,
      ringScale: 0.45,
      level: 1.22,
    },
    vibraphone: {
      harmonics: [{ mult: 1, weight: 1, type: "sine" }, { mult: 4, weight: 0.3, type: "sine" }, { mult: 10, weight: 0.06, type: "sine" }],
      attack: 0.003,
      sustainRatio: 0,
      filterBrightMult: 8,
      filterDarkMult: 3,
      ringScale: 1.8,
      vibrato: { rateHz: 5.5, depthRatio: 0.004 },
      level: 0.84,
    },
    glockenspiel: {
      harmonics: [{ mult: 1, weight: 1, type: "sine" }, { mult: 2.76, weight: 0.5, type: "sine" }, { mult: 5.4, weight: 0.3, type: "sine" }, { mult: 8.93, weight: 0.15, type: "sine" }],
      attack: 0.002,
      sustainRatio: 0,
      filterBrightMult: 14,
      filterDarkMult: 6,
      ringScale: 1.3,
      level: 0.71,
    },
    steelpan: {
      harmonics: [{ mult: 1, weight: 1, type: "sine" }, { mult: 2, weight: 0.55, type: "sine" }, { mult: 3, weight: 0.3, type: "sine" }, { mult: 4.05, weight: 0.2, type: "sine" }],
      attack: 0.004,
      sustainRatio: 0,
      filterBrightMult: 9,
      filterDarkMult: 3,
      ringScale: 0.9,
      level: 0.82,
    },
    synth: {
      harmonics: [{ mult: 1, weight: 1, type: "sawtooth", cents: -6 }, { mult: 1, weight: 0.8, type: "sawtooth", cents: 6 }, { mult: 2, weight: 0.25, type: "sine" }],
      attack: 0.02,
      sustainRatio: 0.8,
      filterBrightMult: 5,
      filterDarkMult: 3,
      ringScale: 1.1,
      level: 0.48,
    },
    chiptune: {
      harmonics: [{ mult: 1, weight: 1, type: "square" }],
      attack: 0.002,
      sustainRatio: 0.85,
      filterBrightMult: 10,
      filterDarkMult: 6,
      ringScale: 0.9,
      level: 0.45,
    },
    synthbass: {
      harmonics: [{ mult: 1, weight: 1, type: "sawtooth" }, { mult: 2, weight: 0.3, type: "square" }],
      attack: 0.005,
      sustainRatio: 0.5,
      filterBrightMult: 3,
      filterDarkMult: 1.2,
      ringScale: 0.8,
      level: 0.92,
    },
    choir: {
      harmonics: [{ mult: 1, weight: 1, type: "sine" }, { mult: 2, weight: 0.5, type: "sine" }, { mult: 3, weight: 0.35, type: "sine" }, { mult: 4, weight: 0.2, type: "sine" }, { mult: 5, weight: 0.15, type: "sine" }, { mult: 1, weight: 0.6, type: "sine", cents: 9 }],
      attack: 0.22,
      sustainRatio: 0.9,
      filterBrightMult: 4,
      filterDarkMult: 3,
      ringScale: 1.3,
      vibrato: { rateHz: 5, depthRatio: 0.008 },
      level: 0.3,
    },
    /* INSTRUMENTS-EXTRA-END */
  };
  /* INSTRUMENT-LEVELS-START — مولَّد */
  Object.entries({ accordion: 0.35, banjo: 1.81, violin: 0.59, flute: 0.54, trumpet: 0.51, sax: 0.48, bell: 0.66 }).forEach(([id, level]) => (INSTRUMENTS[id].level = level));
  /* INSTRUMENT-LEVELS-END */

  /* آلات أُضيفت مع العيّنات الحقيقية: تخليقها (لحين التحميل) مستعار من أقرب آلة */
  Object.assign(INSTRUMENTS, {
    upright: { ...INSTRUMENTS.piano },
    felt: { ...INSTRUMENTS.piano, felt: true, filterBrightMult: 3 },
    guitar_ac: { ...INSTRUMENTS.guitar },
    guitar_el: { ...INSTRUMENTS.guitar, ringScale: 1.2 },
    ebass: { ...INSTRUMENTS.synthbass },
    harmonium: { ...INSTRUMENTS.accordion },
    bassoon: { ...INSTRUMENTS.clarinet, filterBrightMult: 3 },
    tuba: { ...INSTRUMENTS.trombone, filterBrightMult: 3 },
  });

  // "صوتك": أي صوت يسجّله الزائر أو يختاره يصير آلة — نفس البيانو لين يوجد صوت
  INSTRUMENTS.custom = { ...INSTRUMENTS.piano, sample: true };
  let customSample = null; // AudioBuffer أحادي، مقصوص ومُطبَّع (انظر prepareSample)
  const SAMPLE_BASE = 261.63; // الصوت المسجّل يُعامل كأنه Do الوسطى (C4)

  /* ===== آلات حقيقية: عيّنات مسجّلة لكل نغمة كم نصف درجة =====
     البيانو الكبير: Salamander Grand Piano (CC BY 3.0 — Alexander Holm).
     البقية: مكتبة tonejs-instruments (CC BY 3.0 — Nicholaus Brosowsky، عن VSCO 2
     وKaroryfer وIowa وFreesound) وVSCO 2 CE (CC0 — Sam Gossner). التفاصيل بـ
     assets/audio/CREDITS.txt. النغمات بين العيّنات تُعزف بتسريع أقرب عيّنة أو إبطائها
     (تشمل أرباع الأصوات بدقة لأن النسبة عشرية). كل آلة تُحمَّل أول ما تُختار فقط
     (٢٠٠–٦٠٠ كيلو)، والتخليق القديم يعزف لحين جاهزيتها أو لو انقطع الاتصال.
     فكّ الترميز بسياق غير متصل عشان ما نحتاج ضغطة مستخدم قبل التحميل. */
  const PIANO_SAMPLE_NAMES = ["A0"];
  for (let o = 1; o <= 7; o++) ["C", "Ds", "Fs", "A"].forEach((n) => PIANO_SAMPLE_NAMES.push(n + o));
  PIANO_SAMPLE_NAMES.push("C8");
  const SAMPLE_SETS = {
    piano: PIANO_SAMPLE_NAMES.join(" "),
    upright: "C1 Ds1 Fs1 A1 C2 Ds2 Fs2 A2 C3 Ds3 Fs3 A3 C4 Ds4 Fs4 A4 C5 Ds5 Fs5 A5 C6 Ds6 Fs6 A6 C7 Ds7 Fs7 A7 C8",
    organ: "C1 Ds1 Fs1 A1 C2 Ds2 Fs2 A2 C3 Ds3 Fs3 A3 C4 Ds4 Fs4 A4 C5 Ds5 Fs5 A5 C6",
    harmonium: "C2 Ds2 Fs2 A2 C3 Ds3 Fs3 A3 C4 Ds4 F4 Gs4 B4 D5",
    harp: "E1 G1 B1 D2 F2 A2 C3 E3 G3 B3 D4 F4 A4 C5 E5 G5 B5 D6 F6 A6 B6 D7 F7",
    guitar: "B1 D2 E2 Fs2 A2 B2 D3 E3 G3 A3 B3 Cs4 E4 Fs4 A4 B4 D5 E5 G5 As5",
    guitar_ac: "D2 F2 Gs2 B2 D3 F3 Gs3 B3 D4 F4 Gs4 B4 D5",
    guitar_el: "Cs2 E2 Fs2 A2 C3 Ds3 Fs3 A3 C4 Ds4 Fs4 A4 C5 Ds5 Fs5 A5 C6",
    ebass: "Cs1 E1 G1 As1 Cs2 E2 G2 As2 Cs3 E3 G3 As3 Cs4 E4 G4 As4 Cs5",
    violin: "G3 A3 C4 E4 G4 A4 C5 E5 G5 A5 C6 E6 G6 A6 C7",
    cello: "C2 Ds2 F2 Gs2 B2 D3 F3 Gs3 B3 D4 F4 Gs4 B4 C5",
    doublebass: "Fs1 G1 As1 C2 D2 E2 Fs2 A2 Cs3 E3 Gs3 B3",
    strings: "C2 E2 G2 B2 D3 F3 G3 A3 C4 D4 E4 G4 A4 C5 D5 F5 G5 B5 D6",
    flute: "C4 E4 A4 C5 E5 A5 C6 E6 A6 C7",
    clarinet: "D3 F3 As3 D4 F4 As4 D5 F5 As5 D6 F6",
    oboe: "As3 D4 F4 As4 D5 F5 As5 D6 F6",
    bassoon: "G2 A2 C3 G3 A3 C4 E4 G4 A4 C5",
    sax: "Cs3 E3 G3 As3 Cs4 E4 G4 As4 Cs5 E5 G5 A5",
    horn: "A1 C2 Ds2 G2 D3 F3 A3 C4 D5 F5",
    trumpet: "F3 A3 C4 Ds4 F4 G4 As4 D5 F5 A5 C6",
    trombone: "As1 Cs2 Ds2 F2 Gs2 As2 C3 Ds3 F3 Gs3 As3 Cs4 Ds4 F4",
    tuba: "F1 As1 Ds2 F2 As2 D3 F3 As3 D4",
    marimba: "F2 C3 G3 B3 F4 C5 G5 B5 F6 C7",
    xylophone: "G4 C5 G5 C6 G6 C7 G7 C8",
    glockenspiel: "G5 C6 G6 C7 G7 C8",
  };
  // كل آلة لها تسجيلات تعزف منها (البيانو الهادئ = البيانو الكبير بفلتر لباد)
  Object.keys(SAMPLE_SETS).forEach((id) => (INSTRUMENTS[id].sampled = id));
  INSTRUMENTS.felt.sampled = "piano";
  // آلات النفَس والقوس: العيّنة ٤ ثوانٍ، فنكرّر وسطها (بتداخل ناعم) ما دامت النغمة ممسوكة
  const LOOPED_SETS = new Set("organ harmonium violin cello doublebass strings flute clarinet oboe bassoon sax horn trumpet trombone tuba".split(" "));
  // ذيل الرفع (ثابت زمني بالثواني): البيانو يخمده المخمّد، الهارب والجلوكن يرنّان بعد الترك
  const SAMPLE_RELEASE = { harp: 0.5, glockenspiel: 0.6, marimba: 0.25, xylophone: 0.2, guitar: 0.15, guitar_ac: 0.15, guitar_el: 0.12, ebass: 0.07, organ: 0.06 };
  const NOTE_PC = { C: 0, Cs: 1, D: 2, Ds: 3, E: 4, F: 5, Fs: 6, G: 7, Gs: 8, A: 9, As: 10, B: 11 };
  const sampleBank = {}; // المجموعة → [{ midi, buffer, skip, norm, loop }] بعد اكتمال تحميلها
  const sampleLoading = {};

  function loadSampleSet(set) {
    if (!set || !SAMPLE_SETS[set]) return Promise.resolve();
    if (sampleLoading[set]) return sampleLoading[set];
    const base = new URL(`../assets/audio/${set}/`, SOUNDS_SCRIPT_URL);
    const decoder = new OfflineAudioContext(1, 1, 44100);
    sampleLoading[set] = Promise.all(
      SAMPLE_SETS[set].split(" ").map(async (name) => {
        const res = await fetch(new URL(name + ".mp3", base));
        if (!res.ok) throw new Error(name);
        const buffer = await decoder.decodeAudioData(await res.arrayBuffer());
        // مشفّر MP3 يضيف صمتاً قصيراً بأول الملف — نتخطّاه عشان النغمة تطلع لحظة الضغط
        const data = buffer.getChannelData(0);
        const sr = buffer.sampleRate;
        let peak = 0;
        for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
        let start = 0;
        while (start < data.length && Math.abs(data[start]) < peak * 0.02) start++;
        const midi = 12 * (Number(name.slice(-1)) + 1) + NOTE_PC[name.slice(0, -1)];
        // شدة متقاربة بين الآلات: البيانو بمعايرته الأصلية، والبقية بطاقة أعلى نصف ثانية
        // بأول ثانيتين ونص (الممدودة أعلى طاقة من المقروعة بنفس الذروة، والوتريات تتصاعد
        // ببطء) بسقف يمنع تضخيم الضربات القصيرة. الممدودة أخفض شوي لأنها ما تخفت
        let norm = 0.9 / (peak || 1);
        if (set !== "piano") {
          const n = Math.min(data.length - start, Math.round(0.5 * sr));
          let loud = 0;
          for (let a = start; a + n <= Math.min(data.length, start + 2.5 * sr); a += Math.round(0.1 * sr)) {
            let sum = 0;
            for (let i = a; i < a + n; i++) sum += data[i] * data[i];
            loud = Math.max(loud, Math.sqrt(sum / (n || 1)));
          }
          norm = Math.min((LOOPED_SETS.has(set) ? 0.16 : 0.2) / (loud || 1), 1.5 / (peak || 1));
        }
        return { midi, buffer, skip: start / sr, norm, loop: LOOPED_SETS.has(set) ? makeLoop(data, sr, start) : null };
      })
    )
      .then((list) => (sampleBank[set] = list))
      .catch(() => {
        sampleLoading[set] = null; // بلا اتصال مثلاً — نحاول مرة ثانية لاحقاً، والمركّب يغطّي
      });
    return sampleLoading[set];
  }

  /* حلقة تكرار بلا نقرة: نمزج آخر ٠٫٢ ثانية قبل نهاية الحلقة مع ما يسبق بدايتها، فلما
     يقفز التشغيل من النهاية للبداية يكمل الموج من حيث وصل. النهاية قبل التلاشي المخبوز
     بآخر الملف، والبداية بعد هجمة النفَس/القوس. */
  function makeLoop(data, sr, start) {
    const xf = Math.round(0.2 * sr);
    const to = data.length - Math.round(0.4 * sr);
    const rms = (a) => {
      let sum = 0;
      const n = Math.round(0.1 * sr);
      for (let i = a; i < a + n; i++) sum += data[i] * data[i];
      return Math.sqrt(sum / n) || 1e-6;
    };
    // البداية بعد ما تكتمل الهجمة: الوتريات الجماعية تتصاعد ببطء (ثانيتين أحياناً)،
    // فنبدأ الحلقة لما يوصل الصوت ٧٠٪ من أعلى مستواه، لا وسط التصاعد
    const step = Math.round(0.05 * sr);
    let top = 0;
    for (let i = start; i < to - step * 2; i += step) top = Math.max(top, rms(i));
    let from = start + Math.round(0.6 * sr);
    while (from < to - xf - 0.8 * sr && rms(from) < top * 0.7) from += step;
    if (to - from < xf + 0.4 * sr) return null;
    // النغمة المسجّلة تخفت شوي مع الوقت (حتى ٦ ديسيبل): نسوّي مستواها داخل الحلقة
    // حتى ما ينبض الصوت كل ما رجعت للبداية
    const ratio = clamp(rms(from) / rms(to - Math.round(0.1 * sr)), 0.4, 2.5);
    for (let i = from; i < to; i++) data[i] *= 1 + ((ratio - 1) * (i - from)) / (to - from);
    for (let i = 0; i < xf; i++) {
      const t = (i / xf) * (Math.PI / 2);
      data[to - xf + i] = data[to - xf + i] * Math.cos(t) + data[from - xf + i] * Math.sin(t);
    }
    return { start: from / sr, end: to / sr };
  }

  // يجهّز آلات قبل تشغيل/تصدير (بحدّ أقصى للانتظار: بلا اتصال يكمل بالتخليق)
  function ensureSamples(ids) {
    const sets = [...new Set(ids.map((id) => INSTRUMENTS[id]?.sampled).filter((s) => s && !sampleBank[s]))];
    if (!sets.length) return Promise.resolve();
    return Promise.race([Promise.all(sets.map(loadSampleSet)), new Promise((r) => setTimeout(r, 8000))]);
  }

  /* نغمة من العيّنات: أقرب عيّنة بسرعة تشغيل تعدّل النغمة. القوة تتحكم بالشدة وبسطوع
     الصوت معاً — الآلة الحقيقية تلمع أكثر لما تضغط/تنفخ أقوى. duration = مدة الإمساك،
     وبعدها الرفع. يرجّع null لو النغمة أبعد من مدى الآلة بكثير (التخليق يعزفها). */
  function playSampled(target, instrument, freq, startTime, duration, peakGain, pan) {
    const { ctx, dry, wet, live } = target;
    const set = instrument.sampled;
    const list = sampleBank[set];
    const midiF = 69 + 12 * Math.log2(freq / 440);
    const s = list.reduce((best, x) => (Math.abs(x.midi - midiF) < Math.abs(best.midi - midiF) ? x : best));
    if (Math.abs(s.midi - midiF) > 19) return null;
    const rate = 2 ** ((midiF - s.midi) / 12);
    const tau = SAMPLE_RELEASE[set] || (s.loop ? 0.12 : 0.09);
    const src = ctx.createBufferSource();
    src.buffer = s.buffer;
    src.playbackRate.value = rate;
    if (s.loop) {
      src.loop = true;
      src.loopStart = s.loop.start;
      src.loopEnd = s.loop.end;
    }
    const available = s.loop ? Infinity : (s.buffer.duration - s.skip) / rate;
    const end = Math.min(available, duration + tau * 7);
    // البيانو الهادئ (Felt): نفس البيانو الكبير بلباد على المطارق — أعتم وأنعم بكثير
    const felt = instrument.felt;
    const level = Math.max(peakGain * s.norm * 1.5 * (felt ? 0.8 : 1), 0.0001);
    const env = ctx.createGain();
    env._tau = tau;
    env.gain.setValueAtTime(level, startTime);
    if (duration < available) env.gain.setTargetAtTime(0.0001, startTime + duration, tau);
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = felt ? clamp(500 + 2200 * (peakGain / 0.3), 500, 2800) : clamp(1400 + 9000 * (peakGain / 0.3), 1400, 12000);
    src.connect(tone).connect(env);
    let out = env;
    if (pan && ctx.createStereoPanner) {
      out = ctx.createStereoPanner();
      out.pan.value = pan;
      env.connect(out);
    }
    out.connect(dry);
    if (wet) out.connect(wet);
    src.start(startTime, s.skip);
    src.stop(startTime + end + 0.05);
    if (live) {
      activeOscillators.push(src);
      highlightKey(freq, (startTime - ctx.currentTime) * 1000, Math.min(end, duration) * 1000);
    }
    return env;
  }

  let currentInstrument = "piano";

  // منزلق الصوت — تربيعي لأن الأذن تسمع الصوت لوغاريتمياً (نفس منزلق الموقع الشخصي)
  let volumeLevel = 0.8;
  try {
    const saved = parseFloat(localStorage.getItem("beepVolume"));
    if (saved >= 0 && saved <= 1) volumeLevel = saved;
  } catch {
    // التخزين محجوب — نكمل بالقيمة الافتراضية
  }
  const volumeInput = document.getElementById("beepVolume");
  if (volumeInput) {
    dressVolume(volumeInput);
    const paint = () => volumeInput.parentElement.style.setProperty("--level", volumeLevel);
    volumeInput.value = volumeLevel;
    paint();
    volumeInput.addEventListener("input", () => {
      volumeLevel = Number(volumeInput.value);
      paint();
      if (volumeGain) volumeGain.gain.setTargetAtTime(volumeLevel * volumeLevel, audioCtx.currentTime, 0.04);
      playSound("tick"); // تكّة لكل درجة — إحساس ملموس
      try {
        localStorage.setItem("beepVolume", String(volumeLevel));
      } catch {
        // لا شيء
      }
    });
  }
  const instrumentButtons = document.querySelectorAll("#instrumentPicker .instrument-btn");
  // شارة "جديد" تختفي لحالها بعد ٣٠ يوماً من data-new (تاريخ إضافة الآلة)
  instrumentButtons.forEach((b) => {
    if (b.dataset.new && Date.now() - Date.parse(b.dataset.new) < 30 * 864e5) b.classList.add("is-new");
  });
  /* ===== قائمة الآلات المنسدلة (على طريقة BandLab) =====
     شريط صغير فوق مفاتيح البيانو: ‹ الآلة الحالية › تفتح نافذة فيها أقسام + قائمة + زر ▶ للتجربة +
     بحث. تنفتح فوق الشريط (أو تحته لو ما في مساحة) وما تدفع الصفحة ولا تغطي البيانو، فتقدر
     تعزف وتجرّب الآلات وهي مفتوحة. على شاشة صغيرة جداً (جوال أفقي) تتحول لنافذة بملء الشاشة.
     الأزرار الأصلية (.instrument-btn) باقية بمعالجاتها كما هي: البحث وآخر ما استخدمت وشارة
     "جديد" كلها تشتغل عليها؛ هنا نلفّها بصفوف ونضيف زر التجربة بس. */
  const dd = document.getElementById("instrumentDd");
  const pop = document.getElementById("instrumentPop");
  const popBtn = document.getElementById("instCurrent");
  const listBox = document.getElementById("instrumentPicker");
  const catsBox = document.getElementById("instrumentCats");
  const isEnPage = document.documentElement.lang === "en";

  instrumentButtons.forEach((b) => {
    const row = document.createElement("div");
    row.className = "ip-row";
    b.parentNode.insertBefore(row, b);
    if (b.dataset.instrument !== "custom") {
      const pv = document.createElement("button");
      pv.type = "button";
      pv.className = "ip-preview";
      pv.textContent = "▶";
      pv.setAttribute("aria-label", (isEnPage ? "Preview " : "تجربة ") + b.textContent.trim());
      pv.addEventListener("click", () => previewInstrument(b.dataset.instrument, pv));
      row.append(pv);
    }
    row.append(b);
  });

  // أقسام على الجنب: ضغطة تنزّل القائمة لقسمها، والقسم الظاهر يتلوّن أثناء التمرير
  const instGroups = [...listBox.querySelectorAll(".instrument-group")];
  const catButtons = instGroups.map((g) => {
    const cb = document.createElement("button");
    cb.type = "button";
    cb.textContent = g.querySelector(".instrument-group-title").textContent.trim();
    cb.addEventListener("click", () => {
      listBox.scrollTo({ top: g.offsetTop - 2, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    });
    catsBox.append(cb);
    return cb;
  });
  let spyRaf = 0;
  const spy = () => {
    spyRaf = 0;
    let at = 0;
    instGroups.forEach((g, i) => { if (!g.hidden && g.offsetTop <= listBox.scrollTop + 24) at = i; });
    // آخر القائمة: الأقسام الأخيرة القصيرة ما توصل للأعلى، فالقسم الأخير هو المضيء
    if (listBox.scrollTop + listBox.clientHeight >= listBox.scrollHeight - 4) at = instGroups.findLastIndex((g) => !g.hidden);
    catButtons.forEach((cb, i) => cb.classList.toggle("active", i === at));
  };
  listBox.addEventListener("scroll", () => { if (!spyRaf) spyRaf = requestAnimationFrame(spy); });

  // مكان النافذة: في تبويب "اعزف" تنفتح دايماً فوق الشريط (تحته مفاتيح البيانو، وهي ما تنغطى أبداً)؛
  // لو فوق الشريط ما يكفي نرجّع الصفحة لفوق شوي لنفتح مساحة، وإلا تصير نافذة بملء الشاشة.
  // في تبويب "ألّف" الشريط بأول التبويب فتنفتح تحته.
  function placePop(adjust = true) {
    pop.classList.remove("up", "down", "sheet");
    const wantUp = dd.parentElement?.id !== "instrumentSlotCompose";
    const hdr = document.querySelector(".site-header");
    const measure = () => {
      const r = dd.getBoundingClientRect();
      const z = r.width / dd.offsetWidth || 1; // تكبير الصفحة (zoom على الشاشات العريضة)
      const topEdge = hdr ? Math.max(0, hdr.getBoundingClientRect().bottom) : 0;
      return { z, above: (r.top - topEdge - 8) / z, below: (window.innerHeight - r.bottom - 8) / z };
    };
    let m = measure();
    if (adjust && wantUp && m.above < 300 && window.scrollY > 0) {
      window.scrollBy(0, -(300 - m.above) * m.z);
      m = measure();
    }
    let dir = wantUp ? (m.above >= 200 ? "up" : "") : m.below >= 200 ? "down" : m.above >= 200 ? "up" : "";
    if (!dir) {
      pop.classList.add("sheet");
      pop.style.maxHeight = "";
      return;
    }
    pop.classList.add(dir);
    pop.style.maxHeight = Math.min(420, (dir === "up" ? m.above : m.below) - 6) + "px";
  }
  // الصفحة تحركت أو تغيّر المقاس وهي مفتوحة: نعيد حساب الاتجاه والارتفاع (بدون تحريك الصفحة)
  let replaceRaf = 0;
  function replacePop() {
    if (!replaceRaf) replaceRaf = requestAnimationFrame(() => { replaceRaf = 0; if (!pop.hidden) placePop(false); });
  }
  function onOutsidePointer(e) {
    if (dd.contains(e.target)) return;
    if (e.target.closest("#beepPlayKeys")) return; // مفاتيح البيانو تبقى تعزف والقائمة مفتوحة
    closeInstrumentPop();
  }
  function onPopKey(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeInstrumentPop();
      popBtn.focus({ preventScroll: true });
    }
  }
  function openInstrumentPop() {
    if (!pop.hidden) return;
    pop.hidden = false;
    popBtn.setAttribute("aria-expanded", "true");
    placePop(true);
    const active = listBox.querySelector(".instrument-group .instrument-btn.active");
    if (active) listBox.scrollTop = Math.max(0, active.offsetTop - listBox.clientHeight / 2);
    spy();
    document.addEventListener("pointerdown", onOutsidePointer, true);
    document.addEventListener("keydown", onPopKey, true);
    window.addEventListener("resize", replacePop);
    window.addEventListener("scroll", replacePop, { passive: true });
    // فتحها بالماوس: البحث جاهز للكتابة (باللمس لا، حتى ما يطلع الكيبورد ويغطيها)
    if (!navigator.maxTouchPoints && instrumentSearch) instrumentSearch.focus({ preventScroll: true });
  }
  function closeInstrumentPop() {
    if (pop.hidden) return;
    pop.hidden = true;
    popBtn.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", onOutsidePointer, true);
    document.removeEventListener("keydown", onPopKey, true);
    window.removeEventListener("resize", replacePop);
    window.removeEventListener("scroll", replacePop);
    if (instrumentSearch && instrumentSearch.value) {
      instrumentSearch.value = "";
      instrumentSearch.dispatchEvent(new Event("input")); // يرجّع كل الآلات للمرة الجاية
    }
  }
  popBtn.addEventListener("click", () => (pop.hidden ? openInstrumentPop() : closeInstrumentPop()));
  document.getElementById("instrumentClose")?.addEventListener("click", () => {
    closeInstrumentPop();
    popBtn.focus({ preventScroll: true });
  });

  // ‹ › : الآلة السابقة/التالية بدون فتح القائمة
  function stepInstrument(dir) {
    const all = [...instrumentButtons].filter((b) => b.dataset.instrument !== "custom" || customSample);
    const i = all.findIndex((b) => b.classList.contains("active"));
    all[(i + dir + all.length) % all.length]?.click();
  }
  document.getElementById("instPrev")?.addEventListener("click", () => stepInstrument(-1));
  document.getElementById("instNext")?.addEventListener("click", () => stepInstrument(1));

  // ▶ بجانب كل آلة: نغمة قصيرة بها بدون ما تتغير الآلة المختارة
  let instPreviewTimer = 0;
  let instPreviewRestore = null;
  async function previewInstrument(id, btn) {
    if (rec) return;
    const set = INSTRUMENTS[id]?.sampled;
    if (set && !sampleBank[set]) {
      btn.classList.add("loading");
      await Promise.race([loadSampleSet(set), new Promise((r) => setTimeout(r, 2500))]);
      btn.classList.remove("loading");
    }
    clearTimeout(instPreviewTimer);
    if (instPreviewRestore === null) instPreviewRestore = currentInstrument;
    currentInstrument = id;
    keyOn("KeyG");
    instPreviewTimer = setTimeout(() => {
      keyOff("KeyG");
      currentInstrument = instPreviewRestore;
      instPreviewRestore = null;
    }, 650);
  }
  const customSoundBox = document.getElementById("customSound");
  instrumentButtons.forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.dataset.instrument;
      // قسم التسجيل يظهر بس مع "صوتك" — كان دائم الظهور ويزحم قائمة الآلات
      if (customSoundBox) customSoundBox.hidden = id !== "custom";
      if (id === "custom" && !customSample) {
        setCustomStatus("need");
        return;
      }
      // ما نغيّر الآلة وسط تجربة ▶ جارية (كانت ترجّع الآلة القديمة بعد ٦٥٠ms وتلغي الاختيار)
      clearTimeout(instPreviewTimer);
      instPreviewRestore = null;
      currentInstrument = id;
      instrumentButtons.forEach((b) => b.classList.toggle("active", b === el));
      updateSoundSummary();
      rememberInstrument(id);
      if (id !== "custom") closeInstrumentPop();
      // نغمة تجربة بالآلة الجديدة بدل صوت النقرة (والمفتاح ينضغط على البيانو)،
      // إلا أثناء التسجيل حتى ما تنحفظ بالطبقة
      if (rec) return playClickSound();
      // الآلة المسجّلة تتحمّل أول مرة (ثانية تقريباً): النغمة التجريبية تنتظرها حتى
      // يُسمع صوتها الحقيقي لا المركّب، إلا لو تأخرت كثيراً أو انتقل لآلة غيرها
      const set = INSTRUMENTS[id].sampled;
      const preview = () => {
        el.classList.remove("loading");
        if (currentInstrument !== id || rec) return;
        keyOn("KeyG");
        setTimeout(() => keyOff("KeyG"), 350);
      };
      if (!set || sampleBank[set]) return preview();
      el.classList.add("loading");
      Promise.race([loadSampleSet(set), new Promise((r) => setTimeout(r, 2500))]).then(preview);
    });
  });
  // بعد ما تهدأ الصفحة: آلة البداية (أو المحفوظة) تتحمّل بلا ما تزاحم الرسم الأول
  (window.requestIdleCallback || ((fn) => setTimeout(fn, 1200)))(() => loadSampleSet(INSTRUMENTS[currentInstrument]?.sampled || "piano"));

  // "آخر ما استخدمت": ثلاث آلات فوق القائمة، كل زر يضغط زر الآلة الأصلي
  const recentBox = document.getElementById("instrumentRecent");
  function renderRecent() {
    if (!recentBox) return;
    let ids = [];
    try {
      ids = JSON.parse(localStorage.getItem("beepRecentInstruments")) || [];
    } catch {
      // تخزين ممنوع أو تالف — القائمة تبقى فاضية
    }
    const row = recentBox.querySelector(".instrument-group-chips");
    row.replaceChildren(
      ...ids.flatMap((id) => {
        const orig = document.querySelector(`#instrumentPicker .instrument-btn[data-instrument="${id}"]`);
        if (!orig) return [];
        const b = document.createElement("button");
        b.type = "button";
        b.className = "instrument-btn";
        b.textContent = orig.textContent;
        b.dataset.icon = orig.dataset.icon;
        if (orig.hasAttribute("data-real")) b.dataset.real = "";
        b.addEventListener("click", () => orig.click());
        return [b];
      })
    );
    recentBox.hidden = !row.children.length;
  }
  function rememberInstrument(id) {
    if (id === "custom") return;
    try {
      const ids = JSON.parse(localStorage.getItem("beepRecentInstruments")) || [];
      localStorage.setItem("beepRecentInstruments", JSON.stringify([id, ...ids.filter((x) => x !== id)].slice(0, 3)));
    } catch {
      // لا شيء
    }
    renderRecent();
  }
  renderRecent();

  /* أربعة "أمزجة" — كل وحدة تضبط سرعة النبضة (BPM) ونوع السلّم وأنماط الإيقاع
     المتاحة وقوة الصوت وكمية الصدى:
     - هادئ: نبضة بطيئة، إيقاع بنغمات طويلة، صدى واسع.
     - حيوي: نبضة سريعة، إيقاع مليان بأنصاف الضربات، صدى قليل (إحساس مباشر).
     - سعيد: متوسط السرعة، إيقاع راقص خفيف.
     - حالم: أبطأ الكل، سلّم صغير (Minor)، نغمات طويلة جداً، صدى كثيف.
     كل قيم rhythmPool مجموعها ٤ ضربات = مازورة كاملة، فكل شي يقع على الشبكة. */
  /* الطوابع الأربعة. الضابط المبنيّ عليه التصميم: العبرة بكون اللحن مما
     يُميّزه السامع كمستعمل بمجالس اللهو واللعب أو مشابه لألحانها — لا بكونه
     مفرحاً أو مريحاً (فذلك جيد بنصّ الجواب). لذلك التقييد وقع على الخصائص
     الراقصة لا على العاطفة:
     - لا سرعات بمدى الرقص المعتاد؛ أقصى سرعة هنا ٩٦ وهي سرعة مشي/مسيرة.
     - لا تقطيع إيقاعي (Syncopation): ما فيه نمط يبدأ بسكتة، فكل نغمة تقع
       على الضربة. التقطيع أبرز سمات الألحان الراقصة.
     - السكتات داخل المازورة باقية (تنفّس اللحن)، وهي غير التقطيع.
     - "رصين" بديل الطابع السريع السابق: مسيرة ثابتة على الضربات، وهو أقرب
       للموسيقى العسكرية المذكورة مثالاً للمحلَّلة. */
  const MOODS = {
    calm: {
      bpmRange: [56, 72],
      scale: "major",
      formRepeats: 1,
      rhythms: {
        4: [
          [1, 1, 2],
          [2, 1, -1],
          [2, 2],
          [1, 1, 1, -1],
          [2, -1, 1],
        ],
        3: [
          [1, 1, 1],
          [2, 1],
          [1, -1, 1],
          [1.5, 1.5],
        ],
      },
      cadenceRhythms: { 4: [2, 2], 3: [1, 2] },
      gainBase: 0.1,
      gainSwell: 0.09,
      delayWet: 0.16,
      delayFeedback: 0.22,
    },
    stately: {
      bpmRange: [80, 96],
      scale: "major",
      formRepeats: 1,
      rhythms: {
        4: [
          [1, 1, 1, 1],
          [2, 1, 1],
          [1, 1, 2],
          [2, 2],
        ],
        3: [
          [1, 1, 1],
          [2, 1],
          [1, 2],
        ],
      },
      cadenceRhythms: { 4: [2, 2], 3: [3] },
      gainBase: 0.13,
      gainSwell: 0.1,
      delayWet: 0.1,
      delayFeedback: 0.16,
    },
    happy: {
      bpmRange: [72, 88],
      scale: "major",
      formRepeats: 1,
      rhythms: {
        4: [
          [1, 1, 1, 1],
          [1, 1, 2],
          [2, 1, 1],
          [1, -1, 1, 1],
          [1, 1, -1, 1],
        ],
        3: [
          [1, 1, 1],
          [1, 2],
          [1, -1, 1],
        ],
      },
      cadenceRhythms: { 4: [2, 2], 3: [1, 2] },
      gainBase: 0.12,
      gainSwell: 0.1,
      delayWet: 0.14,
      delayFeedback: 0.2,
    },
    dreamy: {
      bpmRange: [46, 62],
      scale: "minor",
      formRepeats: 1,
      rhythms: {
        4: [
          [2, 2],
          [4],
          [2, -1, 1],
          [1, -1, 2],
          [3, 1],
        ],
        3: [
          [3],
          [1.5, 1.5],
          [1, -1, 1],
          [2, 1],
        ],
      },
      cadenceRhythms: { 4: [4], 3: [3] },
      gainBase: 0.08,
      gainSwell: 0.08,
      delayWet: 0.28,
      delayFeedback: 0.34,
    },
    /* سينمائي: مستوحى من أسلوبين بمقالات مؤلفي الأفلام — مرافقة بيانو متكررة
       بسيطة (Ostinato، أسلوب هيسايشي الأدنى)، و"لحن مرتبط" (Leitmotif، هوارد
       شور): الجملة كاملة ترجع مرة ثانية لكن بأوكتاف أعلى — نفس الفكرة بلون
       جديد. نفس قيود الطوابع الأخرى: بطيء، بلا تقطيع، بلا أي إيقاع ضارب. */
    cinematic: {
      bpmRange: [54, 66],
      scale: "major",
      formRepeats: 2,
      leitmotif: true,
      accompaniment: "arpeggio",
      rhythms: {
        4: [
          [2, 2],
          [3, 1],
          [2, 1, 1],
          [4],
        ],
        3: [
          [3],
          [2, 1],
          [1.5, 1.5],
        ],
      },
      cadenceRhythms: { 4: [4], 3: [3] },
      gainBase: 0.1,
      gainSwell: 0.08,
      delayWet: 0.24,
      delayFeedback: 0.3,
    },
  };


  let currentMood = "calm";
  // الأبعاد الأربعة للصوت (مادة FA7007): التردد، الإيقاع، الطابع، الديناميكية —
  // الطابع هو الآلة نفسها، والثلاثة الباقية هنا
  let octaveShift = 0;
  let tempoFactor = 1;
  let dynamicsGain = 1;
  const moodButtons = document.querySelectorAll("#moodPicker .mood-btn");
  moodButtons.forEach((el) => {
    el.addEventListener("click", () => {
      currentMood = el.dataset.mood;
      moodButtons.forEach((b) => b.classList.toggle("active", b === el));
      playClickSound();
      updateSoundSummary();
    });
  });

  // اللوحة المطوية تعرض اختيارك الحالي بعنوانها، فما تحتاج تفتحها عشان تعرفه
  function updateSoundSummary() {
    const now = document.getElementById("beepSoundNow");
    if (!now) return;
    const active = document.querySelector("#instrumentPicker .instrument-btn.active");
    now.textContent = active ? `${active.dataset.icon || ""} ${active.textContent.trim()}`.trim() : "";
  }

  // مفتاح التبديل بين اللوحة المبسطة (أوكتافة) والكاملة (٤ أوكتافات)
  const keyboardToggle = document.getElementById("keyboardToggle");
  const miniBoard = document.getElementById("beepKeys");
  const fullBoardWrap = document.getElementById("beepKeysFullWrap");
  if (keyboardToggle && miniBoard && fullBoardWrap) {
    keyboardToggle.addEventListener("click", () => {
      const showFull = fullBoardWrap.hidden;
      fullBoardWrap.hidden = !showFull;
      miniBoard.hidden = showFull;
      keyboardToggle.textContent = showFull ? keyboardToggle.dataset.labelMini : keyboardToggle.dataset.labelFull;
      keyboardToggle.classList.toggle("active", showFull);
      playClickSound();
    });
  }


  /* توليد جملة موسيقية (Motif) بقواعد حقيقية مستقاة من تحليل مجموعات ألحان
     واقعية (لا مشية عشوائية بحتة، اللي تحس منها "طفل يضغط أزرار"):
     - **التكرار (نفس الدرجة) والخطوة الصغيرة هما الأكثر شيوعاً بعيداً** —
       Vos & Troost (1989) على عينات فولكلورية من 7 دول: "unison and major 2nd
       are by far the most frequently used intervals"، نفس النتيجة تكررت
       بالموسيقى الكلاسيكية والشعبية. القفزات (٣+ درجات) نادرة نسبياً.
     - "Post-skip reversal / Gap fill": بعد أي قفزة، الحركة التالية تنعكس
       اتجاهها إلزامياً — مثبتة إحصائياً على مجموعة Essen الفولكلورية (٨٠٠٠+
       لحن) بأبحاث Von Hippel & Huron (2000)، وأكّدتها دراسة لاحقة على مجموعة
       Meertens (4,125 لحناً): الجمل اللي تتبع القفزة بخطوة معاكسة أكثر ثباتاً
       وحفظاً بالذاكرة عبر الأجيال.
     - نهاية الجملة تميل نحو درجة الاستقرار (نقطة الانطلاق) بدل ما تبقى تايهة. */
  function nextInterval(forceOppositeOf) {
    const r = rand();
    const size = r < 0.2 ? 0 : r < 0.62 ? 1 : r < 0.88 ? 2 : 3;
    const direction = size === 0 ? 1 : forceOppositeOf ? -Math.sign(forceOppositeOf) : rand() < 0.5 ? -1 : 1;
    return size * direction;
  }

  /* نغمات الوتر الحالي داخل نطاق اللحن — نختار أقربها للنغمة السابقة (حركة
     سلسة بلا قفزات مفاجئة). هذا جوهر "اللحن يمشي مع الهارموني": النغمة اللي
     تقع على ضربة قوية لازم تكون من نغمات الوتر، وإلا يحس المستمع إن اللحن
     "مو محطوط عليه". */
  function pickChordTone(chordRootDeg, nearDeg) {
    const options = [];
    for (let octave = 0; octave <= 1; octave++) {
      [0, 2, 4].forEach((interval) => {
        const degree = MELODY_LOW + chordRootDeg + interval + octave * 7;
        if (degree >= MELODY_LOW && degree <= MELODY_HIGH) options.push(degree);
      });
    }
    options.sort((a, b) => Math.abs(a - nearDeg) - Math.abs(b - nearDeg));
    // الأقرب غالباً، وأحياناً الثانية عشان ما يصير متوقعاً بشكل آلي
    return options[rand() < 0.72 ? 0 : Math.min(1, options.length - 1)];
  }

  /* قيادة الأصوات (Voice Leading): كل صوت بالمرافقة ينتقل لأقرب نغمة متاحة
     من الوتر التالي، بدل ما تُعزف كل الأوتار بوضع الأصل نفسه.
     قبل هذا كانت كل الأصوات تتحرك بالتوازي بين وتر ووتر = "خامسات وأوكتافات
     متوازية"، أول شي تمنعه مادة الهارموني. الحين كل صوت يمشي أقصر مسافة،
     وهذا اللي يخلي المرافقة تحس مترابطة لا مقفولة. */
  function voiceChord(chordRootDeg, previousVoices) {
    const candidates = [];
    [0, 2, 4].forEach((interval) => {
      for (let octave = 0; octave <= 1; octave++) candidates.push(chordRootDeg + interval + octave * 7);
    });
    if (!previousVoices) return [chordRootDeg + 2, chordRootDeg + 4];

    const used = new Set();
    return previousVoices.map((previous) => {
      const nearest = candidates
        .filter((c) => !used.has(c))
        .sort((a, b) => Math.abs(a - previous) - Math.abs(b - previous))[0];
      used.add(nearest);
      return nearest;
    });
  }

  // أسماء النغمات: بالحروف (C D E) أو بالنظام اللاتيني (Do Re Mi) المستخدم
  // بإسبانيا وأمريكا اللاتينية والتعليم الموسيقي العربي
  const NOTE_NAMES = {
    letters: ["C", "D", "E", "F", "G", "A", "B"],
    solfege: ["Do", "Re", "Mi", "Fa", "Sol", "La", "Si"],
  };

  // الأرقام الرومانية — لغة التحليل الموسيقي الأكاديمي المشتركة
  const ROMAN = {
    major: ["I", "ii", "iii", "IV", "V", "vi", "vii°"],
    minor: ["i", "ii°", "III", "iv", "v", "VI", "VII"],
  };

  /* لوحة التحليل: كنا نحسب المفتاح والتتابع والشكل والختام ثم نرميهم. عرضهم
     يحوّل الأداة من "لعبة تعزف" إلى أداة تدريس: الطالب يسمع ويشوف التحليل
     بنفس اللحظة. كل البيانات محسوبة أصلاً بـ playSequence. */
  const analysisBox = document.getElementById("beepAnalysis");
  const seedInput = document.getElementById("beepSeedInput");
  const noteNameToggle = document.getElementById("noteNameToggle");
  let noteStyle = noteNameToggle ? noteNameToggle.dataset.default || "letters" : "letters";
  let lastAnalysis = null;
  let currentSeed = null;

  function keyName(rootIndex) {
    return NOTE_NAMES[noteStyle][rootIndex];
  }

  function renderAnalysis(info) {
    lastAnalysis = info;
    // نعبّي خانة البذرة بالبذرة المعزوفة فعلاً — يشوفها وينسخها أو يعدّلها
    if (seedInput && document.activeElement !== seedInput) seedInput.value = info.seed;
    if (!analysisBox) return;
    const t = analysisBox.dataset;
    const roman = info.chords.slice(0, 4).map((degree) => ROMAN[info.mode][degree]);
    const modeLabel = info.mode === "major" ? t.labelMajor : t.labelMinor;
    const approach = ROMAN[info.mode][info.cadenceApproach];
    const tonic = ROMAN[info.mode][0];
    const cadenceName = info.cadenceApproach === 4 ? t.labelCadenceAuthentic : t.labelCadencePlagal;
    analysisBox.innerHTML = `
      <div class="beep-analysis-row"><span>${t.labelKey}</span><strong>${keyName(info.rootIndex)} ${modeLabel}</strong></div>
      <div class="beep-analysis-row"><span>${t.labelTempo}</span><strong dir="ltr">${info.bpm} BPM</strong></div>
      <div class="beep-analysis-row"><span>${t.labelMeter}</span><strong dir="ltr">${info.meter}/4</strong></div>
      <div class="beep-analysis-row"><span>${t.labelProgression}</span><strong dir="ltr">${roman.join(" – ")}</strong></div>
      <div class="beep-analysis-row"><span>${t.labelForm}</span><strong>${t.labelFormValue}</strong></div>
      <div class="beep-analysis-row"><span>${t.labelCadence}</span><strong>${cadenceName} <span dir="ltr">(${approach}→${tonic})</span></strong></div>
      <div class="beep-analysis-row"><span>${t.labelSeed}</span><strong dir="ltr">${info.seed}</strong></div>
    `;
  }

  if (noteNameToggle) {
    noteNameToggle.addEventListener("click", () => {
      noteStyle = noteStyle === "letters" ? "solfege" : "letters";
      // النص يعرض الخيار الثاني (اللي بيتحول له لو ضغط) — نفس منطق زر اللوحة
      noteNameToggle.textContent =
        noteStyle === "letters" ? noteNameToggle.dataset.labelSolfege : noteNameToggle.dataset.labelLetters;
      if (lastAnalysis) renderAnalysis(lastAnalysis);
      playClickSound();
    });
  }

  /* نسخ رابط يعيد نفس المقطوعة بالضبط (بذرة + مزاج + آلة) — بدونه ما يقدر
     أحد يشارك مثالاً ثابتاً أو يستخدمه بمحاضرة */
  const shareSeedBtn = document.getElementById("beepShareSeed");
  if (shareSeedBtn) {
    shareSeedBtn.addEventListener("click", async () => {
      if (currentSeed == null) return;
      const url = new URL(location.href);
      url.searchParams.set("seed", currentSeed);
      url.searchParams.set("mood", currentMood);
      url.searchParams.set("instrument", currentInstrument);
      try {
        await navigator.clipboard.writeText(url.toString());
        showToast(shareSeedBtn.dataset.copied);
      } catch {
        showToast(url.toString());
      }
      playSound("copy");
    });
  }

  /* يؤلّف مازورة وحدة فوق وتر معيّن، على شبكة ضربات ثابتة:
     - الضربة القوية (١ و٣) = نغمة من الوتر (استقرار).
     - الضربات الضعيفة = نغمات عابرة بخطوات صغيرة (حركة).
     - endOnDegree (اختياري) = نغمة الحل بآخر المازورة (للختام). */
  function composeBar(chordRootDeg, rhythm, startDegree, endOnDegree, meter) {
    const notes = [];
    let beat = 0;
    let degree = startDegree;
    let lastInterval = 0;
    // آخر نغمة فعلية بالمازورة (تتجاهل السكتات) — عليها يقع الحل بالختام
    const lastNoteIndex = rhythm.reduce((last, length, i) => (length > 0 ? i : last), -1);

    rhythm.forEach((length, i) => {
      // القيمة السالبة = سكتة: تتقدّم بالزمن بلا نغمة. السكتات هي اللي تخلي
      // اللحن "يتنفّس" بدل ما يعزف نغمة ورا نغمة بلا توقف
      if (length <= 0) {
        notes.push({ degree: null, length });
        beat += Math.abs(length);
        return;
      }

      // بالميزان الرباعي الضربتان ١ و٣ قويتان، وبالثلاثي (فالس) الأولى فقط
      const isStrongBeat = beat === 0 || (meter === 4 && beat === 2);
      const previousDegree = degree;

      if (i === lastNoteIndex && endOnDegree != null) {
        degree = endOnDegree;
      } else if (isStrongBeat) {
        degree = pickChordTone(chordRootDeg, degree);
      } else {
        const interval = nextInterval(Math.abs(lastInterval) >= 3 ? lastInterval : 0);
        degree = clamp(degree + interval, MELODY_LOW, MELODY_HIGH);
      }

      lastInterval = degree - previousDegree;
      notes.push({ degree, length });
      beat += length;
    });

    return notes;
  }

  function highlightKey(freq, delayMs, durationMs) {
    keysForFreq(freq).forEach((key) => {
      activeTimeouts.push(
        setTimeout(() => key.classList.add("active"), delayMs),
        setTimeout(() => key.classList.remove("active"), delayMs + durationMs)
      );
    });
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  /* يرسم نغمة واحدة داخل أي سياق صوتي. الوسيط target يحمل السياق ووجهتيه
     (الجافة والصدى) — بدونه ما نقدر نصدّر ملفاً صوتياً إلا بتكرار كل منطق
     التخليق مرة ثانية. التشغيل الحي والتصدير يستخدمان نفس الدالة الآن. */
  function playNote(target, noteIndex, startTime, duration, peakGain, pan = 0, detune = 0, exactFreq = 0) {
    const { ctx, dry, wet, live } = target;
    const freq = exactFreq || NOTES[noteIndex] * 2 ** octaveShift;
    peakGain *= dynamicsGain;
    const instrument = INSTRUMENTS[currentInstrument];
    if (instrument.sample && customSample) return playSample(target, freq, startTime, duration, peakGain, pan);
    if (sampleBank[instrument.sampled]) {
      const env = playSampled(target, instrument, freq, startTime, duration, peakGain, pan);
      if (env) return env;
    }
    peakGain *= instrument.level || 1; // معايرة شدة كل آلة مركّبة (تُقاس آلياً)

    // آلة وترية (يسار اللوحة = نغمات واطية بأوتار أطول وأثخن فترن أطول
    // وأغنى، يمينها = نغمات حادة تخفت أسرع وأنحف) — يشتغل بأي مفتاح موسيقي
    // عشوائي بلا ما يحتاج نغمة مرجعية ثابتة، ومضروب بمعامل الآلة نفسها
    // (بانجو يخفت أسرع من البيانو، فلوت يرن أطول لأنه آلة نفخ مستمرة)
    const registerFactor = 1.5 - (Math.min(noteIndex, 21) / 21) * 0.9; // ١٫٥ (واطي) → ٠٫٦ (حاد)
    const ringDuration = duration * registerFactor * instrument.ringScale;

    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0.0001, startTime);
    envelope.gain.exponentialRampToValueAtTime(Math.max(peakGain, 0.0001), startTime + instrument.attack);
    if (instrument.sustainRatio > 0) {
      // آلة نفخ: تبقى قريبة من الذروة معظم مدة النغمة (نفَس مستمر) قبل تلاشٍ
      // أخير قصير — عكس القرع الفوري بالآلات الوترية
      const sustainEnd = Math.max(startTime + ringDuration * instrument.sustainRatio, startTime + instrument.attack + 0.01);
      envelope.gain.setValueAtTime(Math.max(peakGain, 0.0001), sustainEnd);
    }
    envelope.gain.exponentialRampToValueAtTime(0.0006, startTime + ringDuration);

    // فلتر يبدأ ساطعاً (لحظة القرع/النفخ) ويعتم تدريجياً — نفس سلوك أي آلة
    // حقيقية تفقد حدّتها الطيفية كل ما تلاشت
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 0.6;
    filter.frequency.setValueAtTime(clamp(freq * instrument.filterBrightMult, 800, 7000), startTime);
    filter.frequency.exponentialRampToValueAtTime(clamp(freq * instrument.filterDarkMult, 400, 2000), startTime + ringDuration);

    envelope.connect(filter);
    let out = filter;
    if (pan && ctx.createStereoPanner) {
      out = ctx.createStereoPanner();
      out.pan.value = pan;
      filter.connect(out);
    }
    out.connect(dry);
    out.connect(wet);

    // نغمة اهتزاز خفيفة (Vibrato) — سمة آلات النفخ (الفلوت هنا)، ما تُستخدم
    // إلا لو الآلة الحالية معرّفة لها vibrato. vibratoGain يحوّل تذبذب اللفو
    // (بين ١- و١) لانحراف تردد صغير بالهرتز قبل ما نوصله لكل توافقية
    let vibratoGain = null;
    if (instrument.vibrato) {
      const vibratoLfo = ctx.createOscillator();
      vibratoLfo.frequency.value = instrument.vibrato.rateHz;
      vibratoGain = ctx.createGain();
      vibratoGain.gain.value = freq * instrument.vibrato.depthRatio;
      vibratoLfo.connect(vibratoGain);
      vibratoLfo.start(startTime);
      vibratoLfo.stop(startTime + ringDuration + 0.05);
      if (live) activeOscillators.push(vibratoLfo);
    }

    // النغمات الواطية توافقياتها العليا أقوى شوي (صوت أغنى)، الحادة أخفت (أنحف)
    const harmonicRichness = clamp(registerFactor, 0.75, 1.3);
    instrument.harmonics.forEach(({ mult, weight, type, cents = 0 }) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq * mult;
      osc.detune.value = detune + cents; // cents: طبقة مزاحة قليلاً = صوت جوقة/فرقة
      if (vibratoGain) vibratoGain.connect(osc.frequency);
      const harmonicGain = ctx.createGain();
      harmonicGain.gain.value = mult === 1 ? weight : weight * harmonicRichness;
      osc.connect(harmonicGain).connect(envelope);
      osc.start(startTime);
      osc.stop(startTime + ringDuration + 0.05);
      if (live) activeOscillators.push(osc);
    });

    if (live) highlightKey(freq, (startTime - ctx.currentTime) * 1000, ringDuration * 1000);
    return envelope;
  }

  /* المؤلّف: قطعة من ٨ مازورات (فترة موسيقية كاملة Period) — مو نغمات متتابعة.
     الطبقات الأربع اللي كانت ناقصة وصارت أساس البناء الآن:

     ١) نبضة ثابتة: كل شي محسوب بالضربات (Beats) على شبكة منتظمة، بلا أي فاصل
        عشوائي. الدماغ يمسك النبضة فيحس إنها موسيقى لا نغمات متفرقة.
     ٢) هارموني: تتابع كوردات حقيقي (٤ كوردات، مازورة لكل وتر، يتكرر مرتين)،
        والنغمة على الضربة القوية لازم تكون من نغمات الوتر.
     ٣) تكرار وشكل: الجملة الأولى (مازورة ١-٢) ترجع حرفياً بالمازورة ٥-٦، فيصير
        فيه لحن يمسكه المستمع ويتذكره.
     ٤) سؤال وجواب: النص الأول ينتهي على الدرجة الخامسة (معلّق = سؤال)، والنص
        الثاني ينتهي على التونيك (استقرار = جواب). هذا اللي يعطي إحساس الاكتمال.

     مع باص ومرافقة تحت اللحن (بدل خط منفرد كان يحس ناقصاً). */
  /* يؤلّف القطعة كاملة ويرجّعها كقائمة أحداث خالصة (نغمة + بدايتها ومدتها
     بالضربات) بلا أي تعامل مع الصوت. فصلها عن التشغيل هو اللي يخلي التشغيل
     الحي وتصدير WAV وتصدير MIDI ثلاثتهم يقرؤون من نفس المصدر بدل ما نكرر
     منطق التأليف ثلاث مرات ونخاطر باختلافهم. */
  function composePiece(seed) {
    const mood = MOODS[currentMood];
    rand = createRng(seed);

    const rootIndex = Math.floor(rand() * ROOT_NOTES.length);
    NOTES = buildScale(ROOT_NOTES[rootIndex], mood.scale);

    /* كل هذي كانت ثابتة بكل تشغيلة، فحتى مع اختلاف النغمات كانت المقطوعات
       تحس متشابهة. الحين كلها تتغيّر مع البذرة: */
    const bpm = Math.min(96, Math.round((mood.bpmRange[0] + rand() * (mood.bpmRange[1] - mood.bpmRange[0])) * tempoFactor));
    // الميزان: أغلب القطع ٤/٤، وواحدة من كل أربع بميزان ثلاثي (فالس) — الميزان
    // من أقوى ما يغيّر إحساس القطعة، وكان ٤/٤ دايماً
    const meter = rand() < 0.25 ? 3 : 4;
    const progression = PROGRESSIONS[Math.floor(rand() * PROGRESSIONS.length)];
    const pool = mood.rhythms[meter];
    // إيقاعان مختلفان: واحد للجملة الأساسية وواحد لجملة الجواب. الجملة الأساسية
    // تحتفظ بإيقاعها عند تكرارها (وإلا ضاع التكرار اللي يمسكه المستمع)
    const themeRhythm = pool[Math.floor(rand() * pool.length)];
    const answerRhythm = pool[Math.floor(rand() * pool.length)];
    const accompanimentPick = ACCOMPANIMENT_STYLES[Math.floor(rand() * ACCOMPANIMENT_STYLES.length)];
    const accompaniment = mood.accompaniment || accompanimentPick;
    const openingDegree = MELODY_LOW + [0, 2, 4][Math.floor(rand() * 3)];
    const cadenceApproach = rand() < 0.7 ? 4 : 3;
    const cadenceRhythm = mood.cadenceRhythms[meter];

    /* كوردات الفترة: التتابع يتكرر مرتين، مع مواضع الختام مثبّتة عشان يطلع
       الشكل مطابقاً للفترة الكلاسيكية (Period):
       - مازورة ٤ = V  → نصف ختام (Half Cadence): يوقف على سؤال معلّق.
       - مازورة ٧-٨ = ختام حقيقي ينتهي على I. */
    const chords = [0, 1, 2, 3, 0, 1, 2, 3].map((i) => progression[i]);
    chords[3] = 4;
    chords[6] = cadenceApproach;
    chords[7] = 0;

    const m1 = [
      composeBar(chords[0], themeRhythm, openingDegree, null, meter),
      composeBar(chords[1], themeRhythm, MELODY_LOW + 2, null, meter),
    ];
    const lastThemeDegree = m1[1][m1[1].length - 1].degree;
    const period = [
      ...m1,
      composeBar(chords[2], answerRhythm, lastThemeDegree, null, meter),
      composeBar(chords[3], cadenceRhythm, MELODY_LOW + 2, MELODY_LOW + 4, meter), // ينتهي على الخامسة = سؤال
      ...m1,
      composeBar(chords[6], answerRhythm, lastThemeDegree, null, meter),
      composeBar(chords[7], cadenceRhythm, MELODY_LOW + 1, MELODY_LOW, meter), // تونيك فوق وتر التونيك = جواب
    ];

    const events = [];
    const melody = []; // اللحن بسكتاته — للنوتة المرسومة
    const bars = []; // بداية كل مازورة ووترها — لقراءة الكورد الحالي
    const bassGain = mood.gainBase * 0.55;
    const padGain = mood.gainBase * 0.3;
    let voices = null; // أصوات المرافقة بالمازورة السابقة — أساس قيادة الأصوات
    let barBeat = 0;

    for (let repeat = 0; repeat < mood.formRepeats; repeat++) {
      for (let bar = 0; bar < period.length; bar++) {
        const chordRoot = chords[bar];
        bars.push({ start: barBeat, chord: chordRoot });
        voices = voiceChord(chordRoot, voices);
        // المرافقة تتوزع يمين/يسار حسب حدّتها (مثل أصابع البيانو)، واللحن بالنص
        // part: "melody" أو "accomp" — يفصلهما "أضف إلى الاستوديو" بمسارين
        const add = (degree, startBeat, durBeats, gain, pan = clamp((degree - BASS_LOW - 3) * 0.1, -0.35, 0.35), part = "accomp") =>
          events.push({ degree, startBeat, durBeats, gain, pan, part });

        if (accompaniment === "arpeggio") {
          // وتر مكسور: نغمة على كل ضربة — حركة مستمرة تحت اللحن
          const arp = [BASS_LOW + chordRoot, BASS_LOW + voices[0], BASS_LOW + voices[1], BASS_LOW + voices[0]];
          for (let i = 0; i < meter; i++) add(arp[i % arp.length], barBeat + i, 0.95, i === 0 ? bassGain : padGain);
        } else if (accompaniment === "pulse") {
          // نبض: بالرباعي على الضربتين ١ و٣، وبالثلاثي "أوم-پا-پا" الفالس
          if (meter === 3) {
            add(BASS_LOW + chordRoot, barBeat, 1.1, bassGain);
            [1, 2].forEach((offset) => voices.forEach((d) => add(BASS_LOW + d, barBeat + offset, 0.9, padGain)));
          } else {
            [0, 2].forEach((offset) => {
              add(BASS_LOW + chordRoot, barBeat + offset, 1.6, bassGain);
              voices.forEach((d) => add(BASS_LOW + d, barBeat + offset, 1.4, padGain));
            });
          }
        } else if (accompaniment === "bassOnly") {
          add(BASS_LOW + chordRoot, barBeat, meter - 0.2, bassGain * 1.15);
        } else {
          add(BASS_LOW + chordRoot, barBeat, meter - 0.4, bassGain);
          voices.forEach((d) => add(BASS_LOW + d, barBeat, meter - 0.8, padGain));
        }

        // اللحن فوقهم — القيم السالبة بالإيقاع سكتات: تتقدّم بالزمن بلا نغمة
        let beat = 0;
        const motifShift = mood.leitmotif && repeat > 0 ? 7 : 0;
        period[bar].forEach(({ degree, length }) => {
          const note = length > 0 && degree !== null ? degree + motifShift : null;
          melody.push({ degree: note, length: Math.abs(length), start: barBeat + beat });
          if (note !== null) {
            const gain = mood.gainBase + mood.gainSwell * (beat === 0 ? 1 : 0.55);
            add(note, barBeat + beat, length * 0.92, gain, 0, "melody");
          }
          beat += Math.abs(length);
        });

        barBeat += meter;
      }
    }

    return {
      events,
      melody,
      bars,
      meta: { seed, bpm, meter, rootIndex, mode: mood.scale, chords, cadenceApproach, totalBeats: barBeat },
    };
  }

  // يجدول أحداث القطعة داخل أي سياق صوتي (حي أو غير متصل للتصدير)
  function scheduleEvents(target, piece, startTime, beatDur = 60 / piece.meta.bpm, events = piece.events) {
    // لمسة بشرية: فروق صغيرة جداً بالتوقيت (±٨ ملّي ثانية) والقوة (±١٠٪) والنغمة
    // (±٤ سنت) — عازف حقيقي ما يضرب نغمتين متطابقتين أبداً
    const jitter = (amount) => (Math.random() * 2 - 1) * amount;
    events.forEach((ev) => {
      const human = !ev.freq; // تسجيل عزف حقيقي فيه بشريته أصلاً — لا نضيف عليه عشوائية
      const at = startTime + ev.startBeat * beatDur + (human && ev.startBeat > 0 ? jitter(0.008) : 0);
      playNote(target, ev.degree, at, ev.durBeats * beatDur, ev.gain * (human ? 1 + jitter(0.1) : 1), ev.pan || 0, human ? jitter(4) : 0, ev.freq || 0);
    });
  }

  /* ===== تصدير الملفات ===== */

  function downloadBlob(blob, filename) {
    // داخل تطبيق أندرويد: WebView ما ينزّل روابط blob:، فنسلّم الملف للتطبيق يحفظه
    if (window.HakolahApp) {
      const reader = new FileReader();
      reader.onload = () => {
        const ok = window.HakolahApp.save(filename, blob.type, String(reader.result).split(",")[1]);
        if (!ok) showToast("⚠️");
      };
      reader.readAsDataURL(blob);
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  // ترميز WAV يدوياً (رأس 44 بايت + عيّنات PCM 16-bit) — أبسط من إضافة مكتبة،
  // وWAV يشتغل بأي مشغّل وأي برنامج مونتاج بلا استثناء
  /* يعيد عزف القطعة داخل OfflineAudioContext (أسرع من الزمن الحقيقي) بنفس
     دوال التخليق المستخدمة بالتشغيل الحي — فالملف المصدَّر مطابق لما سمعه
     المستخدم، لا نسخة تقريبية */
  async function renderPieceToBuffer(piece) {
    await ensureSamples(piece.layers ? piece.layers.map((l) => l.instrument).filter(Boolean) : [currentInstrument]);
    return withFixedRandom(() => renderPieceSync(piece));
  }

  function renderPieceSync(piece) {
    const mood = MOODS[currentMood];
    const beatDur = 60 / piece.meta.bpm;
    const tail = 3; // ذيل يسع رنين آخر نغمة وصداها
    const seconds = piece.meta.totalBeats * beatDur + tail;
    // مشروع الاستوديو استيريو (فيه توزيع يمين/يسار لكل مسار) و٤٨ كيلوهرتز — معيار
    // الفيديو، فيدخل برامج المونتاج بلا تحويل. المقطوعة المؤلّفة أحادية ٤٤٫١
    const channels = piece.layers ? 2 : 1;
    const rate = piece.layers ? 48000 : 44100;
    const ctx = new OfflineAudioContext(channels, Math.ceil(rate * seconds), rate);

    // piece.master: الملفات المنفصلة (Stems) بلا ماستر — الماستر للمزيج كله لا لكل مسار
    const bus = buildOutput(ctx, ctx.destination, piece.master);
    bus.feedback.gain.value = mood.delayFeedback;
    bus.wet.gain.value = mood.delayWet;

    const target = { ctx, dry: bus.input, wet: bus.delay, live: false };
    if (piece.layers) scheduleLayers(studioTarget(target, piece.tracks), piece.layers, 0.05);
    else scheduleEvents(target, piece, 0.05);
    return ctx.startRendering();
  }

  /* عشوائية ثابتة أثناء تجهيز التصدير: صدى الغرفة وضجيج الطبول يُولَّدان عشوائياً،
     فبدون بذرة ثابتة كل ملف منفصل (Stem) يطلع بصدى وضربات مختلفة قليلاً عن المزيج،
     ومجموع الملفات ما يطابق المزيج. الجدولة متزامنة كلها، فنرجّع Math.random بعدها. */
  function withFixedRandom(fn) {
    const original = Math.random;
    Math.random = createRng(20260929);
    try {
      return fn();
    } finally {
      Math.random = original;
    }
  }

  async function renderPieceToWav(piece) {
    return audioBufferToWav(await renderPieceToBuffer(piece));
  }

  async function renderPieceToMp3(piece) {
    return audioBufferToMp3(await renderPieceToBuffer(piece), 192);
  }

  /* ===== تصدير فيديو =====
     كانفس يرسم اللوحة والمفاتيح وهي تضيء + الصوت، ويسجّلهما MediaRecorder.
     المقاس مربّع (1080×1080) لأن الاستخدام المتوقّع مشاركة اجتماعية.
     نفضّل MP4 لو المتصفح يدعمه (يُقبل بكل مكان تقريباً)، وإلا WebM. */
  const VIDEO_SIZE = 1080;

  function pickVideoMime() {
    const candidates = [
      "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
      "video/mp4",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    return candidates.find((type) => window.MediaRecorder && MediaRecorder.isTypeSupported(type)) || "";
  }

  // مدة رنين النغمة — نفس معادلة playNote عشان الإضاءة بالفيديو تطابق الصوت
  function ringSecondsOf(event, beatDur) {
    const instrument = INSTRUMENTS[currentInstrument];
    const registerFactor = 1.5 - (event.degree / (NOTES.length - 1)) * 0.9;
    return event.durBeats * beatDur * registerFactor * instrument.ringScale;
  }

  /* ألوان الفيديو تُقرأ من متغيّرات CSS الفعلية وقت التصدير (لا مكتوبة يدوياً)،
     فيطلع الفيديو بنفس ألوان الموقع مهما غيّر المالك اللون بلوحة التحكم.
     نمرّر القيمة على عنصر مؤقت عشان المتصفح يحلّها لـ rgb() — القيمة الخام
     قد تكون color-mix() اللي ما يفهمها الكانفس. */
  function resolveCssColor(name, fallback) {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (!raw) return fallback;
    const probe = document.createElement("span");
    probe.style.color = raw;
    probe.style.display = "none";
    document.body.appendChild(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    return resolved || fallback;
  }

  function mixWithWhite(rgb, ratio) {
    const parts = rgb.match(/\d+(\.\d+)?/g);
    if (!parts) return rgb;
    const mixed = parts.slice(0, 3).map((v) => Math.round(Number(v) * ratio + 255 * (1 - ratio)));
    return `rgb(${mixed.join(", ")})`;
  }

  function roundedBottomRect(g, x, y, w, h, radius) {
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + w, y);
    g.lineTo(x + w, y + h - radius);
    g.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    g.lineTo(x + radius, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - radius);
    g.closePath();
  }

  function drawVideoFrame(g, piece, seconds, active, theme) {
    const S = VIDEO_SIZE;
    const isEn = window.SITE_LANG === "en";
    g.fillStyle = theme.bg;
    g.fillRect(0, 0, S, S);

    // بطاقة بنفس شكل صندوق التجربة بالصفحة
    const cardMargin = 48;
    g.fillStyle = theme.surface;
    roundedBottomRect(g, cardMargin, cardMargin, S - cardMargin * 2, S - cardMargin * 2, 28);
    g.fill();

    g.textAlign = "center";
    g.fillStyle = theme.text;
    g.font = "800 66px Tahoma, Arial, sans-serif";
    g.fillText(isEn ? "Hakolah" : "هكوله", S / 2, 168);
    g.font = "600 32px Tahoma, Arial, sans-serif";
    g.fillStyle = theme.muted;
    g.fillText(isEn ? "Hakolah Sounds" : "صوتيات هكوله", S / 2, 218);
    g.font = "700 34px Tahoma, Arial, sans-serif";
    g.fillStyle = theme.primary;
    g.fillText(isEn ? "Music composed by code" : "موسيقى ألّفها الحاسوب", S / 2, 272);

    /* نفس مقاسات اللوحة بالـCSS بالضبط (أبيض 22×80، أسود 13×50، والزوايا
       السفلية مدوّرة) مضروبة بمعامل واحد — فتطلع بنفس نِسَب واجهة الموقع */
    const whiteCount = FULL_OCTAVES * 7;
    const scale = (S - 150) / (whiteCount * FULL_WHITE_W);
    const whiteW = FULL_WHITE_W * scale;
    const whiteH = 80 * scale;
    const blackW = FULL_BLACK_W * scale;
    const blackH = 50 * scale;
    const boardW = whiteW * whiteCount;
    const left = (S - boardW) / 2;
    const top = 400;

    g.lineWidth = Math.max(1, scale);
    for (let i = 0; i < whiteCount; i++) {
      const note = Math.floor(i / 7) * 12 + WHITE_PITCH_CLASSES[i % 7];
      roundedBottomRect(g, left + i * whiteW, top, whiteW, whiteH, 4 * scale);
      g.fillStyle = active.has(note) ? theme.activeWhite : "#ffffff";
      g.fill();
      g.strokeStyle = theme.border;
      g.stroke();
    }
    for (let octave = 0; octave < FULL_OCTAVES; octave++) {
      BLACK_PITCH_CLASSES.forEach((pitchClass, i) => {
        const note = octave * 12 + pitchClass;
        const x = left + (octave * 7 + BLACK_AFTER_WHITE[i]) * whiteW - blackW / 2;
        roundedBottomRect(g, x, top, blackW, blackH, 3 * scale);
        g.fillStyle = active.has(note) ? theme.primary : "#1a1a1a";
        g.fill();
      });
    }

    // سطرا التحليل تحت اللوحة
    const meta = piece.meta;
    g.font = "700 38px Tahoma, Arial, sans-serif";
    g.fillStyle = theme.text;
    const modeLabel = meta.mode === "major" ? "Major" : "Minor";
    g.fillText(`${keyName(meta.rootIndex)} ${modeLabel}  ·  ${meta.bpm} BPM  ·  ${meta.meter}/4`, S / 2, top + whiteH + 140);
    g.font = "800 56px Tahoma, Arial, sans-serif";
    g.fillStyle = theme.primary;
    g.fillText(meta.chords.slice(0, 4).map((degree) => ROMAN[meta.mode][degree]).join(" – "), S / 2, top + whiteH + 220);

    // البذرة: من يشوف الفيديو يقدر يعيد نفس المقطوعة بالموقع بالضبط
    g.font = "600 26px Tahoma, Arial, sans-serif";
    g.fillStyle = theme.muted;
    g.fillText(`${isEn ? "seed" : "البذرة"} ${meta.seed}`, S / 2, top + whiteH + 292);

    const progress = Math.min(1, seconds / (meta.totalBeats * (60 / meta.bpm)));
    g.fillStyle = theme.border;
    g.fillRect(left, S - 200, boardW, 10);
    g.fillStyle = theme.primary;
    g.fillRect(left, S - 200, boardW * progress, 10);

    g.font = "600 28px Tahoma, Arial, sans-serif";
    g.fillStyle = theme.muted;
    g.fillText("hakolah", S / 2, S - 140);
  }

  async function renderPieceToVideo(piece, onProgress) {
    const mimeType = pickVideoMime();
    if (!mimeType) throw new Error("no recorder support");

    const buffer = await renderPieceToBuffer(piece);
    const canvas = document.createElement("canvas");
    canvas.width = VIDEO_SIZE;
    canvas.height = VIDEO_SIZE;
    const g = canvas.getContext("2d");

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const streamDestination = ctx.createMediaStreamDestination();
    source.connect(streamDestination);
    source.connect(ctx.destination); // يسمعها المستخدم أثناء التسجيل

    const videoStream = canvas.captureStream(30);
    const stream = new MediaStream([...videoStream.getVideoTracks(), ...streamDestination.stream.getAudioTracks()]);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5000000 });
    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size) chunks.push(e.data);
    };
    const stopped = new Promise((resolve) => {
      recorder.onstop = resolve;
    });

    const primary = resolveCssColor("--color-primary", "rgb(63, 164, 128)");
    const theme = {
      bg: resolveCssColor("--color-bg", "rgb(28, 28, 28)"),
      surface: resolveCssColor("--color-surface", "rgb(28, 28, 28)"),
      text: resolveCssColor("--color-text", "rgb(240, 240, 240)"),
      muted: resolveCssColor("--color-text-muted", "rgb(150, 150, 150)"),
      border: resolveCssColor("--color-border", "rgb(42, 42, 42)"),
      primary,
      activeWhite: mixWithWhite(primary, 0.35), // نفس color-mix بالـCSS للمفتاح الأبيض المضيء
    };

    const beatDur = 60 / piece.meta.bpm;
    const timeline = piece.events.map((ev) => ({
      note: Math.round(12 * Math.log2(NOTES[ev.degree] / FULL_BASE_FREQ)),
      start: ev.startBeat * beatDur,
      end: ev.startBeat * beatDur + ringSecondsOf(ev, beatDur),
    }));

    recorder.start();
    const startedAt = ctx.currentTime;
    source.start();

    await new Promise((resolve) => {
      const frame = () => {
        const seconds = ctx.currentTime - startedAt;
        const active = new Set();
        timeline.forEach((n) => {
          if (seconds >= n.start && seconds < n.end) active.add(n.note);
        });
        drawVideoFrame(g, piece, seconds, active, theme);
        if (onProgress) onProgress(Math.min(1, seconds / buffer.duration));
        if (seconds < buffer.duration) requestAnimationFrame(frame);
        else resolve();
      };
      frame();
    });

    recorder.stop();
    await stopped;
    source.stop();
    ctx.close();
    return { blob: new Blob(chunks, { type: mimeType }), mimeType };
  }

  /* ملف MIDI من نوع 0 — صغير جداً ويفتح بأي برنامج نوتة (MuseScore وغيره)،
     فيقدر أي أحد يشوف المقطوعة كنوتة موسيقية ويعدّلها */
  function pieceToMidi(piece) {
    const PPQ = 480;
    const bytes = [];
    const pushVarLen = (value) => {
      const stack = [value & 0x7f];
      let v = value >> 7;
      while (v > 0) {
        stack.unshift((v & 0x7f) | 0x80);
        v >>= 7;
      }
      bytes.push(...stack);
    };

    // نبضة القطعة + ميزانها كأحداث تعريفية بأول المسار
    const usPerBeat = Math.round(60000000 / piece.meta.bpm);
    pushVarLen(0);
    bytes.push(0xff, 0x51, 0x03, (usPerBeat >> 16) & 0xff, (usPerBeat >> 8) & 0xff, usPerBeat & 0xff);
    pushVarLen(0);
    bytes.push(0xff, 0x58, 0x04, piece.meta.meter, 2, 24, 8); // البسط، والمقام 4 (2^2)

    const points = [];
    piece.events.forEach((ev) => {
      const freq = ev.freq || NOTES[ev.degree];
      if (!freq) return;
      const note = Math.round(69 + 12 * Math.log2(freq / 440));
      if (note < 0 || note > 127) return;
      const velocity = Math.round(clamp(ev.gain * 420, 35, 112));
      points.push({ tick: Math.round(ev.startBeat * PPQ), on: true, note, velocity });
      points.push({ tick: Math.round((ev.startBeat + ev.durBeats) * PPQ), on: false, note, velocity: 0 });
    });
    // ترتيب زمني، وإطفاء النغمة قبل تشغيلها لو تصادف نفس اللحظة
    points.sort((a, b) => a.tick - b.tick || Number(a.on) - Number(b.on));

    let previousTick = 0;
    points.forEach((point) => {
      pushVarLen(point.tick - previousTick);
      previousTick = point.tick;
      bytes.push(point.on ? 0x90 : 0x80, point.note, point.velocity);
    });
    pushVarLen(0);
    bytes.push(0xff, 0x2f, 0x00); // نهاية المسار

    const header = [
      0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, (PPQ >> 8) & 0xff, PPQ & 0xff,
      0x4d, 0x54, 0x72, 0x6b,
      (bytes.length >> 24) & 0xff, (bytes.length >> 16) & 0xff, (bytes.length >> 8) & 0xff, bytes.length & 0xff,
    ];
    return new Blob([new Uint8Array(header), new Uint8Array(bytes)], { type: "audio/midi" });
  }

  async function ensureContext() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") await audioCtx.resume();
    ensureAudioGraph();
  }

  async function playSequence() {
    await ensureContext();
    await ensureSamples([currentInstrument]);

    const mood = MOODS[currentMood];
    delayFeedbackGain.gain.value = mood.delayFeedback;
    delayWetGain.gain.value = mood.delayWet;

    playing = true;
    stopRequested = false;
    activeOscillators = [];
    activeTimeouts = [];

    // بذرة التشغيلة: من الرابط لو موجودة (مثال ثابت يعاد بالضبط)، وإلا جديدة
    const seed = pinnedSeed != null ? pinnedSeed : (Math.random() * 4294967296) >>> 0;
    pinnedSeed = null;
    currentSeed = seed;

    const piece = composePiece(seed);
    lastPiece = piece; // التصدير يصدّر القطعة اللي سمعها المستخدم، لا وحدة جديدة

    if (navigatingHistory) {
      navigatingHistory = false;
    } else {
      // مقطوعة جديدة: نقصّ ما بعد الموضع الحالي (زي سجلّ المتصفح) ثم نضيفها
      seedHistory.length = historyPos + 1;
      seedHistory.push({ seed, mood: currentMood, instrument: currentInstrument });
      historyPos = seedHistory.length - 1;
    }
    updateHistoryButton();
    btn.textContent = btn.dataset.stopLabel;

    const startTime = audioCtx.currentTime + 0.12;
    scheduleEvents({ ctx: audioCtx, dry: masterInput, wet: delayNode, live: true }, piece, startTime);

    renderAnalysis(piece.meta);
    showNotation(piece, startTime);

    const endsAt = startTime + (piece.meta.totalBeats * 60) / piece.meta.bpm;
    activeTimeouts.push(
      setTimeout(
        () => {
          if (stopRequested) return;
          playing = false;
          btn.textContent = btn.dataset.playLabel;
        },
        (endsAt - audioCtx.currentTime) * 1000
      )
    );
  }

  /* ===== طبقة التعليم: النوتة، الكورد، أبعاد الصوت، تدريب الأذن ===== */

  // موضع النغمة على المدرج: درجات السلّم (لا أنصاف النغمات) من دو٠ — كل درجة
  // = خط أو فراغ. الدرجة ٠ بالسلّم = المفتاح بأوكتاف ٣ (NOTES تبدأ تحت المفتاح بأوكتاف)
  const NATURAL_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
  function spell(degree, rootIndex) {
    const pos = 7 * (3 + octaveShift) + rootIndex + degree;
    const letter = pos % 7;
    const octave = Math.floor(pos / 7);
    const midi = Math.round(69 + 12 * Math.log2((NOTES[degree] * 2 ** octaveShift) / 440));
    const accidental = midi - (12 * (octave + 1) + NATURAL_SEMITONES[letter]); // +1 دييز، -1 بيمول
    return { pos, letter, accidental };
  }
  function noteLabel(degree, rootIndex) {
    const { letter, accidental } = spell(degree, rootIndex);
    return NOTE_NAMES[noteStyle][letter] + (accidental > 0 ? "♯" : accidental < 0 ? "♭" : "");
  }

  const staffWrap = document.getElementById("beepStaffWrap");
  const staffBox = document.getElementById("beepStaff");
  const chordBox = document.getElementById("beepChord");
  const STEP = 5; // نصف المسافة بين خطين
  const BEAT_W = 28;
  const E4 = 30; // الخط الأسفل بمفتاح صول

  // ponytail: مفتاح صول والسكتة رموز يونيكود — تعتمد على خط الجهاز (موجودة
  // بويندوز وماك وأندرويد). ارسمها SVG لو ظهرت مربعات بجهاز ما.
  function renderStaff(piece) {
    const { rootIndex, meter, totalBeats } = piece.meta;
    const notes = piece.melody.map((m) => ({ ...m, sp: m.degree === null ? null : spell(m.degree, rootIndex) }));
    const positions = notes.filter((n) => n.sp).map((n) => n.sp.pos);
    const maxPos = Math.max(40, ...positions);
    const minPos = Math.min(28, ...positions);
    const top = 16 + (maxPos - 38) * STEP;
    const y = (pos) => top + (38 - pos) * STEP;
    const height = y(minPos) + 34;

    // علامة المفتاح: عدد الدييز أو البيمول الثابتة بالسلّم، بترتيبها القياسي
    const accs = [7, 8, 9, 10, 11, 12, 13].map((d) => spell(d, rootIndex).accidental);
    const sharps = accs.filter((a) => a > 0).length;
    const flats = accs.filter((a) => a < 0).length;
    const SHARP_POS = [38, 35, 39, 36, 33, 37, 34];
    const FLAT_POS = [34, 37, 33, 36, 32, 35, 31];
    let out = "";
    let x = 44;
    for (let i = 0; i < sharps; i++, x += 9) out += '<text class="st-acc" x="' + x + '" y="' + (y(SHARP_POS[i]) + 4) + '">♯</text>';
    for (let i = 0; i < flats; i++, x += 9) out += '<text class="st-acc" x="' + x + '" y="' + (y(FLAT_POS[i]) + 3) + '">♭</text>';
    const startX = x + 16;
    const width = startX + totalBeats * BEAT_W + 20;

    for (let p = E4; p <= 38; p += 2) out += '<line class="st-line" x1="0" x2="' + width + '" y1="' + y(p) + '" y2="' + y(p) + '"/>';
    out += '<text class="st-clef" x="4" y="' + (y(E4) + 10) + '">𝄞</text>';
    for (let b = meter; b <= totalBeats; b += meter) {
      const bx = startX + b * BEAT_W - 8;
      out += '<line class="st-bar" x1="' + bx + '" x2="' + bx + '" y1="' + y(38) + '" y2="' + y(E4) + '"/>';
    }

    notes.forEach((n, i) => {
      const nx = startX + n.start * BEAT_W;
      if (!n.sp) {
        out += '<text class="st-rest" data-i="' + i + '" x="' + nx + '" y="' + (y(34) + 7) + '">𝄽</text>';
        return;
      }
      const p = n.sp.pos;
      const ny = y(p);
      let g = "";
      for (let q = 28; q >= p; q -= 2) g += '<line class="st-line" x1="' + (nx - 9) + '" x2="' + (nx + 9) + '" y1="' + y(q) + '" y2="' + y(q) + '"/>';
      for (let q = 40; q <= p; q += 2) g += '<line class="st-line" x1="' + (nx - 9) + '" x2="' + (nx + 9) + '" y1="' + y(q) + '" y2="' + y(q) + '"/>';
      // الشكل من المدة: المستديرة والبيضاء مفرّغة، السوداء مليانة، والنقطة = نصف قيمة زيادة
      const hollow = n.length >= 2;
      g += '<ellipse class="st-head' + (hollow ? " hollow" : "") + '" cx="' + nx + '" cy="' + ny + '" rx="6" ry="4.4" transform="rotate(-20 ' + nx + " " + ny + ')"/>';
      if (n.length < 4) {
        const up = p < 34;
        const sx = up ? nx + 5.6 : nx - 5.6;
        g += '<line class="st-stem" x1="' + sx + '" x2="' + sx + '" y1="' + ny + '" y2="' + (up ? ny - 30 : ny + 30) + '"/>';
      }
      if (n.length === 3 || n.length === 1.5) g += '<circle class="st-head" cx="' + (nx + 11) + '" cy="' + (ny - (p % 2 === 0 ? 3 : 0)) + '" r="1.8"/>';
      out += '<g class="st-note" data-i="' + i + '">' + g + "</g>";
    });

    staffBox.innerHTML = '<svg width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + " " + height + '" aria-hidden="true">' + out + "</svg>";
    staffBox.scrollLeft = 0;
    return { startX };
  }

  function chordText(chordDeg, rootIndex) {
    const t = chordBox.dataset;
    const third = Math.round(12 * Math.log2(NOTES[chordDeg + 2] / NOTES[chordDeg]));
    const fifth = Math.round(12 * Math.log2(NOTES[chordDeg + 4] / NOTES[chordDeg]));
    const quality = fifth === 6 ? t.dim : third === 4 ? t.major : t.minor;
    // LRI…PDI: أسماء النوتات لاتينية، بدونها ينقلب ترتيبها و♯ داخل سطر عربي
    const ltr = (s) => "⁦" + s + "⁩";
    const tones = [0, 2, 4].map((k) => noteLabel(chordDeg + k, rootIndex)).join(" · ");
    return t.label + ": " + ltr(noteLabel(chordDeg, rootIndex)) + " " + quality + " (" + ltr(tones) + ")";
  }

  // تُستدعى بعد جدولة القطعة: ترسم النوتة، ثم تضيء كل نوتة وكل كورد بوقته
  function showNotation(piece, startTime) {
    if (!staffWrap) return;
    staffWrap.hidden = false;
    const { startX } = renderStaff(piece);
    const beatMs = (60 / piece.meta.bpm) * 1000;
    const offsetMs = (startTime - audioCtx.currentTime) * 1000;
    const els = staffBox.querySelectorAll("[data-i]");
    piece.melody.forEach((n, i) => {
      activeTimeouts.push(
        setTimeout(() => {
          els.forEach((el) => el.classList.toggle("on", el.dataset.i === String(i)));
          staffBox.scrollLeft = startX + n.start * BEAT_W - staffBox.clientWidth / 2;
        }, offsetMs + n.start * beatMs)
      );
    });
    piece.bars.forEach((b) => {
      activeTimeouts.push(setTimeout(() => (chordBox.textContent = chordText(b.chord, piece.meta.rootIndex)), offsetMs + b.start * beatMs));
    });
  }

  // غيّر بُعد واحد وأنت تسمع: نعيد نفس المقطوعة (نفس البذرة) بالقيمة الجديدة
  document.querySelectorAll("#beepParams .param-btn").forEach((el) => {
    el.addEventListener("click", () => {
      const value = Number(el.dataset.value);
      if (el.dataset.param === "octave") octaveShift = value;
      else if (el.dataset.param === "tempo") tempoFactor = value;
      else dynamicsGain = value;
      document.querySelectorAll('#beepParams .param-btn[data-param="' + el.dataset.param + '"]').forEach((b) => b.classList.toggle("active", b === el));
      playClickSound();
      if (playing && currentSeed != null) {
        pinnedSeed = currentSeed;
        navigatingHistory = true;
        stopPlayback();
        playSequence();
      }
    });
  });

  /* تدريب الأذن — نفس تمرين ملف المادة: مقطع قصير مرتين، والمرة الثانية
     تغيّر بُعد واحد بس (التردد أو الإيقاع أو الطابع أو الديناميكية) */
  const quizBox = document.getElementById("beepQuiz");
  const quizPlayBtn = document.getElementById("beepQuizPlay");
  const quizResult = document.getElementById("beepQuizResult");
  const quizButtons = document.querySelectorAll("#beepQuiz .quiz-btn");
  let quizAnswer = null;

  async function playQuiz() {
    if (playing) stopPlayback();
    await ensureContext();
    activeOscillators = [];
    activeTimeouts = [];
    const piece = composePiece((Math.random() * 4294967296) >>> 0);
    const clip = piece.events.filter((ev) => ev.startBeat < piece.meta.meter * 2);
    const beatDur = 60 / piece.meta.bpm;
    const clipSec = piece.meta.meter * 2 * beatDur + 0.9;
    const target = { ctx: audioCtx, dry: masterInput, wet: delayNode, live: true };
    const t0 = audioCtx.currentTime + 0.12;
    scheduleEvents(target, piece, t0, beatDur, clip);

    quizAnswer = ["pitch", "rhythm", "timbre", "dynamics"][Math.floor(Math.random() * 4)];
    const saved = { octaveShift, dynamicsGain, currentInstrument };
    let beatB = beatDur;
    if (quizAnswer === "pitch") octaveShift += octaveShift < 1 ? 1 : -1;
    else if (quizAnswer === "dynamics") dynamicsGain = dynamicsGain >= 1 ? 0.35 : 1.6;
    else if (quizAnswer === "timbre") currentInstrument = currentInstrument === "flute" ? "piano" : "flute";
    else beatB = beatDur * 1.5; // أبطأ لا أسرع: ما نتجاوز سقف السرعة
    scheduleEvents(target, piece, t0 + clipSec, beatB, clip);
    ({ octaveShift, dynamicsGain, currentInstrument } = saved);

    quizResult.textContent = "";
    quizButtons.forEach((b) => {
      b.disabled = false;
      b.classList.remove("active");
    });
  }

  if (quizBox) {
    quizPlayBtn.addEventListener("click", () => {
      playQuiz();
      playClickSound();
    });
    const names = quizBox.dataset.names.split("|");
    const keys = ["pitch", "rhythm", "timbre", "dynamics"];
    quizButtons.forEach((b) => {
      b.addEventListener("click", () => {
        if (!quizAnswer) return;
        const right = b.dataset.answer === quizAnswer;
        quizResult.textContent = (right ? quizBox.dataset.right : quizBox.dataset.wrong) + names[keys.indexOf(quizAnswer)];
        quizButtons.forEach((q) => {
          q.disabled = true;
          q.classList.toggle("active", q.dataset.answer === quizAnswer);
        });
        quizAnswer = null;
        if (right) playSound("success");
        else playClickSound();
      });
    });
  }

  /* الصوت المسجّل يُعزف بتغيير سرعة تشغيله: ضعف السرعة = أوكتاف أعلى (مثل
     الشريط). ponytail: يتغيّر الطول مع النغمة (الحاد أقصر) — تمديد زمني
     حقيقي (time-stretch) يحتاج خوارزمية كاملة، والفرق مقبول لأداة ممتعة */
  function playSample(target, freq, startTime, duration, peakGain, pan) {
    const { ctx, dry, wet, live } = target;
    const src = ctx.createBufferSource();
    src.buffer = customSample;
    const rate = freq / SAMPLE_BASE;
    src.playbackRate.value = rate;
    const len = Math.max(0.12, Math.min(customSample.duration / rate, Math.max(duration, 0.4) * 1.6));
    const peak = Math.max(peakGain * 2.2, 0.0001);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.exponentialRampToValueAtTime(peak, startTime + 0.008);
    env.gain.setValueAtTime(peak, startTime + len * 0.75);
    env.gain.exponentialRampToValueAtTime(0.0006, startTime + len);
    src.connect(env);
    let out = env;
    if (pan && ctx.createStereoPanner) {
      out = ctx.createStereoPanner();
      out.pan.value = pan;
      env.connect(out);
    }
    out.connect(dry);
    out.connect(wet);
    src.start(startTime);
    src.stop(startTime + len + 0.05);
    if (live) {
      activeOscillators.push(src);
      highlightKey(freq, (startTime - ctx.currentTime) * 1000, len * 1000);
    }
    return env;
  }

  /* تجهيز الصوت: قناة وحدة، نقص الصمت من البداية (عشان النغمة تطلع لحظة
     الضغط)، حد أقصى ٣ ثوانٍ، تلاشٍ قصير بالآخر (بلا طقّة)، وتطبيع القوة */
  function prepareSample(decoded) {
    const data = decoded.getChannelData(0);
    let peak = 0;
    for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
    if (peak < 0.005) return null; // صمت تقريباً — الميكروفون ما التقط شي
    let start = 0;
    while (start < data.length && Math.abs(data[start]) < peak * 0.08) start++;
    const length = Math.min(data.length - start, Math.floor(decoded.sampleRate * 3));
    const out = new AudioBuffer({ length, numberOfChannels: 1, sampleRate: decoded.sampleRate });
    const ch = out.getChannelData(0);
    const fade = Math.min(length, Math.floor(decoded.sampleRate * 0.05));
    for (let i = 0; i < length; i++) {
      const tail = i > length - fade ? (length - i) / fade : 1;
      ch[i] = (data[start + i] / peak) * 0.9 * tail;
    }
    return out;
  }

  // يبقى الصوت بعد إعادة فتح الصفحة — IndexedDB لأن localStorage نصوص فقط وصغير
  function sampleStore(mode, action) {
    return new Promise((resolve, reject) => {
      const open = indexedDB.open("hakolah-sounds", 1);
      open.onupgradeneeded = () => open.result.createObjectStore("kv");
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const tx = open.result.transaction("kv", mode);
        const req = action(tx.objectStore("kv"));
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = () => reject(tx.error);
      };
    });
  }

  const customStatus = document.getElementById("customStatus");
  const customPreview = document.getElementById("customPreview");
  const customRecord = document.getElementById("customRecord");
  function setCustomStatus(key) {
    if (customStatus) customStatus.textContent = customStatus.dataset[key] || "";
  }

  function useSample(buffer, save) {
    customSample = buffer;
    customPreview.disabled = false;
    setCustomStatus("ready");
    currentInstrument = "custom";
    instrumentButtons.forEach((b) => b.classList.toggle("active", b.dataset.instrument === "custom"));
    updateSoundSummary();
    if (save) {
      sampleStore("readwrite", (st) =>
        st.put({ data: buffer.getChannelData(0), sampleRate: buffer.sampleRate }, "custom")
      ).catch(() => {}); // الحفظ ميزة إضافية — فشله (وضع خاص) ما يمنع العزف
    }
  }

  async function loadSampleBytes(bytes) {
    try {
      await ensureContext();
      const buffer = prepareSample(await audioCtx.decodeAudioData(bytes));
      if (!buffer) return setCustomStatus("silent"); // وصل الملف بس ما فيه صوت مسموع
      useSample(buffer, true);
      playSound("success");
    } catch {
      setCustomStatus("failed");
    }
  }

  if (customStatus) {
    setCustomStatus("empty");
    sampleStore("readonly", (st) => st.get("custom"))
      .then((saved) => {
        if (!saved) return;
        const buffer = new AudioBuffer({ length: saved.data.length, numberOfChannels: 1, sampleRate: saved.sampleRate });
        buffer.copyToChannel(saved.data, 0);
        customSample = buffer;
        customPreview.disabled = false;
        setCustomStatus("ready");
      })
      .catch(() => {});

    document.getElementById("customFile").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      e.target.value = "";
      if (file) loadSampleBytes(await file.arrayBuffer());
    });

    customPreview.addEventListener("click", async () => {
      if (!customSample) return;
      await ensureContext();
      const target = { ctx: audioCtx, dry: masterInput, wet: delayNode, live: false };
      playSample(target, SAMPLE_BASE, audioCtx.currentTime + 0.01, 3, 0.2, 0);
    });

    let recorder = null;
    let recordTimer = null;
    customRecord.addEventListener("click", async () => {
      if (recorder) return recorder.stop();
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return setCustomStatus("failed");
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        return setCustomStatus("denied");
      }
      const chunks = [];
      recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        clearTimeout(recordTimer);
        stream.getTracks().forEach((t) => t.stop());
        recorder = null;
        customRecord.textContent = customRecord.dataset.label;
        customRecord.classList.remove("active");
        loadSampleBytes(await new Blob(chunks).arrayBuffer());
      };
      recorder.start();
      customRecord.textContent = customRecord.dataset.stop;
      customRecord.classList.add("active");
      setCustomStatus("recording");
      recordTimer = setTimeout(() => recorder?.stop(), 3000);
    });
  }

  // شاشة لمس؟ نحدّدها بنفسنا لأن pointer:coarse ما يتطابق داخل بعض WebViews.
  // تحكم CSS الأفقي بالجوال (إخفاء الهيدر) — فنافذة مكتب قصيرة ما تتأثر
  if (navigator.maxTouchPoints > 0) document.documentElement.classList.add("touch");

  /* بحث الآلات: الاسم المعروض + كلمات بديلة (اسم اللغة الثانية، مرادفات). التطبيع
     العربي (تشكيل، همزات، ياء/ألف مقصورة، تاء مربوطة) يخلّي "جيتار" و"غيتار" و
     "guitar" كلها توصل لنفس الآلة. Enter يختار أول نتيجة. */
  const instrumentSearch = document.getElementById("instrumentSearch");
  if (instrumentSearch) {
    const norm = (t) =>
      t
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
        .replace(/[أإآ]/g, "ا")
        .replace(/ى/g, "ي")
        .replace(/ة/g, "ه")
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim();
    const chips = [...instrumentButtons];
    const index = new Map(chips.map((c) => [c, norm(c.textContent + " " + (c.dataset.keywords || ""))]));
    const groups = document.querySelectorAll("#instrumentPicker .instrument-group");
    const none = document.getElementById("instrumentNone");
    instrumentSearch.addEventListener("input", () => {
      const words = norm(instrumentSearch.value).split(" ").filter(Boolean);
      let shown = 0;
      chips.forEach((c) => {
        c.hidden = !words.every((w) => index.get(c).includes(w));
        const row = c.closest(".ip-row");
        if (row) row.hidden = c.hidden;
        if (!c.hidden) shown++;
      });
      groups.forEach((g) => (g.hidden = !g.querySelector(".instrument-btn:not([hidden])")));
      none.hidden = shown > 0;
      if (recentBox) recentBox.hidden = words.length > 0 || !recentBox.querySelector("button");
      document.getElementById("instrumentPicker").scrollTop = 0; // النتائج تبدأ من أول الصندوق
    });
    instrumentSearch.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      chips.find((c) => !c.hidden)?.click();
      instrumentSearch.blur(); // وإلا بقي المؤشر بالمربع وحروف البيانو صارت تُكتب فيه
    });
  }

  /* ===== تمرين تأليف: أول ٣٦ ثانية من فيلم Piper (تبويب "تعلّم") =====
     مثال مولَّد بالكود يطبّق ملخص التمرين قسماً قسماً — ليس مقطوعة الفيلم الأصلية:
       ٠–٣ فضول: كلارينت منفرد بلحن قصير متكرر (٣ نغمات).
       ٣–٨ توتر: أوتار + تنافر يتراكم، ورفع تدريجي للصوت بالأتمتة.
       ٨–١٣ خطر: تنافر أشد + أوتار غليظة (Dusty) + مؤثرات فولي لأمواج.
       ١٣–٢٣ توقّف الزمن: تناغم ثابت وأصوات ممدودة بلا إيقاع + فقاعات + صدى واسع.
       ٢٣–٣٦ بهجة: تناغم كبير، عودة لحن الكلارينت، وماريمبا تزداد كثافة.
     الأتمتة: مستوى كل طبقة والتوزيع الجانبي والصدى كلها منحنيات على AudioParam.
     لا طبول ولا نبض ضارب: الماريمبا تعزف تقاسيم لحنية. */
  const piperBtn = document.getElementById("piperPlay");
  if (piperBtn) {
    const PIPER_SECONDS = 36;
    const items = [...document.querySelectorAll("#piperList li")];
    const bar = document.getElementById("piperProgress");
    const midiHz = (m) => 440 * 2 ** ((m - 69) / 12);
    let piperTimer = null;

    function piperStop() {
      clearInterval(piperTimer);
      piperTimer = null;
      activeOscillators.forEach((o) => {
        try {
          o.stop();
        } catch {
          // خلص وقته أصلاً
        }
      });
      activeOscillators = [];
      items.forEach((li) => li.classList.remove("on"));
      bar.style.width = "0%";
      piperBtn.textContent = piperBtn.dataset.play;
    }

    async function piperPlay() {
      if (playing) stopPlayback();
      await ensureContext();
      await ensureSamples(["clarinet", "strings", "cello", "marimba"]);
      piperStop();
      const ctx = audioCtx;
      const t0 = ctx.currentTime + 0.15;

      // ---- المزج: صدى محلي (٤٫٥ث) فوق صدى المسار العام، وطبقة لكل مصدر ----
      const mix = ctx.createGain();
      mix.connect(masterInput);
      const verb = ctx.createConvolver();
      verb.buffer = makeRoomImpulse(ctx, 4.5);
      const wet = ctx.createGain();
      mix.connect(verb).connect(wet).connect(masterInput);

      const ramp = (param, points) => {
        param.setValueAtTime(points[0][1], t0 + points[0][0]);
        points.slice(1).forEach(([t, v]) => param.linearRampToValueAtTime(v, t0 + t));
      };
      const layer = (pan = 0) => {
        const g = ctx.createGain();
        g.gain.value = 1;
        const p = ctx.createStereoPanner();
        p.pan.value = pan;
        g.connect(p).connect(mix);
        return { in: g, gain: g.gain, pan: p.pan };
      };
      const clar = layer(-0.15);
      const str = layer(0);
      const dusty = layer(0.3);
      const shine = layer(0.4);
      const pad = layer(0);
      const mar = layer(0.25);
      const foley = layer(0);

      // playNote يقرأ الآلة العامة لحظة الجدولة: نبدّلها ثم نرجّعها
      const note = (inst, m, t, dur, gain, l) => {
        const saved = currentInstrument;
        currentInstrument = inst;
        playNote({ ctx, dry: l.in, wet: l.in, live: true }, clamp(Math.round(((m - 48) * 7) / 12), 0, 21), t0 + t, dur, gain, 0, 0, midiHz(m));
        currentInstrument = saved;
      };
      const chord = (inst, ms, t, dur, gain, l) => ms.forEach((m) => note(inst, m, t, dur, gain, l));

      // ---- ٠–٣ فضول: كلارينت، لحن من ٣ نغمات يتكرر مرتين (ري صغير) ----
      [0, 1.5].forEach((s) => {
        note("clarinet", 64, s, 0.45, 0.17, clar);
        note("clarinet", 67, s + 0.5, 0.45, 0.17, clar);
        note("clarinet", 65, s + 1.0, 0.5, 0.17, clar);
      });

      // ---- ٣–٨ توتر: وتر ري صغير ثم نغمات تنافر تدخل تباعاً، والصوت يصعد ----
      chord("strings", [50, 57, 65], 3, 5.4, 0.15, str);
      note("strings", 63, 5.0, 3.4, 0.13, str); // مي بيمول ضد ري/ري بيمول
      note("strings", 56, 6.4, 2.2, 0.13, str); // لا بيمول ضد لا
      [[3.4, 86], [4.5, 84], [5.6, 89], [6.5, 83], [7.3, 88]].forEach(([t, m]) => note("celesta", m, t, 0.6, 0.09, shine)); // لمعان خفيف بدل Beauty Blubbers

      // ---- ٨–١٣ خطر: عنقود أشد تنافراً + تشيلو غليظ + أمواج (ضجيج مفلتر يتموّج) ----
      chord("strings", [50, 56, 60, 66], 8, 5.4, 0.15, str);
      note("cello", 38, 8, 3.2, 0.22, dusty);
      note("cello", 39, 10.8, 2.5, 0.24, dusty); // نصف درجة فوقه = تنافر زاحف
      const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const nd = noiseBuf.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      const swell = (center, vol) => {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuf;
        src.loop = true;
        const f = ctx.createBiquadFilter();
        f.type = "bandpass";
        f.Q.value = 0.7;
        const g = ctx.createGain();
        ramp(f.frequency, [[center - 0.9, 300], [center, 1800], [center + 0.9, 400]]);
        ramp(g.gain, [[center - 0.9, 0.0001], [center, vol], [center + 0.9, 0.0001]]);
        src.connect(f).connect(g).connect(foley.in);
        src.start(t0 + center - 0.9);
        src.stop(t0 + center + 1);
        activeOscillators.push(src);
      };
      [[9.2, 0.05], [10.9, 0.08], [12.5, 0.12]].forEach(([c, v]) => swell(c, v));

      // ---- ١٣–٢٣ توقّف الزمن: وتر ثابت ممدود (كورس)، بلا إيقاع، وفقاعات متفرقة ----
      chord("choir", [50, 57, 64], 13, 10.6, 0.13, pad);
      const bubble = (t, panValue) => {
        const o = ctx.createOscillator();
        o.type = "sine";
        const g = ctx.createGain();
        const p = ctx.createStereoPanner();
        p.pan.value = panValue;
        const f0 = 380 + Math.random() * 300;
        o.frequency.setValueAtTime(f0, t0 + t);
        o.frequency.exponentialRampToValueAtTime(f0 * 2.6, t0 + t + 0.09);
        g.gain.setValueAtTime(0.0001, t0 + t);
        g.gain.exponentialRampToValueAtTime(0.06, t0 + t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + t + 0.14);
        o.connect(g).connect(p).connect(mix);
        o.start(t0 + t);
        o.stop(t0 + t + 0.2);
        activeOscillators.push(o);
      };
      [13.6, 14.4, 15.9, 17.2, 18.1, 19.7, 20.9, 22.1].forEach((t, i) => bubble(t, i % 2 ? 0.5 : -0.5));

      // ---- ٢٣–٣٦ بهجة: ري كبير، عودة اللحن (بالكبير)، وماريمبا تتكاثف تدريجياً ----
      [[23, 27, [50, 57, 66]], [27, 30, [55, 59, 62]], [30, 33, [57, 61, 64]], [33, 36.8, [50, 57, 66, 74]]].forEach(([a, z, ms]) =>
        chord("strings", ms, a, z - a + 0.3, 0.14, str)
      );
      [23.5, 25.5, 27.5].forEach((s) => {
        note("clarinet", 66, s, 0.45, 0.17, clar);
        note("clarinet", 69, s + 0.5, 0.45, 0.17, clar);
        note("clarinet", 67, s + 1.0, 0.6, 0.17, clar);
      });
      note("clarinet", 69, 31, 0.5, 0.17, clar);
      note("clarinet", 71, 31.6, 0.5, 0.17, clar);
      note("clarinet", 74, 32.2, 2.2, 0.19, clar);
      const arps = [[23, [62, 66, 69, 74]], [27, [62, 67, 71, 74]], [30, [64, 69, 73, 76]], [33, [62, 66, 69, 74]]];
      const arpAt = (t) => arps.filter(([s]) => s <= t).pop()[1];
      for (let mt = 26, k = 0; mt < 35.7; k++) {
        note("marimba", arpAt(mt)[[0, 1, 2, 3, 2, 1][k % 6]], mt, 0.5, 0.1 + (mt - 26) * 0.012, mar);
        mt += mt < 30 ? 0.6 : mt < 33 ? 0.45 : 0.33; // الطاقة تزيد بكثافة النغمات، لا بنبض ضارب
      }

      // ---- الأتمتة: مستوى الصوت، التوزيع الجانبي، والصدى ----
      ramp(str.gain, [[0, 0], [3, 0.15], [8, 0.6], [13, 0.95], [13.4, 0], [23, 0], [23.6, 0.35], [PIPER_SECONDS, 0.95]]);
      ramp(str.pan, [[3, -0.6], [8, 0], [13, 0.6], [13.4, 0], [PIPER_SECONDS, 0.25]]);
      ramp(dusty.gain, [[0, 0], [8, 0.5], [13, 1], [13.4, 0]]);
      ramp(pad.gain, [[0, 0], [12.9, 0], [15.5, 0.95], [22.6, 0.95], [24, 0]]);
      ramp(wet.gain, [[0, 0.3], [13, 0.4], [14.5, 0.9], [22, 0.9], [25, 0.4]]); // الصدى يتّسع وقت "توقّف الزمن"

      piperBtn.textContent = piperBtn.dataset.stop;
      piperTimer = setInterval(() => {
        const elapsed = ctx.currentTime - t0;
        if (elapsed < 0) return;
        if (elapsed > PIPER_SECONDS + 2.5) return piperStop();
        bar.style.width = Math.min(100, (elapsed / PIPER_SECONDS) * 100) + "%";
        items.forEach((li) => li.classList.toggle("on", elapsed >= +li.dataset.start && elapsed < +li.dataset.end));
      }, 100);
    }

    piperBtn.addEventListener("click", () => {
      if (piperTimer) piperStop();
      else piperPlay();
      playClickSound();
    });
  }

  /* ===== التبويبات: اعزف / ألّف / تعلّم ===== */
  const tabs = document.querySelectorAll(".sounds-tab");
  function showPane(id) {
    tabs.forEach((tab) => {
      const on = tab.dataset.pane === id;
      tab.classList.toggle("active", on);
      tab.setAttribute("aria-selected", String(on));
      document.getElementById(tab.dataset.pane).hidden = !on;
    });
    // لوحة البيانو (الآلة والأسماء والأوكتاف والدواسة وMIDI والمفاتيح) والإعدادات تنتقل لتبويب
    // "تدرّب" وترجع لمكانها في "اعزف" (أدوات العزف الحر اللي ما تخدم التدريب يخفيها CSS هناك)
    const pianoPanel = document.getElementById("pianoPanel");
    const settingsBox = document.getElementById("beepSettings");
    const songSlot = document.getElementById("songKeysSlot");
    if (pianoPanel && songSlot) {
      if (id === "panePractice" && pianoPanel.parentElement !== songSlot) songSlot.append(settingsBox, pianoPanel);
      else if (id !== "panePractice" && pianoPanel.parentElement === songSlot) {
        document.getElementById("beepHelp").after(settingsBox);
        document.querySelector("#panePlay .beep-credit").before(pianoPanel);
      }
    }
    const slot = document.getElementById(id === "panePlay" || id === "panePractice" ? "instrumentSlotPlay" : id === "paneCompose" ? "instrumentSlotCompose" : "");
    if (dd) {
      if (slot && dd.parentElement !== slot) {
        closeInstrumentPop();
        slot.append(dd);
      }
      dd.hidden = !slot;
    }
    document.dispatchEvent(new CustomEvent("sounds:pane", { detail: id }));
  }
  tabs.forEach((tab) =>
    tab.addEventListener("click", () => {
      showPane(tab.dataset.pane);
      if (tab.dataset.pane === "panePlay" && layers.length) renderLayers();
      playClickSound();
    })
  );
  // رابط مقطوعة مشارَك (?seed=) يفتح على "ألّف" مباشرة
  if (new URLSearchParams(location.search).has("seed")) showPane("paneCompose");
  // داخل تطبيق هكوله (?app=1): التطبيق عنده شريطه الخاص، فنخفي هيدر الموقع وفوتره
  if (new URLSearchParams(location.search).has("app")) document.documentElement.classList.add("in-app");

  /* ===== اعزف بنفسك: بيانو بالكيبورد والماوس واللمس وكيبورد MIDI =====
     الصف الأوسط = المفاتيح البيضاء، والصف فوقه = السوداء بنفس ترتيب البيانو.
     نقرأ e.code (المفتاح الفعلي) لا e.key، فيشتغل حتى لو الكيبورد عربي.
     كل نغمة لها "معرّف مصدر": حرف الكيبورد (KeyA)، أو إصبع/ماوس على مفتاح (p:60)،
     أو كيبورد MIDI (m:60) — فنفس النغمة من مصدرين ما يطفّي أحدهما الآخر. */
  const playBox = document.getElementById("beepPlayKeys");
  const keysWrap = document.getElementById("beepKeysWrap");
  const KEY_MAP = {
    KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6, KeyG: 7, KeyY: 8, KeyH: 9,
    KeyU: 10, KeyJ: 11, KeyK: 12, KeyO: 13, KeyL: 14, KeyP: 15, Semicolon: 16, Quote: 17,
  };
  const KEY_LABEL = { Semicolon: ";", Quote: "'" };
  const CODE_AT = {}; // نصف الدرجة داخل نافذة الكيبورد → حرفه
  Object.entries(KEY_MAP).forEach(([code, semi]) => (CODE_AT[semi] = code));
  const CHROMA = {
    letters: ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"],
    solfege: ["Do", "Do♯", "Re", "Re♯", "Mi", "Fa", "Fa♯", "Sol", "Sol♯", "La", "La♯", "Si"],
  };

  // localStorage قد يكون محجوباً (وضع خاص/إعدادات) — كل قراءة وكتابة محمية
  const store = {
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {
        // التخزين محجوب — الإعداد يبقى لهذي الزيارة فقط
      }
    },
  };

  let playOctave = 4;
  // ما يُكتب على المفاتيح المرسومة: أحرف الكيبورد (الافتراضي) أو أسماء النغمات
  // القياسية C D E أو Do Re Mi — للتعلّم. التحكم نفسه بالحالات الثلاث لا يتغيّر.
  let labelMode = ["letters", "solfege"].includes(store.get("beepLabels")) ? store.get("beepLabels") : "keys";
  // "compact": ١٨ مفتاحاً = نافذة الكيبورد، "full": بيانو كامل ٨٨ مفتاحاً (La0–Do8)
  // اللوحة: مبسّطة (أوكتاف بمفاتيح كبيرة) / عادية (نافذة الكيبورد ١٨ نغمة) / كاملة ٨٨
  let boardMode = ["simple", "full"].includes(store.get("beepBoard")) ? store.get("beepBoard") : "compact";

  /* ===== المقامات العربية بأرباع الأصوات =====
     كل مقام = درجاته السبع بتهجئتها الصحيحة (الحرف + العلامة)، ومنها نشتق كل شي:
     فئات النغمات (للمفاتيح الباهتة خارج المقام)، والقرار (أول درجة)، وإزاحة ربع
     الصوت (½♭ = -50 سنت). فبالراست مثلاً مفتاح Mi الأبيض يعزف "Mi نصف بيمول" بكل
     الأوكتافات، والأسود بجانبه يبقى Mi♭ كاملاً. والتهجئة نفسها تُكتب على المفاتيح
     (Si♭ بالبياتي لا La♯). القرارات التقليدية: راست ونهاوند على Do، بياتي وصبا
     وحجاز وكرد على Re، سيكاه على Mi½♭، وعجم على Si♭. */
  const MAQAM_SPELLING = {
    rast: "0 1 2½ 3 4 5 6½",
    bayati: "1 2½ 3 4 5 6b 0",
    sikah: "2½ 3 4 5 6½ 0 1",
    saba: "1 2½ 3 4b 5 6b 0",
    hijaz: "1 2b 3# 4 5 6b 0",
    nahawand: "0 1 2b 3 4 5b 6",
    kurd: "1 2b 3 4 5 6b 0",
    ajam: "6b 0 1 2b 3 4 5",
  };
  const NATURAL_PC = [0, 2, 4, 5, 7, 9, 11];
  const ACCIDENTAL = { "": ["", 0], b: ["♭", -1], "#": ["♯", 1], "½": ["½♭", 0] };
  const MAQAMS = { none: { tonic: 0, scale: null, cents: {}, spell: {} } };
  Object.entries(MAQAM_SPELLING).forEach(([id, spec]) => {
    const m = { scale: [], cents: {}, spell: {} };
    spec.split(" ").forEach((deg) => {
      const letter = Number(deg[0]);
      const [mark, shift] = ACCIDENTAL[deg.slice(1)];
      const pc = (NATURAL_PC[letter] + shift + 12) % 12;
      m.scale.push(pc);
      m.spell[pc] = [letter, mark];
      if (mark === "½♭") m.cents[pc] = -50;
    });
    m.tonic = m.scale[0];
    MAQAMS[id] = m;
  });
  let maqam = MAQAMS[store.get("beepMaqam")] ? store.get("beepMaqam") : "none";
  const pcOf = (midi) => ((midi % 12) + 12) % 12;
  const centsOf = (midi) => MAQAMS[maqam].cents[pcOf(midi)] || 0;
  const freqOf = (midi, cents = 0) => 440 * 2 ** ((midi - 69 + cents / 100) / 12);
  const pseudoDegree = (midi) => clamp(Math.round(((midi - 48) * 7) / 12), 0, 21); // لرنين الواطي الأطول والحاد الأقصر
  const windowBase = () => 60 + 12 * (playOctave - 4);
  const octaveOf = (midi) => Math.floor(midi / 12) - 1;
  // اسم النغمة بتهجئة المقام الحالي لو كانت من درجاته، وإلا بالاسم المعتاد (بالدييز)
  function noteName(midi, style) {
    const spelled = MAQAMS[maqam].spell[pcOf(midi)];
    return spelled ? NOTE_NAMES[style][spelled[0]] + spelled[1] : CHROMA[style][pcOf(midi)];
  }
  // النغمة (بلا ربع الصوت) وربعها من أي حدث — الأحداث القديمة فيها التردد فقط
  function evMidi(ev) {
    if (ev.midi != null) return ev.midi;
    return Math.round(69 + 12 * Math.log2(ev.freq / 440));
  }
  function evCents(ev) {
    if (ev.midi != null) return ev.cents || 0;
    return Math.round((69 + 12 * Math.log2(ev.freq / 440) - evMidi(ev)) * 100);
  }

  /* القوة (Velocity ١–١٢٧) → شدة النغمة. ٩٦ = نفس شدة البيانو قبل إضافة القوة.
     المنحنى أُسّي لأن الأذن تسمع الفرق بين الهادئ والمتوسط أكبر من بين القوي والأقوى */
  const velGain = (v) => 0.2 * (clamp(v, 1, 127) / 96) ** 1.5;
  const gainVel = (g) => Math.round(clamp(96 * (g / 0.2) ** (1 / 1.5), 1, 127));
  function makeNoteEvent(midi, cents, startBeat, held, durBeats, gain) {
    return { midi, cents, freq: freqOf(midi, cents), degree: pseudoDegree(midi), startBeat, held, durBeats, gain, velocity: gainVel(gain), pan: 0 };
  }

  // أسماء مجموعات الأوكتاف للطالب (١ … ٧): «الوسط» = أوكتاف Do الوسطى (٤)، وفوقه/تحته
  const GROUPS = (document.getElementById("songPractice")?.dataset.groups || "").split("|");
  function renderPlayKeys() {
    if (!playBox) return;
    const full = boardMode === "full" && !songRange; // تبويب التدريب: نطاق الأغنية بدل اللوحة
    const base = windowBase();
    const lo = songRange ? songRange.lo : full ? 21 : base;
    const hi = songRange ? songRange.hi : full ? 108 : base + (boardMode === "simple" ? 12 : 17);
    const isBlack = (m) => [1, 3, 6, 8, 10].includes(pcOf(m));
    const all = [];
    for (let m = lo; m <= hi; m++) all.push(m);
    const whites = all.filter((m) => !isBlack(m));
    const { scale, tonic } = MAQAMS[maqam];
    const asNotes = labelMode !== "keys";
    playBox.style.setProperty("--whites", whites.length);
    keysWrap?.style.setProperty("--whites", whites.length); // خطوط ممر الأعمدة (تدرّب) على حدود المفاتيح
    playBox.classList.toggle("dense", whites.length > 22); // نطاق أغنية عريض: أسماء أصغر والمفاتيح ما تطلع برا الشاشة
    playBox.dataset.labels = labelMode;
    playBox.classList.toggle("full", full);
    keysWrap?.classList.toggle("full", full);
    playBox.innerHTML = all
      .map((m) => {
        const black = isBlack(m);
        // السوداء تقع على الحد بين البيضاء اللي قبلها واللي بعدها
        const pos = black ? whites.filter((w) => w < m).length : whites.indexOf(m);
        const code = m - base >= 0 && m - base <= 17 ? CODE_AT[m - base] : null;
        const letter = code ? KEY_LABEL[code] || code.slice(3) : "";
        const name = noteName(m, asNotes ? labelMode : noteStyle);
        let main;
        let small = "";
        if (full) {
          // ٥٢ مفتاحاً أبيض ما يتسع لكل الأسماء: الحرف على نافذة الكيبورد، واسم Do مع رقم أوكتافه
          const cName = pcOf(m) === 0 ? name + octaveOf(m) : "";
          main = asNotes ? cName : letter;
          if (!asNotes) small = cName;
        } else {
          main = asNotes ? name : letter;
          if (!asNotes) small = name;
        }
        const cls = [black ? "pk-black" : "pk-white"];
        if (scale && !scale.includes(pcOf(m))) cls.push("off");
        if (scale && pcOf(m) === tonic) cls.push("tonic");
        if (full && code) cls.push("reach");
        if (downCount.has(m)) cls.push("down");
        return `<button type="button" class="${cls.join(" ")}" data-midi="${m}" data-oct="${octaveOf(m)}"${pcOf(m) === 0 && GROUPS[octaveOf(m) - 1] ? ` data-group="${GROUPS[octaveOf(m) - 1]}"` : ""}${code ? ` data-code="${code}"` : ""} style="--i:${pos}" tabindex="-1" aria-label="${noteName(m, noteStyle)}${octaveOf(m)}"><b>${main}</b>${small ? `<small>${small}</small>` : ""}</button>`;
      })
      .join("");
    document.getElementById("beepOctLabel").textContent = "C" + playOctave;
    if (full) scrollToReach();
  }

  // اللوحة الكاملة أعرض من الشاشة: نمرّرها لتظهر نافذة الكيبورد (بعد تغيير الأوكتاف)
  function scrollToReach() {
    const reach = playBox.querySelectorAll(".pk-white.reach");
    if (!reach.length || !keysWrap || keysWrap.scrollWidth <= keysWrap.clientWidth) return;
    const first = reach[0].offsetLeft;
    const last = reach[reach.length - 1].offsetLeft + reach[reach.length - 1].offsetWidth;
    keysWrap.scrollTo({ left: (first + last) / 2 - keysWrap.clientWidth / 2, behavior: "smooth" });
  }

  const held = new Map(); // المصدر الممسوك → { env, midi } (env فاضي لحين يجهز الصوت)
  const sustained = new Map(); // انرفع والدواسة نازلة: يرنّ لحين ترتفع الدواسة
  const downCount = new Map(); // النغمة → كم مصدراً ضاغطها (للإضاءة)
  let pedalLatch = false; // زر الدواسة (ثابت)
  let pedalKey = false; // Shift ممسوك
  let midiPedal = false; // دواسة كيبورد MIDI (CC64)
  const pedalDown = () => pedalLatch || pedalKey || midiPedal;

  function markKey(midi, on) {
    const n = (downCount.get(midi) || 0) + (on ? 1 : -1);
    if (n > 0) downCount.set(midi, n);
    else downCount.delete(midi);
    playBox?.querySelector(`[data-midi="${midi}"]`)?.classList.toggle("down", n > 0);
  }

  // آلة ممدودة (أرغن، كورس، وتريات...) تستمر ما دام المفتاح مضغوطاً؛ المقروعة تخفت
  // طبيعياً. الرفع يخمّد الاثنين (keyRelease)، فالمدة الطويلة ما تكلّف شي بعد الرفع.
  // الآلة المسجّلة ترنّ بطول عيّنتها (والممدودة تتكرر) ما دامت ممسوكة أو الدواسة نازلة.
  const holdSeconds = (id) => (sampleBank[INSTRUMENTS[id].sampled] ? 30 : INSTRUMENTS[id].sustainRatio > 0 ? 12 : 2.4);

  function keyRelease(env) {
    if (!env) return;
    const now = audioCtx.currentTime;
    env.gain.cancelScheduledValues(now);
    env.gain.setTargetAtTime(0.0001, now, env._tau || 0.09); // مخمّد البيانو: ذيل قصير ناعم مو قطع (الهارب يرنّ أطول)
  }

  function releaseSustained(id) {
    const s = sustained.get(id);
    if (!s) return;
    sustained.delete(id);
    keyRelease(s.env);
    noteEnd(id);
  }

  async function noteOn(id, midi, velocity = 96) {
    if (held.has(id)) return;
    const entry = { env: null, midi };
    held.set(id, entry);
    const pressedAt = performance.now(); // وقت الضغط الفعلي، قبل انتظار تجهيز الصوت
    markKey(midi, true);
    if (!id.startsWith("s:")) songHit(midi); // وضع التدريب ينتظر هذي الضغطة؟ (s: = الأغنية نفسها تعزف)
    // نفس المصدر أو نفس النغمة ترنّ بالدواسة: الضربة الجديدة تخمد القديمة (مثل البيانو)
    releaseSustained(id);
    sustained.forEach((s, other) => s.midi === midi && releaseSustained(other));
    await ensureContext();
    const cents = centsOf(midi);
    const freq = freqOf(midi, cents);
    const gain = velGain(velocity);
    if (rec?.kind === "notes") {
      const ev = { ...makeNoteEvent(midi, cents, (pressedAt - rec.t0) / 1000, 0, 0, gain), id, velocity };
      rec.open.set(id, ev);
      rec.events.push(ev);
    }
    const target = { ctx: audioCtx, dry: masterInput, wet: delayNode, live: false };
    entry.env = playNote(target, pseudoDegree(midi), audioCtx.currentTime + 0.005, holdSeconds(currentInstrument), gain, 0, 0, freq);
    if (held.get(id) !== entry) {
      // انرفع قبل ما يجهز الصوت
      if (pedalDown()) sustained.set(id, entry);
      else {
        keyRelease(entry.env);
        noteEnd(id);
      }
    }
  }

  function noteOff(id) {
    const entry = held.get(id);
    if (!entry) return;
    held.delete(id);
    markKey(entry.midi, false);
    if (!entry.env) return; // الصوت لسا ما جهز — noteOn يكمل الباقي
    if (pedalDown()) sustained.set(id, entry);
    else {
      keyRelease(entry.env);
      noteEnd(id);
    }
  }

  // الدواسة ارتفعت (من كل مصادرها): كل النغمات المعلّقة تخمد
  function releasePedal() {
    paintPedal();
    if (pedalDown()) return;
    [...sustained.keys()].forEach(releaseSustained);
  }

  const keyOn = (code) => noteOn(code, windowBase() + KEY_MAP[code]);
  const keyOff = noteOff;

  const pedalBtn = document.getElementById("beepPedal");
  function paintPedal() {
    if (!pedalBtn) return;
    pedalBtn.classList.toggle("active", pedalDown());
    pedalBtn.setAttribute("aria-pressed", String(pedalLatch));
  }
  pedalBtn?.addEventListener("click", () => {
    pedalLatch = !pedalLatch;
    releasePedal();
    playClickSound();
  });

  /* ===== كيبورد MIDI حقيقي (Web MIDI) =====
     كروم وإيدج وفايرفوكس الحديث. نطلب الإذن بضغطة الزر فقط، ولو سبق وسمح
     المستخدم نوصل تلقائياً بلا سؤال. القوة من الكيبورد نفسه، والدواسة CC64. */
  const midiConnectBtn = document.getElementById("beepMidi");
  // "رمز نص": النص بعنصر مستقل يُخفى بالجوال الأفقي ويبقى الرمز (مثل الدواسة والمترونوم)
  function setChipLabel(btn, text) {
    const [icon, ...rest] = text.trim().split(" ");
    const span = document.createElement("span");
    span.className = "qb-text";
    span.textContent = rest.join(" ");
    btn.replaceChildren(icon + " ", span);
  }
  let midiAccess = null;
  function onMidiMessage(e) {
    const [status, d1 = 0, d2 = 0] = e.data;
    const cmd = status & 0xf0;
    if (cmd === 0x90 && d2 > 0) noteOn("m:" + d1, d1, d2);
    else if (cmd === 0x80 || cmd === 0x90) noteOff("m:" + d1);
    else if (cmd === 0xb0 && d1 === 64) {
      midiPedal = d2 >= 64;
      releasePedal();
    } else if (cmd === 0xb0 && (d1 === 120 || d1 === 123)) {
      [...held.keys()].filter((k) => k.startsWith("m:")).forEach(noteOff); // All Notes Off
    }
  }
  function bindMidiInputs() {
    const names = [];
    midiAccess.inputs.forEach((input) => {
      input.onmidimessage = onMidiMessage;
      names.push(input.name);
    });
    setChipLabel(midiConnectBtn, names.length ? midiConnectBtn.dataset.on + names[0] : midiConnectBtn.dataset.label);
    midiConnectBtn.title = names.join("، ");
    midiConnectBtn.classList.toggle("active", names.length > 0);
    return names.length;
  }
  async function connectMidi(quiet) {
    try {
      midiAccess = midiAccess || (await navigator.requestMIDIAccess());
      midiAccess.onstatechange = bindMidiInputs; // وُصل أو فُصل كيبورد أثناء الاستخدام
      if (!bindMidiInputs() && !quiet) showToast(midiConnectBtn.dataset.none);
    } catch {
      if (!quiet) showToast(midiConnectBtn.dataset.denied);
    }
  }
  if (midiConnectBtn) {
    if (!navigator.requestMIDIAccess) {
      midiConnectBtn.hidden = true; // سفاري (آيفون) ما يدعم MIDI بالمتصفح — لا نعرض زراً لا يعمل
    } else {
      midiConnectBtn.addEventListener("click", () => {
        connectMidi(false);
        playClickSound();
      });
      navigator.permissions
        ?.query({ name: "midi" })
        .then((p) => p.state === "granted" && connectMidi(true))
        .catch(() => {});
    }
  }

  /* ===== مشروع الاستوديو: السرعة والميزان والشبكة =====
     الأزمنة كلها بالثواني (كما كانت)؛ السرعة تحدد طول الضربة للمسطرة والمترونوم
     والشبكة والإيقاعات. تغيير السرعة يمطّ مقاطع النغمات والإيقاعات لتبقى على
     نفس الضربات (مثل باند لاب)، والمقاطع الصوتية تنتقل بمكانها بلا مطّ. */
  let bpm = 90;
  let meter = 4;
  const savedGrid = store.get("beepGrid");
  let gridDiv = savedGrid !== null && [0, 4, 8, 16].includes(Number(savedGrid)) ? Number(savedGrid) : 8;
  let metroOn = store.get("beepMetro") === "1";
  let countIn = store.get("beepCountIn") === "1";
  const beatSec = () => 60 / bpm;
  const barSec = () => beatSec() * meter;
  const gridStep = () => (gridDiv ? (beatSec() * 4) / gridDiv : 0);
  // المحاذاة للشبكة (أو ٥٠م.ث لو الشبكة "حرّة")، وعلامة قطع قريبة (٨ بكسل) تجذب أقوى
  // من الشبكة — فالضربة تقع على القطع بالمشهد بالضبط
  const snap = (sec) => {
    const near = markers.find((m) => Math.abs(m - sec) * pxPerSec < 8);
    if (near != null) return near;
    const step = gridStep() || 0.05;
    return Math.max(0, Math.round(sec / step) * step);
  };

  /* ===== الإيقاعات: طبلة (دربكة) ورق، وطقم غربي — كلها تخليق لا عيّنات =====
     دُم = ضربة وسط الطبلة الغليظة، تك = حافتها الحادة، كا = تك خفيفة باليد الأخرى،
     رق = صنوج الدف. الأنماط بخطوات ربع الضربة (١٦ خطوة لمازورة ٤/٤)؛ "x" = ضربة.
     أنماط المقسوم والبلدي والصعيدي والملفوف والأيوب والسماعي الثقيل بصيغها
     الأساسية المتداولة بتعليم الإيقاع العربي، والزخارف (كا) خفيفة. */
  const DRUM_KITS = { arabic: ["doum", "tak", "ka", "riq"], western: ["kick", "snare", "hat", "clap"] };
  const RIQ = "x.x.x.x.x.x.x.x.";
  const RHYTHMS = {
    maqsum: { kit: "arabic", beats: 4, lanes: { doum: "x.......x.......", tak: "..x...x.....x...", ka: "....x.....x...x.", riq: RIQ } },
    baladi: { kit: "arabic", beats: 4, lanes: { doum: "x.x.....x.......", tak: "......x.....x...", ka: "....x.....x...x.", riq: RIQ } },
    saidi: { kit: "arabic", beats: 4, lanes: { doum: "x.....x.x.......", tak: "..x.........x...", ka: "....x.....x...x.", riq: RIQ } },
    malfuf: { kit: "arabic", beats: 4, lanes: { doum: "x.......x.......", tak: "...x..x....x..x.", ka: "", riq: RIQ } },
    ayyub: { kit: "arabic", beats: 4, lanes: { doum: "x...x...x...x...", tak: "......x.......x.", ka: "...x.......x....", riq: RIQ } },
    // السماعي الثقيل ١٠/٨ = خمس ضربات (عشرون خطوة): دُم - - تك - دُم دُم تك - -
    samai: { kit: "arabic", beats: 5, lanes: { doum: "x.........x.x.......", tak: "......x.......x.....", ka: "..x.....x.......x.x.", riq: "x...x...x...x...x..." } },
    rock: { kit: "western", beats: 4, lanes: { kick: "x.......x.x.....", snare: "....x.......x...", hat: RIQ, clap: "" } },
    pop: { kit: "western", beats: 4, lanes: { kick: "x.....x.x.......", snare: "....x.......x...", hat: RIQ, clap: "............x..." } },
    hiphop: { kit: "western", beats: 4, lanes: { kick: "x......x..x.....", snare: "....x.......x...", hat: "x.xxx.x.x.xxx.x.", clap: "" } },
  };
  // القوة الافتراضية لكل صوت (١–١٢٧): الدُم والجهير أقوى، والرق والهاي هات خلفية
  const DRUM_VEL = { doum: 118, tak: 100, ka: 62, riq: 46, kick: 118, snare: 104, hat: 58, clap: 92 };
  // ‏ "ميدي" قياسي (General MIDI) — الطبلة العربية أقرب ما لها الكونغا، والرق الدف
  const GM_DRUM = { kick: 36, snare: 38, hat: 42, clap: 39, doum: 64, tak: 63, ka: 62, riq: 54 };
  const drumGain = (v) => 0.55 * (clamp(v, 1, 127) / 100) ** 1.3;

  const noiseBuffers = new WeakMap();
  function noiseOf(ctx) {
    let buf = noiseBuffers.get(ctx);
    if (!buf) {
      buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      noiseBuffers.set(ctx, buf);
    }
    return buf;
  }

  function playDrum(target, type, t, gain) {
    const { ctx, dry, live } = target;
    const out = ctx.createGain();
    out.gain.value = gain;
    out.connect(dry);
    const keep = (node) => live && activeOscillators.push(node);
    // نغمة تهبط بسرعة (جلد الطبلة) — f0 → f1
    const tone = (f0, f1, dur, vol, type2 = "sine") => {
      const o = ctx.createOscillator();
      o.type = type2;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + dur + 0.02);
      keep(o);
    };
    // ضجيج مفلتر (الطقّة، الصنوج، التصفيق)
    const noise = (filterType, freq, q, dur, vol, at = t) => {
      const src = ctx.createBufferSource();
      src.buffer = noiseOf(ctx);
      const f = ctx.createBiquadFilter();
      f.type = filterType;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, at);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      src.connect(f).connect(g).connect(out);
      src.start(at, Math.random() * 0.5);
      src.stop(at + dur + 0.02);
      keep(src);
    };
    switch (type) {
      case "doum":
        tone(118, 74, 0.5, 1);
        noise("lowpass", 420, 0.7, 0.05, 0.35);
        break;
      case "tak":
        noise("bandpass", 2600, 1.8, 0.07, 1.1);
        tone(840, 600, 0.05, 0.3);
        break;
      case "ka":
        noise("bandpass", 2200, 1.5, 0.05, 0.7);
        tone(700, 520, 0.04, 0.18);
        break;
      case "riq":
        noise("bandpass", 9000, 3, 0.13, 0.7);
        noise("highpass", 6500, 0.7, 0.08, 0.35, t + 0.012); // رنّة الصنوج بعد الضربة
        break;
      case "kick":
        tone(150, 42, 0.45, 1.1);
        break;
      case "snare":
        tone(200, 160, 0.12, 0.45, "triangle");
        noise("bandpass", 1800, 0.8, 0.2, 0.9);
        break;
      case "hat":
        noise("highpass", 7500, 0.7, 0.06, 0.6);
        break;
      case "clap":
        [0, 0.012, 0.024].forEach((d) => noise("bandpass", 1400, 1.2, 0.03, 0.8, t + d));
        noise("bandpass", 1400, 1, 0.16, 0.5, t + 0.03);
        break;
    }
  }

  // أحداث نمط إيقاع لعدد مازورات بسرعة المشروع الحالية (الثواني من بداية المقطع)
  function rhythmEvents(id, bars) {
    const r = RHYTHMS[id];
    const steps = r.beats * 4;
    const stepSec = beatSec() / 4;
    const events = [];
    for (let b = 0; b < bars; b++) {
      Object.entries(r.lanes).forEach(([drum, pattern]) => {
        [...pattern].forEach((ch, i) => {
          if (ch !== "x") return;
          // الضربة الأولى بالمازورة أقوى قليلاً، والرق يتناوب قوي/خفيف
          const accent = i === 0 ? 1.08 : drum === "riq" || drum === "hat" ? (i % 4 === 0 ? 1 : 0.8) : 1;
          const velocity = Math.round(clamp(DRUM_VEL[drum] * accent, 1, 127));
          events.push({ drum, startBeat: (b * steps + i) * stepSec, held: stepSec * 0.9, durBeats: 0.3, velocity, gain: drumGain(velocity) });
        });
      });
    }
    return { events, end: bars * steps * stepSec };
  }

  /* ===== المترونوم =====
     جدولة مسبقة (Lookahead): مؤقّت كل ٢٥م.ث يجدول النقرات اللي تقع بالـ١٥٠م.ث
     الجاية على ساعة الصوت نفسها — فالنقرات دقيقة حتى لو تأخّر المؤقّت. الضربة
     الأولى بالمازورة أحدّ. النقرات تمر على منزلق الصوت لا على المؤثرات ولا تُصدَّر. */
  const metroBtn = document.getElementById("beepMetro");
  let metroTimer = null;
  function metroClick(t, accent) {
    const o = audioCtx.createOscillator();
    o.frequency.value = accent ? 1760 : 1175;
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(accent ? 0.4 : 0.25, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g).connect(volumeGain);
    o.start(t);
    o.stop(t + 0.06);
    activeOscillators.push(o);
  }
  // at = وقت الصوت اللي يُعزف فيه الموضع fromSec من الجدول
  function startMetronome(at, fromSec) {
    stopMetronome();
    const beat = beatSec();
    let n = Math.ceil(fromSec / beat - 1e-6);
    const tick = () => {
      const horizon = audioCtx.currentTime + 0.15;
      for (;;) {
        const t = at + n * beat - fromSec;
        if (t > horizon) break;
        if (t > audioCtx.currentTime - 0.02) metroClick(t, ((n % meter) + meter) % meter === 0);
        n++;
      }
    };
    tick();
    metroTimer = setInterval(tick, 25);
  }
  function stopMetronome() {
    clearInterval(metroTimer);
    metroTimer = null;
  }
  function paintMetro() {
    metroBtn?.classList.toggle("active", metroOn);
    metroBtn?.setAttribute("aria-pressed", String(metroOn));
  }
  function toggleMetro() {
    metroOn = !metroOn;
    store.set("beepMetro", metroOn ? "1" : "0");
    paintMetro();
    // أثناء التشغيل/التسجيل يبدأ أو يقف فوراً على نفس الضربات
    if (transport && (takeTimers.length || rec)) {
      if (metroOn) startMetronome(transport.at, transport.from);
      else stopMetronome();
    }
    playClickSound();
  }
  metroBtn?.addEventListener("click", toggleMetro);
  paintMetro();

  /* ===== المسارات: الخلاط والمؤثرات لكل مسار =====
     كل مسار (صف بالجدول) سلسلة: معادل ٣ نطاقات → ضاغط (اختياري) → أتمتة → مستوى →
     توزيع يمين/يسار → الخروج، ومنه إرسالان: صدى المكان (مشترك) وترديد بطول نصف ضربة.
     نفس السلسلة تُبنى بالتشغيل الحي وبالتصدير، فالملف يطابق ما تسمعه. */
  const newTrack = () => ({ vol: 1, pan: 0, mute: false, solo: false, eq: [0, 0, 0], reverb: 0, echo: 0, comp: false, auto: null });
  const cloneTrack = (t) => ({ ...t, eq: [...t.eq], auto: t.auto ? t.auto.map((p) => ({ ...p })) : null });

  function buildTrackChain(ctx, dest, reverb, tr) {
    const input = ctx.createGain();
    const eq = [
      ["lowshelf", 250],
      ["peaking", 1200],
      ["highshelf", 4500],
    ].map(([type, f], i) => {
      const b = ctx.createBiquadFilter();
      b.type = type;
      b.frequency.value = f;
      if (type === "peaking") b.Q.value = 0.8;
      b.gain.value = tr.eq[i];
      return b;
    });
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -24;
    comp.ratio.value = 4;
    comp.attack.value = 0.005;
    comp.release.value = 0.2;
    const compMakeup = ctx.createGain();
    compMakeup.gain.value = 1.5;
    // الضاغط مسار موازٍ لمسار مباشر، والتبديل بينهما بالمستوى — يتغيّر أثناء العزف بلا انقطاع
    const compIn = ctx.createGain();
    compIn.gain.value = tr.comp ? 1 : 0;
    const bypass = ctx.createGain();
    bypass.gain.value = tr.comp ? 0 : 1;
    const auto = ctx.createGain();
    const vol = ctx.createGain();
    vol.gain.value = tr.vol;
    const pan = ctx.createStereoPanner();
    pan.pan.value = tr.pan;
    input.connect(eq[0]).connect(eq[1]).connect(eq[2]);
    eq[2].connect(compIn).connect(comp).connect(compMakeup).connect(auto);
    eq[2].connect(bypass).connect(auto);
    auto.connect(vol).connect(pan).connect(dest);
    const rev = ctx.createGain();
    rev.gain.value = tr.reverb;
    pan.connect(rev).connect(reverb);
    const delay = ctx.createDelay(2);
    delay.delayTime.value = Math.min(1.9, beatSec() / 2);
    const feedback = ctx.createGain();
    feedback.gain.value = 0.35;
    const echo = ctx.createGain();
    echo.gain.value = tr.echo * 0.6;
    pan.connect(echo).connect(delay);
    delay.connect(feedback).connect(delay);
    delay.connect(dest);
    return { input, eq, compIn, bypass, auto, vol, pan, rev, echo, delay };
  }

  // يجهّز سلاسل كل المسارات داخل سياق صوتي (حي أو تصدير) فوق وجهة الخروج المعطاة
  function studioTarget(target, trackList = tracks) {
    const { ctx } = target;
    const reverb = ctx.createConvolver();
    reverb.buffer = makeRoomImpulse(ctx, 2.4);
    reverb.connect(target.dry);
    const chains = trackList.map((tr) => buildTrackChain(ctx, target.dry, reverb, tr));
    return { ...target, chains, trackList, reverb };
  }

  // قيمة الأتمتة عند لحظة: خط مستقيم بين النقاط، وثابتة قبل أولها وبعد آخرها
  function autoValueAt(points, t) {
    if (!points.length) return 1;
    if (t <= points[0].t) return points[0].v;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      if (t <= b.t) return a.v + ((b.v - a.v) * (t - a.t)) / (b.t - a.t || 1);
    }
    return points[points.length - 1].v;
  }
  function automate(target, start, from) {
    target.chains.forEach((c, row) => {
      const pts = target.trackList[row]?.auto;
      if (!pts?.length) return;
      const g = c.auto.gain;
      g.setValueAtTime(autoValueAt(pts, from), start);
      pts.filter((p) => p.t > from).forEach((p) => g.linearRampToValueAtTime(p.v, start + p.t - from));
    });
  }

  // مقطع صوتي (ميكروفون أو ملف): يُعزف الجزء الظاهر [t0,t1] من التسجيل
  function scheduleAudio(target, l, start, from) {
    const end = layerEnd(l);
    if (end <= from) return;
    const { ctx, dry, live } = target;
    const skip = Math.max(0, from - l.offset);
    const when = start + Math.max(0, l.offset - from);
    const len = layerLen(l) - skip;
    const src = ctx.createBufferSource();
    src.buffer = l.buffer;
    const g = ctx.createGain();
    // تلاشٍ ٥م.ث بالحافتين: القص بنص موجة يطقّ بدونه
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(1, when + 0.005);
    g.gain.setValueAtTime(1, when + Math.max(0.006, len - 0.005));
    g.gain.linearRampToValueAtTime(0, when + len);
    src.connect(g).connect(dry);
    src.start(when, l.t0 + skip, len);
    if (live) activeOscillators.push(src);
  }

  // كل طبقة بآلتها: نبدّل الآلة العامة أثناء الجدولة فقط (playNote يقرأها لحظتها)
  function scheduleLayers(target, list, start, from = 0) {
    const saved = currentInstrument;
    list.forEach((l) => {
      const t = target.chains ? { ...target, dry: target.chains[l.row]?.input || target.dry } : target;
      if (l.kind === "audio") return scheduleAudio(t, l, start, from);
      const all = clipEvents(l);
      const events = from ? all.filter((e) => e.startBeat + l.offset >= from) : all;
      const at = start + l.offset - from;
      if (l.kind === "drums") return events.forEach((e) => playDrum(t, e.drum, at + e.startBeat, e.gain));
      currentInstrument = l.instrument;
      scheduleEvents(t, { events, meta: { bpm: 60 } }, at);
    });
    currentInstrument = saved;
    if (target.chains) automate(target, start, from);
  }

  /* ===== تسجيل العزف بطبقات =====
     كل تسجيل "طبقة" (مقطع): نغمات (الوقت، النغمة، مدة الضغط، القوة) مع آلتها، أو
     ضربات إيقاع، أو صوت مسجّل من الميكروفون/ملف. يبدأ التسجيل عند الخط الأبيض
     والطبقات الأخرى تُعزف معك؛ وأول تسجيل بلا مترونوم يُقصّ صمته الأول (للعزف
     العفوي). أزمنة النغمات بالثواني ("الضربة" = ثانية بالمصدّرات). */
  const MAX_TAKE_SECONDS = 300;
  const MAX_LAYERS = 64;
  const MAX_TRACKS = 16;
  let rec = null; // تسجيل جارٍ: { kind, t0, at, from, open: Map(مصدر→حدث), events, timer, instrument, trim }
  let layers = []; // [{ kind: "notes"|"drums"|"audio", events|buffer, instrument, muted, end, t0, t1, offset, row }]
  let tracks = []; // إعدادات الخلاط لكل مسار (صف)
  let takeTimers = [];
  let transport = null; // { at, from }: أي موضع بالجدول يُعزف عند أي وقت صوت

  const recToggle = document.getElementById("beepRecToggle");
  const recTime = document.getElementById("beepRecTime");
  const recTake = document.getElementById("beepRecTake");
  const recPlay = document.getElementById("beepRecPlay");
  const micBtn = document.getElementById("beepMicRec");

  const anySolo = () => tracks.some((t) => t.solo);
  // يُسمع؟ المقطع غير مكتوم، ومساره غير مكتوم، ولو فيه "منفرد" فمساره منفرد
  const audible = (l) => {
    const tr = tracks[l.row] || {};
    return !l.muted && !tr.mute && (!anySolo() || tr.solo);
  };
  const sounding = () => layers.filter(audible);
  const instrumentBtn = (id) => document.querySelector(`.instrument-btn[data-instrument="${id}"]`);
  const instrumentLabel = (id) => instrumentBtn(id)?.textContent.trim() || id;
  const rhythmLabel = (id) => document.querySelector(`[data-rhythm="${id}"]`)?.textContent.trim() || id;
  const clipLabel = (l) => (l.kind === "drums" ? rhythmLabel(l.rhythm) : l.kind === "audio" ? l.name || micBtn?.dataset.label || "🎤" : instrumentLabel(l.instrument));
  const clipIcon = (l) => (l.kind === "drums" ? "🥁" : l.kind === "audio" ? (l.name || "🎤").split(" ")[0] : instrumentBtn(l.instrument)?.dataset.icon || "🎵");
  const clock = (sec) => Math.floor(sec / 60) + ":" + String(Math.floor(sec % 60)).padStart(2, "0");
  const idleLabel = () => (layers.length ? recToggle.dataset.more : recToggle.dataset.label);

  // "قطعة" كاملة من الطبقات المسموعة — تمرّ على نفس مصدّرات المولّد
  function mixPiece() {
    const live = sounding();
    return {
      layers: live,
      tracks: tracks.map(cloneTrack),
      meta: { seed: "studio", bpm: 60, meter, totalBeats: Math.max(...live.map(layerEnd)) },
    };
  }

  function noteEnd(id) {
    const ev = rec?.open.get(id);
    if (!ev) return;
    rec.open.delete(id);
    ev.held = Math.max(0.05, (performance.now() - rec.t0) / 1000 - ev.startBeat);
    // مدة الرنين = مدة الضغط + ذيل قصير (المخمّد الحي يقطع الرنين بعد الرفع بنحو ٠٫٤ث)
    ev.durBeats = Math.min(holdSeconds(rec.instrument), ev.held + 0.4);
  }

  /* ===== لوحة المسارات (مثل باند لاب) =====
     كل طبقة "مقطع" (clip) يقف بمسار (row) وزمن (offset بالثواني). يُسحب بحرية:
     يميناً ويساراً بالزمن (على الشبكة)، وفوق وتحت بين المسارات (السحب لتحت آخر
     مسار يفتح مساراً جديداً، والمسارات الفارغة تُطوى). المسطرة بالمازورات. الخط
     الأبيض الثابت يوضع بالنقر/السحب على المسطرة، وعنده يُقصّ المقطع المحدد ويبدأ
     التسجيل. يسار كل مسار رقمه — النقر عليه يفتح خلاطه. */
  const timeline = document.getElementById("beepTimeline");
  const lanes = document.getElementById("beepLanes");
  const gutter = document.getElementById("beepGutter");
  const ruler = document.getElementById("beepRuler");
  const playhead = document.getElementById("beepPlayhead");
  const board = document.getElementById("beepBoard");
  const tools = document.getElementById("beepClipTools");
  const ROW_H = 44;
  let pxPerSec = 30;
  let timelineSeconds = 10;
  let playheadTimer = null;
  let cursor = 0; // موضع المؤشر الأبيض الثابت (ثوانٍ) — نقطة القص وبداية التسجيل
  let selected = null; // المقطع المحدد

  /* الموقع يكبّر الصفحة كلها بـzoom على الشاشات العريضة (theme-init.js، حتى ١٫٨×).
     الماوس وgetBoundingClientRect بوحدات الشاشة، بينما left/width للمقاطع والخط
     بوحدات الصفحة قبل التكبير — فبدون القسمة على المعامل يبتعد الخط عن الماوس
     بقدر التكبير، وأكثر كل ما رحت يمين. */
  const zoomOf = () => board.getBoundingClientRect().width / board.offsetWidth || 1;
  const layerLen = (l) => l.t1 - l.t0; // طول الجزء الظاهر من المقطع
  const layerEnd = (l) => l.offset + layerLen(l);
  // النغمات الظاهرة داخل نافذة المقطع [t0,t1] بأوقات نسبية لبدايته؛ النغمة التي تعبر
  // النهاية تُقصّر. التقصير لا يمسح شيئاً (l.events كما سُجّلت)، فالتطويل يرجّعها.
  function clipEvents(l) {
    if (l.kind === "audio") return [];
    const out = [];
    l.events.forEach((ev) => {
      if (ev.startBeat < l.t0 - 1e-6 || ev.startBeat >= l.t1) return;
      const held = Math.min(ev.held, l.t1 - ev.startBeat);
      out.push({ ...ev, startBeat: ev.startBeat - l.t0, held, durBeats: held < ev.held ? held + 0.4 : ev.durBeats });
    });
    return out;
  }
  const hasContent = (l) => (l.kind === "audio" ? layerLen(l) > 0.05 : clipEvents(l).length > 0);
  const rowCount = () => (layers.length ? Math.max(...layers.map((l) => l.row)) + 1 : 0);

  // مسار فاضي بالنص ما له معنى: نرقّم المسارات المستعملة من جديد بلا فراغات،
  // وإعدادات خلاط كل مسار تنتقل معه
  function compactRows() {
    const used = [...new Set(layers.map((l) => l.row))].sort((a, b) => a - b);
    tracks = used.map((r) => tracks[r] || newTrack());
    layers.forEach((l) => (l.row = used.indexOf(l.row)));
  }
  function ensureTracks() {
    const n = rowCount();
    while (tracks.length < n) tracks.push(newTrack());
    tracks.length = n;
  }

  // sec = رقم: الخط يمشي مع التشغيل/التسجيل. null: يرجع لمكان المؤشر الثابت
  function setPlayhead(sec) {
    const idle = sec == null;
    playhead.hidden = !studioActive();
    playhead.classList.toggle("idle", idle);
    playhead.style.left = Math.min(Math.max(0, idle ? cursor : sec), timelineSeconds) * pxPerSec + "px";
    if (idle) videoShow(cursor);
    else {
      if (timecodeEl) timecodeEl.textContent = timecode(sec);
      videoFollow(sec);
    }
  }

  const toolEdit = document.getElementById("beepToolEdit");
  const toolQuant = document.getElementById("beepToolQuant");
  function updateTools() {
    tools.querySelectorAll("button").forEach((b) => (b.disabled = !selected));
    // التحرير نغمةً نغمة والضبط على الشبكة للنغمات والإيقاعات فقط، لا للصوت المسجّل
    if (selected?.kind === "audio") {
      toolEdit.disabled = true;
      toolQuant.disabled = true;
    }
    if (selected?.kind === "drums") toolQuant.disabled = true; // الإيقاع على الشبكة أصلاً
    const mute = document.getElementById("beepToolMute");
    mute.textContent = selected?.muted ? mute.dataset.unmute : mute.dataset.mute;
  }

  function select(l) {
    selected = l;
    board.querySelectorAll(".beep-clip").forEach((c) => {
      const on = layers[+c.dataset.i] === l;
      c.classList.toggle("selected", on);
      c.setAttribute("aria-pressed", String(on));
    });
    updateTools();
  }

  // ذروة الموجة لكل جزء صغير من التسجيل — تُحسب مرة لكل تسجيل وتُرسم بأي تكبير
  const peaksCache = new WeakMap();
  function peaksOf(buffer) {
    let p = peaksCache.get(buffer);
    if (p) return p;
    const data = buffer.getChannelData(0);
    const per = Math.max(1, Math.floor(buffer.sampleRate / 200)); // ٢٠٠ قيمة بالثانية
    p = new Float32Array(Math.ceil(data.length / per));
    for (let i = 0; i < p.length; i++) {
      let m = 0;
      for (let j = i * per, end = Math.min(data.length, j + per); j < end; j++) m = Math.max(m, Math.abs(data[j]));
      p[i] = m;
    }
    peaksCache.set(buffer, p);
    return p;
  }

  function drawClip(canvas, l, w, h) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.round(h * dpr);
    const g = canvas.getContext("2d");
    g.scale(dpr, dpr);
    g.fillStyle = "rgba(255,255,255,0.92)";
    if (l.kind === "audio") {
      const peaks = peaksOf(l.buffer);
      const top = 12;
      const mid = top + (h - top) / 2;
      for (let x = 0; x < w; x++) {
        const i = Math.floor((l.t0 + x / pxPerSec) * 200);
        const a = Math.min(1, (peaks[i] || 0) * 1.4) * ((h - top) / 2 - 1);
        g.fillRect(x, mid - a, 1, Math.max(1, a * 2));
      }
      return;
    }
    const evs = clipEvents(l);
    if (l.kind === "drums") {
      const lanesOf = DRUM_KITS[l.kit];
      const laneH = (h - 12) / lanesOf.length;
      evs.forEach((ev) => {
        const lane = lanesOf.indexOf(ev.drum);
        g.globalAlpha = 0.45 + 0.55 * (ev.velocity / 127);
        g.fillRect(ev.startBeat * pxPerSec, 12 + lane * laneH + 1, Math.max(2, pxPerSec * 0.06), Math.max(2, laneH - 2));
      });
      g.globalAlpha = 1;
      return;
    }
    const ms = evs.map((ev) => 69 + 12 * Math.log2(ev.freq / 440));
    const lo = Math.min(...ms);
    const hi = Math.max(...ms);
    evs.forEach((ev, i) => {
      const y = hi === lo ? h / 2 - 1.5 : 12 + (1 - (ms[i] - lo) / (hi - lo)) * (h - 18); // النغمة الأحد أعلى
      g.globalAlpha = 0.5 + 0.5 * Math.min(1, (ev.velocity || 96) / 110);
      g.fillRect(ev.startBeat * pxPerSec, y, Math.max(2, ev.held * pxPerSec), 3);
    });
    g.globalAlpha = 1;
  }

  const focusLayer = (l) => board.querySelector('[data-i="' + layers.indexOf(l) + '"]')?.focus({ preventScroll: true }); // بلا قفز للصفحة على الجوال

  /* تراجع/إعادة: لقطة من الطبقات والمسارات والسرعة قبل كل تعديل. مصفوفات النغمات
     تُشارَك بين اللقطات: أي تعديل على نغمات مقطع ينسخ مصفوفته أولاً (لا يعدّل
     القديمة)، فاللقطات القديمة تبقى سليمة. */
  const HISTORY_MAX = 60;
  let history = [];
  let future = [];
  let clipboard = null;
  const snapshot = () => ({ layers: layers.map((l) => ({ ...l })), tracks: tracks.map(cloneTrack), bpm, meter, markers: [...markers] });
  function pushHistory(before = snapshot()) {
    history.push(before);
    if (history.length > HISTORY_MAX) history.shift();
    future = [];
  }
  function restoreFrom(from, to) {
    if (!from.length) return;
    to.push(snapshot());
    const s = from.pop();
    layers = s.layers;
    tracks = s.tracks;
    bpm = s.bpm;
    meter = s.meter;
    markers = s.markers;
    paintProject();
    selected = null;
    closeEditor();
    renderLayers();
  }
  const undo = () => restoreFrom(history, future);
  const redo = () => restoreFrom(future, history);

  function toggleMute() {
    if (!selected) return;
    pushHistory();
    selected.muted = !selected.muted;
    renderLayers();
  }

  const cloneLayer = (l) => ({ ...l, events: l.events?.map((e) => ({ ...e })), lastTap: 0 });
  function copyToClipboard() {
    if (selected) clipboard = cloneLayer(selected);
  }
  function cutSelected() {
    copyToClipboard();
    deleteSelected();
  }
  // اللصق عند المؤشر الأبيض (مثل باند لاب: عند الـplayhead)
  function pasteClipboard() {
    if (!clipboard) return;
    if (layers.length >= MAX_LAYERS) return showToast(recTake.dataset.max);
    pushHistory();
    const c = { ...cloneLayer(clipboard), offset: cursor };
    layers.push(c);
    selected = c;
    compactRows();
    renderLayers();
    focusLayer(c);
  }

  function deleteSelected() {
    if (!selected) return;
    pushHistory();
    layers.splice(layers.indexOf(selected), 1);
    selected = null;
    compactRows();
    if (!layers.length) stopTake();
    renderLayers();
  }

  function copySelected() {
    if (!selected) return;
    if (layers.length >= MAX_LAYERS) return showToast(recTake.dataset.max);
    pushHistory();
    const copy = { ...cloneLayer(selected), offset: selected.offset + layerLen(selected) };
    layers.splice(layers.indexOf(selected) + 1, 0, copy);
    selected = copy;
    renderLayers();
  }

  // قص المقطع المحدد عند المؤشر الأبيض. القص غير مدمّر: نقسم "نافذة" المقطع [t0,t1]
  // إلى نافذتين على نفس المحتوى — فيبقى تطويل الحافة لاحقاً يرجّع كل شي. نغمة تعبر
  // نقطة القص تُقصّر يسارها ولا تُكمَل يمينها. ponytail: مثل قص MIDI بسيط
  function splitSelected() {
    const l = selected;
    if (!l) return;
    const t = l.t0 + (cursor - l.offset); // نقطة القص بزمن المقطع الأصلي
    const a = { ...l, t1: t };
    const b = { ...l, t0: t, offset: l.offset + (t - l.t0), lastTap: 0 };
    const inside = t > l.t0 + 0.05 && t < l.t1 - 0.05;
    if (!inside || !hasContent(a) || !hasContent(b)) return showToast(document.getElementById("beepToolSplit").dataset.cut);
    pushHistory();
    layers.splice(layers.indexOf(l), 1, a, b);
    selected = b;
    renderLayers();
  }

  // ضبط الإيقاع (Quantize): بداية كل نغمة تنتقل لأقرب خط بالشبكة على الجدول نفسه
  function quantizeSelected() {
    const l = selected;
    if (!l) return;
    if (l.kind !== "notes") return showToast(toolQuant.dataset.audio);
    const step = gridStep() || beatSec() / 4;
    pushHistory();
    l.events = l.events.map((e) => {
      if (e.startBeat < l.t0 || e.startBeat >= l.t1) return { ...e };
      const abs = l.offset + e.startBeat - l.t0;
      return { ...e, startBeat: Math.max(l.t0, Math.round(abs / step) * step - l.offset + l.t0) };
    });
    renderLayers();
    showToast(toolQuant.dataset.done);
  }

  /* تقصير/تطويل المقطع بسحب حافته (بلا قص): الحافة اليمنى تغيّر t1، واليسرى تغيّر
     t0 وتحرّك offset بنفس المقدار فيبقى المحتوى مكانه. غير مدمّر: التطويل يرجّع
     النغمات المخفية، لحد طول التسجيل الأصلي. الحافة تقع على الشبكة. */
  const TRIM_MIN = 0.1;
  function startTrim(e, handle, clip, l, side) {
    if (e.button) return;
    e.preventDefault();
    e.stopPropagation(); // لا يبدأ سحب المقطع كله
    handle.setPointerCapture(e.pointerId);
    select(l);
    clip.classList.add("dragging");
    const x0 = e.clientX;
    const before = snapshot();
    const t0a = l.t0;
    const t1a = l.t1;
    const offa = l.offset;
    const canvas = clip.querySelector("canvas");
    const zoom0 = zoomOf(); // التكبير ثابت طول السحبة: قراءة هندسة وحدة بدل وحدة لكل حركة
    const move = (ev) => {
      const d = (ev.clientX - x0) / zoom0 / pxPerSec;
      if (side === "right") {
        const endAbs = snap(offa + (t1a - t0a) + d);
        l.t1 = Math.min(l.end, Math.max(l.t0 + TRIM_MIN, endAbs - offa + t0a));
      } else {
        const lowest = Math.max(0, t0a - offa); // لا يتجاوز بداية المحتوى ولا بداية الجدول
        const startAbs = snap(offa + d);
        const nt0 = Math.min(l.t1 - TRIM_MIN, Math.max(lowest, t0a + (startAbs - offa)));
        l.offset = offa + (nt0 - t0a);
        l.t0 = nt0;
      }
      const w = Math.max(8, layerLen(l) * pxPerSec);
      clip.style.left = l.offset * pxPerSec + "px";
      clip.style.width = w + "px";
      drawClip(canvas, l, w, ROW_H - 6);
    };
    const up = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
      if (l.t0 !== t0a || l.t1 !== t1a) pushHistory(before);
      renderLayers();
      focusLayer(l);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  }

  function buildClip(l, i) {
    const clip = document.createElement("div");
    clip.className = "beep-clip" + (l.muted ? " muted" : "") + (l === selected ? " selected" : "") + (l.kind !== "notes" ? " " + l.kind : "");
    clip.dataset.i = String(i);
    clip.style.setProperty("--h", String(l.kind === "drums" ? 28 : l.kind === "audio" ? 200 : (i * 53 + 150) % 360));
    clip.tabIndex = 0;
    clip.setAttribute("role", "button");
    clip.setAttribute("aria-pressed", String(l === selected));
    clip.title = clipLabel(l);
    clip.setAttribute("aria-label", recTake.dataset.layer + " " + (i + 1) + " · " + clipLabel(l));
    const w = Math.max(8, layerLen(l) * pxPerSec);
    clip.style.left = l.offset * pxPerSec + "px";
    clip.style.top = l.row * ROW_H + 3 + "px";
    clip.style.width = w + "px";
    clip.style.height = ROW_H - 6 + "px";
    const label = document.createElement("span");
    label.className = "beep-clip-label";
    label.textContent = clipIcon(l); // الرمز فقط: الاسم لا يتسع بمقطع قصير
    const canvas = document.createElement("canvas");
    clip.append(canvas, label);
    ["left", "right"].forEach((side) => {
      const handle = document.createElement("div");
      handle.className = "beep-handle " + side;
      handle.addEventListener("pointerdown", (e) => startTrim(e, handle, clip, l, side));
      clip.append(handle);
    });
    drawClip(canvas, l, w, ROW_H - 6);

    clip.addEventListener("pointerdown", (e) => {
      if (e.button) return;
      e.preventDefault();
      clip.setPointerCapture(e.pointerId);
      select(l);
      // مثل باند لاب: الضغط على المقطع نفسه يضع الخط الأبيض تحت الماوس بالضبط
      // (قبل كان يحدّد فقط ويبقى الخط بعيداً) — فالقص بـS يصير عند مكان النقر
      const zoom0 = zoomOf(); // ثابت طول السحبة (موضع اللوحة نفسه يُقرأ حياً لأنه يتغيّر مع التمرير)
      cursor = snap((e.clientX - board.getBoundingClientRect().left) / zoom0 / pxPerSec);
      setPlayhead(null);
      clip.classList.add("dragging");
      const x0 = e.clientX;
      const y0 = e.clientY;
      const off0 = l.offset;
      const row0 = l.row;
      const before = snapshot(); // للتراجع
      const maxRow = Math.min(rowCount(), MAX_TRACKS - 1); // آخر خانة = مسار جديد تحت الكل
      let moved = false;
      const move = (ev) => {
        l.offset = snap(off0 + (ev.clientX - x0) / zoom0 / pxPerSec);
        l.row = Math.min(maxRow, Math.max(0, row0 + Math.round((ev.clientY - y0) / zoom0 / ROW_H)));
        moved = moved || l.offset !== off0 || l.row !== row0;
        clip.style.left = l.offset * pxPerSec + "px";
        clip.style.top = l.row * ROW_H + 3 + "px";
      };
      const up = () => {
        clip.removeEventListener("pointermove", move);
        clip.removeEventListener("pointerup", up);
        clip.removeEventListener("pointercancel", up);
        if (moved) {
          compactRows();
          pushHistory(before);
        } else {
          // نقرتان سريعتان بلا سحب = افتح محرّر النغمات (مثل باند لاب). dblclick
          // الأصلي ما يصلح: renderLayers تستبدل العنصر بين النقرتين فلا يوصله الحدث
          const now = performance.now();
          if (now - (l.lastTap || 0) < 350) {
            l.lastTap = 0;
            renderLayers();
            return openEditor(l);
          }
          l.lastTap = now;
        }
        renderLayers(); // يعيد حساب طول الجدول بعد الإزاحة
        focusLayer(l); // العنصر استُبدل: نرجّع التركيز عشان Delete والأسهم تشتغل بعد النقر
      };
      clip.addEventListener("pointermove", move);
      clip.addEventListener("pointerup", up);
      clip.addEventListener("pointercancel", up);
    });

    clip.addEventListener("focus", () => select(l)); // التنقل بـTab يحدّد الطبقة، فDelete ما يحذف غيرها
    clip.addEventListener("keydown", (e) => {
      const step = e.shiftKey ? barSec() : gridStep() || 0.1;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        pushHistory();
        l.offset = snap(l.offset + (e.key === "ArrowRight" ? 1 : -1) * step);
      } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        pushHistory();
        l.row = Math.min(rowCount(), MAX_TRACKS - 1, Math.max(0, l.row + (e.key === "ArrowDown" ? 1 : -1)));
        compactRows();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        return deleteSelected();
      } else {
        return;
      }
      e.preventDefault();
      select(l);
      renderLayers();
      focusLayer(l);
    });
    return clip;
  }

  function renderLayers() {
    ensureTracks();
    recTake.hidden = !studioActive();
    if (!rec) {
      recToggle.textContent = idleLabel();
      const total = Math.max(0, ...layers.map(layerEnd));
      recTime.textContent = layers.length ? clock(total) + " · " + layers.length + " ▤" : "";
    }

    const laneW = board.clientWidth;
    const bar = barSec();
    const total = Math.max(0, videoDur(), ...layers.map(layerEnd));
    // أربع مازورات على الأقل، ومازورة فاضية بعد الآخر (أو بعد نهاية الفيديو) للإسقاط والتسجيل بعده
    timelineSeconds = Math.max(4 * bar, Math.ceil((total + bar * 0.5) / bar) * bar + bar);
    pxPerSec = laneW > 0 ? laneW / timelineSeconds : 30; // مخفي (عرض صفر): نرسم عند ظهوره
    lanes.style.setProperty("--beat", pxPerSec * beatSec() + "px");
    lanes.style.setProperty("--bar", pxPerSec * bar + "px");
    board.style.setProperty("--rowh", ROW_H + "px");
    board.style.height = (rowCount() + 1) * ROW_H + "px"; // + مسار فاضي للإسقاط فيه

    // المسطرة: رقم كل مازورة (أو كل ٢ أو ٤ لو ضاقت المسافة)
    const barPx = pxPerSec * bar;
    const every = barPx < 18 ? 4 : barPx < 34 ? 2 : 1;
    const bars = Math.round(timelineSeconds / bar);
    const ticks = [];
    for (let k = 0; k < bars; k += every) {
      const tick = document.createElement("span");
      tick.className = "beep-tick";
      tick.style.left = k * barPx + "px";
      tick.textContent = String(k + 1);
      ticks.push(tick);
    }
    ruler.replaceChildren(...ticks);

    board.replaceChildren(...layers.map(buildClip), ...tracks.flatMap((tr, r) => (tr.auto ? [buildAutoLane(tr, r)] : [])));
    renderGutter();
    renderFilm();
    renderMarkers();
    renderMixer();
    updateTools();
    if (!playheadTimer && !rec) setPlayhead(null);
    if (edLayer) renderEditor();
    scheduleSave();
  }

  function renderGutter() {
    gutter.replaceChildren(
      ...tracks.map((tr, r) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "beep-gutter-row" + (tr.mute ? " muted" : "") + (tr.solo ? " solo" : "");
        b.style.height = ROW_H + "px";
        b.textContent = String(r + 1);
        b.title = recTake.dataset.track + " " + (r + 1);
        b.addEventListener("click", () => openStrip(r));
        return b;
      })
    );
  }

  /* تحريك المؤشر الأبيض بالسحب من أي مكان: اللوحة الفاضية، المسطرة، أو مقبضه
     الدائري. preventDefault يمنع المتصفح من تظليل النص أثناء السحب (كان يبدأ
     تحديد الأرقام وينفصل الخط عن الماوس لأن اللوحة كانت تسمع الضغطة فقط). */
  function scrub(e, captureEl, rectEl) {
    if (e.button) return;
    e.preventDefault();
    captureEl.setPointerCapture(e.pointerId);
    const zoom0 = zoomOf(); // موضع rectEl يبقى يُقرأ بكل حركة: الجدول يتمرّر أفقياً أثناء السحب
    const set = (ev) => {
      cursor = snap((ev.clientX - rectEl.getBoundingClientRect().left) / zoom0 / pxPerSec);
      setPlayhead(null);
    };
    set(e);
    const up = () => {
      captureEl.removeEventListener("pointermove", set);
      captureEl.removeEventListener("pointerup", up);
      captureEl.removeEventListener("pointercancel", up);
    };
    captureEl.addEventListener("pointermove", set);
    captureEl.addEventListener("pointerup", up);
    captureEl.addEventListener("pointercancel", up);
  }
  board.addEventListener("pointerdown", (e) => {
    if (e.target !== board) return;
    select(null);
    scrub(e, board, board);
  });
  ruler.addEventListener("pointerdown", (e) => scrub(e, ruler, ruler));
  document.getElementById("beepFilm")?.addEventListener("pointerdown", (e) => scrub(e, e.currentTarget, ruler));
  const knob = document.createElement("span");
  knob.className = "beep-playhead-knob";
  playhead.append(knob);
  knob.addEventListener("pointerdown", (e) => scrub(e, knob, lanes));

  [
    ["beepToolSplit", splitSelected],
    ["beepToolCopy", copySelected],
    ["beepToolMute", toggleMute],
    ["beepToolDelete", deleteSelected],
    ["beepToolEdit", () => openEditor(selected)],
    ["beepToolQuant", quantizeSelected],
  ].forEach(([id, fn]) =>
    document.getElementById(id).addEventListener("click", () => {
      fn();
      playClickSound();
    })
  );

  // تغيّر عرض الشاشة (تدوير الجوال): نعيد الرسم بالمقياس الجديد
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (layers.length) renderLayers();
      if (boardMode === "full") scrollToReach();
    }, 150);
  });

  /* ===== التسجيل والتشغيل =====
     التسجيل يبدأ عند الخط الأبيض: الطبقات الموجودة تُعزف من هناك معك، ولو
     "العدّ قبل التسجيل" مفعّل يسبقه مازورة نقرات. at = وقت الصوت اللي يقابل
     الخط الأبيض، وt0 نفس اللحظة بساعة performance (أوقات الضغط تُقاس بها). */
  let liveGraph = null; // سلاسل المسارات بالتشغيل الحي — الخلاط يعدّلها مباشرة
  function liveTarget() {
    liveGraph = studioTarget({ ctx: audioCtx, dry: masterInput, wet: delayNode, live: true });
    return liveGraph;
  }
  function dropLiveGraph(graph = liveGraph) {
    if (!graph) return;
    graph.chains.forEach((c) => {
      c.pan.disconnect();
      c.delay.disconnect();
    });
    graph.reverb.disconnect();
    if (graph === liveGraph) liveGraph = null;
  }

  async function startRec(kind = "notes") {
    if (layers.length >= MAX_LAYERS || rowCount() >= MAX_TRACKS) return showToast(recTake.dataset.max);
    if (playing) stopPlayback(); // مولّد المقطوعات ما يتزامن مع التسجيل
    await ensureContext();
    if (rec) return; // ضغطتين سريعتين
    stopTake();
    let mic = null;
    if (kind === "audio") {
      mic = await openMic();
      if (!mic || rec) return mic?.getTracks().forEach((t) => t.stop());
    }
    const from = cursor;
    const lead = countIn ? barSec() : 0;
    const at = audioCtx.currentTime + 0.12 + lead;
    const list = sounding();
    if (list.length) scheduleLayers(liveTarget(), list, at, from);
    transport = { at, from };
    for (let k = 0; k < meter && lead; k++) metroClick(at - lead + k * beatSec(), k === 0); // العدّ
    if (metroOn) startMetronome(at, from);
    videoStart(at, from);
    rec = {
      kind,
      t0: performance.now() + (at - audioCtx.currentTime) * 1000,
      at,
      from,
      open: new Map(),
      events: [],
      timer: null,
      instrument: currentInstrument,
      trim: kind === "notes" && !lead && !metroOn && !layers.length,
      mic,
    };
    if (mic) startMicCapture(rec);
    const btn = kind === "audio" ? micBtn : recToggle;
    btn.textContent = btn.dataset.stop;
    btn.classList.add("recording");
    (kind === "audio" ? recToggle : micBtn).disabled = true;
    recTime.textContent = lead ? "" : "0:00";
    rec.timer = setInterval(() => {
      const sec = (performance.now() - rec.t0) / 1000;
      // قبل البداية: عدّ تنازلي بالضربات الباقية
      recTime.textContent = sec < 0 ? "⏱️ " + Math.ceil(-sec / beatSec() - 0.01) : clock(sec);
      if (layers.length) setPlayhead(from + Math.max(0, sec)); // الخط يمشي فوق الطبقات اللي تُعزف معك
      if (sec >= MAX_TAKE_SECONDS) stopRec();
    }, 100);
  }

  function stopRec() {
    const r = rec;
    if (!r) return;
    clearInterval(r.timer);
    [...r.open.keys()].forEach(noteEnd); // نغمات ممسوكة أو معلّقة بالدواسة لحظة الإيقاف
    rec = null;
    stopTake();
    const btn = r.kind === "audio" ? micBtn : recToggle;
    btn.classList.remove("recording");
    micBtn.textContent = micBtn.dataset.label;
    recToggle.disabled = false;
    micBtn.disabled = false;
    if (r.kind === "audio") return finishAudioTake(r);
    // نغمات العدّ (قبل البداية بأكثر من لحظة) ما تُحسب، والقريبة تنضبط على البداية
    const events = r.events.filter((e) => e.startBeat > -0.15);
    events.forEach((e) => (e.startBeat = Math.max(0, e.startBeat)));
    if (!events.length) {
      renderLayers();
      showToast(recToggle.dataset.empty);
      return;
    }
    // أول تسجيل عفوي يبدأ بأول نغمة (نقصّ الصمت)؛ الباقي يحافظ على توقيته مع الجدول
    const first = r.trim ? Math.min(...events.map((e) => e.startBeat)) : 0;
    events.forEach((e) => (e.startBeat -= first));
    const end = Math.max(...events.map((e) => e.startBeat + e.durBeats));
    pushHistory();
    layers.push({ kind: "notes", events, instrument: r.instrument, muted: false, end, t0: 0, t1: end, offset: r.from, row: rowCount() }); // مسار جديد تحت الباقي
    renderLayers();
  }

  /* ===== تسجيل صوتك (ميكروفون) كمسار =====
     نلتقط العيّنات الخام بساعة الصوت نفسها (لا MediaRecorder) عشان التسجيل يقع
     على الجدول بدقة مع اللي تسمعه. نطرح تأخير السماعة والميكروفون التقريبي:
     أنت تعزف على ما تسمعه متأخراً، والميكروفون يلتقطك متأخراً. التسجيل نقي بلا
     إلغاء صدى أو تنقية ضجيج (تشوّه الآلات). يُفضَّل استخدام السماعات. */
  async function openMic() {
    if (!navigator.mediaDevices?.getUserMedia) {
      showToast(micBtn.dataset.failed);
      return null;
    }
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    } catch {
      showToast(micBtn.dataset.denied);
      return null;
    }
  }
  function startMicCapture(r) {
    const source = audioCtx.createMediaStreamSource(r.mic);
    const proc = audioCtx.createScriptProcessor(4096, 1, 1);
    const silent = audioCtx.createGain();
    silent.gain.value = 0;
    const latency = (audioCtx.baseLatency || 0) + (audioCtx.outputLatency || 0);
    r.chunks = [];
    proc.onaudioprocess = (e) => {
      const data = e.inputBuffer.getChannelData(0);
      r.chunks.push({ t: audioCtx.currentTime - data.length / audioCtx.sampleRate - latency, data: new Float32Array(data) });
    };
    source.connect(proc).connect(silent).connect(audioCtx.destination); // المعالج ما يشتغل بلا وجهة
    r.capture = { source, proc, silent };
  }
  function finishAudioTake(r) {
    r.capture.proc.onaudioprocess = null;
    r.capture.source.disconnect();
    r.capture.proc.disconnect();
    r.mic.getTracks().forEach((t) => t.stop());
    const sr = audioCtx.sampleRate;
    const chunks = r.chunks;
    if (!chunks.length) return showToast(micBtn.dataset.silent);
    const all = new Float32Array(chunks.reduce((n, c) => n + c.data.length, 0));
    let pos = 0;
    chunks.forEach((c) => {
      all.set(c.data, pos);
      pos += c.data.length;
    });
    const first = chunks[0].t;
    const skip = Math.max(0, Math.round((r.at - first) * sr)); // العدّ وما قبله ما يدخل التسجيل
    const data = all.subarray(skip);
    addAudioLayer(data, sr, r.from + Math.max(0, first - r.at), micBtn.dataset.label);
  }

  function addAudioLayer(data, sampleRate, offset, name) {
    let peak = 0;
    for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
    if (data.length < sampleRate * 0.1 || peak < 0.003) return showToast(micBtn.dataset.silent);
    if (layers.length >= MAX_LAYERS || rowCount() >= MAX_TRACKS) return showToast(recTake.dataset.max);
    const buffer = new AudioBuffer({ length: data.length, numberOfChannels: 1, sampleRate });
    buffer.copyToChannel(data, 0);
    pushHistory();
    layers.push({ kind: "audio", buffer, name, muted: false, end: buffer.duration, t0: 0, t1: buffer.duration, offset, row: rowCount() });
    renderLayers();
  }

  // ملف صوتي من الجهاز → مسار جديد عند الخط الأبيض (أحادي، حتى ١٠ دقائق)
  const audioFile = document.getElementById("beepAudioFile");
  audioFile?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      await ensureContext();
      const decoded = await audioCtx.decodeAudioData(await file.arrayBuffer());
      const len = Math.min(decoded.length, decoded.sampleRate * 600);
      const mono = new Float32Array(len);
      for (let c = 0; c < decoded.numberOfChannels; c++) {
        const ch = decoded.getChannelData(c);
        for (let i = 0; i < len; i++) mono[i] += ch[i] / decoded.numberOfChannels;
      }
      addAudioLayer(mono, decoded.sampleRate, cursor, "📁 " + file.name.replace(/\.[^.]+$/, ""));
      playSound("success");
    } catch {
      showToast(micBtn.dataset.failed);
    }
  });

  function stopTake(soft = false) {
    takeTimers.forEach(clearTimeout);
    takeTimers = [];
    clearInterval(playheadTimer);
    playheadTimer = null;
    stopMetronome();
    stopDrumPreview();
    stopSfxPreview();
    videoStop();
    setPlayhead(null);
    if (soft) {
      // نهاية طبيعية: نترك ذيل الرنين والصدى يكمل ثم نفك السلاسل
      const graph = liveGraph;
      liveGraph = null;
      setTimeout(() => dropLiveGraph(graph), 3000);
    } else {
      activeOscillators.forEach((osc) => {
        try {
          osc.stop();
        } catch {
          // خلص وقته أصلاً
        }
      });
      activeOscillators = [];
      dropLiveGraph();
    }
    playBox?.querySelectorAll(".down").forEach((k) => !downCount.has(+k.dataset.midi) && k.classList.remove("down"));
    if (recPlay) recPlay.textContent = recPlay.dataset.play;
  }

  // fromStart=false: يبدأ من المؤشر الأبيض (مثل Space بباند لاب)، وإن كان المؤشر
  // عند النهاية أو بعدها يبدأ من الصفر. pos: موضع محدد (إعادة التشغيل بعد كتم مسار).
  // ponytail: نغمة بدأت قبل نقطة البداية ولسا ترنّ لا تُعزف (لا نقص جزئي للنغمة)
  async function playTake(fromStart = false, pos = null) {
    const list = sounding();
    if (!list.length && !videoReady()) return showToast(recTake.dataset.silent);
    if (playing) stopPlayback();
    await ensureContext();
    await ensureSamples(list.map((l) => l.instrument).filter(Boolean));
    stopTake();
    // مع فيديو: التشغيل يكمل لنهاية المشهد حتى لو الموسيقى أقصر
    const total = Math.max(0, ...list.map(layerEnd), videoReady() ? videoDur() : 0);
    const from = pos ?? (fromStart || cursor >= total - 0.05 ? 0 : cursor);
    const start = audioCtx.currentTime + 0.1;
    transport = { at: start, from };
    scheduleLayers(liveTarget(), list, start, from);
    if (metroOn) startMetronome(start, from);
    videoStart(start, from);
    // المفاتيح تنضغط وتنرفع مع الصوت (نفس شكل العزف الحي)
    list.forEach((l) => {
      if (l.kind !== "notes") return;
      clipEvents(l).forEach((ev) => {
        const at = ev.startBeat + l.offset - from;
        if (at < 0) return;
        const key = () => playBox?.querySelector(`[data-midi="${evMidi(ev)}"]`);
        takeTimers.push(
          setTimeout(() => key()?.classList.add("down"), 100 + at * 1000),
          setTimeout(() => !downCount.has(evMidi(ev)) && key()?.classList.remove("down"), 100 + (at + ev.held) * 1000)
        );
      });
    });
    recPlay.textContent = recPlay.dataset.stop;
    takeTimers.push(setTimeout(() => stopTake(true), 200 + (total - from) * 1000));
    playheadTimer = setInterval(() => setPlayhead(from + audioCtx.currentTime - start), 50);
  }

  // كتم/منفرد أثناء التشغيل: نكمل من نفس الموضع بالتشكيلة الجديدة
  function restartTake() {
    if (!takeTimers.length || rec || !transport) return;
    playTake(false, Math.max(0, transport.from + audioCtx.currentTime - transport.at));
  }

  async function exportTake(btn, make, ext) {
    if (!sounding().length) return showToast(recTake.dataset.silent);
    const original = btn.textContent;
    btn.disabled = true;
    if (btn.dataset.working) btn.textContent = btn.dataset.working;
    try {
      downloadBlob(await make(mixPiece()), `hakolah-studio-${Date.now()}.${ext}`);
    } catch {
      showToast(btn.dataset.failed || "");
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
    playClickSound();
  }

  /* ===== تصدير المسارات منفصلة (Stems) =====
     ملف ZIP فيه المزيج كاملاً + ملف WAV لكل مسار بمؤثراته وأتمتته. كل الملفات
     تبدأ من الصفر وبنفس الطول بالضبط، فتنزل ببرنامج المونتاج (Premiere، Resolve،
     After Effects…) فوق بعض وتتطابق بلا أي محاذاة يدوية. المسارات بلا ماستر (هو
     للمزيج فقط)، والمسار المكتوم أو المقاطع المكتومة لا تُصدَّر. */
  const MAX_STEM_SECONDS = 1800; // مجموع الثواني (المسارات × الطول) — حماية ذاكرة الجوال
  async function exportStems(btn) {
    const list = layers.filter((l) => !l.muted && !tracks[l.row]?.mute);
    if (!list.length) return showToast(recTake.dataset.silent);
    const rows = [...new Set(list.map((l) => l.row))].sort((a, b) => a - b);
    const total = Math.max(...list.map(layerEnd));
    if (total * (rows.length + 1) > MAX_STEM_SECONDS) return showToast(btn.dataset.toolong);
    if (takeTimers.length) stopTake();
    const original = btn.textContent;
    btn.disabled = true;
    const trackList = tracks.map((t) => ({ ...cloneTrack(t), solo: false }));
    const meta = { seed: "stems", bpm: 60, meter, totalBeats: total };
    const files = [];
    const used = new Set();
    try {
      for (let i = 0; i <= rows.length; i++) {
        btn.textContent = btn.dataset.working + " " + i + "/" + rows.length;
        const mix = i === 0;
        const own = mix ? list : list.filter((l) => l.row === rows[i - 1]);
        const piece = { layers: own, tracks: trackList, meta, master: mix ? masterPreset : "none" };
        const wav = new Uint8Array(await (await renderPieceToWav(piece)).arrayBuffer());
        // اسم يوصف المسار بالإنجليزي (برامج المونتاج وأنظمة الملفات تتعامل معه بلا مشاكل)
        let name = mix ? "00-full-mix" : String(i).padStart(2, "0") + "-" + [...new Set(own.map(stemSlug))].join("+");
        while (used.has(name)) name += "-b";
        used.add(name);
        files.push([name + ".wav", wav]);
      }
      downloadBlob(zipStore(files), `hakolah-stems-${Date.now()}.zip`);
      playSound("success");
    } catch {
      showToast(btn.dataset.failed);
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  }
  const stemSlug = (l) => (l.kind === "drums" ? "drums-" + l.rhythm : l.sfx ? "sfx-" + l.sfx.id : l.kind === "audio" ? "audio" : l.instrument);

  /* ZIP بلا ضغط (Stored) — WAV ما ينضغط بشكل يُذكر أصلاً، وهكذا ما نحتاج مكتبة.
     البنية: رأس محلي + بيانات لكل ملف، ثم الفهرس المركزي، ثم سجل النهاية. */
  let crcTable = null;
  function crc32(bytes) {
    if (!crcTable) {
      crcTable = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        crcTable[n] = c >>> 0;
      }
    }
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }
  function zipStore(files) {
    const parts = [];
    const central = [];
    let offset = 0;
    const header = (size) => {
      const view = new DataView(new ArrayBuffer(size));
      return view;
    };
    files.forEach(([name, data]) => {
      const nameBytes = new TextEncoder().encode(name);
      const crc = crc32(data);
      const local = header(30);
      local.setUint32(0, 0x04034b50, true);
      local.setUint16(4, 20, true);
      local.setUint16(6, 0x0800, true); // الأسماء UTF-8
      local.setUint16(8, 0, true); // بلا ضغط
      local.setUint16(12, 0x21, true); // التاريخ ١٩٨٠-٠١-٠١
      local.setUint32(14, crc, true);
      local.setUint32(18, data.length, true);
      local.setUint32(22, data.length, true);
      local.setUint16(26, nameBytes.length, true);
      parts.push(local, nameBytes, data);
      const entry = header(46);
      entry.setUint32(0, 0x02014b50, true);
      entry.setUint16(4, 20, true);
      entry.setUint16(6, 20, true);
      entry.setUint16(8, 0x0800, true);
      entry.setUint16(14, 0x21, true);
      entry.setUint32(16, crc, true);
      entry.setUint32(20, data.length, true);
      entry.setUint32(24, data.length, true);
      entry.setUint16(28, nameBytes.length, true);
      entry.setUint32(42, offset, true);
      central.push(entry, nameBytes);
      offset += 30 + nameBytes.length + data.length;
    });
    const centralSize = central.reduce((n, p) => n + p.byteLength, 0);
    const end = header(22);
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, centralSize, true);
    end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, end], { type: "application/zip" });
  }

  /* ===== MIDI متعدد المسارات (النوع ١) =====
     مسار للسرعة والميزان، ثم مسار لكل (مسار بالجدول × آلة) ببرنامج General MIDI
     المقابل لآلته، والإيقاع على القناة ١٠ (قناة الطبول القياسية). أرباع الأصوات
     تُكتب Pitch Bend قبل النغمة (مدى ±٢ نصف درجة الافتراضي) — دقيق للحن المفرد،
     وبالأوتار المتزامنة يأخذ الكل ربع الصوت نفسه (حد معروف بـMIDI ١.٠). */
  const GM_PROGRAM = {
    piano: 0, upright: 0, felt: 0, epiano: 4, harpsichord: 6, celesta: 8, glockenspiel: 9, musicbox: 10, vibraphone: 11, marimba: 12,
    xylophone: 13, bell: 14, santoor: 15, organ: 19, accordion: 21, harmonium: 20, harmonica: 22, melodica: 22, guitar: 24, guitar_ac: 25, guitar_el: 27, ebass: 33,
    doublebass: 32, synthbass: 38, violin: 40, cello: 42, harp: 46, strings: 48, choir: 52, trumpet: 56,
    trombone: 57, tuba: 58, horn: 60, sax: 65, oboe: 68, bassoon: 70, clarinet: 71, flute: 73, recorder: 74, nay: 77, chiptune: 80,
    synth: 81, banjo: 105, oud: 106, qanun: 107, kalimba: 108, steelpan: 114, custom: 0,
  };
  function studioToMidi() {
    const PPQ = 480;
    const tick = (sec) => Math.max(0, Math.round(((sec * bpm) / 60) * PPQ));
    const vlq = (out, value) => {
      const stack = [value & 0x7f];
      for (let v = value >> 7; v > 0; v >>= 7) stack.unshift((v & 0x7f) | 0x80);
      out.push(...stack);
    };
    const chunk = (bytes) => [0x4d, 0x54, 0x72, 0x6b, (bytes.length >>> 24) & 0xff, (bytes.length >> 16) & 0xff, (bytes.length >> 8) & 0xff, bytes.length & 0xff, ...bytes];
    const text = (out, type, str) => {
      const b = [...str].map((ch) => (ch.charCodeAt(0) < 128 ? ch.charCodeAt(0) : 63));
      vlq(out, 0);
      out.push(0xff, type);
      vlq(out, b.length);
      out.push(...b);
    };

    const usPerBeat = Math.round(60000000 / bpm);
    const conductor = [];
    text(conductor, 0x03, "Hakolah Studio");
    vlq(conductor, 0);
    conductor.push(0xff, 0x51, 0x03, (usPerBeat >> 16) & 0xff, (usPerBeat >> 8) & 0xff, usPerBeat & 0xff);
    vlq(conductor, 0);
    conductor.push(0xff, 0x58, 0x04, meter, 2, 24, 8);
    vlq(conductor, 0);
    conductor.push(0xff, 0x2f, 0x00);

    const groups = new Map();
    sounding().forEach((l) => {
      if (l.kind === "audio") return;
      const key = l.row + "|" + (l.kind === "drums" ? "drums" : l.instrument);
      if (!groups.has(key)) groups.set(key, { drums: l.kind === "drums", instrument: l.instrument, row: l.row, events: [] });
      clipEvents(l).forEach((e) => groups.get(key).events.push({ ...e, abs: l.offset + e.startBeat }));
    });

    const trackChunks = [];
    let nextChannel = 0;
    [...groups.values()]
      .sort((a, b) => a.row - b.row)
      .forEach((g) => {
        let channel = 9;
        if (!g.drums) {
          if (nextChannel === 9) nextChannel++;
          channel = nextChannel % 16;
          nextChannel++;
        }
        const points = [];
        g.events.forEach((e) => {
          const note = g.drums ? GM_DRUM[e.drum] : evMidi(e);
          if (note == null || note < 0 || note > 127) return;
          const velocity = clamp(Math.round(e.velocity || gainVel(e.gain)), 1, 127);
          points.push({ t: tick(e.abs), on: true, note, velocity, cents: g.drums ? 0 : evCents(e) });
          points.push({ t: tick(e.abs + (g.drums ? 0.1 : e.held || e.durBeats)), on: false, note, velocity: 0 });
        });
        points.sort((a, b) => a.t - b.t || Number(a.on) - Number(b.on));
        const bytes = [];
        text(bytes, 0x03, g.drums ? "Drums" : g.instrument);
        if (!g.drums) {
          vlq(bytes, 0);
          bytes.push(0xc0 | channel, GM_PROGRAM[g.instrument] ?? 0);
        }
        let prev = 0;
        let bend = 0;
        points.forEach((p) => {
          if (p.on && p.cents !== bend) {
            const value = clamp(8192 + Math.round((p.cents / 200) * 8192), 0, 16383);
            vlq(bytes, p.t - prev);
            prev = p.t;
            bytes.push(0xe0 | channel, value & 0x7f, (value >> 7) & 0x7f);
            bend = p.cents;
          }
          vlq(bytes, p.t - prev);
          prev = p.t;
          bytes.push((p.on ? 0x90 : 0x80) | channel, p.note, p.velocity);
        });
        vlq(bytes, 0);
        bytes.push(0xff, 0x2f, 0x00);
        trackChunks.push(chunk(bytes));
      });

    const ntrks = 1 + trackChunks.length;
    const header = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, (ntrks >> 8) & 0xff, ntrks & 0xff, (PPQ >> 8) & 0xff, PPQ & 0xff];
    return new Blob([new Uint8Array(header), new Uint8Array(chunk(conductor)), ...trackChunks.map((c) => new Uint8Array(c))], { type: "audio/midi" });
  }

  /* ===== الحفظ التلقائي والمشاركة =====
     المشروع (الطبقات والمسارات والسرعة، والتسجيلات الصوتية نفسها) يُحفظ بالمتصفح
     (IndexedDB) بعد كل تعديل، ويرجع لما تفتح الصفحة مرة ثانية. رابط المشاركة يضغط
     المشروع (بلا التسجيلات الصوتية — كبيرة على رابط) بداخل الرابط نفسه بعد #،
     فما يمر على أي خادم: اللي يفتحه يكمل عليه ويشاركه من جديد. */
  let saveTimer = null;
  let loadingProject = true; // لا نحفظ مشروعاً فاضياً فوق المحفوظ قبل ما نقرأه
  function scheduleSave() {
    if (loadingProject) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveProject, 700);
  }
  function serializeProject(withAudio) {
    return {
      v: 1,
      bpm,
      meter,
      markers,
      fps,
      video: videoMeta,
      tracks: tracks.map(cloneTrack),
      layers: layers
        // المؤثرات تُشارك بإعداداتها (تُرسم من جديد عند الفتح)، والتسجيلات الحقيقية لا
        .filter((l) => withAudio || l.kind !== "audio" || l.sfx)
        .map((l) => {
          const out = { kind: l.kind, instrument: l.instrument, kit: l.kit, rhythm: l.rhythm, name: l.name, sfx: l.sfx, muted: l.muted, end: l.end, t0: l.t0, t1: l.t1, offset: l.offset, row: l.row };
          if (l.kind !== "audio") out.events = l.events.map(packEvent);
          else if (withAudio) out.audio = { data: l.buffer.getChannelData(0), sampleRate: l.buffer.sampleRate };
          return out;
        }),
    };
  }
  const r3 = (x) => Math.round(x * 1000) / 1000;
  const packEvent = (e) => (e.drum ? [r3(e.startBeat), e.drum, e.velocity] : [r3(e.startBeat), r3(e.held), r3(e.durBeats), evMidi(e), evCents(e), r3(e.gain)]);
  function unpackEvent(a) {
    if (typeof a[1] === "string") return { drum: a[1], startBeat: a[0], held: 0.1, durBeats: 0.3, velocity: a[2], gain: drumGain(a[2]) };
    return makeNoteEvent(a[3], a[4], a[0], a[1], a[2], a[5]);
  }
  async function applyProject(p) {
    if (!p || !Array.isArray(p.layers)) throw new Error("bad project");
    bpm = clamp(Math.round(p.bpm) || 90, 40, 240);
    meter = [2, 3, 4].includes(p.meter) ? p.meter : 4;
    markers = (Array.isArray(p.markers) ? p.markers : []).filter((m) => Number.isFinite(m) && m >= 0).sort((a, b) => a - b);
    fps = [24, 25, 30].includes(p.fps) ? p.fps : 25;
    markFps(fps);
    // الفيديو نفسه ما يُحفظ: لو المشروع يذكر فيديو وما هو محمَّل الآن نطلب الملف
    if (p.video?.name && Number.isFinite(p.video.dur) && !videoUrl) videoMeta = { name: String(p.video.name), dur: p.video.dur };
    paintVideo();
    tracks = (p.tracks || []).map((t) => ({ ...newTrack(), ...t, eq: Array.isArray(t.eq) ? t.eq.slice(0, 3) : [0, 0, 0] }));
    const usable = (l) =>
      (l.kind === "audio" ? l.audio?.data?.length || SFX[l.sfx?.id] : Array.isArray(l.events)) &&
      (l.kind !== "notes" || INSTRUMENTS[l.instrument]) &&
      (l.kind !== "drums" || DRUM_KITS[l.kit]);
    const loaded = await Promise.all(
      p.layers
        .filter(usable)
        .slice(0, MAX_LAYERS)
        .map(async (l) => {
          const out = { ...l };
          delete out.audio;
          if (l.kind === "audio" && l.audio?.data?.length) {
            out.buffer = new AudioBuffer({ length: l.audio.data.length, numberOfChannels: 1, sampleRate: l.audio.sampleRate });
            out.buffer.copyToChannel(l.audio.data, 0);
          } else if (l.kind === "audio") {
            out.buffer = (await renderSfx(l.sfx.id, clamp(Number(l.sfx.dur) || 2, 1, 8))).buffer; // مؤثر من رابط: نرسمه من جديد
            out.end = out.buffer.duration;
            out.t1 = Math.min(out.t1, out.end);
            out.t0 = Math.min(out.t0, out.t1 - 0.05);
          } else {
            out.events = l.events.map(unpackEvent);
          }
          out.row = clamp(Math.round(l.row) || 0, 0, MAX_TRACKS - 1);
          return out;
        })
    );
    layers = loaded;
    history = [];
    future = [];
    selected = null;
    compactRows();
    paintProject();
  }
  function saveProject() {
    const action = studioActive() || markers.length ? (st) => st.put(serializeProject(true), "project") : (st) => st.delete("project");
    sampleStore("readwrite", action).catch(() => {}); // وضع خاص/مساحة ممتلئة: المشروع يبقى بالصفحة فقط
  }

  const b64url = (bytes) => {
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  const unb64url = (str) => Uint8Array.from(atob(str.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  async function encodeShare() {
    const json = new TextEncoder().encode(JSON.stringify(serializeProject(false)));
    if (!window.CompressionStream) return "u" + b64url(json);
    const zipped = await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer();
    return "z" + b64url(new Uint8Array(zipped));
  }
  async function decodeShare(code) {
    const bytes = unb64url(code.slice(1));
    const json =
      code[0] === "z"
        ? await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text()
        : new TextDecoder().decode(bytes);
    return JSON.parse(json);
  }

  const shareBtn = document.getElementById("beepShare");
  shareBtn?.addEventListener("click", async () => {
    if (!layers.length) return;
    const url = location.origin + location.pathname + "#studio=" + (await encodeShare());
    try {
      await navigator.clipboard.writeText(url);
      showToast(layers.some((l) => l.kind === "audio" && !l.sfx) ? shareBtn.dataset.audio : shareBtn.dataset.copied);
    } catch {
      showToast(url);
    }
    playSound("copy");
  });

  /* ===== الخلاط (Mixer) =====
     شريط لكل مسار من قالب بالصفحة (<template> — النصوص بلغة الصفحة): كتم، منفرد،
     مستوى، توزيع، ومؤثرات (معادل، صدى مكان، ترديد، ضاغط، أتمتة الصوت). التغيير
     يُسمع فوراً أثناء التشغيل لأننا نعدّل نفس السلاسل الحية. */
  const mixer = document.getElementById("beepMixer");
  const stripsBox = document.getElementById("beepMixStrips");
  const stripTpl = document.getElementById("beepStripTpl");
  const openFx = new Set(); // أشرطة مؤثراتها مفتوحة — تبقى مفتوحة بعد إعادة الرسم
  let autoEdit = -1; // المسار اللي أتمتته قيد التحرير على الجدول

  function liveChain(r) {
    return liveGraph?.chains[r] || null;
  }
  function renderMixer() {
    if (!stripsBox || !stripTpl) return;
    stripsBox.replaceChildren(...tracks.map(buildStrip));
  }
  function buildStrip(tr, r) {
    const el = stripTpl.content.firstElementChild.cloneNode(true);
    el.dataset.row = String(r);
    el.querySelector(".mix-num").textContent = String(r + 1);
    el.querySelector(".mix-name").textContent = [...new Set(layers.filter((l) => l.row === r).map(clipIcon))].join(" ");
    const now = () => audioCtx?.currentTime || 0;

    const toggle = (sel, key) => {
      const b = el.querySelector(sel);
      b.classList.toggle("active", tr[key]);
      b.setAttribute("aria-pressed", String(tr[key]));
      b.addEventListener("click", () => {
        tr[key] = !tr[key];
        playClickSound();
        renderLayers();
        restartTake();
      });
    };
    toggle(".mix-mute", "mute");
    toggle(".mix-solo", "solo");

    const slider = (input, get, set, apply) => {
      input.value = get();
      input.addEventListener("input", () => {
        set(Number(input.value));
        apply(liveChain(r));
        scheduleSave();
      });
    };
    slider(el.querySelector(".mix-vol"), () => tr.vol, (v) => (tr.vol = v), (c) => c?.vol.gain.setTargetAtTime(tr.vol, now(), 0.03));
    slider(el.querySelector(".mix-pan"), () => tr.pan, (v) => (tr.pan = v), (c) => c?.pan.pan.setTargetAtTime(tr.pan, now(), 0.03));
    el.querySelectorAll(".mix-eq").forEach((input) => {
      const band = Number(input.dataset.band);
      slider(input, () => tr.eq[band], (v) => (tr.eq[band] = v), (c) => c?.eq[band].gain.setTargetAtTime(tr.eq[band], now(), 0.03));
    });
    slider(el.querySelector(".mix-reverb"), () => tr.reverb, (v) => (tr.reverb = v), (c) => c?.rev.gain.setTargetAtTime(tr.reverb, now(), 0.03));
    slider(el.querySelector(".mix-echo"), () => tr.echo, (v) => (tr.echo = v), (c) => c?.echo.gain.setTargetAtTime(tr.echo * 0.6, now(), 0.03));

    const comp = el.querySelector(".mix-comp");
    comp.classList.toggle("active", tr.comp);
    comp.setAttribute("aria-pressed", String(tr.comp));
    comp.addEventListener("click", () => {
      tr.comp = !tr.comp;
      comp.classList.toggle("active", tr.comp);
      comp.setAttribute("aria-pressed", String(tr.comp));
      const c = liveChain(r);
      if (c) {
        c.compIn.gain.setValueAtTime(tr.comp ? 1 : 0, now());
        c.bypass.gain.setValueAtTime(tr.comp ? 0 : 1, now());
      }
      scheduleSave();
      playClickSound();
    });

    const autoBtn = el.querySelector(".mix-auto");
    const editing = autoEdit === r;
    autoBtn.classList.toggle("active", editing);
    autoBtn.setAttribute("aria-pressed", String(editing));
    if (editing) autoBtn.textContent = autoBtn.dataset.on;
    autoBtn.addEventListener("click", () => {
      autoEdit = editing ? -1 : r;
      if (!tr.auto) tr.auto = [];
      playClickSound();
      renderLayers();
      if (autoEdit === r) timeline.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    const autoClear = el.querySelector(".mix-auto-clear");
    autoClear.disabled = !tr.auto;
    autoClear.addEventListener("click", () => {
      tr.auto = null;
      if (autoEdit === r) autoEdit = -1;
      playClickSound();
      renderLayers();
    });

    const fx = el.querySelector(".mix-fx");
    fx.open = openFx.has(r);
    fx.addEventListener("toggle", () => (fx.open ? openFx.add(r) : openFx.delete(r)));
    return el;
  }

  // النقر على رقم المسار: يفتح الخلاط ويوصل لشريطه
  function openStrip(r) {
    if (!mixer) return;
    mixer.open = true;
    const strip = stripsBox.querySelector(`[data-row="${r}"]`);
    if (!strip) return;
    strip.scrollIntoView({ block: "nearest", behavior: "smooth" });
    strip.classList.remove("flash");
    void strip.offsetWidth; // يعيد تشغيل الوميض لو ضُغط مرتين
    strip.classList.add("flash");
    playClickSound();
  }

  /* ===== أتمتة الصوت على الجدول =====
     خط فوق المسار: ١ = المستوى كما هو، فوقه أعلى وتحته أخفض (حتى الصمت). وأنت
     تحرّر: انقر مكاناً فارغاً لإضافة نقطة، واسحب النقطة لتحريكها، وانقرها مرتين
     لحذفها. خارج التحرير الخط للعرض فقط ولا يعيق سحب المقاطع. */
  const AUTO_MAX = 1.5;
  let lastAutoTap = null;
  function buildAutoLane(tr, r) {
    const NS = "http://www.w3.org/2000/svg";
    const w = board.clientWidth || timelineSeconds * pxPerSec;
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "beep-auto" + (autoEdit === r ? " editing" : ""));
    svg.setAttribute("width", String(w));
    svg.setAttribute("height", String(ROW_H));
    svg.style.top = r * ROW_H + "px";
    const yOf = (v) => 5 + (1 - v / AUTO_MAX) * (ROW_H - 10);
    const pts = tr.auto;
    const line = [[0, autoValueAt(pts, 0)], ...pts.map((p) => [p.t * pxPerSec, p.v]), [w, autoValueAt(pts, timelineSeconds)]];
    const poly = document.createElementNS(NS, "polyline");
    poly.setAttribute("points", line.map(([x, v]) => x + "," + yOf(v)).join(" "));
    svg.append(poly);
    pts.forEach((p, i) => {
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", String(p.t * pxPerSec));
      c.setAttribute("cy", String(yOf(p.v)));
      c.setAttribute("r", autoEdit === r ? "7" : "4"); // أكبر وقت التحرير: أسهل للإصبع
      c.dataset.i = String(i);
      svg.append(c);
    });
    if (autoEdit !== r) return svg;

    svg.addEventListener("pointerdown", (e) => {
      if (e.button) return;
      e.preventDefault();
      e.stopPropagation();
      svg.setPointerCapture(e.pointerId);
      const before = snapshot();
      tr.auto = tr.auto.map((p) => ({ ...p })); // اللقطة القديمة تبقى سليمة
      const z = zoomOf(); // ثابت طول السحبة؛ موضع svg يُقرأ حياً (يتغيّر مع التمرير)
      const at = (ev) => {
        const rect = svg.getBoundingClientRect();
        const t = snap((ev.clientX - rect.left) / z / pxPerSec);
        const v = clamp(Math.round((1 - ((ev.clientY - rect.top) / z - 5) / (ROW_H - 10)) * AUTO_MAX * 100) / 100, 0, AUTO_MAX);
        return { t, v };
      };
      let point;
      const hit = e.target.closest("circle");
      if (hit) {
        point = tr.auto[+hit.dataset.i];
        // نقرتان على نفس النقطة = حذفها
        const now = performance.now();
        if (lastAutoTap && lastAutoTap.r === r && Math.abs(lastAutoTap.t - point.t) < 1e-6 && now - lastAutoTap.time < 400) {
          tr.auto.splice(tr.auto.indexOf(point), 1);
          lastAutoTap = null;
          pushHistory(before);
          return renderLayers();
        }
        lastAutoTap = { r, t: point.t, time: now };
      } else {
        point = at(e);
        tr.auto.push(point);
        lastAutoTap = null;
      }
      const move = (ev) => {
        Object.assign(point, at(ev));
        tr.auto.sort((a, b) => a.t - b.t);
        const i = tr.auto.indexOf(point);
        const c = svg.querySelector(`circle[data-i="${hit ? hit.dataset.i : ""}"]`);
        if (c) {
          c.setAttribute("cx", String(point.t * pxPerSec));
          c.setAttribute("cy", String(yOf(point.v)));
        }
        const l2 = [[0, autoValueAt(tr.auto, 0)], ...tr.auto.map((p) => [p.t * pxPerSec, p.v]), [w, autoValueAt(tr.auto, timelineSeconds)]];
        poly.setAttribute("points", l2.map(([x, v]) => x + "," + yOf(v)).join(" "));
        if (i >= 0 && lastAutoTap) lastAutoTap.t = point.t;
      };
      const up = () => {
        svg.removeEventListener("pointermove", move);
        svg.removeEventListener("pointerup", up);
        svg.removeEventListener("pointercancel", up);
        tr.auto.sort((a, b) => a.t - b.t);
        // نقطتان بنفس اللحظة تكسران الخط — نبقي الأحدث
        tr.auto = tr.auto.filter((p, i, a) => i === a.length - 1 || Math.abs(a[i + 1].t - p.t) > 1e-6 || p === point);
        pushHistory(before);
        renderLayers();
      };
      svg.addEventListener("pointermove", move);
      svg.addEventListener("pointerup", up);
      svg.addEventListener("pointercancel", up);
    });
    return svg;
  }

  /* ===== محرّر النغمات (Piano Roll) والضربات (Drum Machine) =====
     يفتح بالنقر المزدوج على مقطع أو زر "حرّر". الصفوف = النغمات (الأحد فوق)، أو
     أصوات الطقم للإيقاع؛ والأعمدة = الزمن بخطوط الضربات والمازورات نفسها على
     الجدول. انقر مكاناً فارغاً لإضافة نغمة (واسحب لتطويلها)، واسحب النغمة
     لتحريكها، وحافتها اليمنى لتغيير طولها، وانقرها مرتين لحذفها. */
  const editor = document.getElementById("beepEditor");
  const edGrid = document.getElementById("beepEditorGrid");
  const edScroll = document.getElementById("beepEditorScroll");
  const edTitle = document.getElementById("beepEditorTitle");
  const edVel = document.getElementById("beepEdVel");
  const ED_KEYS_W = 46;
  let edLayer = null;
  let edNote = null; // النغمة المحددة داخل المحرّر (كائن داخل edLayer.events)
  let edPx = 80;
  let edRowsCache = [];
  let lastNoteTap = null;

  function openEditor(l) {
    if (!l || !editor) return;
    if (l.kind === "audio") return showToast(toolEdit.dataset.audio);
    edLayer = l;
    edNote = null;
    editor.hidden = false;
    edPx = clamp((edScroll.clientWidth - ED_KEYS_W) / Math.max(barSec(), layerLen(l) + barSec() * 0.5), 30, 260);
    renderEditor();
    // نبدأ عند أول نغمة (المقطع قد يكون طويلاً والنغمات فوق/تحت)
    const first = edGrid.querySelector(".ed-note");
    if (first) edScroll.scrollTop = Math.max(0, first.offsetTop - edScroll.clientHeight / 2);
    editor.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  function closeEditor() {
    edLayer = null;
    edNote = null;
    if (editor) editor.hidden = true;
  }

  function edRows(l) {
    if (l.kind === "drums") return DRUM_KITS[l.kit].map((d) => ({ drum: d }));
    const ms = l.events.map(evMidi);
    let lo = Math.min(60, ...ms) - 4;
    let hi = Math.max(72, ...ms) + 4;
    lo = clamp(lo, 21, 108);
    hi = clamp(hi, 21, 108);
    const rows = [];
    for (let m = hi; m >= lo; m--) rows.push({ midi: m });
    return rows;
  }
  const edRowH = (l) => (l.kind === "drums" ? 30 : 16);

  function renderEditor() {
    if (!edLayer) return;
    if (!layers.includes(edLayer)) return closeEditor();
    const l = edLayer;
    const drums = l.kind === "drums";
    const rows = (edRowsCache = edRows(l));
    const rowH = edRowH(l);
    const span = Math.max(layerLen(l) + barSec(), 2 * barSec()); // ثوانٍ معروضة من بداية المقطع
    const w = span * edPx;
    edGrid.style.width = ED_KEYS_W + w + "px";
    edGrid.style.height = rows.length * rowH + "px";
    edGrid.classList.toggle("drums", drums);
    edTitle.textContent = clipLabel(l) + " · " + recTake.dataset.track + " " + (l.row + 1);
    const out = [];
    // الصفوف وأسماؤها (العمود الأيسر ثابت عند التمرير الأفقي)
    rows.forEach((row, i) => {
      const black = !drums && [1, 3, 6, 8, 10].includes(pcOf(row.midi));
      const label = drums ? editor.dataset[row.drum] : noteName(row.midi, noteStyle) + (pcOf(row.midi) === 0 ? octaveOf(row.midi) : "");
      out.push(`<div class="ed-row${black ? " black" : ""}" style="top:${i * rowH}px;height:${rowH}px"></div>`);
      // الأسماء بالتدفق العادي (لا absolute) عشان sticky يثبّتها يسار عند التمرير الأفقي
      out.push(`<div class="ed-key${black ? " black" : ""}" style="height:${rowH}px" data-row="${i}">${label}</div>`);
    });
    // خطوط الشبكة على الضربات الحقيقية بالجدول (المقطع قد يبدأ بنص ضربة)
    const beat = beatSec();
    const step = gridStep() || beat / 4;
    const firstAbs = l.offset;
    for (let k = Math.ceil(firstAbs / step - 1e-6); k * step <= firstAbs + span; k++) {
      const abs = k * step;
      const x = ED_KEYS_W + (abs - firstAbs) * edPx;
      const onBar = Math.abs(abs / barSec() - Math.round(abs / barSec())) < 1e-6;
      const onBeat = Math.abs(abs / beat - Math.round(abs / beat)) < 1e-6;
      out.push(`<div class="ed-line${onBar ? " bar" : onBeat ? " beat" : ""}" style="left:${x}px"></div>`);
    }
    // نهاية المقطع: بعدها مساحة لإضافة نغمات تطوّل المقطع
    out.push(`<div class="ed-end" style="left:${ED_KEYS_W + layerLen(l) * edPx}px"></div>`);
    l.events.forEach((ev, i) => {
      if (ev.startBeat < l.t0 - 1e-6 || ev.startBeat >= l.t0 + span) return;
      const r = drums ? rows.findIndex((x) => x.drum === ev.drum) : rows.findIndex((x) => x.midi === evMidi(ev));
      if (r < 0) return;
      const x = ED_KEYS_W + (ev.startBeat - l.t0) * edPx;
      const width = drums ? Math.max(8, (beat / 4) * edPx * 0.85) : Math.max(6, ev.held * edPx);
      const outside = ev.startBeat >= l.t1;
      const alpha = 0.45 + 0.55 * ((ev.velocity || 96) / 127);
      out.push(`<div class="ed-note${ev === edNote ? " sel" : ""}${outside ? " outside" : ""}" data-i="${i}" style="left:${x}px;top:${r * rowH + 1}px;width:${width}px;height:${rowH - 2}px;--a:${alpha.toFixed(2)}"></div>`);
    });
    edGrid.innerHTML = out.join("");
    edVel.disabled = !edNote;
    document.getElementById("beepEdDelete").disabled = !edNote;
    if (edNote) edVel.value = edNote.velocity || 96;
  }

  // يسمع النغمة/الضربة لما تُضاف أو تتحرك — بنفس آلة المقطع
  async function audition(l, ev) {
    await ensureContext();
    const target = { ctx: audioCtx, dry: masterInput, wet: delayNode, live: false };
    if (l.kind === "drums") return playDrum(target, ev.drum, audioCtx.currentTime + 0.01, ev.gain);
    const saved = currentInstrument;
    currentInstrument = l.instrument;
    playNote(target, ev.degree, audioCtx.currentTime + 0.01, 0.35, ev.gain, 0, 0, ev.freq);
    currentInstrument = saved;
  }

  // نسخة جديدة من مصفوفة النغمات قبل أي تعديل (اللقطات القديمة للتراجع تبقى سليمة)
  function edCow() {
    const i = edNote ? edLayer.events.indexOf(edNote) : -1;
    edLayer.events = edLayer.events.map((e) => ({ ...e }));
    edNote = i >= 0 ? edLayer.events[i] : null;
  }
  // آخر نقطة يصلها المحتوى: نطوّل المقطع لو أُضيفت نغمة بعد نهايته
  function edGrow(l) {
    const last = Math.max(...l.events.map((e) => e.startBeat + (l.kind === "drums" ? 0.1 : e.held)));
    if (last > l.t1) l.t1 = last;
    l.end = Math.max(l.end, l.t1, ...l.events.map((e) => e.startBeat + e.durBeats));
  }
  function edDeleteNote() {
    if (!edNote || !edLayer) return;
    pushHistory();
    edCow();
    edLayer.events.splice(edLayer.events.indexOf(edNote), 1);
    edNote = null;
    // مقطع بلا نغمات ما له معنى: نحذفه كله
    if (!edLayer.events.some((e) => e.startBeat >= edLayer.t0 && e.startBeat < edLayer.t1)) {
      layers.splice(layers.indexOf(edLayer), 1);
      if (selected === edLayer) selected = null;
      compactRows();
      closeEditor();
    }
    renderLayers();
  }

  if (editor) {
    edGrid.addEventListener("pointerdown", (e) => {
      if (e.button || !edLayer) return;
      const l = edLayer;
      const drums = l.kind === "drums";
      const rowH = edRowH(l);
      const rect = edGrid.getBoundingClientRect();
      const z = rect.width / edGrid.offsetWidth || 1;
      const xOf = (ev) => (ev.clientX - rect.left) / z - ED_KEYS_W;
      const rowOf = (ev) => clamp(Math.floor((ev.clientY - rect.top) / z / rowH), 0, edRowsCache.length - 1);
      const keyCell = e.target.closest(".ed-key");
      if (keyCell) {
        // عمود الأسماء: يسمّعك النغمة فقط
        const row = edRowsCache[+keyCell.dataset.row];
        const ev = drums ? { drum: row.drum, gain: drumGain(DRUM_VEL[row.drum]) } : makeNoteEvent(row.midi, centsOf(row.midi), 0, 0.3, 0.3, velGain(96));
        return audition(l, ev);
      }
      e.preventDefault();
      edGrid.setPointerCapture(e.pointerId);
      const step = gridStep() || beatSec() / 4;
      const snapRel = (rel) => {
        const abs = l.offset + rel;
        const s = gridStep() ? Math.round(abs / step) * step : Math.round(abs * 100) / 100;
        return Math.max(l.t0, s - l.offset + l.t0);
      };
      const before = snapshot();
      edCow();
      const noteEl = e.target.closest(".ed-note");
      let mode;
      let created = false;
      if (noteEl) {
        edNote = edLayer.events[+noteEl.dataset.i];
        const r = noteEl.getBoundingClientRect();
        mode = !drums && e.clientX > r.right - 8 * z ? "resize" : "move";
        // نقرتان على نفس النغمة = حذفها
        const now = performance.now();
        if (lastNoteTap && lastNoteTap.i === +noteEl.dataset.i && now - lastNoteTap.time < 380) {
          lastNoteTap = null;
          history.push(before);
          future = [];
          edLayer.events.splice(edLayer.events.indexOf(edNote), 1);
          edNote = null;
          return renderLayers();
        }
        lastNoteTap = { i: +noteEl.dataset.i, time: now };
      } else {
        const row = edRowsCache[rowOf(e)];
        const s = snapRel(xOf(e) / edPx - (gridStep() ? step / 2 : 0));
        edNote = drums
          ? { drum: row.drum, startBeat: s, held: 0.1, durBeats: 0.3, velocity: DRUM_VEL[row.drum], gain: drumGain(DRUM_VEL[row.drum]) }
          : { ...makeNoteEvent(row.midi, centsOf(row.midi), s, step, step + 0.4, velGain(96)), velocity: 96 };
        edLayer.events.push(edNote);
        created = true;
        mode = drums ? "move" : "resize";
        lastNoteTap = null;
        audition(l, edNote);
      }
      const ev0 = { ...edNote };
      const x0 = xOf(e);
      const row0 = rowOf(e);
      let changed = created;
      const el = () => edGrid.querySelector(".ed-note.sel") || edGrid.querySelector(`.ed-note[data-i="${edLayer.events.indexOf(edNote)}"]`);
      renderEditor();
      const move = (ev) => {
        const dx = (xOf(ev) - x0) / edPx;
        if (mode === "resize") {
          const end = snapRel(ev0.startBeat - l.t0 + ev0.held + dx);
          edNote.held = Math.max(gridStep() ? step : 0.05, end - edNote.startBeat);
          edNote.durBeats = edNote.held + 0.4;
        } else {
          edNote.startBeat = snapRel(ev0.startBeat - l.t0 + dx);
          const row = edRowsCache[clamp(edRowsCache.findIndex((x) => (drums ? x.drum === ev0.drum : x.midi === evMidi(ev0))) + rowOf(ev) - row0, 0, edRowsCache.length - 1)];
          if (drums && row.drum !== edNote.drum) {
            edNote.drum = row.drum;
            audition(l, edNote);
          } else if (!drums && row.midi !== evMidi(edNote)) {
            Object.assign(edNote, makeNoteEvent(row.midi, centsOf(row.midi), edNote.startBeat, edNote.held, edNote.durBeats, edNote.gain), { velocity: edNote.velocity });
            audition(l, edNote);
          }
        }
        changed = changed || edNote.startBeat !== ev0.startBeat || edNote.held !== ev0.held || evMidi(edNote) !== evMidi(ev0) || edNote.drum !== ev0.drum;
        const node = el();
        if (node) {
          const r = drums ? edRowsCache.findIndex((x) => x.drum === edNote.drum) : edRowsCache.findIndex((x) => x.midi === evMidi(edNote));
          node.style.left = ED_KEYS_W + (edNote.startBeat - l.t0) * edPx + "px";
          node.style.top = r * rowH + 1 + "px";
          if (!drums) node.style.width = Math.max(6, edNote.held * edPx) + "px";
        }
      };
      const up = () => {
        edGrid.removeEventListener("pointermove", move);
        edGrid.removeEventListener("pointerup", up);
        edGrid.removeEventListener("pointercancel", up);
        if (changed) {
          history.push(before);
          if (history.length > HISTORY_MAX) history.shift();
          future = [];
          edGrow(edLayer);
        }
        renderLayers();
      };
      edGrid.addEventListener("pointermove", move);
      edGrid.addEventListener("pointerup", up);
      edGrid.addEventListener("pointercancel", up);
    });

    let velBefore = null;
    edVel.addEventListener("pointerdown", () => {
      if (!edNote) return;
      velBefore = snapshot();
      edCow();
    });
    edVel.addEventListener("input", () => {
      if (!edNote) return;
      if (!velBefore) {
        velBefore = snapshot(); // تغيير بالكيبورد (أسهم) بلا ضغطة ماوس
        edCow();
      }
      edNote.velocity = Number(edVel.value);
      edNote.gain = edLayer.kind === "drums" ? drumGain(edNote.velocity) : velGain(edNote.velocity);
      const node = edGrid.querySelector(".ed-note.sel");
      if (node) node.style.setProperty("--a", (0.45 + 0.55 * (edNote.velocity / 127)).toFixed(2));
    });
    edVel.addEventListener("change", () => {
      if (!velBefore) return;
      pushHistory(velBefore);
      velBefore = null;
      audition(edLayer, edNote);
      renderLayers();
    });
    document.getElementById("beepEdDelete").addEventListener("click", () => {
      edDeleteNote();
      playClickSound();
    });
    document.getElementById("beepEdClose").addEventListener("click", () => {
      closeEditor();
      playClickSound();
    });
    document.getElementById("beepEdZoomIn").addEventListener("click", () => {
      edPx = Math.min(400, edPx * 1.3);
      renderEditor();
    });
    document.getElementById("beepEdZoomOut").addEventListener("click", () => {
      edPx = Math.max(20, edPx / 1.3);
      renderEditor();
    });
  }

  /* ===== مكتبة المؤثرات السينمائية (SFX) =====
     كلها تخليق بالكود (لا ملفات ولا رخص)، وتُحفظ بالمشروع كمقطع صوتي عادي: تُسحب
     وتُقص وتُخلط وتُصدَّر مثل أي تسجيل. الطول قابل للتغيير (عدا الضربة)، والمكان
     بالنسبة للخط الأبيض (نقطة القطع بالمشهد) حسب طبيعة المؤثر:
       - "end": التمهيدية (الصعود والعكسي) تنتهي عند الخط بالضبط — تصل للقطع.
       - "center": الووش ذروته عند الخط.
       - "start": الضربات والباقي تبدأ عنده.
     كل مؤثر = build(ctx, out, D) يرسم الصوت داخل سياق غير متصل بطول D ثانية. */
  const SFX_RATE = 48000;
  const SFX = {
    impact: {
      fixed: 1,
      anchor: "start",
      tail: 3,
      build(ctx, out) {
        sfxTone(ctx, out, 0, 70, 32, 2.6, 1, "sine");
        sfxTone(ctx, out, 0, 140, 50, 0.5, 0.5, "triangle");
        sfxNoise(ctx, out, 0, 0.45, 0.9, "lowpass", [2400, 180], 0.7);
        sfxNoise(ctx, out, 0, 0.03, 0.8, "highpass", [3000, 3000], 0.7); // طقّة البداية
        sfxReverb(ctx, out, 0.35, 3);
      },
    },
    subdrop: {
      anchor: "start",
      tail: 0.2,
      build(ctx, out, D) {
        sfxTone(ctx, out, 0, 95, 26, D, 1, "sine");
      },
    },
    braam: {
      anchor: "start",
      tail: 1.5,
      build(ctx, out, D) {
        // نحاس سينمائي ضخم: أوتار منشارية غليظة متباعدة قليلاً، وفلتر ينفتح ثم ينغلق
        const f = ctx.createBiquadFilter();
        f.type = "lowpass";
        f.Q.value = 2;
        f.frequency.setValueAtTime(180, 0);
        f.frequency.exponentialRampToValueAtTime(1400, Math.min(0.6, D * 0.3));
        f.frequency.exponentialRampToValueAtTime(260, D);
        const shaper = ctx.createWaveShaper();
        const curve = new Float32Array(1024);
        for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh(((i / 1023) * 2 - 1) * 2.2);
        shaper.curve = curve;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, 0);
        g.gain.exponentialRampToValueAtTime(0.5, 0.08);
        g.gain.setValueAtTime(0.5, D * 0.6);
        g.gain.exponentialRampToValueAtTime(0.0001, D + 1.2);
        f.connect(shaper).connect(g).connect(out);
        [55, 55.4, 110, 82.4, 164.8].forEach((hz) => {
          const o = ctx.createOscillator();
          o.type = "sawtooth";
          o.frequency.value = hz;
          o.connect(f);
          o.start(0);
          o.stop(D + 1.3);
        });
        sfxReverb(ctx, g, 0.3, 2.5, out);
      },
    },
    riser: {
      anchor: "end",
      tail: 0,
      build(ctx, out, D) {
        // ضجيج يصعد تردده وقوته معاً + نغمة تصعد — ويقف فجأة عند النهاية (القطع)
        sfxNoise(ctx, out, 0, D, 0.9, "bandpass", [300, 7000], 2.5, "rise");
        sfxTone(ctx, out, 0, 180, 1400, D, 0.35, "sawtooth", "rise");
      },
    },
    downlifter: {
      anchor: "start",
      tail: 0.1,
      build(ctx, out, D) {
        sfxNoise(ctx, out, 0, D, 0.9, "bandpass", [7000, 200], 2, "fall");
        sfxTone(ctx, out, 0, 900, 70, D, 0.35, "sawtooth", "fall");
      },
    },
    whoosh: {
      anchor: "center",
      tail: 0,
      build(ctx, out, D) {
        // جرس صوتي: يعلو للمنتصف ثم يهبط، والتردد يمر من الواطي للحاد ويرجع
        const src = ctx.createBufferSource();
        src.buffer = noiseOf(ctx);
        src.loop = true;
        const f = ctx.createBiquadFilter();
        f.type = "bandpass";
        f.Q.value = 1.6;
        f.frequency.setValueAtTime(350, 0);
        f.frequency.exponentialRampToValueAtTime(3200, D / 2);
        f.frequency.exponentialRampToValueAtTime(400, D);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, 0);
        g.gain.exponentialRampToValueAtTime(1.2, D / 2);
        g.gain.exponentialRampToValueAtTime(0.0001, D);
        src.connect(f).connect(g).connect(out);
        src.start(0);
        src.stop(D);
      },
    },
    reverse: {
      anchor: "end",
      tail: 0,
      reversed: true, // يُرسم صنج يخفت ثم يُقلب: يتضخم ويقف عند الخط
      build(ctx, out, D) {
        sfxNoise(ctx, out, 0, D, 0.8, "highpass", [5000, 5000], 0.7, "decay");
        sfxNoise(ctx, out, 0, D, 0.5, "bandpass", [9000, 9000], 3, "decay");
      },
    },
    drone: {
      anchor: "start",
      tail: 0,
      build(ctx, out, D) {
        // توتر قاتم: نغمتان غليظتان بينهما نصف درجة، وفلتر يتنفّس ببطء
        const f = ctx.createBiquadFilter();
        f.type = "lowpass";
        f.Q.value = 4;
        f.frequency.value = 320;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.15;
        const depth = ctx.createGain();
        depth.gain.value = 180;
        lfo.connect(depth).connect(f.frequency);
        lfo.start(0);
        lfo.stop(D);
        const g = ctx.createGain();
        const fade = Math.min(1.5, D / 3);
        g.gain.setValueAtTime(0.0001, 0);
        g.gain.exponentialRampToValueAtTime(0.4, fade);
        g.gain.setValueAtTime(0.4, D - fade);
        g.gain.exponentialRampToValueAtTime(0.0001, D);
        f.connect(g).connect(out);
        [55, 58.27, 110.4].forEach((hz) => {
          const o = ctx.createOscillator();
          o.type = "sawtooth";
          o.frequency.value = hz;
          o.connect(f);
          o.start(0);
          o.stop(D);
        });
      },
    },
    shimmer: {
      anchor: "start",
      tail: 2,
      build(ctx, out, D) {
        // نجوم صغيرة: نغمات حادة قصيرة متناثرة، تكثر بالبداية وتقل
        const bus = ctx.createGain();
        bus.connect(out);
        const count = Math.round(14 + D * 6);
        for (let i = 0; i < count; i++) {
          const t = D * Math.random() ** 1.6;
          sfxTone(ctx, bus, t, 2000 + Math.random() * 4500, 0, 0.5, 0.12, "sine");
        }
        sfxReverb(ctx, bus, 0.5, 2.5, out);
      },
    },
    heartbeat: {
      anchor: "start",
      tail: 0.3,
      build(ctx, out, D) {
        // "لَب-دَب" بسرعة ٧٠ نبضة بالدقيقة
        for (let t = 0; t < D; t += 60 / 70) {
          sfxTone(ctx, out, t, 70, 40, 0.18, 1, "sine");
          sfxTone(ctx, out, t + 0.22, 62, 36, 0.16, 0.7, "sine");
        }
      },
    },
    tick: {
      anchor: "start",
      tail: 0.1,
      build(ctx, out, D) {
        // ساعة تدق (تك-توك) كل نصف ثانية — للتشويق والعدّ التنازلي
        for (let t = 0, k = 0; t < D; t += 0.5, k++) {
          sfxNoise(ctx, out, t, 0.03, 0.7, "bandpass", k % 2 ? [2400, 2400] : [3400, 3400], 6);
        }
      },
    },
  };

  // نغمة تنزلق من f0 إلى f1. shape: "decay" (تخفت) أو "rise" (تعلو للنهاية) أو "fall" (تخفت من البداية)
  function sfxTone(ctx, out, t, f0, f1, dur, vol, type, shape = "decay") {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 > 0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    sfxEnvelope(g.gain, t, dur, vol, shape);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  function sfxNoise(ctx, out, t, dur, vol, filterType, [f0, f1], q, shape = "decay") {
    const src = ctx.createBufferSource();
    src.buffer = noiseOf(ctx);
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = filterType;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    sfxEnvelope(g.gain, t, dur, vol, shape);
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }
  function sfxEnvelope(param, t, dur, vol, shape) {
    if (shape === "rise") {
      param.setValueAtTime(0.0001, t);
      param.exponentialRampToValueAtTime(vol, t + dur - 0.01);
      param.linearRampToValueAtTime(0, t + dur); // قطع نظيف بلا طقّة
    } else {
      param.setValueAtTime(0.0001, t);
      param.exponentialRampToValueAtTime(vol, t + 0.004);
      param.exponentialRampToValueAtTime(0.0001, t + dur);
    }
  }
  function sfxReverb(ctx, from, amount, seconds, to = from) {
    const verb = ctx.createConvolver();
    verb.buffer = makeRoomImpulse(ctx, seconds);
    const wet = ctx.createGain();
    wet.gain.value = amount;
    from.connect(verb).connect(wet).connect(to === from ? ctx.destination : to);
  }

  // يرسم المؤثر لملف صوتي (أحادي ٤٨ كيلوهرتز) — نفس البذرة دائماً، فالمؤثر نفسه
  // يرجع مطابقاً لما يُعاد بناؤه من رابط مشاركة
  async function renderSfx(id, dur) {
    const def = SFX[id];
    const D = def.fixed || dur;
    const seconds = D + def.tail;
    const ctx = new OfflineAudioContext(1, Math.ceil(SFX_RATE * seconds), SFX_RATE);
    const out = ctx.createGain();
    out.connect(ctx.destination);
    withFixedRandom(() => def.build(ctx, out, D));
    const buffer = await ctx.startRendering();
    const data = buffer.getChannelData(0);
    if (def.reversed) data.reverse();
    // تطبيع لذروة ثابتة (−٣ ديسيبل تقريباً): كل المؤثرات بمستوى متقارب
    let peak = 0;
    for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
    if (peak > 0) for (let i = 0; i < data.length; i++) data[i] *= 0.7 / peak;
    return { buffer, D };
  }
  // موضع "اللحظة المهمة" داخل المؤثر (تُوضع عند الخط الأبيض)
  const sfxAnchor = (id, D) => ({ end: D, center: D / 2, start: 0 })[SFX[id].anchor];

  /* ===== المؤثرات: الاختيار والتجربة والإضافة كمسار ===== */
  const sfxBox = document.getElementById("beepSfx");
  const sfxBtn = document.getElementById("beepAddSfx");
  let sfxId = "riser";
  let sfxDur = 2;
  let sfxPreview = null;
  const sfxLabel = (id) => sfxBox?.querySelector(`[data-sfx="${id}"]`)?.textContent.trim() || id;
  function paintSfxDur() {
    // الضربة طولها ثابت (رنينها طبيعي) — أزرار الطول تتعطّل معها
    sfxBox.querySelectorAll("[data-dur]").forEach((c) => (c.disabled = Boolean(SFX[sfxId].fixed)));
  }
  function stopSfxPreview() {
    try {
      sfxPreview?.stop();
    } catch {
      // انتهى أصلاً
    }
    sfxPreview = null;
  }
  // فتح لوحة الإيقاع أو المؤثرات يقفل الثانية — لوحة وحدة مفتوحة تحت المفاتيح
  function togglePanel(box, btn, other, otherBtn) {
    box.hidden = !box.hidden;
    btn.classList.toggle("active", !box.hidden);
    btn.setAttribute("aria-expanded", String(!box.hidden));
    if (!box.hidden && other && !other.hidden) {
      other.hidden = true;
      otherBtn.classList.remove("active");
      otherBtn.setAttribute("aria-expanded", "false");
    }
    stopDrumPreview();
    stopSfxPreview();
    playClickSound();
  }
  if (sfxBox) {
    sfxBtn.addEventListener("click", () => togglePanel(sfxBox, sfxBtn, document.getElementById("beepDrums"), document.getElementById("beepAddDrums")));
    chipGroup(sfxBox, "sfx", sfxId, (v) => {
      sfxId = v;
      paintSfxDur();
    });
    chipGroup(sfxBox, "dur", sfxDur, (v) => (sfxDur = Number(v)));
    paintSfxDur();
    document.getElementById("beepSfxPreview").addEventListener("click", async () => {
      if (playing) stopPlayback();
      await ensureContext();
      stopTake();
      stopSfxPreview();
      const { buffer } = await renderSfx(sfxId, sfxDur);
      sfxPreview = audioCtx.createBufferSource();
      sfxPreview.buffer = buffer;
      sfxPreview.connect(masterInput);
      sfxPreview.start();
    });
    document.getElementById("beepSfxAdd").addEventListener("click", async () => {
      if (layers.length >= MAX_LAYERS || rowCount() >= MAX_TRACKS) return showToast(recTake.dataset.max);
      stopSfxPreview();
      const { buffer, D } = await renderSfx(sfxId, sfxDur);
      // اللحظة المهمة عند الخط الأبيض؛ لو الخط قريب من البداية يُقص أول المؤثر
      const at = cursor - sfxAnchor(sfxId, D);
      const t0 = Math.min(Math.max(0, -at), buffer.duration - 0.05);
      pushHistory();
      const l = { kind: "audio", buffer, name: sfxLabel(sfxId), sfx: { id: sfxId, dur: sfxDur }, muted: false, end: buffer.duration, t0, t1: buffer.duration, offset: Math.max(0, at), row: rowCount() };
      layers.push(l);
      selected = l;
      renderLayers();
      playSound("success");
      timeline.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }

  /* ===== الإيقاعات: اختيار النمط، التجربة، والإضافة كمسار ===== */
  const drumsBox = document.getElementById("beepDrums");
  const drumsBtn = document.getElementById("beepAddDrums");
  const drumPreviewBtn = document.getElementById("beepDrumPreview");
  let rhythm = RHYTHMS[store.get("beepRhythm")] ? store.get("beepRhythm") : "maqsum";
  let drumBars = 4;
  let previewTimer = null;
  function stopDrumPreview() {
    if (!previewTimer) return;
    clearInterval(previewTimer);
    previewTimer = null;
    if (drumPreviewBtn) drumPreviewBtn.textContent = drumPreviewBtn.dataset.play;
  }
  async function startDrumPreview() {
    if (playing) stopPlayback();
    await ensureContext();
    stopTake();
    const target = { ctx: audioCtx, dry: masterInput, wet: delayNode, live: true };
    let barStart = audioCtx.currentTime + 0.08;
    let { events, end } = rhythmEvents(rhythm, 1);
    let current = rhythm;
    const tick = () => {
      // تغيير النمط أثناء التجربة: المازورة الجاية بالنمط الجديد
      if (current !== rhythm) ({ events, end } = rhythmEvents((current = rhythm), 1));
      while (barStart < audioCtx.currentTime + 0.3) {
        events.forEach((e) => playDrum(target, e.drum, barStart + e.startBeat, e.gain));
        barStart += end;
      }
    };
    tick();
    previewTimer = setInterval(tick, 50);
    drumPreviewBtn.textContent = drumPreviewBtn.dataset.stop;
  }
  if (drumsBox) {
    drumsBtn.addEventListener("click", () => togglePanel(drumsBox, drumsBtn, sfxBox, sfxBtn));
    chipGroup(drumsBox, "rhythm", rhythm, (v) => {
      rhythm = v;
      store.set("beepRhythm", v);
    });
    chipGroup(drumsBox, "bars", drumBars, (v) => (drumBars = Number(v)));
    drumPreviewBtn.addEventListener("click", () => {
      if (previewTimer) stopDrumPreview();
      else startDrumPreview();
    });
    document.getElementById("beepDrumAdd").addEventListener("click", () => {
      if (layers.length >= MAX_LAYERS || rowCount() >= MAX_TRACKS) return showToast(recTake.dataset.max);
      stopDrumPreview();
      const { events, end } = rhythmEvents(rhythm, drumBars);
      pushHistory();
      // يقع على أقرب بداية مازورة للخط الأبيض
      const offset = Math.round(cursor / barSec()) * barSec();
      const l = { kind: "drums", kit: RHYTHMS[rhythm].kit, rhythm, events, muted: false, end, t0: 0, t1: end, offset, row: rowCount() };
      layers.push(l);
      selected = l;
      renderLayers();
      playSound("success");
      timeline.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }

  /* ===== الإعدادات: المقام، اللوحة، الميزان، الشبكة، العدّ ===== */
  // مجموعة أزرار تختار واحداً منها (data-<attr>)، والمختار يتلوّن
  function chipGroup(boxOrId, attr, current, onPick) {
    const box = typeof boxOrId === "string" ? document.getElementById(boxOrId) : boxOrId;
    if (!box) return () => {};
    const chips = box.querySelectorAll(`[data-${attr}]`);
    const mark = (v) =>
      chips.forEach((c) => {
        c.classList.toggle("active", c.dataset[attr] === String(v));
        c.setAttribute("aria-pressed", String(c.dataset[attr] === String(v)));
      });
    mark(current);
    chips.forEach((c) =>
      c.addEventListener("click", () => {
        onPick(c.dataset[attr]);
        mark(c.dataset[attr]);
        playClickSound();
      })
    );
    return mark;
  }

  const maqamNote = document.getElementById("beepMaqamNote");
  function renderMaqamNote() {
    if (!maqamNote) return;
    const m = MAQAMS[maqam];
    if (!m.scale) {
      maqamNote.textContent = maqamNote.dataset.none;
      return;
    }
    const chip = document.querySelector(`#beepMaqam [data-maqam="${maqam}"]`);
    const names = m.scale.map((pc) => noteName(pc + 60, noteStyle));
    maqamNote.textContent = chip.textContent.trim() + ": ⁦" + names.join(" · ") + "⁩" + (Object.keys(m.cents).length ? " — " + maqamNote.dataset.quarter : "");
  }
  chipGroup("beepMaqam", "maqam", maqam, (v) => {
    maqam = v;
    store.set("beepMaqam", v);
    renderPlayKeys();
    renderMaqamNote();
    if (edLayer) renderEditor();
  });
  renderMaqamNote();
  chipGroup("beepBoardSize", "board", boardMode, (v) => {
    boardMode = v;
    store.set("beepBoard", v);
    renderPlayKeys();
  });
  const markMeter = chipGroup("beepMeter", "meter", meter, (v) => {
    pushHistory();
    meter = Number(v);
    renderLayers();
  });
  chipGroup("beepGrid", "grid", gridDiv, (v) => {
    gridDiv = Number(v);
    store.set("beepGrid", v);
    if (edLayer) renderEditor();
  });
  const countBtn = document.getElementById("beepCountIn");
  const paintCount = () => {
    countBtn?.classList.toggle("active", countIn);
    countBtn?.setAttribute("aria-pressed", String(countIn));
  };
  paintCount();
  countBtn?.addEventListener("click", () => {
    countIn = !countIn;
    store.set("beepCountIn", countIn ? "1" : "0");
    paintCount();
    playClickSound();
  });
  chipGroup("beepMaster", "master", masterPreset, (v) => {
    masterPreset = v;
    store.set("beepMaster", v);
    if (liveMaster) applyMaster(liveMaster, v, audioCtx);
  });

  /* ===== السرعة (BPM) ===== */
  const tempoInput = document.getElementById("beepTempo");
  function paintProject() {
    if (tempoInput) tempoInput.value = String(bpm);
    markMeter(meter);
  }
  function setTempo(next) {
    next = clamp(Math.round(Number(next)) || bpm, 40, 240);
    if (next === bpm) return paintProject();
    if (takeTimers.length) stopTake();
    if (layers.length) pushHistory();
    const r = bpm / next;
    layers.forEach((l) => {
      if (l.kind !== "audio") {
        l.events = l.events.map((e) => ({ ...e, startBeat: e.startBeat * r, held: e.held * r, durBeats: e.durBeats * r }));
        l.t0 *= r;
        l.t1 *= r;
        l.end *= r;
      }
      l.offset *= r;
    });
    tracks.forEach((t) => t.auto && (t.auto = t.auto.map((p) => ({ t: p.t * r, v: p.v }))));
    cursor *= r;
    bpm = next;
    paintProject();
    renderLayers();
  }
  if (tempoInput) {
    tempoInput.addEventListener("change", () => setTempo(tempoInput.value));
    tempoInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        tempoInput.blur(); // change يطبّق القيمة، والكيبورد يرجع للعزف
      }
    });
    document.getElementById("beepTempoDown").addEventListener("click", () => setTempo(bpm - 1));
    document.getElementById("beepTempoUp").addEventListener("click", () => setTempo(bpm + 1));
    paintProject();
  }

  /* ===== "أضف إلى الاستوديو": المقطوعة المؤلّفة تصير مسارين (لحن + مرافقة) =====
     الاستوديو فاضي؟ ياخذ سرعة المقطوعة وميزانها فتقع على الشبكة كما هي. وإلا
     تُكتب بسرعة المشروع الحالية (نفس الضربات) عند أقرب مازورة للخط الأبيض. */
  const toStudioBtn = document.getElementById("beepToStudio");
  toStudioBtn?.addEventListener("click", () => {
    const piece = ensurePiece();
    if (playing) stopPlayback();
    if (layers.length + 2 > MAX_LAYERS || rowCount() + 2 > MAX_TRACKS) return showToast(recTake.dataset.max);
    pushHistory();
    if (!layers.length) {
      bpm = clamp(piece.meta.bpm, 40, 240);
      meter = piece.meta.meter;
      paintProject();
    }
    const sec = beatSec();
    const start = Math.round(cursor / barSec()) * barSec();
    const parts = { melody: [], accomp: [] };
    piece.events.forEach((ev) => {
      const midi = Math.round(69 + 12 * Math.log2((NOTES[ev.degree] * 2 ** octaveShift) / 440));
      parts[ev.part === "melody" ? "melody" : "accomp"].push(makeNoteEvent(midi, 0, ev.startBeat * sec, ev.durBeats * sec, ev.durBeats * sec + 0.4, ev.gain));
    });
    Object.values(parts).forEach((events) => {
      if (!events.length) return;
      const end = Math.max(...events.map((e) => e.startBeat + e.durBeats));
      layers.push({ kind: "notes", events, instrument: currentInstrument, muted: false, end, t0: 0, t1: end, offset: start, row: rowCount() });
    });
    showPane("panePlay");
    renderLayers();
    showToast(toStudioBtn.dataset.done);
    playSound("success");
  });

  if (recToggle) {
    recToggle.addEventListener("click", () => {
      if (rec) stopRec();
      else startRec("notes");
      playClickSound();
    });
    micBtn?.addEventListener("click", () => {
      if (rec) stopRec();
      else startRec("audio");
      playClickSound();
    });
    recPlay.addEventListener("click", () => (takeTimers.length ? stopTake() : playTake()));
    document.getElementById("beepRecWav").addEventListener("click", (e) => exportTake(e.currentTarget, renderPieceToWav, "wav"));
    document.getElementById("beepRecMp3").addEventListener("click", (e) => exportTake(e.currentTarget, renderPieceToMp3, "mp3"));
    document.getElementById("beepRecMidi").addEventListener("click", (e) => exportTake(e.currentTarget, async () => studioToMidi(), "mid"));
    document.getElementById("beepRecStems").addEventListener("click", (e) => exportStems(e.currentTarget));
    document.getElementById("beepRecClear").addEventListener("click", () => {
      stopTake();
      pushHistory();
      layers = [];
      selected = null;
      autoEdit = -1;
      closeEditor();
      renderLayers();
      playClickSound();
    });
  }

  /* ===== اختصارات لوحة المفاتيح (على خريطة باند لاب ستوديو) =====
     Space تشغيل/إيقاف من الخط الأبيض · Shift+Space من البداية · R تسجيل · Esc إيقاف ·
     S قص · Q ضبط الإيقاع · C المترونوم · Delete حذف · Ctrl+C/X/V نسخ/قص/لصق ·
     Ctrl+D تكرار · Shift+M كتم · Ctrl+Z تراجع · Enter/Home/End تنقّل المؤشر ·
     Ctrl+/ قائمة الاختصارات · Shift ممسوكاً = الدواسة.
     تعارض واحد: S نغمة بيانو أيضاً، فتقصّ فقط لما تكون طبقة محددة (وضع التحرير)؛
     Esc يلغي التحديد فيرجع S نغمة. مفاتيح البيانو الباقية لا تُلمس. */
  const shortcutsBox = document.getElementById("beepShortcuts");
  const SHORTCUT_KEYCODES = { 32: "Space", 27: "Escape", 46: "Delete", 8: "Backspace", 36: "Home", 35: "End", 13: "Enter", 191: "Slash", 37: "ArrowLeft", 39: "ArrowRight" };
  function shortcutCode(e) {
    if (e.code && e.code !== "Unidentified") return e.code;
    if (SHORTCUT_KEYCODES[e.keyCode]) return SHORTCUT_KEYCODES[e.keyCode];
    return e.keyCode >= 65 && e.keyCode <= 90 ? "Key" + String.fromCharCode(e.keyCode) : "";
  }
  const totalSeconds = () => Math.max(0, videoDur(), ...layers.map(layerEnd));

  if (recToggle) {
    document.addEventListener("keydown", (e) => {
      if (e.repeat || document.getElementById("panePlay").hidden) return;
      if (e.target.closest("input, textarea, select, [contenteditable]")) return;
      const code = shortcutCode(e);
      // عنوان لوحة مطوية (summary) يبقى عليه التركيز بعد النقر: نترك له Space/Enter
      // (يفتح ويغلق)، وباقي الاختصارات تشتغل عادي
      if (e.target.closest("summary") && (code === "Space" || code === "Enter")) return;
      const mod = e.ctrlKey || e.metaKey;
      const onButton = e.target.closest("button, a");
      let handled = true;
      // أثناء التسجيل: لا تعديل على الطبقات (التراجع/اللصق...) — فقط تشغيل/إيقاف
      if (rec && mod) return;
      // بلا طبقات: Space وHome وEnter تبقى للصفحة (تمرير)، مو للمحرّر
      const hasLayers = studioActive() || rec;
      const plain = !mod && !e.shiftKey && !e.altKey;
      if (code === "Space" && hasLayers) {
        if (rec) stopRec();
        else if (takeTimers.length) stopTake();
        else playTake(e.shiftKey);
      } else if (code === "KeyR" && plain) {
        if (rec) stopRec();
        else startRec("notes");
      } else if (code === "KeyC" && plain) {
        toggleMetro();
      } else if (code === "Escape") {
        if (rec) stopRec();
        stopTake();
        if (edNote) {
          edNote = null;
          renderEditor();
        } else select(null);
      } else if (code === "Enter" && !onButton && studioActive()) {
        cursor = 0;
        setPlayhead(null);
      } else if ((code === "Home" || code === "End") && studioActive()) {
        cursor = code === "Home" ? 0 : snap(totalSeconds());
        setPlayhead(null);
      } else if (mod && code === "KeyZ") {
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && code === "KeyY") {
        redo();
      } else if (mod && code === "Slash") {
        if (shortcutsBox) shortcutsBox.open = !shortcutsBox.open;
      } else if (mod && (code === "KeyC" || code === "KeyX" || code === "KeyD") && selected) {
        if (code === "KeyC") copyToClipboard();
        else if (code === "KeyX") cutSelected();
        else copySelected();
      } else if (mod && code === "KeyV" && clipboard) {
        pasteClipboard();
      } else if ((code === "Delete" || code === "Backspace") && edNote && edLayer) {
        edDeleteNote(); // نغمة محددة بالمحرّر تُحذف قبل المقطع كله
      } else if ((code === "Delete" || code === "Backspace") && selected) {
        deleteSelected();
      } else if (code === "KeyS" && plain && selected) {
        splitSelected();
      } else if (code === "KeyQ" && plain && selected) {
        quantizeSelected();
      } else if (code === "KeyM" && e.shiftKey && !mod && selected) {
        toggleMute();
      } else if (code === "KeyM" && plain && studioActive()) {
        addMarker();
      } else if ((code === "Comma" || code === "Period") && plain && videoReady()) {
        stepFrame(code === "Comma" ? -1 : 1);
      } else if ((code === "ArrowLeft" || code === "ArrowRight") && !e.target.closest(".beep-clip") && studioActive()) {
        cursor = snap(cursor + (code === "ArrowRight" ? 1 : -1) * (e.shiftKey ? barSec() : gridStep() || 0.1));
        setPlayhead(null);
      } else {
        handled = false;
      }
      if (handled) e.preventDefault(); // يمنع Space يفعّل زراً مركّزاً أو يمرّر الصفحة، وCtrl+Z يتراجع بمكان ثاني
    });
  }

  /* ===== تدرّب على أغنية: نوتات مكتوبة بالحروف → تنعزف على البيانو وتنزل أعمدة =====
     الصيغة نفس مواقع مثل noobnotes: حرف لكل نغمة، ^ أعلى، . أخفض، شرطة للأسرع، ~ تطويل،
     _ سكتة، C+E+G أو [C E G] معاً، C:2 مدة. السطر اللي أغلبه مو نوتات = كلمات الأغنية.
     «استمع» يعزفها، و«تدرّب» ينتظرك عند كل نغمة لين تضغطها صح (أي مصدر: لمس/كيبورد/MIDI).
     البيانو نفسه (#beepKeysWrap) ينتقل لهذا التبويب، ونطاقه يصير نطاق الأغنية. */
  const SOLFA = { do: 0, re: 2, mi: 4, fa: 5, sol: 7, so: 7, la: 9, si: 11, ti: 11, "دو": 0, "ري": 2, "مي": 4, "فا": 5, "صول": 7, "لا": 9, "سي": 11 };
  const LETTER = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  const NOTE_RE = /^(\^*|\.*)(do|re|mi|fa|sol|so|la|si|ti|دو|ري|مي|فا|صول|لا|سي|[a-g])([#♯]|b|♭)?(\d)?$/i;
  function parseNote(tok) {
    const m = NOTE_RE.exec(tok);
    if (!m) return null;
    const name = m[2].toLowerCase();
    const pc = name.length === 1 && name in LETTER ? LETTER[name] : SOLFA[name];
    if (pc == null) return null;
    const shift = m[1].startsWith("^") ? m[1].length : -m[1].length;
    const acc = m[3] ? (m[3] === "#" || m[3] === "♯" ? 1 : -1) : 0;
    const octave = m[4] != null ? Number(m[4]) : 4 + shift;
    return clamp(12 * (octave + 1) + pc + acc, 21, 108);
  }
  // كلمة واحدة من السطر → { notes, dur } أو { hold } أو { rest } أو null (مو نوتة)
  function parseToken(tok) {
    if (/^~+$/.test(tok)) return { hold: tok.length };
    if (/^[_.]$/.test(tok)) return { rest: true };
    const [body, len] = tok.split(":");
    const notes = body.split("+").map(parseNote);
    if (!notes.length || notes.some((n) => n == null)) return null;
    return { notes, dur: Number(len) > 0 ? Number(len) : null };
  }
  // كل نغمة = نصف نبضة (ثُمن) بنفس الطول: مواقع النوتات ما تكتب المدد، والطول الموحّد يحافظ
  // على النبض (الشرطة عندهم تفصل مقاطع الكلمة فقط، مو أسرع). C:2 = ضعف الطول، ~ = خطوة زيادة
  const SONG_STEP = 0.5;
  function parseSong(text) {
    const events = [];
    const lyrics = [];
    let t = 0;
    let lineStart = -1;
    text.split(/\r?\n/).forEach((raw) => {
      // [C E G] → C+E+G، والشرطة بمسافات " - " فاصل عادي
      const line = raw
        .replace(/\[([^\]]*)\]/g, (_, inner) => inner.trim().split(/\s+/).join("+"))
        .replace(/\s+-\s+/g, " ")
        .trim();
      if (!line) return;
      const groups = line.split(/\s+/).map((w) => w.split("-").filter(Boolean).map(parseToken));
      const flat = groups.flat();
      const ok = flat.filter(Boolean).length;
      if (!ok || ok < flat.length * 0.7) {
        // سطر كلمات: يتبع سطر النوتات اللي قبله
        if (lineStart >= 0) lyrics.push({ t: lineStart, text: raw.trim() });
        return;
      }
      lineStart = t;
      groups.forEach((group) => {
        group.forEach((p) => {
          if (!p) return;
          if (p.hold) {
            const prev = events[events.length - 1];
            if (prev) prev.d += p.hold * SONG_STEP;
            t += p.hold * SONG_STEP;
          } else if (p.rest) t += SONG_STEP;
          else {
            const d = (p.dur ?? 1) * SONG_STEP;
            events.push({ notes: [...new Set(p.notes)], t, d });
            t += d;
          }
        });
      });
      t = Math.ceil(t + SONG_STEP); // نفَس قصير، والسطر الجاي يبدأ على نبضة كاملة: النبض يبقى ثابت
    });
    return { events, lyrics };
  }

  /* ملف MIDI → مسارات نغمات { name, notes: [[t, d, midi]] } بالنبضات على ٩٠ نبضة/دقيقة،
     فسرعة ١٠٠٪ = سرعة الملف الأصلية بالضبط (مع كل تغييرات السرعة داخله). الطبول (القناة ١٠)
     تُتجاهل، وكل مسار+قناة = مسار مستقل (ملفات Type 0 تحط كل الآلات بمسار واحد بقنوات). */
  function parseMidi(buf) {
    const v = new DataView(buf);
    const text = (at, n) => new TextDecoder().decode(new Uint8Array(buf, at, n));
    if (text(0, 4) !== "MThd") throw new Error("not midi");
    const ntrks = v.getUint16(10);
    const div = v.getUint16(12);
    if (div & 0x8000) throw new Error("smpte"); // ponytail: توقيت SMPTE نادر جداً بملفات الأغاني
    const tempos = [[0, 500000]];
    let barQ = 0;
    let keySig = null;
    const groups = new Map(); // "مسار:قناة" → { name, notes: [[بدايةtick, نهايةtick, midi]] }
    let p = 8 + v.getUint32(4);
    for (let k = 0; k < ntrks && p + 8 <= buf.byteLength; k++) {
      const id = text(p, 4);
      const end = Math.min(p + 8 + v.getUint32(p + 4), buf.byteLength);
      p += 8;
      if (id !== "MTrk") {
        p = end;
        continue;
      }
      let tick = 0;
      let status = 0;
      let name = "";
      const open = new Map();
      const mine = [];
      const progs = {}; // القناة → رقم الآلة (General MIDI) لتسمية المسارات اللي بلا اسم
      const vlq = () => {
        let n = 0;
        let b;
        do {
          b = v.getUint8(p++);
          n = n * 128 + (b & 0x7f);
        } while (b & 0x80);
        return n;
      };
      while (p < end) {
        tick += vlq();
        if (v.getUint8(p) & 0x80) status = v.getUint8(p++); // وإلا "running status": نفس الحالة السابقة
        if (status === 0xff) {
          const type = v.getUint8(p++);
          const len = vlq();
          if (type === 0x51 && len === 3) tempos.push([tick, v.getUint8(p) * 65536 + v.getUint16(p + 1)]);
          if (type === 0x03 && !name) name = text(p, len).trim();
          if (type === 0x59 && keySig === null) keySig = v.getInt8(p); // المفتاح: عدد الدييز (+) أو البيمول (−)
          if (type === 0x58 && !barQ) barQ = (v.getUint8(p) * 4) / 2 ** v.getUint8(p + 1); // الميزان: طول المازورة بالسوداء
          p += len;
        } else if (status === 0xf0 || status === 0xf7) p += vlq();
        else if (status >= 0x80 && status < 0xf0) {
          const type = status & 0xf0;
          const ch = status & 0x0f;
          const note = v.getUint8(p++);
          const vel = type === 0xc0 || type === 0xd0 ? 0 : v.getUint8(p++);
          if (type === 0xc0 && !(ch in progs)) progs[ch] = note;
          if (ch === 9 || (type !== 0x90 && type !== 0x80)) continue;
          const key = ch * 128 + note;
          if (type === 0x90 && vel > 0) open.set(key, [...(open.get(key) || []), tick]);
          else {
            const start = open.get(key)?.shift();
            if (start != null) mine.push([start, tick, note, ch]);
          }
        } else break; // بايت غريب: نكتفي بما قُرئ من هذا المسار
      }
      mine.forEach(([a, b, note, ch]) => {
        const g = k + ":" + ch;
        if (!groups.has(g)) groups.set(g, { name, ch, prog: progs[ch] ?? null, notes: [] });
        groups.get(g).notes.push([a, b, note]);
      });
      p = end;
    }
    // tick → ثانية عبر خريطة السرعات، ثم ثانية → نبضة على ٩٠
    tempos.sort((a, b) => a[0] - b[0]);
    const segs = [];
    tempos.forEach(([tick, us]) => {
      const prev = segs[segs.length - 1];
      segs.push({ tick, us, sec: prev ? prev.sec + ((tick - prev.tick) * prev.us) / 1e6 / div : 0 });
    });
    const beat = (tick) => {
      let sg = segs[0];
      for (const x of segs) if (x.tick <= tick) sg = x; // ponytail: بحث خطي، الملفات فيها تغييرات سرعة قليلة
      return Math.round((sg.sec + ((tick - sg.tick) * sg.us) / 1e6 / div) * 1.5 * 1000) / 1000;
    };
    const sameName = (name) => [...groups.values()].filter((g) => g.name === name).length > 1;
    const q = (tick) => Math.round((tick / div) * 1000) / 1000; // بالسوداء (للنوتة الموسيقية)
    // نغمة = [بداية, مدة] بالنبضات على ٩٠ للعزف + midi + [بداية, مدة] بالسوداء للمدرج
    const tracks = [...groups.values()].map((g) => ({
      name: g.name + (g.name && sameName(g.name) ? " " + (g.ch + 1) : ""),
      prog: g.prog,
      notes: g.notes.map(([a, b, note]) => [beat(a), Math.max(0.05, beat(b) - beat(a)), note, q(a), q(b - a)]).sort((x, y) => x[0] - y[0]),
    }));
    return { tracks, barQ: barQ || 4, key: clamp(keySig || 0, -7, 7) };
  }
  /* ===== MusicXML (من MuseScore / Sibelius / Finale): كل مدرج مسار (🫱 يمين، 🫲 يسار)، بالمدد
     الموسيقية الحقيقية والميزان والمفتاح والسرعة. يفهم الكورد، الربط، backup/forward (أكثر من صوت
     بالمازورة)، ويتجاهل النوتات الزخرفية. ‏.mxl = نفس الملف مضغوط ZIP. */
  function parseMusicXml(xml) {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    if (doc.querySelector("parsererror") || !doc.querySelector("score-partwise")) throw new Error("not musicxml"); // ponytail: score-timewise نادر
    const num = (el, sel, d = 0) => {
      const x = el.querySelector(sel);
      return x && x.textContent.trim() !== "" ? Number(x.textContent) : d;
    };
    const qpm = Number(doc.querySelector("sound[tempo]")?.getAttribute("tempo")) || num(doc, "metronome per-minute", 120) || 120; // ponytail: سرعة وحدة للمقطوعة كلها
    const time = doc.querySelector("time");
    const barQ = time ? (num(time, "beats", 4) * 4) / num(time, "beat-type", 4) : 4;
    const key = clamp(Math.round(num(doc, "key fifths", 0)), -7, 7);
    const names = {};
    doc.querySelectorAll("score-part").forEach((sp) => (names[sp.id] = sp.querySelector("part-name")?.textContent.trim() || ""));
    const STEPS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    const r3 = (x) => Math.round(x * 1000) / 1000;
    const tracks = new Map();
    doc.querySelectorAll("part").forEach((part) => {
      const staves = num(part, "attributes staves", 1);
      let div = 1;
      let pos = 0;
      let lastStart = 0;
      const open = new Map(); // نغمة مربوطة بالجاية: "مدرج:midi" → النغمة
      part.querySelectorAll(":scope > measure").forEach((measure) => {
        for (const el of measure.children) {
          if (el.tagName === "attributes") div = num(el, "divisions", div) || div;
          else if (el.tagName === "backup") pos -= num(el, "duration") / div;
          else if (el.tagName === "forward") pos += num(el, "duration") / div;
          else if (el.tagName === "note" && !el.querySelector("grace")) {
            const dur = num(el, "duration") / div;
            const start = el.querySelector("chord") ? lastStart : pos;
            if (!el.querySelector("chord")) {
              lastStart = pos;
              pos += dur;
            }
            const p = el.querySelector("pitch");
            if (!p) continue; // سكتة
            const midi = clamp(12 * (num(p, "octave", 4) + 1) + STEPS[p.querySelector("step").textContent.trim()] + num(p, "alter", 0), 21, 108);
            const staff = num(el, "staff", 1);
            const id = part.id + ":" + staff;
            if (!tracks.has(id)) tracks.set(id, { name: (staves > 1 ? (staff === 1 ? "🫱 " : "🫲 ") : "") + (names[part.id] || ""), notes: [] });
            const ties = [...el.querySelectorAll(":scope > tie")].map((t) => t.getAttribute("type"));
            const tieKey = id + ":" + midi;
            if (ties.includes("stop") && open.has(tieKey)) {
              open.get(tieKey)[1] += dur; // امتداد للمربوطة بدل ضربة جديدة
              if (!ties.includes("start")) open.delete(tieKey);
              continue;
            }
            const n = [start, dur, midi];
            tracks.get(id).notes.push(n);
            if (ties.includes("start")) open.set(tieKey, n);
          }
        }
      });
    });
    // نفس شكل مسارات MIDI: [بداية, مدة] بالنبضات على ٩٠ للعزف + midi + [بداية, مدة] بالسوداء للمدرج
    const out = [...tracks.values()]
      .filter((t) => t.notes.length)
      .map((t) => ({
        name: t.name,
        prog: null,
        notes: t.notes.map(([q, d, m]) => [r3((q * 90) / qpm), Math.max(0.05, r3((d * 90) / qpm)), m, r3(q), r3(d)]).sort((a, b) => a[0] - b[0]),
      }));
    return { tracks: out, barQ, key };
  }
  // ‏.mxl: نقرأ ZIP يدوياً (الفهرس بآخر الملف) ونفك أول ملف XML بـDecompressionStream المدمجة
  async function unzipMusicXml(buf) {
    const v = new DataView(buf);
    let e = buf.byteLength - 22;
    while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0) throw new Error("zip");
    const entries = [];
    for (let i = 0, p = v.getUint32(e + 16, true); i < v.getUint16(e + 10, true) && v.getUint32(p, true) === 0x02014b50; i++) {
      const nlen = v.getUint16(p + 28, true);
      entries.push({ name: new TextDecoder().decode(new Uint8Array(buf, p + 46, nlen)), method: v.getUint16(p + 10, true), size: v.getUint32(p + 20, true), off: v.getUint32(p + 42, true) });
      p += 46 + nlen + v.getUint16(p + 30, true) + v.getUint16(p + 32, true);
    }
    const f = entries.find((x) => /\.(musicxml|xml)$/i.test(x.name) && !x.name.startsWith("META-INF"));
    if (!f) throw new Error("no score in zip");
    const data = new Uint8Array(buf, f.off + 30 + v.getUint16(f.off + 26, true) + v.getUint16(f.off + 28, true), f.size);
    if (f.method === 0) return new TextDecoder().decode(data);
    if (f.method !== 8) throw new Error("zip method");
    return new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text();
  }

  // المسارات اللي تشتغل أول ما يفتح الملف: البيانو/اللحن لو مسمّاة، وإلا الأكثر نغمات
  function defaultTracks(tracks) {
    const named = tracks.map((t) => /piano|melod|vocal|voice|lead|right|left|treble|bass clef|بيانو|لحن/i.test(t.name) || (!t.name && t.prog != null && t.prog < 8));
    if (named.some(Boolean)) return named;
    const most = Math.max(...tracks.map((t) => t.notes.length));
    return tracks.map((t) => t.notes.length === most);
  }
  // ملف .hakolah جاي من برّا: نتأكد إن شكل المسارات سليم قبل ما نعتمد عليه
  function cleanMidiSong(m) {
    if (!m || !Array.isArray(m.tracks) || !m.tracks.length || m.tracks.length > 64) return null;
    const tracks = m.tracks.map((t) => ({
      name: String(t?.name || "").slice(0, 60),
      prog: Number.isInteger(t?.prog) ? clamp(t.prog, 0, 127) : null,
      notes: (Array.isArray(t?.notes) ? t.notes : [])
        .slice(0, 50000)
        .filter((n) => Array.isArray(n) && (n.length === 3 || n.length === 5) && n.every(Number.isFinite) && n[0] >= 0 && n[1] > 0)
        .map(([t0, d, m2, ...qs]) => [t0, d, clamp(Math.round(m2), 0, 127), ...qs]),
    }));
    const on = Array.isArray(m.on) && m.on.length === tracks.length ? m.on.map(Boolean) : defaultTracks(tracks);
    return { tracks, on, hand: ["right", "left"].includes(m.hand) ? m.hand : "both", barQ: m.barQ > 0 && m.barQ <= 16 ? m.barQ : 4, key: Number.isInteger(m.key) && Math.abs(m.key) <= 7 ? m.key : 0 };
  }

  /* ===== صيغة ABC (للمحترف): الصيغة النصية المعيارية للنوتة — X: T: M: L: Q: K: ثم النغمات.
     الحرف الكبير = الأوكتاف الوسطى (C = Do الوسطى)، الصغير أعلى بأوكتاف، ' أعلى و, أخفض،
     ^ دييز _ بيمول = بيكار، الرقم/الكسر بعد النغمة = المدة بوحدة L، z سكتة، [CEG] كورد،
     - ربط، > و< إيقاع منقوط، (3 ثلاثية، | فاصل مازورة (التحويلات تنتهي معه).
     تُعرف من سطر K: (حرف ثم نقطتين بأول السطر)، فما تختلط بصيغة الحروف البسيطة. */
  const isAbc = (text) => /^K:/m.test(text) && /^[XTMLQ]:/m.test(text);
  // عدد الدييز (+) أو البيمول (−) لكل مفتاح، للكبير والصغير
  const KEY_FIFTHS = { C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, "F#": 6, "C#": 7, F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6, Cb: -7 };
  const MINOR_FIFTHS = { A: 0, E: 1, B: 2, "F#": 3, "C#": 4, "G#": 5, "D#": 6, "A#": 7, D: -1, G: -2, C: -3, F: -4, Bb: -5, Eb: -6, Ab: -7 };
  function keyFifths(k) {
    const m = /^\s*([A-G][#b]?)\s*(m(?:in(?:or)?)?\b|maj(?:or)?\b)?/i.exec(k || "C");
    if (!m) return 0;
    const tonic = m[1][0].toUpperCase() + m[1].slice(1);
    const minor = m[2] && /^m(in)?/i.test(m[2]) && !/^maj/i.test(m[2]);
    return (minor ? MINOR_FIFTHS : KEY_FIFTHS)[tonic] ?? 0; // ponytail: الأنماط (Dorian...) تُعامل كبير
  }
  // تحويلات علامة المفتاح لكل حرف (C=0 … B=6)
  function keyAlters(fifths) {
    const alt = [0, 0, 0, 0, 0, 0, 0];
    [3, 0, 4, 1, 5, 2, 6].slice(0, Math.max(0, fifths)).forEach((l) => (alt[l] = 1)); // F C G D A E B
    [6, 2, 5, 1, 4, 0, 3].slice(0, Math.max(0, -fifths)).forEach((l) => (alt[l] = -1)); // B E A D G C F
    return alt;
  }
  const frac = (s) => {
    const [a, b] = s.split("/").map(Number);
    return b ? a / b : a;
  };
  function parseAbc(text) {
    const head = {};
    const body = [];
    let inBody = false;
    text.split(/\r?\n/).forEach((raw) => {
      const line = raw.replace(/%.*$/, "");
      const h = /^([A-Za-z]):\s*(.*)$/.exec(line);
      if (h && (!inBody || "KMLQVPW".includes(h[1].toUpperCase()))) {
        if (h[1] === "K") inBody = true;
        if (!(h[1] in head) || "KML".includes(h[1])) head[h[1]] = h[2].trim();
        return; // ponytail: تغيير المفتاح/الميزان وسط المقطوعة يأخذ آخر قيمة للكل
      }
      if (inBody) body.push(line);
    });
    const meter = head.M === "C" ? "4/4" : head.M === "C|" ? "2/2" : head.M || "4/4";
    const barQ = meter.includes("/") ? frac(meter) * 4 : 4;
    const unit = head.L ? frac(head.L) : frac(meter) < 0.75 ? 1 / 16 : 1 / 8; // بالمستديرة
    const qm = /(?:(\d+\/\d+)\s*=\s*)?(\d+)\s*$/.exec(head.Q || "");
    const qpm = qm ? Number(qm[2]) * (qm[1] ? frac(qm[1]) * 4 : 1) : 120; // سوداء بالدقيقة
    const fifths = keyFifths(head.K);
    const keyAlt = keyAlters(fifths);
    const events = [];
    const ties = new Map(); // نغمة مربوطة بالجاية: midi → [حدث, رقمها فيه]
    let q = 0;
    let barAlt = new Map(); // تحويلات هذه المازورة: "حرف+أوكتاف" → تحويل
    let tuplet = 0;
    let tupletLeft = 0;
    let broken = 1; // مضاعف المدة الجاية بعد > أو <
    const src = body.join("\n").replace(/![^!\n]*!|\+[^+\n]*\+|"[^"\n]*"|\{[^}]*\}/g, " "); // زخارف/كوردات نصية/زخارف سريعة
    const NOTE = /(\^\^|\^|__|_|=)?([A-Ga-g])([',]*)(\d*\/*\d*)(-?)/y;
    const pcOfLetter = [0, 2, 4, 5, 7, 9, 11];
    const pitch = (acc, letter, marks) => {
      const l = "CDEFGAB".indexOf(letter.toUpperCase());
      let oct = letter === letter.toUpperCase() ? 4 : 5;
      for (const c of marks) oct += c === "'" ? 1 : -1;
      const id = l + ":" + oct;
      let alter;
      if (acc) {
        alter = { "^^": 2, "^": 1, "=": 0, _: -1, __: -2 }[acc];
        barAlt.set(id, alter);
      } else alter = barAlt.has(id) ? barAlt.get(id) : keyAlt[l];
      return clamp(12 * (oct + 1) + pcOfLetter[l] + alter, 21, 108);
    };
    const lenOf = (s) => {
      if (!s) return 1;
      const m = /^(\d*)(\/*)(\d*)$/.exec(s);
      const num = m[1] ? Number(m[1]) : 1;
      const den = m[3] ? Number(m[3]) : 2 ** m[2].length;
      return m[2] ? num / den : num;
    };
    const take = () => {
      let f = broken;
      broken = 1;
      if (tupletLeft > 0) {
        f *= tuplet;
        tupletLeft--;
      }
      return f;
    };
    const place = (notes, len) => {
      // notes: [[midi, tie]] — مدة بالسوداء
      const qd = unit * 4 * len;
      const fresh = [];
      notes.forEach(([m, tie]) => {
        const held = ties.get(m);
        ties.delete(m);
        if (held) {
          held[0].qd[held[1]] += qd; // امتداد للنغمة المربوطة بدل ضربة جديدة
          if (tie) ties.set(m, held);
        } else fresh.push([m, tie]);
      });
      if (fresh.length) {
        const ev = { q, notes: [], qd: [] };
        fresh.forEach(([m, tie]) => {
          if (ev.notes.includes(m)) return;
          ev.notes.push(m);
          ev.qd.push(qd);
          if (tie) ties.set(m, [ev, ev.notes.length - 1]);
        });
        events.push(ev);
      }
      q += qd;
      return qd;
    };
    for (let i = 0; i < src.length; ) {
      const c = src[i];
      NOTE.lastIndex = i;
      const n = NOTE.exec(src);
      if (n) {
        const f = take();
        const len = lenOf(n[4]) * f;
        i = NOTE.lastIndex;
        const prev = place([[pitch(n[1], n[2], n[3]), n[5] === "-"]], len);
        if (src[i] === ">" || src[i] === "<") {
          // A>B: الأولى منقوطة والثانية نصف
          const longer = src[i] === ">";
          q -= prev;
          const ev = events[events.length - 1];
          const qd = prev * (longer ? 1.5 : 0.5);
          if (ev && ev.q === q) ev.qd = ev.qd.map(() => qd);
          q += qd;
          broken = longer ? 0.5 : 1.5;
          i++;
        }
      } else if (c === "[" && /^\[[\^_=A-Ga-g]/.test(src.slice(i, i + 3))) {
        const end = src.indexOf("]", i);
        if (end < 0) break;
        const inner = src.slice(i + 1, end);
        const notes = [];
        let shortest = Infinity;
        for (const m of inner.matchAll(/(\^\^|\^|__|_|=)?([A-Ga-g])([',]*)(\d*\/*\d*)(-?)/g)) {
          notes.push([pitch(m[1], m[2], m[3]), m[5] === "-"]);
          shortest = Math.min(shortest, lenOf(m[4]));
        }
        const after = /^(\d*\/*\d*)(-?)/.exec(src.slice(end + 1));
        i = end + 1 + after[0].length;
        if (after[2]) notes.forEach((x) => (x[1] = true));
        if (notes.length) place(notes, (shortest === Infinity ? 1 : shortest) * lenOf(after[1]) * take());
      } else if (c === "z" || c === "x" || c === "Z") {
        const m = /^[zxZ](\d*\/*\d*)/.exec(src.slice(i));
        i += m[0].length;
        q += c === "Z" ? barQ * (Number(m[1]) || 1) : unit * 4 * lenOf(m[1]) * take();
      } else if (c === "(" && /\d/.test(src[i + 1])) {
        const p = Number(src[i + 1]);
        tuplet = p === 3 ? 2 / 3 : p === 2 ? 3 / 2 : p === 4 ? 3 / 4 : 2 / p;
        tupletLeft = p;
        i += 2;
      } else {
        if (c === "|" || c === ":" || c === "]") barAlt = new Map();
        i++;
      }
    }
    // للعزف: نبضات على ٩٠ (مثل MIDI) من سرعة المقطوعة
    events.forEach((ev) => {
      ev.t = (ev.q * 90) / qpm;
      ev.durs = ev.qd.map((d) => (d * 90) / qpm);
      ev.d = Math.max(...ev.durs);
    });
    return { events, lyrics: [], barQ, key: fifths, title: head.T || "" };
  }

  const songBox = document.getElementById("songPractice");
  let songRange = null; // { lo, hi } لما تبويب التدريب مفتوح وفيه أغنية
  let songHit = () => {};
  let songRelabel = () => {}; // أسماء المفاتيح تغيّرت: أسماء الأعمدة والنوتة تتبعها
  if (songBox && playBox) {
    const $ = (id) => document.getElementById(id);
    const lane = document.createElement("div");
    lane.className = "song-lane";
    lane.hidden = true;
    lane.innerHTML = '<div class="song-track"></div><div class="song-hitline"></div>';
    playBox.before(lane);
    lane.before(document.getElementById("songLyric"), document.getElementById("songStaff"), document.getElementById("songTimeline")); // الكلمات والشريط الزمني فوق الأعمدة مباشرة
    document.getElementById("songLyric").hidden = true;
    const track = lane.firstChild;
    const textEl = $("songText");
    const titleEl = $("songTitle");
    const listEl = $("songList");
    const statusEl = $("songStatus");
    const lyricEl = $("songLyric");
    const listenBtn = $("songListen");
    const trainBtn = $("songTrain");
    [listenBtn, trainBtn].forEach((b) => (b.dataset.idle = b.textContent));
    const SONGS_KEY = "hakolahSongs";
    const DEMO = "E E F G G F E D\nC C D E E:1.5 D:0.5 D:2\nE E F G G F E D\nC C D E D:1.5 C:0.5 C:2";
    let speed = Number(store.get("songSpeed")) || 1;
    let parsed = { events: [], lyrics: [] };
    const readSongs = () => {
      try {
        return JSON.parse(store.get(SONGS_KEY)) || [];
      } catch {
        return [];
      }
    };
    const active = () => !$("panePractice").hidden;
    const setStatus = (text) => (statusEl.textContent = text || "");
    const keyEl = (m) => playBox.querySelector(`[data-midi="${m}"]`);

    // نطاق البيانو = نطاق الأغنية (أوكتافات كاملة، اثنان على الأقل)، والكيبورد على أخفضها
    function fitKeys() {
      const all = parsed.events.flatMap((e) => e.notes);
      if (active() && writing) songRange = { lo: 48, hi: 83 }; // الكتابة: «تحت» و«الوسط» و«فوق» دائماً، مو نطاق اللي انكتب بس
      else if (!active() || !all.length) songRange = null;
      else {
        const lo = Math.floor(Math.min(...all) / 12) * 12;
        const hi = Math.max(Math.ceil((Math.max(...all) + 1) / 12) * 12 - 1, lo + 23);
        songRange = { lo: Math.max(21, lo), hi: Math.min(108, hi) };
        playOctave = clamp(Math.floor(songRange.lo / 12) - 1, 1, 7);
      }
      renderPlayKeys();
      buildBars();
    }
    /* عمود لكل نغمة، موضعه الأفقي من مفتاحها (بالنسبة المئوية فيتبع أي عرض). مواقع المفاتيح تُقاس
       مرة وحدة قبل أي إضافة، والأعمدة تنضاف دفعة وحدة: القياس بعد كل إضافة كان يعيد تخطيط الصفحة
       مع كل عمود (٩٥٠ عمود بملف MIDI = ثواني على الجوال). والارتفاع والموضع العمودي بمتغير --ppb،
       فتغيّر مقاس الممر يحدّث متغيراً واحداً بدل إعادة البناء */
    let unit = 0; // بكسل لكل نبضة: الممر يعرض ٤ نبضات قادمة
    let barsOf = []; // أعمدة كل نغمة/كورد، فتلوين الجاية والمنتهية ما يمر على كل الأعمدة
    function setUnit() {
      unit = lane.clientHeight / 4;
      track.style.setProperty("--ppb", unit + "px");
      moveTrack();
    }
    function buildBars() {
      const w = playBox.offsetWidth || 1;
      const names = labelMode === "solfege" ? "solfege" : "letters";
      const at = {};
      playBox.querySelectorAll("[data-midi]").forEach((k) => {
        const black = k.classList.contains("pk-black");
        at[k.dataset.midi] = { left: ((k.offsetLeft - (black ? k.offsetWidth / 2 : 0)) / w) * 100, width: (k.offsetWidth / w) * 100, black };
      });
      const frag = document.createDocumentFragment();
      barsOf = parsed.events.map((ev, i) =>
        ev.notes.flatMap((m, j) => {
          const k = at[m];
          if (!k) return [];
          const bar = document.createElement("div");
          bar.className = "song-bar" + (k.black ? " black" : "");
          bar.dataset.i = i;
          // MIDI: كل نغمة بطولها
          bar.style.cssText = `left:${k.left}%;width:${k.width}%;bottom:calc(var(--ppb) * ${ev.t});height:max(8px, calc(var(--ppb) * ${ev.durs?.[j] ?? ev.d} - 3px))`;
          bar.textContent = noteName(m, names);
          frag.append(bar);
          return [bar];
        })
      );
      track.replaceChildren(frag);
      markedNext = -1;
      markBars();
      setUnit();
    }
    const moveTrack = () => (track.style.transform = `translateY(${play.pos * unit}px)`);
    let markedNext = -1;
    let staffOf = []; // عنصر كل نغمة/كورد على المدرج (لما يكون ظاهر)
    const mark = (i, c, on) => {
      barsOf[i]?.forEach((x) => x.classList.toggle(c, on));
      staffOf[i]?.classList.toggle(c === "now" ? "on" : c, on);
    };
    function markBars() {
      const next = play.next;
      if (next === markedNext) return;
      if (markedNext < 0 || next < markedNext) barsOf.forEach((_, i) => mark(i, "done", i < next)); // بناء جديد أو رجوع للخلف
      else for (let i = markedNext; i < next; i++) mark(i, "done", true);
      mark(markedNext, "now", false);
      mark(next, "now", true);
      markedNext = next;
      const g = staffOf[next];
      if (g) staffEl.scrollLeft = Number(g.dataset.x) - staffEl.clientWidth / 3; // المدرج يمشي مع النغمة الجاية
    }
    function markWanted(ev) {
      playBox.querySelectorAll(".want").forEach((k) => k.classList.remove("want"));
      ev?.notes.forEach((m) => keyEl(m)?.classList.add("want"));
    }
    function lyricAt(pos) {
      let text = "";
      parsed.lyrics.forEach((l) => l.t <= pos + 0.5 && (text = l.text));
      if (lyricEl.textContent !== text) lyricEl.textContent = text;
    }
    // ملف MIDI مفتوح: نغمات المسارات المختارة، والنغمات اللي تبدأ مع بعض = ضغطة وحدة (كورد)
    let midiSong = null; // { tracks: [{ name, notes: [[t, d, midi]] }], on: [true/false لكل مسار], hand }
    // اليد: يمين = من Do الوسطى (60) وفوق، يسار = تحتها — نفس تقسيم برامج تعليم البيانو
    const inHand = (m) => (midiSong.hand === "right" ? m >= 60 : midiSong.hand === "left" ? m < 60 : true);
    function midiEvents() {
      // نغمات مدرج اليد اليسرى (🫲 من MusicXML) تنرسم على مفتاح فا مهما علت، واليمنى على صول
      const notes = midiSong.tracks
        .flatMap((t, i) => (midiSong.on[i] ? t.notes.map((n) => [...n.slice(0, 5), t.name.startsWith("🫲") ? 1 : t.name.startsWith("🫱") ? 0 : null]) : []))
        .filter((n) => inHand(n[2]))
        .sort((a, b) => a[0] - b[0]);
      const events = [];
      notes.forEach(([t, d, m, q, qd, lh]) => {
        const ev = events[events.length - 1];
        if (ev && t - ev.t < 0.06) {
          if (ev.notes.includes(m)) return;
          ev.notes.push(m);
          ev.durs.push(d);
          ev.qd.push(qd);
          ev.lh.push(lh);
          ev.d = Math.max(ev.d, d);
        } else events.push({ t, d, notes: [m], durs: [d], q, qd: [qd], lh: [lh] });
      });
      return { events, lyrics: [], barQ: midiSong.barQ, key: midiSong.key || 0 };
    }
    const tracksBox = $("songTracks");
    function renderTracks() {
      tracksBox.hidden = !midiSong;
      textEl.hidden = !!midiSong;
      $("songEditor").querySelectorAll(".beep-param-note, #songWrite, #songChips").forEach((x) => (x.hidden = !!midiSong)); // أدوات الكتابة بالحروف ما تخص ملف MIDI
      if (!midiSong) return;
      const box = $("songTrackChips");
      box.replaceChildren();
      midiSong.tracks.forEach((t, i) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "filter-chip" + (midiSong.on[i] ? " active" : "");
        chip.setAttribute("aria-pressed", String(midiSong.on[i]));
        // بلا اسم: عائلة الآلة من رقمها (كل ٨ أرقام عائلة: بيانو، غيتار، باص...)
        const family = t.prog != null ? tracksBox.dataset.families.split("|")[t.prog >> 3] : "";
        chip.textContent = (t.name || family || tracksBox.dataset.track + " " + (i + 1)) + " · " + t.notes.length;
        chip.addEventListener("click", () => {
          midiSong.on[i] = !midiSong.on[i];
          pauseSong();
          saveDraft();
          renderTracks();
          loadText();
          playClickSound();
        });
        box.append(chip);
      });
      $("songHands").querySelectorAll("[data-hand]").forEach((c) => {
        c.classList.toggle("active", c.dataset.hand === (midiSong.hand || "both"));
        c.setAttribute("aria-pressed", String(c.classList.contains("active")));
      });
    }
    $("songHands").addEventListener("click", (e) => {
      const chip = e.target.closest("[data-hand]");
      if (!chip || !midiSong) return;
      midiSong.hand = chip.dataset.hand;
      pauseSong();
      saveDraft();
      renderTracks();
      loadText();
      playClickSound();
    });
    // صمت طويل بين نغمتين (أكثر من ٤ نبضات، مثلاً مقدمة لآلات ما اخترتها) ينضغط لنبضتين:
    // الأعمدة والشريط والصوت كلها تمشي على نفس الوقت المضغوط
    function compressGaps(p) {
      let shift = 0;
      let end = -Infinity;
      const cuts = [];
      p.events.forEach((e) => {
        if (e.t - end > 4 && end > -Infinity) {
          shift += e.t - end - 2;
          cuts.push([e.t, shift]);
        }
        end = Math.max(end, e.t + e.d);
        e.t -= shift;
      });
      p.lyrics.forEach((l) => (l.t -= cuts.filter(([t]) => t <= l.t).pop()?.[1] || 0));
      return p;
    }
    // keep: نفس الأغنية (رجعت للتبويب) — نخلي الموضع؛ وإلا تبدأ من أولها
    // «بسّط اللوحة»: كل نغمة تنطوي (بأوكتافات كاملة) داخل أوكتافين حول وسط اللحن، فالبيانو
    // يصير ٢٤ مفتاحاً كبيراً بدل نطاق عريض بمفاتيح ضيقة؛ والنغمات المتكررة بعد الطي تندمج
    let simple = store.get("songSimple") === "1";
    function foldEvents(p) {
      const all = p.events.flatMap((e) => e.notes).sort((a, b) => a - b);
      if (!all.length || all[all.length - 1] - all[0] < 24) return p; // يتسع أصلاً
      const lo = Math.round((all[all.length >> 1] - 12) / 12) * 12;
      const fold = (m) => lo + ((((m - lo) % 24) + 24) % 24);
      p.events.forEach((e) => {
        const notes = [];
        const durs = [];
        const qd = [];
        const lh = [];
        e.notes.forEach((m, j) => {
          const f = fold(m);
          if (notes.includes(f)) return;
          notes.push(f);
          durs.push(e.durs?.[j] ?? e.d);
          qd.push(e.qd?.[j]);
          lh.push(e.lh?.[j]);
        });
        e.notes = notes;
        e.durs = durs;
        if (e.qd) e.qd = qd;
        if (e.lh) e.lh = lh;
      });
      return p;
    }
    /* ===== النوتة الموسيقية للي يقرأ النوتة: مدرج صول + فا (من Do الوسطى وفوق على صول)، نفس
       نغمات الأعمدة، والجاية تضيء. الموضع = درجة بالسلّم (Do4 = 28، الخط الأسفل بصول Mi4 = 30) */
    const staffEl = $("songStaff");
    let showStaff = store.get("songStaff") === "1";
    // نغمة (٠–١١) → [الحرف ٠–٦، التحويل]: بالدييز، وبالبيمول لمفاتيح البيمول
    const SPELL_SHARP = [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [3, 0], [3, 1], [4, 0], [4, 1], [5, 0], [5, 1], [6, 0]];
    const SPELL_FLAT = [[0, 0], [1, -1], [1, 0], [2, -1], [2, 0], [3, 0], [4, -1], [4, 0], [5, -1], [5, 0], [6, -1], [6, 0]];
    const HEAD_NAMES = ["CDEFGAB".split(""), ["Do", "Re", "Mi", "Fa", "Sol", "La", "Si"]];
    const W = 56; // بكسل لكل سوداء
    const GAP = 34; // مسافة بين مدرج صول ومدرج فا
    function renderSongStaff() {
      staffOf = [];
      staffEl.hidden = !showStaff || !active() || !parsed.events.length;
      if (staffEl.hidden) return;
      // ملف MIDI/MusicXML/ABC: المدد الموسيقية الحقيقية (بالسوداء) والميزان؛ المكتوب بالحروف: نبضاته نفسها
      const musical = parsed.events[0].q != null;
      const tOf = (ev) => (musical ? ev.q : ev.t);
      const dOf = (ev, j) => (musical ? ev.qd[j] : (ev.durs?.[j] ?? ev.d));
      const barLen = parsed.barQ || 4;
      const key = parsed.key || 0;
      const keyAlt = keyAlters(key);
      // التهجئة من المفتاح: مفاتيح البيمول تكتب B♭ لا A♯ — [الحرف ٠–٦، التحويل]
      const spell = (m) => (key < 0 ? SPELL_FLAT : SPELL_SHARP)[pcOf(m)];
      const posOf = (m) => octaveOf(m) * 7 + spell(m)[0];
      const solfa = labelMode === "solfege";
      const onTreble = (ev, j) => (ev.lh?.[j] != null ? !ev.lh[j] : ev.notes[j] >= 60);
      const placed = parsed.events.flatMap((e) => e.notes.map((m, j) => [posOf(m), onTreble(e, j)]));
      const top = Math.max(42, ...placed.filter(([, tr]) => tr).map(([p]) => p)) + 2;
      const low = Math.min(14, ...placed.filter(([, tr]) => !tr).map(([p]) => p)) - 2;
      const y = (p, treble) => 10 + (top - p) * STEP + (treble ? 0 : GAP);
      const t0 = Math.min(...parsed.events.map(tOf));
      const tEnd = Math.max(...parsed.events.flatMap((e) => e.notes.map((_, j) => tOf(e) + dOf(e, j))));
      const startX = 54 + Math.abs(key) * 9;
      const xOf = (t) => startX + (t - t0) * W;
      const width = xOf(tEnd) + 30;
      let out = "";
      [30, 32, 34, 36, 38].forEach((p) => (out += `<line class="st-line" x1="0" x2="${width}" y1="${y(p, true)}" y2="${y(p, true)}"/>`));
      [18, 20, 22, 24, 26].forEach((p) => (out += `<line class="st-line" x1="0" x2="${width}" y1="${y(p)}" y2="${y(p)}"/>`));
      out += `<text class="st-clef" x="4" y="${y(30, true) + 10}">𝄞</text><text class="st-clef st-bass" x="6" y="${y(22) + 9}">𝄢</text>`;
      // علامة المفتاح على المدرجين (فا أخفض بأوكتافين = ١٤ درجة)
      const sig = key > 0 ? [38, 35, 39, 36, 33, 37, 34] : [34, 37, 33, 36, 32, 35, 31];
      for (let k = 0; k < Math.abs(key); k++) {
        const ch = key > 0 ? "♯" : "♭";
        out += `<text class="st-acc" x="${40 + k * 9}" y="${y(sig[k], true) + 5}">${ch}</text><text class="st-acc" x="${40 + k * 9}" y="${y(sig[k] - 14) + 5}">${ch}</text>`;
      }
      // فواصل المازورات بأرقامها (يحتاجها المحترف للتنقل وتكرار مقطع)
      const barOf = (t) => Math.floor(t / barLen + 1e-6);
      out += `<text class="st-barno" x="${startX - 6}" y="${y(top - 1, true)}">${barOf(t0) + 1}</text>`;
      for (let bar = Math.ceil((t0 + 0.001) / barLen) * barLen; bar < tEnd; bar += barLen) {
        const bx = xOf(bar) - 8;
        out += `<line class="st-bar" x1="${bx}" x2="${bx}" y1="${y(38, true)}" y2="${y(18)}"/><text class="st-barno" x="${bx + 3}" y="${y(top - 1, true)}">${barOf(bar) + 1}</text>`;
      }
      let seen = new Map(); // تحويلات المازورة الحالية: "حرف:أوكتاف" → تحويل
      let curBar = -1;
      parsed.events.forEach((ev, i) => {
        const x = xOf(tOf(ev));
        if (barOf(tOf(ev)) !== curBar) {
          curBar = barOf(tOf(ev));
          seen = new Map();
        }
        let g = "";
        ev.notes.forEach((m, j) => {
          const [letter, alter] = spell(m);
          const p = posOf(m);
          const d = dOf(ev, j);
          const tr = onTreble(ev, j);
          const ny = y(p, tr);
          const ledger = (q) => (g += `<line class="st-line" x1="${x - 10}" x2="${x + 10}" y1="${y(q, tr)}" y2="${y(q, tr)}"/>`);
          if (tr) {
            for (let q = 28; q >= p; q -= 2) ledger(q);
            for (let q = 40; q <= p; q += 2) ledger(q);
          } else {
            for (let q = 28; q <= p; q += 2) ledger(q);
            for (let q = 16; q >= p; q -= 2) ledger(q);
          }
          // علامة التحويل فقط لما تخالف المفتاح (أو تحويلاً سابقاً بنفس المازورة)، مرة وحدة بالمازورة
          const id = letter + ":" + octaveOf(m);
          const expected = seen.has(id) ? seen.get(id) : keyAlt[letter];
          if (alter !== expected) {
            g += `<text class="st-acc" x="${x - 19}" y="${ny + 5}">${alter > 0 ? "♯" : alter < 0 ? "♭" : "♮"}</text>`;
            seen.set(id, alter);
          }
          // القيمة: مستديرة/بيضاء مفرّغة، والثُّمن بعلم وذات السنّين بعلمين، والمنقوطة بنقطة
          const base = 2 ** Math.floor(Math.log2(Math.max(d, 0.125)) + 1e-9);
          const dotted = Math.abs(d / base - 1.5) < 0.02;
          const hollow = base >= 2;
          g += `<ellipse class="st-head${hollow ? " hollow" : ""}" cx="${x}" cy="${ny}" rx="7.5" ry="5.8"/>`;
          g += `<text class="st-name${hollow ? " hollow" : ""}${solfa ? " solfa" : ""}" x="${x}" y="${ny}">${HEAD_NAMES[solfa ? 1 : 0][letter]}</text>`;
          if (dotted) g += `<circle class="st-head" cx="${x + 12}" cy="${ny - (p % 2 === 0 ? STEP : 0)}" r="1.8"/>`;
          if (base < 4) {
            const up = p < (tr ? 34 : 22);
            const sx = up ? x + 7.3 : x - 7.3;
            const ey = ny + (up ? -32 : 32);
            g += `<line class="st-stem" x1="${sx}" x2="${sx}" y1="${ny}" y2="${ey}"/>`;
            const flags = base <= 0.25 ? 2 : base <= 0.5 ? 1 : 0;
            for (let f = 0; f < flags; f++) {
              const fy = ey + (up ? f * 7 : -f * 7);
              g += `<path class="st-flag" d="M${sx} ${fy} c 0 ${up ? 6 : -6} 9 ${up ? 8 : -8} 7 ${up ? 17 : -17}"/>`;
            }
          }
        });
        out += `<g class="st-note" data-i="${i}" data-x="${x}">${g}</g>`;
      });
      // ponytail: الثُّمن بأعلام منفصلة لا بأعمدة ربط، وبلا رسم للسكتات — يكفي للقراءة والتدريب
      staffEl.innerHTML = `<svg width="${width}" height="${y(low) + 14}" aria-hidden="true">${out}</svg>`;
      staffEl.querySelectorAll(".st-note").forEach((g) => (staffOf[g.dataset.i] = g));
      markedNext = -1;
      markBars();
    }
    function loadText(keep = false) {
      const was = play.pos;
      parsed = compressGaps(midiSong ? midiEvents() : isAbc(textEl.value) ? parseAbc(textEl.value) : parseSong(textEl.value));
      if (simple) foldEvents(parsed);
      setStatus(parsed.events.length ? parsed.events.length + songBox.dataset.notes : "");
      if (keep) {
        play.pos = clamp(was, startPos(), endPos());
        play.next = nextAt(play.pos);
      } else resetPos();
      fitKeys();
      render();
      renderChips();
      renderSongStaff();
    }

    /* ===== التشغيل: موضع واحد (play.pos بالنبضات) يبقى لين تغيّر الأغنية =====
       الزر نفسه يوقف مؤقتاً ويكمل من مكانه، ⏮ يرجع للبداية، والشريط يقفز لأي نقطة.
       «استمع» يجدول النغمات مسبقاً على ساعة الصوت (مو مع كل إطار رسم)، فيكمل حتى لو
       رحت لنافذة ثانية — المتصفح يوقف الرسم بالخلفية ويبطّئ المؤقتات لثانية، فنجدول ٢٫٥ ثانية قدّام. */
    const RATE = () => 1.5 * speed; // نبضة بالثانية: ٩٠ نبضة/دقيقة × نسبة التدريب
    const AHEAD = 2.5;
    const target = () => ({ ctx: audioCtx, dry: masterInput, wet: delayNode, live: false });
    const play = { pos: 0, next: 0, mode: null, misses: 0, hits: new Set(), raf: 0, timer: 0, at: 0, anchor: null, sched: 0, notes: [] };
    const startPos = () => (parsed.events.length ? parsed.events[0].t - 2 : 0); // قبل أول نغمة بنبضتين
    const endPos = () => Math.max(0, ...parsed.events.map((e) => e.t + e.d));
    const nextAt = (pos) => {
      const i = parsed.events.findIndex((e) => e.t >= pos - 1e-6);
      return i < 0 ? parsed.events.length : i;
    };
    const clock = (sec) => Math.floor(sec / 60) + ":" + String(Math.floor(sec % 60)).padStart(2, "0");

    // الشريط الزمني والوقت: بثواني الأغنية على سرعتها الأصلية
    const seekEl = $("songSeek");
    function paintTime() {
      const a = startPos();
      const span = Math.max(0.001, endPos() - a);
      seekEl.value = Math.round(clamp((play.pos - a) / span, 0, 1) * 1000);
      $("songTimeNow").textContent = clock(Math.max(0, play.pos - a) / 1.5);
      $("songTimeAll").textContent = clock(span / 1.5);
    }
    function render() {
      moveTrack();
      markBars();
      lyricAt(play.pos);
      paintTime();
    }

    // النغمات المجدولة: نطفيها كلها عند الإيقاف/القفز، ونضيء مفاتيحها وقت رنينها فقط
    function releaseAt(env, t) {
      if (!env) return;
      if (env.gain.cancelAndHoldAtTime) {
        env.gain.cancelAndHoldAtTime(t);
        env.gain.setTargetAtTime(0.0001, t, env._tau || 0.09);
      } else setTimeout(() => keyRelease(env), Math.max(0, (t - audioCtx.currentTime) * 1000)); // فايرفوكس
    }
    function silence() {
      play.notes.forEach((n) => {
        keyRelease(n.env);
        if (n.lit) markKey(n.m, false);
      });
      play.notes = [];
    }
    function schedule() {
      const now = audioCtx.currentTime;
      const { audio, pos } = play.anchor;
      const until = pos + (now + AHEAD - audio) * RATE();
      for (let ev = parsed.events[play.sched]; ev && ev.t <= until; ev = parsed.events[++play.sched]) {
        const on = audio + (ev.t - pos) / RATE();
        if (on < now - 0.05) continue; // فات وقتها (بعد قفزة)
        ev.notes.forEach((m, j) => {
          const off = on + ((ev.durs?.[j] ?? ev.d) * 0.92) / RATE();
          const env = playNote(target(), pseudoDegree(m), Math.max(on, now), holdSeconds(currentInstrument), velGain(90), 0, 0, freqOf(m, centsOf(m)));
          releaseAt(env, off);
          play.notes.push({ env, m, on, off, lit: false });
        });
      }
      play.notes = play.notes.filter((n) => {
        if (n.off >= now - 1) return true;
        if (n.lit) markKey(n.m, false);
        return false;
      });
    }
    function lightKeys() {
      const now = audioCtx.currentTime;
      play.notes.forEach((n) => {
        const on = now >= n.on && now < n.off;
        if (on !== n.lit) markKey(n.m, on);
        n.lit = on;
      });
    }

    function pauseSong() {
      if (!play.mode) return;
      cancelAnimationFrame(play.raf);
      clearInterval(play.timer);
      play.mode = null;
      silence();
      markWanted(null);
      [listenBtn, trainBtn].forEach((b) => (b.textContent = b.dataset.idle));
      render();
    }
    function resetPos() {
      play.pos = startPos();
      play.next = 0;
      play.misses = 0;
      play.hits.clear();
    }
    function seek(pos) {
      const mode = play.mode;
      pauseSong();
      play.pos = clamp(pos, startPos(), endPos());
      play.next = nextAt(play.pos);
      play.hits.clear();
      render();
      if (mode) playSong(mode);
    }
    async function playSong(mode) {
      if (play.mode === mode) return pauseSong(); // نفس الزر = إيقاف مؤقت
      pauseSong();
      if (!parsed.events.length) return setStatus(songBox.dataset.empty);
      if (play.pos >= endPos() - 1e-6) resetPos(); // خلصت: نبدأ من جديد
      await ensureContext();
      $("songEditor").open = false; // صندوق الكتابة يتطوى فيقرب البيانو (ضغطة ترجّعه)
      play.mode = mode;
      play.last = mode;
      play.at = performance.now();
      (mode === "listen" ? listenBtn : trainBtn).textContent = (mode === "listen" ? listenBtn : trainBtn).dataset.stop;
      if (mode === "train") setStatus(songBox.dataset.wait);
      else {
        play.anchor = { audio: audioCtx.currentTime + 0.05, pos: play.pos };
        play.sched = play.next;
        schedule();
        play.timer = setInterval(schedule, 200);
      }
      playBox.scrollIntoView({ block: "end", behavior: "smooth" }); // الأعمدة والمفاتيح كلها قدامك
      const tick = (now) => {
        if (!play.mode) return;
        if (play.mode === "train") {
          let pos = play.pos + ((now - play.at) / 1000) * RATE();
          const ev = parsed.events[play.next];
          if (ev && pos > ev.t) pos = ev.t; // ينتظرك عند الخط
          play.pos = pos;
          markWanted(ev && ev.t - pos < 1.5 ? ev : null);
        } else {
          play.pos = play.anchor.pos + (audioCtx.currentTime - play.anchor.audio) * RATE();
          play.next = nextAt(play.pos);
          lightKeys();
        }
        play.at = now;
        render();
        if (play.next >= parsed.events.length && play.pos >= endPos()) {
          const { mode: m, misses } = play;
          pauseSong();
          play.pos = endPos();
          render();
          if (m === "train") {
            setStatus(songBox.dataset.done + misses);
            playSound("success");
          }
          return;
        }
        play.raf = requestAnimationFrame(tick);
      };
      play.raf = requestAnimationFrame(tick);
      render();
    }
    /* ===== اكتب بالبيانو (للطالب): كل ضغطة تنكتب نغمة بمجموعتها الصحيحة بصيغة الحروف نفسها
       (^ فوق، . تحت)، فما يحتاج يحفظ رموز. الكورد: الضغطات تنضم لنفس النغمة بـ+ لين يطفّيه ===== */
    const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    let writing = false;
    let writeLen = 1;
    let chord = []; // نغمات الكورد المفتوح (تنكتب كلمة وحدة C+E+G)
    const tokenOf = (notes) => {
      if (isAbc(textEl.value)) {
        // النص بصيغة ABC: نكتب بها (كبير = الوسط، صغير وفوق بـ'، تحت بـ, ؛ ^ دييز؛ المدة بوحدة L)
        const one = (m) => {
          const o = octaveOf(m);
          const n = NAMES[pcOf(m)];
          const l = o >= 5 ? n[0].toLowerCase() + "'".repeat(o - 5) : n[0] + ",".repeat(4 - o);
          return (n[1] ? "^" : "") + l;
        };
        const len = writeLen === 1 ? "" : writeLen === 0.5 ? "/2" : String(writeLen);
        return (notes.length > 1 ? "[" + notes.map(one).join("") + "]" : one(notes[0])) + len;
      }
      const one = (m) => (octaveOf(m) > 4 ? "^".repeat(octaveOf(m) - 4) : ".".repeat(4 - octaveOf(m))) + NAMES[pcOf(m)];
      return notes.map(one).join("+") + (writeLen === 1 ? "" : ":" + writeLen);
    };
    function writeText(next) {
      textEl.value = next;
      textEl.dispatchEvent(new Event("input")); // يحفظ المسودة ويعيد بناء الأعمدة والمعاينة
      seek(Math.max(startPos(), endPos() - 3)); // الممر يعرض آخر اللي انكتب، مو أول الأغنية
    }
    const sep = () => (/(^|\s)$/.test(textEl.value) ? "" : " ");
    function writeNote(midi) {
      if (chord.length) {
        if (chord.includes(midi)) return;
        writeText(textEl.value.replace(/\S+$/, "") + tokenOf([...chord, midi])); // نبدّل كلمة الكورد بالجديدة
        chord.push(midi);
        return;
      }
      writeText(textEl.value + sep() + tokenOf([midi]));
      if (chordBtn.getAttribute("aria-pressed") === "true") chord = [midi];
    }
    const writeBtn = $("songWriteToggle");
    const chordBtn = $("songWriteChord");
    const toggle = (btn, on) => {
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-pressed", String(on));
    };
    writeBtn.addEventListener("click", () => {
      writing = !writing;
      toggle(writeBtn, writing);
      if (writing) pauseSong();
      chord = [];
      fitKeys();
      if (writing) playBox.scrollIntoView({ block: "end", behavior: "smooth" }); // المفاتيح قدامك، واللي تكتبه يطلع أعمدة فوقها
    });
    chordBtn.addEventListener("click", () => {
      toggle(chordBtn, chordBtn.getAttribute("aria-pressed") !== "true");
      chord = []; // بداية كورد جديد أو قفله
    });
    chipGroup("songWriteLen", "len", "1", (v) => (writeLen = Number(v)));
    $("songWriteRest").addEventListener("click", () => writeText(textEl.value + sep() + (isAbc(textEl.value) ? "z" : "_")));
    $("songWriteLine").addEventListener("click", () => writeText(textEl.value.trimEnd() + "\n"));
    $("songWriteBack").addEventListener("click", () => {
      chord = [];
      writeText(textEl.value.replace(/\S+\s*$/, ""));
    });
    // معاينة: كل نغمة/كورد مربع بلون مجموعته؛ الضغط يسمعه ويضيء مفتاحه
    const chipsBox = $("songChips");
    function renderChips() {
      if (midiSong) return chipsBox.replaceChildren();
      const names = labelMode === "solfege" ? "solfege" : "letters";
      chipsBox.replaceChildren(
        ...parsed.events.map((ev, i) => {
          const chip = document.createElement("button");
          chip.type = "button";
          chip.className = "song-chip";
          chip.dataset.oct = octaveOf(ev.notes[0]);
          chip.title = ev.notes.map((m) => GROUPS[octaveOf(m) - 1] || octaveOf(m)).join(" + ");
          chip.textContent = ev.notes.map((m) => noteName(m, names)).join("+");
          chip.addEventListener("click", () => {
            ensureContext();
            ev.notes.forEach((m) => noteOn("s:chip" + i + ":" + m, m, 90));
            setTimeout(() => ev.notes.forEach((m) => noteOff("s:chip" + i + ":" + m)), 450);
          });
          return chip;
        })
      );
    }
    songRelabel = () => {
      if (!active()) return;
      buildBars();
      renderChips();
      renderSongStaff();
    };
    // كل ضغطة من المستخدم (لمس، كيبورد، MIDI) توصل هنا من noteOn
    songHit = (midi) => {
      if (writing && !midiSong && active()) return writeNote(midi);
      const ev = play.mode === "train" && parsed.events[play.next];
      if (!ev || ev.t - play.pos > 1.5) return;
      if (!ev.notes.includes(midi)) {
        play.misses++;
        const key = keyEl(midi);
        key?.classList.add("miss");
        setTimeout(() => key?.classList.remove("miss"), 250);
        return;
      }
      play.hits.add(midi);
      if (ev.notes.every((m) => play.hits.has(m))) {
        play.hits.clear();
        play.next++;
        markBars();
      }
    };
    seekEl.addEventListener("input", () => {
      const a = startPos();
      seek(a + (seekEl.value / 1000) * (endPos() - a));
    });
    // Space = تشغيل/إيقاف مؤقت (آخر وضع استخدمته)، Home = من البداية — نفس اختصارات تبويب «اعزف»
    document.addEventListener("keydown", (e) => {
      if (!active() || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target.closest("input, textarea, select, [contenteditable], summary")) return;
      if (e.code === "Space" && !e.target.closest("button")) {
        e.preventDefault();
        playSong(play.mode || play.last || "listen");
      } else if (e.code === "Home") {
        e.preventDefault();
        $("songRestart").click();
      }
    });
    $("songRestart").addEventListener("click", () => {
      seek(startPos());
      play.misses = 0;
      setStatus(parsed.events.length + songBox.dataset.notes);
    });

    // ===== المكتبة: محفوظة بالمتصفح، وملف .hakolah ينقلها بين الأجهزة =====
    const currentSong = () => ({ title: titleEl.value.trim() || titleEl.placeholder, text: midiSong ? "" : textEl.value, ...(midiSong && { midi: midiSong }) });
    const hasSong = () => !!midiSong || !!textEl.value.trim();
    const saveDraft = () => store.set("songDraft", JSON.stringify(currentSong()));
    function renderList(selectId) {
      listEl.replaceChildren(listEl.options[0]);
      readSongs().forEach((s) => listEl.add(new Option(s.title, s.id)));
      listEl.value = selectId;
    }
    function openSong(s) {
      pauseSong();
      midiSong = s.midi ? cleanMidiSong(s.midi) : null;
      renderTracks();
      titleEl.value = s.title;
      textEl.value = s.text || "";
      saveDraft();
      loadText();
    }
    $("songSave").addEventListener("click", () => {
      if (!hasSong()) return setStatus(songBox.dataset.empty);
      const songs = readSongs();
      const id = listEl.value || Date.now().toString(36);
      const i = songs.findIndex((s) => s.id === id);
      songs.splice(i < 0 ? songs.length : i, 1, { id, ...currentSong() });
      try {
        localStorage.setItem(SONGS_KEY, JSON.stringify(songs));
      } catch {
        return setStatus(songBox.dataset.full); // التخزين ممتلئ (ملفات MIDI كبيرة): "نزّل ملف" بدل الحفظ
      }
      renderList(id);
      showToast(songBox.dataset.saved);
    });
    $("songDelete").addEventListener("click", () => {
      if (!listEl.value || !confirm(songBox.dataset.delAsk)) return;
      store.set(SONGS_KEY, JSON.stringify(readSongs().filter((s) => s.id !== listEl.value)));
      renderList("");
    });
    listEl.addEventListener("change", () => openSong(readSongs().find((s) => s.id === listEl.value) || { title: "", text: "" }));
    $("songDownload").addEventListener("click", () => {
      if (!hasSong()) return setStatus(songBox.dataset.empty);
      const song = currentSong();
      const body = JSON.stringify({ type: "hakolah-song", version: 1, ...song }, null, 2);
      downloadBlob(new Blob([body], { type: "application/json" }), song.title.replace(/[\\/:*?"<>|]+/g, "-").slice(0, 60) + ".hakolah");
    });
    // يقبل ملف MIDI، أو ملف .hakolah، أو أي ملف نصي فيه نوتات (يصير عنوانه اسم الملف)
    $("songFile").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      e.target.value = "";
      if (!file) return;
      const title = file.name.replace(/\.[^.]+$/, "");
      try {
        if (file.size > 4 * 1024 * 1024) throw new Error("too big");
        const buf = await file.arrayBuffer();
        const raw = new TextDecoder().decode(buf);
        let song;
        try {
          if (raw.startsWith("PK") || raw.includes("<score-partwise")) {
            // MusicXML (أو .mxl المضغوط) من MuseScore وغيره
            const { tracks, barQ, key } = parseMusicXml(raw.startsWith("PK") ? await unzipMusicXml(buf) : raw);
            if (!tracks.length) throw new Error("no notes");
            song = { title, text: "", midi: { tracks, on: tracks.map(() => true), barQ, key } };
          } else if (raw.startsWith("MThd")) {
            const { tracks: found, barQ, key } = parseMidi(buf);
            const tracks = found.filter((t) => t.notes.length);
            if (!tracks.length) throw new Error("no notes");
            song = { title, text: "", midi: { tracks, on: defaultTracks(tracks), barQ, key } };
          } else {
            const j = JSON.parse(raw);
            if (j?.type !== "hakolah-song" || (typeof j.text !== "string" && !cleanMidiSong(j.midi))) throw new Error("not a song");
            song = { title: String(j.title || ""), text: String(j.text || ""), midi: j.midi };
          }
        } catch (err) {
          if (raw.startsWith("MThd") || raw.startsWith("PK") || raw.includes("<score-partwise")) throw err;
          if (/[\0�]/.test(raw)) throw new Error("binary", { cause: err });
          song = { title, text: raw };
        }
        listEl.value = "";
        openSong(song);
        showToast(songBox.dataset.loaded);
      } catch {
        setStatus(songBox.dataset.bad);
      }
    });
    textEl.addEventListener("input", () => {
      saveDraft();
      pauseSong();
      loadText();
    });
    titleEl.addEventListener("input", saveDraft);
    $("songToText").addEventListener("click", () => {
      openSong({ title: "", text: "" });
      $("songEditor").open = true;
      textEl.focus();
    });
    const staffBtn = $("songStaffToggle");
    const paintStaffBtn = () => {
      staffBtn.classList.toggle("active", showStaff);
      staffBtn.setAttribute("aria-pressed", String(showStaff));
    };
    paintStaffBtn();
    staffBtn.addEventListener("click", () => {
      showStaff = !showStaff;
      store.set("songStaff", showStaff ? "1" : "0");
      paintStaffBtn();
      renderSongStaff();
      playClickSound();
    });
    const simpleBtn = $("songSimple");
    const paintSimple = () => {
      simpleBtn.classList.toggle("active", simple);
      simpleBtn.setAttribute("aria-pressed", String(simple));
    };
    paintSimple();
    simpleBtn.addEventListener("click", () => {
      simple = !simple;
      store.set("songSimple", simple ? "1" : "0");
      paintSimple();
      pauseSong();
      loadText(true);
      playClickSound();
    });
    listenBtn.addEventListener("click", () => playSong("listen"));
    trainBtn.addEventListener("click", () => playSong("train"));
    chipGroup("songSpeed", "speed", String(speed), (v) => {
      speed = Number(v);
      store.set("songSpeed", v);
      if (play.mode) seek(play.pos); // نعيد الجدولة على السرعة الجديدة من نفس المكان
    });

    let draft = null;
    try {
      draft = JSON.parse(store.get("songDraft"));
    } catch {
      // مسودة تالفة: نبدأ بالمثال
    }
    titleEl.value = draft?.title ?? "Ode to Joy — Beethoven";
    textEl.value = draft?.text ?? DEMO;
    midiSong = cleanMidiSong(draft?.midi);
    renderTracks();
    renderList("");

    // البيانو ينتقل لهذا التبويب (showPane) ونطاقه يصير نطاق الأغنية، ويرجع لما نطلع
    document.addEventListener("sounds:pane", (e) => {
      const on = e.detail === "panePractice";
      lane.hidden = !on;
      lyricEl.hidden = !on;
      $("songTimeline").hidden = !on;
      if (on) return loadText(true);
      staffEl.hidden = true;
      pauseSong();
      if (songRange) {
        songRange = null;
        renderPlayKeys();
      }
    });
    new ResizeObserver(() => !lane.hidden && setUnit()).observe(lane);
  }

  function shiftOctave(step) {
    playOctave = clamp(playOctave + step, 1, 7);
    renderPlayKeys();
    playClickSound();
  }

  if (playBox) {
    renderPlayKeys();
    noteNameToggle?.addEventListener("click", () => {
      renderPlayKeys();
      renderMaqamNote();
      if (edLayer) renderEditor();
    });
    const labelChips = document.querySelectorAll("#beepPlayLabels [data-labels]");
    const markLabels = () => labelChips.forEach((c) => c.classList.toggle("active", c.dataset.labels === labelMode));
    markLabels();
    labelChips.forEach((chip) =>
      chip.addEventListener("click", () => {
        labelMode = chip.dataset.labels;
        store.set("beepLabels", labelMode);
        markLabels();
        renderPlayKeys();
        songRelabel();
        playClickSound();
      })
    );
    // ملء الشاشة: يخفي شريط المتصفح بالجوال الأفقي. داخل التطبيق ما يشتغل (WebView
    // بلا onShowCustomView) والتطبيق يخفي أشرطته بنفسه عند الأفقي
    // شريط الأدوات: ⚙️ و⌨️ يفتحان لوحتيهما تحته (عنوان اللوحة نفسه مخفي في "اعزف")
    [["beepSettingsBtn", "beepSettings"], ["beepHelpBtn", "beepHelp"]].forEach(([b, d]) => {
      const btn = document.getElementById(b);
      const box = document.getElementById(d);
      btn?.addEventListener("click", () => {
        box.open = !box.open;
        btn.setAttribute("aria-expanded", String(box.open)); // فوراً (حدث toggle يجي متأخر)
      });
      box?.addEventListener("toggle", () => btn?.setAttribute("aria-expanded", String(box.open)));
    });
    // الشاشات الضيقة: سطر البيانو يعرض الآلة والأوكتاف والدواسة، و⋯ يفتح الباقي
    document.getElementById("pianoMore")?.addEventListener("click", (e) => {
      const open = e.currentTarget.closest(".piano-head").classList.toggle("open");
      e.currentTarget.setAttribute("aria-expanded", String(open));
    });
    const fsBtn = document.getElementById("beepFullscreen");
    const tool = document.querySelector(".sounds-tool");
    if (fsBtn && tool.requestFullscreen && !document.documentElement.classList.contains("in-app")) {
      fsBtn.hidden = false;
      fsBtn.addEventListener("click", () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else tool.requestFullscreen().catch(() => {});
        playClickSound();
      });
    }
    document.getElementById("beepOctDown").addEventListener("click", () => shiftOctave(-1));
    document.getElementById("beepOctUp").addEventListener("click", () => shiftOctave(1));

    // e.code يجي فاضي من بعض كيبوردات الجوال (مفتاح بلا scancode) — keyCode
    // بديل يتبع المفتاح الفعلي أيضاً (65-90 للحروف مهما كانت لغة الكيبورد)
    const physicalCode = (e) => {
      if (e.code && e.code !== "Unidentified") return e.code;
      if (e.keyCode >= 65 && e.keyCode <= 90) return "Key" + String.fromCharCode(e.keyCode);
      return { 186: "Semicolon", 59: "Semicolon", 222: "Quote" }[e.keyCode] || "";
    };
    const typing = (e) => e.target.closest("input, textarea, select, [contenteditable]");
    const pianoHidden = () => document.getElementById("panePlay").hidden && document.getElementById("panePractice")?.hidden !== false;
    document.addEventListener("keydown", (e) => {
      // Shift ممسوك = دواسة الاستدامة (حتى مع حرف: Shift+A تعزف A بالدواسة)
      if (e.key === "Shift" && !e.repeat && !typing(e) && !pianoHidden()) {
        pedalKey = true;
        return paintPedal();
      }
      if (e.defaultPrevented || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return; // defaultPrevented: اختصار محرّر أخذ المفتاح
      if (typing(e)) return;
      // البيانو لتبويبي "اعزف" و"تدرّب" فقط — بغيرهما (تأليف/تعلّم) الحروف ما تعزف نغمات مفاجئة
      if (pianoHidden()) return;
      const code = physicalCode(e);
      if (code === "KeyZ" || code === "KeyX") {
        shiftOctave(code === "KeyZ" ? -1 : 1);
      } else if (code in KEY_MAP) {
        e.preventDefault(); // ' بفايرفوكس يفتح البحث السريع
        keyOn(code);
      }
    });
    document.addEventListener("keyup", (e) => {
      if (e.key === "Shift" && pedalKey) {
        pedalKey = false;
        releasePedal();
      }
      keyOff(physicalCode(e));
    });
    // الصفحة فقدت التركيز والمفتاح ممسوك: ما بيوصلنا keyup، نسكّت الكل
    window.addEventListener("blur", () => {
      [...held.keys()].forEach(keyOff);
      if (pedalKey) {
        pedalKey = false;
        releasePedal();
      }
    });

    /* اللمس والماوس: كل إصبع مفتاح مستقل، والقوة من موضع الضغطة على المفتاح —
       أعلاه هادئ وأسفله قوي (نفس فكرة GarageBand) */
    playBox.addEventListener("pointerdown", (e) => {
      const key = e.target.closest("[data-midi]");
      if (!key) return;
      e.preventDefault();
      key.releasePointerCapture?.(e.pointerId);
      const r = key.getBoundingClientRect();
      const velocity = Math.round(38 + clamp((e.clientY - r.top) / (r.height || 1), 0, 1) * 89);
      noteOn("p:" + key.dataset.midi, Number(key.dataset.midi), velocity);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach((type) =>
      playBox.addEventListener(
        type,
        (e) => {
          const key = e.target.closest("[data-midi]");
          if (key) noteOff("p:" + key.dataset.midi);
        },
        true
      )
    );
    // تفعيل مفتاح بلا مؤشر (قارئ شاشة، أو Enter/Space لو صار عليه تركيز): النقرة تصل
    // بلا pointerdown، وتُعرف بـ detail === 0. نقرات الماوس واللمس الحقيقية detail ≥ 1
    // وتُعزف أصلاً من pointerdown فوق، فما تنعزف مرتين
    playBox.addEventListener("click", (e) => {
      if (e.detail !== 0) return;
      const key = e.target.closest("[data-midi]");
      if (!key) return;
      noteOn("a:" + key.dataset.midi, Number(key.dataset.midi));
      setTimeout(() => noteOff("a:" + key.dataset.midi), 150);
    });
  }

  /* ===== مزامنة الفيديو (لطلاب الأفلام والأنيميشن) =====
     الطالب يختار مقطعاً من جهازه (لا يُرفع لأي مكان — رابط blob محلي)، فيُعرض فوق
     الجدول ويمشي مع الخط الأبيض: تحريك الخط يعرض الإطار نفسه، والتشغيل والتسجيل
     يشغّلانه متزامناً (بعد العدّ إن وُجد). الوقت يُعرض كود زمني بالإطارات
     (HH:MM:SS:FF) بسرعة الفيديو المختارة، وعلامات القطع تُثبَّت على الجدول وتنجذب
     إليها المقاطع. الفيديو لا يُحفظ بالمشروع (كبير)، بل اسمه وطوله والعلامات —
     ولما يرجع المشروع نطلب اختيار الملف نفسه مرة ثانية. */
  const videoBox = document.getElementById("beepVideoBox");
  const videoEl = document.getElementById("beepVideo");
  const videoMissing = document.getElementById("beepVideoMissing");
  const timecodeEl = document.getElementById("beepTimecode");
  const film = document.getElementById("beepFilm");
  const markerLayer = document.getElementById("beepMarkers");
  const videoAudioBtn = document.getElementById("beepVideoAudio");
  let videoUrl = null; // رابط الملف المحلي المحمَّل حالياً
  let videoMeta = null; // { name, dur } — يبقى بالمشروع حتى لو الملف نفسه غير محمَّل
  let fps = 25;
  let markers = []; // علامات القطع بالثواني (مرتبة)
  let videoTimer = null;
  let videoRunning = false;
  let filmKey = "";
  let filmJob = 0;
  let markFps = () => {};

  const videoReady = () => Boolean(videoUrl && videoEl && videoEl.readyState >= 1 && videoEl.duration > 0);
  const videoDur = () => (videoMeta ? videoMeta.dur : 0);
  const studioActive = () => layers.length > 0 || Boolean(videoMeta);
  function timecode(sec) {
    const frames = Math.max(0, Math.floor(sec * fps + 1e-6));
    const f = frames % fps;
    const s = Math.floor(frames / fps);
    const pad = (n) => String(n).padStart(2, "0");
    return pad(Math.floor(s / 3600)) + ":" + pad(Math.floor(s / 60) % 60) + ":" + pad(s % 60) + ":" + pad(f);
  }
  // يعرض الإطار عند الموضع (بلا تشغيل) — والكود الزمني دائماً
  function videoShow(sec) {
    if (timecodeEl) timecodeEl.textContent = timecode(sec);
    if (!videoReady() || videoRunning) return;
    const t = Math.min(sec, videoEl.duration - 0.001);
    if (Math.abs(videoEl.currentTime - t) > 0.001) videoEl.currentTime = t;
  }
  // يبدأ الفيديو عند وقت الصوت at من الموضع from (نفس ساعة الطبقات والمترونوم)
  function videoStart(at, from) {
    if (!videoReady()) return;
    clearTimeout(videoTimer);
    videoRunning = true;
    videoEl.pause();
    if (from >= videoEl.duration) return;
    videoEl.currentTime = from;
    const delay = (at - audioCtx.currentTime + (audioCtx.outputLatency || 0)) * 1000;
    videoTimer = setTimeout(() => videoRunning && videoEl.play().catch(() => {}), Math.max(0, delay));
  }
  // تصحيح الانحراف أثناء التشغيل: لو ابتعد الفيديو أكثر من إطارين عن الصوت نرجعه
  function videoFollow(sec) {
    if (!videoRunning || !videoReady() || videoEl.paused) return;
    const expected = sec - (audioCtx.outputLatency || 0);
    if (expected < videoEl.duration && Math.abs(videoEl.currentTime - expected) > 2 / fps) videoEl.currentTime = expected;
  }
  function videoStop() {
    clearTimeout(videoTimer);
    if (!videoRunning) return;
    videoRunning = false;
    videoEl?.pause();
    videoShow(cursor);
  }

  function loadVideoFile(file) {
    if (!file || !videoEl) return;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    videoUrl = URL.createObjectURL(file);
    filmKey = "";
    videoEl.src = videoUrl;
    videoEl.onloadedmetadata = () => {
      const changed = !videoMeta || Math.abs(videoMeta.dur - videoEl.duration) > 0.05;
      videoMeta = { name: file.name, dur: videoEl.duration };
      paintVideo();
      renderLayers();
      videoShow(cursor);
      if (changed) videoBox.scrollIntoView({ block: "nearest", behavior: "smooth" });
      playSound("success");
    };
    videoEl.onerror = () => {
      URL.revokeObjectURL(videoUrl);
      videoUrl = null;
      showToast(videoBox.dataset.failed);
      paintVideo();
    };
  }
  function removeVideo() {
    videoStop();
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    videoUrl = null;
    videoMeta = null;
    videoEl.removeAttribute("src");
    videoEl.load();
    filmKey = "";
    paintVideo();
    renderLayers();
  }
  // صندوق الفيديو: ظاهر لو فيه فيديو محمَّل، أو مشروع يذكر فيديو غير محمَّل (نطلبه)
  function paintVideo() {
    if (!videoBox) return;
    videoBox.hidden = !videoMeta;
    const missing = Boolean(videoMeta && !videoUrl);
    videoEl.hidden = missing;
    videoMissing.hidden = !missing;
    if (missing) videoMissing.textContent = videoBox.dataset.missing + " " + videoMeta.name;
    videoBox.querySelectorAll(".beep-video-bar button").forEach((b) => {
      if (b.id !== "beepVideoRemove") b.disabled = missing && b.id !== "beepMarkerAdd";
    });
  }

  // شريط إطارات الفيديو أعلى الجدول — نقرأ الإطارات بفيديو مخفي ثاني (لا نحرّك المعروض)
  async function renderFilm() {
    if (!film) return;
    const show = videoReady();
    film.hidden = !show;
    gutter.classList.toggle("has-film", show);
    if (!show) return;
    const w = Math.round(videoDur() * pxPerSec);
    const key = videoUrl + "|" + w;
    if (key === filmKey || w < 10) return;
    filmKey = key;
    const job = ++filmJob;
    const H = 40;
    const dpr = window.devicePixelRatio || 1;
    film.width = Math.round(w * dpr);
    film.height = H * dpr;
    film.style.width = w + "px";
    const g = film.getContext("2d");
    g.scale(dpr, dpr);
    g.fillStyle = "#000";
    g.fillRect(0, 0, w, H);
    const probe = document.createElement("video");
    probe.muted = true;
    probe.preload = "auto";
    probe.src = videoUrl;
    await new Promise((r) => (probe.onloadeddata = r));
    const thumbW = Math.max(20, (H * probe.videoWidth) / (probe.videoHeight || 1));
    const count = Math.max(1, Math.ceil(w / thumbW));
    for (let i = 0; i < count; i++) {
      if (job !== filmJob) return; // تغيّر المقياس أثناء الرسم — نسخة أحدث تكمل
      probe.currentTime = Math.min(probe.duration - 0.01, ((i + 0.5) * thumbW) / pxPerSec);
      await new Promise((r) => (probe.onseeked = r));
      g.drawImage(probe, i * thumbW, 0, thumbW, H);
    }
    probe.removeAttribute("src");
    probe.load();
  }

  // علامات القطع: خط عمودي عبر الجدول وراية بالمسطرة — النقر يقفز لها، والنقر مرتين يحذفها
  let lastMarkerTap = null;
  function renderMarkers() {
    if (!markerLayer) return;
    markerLayer.replaceChildren(
      ...markers.map((m, i) => {
        const el = document.createElement("div");
        el.className = "beep-marker";
        el.style.left = m * pxPerSec + "px";
        const flag = document.createElement("button");
        flag.type = "button";
        flag.className = "beep-marker-flag";
        flag.textContent = String(i + 1);
        flag.title = timecode(m);
        flag.addEventListener("click", () => {
          const now = performance.now();
          if (lastMarkerTap && lastMarkerTap.m === m && now - lastMarkerTap.time < 400) {
            lastMarkerTap = null;
            pushHistory();
            markers = markers.filter((x) => x !== m);
            return renderLayers();
          }
          lastMarkerTap = { m, time: now };
          cursor = m;
          setPlayhead(null);
        });
        el.append(flag);
        return el;
      })
    );
  }
  function addMarker() {
    if (!studioActive()) return;
    const at = Math.floor(cursor * fps + 1e-6) / fps; // على حدّ الإطار المعروض بالكود الزمني
    if (markers.some((m) => Math.abs(m - at) < 0.5 / fps)) return;
    pushHistory();
    markers = [...markers, at].sort((a, b) => a - b);
    renderLayers();
    playClickSound();
  }
  function stepFrame(dir) {
    // من الإطار الحالي (اللي يعرضه الكود الزمني) للتالي/السابق بالضبط، حتى لو الخط بين إطارين
    cursor = Math.max(0, (Math.floor(cursor * fps + 1e-6) + dir) / fps);
    setPlayhead(null);
  }

  /* تصدير الفيديو مع الموسيقى: نجهّز مزيج المشروع بالكامل (بلا اتصال، بطول الفيديو)
     ثم نشغّل الفيديو بعنصر مخفي ونرسم إطاراته على لوحة ونسجّلها مع الصوت. التسجيل
     بالزمن الحقيقي (طول الفيديو)، وصوت الفيديو الأصلي يُضاف لو زر صوته مفعّل. */
  async function exportVideo(btn) {
    if (!videoReady()) return;
    if (!pickVideoMime()) return showToast(btn.dataset.failed);
    stopTake();
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = btn.dataset.working;
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    await ac.resume(); // داخل ضغطة المستخدم — قبل أي انتظار
    try {
      const dur = videoDur();
      const list = sounding();
      const mix = list.length ? await renderPieceToBuffer({ layers: list, tracks: tracks.map(cloneTrack), meta: { seed: "video", bpm: 60, meter, totalBeats: dur } }) : null;
      const ev = document.createElement("video");
      ev.src = videoUrl;
      ev.playsInline = true;
      ev.preload = "auto";
      await new Promise((resolve, reject) => {
        ev.onloadeddata = resolve;
        ev.onerror = reject;
      });
      const dest = ac.createMediaStreamDestination();
      if (!videoEl.muted) ac.createMediaElementSource(ev).connect(dest);
      else ev.muted = true;
      let src = null;
      if (mix) {
        src = ac.createBufferSource();
        src.buffer = mix;
        src.connect(dest);
      }
      const scale = Math.min(1, 1280 / (ev.videoWidth || 1280));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round((ev.videoWidth || 1280) * scale / 2) * 2;
      canvas.height = Math.round((ev.videoHeight || 720) * scale / 2) * 2;
      const g = canvas.getContext("2d");
      const mimeType = pickVideoMime();
      const stream = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6000000 });
      const chunks = [];
      recorder.ondataavailable = (e) => e.data?.size && chunks.push(e.data);
      const stopped = new Promise((r) => (recorder.onstop = r));
      g.drawImage(ev, 0, 0, canvas.width, canvas.height);
      recorder.start();
      await ev.play();
      src?.start(ac.currentTime);
      await new Promise((resolve) => {
        const frame = () => {
          g.drawImage(ev, 0, 0, canvas.width, canvas.height);
          btn.textContent = btn.dataset.working + " " + Math.round((ev.currentTime / dur) * 100) + "%";
          if (ev.ended || ev.currentTime >= dur - 0.01) resolve();
          else requestAnimationFrame(frame);
        };
        frame();
      });
      recorder.stop();
      await stopped;
      ev.pause();
      const ext = mimeType.startsWith("video/mp4") ? "mp4" : "webm";
      downloadBlob(new Blob(chunks, { type: mimeType }), `hakolah-scored-${Date.now()}.${ext}`);
      playSound("success");
    } catch {
      showToast(btn.dataset.failed);
    } finally {
      ac.close();
      btn.disabled = false;
      btn.textContent = original;
    }
  }

  if (videoBox) {
    document.getElementById("beepVideoFile").addEventListener("change", (e) => {
      const file = e.target.files[0];
      e.target.value = "";
      loadVideoFile(file);
    });
    document.getElementById("beepFramePrev").addEventListener("click", () => stepFrame(-1));
    document.getElementById("beepFrameNext").addEventListener("click", () => stepFrame(1));
    document.getElementById("beepMarkerAdd").addEventListener("click", addMarker);
    document.getElementById("beepVideoRemove").addEventListener("click", () => {
      removeVideo();
      playClickSound();
    });
    document.getElementById("beepVideoExport").addEventListener("click", (e) => exportVideo(e.currentTarget));
    videoAudioBtn.addEventListener("click", () => {
      videoEl.muted = !videoEl.muted;
      videoAudioBtn.textContent = videoEl.muted ? videoAudioBtn.dataset.off : videoAudioBtn.dataset.on;
      videoAudioBtn.setAttribute("aria-pressed", String(!videoEl.muted));
      playClickSound();
    });
    markFps = chipGroup(videoBox, "fps", fps, (v) => {
      fps = Number(v);
      setPlayhead(null);
      renderMarkers();
      scheduleSave();
    });
    paintVideo();
  }

  /* ===== فتح المشروع: رابط مشارَك (#studio=) أولاً، وإلا آخر مشروع محفوظ ===== */
  (async () => {
    try {
      const shared = location.hash.startsWith("#studio=") ? location.hash.slice(8) : "";
      if (shared) {
        await applyProject(await decodeShare(shared));
        // نشيل المشروع من العنوان: تحديث الصفحة بعد التعديل يفتح المحفوظ لا الأصل
        window.history.replaceState(null, "", location.pathname + location.search);
        showPane("panePlay");
        renderLayers();
        showToast(recTake.dataset.shared);
      } else {
        const saved = await sampleStore("readonly", (st) => st.get("project"));
        if ((saved?.layers?.length || saved?.video) && !layers.length) {
          await applyProject(saved);
          renderLayers();
          showToast(recTake.dataset.restored);
        }
      }
    } catch {
      // رابط تالف أو تخزين محجوب — نبدأ مشروعاً فاضياً
    } finally {
      loadingProject = false;
    }
  })();

  function stopPlayback() {
    stopRequested = true;
    playing = false;
    btn.textContent = btn.dataset.playLabel;
    activeTimeouts.forEach(clearTimeout);
    activeOscillators.forEach((osc) => {
      try {
        osc.stop();
      } catch {
        // خلص وقت توقيته أصلاً — عادي
      }
    });
    allKeys().forEach((key) => key.classList.remove("active"));
  }

  btn.addEventListener("click", () => {
    if (playing) {
      stopPlayback();
      return;
    }
    playSequence();
    playClickSound();
  });

  /* "السابقة": يرجّع المقطوعة اللي قبلها بالسجلّ — يستعيد بذرتها وآلتها
     وطابعها معاً، فيسمع نفس اللي سمعه بالضبط لا مقطوعة أخرى بنفس البذرة */
  const prevBtn = document.getElementById("beepMelodyPrev");
  function updateHistoryButton() {
    if (prevBtn) prevBtn.disabled = historyPos <= 0;
  }
  updateHistoryButton();

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (historyPos <= 0) return;
      historyPos--;
      const entry = seedHistory[historyPos];

      currentMood = entry.mood;
      moodButtons.forEach((b) => b.classList.toggle("active", b.dataset.mood === entry.mood));
      currentInstrument = entry.instrument;
      instrumentButtons.forEach((b) => b.classList.toggle("active", b.dataset.instrument === entry.instrument));

      pinnedSeed = entry.seed;
      navigatingHistory = true;
      if (playing) stopPlayback();
      playSequence();
      playClickSound();
    });
  }

  // "التالية": يقطع القطعة الحالية ويبدأ وحدة جديدة فوراً — بدل ما ينتظر
  // المستخدم تخلص ثم يضغط تشغيل من جديد
  const nextBtn = document.getElementById("beepMelodyNext");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      stopPlayback();
      playSequence();
      playClickSound();
    });
  }

  /* تشغيل بذرة يكتبها المستخدم: نفس البذرة تعطي نفس المقطوعة حرفياً، فيقدر
     يرجع لمقطوعة أعجبته أو يجرّب بذرة شافها بفيديو أو شاركها أحد */
  const seedPlayBtn = document.getElementById("beepSeedPlay");
  function playTypedSeed() {
    if (!seedInput) return;
    const raw = seedInput.value.trim();
    if (!raw) {
      // خانة فاضية = تشغيل عشوائي عادي
      if (playing) stopPlayback();
      playSequence();
      return;
    }
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) {
      showToast(seedInput.dataset.invalid);
      return;
    }
    pinnedSeed = value >>> 0;
    if (playing) stopPlayback();
    playSequence();
    playClickSound();
  }

  if (seedPlayBtn) seedPlayBtn.addEventListener("click", playTypedSeed);
  if (seedInput) {
    seedInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        playTypedSeed();
      }
    });
  }

  /* أزرار التحميل: تصدّر القطعة اللي سمعها المستخدم فعلاً (lastPiece)، وإن لم
     يشغّل شيئاً بعد نؤلّف واحدة ونصدّرها. WAV يشتغل بأي مكان، وMIDI يفتح
     بأي برنامج نوتة. */
  function ensurePiece() {
    if (!lastPiece) {
      const seed = (Math.random() * 4294967296) >>> 0;
      currentSeed = seed;
      lastPiece = composePiece(seed);
      renderAnalysis(lastPiece.meta);
    }
    return lastPiece;
  }

  const wavBtn = document.getElementById("beepDownloadWav");
  if (wavBtn) {
    wavBtn.addEventListener("click", async () => {
      const piece = ensurePiece();
      const original = wavBtn.textContent;
      wavBtn.disabled = true;
      wavBtn.textContent = wavBtn.dataset.working;
      try {
        downloadBlob(await renderPieceToWav(piece), `hakolah-music-${piece.meta.seed}.wav`);
      } finally {
        wavBtn.disabled = false;
        wavBtn.textContent = original;
      }
      playClickSound();
    });
  }

  const mp3Btn = document.getElementById("beepDownloadMp3");
  if (mp3Btn) {
    mp3Btn.addEventListener("click", async () => {
      const piece = ensurePiece();
      const original = mp3Btn.textContent;
      mp3Btn.disabled = true;
      mp3Btn.textContent = mp3Btn.dataset.working;
      try {
        downloadBlob(await renderPieceToMp3(piece), `hakolah-music-${piece.meta.seed}.mp3`);
      } catch {
        showToast(mp3Btn.dataset.failed);
      } finally {
        mp3Btn.disabled = false;
        mp3Btn.textContent = original;
      }
      playClickSound();
    });
  }

  /* الفيديو يُسجَّل بالزمن الحقيقي (لازم MediaRecorder يستقبل إطارات فعلية)،
     فمدة الانتظار = مدة المقطوعة. نعرض نسبة التقدّم عشان ما يظن إنه معلّق. */
  const videoBtn = document.getElementById("beepDownloadVideo");
  if (videoBtn) {
    videoBtn.addEventListener("click", async () => {
      if (playing) stopPlayback();
      const piece = ensurePiece();
      const original = videoBtn.textContent;
      videoBtn.disabled = true;
      try {
        const { blob, mimeType } = await renderPieceToVideo(piece, (ratio) => {
          videoBtn.textContent = `${videoBtn.dataset.working} ${Math.round(ratio * 100)}%`;
        });
        const extension = mimeType.startsWith("video/mp4") ? "mp4" : "webm";
        downloadBlob(blob, `hakolah-music-${piece.meta.seed}.${extension}`);
      } catch {
        showToast(videoBtn.dataset.failed);
      } finally {
        videoBtn.disabled = false;
        videoBtn.textContent = original;
      }
      playClickSound();
    });
  }

  const midiBtn = document.getElementById("beepDownloadMidi");
  if (midiBtn) {
    midiBtn.addEventListener("click", () => {
      const piece = ensurePiece();
      downloadBlob(pieceToMidi(piece), `hakolah-music-${piece.meta.seed}.mid`);
      playClickSound();
    });
  }

  /* رابط فيه بذرة: نثبّت نفس المزاج والآلة والبذرة عشان أول ضغطة تشغيل تعطي
     نفس المقطوعة بالضبط اللي شاركها صاحب الرابط */
  const params = new URLSearchParams(location.search);
  const seedParam = Number(params.get("seed"));
  if (Number.isFinite(seedParam) && params.get("seed")) {
    pinnedSeed = seedParam >>> 0;
    const moodParam = params.get("mood");
    if (MOODS[moodParam]) {
      currentMood = moodParam;
      moodButtons.forEach((b) => b.classList.toggle("active", b.dataset.mood === moodParam));
    }
    const instrumentParam = params.get("instrument");
    // "صوتك" عينة على جهاز صاحبها فقط — الرابط المشارَك يرجع للبيانو
    if (INSTRUMENTS[instrumentParam] && instrumentParam !== "custom") {
      currentInstrument = instrumentParam;
      instrumentButtons.forEach((b) => b.classList.toggle("active", b.dataset.instrument === instrumentParam));
    }
  }
  updateSoundSummary();
}


document.addEventListener("DOMContentLoaded", initBeepMelodyExperiment);

/* منزلق الصوت: خط ناعم ينتفخ عند المستوى الحالي كقطرة ماء متصلة به (فلتر "لزوجة" يدمج
   الخط والدائرة بجسم واحد). المنزلق الأصلي يبقى فوقها شفافاً فيبقى اللمس والكيبورد
   وقارئ الشاشة كما هي. ولما تنزل بالصفحة ويختفي المنزلق تحت الهيدر، يطفو بحبة صغيرة
   بزاوية الشاشة ويرجع مكانه لما تطلع — بلا قفزة بالمحتوى (مكانه محجوز). */
function dressVolume(input) {
  const NS = "http://www.w3.org/2000/svg";
  const label = input.closest(".beep-volume");
  const wrap = document.createElement("span");
  wrap.className = "vol-wrap";
  const goo = document.createElement("span");
  goo.className = "vol-goo";
  goo.setAttribute("aria-hidden", "true");
  goo.innerHTML = '<span class="vol-track"></span><span class="vol-liquid"><span class="vol-fill"></span><span class="vol-drop"></span></span>';
  input.replaceWith(wrap);
  wrap.append(goo, input);
  if (!document.getElementById("volGoo")) {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "vol-defs");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML =
      '<filter id="volGoo" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b"/><feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" result="g"/><feComposite in="SourceGraphic" in2="g" operator="atop"/></filter>';
    document.body.append(svg);
  }
  label.classList.add("drop-ready");

  const spot = document.createElement("div");
  spot.className = "beep-volume-spot";
  label.before(spot);
  const header = document.querySelector(".site-header");
  let floating = false;
  let frame = 0;
  const check = () => {
    frame = 0;
    const top = header ? header.getBoundingClientRect().bottom : 0;
    const anchor = (floating ? spot : label).getBoundingClientRect();
    const should = anchor.bottom < top + 4 && document.activeElement !== input;
    if (should === floating) return;
    if (should) {
      // الشاشات العريضة تكبّر الصفحة بـzoom: القياسات مكبّرة، وCSS يكبّر مرة ثانية
      const zoom = parseFloat(document.documentElement.style.zoom) || 1;
      spot.style.width = anchor.width / zoom + "px";
      spot.style.height = anchor.height / zoom + "px";
      label.style.setProperty("--float-top", top / zoom + 8 + "px");
    } else {
      spot.style.width = spot.style.height = "";
    }
    floating = should;
    spot.classList.toggle("holding", should);
    label.classList.toggle("is-floating", should);
    fold(should);
  };
  // الطافي زرّ سمّاعة صغير ما يغطي شي؛ اللمس (أو مرور الفأرة) يفتحه منزلقاً، ويرجع
  // يطوي نفسه بعد ثانيتين ونص بلا استخدام
  let foldTimer = 0;
  function fold(on) {
    clearTimeout(foldTimer);
    label.classList.toggle("is-folded", on);
  }
  const unfold = () => {
    if (!floating) return;
    fold(false);
    foldTimer = setTimeout(() => {
      // تركيز الكيبورد (Tab) يبقيه مفتوحاً؛ تركيز النقر بالفأرة/اللمس لا
      if (!label.matches(":hover") && !input.matches(":focus-visible")) fold(true);
    }, 2500);
  };
  label.addEventListener("click", (e) => {
    if (!label.classList.contains("is-folded")) return;
    e.preventDefault(); // لمسة الفتح ما تغيّر مستوى الصوت
    unfold();
  });
  label.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && unfold());
  label.addEventListener("pointerleave", () => floating && unfold());
  // مطويّ يبقى المنزلق قابلاً للتركيز (Tab)، والتركيز يفتحه
  ["input", "pointerdown", "focus"].forEach((ev) => input.addEventListener(ev, unfold));
  const onScroll = () => {
    if (!frame) frame = requestAnimationFrame(check);
  };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll, { passive: true });
  input.addEventListener("blur", onScroll);
}

