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
      showMessage("error", "❌ يرجى إدخال اسم صحيح (على الأقل حرفين).");
      name.focus();
      return false;
    }
    if (email && !emailRegex.test(email.value.trim())) {
      showMessage("error", "❌ يرجى إدخال بريد إلكتروني صحيح.");
      email.focus();
      return false;
    }
    if (message && message.value.trim().length < 5) {
      showMessage("error", "❌ يرجى كتابة رسالة أطول.");
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
        showMessage("success", "✅ تم إرسال رسالتك بنجاح! بنرد عليك بأقرب وقت ممكن.");
        form.reset();
      } else {
        showMessage(
          "error",
          "❌ عذراً، صار خطأ أثناء الإرسال. حاول مرة ثانية أو راسلنا مباشرة بالإيميل."
        );
      }
    } catch {
      showMessage("error", "❌ عذراً، صار خطأ بالاتصال. تأكد من الإنترنت وحاول مرة ثانية.");
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
    btn.setAttribute("aria-label", enabled ? "إيقاف المؤثرات الصوتية" : "تفعيل المؤثرات الصوتية");
    btn.title = enabled
      ? "المؤثرات الصوتية: مفعّلة — اضغط للإيقاف"
      : "المؤثرات الصوتية: متوقفة — اضغط للتفعيل";
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
  const SHORT_LABELS = { auto: "تلقائي", light: "نهاري", dark: "ليلي" };
  const LABELS = { auto: "تلقائي (يتبع النظام)", light: "فاتح", dark: "داكن" };
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
    btn.textContent = `${ICONS[pref]} ${SHORT_LABELS[pref]}`;
    btn.title = `المظهر الحالي: ${LABELS[pref]} — اضغط للتبديل`;
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

/* ===== قائمة الجوال ===== */
function initNavToggle() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".main-nav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    toggle.classList.toggle("open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "إغلاق القائمة" : "فتح القائمة");
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
  iconEl.textContent = alreadyLiked ? "🤍" : "❤️";
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
    const data = await res.json();
    if (typeof data.count === "number") {
      LIKE_COUNTS[key] = data.count;
      countEl.textContent = data.count;
    }
  } catch {
    // نتجاهل فشل الشبكة بصمت — الحالة المحلية (optimistic) تبقى كما هي
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
  website: { icon: "🌐", label: "زيارة" },
  phone: { icon: "📞", label: "رقم الهاتف" },
  maps: { icon: "📍", label: "الخريطة" },
  instagram: { icon: "📷", label: "إنستقرام" },
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
  return km < 1 ? `${Math.round(km * 1000)} م` : `${km.toFixed(1)} كم`;
}

/* ===== مشاركة عبر واتساب ===== */
const SITE_ORIGIN = "https://mohframevision.github.io/hakolah/";

function buildShareUrl(section, item) {
  const relPath = item.detailUrl || `${section}.html?q=${encodeURIComponent(item.title)}`;
  return SITE_ORIGIN + relPath;
}

function buildShareText(section, item) {
  const url = buildShareUrl(section, item);
  return `${item.title} — على موقع هكوله 👇\n${url}`;
}

