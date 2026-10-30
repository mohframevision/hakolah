package bh.mohframevision.hakolah;

import android.app.Activity;
import android.content.Context;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.InputMethodManager;
import android.widget.AbsListView;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.TextView;
import org.json.JSONArray;
import org.json.JSONObject;

// بحث شامل بكل الأقسام مرة وحدة (الموقع فيه صفحة بحث بنفس الفكرة): اسم،
// وصف، تصنيف، كلمات مفتاحية، وأصناف المنيو — "شاورما" يجيب كل مكان يقدّمها.
// نمط Material: لوحة المفاتيح تفتح فوراً، وتنغلق أول ما تمرّر النتائج.
public class SearchActivity extends Activity implements View.OnClickListener, TextWatcher, AbsListView.OnScrollListener {
    private static final int MAX_RESULTS = 80;

    private EditText box;
    private ListView list;
    private TextView status;

    @Override
    protected void attachBaseContext(Context newBase) {
        super.attachBaseContext(Prefs.wrapThemeContext(newBase));
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (MainActivity.cachedSections == null) {
            finish();
            return;
        }
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setLayoutDirection(View.LAYOUT_DIRECTION_LOCALE);
        root.setBackgroundColor(getColor(R.color.bg));

        LinearLayout bar = new LinearLayout(this);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(dp(8), dp(10), dp(16), dp(10));
        ImageView back = new ImageView(this);
        back.setImageResource(R.drawable.ic_arrow_back);
        back.setColorFilter(getColor(R.color.text));
        back.setPadding(dp(12), dp(12), dp(12), dp(12));
        back.setBackgroundResource(R.drawable.row_bg);
        back.setContentDescription(getString(R.string.back));
        back.setOnClickListener(this);
        bar.addView(back, new LinearLayout.LayoutParams(dp(48), dp(48)));
        box = new EditText(this);
        box.setHint(R.string.home_search_hint);
        box.setSingleLine(true);
        box.setTextSize(16);
        box.setTextColor(getColor(R.color.text));
        box.setHintTextColor(getColor(R.color.text_muted));
        box.setBackgroundResource(R.drawable.search_pill_bg);
        box.setPadding(dp(18), 0, dp(18), 0);
        box.setImeOptions(android.view.inputmethod.EditorInfo.IME_ACTION_SEARCH);
        box.addTextChangedListener(this);
        LinearLayout.LayoutParams blp = new LinearLayout.LayoutParams(0, dp(52), 1f);
        blp.setMarginStart(dp(4));
        bar.addView(box, blp);
        root.addView(bar);

        status = Ui.text(this, getString(R.string.search_intro), 14, getColor(R.color.text_muted), false);
        status.setPadding(dp(20), dp(8), dp(20), dp(8));
        root.addView(status);

        list = new ListView(this);
        list.setDivider(null);
        list.setDividerHeight(dp(12));
        list.setClipToPadding(false);
        list.setPadding(dp(16), dp(4), dp(16), dp(24));
        list.setOnScrollListener(this);
        root.addView(list, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));

        LinearLayout nav = new LinearLayout(this);
        nav.setGravity(Gravity.BOTTOM);
        nav.setClipChildren(false);
        nav.setBackgroundColor(getColor(R.color.surface));
        nav.setElevation(dp(4));
        root.addView(nav, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(64)));
        BottomNav.attach(this, nav, BottomNav.SEARCH);

        setContentView(root);
        Ui.edgeToEdge(this, getColor(R.color.bg), getColor(R.color.surface));
        box.requestFocus();
        getWindow().setSoftInputMode(android.view.WindowManager.LayoutParams.SOFT_INPUT_STATE_VISIBLE
                | android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING);
    }

    private void search(String q) {
        if (q.trim().isEmpty()) {
            list.setAdapter(null);
            status.setText(R.string.search_intro);
            return;
        }
        JSONArray results = new JSONArray();
        int total = 0;
        for (String slug : MainActivity.orderedSlugs()) {
            JSONArray items = MainActivity.cachedSections.optJSONObject(slug).optJSONArray("items");
            for (int i = 0; i < items.length(); i++) {
                JSONObject item = items.optJSONObject(i);
                if (item == null || !SearchUtil.fuzzyIncludes(MainActivity.searchText(item), q)) continue;
                total++;
                if (results.length() >= MAX_RESULTS) continue;
                try {
                    JSONObject clone = new JSONObject(item.toString());
                    clone.put("_section", slug);
                    results.put(clone);
                } catch (Exception ignored) {
                }
            }
        }
        status.setText(total == 0 ? getString(R.string.search_none) : getString(R.string.search_count, total));
        list.setAdapter(new ItemAdapter(this, "", results, q));
    }

    private int dp(float v) {
        return Ui.dp(this, v);
    }

    @Override
    public void onClick(View v) {
        finish();
        overridePendingTransition(0, 0);
    }

    @Override
    public void onBackPressed() {
        super.onBackPressed();
        overridePendingTransition(0, 0);
    }

    @Override
    public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

    @Override
    public void onTextChanged(CharSequence s, int start, int before, int count) {}

    @Override
    public void afterTextChanged(Editable s) {
        search(s.toString());
    }

    @Override
    public void onScrollStateChanged(AbsListView view, int scrollState) {
        // التمرير يخفي لوحة المفاتيح عشان تبان النتائج كاملة
        if (scrollState == SCROLL_STATE_TOUCH_SCROLL) {
            InputMethodManager imm = (InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
            imm.hideSoftInputFromWindow(box.getWindowToken(), 0);
        }
    }

    @Override
    public void onScroll(AbsListView view, int firstVisibleItem, int visibleItemCount, int totalItemCount) {}
}
