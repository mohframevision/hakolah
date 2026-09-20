package bh.mohframevision.hakolah;

import android.animation.ValueAnimator;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AbsListView;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

// كلاسات مجهولة (anonymous inner classes) تكسر d8 بهذي البيئة (نفس المشكلة
// الموثّقة بمشروع StudyApp) — كل شي هنا كلاس علوي أو يطبّق الواجهة مباشرة
// بدل new Interface() { ... }.
public class MainActivity extends Activity implements View.OnClickListener, HakolahApi.Callback, TextWatcher, AbsListView.OnScrollListener {
    private ProgressBar loadingView;
    private View errorView;
    private TextView errorText;
    private ListView itemList;
    private View emptyView;
    private TextView emptyResetButton;
    private LinearLayout bottomNav;
    private LinearLayout sectionTabs;
    private View headerBar;
    private TextView headerTitle;
    private EditText searchBox;
    private LinearLayout filterChips;
    private TextView nearMeButton;
    private LinearLayout alphabetIndex;

    // نفس فكرة initHeaderScroll بالموقع (يخفي الهيدر أثناء النزول بالقائمة
    // ويرجّعه عند الصعود) — بلا CoordinatorLayout (يحتاج مكتبة)، بـ
    // ValueAnimator يعدّل ارتفاع الهيدر مباشرة فيرجع الـFrameLayout الموزون
    // تحته يتمدد تلقائياً (سلوك weight عادي بـLinearLayout)
    private int headerHeight = -1;
    private boolean headerVisible = true;
    private int lastFirstVisibleItem = 0;
    private boolean isHeaderAnimating = false;

    private JSONObject sections;
    private JSONArray sectionOrder;
    private String currentSlug;
    private JSONArray currentItems = new JSONArray();
    private String currentTag;
    private String searchQuery = "";
    private boolean sortByDistance;
    private Double userLat;
    private Double userLng;
    private long lastFetchTime;
    private boolean deepLinkHandled;
    private static final int LOCATION_PERMISSION_REQUEST = 1;
    // بعد هذي المدة بالخلفية (لا إغلاق كامل، مجرد استئناف)، نعيد الجلب —
    // نفس هدف "المحتوى يتزامن فوراً" لكن لحالة استئناف التطبيق لا فتحه فقط
    private static final long STALE_AFTER_MS = 30 * 60 * 1000;

    @Override
    protected void attachBaseContext(Context newBase) {
        super.attachBaseContext(Prefs.wrapThemeContext(newBase));
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        loadingView = findViewById(R.id.loadingView);
        errorView = findViewById(R.id.errorView);
        errorText = findViewById(R.id.errorText);
        itemList = findViewById(R.id.itemList);
        emptyView = findViewById(R.id.emptyView);
        emptyResetButton = findViewById(R.id.emptyResetButton);
        bottomNav = findViewById(R.id.bottomNav);
        sectionTabs = findViewById(R.id.sectionTabs);
        headerBar = findViewById(R.id.headerBar);
        headerTitle = findViewById(R.id.headerTitle);
        searchBox = findViewById(R.id.searchBox);
        filterChips = findViewById(R.id.filterChips);
        nearMeButton = findViewById(R.id.nearMeButton);
        alphabetIndex = findViewById(R.id.alphabetIndex);
        findViewById(R.id.retryButton).setOnClickListener(this);
        nearMeButton.setOnClickListener(this);
        emptyResetButton.setOnClickListener(this);
        searchBox.addTextChangedListener(this);
        itemList.setOnScrollListener(this);
        buildMainNav();

        loadData();
    }

    // ---- AbsListView.OnScrollListener (إخفاء/إظهار الهيدر حسب اتجاه النزول) ----
    @Override
    public void onScrollStateChanged(AbsListView view, int scrollState) {}

    @Override
    public void onScroll(AbsListView view, int firstVisibleItem, int visibleItemCount, int totalItemCount) {
        // تجاهل أثناء الأنيميشن — طي/فتح الهيدر يغيّر ارتفاعه فيكبر/يصغر
        // FrameLayout الموزون تحته (weight=1)، وهذا وحده يطلق onScroll زائفة
        // (ListView تعيد حساب مقاييسها لما تتمدد) تبان كأنها "المستخدم رجع
        // للأعلى" وتوقف الطي بمنتصفه — من هنا "يتحرك شوي بس ما ينطوي كامل"
        if (isHeaderAnimating) return;
        if (firstVisibleItem == 0) {
            showHeader();
        } else if (firstVisibleItem > lastFirstVisibleItem) {
            hideHeader();
        } else if (firstVisibleItem < lastFirstVisibleItem) {
            showHeader();
        }
        lastFirstVisibleItem = firstVisibleItem;
    }

