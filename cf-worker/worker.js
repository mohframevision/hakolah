// Cloudflare Worker: يخزّن اشتراكات الإشعارات (Push Subscriptions) بـ KV الخاص بنا فقط
// (ما يمر أي طرف ثالث)، ويرسل إشعار يومي بـ"اختيار اليوم" عبر Cron Trigger مجدول.
import webpush from "web-push";

const VAPID_SUBJECT = "mailto:mohframevision@outlook.com";
const SITE_ORIGIN = "https://mohframevision.github.io";
const DATA_URL = `${SITE_ORIGIN}/hakolah/js/data.js`;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": SITE_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

/*
  ترويسة CORS تمنع المتصفح من قراءة الرد بموقع آخر، لكنها ما تمنع طلباً
  مباشراً (curl/سكربت) من الوصول للـ Worker أصلاً. لذا نتحقق من Origin
  بأنفسنا ونرفض أي طلب يعدّل بيانات إذا ما جاء من نطاق الموقع.
  هذا يوقف السكربتات البسيطة والاستدعاء من مواقع أخرى — ما يوقف من يزوّر
  الترويسة يدوياً (مستحيل تقنياً بدون تسجيل دخول)، لكنه يرفع الكلفة كثيراً.
*/
function isAllowedOrigin(request) {
  const origin = request.headers.get("Origin");
  if (origin) return origin === SITE_ORIGIN;
  // بعض المتصفحات ما ترسل Origin مع same-origin GET — نقبل حينها بالـ Referer
  const referer = request.headers.get("Referer");
  return Boolean(referer && referer.startsWith(SITE_ORIGIN));
}

function forbidden() {
  return new Response("Forbidden", { status: 403, headers: corsHeaders() });
}

/*
  حد بسيط لعدد الإعجابات لكل زائر بالدقيقة. مبني على تجزئة (hash) لعنوان
  الـ IP وليس العنوان نفسه — ما نخزّن أي عنوان IP خام إطلاقاً، والمفتاح
  ينتهي تلقائياً خلال دقيقتين (خصوصية الزائر أولاً).

  عند تجاوز الحد نرجع 429 بدون أي كتابة على KV.

  ⚠️ حدّ تقريبي وليس صارماً — بصراحة: توثيق Cloudflare نفسه يقول إن KV
  "غير مناسب" لعدّادات وحدود الطلبات، لأنه eventually consistent: القراءة
  قد ترجع قيمة قديمة لحد 60 ثانية بعد الكتابة. اختبار حي على 20 طلب متتالٍ
  مرّر 18 بدل 15. يعني هذا الحد "مطبّ سرعة" يوقف العبث البسيط، مو جدار.

  الحماية الحقيقية المتاحة مجاناً هي فحص Origin أعلاه. الحل الصارم يحتاج
  Durable Objects (خطة مدفوعة) وهذا يخالف قيد "مجاني دائماً" للمشروع.
  ولو استُنزفت حصة الكتابة بيوم ما: لا تضيع أي بيانات، والحصة ترجع تلقائياً
  بعد منتصف الليل UTC.
*/
const LIKE_RATE_LIMIT = 15;

async function isRateLimited(request, env) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const minute = Math.floor(Date.now() / 60000);
  const bucket = await keyFor(`${ip}:${minute}`);
  const key = `rl:like:${bucket}`;

  const current = Number(await env.SUBSCRIPTIONS.get(key)) || 0;
  if (current >= LIKE_RATE_LIMIT) return true;

  await env.SUBSCRIPTIONS.put(key, String(current + 1), { expirationTtl: 120 });
  return false;
}

function tooManyRequests() {
  return new Response("Too Many Requests", {
    status: 429,
    headers: { ...corsHeaders(), "Retry-After": "60" },
  });
}

function likeKey(section, id) {
  return `likes:${section}:${id}`;
}

