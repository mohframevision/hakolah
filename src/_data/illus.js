// رسومات هكوله (ألوان مائية، مولّدة بـFLUX.2 Klein 4B — Apache 2.0) لبطاقات العناصر بلا صورة حقيقية.
// تُختار من تصنيفات العنصر بالترتيب (الأدق أولاً: «شاورما» قبل «وجبات سريعة»)، وإلا رسمة القسم الافتراضية.
// الرسمة توضّح نوع المكان فقط، وما تُعرض على أنها صورة أكل المكان نفسه (لهذا هي رسم مو صورة واقعية).
// مصدر القائمة: هكوله/صور-الموقع/illus.py (يولّد الصور وهذا الملف معاً).
const ORDER = [["شاورما", "shawarma"], ["برجر", "burger"], ["بيتزا", "pizza"], ["سندويشات", "sandwich"], ["كافيتيريا", "sandwich"], ["مأكولات بحرية", "seafood"], ["مشاوي", "grill"], ["معجنات", "pastries"], ["عيوش", "machboos"], ["بحريني", "machboos"], ["كبسة", "kabsa"], ["مندي", "mandi"], ["آسيوي", "asian"], ["إيراني", "iranian"], ["إيطالي", "italian"], ["تركي", "turkish"], ["عراقي", "iraqi"], ["لبناني", "lebanese"], ["هندي", "indian"], ["عربات طعام", "foodtruck"], ["وجبات سريعة", "fastfood"], ["مصري", "egyptian"], ["حلويات", "kunafa"], ["آيسكريم", "icecream"], ["كرك", "karak"], ["قهوة مختصة", "specialty"], ["عصائر", "juice"], ["إلكترونيات", "electronics"], ["المستلزمات المنزلية", "household"], ["إكسسوارات", "accessories"], ["أطفال", "kids"], ["ألعاب", "kids"], ["بصريات", "optics"], ["عدسات", "optics"], ["ديكور منزلي", "decor"], ["شحن ولوجستيات", "shipping"], ["عناية وجمال", "beauty"], ["كاميرات", "camera"], ["معدات التصوير واكسسوارته", "camera"], ["مجوهرات", "jewelry"], ["مستلزمات الهواتف", "phone"], ["مشتل", "plants"], ["مكتبة", "books"], ["مكملات غذائية", "supplements"], ["ملابس", "clothes"], ["مواد غذائية بالجملة", "wholesale"], ["غسيل", "carwash"], ["تلميع", "polish"], ["تنجيد", "upholstery"], ["إكسسوارات داخلية", "upholstery"], ["زجاج سيارات", "carglass"], ["إكسسوارات السيارات", "caracc"], ["معرض سيارات", "showroom"]];
const DEFAULTS = {"restaurants": "restaurant", "cafes": "cafe", "bakeries": "bakery", "stores": "store", "car-shops": "car"};
const RANK = new Map(ORDER.map(([tag], i) => [tag, i]));

// اسم ملف الرسمة لعنصر (بدون امتداد)، أو "" لو القسم ما له رسومات (مقالات، أدوات، معالم...)
function illusFor(section, categories) {
  if (!DEFAULTS[section]) return "";
  let best = -1;
  for (const c of categories || []) {
    const r = RANK.get(c);
    if (r !== undefined && (best === -1 || r < best)) best = r;
  }
  return best === -1 ? DEFAULTS[section] : ORDER[best][1];
}

module.exports = { ORDER, DEFAULTS, illusFor };
