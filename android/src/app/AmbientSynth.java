package bh.mohframevision.hakolah;

import java.util.Random;

// موسيقى خلفية هادئة تُولَّد بالكود لحظياً — نفس خوارزمية صفحة القصة بالموقع
// الشخصي (createMusic بـscript.js). شرط المالك: هادئة ومحترمة، لا طابع لهو
// وطرب — فلا إيقاع ولا طبل ولا باص نابض. أوتار طويلة (6 أوتار من ري الكبير
// تتنقل عشوائياً بترتيب موسيقي، بأطوال 7-11 ثانية) تدخل وتذوب ببطء، فوقها
// نغمات جرس متفرقة (خماسي ري) بتوقيت غير منتظم، وصدى واسع وفلتر يتموّج ببطء.
//
// جافا بحتة بلا أي اعتماد على أندرويد — تنفحص على الكمبيوتر مباشرة (مستوى،
// تشويه، طقطقة). MusicPlayer يغذّي AudioTrack منها.
final class AmbientSynth {
    static final int SR = 44100;

    private static final double[][] CHORDS = {
            {146.83, 220.0, 293.66, 369.99},  // D
            {123.47, 185.0, 246.94, 293.66},  // Bm
            {98.0, 196.0, 246.94, 293.66},    // G
            {110.0, 164.81, 220.0, 277.18},   // A
            {164.81, 196.0, 246.94, 329.63},  // Em
            {185.0, 220.0, 277.18, 369.99},   // F#m
    };
    // من كل وتر، الأوتار اللي يحسن الانتقال لها
    private static final int[][] NEXT = {
            {2, 1, 3, 4},
            {2, 4, 3},
            {0, 3, 4, 1},
            {0, 1, 5},
            {3, 2, 0},
            {1, 2},
    };
    private static final double[] BELLS = {440.0, 493.88, 587.33, 659.25, 739.99, 880.0, 987.77};

    private final Random rnd = new Random();
    private final Voice[] voices = new Voice[32];
    private long t;
    private long nextChord;
    private long nextBell = 3L * SR;
    private int chord;
    private int bell = 3;

    // تنعيم + صدى (نفس Freeverb المصغّر بـSoundPlayer لكن بحالة مستمرة)
    private final Lowpass lpL = new Lowpass(), lpR = new Lowpass();
    private final Reverb rvL = new Reverb(0), rvR = new Reverb(23);

    private static final class Voice {
        boolean bell;
        double freq, phase, gain, panL, panR;
        long start, len;
    }

    // نغمة وتر: مثلثية، دخول 3 ثوانٍ، ثبات، خروج 4 ثوانٍ
    private void addPad(double freq, long start, double seconds, double gain, double pan) {
        add(false, freq, start, (long) (seconds * SR), gain, pan);
    }

    private void addBell(double freq, long start, double gain, double pan) {
        add(true, freq, start, (long) (2.8 * SR), gain, pan);
    }

    private void add(boolean bell, double freq, long start, long len, double gain, double pan) {
        for (int i = 0; i < voices.length; i++) {
            if (voices[i] == null) {
                Voice v = new Voice();
                v.bell = bell;
                v.freq = freq;
                v.start = start;
                v.len = len;
                v.gain = gain;
                v.panL = Math.sqrt((1 - pan) / 2);
                v.panR = Math.sqrt((1 + pan) / 2);
                voices[i] = v;
                return;
            }
        }
    }

    private void schedule() {
        while (nextChord <= t) {
            double len = 7 + rnd.nextDouble() * 4;
            double[] notes = CHORDS[chord];
            for (int k = 0; k < notes.length; k++) {
                // أحياناً نشيل النغمة الأوطى — تخفيف للطنين وتنويع باللون
                if (k == 0 && rnd.nextDouble() < 0.3) continue;
                addPad(notes[k], nextChord, len + 3, 0.045 - k * 0.007, (k - 1.5) * 0.2);
            }
            int[] options = NEXT[chord];
            chord = options[rnd.nextInt(options.length)];
            nextChord += (long) (len * SR);
        }
        while (nextBell <= t) {
            if (rnd.nextDouble() < 0.8) {
                int step = new int[]{-2, -1, 1, 2}[rnd.nextInt(4)];
                bell = Math.max(0, Math.min(BELLS.length - 1, bell + step));
                addBell(BELLS[bell], nextBell, 0.012 + rnd.nextDouble() * 0.01, rnd.nextDouble() * 0.8 - 0.4);
                if (rnd.nextDouble() < 0.25) {
                    addBell(BELLS[Math.min(BELLS.length - 1, bell + 2)], nextBell + (long) ((0.25 + rnd.nextDouble() * 0.25) * SR), 0.01, rnd.nextDouble() * 0.8 - 0.4);
                }
            }
            nextBell += (long) ((1.6 + rnd.nextDouble() * 2.9) * SR);
        }
    }

