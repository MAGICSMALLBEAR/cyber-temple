// 3D 模型載入：空清單不影響、正常模型依高度放置、失敗時保留程式模型、檔名限制
const { launch, newContext, waitFor } = require("./helpers");

// 手工組一個最小的 .glb：長方體，寬 1、高 4、深 1，刻意不貼地、不置中
function makeBoxGlb() {
  const p = [];
  for (const x of [3, 4]) for (const y of [5, 9]) for (const z of [-1, 0]) p.push(x, y, z);
  const idx = [0, 1, 3, 0, 3, 2, 4, 6, 7, 4, 7, 5, 0, 4, 5, 0, 5, 1, 2, 3, 7, 2, 7, 6, 0, 2, 6, 0, 6, 4, 1, 5, 7, 1, 7, 3];
  const pos = Buffer.from(new Float32Array(p).buffer), ind = Buffer.from(new Uint16Array(idx).buffer);
  const bin = Buffer.concat([pos, ind, Buffer.alloc((4 - (pos.length + ind.length) % 4) % 4)]);
  const json = {
    asset: { version: "2.0" }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] }],
    materials: [{ pbrMetallicRoughness: { baseColorFactor: [0.8, 0.6, 0.2, 1] } }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 8, type: "VEC3", min: [3, 5, -1], max: [4, 9, 0] },
      { bufferView: 1, componentType: 5123, count: idx.length, type: "SCALAR" }
    ],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: pos.length }, { buffer: 0, byteOffset: pos.length, byteLength: ind.length }],
    buffers: [{ byteLength: bin.length }]
  };
  let text = Buffer.from(JSON.stringify(json));
  text = Buffer.concat([text, Buffer.alloc((4 - text.length % 4) % 4, 0x20)]);
  const head = Buffer.alloc(12), jh = Buffer.alloc(8), bh = Buffer.alloc(8);
  head.write("glTF", 0, "ascii"); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + text.length + 8 + bin.length, 8);
  jh.writeUInt32LE(text.length, 0); jh.write("JSON", 4, "ascii");
  bh.writeUInt32LE(bin.length, 0); bh.write("BIN\0", 4, "ascii");
  return Buffer.concat([head, jh, text, bh, bin]);
}

