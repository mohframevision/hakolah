/* ===== البحث في هكوله =====
   يبحث في كل الأقسام دفعة واحدة: أسماء الأماكن ووصفها وتصنيفاتها ومناطقها، وأصناف المنيو
   بأسعارها، والمقالات والأدوات — بالعربية أو بالإنجليزية. كله في جهاز الزائر (البيانات
   محمّلة أصلاً في data.js)، فلا خادم ولا كلفة ولا يُرسَل شيء.
   التسامح: توحيد الحروف (أ إ آ ← ا، ة ← ه، ى ← ي، چ گ ← ج ق، التشكيل والتطويل)، حذف «ال»،
   قاموس مرادفات ولهجة (SEARCH_DATA.synonyms)، وأخطاء إملائية بسيطة (مسافة تحرير ١–٢). */
(() => {
  const input = document.getElementById("searchInput");
  if (!input || typeof SITE_DATA === "undefined") return;
  const isEn = window.SITE_LANG === "en";
  const $ = (id) => document.getElementById(id);
  const S = typeof SEARCH_DATA === "undefined" ? { synonyms: [], popular: [], try: [] } : SEARCH_DATA;

  /* ===== توحيد النص ===== */
  const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
  const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
  function norm(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[ً-ٰٟـ]/g, "") // التشكيل والتطويل
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/ؤ/g, "و")
      .replace(/ئ/g, "ي")
      .replace(/چ/g, "ج")
      .replace(/گ/g, "ق")
      .replace(/[٠-٩]/g, (d) => AR_DIGITS.indexOf(d))
      .replace(/[۰-۹]/g, (d) => FA_DIGITS.indexOf(d))
      .replace(/[^\p{L}\p{N}\s.]/gu, " ")
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.replace(/^(و?ال)(?=\S{2,})/, "")) // «الشاورما» = «شاورما»
      .join(" ");
  }

  /* ===== المرادفات: كل كلمة بمجموعة توصل لباقيها ===== */
  const synGroups = S.synonyms.map((g) => g.map(norm));
  function expand(query) {
    const q = norm(query);
    const variants = new Set([q]);
    synGroups.forEach((g) => {
      // العبارة كاملة، أو أي كلمة منها، تطابق كلمة بالمجموعة (أو تقرب منها بحرف لو طويلة)
      const hit = g.some((term) => term === q || q.split(" ").some((w) => w === term || (w.length > 4 && levenshtein(w, term) <= 1)));
      if (hit) g.forEach((term) => variants.add(term));
    });
    return [...variants].filter(Boolean);
  }

  /* ===== الفهرس ===== */
  const PLACE_SECTIONS = new Set(["restaurants", "cafes", "bakeries", "stores", "car-shops", "places"]);
  const tagText = (tags) => (tags || []).map((tg) => tg + " " + ((typeof TAGS_EN !== "undefined" && TAGS_EN[tg]) || "")).join(" ");
  function hrefOf(section, item) {
    const rel = isEn && item.detailUrlEn ? item.detailUrlEn : item.detailUrl || `${section}.html?q=${encodeURIComponent(itemTitle(item))}`;
    return (isEn ? "/en/" : "/") + rel;
  }
  // السعر الأول بالنص (٠٫٨٠٠ / 1.800 BD / 500 فلس) كرقم بالدينار للترتيب
  function priceNum(price) {
    const s = norm(price);
    const m = s.match(/\d+(\.\d+)?/);
    if (!m) return Infinity;
    const n = parseFloat(m[0]);
    return /فلس|fils/.test(s) ? n / 1000 : n;
  }

  const entries = [];
  Object.entries(SITE_DATA).forEach(([section, sec]) => {
    const kind = PLACE_SECTIONS.has(section) ? "place" : "more";
    const secName = isEn ? sec.title_en || sec.title : sec.title;
    (sec.items || []).forEach((item) => {
      entries.push({
        kind,
        section,
        secName,
        item,
        title: norm(item.title + " " + (item.title_en || "")),
        tags: norm(tagText(item.tags) + " " + (item.keywords || "")),
        desc: norm((item.desc || "") + " " + (item.desc_en || "")),
      });
    });
  });
  // أصناف المنيو تنضاف بعد تحميل js/menus.js (بملف مستقل عن data.js)، ثم نعيد البحث الحالي
  const addMenuEntries = () =>
    Object.entries(SITE_DATA).forEach(([section, sec]) => {
      const secName = isEn ? sec.title_en || sec.title : sec.title;
      (sec.items || []).forEach((item) =>
        window.menuOf(item).forEach((m) => {
          if (!m.name) return;
          entries.push({
            kind: "menu",
            section,
            secName,
            item,
            menu: m,
            title: norm(m.name + " " + (m.name_en || "")),
            tags: "",
            desc: "",
            price: priceNum(m.price),
          });
        })
      );
    });

  /* ===== المطابقة والتقييم ===== */
  function fieldScore(field, term) {
    if (!field || !term) return 0;
    if (field === term) return 6;
    const words = field.split(" ");
    if (words.includes(term)) return 5;
    if (words.some((w) => w.startsWith(term))) return 4;
    if (field.includes(term)) return 3;
    // أخطاء إملائية: كل كلمة بالبحث تقرب من كلمة بالحقل — حرف واحد حتى ٦ أحرف وحرفان بعدها،
    // وأول حرف لازم يطابق (بدونه «karak» كانت تطابق «kabab»)
    const tw = term.split(" ");
    const ok = tw.every((t) => t.length >= 3 && words.some((w) => w[0] === t[0] && Math.abs(w.length - t.length) <= 2 && levenshtein(w, t) <= (t.length <= 6 ? 1 : 2)));
    return ok ? 2 : 0;
  }
  function scoreEntry(e, variants) {
    let best = 0;
    variants.forEach((v, i) => {
      const weight = i === 0 ? 1 : 0.85; // المرادف أضعف شوي من الكلمة نفسها
      const s = Math.max(fieldScore(e.title, v) * 3, fieldScore(e.tags, v) * 2, fieldScore(e.desc, v)) * weight;
      if (s > best) best = s;
    });
    return best;
  }
  function search(query) {
    const variants = expand(query);
    if (!variants[0]) return [];
    return entries
      .map((e) => ({ e, score: scoreEntry(e, variants) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  /* ===== العرض ===== */
  const list = $("searchList");
  const status = $("searchStatus");
  const emptyBox = $("searchEmpty");
  const resultsBox = $("searchResults");
  const tabsBox = $("searchTabs");
  const sortBox = $("searchSort");
  let tab = "all";
  let cheapFirst = false;
  let lastResults = [];

  function mark(text, query) {
    const safe = escapeHtml(text || "");
    const q = (query || "").trim();
    if (q.length < 2) return safe;
    const i = safe.toLowerCase().indexOf(escapeHtml(q).toLowerCase());
    if (i < 0) return safe;
    return safe.slice(0, i) + "<mark>" + safe.slice(i, i + escapeHtml(q).length) + "</mark>" + safe.slice(i + escapeHtml(q).length);
  }
  const area = (item) => (item.tags || []).find((tg) => typeof AREA_NAMES !== "undefined" && AREA_NAMES.includes(tg));
  const areaLabel = (item) => {
    const a = area(item);
    return a ? (isEn && typeof TAGS_EN !== "undefined" && TAGS_EN[a]) || a : "";
  };

  function rowHtml({ e }, query) {
    const it = e.item;
    if (e.kind === "menu") {
      const name = isEn && e.menu.name_en ? e.menu.name_en : e.menu.name;
      const sub = [areaLabel(it), e.secName].filter(Boolean).join(" · ");
      return `<a class="search-row" href="${hrefOf(e.section, it)}" data-q="${escapeHtml(input.value.trim())}">
        <span class="search-row-icon">${escapeHtml(it.icon || "🍽️")}</span>
        <span class="search-row-text"><b>${escapeHtml(itemTitle(it))}</b><small>«${mark(name, query)}» · ${escapeHtml(sub)}</small></span>
        ${e.menu.price ? `<span class="search-price">${escapeHtml(e.menu.price)}</span>` : ""}
      </a>`;
    }
    const sub = [e.secName, areaLabel(it)].filter(Boolean).join(" · ");
    return `<a class="search-row" href="${hrefOf(e.section, it)}" data-q="${escapeHtml(input.value.trim())}">
      <span class="search-row-icon">${escapeHtml(it.icon || "📍")}</span>
      <span class="search-row-text"><b>${mark(itemTitle(it), query)}</b><small>${escapeHtml(sub)}${itemDesc(it) ? " — " + escapeHtml(itemDesc(it).slice(0, 90)) : ""}</small></span>
    </a>`;
  }

  function renderResults(query) {
    const all = lastResults;
    const groups = { menu: all.filter((r) => r.e.kind === "menu"), place: all.filter((r) => r.e.kind === "place"), more: all.filter((r) => r.e.kind === "more") };
    if (cheapFirst) groups.menu = [...groups.menu].sort((a, b) => a.e.price - b.e.price);
    const TABS = [
      ["all", t("search_tab_all"), all.length],
      ["menu", t("search_tab_menu"), groups.menu.length],
      ["place", t("search_tab_places"), groups.place.length],
      ["more", t("search_tab_more"), groups.more.length],
    ];
    tabsBox.innerHTML = TABS.filter(([k, , n]) => k === "all" || n)
      .map(([k, label, n]) => `<button type="button" role="tab" aria-selected="${k === tab}" aria-controls="searchList" class="search-tab${k === tab ? " on" : ""}" data-tab="${k}">${label} <span>${n.toLocaleString(isEn ? "en" : "ar")}</span></button>`)
      .join("");
    sortBox.innerHTML = groups.menu.length > 1 && (tab === "all" || tab === "menu") ? `<button type="button" class="filter-chip${cheapFirst ? " active" : ""}" data-sort="cheap">${t("search_sort_cheap")}</button>` : "";
    const block = (key, head) => {
      const rows = groups[key];
      if (!rows.length || (tab !== "all" && tab !== key)) return "";
      const shown = tab === "all" ? rows.slice(0, 8) : rows;
      return `<section class="search-group"><h2>${head}</h2>${shown.map((r) => rowHtml(r, query)).join("")}${
        tab === "all" && rows.length > shown.length ? `<button type="button" class="link-btn search-more" data-tab="${key}">+${(rows.length - shown.length).toLocaleString(isEn ? "en" : "ar")}</button>` : ""
      }</section>`;
    };
    // المنيو أولاً لما يكون البحث عن طبق (أغلب النتائج منيو)، وإلا الأماكن أولاً
    // …إلا لو اسم مكان يطابق البحث بقوة الطبق نفسها («الجابرية» = المطعم، مو «بيتزا الجابرية»)
    const top = (rows) => (rows.length ? Math.max(...rows.map((r) => r.score)) : 0);
    const menuFirst = groups.menu.length >= groups.place.length && top(groups.menu) > top(groups.place);
    const order = menuFirst ? ["menu", "place", "more"] : ["place", "menu", "more"];
    const heads = { menu: t("search_in_menu"), place: t("search_places_head"), more: t("search_more_head") };
    list.innerHTML = order.map((k) => block(k, heads[k])).join("");
  }

  function renderNone(query) {
    tabsBox.innerHTML = "";
    sortBox.innerHTML = "";
    const pop = (isEn ? S.popular_en : S.popular) || [];
    list.innerHTML = `<div class="search-none">
      <p class="search-none-title">${escapeHtml(t("search_none_title").replace("{q}", query))}</p>
      <p>${t("search_none_tip")}</p>
      <div class="chip-row">${pop.map((p) => `<button type="button" class="filter-chip" data-q="${escapeHtml(p)}">${escapeHtml(p)}</button>`).join("")}</div>
      <a class="btn" href="${isEn ? "/en/" : "/"}picker.html">🎲 ${t("home_pick_btn")}</a>
    </div>`;
  }

  function run() {
    const query = input.value.trim();
    const url = new URL(location.href);
    if (query) url.searchParams.set("q", query);
    else url.searchParams.delete("q");
    history.replaceState(null, "", url);
    if (!query) {
      resultsBox.hidden = true;
      emptyBox.hidden = false;
      status.textContent = "";
      paintRecent();
      return;
    }
    emptyBox.hidden = true;
    resultsBox.hidden = false;
    lastResults = search(query);
    if (tab !== "all" && !lastResults.some((r) => r.e.kind === tab)) tab = "all";
    status.textContent = lastResults.length ? t("search_count").replace("{n}", lastResults.length.toLocaleString(isEn ? "en" : "ar")) : "";
    if (lastResults.length) renderResults(query);
    else renderNone(query);
  }
  let timer = 0;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(run, 120);
  });
  $("searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    clearTimeout(timer);
    run();
    remember(input.value);
    input.blur(); // يخفي لوحة مفاتيح الجوال فتظهر النتائج كاملة
  });

  /* ===== بحوثك الأخيرة — بالجهاز فقط ===== */
  const RECENT_KEY = "searchRecent";
  const getRecent = () => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
    } catch {
      return [];
    }
  };
  const setRecent = (arr) => {
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(arr));
    } catch {
      // التخزين محجوب — تبقى للجلسة فقط
    }
  };
  function remember(q) {
    q = (q || "").trim();
    if (q.length < 2) return;
    setRecent([q, ...getRecent().filter((x) => x !== q)].slice(0, 8));
  }
  function paintRecent() {
    const items = getRecent();
    $("searchRecentBlock").hidden = !items.length;
    $("searchRecent").innerHTML = items
      .map((q) => `<li><button type="button" class="search-recent-q" data-q="${escapeHtml(q)}">🕘 ${escapeHtml(q)}</button><button type="button" class="search-recent-x" data-del="${escapeHtml(q)}" aria-label="${t("search_remove")} ${escapeHtml(q)}">✕</button></li>`)
      .join("");
  }
  $("searchRecentClear").addEventListener("click", () => {
    setRecent([]);
    paintRecent();
  });

  /* ===== الكلمات المقترحة ===== */
  const chip = (label, q) => `<button type="button" class="filter-chip" data-q="${escapeHtml(q)}">${escapeHtml(label)}</button>`;
  $("searchPopular").innerHTML = ((isEn ? S.popular_en : S.popular) || []).map((p) => chip(p, p)).join("");
  // «🍳 فطور» يبحث عن «فطور» (بلا الرمز)
  $("searchTry").innerHTML = ((isEn ? S.try_en : S.try) || []).map((p) => chip(p, p.replace(/^\S+\s/, ""))).join("");

  /* ===== النقرات ===== */
  document.querySelector(".search-page").addEventListener("click", (e) => {
    const del = e.target.closest("[data-del]");
    if (del) {
      setRecent(getRecent().filter((x) => x !== del.dataset.del));
      return paintRecent();
    }
    const tb = e.target.closest("[data-tab]");
    if (tb) {
      tab = tb.dataset.tab;
      return renderResults(input.value.trim());
    }
    if (e.target.closest("[data-sort]")) {
      cheapFirst = !cheapFirst;
      return renderResults(input.value.trim());
    }
    const row = e.target.closest(".search-row");
    if (row) return remember(row.dataset.q);
    const q = e.target.closest("[data-q]");
    if (q) {
      input.value = q.dataset.q;
      run();
      remember(q.dataset.q);
    }
  });

  /* ===== البحث بالصوت (مجاني من المتصفح نفسه؛ الصوت يذهب لشركة المتصفح لا لنا) ===== */
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const mic = $("searchMic");
  if (Rec && mic) {
    mic.hidden = false;
    let rec = null;
    mic.addEventListener("click", () => {
      if (rec) return rec.stop();
      rec = new Rec();
      rec.lang = isEn ? "en-US" : "ar-BH";
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      mic.classList.add("listening");
      status.textContent = t("search_listening");
      rec.onresult = (ev) => {
        input.value = [...ev.results].map((r) => r[0].transcript).join(" ");
        run();
      };
      rec.onerror = (ev) => {
        status.textContent = ev.error === "not-allowed" || ev.error === "service-not-allowed" ? t("search_mic_denied") : t("search_mic_failed");
      };
      rec.onend = () => {
        mic.classList.remove("listening");
        rec = null;
        if (input.value.trim()) remember(input.value);
      };
      rec.start();
    });
  }

  /* ===== البداية: ?q= من الرابط (الرئيسية والأزرار السريعة)، وإلا التركيز على الحقل ===== */
  const start = new URLSearchParams(location.search).get("q");
  if (start) {
    input.value = start;
    remember(start);
  }
  run();
  if (!start) input.focus();
  window
    .loadMenus()
    .then(() => {
      addMenuEntries();
      run();
    })
    .catch(() => {});
})();
