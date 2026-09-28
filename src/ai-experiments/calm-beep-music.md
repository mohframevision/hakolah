---
title: "التجربة الأولى: تأليف موسيقى عشوائية بالذكاء الاصطناعي"
icon: 🎵
desc: مولّد يؤلّف مقطوعة مختلفة كل مرة — اختار الآلة والطابع (هادئ، رصين، سعيد، حالم)، بجمل موسيقية متكررة ولحن متماسك، مباشرة بمتصفحك.
title_en: "Experiment #1: AI-Generated Random Music"
desc_en: A generator that composes a different piece every time — pick the instrument and character (calm, stately, happy, dreamy), with repeating musical phrases and a coherent melody, right in your browser.
categories:
  - موسيقى
dateAdded: 2026-09-04
langSwitchUrl: "/en/ai-experiments/calm-beep-music.html"
aiDisclosure: "🧪 تجربة سوّاها صاحب الموقع بمساعدة الذكاء الاصطناعي، بس للاستكشاف والمرح."
---

سؤال بسيط: تقدر خوارزمية عشوائية تؤلّف مقطوعة تحس فيها كموسيقى حقيقية؟ المولّد تحت يبني كل مرة قطعة جديدة من ٨ مازورات على نبضة ثابتة، فوق تتابع كوردات، بلحن يرجع ويتكرر عشان تمسكه، وينتهي بحل على نغمة الاستقرار — مع باص ومرافقة تحته. دوس شغّل واحكم بنفسك.

