---
pageScript: "board"
pageCss: "board"
title: "Idea Board"
icon: 📝
desc: "A free-form board for ideas and references: notes, images, links, to-do lists, columns, arrows and boards inside boards. It runs entirely on your device, free and with no account."
categories:
  - نص
dateAdded: 2026-11-24
langSwitchUrl: "/ai-experiments/idea-board.html"
aiDisclosure: "A tool built by the site's owner with the help of AI. It runs entirely in your browser."
noThirdParty: true
---

<div class="bd" data-lang="en">
  <div class="bd-bar" role="toolbar" aria-label="Board tools">
    <div class="bd-group">
      <button type="button" class="bd-btn" data-act="note" title="Note" aria-label="Note"><span aria-hidden="true">🗒</span><span class="bd-lbl">Note</span></button>
      <button type="button" class="bd-btn" data-act="todo" title="To-do" aria-label="To-do"><span aria-hidden="true">☑</span><span class="bd-lbl">To-do</span></button>
      <button type="button" class="bd-btn" data-act="link" title="Link" aria-label="Link"><span aria-hidden="true">🔗</span><span class="bd-lbl">Link</span></button>
      <button type="button" class="bd-btn" data-act="image" title="Image" aria-label="Image"><span aria-hidden="true">🖼</span><span class="bd-lbl">Image</span></button>
      <button type="button" class="bd-btn" data-act="column" title="Column" aria-label="Column"><span aria-hidden="true">▥</span><span class="bd-lbl">Column</span></button>
      <button type="button" class="bd-btn" data-act="board" title="Board" aria-label="Board"><span aria-hidden="true">▣</span><span class="bd-lbl">Board</span></button>
      <button type="button" class="bd-btn" data-act="arrow" title="Arrow" aria-label="Arrow" aria-pressed="false"><span aria-hidden="true">↗</span><span class="bd-lbl">Arrow</span></button>
    </div>
    <div class="bd-group">
      <button type="button" class="bd-btn" data-act="undo" title="Undo" aria-label="Undo" disabled><span aria-hidden="true">↶</span><span class="bd-lbl">Undo</span></button>
      <button type="button" class="bd-btn" data-act="redo" title="Redo" aria-label="Redo" disabled><span aria-hidden="true">↷</span><span class="bd-lbl">Redo</span></button>
      <button type="button" class="bd-btn" data-act="zout" title="Zoom out" aria-label="Zoom out"><span aria-hidden="true">−</span><span class="bd-lbl">Zoom out</span></button>
      <span class="bd-zoom" aria-live="polite">100%</span>
      <button type="button" class="bd-btn" data-act="zin" title="Zoom in" aria-label="Zoom in"><span aria-hidden="true">+</span><span class="bd-lbl">Zoom in</span></button>
      <button type="button" class="bd-btn" data-act="fit" title="Show all" aria-label="Show all"><span aria-hidden="true">⤢</span><span class="bd-lbl">Show all</span></button>
      <button type="button" class="bd-btn" data-act="full" title="Full screen" aria-label="Full screen" aria-pressed="false"><span aria-hidden="true">⛶</span><span class="bd-lbl">Full screen</span></button>
    </div>
  </div>
  <form class="bd-linkform" hidden>
    <input type="text" inputmode="url" dir="ltr" placeholder="https://" aria-label="Link" autocomplete="off" />
    <button type="submit" class="bd-btn bd-primary">Add</button>
  </form>
  <nav class="bd-crumbs" aria-label="Where you are"></nav>
  <div class="bd-stage" tabindex="0" aria-label="Board">
    <div class="bd-world" dir="ltr">
      <svg class="bd-arrows" aria-hidden="true"><defs><marker id="bd-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" /></marker></defs></svg>
    </div>
    <p class="bd-empty" hidden></p>
    <div class="bd-selbar" hidden>
      <div class="bd-swatches" role="group" aria-label="Card colour"></div>
      <button type="button" class="bd-btn" data-act="dup">Duplicate</button>
      <button type="button" class="bd-btn bd-danger" data-act="del">Delete</button>
    </div>
    <div class="bd-toast" role="status" hidden></div>
  </div>
  <div class="bd-foot">
    <span>Saved on this device only. Move it to another device with a file:</span>
    <button type="button" class="bd-btn" data-act="export">Export a copy</button>
    <button type="button" class="bd-btn" data-act="import">Import a copy</button>
  </div>
  <input type="file" class="bd-file" accept="image/*" multiple hidden />
  <input type="file" class="bd-import" accept="application/json,.json" hidden />
  <details class="bd-help">
    <summary>How to use it</summary>
    <ul>
      <li>Drag the background to move around. Zoom with two fingers, or Ctrl + mouse wheel.</li>
      <li>Tap a card once to select it, and again to write in it.</li>
      <li>Drag a card onto a column to stack it inside; drag it out to free it.</li>
      <li>Drop or paste an image onto the board; paste a link or text to make a card.</li>
      <li>A Board card opens a new board inside it, to split a project.</li>
      <li>Everything is saved in this browser on this device only. Export a copy to keep it safe or move it.</li>
    </ul>
  </details>
</div>