// بادئة مرتبطة بأسبوع ISO الحالي (مثال: likes:week:2026-W32:) — تُستخدم لمعرفة
// الأكثر إعجاباً "هذا الأسبوع" تحديداً، منفصل عن عدّاد الإعجاب الكلي (likes:)
function weekPrefix() {
  const now = new Date();
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayNum = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week =
    1 + Math.round(((target - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `likes:week:${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}:`;
}

function weekKey(section, id) {
  return `${weekPrefix()}${section}:${id}`;
}

async function keyFor(endpoint) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    // كل ما يعدّل بيانات لازم يجي من نطاق الموقع نفسه
    const isMutating = request.method === "POST";
    if (isMutating && !isAllowedOrigin(request)) return forbidden();

    if (request.method === "POST" && url.pathname === "/subscribe") {
      const sub = await request.json();
      if (!sub || !sub.endpoint) {
        return new Response("Bad Request", { status: 400, headers: corsHeaders() });
      }
      await env.SUBSCRIPTIONS.put(await keyFor(sub.endpoint), JSON.stringify(sub));
      return new Response("OK", { headers: corsHeaders() });
    }

    if (request.method === "POST" && url.pathname === "/unsubscribe") {
      const { endpoint } = await request.json();
      if (endpoint) await env.SUBSCRIPTIONS.delete(await keyFor(endpoint));
      return new Response("OK", { headers: corsHeaders() });
    }

    /* عدّاد الزيارات (‎/track و/stats) أُزيل عمداً: كان يكتب مرتين على KV لكل
       زيارة صفحة، وحصة الخطة المجانية 1000 كتابة باليوم — أي أن 500 زيارة
       صفحة تستهلك الحصة كاملة وتوقف معها الإعجابات والاشتراكات (نفس الحصة).
       وكان أيضاً غير دقيق أصلاً: الكتابة على نفس المفتاح محدودة بمرة واحدة
       بالثانية، وقراءة-ثم-كتابة متزامنة تضيّع زيارات. Google Analytics
       المركّب بالموقع يعدّ الزيارات بدقة أعلى وبلا حدود وبدون هذي المشاكل. */

    // إعجاب عام من الزوار (منفصل عن "أعجبني" الخاصة بصاحب الموقع) — عدّاد بسيط
    // بدون تسجيل دخول، الحماية من التكرار تصير محلياً بالمتصفح (localStorage)
    if (request.method === "POST" && url.pathname === "/like") {
      // التحقق من صحة الطلب أولاً (مجاني)، وبعدين فحص الحد (يكلّف كتابة) —
      // فالطلبات الناقصة/العبثية ما تستهلك حصة الكتابة إطلاقاً
      const { section, id } = await request.json();
      if (!section || !id) return new Response("Bad Request", { status: 400, headers: corsHeaders() });
      if (await isRateLimited(request, env)) return tooManyRequests();
      const key = likeKey(section, id);
      const wKey = weekKey(section, id);
      const [count, weekCount] = await Promise.all([
        env.SUBSCRIPTIONS.get(key).then((v) => (Number(v) || 0) + 1),
        env.SUBSCRIPTIONS.get(wKey).then((v) => (Number(v) || 0) + 1),
      ]);
      await Promise.all([
        env.SUBSCRIPTIONS.put(key, String(count)),
        env.SUBSCRIPTIONS.put(wKey, String(weekCount), { expirationTtl: 60 * 60 * 24 * 14 }),
      ]);
      return new Response(JSON.stringify({ count }), {
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    if (request.method === "POST" && url.pathname === "/unlike") {
      const { section, id } = await request.json();
      if (!section || !id) return new Response("Bad Request", { status: 400, headers: corsHeaders() });
      if (await isRateLimited(request, env)) return tooManyRequests();
      const key = likeKey(section, id);
      const wKey = weekKey(section, id);
      const [count, weekCount] = await Promise.all([
        env.SUBSCRIPTIONS.get(key).then((v) => Math.max(0, (Number(v) || 0) - 1)),
        env.SUBSCRIPTIONS.get(wKey).then((v) => Math.max(0, (Number(v) || 0) - 1)),
      ]);
      await Promise.all([
        env.SUBSCRIPTIONS.put(key, String(count)),
        env.SUBSCRIPTIONS.put(wKey, String(weekCount), { expirationTtl: 60 * 60 * 24 * 14 }),
      ]);
      return new Response(JSON.stringify({ count }), {
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    if (request.method === "GET" && url.pathname === "/likes") {
      const list = await env.SUBSCRIPTIONS.list({ prefix: "likes:" });
      const counts = {};
      for (const key of list.keys) {
        if (key.name.startsWith("likes:week:")) continue;
        counts[key.name.slice("likes:".length)] = Number(await env.SUBSCRIPTIONS.get(key.name)) || 0;
      }
      return new Response(JSON.stringify(counts), {
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    if (request.method === "GET" && url.pathname === "/likes/week") {
      const prefix = weekPrefix();
      const list = await env.SUBSCRIPTIONS.list({ prefix });
      const counts = {};
      for (const key of list.keys) {
        counts[key.name.slice(prefix.length)] = Number(await env.SUBSCRIPTIONS.get(key.name)) || 0;
      }
      return new Response(JSON.stringify(counts), {
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404, headers: corsHeaders() });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(sendDailyPick(env));
  },
};

async function sendDailyPick(env) {
  webpush.setVapidDetails(VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);

  const res = await fetch(`${DATA_URL}?_=${Date.now()}`, { cf: { cacheTtl: 0 } });
  const text = await res.text();
  const SITE_DATA = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));

  const allItems = [];
  for (const section of Object.keys(SITE_DATA)) {
    for (const item of SITE_DATA[section].items || []) {
      allItems.push({ section, item });
    }
  }
  if (allItems.length === 0) return;

  const daysSinceEpoch = Math.floor(Date.now() / 86400000);
  const pick = allItems[daysSinceEpoch % allItems.length];
  const pageUrl = pick.item.detailUrl
    ? `${SITE_ORIGIN}/hakolah/${pick.item.detailUrl}`
    : `${SITE_ORIGIN}/hakolah/${pick.section}.html`;

  const payload = JSON.stringify({
    title: "🎯 اختيار اليوم من هكوله",
    body: pick.item.title,
    url: pageUrl,
  });

  /*
    نفس الـ KV namespace يخزّن أشياء ثانية غير الاشتراكات (عدّادات الإعجاب،
    مفاتيح حد الطلبات، وبقايا عدّاد الزيارات القديم). الاشتراكات مخزّنة
    بمفتاح hash بلا بادئة، فنستبعد البادئات المعروفة بدل ما نعامل كل مفتاح
    كأنه اشتراك — وإلا نهدر قراءات ونحاول إرسال إشعار لعدّاد رقمي.
  */
  const NON_SUBSCRIPTION_PREFIXES = ["likes:", "rl:", "visits:"];
  const list = await env.SUBSCRIPTIONS.list();

  for (const key of list.keys) {
    if (NON_SUBSCRIPTION_PREFIXES.some((p) => key.name.startsWith(p))) continue;

    const raw = await env.SUBSCRIPTIONS.get(key.name);
    if (!raw) continue;

    // JSON.parse كان خارج try — أي قيمة غير صالحة كانت توقف المهمة المجدولة
    // كلها فما يوصل الإشعار لأي مشترك. الآن الفشل يتخطى هذا المفتاح فقط.
    let sub;
    try {
      sub = JSON.parse(raw);
    } catch {
      continue;
    }
    if (!sub || typeof sub !== "object" || !sub.endpoint) continue;

    try {
      await webpush.sendNotification(sub, payload);
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await env.SUBSCRIPTIONS.delete(key.name);
      }
    }
  }
}
