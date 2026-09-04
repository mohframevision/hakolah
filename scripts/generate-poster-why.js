// أداة لمرة واحدة لتوليد بوستر "ليش هكوله؟" (1080x1080) — نفس ستايل
// البوسترات السابقة، يشرح سبب استخدام الموقع بنقاط مختصرة.
// راعى قواعد اللغة المحفوظة بالذاكرة: بلا مصطلح إنجليزي وسط جملة عربية،
// "+" قبل الرقم، إملاء صحيح ("زُر" لا "زور")، وكل جملة إلها معنى واضح لحالها.
// مو جزء من بناء الموقع — تعتمد على opentype.js وqrcode (مش من devDependencies):
//   npm install opentype.js qrcode --no-save && node scripts/generate-poster-why.js
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const QRCode = require("qrcode");
const { fitGlyphInRect } = require("./heh-glyph.js");

const SIZE = 1080;
const SITE_URL = "https://mohframevision.github.io/hakolah/";
const outDir =
  "C:\\Users\\Computia.ME\\AppData\\Local\\Temp\\claude\\D-----------\\79ddc704-5480-4e31-b983-b66d3efa52e6\\scratchpad";

const FONT = "Tahoma, Arial, sans-serif";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const REASONS = [
  ["🆓", "مجاني بالكامل، بدون أي تسجيل"],
  ["✅", "أماكن حقيقية اتحقّقنا منها، مو حشو"],
  ["🗂️", "كل شي مرتب بتصنيفات وأقسام واضحة"],
  ["🎲", "محتار وين تروح؟ ميزة اختار لي تختار لك"],
  ["❤️", "تحفظ مفضلتك بدون ما تسوي حساب"],
];

function reasonRow(icon, text, y) {
  const iconX = 900;
  const textX = 840;
  return `
    <circle cx="${iconX}" cy="${y}" r="32" fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.38)" stroke-width="2" />
    <text x="${iconX}" y="${y + 12}" font-size="34" text-anchor="middle">${icon}</text>
    <text x="${textX}" y="${y + 11}" font-family="${FONT}" font-size="28" font-weight="600"
          text-anchor="start" fill="#eaf1ff" direction="rtl">${esc(text)}</text>
  `;
}

async function main() {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const qrBuffer = await QRCode.toBuffer(SITE_URL, {
    width: 150,
    margin: 1,
    color: { dark: "#1d4ed8", light: "#ffffff" },
  });
  const qrBase64 = qrBuffer.toString("base64");

  const logoGlyph = fitGlyphInRect(490, 140, 100, 100);
  const rows = REASONS.map((r, i) => reasonRow(r[0], r[1], 474 + i * 76)).join("\n");

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
    <text x="145" y="64" font-family="${FONT}" font-size="24" font-weight="800" text-anchor="middle" fill="#ffffff">🎉 مجاني بالكامل</text>

    <rect x="490" y="140" width="100" height="100" rx="26" fill="#ffffff" />
    <circle cx="574" cy="156" r="9" fill="#f59e0b" />
    <g fill="#2563eb">${logoGlyph}</g>

    <text x="540" y="350" font-family="${FONT}" font-size="76" font-weight="800" text-anchor="middle" fill="#ffffff">ليش هكوله؟</text>
    <text x="540" y="398" font-family="${FONT}" font-size="30" font-weight="600" text-anchor="middle" fill="#dbeafe" direction="rtl">5 أسباب تخلّيك تجرّبه الحين</text>

    ${rows}

    <text x="540" y="858" font-family="${FONT}" font-size="30" font-weight="700" text-anchor="middle" fill="#ffffff">امسح وزُر الموقع مجاناً</text>

    <rect x="470" y="876" width="140" height="140" rx="18" fill="#ffffff" />
    <image x="485" y="891" width="110" height="110" href="data:image/png;base64,${qrBase64}" />

    <text x="540" y="1042" font-family="${FONT}" font-size="24" font-weight="600" text-anchor="middle" fill="#dbeafe">hakolah</text>
  </svg>
  `;

  await sharp(Buffer.from(svg), { density: 200 })
    .resize(SIZE, SIZE)
    .png()
    .toFile(path.join(outDir, "poster-why-hakolah.png"));

  console.log("wrote poster-why-hakolah.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
