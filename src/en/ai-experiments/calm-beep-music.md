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
    <div class="beep-white" data-pitch-class="0"></div>
    <div class="beep-white" data-pitch-class="2"></div>
    <div class="beep-white" data-pitch-class="4"></div>
    <div class="beep-white" data-pitch-class="5"></div>
    <div class="beep-white" data-pitch-class="7"></div>
    <div class="beep-white" data-pitch-class="9"></div>
    <div class="beep-white" data-pitch-class="11"></div>
    <div class="beep-black" data-pitch-class="1" style="left: 24px"></div>
    <div class="beep-black" data-pitch-class="3" style="left: 58px"></div>
    <div class="beep-black" data-pitch-class="6" style="left: 126px"></div>
    <div class="beep-black" data-pitch-class="8" style="left: 160px"></div>
    <div class="beep-black" data-pitch-class="10" style="left: 194px"></div>
  </div>
  <p class="beep-experiment-hint">🎧 Headphones recommended — and every play is a completely different tune, try it more than once</p>
</div>
