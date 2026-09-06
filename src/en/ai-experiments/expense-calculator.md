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

A simple calculator for your income and expenses — an electricity bill, rent, a rental property, anything you need to track. Tap numbers on the built-in calculator, pick a category with one tap, and hit Add — no keyboard, no typing, no dialog interrupting you.

It answers the two questions that actually matter: **how much do I have left?** (opening balance + all your income − all your expenses) and **where did this month's money go?** — two different questions, and conflating them is the most common mistake in expense tools. It has two modes: personal, which analyses your spending against the well-known 50/30/20 rule, and business, which lays out an income statement with gross and net profit and their margins.

<div class="conv-privacy">
  <strong>🔒 Your data never leaves your browser.</strong>
  There's no server and no account — every entry is saved locally in your browser only.
  <br />
  <span class="conv-privacy-proof">That cuts both ways: the data lives on this device and browser only, and doesn't move to another device on its own. Download a backup now and then from the bottom of the page if you want to move it or keep it safe.</span>
</div>

<div class="calc-balance-card">
  <div class="calc-balance-label">💵 Current balance — what's actually left</div>
  <div class="calc-balance-value" id="calcCurrentBalance">—</div>
  <div class="calc-balance-formula">Opening balance + all income − all expenses (not just one month)</div>
  <div class="calc-balance-settings">
    <div class="calc-field">
      <label class="calc-field-label" for="calcOpeningBalance">Opening balance (what's in your account today)</label>
      <input type="number" id="calcOpeningBalance" class="calc-input" step="0.001" placeholder="0.000" />
    </div>
    <div class="calc-field">
      <span class="calc-field-label">Mode</span>
      <div class="instrument-picker">
        <button type="button" class="filter-chip calc-mode active" data-mode="personal">👤 Personal</button>
        <button type="button" class="filter-chip calc-mode" data-mode="business">🏢 Business</button>
      </div>
    </div>
  </div>
</div>

<form class="calc-form" id="calcForm">
  <div class="calc-type-row">
    <div class="instrument-picker">
      <button type="button" class="filter-chip calc-type" data-type="income">💰 Income</button>
      <button type="button" class="filter-chip calc-type active" data-type="expense">💸 Expense</button>
    </div>
    <div class="calc-field">
      <label class="calc-field-label" for="calcDate">Date</label>
      <input type="date" id="calcDate" class="calc-input" />
    </div>
  </div>

  <div class="calc-amount-display" id="calcAmountDisplay">
    <div class="calc-amount-pending" id="calcAmountPending"></div>
    <div class="calc-amount-main">
      <span class="calc-amount-value" id="calcAmountValue">0</span>
      <span class="calc-amount-currency">BHD</span>
      <button type="button" class="calc-backspace" id="calcBackspace" aria-label="Delete digit">⌫</button>
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
    <span class="calc-field-label">Category</span>
    <div class="calc-cat-grid" id="calcCategoryGrid"></div>
  </div>

  <div class="calc-field">
    <span class="calc-field-label">Classification (optional — drives the analysis below)</span>
    <div class="instrument-picker" id="calcClassChips"></div>
  </div>

  <div class="calc-field">
    <label class="calc-field-label" for="calcNote">Note (optional)</label>
    <input type="text" id="calcNote" class="calc-input calc-input-wide" placeholder="e.g. August's bill" />
  </div>
  <button type="button" id="calcAddBtn" class="btn calc-add-btn">➕ Add</button>
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
    <div class="calc-summary-label">Net for the month</div>
    <div class="calc-summary-value" id="calcSummaryBalance">—</div>
  </div>
  <div class="calc-summary-card">
    <div class="calc-summary-label">Savings rate</div>
    <div class="calc-summary-value" id="calcSavingsRate">—</div>
  </div>
</div>

<h2 id="calcAnalysisTitle">The 50/30/20 rule</h2>
<div class="calc-analysis" id="calcAnalysis"></div>

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
