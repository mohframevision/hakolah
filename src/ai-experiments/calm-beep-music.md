---
title: "تجربة #1: تأليف موسيقى عشوائية بالذكاء الاصطناعي"
icon: 🎵
desc: مولّد يؤلّف مقطوعة هادئة مختلفة كل مرة، بجمل موسيقية متكررة ولحن متماسك، مباشرة بمتصفحك.
title_en: "Experiment #1: AI-Generated Random Music"
desc_en: A generator that composes a different calm piece every time — with repeating musical phrases and a coherent melody, right in your browser.
categories:
  - موسيقى
dateAdded: 2026-09-04
langSwitchUrl: "/en/ai-experiments/calm-beep-music.html"
aiDisclosure: "🧪 تجربة سوّاها صاحب الموقع بمساعدة الذكاء الاصطناعي، بس للاستكشاف والمرح."
---

سؤال بسيط: تقدر خوارزمية عشوائية — ملتزمة بس بقواعد موسيقية بسيطة (سلّم، جمل تتكرر بتنويع، تدرّج بقوة الصوت) — تؤلّف مقطوعة تحس فيها كموسيقى حقيقية؟ المولّد تحت يجرّب الإجابة مباشرة بمتصفحك، ويختلف كل مرة تشغّله. دوس شغّل واحكم بنفسك.

<div class="beep-experiment">
  <div class="instrument-picker" id="instrumentPicker">
    <button type="button" class="filter-chip instrument-btn active" data-instrument="piano">🎹 بيانو</button>
    <button type="button" class="filter-chip instrument-btn" data-instrument="guitar">🎸 قيثارة</button>
    <button type="button" class="filter-chip instrument-btn" data-instrument="flute">🪈 فلوت</button>
  </div>
  <button type="button" id="beepMelodyPlay" class="btn" data-play-label="▶️ شغّل الموسيقى" data-stop-label="⏹ إيقاف">▶️ شغّل الموسيقى</button>
  <div class="beep-keys" id="beepKeys" aria-hidden="true">
    <div class="beep-white" data-pitch-class="0"></div>
    <div class="beep-white" data-pitch-class="2"></div>
    <div class="beep-white" data-pitch-class="4"></div>
    <div class="beep-white" data-pitch-class="5"></div>
    <div class="beep-white" data-pitch-class="7"></div>
    <div class="beep-white" data-pitch-class="9"></div>
    <div class="beep-white" data-pitch-class="11"></div>
    <div class="beep-black" data-pitch-class="1" style="left: 24px"></div>
    <div class="beep-black" data-pitch-class="3" style="left: 58px"></div>
    <div class="beep-black" data-pitch-class="6" style="left: 126px"></div>
    <div class="beep-black" data-pitch-class="8" style="left: 160px"></div>
    <div class="beep-black" data-pitch-class="10" style="left: 194px"></div>
  </div>
  <p class="beep-experiment-hint">🎧 يُفضَّل سماعات — وكل تشغيلة لحن مختلف تماماً، جرّب أكثر من مرة</p>
</div>
