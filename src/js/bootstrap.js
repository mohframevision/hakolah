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

  /* Google Analytics لا يتحمّل ولا يُرسل شيئاً إلا بعد موافقة الزائر (قانون حماية
     البيانات البحريني 30/2018 يشترط موافقة صريحة). قبلها gtag دالة فاضية، فأحداث
     الموقع (window.gtag("event"…)) تمرّ بلا أثر ولا تتجمّع لتُرسل لاحقاً.
     main.js ينادي enableAnalytics() لحظة الضغط على «موافق». */
  window.GA_ID = cfg.gaId || null;
  window.gtag = function () {};
  window.enableAnalytics = function () {
    if (!cfg.gaId || window.__gaOn) return;
    window.__gaOn = true;
    window["ga-disable-" + cfg.gaId] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", cfg.gaId);
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(cfg.gaId);
    document.head.appendChild(s);
    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.requestNonPersonalizedAds = 0;
  };
  /* سكربت AdSense يبقى بالـhead (مراجعة الموقع تعتمد عليه)، لكن الإعلانات غير
     مخصصة إلى أن يوافق الزائر */
  window.adsbygoogle = window.adsbygoogle || [];
  window.adsbygoogle.requestNonPersonalizedAds = 1;
  var consent = null;
  try {
    consent = localStorage.getItem("cookie_consent");
  } catch {
    // تخزين محجوب: نعامله كأنه لم يوافق
  }
  if (consent === "accepted") window.enableAnalytics();
})();
