/*
  فحص واجهة بمتصفح حقيقي — يشغّل خادماً ثابتاً على _site ويفتحه بكروم مخفي.

  ليش بمتصفح وليس بقراءة الملفات: البطاقات تُبنى بجافاسكربت بعد التحميل، وأهم
  ما يُفحص هنا (اللصق، أهداف اللمس) ما له وجود إلا بعد حساب التخطيط فعلاً. مثال
  حقيقي: getComputedStyle كان يقول "position: sticky" وصندوق البحث ما يلتصق
  إطلاقاً، لأن اللصق محدود بصندوق العنصر الأب وكان ارتفاعه ٤٩ بكسل. فالفحص
  يمرّر الصفحة ويقيس الموضع الحقيقي بدل ما يصدّق قيمة CSS المحسوبة.

  التشغيل:  npm run build && npm run check:ux
*/
const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

const SITE = path.join(__dirname, "..", "_site");
const PORT = 8123;
const PREFIX = "/hakolah"; // pathPrefix المستخدم بالبناء (GitHub Pages)

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, pass, detail) => results.push({ name, pass, detail });

function startServer() {
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split("?")[0]);
    if (rel.startsWith(PREFIX)) rel = rel.slice(PREFIX.length);
    let file = path.join(SITE, rel);
    if (fs.existsSync(file) && fs.statSync(file).isDirectory())
      file = path.join(file, "index.html");
    if (!fs.existsSync(file)) return res.writeHead(404).end("404");
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(PORT, () => r(server)));
}

