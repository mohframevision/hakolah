// فحص صغير: عدد قراءات KV لطلب /likes، مع مفاتيح قديمة (بلا metadata) وجديدة
import assert from "node:assert";
import worker from "./worker.js";

function fakeKV(seed) {
  const store = new Map(seed.map(([k, v, meta]) => [k, { v, meta }]));
  const ops = { get: 0, list: 0, put: 0 };
  return {
    ops,
    store,
    async get(k) { ops.get++; return store.get(k)?.v ?? null; },
    async put(k, v, o = {}) { ops.put++; store.set(k, { v, meta: o.metadata }); },
    async delete(k) { store.delete(k); },
    async list({ prefix = "" } = {}) {
      ops.list++;
      const keys = [...store.keys()].filter((k) => k.startsWith(prefix)).sort().map((name) => ({ name, metadata: store.get(name).meta }));
      return { keys, list_complete: true };
    },
  };
}
const req = (path, init) => new Request("https://w.example" + path, init);
const N = 100;
const seed = Array.from({ length: N }, (_, i) => [`likes:restaurants:item${i}`, String(i + 1)]); // 100 legacy keys, no metadata
const kv = fakeKV(seed);
const env = { SUBSCRIPTIONS: kv };

// 1) first request: legacy keys read in parallel once and migrated
let res = await worker.fetch(req("/likes"), env, {});
let counts = await res.json();
assert.equal(Object.keys(counts).length, N);
assert.equal(counts["restaurants:item41"], 42);
console.log("1st request (migration):", JSON.stringify(kv.ops));

// 2) within 60s: served from memory, zero KV ops
Object.assign(kv.ops, { get: 0, list: 0, put: 0 });
await worker.fetch(req("/likes"), env, {});
console.log("2nd request (same minute):", JSON.stringify(kv.ops));
assert.equal(kv.ops.list + kv.ops.get, 0);

// 3) a like invalidates memory and stores metadata; next read = 1 list, 0 gets
Object.assign(kv.ops, { get: 0, list: 0, put: 0 });
res = await worker.fetch(req("/like", { method: "POST", headers: { Origin: "https://hakolah.com", "Content-Type": "application/json", "CF-Connecting-IP": "1.2.3.4" }, body: JSON.stringify({ section: "restaurants", id: "item5" }) }), env, {});
assert.equal(res.status, 200, "like accepted");
Object.assign(kv.ops, { get: 0, list: 0, put: 0 });
counts = await (await worker.fetch(req("/likes"), env, {})).json();
assert.equal(counts["restaurants:item5"], 7);
console.log("after migration, fresh read:", JSON.stringify(kv.ops));
assert.equal(kv.ops.get, 0);

// 4) week endpoint also 0 gets
Object.assign(kv.ops, { get: 0, list: 0, put: 0 });
const week = await (await worker.fetch(req("/likes/week"), env, {})).json();
assert.equal(week["restaurants:item5"], 1);
console.log("/likes/week:", JSON.stringify(kv.ops));
console.log("OK");
