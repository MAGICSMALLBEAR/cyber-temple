const fs = require("fs");
const path = require("path");
const { launch, newContext, waitFor, ROOT } = require("./helpers");

// 截圖是版面驗收附件，使用當下已載入的字型；不等候外部 Google 字型下載。
async function capture(page, filename) {
  const previous = process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY;
  process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = "1";
  try {
    await page.screenshot({ path: path.join(ROOT, ".test-cache", filename), animations: "disabled" });
  } finally {
    if (previous === undefined) delete process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY;
    else process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = previous;
  }
}

module.exports = {
  name: "大殿布置與互動",
  async run({ base, check }) {
    const browser = await launch();
    const ctx = await newContext(browser, { viewport: { width: 1400, height: 900 } });
    const p = await ctx.newPage();
    const errors = [];
    p.on("pageerror", e => errors.push(e.message));
    await p.goto(base);
    check("大殿具有匾額、對聯、兩位護法與兩個拜墊", await p.evaluate(() => {
      const t = window.temple3d;
      return t.hallInterior.getObjectByName("mainHallPlaque") && t.hallInterior.children.filter(o => o.name === "hallCouplet").length === 2 && t.hallGuardians.length === 2 && t.prayerMats.length === 2;
    }));
    await p.evaluate(() => {
      const t = window.temple3d;
      t.avatar.position.set(-1.35, 0, 3.1);
    });
    await p.focus("body");
    await p.keyboard.press("KeyE");
    await p.waitForTimeout(1300);
    check("拜墊可持續跪坐，身體站在墊面高度", await p.evaluate(() => window.temple3d.avatar.currentAction === "kneelSit" && window.temple3d.avatar.position.y > 0.12));
    const other = await ctx.newPage();
    await other.goto(base);
    check("同行也看得到拜墊上的跪坐姿勢", await waitFor(() => other.evaluate(() => [...window.temple3d.avatar.peers.values()].some(peer => peer.action === "kneelSit")), { timeout: 12000 }));
    check("同行跪坐時也保持墊面高度", await waitFor(() => other.evaluate(() => [...window.temple3d.avatar.peers.values()].some(peer => peer.action === "kneelSit" && peer.targetPos.y > 0.12 && peer.group.position.y > -0.08)), { timeout: 5000 }));
    await other.close();
    await p.keyboard.press("KeyE");
    check("再按互動可起身", await p.evaluate(() => window.temple3d.avatar.currentAction === "idle"));
    await p.evaluate(() => { window.temple3d.triggerNearbyInteraction(); window.temple3d.avatar.keys.backward = true; });
    await p.waitForTimeout(350);
    check("開始走路會結束跪坐", await p.evaluate(() => { const a = window.temple3d.avatar; a.keys.backward = false; return a.currentAction !== "kneelSit"; }));

    await p.evaluate(() => { const t = window.temple3d; t.avatar.position.set(-2.8, 0, 3.85); t.triggerNearbyInteraction(); window.addMerit(100 - state.meritCount); });
    check("走近香油箱能開啟奉獻視窗", await p.$eval("#donationModal", e => e.classList.contains("open")));
    await p.evaluate(() => window.hallActivities.refresh());
    await p.click('[data-donation="30"]');
    check("奉獻扣除功德並保存累計", await p.evaluate(() => state.meritCount === 70 && localStorage.getItem("temple_donation_total") === "30"));
    await p.evaluate(() => window.hallActivities.donate(100));
    check("功德不足不超扣", await p.evaluate(() => state.meritCount === 70 && localStorage.getItem("temple_donation_total") === "30"));
    await p.click("#donationModalClose");
    await p.evaluate(() => {
      const t = window.temple3d;
      t.camera.position.set(0, 3.4, 7.8);
      t.camera.lookAt(-2.8, 0.6, 3);
      t.camera.updateMatrixWorld(true);
      const point = new THREE.Vector3(-2.8, 0.6, 3).project(t.camera);
      const r = t.renderer.domElement.getBoundingClientRect();
      t.mouse.set(1, 1); // 不靠 hover 更新座標
      t.onClick({ clientX: r.left + (point.x + 1) * r.width / 2, clientY: r.top + (1 - point.y) * r.height / 2 });
    });
    check("沒有先移動滑鼠也能點到香油箱", await p.$eval("#donationModal", e => e.classList.contains("open")));
    await p.click("#donationModalClose");
    await p.evaluate(() => { const t = window.temple3d; t.avatar.position.set(2.8, 0, 3.85); t.triggerNearbyInteraction(); });
    check("籤詩櫃開啟求籤紀錄", await p.$eval("#passportModal", e => e.classList.contains("open")));
    await p.evaluate(() => document.getElementById("passportModal").classList.remove("open"));
    check("櫃體不能穿過，拜墊可走上去", await p.evaluate(() => { const t = window.temple3d; return t.isBlockedAt(-2.8, 3) && t.isBlockedAt(2.8, 3) && !t.isBlockedAt(-1.35, 2.65); }));

    // 保存實際渲染的大殿畫面，供人工目視驗收。
    await p.evaluate(() => {
      const t = window.temple3d;
      t.setShichen("noon");
      t.followAvatar = false;
      t.targetCameraPos = new THREE.Vector3(0, 4.4, 11.8);
      t.targetLookAt = new THREE.Vector3(0, 2.3, -0.7);
      t.camera.position.set(0, 4.4, 11.8);
      t.controls.target.set(0, 2.3, -0.7);
      t.controls.update();
      document.body.classList.add("hud-hidden");
      t.renderer.render(t.scene, t.camera);
    });
    await p.waitForTimeout(300);
    fs.mkdirSync(path.join(ROOT, ".test-cache"), { recursive: true });
    await capture(p, "hall-interior.png");
    const phone = await newContext(browser, { viewport: { width: 390, height: 700 }, hasTouch: true, isMobile: true });
    const ph = await phone.newPage();
    await ph.goto(base);
    await ph.click("#btnPilgrimPrimary");
    check("手機的參拜指引可操作，沒有遮住搖桿與主要動作", await ph.evaluate(() => {
      const r = document.getElementById("pilgrimCard").getBoundingClientRect();
      const overlap = [...document.querySelectorAll("#virtualJoystickZone, .temple-dock-container button, .avatar-action-bar button")].some(b => {
        const q = b.getBoundingClientRect();
        return q.width && q.height && !(q.right <= r.left || q.left >= r.right || q.bottom <= r.top || q.top >= r.bottom);
      });
      return r.left >= 0 && r.right <= innerWidth && r.bottom < innerHeight && !overlap;
    }));
    await capture(ph, "pilgrimage-phone.png");
    check("沒有 JavaScript 錯誤", errors.length === 0, errors.join(" | "));
    await browser.close();
  }
};
