/* ===== دعم اللغتين (عربي/إنجليزي) — window.SITE_LANG وwindow.I18N يُضبطان من
   base.njk. t() يرجع نص الواجهة المناسب، itemTitle/itemDesc يرجعان الترجمة
   الإنجليزية للعنصر لو متوفرة، وإلا يرجعان النص العربي (تدهور تدريجي — عنصر
   ما تُرجم بعد يبقى يظهر بالعربي حتى بصفحة إنجليزية، بدل ما يختفي) ===== */
function t(key) {
  const lang = window.SITE_LANG || "ar";
  return (window.I18N && window.I18N[lang] && window.I18N[lang][key]) || key;
}

function itemTitle(item) {
  return window.SITE_LANG === "en" && item.title_en ? item.title_en : item.title;
}

function itemDesc(item) {
  return window.SITE_LANG === "en" && item.desc_en ? item.desc_en : item.desc || "";
}

function itemHours(item) {
  return window.SITE_LANG === "en" && item.hours_en ? item.hours_en : item.hours || "";
}

// قاموس ترجمة التصنيفات يجي من ملف data.js (متغيّر TAGS_EN)، ومصدره
// الأصلي src/_data/tags_en.js — نفسه اللي تستخدمه القوالب وقت البناء.

function tagLabel(tag) {
  if (window.SITE_LANG === "en") return (typeof TAGS_EN !== "undefined" && TAGS_EN[tag]) || tag;
  return tag;
}

function tagIcon(tag) {
  return (typeof TAG_ICONS !== "undefined" && TAG_ICONS[tag]) || "";
}

// اسم القسم بلغة الصفحة الحالية — يقرأ title_en المولّد ببناء data.js من
// sections/*.md مباشرة (مو قاموس ثابت هنا)، فقسم جديد يُضاف من لوحة التحكم
// يظهر باسمه الإنجليزي تلقائياً بدون تعديل هذا الملف
function sectionLabel(section) {
  const meta = SITE_DATA[section];
  if (!meta) return section;
  return window.SITE_LANG === "en" ? meta.title_en || meta.title : meta.title;
}

/* ===== تخزين آمن: Safari بوضع "منع كل الكوكيز" وبعض أوضاع الخصوصية ترمي استثناء
   بمجرد لمس localStorage. بدون هذا الغلاف كان الاستثناء يوقف تهيئة الموقع كلها
   (القائمة ما تنفتح، والرئيسية بلا بطاقات). القراءة الفاشلة = null، والكتابة
   الفاشلة (محجوب أو ممتلئ) تُتجاهل بصمت فيكمل الموقع بلا حفظ. ===== */
function storageCall(area, method, ...args) {
  try {
    return window[area][method](...args);
  } catch {
    return null;
  }
}
const lsGet = (key) => storageCall("localStorage", "getItem", key);
// الكتابة ترجّع true لو نجحت فعلاً — حاسبة المصروفات تنبّه المستخدم لو بياناته ما انحفظت
const lsSet = (key, value) => storageCall("localStorage", "setItem", key, value) !== null;
const lsRemove = (key) => storageCall("localStorage", "removeItem", key);
const ssGet = (key) => storageCall("sessionStorage", "getItem", key);
const ssSet = (key, value) => storageCall("sessionStorage", "setItem", key, value) !== null;

// نص من بيانات المحتوى داخل HTML مبني كسلسلة: علامة " بعنوان (موجودة فعلاً بعناوين
// بعض الأدلة) كانت تقطع سمة alt وتكسر وسم الصورة
function escapeHtml(text) {
  return String(text ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

/* ===== بحث ذكي متسامح مع الأخطاء الإملائية ===== */
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prevRow = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const currRow = [i];
    for (let j = 1; j <= n; j++) {
      currRow[j] =
        a[i - 1] === b[j - 1]
          ? prevRow[j - 1]
          : 1 + Math.min(prevRow[j], currRow[j - 1], prevRow[j - 1]);
    }
    prevRow = currRow;
  }
  return prevRow[n];
}

/* توحيد النص للبحث: أشكال الألف والتاء المربوطة والياء والتشكيل، و«ال» بأول الكلمة
   («الشعلة» = «شعلة») — نفس قواعد صفحة البحث (search.js) */
function searchNorm(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/^(و?ال)(?=\S{2,})/, ""))
    .join(" ");
}

// كلمات عامة قبل الاسم الحقيقي: «مطعم المحور» يُبحث عنه بـ«المحور»
const SEARCH_GENERIC = new Set(
  ["مطعم", "مطاعم", "مقهي", "مقهى", "كافيه", "كافي", "كوفي", "مخبز", "مخابز", "محل", "محلات", "مطبخ", "فرع", "restaurant", "cafe", "coffee", "bakery", "kitchen", "the", "branch"].map((w) => searchNorm(w))
);

/* مدى تطابق العنصر مع البحث (٠ = ما يطابق): الاسم أولاً، وبالذات بدايته بعد الكلمات
   العامة، ثم الكلمات الكاملة، ثم التصنيفات والوصف، ثم الأخطاء الإملائية آخر شي */
function searchScore(item, query) {
  const q = searchNorm(query);
  if (!q) return 1;
  const title = searchNorm(`${item.title || ""} ${item.title_en || ""}`);
  const names = [item.title, item.title_en].map((tt) => searchNorm(tt).split(" ").filter((w) => !SEARCH_GENERIC.has(w)).join(" "));
  const words = title.split(" ");
  const qWords = q.split(" ").filter((w) => !SEARCH_GENERIC.has(w));
  const core = qWords.join(" ") || q;
  if (names.some((n) => n === core)) return 100;
  if (names.some((n) => n.startsWith(core))) return 90;
  if (qWords.length && qWords.every((w) => words.includes(w))) return 80;
  if (qWords.length && qWords.every((w) => words.some((tw) => tw.startsWith(w)))) return 70;
  if (title.includes(q)) return 60;
  const rest = searchNorm(
    [item.desc, item.desc_en, item.keywords, ...(item.tags || []).flatMap((tag) => [tag, tagLabel(tag)])]
      .filter(Boolean)
      .join(" ")
  );
  const restWords = rest.split(" ");
  if (qWords.length && qWords.every((w) => restWords.includes(w))) return 40;
  if (rest.includes(q)) return 30;
  return fuzzyIncludes(`${title} ${rest}`, q) ? 10 : 0;
}

function fuzzyIncludes(haystack, query) {
  const hay = (haystack || "").toLowerCase();
  const q = (query || "").trim().toLowerCase();
  if (!q) return true;
  if (hay.includes(q)) return true;

  const hayWords = hay.split(/\s+/).filter(Boolean);
  const qWords = q.split(/\s+/).filter(Boolean);

  return qWords.every((qw) => {
    if (qw.length < 2) return hay.includes(qw);
    const maxDist = qw.length <= 4 ? 1 : 2;
    return hayWords.some((hw) => hw.includes(qw) || levenshtein(hw, qw) <= maxDist);
  });
}

/* ===== قائمة اقتراحات تظهر أثناء الكتابة بصندوق البحث ===== */
function initSearchSuggestions(searchInput, items, onSelect) {
  if (!searchInput) return;

  let wrap = searchInput.closest(".search-wrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "search-wrap";
    searchInput.parentNode.insertBefore(wrap, searchInput);
    wrap.appendChild(searchInput);
  }

  let dropdown = wrap.querySelector(".search-suggestions");
  if (!dropdown) {
    dropdown = document.createElement("div");
    dropdown.className = "search-suggestions";
    wrap.appendChild(dropdown);
  }

  function close() {
    dropdown.classList.remove("open");
    dropdown.innerHTML = "";
  }

  function renderSuggestions() {
    const query = searchInput.value.trim();
    if (!query) {
      close();
      return;
    }

    const matches = items
      .map((item) => ({ item, score: searchScore({ title: item.title, title_en: item.title_en }, query) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((r) => r.item);

    if (matches.length === 0) {
      close();
      return;
    }

    dropdown.innerHTML = matches
      .map(
        (item) =>
          `<div class="search-suggestion" data-id="${escapeHtml(item.id)}">
            <span>${item.icon || "⭐"}</span>
            <span>${escapeHtml(itemTitle(item))}</span>
          </div>`
      )
      .join("");
    dropdown.classList.add("open");

    dropdown.querySelectorAll(".search-suggestion").forEach((el, i) => {
      el.addEventListener("mousedown", (e) => {
        e.preventDefault();
        searchInput.value = itemTitle(matches[i]);
        close();
        onSelect();
      });
    });
  }

  searchInput.addEventListener("input", renderSuggestions);
  searchInput.addEventListener("focus", renderSuggestions);
  searchInput.addEventListener("blur", close);
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
}

/* ===== نموذج تواصل معنا (Web3Forms) ===== */
function initContactForm() {
  const form = document.getElementById("contactForm");
  if (!form) return;

  // تعبئة تلقائية لو الزائر جا من زر "🚩 إبلاغ عن خطأ" بأي بطاقة عنصر
  // (رابط بصيغة contact.html?report=اسم-العنصر&section=قسم)
  const params = new URLSearchParams(location.search);
  const reportItem = params.get("report");
  if (reportItem) {
    const typeSelect = form.querySelector('[name="request_type"]');
    const messageField = form.querySelector('[name="message"]');
    if (typeSelect) typeSelect.value = t("contact_report_option");
    if (messageField) {
      const section = params.get("section") || "";
      const sectionSuffix = section ? ` (${t("contact_report_section_label")}: ${section})` : "";
      messageField.value = `${t("contact_report_regarding")}: ${reportItem}${sectionSuffix}\n\n${t("contact_report_wrong_info_label")}: `;
      messageField.focus();
    }
  }

  const formMessage = document.getElementById("formMessage");
  const submitBtn = document.getElementById("submitBtn");
  const btnText = document.getElementById("btnText");
  const btnLoading = document.getElementById("btnLoading");

  function showMessage(type, text) {
    if (!formMessage) return;
    formMessage.textContent = text;
    formMessage.className = `form-message ${type}`;
    formMessage.style.display = "block";
    formMessage.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function validate() {
    const name = form.querySelector('[name="name"]');
    const email = form.querySelector('[name="email"]');
    const message = form.querySelector('[name="message"]');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (name && name.value.trim().length < 2) {
      showMessage("error", t("contact_err_name"));
      name.focus();
      return false;
    }
    if (email && !emailRegex.test(email.value.trim())) {
      showMessage("error", t("contact_err_email"));
      email.focus();
      return false;
    }
    if (message && message.value.trim().length < 5) {
      showMessage("error", t("contact_err_message"));
      message.focus();
      return false;
    }
    return true;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validate()) return;

    if (submitBtn) submitBtn.disabled = true;
    if (btnText) btnText.style.display = "none";
    if (btnLoading) btnLoading.style.display = "inline";
    if (formMessage) formMessage.style.display = "none";

    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: new FormData(form),
      });
      const result = await res.json();

      if (result.success) {
        showMessage("success", t("contact_success"));
        form.reset();
      } else {
        showMessage("error", t("contact_err_submit"));
      }
    } catch {
      showMessage("error", t("contact_err_network"));
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (btnText) btnText.style.display = "inline";
      if (btnLoading) btnLoading.style.display = "none";
    }
  });
}

/* ===== مؤثرات صوتية (اختيارية، معطّلة افتراضياً) =====
   مجموعة أصوات مولَّدة بالكود بالكامل (Web Audio، بلا ملفات)، مبنية على
   تحليل أصوات pacomepertant.com: نغمات منخفضة (~440Hz لا 650-900)، بداية
   ناعمة بدل قفزة فورية (القفزة تسبب "طقّة")، نغمة تحتية أخفض بأوكتاف أو
   اثنين تعطي دفء، انحدار بسيط بالنبرة، كل النغمات من سلّم ري الكبير (D)،
   صدى غرفة خفيف على الكل، وصوت مختلف لكل نوع فعل. */
const SOUND_KEY = "site_sound_pref";
let audioCtx = null;
let sfxBus = null;
let noiseBuffer = null;

// نوتات سلّم ري الكبير الخماسي (Hz)
const NOTE = { D3: 146.83, D4: 293.66, A4: 440, D5: 587.33, "F#5": 739.99, A5: 880, D6: 1174.66 };

function isSoundEnabled() {
  return lsGet(SOUND_KEY) === "on";
}

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

// صدى غرفة: نبضة ضجيج تخفت أُسّياً بدل ملف impulse — يعطي إحساس "مساحة"
function makeRoomImpulse(ctx, seconds) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.5);
  }
  return buf;
}

// مسار مشترك لكل الأصوات: تنعيم الحدّة (lowpass) + خليط جاف/صدى
function getSfxBus(ctx) {
  if (sfxBus) return sfxBus;
  sfxBus = ctx.createGain();
  const soften = ctx.createBiquadFilter();
  soften.type = "lowpass";
  soften.frequency.value = 4500;
  const dry = ctx.createGain();
  dry.gain.value = 0.85;
  const verb = ctx.createConvolver();
  verb.buffer = makeRoomImpulse(ctx, 1.4);
  const wet = ctx.createGain();
  wet.gain.value = 0.22;
  sfxBus.connect(soften);
  soften.connect(dry).connect(ctx.destination);
  soften.connect(verb).connect(wet).connect(ctx.destination);
  return sfxBus;
}

// نغمة واحدة: بداية ناعمة (attack) ثم خفوت أُسّي، مع انحدار نبرة (glide) اختياري
function voice(
  ctx,
  bus,
  { freq, at = 0, attack = 0.004, decay = 0.08, gain = 0.06, glide = 1, pan = 0 }
) {
  const t0 = ctx.currentTime + at;
  const end = t0 + attack + decay;
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(freq, t0);
  if (glide !== 1) osc.frequency.exponentialRampToValueAtTime(freq * glide, end);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.connect(g);
  if (pan && ctx.createStereoPanner) {
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    g.connect(p).connect(bus);
  } else {
    g.connect(bus);
  }
  osc.start(t0);
  osc.stop(end + 0.02);
}

