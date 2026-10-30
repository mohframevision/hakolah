package bh.mohframevision.hakolah;

import android.app.Activity;
import android.content.Context;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

// الرئيسية: بحث شامل، مربعات الأقسام (نمط تطبيقات الخدمات مثل كريم)،
// "اختيار اليوم" من كل أقسام الأماكن، و"جديد على هكوله". قائمة القسم نفسها
// صارت SectionActivity. هنا الجلب الوحيد للبيانات، ومنه cachedSections لباقي الشاشات.
// بلا كلاسات مجهولة ولا lambdas — d8 بهذي البيئة يفشل عليها.
public class MainActivity extends Activity implements View.OnClickListener, HakolahApi.Callback, CardStackView.Listener {
    private View loadingView;
    private View errorView;
    private TextView errorText;
    private View homeScroll;
    private LinearLayout categoryGrid;
    private android.widget.FrameLayout dailyHolder;
    private CardStackView dailyStack;
    private TextView dailyCount;
    private LinearLayout newRow;
    private String createdLang;
    private final List<JSONObject> dailyItems = new ArrayList<>();
    private final List<String> dailySlugs = new ArrayList<>();
    private final List<JSONObject> newItems = new ArrayList<>();
    private final List<String> newSlugs = new ArrayList<>();

    private JSONObject sections;
    private JSONArray sectionOrder;
    private long lastFetchTime;
    private boolean deepLinkHandled;
    private static final long STALE_AFTER_MS = 30 * 60 * 1000;
    private static final int NEW_COUNT = 10;

    static JSONObject cachedSections;
    static JSONObject cachedTagsEn;
    static JSONArray cachedSectionOrder;

    @Override
    protected void attachBaseContext(Context newBase) {
        super.attachBaseContext(Prefs.wrapThemeContext(newBase));
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        Ui.edgeToEdge(this, getColor(R.color.bg), getColor(R.color.surface));
        createdLang = Prefs.getLang(this);
        loadingView = findViewById(R.id.loadingView);
        errorView = findViewById(R.id.errorView);
        errorText = findViewById(R.id.errorText);
        homeScroll = findViewById(R.id.homeScroll);
        categoryGrid = findViewById(R.id.categoryGrid);
        dailyHolder = findViewById(R.id.dailyHolder);
        newRow = findViewById(R.id.newRow);
        View daily = getLayoutInflater().inflate(R.layout.daily_header, dailyHolder, false);
        dailyHolder.addView(daily);
        dailyStack = daily.findViewById(R.id.dailyStack);
        dailyCount = daily.findViewById(R.id.dailyCount);
        dailyStack.setListener(this);
        findViewById(R.id.retryButton).setOnClickListener(this);
        findViewById(R.id.settingsButton).setOnClickListener(this);
        View pill = findViewById(R.id.searchPill);
        pill.setOnClickListener(this);
        Touch.springy(pill, 0.97f);
        BottomNav.attach(this, findViewById(R.id.bottomNav), BottomNav.HOME);
        Ui.display((TextView) findViewById(R.id.homeGreeting));
        Ui.display((TextView) daily.findViewById(R.id.dailyTitle));
        Ui.display((TextView) findViewById(R.id.newTitle));
        SoundPlayer.warmUp();
        loadData();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (!Prefs.getLang(this).equals(createdLang)) {
            recreate();
            return;
        }
        greet();
        if (sections != null && System.currentTimeMillis() - lastFetchTime > STALE_AFTER_MS) loadData();
    }

    // التاريخ والتحية وسؤال البحث حسب ساعة اليوم — تتحدث كل رجوع للشاشة.
    // نصوص فقط: ما ندّعي إن مكاناً مفتوح (الساعات نص حر، وما نخترع معلومة)
    private void greet() {
        java.util.Calendar now = java.util.Calendar.getInstance();
        int h = now.get(java.util.Calendar.HOUR_OF_DAY);
        java.util.Locale locale = new java.util.Locale(Prefs.getLang(this));
        ((TextView) findViewById(R.id.homeDate)).setText(
                new java.text.SimpleDateFormat("EEEE d MMMM", locale).format(now.getTime()));
        ((TextView) findViewById(R.id.homeGreeting)).setText(
                h >= 5 && h < 12 ? R.string.greet_morning : h >= 12 && h < 17 ? R.string.greet_afternoon : R.string.greet_evening);
        ((TextView) findViewById(R.id.searchPill)).setText(
                h >= 5 && h < 11 ? R.string.ask_breakfast : h >= 11 && h < 16 ? R.string.ask_lunch : h >= 16 ? R.string.ask_dinner : R.string.ask_night);
    }

