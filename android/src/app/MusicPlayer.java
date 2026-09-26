package bh.mohframevision.hakolah;

import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioTrack;

// يشغّل AmbientSynth لحظياً على خيط خلفي (AudioTrack تدفّقي) — بدخول وخروج
// تدريجي بدل بداية/قطع مفاجئ. على صوت الوسائط (USAGE_GAME) نفس أصوات الأزرار.
final class MusicPlayer {
    // سماعة الجوال: رفع فوق مستوى الموقع (قمة ~0.25، بلا تشويه)
    private static final float VOLUME = 2.0f;
    private static Player current;

    private MusicPlayer() {}

    static synchronized void start() {
        if (current != null && current.isAlive() && !current.stopping) return;
        current = new Player();
        current.start();
    }

    static synchronized void stop() {
        if (current != null) current.stopping = true;
    }

    static synchronized boolean isPlaying() {
        return current != null && current.isAlive() && !current.stopping;
    }

    private static final class Player extends Thread {
        volatile boolean stopping;

        @Override
        public void run() {
            int sr = AmbientSynth.SR;
            int min = AudioTrack.getMinBufferSize(sr, AudioFormat.CHANNEL_OUT_STEREO, AudioFormat.ENCODING_PCM_16BIT);
            AudioTrack track;
            try {
                track = new AudioTrack.Builder()
                        .setAudioAttributes(new AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_GAME)
                                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                                .build())
                        .setAudioFormat(new AudioFormat.Builder()
                                .setSampleRate(sr)
                                .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                                .setChannelMask(AudioFormat.CHANNEL_OUT_STEREO)
                                .build())
                        .setBufferSizeInBytes(Math.max(min * 2, 8192))
                        .setTransferMode(AudioTrack.MODE_STREAM)
                        .build();
            } catch (Exception e) {
                return;
            }
            AmbientSynth synth = new AmbientSynth();
            int block = 1024;
            float[] l = new float[block], r = new float[block];
            short[] pcm = new short[block * 2];
            float gain = 0f;
            track.play();
            while (true) {
                synth.render(l, r, block);
                // دخول تدريجي ~2 ثانية، وخروج ~0.6 ثانية عند الإيقاف
                float target = stopping ? 0f : 1f;
                float stepIn = 1f / (sr * 2f), stepOut = 1f / (sr * 0.6f);
                for (int i = 0; i < block; i++) {
                    if (gain < target) gain = Math.min(target, gain + stepIn);
                    else if (gain > target) gain = Math.max(target, gain - stepOut);
                    float g = gain * VOLUME;
                    pcm[i * 2] = clip(l[i] * g);
                    pcm[i * 2 + 1] = clip(r[i] * g);
                }
                track.write(pcm, 0, pcm.length);
                if (stopping && gain <= 0f) break;
            }
            track.stop();
            track.release();
        }

        private static short clip(float v) {
            if (v > 1f) v = 1f;
            if (v < -1f) v = -1f;
            return (short) (v * Short.MAX_VALUE);
        }
    }
}
