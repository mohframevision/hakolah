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

// قائمة قسم واحد (مطاعم، كافيهات، ...): بحث داخل القسم، رقاقات التصنيف،
// "الأقرب"، والكروت. كانت هي الرئيسية نفسها؛ الرئيسية صارت شبكة أقسام وبحث
// شامل (MainActivity)، وهذي الشاشة تُفتح من مربع القسم. البيانات من
// MainActivity.cachedSections (نفس الجلب، بلا إعادة تحميل).
// بلا كلاسات مجهولة ولا lambdas — d8 بهذي البيئة يفشل عليها.
public class SectionActivity extends Activity implements View.OnClickListener, TextWatcher, AbsListView.OnScrollListener {
    static final String EXTRA_SLUG = "slug";
    static final String EXTRA_QUERY = "q";

    private ListView itemList;
    private View emptyView;
    private TextView emptyResetButton;
    private View headerBar;
    private View searchArea;
    private int searchAreaHeight = -1;
    private EditText searchBox;
    private LinearLayout filterChips;
    private TextView nearMeButton;
    private android.widget.HorizontalScrollView filterChipsScroll;
    private String createdLang;

    private int headerHeight = -1;
    private boolean headerVisible = true;
    private int lastFirstVisibleItem = 0;
    private boolean isHeaderAnimating = false;

    private String currentSlug;
    private JSONArray currentItems = new JSONArray();
    private String currentTag;
    private String searchQuery = "";
    private boolean sortByDistance;
    private Double userLat;
    private Double userLng;
    private static final int LOCATION_PERMISSION_REQUEST = 1;

    static Intent intent(Context c, String slug, String query) {
        Intent i = new Intent(c, SectionActivity.class);
        i.putExtra(EXTRA_SLUG, slug);
        if (query != null) i.putExtra(EXTRA_QUERY, query);
        return i;
    }

    @Override
    protected void attachBaseContext(Context newBase) {
        super.attachBaseContext(Prefs.wrapThemeContext(newBase));
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        currentSlug = getIntent().getStringExtra(EXTRA_SLUG);
        JSONObject section = MainActivity.cachedSections == null || currentSlug == null
                ? null : MainActivity.cachedSections.optJSONObject(currentSlug);
        // العملية انقتلت بالخلفية وما فيه بيانات بالذاكرة: الرئيسية تحت تعيد الجلب
        if (section == null) {
            finish();
            return;
        }
        setContentView(R.layout.activity_section);
        Ui.edgeToEdge(this, getColor(R.color.bg), getColor(R.color.surface));
        createdLang = Prefs.getLang(this);

        itemList = findViewById(R.id.itemList);
        emptyView = findViewById(R.id.emptyView);
        emptyResetButton = findViewById(R.id.emptyResetButton);
        headerBar = findViewById(R.id.headerBar);
        searchArea = findViewById(R.id.searchArea);
        searchBox = findViewById(R.id.searchBox);
        filterChips = findViewById(R.id.filterChips);
        nearMeButton = findViewById(R.id.nearMeButton);
        filterChipsScroll = findViewById(R.id.filterChipsScroll);
        applyLandscape(getResources().getConfiguration());
        findViewById(R.id.backButton).setOnClickListener(this);
        nearMeButton.setOnClickListener(this);
        emptyResetButton.setOnClickListener(this);
        itemList.setOnScrollListener(this);
        Touch.springy(nearMeButton);
        Touch.springy(emptyResetButton);
        BottomNav.attach(this, findViewById(R.id.bottomNav), BottomNav.HOME);

        TextView headerTitle = findViewById(R.id.headerTitle);
        headerTitle.setText(Lang.title(this, section));
        Ui.display(headerTitle);
        currentItems = section.optJSONArray("items");
        if (currentItems == null) currentItems = new JSONArray();
        searchBox.setHint(getString(R.string.search_in, Lang.title(this, section)));
        String q = getIntent().getStringExtra(EXTRA_QUERY);
        if (q != null) {
            searchQuery = q;
            searchBox.setText(q);
        }
        searchBox.addTextChangedListener(this);
        buildFilterChips();
        Ui.scrollToStart(filterChipsScroll);
        applyFilters();
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
        // البحث ينطوي معه — إلا وأنت تكتب فيه (إخفاء حقل فيه المؤشر يربك)
        if (!searchBox.hasFocus()) {
            if (searchAreaHeight <= 0) searchAreaHeight = searchArea.getHeight();
            animateHeight(searchArea, searchArea.getHeight(), 0);
        }
    }

    private void showHeader() {
        if (headerVisible) return;
        headerVisible = true;
        if (headerHeight <= 0) headerHeight = headerBar.getHeight();
        animateHeaderHeight(headerBar.getHeight(), headerHeight);
        if (searchAreaHeight > 0 && searchArea.getHeight() < searchAreaHeight) {
            animateHeight(searchArea, searchArea.getHeight(), searchAreaHeight);
        }
    }

