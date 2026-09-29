package bh.mohframevision.hakolah;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.res.Configuration;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

// أدوات "تجارب الذكاء الاصطناعي" (محوّل الملفات، حاسبة المصاريف، اختبار
// الطباعة) و"صوتيات هكوله" منطقها مئات الأسطر جافاسكربت لكل أداة —
// إعادة كتابتها بالجافا مخاطرة انحراف سلوك حقيقية بلا فائدة، وWebView ميزة
// منصّة أصلية (بلا مكتبة خارجية) تفتح نفس الصفحة الحقيقية داخل التطبيق نفسه
// (لا متصفح خارجي منفصل) بنفس السلوك 100%. ponytail: لو صار مطلوباً أداء
// أصلي بحت لاحقاً، حاسبة المصاريف واختبار الطباعة أصغر مرشَّحين لإعادة كتابة.
public class WebViewActivity extends Activity implements View.OnClickListener {
    static final String EXTRA_TITLE = "title";
    static final String EXTRA_URL = "url";
    // تبويب الشريط السفلي النشط — لو موجود، الشاشة تعرض الشريط (صوتيات هكوله)
    static final String EXTRA_TAB = "tab";

    private static final int REQ_FILE = 41;
    private static final int REQ_MIC = 42;

    private WebView webView;
    // طلبات الصفحة المعلّقة لين يرد المستخدم (اختيار ملف / إذن الميكروفون)
    private ValueCallback<Uri[]> pendingFiles;
    private PermissionRequest pendingMic;

    // صوتيات هكوله: ?app=1 يخفي هيدر الموقع وفوتره (للتطبيق شريطه الخاص)
    static Intent soundsIntent(Context c) {
        Intent intent = new Intent(c, WebViewActivity.class);
        intent.putExtra(EXTRA_TITLE, c.getString(R.string.sounds_title));
        intent.putExtra(EXTRA_URL, Lang.siteUrl(c, "sounds.html") + "?app=1");
        intent.putExtra(EXTRA_TAB, BottomNav.SOUNDS);
        return intent;
    }

    @Override
    protected void attachBaseContext(Context newBase) {
        super.attachBaseContext(Prefs.wrapThemeContext(newBase));
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_webview);

        String title = getIntent().getStringExtra(EXTRA_TITLE);
        String url = getIntent().getStringExtra(EXTRA_URL);
        String tab = getIntent().getStringExtra(EXTRA_TAB);
        ((TextView) findViewById(R.id.webviewTitle)).setText(title == null ? "" : title);
        findViewById(R.id.webviewCloseButton).setOnClickListener(this);
        if (tab != null) {
            LinearLayout nav = findViewById(R.id.bottomNav);
            BottomNav.attach(this, nav, tab);
            applyOrientation(getResources().getConfiguration());
        }

