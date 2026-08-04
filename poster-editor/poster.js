/*
  محرر بوسترات هكوله — يبني نفس تصميم scripts/generate-poster-bilingual.js
  لكن داخل المتصفح مع معاينة حية وتنزيل PNG.

  مستقل تماماً عن الموقع: خارج مجلد src/ فلا يبنيه Eleventy ولا يُنشر،
  ولا يتصل بأي خادم — رمز QR يُولّد محلياً بمكتبة vendor/qrcode.js.
*/
const SIZE = 1080;
const FONT = "Tahoma, Arial, sans-serif";

// مسار حرف "ه" مستخرج مسبقاً من خط Noto Kufi Arabic Bold (نفس ما يفعله
// scripts/heh-glyph.js) — مضمّن هنا حتى لا يعتمد المحرر على وجود الخط.
// التحويل مطابق لـ fitGlyphInRect(484, 96, 112, 112) المستخدم بالسكربت،
// أي داخل مربع الشعار الأبيض بالضبط.
const LOGO_GLYPH =
  '<g transform="translate(474.702 201.206) scale(0.286079)"><path d="M424 0L32.50 0L32.50-60L76.50-60Q66-69.50 59.25-86.75Q52.50-104 52.50-130Q52.50-159 68-185Q83.50-210.50 110-225.25Q136.50-240 167-240Q201-240 226.25-226Q251.50-212 265.75-187.50Q280-163 280-131L280-60L349.50-60L349.50-152.50Q349.50-216.50 318-250.25Q286.50-284 227-284Q189.50-284 161-279.50Q132.50-275 105.50-265L88.50-322Q123-334 156-339Q189-344 227-344Q325.50-344 374.75-296.50Q424-249 424-159L424 0M189.50-60L205.50-60L205.50-128Q205.50-154 196.50-165.75Q187.50-177.50 167.50-177.50Q150.50-177.50 139.75-163.25Q129-149 129-127Q129-60 189.50-60"/></g>';

const PRESETS = {
  ar: {
    rtl: true,
    badge: "🎉 مجاني بالكامل",
    brand: "هكوله",
    headline: "صار بالعربي والإنجليزي",
    sub: "نفس الموقع، نفس المحتوى — بلغتين",
    pill1: "العربية",
    pill2: "English",
    features: [
      ["📍", "أقرب مكان لك — يحسب أقرب فرع فعلاً"],
      ["🎲", "اختار لي — لو محتار وش تختار"],
      ["❤️", "مفضلتك محفوظة بدون تسجيل دخول"],
      ["🔥", "الأكثر إعجاباً هذا الأسبوع"],
      ["", ""],
    ],
    cta: "امسح وجرّب الحين مجاناً",
    url: "https://mohframevision.github.io/hakolah/",
    foot: "hakolah",
  },
  en: {
    rtl: false,
    badge: "🎉 100% Free",
    brand: "Hakolah",
    headline: "Now in Arabic & English",
    sub: "Same site, same content — in both languages",
    pill1: "العربية",
    pill2: "English",
    features: [
      ["📍", "Nearest to you — finds the closest branch"],
      ["🎲", "Pick for me — when you can't decide"],
      ["❤️", "Favorites saved, no sign-up needed"],
      ["🔥", "Most liked this week"],
      ["", ""],
    ],
    cta: "Scan and try it free",
    url: "https://mohframevision.github.io/hakolah/en/",
    foot: "hakolah/en",
  },
};

const MAX_FEATURES = 5;
let rtl = true;

const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ===== بناء صفوف الميزات بلوحة التحكم ===== */
function buildFeatureInputs() {
  $("features").innerHTML = Array.from({ length: MAX_FEATURES })
    .map(
      (_, i) => `
      <div class="row" style="margin-bottom:8px">
        <input class="icon" id="fi${i}" maxlength="4" placeholder="📍" />
        <input class="txt"  id="ft${i}" placeholder="نص الميزة ${i + 1}" />
      </div>`
    )
    .join("");
  for (let i = 0; i < MAX_FEATURES; i++) {
    $("fi" + i).addEventListener("input", render);
    $("ft" + i).addEventListener("input", render);
  }
}

