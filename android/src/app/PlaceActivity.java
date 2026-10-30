package bh.mohframevision.hakolah;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.text.Html;
import android.text.method.LinkMovementMethod;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.HorizontalScrollView;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import org.json.JSONArray;
import org.json.JSONObject;

// صفحة المكان (مطعم/كافيه/متجر/ورشة/مكان): كانت ناقصة كلياً — الكرت بالقائمة
// كان كل ما يعرفه التطبيق، والمنيو بالأسعار (أهم ما يميّز هكوله) ما كان يظهر
// أبداً، والمطاعم اللي لها مقال كانت تفقد زر الاتصال والخريطة. النمط من خرائط
// قوقل وYelp: رأس بالاسم، صف أزرار إجراءات متساوية، صفوف معلومات بأيقونات،
// ثم المنيو والنبذة. العنصر يوصل كاملاً بالـIntent (يتحمّل موت العملية).
public class PlaceActivity extends Activity implements View.OnClickListener, View.OnLongClickListener {
    static final String EXTRA_ITEM = "item";
    static final String EXTRA_SECTION = "section";
    private static final int MENU_PREVIEW = 6;

    private JSONObject item;
    private String section;
    private ImageView favBtn;

    static Intent intent(Context c, JSONObject item, String section) {
        Intent i = new Intent(c, PlaceActivity.class);
        i.putExtra(EXTRA_ITEM, item.toString());
        i.putExtra(EXTRA_SECTION, section);
        return i;
    }

    @Override
    protected void attachBaseContext(Context newBase) {
        super.attachBaseContext(Prefs.wrapThemeContext(newBase));
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            item = new JSONObject(getIntent().getStringExtra(EXTRA_ITEM));
        } catch (Exception e) {
            finish();
            return;
        }
        section = getIntent().getStringExtra(EXTRA_SECTION);

        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(getColor(R.color.bg));
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setLayoutDirection(View.LAYOUT_DIRECTION_LOCALE);
        root.setPadding(0, 0, 0, dp(32));
        scroll.addView(root);

