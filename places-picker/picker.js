/*
  منتقي أماكن هكوله — أداة محلية لمراجعة قائمة OpenStreetMap مكاناً مكاناً،
  تعبئة معلوماته، ثم تصدير ملف واحد يُضاف للموقع بأقل جهد.

  مستقلة تماماً عن الموقع: خارج src/ فلا يبنيها Eleventy، ولا تتصل بأي خادم.
  التقدّم يُحفظ تلقائياً بـ localStorage فلا يضيع عند إغلاق المتصفح.

  التصنيفات والأيقونات تأتي من src/sections/*.md عبر data.js المولّد، فلا
  يمكن اختيار تصنيف غير موجود بلوحة التحكم (وهذا كان يُفشل النشر سابقاً).
*/
const STORE_KEY = "hakolah_places_picker_v1";
const $ = (id) => document.getElementById(id);

let entries = {}; // { [index]: {section, icon, ar, en, descAr, descEn, cats[], links, coords} }
let currentIndex = null;

/* ===== الحفظ التلقائي ===== */
function load() {
  try {
    entries = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
  } catch {
    entries = {};
  }
}
function persist() {
  localStorage.setItem(STORE_KEY, JSON.stringify(entries));
  renderCounts();
}

/* عنصر يُعدّ "جاهزاً" لو فيه ما يكفي لبطاقة صحيحة بالموقع: قسم واسمان
   ووصف بلغتين — نفس ما تفرضه لوحة التحكم.

   استثناء: لو فُعّل خيار "خلّ Claude يكتب الوصف" فالوصفان غير مطلوبين،
   ويُصدَّر المكان مع علامة صريحة ليكتبهما Claude بعد بحث وتحقق. الغرض
   المرور على عشرات الأماكن بسرعة بدل التوقف عند كل وصف. */
function isReady(e) {
  if (!e || !e.section || !e.ar || !e.en) return false;
  return e.autoDesc ? true : Boolean(e.descAr && e.descEn);
}

function renderCounts() {
  const done = Object.values(entries).filter(isReady).length;
  const partial = Object.keys(entries).length - done;
  $("counts").innerHTML =
    `<b>${done}</b> جاهز · ${partial} قيد التعبئة · من ${PLACES.length}`;
}

/* ===== القائمة ===== */
function filtered() {
  const q = $("q").value.trim().toLowerCase();
  const type = $("fType").value;
  const state = $("fState").value;
  return PLACES.filter((p) => {
    if (type && p.type !== type) return false;
    const e = entries[p.i];
    if (state === "done" && !isReady(e)) return false;
    if (state === "todo" && isReady(e)) return false;
    if (!q) return true;
    return ((p.ar || "") + " " + (p.en || "") + " " + (p.area || "") + " " + (p.cuisine || ""))
      .toLowerCase()
      .includes(q);
  });
}

