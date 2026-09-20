package bh.mohframevision.hakolah;

import android.animation.ObjectAnimator;
import android.app.Activity;
import android.content.Context;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.Animation;
import android.view.animation.ScaleAnimation;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.util.Random;
import org.json.JSONArray;
import org.json.JSONObject;

// نفس initRandomPicker بالموقع بالضبط: اختيار قسم، دوران "سلوت مشين" بتباطؤ
// تصاعدي (60ms→350ms على مدى 1.8 ثانية)، ثم كشف بأزرار التواصل الفعلية +
// إعادة المحاولة + إغلاق. الصورة والانفجار الفيزيائي لكل قطعة معلومة
// (burstPieces بالموقع) اختُصرا هنا لظهور نص+كونفيتي بسيط بدل حركة كل قطعة
// من زاوية عشوائية — الأثر البصري "كشف مفاجئ" واحد، التنفيذ أخف بكثير.
// ponytail: burst فيزيائي لكل قطعة لو صار مطلوباً بصرياً لاحقاً.
//
// بلا lambdas ولا كلاسات مجهولة — د8 بهذي البيئة يفشل عليها.
public class PickerActivity extends Activity implements View.OnClickListener {
    private static final String PREFIX_CATEGORY = "cat:";
    private static final String ACTION_RETRY = "action:retry";
    private static final String ACTION_CLOSE = "action:close";

    private LinearLayout categoriesWrap;
    private TextView spinBtn;
    private FrameLayout stage;
    private final Handler handler = new Handler(Looper.getMainLooper());

    private JSONObject sections;
    private String selectedSection;
    private JSONArray currentItems;

    @Override
    protected void attachBaseContext(Context newBase) {
        super.attachBaseContext(Prefs.wrapThemeContext(newBase));
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_picker);

        sections = MainActivity.cachedSections;
        categoriesWrap = findViewById(R.id.pickerCategories);
        spinBtn = findViewById(R.id.pickerSpinBtn);
        stage = findViewById(R.id.pickerStage);
        findViewById(R.id.pickerCloseButton).setOnClickListener(this);
        BottomNav.attach(this, findViewById(R.id.bottomNav), BottomNav.PICKER);
        spinBtn.setOnClickListener(this);