        root.addView(buildHero());
        View actions = buildActions();
        if (actions != null) root.addView(actions);
        buildInfo(root);
        buildMenu(root);
        buildAbout(root);
        setContentView(scroll);
        // المحتوى يطلع قطعة قطعة بعد تمدد الكرت (نفس ظهور المحتوى بالمرجع)
        for (int i = 0; i < root.getChildCount(); i++) {
            View part = root.getChildAt(i);
            part.setAlpha(0f);
            part.setTranslationY(dp(18));
            part.animate().alpha(1f).translationY(0f).setStartDelay(90 + i * 45L).setDuration(380)
                    .setInterpolator(new android.view.animation.DecelerateInterpolator(2f)).start();
        }
        Ui.edgeToEdge(this, getColor(R.color.bg), getColor(R.color.bg));
    }

    // ---- الرأس: رجوع / مشاركة / مفضلة، ثم الأيقونة والاسم والوصف والتصنيفات ----
    private View buildHero() {
        LinearLayout hero = new LinearLayout(this);
        hero.setOrientation(LinearLayout.VERTICAL);
        hero.setPadding(dp(8), dp(8), dp(8), dp(8));

        LinearLayout bar = new LinearLayout(this);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.addView(iconButton(R.drawable.ic_arrow_back, "back", getString(R.string.back)));
        bar.addView(new View(this), new LinearLayout.LayoutParams(0, 1, 1f));
        bar.addView(iconButton(R.drawable.ic_share, "share", getString(R.string.share_title)));
        favBtn = iconButton(R.drawable.ic_favorite_outline, "fav", getString(R.string.nav_favorites));
        bar.addView(favBtn);
        applyFav();
        hero.addView(bar);

        LinearLayout body = new LinearLayout(this);
        body.setOrientation(LinearLayout.VERTICAL);
        body.setPadding(dp(16), 0, dp(16), 0);
        body.addView(Ui.iconTile(this, Icons.item(item, section), 64, getColor(R.color.field), getColor(R.color.text)));
        TextView title = Ui.text(this, Lang.title(this, item), 27, getColor(R.color.text), false);
        Ui.display(title);
        title.setPadding(0, dp(12), 0, 0);
        body.addView(title);
        String desc = Lang.desc(this, item);
        if (!desc.isEmpty()) {
            TextView d = Ui.text(this, desc, 15, getColor(R.color.text_muted), false);
            d.setPadding(0, dp(4), 0, 0);
            body.addView(d);
        }
        JSONArray tags = item.optJSONArray("tags");
        if (tags != null && tags.length() > 0) {
            HorizontalScrollView hs = new HorizontalScrollView(this);
            hs.setHorizontalScrollBarEnabled(false);
            LinearLayout row = new LinearLayout(this);
            for (int i = 0; i < tags.length(); i++) {
                TextView pill = Ui.text(this, Lang.tag(this, tags.optString(i)), 13, getColor(R.color.text_muted), false);
                pill.setBackground(Ui.rounded(this, getColor(R.color.field), 14));
                pill.setPadding(dp(12), dp(4), dp(12), dp(4));
                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
                lp.setMarginEnd(dp(6));
                row.addView(pill, lp);
            }
            hs.addView(row);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            lp.topMargin = dp(14);
            body.addView(hs, lp);
            Ui.scrollToStart(hs);
        }
        hero.addView(body);
        return hero;
    }

    private ImageView iconButton(int res, String tag, String desc) {
        ImageView b = new ImageView(this);
        b.setImageResource(res);
        b.setColorFilter(getColor(R.color.text));
        b.setPadding(dp(12), dp(12), dp(12), dp(12));
        b.setBackgroundResource(R.drawable.row_bg);
        b.setContentDescription(desc);
        b.setTag(tag);
        b.setOnClickListener(this);
        Touch.springy(b, 0.85f);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(dp(48), dp(48));
        lp.setMarginStart(dp(4));
        b.setLayoutParams(lp);
        return b;
    }

    // ---- صف الإجراءات: أزرار متساوية العرض (نفس خرائط قوقل) ----
    private View buildActions() {
        LinearLayout row = new LinearLayout(this);
        row.setPadding(dp(8), dp(18), dp(8), dp(6));
        String phone = firstPhone();
        if (!phone.isEmpty()) addAction(row, R.drawable.ic_call, getString(R.string.btn_call), "tel:" + phone);
        String maps = mapsUrl();
        if (!maps.isEmpty()) addAction(row, R.drawable.ic_location_on, getString(R.string.place_directions), "url:" + maps);
        JSONObject links = item.optJSONObject("links");
        if (links != null) {
            String menu = links.optString("menu", "");
            if (!menu.isEmpty()) addAction(row, R.drawable.ic_menu_book, getString(R.string.place_menu_link), "url:" + menu);
            String web = links.optString("website", "");
            if (!web.isEmpty()) addAction(row, R.drawable.ic_language, getString(R.string.btn_visit), "url:" + web);
            String ig = links.optString("instagram", "");
            if (!ig.isEmpty()) addAction(row, R.drawable.ic_photo_camera, getString(R.string.btn_instagram), "url:" + ig);
        }
        return row.getChildCount() == 0 ? null : row;
    }

    // أول إجراء (الاتصال عادة) هو الأساسي: دائرة خضراء ممتلئة — الوحيد الملوّن
    // بالصفحة. الباقي دوائر محايدة
    private void addAction(LinearLayout row, int icon, String label, String tag) {
        boolean primary = row.getChildCount() == 0;
        LinearLayout a = new LinearLayout(this);
        a.setOrientation(LinearLayout.VERTICAL);
        a.setGravity(Gravity.CENTER_HORIZONTAL);
        a.setPadding(0, dp(4), 0, dp(4));
        a.setBackgroundResource(R.drawable.row_bg);
        a.setTag(tag);
        a.setOnClickListener(this);
        a.setContentDescription(label);
        Touch.springy(a, 0.92f);
        ImageView i = new ImageView(this);
        i.setImageResource(icon);
        i.setColorFilter(primary ? 0xFFFFFFFF : getColor(R.color.text));
        i.setBackgroundResource(primary ? R.drawable.circle_solid_bg : R.drawable.tonal_circle);
        i.setPadding(dp(14), dp(14), dp(14), dp(14));
        i.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        a.addView(i, new LinearLayout.LayoutParams(dp(52), dp(52)));
        TextView t = Ui.text(this, label, 12.5f, getColor(R.color.text), false);
        t.setTextAlignment(View.TEXT_ALIGNMENT_CENTER);
        t.setMaxLines(1);
        t.setPadding(0, dp(6), 0, 0);
        a.addView(t);
        row.addView(a, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
    }

    // ---- صفوف المعلومات ----
    private void buildInfo(LinearLayout root) {
        LinearLayout box = block(root, null);
        String hours = Lang.hours(this, item);
        if (!hours.isEmpty()) infoRow(box, R.drawable.ic_schedule, hours, null, null);
        JSONObject links = item.optJSONObject("links");
        String phones = links == null ? "" : links.optString("phone", "");
        // الموقع يعرض زراً لكل رقم بين الفواصل — التطبيق كان يأخذ الأول فقط
        for (String p : phones.split(",")) {
            p = p.trim();
            if (!p.isEmpty()) infoRow(box, R.drawable.ic_call, Ui.ltr(p), "tel:" + p, getString(R.string.place_copy_hint));
        }
        JSONObject meat = item.optJSONObject("meatSource");
        if (meat != null) {
            String text = Lang.en(this) && !meat.optString("text_en", "").isEmpty() ? meat.optString("text_en") : meat.optString("text", "");
            if (!text.isEmpty()) {
                String checked = meat.optString("checked", "");
                String line = getString(R.string.place_meat) + ": " + text
                        + (checked.isEmpty() ? "" : "\n" + getString(R.string.place_checked, Ui.ltr(checked)));
                infoRow(box, R.drawable.ic_menu_book, line, null, null);
            }
        }
        if (box.getChildCount() == 0) root.removeView((View) box.getParent());
    }

    private void infoRow(LinearLayout box, int icon, CharSequence text, String tag, String longHint) {
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(dp(12), dp(12), dp(12), dp(12));
        ImageView i = new ImageView(this);
        i.setImageResource(icon);
        i.setColorFilter(getColor(tag == null ? R.color.text_muted : R.color.brand_accent));
        row.addView(i, new LinearLayout.LayoutParams(dp(22), dp(22)));
        TextView t = Ui.text(this, text, 15, getColor(R.color.text), false);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        lp.setMarginStart(dp(16));
        row.addView(t, lp);
        if (tag != null) {
            row.setBackgroundResource(R.drawable.row_bg);
            row.setTag(tag);
            row.setOnClickListener(this);
            if (tag.startsWith("tel:")) row.setOnLongClickListener(this);
        }
        box.addView(row);
    }

    // ---- المنيو والأسعار: أول بضعة أصناف هنا، والكامل بشاشة فيها بحث وترتيب ----
    private void buildMenu(LinearLayout root) {
        JSONArray menu = item.optJSONArray("menuItems");
        if (menu == null || menu.length() == 0) return;
        LinearLayout box = block(root, getString(R.string.place_menu) + "  ·  " + getString(R.string.menu_count, menu.length()));
        int n = Math.min(MENU_PREVIEW, menu.length());
        for (int i = 0; i < n; i++) box.addView(MenuActivity.row(this, menu.optJSONObject(i)));
        if (menu.length() > n) {
            TextView all = Ui.text(this, getString(R.string.place_menu_all, menu.length()), 15, getColor(R.color.white), true);
            all.setBackgroundResource(R.drawable.btn_pill_primary);
            all.setTextAlignment(View.TEXT_ALIGNMENT_CENTER);
            all.setPadding(dp(16), dp(12), dp(16), dp(12));
            all.setTag("menu");
            all.setOnClickListener(this);
            Touch.springy(all);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            lp.topMargin = dp(10);
            box.addView(all, lp);
        }
    }

    private void buildAbout(LinearLayout root) {
        String html = Lang.content(this, item);
        if (html.isEmpty()) return;
        LinearLayout box = block(root, getString(R.string.place_about));
        TextView body = Ui.text(this, Html.fromHtml(flattenTables(html), Html.FROM_HTML_MODE_COMPACT), 15.5f, getColor(R.color.text), false);
        body.setLinkTextColor(getColor(R.color.brand_accent));
        body.setMovementMethod(LinkMovementMethod.getInstance());
        body.setPadding(dp(12), 0, dp(12), 0);
        box.addView(body);
        String detail = Lang.detailPath(this, item);
        if (!detail.isEmpty()) {
            TextView site = Ui.text(this, getString(R.string.place_on_site), 14, getColor(R.color.brand_accent), true);
            site.setPadding(dp(12), dp(16), dp(12), dp(8));
            site.setTag("url:" + Lang.detailUrl(this, item));
            site.setOnClickListener(this);
            box.addView(site);
        }
    }

    // Html.fromHtml يتجاهل الجداول فتلتصق خلاياها ببعض — كل صف سطر، والخلايا بفاصل
    static String flattenTables(String html) {
        return html.replaceAll("(?i)</t[dh]>\\s*<t[dh][^>]*>", " · ")
                .replaceAll("(?i)<tr[^>]*>", "<br>")
                .replaceAll("(?i)</?(table|thead|tbody|tr|td|th)[^>]*>", "");
    }

    // كتلة بعنوان اختياري: بطاقة سطح بزوايا 20dp بعرض الشاشة مع هامش
    private LinearLayout block(LinearLayout root, String heading) {
        LinearLayout wrap = new LinearLayout(this);
        wrap.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams wlp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        wlp.setMargins(dp(16), dp(14), dp(16), 0);
        if (heading != null) {
            TextView h = Ui.text(this, heading, 17, getColor(R.color.text), true);
            h.setPadding(dp(4), 0, dp(4), dp(8));
            wrap.addView(h);
        }
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setBackgroundResource(R.drawable.card_bg);
        box.setPadding(dp(4), dp(8), dp(4), dp(8));
        wrap.addView(box);
        root.addView(wrap, wlp);
        return box;
    }

    // ---- بيانات ----
    private String firstPhone() {
        JSONObject links = item.optJSONObject("links");
        return links == null ? "" : links.optString("phone", "").split(",")[0].trim();
    }

    private String mapsUrl() {
        JSONObject links = item.optJSONObject("links");
        String m = links == null ? "" : links.optString("maps", "");
        return m.isEmpty() ? item.optString("mapsUrl", "") : m;
    }

    private void applyFav() {
        boolean on = Prefs.isFavorite(this, section, item.optString("id", ""));
        favBtn.setImageResource(on ? R.drawable.ic_favorite_fill : R.drawable.ic_favorite_outline);
        favBtn.setColorFilter(on ? 0xFFE0245E : getColor(R.color.text));
    }

    private int dp(float v) {
        return Ui.dp(this, v);
    }

    @Override
    public void onClick(View v) {
        String tag = (String) v.getTag();
        if ("back".equals(tag)) {
            finish();
            overridePendingTransition(R.anim.stay, R.anim.place_out);
        } else if ("share".equals(tag)) {
            Touch.feedback(v, Touch.TAP, SoundPlayer.TAP);
            ItemAdapter.share(this, item, section);
        } else if ("fav".equals(tag)) {
            String id = item.optString("id", "");
            Prefs.toggleFavorite(this, section, id);
            boolean on = Prefs.isFavorite(this, section, id);
            Touch.feedback(v, on ? Touch.TOGGLE_ON : Touch.TOGGLE_OFF, on ? SoundPlayer.ON : SoundPlayer.OFF);
            applyFav();
        } else if ("menu".equals(tag)) {
            Touch.feedback(v, Touch.TAP, SoundPlayer.OPEN);
            startActivity(MenuActivity.intent(this, item));
            overridePendingTransition(0, 0);
        } else if (tag != null) {
            Touch.feedback(v, Touch.TAP, SoundPlayer.TAP);
            LinkButtons.handleClick(this, tag);
        }
    }

    // ضغطة طويلة على الرقم = نسخ (نفس زر النسخ بالموقع)
    @Override
    public boolean onLongClick(View v) {
        String number = ((String) v.getTag()).substring(4);
        ClipboardManager cm = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
        cm.setPrimaryClip(ClipData.newPlainText("phone", number));
        Touch.haptic(v, Touch.CONFIRM);
        Toast.makeText(this, R.string.copied, Toast.LENGTH_SHORT).show();
        return true;
    }

    @Override
    public void onBackPressed() {
        super.onBackPressed();
        overridePendingTransition(R.anim.stay, R.anim.place_out);
    }
}
