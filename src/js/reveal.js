/* زر «أظهر وسيلة التواصل»: رقم صاحب الموقع ما يطلع بالـHTML ولا يتكتب كنص واضح بالمستودع — يتركّب من
   أجزاء مشفّرة لحظة ضغطة حقيقية من الزائر (isTrusted)، فالسكربتات اللي تجمع الأرقام من الصفحات ما تلقاه.
   ملاحظة: حماية ضد الجمع الآلي العادي، مو سرّية مطلقة (من يفكّ الكود يقدر يطلّعه). */
(() => {
  const A = [175, 91, 149, 73, 219, 45, 13, 242, 211, 62, 59];
  const B = [150, 108, 166, 122, 226, 29, 61, 196, 235, 12, 15];
  const num = () => A.map((k, i) => String.fromCharCode(k ^ B[i])).join("");
  document.querySelectorAll("[data-reveal-contact]").forEach((box) => {
    const btn = box.querySelector("button");
    if (!btn) return;
    btn.addEventListener("click", (e) => {
      if (!e.isTrusted) return;
      const n = num();
      const msg = box.dataset.msg || "";
      const a = document.createElement("a");
      a.className = "btn";
      a.href = `https://wa.me/${n}?text=${encodeURIComponent(msg)}`;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = box.dataset.wa || "WhatsApp";
      const num_ = document.createElement("span");
      num_.className = "reveal-num";
      num_.dir = "ltr";
      num_.textContent = `+${n.slice(0, 3)} ${n.slice(3, 7)} ${n.slice(7)}`;
      btn.replaceWith(a, num_);
    });
  });
})();
