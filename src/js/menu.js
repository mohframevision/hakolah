/* منيو رقمي: سلة خفيفة بالمتصفح + زر «اطلب عبر واتساب» برسالة جاهزة. بلا خادم ولا حفظ. */
document.querySelectorAll("[data-menu]").forEach((root) => {
  const d = root.dataset;
  const qty = new Map();
  const items = [...root.querySelectorAll("[data-item]")];
  const bar = root.querySelector(".cart-bar");
  const count = root.querySelector(".cart-count");
  const total = root.querySelector(".cart-total");
  const order = root.querySelector(".cart-order");
  const fmt = (n) => n.toFixed(3);
  const price = (el) => parseFloat(el.dataset.price) || 0;
  function render() {
    let n = 0, sum = 0;
    items.forEach((el) => {
      const q = qty.get(el) || 0;
      el.querySelector(".qty-n").textContent = q;
      el.classList.toggle("on", q > 0);
      n += q; sum += q * price(el);
    });
    bar.hidden = n === 0;
    count.textContent = n;
    total.textContent = `${fmt(sum)} ${d.cur}`;
    const lines = items.filter((el) => qty.get(el)).map((el) => `• ${qty.get(el)}× ${el.dataset.name}${price(el) ? " — " + fmt(price(el) * qty.get(el)) : ""}`);
    const msg = `${d.intro}\n${lines.join("\n")}\n${d.totalLabel}: ${fmt(sum)} ${d.cur}`;
    order.href = `https://wa.me/${d.wa || ""}?text=${encodeURIComponent(msg)}`;
  }
  root.addEventListener("click", (e) => {
    const b = e.target.closest("[data-step]");
    if (!b) return;
    const el = b.closest("[data-item]");
    qty.set(el, Math.max(0, (qty.get(el) || 0) + Number(b.dataset.step)));
    render();
  });
  render();
});
