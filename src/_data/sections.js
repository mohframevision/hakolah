const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const AREAS = require("./areas.js");

const SECTIONS_DIR = path.join(__dirname, "..", "sections");

/*
  الأقسام التي لعناصرها موقع فعلي على الأرض — تُدمَج فيها كل مناطق البحرين
  تلقائياً ضمن خيارات التصنيف، فلا يحتاج المستخدم لكتابة اسم منطقة يدوياً
  (والتصنيف المكتوب يدوياً يحتاج ترجمة بالكود وإلا فشل النشر).
  "روابط وأدوات" و"مقالات وأدلة" مستثناة — لا موقع جغرافي لها.
*/
const SECTIONS_WITH_AREAS = ["restaurants", "cafes", "bakeries", "stores", "places"];

// خيارات القسم أولاً (الأكثر استخداماً بالأعلى)، ثم المناطق بلا تكرار
function withAreas(slug, options) {
  if (!SECTIONS_WITH_AREAS.includes(slug)) return options;
  const seen = new Set(options);
  return options.concat(Object.keys(AREAS).filter((a) => !seen.has(a)));
}

/*
  يقرأ تعريفات الأقسام مباشرة من ملفات src/sections/*.md بدل الاعتماد على
  Eleventy collections (غير متاحة وقت تحميل الـ _data). كل قسم جديد يُضاف عبر
  لوحة التحكم (مجموعة "الأقسام") يظهر هنا تلقائياً بعد أول بناء تالٍ.
  مصفوفة (وليست كائناً) عمداً لتفادي أي التباس مع Pagination في Eleventy.
*/
module.exports = () => {
  if (!fs.existsSync(SECTIONS_DIR)) return [];

  const files = fs.readdirSync(SECTIONS_DIR).filter((f) => f.endsWith(".md"));

  const entries = files.map((file) => {
    const raw = fs.readFileSync(path.join(SECTIONS_DIR, file), "utf8");
    const { data } = matter(raw);
    const slug = data.slug || path.basename(file, ".md");
    return {
      slug,
      title: data.title || slug,
      icon: data.icon || "⭐",
      description: data.description || "",
      searchPlaceholder: data.searchPlaceholder || "ابحث…",
      navLabel: data.navLabel || data.title || slug,
      // نصوص القسم بالإنجليزية — تتدهور تدريجياً للعربي لو ما تُرجم القسم بعد
      // (نفس مبدأ title_en/desc_en بالعناصر)، فقسم جديد يُضاف من اللوحة بدون
      // ترجمة يظهر بالنسخة الإنجليزية بعنوانه العربي بدل ما يختفي أو يكسر البناء
      title_en: data.title_en || data.title || slug,
      description_en: data.description_en || data.description || "",
      searchPlaceholder_en: data.searchPlaceholder_en || data.searchPlaceholder || "Search…",
      navLabel_en: data.navLabel_en || data.navLabel || data.title || slug,
      order: typeof data.order === "number" ? data.order : 999,
      hasDetailPages: Boolean(data.hasDetailPages),
      iconOptions:
        Array.isArray(data.iconOptions) && data.iconOptions.length
          ? data.iconOptions
          : ["⭐", "📍", "🔗", "🎯"],
      categoryOptions: withAreas(
        slug,
        Array.isArray(data.categoryOptions) && data.categoryOptions.length
          ? data.categoryOptions
          : ["عام"],
      ),
    };
  });

  entries.sort((a, b) => a.order - b.order);

  return entries;
};
