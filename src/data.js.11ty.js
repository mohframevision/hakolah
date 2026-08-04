exports.data = {
  permalink: "js/data.js",
  eleventyExcludeFromCollections: true,
};

const NEW_BADGE_DAYS = 7;

/*
  يستخرج الإحداثيات من حقل "coords" الواحد بلوحة التحكم، أياً كانت الصيغة
  اللي نسخها المستخدم — بدل ما يضطر يفصلها بيده لحقلين (lat/lng).

  الصيغ المدعومة (كلها تُنسخ فعلياً من خرائط قوقل):
    26.2334276, 50.5192457          ← نسخ الإحداثيات مباشرة
    26.2334276،50.5192457           ← بفاصلة عربية (لوحة مفاتيح عربية)
    26.2334276 50.5192457           ← بمسافة فقط
    https://.../@26.2334276,50.5192457,17z/...   ← لصق رابط الخرائط كامل
    https://.../!3d26.2334276!4d50.5192457       ← صيغة داخلية أخرى للروابط

  يرجع null لأي إدخال غير صالح (فاضي، نص عشوائي، أرقام خارج المدى) بدل ما
  يمرر قيمة خاطئة تكسر ترتيب "قريب مني".
*/
function parseCoords(raw) {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s) return null;

  const patterns = [
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/, // رابط خرائط: @lat,lng
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/, // رابط خرائط: !3d!4d
    /(-?\d+(?:\.\d+)?)\s*[,،]\s*(-?\d+(?:\.\d+)?)/, // رقمان بفاصلة (عربية أو إنجليزية)
    /^(-?\d+\.\d+)\s+(-?\d+\.\d+)$/, // رقمان بمسافة فقط
  ];

  for (const re of patterns) {
    const m = s.match(re);
    if (!m) continue;
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) continue; // خارج المدى الجغرافي
    if (lat === 0 && lng === 0) continue; // نقطة الصفر غالباً إدخال خاطئ
    return { lat, lng };
  }
  return null;
}

exports.render = function (data) {
  const sections = data.sections;
  const out = {};
  const now = Date.now();

  for (const meta of sections) {
    const items = (data.collections[meta.slug] || []).map((entry) => {
      const addedAt = entry.data.dateAdded ? new Date(entry.data.dateAdded).getTime() : NaN;
      // حقل coords الجديد له الأولوية، ويُرجَع لحقلي lat/lng القديمين لو كان
      // فاضياً — فالعناصر الـ52 المعبّأة سابقاً تظل تشتغل بلا أي تعديل
      const coords = parseCoords(entry.data.coords);
      const item = {
        id: entry.fileSlug,
        icon: entry.data.icon || "⭐",
        title: entry.data.title,
        desc: entry.data.desc || "",
        title_en: entry.data.title_en || "",
        desc_en: entry.data.desc_en || "",
        image: entry.data.image || null,
        featured: Boolean(entry.data.featured),
        verified: Boolean(entry.data.verified),
        liked: Boolean(entry.data.liked),
        isNew: !Number.isNaN(addedAt) && now - addedAt < NEW_BADGE_DAYS * 86400000,
        lat: coords ? coords.lat : typeof entry.data.lat === "number" ? entry.data.lat : null,
        lng: coords ? coords.lng : typeof entry.data.lng === "number" ? entry.data.lng : null,
        tags: [...(entry.data.categories || []), ...(entry.data.categoriesCustom || [])],
      };
      if (meta.hasDetailPages) {
        item.detailUrl = `${meta.slug}/${entry.fileSlug}.html`;
        // slug_en اختياري — لازم فقط لو ملف Markdown العربي اسمه بالعربي
        // (مثل ممشى-توبلي.md) بينما ملف النسخة الإنجليزية المقابلة له بالإنجليزي
        item.detailUrlEn = `${meta.slug}/${entry.data.slug_en || entry.fileSlug}.html`;
      } else {
        item.links = entry.data.links || {};
        item.cta = entry.data.cta || null;
        item.cta_en = entry.data.cta_en || null;
      }
      return item;
    });

    out[meta.slug] = { title: meta.title, title_en: meta.title_en, icon: meta.icon, items };
  }

  return (
    "/* هذا الملف يُنشأ تلقائياً من محتوى src/<section>/*.md عبر Eleventy — لا تعدّله يدوياً هنا،" +
    " عدّل أو أضف الملفات في src/restaurants أو src/stores ...إلخ، أو عبر لوحة التحكم /admin */\n" +
    `const SITE_DATA = ${JSON.stringify(out, null, 2)};\n` +
    "/* قاموس ترجمة التصنيفات — مصدره src/_data/tags_en.js، وهو نفسه المستخدم\n" +
    "   بالقوالب وقت البناء، فما تصير نسختان تنحرفان عن بعض */\n" +
    `const TAGS_EN = ${JSON.stringify(data.tags_en, null, 2)};\n`
  );
};
