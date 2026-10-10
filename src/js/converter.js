/* تُحمَّل بصفحة file-converter فقط (pageScript) بعد main.js، وتستخدم دواله العامة. */
/* ===== محوّل الصور — يشتغل كاملاً داخل المتصفح =====
   لا رفع لأي سيرفر ولا مكتبة خارجية: فكّ الترميز بـ createImageBitmap،
   وإعادة الترميز بـ canvas.toBlob — كلاهما أصلي بالمتصفح. الوعد بالخصوصية
   هنا قابل للإثبات: الصفحة تشتغل والإنترنت مفصول. */
/* ===== محوّل الملفات: صور وصوت وفيديو =====
   كل التحويل يصير داخل المتصفح: createImageBitmap+canvas للصور،
   decodeAudioData+مرمّزاتنا للصوت، وcanvas.captureStream+MediaRecorder للفيديو.
   ما فيه أي طلب شبكة بأي مسار من هذي الثلاثة. */
function initFileConverter() {
  const input = document.getElementById("convInput");
  const drop = document.getElementById("convDrop");
  const results = document.getElementById("convResults");
  if (!input || !drop || !results) return;

  const isEn = window.SITE_LANG === "en";
  const say = (ar, en) => (isEn ? en : ar);

  const quality = document.getElementById("convQuality");
  const qualityOut = document.getElementById("convQualityOut");
  const qualityRow = document.getElementById("convQualityRow");
  const maxWidthInput = document.getElementById("convMaxWidth");
  const videoWidthInput = document.getElementById("convVideoWidth");
  const muteInput = document.getElementById("convMute");
  const kindButtons = document.querySelectorAll(".conv-kind");
  const panels = {
    image: document.getElementById("convImageOpts"),
    audio: document.getElementById("convAudioOpts"),
    video: document.getElementById("convVideoOpts"),
  };

  let kind = "image";
  const chosen = { image: "image/webp", audio: "audio/mpeg", video: "" };

  const IMAGE_EXT = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png", "image/bmp": "bmp" };
  const ACCEPT = {
    image: "image/*",
    // الفيديو مقبول بوضع الصوت: استخراج الصوت من مقطع فيديو أشهر استعمال
    audio: "audio/*,video/*",
    // والصوت مقبول بوضع الفيديو كذلك: صوت + صورة موجات متحركة = فيديو
    video: "video/*,audio/*",
  };

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function formatClock(seconds) {
    if (!isFinite(seconds)) return "—";
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  // أرقام داخل جملة عربية بينها حرف زائد ("/") تنقلب بصرياً باتجاه النص —
  // نفس مشكلة البوسترات. dir="ltr" على الجزء الرقمي وحده يمنعها بلا ما يكسر
  // اتجاه بقية الجملة
  function durationNote(duration) {
    return say(
      `المدة <span dir="ltr">${formatClock(duration)}</span> — التحويل ياخذ نفس المدة تقريباً`,
      `Duration <span dir="ltr">${formatClock(duration)}</span> — conversion takes about the same time`
    );
  }

  function progressLabel(elapsed, duration) {
    return say(
      `يحوّل… <span dir="ltr">${formatClock(elapsed)} / ${formatClock(duration)}</span>`,
      `Converting… <span dir="ltr">${formatClock(elapsed)} / ${formatClock(duration)}</span>`
    );
  }

  function changeText(before, after) {
    const change = Math.round((1 - after / before) * 100);
    const label =
      change > 0 ? say(`أصغر بـ ${change}%`, `${change}% smaller`) : say(`أكبر بـ ${Math.abs(change)}%`, `${Math.abs(change)}% larger`);
    return { change, label };
  }

  /* ===== أشرطة الصيغ ===== */
  document.querySelectorAll(".conv-format").forEach((button) => {
    button.addEventListener("click", () => {
      const group = button.closest(".instrument-picker");
      chosen[group.dataset.kind] = button.dataset.format;
      group.querySelectorAll(".conv-format").forEach((b) => b.classList.toggle("active", b === button));
      // PNG وBMP بلا فقد (بلا جودة قابلة للضبط)، وWAV بلا معدّل بت — نخفي
      // الخيار بدل ما نعرضه معطّلاً
      if (group.dataset.kind === "image" && qualityRow)
        qualityRow.hidden = chosen.image === "image/png" || chosen.image === "image/bmp";
      const bitrateRow = document.getElementById("convBitrateRow");
      if (group.dataset.kind === "audio" && bitrateRow) bitrateRow.hidden = chosen.audio === "audio/wav";
    });
  });

  kindButtons.forEach((button) => {
    button.addEventListener("click", () => {
      kind = button.dataset.kind;
      kindButtons.forEach((b) => b.classList.toggle("active", b === button));
      Object.entries(panels).forEach(([name, panel]) => {
        if (panel) panel.hidden = name !== kind;
      });
      input.setAttribute("accept", ACCEPT[kind]);
    });
  });
  input.setAttribute("accept", ACCEPT[kind]);

  /* الصفحة توعد إنك تقدر تفصل الإنترنت وتشتغل عادي — ومرمّز MP3 كان يُنزَّل
     عند الطلب، فلو فصل المستخدم الإنترنت أول ما فتحت الصفحة يفشل التحويل
     ويصير الوعد كذباً. نجيبه من الحين عشان يصير الوعد صحيحاً حرفياً */
  loadLameEncoder().catch(() => {});

  if (quality && qualityOut) {
    quality.addEventListener("input", () => {
      qualityOut.textContent = `${quality.value}%`;
    });
  }

  /* ===== صف النتيجة ===== */
  function addRow(file) {
    const row = document.createElement("div");
    row.className = "conv-row";
    const name = document.createElement("div");
    name.className = "conv-row-name";
    name.textContent = file.name; // textContent لا innerHTML: اسم الملف مدخَل غير موثوق
    const state = document.createElement("div");
    state.className = "conv-row-state";
    state.textContent = "…";
    row.append(name, state);
    results.prepend(row);
    return { row, name, state };
  }

  function fail(parts, message) {
    parts.state.textContent = message;
    parts.row.classList.add("conv-row-error");
  }

  function finish(parts, { outName, blob, beforeSize, meta, thumbUrl }) {
    const url = URL.createObjectURL(blob);
    const { change, label } = changeText(beforeSize, blob.size);
    parts.row.textContent = "";
    parts.row.className = "conv-row";

    if (thumbUrl) {
      const img = document.createElement("img");
      img.className = "conv-thumb";
      img.src = thumbUrl;
      img.alt = "";
      parts.row.append(img);
    }

    const info = document.createElement("div");
    info.className = "conv-row-info";
    const outEl = document.createElement("div");
    outEl.className = "conv-row-name";
    outEl.textContent = outName;
    const metaEl = document.createElement("div");
    metaEl.className = "conv-row-meta";
    metaEl.innerHTML = `${meta ? `<span dir="ltr">${meta}</span> · ` : ""}<span dir="ltr">${formatBytes(
      beforeSize
    )} → ${formatBytes(blob.size)}</span> · <span class="${change > 0 ? "conv-good" : "conv-warn"}">${label}</span>`;
    info.append(outEl, metaEl);

    const link = document.createElement("a");
    link.className = "btn conv-download";
    link.download = outName;
    link.href = url;
    link.textContent = say("⬇️ تحميل", "⬇️ Download");

    parts.row.append(info, link);
  }

  const baseNameOf = (file) => file.name.replace(/\.[^.]+$/, "");
  // H.264 (وMediaRecorder عموماً) يطلب أبعاد فيديو زوجية
  const even = (n) => Math.max(2, Math.round(n / 2) * 2);

  /* BMP ما يدعمه canvas.toBlob بأي متصفح — تنسيقه بسيط جداً (بكسلات خام
     بلا ضغط) فنكتبه يدوياً بنفس أسلوب WAV/MIDI اليدوي بالموقع */
  function canvasToBmpBlob(canvas) {
    const { width, height } = canvas;
    const { data } = canvas.getContext("2d").getImageData(0, 0, width, height);
    const rowSize = Math.ceil((width * 3) / 4) * 4; // كل صف يُحاذى لأربع بايتات
    const pixelArraySize = rowSize * height;
    const buffer = new ArrayBuffer(54 + pixelArraySize);
    const view = new DataView(buffer);

    view.setUint8(0, 0x42); // "B"
    view.setUint8(1, 0x4d); // "M"
    view.setUint32(2, buffer.byteLength, true);
    view.setUint32(10, 54, true); // إزاحة بيانات البكسل
    view.setUint32(14, 40, true); // حجم ترويسة DIB
    view.setInt32(18, width, true);
    view.setInt32(22, height, true);
    view.setUint16(26, 1, true); // مستويات الألوان
    view.setUint16(28, 24, true); // بت لكل بكسل
    view.setUint32(34, pixelArraySize, true);

    const bytes = new Uint8Array(buffer);
    let offset = 54;
    // BMP يخزّن صفوفه من الأسفل للأعلى وبترتيب BGR لا RGB، وبلا شفافية
    for (let y = height - 1; y >= 0; y--) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        bytes[offset++] = data[i + 2];
        bytes[offset++] = data[i + 1];
        bytes[offset++] = data[i];
      }
      offset += rowSize - width * 3;
    }
    return new Blob([buffer], { type: "image/bmp" });
  }

  /* ===== صور ===== */
  async function convertImage(file, parts) {
    if (!file.type.startsWith("image/")) return fail(parts, say("الملف ليس صورة", "Not an image file"));

    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      // مثل HEIC: المتصفح ما يفكّ ترميزه، فنقولها صراحة بدل فشل صامت
      return fail(parts, say("متصفحك ما يقدر يفتح صيغة هذي الصورة", "Your browser can't read this image format"));
    }

    const format = chosen.image;
    const limit = Number(maxWidthInput && maxWidthInput.value) || 0;
    const scale = limit > 0 && bitmap.width > limit ? limit / bitmap.width : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const g = canvas.getContext("2d");
    // JPG وBMP ما يدعمان الشفافية — بدون خلفية بيضاء تطلع المناطق الشفافة
    // سوداء. هذي أكثر مفاجأة تصير بمحوّلات الصور
    if (format === "image/jpeg" || format === "image/bmp") {
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, width, height);
    }
    g.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob =
      format === "image/bmp"
        ? canvasToBmpBlob(canvas)
        : await new Promise((resolve) =>
            canvas.toBlob(resolve, format, format === "image/png" ? undefined : Number(quality.value) / 100)
          );
    if (!blob) return fail(parts, say("تعذّر التحويل", "Conversion failed"));

    const url = URL.createObjectURL(blob);
    finish(parts, {
      outName: `${baseNameOf(file)}.${IMAGE_EXT[format]}`,
      blob,
      beforeSize: file.size,
      meta: `${width}×${height}`,
      thumbUrl: url,
    });
  }

  /* ===== صوت =====
     decodeAudioData يفكّ ما يفكّه المتصفح أصلاً (mp3 و m4a و ogg و wav
     وغيرها)، ويفكّ مسار الصوت من ملف فيديو كذلك — فاستخراج صوت مقطع فيديو
     يمشي بنفس المسار بلا كود إضافي */
  async function convertAudio(file, parts) {
    parts.state.textContent = say("يفكّ ترميز الصوت…", "Decoding audio…");

    const data = await file.arrayBuffer();
    const nativeRate = sniffSampleRate(new Uint8Array(data, 0, Math.min(data.byteLength, 65536)));
    let ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)(nativeRate ? { sampleRate: nativeRate } : undefined);
    } catch {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    let buffer;
    try {
      buffer = await ctx.decodeAudioData(data);
    } catch {
      return fail(
        parts,
        say("متصفحك ما يقدر يفكّ ترميز صوت هذا الملف", "Your browser can't decode this file's audio")
      );
    } finally {
      ctx.close();
    }

    let blob;
    if (chosen.audio === "audio/wav") {
      parts.state.textContent = say("يجهّز WAV…", "Building WAV…");
      await new Promise((r) => setTimeout(r, 0));
      blob = audioBufferToWav(buffer);
    } else {
      const bitrateEl = document.getElementById("convBitrate");
      const kbps = Number(bitrateEl && bitrateEl.value) || 192;
      try {
        blob = await audioBufferToMp3(buffer, kbps, (ratio) => {
          parts.state.textContent = say(
            `يرمّز MP3… ${Math.round(ratio * 100)}%`,
            `Encoding MP3… ${Math.round(ratio * 100)}%`
          );
        });
      } catch {
        return fail(parts, say("تعذّر تحميل مرمّز MP3", "Couldn't load the MP3 encoder"));
      }
    }

    finish(parts, {
      outName: `${baseNameOf(file)}.${chosen.audio === "audio/wav" ? "wav" : "mp3"}`,
      blob,
      beforeSize: file.size,
      meta: `${formatClock(buffer.duration)} · ${buffer.numberOfChannels > 1 ? "stereo" : "mono"} · ${buffer.sampleRate} Hz`,
    });
  }

  /* ===== فيديو =====
     ما فيه ترميز فيديو فوري بالمتصفح بلا مكتبة ضخمة (ffmpeg.wasm ~٢٥ ميغا،
     ويحتاج ترويسات COOP/COEP ما تقدر GitHub Pages تضبطها). البديل الأصلي:
     نعرض الفيديو على كانفس ونسجّل الكانفس + الصوت بـ MediaRecorder — يشتغل
     بلا أي تنزيل إضافي، لكنه بالزمن الحقيقي: مقطع دقيقتين ياخذ دقيقتين.
     ponytail: زمن حقيقي؛ لو صار بطيئاً جداً فالترقية هي WebCodecs + مُغلِّف mp4. */
  function pickVideoType() {
    const wanted = chosen.video;
    const candidates = wanted
      ? [wanted]
      : ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
    return candidates.find((type) => window.MediaRecorder && MediaRecorder.isTypeSupported(type)) || "";
  }

  function queueVideo(file, parts) {
    const mimeType = pickVideoType();
    if (!mimeType) return fail(parts, say("متصفحك ما يدعم تسجيل الفيديو", "Your browser can't record video"));

    // ملف صوت بوضع الفيديو: نصنع له فيديو مربّع بموجات صوت متحركة بدل صورة
    if (file.type.startsWith("audio/")) return queueAudioToVideo(file, parts, mimeType);

    const video = document.createElement("video");
    video.preload = "metadata";
    video.playsInline = true;
    video.src = URL.createObjectURL(file);

    video.addEventListener("error", () =>
      fail(parts, say("متصفحك ما يقدر يفتح هذا الفيديو", "Your browser can't open this video"))
    );

    video.addEventListener("loadedmetadata", () => {
      parts.state.textContent = "";
      const note = document.createElement("span");
      note.className = "conv-video-note";
      // نقول المدة صراحةً قبل ما يبدأ: التحويل بالزمن الحقيقي، والصمت يخلي
      // المستخدم يظن إن الأداة معلّقة
      note.innerHTML = durationNote(video.duration);
      const start = document.createElement("button");
      start.type = "button";
      start.className = "btn conv-start";
      start.textContent = say("▶️ ابدأ التحويل", "▶️ Start conversion");
      start.addEventListener("click", () => {
        start.remove();
        note.remove();
        runVideo(file, parts, video, mimeType);
      });
      parts.state.append(note, start);
    });
  }

  async function runVideo(file, parts, video, mimeType) {
    const progress = document.createElement("div");
    progress.className = "conv-progress";
    const bar = document.createElement("span");
    progress.append(bar);
    const label = document.createElement("span");
    label.className = "conv-video-note";
    parts.state.append(label, progress);

    const limit = Number(videoWidthInput && videoWidthInput.value) || 0;
    const scale = limit > 0 && video.videoWidth > limit ? limit / video.videoWidth : 1;
    const width = even(video.videoWidth * scale);
    const height = even(video.videoHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const g = canvas.getContext("2d");

    const stream = canvas.captureStream(30);
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const mute = muteInput && muteInput.checked;
    if (!mute) {
      try {
        const source = audioCtx.createMediaElementSource(video);
        const dest = audioCtx.createMediaStreamDestination();
        // نوصله بوجهة التسجيل فقط، لا بالسماعات: التحويل يصير بصمت
        source.connect(dest);
        await audioCtx.resume();
        dest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
      } catch {
        // فيديو بلا مسار صوت — نكمل بصورة فقط
      }
    }

    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
    const chunks = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    const done = new Promise((resolve) => {
      recorder.onstop = resolve;
    });

    let drawing = true;
    const draw = () => {
      if (!drawing) return;
      g.drawImage(video, 0, 0, width, height);
      const ratio = video.duration ? video.currentTime / video.duration : 0;
      bar.style.width = `${Math.round(ratio * 100)}%`;
      label.innerHTML = progressLabel(video.currentTime, video.duration);
      // requestVideoFrameCallback يرسم على الإطارات الفعلية لا على تحديث الشاشة
      if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(draw);
      else requestAnimationFrame(draw);
    };

    video.addEventListener("ended", () => {
      drawing = false;
      if (recorder.state !== "inactive") recorder.stop();
    });

    recorder.start();
    try {
      await video.play();
    } catch {
      drawing = false;
      recorder.stop();
      audioCtx.close();
      return fail(parts, say("تعذّر تشغيل الفيديو للتحويل", "Couldn't play the video to convert it"));
    }
    draw();

    await done;
    audioCtx.close();
    URL.revokeObjectURL(video.src);

    const blob = new Blob(chunks, { type: mimeType });
    if (!blob.size) return fail(parts, say("تعذّر التحويل", "Conversion failed"));

    finish(parts, {
      outName: `${baseNameOf(file)}.${mimeType.startsWith("video/mp4") ? "mp4" : "webm"}`,
      blob,
      beforeSize: file.size,
      meta: `${width}×${height} · ${formatClock(video.duration)}`,
    });
  }

  /* ===== صوت إلى فيديو =====
     ما فيه صورة مصدر نعرضها — نرسم مربّعاً بلون الموقع مع موجات صوت متحركة
     (AnalyserNode) واسم الملف، ونسجّله بنفس أسلوب تحويل الفيديو. */
  async function queueAudioToVideo(file, parts, mimeType) {
    parts.state.textContent = say("يفكّ ترميز الصوت…", "Decoding audio…");
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    let buffer;
    try {
      buffer = await ctx.decodeAudioData(await file.arrayBuffer());
    } catch {
      ctx.close();
      return fail(
        parts,
        say("متصفحك ما يقدر يفكّ ترميز صوت هذا الملف", "Your browser can't decode this file's audio")
      );
    }

    parts.state.textContent = "";
    const note = document.createElement("span");
    note.className = "conv-video-note";
    note.innerHTML = durationNote(buffer.duration);
    const start = document.createElement("button");
    start.type = "button";
    start.className = "btn conv-start";
    start.textContent = say("▶️ ابدأ التحويل", "▶️ Start conversion");
    start.addEventListener("click", () => {
      start.remove();
      note.remove();
      runAudioToVideo(file, parts, mimeType, ctx, buffer);
    });
    parts.state.append(note, start);
  }

  async function runAudioToVideo(file, parts, mimeType, ctx, buffer) {
    const progress = document.createElement("div");
    progress.className = "conv-progress";
    const progressFill = document.createElement("span");
    progress.append(progressFill);
    const label = document.createElement("span");
    label.className = "conv-video-note";
    parts.state.append(label, progress);

    // مربّع 1080 الافتراضي (الأنسب لمشاركة اجتماعية) — لا مصدر أبعاد نقيسه
    // عليه أصلاً (المدخل صوت فقط)، فنصغّره فقط لو المستخدم حدّد عرضاً أصغر
    const limit = Number(videoWidthInput && videoWidthInput.value) || 0;
    const size = even(limit > 0 ? Math.min(1080, limit) : 1080);

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const g = canvas.getContext("2d");

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    const freq = new Uint8Array(analyser.frequencyBinCount);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const dest = ctx.createMediaStreamDestination();
    source.connect(analyser);
    analyser.connect(dest);
    // ما نوصلها بالسماعات: التحويل يصير بصمت مثل مسار الفيديو

    const stream = canvas.captureStream(30);
    dest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));

    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
    const chunks = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    const done = new Promise((resolve) => {
      recorder.onstop = resolve;
    });

    const primary = getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim() || "#1f7a4d";
    const title = baseNameOf(file);
    let drawing = true;
    let startedAt = 0;

    const draw = () => {
      if (!drawing) return;
      analyser.getByteFrequencyData(freq);
      g.fillStyle = primary;
      g.fillRect(0, 0, size, size);

      const bars = 40;
      const barWidth = size / bars;
      g.fillStyle = "#ffffff";
      for (let i = 0; i < bars; i++) {
        const v = freq[Math.floor((i / bars) * freq.length)] / 255;
        const h = Math.max(size * 0.02, v * size * 0.32);
        g.fillRect(i * barWidth + barWidth * 0.15, (size - h) / 2, barWidth * 0.7, h);
      }

      g.textAlign = "center";
      g.font = `bold ${Math.round(size * 0.04)}px sans-serif`;
      g.fillText(title, size / 2, size * 0.16);

      const elapsed = ctx.currentTime - startedAt;
      const ratio = buffer.duration ? elapsed / buffer.duration : 0;
      progressFill.style.width = `${Math.min(100, Math.round(ratio * 100))}%`;
      label.innerHTML = progressLabel(elapsed, buffer.duration);
      requestAnimationFrame(draw);
    };

    source.onended = () => {
      drawing = false;
      if (recorder.state !== "inactive") recorder.stop();
    };

    recorder.start();
    startedAt = ctx.currentTime;
    source.start();
    draw();

    await done;
    ctx.close();

    const blob = new Blob(chunks, { type: mimeType });
    if (!blob.size) return fail(parts, say("تعذّر التحويل", "Conversion failed"));

    finish(parts, {
      outName: `${title}.${mimeType.startsWith("video/mp4") ? "mp4" : "webm"}`,
      blob,
      beforeSize: file.size,
      meta: `${size}×${size} · ${formatClock(buffer.duration)}`,
    });
  }

  async function convertFile(file) {
    const parts = addRow(file);
    if (kind === "image") return convertImage(file, parts);
    if (kind === "audio") return convertAudio(file, parts);
    return queueVideo(file, parts);
  }

  async function handleFiles(files) {
    // واحد واحد لا دفعة: الملفات الكبيرة تستهلك ذاكرة كبيرة لو فُكّت كلها معاً
    for (const file of files) await convertFile(file);
  }

  input.addEventListener("change", () => {
    handleFiles([...input.files]);
    input.value = "";
  });

  ["dragenter", "dragover"].forEach((type) =>
    drop.addEventListener(type, (event) => {
      event.preventDefault();
      drop.classList.add("dragging");
    })
  );
  ["dragleave", "drop"].forEach((type) =>
    drop.addEventListener(type, (event) => {
      event.preventDefault();
      drop.classList.remove("dragging");
    })
  );
  drop.addEventListener("drop", (event) => {
    if (event.dataTransfer && event.dataTransfer.files.length) handleFiles([...event.dataTransfer.files]);
  });
}

