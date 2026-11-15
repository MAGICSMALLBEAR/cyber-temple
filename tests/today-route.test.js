// 今日香火路線：老玩家看到今日卡、按出發自動走向最近一站、完成功課後換下一站、全部完成顯示圓滿、
// 今天關閉後不再出現、新手引導進行中不顯示、每日修行彈窗的「前往」、地圖標出今日地點、不蓋住按鈕
const { launch, newContext, waitFor } = require("./helpers");

module.exports = {
  name: "今日香火路線",
  async run({ base, check }) {
    const browser = await launch();
    const ctx = await newContext(browser, { viewport: { width: 1400, height: 900 } });
    await ctx.addInitScript(() => {
      if (!localStorage.getItem("temple_merit")) localStorage.setItem("temple_merit", "500");
      localStorage.setItem("temple_ui_help_seen", "1");
    });
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", e => errs.push(e.message));
    await p.goto(base);
    const card = () => p.evaluate(() => ({
      visible: !document.getElementById("todayCard").hidden,
      date: document.getElementById("todayCardDate").textContent,
      title: document.getElementById("todayCardTitle").textContent,
      hint: document.getElementById("todayCardHint").textContent,
      go: getComputedStyle(document.getElementById("btnTodayGo")).display !== "none" ? document.getElementById("btnTodayGo").textContent : null
    }));

    let c = await card();
    check("老玩家看到今日卡，含日期與農曆", c.visible && /今日香火 · \d+\/\d+/.test(c.date) && c.date.includes("農曆"), c.date);
    const info = await p.evaluate(() => {
      const t = window.todayRoute, next = t.next();
      return { total: window.dailyPractice.tasks.length, pending: t.pending().length, next: next.text, place: t.stopOf(next).place };
    });
    check("今日卡顯示下一站與進度", c.title.includes(info.next) && c.hint.includes(`已完成 0 / ${info.total}`), `${c.title} | ${c.hint}`);
    check("出發按鈕可見", c.go === "🚶 出發", c.go);

    const overlap = await p.evaluate(() => {
      const r = document.getElementById("todayCard").getBoundingClientRect();
      return [...document.querySelectorAll(".temple-dock-container button, .avatar-action-bar button, #visitTools button")].filter(b => {
        const q = b.getBoundingClientRect();
        return q.width && !(q.right <= r.left || q.left >= r.right || q.bottom <= r.top || q.top >= r.bottom);
      }).map(b => b.id || b.textContent.trim());
    });
    check("今日卡沒有蓋住底部按鈕與右側工具", overlap.length === 0, overlap.join("、"));

    // 由近到遠：第一站是離目前位置最近的地點
    const nearestOk = await p.evaluate(() => {
      const t = window.todayRoute, a = window.temple3d.avatar.position;
      const dist = task => { const pl = t.placeOf(t.stopOf(task).place); return pl ? Math.hypot(pl.center[0] - a.x, pl.center[1] - a.z) : 999; };
      const list = t.pending(), first = t.next();
      return list.every(task => dist(first) <= dist(task) + 1e-6);
    });
    check("第一站是最近的地點", nearestOk);

    // 出發：已在該地點就直接提示怎麼做，否則自動尋路
    await p.click("#btnTodayGo");
    const started = await p.evaluate(() => {
      const t = window.todayRoute, task = t.next(), place = t.stopOf(task).place;
      const route = window.pilgrimage.route;
      return { active: t.data.active, place, routeTo: route?.step?.id || null, nearby: window.templeVisit.nearby()?.id || null, notice: document.getElementById("dockStatusBar").textContent };
    });
    check("按出發後路線進行中，並走向第一站（或已在該處）",
      started.active && (started.routeTo === started.place || started.nearby === started.place || started.place === null), JSON.stringify(started));
    check("出發時提示到了要做什麼", /前往|就在|今日功課/.test(started.notice), started.notice);

    // 依序完成每一項：每完成一項，卡片換成下一站
    const types = await p.evaluate(() => window.todayRoute.ordered().map(t => ({ id: t.id, type: t.type, goal: t.goal, deity: t.deity || null })));
    let advanced = true;
    for (let i = 0; i < types.length; i++) {
      const t = types[i];
      await p.evaluate(({ type, goal, deity }) => window.emitRitual(type, { amount: goal, ...(deity ? { deity } : {}) }), t);
      const left = await p.evaluate(() => window.todayRoute.pending().length);
      if (left !== types.length - i - 1) advanced = false;
      if (left) {
        const title = (await card()).title, next = await p.evaluate(() => window.todayRoute.next().text);
        if (!title.includes(next)) advanced = false;
      }
    }
    check("每完成一項，卡片換成下一站", advanced);
    c = await card();
    check("全部完成顯示今日圓滿與本月天數，出發按鈕收起", c.title.includes("今日功課圓滿") && /本月已圓滿 \d+ 天/.test(c.hint) && c.go === null, `${c.title} | ${c.hint} | ${c.go}`);
    check("全部完成後路線結束", (await p.evaluate(() => window.todayRoute.data.active)) === false);

    // 關閉今天的卡，重新整理仍關閉
    await p.click("#btnTodayClose");
    check("按 ✕ 後今日卡消失", (await card()).visible === false);
    await p.reload();
    check("同一天重新整理不再出現", (await card()).visible === false);
    // 隔天會再出現
    await p.evaluate(() => { const d = JSON.parse(localStorage.getItem("temple_today_route")); d.date = "2000-01-01"; localStorage.setItem("temple_today_route", JSON.stringify(d)); });
    await p.reload();
    check("換日後今日卡重新出現", (await card()).visible === true);

    // 每日修行彈窗：未完成的功課都有「前往」；依路線出發會關閉彈窗
    const p2ctx = await newContext(browser, { viewport: { width: 1400, height: 900 } });
    await p2ctx.addInitScript(() => { localStorage.setItem("temple_merit", "500"); localStorage.setItem("temple_ui_help_seen", "1"); });
    const q = await p2ctx.newPage();
    await q.goto(base);
    await q.click("#btnOpenDaily");
    const rows = await q.evaluate(() => ({ go: document.querySelectorAll("#dailyTaskList .daily-task-go").length, pending: window.todayRoute.pending().length }));
    check("每日修行彈窗：每項未完成功課都有前往", rows.go === rows.pending && rows.go > 0, JSON.stringify(rows));
    await q.click("#btnDailyRoute");
    check("依路線出發後彈窗關閉、路線開始", await q.evaluate(() => !document.getElementById("dailyModal").classList.contains("open") && window.todayRoute.data.active));

    // 地圖：今日功課的地點有標記
    await q.evaluate(() => window.pilgrimage.cancelRoute());
    await q.evaluate(() => window.templeVisit.openMap());
    const marked = await q.evaluate(() => {
      const want = new Set(window.todayRoute.pending().map(t => window.todayRoute.stopOf(t).place).filter(Boolean));
      const got = document.querySelectorAll("#visitMapSvg .map-marker.today").length;
      return { want: want.size, got };
    });
    check("地圖標出今日功課的地點", marked.got === marked.want, JSON.stringify(marked));

    // 新手引導進行中不顯示今日卡；略過引導後出現
    const ctx3 = await newContext(browser, { viewport: { width: 1400, height: 900 } });
    const n = await ctx3.newPage();
    await n.goto(base);
    check("新手引導進行中不顯示今日卡", await n.evaluate(() => !document.getElementById("onboardingCard").hidden && document.getElementById("todayCard").hidden));
    await n.click("#btnOnboardingSkip");
    check("略過新手引導後接著顯示今日卡", await waitFor(() => n.evaluate(() => !document.getElementById("todayCard").hidden), { timeout: 3000 }));

    // 手機：不蓋住搖桿與底部按鈕
    const ctxPhone = await newContext(browser, { viewport: { width: 390, height: 700 }, hasTouch: true, isMobile: true });
    await ctxPhone.addInitScript(() => { localStorage.setItem("temple_merit", "500"); localStorage.setItem("temple_ui_help_seen", "1"); });
    const ph = await ctxPhone.newPage();
    await ph.goto(base);
    const phoneOverlap = await ph.evaluate(() => {
      const r = document.getElementById("todayCard").getBoundingClientRect();
      if (!r.width) return ["今日卡沒有顯示"];
      return [...document.querySelectorAll("#virtualJoystickZone, .temple-dock-container button, .avatar-action-bar button, #visitTools button")].filter(b => {
        const q = b.getBoundingClientRect();
        return q.width && !(q.right <= r.left || q.left >= r.right || q.bottom <= r.top || q.top >= r.bottom);
      }).map(b => b.id || b.className);
    });
    check("手機尺寸：今日卡沒有蓋住搖桿與按鈕", phoneOverlap.length === 0, phoneOverlap.join("、"));

    check("沒有 JS 錯誤", errs.length === 0, errs.join(" | "));
    await browser.close();
  }
};
