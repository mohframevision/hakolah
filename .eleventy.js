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

    const dirData = data.hasDetailPages
      ? {
          tags: slug,
          eleventyExcludeFromCollections: false,
          layout: "detail-item.njk",
          navActive: slug,
          sectionSlug: slug,
          sectionTitle: data.title || slug,
          permalink: `${slug}/{{ page.fileSlug }}.html`,
        }
      : { tags: slug, permalink: false, eleventyExcludeFromCollections: false };

    // يُعاد إنشاؤه في كل مرة عمداً (مُشتق بالكامل من sections/*.md، لا يُعدَّل يدوياً)
    fs.writeFileSync(dirDataFile, JSON.stringify(dirData, null, 2) + "\n");
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
  eleventyConfig.addPassthroughCopy("src/sw.js");

  eleventyConfig.addFilter("json", (value) => JSON.stringify(value));

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    // الموقع منشور تحت مسار فرعي (mohframevision.github.io/hakolah/) وليس على جذر
    // النطاق مباشرة — هذا يجعل فلتر url ينتج روابط صحيحة بغض النظر عن عمق الصفحة
    // (مثال: places/karbabad-beach.html) بدل روابط نسبية تنكسر بالصفحات المتداخلة.
    pathPrefix: "/hakolah/",
    templateFormats: ["njk", "md", "11ty.js"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};
