package bh.mohframevision.hakolah;

import android.content.Context;
import android.content.Intent;
import android.graphics.Typeface;
import android.net.Uri;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;
import org.json.JSONObject;

// أزرار الروابط (تفاصيل/زيارة/اتصال/خريطة/إنستقرام) — نفس buildActionsHtml
// بالموقع بالضبط. مشتركة بين ItemAdapter وPickerActivity بدل تكرارها.
class LinkButtons {
    static void build(Context context, LinearLayout container, JSONObject item, String origin, View.OnClickListener listener) {
        container.removeAllViews();
        String detailUrl = item.optString("detailUrl", "");
        if (!detailUrl.isEmpty()) {
            add(context, container, R.drawable.ic_menu_book, "التفاصيل", "url:" + origin + detailUrl, true, listener);
            return;
        }
        JSONObject links = item.optJSONObject("links");
        if (links == null) return;
        // optString(key, "") لا has(key): حقول الروابط بالمحتوى الحقيقي تُحفظ
        // أحياناً كسلسلة فاضية "" لا غائبة تماماً (مثال: ameen-kebab.md)
        boolean first = true;
        if (!links.optString("website", "").isEmpty()) {
            add(context, container, R.drawable.ic_language, "زيارة", "url:" + links.optString("website"), first, listener);
            first = false;
        }
        if (!links.optString("phone", "").isEmpty()) {
            String phone = links.optString("phone").split(",")[0].trim();
            add(context, container, R.drawable.ic_call, "اتصال", "tel:" + phone, first, listener);
            first = false;
        }
        if (!links.optString("maps", "").isEmpty()) {
            add(context, container, R.drawable.ic_location_on, "الخريطة", "url:" + links.optString("maps"), first, listener);
            first = false;
        }
        if (!links.optString("instagram", "").isEmpty()) {
            add(context, container, R.drawable.ic_photo_camera, "إنستقرام", "url:" + links.optString("instagram"), first, listener);
        }
    }

    // نفس .btn بالموقع بالضبط: padding 24px8px، radius حبة كاملة، أول زر
    // بارز (primary)، الباقي خافت (secondary)
    private static void add(Context context, LinearLayout container, int iconRes, String label, String tag, boolean primary, View.OnClickListener listener) {
        TextView btn = new TextView(context);
        btn.setText(label);
        btn.setTextSize(14f);
        btn.setTypeface(null, Typeface.BOLD);
        btn.setCompoundDrawablePadding(dp(context, 6));
        int color = primary ? 0xFFFFFFFF : context.getColor(R.color.text_muted);
        if (primary) {
            btn.setTextColor(0xFFFFFFFF);
            btn.setBackgroundResource(R.drawable.btn_pill_primary);
        } else {
            btn.setTextColor(context.getColor(R.color.text_muted));
            btn.setBackgroundResource(R.drawable.btn_pill_secondary);
        }
        setStartIcon(btn, iconRes, color);
        int padH = dp(context, 24);
        int padV = dp(context, 8);
        btn.setPadding(padH, padV, padH, padV);
        btn.setClickable(true);
        btn.setFocusable(true);
        btn.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams lp =
                new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.setMarginEnd(dp(context, 8));
        btn.setLayoutParams(lp);
        btn.setTag(tag);
        btn.setOnClickListener(listener);
        container.addView(btn);
    }

    static int dp(Context context, float value) {
        return (int) TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP, value, context.getResources().getDisplayMetrics());
    }

    // أيقونة متجهة كأيقونة بداية بنص TextView — الأيقونات الأصلية 24dp (لأزرار
    // ImageView المستقلة)، لكن ضمن نص لازم أصغر (18dp) وإلا تطغى على الخط.
    // Drawable.setBounds() يدوياً بدل ملف أيقونة منفصل بحجم مختلف
    static void setStartIcon(TextView view, int drawableRes, int color) {
        android.graphics.drawable.Drawable icon = view.getContext().getDrawable(drawableRes).mutate();
        int size = dp(view.getContext(), 18);
        icon.setBounds(0, 0, size, size);
        icon.setTint(color);
        view.setCompoundDrawables(icon, null, null, null);
    }

    static void handleClick(Context context, String tag) {
        if (tag.startsWith("url:")) {
            openUrl(context, tag.substring(4));
        } else if (tag.startsWith("tel:")) {
            dialPhone(context, tag.substring(4));
        }
    }

    private static void openUrl(Context context, String url) {
        try {
            context.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception ignored) {
            // ما فيه تطبيق يقدر يفتح هالرابط بالجهاز — نتجاهل بصمت بدل كراش
        }
    }

    private static void dialPhone(Context context, String phone) {
        try {
            context.startActivity(new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + phone)));
        } catch (Exception ignored) {
        }
    }
}