    private void hideHeader() {
        if (!headerVisible) return;
        headerVisible = false;
        animateHeaderHeight(headerBar.getHeight(), 0);
    }

    private void showHeader() {
        if (headerVisible) return;
        headerVisible = true;
        if (headerHeight <= 0) headerHeight = headerBar.getHeight();
        animateHeaderHeight(headerBar.getHeight(), headerHeight);
    }

    private void animateHeaderHeight(int from, int to) {
        if (headerHeight <= 0 && from > 0) headerHeight = from;
        isHeaderAnimating = true;
        ValueAnimator animator = ValueAnimator.ofInt(from, to);
        animator.setDuration(220);
        animator.addUpdateListener(new HeaderHeightUpdater(headerBar));
        animator.addListener(new HeaderAnimEndListener(this));
        animator.start();
    }

    // كلاس علوي مسمّى (مو مجهول) — د8 يفشل على الكلاسات المجهولة بهذي البيئة
    private static class HeaderHeightUpdater implements ValueAnimator.AnimatorUpdateListener {
        private final View header;

        HeaderHeightUpdater(View header) {
            this.header = header;
        }

        @Override
        public void onAnimationUpdate(ValueAnimator animation) {
            ViewGroup.LayoutParams lp = header.getLayoutParams();
            lp.height = (int) animation.getAnimatedValue();
            header.setLayoutParams(lp);
        }
    }

    // يرفع علم isHeaderAnimating لحد نهاية الأنيميشن فعلياً — هذا بالضبط ما
    // يمنع onScroll الزائفة (الناتجة عن تمدد ListView أثناء الطي) من مقاطعته
    private static class HeaderAnimEndListener implements android.animation.Animator.AnimatorListener {
        private final MainActivity activity;

        HeaderAnimEndListener(MainActivity activity) {
            this.activity = activity;
        }

        @Override
        public void onAnimationStart(android.animation.Animator animation) {}

        @Override
        public void onAnimationEnd(android.animation.Animator animation) {
            activity.isHeaderAnimating = false;
        }

        @Override
        public void onAnimationCancel(android.animation.Animator animation) {
            activity.isHeaderAnimating = false;
        }

        @Override
        public void onAnimationRepeat(android.animation.Animator animation) {}
    }
    // ------------------------------------------------------------------

    @Override
    protected void onResume() {
        super.onResume();
        // يغطّي حالة "التطبيق كان بالخلفية طويلاً" — onCreate/loadData()
        // الأصلية تغطّي فقط الفتح من الصفر
        if (sections != null && System.currentTimeMillis() - lastFetchTime > STALE_AFTER_MS) {
            loadData();
        }
    }

    @Override
    public void onClick(View v) {
        int id = v.getId();
        if (id == R.id.retryButton) {
            loadData();
            return;
        }
        if (id == R.id.nearMeButton) {
            SoundPlayer.playClick(this);
            toggleNearMe();
            return;
        }
        if (id == R.id.emptyResetButton) {
            SoundPlayer.playClick(this);
            clearSearchAndFilter();
            return;
        }
        Object tag = v.getTag();
        if (tag instanceof Integer) {
            // شريط التصفح الأبجدي — يقفز لأول عنصر يبدأ بالحرف المضغوط
            itemList.setSelection((Integer) tag);
            return;
        }
        if (!(tag instanceof String)) return;
        String value = (String) tag;
        if (value.startsWith("chip:")) {
            SoundPlayer.playClick(this);
            selectTag(value.substring(5));
        } else if (HOME_TAG.equals(value)) {
            SoundPlayer.playClick(this);
            resetToHome();
        } else if (PICKER_TAG.equals(value)) {
            SoundPlayer.playClick(this);
            startActivity(new android.content.Intent(this, PickerActivity.class));
            overridePendingTransition(0, 0);
        } else if (FAVORITES_TAG.equals(value)) {
            SoundPlayer.playClick(this);
            startActivity(new android.content.Intent(this, FavoritesActivity.class));
            overridePendingTransition(0, 0);
        } else if (SETTINGS_TAG.equals(value)) {
            SoundPlayer.playClick(this);
            SettingsPanel.show(this);
        } else {
            selectSection(value);
        }
    }

