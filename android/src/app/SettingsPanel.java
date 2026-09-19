package bh.mohframevision.hakolah;

import android.app.Activity;
import android.app.AlertDialog;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.CompoundButton;
import android.widget.Switch;

// نفس فكرة تبديل المظهر (تلقائي/فاتح/داكن) وتفعيل الصوت بالموقع
// (initThemeToggle/initSoundToggle بـmain.js) — بحوار أصلي (AlertDialog) بدل
// حاجز مبني يدوياً، لأن هذا بالضبط الشي اللي AlertDialog مصمم له (رقم 4
// بسلّم الأولويات: ميزة منصّة جاهزة).
class SettingsPanel implements View.OnClickListener, CompoundButton.OnCheckedChangeListener {
    private final Activity activity;
    private final AlertDialog dialog;
    private final View themeAutoCheck;
    private final View themeLightCheck;
    private final View themeDarkCheck;

    static void show(Activity activity) {
        new SettingsPanel(activity);
    }

    private SettingsPanel(Activity activity) {
        this.activity = activity;
        View panel = LayoutInflater.from(activity).inflate(R.layout.settings_panel, null);

        panel.findViewById(R.id.themeAuto).setOnClickListener(this);
        panel.findViewById(R.id.themeLight).setOnClickListener(this);
        panel.findViewById(R.id.themeDark).setOnClickListener(this);
        themeAutoCheck = panel.findViewById(R.id.themeAutoCheck);
        themeLightCheck = panel.findViewById(R.id.themeLightCheck);
        themeDarkCheck = panel.findViewById(R.id.themeDarkCheck);
        updateThemeChecks();

        Switch soundSwitch = panel.findViewById(R.id.soundSwitch);
        soundSwitch.setChecked(Prefs.isSoundEnabled(activity));
        soundSwitch.setOnCheckedChangeListener(this);

        dialog = new AlertDialog.Builder(activity)
                .setTitle("الإعدادات")
                .setView(panel)
                .setPositiveButton("تم", null)
                .create();
        dialog.show();
    }

    private void updateThemeChecks() {
        String mode = Prefs.getThemeMode(activity);
        themeAutoCheck.setVisibility(Prefs.THEME_AUTO.equals(mode) ? View.VISIBLE : View.GONE);
        themeLightCheck.setVisibility(Prefs.THEME_LIGHT.equals(mode) ? View.VISIBLE : View.GONE);
        themeDarkCheck.setVisibility(Prefs.THEME_DARK.equals(mode) ? View.VISIBLE : View.GONE);
    }

    @Override
    public void onClick(View v) {
        int id = v.getId();
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
