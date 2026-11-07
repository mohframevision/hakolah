exports.data = {
  permalink: "js/data.js",
  eleventyExcludeFromCollections: true,
};

const { buildSiteData, PRICE_TAGS, splitMenus } = require("../eleventy-app-data.js");
const { toriluUrl } = require("../torilu.js");

// أقسام الأماكن انتقلت إلى توريلو: بياناتها في js/places.js (places.js.11ty.js) لبحث بوزون وحده،
// وهذا الملف لصفحات الأقسام الحيّة. splitMenus قبل الفصل كي تبقى أرقام menuRef كما في menus.js
function siteDataParts(data) {
  const out = buildSiteData(data);
  splitMenus(out);
  const live = {};
  const places = {};
  for (const slug in out) (toriluUrl("/" + slug + ".html") ? places : live)[slug] = out[slug];
  return { live, places };
}
exports.siteDataParts = siteDataParts;

exports.render = function (data) {
  return (
    "/* هذا الملف يُنشأ تلقائياً من محتوى src/<section>/*.md عبر Eleventy — لا تعدّله يدوياً هنا،" +
    " عدّل أو أضف الملفات في src/links-tools أو src/guides ...إلخ، أو عبر لوحة التحكم /admin */\n" +
    `const SITE_DATA = ${JSON.stringify(siteDataParts(data).live, null, 2)};\n` +
    "/* قاموس ترجمة التصنيفات — مصدره src/_data/tags_en.js، وهو نفسه المستخدم\n" +
    "   بالقوالب وقت البناء، فما تصير نسختان تنحرفان عن بعض */\n" +
    `const TAGS_EN = ${JSON.stringify(data.tags_en, null, 2)};\n` +
    "/* أيقونات التصنيفات — مصدره src/_data/tag_icons.js، نفس مبدأ TAGS_EN */\n" +
    `const TAG_ICONS = ${JSON.stringify(data.tag_icons, null, 2)};\n` +
    "/* أسماء المناطق ومستويات السعر — تفرّق فلتر المنطقة والسعر عن فلتر النوع */\n" +
    `const AREA_NAMES = ${JSON.stringify(Object.keys(data.areas))};\n` +
    `const PRICE_TAGS = ${JSON.stringify(PRICE_TAGS)};\n`
  );
};
