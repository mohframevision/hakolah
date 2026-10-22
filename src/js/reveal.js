/* بطاقة التواصل: تُبنى لحظة ضغطة حقيقية (isTrusted) من أجزاء مشفّرة، فما تظهر بالـHTML ولا بالمستودع كنص واضح،
   وخلفها تغبيش الصفحة. الأوصاف تجي من data-* بالقالب (عربي/إنجليزي). */
(() => {
  const dec = (a, b) => a.map((k, i) => String.fromCharCode(k ^ b[i])).join("");
  const D = {
    n: () => dec([175, 91, 149, 73, 219, 45, 13, 242, 211, 62, 59], [150, 108, 166, 122, 226, 29, 61, 196, 235, 12, 15]),
    e: () => dec([104, 98, 52, 154, 46, 59, 64, 35, 195, 23, 65, 187, 99, 136, 176, 180, 138, 23, 241, 160, 126, 52, 108, 185, 157, 151], [5, 13, 92, 252, 92, 90, 45, 70, 181, 126, 50, 210, 12, 230, 240, 219, 255, 99, 157, 207, 17, 95, 66, 218, 242, 250]),
    i: () => dec([116, 2, 151, 30, 95, 37], [18, 55, 229, 48, 43, 87]),
  };
  document.querySelectorAll("[data-reveal-contact]").forEach((box) => {
    const btn = box.querySelector("button");
    if (!btn) return;
    const d = box.dataset;
    btn.addEventListener("click", (ev) => {
      if (!ev.isTrusted) return;
      const num = D.n(), mail = D.e(), ig = D.i();
      const dlg = document.createElement("dialog");
      dlg.className = "contact-card";
      const row = (icon, label, href, text, ltr) => {
        const a = document.createElement("a");
        a.className = "contact-row";
        a.href = href;
        a.target = "_blank";
        a.rel = "noopener";
        a.innerHTML = '<span class="contact-ic"></span><span class="contact-tx"><small></small><b></b></span>';
        a.querySelector(".contact-ic").textContent = icon;
        a.querySelector("small").textContent = label;
        const b = a.querySelector("b");
        b.textContent = text;
        if (ltr) b.dir = "ltr";
        return a;
      };
      const close = document.createElement("button");
      close.type = "button";
      close.className = "contact-close";
      close.setAttribute("aria-label", d.close || "Close");
      close.textContent = "✕";
      const h = document.createElement("h2");
      h.textContent = d.title || "";
      dlg.append(
        close,
        h,
        row("💬", d.wa || "WhatsApp", `https://wa.me/${num}?text=${encodeURIComponent(d.msg || "")}`, `+${num.slice(0, 3)} ${num.slice(3, 7)} ${num.slice(7)}`, true),
        row("✉️", d.mail || "Email", `mailto:${mail}`, mail, true),
        row("📸", d.ig || "Instagram", `https://www.instagram.com/${ig}/`, `@${ig}`, true)
      );
      close.addEventListener("click", () => dlg.close());
      dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
      dlg.addEventListener("close", () => dlg.remove());
      document.body.append(dlg);
      dlg.showModal();
    });
  });
})();
