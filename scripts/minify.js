/*
  خطوة بعد البناء: تصغير مخرجات _site (CSS/JS/HTML) وضغط صور لوحة التحكم
  المرفوعة (src/assets/uploads) لتقليل حجم التحميل. يعمل على مخرجات البناء
  فقط — لا يغيّر أي ملف مصدر تحت src/ (الصورة الأصلية تبقى بالمستودع كما
  رفعها المستخدم)، والتصغير/الضغط يصير مرة وحدة أثناء npm run build.
*/
const fs = require("fs");
const path = require("path");
const CleanCSS = require("clean-css");
const { minify: minifyJs } = require("terser");
const { minify: minifyHtml } = require("html-minifier-terser");
const sharp = require("sharp");

const SITE_DIR = path.join(__dirname, "..", "_site");
const UPLOADS_DIR = path.join(SITE_DIR, "assets", "uploads");
const IMAGE_MAX_WIDTH = 1600;
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

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
  let imageCount = 0;
  let imageBytesBefore = 0;
  let imageBytesAfter = 0;

  for (const file of walk(SITE_DIR)) {
    const ext = path.extname(file).toLowerCase();

    if (file.startsWith(UPLOADS_DIR) && IMAGE_EXTENSIONS.has(ext)) {
      const before = fs.readFileSync(file);
      let pipeline = sharp(before)
        .rotate()
        .resize({ width: IMAGE_MAX_WIDTH, withoutEnlargement: true });

      if (ext === ".jpg" || ext === ".jpeg") {
        pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true });
      } else if (ext === ".png") {
        pipeline = pipeline.png({ quality: 80, compressionLevel: 9 });
      } else if (ext === ".webp") {
        pipeline = pipeline.webp({ quality: 80 });
      }

      const after = await pipeline.toBuffer();
      fs.writeFileSync(file, after);
      imageCount++;
      imageBytesBefore += before.length;
      imageBytesAfter += after.length;
      continue;
    }

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

  const savedMb = ((imageBytesBefore - imageBytesAfter) / 1024 / 1024).toFixed(1);
  console.log(`تصغير ما بعد البناء: ${cssCount} ملف CSS، ${jsCount} ملف JS، ${htmlCount} ملف HTML`);
  if (imageCount > 0) {
    console.log(`ضغط الصور: ${imageCount} صورة، توفير ~${savedMb} ميجابايت`);
  }
}

run();
