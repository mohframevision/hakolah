package bh.mohframevision.hakolah;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioTrack;

// نفس مجموعة أصوات الموقع (Web Audio بـscript.js): نغمات هادئة بسلّم ري
// الكبير، بداية ناعمة، ونغمة تحتية للدفء، فوق "صدى غرفة" خفيف — مولَّدة
// بالكود بالكامل، بلا أي ملف صوتي. كل صوت يُركَّب مرة وحدة (ستيريو) ويُحفظ
// بالذاكرة، فالتشغيل بعدها فوري. الصدى هنا Freeverb مصغّر (4 مرشحات مشط +
// 2 تمرير كلي) بدل الالتفاف (convolver) بالموقع — نفس الإحساس بجزء من الحساب.
class SoundPlayer {
    static final int TICK = 0;
    static final int TAP = 1;
    static final int ON = 2;
    static final int OFF = 3;
    static final int OPEN = 4;
    static final int CLOSE = 5;
    static final int SUCCESS = 6;
    static final int SHIMMER = 7;
    // نغمات سلّم ري الكبير الصاعد (8 درجات) — لصفحة القصة: كل قسم يطلع بنغمة أعلى
    private static final int NOTE_BASE = 8;
    private static final int COUNT = 16;
    private static final double[] SCALE = {587.33, 659.25, 739.99, 880, 987.77, 1174.66, 1318.51, 1479.98};

    static int note(int i) {
        return NOTE_BASE + (i % SCALE.length);
    }

    private static final int SR = 44100;
    // سماعة الجوال أضعف من سماعات الكمبيوتر — رفع بسيط فوق مستويات الموقع
    private static final float MASTER = 1.6f;
    private static final double D3 = 146.83, D4 = 293.66, A4 = 440, D5 = 587.33, FS5 = 739.99, A5 = 880, D6 = 1174.66, FS6 = 1479.98;
    private static final short[][] cache = new short[COUNT][];

    static void playClick(Context context) {
        play(context, TAP);
    }

    static void playSuccess(Context context) {
        play(context, SUCCESS);
    }

    static void play(Context context, int sound) {
        if (!Prefs.isSoundEnabled(context)) return;
        new PlayThread(sound).start();
    }

    // يركّب كل الأصوات بالخلفية عند فتح التطبيق — أول ضغطة تطلع بلا تأخير
    static void warmUp() {
        new WarmThread().start();
    }

    private static synchronized short[] get(int sound) {
        if (cache[sound] == null) cache[sound] = render(sound);
        return cache[sound];
    }

    private static class WarmThread extends Thread {
        @Override
        public void run() {
            for (int i = 0; i < COUNT; i++) get(i);
        }
    }

    private static class PlayThread extends Thread {
        private final int sound;

        PlayThread(int sound) {
            this.sound = sound;
        }

        @Override
        public void run() {
            short[] pcm = get(sound);
            AudioTrack track;
            try {
                track = new AudioTrack.Builder()
                        .setAudioAttributes(new AudioAttributes.Builder()
                                // على صوت الوسائط (زي الألعاب) لا صوت الإشعارات:
                                // الجوال على الصامت/الاهتزاز كان يكتم أصوات
                                // "التنبيه" كلها فما يطلع أي صوت بالتطبيق
                                .setUsage(AudioAttributes.USAGE_GAME)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                                .build())
                        .setAudioFormat(new AudioFormat.Builder()
                                .setSampleRate(SR)
                                .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                                .setChannelMask(AudioFormat.CHANNEL_OUT_STEREO)
                                .build())
                        .setBufferSizeInBytes(pcm.length * 2)
                        .setTransferMode(AudioTrack.MODE_STATIC)
                        .build();
            } catch (Exception e) {
                return;
            }
            track.write(pcm, 0, pcm.length);
            track.play();
            // ننتظر نهاية التشغيل قبل release() — تحريرها فوراً يقطع الصوت
            try {
                Thread.sleep(pcm.length / 2 * 1000L / SR + 40);
            } catch (InterruptedException ignored) {
            }
            track.release();
        }
    }

    // ===== التركيب =====
    private static final class Buf {
        final float[] l;
        final float[] r;

        Buf(double seconds) {
            int n = (int) (seconds * SR);
            l = new float[n];
            r = new float[n];
        }
    }

