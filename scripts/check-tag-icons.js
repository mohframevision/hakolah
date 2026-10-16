// فاحص تطابق الأيقونات — يكشف تصنيفات مستخدمة فعلياً بالمحتوى (categories)
// بدون أيقونة بـtag_icons.js، رغم أنها ليست منطقة ولا تصنيف دليل تحريري
// (الاستثناء المقصود المذكور بتعليق tag_icons.js نفسه).
//   node scripts/check-tag-icons.js
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src");

const tagsEn = require(path.join(SRC, "_data", "tags_en.js"));
const icons = require(path.join(SRC, "_data", "tag_icons.js"));
const areas = require(path.join(SRC, "_data", "areas.js"));
const areaKeys = new Set(Object.keys(areas));

// تصنيفات الأدلة التحريرية — بلا أيقونة عمداً (نفس تعليق tag_icons.js)
const EDITORIAL_GUIDES = new Set([
  "دليل شامل", "أفضل 10", "نهاية أسبوع", "نصائح", "مواسم وفعاليات",
  "نقل ومواصلات", "ميزانية", "للزوار", "تقنية وبرمجيات",
  "تصميم ومونتاج", "تسويق وأعمال", "مزار سياحي",
]);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    if (e.name.endsWith(".md") && !p.includes(`${path.sep}en${path.sep}`)) return [p];
    return [];
  });
}

function extractCategories(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return [];
  const fm = m[1];
  const inline = fm.match(/categories:\s*\[([^\]]*)\]/);
  if (inline) {
    return inline[1]
      .split(",")
      .map((s) => s.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  const block = fm.match(/categories:\s*\n((?:\s*-\s*.+\n?)+)/);
  if (block) {
    return [...block[1].matchAll(/-\s*(.+)/g)].map((x) =>
      x[1].trim().replace(/^["']|["']$/g, "")
    );
  }
  return [];
}

const usage = new Map(); // tag -> [files]
for (const file of walk(SRC)) {
  const raw = fs.readFileSync(file, "utf8");
  for (const cat of extractCategories(raw)) {
    if (!usage.has(cat)) usage.set(cat, []);
    usage.get(cat).push(path.relative(SRC, file));
  }
}

const missingUsed = [];
const missingUnused = [];
for (const k of Object.keys(tagsEn)) {
  if (areaKeys.has(k) || EDITORIAL_GUIDES.has(k)) continue;
  if (k in icons) continue;
  const files = usage.get(k) || [];
  if (files.length > 0) missingUsed.push([k, files.length]);
  else missingUnused.push(k);
}

console.log(`== تصنيفات مستخدمة فعلياً وبلا أيقونة (${missingUsed.length}) ==`);
missingUsed
  .sort((a, b) => b[1] - a[1])
  .forEach(([tag, count]) => console.log(`  ${tag}  (${count} عنصر)`));

console.log(`\n== تصنيفات مُترجمة لكن غير مستخدمة بأي عنصر، وبلا أيقونة (${missingUnused.length}) ==`);
missingUnused.forEach((tag) => console.log(`  ${tag}`));

console.log(
  `\nالمجموع: ${missingUsed.length} يحتاج قرار صاحب الموقع (أيقونة مناسبة)، ${missingUnused.length} بلا أولوية (غير مستخدم حالياً).`
);