    private static final String HOME_TAG = "__home__";
    private static final String PICKER_TAG = "__picker__";
    private static final String FAVORITES_TAG = "__favorites__";
    private static final String SETTINGS_TAG = "__settings__";

    // 4 وجهات ثابتة بس — لا تتغيّر مع البيانات، تُبنى مرة وحدة. انظر
    // sectionTabs للأقسام الفعلية (بيانات القسم القابلة للتغيّر، تبقى إيموجي)
    private void buildMainNav() {
        addMainNavTab(R.drawable.ic_home, "الرئيسية", HOME_TAG);
        addMainNavFab(PICKER_TAG);
        addMainNavTab(R.drawable.ic_favorite_fill, "المفضلة", FAVORITES_TAG);
        addMainNavTab(R.drawable.ic_settings, "الإعدادات", SETTINGS_TAG);
    }

    private void addMainNavTab(int iconRes, String label, String tag) {
        View tab = getLayoutInflater().inflate(R.layout.nav_tab_icon, bottomNav, false);
        android.widget.ImageView iconView = tab.findViewById(R.id.tabIcon);
        iconView.setImageResource(iconRes);
        boolean active = HOME_TAG.equals(tag);
        iconView.setColorFilter(getColor(active ? R.color.brand_accent : R.color.text_muted));
        TextView labelView = tab.findViewById(R.id.tabLabel);
        labelView.setText(label);
        if (active) labelView.setTextColor(getColor(R.color.brand_accent));
        tab.setTag(tag);
        tab.setOnClickListener(this);
        LinearLayout.LayoutParams lp = (LinearLayout.LayoutParams) tab.getLayoutParams();
        lp.width = 0;
        lp.weight = 1;
        tab.setLayoutParams(lp);
        bottomNav.addView(tab);
    }

    // "اختار لي" مرفوعة كدائرة بارزة فوق حافة الشريط — نفس فكرة زر "+" بمنتصف
    // شريط Beli السفلي، بدل أيقونة مسطّحة زي بقية التبويبات
    private void addMainNavFab(String tag) {
        View tab = getLayoutInflater().inflate(R.layout.nav_tab_fab, bottomNav, false);
        tab.setTag(tag);
        tab.setOnClickListener(this);
        LinearLayout.LayoutParams lp = (LinearLayout.LayoutParams) tab.getLayoutParams();
        lp.width = 0;
        lp.weight = 1;
        tab.setLayoutParams(lp);
        bottomNav.addView(tab);
    }

    // زر "الرئيسية" بالشريط السفلي — نرجّع القسم الحالي لحالته الافتراضية
    // (بلا بحث ولا فلترة ولا ترتيب مسافة) بدل ما يكون بلا أثر فعلي
    private void resetToHome() {
        if (currentSlug != null) selectSection(currentSlug);
    }

    // ---- TextWatcher (بحث حيّ، نفس debounce-less input بالموقع) ----
    @Override
    public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

    @Override
    public void onTextChanged(CharSequence s, int start, int before, int count) {}

    @Override
    public void afterTextChanged(Editable s) {
        searchQuery = s.toString();
        applyFilters();
    }
    // ------------------------------------------------------------

    private void loadData() {
        showLoading();
        HakolahApi.fetch(this, this);
    }

    // ---- HakolahApi.Callback ----
    @Override
    public void onSuccess(JSONObject data, boolean fromCache) {
        lastFetchTime = System.currentTimeMillis();
        sections = data.optJSONObject("sections");
        sectionOrder = data.optJSONArray("sectionOrder");
        // مرجع ساكن يقرأه PickerActivity مباشرة (تطبيق مستخدم واحد بعملية
        // واحدة) بدل إعادة جلب/تحليل نفس JSON من جديد
        cachedSections = sections;
        cachedSectionOrder = sectionOrder;
        String firstBrowsable = firstBrowsableSlug();
        if (sections == null || firstBrowsable == null) {
            showError("لا يوجد محتوى حالياً");
            return;
        }
        buildSectionTabs();
        if (!deepLinkHandled) {
            deepLinkHandled = true;
            if (handleDeepLink()) return;
        }
        selectSection(firstBrowsable);
        if (fromCache) {
            headerTitle.append(" (بيانات محفوظة، بلا اتصال)");
        }
    }

