/*
  نسخة طبق الأصل من sitemap.xml بس باسم ملف مختلف — سيرش كونسول علّق على
  "sitemap.xml" تحديداً بحالة "Sitemap could not be read" لأسبوعين رغم إن
  الملف سليم ١٠٠٪ بكل فحص (XML صحيح، Googlebot يوصله 200، بلا أي مشكلة
  تقنية حقيقية). هذا نمط معروف: قوقل يحتفظ بحالة فشل قديمة مربوطة بالـURL
  نفسه ولا يعيد المحاولة تلقائياً حتى لو الملف صار سليماً. الحل المعروف
  (منتدى Reddit، متكرر بحالات مشابهة على GitHub Pages): اسم ملف جديد
  يفتح محاولة فحص جديدة تماماً بدل الاعتماد على الحالة العالقة القديمة.
  المنطق نفسه من sitemap.xml.11ty.js حرفياً — لا تكرار، استدعاء مباشر.
*/
const original = require("./sitemap.xml.11ty.js");

exports.data = {
  permalink: "sitemap-v2.xml",
  eleventyExcludeFromCollections: true,
};

exports.render = original.render;
