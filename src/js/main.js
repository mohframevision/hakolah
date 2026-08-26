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
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".main-nav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    toggle.classList.toggle("open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? t("nav_toggle_close") : t("nav_toggle_open"));
    playClickSound();
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
      const res = await fetch(`version.json?_=${Date.now()}`, { cache: "no-store" });
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
    shareText(text, { section: (window.PAGE || {}).section || "" });
    playClickSound();
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

/* ===== مشاركة عبر نظام المشاركة الأصلي بالجهاز (Web Share API) — يفتح نفس
   قائمة المشاركة اللي تشوفها بإنستقرام (واتساب، رسائل، تلغرام، نسخ رابط...)
   بدل ما يفتح واتساب دايماً بشكل مباشر. المتصفحات اللي ما تدعمها (أغلب
   أجهزة الحاسوب) ترجع تلقائياً لفتح واتساب كما كانت الحال قبل */
function shareText(text, trackParams) {
  if (navigator.share) {
    navigator
      .share({ text })
      .then(() => trackEdge("share", { method: "system", ...trackParams }))
      .catch(() => {}); // المستخدم ألغى المشاركة — سلوك طبيعي، لا خطأ يُسجَّل
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    trackEdge("share", { method: "whatsapp", ...trackParams });
  }
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
    shareText(text, { section, item_name: itemTitle(item) });
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
      shareText(text, { section: "plan" });
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