async function main() {
  if (!fs.existsSync(SITE)) {
    console.error("_site غير موجود — شغّل npm run build أولاً");
    process.exit(1);
  }
  const chromePath = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
  if (!chromePath) {
    console.error("ما لقيت كروم. حدّد مساره بمتغيّر البيئة CHROME_PATH");
    process.exit(1);
  }

  const server = await startServer();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "hakolah-ux-"));
  const chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--remote-debugging-port=9445",
    "--user-data-dir=" + profile,
    "about:blank",
  ]);

  const cleanup = (code) => {
    chrome.kill();
    server.close();
    // كروم ما يطلق ملفات الملف الشخصي فوراً بويندوز، فالحذف يفشل بـ EPERM.
    // مجلد مؤقت بحجم صغير — نتركه للنظام بدل ما نفشل الفحص كله بسببه
    try {
      fs.rmSync(profile, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    process.exit(code);
  };

  try {
    await sleep(2500);
    const targets = await (await fetch("http://127.0.0.1:9445/json/list")).json();
    const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
    await new Promise((r) => (ws.onopen = r));
    let id = 0;
    const pending = new Map();
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.id && pending.has(m.id)) pending.get(m.id)(m);
    };
    const send = (method, params) =>
      new Promise((r) => {
        const i = ++id;
        pending.set(i, r);
        ws.send(JSON.stringify({ id: i, method, params }));
      });
    const ev = async (expr) => {
      const r = await send("Runtime.evaluate", {
        expression: expr,
        awaitPromise: true,
        returnByValue: true,
      });
      if (r.result?.exceptionDetails)
        return "EXC: " + r.result.exceptionDetails.exception.description;
      return r.result.result.value;
    };

    await send("Page.enable");
    await send("Runtime.enable");
    // تفعيل اللمس هو اللي يقلب pointer إلى coarse فعلاً — mobile:true وحده ما يكفي
    await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await send("Page.navigate", { url: `http://localhost:${PORT}${PREFIX}/restaurants.html` });
    for (let i = 0; i < 40; i++) {
      if (await ev(`document.querySelectorAll(".like-btn").length`)) break;
      await sleep(500);
    }

    check(
      "لا أثر لكاشف مانع الإعلانات",
      (await ev(
        `!document.querySelector("#adblockNotice,.adblock-bait,.adblock-notice") && typeof initAdblockNotice === "undefined"`
      )) === true,
      ""
    );

    // اللصق: نمرّر ونقيس الموضع الفعلي — القيمة المحسوبة وحدها تكذب
    const sticky =
      await ev(`(async()=>{const hh=document.querySelector(".site-header").offsetHeight;
      window.scrollTo(0,1500); await new Promise(r=>setTimeout(r,350));
      const top=Math.round(document.querySelector(".search-box").getBoundingClientRect().top);
      window.scrollTo(0,0); await new Promise(r=>setTimeout(r,200));
      return JSON.stringify({top, headerH:hh, cssVar:getComputedStyle(document.documentElement).getPropertyValue("--header-h").trim()})})()`);
    const st = JSON.parse(sticky);
    check(
      "صندوق البحث يلتصق تحت الهيدر عند التمرير",
      st.top >= st.headerH && st.top <= st.headerH + 24 && st.cssVar === st.headerH + "px",
      sticky
    );

    const search = await ev(`(async()=>{const box=document.querySelector(".search-box");
      const before=document.querySelectorAll(".item-card").length;
      box.value="برجر"; box.dispatchEvent(new Event("input",{bubbles:true}));
      await new Promise(r=>setTimeout(r,400));
      const after=document.querySelectorAll(".item-card").length;
      box.value=""; box.dispatchEvent(new Event("input",{bubbles:true}));
      await new Promise(r=>setTimeout(r,400));
      return JSON.stringify({before, after, chips:document.querySelectorAll(".filters .filter-chip").length})})()`);
    const se = JSON.parse(search);
    check(
      "البحث يفلتر ورقائق التصنيف موجودة",
      se.after > 0 && se.after < se.before && se.chips > 1,
      search
    );

    const ver = await ev(`(()=>{const c=document.querySelector(".item-card.verified");
      if(!c)return JSON.stringify({none:true});const cs=getComputedStyle(c);
      return JSON.stringify({w:cs.borderInlineStartWidth, col:cs.borderInlineStartColor})})()`);
    check(
      "تمييز «زُرته شخصياً» مطبَّق على البطاقة",
      ver.includes('"w":"3px"') && ver.includes("212, 160, 23"),
      ver
    );

    const fav = await ev(`(()=>{localStorage.removeItem("site_favorites_v1");
      document.querySelector(".fav-btn").click();
      return localStorage.getItem("site_favorites_v1")||"null"})()`);
    check("زر الحفظ يكتب بالتخزين المحلي", /:\s*true/.test(fav), fav);

    check(
      "المتصفح يتصرّف كجهاز لمس (شرط الفحص التالي)",
      (await ev(`matchMedia("(pointer: coarse)").matches`)) === true,
      ""
    );

    const touch =
      await ev(`(()=>{const sel=[".fav-btn",".share-btn",".like-btn",".filter-chip",".item-actions .btn"];
      const bad=[];sel.forEach(s=>{const e=document.querySelector(s);if(!e)return;
      const r=e.getBoundingClientRect();
      // نقرّب قبل المقارنة: التخطيط يرجّع كسوراً (٤٣٫٩٩ لعنصر ارتفاعه ٤٤)
      const w=Math.round(r.width), h=Math.round(r.height);
      if(w<44||h<44)bad.push(s+" "+w+"x"+h)});
      return bad.length?bad.join(" | "):"ok"})()`);
    check("أهداف اللمس ٤٤×٤٤ بكسل على الأقل", touch === "ok", touch);

    const ovf = await ev(
      `JSON.stringify({sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth})`
    );
    const o = JSON.parse(ovf);
    check("بلا تمرير أفقي بعرض ٣٩٠ بكسل", o.sw <= o.cw + 1, ovf);

    // ما فيه عنصر ممول بالمحتوى الحالي، فنعلّم واحداً ونعيد البناء للتحقق من المسار
    const spon = await ev(`(()=>{const items=SITE_DATA.restaurants.items;
      items.at(-1).sponsored=true; renderSection("restaurants");
      const first=document.querySelector(".item-card");
      return JSON.stringify({pinned:first.classList.contains("sponsored"),
        badge:(first.querySelector(".sponsored-badge")||{}).textContent||"",
        doubleBadge:!!first.querySelector(".featured-badge")})})()`);
    const sp = JSON.parse(spon);
    check(
      "العنصر الممول يتصدّر القائمة بشارة «ممول» وحدها",
      sp.pinned && sp.badge.trim() === "ممول" && !sp.doubleBadge,
      spon
    );

    console.log("");
    results.forEach((r) =>
      console.log(`${r.pass ? "OK  " : "فشل "} ${r.name}${r.detail ? "\n       " + r.detail : ""}`)
    );
    const failed = results.filter((r) => !r.pass).length;
    console.log(failed === 0 ? "\nنجحت كل فحوص الواجهة" : `\n${failed} فحص فشل`);
    ws.close();
    cleanup(failed ? 1 : 0);
  } catch (err) {
    console.error(err);
    cleanup(1);
  }
}

main();
