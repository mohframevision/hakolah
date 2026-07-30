const yaml = require("js-yaml");

exports.data = {
  permalink: "admin/config.yml",
  eleventyExcludeFromCollections: true,
};

function itemFields(defaultIcon) {
  return [
    { label: "الاسم", name: "title", widget: "string" },
    { label: "أيقونة (إيموجي)", name: "icon", widget: "string", default: defaultIcon },
    { label: "الوصف", name: "desc", widget: "text" },
    {
      label: "التصنيفات",
      name: "categories",
      widget: "list",
      field: { label: "تصنيف", name: "tag", widget: "string" },
    },
    {
      label: "الروابط",
      name: "links",
      widget: "object",
      fields: [
        { label: "خرائط قوقل", name: "maps", widget: "string", required: false },
        { label: "إنستقرام", name: "instagram", widget: "string", required: false },
        { label: "موقع إلكتروني", name: "website", widget: "string", required: false },
      ],
    },
  ];
}

exports.render = function (data) {
  const sections = data.sections;

  const sectionCollections = sections.map((entry) => ({
    name: entry.slug,
    label: entry.title,
    folder: `src/${entry.slug}`,
    create: true,
    slug: "{{slug}}",
    fields: itemFields(entry.icon),
  }));

  const sectionsMetaCollection = {
    name: "sections",
    label: "الأقسام (إدارة أقسام الموقع نفسها)",
    folder: "src/sections",
    create: true,
    slug: "{{fields.slug}}",
    fields: [
      {
        label: "المعرّف (بالإنجليزي، بدون مسافات، مثال: movies)",
        name: "slug",
        widget: "string",
        pattern: ["^[a-z0-9-]+$", "حروف إنجليزية صغيرة وأرقام وشرطات فقط، بدون مسافات"],
      },
      { label: "اسم القسم (يظهر للزوار)", name: "title", widget: "string" },
      { label: "اسم مختصر للقائمة العلوية", name: "navLabel", widget: "string" },
      { label: "أيقونة (إيموجي)", name: "icon", widget: "string", default: "⭐" },
      { label: "وصف قصير", name: "description", widget: "text" },
      {
        label: "نص placeholder لصندوق البحث",
        name: "searchPlaceholder",
        widget: "string",
        default: "ابحث…",
      },
      {
        label: "ترتيب الظهور (رقم أصغر = أسبق)",
        name: "order",
        widget: "number",
        default: 999,
      },
    ],
  };

  const pagesCollection = {
    name: "pages",
    label: "صفحات الموقع الثابتة",
    files: [
      {
        name: "about",
        label: "عن الموقع",
        file: "src/about.md",
        fields: [
          { label: "عنوان التبويب", name: "title", widget: "string" },
          { label: "المحتوى", name: "body", widget: "markdown" },
        ],
      },
      {
        name: "privacy-policy",
        label: "سياسة الخصوصية",
        file: "src/privacy-policy.md",
        fields: [
          { label: "عنوان التبويب", name: "title", widget: "string" },
          { label: "المحتوى", name: "body", widget: "markdown" },
        ],
      },
    ],
  };

  const config = {
    backend: {
      name: "github",
      repo: "mohframevision/hakolah",
      branch: "main",
    },
    media_folder: "src/assets/uploads",
    public_folder: "/hakolah/assets/uploads",
    collections: [...sectionCollections, sectionsMetaCollection, pagesCollection],
  };

  return (
    "# هذا الملف يُنشأ تلقائياً من src/admin-config.yml.11ty.js — لا تعدّله يدوياً هنا\n" +
    yaml.dump(config, { lineWidth: -1 })
  );
};
