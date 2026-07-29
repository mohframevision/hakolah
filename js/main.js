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
      <a class="btn" href="${item.url || "#"}" target="_blank" rel="noopener noreferrer">${item.cta || "زيارة"}</a>
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
  initNavToggle();
  initHeaderScroll();
});
