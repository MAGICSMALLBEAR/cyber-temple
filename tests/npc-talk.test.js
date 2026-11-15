// 會說話的 NPC：12 位都有台詞且可點選；台詞依節慶、天氣排序並輪替；太遠先走過去；
// 和地點重疊時地點優先；攤販可用平安幣買小點心與供品、錢不夠不能買、走遠不能買
const { launch, newContext, waitFor } = require("./helpers");

module.exports = {
  name: "會說話的 NPC 與攤販",
  async run({ base, check }) {
    const browser = await launch();
    const ctx = await newContext(browser, { viewport: { width: 1400, height: 900 } });
    await ctx.addInitScript(() => { if (!localStorage.getItem("temple_merit")) localStorage.setItem("temple_merit", "500"); localStorage.setItem("temple_ui_help_seen", "1"); });
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", e => errs.push(e.message));
    await p.goto(base);

    const basics = await p.evaluate(() => {
      const npcs = window.temple3d.avatar.npcs;
      return {
        count: npcs.length,
        clickable: window.temple3d.interactiveObjects.filter(o => o.userData.type === "npc").length,
        missing: npcs.filter((n, i) => !window.templeNpc.profile(i)).map(n => n.name),
        vendors: npcs.map((n, i) => window.templeNpc.isVendor(i) ? n.name : null).filter(Boolean)
      };
    });
    check("12 位 NPC 都可以點選", basics.count === 12 && basics.clickable === 12, JSON.stringify(basics));
    check("每位 NPC 都有台詞", basics.missing.length === 0, basics.missing.join("、"));
    check("賣地瓜球的阿姨與茶攤老闆是攤販", basics.vendors.join() === "賣地瓜球的阿姨,茶攤老闆", basics.vendors.join());

    const idx = name => p.evaluate(n => window.temple3d.avatar.npcs.findIndex(x => x.name === n), name);
    const standBy = i => p.evaluate(i => { const n = window.temple3d.avatar.npcs[i], a = window.temple3d.avatar; window.pilgrimage.cancelRoute(); a.position.set(n.group.position.x, 0, n.group.position.z + 1.1); a.targetPos = null; }, i);
    const notice = () => p.$eval("#dockStatusBar", e => e.textContent);

    // 台詞依情境排序：節慶 → 下雨 → 時段 → 平常
    const granny = await idx("樹下祈願阿嬤");
    const ctxLines = await p.evaluate(i => {
      Object.defineProperty(window.dailyPractice, "festival", { configurable: true, get: () => ({ name: "測試節 • 副標", minor: false }) });
      const orig = window.templeWeather.current;
      window.templeWeather.current = () => "rain";
      const list = window.templeNpc.lines(i);
      window.templeWeather.current = orig;
      delete window.dailyPractice.festival;
      return list;
    }, granny);
    check("節慶當天第一句是節慶台詞（只取節慶主名）", ctxLines[0].includes("測試節") && !ctxLines[0].includes("副標"), ctxLines[0]);
    check("下雨天會講下雨的台詞", ctxLines[1].includes("落雨"), ctxLines[1]);
    const plain = await p.evaluate(i => { const orig = window.templeWeather.current; window.templeWeather.current = () => "clear"; const l = window.templeNpc.lines(i); window.templeWeather.current = orig; return l; }, granny);
    check("晴天不講下雨台詞", !plain.some(l => l.includes("落雨")));

    // 太遠：先走過去
    await p.evaluate(() => { const a = window.temple3d.avatar; a.position.set(0, 0, 4); a.targetPos = null; });
    const far = await p.evaluate(i => ({ said: window.templeNpc.talk(i), route: window.pilgrimage.route?.step?.id || null }), granny);
    check("離 NPC 太遠時自動走過去，不直接說話", far.said === false && far.route === `npc${granny}`, JSON.stringify(far));

    // 走近按 E 聊天，每次換一句
    await standBy(granny);
    const near = await p.evaluate(() => window.templeVisit.nearby()?.id);
    check("站在阿嬤旁邊，互動提示是她", near === `npc${granny}`, near);
    await p.evaluate(() => window.templeVisit.interact());
    const first = await notice();
    await p.evaluate(() => window.templeVisit.interact());
    const second = await notice();
    check("按 E 聊天：通知顯示 NPC 名字與台詞", first.includes("樹下祈願阿嬤：「"), first);
    check("再聊一次換一句", second !== first && second.includes("樹下祈願阿嬤"), second);

    // 和地點重疊：天公爐前的香客小美不搶走「敬天上香」
    const heavenFirst = await p.evaluate(() => { const a = window.temple3d.avatar; window.pilgrimage.cancelRoute(); a.position.set(0, 0, 9.6); a.targetPos = null; return window.templeVisit.nearby()?.id; });
    check("天公爐前按 E 仍是敬天上香（NPC 不搶地點）", heavenFirst === "heaven", heavenFirst);
    const guide = await p.evaluate(() => window.templeNpc.lines(window.temple3d.avatar.npcs.findIndex(n => n.name === "山門迎客道長")).join(""));
    check("山門道長會講參拜順序與龍進虎出", guide.includes("天公爐") && guide.includes("龍進虎出"));

    // ---------- 攤販 ----------
    const aunt = await idx("賣地瓜球的阿姨");
    await p.evaluate(() => { const d = window.templeInventory.load(); d.coins = 10; d.items.redturtle = 0; window.templeInventory.save(d); localStorage.removeItem("temple_plaza_daily"); });
    await standBy(aunt);
    await p.evaluate(i => window.templeNpc.talk(i), aunt);
    const shop = await p.evaluate(() => ({
      open: document.getElementById("npcShopModal").classList.contains("open"),
      items: [...document.querySelectorAll("#npcShopItems .npc-shop-item")].map(b => b.textContent),
      coins: document.getElementById("npcShopCoins").textContent
    }));
    check("跟攤販聊天打開攤位：小點心＋兩樣供品、顯示平安幣", shop.open && shop.items.length === 3 && shop.items[0].includes("地瓜球") && shop.coins.includes("10"), JSON.stringify(shop));

    const merit0 = await p.evaluate(() => parseInt(localStorage.getItem("temple_merit"), 10));
    await p.click("#npcShopItems .npc-shop-item >> nth=0");
    let st = await p.evaluate(() => ({ coins: window.templeInventory.load().coins, merit: parseInt(localStorage.getItem("temple_merit"), 10), msg: document.getElementById("npcShopMessage").textContent }));
    check("買地瓜球：扣 2 平安幣，當天第一次 +1 功德", st.coins === 8 && st.merit === merit0 + 1 && st.msg.includes("地瓜球"), JSON.stringify(st));
    await p.click("#npcShopItems .npc-shop-item >> nth=1");
    st = await p.evaluate(() => ({ coins: window.templeInventory.load().coins, turtle: window.templeInventory.load().items.redturtle, msg: document.getElementById("npcShopMessage").textContent, coinsText: document.getElementById("npcShopCoins").textContent }));
    check("買紅龜粿：扣 6 平安幣、放進背包", st.coins === 2 && st.turtle === 1 && st.msg.includes("背包") && st.coinsText.includes("2"), JSON.stringify(st));
    const disabled = await p.evaluate(() => [...document.querySelectorAll("#npcShopItems .npc-shop-item")].map(b => b.disabled));
    check("平安幣不夠的品項不能按，買得起的可以", disabled.join() === "false,true,true", disabled.join());

    // 走遠就不能買
    await p.evaluate(() => { const a = window.temple3d.avatar; a.position.set(0, 0, 4); });
    const awayOk = await p.evaluate(i => window.templeNpc.buySnack(i), aunt);
    check("走遠了不能買", awayOk === false && (await p.evaluate(() => window.templeInventory.load().coins)) === 2);
    await p.click("#npcShopClose");
    check("關閉攤位視窗", !(await p.evaluate(() => document.getElementById("npcShopModal").classList.contains("open"))));

    // 服務處的 buy() 仍要求在服務處
    const deskOnly = await p.evaluate(() => window.templeInventory.buy("incense", 1));
    check("服務處購買仍要求站在服務處", deskOnly === false);

    check("沒有 JS 錯誤", errs.length === 0, errs.join(" | "));
    await browser.close();
  }
};
