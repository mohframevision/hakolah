exports.data = {
  permalink: "js/data.js",
  eleventyExcludeFromCollections: true,
};

const NEW_BADGE_DAYS = 7;

exports.render = function (data) {
  const sections = data.sections;
  const out = {};
  const now = Date.now();

  for (const meta of sections) {
    const items = (data.collections[meta.slug] || []).map((entry) => {
      const addedAt = entry.data.dateAdded ? new Date(entry.data.dateAdded).getTime() : NaN;
      const item = {
        id: entry.fileSlug,
        icon: entry.data.icon || "⭐",
        title: entry.data.title,
        desc: entry.data.desc || "",
        image: entry.data.image || null,
        featured: Boolean(entry.data.featured),
        verified: Boolean(entry.data.verified),
        isNew: !Number.isNaN(addedAt) && now - addedAt < NEW_BADGE_DAYS * 86400000,
        lat: typeof entry.data.lat === "number" ? entry.data.lat : null,
        lng: typeof entry.data.lng === "number" ? entry.data.lng : null,
        tags: [...(entry.data.categories || []), ...(entry.data.categoriesCustom || [])],
      };
      if (meta.hasDetailPages) {
        item.detailUrl = `${meta.slug}/${entry.fileSlug}.html`;
      } else {
        item.links = entry.data.links || {};
        item.cta = entry.data.cta || null;
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
