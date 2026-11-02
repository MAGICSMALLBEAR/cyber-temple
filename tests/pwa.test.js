// PWA：manifest、可安裝、Service Worker、預存清單完整、斷網可開、字型離線可用
const fs = require("fs");
const path = require("path");
const { ROOT, launchPersistent, makeTmpDir } = require("./helpers");

module.exports = {
  name: "PWA 安裝與離線",
  async run({ base, check }) {
    // sw.js 預存清單要涵蓋 index.html 載入的每一支本地 script
    const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
    const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
    const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]).filter(s => !/^https?:/.test(s));
    const missing = scripts.filter(s => !sw.includes(`"${s}"`));
    check("sw.js 預存清單包含所有 script", missing.length === 0, missing.join("、"));
    const absent = [...sw.matchAll(/^\s+"([^"]+\.(?:js|css|png|webmanifest|html))",$/gm)].map(m => m[1]).filter(f => !fs.existsSync(path.join(ROOT, f)));
    check("預存清單裡的檔案都存在", absent.length === 0, absent.join("、"));

    const profile = makeTmpDir("pwa");
    const ctx = await launchPersistent(profile);
    await ctx.addInitScript(() => localStorage.setItem("temple_ui_help_seen", "1"));
    const p = ctx.pages()[0] || await ctx.newPage();
    const errs = [];
    p.on("pageerror", e => errs.push(e.message));
    await p.goto(base);
    await p.waitForTimeout(2500);

    const cdp = await ctx.newCDPSession(p);
    const manifest = await cdp.send("Page.getAppManifest");
    check("manifest 無解析錯誤", manifest.errors.length === 0, JSON.stringify(manifest.errors));
    const inst = await cdp.send("Page.getInstallabilityErrors");
    check("Chrome 判定可安裝", inst.installabilityErrors.length === 0, JSON.stringify(inst.installabilityErrors));
    // ready 在「啟用中」就會回傳，要再等它真的變成「已啟用」
    const swState = await p.evaluate(async () => {
      const sw = (await navigator.serviceWorker.ready).active;
      if (sw.state !== "activated") {
        await new Promise(r => {
          sw.addEventListener("statechange", () => sw.state === "activated" && r());
          setTimeout(r, 10000);
        });
      }
      return sw.state;
    });
    check("Service Worker 已啟用", swState === "activated", swState);

    // 第二次開啟時頁面已受 SW 控制，字型才會進快取
    await p.reload();
    await p.waitForTimeout(2500);
    const fonts = await p.evaluate(async () => (await caches.open("temple-fonts")).keys().then(k => k.length));
    check("第二次開啟後字型已快取", fonts > 0, `${fonts} 個檔案`);

    await ctx.setOffline(true);
    await p.reload();
    await p.waitForTimeout(2500);
    check("斷網時頁面能開", (await p.title()).includes("虛擬神殿"));
    check("斷網時 3D 場景啟動", await p.evaluate(() => !!(window.temple3d && window.THREE)));
    const notoLoaded = await p.evaluate(async () => {
      await document.fonts.ready;
      return [...document.fonts].some(f => f.family.includes("Noto Serif TC") && f.status === "loaded");
    });
    check("斷網時 Noto Serif TC 字型真的載入", notoLoaded);
    const sub = await ctx.newPage();
    await sub.goto(base + "some/deep/link").catch(() => {});
    check("斷網開不存在的網址回到神殿首頁", (await sub.title()).includes("虛擬神殿"));
    await ctx.setOffline(false);
    check("沒有 JS 錯誤", errs.length === 0, errs.join(" | "));
    await ctx.close();
    fs.rmSync(profile, { recursive: true, force: true });
  }
};
