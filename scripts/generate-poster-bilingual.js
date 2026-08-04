// أداة لمرة واحدة لتوليد بوسترَي إنستقرام (1080x1080) يعلنان توفر الموقع
// بالعربية والإنجليزية، بنفس أسلوب البوسترات السابقة (خلفية زرقاء متدرجة،
// دوائر برتقالية، شعار أبيض، رمز QR).
// مو جزء من بناء الموقع — تعتمد على opentype.js وqrcode (مش من devDependencies):
//   npm install opentype.js qrcode --no-save && node scripts/generate-poster-bilingual.js
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const QRCode = require("qrcode");
const { fitGlyphInRect } = require("./heh-glyph.js");

const SIZE = 1080;
const outDir =
  "C:\\Users\\Computia.ME\\AppData\\Local\\Temp\\claude\\D-----------\\79ddc704-5480-4e31-b983-b66d3efa52e6\\scratchpad";

const VARIANTS = {
  ar: {
    file: "poster-bilingual-ar.png",
    url: "https://mohframevision.github.io/hakolah/",
    dir: "rtl",
    badge: "🎉 مجاني بالكامل",
    brand: "هكوله",
    headline: "صار بالعربي والإنجليزي",
    sub: "نفس الموقع، نفس المحتوى — بلغتين",
    features: [
      ["📍", "أقرب مكان لك — يحسب أقرب فرع فعلاً"],
      ["🎲", "اختار لي — لو محتار وش تختار"],
      ["❤️", "مفضلتك محفوظة بدون تسجيل دخول"],
      ["🔥", "الأكثر إعجاباً هذا الأسبوع"],
    ],
    cta: "امسح وجرّب الحين مجاناً",
    foot: "hakolah",
  },
  en: {
    file: "poster-bilingual-en.png",
    // بلا index.html — رابط أقصر يعني رمز QR أقل كثافة وأسهل مسحاً بالجوال
    url: "https://mohframevision.github.io/hakolah/en/",
    dir: "ltr",
    badge: "🎉 100% Free",
    brand: "Hakolah",
    headline: "Now in Arabic & English",
    sub: "Same site, same content — in both languages",
    features: [
      ["📍", "Nearest to you — finds the closest branch"],
      ["🎲", "Pick for me — when you can't decide"],
      ["❤️", "Favorites saved, no sign-up needed"],
      ["🔥", "Most liked this week"],
    ],
    cta: "Scan and try it free",
    foot: "hakolah/en",
  },
};

const FONT = "Tahoma, Arial, sans-serif";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/*
  صف ميزة واحدة: أيقونة داخل دائرة + نص بجانبها.

  ملاحظة مهمة عن المحاذاة: مع direction="rtl" فإن text-anchor="end" يضع
  *نهاية* النص منطقياً عند x، ونهاية النص العربي هي طرفه الأيسر — فيمتد
  النص يميناً ويخرج خارج الإطار. الصحيح "start" لأن بداية النص العربي هي
  طرفه الأيمن، فيمتد يساراً كما هو متوقع بصرياً.
*/
function featureRow(icon, text, y, rtl) {
  const iconX = rtl ? 900 : 180;
  const textX = rtl ? 840 : 250;
  return `
    <circle cx="${iconX}" cy="${y}" r="32" fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.38)" stroke-width="2" />
    <text x="${iconX}" y="${y + 12}" font-size="34" text-anchor="middle">${icon}</text>
    <text x="${textX}" y="${y + 11}" font-family="${FONT}" font-size="28" font-weight="600"
          text-anchor="start" fill="#eaf1ff" direction="${rtl ? "rtl" : "ltr"}">${esc(text)}</text>
  `;
}

async function build(key, v) {
  // نفس إعدادات البوسترات السابقة المثبت أنها تُقرأ فعلياً (تم التحقق بمُفكّك
  // QR على الملف القديم): عرض 150 ومربع عرض 140/صورة 110 بالتصميم.
  // تجربة رفع الدقة لـ600 مع errorCorrectionLevel: H أفشلت القراءة — تصحيح
  // الخطأ الأعلى يزيد عدد المربعات، فتضيع الحدّة عند التصغير.
  const qr = (
    await QRCode.toBuffer(v.url, { width: 150, margin: 1, color: { dark: "#1d4ed8", light: "#ffffff" } })
  ).toString("base64");

  const rtl = v.dir === "rtl";
  const logo = fitGlyphInRect(484, 96, 112, 112);
  // 592/658/724/790 — يترك مساحة كافية أسفلها لنص الدعوة (846) ورمز QR بمقاسه المثبت
  const rows = v.features.map((f, i) => featureRow(f[0], f[1], 592 + i * 66, rtl)).join("\n");

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

    <rect x="30" y="30" width="250" height="52" rx="26" fill="#f59e0b" />
    <text x="155" y="64" font-family="${FONT}" font-size="24" font-weight="800"
          text-anchor="middle" fill="#ffffff">${esc(v.badge)}</text>

    <rect x="456" y="68" width="168" height="168" rx="40" fill="#ffffff" />
    <circle cx="586" cy="96" r="14" fill="#f59e0b" />
    <g fill="#2563eb">${logo}</g>

    <text x="540" y="330" font-family="${FONT}" font-size="86" font-weight="800"
          text-anchor="middle" fill="#ffffff">${esc(v.brand)}</text>

    <!-- شارتا اللغتين: الرسالة الأساسية للبوستر -->
    <rect x="300" y="368" width="200" height="70" rx="35" fill="#ffffff" />
    <text x="400" y="415" font-family="${FONT}" font-size="34" font-weight="800"
          text-anchor="middle" fill="#1d4ed8">العربية</text>
    <text x="540" y="416" font-family="${FONT}" font-size="40" font-weight="800"
          text-anchor="middle" fill="#f59e0b">⇄</text>
    <rect x="580" y="368" width="200" height="70" rx="35" fill="#ffffff" />
    <text x="680" y="415" font-family="${FONT}" font-size="34" font-weight="800"
          text-anchor="middle" fill="#1d4ed8">English</text>

    <text x="540" y="500" font-family="${FONT}" font-size="46" font-weight="800"
          text-anchor="middle" fill="#ffffff">${esc(v.headline)}</text>
    <text x="540" y="548" font-family="${FONT}" font-size="28" font-weight="600"
          text-anchor="middle" fill="#dbeafe">${esc(v.sub)}</text>

    ${rows}

    <text x="540" y="846" font-family="${FONT}" font-size="28" font-weight="700"
          text-anchor="middle" fill="#ffffff">${esc(v.cta)}</text>

    <rect x="470" y="866" width="140" height="140" rx="18" fill="#ffffff" />
    <image x="485" y="881" width="110" height="110" href="data:image/png;base64,${qr}" />

    <text x="540" y="1042" font-family="${FONT}" font-size="24" font-weight="600"
          text-anchor="middle" fill="#dbeafe">${esc(v.foot)}</text>
  </svg>`;

  await sharp(Buffer.from(svg), { density: 200 }).resize(SIZE, SIZE).png().toFile(path.join(outDir, v.file));
  console.log("wrote", v.file);
}

async function main() {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  for (const [key, v] of Object.entries(VARIANTS)) await build(key, v);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
