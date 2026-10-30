/* تُحمَّل بصفحة expense-calculator فقط (pageScript) بعد main.js، وتستخدم دواله العامة. */
/* ===== حاسبة المصروفات والدخل =====
   كل البيانات تُحفظ بـlocalStorage فقط — ما فيه سيرفر ولا حساب، فهذي بيانات
   مالية شخصية. نفس روح noThirdParty بالمحوّل: صفحة بلا أي طرف ثالث. */
function initExpenseCalculator() {
  const form = document.getElementById("calcForm");
  const list = document.getElementById("calcEntries");
  if (!form || !list) return;

  const isEn = window.SITE_LANG === "en";
  const say = (ar, en) => (isEn ? en : ar);
  const CURRENCY = say("د.ب", "BHD");
  const STORAGE_KEY = "hakolah-expense-entries-v1";

  const typeButtons = document.querySelectorAll(".calc-type");
  const amountDisplay = document.getElementById("calcAmountDisplay");
  const amountPendingEl = document.getElementById("calcAmountPending");
  const amountValueEl = document.getElementById("calcAmountValue");
  const backspaceBtn = document.getElementById("calcBackspace");
  const keypadButtons = document.querySelectorAll(".calc-key");
  const categoryGrid = document.getElementById("calcCategoryGrid");
  const noteInput = document.getElementById("calcNote");
  const repeatInput = document.getElementById("calcRepeat");
  const dateInput = document.getElementById("calcDate");
  const monthInput = document.getElementById("calcMonth");
  const allTimeToggle = document.getElementById("calcAllTime");
  const summaryIncome = document.getElementById("calcSummaryIncome");
  const summaryExpense = document.getElementById("calcSummaryExpense");
  const summaryBalance = document.getElementById("calcSummaryBalance");
  const breakdown = document.getElementById("calcBreakdown");
  const emptyNote = document.getElementById("calcEmpty");
  const exportBtn = document.getElementById("calcExport");
  const importInput = document.getElementById("calcImport");
  const addBtn = document.getElementById("calcAddBtn");
  const currentBalanceEl = document.getElementById("calcCurrentBalance");
  const openingInput = document.getElementById("calcOpeningBalance");
  const savingsRateEl = document.getElementById("calcSavingsRate");
  const modeButtons = document.querySelectorAll(".calc-mode");
  const classChips = document.getElementById("calcClassChips");
  const analysisEl = document.getElementById("calcAnalysis");
  const analysisTitleEl = document.getElementById("calcAnalysisTitle");

  let type = "expense";
  let selectedCategory = "";
  let selectedClass = "";
  // تاريخ الجهاز المحلي لا UTC: البحرين UTC+3، فـtoISOString كان يسجّل عمليات ما
  // بين ١٢ و٣ الفجر بتاريخ أمس، وراتب أول الشهر يطلع بالشهر اللي قبله
  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const thisMonthStr = () => todayStr().slice(0, 7);
  if (dateInput) dateInput.value = todayStr();
  if (monthInput) monthInput.value = thisMonthStr();

  function loadEntries() {
    try {
      const raw = lsGet(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  let entries = loadEntries();
  let saveFailed = false;
  function saveEntries() {
    try {
      saveFailed = !lsSet(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // خزنة ممتلئة أو وضع تصفّح خاص — نبلّغ المستخدم بدل فشل صامت لبيانات
      // يهمّه ضياعها
      saveFailed = true;
    }
  }

  /* ===== العمليات المتكررة شهرياً (راتب، إيجار، اشتراك) =====
     تُولَّد النسخ الناقصة من تاريخ العملية الأصلية حتى اليوم. المعرّف
     مشتقّ من (الأصل + الشهر) فإعادة التشغيل لا تكرّر شيئاً */
  function addMonths(dateStr, count) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const target = new Date(Date.UTC(y, m - 1 + count, 1));
    const year = target.getUTCFullYear();
    const month = target.getUTCMonth();
    // عملية يوم 31 بشهر من 30 يوماً تُثبَّت على آخر يوم فيه بدل ما تقفز للشهر التالي
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const day = Math.min(d, lastDay);
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function materializeRecurring() {
    const today = todayStr();
    const ids = new Set(entries.map((e) => e.id));
    let created = 0;
    // نسخة من القائمة: نضيف للأصل داخل الحلقة
    entries.slice().forEach((source) => {
      if (source.repeat !== "monthly") return;
      // سقف 24 نسخة جديدة بكل مرة (لا 24 شهراً من الأصل، وإلا الراتب يوقف بعد سنتين بصمت)
      for (let n = 1, made = 0; n <= 1200 && made < 24; n++) {
        const date = addMonths(source.date, n);
        if (date > today) break;
        const genId = `${source.id}-r${date.slice(0, 7)}`;
        // نسخة حذفها المستخدم عمداً (شهر ما استلم فيه راتبه مثلاً) لا تُعاد
        if (ids.has(genId) || skippedRecurring().includes(genId)) continue;
        // النسخة المولَّدة لا تتكرر بذاتها، وتحمل مرجع أصلها
        entries.push({ ...source, id: genId, date, repeat: "", from: source.id });
        ids.add(genId);
        created++;
        made++;
      }
    });
    if (created) saveEntries();
    return created;
  }

  const SKIP_KEY = "hakolah-expense-skipped-v1";
  function skippedRecurring() {
    try {
      const raw = lsGet(SKIP_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  function setSkippedRecurring(list) {
    try {
      if (!lsSet(SKIP_KEY, JSON.stringify(list))) saveFailed = true;
    } catch {
      saveFailed = true;
    }
  }

  /* رصيد البداية ونمط الاستخدام — منفصلين عن العمليات لأنهما إعداد لا حركة */
  const SETTINGS_KEY = "hakolah-expense-settings-v1";
  function loadSettings() {
    try {
      const raw = lsGet(SETTINGS_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return {
        opening: typeof parsed.opening === "number" ? parsed.opening : 0,
        mode: parsed.mode === "business" ? "business" : "personal",
      };
    } catch {
      return { opening: 0, mode: "personal" };
    }
  }

  materializeRecurring();

  let settings = loadSettings();
  function saveSettings() {
    try {
      if (!lsSet(SETTINGS_KEY, JSON.stringify(settings))) saveFailed = true;
    } catch {
      saveFailed = true;
    }
  }

  const SEED_CATEGORIES = say(
    [
      "كهرباء وماء",
      "إيجار",
      "بقالة",
      "مواصلات وبنزين",
      "اتصالات وإنترنت",
      "صيانة",
      "ترفيه",
      "صحة",
      "تعليم",
      "راتب",
      "دخل إيجار",
      "أخرى",
    ],
    [
      "Electricity & Water",
      "Rent",
      "Groceries",
      "Transport & Fuel",
      "Phone & Internet",
      "Maintenance",
      "Entertainment",
      "Health",
      "Education",
      "Salary",
      "Rental Income",
      "Other",
    ]
  );

  const SEED_ICONS = ["⚡", "🏠", "🛒", "🚗", "📶", "🔧", "🎉", "🏥", "🎓", "💵", "🏢", "📦"];
  const seedIconMap = {};
  SEED_CATEGORIES.forEach((cat, i) => {
    seedIconMap[cat] = SEED_ICONS[i];
  });
  // فئة قديمة من نسخة سابقة كانت تُكتب حرة بلا أيقونة معروفة — نعطيها
  // أيقونة عامة بدل ما نكسر عرضها
  const categoryIcon = (cat) => seedIconMap[cat] || "🏷️";

  function renderCategoryGrid() {
    if (!categoryGrid) return;
    const used = entries.map((e) => e.category).filter(Boolean);
    const all = [...new Set([...SEED_CATEGORIES, ...used])];
    categoryGrid.innerHTML = "";
    all.forEach((cat) => {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "calc-cat-tile";
      if (cat === selectedCategory) tile.classList.add("active");
      const icon = document.createElement("span");
      icon.className = "calc-cat-tile-icon";
      icon.textContent = categoryIcon(cat);
      const label = document.createElement("span");
      label.className = "calc-cat-tile-label";
      label.textContent = cat;
      tile.append(icon, label);
      tile.addEventListener("click", () => {
        selectedCategory = cat;
        renderCategoryGrid();
      });
      categoryGrid.append(tile);
    });

    const addTile = document.createElement("button");
    addTile.type = "button";
    addTile.className = "calc-cat-tile calc-cat-tile-add";
    const addIcon = document.createElement("span");
    addIcon.className = "calc-cat-tile-icon";
    addIcon.textContent = "➕";
    const addLabel = document.createElement("span");
    addLabel.className = "calc-cat-tile-label";
    addLabel.textContent = say("جديدة", "New");
    addTile.append(addIcon, addLabel);
    addTile.addEventListener("click", () => {
      const name = (window.prompt(say("اسم الفئة الجديدة:", "New category name:")) || "").trim();
      if (!name) return;
      selectedCategory = name;
      renderCategoryGrid();
    });
    categoryGrid.append(addTile);
  }

  // مبلغ واحد نعرضه زي ما دخل، لكن مجاميع أكثر من عملية نجمعها بوحدة الفلس
  // الصحيحة لا بالكسور العشرية — عشان لا يتراكم خطأ التقريب الثنائي
  // (0.1 + 0.2 بالجافاسكربت) على قائمة عمليات طويلة
  const toFils = (bhd) => Math.round(bhd * 1000);
  const fromFils = (fils) => fils / 1000;

  function formatAmount(n) {
    const sign = n < 0 ? "-" : "";
    return `${sign}${Math.abs(n).toFixed(3)}`;
  }

  function moneyHtml(n, colorClass) {
    return `<span dir="ltr"${colorClass ? ` class="${colorClass}"` : ""}>${formatAmount(n)}</span> ${CURRENCY}`;
  }

  /* تصنيف المصروف — يخدم إطارين معروفين:
     شخصي: ضرورة/كمالية، أساس قاعدة 50/30/20 (نصف الدخل ضروريات، ثلثه
       كماليات، الباقي ادخار)
     تجاري: تكلفة مباشرة/تشغيلي، أساس قائمة الدخل (إيراد − تكلفة مباشرة =
       مجمل الربح، وناقص التشغيلي = صافي الربح)
     ما نخلّي "ادخار" تصنيفاً بحد ذاته: الادخار = الدخل ناقص كل المصروفات،
     ولو صار تصنيفاً لانحسب مرّتين */
  const CLASS_OPTIONS = {
    personal: [
      { value: "need", label: say("🧺 ضرورة", "🧺 Need") },
      { value: "want", label: say("✨ كمالية", "✨ Want") },
    ],
    business: [
      { value: "cogs", label: say("📦 تكلفة مباشرة", "📦 Direct cost") },
      { value: "operating", label: say("🏢 تشغيلي", "🏢 Operating") },
    ],
  };

  function renderClassChips() {
    if (!classChips) return;
    classChips.innerHTML = "";
    // التصنيف يخص المصروفات فقط — الدخل إيراد بحد ذاته
    classChips.hidden = type !== "expense";
    if (type !== "expense") return;
    CLASS_OPTIONS[settings.mode].forEach((option) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "filter-chip calc-class";
      if (option.value === selectedClass) chip.classList.add("active");
      chip.textContent = option.label;
      chip.addEventListener("click", () => {
        selectedClass = selectedClass === option.value ? "" : option.value;
        renderClassChips();
      });
      classChips.append(chip);
    });
  }

  function applyTypeColor() {
    if (!amountDisplay) return;
    amountDisplay.classList.toggle("calc-type-income", type === "income");
    amountDisplay.classList.toggle("calc-type-expense", type === "expense");
  }
  applyTypeColor();

  typeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      type = btn.dataset.type;
      typeButtons.forEach((b) => b.classList.toggle("active", b === btn));
      applyTypeColor();
      renderClassChips();
    });
  });

  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      settings.mode = btn.dataset.mode;
      saveSettings();
      modeButtons.forEach((b) => b.classList.toggle("active", b === btn));
      // تصنيف النمط السابق ما له معنى بالنمط الجديد
      selectedClass = "";
      renderClassChips();
      render();
    });
  });
  modeButtons.forEach((b) => b.classList.toggle("active", b.dataset.mode === settings.mode));

  if (openingInput) {
    openingInput.value = settings.opening ? String(settings.opening) : "";
    openingInput.addEventListener("input", () => {
      const value = Number(openingInput.value);
      settings.opening = isNaN(value) ? 0 : value;
      saveSettings();
      render();
    });
  }

  // آلة حاسبة صغيرة بدل حقل رقمي عادي: تلمس أسرع من لوحة مفاتيح نظام
  // التشغيل، وتفيد لجمع أكثر من مبلغ (فاتورتين، مقبوضتين) قبل ما تضيف
  let calcState = { acc: null, op: null, current: "0" };

  function updateAmountDisplay() {
    if (amountPendingEl) {
      amountPendingEl.textContent = calcState.acc !== null && calcState.op ? `${formatAmount(calcState.acc)} ${calcState.op}` : "";
    }
    if (amountValueEl) amountValueEl.textContent = calcState.current;
  }

  function applyPending(state) {
    const val = parseFloat(state.current);
    const num = isNaN(val) ? 0 : val;
    if (state.acc === null) {
      state.acc = num;
      return;
    }
    if (!state.op) return;
    switch (state.op) {
      case "+":
        state.acc += num;
        break;
      case "-":
        state.acc -= num;
        break;
      case "×":
        state.acc *= num;
        break;
      case "÷":
        if (num !== 0) state.acc /= num;
        break;
    }
  }

  function pressKey(key) {
    if (/^[0-9]$/.test(key)) {
      calcState.current = calcState.current === "0" ? key : calcState.current + key;
    } else if (key === ".") {
      if (!calcState.current.includes(".")) calcState.current += ".";
    } else if (key === "+" || key === "-" || key === "×" || key === "÷") {
      applyPending(calcState);
      calcState.op = key;
      calcState.current = "0";
    } else if (key === "=") {
      applyPending(calcState);
      calcState.current = String(Math.round(calcState.acc * 1000) / 1000);
      calcState.acc = null;
      calcState.op = null;
    }
    updateAmountDisplay();
  }

  function resetAmount() {
    calcState = { acc: null, op: null, current: "0" };
    updateAmountDisplay();
  }

  // القيمة النهائية تُحسب بلا حاجة للضغط على "=" — عشان "٥+٣" ثم "إضافة"
  // مباشرة يشتغل زي ما يتوقعه أي مستخدم لآلة حاسبة
  function finalAmount() {
    const state = { ...calcState };
    applyPending(state);
    return state.acc === null ? 0 : state.acc;
  }

  keypadButtons.forEach((btn) => {
    btn.addEventListener("click", () => pressKey(btn.dataset.key));
  });
  if (backspaceBtn) {
    backspaceBtn.addEventListener("click", () => {
      calcState.current = calcState.current.length > 1 ? calcState.current.slice(0, -1) : "0";
      updateAmountDisplay();
    });
  }
  updateAmountDisplay();

  function currentFilterEntries() {
    if (allTimeToggle && allTimeToggle.checked) return entries;
    const month = monthInput && monthInput.value;
    if (!month) return entries;
    return entries.filter((e) => e.date && e.date.slice(0, 7) === month);
  }

  let toastTimer = null;
  function showToast(message, actionLabel, onAction) {
    let toast = document.getElementById("calcToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "calcToast";
      toast.className = "calc-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.append(toast);
    }
    toast.innerHTML = "";
    const span = document.createElement("span");
    span.textContent = message;
    toast.append(span);
    if (actionLabel && onAction) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "calc-toast-action";
      btn.textContent = actionLabel;
      btn.addEventListener("click", () => {
        onAction();
        toast.classList.remove("show");
      });
      toast.append(btn);
    }
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 5000);
  }

  function removeEntry(id) {
    const index = entries.findIndex((e) => e.id === id);
    if (index === -1) return;
    const [removed] = entries.splice(index, 1);
    // نسخة مولَّدة من عملية متكررة: نسجّلها كمتخطّاة وإلا رجعت بإعادة التحميل
    if (removed.from) setSkippedRecurring(skippedRecurring().concat(removed.id));
    saveEntries();
    render();
    // حذف فوري بلا نافذة تأكيد تقاطع المستخدم، مع تراجع لثوانٍ بدل الندم
    showToast(say("تم الحذف", "Deleted"), say("↩️ تراجع", "↩️ Undo"), () => {
      entries.splice(index, 0, removed);
      if (removed.from) setSkippedRecurring(skippedRecurring().filter((id) => id !== removed.id));
      saveEntries();
      render();
    });
  }

  function analysisRow(label, fils, note, options) {
    const row = document.createElement("div");
    row.className = `calc-analysis-row${options && options.strong ? " calc-analysis-strong" : ""}`;
    const labelEl = document.createElement("span");
    labelEl.className = "calc-analysis-label";
    labelEl.textContent = label;
    const valueEl = document.createElement("span");
    valueEl.className = "calc-analysis-value";
    valueEl.innerHTML = moneyHtml(fromFils(fils), options && options.color ? options.color : "");
    const noteEl = document.createElement("span");
    noteEl.className = "calc-analysis-note";
    noteEl.textContent = note || "";
    row.append(labelEl, valueEl, noteEl);
    return row;
  }

  /* لوحة التحليل — تترجم الأرقام الخام لإطار معروف يُستعمل فعلاً:
     الشخصي قاعدة 50/30/20، والتجاري قائمة الدخل بمجمل الربح وصافيه */
  function renderAnalysis(filtered, incomeFils, expenseFils, balanceFils) {
    if (!analysisEl) return;
    analysisEl.innerHTML = "";
    const pct = (fils) => (incomeFils > 0 ? `${Math.round((fils / incomeFils) * 100)}%` : "—");

    let classifiedFils = 0;
    const byClass = {};
    filtered.forEach((e) => {
      if (e.type !== "expense") return;
      const cls = e.cls || "";
      if (!cls) return;
      byClass[cls] = (byClass[cls] || 0) + toFils(e.amount);
      classifiedFils += toFils(e.amount);
    });
    const unclassifiedFils = expenseFils - classifiedFils;

    if (settings.mode === "personal") {
      if (analysisTitleEl) analysisTitleEl.textContent = say("قاعدة ٥٠/٣٠/٢٠", "The 50/30/20 rule");

      /* القاعدة كلها نِسَب من الدخل — بلا دخل مسجّل بالفترة تصير القسمة على
         صفر، فتطلع نِسَب شرطات و"ادخار سالب" مقابل "هدف ٢٠٪"، وهذا كلام
         بلا معنى يربك القارئ. نقولها صراحة بدل ما نعرض أرقاماً فاضية */
      if (incomeFils <= 0) {
        const note = document.createElement("p");
        note.className = "calc-empty-note";
        note.textContent = expenseFils > 0
          ? say(
              "سجّلت مصروفات بلا دخل بهذي الفترة، وقاعدة ٥٠/٣٠/٢٠ نِسَب من الدخل — سجّل دخلك عشان تبان النسب.",
              "You logged expenses but no income this period, and 50/30/20 is a split of income — add your income to see the split."
            )
          : say("ما فيه عمليات بهذي الفترة بعد.", "No entries in this period yet.");
        analysisEl.append(note);
        return;
      }

      const needs = byClass.need || 0;
      const wants = byClass.want || 0;
      analysisEl.append(
        analysisRow(say("🧺 ضروريات", "🧺 Needs"), needs, `${pct(needs)} ${say("— الهدف ٥٠٪", "— target 50%")}`)
      );
      analysisEl.append(
        analysisRow(say("✨ كماليات", "✨ Wants"), wants, `${pct(wants)} ${say("— الهدف ٣٠٪", "— target 30%")}`)
      );
      analysisEl.append(
        analysisRow(say("💰 المتبقي (ادخار)", "💰 Left over (savings)"), balanceFils, `${pct(balanceFils)} ${say("— الهدف ٢٠٪", "— target 20%")}`, {
          strong: true,
          color: balanceFils < 0 ? "calc-negative" : "calc-positive",
        })
      );
      if (unclassifiedFils > 0) {
        analysisEl.append(
          analysisRow(say("❔ غير مصنّف", "❔ Unclassified"), unclassifiedFils, say("صنّفها عشان تضبط النسب", "classify these to fix the split"))
        );
      }
      return;
    }

    if (analysisTitleEl) analysisTitleEl.textContent = say("قائمة الدخل", "Income statement");
    const cogs = byClass.cogs || 0;
    const operating = byClass.operating || 0;
    const grossFils = incomeFils - cogs;
    const margin = (fils) => (incomeFils > 0 ? `${Math.round((fils / incomeFils) * 100)}%` : "—");
    analysisEl.append(analysisRow(say("الإيرادات", "Revenue"), incomeFils, ""));
    analysisEl.append(analysisRow(say("− التكاليف المباشرة", "− Direct costs"), cogs, ""));
    analysisEl.append(
      analysisRow(say("= مجمل الربح", "= Gross profit"), grossFils, `${say("هامش", "margin")} ${margin(grossFils)}`, {
        strong: true,
        color: grossFils < 0 ? "calc-negative" : "calc-positive",
      })
    );
    analysisEl.append(analysisRow(say("− المصروفات التشغيلية", "− Operating expenses"), operating, ""));
    if (unclassifiedFils > 0) {
      analysisEl.append(analysisRow(say("− غير مصنّف", "− Unclassified"), unclassifiedFils, say("صنّفها عشان يضبط التحليل", "classify these for an accurate split")));
    }
    analysisEl.append(
      analysisRow(say("= صافي الربح", "= Net profit"), balanceFils, `${say("هامش", "margin")} ${margin(balanceFils)}`, {
        strong: true,
        color: balanceFils < 0 ? "calc-negative" : "calc-positive",
      })
    );
  }

  function render() {
    renderCategoryGrid();
    renderClassChips();
    const filtered = currentFilterEntries()
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

    let incomeFils = 0;
    let expenseFils = 0;
    const byCategoryFils = new Map();
    filtered.forEach((e) => {
      const fils = toFils(e.amount);
      if (e.type === "income") {
        incomeFils += fils;
      } else {
        expenseFils += fils;
        const key = e.category || say("بلا فئة", "Uncategorized");
        byCategoryFils.set(key, (byCategoryFils.get(key) || 0) + fils);
      }
    });
    const balanceFils = incomeFils - expenseFils;

    if (summaryIncome) summaryIncome.innerHTML = moneyHtml(fromFils(incomeFils));
    if (summaryExpense) summaryExpense.innerHTML = moneyHtml(fromFils(expenseFils));
    if (summaryBalance) {
      summaryBalance.innerHTML = moneyHtml(fromFils(balanceFils), balanceFils < 0 ? "calc-negative" : "calc-positive");
    }

    /* الرصيد الحالي = رصيد البداية + كل دخل − كل مصروف، على كل العمليات لا
       على الشهر المعروض. هذا جواب سؤال "كم باقي عندي فعلاً"، وهو غير صافي
       الشهر تماماً — خلطهما أشهر غلط بأدوات المصروفات */
    let allTimeFils = toFils(settings.opening);
    entries.forEach((e) => {
      allTimeFils += e.type === "income" ? toFils(e.amount) : -toFils(e.amount);
    });
    if (currentBalanceEl) {
      currentBalanceEl.innerHTML = moneyHtml(fromFils(allTimeFils), allTimeFils < 0 ? "calc-negative" : "calc-positive");
    }

    // نسبة الادخار = ما لم يُصرف من دخل الفترة ÷ دخل الفترة
    if (savingsRateEl) {
      savingsRateEl.textContent = incomeFils > 0 ? `${Math.round((balanceFils / incomeFils) * 100)}%` : "—";
      savingsRateEl.className = `calc-summary-value ${balanceFils < 0 ? "calc-negative" : "calc-positive"}`;
    }

    renderAnalysis(filtered, incomeFils, expenseFils, balanceFils);

    if (breakdown) {
      breakdown.innerHTML = "";
      const rows = [...byCategoryFils.entries()].sort((a, b) => b[1] - a[1]);
      if (!rows.length) {
        const p = document.createElement("p");
        p.className = "calc-empty-note";
        p.textContent = say("ما فيه مصروفات بهذي الفترة", "No expenses in this period");
        breakdown.append(p);
      } else {
        const max = rows[0][1];
        rows.forEach(([cat, fils]) => {
          const row = document.createElement("div");
          row.className = "calc-cat-row";
          const nameEl = document.createElement("span");
          nameEl.className = "calc-cat-name";
          nameEl.textContent = cat;
          const barWrap = document.createElement("span");
          barWrap.className = "calc-cat-bar";
          const bar = document.createElement("span");
          bar.style.width = `${Math.round((fils / max) * 100)}%`;
          barWrap.append(bar);
          const amountEl = document.createElement("span");
          amountEl.className = "calc-cat-amount";
          amountEl.innerHTML = moneyHtml(fromFils(fils));
          row.append(nameEl, barWrap, amountEl);
          breakdown.append(row);
        });
      }
    }

    list.innerHTML = "";
    if (emptyNote) emptyNote.hidden = filtered.length > 0;
    filtered.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "calc-entry";

      const info = document.createElement("div");
      info.className = "calc-entry-info";
      const catEl = document.createElement("div");
      catEl.className = "calc-entry-category";
      // 🔁 على الأصل وعلى نسخه المولَّدة معاً، فيعرف المستخدم مصدر العملية
      const repeatMark = entry.repeat === "monthly" || entry.from ? "🔁 " : "";
      catEl.textContent = repeatMark + (entry.category || say("بلا فئة", "Uncategorized"));
      const metaEl = document.createElement("div");
      metaEl.className = "calc-entry-meta";
      const dateSpan = document.createElement("span");
      dateSpan.setAttribute("dir", "ltr");
      dateSpan.textContent = entry.date;
      metaEl.append(dateSpan);
      if (entry.note) {
        metaEl.append(document.createTextNode(" · "));
        const noteSpan = document.createElement("span");
        noteSpan.textContent = entry.note;
        metaEl.append(noteSpan);
      }
      info.append(catEl, metaEl);

      const amountEl = document.createElement("div");
      amountEl.className = "calc-entry-amount";
      amountEl.innerHTML = moneyHtml(
        entry.type === "income" ? entry.amount : -entry.amount,
        entry.type === "income" ? "calc-positive" : "calc-negative"
      );

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "calc-entry-delete";
      delBtn.setAttribute("aria-label", say("احذف", "Delete"));
      delBtn.textContent = "🗑️";
      delBtn.addEventListener("click", () => removeEntry(entry.id));

      row.append(info, amountEl, delBtn);
      list.append(row);
    });

    if (saveFailed) {
      showToast(say("تعذّر الحفظ — المساحة ممتلئة أو المتصفح بوضع خاص", "Couldn't save — storage full or private browsing"));
    }
  }

  if (addBtn) {
    addBtn.addEventListener("click", () => {
      const amount = finalAmount();
      if (!(amount > 0)) {
        // بلا حقل نموذج أصلي هنا نسوّي التحقق يدوياً — هزّة بصرية بدل تنبيه يقاطع
        if (amountDisplay) {
          amountDisplay.classList.remove("calc-shake");
          // إعادة تشغيل الأنيميشن تحتاج إعادة تدفّق فعلية، لا مجرد إزالة/إضافة الصنف بنفس اللفة
          void amountDisplay.offsetWidth;
          amountDisplay.classList.add("calc-shake");
        }
        return;
      }
      entries.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        date: dateInput.value || todayStr(),
        type,
        amount,
        category: selectedCategory,
        cls: type === "expense" ? selectedClass : "",
        repeat: repeatInput && repeatInput.checked ? "monthly" : "",
        note: (noteInput.value || "").trim(),
      });
      saveEntries();
      materializeRecurring();
      // النوع والتاريخ والفئة تبقى كما هي: تسجيل متتالي سريع لعمليات مشابهة
      // (فواتير متعددة بنفس التاريخ، عدة مصروفات بنفس الفئة) بلا إعادة اختيار
      resetAmount();
      noteInput.value = "";
      // التكرار خيار لعملية بعينها لا وضع دائم — يُصفَّر كالمبلغ والملاحظة
      if (repeatInput) repeatInput.checked = false;
      render();
    });
  }

  if (monthInput) monthInput.addEventListener("change", render);
  if (allTimeToggle) {
    allTimeToggle.addEventListener("change", () => {
      if (monthInput) monthInput.disabled = allTimeToggle.checked;
      render();
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hakolah-expenses-${todayStr()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  if (importInput) {
    importInput.addEventListener("change", async () => {
      const file = importInput.files[0];
      importInput.value = "";
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (!Array.isArray(data)) throw new Error("bad shape");
        let added = 0;
        const ids = new Set(entries.map((e) => e.id));
        data.forEach((item) => {
          if (!item || !Number.isFinite(item.amount) || (item.type !== "income" && item.type !== "expense")) return;
          // نحتفظ بالـid وبمرجع الأصل: الاستيراد مرتين ما يكرّر، ونسخ التكرار الشهري ما تتولّد من جديد فوقها
          const id = typeof item.id === "string" && item.id.length <= 80 ? item.id : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${added}`;
          if (ids.has(id)) return;
          ids.add(id);
          entries.push({
            id,
            ...(typeof item.from === "string" ? { from: item.from.slice(0, 80) } : {}),
            date: typeof item.date === "string" ? item.date : todayStr(),
            type: item.type,
            amount: item.amount,
            category: String(item.category || "").slice(0, 60),
            cls: ["need", "want", "cogs", "operating"].includes(item.cls) ? item.cls : "",
            repeat: item.repeat === "monthly" ? "monthly" : "",
            note: String(item.note || "").slice(0, 200),
          });
          added++;
        });
        saveEntries();
        materializeRecurring();
        render();
        showToast(say(`تمت إضافة ${added} عملية`, `Added ${added} entries`));
      } catch {
        showToast(say("ملف غير صالح", "Invalid file"));
      }
    });
  }

  render();
}

document.addEventListener("DOMContentLoaded", initExpenseCalculator);
