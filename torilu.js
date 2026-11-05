// دليل الأماكن انتقل إلى توريلو (قرار المالك 2026-11-04) — نفس المسارات هناك.
// صفحة يطابق مسارها هذا النمط تُبنى صفحة تحويل (base.njk) وتخرج من خريطة الموقع.
// مكان جديد بأي قسم من هذه الأقسام يتحوّل تلقائياً بلا أي تعديل هنا.
const ORIGIN = "https://torilu.com";
const SECTIONS = "restaurants|cafes|bakeries|stores|places|car-shops";
const MOVED = new RegExp(
  `^/(?:en/)?(?:(?:${SECTIONS}|menu)/.|(?:${SECTIONS}|search|picker|favorites|plan|business|welcome)\\.html$)`
);

function toriluUrl(url) {
  const path = decodeURI(url || "");
  return MOVED.test(path) ? ORIGIN + encodeURI(path) : "";
}

module.exports = { ORIGIN, toriluUrl };
