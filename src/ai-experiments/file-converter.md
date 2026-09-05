---
title: "التجربة الثانية: محوّل الملفات بدون سيرفر"
icon: 🔄
desc: حوّل الصور والصوت والفيديو — اضغط صورة، طلّع صوت مقطع فيديو، صغّر حجم فيديو. كل شي يصير داخل متصفحك، وملفك ما يغادر جهازك ولا يُرفع لأي مكان.
title_en: "Experiment Two: A Serverless File Converter"
desc_en: Convert images, audio and video — compress a photo, pull the audio out of a clip, shrink a video. Everything happens inside your browser, and your file never leaves your device.
categories:
  - صورة
  - صوت
  - فيديو
dateAdded: 2026-09-05
langSwitchUrl: "/en/ai-experiments/file-converter.html"
aiDisclosure: "🧪 تجربة سوّاها صاحب الموقع بمساعدة الذكاء الاصطناعي، بس للاستكشاف والمرح."
# لا إعلانات ولا تحليلات بهذي الصفحة: وعدها إن الملف ما يغادر الجهاز، وأي
# طلب لطرف ثالث — ولو ما يمسّ الملف — يُضعف الوعد أمام من يفتح أدوات المطوّر
# ليتأكد بنفسه.
noThirdParty: true
---

أغلب المحوّلات على الإنترنت ترفع ملفك لسيرفرها، تحوّله هناك، ثم تعطيك الناتج للتحميل. وأنت ما تدري وين انحفظ الملف، ولا كم يبقى، ولا مين يقدر يوصله. وهذي مو مسألة نظرية: صورة فيها وثيقة، أو تسجيل صوتي خاص، أو فيديو للعائلة — كلها تعدّي على جهاز غريب. المتصفحات اليوم تقدر تسوي التحويل نفسه بلا ما يغادر الملف الجهاز، وهذي التجربة تثبت ذلك.

<div class="conv-privacy">
  <strong>🔒 ملفك ما يغادر جهازك.</strong>
  التحويل كامل يصير داخل متصفحك، وما نرسل الملف لأي مكان.
  <br />
  <span class="conv-privacy-proof">تبي تتأكد بنفسك؟ افصل الإنترنت بعد ما تفتح الصفحة — بتلقاها تشتغل عادي.</span>
</div>

<div class="instrument-picker conv-kinds">
  <button type="button" class="filter-chip conv-kind active" data-kind="image">🖼️ صور</button>
  <button type="button" class="filter-chip conv-kind" data-kind="audio">🎵 صوت</button>
  <button type="button" class="filter-chip conv-kind" data-kind="video">🎬 فيديو</button>
</div>

<div class="conv-drop" id="convDrop">
  <p class="conv-drop-text">اسحب الملفات هنا، أو</p>
  <label class="btn" for="convInput">📂 اختر ملفات</label>
  <input type="file" id="convInput" multiple hidden />
  <p class="conv-drop-hint">تقدر تختار أكثر من ملف مرة وحدة</p>
</div>

<div class="conv-options" id="convImageOpts">
  <div class="conv-option">
    <span class="conv-option-label">الصيغة</span>
    <div class="instrument-picker" data-kind="image">
      <button type="button" class="filter-chip conv-format active" data-format="image/webp">WebP</button>
      <button type="button" class="filter-chip conv-format" data-format="image/jpeg">JPG</button>
      <button type="button" class="filter-chip conv-format" data-format="image/png">PNG</button>
    </div>
  </div>

  <div class="conv-option" id="convQualityRow">
    <label class="conv-option-label" for="convQuality">الجودة <output id="convQualityOut">85%</output></label>
    <input type="range" id="convQuality" min="30" max="100" value="85" step="5" />
  </div>

  <div class="conv-option">
    <label class="conv-option-label" for="convMaxWidth">أقصى عرض (بالبكسل)</label>
    <input type="number" id="convMaxWidth" class="conv-number" min="0" step="100" placeholder="بدون تصغير" />
  </div>
</div>

<div class="conv-options" id="convAudioOpts" hidden>
  <div class="conv-option">
    <span class="conv-option-label">الصيغة</span>
    <div class="instrument-picker" data-kind="audio">
      <button type="button" class="filter-chip conv-format active" data-format="audio/mpeg">MP3</button>
      <button type="button" class="filter-chip conv-format" data-format="audio/wav">WAV</button>
    </div>
  </div>

  <div class="conv-option" id="convBitrateRow">
    <label class="conv-option-label" for="convBitrate">جودة MP3</label>
    <select id="convBitrate" class="conv-number">
      <option value="128">128 kbps</option>
      <option value="192" selected>192 kbps</option>
      <option value="320">320 kbps</option>
    </select>
  </div>

  <p class="conv-option-note">تقدر تسحب مقطع فيديو هنا وتطلع صوته وحده.</p>
</div>

<div class="conv-options" id="convVideoOpts" hidden>
  <div class="conv-option">
    <span class="conv-option-label">الصيغة</span>
    <div class="instrument-picker" data-kind="video">
      <button type="button" class="filter-chip conv-format active" data-format="">الأنسب لمتصفحك</button>
      <button type="button" class="filter-chip conv-format" data-format="video/mp4;codecs=avc1.42E01E,mp4a.40.2">MP4</button>
      <button type="button" class="filter-chip conv-format" data-format="video/webm;codecs=vp9,opus">WebM</button>
    </div>
  </div>

  <div class="conv-option">
    <label class="conv-option-label" for="convVideoWidth">أقصى عرض (بالبكسل)</label>
    <input type="number" id="convVideoWidth" class="conv-number" min="0" step="160" placeholder="بدون تصغير" />
  </div>

  <div class="conv-option">
    <label class="conv-check"><input type="checkbox" id="convMute" /> احذف الصوت</label>
  </div>

  <p class="conv-option-note">
    تحويل الفيديو يصير بالزمن الحقيقي: مقطع دقيقتين ياخذ دقيقتين تقريباً، لأنه يُعاد ترميزه بجهازك لا بسيرفر.
    خلّ الصفحة مفتوحة إلى أن يخلص.
  </p>
</div>

<div class="conv-results" id="convResults"></div>
