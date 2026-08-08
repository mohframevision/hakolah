/*
  فاحص تطابق النسختين العربية والإنجليزية — يُشغَّل بعد البناء (npm run check:i18n).

  الهدف: ما يصير أبداً إن النسخة الإنجليزية تنقص شي موجود بالعربية (أو العكس)
  بدون ما نلاحظ. الفحص يغطي أربع طبقات، لأن كل وحدة منها انكسرت فعلياً بمرحلة
  ما أثناء بناء النسخة الإنجليزية:

    1. تطابق الصفحات   — كل صفحة عربية لها مقابل إنجليزي والعكس.
    2. تطابق البنية    — نفس العناصر (ids/classes) ونفس سكربتات التشغيل بكل زوج
                         صفحات، عشان ما تنقص ميزة (كاروسيل، شريط تقدّم، إعلان...).
    3. ترجمة المحتوى   — كل عنصر عنده title_en/desc_en، وكل تصنيف مستخدم له ترجمة.
    4. تسرّب اللغة     — ما فيه نص عربي ظاهر بأي صفحة إنجليزية.

  يرجع exit code 1 لو فيه أي فرق، عشان يوقف الـ CI بدل ما يمر بصمت.
*/
const fs = require("fs");
const path = require("path");

const SITE = "_site";
const ARABIC = /[؀-ۿ]/;

let failures = 0;
function fail(msg) {
  failures++;
  console.log("  FAIL " + msg);
}
function section(name) {
  console.log("\n== " + name);
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}

const rel = (f) =>
  f
    .split(path.sep)
    .join("/")
    .replace(SITE + "/", "");

// صفحات مستثناة عمداً من مبدأ "لكل صفحة نسخة بلغتين":
//   admin  — لوحة تحكم Sveltia (واجهة الأداة نفسها، مو محتوى موقع)
//   404    — GitHub Pages يخدم ملف واحد لكل الموقع، واللغة تُكتشف بجافاسكربت
const EXCLUDED = new Set(["admin/index.html", "404.html"]);

// أسماء ملفات إنجليزية تختلف عن مقابلها العربي (لما اسم الملف العربي بالعربي)
const SLUG_ALIASES = {
  "places/ممشى-توبلي.html": "places/tubli-bay-walkway.html",
  "restaurants/مطعم-الجابرية.html": "restaurants/al-jabriya-restaurant.html",
  "restaurants/معجنات-آدم.html": "restaurants/adam-pastries.html",
  "bakeries/مخابز-المنار.html": "bakeries/al-manar-bakeries.html",
  "bakeries/ميلتوز.html": "bakeries/meltose.html",
};

const allHtml = walk(SITE)
  .filter((f) => f.endsWith(".html"))
  .map(rel);
const arPages = allHtml.filter((f) => !f.startsWith("en/") && !EXCLUDED.has(f));
const enPages = allHtml.filter((f) => f.startsWith("en/")).map((f) => f.slice(3));

section("1. تطابق الصفحات (page parity)");
const expectedEn = arPages.map((f) => SLUG_ALIASES[f] || f);
for (const p of expectedEn) {
  if (!enPages.includes(p)) fail("الصفحة الإنجليزية ناقصة: en/" + p);
}
for (const p of enPages) {
  if (!expectedEn.includes(p)) fail("صفحة إنجليزية بلا مقابل عربي: en/" + p);
}
console.log(`  فُحص ${arPages.length} زوج صفحات`);