// ضجيج مفلتر: "تكّة" قصيرة جداً، أو "وووش" لو تحرّك تردده (sweepTo)
function noise(ctx, bus, { at = 0, dur = 0.01, freq = 3000, q = 0.8, gain = 0.05, sweepTo = 0 }) {
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t0 = ctx.currentTime + at;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t0);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.002, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(bus);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

const SOUNDS = {
  // ضغطة عامة: قصيرة ومنخفضة، بنبرة تتغيّر ±3% كل مرة عشان ما تحس بالتكرار
  tap(ctx, bus) {
    const f = NOTE.A4 * (1 + (Math.random() - 0.5) * 0.06);
    voice(ctx, bus, { freq: f, decay: 0.07, gain: 0.07, glide: 0.88 });
    voice(ctx, bus, { freq: f * 1.7, decay: 0.04, gain: 0.018 });
    voice(ctx, bus, { freq: f / 2, decay: 0.09, gain: 0.03 });
  },
  tick(ctx, bus) {
    noise(ctx, bus, { dur: 0.006, freq: 3000, gain: 0.07 });
  },
  // تفعيل (مفضلة، "الأقرب مني"، إشعارات): نغمتان صاعدتان فوق نغمة دافئة عميقة
  on(ctx, bus) {
    voice(ctx, bus, { freq: NOTE.D5, decay: 0.35, gain: 0.06 });
    voice(ctx, bus, { freq: NOTE.D3, decay: 0.5, gain: 0.05 });
    voice(ctx, bus, { freq: NOTE.A5, at: 0.07, decay: 0.3, gain: 0.035, pan: 0.15 });
  },
  off(ctx, bus) {
    voice(ctx, bus, { freq: NOTE.A4, decay: 0.25, gain: 0.05, glide: 0.94 });
    voice(ctx, bus, { freq: NOTE.A4 / 4, decay: 0.3, gain: 0.04 });
    voice(ctx, bus, { freq: NOTE.D4, at: 0.06, decay: 0.22, gain: 0.03, pan: -0.15 });
  },
  // فتح نافذة/قائمة: وتر ري الكبير يتفتّح نوتة نوتة
  open(ctx, bus) {
    [NOTE.D5, NOTE["F#5"], NOTE.A5].forEach((freq, i) =>
      voice(ctx, bus, {
        freq,
        at: i * 0.045,
        attack: 0.01,
        decay: 0.6,
        gain: 0.03,
        pan: (i - 1) * 0.2,
      })
    );
    voice(ctx, bus, { freq: NOTE.D3, decay: 0.5, gain: 0.03 });
  },
  // إغلاق: "وووش" نازل + ارتطام عميق ناعم
  close(ctx, bus) {
    noise(ctx, bus, { dur: 0.12, freq: 1800, sweepTo: 400, q: 0.7, gain: 0.035 });
    voice(ctx, bus, { freq: 130, decay: 0.3, gain: 0.07, glide: 0.8 });
  },
  copy(ctx, bus) {
    voice(ctx, bus, { freq: NOTE.D5, decay: 0.12, gain: 0.045 });
    voice(ctx, bus, { freq: NOTE.A5, at: 0.06, decay: 0.14, gain: 0.04 });
  },
  // مشاركة: "وووش" صاعد ثم نغمة خفيفة
  share(ctx, bus) {
    noise(ctx, bus, { dur: 0.18, freq: 500, sweepTo: 3000, q: 1, gain: 0.03 });
    voice(ctx, bus, { freq: NOTE.A5, at: 0.1, decay: 0.25, gain: 0.035 });
  },
  // نتيجة (اختار لي/خطة اليوم): وتر كامل يرن ويتوزع يمين/يسار
  success(ctx, bus) {
    [NOTE.D5, NOTE["F#5"], NOTE.A5, NOTE.D6].forEach((freq, i) =>
      voice(ctx, bus, {
        freq,
        at: i * 0.06,
        attack: 0.02,
        decay: 1.0,
        gain: 0.03,
        pan: -0.3 + i * 0.2,
      })
    );
    voice(ctx, bus, { freq: NOTE.D3, decay: 0.8, gain: 0.04 });
  },
};

function playSound(name) {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  SOUNDS[name](ctx, getSfxBus(ctx));
}

function playClickSound() {
  playSound("tap");
}

function playSuccessSound() {
  playSound("success");
}

function initSoundToggle() {
  const btn = document.querySelector(".sound-toggle");
  if (!btn) return;

  function apply(enabled) {
    btn.classList.toggle("active", enabled);
    btn.innerHTML = enabled ? TOGGLE_ICON_SVG.volumeOn : TOGGLE_ICON_SVG.volumeOff;
    const label = enabled ? t("sound_on") : t("sound_off");
    btn.setAttribute("aria-label", label);
    btn.title = label;
  }

  apply(isSoundEnabled());

  btn.addEventListener("click", () => {
    const next = !isSoundEnabled();
    lsSet(SOUND_KEY, next ? "on" : "off");
    apply(next);
    if (next) playSound("on");
  });
}

/* ===== أيقونات SVG مضمّنة لأزرار الهيدر التبديلية (مظهر/صوت) =====
   نفس أيقونات Material Symbols المستخدَمة بـicon.njk (القوالب) — هنا لازم
   نص جافاسكربت خام بدل الماكرو لأن الحالة (فاتح/داكن/تلقائي، مفعّل/مطفأ)
   تتغيّر وقت التشغيل لا وقت البناء. fill="currentColor" يخلّيها تتبع لون
   الزر تلقائياً بدل لون إيموجي ثابت لا يتجاوب مع hover/active. */
const TOGGLE_ICON_SVG = {
  light:
    '<svg width="20" height="20" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="M480-360q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Zm0 80q-83 0-141.5-58.5T280-480q0-83 58.5-141.5T480-680q83 0 141.5 58.5T680-480q0 83-58.5 141.5T480-280ZM200-440H40v-80h160v80Zm720 0H760v-80h160v80ZM440-760v-160h80v160h-80Zm0 720v-160h80v160h-80ZM256-650l-101-97 57-59 96 100-52 56Zm492 496-97-101 53-55 101 97-57 59Zm-98-550 97-101 59 57-100 96-56-52ZM154-212l101-97 55 53-97 101-59-57Zm326-268Z"/></svg>',
  dark: '<svg width="20" height="20" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="M480-120q-150 0-255-105T120-480q0-150 105-255t255-105q14 0 27.5 1t26.5 3q-41 29-65.5 75.5T444-660q0 90 63 153t153 63q55 0 101-24.5t75-65.5q2 13 3 26.5t1 27.5q0 150-105 255T480-120Zm0-80q88 0 158-48.5T740-375q-20 5-40 8t-40 3q-123 0-209.5-86.5T364-660q0-20 3-40t8-40q-78 32-126.5 102T200-480q0 116 82 198t198 82Zm-10-270Z"/></svg>',
  auto: '<svg width="20" height="20" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="M312-320h64l32-92h146l32 92h62L512-680h-64L312-320Zm114-144 52-150h4l52 150H426Zm54 436L346-160H160v-186L28-480l132-134v-186h186l134-132 134 132h186v186l132 134-132 134v186H614L480-28Zm0-112 100-100h140v-140l100-100-100-100v-140H580L480-820 380-720H240v140L140-480l100 100v140h140l100 100Zm0-340Z"/></svg>',
  volumeOn:
    '<svg width="20" height="20" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="M560-131v-82q90-26 145-100t55-168q0-94-55-168T560-749v-82q124 28 202 125.5T840-481q0 127-78 224.5T560-131ZM120-360v-240h160l200-200v640L280-360H120Zm440 40v-322q47 22 73.5 66t26.5 96q0 51-26.5 94.5T560-320ZM400-606l-86 86H200v80h114l86 86v-252ZM300-480Z"/></svg>',
  volumeOff:
    '<svg width="20" height="20" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="M792-56 671-177q-25 16-53 27.5T560-131v-82q14-5 27.5-10t25.5-12L480-368v208L280-360H120v-240h128L56-792l56-56 736 736-56 56Zm-8-232-58-58q17-31 25.5-65t8.5-70q0-94-55-168T560-749v-82q124 28 202 125.5T840-481q0 53-14.5 102T784-288ZM650-422l-90-90v-130q47 22 73.5 66t26.5 96q0 15-2.5 29.5T650-422ZM480-592 376-696l104-104v208Zm-80 238v-94l-72-72H200v80h114l86 86Zm-36-130Z"/></svg>',
};

/* ===== أيقونات SVG مضمّنة لبطاقة العنصر (نفس مصدر icon.njk) — هنا نص خام
   لأن buildItemCard/buildActionsHtml تبني HTML كسلاسل نصية وقت التشغيل ===== */
const ICON_SVG = {
  share:
    '<svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="M720-80q-50 0-85-35t-35-85q0-7 1-14.5t3-13.5L322-392q-17 15-38 23.5t-44 8.5q-50 0-85-35t-35-85q0-50 35-85t85-35q23 0 44 8.5t38 23.5l282-164q-2-6-3-13.5t-1-14.5q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35q-23 0-44-8.5T638-672L356-508q2 6 3 13.5t1 14.5q0 7-1 14.5t-3 13.5l282 164q17-15 38-23.5t44-8.5q50 0 85 35t35 85q0 50-35 85t-85 35Zm0-640q17 0 28.5-11.5T760-760q0-17-11.5-28.5T720-800q-17 0-28.5 11.5T680-760q0 17 11.5 28.5T720-720ZM240-440q17 0 28.5-11.5T280-480q0-17-11.5-28.5T240-520q-17 0-28.5 11.5T200-480q0 17 11.5 28.5T240-440Zm480 280q17 0 28.5-11.5T760-200q0-17-11.5-28.5T720-240q-17 0-28.5 11.5T680-200q0 17 11.5 28.5T720-160Zm0-600ZM240-480Zm480 280Z"/></svg>',
  schedule:
    '<svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="m612-292 56-56-148-148v-184h-80v216l172 172ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-400Zm0 320q133 0 226.5-93.5T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 133 93.5 226.5T480-160Z"/></svg>',
  "location-pin":
    '<svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="M480-480q33 0 56.5-23.5T560-560q0-33-23.5-56.5T480-640q-33 0-56.5 23.5T400-560q0 33 23.5 56.5T480-480Zm0 294q122-112 181-203.5T720-552q0-109-69.5-178.5T480-800q-101 0-170.5 69.5T240-552q0 71 59 162.5T480-186Zm0 106Q319-217 239.5-334.5T160-552q0-150 96.5-239T480-880q127 0 223.5 89T800-552q0 100-79.5 217.5T480-80Zm0-480Z"/></svg>',
  language:
    '<svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="M480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-155.5t86-127Q252-817 325-848.5T480-880q83 0 155.5 31.5t127 86q54.5 54.5 86 127T880-480q0 82-31.5 155t-86 127.5q-54.5 54.5-127 86T480-80Zm0-82q26-36 45-75t31-83H404q12 44 31 83t45 75Zm-104-16q-18-33-31.5-68.5T322-320H204q29 50 72.5 87t99.5 55Zm208 0q56-18 99.5-55t72.5-87H638q-9 38-22.5 73.5T584-178ZM170-400h136q-3-20-4.5-39.5T300-480q0-21 1.5-40.5T306-560H170q-5 20-7.5 39.5T160-480q0 21 2.5 40.5T170-400Zm216 0h188q3-20 4.5-39.5T580-480q0-21-1.5-40.5T574-560H386q-3 20-4.5 39.5T380-480q0 21 1.5 40.5T386-400Zm268 0h136q5-20 7.5-39.5T800-480q0-21-2.5-40.5T790-560H654q3 20 4.5 39.5T660-480q0 21-1.5 40.5T654-400Zm-16-240h118q-29-50-72.5-87T584-782q18 33 31.5 68.5T638-640Zm-234 0h152q-12-44-31-83t-45-75q-26 36-45 75t-31 83Zm-200 0h118q9-38 22.5-73.5T376-782q-56 18-99.5 55T204-640Z"/></svg>',
  call: '<svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="M798-120q-125 0-247-54.5T329-329Q229-429 174.5-551T120-798q0-18 12-30t30-12h162q14 0 25 9.5t13 22.5l26 140q2 16-1 27t-11 19l-97 98q20 37 47.5 71.5T387-386q31 31 65 57.5t72 48.5l94-94q9-9 23.5-13.5T670-390l138 28q14 4 23 14.5t9 23.5v162q0 18-12 30t-30 12ZM241-600l66-66-17-94h-89q5 41 14 81t26 79Zm358 358q39 17 79.5 27t81.5 13v-88l-94-19-67 67ZM241-600Zm358 358Z"/></svg>',
  "photo-camera":
    '<svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="M480-260q75 0 127.5-52.5T660-440q0-75-52.5-127.5T480-620q-75 0-127.5 52.5T300-440q0 75 52.5 127.5T480-260Zm0-80q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29ZM160-120q-33 0-56.5-23.5T80-200v-480q0-33 23.5-56.5T160-760h126l74-80h240l74 80h126q33 0 56.5 23.5T880-680v480q0 33-23.5 56.5T800-120H160Zm0-80h640v-480H638l-73-80H395l-73 80H160v480Zm320-240Z"/></svg>',
  "menu-book":
    '<svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="M560-564v-68q33-14 67.5-21t72.5-7q26 0 51 4t49 10v64q-24-9-48.5-13.5T700-600q-38 0-73 9.5T560-564Zm0 220v-68q33-14 67.5-21t72.5-7q26 0 51 4t49 10v64q-24-9-48.5-13.5T700-380q-38 0-73 9t-67 27Zm0-110v-68q33-14 67.5-21t72.5-7q26 0 51 4t49 10v64q-24-9-48.5-13.5T700-490q-38 0-73 9.5T560-454ZM260-320q47 0 91.5 10.5T440-278v-394q-41-24-87-36t-93-12q-36 0-71.5 7T120-692v396q35-12 69.5-18t70.5-6Zm260 42q44-21 88.5-31.5T700-320q36 0 70.5 6t69.5 18v-396q-33-14-68.5-21t-71.5-7q-47 0-93 12t-87 36v394Zm-40 118q-48-38-104-59t-116-21q-42 0-82.5 11T100-198q-21 11-40.5-1T40-234v-482q0-11 5.5-21T62-752q46-24 96-36t102-12q58 0 113.5 15T480-740q51-30 106.5-45T700-800q52 0 102 12t96 36q11 5 16.5 15t5.5 21v482q0 23-19.5 35t-40.5 1q-37-20-77.5-31T700-240q-60 0-116 21t-104 59ZM280-494Z"/></svg>',
};

