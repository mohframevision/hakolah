// فحص اكتمال الخريطة (sitemap) دائم — يُشغَّل بكل تشغيل يدور فيه التناوب على
// زاوية SEO. اكتُشفت الحاجة له يدوياً (2026-10-07): صفحات car-shop-type
// (car-shops/tires.html وأخواتها) كانت مفقودة بالكامل من sitemap.xml/sitemap-v2.xml
// بصمت — بلا أي أداة تكتشف هذا النوع من الفجوة (check-seo.js يفحص كل صفحة
// منفردة، لا يقارن الخريطة بقائمة الصفحات الفعلية). هذا السكربت يسد الفجوة.
//
// الاستخدام: node scripts/check-sitemap.js [مجلد _site]
//
// يقارن: كل ملف .html فعلي غير noindex وغير admin/ (صفحة "يجب أن تُفهرَس")
// مقابل كل رابط موجود فعلاً بكل ملف sitemap*.xml بجذر _site — يبلغ عن:
//   ناقصة: صفحة indexable موجودة على القرص لكن غائبة عن ملف خريطة معيّن
//   يتيمة: رابط بالخريطة لا يقابله ملف .html فعلي على القرص (رابط مكسور بالخريطة)
const fs = require("fs");
const path = require("path");

const SITE = process.argv[2] || "_site";

function walkHtml(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(p, out);
    else if (entry.name.endsWith(".html")) out.push(p);
  }
  return out;
}

const allHtmlFiles = walkHtml(SITE);

const indexablePages = new Set();
for (const f of allHtmlFiles) {
  const rel = path.relative(SITE, f).split(path.sep).join("/");
  if (rel === "admin/index.html" || rel.startsWith("admin/")) continue;
  const html = fs.readFileSync(f, "utf8");
  const isNoindex = /<meta\s+name="robots"[^>]*noindex/i.test(html);
  if (isNoindex) continue;
  // index.html الجذر يُمثَّل بالخريطة كـ "/" لا "index.html"
  indexablePages.add(rel === "index.html" ? "" : rel);
}

const sitemapFiles = fs
  .readdirSync(SITE)
  .filter((f) => /^sitemap.*\.xml$/i.test(f));

if (sitemapFiles.length === 0) {
  console.log("لا يوجد أي ملف sitemap*.xml بمجلد " + SITE);
  process.exit(0);
}

let hadIssue = false;

for (const sf of sitemapFiles) {
  const xml = fs.readFileSync(path.join(SITE, sf), "utf8");
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const urlPaths = new Set(
    locs.map((loc) => {
      const noDomain = loc.replace(/^https?:\/\/[^/]+\/?/, "");
      try {
        return decodeURI(noDomain);
      } catch {
        return noDomain;
      }
    }),
  );

  const missing = [...indexablePages].filter((p) => !urlPaths.has(p)).sort();
  const orphans = [...urlPaths]
    .filter((p) => p && !allHtmlFiles.some((f) => path.relative(SITE, f).split(path.sep).join("/") === p))
    .sort();

  console.log(`\n== ${sf}: ${locs.length} رابط، ${indexablePages.size} صفحة قابلة للفهرسة فعلياً ==`);
  if (missing.length === 0) {
    console.log("  OK — كل الصفحات القابلة للفهرسة موجودة بالخريطة");
  } else {
    hadIssue = true;
    console.log(`  ناقصة من الخريطة (${missing.length}):`);
    for (const m of missing) console.log(`    ${m || "/"}`);
  }
  if (orphans.length > 0) {
    hadIssue = true;
    console.log(`  روابط يتيمة بالخريطة بلا ملف فعلي (${orphans.length}):`);
    for (const o of orphans) console.log(`    ${o}`);
  }
}

if (!hadIssue) console.log("\nكل ملفات sitemap*.xml مطابقة لقائمة الصفحات الفعلية القابلة للفهرسة.");
