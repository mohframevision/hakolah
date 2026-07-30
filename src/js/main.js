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
        showMessage("success", "✅ تم إرسال رسالتك بنجاح! بنرد عليك أقرب وقت ممكن.");
        form.reset();
      } else {
        showMessage("error", "❌ عذراً، صار خطأ أثناء الإرسال. حاول مرة ثانية أو راسلنا مباشرة بالإيميل.");
      }
    } catch (err) {
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
    btn.textContent = ICONS[pref];
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

/* ===== قائمة الجوال ===== */
function initNavToggle() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".main-nav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", () => {
    nav.classList.toggle("open");
    toggle.classList.toggle("open");
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
    } catch (e) {
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
  } catch (e) {
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
  card.dataset.title = item.title.toLowerCase();
  card.dataset.desc = (item.desc || "").toLowerCase();
  card.dataset.tags = (item.tags || []).join(",").toLowerCase();

  const fav = isFavorite(section, item.id);

  card.innerHTML = `
    <div class="item-top">
      <span class="item-icon">${item.icon || "⭐"}</span>
      <button class="fav-btn ${fav ? "active" : ""}" title="إضافة للمفضلة" aria-label="إضافة للمفضلة">
        ${fav ? "♥" : "♡"}
      </button>
    </div>
    <h3>${item.title}</h3>
    <p class="item-desc">${item.desc || ""}</p>
    <div class="item-meta">
      ${(item.tags || []).map((t) => `<span class="tag">${t}</span>`).join("")}
    </div>
    <div class="item-actions">
      ${buildActionsHtml(item)}
    </div>
  `;

  const favBtn = card.querySelector(".fav-btn");
  favBtn.addEventListener("click", () => {
    const nowFav = toggleFavorite(section, item.id);
    favBtn.classList.toggle("active", nowFav);
    favBtn.textContent = nowFav ? "♥" : "♡";
    favBtn.classList.remove("pop");
    void favBtn.offsetWidth;
    favBtn.classList.add("pop");
  });

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
      chip.classList.toggle("active", isAll ? activeTag === "all" : chip.textContent === activeTag);
    });
  }

  function renderGrid() {
    const query = (searchInput?.value || "").trim().toLowerCase();
    grid.innerHTML = "";

    const filtered = data.items.filter((item) => {
      const matchesTag = activeTag === "all" || (item.tags || []).includes(activeTag);
      const haystack = (item.title + " " + (item.desc || "") + " " + (item.tags || []).join(" ")).toLowerCase();
      const matchesQuery = !query || haystack.includes(query);
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

  collected.forEach(({ section, item }, index) => grid.appendChild(buildItemCard(section, item, index)));
}

document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  initNavToggle();
  initHeaderScroll();
  initAutoUpdateCheck();
  initContactForm();
});
