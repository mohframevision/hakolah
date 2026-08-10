/*
  يولّد ملف CSS صغير من src/_data/theme.json (تحرّره لوحة التحكم — مجموعة
  "شكل الموقع") ويُربَط بعد style.css بـbase.njk، فقيمته تتغلّب على القيم
  الافتراضية بـ:root هناك. لوحة صريحة (link خارجي) لا وسم <style> مضمّن —
  سياسة CSP (style-src) ما تسمح بـ<style> مضمّن، بس تسمح بملفات من نفس الموقع.

  لون واحد بس لكل وضع (فاتح/داكن) — الباقي (تحويم/لمسة ثانوية) محسوب تلقائياً
  بـcolor-mix() بملف style.css نفسه، فما يحتاج المستخدم يختار أكثر من قيمتين.
*/
exports.data = {
  permalink: "theme.css",
  eleventyExcludeFromCollections: true,
};

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

exports.render = function (data) {
  const theme = data.theme || {};
  const primary = HEX_PATTERN.test(theme.primary) ? theme.primary : null;
  const primaryDark = HEX_PATTERN.test(theme.primaryDarkMode) ? theme.primaryDarkMode : null;

  // قيمة غير صالحة (حرف ناقص، بلا #، إلخ) تُتجاهل بدل ما تكسر كل ألوان
  // الموقع — يبقى اللون الافتراضي بـstyle.css كما هو حتى تُصحَّح القيمة
  let css = "";
  if (primary) css += `:root { --color-primary: ${primary}; }\n`;
  if (primaryDark) {
    css += `@media (prefers-color-scheme: dark) { :root { --color-primary: ${primaryDark}; } }\n`;
    css += `:root[data-theme="dark"] { --color-primary: ${primaryDark}; }\n`;
  }
  if (primary) css += `:root[data-theme="light"] { --color-primary: ${primary}; }\n`;

  return css;
};
