---
title: "تجربة #1: تأليف موسيقى عشوائية بالذكاء الاصطناعي"
icon: 🎵
desc: مولّد يؤلّف مقطوعة مختلفة كل مرة — اختار الآلة والمزاج (هادئ، حيوي، سعيد، حالم)، بجمل موسيقية متكررة ولحن متماسك، مباشرة بمتصفحك.
title_en: "Experiment #1: AI-Generated Random Music"
desc_en: A generator that composes a different piece every time — pick the instrument and mood (calm, energetic, happy, dreamy), with repeating musical phrases and a coherent melody, right in your browser.
categories:
  - موسيقى
dateAdded: 2026-09-04
langSwitchUrl: "/en/ai-experiments/calm-beep-music.html"
aiDisclosure: "🧪 تجربة سوّاها صاحب الموقع بمساعدة الذكاء الاصطناعي، بس للاستكشاف والمرح."
---

سؤال بسيط: تقدر خوارزمية عشوائية تؤلّف مقطوعة تحس فيها كموسيقى حقيقية؟ المولّد تحت يبني كل مرة قطعة جديدة من ٨ مازورات على نبضة ثابتة، فوق تتابع كوردات، بلحن يرجع ويتكرر عشان تمسكه، وينتهي بحل على نغمة الاستقرار — مع باص ومرافقة تحته. دوس شغّل واحكم بنفسك.

<div class="beep-experiment">
  <div class="instrument-picker" id="instrumentPicker">
    <button type="button" class="filter-chip instrument-btn active" data-instrument="piano">🎹 بيانو</button>
    <button type="button" class="filter-chip instrument-btn" data-instrument="guitar">🎸 قيثارة</button>
    <button type="button" class="filter-chip instrument-btn" data-instrument="flute">🪈 فلوت</button>
    <button type="button" class="filter-chip instrument-btn" data-instrument="violin">🎻 كمان</button>
    <button type="button" class="filter-chip instrument-btn" data-instrument="trumpet">🎺 ترمبيت</button>
    <button type="button" class="filter-chip instrument-btn" data-instrument="sax">🎷 ساكسفون</button>
    <button type="button" class="filter-chip instrument-btn" data-instrument="banjo">🪕 بانجو</button>
    <button type="button" class="filter-chip instrument-btn" data-instrument="bell">🔔 جرس</button>
    <button type="button" class="filter-chip instrument-btn" data-instrument="accordion">🪗 أكورديون</button>
    <button type="button" class="filter-chip instrument-btn" data-instrument="musicbox">🎐 صندوق موسيقى</button>
  </div>
  <div class="instrument-picker" id="moodPicker">
    <button type="button" class="filter-chip mood-btn active" data-mood="calm">😌 هادئ</button>
    <button type="button" class="filter-chip mood-btn" data-mood="energetic">⚡ حيوي</button>
    <button type="button" class="filter-chip mood-btn" data-mood="happy">😊 سعيد</button>
    <button type="button" class="filter-chip mood-btn" data-mood="dreamy">🌙 حالم</button>
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
