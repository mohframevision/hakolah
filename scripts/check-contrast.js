#!/usr/bin/env node
/**
 * scripts/check-contrast.js
 *
 * يفحص تباين ألوان WCAG 2.1 لمتغيّرات --color-* بـ src/css/style.css
 * تلقائياً، بدل حسابه يدوياً بكل مرة تدور فيها زاوية "وصول".
 *
 * يدعم: hex (#rgb/#rrggbb)، rgb()/rgba()، var(--x)، oklch(L C H)،
 * color-mix(in srgb, A P%, B) و color-mix(in oklch, A P%, B) — بما فيها
 * الحالتان الفعليتان المستخدَمتان بالملف (--color-primary-dark،
 * --color-accent، --color-text-muted بالوضع الداكن).
 *
 * الاستخدام: node scripts/check-contrast.js [مسار-style.css]
 * خروج غير-صفري لو فيه زوج فاشل AA (ليسهل ربطه بـCI مستقبلاً لو رغب المالك).
 */
const fs = require("fs");
const path = require("path");

const cssPath = process.argv[2] || path.join(__dirname, "..", "src", "css", "style.css");
const css = fs.readFileSync(cssPath, "utf8");

// ---------- تحويل الألوان ----------

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function hexToRgb(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function srgbToLinear(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb8(v) {
  v = clamp01(v);
  const s = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.round(clamp01(s) * 255);
}

// OKLab <-> linear sRGB (مصفوفات Björn Ottosson القياسية، نفس العائلة
// المستخدَمة أصلاً بـoklchMaxChroma بـsrc/js/main.js لكن بالاتجاهين)
function rgbToOklab({ r, g, b }) {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  const l = 0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B;
  const m = 0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B;
  const s = 0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

function oklabToRgb({ L, a, b }) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const R = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const G = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const B = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return { r: linearToSrgb8(R), g: linearToSrgb8(G), b: linearToSrgb8(B) };
}

function oklchToRgb(L, C, Hdeg) {
  const h = (Hdeg * Math.PI) / 180;
  return oklabToRgb({ L, a: C * Math.cos(h), b: C * Math.sin(h) });
}

function rgbToOklch(rgb) {
  const { L, a, b } = rgbToOklab(rgb);
  const C = Math.hypot(a, b);
  const H = (Math.atan2(b, a) * 180) / Math.PI;
  return { L, C, H: H < 0 ? H + 360 : H };
}

const NAMED = {
  white: { r: 255, g: 255, b: 255 },
  black: { r: 0, g: 0, b: 0 },
};

// resolveColor: يرجع {r,g,b,a} أو null لو تعذّر الحل (مثل "transparent"
// بلا خلفية معروفة، أو قيمة غير مدعومة)
function resolveColor(raw, vars, seen = new Set()) {
  if (!raw) return null;
  const value = raw.trim();

  if (value === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  if (NAMED[value]) return { ...NAMED[value], a: 1 };

  let m = value.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (m) return { ...hexToRgb(value), a: 1 };

  m = value.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/);
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 };

  m = value.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/);
  if (m) return { ...oklchToRgb(+m[1], +m[2], +m[3]), a: 1 };

  m = value.match(/^var\((--[\w-]+)\)$/);
  if (m) {
    const name = m[1];
    if (seen.has(name)) return null; // حماية من حلقة لا نهائية
    const next = vars[name];
    if (!next) return null;
    return resolveColor(next, vars, new Set([...seen, name]));
  }

  m = value.match(/^color-mix\(\s*in\s+(srgb|oklch)\s*,\s*(.+?)\s+([\d.]+)%\s*,\s*(.+?)\s*\)$/);
  if (m) {
    const [, space, aRaw, pctRaw, bRaw] = m;
    const pct = +pctRaw / 100;
    const colorA = resolveColor(aRaw, vars, seen);
    const colorB = resolveColor(bRaw, vars, seen);
    if (!colorA || !colorB) return null;
    if (space === "srgb") {
      // color-mix(in srgb, ...) يمزج قيم sRGB (المرقَّمة 0-255) مباشرة، بلا
      // أي تحويل خطي — هذا تعريف فضاء srgb بمواصفة CSS Color 4
      return {
        r: colorA.r * pct + colorB.r * (1 - pct),
        g: colorA.g * pct + colorB.g * (1 - pct),
        b: colorA.b * pct + colorB.b * (1 - pct),
        a: (colorA.a ?? 1) * pct + (colorB.a ?? 1) * (1 - pct),
      };
    }
    // oklch: يمزج بفضاء OKLCH (L/C دائرياً للـhue) — هنا الحالتان الفعليتان
    // بالملف تمزجان مع أبيض/أسود (C=0)، فلا حاجة لتوسّط دائري معقّد للـhue
    const ca = rgbToOklch(colorA);
    const cb = rgbToOklch(colorB);
    const L = ca.L * pct + cb.L * (1 - pct);
    const C = ca.C * pct + cb.C * (1 - pct);
    // الزاوية تُؤخذ من الطرف ذا التشبّع الأعلى (الطرف الآخر غالباً أبيض/أسود
    // بلا هوية هوية (hue) فعلية) — كافٍ لحالات الاستخدام الحالية بالملف
    const H = ca.C >= cb.C ? ca.H : cb.H;
    return { ...oklchToRgb(L, C, H), a: 1 };
  }

  return null; // قيمة غير مدعومة (مثل linear-gradient كاملة، إلخ)
}

// ---------- WCAG 2.1 contrast ratio ----------

