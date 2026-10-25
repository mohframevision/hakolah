// فاحص حجم الحزمة (js/data.js الرئيسي + main.js) بعد البناء + كشف تكرار
// menuItems الكامل بين ملفات مختلفة (فروع نفس المحل غالباً تنسخ نفس المنيو
// حرفياً بكل ملف — كل فرع يضيف نسخة كاملة أخرى لنفس البيانات بـdata.js
// المحمَّل بلا شرط بكل صفحة بالموقع، فالتكرار هنا مكلف أداءً أكثر من تكرار
// نص desc العادي).
//
// الاستخدام:
//   node scripts/check-bundle-size.js            بعد npm run build أو npx eleventy
//
// ملاحظة: هذا يقيس data.js/main.js كما خرجا من Eleventy مباشرة (قبل خطوة
// minify.js) — minify.js يصغّر المسافات/التعليقات لكنه لا يحذف أي تكرار
// حقيقي بالبيانات نفسها (الأسماء/الأسعار المكرَّرة تبقى مكرَّرة بعد التصغير).
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.join(__dirname, "..");
const SITE_DIR = path.join(ROOT, "_site");
const SRC = path.join(ROOT, "src");
const SECTIONS = ["bakeries", "cafes", "car-shops", "places", "restaurants", "stores"];

function human(bytes) {
  return `${(bytes / 1024).toFixed(1)}KB`;
}

function reportFileSize(label, file) {
  if (!fs.existsSync(file)) {
    console.log(`  ${label}: غير موجود (شغّل npx eleventy أو npm run build أولاً)`);
    return;
  }
  const raw = fs.readFileSync(file);
  const gz = zlib.gzipSync(raw, { level: 9 });
  console.log(`  ${label}: خام ${human(raw.length)} — gzip ${human(gz.length)}`);
}

// يسحب كتلة menuItems كاملة (قائمة YAML) من الفرونت-ماتر، كنص خام للمقارنة
function extractMenuBlock(raw) {
  const lines = raw.split(/\r?\n/);
  const idx = lines.findIndex((l) => /^menuItems:\s*$/.test(l));
  if (idx === -1) return null;
  const parts = [];
  for (let i = idx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === "---") break;
    if (/^[A-Za-z_]+:/.test(line)) break; // رجعنا لمفتاح جديد بمستوى الجذر
    parts.push(line);
  }
  const text = parts.join("\n").trim();
  return text || null;
}

function scanDuplicateMenus() {
  const byContent = new Map();
  for (const slug of SECTIONS) {
    const dir = path.join(SRC, slug);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
      const full = path.join(dir, file);
      const raw = fs.readFileSync(full, "utf8");
      const block = extractMenuBlock(raw);
      if (!block) continue;
      const key = block;
      if (!byContent.has(key)) byContent.set(key, { files: [], bytes: Buffer.byteLength(block, "utf8"), items: block.split(/\n\s*-\s*name:/).length });
      byContent.get(key).files.push(`${slug}/${file}`);
    }
  }
  const groups = [...byContent.values()].filter((g) => g.files.length > 1);
  if (!groups.length) {
    console.log("  لا تكرار كامل لمنيو (menuItems) بين ملفات مختلفة حالياً.");
    return;
  }
  groups.sort((a, b) => b.bytes * (b.files.length - 1) - a.bytes * (a.files.length - 1));
  let totalWasted = 0;
  for (const g of groups) {
    const wasted = g.bytes * (g.files.length - 1);
    totalWasted += wasted;
    console.log(`  [${g.files.length} ملفات بمنيو مطابق حرفياً، ~${g.items} صنفاً، ${human(g.bytes)} للنسخة الواحدة — ${human(wasted)} مكرَّر زيادة]`);
    g.files.forEach((f) => console.log(`      ${f}`));
  }
  console.log(`\n  إجمالي تقديري مكرَّر زيادة بمصدر src/ (قبل gzip): ${human(totalWasted)} — كله يُشحَن حالياً عبر js/data.js بلا شرط بكل صفحة بالموقع.`);
  console.log("  هذا رصد فقط، ليس إصلاحاً تلقائياً — دمج منيو الفروع بمصدر واحد مشترك تغيير بنية بيانات حقيقي يحتاج قراراً وجلسة تفاعلية.");
}

function main() {
  console.log("== حجم الحزمة (js/data.js الرئيسي + main.js) ==");
  reportFileSize("js/data.js", path.join(SITE_DIR, "js", "data.js"));
  reportFileSize("js/main.js", path.join(SITE_DIR, "js", "main.js"));
  console.log("\n== تكرار menuItems كامل بين ملفات مختلفة (فروع محتملة) ==");
  scanDuplicateMenus();
}

main();
