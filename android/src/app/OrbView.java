package bh.mohframevision.hakolah;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.util.AttributeSet;
import android.view.MotionEvent;
import android.view.View;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.json.JSONObject;

// كرة ثلاثية الأبعاد من أيقونات العناصر (فكرة Recollect بهوية هكوله، وبلا
// صور — إيموجي العناصر نفسها داخل بلاطات زجاجية). النقاط موزّعة على الكرة
// بلولب فيبوناتشي (توزيع متساوٍ بلا تكتّل)، تدور ببطء وحدها، وتلفّها بإصبعك
// بقصور ذاتي. أثناء الاختيار تدور بسرعة وتتباطأ، ومع كل عنصر يصير بالمقدمة
// نقرة صوت + اهتزاز خفيف — نفس إحساس دولاب يوقف على خانة.
public class OrbView extends View {
    interface Listener {
        void onFrontItem(JSONObject item, boolean spinning);

        void onSpinEnd();
    }

    private static final int POINTS = 56;
    private static final double IDLE_SPEED = 0.22; // راديان/ثانية
    private static final double TILT = 0.32;

    private final List<JSONObject> items = new ArrayList<>();
    private final Map<String, Bitmap> glyphs = new HashMap<>();
    private final double[] px = new double[POINTS], py = new double[POINTS], pz = new double[POINTS];
    private final double[] sx = new double[POINTS], sy = new double[POINTS], sz = new double[POINTS];
    private final int[] order = new int[POINTS];
    private final Paint tilePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint strokePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint glyphPaint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
    private final RectF rect = new RectF();

    private Listener listener;
    private double yaw;
    private double pitch = TILT;
    private double velocity = IDLE_SPEED;
    private long lastFrame;
    private int front = -1;
    private long lastTickAt;

    private boolean spinning;
    private long spinStart;
    private long spinDuration;
    private boolean dragging;
    private float lastX, lastY;
    private long lastMoveAt;
    private double dragVelocity;

    public OrbView(Context context, AttributeSet attrs) {
        super(context, attrs);
        double golden = Math.PI * (3 - Math.sqrt(5));
        for (int i = 0; i < POINTS; i++) {
            double y = 1 - 2 * (i + 0.5) / POINTS;
            double r = Math.sqrt(1 - y * y);
            px[i] = Math.cos(golden * i) * r;
            py[i] = y;
            pz[i] = Math.sin(golden * i) * r;
        }
        tilePaint.setColor(0xFFFFFFFF);
        strokePaint.setStyle(Paint.Style.STROKE);
        strokePaint.setColor(0xFFFFFFFF);
        strokePaint.setStrokeWidth(dp(1));
    }

    void setListener(Listener l) {
        listener = l;
    }

    // عناصر أقل من نقاط الكرة تتكرر — قسم فيه 4 مخبوزات يعطي كرة ممتلئة برضه
    void setItems(List<JSONObject> list) {
        items.clear();
        items.addAll(list);
        front = -1;
        invalidate();
    }

    private JSONObject itemAt(int point) {
        return items.isEmpty() ? null : items.get(point % items.size());
    }

    // دوران سريع يتباطأ أسّياً حتى سرعة الخمول خلال المدة، ثم onSpinEnd
    void spin(long durationMs) {
        spinning = true;
        spinStart = System.currentTimeMillis();
        spinDuration = durationMs;
        invalidate();
    }

    boolean isSpinning() {
        return spinning;
    }

    @Override
    protected void onDraw(Canvas canvas) {
        long now = System.nanoTime();
        double dt = lastFrame == 0 ? 0 : Math.min(0.05, (now - lastFrame) / 1e9);
        lastFrame = now;
        step(dt);

        int w = getWidth(), h = getHeight();
        double radius = Math.min(w, h) * 0.44;
        double cx = w / 2.0, cy = h / 2.0;
        double cosY = Math.cos(yaw), sinY = Math.sin(yaw), cosX = Math.cos(pitch), sinX = Math.sin(pitch);
        for (int i = 0; i < POINTS; i++) {
            double x = px[i] * cosY + pz[i] * sinY;
            double z = -px[i] * sinY + pz[i] * cosY;
            double y = py[i] * cosX - z * sinX;
            z = py[i] * sinX + z * cosX;
            // منظور: الأقرب (z موجب) أكبر وأوضح
            double persp = 1.6 / (2.4 - z);
            sx[i] = cx + x * radius * persp;
            sy[i] = cy + y * radius * persp;
            sz[i] = z;
            order[i] = i;
        }
        // ترتيب إدراج من الأبعد للأقرب (نرسم الخلفي أول) — بلا Comparator
        for (int i = 1; i < POINTS; i++) {
            int key = order[i];
            int j = i - 1;
            while (j >= 0 && sz[order[j]] > sz[key]) {
                order[j + 1] = order[j];
                j--;
            }
            order[j + 1] = key;
        }

        float base = dp(40);
        for (int k = 0; k < POINTS; k++) {
            int i = order[k];
            JSONObject item = itemAt(i);
            if (item == null) continue;
            double depth = (sz[i] + 1) / 2; // 0 خلف .. 1 قدّام
            float size = (float) (base * (0.45 + 0.75 * depth));
            int alpha = (int) (255 * (0.18 + 0.82 * depth));
            float half = size / 2;
            rect.set((float) sx[i] - half, (float) sy[i] - half, (float) sx[i] + half, (float) sy[i] + half);
            float corner = size * 0.28f;
            tilePaint.setAlpha((int) (alpha * 0.10));
            canvas.drawRoundRect(rect, corner, corner, tilePaint);
            strokePaint.setAlpha((int) (alpha * 0.22));
            canvas.drawRoundRect(rect, corner, corner, strokePaint);
            Bitmap g = glyph(item.optString("icon", "⭐"));
            glyphPaint.setAlpha(alpha);
            float inset = size * 0.18f;
            rect.inset(inset, inset);
            canvas.drawBitmap(g, null, rect, glyphPaint);
        }

        int newFront = order[POINTS - 1];
        if (newFront != front) {
            front = newFront;
            onFrontChanged();
        }
        if (isShown()) postInvalidateOnAnimation();
    }

