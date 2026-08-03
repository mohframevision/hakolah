exports.data = {
  permalink: "sitemap.xml",
  eleventyExcludeFromCollections: true,
};

const SITE_URL = "https://mohframevision.github.io/hakolah";

exports.render = function (data) {
  // كل قسم له تلقائياً نسخة إنجليزية (src/en/section.njk يولّدها بالـ pagination
  // نفسها اللي يستخدمها section.njk العربي) — فما فيه قائمة يدوية تحتاج تحديث
  // لما يُضاف قسم جديد من لوحة التحكم
  const EN_SECTION_SLUGS = data.sections.map((s) => s.slug);

  // مسار عربي بلا امتداد .html <-> مساره الإنجليزي المقابل، لكل صفحة لها نسخة بلغتين فعلياً
  const detailPagePairs = data.sections
    .filter((s) => s.hasDetailPages)
    .flatMap((s) =>
      (data.collections[s.slug] || []).map((entry) => [
        `${s.slug}/${entry.fileSlug}.html`,
        `en/${s.slug}/${entry.data.slug_en || entry.fileSlug}.html`,
      ])
    );

  const bilingualPairs = [
    ["", "en/index.html"],
    ["favorites.html", "en/favorites.html"],
    ["picker.html", "en/picker.html"],
    ["about.html", "en/about.html"],
    ["contact.html", "en/contact.html"],
    ["privacy-policy.html", "en/privacy-policy.html"],
    ["terms.html", "en/terms.html"],
    ...EN_SECTION_SLUGS.map((slug) => [`${slug}.html`, `en/${slug}.html`]),
    ...detailPagePairs,
  ];

  const bilingualItems = bilingualPairs.map(([ar, en]) => {
    const arUrl = `${SITE_URL}/${ar}`;
    const enUrl = `${SITE_URL}/${en}`;
    return (
      `  <url>\n` +
      `    <loc>${arUrl}</loc>\n` +
      `    <xhtml:link rel="alternate" hreflang="ar" href="${arUrl}" />\n` +
      `    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}" />\n` +
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${arUrl}" />\n` +
      `  </url>\n` +
      `  <url>\n` +
      `    <loc>${enUrl}</loc>\n` +
      `    <xhtml:link rel="alternate" hreflang="ar" href="${arUrl}" />\n` +
      `    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}" />\n` +
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${arUrl}" />\n` +
      `  </url>`
    );
  });

  // كل صفحة بالموقع صار لها نسخة بلغتين — ما فيه صفحات "عربي فقط" بعد
  const items = bilingualItems.join("\n");

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    `${items}\n` +
    `</urlset>\n`
  );
};
