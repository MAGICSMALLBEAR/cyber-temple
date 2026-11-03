// VR 模式（第一階段）：一般瀏覽器不顯示按鈕；偵測到頭盔才顯示；進出 VR 時鏡頭、分身、滑鼠視角的切換與還原
// 測試環境沒有實體頭盔，進入與離開以直接呼叫 sessionstart／sessionend 的處理函式模擬
const { launch, newContext } = require("./helpers");

module.exports = {
  name: "VR 模式",
  async run({ base, check }) {
    const browser = await launch();

    // --- 一般瀏覽器：沒有 VR 按鈕，主迴圈照常運作 ---
    const ctx = await newContext(browser);
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", e => errs.push(e.message));
    await p.goto(base);
    await p.waitForTimeout(800);
    check("沒有頭盔時不顯示 VR 按鈕", await p.evaluate(() => document.getElementById("btnEnterVR").hidden));
    const frames = await p.evaluate(() => new Promise(r => {
      const f0 = window.temple3d.renderer.info.render.frame;
      setTimeout(() => r(window.temple3d.renderer.info.render.frame - f0), 1500);
    }));
    check("改用 setAnimationLoop 後畫面持續更新", frames > 3, `1.5 秒 ${frames} 格`);
    check("WebXR 已啟用", await p.evaluate(() => window.temple3d.renderer.xr.enabled && window.temple3d.xrDolly.parent === window.temple3d.scene));

    // --- 模擬進入／離開 VR ---
    const before = await p.evaluate(() => {
      const t = window.temple3d;
      return { pos: t.camera.position.toArray(), avatar: t.avatar.playerGroup.visible };
    });
    const inXR = await p.evaluate(() => {
      const t = window.temple3d;
      t.onXRSessionStart();
      return {
        isXR: t.isXR,
        parent: t.camera.parent === t.xrDolly,
        dolly: t.xrDolly.position.toArray(),
        avatar: t.avatar.playerGroup.visible,
        controls: t.controls.enabled,
        body: document.body.classList.contains("xr-active")
      };
    });
    check("進入 VR：鏡頭放進大殿正中的載具", inXR.isXR && inXR.parent && inXR.dolly.join() === "0,0,3.4", inXR.dolly.join());
    check("進入 VR：隱藏自己的分身、停用滑鼠視角", !inXR.avatar && !inXR.controls && inXR.body);

    // VR 中走動分身、切換視角都不能改到鏡頭（鏡頭交給頭盔）
    await p.evaluate(() => {
      const t = window.temple3d;
      t.avatar.position.x += 1.5;
      t.avatar.position.z -= 1.0;
      t.setCameraView("overview");
    });
    await p.waitForTimeout(800);
    const cameraLocal = await p.evaluate(() => window.temple3d.camera.position.toArray());
    check("VR 中主迴圈不移動鏡頭", cameraLocal.every(v => Math.abs(v) < 1e-6), cameraLocal.map(v => v.toFixed(3)).join(","));

    const after = await p.evaluate(() => {
      const t = window.temple3d;
      t.onXRSessionEnd();
      return { isXR: t.isXR, parent: t.camera.parent === t.scene, pos: t.camera.position.toArray(), avatar: t.avatar.playerGroup.visible, controls: t.controls.enabled, body: document.body.classList.contains("xr-active") };
    });
    check("離開 VR：鏡頭回到原本位置", !after.isXR && after.parent && after.pos.every((v, i) => Math.abs(v - before.pos[i]) < 0.05));
    check("離開 VR：分身與滑鼠視角恢復", after.avatar === before.avatar && after.controls && !after.body);
    check("沒有 JS 錯誤", errs.length === 0, errs.join(" | "));

    // --- 模擬偵測到頭盔：按鈕出現；頭盔連不上時顯示提示而不是出錯 ---
    const ctx2 = await newContext(browser);
    await ctx2.addInitScript(() => {
      Object.defineProperty(navigator, "xr", {
        configurable: true,
        value: {
          isSessionSupported: async mode => mode === "immersive-vr",
          requestSession: async () => { throw new Error("模擬：頭盔未連線"); },
          addEventListener() {}, removeEventListener() {}
        }
      });
    });
    const q = await ctx2.newPage();
    const errs2 = [];
    q.on("pageerror", e => errs2.push(e.message));
    await q.goto(base);
    await q.waitForTimeout(800);
    check("偵測到頭盔時顯示 VR 按鈕", await q.evaluate(() => !document.getElementById("btnEnterVR").hidden));
    await q.click("#btnEnterVR");
    await q.waitForTimeout(500);
    check("頭盔連不上時顯示提示", (await q.$eval("#dockStatusBar", e => e.textContent)).includes("無法進入 VR"));
    check("頭盔連不上時沒有 JS 錯誤", errs2.length === 0, errs2.join(" | "));
    await browser.close();
  }
};
