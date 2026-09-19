package bh.mohframevision.hakolah;

import android.content.Context;
import android.content.Intent;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

// نفس منطق buildActionsHtml بـmain.js (الموقع) لكن بمكوّنات أندرويد أصلية —
// زر لكل رابط موجود فعلاً بالعنصر، بنفس الترتيب: الموقع، الهاتف، الخرائط،
// إنستقرام. أول زر بنفس تنسيق .btn (حبة ملوّنة بارزة)، والباقي .btn.secondary
// (خلفية فاتحة خافتة) — تماماً زي الموقع. عربي فقط بهذي النسخة (V1).
// المفضلة والمشاركة محليان بالكامل (Prefs/ACTION_SEND)، بلا سيرفر — نفس مبدأ
// المفضلة بالموقع (localStorage). "أعجبني" (عدّاد Cloudflare) مؤجل عمداً.
//
// بدون lambdas ولا كلاسات مجهولة عمداً — d8 بهذي البيئة يفشل عليها. كل زر
// يحمل "tag" نصي (مثال "url:https://...")، وonClick وحد بالمحوّل نفسه يفكّه.
class ItemAdapter extends BaseAdapter implements View.OnClickListener {
    private final Context context;
    private final String section;
    private final List<JSONObject> items = new ArrayList<>();

    ItemAdapter(Context context, String section, JSONArray itemsJson) {
        this.context = context;
        this.section = section;
        for (int i = 0; i < itemsJson.length(); i++) {
            // optJSONObject يرجع null لأي عنصر مش كائن JSON فعلي (ملف بيانات
            // تالف جزئياً مثلاً) — نتجاهله هنا بدل ما getView() يفشل بـNPE
            // لاحقاً لما يحاول يقرأ حقوله
            JSONObject item = itemsJson.optJSONObject(i);
            if (item != null) items.add(item);
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

    // كلاس أعلى (مو مجهول) يخزّن مراجع عناصر الصف — نفس نمط ViewHolder
    // المعتاد بـListView، يمنع إعادة findViewById() وinflate() بكل سكرول
    private static class ViewHolder {
        TextView icon;
        TextView title;
        TextView shareBtn;
        TextView favBtn;
        TextView desc;
        TextView hours;
        TextView tags;
        LinearLayout actions;
    }

    @Override
    public View getView(int position, View convertView, ViewGroup parent) {
        View row;
        ViewHolder holder;
        if (convertView == null) {
            row = LayoutInflater.from(context).inflate(R.layout.item_row, parent, false);
            holder = new ViewHolder();
            holder.icon = row.findViewById(R.id.itemIcon);
            holder.title = row.findViewById(R.id.itemTitle);
            holder.shareBtn = row.findViewById(R.id.shareButton);
            holder.favBtn = row.findViewById(R.id.favButton);
            holder.desc = row.findViewById(R.id.itemDesc);
            holder.hours = row.findViewById(R.id.itemHours);
            holder.tags = row.findViewById(R.id.itemTags);
            holder.actions = row.findViewById(R.id.itemActions);
            holder.shareBtn.setOnClickListener(this);
            holder.favBtn.setOnClickListener(this);
            row.setTag(holder);
        } else {
            row = convertView;
            holder = (ViewHolder) row.getTag();
        }

        JSONObject item = items.get(position);
        String id = item.optString("id", "");
        holder.icon.setText(item.optString("icon", "⭐"));
        holder.title.setText(item.optString("title", ""));
        holder.shareBtn.setTag("share:" + position);
        holder.favBtn.setTag("fav:" + id);
        applyFavStyle(holder.favBtn, Prefs.isFavorite(context, section, id));
        holder.desc.setText(item.optString("desc", ""));

        String hours = item.optString("hours", "");
        if (!hours.isEmpty()) {
            holder.hours.setText("🕐 " + hours);
            holder.hours.setVisibility(View.VISIBLE);
        } else {
            holder.hours.setVisibility(View.GONE);
        }

        JSONArray tags = item.optJSONArray("tags");
        if (tags != null && tags.length() > 0) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < tags.length(); i++) {
                if (i > 0) sb.append(" · ");
                sb.append(tags.optString(i));
            }
            holder.tags.setText(sb.toString());
            holder.tags.setVisibility(View.VISIBLE);
        } else {
            holder.tags.setVisibility(View.GONE);
        }

        LinkButtons.build(context, holder.actions, item, HakolahApi.ORIGIN, this);

        return row;
    }

    private void applyFavStyle(TextView btn, boolean active) {
        btn.setText(active ? "♥" : "♡");
        btn.setTextColor(active ? 0xFFE0245E : context.getColor(R.color.text_muted));
    }

    @Override
    public void onClick(View v) {
        Object tagObj = v.getTag();
        if (!(tagObj instanceof String)) return;
        String tag = (String) tagObj;
        if (tag.startsWith("url:") || tag.startsWith("tel:")) {
            SoundPlayer.playClick(context);
            LinkButtons.handleClick(context, tag);
        } else if (tag.startsWith("fav:")) {
            String id = tag.substring(4);
            Prefs.toggleFavorite(context, section, id);
            SoundPlayer.playClick(context);
            applyFavStyle((TextView) v, Prefs.isFavorite(context, section, id));
        } else if (tag.startsWith("share:")) {
            int position = Integer.parseInt(tag.substring(6));
            SoundPlayer.playClick(context);
            shareItem(items.get(position));
        }
    }

    // نفس buildShareText/buildShareUrl بالموقع بالضبط: العنوان + لاحقة عربية
    // ثابتة + رابط القسم مع ?q=العنوان (العنصر بلا صفحة تفاصيل مستقلة بهذي
    // النسخة) — عبر مشاركة النظام الأصلية (ACTION_SEND) بدل Web Share API
    private void shareItem(JSONObject item) {
        String title = item.optString("title", "");
        String encodedTitle;
        try {
            encodedTitle = URLEncoder.encode(title, StandardCharsets.UTF_8.name());
        } catch (Exception e) {
            encodedTitle = title;
        }
        String url = HakolahApi.ORIGIN + section + ".html?q=" + encodedTitle;
        String text = title + " — على موقع هكوله 👇\n" + url;

        Intent send = new Intent(Intent.ACTION_SEND);
        send.setType("text/plain");
        send.putExtra(Intent.EXTRA_TEXT, text);
        try {
            context.startActivity(Intent.createChooser(send, "مشاركة"));
        } catch (Exception ignored) {
        }
    }

}