/* ===== تبديل المظهر: تلقائي (يتبع النظام) / فاتح / داكن ===== */
function initThemeToggle() {
  const btn = document.querySelector(".theme-toggle");
  if (!btn) return;

  const KEY = "site_theme_pref";
  const ICONS = {
    auto: TOGGLE_ICON_SVG.auto,
    light: TOGGLE_ICON_SVG.light,
    dark: TOGGLE_ICON_SVG.dark,
  };
  const NEXT = { auto: "light", light: "dark", dark: "auto" };

  function getPref() {
    const stored = lsGet(KEY);
    return stored === "light" || stored === "dark" ? stored : "auto";
  }

  function apply(pref) {
    if (pref === "auto") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", pref);
    }
    // أيقونة فقط داخل الزر (الزر مربّع بالهيدر) والشرح النصي بالـ title/aria
    btn.innerHTML = ICONS[pref];
    const label = `${t("theme_current_label")}: ${t(`theme_label_${pref}`)} — ${t("theme_click_to_toggle")}`;
    btn.title = label;
    btn.setAttribute("aria-label", label);
  }

  apply(getPref());

  btn.addEventListener("click", () => {
    const next = NEXT[getPref()];
    if (next === "auto") {
      lsRemove(KEY);
    } else {
      lsSet(KEY, next);
    }
    apply(next);
    playClickSound();
  });
}

/* ===== إشعار الكوكيز ===== */
function initCookieConsent() {
  const KEY = "cookie_consent";
  const banner = document.getElementById("cookie-banner");
  const acceptBtn = document.getElementById("cookie-accept");
  if (!banner || !acceptBtn) return;

  if (!lsGet(KEY)) {
    banner.classList.add("open");
  }

  acceptBtn.addEventListener("click", () => {
    lsSet(KEY, "accepted");
    banner.classList.remove("open");
    window.enableAnalytics?.(); // GA ما يشتغل إلا من هنا (أو من bootstrap.js لمن وافق سابقاً)
  });

  document.getElementById("cookie-decline")?.addEventListener("click", () => {
    lsSet(KEY, "declined");
    banner.classList.remove("open");
    // لو كان وافق سابقاً وتراجع: نوقف الإرسال فوراً، ولا يتحمّل بالزيارات القادمة
    const gaId = window.GA_ID;
    if (gaId) window["ga-disable-" + gaId] = true;
    window.gtag = function () {};
  });

  // رابط الفوتر يفتح الشريط من جديد ليغيّر الزائر قراره بأي وقت
  document
    .getElementById("cookie-settings")
    ?.addEventListener("click", () => banner.classList.add("open"));
}

/* ===== تذكير "اختيار اليوم" (بديل خفيف عن الإشعارات لا يعتمد على أي خدمة
   خارجية) — لو الزائر ما زار الصفحة الرئيسية اليوم بعد وهو يتصفح صفحة ثانية
   بالموقع، يظهر له تذكير صغير وغير مزعج. مو إشعار حقيقي (ما يوصله وهو خارج
   الموقع)، بس يكمّل أي قناة توصيل ثانية لاحقاً بدل ما يكون بديل عنها ===== */
function initDailyPickReminder() {
  const SEEN_KEY = "daily_pick_seen_date";
  const DISMISSED_KEY = "daily_pick_reminder_dismissed";
  const today = new Date().toISOString().slice(0, 10);

  if (document.getElementById("homeCarousel")) {
    // إذا الزائر بالصفحة الرئيسية أصلاً، يعتبر اختيار اليوم "مشاهَد"
    lsSet(SEEN_KEY, today);
    return;
  }

  if (lsGet(SEEN_KEY) === today) return;
  if (ssGet(DISMISSED_KEY)) return;
  // مرة وحدة باليوم (أول صفحة فرعية فقط) — كانت تطلع بكل صفحة وتغطي البطاقات
  const SHOWN_KEY = "daily_pick_reminder_shown";
  if (lsGet(SHOWN_KEY) === today) return;

  const banner = document.getElementById("dailyPickReminder");
  const closeBtn = document.getElementById("dailyPickReminderClose");
  if (!banner || !closeBtn) return;

  lsSet(SHOWN_KEY, today);
  banner.classList.add("open");

  closeBtn.addEventListener("click", () => {
    ssSet(DISMISSED_KEY, "1");
    banner.classList.remove("open");
  });
}

/* ===== قائمة الجوال ===== */
function initNavToggle() {
  const toggles = document.querySelectorAll(".nav-toggle");
  const nav = document.querySelector(".main-nav");
  if (!toggles.length || !nav) return;
  toggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");
      toggles.forEach((btn) => {
        btn.classList.toggle("open", isOpen);
        btn.setAttribute("aria-expanded", String(isOpen));
        btn.setAttribute("aria-label", isOpen ? t("nav_toggle_close") : t("nav_toggle_open"));
      });
      playSound(isOpen ? "open" : "close");
    });
  });
}

/* ===== ظل الهيدر عند التمرير ===== */
/* فلترة بطاقات الأقسام بالرئيسية بين "أماكن" و"أدوات ومحتوى".
   بطاقة المفضلة بلا data-group فتبقى ظاهرة دائماً — هي أداة للاثنين معاً */
function initSectionFilter() {
  const filter = document.getElementById("sectionFilter");
  const grid = document.getElementById("sectionGrid");
  if (!filter || !grid) return;

  filter.addEventListener("click", (event) => {
    const btn = event.target.closest(".section-filter-btn");
    if (!btn) return;
    const group = btn.dataset.group;
    filter
      .querySelectorAll(".section-filter-btn")
      .forEach((b) => b.classList.toggle("active", b === btn));
    grid.querySelectorAll(".section-card").forEach((card) => {
      const cardGroup = card.dataset.group;
      card.hidden = Boolean(cardGroup) && group !== "all" && cardGroup !== group;
    });
  });
}

/* زر "ثبّت التطبيق" — المتصفح يطلق beforeinstallprompt فقط لو الموقع مستوفٍ
   شروط التثبيت وغير مثبَّت أصلاً. نخزّن الحدث ونظهر الزر عنده فقط: زر ظاهر
   لا يعمل (بمتصفح لا يدعم، أو والتطبيق مثبَّت) أسوأ من غيابه */
function initInstallPrompt() {
  const btn = document.getElementById("installBtn");
  if (!btn) return;
  let deferred = null;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event;
    btn.hidden = false;
  });

  btn.addEventListener("click", async () => {
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    // الحدث يُستهلك بعد أول عرض ولا يُعاد استخدامه
    deferred = null;
    if (outcome === "accepted") btn.hidden = true;
  });

  // ثُبِّت من داخل الصفحة أو من قائمة المتصفح — ما عاد للزر معنى
  window.addEventListener("appinstalled", () => {
    deferred = null;
    btn.hidden = true;
  });
}

function initHeaderScroll() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 8);
  document.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ارتفاع الهيدر الفعلي → متغيّر CSS يستخدمه صندوق البحث اللاصق. يتغيّر
  // بتغيّر عرض الشاشة (القائمة تلتف لسطرين)، فنعيد قياسه مع كل تغيير حجم
  const setHeaderHeight = () =>
    document.documentElement.style.setProperty("--header-h", `${header.offsetHeight}px`);
  setHeaderHeight();
  window.addEventListener("resize", setHeaderHeight, { passive: true });

  /* القائمة تنزلق أفقياً لو فاضت، لكن الانزلاق بلا إشارة يبان "قصّاً" —
     وهذا اللي صار لما وصلت الأقسام لعشرة. نعلّمها لتتلاشى أطرافها فيفهم
     المستخدم إن فيه بقية. يشتغل تلقائياً مع أي قسم يُضاف مستقبلاً */
  const nav = header.querySelector(".main-nav");
  if (nav) {
    const syncNavOverflow = () =>
      nav.classList.toggle("is-scrollable", nav.scrollWidth > nav.clientWidth + 1);
    syncNavOverflow();
    window.addEventListener("resize", syncNavOverflow, { passive: true });
  }
}

/* ===== تحديث تلقائي: يكتشف نسخة جديدة من الموقع ويعيد التحميل بدون تدخل المستخدم =====
   المشكلة: المتصفح يخزّن الصفحة/الملفات مؤقتاً (Cache)، فلو كان تبويب الموقع مفتوح
   عند المستخدم ونشرنا تحديث، ما يشوفه إلا بعد تحديث يدوي. هذا يتحقق من version.json
   بدون كاش، ولو تغيّرت النسخة عن آخر مرة شافها هالتبويب، يعيد التحميل تلقائياً. */
function initAutoUpdateCheck() {
  const SEEN_KEY = "site_seen_version";
  // نسخة جديدة اكتُشفت والزائر يستخدم الصفحة: ما نعيد التحميل تحت يده (كان يمسح
  // نص نموذج التواصل، واختبار الكتابة، وتسجيلاً جارياً بالصوتيات). ننتظر لين
  // يترك التبويب، فيلقى النسخة الجديدة لما يرجع بلا ما يحس بشي
  let pending = false;
  const hasTypedText = () =>
    [
      ...document.querySelectorAll(
        "textarea, input[type=text], input[type=email], input[type=tel], input[type=number], input:not([type])"
      ),
    ].some((el) => el.value && el.value !== el.defaultValue);
  // .recording = تسجيل جارٍ باستوديو الصوتيات (يستمر والتبويب بالخلفية)
  function reloadWhenSafe() {
    if (
      pending &&
      document.visibilityState === "hidden" &&
      !hasTypedText() &&
      !document.querySelector(".recording")
    )
      location.reload();
  }

  async function checkVersion() {
    try {
      // مسار مطلق: الرابط النسبي كان ينحل على مجلد الصفحة، فيصير
      // /ai-experiments/version.json ويرجع 404 بكل صفحات التفاصيل
      const res = await fetch(`/version.json?_=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const seen = ssGet(SEEN_KEY);
      if (seen && data.version && seen !== data.version) {
        ssSet(SEEN_KEY, data.version);
        pending = true;
        reloadWhenSafe();
        return;
      }
      if (data.version) ssSet(SEEN_KEY, data.version);
    } catch {
      /* تجاهل أي خطأ شبكة، نحاول مرة ثانية بالفحص القادم */
    }
  }

  checkVersion();
  setInterval(checkVersion, 5 * 60 * 1000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkVersion();
    else reloadWhenSafe();
  });
}

/* ===== المفضلة (تُحفظ محلياً في المتصفح عبر localStorage - لا تحتاج تسجيل دخول) ===== */
const FAVORITES_KEY = "site_favorites_v1";

function getFavorites() {
  try {
    return JSON.parse(lsGet(FAVORITES_KEY)) || {};
  } catch {
    return {};
  }
}

function saveFavorites(favs) {
  lsSet(FAVORITES_KEY, JSON.stringify(favs));
}

function isFavorite(section, id) {
  const favs = getFavorites();
  return Boolean(favs[section] && favs[section][id]);
}

/* ===== إعجاب عام من الزوار (منفصل عن "أعجبني" الخاصة بصاحب الموقع) —
   عدّاد عام مشترك بين كل الزوار عبر Cloudflare Worker، والحماية من تكرار
   الإعجاب من نفس المتصفح تصير محلياً بـ localStorage ===== */
const LIKES_KEY = "site_liked_items_v1";
let LIKE_COUNTS = {};

function getLikedItems() {
  try {
    return JSON.parse(lsGet(LIKES_KEY)) || {};
  } catch {
    return {};
  }
}

function saveLikedItems(liked) {
  lsSet(LIKES_KEY, JSON.stringify(liked));
}

function isLikedByMe(section, id) {
  return Boolean(getLikedItems()[`${section}:${id}`]);
}

async function fetchLikeCounts() {
  const config = window.PUSH_CONFIG;
  if (!config || !config.workerUrl) return;
  try {
    const res = await fetch(`${config.workerUrl}/likes`);
    LIKE_COUNTS = await res.json();
  } catch {
    return;
  }
  document.querySelectorAll(".like-btn").forEach((btn) => {
    const key = `${btn.dataset.section}:${btn.dataset.id}`;
    const countEl = btn.querySelector(".like-count");
    if (countEl && LIKE_COUNTS[key] != null) countEl.textContent = LIKE_COUNTS[key];
  });
}

async function toggleLike(section, id, btn) {
  const liked = getLikedItems();
  const key = `${section}:${id}`;
  const alreadyLiked = Boolean(liked[key]);
  const countEl = btn.querySelector(".like-count");
  const iconEl = btn.querySelector(".like-icon");
  const currentCount = Number(countEl.textContent) || 0;
  const optimisticCount = alreadyLiked ? Math.max(0, currentCount - 1) : currentCount + 1;

  countEl.textContent = optimisticCount;
  iconEl.textContent = alreadyLiked ? "♡" : "♥";
  btn.classList.toggle("active", !alreadyLiked);
  btn.setAttribute("aria-pressed", String(!alreadyLiked));
  if (alreadyLiked) delete liked[key];
  else liked[key] = true;
  saveLikedItems(liked);
  playSound(alreadyLiked ? "off" : "on");

  const config = window.PUSH_CONFIG;
  if (!config || !config.workerUrl) return;
  try {
    const res = await fetch(`${config.workerUrl}${alreadyLiked ? "/unlike" : "/like"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section, id }),
    });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    if (typeof data.count === "number") {
      LIKE_COUNTS[key] = data.count;
      countEl.textContent = data.count;
    }
  } catch {
    // فشل الخادم (شبكة، 429، 403) → نرجّع كل شي لحاله. بدونه يظل المتصفح
    // يظن أنه أعجب، فالضغطة التالية ترسل /unlike وتنقص إعجاب شخص آخر فعلاً.
    countEl.textContent = currentCount;
    iconEl.textContent = alreadyLiked ? "♥" : "♡";
    btn.classList.toggle("active", alreadyLiked);
    btn.setAttribute("aria-pressed", String(alreadyLiked));
    if (alreadyLiked) liked[key] = true;
    else delete liked[key];
    saveLikedItems(liked);
  }
}

