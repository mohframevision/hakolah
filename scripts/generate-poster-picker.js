// أداة لمرة واحدة لتوليد بوستر ترويجي (1080x1080) لميزة "🎲 اختار لي" لأجل انستقرام.
// مو جزء من بناء الموقع — تعتمد على opentype.js وqrcode (مش من ضمن devDependencies):
//   npm install opentype.js qrcode --no-save && node scripts/generate-poster-picker.js
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const QRCode = require("qrcode");
const { fitGlyphInRect } = require("./heh-glyph.js");

const SIZE = 1080;
const PICKER_URL = "https://mohframevision.github.io/hakolah/picker.html";
const outDir =
  "C:\\Users\\Computia.ME\\AppData\\Local\\Temp\\claude\\D-----------\\79ddc704-5480-4e31-b983-b66d3efa52e6\\scratchpad";

function miniIcon(cx, cy, r, icon) {
  return `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.4)" stroke-width="2" />
    <text x="${cx}" y="${cy + r * 0.35}" font-size="${r * 1.1}" text-anchor="middle" fill="#ffffff">${icon}</text>
  `;
}

async function main() {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const qrBuffer = await QRCode.toBuffer(PICKER_URL, {
    width: 150,
    margin: 1,
    color: { dark: "#1d4ed8", light: "#ffffff" },
  });
  const qrBase64 = qrBuffer.toString("base64");

  const logoGlyph = fitGlyphInRect(484, 118, 112, 112);

  const miniIcons = [
    miniIcon(220, 730, 35, "🍽️"),
    miniIcon(380, 730, 35, "🛍️"),
    miniIcon(540, 730, 35, "📍"),
    miniIcon(700, 730, 35, "🥐"),
    miniIcon(860, 730, 35, "🧭"),
  ].join("\n");

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

    <rect x="456" y="90" width="168" height="168" rx="40" fill="#ffffff" />
    <circle cx="586" cy="118" r="14" fill="#f59e0b" />
    <g fill="#2563eb">${logoGlyph}</g>

    <text x="540" y="368" font-family="Tahoma, Arial, sans-serif" font-size="100" font-weight="800" text-anchor="middle" fill="#ffffff">هكوله</text>
    <text x="540" y="423" font-family="Tahoma, Arial, sans-serif" font-size="34" font-weight="600" text-anchor="middle" fill="#dbeafe">محتار وين تروح أو وش تختار؟ 🤔</text>

    <text x="540" y="660" font-size="220" text-anchor="middle">🎲</text>

    ${miniIcons}

    <text x="540" y="800" font-family="Tahoma, Arial, sans-serif" font-size="28" font-weight="700" text-anchor="middle" fill="#ffffff">بضغطة زر وحدة، هكوله يختار لك</text>

    <text x="540" y="850" font-family="Tahoma, Arial, sans-serif" font-size="30" font-weight="700" text-anchor="middle" fill="#ffffff">امسح وجرّب الحين مجاناً</text>

    <rect x="470" y="865" width="140" height="140" rx="18" fill="#ffffff" />
    <image x="485" y="880" width="110" height="110" href="data:image/png;base64,${qrBase64}" />

    <text x="540" y="1045" font-family="Tahoma, Arial, sans-serif" font-size="24" font-weight="600" text-anchor="middle" fill="#dbeafe">hakolah/picker</text>
  </svg>
  `;

  await sharp(Buffer.from(svg), { density: 200 })
    .resize(SIZE, SIZE)
    .png()
    .toFile(path.join(outDir, "poster-instagram-picker.png"));

  console.log("wrote poster-instagram-picker.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
