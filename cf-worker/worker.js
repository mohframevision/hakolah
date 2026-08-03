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

function todayKey() {
  return `visits:day:${new Date().toISOString().slice(0, 10)}`;
}

function likeKey(section, id) {
  return `likes:${section}:${id}`;
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

    // عدّاد زيارات بسيط (مو دقيق زي Google Analytics، بس كافي لعرض تقريبي —
    // بياناته عندنا بس، بدون أي طرف ثالث)
    if ((request.method === "GET" || request.method === "POST") && url.pathname === "/track") {
      const dayKey = todayKey();
      const [total, today] = await Promise.all([
        env.SUBSCRIPTIONS.get("visits:total"),
        env.SUBSCRIPTIONS.get(dayKey),
      ]);
      await Promise.all([
        env.SUBSCRIPTIONS.put("visits:total", String((Number(total) || 0) + 1)),
        env.SUBSCRIPTIONS.put(dayKey, String((Number(today) || 0) + 1), {
          expirationTtl: 60 * 60 * 24 * 7,
        }),
      ]);
      return new Response("OK", { headers: corsHeaders() });
    }

    if (request.method === "GET" && url.pathname === "/stats") {
      const [total, today] = await Promise.all([
        env.SUBSCRIPTIONS.get("visits:total"),
        env.SUBSCRIPTIONS.get(todayKey()),
      ]);
      return new Response(
        JSON.stringify({ total: Number(total) || 0, today: Number(today) || 0 }),
        { headers: { ...corsHeaders(), "Content-Type": "application/json" } }
      );
    }

    // إعجاب عام من الزوار (منفصل عن "أعجبني" الخاصة بصاحب الموقع) — عدّاد بسيط
    // بدون تسجيل دخول، الحماية من التكرار تصير محلياً بالمتصفح (localStorage)
    if (request.method === "POST" && url.pathname === "/like") {
      const { section, id } = await request.json();
      if (!section || !id) return new Response("Bad Request", { status: 400, headers: corsHeaders() });
      const key = likeKey(section, id);
      const count = (Number(await env.SUBSCRIPTIONS.get(key)) || 0) + 1;
      await env.SUBSCRIPTIONS.put(key, String(count));
      return new Response(JSON.stringify({ count }), {
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    if (request.method === "POST" && url.pathname === "/unlike") {
      const { section, id } = await request.json();
      if (!section || !id) return new Response("Bad Request", { status: 400, headers: corsHeaders() });
      const key = likeKey(section, id);
      const count = Math.max(0, (Number(await env.SUBSCRIPTIONS.get(key)) || 0) - 1);
      await env.SUBSCRIPTIONS.put(key, String(count));
      return new Response(JSON.stringify({ count }), {
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    if (request.method === "GET" && url.pathname === "/likes") {
      const list = await env.SUBSCRIPTIONS.list({ prefix: "likes:" });
      const counts = {};
      for (const key of list.keys) {
        counts[key.name.slice("likes:".length)] = Number(await env.SUBSCRIPTIONS.get(key.name)) || 0;
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

  const list = await env.SUBSCRIPTIONS.list();
  for (const key of list.keys) {
    const raw = await env.SUBSCRIPTIONS.get(key.name);
    if (!raw) continue;
    const sub = JSON.parse(raw);
    try {
      await webpush.sendNotification(sub, payload);
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await env.SUBSCRIPTIONS.delete(key.name);
      }
    }
  }
}
