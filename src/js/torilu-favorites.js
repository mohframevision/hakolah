// صفحة المفضلة انتقلت إلى توريلو: تُحمل مفضلة الزائر معه بصيغة
// #import=<base64url لمصفوفة JSON بعناصر «القسم/المعرّف»> (المستورِد على توريلو يقرؤها)
(function () {
  const to = document.currentScript.dataset.to;
  const ids = [];
  try {
    const favs = JSON.parse(localStorage.getItem("site_favorites_v1")) || {};
    Object.entries(favs).forEach(([section, group]) =>
      Object.keys(group || {}).forEach((id) => group[id] && ids.push(section + "/" + id))
    );
  } catch {
    /* تخزين محجوب: تحويل بلا مفضلة */
  }
  let hash = location.hash;
  if (ids.length) {
    let bin = "";
    new TextEncoder().encode(JSON.stringify(ids)).forEach((b) => (bin += String.fromCharCode(b)));
    hash = "#import=" + btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  location.replace(to + location.search + hash);
})();
