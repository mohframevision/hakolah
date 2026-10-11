/* "اختار لي" — تُحمَّل بصفحة picker.html فقط (pageScript)، بعد main.js، وتستخدم
   دواله العامة (t، sectionLabel، playClickSound، openPickerReveal). main.js
   يستدعي initRandomPicker عند DOMContentLoaded، والملف محمّل قبلها. */

/* حلزون بطاقات ثلاثي الأبعاد لـ"اختار لي" (مستوحى من pacomepertant.com) —
   CSS 3D بس بلا WebGL/مكتبات. البطاقة k على زاوية k·STEP وارتفاع k·PITCH؛
   "pos" (رقم عشري) هو البطاقة اللي بالواجهة، والدوران = تحريك pos على الحلزون.
   النتيجة عشوائية بالأصل: العيّنة نفسها عشوائية، ونوقف على بطاقة عشوائية منها.
   والزائر يقدر يسحب الحلزون بنفسه ويضغط أي بطاقة يختارها (onPick). */
// أقصى تشبّع (chroma) يقدر sRGB يعرضه لإضاءة L ودرجة لون h بـOKLCH — بحث
// ثنائي على تحويل Oklab القياسي. يُستخدم لإعطاء كل لون نفس "النسبة" من
// أقصاه، فتتساوى الحيوية بين الأزرق والأصفر بدل ما يُقصّ لون خارج النطاق
function oklchMaxChroma(L, h) {
  const inGamut = (C) => {
    const a = C * Math.cos((h * Math.PI) / 180);
    const b = C * Math.sin((h * Math.PI) / 180);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ].every((v) => v >= 0 && v <= 1);
  };
  let lo = 0;
  let hi = 0.4;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

