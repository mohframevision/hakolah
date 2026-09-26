package bh.mohframevision.hakolah;

import android.animation.ObjectAnimator;
import android.animation.ValueAnimator;
import android.app.Activity;
import android.content.Context;
import android.content.res.Configuration;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.DecelerateInterpolator;
import android.view.animation.OvershootInterpolator;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.json.JSONArray;
import org.json.JSONObject;

// "اختار لي" بروح Recollect بهوية هكوله: كرة ثلاثية الأبعاد من أيقونات
// العناصر (تلفّها بإصبعك)، وفوقها شريط زجاجي. الضغط على "اختار لي" يدوّر
// الكرة بسرعة وتتباطأ والشريط يعرض العنصر اللي بالمقدمة، ثم تصغر الكرة
// وتطلع بطاقة الاختيار بنابض، وحولها وسوم تطفو (القسم، التصنيفات).
//
// بلا lambdas ولا كلاسات مجهولة — د8 بهذي البيئة يفشل عليها.
public class PickerActivity extends Activity implements View.OnClickListener, OrbView.Listener {
    private static final String ALL = "__all__";
    private static final String PREFIX_CATEGORY = "cat:";
    private static final String ACTION_BACK = "action:back";
    private static final String IDLE_TEXT = "إلى أين اليوم؟";

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Random random = new Random();

    private OrbView orb;
    private TextView pill;
    private TextView headline;
    private TextView sub;
    private TextView spinBtn;
    private FrameLayout reveal;
    private LinearLayout categoriesWrap;
    private HorizontalScrollView categoriesScroll;

    private JSONObject sections;
    private String selected = ALL;
    private final List<JSONObject> pool = new ArrayList<>();
    private JSONObject chosen;
    private boolean revealed;
    // حركات الطفو لا نهائية — نوقفها عند إغلاق الكشف وإلا تستمر بلا فايدة
    private final List<ObjectAnimator> bobs = new ArrayList<>();

    // الشاشة غامرة وداكنة دائماً مهما كان مظهر التطبيق — ألوان "الليل" هنا
    // هي اللي تناسب الخلفية الخضراء الغامقة (أزرار ثانوية، شريط سفلي)
    @Override
    protected void attachBaseContext(Context newBase) {
        Configuration config = new Configuration(newBase.getResources().getConfiguration());
        config.uiMode = (config.uiMode & ~Configuration.UI_MODE_NIGHT_MASK) | Configuration.UI_MODE_NIGHT_YES;
        super.attachBaseContext(newBase.createConfigurationContext(config));
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_picker);
        getWindow().setStatusBarColor(0xFF06120E);

        sections = MainActivity.cachedSections;
        orb = findViewById(R.id.pickerOrb);
        pill = findViewById(R.id.pickerPill);
        headline = findViewById(R.id.pickerHeadline);
        sub = findViewById(R.id.pickerSub);
        spinBtn = findViewById(R.id.pickerSpinBtn);
        reveal = findViewById(R.id.pickerReveal);
        categoriesWrap = findViewById(R.id.pickerCategories);
        categoriesScroll = findViewById(R.id.pickerCategoriesScroll);

        View close = findViewById(R.id.pickerCloseButton);
        close.setOnClickListener(this);
        Touch.springy(close, 0.85f);
        spinBtn.setOnClickListener(this);
        Touch.springy(spinBtn, 0.96f);
        reveal.setOnClickListener(this);
        reveal.setTag(ACTION_BACK);
        orb.setListener(this);
        BottomNav.attach(this, findViewById(R.id.bottomNav), BottomNav.PICKER);

