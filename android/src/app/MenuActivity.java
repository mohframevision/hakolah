package bh.mohframevision.hakolah;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.TextView;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONObject;

// المنيو الكامل لمكان: بحث داخله + "الأرخص أولاً" (نفس ترتيب الأسعار بالموقع).
// بعض المنيوهات فوق 300 صنف، فقائمة ListView لا صفوف داخل ScrollView.
public class MenuActivity extends Activity implements View.OnClickListener, TextWatcher {
    private static final String EXTRA_ITEM = "item";
    private static final Pattern NUMBER = Pattern.compile("\\d+(?:[.,]\\d+)?");

    private final List<JSONObject> all = new ArrayList<>();
    private final List<JSONObject> shown = new ArrayList<>();
    private RowsAdapter adapter;
    private TextView sortChip;
    private TextView emptyView;
    private boolean cheapFirst;
    private String query = "";

    static Intent intent(Context c, JSONObject item) {
        Intent i = new Intent(c, MenuActivity.class);
        i.putExtra(EXTRA_ITEM, item.toString());
        return i;
    }

    @Override
    protected void attachBaseContext(Context newBase) {
        super.attachBaseContext(Prefs.wrapThemeContext(newBase));
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        JSONObject item;
        try {
            item = new JSONObject(getIntent().getStringExtra(EXTRA_ITEM));
        } catch (Exception e) {
            finish();
            return;
        }
        JSONArray menu = item.optJSONArray("menuItems");
        for (int i = 0; menu != null && i < menu.length(); i++) {
            JSONObject m = menu.optJSONObject(i);
            if (m != null) all.add(m);
        }

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setLayoutDirection(View.LAYOUT_DIRECTION_LOCALE);
        root.setBackgroundColor(getColor(R.color.bg));

        LinearLayout bar = new LinearLayout(this);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(dp(8), dp(8), dp(16), dp(8));
        ImageView back = new ImageView(this);
        back.setImageResource(R.drawable.ic_arrow_back);
        back.setColorFilter(getColor(R.color.text));
        back.setPadding(dp(12), dp(12), dp(12), dp(12));
        back.setBackgroundResource(R.drawable.row_bg);
        back.setContentDescription(getString(R.string.back));
        back.setTag("back");
        back.setOnClickListener(this);
        bar.addView(back, new LinearLayout.LayoutParams(dp(48), dp(48)));
        TextView title = Ui.text(this, getString(R.string.place_menu) + " · " + Lang.title(this, item), 18, getColor(R.color.text), true);
        title.setMaxLines(1);
        title.setEllipsize(android.text.TextUtils.TruncateAt.END);
        LinearLayout.LayoutParams tlp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        tlp.setMarginStart(dp(8));
        bar.addView(title, tlp);
        root.addView(bar);

        LinearLayout tools = new LinearLayout(this);
        tools.setGravity(Gravity.CENTER_VERTICAL);
        tools.setPadding(dp(16), dp(12), dp(16), dp(4));
        EditText search = new EditText(this);
        search.setHint(R.string.menu_search_hint);
        search.setSingleLine(true);
        search.setTextSize(15);
        search.setTextColor(getColor(R.color.text));
        search.setHintTextColor(getColor(R.color.text_muted));
        search.setBackgroundResource(R.drawable.search_box_bg);
        search.setPadding(dp(14), 0, dp(14), 0);
        search.setCompoundDrawablesRelativeWithIntrinsicBounds(R.drawable.ic_search_small, 0, 0, 0);
        search.setCompoundDrawablePadding(dp(8));
        search.setCompoundDrawableTintList(android.content.res.ColorStateList.valueOf(getColor(R.color.text_muted)));
        search.addTextChangedListener(this);
        tools.addView(search, new LinearLayout.LayoutParams(0, dp(48), 1f));
        sortChip = Ui.text(this, getString(R.string.menu_sort_cheap), 13.5f, getColor(R.color.text), false);
        sortChip.setBackgroundResource(R.drawable.filter_chip_bg);
        sortChip.setGravity(Gravity.CENTER);
        sortChip.setPadding(dp(14), 0, dp(14), 0);
        sortChip.setTag("sort");
        sortChip.setOnClickListener(this);
        Touch.springy(sortChip, 0.92f);
        LinearLayout.LayoutParams slp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dp(48));
        slp.setMarginStart(dp(8));
        tools.addView(sortChip, slp);
        root.addView(tools);

        emptyView = Ui.text(this, getString(R.string.menu_empty), 15, getColor(R.color.text_muted), false);
        emptyView.setTextAlignment(View.TEXT_ALIGNMENT_CENTER);
        emptyView.setPadding(dp(24), dp(48), dp(24), dp(24));
        emptyView.setVisibility(View.GONE);
        root.addView(emptyView);

