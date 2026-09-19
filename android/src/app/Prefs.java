package bh.mohframevision.hakolah;

import android.content.Context;
import android.content.SharedPreferences;
import java.util.HashSet;
import java.util.Set;

// تخزين محلي بسيط (SharedPreferences) — نفس دور localStorage بالموقع:
// تفضيل الصوت، المظهر، والمفضلة. كل شي محلي بالجهاز، بلا سيرفر — نفس مبدأ
// الموقع تماماً (favorites/theme/sound كلها localStorage هناك).
class Prefs {
    private static final String FILE = "hakolah_prefs";
    private static final String KEY_SOUND = "sound_enabled";
    private static final String KEY_THEME = "theme_mode";
    private static final String KEY_FAVORITES = "favorites";

    // نفس افتراض الموقع بالضبط: الصوت مطفي افتراضياً (اختياري، المستخدم يفعّله)
    static final boolean SOUND_DEFAULT = false;
    static final String THEME_AUTO = "auto";
    static final String THEME_LIGHT = "light";
    static final String THEME_DARK = "dark";

    private static SharedPreferences sp(Context context) {
        return context.getSharedPreferences(FILE, Context.MODE_PRIVATE);
    }

    static boolean isSoundEnabled(Context context) {
        return sp(context).getBoolean(KEY_SOUND, SOUND_DEFAULT);
    }

    static void setSoundEnabled(Context context, boolean enabled) {
        sp(context).edit().putBoolean(KEY_SOUND, enabled).apply();
    }

    static String getThemeMode(Context context) {
        return sp(context).getString(KEY_THEME, THEME_AUTO);
    }

    static void setThemeMode(Context context, String mode) {
        sp(context).edit().putString(KEY_THEME, mode).apply();
    }

    private static String favKey(String section, String id) {
        return section + "|" + id;
    }

    static boolean isFavorite(Context context, String section, String id) {
        return favorites(context).contains(favKey(section, id));
    }

    static void toggleFavorite(Context context, String section, String id) {
        Set<String> favs = new HashSet<>(favorites(context));
        String key = favKey(section, id);
        if (!favs.add(key)) favs.remove(key);
        sp(context).edit().putStringSet(KEY_FAVORITES, favs).apply();
    }

    static Set<String> favorites(Context context) {
        return sp(context).getStringSet(KEY_FAVORITES, new HashSet<String>());
    }
}