section("2. تطابق البنية (structural parity)");
function signature(file) {
  const h = fs.readFileSync(path.join(SITE, file), "utf8");
  return {
    ids: new Set([...h.matchAll(/id="([^"]+)"/g)].map((m) => m[1])),
    classes: new Set(
      [...h.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean)
    ),
    scripts: new Set(
      [...h.matchAll(/>\s*(render\w+\(\)|init\w+\(\)|renderSection\("[^"]+"\))/g)].map((m) => m[1])
    ),
    navLinks: ((h.match(/<nav class="main-nav"[\s\S]*?<\/nav>/) || [""])[0].match(/<a /g) || [])
      .length,
    sectionCards: (h.match(/class="section-card/g) || []).length,
  };
}
for (const ar of arPages) {
  const en = "en/" + (SLUG_ALIASES[ar] || ar);
  if (!fs.existsSync(path.join(SITE, en))) continue;
  const A = signature(ar);
  const B = signature(en);
  const diff = (a, b, label) => {
    const missing = [...a].filter((x) => !b.has(x));
    if (missing.length) fail(`${en}: ${label} ناقصة بالإنجليزي: ${missing.join(", ")}`);
  };
  diff(A.ids, B.ids, "ids");
  diff(A.classes, B.classes, "classes");
  diff(A.scripts, B.scripts, "scripts");
  diff(B.ids, A.ids, "ids (زائدة بالإنجليزي)");
  diff(B.classes, A.classes, "classes (زائدة بالإنجليزي)");
  if (A.navLinks !== B.navLinks)
    fail(`${en}: عدد روابط القائمة مختلف (ar=${A.navLinks} en=${B.navLinks})`);
  if (A.sectionCards !== B.sectionCards)
    fail(`${en}: عدد بطاقات الأقسام مختلف (ar=${A.sectionCards} en=${B.sectionCards})`);
}

section("3. ترجمة المحتوى (content translation)");
const dataJs = fs.readFileSync(path.join(SITE, "js/data.js"), "utf8");
// data.js يعرّف `const SITE_DATA = {...}` — نحوّله لتعبير يرجع الكائن مباشرة
// (eval عادي ما يسرّب const للنطاق الخارجي)
const SITE_DATA = new Function(dataJs + "\nreturn SITE_DATA;")();
// قاموس ترجمة التصنيفات — مصدر واحد يستخدمه القوالب وقت البناء وmain.js بالمتصفح
const TAGS_EN = require(path.resolve("src/_data/tags_en.js"));
let items = 0;
const untranslatedTags = new Set();
for (const [slug, sec] of Object.entries(SITE_DATA)) {
  if (!sec.title_en) fail(`القسم "${slug}" بلا title_en`);
  for (const item of sec.items) {
    items++;
    if (!item.title_en) fail(`${slug}/${item.id}: بلا title_en`);
    if (item.desc && !item.desc_en) fail(`${slug}/${item.id}: بلا desc_en`);
    if (item.cta && !item.cta_en) fail(`${slug}/${item.id}: عنده cta عربي بلا cta_en`);
    for (const tag of item.tags || []) {
      if (!TAGS_EN[tag]) untranslatedTags.add(tag);
    }
  }
}
for (const tag of untranslatedTags) fail(`تصنيف بلا ترجمة بـ src/_data/tags_en.js: "${tag}"`);
console.log(`  فُحص ${items} عنصر`);

section("4. عناصر فاضية (نص مفقود)");
/*
  يكشف عنصر ظاهر انطبع فاضي — غالباً بسبب متغيّر Nunjucks غير معرّف بهذا
  النطاق (مثلاً استخدام t داخل قالب محتوى بدون ما يعرّفه، لأن t المعرّف
  بـ base.njk مو متاح للقوالب الأبناء). هذا النوع من الأخطاء ما يكسر البناء
  ولا يظهر بفحص البنية (العنصر موجود!) — يظهر بس كنص ناقص بالصفحة.
*/
const MUST_HAVE_TEXT = ["h1", "h3", "button", "label"];
for (const p of allHtml) {
  if (EXCLUDED.has(p)) continue;
  const h = fs.readFileSync(path.join(SITE, p), "utf8");
  for (const tag of MUST_HAVE_TEXT) {
    const re = new RegExp(`<${tag}(\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "g");
    for (const m of h.matchAll(re)) {
      const attrs = m[1] || "";
      // أزرار الإغلاق/الأيقونات تعتمد على aria-label بدل نص ظاهر، ونحترم ذلك
      if (/aria-label=/.test(attrs) && tag === "button") continue;
      if (/\bid="(cookie-accept|notifyToggle)"/.test(attrs)) continue;
      const inner = m[2]
        .replace(/<[^>]+>/g, "")
        .replace(/&[a-z]+;/g, "x")
        .trim();
      if (!inner) fail(`${p}: عنصر <${tag}> فاضي بلا نص${attrs ? " —" + attrs.trim() : ""}`);
    }
  }
}
console.log(`  فُحص ${allHtml.length - EXCLUDED.size} صفحة`);

section("5. تسرّب اللغة العربية للصفحات الإنجليزية");
for (const p of enPages) {
  const file = path.join(SITE, "en", p);
  let h = fs.readFileSync(file, "utf8");
  // مناطق العربي فيها مشروع: سكربتات (بيانات المصدر)، وسوم <link>/<meta>
  // (روابط hreflang تشير للصفحات العربية)، وزر تبديل اللغة (نصه "العربية" عمداً)
  h = h
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<link[^>]*>/g, "")
    .replace(/<meta[^>]*>/g, "")
    .replace(/<a class="lang-switch"[^>]*>[\s\S]*?<\/a>/g, "");
  const words = h
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter((w) => ARABIC.test(w));
  if (words.length)
    fail(`en/${p}: نص عربي ظاهر -> ${[...new Set(words)].slice(0, 10).join(" | ")}`);
}
console.log(`  فُحص ${enPages.length} صفحة إنجليزية`);

console.log(
  "\n" +
    (failures === 0
      ? "OK - النسختان متطابقتان بالكامل، ما فيه أي فرق"
      : `FAIL - ${failures} فرق/نقص بين النسختين`)
);
process.exit(failures === 0 ? 0 : 1);
