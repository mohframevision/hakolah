const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

/*
  يتأكد كل قسم معرّف في src/sections/*.md له مجلد محتوى خاص به + ملف بيانات
  المجلد (يحدد أن عناصره تنتمي لهذا القسم ولا تُبنى كصفحات مستقلة). يعمل قبل
  كل بناء، فأي قسم جديد يُضاف عبر لوحة التحكم يصير جاهزاً لاستقبال عناصر تلقائياً.
*/
function ensureSectionFolders() {
  const sectionsDir = path.join(__dirname, "src", "sections");
  if (!fs.existsSync(sectionsDir)) return;

  const files = fs.readdirSync(sectionsDir).filter((f) => f.endsWith(".md"));

  files.forEach((file) => {
    const raw = fs.readFileSync(path.join(sectionsDir, file), "utf8");
    const { data } = matter(raw);
    const slug = data.slug || path.basename(file, ".md");
    if (!slug) return;

    const contentDir = path.join(__dirname, "src", slug);
    const dirDataFile = path.join(contentDir, `${slug}.json`);

    if (!fs.existsSync(contentDir)) fs.mkdirSync(contentDir, { recursive: true });
    if (!fs.existsSync(dirDataFile)) {
      fs.writeFileSync(
        dirDataFile,
        JSON.stringify(
          { tags: slug, permalink: false, eleventyExcludeFromCollections: false },
          null,
          2
        ) + "\n"
      );
    }
  });
}

module.exports = function (eleventyConfig) {
  ensureSectionFolders();
  eleventyConfig.on("eleventy.before", ensureSectionFolders);

  // ملفات ثابتة تُنسخ كما هي بدون معالجة
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/admin");
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  eleventyConfig.addFilter("json", (value) => JSON.stringify(value));

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    templateFormats: ["njk", "md", "11ty.js"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};
