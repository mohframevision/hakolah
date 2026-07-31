/*
  خطوة بعد البناء: تصغير مخرجات _site (CSS/JS/HTML) لتقليل حجم التحميل.
  يعمل على مخرجات البناء فقط — لا يغيّر أي ملف مصدر تحت src/، فالكود المصدري
  يبقى مقروءاً وسهل الصيانة، والتصغير يصير مرة وحدة أثناء npm run build.
*/
const fs = require("fs");
const path = require("path");
const CleanCSS = require("clean-css");
const { minify: minifyJs } = require("terser");
const { minify: minifyHtml } = require("html-minifier-terser");

const SITE_DIR = path.join(__dirname, "..", "_site");

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

async function run() {
  if (!fs.existsSync(SITE_DIR)) {
    console.error("لا يوجد مجلد _site — شغّل npm run build أولاً");
    process.exit(1);
  }

  let cssCount = 0;
  let jsCount = 0;
  let htmlCount = 0;

  for (const file of walk(SITE_DIR)) {
    const ext = path.extname(file);

    if (ext === ".css") {
      const src = fs.readFileSync(file, "utf8");
      const result = new CleanCSS({}).minify(src);
      if (result.errors.length) {
        console.error(`تعذّر تصغير ${file}:`, result.errors);
        continue;
      }
      fs.writeFileSync(file, result.styles);
      cssCount++;
      continue;
    }

    if (ext === ".js") {
      const src = fs.readFileSync(file, "utf8");
      const result = await minifyJs(src, { format: { comments: false } });
      if (result.code) {
        fs.writeFileSync(file, result.code);
        jsCount++;
      }
      continue;
    }

    if (ext === ".html") {
      const src = fs.readFileSync(file, "utf8");
      const result = await minifyHtml(src, {
        collapseWhitespace: true,
        removeComments: true,
        minifyCSS: true,
        minifyJS: true,
      });
      fs.writeFileSync(file, result);
      htmlCount++;
    }
  }

  console.log(`تصغير ما بعد البناء: ${cssCount} ملف CSS، ${jsCount} ملف JS، ${htmlCount} ملف HTML`);
}

run();
