// 靜態空間部署：用 tools/build-site.js 產生網站，放在子路徑（模擬 GitHub Pages 的 /repo/）以沒有 API 的靜態伺服器開啟
// 要能正常運作：不建立 SSE、不送廣播、香火牆說明目前沒有伺服器，且公開的檔案不含測試與伺服器程式
const fs = require("fs");
const path = require("path");
const http = require("http");
const { execFileSync } = require("child_process");
const { ROOT, launch, newContext, makeTmpDir, freePort } = require("./helpers");

const PREFIX = "/virtual-temple/";
const MIME = { ".html": "text/html; charset=UTF-8", ".js": "application/javascript; charset=UTF-8", ".css": "text/css; charset=UTF-8", ".png": "image/png", ".webmanifest": "application/manifest+json" };

async function serveStatic(dir) {
  const port = await freePort();   // 避開 Chrome 封鎖的不安全埠
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (!url.startsWith(PREFIX)) { res.writeHead(404); res.end("not found"); return; }
      let rel = url.slice(PREFIX.length) || "index.html";
      const file = path.join(dir, rel);
      if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end("not found"); return; }
      res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(port, "127.0.0.1", () => resolve({ base: `http://127.0.0.1:${port}${PREFIX}`, stop: () => srv.close() }));
  });
}

module.exports = {
  name: "靜態空間部署",
  async run({ check }) {
    const dir = makeTmpDir("site");
    execFileSync(process.execPath, [path.join(ROOT, "tools/build-site.js"), dir]);
    const has = f => fs.existsSync(path.join(dir, f));
    check("網站包含首頁、Three.js、離線快取", has("index.html") && has("libs/three.bundle.min.js") && has("sw.js") && has("manifest.webmanifest"));
    check("網站不含伺服器程式、測試、工具與文件", !has("server.js") && !has("tests") && !has("tools") && !has("WORKLOG.md") && !has("package.json"));

    const site = await serveStatic(dir);
    const browser = await launch();
    const ctx = await newContext(browser);
    const p = await ctx.newPage();
    const errs = [], requests = [];
    p.on("pageerror", e => errs.push(e.message));
    p.on("request", r => requests.push(new URL(r.url()).pathname));
    p.on("response", r => { if (r.status() >= 400 && !r.url().endsWith("/api/ping")) errs.push(`HTTP ${r.status()} ${r.url()}`); });
    await p.goto(site.base);
    await p.waitForTimeout(1500);

    check("子路徑下 3D 場景正常啟動", await p.evaluate(() => !!window.temple3d));
    check("偵測到沒有伺服器", (await p.evaluate(() => window.templeServer.available)) === false);
    check("沒有建立 SSE 即時連線", !requests.some(r => r.endsWith("/api/events")));
    await p.evaluate(() => window.liveTempleWall.broadcastPrayer({ name: "單機", loc: "大殿", text: "靜態空間測試" }));
    await p.evaluate(() => window.temple3d.avatar.broadcastMyState(true));
    await p.waitForTimeout(500);
    check("單機模式不送廣播", !requests.some(r => r.endsWith("/api/broadcast")));
    // 單機模式收起多人介面：在線人數、房間分流、同行對話、同行供席
    const solo = await p.evaluate(() => {
      const shown = id => { const el = document.getElementById(id); return !!el && getComputedStyle(el).display !== "none"; };
      const t = window.temple3d;
      return {
        mode: document.documentElement.classList.contains("solo-mode"),
        pill: shown("hudOnlineCount"), room: shown("btnOpenRoomPavilion"), speech: shown("speechForm"), online: getComputedStyle(document.getElementById("statOnlineCount").parentElement).display !== "none",
        tables: t.peerTablesGroup.visible, clickable: t.interactiveObjects.some(o => o.userData.type === "peerAltarTable"),
        blocked: t.peerTableSlots.some(s => t.isBlockedAt(s.pos[0], s.pos[2], 0.05))
      };
    });
    check("單機模式標記在頁面上", solo.mode);
    check("單機模式不顯示在線人數、房間分流、同行對話", !solo.pill && !solo.room && !solo.speech && !solo.online, JSON.stringify(solo));
    check("單機模式收起同行供席（看不到、點不到、不擋路）", !solo.tables && !solo.clickable && !solo.blocked, JSON.stringify(solo));
    await p.click("#btnOpenLiveWall");
    check("香火牆說明目前沒有連線伺服器", (await p.$eval("#wallConnectionNote", e => e.textContent)).includes("目前沒有連線伺服器"));
    check("祈願仍出現在本機香火牆", (await p.$$eval("#liveWallFeed .wall-feed-item", els => els.map(e => e.textContent))).some(t => t.includes("靜態空間測試")));
    const sw = await p.evaluate(async () => { const r = await navigator.serviceWorker.ready; return r.scope; });
    check("Service Worker 範圍是子路徑", sw.endsWith(PREFIX), sw);
    // 新版本提示：sw.js 換版接管時（controllerchange）跳出；這裡直接呼叫顯示函式檢查外觀與按鈕
    await p.evaluate(() => window.showTempleUpdateBanner());
    const banner = await p.evaluate(() => {
      const b = document.getElementById("pwaUpdateBanner");
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return { visible: r.width > 0 && r.bottom <= innerHeight, z: Number(getComputedStyle(b).zIndex), buttons: [...b.querySelectorAll("button")].map(x => x.textContent) };
    });
    check("新版本提示顯示在畫面內、高於彈窗，有重新整理與稍後", !!banner && banner.visible && banner.z > 1000 && banner.buttons.join() === "重新整理,稍後", JSON.stringify(banner));
    await p.click("#pwaUpdateBanner .pwa-update-later");
    check("按稍後關閉提示", (await p.$("#pwaUpdateBanner")) === null);
    check("沒有 JS 錯誤或檔案載入失敗（/api/ping 的 404 是預期的）", errs.length === 0, errs.slice(0, 3).join(" | "));

    await browser.close();
    site.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  }
};
