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
