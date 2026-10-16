const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  js.configs.recommended,
  {
    // cf-worker مشروع Cloudflare Worker مستقل تماماً بأدوات وتشغيل خاصة فيه (wrangler)
    // poster-editor/vendor مكتبة خارجية منسوخة كما هي — لا تُعدَّل ولا تُفحص
    // places-picker/data.js ملف بيانات مولّد آلياً (نحو 400 كيلوبايت)
    // .claude/skills أدوات وكيل (agent tooling) — سكربتات Node.js عادية تشغّل خارج
    // نظام البناء، مو جزءاً من كود الموقع المفحوص
    ignores: [
      "_site/**",
      "_to_delete/**", // سلة نقل مؤقتة لملفات .git/*.lock العالقة ونسخ _site قديمة (راجع مراجعات-يومية/سجل-المشاكل.md) — بلا أي قيمة، مو جزءاً من كود الموقع
      // هكوله/ فولدر الملفات المحلي (مجلد مرفوعة/غير متتبَّع بـgit، راجع .gitignore) —
      // يحوي هكوله/فيديو/hakolah-videos مشروع Remotion مستقل بـnode_modules خاص فيه
      // (+10000 ملف js). بدون هذا الاستثناء `eslint .` يفحص ذاك node_modules نفسه
      // ويطيح بخطأ داخلي بـESLint (scopeManager.addGlobals) — اكتُشف 2026-10-09.
      "هكوله/**",
      "node_modules/**",
      "cf-worker/**",
      "poster-editor/vendor/**",
      // مكتبة ترميز MP3 خارجية (lamejs) تُشحن كما هي بلا تعديل
      "src/js/vendor/**",
      "places-picker/data.js",
      ".claude/skills/**",
    ],
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
        TAG_ICONS: "readonly",
        AREA_NAMES: "readonly",
        PRICE_TAGS: "readonly",
        SEARCH_DATA: "readonly",
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
            "^(renderSection|renderFavoritesPage|initRandomPicker|openPickerReveal|sectionLabel|audioBufferToWav|audioBufferToMp3|lsSet|renderFeaturedPick|initPushNotifications|renderTrendingSection|renderExploreProgress)$",
        },
      ],
    },
  },
  {
    // main.js وملفات الصفحات (picker/converter/expense/typing) بنفس الصفحة بلا وحدات: كل واحد يستخدم دوال الثاني العامة
    files: ["src/js/main.js"],
    languageOptions: { globals: { initRandomPicker: "readonly" } },
  },
  {
    files: ["src/js/picker.js", "src/js/converter.js", "src/js/expense.js", "src/js/typing.js", "src/js/search.js", "src/js/home.js"],
    languageOptions: {
      globals: Object.fromEntries(
        ["t", "itemTitle", "sectionLabel", "playSound", "playClickSound", "playSuccessSound", "isSoundEnabled", "getAudioContext", "tagLabel", "LINK_META", "buildActionsHtml", "wireItemActions", "showToast", "nearestBranch", "lsGet", "lsSet", "audioBufferToWav", "audioBufferToMp3", "loadLameEncoder", "itemDesc", "escapeHtml", "levenshtein"].map((n) => [n, "readonly"])
      ),
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
    // منتقي الأماكن — أداة محلية مستقلة (خارج src/ فلا تُبنى ولا تُنشر)،
    // تقرأ PLACES وSECTIONS من data.js المولّد
    files: ["places-picker/picker.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: { ...globals.browser, PLACES: "readonly", SECTIONS: "readonly" },
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
    // كود Node (إعدادات Eleventy، سكربتات مساعدة، مولّدات صفحات .11ty.js،
    // ملفات بيانات المجلد .11tydata.js، ملفات بيانات _data)
    files: [
      "*.js",
      "scripts/**/*.js",
      "src/**/*.11ty.js",
      "src/**/*.11tydata.js",
      "src/_data/**/*.js",
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: globals.node,
    },
  },
];