<div class="beep-experiment">
  <div class="beep-stage">
    <div class="beep-controls">
      <button type="button" id="beepMelodyPlay" class="btn" data-play-label="▶️ شغّل الموسيقى" data-stop-label="⏹ إيقاف">▶️ شغّل الموسيقى</button>
      <button type="button" id="beepMelodyPrev" class="btn secondary">⏮️ السابقة</button>
      <button type="button" id="beepMelodyNext" class="btn secondary">⏭️ مقطوعة جديدة</button>
    </div>
    <label class="beep-volume"><span aria-hidden="true">🔈</span><input type="range" id="beepVolume" min="0" max="1" step="0.05" value="0.8" aria-label="مستوى صوت الموسيقى" /><span aria-hidden="true">🔊</span></label>
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
    <div class="beep-keys-scroll" id="beepKeysFullWrap" hidden>
      <div class="beep-keys beep-keys-full" id="beepKeysFull" aria-hidden="true"></div>
    </div>
    <div class="instrument-picker">
    <button type="button" class="filter-chip keyboard-toggle" id="keyboardToggle" data-label-full="🎹 لوحة كاملة" data-label-mini="🎹 لوحة مبسطة">🎹 لوحة كاملة</button>
    <button type="button" class="filter-chip" id="noteNameToggle" data-default="solfege" data-label-letters="🔤 C D E" data-label-solfege="🎼 Do Re Mi">🔤 C D E</button>
    </div>
    <div class="beep-staff-wrap" id="beepStaffWrap" hidden>
      <p class="beep-params-title">🎼 النوتة وهي تنعزف</p>
      <div class="beep-staff-scroll" id="beepStaff"></div>
      <p class="beep-chord" id="beepChord" data-label="الكورد الآن" data-major="كبير" data-minor="صغير" data-dim="ناقص"></p>
    </div>
    <details class="beep-more">
      <summary>📖 شرح النوتة والكورد</summary>
      <p class="beep-param-note">💰 مدة النوتة مثل الفلوس: المستديرة (مفرّغة بلا عصا) = ٤ دنانير · البيضاء (مفرّغة بعصا) = ٢ · السوداء = دينار · المشطورة = ٥٠٠ فلس · نصف المشطورة = ٢٥٠ فلس. والنقطة جنب النوتة تزيدها نصف قيمتها (البيضاء بنقطة = ٣ دنانير).</p>
      <p class="beep-param-note">🎹 الكورد الكبير والصغير: الفرق بالنغمة الوسطى بس — بالكبير تبعد ٤ أنصاف درجات عن الأساس، وبالصغير ٣. هذا الفرق الصغير هو اللي يخلي الكبير يحس مضيء والصغير يحس حزين.</p>
    </details>
  </div>
  <details class="beep-panel">
    <summary>🎛️ الآلة والطابع <span class="beep-panel-now" id="beepSoundNow"></span></summary>
    <div class="instrument-picker" id="instrumentPicker">
      <button type="button" class="filter-chip instrument-btn active" data-instrument="piano">🎹 بيانو</button>
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
      <button type="button" class="filter-chip mood-btn" data-mood="stately">🕊️ رصين</button>
      <button type="button" class="filter-chip mood-btn" data-mood="happy">😊 سعيد</button>
      <button type="button" class="filter-chip mood-btn" data-mood="dreamy">🌙 حالم</button>
      <button type="button" class="filter-chip mood-btn" data-mood="cinematic">🎬 سينمائي</button>
    </div>
  </details>
  <details class="beep-panel">
    <summary>🎚️ أبعاد الصوت الأربعة</summary>
    <div class="beep-params" id="beepParams">
      <div class="beep-param"><span>التردد (حدّة النغمة)</span><div class="instrument-picker">
        <button type="button" class="filter-chip param-btn" data-param="octave" data-value="-1">⬇️ أوطى</button>
        <button type="button" class="filter-chip param-btn active" data-param="octave" data-value="0">عادي</button>
        <button type="button" class="filter-chip param-btn" data-param="octave" data-value="1">⬆️ أعلى</button>
      </div></div>
      <div class="beep-param"><span>الإيقاع (السرعة)</span><div class="instrument-picker">
        <button type="button" class="filter-chip param-btn" data-param="tempo" data-value="0.75">🐢 أبطأ</button>
        <button type="button" class="filter-chip param-btn active" data-param="tempo" data-value="1">عادي</button>
        <button type="button" class="filter-chip param-btn" data-param="tempo" data-value="1.25">أسرع</button>
      </div></div>
      <div class="beep-param"><span>الديناميكية (القوة)</span><div class="instrument-picker">
        <button type="button" class="filter-chip param-btn" data-param="dynamics" data-value="0.4">p هادئ</button>
        <button type="button" class="filter-chip param-btn active" data-param="dynamics" data-value="1">mf متوسط</button>
        <button type="button" class="filter-chip param-btn" data-param="dynamics" data-value="1.6">f قوي</button>
      </div></div>
      <p class="beep-param-note">🎨 الطابع الصوتي (لون الصوت): هو الآلة — غيّرها من الأزرار فوق وبتسمع نفس اللحن بلون ثاني.</p>
    </div>
  </details>
  <details class="beep-panel">
    <summary>⬇️ تحميل ومشاركة</summary>
    <div class="instrument-picker">
      <button type="button" class="filter-chip" id="beepShareSeed" data-copied="نُسخ رابط هذي المقطوعة">🔗 انسخ رابط المقطوعة</button>
      <button type="button" class="filter-chip" id="beepDownloadWav" data-working="⏳ يجهّز الملف...">⬇️ تحميل WAV</button>
      <button type="button" class="filter-chip" id="beepDownloadMp3" data-working="⏳ يجهّز الملف..." data-failed="تعذّر تجهيز ملف MP3">⬇️ تحميل MP3</button>
      <button type="button" class="filter-chip" id="beepDownloadVideo" data-working="⏳ يسجّل الفيديو" data-failed="متصفحك ما يدعم تسجيل الفيديو">🎬 تحميل فيديو</button>
      <button type="button" class="filter-chip" id="beepDownloadMidi">🎼 تحميل MIDI</button>
    </div>
    <div class="beep-seed-row">
      <label class="beep-seed-label" for="beepSeedInput">🌱 البذرة</label>
      <input type="text" inputmode="numeric" id="beepSeedInput" class="beep-seed-input" placeholder="اكتب رقم بذرة" data-invalid="اكتب رقماً صحيحاً للبذرة" />
      <button type="button" class="filter-chip" id="beepSeedPlay">▶️ شغّل هذه البذرة</button>
    </div>
  </details>
  <div class="beep-analysis" id="beepAnalysis"
    data-label-key="المفتاح"
    data-label-major="كبير (Major)"
    data-label-minor="صغير (Minor)"
    data-label-progression="تتابع الكوردات"
    data-label-form="الشكل"
    data-label-form-value="فترة من ٨ مازورات: سؤال (١-٤) + جواب (٥-٨)"
    data-label-tempo="السرعة"
    data-label-meter="الميزان"
    data-label-cadence="الختام"
    data-label-cadence-authentic="ختام تام"
    data-label-cadence-plagal="ختام كنسي"
    data-label-seed="البذرة"></div>
  <p class="beep-experiment-hint">🎧 يُفضَّل سماعات — وكل تشغيلة لحن مختلف تماماً، جرّب أكثر من مرة</p>
  <div class="beep-quiz" id="beepQuiz" data-right="✅ صح! اللي تغيّر: " data-wrong="❌ لا — اللي تغيّر: " data-names="التردد|الإيقاع|الطابع الصوتي|الديناميكية">
    <p class="beep-params-title">👂 تدريب الأذن: وش اللي تغيّر؟</p>
    <p class="beep-param-note">بتسمع نفس المقطع مرتين، وبالمرة الثانية يتغيّر بُعد واحد بس. خمّن أي واحد.</p>
    <button type="button" class="btn secondary" id="beepQuizPlay">▶️ اسمع المقطعين</button>
    <div class="instrument-picker">
      <button type="button" class="filter-chip quiz-btn" data-answer="pitch" disabled>التردد</button>
      <button type="button" class="filter-chip quiz-btn" data-answer="rhythm" disabled>الإيقاع</button>
      <button type="button" class="filter-chip quiz-btn" data-answer="timbre" disabled>الطابع الصوتي</button>
      <button type="button" class="filter-chip quiz-btn" data-answer="dynamics" disabled>الديناميكية</button>
    </div>
    <p class="beep-quiz-result" id="beepQuizResult" aria-live="polite"></p>
  </div>
  <p class="beep-experiment-hint">📚 أدوات التعلّم هنا (أبعاد الصوت، النوتة، تدريب الأذن، الطابع السينمائي) مستوحاة من مادة إنتاج موسيقي أدرسها بالجامعة.</p>
</div>
