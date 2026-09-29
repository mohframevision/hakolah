// ads.txt — يثبت لمشتري الإعلانات إن ناشر AdSense هذا هو المخوَّل ببيع مساحة الموقع.
// لازم يكون بجذر الدومين (hakolah.com/ads.txt)؛ ما كان ممكناً تحت المسار الفرعي
// github.io/hakolah/. المعرّف يُقرأ من adsense.js فما يتكرر بمكان ثاني.
// f08c47fec0942fa0 = معرّف Google الثابت بشهادة الاعتماد (TAG ID).
exports.data = {
  permalink: "ads.txt",
  eleventyExcludeFromCollections: true,
};

exports.render = function (data) {
  const pub = data.adsense.publisherId.replace(/^ca-/, "");
  return `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`;
};
