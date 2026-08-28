---
name: run-hakolah
description: Build, run, and drive the hakolah Eleventy site. Use when asked to start hakolah, build it, check i18n parity, take a screenshot of its UI, or interact with the running site (search, filters, favorites, the "اختار لي" picker, etc.).
---

Eleventy static site (bilingual AR/EN Bahrain directory), served under the
`/hakolah/` base path and deployed to GitHub Pages. Drive it by starting the
dev server (`npm start`) then piping commands to
`.claude/skills/run-hakolah/driver.mjs`, a small Playwright-based REPL
(same command style as `chromium-cli`: `nav` / `wait-for` / `click` /
`screenshot` / ...). All paths below are relative to the repo root.

## Prerequisites

Node.js (this repo was built/run here with v24.18.0; `@11ty/eleventy ^3.0.0`
needs Node 18+). No OS packages needed on Windows — Playwright's bundled
Chromium runs standalone.

## Setup

```bash
npm install               # installs @11ty/eleventy, playwright, etc.
npx playwright install chromium   # one-time, ~115 MB download
```

`playwright` is already a devDependency (added for this skill) — `npm install`
alone is enough after a fresh clone; the browser binary still needs the
explicit `install chromium` once per machine.

## Build

```bash
npm run build       # eleventy build + i18n parity check + minify
npm run check:i18n  # eleventy build + i18n parity check only (no minify) — the fast one used while iterating
npm run lint         # eslint . — CI runs this too
```

**Do not run these while `npm start` (the dev server, below) is running** —
both write to `_site/` and race. See Gotchas.

## Run (agent path)

Start the dev server in the background and wait for it to actually serve
(don't just `sleep`):

```bash
npm start > /tmp/eleventy-serve.log 2>&1 &
disown
timeout 30 bash -c 'until curl -sf http://localhost:8080/hakolah/ >/dev/null 2>&1; do sleep 1; done'
```

Stop it later with:

```bash
lsof -ti:8080 -sTCP:LISTEN | xargs -r kill
```

Then drive it — pipe a script to the driver's stdin (it queues and runs
commands strictly in order):

```bash
node .claude/skills/run-hakolah/driver.mjs <<'EOF'
launch
nav http://localhost:8080/hakolah/
wait-for text=كل شيء مفيد
screenshot home
quit
EOF
```

Verified interactive flow (the "اختار لي" random-picker full-screen reveal —
the most JS-heavy feature on the site):

```bash
node .claude/skills/run-hakolah/driver.mjs <<'EOF'
launch
nav http://localhost:8080/hakolah/picker.html
wait-for .picker-category
click .picker-category
click #pickerSpinBtn
wait-for .picker-reveal-overlay
sleep 2500
screenshot picker-reveal
console --errors
quit
EOF
```

Screenshots land in `.claude/skills/run-hakolah/screenshots/`.

Driver commands:

| command | what it does |
|---|---|
| `launch` | opens headless Chromium |
| `nav <url>` | navigate |
| `wait-for <selector>` or `wait-for text=<text>` | wait up to 15s |
| `click <selector>` | CSS-selector click |
| `click-text <text>` | click first element containing text |
| `fill <selector> <value>` | fill an input |
| `press <key>` | keyboard press (e.g. `Enter`) |
| `eval <js-expr>` | `page.evaluate()`, prints JSON result |
| `screenshot [name]` | full-page PNG to `screenshots/` |
| `sleep <ms>` | pause — use before `screenshot` after a CSS-animated reveal |
| `console --errors` | print captured console/page errors this session |
| `quit` | close browser, exit |

## Run (human path)

```bash
npm start   # -> http://localhost:8080/hakolah/, Ctrl+C to stop
```

Same watch/live-reload server a human developer uses; useless headless.

## Test

No separate test suite. `npm run lint` and `npm run check:i18n` are what CI
(`.github/workflows/deploy.yml`) runs before every deploy — both must pass
clean (verified this session: `npm run lint` → no output/errors,
`npm run check:i18n` → "OK - النسختان متطابقتان بالكامل، ما فيه أي فرق").

---

## Gotchas

- **Everything is under `/hakolah/`, not `/`.** GitHub Pages project-site
  base path — `http://localhost:8080/` 404s; the real root is
  `http://localhost:8080/hakolah/`.
- **Never run `npm run build` / `npm run check:i18n` while `npm start` is
  running.** Both write `_site/` concurrently; hit this directly —
  `npm run build` crashed with `ENOENT ... _site\js\bootstrap.js` because
  the running dev server had just rewritten the directory mid-build. Kill
  the port first (see Run section), then build.
- **A CORS console error is expected, not a bug**, when driving against
  localhost: `Access to fetch at 'https://hakolah-push.hakolah.workers.dev/...'
  ... blocked by CORS policy`. The Worker only allows the production GitHub
  Pages origin; the like-count widget fails silently on localhost by design.
- **`.claude/skills/**` is excluded from `eslint.config.js`'s `ignores`.**
  The driver is plain Node.js (uses `console`/`process`/`setTimeout` with no
  browser globals) and would otherwise fail CI's `npm run lint` step with
  `no-undef` errors — hit this, fixed it by adding the ignore.
- **Reveal animations aren't instant.** The picker's full-screen reveal
  (`.picker-reveal-overlay`) appears in the DOM as soon as the button is
  clicked, but its info pieces fly in staggered over ~1.5–2s. `wait-for`
  only waits for the overlay element to exist — screenshot right after that
  catches it mid-animation (which is a legitimate proof-of-life shot, but
  add `sleep 2500` first if you want the settled end state).
- **Driver command ordering**: `readline`'s `line` event does not wait for
  an async handler before firing the next line — a naive per-line `async`
  handler runs all piped commands almost concurrently (hit this: `launch`
  printed *last*, everything else failed with `ERROR: launch first`). The
  driver serializes commands through a promise queue; keep that pattern if
  you add commands.

## Troubleshooting

- **`ENOENT: no such file or directory, open '...\_site\js\bootstrap.js'`
  during `npm run build`**: the dev server (`npm start`) was running at the
  same time. Stop it (`lsof -ti:8080 -sTCP:LISTEN | xargs -r kill`) and
  rebuild.
- **Driver prints `ERROR: launch first` for every command**: the queuing
  logic was bypassed/removed — commands must run through the `queue` promise
  chain in `driver.mjs`, not directly in the `line` event handler.
- **`chromium-cli: command not found`**: not installed in this environment;
  this skill's `driver.mjs` (Playwright directly) is the fallback and is
  what's documented above.