    // رابط هكوله (مثلاً شاركه صديق بالواتساب) يفتح التطبيق مباشرة بدل
    // المتصفح ويوديك للقسم/العنصر الصحيح — بلا autoVerify لحد نشر فعلي
    // بمتجر Play (انظر تعليق AndroidManifest.xml). يرجع true لو تعامل مع
    // الرابط فعلياً (فيفتح مقال/أداة بدل القسم الافتراضي).
    private boolean handleDeepLink() {
        Uri data = getIntent().getData();
        if (data == null) return false;
        String path = data.getPath();
        if (path == null) return false;
        String rel = path.startsWith("/hakolah/") ? path.substring("/hakolah/".length()) : path.replaceFirst("^/", "");
        if (rel.isEmpty() || !rel.endsWith(".html")) return false;

        if (rel.contains("/")) {
            String[] parts = rel.split("/", 2);
            return openDeepLinkedItem(parts[0], parts[1].substring(0, parts[1].length() - 5));
        }

        String section = rel.substring(0, rel.length() - 5);
        if (sections == null || !sections.has(section)) return false;
        selectSection(section);
        String q = data.getQueryParameter("q");
        if (q != null && !q.isEmpty()) searchBox.setText(q);
        return true;
    }

    private boolean openDeepLinkedItem(String section, String slug) {
        JSONObject sec = sections == null ? null : sections.optJSONObject(section);
        JSONArray items = sec == null ? null : sec.optJSONArray("items");
        if (items == null) return false;
        for (int i = 0; i < items.length(); i++) {
            JSONObject item = items.optJSONObject(i);
            if (item == null || !slug.equals(item.optString("id", ""))) continue;
            Intent intent = "ai-experiments".equals(section)
                    ? webViewIntentFor(item)
                    : articleIntentFor(item);
            startActivity(intent);
            overridePendingTransition(0, 0);
            selectSection(section);
            return true;
        }
        return false;
    }

    private Intent articleIntentFor(JSONObject item) {
        Intent intent = new Intent(this, ArticleActivity.class);
        intent.putExtra(ArticleActivity.EXTRA_TITLE, item.optString("title", ""));
        intent.putExtra(ArticleActivity.EXTRA_ICON, item.optString("icon", "⭐"));
        intent.putExtra(ArticleActivity.EXTRA_CONTENT, item.optString("contentHtml", ""));
        intent.putExtra(ArticleActivity.EXTRA_DETAIL_URL, item.optString("detailUrl", ""));
        return intent;
    }

    private Intent webViewIntentFor(JSONObject item) {
        Intent intent = new Intent(this, WebViewActivity.class);
        intent.putExtra(WebViewActivity.EXTRA_TITLE, item.optString("title", ""));
        intent.putExtra(WebViewActivity.EXTRA_URL, HakolahApi.ORIGIN + item.optString("detailUrl", ""));
        return intent;
    }

    @Override
    public void onError(String message) {
        showError(message);
    }
    // -----------------------------

    static JSONObject cachedSections;
    static JSONArray cachedSectionOrder;

    // كل قسم فيه عناصر يظهر بالتنقّل — أقسام "أدلة"/"أماكن" (hasDetailPages)
    // كانت تُخفى قبل وجود ArticleActivity (عارض مقالات أصلي)، الآن تظهر مثل
    // أي قسم. الاسم باقٍ من تلك المرحلة؛ يتحقق فقط من وجود عناصر فعلية
    static boolean isBrowsable(JSONObject section) {
        JSONArray items = section == null ? null : section.optJSONArray("items");
        return items != null && items.length() > 0;
    }

    private String firstBrowsableSlug() {
        if (sectionOrder == null || sections == null) return null;
        for (int i = 0; i < sectionOrder.length(); i++) {
            String slug = sectionOrder.optString(i);
            if (isBrowsable(sections.optJSONObject(slug))) return slug;
        }
        return null;
    }

