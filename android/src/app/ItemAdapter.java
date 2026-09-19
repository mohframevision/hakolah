package bh.mohframevision.hakolah;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

// نفس منطق buildActionsHtml بـmain.js (الموقع) لكن بمكوّنات أندرويد أصلية —
// زر لكل رابط موجود فعلاً بالعنصر، بنفس الترتيب: الموقع، الهاتف، الخرائط،
// إنستقرام. عربي فقط بهذي النسخة (V1) — دعم الإنجليزية لاحقاً.
//
// بدون lambdas ولا كلاسات مجهولة عمداً — d8 بهذي البيئة يفشل عليها. كل زر
// يحمل "tag" نصي (مثال "url:https://...")، وonClick وحد بالمحوّل نفسه يفكّه.
class ItemAdapter extends BaseAdapter implements View.OnClickListener {
    private static final String SITE_ORIGIN = "https://mohframevision.github.io/hakolah/";

    private final Context context;
    private final List<JSONObject> items = new ArrayList<>();

    ItemAdapter(Context context, JSONArray itemsJson) {
        this.context = context;
        for (int i = 0; i < itemsJson.length(); i++) {
            items.add(itemsJson.optJSONObject(i));
        }
    }

    @Override
    public int getCount() {
        return items.size();
    }

    @Override
    public Object getItem(int position) {
        return items.get(position);
    }

    @Override
    public long getItemId(int position) {
        return position;
    }

    @Override
    public View getView(int position, View convertView, ViewGroup parent) {
        View row = LayoutInflater.from(context).inflate(R.layout.item_row, parent, false);
        JSONObject item = items.get(position);

        ((TextView) row.findViewById(R.id.itemIcon)).setText(item.optString("icon", "⭐"));
        ((TextView) row.findViewById(R.id.itemTitle)).setText(item.optString("title", ""));
        ((TextView) row.findViewById(R.id.itemDesc)).setText(item.optString("desc", ""));

        String hours = item.optString("hours", "");
        TextView hoursView = row.findViewById(R.id.itemHours);
        if (!hours.isEmpty()) {
            hoursView.setText("🕐 " + hours);
            hoursView.setVisibility(View.VISIBLE);
        }

        JSONArray tags = item.optJSONArray("tags");
        TextView tagsView = row.findViewById(R.id.itemTags);
        if (tags != null && tags.length() > 0) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < tags.length(); i++) {
                if (i > 0) sb.append(" · ");
                sb.append(tags.optString(i));
            }
            tagsView.setText(sb.toString());
            tagsView.setVisibility(View.VISIBLE);
        }

        LinearLayout actions = row.findViewById(R.id.itemActions);
        actions.removeAllViews();
        String detailUrl = item.optString("detailUrl", "");
        if (!detailUrl.isEmpty()) {
            addActionButton(actions, "📖 التفاصيل", "url:" + SITE_ORIGIN + detailUrl);
        } else {
            JSONObject links = item.optJSONObject("links");
            if (links != null) {
                if (links.has("website")) {
                    addActionButton(actions, "🌐 زيارة", "url:" + links.optString("website"));
                }
                if (links.has("phone")) {
                    String phone = links.optString("phone").split(",")[0].trim();
                    addActionButton(actions, "📞 اتصال", "tel:" + phone);
                }
                if (links.has("maps")) {
                    addActionButton(actions, "📍 الخريطة", "url:" + links.optString("maps"));
                }
                if (links.has("instagram")) {
                    addActionButton(actions, "📷 إنستقرام", "url:" + links.optString("instagram"));
                }
            }
        }

        return row;
    }

    private void addActionButton(LinearLayout container, String label, String tag) {
        TextView btn = new TextView(context);
        btn.setText(label);
        btn.setTextColor(0xFFFFFFFF);
        btn.setTextSize(12.5f);
        btn.setBackgroundResource(R.drawable.action_btn_bg);
        btn.setPadding(20, 14, 20, 14);
        btn.setClickable(true);
        btn.setFocusable(true);
        LinearLayout.LayoutParams lp =
                new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        lp.setMarginEnd(6);
        btn.setLayoutParams(lp);
        btn.setGravity(Gravity.CENTER);
        btn.setTag(tag);
        btn.setOnClickListener(this);
        container.addView(btn);
    }

    @Override
    public void onClick(View v) {
        Object tagObj = v.getTag();
        if (!(tagObj instanceof String)) return;
        String tag = (String) tagObj;
        if (tag.startsWith("url:")) {
            openUrl(tag.substring(4));
        } else if (tag.startsWith("tel:")) {
            dialPhone(tag.substring(4));
        }
    }

    private void openUrl(String url) {
        try {
            context.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception ignored) {
            // ما فيه تطبيق يقدر يفتح هالرابط بالجهاز — نتجاهل بصمت بدل كراش
        }
    }

    private void dialPhone(String phone) {
        try {
            context.startActivity(new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + phone)));
        } catch (Exception ignored) {
        }
    }
}
