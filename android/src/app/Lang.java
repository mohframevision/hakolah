package bh.mohframevision.hakolah;

import android.content.Context;
import org.json.JSONObject;

// محتوى العناصر حسب لغة التطبيق: app-data.json فيه الحقلين (title/title_en،
// desc/desc_en، ...) من نفس المصدر بالموقع. الإنجليزي يرجع للعربي لو فاضي —
// عنصر ما تُرجم بعد يبان بالعربي بدل ما يطلع فاضي.
final class Lang {
    private Lang() {}

    static boolean en(Context c) {
        return Prefs.LANG_EN.equals(Prefs.getLang(c));
    }

    private static String pick(Context c, JSONObject o, String key) {
        if (o == null) return "";
        if (en(c)) {
            String v = o.optString(key + "_en", "");
            if (!v.isEmpty()) return v;
        }
        return o.optString(key, "");
    }

    static String title(Context c, JSONObject o) {
        return pick(c, o, "title");
    }

    static String desc(Context c, JSONObject o) {
        return pick(c, o, "desc");
    }

    static String hours(Context c, JSONObject o) {
        return pick(c, o, "hours");
    }

    static String content(Context c, JSONObject o) {
        if (o == null) return "";
        if (en(c)) {
            String v = o.optString("contentHtml_en", "");
            if (!v.isEmpty()) return v;
        }
        return o.optString("contentHtml", "");
    }

    // التصنيف نفسه يبقى بالعربي كمفتاح فلترة؛ هذا بس للعرض — من قاموس
    // tagsEn بنفس ملف البيانات (tags_en.js بالموقع)
    static String tag(Context c, String tag) {
        if (!en(c) || MainActivity.cachedTagsEn == null) return tag;
        String v = MainActivity.cachedTagsEn.optString(tag, "");
        return v.isEmpty() ? tag : v;
    }

    // روابط الموقع: الصفحات الإنجليزية تحت en/ وبـslug إنجليزي أحياناً
    static String siteUrl(Context c, String path) {
        return HakolahApi.ORIGIN + (en(c) ? "en/" : "") + path;
    }

    static String detailPath(Context c, JSONObject item) {
        if (en(c)) {
            String v = item.optString("detailUrlEn", "");
            if (!v.isEmpty()) return v;
        }
        return item.optString("detailUrl", "");
    }

    static String detailUrl(Context c, JSONObject item) {
        return siteUrl(c, detailPath(c, item));
    }
}