function createPickerHelix(stage, onPick) {
  const COUNT = 30;
  // بطاقتان متجاورتان على الحلزون ما تتلامسان ما دام عرض البطاقة أقل من
  // 2·R·tan(STEP/2) — المقاسات بـstyle.css (--helix-r و--card-w) محسوبة عليها
  const STEP = 40;
  const PITCH = 30;
  const MIN_TRAVEL = 12;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let cards = [];
  let rotor = null;
  let pos = 0;
  let idleFrame = null;
  let idleStart = 0;
  let moveFrame = null;
  let busy = false;
  let drag = null;
  let lastTick = 0;
  let lastTickTime = 0;

  function render() {
    rotor.style.transform = `translateZ(calc(var(--helix-r) * -1)) translateY(${-pos * PITCH}px) rotateY(${-pos * STEP}deg)`;
    cards.forEach(({ el }, k) => {
      const facing = (Math.cos(((k - pos) * STEP * Math.PI) / 180) + 1) / 2;
      el.style.opacity = (0.15 + 0.85 * facing * facing).toFixed(3);
    });
  }

  function stopIdle() {
    cancelAnimationFrame(idleFrame);
    idleFrame = null;
  }

  // صوت "تكّة" مع كل بطاقة تمر بالواجهة (دوران أو سحب) — بحد أدنى 60ms
  // بينها عشان الحركة السريعة ما تصير ضجيج متواصل
  function moveTo(p) {
    pos = Math.max(0, Math.min(COUNT - 1, p));
    render();
    const now = performance.now();
    if (Math.round(pos) !== lastTick && now - lastTickTime > 60) {
      lastTick = Math.round(pos);
      lastTickTime = now;
      playSound("tick");
    }
  }

  function animateTo(target, duration, power, done) {
    cancelAnimationFrame(moveFrame);
    if (reduceMotion) {
      moveTo(target);
      done?.();
      return;
    }
    const from = pos;
    const start = performance.now();
    function frame(now) {
      const t = Math.min((now - start) / duration, 1);
      moveTo(from + (target - from) * (1 - Math.pow(1 - t, power)));
      if (t < 1) moveFrame = requestAnimationFrame(frame);
      else done?.();
    }
    moveFrame = requestAnimationFrame(frame);
  }

  function land(k, onDone) {
    cards[k].el.classList.add("chosen");
    playSuccessSound();
    setTimeout(
      () => {
        busy = false;
        onDone(cards[k].item);
      },
      reduceMotion ? 0 : 650
    );
  }

  // تقريباً المسافة على الشاشة بين مركزَي بطاقتين متجاورتين (وتر الدائرة).
  // مضروبة بنسبة العرض المرسوم للعرض الداخلي: مع تكبير الصفحة (zoom بـ
  // theme-init.js) إحداثيات المؤشر بكسل شاشة، و--helix-r بكسل غير مكبَّر
  function cardPx() {
    const helixEl = stage.querySelector(".picker-helix");
    const r = parseFloat(getComputedStyle(helixEl).getPropertyValue("--helix-r"));
    const scale = helixEl.getBoundingClientRect().width / helixEl.offsetWidth || 1;
    return 2 * r * Math.sin((STEP * Math.PI) / 360) * scale;
  }

  function endDrag(e, cancelled) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    stage.querySelector(".picker-helix")?.classList.remove("dragging");
    if (!d.moved) {
      // ضغطة بلا سحب = اختيار البطاقة: تدور للواجهة ثم تفتح النتيجة
      const cardEl = !cancelled && e.target.closest(".picker-helix-card");
      const k = cardEl ? cards.findIndex((c) => c.el === cardEl) : -1;
      if (k === -1) return;
      busy = true;
      cards.forEach(({ el }) => el.classList.remove("chosen"));
      animateTo(k, 450, 3, () => land(k, onPick));
      return;
    }
    // زخم خفيف: نكمل باتجاه السحب حسب سرعته ثم نثبت على أقرب بطاقة
    const target = Math.max(0, Math.min(COUNT - 1, Math.round(pos + d.v * 300)));
    animateTo(target, 500, 3);
  }

  stage.addEventListener("pointerdown", (e) => {
    if (!rotor || busy || !e.target.closest(".picker-helix")) return;
    stopIdle();
    cancelAnimationFrame(moveFrame);
    // نحسب المسافة بالبكسل مرة واحدة عند بداية السحب بدل كل pointermove —
    // تتغيّر فقط بتغيّر حجم الشاشة/التكبير، وهذا لا يحدث أثناء سحبة واحدة مستمرة
    drag = {
      id: e.pointerId,
      x: e.clientX,
      start: pos,
      lastX: e.clientX,
      lastT: e.timeStamp,
      v: 0,
      moved: false,
      px: cardPx(),
    };
  });
  stage.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(dx) < 6) return;
      drag.moved = true;
      stage.setPointerCapture(e.pointerId);
      stage.querySelector(".picker-helix").classList.add("dragging");
      cards.forEach(({ el }) => el.classList.remove("chosen"));
    }
    const dt = e.timeStamp - drag.lastT;
    if (dt > 0) drag.v = -(e.clientX - drag.lastX) / drag.px / dt;
    drag.lastX = e.clientX;
    drag.lastT = e.timeStamp;
    // سحب لليسار يجيب البطاقة اللي على اليمين للواجهة (البطاقة k+1 يمين)
    moveTo(drag.start - dx / drag.px);
  });
  stage.addEventListener("pointerup", (e) => endDrag(e, false));
  stage.addEventListener("pointercancel", (e) => endDrag(e, true));

  // تمايل هادئ ذهاباً وإياباً بين البطاقة 2 و8 — يبقى المجال للأمام فاضي للدوران
  function idle(now) {
    pos = 5 - 3 * Math.cos((now - idleStart) / 4000);
    render();
    idleFrame = requestAnimationFrame(idle);
  }

  function build(items) {
    stopIdle();
    cancelAnimationFrame(moveFrame);
    busy = false;
    stage.innerHTML = `<div class="picker-helix" aria-hidden="true"><div class="picker-helix-rotor"></div></div><p class="picker-helix-hint">${t("picker_drag_hint")}</p>`;
    rotor = stage.querySelector(".picker-helix-rotor");
    cards = Array.from({ length: COUNT }, (_, k) => {
      const item = items[Math.floor(Math.random() * items.length)];
      const el = document.createElement("div");
      el.className = "picker-helix-card";
      const hue = (k * 47) % 360;
      el.style.setProperty("--hue", hue);
      // الإضاءات (0.54 أعلى، 0.44 أسفل التدرج) مطابقة لـ.picker-helix-card بـstyle.css
      el.style.setProperty("--c1", (oklchMaxChroma(0.54, hue) * 0.85).toFixed(3));
      el.style.setProperty("--c2", (oklchMaxChroma(0.44, (hue + 40) % 360) * 0.85).toFixed(3));
      el.style.transform = `rotateY(${k * STEP}deg) translateZ(var(--helix-r)) translateY(${k * PITCH}px)`;
      el.innerHTML = `<span class="picker-helix-icon">${item.icon || "⭐"}</span><span class="picker-helix-title">${itemTitle(item)}</span>`;
      rotor.appendChild(el);
      return { el, item };
    });
    pos = 2;
    lastTick = 2;
    render();
    if (!reduceMotion) {
      idleStart = performance.now();
      idleFrame = requestAnimationFrame(idle);
    }
  }

  function spin(items, onDone) {
    if (busy) return;
    if (!rotor || pos > COUNT - 3 - MIN_TRAVEL) build(items);
    stopIdle();
    drag = null;
    busy = true;
    cards.forEach(({ el }) => el.classList.remove("chosen"));

    const minTarget = Math.ceil(pos) + MIN_TRAVEL;
    const target = minTarget + Math.floor(Math.random() * (COUNT - 3 - minTarget + 1));
    animateTo(target, 2800, 4, () => land(target, onDone));
  }

  return { build, spin };
}

