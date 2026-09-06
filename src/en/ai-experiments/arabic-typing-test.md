---
title: "Experiment Four: Arabic Typing Speed Test"
icon: ⌨️
desc: "A real challenge to your speed and accuracy — sentences in literary Arabic, rich in hamzas and hard letter forms, not simplified language. The timer starts with your first keystroke."
categories:
  - نص
dateAdded: 2026-09-06
langSwitchUrl: "/ai-experiments/arabic-typing-test.html"
wideLayout: true
aiDisclosure: "🧪 An experiment built by the site's owner with the help of AI, just for exploration and fun."
noThirdParty: true
---

<details class="calc-intro">
  <summary>ℹ️ What does this experiment do?</summary>
  <p>Most typing tests are in English, and Arabic is genuinely different: letters join up, hamzas and taa marbuta matter, and the Arabic keyboard has its own rhythm.</p>
  <p>The sentences here are deliberately in literary Arabic — not simplified, not colloquial. This is a challenge, not a beginner drill: it is dense with the different hamza forms that fast typists get wrong most often. The timer starts on your first keystroke rather than before it, and letters colour as you go: green for correct, red for wrong.</p>
  <p>Your score is saved in your browser alone — no account, no server — so you're competing with yourself.</p>
</details>

<div class="instrument-picker type-levels">
  <button type="button" class="filter-chip type-level" data-level="beginner">🌱 Beginner</button>
  <button type="button" class="filter-chip type-level" data-level="easy">🙂 Easy</button>
  <button type="button" class="filter-chip type-level active" data-level="medium">⚡ Medium</button>
  <button type="button" class="filter-chip type-level" data-level="hard">🔥 Hard</button>
</div>

<div class="type-stats">
  <div class="type-stat">
    <div class="type-stat-label">Speed</div>
    <div class="type-stat-value" id="typeSpeed">—</div>
    <div class="type-stat-unit">words/min</div>
  </div>
  <div class="type-stat">
    <div class="type-stat-label">Accuracy</div>
    <div class="type-stat-value" id="typeAccuracy">—</div>
    <div class="type-stat-unit">percent</div>
  </div>
  <div class="type-stat">
    <div class="type-stat-label">Time</div>
    <div class="type-stat-value" id="typeTime">0</div>
    <div class="type-stat-unit">seconds</div>
  </div>
  <div class="type-stat">
    <div class="type-stat-label">Your best at this level</div>
    <div class="type-stat-value" id="typeBest">—</div>
    <div class="type-stat-unit">words/min</div>
  </div>
</div>

<div class="type-prompt" id="typePrompt" aria-live="polite"></div>

<textarea
  id="typeInput"
  class="type-input"
  rows="3"
  placeholder="اكتب الجملة هنا… العدّاد يبدأ مع أول حرف"
  autocomplete="off"
  autocorrect="off"
  spellcheck="false"
></textarea>

<div class="type-actions">
  <button type="button" id="typeRestart" class="btn secondary">🔄 New sentence</button>
  <span class="type-hint" id="typeHint">Type any letter to start</span>
</div>
