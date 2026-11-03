// 新手引導：新玩家依序完成四步、順序錯不前進、完成給功德、略過、老玩家不顯示、不擋按鈕
const { launch, newContext, waitFor } = require("./helpers");

module.exports = {
  name: "新手引導任務",
  async run({ base, check }) {
    const browser = await launch();

    // --- 新玩家走完全程 ---
    const ctx = await newContext(browser, { viewport: { width: 1400, height: 900 } });
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", e => errs.push(e.message));
    await p.goto(base);
    const card = () => p.evaluate(() => {
      const c = document.getElementById("onboardingCard");
      return { visible: !c.hidden, progress: document.getElementById("onboardingProgress").textContent, title: document.getElementById("onboardingTitle").textContent };
    });
    const target = () => p.evaluate(() => [...document.querySelectorAll(".onboarding-target")].map(e => e.id));

    let c = await card();
    check("新玩家看到引導卡第 1 步", c.visible && c.progress.includes("1 / 4"), `${c.progress} ${c.title}`);
    check("點燃清香按鈕發光提示", JSON.stringify(await target()) === '["btnLightIncense"]');

    // 引導卡不能蓋住底部按鈕列與左下動作列
    const overlap = await p.evaluate(() => {
      const r = document.getElementById("onboardingCard").getBoundingClientRect();
      return [...document.querySelectorAll(".temple-dock-container button, .avatar-action-bar button")].filter(b => {
        const q = b.getBoundingClientRect();
        return q.width && !(q.right <= r.left || q.left >= r.right || q.bottom <= r.top || q.top >= r.bottom);
      }).map(b => b.id || b.textContent.trim());
    });
    check("引導卡沒有蓋住底部按鈕", overlap.length === 0, overlap.join("、"));

    const meritStart = await p.evaluate(() => parseInt(localStorage.getItem("temple_merit"), 10));
    await p.evaluate(() => document.getElementById("btnThrowBwa").click());
    await p.waitForTimeout(3500);
    check("順序不對（先擲筊）不會前進", (await card()).progress.includes("1 / 4"));

    await p.evaluate(() => document.getElementById("btnLightIncense").click());
    check("點香後到第 2 步", await waitFor(async () => (await card()).progress.includes("2 / 4"), { timeout: 4000 }));
    await p.evaluate(() => document.getElementById("btnThrowBwa").click());
    check("擲筊後到第 3 步", await waitFor(async () => (await card()).progress.includes("3 / 4"), { timeout: 6000 }));
    await p.evaluate(() => document.getElementById("btnShakeChiam").click());
    check("求籤後到第 4 步，籤詩卷打開", await waitFor(async () => (await card()).progress.includes("4 / 4") && await p.evaluate(() => document.getElementById("chiamModal").classList.contains("open")), { timeout: 8000 }));
    check("第 4 步沒有要發光的按鈕", (await target()).length === 0);

    const beforeClose = await p.evaluate(() => parseInt(localStorage.getItem("temple_merit"), 10));
    await p.keyboard.press("Escape");   // 用 Esc 關閉也要算數
    await p.waitForTimeout(500);
    c = await card();
    check("關閉籤詩後引導完成、卡片消失", !c.visible);
    const after = await p.evaluate(() => parseInt(localStorage.getItem("temple_merit"), 10));
    check("完成引導功德 +88", after - beforeClose === 88, `${beforeClose} → ${after}（開始時 ${meritStart}）`);
    await p.reload();
    check("完成後重新整理不再出現", !(await card()).visible);
    check("沒有 JS 錯誤", errs.length === 0, errs.join(" | "));

    // --- 略過 ---
    const ctx2 = await newContext(browser);
    const q = await ctx2.newPage();
    await q.goto(base);
    await q.click("#btnOnboardingSkip");
    check("按略過後卡片消失", await q.evaluate(() => document.getElementById("onboardingCard").hidden));
    check("略過後按鈕不再發光", (await q.evaluate(() => document.querySelectorAll(".onboarding-target").length)) === 0);
    await q.reload();
    check("略過後重新整理不再出現", await q.evaluate(() => document.getElementById("onboardingCard").hidden));

    // --- 手機尺寸：引導卡不能蓋住虛擬搖桿與底部按鈕 ---
    const ctxPhone = await newContext(browser, { viewport: { width: 390, height: 700 }, hasTouch: true, isMobile: true });
    const ph = await ctxPhone.newPage();
    await ph.goto(base);
    const phoneOverlap = await ph.evaluate(() => {
      const r = document.getElementById("onboardingCard").getBoundingClientRect();
      return [...document.querySelectorAll("#virtualJoystickZone, .temple-dock-container button, .avatar-action-bar button")].filter(b => {
        const q = b.getBoundingClientRect();
        return q.width && !(q.right <= r.left || q.left >= r.right || q.bottom <= r.top || q.top >= r.bottom);
      }).map(b => b.id || b.className);
    });
    check("手機尺寸：引導卡沒有蓋住搖桿與按鈕", phoneOverlap.length === 0, phoneOverlap.join("、"));

    // --- 老玩家（已有功德）不顯示 ---
    const ctx3 = await newContext(browser);
    await ctx3.addInitScript(() => { if (!localStorage.getItem("temple_merit")) localStorage.setItem("temple_merit", "500"); });
    const o = await ctx3.newPage();
    await o.goto(base);
    check("老玩家不顯示引導卡", await o.evaluate(() => document.getElementById("onboardingCard").hidden));
    check("老玩家不寫入引導紀錄", (await o.evaluate(() => localStorage.getItem("temple_onboarding"))) === null);

    await browser.close();
  }
};
