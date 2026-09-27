package bh.mohframevision.hakolah;

import android.animation.ValueAnimator;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.DecelerateInterpolator;
import android.view.animation.OvershootInterpolator;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

// "قصة هكوله" — نفس قصة صفحة الموقع الشخصي (hakolah-story.html) بصياغة تناسب
// التطبيق نفسه: الأرقام حيّة من بيانات التطبيق (مو مكتوبة يدوياً وتقدم)،
// ومحطة التطبيق "بين يديك الآن" بدل "قادم قريباً". كل قسم يطلع وقت يوصله
// التمرير بنغمة صاعدة، الأرقام تعدّ من صفر، ونقاط المحطات تضيء وحدة وحدة.
//
// بلا lambdas ولا كلاسات مجهولة — د8 بهذي البيئة يفشل عليها.
public class StoryActivity extends Activity implements View.OnClickListener, View.OnScrollChangeListener {

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final List<View> pending = new ArrayList<>();
    private ScrollView scroll;
    private LinearLayout content;
    private int noteIndex;
    private boolean animations;
    private final List<TextView> statViews = new ArrayList<>();
    private final List<Integer> statValues = new ArrayList<>();
    private View statsBlock;
    private LinearLayout timeline;
    private android.widget.ImageView musicBtn;
    private VolumeSlider slider;
    private TextView volTip;
    private View dockFold;
    private boolean dockOpen;
    private android.animation.ObjectAnimator musicPulse;

    @Override
    protected void attachBaseContext(Context newBase) {
        super.attachBaseContext(Prefs.wrapNightContext(newBase));
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_story);
        getWindow().setStatusBarColor(0xFF06120E);
        animations = Build.VERSION.SDK_INT < 26 || ValueAnimator.areAnimatorsEnabled();

        scroll = findViewById(R.id.storyScroll);
        content = findViewById(R.id.storyContent);
        View close = findViewById(R.id.storyClose);
        close.setOnClickListener(this);
        Touch.springy(close, 0.85f);
        musicBtn = findViewById(R.id.storyMusic);
        musicBtn.setOnClickListener(this);
        Touch.springy(musicBtn, 0.85f);

        slider = findViewById(R.id.storySlider);
        volTip = findViewById(R.id.storyVolTip);
        dockFold = findViewById(R.id.storyDockFold);
        dockFold.setOnClickListener(this);
        float level = Prefs.getMusicLevel(this);
        slider.setLevel(level);
        MusicPlayer.setLevel(level);
        slider.setListener(new SliderListener(this));
        dockOpen = Prefs.isMusicDockOpen(this);
        applyDock(false);
        scroll.setOnScrollChangeListener(this);

