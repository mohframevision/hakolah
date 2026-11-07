// بيانات أقسام الأماكن (انتقلت إلى توريلو) — يقرؤها بحث بوزون وحده (dilmo.js)، فلا تُحمَّل إلا في صفحته
exports.data = {
  permalink: "js/places.js",
  eleventyExcludeFromCollections: true,
};

const { siteDataParts } = require("./data.js.11ty.js");

exports.render = function (data) {
  return `/* يُنشأ تلقائياً مع data.js */\nconst SITE_DATA = ${JSON.stringify(siteDataParts(data).places)};\n`;
};
