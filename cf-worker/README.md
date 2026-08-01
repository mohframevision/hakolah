# هكوله — Cloudflare Worker للإشعارات اليومية

Worker مستقل تماماً عن موقع هكوله الرئيسي (Eleventy). مهمته فقط: حفظ اشتراكات
الإشعارات (Push Subscriptions) وإرسال إشعار يومي بـ"اختيار اليوم" — كل هذا على
سيرفراتنا نحن فقط، بدون أي طرف ثالث يشوف بيانات المشتركين.

## خطوات الإعداد (مرة وحدة)

1. **إنشاء حساب Cloudflare مجاني**: [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)

2. **تثبيت الاعتماديات**:

   ```
   cd cf-worker
   npm install
   ```

3. **تسجيل الدخول من الطرفية** (يفتح المتصفح لتفويض الوصول لحسابك):

   ```
   npx wrangler login
   ```

4. **إنشاء KV Namespace** (مكان تخزين الاشتراكات):

   ```
   npx wrangler kv namespace create SUBSCRIPTIONS
   ```

   بيطبع لك `id` — انسخه وحطه مكان `REPLACE_WITH_KV_NAMESPACE_ID` بملف `wrangler.toml`.

5. **ضبط المفتاح الخاص (VAPID Private Key) كسر مشفّر** (لا يُكتب بأي ملف نصي):

   ```
   npx wrangler secret put VAPID_PRIVATE_KEY
   ```

   والصق القيمة اللي أعطاك إياها Claude عند توليد المفاتيح.

6. **نشر الـ Worker**:
   ```
   npx wrangler deploy
   ```
   بعد النشر، بيطبع لك رابط شكله `https://hakolah-push.<اسمك>.workers.dev` — هذا
   الرابط تحطه بملف `src/_data/push.js` بالموقع الرئيسي (`workerUrl`).

## الاختبار محلياً (اختياري)

```
npm run dev
```

## ملاحظة مهمة

هذا المجلد **منفصل تماماً** عن `npm run build` و`npm run lint` حق الموقع
الرئيسي — لا يؤثر عليهم ولا يتأثر بهم.