    // نفس voice() بالموقع: موجة جيبية، صعود أسّي من 0.0001 للقيمة خلال attack
    // ثم هبوط أسّي لـ0.0001 خلال decay، مع انزلاق تردد اختياري ووضع ستيريو
    private static void voice(Buf b, double freq, double at, double attack, double decay, double gain, double glide, double pan) {
        int start = (int) (at * SR);
        int aN = Math.max(1, (int) (attack * SR));
        int total = aN + (int) (decay * SR);
        double gl = (1 - pan) * 0.5 * 1.414, gr = (1 + pan) * 0.5 * 1.414;
        double phase = 0;
        for (int i = 0; i < total && start + i < b.l.length; i++) {
            double env = i < aN
                    ? 0.0001 * Math.pow(gain / 0.0001, (double) i / aN)
                    : gain * Math.pow(0.0001 / gain, (double) (i - aN) / (total - aN));
            double f = glide == 1 ? freq : freq * Math.pow(glide, (double) i / total);
            phase += 2 * Math.PI * f / SR;
            float s = (float) (env * Math.sin(phase));
            b.l[start + i] += s * gl;
            b.r[start + i] += s * gr;
        }
    }

    private static void voice(Buf b, double freq, double at, double attack, double decay, double gain) {
        voice(b, freq, at, attack, decay, gain, 1, 0);
    }

    // نفس noise() بالموقع: ضوضاء بيضاء عبر مرشح تمرير نطاق (bandpass، معادلات
    // RBJ) بتردد ينزلق اختيارياً، وغلاف صعود/هبوط أسّي
    private static void noise(Buf b, double at, double dur, double freq, double q, double gain, double sweepTo, double attack) {
        int start = (int) (at * SR);
        int n = (int) (dur * SR);
        int aN = Math.max(1, (int) (attack * SR));
        java.util.Random rnd = new java.util.Random(7);
        double x1 = 0, x2 = 0, y1 = 0, y2 = 0;
        for (int i = 0; i < n && start + i < b.l.length; i++) {
            double f = sweepTo > 0 ? freq * Math.pow(sweepTo / freq, (double) i / n) : freq;
            double w = 2 * Math.PI * f / SR;
            double alpha = Math.sin(w) / (2 * q);
            double a0 = 1 + alpha;
            double b0 = alpha / a0, b2 = -alpha / a0, a1 = -2 * Math.cos(w) / a0, a2 = (1 - alpha) / a0;
            double x = rnd.nextDouble() * 2 - 1;
            double y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
            x2 = x1;
            x1 = x;
            y2 = y1;
            y1 = y;
            double env = i < aN
                    ? 0.0001 * Math.pow(gain / 0.0001, (double) i / aN)
                    : gain * Math.pow(0.0001 / gain, (double) (i - aN) / Math.max(1, n - aN));
            float s = (float) (env * y);
            b.l[start + i] += s;
            b.r[start + i] += s;
        }
    }

    private static void noise(Buf b, double dur, double freq, double q, double gain, double sweepTo) {
        noise(b, 0, dur, freq, q, gain, sweepTo, Math.min(0.002, dur / 3));
    }

    private static short[] render(int sound) {
        Buf b = new Buf(2.4);
        switch (sound) {
            case TICK:
                noise(b, 0.006, 3000, 0.8, 0.07, 0);
                break;
            case TAP:
                voice(b, A4, 0, 0.004, 0.07, 0.07, 0.88, 0);
                voice(b, A4 * 1.7, 0, 0.004, 0.04, 0.018);
                voice(b, A4 / 2, 0, 0.004, 0.09, 0.03);
                break;
            case ON:
                voice(b, D5, 0, 0.004, 0.35, 0.06);
                voice(b, D3, 0, 0.004, 0.5, 0.05);
                voice(b, A5, 0.07, 0.004, 0.3, 0.035, 1, 0.15);
                break;
            case OFF:
                voice(b, A4, 0, 0.004, 0.25, 0.05, 0.94, 0);
                voice(b, A4 / 4, 0, 0.004, 0.3, 0.04);
                voice(b, D4, 0.06, 0.004, 0.22, 0.03, 1, -0.15);
                break;
            case OPEN: {
                double[] notes = {D5, FS5, A5};
                for (int i = 0; i < 3; i++) voice(b, notes[i], i * 0.045, 0.01, 0.6, 0.03, 1, (i - 1) * 0.2);
                voice(b, D3, 0, 0.004, 0.5, 0.03);
                break;
            }
            case CLOSE:
                noise(b, 0.12, 1800, 0.7, 0.035, 400);
                voice(b, 130, 0, 0.004, 0.3, 0.07, 0.8, 0);
                break;
            case SUCCESS: {
                double[] notes = {D5, FS5, A5, D6};
                for (int i = 0; i < 4; i++) voice(b, notes[i], i * 0.06, 0.02, 1.0, 0.03, 1, -0.3 + i * 0.2);
                voice(b, D3, 0, 0.004, 0.8, 0.04);
                break;
            }
            case SHIMMER: {
                double[] notes = {A5, D6, FS6};
                for (int i = 0; i < 3; i++) voice(b, notes[i], i * 0.03, 0.005, 0.35, 0.022, 1, -0.2 + i * 0.2);
                noise(b, 0, 0.25, 6000, 1.5, 0.012, 9000, 0.002);
                break;
            }
            default:
                if (sound >= NOTE_BASE) {
                    int i = sound - NOTE_BASE;
                    voice(b, SCALE[i], 0, 0.008, 0.4, 0.03, 1, ((i % 5) - 2) * 0.12);
                    voice(b, SCALE[i] * 2, 0, 0.004, 0.15, 0.008);
                }
                break;
        }
        return master(b);
    }

