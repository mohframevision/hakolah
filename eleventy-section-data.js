/*
  منطق ملف بيانات مجلد قسم واحد — يستدعيه كل src/<slug>/<slug>.11tydata.js
  المولَّد تلقائياً من ensureSectionFolders() بـ .eleventy.js.

  hasDetailPages (قسم كامل، من sections/*.md) أو hasDetailPage (عنصر واحد
  بقسم مختلط، من لوحة التحكم) — أي منهما يعطي العنصر صفحة مقال مستقلة، فالفحص
  eleventyComputed لازم (لا قيمة ثابتة) عشان القرار يكون لكل عنصر لا للقسم كامل.
*/
function sectionDirData(slug, sectionHasDetailPages, sectionTitle) {
  const hasDetail = (data) => sectionHasDetailPages || Boolean(data.hasDetailPage);
  return {
    tags: slug,
    eleventyExcludeFromCollections: false,
    eleventyComputed: {
      permalink: (data) => (hasDetail(data) ? `${slug}/${data.page.fileSlug}.html` : false),
      layout: (data) => (hasDetail(data) ? "detail-item.njk" : undefined),
      navActive: (data) => (hasDetail(data) ? slug : undefined),
      sectionSlug: (data) => (hasDetail(data) ? slug : undefined),
      sectionTitle: (data) => (hasDetail(data) ? sectionTitle : undefined),
    },
  };
}

module.exports = { sectionDirData };
