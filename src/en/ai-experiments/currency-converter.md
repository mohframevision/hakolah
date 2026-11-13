---
pageScript: "fx"
pageCss: "fx"
title: "How Much in Dinars? Currency Converter"
icon: 💱
desc: "Saw a price in yen, dollars or euros? Type it and see what it is in Bahraini dinars right away, or the other way round. It works offline with the last saved rates."
categories:
  - مال
dateAdded: 2026-11-13
langSwitchUrl: "/ai-experiments/currency-converter.html"
aiDisclosure: "A tool built by the site's owner with the help of AI. It runs entirely in your browser."
noThirdParty: true
---

<script type="application/json" id="fx-data">{{ fx | json | safe }}</script>

<div class="fx" data-lang="en">
  <div class="fx-card">
    <label class="fx-label" for="fxAmount" id="fxFromLabel">Amount</label>
    <div class="fx-row">
      <input id="fxAmount" class="fx-amount" inputmode="decimal" autocomplete="off" value="1000" dir="ltr" />
      <select id="fxCurrency" class="calc-input fx-select" aria-label="Currency"></select>
    </div>
    <button type="button" id="fxSwap" class="filter-chip fx-swap">⇄ Reverse</button>
    <div class="fx-out" aria-live="polite">
      <div id="fxResult" class="fx-result" dir="ltr">—</div>
      <div id="fxUnit" class="fx-unit" dir="ltr"></div>
    </div>
  </div>

  <div class="fx-chips" id="fxChips" role="group" aria-label="Common currencies"></div>

  <p class="fx-note">
    Rates from the European Central Bank, dated <bdi id="fxDate" dir="ltr">{{ fx.date }}</bdi>, updated automatically every working day.
    Gulf currencies are pegged to the US dollar at a fixed rate, so they are always exact.
    An exchange shop or card rate will differ a little, usually by a small margin in their favour.
  </p>
</div>
