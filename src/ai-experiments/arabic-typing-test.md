---
title: "التجربة الرابعة: اختبار سرعة الكتابة بالعربية"
icon: ⌨️
desc: قِس سرعتك ودقتك في الكتابة بالعربية على جملة حقيقية — العدّاد يبدأ مع أول حرف، والنتيجة تُحفظ بجهازك لتنافس نفسك.
title_en: "Experiment Four: Arabic Typing Speed Test"
desc_en: Measure your Arabic typing speed and accuracy on a real sentence — the timer starts with your first keystroke, and your best score is saved on your device.
categories:
  - نص
dateAdded: 2026-09-06
langSwitchUrl: "/en/ai-experiments/arabic-typing-test.html"
wideLayout: true
aiDisclosure: "🧪 تجربة سوّاها صاحب الموقع بمساعدة الذكاء الاصطناعي، بس للاستكشاف والمرح."
noThirdParty: true
---

<details class="calc-intro">
  <summary>ℹ️ وش تسوي هذي التجربة؟</summary>
  <p>أغلب اختبارات سرعة الكتابة إنجليزية، والعربية فيها ما يختلف: الحروف تتصل ببعضها، والهمزات والتاء المربوطة تفرق، ولوحة المفاتيح العربية لها إيقاع مختلف. هنا تكتب جملة عربية حقيقية، والعدّاد يبدأ مع أول حرف تضغطه لا قبله، والحروف تتلوّن وأنت تكتب: أخضر للصحيح وأحمر للخطأ.</p>
  <p>النتيجة تُحفظ بمتصفحك وحده — بلا حساب ولا سيرفر — فتنافس نفسك لا غيرك.</p>
</details>

<div class="type-stats">
  <div class="type-stat">
    <div class="type-stat-label">السرعة</div>
    <div class="type-stat-value" id="typeSpeed">—</div>
    <div class="type-stat-unit">كلمة/دقيقة</div>
  </div>
  <div class="type-stat">
    <div class="type-stat-label">الدقة</div>
    <div class="type-stat-value" id="typeAccuracy">—</div>
    <div class="type-stat-unit">بالمئة</div>
  </div>
  <div class="type-stat">
    <div class="type-stat-label">الوقت</div>
    <div class="type-stat-value" id="typeTime">0</div>
    <div class="type-stat-unit">ثانية</div>
  </div>
  <div class="type-stat">
    <div class="type-stat-label">أفضل نتيجة</div>
    <div class="type-stat-value" id="typeBest">—</div>
    <div class="type-stat-unit">كلمة/دقيقة</div>
  </div>
</div>

<div class="type-prompt" id="typePrompt" aria-live="polite"></div>

<textarea
  id="typeInput"
  class="type-input"
  rows="3"
  placeholder="اكتب الجملة هنا… العدّاد يبدأ مع أول حرف"
  autocomplete="off"
  autocorrect="off"
  spellcheck="false"
></textarea>

<div class="type-actions">
  <button type="button" id="typeRestart" class="btn secondary">🔄 جملة جديدة</button>
  <span class="type-hint" id="typeHint">اضغط أي حرف لتبدأ</span>
</div>
