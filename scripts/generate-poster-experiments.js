// أداة لمرة واحدة لتوليد بوستري "تجاربي" (1080x1080) — مولّد الموسيقى
// وحاسبة المصروفات. نفس ستايل البوسترات السابقة (تدرّج أزرق + لمسات كهرمانية).
// راعى قواعد اللغة المحفوظة: بلا مصطلح إنجليزي مكشوف وسط جملة عربية (وكل
// نص فيه أرقام أو لاتيني عليه direction="rtl" صراحةً)، إملاء صحيح، وكل
// سطر إله معنى واضح لحاله.
// مو جزء من بناء الموقع — تعتمد على opentype.js وqrcode (مش من devDependencies):
//   npm install opentype.js qrcode --no-save && node scripts/generate-poster-experiments.js
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const QRCode = require("qrcode");
const { fitGlyphInRect } = require("./heh-glyph.js");

const SIZE = 1080;
const FONT = "Tahoma, Arial, sans-serif";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// البوستر يُحفظ بالمكانين معاً حسب القاعدة المتفق عليها
const OUT_DIRS = ["D:\\موقع ربحي\\ملفات هكو له", "G:\\My Drive\\ملفات هكوله درايف"];

const POSTERS = [
  {
    file: "poster-experiment-music.png",
    badge: "🧪 تجربة جديدة",
    title: "موسيقى تتألّف الحين",
    subtitle: "كل ضغطة زر تعطيك مقطوعة ما سمعها أحد قبلك",
    hero: "🎵",
    url: "https://mohframevision.github.io/hakolah/ai-experiments/calm-beep-music.html",
    points: [
      ["🎹", "اختر الآلة: بيانو، كمان، فلوت، وغيرها"],
      ["😌", "واختر الطابع: هادئ، رصين، سعيد، حالم"],
      ["🎼", "لحن متماسك بجُمَل تتكرر وختام يستقر"],
      ["⬇️", "نزّلها ملف صوت أو فيديو تشاركه"],
      ["🔒", "كل شي داخل متصفحك، بلا رفع ولا حساب"],
    ],
  },
  {
    file: "poster-experiment-calculator.png",
    badge: "🧪 تجربة جديدة",
    title: "وين راحت فلوسك؟",
    subtitle: "حاسبة دخلك ومصروفاتك، بسيطة وسريعة",
    hero: "🧮",
    url: "https://mohframevision.github.io/hakolah/ai-experiments/expense-calculator.html",
    points: [
      ["💵", "تقول لك كم باقي عندك فعلاً، لا كم صرفت"],
      ["🔢", "لوحة أرقام تلمسها، بلا كتابة ولا لوحة مفاتيح"],
      ["🏷️", "فئات جاهزة تختارها بلمسة وحدة"],
      ["📊", "تحليل صرفك على قاعدة ٥٠ و٣٠ و٢٠"],
      ["🔒", "بياناتك تبقى بجهازك، بلا سيرفر ولا حساب"],
    ],
  },
];

function pointRow(icon, text, y) {
  const iconX = 900;
  const textX = 840;
  return `
    <circle cx="${iconX}" cy="${y}" r="32" fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.38)" stroke-width="2" />
    <text x="${iconX}" y="${y + 12}" font-size="34" text-anchor="middle">${icon}</text>
    <text x="${textX}" y="${y + 11}" font-family="${FONT}" font-size="27" font-weight="600"
          text-anchor="start" fill="#eaf1ff" direction="rtl">${esc(text)}</text>
  `;
}

async function buildPoster(poster) {
  const qrBuffer = await QRCode.toBuffer(poster.url, {
    width: 150,
    margin: 1,
    color: { dark: "#1d4ed8", light: "#ffffff" },
  });
  const qrBase64 = qrBuffer.toString("base64");

  // إحداثيات الشعار مطابقة تماماً لمستطيله الأبيض — عدم تطابقها سبق وطلّع
  // الحرف خارج الصندوق
  const logoGlyph = fitGlyphInRect(490, 140, 100, 100);
  const rows = poster.points.map((p, i) => pointRow(p[0], p[1], 500 + i * 74)).join("\n");

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
    <text x="145" y="64" font-family="${FONT}" font-size="24" font-weight="800" text-anchor="middle" fill="#ffffff">${esc(poster.badge)}</text>

    <rect x="490" y="140" width="100" height="100" rx="26" fill="#ffffff" />
    <circle cx="574" cy="156" r="9" fill="#f59e0b" />
    <g fill="#2563eb">${logoGlyph}</g>

    <!-- الأيقونة بمحاذاة الشعار أفقياً لا فوق العنوان: العنوان مركزي وعريض
         (يمتد من ~190 إلى ~890) فأي شي بمستواه الرأسي يتصادم معه -->
    <text x="180" y="232" font-size="104" text-anchor="middle" opacity="0.92">${poster.hero}</text>

    <text x="540" y="352" font-family="${FONT}" font-size="72" font-weight="800" text-anchor="middle" fill="#ffffff" direction="rtl">${esc(poster.title)}</text>
    <text x="540" y="404" font-family="${FONT}" font-size="29" font-weight="600" text-anchor="middle" fill="#dbeafe" direction="rtl">${esc(poster.subtitle)}</text>

    <text x="540" y="452" font-family="${FONT}" font-size="25" font-weight="700" text-anchor="middle" fill="#f59e0b" direction="rtl">من ركن «تجاربي» بموقع هكوله</text>

    ${rows}

    <text x="540" y="862" font-family="${FONT}" font-size="30" font-weight="700" text-anchor="middle" fill="#ffffff" direction="rtl">امسح وجرّبها مجاناً</text>

    <rect x="470" y="880" width="140" height="140" rx="18" fill="#ffffff" />
    <image x="485" y="895" width="110" height="110" href="data:image/png;base64,${qrBase64}" />

    <text x="540" y="1046" font-family="${FONT}" font-size="24" font-weight="600" text-anchor="middle" fill="#dbeafe">hakolah</text>
  </svg>
  `;

  const buffer = await sharp(Buffer.from(svg), { density: 200 }).resize(SIZE, SIZE).png().toBuffer();

  for (const dir of OUT_DIRS) {
    if (!fs.existsSync(dir)) {
      console.warn(`تخطّي (المجلد غير موجود): ${dir}`);
      continue;
    }
    fs.writeFileSync(path.join(dir, poster.file), buffer);
    console.log(`wrote ${poster.file} -> ${dir}`);
  }
}

async function main() {
  for (const poster of POSTERS) await buildPoster(poster);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
