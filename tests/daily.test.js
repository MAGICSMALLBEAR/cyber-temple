// 每日修行：簽到、功課通報、獎勵、連續簽到、節慶加倍
const { launch, newContext } = require("./helpers");

module.exports = {
  name: "每日修行",
  async run({ base, check }) {
    const browser = await launch();
    const ctx = await newContext(browser);
    await ctx.addInitScript(() => {
      window.__rituals = [];
      window.addEventListener("temple:ritual", e => window.__rituals.push(e.detail.type));
    });
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", e => errs.push(e.message));
    await p.goto(base);
    await p.waitForTimeout(2500);
    const merit = () => p.evaluate(() => parseInt(localStorage.getItem("temple_merit") || "0", 10));
    const today = await p.evaluate(() => window.dailyPractice.festival);
    const mult = today && !today.minor ? 2 : 1;

    // --- 簽到 ---
    check(`首次開啟自動簽到 +${25 * mult}`, (await merit()) === 25 * mult, String(await merit()));
    check("簽到通知出現", await p.$eval("#templeBroadcastNotice", n => n.textContent.includes("每日簽到")));
    await p.reload();
    await p.waitForTimeout(1500);
    check("同一天重新整理不會重複簽到", (await merit()) === 25 * mult, String(await merit()));

    // --- 面板 ---
    await p.click("#btnOpenDaily");
    check("面板開啟", await p.$eval("#dailyModal", m => m.classList.contains("open")));
    const dateLabel = await p.$eval("#dailyDateLabel", e => e.textContent);
    check("日期含農曆", /農曆(閏)?[正二三四五六七八九十冬臘]月/.test(dateLabel), dateLabel);
    check("顯示今日功課", (await p.$$("#dailyTaskList .daily-task")).length >= 3);
    await p.click("#dailyModalClose");

    // --- 每個科儀都會通報（從真正的按鈕觸發）---
    await p.evaluate(() => { window.__rituals = []; });
    const clickWait = async (sel, ms = 600) => {
      await p.evaluate(s => document.querySelector(s).click(), sel);
      await p.waitForTimeout(ms);
    };
    const closeModals = () => p.evaluate(() => document.querySelectorAll(".modal-overlay.open").forEach(m => m.classList.remove("open")));
    await clickWait("#btnLightIncense");
    await clickWait("#btnThrowBwa", 3500);
    await clickWait("#btnShakeChiam", 3500);
    await closeModals();
    await clickWait("#btnKnockMuyu");
    await clickWait("#btnSubmitLantern");
    await clickWait("#btnTossCoin", 2500);
    await clickWait("#btnBurnPaper", 2500);
    await clickWait("#btnStrikeBell", 2500);
    await clickWait("#btnBeatDrum", 2500);
    await p.evaluate(() => window.beadsSystem.advanceBead());
    await closeModals();
    await p.focus("body");
    await p.keyboard.press("KeyB");
    await p.waitForTimeout(300);
    const fired = await p.evaluate(() => [...new Set(window.__rituals)]);
    for (const t of ["incense", "bwa", "chiam", "muyu", "lantern", "coin", "paper", "bell", "drum", "bead", "bow"]) {
      check(`科儀通報：${t}`, fired.includes(t));
    }

    // --- 不該算的 ---
    await p.evaluate(() => { window.__rituals = []; });
    await p.evaluate(() => document.getElementById("btnAutoMuyuToggle").click());
    await p.waitForTimeout(2000);
    await p.evaluate(() => document.getElementById("btnAutoMuyuToggle").click());
    check("掛機自動木魚不計入功課", (await p.evaluate(() => window.__rituals.length)) === 0, JSON.stringify(await p.evaluate(() => window.__rituals)));
    await clickWait("#btnStrikeBell", 2500);
    check("撞鐘附帶的鞠躬動畫不算行禮", !(await p.evaluate(() => window.__rituals.includes("bow"))));

    // --- 完成功課給功德、不重複給 ---
    const tasks = await p.evaluate(() => window.dailyPractice.tasks.map(t => ({ id: t.id, type: t.type, goal: t.goal, deity: t.deity })));
    const before = await merit();
    for (const t of tasks) await p.evaluate(t => window.emitRitual(t.type, { amount: t.goal, deity: t.deity }), t);
    await p.waitForTimeout(500);
    const doneIds = await p.evaluate(() => window.dailyPractice.data.done);
    check("今日功課全部完成", tasks.every(t => doneIds.includes(t.id)), JSON.stringify(doneIds));
    check("完成後功德增加", (await merit()) > before);
    check("全部完成後按鈕紅點消失", await p.$eval("#dailyPendingDot", d => d.hidden));
    const again = await merit();
    for (const t of tasks) await p.evaluate(t => window.emitRitual(t.type, { amount: t.goal, deity: t.deity }), t);
    check("完成後再做不會重複給", (await merit()) === again);

    // --- 連續簽到 ---
    const setLast = daysAgo => p.evaluate(n => {
      const d = new Date();
      d.setDate(d.getDate() - n);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const s = JSON.parse(localStorage.getItem("temple_daily"));
      s.date = k;
      s.checkIn.last = k;
      localStorage.setItem("temple_daily", JSON.stringify(s));
    }, daysAgo);
    await setLast(1);
    await p.reload();
    await p.waitForTimeout(1500);
    check("昨天有簽 → 連續 2 天", (await p.evaluate(() => window.dailyPractice.data.checkIn.streak)) === 2);
    check("換日後功課重置", (await p.evaluate(() => window.dailyPractice.data.done.length)) === 0);
    await setLast(3);
    await p.reload();
    await p.waitForTimeout(1500);
    check("中斷兩天 → 連續歸 1", (await p.evaluate(() => window.dailyPractice.data.checkIn.streak)) === 1);
    check("最長連續保留 2", (await p.evaluate(() => window.dailyPractice.data.checkIn.best)) === 2);
    check("沒有 JS 錯誤", errs.length === 0, errs.join(" | "));
    await browser.close();

    // --- 節慶日：時鐘固定在 2026/5/9 媽祖聖誕 ---
    const b2 = await launch();
    const c2 = await newContext(b2);
    await c2.clock.setFixedTime(new Date(2026, 4, 9, 10, 0, 0));
    const q = await c2.newPage();
    await q.goto(base);
    await q.waitForTimeout(2500);
    check("媽祖聖誕簽到加倍 +50", (await q.evaluate(() => localStorage.getItem("temple_merit"))) === "50");
    await q.click("#btnOpenDaily");
    check("顯示節慶橫幅", await q.$eval("#dailyFestivalName", e => e.textContent.includes("媽祖聖誕") && e.textContent.includes("加倍")));
    check("多一項節慶功課（共 4 項）", (await q.$$("#dailyTaskList .daily-task.festival")).length === 1 && (await q.$$("#dailyTaskList .daily-task")).length === 4);
    await q.evaluate(() => window.emitRitual("incense", { deity: "wenchang" }));
    check("在其他神尊前點香不算節慶功課", !(await q.evaluate(() => window.dailyPractice.data.done.includes("festival"))));
    await q.evaluate(() => window.emitRitual("incense", { deity: "mazu" }));
    check("在媽祖前點香完成節慶功課", await q.evaluate(() => window.dailyPractice.data.done.includes("festival")));
    await b2.close();

    // --- 節氣日：2026/12/22 冬至 ---
    const b3 = await launch();
    const c3 = await newContext(b3);
    await c3.clock.setFixedTime(new Date(2026, 11, 22, 10, 0, 0));
    const w = await c3.newPage();
    await w.goto(base);
    await w.click("#btnOpenDaily");
    check("冬至當天面板顯示今日節氣", (await w.$eval("#dailySolarTerm", e => e.textContent)).includes("今日節氣：冬至"), await w.$eval("#dailySolarTerm", e => e.textContent));
    check("冬至當天多一項節氣功課", await w.evaluate(() => window.dailyPractice.tasks.some(t => t.id === "solarTerm")));
    await w.click("#dailyModalClose");
    await w.evaluate(() => document.getElementById("btnSubmitLantern").click());
    await w.waitForTimeout(600);
    check("點燈完成節氣功課", await w.evaluate(() => window.dailyPractice.data.done.includes("solarTerm")));
    await b3.close();

    // --- 非節氣日：面板顯示下一個節氣 ---
    const b4 = await launch();
    const c4 = await newContext(b4);
    await c4.clock.setFixedTime(new Date(2026, 11, 10, 10, 0, 0));
    const v = await c4.newPage();
    await v.goto(base);
    await v.click("#btnOpenDaily");
    check("12/10 顯示下一個節氣是 12/22 冬至", (await v.$eval("#dailySolarTerm", e => e.textContent)).includes("下一個節氣：冬至（12/22"), await v.$eval("#dailySolarTerm", e => e.textContent));
    await b4.close();
  }
};
