// فحص SEO دائم — يُشغَّل بكل تشغيل يدور فيه التناوب على زاوية SEO
// الاستخدام: node scripts/check-seo.js [مجلد _site]
const fs = require("fs");
const path = require("path");

const SITE = process.argv[2] || "_site";
// المسار الأساسي كما بـ.eleventy.js (pathPrefix) — تحتاج لتبقى مطابقة لو تغيّر هناك
const BASE_PREFIX = "/hakolah";

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name.endsWith(".html")) out.push(p);
  }
  return out;
}

const files = walk(SITE);
const titles = new Map();
const descs = new Map();
const issues = [];

for (const f of files) {
  const html = fs.readFileSync(f, "utf8");
  const rel = path.relative(SITE, f);

  const titleMatch = html.match(/<title>([^<]*)<\/title>/);
  const title = titleMatch ? titleMatch[1].trim() : null;
  const descMatch = html.match(/<meta name="description" content="([^"]*)"/);
  const desc = descMatch ? descMatch[1].trim() : null;
  const canonicalMatch = html.match(/<link rel="canonical" href="([^"]*)"/);
  const h1Count = (html.match(/<h1[ >]/g) || []).length;
  const noindex = /<meta name="robots" content="noindex/.test(html);

  if (!title) issues.push(`${rel}: بلا <title>`);
  else {
    if (title.length > 60) issues.push(`${rel}: عنوان طويل (${title.length} حرف): "${title}"`);
    if (!titles.has(title)) titles.set(title, []);
    titles.get(title).push(rel);
  }

  if (!noindex) {
    if (!desc) issues.push(`${rel}: بلا meta description`);
    else {
      if (desc.length > 160) issues.push(`${rel}: وصف طويل (${desc.length} حرف)`);
      if (desc.length < 50) issues.push(`${rel}: وصف قصير جداً (${desc.length} حرف): "${desc}"`);
      if (!descs.has(desc)) descs.set(desc, []);
      descs.get(desc).push(rel);
    }
    if (!canonicalMatch) issues.push(`${rel}: بلا canonical`);
    if (h1Count === 0) issues.push(`${rel}: بلا أي h1`);
    if (h1Count > 1) issues.push(`${rel}: أكثر من h1 واحد (${h1Count})`);
  }
}

console.log(`فُحص ${files.length} صفحة\n`);

const dupTitles = [...titles.entries()].filter(([, v]) => v.length > 1);
const dupDescs = [...descs.entries()].filter(([, v]) => v.length > 1);

console.log(`== عناوين مكررة بين صفحات مختلفة: ${dupTitles.length} ==`);
for (const [t, files] of dupTitles.slice(0, 20)) {
  console.log(`  "${t}" -> ${files.join(", ")}`);
}

console.log(`\n== أوصاف meta مكررة بين صفحات مختلفة: ${dupDescs.length} ==`);
for (const [d, files] of dupDescs.slice(0, 20)) {
  console.log(`  "${d.slice(0, 60)}..." -> ${files.join(", ")}`);
}

console.log(`\n== مشاكل أخرى: ${issues.length} ==`);
for (const i of issues.slice(0, 60)) console.log(`  ${i}`);
if (issues.length > 60) console.log(`  ... و${issues.length - 60} أخرى`);
// فحص روابط داخلية مكسورة (href/src تبدأ بـBASE_PREFIX وتشير لملف غير موجود فعلياً بـ_site)
function internalLinkExists(hrefPath) {
  let clean = hrefPath.split("#")[0].split("?")[0];
  if (clean.startsWith(BASE_PREFIX)) clean = clean.slice(BASE_PREFIX.length);
  if (clean === "" || clean === "/") return true;
  const fsPath = path.join(SITE, decodeURIComponent(clean));
  if (fs.existsSync(fsPath)) return true;
  if (fs.existsSync(path.join(fsPath, "index.html"))) return true;
  return false;
}

const brokenLinksByFile = new Map();
for (const f of files) {
  const html = fs.readFileSync(f, "utf8");
  const rel = path.relative(SITE, f);
  const hrefs = [...html.matchAll(/(?:href|src)="(\/[^"]*)"/g)].map((m) => m[1]);
  for (const href of hrefs) {
    if (href.startsWith("//")) continue; // protocol-relative (خارجي)
    if (!href.startsWith(BASE_PREFIX)) continue; // رابط خارج نطاق الموقع، ليس شأننا هنا
    if (!internalLinkExists(href)) {
      if (!brokenLinksByFile.has(rel)) brokenLinksByFile.set(rel, new Set());
      brokenLinksByFile.get(rel).add(href);
    }
  }
}

console.log(`\n== روابط داخلية مكسورة: ${brokenLinksByFile.size} صفحة متأثرة ==`);
for (const [rel, links] of [...brokenLinksByFile.entries()].slice(0, 30)) {
  console.log(`  ${rel} -> ${[...links].join(", ")}`);
}
