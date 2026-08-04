/*
  أداة تُنتج قائمة مراجعة بكل المطاعم والكافيهات والمخابز المسجّلة بالبحرين
  على OpenStreetMap، ليراجعها صاحب الموقع يدوياً ويختار منها ما يستحق الإضافة.

  ليست استيراداً آلياً — الغرض قائمة عمل فقط. الانتقاء اليدوي هو قيمة الموقع،
  وبيانات OSM ناقصة وغير موثوقة بما يكفي للنشر المباشر.

  المصدر: Overpass API فوق OpenStreetMap — مجاني وبلا مفاتيح، ورخصة ODbL
  تسمح بالاستخدام مع الإسناد. لا يُستخدم السجل التجاري (سجلات) لأن شروطه
  تمنع الاستخراج الآلي بالجملة.

  التشغيل:  node scripts/fetch-osm-places.js
  الناتج :  osm-places.csv بجذر المشروع (يُفتح بإكسل مباشرة)
*/
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "osm-places.csv");
const SITE_DATA_PATH = path.join(__dirname, "..", "_site", "js", "data.js");

const QUERY = `[out:json][timeout:120];
area["ISO3166-1"="BH"][admin_level=2]->.bh;
(
  node["amenity"~"^(restaurant|cafe|fast_food)$"](area.bh);
  way["amenity"~"^(restaurant|cafe|fast_food)$"](area.bh);
  node["shop"~"^(bakery|pastry|confectionery)$"](area.bh);
  way["shop"~"^(bakery|pastry|confectionery)$"](area.bh);
);
out center tags;`;

const TYPE_AR = {
  restaurant: "مطعم",
  fast_food: "وجبات سريعة",
  cafe: "كافيه",
  bakery: "مخبز",
  pastry: "معجنات",
  confectionery: "حلويات",
};

// تطبيع للمقارنة: نزيل التشكيل و"ال" التعريف والمسافات وفروق الألف/الياء/الهاء
function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[ً-ْ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/^ال/, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function csvCell(v) {
  const s = String(v == null ? "" : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

async function main() {
  // ما هو موجود بالموقع أصلاً، حتى نعلّم المكرّر بدل ما يراجعه المستخدم مرتين
  const existing = new Map();
  if (fs.existsSync(SITE_DATA_PATH)) {
    const SITE_DATA = new Function(
      fs.readFileSync(SITE_DATA_PATH, "utf8") + "\nreturn SITE_DATA;"
    )();
    for (const [slug, sec] of Object.entries(SITE_DATA)) {
      for (const item of sec.items || []) {
        for (const n of [item.title, item.title_en]) {
          if (n) existing.set(normalize(n), slug);
        }
      }
    }
  } else {
    console.warn("تحذير: لم يُعثر على _site/js/data.js — شغّل البناء أولاً لتعليم المكرّر.");
  }

  console.log("جاري الجلب من OpenStreetMap…");
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: "data=" + encodeURIComponent(QUERY),
    headers: { "User-Agent": "hakolah-site/1.0 (mohframevision@outlook.com)" },
  });
  if (!res.ok) throw new Error("فشل الجلب: " + res.status);
  const data = await res.json();

  const rows = [];
  const seen = new Set();

  for (const el of data.elements) {
    const t = el.tags || {};
    const nameAr = t["name:ar"] || (/[؀-ۿ]/.test(t.name || "") ? t.name : "");
    const nameEn = t["name:en"] || (!/[؀-ۿ]/.test(t.name || "") ? t.name : "");
    const name = nameAr || nameEn || t.name;
    if (!name) continue;

    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;

    // إزالة التكرار داخل OSM نفسه (نفس الاسم بموقع قريب جداً)
    const key = normalize(name) + "|" + lat.toFixed(3) + "|" + lon.toFixed(3);
    if (seen.has(key)) continue;
    seen.add(key);

    const type = t.amenity || t.shop;
    const already = existing.get(normalize(nameAr)) || existing.get(normalize(nameEn));

    rows.push({
      already: already ? "موجود (" + already + ")" : "",
      nameAr,
      nameEn,
      type: TYPE_AR[type] || type,
      cuisine: t.cuisine || "",
      area: t["addr:city"] || t["addr:suburb"] || t["addr:district"] || "",
      coords: `${lat}, ${lon}`, // جاهز للصق مباشرةً بحقل الإحداثيات باللوحة
      phone: t.phone || t["contact:phone"] || "",
      website: t.website || t["contact:website"] || "",
      maps: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
    });
  }

  // الجديد أولاً، ثم حسب النوع فالاسم — ليبدأ المستخدم بما يستحق المراجعة
  rows.sort(
    (a, b) =>
      (a.already ? 1 : 0) - (b.already ? 1 : 0) ||
      a.type.localeCompare(b.type, "ar") ||
      (a.nameAr || a.nameEn).localeCompare(b.nameAr || b.nameEn, "ar")
  );

  const header = [
    "الحالة",
    "الاسم بالعربي",
    "الاسم بالإنجليزي",
    "النوع",
    "المطبخ",
    "المنطقة",
    "الإحداثيات (انسخها للوحة)",
    "الهاتف",
    "الموقع",
    "افتح بالخرائط",
  ];
  const csv =
    "﻿" + // BOM حتى يعرض إكسل العربية صح
    [header, ...rows.map((r) => Object.values(r))].map((r) => r.map(csvCell).join(",")).join("\r\n");

  fs.writeFileSync(OUT, csv, "utf8");

  const dup = rows.filter((r) => r.already).length;
  console.log(`\nالناتج: ${OUT}`);
  console.log(`  الإجمالي        : ${rows.length}`);
  console.log(`  جديد للمراجعة   : ${rows.length - dup}`);
  console.log(`  موجود عندك أصلاً: ${dup}`);
  const byType = {};
  rows.forEach((r) => (byType[r.type] = (byType[r.type] || 0) + 1));
  console.log("  حسب النوع       :", JSON.stringify(byType, null, 0));
}

main().catch((e) => {
  console.error("خطأ:", e.message);
  process.exit(1);
});
