// فحص دائم لصحة الزعم "ملفاتك لا تغادر جهازك / بلا سيرفر ولا حساب" — أضيف
// هذا الزعم لوصف قسم "أدوات" (sections/ai-experiments.md) بكومِت e46039e
// (2026-10-18، تجربة "تجارب"→"أدوات"). راجعة زاوية قانوني بذلك التشغيل تحقّقت
// يدوياً (grep) من الثلاث أدوات الحالية — بدل تكرار نفس الـgrep اليدوي بكل
// تشغيل قانوني/أمان قادم، هذا السكربت يثبّت الفحص.
//
// الاستخدام: node scripts/check-client-side-claims.js
//
// يفحص كل ملف بـCLIENT_SIDE_TOOLS عن أي نمط يعني إرسال بيانات/طلب صلاحية
// لخادم خارجي أو جهاز (fetch/XHR/FormData/sendBeacon/WebSocket/geolocation/
// getUserMedia) — لو ظهر أي منها، الزعم قد يكون غير دقيق ويحتاج مراجعة
// (ليس بالضرورة خطأ: قد يكون استخدام إيجابي يحتاج توثيقاً إضافياً بالسياسة،
// لكنه لا يجب أن يمرّ بصمت).
//
// **مهم:** لو أضفت أداة جديدة لقسم "أدوات" (src/sections/ai-experiments.md)
// تحمل نفس الزعم، أضف ملفها هنا — السكربت لا يكتشف الأدوات تلقائياً.
const fs = require("fs");
const path = require("path");

const CLIENT_SIDE_TOOLS = [
  { name: "محوّل الملفات (صور/صوت/فيديو)", file: "src/js/converter.js" },
  { name: "حاسبة المصروفات", file: "src/js/expense.js" },
  { name: "اختبار سرعة الكتابة بالعربي", file: "src/js/typing.js" },
];

const FORBIDDEN = [
  { label: "fetch(", re: /\bfetch\s*\(/g },
  { label: "XMLHttpRequest", re: /\bXMLHttpRequest\b/g },
  { label: "FormData", re: /\bnew\s+FormData\b/g },
  { label: "sendBeacon", re: /\bsendBeacon\s*\(/g },
  { label: "WebSocket", re: /\bnew\s+WebSocket\b/g },
  { label: "navigator.geolocation", re: /navigator\.geolocation/g },
  { label: "getUserMedia", re: /getUserMedia\s*\(/g },
];

function lineOf(content, index) {
  return content.slice(0, index).split("\n").length;
}

let anyIssue = false;

for (const tool of CLIENT_SIDE_TOOLS) {
  const full = path.join(process.cwd(), tool.file);
  if (!fs.existsSync(full)) {
    console.log(`⚠️  ${tool.name}: الملف غير موجود (${tool.file}) — تحقّق من المسار`);
    anyIssue = true;
    continue;
  }
  const content = fs.readFileSync(full, "utf8");
  const hits = [];
  for (const pattern of FORBIDDEN) {
    let m;
    while ((m = pattern.re.exec(content))) {
      hits.push(`${pattern.label} (سطر ${lineOf(content, m.index)})`);
    }
  }
  if (hits.length) {
    anyIssue = true;
    console.log(`❌ ${tool.name} (${tool.file}): وجدت ${hits.length} نمطاً يستحق المراجعة:`);
    for (const h of hits) console.log(`   - ${h}`);
  } else {
    console.log(`✅ ${tool.name} (${tool.file}): لا شبكة ولا صلاحيات — الزعم صحيح`);
  }
}

console.log("");
if (anyIssue) {
  console.log("راجع الأنماط أعلاه — قد يحتاج تحديث نص الزعم أو سياسة الخصوصية.");
  process.exit(1);
} else {
  console.log(
    `المجموع: ${CLIENT_SIDE_TOOLS.length} أدوات — كلها متوافقة مع زعم "ملفاتك لا تغادر جهازك".`
  );
}
