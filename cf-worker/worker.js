// Cloudflare Worker: يخزّن اشتراكات الإشعارات (Push Subscriptions) بـ KV الخاص بنا فقط
// (ما يمر أي طرف ثالث)، ويرسل إشعار يومي بـ"اختيار اليوم" عبر Cron Trigger مجدول.
import webpush from "web-push";

const VAPID_SUBJECT = "mailto:mohframevision@outlook.com";
const SITE_ORIGIN = "https://mohframevision.github.io";
const DATA_URL = `${SITE_ORIGIN}/hakolah/js/data.js`;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": SITE_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
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
