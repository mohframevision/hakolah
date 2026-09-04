// أداة لمرة واحدة لتوليد بوستر "وصلنا لـ X عنصر" (1080x1080) لأجل انستقرام —
// نفس ستايل generate-poster.js (خلفية زرقاء متدرجة، شعار هكوله، QR) بس
// بدل حبوب الأقسام، رقم إحصائية كبير + دعوة لزيارة الموقع.
// تعتمد على opentype.js وqrcode (مش من ضمن devDependencies):
//   npm install opentype.js qrcode --no-save && node scripts/generate-poster-milestone.js
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const QRCode = require("qrcode");
const { fitGlyphInRect } = require("./heh-glyph.js");

const SIZE = 1080;
const SITE_URL = "https://mohframevision.github.io/hakolah/";
const COUNT = "+160";
const outDir =
  "C:\\Users\\Computia.ME\\AppData\\Local\\Temp\\claude\\D-----------\\79ddc704-5480-4e31-b983-b66d3efa52e6\\scratchpad";

async function main() {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const qrBuffer = await QRCode.toBuffer(SITE_URL, {
    width: 150,
    margin: 1,
    color: { dark: "#1d4ed8", light: "#ffffff" },
  });
  const qrBase64 = qrBuffer.toString("base64");

  const logoGlyph = fitGlyphInRect(484, 92, 112, 112);

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#1d4ed8" />
        <stop offset="100%" stop-color="#2563eb" />
      </linearGradient>
    </defs>
    <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)" />
    <circle cx="950" cy="120" r="180" fill="#f59e0b" opacity="0.12" />
    <circle cx="80" cy="960" r="220" fill="#f59e0b" opacity="0.10" />

    <rect x="30" y="30" width="230" height="52" rx="26" fill="#f59e0b" />
    <text x="145" y="64" font-family="Tahoma, Arial, sans-serif" font-size="24" font-weight="800" text-anchor="middle" fill="#ffffff">🎉 مجاني بالكامل</text>

    <rect x="456" y="64" width="168" height="168" rx="40" fill="#ffffff" />
    <circle cx="586" cy="92" r="14" fill="#f59e0b" />
    <g fill="#2563eb">${logoGlyph}</g>

    <text x="540" y="342" font-family="Tahoma, Arial, sans-serif" font-size="90" font-weight="800" text-anchor="middle" fill="#ffffff">هكوله</text>

    <rect x="90" y="410" width="900" height="330" rx="36" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.45)" stroke-width="2" />
    <text x="540" y="560" font-family="Tahoma, Arial, sans-serif" font-size="190" font-weight="900" text-anchor="middle" fill="#f59e0b">${COUNT}</text>
    <text x="540" y="630" font-family="Tahoma, Arial, sans-serif" font-size="42" font-weight="700" text-anchor="middle" fill="#ffffff">محل ومطعم ومكان حقيقي بالبحرين</text>
    <text x="540" y="690" font-family="Tahoma, Arial, sans-serif" font-size="34" font-weight="600" text-anchor="middle" fill="#dbeafe">كل شيء مفيد… في مكان واحد</text>

    <text x="540" y="840" font-family="Tahoma, Arial, sans-serif" font-size="32" font-weight="700" text-anchor="middle" fill="#ffffff">امسح وزُر الموقع مجاناً</text>

    <rect x="470" y="855" width="140" height="140" rx="18" fill="#ffffff" />
    <image x="485" y="870" width="110" height="110" href="data:image/png;base64,${qrBase64}" />

    <text x="540" y="1035" font-family="Tahoma, Arial, sans-serif" font-size="24" font-weight="600" text-anchor="middle" fill="#dbeafe">hakolah</text>
  </svg>
  `;

  await sharp(Buffer.from(svg), { density: 200 })
    .resize(SIZE, SIZE)
    .png()
    .toFile(path.join(outDir, "poster-milestone-160.png"));

  console.log("wrote poster-milestone-160.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
