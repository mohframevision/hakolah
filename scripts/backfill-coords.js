/*
  سكربت لمرة وحدة: يمرّ على كل عناصر الأقسام اللي فيها رابط خرائط قوقل (links.maps)
  وما فيها إحداثيات بعد، يفتح الرابط (فقط يتبع التحويل، بدون تحميل صفحة قوقل الفعلية)،
  يستخرج lat/lng من رابط التحويل النهائي، ويكتبهم بالـ frontmatter.
  يُشغَّل يدوياً عند الحاجة (مو جزء من عملية البناء) — الهدف تفعيل ميزة "قريب مني" بدون
  أي طلبات شبكة وقت البناء الفعلي على GitHub Actions.
*/
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const SRC_DIR = path.join(__dirname, "..", "src");
const COORD_RE = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
const MAPS_LINK_RE = /https:\/\/maps\.app\.goo\.gl\/\S+/;

// أقسام "أماكن" (hasDetailPages) ما فيها links.maps بالـ frontmatter —
// رابط الخرائط يكون داخل نص المقال نفسه (body)
function findMapsUrl(parsed) {
  if (parsed.data.links && parsed.data.links.maps) return parsed.data.links.maps;
  const bodyMatch = parsed.content.match(MAPS_LINK_RE);
  return bodyMatch ? bodyMatch[0].replace(/[)\]]+$/, "") : null;
}

async function resolveCoords(shortUrl) {
  const res = await fetch(shortUrl, { redirect: "follow" });
  const finalUrl = res.url;
  const match = finalUrl.match(COORD_RE);
  return match ? { lat: Number(match[1]), lng: Number(match[2]) } : null;
}

// يضيف lat/lng كسطرين جدد قبل نهاية الـ frontmatter مباشرة، بدون إعادة تسلسل
// بقية الحقول (تفادياً لأي تغيير تنسيق غير مرتبط بإحداثيات على 62 ملف دفعة وحدة)
function insertCoords(raw, lat, lng) {
  const closingIndex = raw.indexOf("\n---", 3);
  if (closingIndex === -1) return null;
  return raw.slice(0, closingIndex) + `\nlat: ${lat}\nlng: ${lng}` + raw.slice(closingIndex);
}

async function main() {
  const sectionDirs = fs
    .readdirSync(SRC_DIR)
    .filter((f) => fs.statSync(path.join(SRC_DIR, f)).isDirectory())
    .filter((f) => !["_includes", "_data", "sections", "assets", "js", "css", "admin"].includes(f));

  let resolved = 0;
  let skipped = 0;
  let failed = 0;

  for (const dir of sectionDirs) {
    const dirPath = path.join(SRC_DIR, dir);
    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".md"));

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = matter(raw);
      const mapsUrl = findMapsUrl(parsed);

      if (!mapsUrl) {
        skipped++;
        continue;
      }
      if (typeof parsed.data.lat === "number" && typeof parsed.data.lng === "number") {
        skipped++;
        continue;
      }

      try {
        const coords = await resolveCoords(mapsUrl);
        if (!coords) {
          console.log(`⚠️  ما قدرت أستخرج إحداثيات: ${dir}/${file}`);
          failed++;
          continue;
        }
        const output = insertCoords(raw, coords.lat, coords.lng);
        if (!output) {
          console.log(`⚠️  ما لقيت نهاية frontmatter: ${dir}/${file}`);
          failed++;
          continue;
        }
        fs.writeFileSync(filePath, output);
        console.log(`✅ ${dir}/${file} -> ${coords.lat}, ${coords.lng}`);
        resolved++;
      } catch (err) {
        console.log(`❌ فشل ${dir}/${file}: ${err.message}`);
        failed++;
      }
    }
  }

  console.log(`\nتم: ${resolved} | تخطّي: ${skipped} | فشل: ${failed}`);
}

main();
