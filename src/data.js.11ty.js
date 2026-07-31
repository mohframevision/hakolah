exports.data = {
  permalink: "js/data.js",
  eleventyExcludeFromCollections: true,
};

exports.render = function (data) {
  const sections = data.sections;
  const out = {};

  for (const meta of sections) {
    const items = (data.collections[meta.slug] || []).map((entry) => {
      const item = {
        id: entry.fileSlug,
        icon: entry.data.icon || "⭐",
        title: entry.data.title,
        desc: entry.data.desc || "",
        image: entry.data.image || null,
        tags: [...(entry.data.categories || []), ...(entry.data.categoriesCustom || [])],
      };
      if (meta.hasDetailPages) {
        item.detailUrl = `${meta.slug}/${entry.fileSlug}.html`;
      } else {
        item.links = entry.data.links || {};
      }
      return item;
    });

    out[meta.slug] = { title: meta.title, icon: meta.icon, items };
  }

  return (
    "/* هذا الملف يُنشأ تلقائياً من محتوى src/<section>/*.md عبر Eleventy — لا تعدّله يدوياً هنا،" +
    " عدّل أو أضف الملفات في src/restaurants أو src/stores ...إلخ، أو عبر لوحة التحكم /admin */\n" +
    `const SITE_DATA = ${JSON.stringify(out, null, 2)};\n`
  );
};