    // نفس ممر الأصوات بالموقع: تنعيم (lowpass 4500) ثم خلط جاف 0.85 + صدى 0.22
    private static short[] master(Buf b) {
        lowpass(b.l, 4500);
        lowpass(b.r, 4500);
        float[] wl = reverb(b.l, 0);
        float[] wr = reverb(b.r, 23);
        int n = b.l.length;
        int end = 0;
        float[] outL = new float[n];
        float[] outR = new float[n];
        for (int i = 0; i < n; i++) {
            outL[i] = (b.l[i] * 0.85f + wl[i] * 0.22f) * MASTER;
            outR[i] = (b.r[i] * 0.85f + wr[i] * 0.22f) * MASTER;
            if (Math.abs(outL[i]) > 0.0003f || Math.abs(outR[i]) > 0.0003f) end = i;
        }
        // نقص الذيل الصامت — ملف أقصر = تشغيل أسرع وذاكرة أقل
        int len = Math.min(n, end + SR / 50);
        short[] pcm = new short[len * 2];
        for (int i = 0; i < len; i++) {
            float fade = i > len - SR / 50 ? (len - i) / (float) (SR / 50) : 1f;
            pcm[i * 2] = clip(outL[i] * fade);
            pcm[i * 2 + 1] = clip(outR[i] * fade);
        }
        return pcm;
    }

    private static short clip(float v) {
        if (v > 1f) v = 1f;
        if (v < -1f) v = -1f;
        return (short) (v * Short.MAX_VALUE);
    }

    private static void lowpass(float[] x, double freq) {
        double w = 2 * Math.PI * freq / SR;
        double alpha = Math.sin(w) / (2 * 0.707);
        double cos = Math.cos(w);
        double a0 = 1 + alpha;
        double b0 = (1 - cos) / 2 / a0, b1 = (1 - cos) / a0, b2 = b0, a1 = -2 * cos / a0, a2 = (1 - alpha) / a0;
        double x1 = 0, x2 = 0, y1 = 0, y2 = 0;
        for (int i = 0; i < x.length; i++) {
            double in = x[i];
            double y = b0 * in + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
            x2 = x1;
            x1 = in;
            y2 = y1;
            y1 = y;
            x[i] = (float) y;
        }
    }

    // Freeverb مصغّر: 4 مرشحات مشط متوازية (بتخميد) ثم 2 تمرير كلي متسلسلة.
    // spread يزيح أطوال التأخير للقناة اليمنى فيتسع الصدى ستيريو
    private static float[] reverb(float[] in, int spread) {
        int[] combs = {1116, 1188, 1277, 1356};
        int[] allpasses = {556, 441};
        float feedback = 0.8f, damp = 0.25f;
        float[] out = new float[in.length];
        for (int c : combs) {
            float[] buf = new float[c + spread];
            int idx = 0;
            float store = 0;
            for (int i = 0; i < in.length; i++) {
                float y = buf[idx];
                store = y * (1 - damp) + store * damp;
                buf[idx] = in[i] * 0.25f + store * feedback;
                idx = (idx + 1) % buf.length;
                out[i] += y;
            }
        }
        for (int a : allpasses) {
            float[] buf = new float[a + spread];
            int idx = 0;
            for (int i = 0; i < out.length; i++) {
                float bufOut = buf[idx];
                float x = out[i];
                buf[idx] = x + bufOut * 0.5f;
                out[i] = bufOut - x;
                idx = (idx + 1) % buf.length;
            }
        }
        return out;
    }
}
