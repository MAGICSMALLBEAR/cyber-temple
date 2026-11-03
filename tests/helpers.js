// tests/helpers.js - 測試共用工具：啟動本地伺服器、開瀏覽器、檢查與等待
const path = require("path");
const fs = require("fs");
const os = require("os");
const net = require("net");
const http = require("http");
const { spawn, execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");

// 優先用專案內安裝的 Playwright，沒有就找全域安裝
function loadPlaywright() {
  try {
    return require("playwright");
  } catch (e) {}
  try {
    const globalRoot = execSync("npm root -g", { encoding: "utf8" }).trim();
    return require(path.join(globalRoot, "playwright"));
  } catch (e) {
    throw new Error("找不到 Playwright。請先執行：npm i -g playwright（或在專案內 npm i -D playwright）");
  }
}
const { chromium } = loadPlaywright();

// 預設用電腦上的 Chrome；沒有 Chrome 可設 TEST_BROWSER_CHANNEL=msedge
const CHANNEL = process.env.TEST_BROWSER_CHANNEL || "chrome";
// 用軟體繪圖跑 WebGL，沒有顯示卡的環境也能測；幀率數字只能做相對比較
const LAUNCH_ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"];

// 記下開過的瀏覽器，測試中途失敗時由 run-all 統一關掉，避免殘留的瀏覽器繼續跑 3D、占用 CPU 又算進在線人數
const openBrowsers = new Set();

async function launch() {
  const browser = await chromium.launch({ channel: CHANNEL, headless: true, args: LAUNCH_ARGS });
  openBrowsers.add(browser);
  browser.on("disconnected", () => openBrowsers.delete(browser));
  browser.on("context", patchContext);
  return browser;
}

// 無痕模式不能安裝 PWA，測可安裝性要用一般設定檔
async function launchPersistent(profileDir, options = {}) {
  const ctx = await chromium.launchPersistentContext(profileDir, { channel: CHANNEL, headless: true, args: LAUNCH_ARGS, ...options });
  openBrowsers.add(ctx);
  ctx.on("close", () => openBrowsers.delete(ctx));
  patchContext(ctx);
  return ctx;
}

async function closeAll() {
  await Promise.all([...openBrowsers].map(b => b.close().catch(() => {})));
  openBrowsers.clear();
}

// 頁面的 load 事件要等 Google 字型下載完，網路慢時會逾時；
// 改成等 DOM 就緒＋3D 場景建好，跟網路速度無關
const APP_READY_TIMEOUT = 45000;
function patchPage(page) {
  if (page.__templePatched) return;
  page.__templePatched = true;
  const waitReady = () => page.waitForFunction(() => window.temple3d && window.liveTempleWall, null, { timeout: APP_READY_TIMEOUT }).catch(() => {});
  for (const method of ["goto", "reload"]) {
    const original = page[method].bind(page);
    page[method] = async (...args) => {
      const optIndex = method === "goto" ? 1 : 0;
      args[optIndex] = { waitUntil: "domcontentloaded", timeout: APP_READY_TIMEOUT, ...(args[optIndex] || {}) };
      const res = await original(...args);
      await waitReady();
      return res;
    };
  }
}

function patchContext(ctx) {
  ctx.pages().forEach(patchPage);
  ctx.on("page", patchPage);
}

// 每個新頁面都先標記「已看過操作導引」，避免導引彈窗擋住畫面
async function newContext(browser, options = {}) {
  const ctx = await browser.newContext(options);
  patchContext(ctx);
  await ctx.addInitScript(() => localStorage.setItem("temple_ui_help_seen", "1"));
  return ctx;
}

// 在 127.0.0.1 上確認埠號沒被占用：有些程式只聽 IPv4，若只在 IPv6 檢查，瀏覽器可能連到別人的程式而卡住。
// 只在 20000–40000 之間挑：系統隨機給的埠可能是 Chrome 封鎖的「不安全埠」（例如 6000），頁面會打不開。
function tryPort(port) {
  return new Promise(resolve => {
    const srv = net.createServer();
    srv.once("error", () => resolve(false));
    srv.listen(port, "127.0.0.1", () => srv.close(() => resolve(true)));
  });
}

async function freePort() {
  for (let i = 0; i < 50; i++) {
    const port = 20000 + Math.floor(Math.random() * 20000);
    if (await tryPort(port)) return port;
  }
  throw new Error("找不到可用的埠號");
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      res.resume();
      resolve(res.statusCode);
    }).on("error", reject);
  });
}

// 以專案自己的 server.js 啟動，回傳 { base, stop }；一律用 127.0.0.1，避免 localhost 在 IPv4／IPv6 間解析不一致
async function startServer() {
  const port = await freePort();
  const child = spawn(process.execPath, ["server.js"], { cwd: ROOT, env: { ...process.env, PORT: String(port) }, stdio: "ignore" });
  const base = `http://127.0.0.1:${port}/`;
  for (let i = 0; i < 50; i++) {
    try {
      if ((await httpGet(base)) === 200) return { base, port, stop: () => child.kill() };
    } catch (e) {}
    await sleep(100);
  }
  child.kill();
  throw new Error("server.js 啟動失敗");
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// 反覆檢查直到條件成立或逾時，回傳最後一次的值（給同步時間不固定的情況用，例如多人在線人數）
async function waitFor(fn, { timeout = 10000, interval = 250 } = {}) {
  const end = Date.now() + timeout;
  let last;
  while (Date.now() < end) {
    last = await fn();
    if (last) return last;
    await sleep(interval);
  }
  return last;
}

function makeTmpDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `temple-test-${label}-`));
}

// 每個測試檔各一個 Checker，記錄通過／失敗
class Checker {
  constructor() {
    this.passed = 0;
    this.failed = [];
  }
  check(name, ok, detail = "") {
    if (ok) {
      this.passed++;
      if (process.env.TEST_VERBOSE) console.log(`  PASS ${name}${detail ? "  → " + detail : ""}`);
    } else {
      this.failed.push(name);
      console.log(`  FAIL ${name}${detail ? "  → " + detail : ""}`);
    }
    return ok;
  }
  note(text) {
    console.log(`  ${text}`);
  }
}

module.exports = { ROOT, launch, launchPersistent, newContext, closeAll, startServer, freePort, waitFor, sleep, makeTmpDir, Checker };
