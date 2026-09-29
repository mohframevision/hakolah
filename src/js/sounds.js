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
  function buildOutput(ctx, out) {
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
    comp.connect(out);

    const delay = ctx.createDelay();
    delay.delayTime.value = 0.22;
    const feedback = ctx.createGain();
    const wet = ctx.createGain();
    delay.connect(feedback).connect(delay);
    delay.connect(wet).connect(input);
    return { input, delay, feedback, wet };
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

  // "صوتك": أي صوت يسجّله الزائر أو يختاره يصير آلة — نفس البيانو لين يوجد صوت
  INSTRUMENTS.custom = { ...INSTRUMENTS.piano, sample: true };
  let customSample = null; // AudioBuffer أحادي، مقصوص ومُطبَّع (انظر prepareSample)
  const SAMPLE_BASE = 261.63; // الصوت المسجّل يُعامل كأنه Do الوسطى (C4)

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
    const paint = () => volumeInput.style.setProperty("--level", volumeLevel * 100 + "%");
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
  instrumentButtons.forEach((el) => {
    el.addEventListener("click", () => {
      if (el.dataset.instrument === "custom" && !customSample) {
        setCustomStatus("need");
        return;
      }
      currentInstrument = el.dataset.instrument;
      instrumentButtons.forEach((b) => b.classList.toggle("active", b === el));
      updateSoundSummary();
      playClickSound();
    });
  });

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
    const pick = (sel) => document.querySelector(sel + " .active")?.textContent.trim() || "";
    now.textContent = pick("#instrumentPicker");
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
    peakGain *= instrument.level || 1; // معايرة شدة كل آلة (تُقاس آلياً)
    if (instrument.sample && customSample) return playSample(target, freq, startTime, duration, peakGain, pan);

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
        const add = (degree, startBeat, durBeats, gain, pan = clamp((degree - BASS_LOW - 3) * 0.1, -0.35, 0.35)) =>
          events.push({ degree, startBeat, durBeats, gain, pan });

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
            add(note, barBeat + beat, length * 0.92, gain, 0);
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
    const mood = MOODS[currentMood];
    const beatDur = 60 / piece.meta.bpm;
    const tail = 3; // ذيل يسع رنين آخر نغمة وصداها
    const seconds = piece.meta.totalBeats * beatDur + tail;
    const ctx = new OfflineAudioContext(1, Math.ceil(44100 * seconds), 44100);

    const bus = buildOutput(ctx, ctx.destination);
    bus.feedback.gain.value = mood.delayFeedback;
    bus.wet.gain.value = mood.delayWet;

    const target = { ctx, dry: bus.input, wet: bus.delay, live: false };
    if (piece.layers) scheduleLayers(target, piece.layers, 0.05);
    else scheduleEvents(target, piece, 0.05);
    return ctx.startRendering();
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
        if (!c.hidden) shown++;
      });
      groups.forEach((g) => (g.hidden = !g.querySelector(".instrument-btn:not([hidden])")));
      none.hidden = shown > 0;
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

  /* ===== اعزف بنفسك: بيانو بالكيبورد (مثل وضع لوحة الكمبيوتر بباندلاب) =====
     الصف الأوسط = المفاتيح البيضاء، والصف فوقه = السوداء بنفس ترتيب البيانو.
     نقرأ e.code (المفتاح الفعلي) لا e.key، فيشتغل حتى لو الكيبورد عربي.
     الصوت = الآلة المختارة بلوحة "الآلة والطابع" ونفس مسار الخروج. */
  const playBox = document.getElementById("beepPlayKeys");
  const KEY_MAP = {
    KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6, KeyG: 7, KeyY: 8, KeyH: 9,
    KeyU: 10, KeyJ: 11, KeyK: 12, KeyO: 13, KeyL: 14, KeyP: 15, Semicolon: 16, Quote: 17,
  };
  const KEY_LABEL = { Semicolon: ";", Quote: "'" };
  const CHROMA = {
    letters: ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"],
    solfege: ["Do", "Do♯", "Re", "Re♯", "Mi", "Fa", "Fa♯", "Sol", "Sol♯", "La", "La♯", "Si"],
  };
  let playOctave = 4;
  // ما يُكتب على المفاتيح المرسومة: أحرف الكيبورد (الافتراضي) أو أسماء النغمات
  // القياسية C D E أو Do Re Mi — للتعلّم. التحكم نفسه بالحالات الثلاث لا يتغيّر.
  let labelMode = "keys";
  try {
    const saved = localStorage.getItem("beepLabels");
    if (saved === "letters" || saved === "solfege") labelMode = saved;
  } catch {
    // التخزين محجوب — الافتراضي
  }
  const held = new Map(); // المفتاح الممسوك → غلاف صوته (نخمده لما ينرفع)

  function renderPlayKeys() {
    if (!playBox) return;
    const codes = Object.keys(KEY_MAP);
    const whites = codes.filter((c) => ![1, 3, 6, 8, 10, 13, 15].includes(KEY_MAP[c]));
    playBox.style.setProperty("--whites", whites.length);
    playBox.dataset.labels = labelMode;
    playBox.innerHTML = codes
      .map((code) => {
        const semi = KEY_MAP[code];
        const black = !whites.includes(code);
        // السوداء تقع على الحد بين البيضاء اللي قبلها واللي بعدها
        const pos = black ? whites.filter((c) => KEY_MAP[c] < semi).length : whites.indexOf(code);
        const letter = KEY_LABEL[code] || code.slice(3);
        const asNotes = labelMode !== "keys";
        const name = CHROMA[asNotes ? labelMode : noteStyle][semi % 12];
        return `<button type="button" class="${black ? "pk-black" : "pk-white"}" data-code="${code}" style="--i:${pos}" aria-label="${name}"><b>${asNotes ? name : letter}</b>${asNotes ? "" : `<small>${name}</small>`}</button>`;
      })
      .join("");
    document.getElementById("beepOctLabel").textContent = "C" + playOctave;
  }

  async function keyOn(code) {
    if (held.has(code)) return;
    held.set(code, null); // نحجزه قبل await عشان التكرار ما يعزفه مرتين
    const pressedAt = performance.now(); // وقت الضغط الفعلي، قبل انتظار تجهيز الصوت
    await ensureContext();
    const semi = KEY_MAP[code] + 12 * (playOctave - 4);
    const midi = 60 + semi;
    const freq = 261.63 * 2 ** (semi / 12);
    // درجة تقريبية على سلّم المولّد — بس لرنين الواطي الأطول والحاد الأقصر
    const pseudoIndex = clamp(Math.round(((midi - 48) * 7) / 12), 0, 21);
    if (rec) {
      const ev = { code, degree: pseudoIndex, freq, startBeat: (pressedAt - rec.t0) / 1000, durBeats: 0, held: 0, gain: 0.2, pan: 0 };
      rec.open.set(code, ev);
      rec.events.push(ev);
    }
    const target = { ctx: audioCtx, dry: masterInput, wet: delayNode, live: false };
    const env = playNote(target, pseudoIndex, audioCtx.currentTime + 0.005, holdSeconds(currentInstrument), 0.2, 0, 0, freq);
    if (!held.has(code)) {
      noteEnd(code); // انرفع قبل ما يجهز الصوت
      return keyRelease(env);
    }
    held.set(code, env);
    playBox?.querySelector(`[data-code="${code}"]`)?.classList.add("down");
  }

  // آلة ممدودة (أرغن، كورس، وتريات...) تستمر ما دام المفتاح مضغوطاً؛ المقروعة تخفت
  // طبيعياً. الرفع يخمّد الاثنين (keyRelease)، فالمدة الطويلة ما تكلّف شي بعد الرفع.
  const holdSeconds = (id) => (INSTRUMENTS[id].sustainRatio > 0 ? 12 : 2.4);

  function keyRelease(env) {
    if (!env) return;
    const now = audioCtx.currentTime;
    env.gain.cancelScheduledValues(now);
    env.gain.setTargetAtTime(0.0001, now, 0.09); // مخمّد البيانو: ذيل قصير ناعم مو قطع
  }

  function keyOff(code) {
    if (!held.has(code)) return;
    keyRelease(held.get(code));
    held.delete(code);
    noteEnd(code);
    playBox?.querySelector(`[data-code="${code}"]`)?.classList.remove("down");
  }

  /* ===== تسجيل العزف بطبقات =====
     كل تسجيل "طبقة": قائمة نغمات (الوقت، النغمة، مدة الضغط) بنفس شكل أحداث المولّد
     مع آلتها — فمصدّرات WAV وMP3 وMIDI تشتغل عليها كما هي. نبضة القطعة ٦٠ (الضربة =
     ثانية) عشان الأوقات الحقيقية تنطبق على الضربات مباشرة. الطبقة الجديدة تُسجَّل
     وباقي الطبقات تُعزف معها على خط زمن واحد (الطبقة الأولى فقط تُقصّ من صمتها
     الأول). التسجيل قائمة نغمات لا صوت ملتقط: كل طبقة تُعزف وتُصدَّر بآلتها. */
  const MAX_TAKE_SECONDS = 300;
  const MAX_LAYERS = 8;
  let rec = null; // تسجيل جارٍ: { t0, open: Map(code→حدث), events, timer, instrument, base }
  let layers = []; // [{ events, instrument, muted, end }]
  let takeTimers = [];

  const recToggle = document.getElementById("beepRecToggle");
  const recTime = document.getElementById("beepRecTime");
  const recTake = document.getElementById("beepRecTake");
  const recPlay = document.getElementById("beepRecPlay");

  const sounding = () => layers.filter((l) => !l.muted);
  const instrumentLabel = (id) => document.querySelector(`.instrument-btn[data-instrument="${id}"]`)?.textContent.trim() || id;
  const clock = (sec) => Math.floor(sec / 60) + ":" + String(Math.floor(sec % 60)).padStart(2, "0");
  const idleLabel = () => (layers.length ? recToggle.dataset.more : recToggle.dataset.label);

  // كل طبقة بآلتها: نبدّل الآلة العامة أثناء الجدولة فقط (playNote يقرأها لحظتها)
  function scheduleLayers(target, list, start, from = 0) {
    const saved = currentInstrument;
    list.forEach((l) => {
      currentInstrument = l.instrument;
      const all = clipEvents(l);
      const events = from ? all.filter((e) => e.startBeat + l.offset >= from) : all;
      scheduleEvents(target, { events, meta: { bpm: 60 } }, start + l.offset - from);
    });
    currentInstrument = saved;
  }

  // "قطعة" كاملة من الطبقات غير المكتومة — تمرّ على نفس مصدّرات المولّد
  function mixPiece() {
    const live = sounding();
    return {
      layers: live,
      events: live.flatMap((l) => clipEvents(l).map((e) => ({ ...e, startBeat: e.startBeat + l.offset }))), // MIDI: مسار واحد (الآلات ما تُحفظ فيه)
      meta: { seed: "piano", bpm: 60, meter: 4, totalBeats: Math.max(...live.map(layerEnd)) },
    };
  }

  function noteEnd(code) {
    const ev = rec?.open.get(code);
    if (!ev) return;
    rec.open.delete(code);
    ev.held = Math.max(0.05, (performance.now() - rec.t0) / 1000 - ev.startBeat);
    // مدة الرنين = مدة الضغط + ذيل قصير (المخمّد الحي يقطع الرنين بعد الرفع بنحو ٠٫٤ث)
    ev.durBeats = Math.min(holdSeconds(rec.instrument), ev.held + 0.4);
  }

  /* ===== لوحة المسارات (مثل باند لاب) =====
     كل طبقة "مقطع" (clip) له آلته ونغماته، يقف بمسار (row) وزمن (offset بالثواني).
     يُسحب بحرية: يميناً ويساراً بالزمن، وفوق وتحت بين المسارات (السحب لتحت آخر
     مسار يفتح مساراً جديداً، والمسارات الفارغة تُطوى). المؤشر الأبيض الثابت يوضع
     بالنقر/السحب على المسطرة، وعنده يُقصّ المقطع المحدد. المقاطع تُعزف كلها معاً
     مهما كان مسارها؛ المسار للترتيب البصري فقط. */
  const timeline = document.getElementById("beepTimeline");
  const ruler = document.getElementById("beepRuler");
  const playhead = document.getElementById("beepPlayhead");
  const board = document.getElementById("beepBoard");
  const tools = document.getElementById("beepClipTools");
  const ROW_H = 44;
  let pxPerSec = 30;
  let timelineSeconds = 10;
  let playheadTimer = null;
  let cursor = 0; // موضع المؤشر الأبيض الثابت (ثوانٍ) — نقطة القص
  let selected = null; // المقطع المحدد

  const snap = (sec) => Math.max(0, Math.round(sec * 20) / 20); // خطوة ٥٠م.ث
  const layerLen = (l) => l.t1 - l.t0; // طول الجزء الظاهر من المقطع
  const layerEnd = (l) => l.offset + layerLen(l);
  // النغمات الظاهرة داخل نافذة المقطع [t0,t1] بأوقات نسبية لبدايته؛ النغمة التي تعبر
  // النهاية تُقصّر. التقصير لا يمسح شيئاً (l.events كما سُجّلت)، فالتطويل يرجّعها.
  function clipEvents(l) {
    const out = [];
    l.events.forEach((ev) => {
      if (ev.startBeat < l.t0 - 1e-6 || ev.startBeat >= l.t1) return;
      const held = Math.min(ev.held, l.t1 - ev.startBeat);
      out.push({ ...ev, startBeat: ev.startBeat - l.t0, held, durBeats: held < ev.held ? held + 0.4 : ev.durBeats });
    });
    return out;
  }
  const rowCount = () => (layers.length ? Math.max(...layers.map((l) => l.row)) + 1 : 0);

  // مسار فاضي بالنص ما له معنى: نرقّم المسارات المستعملة من جديد بلا فراغات
  function compactRows() {
    const used = [...new Set(layers.map((l) => l.row))].sort((a, b) => a - b);
    layers.forEach((l) => (l.row = used.indexOf(l.row)));
  }

  // sec = رقم: الخط يمشي مع التشغيل/التسجيل. null: يرجع لمكان المؤشر الثابت
  function setPlayhead(sec) {
    const idle = sec == null;
    playhead.hidden = layers.length === 0;
    playhead.classList.toggle("idle", idle);
    playhead.style.left = Math.min(Math.max(0, idle ? cursor : sec), timelineSeconds) * pxPerSec + "px";
  }

  function updateTools() {
    tools.querySelectorAll("button").forEach((b) => (b.disabled = !selected));
    const mute = document.getElementById("beepToolMute");
    mute.textContent = selected?.muted ? mute.dataset.unmute : mute.dataset.mute;
  }

  function select(l) {
    selected = l;
    board.querySelectorAll(".beep-clip").forEach((c) => c.classList.toggle("selected", layers[+c.dataset.i] === l));
    updateTools();
  }

  function drawClip(canvas, l, w, h) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.round(h * dpr);
    const g = canvas.getContext("2d");
    g.scale(dpr, dpr);
    const evs = clipEvents(l);
    const ms = evs.map((ev) => 69 + 12 * Math.log2(ev.freq / 440));
    const lo = Math.min(...ms);
    const hi = Math.max(...ms);
    g.fillStyle = "rgba(255,255,255,0.92)";
    evs.forEach((ev, i) => {
      const y = hi === lo ? h / 2 - 1.5 : 12 + (1 - (ms[i] - lo) / (hi - lo)) * (h - 18); // النغمة الأحد أعلى
      g.fillRect(ev.startBeat * pxPerSec, y, Math.max(2, ev.held * pxPerSec), 3);
    });
  }

  const focusLayer = (l) => board.querySelector('[data-i="' + layers.indexOf(l) + '"]')?.focus({ preventScroll: true }); // بلا قفز للصفحة على الجوال

  /* تراجع/إعادة: لقطة سطحية من قائمة الطبقات قبل كل تعديل. مصفوفات النغمات تُشارَك
     بين اللقطات لأنها لا تتغيّر بعد التسجيل (القص ينشئ نسخاً جديدة). */
  const HISTORY_MAX = 60;
  let history = [];
  let future = [];
  let clipboard = null;
  const snapshot = () => layers.map((l) => ({ ...l }));
  function pushHistory(before = snapshot()) {
    history.push(before);
    if (history.length > HISTORY_MAX) history.shift();
    future = [];
  }
  function restoreFrom(from, to) {
    if (!from.length) return;
    to.push(snapshot());
    layers = from.pop();
    selected = null;
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

  const cloneLayer = (l) => ({ ...l, events: l.events.map((e) => ({ ...e })), lastTap: 0 });
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
    pushHistory();
    const copy = { ...selected, events: selected.events.map((e) => ({ ...e })), offset: selected.offset + layerLen(selected), lastTap: 0 };
    layers.splice(layers.indexOf(selected) + 1, 0, copy);
    selected = copy;
    renderLayers();
  }

  // قص المقطع المحدد عند المؤشر الأبيض. القص غير مدمّر: نقسم "نافذة" المقطع [t0,t1]
  // إلى نافذتين على نفس النغمات — فيبقى تطويل الحافة لاحقاً يرجّع كل شي. نغمة تعبر
  // نقطة القص تُقصّر يسارها ولا تُكمَل يمينها. ponytail: مثل قص MIDI بسيط
  function splitSelected() {
    const l = selected;
    if (!l) return;
    const t = l.t0 + (cursor - l.offset); // نقطة القص بزمن المقطع الأصلي
    const a = { ...l, t1: t };
    const b = { ...l, t0: t, offset: l.offset + (t - l.t0), lastTap: 0 };
    const inside = t > l.t0 + 0.05 && t < l.t1 - 0.05;
    if (!inside || !clipEvents(a).length || !clipEvents(b).length) return showToast(document.getElementById("beepToolSplit").dataset.cut);
    pushHistory();
    layers.splice(layers.indexOf(l), 1, a, b);
    selected = b;
    renderLayers();
  }

  /* تقصير/تطويل المقطع بسحب حافته (بلا قص): الحافة اليمنى تغيّر t1، واليسرى تغيّر
     t0 وتحرّك offset بنفس المقدار فيبقى المحتوى مكانه. غير مدمّر: التطويل يرجّع
     النغمات المخفية، لحد طول التسجيل الأصلي. */
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
    const move = (ev) => {
      const d = (ev.clientX - x0) / pxPerSec;
      if (side === "right") {
        l.t1 = Math.min(l.end, Math.max(l.t0 + TRIM_MIN, Math.round((t1a + d) * 20) / 20));
      } else {
        const lowest = Math.max(0, t0a - offa); // لا يتجاوز بداية المحتوى ولا بداية الجدول
        const nt0 = Math.min(l.t1 - TRIM_MIN, Math.max(lowest, Math.round((t0a + d) * 20) / 20));
        l.offset = snap(offa + (nt0 - t0a));
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
    clip.className = "beep-clip" + (l.muted ? " muted" : "") + (l === selected ? " selected" : "");
    clip.dataset.i = String(i);
    clip.style.setProperty("--h", String((i * 53 + 150) % 360));
    clip.tabIndex = 0;
    clip.setAttribute("role", "button");
    clip.setAttribute("aria-pressed", String(l === selected));
    clip.title = instrumentLabel(l.instrument);
    clip.setAttribute("aria-label", recTake.dataset.layer + " " + (i + 1) + " · " + instrumentLabel(l.instrument));
    const w = Math.max(8, layerLen(l) * pxPerSec);
    clip.style.left = l.offset * pxPerSec + "px";
    clip.style.top = l.row * ROW_H + 3 + "px";
    clip.style.width = w + "px";
    clip.style.height = ROW_H - 6 + "px";
    const label = document.createElement("span");
    label.className = "beep-clip-label";
    label.textContent = instrumentLabel(l.instrument).split(" ")[0]; // الرمز فقط: الاسم لا يتسع بمقطع قصير
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
      cursor = snap((e.clientX - board.getBoundingClientRect().left) / pxPerSec);
      setPlayhead(null);
      clip.classList.add("dragging");
      const x0 = e.clientX;
      const y0 = e.clientY;
      const off0 = l.offset;
      const row0 = l.row;
      const before = snapshot(); // للتراجع
      const maxRow = rowCount(); // آخر خانة = مسار جديد تحت الكل
      let moved = false;
      const move = (ev) => {
        l.offset = snap(off0 + (ev.clientX - x0) / pxPerSec);
        l.row = Math.min(maxRow, Math.max(0, row0 + Math.round((ev.clientY - y0) / ROW_H)));
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
          // نقرتان سريعتان بلا سحب = رجوع لبداية الزمن. dblclick الأصلي ما يصلح:
          // renderLayers تستبدل العنصر بين النقرتين فلا يوصله الحدث
          const now = performance.now();
          if (now - (l.lastTap || 0) < 350 && l.offset !== 0) {
            pushHistory(before);
            l.offset = 0;
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
      const step = e.shiftKey ? 1 : 0.1;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        pushHistory();
        l.offset = snap(l.offset + (e.key === "ArrowRight" ? 1 : -1) * step);
      } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        pushHistory();
        l.row = Math.min(rowCount(), Math.max(0, l.row + (e.key === "ArrowDown" ? 1 : -1)));
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
    recTake.hidden = layers.length === 0;
    if (!rec) recToggle.textContent = idleLabel();

    const laneW = board.clientWidth;
    timelineSeconds = Math.max(6, Math.ceil(Math.max(0, ...layers.map(layerEnd))) + 2); // تسجيلة قصيرة تظهر عريضة
    pxPerSec = laneW > 0 ? laneW / timelineSeconds : 30; // مخفي (عرض صفر): نرسم عند ظهوره
    timeline.style.setProperty("--px", pxPerSec + "px");
    board.style.setProperty("--rowh", ROW_H + "px");
    board.style.height = (rowCount() + 1) * ROW_H + "px"; // + مسار فاضي للإسقاط فيه

    // المسطرة: علامة كل ١/٥/١٠ ثوانٍ حسب الطول
    const step = timelineSeconds > 40 ? 10 : timelineSeconds > 20 ? 5 : 1;
    ruler.replaceChildren(
      ...Array.from({ length: Math.floor(timelineSeconds / step) + 1 }, (_, k) => {
        const tick = document.createElement("span");
        tick.className = "beep-tick";
        tick.style.left = k * step * pxPerSec + "px";
        tick.textContent = k * step < 60 ? String(k * step) : clock(k * step); // ثوانٍ فقط: "0:01" تزاحم بعضها
        return tick;
      })
    );

    board.replaceChildren(...layers.map(buildClip));
    updateTools();
    if (!playheadTimer) setPlayhead(null);
  }

  /* تحريك المؤشر الأبيض بالسحب من أي مكان: اللوحة الفاضية، المسطرة، أو مقبضه
     الدائري. preventDefault يمنع المتصفح من تظليل النص أثناء السحب (كان يبدأ
     تحديد الأرقام وينفصل الخط عن الماوس لأن اللوحة كانت تسمع الضغطة فقط). */
  function scrub(e, captureEl, rectEl) {
    if (e.button) return;
    e.preventDefault();
    captureEl.setPointerCapture(e.pointerId);
    const set = (ev) => {
      cursor = snap((ev.clientX - rectEl.getBoundingClientRect().left) / pxPerSec);
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
  const knob = document.createElement("span");
  knob.className = "beep-playhead-knob";
  playhead.append(knob);
  knob.addEventListener("pointerdown", (e) => scrub(e, knob, timeline));

  [
    ["beepToolSplit", splitSelected],
    ["beepToolCopy", copySelected],
    ["beepToolMute", toggleMute],
    ["beepToolDelete", deleteSelected],
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
    resizeTimer = setTimeout(() => layers.length && renderLayers(), 150);
  });

  async function startRec() {
    if (layers.length >= MAX_LAYERS) return showToast(recTake.dataset.max);
    if (playing) stopPlayback(); // مولّد المقطوعات ما يتزامن مع التسجيل
    await ensureContext();
    if (rec) return; // ضغطتين سريعتين
    stopTake();
    const base = layers.length === 0;
    const start = audioCtx.currentTime + 0.1;
    if (!base) scheduleLayers({ ctx: audioCtx, dry: masterInput, wet: delayNode, live: true }, sounding(), start);
    // الطبقات القديمة تبدأ بعد ٠٫١ث: زمن التسجيل يتأخر بنفس المقدار عشان يتطابقان
    rec = { t0: performance.now() + (base ? 0 : 100), open: new Map(), events: [], timer: null, instrument: currentInstrument, base };
    recToggle.textContent = recToggle.dataset.stop;
    recToggle.classList.add("recording");
    recTime.textContent = "0:00";
    rec.timer = setInterval(() => {
      const sec = Math.max(0, (performance.now() - rec.t0) / 1000);
      recTime.textContent = clock(sec);
      if (layers.length) setPlayhead(sec); // خط التشغيل يمشي فوق الطبقات اللي تُعزف معك
      if (sec >= MAX_TAKE_SECONDS) stopRec();
    }, 100);
  }

  function stopRec() {
    clearInterval(rec.timer);
    stopTake(); // أوقف الطبقات اللي كانت تُعزف مع التسجيل
    [...rec.open.keys()].forEach(noteEnd);
    const { events, instrument, base } = rec;
    rec = null;
    recToggle.classList.remove("recording");
    if (!events.length) {
      recToggle.textContent = idleLabel();
      recTime.textContent = "";
      showToast(recToggle.dataset.empty);
      return;
    }
    // الطبقة الأولى تبدأ بأول نغمة (نقصّ الصمت)؛ اللاحقة تحافظ على توقيتها مع الأولى
    const first = base ? Math.min(...events.map((e) => e.startBeat)) : 0;
    events.forEach((e) => (e.startBeat = Math.max(0, e.startBeat - first)));
    const end = Math.max(...events.map((e) => e.startBeat + e.durBeats));
    pushHistory();
    layers.push({ events, instrument, muted: false, end, t0: 0, t1: end, offset: 0, row: rowCount() }); // مسار جديد تحت الباقي
    recTime.textContent = clock(Math.max(...layers.map(layerEnd)) - 0.4) + " · " + layers.length + " ▤";
    renderLayers();
  }

  function stopTake() {
    takeTimers.forEach(clearTimeout);
    takeTimers = [];
    clearInterval(playheadTimer);
    playheadTimer = null;
    setPlayhead(null);
    activeOscillators.forEach((osc) => {
      try {
        osc.stop();
      } catch {
        // خلص وقته أصلاً
      }
    });
    activeOscillators = [];
    playBox?.querySelectorAll(".down").forEach((k) => k.classList.remove("down"));
    if (recPlay) recPlay.textContent = recPlay.dataset.play;
  }

  const ctx0 = () => audioCtx.currentTime;

  // fromStart=false: يبدأ من المؤشر الأبيض (مثل Space بباند لاب)، وإن كان المؤشر
  // عند النهاية أو بعدها يبدأ من الصفر. ponytail: نغمة بدأت قبل نقطة البداية ولسا
  // ترنّ لا تُعزف (لا نقص جزئي للنغمة)
  async function playTake(fromStart = false) {
    const list = sounding();
    if (!list.length) return showToast(recTake.dataset.silent);
    if (playing) stopPlayback();
    await ensureContext();
    stopTake();
    const total = Math.max(...list.map(layerEnd));
    const from = fromStart || cursor >= total - 0.05 ? 0 : cursor;
    const start = audioCtx.currentTime + 0.1;
    scheduleLayers({ ctx: audioCtx, dry: masterInput, wet: delayNode, live: true }, list, start, from);
    // المفاتيح تنضغط وتنرفع مع الصوت (نفس شكل العزف الحي)
    list.forEach((l) =>
      clipEvents(l).forEach((ev) => {
        const at = ev.startBeat + l.offset - from;
        if (at < 0) return;
        const key = () => playBox?.querySelector(`[data-code="${ev.code}"]`);
        takeTimers.push(
          setTimeout(() => key()?.classList.add("down"), 100 + at * 1000),
          setTimeout(() => key()?.classList.remove("down"), 100 + (at + ev.held) * 1000)
        );
      })
    );
    recPlay.textContent = recPlay.dataset.stop;
    takeTimers.push(setTimeout(stopTake, 200 + (total - from) * 1000));
    playheadTimer = setInterval(() => setPlayhead(from + ctx0() - start), 50);
  }

  async function exportTake(btn, make, ext) {
    if (!sounding().length) return showToast(recTake.dataset.silent);
    const original = btn.textContent;
    btn.disabled = true;
    if (btn.dataset.working) btn.textContent = btn.dataset.working;
    try {
      downloadBlob(await make(mixPiece()), `hakolah-piano-${Date.now()}.${ext}`);
    } catch {
      showToast(btn.dataset.failed || "");
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
    playClickSound();
  }

  if (recToggle) {
    recToggle.addEventListener("click", () => {
      if (rec) stopRec();
      else startRec();
      playClickSound();
    });
    recPlay.addEventListener("click", () => (takeTimers.length ? stopTake() : playTake()));
    document.getElementById("beepRecWav").addEventListener("click", (e) => exportTake(e.currentTarget, renderPieceToWav, "wav"));
    document.getElementById("beepRecMp3").addEventListener("click", (e) => exportTake(e.currentTarget, renderPieceToMp3, "mp3"));
    document.getElementById("beepRecMidi").addEventListener("click", (e) => exportTake(e.currentTarget, async (p) => pieceToMidi(p), "mid"));
    document.getElementById("beepRecClear").addEventListener("click", () => {
      stopTake();
      pushHistory();
      layers = [];
      selected = null;
      recTime.textContent = "";
      renderLayers();
      playClickSound();
    });
  }

  /* ===== اختصارات لوحة المفاتيح (على خريطة باند لاب ستوديو) =====
     Space تشغيل/إيقاف من الخط الأبيض · Shift+Space من البداية · R تسجيل · Esc إيقاف ·
     S قص · Delete حذف · Ctrl+C/X/V نسخ/قص/لصق · Ctrl+D تكرار · Shift+M كتم ·
     Ctrl+Z تراجع · Enter/Home/End تنقّل المؤشر · Ctrl+/ قائمة الاختصارات.
     تعارض واحد: S نغمة بيانو أيضاً، فتقصّ فقط لما تكون طبقة محددة (وضع التحرير)؛
     Esc يلغي التحديد فيرجع S نغمة. مفاتيح البيانو الباقية لا تُلمس. */
  const shortcutsBox = document.getElementById("beepShortcuts");
  const SHORTCUT_KEYCODES = { 32: "Space", 27: "Escape", 46: "Delete", 8: "Backspace", 36: "Home", 35: "End", 13: "Enter", 191: "Slash", 37: "ArrowLeft", 39: "ArrowRight" };
  function shortcutCode(e) {
    if (e.code && e.code !== "Unidentified") return e.code;
    if (SHORTCUT_KEYCODES[e.keyCode]) return SHORTCUT_KEYCODES[e.keyCode];
    return e.keyCode >= 65 && e.keyCode <= 90 ? "Key" + String.fromCharCode(e.keyCode) : "";
  }
  const totalSeconds = () => Math.max(0, ...layers.map(layerEnd));

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
      const hasLayers = layers.length > 0 || rec;
      if (code === "Space" && hasLayers) {
        if (rec) stopRec();
        else if (takeTimers.length) stopTake();
        else playTake(e.shiftKey);
      } else if (code === "KeyR" && !mod && !e.shiftKey && !e.altKey) {
        recToggle.click();
      } else if (code === "Escape") {
        if (rec) stopRec();
        stopTake();
        select(null);
      } else if (code === "Enter" && !onButton && layers.length) {
        cursor = 0;
        setPlayhead(null);
      } else if ((code === "Home" || code === "End") && layers.length) {
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
      } else if ((code === "Delete" || code === "Backspace") && selected) {
        deleteSelected();
      } else if (code === "KeyS" && !mod && !e.shiftKey && selected) {
        splitSelected();
      } else if (code === "KeyM" && e.shiftKey && !mod && selected) {
        toggleMute();
      } else if ((code === "ArrowLeft" || code === "ArrowRight") && !e.target.closest(".beep-clip") && layers.length) {
        cursor = snap(cursor + (code === "ArrowRight" ? 1 : -1) * (e.shiftKey ? 1 : 0.1));
        setPlayhead(null);
      } else {
        handled = false;
      }
      if (handled) e.preventDefault(); // يمنع Space يفعّل زراً مركّزاً أو يمرّر الصفحة، وCtrl+Z يتراجع بمكان ثاني
    });
  }

  function shiftOctave(step) {
    playOctave = clamp(playOctave + step, 2, 6);
    renderPlayKeys();
    playClickSound();
  }

  if (playBox) {
    renderPlayKeys();
    noteNameToggle?.addEventListener("click", renderPlayKeys);
    const labelChips = document.querySelectorAll("#beepPlayLabels [data-labels]");
    const markLabels = () => labelChips.forEach((c) => c.classList.toggle("active", c.dataset.labels === labelMode));
    markLabels();
    labelChips.forEach((chip) =>
      chip.addEventListener("click", () => {
        labelMode = chip.dataset.labels;
        try {
          localStorage.setItem("beepLabels", labelMode);
        } catch {
          // لا شيء
        }
        markLabels();
        renderPlayKeys();
        playClickSound();
      })
    );
    // ملء الشاشة: يخفي شريط المتصفح بالجوال الأفقي. داخل التطبيق ما يشتغل (WebView
    // بلا onShowCustomView) والتطبيق يخفي أشرطته بنفسه عند الأفقي
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
    document.addEventListener("keydown", (e) => {
      if (e.defaultPrevented || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return; // defaultPrevented: اختصار محرّر أخذ المفتاح
      if (e.target.closest("input, textarea, select, [contenteditable]")) return;
      // البيانو للتبويب "اعزف" فقط — بغيره (تأليف/تعلّم) الحروف ما تعزف نغمات مفاجئة
      if (document.getElementById("panePlay").hidden) return;
      const code = physicalCode(e);
      if (code === "KeyZ" || code === "KeyX") {
        shiftOctave(code === "KeyZ" ? -1 : 1);
      } else if (code in KEY_MAP) {
        e.preventDefault(); // ' بفايرفوكس يفتح البحث السريع
        keyOn(code);
      }
    });
    document.addEventListener("keyup", (e) => keyOff(physicalCode(e)));
    // الصفحة فقدت التركيز والمفتاح ممسوك: ما بيوصلنا keyup، نسكّت الكل
    window.addEventListener("blur", () => [...held.keys()].forEach(keyOff));

    // اللمس بالجوال: كل إصبع مفتاح مستقل
    playBox.addEventListener("pointerdown", (e) => {
      const key = e.target.closest("[data-code]");
      if (!key) return;
      e.preventDefault();
      key.releasePointerCapture?.(e.pointerId);
      keyOn(key.dataset.code);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach((type) =>
      playBox.addEventListener(type, (e) => {
        const key = e.target.closest("[data-code]");
        if (key) keyOff(key.dataset.code);
      }, true)
    );
  }

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