        buildCategories();
    }

    private void buildCategories() {
        categoriesWrap.removeAllViews();
        JSONArray order = MainActivity.cachedSectionOrder;
        if (sections == null || order == null) return;

        for (int i = 0; i < order.length(); i++) {
            String slug = order.optString(i);
            JSONObject section = sections.optJSONObject(slug);
            if (!MainActivity.isBrowsable(section)) continue;
            JSONArray items = section.optJSONArray("items");
            if (items == null || items.length() == 0) continue;

            LinearLayout chip = new LinearLayout(this);
            chip.setOrientation(LinearLayout.VERTICAL);
            chip.setGravity(Gravity.CENTER);
            chip.setBackgroundResource(R.drawable.picker_category_bg);
            int padH = LinkButtons.dp(this, 16);
            int padV = LinkButtons.dp(this, 16);
            chip.setPadding(padH, padV, padH, padV);
            LinearLayout.LayoutParams lp =
                    new LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            lp.setMarginEnd(LinkButtons.dp(this, 8));
            chip.setLayoutParams(lp);
            chip.setClickable(true);
            chip.setFocusable(true);
            chip.setTag(PREFIX_CATEGORY + slug);
            chip.setOnClickListener(this);

            TextView icon = new TextView(this);
            icon.setText(section.optString("icon", "⭐"));
            icon.setTextSize(24f);
            icon.setGravity(Gravity.CENTER);
            chip.addView(icon);

            TextView label = new TextView(this);
            label.setText(section.optString("title", slug));
            label.setTextSize(12f);
            label.setTextColor(getColor(R.color.text));
            label.setGravity(Gravity.CENTER);
            label.setPadding(0, LinkButtons.dp(this, 4), 0, 0);
            chip.addView(label);

            categoriesWrap.addView(chip);
        }
    }

    @Override
    public void onBackPressed() {
        super.onBackPressed();
        overridePendingTransition(0, 0);
    }

    @Override
    public void onClick(View v) {
        if (v.getId() == R.id.pickerCloseButton) {
            finish();
            overridePendingTransition(0, 0);
            return;
        }
        if (v.getId() == R.id.pickerSpinBtn) {
            v.performHapticFeedback(android.view.HapticFeedbackConstants.VIRTUAL_KEY);
            SoundPlayer.playClick(this);
            spin();
            return;
        }
        Object tagObj = v.getTag();
        if (!(tagObj instanceof String)) return;
        String tag = (String) tagObj;
        if (tag.startsWith(PREFIX_CATEGORY)) {
            selectCategory(tag.substring(PREFIX_CATEGORY.length()));
        } else if (tag.startsWith("url:") || tag.startsWith("tel:")) {
            SoundPlayer.playClick(this);
            LinkButtons.handleClick(this, tag);
        } else if (tag.equals(ACTION_RETRY)) {
            SoundPlayer.playClick(this);
            spin();
        } else if (tag.equals(ACTION_CLOSE)) {
            SoundPlayer.playClick(this);
            stage.removeAllViews();
            spinBtn.setEnabled(true);
            spinBtn.setAlpha(1f);
        }
    }

    private void selectCategory(String slug) {
        selectedSection = slug;
        currentItems = sections.optJSONObject(slug).optJSONArray("items");
        String tag = PREFIX_CATEGORY + slug;
        for (int i = 0; i < categoriesWrap.getChildCount(); i++) {
            View chip = categoriesWrap.getChildAt(i);
            chip.setActivated(tag.equals(chip.getTag()));
        }
        spinBtn.setEnabled(true);
        spinBtn.setAlpha(1f);
        stage.removeAllViews();
        SoundPlayer.playClick(this);
    }

    private void spin() {
        if (currentItems == null || currentItems.length() == 0) return;
        spinBtn.setEnabled(false);
        spinBtn.setAlpha(0.5f);
        stage.removeAllViews();

        TextView slot = new TextView(this);
        slot.setGravity(Gravity.CENTER);
        slot.setTextSize(20f);
        slot.setTextColor(getColor(R.color.text));
        slot.setPadding(0, LinkButtons.dp(this, 40), 0, LinkButtons.dp(this, 40));
        slot.setLayoutParams(new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        stage.addView(slot);

        JSONObject finalItem = currentItems.optJSONObject(new Random().nextInt(currentItems.length()));
        handler.post(new SpinTick(this, slot, currentItems, finalItem, System.currentTimeMillis(), 60));
    }

    // كلاس علوي مسمّى (مو مجهول ولا lambda) — يعيد جدولة نفسه عبر Handler
    // بتباطؤ متزايد، بنفس منطق tick() بالموقع بالضبط
    private static class SpinTick implements Runnable {
        private static final long DURATION_MS = 1800;
        private static final Random random = new Random();

        private final PickerActivity activity;
        private final TextView slot;
        private final JSONArray items;
        private final JSONObject finalItem;
        private final long startTime;
        private double delay;

        SpinTick(PickerActivity activity, TextView slot, JSONArray items, JSONObject finalItem, long startTime, double delay) {
            this.activity = activity;
            this.slot = slot;
            this.items = items;
            this.finalItem = finalItem;
            this.startTime = startTime;
            this.delay = delay;
        }

        @Override
        public void run() {
            JSONObject randomItem = items.optJSONObject(random.nextInt(items.length()));
            if (randomItem != null) {
                slot.setText(randomItem.optString("icon", "⭐") + "  " + randomItem.optString("title", ""));
                ScaleAnimation pulse = new ScaleAnimation(0.9f, 1f, 0.9f, 1f,
                        Animation.RELATIVE_TO_SELF, 0.5f, Animation.RELATIVE_TO_SELF, 0.5f);
                pulse.setDuration(150);
                slot.startAnimation(pulse);
            }

            long elapsed = System.currentTimeMillis() - startTime;
            if (elapsed >= DURATION_MS) {
                activity.reveal(finalItem);
                return;
            }
            delay = Math.min(delay * 1.15, 350);
            activity.handler.postDelayed(this, (long) delay);
        }
    }

    private void reveal(JSONObject item) {
        stage.removeAllViews();
        if (item == null) return;

        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.setLayoutParams(new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        TextView title = new TextView(this);
        title.setText(item.optString("icon", "⭐") + "  " + item.optString("title", ""));
        title.setTextSize(22f);
        title.setTextColor(getColor(R.color.text));
        title.setGravity(Gravity.CENTER);
        box.addView(title);

        TextView desc = new TextView(this);
        desc.setText(item.optString("desc", ""));
        desc.setTextSize(14f);
        desc.setTextColor(getColor(R.color.text_muted));
        desc.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams descLp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        descLp.topMargin = LinkButtons.dp(this, 8);
        desc.setLayoutParams(descLp);
        box.addView(desc);

        LinearLayout actionsRow = new LinearLayout(this);
        actionsRow.setOrientation(LinearLayout.HORIZONTAL);
        actionsRow.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams actionsLp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        actionsLp.topMargin = LinkButtons.dp(this, 16);
        actionsRow.setLayoutParams(actionsLp);
        LinkButtons.build(this, actionsRow, item, HakolahApi.ORIGIN, this);
        box.addView(actionsRow);

        LinearLayout bottomRow = new LinearLayout(this);
        bottomRow.setOrientation(LinearLayout.HORIZONTAL);
        bottomRow.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams bottomLp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        bottomLp.topMargin = LinkButtons.dp(this, 16);
        bottomRow.setLayoutParams(bottomLp);
        bottomRow.addView(makeTextButton(R.drawable.ic_refresh, "جرّب مرة ثانية", ACTION_RETRY, true));
        bottomRow.addView(makeTextButton(R.drawable.ic_close, "إغلاق", ACTION_CLOSE, false));
        box.addView(bottomRow);

        stage.addView(box);
        spawnConfetti();
        SoundPlayer.playSuccess(this);
    }

    private TextView makeTextButton(int iconRes, String label, String tag, boolean primary) {
        TextView btn = new TextView(this);
        btn.setText(label);
        btn.setTextSize(14f);
        int color = primary ? 0xFFFFFFFF : getColor(R.color.text_muted);
        btn.setTextColor(color);
        btn.setBackgroundResource(primary ? R.drawable.btn_pill_primary : R.drawable.btn_pill_secondary);
        btn.setCompoundDrawablePadding(LinkButtons.dp(this, 6));
        LinkButtons.setStartIcon(btn, iconRes, color);
        int padH = LinkButtons.dp(this, 24);
        int padV = LinkButtons.dp(this, 8);
        btn.setPadding(padH, padV, padH, padV);
        btn.setGravity(Gravity.CENTER);
        btn.setClickable(true);
        btn.setFocusable(true);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.setMarginEnd(LinkButtons.dp(this, 8));
        btn.setLayoutParams(lp);
        btn.setTag(tag);
        btn.setOnClickListener(this);
        return btn;
    }

    // نفس فكرة spawnConfetti بالموقع (إيموجي متطاير عشوائي الموضع والدوران)
    // — بـObjectAnimator بدل CSS keyframes
    private void spawnConfetti() {
        String[] emojis = {"🎉", "✨", "⭐", "💫", "🎊"};
        Random random = new Random();
        int width = getResources().getDisplayMetrics().widthPixels;

        for (int i = 0; i < 14; i++) {
            TextView piece = new TextView(this);
            piece.setText(emojis[random.nextInt(emojis.length)]);
            piece.setTextSize(20f);
            FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            lp.leftMargin = random.nextInt(Math.max(width - LinkButtons.dp(this, 30), 1));
            piece.setLayoutParams(lp);
            stage.addView(piece);

            ObjectAnimator fall = ObjectAnimator.ofFloat(piece, "translationY", 0f, LinkButtons.dp(this, 160 + random.nextInt(80)));
            ObjectAnimator spin = ObjectAnimator.ofFloat(piece, "rotation", 0f, (random.nextFloat() - 0.5f) * 360f);
            ObjectAnimator fade = ObjectAnimator.ofFloat(piece, "alpha", 1f, 0f);
            long duration = 900 + random.nextInt(500);
            fall.setDuration(duration);
            spin.setDuration(duration);
            fade.setDuration(duration);
            fade.setStartDelay(duration / 2);
            fall.start();
            spin.start();
            fade.start();
        }
    }
}
