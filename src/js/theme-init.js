/* يطبّق المظهر المحفوظ قبل أول رسم للصفحة (يمنع وميض المظهر الفاتح).
   ملف خارجي عمداً — عشان تشتغل سياسة CSP بدون unsafe-inline. */
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