function toggleFavorite(section, id) {
  const favs = getFavorites();
  if (!favs[section]) favs[section] = {};
  if (favs[section][id]) {
    delete favs[section][id];
  } else {
    favs[section][id] = true;
  }
  saveFavorites(favs);
  return isFavorite(section, id);
}

/* ===== أزرار الروابط (يدعم رابط واحد قديم item.url أو عدة روابط item.links) ===== */
const LINK_META = {
  website: { icon: ICON_SVG.language, labelKey: "link_website" },
  phone: { icon: ICON_SVG.call, labelKey: "link_phone" },
  maps: { icon: ICON_SVG["location-pin"], labelKey: "link_maps" },
  instagram: { icon: ICON_SVG["photo-camera"], labelKey: "link_instagram" },
  menu: { icon: ICON_SVG["menu-book"], labelKey: "link_menu" },
};

// ترتيب ثابت للأزرار بغض النظر عن ترتيب الحقول باللوحة — رابط الموقع (website)
// دايماً أول زر وبتنسيق أساسي (بارز)، والباقي أزرار ثانوية بعده
const LINK_ORDER = ["website", "phone", "maps", "instagram", "menu"];

/* ===== ترتيب "قريب مني" حسب المسافة ===== */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km) {
  return km < 1
    ? `${Math.round(km * 1000)} ${t("unit_meters")}`
    : `${km.toFixed(1)} ${t("unit_km")}`;
}

/*
  أقرب فرع للزائر. العنصر متعدد الفروع (مثل سلسلة مطاعم) يحمل مصفوفة
  branches، فنحسب المسافة لكل فرع ونرجّع الأقرب — بدل ما نقيس لفرع واحد
  ثابت فيطلع ترتيب "قريب مني" مضلّلاً. العنصر بفرع واحد يستخدم lat/lng.
  يرجّع null لو ما عنده أي موقع.
*/
function nearestBranch(item, userCoords) {
  const points =
    Array.isArray(item.branches) && item.branches.length
      ? item.branches
      : item.lat != null && item.lng != null
        ? [{ label: "", lat: item.lat, lng: item.lng }]
        : [];
  if (!points.length) return null;

  let best = null;
  for (const p of points) {
    const km = haversineKm(userCoords.lat, userCoords.lng, p.lat, p.lng);
    if (!best || km < best.km) best = { km, label: p.label || "" };
  }
  return best;
}

/* ===== مشاركة عبر واتساب ===== */
const SITE_ORIGIN = "https://hakolah.com/";
const SITE_ROOT_PATH = "/";

/*
  قياس "الروابط" لا "الزيارات": كم زائراً شارك أو خرج لمحل فعلي.
  عدد الزيارات وحده يقول إن الموقع رفّ كتب؛ هذا يقول إن كان شبكة.
  لا يرسل شيئاً بنفسه — يمرّ عبر gtag الموجود أصلاً، فلا طلب ولا كلفة إضافية.
*/
function trackEdge(name, params) {
  if (typeof window.gtag === "function") window.gtag("event", name, params);
}

/*
  مستمع واحد على المستند بدل مستمع لكل رابط: البطاقات تُطبع من السيرفر أحياناً
  وتُبنى بالمتصفح أحياناً، والتفويض يغطي الاثنين ولا يكبر مع عدد العناصر.
*/
function initOutboundTracking() {
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[target="_blank"][href^="http"]');
    if (!a) return;
    let host;
    try {
      host = new URL(a.href).hostname.replace(/^www\./, "");
    } catch {
      return;
    }
    if (host === location.hostname) return;
    // الاسم أول عقدة نصية بالعنوان — الشارات (✅ زُرته، 👍 أعجبني) عناصر بعده
    const heading = a.closest(".item-card, .card")?.querySelector("h3, h2");
    trackEdge("outbound_click", {
      destination: host,
      item_name: heading?.firstChild?.textContent.trim() || heading?.textContent.trim() || "",
    });
  });
}

function initArticleShare() {
  const btn = document.querySelector(".article-share-btn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const text = `${document.title}\n${location.href}`;
    // العنوان بالصفحة مكتوب "أيقونة + عنوان" بنص واحد (h1) — نفصل الإيموجي
    // الأول عن باقي النص عشان نرسمهم منفصلين بصورة الستوري
    const heading =
      document.querySelector(".page-header h1")?.textContent?.trim() || document.title;
    const match = heading.match(/^(\p{Extended_Pictographic}(?:️)?)\s*/u);
    const icon = match ? match[1] : "🧭";
    const title = match ? heading.slice(match[0].length).trim() : heading;
    shareText(text, { section: (window.PAGE || {}).section || "" }, { icon, title });
    playSound("share");
  });
}

function initArticleListen() {
  const btn = document.querySelector(".article-listen-btn");
  const player = document.querySelector(".article-audio-player");
  if (!btn || !player) return;
  btn.addEventListener("click", () => {
    // يتحمّل الملف بأول ضغطة بس (preload="none" بالقالب) — ما يحمّل صوت
    // كل مقال لزائر ما بيسمعه أصلاً
    if (!player.src) player.src = btn.dataset.audioSrc;
    player.classList.remove("hidden");
    if (player.paused) player.play();
    else player.pause();
    playClickSound();
  });
}

/* ===== مرمّزات صوتية مشتركة =====
   يستعملها مصدّر الموسيقى ومحوّل الملفات معاً، فمكانها هنا لا داخل أحدهما */

