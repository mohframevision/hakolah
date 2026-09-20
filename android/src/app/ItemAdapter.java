package bh.mohframevision.hakolah;

import android.app.Activity;
import android.content.Intent;
import android.text.Spannable;
import android.text.SpannableString;
import android.text.style.ForegroundColorSpan;
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
    // Activity لا Context عام — يحتاجها overridePendingTransition() عند فتح
    // المقال/التجربة (نفس نمط HakolahApi.Callback: توقيع النوع نفسه يمنع
    // الخطأ، لا فحص instanceof وقت التشغيل)
    private final Activity context;
    private final String section;
    private final String searchQuery;
    private final List<JSONObject> items = new ArrayList<>();

    ItemAdapter(Activity context, String section, JSONArray itemsJson) {
        this(context, section, itemsJson, "");
    }

    // القسم الافتراضي لكل عناصر القائمة (شاشة قسم واحد عادية). شاشة المفضلة
    // (تجمع عناصر من كذا قسم) تمرّر حقل "_section" داخل كل عنصر يتجاوز هذا
    // الافتراضي — انظر itemSection(). searchQuery: يُبرِز تطابق البحث
    // بعنوان الكرت (SpannableString) — فاضي يعني بلا تبرير.
    ItemAdapter(Activity context, String section, JSONArray itemsJson, String searchQuery) {
        this.context = context;
        this.section = section;
        this.searchQuery = searchQuery == null ? "" : searchQuery;
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
        holder.title.setText(highlightMatch(item.optString("title", "")));
        String itemSection = itemSection(item);
        holder.shareBtn.setTag("share:" + position);
        holder.favBtn.setTag("fav:" + position);
        applyFavStyle(holder.favBtn, Prefs.isFavorite(context, itemSection, id));
        holder.desc.setText(item.optString("desc", ""));

        String hours = item.optString("hours", "");
        if (!hours.isEmpty()) {
            holder.hours.setText("🕐 " + hours);
            holder.hours.setVisibility(View.VISIBLE);
        } else {
            holder.hours.setVisibility(View.GONE);
        }

        StringBuilder sb = new StringBuilder();
        // نفس formatDistance/nearest_branch بالموقع — يظهر أول ما دام "قريب
        // مني" مفعّلاً وله إحداثيات (annotateDistance بـMainActivity حاطّته)
        if (item.has("_distanceKm")) {
            double km = item.optDouble("_distanceKm");
            sb.append("📍 ").append(km < 1 ? Math.round(km * 1000) + " م" : String.format(java.util.Locale.US, "%.1f كم", km));
            String branchLabel = item.optString("_branchLabel", "");
            if (!branchLabel.isEmpty()) sb.append(" — أقرب فرع: ").append(branchLabel);
        }
        JSONArray tags = item.optJSONArray("tags");
        if (tags != null && tags.length() > 0) {
            for (int i = 0; i < tags.length(); i++) {
                if (sb.length() > 0) sb.append(" · ");
                sb.append(tags.optString(i));
            }
        }
        if (sb.length() > 0) {
            holder.tags.setText(sb.toString());
            holder.tags.setVisibility(View.VISIBLE);
        } else {
            holder.tags.setVisibility(View.GONE);
        }

        // hasDetailPages يُشتق من وجود detailUrl بالعنصر نفسه لا من ثابت
        // بمستوى القائمة — يسمح لشاشة المفضلة تخلط عناصر من أقسام مختلفة
        // (بعضها مقالات وبعضها بطاقات روابط) بنفس ItemAdapter
        boolean hasDetailPages = !item.optString("detailUrl", "").isEmpty();
        if (hasDetailPages) {
            // "أدلة"/"أماكن": مقال يُعرض أصلياً بـArticleActivity. "تجارب
            // الذكاء الاصطناعي": أدوات JS تفاعلية ثقيلة (مولّد ألحان، محوّل
            // ملفات...) — تُفتح بـWebViewActivity (نفس الصفحة الحقيقية داخل
            // التطبيق) بدل إعادة كتابة مئات الأسطر جافا لكل أداة
            boolean isExperiment = "ai-experiments".equals(itemSection);
            holder.actions.removeAllViews();
            TextView readBtn = new TextView(context);
            readBtn.setText(isExperiment ? "🧪 افتح التجربة" : "📖 قراءة المقال");
            readBtn.setTextSize(14f);
            readBtn.setTypeface(null, android.graphics.Typeface.BOLD);
            readBtn.setTextColor(0xFFFFFFFF);
            readBtn.setBackgroundResource(R.drawable.btn_pill_primary);
            int padH = LinkButtons.dp(context, 20);
            int padV = LinkButtons.dp(context, 9);
            readBtn.setPadding(padH, padV, padH, padV);
            readBtn.setClickable(true);
            readBtn.setFocusable(true);
            readBtn.setGravity(android.view.Gravity.CENTER);
            readBtn.setTag((isExperiment ? "webview:" : "article:") + position);
            readBtn.setOnClickListener(this);
            holder.actions.addView(readBtn);
        } else {
            LinkButtons.build(context, holder.actions, item, HakolahApi.ORIGIN, this);
        }

        return row;
    }

    // يبرز تطابق البحث الحرفي (substring) بلون الهوية — نطاق محدود عمداً:
    // مطابقة Levenshtein الضبابية (تشابه لا تطابق حرفي) ما فيها نطاق واحد
    // متصل يُبرَز، فنكتفي بعرض العنوان عادياً بهذي الحالة بدل تخمين خاطئ
    private CharSequence highlightMatch(String title) {
        String q = searchQuery.trim();
        if (q.isEmpty()) return title;
        int idx = title.toLowerCase().indexOf(q.toLowerCase());
        if (idx < 0) return title;
        SpannableString span = new SpannableString(title);
        span.setSpan(new ForegroundColorSpan(context.getColor(R.color.brand_accent)),
                idx, idx + q.length(), Spannable.SPAN_EXCLUSIVE_EXCLUSIVE);
        return span;
    }

    private String itemSection(JSONObject item) {
        String override = item.optString("_section", "");
        return override.isEmpty() ? section : override;
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
            JSONObject item = items.get(Integer.parseInt(tag.substring(4)));
            String itemSection = itemSection(item);
            String id = item.optString("id", "");
            v.performHapticFeedback(android.view.HapticFeedbackConstants.VIRTUAL_KEY);
            Prefs.toggleFavorite(context, itemSection, id);
            SoundPlayer.playClick(context);
            applyFavStyle((TextView) v, Prefs.isFavorite(context, itemSection, id));
        } else if (tag.startsWith("share:")) {
            int position = Integer.parseInt(tag.substring(6));
            SoundPlayer.playClick(context);
            shareItem(items.get(position));
        } else if (tag.startsWith("article:")) {
            int position = Integer.parseInt(tag.substring(8));
            SoundPlayer.playClick(context);
            openArticle(items.get(position));
        } else if (tag.startsWith("webview:")) {
            int position = Integer.parseInt(tag.substring(8));
            SoundPlayer.playClick(context);
            openWebView(items.get(position));
        }
    }

    private void openArticle(JSONObject item) {
        Intent intent = new Intent(context, ArticleActivity.class);
        intent.putExtra(ArticleActivity.EXTRA_TITLE, item.optString("title", ""));
        intent.putExtra(ArticleActivity.EXTRA_ICON, item.optString("icon", "⭐"));
        intent.putExtra(ArticleActivity.EXTRA_CONTENT, item.optString("contentHtml", ""));
        intent.putExtra(ArticleActivity.EXTRA_DETAIL_URL, item.optString("detailUrl", ""));
        context.startActivity(intent);
        context.overridePendingTransition(0, 0);
    }

    private void openWebView(JSONObject item) {
        Intent intent = new Intent(context, WebViewActivity.class);
        intent.putExtra(WebViewActivity.EXTRA_TITLE, item.optString("title", ""));
        intent.putExtra(WebViewActivity.EXTRA_URL, HakolahApi.ORIGIN + item.optString("detailUrl", ""));
        context.startActivity(intent);
        context.overridePendingTransition(0, 0);
    }

    // نفس buildShareText/buildShareUrl بالموقع بالضبط: يفضّل detailUrl لو
    // موجود (أقسام المقالات)، وإلا رابط القسم مع ?q=العنوان — عبر مشاركة
    // النظام الأصلية (ACTION_SEND) بدل Web Share API
    private void shareItem(JSONObject item) {
        String title = item.optString("title", "");
        String detailUrl = item.optString("detailUrl", "");
        String url;
        if (!detailUrl.isEmpty()) {
            url = HakolahApi.ORIGIN + detailUrl;
        } else {
            String encodedTitle;
            try {
                encodedTitle = URLEncoder.encode(title, StandardCharsets.UTF_8.name());
            } catch (Exception e) {
                encodedTitle = title;
            }
            url = HakolahApi.ORIGIN + itemSection(item) + ".html?q=" + encodedTitle;
        }
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
