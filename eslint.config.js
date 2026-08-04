const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  js.configs.recommended,
  {
    // cf-worker مشروع Cloudflare Worker مستقل تماماً بأدوات وتشغيل خاصة فيه (wrangler)
    // poster-editor/vendor مكتبة خارجية منسوخة كما هي — لا تُعدَّل ولا تُفحص
    ignores: ["_site/**", "node_modules/**", "cf-worker/**", "poster-editor/vendor/**"],
  },
  {
    // كود المتصفح (يعمل عبر <script> عادي، بدون نظام وحدات)
    files: ["src/js/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        ...globals.browser,
        SITE_DATA: "readonly",
        TAGS_EN: "readonly",
      },
    },
    rules: {
      // renderSection/renderFavoritesPage/initRandomPicker/renderFeaturedPick تُستدعى من
      // <script> مضمّن بقوالب Nunjucks (base.njk) وليس من داخل main.js نفسه، فتبدو "غير
      // مستخدمة" لـ ESLint
      "no-unused-vars": [
        "error",
        {
          varsIgnorePattern:
            "^(renderSection|renderFavoritesPage|initRandomPicker|renderFeaturedPick|initPushNotifications|renderTrendingSection|renderExploreProgress)$",
        },
      ],
    },
  },
  {
    // محرر البوسترات — أداة محلية مستقلة (خارج src/ فلا تُبنى ولا تُنشر)،
    // تعمل بالمتصفح وتستخدم qrcode العام من vendor/qrcode.js
    files: ["poster-editor/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: { ...globals.browser, qrcode: "readonly" },
    },
    rules: {
      // toPngBlob تُستدعى من أدوات الفحص الآلي بالمتصفح أيضاً
      "no-unused-vars": ["error", { varsIgnorePattern: "^toPngBlob$" }],
    },
  },
  {
    // Service Worker (نطاق عالمي مختلف عن المتصفح العادي — self بدل window، لا يوجد DOM)
    files: ["src/sw.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: globals.serviceworker,
    },
  },
  {
    // كود Node (إعدادات Eleventy، سكربتات مساعدة، مولّدات صفحات .11ty.js، ملفات بيانات _data)
    files: ["*.js", "scripts/**/*.js", "src/**/*.11ty.js", "src/_data/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: globals.node,
    },
  },
];