    private void loadData() {
        // تحديث بالخلفية: المعروض يبقى، وفشله ما يمسحه
        if (sections == null) {
            loadingView.setVisibility(View.VISIBLE);
            errorView.setVisibility(View.GONE);
        }
        HakolahApi.fetch(this, this);
    }

    @Override
    public void onSuccess(JSONObject data, boolean fromCache) {
        lastFetchTime = System.currentTimeMillis();
        JSONObject newSections = data.optJSONObject("sections");
        JSONArray newOrder = data.optJSONArray("sectionOrder");
        if (newSections == null || newOrder == null) {
            if (sections == null) onError(getString(R.string.no_content));
            return;
        }
        sections = newSections;
        sectionOrder = newOrder;
        cachedSections = sections;
        cachedSectionOrder = sectionOrder;
        cachedTagsEn = data.optJSONObject("tagsEn");
        findViewById(R.id.offlineNote).setVisibility(fromCache ? View.VISIBLE : View.GONE);
        buildGrid();
        buildDaily();
        buildNew();
        loadingView.setVisibility(View.GONE);
        errorView.setVisibility(View.GONE);
        homeScroll.setVisibility(View.VISIBLE);
        if (!deepLinkHandled) {
            deepLinkHandled = true;
            handleDeepLink();
        }
    }

    @Override
    public void onError(String message) {
        if (sections != null) return;
        errorText.setText(message);
        loadingView.setVisibility(View.GONE);
        errorView.setVisibility(View.VISIBLE);
    }

    // رابط هكوله (مثلاً من الواتساب) يفتح القسم أو العنصر المطلوب فوق الرئيسية
    private void handleDeepLink() {
        Uri data = getIntent().getData();
        if (data == null || data.getPath() == null) return;
        String path = data.getPath();
        String rel = path.startsWith("/hakolah/") ? path.substring("/hakolah/".length()) : path.replaceFirst("^/", "");
        if (rel.startsWith("en/")) rel = rel.substring(3);
        if (rel.isEmpty() || !rel.endsWith(".html")) return;
        if (rel.contains("/")) {
            String[] parts = rel.split("/", 2);
            JSONObject sec = sections.optJSONObject(parts[0]);
            JSONArray items = sec == null ? null : sec.optJSONArray("items");
            String slug = parts[1].substring(0, parts[1].length() - 5);
            for (int i = 0; items != null && i < items.length(); i++) {
                JSONObject item = items.optJSONObject(i);
                if (item != null && slug.equals(item.optString("id", ""))) {
                    ItemAdapter.open(this, item, parts[0]);
                    return;
                }
            }
            return;
        }
        String slug = rel.substring(0, rel.length() - 5);
        if (isBrowsable(sections.optJSONObject(slug))) {
            startActivity(SectionActivity.intent(this, slug, data.getQueryParameter("q")));
            overridePendingTransition(0, 0);
        }
    }

    static boolean isBrowsable(JSONObject section) {
        JSONArray items = section == null ? null : section.optJSONArray("items");
        return items != null && items.length() > 0;
    }

    // قسم أماكن = عناصره لها إحداثيات (مطاعم، كافيهات، متاجر...) — بعكس الروابط
    // والمقالات والأدوات. يتقدّم بالشبكة ومنه "اختيار اليوم"
    static boolean isPlaceSection(JSONObject section) {
        JSONArray items = section == null ? null : section.optJSONArray("items");
        for (int i = 0; items != null && i < items.length(); i++) {
            JSONObject item = items.optJSONObject(i);
            if (item != null && item.has("lat") && !item.isNull("lat")) return true;
        }
        return false;
    }

