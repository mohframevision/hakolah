package bh.mohframevision.hakolah;

import android.app.Activity;
import android.content.Intent;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

// شريط التنقّل السفلي الثابت (4 عناصر)، مشترك بين كل شاشة غير MainActivity —
// بدونه، فتح "اختار لي" أو "المفضلة" كان يحسّ المستخدم إنه طلع من التطبيق
// كلياً (لا بار، شاشة سوداء فاضية أسفلها). MainActivity نفسها تبني نسختها
// الخاصة (فيها سلوك إضافي: نقرة "الرئيسية" وهي نشطة أصلاً تصفّر الفلاتر) —
// هذا الكلاس لباقي الشاشات (Picker/Favorites) اللي التنقّل فيها أبسط: نقرة
// على التبويب الحالي نفسه بلا أثر، وأي تبويب ثاني ينتقل ويُنهي هذي الشاشة
// (يمنع تكدّس شاشات فوق بعض عند التنقّل بين التبويبات أكثر من مرة).
class BottomNav implements View.OnClickListener {
    static final String HOME = "home";
    static final String PICKER = "picker";
    static final String FAVORITES = "favorites";
    static final String SETTINGS = "settings";

    private final Activity activity;
    private final String active;

    static void attach(Activity activity, LinearLayout container, String active) {
        new BottomNav(activity, active).build(container);
    }

    private BottomNav(Activity activity, String active) {
        this.activity = activity;
        this.active = active;
    }

    private void build(LinearLayout container) {
        container.removeAllViews();
        addTab(container, R.drawable.ic_home, "الرئيسية", HOME);
        addTab(container, R.drawable.ic_casino, "اختار لي", PICKER);
        addTab(container, R.drawable.ic_favorite_fill, "المفضلة", FAVORITES);
        addTab(container, R.drawable.ic_settings, "الإعدادات", SETTINGS);
    }

    private void addTab(LinearLayout container, int iconRes, String label, String tag) {
        View tab = LayoutInflater.from(activity).inflate(R.layout.nav_tab_icon, container, false);
        int color = tag.equals(active) ? activity.getColor(R.color.brand_accent) : activity.getColor(R.color.text_muted);
        ImageView iconView = tab.findViewById(R.id.tabIcon);
        iconView.setImageResource(iconRes);
        iconView.setColorFilter(color);
        TextView labelView = tab.findViewById(R.id.tabLabel);
        labelView.setText(label);
        labelView.setTextColor(color);
        LinearLayout.LayoutParams lp = (LinearLayout.LayoutParams) tab.getLayoutParams();
        lp.width = 0;
        lp.weight = 1;
        tab.setLayoutParams(lp);
        tab.setTag(tag);
        tab.setOnClickListener(this);
        container.addView(tab);
    }

    @Override
    public void onClick(View v) {
        String tag = (String) v.getTag();
        if (tag.equals(active)) return;
        SoundPlayer.playClick(activity);
        if (HOME.equals(tag)) {
            activity.finish();
            activity.overridePendingTransition(0, 0);
        } else if (SETTINGS.equals(tag)) {
            SettingsPanel.show(activity);
        } else {
            Class<?> target = PICKER.equals(tag) ? PickerActivity.class : FavoritesActivity.class;
            activity.startActivity(new Intent(activity, target));
            activity.finish();
            activity.overridePendingTransition(0, 0);
        }
    }
}