        ListView list = new ListView(this);
        list.setDivider(null);
        list.setClipToPadding(false);
        list.setPadding(dp(12), dp(4), dp(12), dp(24));
        adapter = new RowsAdapter(this, shown);
        list.setAdapter(adapter);
        root.addView(list, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        setContentView(root);
        Ui.edgeToEdge(this, getColor(R.color.bg), getColor(R.color.bg));
        refresh();
    }

    private void refresh() {
        shown.clear();
        for (JSONObject m : all) {
            if (SearchUtil.fuzzyIncludes(m.optString("name", "") + " " + m.optString("name_en", ""), query)) shown.add(m);
        }
        if (cheapFirst) {
            // ترتيب إدراج يدوي: Comparator<T> عام يكسر d8 بهذي البيئة
            for (int i = 1; i < shown.size(); i++) {
                JSONObject key = shown.get(i);
                double kp = price(key);
                int j = i - 1;
                while (j >= 0 && price(shown.get(j)) > kp) {
                    shown.set(j + 1, shown.get(j));
                    j--;
                }
                shown.set(j + 1, key);
            }
        }
        adapter.notifyDataSetChanged();
        emptyView.setVisibility(shown.isEmpty() ? View.VISIBLE : View.GONE);
        sortChip.setActivated(cheapFirst);
        sortChip.setTextColor(cheapFirst ? 0xFFFFFFFF : getColor(R.color.text));
    }

    // أول رقم بالسعر ("2.400 BD" → 2.4). بلا رقم (مثلاً "حسب الوزن") يروح للآخر
    static double price(JSONObject m) {
        Matcher x = NUMBER.matcher(m.optString("price", ""));
        if (!x.find()) return Double.MAX_VALUE;
        try {
            return Double.parseDouble(x.group().replace(',', '.'));
        } catch (Exception e) {
            return Double.MAX_VALUE;
        }
    }

    // صف صنف: الاسم بالبداية والسعر بالنهاية (نفس صفوف منيو تطبيقات التوصيل).
    // مشترك مع معاينة المنيو بصفحة المكان
    static View row(Context c, JSONObject m) {
        LinearLayout row = new LinearLayout(c);
        row.setGravity(Gravity.CENTER_VERTICAL);
        int p = Ui.dp(c, 12);
        row.setPadding(p, Ui.dp(c, 10), p, Ui.dp(c, 10));
        String name = m == null ? "" : (Lang.en(c) && !m.optString("name_en", "").isEmpty() ? m.optString("name_en") : m.optString("name", ""));
        TextView n = Ui.text(c, name, 15, c.getColor(R.color.text), false);
        row.addView(n, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        String priceText = m == null ? "" : m.optString("price", "");
        if (!priceText.isEmpty()) {
            TextView pr = Ui.text(c, Ui.ltr(priceText), 14.5f, c.getColor(R.color.text), true);
            pr.setFontFeatureSettings("tnum");
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            lp.setMarginStart(Ui.dp(c, 12));
            row.addView(pr, lp);
        }
        return row;
    }

    private int dp(float v) {
        return Ui.dp(this, v);
    }

    @Override
    public void onClick(View v) {
        Object tag = v.getTag();
        if ("back".equals(tag)) {
            finish();
            overridePendingTransition(0, 0);
        } else if ("sort".equals(tag)) {
            cheapFirst = !cheapFirst;
            Touch.feedback(v, Touch.TICK, cheapFirst ? SoundPlayer.ON : SoundPlayer.OFF);
            refresh();
        }
    }

    @Override
    public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

    @Override
    public void onTextChanged(CharSequence s, int start, int before, int count) {}

    @Override
    public void afterTextChanged(Editable s) {
        query = s.toString();
        refresh();
    }

    @Override
    public void onBackPressed() {
        super.onBackPressed();
        overridePendingTransition(0, 0);
    }

    // صفوف بسيطة بلا إعادة تدوير معقدة: كل صف بضعة TextView
    private static final class RowsAdapter extends BaseAdapter {
        private final Context c;
        private final List<JSONObject> rows;

        RowsAdapter(Context c, List<JSONObject> rows) {
            this.c = c;
            this.rows = rows;
        }

        @Override
        public int getCount() {
            return rows.size();
        }

        @Override
        public Object getItem(int position) {
            return rows.get(position);
        }

        @Override
        public long getItemId(int position) {
            return position;
        }

        @Override
        public View getView(int position, View convertView, ViewGroup parent) {
            return row(c, rows.get(position));
        }
    }
}
