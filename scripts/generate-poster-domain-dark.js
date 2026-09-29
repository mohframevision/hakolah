// أداة لمرة واحدة: بوستر الدومين الجديد بالستايل الداكن (نفس روح بوستر موقعي الشخصي):
// منشور 1080x1350 (متصفح) وستوري 1080x1920 (جوالان)، الدومين القديم عليه خط والجديد بارز.
// يصوّر hakolah.com الحي بـPlaywright ثم يرسم HTML → PNG. الدومينات بصناديق LTR منفصلة.
//   node scripts/generate-poster-domain-dark.js
const path = require("path");
const { chromium } = require("playwright");

const outDir =
  "C:\\Users\\Computia.ME\\AppData\\Local\\Temp\\claude\\D-----------\\79ddc704-5480-4e31-b983-b66d3efa52e6\\scratchpad";
const SITE = "https://hakolah.com/";

const css = `
*{box-sizing:border-box;margin:0}
body{background:#050608;color:#fff;font-family:"Segoe UI",Tahoma,Arial,sans-serif;direction:rtl;position:relative;overflow:hidden}
.glow{position:absolute;left:50%;top:52%;width:1100px;height:1100px;transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(37,99,235,.20),transparent 62%)}
.wrap{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;height:100%}
.tag{letter-spacing:.42em;font-size:22px;font-weight:600;color:#8b93a1;direction:ltr}
h1{font-size:72px;font-weight:800;line-height:1.15;white-space:nowrap}
h1 em{font-style:normal;color:#f59e0b}
.sub{font-size:36px;color:#c4cad4}
ul{list-style:none;padding:0;width:820px}
li{font-size:32px;color:#e5e8ee;text-align:right;padding-right:44px;position:relative;margin:9px 0}
li:before{content:"";position:absolute;right:0;top:.5em;width:16px;height:16px;border-radius:50%;background:#60a5fa;box-shadow:0 0 14px #2563ebaa}
li b{color:#fff}
.dom{direction:ltr;unicode-bidi:isolate;font-weight:700;white-space:nowrap}
.old{font-size:34px;color:#7a828f;position:relative;padding:12px 30px;border-radius:999px;border:2px solid #2b303a}
.old:after{content:"";position:absolute;left:14px;right:14px;top:56%;height:5px;margin-top:-2px;background:#ef4444;border-radius:3px;transform:rotate(-2deg)}
.new{font-size:60px;padding:8px 52px;border-radius:999px;border:3px solid #f59e0b;color:#fff;box-shadow:0 0 40px #f59e0b33}
.new span{color:#f59e0b}
.lbl{font-size:26px;color:#8b93a1}
.arrow{font-size:44px;color:#60a5fa;line-height:1}
.browser{border:2px solid #2b303a;border-radius:26px;background:#0b0d12;overflow:hidden;box-shadow:0 30px 80px #000a}
.bar{height:44px;display:flex;align-items:center;gap:10px;padding:0 18px;direction:ltr;background:#12151c}
.bar i{width:13px;height:13px;border-radius:50%;background:#3a404c}
.bar .u{margin:0 auto;font-size:18px;color:#c4cad4;background:#1b1f28;border-radius:999px;padding:5px 26px}
.browser img{display:block;width:100%}
.phone{position:absolute;border:6px solid #262b35;border-radius:56px;background:#000;overflow:hidden;box-shadow:0 30px 80px #000c}
.phone img{display:block;width:100%}
`;

const head = (h1) => `<div class="tag">HAKOLAH</div><h1 style="margin-top:22px">${h1}</h1>`;
const bullets = `<ul>
<li><b>نفس الموقع</b> بعنوان أقصر وأسهل تتذكره</li>
<li>روابطك القديمة تحوّلك تلقائياً للجديد</li>
<li>مطاعم ومقاهي وأماكن وأدوات وصوتيات… كلها بمكانها</li>
</ul>`;
const domains = (gap) => `
<div class="lbl">العنوان القديم</div>
<div class="dom old" style="margin-top:10px">mohframevision.github.io/hakolah</div>
<div class="arrow" style="margin:${gap}px 0">↓</div>
<div class="lbl">العنوان الجديد</div>
<div class="dom new" style="margin-top:12px">hakolah<span>.com</span></div>`;

const post = (d) => `<style>${css}</style><body style="width:1080px;height:1350px"><div class="glow"></div>
<div class="wrap" style="padding-top:52px">
${head('هكوله صار له <em>دومينه</em> الخاص')}
<div class="sub" style="margin-top:12px">عنوان جديد… أقصر وأسهل</div>
<div class="browser" style="width:740px;margin-top:24px"><div class="bar"><i></i><i></i><i></i><div class="u">hakolah.com</div></div><img src="${d}"></div>
<div style="margin-top:26px">${bullets}</div>
<div style="margin-top:14px;display:flex;flex-direction:column;align-items:center">${domains(4)}</div>
</div></body>`;

const story = (m1, m2) => `<style>${css}</style><body style="width:1080px;height:1920px"><div class="glow"></div>
<div class="wrap" style="padding-top:210px">
${head('هكوله صار له <em>دومينه</em> الخاص')}
<div class="sub" style="margin-top:14px">عنوان جديد… أقصر وأسهل</div>
<div style="position:relative;width:1080px;height:760px;margin-top:20px">
<div class="phone" style="width:330px;left:130px;top:40px;transform:rotate(-8deg)"><img src="${m1}"></div>
<div class="phone" style="width:330px;left:560px;top:0;transform:rotate(6deg)"><img src="${m2}"></div>
</div>
<div style="margin-top:8px">${bullets}</div>
<div style="margin-top:22px;display:flex;flex-direction:column;align-items:center">${domains(8)}</div>
</div></body>`;

async function main() {
  const b = await chromium.launch();
  const shot = async (w, h, dpr, clip) => {
    const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, bypassCSP: true });
    const p = await c.newPage();
    await p.goto(SITE, { waitUntil: "networkidle" });
    await p.waitForTimeout(1500);
    // إخفاء أي فقاعات/بانرات تغطي الصورة
    await p.addStyleTag({ content: "[class*=cookie],[class*=consent],[class*=daily],[class*=toast]{display:none!important}" });
    const buf = await p.screenshot();
    await c.close();
    return "data:image/png;base64," + buf.toString("base64");
  };
  const desk = await shot(1440, 860, 1);
  const mob = await shot(390, 844, 2);
  const render = async (html, W, H, name) => {
    const c = await b.newContext({ viewport: { width: W, height: H } });
    const p = await c.newPage();
    await p.setContent(html);
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(outDir, name) });
    await c.close();
    console.log("wrote", name);
  };
  await render(post(desk), 1080, 1350, "poster-domain-dark-post.png");
  // ثاني الجوالين: نفس اللقطة (الصفحة الرئيسية) لكن مع تمرير خفيف ليختلف المنظر
  await render(story(mob, mob), 1080, 1920, "poster-domain-dark-story.png");
  await b.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
