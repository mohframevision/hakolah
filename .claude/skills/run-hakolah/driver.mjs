// REPL driver for the hakolah Eleventy site. Drives a headless Chromium
// (Playwright) against the local dev server (`npm start`, port 8080).
// Designed for agents: pipe commands to stdin, one per line.
//
// Requires the `playwright` npm package + its chromium browser binary —
// see SKILL.md "Prerequisites" for the one-time install.
import { chromium } from "playwright";
import * as readline from "node:readline";
import * as fs from "node:fs";
import * as path from "node:path";

const SHOT_DIR = process.env.SCREENSHOT_DIR || path.resolve(import.meta.dirname, "screenshots");
fs.mkdirSync(SHOT_DIR, { recursive: true });

let browser = null;
let page = null;
const consoleErrors = [];

const COMMANDS = {
  async launch() {
    if (browser) return console.log("already launched");
    browser = await chromium.launch({ args: ["--no-sandbox"] });
    page = await (await browser.newContext()).newPage();
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(String(err)));
    console.log("launched");
  },

  async nav(url) {
    if (!page) return console.log("ERROR: launch first");
    await page.goto(url, { waitUntil: "domcontentloaded" });
    console.log("nav ->", url);
  },

  async "wait-for"(selectorOrText) {
    if (!page) return console.log("ERROR: launch first");
    // "text=..." matches by visible text (like chromium-cli); otherwise
    // treated as a CSS selector.
    if (selectorOrText.startsWith("text=")) {
      await page.getByText(selectorOrText.slice(5)).first().waitFor({ timeout: 15_000 });
    } else {
      await page.waitForSelector(selectorOrText, { timeout: 15_000 });
    }
    console.log("wait-for OK:", selectorOrText);
  },

  async click(selector) {
    if (!page) return console.log("ERROR: launch first");
    await page.click(selector);
    console.log("click OK:", selector);
  },

  async "click-text"(text) {
    if (!page) return console.log("ERROR: launch first");
    await page.getByText(text).first().click();
    console.log("click-text OK:", text);
  },

  async fill(args) {
    if (!page) return console.log("ERROR: launch first");
    const sp = args.indexOf(" ");
    const selector = args.slice(0, sp);
    const value = args.slice(sp + 1);
    await page.fill(selector, value);
    console.log("fill OK:", selector);
  },

  async press(key) {
    if (!page) return console.log("ERROR: launch first");
    await page.keyboard.press(key);
    console.log("press OK:", key);
  },

  async eval(expr) {
    if (!page) return console.log("ERROR: launch first");
    const result = await page.evaluate(expr);
    console.log("eval ->", JSON.stringify(result));
  },

  async viewport(size) {
    if (!page) return console.log("ERROR: launch first");
    const [w, h] = size.split("x").map(Number);
    await page.setViewportSize({ width: w, height: h || 800 });
    console.log("viewport ->", w, "x", h || 800);
  },

  async screenshot(name) {
    if (!page) return console.log("ERROR: launch first");
    const file = path.join(SHOT_DIR, (name || `ss-${Date.now()}`) + ".png");
    await page.screenshot({ path: file });
    console.log("screenshot:", file);
  },

  async "console"(mode) {
    if (mode === "--errors") {
      console.log(consoleErrors.length ? consoleErrors.join("\n") : "(no console errors)");
    } else {
      console.log(consoleErrors.length, "error(s) captured this session");
    }
  },

  async sleep(ms) {
    await new Promise((r) => setTimeout(r, Number(ms) || 1000));
    console.log("slept", ms || 1000, "ms");
  },

  async quit() {
    if (browser) await browser.close();
    console.log("bye");
    process.exit(0);
  },
};

// كل سطر لازم يُنفَّذ بعد ما يخلص اللي قبله بالكامل (launch قبل nav، nav قبل
// screenshot...) — معالج "line" نفسه async، وreadline ما ينتظره قبل يطلق
// السطر التالي، فبدون طابور (queue) هذا كل الأسطر تنطلق شبه متزامنة
let queue = Promise.resolve();
const rl = readline.createInterface({ input: process.stdin });
rl.on("line", (line) => {
  queue = queue.then(async () => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const sp = trimmed.indexOf(" ");
    const cmd = sp === -1 ? trimmed : trimmed.slice(0, sp);
    const arg = sp === -1 ? "" : trimmed.slice(sp + 1);
    const fn = COMMANDS[cmd];
    if (!fn) {
      console.log("unknown command:", cmd);
      return;
    }
    try {
      await fn(arg);
    } catch (err) {
      console.log("ERROR:", err.message);
    }
  });
});
rl.on("close", async () => {
  await queue;
  if (browser) await browser.close();
  process.exit(0);
});