function audioBufferToWav(buffer) {
  const channels = buffer.numberOfChannels;
  const samples = buffer.length;
  const blockAlign = channels * 2;
  const dataSize = samples * blockAlign;
  const view = new DataView(new ArrayBuffer(44 + dataSize));
  const writeText = (offset, text) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeText(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, dataSize, true);

  const data = [];
  for (let c = 0; c < channels; c++) data.push(buffer.getChannelData(c));
  let offset = 44;
  for (let i = 0; i < samples; i++) {
    for (let c = 0; c < channels; c++) {
      const value = Math.max(-1, Math.min(1, data[c][i]));
      view.setInt16(offset, value < 0 ? value * 0x8000 : value * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([view.buffer], { type: "audio/wav" });
}

/* MP3 يحتاج مرمّزاً — المتصفحات ما ترمّزه أصلاً (MediaRecorder يعطي webm أو
   mp4 لا mp3). نستضيف lamejs عندنا لا من CDN عشان تبقى سياسة CSP صارمة
   (script-src 'self')، ونحمّله فقط عند الطلب: 156 كيلوبايت ما تُنزَّل على أي
   زائر لا يصدّر MP3.
   lamejs مرخّص LGPL-3.0 — يُشحن كملف مستقل بلا تعديل ومعه نص رخصته
   بـ src/js/vendor/lamejs-LICENSE.txt. */
let lamePromise = null;
function loadLameEncoder() {
  if (window.lamejs) return Promise.resolve(window.lamejs);
  if (!lamePromise) {
    lamePromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `${SITE_ROOT_PATH}js/vendor/lame.min.js`;
      script.onload = () => resolve(window.lamejs);
      script.onerror = () => {
        lamePromise = null;
        reject(new Error("lame load failed"));
      };
      document.head.appendChild(script);
    });
  }
  return lamePromise;
}

function floatToPcm16(channel) {
  const out = new Int16Array(channel.length);
  for (let i = 0; i < channel.length; i++) {
    const value = Math.max(-1, Math.min(1, channel[i]));
    out[i] = value < 0 ? value * 0x8000 : value * 0x7fff;
  }
  return out;
}

/* onProgress اختياري: ترميز MP3 لملف طويل يشغّل الخيط الرئيسي ثوانيَ طويلة،
   فنسلّمه التقدّم ونفسح المجال للرسم كل عدد من الكتل */
async function audioBufferToMp3(buffer, kbps = 192, onProgress) {
  const lame = await loadLameEncoder();
  const stereo = buffer.numberOfChannels > 1;
  const left = floatToPcm16(buffer.getChannelData(0));
  const right = stereo ? floatToPcm16(buffer.getChannelData(1)) : null;

  const encoder = new lame.Mp3Encoder(stereo ? 2 : 1, buffer.sampleRate, kbps);
  const chunks = [];
  const BLOCK = 1152; // حجم إطار MP3 القياسي
  for (let i = 0; i < left.length; i += BLOCK) {
    const encoded = stereo
      ? encoder.encodeBuffer(left.subarray(i, i + BLOCK), right.subarray(i, i + BLOCK))
      : encoder.encodeBuffer(left.subarray(i, i + BLOCK));
    if (encoded.length > 0) chunks.push(encoded);
    if (onProgress && (i / BLOCK) % 400 === 0) {
      onProgress(i / left.length);
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  const flushed = encoder.flush();
  if (flushed.length > 0) chunks.push(flushed);
  return new Blob(chunks, { type: "audio/mpeg" });
}

function buildShareUrl(section, item) {
  const isEn = window.SITE_LANG === "en";
  const prefix = isEn ? "en/" : "";
  const relPath =
    isEn && item.detailUrlEn
      ? item.detailUrlEn
      : item.detailUrl || `${section}.html?q=${encodeURIComponent(itemTitle(item))}`;
  return SITE_ORIGIN + prefix + relPath;
}

function buildShareText(section, item) {
  const url = buildShareUrl(section, item);
  return `${itemTitle(item)} ${t("share_suffix")}\n${url}`;
}

/* ===== توليد صورة "ستوري" (1080×1920) من بيانات البطاقة — تُستخدم مع
   navigator.share({files}) بدل نص فقط، لأن قصص إنستقرام تحتاج صورة لا رابطاً
   (ما فيه رابط مباشر "أضف لستوري" يُفتح من متصفح ويب — فقط من تطبيقات
   أصلية). نرسمها من الصفر بألوان الموقع الحالية (لا نصوّر البطاقة نفسها)
   لأن مقاس البطاقة عرضي وما يناسب المقاس الطولي للستوري. */
function loadImageEl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawImageCover(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// تفاف نص تلقائي عند حافة العرض المتاح — يرجّع إحداثي Y بعد آخر سطر
function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 4) {
  const words = text.split(" ");
  let line = "";
  let lines = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
      lines++;
      if (lines >= maxLines - 1) break;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

async function buildStoryImage({ icon, title, subtitle, photo }) {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  const rootStyles = getComputedStyle(document.documentElement);
  const primary = rootStyles.getPropertyValue("--color-primary").trim() || "#1b4d3e";
  const primaryDark = rootStyles.getPropertyValue("--color-primary-dark").trim() || primary;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, primary);
  bg.addColorStop(1, primaryDark);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const isRtl = window.SITE_LANG !== "en";
  ctx.direction = isRtl ? "rtl" : "ltr";
  ctx.textAlign = "center";

  if (document.fonts?.ready) {
    try {
      await document.fonts.load("800 76px Cairo");
      await document.fonts.ready;
    } catch {
      /* خط احتياطي كافٍ لو تعذّر تحميل Cairo */
    }
  }

  let cursorY;
  let photoLoaded = false;
  if (photo) {
    try {
      const img = await loadImageEl(photo);
      const photoH = Math.round(H * 0.5);
      drawImageCover(ctx, img, 0, 0, W, photoH);
      const fade = ctx.createLinearGradient(0, photoH - 260, 0, photoH);
      fade.addColorStop(0, "rgba(0,0,0,0)");
      fade.addColorStop(1, primary);
      ctx.fillStyle = fade;
      ctx.fillRect(0, photoH - 260, W, 260);
      cursorY = photoH + 90;
      photoLoaded = true;
    } catch {
      photoLoaded = false;
    }
  }
  if (!photoLoaded) {
    ctx.font = "340px sans-serif"; // الإيموجي يُرسم بخط النظام بغض النظر عن Cairo
    ctx.fillText(icon || "⭐", W / 2, 700);
    cursorY = 840;
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 72px Cairo, sans-serif";
  cursorY = wrapText(ctx, title, W / 2, cursorY, W - 160, 88, 3) + 30;

  if (subtitle) {
    ctx.font = "600 42px Cairo, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    wrapText(ctx, subtitle, W / 2, cursorY, W - 200, 56, 2);
  }

  ctx.font = "800 46px Cairo, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(isRtl ? "● هكوله" : "● Hakolah", W / 2, H - 150);
  ctx.font = "500 32px Cairo, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText(SITE_ORIGIN.replace(/^https?:\/\//, ""), W / 2, H - 100);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

/* ===== مشاركة عبر نظام المشاركة الأصلي بالجهاز (Web Share API) — يفتح نفس
   قائمة المشاركة اللي تشوفها بإنستقرام (واتساب، رسائل، تلغرام، نسخ رابط،
   وإضافة لستوري إنستقرام لو أرفقنا صورة). المتصفحات اللي ما تدعم مشاركة
   الملفات (أغلب أجهزة الحاسوب) ترجع تلقائياً لمشاركة نصية، وإلا لفتح واتساب
   مباشرة كما كانت الحال قبل هذي الميزة كلها */
async function shareText(text, trackParams, card) {
  let file = null;
  if (card && navigator.canShare) {
    try {
      const blob = await buildStoryImage(card);
      if (blob) {
        const candidate = new File([blob], "hakolah.png", { type: "image/png" });
        if (navigator.canShare({ files: [candidate] })) file = candidate;
      }
    } catch {
      file = null; // تعذّر توليد الصورة (مثلاً صورة المكان ما انحمّلت) — نكمل بالنص فقط
    }
  }

  if (navigator.share) {
    const payload = file ? { text, files: [file] } : { text };
    navigator
      .share(payload)
      .then(() => trackEdge("share", { method: file ? "system_image" : "system", ...trackParams }))
      .catch(() => {}); // المستخدم ألغى المشاركة — سلوك طبيعي، لا خطأ يُسجَّل
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    trackEdge("share", { method: "whatsapp", ...trackParams });
  }
}

/* مصدر اللحم بالبطاقة التفاعلية — نفس بناء item-card.njk (عنصر <details>
   أصلي بلا جافاسكربت للفتح)، بس نضيف هنا وصفاً لعُمر المعلومة يُحسب لحظة
   العرض. الحساب هنا لا وقت البناء عمداً: لو ما رُفع الموقع من شهور، الوصف
   المبني وقت النشر يصير كذباً، أما المحسوب بالمتصفح فيبقى صحيحاً دايماً. */
function meatSourceAgeLabel(checked) {
  if (!checked) return "";
  const days = (Date.now() - new Date(checked).getTime()) / 86400000;
  if (!Number.isFinite(days) || days < 0) return "";
  if (days < 30) return t("meat_source_age_recent");
  if (days < 365) return t("meat_source_age_months");
  return t("meat_source_age_old");
}

function buildMeatSourceHtml(item) {
  const meat = item.meatSource;
  if (!meat || !meat.text) return "";
  const isEn = window.SITE_LANG === "en";
  const text = (isEn && meat.text_en) || meat.text;
  const viaKey = {
    asked: "meat_source_via_asked",
    instagram: "meat_source_via_instagram",
    menu: "meat_source_via_menu",
  }[meat.via];
  const parts = [];
  if (viaKey) parts.push(t(viaKey));
  if (meat.checked)
    parts.push(`${t("meat_source_checked")}: <span dir="ltr">${meat.checked}</span>`);
  const age = meatSourceAgeLabel(meat.checked);
  if (age) parts.push(age);
  return `
      <details class="meat-source">
        <summary>🥩 ${t("meat_source_label")}</summary>
        <p class="meat-source-text">${text}</p>
        <p class="meat-source-meta">${parts.join(" · ")}</p>
      </details>`;
}

function buildActionsHtml(item) {
  // صفحة التفاصيل زر أساسي، والباقي (هاتف/خريطة/منيو...) يبقى ثانوي جنبه
  let detailHtml = "";
  if (item.detailUrl) {
    const href = window.SITE_LANG === "en" && item.detailUrlEn ? item.detailUrlEn : item.detailUrl;
    detailHtml = `<a class="btn" href="${href}">${ICON_SVG["menu-book"]} ${t("read_details")}</a>`;
  }
  // قائمة الطعام التفاعلية تحل محل زر صورة المنيو العادي، لا تظهران معاً
  const hasStructuredMenu = item.menuCount > 0 || (Array.isArray(item.menuItems) && item.menuItems.length > 0);
  const links = { ...(item.links || (item.url ? { website: item.url } : {})) };
  if (hasStructuredMenu) delete links.menu;
  const orderedKeys = Object.keys(links)
    .filter((key) => links[key])
    .sort((a, b) => LINK_ORDER.indexOf(a) - LINK_ORDER.indexOf(b));
  let html = orderedKeys
    .map((key, i) => {
      const url = links[key];
      const meta = LINK_META[key] || { icon: "🔗", labelKey: "link_generic" };
      const metaLabel = t(meta.labelKey);
      const cls = i === 0 && !detailHtml ? "btn" : "btn secondary";
      if (key === "phone") {
        // يدعم أكثر من رقم بالحقل الواحد (مفصولة بفاصلة) — مثل رقم واتساب
        // ورقم اتصال عادي مختلفين — بزر مستقل لكل رقم بدل ما نجبر عنصر واحد بس
        const numbers = url
          .split(",")
          .map((n) => n.trim())
          .filter(Boolean);
        return numbers
          .map((num, idx) => {
            const label = numbers.length > 1 ? `${metaLabel} ${idx + 1}` : metaLabel;
            return `<button type="button" class="${cls} phone-copy-btn" data-phone="${num}">${meta.icon} ${label}</button>`;
          })
          .join("");
      }
      const cta = window.SITE_LANG === "en" ? item.cta_en || item.cta : item.cta;
      const label = key === "website" && cta ? cta : metaLabel;
      return `<a class="${cls}" href="${url}" target="_blank" rel="noopener noreferrer">${meta.icon} ${label}</a>`;
    })
    .join("");
  if (hasStructuredMenu) {
    const cls = orderedKeys.length || detailHtml ? "btn secondary" : "btn";
    html += `<button type="button" class="${cls} menu-open-btn">${ICON_SVG["menu-book"]} ${t("link_menu")}</button>`;
  }
  return detailHtml + html;
}

/* ===== رسالة تأكيد عابرة (Toast) ===== */
let toastTimer = null;
function showToast(message) {
  let toast = document.getElementById("site-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "site-toast";
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("open");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("open"), 2000);
}

// ترتيب التثبيت أول القائمة: الممول فوق المميز فوق الباقي. الترتيب الأصلي
// محفوظ داخل كل مرتبة لأن Array.sort ثابت (stable) بكل المتصفحات الحديثة
function pinRank(item) {
  return (item.sponsored ? 2 : 0) + (item.featured ? 1 : 0);
}

/* ===== توهّج دخول خفيف عند ظهور البطاقة بمجال الرؤية (قائمة طويلة تظل حيّة
   أثناء التمرير، لا مجرد دفعة واحدة عند التحميل). عمداً على box-shadow/
   border-color لا opacity/transform — .item-card عندها animation shorthand
   خاص بها (cardIn) بالفعل، وتعريف animation ثانٍ على نفس العنصر يلغي الأول
   ويعيد الدخول من الصفر (خلل حقيقي حصل هنا قبل)؛ transition على خاصية مختلفة
   يتجنّبه كلياً ===== */
const cardRevealObserver =
  "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("card-revealed");
            cardRevealObserver.unobserve(entry.target);
          });
        },
        { threshold: 0.15 }
      )
    : null;

/* شارة القسم — تظهر فقط حين تختلط الأقسام ببعضها (الرئيسية، المفضلة،
   "اختار لي"): هناك يصعب تمييز مطعم بحريني من أداة رقمية بنظرة واحدة.
   بصفحة القسم نفسه كل العناصر من قسم واحد فالشارة ضجيج بلا فائدة. */
function sectionBadge(section) {
  if (!section || (window.PAGE && window.PAGE.section === section)) return "";
  const meta = SITE_DATA[section];
  if (!meta) return "";
  const isEn = window.SITE_LANG === "en";
  const label = (isEn && meta.title_en) || meta.title;
  if (!label) return "";
  const span = document.createElement("span");
  span.textContent = label;
  return `<span class="section-badge">${meta.icon || ""} ${span.innerHTML}</span>`;
}

/* ===== بناء بطاقة عنصر واحدة ===== */
function buildItemCard(section, item, index = 0, distanceKm = null, branchLabel = "") {
  const card = document.createElement("div");
  // نفس منطق item-card.njk بالضبط — أي تغيير هنا لازم ينعكس هناك، وإلا اختلف
  // شكل البطاقة قبل تشغيل جافاسكربت وبعده (وبوّابة التطابق بالبناء تكشفها)
  card.className = [
    "item-card",
    "scroll-reveal",
    item.sponsored ? "sponsored" : item.featured ? "featured" : "",
    item.verified ? "verified" : "",
  ]
    .filter(Boolean)
    .join(" ");
  card.style.animationDelay = `${Math.min(index, 10) * 45}ms`;
  cardRevealObserver?.observe(card);

  const fav = isFavorite(section, item.id);
  const liked = isLikedByMe(section, item.id);
  const likeCount = LIKE_COUNTS[`${section}:${item.id}`] || 0;
  const title = itemTitle(item);
  const desc = itemDesc(item);
  const isLongDesc = desc.length > 100;

  card.innerHTML = `
    ${item.image ? `<img class="item-photo" src="${escapeHtml(item.image)}" alt="${escapeHtml(title)}" loading="${index < 4 ? "eager" : "lazy"}" decoding="async" />${item.imageCredit ? `<a class="photo-credit card" dir="ltr" href="${escapeHtml(item.imageCreditUrl)}" target="_blank" rel="noopener">📷 ${escapeHtml(item.imageCredit)}</a>` : ""}` : ""}
    ${item.sponsored ? `<span class="sponsored-badge">${t("sponsored_badge")}</span>` : item.featured ? `<span class="featured-badge">${t("featured_badge")}</span>` : ""}
    <div class="item-body">
      ${sectionBadge(section)}
      <div class="item-top">
        ${item.illus ? `<img class="item-illus" src="/assets/illus/${escapeHtml(item.illus)}.webp" alt="" width="56" height="56" loading="lazy" decoding="async" />` : `<span class="item-icon" aria-hidden="true">${item.icon || "⭐"}</span>`}
        <div class="item-top-actions">
          <button class="like-btn ${liked ? "active" : ""}" data-section="${section}" data-id="${item.id}" title="${t("like_action")}" aria-label="${t("like_action")}" aria-pressed="${liked}">
            <span class="like-icon">${liked ? "♥" : "♡"}</span> <span class="like-count">${likeCount}</span>
          </button>
          <button class="share-btn" title="${t("share_whatsapp")}" aria-label="${t("share_whatsapp")}">${ICON_SVG.share}</button>
          <button class="fav-btn ${fav ? "active" : ""}" title="${fav ? t("fav_remove") : t("fav_add")}" aria-label="${fav ? t("fav_remove") : t("fav_add")}" aria-pressed="${fav}">
            ${fav ? "♥" : "♡"}
          </button>
        </div>
      </div>
      <h3><bdi>${title}</bdi>${item.verified ? ` <span class="verified-badge" title="${t("verified_badge")}">${t("verified_badge")}</span>` : ""}${item.liked ? ` <span class="liked-badge" title="${t("liked_badge")}">${t("liked_badge")}</span>` : ""}</h3>
      <p class="item-desc${isLongDesc ? " clamped" : ""}">${desc}</p>
      ${isLongDesc ? `<button class="desc-toggle" aria-expanded="false">${t("read_more")}</button>` : ""}
      ${itemHours(item) ? `<p class="item-hours">${ICON_SVG.schedule} ${itemHours(item)}</p>` : ""}
      <div class="item-meta">
        ${item.isNew ? `<span class="tag new-tag">${t("new_badge")}</span>` : ""}
        ${distanceKm !== null ? `<span class="tag distance-tag">${ICON_SVG["location-pin"]} ${formatDistance(distanceKm)}${branchLabel ? ` — ${t("nearest_branch")} ${branchLabel}` : ""}</span>` : ""}
        ${(item.tags || []).map((tag) => `<span class="tag">${tagIcon(tag) ? `<span class="tag-icon" aria-hidden="true">${tagIcon(tag)}</span>` : ""}${tagLabel(tag)}</span>`).join("")}
      </div>
      ${buildMeatSourceHtml(item)}
      <div class="item-actions">
        ${buildActionsHtml(item)}
      </div>
      <a class="report-link" href="${SITE_ROOT_PATH}${window.SITE_LANG === "en" ? "en/" : ""}contact.html?report=${encodeURIComponent(title)}&section=${encodeURIComponent(section)}">🚩 ${t("report_wrong_info")}</a>
    </div>
  `;

  const likeBtn = card.querySelector(".like-btn");
  likeBtn.addEventListener("click", () => {
    toggleLike(section, item.id, likeBtn);
  });

  const favBtn = card.querySelector(".fav-btn");
  favBtn.addEventListener("click", () => {
    const nowFav = toggleFavorite(section, item.id);
    favBtn.classList.toggle("active", nowFav);
    favBtn.textContent = nowFav ? "♥" : "♡";
    const label = nowFav ? t("fav_remove") : t("fav_add");
    favBtn.title = label;
    favBtn.setAttribute("aria-label", label);
    favBtn.setAttribute("aria-pressed", String(nowFav));
    favBtn.classList.remove("pop");
    void favBtn.offsetWidth;
    favBtn.classList.add("pop");
    playSound(nowFav ? "on" : "off");
  });

  const shareBtn = card.querySelector(".share-btn");
  shareBtn.addEventListener("click", () => {
    const text = buildShareText(section, item);
    const subtitle = (item.tags || []).map((tag) => tagLabel(tag)).join(" · ");
    shareText(
      text,
      { section, item_name: itemTitle(item) },
      {
        icon: item.icon,
        title,
        subtitle,
        photo: item.image,
      }
    );
    playSound("share");
  });

  const descToggle = card.querySelector(".desc-toggle");
  if (descToggle) {
    const descEl = card.querySelector(".item-desc");
    descToggle.addEventListener("click", () => {
      const expanded = descEl.classList.toggle("clamped") === false;
      descToggle.textContent = expanded ? t("read_less") : t("read_more");
      descToggle.setAttribute("aria-expanded", String(expanded));
      if (expanded) {
        card.classList.add("just-expanded");
        setTimeout(() => card.classList.remove("just-expanded"), 900);
      }
      playSound(expanded ? "open" : "tap");
    });
  }

  wireItemActions(card, item);

  return card;
}

// أزرار buildActionsHtml اللي تحتاج JS (نسخ الرقم، المنيو التفاعلي) — مشتركة بين
// بطاقة القائمة ونتيجة "اختار لي"
function wireItemActions(root, item) {
  root.querySelectorAll(".phone-copy-btn").forEach((phoneBtn) => {
    phoneBtn.addEventListener("click", async () => {
      const phone = phoneBtn.dataset.phone;
      try {
        await navigator.clipboard.writeText(phone);
      } catch {
        showToast(`${t("phone_copy_failed")} ${phone}`);
        return;
      }
      showToast(t("phone_copied"));
      playSound("copy");
    });
  });
  const menuBtn = root.querySelector(".menu-open-btn");
  if (menuBtn) {
    menuBtn.addEventListener("click", () => {
      playSound("open");
      openMenuOverlay(item);
    });
  }
}

/* ===== تتبّع الأقسام اللي تصفّحها الزائر (محلياً، بدون تسجيل دخول) — يغذّي
   مؤشر "استكشفت X من Y قسم" بالرئيسية (مبدأ Zeigarnik: العقل ما ينسى الشي الناقص) ===== */
const EXPLORED_KEY = "site_explored_sections_v1";

function getExploredSections() {
  try {
    return JSON.parse(lsGet(EXPLORED_KEY)) || {};
  } catch {
    return {};
  }
}

function markSectionExplored(section) {
  const explored = getExploredSections();
  if (explored[section]) return;
  explored[section] = true;
  lsSet(EXPLORED_KEY, JSON.stringify(explored));
}

/* ===== عرض قسم كامل: بحث + فلاتر + شبكة بطاقات =====
   typeFilter (اختياري): يقصر القسم على عناصر تاجها يحتوي هالقيمة — تستخدمه
   صفحة نوع محل السيارات (car-shop-type.njk) عشان تعرض غسيل بس مثلاً، بدل
   كل محلات السيارات. التاج نفسه يُستبعد من رقاقات الفلتر لأنه بديهي بالفعل. */
/* دخول البطاقات "طائرة" من خارج الشاشة عند التمرير (مستوحى من shopify.design):
   كل بطاقة تبدأ مخفية، أكبر ×1.5 ومزاحة للخارج حسب عمودها (يسار/يمين/تحت)،
   وأول ما يوصلها التمرير تنزلق لمكانها. للعرض الأول للصفحة بس — إعادة
   الرسم بالبحث/الفلترة تظهر عادي، وإلا كل حرف تكتبه يعيد العرض كله. */
function flyInCards(grid) {
  if (!("IntersectionObserver" in window)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cards = [...grid.querySelectorAll(".item-card")];
  if (!cards.length) return;

  // قراءة كل أبعاد البطاقات أولاً (دفعة واحدة) قبل أي كتابة style/class — تفادياً
  // لإعادة تخطيط قسري متكرر (layout thrashing) لو تداخلت القراءة والكتابة بكل تكرار
  const gridBox = grid.getBoundingClientRect();
  const gridCx = gridBox.left + gridBox.width / 2;
  const offsets = cards.map((card) => {
    const r = card.getBoundingClientRect();
    return Math.max(-350, Math.min(350, r.left + r.width / 2 - gridCx));
  });
  cards.forEach((card, i) => {
    card.style.setProperty("--fx", `${offsets[i]}px`);
    card.classList.add("fly-pending");
  });

  // المراقبة على البطاقة وهي مزاحة لتحت ومكبّرة، فالهامش السفلي يعوّض
  // الإزاحة — وإلا بطاقات أسفل الشاشة تبقى مخفية وقت فتح الصفحة
  // البطاقة الطرفية مزاحة ±350px فتنقصّ بالكامل خارج حاوية مقصوصة ولا "تتقاطع" أبداً —
  // فلما تظهر بطاقة نُظهر معها كل بطاقات صفّها وما فوقه (offsetTop لا يتأثر بالـtransform)
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting) return;
        cards.forEach((card) => {
          if (!card.classList.contains("fly-pending") || card.offsetTop > target.offsetTop + 1) return;
          observer.unobserve(card);
          card.classList.remove("fly-pending");
          card.classList.add("card-in", "flown");
        });
      });
    },
    { rootMargin: "0px 0px 250px 0px" }
  );
  cards.forEach((card) => {
    observer.observe(card);
    // بعد ما تستقر نشيل انتقال الـ1.2 ثانية، عشان حركة المرور (hover) ترجع سريعة
    card.addEventListener("transitionend", function done(e) {
      if (e.target !== card || e.propertyName !== "transform") return;
      card.classList.remove("card-in");
      card.removeEventListener("transitionend", done);
    });
  });
}

