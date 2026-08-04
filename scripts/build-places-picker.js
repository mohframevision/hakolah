/*
  يجهّز بيانات "منتقي الأماكن" (places-picker) من:
    1. osm-places.csv  — قائمة المراجعة المولّدة بـ scripts/fetch-osm-places.js
    2. src/sections/*.md — التصنيفات والأيقونات الفعلية لكل قسم

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
    }));

  const sections = {};
  for (const slug of SECTIONS) {
    const p = path.join(ROOT, "src", "sections", `${slug}.md`);
    if (!fs.existsSync(p)) continue;
    const d = matter(fs.readFileSync(p, "utf8")).data;
    sections[slug] = {
      title: d.title,
      icons: d.iconOptions || ["⭐"],
      cats: d.categoryOptions || [],
    };
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
  console.log(`  الحجم          : ${(fs.statSync(OUT).size / 1024).toFixed(0)} كيلوبايت`);
}

main();
