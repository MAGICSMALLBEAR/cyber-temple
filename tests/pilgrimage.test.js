// 完整參拜流程：每一步按「前往」讓分身自己走過去（含進出大殿正門）、按這一步的動作，從請香走到化金紙；
// 需要在現場做的步驟不在現場不算；進度重新整理後保留；圓滿給功德
const { launch, newContext, waitFor } = require("./helpers");

module.exports = {
  name: "完整參拜流程",
  async run({ base, check, note }) {
    const browser = await launch();
    const ctx = await newContext(browser, { viewport: { width: 1400, height: 900 } });
    await ctx.addInitScript(() => localStorage.setItem("temple_onboarding", JSON.stringify({ step: 0, skipped: true })));
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", e => errs.push(e.message));
    p.on("dialog", d => d.dismiss().catch(() => {}));
    await p.goto(base);

    const info = () => p.evaluate(() => ({
      active: window.pilgrimage.data.active,
      step: window.pilgrimage.step && window.pilgrimage.step.id,
      label: document.getElementById("btnPilgrimPrimary").textContent,
      near: window.pilgrimage.isNear(),
      pos: [window.temple3d.avatar.position.x, window.temple3d.avatar.position.z]
    }));
    const closeModals = () => p.evaluate(() => document.querySelectorAll(".modal-overlay.open").forEach(m => m.classList.remove("open")));

    check("服務處已建在廟埕", await p.evaluate(() => !!window.temple3d.serviceDesk));
    let s = await info();
    check("未開始時指引卡顯示「開始參拜」", !s.active && s.label.includes("開始參拜"));

    // 不在現場上香不算
    await p.click("#btnPilgrimPrimary");
    check("開始後第一步是服務處請香", (await info()).step === "supplies");

    // 擲筊固定聖筊、搖籤立即完成，讓求籤這步不受隨機影響
    await p.evaluate(() => {
      const t = window.temple3d;
      t.tossBwa = cb => setTimeout(() => cb({ outcome1: 1, outcome2: 0 }), 30);
      t.shakeChiamBucket = cb => setTimeout(cb, 30);
    });

    // 依序走完八步，包含實際備料與收供。
    const order = ["supplies", "heaven", "main", "offer", "kneel", "chiam", "collect", "paper"];
    for (const id of order) {
      s = await info();
      if (s.step !== id) { check(`進入「${id}」這一步`, false, `目前是 ${s.step}`); break; }
      if (!s.near) {
        await p.click("#btnPilgrimPrimary");   // 前往
        const arrived = await waitFor(async () => (await info()).near && !(await p.evaluate(() => !!window.pilgrimage.route)), { timeout: 25000, interval: 300 });
        const now = await info();
        check(`按「前往」自動走到「${id}」的定點`, arrived, `停在 (${now.pos.map(v => v.toFixed(1)).join(", ")})`);
        if (!arrived) break;
      }
      // 第三步先驗證：走到神案前之前，在別處上香不算（已在現場就跳過這項）
      if (id === "main") {
        const label = (await info()).label;
        check("走到定點後按鈕變成這一步的動作", label.includes("上香"), label);
      }
      await p.click("#btnPilgrimPrimary");     // 做這一步
      if (id === "supplies") {
        if (await p.locator("#btnBuyOfferingSet").isEnabled()) await p.click("#btnBuyOfferingSet");
        await p.click("#btnPilgrimSuppliesReady");
      }
      if (id === "offer") {
        await p.waitForTimeout(300);
        await p.click("#btnPlaceOfferingSet");
        await p.click("#btnFeastPresent");
      }
      if (id === "collect") await p.click("#btnFeastCollect");
      if (id === "chiam") {
        await p.waitForTimeout(300);
        for (let k = 0; k < 4 && (await p.evaluate(() => window.chiamRitual.active)); k++) {
          if (await p.evaluate(() => window.chiamRitual.phase === "confirm" && window.pilgrimage.step?.id !== "chiam")) break;
          await p.click("#btnChiamRitualPrimary");
          await waitFor(() => p.evaluate(() => !window.chiamRitual.busy), { timeout: 5000 });
        }
        await waitFor(() => p.evaluate(() => document.getElementById("chiamModal").classList.contains("open")), { timeout: 5000 });
      }
      const advanced = await waitFor(async () => (await info()).step !== id, { timeout: 8000, interval: 200 });
      check(`完成「${id}」後進到下一步`, advanced, (await info()).step || "（已圓滿）");
      await closeModals();
      if (id === "heaven") {
        // 重新整理後進度保留
        await p.reload();
        await p.evaluate(() => {
          const t = window.temple3d;
          t.tossBwa = cb => setTimeout(() => cb({ outcome1: 1, outcome2: 0 }), 30);
          t.shakeChiamBucket = cb => setTimeout(cb, 30);
          t.avatar.position.set(0, 0, 9.6);   // 重新整理會回到出生點，這裡放回剛才的位置
        });
        check("重新整理後進度保留在第三步", (await info()).step === "main");
      }
    }
    s = await info();
    check("八步走完後參拜圓滿", !s.active && (await p.evaluate(() => window.pilgrimage.data.completed)) === 1);
    check("圓滿通知", (await p.$eval("#templeBroadcastNotice", e => e.textContent)).includes("完整參拜圓滿"));

    // 需要在現場的步驟：不在現場做不算
    await p.click("#btnPilgrimPrimary");
    await p.evaluate(() => { window.pilgrimage.data.step = 2; window.pilgrimage.render(); window.temple3d.avatar.position.set(10, 0, 30); });
    await p.evaluate(() => document.getElementById("btnLightIncense").click());
    await p.waitForTimeout(600);
    check("不在神案前上香不算完成「正殿上香」", (await info()).step === "main");
    await p.click("#btnPilgrimStop");
    check("按結束可中止參拜", !(await info()).active);

    await p.evaluate(() => {
      window.pilgrimage.start();
      window.temple3d.avatar.position.set(0, 0, 4);
      window.pilgrimage.primary();
      window.pilgrimage.stop();
    });
    check("結束導引也會取消自動行走", await p.evaluate(() => window.temple3d.avatar.targetPos === null && !window.pilgrimage.route));

    await p.evaluate(() => { window.pilgrimage.start(); window.pilgrimage.data.step = 4; window.temple3d.avatar.position.set(0, 0, 1.7); window.emitRitual("bow"); });
    check("一般鞠躬不能代替跪拜稟告", (await info()).step === "kneel");
    await p.evaluate(() => window.emitRitual("bow", { action: "kneel" }));
    check("跪拜才會完成稟告", (await info()).step === "chiam");
    await p.evaluate(() => window.emitRitual("chiamReceived"));
    check("快速求籤不能代替聖筊確認", (await info()).step === "chiam");

    // 服務處也可以按 [E] 領取
    await p.evaluate(() => { window.pilgrimage.start(); window.temple3d.avatar.position.set(-4.1, 0, 8.2); });
    await p.focus("body");
    await p.keyboard.press("KeyE");
    await p.waitForTimeout(300);
    check("在服務處按 [E] 開啟備料確認", (await info()).step === "supplies" && await p.locator("#btnPilgrimSuppliesReady").isVisible());
    await p.click("#btnPilgrimSuppliesReady");
    await p.evaluate(() => {
      const t = window.temple3d;
      // 從天公爐的另一側出發，直線路徑會撞上香爐。
      t.avatar.position.set(0, 0, 14);
      window.pilgrimage.goTo(window.pilgrimage.step);
    });
    check("前往會繞開天公爐，不會沿直線撞上", await waitFor(() => p.evaluate(() => !window.pilgrimage.route && window.pilgrimage.isNear()), { timeout: 20000 }));
    check("沒有 JS 錯誤", errs.length === 0, errs.join(" | "));
    await browser.close();
  }
};
