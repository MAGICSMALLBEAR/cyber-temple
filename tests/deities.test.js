// 神尊：8 位都能切換、法器與標籤正確、關公紅臉切走會還原、藏經閣列傳、神尊聖誕的節慶功課
const { launch, newContext } = require("./helpers");

const DEITY_IDS = ["mazu", "wenchang", "caishen", "yuelao", "guanyin", "guangong", "tudigong", "guaiguai"];

module.exports = {
  name: "神尊切換與聖誕",
  async run({ base, check }) {
    const browser = await launch();
    const ctx = await newContext(browser);
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", e => errs.push(e.message));
    await p.goto(base);

    const pills = await p.$$eval(".btn-deity-pill", bs => bs.map(b => b.dataset.deity));
    check("選單有 8 位神尊", JSON.stringify(pills.sort()) === JSON.stringify([...DEITY_IDS].sort()), pills.join(","));

    for (const id of DEITY_IDS) {
      const r = await p.evaluate(id => {
        document.getElementById("deityDropdownBtn").click();
        document.querySelector(`.btn-deity-pill[data-deity="${id}"]`).click();
        const t = window.temple3d;
        return {
          current: state.currentDeity,
          name: DEITIES[id] && DEITIES[id].name,
          label: document.getElementById("currentDeityLabel").textContent,
          accessories: t.deityAccessories.length,
          lore: LORE_DEITIES.some(d => d.id === id)
        };
      }, id);
      check(`切換到 ${id}`, r.current === id && !!r.name, `${r.current} / ${r.name}`);
      check(`${id} 有專屬法器`, r.accessories > 0, String(r.accessories));
      check(`${id} 有藏經閣列傳`, r.lore);
    }

    const headRestored = await p.evaluate(() => {
      document.querySelector('.btn-deity-pill[data-deity="guangong"]').click();
      const red = window.temple3d.deityHead.material !== window.temple3d.deityStatue.material;
      document.querySelector('.btn-deity-pill[data-deity="mazu"]').click();
      return red && window.temple3d.deityHead.material === window.temple3d.deityStatue.material;
    });
    check("關公紅臉切到其他神尊後還原為金身", headRestored);

    // 切來切去不能殘留舊法器（例如觀音的蓮座留在媽祖身上）
    const counts = await p.evaluate(() => {
      const pick = id => { document.querySelector(`.btn-deity-pill[data-deity="${id}"]`).click(); return window.temple3d.throneGroup.children.length; };
      const first = pick("mazu");
      pick("guanyin"); pick("guangong"); pick("tudigong");
      return { first, again: pick("mazu") };
    });
    check("來回切換不殘留舊法器", counts.first === counts.again, `${counts.first} → ${counts.again}`);
    check("沒有 JS 錯誤", errs.length === 0, errs.join(" | "));
    await browser.close();

    // 關聖帝君聖誕（2026/8/6，農曆六月廿四）：在關公前點香才完成節慶功課
    const b2 = await launch();
    const c2 = await newContext(b2);
    await c2.clock.setFixedTime(new Date(2026, 7, 6, 10, 0, 0));
    const q = await c2.newPage();
    await q.goto(base);
    const fest = await q.evaluate(() => window.dailyPractice.festival);
    check("2026/8/6 是關聖帝君聖誕", fest && fest.name.includes("關聖帝君"), fest && fest.name);
    await q.evaluate(() => document.getElementById("btnLightIncense").click());
    await q.waitForTimeout(800);
    check("在媽祖前點香不算關公聖誕功課", !(await q.evaluate(() => window.dailyPractice.data.done.includes("festival"))));
    await q.evaluate(() => {
      document.querySelector('.btn-deity-pill[data-deity="guangong"]').click();
      document.getElementById("btnLightIncense").click();
    });
    await q.waitForTimeout(800);
    check("切到關公再點香完成節慶功課", await q.evaluate(() => window.dailyPractice.data.done.includes("festival")));
    await b2.close();
  }
};
