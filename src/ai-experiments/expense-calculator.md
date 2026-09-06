---
title: "التجربة الثالثة: حاسبة المصروفات والدخل"
icon: 🧮
desc: تسجّل دخلك ومصروفاتك بفئات تختارها، وشوف رصيدك وتوزيع مصروفاتك فوراً — بلا سيرفر ولا حساب، كل شي محفوظ بمتصفحك بس.
title_en: "Experiment Three: An Income & Expense Calculator"
desc_en: Log your income and expenses with categories you choose, and see your balance and spending breakdown instantly — no server, no account, everything stays in your browser.
categories:
  - مال
dateAdded: 2026-09-06
langSwitchUrl: "/en/ai-experiments/expense-calculator.html"
wideLayout: true
aiDisclosure: "🧪 تجربة سوّاها صاحب الموقع بمساعدة الذكاء الاصطناعي، بس للاستكشاف والمرح."
noThirdParty: true
---

<details class="calc-intro">
  <summary>ℹ️ وش تسوي هذي الأداة؟</summary>
  <p>حاسبة بسيطة لدخلك ومصروفاتك — فاتورة كهرباء، إيجار، عقار مؤجّر، أي شي تحتاج تتابعه. تدوس رقم على الآلة الحاسبة، تختار فئة بلمسة وحدة، وتضغط إضافة — بلا كيبورد ولا كتابة ولا نافذة تقاطعك.</p>
  <p>وتجاوب على السؤالين اللي يفرقون فعلاً: <strong>كم باقي عندي؟</strong> (رصيد البداية + كل دخلك − كل مصروفاتك) و<strong>وين راحت فلوس هالشهر؟</strong> — وهما سؤالان مختلفان، وخلطهما أشهر غلط بأدوات المصروفات. وفيها نمطان: شخصي يحلّل صرفك بقاعدة ٥٠/٣٠/٢٠ المعروفة، وتجاري يطلّع لك قائمة دخل فيها مجمل الربح وصافيه بهوامشهما.</p>
</details>

<div class="conv-privacy">
  <strong>🔒 بياناتك ما تطلع من متصفحك.</strong>
  ما فيه سيرفر ولا حساب — كل عملية تُحفظ محلياً بمتصفحك بس.
  <br />
  <span class="conv-privacy-proof">ولهذا وجه ثاني: البيانات محفوظة بهذا الجهاز والمتصفح فقط، وما تنتقل لجهاز ثاني تلقائياً. نزّل نسخة احتياطية بين فترة وأخرى من الأسفل لو تبي تنقلها أو تحافظ عليها.</span>
</div>

<div class="calc-balance-card">
  <div class="calc-balance-label">💵 الرصيد الحالي — اللي باقي فعلاً</div>
  <div class="calc-balance-value" id="calcCurrentBalance">—</div>
  <div class="calc-balance-formula">رصيد البداية + كل الدخل − كل المصروفات (مو شهر واحد)</div>
  <div class="calc-balance-settings">
    <div class="calc-field">
      <label class="calc-field-label" for="calcOpeningBalance">رصيد البداية (اللي بحسابك اليوم)</label>
      <input type="number" id="calcOpeningBalance" class="calc-input" step="0.001" placeholder="0.000" />
    </div>
    <div class="calc-field">
      <span class="calc-field-label">نوع الاستخدام</span>
      <div class="instrument-picker">
        <button type="button" class="filter-chip calc-mode active" data-mode="personal">👤 شخصي</button>
        <button type="button" class="filter-chip calc-mode" data-mode="business">🏢 تجاري</button>
      </div>
    </div>
  </div>
</div>

