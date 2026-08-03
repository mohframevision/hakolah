/* GitHub Pages يخدم ملف 404.html واحد لأي رابط غير موجود بكل الموقع (حتى تحت
   /en/) — ما فيه دعم لصفحة 404 مختلفة لكل مجلد فرعي، فنكتشف اللغة من المسار.
   ملف خارجي عمداً — عشان تشتغل سياسة CSP بدون unsafe-inline. */
(function () {
  if (location.pathname.indexOf("/en/") === -1) return;

  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
  document.title = "Page Not Found | Hakolah";

  var header = document.getElementById("notFoundHeader");
  if (header) {
    var h1 = header.querySelector("h1");
    var p = header.querySelector("p");
    if (h1) h1.textContent = "😕 404 — Page Not Found";
    if (p) p.textContent = "The link you opened doesn't exist or was moved.";
  }

  var hint = document.getElementById("notFoundHint");
  if (hint) hint.textContent = "Try going back to the homepage, or browse a section from the menu above.";

  var homeLink = document.getElementById("notFoundHomeLink");
  if (homeLink) {
    homeLink.href = "/hakolah/en/index.html";
    homeLink.textContent = "🏠 Back to Home";
  }
})();