    // يملأ l/r بـframes عينة (قيم بين -1 و1 تقريباً)
    void render(float[] l, float[] r, int frames) {
        for (int n = 0; n < frames; n++, t++) {
            if ((t & 255) == 0) {
                schedule();
                // تنفّس بطيء بالنبرة: الفلتر يتموّج كل ~25 ثانية
                double cutoff = 1500 + 500 * Math.sin(2 * Math.PI * 0.04 * t / SR);
                lpL.set(cutoff);
                lpR.set(cutoff);
            }
            double sl = 0, sr = 0;
            for (int i = 0; i < voices.length; i++) {
                Voice v = voices[i];
                if (v == null || t < v.start) continue;
                long age = t - v.start;
                if (age >= v.len) {
                    voices[i] = null;
                    continue;
                }
                double s;
                if (v.bell) {
                    double sec = age / (double) SR;
                    double env = age < 0.015 * SR ? age / (0.015 * SR) : Math.exp(-sec * 3.2);
                    s = env * v.gain * (Math.sin(v.phase) + 0.25 * Math.exp(-sec * 5) * Math.sin(2 * v.phase));
                } else {
                    long attack = 3L * SR, release = 4L * SR;
                    double env = age < attack ? age / (double) attack
                            : age > v.len - release ? (v.len - age) / (double) release : 1;
                    // مثلثية من الطور
                    double p = v.phase / (2 * Math.PI);
                    p -= Math.floor(p);
                    double tri = p < 0.5 ? 4 * p - 1 : 3 - 4 * p;
                    s = env * v.gain * tri;
                }
                v.phase += 2 * Math.PI * v.freq / SR;
                if (v.phase > 2 * Math.PI * 1000) v.phase -= 2 * Math.PI * 1000;
                sl += s * v.panL;
                sr += s * v.panR;
            }
            double fl = lpL.process(sl), fr = lpR.process(sr);
            l[n] = (float) (fl + rvL.process(fl) * 0.45);
            r[n] = (float) (fr + rvR.process(fr) * 0.45);
        }
    }

    private static final class Lowpass {
        double b0, b1, b2, a1, a2, x1, x2, y1, y2;

        void set(double freq) {
            double w = 2 * Math.PI * freq / SR;
            double alpha = Math.sin(w) / (2 * 0.707);
            double cos = Math.cos(w);
            double a0 = 1 + alpha;
            b0 = (1 - cos) / 2 / a0;
            b1 = (1 - cos) / a0;
            b2 = b0;
            a1 = -2 * cos / a0;
            a2 = (1 - alpha) / a0;
        }

        double process(double x) {
            double y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
            x2 = x1;
            x1 = x;
            y2 = y1;
            y1 = y;
            return y;
        }
    }

    // Freeverb مصغّر بحالة مستمرة (4 مشط + 2 تمرير كلي) — صدى أوسع من صدى الأزرار
    private static final class Reverb {
        private final float[][] comb;
        private final int[] ci = new int[4];
        private final float[] store = new float[4];
        private final float[][] ap;
        private final int[] ai = new int[2];

        Reverb(int spread) {
            int[] c = {1557, 1617, 1491, 1422};
            comb = new float[4][];
            for (int i = 0; i < 4; i++) comb[i] = new float[c[i] + spread];
            ap = new float[][]{new float[556 + spread], new float[441 + spread]};
        }

        double process(double in) {
            double out = 0;
            for (int i = 0; i < 4; i++) {
                float[] b = comb[i];
                float y = b[ci[i]];
                store[i] = y * 0.7f + store[i] * 0.3f;
                b[ci[i]] = (float) (in * 0.2 + store[i] * 0.84f);
                ci[i] = (ci[i] + 1) % b.length;
                out += y;
            }
            for (int i = 0; i < 2; i++) {
                float[] b = ap[i];
                float bo = b[ai[i]];
                b[ai[i]] = (float) (out + bo * 0.5);
                out = bo - out;
                ai[i] = (ai[i] + 1) % b.length;
            }
            return out;
        }
    }
}
