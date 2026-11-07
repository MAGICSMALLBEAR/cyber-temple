// 功德存檔：匯出內容、不含 API Key、取消／確認匯入、壞檔拒絕
const fs = require("fs");
const path = require("path");
const { launch, newContext, makeTmpDir } = require("./helpers");

module.exports = {
  name: "功德存檔匯出／匯入",
  async run({ base, check }) {
    const dir = makeTmpDir("save");
    const browser = await launch();
    const ctx = await newContext(browser, { acceptDownloads: true });
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", e => errs.push(e.message));
    let dialogAction = "accept", lastDialog = "";
    p.on("dialog", d => { lastDialog = d.message(); dialogAction === "accept" ? d.accept() : d.dismiss(); });
    await p.goto(base);
    await p.waitForTimeout(2500);

    await p.evaluate(() => {
      window.addMerit(1234);
      localStorage.setItem("temple_beads_loops", "7");
      localStorage.setItem("temple_avatar_cfg", JSON.stringify({ title: "存檔測試善信", roleType: "novice", robeColor: "#c24b2b", hatType: "headband", holdingItem: "incense" }));
      localStorage.setItem("temple_gemini_key", "AIzaSy-SECRET-KEY-123456");
      localStorage.setItem("unrelated_key", "x");
    });
    const meritBefore = await p.evaluate(() => localStorage.getItem("temple_merit"));

    await p.click("#btnOpenPassport");
    check("護照顯示尚未備份提示", (await p.$eval("#saveDataStatus", e => e.textContent)).includes("建議定期匯出"));
    const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#btnSaveExport")]);
    const file = path.join(dir, dl.suggestedFilename());
    await dl.saveAs(file);
    check("下載檔名", /^賽博神殿_功德存檔_\d{8}\.json$/.test(dl.suggestedFilename()), dl.suggestedFilename());
    const saved = JSON.parse(fs.readFileSync(file, "utf8"));
    check("存檔含功德", saved.data.temple_merit === meritBefore && saved.merit === parseInt(meritBefore, 10));
    check("存檔不含 API Key", !JSON.stringify(saved).includes("SECRET"));
    check("存檔不含非神殿資料", !("unrelated_key" in saved.data));
    check("匯出後顯示上次匯出日期", (await p.$eval("#saveDataStatus", e => e.textContent)).includes("上次匯出"));

    // 模擬換電腦：清空進度但保留 API Key
    await p.evaluate(() => {
      const keep = localStorage.getItem("temple_gemini_key");
      localStorage.clear();
      localStorage.setItem("temple_gemini_key", keep);
      localStorage.setItem("temple_ui_help_seen", "1");
    });
    await p.reload();
    await p.waitForTimeout(2000);
    const fresh = await p.evaluate(() => localStorage.getItem("temple_merit"));

    dialogAction = "dismiss";
    lastDialog = "";
    await p.setInputFiles("#saveImportInput", file);
    // 電腦忙碌時讀檔較慢，等對話框真的出現，不用固定秒數
    for (let i = 0; i < 100 && !lastDialog; i++) await p.waitForTimeout(100);
    check("確認視窗顯示存檔功德", lastDialog.includes(parseInt(meritBefore, 10).toLocaleString()));
    check("取消後進度不變", (await p.evaluate(() => localStorage.getItem("temple_merit"))) === fresh);

    dialogAction = "accept";
    // 匯入後頁面會自動重新整理
    await Promise.all([p.waitForEvent("domcontentloaded"), p.setInputFiles("#saveImportInput", file)]);
    await p.waitForFunction(() => window.temple3d, null, { timeout: 45000 });
    await p.waitForTimeout(1000);
    const st = await p.evaluate(() => ({
      merit: localStorage.getItem("temple_merit"),
      loops: localStorage.getItem("temple_beads_loops"),
      title: JSON.parse(localStorage.getItem("temple_avatar_cfg")).title,
      key: localStorage.getItem("temple_gemini_key"),
      hud: document.getElementById("meritCounter").textContent
    }));
    check("匯入後功德還原", st.merit === meritBefore, st.merit);
    check("匯入後畫面功德一致", st.hud.replace(/,/g, "") === meritBefore, st.hud);
    check("匯入後念珠輪數還原", st.loops === "7");
    check("匯入後分身稱號還原", st.title === "存檔測試善信");
    check("本機 API Key 保留未被覆蓋", st.key === "AIzaSy-SECRET-KEY-123456");
    await p.click("#btnOpenPassport");
    check("護照念珠輪數顯示 7", (await p.$eval("#statBeadLoops", e => e.textContent)) === "7");

    const bad = [
      ["bad1.json", "{not json", "無法解析"],
      ["bad2.json", JSON.stringify({ app: "other-app", data: { temple_merit: "999999" } }), "不是賽博神殿"],
      ["bad3.json", JSON.stringify({ app: "cyber-temple-3d", format: 99, data: { temple_merit: "1" } }), "較新的版本"]
    ];
    for (const [name, content, expect] of bad) {
      const f = path.join(dir, name);
      fs.writeFileSync(f, content);
      lastDialog = "";
      await p.setInputFiles("#saveImportInput", f);
      await p.waitForTimeout(600);
      check(`錯誤檔案被拒：${expect}`, lastDialog.includes(expect), lastDialog);
    }
    check("錯誤檔案沒有改動進度", (await p.evaluate(() => localStorage.getItem("temple_merit"))) === meritBefore);
    check("沒有 JS 錯誤", errs.length === 0, errs.join(" | "));
    await browser.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
};
