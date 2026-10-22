// منيو العرض الحي بصفحة «اعرض محلك»: نفس بيانات menus/demo-cafe.md بشكل { data } مثل عناصر collections.menus
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
module.exports = { data: matter(fs.readFileSync(path.join(__dirname, "..", "menus", "demo-cafe.md"), "utf8")).data };
