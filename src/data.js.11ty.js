exports.data = {
  permalink: "js/data.js",
  eleventyExcludeFromCollections: true,
};

exports.render = function (data) {
  const sections = data.sections;
  const out = {};

  for (const [key, meta] of Object.entries(sections)) {
    const items = (data.collections[meta.tag] || []).map((entry) => {
      return {
        id: entry.fileSlug,
        icon: entry.data.icon || "⭐",
        title: entry.data.title,
        desc: entry.data.desc || "",
        tags: entry.data.categories || [],
        links: entry.data.links || {},
      };
    });

    out[key] = { title: meta.title, icon: meta.icon, items };
  }

  return (
    "/* هذا الملف يُنشأ تلقائياً من محتوى src/<section>/*.md عبر Eleventy — لا تعدّله يدوياً هنا،" +
    " عدّل أو أضف الملفات في src/restaurants أو src/stores ...إلخ، أو عبر لوحة التحكم /admin */\n" +
    `const SITE_DATA = ${JSON.stringify(out, null, 2)};\n`
  );
};
