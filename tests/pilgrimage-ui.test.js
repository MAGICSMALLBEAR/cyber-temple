// 用單一純 2D 瀏覽器走完八步介面，不載入 WebGL。
const fs = require("fs"), path = require("path");
const { ROOT } = require("./light-env"), { launch2D } = require("./helpers");
module.exports = {
  name: "主題採買與八步參拜介面（純 2D）",
  async run({ base, check }) {
    const browser = await launch2D();
    try {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<link\b[^>]*>/gi, "");
      await ctx.route("**/*", route => route.request().url().endsWith("/__pilgrimage-ui") ? route.fulfill({ contentType: "text/html; charset=utf-8", body: html }) : route.abort());
      const p = await ctx.newPage(), errors = []; p.on("pageerror", e => errors.push(e.message));
      await p.goto(base + "__pilgrimage-ui", { waitUntil: "domcontentloaded" });
      await p.addStyleTag({ content: fs.readFileSync(path.join(ROOT, "style.css"), "utf8") });
      await p.evaluate(() => {
        document.getElementById("templeLoader").remove();
        window.state = { meritCount: 0, avatarConfig: { title: "測試善信" } };
        window.addMerit = n => state.meritCount += n; window.setDockStatus = () => {};
        window.templeAudio = { playBell() {}, playWoodblock() {} };
        window.temple3d = { avatar: { position: { x: -4.1, z: 8.2 }, playerGroup: { rotation: { y: 0 } }, releaseMovementKeys() {}, setRitualCarry(mode) { window.lastCarry = mode; }, playRitualMotion(name) { window.lastMotion = name; } },
          updateOfferingTableStyle() {}, updateAltarFeastOfferings() {}, celebrateFeastOffering() {},
          triggerNearbyInteraction() { if (window.templeInventory.consume({ incense: 1 })) window.emitRitual("heavenCenser"); } };
        window.liveTempleWall = { showBroadcastNotice() {} };
        window.emitRitual = (type, detail = {}) => window.dispatchEvent(new CustomEvent("temple:ritual", { detail: { type, ...detail } }));
        window.chiamRitual = { start() { window.emitRitual("chiamReceived", { confirmed: true }); } };
        document.getElementById("btnLightIncense").addEventListener("click", () => { if (window.templeInventory.consume({ incense: 1 })) window.emitRitual("incense"); });
        document.getElementById("btnActionKneel").addEventListener("click", () => window.emitRitual("bow", { action: "kneel" }));
        document.getElementById("btnBurnPaper").addEventListener("click", () => { if (window.templeInventory.consume({ paper: 1 })) window.emitRitual("paper"); });
      });
      await p.addScriptTag({ content: 'const SERVICE_DESK_POS = [-5.2,8.2];' });
      for (const file of ["inventory.js", "app/pilgrimage.js", "app/bag.js", "app/feast.js", "app/reading.js"]) await p.addScriptTag({ content: fs.readFileSync(path.join(ROOT, file), "utf8") });
      await p.evaluate(() => {
        const d = window.templeInventory.load(); d.coins = 100; window.templeInventory.save(d);
        window.pilgrimage.init(); window.templeBag.init(); bindFeastEvents(); window.templeReading.init(); window.pilgrimage.start();
      });
      await p.click("#btnPilgrimPrimary");
      check("參拜第一步開啟供品鋪並要求確認材料", await p.locator("#btnPilgrimSuppliesReady").isVisible() && await p.locator("#btnPilgrimSuppliesReady").isDisabled());
      await p.selectOption("#shopOfferingSet", "wealth");
      check("招財主題預覽列五份供品，未扣款未擺桌", await p.evaluate(() => window.templeInventory.data.offeringSet === "wealth" && window.templeInventory.data.coins === 130 && window.templeInventory.data.offering.slots.every(id => !id) && document.querySelectorAll("#bagContents .offering-set-preview span").length === 5));
      await p.click("#btnBuyOfferingSet");
      check("只補買缺少的三款財寶，不重買每日供品", await p.evaluate(() => window.templeInventory.data.coins === 88 && window.templeInventory.data.items.fruit === 2 && window.templeInventory.data.items.goldIngot === 1 && window.lastCarry === "basket"));
      await p.click("#btnPilgrimSuppliesReady");
      check("確認備齊後關閉商店並進入敬天", await p.evaluate(() => window.pilgrimage.step.id === "heaven" && !document.getElementById("bagModal").classList.contains("open")));
      const at = async (x, z) => p.evaluate(({ x, z }) => { window.temple3d.avatar.position = { x, z }; window.pilgrimage.render(); }, { x, z });
      await at(0, 9.6); await p.click("#btnPilgrimPrimary");
      await at(0, 1.7); await p.click("#btnPilgrimPrimary");
      await p.click("#btnPilgrimPrimary");
      check("供桌顯示同一主題且可一鍵擺上", await p.locator("#feastOfferingSet").inputValue() === "wealth" && await p.locator("#btnPlaceOfferingSet").isEnabled());
      await p.click("#btnPlaceOfferingSet");
      check("一鍵擺供會呼叫角色擺盤動作", await p.evaluate(() => window.lastMotion === "placeOffering" && window.templeInventory.data.offering.slots[2] === "treasureBowl"));
      await p.click("#btnFeastPresent");
      check("敬獻後關閉視窗展示角色動作並銜接跪拜", await p.evaluate(() => window.lastMotion === "presentOffering" && window.pilgrimage.step.id === "kneel" && !document.getElementById("feastModal").classList.contains("open")));
      await p.click("#btnPilgrimPrimary"); await p.click("#btnPilgrimPrimary");
      check("聖筊求籤後提示收供並保存新版步驟 ID", await p.evaluate(() => window.pilgrimage.step.id === "collect" && JSON.parse(localStorage.getItem("temple_pilgrimage")).stepId === "collect"));
      await p.click("#btnPilgrimPrimary"); await p.click("#btnFeastCollect");
      check("收供原數歸還，展示收供動作並銜接化紙", await p.evaluate(() => window.pilgrimage.step.id === "paper" && window.templeInventory.data.items.goldIngot === 1 && window.lastMotion === "collectOffering" && !document.getElementById("feastModal").classList.contains("open")));
      await at(-12.5, 12.3); await p.click("#btnPilgrimPrimary");
      check("八步全部完成且功德正確", await p.evaluate(() => !window.pilgrimage.data.active && window.pilgrimage.data.completed === 1 && state.meritCount === 296));
      await p.evaluate(() => window.templeBag.open()); await p.click("#btnBagCarry");
      check("可放下提籃而不改背包數量", await p.evaluate(() => window.lastCarry === "" && window.templeInventory.data.items.goldIngot === 1));
      await p.click("#bagModalClose"); await p.evaluate(() => window.openFeastModal()); await p.click("#btnFeastCarryTray");
      check("端盤預備會關窗展示且不扣庫存", await p.evaluate(() => window.lastCarry === "tray" && window.templeInventory.data.items.goldIngot === 1 && !document.getElementById("feastModal").classList.contains("open")));
      fs.mkdirSync(path.join(ROOT, ".test-cache"), { recursive: true });
      for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 700 }, { width: 844, height: 390 }]) {
        await p.setViewportSize(viewport); await p.evaluate(() => window.templeReading.apply("large"));
        for (const id of ["bagModal", "feastModal"]) {
          await p.evaluate(id => {
            document.querySelectorAll(".modal-overlay.open").forEach(m => m.classList.remove("open"));
            if (id === "bagModal") { window.temple3d.avatar.position = { x: -4.1, z: 8.2 }; window.templeBag.open("shop"); }
            else { window.temple3d.avatar.position = { x: 0, z: 1.7 }; window.openFeastModal(); }
          }, id);
          check(`${viewport.width} 大字主題${id}無溢出`, await p.evaluate(id => { const el = document.querySelector(`#${id} .settings-modal`), r = el.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1 && el.scrollWidth <= el.clientWidth + 2; }, id));
          if (viewport.width === 390) await p.screenshot({ path: path.join(ROOT, ".test-cache", `pilgrimage-${id === "bagModal" ? "shop" : "table"}-phone.png`), animations: "disabled" });
        }
      }
      check("八步參拜介面沒有 JavaScript 錯誤", errors.length === 0, errors.join(" | "));
      check("測試沒有載入 3D 引擎", await p.evaluate(() => !window.THREE));
    } finally { await browser.close(); }
  }
};