function renderSection(section, typeFilter) {
  const data = SITE_DATA[section];
  if (!data) return;

  markSectionExplored(section);

  const grid = document.querySelector(".card-grid");
  const searchInput = document.querySelector(".search-box");
  const filtersWrap = document.querySelector(".filters");
  const nearMeBtn = document.querySelector(".near-me-btn");

  if (!grid) return;

  const items = typeFilter
    ? data.items.filter((item) => item.group === typeFilter || (item.tags || []).includes(typeFilter))
    : data.items;

  // بناء الفلاتر من التاجات المتوفرة
  const allTags = new Set();
  items.forEach((item) =>
    (item.tags || []).forEach((t) => {
      if (t !== typeFilter) allTags.add(t);
    })
  );

  // فلتر لكل نوع (منطقة، سعر، الباقي) يشتغلون مع بعض: «المحرق + مشاوي + اقتصادي»
  const active = {};
  const tagKind = (tag) =>
    AREA_NAMES.includes(tag) ? "area" : PRICE_TAGS.includes(tag) ? "price" : "type";
  let filtersExpanded = false;
  // قانون هيك: الجوال يعرض أهم ٥ فلاتر بس (الشاشة الأولى كانت ١٣ زراً)، والباقي ورا «عرض المزيد»
  const FILTER_CHIP_LIMIT = matchMedia("(max-width: 700px)").matches ? 5 : 10;
  let userCoords = null;
  let sortByDistance = false;

  function renderFilters() {
    if (!filtersWrap) return;
    filtersWrap.innerHTML = "";
    const allChip = document.createElement("button");
    allChip.className = "filter-chip active";
    allChip.textContent = t("all_filter");
    allChip.dataset.tag = "all";
    allChip.setAttribute("aria-pressed", "true");
    allChip.addEventListener("click", () => {
      for (const k in active) delete active[k];
      updateActiveChip();
      renderGrid();
      playClickSound();
    });
    filtersWrap.appendChild(allChip);

    const tagsList = [...allTags];
    const hasMore = tagsList.length > FILTER_CHIP_LIMIT;
    const visibleTags = filtersExpanded ? tagsList : tagsList.slice(0, FILTER_CHIP_LIMIT);

    visibleTags.forEach((tag) => {
      const chip = document.createElement("button");
      chip.className = "filter-chip";
      chip.textContent = tagIcon(tag) ? `${tagIcon(tag)} ${tagLabel(tag)}` : tagLabel(tag);
      chip.dataset.tag = tag;
      chip.setAttribute("aria-pressed", "false");
      chip.addEventListener("click", () => {
        const kind = tagKind(tag);
        if (active[kind] === tag) delete active[kind];
        else active[kind] = tag;
        updateActiveChip();
        renderGrid();
        playClickSound();
      });
      filtersWrap.appendChild(chip);
    });

    if (hasMore) {
      const toggleChip = document.createElement("button");
      toggleChip.className = "filter-chip filter-toggle";
      toggleChip.textContent = filtersExpanded
        ? `${t("filters_show_less")} ▲`
        : `${t("filters_show_more")} (+${tagsList.length - FILTER_CHIP_LIMIT}) ▼`;
      toggleChip.setAttribute("aria-expanded", String(filtersExpanded));
      toggleChip.addEventListener("click", () => {
        filtersExpanded = !filtersExpanded;
        renderFilters();
        updateActiveChip();
        playClickSound();
      });
      filtersWrap.appendChild(toggleChip);
    }
  }

  function updateActiveChip() {
    if (!filtersWrap) return;
    [...filtersWrap.children].forEach((chip) => {
      const tag = chip.dataset.tag;
      if (!tag) return;
      const isActive = tag === "all" ? !Object.keys(active).length : active[tagKind(tag)] === tag;
      chip.classList.toggle("active", isActive);
      chip.setAttribute("aria-pressed", String(isActive));
    });
  }

  function renderGrid() {
    const query = (searchInput?.value || "").trim();
    grid.innerHTML = "";

    // الاسم والوصف والتصنيفات باللغتين (رابط مشاركة إنجليزي ?q= يشتغل بالصفحة العربية)
    const relevance = new Map();
    const filtered = items.filter((item) => {
      const matchesTag = Object.values(active).every((tag) => (item.tags || []).includes(tag));
      if (!matchesTag) return false;
      const score = searchScore(item, query);
      relevance.set(item, score);
      return score > 0;
    });

    let ranked = filtered.map((item) => {
      const near = sortByDistance && userCoords ? nearestBranch(item, userCoords) : null;
      return {
        item,
        distanceKm: near ? near.km : null,
        branchLabel: near ? near.label : "",
      };
    });

    ranked =
      sortByDistance && userCoords
        ? ranked.sort((a, b) => {
            if (a.distanceKm === null && b.distanceKm === null) return 0;
            if (a.distanceKm === null) return 1;
            if (b.distanceKm === null) return -1;
            return a.distanceKm - b.distanceKm;
          })
        : ranked.sort(
            (a, b) =>
              (query ? relevance.get(b.item) - relevance.get(a.item) : 0) || pinRank(b.item) - pinRank(a.item)
          );

    if (ranked.length === 0) {
      const isSectionEmpty = items.length === 0;
      grid.innerHTML = isSectionEmpty
        ? `
        <div class="empty-state full-row">
          <span class="icon">🧭</span>
          <p>${t("empty_section")}</p>
        </div>
      `
        : `
        <div class="empty-state full-row">
          <span class="icon">🔍</span>
          <p>${t("empty_search")}</p>
        </div>
      `;
      return;
    }

    ranked.forEach(({ item, distanceKm, branchLabel }, index) =>
      grid.appendChild(buildItemCard(section, item, index, distanceKm, branchLabel))
    );
  }

  const sharedQuery = new URLSearchParams(location.search).get("q");
  if (sharedQuery && searchInput) searchInput.value = sharedQuery;

  // قسم ما فيه ولا عنصر بموقع (روابط، مقالات…): الزر يطلب صلاحية الموقع بلا فايدة — نشيله
  const hasLocations = items.some(
    (item) => (item.lat != null && item.lng != null) || item.branches?.length
  );
  if (nearMeBtn && !hasLocations) nearMeBtn.remove();
  else if (nearMeBtn) {
    nearMeBtn.addEventListener("click", () => {
      if (sortByDistance) {
        sortByDistance = false;
        nearMeBtn.classList.remove("active");
        nearMeBtn.setAttribute("aria-pressed", "false");
        nearMeBtn.textContent = t("near_me");
        renderGrid();
        playSound("off");
        return;
      }
      if (!navigator.geolocation) {
        showToast(t("geolocation_unsupported"));
        return;
      }
      nearMeBtn.textContent = t("near_me_locating");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          sortByDistance = true;
          nearMeBtn.classList.add("active");
          nearMeBtn.setAttribute("aria-pressed", "true");
          nearMeBtn.textContent = t("near_me_active");
          renderGrid();
          playSound("on");
          // بالجوال القائمة تحت الشاشة: ننزل لأول بطاقة ونقول كم وحدة ترتّبت، عشان يبان إن شي تغيّر
          const sorted = grid.querySelectorAll(".distance-tag").length;
          showToast(t("near_me_sorted").replace("{n}", sorted));
          const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          window.scrollTo({
            top: grid.getBoundingClientRect().top + window.scrollY - 140,
            behavior: reduce ? "auto" : "smooth",
          });
        },
        () => {
          showToast(t("geolocation_denied"));
          nearMeBtn.textContent = t("near_me");
        },
        { enableHighAccuracy: false, timeout: 10000 }
      );
    });
  }

  renderFilters();
  renderGrid();
  flyInCards(grid);

  if (searchInput) {
    searchInput.addEventListener("input", renderGrid);
    initSearchSuggestions(searchInput, items, renderGrid);
  }
}

/* ===== عرض صفحة المفضلة (تجميع من كل الأقسام) ===== */
function renderFavoritesPage() {
  const grid = document.querySelector(".card-grid");
  if (!grid) return;

  const favs = getFavorites();
  const collected = [];

  Object.keys(SITE_DATA).forEach((section) => {
    const sectionFavs = favs[section] || {};
    SITE_DATA[section].items.forEach((item) => {
      if (sectionFavs[item.id]) {
        collected.push({ section, item });
      }
    });
  });

  grid.innerHTML = "";

  if (collected.length === 0) {
    grid.innerHTML = `
      <div class="empty-state full-row">
        <span class="icon">♡</span>
        <p>${t("favorites_empty_html")}</p>
      </div>
    `;
    return;
  }

  collected.forEach(({ section, item }, index) =>
    grid.appendChild(buildItemCard(section, item, index))
  );
}

/* ===== اختيار اليوم: عنصر واحد ثابت طوال اليوم، يتغيّر تلقائياً كل يوم
   (نفس الاختيار لكل الزوار بنفس اليوم — يعتمد على تاريخ اليوم كبذرة ثابتة،
   بدون عشوائية حقيقية ولا خادم، فيدور على كل العناصر بالتناوب بمرور الأيام) ===== */
// مفتاح اختيار اليوم — يستعمله شريط "أحدث الإضافات" ليتفادى تكرار نفس
// البطاقة مرّتين بنفس الصف
let FEATURED_PICK_KEY = "";