        build();
        scroll.post(new CheckReveal(this));
    }

    private int dp(float v) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics());
    }

    // ================= المحتوى =================
    private void build() {
        TextView title = text(getString(R.string.brand), 44, 0xFFFFFFFF, true);
        content.addView(title);
        content.addView(para(getString(R.string.story_intro), 6));

        statsBlock = buildStats();
        reveal(statsBlock, 28);

        heading(getString(R.string.story_how_title));
        reveal(para(getString(R.string.story_how_1), 0), 12);
        reveal(para(getString(R.string.story_how_2), 0), 12);

        heading(getString(R.string.story_stops_title));
        timeline = buildTimeline();
        reveal(timeline, 12);

        heading(getString(R.string.story_learned_title));
        String[] techTitles = getResources().getStringArray(R.array.story_tech_titles);
        String[] techTexts = getResources().getStringArray(R.array.story_tech_texts);
        for (int i = 0; i < techTitles.length; i++) reveal(techRow(techTitles[i], techTexts[i]), 10);

        heading(getString(R.string.story_challenge_title));
        reveal(para(getString(R.string.story_challenge), 0), 12);

        reveal(buildHelpPanel(), 32);
        TextView sign = text(getString(R.string.story_sign), 13, 0x99FFFFFF, false);
        sign.setGravity(Gravity.CENTER);
        reveal(sign, 20);
    }

    private TextView text(String s, float sp, int color, boolean bold) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextSize(sp);
        t.setTextColor(color);
        if (bold) t.setTypeface(null, Typeface.BOLD);
        t.setTextAlignment(View.TEXT_ALIGNMENT_VIEW_START);
        return t;
    }

    private TextView para(String s, int topDp) {
        TextView t = text(s, 16, 0xD9FFFFFF, false);
        t.setLineSpacing(0, 1.12f);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.topMargin = dp(topDp);
        t.setLayoutParams(lp);
        return t;
    }

    private void heading(String s) {
        TextView h = text(s, 24, 0xFFFFFFFF, true);
        h.setTag("heading");
        reveal(h, 40);
    }

    // كل عنصر يضاف مخفياً ويطلع وقت يوصله التمرير
    private void reveal(View v, int topDp) {
        ViewGroup.LayoutParams base = v.getLayoutParams();
        LinearLayout.LayoutParams lp = base instanceof LinearLayout.LayoutParams
                ? (LinearLayout.LayoutParams) base
                : new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.topMargin = dp(topDp);
        v.setLayoutParams(lp);
        if (animations) {
            v.setAlpha(0f);
            v.setTranslationY(dp(36));
            pending.add(v);
        }
        content.addView(v);
    }

    private static GradientDrawable glass(float radius, int fill, int stroke, float density) {
        GradientDrawable g = new GradientDrawable();
        g.setCornerRadius(radius);
        g.setColor(fill);
        g.setStroke(Math.max(1, (int) density), stroke);
        return g;
    }

    // الأرقام حيّة من بيانات التطبيق — نفس المحتوى اللي تتصفحه
    private View buildStats() {
        int items = 0, sections = 0;
        JSONObject all = MainActivity.cachedSections;
        JSONArray order = MainActivity.cachedSectionOrder;
        if (all != null && order != null) {
            for (int i = 0; i < order.length(); i++) {
                JSONObject s = all.optJSONObject(order.optString(i));
                if (!MainActivity.isBrowsable(s)) continue;
                sections++;
                items += s.optJSONArray("items").length();
            }
        }
        Calendar launch = Calendar.getInstance();
        launch.set(2026, Calendar.JULY, 29, 0, 0, 0);
        int days = (int) Math.max(1, (System.currentTimeMillis() - launch.getTimeInMillis()) / 86400000L);

        LinearLayout grid = new LinearLayout(this);
        grid.setOrientation(LinearLayout.VERTICAL);
        LinearLayout row1 = new LinearLayout(this);
        LinearLayout row2 = new LinearLayout(this);
        grid.addView(row1);
        grid.addView(row2);
        addStat(row1, items, getString(R.string.stat_items), true);
        addStat(row1, sections, getString(R.string.stat_sections), false);
        addStat(row2, days, getString(R.string.stat_days), true);
        addStat(row2, 2, getString(R.string.stat_langs), false);
        ((LinearLayout.LayoutParams) row2.getLayoutParams()).topMargin = dp(10);
        return grid;
    }

    private void addStat(LinearLayout row, int value, String label, boolean first) {
        LinearLayout tile = new LinearLayout(this);
        tile.setOrientation(LinearLayout.VERTICAL);
        tile.setGravity(Gravity.CENTER);
        tile.setBackground(glass(dp(20), 0x1AFFFFFF, 0x33FFFFFF, getResources().getDisplayMetrics().density));
        tile.setPadding(dp(10), dp(18), dp(10), dp(18));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        if (!first) lp.setMarginStart(dp(10));
        tile.setLayoutParams(lp);
        TextView num = text(animations ? "0" : String.valueOf(value), 34, 0xFFFFFFFF, true);
        num.setGravity(Gravity.CENTER);
        num.setTextAlignment(View.TEXT_ALIGNMENT_CENTER);
        TextView cap = text(label, 13, 0xB3FFFFFF, false);
        cap.setGravity(Gravity.CENTER);
        cap.setTextAlignment(View.TEXT_ALIGNMENT_CENTER);
        tile.addView(num);
        tile.addView(cap);
        row.addView(tile);
        statViews.add(num);
        statValues.add(value);
    }

    private LinearLayout buildTimeline() {
        String[] dates = getResources().getStringArray(R.array.story_stop_dates);
        String[] stopTexts = getResources().getStringArray(R.array.story_stop_texts);
        String[][] stops = new String[dates.length][];
        for (int i = 0; i < dates.length; i++) stops[i] = new String[]{dates[i], stopTexts[i]};
        LinearLayout list = new LinearLayout(this);
        list.setOrientation(LinearLayout.VERTICAL);
        for (String[] s : stops) {
            LinearLayout row = new LinearLayout(this);
            row.setOrientation(LinearLayout.HORIZONTAL);
            LinearLayout.LayoutParams rlp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            rlp.bottomMargin = dp(18);
            row.setLayoutParams(rlp);

            View dot = new View(this);
            GradientDrawable d = new GradientDrawable();
            d.setShape(GradientDrawable.OVAL);
            d.setColor(0xFF3FA480);
            dot.setBackground(d);
            LinearLayout.LayoutParams dlp = new LinearLayout.LayoutParams(dp(10), dp(10));
            dlp.topMargin = dp(8);
            dlp.setMarginEnd(dp(14));
            dot.setLayoutParams(dlp);
            if (animations) {
                dot.setScaleX(0f);
                dot.setScaleY(0f);
            }
            row.addView(dot);

            LinearLayout texts = new LinearLayout(this);
            texts.setOrientation(LinearLayout.VERTICAL);
            texts.setLayoutParams(new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
            texts.addView(text(s[0], 15, 0xFFFFFFFF, true));
            TextView body = text(s[1], 14, 0xCCFFFFFF, false);
            body.setLineSpacing(0, 1.08f);
            texts.addView(body);
            row.addView(texts);
            list.addView(row);
        }
        return list;
    }

    private View techRow(String title, String body) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.VERTICAL);
        row.setBackground(glass(dp(18), 0x14FFFFFF, 0x26FFFFFF, getResources().getDisplayMetrics().density));
        row.setPadding(dp(18), dp(14), dp(18), dp(14));
        row.addView(text(title, 16, 0xFF8FD9BA, true));
        TextView b = text(body, 14, 0xCCFFFFFF, false);
        b.setLineSpacing(0, 1.08f);
        row.addView(b);
        return row;
    }

    private View buildHelpPanel() {
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER_HORIZONTAL);
        panel.setBackgroundResource(R.drawable.glass_card);
        panel.setPadding(dp(22), dp(24), dp(22), dp(24));
        TextView t = text(getString(R.string.story_help_title), 22, 0xFFFFFFFF, true);
        t.setTextAlignment(View.TEXT_ALIGNMENT_CENTER);
        panel.addView(t);
        TextView p = text(getString(R.string.story_help_text), 14, 0xCCFFFFFF, false);
        p.setTextAlignment(View.TEXT_ALIGNMENT_CENTER);
        p.setLineSpacing(0, 1.1f);
        LinearLayout.LayoutParams plp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        plp.topMargin = dp(6);
        p.setLayoutParams(plp);
        panel.addView(p);

        LinearLayout buttons = new LinearLayout(this);
        buttons.setOrientation(LinearLayout.HORIZONTAL);
        buttons.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams blp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        blp.topMargin = dp(18);
        buttons.setLayoutParams(blp);
        buttons.addView(button(getString(R.string.story_help_suggest), "contact", true));
        buttons.addView(button(getString(R.string.story_help_share), "share", false));
        panel.addView(buttons);
        return panel;
    }

    private TextView button(String label, String tag, boolean primary) {
        TextView b = text(label, 14, primary ? 0xFF1B4D3E : 0xFFFFFFFF, true);
        b.setBackgroundResource(primary ? R.drawable.btn_pill_white : R.drawable.glass_pill);
        b.setPadding(dp(20), dp(10), dp(20), dp(10));
        b.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        if (!primary) lp.setMarginStart(dp(10));
        b.setLayoutParams(lp);
        b.setClickable(true);
        b.setFocusable(true);
        b.setTag(tag);
        b.setOnClickListener(this);
        Touch.springy(b);
        return b;
    }

    // ================= التفاعل =================
    // الموسيقى تشتغل بس والشاشة ظاهرة — تطلع منها أو تقفل الجوال فتوقف
    @Override
    protected void onResume() {
        super.onResume();
        if (Prefs.isMusicEnabled(this)) MusicPlayer.start();
        updateMusicButton();
    }

    @Override
    protected void onPause() {
        MusicPlayer.stop();
        super.onPause();
    }

    // شغّالة: أخضر فاتح يتنفّس ببطء؛ طافية: أبيض باهت
    private void updateMusicButton() {
        boolean on = Prefs.isMusicEnabled(this);
        musicBtn.setColorFilter(on ? 0xFF8FD9BA : 0x99FFFFFF);
        musicBtn.setContentDescription(getString(on ? R.string.music_pause : R.string.music_play));
        if (on && animations) {
            if (musicPulse == null) {
                musicPulse = android.animation.ObjectAnimator.ofFloat(musicBtn, "alpha", 1f, 0.55f);
                musicPulse.setDuration(2500);
                musicPulse.setRepeatCount(ValueAnimator.INFINITE);
                musicPulse.setRepeatMode(ValueAnimator.REVERSE);
            }
            if (!musicPulse.isStarted()) musicPulse.start();
        } else {
            if (musicPulse != null) musicPulse.cancel();
            musicBtn.setAlpha(1f);
        }
    }

    // الطي: المنزلق يصغر لفوق ويختفي، والسهم ينقلب — يبقى السهم وحده تحت زر الموسيقى
    private void applyDock(boolean animate) {
        dockFold.animate().rotation(dockOpen ? 0f : 180f).setDuration(animate ? 400 : 0)
                .setInterpolator(new OvershootInterpolator(2f)).start();
        if (dockOpen) {
            slider.setVisibility(View.VISIBLE);
            slider.setPivotY(0);
            if (animate) {
                slider.setScaleY(0f);
                slider.setAlpha(0f);
                slider.animate().scaleY(1f).alpha(1f).setDuration(420).setInterpolator(new OvershootInterpolator(1.3f)).start();
            }
        } else if (animate) {
            slider.setPivotY(0);
            slider.animate().scaleY(0f).alpha(0f).setDuration(220).withEndAction(new HideView(slider)).start();
        } else {
            slider.setVisibility(View.GONE);
        }
    }

    private static final class HideView implements Runnable {
        private final View v;

        HideView(View v) {
            this.v = v;
        }

        @Override
        public void run() {
            v.setVisibility(View.GONE);
            v.setScaleY(1f);
            v.setAlpha(1f);
        }
    }

    // الرقم يمشي مع حافة التعبئة ويطلع وقت السحب بس
    private static final class SliderListener implements VolumeSlider.Listener {
        private final StoryActivity a;

        SliderListener(StoryActivity a) {
            this.a = a;
        }

        @Override
        public void onLevel(float level, boolean dragging) {
            MusicPlayer.setLevel(level);
            a.volTip.setText(Math.round(level * 100) + "%");
            float top = a.slider.getTop() + ((View) a.slider.getParent()).getTop();
            float ty = top + (1 - level) * a.slider.getHeight() - a.volTip.getHeight() / 2f - a.volTip.getTop();
            // داخل حدود العدّة — عند 100٪ كان نصه يطلع فوقها وينقص
            float max = ((View) a.volTip.getParent()).getHeight() - a.volTip.getHeight() - a.volTip.getTop();
            a.volTip.setTranslationY(Math.max(-a.volTip.getTop(), Math.min(max, ty)));
            // يظهر فوراً: إعادة تشغيل حركة ظهور مع كل حركة إصبع كانت تبدأها من
            // الصفر كل مرة فما يطلع الرقم أبداً وقت السحب
            a.volTip.animate().cancel();
            a.volTip.setAlpha(1f);
        }

        @Override
        public void onRelease(float level) {
            Prefs.setMusicLevel(a, level);
            a.volTip.animate().alpha(0f).setStartDelay(500).setDuration(200).start();
            // رفع الصوت والموسيقى طافية = يبغاها تشتغل (نفس منزلق الموقع)
            if (level > 0 && !Prefs.isMusicEnabled(a)) {
                Prefs.setMusicEnabled(a, true);
                MusicPlayer.start();
                a.updateMusicButton();
            }
        }
    }

    @Override
    public void onClick(View v) {
        if (v.getId() == R.id.storyDockFold) {
            dockOpen = !dockOpen;
            Prefs.setMusicDockOpen(this, dockOpen);
            Touch.feedback(v, Touch.TAP, dockOpen ? SoundPlayer.OPEN : SoundPlayer.CLOSE);
            applyDock(true);
            return;
        }
        if (v.getId() == R.id.storyMusic) {
            boolean on = !Prefs.isMusicEnabled(this);
            Prefs.setMusicEnabled(this, on);
            Touch.haptic(v, on ? Touch.TOGGLE_ON : Touch.TOGGLE_OFF);
            if (on) MusicPlayer.start();
            else MusicPlayer.stop();
            updateMusicButton();
            return;
        }
        if (v.getId() == R.id.storyClose) {
            Touch.feedback(v, Touch.TAP, SoundPlayer.CLOSE);
            finish();
            overridePendingTransition(0, 0);
            return;
        }
        Object tag = v.getTag();
        if ("contact".equals(tag)) {
            Touch.feedback(v, Touch.TAP, SoundPlayer.OPEN);
            Intent i = new Intent(this, WebViewActivity.class);
            i.putExtra(WebViewActivity.EXTRA_TITLE, getString(R.string.contact_title));
            i.putExtra(WebViewActivity.EXTRA_URL, Lang.siteUrl(this, "contact.html"));
            startActivity(i);
            overridePendingTransition(0, 0);
        } else if ("share".equals(tag)) {
            Touch.feedback(v, Touch.TAP, SoundPlayer.TAP);
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("text/plain");
            send.putExtra(Intent.EXTRA_TEXT, getString(R.string.share_app_text) + "\n" + Lang.siteUrl(this, ""));
            try {
                startActivity(Intent.createChooser(send, getString(R.string.share_title)));
            } catch (Exception ignored) {
            }
        }
    }

    @Override
    public void onBackPressed() {
        super.onBackPressed();
        overridePendingTransition(0, 0);
    }

    @Override
    public void onScrollChange(View v, int x, int y, int oldX, int oldY) {
        checkReveal();
    }

    private static final class CheckReveal implements Runnable {
        private final StoryActivity a;

        CheckReveal(StoryActivity a) {
            this.a = a;
        }

        @Override
        public void run() {
            a.checkReveal();
        }
    }

    // أي عنصر دخل 88% من الشاشة يطلع — العناوين معها نغمة صاعدة
    private void checkReveal() {
        if (pending.isEmpty()) return;
        // آخر الصفحة: العناصر الأخيرة ما توصل خط الـ88% أبداً لأن التمرير
        // يوقف قبلها (كان التوقيع بالنهاية ما يطلع) — نطلّع الكل
        boolean atEnd = !scroll.canScrollVertically(1);
        int bottom = atEnd ? Integer.MAX_VALUE : scroll.getScrollY() + (int) (scroll.getHeight() * 0.88f);
        for (int i = 0; i < pending.size(); i++) {
            View v = pending.get(i);
            if (v.getTop() + content.getTop() > bottom) continue;
            pending.remove(i--);
            v.animate().alpha(1f).translationY(0f).setDuration(600).setInterpolator(new DecelerateInterpolator(2f)).start();
            if ("heading".equals(v.getTag())) {
                SoundPlayer.play(this, SoundPlayer.note(noteIndex++));
            } else if (v == statsBlock) {
                countUp();
            } else if (v == timeline) {
                lightTimeline();
            }
        }
    }

    // الأرقام تعدّ من صفر بنقرات، وتنتهي بنغمة نجاح
    private void countUp() {
        ValueAnimator a = ValueAnimator.ofFloat(0f, 1f);
        a.setDuration(1400);
        a.setInterpolator(new DecelerateInterpolator(2f));
        a.addUpdateListener(new CountUpdater(this));
        a.addListener(new CountEnd(this));
        a.start();
    }

    private long lastTick;

    private static final class CountUpdater implements ValueAnimator.AnimatorUpdateListener {
        private final StoryActivity a;

        CountUpdater(StoryActivity a) {
            this.a = a;
        }

        @Override
        public void onAnimationUpdate(ValueAnimator anim) {
            float p = (float) anim.getAnimatedValue();
            for (int i = 0; i < a.statViews.size(); i++) {
                a.statViews.get(i).setText(String.valueOf(Math.round(a.statValues.get(i) * p)));
            }
            long now = System.currentTimeMillis();
            if (p < 1f && now - a.lastTick > 75) {
                a.lastTick = now;
                SoundPlayer.play(a, SoundPlayer.TICK);
            }
        }
    }

    private static final class CountEnd extends android.animation.AnimatorListenerAdapter {
        private final StoryActivity a;

        CountEnd(StoryActivity a) {
            this.a = a;
        }

        @Override
        public void onAnimationEnd(android.animation.Animator animation) {
            SoundPlayer.play(a, SoundPlayer.SUCCESS);
        }
    }

    // نقاط المحطات تضيء وحدة وحدة مع سلّم صاعد
    private void lightTimeline() {
        for (int i = 0; i < timeline.getChildCount(); i++) {
            View dot = ((ViewGroup) timeline.getChildAt(i)).getChildAt(0);
            handler.postDelayed(new LightDot(this, dot, i), 250 + i * 120L);
        }
    }

    private static final class LightDot implements Runnable {
        private final StoryActivity a;
        private final View dot;
        private final int index;

        LightDot(StoryActivity a, View dot, int index) {
            this.a = a;
            this.dot = dot;
            this.index = index;
        }

        @Override
        public void run() {
            dot.animate().scaleX(1f).scaleY(1f).setDuration(380).setInterpolator(new OvershootInterpolator(3f)).start();
            Touch.haptic(dot, Touch.TICK);
            SoundPlayer.play(a, SoundPlayer.note(index));
        }
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if (musicPulse != null) musicPulse.cancel();
        super.onDestroy();
    }
}
