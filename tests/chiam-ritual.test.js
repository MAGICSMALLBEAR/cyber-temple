// 正統求籤儀式：擲筊請示 → 搖籤 → 擲筊確認；被拒要重來、被拒的籤不記錄、問題帶進 AI 解籤、不在途中觸發遶境
const { launch, newContext, waitFor } = require("./helpers");

// 把擲筊與搖籤換成立即回傳指定結果，逐一驗證每個分支
const STUB = () => {
  const t = window.temple3d;
  window.__bwaQueue = [];
  t.tossBwa = cb => {
    const r = window.__bwaQueue.shift() || "holy";
    const o = r === "holy" ? { outcome1: 1, outcome2: 0 } : r === "laugh" ? { outcome1: 0, outcome2: 0 } : { outcome1: 1, outcome2: 1 };
    setTimeout(() => cb(o), 30);
  };
  t.shakeChiamBucket = cb => setTimeout(cb, 30);
};

module.exports = {
  name: "正統求籤儀式",
  async run({ base, check }) {
    const browser = await launch();
    const ctx = await newContext(browser, { viewport: { width: 1400, height: 900 } });
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", e => errs.push(e.message));
    await p.goto(base);

    const ui = () => p.evaluate(() => ({
      visible: !document.getElementById("chiamRitualCard").hidden,
      phase: window.chiamRitual.phase,
      message: document.getElementById("chiamRitualMessage").textContent,
      primary: document.getElementById("btnChiamRitualPrimary").textContent,
      question: !document.getElementById("chiamRitualQuestionRow").hidden,
      modal: document.getElementById("chiamModal").classList.contains("open"),
      onboardingShown: getComputedStyle(document.getElementById("onboardingCard")).display !== "none" && !document.getElementById("onboardingCard").hidden,
      history: JSON.parse(localStorage.getItem("temple_chiam_history") || "[]")
    }));
    const press = async (id = "btnChiamRitualPrimary") => {
      await p.click("#" + id);
      await waitFor(() => p.evaluate(() => !window.chiamRitual.busy), { timeout: 8000 });
    };

    check("新玩家原本看得到引導卡", (await ui()).onboardingShown);
    await p.evaluate(STUB);
    await p.click("#btnShakeChiam");
    let u = await ui();
    check("按搖筒求籤打開儀式卡，第一步是請示", u.visible && u.phase === "ask" && u.question);
    check("儀式進行中先藏起引導卡", !u.onboardingShown);
    check("沒有直接出籤", !u.modal && u.history.length === 0);

    // 請示：先笑筊再聖筊
    await p.fill("#chiamRitualQuestion", "今年換工作順利嗎");
    await p.evaluate(() => { window.__bwaQueue = ["laugh", "holy", "yin", "holy"]; state.consecutiveHolyBwa = 2; });
    await press();
    u = await ui();
    check("請示得笑筊：停在請示並提示再擲", u.phase === "ask" && u.message.includes("笑筊") && u.primary.includes("再擲一次"), u.message);
    await press();
    u = await ui();
    check("請示得聖筊：進入搖籤", u.phase === "shake" && u.message.includes("聖筊"));
    check("儀式中的聖筊不會湊成三聖筊觸發遶境", !(await p.evaluate(() => window.temple3d.isParading)));

    // 搖籤 → 確認得陰筊 → 重抽
    await press();
    u = await ui();
    const firstDraw = await p.evaluate(() => window.chiamRitual.drawn && window.chiamRitual.drawn.id);
    check("搖籤後進入確認，訊息顯示抽到的籤號", u.phase === "confirm" && u.message.includes(`第 ${firstDraw} 籤`), u.message);
    await press();
    u = await ui();
    check("確認得陰筊：放回重抽", u.phase === "shake" && u.message.includes("不是這一支籤"), u.message);
    check("被拒的籤不記進求籤紀錄", u.history.length === 0);

    // 重抽 → 確認聖筊 → 展開籤詩
    await press();
    const finalDraw = await p.evaluate(() => window.chiamRitual.drawn.id);
    await press();
    check("確認得聖筊後展開籤詩", await waitFor(async () => (await ui()).modal, { timeout: 4000 }));
    u = await ui();
    check("儀式卡關閉、引導卡恢復", !u.visible && !(await p.evaluate(() => document.body.classList.contains("chiam-ritual-active"))));
    check("籤詩是確認過的那一支", (await p.$eval("#scrollTitle", e => e.textContent)).includes(`第 ${finalDraw} 籤`));
    check("求籤紀錄只多一筆，並記下所問的事", u.history.length === 1 && u.history[0].question === "今年換工作順利嗎", JSON.stringify(u.history[0] && u.history[0].question));
    check("問題已帶進 AI 解籤欄位", (await p.$eval("#aiQuestionInput", e => e.value)) === "今年換工作順利嗎");
    await p.keyboard.press("Escape");

    // 快速求籤與結束
    await p.click("#btnShakeChiam");
    await p.click("#btnChiamRitualQuick");
    check("快速求籤直接展開籤詩", await waitFor(async () => (await ui()).modal, { timeout: 4000 }));
    check("快速求籤也記錄一筆", (await ui()).history.length === 2);
    await p.keyboard.press("Escape");
    await p.click("#btnShakeChiam");
    await p.click("#btnChiamRitualClose");
    check("按 ✕ 結束求籤", !(await ui()).visible);
    check("沒有 JS 錯誤", errs.length === 0, errs.join(" | "));

    // 真實動畫（不替換），一直按到完成，確認流程接得起來
    const ctx2 = await newContext(browser, { viewport: { width: 1400, height: 900 } });
    const q = await ctx2.newPage();
    const errs2 = [];
    q.on("pageerror", e => errs2.push(e.message));
    await q.goto(base);
    await q.click("#btnShakeChiam");
    let opened = false;
    for (let i = 0; i < 40 && !opened; i++) {
      await q.click("#btnChiamRitualPrimary");
      await waitFor(() => q.evaluate(() => !window.chiamRitual.busy || document.getElementById("chiamModal").classList.contains("open")), { timeout: 10000 });
      opened = await waitFor(() => q.evaluate(() => document.getElementById("chiamModal").classList.contains("open")), { timeout: 1200, interval: 200 });
    }
    check("真實擲筊與搖籤動畫下能完成整個求籤", opened);
    check("真實流程沒有 JS 錯誤", errs2.length === 0, errs2.join(" | "));

    // 手機尺寸：儀式卡不擋搖桿與按鈕
    const ctx3 = await newContext(browser, { viewport: { width: 390, height: 700 }, hasTouch: true, isMobile: true });
    const m = await ctx3.newPage();
    await m.goto(base);
    await m.evaluate(() => document.getElementById("btnShakeChiam").click());
    const overlap = await m.evaluate(() => {
      const r = document.getElementById("chiamRitualCard").getBoundingClientRect();
      return [...document.querySelectorAll("#virtualJoystickZone, .temple-dock-container button, .avatar-action-bar button")].filter(b => {
        const q = b.getBoundingClientRect();
        return q.width && !(q.right <= r.left || q.left >= r.right || q.bottom <= r.top || q.top >= r.bottom);
      }).map(b => b.id || b.className);
    });
    check("手機尺寸：儀式卡不擋搖桿與按鈕", overlap.length === 0, overlap.join("、"));
    await browser.close();
  }
};
