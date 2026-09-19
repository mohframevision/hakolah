exports.data = {
  permalink: "js/data.js",
  eleventyExcludeFromCollections: true,
};

const { buildSiteData } = require("../eleventy-app-data.js");

exports.render = function (data) {
  const out = buildSiteData(data);

  return (
    "/* هذا الملف يُنشأ تلقائياً من محتوى src/<section>/*.md عبر Eleventy — لا تعدّله يدوياً هنا،" +
    " عدّل أو أضف الملفات في src/restaurants أو src/stores ...إلخ، أو عبر لوحة التحكم /admin */\n" +
    `const SITE_DATA = ${JSON.stringify(out, null, 2)};\n` +
    "/* قاموس ترجمة التصنيفات — مصدره src/_data/tags_en.js، وهو نفسه المستخدم\n" +
    "   بالقوالب وقت البناء، فما تصير نسختان تنحرفان عن بعض */\n" +
    `const TAGS_EN = ${JSON.stringify(data.tags_en, null, 2)};\n` +
    "/* أيقونات التصنيفات — مصدره src/_data/tag_icons.js، نفس مبدأ TAGS_EN */\n" +
    `const TAG_ICONS = ${JSON.stringify(data.tag_icons, null, 2)};\n`
  );
};