    private void step(double dt) {
        if (spinning) {
            double t = (System.currentTimeMillis() - spinStart) / (double) spinDuration;
            if (t >= 1) {
                spinning = false;
                velocity = IDLE_SPEED;
                if (listener != null) listener.onSpinEnd();
            } else {
                // سرعة بدء عالية تذوب أسّياً — نفس تباطؤ الدولاب قبل ما يوقف
                velocity = IDLE_SPEED + 16 * Math.pow(1 - t, 2.6);
            }
        } else if (!dragging) {
            // بعد الإفلات: القصور الذاتي يرجع تدريجياً لسرعة الخمول
            velocity += (IDLE_SPEED - velocity) * Math.min(1, dt * 1.6);
            pitch += (TILT - pitch) * Math.min(1, dt * 1.2);
        }
        if (!dragging) yaw += velocity * dt;
    }

    private void onFrontChanged() {
        long now = System.currentTimeMillis();
        boolean fast = spinning || dragging || Math.abs(velocity) > 1.2;
        // نقرة لكل عنصر يمر بالمقدمة، بحد أدنى للتباعد عشان ما تصير أزيز
        if (fast && now - lastTickAt > 55) {
            lastTickAt = now;
            Touch.haptic(this, Touch.TICK);
            SoundPlayer.play(getContext(), SoundPlayer.TICK);
        }
        if (listener != null && front >= 0) listener.onFrontItem(itemAt(front), spinning);
    }

    @Override
    public boolean onTouchEvent(MotionEvent e) {
        if (spinning) return true;
        float w = Math.max(1, getWidth());
        switch (e.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                dragging = true;
                lastX = e.getX();
                lastY = e.getY();
                lastMoveAt = System.nanoTime();
                dragVelocity = 0;
                getParent().requestDisallowInterceptTouchEvent(true);
                return true;
            case MotionEvent.ACTION_MOVE: {
                float dx = e.getX() - lastX;
                float dy = e.getY() - lastY;
                long now = System.nanoTime();
                double dt = Math.max(1e-3, (now - lastMoveAt) / 1e9);
                double dYaw = dx / w * Math.PI;
                yaw += dYaw;
                pitch = Math.max(-0.9, Math.min(0.9, pitch - dy / w * Math.PI));
                dragVelocity = dragVelocity * 0.6 + (dYaw / dt) * 0.4;
                lastX = e.getX();
                lastY = e.getY();
                lastMoveAt = now;
                return true;
            }
            case MotionEvent.ACTION_UP:
            case MotionEvent.ACTION_CANCEL:
                dragging = false;
                velocity = Math.max(-12, Math.min(12, dragVelocity));
                return true;
            default:
                return true;
        }
    }

    // الإيموجي يُرسم مرة وحدة لصورة صغيرة ويُعاد استخدامه بكل إطار — رسم نص
    // إيموجي ملوّن 56 مرة بكل إطار أثقل بكثير من رسم صورة جاهزة
    private Bitmap glyph(String emoji) {
        Bitmap b = glyphs.get(emoji);
        if (b != null) return b;
        int size = (int) dp(72);
        b = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(b);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setTextSize(size * 0.78f);
        p.setTextAlign(Paint.Align.CENTER);
        Paint.FontMetrics fm = p.getFontMetrics();
        c.drawText(emoji, size / 2f, size / 2f - (fm.ascent + fm.descent) / 2, p);
        glyphs.put(emoji, b);
        return b;
    }

    private float dp(float v) {
        return v * getResources().getDisplayMetrics().density;
    }

    @Override
    protected void onVisibilityChanged(View changedView, int visibility) {
        super.onVisibilityChanged(changedView, visibility);
        lastFrame = 0;
        if (visibility == VISIBLE) invalidate();
    }
}
