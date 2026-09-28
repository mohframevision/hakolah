---
title: "Experiment #1: AI-Generated Random Music"
icon: 🎵
desc: A generator that composes a different piece every time — pick the instrument and character (calm, stately, happy, dreamy), with repeating musical phrases and a coherent melody, right in your browser.
langSwitchUrl: "/ai-experiments/calm-beep-music.html"
aiDisclosure: "🧪 An experiment the site owner made with AI, just to explore and have fun."
---

A simple question: can a random algorithm actually compose something that feels like real music? The generator below builds a fresh 8-bar piece every time — on a steady beat, over a chord progression, with a melody that comes back so you can hold onto it, and an ending that resolves home — plus bass and accompaniment underneath. Hit play and judge for yourself.

<div class="beep-experiment">
  <div class="beep-stage">
    <div class="beep-controls">
      <button type="button" id="beepMelodyPlay" class="btn" data-play-label="▶️ Play Music" data-stop-label="⏹ Stop">▶️ Play Music</button>
      <button type="button" id="beepMelodyPrev" class="btn secondary">⏮️ Previous</button>
      <button type="button" id="beepMelodyNext" class="btn secondary">⏭️ New Piece</button>
    </div>
    <label class="beep-volume"><span aria-hidden="true">🔈</span><input type="range" id="beepVolume" min="0" max="1" step="0.05" value="0.8" aria-label="Music volume" /><span aria-hidden="true">🔊</span></label>
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
    <div class="instrument-picker">
    <button type="button" class="filter-chip keyboard-toggle" id="keyboardToggle" data-label-full="🎹 Full keyboard" data-label-mini="🎹 Simple keyboard">🎹 Full keyboard</button>
    <button type="button" class="filter-chip" id="noteNameToggle" data-default="letters" data-label-letters="🔤 C D E" data-label-solfege="🎼 Do Re Mi">🎼 Do Re Mi</button>
    </div>
    <div class="beep-staff-wrap" id="beepStaffWrap" hidden>
      <p class="beep-params-title">🎼 The notation as it plays</p>
      <div class="beep-staff-scroll" id="beepStaff"></div>
      <p class="beep-chord" id="beepChord" data-label="Chord now" data-major="major" data-minor="minor" data-dim="diminished"></p>
    </div>
    <details class="beep-more">
      <summary>📖 About the notation & chords</summary>
      <p class="beep-param-note">💰 Note lengths are like money: whole note (hollow, no stem) = 4 dinars · half note (hollow with stem) = 2 · quarter note = 1 dinar · eighth note = 500 fils · sixteenth = 250 fils. A dot next to a note adds half its value (a dotted half = 3 dinars).</p>
      <p class="beep-param-note">🎹 Major vs. minor chords: the only difference is the middle note — 4 semitones above the root in a major chord, 3 in a minor one. That small gap is what makes major sound bright and minor sound sad.</p>
    </details>
  </div>
  <div class="beep-play">
    <p class="beep-params-title">🎹 Play it yourself on your keyboard</p>
    <p class="beep-param-note">Middle row <span dir="ltr"><kbd>A</kbd> … <kbd>'</kbd></span> = white keys, the row above <span dir="ltr"><kbd>W</kbd> <kbd>E</kbd> <kbd>T</kbd> <kbd>Y</kbd> <kbd>U</kbd> <kbd>O</kbd> <kbd>P</kbd></span> = black keys. <kbd>Z</kbd> / <kbd>X</kbd> shift the octave. On a phone, just touch the keys. The sound is whichever instrument you picked below.</p>
    <div class="beep-play-octave">
      <button type="button" class="filter-chip" id="beepOctDown" aria-label="Octave down">Z ⬇️</button>
      <span id="beepOctLabel" dir="ltr">C4</span>
      <button type="button" class="filter-chip" id="beepOctUp" aria-label="Octave up">X ⬆️</button>
    </div>
    <div class="beep-play-keys" id="beepPlayKeys"></div>
  </div>
  <details class="beep-panel">
    <summary>🎛️ Instrument & character <span class="beep-panel-now" id="beepSoundNow"></span></summary>
    <div class="instrument-picker" id="instrumentPicker">
      <button type="button" class="filter-chip instrument-btn active" data-instrument="piano">🎹 Piano</button>
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
      <button type="button" class="filter-chip mood-btn" data-mood="stately">🕊️ Stately</button>
      <button type="button" class="filter-chip mood-btn" data-mood="happy">😊 Happy</button>
      <button type="button" class="filter-chip mood-btn" data-mood="dreamy">🌙 Dreamy</button>
      <button type="button" class="filter-chip mood-btn" data-mood="cinematic">🎬 Cinematic</button>
    </div>
  </details>
  <details class="beep-panel">
    <summary>🎚️ The four parameters of sound</summary>
    <div class="beep-params" id="beepParams">
      <div class="beep-param"><span>Frequency (pitch)</span><div class="instrument-picker">
        <button type="button" class="filter-chip param-btn" data-param="octave" data-value="-1">⬇️ Lower</button>
        <button type="button" class="filter-chip param-btn active" data-param="octave" data-value="0">Normal</button>
        <button type="button" class="filter-chip param-btn" data-param="octave" data-value="1">⬆️ Higher</button>
      </div></div>
      <div class="beep-param"><span>Rhythm (tempo)</span><div class="instrument-picker">
        <button type="button" class="filter-chip param-btn" data-param="tempo" data-value="0.75">🐢 Slower</button>
        <button type="button" class="filter-chip param-btn active" data-param="tempo" data-value="1">Normal</button>
        <button type="button" class="filter-chip param-btn" data-param="tempo" data-value="1.25">Faster</button>
      </div></div>
      <div class="beep-param"><span>Dynamics (loudness)</span><div class="instrument-picker">
        <button type="button" class="filter-chip param-btn" data-param="dynamics" data-value="0.4">p Soft</button>
        <button type="button" class="filter-chip param-btn active" data-param="dynamics" data-value="1">mf Medium</button>
        <button type="button" class="filter-chip param-btn" data-param="dynamics" data-value="1.6">f Loud</button>
      </div></div>
      <p class="beep-param-note">🎨 Timbre (the color of the sound) is the instrument — switch it with the buttons above and hear the same melody in a new color.</p>
    </div>
  </details>
  <details class="beep-panel">
    <summary>⬇️ Download & share</summary>
    <div class="instrument-picker">
      <button type="button" class="filter-chip" id="beepShareSeed" data-copied="Link to this exact piece copied">🔗 Copy link to this piece</button>
      <button type="button" class="filter-chip" id="beepDownloadWav" data-working="⏳ Preparing file...">⬇️ Download WAV</button>
      <button type="button" class="filter-chip" id="beepDownloadMp3" data-working="⏳ Preparing file..." data-failed="Could not prepare the MP3 file">⬇️ Download MP3</button>
      <button type="button" class="filter-chip" id="beepDownloadVideo" data-working="⏳ Recording" data-failed="Your browser does not support video recording">🎬 Download video</button>
      <button type="button" class="filter-chip" id="beepDownloadMidi">🎼 Download MIDI</button>
    </div>
    <div class="beep-seed-row">
      <label class="beep-seed-label" for="beepSeedInput">🌱 Seed</label>
      <input type="text" inputmode="numeric" id="beepSeedInput" class="beep-seed-input" placeholder="Enter a seed number" data-invalid="Enter a valid seed number" />
      <button type="button" class="filter-chip" id="beepSeedPlay">▶️ Play this seed</button>
    </div>
  </details>
  <div class="beep-analysis" id="beepAnalysis"
    data-label-key="Key"
    data-label-major="major"
    data-label-minor="minor"
    data-label-progression="Chord progression"
    data-label-form="Form"
    data-label-form-value="8-bar period: antecedent (1–4) + consequent (5–8)"
    data-label-tempo="Tempo"
    data-label-meter="Meter"
    data-label-cadence="Cadence"
    data-label-cadence-authentic="Authentic cadence"
    data-label-cadence-plagal="Plagal cadence"
    data-label-seed="Seed"></div>
  <p class="beep-experiment-hint">🎧 Headphones recommended — and every play is a completely different tune, try it more than once</p>
  <div class="beep-quiz" id="beepQuiz" data-right="✅ Correct! It was: " data-wrong="❌ Not quite — it was: " data-names="Frequency|Rhythm|Timbre|Dynamics">
    <p class="beep-params-title">👂 Ear training: what changed?</p>
    <p class="beep-param-note">You'll hear the same clip twice; the second time, exactly one parameter changes. Guess which.</p>
    <button type="button" class="btn secondary" id="beepQuizPlay">▶️ Hear both clips</button>
    <div class="instrument-picker">
      <button type="button" class="filter-chip quiz-btn" data-answer="pitch" disabled>Frequency</button>
      <button type="button" class="filter-chip quiz-btn" data-answer="rhythm" disabled>Rhythm</button>
      <button type="button" class="filter-chip quiz-btn" data-answer="timbre" disabled>Timbre</button>
      <button type="button" class="filter-chip quiz-btn" data-answer="dynamics" disabled>Dynamics</button>
    </div>
    <p class="beep-quiz-result" id="beepQuizResult" aria-live="polite"></p>
  </div>
  <p class="beep-experiment-hint">📚 The learning tools here (sound parameters, notation, ear training, the cinematic style) are inspired by a music production course I'm taking at university.</p>
</div>