<div class="calc-layout">
<div class="calc-col-entry">
<form class="calc-form" id="calcForm">
  <div class="calc-type-row">
    <div class="instrument-picker">
      <button type="button" class="filter-chip calc-type" data-type="income">💰 دخل</button>
      <button type="button" class="filter-chip calc-type active" data-type="expense">💸 مصروف</button>
    </div>
    <div class="calc-field">
      <label class="calc-field-label" for="calcDate">التاريخ</label>
      <input type="date" id="calcDate" class="calc-input" />
    </div>
  </div>

  <div class="calc-amount-display" id="calcAmountDisplay">
    <div class="calc-amount-pending" id="calcAmountPending"></div>
    <div class="calc-amount-main">
      <span class="calc-amount-value" id="calcAmountValue">0</span>
      <span class="calc-amount-currency">د.ب</span>
      <button type="button" class="calc-backspace" id="calcBackspace" aria-label="احذف رقم">⌫</button>
    </div>
  </div>

  <div class="calc-keypad" id="calcKeypad">
    <button type="button" class="calc-key" data-key="1">1</button>
    <button type="button" class="calc-key" data-key="2">2</button>
    <button type="button" class="calc-key" data-key="3">3</button>
    <button type="button" class="calc-key calc-key-op" data-key="+">+</button>
    <button type="button" class="calc-key" data-key="4">4</button>
    <button type="button" class="calc-key" data-key="5">5</button>
    <button type="button" class="calc-key" data-key="6">6</button>
    <button type="button" class="calc-key calc-key-op" data-key="-">−</button>
    <button type="button" class="calc-key" data-key="7">7</button>
    <button type="button" class="calc-key" data-key="8">8</button>
    <button type="button" class="calc-key" data-key="9">9</button>
    <button type="button" class="calc-key calc-key-op" data-key="×">×</button>
    <button type="button" class="calc-key" data-key=".">.</button>
    <button type="button" class="calc-key" data-key="0">0</button>
    <button type="button" class="calc-key calc-key-op" data-key="=">=</button>
    <button type="button" class="calc-key calc-key-op" data-key="÷">÷</button>
  </div>

  <div class="calc-field">
    <span class="calc-field-label">الفئة</span>
    <div class="calc-cat-grid" id="calcCategoryGrid"></div>
  </div>

  <div class="calc-field">
    <span class="calc-field-label">التصنيف (اختياري — يضبط التحليل تحت)</span>
    <div class="instrument-picker" id="calcClassChips"></div>
  </div>

  <div class="calc-field">
    <label class="calc-check"><input type="checkbox" id="calcRepeat" /> 🔁 يتكرر كل شهر (راتب، إيجار، اشتراك)</label>
  </div>

  <div class="calc-field">
    <label class="calc-field-label" for="calcNote">ملاحظة (اختياري)</label>
    <input type="text" id="calcNote" class="calc-input calc-input-wide" placeholder="مثال: فاتورة شهر أغسطس" />
  </div>
  <button type="button" id="calcAddBtn" class="btn calc-add-btn">➕ إضافة</button>
</form>
</div>
<div class="calc-col-results">

<div class="calc-filter-row">
  <div class="calc-field">
    <label class="calc-field-label" for="calcMonth">الشهر</label>
    <input type="month" id="calcMonth" class="calc-input" />
  </div>
  <label class="calc-alltime"><input type="checkbox" id="calcAllTime" /> كل الأوقات</label>
</div>

<div class="calc-summary">
  <div class="calc-summary-card">
    <div class="calc-summary-label">الدخل</div>
    <div class="calc-summary-value" id="calcSummaryIncome">—</div>
  </div>
  <div class="calc-summary-card">
    <div class="calc-summary-label">المصروفات</div>
    <div class="calc-summary-value" id="calcSummaryExpense">—</div>
  </div>
  <div class="calc-summary-card">
    <div class="calc-summary-label">صافي الشهر</div>
    <div class="calc-summary-value" id="calcSummaryBalance">—</div>
  </div>
  <div class="calc-summary-card">
    <div class="calc-summary-label">نسبة الادخار</div>
    <div class="calc-summary-value" id="calcSavingsRate">—</div>
  </div>
</div>

<h2 id="calcAnalysisTitle">قاعدة ٥٠/٣٠/٢٠</h2>
<div class="calc-analysis" id="calcAnalysis"></div>

<h2>توزيع المصروفات حسب الفئة</h2>
<div class="calc-breakdown" id="calcBreakdown"></div>

<h2>كل العمليات</h2>
<p class="calc-empty-note" id="calcEmpty" hidden>ما فيه أي عملية بهذي الفترة — أضف أول وحدة من الفورم فوق.</p>
<div class="calc-entries" id="calcEntries"></div>

<div class="calc-actions-row">
  <button type="button" id="calcExport" class="btn secondary">📤 تنزيل نسخة احتياطية</button>
  <input type="file" id="calcImport" accept="application/json" hidden />
  <label class="btn secondary" for="calcImport">📥 استيراد نسخة احتياطية</label>
</div>

</div>
</div>