function buildActionsHtml(item) {
  if (item.detailUrl) {
    return `<a class="btn" href="${item.detailUrl}">📖 اقرأ التفاصيل</a>`;
  }
  const links = item.links || (item.url ? { website: item.url } : {});
  const orderedKeys = Object.keys(links)
    .filter((key) => links[key])
    .sort((a, b) => LINK_ORDER.indexOf(a) - LINK_ORDER.indexOf(b));
  return orderedKeys
    .map((key, i) => {
      const url = links[key];
      const meta = LINK_META[key] || { icon: "🔗", label: "رابط" };
      const cls = i === 0 ? "btn" : "btn secondary";
      if (key === "phone") {
        return `<button type="button" class="${cls} phone-copy-btn" data-phone="${url}">${meta.icon} ${meta.label}</button>`;
      }
      const label = key === "website" && item.cta ? item.cta : meta.label;
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

/* ===== بناء بطاقة عنصر واحدة ===== */
function buildItemCard(section, item, index = 0, distanceKm = null) {
  const card = document.createElement("div");
  card.className = item.featured ? "item-card featured" : "item-card";
  card.style.animationDelay = `${Math.min(index, 10) * 45}ms`;

  const fav = isFavorite(section, item.id);
  const liked = isLikedByMe(section, item.id);
  const likeCount = LIKE_COUNTS[`${section}:${item.id}`] || 0;
  const desc = item.desc || "";
  const isLongDesc = desc.length > 100;

  card.innerHTML = `
    ${item.image ? `<img class="item-photo" src="${item.image}" alt="${item.title}" loading="lazy" decoding="async" />` : ""}
    ${item.featured ? `<span class="featured-badge">⭐ مميز</span>` : ""}
    <div class="item-body">
      <div class="item-top">
        <span class="item-icon">${item.icon || "⭐"}</span>
        <div class="item-top-actions">
          <button class="like-btn ${liked ? "active" : ""}" data-section="${section}" data-id="${item.id}" title="أعجبني" aria-label="أعجبني">
            <span class="like-icon">${liked ? "❤️" : "🤍"}</span> <span class="like-count">${likeCount}</span>
          </button>
          <button class="share-btn" title="مشاركة عبر واتساب" aria-label="مشاركة عبر واتساب">📤</button>
          <button class="fav-btn ${fav ? "active" : ""}" title="${fav ? "إزالة من المفضلة" : "إضافة للمفضلة"}" aria-label="${fav ? "إزالة من المفضلة" : "إضافة للمفضلة"}">
            ${fav ? "♥" : "♡"}
          </button>
        </div>
      </div>
      <h3>${item.title}${item.verified ? ` <span class="verified-badge" title="صاحب الموقع زار هذا المكان شخصياً">✅ زُرته شخصياً</span>` : ""}${item.liked ? ` <span class="liked-badge" title="توصية شخصية من صاحب الموقع">👍 أعجبني</span>` : ""}</h3>
      <p class="item-desc${isLongDesc ? " clamped" : ""}">${desc}</p>
      ${isLongDesc ? `<button class="desc-toggle" aria-expanded="false">اقرأ المزيد</button>` : ""}
      <div class="item-meta">
        ${item.isNew ? `<span class="tag new-tag">🆕 جديد</span>` : ""}
        ${distanceKm !== null ? `<span class="tag distance-tag">📍 ${formatDistance(distanceKm)}</span>` : ""}
        ${(item.tags || []).map((t) => `<span class="tag">${t}</span>`).join("")}
      </div>
      <div class="item-actions">
        ${buildActionsHtml(item)}
      </div>
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
    const label = nowFav ? "إزالة من المفضلة" : "إضافة للمفضلة";
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
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    playClickSound();
  });

  const phoneBtn = card.querySelector(".phone-copy-btn");
  if (phoneBtn) {
    phoneBtn.addEventListener("click", async () => {
      const phone = phoneBtn.dataset.phone;
      try {
        await navigator.clipboard.writeText(phone);
      } catch {
        showToast("تعذّر نسخ الرقم، انسخه يدوياً: " + phone);
        return;
      }
      showToast("تم نسخ رقم الهاتف");
      playClickSound();
    });
  }

  const descToggle = card.querySelector(".desc-toggle");
  if (descToggle) {
    const descEl = card.querySelector(".item-desc");
    descToggle.addEventListener("click", () => {
      const expanded = descEl.classList.toggle("clamped") === false;
      descToggle.textContent = expanded ? "اقرأ أقل" : "اقرأ المزيد";
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

/* ===== عرض قسم كامل: بحث + فلاتر + شبكة بطاقات ===== */
function renderSection(section) {
  const data = SITE_DATA[section];
  if (!data) return;

  const grid = document.querySelector(".card-grid");
  const searchInput = document.querySelector(".search-box");
  const filtersWrap = document.querySelector(".filters");
  const nearMeBtn = document.querySelector(".near-me-btn");

  if (!grid) return;

  // بناء الفلاتر من التاجات المتوفرة
  const allTags = new Set();
  data.items.forEach((item) => (item.tags || []).forEach((t) => allTags.add(t)));

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
    allChip.textContent = "الكل";
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
      chip.textContent = tag;
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
        ? "عرض أقل ▲"
        : `عرض المزيد (+${tagsList.length - FILTER_CHIP_LIMIT}) ▼`;
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
      const isAll = chip.textContent === "الكل";
      const isActive = isAll ? activeTag === "all" : chip.textContent === activeTag;
      chip.classList.toggle("active", isActive);
      chip.setAttribute("aria-pressed", String(isActive));
    });
  }

  function renderGrid() {
    const query = (searchInput?.value || "").trim();
    grid.innerHTML = "";

    const filtered = data.items.filter((item) => {
      const matchesTag = activeTag === "all" || (item.tags || []).includes(activeTag);
      const haystack = item.title + " " + (item.desc || "") + " " + (item.tags || []).join(" ");
      const matchesQuery = fuzzyIncludes(haystack, query);
      return matchesTag && matchesQuery;
    });

    let ranked = filtered.map((item) => ({
      item,
      distanceKm:
        sortByDistance && userCoords && item.lat != null && item.lng != null
          ? haversineKm(userCoords.lat, userCoords.lng, item.lat, item.lng)
          : null,
    }));

    ranked =
      sortByDistance && userCoords
        ? ranked.sort((a, b) => {
            if (a.distanceKm === null && b.distanceKm === null) return 0;
            if (a.distanceKm === null) return 1;
            if (b.distanceKm === null) return -1;
            return a.distanceKm - b.distanceKm;
          })
        : ranked.sort((a, b) => Number(Boolean(b.item.featured)) - Number(Boolean(a.item.featured)));

    if (ranked.length === 0) {
      const isSectionEmpty = data.items.length === 0;
      grid.innerHTML = isSectionEmpty
        ? `
        <div class="empty-state" style="grid-column: 1/-1;">
          <span class="icon">🧭</span>
          <p>ما فيه عناصر بهذا القسم بعد — ترقّبنا قريباً!</p>
        </div>
      `
        : `
        <div class="empty-state" style="grid-column: 1/-1;">
          <span class="icon">🔍</span>
          <p>لا توجد نتائج مطابقة لبحثك.</p>
        </div>
      `;
      return;
    }

    ranked.forEach(({ item, distanceKm }, index) =>
      grid.appendChild(buildItemCard(section, item, index, distanceKm))
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
        nearMeBtn.textContent = "📍 الأقرب مني";
        renderGrid();
        playClickSound();
        return;
      }
      if (!navigator.geolocation) {
        showToast("متصفحك ما يدعم تحديد الموقع");
        return;
      }
      nearMeBtn.textContent = "⏳ جاري تحديد موقعك…";
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          sortByDistance = true;
          nearMeBtn.classList.add("active");
          nearMeBtn.setAttribute("aria-pressed", "true");
          nearMeBtn.textContent = "📍 الأقرب مني ✕";
          renderGrid();
          playClickSound();
        },
        () => {
          showToast("تعذّر الوصول لموقعك — تأكد من تفعيل صلاحية الموقع بالمتصفح");
          nearMeBtn.textContent = "📍 الأقرب مني";
        },
        { enableHighAccuracy: false, timeout: 10000 }
      );
    });
  }

  renderFilters();
  renderGrid();

  if (searchInput) {
    searchInput.addEventListener("input", renderGrid);
    searchInput.addEventListener("input", () => {
      checkVisitSecretCode(searchInput.value, searchInput, renderGrid);
    });
    initSearchSuggestions(searchInput, data.items, renderGrid);
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
      <div class="empty-state" style="grid-column: 1/-1;">
        <span class="icon">🤍</span>
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
  const container = document.getElementById("featuredPick");
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
        <p>ترقّبنا قريباً!</p>
      </div>
    `;
    return;
  }

  const daysSinceEpoch = Math.floor(Date.now() / 86400000);
  const { section, item } = allItems[daysSinceEpoch % allItems.length];

  container.innerHTML = "";
  container.appendChild(buildItemCard(section, item, 0));
}

/* ===== عدّاد زيارات بسيط (خاص بنا فقط، نفس Cloudflare Worker حق الإشعارات) =====
   يعد كل تحميل صفحة بصمت، ويظهر الرقم بس لمن يكتب كود سري بصندوق البحث —
   عمداً غير ظاهر لعامة الزوار لأن الأرقام لسا صغيرة بمرحلة الموقع الحالية. */
function trackVisit() {
  const config = window.PUSH_CONFIG;
  if (!config || !config.workerUrl) return;
  fetch(`${config.workerUrl}/track`, { keepalive: true }).catch(() => {});
}

const VISIT_SECRET_CODE = "2005 moo";

async function checkVisitSecretCode(value, searchInput, onReset) {
  if (value.trim().toLowerCase() !== VISIT_SECRET_CODE) return;
  const config = window.PUSH_CONFIG;
  searchInput.value = "";
  onReset();
  if (!config || !config.workerUrl) return;
  try {
    const res = await fetch(`${config.workerUrl}/stats`);
    const data = await res.json();
    showToast(`👀 زيارات اليوم: ${data.today} — الإجمالي: ${data.total}`);
  } catch {
    showToast("تعذّر جلب الإحصائيات");
  }
}

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

  btn.style.display = "";

  const registration = await navigator.serviceWorker.register("/hakolah/sw.js");
  let subscription = await registration.pushManager.getSubscription();

  function apply(subscribed) {
    btn.classList.toggle("active", subscribed);
    btn.textContent = subscribed ? "🔔 الإشعارات مفعّلة" : "🔕 نبّهني كل يوم";
  }
  apply(Boolean(subscription));

  btn.addEventListener("click", async () => {
    if (subscription) {
      await fetch(`${config.workerUrl}/unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      await subscription.unsubscribe();
      subscription = null;
      apply(false);
      showToast("تم إيقاف الإشعارات");
      playClickSound();
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      showToast("لازم توافق على الإذن من إعدادات المتصفح");
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
    showToast("تفعّلت الإشعارات — بنذكّرك بـ اختيار اليوم");
    playClickSound();
  });
}

/* ===== اختار لي: اختيار عشوائي من أي قسم بأنيميشن سلوت مشين ===== */
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
        <span>${SITE_DATA[key].title}</span>
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
    const card = buildItemCard(selectedSection, item, 0);
    card.classList.add("picker-result");
    stage.appendChild(card);
    spawnConfetti(stage);
    playSuccessSound();

    const retryBtn = document.createElement("button");
    retryBtn.className = "btn secondary picker-retry-btn";
    retryBtn.textContent = "🔄 جرّب مرة ثانية";
    retryBtn.addEventListener("click", () => {
      playClickSound();
      spin();
    });
    stage.appendChild(retryBtn);

    spinBtn.disabled = false;
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
      slot.innerHTML = `<span class="picker-slot-icon">${randomItem.icon || "⭐"}</span><span class="picker-slot-title">${randomItem.title}</span>`;
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

document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  initSoundToggle();
  initCookieConsent();
  initNavToggle();
  initHeaderScroll();
  initAutoUpdateCheck();
  initContactForm();
  trackVisit();
  fetchLikeCounts();
});
