---
title: "Experiment #1: AI-Generated Random Music"
icon: 🎵
desc: A generator that composes a different calm piece every time — with repeating musical phrases and a coherent melody, right in your browser.
langSwitchUrl: "/ai-experiments/calm-beep-music.html"
aiDisclosure: "🧪 An experiment the site owner made with AI, just to explore and have fun."
---

A simple question: can a random algorithm — one that follows a few basic musical rules (a scale, phrases that repeat with variation, dynamic swells) — actually compose something that feels like real music? The generator below tries to answer that live in your browser, and it's different every time you play it. Hit play and judge for yourself.

<div class="beep-experiment">
  <button type="button" id="beepMelodyPlay" class="btn" data-play-label="▶️ Play Music" data-stop-label="⏹ Stop">▶️ Play Music</button>
  <div class="beep-keys" id="beepKeys" aria-hidden="true">
    <span class="beep-key" data-note-index="0"></span>
    <span class="beep-key" data-note-index="1"></span>
    <span class="beep-key" data-note-index="2"></span>
    <span class="beep-key" data-note-index="3"></span>
    <span class="beep-key" data-note-index="4"></span>
    <span class="beep-key" data-note-index="5"></span>
    <span class="beep-key" data-note-index="6"></span>
    <span class="beep-key" data-note-index="7"></span>
    <span class="beep-key" data-note-index="8"></span>
    <span class="beep-key" data-note-index="9"></span>
  </div>
  <p class="beep-experiment-hint">🎧 Headphones recommended — and every play is a completely different tune, try it more than once</p>
</div>