/* ===== رمز QR: يُولَّد محلياً ويُحوَّل لصورة data: ===== */
function qrDataUrl(text) {
  if (!text.trim()) return null;
  // typeNumber 0 = يختار أصغر حجم يكفي النص. مستوى M هو المستخدم بالبوسترات
  // السابقة والمُتحقَّق أنه يُقرأ فعلياً؛ المستويات الأعلى تزيد كثافة المربعات
  // فتضيع الحدّة عند تصغير الرمز داخل البوستر.
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();

  const count = qr.getModuleCount();
  const scale = 8;
  const margin = scale; // هامش وحدة واحدة
  const px = count * scale + margin * 2;
  const c = document.createElement("canvas");
  c.width = c.height = px;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, px, px);
  ctx.fillStyle = "#1d4ed8";
  for (let r = 0; r < count; r++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(r, col)) ctx.fillRect(margin + col * scale, margin + r * scale, scale, scale);
    }
  }
  return c.toDataURL("image/png");
}

/* ===== صف ميزة داخل البوستر =====
   ملاحظة محاذاة: مع direction="rtl" فإن text-anchor="end" يضع نهاية النص
   منطقياً عند x، ونهاية النص العربي طرفه الأيسر — فيمتد يميناً ويخرج خارج
   الإطار. الصحيح "start" لأن بداية النص العربي طرفه الأيمن. */
function featureRow(icon, text, y) {
  const iconX = rtl ? 900 : 180;
  const textX = rtl ? 840 : 250;
  const circle = icon
    ? `<circle cx="${iconX}" cy="${y}" r="32" fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.38)" stroke-width="2" />
       <text x="${iconX}" y="${y + 12}" font-size="34" text-anchor="middle">${esc(icon)}</text>`
    : "";
  return `${circle}
    <text x="${textX}" y="${y + 11}" font-family="${FONT}" font-size="28" font-weight="600"
          text-anchor="start" fill="#eaf1ff" direction="${rtl ? "rtl" : "ltr"}">${esc(text)}</text>`;
}

/* ===== توليد الـ SVG كاملاً ===== */
function buildSvg() {
  const v = {
    badge: $("badge").value,
    brand: $("brand").value,
    headline: $("headline").value,
    sub: $("sub").value,
    pill1: $("pill1").value,
    pill2: $("pill2").value,
    cta: $("cta").value,
    url: $("url").value,
    foot: $("foot").value,
  };

  const feats = [];
  for (let i = 0; i < MAX_FEATURES; i++) {
    const icon = $("fi" + i).value.trim();
    const text = $("ft" + i).value.trim();
    if (icon || text) feats.push([icon, text]);
  }

  // المسافات تتكيّف مع عدد الميزات حتى لا تتداخل مع نص الدعوة ورمز QR
  const startY = feats.length >= 5 ? 578 : 592;
  const gap = feats.length >= 5 ? 58 : 66;
  const rows = feats.map((f, i) => featureRow(f[0], f[1], startY + i * gap)).join("\n");

  const qr = qrDataUrl(v.url);
  const hasPills = v.pill1.trim() || v.pill2.trim();

  const pills = hasPills
    ? `<rect x="300" y="368" width="200" height="70" rx="35" fill="#ffffff" />
       <text x="400" y="415" font-family="${FONT}" font-size="34" font-weight="800"
             text-anchor="middle" fill="#1d4ed8">${esc(v.pill1)}</text>
       <text x="540" y="416" font-family="${FONT}" font-size="40" font-weight="800"
             text-anchor="middle" fill="#f59e0b">⇄</text>
       <rect x="580" y="368" width="200" height="70" rx="35" fill="#ffffff" />
       <text x="680" y="415" font-family="${FONT}" font-size="34" font-weight="800"
             text-anchor="middle" fill="#1d4ed8">${esc(v.pill2)}</text>`
    : "";

  // بلا شارتَي لغة يرتفع العنوان لملء الفراغ
  const headY = hasPills ? 500 : 452;
  const subY = hasPills ? 548 : 500;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1d4ed8" />
      <stop offset="100%" stop-color="#2563eb" />
    </linearGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)" />
  <circle cx="950" cy="120" r="180" fill="#f59e0b" opacity="0.12" />
  <circle cx="80" cy="960" r="220" fill="#f59e0b" opacity="0.10" />

  ${
    v.badge.trim()
      ? `<rect x="30" y="30" width="250" height="52" rx="26" fill="#f59e0b" />
         <text x="155" y="64" font-family="${FONT}" font-size="24" font-weight="800"
               text-anchor="middle" fill="#ffffff">${esc(v.badge)}</text>`
      : ""
  }

  <rect x="456" y="68" width="168" height="168" rx="40" fill="#ffffff" />
  <circle cx="586" cy="96" r="14" fill="#f59e0b" />
  <g fill="#2563eb">${LOGO_GLYPH}</g>

  <text x="540" y="330" font-family="${FONT}" font-size="86" font-weight="800"
        text-anchor="middle" fill="#ffffff">${esc(v.brand)}</text>

  ${pills}

  <text x="540" y="${headY}" font-family="${FONT}" font-size="46" font-weight="800"
        text-anchor="middle" fill="#ffffff">${esc(v.headline)}</text>
  <text x="540" y="${subY}" font-family="${FONT}" font-size="28" font-weight="600"
        text-anchor="middle" fill="#dbeafe">${esc(v.sub)}</text>

  ${rows}

  <text x="540" y="846" font-family="${FONT}" font-size="28" font-weight="700"
        text-anchor="middle" fill="#ffffff">${esc(v.cta)}</text>

  ${
    qr
      ? `<rect x="470" y="866" width="140" height="140" rx="18" fill="#ffffff" />
         <image x="485" y="881" width="110" height="110" href="${qr}" />`
      : ""
  }

  <text x="540" y="1042" font-family="${FONT}" font-size="24" font-weight="600"
        text-anchor="middle" fill="#dbeafe">${esc(v.foot)}</text>
