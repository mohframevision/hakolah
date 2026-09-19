// نسخة JSON نقية من نفس بيانات data.js — لتطبيق الأندرويد تحديداً، اللي يحتاج
// JSON.parse مباشر بدل تفكيك متغيرات جافاسكربت. نفس المصدر بالضبط
// (eleventy-app-data.js)، فما فيه احتمال يختلف الموقع عن التطبيق بمحتواه.
exports.data = {
  permalink: "app-data.json",
  eleventyExcludeFromCollections: true,
};

const { buildSiteData } = require("../eleventy-app-data.js");

exports.render = function (data) {
  const sections = buildSiteData(data);
  return JSON.stringify({
    // ترتيب الأقسام صريح هنا: ترتيب مفاتيح كائن JSON غير مضمون بكل مكتبات
    // التفكيك (بعكس JS بالمتصفح) — التطبيق يعتمد على هذي القائمة، مو على
    // ترتيب تكرار مفاتيح "sections" نفسه
    sectionOrder: data.sections.map((s) => s.slug),
    sections,
    tagsEn: data.tags_en,
    tagIcons: data.tag_icons,
  });
};
