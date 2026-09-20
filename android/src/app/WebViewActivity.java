package bh.mohframevision.hakolah;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ProgressBar;
import android.widget.TextView;

// أدوات "تجارب الذكاء الاصطناعي" (مولّد الألحان، محوّل الملفات، حاسبة
// المصاريف، اختبار الطباعة) منطقها مئات الأسطر جافاسكربت لكل أداة —
// إعادة كتابتها بالجافا مخاطرة انحراف سلوك حقيقية بلا فائدة، وWebView ميزة
// منصّة أصلية (بلا مكتبة خارجية) تفتح نفس الصفحة الحقيقية داخل التطبيق نفسه
// (لا متصفح خارجي منفصل) بنفس السلوك 100%. ponytail: لو صار مطلوباً أداء
// أصلي بحت لاحقاً، حاسبة المصاريف واختبار الطباعة أصغر مرشَّحين لإعادة كتابة.
public class WebViewActivity extends Activity implements View.OnClickListener {
    static final String EXTRA_TITLE = "title";
    static final String EXTRA_URL = "url";

    private WebView webView;

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
        ((TextView) findViewById(R.id.webviewTitle)).setText(title == null ? "" : title);
        findViewById(R.id.webviewCloseButton).setOnClickListener(this);

        ProgressBar progress = findViewById(R.id.webviewProgress);
        webView = findViewById(R.id.webview);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        webView.setWebViewClient(new LoadingClient(progress));
        if (url != null) webView.loadUrl(url);
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
