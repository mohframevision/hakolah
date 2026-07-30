// يستخرج شكل حرف "ه" كمسار SVG ثابت من خط Noto Kufi Arabic Bold (بدل الاعتماد
// على عنصر <text> الذي فشل بعرض الحرف بشكل واضح أثناء التحويل إلى PNG — خطوط
// الـ sans العربية الحديثة (Tahoma/Arial/Noto Sans) ترسم الهاء المفردة كشكل
// "دمعة" غير مفهوم بصرياً كأيقونة صغيرة، بينما Kufi هندسي وواضح حتى بحجم صغير).
//
// يُحسب المسار دائماً بحجم خط ثابت (500) ثم يُغلَّف بـ <g transform="translate scale">
// بدل حقن حجم خط صغير مباشرة في getPath — تمرير حجم صغير جداً لـ opentype.js يُنتج
// إحداثيات NaN أحياناً بسبب تقريب toPathData(2) لأرقام عشرية دقيقة جداً.
const fs = require("fs");
const opentype = require("opentype.js");

const FONT_SIZE = 500;
const font = opentype.parse(fs.readFileSync("C:/Windows/Fonts/NotoKufiArabic-Bold.ttf"));
const glyph = font.charToGlyph("ه");
const basePath = glyph.getPath(0, 0, FONT_SIZE);
const bbox = basePath.getBoundingBox();
const glyphW = bbox.x2 - bbox.x1;
const glyphH = bbox.y2 - bbox.y1;
const baseD = basePath.toPathData(2);

// يرجع <g transform="..."><path d="..."/></g> يضع الحرف متوسطاً داخل مستطيل الهدف x,y,w,h
function fitGlyphInRect(x, y, w, h) {
  const scale = Math.min(w / glyphW, h / glyphH);
  const tx = x + (w - glyphW * scale) / 2 - bbox.x1 * scale;
  const ty = y + (h - glyphH * scale) / 2 - bbox.y1 * scale;
  return `<g transform="translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${scale.toFixed(6)})"><path d="${baseD}"/></g>`;
}

function groupForBox(targetSize, padRatio = 0.08) {
  const pad = targetSize * padRatio;
  const avail = targetSize - pad * 2;
  return fitGlyphInRect(pad, pad, avail, avail);
}

module.exports = { groupForBox, fitGlyphInRect };
