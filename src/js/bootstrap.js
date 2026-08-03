/* يقرأ إعدادات الصفحة من عنصر <script type="application/json"> (بيانات غير
   قابلة للتنفيذ، فما تحتاج أي سماح بسياسة CSP) ويحوّلها لمتغيّرات window
   اللي يعتمد عليها main.js — بديل عن السكربتات المضمّنة اللي كانت تجبرنا
   على استخدام unsafe-inline. */
(function () {
  var el = document.getElementById("site-config");
  var cfg;
  try {
    cfg = el ? JSON.parse(el.textContent) : {};
  } catch {
    cfg = {};
  }

  window.SITE_LANG = cfg.lang || "ar";
  window.I18N = cfg.i18n || {};
  window.PUSH_CONFIG = cfg.push || {};
  window.PAGE = cfg.page || {};

  if (cfg.gaId) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", cfg.gaId);
  }
})();