    // ترتيب الموقع، مع تقديم أقسام الأماكن (السؤال الأول: وين آكل/أروح؟)
    static List<String> orderedSlugs() {
        List<String> places = new ArrayList<>();
        List<String> others = new ArrayList<>();
        for (int i = 0; cachedSectionOrder != null && i < cachedSectionOrder.length(); i++) {
            String slug = cachedSectionOrder.optString(i);
            JSONObject sec = cachedSections.optJSONObject(slug);
            if (!isBrowsable(sec)) continue;
            if (isPlaceSection(sec)) places.add(slug);
            else others.add(slug);
        }
        places.addAll(others);
        return places;
    }

    // ---- مربعات الأقسام: 3 بكل صف ----
    private void buildGrid() {
        categoryGrid.removeAllViews();
        List<String> slugs = orderedSlugs();
        LinearLayout row = null;
        for (int i = 0; i < slugs.size(); i++) {
            if (i % 3 == 0) {
                row = new LinearLayout(this);
                LinearLayout.LayoutParams rlp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
                if (i > 0) rlp.topMargin = dp(10);
                categoryGrid.addView(row, rlp);
            }
            row.addView(tile(slugs.get(i)), tileParams(i % 3));
        }
        // صف ناقص: فراغات بنفس العرض عشان المربعات ما تتمدد
        if (row != null) for (int i = slugs.size() % 3; i > 0 && i < 3; i++) row.addView(new View(this), tileParams(i));
    }

