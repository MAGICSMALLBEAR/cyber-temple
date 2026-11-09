// 單一停用 GPU 的瀏覽器：購買與收供操作、手機版面、實際模型的 SVG 預覽。
const fs = require("fs"), path = require("path"), { build } = require("esbuild");
const { ROOT } = require("./light-env"), { launch2D } = require("./helpers");
module.exports = {
  name: "供品鋪與供桌操作、手機版面（純 2D）",
  async run({ base, check, note }) {
    const browser = await launch2D();
    try {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<link\b[^>]*>/gi, "");
      await ctx.route("**/*", route => route.request().url().endsWith("/__offering-ui") ? route.fulfill({ contentType: "text/html; charset=utf-8", body: html }) : route.abort());
      const p = await ctx.newPage(), errors = []; p.on("pageerror", e => errors.push(e.message));
      await p.goto(base + "__offering-ui", { waitUntil: "domcontentloaded" });
      await p.addStyleTag({ content: fs.readFileSync(path.join(ROOT, "style.css"), "utf8") });
      await p.evaluate(() => {
        document.getElementById("templeLoader").remove();
        window.state = { meritCount: 0, currentDeity: "mazu", avatarConfig: { title: "測試善信" } };
        window.addMerit = n => state.meritCount += n;
        window.setDockStatus = () => {}; window.templeAudio = { playBell() {}, playWoodblock() {} };
        window.temple3d = { avatar: { position: { x: -4.1, z: 8.2 }, releaseMovementKeys() {} }, updateOfferingTableStyle(s) { window.renderedStyle = s; }, updateAltarFeastOfferings(ids) { window.renderedOfferings = ids; }, celebrateFeastOffering() {} };
        window.pilgrimage = { data: { active: false }, goTo() {} };
        window.templeVisit = { go(id) { window.lastDestination = id; } };
        window.emitRitual = type => { window.lastRitual = type; };
      });
      await p.addScriptTag({ content: 'const SERVICE_DESK_POS = [-5.2, 8.2]; const DEITIES = { mazu: { id: "mazu", name: "天上聖母 媽祖" } };' });
      for (const file of ["inventory.js", "app/bag.js", "app/journal.js", "app/feast.js", "app/reading.js"]) await p.addScriptTag({ content: fs.readFileSync(path.join(ROOT, file), "utf8") });
      await p.evaluate(() => {
        const d = window.templeInventory.load(); d.coins = 100; window.templeInventory.save(d);
        window.templeBag.init(); bindFeastEvents(); window.templeReading.init(); window.templeBag.open("shop");
      });
      check("供品鋪列出十一款可擺供品與香紙", await p.locator(".shop-product").count() === 13);
      await p.getByRole("button", { name: "金銀財寶", exact: true }).click();
      check("財寶分類可篩選三款商品", await p.locator(".shop-product").count() === 3);
      await p.locator('[data-product="goldIngot"] input').fill("2");
      await p.locator('[data-product="goldIngot"] button').click();
      await p.locator('[data-product="silverIngot"] button').click();
      await p.locator('[data-product="treasureBowl"] button').click();
      check("採買籃先列合計，尚未扣款", await p.evaluate(() => document.getElementById("shopBasketTotal").textContent.includes("54") && window.templeInventory.data.coins === 100));
      await p.click("#btnShopCheckout");
      check("整籃結帳正確扣款並放入背包", await p.evaluate(() => window.templeInventory.data.coins === 46 && window.templeInventory.data.items.goldIngot === 2 && !Object.keys(window.templeBag.basket).length));
      await p.click("#bagModalClose"); await p.evaluate(() => window.openFeastModal());
      check("不在供桌旁時不能擺供，提供前往按鈕", await p.locator('[data-dish="goldIngot"]').isDisabled() && await p.locator("#btnFeastGo").isVisible());
      await p.click("#btnFeastGo"); check("前往供桌接到導航", await p.evaluate(() => window.lastDestination === "offerings"));
      await p.evaluate(() => { window.temple3d.avatar.position = { x: 0, z: 1.7 }; window.openFeastModal(); });
      await p.locator('[data-dish="goldIngot"]').focus(); await p.keyboard.press("Enter");
      await p.click("#feastSlot1"); await p.locator('[data-dish="silverIngot"]').click();
      await p.click("#feastSlot2"); await p.locator('[data-dish="treasureBowl"]').click();
      await p.selectOption("#feastTableStyle", "brocade");
      check("擺供與換桌型同步到場景", await p.evaluate(() => window.renderedStyle === "brocade" && window.renderedOfferings[0] === "goldIngot" && window.renderedOfferings[1] === "silverIngot" && window.templeInventory.data.items.goldIngot === 1));
      // 敬獻關聯心願手帳
      const wishes = await p.evaluate(() => ({ a: window.templeJournal.saveEntry({ wish: "家人平安", status: "pending" }).entry.id,
        b: window.templeJournal.saveEntry({ wish: "找到新工作", status: "fulfilled" }).entry.id,
        done: window.templeJournal.saveEntry({ wish: "早就還願了", status: "returned" }).entry.id }));
      check("心願選單只列未還願的心願", await p.locator("#feastWish option").count() === 3 && !await p.locator(`#feastWish option[value="${wishes.done}"]`).count());
      await p.selectOption("#feastWish", wishes.b);
      check("選已實現的心願預設改為答謝還願", await p.inputValue("#feastWishKind") === "thanks" && (await p.textContent("#feastWishHint")).includes("已還願"));
      await p.selectOption("#feastWish", wishes.a);
      check("選祈願中的心願預設為祈求保佑", await p.inputValue("#feastWishKind") === "pray");
      await p.fill("#feastName", "信女 小美"); await p.fill("#feastWords", "保佑全家健康");
      fs.mkdirSync(path.join(ROOT, ".test-cache"), { recursive: true });
      await p.locator("#feastWishBox").screenshot({ path: path.join(ROOT, ".test-cache", "offering-wish-box.png"), animations: "disabled" });
      await p.click("#btnFeastPresent");
      const visit = await p.evaluate(id => window.templeJournal.load().find(e => e.id === id).visits[0], wishes.a);
      check("敬獻記入心願：神尊、稱呼、心意與桌上供品", visit?.kind === "pray" && visit.deity === "mazu" && visit.name === "信女 小美" && visit.message === "保佑全家健康" && visit.dishes.join() === "goldIngot,silverIngot,treasureBowl");
      check("敬獻後清空心意與選擇、記住稱呼", await p.inputValue("#feastWish") === "" && await p.inputValue("#feastWords") === "" && await p.evaluate(() => localStorage.getItem("temple_offering_name")) === "信女 小美");
      check("敬獻增加功德並保留桌面，不能重按", await p.evaluate(() => state.meritCount === 128 && window.lastRitual === "feast" && window.templeInventory.data.offering.presented) && await p.locator("#btnFeastPresent").isDisabled());
      await p.keyboard.press("Escape");
      check("供桌可用 Escape 關閉", !await p.locator("#feastModal").evaluate(el => el.classList.contains("open")));
      await p.evaluate(() => window.openFeastModal());
      check("重新開啟保留供品與敬獻狀態", await p.locator("#feastSlotName2").textContent() === "金銀聚寶盆" && await p.locator("#btnFeastPresent").isDisabled());
      fs.mkdirSync(path.join(ROOT, ".test-cache"), { recursive: true });
      await p.screenshot({ path: path.join(ROOT, ".test-cache", "offering-table-desktop.png"), animations: "disabled" });
      for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 700 }, { width: 844, height: 390 }]) {
        await p.setViewportSize(viewport);
        for (const size of ["normal", "large"]) {
          await p.evaluate(size => window.templeReading.apply(size), size);
          for (const id of ["feastModal", "bagModal"]) {
            await p.evaluate(id => {
              document.querySelectorAll(".modal-overlay.open").forEach(m => m.classList.remove("open"));
              if (id === "feastModal") { window.temple3d.avatar.position = { x: 0, z: 1.7 }; window.openFeastModal(); }
              else { window.temple3d.avatar.position = { x: -4.1, z: 8.2 }; window.templeBag.open("shop"); }
            }, id);
            const bounds = await p.evaluate(id => {
              const panel = document.querySelector(`#${id} .settings-modal`), r = panel.getBoundingClientRect();
              return { ok: r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1 && panel.scrollWidth <= panel.clientWidth + 2, detail: `${r.width}x${r.height}, scroll ${panel.scrollWidth}/${panel.clientWidth}` };
            }, id);
            check(`${viewport.width}×${viewport.height} ${size} ${id} 無橫向溢出且在視窗內`, bounds.ok, bounds.detail);
            if (viewport.width === 390 && size === "large") await p.screenshot({ path: path.join(ROOT, ".test-cache", `${id === "feastModal" ? "offering-table" : "offering-shop"}-phone.png`), animations: "disabled" });
          }
        }
      }
      await p.evaluate(() => {
        document.getElementById("bagModal").classList.remove("open"); window.temple3d.avatar.position = { x: 0, z: 1.7 }; window.openFeastModal();
      });
      await p.click("#btnFeastCollect");
      check("收供按鈕在手機橫向大字可操作，原數放回背包", await p.evaluate(() => window.templeInventory.data.items.goldIngot === 2 && window.templeInventory.data.items.silverIngot === 1 && window.templeInventory.data.items.treasureBowl === 1 && window.renderedOfferings.every(id => id === null)));
      check("收供後不能再次收取", await p.locator("#btnFeastCollect").isDisabled());
      check("購買與擺供操作無 JavaScript 錯誤", errors.length === 0, errors.join(" | "));
      // 以實際幾何生成可目視檢查的圖鑑，不執行 WebGLRenderer。
      const bundle = await build({ stdin: { contents: 'export * as THREE from "three"; export { SVGRenderer } from "three/examples/jsm/renderers/SVGRenderer.js";', resolveDir: ROOT }, absWorkingDir: ROOT, tsconfigRaw: {}, plugins: [{ name: "local-three", setup(b) {
        b.onResolve({ filter: /^three$/ }, () => ({ path: path.join(ROOT, "node_modules/three/build/three.module.js") }));
        b.onResolve({ filter: /^three\/examples\// }, args => ({ path: path.join(ROOT, "node_modules", args.path) }));
        b.onResolve({ filter: /^\.\.?\// }, args => ({ path: path.resolve(args.resolveDir, args.path) }));
      } }], bundle: true, format: "iife", globalName: "TemplePreview", write: false });
      await p.goto(base + "__offering-ui", { waitUntil: "domcontentloaded" });
      await p.setContent('<html lang="zh-TW"><body style="margin:0;background:#201b19;color:#f5dcaa;font-family:Microsoft JhengHei,sans-serif"><h1 style="font-size:24px;text-align:center">供品鋪・供桌與金銀財寶</h1><main style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:16px"></main></body></html>');
      await p.setViewportSize({ width: 1400, height: 950 }); await p.addScriptTag({ content: bundle.outputFiles[0].text });
      await p.addScriptTag({ content: 'window.THREE=TemplePreview.THREE;' });
      for (const file of ["scene/offering-models.js", "scene/core.js", "scene/architecture.js", "scene/altar.js", "scene/service.js"]) await p.addScriptTag({ content: fs.readFileSync(path.join(ROOT, file), "utf8") });
      await p.evaluate(() => {
        const THREE = TemplePreview.THREE;
        for (const [id, title] of [["wood", "紅木雕花供桌"], ["brocade", "紅布金繡供桌"], ["stone", "青石供桌"], ["shop", "廟埕供品鋪"], ["goldIngot", "金元寶盤"], ["silverIngot", "銀元寶盤"], ["treasureBowl", "金銀聚寶盆"]]) {
          const engine = Object.create(Temple3DScene.prototype); engine.scene = new THREE.Scene(); engine.interactiveObjects = []; engine.buildDeityThrone = () => {};
          let position, target;
          if (["wood", "brocade", "stone"].includes(id)) {
            engine.buildAltarAndDeity(); engine.updateOfferingTableStyle(id); engine.buildOfferings(); engine.updateAltarFeastOfferings(["goldIngot", "silverIngot", "treasureBowl", "fruit", "flowers"]);
            position = [4.6, 3.5, 5.5]; target = [0, .8, -.3];
          } else if (id === "shop") { engine.buildServiceDesk(); engine.serviceDesk.position.set(0, 0, 0); engine.serviceDesk.rotation.y = 0; position = [2.3, 2.7, 5]; target = [0, 1.3, 0]; }
          else { engine.scene.add(engine.createTreasureOffering(id)); position = [.46, .42, .55]; target = [0, .1, 0]; }
          engine.scene.add(new THREE.AmbientLight(0xffffff, 1.6)); const light = new THREE.DirectionalLight(0xfff1df, 2); light.position.set(2, 5, 6); engine.scene.add(light);
          const camera = new THREE.PerspectiveCamera(38, 440 / 310, .01, 30); camera.position.set(...position); camera.lookAt(...target);
          const renderer = new TemplePreview.SVGRenderer(); renderer.setSize(440, 310); renderer.setQuality("low"); renderer.setClearColor(0x302623); renderer.render(engine.scene, camera);
          const card = document.createElement("article"); card.style.cssText = "background:#302623;border:1px solid #836443;border-radius:10px;overflow:hidden;text-align:center";
          const h = document.createElement("h2"); h.style.cssText = "font-size:18px;margin:12px"; h.textContent = title; card.append(h, renderer.domElement); document.querySelector("main").append(card);
        }
      });
      await p.screenshot({ path: path.join(ROOT, ".test-cache", "offering-model-gallery.png"), fullPage: true });
      check("三供桌、供品鋪與三款財寶可用實際幾何投影", await p.locator("main svg").count() === 7);
      // 實際角色的提籃、端盤與參拜姿勢，同樣只用 SVG 投影。
      for (const file of ["inventory.js", "avatar/appearance.js", "avatar/core.js", "avatar/ritual-props.js", "avatar/social.js", "avatar/relics.js", "avatar/companions.js"]) await p.addScriptTag({ content: fs.readFileSync(path.join(ROOT, file), "utf8") });
      await p.setContent('<html lang="zh-TW"><body style="margin:0;background:#201b19;color:#f5dcaa;font-family:Microsoft JhengHei,sans-serif"><h1 style="font-size:24px;text-align:center">角色參拜動作預覽</h1><main style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:16px"></main></body></html>');
      await p.evaluate(() => {
        const THREE = TemplePreview.THREE;
        for (const [id, title] of [["basket", "提起供品籃"], ["basketWalk", "提籃行走"], ["tray", "雙手端盤"], ["placeOffering", "將供盤向前擺放"], ["presentOffering", "端盤敬獻"], ["incenseOffering", "持香行禮"]]) {
          const a = Object.create(TempleAvatarSystem.prototype); a.scene = new THREE.Scene(); a.playerGroup = new THREE.Group(); a.scene.add(a.playerGroup); a.limbs = {}; a.position = new THREE.Vector3();
          a.config = { ...AVATAR_DEFAULT_LOOK, robeColor: "#a83b29", holdingItem: "incense", title: "善信", hatType: "headband" }; a.relics = {}; a.currentAction = "idle"; a.actionProgress = 0; a.keys = {}; a.broadcastMyState = () => {};
          a.buildAvatarMesh(); a.limbs.titleSprite.visible = false; // SVG 不支援稱號貼圖，避免白色矩形遮住預覽。
          a.setRitualItems(["fruit", "goldIngot", "flowers"]);   // 提籃與端盤裡放背包現有的供品
          if (id === "basket" || id === "basketWalk" || id === "tray") { a.setRitualCarry(id === "tray" ? "tray" : "basket"); if (id === "basketWalk") a.currentAction = "walk"; }
          else { a.playRitualMotion(id, id === "presentOffering" ? ["treasureBowl", "peach", "redturtle"] : undefined); a.ritualMotion.startedAt -= RITUAL_MOTION_SECONDS[id] * 1000 * (id === "incenseOffering" ? .17 : .5); }
          a.animateLimbs(1.3, .016);
          a.scene.add(new THREE.AmbientLight(0xffffff, .8)); const light = new THREE.DirectionalLight(0xffefdc, .8); light.position.set(2, 4, 5); a.scene.add(light);
          const camera = new THREE.PerspectiveCamera(35, 440 / 360, .01, 20); camera.position.set(1.4, 1.2, 2.8); camera.lookAt(0, .65, .1);
          const renderer = new TemplePreview.SVGRenderer(); renderer.setSize(440, 360); renderer.setQuality("low"); renderer.setClearColor(0x302623); renderer.render(a.scene, camera);
          const card = document.createElement("article"); card.style.cssText = "background:#302623;border:1px solid #836443;border-radius:10px;overflow:hidden;text-align:center";
          const h = document.createElement("h2"); h.style.cssText = "font-size:18px;margin:12px"; h.textContent = title; card.append(h, renderer.domElement); document.querySelector("main").append(card);
        }
      });
      await p.screenshot({ path: path.join(ROOT, ".test-cache", "pilgrimage-role-gallery.png"), fullPage: true });
      check("六種角色參拜姿勢可用實際模型預覽", await p.locator("main svg").count() === 6);
      note("純 2D 操作與 SVG 模型預覽；未啟動 WebGL 壓力測試。");
    } finally { await browser.close(); }
  }
};
