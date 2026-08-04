/*
  يحوّل ملف Markdown عربي إلى PDF عبر كروم بدون واجهة.

  التشغيل:  node scripts/md-to-pdf.js "دروس-التجربة.md"

  لماذا كروم لا مكتبة PDF: تنسيق العربي من اليمين لليسار وتشكيل الحروف
  ووصلها مسألة معقّدة تحلّها محرّكات المتصفحات وحدها بشكل صحيح. مكتبات
  PDF الخفيفة تُخرج حروفاً منفصلة أو مقلوبة.
*/
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const MarkdownIt = require("markdown-it");

const CHROME_CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  process.env.LOCALAPPDATA + "/Google/Chrome/Application/chrome.exe",
];

const CSS = `
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Segoe UI", "Tahoma", "Arial", sans-serif;
    direction: rtl; text-align: right;
    line-height: 1.85; color: #16181d; font-size: 11.5pt;
    margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  h1, h2, h3, h4 { line-height: 1.4; margin: 1.6em 0 .6em; page-break-after: avoid; }
  h1 { font-size: 22pt; color: #0f3d6e; border-bottom: 3px solid #0f3d6e; padding-bottom: .25em; }
  h2 { font-size: 16pt; color: #0f3d6e; border-bottom: 1px solid #cfd8e3; padding-bottom: .2em; margin-top: 2em; }
  h3 { font-size: 13pt; color: #1f2937; }
  h1 + h2, h2 + h3 { margin-top: .8em; }
  p, li { orphans: 3; widows: 3; }
  ul, ol { padding-right: 1.4em; padding-left: 0; }
  li { margin: .3em 0; }
  strong { color: #0b2a4a; }
  hr { border: 0; border-top: 1px solid #d5dbe3; margin: 2.2em 0; }
  blockquote {
    border-right: 4px solid #0f3d6e; border-left: 0;
    background: #eef4fa; margin: 1.2em 0; padding: .7em 1.1em;
    page-break-inside: avoid;
  }
  blockquote p { margin: .35em 0; }
  table {
    border-collapse: collapse; width: 100%; margin: 1.1em 0;
    font-size: 10.5pt; page-break-inside: avoid;
  }
  th, td { border: 1px solid #c3ccd8; padding: 7px 10px; text-align: right; vertical-align: top; }
  th { background: #0f3d6e; color: #fff; font-weight: 700; }
  tbody tr:nth-child(even) { background: #f4f7fa; }
  code {
    font-family: Consolas, "Courier New", monospace; direction: ltr;
    background: #eef1f5; padding: 1px 5px; border-radius: 3px; font-size: .9em;
  }
  a { color: #0f3d6e; }
  /* قوائم المهام بالملحق */
  li input[type="checkbox"] { margin-left: .5em; }
`;

function findChrome() {
  const hit = CHROME_CANDIDATES.find((p) => p && fs.existsSync(p));
  if (!hit) throw new Error("ما لقيت كروم. عدّل CHROME_CANDIDATES بالسكربت.");
  return hit;
}

function main() {
  const input = process.argv[2];
  if (!input) {
    console.error('الاستخدام: node scripts/md-to-pdf.js "اسم-الملف.md"');
    process.exit(1);
  }
  const src = path.resolve(input);
  if (!fs.existsSync(src)) throw new Error("ما لقيت الملف: " + src);

  const md = new MarkdownIt({ html: true, linkify: true, typographer: false });
  let body = md.render(fs.readFileSync(src, "utf8"));
  // markdown-it ما يحوّل "- [ ]" لمربعات — نحوّلها يدوياً لتظهر بالملحق
  body = body
    .replace(/<li>\[ \]\s*/g, '<li><input type="checkbox" disabled> ')
    .replace(/<li>\[x\]\s*/gi, '<li><input type="checkbox" checked disabled> ');

  const title = path.basename(src, ".md");
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<title>${title}</title><style>${CSS}</style></head><body>${body}</body></html>`;

  const tmpHtml = path.join(path.dirname(src), `.${title}.tmp.html`);
  const out = path.join(path.dirname(src), `${title}.pdf`);
  fs.writeFileSync(tmpHtml, html, "utf8");

  const chrome = spawn(findChrome(), [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--no-pdf-header-footer",
    `--print-to-pdf=${out}`,
    "file:///" + tmpHtml.replace(/\\/g, "/"),
  ]);

  chrome.on("exit", (code) => {
    fs.unlinkSync(tmpHtml);
    if (code !== 0 || !fs.existsSync(out)) {
      console.error("فشل التحويل (رمز " + code + ")");
      process.exit(1);
    }
    console.log("الناتج :", out);
    console.log("الحجم  :", (fs.statSync(out).size / 1024).toFixed(0), "كيلوبايت");
  });
}

main();
