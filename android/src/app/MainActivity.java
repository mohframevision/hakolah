package bh.mohframevision.hakolah;

import android.app.Activity;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationManager;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
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
public class MainActivity extends Activity implements View.OnClickListener, HakolahApi.Callback, TextWatcher {
    private ProgressBar loadingView;
    private View errorView;
    private TextView errorText;
    private ListView itemList;
    private View emptyView;
    private TextView emptyResetButton;
    private LinearLayout bottomNav;
    private LinearLayout sectionTabs;
    private TextView headerTitle;
    private EditText searchBox;
    private LinearLayout filterChips;
    private TextView nearMeButton;

    private JSONObject sections;
    private JSONArray sectionOrder;
    private String currentSlug;
    private JSONArray currentItems = new JSONArray();
    private String currentTag;
    private String searchQuery = "";
    private boolean sortByDistance;
    private Double userLat;
    private Double userLng;
    private static final int LOCATION_PERMISSION_REQUEST = 1;

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
        headerTitle = findViewById(R.id.headerTitle);
        searchBox = findViewById(R.id.searchBox);
        filterChips = findViewById(R.id.filterChips);
        nearMeButton = findViewById(R.id.nearMeButton);
        findViewById(R.id.retryButton).setOnClickListener(this);
        nearMeButton.setOnClickListener(this);
        emptyResetButton.setOnClickListener(this);
        searchBox.addTextChangedListener(this);
        buildMainNav();

        loadData();
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
    // sectionTabs للأقسام الفعلية (بيانات القسم القابلة للتغيّر)
    private void buildMainNav() {
        addMainNavTab("🏠", "الرئيسية", HOME_TAG);
        addMainNavTab("🎲", "اختار لي", PICKER_TAG);
        addMainNavTab("♥", "المفضلة", FAVORITES_TAG);
        addMainNavTab("⚙️", "الإعدادات", SETTINGS_TAG);
    }

    private void addMainNavTab(String icon, String label, String tag) {
        View tab = getLayoutInflater().inflate(R.layout.nav_tab, bottomNav, false);
        ((TextView) tab.findViewById(R.id.tabIcon)).setText(icon);
        ((TextView) tab.findViewById(R.id.tabLabel)).setText(label);
        tab.setTag(tag);
        tab.setOnClickListener(this);
        LinearLayout.LayoutParams lp = (LinearLayout.LayoutParams) tab.getLayoutParams();
        lp.width = 0;
        lp.weight = 1;
        tab.setLayoutParams(lp);
        bottomNav.addView(tab);
        if (HOME_TAG.equals(tag)) {
            ((TextView) tab.findViewById(R.id.tabLabel)).setTextColor(getColor(R.color.brand_accent));
        }
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
            itemList.setAdapter(new ItemAdapter(this, currentSlug, filtered));
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
        nearMeButton.setText(sortByDistance ? "📍 الأقرب مني ✕" : "📍 الأقرب مني");
        nearMeButton.setTextColor(sortByDistance ? getColor(R.color.white) : getColor(R.color.text));
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
