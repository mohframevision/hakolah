// أداة لمرة واحدة لتوليد الأيقونات وصورة og-image من ملفات الـ SVG المصدرية.
// sharp و opentype.js مش من ضمن devDependencies (تُستخدمان فقط عند الحاجة لإعادة توليد الصور):
//   npm install sharp opentype.js --no-save && node scripts/generate-icons.js
// (opentype.js مطلوبة من heh-glyph.js لاستخراج شكل حرف "ه" كمسار ثابت بخط Kufi)
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const assetsDir = path.join(__dirname, "..", "src", "assets");

async function main() {
  const favicon = fs.readFileSync(path.join(assetsDir, "favicon.svg"));
  const iconSquare = fs.readFileSync(path.join(assetsDir, "icon-square.svg"));
  const iconMaskable = fs.readFileSync(path.join(assetsDir, "icon-maskable.svg"));
  const ogSource = fs.readFileSync(path.join(assetsDir, "og-source.svg"));

  const jobs = [
    { buf: favicon, size: 32, out: "favicon-32x32.png" },
    { buf: favicon, size: 16, out: "favicon-16x16.png" },
    { buf: iconSquare, size: 180, out: "apple-touch-icon.png" },
    { buf: iconSquare, size: 192, out: "android-chrome-192x192.png" },
    { buf: iconSquare, size: 512, out: "android-chrome-512x512.png" },
    // نسخ maskable منفصلة — أندرويد يقصّ الأيقونة بأشكال مختلفة
    { buf: iconMaskable, size: 192, out: "maskable-192x192.png" },
    { buf: iconMaskable, size: 512, out: "maskable-512x512.png" },
  ];

  for (const job of jobs) {
    await sharp(job.buf, { density: 384 })
      .resize(job.size, job.size)
      .png()
      .toFile(path.join(assetsDir, job.out));
    console.log("wrote", job.out);
  }

  await sharp(ogSource, { density: 96 })
    .resize(1200, 630)
    .png()
    .toFile(path.join(assetsDir, "og-image.png"));
  console.log("wrote og-image.png");

  // favicon.ico مع صورتين PNG (16 و32) — صيغة مدعومة منذ ويندوز فيستا وبكل المتصفحات الحديثة
  const png16 = fs.readFileSync(path.join(assetsDir, "favicon-16x16.png"));
  const png32 = fs.readFileSync(path.join(assetsDir, "favicon-32x32.png"));
  const images = [
    { size: 16, data: png16 },
    { size: 32, data: png32 },
  ];

  const headerSize = 6 + images.length * 16;
  let offset = headerSize;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.size === 256 ? 0 : img.size, 0); // width
    entry.writeUInt8(img.size === 256 ? 0 : img.size, 1); // height
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bit depth
    entry.writeUInt32LE(img.data.length, 8); // size of image data
    entry.writeUInt32LE(offset, 12); // offset
    offset += img.data.length;
    entries.push(entry);
  }

  const ico = Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
  fs.writeFileSync(path.join(assetsDir, "favicon.ico"), ico);
  console.log("wrote favicon.ico");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
