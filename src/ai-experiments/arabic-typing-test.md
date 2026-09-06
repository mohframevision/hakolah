---
title: "التجربة الرابعة: اختبار سرعة الكتابة بالعربية"
icon: ⌨️
desc: "تحدٍّ حقيقي لسرعتك ودقتك — جمل بفصحى أدبية فيها همزات وتاء مربوطة وألف مقصورة، لا لغة مبسّطة. العدّاد يبدأ مع أول حرف، والنتيجة تُحفظ بجهازك."
title_en: "Experiment Four: Arabic Typing Speed Test"
desc_en: "A real challenge to your speed and accuracy — sentences in literary Arabic, rich in hamzas and hard letter forms, not simplified language. The timer starts with your first keystroke."
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
  <p>أغلب اختبارات سرعة الكتابة إنجليزية، والعربية فيها ما يختلف: الحروف تتصل ببعضها، والهمزات والتاء المربوطة والألف المقصورة تفرق، ولوحة المفاتيح العربية لها إيقاع مختلف.</p>
  <p>والجمل هنا بفصحى أدبية مقصودة — لا لغة مبسّطة ولا عامية. هذا تحدٍّ لا تمرين ابتدائي: تكثر فيه الهمزات بأشكالها (أ إ آ ؤ ئ ء) وهي أكثر ما يخطئ فيه الكاتب السريع. العدّاد يبدأ مع أول حرف تضغطه لا قبله، والحروف تتلوّن وأنت تكتب: أخضر للصحيح وأحمر للخطأ.</p>
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
