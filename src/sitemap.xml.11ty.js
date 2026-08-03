exports.data = {
  permalink: "sitemap.xml",
  eleventyExcludeFromCollections: true,
};

const SITE_URL = "https://mohframevision.github.io/hakolah";

// أقسام لها نسخة إنجليزية موازية فعلياً تحت src/en/ (راجع langSwitchUrl بـ section.njk)
const EN_SECTION_SLUGS = ["links-tools", "restaurants", "stores", "cafes", "bakeries", "places", "guides"];

exports.render = function (data) {
  // مسار عربي بلا امتداد .html <-> مساره الإنجليزي المقابل، لكل صفحة لها نسخة بلغتين فعلياً
  const detailPagePairs = data.sections
    .filter((s) => s.hasDetailPages && EN_SECTION_SLUGS.includes(s.slug))
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

  const arabicOnlyPages = data.sections
    .map((s) => s.slug)
    .filter((slug) => !EN_SECTION_SLUGS.includes(slug))
    .map((slug) => `${slug}.html`);

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

  const arabicOnlyItems = arabicOnlyPages.map(
    (path) => `  <url><loc>${SITE_URL}/${path}</loc></url>`
  );

  const items = [...bilingualItems, ...arabicOnlyItems].join("\n");

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    `${items}\n` +
    `</urlset>\n`
  );
};
