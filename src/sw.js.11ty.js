// عامل الخدمة — يُولَّد وقت البناء عشان يُحقن فيه رقم النسخة (buildVersion).
// كان ملفاً ثابتاً يُنسخ كما هو، لكن التخزين يحتاج اسم كاش مربوطاً بالنسخة
// وإلا بقيت ملفات النسخة القديمة عند المستخدم بعد كل نشر.
exports.data = {
  permalink: "sw.js",
  eleventyExcludeFromCollections: true,
};

exports.render = function (data) {
  return `/* مولَّد وقت البناء — لا تعدّله هنا، عدّل src/sw.js.11ty.js */
const VERSION = ${JSON.stringify(String(data.buildVersion))};
const CACHE = \`hakolah-\${VERSION}\`;
const BASE = "/hakolah/";
const OFFLINE_AR = BASE + "offline.html";
const OFFLINE_EN = BASE + "en/offline.html";

/* الحد الأدنى فقط: صفحتا "بلا اتصال" والواجهة الأساسية. ما نخزّن كل صفحات
   الموقع مسبقاً — تسعون صفحة تعني تنزيلاً ثقيلاً على أول زيارة، ومحتوى
   يقدم بسرعة. الباقي يُخزَّن أثناء التصفح فعلياً */
const PRECACHE = [OFFLINE_AR, OFFLINE_EN, BASE + "css/style.css", BASE + "js/main.js"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // addAll تفشل كلها لو فشل ملف واحد — نخزّن كلاً على حدة عشان ملف
      // واحد ناقص ما يمنع التثبيت بالكامل
      Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => null)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request, offlineUrl) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    // ignoreSearch: الصفحات تُطلب أحياناً بمعاملات بحث (?q=...) ونفس
    // الصفحة المخزّنة تفي بالغرض بلا اتصال
    const cached = await cache.match(request, { ignoreSearch: true });
    return cached || (await cache.match(offlineUrl)) || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });
  const fetching = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || (await fetching) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // خارج نطاقنا (خطوط جوجل، خادم الإعجابات، الإعلانات): بلا تدخّل
  if (url.origin !== self.location.origin) return;
  // ملف فحص التحديث لازم يبقى طازجاً دائماً وإلا ما عرفنا إن فيه نسخة جديدة
  if (url.pathname.endsWith("/version.json")) return;
  // لوحة التحكم تتطلب شبكة وجلسة، ولا معنى لتخزينها
  if (url.pathname.includes("/admin/")) return;

  if (request.mode === "navigate") {
    const offlineUrl = url.pathname.startsWith(BASE + "en/") ? OFFLINE_EN : OFFLINE_AR;
    event.respondWith(networkFirst(request, offlineUrl));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "هكوله";
  const options = {
    body: data.body || "",
    icon: BASE + "assets/android-chrome-192x192.png",
    badge: BASE + "assets/favicon-32x32.png",
    data: { url: data.url || BASE },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url;
  event.waitUntil(self.clients.openWindow(url || BASE));
});
`;
};
