exports.data = {
  permalink: "sitemap.xml",
  eleventyExcludeFromCollections: true,
};

const SITE_URL = "https://mohframevision.github.io/hakolah";

exports.render = function (data) {
  const staticPages = [
    "",
    "favorites.html",
    "about.html",
    "contact.html",
    "privacy-policy.html",
    "terms.html",
  ];
  const sectionPages = data.sections.map((s) => `${s.slug}.html`);
  const urls = [...staticPages, ...sectionPages];

  const items = urls.map((path) => `  <url><loc>${SITE_URL}/${path}</loc></url>`).join("\n");

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${items}\n` +
    `</urlset>\n`
  );
};
