package bh.mohframevision.hakolah;

import android.app.Activity;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.widget.Toast;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

// WebView ما ينزّل روابط blob: (ملف يولّده الجافاسكربت داخل الصفحة)، فمصدّرات
// صوتيات هكوله (WAV/MP3/MIDI/فيديو) تسلّم الملف هنا بـbase64 ونحفظه بمجلد
// التنزيلات. يُضاف للـWebView شاشة الصوتيات فقط. الحدود أدناه لأن أي إطار
// بالصفحة (حتى إعلان) يقدر يستدعي الواجهة: اسم ونوع وحجم محدودة، فلا تُستعمل
// لكتابة ملفات عشوائية.
class SaveBridge {
    private static final int MAX_BYTES = 40 * 1024 * 1024;
    private final Activity activity;

    SaveBridge(Activity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public boolean save(String name, String mime, String base64) {
        try {
            if (name == null || !name.matches("[A-Za-z0-9._-]{1,80}\\.(wav|mp3|mid|mp4|webm)")) return false;
            if (mime == null || !(mime.startsWith("audio/") || mime.startsWith("video/"))) return false;
            if (base64 == null || base64.length() > MAX_BYTES * 4L / 3 + 16) return false;
            byte[] data = Base64.decode(base64, Base64.DEFAULT);
            OutputStream out;
            if (Build.VERSION.SDK_INT >= 29) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
                values.put(MediaStore.MediaColumns.MIME_TYPE, mime);
                values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Hakolah");
                Uri uri = activity.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) return false;
                out = activity.getContentResolver().openOutputStream(uri);
            } else {
                // قبل أندرويد 10 الكتابة بالتنزيلات العامة تحتاج إذن تخزين؛ مجلد التطبيق الخارجي بلا إذن
                File dir = activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                out = new FileOutputStream(new File(dir, name));
            }
            out.write(data);
            out.close();
            activity.runOnUiThread(new ToastTask(activity, activity.getString(R.string.saved_to_downloads)));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    // كلاس مسمّى — د8 يفشل على المجهولة بهذي البيئة
    private static class ToastTask implements Runnable {
        private final Activity activity;
        private final String message;

        ToastTask(Activity activity, String message) {
            this.activity = activity;
            this.message = message;
        }

        @Override
        public void run() {
            Toast.makeText(activity, message, Toast.LENGTH_LONG).show();
        }
    }
}
