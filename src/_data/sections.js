const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const SECTIONS_DIR = path.join(__dirname, "..", "sections");

/*
  يقرأ تعريفات الأقسام مباشرة من ملفات src/sections/*.md بدل الاعتماد على
  Eleventy collections (غير متاحة وقت تحميل الـ _data). كل قسم جديد يُضاف عبر
  لوحة التحكم (مجموعة "الأقسام") يظهر هنا تلقائياً بعد أول بناء تالٍ.
  مصفوفة (وليست كائناً) عمداً لتفادي أي التباس مع Pagination في Eleventy.
*/
module.exports = () => {
  if (!fs.existsSync(SECTIONS_DIR)) return [];

  const files = fs
    .readdirSync(SECTIONS_DIR)
    .filter((f) => f.endsWith(".md"));

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
      order: typeof data.order === "number" ? data.order : 999,
    };
  });

  entries.sort((a, b) => a.order - b.order);

  return entries;
};