    // صف الأقسام أعلى الصفحة (نفس فكرة صف التصنيفات بتطبيقات التوصيل) —
    // بيانات، يُعاد بناؤه فقط بعد نجاح الجلب، بعكس buildMainNav() الثابت
    private void buildSectionTabs() {
        sectionTabs.removeAllViews();
        for (int i = 0; i < sectionOrder.length(); i++) {
            String slug = sectionOrder.optString(i);
            JSONObject section = sections.optJSONObject(slug);
            if (!isBrowsable(section)) continue;

            View tab = getLayoutInflater().inflate(R.layout.nav_tab, sectionTabs, false);
            ((TextView) tab.findViewById(R.id.tabIcon)).setText(section.optString("icon", "⭐"));
            ((TextView) tab.findViewById(R.id.tabLabel)).setText(section.optString("title", slug));
            tab.setTag(slug);
            tab.setOnClickListener(this);
            LinearLayout.LayoutParams lp = (LinearLayout.LayoutParams) tab.getLayoutParams();
            lp.setMarginEnd(dp(4));
            tab.setLayoutParams(lp);
            sectionTabs.addView(tab);
        }
    }

    private void selectSection(String slug) {
        currentSlug = slug;
        JSONObject section = sections.optJSONObject(slug);
        if (section == null) return;

        currentItems = section.optJSONArray("items");
        if (currentItems == null) currentItems = new JSONArray();
        currentTag = null;
        sortByDistance = false;
        clearDistanceAnnotations();
        updateNearMeButton();
        searchQuery = "";
        searchBox.removeTextChangedListener(this);
        searchBox.setText("");
        searchBox.addTextChangedListener(this);
        headerTitle.setText("هكوله — " + section.optString("title", ""));

        buildFilterChips();
        applyFilters();
        showList();
        highlightActiveTab();
    }

    // نفس بناء رقاقات التصنيف بالموقع (renderSection): اتحاد كل tags بالقسم
    // الحالي + "الكل" افتراضية — بدون سقف 10 رقاقات مع زر "المزيد" لأن
    // HorizontalScrollView يتكفّل بالتمرير أصلاً بهاتف
    private void buildFilterChips() {
        filterChips.removeAllViews();
        List<String> tags = new ArrayList<>();
        for (int i = 0; i < currentItems.length(); i++) {
            JSONObject item = currentItems.optJSONObject(i);
            if (item == null) continue;
            JSONArray itemTags = item.optJSONArray("tags");
            if (itemTags == null) continue;
            for (int j = 0; j < itemTags.length(); j++) {
                String t = itemTags.optString(j);
                if (!t.isEmpty() && !tags.contains(t)) tags.add(t);
            }
        }
        addChip("الكل", null);
        for (String t : tags) addChip(t, t);
    }

    private void addChip(String label, String tagValue) {
        TextView chip = new TextView(this);
        chip.setText(label);
        chip.setTextSize(14f);
        chip.setBackgroundResource(R.drawable.filter_chip_bg);
        chip.setActivated(currentTag == null ? tagValue == null : currentTag.equals(tagValue));
        chip.setTextColor(chip.isActivated() ? getColor(R.color.white) : getColor(R.color.text));
        int padH = dp(16);
        int padV = dp(8);
        chip.setPadding(padH, padV, padH, padV);
        LinearLayout.LayoutParams lp =
                new LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.setMarginEnd(dp(8));
        chip.setLayoutParams(lp);
        chip.setClickable(true);
        chip.setFocusable(true);
        chip.setTag(tagValue == null ? "chip:" : "chip:" + tagValue);
        chip.setOnClickListener(this);
        filterChips.addView(chip);
    }

    private void selectTag(String tag) {
        currentTag = tag.isEmpty() ? null : tag;
        buildFilterChips();
        applyFilters();
    }

    // زر "تصفّح الكل" بحالة البحث الفاضية — يمسح البحث والفلتر النشط معاً
    private void clearSearchAndFilter() {
        currentTag = null;
        searchBox.removeTextChangedListener(this);
        searchBox.setText("");
        searchBox.addTextChangedListener(this);
        searchQuery = "";
        buildFilterChips();
        applyFilters();
    }

    private int dp(float value) {
        return (int) android.util.TypedValue.applyDimension(
                android.util.TypedValue.COMPLEX_UNIT_DIP, value, getResources().getDisplayMetrics());
    }

