---
pageScript: "fx"
pageCss: "fx"
title: "كم بالدينار؟ محوّل العملات"
icon: 💱
desc: شفت سعراً بالين أو الدولار أو اليورو؟ اكتبه وشوف كم يساوي بالدينار البحريني فوراً، أو العكس. يعمل بلا إنترنت بآخر أسعار محفوظة.
title_en: "How Much in Dinars? Currency Converter"
desc_en: "Saw a price in yen, dollars or euros? Type it and see what it is in Bahraini dinars right away, or the other way round. It works offline with the last saved rates."
categories:
  - مال
dateAdded: 2026-11-13
langSwitchUrl: "/en/ai-experiments/currency-converter.html"
aiDisclosure: "أداة صنعها صاحب الموقع بمساعدة الذكاء الاصطناعي، وتعمل كاملةً داخل متصفحك."
noThirdParty: true
---

<script type="application/json" id="fx-data">{{ fx | json | safe }}</script>

<div class="fx" data-lang="ar">
  <div class="fx-card">
    <label class="fx-label" for="fxAmount" id="fxFromLabel">المبلغ</label>
    <div class="fx-row">
      <input id="fxAmount" class="fx-amount" inputmode="decimal" autocomplete="off" value="1000" dir="ltr" />
      <select id="fxCurrency" class="calc-input fx-select" aria-label="العملة"></select>
    </div>
    <button type="button" id="fxSwap" class="filter-chip fx-swap">⇄ اعكس الاتجاه</button>
    <div class="fx-out" aria-live="polite">
      <div id="fxResult" class="fx-result" dir="ltr">—</div>
      <div id="fxUnit" class="fx-unit" dir="ltr"></div>
    </div>
  </div>

  <div class="fx-chips" id="fxChips" role="group" aria-label="عملات شائعة"></div>

  <p class="fx-note">
    الأسعار من البنك المركزي الأوروبي بتاريخ <bdi id="fxDate" dir="ltr">{{ fx.date }}</bdi>، وتتحدّث تلقائياً كل يوم عمل.
    العملات الخليجية مربوطة بالدولار بسعر ثابت، فهي دقيقة دائماً.
    سعر الصرّاف أو البطاقة يختلف قليلاً، عادةً بنسبة صغيرة لصالحهم.
  </p>
</div>
