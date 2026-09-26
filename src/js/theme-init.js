/* يطبّق المظهر المحفوظ قبل أول رسم للصفحة (يمنع وميض المظهر الفاتح).
   ملف خارجي عمداً — عشان تشتغل سياسة CSP بدون unsafe-inline. */
/* حماية دفاعية من clickjacking: GitHub Pages ما يدعم ترويسة X-Frame-Options
   أو frame-ancestors بـCSP (يعمل فقط بترويسة HTTP، مو meta tag — موثّق
   بتعليق الـCSP بـbase.njk). هذا احتياط JS بديل: لو الصفحة محمّلة داخل
   iframe من نطاق غير نطاقنا، نحاول كسر الإطار فوراً؛ لو فشل (متصفح يمنع
   قراءة/كتابة top عبر النطاقات، وهو المتوقع)، نخفي المحتوى بدل ما نتركه
   قابلاً للنقر بخداع (overlay شفاف فوقه). ما يؤثر على الاستخدام العادي
   (فتح الموقع مباشرة) لأن window.top === window.self دائماً بهذه الحالة. */
(function () {
  try {
    if (window.top !== window.self) {
      window.top.location.href = window.self.location.href;
      document.documentElement.style.display = "none";
    }
  } catch {
    document.documentElement.style.display = "none";
  }
})();

/* تكبير الصفحة كلها بنسبة عرض الشاشة فوق 1600px — نفس التصميم بس أكبر
   بالتناسب على الشاشات العريضة (2K/4K)، بدل محتوى صغير بنص فراغ. أغلب
   مقاسات style.css بكسل ثابت (642 مقاس)، فتكبير خط الجذر وحده ما يكفي. تحت
   1600 صفر تغيير. عرض التخطيط الفعلي يبقى 1600 — أعرض من منطقة القراءة
   (--max-width: 1320) عمداً عشان تبقى مساحة فاضية على الجانبين، وفوق أكبر
   نقطة كسر (1300px) فاستعلامات media ما تتعارض. بالـhead عشان يطبَّق قبل
   أول رسم بلا قفزة. */
(function () {
  var root = document.documentElement;
  function fit() {
    root.style.zoom = Math.min(1.8, Math.max(1, window.innerWidth / 1600));
  }
  fit();
  window.addEventListener("resize", fit);
})();

(function () {
  try {
    var pref = localStorage.getItem("site_theme_pref");
    if (pref === "light" || pref === "dark") {
      document.documentElement.setAttribute("data-theme", pref);
    }
  } catch {
    // بعض المتصفحات ترمي استثناء عند منع الكوكيز/التخزين — نتجاهله بأمان
  }
})();
