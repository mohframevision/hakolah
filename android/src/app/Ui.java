package bh.mohframevision.hakolah;

import android.content.Context;
import android.graphics.Typeface;
import android.text.BidiFormatter;
import android.text.TextDirectionHeuristics;
import android.util.TypedValue;
import android.view.View;
import android.widget.HorizontalScrollView;
import android.widget.TextView;

// أدوات واجهة صغيرة مشتركة بين الشاشات
final class Ui {
    private Ui() {}

    // HorizontalScrollView داخل واجهة RTL يفتح على الطرف الغلط (نهاية القائمة
    // لا بدايتها) — أول عنصر (الأيمن) ما يبان. بعد أول تخطيط نمرّره لأقصى
    // اليمين، وهو "بداية" القائمة بالعربي
    static void scrollToStart(HorizontalScrollView scroll) {
        scroll.post(new ScrollRight(scroll));
    }

    private static final class ScrollRight implements Runnable {
        private final HorizontalScrollView scroll;

        ScrollRight(HorizontalScrollView scroll) {
            this.scroll = scroll;
        }

        @Override
        public void run() {
            if (scroll.getLayoutDirection() == View.LAYOUT_DIRECTION_RTL) scroll.fullScroll(View.FOCUS_RIGHT);
        }
    }

    static int dp(Context c, float v) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, c.getResources().getDisplayMetrics());
    }

    // خط Cairo طويل الأسطر أصلاً: مضاعف تباعد فوقه (1.3-1.4) كان يفرّق الفقرات
    // ويقص السطر الثاني بالعناوين. نص عادي بلا مضاعف + إضافة صغيرة ثابتة
    static TextView text(Context c, CharSequence s, float sp, int color, boolean bold) {
        TextView t = new TextView(c);
        t.setText(s);
        t.setTextSize(sp);
        t.setTextColor(color);
        if (bold) t.setTypeface(null, Typeface.BOLD);
        t.setTextAlignment(View.TEXT_ALIGNMENT_VIEW_START);
        return t;
    }

    // أرقام الهاتف والأسعار لاتينية ومن اليسار لليمين حتى وسط نص عربي —
    // بدونها "+973" أو "2.400 BD" تنقلب أجزاؤها
    static String ltr(String s) {
        return BidiFormatter.getInstance().unicodeWrap(s, TextDirectionHeuristics.LTR);
    }
}
