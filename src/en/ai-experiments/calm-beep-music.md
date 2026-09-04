---
title: "Experiment #1: AI-Generated Random Music"
icon: 🎵
desc: A generator that composes a different piece every time — pick the instrument and mood (calm, energetic, happy, dreamy), with repeating musical phrases and a coherent melody, right in your browser.
langSwitchUrl: "/ai-experiments/calm-beep-music.html"
aiDisclosure: "🧪 An experiment the site owner made with AI, just to explore and have fun."
---

A simple question: can a random algorithm actually compose something that feels like real music? The generator below builds a fresh 8-bar piece every time — on a steady beat, over a chord progression, with a melody that comes back so you can hold onto it, and an ending that resolves home — plus bass and accompaniment underneath. Hit play and judge for yourself.

<div class="beep-experiment">
  <div class="instrument-picker" id="instrumentPicker">
    <button type="button" class="filter-chip instrument-btn active" data-instrument="piano">🎹 Piano</button>
    <button type="button" class="filter-chip instrument-btn" data-instrument="guitar">🎸 Guitar</button>
    <button type="button" class="filter-chip instrument-btn" data-instrument="flute">🪈 Flute</button>
    <button type="button" class="filter-chip instrument-btn" data-instrument="violin">🎻 Violin</button>
    <button type="button" class="filter-chip instrument-btn" data-instrument="trumpet">🎺 Trumpet</button>
    <button type="button" class="filter-chip instrument-btn" data-instrument="sax">🎷 Saxophone</button>
    <button type="button" class="filter-chip instrument-btn" data-instrument="banjo">🪕 Banjo</button>
    <button type="button" class="filter-chip instrument-btn" data-instrument="bell">🔔 Bell</button>
    <button type="button" class="filter-chip instrument-btn" data-instrument="accordion">🪗 Accordion</button>
    <button type="button" class="filter-chip instrument-btn" data-instrument="musicbox">🎐 Music Box</button>
  </div>
  <div class="instrument-picker" id="moodPicker">
    <button type="button" class="filter-chip mood-btn active" data-mood="calm">😌 Calm</button>
    <button type="button" class="filter-chip mood-btn" data-mood="energetic">⚡ Energetic</button>
    <button type="button" class="filter-chip mood-btn" data-mood="happy">😊 Happy</button>
    <button type="button" class="filter-chip mood-btn" data-mood="dreamy">🌙 Dreamy</button>
  </div>
  <div class="beep-controls">
    <button type="button" id="beepMelodyPlay" class="btn" data-play-label="▶️ Play Music" data-stop-label="⏹ Stop">▶️ Play Music</button>
    <button type="button" id="beepMelodyNext" class="btn secondary">⏭️ New Piece</button>
  </div>
  <div class="instrument-picker">
    <button type="button" class="filter-chip keyboard-toggle" id="keyboardToggle" data-label-full="🎹 Full keyboard" data-label-mini="🎹 Simple keyboard">🎹 Full keyboard</button>
    <button type="button" class="filter-chip" id="noteNameToggle" data-default="letters" data-label-letters="🔤 C D E" data-label-solfege="🎼 Do Re Mi">🎼 Do Re Mi</button>
    <button type="button" class="filter-chip" id="beepShareSeed" data-copied="Link to this exact piece copied">🔗 Copy link to this piece</button>
  </div>
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
  <div class="beep-keys-scroll" id="beepKeysFullWrap" hidden>
    <div class="beep-keys beep-keys-full" id="beepKeysFull" aria-hidden="true"></div>
  </div>
  <div class="beep-analysis" id="beepAnalysis"
    data-label-key="Key"
    data-label-major="major"
    data-label-minor="minor"
    data-label-progression="Chord progression"
    data-label-form="Form"
    data-label-form-value="8-bar period: antecedent (1–4) + consequent (5–8)"
    data-label-cadence="Cadence"
    data-label-cadence-value="Half cadence on V at bar 4, perfect authentic cadence V→I at bar 8"
    data-label-seed="Seed"></div>
  <p class="beep-experiment-hint">🎧 Headphones recommended — and every play is a completely different tune, try it more than once</p>
</div>