        buildCategories();
        selectCategory(ALL, null);
    }

    private void buildCategories() {
        categoriesWrap.removeAllViews();
        JSONArray order = MainActivity.cachedSectionOrder;
        if (sections == null || order == null) return;
        addChip("✨", "الكل", ALL);
        for (int i = 0; i < order.length(); i++) {
            String slug = order.optString(i);
            JSONObject section = sections.optJSONObject(slug);
            if (!MainActivity.isBrowsable(section)) continue;
            addChip(section.optString("icon", "⭐"), section.optString("title", slug), slug);
        }
        Ui.scrollToStart(categoriesScroll);
    }

    private void addChip(String icon, String title, String slug) {
        TextView chip = new TextView(this);
        chip.setText(icon + "  " + title);
        chip.setTextSize(14f);
        chip.setTextColor(0xFFFFFFFF);
        chip.setBackgroundResource(R.drawable.picker_chip_bg);
        int padH = LinkButtons.dp(this, 16);
        int padV = LinkButtons.dp(this, 10);
        chip.setPadding(padH, padV, padH, padV);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.setMarginEnd(LinkButtons.dp(this, 8));
        chip.setLayoutParams(lp);
        chip.setClickable(true);
        chip.setFocusable(true);
        chip.setTag(PREFIX_CATEGORY + slug);
        chip.setOnClickListener(this);
        Touch.springy(chip, 0.92f);
        categoriesWrap.addView(chip);
    }

    // "الكل": كل الأقسام ما عدا التجارب (أدوات تفاعلية، مو مكان تروح له)
    private void selectCategory(String slug, View chipView) {
        selected = slug;
        pool.clear();
        JSONArray order = MainActivity.cachedSectionOrder;
        if (sections != null && order != null) {
            for (int i = 0; i < order.length(); i++) {
                String s = order.optString(i);
                if (ALL.equals(slug) ? "ai-experiments".equals(s) : !s.equals(slug)) continue;
                JSONObject section = sections.optJSONObject(s);
                JSONArray items = section == null ? null : section.optJSONArray("items");
                if (items == null) continue;
                for (int j = 0; j < items.length(); j++) {
                    JSONObject item = items.optJSONObject(j);
                    if (item != null) pool.add(item);
                }
            }
        }
        // خلط العناصر — وإلا كرة "الكل" تتجمّع فيها أيقونات قسم واحد بمنطقة وحدة
        for (int i = pool.size() - 1; i > 0; i--) {
            int j = random.nextInt(i + 1);
            JSONObject t = pool.get(i);
            pool.set(i, pool.get(j));
            pool.set(j, t);
        }
        orb.setItems(pool);
        String tag = PREFIX_CATEGORY + slug;
        for (int i = 0; i < categoriesWrap.getChildCount(); i++) {
            View chip = categoriesWrap.getChildAt(i);
            chip.setActivated(tag.equals(chip.getTag()));
        }
        spinBtn.setEnabled(!pool.isEmpty());
        spinBtn.setAlpha(pool.isEmpty() ? 0.5f : 1f);
        if (chipView != null) Touch.feedback(chipView, Touch.TICK, SoundPlayer.TAP);
        if (revealed) hideReveal();
    }

    @Override
    public void onBackPressed() {
        if (revealed) {
            hideReveal();
            return;
        }
        super.onBackPressed();
        overridePendingTransition(0, 0);
    }

    @Override
    public void onClick(View v) {
        if (v.getId() == R.id.pickerCloseButton) {
            Touch.feedback(v, Touch.TAP, SoundPlayer.CLOSE);
            finish();
            overridePendingTransition(0, 0);
            return;
        }
        if (v.getId() == R.id.pickerSpinBtn) {
            spin(v);
            return;
        }
        Object tagObj = v.getTag();
        if (!(tagObj instanceof String)) return;
        String tag = (String) tagObj;
        if (tag.startsWith(PREFIX_CATEGORY)) {
            if (!orb.isSpinning()) selectCategory(tag.substring(PREFIX_CATEGORY.length()), v);
        } else if (tag.startsWith("url:") || tag.startsWith("tel:")) {
            Touch.feedback(v, Touch.TAP, SoundPlayer.TAP);
            LinkButtons.handleClick(this, tag);
        } else if (ACTION_BACK.equals(tag)) {
            Touch.feedback(v, Touch.TAP, SoundPlayer.CLOSE);
            hideReveal();
        }
    }

    private void spin(View button) {
        if (pool.isEmpty() || orb.isSpinning()) return;
        Touch.feedback(button, Touch.CONFIRM, SoundPlayer.OPEN);
        if (revealed) hideReveal();
        chosen = pool.get(random.nextInt(pool.size()));
        spinBtn.setEnabled(false);
        spinBtn.animate().alpha(0.6f).setDuration(200).start();
        pill.setText("يختار لك…");
        // وضع "تقليل الحركة" بالنظام: بلا دوران طويل، كشف شبه فوري
        boolean animations = Build.VERSION.SDK_INT < 26 || ValueAnimator.areAnimatorsEnabled();
        orb.spin(animations ? 2400 : 150);
    }

    // ---- OrbView.Listener ----
    @Override
    public void onFrontItem(JSONObject item, boolean spinning) {
        if (spinning && item != null) pill.setText(item.optString("icon", "⭐") + "  " + item.optString("title", ""));
    }

    @Override
    public void onSpinEnd() {
        showReveal(chosen);
    }
    // --------------------------

    private void showReveal(JSONObject item) {
        if (item == null) return;
        revealed = true;
        orb.animate().alpha(0.22f).scaleX(0.78f).scaleY(0.78f).setDuration(520).setInterpolator(new DecelerateInterpolator(2f)).start();
        pill.animate().alpha(0f).setDuration(200).start();
        headline.setText("اختيار هكوله لك");
        sub.setText(sectionTitleOf(item));
        spinBtn.setText("جرّب مرة ثانية");
        spinBtn.setEnabled(true);
        spinBtn.animate().alpha(1f).setDuration(200).start();

        reveal.removeAllViews();
        reveal.setVisibility(View.VISIBLE);
        reveal.setAlpha(1f);

        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(Gravity.CENTER_HORIZONTAL);
        card.setBackgroundResource(R.drawable.glass_card);
        int pad = LinkButtons.dp(this, 24);
        card.setPadding(pad, pad, pad, pad);
        // البطاقة تبلع اللمس — وإلا ضغطة عليها تنتقل للخلفية وتقفل الكشف
        card.setClickable(true);
        int width = (int) (getResources().getDisplayMetrics().widthPixels * 0.78);
        FrameLayout.LayoutParams clp = new FrameLayout.LayoutParams(width, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER);
        card.setLayoutParams(clp);

        TextView icon = new TextView(this);
        icon.setText(item.optString("icon", "⭐"));
        icon.setTextSize(52f);
        icon.setGravity(Gravity.CENTER);
        card.addView(icon);

        TextView title = new TextView(this);
        title.setText(item.optString("title", ""));
        title.setTextSize(22f);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        title.setTextColor(0xFFFFFFFF);
        title.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams tlp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        tlp.topMargin = LinkButtons.dp(this, 6);
        title.setLayoutParams(tlp);
        card.addView(title);

        String descText = item.optString("desc", "");
        if (!descText.isEmpty()) {
            TextView desc = new TextView(this);
            desc.setText(descText);
            desc.setTextSize(14f);
            desc.setTextColor(0xCCFFFFFF);
            desc.setGravity(Gravity.CENTER);
            desc.setMaxLines(3);
            desc.setEllipsize(android.text.TextUtils.TruncateAt.END);
            desc.setLineSpacing(0, 1.25f);
            LinearLayout.LayoutParams dlp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            dlp.topMargin = LinkButtons.dp(this, 8);
            desc.setLayoutParams(dlp);
            card.addView(desc);
        }

        HorizontalScrollView actionsScroll = new HorizontalScrollView(this);
        actionsScroll.setHorizontalScrollBarEnabled(false);
        LinearLayout.LayoutParams alp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        alp.topMargin = LinkButtons.dp(this, 16);
        actionsScroll.setLayoutParams(alp);
        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        LinkButtons.build(this, actions, item, HakolahApi.ORIGIN, this);
        actionsScroll.addView(actions);
        card.addView(actionsScroll);
        reveal.addView(card);

        // البطاقة تطلع من المنتصف بنابض
        card.setScaleX(0.4f);
        card.setScaleY(0.4f);
        card.setAlpha(0f);
        card.animate().scaleX(1f).scaleY(1f).alpha(1f).setStartDelay(120).setDuration(560)
                .setInterpolator(new OvershootInterpolator(1.4f)).start();
        Touch.haptic(card, Touch.CONFIRM);
        SoundPlayer.play(this, SoundPlayer.SUCCESS);

        card.post(new PlaceTags(this, card, tagsFor(item)));
    }

    // الوسوم الطايرة حول البطاقة: القسم أولاً ثم تصنيفات العنصر (أول 3)
    private List<String> tagsFor(JSONObject item) {
        List<String> tags = new ArrayList<>();
        tags.add(sectionIconOf(item) + " " + sectionTitleOf(item));
        JSONArray t = item.optJSONArray("tags");
        if (t != null) {
            for (int i = 0; i < t.length() && tags.size() < 4; i++) {
                String s = t.optString(i);
                if (!s.isEmpty()) tags.add(s);
            }
        }
        return tags;
    }

    private String sectionSlugOf(JSONObject item) {
        JSONArray order = MainActivity.cachedSectionOrder;
        if (sections == null || order == null) return "";
        for (int i = 0; i < order.length(); i++) {
            String s = order.optString(i);
            JSONObject section = sections.optJSONObject(s);
            JSONArray items = section == null ? null : section.optJSONArray("items");
            if (items == null) continue;
            for (int j = 0; j < items.length(); j++) {
                if (items.optJSONObject(j) == item) return s;
            }
        }
        return "";
    }

    private String sectionTitleOf(JSONObject item) {
        JSONObject section = sections == null ? null : sections.optJSONObject(sectionSlugOf(item));
        return section == null ? "" : section.optString("title", "");
    }

    private String sectionIconOf(JSONObject item) {
        JSONObject section = sections == null ? null : sections.optJSONObject(sectionSlugOf(item));
        return section == null ? "✨" : section.optString("icon", "✨");
    }

    // بعد ما تتخطّط البطاقة ونعرف حدودها، نوزّع الوسوم على زواياها وحوافها
    private static final class PlaceTags implements Runnable {
        private final PickerActivity a;
        private final View card;
        private final List<String> tags;

        PlaceTags(PickerActivity a, View card, List<String> tags) {
            this.a = a;
            this.card = card;
            this.tags = tags;
        }

        @Override
        public void run() {
            // مواضع نسبية لحدود البطاقة: [x كنسبة من العرض، y كنسبة من الارتفاع،
            // مرساة الوسم أفقياً] — زوايا متقابلة عشان تتوزّع بتوازن
            float[][] spots = {{0.0f, -0.02f, 0.3f}, {1.0f, 0.3f, 0.7f}, {0.0f, 0.66f, 0.25f}, {1.0f, 1.0f, 0.75f}};
            int frameW = a.reveal.getWidth();
            int margin = LinkButtons.dp(a, 8);
            for (int i = 0; i < tags.size() && i < spots.length; i++) {
                TextView tag = new TextView(a);
                tag.setText(tags.get(i));
                tag.setTextSize(13f);
                tag.setTextColor(0xFFFFFFFF);
                tag.setBackgroundResource(R.drawable.glass_pill);
                int ph = LinkButtons.dp(a, 14), pv = LinkButtons.dp(a, 7);
                tag.setPadding(ph, pv, ph, pv);
                tag.setMaxLines(1);
                FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.TOP | Gravity.LEFT);
                tag.setLayoutParams(lp);
                tag.measure(View.MeasureSpec.UNSPECIFIED, View.MeasureSpec.UNSPECIFIED);
                int tw = tag.getMeasuredWidth(), th = tag.getMeasuredHeight();
                float x = card.getLeft() + spots[i][0] * card.getWidth() - spots[i][2] * tw;
                float y = card.getTop() + spots[i][1] * card.getHeight() - th / 2f;
                tag.setTranslationX(Math.max(margin, Math.min(frameW - tw - margin, x)));
                tag.setTranslationY(y);
                tag.setScaleX(0f);
                tag.setScaleY(0f);
                a.reveal.addView(tag);
                a.handler.postDelayed(new PopTag(a, tag, i), 380 + i * 120L);
            }
        }
    }

    // كل وسم ينطّ لمكانه بنقرة خفيفة، ثم يطفو فوق وتحت بلا توقف
    private static final class PopTag implements Runnable {
        private final PickerActivity a;
        private final View tag;
        private final int index;

        PopTag(PickerActivity a, View tag, int index) {
            this.a = a;
            this.tag = tag;
            this.index = index;
        }

        @Override
        public void run() {
            if (tag.getParent() == null) return;
            tag.animate().scaleX(1f).scaleY(1f).setDuration(420).setInterpolator(new OvershootInterpolator(3f)).start();
            Touch.haptic(tag, Touch.TICK);
            SoundPlayer.play(tag.getContext(), index == 0 ? SoundPlayer.SHIMMER : SoundPlayer.TICK);
            float amp = tag.getResources().getDisplayMetrics().density * 5;
            ObjectAnimator bob = ObjectAnimator.ofFloat(tag, "translationY", tag.getTranslationY(), tag.getTranslationY() - amp);
            bob.setDuration(1700 + index * 280L);
            bob.setStartDelay(420);
            bob.setRepeatCount(ValueAnimator.INFINITE);
            bob.setRepeatMode(ValueAnimator.REVERSE);
            bob.setInterpolator(new android.view.animation.AccelerateDecelerateInterpolator());
            bob.start();
            a.bobs.add(bob);
        }
    }

    private void hideReveal() {
        revealed = false;
        handler.removeCallbacksAndMessages(null);
        for (ObjectAnimator b : bobs) b.cancel();
        bobs.clear();
        reveal.animate().alpha(0f).setDuration(220).withEndAction(new ClearReveal(reveal)).start();
        orb.animate().alpha(1f).scaleX(1f).scaleY(1f).setDuration(520).setInterpolator(new OvershootInterpolator(1.2f)).start();
        pill.setText(IDLE_TEXT);
        pill.animate().alpha(1f).setDuration(300).start();
        headline.setText("دع هكوله يختار لك");
        sub.setText("اختر قسماً، أو اترك الاختيار على الكل");
        spinBtn.setText("اختار لي");
    }

    private static final class ClearReveal implements Runnable {
        private final FrameLayout reveal;

        ClearReveal(FrameLayout reveal) {
            this.reveal = reveal;
        }

        @Override
        public void run() {
            reveal.removeAllViews();
            reveal.setVisibility(View.GONE);
        }
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        for (ObjectAnimator b : bobs) b.cancel();
        bobs.clear();
        super.onDestroy();
    }
}
