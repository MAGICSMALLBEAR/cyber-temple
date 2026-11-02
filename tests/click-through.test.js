// 全面點擊：依序打開萬寶閣每張卡片，點遍新開視窗內的按鈕，不能出現任何 JS 錯誤或載入失敗
const { launch, newContext } = require("./helpers");

module.exports = {
  name: "萬寶閣全面點擊",
  async run({ base, check, note }) {
    const browser = await launch();
    const ctx = await newContext(browser, { viewport: { width: 1400, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    let where = "載入";
    page.on("pageerror", e => errors.push(`[${where}] ${e.message.split("\n")[0]}`));
    page.on("console", m => { if (m.type() === "error") errors.push(`[${where}] console: ${m.text().slice(0, 160)}`); });
    page.on("response", r => { if (r.status() >= 400) errors.push(`[${where}] HTTP ${r.status()} ${r.url()}`); });
    page.on("dialog", d => d.dismiss().catch(() => {}));

    await page.goto(base);
    await page.waitForTimeout(2500);
    check("3D 場景已建立（window.temple3d）", await page.evaluate(() => !!window.temple3d));

    const cards = await page.$$eval(".pavilion-card", cs => cs.map((c, i) => ({ i, title: c.querySelector(".card-title")?.textContent })));
    check("萬寶閣至少 27 張卡片", cards.length >= 27, String(cards.length));

    for (const card of cards) {
      where = card.title;
      await page.evaluate(() => document.querySelectorAll(".modal-overlay.open").forEach(m => m.classList.remove("open")));
      await page.evaluate(i => document.querySelectorAll(".pavilion-card")[i].click(), card.i);
      await page.waitForTimeout(400);
      // 點遍目前開啟視窗內的按鈕（下載、匯出、存檔會跳出檔案視窗，略過）
      const ids = await page.evaluate(() => {
        const m = document.querySelector(".modal-overlay.open");
        if (!m) return [];
        return [...m.querySelectorAll("button[id]")].map(b => b.id).filter(id => !/close|Close|Download|download|Export|Save/.test(id));
      });
      for (const id of ids) {
        where = `${card.title} > #${id}`;
        await page.evaluate(id => { const b = document.getElementById(id); if (b && b.offsetParent !== null) b.click(); }, id);
        await page.waitForTimeout(250);
      }
    }

    where = "[E]／[G] 鍵";
    await page.evaluate(() => document.querySelectorAll(".modal-overlay.open").forEach(m => m.classList.remove("open")));
    for (const k of ["e", "g"]) {
      await page.keyboard.press(k);
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(1500);

    const unique = [...new Set(errors)];
    check("全程沒有 JS 錯誤或載入失敗", unique.length === 0, unique.length ? `${unique.length} 個` : "");
    unique.slice(0, 15).forEach(e => note(e));
    await browser.close();
  }
};
