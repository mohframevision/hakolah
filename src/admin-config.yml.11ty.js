const yaml = require("js-yaml");

exports.data = {
  permalink: "admin/config.yml",
  eleventyExcludeFromCollections: true,
};

function itemFields(entry) {
  const fields = [
    { label: "الاسم", name: "title", widget: "string" },
    {
      label: "أيقونة",
      name: "icon",
      widget: "select",
      options: entry.iconOptions,
      default: entry.iconOptions[0],
    },
    {
      label: entry.hasDetailPages ? "ملخّص قصير (يظهر بكرت القائمة)" : "الوصف",
      name: "desc",
      widget: "text",
    },
    {
      label: "Name in English (اختياري — للنسخة الإنجليزية من الموقع)",
      name: "title_en",
      widget: "string",
      required: false,
    },
    {
      label: "Description in English (اختياري — للنسخة الإنجليزية من الموقع)",
      name: "desc_en",
      widget: "text",
      required: false,
    },
    {
      label: "صورة (اختياري — لو ضفتها بتظهر بدل الأيقونة بكرت العنصر وبأعلى المقال)",
      name: "image",
      widget: "image",
      required: false,
    },
    {
      label:
        "عنصر مميز (يظهر بارز بإطار ملوّن ويترتّب أول القائمة — استخدمه بحذر لعنصر واحد أو اثنين بالقسم بس)",
      name: "featured",
      widget: "boolean",
      required: false,
      default: false,
    },
    {
      label:
        "✅ زرت هذا المكان شخصياً (أنت، صاحب الموقع) — يظهر عليه علامة صغيرة بجانب الاسم توضح إنه مكان جربته بنفسك",
      name: "verified",
      widget: "boolean",
      required: false,
      default: false,
    },
    {
      label:
        "👍 أعجبني هذا المكان (توصية شخصية منك) — يظهر عليه شارة توصية بجانب الاسم. اتركه فاضي لو ما جربته أو ما عجبك، بدون أي شارة سلبية",
      name: "liked",
      widget: "boolean",
      required: false,
      default: false,
    },
    {
      label: "التصنيفات (اختر واحد أو أكثر من القائمة الجاهزة)",
      name: "categories",
      widget: "select",
      multiple: true,
      options: entry.categoryOptions,
      required: false,
    },
    {
      name: "dateAdded",
      widget: "hidden",
      default: "{{now}}",
      required: false,
    },
    {
      label: 'خط العرض Latitude (اختياري — لميزة "قريب مني". اتركه فاضي، بنعبّيه لاحقاً من رابط الخريطة)',
      name: "lat",
      widget: "number",
      required: false,
      value_type: "float",
    },
    {
      label: 'خط الطول Longitude (اختياري — لميزة "قريب مني". اتركه فاضي، بنعبّيه لاحقاً من رابط الخريطة)',
      name: "lng",
      widget: "number",
      required: false,
      value_type: "float",
    },
    {
      label: "تصنيفات جديدة (ما تلقى تصنيفك بالقائمة؟ اكتبه هنا واضغط Enter — بيضاف تلقائياً)",
      name: "categoriesCustom",
      widget: "list",
      required: false,
      default: [],
    },
  ];

  if (entry.hasDetailPages) {
    fields.push({
      label: "المقال الكامل (نبذة، طريقة الوصول، نصائح...)",
      name: "body",
      widget: "markdown",
    });
  } else {
    fields.push(
      {
        label: "نص زر الموقع (اختياري، افتراضي: زيارة — مثال: اطلب الآن)",
        name: "cta",
        widget: "string",
        required: false,
      },
      {
        label: "الروابط",
        name: "links",
        widget: "object",
        fields: [
          {
            label: "موقع إلكتروني (يظهر أول زر وبارز)",
            name: "website",
            widget: "string",
            required: false,
          },
          {
            label: "رقم الهاتف (يُنسخ عند الضغط بدل ما يفتح رابط)",
            name: "phone",
            widget: "string",
            required: false,
          },
          { label: "خرائط قوقل", name: "maps", widget: "string", required: false },
          { label: "إنستقرام", name: "instagram", widget: "string", required: false },
        ],
      }
    );
  }

  return fields;
}

exports.render = function (data) {
  const sections = data.sections;

  const sectionCollections = sections.map((entry) => ({
    name: entry.slug,
    label: entry.title,
    folder: `src/${entry.slug}`,
    create: true,
    slug: "{{slug}}",
    fields: itemFields(entry),
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
      { label: "أيقونة القسم (إيموجي)", name: "icon", widget: "string", default: "⭐" },
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
      {
        label: "كل عنصر له صفحة مقال مفصّلة خاصة به (بدل روابط خارجية فقط)",
        name: "hasDetailPages",
        widget: "boolean",
        default: false,
      },
      {
        label:
          "الأيقونات المتاحة لعناصر هذا القسم (تُعبّى مرة وحدة هنا، وبعدها تختار منها بدل ما تكتب كل مرة)",
        name: "iconOptions",
        widget: "list",
        field: { label: "أيقونة", name: "value", widget: "string" },
      },
      {
        label:
          "التصنيفات المتاحة لعناصر هذا القسم (تُعبّى مرة وحدة هنا، وبعدها تختار منها بدل ما تكتب كل مرة)",
        name: "categoryOptions",
        widget: "list",
        field: { label: "تصنيف", name: "value", widget: "string" },
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
