// «لوح الأفكار» — لوح حرّ للعصف الذهني وجمع المراجع، يعمل كاملاً داخل المتصفح.
// كل شيء في IndexedDB على جهاز الزائر (القاعدة hk-board): الألواح وصورها. لا طلب لأي جهة.
// البطاقات: ملاحظة، قائمة مهام، رابط، صورة، عمود (يرصّ البطاقات داخله)، لوح داخلي (يفتح لوحاً جديداً)، وأسهم بين البطاقات.
(function () {
  const root = document.querySelector(".bd");
  if (!root) return;
  const AR = root.dataset.lang === "ar";
  const T = AR ? {
    note: "ملاحظة", todo: "مهام", link: "رابط", image: "صورة", column: "عمود", board: "لوح", arrow: "سهم",
    newNote: "اكتب فكرتك…", newTodo: "مهمة جديدة", colTitle: "عمود", boardTitle: "لوح جديد", home: "لوحي",
    linkAsk: "الصق الرابط هنا ثم اضغط إدخال", open: "افتح", undo: "تراجع", redo: "إعادة", del: "احذف", dup: "كرّر",
    fit: "أظهر الكل", zin: "قرّب", zout: "بعّد", exp: "صدّر نسخة", imp: "استورد نسخة", full: "ملء الشاشة",
    arrowHint: "اختر البطاقة الأولى ثم الثانية", empty: "لوح فارغ. أضف ملاحظة من الشريط، أو اسحب صورة، أو الصق نصاً أو رابطاً.",
    impOk: "تم الاستيراد", impBad: "الملف غير صالح", addItem: "+ أضف مهمة", saved: "محفوظ على جهازك", noDb: "المتصفح يمنع الحفظ هنا؛ ما تكتبه سيضيع عند الإغلاق.",
    colors: "لون", boardOpen: "افتح اللوح",
  } : {
    note: "Note", todo: "To-do", link: "Link", image: "Image", column: "Column", board: "Board", arrow: "Arrow",
    newNote: "Write your idea…", newTodo: "New task", colTitle: "Column", boardTitle: "New board", home: "My board",
    linkAsk: "Paste the link and press Enter", open: "Open", undo: "Undo", redo: "Redo", del: "Delete", dup: "Duplicate",
    fit: "Show all", zin: "Zoom in", zout: "Zoom out", exp: "Export a copy", imp: "Import a copy", full: "Full screen",
    arrowHint: "Pick the first card, then the second", empty: "Empty board. Add a note from the bar, drop an image, or paste text or a link.",
    impOk: "Imported", impBad: "That file is not a valid board", addItem: "+ Add task", saved: "Saved on your device", noDb: "This browser blocks saving here; your work will be lost when you close it.",
    colors: "Colour", boardOpen: "Open board",
  };
  const COLORS = ["", "#f6d365", "#a8e6cf", "#a0c4ff", "#ffadad", "#cdb4db", "#2b2d42"];
  const $ = (s, el = root) => el.querySelector(s);
  const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const safeUrl = (u) => { try { const x = new URL(u.trim()); return /^https?:$/.test(x.protocol) ? x.href : null; } catch { return null; } };

  // ── storage ──
  let db = null;
  const idb = (store, mode, fn) => new Promise((res, rej) => {
    if (!db) return rej(new Error("no db"));
    const tx = db.transaction(store, mode), st = tx.objectStore(store); let out;
    Promise.resolve(fn(st)).then((r) => { out = r; });
    tx.oncomplete = () => res(out); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error);
  });
  const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  function openDb() {
    return new Promise((res) => {
      let r; try { r = indexedDB.open("hk-board", 1); } catch { return res(null); }
      r.onupgradeneeded = () => { r.result.createObjectStore("boards", { keyPath: "id" }); r.result.createObjectStore("blobs"); };
      r.onsuccess = () => res(r.result); r.onerror = () => res(null); r.onblocked = () => res(null);
    });
  }
  const mem = { boards: new Map(), blobs: new Map() };    // fallback when IndexedDB is blocked (private mode on some browsers)
  const getBoard = (id) => db ? idb("boards", "readonly", (s) => req(s.get(id))) : Promise.resolve(mem.boards.get(id));
  const putBoard = (b) => db ? idb("boards", "readwrite", (s) => { s.put(b); }) : (mem.boards.set(b.id, b), Promise.resolve());
  const getBlob = (id) => db ? idb("blobs", "readonly", (s) => req(s.get(id))) : Promise.resolve(mem.blobs.get(id));
  const putBlob = (id, b) => db ? idb("blobs", "readwrite", (s) => { s.put(b, id); }) : (mem.blobs.set(id, b), Promise.resolve());
  const allBoards = () => db ? idb("boards", "readonly", (s) => req(s.getAll())) : Promise.resolve([...mem.boards.values()]);

  // ── state ──
  let B = null;                 // current board {id, name, parent, items:{}, arrows:[], view:{x,y,z}}
  let sel = new Set();          // selected item ids
  let selArrow = null;
  let arrowFrom = null, arrowMode = false;
  let undoStack = [], redoStack = [];
  const urls = new Map();       // blobId -> object URL

  // ── DOM ──
  const stage = $(".bd-stage"), world = $(".bd-world"), svg = $(".bd-arrows"), crumbs = $(".bd-crumbs"), toast = $(".bd-toast"), emptyMsg = $(".bd-empty");
  emptyMsg.textContent = T.empty;
  const fileIn = $(".bd-file"), impIn = $(".bd-import");

  function say(msg) { toast.textContent = msg; toast.hidden = false; clearTimeout(say.t); say.t = setTimeout(() => (toast.hidden = true), 2200); }

  // ── persistence + history ──
  let saveT = 0;
  function save() { clearTimeout(saveT); saveT = setTimeout(() => B && putBoard(B).catch(() => {}), 350); }
  function saveNow() { clearTimeout(saveT); if (B) putBoard(B).catch(() => {}); }
  const snap = () => JSON.stringify({ items: B.items, arrows: B.arrows });
  let pending = null;
  function begin() { pending = snap(); }          // call before a change; commit() after it
  function commit() {
    if (pending == null) return;
    const now = snap();
    if (now !== pending) { undoStack.push(pending); if (undoStack.length > 80) undoStack.shift(); redoStack = []; saveNow(); }
    pending = null; syncButtons();
  }
  function change(fn) { begin(); fn(); commit(); render(); }
  function restore(s) { const o = JSON.parse(s); B.items = o.items; B.arrows = o.arrows; sel.clear(); selArrow = null; saveNow(); render(); syncButtons(); }
  function undo() { if (!undoStack.length) return; redoStack.push(snap()); restore(undoStack.pop()); }
  function redo() { if (!redoStack.length) return; undoStack.push(snap()); restore(redoStack.pop()); }
  function syncButtons() { $('[data-act="undo"]').disabled = !undoStack.length; $('[data-act="redo"]').disabled = !redoStack.length; }

  // ── view ──
  function applyView() {
    const v = B.view;
    world.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.z})`;
    stage.style.backgroundPosition = `${v.x}px ${v.y}px`;
    stage.style.backgroundSize = `${24 * v.z}px ${24 * v.z}px`;
    $(".bd-zoom").textContent = Math.round(v.z * 100) + "%";
  }
  let viewSaveT = 0;
  function viewChanged() { applyView(); clearTimeout(viewSaveT); viewSaveT = setTimeout(save, 600); }
  function zoomAt(z, cx, cy) {
    const v = B.view, nz = Math.min(3, Math.max(0.15, z));
    v.x = cx - (cx - v.x) * (nz / v.z); v.y = cy - (cy - v.y) * (nz / v.z); v.z = nz; viewChanged();
  }
  const pageZoom = () => stage.getBoundingClientRect().width / (stage.offsetWidth || 1) || 1;   // <html> zoom on screens over 1600px
  const local = (cx, cy) => { const r = stage.getBoundingClientRect(), pz = pageZoom(); return { x: (cx - r.left) / pz, y: (cy - r.top) / pz }; };
  const toWorld = (cx, cy) => { const l = local(cx, cy), v = B.view; return { x: (l.x - v.x) / v.z, y: (l.y - v.y) / v.z }; };
  function centerPoint() { const v = B.view; return { x: (stage.offsetWidth / 2 - v.x) / v.z, y: (stage.offsetHeight / 2 - v.y) / v.z }; }
  function fit() {
    const els = [...world.querySelectorAll(":scope > .bd-item")];
    if (!els.length) { B.view = { x: 40, y: 40, z: 1 }; return viewChanged(); }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const e of els) { const it = B.items[e.dataset.id]; x0 = Math.min(x0, it.x); y0 = Math.min(y0, it.y); x1 = Math.max(x1, it.x + e.offsetWidth); y1 = Math.max(y1, it.y + e.offsetHeight); }
    const r = { width: stage.offsetWidth, height: stage.offsetHeight }, pad = 40;
    const z = Math.min(1.2, Math.max(0.15, Math.min((r.width - pad * 2) / (x1 - x0), (r.height - pad * 2) / (y1 - y0))));
    B.view = { z, x: (r.width - (x1 - x0) * z) / 2 - x0 * z, y: (r.height - (y1 - y0) * z) / 2 - y0 * z };
    viewChanged();
  }

  // ── items ──
  const children = (colId) => Object.values(B.items).filter((i) => i.col === colId).sort((a, b) => a.order - b.order);
  function addItem(type, extra = {}) {
    const p = extra.at || centerPoint(); delete extra.at;
    const it = Object.assign({ id: uid(), type, x: Math.round(p.x - 120), y: Math.round(p.y - 40), w: type === "column" ? 280 : type === "image" ? 300 : 240, color: "", col: null, order: 0 }, extra);
    if (type === "note" && it.text == null) it.text = "";
    if (type === "todo" && !it.tasks) it.tasks = [{ t: "", done: false }];
    if (type === "column" && it.title == null) it.title = T.colTitle;
    // stagger so repeated clicks don't stack exactly
    while (Object.values(B.items).some((o) => !o.col && o.id !== it.id && Math.abs(o.x - it.x) < 6 && Math.abs(o.y - it.y) < 6)) { it.x += 24; it.y += 24; }
    change(() => { B.items[it.id] = it; });
    select(it.id);
    stage.scrollIntoView({ block: "nearest" });
    return it;
  }
  async function addBoardCard() {
    const nb = { id: uid(), name: T.boardTitle, parent: B.id, items: {}, arrows: [], view: { x: 40, y: 40, z: 1 } };
    await putBoard(nb);
    addItem("board", { board: nb.id, title: nb.name });
  }
  function removeSelected() {
    if (selArrow) { change(() => { B.arrows = B.arrows.filter((a) => a.id !== selArrow); }); selArrow = null; return; }
    if (!sel.size) return;
    change(() => {
      const kill = new Set(sel);
      for (const id of sel) if (B.items[id]?.type === "column") children(id).forEach((c) => kill.add(c.id));
      kill.forEach((id) => delete B.items[id]);
      B.arrows = B.arrows.filter((a) => !kill.has(a.from) && !kill.has(a.to));
    });
    sel.clear(); render();
  }
  function duplicateSelected() {
    if (!sel.size) return;
    const fresh = [];
    change(() => {
      for (const id of sel) {
        const src = B.items[id]; if (!src) continue;
        const c = JSON.parse(JSON.stringify(src)); c.id = uid();
        if (src.type === "board") { c.board = uid(); putBoard({ id: c.board, name: c.title, parent: B.id, items: {}, arrows: [], view: { x: 40, y: 40, z: 1 } }).catch(() => {}); }
        if (src.col) { c.order = src.order + 0.5; } else { c.x += 24; c.y += 24; }
        B.items[c.id] = c; fresh.push(c.id);
        if (src.type === "column") children(id).forEach((k) => { const d = JSON.parse(JSON.stringify(k)); d.id = uid(); d.col = c.id; B.items[d.id] = d; });
      }
      normalizeOrders();
    });
    sel = new Set(fresh); render();
  }
  function normalizeOrders() {
    const cols = new Set(Object.values(B.items).filter((i) => i.col).map((i) => i.col));
    cols.forEach((c) => children(c).forEach((k, i) => (k.order = i)));
  }

  // images: downscale big photos before storing (phones make 12 MP shots)
  async function addImageFile(file, at) {
    if (!file || !/^image\//.test(file.type)) return;
    let blob = file;
    try {
      const bmp = await createImageBitmap(file);
      const max = 1600, s = Math.min(1, max / Math.max(bmp.width, bmp.height));
      if (s < 1 || file.size > 1.5e6) {
        const cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * s); cv.height = Math.round(bmp.height * s);
        cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
        blob = await new Promise((r) => cv.toBlob(r, "image/webp", 0.86)) || file;
      }
      var ratio = bmp.height / bmp.width; bmp.close && bmp.close();
    } catch { ratio = 0.75; }
    const id = uid(); await putBlob(id, blob);
    addItem("image", { blob: id, ratio, at });
  }
  function blobUrl(id, img) {
    if (urls.has(id)) { img.src = urls.get(id); return; }
    getBlob(id).then((b) => { if (!b) return; const u = URL.createObjectURL(b); urls.set(id, u); img.src = u; }).catch(() => {});
  }

  // ── render ──
  function render() {
    world.querySelectorAll(".bd-item").forEach((e) => e.remove());
    const top = Object.values(B.items).filter((i) => !i.col);
    for (const it of top) world.appendChild(itemEl(it));
    emptyMsg.hidden = top.length > 0;
    syncSel(); applyView(); drawArrows();
  }
  function itemEl(it) {
    const el = h("div", "bd-item bd-" + it.type); el.dataset.id = it.id; el.dir = AR ? "rtl" : "ltr";
    if (!it.col) { el.style.left = it.x + "px"; el.style.top = it.y + "px"; }
    el.style.width = it.w + "px";
    if (it.color) { el.style.setProperty("--card", it.color); el.classList.add("has-color"); if (it.color === "#2b2d42") el.classList.add("is-dark"); }
    if (it.type === "note") {
      const t = h("div", "bd-text", it.text); t.dir = "auto"; t.dataset.ph = T.newNote; el.appendChild(t);
    } else if (it.type === "todo") {
      const ul = h("ul", "bd-tasks");
      it.tasks.forEach((tk, i) => {
        const li = h("li", tk.done ? "done" : "");
        const cb = h("button", "bd-check"); cb.type = "button"; cb.setAttribute("role", "checkbox"); cb.setAttribute("aria-checked", tk.done); cb.dataset.task = i;
        const tx = h("div", "bd-text", tk.t); tx.dir = "auto"; tx.dataset.ph = T.newTodo; tx.dataset.task = i;
        li.append(cb, tx); ul.appendChild(li);
      });
      const add = h("button", "bd-addtask", T.addItem); add.type = "button";
      el.append(ul, add);
    } else if (it.type === "link") {
      let host = it.url; try { host = new URL(it.url).hostname.replace(/^www\./, ""); } catch { /* keep the raw url */ }
      const top = h("div", "bd-link-host", host); top.dir = "ltr";
      const t = h("div", "bd-text", it.text || ""); t.dir = "auto"; t.dataset.ph = it.url;
      const a = h("a", "bd-link-open", T.open + " ↗"); const su = safeUrl(it.url || ""); if (su) a.href = su; a.target = "_blank"; a.rel = "noopener noreferrer";
      el.append(top, t, a);
    } else if (it.type === "image") {
      const img = h("img"); img.alt = it.text || ""; img.draggable = false; img.style.aspectRatio = 1 / (it.ratio || 0.75);
      img.onload = drawArrows; blobUrl(it.blob, img);
      const cap = h("div", "bd-text bd-caption", it.text || ""); cap.dir = "auto"; cap.dataset.ph = "…";
      el.append(img, cap);
    } else if (it.type === "column") {
      const t = h("div", "bd-text bd-col-title", it.title); t.dir = "auto"; t.dataset.ph = T.colTitle;
      const list = h("div", "bd-col-list");
      for (const c of children(it.id)) list.appendChild(itemEl(c));
      el.append(t, list);
    } else if (it.type === "board") {
      const ic = h("div", "bd-board-icon"); ic.setAttribute("aria-hidden", "true");
      const t = h("div", "bd-text", it.title); t.dir = "auto"; t.dataset.ph = T.boardTitle;
      const o = h("button", "bd-board-open", T.boardOpen + (AR ? " ←" : " →")); o.type = "button";
      el.append(ic, t, o);
    }
    const rz = h("div", "bd-resize"); rz.setAttribute("aria-hidden", "true"); el.appendChild(rz);
    return el;
  }
  function syncSel() {
    world.querySelectorAll(".bd-item").forEach((e) => e.classList.toggle("is-sel", sel.has(e.dataset.id)));
    world.querySelectorAll(".bd-arrow").forEach((e) => e.classList.toggle("is-sel", e.dataset.id === selArrow));
    const bar = $(".bd-selbar"); bar.hidden = !(sel.size || selArrow);
    $(".bd-swatches").hidden = !sel.size;
    $('[data-act="dup"]').hidden = !sel.size;
  }
  function select(id, add) {
    selArrow = null;
    if (!add) sel.clear();
    if (id) { if (add && sel.has(id)) sel.delete(id); else sel.add(id); }
    syncSel();
  }
  // rect of an item in world coordinates (works for items inside columns too)
  function rectOf(id) {
    const e = world.querySelector(`.bd-item[data-id="${id}"]`); if (!e) return null;
    const r = e.getBoundingClientRect(), a = toWorld(r.left, r.top), k = B.view.z * pageZoom();
    return { x: a.x, y: a.y, w: r.width / k, h: r.height / k };
  }
  function edgePoint(r, tx, ty) {   // where the line from the centre of r toward (tx,ty) leaves r
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, dx = tx - cx, dy = ty - cy;
    if (!dx && !dy) return { x: cx, y: cy };
    const s = Math.min(Math.abs((r.w / 2 + 6) / (dx || 1e-9)), Math.abs((r.h / 2 + 6) / (dy || 1e-9)));
    return { x: cx + dx * s, y: cy + dy * s };
  }
  function drawArrows() {
    if (!B) return;
    svg.querySelectorAll(".bd-arrow").forEach((e) => e.remove());
    for (const a of B.arrows) {
      const ra = rectOf(a.from), rb = rectOf(a.to); if (!ra || !rb) continue;
      const p = edgePoint(ra, rb.x + rb.w / 2, rb.y + rb.h / 2), q = edgePoint(rb, ra.x + ra.w / 2, ra.y + ra.h / 2);
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g"); g.setAttribute("class", "bd-arrow"); g.dataset.id = a.id;
      const hit = document.createElementNS(g.namespaceURI, "line"), ln = document.createElementNS(g.namespaceURI, "line");
      for (const l of [hit, ln]) { l.setAttribute("x1", p.x); l.setAttribute("y1", p.y); l.setAttribute("x2", q.x); l.setAttribute("y2", q.y); }
      hit.setAttribute("class", "hit"); ln.setAttribute("class", "ln"); ln.setAttribute("marker-end", "url(#bd-head)");
      g.append(hit, ln); svg.appendChild(g);
    }
  }

  // ── editing text ──
  function startEdit(textEl) {
    const itEl = textEl.closest(".bd-item"); const id = itEl.dataset.id;
    begin();
    try { textEl.contentEditable = "plaintext-only"; } catch { textEl.contentEditable = "true"; }
    if (textEl.contentEditable !== "plaintext-only") textEl.contentEditable = "true";
    textEl.focus();
    const r = document.createRange(); r.selectNodeContents(textEl); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    const done = () => {
      textEl.removeEventListener("blur", done);
      textEl.contentEditable = "false";
      const it = B.items[id]; if (!it) return;
      writeText(textEl);
      if (it.type === "board") getBoard(it.board).then((b) => { if (b) { b.name = it.title; putBoard(b); } });
      commit(); drawArrows();
    };
    textEl.addEventListener("blur", done);
  }
  stage.addEventListener("keydown", (e) => {
    const t = e.target; if (!t.isContentEditable) return;
    if (e.key === "Escape") { t.blur(); e.preventDefault(); }
    if (e.key === "Enter" && !e.shiftKey && t.dataset.task != null) {   // Enter in a task = next task
      e.preventDefault(); const id = t.closest(".bd-item").dataset.id, i = +t.dataset.task; t.blur();
      change(() => { B.items[id].tasks.splice(i + 1, 0, { t: "", done: false }); });
      const nx = world.querySelector(`.bd-item[data-id="${id}"] .bd-text[data-task="${i + 1}"]`); if (nx) startEdit(nx);
    }
    if (e.key === "Backspace" && t.dataset.task != null && !t.innerText.trim()) {   // empty task + Backspace = remove it
      const id = t.closest(".bd-item").dataset.id, i = +t.dataset.task, it = B.items[id];
      if (it.tasks.length > 1) { e.preventDefault(); t.blur(); change(() => { it.tasks.splice(i, 1); }); const pv = world.querySelector(`.bd-item[data-id="${id}"] .bd-text[data-task="${Math.max(0, i - 1)}"]`); if (pv) startEdit(pv); }
    }
    e.stopPropagation();
  });
  // typed text goes into the board as you type (the undo step is still made on blur), so a reload mid-edit loses nothing
  function writeText(t) {
    const it = B.items[t.closest(".bd-item")?.dataset.id]; if (!it) return;
    const v = t.innerText.replace(/\n$/, "");
    if (t.dataset.task != null) { if (it.tasks[+t.dataset.task]) it.tasks[+t.dataset.task].t = v; }
    else if (it.type === "column" || it.type === "board") it.title = v;
    else it.text = v;
  }
  stage.addEventListener("input", (e) => { if (e.target.isContentEditable) { writeText(e.target); save(); } drawArrows(); });

  // ── pointer: pan, drag, resize, pinch ──
  const ptrs = new Map(); let gest = null;
  stage.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    if (e.target.isContentEditable || e.target.closest("a, .bd-selbar, .bd-toast")) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) {     // pinch
      if (gest && (gest.kind === "resize" || (gest.kind === "drag" && gest.moved))) { commit(); render(); }
      stage.classList.remove("is-panning", "is-dragging");
      const [a, b] = [...ptrs.values()];
      gest = { kind: "pinch", d: Math.hypot(a.x - b.x, a.y - b.y), z: B.view.z, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, vx: B.view.x, vy: B.view.y };
      return;
    }
    const itemEl0 = e.target.closest(".bd-item"), arrowEl = e.target.closest(".bd-arrow");
    if (arrowEl) { sel.clear(); selArrow = arrowEl.dataset.id; syncSel(); return; }
    if (!itemEl0) {
      if (document.activeElement?.isContentEditable) document.activeElement.blur();
      select(null); arrowFrom = null;
      gest = { kind: "pan", sx: e.clientX, sy: e.clientY, vx: B.view.x, vy: B.view.y };
      stage.setPointerCapture(e.pointerId); stage.classList.add("is-panning");
      return;
    }
    const id = itemEl0.dataset.id;
    if (document.activeElement?.isContentEditable) document.activeElement.blur();
    const it = B.items[id]; if (!it) return;
    if (arrowMode) {
      if (!arrowFrom) { arrowFrom = id; select(id); say(T.arrowHint); }
      else if (arrowFrom !== id) {
        const a = arrowFrom; arrowFrom = null; arrowMode = false; $('[data-act="arrow"]').setAttribute("aria-pressed", "false");
        if (!B.arrows.some((x) => (x.from === a && x.to === id) || (x.from === id && x.to === a))) change(() => B.arrows.push({ id: uid(), from: a, to: id }));
        select(null);
      }
      return;
    }
    const ctl = e.target.closest(".bd-check, .bd-addtask, .bd-board-open");   // acts on tap (pointerup without moving), so a pan can start on it
    const wasSel = sel.has(id) && sel.size === 1;
    if (!sel.has(id) || e.shiftKey) select(id, e.shiftKey);
    const w = toWorld(e.clientX, e.clientY);
    if (e.target.classList.contains("bd-resize")) {
      gest = { kind: "resize", id, sx: w.x, w0: it.w, el: itemEl0 }; begin();
    } else {
      const textEl = e.target.closest(".bd-text");
      gest = { kind: "drag", id, sx: w.x, sy: w.y, ex: e.clientX, ey: e.clientY, moved: false, textEl, ctl, wasSel: wasSel && e.detail < 2 };
    }
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!gest) return;
    if (gest.kind === "pinch" && ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), m = local((a.x + b.x) / 2, (a.y + b.y) / 2), m0 = local(gest.mx, gest.my);
      const nz = Math.min(3, Math.max(0.15, gest.z * d / gest.d)), k = nz / gest.z;
      B.view.z = nz; B.view.x = m.x - (m0.x - gest.vx) * k; B.view.y = m.y - (m0.y - gest.vy) * k; viewChanged();
    } else if (gest.kind === "pan") {
      const pz = pageZoom(); B.view.x = gest.vx + (e.clientX - gest.sx) / pz; B.view.y = gest.vy + (e.clientY - gest.sy) / pz; viewChanged();
    } else if (gest.kind === "resize") {
      const w = toWorld(e.clientX, e.clientY), it = B.items[gest.id];
      it.w = Math.round(Math.max(it.type === "column" ? 200 : 140, Math.min(900, gest.w0 + (w.x - gest.sx))));
      gest.el.style.width = it.w + "px"; drawArrows();
    } else if (gest.kind === "drag") {
      if (!gest.moved && Math.hypot(e.clientX - gest.ex, e.clientY - gest.ey) < 5) return;
      const w = toWorld(e.clientX, e.clientY);
      if (!gest.moved) {
        gest.moved = true; begin();
        // pull items out of their columns into the free board while dragging
        gest.items = [...sel].map((id) => {
          const it = B.items[id]; if (!it) return null;
          if (it.col) { const r = rectOf(id); it.col = null; it.x = r.x; it.y = r.y; }
          return { it, x: it.x, y: it.y };
        }).filter(Boolean);
        render(); stage.classList.add("is-dragging");
      }
      const dx = w.x - gest.sx, dy = w.y - gest.sy;
      for (const g of gest.items) {
        g.it.x = Math.round(g.x + dx); g.it.y = Math.round(g.y + dy);
        const el = world.querySelector(`:scope > .bd-item[data-id="${g.it.id}"]`); if (el) { el.style.left = g.it.x + "px"; el.style.top = g.it.y + "px"; }
      }
      // column drop target (only for single non-column item)
      world.querySelectorAll(".bd-column.is-target").forEach((c) => c.classList.remove("is-target"));
      gest.target = null;
      if (gest.items.length === 1 && gest.items[0].it.type !== "column") {
        const under = document.elementsFromPoint(e.clientX, e.clientY).map((n) => n.closest?.(".bd-column")).find((c) => c && c.dataset.id !== gest.items[0].it.id);
        if (under) { under.classList.add("is-target"); gest.target = { col: under.dataset.id, y: e.clientY }; }
      }
      drawArrows();
    }
  });
  function endPointer(e) {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (!gest) return;
    if (gest.kind === "pinch") { if (ptrs.size < 2) { gest = null; stage.classList.remove("is-panning", "is-dragging"); } return; }
    if (ptrs.size) return;
    stage.classList.remove("is-panning", "is-dragging");
    const g = gest; gest = null;
    if (g.kind === "resize") { commit(); render(); return; }
    if (g.kind === "drag") {
      if (g.moved) {
        if (g.target) {
          const it = g.items[0].it, kids = children(g.target.col);
          let idx = kids.length;
          kids.forEach((k, i) => { const el = world.querySelector(`.bd-item[data-id="${k.id}"]`); if (!el || idx !== kids.length) return; const er = el.getBoundingClientRect(); if (g.target.y < er.top + er.height / 2) idx = i; });
          it.col = g.target.col; it.order = idx - 0.5;
        }
        normalizeOrders(); commit(); render();
      } else if (e.type === "pointerup" && g.ctl) tapControl(g.ctl, g.id);
      else if (g.textEl && g.wasSel && e.type === "pointerup") startEdit(g.textEl);   // second tap on a selected card edits it
    }
  }
  function tapControl(ctl, id) {
    const it = B.items[id]; if (!it) return;
    if (ctl.classList.contains("bd-check")) { const i = +ctl.dataset.task; change(() => { it.tasks[i].done = !it.tasks[i].done; }); }
    else if (ctl.classList.contains("bd-addtask")) {
      change(() => it.tasks.push({ t: "", done: false }));
      const nx = world.querySelector(`.bd-item[data-id="${id}"] .bd-text[data-task="${it.tasks.length - 1}"]`); if (nx) startEdit(nx);
    } else if (ctl.classList.contains("bd-board-open")) openBoard(it.board);
  }
  stage.addEventListener("pointerup", endPointer);
  stage.addEventListener("pointercancel", endPointer);
  stage.addEventListener("dblclick", (e) => {
    const hit = document.elementFromPoint(e.clientX, e.clientY) || e.target;   // pointer capture retargets dblclick to the stage
    const it = hit.closest(".bd-item"); if (!it || hit.isContentEditable) return;
    if (B.items[it.dataset.id]?.type === "board" && !hit.closest(".bd-text")) return openBoard(B.items[it.dataset.id].board);
    const t = hit.closest(".bd-text") || it.querySelector(".bd-text"); if (t) startEdit(t);
  });
  stage.addEventListener("wheel", (e) => {
    if (e.target.isContentEditable) return;
    e.preventDefault();
    const l = local(e.clientX, e.clientY);
    if (e.ctrlKey || e.metaKey) zoomAt(B.view.z * Math.exp(-e.deltaY * 0.0022), l.x, l.y);
    else { B.view.x -= e.deltaX; B.view.y -= e.deltaY; viewChanged(); }
  }, { passive: false });

  // ── toolbar + selection bar ──
  root.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const act = b.dataset.act, r = { width: stage.offsetWidth, height: stage.offsetHeight };
    if (act !== "arrow" && arrowMode) { arrowMode = false; arrowFrom = null; $('[data-act="arrow"]').setAttribute("aria-pressed", "false"); }
    switch (act) {
      case "note": { const it = addItem("note"); const t = world.querySelector(`.bd-item[data-id="${it.id}"] .bd-text`); if (t) startEdit(t); break; }
      case "todo": { const it = addItem("todo"); const t = world.querySelector(`.bd-item[data-id="${it.id}"] .bd-text`); if (t) startEdit(t); break; }
      case "column": addItem("column"); break;
      case "board": addBoardCard(); break;
      case "image": fileIn.click(); break;
      case "link": { const f = $(".bd-linkform"); f.hidden = !f.hidden; if (!f.hidden) f.querySelector("input").focus(); break; }
      case "arrow": arrowMode = !arrowMode; arrowFrom = null; b.setAttribute("aria-pressed", String(arrowMode)); if (arrowMode) say(T.arrowHint); break;
      case "undo": undo(); break;
      case "redo": redo(); break;
      case "zin": zoomAt(B.view.z * 1.25, r.width / 2, r.height / 2); break;
      case "zout": zoomAt(B.view.z / 1.25, r.width / 2, r.height / 2); break;
      case "fit": fit(); break;
      case "del": removeSelected(); break;
      case "dup": duplicateSelected(); break;
      case "full": root.classList.toggle("is-full"); b.setAttribute("aria-pressed", String(root.classList.contains("is-full"))); document.documentElement.classList.toggle("bd-lock", root.classList.contains("is-full")); break;
      case "export": exportAll(); break;
      case "import": impIn.click(); break;
    }
  });
  $(".bd-swatches").addEventListener("click", (e) => {
    const s = e.target.closest("[data-color]"); if (!s) return;
    change(() => sel.forEach((id) => { if (B.items[id]) B.items[id].color = s.dataset.color; }));
  });
  COLORS.forEach((c) => { const s = h("button", "bd-swatch"); s.type = "button"; s.dataset.color = c; s.style.setProperty("--sw", c || "var(--color-surface)"); s.setAttribute("aria-label", T.colors + " " + (c || "—")); $(".bd-swatches").appendChild(s); });
  $(".bd-linkform").addEventListener("submit", (e) => {
    e.preventDefault(); const inp = e.target.querySelector("input"), u = safeUrl(inp.value) || safeUrl("https://" + inp.value);
    if (!u) return inp.select();
    addItem("link", { url: u, text: "" }); inp.value = ""; e.target.hidden = true;
  });
  fileIn.addEventListener("change", async () => { const c = centerPoint(); let k = 0; for (const f of fileIn.files) await addImageFile(f, { x: c.x + k * 30, y: c.y + k++ * 30 }); fileIn.value = ""; });

  // drop + paste
  stage.addEventListener("dragover", (e) => { if ([...(e.dataTransfer?.types || [])].some((t) => t === "Files" || t === "text/uri-list" || t === "text/plain")) e.preventDefault(); });
  stage.addEventListener("drop", async (e) => {
    e.preventDefault(); const at = toWorld(e.clientX, e.clientY), files = [...e.dataTransfer.files];
    if (files.length) { let k = 0; for (const f of files) await addImageFile(f, { x: at.x + k * 30, y: at.y + k++ * 30 }); return; }
    const txt = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
    if (txt) addText(txt, at);
  });
  function addText(txt, at) {
    const u = safeUrl(txt.split(/\s/)[0]);
    if (u && u.length >= txt.trim().length - 1) addItem("link", { url: u, text: "", at });
    else addItem("note", { text: txt.trim().slice(0, 20000), at });
  }
  document.addEventListener("paste", (e) => {
    if (!root.isConnected || e.target.isContentEditable || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (!stage.contains(document.activeElement)) return;
    const items = [...(e.clipboardData?.items || [])], img = items.find((i) => i.kind === "file" && i.type.startsWith("image/"));
    if (img) { e.preventDefault(); addImageFile(img.getAsFile()); return; }
    const txt = e.clipboardData.getData("text/plain"); if (txt.trim()) { e.preventDefault(); addText(txt); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (!stage.contains(e.target) || e.target.closest("button, a, summary")) {
      if (e.key === "Escape" && root.classList.contains("is-full")) $('[data-act="full"]').click();
      return;
    }
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
    else if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); duplicateSelected(); }
    else if ((e.key === "Delete" || e.key === "Backspace") && (sel.size || selArrow)) { e.preventDefault(); removeSelected(); }
    else if (e.key === "Escape") { select(null); arrowMode = false; arrowFrom = null; $('[data-act="arrow"]').setAttribute("aria-pressed", "false"); if (root.classList.contains("is-full")) $('[data-act="full"]').click(); }
    else if (e.key === "Enter" && sel.size === 1) { const t = world.querySelector(`.bd-item[data-id="${[...sel][0]}"] .bd-text`); if (t) { e.preventDefault(); startEdit(t); } }
  });

  // ── boards ──
  async function openBoard(id) {
    if (document.activeElement?.isContentEditable) document.activeElement.blur();
    clearTimeout(saveT); if (B) await putBoard(B).catch(() => {});
    const b = await getBoard(id); if (!b) return;
    B = b; sel.clear(); selArrow = null; undoStack = []; redoStack = []; syncButtons();
    try { localStorage.setItem("hk-board-last", id); } catch { /* storage blocked */ }
    render(); renderCrumbs();
  }
  async function renderCrumbs() {
    const path = [], seen = new Set(); let b = B;
    while (b && !seen.has(b.id) && path.length < 50) { seen.add(b.id); path.unshift(b); b = b.parent ? await getBoard(b.parent) : null; }
    crumbs.textContent = "";
    path.forEach((p, i) => {
      if (i) crumbs.append(h("span", "bd-sep", AR ? "‹" : "›"));
      const name = p.id === "home" ? T.home : p.name;
      if (i === path.length - 1) { const s = h("span", "bd-crumb is-here", name); s.setAttribute("aria-current", "page"); crumbs.append(s); }
      else { const a = h("button", "bd-crumb", name); a.type = "button"; a.onclick = () => openBoard(p.id); crumbs.append(a); }
    });
  }

  // ── export / import (one JSON file, images inside as data URLs) ──
  const toDataUrl = (b) => new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); });
  async function exportAll() {
    clearTimeout(saveT); await putBoard(B).catch(() => {});
    const byId = new Map((await allBoards()).map((b) => [b.id, b])), boards = [], blobs = {}, todo = ["home"];   // only boards reachable from home
    while (todo.length) { const b = byId.get(todo.pop()); if (!b || boards.includes(b)) continue; boards.push(b); for (const it of Object.values(b.items)) if (it.type === "board") todo.push(it.board); }
    for (const b of boards) for (const it of Object.values(b.items)) if (it.blob && !blobs[it.blob]) { const bl = await getBlob(it.blob); if (bl) blobs[it.blob] = await toDataUrl(bl); }
    const file = new Blob([JSON.stringify({ app: "hakolah-board", v: 1, boards, blobs })], { type: "application/json" });
    const a = h("a"); a.href = URL.createObjectURL(file); a.download = `board-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  // data URLs are decoded here: fetch(data:) is blocked by the page CSP (connect-src)
  function dataUrlBlob(url) {
    const m = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(url || ""); if (!m) return null;
    const bin = atob(m[2]); return new Blob([Uint8Array.from(bin, (c) => c.charCodeAt(0))], { type: m[1] });
  }
  const TYPES = ["note", "todo", "link", "image", "column", "board"];
  const str = (v) => (typeof v === "string" ? v.slice(0, 20000) : "");
  const num = (v, d) => (Number.isFinite(v) ? Math.max(-1e6, Math.min(1e6, v)) : d);
  function cleanBoard(b) {   // an imported file is untrusted: keep only known fields with sane values
    if (!b || typeof b.id !== "string" || !b.items || typeof b.items !== "object") return null;
    const items = {};
    for (const [k, it] of Object.entries(b.items)) {
      if (!it || !TYPES.includes(it.type)) continue;
      const c = { id: k, type: it.type, x: num(it.x, 0), y: num(it.y, 0), w: Math.max(140, Math.min(900, num(it.w, 240))), color: COLORS.includes(it.color) ? it.color : "",
        col: typeof it.col === "string" ? it.col : null, order: num(it.order, 0), text: str(it.text), title: str(it.title) };
      if (c.type === "todo") c.tasks = (Array.isArray(it.tasks) ? it.tasks : []).slice(0, 500).map((t) => ({ t: str(t && t.t), done: !!(t && t.done) }));
      if (c.type === "todo" && !c.tasks.length) c.tasks = [{ t: "", done: false }];
      if (c.type === "link") { c.url = safeUrl(str(it.url)); if (!c.url) continue; }
      if (c.type === "image") { c.blob = str(it.blob); c.ratio = Math.max(0.05, Math.min(20, num(it.ratio, 0.75))); }
      if (c.type === "board") { c.board = str(it.board); if (!c.board) continue; }
      items[k] = c;
    }
    for (const c of Object.values(items)) if (c.col && (c.type === "column" || items[c.col]?.type !== "column")) c.col = null;
    const arrows = (Array.isArray(b.arrows) ? b.arrows : []).filter((a) => a && items[a.from] && items[a.to]).map((a) => ({ id: str(a.id) || uid(), from: a.from, to: a.to }));
    const v = b.view || {};
    return { id: b.id.slice(0, 64), name: str(b.name).slice(0, 200), parent: typeof b.parent === "string" && b.parent !== b.id ? b.parent : null, items, arrows,
      view: { x: num(v.x, 40), y: num(v.y, 40), z: Math.max(0.15, Math.min(3, num(v.z, 1))) } };
  }
  impIn.addEventListener("change", async () => {
    const f = impIn.files[0]; impIn.value = ""; if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (d.app !== "hakolah-board" || !Array.isArray(d.boards)) throw 0;
      const boards = d.boards.map(cleanBoard);
      if (!boards.length || boards.some((b) => !b)) throw 0;
      for (const [id, url] of Object.entries(d.blobs || {})) { const bl = dataUrlBlob(url); if (bl) await putBlob(id, bl); }
      clearTimeout(saveT); clearTimeout(viewSaveT); B = null;   // the open board must not be saved over the imported copy
      for (const b of boards) await putBoard(b);
      say(T.impOk); await openBoard("home");
    } catch { say(T.impBad); }
  });

  // ── start ──
  window.addEventListener("pagehide", () => { if (B) putBoard(B).catch(() => {}); });
  window.addEventListener("resize", () => drawArrows());
  (async () => {
    db = await openDb();
    if (!db) say(T.noDb);
    else navigator.storage?.persist?.().catch(() => {});
    let home = await getBoard("home").catch(() => null);
    if (!home) { home = { id: "home", name: T.home, parent: null, items: {}, arrows: [], view: { x: 40, y: 40, z: 1 } }; await putBoard(home).catch(() => {}); }
    let last = "home"; try { last = localStorage.getItem("hk-board-last") || "home"; } catch { /* storage blocked */ }
    await openBoard(last).catch(() => {});
    if (!B) await openBoard("home");
    root.classList.add("is-ready");
  })();
})();
