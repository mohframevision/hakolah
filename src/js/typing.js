/* تُحمَّل بصفحة arabic-typing-test فقط (pageScript) بعد main.js، وتستخدم دواله العامة. */
/* ===== اختبار سرعة الكتابة بالعربية =====
   الجُمَل عربية فصيحة قصيرة ومتفاوتة الطول. لا مكتبات: مقارنة حرف بحرف. */
function initTypingTest() {
  const promptEl = document.getElementById("typePrompt");
  const input = document.getElementById("typeInput");
  if (!promptEl || !input) return;

  const isEn = window.SITE_LANG === "en";
  const say = (ar, en) => (isEn ? en : ar);
  const BEST_KEY = "hakolah-typing-best-v1";

  const speedEl = document.getElementById("typeSpeed");
  const accuracyEl = document.getElementById("typeAccuracy");
  const timeEl = document.getElementById("typeTime");
  const bestEl = document.getElementById("typeBest");
  const hintEl = document.getElementById("typeHint");
  const restartBtn = document.getElementById("typeRestart");

  /* بلا أي حركة (شدّة/ضمّة/تنوين): باختبار كتابة يجب أن يطابق المستخدم النص
     حرفاً حرفاً، والناس لا تكتب الحركات يومياً — فوجودها يعني أخطاء حمراء
     دائمة ودقة منخفضة بلا ذنب المستخدم.
     وبلا عبارات تُشبه الحديث أو الآيات: النص هنا للتمرين لا للاستشهاد،
     ونقلها بلا نسبة قد يوهم القارئ أنها منسوبة. */
  /* أربعة مستويات: الجمل الأدبية تحبط المبتدئ، والجمل البسيطة لا تتحدى
     المتمرّس. الصعوبة تتدرّج بالطول وبكثافة الحروف التي تحتاج Shift على
     لوحة المفاتيح العربية (أ إ آ ؤ ئ ء ة ى) — وهي أكثر ما يخطئ فيه السريع.
     بلا أي حركة بكل المستويات: يجب أن يطابق المستخدم النص حرفاً حرفاً،
     والناس لا تكتب الحركات، فوجودها يعني أخطاء دائمة بلا ذنبه.
     وبلا عبارة تُشبه الحديث أو الآيات: النص للتمرين لا للاستشهاد. */
  const LEVELS = {
    beginner: [
      "الشمس تشرق من الشرق وتغرب في الغرب.",
      "القطار يصل في الموعد كل صباح.",
      "البحر واسع والسفن تسير فيه.",
      "الطالب يكتب درسه كل يوم بخط جميل.",
      "الطريق طويل ولكن السير فيه ممتع.",
    ],
    easy: [
      "القراءة عادة جميلة تفتح للعقل أبوابا كثيرة.",
      "الوقت الذي تقضيه في الترتيب يوفر عليك ساعات من البحث لاحقا.",
      "إتقان المهارة يأتي من تكرارها لا من طول التفكير فيها.",
      "من كتب بأصابعه العشر مرة تعود عليها ولم يعد ينظر إلى اللوحة.",
      "الاعتذار في وقته يصلح ما أفسده الغضب.",
    ],
    medium: [
      "الكتابة السريعة مهارة تكتسب بالتمرين، لا موهبة يولد بها الإنسان.",
      "البحرين أرخبيل من عشرات الجزر، وتاريخها أطول من مساحتها بكثير.",
      "ما يؤجل من العمل لا يختفي، وإنما ينتظرك مضاعفا في يوم أضيق.",
      "القراءة تفتح للعقل نوافذ لا يبلغها السفر، وتختصر عليك تجارب غيرك.",
      "من أراد أن يتقن شيئا فليكرره حتى يصير عادة لا تحتاج إلى تفكير.",
    ],
    hard: [
      "اللغة كائن حي ينمو بأهله، فإذا أهملوه ذبل، وإذا تعهدوه بالقراءة والكتابة أورق وأثمر.",
      "ليست البلاغة أن تأتي بالغريب من الألفاظ، بل أن تضع الكلمة الدقيقة في موضعها الذي لا يسد غيرها مسدها.",
      "من قرأ في علم الفلك أدرك أن ما نراه في السماء الليلة هو ماضيها لا حاضرها، وأن الضوء نفسه يحتاج إلى وقت.",
      "الترجمة الجيدة لا تنقل الألفاظ وحدها، وإنما تنقل روح النص وإيقاعه ونبرة صاحبه، وهذا أصعب ما فيها.",
      "خط النسخ أوضح للقارئ، وخط الرقعة أسرع للكاتب، ولكل منهما جمال لا يدركه إلا من أطال النظر فيه.",
      "ما زالت المكتبات تحتفظ بمخطوطات نادرة لم تحقق بعد، تنتظر باحثا صبورا يعيد إليها حياتها الأولى ويقربها من القارئ.",
      "إتقان الكتابة على لوحة المفاتيح لا يقاس بالسرعة وحدها، بل بقدرتك على كتابة فقرة كاملة دون أن تنظر إلى يديك.",
      "القراءة المتمهلة تورث فهما يبقى، والقراءة المتعجلة تورث حفظا يزول عند أول امتحان جاد.",
    ],
  };

  let target = "";
  let startedAt = 0;
  let timer = null;
  // يُعرَّف قبل استدعاء loadLevel: الثابت بمنطقة الموت المؤقت قبل سطر
  // تعريفه، فكان الاستدعاء يرمي خطأً يبتلعه try/catch ويرجع الافتراضي بصمت
  const LEVEL_KEY = "hakolah-typing-level-v1";
  let level = loadLevel();

  function loadLevel() {
    try {
      const saved = lsGet(LEVEL_KEY);
      return saved && LEVELS[saved] ? saved : "medium";
    } catch {
      return "medium";
    }
  }

  /* أفضل نتيجة لكل مستوى على حدة: مقارنة نتيجة "مبتدئ" بنتيجة "صعب" بلا
     معنى — الجمل مختلفة الطول والكثافة تماماً */
  function loadBest() {
    try {
      const value = Number(lsGet(`${BEST_KEY}-${level}`));
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch {
      return 0;
    }
  }

  function saveBest(wpm) {
    try {
      lsSet(`${BEST_KEY}-${level}`, String(wpm));
    } catch {
      // تصفّح خاص أو خزنة ممتلئة — الاختبار يشتغل، بس بلا حفظ أفضل نتيجة
    }
  }

  function renderBest() {
    const best = loadBest();
    if (bestEl) bestEl.textContent = best ? String(best) : "—";
  }

  /* نرسم الجملة حرفاً حرفاً ونلوّنها حسب ما كُتب: أخضر للمطابق وأحمر
     للمختلف، والحرف التالي مؤشَّر — فيرى المستخدم خطأه لحظة وقوعه */
  function paint() {
    const typed = input.value;
    promptEl.textContent = "";
    for (let i = 0; i < target.length; i++) {
      const span = document.createElement("span");
      span.textContent = target[i];
      if (i < typed.length) span.className = typed[i] === target[i] ? "type-ok" : "type-bad";
      else if (i === typed.length) span.className = "type-next";
      promptEl.append(span);
    }
  }

  function stats() {
    const typed = input.value;
    const elapsed = startedAt ? (Date.now() - startedAt) / 1000 : 0;
    let correct = 0;
    for (let i = 0; i < typed.length; i++) if (typed[i] === target[i]) correct++;
    // معيار متعارف عليه: "كلمة" = خمسة محارف، فتُقارَن النتائج بين نصوص مختلفة
    const wpm = elapsed > 0 ? Math.round((correct / 5 / elapsed) * 60) : 0;
    const accuracy = typed.length ? Math.round((correct / typed.length) * 100) : 100;
    return { elapsed, wpm, accuracy, correct };
  }

  function tick() {
    const { elapsed, wpm, accuracy } = stats();
    if (timeEl) timeEl.textContent = String(Math.round(elapsed));
    if (speedEl) speedEl.textContent = String(wpm);
    if (accuracyEl) accuracyEl.textContent = String(accuracy);
  }

  function finish() {
    clearInterval(timer);
    timer = null;
    const { wpm, accuracy } = stats();
    // لا تُسجَّل نتيجة بدقة متدنّية: الكتابة العشوائية السريعة ليست إنجازاً
    if (accuracy >= 80 && wpm > loadBest()) {
      saveBest(wpm);
      renderBest();
      if (hintEl) hintEl.textContent = say(`🎉 رقم جديد: ${wpm} كلمة/دقيقة`, `🎉 New best: ${wpm} words/min`);
      return;
    }
    if (hintEl) {
      hintEl.textContent =
        accuracy >= 80
          ? say("خلصت. جرّب جملة جديدة", "Done. Try a new sentence")
          : say("خلصت، لكن الدقة أقل من ٨٠٪ فما تُحتسب", "Done, but accuracy under 80% doesn't count");
    }
  }

  function reset() {
    clearInterval(timer);
    timer = null;
    startedAt = 0;
    const pool = LEVELS[level] || LEVELS.medium;
    target = pool[Math.floor(Math.random() * pool.length)];
    input.value = "";
    input.disabled = false;
    paint();
    if (timeEl) timeEl.textContent = "0";
    if (speedEl) speedEl.textContent = "—";
    if (accuracyEl) accuracyEl.textContent = "—";
    if (hintEl) hintEl.textContent = say("اضغط أي حرف لتبدأ", "Type any letter to start");
  }

  input.addEventListener("input", () => {
    if (!startedAt && input.value.length) {
      startedAt = Date.now();
      timer = setInterval(tick, 200);
    }
    if (input.value.length > target.length) input.value = input.value.slice(0, target.length);
    paint();
    tick();
    if (input.value.length === target.length) finish();
  });

  document.querySelectorAll(".type-level").forEach((btn) => {
    btn.addEventListener("click", () => {
      level = btn.dataset.level;
      try {
        lsSet(LEVEL_KEY, level);
      } catch {
        // بلا حفظ التفضيل — الاختبار يشتغل عادي
      }
      document.querySelectorAll(".type-level").forEach((b) => b.classList.toggle("active", b === btn));
      renderBest();
      reset();
    });
  });
  document.querySelectorAll(".type-level").forEach((b) => b.classList.toggle("active", b.dataset.level === level));

  if (restartBtn) restartBtn.addEventListener("click", reset);
  renderBest();
  reset();
}

document.addEventListener("DOMContentLoaded", initTypingTest);
