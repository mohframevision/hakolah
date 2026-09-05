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

    const matches = items.filter((item) => fuzzyIncludes(item.title, query)).slice(0, 6);

    if (matches.length === 0) {
      close();
      return;
    }

    dropdown.innerHTML = matches
      .map(
        (item) =>
          `<div class="search-suggestion" data-id="${item.id}">
            <span>${item.icon || "⭐"}</span>
            <span>${item.title}</span>
          </div>`
      )
      .join("");
    dropdown.classList.add("open");

    dropdown.querySelectorAll(".search-suggestion").forEach((el, i) => {
      el.addEventListener("mousedown", (e) => {
        e.preventDefault();
        searchInput.value = matches[i].title;
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

/* ===== مؤثرات صوتية خفيفة عند التفاعل (اختيارية، معطّلة افتراضياً) =====
   تُولَّد بـ Web Audio API مباشرة (بدون ملفات صوت خارجية) — نغمة قصيرة وخافتة
   لأزرار التفاعل العادية، ونغمتين متتاليتين لحظة "اختار لي" احتفالاً بالنتيجة. */
const SOUND_KEY = "site_sound_pref";
let audioCtx = null;

function isSoundEnabled() {
  return localStorage.getItem(SOUND_KEY) === "on";
}

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playTone(freq, duration, delay = 0) {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  const startTime = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.05, startTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

function playClickSound() {
  playTone(650, 0.07);
}

function playSuccessSound() {
  playTone(660, 0.1);
  playTone(880, 0.12, 0.08);
}

function initSoundToggle() {
  const btn = document.querySelector(".sound-toggle");
  if (!btn) return;

  function apply(enabled) {
    btn.classList.toggle("active", enabled);
    btn.textContent = enabled ? "🔊" : "🔇";
    const label = enabled ? t("sound_on") : t("sound_off");
    btn.setAttribute("aria-label", label);
    btn.title = label;
  }

  apply(isSoundEnabled());

  btn.addEventListener("click", () => {
    const next = !isSoundEnabled();
    localStorage.setItem(SOUND_KEY, next ? "on" : "off");
    apply(next);
    if (next) playClickSound();
  });
}

/* ===== تبديل المظهر: تلقائي (يتبع النظام) / فاتح / داكن ===== */
function initThemeToggle() {
  const btn = document.querySelector(".theme-toggle");
  if (!btn) return;

  const KEY = "site_theme_pref";
  const ICONS = { auto: "🌓", light: "☀️", dark: "🌙" };
  const NEXT = { auto: "light", light: "dark", dark: "auto" };

  function getPref() {
    const stored = localStorage.getItem(KEY);
    return stored === "light" || stored === "dark" ? stored : "auto";
  }

  function apply(pref) {
    if (pref === "auto") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", pref);
    }
    // أيقونة فقط داخل الزر (الزر مربّع بالهيدر) والشرح النصي بالـ title/aria
    btn.textContent = ICONS[pref];
    const label = `${t("theme_current_label")}: ${t(`theme_label_${pref}`)} — ${t("theme_click_to_toggle")}`;
    btn.title = label;
    btn.setAttribute("aria-label", label);
  }

  apply(getPref());

  btn.addEventListener("click", () => {
    const next = NEXT[getPref()];
    if (next === "auto") {
      localStorage.removeItem(KEY);
    } else {
      localStorage.setItem(KEY, next);
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

  if (!localStorage.getItem(KEY)) {
    banner.classList.add("open");
  }

  acceptBtn.addEventListener("click", () => {
    localStorage.setItem(KEY, "accepted");
    banner.classList.remove("open");
  });
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
    localStorage.setItem(SEEN_KEY, today);
    return;
  }

  if (localStorage.getItem(SEEN_KEY) === today) return;
  if (sessionStorage.getItem(DISMISSED_KEY)) return;

  const banner = document.getElementById("dailyPickReminder");
  const closeBtn = document.getElementById("dailyPickReminderClose");
  if (!banner || !closeBtn) return;

  banner.classList.add("open");

  closeBtn.addEventListener("click", () => {
    sessionStorage.setItem(DISMISSED_KEY, "1");
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
      playClickSound();
    });
  });
}

/* ===== ظل الهيدر عند التمرير ===== */
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
}

/* ===== تحديث تلقائي: يكتشف نسخة جديدة من الموقع ويعيد التحميل بدون تدخل المستخدم =====
   المشكلة: المتصفح يخزّن الصفحة/الملفات مؤقتاً (Cache)، فلو كان تبويب الموقع مفتوح
   عند المستخدم ونشرنا تحديث، ما يشوفه إلا بعد تحديث يدوي. هذا يتحقق من version.json
   بدون كاش، ولو تغيّرت النسخة عن آخر مرة شافها هالتبويب، يعيد التحميل تلقائياً. */
function initAutoUpdateCheck() {
  const SEEN_KEY = "site_seen_version";

  async function checkVersion() {
    try {
      // مسار مطلق: الرابط النسبي كان ينحل على مجلد الصفحة، فيصير
      // /hakolah/ai-experiments/version.json ويرجع 404 بكل صفحات التفاصيل
      const res = await fetch(`/hakolah/version.json?_=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const seen = sessionStorage.getItem(SEEN_KEY);
      if (seen && data.version && seen !== data.version) {
        sessionStorage.setItem(SEEN_KEY, data.version);
        location.reload();
        return;
      }
      if (data.version) sessionStorage.setItem(SEEN_KEY, data.version);
    } catch {
      /* تجاهل أي خطأ شبكة، نحاول مرة ثانية بالفحص القادم */
    }
  }

  checkVersion();
  setInterval(checkVersion, 5 * 60 * 1000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkVersion();
  });
}

/* ===== المفضلة (تُحفظ محلياً في المتصفح عبر localStorage - لا تحتاج تسجيل دخول) ===== */
const FAVORITES_KEY = "site_favorites_v1";

function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || {};
  } catch {
    return {};
  }
}

function saveFavorites(favs) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
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
    return JSON.parse(localStorage.getItem(LIKES_KEY)) || {};
  } catch {
    return {};
  }
}

function saveLikedItems(liked) {
  localStorage.setItem(LIKES_KEY, JSON.stringify(liked));
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
  if (alreadyLiked) delete liked[key];
  else liked[key] = true;
  saveLikedItems(liked);
  playClickSound();

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
  website: { icon: "🌐", labelKey: "link_website" },
  phone: { icon: "📞", labelKey: "link_phone" },
  maps: { icon: "📍", labelKey: "link_maps" },
  instagram: { icon: "📷", labelKey: "link_instagram" },
};

// ترتيب ثابت للأزرار بغض النظر عن ترتيب الحقول باللوحة — رابط الموقع (website)
// دايماً أول زر وبتنسيق أساسي (بارز)، والباقي أزرار ثانوية بعده
const LINK_ORDER = ["website", "phone", "maps", "instagram"];

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
const SITE_ORIGIN = "https://mohframevision.github.io/hakolah/";
const SITE_ROOT_PATH = "/hakolah/";

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
    const heading = document.querySelector(".page-header h1")?.textContent?.trim() || document.title;
    const match = heading.match(/^(\p{Extended_Pictographic}(?:️)?)\s*/u);
    const icon = match ? match[1] : "🧭";
    const title = match ? heading.slice(match[0].length).trim() : heading;
    shareText(text, { section: (window.PAGE || {}).section || "" }, { icon, title });
    playClickSound();
  });
}

/* ===== تجربة "موسيقى بيب هادئة" (src/ai-experiments/calm-beep-music.md) =====
   نغمات Web Audio من سلّم خماسي (Pentatonic) بأوكتافين، بمفتاح موسيقي عشوائي
   لكل تشغيلة (ROOT_NOTES). التأليف بجمل موسيقية (Motifs) لا نغمات مستقلة —
   انظر تعليق playSequence بالتفصيل. مساحة الاحتمالات (مفتاح + جمل + إيقاع)
   كبيرة كفاية إن أي تشغيلتين ما تتكرران عملياً. النص على الزر ولوحة المفاتيح
   يجيان من data-play-label/data-stop-label بالـ HTML نفسه عشان يشتغل بأي لغة
   بدون تكرار الدالة. */
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

/* decodeAudioData يعيد تشكيل العيّنات لتردّد سياق الصوت (عادةً تردّد العتاد،
   ٤٨ كيلو) — يعني ملف ٤٤.١ يطلع ٤٨ بلا سبب، وهذا تغيير يمسّ الجودة بأداة
   وظيفتها أن تحوّل بأمانة. فنقرأ التردّد الأصلي من ترويسة الملف ونبني السياق
   عليه، فما يصير أي إعادة تشكيل.
   ponytail: WAV و MP3 فقط — باقي الصيغ ترجع للتردّد الافتراضي؛ لو احتجنا
   دقّة بـ m4a/ogg فالترقية قراءة ترويسة كل حاوية أو WebCodecs. */
function sniffSampleRate(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (at, len) => String.fromCharCode(...bytes.subarray(at, at + len));

  if (bytes.length > 28 && text(0, 4) === "RIFF" && text(8, 4) === "WAVE") {
    return view.getUint32(24, true) || 0;
  }

  // نتخطّى وسم ID3 إن وُجد (طوله عدد "syncsafe" من ٧ بتات لكل بايت)
  let at = 0;
  if (bytes.length > 10 && text(0, 3) === "ID3") {
    at = 10 + ((bytes[6] << 21) | (bytes[7] << 14) | (bytes[8] << 7) | bytes[9]);
  }
  const RATES = {
    3: [44100, 48000, 32000], // MPEG 1
    2: [22050, 24000, 16000], // MPEG 2
    0: [11025, 12000, 8000], // MPEG 2.5
  };
  const limit = Math.min(bytes.length - 3, at + 8192);
  for (let i = at; i < limit; i++) {
    if (bytes[i] !== 0xff || (bytes[i + 1] & 0xe0) !== 0xe0) continue;
    const table = RATES[(bytes[i + 1] >> 3) & 0x03];
    const rate = table && table[(bytes[i + 2] >> 2) & 0x03];
    if (rate) return rate;
  }
  return 0;
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
    return Array.from({ length: 22 }, (_, d) => {
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
  let playing = false;
  let stopRequested = false;
  let activeOscillators = [];
  let activeTimeouts = [];

  // يُنشأ مرة وحدة لكل AudioContext — شبكة الصدى تحتاج تبقى نفسها طول التشغيلة
  // عشان الصدى يتراكم طبيعياً بين النغمات، لا يتصفّر كل نغمة. القيم الفعلية
  // (كمية الصدى) تُضبط بدالة applyMood كل تشغيلة حسب المزاج المختار
  function ensureAudioGraph() {
    if (delayNode) return;
    delayNode = audioCtx.createDelay();
    delayNode.delayTime.value = 0.22;
    delayFeedbackGain = audioCtx.createGain();
    delayWetGain = audioCtx.createGain();

    delayNode.connect(delayFeedbackGain);
    delayFeedbackGain.connect(delayNode);
    delayNode.connect(delayWetGain);
    delayWetGain.connect(audioCtx.destination);
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
  };

  let currentInstrument = "piano";
  const instrumentButtons = document.querySelectorAll("#instrumentPicker .instrument-btn");
  instrumentButtons.forEach((el) => {
    el.addEventListener("click", () => {
      currentInstrument = el.dataset.instrument;
      instrumentButtons.forEach((b) => b.classList.toggle("active", b === el));
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
  };


  let currentMood = "calm";
  const moodButtons = document.querySelectorAll("#moodPicker .mood-btn");
  moodButtons.forEach((el) => {
    el.addEventListener("click", () => {
      currentMood = el.dataset.mood;
      moodButtons.forEach((b) => b.classList.toggle("active", b === el));
      playClickSound();
    });
  });

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
      playClickSound();
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
  function playNote(target, noteIndex, startTime, duration, peakGain) {
    const { ctx, dry, wet, live } = target;
    const freq = NOTES[noteIndex];
    const instrument = INSTRUMENTS[currentInstrument];

    // آلة وترية (يسار اللوحة = نغمات واطية بأوتار أطول وأثخن فترن أطول
    // وأغنى، يمينها = نغمات حادة تخفت أسرع وأنحف) — يشتغل بأي مفتاح موسيقي
    // عشوائي بلا ما يحتاج نغمة مرجعية ثابتة، ومضروب بمعامل الآلة نفسها
    // (بانجو يخفت أسرع من البيانو، فلوت يرن أطول لأنه آلة نفخ مستمرة)
    const registerFactor = 1.5 - (noteIndex / (NOTES.length - 1)) * 0.9; // ١٫٥ (واطي) → ٠٫٦ (حاد)
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
    filter.connect(dry);
    filter.connect(wet);

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
    instrument.harmonics.forEach(({ mult, weight, type }) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq * mult;
      if (vibratoGain) vibratoGain.connect(osc.frequency);
      const harmonicGain = ctx.createGain();
      harmonicGain.gain.value = mult === 1 ? weight : weight * harmonicRichness;
      osc.connect(harmonicGain).connect(envelope);
      osc.start(startTime);
      osc.stop(startTime + ringDuration + 0.05);
      if (live) activeOscillators.push(osc);
    });

    if (live) highlightKey(freq, (startTime - ctx.currentTime) * 1000, ringDuration * 1000);
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
    const bpm = Math.round(mood.bpmRange[0] + rand() * (mood.bpmRange[1] - mood.bpmRange[0]));
    // الميزان: أغلب القطع ٤/٤، وواحدة من كل أربع بميزان ثلاثي (فالس) — الميزان
    // من أقوى ما يغيّر إحساس القطعة، وكان ٤/٤ دايماً
    const meter = rand() < 0.25 ? 3 : 4;
    const progression = PROGRESSIONS[Math.floor(rand() * PROGRESSIONS.length)];
    const pool = mood.rhythms[meter];
    // إيقاعان مختلفان: واحد للجملة الأساسية وواحد لجملة الجواب. الجملة الأساسية
    // تحتفظ بإيقاعها عند تكرارها (وإلا ضاع التكرار اللي يمسكه المستمع)
    const themeRhythm = pool[Math.floor(rand() * pool.length)];
    const answerRhythm = pool[Math.floor(rand() * pool.length)];
    const accompaniment = ACCOMPANIMENT_STYLES[Math.floor(rand() * ACCOMPANIMENT_STYLES.length)];
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
    const bassGain = mood.gainBase * 0.55;
    const padGain = mood.gainBase * 0.3;
    let voices = null; // أصوات المرافقة بالمازورة السابقة — أساس قيادة الأصوات
    let barBeat = 0;

    for (let repeat = 0; repeat < mood.formRepeats; repeat++) {
      for (let bar = 0; bar < period.length; bar++) {
        const chordRoot = chords[bar];
        voices = voiceChord(chordRoot, voices);
        const add = (degree, startBeat, durBeats, gain) => events.push({ degree, startBeat, durBeats, gain });

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
        period[bar].forEach(({ degree, length }) => {
          if (length > 0 && degree !== null) {
            const gain = mood.gainBase + mood.gainSwell * (beat === 0 ? 1 : 0.55);
            add(degree, barBeat + beat, length * 0.92, gain);
          }
          beat += Math.abs(length);
        });

        barBeat += meter;
      }
    }

    return {
      events,
      meta: { seed, bpm, meter, rootIndex, mode: mood.scale, chords, cadenceApproach, totalBeats: barBeat },
    };
  }

  // يجدول أحداث القطعة داخل أي سياق صوتي (حي أو غير متصل للتصدير)
  function scheduleEvents(target, piece, startTime) {
    const beatDur = 60 / piece.meta.bpm;
    piece.events.forEach((ev) => {
      playNote(target, ev.degree, startTime + ev.startBeat * beatDur, ev.durBeats * beatDur, ev.gain);
    });
  }

  /* ===== تصدير الملفات ===== */

  function downloadBlob(blob, filename) {
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

    const delay = ctx.createDelay();
    delay.delayTime.value = 0.22;
    const feedback = ctx.createGain();
    feedback.gain.value = mood.delayFeedback;
    const wet = ctx.createGain();
    wet.gain.value = mood.delayWet;
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(ctx.destination);

    scheduleEvents({ ctx, dry: ctx.destination, wet: delay, live: false }, piece, 0.05);
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
    g.fillText(isEn ? "An experiment from the Hakolah site" : "تجربة من موقع هكوله", S / 2, 218);
    g.font = "700 34px Tahoma, Arial, sans-serif";
    g.fillStyle = theme.primary;
    g.fillText(isEn ? "Music composed randomly" : "موسيقى مؤلَّفة عشوائياً", S / 2, 272);

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
      const freq = NOTES[ev.degree];
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

  async function playSequence() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") await audioCtx.resume();
    ensureAudioGraph();

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
    scheduleEvents({ ctx: audioCtx, dry: audioCtx.destination, wet: delayNode, live: true }, piece, startTime);

    renderAnalysis(piece.meta);

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
    if (INSTRUMENTS[instrumentParam]) {
      currentInstrument = instrumentParam;
      instrumentButtons.forEach((b) => b.classList.toggle("active", b.dataset.instrument === instrumentParam));
    }
  }
}

/* ===== محوّل الصور — يشتغل كاملاً داخل المتصفح =====
   لا رفع لأي سيرفر ولا مكتبة خارجية: فكّ الترميز بـ createImageBitmap،
   وإعادة الترميز بـ canvas.toBlob — كلاهما أصلي بالمتصفح. الوعد بالخصوصية
   هنا قابل للإثبات: الصفحة تشتغل والإنترنت مفصول. */
/* ===== محوّل الملفات: صور وصوت وفيديو =====
   كل التحويل يصير داخل المتصفح: createImageBitmap+canvas للصور،
   decodeAudioData+مرمّزاتنا للصوت، وcanvas.captureStream+MediaRecorder للفيديو.
   ما فيه أي طلب شبكة بأي مسار من هذي الثلاثة. */
function initFileConverter() {
  const input = document.getElementById("convInput");
  const drop = document.getElementById("convDrop");
  const results = document.getElementById("convResults");
  if (!input || !drop || !results) return;

  const isEn = window.SITE_LANG === "en";
  const say = (ar, en) => (isEn ? en : ar);

  const quality = document.getElementById("convQuality");
  const qualityOut = document.getElementById("convQualityOut");
  const qualityRow = document.getElementById("convQualityRow");
  const maxWidthInput = document.getElementById("convMaxWidth");
  const videoWidthInput = document.getElementById("convVideoWidth");
  const muteInput = document.getElementById("convMute");
  const kindButtons = document.querySelectorAll(".conv-kind");
  const panels = {
    image: document.getElementById("convImageOpts"),
    audio: document.getElementById("convAudioOpts"),
    video: document.getElementById("convVideoOpts"),
  };

  let kind = "image";
  const chosen = { image: "image/webp", audio: "audio/mpeg", video: "" };

  const IMAGE_EXT = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png", "image/bmp": "bmp" };
  const ACCEPT = {
    image: "image/*",
    // الفيديو مقبول بوضع الصوت: استخراج الصوت من مقطع فيديو أشهر استعمال
    audio: "audio/*,video/*",
    // والصوت مقبول بوضع الفيديو كذلك: صوت + صورة موجات متحركة = فيديو
    video: "video/*,audio/*",
  };

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function formatClock(seconds) {
    if (!isFinite(seconds)) return "—";
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  // أرقام داخل جملة عربية بينها حرف زائد ("/") تنقلب بصرياً باتجاه النص —
  // نفس مشكلة البوسترات. dir="ltr" على الجزء الرقمي وحده يمنعها بلا ما يكسر
  // اتجاه بقية الجملة
  function durationNote(duration) {
    return say(
      `المدة <span dir="ltr">${formatClock(duration)}</span> — التحويل ياخذ نفس المدة تقريباً`,
      `Duration <span dir="ltr">${formatClock(duration)}</span> — conversion takes about the same time`
    );
  }

  function progressLabel(elapsed, duration) {
    return say(
      `يحوّل… <span dir="ltr">${formatClock(elapsed)} / ${formatClock(duration)}</span>`,
      `Converting… <span dir="ltr">${formatClock(elapsed)} / ${formatClock(duration)}</span>`
    );
  }

  function changeText(before, after) {
    const change = Math.round((1 - after / before) * 100);
    const label =
      change > 0 ? say(`أصغر بـ ${change}%`, `${change}% smaller`) : say(`أكبر بـ ${Math.abs(change)}%`, `${Math.abs(change)}% larger`);
    return { change, label };
  }

  /* ===== أشرطة الصيغ ===== */
  document.querySelectorAll(".conv-format").forEach((button) => {
    button.addEventListener("click", () => {
      const group = button.closest(".instrument-picker");
      chosen[group.dataset.kind] = button.dataset.format;
      group.querySelectorAll(".conv-format").forEach((b) => b.classList.toggle("active", b === button));
      // PNG وBMP بلا فقد (بلا جودة قابلة للضبط)، وWAV بلا معدّل بت — نخفي
      // الخيار بدل ما نعرضه معطّلاً
      if (group.dataset.kind === "image" && qualityRow)
        qualityRow.hidden = chosen.image === "image/png" || chosen.image === "image/bmp";
      const bitrateRow = document.getElementById("convBitrateRow");
      if (group.dataset.kind === "audio" && bitrateRow) bitrateRow.hidden = chosen.audio === "audio/wav";
    });
  });

  kindButtons.forEach((button) => {
    button.addEventListener("click", () => {
      kind = button.dataset.kind;
      kindButtons.forEach((b) => b.classList.toggle("active", b === button));
      Object.entries(panels).forEach(([name, panel]) => {
        if (panel) panel.hidden = name !== kind;
      });
      input.setAttribute("accept", ACCEPT[kind]);
    });
  });
  input.setAttribute("accept", ACCEPT[kind]);

  /* الصفحة توعد إنك تقدر تفصل الإنترنت وتشتغل عادي — ومرمّز MP3 كان يُنزَّل
     عند الطلب، فلو فصل المستخدم الإنترنت أول ما فتحت الصفحة يفشل التحويل
     ويصير الوعد كذباً. نجيبه من الحين عشان يصير الوعد صحيحاً حرفياً */
  loadLameEncoder().catch(() => {});

  if (quality && qualityOut) {
    quality.addEventListener("input", () => {
      qualityOut.textContent = `${quality.value}%`;
    });
  }

  /* ===== صف النتيجة ===== */
  function addRow(file) {
    const row = document.createElement("div");
    row.className = "conv-row";
    const name = document.createElement("div");
    name.className = "conv-row-name";
    name.textContent = file.name; // textContent لا innerHTML: اسم الملف مدخَل غير موثوق
    const state = document.createElement("div");
    state.className = "conv-row-state";
    state.textContent = "…";
    row.append(name, state);
    results.prepend(row);
    return { row, name, state };
  }

  function fail(parts, message) {
    parts.state.textContent = message;
    parts.row.classList.add("conv-row-error");
  }

  function finish(parts, { outName, blob, beforeSize, meta, thumbUrl }) {
    const url = URL.createObjectURL(blob);
    const { change, label } = changeText(beforeSize, blob.size);
    parts.row.textContent = "";
    parts.row.className = "conv-row";

    if (thumbUrl) {
      const img = document.createElement("img");
      img.className = "conv-thumb";
      img.src = thumbUrl;
      img.alt = "";
      parts.row.append(img);
    }

    const info = document.createElement("div");
    info.className = "conv-row-info";
    const outEl = document.createElement("div");
    outEl.className = "conv-row-name";
    outEl.textContent = outName;
    const metaEl = document.createElement("div");
    metaEl.className = "conv-row-meta";
    metaEl.innerHTML = `${meta ? `<span dir="ltr">${meta}</span> · ` : ""}<span dir="ltr">${formatBytes(
      beforeSize
    )} → ${formatBytes(blob.size)}</span> · <span class="${change > 0 ? "conv-good" : "conv-warn"}">${label}</span>`;
    info.append(outEl, metaEl);

    const link = document.createElement("a");
    link.className = "btn conv-download";
    link.download = outName;
    link.href = url;
    link.textContent = say("⬇️ تحميل", "⬇️ Download");

    parts.row.append(info, link);
  }

  const baseNameOf = (file) => file.name.replace(/\.[^.]+$/, "");
  // H.264 (وMediaRecorder عموماً) يطلب أبعاد فيديو زوجية
  const even = (n) => Math.max(2, Math.round(n / 2) * 2);

  /* BMP ما يدعمه canvas.toBlob بأي متصفح — تنسيقه بسيط جداً (بكسلات خام
     بلا ضغط) فنكتبه يدوياً بنفس أسلوب WAV/MIDI اليدوي بالموقع */
  function canvasToBmpBlob(canvas) {
    const { width, height } = canvas;
    const { data } = canvas.getContext("2d").getImageData(0, 0, width, height);
    const rowSize = Math.ceil((width * 3) / 4) * 4; // كل صف يُحاذى لأربع بايتات
    const pixelArraySize = rowSize * height;
    const buffer = new ArrayBuffer(54 + pixelArraySize);
    const view = new DataView(buffer);

    view.setUint8(0, 0x42); // "B"
    view.setUint8(1, 0x4d); // "M"
    view.setUint32(2, buffer.byteLength, true);
    view.setUint32(10, 54, true); // إزاحة بيانات البكسل
    view.setUint32(14, 40, true); // حجم ترويسة DIB
    view.setInt32(18, width, true);
    view.setInt32(22, height, true);
    view.setUint16(26, 1, true); // مستويات الألوان
    view.setUint16(28, 24, true); // بت لكل بكسل
    view.setUint32(34, pixelArraySize, true);

    const bytes = new Uint8Array(buffer);
    let offset = 54;
    // BMP يخزّن صفوفه من الأسفل للأعلى وبترتيب BGR لا RGB، وبلا شفافية
    for (let y = height - 1; y >= 0; y--) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        bytes[offset++] = data[i + 2];
        bytes[offset++] = data[i + 1];
        bytes[offset++] = data[i];
      }
      offset += rowSize - width * 3;
    }
    return new Blob([buffer], { type: "image/bmp" });
  }

  /* ===== صور ===== */
  async function convertImage(file, parts) {
    if (!file.type.startsWith("image/")) return fail(parts, say("الملف ليس صورة", "Not an image file"));

    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      // مثل HEIC: المتصفح ما يفكّ ترميزه، فنقولها صراحة بدل فشل صامت
      return fail(parts, say("متصفحك ما يقدر يفتح صيغة هذي الصورة", "Your browser can't read this image format"));
    }

    const format = chosen.image;
    const limit = Number(maxWidthInput && maxWidthInput.value) || 0;
    const scale = limit > 0 && bitmap.width > limit ? limit / bitmap.width : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const g = canvas.getContext("2d");
    // JPG وBMP ما يدعمان الشفافية — بدون خلفية بيضاء تطلع المناطق الشفافة
    // سوداء. هذي أكثر مفاجأة تصير بمحوّلات الصور
    if (format === "image/jpeg" || format === "image/bmp") {
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, width, height);
    }
    g.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob =
      format === "image/bmp"
        ? canvasToBmpBlob(canvas)
        : await new Promise((resolve) =>
            canvas.toBlob(resolve, format, format === "image/png" ? undefined : Number(quality.value) / 100)
          );
    if (!blob) return fail(parts, say("تعذّر التحويل", "Conversion failed"));

    const url = URL.createObjectURL(blob);
    finish(parts, {
      outName: `${baseNameOf(file)}.${IMAGE_EXT[format]}`,
      blob,
      beforeSize: file.size,
      meta: `${width}×${height}`,
      thumbUrl: url,
    });
  }

  /* ===== صوت =====
     decodeAudioData يفكّ ما يفكّه المتصفح أصلاً (mp3 و m4a و ogg و wav
     وغيرها)، ويفكّ مسار الصوت من ملف فيديو كذلك — فاستخراج صوت مقطع فيديو
     يمشي بنفس المسار بلا كود إضافي */
  async function convertAudio(file, parts) {
    parts.state.textContent = say("يفكّ ترميز الصوت…", "Decoding audio…");

    const data = await file.arrayBuffer();
    const nativeRate = sniffSampleRate(new Uint8Array(data, 0, Math.min(data.byteLength, 65536)));
    let ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)(nativeRate ? { sampleRate: nativeRate } : undefined);
    } catch {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    let buffer;
    try {
      buffer = await ctx.decodeAudioData(data);
    } catch {
      return fail(
        parts,
        say("متصفحك ما يقدر يفكّ ترميز صوت هذا الملف", "Your browser can't decode this file's audio")
      );
    } finally {
      ctx.close();
    }

    let blob;
    if (chosen.audio === "audio/wav") {
      parts.state.textContent = say("يجهّز WAV…", "Building WAV…");
      await new Promise((r) => setTimeout(r, 0));
      blob = audioBufferToWav(buffer);
    } else {
      const bitrateEl = document.getElementById("convBitrate");
      const kbps = Number(bitrateEl && bitrateEl.value) || 192;
      try {
        blob = await audioBufferToMp3(buffer, kbps, (ratio) => {
          parts.state.textContent = say(
            `يرمّز MP3… ${Math.round(ratio * 100)}%`,
            `Encoding MP3… ${Math.round(ratio * 100)}%`
          );
        });
      } catch {
        return fail(parts, say("تعذّر تحميل مرمّز MP3", "Couldn't load the MP3 encoder"));
      }
    }

    finish(parts, {
      outName: `${baseNameOf(file)}.${chosen.audio === "audio/wav" ? "wav" : "mp3"}`,
      blob,
      beforeSize: file.size,
      meta: `${formatClock(buffer.duration)} · ${buffer.numberOfChannels > 1 ? "stereo" : "mono"} · ${buffer.sampleRate} Hz`,
    });
  }

  /* ===== فيديو =====
     ما فيه ترميز فيديو فوري بالمتصفح بلا مكتبة ضخمة (ffmpeg.wasm ~٢٥ ميغا،
     ويحتاج ترويسات COOP/COEP ما تقدر GitHub Pages تضبطها). البديل الأصلي:
     نعرض الفيديو على كانفس ونسجّل الكانفس + الصوت بـ MediaRecorder — يشتغل
     بلا أي تنزيل إضافي، لكنه بالزمن الحقيقي: مقطع دقيقتين ياخذ دقيقتين.
     ponytail: زمن حقيقي؛ لو صار بطيئاً جداً فالترقية هي WebCodecs + مُغلِّف mp4. */
  function pickVideoType() {
    const wanted = chosen.video;
    const candidates = wanted
      ? [wanted]
      : ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
    return candidates.find((type) => window.MediaRecorder && MediaRecorder.isTypeSupported(type)) || "";
  }

  function queueVideo(file, parts) {
    const mimeType = pickVideoType();
    if (!mimeType) return fail(parts, say("متصفحك ما يدعم تسجيل الفيديو", "Your browser can't record video"));

    // ملف صوت بوضع الفيديو: نصنع له فيديو مربّع بموجات صوت متحركة بدل صورة
    if (file.type.startsWith("audio/")) return queueAudioToVideo(file, parts, mimeType);

    const video = document.createElement("video");
    video.preload = "metadata";
    video.playsInline = true;
    video.src = URL.createObjectURL(file);

    video.addEventListener("error", () =>
      fail(parts, say("متصفحك ما يقدر يفتح هذا الفيديو", "Your browser can't open this video"))
    );

    video.addEventListener("loadedmetadata", () => {
      parts.state.textContent = "";
      const note = document.createElement("span");
      note.className = "conv-video-note";
      // نقول المدة صراحةً قبل ما يبدأ: التحويل بالزمن الحقيقي، والصمت يخلي
      // المستخدم يظن إن الأداة معلّقة
      note.innerHTML = durationNote(video.duration);
      const start = document.createElement("button");
      start.type = "button";
      start.className = "btn conv-start";
      start.textContent = say("▶️ ابدأ التحويل", "▶️ Start conversion");
      start.addEventListener("click", () => {
        start.remove();
        note.remove();
        runVideo(file, parts, video, mimeType);
      });
      parts.state.append(note, start);
    });
  }

  async function runVideo(file, parts, video, mimeType) {
    const progress = document.createElement("div");
    progress.className = "conv-progress";
    const bar = document.createElement("span");
    progress.append(bar);
    const label = document.createElement("span");
    label.className = "conv-video-note";
    parts.state.append(label, progress);

    const limit = Number(videoWidthInput && videoWidthInput.value) || 0;
    const scale = limit > 0 && video.videoWidth > limit ? limit / video.videoWidth : 1;
    const width = even(video.videoWidth * scale);
    const height = even(video.videoHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const g = canvas.getContext("2d");

    const stream = canvas.captureStream(30);
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const mute = muteInput && muteInput.checked;
    if (!mute) {
      try {
        const source = audioCtx.createMediaElementSource(video);
        const dest = audioCtx.createMediaStreamDestination();
        // نوصله بوجهة التسجيل فقط، لا بالسماعات: التحويل يصير بصمت
        source.connect(dest);
        await audioCtx.resume();
        dest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
      } catch {
        // فيديو بلا مسار صوت — نكمل بصورة فقط
      }
    }

    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
    const chunks = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    const done = new Promise((resolve) => {
      recorder.onstop = resolve;
    });

    let drawing = true;
    const draw = () => {
      if (!drawing) return;
      g.drawImage(video, 0, 0, width, height);
      const ratio = video.duration ? video.currentTime / video.duration : 0;
      bar.style.width = `${Math.round(ratio * 100)}%`;
      label.innerHTML = progressLabel(video.currentTime, video.duration);
      // requestVideoFrameCallback يرسم على الإطارات الفعلية لا على تحديث الشاشة
      if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(draw);
      else requestAnimationFrame(draw);
    };

    video.addEventListener("ended", () => {
      drawing = false;
      if (recorder.state !== "inactive") recorder.stop();
    });

    recorder.start();
    try {
      await video.play();
    } catch {
      drawing = false;
      recorder.stop();
      audioCtx.close();
      return fail(parts, say("تعذّر تشغيل الفيديو للتحويل", "Couldn't play the video to convert it"));
    }
    draw();

    await done;
    audioCtx.close();
    URL.revokeObjectURL(video.src);

    const blob = new Blob(chunks, { type: mimeType });
    if (!blob.size) return fail(parts, say("تعذّر التحويل", "Conversion failed"));

    finish(parts, {
      outName: `${baseNameOf(file)}.${mimeType.startsWith("video/mp4") ? "mp4" : "webm"}`,
      blob,
      beforeSize: file.size,
      meta: `${width}×${height} · ${formatClock(video.duration)}`,
    });
  }

  /* ===== صوت إلى فيديو =====
     ما فيه صورة مصدر نعرضها — نرسم مربّعاً بلون الموقع مع موجات صوت متحركة
     (AnalyserNode) واسم الملف، ونسجّله بنفس أسلوب تحويل الفيديو. */
  async function queueAudioToVideo(file, parts, mimeType) {
    parts.state.textContent = say("يفكّ ترميز الصوت…", "Decoding audio…");
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    let buffer;
    try {
      buffer = await ctx.decodeAudioData(await file.arrayBuffer());
    } catch {
      ctx.close();
      return fail(
        parts,
        say("متصفحك ما يقدر يفكّ ترميز صوت هذا الملف", "Your browser can't decode this file's audio")
      );
    }

    parts.state.textContent = "";
    const note = document.createElement("span");
    note.className = "conv-video-note";
    note.innerHTML = durationNote(buffer.duration);
    const start = document.createElement("button");
    start.type = "button";
    start.className = "btn conv-start";
    start.textContent = say("▶️ ابدأ التحويل", "▶️ Start conversion");
    start.addEventListener("click", () => {
      start.remove();
      note.remove();
      runAudioToVideo(file, parts, mimeType, ctx, buffer);
    });
    parts.state.append(note, start);
  }

  async function runAudioToVideo(file, parts, mimeType, ctx, buffer) {
    const progress = document.createElement("div");
    progress.className = "conv-progress";
    const progressFill = document.createElement("span");
    progress.append(progressFill);
    const label = document.createElement("span");
    label.className = "conv-video-note";
    parts.state.append(label, progress);

    // مربّع 1080 الافتراضي (الأنسب لمشاركة اجتماعية) — لا مصدر أبعاد نقيسه
    // عليه أصلاً (المدخل صوت فقط)، فنصغّره فقط لو المستخدم حدّد عرضاً أصغر
    const limit = Number(videoWidthInput && videoWidthInput.value) || 0;
    const size = even(limit > 0 ? Math.min(1080, limit) : 1080);

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const g = canvas.getContext("2d");

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    const freq = new Uint8Array(analyser.frequencyBinCount);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const dest = ctx.createMediaStreamDestination();
    source.connect(analyser);
    analyser.connect(dest);
    // ما نوصلها بالسماعات: التحويل يصير بصمت مثل مسار الفيديو

    const stream = canvas.captureStream(30);
    dest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));

    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
    const chunks = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    const done = new Promise((resolve) => {
      recorder.onstop = resolve;
    });

    const primary = getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim() || "#1f7a4d";
    const title = baseNameOf(file);
    let drawing = true;
    let startedAt = 0;

    const draw = () => {
      if (!drawing) return;
      analyser.getByteFrequencyData(freq);
      g.fillStyle = primary;
      g.fillRect(0, 0, size, size);

      const bars = 40;
      const barWidth = size / bars;
      g.fillStyle = "#ffffff";
      for (let i = 0; i < bars; i++) {
        const v = freq[Math.floor((i / bars) * freq.length)] / 255;
        const h = Math.max(size * 0.02, v * size * 0.32);
        g.fillRect(i * barWidth + barWidth * 0.15, (size - h) / 2, barWidth * 0.7, h);
      }

      g.textAlign = "center";
      g.font = `bold ${Math.round(size * 0.04)}px sans-serif`;
      g.fillText(title, size / 2, size * 0.16);

      const elapsed = ctx.currentTime - startedAt;
      const ratio = buffer.duration ? elapsed / buffer.duration : 0;
      progressFill.style.width = `${Math.min(100, Math.round(ratio * 100))}%`;
      label.innerHTML = progressLabel(elapsed, buffer.duration);
      requestAnimationFrame(draw);
    };

    source.onended = () => {
      drawing = false;
      if (recorder.state !== "inactive") recorder.stop();
    };

    recorder.start();
    startedAt = ctx.currentTime;
    source.start();
    draw();

    await done;
    ctx.close();

    const blob = new Blob(chunks, { type: mimeType });
    if (!blob.size) return fail(parts, say("تعذّر التحويل", "Conversion failed"));

    finish(parts, {
      outName: `${title}.${mimeType.startsWith("video/mp4") ? "mp4" : "webm"}`,
      blob,
      beforeSize: file.size,
      meta: `${size}×${size} · ${formatClock(buffer.duration)}`,
    });
  }

  async function convertFile(file) {
    const parts = addRow(file);
    if (kind === "image") return convertImage(file, parts);
    if (kind === "audio") return convertAudio(file, parts);
    return queueVideo(file, parts);
  }

  async function handleFiles(files) {
    // واحد واحد لا دفعة: الملفات الكبيرة تستهلك ذاكرة كبيرة لو فُكّت كلها معاً
    for (const file of files) await convertFile(file);
  }

  input.addEventListener("change", () => {
    handleFiles([...input.files]);
    input.value = "";
  });

  ["dragenter", "dragover"].forEach((type) =>
    drop.addEventListener(type, (event) => {
      event.preventDefault();
      drop.classList.add("dragging");
    })
  );
  ["dragleave", "drop"].forEach((type) =>
    drop.addEventListener(type, (event) => {
      event.preventDefault();
      drop.classList.remove("dragging");
    })
  );
  drop.addEventListener("drop", (event) => {
    if (event.dataTransfer && event.dataTransfer.files.length) handleFiles([...event.dataTransfer.files]);
  });
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
  const viaKey = { asked: "meat_source_via_asked", instagram: "meat_source_via_instagram", menu: "meat_source_via_menu" }[
    meat.via
  ];
  const parts = [];
  if (viaKey) parts.push(t(viaKey));
  if (meat.checked) parts.push(`${t("meat_source_checked")}: <span dir="ltr">${meat.checked}</span>`);
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
  if (item.detailUrl) {
    const href = window.SITE_LANG === "en" && item.detailUrlEn ? item.detailUrlEn : item.detailUrl;
    return `<a class="btn" href="${href}">📖 ${t("read_details")}</a>`;
  }
  const links = item.links || (item.url ? { website: item.url } : {});
  const orderedKeys = Object.keys(links)
    .filter((key) => links[key])
    .sort((a, b) => LINK_ORDER.indexOf(a) - LINK_ORDER.indexOf(b));
  return orderedKeys
    .map((key, i) => {
      const url = links[key];
      const meta = LINK_META[key] || { icon: "🔗", labelKey: "link_generic" };
      const metaLabel = t(meta.labelKey);
      const cls = i === 0 ? "btn" : "btn secondary";
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
}

/* ===== رسالة تأكيد عابرة (Toast) ===== */
let toastTimer = null;
function showToast(message) {
  let toast = document.getElementById("site-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "site-toast";
    toast.className = "toast";
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
    ${item.image ? `<img class="item-photo" src="${item.image}" alt="${title}" loading="lazy" decoding="async" />` : ""}
    ${item.sponsored ? `<span class="sponsored-badge">${t("sponsored_badge")}</span>` : item.featured ? `<span class="featured-badge">${t("featured_badge")}</span>` : ""}
    <div class="item-body">
      <div class="item-top">
        <span class="item-icon">${item.icon || "⭐"}</span>
        <div class="item-top-actions">
          <button class="like-btn ${liked ? "active" : ""}" data-section="${section}" data-id="${item.id}" title="${t("like_action")}" aria-label="${t("like_action")}">
            <span class="like-icon">${liked ? "♥" : "♡"}</span> <span class="like-count">${likeCount}</span>
          </button>
          <button class="share-btn" title="${t("share_whatsapp")}" aria-label="${t("share_whatsapp")}">📤</button>
          <button class="fav-btn ${fav ? "active" : ""}" title="${fav ? t("fav_remove") : t("fav_add")}" aria-label="${fav ? t("fav_remove") : t("fav_add")}">
            ${fav ? "♥" : "♡"}
          </button>
        </div>
      </div>
      <h3>${title}${item.verified ? ` <span class="verified-badge" title="${t("verified_badge")}">${t("verified_badge")}</span>` : ""}${item.liked ? ` <span class="liked-badge" title="${t("liked_badge")}">${t("liked_badge")}</span>` : ""}</h3>
      <p class="item-desc${isLongDesc ? " clamped" : ""}">${desc}</p>
      ${isLongDesc ? `<button class="desc-toggle" aria-expanded="false">${t("read_more")}</button>` : ""}
      <div class="item-meta">
        ${item.isNew ? `<span class="tag new-tag">${t("new_badge")}</span>` : ""}
        ${distanceKm !== null ? `<span class="tag distance-tag">📍 ${formatDistance(distanceKm)}${branchLabel ? ` — ${t("nearest_branch")} ${branchLabel}` : ""}</span>` : ""}
        ${(item.tags || []).map((tag) => `<span class="tag">${tagIcon(tag) ? `<span class="tag-icon">${tagIcon(tag)}</span>` : ""}${tagLabel(tag)}</span>`).join("")}
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
    favBtn.classList.remove("pop");
    void favBtn.offsetWidth;
    favBtn.classList.add("pop");
    playClickSound();
  });

  const shareBtn = card.querySelector(".share-btn");
  shareBtn.addEventListener("click", () => {
    const text = buildShareText(section, item);
    const subtitle = (item.tags || []).map((tag) => tagLabel(tag)).join(" · ");
    shareText(text, { section, item_name: itemTitle(item) }, {
      icon: item.icon,
      title,
      subtitle,
      photo: item.image,
    });
    playClickSound();
  });

  card.querySelectorAll(".phone-copy-btn").forEach((phoneBtn) => {
    phoneBtn.addEventListener("click", async () => {
      const phone = phoneBtn.dataset.phone;
      try {
        await navigator.clipboard.writeText(phone);
      } catch {
        showToast(`${t("phone_copy_failed")} ${phone}`);
        return;
      }
      showToast(t("phone_copied"));
      playClickSound();
    });
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
      playClickSound();
    });
  }

  return card;
}

/* ===== تتبّع الأقسام اللي تصفّحها الزائر (محلياً، بدون تسجيل دخول) — يغذّي
   مؤشر "استكشفت X من Y قسم" بالرئيسية (مبدأ Zeigarnik: العقل ما ينسى الشي الناقص) ===== */
const EXPLORED_KEY = "site_explored_sections_v1";

function getExploredSections() {
  try {
    return JSON.parse(localStorage.getItem(EXPLORED_KEY)) || {};
  } catch {
    return {};
  }
}

function markSectionExplored(section) {
  const explored = getExploredSections();
  if (explored[section]) return;
  explored[section] = true;
  localStorage.setItem(EXPLORED_KEY, JSON.stringify(explored));
}

/* ===== عرض قسم كامل: بحث + فلاتر + شبكة بطاقات =====
   typeFilter (اختياري): يقصر القسم على عناصر تاجها يحتوي هالقيمة — تستخدمه
   صفحة نوع محل السيارات (car-shop-type.njk) عشان تعرض غسيل بس مثلاً، بدل
   كل محلات السيارات. التاج نفسه يُستبعد من رقاقات الفلتر لأنه بديهي بالفعل. */
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
    ? data.items.filter((item) => (item.tags || []).includes(typeFilter))
    : data.items;

  // بناء الفلاتر من التاجات المتوفرة
  const allTags = new Set();
  items.forEach((item) =>
    (item.tags || []).forEach((t) => {
      if (t !== typeFilter) allTags.add(t);
    })
  );

  let activeTag = "all";
  let filtersExpanded = false;
  const FILTER_CHIP_LIMIT = 10;
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
      activeTag = "all";
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
        activeTag = tag;
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
      const isActive = chip.dataset.tag === activeTag;
      chip.classList.toggle("active", isActive);
      chip.setAttribute("aria-pressed", String(isActive));
    });
  }

  function renderGrid() {
    const query = (searchInput?.value || "").trim();
    grid.innerHTML = "";

    const filtered = items.filter((item) => {
      const matchesTag = activeTag === "all" || (item.tags || []).includes(activeTag);
      const haystack = item.title + " " + (item.desc || "") + " " + (item.tags || []).join(" ");
      const matchesQuery = fuzzyIncludes(haystack, query);
      return matchesTag && matchesQuery;
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
        : ranked.sort((a, b) => pinRank(b.item) - pinRank(a.item));

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

  if (nearMeBtn) {
    nearMeBtn.addEventListener("click", () => {
      if (sortByDistance) {
        sortByDistance = false;
        nearMeBtn.classList.remove("active");
        nearMeBtn.setAttribute("aria-pressed", "false");
        nearMeBtn.textContent = t("near_me");
        renderGrid();
        playClickSound();
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
          playClickSound();
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
        <p>لم تُضِف أي عنصر إلى المفضلة بعد.<br>تصفّح الأقسام واضغط على أيقونة القلب لحفظ ما يعجبك.</p>
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
  if (!config || !config.workerUrl) return;

  let weekCounts;
  try {
    const res = await fetch(`${config.workerUrl}/likes/week`);
    weekCounts = await res.json();
  } catch {
    return;
  }

  const ranked = Object.entries(weekCounts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

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
  });
}

/* ===== رقم حقيقي بالهيرو (الصفحة الرئيسية) — عدد العناصر الفعلي بكل
   الأقسام، محسوب من SITE_DATA (المولَّد من ملفات src/<section>/*.md وقت
   البناء) لا رقم مكتوب يدوياً — فيتحدّث تلقائياً كل ما أضفنا محل جديد بدون
   الحاجة نعدّل أي نص بالموقع ===== */
function renderSiteStats() {
  const el = document.getElementById("siteStatsLine");
  if (!el) return;

  const total = Object.values(SITE_DATA).reduce((sum, section) => sum + (section.items || []).length, 0);
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

  const registration = await navigator.serviceWorker.register("/hakolah/sw.js");
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
        playClickSound();
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

      await fetch(`${config.workerUrl}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });

      apply(true);
      showToast(t("push_enabled"));
      playClickSound();
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
function openPickerReveal(item, { onRetry, onClose } = {}) {
  const overlay = document.createElement("div");
  overlay.className = "picker-reveal-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";

  function close() {
    overlay.remove();
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKeydown);
    onClose?.();
  }
  function onKeydown(e) {
    if (e.key === "Escape") close();
  }
  document.addEventListener("keydown", onKeydown);

  const closeBtn = document.createElement("button");
  closeBtn.className = "btn secondary picker-reveal-close";
  closeBtn.textContent = "✕";
  closeBtn.setAttribute("aria-label", t("daily_pick_close"));
  closeBtn.addEventListener("click", () => {
    playClickSound();
    close();
  });
  overlay.appendChild(closeBtn);

  const burst = document.createElement("div");
  burst.className = "picker-burst";
  overlay.appendChild(burst);

  burstPieces(item, burst, () => {
    const actions = document.createElement("div");
    actions.className = "picker-reveal-actions";
    actions.innerHTML = buildActionsHtml(item);
    overlay.appendChild(actions);

    actions.querySelectorAll(".phone-copy-btn").forEach((phoneBtn) => {
      phoneBtn.addEventListener("click", async () => {
        const phone = phoneBtn.dataset.phone;
        try {
          await navigator.clipboard.writeText(phone);
        } catch {
          showToast(`${t("phone_copy_failed")} ${phone}`);
          return;
        }
        showToast(t("phone_copied"));
        playClickSound();
      });
    });

    const retryBtn = document.createElement("button");
    retryBtn.className = "btn picker-retry-btn";
    retryBtn.textContent = t("try_again");
    retryBtn.addEventListener("click", () => {
      playClickSound();
      close();
      onRetry?.();
    });
    overlay.appendChild(retryBtn);

    spawnConfetti(overlay);
    playSuccessSound();
  });
}

/* قطع المعلومات نفسها تقفز من زاوية عشوائية بحركة مرنة داخل container،
   وتستدعي onDone بعد ما تستقر كلها */
function burstPieces(item, container, onDone) {
  const pieces = [];

  const titleEl = document.createElement("div");
  titleEl.className = "burst-title";
  titleEl.textContent = `${item.icon || "⭐"} ${itemTitle(item)}`;
  pieces.push(titleEl);

  if (item.image) {
    const photoEl = document.createElement("img");
    photoEl.className = "burst-photo";
    photoEl.src = item.image;
    photoEl.alt = "";
    photoEl.loading = "lazy";
    pieces.push(photoEl);
  }

  if (item.links?.phone) {
    const chip = document.createElement("span");
    chip.className = "burst-chip";
    chip.textContent = `📞 ${item.links.phone}`;
    pieces.push(chip);
  }

  if (item.links?.maps) {
    const chip = document.createElement("span");
    chip.className = "burst-chip";
    chip.textContent = `📍 ${t("link_maps")}`;
    pieces.push(chip);
  }

  (item.tags || []).slice(0, 4).forEach((tag) => {
    const chip = document.createElement("span");
    chip.className = "burst-chip";
    chip.textContent = `${tagIcon(tag) ? tagIcon(tag) + " " : ""}${tagLabel(tag)}`;
    pieces.push(chip);
  });

  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  pieces.forEach((el, i) => {
    const angle = Math.random() * Math.PI * 2;
    const dist = 200 + Math.random() * 260;
    el.style.setProperty("--x", `${Math.cos(angle) * dist}px`);
    el.style.setProperty("--y", `${Math.sin(angle) * dist}px`);
    el.style.setProperty("--rot", `${(Math.random() - 0.5) * 70}deg`);
    el.style.setProperty("--delay", `${i * 100}ms`);
    el.classList.add("burst-piece");
    container.appendChild(el);
  });

  const totalMs = reduceMotion ? 0 : pieces.length * 100 + 700 + 400;
  setTimeout(onDone, totalMs);
}

function spawnConfetti(container) {
  const emojis = ["🎉", "✨", "⭐", "💫", "🎊"];
  for (let i = 0; i < 14; i++) {
    const el = document.createElement("span");
    el.className = "confetti-piece";
    el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    el.style.setProperty("--x", `${(Math.random() - 0.5) * 240}px`);
    el.style.setProperty("--rot", `${(Math.random() - 0.5) * 360}deg`);
    el.style.animationDelay = `${Math.random() * 0.15}s`;
    container.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
  }
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
      shareText(text, { section: "plan" }, {
        icon: "🗓️",
        title: t("plan_title"),
        subtitle: current.map((s) => itemTitle(s.item)).join(" · "),
      });
      playClickSound();
    });
  }

  draw();
}

function initRandomPicker() {
  const categoriesWrap = document.getElementById("pickerCategories");
  const spinBtn = document.getElementById("pickerSpinBtn");
  const stage = document.getElementById("pickerStage");
  if (!categoriesWrap || !spinBtn || !stage) return;

  const sectionKeys = Object.keys(SITE_DATA).filter(
    (key) => (SITE_DATA[key].items || []).length > 0
  );
  let selectedSection = null;

  categoriesWrap.innerHTML = sectionKeys
    .map(
      (key) => `
      <button class="picker-category" data-section="${key}" aria-pressed="false">
        <span class="picker-category-icon">${SITE_DATA[key].icon}</span>
        <span>${sectionLabel(key)}</span>
      </button>`
    )
    .join("");

  categoriesWrap.querySelectorAll(".picker-category").forEach((btn) => {
    btn.addEventListener("click", () => {
      categoriesWrap.querySelectorAll(".picker-category").forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
      selectedSection = btn.dataset.section;
      spinBtn.disabled = false;
      stage.innerHTML = "";
      playClickSound();
    });
  });

  function reveal(item) {
    stage.innerHTML = "";
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
    stage.innerHTML = `<div class="picker-slot" id="pickerSlot"></div>`;
    const slot = document.getElementById("pickerSlot");

    const finalItem = items[Math.floor(Math.random() * items.length)];
    const startTime = Date.now();
    const duration = 1800;
    let delay = 60;

    function tick() {
      const randomItem = items[Math.floor(Math.random() * items.length)];
      slot.innerHTML = `<span class="picker-slot-icon">${randomItem.icon || "⭐"}</span><span class="picker-slot-title">${itemTitle(randomItem)}</span>`;
      slot.classList.remove("pulse");
      void slot.offsetWidth;
      slot.classList.add("pulse");

      const elapsed = Date.now() - startTime;
      if (elapsed >= duration) {
        reveal(finalItem);
        return;
      }
      delay = Math.min(delay * 1.15, 350);
      setTimeout(tick, delay);
    }

    tick();
  }

  spinBtn.addEventListener("click", () => {
    playClickSound();
    spin();
  });
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
  initAutoUpdateCheck();
  initContactForm();
  fetchLikeCounts();
  initOutboundTracking();
  initArticleShare();
  initBeepMelodyExperiment();
  initFileConverter();

  // تسجيل الـ service worker بكل صفحة (لا بس الرئيسية) — شرط أساسي لصلاحية
  // "إضافة للشاشة الرئيسية" (PWA) بمعظم المتصفحات. التسجيل بدوال initPushNotifications
  // يبقى منفصل وآمن (register() على نفس الرابط يرجّع نفس التسجيل، ما يكرره)
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/hakolah/sw.js");

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
