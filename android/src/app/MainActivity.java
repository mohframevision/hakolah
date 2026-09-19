package bh.mohframevision.hakolah;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.ProgressBar;
import android.widget.TextView;
import org.json.JSONArray;
import org.json.JSONObject;

// كلاسات مجهولة (anonymous inner classes) تكسر d8 بهذي البيئة (نفس المشكلة
// الموثّقة بمشروع StudyApp) — كل شي هنا كلاس علوي أو يطبّق الواجهة مباشرة
// بدل new Interface() { ... }.
public class MainActivity extends Activity implements View.OnClickListener, HakolahApi.Callback {
    private ProgressBar loadingView;
    private View errorView;
    private TextView errorText;
    private ListView itemList;
    private LinearLayout bottomNav;
    private TextView headerTitle;

    private JSONObject sections;
    private JSONArray sectionOrder;
    private String currentSlug;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        loadingView = findViewById(R.id.loadingView);
        errorView = findViewById(R.id.errorView);
        errorText = findViewById(R.id.errorText);
        itemList = findViewById(R.id.itemList);
        bottomNav = findViewById(R.id.bottomNav);
        headerTitle = findViewById(R.id.headerTitle);
        findViewById(R.id.retryButton).setOnClickListener(this);

        loadData();
    }

    @Override
    public void onClick(View v) {
        if (v.getId() == R.id.retryButton) {
            loadData();
        } else {
            Object tag = v.getTag();
            if (tag instanceof String) selectSection((String) tag);
        }
    }

    private void loadData() {
        showLoading();
        HakolahApi.fetch(this, this);
    }

    // ---- HakolahApi.Callback ----
    @Override
    public void onSuccess(JSONObject data, boolean fromCache) {
        sections = data.optJSONObject("sections");
        sectionOrder = data.optJSONArray("sectionOrder");
        if (sections == null || sectionOrder == null || sectionOrder.length() == 0) {
            showError("لا يوجد محتوى حالياً");
            return;
        }
        buildBottomNav();
        selectSection(sectionOrder.optString(0));
    }

    @Override
    public void onError(String message) {
        showError(message);
    }
    // -----------------------------

    private void buildBottomNav() {
        bottomNav.removeAllViews();
        for (int i = 0; i < sectionOrder.length(); i++) {
            String slug = sectionOrder.optString(i);
            JSONObject section = sections.optJSONObject(slug);
            if (section == null) continue;

            View tab = getLayoutInflater().inflate(R.layout.nav_tab, bottomNav, false);
            ((TextView) tab.findViewById(R.id.tabIcon)).setText(section.optString("icon", "⭐"));
            ((TextView) tab.findViewById(R.id.tabLabel)).setText(section.optString("title", slug));
            tab.setTag(slug);
            tab.setOnClickListener(this);
            bottomNav.addView(tab);
        }
    }

    private void selectSection(String slug) {
        currentSlug = slug;
        JSONObject section = sections.optJSONObject(slug);
        if (section == null) return;

        JSONArray items = section.optJSONArray("items");
        itemList.setAdapter(new ItemAdapter(this, items != null ? items : new JSONArray()));
        headerTitle.setText("هكوله — " + section.optString("title", ""));
        showList();
        highlightActiveTab();
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
    }

    private void showError(String message) {
        errorText.setText(message);
        loadingView.setVisibility(View.GONE);
        errorView.setVisibility(View.VISIBLE);
        itemList.setVisibility(View.GONE);
    }

    private void showList() {
        loadingView.setVisibility(View.GONE);
        errorView.setVisibility(View.GONE);
        itemList.setVisibility(View.VISIBLE);
    }
}
