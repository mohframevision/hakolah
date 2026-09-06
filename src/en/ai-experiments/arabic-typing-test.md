---
title: "Experiment Four: Arabic Typing Speed Test"
icon: ⌨️
desc: Measure your Arabic typing speed and accuracy on a real sentence — the timer starts with your first keystroke, and your best score is saved on your device.
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
  <p>Most typing tests are in English, and Arabic is genuinely different: letters join up, hamzas and taa marbuta matter, and the Arabic keyboard has its own rhythm. Here you type a real Arabic sentence, the timer starts on your first keystroke rather than before it, and letters colour as you go: green for correct, red for wrong.</p>
  <p>Your score is saved in your browser alone — no account, no server — so you're competing with yourself.</p>
</details>

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
    <div class="type-stat-label">Best score</div>
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