    private LinearLayout.LayoutParams tileParams(int col) {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f);
        if (col > 0) lp.setMarginStart(dp(10));
        return lp;
    }

    private View tile(String slug) {
        JSONObject sec = sections.optJSONObject(slug);
        LinearLayout t = new LinearLayout(this);
        t.setOrientation(LinearLayout.VERTICAL);
        t.setGravity(Gravity.CENTER_HORIZONTAL);
        t.setBackgroundResource(R.drawable.tile_bg);
        t.setPadding(dp(6), dp(14), dp(6), dp(12));
        t.setTag("sec:" + slug);
        t.setOnClickListener(this);
        t.setContentDescription(Lang.title(this, sec));
        Touch.springy(t, 0.94f);
        t.addView(Ui.iconTile(this, Icons.section(slug), 52, getColor(R.color.field), getColor(R.color.text)));
        TextView label = Ui.text(this, shortTitle(Lang.title(this, sec)), 13.5f, getColor(R.color.text), true);
        label.setTextAlignment(View.TEXT_ALIGNMENT_CENTER);
        label.setMaxLines(2);
        label.setPadding(0, dp(8), 0, 0);
        t.addView(label, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        return t;
    }

    // "مطاعم البحرين" → "مطاعم": كلمة "البحرين" مكررة بكل مربع وتضيّق المكان
    static String shortTitle(String title) {
        return title.replace(" البحرين", "").replace(" in Bahrain", "").replace("Bahrain ", "");
    }

    // ---- "اختيار اليوم": ثابت لليوم، من كل أقسام الأماكن ----
    private void buildDaily() {
        List<JSONObject> pool = new ArrayList<>();
        List<String> poolSlugs = new ArrayList<>();
        for (String slug : orderedSlugs()) {
            JSONObject sec = sections.optJSONObject(slug);
            if (!isPlaceSection(sec)) continue;
            JSONArray items = sec.optJSONArray("items");
            for (int i = 0; i < items.length(); i++) {
                JSONObject item = items.optJSONObject(i);
                if (item == null) continue;
                pool.add(item);
                poolSlugs.add(slug);
            }
        }
        java.util.Calendar cal = java.util.Calendar.getInstance();
        long seed = cal.get(java.util.Calendar.YEAR) * 10000L + (cal.get(java.util.Calendar.MONTH) + 1) * 100L + cal.get(java.util.Calendar.DAY_OF_MONTH);
        java.util.Random rnd = new java.util.Random(seed);
        for (int i = pool.size() - 1; i > 0; i--) {
            int j = rnd.nextInt(i + 1);
            JSONObject t = pool.get(i);
            pool.set(i, pool.get(j));
            pool.set(j, t);
            String ts = poolSlugs.get(i);
            poolSlugs.set(i, poolSlugs.get(j));
            poolSlugs.set(j, ts);
        }
        dailyItems.clear();
        dailySlugs.clear();
        List<View> views = new ArrayList<>();
        for (int i = 0; i < Math.min(6, pool.size()); i++) {
            dailyItems.add(pool.get(i));
            dailySlugs.add(poolSlugs.get(i));
            views.add(buildDailyCard(pool.get(i), poolSlugs.get(i), i));
        }
        // ارتفاع موحّد = أطول بطاقة (خط كبير بإعدادات الجوال كان يقص الزر)
        int width = getResources().getDisplayMetrics().widthPixels - dp(32);
        int tallest = 0;
        for (View v : views) {
            v.measure(View.MeasureSpec.makeMeasureSpec(width, View.MeasureSpec.EXACTLY), View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED));
            tallest = Math.max(tallest, v.getMeasuredHeight());
        }
        for (View v : views) v.getLayoutParams().height = tallest;
        dailyStack.setCards(views);
        dailyHolder.setVisibility(views.size() >= 2 ? View.VISIBLE : View.GONE);
    }

    // بطاقة "اختيار اليوم": سطح أبيض هادي بنفس لغة باقي البطاقات (كانت تدرّجاً
    // أخضر يسرق العين من كل الشاشة). البطاقة كلها تفتح صفحة المكان
    private View buildDailyCard(JSONObject item, String slug, int index) {
        JSONObject section = sections.optJSONObject(slug);
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackgroundResource(R.drawable.daily_card_bg);
        card.setElevation(dp(3));
        int pad = dp(20);
        card.setPadding(pad, pad, pad, pad);
        card.setLayoutParams(new android.widget.FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        LinearLayout top = new LinearLayout(this);
        top.setGravity(Gravity.CENTER_VERTICAL);
        top.addView(Ui.iconTile(this, Icons.item(item, slug), 48, getColor(R.color.field), getColor(R.color.text)));
        TextView badge = Ui.text(this, shortTitle(Lang.title(this, section)), 13, getColor(R.color.text_muted), false);
        LinearLayout.LayoutParams blp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        blp.setMarginStart(dp(12));
        top.addView(badge, blp);
        card.addView(top);

        TextView title = Ui.text(this, Lang.title(this, item), 20, getColor(R.color.text), false);
        Ui.display(title);
        title.setMaxLines(1);
        title.setEllipsize(android.text.TextUtils.TruncateAt.END);
        title.setPadding(0, dp(14), 0, 0);
        card.addView(title);

        TextView desc = Ui.text(this, Lang.desc(this, item), 14, getColor(R.color.text_muted), false);
        desc.setMaxLines(3);
        desc.setEllipsize(android.text.TextUtils.TruncateAt.END);
        desc.setPadding(0, dp(4), 0, 0);
        card.addView(desc);

        card.setTag("daily:" + index);
        card.setOnClickListener(this);
        return card;
    }

    @Override
    public void onTopChanged(int index, int count) {
        dailyCount.setText((index + 1) + " / " + count);
    }

    // ---- "جديد على هكوله": أحدث ما أضيف (addedAt)، بلا المخفي من القائمة ----
    private void buildNew() {
        newItems.clear();
        newSlugs.clear();
        for (String slug : orderedSlugs()) {
            JSONArray items = sections.optJSONObject(slug).optJSONArray("items");
            for (int i = 0; i < items.length(); i++) {
                JSONObject item = items.optJSONObject(i);
                if (item == null || item.isNull("addedAt") || item.optString("addedAt", "").isEmpty() || item.optBoolean("hideFromNewest")) continue;
                // إدراج مرتّب تنازلياً بالتاريخ (بلا Comparator: يكسر d8 هنا)
                String date = item.optString("addedAt");
                int at = newItems.size();
                while (at > 0 && newItems.get(at - 1).optString("addedAt").compareTo(date) < 0) at--;
                newItems.add(at, item);
                newSlugs.add(at, slug);
            }
        }
        while (newItems.size() > NEW_COUNT) {
            newItems.remove(newItems.size() - 1);
            newSlugs.remove(newSlugs.size() - 1);
        }
        newRow.removeAllViews();
        for (int i = 0; i < newItems.size(); i++) newRow.addView(newCard(i));
        int vis = newItems.isEmpty() ? View.GONE : View.VISIBLE;
        findViewById(R.id.newTitle).setVisibility(vis);
        findViewById(R.id.newScroll).setVisibility(vis);
        Ui.scrollToStart((android.widget.HorizontalScrollView) findViewById(R.id.newScroll));
    }

    private View newCard(int i) {
        JSONObject item = newItems.get(i);
        JSONObject sec = sections.optJSONObject(newSlugs.get(i));
        LinearLayout c = new LinearLayout(this);
        c.setOrientation(LinearLayout.VERTICAL);
        c.setBackgroundResource(R.drawable.tile_bg);
        c.setPadding(dp(14), dp(14), dp(14), dp(14));
        c.setTag("new:" + i);
        c.setOnClickListener(this);
        Touch.springy(c, 0.95f);
        c.addView(Ui.iconTile(this, Icons.item(item, newSlugs.get(i)), 44, getColor(R.color.field), getColor(R.color.text)));
        TextView title = Ui.text(this, Lang.title(this, item), 15, getColor(R.color.text), true);
        title.setMaxLines(2);
        title.setPadding(0, dp(10), 0, 0);
        c.addView(title, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        TextView where = Ui.text(this, shortTitle(Lang.title(this, sec)), 12.5f, getColor(R.color.text_muted), false);
        where.setMaxLines(1);
        c.addView(where);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(dp(150), dp(150));
        lp.setMarginEnd(dp(10));
        c.setLayoutParams(lp);
        return c;
    }

    // نص البحث لكل عنصر باللغتين: الاسم والوصف + التصنيفات + الكلمات المفتاحية
    // (روابط وأدوات) + أسماء أصناف المنيو — نفس نطاق بحث الموقع. يُحسب مرة
    // ويُخزَّن بالعنصر نفسه بدل إعادة بنائه مع كل حرف
    static String searchText(JSONObject item) {
        String cached = item.optString("_search", "");
        if (!cached.isEmpty()) return cached;
        StringBuilder sb = new StringBuilder();
        for (String k : new String[]{"title", "desc", "title_en", "desc_en", "keywords"}) sb.append(item.optString(k, "")).append(' ');
        JSONArray tags = item.optJSONArray("tags");
        for (int i = 0; tags != null && i < tags.length(); i++) {
            String t = tags.optString(i);
            sb.append(t).append(' ');
            if (cachedTagsEn != null) sb.append(cachedTagsEn.optString(t, "")).append(' ');
        }
        JSONArray menu = item.optJSONArray("menuItems");
        for (int i = 0; menu != null && i < menu.length(); i++) {
            JSONObject m = menu.optJSONObject(i);
            if (m != null) sb.append(m.optString("name", "")).append(' ').append(m.optString("name_en", "")).append(' ');
        }
        String out = sb.toString();
        try {
            item.put("_search", out);
        } catch (Exception ignored) {
        }
        return out;
    }

    private int dp(float v) {
        return Ui.dp(this, v);
    }

    @Override
    public void onClick(View v) {
        int id = v.getId();
        if (id == R.id.retryButton) {
            loadData();
            return;
        }
        if (id == R.id.settingsButton) {
            Touch.haptic(v, Touch.TAP);
            SettingsPanel.show(this);
            return;
        }
        if (id == R.id.searchPill) {
            Touch.feedback(v, Touch.TAP, SoundPlayer.OPEN);
            startActivity(new android.content.Intent(this, SearchActivity.class));
            overridePendingTransition(0, 0);
            return;
        }
        Object tag = v.getTag();
        if (!(tag instanceof String)) return;
        String value = (String) tag;
        if (value.startsWith("sec:")) {
            Touch.feedback(v, Touch.TAP, SoundPlayer.OPEN);
            startActivity(SectionActivity.intent(this, value.substring(4), null));
            overridePendingTransition(0, 0);
        } else if (value.startsWith("daily:")) {
            int i = Integer.parseInt(value.substring(6));
            if (i < dailyItems.size()) {
                Touch.feedback(v, Touch.TAP, SoundPlayer.OPEN);
                ItemAdapter.open(this, dailyItems.get(i), dailySlugs.get(i), v);
            }
        } else if (value.startsWith("new:")) {
            int i = Integer.parseInt(value.substring(4));
            Touch.feedback(v, Touch.TAP, SoundPlayer.OPEN);
            ItemAdapter.open(this, newItems.get(i), newSlugs.get(i), v);
        } else if (value.startsWith("url:") || value.startsWith("tel:")) {
            Touch.feedback(v, Touch.TAP, SoundPlayer.TAP);
            LinkButtons.handleClick(this, value);
        }
    }
}
