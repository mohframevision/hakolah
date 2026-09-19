package bh.mohframevision.hakolah;

import android.app.Activity;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

// يجيب data.js.11ty.js/app-data.json.11ty.js نفسه — نفس مصدر الموقع بالضبط،
// فأي مطعم يُضاف باللوحة يوصل هنا تلقائياً بدون أي تحديث للتطبيق نفسه.
// يخزّن آخر نسخة ناجحة بملف محلي عشان يشتغل التطبيق أوفلاين بآخر بيانات وصلته.
//
// بدون كلاسات مجهولة (anonymous) ولا lambdas هنا عمداً — d8 بهذي البيئة يفشل
// عليها (نفس مشكلة StudyApp الموثّقة)، فكل شي كلاس علوي حقيقي.
class HakolahApi {
    // مصدر واحد للنطاق — ItemAdapter يستخدم نفس الثابت لبناء روابط "التفاصيل"
    // بدل ما يكرّر نفس السلسلة النصية بملف ثانٍ
    static final String ORIGIN = "https://mohframevision.github.io/hakolah/";
    private static final String DATA_URL = ORIGIN + "app-data.json";
    private static final String CACHE_FILE = "hakolah-data-cache.json";

    interface Callback {
        void onSuccess(JSONObject data, boolean fromCache);
        void onError(String message);
    }

    // Activity لا Context عمداً: الاستدعاء الوحيد فعلياً هو runOnUiThread، اللي
    // Context العادي ما يوفّره — تضييق التوقيع هنا يمنع استثناء تحويل نوع
    // (ClassCastException) لاحقاً بدل ما يُكتشف وقت التصريف
    static void fetch(Activity activity, Callback callback) {
        new FetchThread(activity, callback).start();
    }

    private static String fetchFresh() {
        HttpURLConnection conn = null;
        try {
            conn = (HttpURLConnection) new URL(DATA_URL).openConnection();
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(15000);
            conn.setRequestMethod("GET");
            if (conn.getResponseCode() != 200) return null;
            String body = readStream(conn.getInputStream());
            // ردّ 200 بجسم فاضي (عطل شبكة/وسيط) لازم يُعامَل كفشل، لا كبيانات
            // طازجة — وإلا يمسح نسخة الكاش الجيدة بملف فاضٍ بلا داعٍ
            return body.isEmpty() ? null : body;
        } catch (Exception e) {
            return null;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private static String readStream(InputStream in) throws Exception {
        BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) sb.append(line);
        reader.close();
        return sb.toString();
    }

    private static void writeCache(Activity activity, String json) {
        FileOutputStream out = null;
        try {
            out = new FileOutputStream(new File(activity.getFilesDir(), CACHE_FILE));
            out.write(json.getBytes(StandardCharsets.UTF_8));
        } catch (Exception ignored) {
            // فشل الحفظ ما يوقف عرض البيانات الطازجة اللي وصلت لتوها
        } finally {
            if (out != null) {
                try {
                    out.close();
                } catch (Exception ignored2) {
                }
            }
        }
    }

    // ponytail: بدون قفل بين الكتابة والقراءة — تطبيق شخصي لمستخدم واحد،
    // احتمال تصادم كتابتين متزامنتين ضئيل جداً. لو صار التطبيق متعدد
    // المستخدمين/الخيوط فعلاً، أضف مزامنة على مستوى ملف الكاش هنا.
    private static String readCache(Activity activity) {
        File file = new File(activity.getFilesDir(), CACHE_FILE);
        if (!file.exists()) return null;
        try {
            return readStream(new FileInputStream(file));
        } catch (Exception e) {
            return null;
        }
    }

    // الشغل الفعلي بخيط منفصل: يجيب البيانات الطازجة، ولو فشل يرجع لآخر نسخة
    // محفوظة، ولو ما فيه ولا وحدة يبلّغ خطأ — كل هذا بخيط الخلفية، والتسليم
    // النهائي (deliver) يصير بخيط الواجهة عبر DeliverResult.
    private static class FetchThread extends Thread {
        private final Activity activity;
        private final Callback callback;

        FetchThread(Activity activity, Callback callback) {
            this.activity = activity;
            this.callback = callback;
        }

        @Override
        public void run() {
            String fresh = fetchFresh();
            if (fresh != null) {
                writeCache(activity, fresh);
                deliver(fresh, false);
                return;
            }
            String cached = readCache(activity);
            if (cached != null) {
                deliver(cached, true);
            } else {
                activity.runOnUiThread(
                        new DeliverResult(callback, null, "تعذّر تحميل البيانات — تأكد من الاتصال بالإنترنت", false));
            }
        }

        private void deliver(String json, boolean fromCache) {
            JSONObject obj;
            try {
                obj = new JSONObject(json);
            } catch (Exception e) {
                activity.runOnUiThread(new DeliverResult(callback, null, "بيانات غير صالحة", false));
                return;
            }
            activity.runOnUiThread(new DeliverResult(callback, obj, null, fromCache));
        }
    }

    // نتيجة الجلب، تُسلَّم بخيط الواجهة الرئيسي (runOnUiThread يحتاج Runnable
    // حقيقي — هذا الكلاس العلوي البديل عن Runnable مجهول)
    private static class DeliverResult implements Runnable {
        private final Callback callback;
        private final JSONObject data;
        private final String error;
        private final boolean fromCache;

        DeliverResult(Callback callback, JSONObject data, String error, boolean fromCache) {
            this.callback = callback;
            this.data = data;
            this.error = error;
            this.fromCache = fromCache;
        }

        @Override
        public void run() {
            if (error != null) {
                callback.onError(error);
            } else {
                callback.onSuccess(data, fromCache);
            }
        }
    }
}
