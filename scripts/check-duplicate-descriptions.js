// فاحص وصف مكرر — يكشف عناصر مختلفة تشارك نص desc/desc_en مطابقاً حرفياً
// (غالباً وصف عام قصير لم يُخصَّص بعد، أو نُسخ من عنصر آخر بالخطأ).
// تنبيه: بعض التكرار طبيعي ومتوقع (نفس السلسلة التجارية بعدة فروع، مثل
// "جاز السلام") — راجع كل نتيجة يدوياً قبل اعتبارها فجوة محتوى حقيقية.
//   node scripts/check-duplicate-descriptions.js            كل الأقسام
//   node scripts/check-duplicate-descriptions.js cafes      قسم واحد
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "src");
const SECTIONS = ["bakeries", "cafes", "car-shops", "places", "restaurants", "stores"];

function frontMatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : "";
}

// يفهم صيغة YAML block scalar (desc: |- ... بأسطر تالية) وليس فقط قيمة سطر واحد
function fieldText(fm, name) {
  const lines = fm.split(/\r?\n/);
  const idx = lines.findIndex((l) => new RegExp(`^[ \\t]*${name}:[ \\t]*(\\||>)`).test(l));
  if (idx !== -1) {
    const indent = lines[idx].match(/^[ \t]*/)[0].length;
    const parts = [];
    for (let i = idx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === "") continue;
      const li = line.match(/^[ \t]*/)[0].length;
      if (li <= indent) break;
      parts.push(line.trim());
    }
    return parts.join(" ");
  }
  const m = fm.match(new RegExp(`(^|\\n)[ \\t]*${name}:[ \\t]*(.*)`));
  return m ? m[2].trim().replace(/^["']|["']$/g, "") : "";
}

function main() {
  const only = process.argv[2];
  const sections = SECTIONS.filter((s) => !only || s === only);
  if (!sections.length) {
    console.error(`ما فيه قسم اسمه "${only}"`);
    process.exit(1);
  }

  for (const field of ["desc", "desc_en"]) {
    const seen = new Map();
    for (const slug of sections) {
      const dir = path.join(SRC, slug);
      if (!fs.existsSync(dir)) continue;
      for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
        const fm = frontMatter(fs.readFileSync(path.join(dir, file), "utf8"));
        const text = fieldText(fm, field).toLowerCase().trim();
        if (!text) continue;
        const key = text;
        if (!seen.has(key)) seen.set(key, []);
        seen.get(key).push(`${slug}/${file}`);
      }
    }
    const dupes = [...seen.entries()].filter(([, files]) => files.length > 1);
    if (!dupes.length) continue;
    console.log(`\n== ${field} مكرر حرفياً ==`);
    for (const [text, files] of dupes.sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  [${files.length}x] "${text.slice(0, 70)}${text.length > 70 ? "…" : ""}"`);
      files.forEach((f) => console.log(`      ${f}`));
    }
  }
}

main();
