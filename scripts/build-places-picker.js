/*
  يجهّز بيانات "منتقي الأماكن" (places-picker) من:
    1. osm-places.csv  — قائمة المراجعة المولّدة بـ scripts/fetch-osm-places.js
    2. src/_data/sections.js — التصنيفات الفعلية لكل قسم (شاملةً كل مناطق البحرين)
    3. scripts/areas-geo.json — إحداثيات المناطق، لاقتراح منطقة كل مكان تلقائياً

  الهدف أن يعمل المنتقي بلا إنترنت وبلا خادم، وأن تكون خياراته مطابقة تماماً
  لما تقبله لوحة التحكم — فلا يختار المستخدم تصنيفاً غير موجود ثم يفشل النشر.

  التشغيل:  node scripts/build-places-picker.js
*/
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const ROOT = path.join(__dirname, "..");
const CSV = path.join(ROOT, "osm-places.csv");
const OUT = path.join(ROOT, "places-picker", "data.js");
const SECTIONS = ["restaurants", "cafes", "bakeries", "stores", "places"];

const AREAS_GEO = require("./areas-geo.json");

// أبعد مسافة نقبل عندها اقتراح منطقة. مركز المنطقة نقطة واحدة لا حدود، فالاقتراح
// تقريبي بطبيعته — وبلا سقف يُنسب مكان بأقصى الجنوب لأقرب منطقة على بعد 20 كم.
// ponytail: أقرب مركز (Voronoi تقريبي)؛ لو احتجنا دقة أعلى نجلب حدود المناطق من OSM
const AREA_MAX_KM = 4;

function nearestArea(coords) {
  const [lat, lng] = String(coords).split(",").map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "";
  let best = "";
  let bestKm = Infinity;
  for (const [name, [alat, alng]] of Object.entries(AREAS_GEO)) {
    // تقريب مسطّح — كافٍ لمقارنة مسافات داخل البحرين (~50 كم)
    const dx = (lng - alng) * 99.8; // كم لكل درجة طول عند خط عرض 26°
    const dy = (lat - alat) * 111.0;
    const km = Math.sqrt(dx * dx + dy * dy);
    if (km < bestKm) {
      bestKm = km;
      best = name;
    }
  }
  return bestKm <= AREA_MAX_KM ? best : "";
}

// محلل CSV بسيط يحترم الاقتباس والفواصل داخل الخلايا
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\r") {
      /* تُتجاهل */
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function main() {
  if (!fs.existsSync(CSV)) {
    console.error("لم يُعثر على osm-places.csv — شغّل أولاً: node scripts/fetch-osm-places.js");
    process.exit(1);
  }

  // نزيل علامة BOM (U+FEFF) التي نكتبها بالـ CSV ليعرض إكسل العربية صح.
  // تُكتب هنا كرمز هروب لا كحرف، لأن الحرف نفسه غير مرئي ويُربك المحررات.
  const BOM = "﻿";
  let raw = fs.readFileSync(CSV, "utf8");
  if (raw.startsWith(BOM)) raw = raw.slice(1);
  const rows = parseCsv(raw);
  rows.shift(); // ترويسة

  // نستبعد ما هو مضاف للموقع مسبقاً — لا فائدة من مراجعته مجدداً
  const places = rows
    .filter((r) => r.length > 5 && !r[0])
    .map((r, i) => ({
      i,
      ar: r[1],
      en: r[2],
      type: r[3],
      cuisine: r[4],
      area: r[5],
      coords: r[6],
      phone: r[7],
      website: r[8],
      maps: r[9],
      // منطقة مقترحة من الإحداثيات دائماً — منطقة المصدر بالإنجليزي وبتهجئة
      // حرة، فلا تصلح تصنيفاً بالموقع. تبقى معروضة للمقارنة لا أكثر.
      guessedArea: nearestArea(r[6]),
    }));

  // التصنيفات من sections.js لا من ملفات الأقسام الخام، لأنها تدمج كل مناطق
  // البحرين — فيختار المستخدم المنطقة من القائمة بدل كتابتها (والكتابة اليدوية
  // تحتاج ترجمة بالكود وإلا فشل النشر)
  const merged = require(path.join(ROOT, "src", "_data", "sections.js"))();
  const sections = {};
  for (const slug of SECTIONS) {
    const s = merged.find((x) => x.slug === slug);
    const p = path.join(ROOT, "src", "sections", `${slug}.md`);
    if (!s || !fs.existsSync(p)) continue;
    sections[slug] = {
      title: s.title,
      icons: matter(fs.readFileSync(p, "utf8")).data.iconOptions || ["⭐"],
      cats: s.categoryOptions,
    };
  }
  // المناطق منفصلة كي يعرضها المنتقي بمجموعة خاصة بدل خلطها بـ100 شريحة
  const areaSet = new Set(Object.keys(require(path.join(ROOT, "src", "_data", "areas.js"))));
  for (const s of Object.values(sections)) {
    s.areas = s.cats.filter((c) => areaSet.has(c));
    s.cats = s.cats.filter((c) => !areaSet.has(c));
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(
    OUT,
    "/* يُولَّد بـ scripts/build-places-picker.js — لا يُعدَّل يدوياً */\n" +
      `const PLACES = ${JSON.stringify(places)};\n` +
      `const SECTIONS = ${JSON.stringify(sections)};\n`,
    "utf8"
  );

  console.log(`الناتج: ${OUT}`);
  console.log(`  أماكن للمراجعة : ${places.length}`);
  console.log(`  أقسام          : ${Object.keys(sections).join("، ")}`);
  const guessed = places.filter((p) => p.guessedArea).length;
  console.log(
    `  منطقة معروفة   : ${guessed} من ${places.length}` +
      ` (${Math.round((guessed / places.length) * 100)}%)`
  );
  console.log(`  الحجم          : ${(fs.statSync(OUT).size / 1024).toFixed(0)} كيلوبايت`);
}

main();
