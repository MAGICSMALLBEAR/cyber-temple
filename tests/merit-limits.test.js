// 功德上限與完成訊息：藏經閣每篇研讀一次、抄經要真的寫字且每日一次、禪修未滿一分鐘不計且每日上限 300、
// 每日上限跨日歸零；完成訊息不再用 alert()。不開瀏覽器，用 light-env 的 DOM 替身執行實際程式。
const fs = require("fs"), path = require("path");
const { makeEnvironment, ROOT } = require("./light-env");
module.exports = {
  name: "功德上限與完成訊息（無繪圖）",
  async run({ check }) {
    const THREE = await import("three"), env = makeEnvironment(THREE), c = env.context;
    let alerts = 0;
    c.alert = () => { alerts++; };
    for (const file of ["app/core.js", "app/lore.js", "app/zen.js", "app/sutra.js"]) env.load(file);
    // 只測功德規則：addMerit 改成單純累加，不牽動畫面其他部分
    // （app/core.js 有自己的 state，要在程式的範圍裡讀）
    env.run("state.meritCount = 0; addMerit = n => { state.meritCount += n; }; window.addMerit = addMerit;");
    const merit = () => env.run("state.meritCount");
    c.liveTempleWall.addDanmaku = () => {};

    // ---- 每日上限 ----
    check("每日上限內照給", c.claimDailyMerit("t", 100, 250) === 100 && c.claimDailyMerit("t", 100, 250) === 100);
    check("超過上限只給剩下的，滿了給 0", c.claimDailyMerit("t", 100, 250) === 50 && c.claimDailyMerit("t", 100, 250) === 0 && merit() === 250);
    env.setTime("2026-11-06T04:00:00Z");
    check("隔天上限歸零", c.claimDailyMerit("t", 100, 250) === 100);
    c.localStorage.setItem("temple_merit_daily", "{壞掉");
    check("存檔壞掉不會出錯，視為今天還沒領", c.claimDailyMerit("t", 10, 250) === 10);

    // ---- 藏經閣：每篇一次 ----
    c.bindLoreEvents();
    const study = env.nodes.get("btnLoreStudy");
    let before = merit();
    c.showDeityLoreDetail("mazu"); study.click();
    check("第一次研讀 +20", merit() === before + 20);
    check("研讀後按鈕顯示已研讀並停用", study.disabled && study.textContent.includes("已研讀"));
    study.disabled = false; study.click();
    check("同一篇再按不加功德（就算按鈕被改回可按）", merit() === before + 20);
    c.showDeityLoreDetail("guanyin");
    check("換一篇可以再研讀", !study.disabled);
    study.click();
    check("不同篇各算一次", merit() === before + 40);
    c.showDeityLoreDetail("mazu");
    check("回到讀過的篇章仍是已研讀", study.disabled);

    // ---- 抄經：沒寫字不能落款；每日只給一次 ----
    c.drawSutraCanvas("heart");
    before = merit();
    c.completeSutraCopying();
    check("空白宣紙按完成不給功德", merit() === before && c.lastNotice.includes("抄寫"));
    env.run("sutraInkMoves = SUTRA_MIN_INK_MOVES;");
    c.completeSutraCopying();
    check("寫過字落款 +150", merit() === before + 150 && c.lastNotice.includes("+150"));
    c.completeSutraCopying();
    check("同一張不能重複落款", merit() === before + 150 && c.lastNotice.includes("已經落款"));
    c.drawSutraCanvas("heart"); env.run("sutraInkMoves = SUTRA_MIN_INK_MOVES;");
    c.completeSutraCopying();
    check("當天第二張照樣蓋印但不加功德", merit() === before + 150 && c.lastNotice.includes("已領"));

    // ---- 禪修：未滿一分鐘不計；每日上限 300 ----
    const sit = seconds => { env.run(`isZenRunning = true; zenElapsedSeconds = ${seconds};`); c.stopZenMeditation(false); };
    before = merit();
    sit(20);
    check("靜坐 20 秒不給功德", merit() === before && c.lastNotice.includes("未滿一分鐘"));
    sit(4 * 60 + 30);
    check("靜坐 4 分半給 4 分鐘 ×30", merit() === before + 120);
    sit(20 * 60);
    check("當天禪修功德最多 300", merit() === before + 300 && c.lastNotice.includes("+180"));
    sit(5 * 60);
    check("滿額後再坐不加功德並說明", merit() === before + 300 && c.lastNotice.includes("已滿"));

    check("以上流程沒有跳出 alert", alerts === 0);
    const sources = ["app/lore.js", "app/zen.js", "app/sutra.js", "beads.js", "save-data.js", "app/feast.js"].map(f => fs.readFileSync(path.join(ROOT, f), "utf8"));
    check("完成訊息的程式不再呼叫 alert()", sources.every(s => !/\balert\(/.test(s)));
  }
};
