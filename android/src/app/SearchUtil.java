package bh.mohframevision.hakolah;

// منفذ بالضبط من levenshtein()/fuzzyIncludes() بـmain.js — نفس التسامح
// بالأخطاء الإملائية (مسافة تحرير ≤1 لكلمة قصيرة، ≤2 لكلمة أطول)
class SearchUtil {
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
        String hay = haystack == null ? "" : haystack.toLowerCase();
        String q = query == null ? "" : query.trim().toLowerCase();
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