    // نفس دمج البحث والفلترة بالموقع (AND بين tag النشط ونص البحث الضبابي)،
    // + ترتيب "قريب مني" كمرحلة أخيرة لو مفعّل
    private void applyFilters() {
        List<JSONObject> matched = new ArrayList<>();
        for (int i = 0; i < currentItems.length(); i++) {
            JSONObject item = currentItems.optJSONObject(i);
            if (item == null) continue;
            if (currentTag != null && !hasTag(item, currentTag)) continue;
            String haystack = item.optString("title", "") + " " + item.optString("desc", "");
            if (!SearchUtil.fuzzyIncludes(haystack, searchQuery)) continue;
            matched.add(item);
        }

        if (sortByDistance && userLat != null) {
            for (JSONObject item : matched) annotateDistance(item);
            sortByDistanceAscending(matched);
        } else {
            // ترتيب أبجدي افتراضي — يخلي شريط التصفح الأبجدي (alphabetIndex)
            // مفيداً فعلاً، بدل قفزة لموضع عشوائي بترتيب البيانات الخام
            sortAlphabetically(matched);
        }

        JSONArray filtered = new JSONArray();
        for (JSONObject item : matched) filtered.put(item);

        if (filtered.length() == 0) {
            itemList.setVisibility(View.GONE);
            emptyView.setVisibility(View.VISIBLE);
            // الزر يبان بس لو الفراغ سببه بحث/فلترة نشطة — قسم فاضي فعلياً
            // بلا بحث ما فيه شي يرجع له المستخدم "يتصفّح كله"
            boolean hasActiveFilter = currentTag != null || !searchQuery.isEmpty();
            emptyResetButton.setVisibility(hasActiveFilter ? View.VISIBLE : View.GONE);
        } else {
            emptyView.setVisibility(View.GONE);
            itemList.setAdapter(new ItemAdapter(this, currentSlug, filtered, searchQuery));
            itemList.setVisibility(View.VISIBLE);
        }
        buildAlphabetIndex(matched);
    }

    // ترتيب إدراج يدوي بـCollator عربي — بنفس سبب تفادي Comparator<T> بملفات
    // ثانية بالمشروع (bridge method مصنَّع يكسر d8 بهذي البيئة)
    private void sortAlphabetically(List<JSONObject> list) {
        java.text.Collator collator = java.text.Collator.getInstance(new java.util.Locale("ar"));
        for (int i = 1; i < list.size(); i++) {
            JSONObject key = list.get(i);
            String keyTitle = key.optString("title", "");
            int j = i - 1;
            while (j >= 0 && collator.compare(list.get(j).optString("title", ""), keyTitle) > 0) {
                list.set(j + 1, list.get(j));
                j--;
            }
            list.set(j + 1, key);
        }
    }

    // شريط تصفح أبجدي جانبي (نفس فكرة مكتبة موسيقى سامسونج) — يبان بس لو
    // القسم فيه عناصر كافية تستاهل قفزة سريعة، وحروفه مبنية من العناوين
    // الفعلية الموجودة بس (لا أبجدية كاملة ثابتة فيها حروف ميتة بلا نتائج)
    private static final int ALPHABET_INDEX_MIN_ITEMS = 12;

    private void buildAlphabetIndex(List<JSONObject> items) {
        alphabetIndex.removeAllViews();
        if (items.size() < ALPHABET_INDEX_MIN_ITEMS) {
            alphabetIndex.setVisibility(View.GONE);
            return;
        }
        List<String> seenLetters = new ArrayList<>();
        for (int i = 0; i < items.size(); i++) {
            String title = SearchUtil.normalizeArabic(items.get(i).optString("title", "").trim());
            if (title.isEmpty()) continue;
            String letter = title.substring(0, 1).toUpperCase(java.util.Locale.ROOT);
            if (seenLetters.contains(letter)) continue;
            seenLetters.add(letter);
            addAlphabetIndexEntry(letter, i);
        }
        alphabetIndex.setVisibility(seenLetters.isEmpty() ? View.GONE : View.VISIBLE);
    }