/* decodeAudioData يعيد تشكيل العيّنات لتردّد سياق الصوت (عادةً تردّد العتاد،
   ٤٨ كيلو) — يعني ملف ٤٤.١ يطلع ٤٨ بلا سبب، وهذا تغيير يمسّ الجودة بأداة
   وظيفتها أن تحوّل بأمانة. فنقرأ التردّد الأصلي من ترويسة الملف ونبني السياق
   عليه، فما يصير أي إعادة تشكيل.
   ponytail: WAV و MP3 فقط — باقي الصيغ ترجع للتردّد الافتراضي؛ لو احتجنا
   دقّة بـ m4a/ogg فالترقية قراءة ترويسة كل حاوية أو WebCodecs. */
function sniffSampleRate(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (at, len) => String.fromCharCode(...bytes.subarray(at, at + len));

  if (bytes.length > 28 && text(0, 4) === "RIFF" && text(8, 4) === "WAVE") {
    return view.getUint32(24, true) || 0;
  }

  // نتخطّى وسم ID3 إن وُجد (طوله عدد "syncsafe" من ٧ بتات لكل بايت)
  let at = 0;
  if (bytes.length > 10 && text(0, 3) === "ID3") {
    at = 10 + ((bytes[6] << 21) | (bytes[7] << 14) | (bytes[8] << 7) | bytes[9]);
  }
  const RATES = {
    3: [44100, 48000, 32000], // MPEG 1
    2: [22050, 24000, 16000], // MPEG 2
    0: [11025, 12000, 8000], // MPEG 2.5
  };
  const limit = Math.min(bytes.length - 3, at + 8192);
  for (let i = at; i < limit; i++) {
    if (bytes[i] !== 0xff || (bytes[i + 1] & 0xe0) !== 0xe0) continue;
    const table = RATES[(bytes[i + 1] >> 3) & 0x03];
    const rate = table && table[(bytes[i + 2] >> 2) & 0x03];
    if (rate) return rate;
  }
  return 0;
}

document.addEventListener("DOMContentLoaded", initFileConverter);
