// 快速求籤預設與跪拜稟告：走過正統求籤後預設快速、節慶與參拜步驟仍正統；
// 神案前跪拜跳出稟告卡、連三聖筊允杯、笑筊／陰筊停下、紀錄只存本機、關閉後不再自動跳出、廟埕跪拜不跳出
const { launch, newContext, waitFor } = require("./helpers");

module.exports = {
  name: "快速求籤與跪拜稟告",
  async run({ base, check }) {
    const browser = await launch();
    const ctx = await newContext(browser, { viewport: { width: 1400, height: 900 } });
    await ctx.addInitScript(() => { if (!localStorage.getItem("temple_merit")) localStorage.setItem("temple_merit", "500"); localStorage.setItem("temple_ui_help_seen", "1"); });
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", e => errs.push(e.message));
    const requests = [];
    p.on("request", r => { if (r.method() === "POST") requests.push(r.url()); });
    await p.goto(base);

    // 擲筊結果改成照順序回傳，避免隨機
    const rig = seq => p.evaluate(list => {
      window.__bwaSeq = list.slice();
      window.performBwaToss = cb => { const r = window.__bwaSeq.shift() || "holy"; setTimeout(() => cb(r), 20); return true; };
    }, seq);

    // ---------- 快速求籤預設 ----------
    const ritual = () => p.evaluate(() => {
      const card = document.getElementById("chiamRitualCard");
      return { shown: !card.hidden, quickFirst: card.classList.contains("quick-first"), primary: document.getElementById("btnChiamRitualPrimary").textContent };
    });
    await p.evaluate(() => window.chiamRitual.start());
    let r = await ritual();
    check("第一次求籤：正統流程為主", r.shown && !r.quickFirst && r.primary.includes("擲筊請示"), JSON.stringify(r));
    // 走完正統三步（請示聖筊 → 搖籤 → 確認聖筊）
    await rig(["holy", "holy"]);
    await p.click("#btnChiamRitualPrimary");
    await waitFor(() => p.evaluate(() => window.chiamRitual.phase === "shake" && !window.chiamRitual.busy), { timeout: 4000 });
    await p.click("#btnChiamRitualPrimary");
    await waitFor(() => p.evaluate(() => window.chiamRitual.phase === "confirm" && !window.chiamRitual.busy), { timeout: 8000 });
    await p.click("#btnChiamRitualPrimary");
    check("正統求籤完成後記下一次", await waitFor(() => p.evaluate(() => localStorage.getItem("temple_chiam_orthodox") === "1"), { timeout: 4000 }));
    await waitFor(() => p.evaluate(() => document.getElementById("chiamModal").classList.contains("open")), { timeout: 4000 });
    await p.keyboard.press("Escape");

    await p.evaluate(() => window.chiamRitual.start());
    r = await ritual();
    check("走過正統求籤後：快速求籤排第一", r.quickFirst && r.primary.includes("正統求籤"), JSON.stringify(r));
    const order = await p.evaluate(() => {
      const q = document.getElementById("btnChiamRitualQuick").getBoundingClientRect(), o = document.getElementById("btnChiamRitualPrimary").getBoundingClientRect();
      return q.left < o.left;
    });
    check("快速求籤按鈕在左邊（第一個）", order);
    await p.fill("#chiamRitualQuestion", "工作順利嗎");
    await p.click("#btnChiamRitualQuick");
    check("快速求籤直接展開籤詩，問題帶進 AI 解籤", await waitFor(() => p.evaluate(() => document.getElementById("chiamModal").classList.contains("open") && document.getElementById("aiQuestionInput").value === "工作順利嗎"), { timeout: 8000 }));
    await p.keyboard.press("Escape");

    await p.evaluate(() => { Object.defineProperty(window.dailyPractice, "festival", { configurable: true, get: () => ({ name: "測試節慶", minor: false }) }); window.chiamRitual.start(); });
    r = await ritual();
    check("節慶當天：仍以正統流程為主", !r.quickFirst && r.primary.includes("擲筊請示"), JSON.stringify(r));
    await p.evaluate(() => { delete window.dailyPractice.festival; window.chiamRitual.close(); });

    // ---------- 跪拜稟告 ----------
    const card = () => p.evaluate(() => ({
      shown: !document.getElementById("petitionCard").hidden,
      form: !document.getElementById("petitionForm").hidden,
      msg: document.getElementById("petitionMessage").textContent,
      btn: document.getElementById("btnPetitionToss").textContent,
      holy: document.querySelectorAll("#petitionDots .done").length,
      todayHidden: getComputedStyle(document.getElementById("todayCard")).display === "none"
    }));
    const kneelAt = (x, z) => p.evaluate(([x, z]) => { const a = window.temple3d.avatar; a.position.set(x, 0, z); a.targetPos = null; document.getElementById("btnActionKneel").click(); }, [x, z]);

    await kneelAt(0, 20);
    check("在廟埕跪拜不跳出稟告卡", !(await card()).shown);
    await kneelAt(0, 1.7);
    let c = await card();
    check("神案前跪拜跳出稟告卡，可填稱呼、所求、請示", c.shown && c.form && (await p.evaluate(() => document.querySelectorAll("#petitionTopics button").length)) === 8, JSON.stringify(c));
    check("稟告時今日卡讓位", c.todayHidden);
    check("稱呼預設帶入分身稱號", (await p.$eval("#petitionName", e => e.value)) === (await p.evaluate(() => state.avatarConfig.title)));

    await p.fill("#petitionName", "弟子測試");
    await p.click('#petitionTopics button[data-topic="事業"]');
    await p.fill("#petitionQuestion", "這次轉職是否順利");
    await rig(["holy", "holy", "holy"]);
    await p.click("#btnPetitionToss");
    await waitFor(async () => (await card()).holy === 1 && (await card()).btn.includes("再擲"), { timeout: 3000 });
    c = await card();
    check("第一筊聖筊：表單收起，提示再擲（連三聖筊為允杯）", !c.form && c.msg.includes("聖筊") && c.btn.includes("再擲一筊"), JSON.stringify(c));
    await p.click("#btnPetitionToss");
    await waitFor(async () => (await card()).holy === 2, { timeout: 3000 });
    await p.click("#btnPetitionToss");
    await waitFor(async () => (await card()).msg.includes("允杯"), { timeout: 3000 });
    c = await card();
    check("連得三聖筊：允杯，按鈕變重新稟告", c.msg.includes("允杯") && c.holy === 3 && c.btn.includes("重新稟告"), JSON.stringify(c));
    const saved = await p.evaluate(() => JSON.parse(localStorage.getItem("temple_petitions") || "[]")[0]);
    check("稟告紀錄存在本機（神尊、所求、請示、結果）", saved && saved.topic === "事業" && saved.question === "這次轉職是否順利" && saved.outcome === "allowed" && saved.holy === 3, JSON.stringify(saved));

    // 重新稟告 → 笑筊停下
    await p.click("#btnPetitionToss");
    check("重新稟告回到表單", (await card()).form);
    await rig(["laugh"]);
    await p.click("#btnPetitionToss");
    await waitFor(async () => (await card()).msg.includes("笑筊"), { timeout: 3000 });
    c = await card();
    check("笑筊：神明笑而不答，停下", c.msg.includes("笑而不答") && c.btn.includes("重新稟告"), c.msg);
    // 聖筊後陰筊：第二筊停下
    await p.click("#btnPetitionToss");
    await rig(["holy", "yin"]);
    await p.click("#btnPetitionToss");
    await waitFor(async () => (await card()).holy === 1, { timeout: 3000 });
    await p.click("#btnPetitionToss");
    await waitFor(async () => (await card()).msg.includes("陰筊"), { timeout: 3000 });
    check("聖筊後陰筊：第 2 筊神明不允，停下", (await card()).msg.includes("第 2 筊：陰筊"));
    check("稟告內容沒有送到任何伺服器", !requests.some(u => !u.includes("/api/broadcast")), requests.join(" | "));

    // ✕ 關閉後這次不再自動跳出
    await p.click("#btnPetitionClose");
    await kneelAt(0, 1.7);
    check("按 ✕ 關閉後，再跪拜不會自動跳出", !(await card()).shown);
    check("關閉後今日卡回來", await p.evaluate(() => getComputedStyle(document.getElementById("todayCard")).display !== "none"));

    // 求籤開始時收起稟告卡
    await p.evaluate(() => window.templePetition.show());
    await p.evaluate(() => window.chiamRitual.start());
    check("開始求籤時收起稟告卡", !(await card()).shown && !(await p.evaluate(() => document.body.classList.contains("petition-active"))));
    await p.evaluate(() => window.chiamRitual.close());

    check("沒有 JS 錯誤", errs.length === 0, errs.join(" | "));
    await browser.close();
  }
};
