---
pageScript: "converter"
title: "Serverless File Converter"
icon: 🔄
desc: Convert images, audio and video — compress a photo, pull the audio out of a clip, shrink a video. Everything happens inside your browser, and your file never leaves your device.
categories:
  - صورة
  - صوت
  - فيديو
dateAdded: 2026-09-05
langSwitchUrl: "/ai-experiments/file-converter.html"
aiDisclosure: "A tool built by the site's owner with the help of AI. It runs entirely in your browser."
noThirdParty: true
---

<details class="calc-intro">
  <summary>ℹ️ Why a converter with no server?</summary>
  <p>Most online converters upload your file to their server, convert it there, then hand you back a result to download. You have no way to know where that file was stored, for how long, or who can reach it. And this is not a theoretical worry: a photo of a document, a private voice recording, a family video — each one passes through a stranger's machine. Browsers today can do the conversion itself without the file ever leaving your device, and this experiment proves it.</p>
</details>

<div class="instrument-picker conv-kinds">
  <button type="button" class="filter-chip conv-kind active" data-kind="image">🖼️ Images</button>
  <button type="button" class="filter-chip conv-kind" data-kind="audio">🎵 Audio</button>
  <button type="button" class="filter-chip conv-kind" data-kind="video">🎬 Video</button>
</div>

<details class="calc-intro conv-formats">
  <summary>📄 Supported formats: what it accepts and what it converts to</summary>
  <dl class="conv-fmt-list">
    <dt>🖼️ Images</dt>
    <dd><span class="conv-fmt-label">Accepts</span><span class="conv-fmt">JPG</span><span class="conv-fmt">PNG</span><span class="conv-fmt">WebP</span><span class="conv-fmt">GIF</span><span class="conv-fmt">BMP</span><span class="conv-fmt">AVIF</span><span class="conv-fmt">HEIC</span></dd>
    <dd><span class="conv-fmt-label">Converts to</span><span class="conv-fmt">WebP</span><span class="conv-fmt">JPG</span><span class="conv-fmt">PNG</span><span class="conv-fmt">BMP</span></dd>
    <dt>🎵 Audio</dt>
    <dd><span class="conv-fmt-label">Accepts</span><span class="conv-fmt">MP3</span><span class="conv-fmt">WAV</span><span class="conv-fmt">M4A</span><span class="conv-fmt">AAC</span><span class="conv-fmt">OGG</span><span class="conv-fmt">Opus</span><span class="conv-fmt">FLAC</span> and the sound of any video clip</dd>
    <dd><span class="conv-fmt-label">Converts to</span><span class="conv-fmt">MP3</span><span class="conv-fmt">WAV</span></dd>
    <dt>🎬 Video</dt>
    <dd><span class="conv-fmt-label">Accepts</span><span class="conv-fmt">MP4</span><span class="conv-fmt">MOV</span><span class="conv-fmt">WebM</span> and audio files (turned into a video with moving waves)</dd>
    <dd><span class="conv-fmt-label">Converts to</span><span class="conv-fmt">MP4</span><span class="conv-fmt">WebM</span></dd>
  </dl>
  <p>Some formats depend on your browser: HEIC photos open in Safari, and MP4 is exported where the browser supports it, otherwise WebM.</p>
</details>

<div class="conv-drop" id="convDrop">
  <p class="conv-drop-text">Drag files here, or</p>
  <label class="btn" for="convInput">📂 Choose files</label>
  <input type="file" id="convInput" multiple hidden />
  <p class="conv-drop-hint">You can pick several files at once</p>
</div>

<div class="conv-privacy">
  <strong>🔒 Your file never leaves your device.</strong>
  The whole conversion happens inside your browser, and we send your file nowhere.
  <br />
  <span class="conv-privacy-proof">Want to verify it yourself? Disconnect the internet after the page loads — it keeps working.</span>
</div>

<div class="conv-options" id="convImageOpts">
  <div class="conv-option">
    <span class="conv-option-label">Format</span>
    <div class="instrument-picker" data-kind="image">
      <button type="button" class="filter-chip conv-format active" data-format="image/webp">WebP</button>
      <button type="button" class="filter-chip conv-format" data-format="image/jpeg">JPG</button>
      <button type="button" class="filter-chip conv-format" data-format="image/png">PNG</button>
      <button type="button" class="filter-chip conv-format" data-format="image/bmp">BMP</button>
    </div>
  </div>

  <div class="conv-option" id="convQualityRow">
    <label class="conv-option-label" for="convQuality">Quality <output id="convQualityOut">85%</output></label>
    <input type="range" id="convQuality" min="30" max="100" value="85" step="5" />
  </div>

  <div class="conv-option">
    <label class="conv-option-label" for="convMaxWidth">Max width (pixels)</label>
    <input type="number" id="convMaxWidth" class="conv-number" min="0" step="100" placeholder="No resizing" />
  </div>
</div>

<div class="conv-options" id="convAudioOpts" hidden>
  <div class="conv-option">
    <span class="conv-option-label">Format</span>
    <div class="instrument-picker" data-kind="audio">
      <button type="button" class="filter-chip conv-format active" data-format="audio/mpeg">MP3</button>
      <button type="button" class="filter-chip conv-format" data-format="audio/wav">WAV</button>
    </div>
  </div>

  <div class="conv-option" id="convBitrateRow">
    <label class="conv-option-label" for="convBitrate">MP3 quality</label>
    <select id="convBitrate" class="conv-number">
      <option value="128">128 kbps</option>
      <option value="192" selected>192 kbps</option>
      <option value="320">320 kbps</option>
    </select>
  </div>

  <p class="conv-option-note">You can drop a video clip here to pull out just its audio.</p>
</div>

<div class="conv-options" id="convVideoOpts" hidden>
  <div class="conv-option">
    <span class="conv-option-label">Format</span>
    <div class="instrument-picker" data-kind="video">
      <button type="button" class="filter-chip conv-format active" data-format="">Best for your browser</button>
      <button type="button" class="filter-chip conv-format" data-format="video/mp4;codecs=avc1.42E01E,mp4a.40.2">MP4</button>
      <button type="button" class="filter-chip conv-format" data-format="video/webm;codecs=vp9,opus">WebM</button>
    </div>
  </div>

  <div class="conv-option">
    <label class="conv-option-label" for="convVideoWidth">Max width (pixels)</label>
    <input type="number" id="convVideoWidth" class="conv-number" min="0" step="160" placeholder="No resizing" />
  </div>

  <div class="conv-option">
    <label class="conv-check"><input type="checkbox" id="convMute" /> Remove the audio</label>
  </div>

  <p class="conv-option-note">
    You can drop an audio file here instead of a video — we'll turn it into a square video with an animated
    waveform instead of a picture.
  </p>
  <p class="conv-option-note">
    Video conversion runs in real time: a two-minute clip takes about two minutes, because it is re-encoded on your
    device rather than on a server. Keep the page open and in front until it finishes (browsers slow down background tabs).
  </p>
</div>

<div class="conv-results" id="convResults"></div>
