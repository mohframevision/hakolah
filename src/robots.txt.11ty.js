exports.data = {
  permalink: "robots.txt",
  eleventyExcludeFromCollections: true,
};

exports.render = function () {
  return (
    "User-agent: *\n" +
    "Allow: /\n" +
    "Disallow: /admin/\n\n" +
    "Sitemap: https://mohframevision.github.io/hakolah/sitemap.xml\n" +
    // نسخة طبق الأصل باسم ثانٍ — سيرش كونسول عالقة بحالة فشل قديمة مربوطة
    // باسم "sitemap.xml" تحديداً رغم إن الملف سليم؛ راجع sitemap-v2.xml.11ty.js
    "Sitemap: https://mohframevision.github.io/hakolah/sitemap-v2.xml\n"
  );
};
