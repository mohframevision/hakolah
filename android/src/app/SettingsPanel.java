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
class SettingsPanel implements View.OnClickListener, CompoundButton.OnCheckedChangeListener {
    private final Activity activity;
    private final Dialog dialog;
    private final TextView themeAuto;
    private final TextView themeLight;
    private final TextView themeDark;

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
        panel.findViewById(R.id.settingsCloseButton).setOnClickListener(this);
        updateThemeButtons();

        Switch soundSwitch = panel.findViewById(R.id.soundSwitch);
        soundSwitch.setChecked(Prefs.isSoundEnabled(activity));
        soundSwitch.setOnCheckedChangeListener(this);

        dialog = new Dialog(activity);
        Window window = dialog.getWindow();
        if (window != null) window.setBackgroundDrawable(new ColorDrawable(android.graphics.Color.TRANSPARENT));
        dialog.setContentView(panel);
        dialog.show();
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
    }

    private void setButtonState(TextView button, boolean active) {
        button.setActivated(active);
        button.setTextColor(active ? activity.getColor(R.color.white) : activity.getColor(R.color.text));
    }

    @Override
    public void onClick(View v) {
        int id = v.getId();
        if (id == R.id.settingsCloseButton) {
            dialog.dismiss();
            return;
        }
        String mode = id == R.id.themeLight ? Prefs.THEME_LIGHT
                : id == R.id.themeDark ? Prefs.THEME_DARK
                : Prefs.THEME_AUTO;
        if (mode.equals(Prefs.getThemeMode(activity))) return;
        Prefs.setThemeMode(activity, mode);
        SoundPlayer.playClick(activity);
        dialog.dismiss();
        activity.recreate();
    }

    @Override
    public void onCheckedChanged(CompoundButton button, boolean checked) {
        Prefs.setSoundEnabled(activity, checked);
        if (checked) SoundPlayer.playClick(activity);
    }
}
