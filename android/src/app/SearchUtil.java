package bh.mohframevision.hakolah;

import java.util.regex.Pattern;

// منفذ بالضبط من levenshtein()/fuzzyIncludes() بـmain.js — نفس التسامح
// بالأخطاء الإملائية (مسافة تحرير ≤1 لكلمة قصيرة، ≤2 لكلمة أطول) — مع
// تطبيع عربي إضافي (تشكيل، همزات، تاء مربوطة) غير موجود بالموقع، عشان
// "مطعم" يطابق "مطعـٌم" و"أحمد" يطابق "احمد" و"مكتبه" يطابق "مكتبة"
class SearchUtil {
    // U+064B-U+065F تشكيل، U+0670 ألف خنجرية، U+0640 تطويل
    private static final Pattern DIACRITICS = Pattern.compile("[\\u064B-\\u065F\\u0670\\u0640]");

    static String normalizeArabic(String s) {
        if (s == null) return "";
        String out = DIACRITICS.matcher(s).replaceAll("");
        out = out.replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا')
                .replace('ة', 'ه').replace('ى', 'ي');
        return out;
    }
    static int levenshtein(String a, String b) {
        int m = a.length();
        int n = b.length();
        if (m == 0) return n;
        if (n == 0) return m;

        int[] prevRow = new int[n + 1];
        for (int j = 0; j <= n; j++) prevRow[j] = j;

        for (int i = 1; i <= m; i++) {
            int[] currRow = new int[n + 1];
            currRow[0] = i;
            for (int j = 1; j <= n; j++) {
                if (a.charAt(i - 1) == b.charAt(j - 1)) {
                    currRow[j] = prevRow[j - 1];
                } else {
                    currRow[j] = 1 + Math.min(prevRow[j], Math.min(currRow[j - 1], prevRow[j - 1]));
                }
            }
            prevRow = currRow;
        }
        return prevRow[n];
    }

    static boolean fuzzyIncludes(String haystack, String query) {
        String hay = normalizeArabic(haystack == null ? "" : haystack.toLowerCase());
        String q = normalizeArabic(query == null ? "" : query.trim().toLowerCase());
        if (q.isEmpty()) return true;
        if (hay.contains(q)) return true;

        String[] hayWords = hay.trim().split("\\s+");
        String[] qWords = q.split("\\s+");

        for (String qw : qWords) {
            if (qw.isEmpty()) continue;
            boolean matched = false;
            int maxDist = qw.length() <= 4 ? 1 : 2;
            for (String hw : hayWords) {
                if (hw.contains(qw) || levenshtein(hw, qw) <= maxDist) {
                    matched = true;
                    break;
                }
            }
            if (!matched) return false;
        }
        return true;
    }
}