function renderList() {
  const list = filtered();
  const box = $("rows");
  if (!list.length) {
    box.innerHTML = '<div class="empty">ما فيه نتائج مطابقة</div>';
    return;
  }
  // نعرض 300 كحد أقصى — 1775 صفاً دفعة واحدة تُبطئ المتصفح بلا فائدة
  const shown = list.slice(0, 300);
  box.innerHTML = shown
    .map((p) => {
      const e = entries[p.i];
      const ready = isReady(e);
      const started = e && !ready;
      return `<div class="row${p.i === currentIndex ? " sel" : ""}${ready ? " done" : ""}" data-i="${p.i}">
        <div class="nm">
          <b>${escapeHtml(p.ar || p.en || "(بلا اسم)")}</b>
          <small>${escapeHtml([p.type, p.area, p.cuisine].filter(Boolean).join(" · "))}</small>
        </div>
        <span class="badge${ready ? (e.autoDesc ? " auto" : " done") : ""}">${
          ready ? (e.autoDesc ? "🤖 بانتظار الوصف" : "جاهز ✓") : started ? "بدأت" : p.type
        }</span>
      </div>`;
    })
    .join("");
  if (list.length > shown.length) {
    box.insertAdjacentHTML(
      "beforeend",
      `<div class="empty">تُعرض ${shown.length} من ${list.length} — ضيّق البحث لرؤية الباقي</div>`
    );
  }
  box.querySelectorAll(".row").forEach((r) =>
    r.addEventListener("click", () => openEditor(Number(r.dataset.i)))
  );
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ===== محرر المكان ===== */
function openEditor(i) {
  currentIndex = i;
  const p = PLACES.find((x) => x.i === i);
  const e = entries[i] || {};
  const section = e.section || guessSection(p.type);

  $("editor").innerHTML = `
    <h2>${escapeHtml(p.ar || p.en)}</h2>
    <div class="sub">
      ${escapeHtml([p.type, p.area, p.cuisine].filter(Boolean).join(" · "))}
      ${p.maps ? ` · <a href="${p.maps}" target="_blank" rel="noopener">افتح بالخرائط ↗</a>` : ""}
    </div>

    <label for="eSection">القسم</label>
    <select id="eSection">
      ${Object.entries(SECTIONS)
        .map(([k, v]) => `<option value="${k}"${k === section ? " selected" : ""}>${escapeHtml(v.title)}</option>`)
        .join("")}
    </select>

    <label>الأيقونة</label>
    <div class="icons" id="eIcons"></div>

    <div class="two">
      <div><label for="eAr">الاسم بالعربي *</label><input id="eAr" value="${escapeHtml(e.ar || p.ar || "")}" /></div>
      <div><label for="eEn">الاسم بالإنجليزي *</label><input id="eEn" value="${escapeHtml(e.en || p.en || "")}" /></div>
    </div>

    <div class="toggles">
      <label class="tg"><input type="checkbox" id="eAuto"${e.autoDesc ? " checked" : ""} /> 🤖 خلّ Claude يكتب الوصف</label>
      <label class="tg"><input type="checkbox" id="eVisited"${e.visited ? " checked" : ""} /> ✅ زرته شخصياً</label>
    </div>

    <div id="descBox">
      <label for="eDescAr">الوصف بالعربي *</label>
      <textarea id="eDescAr">${escapeHtml(e.descAr || "")}</textarea>

      <label for="eDescEn">الوصف بالإنجليزي *</label>
      <textarea id="eDescEn">${escapeHtml(e.descEn || "")}</textarea>
    </div>

    <label for="eNotes">ملاحظاتك لـ Claude <span class="hint">(اختياري — تساعده يكتب وصفاً أدق)</span></label>
    <textarea id="eNotes" placeholder="مثال: مشهور بالمشاوي، الأفضل وقت العشاء، الأسعار معقولة">${escapeHtml(e.notes || "")}</textarea>

    <label>التصنيفات <span class="hint">(اختر من الموجود فقط)</span></label>
    <div class="chips" id="eCats"></div>

    <label for="eCoords">الإحداثيات</label>
    <input id="eCoords" dir="ltr" value="${escapeHtml(e.coords ?? p.coords ?? "")}" />

    <div class="two">
      <div><label for="eMaps">رابط الخرائط</label><input id="eMaps" dir="ltr" value="${escapeHtml(e.maps ?? p.maps ?? "")}" /></div>
      <div><label for="eInsta">إنستقرام</label><input id="eInsta" dir="ltr" value="${escapeHtml(e.insta || "")}" /></div>
    </div>
    <div class="two">
      <div><label for="eSite">الموقع</label><input id="eSite" dir="ltr" value="${escapeHtml(e.site ?? p.website ?? "")}" /></div>
      <div><label for="ePhone">الهاتف</label><input id="ePhone" dir="ltr" value="${escapeHtml(e.phone ?? p.phone ?? "")}" /></div>
    </div>

    <div class="bar">
      <button type="button" class="primary" id="eSave">💾 حفظ</button>
      <button type="button" id="eSkip">تخطّي</button>
      <button type="button" id="eClear">🗑️ امسح</button>
    </div>
    <p class="hint">الحقول بنجمة * مطلوبة حتى يُعدّ المكان جاهزاً للتصدير.</p>
  `;

  drawIcons(section, e.icon);
  drawCats(section, e.cats || []);

  $("eSection").addEventListener("change", () => {
    const s = $("eSection").value;
    drawIcons(s, null);
    drawCats(s, []); // تصنيفات القسم الجديد مختلفة، فنبدأ نظيفاً
  });
  // إخفاء حقلي الوصف عند تفعيل الكتابة الآلية — أوضح من تركهما فارغين
  const syncAuto = () => {
    $("descBox").style.display = $("eAuto").checked ? "none" : "";
  };
  $("eAuto").addEventListener("change", syncAuto);
  syncAuto();

  $("eSave").addEventListener("click", saveCurrent);
  $("eSkip").addEventListener("click", nextPlace);
  $("eClear").addEventListener("click", () => {
    delete entries[currentIndex];
    persist();
    renderList();
    openEditor(currentIndex);
  });
  renderList();
}

// تخمين القسم من نوع OSM — يوفّر نقرة بأغلب الحالات ويظل قابلاً للتعديل
function guessSection(type) {
  if (["كافيه"].includes(type)) return "cafes";
  if (["مخبز", "حلويات", "معجنات"].includes(type)) return "bakeries";
  return "restaurants";
}

function drawIcons(section, active) {
  const icons = (SECTIONS[section] || SECTIONS.restaurants).icons;
  $("eIcons").innerHTML = icons
    .map(
      (ic) =>
        `<span class="chip" role="button" tabindex="0" aria-pressed="${ic === active}" data-ic="${ic}">${ic}</span>`
    )
    .join("");
  $("eIcons")
    .querySelectorAll(".chip")
    .forEach((c) =>
      c.addEventListener("click", () => {
        $("eIcons")
          .querySelectorAll(".chip")
          .forEach((x) => x.setAttribute("aria-pressed", "false"));
        c.setAttribute("aria-pressed", "true");
      })
    );
}

function drawCats(section, active) {
  const cats = (SECTIONS[section] || SECTIONS.restaurants).cats;
  $("eCats").innerHTML = cats
    .map(
      (c) =>
        `<span class="chip" role="button" tabindex="0" aria-pressed="${active.includes(c)}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</span>`
    )
    .join("");
  $("eCats")
    .querySelectorAll(".chip")
    .forEach((c) =>
      c.addEventListener("click", () =>
        c.setAttribute("aria-pressed", c.getAttribute("aria-pressed") === "true" ? "false" : "true")
      )
    );
}

function saveCurrent() {
  const picked = (sel) =>
    [...document.querySelectorAll(sel)].filter((c) => c.getAttribute("aria-pressed") === "true");
  const auto = $("eAuto").checked;
  entries[currentIndex] = {
    section: $("eSection").value,
    icon: picked("#eIcons .chip")[0]?.dataset.ic || "",
    ar: $("eAr").value.trim(),
    en: $("eEn").value.trim(),
    autoDesc: auto,
    visited: $("eVisited").checked,
    notes: $("eNotes").value.trim(),
    descAr: auto ? "" : $("eDescAr").value.trim(),
    descEn: auto ? "" : $("eDescEn").value.trim(),
    cats: picked("#eCats .chip").map((c) => c.dataset.cat),
    coords: $("eCoords").value.trim(),
    maps: $("eMaps").value.trim(),
    insta: $("eInsta").value.trim(),
    site: $("eSite").value.trim(),
    phone: $("ePhone").value.trim(),
  };
  persist();
  renderList();
  nextPlace();
}

function nextPlace() {
  const list = filtered();
  const pos = list.findIndex((p) => p.i === currentIndex);
  const next = list[pos + 1];
  if (next) openEditor(next.i);
}

/* ===== التصدير =====
   ملف JSON واحد بصيغة يفهمها Claude مباشرة ويحوّلها لملفات محتوى. */
function exportReady() {
  const ready = Object.entries(entries)
    .filter(([, e]) => isReady(e))
    .map(([i, e]) => {
      const p = PLACES.find((x) => x.i === Number(i)) || {};
      return {
        section: e.section,
        icon: e.icon || undefined,
        title: e.ar,
        title_en: e.en,
        // عند الكتابة الآلية نُرسل null صراحةً مع علامة needsDescription،
        // فلا يلتبس على Claude "فارغ" مع "اتركه فارغاً"
        desc: e.autoDesc ? null : e.descAr,
        desc_en: e.autoDesc ? null : e.descEn,
        needsDescription: e.autoDesc || undefined,
        verified: e.visited || undefined,
        notes: e.notes || undefined,
        categories: e.cats,
        coords: e.coords || undefined,
        links: {
          maps: e.maps || undefined,
          instagram: e.insta || undefined,
          website: e.site || undefined,
          phone: e.phone || undefined,
        },
        source: { osm: p.ar || p.en, area: p.area || undefined },
      };
    });

  if (!ready.length) {
    alert(
      "ما فيه أماكن جاهزة بعد.\n\nالمطلوب لكل مكان: القسم والاسمان،\n" +
        "ثم إما تكتب الوصفين، أو تفعّل «🤖 خلّ Claude يكتب الوصف»."
    );
    return;
  }

  const needDesc = ready.filter((r) => r.needsDescription).length;
  download(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        count: ready.length,
        needDescription: needDesc,
        items: ready,
      },
      null,
      2
    ),
    `hakolah-places-${ready.length}.json`
  );
}

function download(text, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "application/json;charset=utf-8" }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ===== الربط ===== */
load();
[...new Set(PLACES.map((p) => p.type))].sort().forEach((t) => {
  const o = document.createElement("option");
  o.value = o.textContent = t;
  $("fType").appendChild(o);
});
["q", "fType", "fState"].forEach((id) => $(id).addEventListener("input", renderList));
$("export").addEventListener("click", exportReady);
$("save").addEventListener("click", () =>
  download(JSON.stringify(entries, null, 2), "picker-backup.json")
);
$("load").addEventListener("click", () => $("fileInput").click());
$("fileInput").addEventListener("change", async (ev) => {
  const f = ev.target.files[0];
  if (!f) return;
  try {
    entries = JSON.parse(await f.text());
    persist();
    renderList();
    alert("تم الاسترجاع ✓");
  } catch {
    alert("الملف غير صالح");
  }
});

renderCounts();
renderList();
