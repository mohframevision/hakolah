exports.data = {
  permalink: "robots.txt",
  eleventyExcludeFromCollections: true,
};

exports.render = function () {
  return (
    "User-agent: *\n" +
    "Allow: /\n" +
    "Disallow: /admin/\n" +
    "Disallow: /stats.html\n\n" +
    "Sitemap: https://mohframevision.github.io/hakolah/sitemap.xml\n"
  );
};
