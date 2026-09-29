// أداة لمرة واحدة: بوستر الدومين الجديد بنفس ستايل بوستر "موقعي انقلب بالكامل"
// (أسود، توهج أخضر خفيف، عنوان ضخم، لقطات داكنة، نقاط خضراء، رابط بإطار).
// منشور 1080x1350 (متصفح) وستوري 1080x1920 (جوالان). القديم عليه خط، الجديد بإطار.
// يصوّر hakolah.com الحي بالوضع الداكن بـPlaywright ثم يرسم HTML → PNG.
//   node scripts/generate-poster-domain-dark.js
const path = require("path");
const { chromium } = require("playwright");

const outDir =
  "C:\\Users\\Computia.ME\\AppData\\Local\\Temp\\claude\\D-----------\\79ddc704-5480-4e31-b983-b66d3efa52e6\\scratchpad";
const SITE = "https://hakolah.com/";
const G = "#34d399";

const css = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;700&family=Inter:wght@500;600&display=block');
*{box-sizing:border-box;margin:0}
body{background:#050606;color:#fff;font-family:"IBM Plex Sans Arabic",sans-serif;direction:rtl;position:relative;overflow:hidden}
.glow{position:absolute;left:50%;width:1300px;height:1300px;transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(16,185,129,.13),transparent 60%)}
.bg{position:absolute;inset:0;overflow:hidden}
.wrap{position:relative;width:100%;display:flex;flex-direction:column;align-items:center;text-align:center}
.tag{font-family:Inter,sans-serif;letter-spacing:.32em;font-size:22px;font-weight:600;color:#8a9199;direction:ltr}
h1{font-weight:700;line-height:1.2;white-space:nowrap}
.sub{color:#c9cfd4}
ul{list-style:none;padding:0}
li{color:#e8ebee;text-align:right;padding-right:46px;position:relative}
li:before{content:"";position:absolute;right:4px;top:.55em;width:15px;height:15px;border-radius:50%;background:${G};box-shadow:0 0 12px ${G}99}
li b{color:#fff}
.dom{font-family:Inter,sans-serif;direction:ltr;unicode-bidi:isolate;white-space:nowrap}
.old{position:relative;color:#6b7178;font-weight:500}
.old:after{content:"";position:absolute;left:-10px;right:-10px;top:54%;height:4px;background:#ef4444;border-radius:2px;transform:rotate(-2deg)}
.pill{border:2.5px solid ${G}aa;border-radius:999px;color:#fff;font-weight:600;background:#0a1210}
.lbl{color:#b9c0c6}
.browser{border:3px solid #2c2f33;border-radius:22px;background:#0c0d0e;overflow:hidden;box-shadow:0 0 60px ${G}14}
.bar{height:40px;display:flex;align-items:center;gap:9px;padding:0 20px;direction:ltr;background:#161819}
.bar i{width:12px;height:12px;border-radius:50%;background:#3a3d42}
.browser img,.phone img{display:block;width:100%}
.phone{position:absolute;border:5px solid #2c2f33;border-radius:54px;background:#000;overflow:hidden;box-shadow:0 0 60px ${G}14}
`;

const bullets = `
<li><b>هكوله</b> صار له عنوانه الخاص — أقصر وأسهل</li>
<li>روابطك القديمة تنقلك للجديد تلقائياً</li>
<li>كل شي بمكانه: الأماكن والأدوات والمقالات</li>
<li>وحتى «صوتيات هكوله» تعزف فيها من الجوال</li>`;

const post = (d) => `<style>${css}</style><body style="width:1080px;height:1350px"><div class="bg"><div class="glow" style="top:48%"></div></div>
<div class="wrap" style="padding-top:62px">
<div class="tag">HAKOLAH</div>
<h1 style="font-size:104px;margin-top:6px">هكوله غيّر عنوانه</h1>
<div class="sub" style="font-size:36px;margin-top:4px">دومين خاص… تتذكره من أول مرة</div>
<div class="browser" style="width:900px;margin-top:34px"><div class="bar"><i></i><i></i><i></i></div><img src="${d}"></div>
<ul style="width:880px;margin-top:30px;font-size:31px;line-height:1.75">${bullets}</ul>
<div class="dom old" style="font-size:28px;margin-top:22px">mohframevision.github.io/hakolah</div>
<div style="display:flex;align-items:center;gap:28px;margin-top:18px">
<div class="dom pill" style="font-size:40px;padding:12px 44px">hakolah.com</div>
<div class="lbl" style="font-size:30px">الرابط الجديد</div></div>
</div></body>`;

const story = (m1, m2) => `<style>${css}</style><body style="width:1080px;height:1920px"><div class="bg"><div class="glow" style="top:44%"></div></div>
<div class="wrap" style="padding-top:150px">
<div class="tag">HAKOLAH</div>
<h1 style="font-size:116px;margin-top:10px">هكوله غيّر عنوانه</h1>
<div class="sub" style="font-size:40px;margin-top:6px">دومين خاص… تتذكره من أول مرة</div>
<div style="position:relative;width:1080px;height:780px;margin-top:40px">
<div class="phone" style="width:330px;left:130px;top:70px;transform:rotate(-8deg)"><img src="${m1}"></div>
<div class="phone" style="width:330px;left:590px;top:10px;transform:rotate(5deg)"><img src="${m2}"></div>
</div>
<ul style="width:900px;margin-top:30px;font-size:33px;line-height:1.8">${bullets}</ul>
<div class="dom old" style="font-size:30px;margin-top:34px">mohframevision.github.io/hakolah</div>
<div class="lbl" style="font-size:32px;margin-top:22px">العنوان الجديد</div>
<div class="dom pill" style="font-size:46px;padding:14px 56px;margin-top:14px">hakolah.com</div>
</div></body>`;

async function main() {
  const b = await chromium.launch();
  const shot = async (url, w, h, dpr) => {
    const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, bypassCSP: true, colorScheme: "dark" });
    await c.addInitScript(() => localStorage.setItem("site_theme_pref", "dark"));
    const p = await c.newPage();
    await p.goto(url, { waitUntil: "networkidle" });
    await p.addStyleTag({ content: "[class*=cookie],[class*=consent],[class*=daily],[class*=toast]{display:none!important}" });
    await p.waitForTimeout(1500);
    const buf = await p.screenshot();
    await c.close();
    return "data:image/png;base64," + buf.toString("base64");
  };
  const desk = await shot(SITE, 1440, 820, 1);
  const mob1 = await shot(SITE, 390, 844, 2);
  const mob2 = await shot(SITE + "sounds.html", 390, 844, 2);
  const render = async (html, W, H, name) => {
    const c = await b.newContext({ viewport: { width: W, height: H } });
    const p = await c.newPage();
    await p.setContent(html, { waitUntil: "networkidle" });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(outDir, name) });
    await c.close();
    console.log("wrote", name);
  };
  await render(post(desk), 1080, 1350, "poster-domain-dark-post.png");
  await render(story(mob1, mob2), 1080, 1920, "poster-domain-dark-story.png");
  await b.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
