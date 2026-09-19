package bh.mohframevision.hakolah;

import android.app.Activity;
import android.content.Context;
import android.content.res.Configuration;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.ProgressBar;
import android.widget.TextView;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

// كلاسات مجهولة (anonymous inner classes) تكسر d8 بهذي البيئة (نفس المشكلة
// الموثّقة بمشروع StudyApp) — كل شي هنا كلاس علوي أو يطبّق الواجهة مباشرة
// بدل new Interface() { ... }.
public class MainActivity extends Activity implements View.OnClickListener, HakolahApi.Callback, TextWatcher {
    private ProgressBar loadingView;
    private View errorView;
    private TextView errorText;
    private ListView itemList;
    private TextView emptyView;
    private LinearLayout bottomNav;
    private TextView headerTitle;
    private EditText searchBox;
    private LinearLayout filterChips;

    private JSONObject sections;
    private JSONArray sectionOrder;
    private String currentSlug;
    private JSONArray currentItems = new JSONArray();
    private boolean currentHasDetailPages;
    private String currentTag;
    private String searchQuery = "";

    // نفس initThemeToggle بالموقع (localStorage + matchMedia) — بدون AppCompat
    // (يحتاج Gradle)، الآلية الأصلية المتاحة: تعديل Configuration.uiMode على
    // سياق النشاط نفسه قبل إنشائه، فتنحل موارد values-night/ أو لا حسب التفضيل
    @Override
    protected void attachBaseContext(Context newBase) {
        String mode = Prefs.getThemeMode(newBase);
        if (Prefs.THEME_AUTO.equals(mode)) {
            super.attachBaseContext(newBase);
            return;
        }
        Configuration config = new Configuration(newBase.getResources().getConfiguration());
        int nightBit = Prefs.THEME_DARK.equals(mode)
                ? Configuration.UI_MODE_NIGHT_YES
                : Configuration.UI_MODE_NIGHT_NO;
        config.uiMode = (config.uiMode & ~Configuration.UI_MODE_NIGHT_MASK) | nightBit;
        super.attachBaseContext(newBase.createConfigurationContext(config));
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
        bottomNav = findViewById(R.id.bottomNav);
        headerTitle = findViewById(R.id.headerTitle);
        searchBox = findViewById(R.id.searchBox);
        filterChips = findViewById(R.id.filterChips);
        findViewById(R.id.retryButton).setOnClickListener(this);
        findViewById(R.id.settingsButton).setOnClickListener(this);
        searchBox.addTextChangedListener(this);

        loadData();
    }

    @Override
    public void onClick(View v) {
        int id = v.getId();
        if (id == R.id.retryButton) {
            loadData();
            return;
        }
        if (id == R.id.settingsButton) {
            SoundPlayer.playClick(this);
            SettingsPanel.show(this);
            return;
        }
        Object tag = v.getTag();
        if (!(tag instanceof String)) return;
        String value = (String) tag;
        if (value.startsWith("chip:")) {
            SoundPlayer.playClick(this);
            selectTag(value.substring(5));
        } else if (PICKER_TAG.equals(value)) {
            SoundPlayer.playClick(this);
            startActivity(new android.content.Intent(this, PickerActivity.class));
        } else {
            selectSection(value);
        }
    }

    private static final String PICKER_TAG = "__picker__";

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
        buildBottomNav();
        selectSection(firstBrowsable);
        if (fromCache) {
            headerTitle.append(" (بيانات محفوظة، بلا اتصال)");
        }
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

    private void buildBottomNav() {
        bottomNav.removeAllViews();
        for (int i = 0; i < sectionOrder.length(); i++) {
            String slug = sectionOrder.optString(i);
            JSONObject section = sections.optJSONObject(slug);
            if (!isBrowsable(section)) continue;

            View tab = getLayoutInflater().inflate(R.layout.nav_tab, bottomNav, false);
            ((TextView) tab.findViewById(R.id.tabIcon)).setText(section.optString("icon", "⭐"));
            ((TextView) tab.findViewById(R.id.tabLabel)).setText(section.optString("title", slug));
            tab.setTag(slug);
            tab.setOnClickListener(this);
            bottomNav.addView(tab);
        }

        View pickerTab = getLayoutInflater().inflate(R.layout.nav_tab, bottomNav, false);
        ((TextView) pickerTab.findViewById(R.id.tabIcon)).setText("🎲");
        ((TextView) pickerTab.findViewById(R.id.tabLabel)).setText("اختار لي");
        pickerTab.setTag(PICKER_TAG);
        pickerTab.setOnClickListener(this);
        bottomNav.addView(pickerTab);
    }

    private void selectSection(String slug) {
        currentSlug = slug;
        JSONObject section = sections.optJSONObject(slug);
        if (section == null) return;

        currentItems = section.optJSONArray("items");
        if (currentItems == null) currentItems = new JSONArray();
        currentHasDetailPages = section.optBoolean("hasDetailPages", false);
        currentTag = null;
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
        int padV = dp(7);
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

    private int dp(float value) {
        return (int) android.util.TypedValue.applyDimension(
                android.util.TypedValue.COMPLEX_UNIT_DIP, value, getResources().getDisplayMetrics());
    }

    // نفس دمج البحث والفلترة بالموقع (AND بين tag النشط ونص البحث الضبابي)
    private void applyFilters() {
        JSONArray filtered = new JSONArray();
        for (int i = 0; i < currentItems.length(); i++) {
            JSONObject item = currentItems.optJSONObject(i);
            if (item == null) continue;
            if (currentTag != null && !hasTag(item, currentTag)) continue;
            String haystack = item.optString("title", "") + " " + item.optString("desc", "");
            if (!SearchUtil.fuzzyIncludes(haystack, searchQuery)) continue;
            filtered.put(item);
        }

        if (filtered.length() == 0) {
            itemList.setVisibility(View.GONE);
            emptyView.setVisibility(View.VISIBLE);
        } else {
            emptyView.setVisibility(View.GONE);
            itemList.setAdapter(new ItemAdapter(this, currentSlug, filtered, currentHasDetailPages));
            itemList.setVisibility(View.VISIBLE);
        }
    }

    private boolean hasTag(JSONObject item, String tag) {
        JSONArray tags = item.optJSONArray("tags");
        if (tags == null) return false;
        for (int i = 0; i < tags.length(); i++) {
            if (tag.equals(tags.optString(i))) return true;
        }
        return false;
    }

    private void highlightActiveTab() {
        for (int i = 0; i < bottomNav.getChildCount(); i++) {
            View tab = bottomNav.getChildAt(i);
            boolean active = currentSlug.equals(tab.getTag());
            TextView label = tab.findViewById(R.id.tabLabel);
            label.setTextColor(active
                    ? getColor(R.color.brand_accent)
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
