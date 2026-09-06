const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const markdownItLinkAttributes = require("markdown-it-link-attributes");

/*
  يتأكد كل قسم معرّف في src/sections/*.md له مجلد محتوى خاص به + ملف بيانات
  المجلد (يحدد أن عناصره تنتمي لهذا القسم، وهل عناصره تحصل صفحة مقال مستقلة).
  يعمل قبل كل بناء، فأي قسم جديد يُضاف عبر لوحة التحكم يصير جاهزاً لاستقبال
  عناصر تلقائياً.

  ملف بيانات المجلد المولَّد لازم .11tydata.js لا .json — hasDetailPage صار
  خياراً لكل عنصر بقسم مختلط (مثال: مطعم واحد بقسم مطاعم له مقال بينما البقية
  بطاقات روابط بس)، وهذا يحتاج eleventyComputed اللي JSON العادي ما يدعمه.
  المنطق الفعلي بملف eleventy-section-data.js عشان الملف المولَّد يبقى سطرين.
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
    const dirDataFile = path.join(contentDir, `${slug}.11tydata.js`);
    const legacyJsonFile = path.join(contentDir, `${slug}.json`);

    if (!fs.existsSync(contentDir)) fs.mkdirSync(contentDir, { recursive: true });
    // نسخة قديمة ثابتة من مرحلة قبل الصفحات التفصيلية لكل عنصر — تعارض بياناتها
    // مع الملف المحسوب لو بقيت من بناء سابق (كلاهما يعرّف نفس مفتاح tags/permalink)
    if (fs.existsSync(legacyJsonFile)) fs.unlinkSync(legacyJsonFile);

    const helperPath = path.join(__dirname, "eleventy-section-data.js");
    const content =
      `// يُنشأ تلقائياً من src/sections/${file} — لا تعدّله يدوياً هنا\n` +
      `const { sectionDirData } = require(${JSON.stringify(helperPath)});\n` +
      `module.exports = sectionDirData(${JSON.stringify(slug)}, ${JSON.stringify(Boolean(data.hasDetailPages))}, ${JSON.stringify(data.title || slug)});\n`;

    // نكتب فقط لو المحتوى فعلاً تغيّر. كانت تُكتب بلا شرط بكل بناء (مُشتق بالكامل
    // من sections/*.md، لا يُعدَّل يدوياً) — لكن هذا الملف نفسه داخل src/ المراقَب
    // بوضع npm start، فالكتابة غير المشروطة تلمس mtime حتى بمحتوى مطابق، ومراقب
    // الملفات يعتبرها تغييراً ويعيد البناء، اللي يكتب الملف من جديد... حلقة إعادة
    // بناء لا نهائية تحمّل المعالج وتُعيد تحميل المتصفح باستمرار بلا أي تعديل فعلي
    if (!fs.existsSync(dirDataFile) || fs.readFileSync(dirDataFile, "utf8") !== content) {
      fs.writeFileSync(dirDataFile, content);
    }
  });
}

module.exports = function (eleventyConfig) {
  ensureSectionFolders();
  eleventyConfig.on("eleventy.before", ensureSectionFolders);
  // ملفات البيانات المولَّدة نفسها (src/*/*.11tydata.js) ما لازم تُراقَب — حتى بعد
  // إصلاح الكتابة غير المشروطة أعلاه، راقبنا السيرفر ولقينا Eleventy نفسه يبلّغ
  // "File changed" لهذي الملفات بشكل متكرر بلا أي كتابة فعلية من كودنا (تأكدنا
  // بتعطيل ensureSectionFolders كلياً من هوك eleventy.before والمشكلة استمرت) —
  // على الأغلب خصوصية بمعالجة Eleventy لملفات بيانات JS (إبطال كاش require يلمس
  // الملف). النتيجة: حلقة بناء لا نهائية تحمّل المعالج وتُعيد تحميل المتصفح
  // باستمرار بوضع npm start. استبعادها من المراقبة صراحة يحل الجذر بغض النظر
  // عن السبب الداخلي — هذي ملفات مُشتقة بالكامل من src/sections/*.md، لا تُعدَّل
  // يدوياً، فمراقبتها للتغيير لا قيمة له أصلاً (زي عدم مراقبة _site/)
  eleventyConfig.watchIgnores.add("src/*/*.11tydata.js");

  // ملفات ثابتة تُنسخ كما هي بدون معالجة
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/admin");
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  eleventyConfig.addFilter("json", (value) => JSON.stringify(value));
  /* تاريخ بصيغة YYYY-MM-DD. لازم فلتر: YAML يحوّل `2026-08-20` لكائن Date،
     وطباعته كما هي بالقالب تطبع "Thu Aug 20 2026 03:00:00 GMT+0300 (...)" */
  eleventyConfig.addFilter("isoDate", (value) => {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10);
  });
  eleventyConfig.addFilter("replace", (str, search, replacement) =>
    typeof str === "string" ? str.split(search).join(replacement) : str
  );

  // أي رابط خارجي (http/https) داخل محتوى Markdown يفتح بتبويب جديد — حتى
  // يضل الزائر بموقعنا مفتوح بدل ما يختفي من شريط المتصفح (الروابط الداخلية
  // النسبية ما تتأثر، وأزرار البطاقات (موقع/خرائط/إنستقرام) أصلاً مضبوطة
  // بنفس الطريقة من main.js مباشرة)
  eleventyConfig.amendLibrary("md", (mdLib) =>
    mdLib.use(markdownItLinkAttributes, {
      matcher: (href) => /^https?:\/\//.test(href),
      attrs: {
        target: "_blank",
        rel: "noopener noreferrer",
      },
    })
  );

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
