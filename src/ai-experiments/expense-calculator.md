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
aiDisclosure: "🧪 تجربة سوّاها صاحب الموقع بمساعدة الذكاء الاصطناعي، بس للاستكشاف والمرح."
noThirdParty: true
---

حاسبة بسيطة لدخلك ومصروفاتك — فاتورة كهرباء، إيجار، عقار مؤجّر، أي شي تحتاج تتابعه. تكتب المبلغ والفئة وتضغط إضافة، وخلاص: الرصيد وتوزيع المصروفات يتحدّثون فوراً بلا أي خطوة زايدة ولا نافذة تقاطعك.

<div class="conv-privacy">
  <strong>🔒 بياناتك ما تطلع من متصفحك.</strong>
  ما فيه سيرفر ولا حساب — كل عملية تُحفظ محلياً بمتصفحك بس.
  <br />
  <span class="conv-privacy-proof">ولهذا وجه ثاني: البيانات محفوظة بهذا الجهاز والمتصفح فقط، وما تنتقل لجهاز ثاني تلقائياً. نزّل نسخة احتياطية بين فترة وأخرى من الأسفل لو تبي تنقلها أو تحافظ عليها.</span>
</div>

<form class="calc-form" id="calcForm">
  <div class="calc-field">
    <span class="calc-field-label">النوع</span>
    <div class="instrument-picker">
      <button type="button" class="filter-chip calc-type" data-type="income">💰 دخل</button>
      <button type="button" class="filter-chip calc-type active" data-type="expense">💸 مصروف</button>
    </div>
  </div>

  <div class="calc-field">
    <label class="calc-field-label" for="calcAmount">المبلغ (د.ب)</label>
    <input type="number" id="calcAmount" class="calc-input" min="0.001" step="0.001" placeholder="0.000" required />
  </div>

  <div class="calc-field calc-field-grow">
    <label class="calc-field-label" for="calcCategory">الفئة</label>
    <input type="text" id="calcCategory" class="calc-input calc-input-wide" list="calcCategoryList" placeholder="مثال: كهرباء وماء" />
    <datalist id="calcCategoryList"></datalist>
  </div>

  <div class="calc-field calc-field-grow">
    <label class="calc-field-label" for="calcNote">ملاحظة (اختياري)</label>
    <input type="text" id="calcNote" class="calc-input calc-input-wide" placeholder="مثال: فاتورة شهر أغسطس" />
  </div>

  <div class="calc-field">
    <label class="calc-field-label" for="calcDate">التاريخ</label>
    <input type="date" id="calcDate" class="calc-input" />
  </div>

  <button type="submit" class="btn">➕ إضافة</button>
</form>

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
    <div class="calc-summary-label">الرصيد</div>
    <div class="calc-summary-value" id="calcSummaryBalance">—</div>
  </div>
</div>

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
