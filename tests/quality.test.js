// 畫質分級：各等級的實際設定、手動選擇保留、自動降級、低畫質關掉動態光源
const { launch, newContext, waitFor } = require("./helpers");

module.exports = {
  name: "畫質分級",
  async run({ base, check, note }) {
    const browser = await launch();
    const ctx = await newContext(browser, { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", e => errs.push(e.message));
    await p.goto(base);
    await p.waitForTimeout(2500);

    const snap = () => p.evaluate(() => {
      const t = window.temple3d, r = t.renderer;
      let lights = 0, visible = 0;
      t.scene.traverse(o => { if (o.isPointLight) { lights++; if (o.visible) visible++; } });
      return {
        mode: templeQuality.mode, level: templeQuality.level, pr: r.getPixelRatio(), shadows: r.shadowMap.enabled,
        soft: t.sunMoonLight.shadow.radius > 1, sun: t.sunMoonLight.shadow.mapSize.width,
        stars: t.starPoints.geometry.drawRange.count, dust: t.dustPoints.geometry.drawRange.count,
        weather: t.weatherPoints ? t.weatherPoints.geometry.drawRange.count : null, lights, visible,
        aa: r.getContext().getContextAttributes().antialias
      };
    });
    const fps = async () => {
      await p.evaluate(() => { window.__f = 0; const t = () => { window.__f++; requestAnimationFrame(t); }; requestAnimationFrame(t); });
      await p.waitForTimeout(3000);
      return Math.round((await p.evaluate(() => window.__f)) / 3);
    };

    // 測試環境是軟體繪圖，自動模式應選「低」
    let s = await snap();
    check("軟體繪圖環境下自動選「低」", s.mode === "auto" && s.level === "low", `${s.mode}/${s.level}`);
    check("低：抗鋸齒關、解析度 1×、無陰影", !s.aa && s.pr === 1 && !s.shadows);
    check("低：點光源只留神像主光", s.visible === 1, `${s.visible}/${s.lights}`);
    check("低：星空粒子 35%", s.stars === Math.floor(1200 * 0.35), String(s.stars));
    const fpsLow = await fps();

    await p.evaluate(() => document.getElementById("btnOpenSettings").click());
    check("設定面板的自動選項顯示目前等級", (await p.$eval('#selectQuality option[value="auto"]', o => o.textContent)) === "自動（目前：低）");
    await p.selectOption("#selectQuality", "high");
    await p.waitForTimeout(1000);
    s = await snap();
    check("高：2× 解析度、柔和陰影、2048 貼圖", s.pr === 2 && s.shadows && s.soft && s.sun === 2048);
    check("高：點光源全開", s.visible === s.lights, `${s.visible}/${s.lights}`);
    check("高：粒子 100%", s.stars === 1200 && s.dust === 260);
    check("提示抗鋸齒下次開啟生效", (await p.$eval("#qualityNote", e => e.textContent)).includes("下次開啟"));
    await p.evaluate(() => document.querySelectorAll(".modal-overlay.open").forEach(m => m.classList.remove("open")));
    const fpsHigh = await fps();

    await p.evaluate(() => window.temple3d.setWeather("rain"));
    await p.waitForTimeout(300);
    check("高：下雨 900 顆全畫", (await snap()).weather === 900);
    await p.evaluate(() => templeQuality.setMode("medium"));
    await p.waitForTimeout(500);
    s = await snap();
    check("中：1.5× 解析度、一般陰影、1024 貼圖、雨 60%", s.pr === 1.5 && s.shadows && !s.soft && s.sun === 1024 && s.weather === 540);

    await p.reload();
    await p.waitForTimeout(2000);
    s = await snap();
    check("重新整理後保留手動選擇「中」", s.mode === "medium" && s.level === "medium" && s.aa);

    // 自動模式但硬塞「高」：軟體繪圖跑不動，應自動降級
    await p.evaluate(() => {
      templeQuality.setMode("auto");
      templeQuality.level = "high";
      templeQuality.scene.applyQuality(templeQuality.preset);
    });
    const lowered = await waitFor(() => p.evaluate(() => templeQuality.level !== "high"), { timeout: 25000, interval: 1000 });
    check("自動模式幀率不足時自動降級", lowered, await p.evaluate(() => templeQuality.level));
    check("降級時有通知", (await p.$eval("#templeBroadcastNotice", e => e.textContent)).includes("自動把畫質調為"));

    await p.evaluate(() => { templeQuality.setMode("low"); window.temple3d.burnJossPaper(); });
    await p.waitForTimeout(2500);
    check("低：化金紙新增的火光也會被關掉", (await snap()).visible === 1);

    check("沒有 JS 錯誤", errs.length === 0, errs.join(" | "));
    note(`幀率（軟體繪圖，只能相對比較）：低 ${fpsLow} / 高 ${fpsHigh}`);
    await browser.close();
  }
};
