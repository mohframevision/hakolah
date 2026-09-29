// أداة لمرة واحدة: بوستر "هكوله صار له دومينه الخاص" — منشور 1080x1080 وستوري
// 1080x1920 لإنستقرام، بنفس ستايل بقية البوسترات (خلفية زرقاء متدرجة، شعار،
// QR). الدومين بنص LTR منفصل بصندوقه (مو داخل جملة عربية) عشان ما ينقلب ترتيبه.
// تعتمد على opentype.js وqrcode (مش من ضمن devDependencies):
//   npm install opentype.js qrcode --no-save && node scripts/generate-poster-domain.js
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const QRCode = require("qrcode");
const { fitGlyphInRect } = require("./heh-glyph.js");

const SITE_URL = "https://hakolah.com/";
const outDir =
  "C:\\Users\\Computia.ME\\AppData\\Local\\Temp\\claude\\D-----------\\79ddc704-5480-4e31-b983-b66d3efa52e6\\scratchpad";
const FONT = 'font-family="Tahoma, Arial, sans-serif"';

// oy = إزاحة عمودية للمحتوى (0 للمنشور؛ للستوري يتوسّط بعيداً عن أشرطة الواجهة)
function build(W, H, oy, qrBase64) {
  const logoGlyph = fitGlyphInRect(484, 92 + oy, 112, 112);
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#1d4ed8" />
        <stop offset="100%" stop-color="#2563eb" />
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)" />
    <circle cx="${W - 130}" cy="${120 + oy}" r="180" fill="#f59e0b" opacity="0.12" />
    <circle cx="80" cy="${H - 120}" r="220" fill="#f59e0b" opacity="0.10" />

    <rect x="30" y="${30 + oy}" width="230" height="52" rx="26" fill="#f59e0b" />
    <text x="145" y="${64 + oy}" ${FONT} font-size="24" font-weight="800" text-anchor="middle" fill="#ffffff">🎉 خبر جديد</text>

    <rect x="456" y="${64 + oy}" width="168" height="168" rx="40" fill="#ffffff" />
    <circle cx="586" cy="${92 + oy}" r="14" fill="#f59e0b" />
    <g fill="#2563eb">${logoGlyph}</g>

    <text x="540" y="${332 + oy}" ${FONT} font-size="100" font-weight="800" text-anchor="middle" fill="#ffffff">هكوله</text>
    <text x="540" y="${424 + oy}" ${FONT} font-size="70" font-weight="800" text-anchor="middle" fill="#f59e0b">صار له دومينه الخاص!</text>

    <rect x="90" y="${480 + oy}" width="900" height="250" rx="36" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.45)" stroke-width="2" />
    <text x="540" y="${618 + oy}" ${FONT} font-size="118" font-weight="900" text-anchor="middle" fill="#ffffff" direction="ltr" unicode-bidi="bidi-override">hakolah<tspan fill="#f59e0b">.com</tspan></text>
    <text x="540" y="${688 + oy}" ${FONT} font-size="38" font-weight="700" text-anchor="middle" fill="#dbeafe">عنوان أقصر… تتذكره وتشاركه بسهولة</text>

    <text x="540" y="${792 + oy}" ${FONT} font-size="30" font-weight="600" text-anchor="middle" fill="#dbeafe">روابطك القديمة تشتغل تلقائياً، ما راح يضيع شي</text>

    <text x="540" y="${868 + oy}" ${FONT} font-size="32" font-weight="700" text-anchor="middle" fill="#ffffff">امسح وزُر الموقع مجاناً</text>
    <rect x="470" y="${886 + oy}" width="140" height="140" rx="18" fill="#ffffff" />
    <image x="485" y="${901 + oy}" width="110" height="110" href="data:image/png;base64,${qrBase64}" />
  </svg>
  `;
}

async function main() {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const qr = (
    await QRCode.toBuffer(SITE_URL, { width: 150, margin: 1, color: { dark: "#1d4ed8", light: "#ffffff" } })
  ).toString("base64");
  const jobs = [
    ["poster-domain-post.png", 1080, 1080, 0],
    ["poster-domain-story.png", 1080, 1920, 420], // المحتوى بالمنتصف: خارج مناطق أشرطة الستوري
  ];
  for (const [name, W, H, oy] of jobs) {
    await sharp(Buffer.from(build(W, H, oy, qr)), { density: 200 }).resize(W, H).png().toFile(path.join(outDir, name));
    console.log("wrote", name);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