function relLuminance({ r, g, b }) {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(c1, c2) {
  const L1 = relLuminance(c1);
  const L2 = relLuminance(c2);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function toHex({ r, g, b }) {
  const h = (n) => Math.round(clamp01(n / 255) * 255).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

// ---------- استخراج متغيّرات :root من CSS ----------

// يرجع مصفوفة {selectorRaw, body} لكل بلوك { ... } مباشرة بعد سطر selector
// مطابق للنمط المطلوب (:root، :root[data-theme=...]) — بما فيها البلوكات
// المتداخلة داخل @media (المطابقة تتم على النص الخام، لا حاجة لفهم @media
// نفسه لأن :root بداخله مطابق لنفس regex البلوك)
function extractRootBlocks(source) {
  const blocks = [];
  const re = /:root(\[data-theme="(?:dark|light)"\])?\s*\{/g;
  let m;
  while ((m = re.exec(source))) {
    const start = re.lastIndex;
    let depth = 1;
    let i = start;
    while (i < source.length && depth > 0) {
      if (source[i] === "{") depth++;
      else if (source[i] === "}") depth--;
      i++;
    }
    blocks.push({ theme: m[1] ? (m[1].includes("dark") ? "dark" : "light") : null, body: source.slice(start, i - 1) });
  }
  return blocks;
}

function parseVars(body) {
  const vars = {};
  const re = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let m;
  while ((m = re.exec(body))) {
    vars[m[1]] = m[2].trim();
  }
  return vars;
}

const blocks = extractRootBlocks(css);
// أول بلوك :root بلا [data-theme=...] هو الوضع الفاتح الافتراضي؛ البلوكات
// التالية بلا data-theme (داخل @media prefers-color-scheme: dark) هي تراكب
// الوضع الداكن التلقائي؛ وبلوكا [data-theme="light"/"dark"] هما التفعيل اليدوي
let lightVars = {};
let darkVars = {};
for (const { theme, body } of blocks) {
  const vars = parseVars(body);
  if (theme === "dark") Object.assign(darkVars, vars);
  else if (theme === "light") Object.assign(lightVars, vars);
  else {
    // أول بلوك :root عام = قاعدة الوضع الفاتح؛ أي بلوك عام تالٍ (داخل
    // @media prefers-color-scheme: dark) يُعتبر تراكب الوضع الداكن
    if (Object.keys(lightVars).length === 0) Object.assign(lightVars, vars);
    else Object.assign(darkVars, vars);
  }
}
darkVars = { ...lightVars, ...darkVars }; // الداكن يرث أي متغيّر لم يُعِد تعريفه

// أزواج نص/خلفية ذات معنى فعلي بالموقع (نص عادي + نص كلمحور وصول UI 3:1)
const TEXT_PAIRS = [
  ["--color-text", "--color-bg"],
  ["--color-text", "--color-surface"],
  ["--color-text-muted", "--color-bg"],
  ["--color-text-muted", "--color-surface"],
  ["--color-accent", "--color-bg"],
  ["--color-accent", "--color-surface"],
  ["--color-primary", "--color-bg"],
  ["--color-primary", "--color-surface"],
];
// حدود UI/حدود غير نصية (3:1 كافٍ لـWCAG 1.4.11 Non-text Contrast)
const UI_PAIRS = [
  ["--color-border", "--color-bg"],
  ["--color-border", "--color-surface"],
];

function runTheme(name, vars) {
  console.log(`\n=== ${name} ===`);
  const rows = [];
  for (const [fg, bg] of TEXT_PAIRS) {
    const fgColor = resolveColor(`var(${fg})`, vars);
    const bgColor = resolveColor(`var(${bg})`, vars);
    if (!fgColor || !bgColor) {
      rows.push([fg, bg, "؟", "تعذّر الحل", ""]);
      continue;
    }
    const ratio = contrastRatio(fgColor, bgColor);
    const passNormal = ratio >= 4.5;
    const passLarge = ratio >= 3;
    rows.push([
      `${fg} (${toHex(fgColor)})`,
      `${bg} (${toHex(bgColor)})`,
      ratio.toFixed(2) + ":1",
      passNormal ? "✅ AA نص عادي" : passLarge ? "⚠️ فقط نص كبير/UI" : "❌ فاشل",
    ]);
  }
  for (const [fg, bg] of UI_PAIRS) {
    const fgColor = resolveColor(`var(${fg})`, vars);
    const bgColor = resolveColor(`var(${bg})`, vars);
    if (!fgColor || !bgColor) continue;
    const ratio = contrastRatio(fgColor, bgColor);
    rows.push([
      `${fg} (${toHex(fgColor)}) [حد/UI]`,
      `${bg} (${toHex(bgColor)})`,
      ratio.toFixed(2) + ":1",
      ratio >= 3 ? "✅ 3:1 (غير نصي)" : "❌ فاشل حتى لحد غير نصي",
    ]);
  }
  const width = Math.max(...rows.map((r) => r[0].length), 20);
  for (const [fg, bg, ratio, verdict] of rows) {
    console.log(`  ${fg.padEnd(width)} على ${bg.padEnd(28)} ${ratio.padStart(8)}  ${verdict}`);
  }
  return rows.some((r) => r[3] && r[3].startsWith("❌"));
}

let anyFail = false;
anyFail = runTheme("الوضع الفاتح (light)", lightVars) || anyFail;
anyFail = runTheme("الوضع الداكن (dark)", darkVars) || anyFail;

console.log(
  `\n${anyFail ? "❌ فيه زوج/أزواج فاشلة حتى عن حد 3:1 — راجع أعلاه." : "لا فشل كامل (3:1) — تحقّق من أي ⚠️ أعلاه (أقل من 4.5:1 نص عادي)."}`
);
process.exit(anyFail ? 1 : 0);
