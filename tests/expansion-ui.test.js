// 單一停用 GPU 的 2D 瀏覽器；SVG 預覽只投影模型，不建立 WebGLRenderer。
const fs = require("fs"), path = require("path"), { build } = require("esbuild");
const { ROOT } = require("./light-env"), { launch2D } = require("./helpers");
module.exports = {
  name: "靈符與無障礙操作、神尊預覽（純 2D）",
  async run({ base, check, note }) {
    const browser = await launch2D();
    try {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
      const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<link\b[^>]*>/gi, "");
      await ctx.route("**/*", route => route.request().url().endsWith("/__expansion-ui") ? route.fulfill({ contentType: "text/html; charset=utf-8", body: html }) : route.abort());
      const p = await ctx.newPage(), errors = []; p.on("pageerror", e => errors.push(e.message));
      await p.goto(base + "__expansion-ui", { waitUntil: "domcontentloaded" });
      await p.addStyleTag({ content: fs.readFileSync(path.join(ROOT, "style.css"), "utf8") });
      await p.evaluate(() => {
        document.getElementById("templeLoader").remove(); localStorage.setItem("temple_ui_help_seen", "1");
        window.state = { meritCount: 500, currentDeity: "mazu", avatarConfig: { title: "測試善信" } };
        window.temple3d = { avatar: { equipAmulet(id) { window.lastEquipped = id; return true; }, releaseMovementKeys() { window.keysReleased = true; } } };
        window.addMerit = amount => { state.meritCount += amount; };
        window.setDockStatus = () => {}; window.spawnAvatarFloatingText = () => {};
        window.templeAudio = { playBell() {}, playMuyuSound() {}, playConsecrationChime() {} };
        window.performMuyuStrike = () => { window.accidentalMuyu = true; };
        window.emitRitual = (type, detail = {}) => window.dispatchEvent(new CustomEvent("temple:ritual", { detail: { type, ...detail } }));
      });
      for (const file of ["inventory.js", "app/achievements.js", "app/amulet.js", "app/reading.js", "app/controls.js", "app/feast.js", "app/shoujing.js", "app/sutra.js"]) await p.addScriptTag({ content: fs.readFileSync(path.join(ROOT, file), "utf8") });
      await p.evaluate(() => {
        window.templeAchievements.init(); bindAmuletOpenEvent(); bindAmuletEvents(); bindFeastEvents(); bindSutraEvents(); bindShoujingEvents(); bindKeyboardAndAvatarEvents(); bindModernUIShell();
        // 造型頁切換用與實際側欄相同的選項與顯隱規則，免建立分身。
        document.querySelectorAll('[data-studio-tab]').forEach(tab => tab.addEventListener('click', () => {
          document.querySelectorAll('[data-studio-tab]').forEach(b => b.classList.toggle('active', b === tab));
          document.querySelectorAll('[data-studio-page]').forEach(page => { page.hidden = page.dataset.studioPage !== tab.dataset.studioTab; });
        }));
        window.templeReading.init();
      });
      check("每個舊彈窗都有對話框語意與名稱", await p.evaluate(() => [...document.querySelectorAll('.modal-overlay')].every(m => { const d = m.querySelector('[role="dialog"]'); return d && (d.getAttribute('aria-label') || document.getElementById(d.getAttribute('aria-labelledby'))?.textContent.trim()); })));
      check("所有關閉圖示有說明文字", await p.evaluate(() => [...document.querySelectorAll('.modal-close')].every(b => b.getAttribute('aria-label')?.includes('關閉'))));
      check("九款靈符都是原生按鈕", await p.locator('button.amulet-card-item').count() === 9);
      const close = () => p.evaluate(() => document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open')));
      await p.evaluate(() => { document.getElementById('btnOpenPavilion').focus(); window.openAmuletModal(); });
      check("開窗焦點移入且背景不接受操作", await p.evaluate(() => document.getElementById('amuletModal').contains(document.activeElement) && document.getElementById('templeHeader').inert && window.keysReleased));
      await p.locator('[data-amulet="guanyin"]').focus(); await p.keyboard.press('Space');
      check("空白鍵選擇觀音符且不會誤敲木魚", await p.evaluate(() => selectedAmuletType === 'guanyin' && document.querySelector('[data-amulet="guanyin"]').getAttribute('aria-pressed') === 'true' && !window.accidentalMuyu));
      await p.locator('#btnEquipAmuletAura').evaluate(el => { el.parentElement.parentElement.style.display = 'block'; el.focus(); });
      await p.keyboard.press('Tab');
      check("Tab 在彈窗尾端循環回第一個控制項", await p.evaluate(() => document.activeElement.id === 'amuletModalClose'));
      await p.keyboard.press('Shift+Tab');
      check("Shift+Tab 在第一個控制項循環到尾端", await p.evaluate(() => document.activeElement.id === 'btnEquipAmuletAura'));
      await p.keyboard.press('Escape');
      check("Escape 呼叫既有關閉流程並返回開窗按鈕", await p.evaluate(() => !document.getElementById('amuletModal').classList.contains('open') && document.activeElement.id === 'btnOpenPavilion' && !document.getElementById('templeHeader').inert));

      for (const id of ['guanyin', 'guangong', 'tudigong']) {
        await p.evaluate(() => window.openAmuletModal()); await p.locator(`[data-amulet="${id}"]`).click();
        await p.fill('#txtAmuletPetitioner', '善信平安'); await p.fill('#txtAmuletWish', '闔家平安，出入順遂');
        const before = await p.evaluate(() => state.meritCount); await p.click('#btnConsecrateAmulet');
        check(`${id} 開光途中鎖定款式與姓名`, await p.evaluate(() => [...document.querySelectorAll('.amulet-card-item')].every(b => b.disabled) && document.getElementById('txtAmuletPetitioner').readOnly));
        await p.waitForFunction(() => !document.getElementById('btnConsecrateAmulet').disabled);
        check(`${id} 開光正確扣款、入袋、生成桌布`, await p.evaluate(({ id, before }) => state.meritCount === before - 20 && window.templeInventory.data.amulets.includes(id) && completedAmulet.type === id && document.getElementById('amuletPreviewCanvas').width === 720, { id, before }));
        await p.click('#btnEquipAmuletAura'); check(`${id} 佩戴的是開光完成的款式`, await p.evaluate(id => window.lastEquipped === id, id));
        const download = p.waitForEvent('download'); await p.click('#btnDownloadAmuletPng'); const result = await download;
        await result.saveAs(path.join(ROOT, '.test-cache', `amulet-${id}.png`));
        check(`${id} 桌布可下載且檔名正確`, result.suggestedFilename().includes(await p.evaluate(id => getAmuletName(id), id)) && result.suggestedFilename().endsWith('.png'));
        await close();
      }
      await p.evaluate(() => { state.meritCount = 19; window.openAmuletModal(); }); await p.click('#btnConsecrateAmulet');
      check("功德不足不扣款、不啟動儀式", await p.evaluate(() => state.meritCount === 19 && !document.getElementById('btnConsecrateAmulet').disabled)); await close();

      await p.evaluate(() => document.getElementById('feastModal').classList.add('open'));
      await p.locator('#feastSlot2').focus(); await p.keyboard.press('Enter');
      check("供盤可用鍵盤選擇", await p.evaluate(() => currentFeastSlot === 2 && document.getElementById('feastSlot2').getAttribute('aria-pressed') === 'true'));
      await p.evaluate(() => { document.getElementById('feastSlot2').focus(); document.getElementById('amuletModal').classList.add('open'); });
      await p.keyboard.press('Escape');
      check("關閉上層視窗後焦點回下層觸發位置", await p.evaluate(() => document.getElementById('feastModal').classList.contains('open') && document.activeElement.id === 'feastSlot2' && !document.getElementById('feastModal').inert)); await close();
      await p.evaluate(() => document.getElementById('avatarModal').classList.add('open'));
      await p.locator('[data-studio-tab="face"]').focus(); await p.keyboard.press('ArrowRight');
      check("造型分頁可用方向鍵切換並回報選取狀態", await p.evaluate(() => document.activeElement.dataset.studioTab === 'hair' && document.activeElement.getAttribute('aria-selected') === 'true' && !document.querySelector('[data-studio-page="hair"]').hidden));
      check("換裝側欄保留背景預覽操作", await p.evaluate(() => !document.getElementById('templeHeader').inert && document.querySelector('#avatarModal [role="dialog"]').getAttribute('aria-modal') === 'false')); await close();
      await p.locator('#deityDropdownBtn').focus(); await p.keyboard.press('ArrowDown');
      check("神尊下拉可用方向鍵開啟並移入選項", await p.evaluate(() => document.getElementById('deityDropdownBtn').getAttribute('aria-expanded') === 'true' && document.getElementById('deityDropdownMenu').contains(document.activeElement)));
      await p.keyboard.press('Escape'); check("下拉 Escape 返回按鈕", await p.evaluate(() => document.activeElement.id === 'deityDropdownBtn' && document.getElementById('deityDropdownBtn').getAttribute('aria-expanded') === 'false'));

      fs.mkdirSync(path.join(ROOT, '.test-cache'), { recursive: true });
      for (const viewport of [{ width: 390, height: 700 }, { width: 844, height: 390 }]) {
        await p.setViewportSize(viewport); await p.evaluate(() => window.templeReading.apply('large'));
        for (const name of ['amuletModal', 'settingsModal']) {
          await p.evaluate(name => document.getElementById(name).classList.add('open'), name);
          check(`${viewport.width} 大字 ${name} 無橫向溢出`, await p.evaluate(name => { const panel = document.querySelector(`#${name} .settings-modal`), r = panel.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1 && panel.scrollWidth <= panel.clientWidth + 2; }, name));
          if (viewport.width === 390 && name === 'amuletModal') await p.screenshot({ path: path.join(ROOT, '.test-cache', 'amulet-phone.png'), animations: 'disabled' });
          await close();
        }
      }
      check("介面操作沒有 JavaScript 錯誤", !errors.length, errors.join(' | '));
      const unnamed = await p.evaluate(() => [...document.querySelectorAll('[aria-label="設定選項"], [aria-label="操作按鈕"]')].map(el => el.id || el.className));
      check("舊圖示與欄位都有具體名稱", !unnamed.length, unnamed.join(', '));
      // 把實際模型用 Three.js 的 SVGRenderer 投影成八尊圖鑑，供人工目視檢查。
      const bundle = await build({ stdin: { contents: 'export * as THREE from "three"; export { SVGRenderer } from "three/examples/jsm/renderers/SVGRenderer.js";', resolveDir: ROOT }, absWorkingDir: ROOT, tsconfigRaw: {}, plugins: [{ name: 'local-three', setup(b) {
        b.onResolve({ filter: /^three$/ }, () => ({ path: path.join(ROOT, 'node_modules/three/build/three.module.js') }));
        b.onResolve({ filter: /^three\/examples\// }, args => ({ path: path.join(ROOT, 'node_modules', args.path) }));
        b.onResolve({ filter: /^\.\.?\// }, args => ({ path: path.resolve(args.resolveDir, args.path) }));
      } }], bundle: true, format: 'iife', globalName: 'TemplePreview', write: false });
      await p.setContent('<html lang="zh-TW"><body style="margin:0;background:#1b1614;color:#f5dcaa;font-family:Microsoft JhengHei,sans-serif"><h1 style="font-size:24px;text-align:center">八位神尊 · 獨立造型</h1><main style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:16px"></main></body></html>');
      await p.setViewportSize({ width: 1400, height: 980 }); await p.addScriptTag({ content: bundle.outputFiles[0].text });
      await p.addScriptTag({ content: 'window.THREE=TemplePreview.THREE; window.installTempleMixin=()=>{};' });
      await p.addScriptTag({ content: fs.readFileSync(path.join(ROOT, 'scene/deities.js'), 'utf8') });
      await p.evaluate(() => {
        const THREE = TemplePreview.THREE;
        for (const [id, name] of [['mazu','天上聖母'],['wenchang','文昌帝君'],['caishen','五路財神'],['yuelao','月下老人'],['guanyin','觀世音菩薩'],['guangong','關聖帝君'],['tudigong','福德正神'],['guaiguai','綠燈星君']]) {
          const card = document.createElement('article'); card.style.cssText='background:#302522;border:1px solid #745942;border-radius:12px;text-align:center;overflow:hidden';
          const title = document.createElement('h2'); title.style.cssText='font-size:19px;margin:12px 0 0'; title.textContent=name; card.append(title);
          const scene = new THREE.Scene(), model = createTempleDeity(id).group; scene.add(model);
          scene.add(new THREE.AmbientLight(0xffffff, 1.5)); const light=new THREE.DirectionalLight(0xfff1d0, 2); light.position.set(2,5,6); scene.add(light);
          const camera = new THREE.PerspectiveCamera(33, 320/390, 0.1, 20); camera.position.set(0.9,2.1,5.9); camera.lookAt(0,1.35,0);
          const renderer = new TemplePreview.SVGRenderer(); renderer.setSize(320,390); renderer.setQuality('low'); renderer.setClearColor(0x302522); renderer.render(scene,camera); card.append(renderer.domElement); document.querySelector('main').append(card);
        }
      });
      await p.screenshot({ path: path.join(ROOT, '.test-cache', 'deity-gallery.png'), fullPage: true });
      check("八尊實際模型可用 SVG 投影預覽", await p.locator('main svg').count() === 8);
    } finally { await browser.close(); }
  }
};