function initRandomPicker() {
  const categoriesWrap = document.getElementById("pickerCategories");
  const spinBtn = document.getElementById("pickerSpinBtn");
  const stage = document.getElementById("pickerStage");
  if (!categoriesWrap || !spinBtn || !stage) return;

  // أقسام "وين أروح" بس، بترتيب الأهم — المقالات والتجارب ما لها معنى بالقرعة
  const sectionKeys = ["restaurants", "cafes", "bakeries", "places", "stores", "car-shops"].filter(
    (key) => (SITE_DATA[key]?.items || []).length > 0
  );
  let selectedSection = null;
  const helix = createPickerHelix(stage, (item) => {
    spinBtn.disabled = true;
    reveal(item);
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
      b.classList.remove("active");
      b.setAttribute("aria-pressed", "false");
    });
    btn.classList.add("active");
    btn.setAttribute("aria-pressed", "true");
    selectedSection = btn.dataset.section;
    spinBtn.disabled = false;
    helix.build(SITE_DATA[selectedSection].items);
  }
  categoriesWrap.querySelectorAll(".picker-category").forEach((btn) => {
    btn.addEventListener("click", () => {
      choose(btn);
      playClickSound();
    });
  });
  // قانون هيك: الزر يشتغل من أول لحظة — المطاعم مختارة افتراضياً (أكثر قسم يُسأل عنه)،
  // واللي يبي قسم ثاني يغيّره بضغطة
  const preset = categoriesWrap.querySelector('[data-section="restaurants"]') || categoriesWrap.querySelector(".picker-category");
  if (preset) choose(preset);

  function reveal(item) {
    openPickerReveal(item, {
      onRetry: spin,
      onClose: () => {
        spinBtn.disabled = false;
      },
    });
  }

  function spin() {
    if (!selectedSection) return;
    const items = SITE_DATA[selectedSection].items;
    if (!items || items.length === 0) return;
    spinBtn.disabled = true;
    stage.scrollIntoView({ block: "center", behavior: "smooth" });
    helix.spin(items, reveal);
  }

  spinBtn.addEventListener("click", () => {
    playClickSound();
    spin();
  });
}
