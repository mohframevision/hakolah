/* ===== الرئيسية: أزرار وصف حسب وقت اليوم، و«جديد في هكوله» =====
   الصف الزمني يختار من الأماكن الموجودة حسب تصنيفاتها (فطور الصبح، غداء الظهر، كوفي العصر،
   عشاء الليل)، وترتيبه يتبدّل كل يوم ببذرة التاريخ — نفس اليوم يعطي نفس الترتيب (ما يتنطط مع
   كل تحديث للصفحة)، واليوم الثاني ترتيب جديد. «جديد في هكوله» = آخر ما أضافه صاحب الموقع. */
(() => {
  const chipsBox = document.getElementById("homeChips");
  if (!chipsBox || typeof SITE_DATA === "undefined") return;
  const isEn = window.SITE_LANG === "en";
  const base = isEn ? "/en/" : "/";
  const searchUrl = (q) => `${base}search.html?q=${encodeURIComponent(q)}`;

  const SLOTS = {
    morning: {
      title: "home_morning",
      chips: isEn ? ["🍳 Breakfast", "🫖 Karak", "🥐 Pastries", "☕ Specialty coffee", "🥖 Bakery"] : ["🍳 فطور", "🫖 كرك", "🥐 معجنات", "☕ قهوة مختصة", "🥖 مخبز"],
      sections: ["bakeries", "cafes", "restaurants"],
      tags: ["إفطار", "معجنات", "كرك", "قهوة مختصة"],
      query: isEn ? "Breakfast" : "فطور",
    },
    noon: {
      title: "home_noon",
      chips: isEn ? ["🍢 Grills", "🍛 Mandi", "🏠 Bahraini", "🌯 Shawarma", "🍔 Burger"] : ["🍢 مشاوي", "🍛 مندي", "🏠 بحريني", "🌯 شاورما", "🍔 برجر"],
      sections: ["restaurants"],
      tags: ["مشاوي", "بحريني", "مندي", "لبناني", "مأكولات بحرية", "عراقي", "تركي", "كبسة"],
      query: isEn ? "Grills" : "مشاوي",
    },
    evening: {
      title: "home_evening",
      chips: isEn ? ["🫖 Karak", "☕ Coffee", "🍰 Desserts", "🍦 Ice cream", "🎂 Cake"] : ["🫖 كرك", "☕ قهوة", "🍰 حلويات", "🍦 آيسكريم", "🎂 كيك"],
      sections: ["cafes", "bakeries"],
      tags: [],
      query: isEn ? "Coffee" : "قهوة",
    },
    night: {
      title: "home_night",
      chips: isEn ? ["🌯 Shawarma", "🍔 Burger", "🥪 Sandwiches", "🍢 Grills", "🍰 Desserts"] : ["🌯 شاورما", "🍔 برجر", "🥪 سندويشات", "🍢 مشاوي", "🍰 حلويات"],
      sections: ["restaurants", "bakeries"],
      tags: ["شاورما", "برجر", "سندويشات", "وجبات سريعة", "مشاوي", "حلويات", "آيسكريم"],
      query: isEn ? "Shawarma" : "شاورما",
    },
  };
  const h = new Date().getHours();
  const slot = SLOTS[h >= 5 && h < 11 ? "morning" : h >= 11 && h < 16 ? "noon" : h >= 16 && h < 20 ? "evening" : "night"];

  // أزرار سريعة: وقت اليوم + كراج (حاجة مستعجلة بأي وقت)
  const chips = [...slot.chips, isEn ? "🔧 Garage" : "🔧 كراج"];
  chipsBox.innerHTML = chips.map((c) => `<a class="filter-chip" href="${searchUrl(c.replace(/^\S+\s/, ""))}">${escapeHtml(c)}</a>`).join("");

  // ترتيب يومي ثابت: بذرة من التاريخ (mulberry32)
  const d = new Date();
  let seed = d.getFullYear() * 1000 + d.getMonth() * 40 + d.getDate();
  const rand = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const hrefOf = (section, item) => base + (isEn && item.detailUrlEn ? item.detailUrlEn : item.detailUrl || `${section}.html?q=${encodeURIComponent(itemTitle(item))}`);
  const areaOf = (item) => {
    const a = (item.tags || []).find((tg) => typeof AREA_NAMES !== "undefined" && AREA_NAMES.includes(tg));
    return a ? (isEn && typeof TAGS_EN !== "undefined" && TAGS_EN[a]) || a : "";
  };
  // لون خلفية هادئ ثابت لكل مكان (من اسمه) — تمييز بصري بلا صور
  const TINTS = ["#f3ead9", "#e6efe9", "#f0e4e4", "#ece6f3", "#e3edf2", "#f1efe2"];
  const tint = (s) => TINTS[[...s].reduce((n, ch) => n + ch.charCodeAt(0), 0) % TINTS.length];
  // سطر صغير مفيد: المنطقة ونوع المكان («برجر · سار») بدل اسم القسم المكرر بكل بطاقة
  const typeOf = (item) => {
    const tg = (item.tags || []).find((x) => typeof AREA_NAMES === "undefined" || !AREA_NAMES.includes(x));
    return tg ? (isEn && typeof TAGS_EN !== "undefined" && TAGS_EN[tg]) || tg : "";
  };
  const card = (section, item, badge) => {
    const sub = [typeOf(item), areaOf(item)].filter(Boolean).join(" · ") || (isEn ? SITE_DATA[section].title_en || SITE_DATA[section].title : SITE_DATA[section].title);
    return `<a class="home-card" href="${hrefOf(section, item)}">
      ${badge ? `<span class="home-card-badge">${badge}</span>` : ""}
      <span class="home-card-icon${item.image ? " photo" : item.illus ? " illus" : ""}" style="--tint:${tint(item.id || item.title)}">${
        item.image
          ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy" decoding="async" />`
          : item.illus
            ? `<img src="/assets/illus/${escapeHtml(item.illus)}.webp" alt="" width="80" height="80" loading="lazy" decoding="async" />`
            : escapeHtml(item.icon || "📍")
      }</span>
      <span class="home-card-text"><b>${escapeHtml(itemTitle(item))}</b><small>${escapeHtml(sub)}</small></span>
    </a>`;
  };

  // صف الوقت
  const pool = [];
  slot.sections.forEach((s) =>
    (SITE_DATA[s]?.items || []).forEach((item) => {
      if (!slot.tags.length || s !== "restaurants" || item.tags.some((tg) => slot.tags.includes(tg))) pool.push([s, item]);
    })
  );
  const timeRow = shuffle(pool).slice(0, 10);
  if (timeRow.length) {
    document.getElementById("homeTimeTitle").textContent = t(slot.title);
    document.getElementById("homeTimeAll").href = searchUrl(slot.query);
    document.getElementById("homeTimeRow").innerHTML = timeRow.map(([s, item]) => card(s, item)).join("");
    document.getElementById("homeTime").hidden = false;
  }

  // جديد في هكوله: آخر ما أُضيف بكل الأقسام (المقالات تأخذ شارة «مقال»)
  const newest = [];
  Object.entries(SITE_DATA).forEach(([s, sec]) =>
    (sec.creators ? [] : sec.items || []).forEach((item) => {
      if (item.addedAt && !item.hideFromNewest) newest.push([s, item]);
    })
  );
  newest.sort((a, b) => b[1].addedAt - a[1].addedAt);
  const newRow = newest.slice(0, 10);
  if (newRow.length) {
    document.getElementById("homeNewRow").innerHTML = newRow.map(([s, item]) => card(s, item, s === "guides" ? t("home_article_badge") : t("home_new_badge"))).join("");
    document.getElementById("homeNew").hidden = false;
  }
})();
