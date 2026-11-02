// 神轎：平時停在東側不擋開場鏡頭；遶境移到中央、可鑽轎腳、回鑾後移回
const { launch, newContext, waitFor } = require("./helpers");

module.exports = {
  name: "神轎與開場視線",
  async run({ base, check }) {
    const browser = await launch();
    const ctx = await newContext(browser, { viewport: { width: 1280, height: 800 } });
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", e => errs.push(e.message));
    await p.goto(base);
    await p.waitForTimeout(3000);

    const pos = () => p.evaluate(() => window.temple3d.palanquinGroup.position.toArray().map(n => +n.toFixed(2)));
    // 從鏡頭往畫面下半部打一條射線，看第一個碰到的實體是不是神轎
    const palanquinBlocksView = () => p.evaluate(() => {
      const t = window.temple3d, rc = new THREE.Raycaster();
      rc.setFromCamera(new THREE.Vector2(0, -0.5), t.camera);
      const h = rc.intersectObjects(t.scene.children, true).find(i => !i.object.isPoints && i.object.visible);
      let o = h && h.object;
      while (o) { if (o === t.palanquinGroup) return true; o = o.parent; }
      return false;
    });

    check("開場鏡頭不被神轎擋住", !(await palanquinBlocksView()));
    let ps = await pos();
    check("平時停在御道東側", ps[0] === 3.8 && ps[2] === 9, JSON.stringify(ps));

    await p.evaluate(() => window.temple3d.startParade());
    const centered = await waitFor(async () => { const q = await pos(); return Math.abs(q[0]) < 0.3 && q[2] > 9; }, { timeout: 8000 });
    check("起駕後移到中央御道並前進", centered, JSON.stringify(await pos()));

    await p.evaluate(() => { const t = window.temple3d; t.avatar.position.set(0, 0, t.palanquinGroup.position.z + 3); });
    check("神轎經過時會鑽轎腳", await waitFor(() => p.evaluate(() => window.temple3d.hasKneeledUnderPalanquin), { timeout: 8000 }));

    // 快轉到回程尾聲
    await p.evaluate(() => { const t = window.temple3d; t.paradeDirection = -1; t.palanquinGroup.position.z = 10.5; });
    const back = await waitFor(async () => !(await p.evaluate(() => window.temple3d.isParading)) && (await pos())[0] > 3.5, { timeout: 10000 });
    check("回鑾後結束遶境並移回東側", back, JSON.stringify(await pos()));
    check("沒有 JS 錯誤", errs.length === 0, errs.join(" | "));
    await browser.close();
  }
};
