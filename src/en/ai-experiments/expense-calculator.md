---
title: "Experiment Three: An Income & Expense Calculator"
icon: 🧮
desc: Log your income and expenses with categories you choose, and see your balance and spending breakdown instantly — no server, no account, everything stays in your browser.
categories:
  - مال
dateAdded: 2026-09-06
langSwitchUrl: "/ai-experiments/expense-calculator.html"
aiDisclosure: "🧪 An experiment built by the site's owner with the help of AI, just for exploration and fun."
noThirdParty: true
---

A simple calculator for your income and expenses — an electricity bill, rent, a rental property, anything you need to track. Type the amount and a category, hit Add, and that's it: your balance and spending breakdown update instantly, with no extra step and no dialog interrupting you.

<div class="conv-privacy">
  <strong>🔒 Your data never leaves your browser.</strong>
  There's no server and no account — every entry is saved locally in your browser only.
  <br />
  <span class="conv-privacy-proof">That cuts both ways: the data lives on this device and browser only, and doesn't move to another device on its own. Download a backup now and then from the bottom of the page if you want to move it or keep it safe.</span>
</div>

<form class="calc-form" id="calcForm">
  <div class="calc-field">
    <span class="calc-field-label">Type</span>
    <div class="instrument-picker">
      <button type="button" class="filter-chip calc-type" data-type="income">💰 Income</button>
      <button type="button" class="filter-chip calc-type active" data-type="expense">💸 Expense</button>
    </div>
  </div>

  <div class="calc-field">
    <label class="calc-field-label" for="calcAmount">Amount (BHD)</label>
    <input type="number" id="calcAmount" class="calc-input" min="0.001" step="0.001" placeholder="0.000" required />
  </div>

  <div class="calc-field calc-field-grow">
    <label class="calc-field-label" for="calcCategory">Category</label>
    <input type="text" id="calcCategory" class="calc-input calc-input-wide" list="calcCategoryList" placeholder="e.g. Electricity & Water" />
    <datalist id="calcCategoryList"></datalist>
  </div>

  <div class="calc-field calc-field-grow">
    <label class="calc-field-label" for="calcNote">Note (optional)</label>
    <input type="text" id="calcNote" class="calc-input calc-input-wide" placeholder="e.g. August's bill" />
  </div>

  <div class="calc-field">
    <label class="calc-field-label" for="calcDate">Date</label>
    <input type="date" id="calcDate" class="calc-input" />
  </div>

  <button type="submit" class="btn">➕ Add</button>
</form>

<div class="calc-filter-row">
  <div class="calc-field">
    <label class="calc-field-label" for="calcMonth">Month</label>
    <input type="month" id="calcMonth" class="calc-input" />
  </div>
  <label class="calc-alltime"><input type="checkbox" id="calcAllTime" /> All time</label>
</div>

<div class="calc-summary">
  <div class="calc-summary-card">
    <div class="calc-summary-label">Income</div>
    <div class="calc-summary-value" id="calcSummaryIncome">—</div>
  </div>
  <div class="calc-summary-card">
    <div class="calc-summary-label">Expenses</div>
    <div class="calc-summary-value" id="calcSummaryExpense">—</div>
  </div>
  <div class="calc-summary-card">
    <div class="calc-summary-label">Balance</div>
    <div class="calc-summary-value" id="calcSummaryBalance">—</div>
  </div>
</div>

<h2>Spending by category</h2>
<div class="calc-breakdown" id="calcBreakdown"></div>

<h2>All entries</h2>
<p class="calc-empty-note" id="calcEmpty" hidden>No entries in this period yet — add your first one from the form above.</p>
<div class="calc-entries" id="calcEntries"></div>

<div class="calc-actions-row">
  <button type="button" id="calcExport" class="btn secondary">📤 Download a backup</button>
  <input type="file" id="calcImport" accept="application/json" hidden />
  <label class="btn secondary" for="calcImport">📥 Import a backup</label>
</div>
