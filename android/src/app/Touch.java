package bh.mohframevision.hakolah;

import android.os.Build;
import android.view.HapticFeedbackConstants;
import android.view.MotionEvent;
import android.view.View;
import android.view.animation.DecelerateInterpolator;
import android.view.animation.OvershootInterpolator;

// إحساس اللمس بكل التطبيق (نفس روح منزلق الصوت بالموقع): كل زر وبطاقة
// ينضغط لتحت بسرعة ويرجع بنابض يتجاوز شوي ثم يستقر، واهتزاز خفيف مختلف
// حسب نوع الفعل (نقرة/تأكيد/تشغيل/إيقاف) بدل اهتزاز واحد لكل شي.
final class Touch {
    static final int TICK = 0;
    static final int TAP = 1;
    static final int CONFIRM = 2;
    static final int TOGGLE_ON = 3;
    static final int TOGGLE_OFF = 4;
    static final int REJECT = 5;

    private Touch() {}

    // الثوابت الأدق (TOGGLE_ON، SEGMENT_TICK...) أحدث من minSdk 24 — نختار
    // الأقرب المتاح بكل إصدار بدل ما نستغني عنها كلها
    static void haptic(View v, int kind) {
        int api = Build.VERSION.SDK_INT;
        int c;
        switch (kind) {
            case TICK:
                c = api >= 34 ? HapticFeedbackConstants.SEGMENT_FREQUENT_TICK : HapticFeedbackConstants.CLOCK_TICK;
                break;
            case CONFIRM:
                c = api >= 30 ? HapticFeedbackConstants.CONFIRM : HapticFeedbackConstants.LONG_PRESS;
                break;
            case TOGGLE_ON:
                c = api >= 34 ? HapticFeedbackConstants.TOGGLE_ON : HapticFeedbackConstants.VIRTUAL_KEY;
                break;
            case TOGGLE_OFF:
                c = api >= 34 ? HapticFeedbackConstants.TOGGLE_OFF : HapticFeedbackConstants.CLOCK_TICK;
                break;
            case REJECT:
                c = api >= 30 ? HapticFeedbackConstants.REJECT : HapticFeedbackConstants.LONG_PRESS;
                break;
            default:
                c = HapticFeedbackConstants.KEYBOARD_TAP;
                break;
        }
        v.performHapticFeedback(c);
    }

    // صوت + اهتزاز معاً — أغلب الأفعال تحتاج الاثنين
    static void feedback(View v, int hapticKind, int sound) {
        haptic(v, hapticKind);
        SoundPlayer.play(v.getContext(), sound);
    }

    static void springy(View v) {
        springy(v, 0.95f);
    }

    static void springy(View v, float pressedScale) {
        v.setOnTouchListener(new Spring(pressedScale));
    }

    private static final class Spring implements View.OnTouchListener {
        private static final DecelerateInterpolator PRESS = new DecelerateInterpolator(2f);
        private static final OvershootInterpolator RELEASE = new OvershootInterpolator(3f);
        private final float scale;

        Spring(float scale) {
            this.scale = scale;
        }

        @Override
        public boolean onTouch(View v, MotionEvent e) {
            switch (e.getActionMasked()) {
                case MotionEvent.ACTION_DOWN:
                    v.animate().scaleX(scale).scaleY(scale).setDuration(110).setInterpolator(PRESS).start();
                    break;
                case MotionEvent.ACTION_UP:
                case MotionEvent.ACTION_CANCEL:
                    v.animate().scaleX(1f).scaleY(1f).setDuration(450).setInterpolator(RELEASE).start();
                    break;
                default:
                    break;
            }
            // عنصر قابل للضغط: نخلّي معالجته الأصلية تشتغل (الضغطة والتموّج).
            // بطاقة غير قابلة للضغط: لازم "نملك" اللمسة من أولها وإلا ما يوصلنا
            // الرفع (ACTION_UP) وتبقى البطاقة منضغطة — القائمة تسحبها منّا
            // (CANCEL) أول ما يصير تمرير، فالتمرير ما يتأثر
            return !v.isClickable() && e.getActionMasked() == MotionEvent.ACTION_DOWN;
        }
    }
}