        ProgressBar progress = findViewById(R.id.webviewProgress);
        webView = findViewById(R.id.webview);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        // الصوتيات تشغّل الصوت بعد ضغطة المستخدم أصلاً — بدون هذا بعض إصدارات
        // WebView ترفض AudioContext حتى مع الضغط
        settings.setMediaPlaybackRequiresUserGesture(false);
        // حفظ الملفات المصدَّرة (WebView ما ينزّل روابط blob:) — لشاشة الصوتيات فقط
        if (tab != null) webView.addJavascriptInterface(new SaveBridge(this), "HakolahApp");
        webView.setWebViewClient(new LoadingClient(progress));
        webView.setWebChromeClient(new PageChrome(this));
        // كيبورد موصول بالجوال: الأزرار توصل للصفحة فقط لو الـWebView هو المركّز
        webView.setFocusableInTouchMode(true);
        webView.requestFocus();
        if (url != null) webView.loadUrl(url);
    }

    // شاشات التبويبات (صوتيات) بالوضع الأفقي: شريط العنوان والشريط السفلي وشريط
    // الحالة كلها تأكل ارتفاعاً ثميناً وتغطي البيانو، فنخفيها ونعرض الصفحة بملء
    // الشاشة. الرجوع بزر/إيماءة النظام، وعودة الجوال عمودياً تعيدها. ما نعيد
    // إنشاء الشاشة (configChanges بالمانيفست) فما ينقطع العزف.
    // ملاحظة: getResources() هنا ملفوف بـwrapThemeContext (نسخة ثابتة من الإعدادات
    // وقت الإنشاء)، فما يتحدّث مع التدوير — نقرأ الاتجاه من Configuration الحدث نفسه
    private void applyOrientation(Configuration config) {
        boolean land = config.orientation == Configuration.ORIENTATION_LANDSCAPE;
        int vis = land ? View.GONE : View.VISIBLE;
        findViewById(R.id.webviewBar).setVisibility(vis);
        findViewById(R.id.bottomNav).setVisibility(vis);
        getWindow().getDecorView().setSystemUiVisibility(land
                ? View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                : View.SYSTEM_UI_FLAG_VISIBLE);
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        if (getIntent().getStringExtra(EXTRA_TAB) != null) applyOrientation(newConfig);
    }

    // كلاس علوي مسمّى (مو مجهول) — د8 يفشل على الكلاسات المجهولة بهذي البيئة.
    // يمنع تسرّب التصفح خارج نطاق الموقع: أي رابط لنفس نطاق هكوله يُفتح داخل
    // الـWebView نفسه بشكل طبيعي، وأي رابط خارجي (مثلاً لو الأداة فيها رابط
    // توثيق خارجي) يُفتح بمتصفح/تطبيق خارجي حقيقي بدل التصفح داخل تطبيقنا
    private static class LoadingClient extends WebViewClient {
        private final ProgressBar progress;

        LoadingClient(ProgressBar progress) {
            this.progress = progress;
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            progress.setVisibility(View.GONE);
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if ("mohframevision.github.io".equals(uri.getHost())) return false;
            try {
                view.getContext().startActivity(new Intent(Intent.ACTION_VIEW, uri));
            } catch (Exception ignored) {
            }
            return true;
        }
    }

    // "صوتك" بالصوتيات: تسجيل من الميكروفون (getUserMedia) واختيار ملف صوت
    // (<input type=file>) — WebView يرفض الاثنين بصمت لو ما في WebChromeClient يتولاهم
    private static class PageChrome extends WebChromeClient {
        private final WebViewActivity activity;

        PageChrome(WebViewActivity activity) {
            this.activity = activity;
        }

        @Override
        public void onPermissionRequest(PermissionRequest request) {
            activity.onMicRequest(request);
        }

        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            return activity.openFileChooser(callback, params);
        }
    }

    void onMicRequest(PermissionRequest request) {
        boolean wantsMic = false;
        for (String r : request.getResources()) {
            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) wantsMic = true;
        }
        if (!wantsMic) {
            request.deny();
            return;
        }
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            request.grant(new String[] {PermissionRequest.RESOURCE_AUDIO_CAPTURE});
        } else {
            pendingMic = request;
            requestPermissions(new String[] {Manifest.permission.RECORD_AUDIO}, REQ_MIC);
        }
    }

    boolean openFileChooser(ValueCallback<Uri[]> callback, WebChromeClient.FileChooserParams params) {
        if (pendingFiles != null) pendingFiles.onReceiveValue(null);
        pendingFiles = callback;
        try {
            startActivityForResult(params.createIntent(), REQ_FILE);
            return true;
        } catch (Exception e) {
            pendingFiles = null;
            return false;
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        if (requestCode != REQ_MIC || pendingMic == null) return;
        if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) {
            pendingMic.grant(new String[] {PermissionRequest.RESOURCE_AUDIO_CAPTURE});
        } else {
            pendingMic.deny(); // الصفحة تعرض "لم يُسمح باستخدام الميكروفون"
        }
        pendingMic = null;
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQ_FILE && pendingFiles != null) {
            pendingFiles.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            pendingFiles = null;
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public void onClick(View v) {
        if (v.getId() == R.id.webviewCloseButton) {
            finish();
            overridePendingTransition(0, 0);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
            overridePendingTransition(0, 0);
        }
    }
}