function renderFeaturedPick() {
  const container = document.getElementById("homeCarousel");
  if (!container) return;

  const allItems = [];
  Object.keys(SITE_DATA).forEach((section) => {
    (SITE_DATA[section].items || []).forEach((item) => {
      allItems.push({ section, item });
    });
  });

  if (allItems.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="icon">🎯</span>
        <p>${t("stay_tuned")}</p>
      </div>
    `;
    return;
  }

  const daysSinceEpoch = Math.floor(Date.now() / 86400000);
  const { section, item } = allItems[daysSinceEpoch % allItems.length];
  FEATURED_PICK_KEY = `${section}:${item.id}`;

  const wrapper = document.createElement("div");
  wrapper.className = "carousel-item";
  wrapper.innerHTML = `<span class="carousel-label">🎯 ${t("daily_pick_label")}</span><div class="featured-pick-frame"></div>`;
  wrapper.querySelector(".featured-pick-frame").appendChild(buildItemCard(section, item, 0));
  container.prepend(wrapper);
}

/* ===== الأكثر إعجاباً هذا الأسبوع (دليل اجتماعي حقيقي — مبني على بيانات
   الإعجاب الفعلية من الزوار، ما تضيف شي لو ما فيه إعجابات هالأسبوع بعد) ===== */
async function renderTrendingSection() {
  const container = document.getElementById("homeCarousel");
  if (!container) return;

  const config = window.PUSH_CONFIG;
  let ranked = [];
  if (config && config.workerUrl) {
    try {
      const res = await fetch(`${config.workerUrl}/likes/week`);
      const weekCounts = await res.json();
      ranked = Object.entries(weekCounts)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);
    } catch {
      ranked = [];
    }
  }

  let added = 0;
  ranked.forEach(([key], index) => {
    const sepIndex = key.indexOf(":");
    const itemSection = key.slice(0, sepIndex);
    const itemId = key.slice(sepIndex + 1);
    const item = (SITE_DATA[itemSection]?.items || []).find((i) => i.id === itemId);
    if (!item) return;
    const wrapper = document.createElement("div");
    wrapper.className = "carousel-item";
    wrapper.innerHTML = `<span class="carousel-label">🔥 ${t("trending_label")}</span>`;
    wrapper.appendChild(buildItemCard(itemSection, item, index));
    container.appendChild(wrapper);
    added++;
  });

  /* ما فيه إعجابات هالأسبوع (أو تعذّر جلبها) — فيبقى بالشريط كرت واحد
     "اختيار اليوم" ويبان الصف ناقصاً بالشاشات العريضة. نملأه بأحدث ما
     أُضيف للموقع: محتوى حقيقي يفيد الزائر بدل فراغ */
  if (added === 0) renderNewestItems(container);
}

function renderNewestItems(container) {
  const all = [];
  Object.keys(SITE_DATA).forEach((section) => {
    (SITE_DATA[section].items || []).forEach((item) => {
      if (item.hideFromNewest) return;
      if (item.addedAt && `${section}:${item.id}` !== FEATURED_PICK_KEY)
        all.push({ section, item });
    });
  });
  if (!all.length) return;

  all
    .sort((a, b) => b.item.addedAt - a.item.addedAt)
    .slice(0, 6)
    .forEach(({ section, item }, index) => {
      const wrapper = document.createElement("div");
      wrapper.className = "carousel-item";
      wrapper.innerHTML = `<span class="carousel-label">🆕 ${t("newest_label")}</span>`;
      wrapper.appendChild(buildItemCard(section, item, index));
      container.appendChild(wrapper);
    });
}

/* ===== رقم حقيقي بالهيرو (الصفحة الرئيسية) — عدد العناصر الفعلي بكل
   الأقسام، محسوب من SITE_DATA (المولَّد من ملفات src/<section>/*.md وقت
   البناء) لا رقم مكتوب يدوياً — فيتحدّث تلقائياً كل ما أضفنا محل جديد بدون
   الحاجة نعدّل أي نص بالموقع ===== */
function renderSiteStats() {
  const el = document.getElementById("siteStatsLine");
  if (!el) return;

  const total = Object.values(SITE_DATA).reduce(
    (sum, section) => sum + (section.items || []).length,
    0
  );
  if (total === 0) return;

  el.textContent = `${t("site_stats_prefix")} ${total} ${t("site_stats_suffix")}`;
}

/* ===== مؤشر "استكشفت X من Y قسم" (الصفحة الرئيسية) — يشجع الزائر يكمل تصفح
   باقي الأقسام بدل ما يوقف بقسم وحد (مبدأ Zeigarnik) ===== */
function renderExploreProgress() {
  const container = document.getElementById("exploreProgress");
  if (!container) return;

  const totalSections = Object.keys(SITE_DATA);
  const explored = getExploredSections();
  const exploredSections = totalSections.filter((s) => explored[s]);
  const total = totalSections.length;
  const count = exploredSections.length;

  if (total === 0) return;

  document.querySelectorAll(".section-card[data-section]").forEach((card) => {
    if (explored[card.dataset.section]) card.classList.add("explored");
  });

  if (count === 0) {
    container.innerHTML = "";
    return;
  }

  const percent = Math.round((count / total) * 100);
  const isComplete = count >= total;

  container.innerHTML = `
    <p class="explore-progress-text">
      ${
        isComplete
          ? t("explore_complete")
          : `🧭 ${t("explore_progress_verb")} ${count} ${t("explore_progress_of")} ${total} ${t("explore_progress_sections")}`
      }
    </p>
    <div class="explore-progress-bar"><div class="explore-progress-fill"></div></div>
  `;

  // العرض يُضبط عبر CSSOM بعد الإدراج — سمة style مضمّنة بالـ HTML ممنوعة
  // بسياسة CSP (style-src-attr)، أما ضبط الخاصية بجافاسكربت فمسموح
  const fill = container.querySelector(".explore-progress-fill");
  if (fill) fill.style.width = `${percent}%`;
}

/* عدّاد الزيارات القديم (‎/track و/stats بالـ Worker) أُزيل — Google Analytics
   المركّب أصلاً يعدّ الزيارات بدقة أعلى وبلا حدود، بينما كان العدّاد القديم
   يكتب مرتين لكل زيارة على Cloudflare KV، وحصة الخطة المجانية 1000 كتابة
   باليوم فقط — أي 500 زيارة صفحة يومياً تستهلك الحصة كلها وتوقف معها
   الإعجابات واشتراكات الإشعارات (يتشاركون نفس الحصة). */

/* ===== إشعار "اختيار اليوم" اليومي (اختياري، معطّل حتى المستخدم يفعّله بنفسه) =====
   الاشتراك يُخزَّن على Cloudflare Worker خاص بنا فقط — بدون أي طرف ثالث. */
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function initPushNotifications() {
  const btn = document.getElementById("notifyToggle");
  const config = window.PUSH_CONFIG;
  if (!btn || !config || !config.workerUrl) return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  btn.classList.remove("hidden");

  const registration = await navigator.serviceWorker.register("/sw.js");
  let subscription = await registration.pushManager.getSubscription();

  function apply(subscribed) {
    btn.classList.toggle("active", subscribed);
    btn.textContent = subscribed ? t("push_enabled_label") : t("push_enable_cta");
  }
  apply(Boolean(subscription));

  btn.addEventListener("click", async () => {
    try {
      if (subscription) {
        await fetch(`${config.workerUrl}/unsubscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
        subscription = null;
        apply(false);
        showToast(t("push_disabled"));
        playSound("off");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        showToast(t("push_permission_needed"));
        return;
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.vapidPublicKey),
      });

      const res = await fetch(`${config.workerUrl}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
      // الخادم رفض الحفظ (429/403/400): الزائر كان يشوف "تم التفعيل" وما يوصله شي أبداً
      if (!res.ok) {
        await subscription.unsubscribe().catch(() => {});
        subscription = null;
        throw new Error(`subscribe ${res.status}`);
      }

      apply(true);
      showToast(t("push_enabled"));
      playSound("on");
    } catch (err) {
      // بدون هذا الـ catch، أي فشل هنا (زي رفض الاشتراك من المتصفح نفسه)
      // كان يوقف التنفيذ بصمت والزر يضل بحالته القديمة بدون أي تفسير للزائر
      console.error("push subscription failed:", err);
      showToast(t("push_enable_failed"));
    }
  });
}

/* ===== اختار لي: اختيار عشوائي من أي قسم بأنيميشن سلوت مشين ===== */
/* ===== كشف "اختار لي" بشاشة كاملة — انظر تعليق CSS .picker-reveal-overlay
   لتفاصيل الفكرة. القطع الكبيرة (عنوان/صورة/هاتف/موقع/تصنيفات) تضل هي
   النتيجة النهائية فوق الشاشة كاملة، ما ترجع لبطاقة صغيرة بعدها — وتحتها
   أزرار التواصل الفعلية (اتصال/موقع/إنستقرام) وزر إعادة المحاولة والإغلاق */
/* يخفي عن قارئ الشاشة كل عناصر body الظاهرة خلف حاجز شاشة كاملة (اختار لي/
   القائمة) وقت فتحه — بدونه يقدر قارئ الشاشة "يقرأ" الهيدر/الفوتر/المحتوى
   المخفي بصرياً خلف الحاجز. لا يغيّر أي شيء مرئياً (aria-hidden بلا أثر على
   العرض) ولا يلمس عنصراً مخفياً بالفعل (يدعم حواري متداخلة: فتح حاجز القائمة
   فوق حاجز "اختار لي" المفتوح يخفي الحاجز الأول أيضاً، ويرجعه ظاهراً لقارئ
   الشاشة عند إغلاق حاجز القائمة فقط، لا كل شيء دفعة وحدة). يرجّع دالة إرجاع
   خاصة بنفس العناصر اللي أخفاها فعلياً. */
function hideBackgroundFromAT(overlay) {
  const hidden = [];
  Array.from(document.body.children).forEach((el) => {
    if (el === overlay || el.tagName === "SCRIPT" || el.hasAttribute("aria-hidden")) return;
    el.setAttribute("aria-hidden", "true");
    // inert (مدعوم بكل المتصفحات الحديثة) يمنع أيضاً وصول Tab/التركيز لهذي
    // العناصر أثناء فتح الحاجز — بدونه كان ممكن لمستخدم لوحة مفاتيح يخرج
    // بـTab من الحاجز لمحتوى الصفحة الخلفي (ظل بصرياً مخفياً خلف الحاجز، بس
    // ما زال بترتيب التركيز). لا يغيّر أي سلوك فأرة/لمس (الحاجز يغطي الشاشة
    // كاملة أصلاً بـz-index أعلى فيعترض كل نقرة قبل وصولها للخلفية).
    el.setAttribute("inert", "");
    hidden.push(el);
  });
  return () =>
    hidden.forEach((el) => {
      el.removeAttribute("aria-hidden");
      el.removeAttribute("inert");
    });
}

/* ===== بطاقة القائمة التفاعلية — حاجز بشاشة كاملة (.picker-reveal-overlay)
   ببطاقة بسيطة: اسم وسعر بس بلا صور — قرار صريح من صاحب الموقع. ===== */
function openMenuOverlay(item) {
  // نحفظ العنصر اللي كان عليه التركيز ونرجّع له بعد الإغلاق
  const trigger = document.activeElement;
  const overlay = document.createElement("div");
  overlay.className = "picker-reveal-overlay menu-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", `${t("link_menu")} — ${itemTitle(item)}`);
  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";
  const restoreBackground = hideBackgroundFromAT(overlay);

  function close() {
    overlay.remove();
    document.body.style.overflow = "";
    restoreBackground();
    document.removeEventListener("keydown", onKeydown);
    if (trigger && document.contains(trigger) && typeof trigger.focus === "function") {
      trigger.focus();
    }
  }
  function onKeydown(e) {
    if (e.key === "Escape") close();
  }
  document.addEventListener("keydown", onKeydown);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  const closeBtn = document.createElement("button");
  closeBtn.className = "btn secondary picker-reveal-close";
  closeBtn.textContent = "✕";
  closeBtn.setAttribute("aria-label", t("daily_pick_close"));
  closeBtn.addEventListener("click", () => {
    playSound("close");
    close();
  });
  overlay.appendChild(closeBtn);
  closeBtn.focus();

  const card = document.createElement("div");
  card.className = "menu-card";
  card.innerHTML = `
    <h3>${item.icon || "🍽️"} ${itemTitle(item)}</h3>
    <ul class="menu-items"><li aria-busy="true">…</li></ul>
  `;
  overlay.appendChild(card);
  // الأصناف تتحمّل عند الفتح (js/menus.js) — القائمة تظهر فوراً بنقاط تحميل ثم تتعبّى
  window
    .loadMenus()
    .catch(() => {})
    .then(() => {
      const rows = window
        .menuOf(item)
        .map((mi) => {
          const name = window.SITE_LANG === "en" && mi.name_en ? mi.name_en : mi.name;
          return `<li><span class="menu-item-name">${name}</span>${mi.price ? `<span class="menu-item-price">${mi.price}</span>` : ""}</li>`;
        })
        .join("");
      card.querySelector(".menu-items").innerHTML = rows;
    });
}

/* ===== خطة اليوم =====
   يقترح مساراً كاملاً ليوم واحد من نفس بيانات الموقع، بلا أي محتوى جديد.

   قرار تصميمي مهم: المراحل مبنية على **الأقسام** لا على التصنيفات. فحص
   البيانات الفعلي أظهر أن التصنيفات الدقيقة شبه غائبة (تصنيف "إفطار" مثلاً
   غير مستخدم بأي كافيه إطلاقاً، و"قهوة مختصة" على كافيه واحد فقط)، فبناء
   المراحل عليها كان بينتج خططاً فاضية أو مكررة. الأقسام مضمونة الامتلاء.

   كل مرحلة تتخطى نفسها بهدوء لو قسمها فاضي، فالميزة تشتغل مهما كان المحتوى،
   وتتحسّن تلقائياً مع كل عنصر يُضاف بلا أي تعديل هنا. */
const DAY_PLAN_STEPS = [
  { key: "morning", icon: "🥐", from: ["bakeries", "cafes"] },
  { key: "activity", icon: "📍", from: ["places"] },
  { key: "lunch", icon: "🍽️", from: ["restaurants"] },
  { key: "evening", icon: "☕", from: ["cafes"] },
];

function buildDayPlan() {
  const used = new Set();
  const steps = [];

  for (const step of DAY_PLAN_STEPS) {
    // نجمع كل عناصر الأقسام المسموحة لهذي المرحلة، ونستبعد المستخدَم سابقاً
    // حتى ما يتكرر نفس المكان مرتين بنفس الخطة
    const pool = [];
    for (const slug of step.from) {
      for (const item of SITE_DATA[slug]?.items || []) {
        const id = `${slug}:${item.id}`;
        if (!used.has(id)) pool.push({ slug, item, id });
      }
    }
    if (!pool.length) continue;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    used.add(chosen.id);
    steps.push({ ...step, ...chosen });
  }
  return steps;
}

function renderDayPlan() {
  const stage = document.getElementById("dayPlanStage");
  const btn = document.getElementById("dayPlanBtn");
  const shareBtn = document.getElementById("dayPlanShare");
  if (!stage || !btn) return;

  let current = [];

  function draw() {
    current = buildDayPlan();
    stage.innerHTML = "";

    if (!current.length) {
      stage.innerHTML = `<div class="empty-state full-row"><span class="icon">🧭</span><p>${t("empty_section")}</p></div>`;
      if (shareBtn) shareBtn.classList.add("hidden");
      return;
    }

    current.forEach((step, i) => {
      const row = document.createElement("div");
      row.className = "plan-step";
      row.style.animationDelay = `${i * 90}ms`;

      const head = document.createElement("div");
      head.className = "plan-step-head";
      head.innerHTML = `<span class="plan-step-icon">${step.icon}</span><span class="plan-step-label">${t("plan_" + step.key)}</span>`;
      row.appendChild(head);

      row.appendChild(buildItemCard(step.slug, step.item, i));
      stage.appendChild(row);
    });

    if (shareBtn) shareBtn.classList.remove("hidden");
    playSuccessSound();
  }

  btn.addEventListener("click", () => {
    playClickSound();
    draw();
  });

  if (shareBtn) {
    shareBtn.addEventListener("click", () => {
      const lines = current.map((s) => `${s.icon} ${t("plan_" + s.key)}: ${itemTitle(s.item)}`);
      const text = `${t("plan_share_title")}\n\n${lines.join("\n")}\n\n${SITE_ORIGIN}${window.SITE_LANG === "en" ? "en/" : ""}plan.html`;
      shareText(
        text,
        { section: "plan" },
        {
          icon: "🗓️",
          title: t("plan_title"),
          subtitle: current.map((s) => itemTitle(s.item)).join(" · "),
        }
      );
      playSound("share");
    });
  }

  draw();
}

function initWelcomePicker() {
  const picks = document.querySelectorAll(".welcome-pick");
  const nextBtn = document.getElementById("welcomeNextBtn");
  if (!picks.length || !nextBtn) return;
  let i = 0;
  nextBtn.addEventListener("click", () => {
    playClickSound();
    picks[i].classList.remove("active");
    i = (i + 1) % picks.length;
    picks[i].classList.add("active");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  initSoundToggle();
  initCookieConsent();
  initDailyPickReminder();
  initNavToggle();
  initHeaderScroll();
  initInstallPrompt();
  initSectionFilter();
  initAutoUpdateCheck();
  initContactForm();
  fetchLikeCounts();
  initOutboundTracking();
  initArticleShare();
  initArticleListen();

  // تسجيل الـ service worker بكل صفحة (لا بس الرئيسية) — شرط أساسي لصلاحية
  // "إضافة للشاشة الرئيسية" (PWA) بمعظم المتصفحات. التسجيل بدوال initPushNotifications
  // يبقى منفصل وآمن (register() على نفس الرابط يرجّع نفس التسجيل، ما يكرره)
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");

  // ما يخص كل صفحة على حدة — كانت سكربتات مضمّنة بـ base.njk، صارت تُقرأ من
  // إعدادات الصفحة (#site-config) عشان تشتغل سياسة CSP بدون unsafe-inline
  const page = window.PAGE || {};
  if (page.section) renderSection(page.section, page.typeFilter);
  if (page.favorites) renderFavoritesPage();
  if (page.picker) initRandomPicker();
  if (page.plan) renderDayPlan();
  if (page.welcome) initWelcomePicker();
  if (page.home) {
    renderFeaturedPick();
    initPushNotifications();
    renderTrendingSection();
    renderExploreProgress();
    renderSiteStats();
  }
});

/* ===== عن الموقع: بطاقة هكوله المعلّقة (بندول بسيط) =====
   زاوية البطاقة theta حول نقطة التعليق فوق الحزام. بلا سحب: تسارع الجاذبية
   -K·sin(theta) مع احتكاك، فتتأرجح وتهدأ. أثناء السحب: الزاوية تلحق اتجاه الإصبع
   من نقطة التعليق، وسرعة اللحاق تصير زخم الإفلات. الحلقة تشتغل فقط وهي تتحرك. */
function initAboutBadge() {
  const badge = document.getElementById("aboutBadge");
  const hero = badge?.closest(".about-hero");
  const holder = badge?.querySelector(".about-badge-holder");
  if (!badge || !hero || !holder) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const K = 14; // دورة تأرجح ~١٫٧ ثانية
  const DAMP = reduce ? 12 : 1.5; // تقليل الحركة: ترجع لمكانها بلا تأرجح
  const MAX = 1.2;
  const clampAngle = (v, m) => Math.max(-m, Math.min(m, v));
  let theta = 0;
  let omega = 0;
  let frame = 0;
  let last = 0;
  let drag = null;
  holder.title = badge.dataset.dragHint || "";

  function paint() {
    badge.style.setProperty("--swing", theta.toFixed(4) + "rad");
    badge.style.setProperty("--twist", clampAngle(-omega * 0.05, 0.22).toFixed(4) + "rad");
  }
  function step(now) {
    const dt = Math.min(0.032, (now - last) / 1000) || 0.016;
    last = now;
    if (drag) {
      const prev = theta;
      theta += (drag.target - theta) * Math.min(1, dt * 16);
      omega = (theta - prev) / dt;
    } else {
      omega += (-K * Math.sin(theta) - DAMP * omega) * dt;
      theta += omega * dt;
    }
    theta = clampAngle(theta, MAX);
    paint();
    if (drag || Math.abs(theta) > 0.002 || Math.abs(omega) > 0.004) {
      frame = requestAnimationFrame(step);
    } else {
      theta = omega = 0;
      paint();
      frame = 0;
    }
  }
  const kick = () => {
    if (frame) return;
    last = performance.now();
    frame = requestAnimationFrame(step);
  };

  // اتجاه الإصبع من نقطة التعليق (موجب = يمين). offsetTop بلا تكبير، فنضربه بنسبة
  // تكبير الصفحة (zoom على الشاشات العريضة) عشان يطابق إحداثيات المؤشر
  function pointerAngle(e) {
    const r = hero.getBoundingClientRect();
    const scale = r.width / hero.offsetWidth || 1;
    const px = r.left + r.width / 2;
    const py = r.top + badge.offsetTop * scale;
    return Math.atan2(e.clientX - px, Math.max(1, e.clientY - py));
  }

  holder.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    drag = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      phi0: pointerAngle(e),
      theta0: theta,
      target: theta,
      moved: false,
    };
    kick();
  });
  holder.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 5) return;
      // الالتقاط بعد أول حركة فقط: الضغطة العادية على الشارات تبقى رابطاً
      drag.moved = true;
      holder.setPointerCapture(e.pointerId);
      holder.classList.add("grabbing");
    }
    // تدوير البطاقة بزاوية موجبة يحرّك أسفلها لليسار، فالاتجاه معكوس
    drag.target = clampAngle(drag.theta0 - (pointerAngle(e) - drag.phi0), MAX);
  });
  const release = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.moved) {
      holder.classList.remove("grabbing");
      // السحب انتهى فوق شارة؟ النقرة اللي تتبع الإفلات مباشرة ما تفتح رابطها
      justDragged = true;
      setTimeout(() => (justDragged = false), 0);
    }
    drag = null;
    kick();
  };
  let justDragged = false;
  holder.addEventListener("click", (e) => justDragged && e.preventDefault(), true);
  holder.addEventListener("pointerup", release);
  holder.addEventListener("pointercancel", release);

  if (reduce) return;
  // دخول: البطاقة تنزل مائلة شوي وتتأرجح لمكانها
  theta = 0.42;
  paint();
  kick();
  // التمرير يهزّها خفيفاً (القصور الذاتي: الصفحة تتحرك والبطاقة تتأخر)
  let lastY = window.scrollY;
  window.addEventListener(
    "scroll",
    () => {
      const dy = window.scrollY - lastY;
      lastY = window.scrollY;
      const r = hero.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight || drag) return;
      omega = clampAngle(omega + dy * 0.004, 2.5);
      kick();
    },
    { passive: true }
  );
}
document.addEventListener("DOMContentLoaded", initAboutBadge);

// فقاعة الدعم: كل ضغطة تنقلها لزاوية أخرى؛ تختفي للأبد فقط إذا طلب المستخدم ذلك من البطاقة
(() => {
  const bubble = document.getElementById("supportBubble");
  const card = document.getElementById("supportCard");
  if (!bubble || !card) return;
  if (lsGet("supportHidden")) {
    bubble.remove();
    return;
  }
  let pos = Number(lsGet("supportPos")) % 4 || 0;
  bubble.dataset.pos = pos;
  bubble.addEventListener("click", () => {
    pos = (pos + 1) % 4;
    lsSet("supportPos", pos);
    card.showModal();
  });
  card.addEventListener("close", () => {
    bubble.dataset.pos = pos;
  });
  card.addEventListener("click", (e) => {
    if (e.target.closest("[data-hide]")) {
      lsSet("supportHidden", "1");
      bubble.remove();
      card.close();
    } else if (e.target.closest("[data-close]")) card.close();
  });
})();

/* ===== «/» يفتح البحث من أي صفحة (عُرف Google وGitHub)؛ بصفحة البحث نفسها يركّز على الحقل ===== */
document.addEventListener("keydown", (e) => {
  if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest("input, textarea, select, [contenteditable]")) return;
  if (document.getElementById("piano") || document.querySelector(".sounds-tool")) return; // صفحة الصوتيات: المفاتيح للعزف
  e.preventDefault();
  const field = document.getElementById("searchInput");
  if (field) return field.focus();
  location.href = (window.SITE_LANG === "en" ? "/en/" : "/") + "search.html";
});

/* ===== صور صفحة المكان: الضغط يكبّر الصورة لملء الشاشة داخل الموقع، و✕ يرجعها لمكانها =====
   حركة FLIP: نحرّك الصورة الكبيرة نفسها بـtransform + clip-path + opacity فقط (على الـGPU)
   — View Transitions كانت تصوّر الصفحة كاملة كل مرة فالحركة تقطّع على الشاشات السريعة */
(function photoLightbox() {
  const strip = document.querySelector(".photo-strip");
  if (!strip) return;
  const dlg = document.createElement("dialog");
  dlg.className = "photo-lightbox";
  dlg.innerHTML = '<button type="button" class="photo-lightbox-close">✕</button><img alt="" />';
  dlg.firstChild.setAttribute("aria-label", window.SITE_LANG === "en" ? "Close" : "إغلاق");
  document.body.append(dlg);
  const big = dlg.querySelector("img");
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const timing = { duration: 240, easing: "cubic-bezier(0.2, 0, 0, 1)" };
  let thumb = null;
  let busy = false;

  // من مكان المصغّرة لمكان الكبيرة: تكبير موحّد يغطي المصغّرة + قصّ الزائد (لو نسبتها مختلفة مثل الصورة الرئيسية)
  function fromThumb() {
    const t = thumb.getBoundingClientRect();
    const b = big.getBoundingClientRect();
    const z = b.width / big.offsetWidth || 1; // zoom الصفحة بالشاشات العريضة
    const s = Math.max(t.width / b.width, t.height / b.height);
    const dx = (t.left + t.width / 2 - (b.left + b.width / 2)) / z;
    const dy = (t.top + t.height / 2 - (b.top + b.height / 2)) / z;
    const cx = (b.width - t.width / s) / 2 / z;
    const cy = (b.height - t.height / s) / 2 / z;
    const r = parseFloat(getComputedStyle(thumb).borderTopLeftRadius) / s || 0;
    return [
      { transform: `translate(${dx}px, ${dy}px) scale(${s})`, clipPath: `inset(${cy}px ${cx}px round ${r}px)` },
      { transform: "none", clipPath: "inset(0px 0px round 0px)" },
    ];
  }

  async function open(img) {
    if (busy) return;
    thumb = img;
    big.src = img.currentSrc || img.src;
    big.alt = img.alt;
    try {
      await big.decode(); // فك ترميز الصورة قبل الحركة، مو في نصها
    } catch {
      /* نكمل حتى لو فشل */
    }
    dlg.showModal();
    if (still) return;
    busy = true;
    thumb.style.visibility = "hidden";
    dlg.animate({ opacity: [0, 1] }, { ...timing, pseudoElement: "::backdrop" });
    dlg.animate({ backgroundColor: ["rgb(0 0 0 / 0)", "#000"] }, timing);
    dlg.firstChild.animate({ opacity: [0, 1] }, timing);
    await big.animate(fromThumb(), timing).finished.catch(() => {});
    thumb.style.visibility = "";
    busy = false;
  }

  async function close() {
    if (busy) return;
    if (!still && thumb) {
      busy = true;
      thumb.style.visibility = "hidden";
      const back = { ...timing, fill: "forwards" };
      dlg.animate({ opacity: [1, 0] }, { ...back, pseudoElement: "::backdrop" });
      dlg.animate({ backgroundColor: ["#000", "rgb(0 0 0 / 0)"] }, back);
      dlg.firstChild.animate({ opacity: [1, 0] }, back);
      await big.animate(fromThumb().reverse(), back).finished.catch(() => {});
      thumb.style.visibility = "";
      busy = false;
    }
    dlg.close();
    dlg.getAnimations({ subtree: true }).forEach((a) => a.cancel());
  }

  // كيبورد: Enter على رابط المصغّرة يجي الحدث على <a> مو <img>؛ والصورة الرئيسية نخليها زر قابل للتركيز
  const hero = document.querySelector(".detail-hero-photo");
  if (hero) {
    hero.tabIndex = 0;
    hero.setAttribute("role", "button");
    hero.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      open(hero);
    });
  }
  document.addEventListener("click", (e) => {
    const link = e.target.closest(".photo-strip a");
    const img = link ? link.querySelector("img") : e.target.closest(".detail-hero-photo");
    if (!img) return;
    e.preventDefault();
    open(img);
  });
  // ✕ أو الضغط خارج الصورة يقفل؛ Esc يقفل بنفسه (cancel) فنمرّره من نفس الطريق للحركة
  dlg.addEventListener("click", (e) => e.target !== big && close());
  dlg.addEventListener("cancel", (e) => {
    e.preventDefault();
    close();
  });
})();
