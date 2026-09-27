package bh.mohframevision.hakolah;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.Configuration;
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
    private static final String KEY_MUSIC = "music_enabled";
    private static final String KEY_LANG = "lang";
    private static final String KEY_MUSIC_LEVEL = "music_level";
    private static final String KEY_MUSIC_DOCK = "music_dock_open";
    static final String LANG_AR = "ar";
    static final String LANG_EN = "en";

    // مفعّل افتراضياً: أصوات التطبيق جزء من تجربته (المالك: "ما في صوت" وهو
    // ما فعّلها). الإطفاء متاح من الإعدادات
    static final boolean SOUND_DEFAULT = true;
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

    // موسيقى صفحة القصة: تتبع إعداد الأصوات ما لم يختار المستخدم صراحة
    static boolean isMusicEnabled(Context context) {
        return sp(context).getBoolean(KEY_MUSIC, isSoundEnabled(context));
    }

    static void setMusicEnabled(Context context, boolean enabled) {
        sp(context).edit().putBoolean(KEY_MUSIC, enabled).apply();
    }

    static float getMusicLevel(Context context) {
        return sp(context).getFloat(KEY_MUSIC_LEVEL, 0.7f);
    }

    static void setMusicLevel(Context context, float level) {
        sp(context).edit().putFloat(KEY_MUSIC_LEVEL, level).apply();
    }

    // منزلق الصوت مطوي افتراضياً — يطفو فوق نص القصة فما نغطيه إلا بطلب
    static boolean isMusicDockOpen(Context context) {
        return sp(context).getBoolean(KEY_MUSIC_DOCK, false);
    }

    static void setMusicDockOpen(Context context, boolean open) {
        sp(context).edit().putBoolean(KEY_MUSIC_DOCK, open).apply();
    }

    // العربية افتراضياً (هوية التطبيق) — الإنجليزية من الإعدادات
    static String getLang(Context context) {
        return sp(context).getString(KEY_LANG, LANG_AR);
    }

    static void setLang(Context context, String lang) {
        sp(context).edit().putString(KEY_LANG, lang).apply();
    }

    static String getThemeMode(Context context) {
        return sp(context).getString(KEY_THEME, THEME_AUTO);
    }

    static void setThemeMode(Context context, String mode) {
        sp(context).edit().putString(KEY_THEME, mode).apply();
    }

    // نفس initThemeToggle بالموقع (localStorage + matchMedia) — بدون AppCompat
    // (يحتاج Gradle)، الآلية الأصلية: تعديل Configuration.uiMode قبل إنشاء
    // النشاط، فتنحل موارد values-night/ أو لا حسب التفضيل. مشترك بين كل
    // Activity بالتطبيق (attachBaseContext) — كان بـMainActivity بس، فأي
    // شاشة ثانية كانت تتبع مظهر النظام مباشرة بدل تفضيل المستخدم بالتطبيق.
    // + لغة التطبيق: نفس الآلية — Locale بالإعدادات يختار values-en/ ويقلب
    // اتجاه الواجهة (layoutDirection="locale" بالتخطيطات) لليسار-لليمين
    static Context wrapThemeContext(Context base) {
        String mode = getThemeMode(base);
        Configuration config = localized(base);
        if (!THEME_AUTO.equals(mode)) {
            int nightBit = THEME_DARK.equals(mode) ? Configuration.UI_MODE_NIGHT_YES : Configuration.UI_MODE_NIGHT_NO;
            config.uiMode = (config.uiMode & ~Configuration.UI_MODE_NIGHT_MASK) | nightBit;
        }
        return base.createConfigurationContext(config);
    }

    // شاشات غامرة داكنة دائماً ("اختار لي"، القصة) — بنفس اللغة
    static Context wrapNightContext(Context base) {
        Configuration config = localized(base);
        config.uiMode = (config.uiMode & ~Configuration.UI_MODE_NIGHT_MASK) | Configuration.UI_MODE_NIGHT_YES;
        return base.createConfigurationContext(config);
    }

    private static Configuration localized(Context base) {
        Configuration config = new Configuration(base.getResources().getConfiguration());
        java.util.Locale locale = new java.util.Locale(getLang(base));
        // layoutDirection="locale" بالتخطيطات يقرأ Locale.getDefault() (لغة
        // العملية) لا إعدادات السياق — بدون هذا، الجوال بلغة نظام إنجليزية
        // يقلب الواجهة العربية لليسار-لليمين
        java.util.Locale.setDefault(locale);
        config.setLocale(locale);
        config.setLayoutDirection(locale);
        return config;
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