    private static void animateHeight(View view, int from, int to) {
        ValueAnimator animator = ValueAnimator.ofInt(from, to);
        animator.setDuration(220);
        animator.addUpdateListener(new HeaderHeightUpdater(view));
        animator.start();
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
        private final SectionActivity activity;

        HeaderAnimEndListener(SectionActivity activity) {
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

    // الأفقي: الشاشة قصيرة، فشريط العنوان ورقائق التصنيف (تبقى بالعمودي) كانت
    // تأكل كل الارتفاع وتترك القائمة شريطاً رفيعاً. الاتجاه من Configuration
    // الحدث نفسه لأن getResources() ملفوف بـwrapThemeContext (ثابت وقت الإنشاء).
    private void applyLandscape(android.content.res.Configuration config) {
        int v = config.orientation == android.content.res.Configuration.ORIENTATION_LANDSCAPE ? View.GONE : View.VISIBLE;
        headerBar.setVisibility(v);
        filterChipsScroll.setVisibility(v);
    }

    @Override
    public void onConfigurationChanged(android.content.res.Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        applyLandscape(newConfig);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (!Prefs.getLang(this).equals(createdLang)) {
            recreate();
            return;
        }
        // المفضلة ممكن تغيّرت من صفحة المكان — نحدّث القلوب
        if (itemList != null && itemList.getAdapter() != null) ((android.widget.BaseAdapter) itemList.getAdapter()).notifyDataSetChanged();
    }

    @Override
    public void onBackPressed() {
        super.onBackPressed();
        overridePendingTransition(0, 0);
    }

    @Override
    public void onClick(View v) {
        int id = v.getId();
        if (id == R.id.backButton) {
            finish();
            overridePendingTransition(0, 0);
        } else if (id == R.id.nearMeButton) {
            Touch.feedback(v, sortByDistance ? Touch.TOGGLE_OFF : Touch.TOGGLE_ON, sortByDistance ? SoundPlayer.OFF : SoundPlayer.ON);
            toggleNearMe();
        } else if (id == R.id.emptyResetButton) {
            Touch.feedback(v, Touch.TAP, SoundPlayer.TAP);
            clearSearchAndFilter();
        } else if (v.getTag() instanceof String && ((String) v.getTag()).startsWith("chip:")) {
            Touch.feedback(v, Touch.TICK, SoundPlayer.TAP);
            selectTag(((String) v.getTag()).substring(5));
        }
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
        addChip(getString(R.string.chip_all), null);
        for (String t : tags) addChip(Lang.tag(this, t), t);
    }

    private void addChip(String label, String tagValue) {
        TextView chip = new TextView(this);
        chip.setText(label);
        chip.setTextSize(13f);
        chip.setBackgroundResource(R.drawable.filter_chip_bg);
        chip.setActivated(currentTag == null ? tagValue == null : currentTag.equals(tagValue));
        chip.setTextColor(chip.isActivated() ? getColor(R.color.white) : getColor(R.color.text));
        int padH = dp(14);
        int padV = dp(6);
        chip.setPadding(padH, padV, padH, padV);
        LinearLayout.LayoutParams lp =
                new LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.setMarginEnd(dp(8));
        chip.setLayoutParams(lp);
        chip.setClickable(true);
        chip.setFocusable(true);
        chip.setTag(tagValue == null ? "chip:" : "chip:" + tagValue);
        chip.setOnClickListener(this);
        Touch.springy(chip, 0.92f);
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
            // البحث باللغتين دائماً — تكتب "burger" أو "برجر" وتلقى نفس العنصر
            if (!searchQuery.isEmpty() && !SearchUtil.fuzzyIncludes(MainActivity.searchText(item), searchQuery)) continue;
            matched.add(item);
        }

        if (sortByDistance && userLat != null) {
            for (JSONObject item : matched) annotateDistance(item);
            sortByDistanceAscending(matched);
        } else {
            // ترتيب أبجدي افتراضي
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
    }

    // ترتيب إدراج يدوي بـCollator عربي — بنفس سبب تفادي Comparator<T> بملفات
    // ثانية بالمشروع (bridge method مصنَّع يكسر d8 بهذي البيئة)
    private void sortAlphabetically(List<JSONObject> list) {
        java.text.Collator collator = java.text.Collator.getInstance(new java.util.Locale(Prefs.getLang(this)));
        for (int i = 1; i < list.size(); i++) {
            JSONObject key = list.get(i);
            String keyTitle = Lang.title(this, key);
            int j = i - 1;
            while (j >= 0 && collator.compare(Lang.title(this, list.get(j)), keyTitle) > 0) {
                list.set(j + 1, list.get(j));
                j--;
            }
            list.set(j + 1, key);
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
                .setTitle(getString(R.string.loc_title))
                .setMessage(getString(R.string.loc_msg))
                .setPositiveButton(getString(R.string.loc_continue), new RequestLocationPermission(this))
                .setNegativeButton(getString(R.string.cancel), null)
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
            Toast.makeText(this, getString(R.string.loc_fail), Toast.LENGTH_LONG).show();
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
        nearMeButton.setText(getString(sortByDistance ? R.string.near_active : R.string.near));
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

}
