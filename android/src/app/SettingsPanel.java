package bh.mohframevision.hakolah;

import android.app.Activity;
import android.app.Dialog;
import android.graphics.drawable.ColorDrawable;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.widget.CompoundButton;
import android.widget.Switch;
import android.widget.TextView;

// نفس شكل لوحة الإعدادات بتطبيق محمد يدرس بالضبط: حوار مخصَّص (Dialog عادي
// لا AlertDialog.Builder — عشان نتحكم كلياً برأس اللوحة وما نعتمد شريط عنوان
// النظام الافتراضي)، بمجموعات معنونة وصفوف رقاقة مقسّمة (تلقائي/فاتح/داكن)
// بدل قائمة نصوص بعلامة صح.
class SettingsPanel implements View.OnClickListener, CompoundButton.OnCheckedChangeListener, android.content.DialogInterface.OnDismissListener {
    private final Activity activity;
    private final Dialog dialog;
    private final TextView themeAuto;
    private final TextView themeLight;
    private final TextView themeDark;
    private final TextView langAr;
    private final TextView langEn;

    static void show(Activity activity) {
        new SettingsPanel(activity);
    }

    private SettingsPanel(Activity activity) {
        this.activity = activity;
        View panel = LayoutInflater.from(activity).inflate(R.layout.settings_panel, null);

        themeAuto = panel.findViewById(R.id.themeAuto);
        themeLight = panel.findViewById(R.id.themeLight);
        themeDark = panel.findViewById(R.id.themeDark);
        themeAuto.setOnClickListener(this);
        themeLight.setOnClickListener(this);
        themeDark.setOnClickListener(this);
        langAr = panel.findViewById(R.id.langAr);
        langEn = panel.findViewById(R.id.langEn);
        langAr.setOnClickListener(this);
        langEn.setOnClickListener(this);
        panel.findViewById(R.id.settingsCloseButton).setOnClickListener(this);
        View storyRow = panel.findViewById(R.id.storyRow);
        storyRow.setOnClickListener(this);
        Touch.springy(storyRow, 0.97f);
        updateThemeButtons();

        Switch soundSwitch = panel.findViewById(R.id.soundSwitch);
        soundSwitch.setChecked(Prefs.isSoundEnabled(activity));
        soundSwitch.setOnCheckedChangeListener(this);

        dialog = new Dialog(activity);
        Window window = dialog.getWindow();
        if (window != null) window.setBackgroundDrawable(new ColorDrawable(android.graphics.Color.TRANSPARENT));
        dialog.setContentView(panel);
        dialog.setOnDismissListener(this);
        dialog.show();
        SoundPlayer.play(activity, SoundPlayer.OPEN);
        Touch.springy(themeAuto, 0.93f);
        Touch.springy(themeLight, 0.93f);
        Touch.springy(themeDark, 0.93f);
        // نفس عرض اللوحة بالموقع (94vw بحد أقصى 480px) — بلا هذا، عرض
        // الحوار الافتراضي يلتف على محتواه فقط بدل الامتداد المريح بالعرض
        if (window != null) {
            int width = (int) (activity.getResources().getDisplayMetrics().widthPixels * 0.92);
            window.setLayout(width, ViewGroup.LayoutParams.WRAP_CONTENT);
        }
    }

    private void updateThemeButtons() {
        String mode = Prefs.getThemeMode(activity);
        setButtonState(themeAuto, Prefs.THEME_AUTO.equals(mode));
        setButtonState(themeLight, Prefs.THEME_LIGHT.equals(mode));
        setButtonState(themeDark, Prefs.THEME_DARK.equals(mode));
        String lang = Prefs.getLang(activity);
        setButtonState(langAr, Prefs.LANG_AR.equals(lang));
        setButtonState(langEn, Prefs.LANG_EN.equals(lang));
    }

    private void setButtonState(TextView button, boolean active) {
        button.setActivated(active);
        button.setTextColor(active ? activity.getColor(R.color.white) : activity.getColor(R.color.text));
    }

    @Override
    public void onClick(View v) {
        int id = v.getId();
        if (id == R.id.settingsCloseButton) {
            Touch.haptic(v, Touch.TAP);
            dialog.dismiss();
            return;
        }
        if (id == R.id.langAr || id == R.id.langEn) {
            String lang = id == R.id.langEn ? Prefs.LANG_EN : Prefs.LANG_AR;
            if (lang.equals(Prefs.getLang(activity))) return;
            Prefs.setLang(activity, lang);
            Touch.feedback(v, Touch.CONFIRM, SoundPlayer.TAP);
            recreating = true;
            dialog.dismiss();
            // الشاشة الحالية تنبني من جديد باللغة الجديدة؛ الرئيسية (لو تحتها)
            // تلاحظ التغيير بـonResume وتعيد بناء نفسها
            activity.recreate();
            return;
        }
        if (id == R.id.storyRow) {
            // صوت دخول هكوله (اندفاعة + أربيجيو) — نفس بطاقة هكوله بالموقع
            Touch.feedback(v, Touch.CONFIRM, SoundPlayer.HAKOLAH);
            recreating = true; // صوت الفتح يكفي — بلا صوت إغلاق فوقه
            dialog.dismiss();
            activity.startActivity(new android.content.Intent(activity, StoryActivity.class));
            activity.overridePendingTransition(0, 0);
            return;
        }
        String mode = id == R.id.themeLight ? Prefs.THEME_LIGHT
                : id == R.id.themeDark ? Prefs.THEME_DARK
                : Prefs.THEME_AUTO;
        if (mode.equals(Prefs.getThemeMode(activity))) return;
        Prefs.setThemeMode(activity, mode);
        Touch.feedback(v, Touch.CONFIRM, SoundPlayer.TAP);
        recreating = true;
        dialog.dismiss();
        activity.recreate();
    }

    @Override
    public void onCheckedChanged(CompoundButton button, boolean checked) {
        // صوت الإيقاف قبل ما ينطفي، وصوت التشغيل بعد ما يشتغل — كل واحد يُسمع
        if (!checked) Touch.feedback(button, Touch.TOGGLE_OFF, SoundPlayer.OFF);
        Prefs.setSoundEnabled(activity, checked);
        if (checked) Touch.feedback(button, Touch.TOGGLE_ON, SoundPlayer.ON);
    }

    // تغيير المظهر يعيد بناء الشاشة فوراً — صوت الإغلاق هنا بيطلع فوق صوت
    // التأكيد بلا معنى، فنتجاوزه بهالحالة بس
    private boolean recreating;

    @Override
    public void onDismiss(android.content.DialogInterface d) {
        if (!recreating) SoundPlayer.play(activity, SoundPlayer.CLOSE);
    }
}
