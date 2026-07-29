# هكوله — موقع كل شيء مفيد في مكان واحد

موقع مبني بـ [Eleventy](https://www.11ty.dev) (مولّد مواقع ثابتة) مع لوحة تحكم [Sveltia CMS](https://github.com/sveltia/sveltia-cms)
تسمح بإضافة/تعديل المحتوى بدون لمس أي كود، ونشر تلقائي عبر GitHub Actions على GitHub Pages. يجمع:

- 🔗 روابط وأدوات مفيدة
- 💳 حسابات واشتراكات مفيدة
- 🍽️ مطاعم
- 🛍️ متاجر
- 🎥 صناع محتوى
- ❤️ مفضلة (تُحفظ محلياً في المتصفح عبر `localStorage`، بدون تسجيل دخول حالياً)

## تشغيل الموقع محلياً (للتطوير)

يحتاج [Node.js](https://nodejs.org) مثبّت على جهازك (نسخة LTS).

```bash
npm install
npm start
```

يفتح الموقع على `http://localhost:8080`. أي تعديل بملفات `src/` ينعكس فوراً.

للبناء فقط بدون تشغيل خادم (نفس اللي يسويه GitHub Actions تلقائياً):

```bash
npm run build
```

الناتج يطلع بمجلد `_site/` (غير مرفوع لـ Git، يُبنى تلقائياً في كل نشر).

## هيكل المشروع

```
.eleventy.js              إعدادات Eleventy
package.json              الاعتماديات وأوامر npm
.github/workflows/deploy.yml   يبني وينشر الموقع تلقائياً على GitHub Pages بعد أي push

src/
  _includes/base.njk       القالب المشترك (هيدر/فوتر/نافيجيشن) لكل الصفحات
  _data/sections.js         عناوين/أيقونات الأقسام الخمسة
  _data/buildVersion.js     رقم نسخة يُولَّد تلقائياً بكل بناء (لكسر الكاش، بدون تدخل يدوي)
  index.njk                 الصفحة الرئيسية
  links-tools.njk / accounts.njk / restaurants.njk / stores.njk / creators.njk   صفحات الأقسام
  favorites.njk              صفحة المفضلة
  about.md / privacy-policy.md   صفحتان نصيتان (قابلتان للتعديل من لوحة التحكم)
  data.js.11ty.js            يبني js/data.js تلقائياً من محتوى المجموعات أدناه
  version.json.11ty.js       يبني version.json تلقائياً (نسخة كل بناء)

  restaurants/*.md          كل مطعم = ملف مستقل (عنوان، وصف، تصنيفات، روابط)
  stores/*.md                كل متجر = ملف مستقل
  links-tools/*.md           كل أداة/رابط = ملف مستقل
  accounts/*.md               كل حساب/اشتراك = ملف مستقل
  creators/*.md                كل صانع محتوى = ملف مستقل

  css/style.css              التنسيقات المشتركة (RTL + وضع ليلي + أنيميشنات)
  js/main.js                  البحث، الفلاتر، المفضلة، القائمة، التحديث التلقائي

  admin/index.html            تحميل لوحة تحكم Sveltia CMS
  admin/config.yml            تعريف كل "المجموعات" وحقولها للوحة التحكم
```

## إضافة/تعديل المحتوى — بدون كود

### الطريقة الأسهل: لوحة التحكم

1. افتح `https://mohframevision.github.io/hakolah/admin/` (بعد نشر هذا التحديث).
2. سجّل دخولك برمز (Token) من GitHub (Settings → Developer settings → Personal access tokens،
   صلاحية `repo` كافية).
3. اختر المجموعة (مطاعم/متاجر/أدوات/حسابات/صناع محتوى)، اضغط **New** لإضافة عنصر جديد
   عبر فورم (اسم، أيقونة، وصف، تصنيفات، روابط)، أو افتح عنصر موجود لتعديله.
4. اضغط **Save** ثم **Publish** — الموقع يتحدث تلقائياً خلال دقيقة أو دقيقتين (GitHub Action
   يبني وينشر تلقائياً).

قسم "صفحات الموقع الثابتة" في نفس اللوحة يتيح تعديل نص صفحتي "عن الموقع" و"سياسة الخصوصية"
بفورم كتابة (Markdown) بدون لمس HTML.

### الطريقة اليدوية (لمن يفضّل الكود)

كل عنصر هو ملف مستقل داخل `src/<القسم>/اسم-الملف.md`، مثلاً `src/restaurants/joodys.md`:

```md
---
title: "جوديز (Joody's)"
icon: "🥪"
desc: "وصف قصير."
categories: ["سندويشات", "وجبات سريعة"]
links: {"maps": "https://maps.app.goo.gl/...", "instagram": "https://instagram.com/..."}
---
```

أضف ملف `.md` جديد بنفس الشكل داخل مجلد القسم المناسب (`restaurants`, `stores`, `links-tools`,
`accounts`, `creators`) وارفعه (commit + push) — يظهر تلقائياً بالموقع بعد النشر، بدون الحاجة
لتعديل `js/data.js` (يُبنى تلقائياً).

## النشر على GitHub Pages (عبر GitHub Actions)

المستودع مربوط مسبقاً بـ [github.com/mohframevision/hakolah](https://github.com/mohframevision/hakolah).
إعداد GitHub Pages مطلوب مرة واحدة فقط:

**Settings → Pages → Build and deployment → Source** اختر **GitHub Actions** (بدل "Deploy from a branch").

بعدها أي `push` لفرع `main` (سواء منك مباشرة أو من لوحة التحكم) يشغّل `.github/workflows/deploy.yml`
تلقائياً: يبني الموقع بـ Eleventy وينشره على GitHub Pages. لا يحتاج أي سيرفر أو تكلفة شهرية —
GitHub Actions مجاني بالكامل للمستودعات العامة (Public).

## خطوات لاحقة (عند الرغبة)

- **تسجيل الدخول + مزامنة المفضلة بين الأجهزة**: يحتاج قاعدة بيانات (مثل Supabase المجاني في البداية) — حالياً المفضلة تعمل بدون تسجيل دخول عبر `localStorage` في نفس المتصفح فقط.
- **تفعيل الإعلانات**: التسجيل في [Google AdSense](https://adsense.google.com)، ثم لصق كود `adsbygoogle` في `src/_includes/base.njk` وفي `.ad-slot`.
- **ربط دومين خاص**: شراء دومين وربطه بإعدادات GitHub Pages.
- **استبدال المحتوى التجريبي** المتبقي (حسابات/متاجر/أدوات/صناع محتوى) بمحتوى حقيقي — إما عبر لوحة التحكم أو يدوياً.
