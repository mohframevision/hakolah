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
  maps: { icon: "📍", label: "الموقع" },
  instagram: { icon: "📷", label: "إنستقرام" },
  menu: { icon: "📋", label: "القائمة" },
};

function buildActionsHtml(item) {
  if (item.detailUrl) {
    return `<a class="btn" href="${item.detailUrl}">📖 اقرأ التفاصيل</a>`;
  }
  const links = item.links || (item.url ? { website: item.url } : {});
  return Object.entries(links)
    .map(([key, url], i) => {
      const meta = LINK_META[key] || { icon: "🔗", label: "رابط" };
      const label = key === "website" && item.cta ? item.cta : meta.label;
      const cls = i === 0 ? "btn" : "btn secondary";
      return `<a class="${cls}" href="${url}" target="_blank" rel="noopener noreferrer">${meta.icon} ${label}</a>`;
    })
    .join("");
}

/* ===== بناء بطاقة عنصر واحدة ===== */
function buildItemCard(section, item, index = 0) {
  const card = document.createElement("div");
  card.className = "item-card";
  card.style.animationDelay = `${Math.min(index, 10) * 45}ms`;

  const fav = isFavorite(section, item.id);
  const desc = item.desc || "";
  const isLongDesc = desc.length > 100;

  card.innerHTML = `
    ${item.image ? `<img class="item-photo" src="${item.image}" alt="${item.title}" loading="lazy" decoding="async" />` : ""}
    <div class="item-body">
      <div class="item-top">
        <span class="item-icon">${item.icon || "⭐"}</span>
        <button class="fav-btn ${fav ? "active" : ""}" title="${fav ? "إزالة من المفضلة" : "إضافة للمفضلة"}" aria-label="${fav ? "إزالة من المفضلة" : "إضافة للمفضلة"}">
          ${fav ? "♥" : "♡"}
        </button>
      </div>
      <h3>${item.title}</h3>
      <p class="item-desc${isLongDesc ? " clamped" : ""}">${desc}</p>
      ${isLongDesc ? `<button class="desc-toggle" aria-expanded="false">اقرأ المزيد</button>` : ""}
      <div class="item-meta">
        ${(item.tags || []).map((t) => `<span class="tag">${t}</span>`).join("")}
      </div>
      <div class="item-actions">
        ${buildActionsHtml(item)}
      </div>
    </div>
  `;

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
  });

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

  if (!grid) return;

  // بناء الفلاتر من التاجات المتوفرة
  const allTags = new Set();
  data.items.forEach((item) => (item.tags || []).forEach((t) => allTags.add(t)));

  let activeTag = "all";

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
    });
    filtersWrap.appendChild(allChip);

    allTags.forEach((tag) => {
      const chip = document.createElement("button");
      chip.className = "filter-chip";
      chip.textContent = tag;
      chip.setAttribute("aria-pressed", "false");
      chip.addEventListener("click", () => {
        activeTag = tag;
        updateActiveChip();
        renderGrid();
      });
      filtersWrap.appendChild(chip);
    });
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

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1;">
          <span class="icon">🔍</span>
          <p>لا توجد نتائج مطابقة لبحثك.</p>
        </div>
      `;
      return;
    }

    filtered.forEach((item, index) => grid.appendChild(buildItemCard(section, item, index)));
  }

  renderFilters();
  renderGrid();

  if (searchInput) {
    searchInput.addEventListener("input", renderGrid);
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
    });
  });

  function reveal(item) {
    stage.innerHTML = "";
    const card = buildItemCard(selectedSection, item, 0);
    card.classList.add("picker-result");
    stage.appendChild(card);
    spawnConfetti(stage);

    const retryBtn = document.createElement("button");
    retryBtn.className = "btn secondary picker-retry-btn";
    retryBtn.textContent = "🔄 جرّب مرة ثانية";
    retryBtn.addEventListener("click", () => spin());
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

  spinBtn.addEventListener("click", spin);
}

document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  initCookieConsent();
  initNavToggle();
  initHeaderScroll();
  initAutoUpdateCheck();
  initContactForm();
});
