// فاحص جودة بيانات العناصر — يكشف النواقص قبل ما تتراكم.
// ليس بوّابة تمنع البناء (بعكس check-i18n-parity): المحتوى ينمو تدريجياً
// وكثير من النواقص مقصودة أو مؤجّلة، فالهدف قائمة عمل واضحة لا رفض النشر.
//   node scripts/check-data-quality.js            ملخّص لكل الأقسام
//   node scripts/check-data-quality.js cafes      تفاصيل قسم واحد
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "src");
const MIN_DESC = 25;

/* الأقسام التحريرية (مقالات وأدوات وتجارب) ليست محلات: لا هاتف لها ولا
   خريطة، فمطالبتها بوسيلة تواصل تُنتج ضجيجاً يُخفي النواقص الحقيقية */
const EDITORIAL = new Set(["guides", "links-tools", "ai-experiments"]);
/* الإحداثيات وسيلة تحديد موقع صحيحة بذاتها — المعالم (قلعة، شاطئ، ممشى)
   ما لها هاتف ولا حساب، لكن lat/lng يحدّدها تماماً */
const CONTACT_FIELDS = ["maps", "phone", "instagram", "website", "linktree", "whatsapp", "url", "lat", "coords"];

function frontMatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : "";
}

// يسمح بمسافة بادئة: حقول التواصل متداخلة تحت links: بملفات العناصر
function fieldValue(fm, name) {
  const m = fm.match(new RegExp(`(^|\\n)[ \\t]*${name}:[ \\t]*(.*)`));
  return m ? m[2].trim().replace(/^["']|["']$/g, "") : "";
}

function auditSection(slug) {
  const dir = path.join(SRC, slug);
  if (!fs.existsSync(dir)) return null;
  const editorial = EDITORIAL.has(slug);
  const issues = [];

  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const fm = frontMatter(fs.readFileSync(path.join(dir, file), "utf8"));
    const problems = [];

    if (!fieldValue(fm, "title")) problems.push("بلا عنوان");
    const desc = fieldValue(fm, "desc");
    if (!desc) problems.push("بلا وصف");
    else if (desc.length < MIN_DESC) problems.push(`وصف قصير (${desc.length} حرفاً)`);

    if (!/(^|\n)categories:/.test(fm) && !/(^|\n)categoriesCustom:/.test(fm)) problems.push("بلا تصنيف");

    if (!editorial) {
      const hasContact = CONTACT_FIELDS.some((f) => fieldValue(fm, f));
      if (!hasContact) problems.push("بلا وسيلة تواصل");
    }

    if (problems.length) issues.push({ file, problems });
  }
  return issues;
}

/* جمل اختبار الكتابة: أي حركة (شدّة/ضمّة/تنوين) تجعل الجملة غير قابلة
   للمطابقة عملياً — المستخدم لا يكتب الحركات، فتظهر أخطاء حمراء دائمة.
   يُفحص هنا لأن الخلل لا يظهر إلا بتجربة الاختبار فعلياً. */
function checkTypingSentences() {
  const mainJs = path.join(__dirname, "..", "src", "js", "main.js");
  if (!fs.existsSync(mainJs)) return;
  const src = fs.readFileSync(mainJs, "utf8");
  const diacritics = /[ً-ْٰ]/;
  const shiftLetters = /[أإآؤئءةى]/g;
  const rows = [];
  const flagged = [];

  for (const level of ["beginner", "easy", "medium", "hard"]) {
    const start = src.indexOf(`    ${level}: [`);
    if (start === -1) continue;
    const sentences = [...src.slice(start, src.indexOf("],", start)).matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    sentences.forEach((s) => {
      if (diacritics.test(s)) flagged.push(s);
    });
    rows.push({
      المستوى: level,
      عدد: sentences.length,
      "متوسط الطول": Math.round(sentences.reduce((a, s) => a + s.length, 0) / sentences.length),
      // كثافة الحروف التي تحتاج Shift هي مقياس الصعوبة الفعلي بالعربية
      "حروف Shift": +(sentences.reduce((a, s) => a + (s.match(shiftLetters) || []).length, 0) / sentences.length).toFixed(1),
    });
  }

  console.log("\nجمل اختبار الكتابة:");
  console.table(rows);
  if (!flagged.length) {
    console.log("  ✅ كلها بلا حركات — قابلة للكتابة الطبيعية");
    return;
  }
  console.log(`  ⚠️  ${flagged.length} فيها حركات تمنع المطابقة:`);
  flagged.forEach((s) => console.log(`     ${s}`));
}

function main() {
  const only = process.argv[2];
  const sections = fs
    .readdirSync(path.join(SRC, "sections"))
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""))
    .filter((s) => !only || s === only);

  if (!sections.length) {
    console.error(`ما فيه قسم اسمه "${only}"`);
    process.exit(1);
  }

  let totalItems = 0;
  let totalFlagged = 0;
  const summary = [];

  for (const slug of sections) {
    const issues = auditSection(slug);
    if (issues === null) continue;
    const count = fs.readdirSync(path.join(SRC, slug)).filter((f) => f.endsWith(".md")).length;
    totalItems += count;
    totalFlagged += issues.length;
    summary.push({ القسم: slug, العدد: count, "يحتاج عملاً": issues.length });

    if (only && issues.length) {
      console.log(`\n== ${slug} ==`);
      for (const item of issues) console.log(`  ${item.file}: ${item.problems.join("، ")}`);
    }
  }

  if (!only) {
    console.table(summary);
    checkTypingSentences();
  }
  const clean = totalItems - totalFlagged;
  console.log(`\nالمجموع: ${totalItems} عنصراً — ${clean} مكتمل، ${totalFlagged} يحتاج عملاً.`);
  if (!only && totalFlagged) console.log("للتفاصيل: node scripts/check-data-quality.js <اسم القسم>");
}

main();
