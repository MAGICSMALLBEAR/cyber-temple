// 單一瀏覽器、停用 GPU 與軟體光柵，不載入任何 3D 引擎或場景。
const fs = require("fs"), path = require("path");
const { ROOT } = require("./light-env");
const { launch2D } = require("./helpers");
module.exports = {
  name: "新介面版面與操作（純 2D）",
  async run({ base, check }) {
    const browser = await launch2D();
    try {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<link\b[^>]*>/gi, "");
      await ctx.route("**/*", route => route.request().url().endsWith("/__visitor-ui") ? route.fulfill({ contentType: "text/html; charset=utf-8", body: html }) : route.abort());
      const p = await ctx.newPage(), errors = [];
      p.on("pageerror", e => errors.push(e.message));
      await p.goto(base + "__visitor-ui", { waitUntil: "domcontentloaded" });
      await p.addStyleTag({ content: fs.readFileSync(path.join(ROOT, "style.css"), "utf8") });
      await p.evaluate(() => {
        document.getElementById("templeLoader").remove();
        localStorage.setItem("temple_ui_help_seen", "1");
        window.state = { meritCount: 0, currentDeity: "mazu", consecutiveHolyBwa: 0, avatarConfig: { title: "測試善信" }, selectedChiam: null };
        window.CHIAM_DATA = Array.from({ length: 60 }, (_, i) => ({ id: i + 1, ganZhi: "甲子", fortune: "平安", guaTou: "典故" }));
        window.temple3d = { avatar: { position: { x: 0, z: 4 }, playerGroup: { rotation: { y: Math.PI } } }, interactiveObjects: [], isBlockedAt: () => false, findWalkRoute: (from, dest) => [dest] };
        window.pilgrimage = { data: { active: false, step: 0 }, place() {}, claimSupplies() {}, cancelRoute() { this.route = null; }, goTo(step, points) { this.route = { step, points, index: 0 }; } };
        window.setDockStatus = () => {};
        window.templeAudio = { playBell() {} };
        window.emitRitual = (type, detail = {}) => window.dispatchEvent(new CustomEvent("temple:ritual", { detail: { type, ...detail } }));
      });
      await p.addScriptTag({ content: 'const SERVICE_DESK_POS = [-5.2, 8.2];' });
      for (const file of ["inventory.js", "app/visit.js", "app/bag.js", "app/passport.js", "app/achievements.js", "app/journal.js", "app/reading.js", "app/controls.js"]) {
        await p.addScriptTag({ content: fs.readFileSync(path.join(ROOT, file), "utf8") });
      }
      await p.evaluate(() => {
        window.templeInventory.init(); window.templeBag.init(); window.templeVisit.init(); window.templeJournal.init(); window.templeReading.init(); window.templeAchievements.init();
        bindPassportOpenEvents(); bindPassportEvents(); bindModernUIShell();
      });
      check("預覽頁沒有建立 3D 場景或 WebGLRenderer", await p.evaluate(() => !window.THREE && !document.querySelector("#canvas3dContainer canvas")));
      const close = () => p.evaluate(() => document.querySelectorAll(".modal-overlay.open").forEach(m => m.classList.remove("open")));
      fs.mkdirSync(path.join(ROOT, ".test-cache"), { recursive: true });
      for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 700 }, { width: 844, height: 390 }]) {
        await p.setViewportSize(viewport);
        for (const size of ["normal", "large"]) {
          await close(); await p.evaluate(size => window.templeReading.apply(size), size);
          for (const name of ["map", "bag", "journal", "passport", "settings"]) {
            await p.evaluate(name => {
              if (name === "map") window.templeVisit.openMap();
              else if (name === "bag") { window.temple3d.avatar.position = { x: -4.1, z: 8.2 }; window.templeBag.open("shop"); }
              else if (name === "journal") window.templeJournal.open();
              else if (name === "passport") openPassportModal();
              else document.getElementById("settingsModal").classList.add("open");
            }, name);
            const bounds = await p.evaluate(name => {
              const id = { map: "visitMapModal", bag: "bagModal", journal: "journalModal", passport: "passportModal", settings: "settingsModal" }[name];
              const m = document.getElementById(id), panel = m.querySelector(".settings-modal, .modal-content"), r = panel.getBoundingClientRect();
              const close = m.querySelector(".modal-close").getBoundingClientRect();
              return { ok: m.classList.contains("open") && r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1 && panel.scrollWidth <= panel.clientWidth + 2 && close.top >= r.top - 1 && close.bottom <= r.bottom + 1,
                detail: `${id}：${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)}，內容寬 ${panel.scrollWidth}/${panel.clientWidth}` };
            }, name);
            check(`${viewport.width}×${viewport.height} ${size} ${name}：彈窗在畫面內且無橫向溢出`, bounds.ok, bounds.ok ? "" : bounds.detail);
            if (viewport.width === 390 && size === "large" && ["map", "bag", "journal"].includes(name)) await p.screenshot({ path: path.join(ROOT, ".test-cache", `visitor-${name}-phone.png`), animations: "disabled", timeout: 10000 });
            await close();
          }
        }
      }
      await p.setViewportSize({ width: 390, height: 700 });
      await p.evaluate(() => window.templeJournal.open());
      await p.fill("#journalWish", "<img src=x onerror=alert(1)> 我的心願");
      await p.fill("#journalNotes", "已經完成，回來記錄還願。");
      await p.selectOption("#journalStatus", "returned");
      await p.click("#journalSave");
      check("手帳可以保存並以純文字呈現心願", await p.evaluate(() => document.querySelectorAll(".journal-entry").length === 1 && !document.querySelector(".journal-entry img") && document.getElementById("journalList").textContent.includes("我的心願")));
      await p.keyboard.press("Tab");
      check("彈窗內 Tab 不會誤開萬寶閣", await p.evaluate(() => !document.getElementById("pavilionModal").classList.contains("open")));
      await p.keyboard.press("Escape");
      check("輸入心願後可用 Escape 關閉", await p.evaluate(() => !document.getElementById("journalModal").classList.contains("open")));
      await p.evaluate(() => window.templeVisit.openMap());
      await p.getByRole("button", { name: "🧧 服務處", exact: true }).click();
      check("點地圖地點會呼叫導航並關閉地圖", await p.evaluate(() => window.pilgrimage.route?.step.id === "service" && !document.getElementById("visitMapModal").classList.contains("open")));
      await p.evaluate(() => { window.templeVisit.openMap(); });
      await p.click("#btnMapStop");
      check("停止導航按鈕會取消路徑", await p.evaluate(() => !window.pilgrimage.route));
      check("沒有 JavaScript 錯誤", errors.length === 0, errors.join(" | "));
    } finally { await browser.close(); }
  }
};
