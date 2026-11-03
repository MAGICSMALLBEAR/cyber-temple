// 載入畫面：開啟時立即顯示、3D 建好後淡出移除；程式下載失敗時顯示重新整理而不是空等
const { launch, newContext, waitFor } = require("./helpers");

module.exports = {
  name: "載入畫面",
  async run({ base, check }) {
    const browser = await launch();
    const ctx = await newContext(browser);
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", e => errs.push(e.message));

    // 讓 3D 函式庫晚 1.5 秒才到，才看得到載入中的狀態
    await p.route("**/libs/three.bundle.min.js", async route => {
      await new Promise(r => setTimeout(r, 1500));
      await route.continue();
    });
    await p.goto(base, { waitUntil: "commit" }).catch(() => {});
    const early = await waitFor(() => p.evaluate(() => {
      const el = document.getElementById("templeLoader");
      return el && !el.classList.contains("hide") && document.getElementById("templeLoaderTip").textContent.length > 5 ? el.textContent : null;
    }).catch(() => null), { timeout: 5000, interval: 100 });
    check("開啟時立即顯示載入畫面與參拜小提示", !!early && early.includes("賽博神殿"));
    const ready = await waitFor(() => p.evaluate(() => !!window.temple3d && !document.getElementById("templeLoader")), { timeout: 30000, interval: 200 });
    check("3D 建好後載入畫面淡出並移除", ready);
    const clickable = await p.evaluate(() => {
      const b = document.getElementById("btnLightIncense").getBoundingClientRect();
      return document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)?.closest("#btnLightIncense") !== null;
    });
    check("移除後下方按鈕可以點", clickable);
    check("沒有 JS 錯誤", errs.length === 0, errs.join(" | "));

    // 主控程式下載失敗：不能永遠停在載入中，要出現重新整理按鈕
    const ctx2 = await newContext(browser);
    const q = await ctx2.newPage();
    await q.route("**/app/core.js", route => route.abort());
    await q.goto(base, { waitUntil: "commit" }).catch(() => {});
    const failed = await waitFor(() => q.evaluate(() => {
      const btn = document.getElementById("templeLoaderRetry");
      return btn && !btn.hidden && document.getElementById("templeLoaderStatus").textContent.includes("發生問題");
    }).catch(() => false), { timeout: 30000, interval: 300 });
    check("主控程式載入失敗時顯示重新整理按鈕", failed);
    await browser.close();
  }
};
