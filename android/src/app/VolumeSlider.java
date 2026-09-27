package bh.mohframevision.hakolah;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.drawable.Drawable;
import android.util.AttributeSet;
import android.view.MotionEvent;
import android.view.View;
import android.view.animation.OvershootInterpolator;

// منزلق صوت عمودي مثل الجوال — نفس منزلق صفحة القصة بالموقع: سحب نسبي
// (المستوى يتحرك من مكانه، ما يقفز لنقطة الإصبع)، ضغطة بلا سحب تقفز للنقطة،
// نقرة بنغمة تعلى + اهتزاز عند كل 10٪، ومطّ مطاطي لو سحبت بعد الحد يرجع
// بنابض. التعبئة بأخضر هكوله، والأيقونة تتبدّل (صامت/واطي/عالي).
public class VolumeSlider extends View {
    interface Listener {
        void onLevel(float level, boolean dragging);

        void onRelease(float level);
    }

    private final Paint track = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint fill = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final RectF rect = new RectF();
    private final Path clip = new Path();
    private Listener listener;
    private float level = 0.7f;
    private int lastStep;
    private float downY, startLevel;
    private boolean moved;
    private Drawable iconOff, iconDown, iconUp;

    public VolumeSlider(Context context, AttributeSet attrs) {
        super(context, attrs);
        track.setColor(0x1FFFFFFF);
        iconOff = context.getDrawable(R.drawable.ic_volume_off).mutate();
        iconDown = context.getDrawable(R.drawable.ic_volume_down).mutate();
        iconUp = context.getDrawable(R.drawable.ic_volume_up).mutate();
        setClickable(true);
        setFocusable(true);
    }

    void setListener(Listener l) {
        listener = l;
    }

    void setLevel(float l) {
        level = Math.max(0f, Math.min(1f, l));
        lastStep = Math.round(level * 10);
        invalidate();
    }

    float getLevel() {
        return level;
    }

    @Override
    protected void onSizeChanged(int w, int h, int ow, int oh) {
        fill.setShader(new LinearGradient(0, h, 0, 0, 0xFF3FA480, 0xFFA8E6CB, Shader.TileMode.CLAMP));
    }

    @Override
    protected void onDraw(Canvas c) {
        int w = getWidth(), h = getHeight();
        float r = w / 2f;
        rect.set(0, 0, w, h);
        clip.reset();
        clip.addRoundRect(rect, r, r, Path.Direction.CW);
        c.save();
        c.clipPath(clip);
        c.drawRect(rect, track);
        c.drawRect(0, h * (1 - level), w, h, fill);
        c.restore();
        // الأيقونة داكنة فوق التعبئة، وبيضاء لما المستوى واطي وتحتها فراغ
        Drawable icon = level == 0 ? iconOff : level < 0.5f ? iconDown : iconUp;
        int s = (int) (w * 0.46f);
        int left = (w - s) / 2, bottom = h - (int) (w * 0.24f);
        icon.setBounds(left, bottom - s, left + s, bottom);
        icon.setTint(level < 0.22f ? 0xFFFFFFFF : 0xFF06140F);
        icon.draw(c);
    }

    private void apply(float l, boolean fromUser) {
        level = Math.max(0f, Math.min(1f, l));
        int step = Math.round(level * 10);
        if (fromUser && step != lastStep) {
            // "درجات" ملموسة: نغمة تعلى مع المستوى + اهتزاز خفيف
            SoundPlayer.play(getContext(), SoundPlayer.note(Math.min(7, step * 7 / 10)));
            Touch.haptic(this, Touch.TICK);
        }
        lastStep = step;
        invalidate();
        if (listener != null) listener.onLevel(level, fromUser);
    }

    @Override
    public boolean onTouchEvent(MotionEvent e) {
        float h = Math.max(1, getHeight());
        switch (e.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                downY = e.getY();
                startLevel = level;
                moved = false;
                getParent().requestDisallowInterceptTouchEvent(true);
                animate().cancel();
                return true;
            case MotionEvent.ACTION_MOVE: {
                float dy = downY - e.getY();
                if (!moved && Math.abs(dy) < 6) return true;
                moved = true;
                float raw = startLevel + dy / h;
                apply(raw, true);
                // مطّ مطاطي بعد الحد: يتناقص كلما سحبت أكثر (نفس إحساس الجوال)
                float over = raw > 1 ? raw - 1 : raw < 0 ? -raw : 0;
                float stretch = (float) (0.1 * (1 - Math.exp(-over * 4)));
                setPivotY(raw > 1 ? h : 0);
                setScaleY(1 + stretch);
                setScaleX(1 - stretch * 0.4f);
                return true;
            }
            case MotionEvent.ACTION_UP:
            case MotionEvent.ACTION_CANCEL:
                if (!moved && e.getActionMasked() == MotionEvent.ACTION_UP) apply(1 - e.getY() / h, true);
                animate().scaleX(1f).scaleY(1f).setDuration(480).setInterpolator(new OvershootInterpolator(3f)).start();
                if (listener != null) listener.onRelease(level);
                return true;
            default:
                return true;
        }
    }
}
