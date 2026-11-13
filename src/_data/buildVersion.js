// رقم النسخة لكسر الكاش (sw.js و?v= وversion.json). بصمة لمحتوى الملفات، لا وقت البناء:
// النشر اليومي لأسعار الصرف (fx.json) لا يغيّر شيئاً آخر، فلا يمسح كاش الزوار ولا يعيد تحميل صفحاتهم.
// أي تغيير حقيقي في src أو إعداد البناء يغيّر البصمة تلقائياً.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const SKIP = path.join("src", "_data", "fx.json");

module.exports = () => {
  const h = crypto.createHash("sha1");
  const add = (rel) => {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) return;
    if (fs.statSync(abs).isDirectory()) {
      for (const name of fs.readdirSync(abs).sort()) add(path.join(rel, name));
    } else if (rel !== SKIP) {
      h.update(rel.split(path.sep).join("/"));
      h.update(fs.readFileSync(abs));
    }
  };
  ["src", ".eleventy.js", "eleventy-section-data.js", "scripts/minify.js", "package-lock.json"].forEach(add);
  return h.digest("hex").slice(0, 12);
};
