// 即時香火牆：兩個獨立瀏覽器模擬兩台裝置（只能經伺服器 SSE 互通），另開同瀏覽器分頁測去重
const { launch, newContext, waitFor } = require("./helpers");

module.exports = {
  name: "多人香火牆",
  async run({ base, check }) {
    const [bA, bB] = await Promise.all([launch(), launch()]);
    const ctxA = await newContext(bA), ctxB = await newContext(bB);
    const A = await ctxA.newPage(), B = await ctxB.newPage();
    const errs = [];
    for (const pg of [A, B]) pg.on("pageerror", e => errs.push(e.message));
    await A.goto(base);
    await B.goto(base);

    const text = (pg, id) => pg.$eval("#" + id, el => el.textContent.trim());
    const feed = pg => pg.$$eval("#liveWallFeed .wall-feed-item", els => els.map(e => e.textContent));
    // 分身心跳約 1.8 秒一次，在線人數要等幾秒才同步
    // 電腦忙碌時心跳會變慢，給足時間（實測整台電腦滿載時 12 秒不夠）
    const online = async (pg, n) => waitFor(async () => (await text(pg, "hudOnlineCount")) === String(n), { timeout: 25000 });

    check("今日香火從 0 起算（不是假數字）", (await text(A, "statTodayIncense")) === "0", await text(A, "statTodayIncense"));
    check("在線 2 人（自己＋另一台）", await online(A, 2), await text(A, "hudOnlineCount"));
    await A.click("#btnOpenLiveWall");
    check("香火牆面板可開啟", await A.$eval("#liveWallModal", m => m.classList.contains("open")));
    check("沒有祈願時顯示空狀態", (await A.$$("#liveWallFeed .wall-feed-empty")).length === 1);

    await B.evaluate(() => window.liveTempleWall.broadcastPrayer({ name: "乙善信", loc: "大殿", text: "跨裝置測試祈願" }));
    check("收到另一台的祈願", await waitFor(async () => (await feed(A)).some(t => t.includes("跨裝置測試祈願") && t.includes("乙善信"))));

    await B.evaluate(() => window.liveTempleWall.broadcastIncense("乙善信"));
    check("另一台點香，今日香火 +1", await waitFor(async () => (await text(A, "statTodayIncense")) === "1"));
    check("出現同行點香通知", await A.$eval("#templeBroadcastNotice", n => n.classList.contains("show") && n.textContent.includes("乙善信")));

    await B.evaluate(() => window.liveTempleWall.broadcastPrayer({ name: "<b>壞人</b>", loc: "x", text: '<img src=x onerror="window.__xss=1">' }));
    await waitFor(async () => (await feed(A)).some(t => t.includes("<img src=x")));
    check("別人送來的 HTML 不會被執行", !(await A.evaluate(() => window.__xss)));
    check("且以純文字顯示", (await feed(A)).some(t => t.includes("<img src=x")));

    // 同瀏覽器第二分頁：BroadcastChannel 與 SSE 都會送到，只能算一次
    const A2 = await ctxA.newPage();
    await A2.goto(base);
    check("在線 3 人", await online(A, 3), await text(A, "hudOnlineCount"));
    await A2.evaluate(() => window.liveTempleWall.broadcastPrayer({ name: "甲善信", loc: "分頁二", text: "去重測試" }));
    await waitFor(async () => (await feed(A)).some(t => t.includes("去重測試")));
    await A.waitForTimeout(800);
    check("同一則祈願只出現一次", (await feed(A)).filter(t => t.includes("去重測試")).length === 1);

    await A.bringToFront();
    await A.click("#liveWallModalClose", { timeout: 5000 });
    check("面板可關閉", !(await A.$eval("#liveWallModal", m => m.classList.contains("open"))));
    await A.click("#btnLightIncense");
    await A.waitForTimeout(600);
    await A.reload();
    await A.waitForTimeout(2000);
    check("自己今日點香重新整理後保留", (await text(A, "statTodayIncense")) === "1", await text(A, "statTodayIncense"));
    await A.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("temple_wall_today"));
      s.date = "2000-01-01";
      localStorage.setItem("temple_wall_today", JSON.stringify(s));
    });
    await A.reload();
    await A.waitForTimeout(2000);
    check("跨日後今日香火歸零", (await text(A, "statTodayIncense")) === "0");

    await A2.close();
    await bB.close();
    check("其他人離線後在線人數回到 1", await online(A, 1), await text(A, "hudOnlineCount"));
    check("沒有 JS 錯誤", errs.length === 0, errs.join(" | "));
    await bA.close();
  }
};
