package bh.mohframevision.hakolah;

import android.content.Context;
import android.util.AttributeSet;
import android.view.MotionEvent;
import android.view.VelocityTracker;
import android.view.View;
import android.view.ViewConfiguration;
import android.view.animation.DecelerateInterpolator;
import android.view.animation.OvershootInterpolator;
import android.widget.FrameLayout;
import java.util.ArrayList;
import java.util.List;

// رصّة بطاقات "اختيار اليوم" (نفس فكرة رصّة الأعمال بموقع Unveil وموقعك
// الشخصي): البطاقة الأمامية تسحبها يمين/يسار فتطير وترجع لآخر الرصّة، واللي
// وراها تتقدّم بنابض. عند تجاوز حد الرمي أثناء السحب نقرة اهتزاز واحدة
// (إحساس "مسكة" ملموسة)، ومع كل رمية صوت خفيف. أزرار البطاقة تبقى قابلة
// للضغط — السحب الأفقي وحده ينتزع اللمسة منها.
public class CardStackView extends FrameLayout {
    interface Listener {
        void onTopChanged(int index, int count);
    }

    private static final int VISIBLE = 4;
    private final List<View> cards = new ArrayList<>();
    private final int touchSlop;
    private Listener listener;
    private int topIndex;

    private float downX, downY;
    private boolean dragging;
    private boolean pastThreshold;
    private VelocityTracker tracker;

    public CardStackView(Context context, AttributeSet attrs) {
        super(context, attrs);
        touchSlop = ViewConfiguration.get(context).getScaledTouchSlop();
        setClipChildren(false);
        setClipToPadding(false);
    }

    void setListener(Listener l) {
        listener = l;
    }

    void setCards(List<View> views) {
        removeAllViews();
        cards.clear();
        cards.addAll(views);
        topIndex = 0;
        // نضيف من الأخير للأول: آخر مضاف يترسم فوق، فالأولى تكون بالمقدمة
        for (int i = cards.size() - 1; i >= 0; i--) addView(cards.get(i));
        layoutStack(false);
        if (listener != null) listener.onTopChanged(topIndex, cards.size());
    }

    private float dp(float v) {
        return v * getResources().getDisplayMetrics().density;
    }

    // كل بطاقة وراء الأمامية: أصغر شوي ومرفوعة لفوق — معتمة لا شفافة، وإلا
    // تتراكب نصوص البطاقات الخلفية فوق بعض وقت السحب
    private void layoutStack(boolean animate) {
        for (int i = 0; i < cards.size(); i++) {
            View c = cards.get(i);
            int depth = i;
            float scale = 1f - Math.min(depth, VISIBLE) * 0.06f;
            float ty = -Math.min(depth, VISIBLE) * dp(13);
            float alpha = depth >= VISIBLE ? 0f : 1f;
            c.setTranslationZ(-depth);
            if (animate) {
                c.animate().scaleX(scale).scaleY(scale).translationY(ty).translationX(0).rotation(0).alpha(alpha)
                        .setDuration(520).setInterpolator(new OvershootInterpolator(1.3f)).start();
            } else {
                c.setScaleX(scale);
                c.setScaleY(scale);
                c.setTranslationY(ty);
                c.setAlpha(alpha);
            }
        }
    }

    private View top() {
        return cards.isEmpty() ? null : cards.get(0);
    }

    @Override
    public boolean onInterceptTouchEvent(MotionEvent e) {
        if (cards.size() < 2) return false;
        switch (e.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                downX = e.getX();
                downY = e.getY();
                dragging = false;
                return false;
            case MotionEvent.ACTION_MOVE:
                float dx = e.getX() - downX, dy = e.getY() - downY;
                if (Math.abs(dx) > touchSlop && Math.abs(dx) > Math.abs(dy) * 1.2f) {
                    dragging = true;
                    pastThreshold = false;
                    getParent().requestDisallowInterceptTouchEvent(true);
                    return true;
                }
                return false;
            default:
                return false;
        }
    }

