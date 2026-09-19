package bh.mohframevision.hakolah;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.text.Html;
import android.text.method.LinkMovementMethod;
import android.view.View;
import android.widget.TextView;

// عارض مقالات أصلي لأقسام "أدلة"/"أماكن" (hasDetailPages) — يعرض
// contentHtml (نفس HTML المولَّد من الماركداون بالموقع، بلا تغليف الصفحة)
// عبر Html.fromHtml الأصلي بأندرويد بدل WebView (لا حاجة لمحرك متصفح كامل
// لعنوان/فقرات/روابط/قوائم فقط — أقصى ما بمحتوى المقالات الحالي). هذا
// بالضبط ما كان ناقصاً واللي خلّى القسمين مخفيين مؤقتاً بالتطبيق.
public class ArticleActivity extends Activity implements View.OnClickListener {
    static final String EXTRA_TITLE = "title";
    static final String EXTRA_ICON = "icon";
    static final String EXTRA_CONTENT = "content";
    static final String EXTRA_DETAIL_URL = "detailUrl";

    private String title;
    private String detailUrl;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_article);

        title = getIntent().getStringExtra(EXTRA_TITLE);
        String icon = getIntent().getStringExtra(EXTRA_ICON);
        String contentHtml = getIntent().getStringExtra(EXTRA_CONTENT);
        detailUrl = getIntent().getStringExtra(EXTRA_DETAIL_URL);

        ((TextView) findViewById(R.id.articleHeaderTitle)).setText(title == null ? "" : title);
        TextView titleView = findViewById(R.id.articleTitle);
        titleView.setText((icon == null ? "⭐" : icon) + "  " + (title == null ? "" : title));

        TextView body = findViewById(R.id.articleBody);
        if (contentHtml != null && !contentHtml.isEmpty()) {
            body.setText(Html.fromHtml(contentHtml, Html.FROM_HTML_MODE_COMPACT));
            body.setMovementMethod(LinkMovementMethod.getInstance());
        }

        findViewById(R.id.articleCloseButton).setOnClickListener(this);
        findViewById(R.id.articleShareButton).setOnClickListener(this);
    }

    @Override
    public void onClick(View v) {
        int id = v.getId();
        if (id == R.id.articleCloseButton) {
            finish();
        } else if (id == R.id.articleShareButton) {
            SoundPlayer.playClick(this);
            share();
        }
    }

    // نفس buildShareText/buildShareUrl بالموقع: العنوان + لاحقة عربية ثابتة +
    // رابط المقال الفعلي (detailUrl موجود دوماً هنا)
    private void share() {
        String url = HakolahApi.ORIGIN + (detailUrl == null ? "" : detailUrl);
        String text = (title == null ? "" : title) + " — على موقع هكوله 👇\n" + url;
        Intent send = new Intent(Intent.ACTION_SEND);
        send.setType("text/plain");
        send.putExtra(Intent.EXTRA_TEXT, text);
        try {
            startActivity(Intent.createChooser(send, "مشاركة"));
        } catch (Exception ignored) {
        }
    }
}
