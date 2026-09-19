package bh.mohframevision.hakolah;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioTrack;

// نفس أصوات الموقع بالضبط (playTone/playClickSound/playSuccessSound بـ
// main.js): موجة جيبية (sine) مركّبة مباشرة، بلا أي ملف صوتي — Web Audio
// بالموقع، AudioTrack هنا. نفس الترددات والمدد والتلاشي الأسّي بالضبط.
class SoundPlayer {
    private static final int SAMPLE_RATE = 44100;

    static void playClick(Context context) {
        if (!Prefs.isSoundEnabled(context)) return;
        new ToneThread(650, 0.07, 0).start();
    }

    static void playSuccess(Context context) {
        if (!Prefs.isSoundEnabled(context)) return;
        new ToneThread(660, 0.10, 0).start();
        new ToneThread(880, 0.12, 0.08).start();
    }

    // كلاس علوي مسمّى (مو مجهول) — يولّد موجة جيبية بتلاشٍ أسّي ويشغّلها
    // بخيط منفصل، بنفس منطق playTone(freq, duration, delay) بالموقع
    private static class ToneThread extends Thread {
        private final double freq;
        private final double duration;
        private final double delay;

        ToneThread(double freq, double duration, double delay) {
            this.freq = freq;
            this.duration = duration;
            this.delay = delay;
        }

        @Override
        public void run() {
            if (delay > 0) {
                try {
                    Thread.sleep((long) (delay * 1000));
                } catch (InterruptedException ignored) {
                    return;
                }
            }

            int sampleCount = (int) (SAMPLE_RATE * duration);
            short[] buffer = new short[sampleCount];
            // نفس منحنى الموقع: يبدأ 0.05 ويتلاشى أسّياً لـ0.0001 عند نهاية المدة
            double startAmp = 0.05;
            double endAmp = 0.0001;
            for (int i = 0; i < sampleCount; i++) {
                double t = (double) i / SAMPLE_RATE;
                double progress = (double) i / sampleCount;
                double amp = startAmp * Math.pow(endAmp / startAmp, progress);
                double sample = amp * Math.sin(2 * Math.PI * freq * t);
                buffer[i] = (short) (sample * Short.MAX_VALUE);
            }

            AudioTrack track = new AudioTrack.Builder()
                    .setAudioAttributes(new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build())
                    .setAudioFormat(new AudioFormat.Builder()
                            .setSampleRate(SAMPLE_RATE)
                            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                            .build())
                    .setBufferSizeInBytes(buffer.length * 2)
                    .setTransferMode(AudioTrack.MODE_STATIC)
                    .build();
            track.write(buffer, 0, buffer.length);
            track.play();
            // ننتظر انتهاء التشغيل الفعلي قبل release() — تحريرها فوراً يقطع
            // الصوت بمنتصفه، وتركها بلا release() نهائياً يسرّب موارد صوت
            // أصلية مع كل نقرة على المدى الطويل
            try {
                Thread.sleep((long) (duration * 1000) + 30);
            } catch (InterruptedException ignored) {
            }
            track.release();
        }
    }
}