</svg>`;
}

function render() {
  $("stage").innerHTML = buildSvg();
}

/* ===== تحويل الـ SVG لـ PNG بمقاس 1080 ===== */
function toPngBlob() {
  return new Promise((resolve, reject) => {
    const svg = buildSvg();
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = c.height = SIZE;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, SIZE, SIZE);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("فشل إنشاء الصورة"))), "image/png");
    };
    img.onerror = () => reject(new Error("فشل رسم الـ SVG"));
    img.src = url;
  });
}

function setStatus(msg, ok) {
  const el = $("status");
  el.textContent = msg;
  el.className = "status" + (ok === true ? " ok" : ok === false ? " err" : "");
}

/* ===== تعبئة الحقول من قالب جاهز ===== */
function applyPreset(key) {
  const p = PRESETS[key];
  rtl = p.rtl;
  ["badge", "brand", "headline", "sub", "pill1", "pill2", "cta", "url", "foot"].forEach(
    (k) => ($(k).value = p[k])
  );
  for (let i = 0; i < MAX_FEATURES; i++) {
    const f = p.features[i] || ["", ""];
    $("fi" + i).value = f[0];
    $("ft" + i).value = f[1];
  }
  $("tabAr").setAttribute("aria-pressed", String(key === "ar"));
  $("tabEn").setAttribute("aria-pressed", String(key === "en"));
  render();
  setStatus("");
}

/* ===== الربط ===== */
buildFeatureInputs();
["badge", "brand", "headline", "sub", "pill1", "pill2", "cta", "url", "foot"].forEach((k) =>
  $(k).addEventListener("input", render)
);
$("tabAr").addEventListener("click", () => applyPreset("ar"));
$("tabEn").addEventListener("click", () => applyPreset("en"));
$("reset").addEventListener("click", () => applyPreset(rtl ? "ar" : "en"));

$("download").addEventListener("click", async () => {
  try {
    setStatus("جاري التوليد…");
    const blob = await toPngBlob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "hakolah-poster-" + (rtl ? "ar" : "en") + ".png";
    a.click();
    URL.revokeObjectURL(a.href);
    setStatus("✅ تم التنزيل (1080×1080)", true);
  } catch (e) {
    setStatus("❌ " + e.message, false);
  }
});

/*
  تحقق فعلي أن الرمز يُقرأ: نعيد فك تشفيره من الصورة الناتجة بدل الاكتفاء
  بأنه "يبدو" صحيحاً. BarcodeDetector متاح بمتصفحات Chromium الحديثة.
*/
$("verify").addEventListener("click", async () => {
  const url = $("url").value.trim();
  if (!url) return setStatus("ما فيه رابط لفحصه", false);
  if (!("BarcodeDetector" in window))
    return setStatus("متصفحك ما يدعم الفحص التلقائي — جرّب مسح الرمز بجوالك", false);
  try {
    setStatus("جاري الفحص…");
    const blob = await toPngBlob();
    const bitmap = await createImageBitmap(blob);
    const det = new window.BarcodeDetector({ formats: ["qr_code"] });
    const found = await det.detect(bitmap);
    if (!found.length) return setStatus("❌ الرمز غير مقروء — جرّب رابطاً أقصر", false);
    setStatus(found[0].rawValue === url ? "✅ الرمز يُقرأ صح: " + found[0].rawValue : "⚠️ قرأ رابطاً مختلفاً: " + found[0].rawValue, found[0].rawValue === url);
  } catch (e) {
    setStatus("❌ فشل الفحص: " + e.message, false);
  }
});

applyPreset("ar");
