package bh.mohframevision.hakolah;

import android.content.Context;
import android.graphics.Typeface;
import android.text.BidiFormatter;
import android.text.TextDirectionHeuristics;
import android.util.TypedValue;
import android.view.View;
import android.view.ViewGroup;
import android.widget.HorizontalScrollView;
import android.widget.ImageView;
import android.widget.LinearLayout;
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

    // إيماءة الرجوع التنبؤية (Android 13+، إجبارية مع targetSdk 36): النظام ما
    // يستدعي onBackPressed بعدها، فالشاشة اللي عندها رجوع خاص (إغلاق نتيجة
    // "اختار لي"، صفحة سابقة بالمتصفح الداخلي) تسجّل هذا وقت الحاجة فقط —
    // وبغيره يشتغل أنيميشن الرجوع الافتراضي للنظام
    static final class BackCallback implements android.window.OnBackInvokedCallback {
        private final android.app.Activity activity;

        BackCallback(android.app.Activity activity) {
            this.activity = activity;
        }

        @Override
        public void onBackInvoked() {
            activity.onBackPressed();
        }
    }

    // خط العناوين (المسيري، نفس مصمم Cairo) — شخصية للعناوين الكبيرة، والنص
    // العادي يبقى Cairo. getFont من API 26؛ الأقدم يبقى Cairo عريضاً
    static void display(TextView t) {
        if (android.os.Build.VERSION.SDK_INT >= 26) {
            try {
                t.setTypeface(t.getResources().getFont(R.font.elmessiri_bold));
                return;
            } catch (Exception ignored) {
            }
        }
        t.setTypeface(null, Typeface.BOLD);
    }

    static android.graphics.drawable.GradientDrawable rounded(Context c, int color, float radiusDp) {
        android.graphics.drawable.GradientDrawable d = new android.graphics.drawable.GradientDrawable();
        d.setColor(color);
        d.setCornerRadius(dp(c, radiusDp));
        return d;
    }

    // أيقونة خطية داخل مربع بزوايا ناعمة. لون واحد هادي للكل (بلا ألوان
    // لكل قسم): العين ترتاح، والأخضر محجوز للأزرار المهمة والحالة النشطة
    static ImageView iconTile(Context c, int iconRes, int sizeDp, int bgColor, int iconColor) {
        ImageView v = new ImageView(c);
        v.setImageResource(iconRes);
        v.setColorFilter(iconColor);
        int pad = Math.round(dp(c, sizeDp) * 0.24f);
        v.setPadding(pad, pad, pad, pad);
        v.setBackground(rounded(c, bgColor, sizeDp * 0.3f));
        v.setLayoutParams(new LinearLayout.LayoutParams(dp(c, sizeDp), dp(c, sizeDp)));
        v.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        return v;
    }

    // ---- حافة لحافة (إجباري من Android 15/16 مع targetSdk 35+) ----
    // التطبيق يرسم تحت شريط الحالة وشريط التنقّل، وكل شاشة تعطي لونَي الحافتين:
    // لون = شريط بنفس اللون بارتفاع الشريط الفعلي (رأس أخضر، سطح الشريط السفلي...)،
    // 0 = الخلفية نفسها تمتد تحت الشريط والمحتوى يُزاح بـpadding (شاشات التدرّج الداكن).
    // أيقونات الشريط فاتحة أو داكنة حسب اللون تحتها. بلا AndroidX.
    static void edgeToEdge(android.app.Activity a, int topColor, int bottomColor) {
        android.view.Window w = a.getWindow();
        android.view.ViewGroup content = a.findViewById(android.R.id.content);
        View root = content.getChildAt(0);
        w.setStatusBarColor(0);
        w.setNavigationBarColor(0);
        if (android.os.Build.VERSION.SDK_INT >= 29) w.setNavigationBarContrastEnforced(false);
        boolean lightTop = topColor != 0 && isLight(topColor);
        boolean lightBottom = bottomColor != 0 && isLight(bottomColor);
        if (android.os.Build.VERSION.SDK_INT >= 30) {
            w.setDecorFitsSystemWindows(false);
            android.view.WindowInsetsController c = w.getInsetsController();
            if (c != null) {
                int flags = (lightTop ? android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS : 0)
                        | (lightBottom ? android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS : 0);
                c.setSystemBarsAppearance(flags, android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                        | android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS);
            }
        } else {
            w.getDecorView().setSystemUiVisibility(legacyFlags(lightTop, lightBottom));
        }
        View top = null;
        View bottom = null;
        // غلاف عمودي جديد دائماً (padding الجذر الأصلي يبقى كما هو). بوضع
        // الـpadding، خلفية الجذر (تدرّج) تنسخ للغلاف فتمتد تحت الشريطين
        content.removeView(root);
        LinearLayout column = new LinearLayout(a);
        column.setOrientation(LinearLayout.VERTICAL);
        if ((topColor == 0 || bottomColor == 0) && root.getBackground() != null && root.getBackground().getConstantState() != null) {
            column.setBackground(root.getBackground().getConstantState().newDrawable());
        }
        column.addView(root, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        content.addView(column, new android.widget.FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        if (topColor != 0) {
            top = new View(a);
            top.setBackgroundColor(topColor);
            column.addView(top, 0, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0));
        }
        if (bottomColor != 0) {
            bottom = new View(a);
            bottom.setBackgroundColor(bottomColor);
            column.addView(bottom, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0));
        }
        content.setOnApplyWindowInsetsListener(new Insets(column, top, bottom));
        content.requestApplyInsets();
    }

    // أعلام النظام القديمة (API 24-29) لنفس الشي: الرسم تحت الشريطين مع لون الأيقونات
    static int legacyFlags(boolean lightTop, boolean lightBottom) {
        int f = View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION;
        if (lightTop) f |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
        if (lightBottom && android.os.Build.VERSION.SDK_INT >= 26) f |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        return f;
    }

    private static boolean isLight(int color) {
        double r = ((color >> 16) & 0xFF) / 255.0;
        double g = ((color >> 8) & 0xFF) / 255.0;
        double b = (color & 0xFF) / 255.0;
        return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6;
    }

    // يطبّق أبعاد الشريطين (والنتوء/الكاميرا) على الشريطين الملوّنين أو كـpadding
    private static final class Insets implements View.OnApplyWindowInsetsListener {
        private final View column;
        private final View top;
        private final View bottom;

        Insets(View column, View top, View bottom) {
            this.column = column;
            this.top = top;
            this.bottom = bottom;
        }

        @Override
        public android.view.WindowInsets onApplyWindowInsets(View v, android.view.WindowInsets in) {
            int t;
            int b;
            int l;
            int r;
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = in.getInsets(android.view.WindowInsets.Type.systemBars()
                        | android.view.WindowInsets.Type.displayCutout());
                t = bars.top;
                b = bars.bottom;
                l = bars.left;
                r = bars.right;
            } else {
                t = in.getSystemWindowInsetTop();
                b = in.getSystemWindowInsetBottom();
                l = in.getSystemWindowInsetLeft();
                r = in.getSystemWindowInsetRight();
            }
            column.setPadding(l, top == null ? t : 0, r, bottom == null ? b : 0);
            if (top != null && top.getLayoutParams().height != t) {
                top.getLayoutParams().height = t;
                top.requestLayout();
            }
            if (bottom != null && bottom.getLayoutParams().height != b) {
                bottom.getLayoutParams().height = b;
                bottom.requestLayout();
            }
            return in;
        }
    }
}
