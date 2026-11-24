---
pageScript: "board"
pageCss: "board"
title: "لوح الأفكار"
icon: 📝
desc: "لوح حرّ لجمع الأفكار والمراجع: ملاحظات وصور وروابط وقوائم مهام وأعمدة وأسهم وألواح داخل ألواح. يعمل كاملاً على جهازك، مجاني وبلا حساب."
title_en: "Idea Board"
desc_en: "A free-form board for ideas and references: notes, images, links, to-do lists, columns, arrows and boards inside boards. It runs entirely on your device, free and with no account."
categories:
  - نص
dateAdded: 2026-11-24
langSwitchUrl: "/en/ai-experiments/idea-board.html"
aiDisclosure: "أداة صنعها صاحب الموقع بمساعدة الذكاء الاصطناعي، وتعمل كاملةً داخل متصفحك."
noThirdParty: true
---

<div class="bd" data-lang="ar">
  <div class="bd-bar" role="toolbar" aria-label="أدوات اللوح">
    <div class="bd-group">
      <button type="button" class="bd-btn" data-act="note" title="ملاحظة" aria-label="ملاحظة"><span aria-hidden="true">🗒</span><span class="bd-lbl">ملاحظة</span></button>
      <button type="button" class="bd-btn" data-act="todo" title="مهام" aria-label="مهام"><span aria-hidden="true">☑</span><span class="bd-lbl">مهام</span></button>
      <button type="button" class="bd-btn" data-act="link" title="رابط" aria-label="رابط"><span aria-hidden="true">🔗</span><span class="bd-lbl">رابط</span></button>
      <button type="button" class="bd-btn" data-act="image" title="صورة" aria-label="صورة"><span aria-hidden="true">🖼</span><span class="bd-lbl">صورة</span></button>
      <button type="button" class="bd-btn" data-act="column" title="عمود" aria-label="عمود"><span aria-hidden="true">▥</span><span class="bd-lbl">عمود</span></button>
      <button type="button" class="bd-btn" data-act="board" title="لوح" aria-label="لوح"><span aria-hidden="true">▣</span><span class="bd-lbl">لوح</span></button>
      <button type="button" class="bd-btn" data-act="arrow" title="سهم" aria-label="سهم" aria-pressed="false"><span aria-hidden="true">↗</span><span class="bd-lbl">سهم</span></button>
    </div>
    <div class="bd-group">
      <button type="button" class="bd-btn" data-act="undo" title="تراجع" aria-label="تراجع" disabled><span aria-hidden="true">↶</span><span class="bd-lbl">تراجع</span></button>
      <button type="button" class="bd-btn" data-act="redo" title="إعادة" aria-label="إعادة" disabled><span aria-hidden="true">↷</span><span class="bd-lbl">إعادة</span></button>
      <button type="button" class="bd-btn" data-act="zout" title="بعّد" aria-label="بعّد"><span aria-hidden="true">−</span><span class="bd-lbl">بعّد</span></button>
      <span class="bd-zoom" aria-live="polite">100%</span>
      <button type="button" class="bd-btn" data-act="zin" title="قرّب" aria-label="قرّب"><span aria-hidden="true">+</span><span class="bd-lbl">قرّب</span></button>
      <button type="button" class="bd-btn" data-act="fit" title="أظهر الكل" aria-label="أظهر الكل"><span aria-hidden="true">⤢</span><span class="bd-lbl">أظهر الكل</span></button>
      <button type="button" class="bd-btn" data-act="full" title="ملء الشاشة" aria-label="ملء الشاشة" aria-pressed="false"><span aria-hidden="true">⛶</span><span class="bd-lbl">ملء الشاشة</span></button>
    </div>
  </div>
  <form class="bd-linkform" hidden>
    <input type="text" inputmode="url" dir="ltr" placeholder="https://" aria-label="الرابط" autocomplete="off" />
    <button type="submit" class="bd-btn bd-primary">أضف</button>
  </form>
  <nav class="bd-crumbs" aria-label="مكانك"></nav>
  <div class="bd-stage" tabindex="0" aria-label="اللوح">
    <div class="bd-world" dir="ltr">
      <svg class="bd-arrows" aria-hidden="true"><defs><marker id="bd-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" /></marker></defs></svg>
    </div>
    <p class="bd-empty" hidden></p>
    <div class="bd-selbar" hidden>
      <div class="bd-swatches" role="group" aria-label="لون البطاقة"></div>
      <button type="button" class="bd-btn" data-act="dup">كرّر</button>
      <button type="button" class="bd-btn bd-danger" data-act="del">احذف</button>
    </div>
    <div class="bd-toast" role="status" hidden></div>
  </div>
  <div class="bd-foot">
    <span>محفوظ على هذا الجهاز فقط. انقله لجهاز آخر بملف:</span>
    <button type="button" class="bd-btn" data-act="export">صدّر نسخة</button>
    <button type="button" class="bd-btn" data-act="import">استورد نسخة</button>
  </div>
  <input type="file" class="bd-file" accept="image/*" multiple hidden />
  <input type="file" class="bd-import" accept="application/json,.json" hidden />
  <details class="bd-help">
    <summary>طريقة الاستعمال</summary>
    <ul>
      <li>اسحب الخلفية لتتحرك، وكبّر بإصبعين أو بـ Ctrl مع عجلة الفأرة.</li>
      <li>اضغط البطاقة مرة لتختارها، ومرة ثانية لتكتب فيها.</li>
      <li>اسحب أي بطاقة فوق عمود لترتّبها داخله، واسحبها خارجه لتحرّرها.</li>
      <li>اسحب صورة إلى اللوح أو الصقها، والصق رابطاً أو نصاً ليصير بطاقة.</li>
      <li>بطاقة «لوح» تفتح لوحاً جديداً داخلها لتقسيم المشروع.</li>
      <li>كل شيء محفوظ في متصفحك على هذا الجهاز فقط. صدّر نسخة لتحفظها أو تنقلها.</li>
    </ul>
  </details>
</div>
