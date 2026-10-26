/* عرض المنيو الحي بصفحة «اعرض محلك»: سيناريو يلعب على جوال داخل الصفحة بنفس مكوّن المنيو الحقيقي
   (menu.js)، ثم يصير تفاعلياً. يبدأ لما يظهر على الشاشة، ويحترم «تقليل الحركة». */
(() => {
  const ph = document.querySelector("[data-demo]");
  if (!ph) return;
  const screen = ph.querySelector(".demo-screen");
  const menu = ph.querySelector(".demo-menu");
  const qr = ph.querySelector(".demo-qr");
  const msg = ph.querySelector(".demo-msg");
  const cur = ph.querySelector(".demo-cursor");
  const replay = document.querySelector("[data-demo-replay]");
  const root = menu.querySelector("[data-menu]");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let run = 0;

  const reset = () => {
    root.querySelectorAll("[data-item]").forEach((el) => {
      while (+el.querySelector(".qty-n").textContent > 0) el.querySelector('[data-step="-1"]').click();
    });
    msg.hidden = true;
    cur.hidden = true;
    menu.scrollTop = 0;
  };
  const moveTo = async (el, id) => {
    const s = screen.getBoundingClientRect();
    menu.scrollTo({ top: el.offsetTop - menu.clientHeight / 2 + el.offsetHeight / 2, behavior: "smooth" });
    await wait(450);
    if (id !== run) return;
    const r = el.getBoundingClientRect();
    cur.hidden = false;
    cur.style.transform = `translate(${r.left - s.left + r.width / 2}px, ${r.top - s.top + r.height / 2}px)`;
    await wait(750);
  };
  const tap = async (el, id) => {
    await moveTo(el, id);
    if (id !== run) return;
    cur.classList.add("press");
    await wait(140);
    cur.classList.remove("press");
    el.click();
    await wait(420);
  };

  async function play() {
    const id = ++run;
    ph.classList.add("playing");
    if (replay) replay.hidden = true;
    reset();
    qr.classList.remove("off");
    menu.classList.add("hid");
    await wait(1900);
    if (id !== run) return;
    qr.classList.add("off");
    menu.classList.remove("hid");
    await wait(700);
    const plus = (i) => root.querySelectorAll("[data-item]")[i].querySelector('[data-step="1"]');
    for (const i of [0, 0, 3]) {
      if (id !== run) return;
      await tap(plus(i), id);
    }
    if (id !== run) return;
    const ord = root.querySelector(".cart-order");
    await tap(ord, id);
    if (id !== run) return;
    msg.querySelector("pre").textContent = decodeURIComponent(ord.href.split("?text=")[1] || "");
    msg.hidden = false;
    cur.hidden = true;
    await wait(3800);
    if (id !== run) return;
    msg.hidden = true;
    ph.classList.remove("playing");
    if (replay) replay.hidden = false;
  }

  // ما نفتح واتساب أثناء العرض: الضغطة الوهمية على الزر تتحوّل لمعاينة الرسالة
  root.querySelector(".cart-order").addEventListener("click", (e) => {
    if (ph.classList.contains("playing")) e.preventDefault();
  });
  if (replay) replay.addEventListener("click", play);
  // اختيار الستايل (شعبي/كافيه/فاخر): نفس الأصناف والأسعار، والهوية تتغيّر
  document.querySelectorAll("[data-hm-theme]").forEach((b, _, all) =>
    b.addEventListener("click", () => {
      root.dataset.theme = b.dataset.hmTheme;
      all.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    })
  );

  if (reduce) {
    menu.classList.remove("hid");
    qr.classList.add("off");
    return;
  }
  let started = false;
  new IntersectionObserver(
    (es, ob) => {
      if (!started && es.some((x) => x.isIntersecting)) {
        started = true;
        ob.disconnect();
        play();
      }
    },
    { threshold: 0.5 }
  ).observe(ph);
})();