module.exports = {
  name: "3D 模型載入",
  async run({ base, check }) {
    const browser = await launch();

    // --- 空清單：什麼都不變 ---
    const emptyCtx = await newContext(browser);
    await emptyCtx.route("**/models/manifest.json", route => route.fulfill({ contentType: "application/json", body: '{"models":[]}' }));
    const empty = await emptyCtx.newPage();
    const emptyErrs = [];
    empty.on("pageerror", e => emptyErrs.push(e.message));
    await empty.goto(base);
    const idle = await waitFor(() => empty.evaluate(() => Array.isArray(temple3d.templeModels) ? { n: temple3d.templeModels.length, lib: !!THREE.GLTFLoader, censer: temple3d.heavenCenser.visible } : null));
    check("打包內含 GLTFLoader", idle?.lib === true);
    check("空清單不載入任何模型", idle?.n === 0);
    check("空清單時原本的天公爐照常顯示", idle?.censer === true);
    check("空清單沒有 JS 錯誤", emptyErrs.length === 0, emptyErrs.join(" | "));
    await empty.context().close();

    // --- 有內容的清單：成功、檔案壞掉、找不到檔案、不合法檔名 ---
    const ctx = await newContext(browser);
    const requested = [];
    await ctx.route("**/models/**", route => {
      const url = route.request().url(); requested.push(url);
      if (url.endsWith("manifest.json")) return route.fulfill({ contentType: "application/json", body: JSON.stringify({ models: [
        { file: "box.glb", replace: "heavenCenser", height: 2 },
        { file: "box.glb", deity: "mazu", height: 2.3 },
        { file: "box.glb", position: [6, 0, 21], height: 1, collision: false },
        { file: "broken.glb", replace: "jossFurnace", height: 3 },
        { file: "missing.glb", replace: "wishingPond", height: 3 },
        { file: "../secret.glb", position: [0, 0, 0] },
        { file: "http://example.com/x.glb", position: [0, 0, 0] },
        { file: "box.glb", replace: "不存在的物件" },
        { file: "box.glb", replace: "muyu", height: 0.3 },
        { file: "box.glb", replace: "prayerMat", height: 0.2, replaceAll: true, collision: false }
      ] }) });
      if (url.endsWith("box.glb")) return route.fulfill({ contentType: "model/gltf-binary", body: makeBoxGlb() });
      if (url.endsWith("broken.glb")) return route.fulfill({ contentType: "model/gltf-binary", body: Buffer.from("這不是模型") });
      return route.fulfill({ status: 404, body: "" });
    });
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", e => errs.push(e.message));
    await p.goto(base);
    const done = await waitFor(() => p.evaluate(() => (temple3d.templeModels || []).length === 10 && temple3d.templeModels.every(m => m.status === "loaded" || m.status === "failed")), { timeout: 30000 });
    check("十筆清單都處理完", !!done);

    const r = await p.evaluate(() => {
      const t = temple3d, models = t.templeModels, ok = models.filter(m => m.status === "loaded");
      const box = o => { o.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(o), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3()); return { h: s.y, min: b.min.y, x: c.x, z: c.z }; };
      const censer = box(ok[0].object);
      return {
        status: models.map(m => m.status), censer,
        censerHidden: t.heavenCenser.getObjectByName("heavenCenserBowl")?.visible === false || (() => { let shown = 0; t.heavenCenser.traverse(o => { if (o.isMesh && o.visible && !/heavenCenser(Stick|Ember)/.test(o.name)) shown++; }); return shown === 0; })(),
        censerEffectsKept: ["heavenCenserStick", "heavenCenserEmber"].every(n => { const o = t.heavenCenser.getObjectByName(n); if (!o) return false; for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; }),
        muyu: box(ok[3].object), muyuTableY: (() => { const v = new THREE.Vector3(); t.scene.getObjectByName("muyu").getWorldPosition(v); return v.y; })(),
        mats: t.scene.children.filter(o => o.name.startsWith("model-box.glb") && o !== ok[0].object && o !== ok[2].object && o !== ok[3].object).length,
        matsHidden: (() => { const list = []; t.scene.traverse(o => { if (o.name === "prayerMat") list.push(o); }); return list.length === 2 && list.every(g => { let shown = 0; g.traverse(o => { if (o.isMesh && o.visible) shown++; }); return shown === 0; }); })(),
        censerStillClickable: t.interactiveObjects.some(o => o.userData?.type === "heavenCenser"),
        censerCollision: t.collisionBoxes.some(b => b.minX < 0 && b.maxX > 0 && b.minZ < 11.5 && b.maxZ > 11.5),
        furnaceKept: t.jossFurnace.visible === true, pondKept: t.wishingPond.visible === true,
        free: box(ok[2].object), freeNoCollision: !t.collisionBoxes.some(b => b.minX < 6 && b.maxX > 6 && b.minZ < 21 && b.maxZ > 21),
        errors: models.map(m => m.error)
      };
    });
    check("五筆正常模型載入成功，其餘失敗", r.status.filter(s => s === "loaded").length === 5, r.status.join(","));
    check("依指定高度縮放", Math.abs(r.censer.h - 2) < 0.01, String(r.censer.h));
    check("底部貼地", Math.abs(r.censer.min) < 0.01, String(r.censer.min));
    check("置中在被取代物件的位置", Math.abs(r.censer.x) < 0.01 && Math.abs(r.censer.z - 11.5) < 0.01, `${r.censer.x},${r.censer.z}`);
    check("原物件的實體部分隱藏", r.censerHidden);
    check("原物件的大香與火光保留可見", r.censerEffectsKept);
    check("桌上物件沿用原本高度，不會掉到地上", r.muyuTableY > 1 && Math.abs(r.muyu.min - r.muyuTableY) < 0.01, `${r.muyu.min} / ${r.muyuTableY}`);
    check("replaceAll 換掉所有同名物件", r.mats === 2 && r.matsHidden, `${r.mats}`);
    check("原物件的點選互動保留", r.censerStillClickable);
    check("替換後碰撞改由模型提供", r.censerCollision);
    check("自由放置的位置正確", Math.abs(r.free.x - 6) < 0.01 && Math.abs(r.free.z - 21) < 0.01 && Math.abs(r.free.h - 1) < 0.01, JSON.stringify(r.free));
    check("collision:false 不擋路", r.freeNoCollision);
    check("檔案壞掉時保留原本的金爐", r.furnaceKept);
    check("找不到檔案時保留原本的蓮花池", r.pondKept);
    check("含路徑的檔名不發出請求", !requested.some(u => u.includes("secret")));
    check("外部網址不發出請求", !requested.some(u => u.includes("example.com")));
    check("失敗原因有記錄", r.errors[5].includes("檔名") && r.errors[7].includes("不存在的物件"), r.errors.join(" / "));

    const deity = await p.evaluate(() => {
      const t = temple3d, model = t.templeModels.filter(m => m.status === "loaded")[1].object;
      const a = { model: model.visible, statue: t.deityModel.visible };
      t.switchDeityStatue("guanyin");
      const b = { model: model.visible, statue: t.deityModel.visible };
      t.switchDeityStatue("mazu");
      const c = { model: model.visible, statue: t.deityModel.visible };
      return { a, b, c };
    });
    check("媽祖有模型時顯示模型", deity.a.model && !deity.a.statue);
    check("切到沒有模型的神尊時回到程式神像", !deity.b.model && deity.b.statue);
    check("切回媽祖再顯示模型", deity.c.model && !deity.c.statue);
    const shading = await p.evaluate(() => { let mesh; temple3d.templeModels.find(m => m.status === "loaded").object.traverse(o => { if (o.isMesh) mesh = o; }); return { normal: !!mesh.geometry.attributes.normal, flat: [].concat(mesh.material).some(m => m.flatShading) }; });
    check("沒有法線的模型自動補上平滑法線", shading.normal && !shading.flat, JSON.stringify(shading));
    check("過程沒有 JS 錯誤", errs.length === 0, errs.join(" | "));
    await ctx.close();

    // --- 神像延後下載：切換到哪尊才下載哪尊 ---
    const lazyCtx = await newContext(browser);
    const hits = {};
    await lazyCtx.route("**/models/**", async route => {
      const name = route.request().url().split("/").pop();
      hits[name] = (hits[name] || 0) + 1;
      if (name === "manifest.json") return route.fulfill({ contentType: "application/json", body: JSON.stringify({ models: [
        { file: "mazu.glb", deity: "mazu", height: 2.3 },
        { file: "guanyin.glb", deity: "guanyin", height: 2.3 },
        { file: "slow.glb", deity: "yuelao", height: 2.3 },
        { file: "broken.glb", deity: "wenchang", height: 2.3 },
        { file: "mazu-dup.glb", deity: "mazu", height: 2.3 }
      ] }) });
      if (name === "slow.glb") await new Promise(r => setTimeout(r, 1500));
      if (name === "broken.glb") return route.fulfill({ contentType: "model/gltf-binary", body: Buffer.from("這不是模型") });
      return route.fulfill({ contentType: "model/gltf-binary", body: makeBoxGlb() });
    });
    const lp = await lazyCtx.newPage();
    const lazyErrs = [];
    lp.on("pageerror", e => lazyErrs.push(e.message));
    await lp.goto(base);
    await waitFor(() => lp.evaluate(() => temple3d.deityModelMap?.has("mazu") === true));
    const start = await lp.evaluate(() => ({ statue: temple3d.deityModel.visible, model: temple3d.deityModelMap.get("mazu").visible, status: temple3d.templeModels.map(m => m.status) }));
    check("開場載入目前供奉的媽祖模型", start.model && !start.statue);
    check("開場不下載其他神尊的模型", !hits["guanyin.glb"] && !hits["slow.glb"] && !hits["broken.glb"], JSON.stringify(hits));
    check("同一尊重複登記只用第一筆", !hits["mazu-dup.glb"] && start.status[4] === "failed", start.status.join(","));

    await lp.evaluate(() => temple3d.switchDeityStatue("guanyin"));
    const guanyin = await waitFor(() => lp.evaluate(() => {
      const m = temple3d.deityModelMap.get("guanyin");
      return m?.visible ? { statue: temple3d.deityModel.visible, mazu: temple3d.deityModelMap.get("mazu").visible } : null;
    }));
    check("切到觀音才下載並顯示觀音模型", !!guanyin && !guanyin.statue && !guanyin.mazu && hits["guanyin.glb"] === 1);

    // 下載途中切走：載完也不能出現在別的神尊身上
    await lp.evaluate(() => { temple3d.switchDeityStatue("yuelao"); temple3d.switchDeityStatue("caishen"); });
    await waitFor(() => lp.evaluate(() => temple3d.deityModelMap.has("yuelao")), { timeout: 10000 });
    const away = await lp.evaluate(() => ({ yuelao: temple3d.deityModelMap.get("yuelao").visible, statue: temple3d.deityModel.visible, deity: temple3d.deityModel.userData.deity }));
    check("下載途中切走，載完不會錯放", !away.yuelao && away.statue && away.deity === "caishen", JSON.stringify(away));
    const back = await lp.evaluate(() => { temple3d.switchDeityStatue("yuelao"); return { model: temple3d.deityModelMap.get("yuelao").visible, statue: temple3d.deityModel.visible }; });
    check("切回月老直接顯示已下載的模型，不重複下載", back.model && !back.statue && hits["slow.glb"] === 1);

    await lp.evaluate(() => temple3d.switchDeityStatue("wenchang"));
    await waitFor(() => lp.evaluate(() => temple3d.templeModels[3].status === "failed"));
    await lp.evaluate(() => { temple3d.switchDeityStatue("mazu"); temple3d.switchDeityStatue("wenchang"); });
    await new Promise(r => setTimeout(r, 300));
    const broken = await lp.evaluate(() => ({ statue: temple3d.deityModel.visible, error: temple3d.templeModels[3].error }));
    check("神像模型壞掉時保留程式神像並記錄原因", broken.statue && !!broken.error, broken.error);
    check("壞掉的神像模型不重複下載", hits["broken.glb"] === 1, String(hits["broken.glb"]));
    check("延後下載過程沒有 JS 錯誤", lazyErrs.length === 0, lazyErrs.join(" | "));
    await browser.close();
  }
};
