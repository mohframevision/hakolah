// الحساب المشترك وراء data.js (يستهلكه main.js بالمتصفح) وapp-data.json
// (يستهلكه تطبيق الأندرويد) — نفس المنطق بالضبط، مخرَج مرة كـJS ومرة كـJSON
// نقي، بدل ما يتكرر ويصير له نسختان تنحرفان عن بعض بمرور الوقت.
const NEW_BADGE_DAYS = 7;

// يُحسب مرة وحدة وقت تحميل هذا الموديول، لا داخل buildSiteData() — الموديول
// نفسه يُخزَّن بذاكرة Node (require cache)، فكل من data.js.11ty.js وapp-
// data.json.11ty.js يشتركان بنفس القيمة تماماً. لو كل استدعاء يحسب Date.now()
// بنفسه، فالملفان (اللي المفروض يكونان "نفس المصدر" بالضبط) ممكن يختلفان
// بعلامة isNew لعنصر وصل حده الزمني (7 أيام) بالضبط بين الاستدعاءين
const BUILD_TIME = Date.now();

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

/*
  يدعم أكثر من فرع للعنصر الواحد: كل سطر بحقل coords = فرع مستقل، مع اسم
  اختياري قبل علامة | لعرضه للزائر. مثال:

      الشاخورة | 26.2098071, 50.504281
      كرباباد  | https://www.google.com/maps/.../@26.228514,50.52247,17z/...

  الفائدة: سلسلة مثل "برجر السادة" (11 فرعاً) تبقى ببطاقة واحدة نظيفة، لكن
  ميزة "قريب مني" تحسب المسافة لأقرب فرع فعلاً بدل فرع واحد ثابت.
  سطر واحد يظل يشتغل كما كان (توافق خلفي كامل).
*/
function parseBranches(raw) {
  if (typeof raw !== "string") return [];
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const sep = line.indexOf("|");
      const label = sep === -1 ? "" : line.slice(0, sep).trim();
      const coordsPart = sep === -1 ? line : line.slice(sep + 1).trim();
      const c = parseCoords(coordsPart);
      return c ? { label, lat: c.lat, lng: c.lng } : null;
    })
    .filter(Boolean);
}

function buildSiteData(data) {
  const sections = data.sections;
  const out = {};
  const now = BUILD_TIME;

  for (const meta of sections) {
    const items = (data.collections[meta.slug] || []).map((entry) => {
      const addedAt = entry.data.dateAdded ? new Date(entry.data.dateAdded).getTime() : NaN;
      const branches = parseBranches(entry.data.coords);
      const coords = branches[0] || null;
      const item = {
        id: entry.fileSlug,
        icon: entry.data.icon || "⭐",
        title: entry.data.title,
        desc: entry.data.desc || "",
        title_en: entry.data.title_en || "",
        desc_en: entry.data.desc_en || "",
        image: entry.data.image || null,
        hours: entry.data.hours || "",
        hours_en: entry.data.hours_en || "",
        menuItems: (entry.data.menuItems || [])
          .filter((mi) => mi && mi.name)
          .map((mi) => ({ name: mi.name, name_en: mi.name_en || "", price: mi.price || "" })),
        featured: Boolean(entry.data.featured),
        sponsored: Boolean(entry.data.sponsored),
        verified: Boolean(entry.data.verified),
        liked: Boolean(entry.data.liked),
        hideFromNewest: Boolean(entry.data.hideFromNewest),
        isNew: !Number.isNaN(addedAt) && now - addedAt < NEW_BADGE_DAYS * 86400000,
        addedAt: Number.isNaN(addedAt) ? null : addedAt,
        lat: coords ? coords.lat : typeof entry.data.lat === "number" ? entry.data.lat : null,
        lng: coords ? coords.lng : typeof entry.data.lng === "number" ? entry.data.lng : null,
        tags: [...(entry.data.categories || []), ...(entry.data.categoriesCustom || [])],
      };
      if (branches.length > 1) item.branches = branches;

      const meat = entry.data.meatSource;
      if (meat && meat.text) {
        item.meatSource = {
          text: meat.text,
          text_en: meat.text_en || "",
          via: meat.via || "",
          checked: meat.checked ? new Date(meat.checked).toISOString().slice(0, 10) : "",
        };
      }
      if (meta.hasDetailPages || entry.data.hasDetailPage) {
        item.detailUrl = `${meta.slug}/${entry.fileSlug}.html`;
        item.detailUrlEn = `${meta.slug}/${entry.data.slug_en || entry.fileSlug}.html`;
      } else {
        item.links = entry.data.links || {};
        item.cta = entry.data.cta || null;
        item.cta_en = entry.data.cta_en || null;
      }
      return item;
    });

    // يفرّق تطبيق الأندرويد بين قسم "بطاقات روابط" وقسم "مقالات كاملة"
    // (أدلة/أماكن) — الأخير يحتاج فتح متصفح حالياً لعدم وجود عارض مقالات
    // أصلي بالتطبيق بعد، فيُخفى من التنقّل مؤقتاً بدل ما يكسر وعد "بلا متصفح"
    out[meta.slug] = {
      title: meta.title,
      title_en: meta.title_en,
      icon: meta.icon,
      hasDetailPages: Boolean(meta.hasDetailPages),
      items,
    };
  }

  return out;
}

module.exports = { buildSiteData };
