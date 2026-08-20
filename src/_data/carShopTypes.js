// أنواع محلات السيارات — يقود بوابة /car-shops.html وصفحة كل نوع المستقلة
// (car-shop-type.njk). label هو نفس التصنيف المكتوب بحقل categories بعنصر
// المحل (src/car-shops/*.md)، ولازم يطابق نصياً قيمة بـ categoryOptions
// بملف src/sections/car-shops.md.
module.exports = [
  {
    slug: "wash",
    label: "غسيل",
    label_en: "Wash",
    icon: "🚿",
    tip: "غسيل خارجي بس، ولا داخلي وتلميع كمان؟ حدد وش تبي قبل ما تسأل عن السعر",
    tip_en: "Just an exterior wash, or interior and polish too? Know what you need before asking for a price.",
  },
  {
    slug: "accessories",
    label: "إكسسوارات السيارات",
    label_en: "Car Accessories",
    icon: "🎨",
    tip: "قبل ما تشتري، تأكد القطعة تناسب موديل سيارتك بالضبط",
    tip_en: "Before you buy, make sure the part fits your exact car model.",
  },
  {
    slug: "garage",
    label: "كراج",
    label_en: "Garage",
    icon: "🔧",
    tip: "وصف العطل بالتفصيل (كهرباء ولا ميكانيك) يسهّل عليك المقارنة بين الكراجات",
    tip_en: "Describing the issue in detail (electrical or mechanical) makes it easier to compare garages.",
  },
  {
    slug: "dealership",
    label: "وكالة",
    label_en: "Dealership",
    icon: "🏢",
    tip: "الوكالة الأنسب غالباً وكالة نفس ماركة سيارتك — صيانة أصلية وضمان",
    tip_en: "Usually the best choice is your car's own brand dealership — original parts and warranty.",
  },
  {
    slug: "parts",
    label: "قطع غيار",
    label_en: "Parts",
    icon: "⚙️",
    tip: "اسأل عن الفرق بين القطعة الأصلية والتجارية قبل ما تقرر",
    tip_en: "Ask about the difference between original and aftermarket parts before deciding.",
  },
  {
    slug: "tires",
    label: "إطارات",
    label_en: "Tires",
    icon: "🛞",
    tip: "جهّز مقاس إطاراتك (مكتوب على جنب الإطار) قبل ما تتواصل",
    tip_en: "Have your tire size ready (printed on the tire's sidewall) before you contact them.",
  },
];
