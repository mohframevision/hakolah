---
title: "Experiment #1: Calm Music Made of Nothing but Beeps"
icon: 🎵
desc: Can simple beep tones (like 8-bit sound tools) actually form calm music? Tried it live, right in the browser.
langSwitchUrl: "/ai-experiments/calm-beep-music.html"
aiDisclosure: "This experiment (the writeup and the interactive generator) was built with AI assistance (Claude), based on a question I raised: can simple beep tones actually form calm music?"
---

The idea is simple: basic sound-generation tools (like the [8-bit sound generator](/hakolah/en/guides/jsfxr-8bit-sound-generator.html) I covered before) only ever produce a "beep" — one pure tone, no complexity at all. My question was: if you arrange a bunch of beeps, slowly, using notes that sit well together, does it actually start to feel like calm music — or does it just stay a string of beeps?

## The experiment

The generator below runs live in your browser (no pre-made audio file) — it randomly picks from six notes that harmonize with each other (a pentatonic scale), and plays them one at a time with calm gaps in between. Try it and judge for yourself:

<div class="beep-experiment">
  <button type="button" id="beepMelodyPlay" class="btn" data-play-label="▶️ Play Music" data-stop-label="⏹ Stop">▶️ Play Music</button>
  <p class="beep-experiment-hint">🎧 Headphones recommended for the clearest sense of it</p>
</div>

## What I learned from it

- A pure sine tone isn't "calm" or "harsh" by itself — the calmness comes from the rhythm and the spacing between notes, not the waveform.
- Picking notes from the same musical scale (instead of fully random ones) is enough to avoid any jarring clash, even with random ordering.
- Fading each note in and out gently (instead of cutting it off abruptly) is what separates an "annoying beep" from a "calm tone" — one small detail that changes the whole feel.

A simple experiment, but it revealed something I didn't expect: calmness is a matter of rhythm, not a matter of sound.