    @Override
    public boolean onTouchEvent(MotionEvent e) {
        View top = top();
        if (top == null || cards.size() < 2) return false;
        if (tracker == null) tracker = VelocityTracker.obtain();
        tracker.addMovement(e);
        float threshold = getWidth() * 0.28f;
        switch (e.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                downX = e.getX();
                return true;
            case MotionEvent.ACTION_MOVE: {
                float dx = e.getX() - downX;
                if (!dragging && Math.abs(dx) > touchSlop) {
                    dragging = true;
                    getParent().requestDisallowInterceptTouchEvent(true);
                }
                if (!dragging) return true;
                top.setTranslationX(dx);
                top.setRotation(dx / getWidth() * 10f);
                boolean past = Math.abs(dx) > threshold;
                if (past != pastThreshold) {
                    pastThreshold = past;
                    Touch.haptic(this, past ? Touch.TICK : Touch.TOGGLE_OFF);
                }
                return true;
            }
            case MotionEvent.ACTION_UP:
            case MotionEvent.ACTION_CANCEL: {
                tracker.computeCurrentVelocity(1000);
                float vx = tracker.getXVelocity();
                tracker.recycle();
                tracker = null;
                float dx = top.getTranslationX();
                boolean fling = Math.abs(vx) > 1400 && Math.signum(vx) == Math.signum(dx);
                if (dragging && (Math.abs(dx) > threshold || fling)) {
                    throwTop(dx >= 0 ? 1 : -1);
                } else {
                    top.animate().translationX(0).rotation(0).setDuration(480)
                            .setInterpolator(new OvershootInterpolator(2.2f)).start();
                }
                dragging = false;
                return true;
            }
            default:
                return true;
        }
    }

    // البطاقة تطير بجهة السحب، ثم ترجع لآخر الرصّة وتتقدّم البقية
    private void throwTop(int dir) {
        View top = cards.remove(0);
        cards.add(top);
        topIndex = (topIndex + 1) % cards.size();
        Touch.haptic(this, Touch.CONFIRM);
        SoundPlayer.play(getContext(), SoundPlayer.TAP);
        top.animate().translationX(dir * getWidth() * 1.1f).rotation(dir * 18f).alpha(0f).setDuration(260)
                .setInterpolator(new DecelerateInterpolator()).withEndAction(new SendToBack(this, top)).start();
        for (int i = 0; i < cards.size() - 1; i++) {
            View c = cards.get(i);
            float scale = 1f - Math.min(i, VISIBLE) * 0.06f;
            c.setTranslationZ(-i);
            c.animate().scaleX(scale).scaleY(scale).translationY(-Math.min(i, VISIBLE) * dp(13))
                    .alpha(i >= VISIBLE ? 0f : 1f).setDuration(520)
                    .setInterpolator(new OvershootInterpolator(1.3f)).start();
        }
        if (listener != null) listener.onTopChanged(topIndex, cards.size());
    }

    private static final class SendToBack implements Runnable {
        private final CardStackView stack;
        private final View card;

        SendToBack(CardStackView stack, View card) {
            this.stack = stack;
            this.card = card;
        }

        @Override
        public void run() {
            // يرجع لأسفل ترتيب الرسم (أول ابن = يترسم أول = بالخلف)
            stack.removeView(card);
            stack.addView(card, 0);
            card.setTranslationX(0);
            card.setRotation(0);
            int depth = stack.cards.size() - 1;
            float scale = 1f - Math.min(depth, VISIBLE) * 0.06f;
            card.setScaleX(scale);
            card.setScaleY(scale);
            card.setTranslationY(-Math.min(depth, VISIBLE) * stack.dp(13));
            card.setTranslationZ(-depth);
            card.animate().alpha(depth >= VISIBLE ? 0f : 1f).setDuration(300).start();
        }
    }
}
