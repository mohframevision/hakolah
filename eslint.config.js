const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  js.configs.recommended,
  {
    ignores: ["_site/**", "node_modules/**"],
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
      },
    },
    rules: {
      // renderSection/renderFavoritesPage/initRandomPicker تُستدعى من <script> مضمّن
      // بقوالب Nunjucks (base.njk) وليس من داخل main.js نفسه، فتبدو "غير مستخدمة" لـ ESLint
      "no-unused-vars": [
        "error",
        { varsIgnorePattern: "^(renderSection|renderFavoritesPage|initRandomPicker)$" },
      ],
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