    private void addAlphabetIndexEntry(String letter, int position) {
        TextView entry = new TextView(this);
        entry.setText(letter);
        entry.setTextSize(11f);
        entry.setTextColor(getColor(R.color.brand_primary));
        entry.setGravity(android.view.Gravity.CENTER);
        entry.setPadding(0, dp(2), 0, dp(2));
        entry.setClickable(true);
        entry.setFocusable(true);
        entry.setTag(position);
        entry.setOnClickListener(this);
        alphabetIndex.addView(entry);
    }

    private boolean hasTag(JSONObject item, String tag) {
        JSONArray tags = item.optJSONArray("tags");
        if (tags == null) return false;
        for (int i = 0; i < tags.length(); i++) {
            if (tag.equals(tags.optString(i))) return true;
        }
        return false;
    }

    // ---- "قريب مني" — نفس haversineKm/nearestBranch/formatDistance بالموقع ----
    private void toggleNearMe() {
        if (sortByDistance) {
            sortByDistance = false;
            clearDistanceAnnotations();
            updateNearMeButton();
            applyFilters();
            return;
        }
        if (checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            showLocationRationale();
            return;
        }
        locateAndSort();
    }

    // نافذة توضيح قبل طلب صلاحية الموقع الرسمي من النظام — يفهم المستخدم
    // السبب ("قريب مني" فقط) قبل ما يواجه نافذة النظام المقتضبة، فيقلّ رفض
    // الصلاحية بلا سبب واضح
    private void showLocationRationale() {
        new android.app.AlertDialog.Builder(this)
                .setTitle("الوصول للموقع")
                .setMessage("عشان نرتّب النتائج حسب الأقرب لك، نحتاج إذنك للوصول لموقعك الجغرافي. يُستخدم محلياً بالجهاز فقط، ما يُرسَل لأي سيرفر.")
                .setPositiveButton("متابعة", new RequestLocationPermission(this))
                .setNegativeButton("إلغاء", null)
                .show();
    }

    // كلاس علوي مسمّى (مو مجهول) — د8 يفشل على الكلاسات المجهولة بهذي البيئة.
    // ثابت (static) لا داخلي — نفس نمط بقية الكلاسات المساعدة بالمشروع
    private static class RequestLocationPermission implements android.content.DialogInterface.OnClickListener {
        private final Activity activity;

        RequestLocationPermission(Activity activity) {
            this.activity = activity;
        }

        @Override
        public void onClick(android.content.DialogInterface dialog, int which) {
            activity.requestPermissions(new String[]{android.Manifest.permission.ACCESS_FINE_LOCATION}, LOCATION_PERMISSION_REQUEST);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == LOCATION_PERMISSION_REQUEST
                && grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            locateAndSort();
        }
    }

    // ponytail: يعتمد على آخر موقع معروف بس (getLastKnownLocation) بدل طلب
    // تحديث حي — أبسط بكثير ويكفي غالب الأجهزة (خدمة الموقع مفعّلة عادة أصلاً
    // بسبب تطبيقات أخرى). لو صار فارغاً بشكل متكرر، أضف requestSingleUpdate.
    private void locateAndSort() {
        LocationManager lm = (LocationManager) getSystemService(LOCATION_SERVICE);
        Location best = null;
        for (String provider : new String[]{LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER}) {
            try {
                Location loc = lm.getLastKnownLocation(provider);
                if (loc != null && (best == null || loc.getTime() > best.getTime())) best = loc;
            } catch (Exception ignored) {
            }
        }
        if (best == null) {
            Toast.makeText(this, "تعذّر تحديد موقعك — تأكد من تفعيل خدمة الموقع بالجهاز", Toast.LENGTH_LONG).show();
            return;
        }
        userLat = best.getLatitude();
        userLng = best.getLongitude();
        sortByDistance = true;
        updateNearMeButton();
        applyFilters();
    }

    // annotateDistance() يعدّل عناصر JSONObject بنفس المرجع المخزَّن بـ
    // cachedSections (لا نسخة) — بدونها تضل شارة المسافة عالقة بعد إيقاف
    // "قريب مني" أو بشاشات أخرى (المفضلة/اختار لي) تقرأ نفس المرجع
    private void clearDistanceAnnotations() {
        for (int i = 0; i < currentItems.length(); i++) {
            JSONObject item = currentItems.optJSONObject(i);
            if (item == null) continue;
            item.remove("_distanceKm");
            item.remove("_branchLabel");
        }
    }

