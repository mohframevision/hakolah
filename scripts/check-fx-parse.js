// فحص قارئ الأرقام في محوّل العملات (src/js/fx.js): node scripts/check-fx-parse.js
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "..", "src", "js", "fx.js"), "utf8");
const parse = new Function(`return (${src.match(/function parse\(s\) \{[\s\S]*?\n {2}\}/)[0]})`)();

const cases = {
  "1,813": 1813, "1,813.5": 1813.5, "2,5": 2.5, "٢٫٥": 2.5, "2،5": 2.5, "١٬٨١٣": 1813, "۱۲۳": 123,
  "1 000": 1000, "12,34,567": 1234567, "1,000,000": 1000000, "1,23,456.5": 123456.5, "0.5": 0.5, "": NaN, "abc": NaN,
};
let bad = 0;
for (const [input, want] of Object.entries(cases)) {
  const got = parse(input);
  if (!(Number.isNaN(want) ? Number.isNaN(got) : got === want)) { bad++; console.log(`FAIL ${JSON.stringify(input)}: ${got}, want ${want}`); }
}
console.log(bad ? `${bad} failed` : `OK - ${Object.keys(cases).length} cases`);
process.exit(bad ? 1 : 0);
