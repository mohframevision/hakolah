// يحدّث أسعار الصرف لمحوّل العملات (src/_data/fx.json) من البنك المركزي الأوروبي.
// يشغّله deploy.yml قبل البناء، ومعه تشغيل مجدول كل يوم عمل — بلا ذكاء اصطناعي ولا مفتاح ولا حساب.
// لا يُرفع الناتج إلى git: النسخة المرفوعة من fx.json احتياط فقط للبناء المحلي ولفشل الجلب.
// لو فشل الجلب أو جاءت أرقام غريبة: يخرج بخطأ ولا يلمس الملف، فيبقى آخر سعر صحيح.
const fs = require("fs");
const path = require("path");

const URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
const OUT = path.join(__dirname, "..", "src", "_data", "fx.json");

async function main() {
  let res;
  for (let i = 1; ; i++) {
    try {
      res = await fetch(URL, { signal: AbortSignal.timeout(30000) });
      if (res.ok || res.status < 500 || i === 3) break;
    } catch (e) {
      if (i === 3) throw e;
    }
    await new Promise((r) => setTimeout(r, 20000 * i));
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();

  const date = (xml.match(/time=['"](\d{4}-\d{2}-\d{2})['"]/) || [])[1];
  const perEur = { EUR: 1 };
  for (const m of xml.matchAll(/currency=['"]([A-Z]{3})['"]\s+rate=['"]([\d.]+)['"]/g)) {
    perEur[m[1]] = Number(m[2]);
  }

  // فحص سلامة: التاريخ موجود، والدولار والين بأرقام معقولة، وكل الأسعار موجبة.
  if (!date) throw new Error("no date in ECB file");
  if (!(perEur.USD > 0.5 && perEur.USD < 3)) throw new Error(`odd USD rate: ${perEur.USD}`);
  if (!(perEur.JPY > 50 && perEur.JPY < 500)) throw new Error(`odd JPY rate: ${perEur.JPY}`);
  if (Object.values(perEur).some((v) => !(v > 0))) throw new Error("non-positive rate");
  if (Object.keys(perEur).length < 20) throw new Error("too few currencies");

  delete perEur.ILS; // قاعدة الموقع: لا شيء إسرائيلي
  const data = { source: "European Central Bank", date, perEur };
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2) + "\n");
  console.log(`fx.json: ${date}, ${Object.keys(perEur).length} currencies`);
}

main().catch((e) => {
  console.error("update-fx failed:", e.message);
  process.exit(1);
});