    private void updateNearMeButton() {
        nearMeButton.setActivated(sortByDistance);
        nearMeButton.setText(sortByDistance ? "الأقرب مني ✕" : "الأقرب مني");
        int color = sortByDistance ? getColor(R.color.white) : getColor(R.color.text);
        nearMeButton.setTextColor(color);
        nearMeButton.setCompoundDrawableTintList(android.content.res.ColorStateList.valueOf(color));
    }

    private static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        double r = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.pow(Math.sin(dLat / 2), 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.pow(Math.sin(dLng / 2), 2);
        return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // فرع متعدد (branches) يقيس لكل فرع ويرجّع الأقرب — نفس nearestBranch
    // بالموقع؛ فرع واحد يستخدم lat/lng مباشرة. يخزّن النتيجة بحقلين مؤقتين
    // بالعنصر نفسه ("_distanceKm"، "_branchLabel") يقرأهما ItemAdapter للعرض
    private void annotateDistance(JSONObject item) {
        try {
            item.remove("_distanceKm");
            item.remove("_branchLabel");
            JSONArray branches = item.optJSONArray("branches");
            Double bestKm = null;
            String bestLabel = "";
            if (branches != null && branches.length() > 0) {
                for (int i = 0; i < branches.length(); i++) {
                    JSONObject b = branches.optJSONObject(i);
                    if (b == null || !b.has("lat") || !b.has("lng")) continue;
                    double km = haversineKm(userLat, userLng, b.optDouble("lat"), b.optDouble("lng"));
                    if (bestKm == null || km < bestKm) {
                        bestKm = km;
                        bestLabel = b.optString("label", "");
                    }
                }
            } else if (!item.isNull("lat") && !item.isNull("lng")) {
                bestKm = haversineKm(userLat, userLng, item.optDouble("lat"), item.optDouble("lng"));
            }
            if (bestKm != null) {
                item.put("_distanceKm", bestKm);
                item.put("_branchLabel", bestLabel);
            }
        } catch (Exception ignored) {
        }
    }

    // ترتيب إدراج يدوي بدل Comparator<JSONObject> — تطبيق الواجهة العامّة
    // (generic) يولّد bridge method مصنَّعاً يفشّل d8 بهذي البيئة، نفس عائلة
    // مشكلة الكلاسات المجهولة الموثّقة. القوائم هنا صغيرة (عناصر قسم واحد)
    // فالتكلفة O(n²) لا تُحس فعلياً. عناصر بلا موقع تُدفع لنهاية الترتيب.
    private void sortByDistanceAscending(List<JSONObject> list) {
        for (int i = 1; i < list.size(); i++) {
            JSONObject key = list.get(i);
            double keyDist = key.has("_distanceKm") ? key.optDouble("_distanceKm") : Double.MAX_VALUE;
            int j = i - 1;
            while (j >= 0) {
                JSONObject cur = list.get(j);
                double curDist = cur.has("_distanceKm") ? cur.optDouble("_distanceKm") : Double.MAX_VALUE;
                if (curDist <= keyDist) break;
                list.set(j + 1, cur);
                j--;
            }
            list.set(j + 1, key);
        }
    }

    private void highlightActiveTab() {
        for (int i = 0; i < sectionTabs.getChildCount(); i++) {
            View tab = sectionTabs.getChildAt(i);
            boolean active = currentSlug.equals(tab.getTag());
            tab.setActivated(active);
            TextView label = tab.findViewById(R.id.tabLabel);
            label.setTextColor(active
                    ? getColor(R.color.white)
                    : getColor(R.color.text_muted));
        }
    }

    private void showLoading() {
        loadingView.setVisibility(View.VISIBLE);
        errorView.setVisibility(View.GONE);
        itemList.setVisibility(View.GONE);
        emptyView.setVisibility(View.GONE);
    }

    private void showError(String message) {
        errorText.setText(message);
        loadingView.setVisibility(View.GONE);
        errorView.setVisibility(View.VISIBLE);
        itemList.setVisibility(View.GONE);
        emptyView.setVisibility(View.GONE);
    }

    // يُستدعى بعد تحديد القسم — يتكفّل الوضوح بين قائمة فعلية أو حالة فاضية
    // applyFilters() نفسها
    private void showList() {
        loadingView.setVisibility(View.GONE);
        errorView.setVisibility(View.GONE);
    }
}
