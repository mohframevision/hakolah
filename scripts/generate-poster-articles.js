// أداة لمرة واحدة لتوليد بوستر إنستقرام (1080x1080) لكل مقال بمصفوفة ARTICLES —
// نفس ستايل البوسترات السابقة (خلفية زرقاء متدرجة، لوقو هكوله، QR)، بس بدل
// الترويج العام، يركّز على عنوان المقال وخطّافه، ورمز QR يوصل مباشرة لصفحة المقال.
// مو جزء من بناء الموقع — تعتمد على opentype.js وqrcode (مش من devDependencies):
//   npm install opentype.js qrcode --no-save && node scripts/generate-poster-articles.js
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const QRCode = require("qrcode");
const { fitGlyphInRect } = require("./heh-glyph.js");

const SIZE = 1080;
const SITE_BASE = "https://mohframevision.github.io/hakolah/guides/";
const outDir =
  "C:\\Users\\Computia.ME\\AppData\\Local\\Temp\\claude\\D-----------\\79ddc704-5480-4e31-b983-b66d3efa52e6\\scratchpad";

const FONT = "Tahoma, Arial, sans-serif";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const ARTICLES = [
  {
    slug: "bahrain-preproduction-documents",
    icon: "🎬",
    badge: "دليل شامل",
    titleLines: ["مستندات ما قبل الإنتاج", "للتصوير في البحرين"],
    hook: "30 مستند + كل القوانين المحلية اللي تحتاجها قبل أي تصوير",
    file: "poster-article-preproduction.png",
  },
  {
    slug: "aicameramovements",
    icon: "🎥",
    badge: "تقنية وبرمجيات",
    titleLines: ["AI Camera Movements", "46 حركة كاميرا جاهزة"],
    hook: "انسخ الأمر والصقه مباشرة بأدوات فيديو الذكاء الاصطناعي",
    file: "poster-article-cameramovements.png",
  },
  {
    slug: "ai-cognitive-debt-mit-study",
    icon: "🧠",
    badge: "تقنية وبرمجيات",
    titleLines: ["هل يُضعف الذكاء الاصطناعي", "عقولنا؟"],
    hook: "قراءة علمية تفصل الحقيقة عن التضليل في دراسة MIT",
    file: "poster-article-cognitivedebt.png",
  },
];

async function build(article) {
  const url = SITE_BASE + article.slug + ".html";
  const qr = (
    await QRCode.toBuffer(url, { width: 150, margin: 1, color: { dark: "#1d4ed8", light: "#ffffff" } })
  ).toString("base64");

  const logo = fitGlyphInRect(484, 40, 80, 80);

  const titleY = 470;
  const titleLines = article.titleLines
    .map((line, i) => `<tspan x="540" dy="${i === 0 ? 0 : 78}">${esc(line)}</tspan>`)
    .join("");

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

    <rect x="410" y="30" width="200" height="90" rx="30" fill="#ffffff" />
    <circle cx="486" cy="46" r="10" fill="#f59e0b" />
    <g fill="#2563eb">${logo}</g>
    <text x="640" y="80" font-family="${FONT}" font-size="40" font-weight="800" text-anchor="start" fill="#ffffff">هكوله</text>

    <rect x="30" y="160" width="230" height="52" rx="26" fill="#f59e0b" />
    <text x="145" y="194" font-family="${FONT}" font-size="24" font-weight="800" text-anchor="middle" fill="#ffffff">${esc(article.badge)}</text>

    <circle cx="540" cy="290" r="80" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.45)" stroke-width="2" />
    <text x="540" y="316" font-size="78" text-anchor="middle">${article.icon}</text>

    <text x="540" y="${titleY}" font-family="${FONT}" font-size="62" font-weight="800" text-anchor="middle" fill="#ffffff" direction="rtl">${titleLines}</text>

    <text x="540" y="660" font-family="${FONT}" font-size="32" font-weight="600" text-anchor="middle" fill="#dbeafe" direction="rtl">${esc(article.hook)}</text>

    <text x="540" y="820" font-family="${FONT}" font-size="32" font-weight="700" text-anchor="middle" fill="#ffffff">📖 امسح واقرأ الدليل الكامل</text>

    <rect x="470" y="850" width="140" height="140" rx="18" fill="#ffffff" />
    <image x="485" y="865" width="110" height="110" href="data:image/png;base64,${qr}" />

    <text x="540" y="1035" font-family="${FONT}" font-size="24" font-weight="600" text-anchor="middle" fill="#dbeafe">hakolah</text>
  </svg>
  `;

  await sharp(Buffer.from(svg), { density: 200 }).resize(SIZE, SIZE).png().toFile(path.join(outDir, article.file));
  console.log("wrote", article.file);
}

async function main() {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  for (const article of ARTICLES) await build(article);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
