// محوّل العملات «كم بالدينار؟» — الأسعار مضمّنة في الصفحة وقت البناء (src/_data/fx.json)،
// فلا طلب لأي جهة، وتعمل بلا إنترنت من نسخة الصفحة المخزّنة.
(function () {
  const root = document.querySelector(".fx");
  const dataEl = document.getElementById("fx-data");
  if (!root || !dataEl) return;

  const fx = JSON.parse(dataEl.textContent);
  const ar = root.dataset.lang === "ar";
  // العملات الخليجية مربوطة بالدولار: وحدات لكل دولار، ثابتة.
  const PEG = { BHD: 0.376, SAR: 3.75, AED: 3.6725, QAR: 3.64, OMR: 0.3845 };

  const NAMES = {
    JPY: ["ين ياباني", "Japanese yen"], USD: ["دولار أمريكي", "US dollar"], EUR: ["يورو", "Euro"],
    SAR: ["ريال سعودي", "Saudi riyal"], AED: ["درهم إماراتي", "UAE dirham"], QAR: ["ريال قطري", "Qatari riyal"],
    OMR: ["ريال عماني", "Omani rial"], GBP: ["جنيه إسترليني", "British pound"], INR: ["روبية هندية", "Indian rupee"],
    KRW: ["وون كوري", "Korean won"], THB: ["بات تايلندي", "Thai baht"], TRY: ["ليرة تركية", "Turkish lira"],
    CNY: ["يوان صيني", "Chinese yuan"], MYR: ["رينغيت ماليزي", "Malaysian ringgit"], PHP: ["بيزو فلبيني", "Philippine peso"],
    IDR: ["روبية إندونيسية", "Indonesian rupiah"], SGD: ["دولار سنغافوري", "Singapore dollar"], HKD: ["دولار هونغ كونغ", "Hong Kong dollar"],
    CHF: ["فرنك سويسري", "Swiss franc"], AUD: ["دولار أسترالي", "Australian dollar"], CAD: ["دولار كندي", "Canadian dollar"],
    NZD: ["دولار نيوزيلندي", "New Zealand dollar"], ZAR: ["راند جنوب أفريقي", "South African rand"], BRL: ["ريال برازيلي", "Brazilian real"],
    MXN: ["بيزو مكسيكي", "Mexican peso"], SEK: ["كرونة سويدية", "Swedish krona"], NOK: ["كرونة نرويجية", "Norwegian krone"],
    DKK: ["كرونة دنماركية", "Danish krone"], PLN: ["زلوتي بولندي", "Polish zloty"], CZK: ["كورونا تشيكية", "Czech koruna"],
    HUF: ["فورنت مجري", "Hungarian forint"], RON: ["ليو روماني", "Romanian leu"], ISK: ["كرونة آيسلندية", "Icelandic krona"],
  };
  const COMMON = ["JPY", "USD", "EUR", "SAR", "AED", "GBP", "INR", "TRY", "THB"];

  // وحدات العملة لكل دولار، ثم لكل دينار.
  const perUsd = (c) => (c in PEG ? PEG[c] : fx.perEur[c] / fx.perEur.USD);
  const perBhd = (c) => perUsd(c) / PEG.BHD;
  const available = Object.keys(NAMES).filter((c) => c in PEG || (fx.perEur[c] > 0 && fx.perEur.USD > 0));
  const name = (c) => (c === "BHD" ? (ar ? "دينار بحريني" : "Bahraini dinar") : NAMES[c][ar ? 0 : 1]);

  const $ = (id) => document.getElementById(id);
  const amount = $("fxAmount"), select = $("fxCurrency"), chips = $("fxChips");
  let cur = "JPY", toBhd = true;
  try { const saved = localStorage.getItem("fx-currency"); if (available.includes(saved)) cur = saved; } catch { /* تخزين محجوب */ }

  for (const c of available) select.add(new Option(`${c} · ${name(c)}`, c));
  for (const c of COMMON.filter((c) => available.includes(c))) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "filter-chip"; b.dataset.c = c; b.textContent = c;
    b.title = name(c);
    b.addEventListener("click", () => setCurrency(c));
    chips.append(b);
  }

  // يقبل الأرقام العربية والفارسية والفواصل: «١٬٨١٣» و«1,813.5» و«2,5» و«٢٫٥» و«2،5».
  // أكثر من فاصلة = فواصل آلاف (ومنها الترقيم الهندي 1,23,456). فاصلة واحدة تتبعها ثلاثة أرقام = آلاف، وإلا فهي عشرية.
  function parse(s) {
    s = String(s).trim()
      .replace(/[٠-٩۰-۹]/g, (d) => String((d.charCodeAt(0) & 0xf) % 10))
      .replace(/[٬\s]/g, "").replace(/[٫،]/g, ".");
    s = (s.match(/,/g) || []).length > 1 ? s.replace(/,/g, "") : s.replace(/,(?=\d{3}(?!\d))/, "").replace(",", ".");
    return s === "" ? NaN : Number(s);
  }
  function fmt(n, c) {
    const d = c === "BHD" || c === "OMR" ? 3 : ["JPY", "KRW", "IDR", "HUF", "ISK"].includes(c) ? 0 : 2;
    // مبلغ صغير جداً لا يظهر صفراً: 1 روبية إندونيسية = 0.000021 دينار
    if (n !== 0 && Math.abs(n) < 0.5 * 10 ** -d) return n.toLocaleString("en-US", { maximumSignificantDigits: 2 });
    return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  function setCurrency(c) {
    cur = c;
    try { localStorage.setItem("fx-currency", c); } catch { /* تخزين محجوب */ }
    render();
  }

  function render() {
    const from = toBhd ? cur : "BHD", to = toBhd ? "BHD" : cur;
    select.value = cur;
    $("fxFromLabel").textContent = `${ar ? "المبلغ" : "Amount"} (${name(from)})`;
    const a = parse(amount.value), r = perBhd(cur);
    const v = toBhd ? a / r : a * r;
    $("fxResult").textContent = a >= 0 && Number.isFinite(v) ? `${fmt(v, to)} ${to}` : "—";
    $("fxUnit").textContent = `1 BHD = ${fmt(r, cur)} ${cur}`;
    for (const b of chips.children) {
      const on = b.dataset.c === cur;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", String(on));
    }
  }

  amount.addEventListener("input", render);
  select.addEventListener("change", () => setCurrency(select.value));
  $("fxSwap").addEventListener("click", () => { toBhd = !toBhd; render(); amount.focus(); });
  // التاريخ بالكلمات بدل 2026-11-12 (الشكل الرقمي ينقلب في سطر عربي)
  const d = new Date(fx.date + "T12:00:00Z");
  if (!Number.isNaN(d.getTime())) {
    $("fxDate").textContent = d.toLocaleDateString(ar ? "ar-BH-u-nu-latn" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    $("fxDate").removeAttribute("dir");
  }
  render();
})();
