exports.data = {
  permalink: "js/menus.js",
  eleventyExcludeFromCollections: true,
};

const { buildSiteData, splitMenus } = require("../eleventy-app-data.js");

// قوائم الطعام (كل فريد مرة وحدة): [[الاسم، الاسم بالإنجليزي، السعر]…] — يحمّله main.js/search.js عند الحاجة
exports.render = function (data) {
  const pool = splitMenus(buildSiteData(data));
  return `/* يُنشأ تلقائياً مع data.js — قوائم الطعام المفصولة عنه */\nconst MENU_POOL = ${JSON.stringify(pool)};\n`;
};
