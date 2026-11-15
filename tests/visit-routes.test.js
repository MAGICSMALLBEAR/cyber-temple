const { makeEnvironment } = require("./light-env");
module.exports = {
  name: "地圖站位與實際碰撞（無繪圖）",
  async run({ check, note }) {
    const THREE = await import("three"), env = makeEnvironment(THREE), c = env.context;
    for (const file of ["scene/core.js", "scene/architecture.js", "scene/temple-visuals.js", "scene/deities.js", "scene/seasonal.js", "scene/offering-models.js", "scene/altar.js", "scene/courtyard.js", "scene/halls.js", "scene/festival.js", "scene/service.js", "scene/interior.js", "scene/market.js", "scene/temple-plaza.js", "scene/hostel.js", "scene/collision.js", "app/visit.js"]) env.load(file);
    const Scene = c.Temple3DScene, init = Scene.prototype.init;
    Scene.prototype.init = function() { this.scene = new THREE.Scene(); };
    const scene = new Scene("canvas3dContainer"); Scene.prototype.init = init;
    for (const name of ["buildTempleArchitecture", "buildCourtyard", "buildTempleVisuals", "buildAltarAndDeity", "buildCenser", "buildBwaBwei", "buildChiamBucket", "buildMuyu", "buildOfferings", "buildLanternPagodas", "buildServiceDesk", "buildHallInterior", "buildNightMarket", "buildTemplePlaza", "buildHostelZone"]) scene[name]();
    scene.buildCollisionMap();
    const count = scene.collisionBoxes.length;
    check("天空與遠方地面不列入碰撞", !scene.collisionBoxes.some(b => ["skyDome", "distantLand"].includes(b.name)));
    check("大殿兩側山牆會擋路", scene.collisionBoxes.filter(b => b.name === "hallSideWall").length === 2);
    check("屋頂與天花不列入碰撞", !scene.collisionBoxes.some(b => /Roof|Ceiling/.test(b.name)));
    check("大殿正門維持可通行", !scene.isBlockedAt(0, 5.9, 0.36) && !scene.isBlockedAt(2.8, 6.2, 0.36));
    for (const theme of ["newyear", "lantern", "moon", "birthday", "none"]) {
      scene.applySeasonalScene(theme); scene.buildCollisionMap();
      check(`${theme} 換裝不改變整座廟區碰撞`, scene.collisionBoxes.length === count);
    }
    let matches = true;
    for (let x = -17.5; x < 17.5; x += 1.25) for (let z = -2.5; z < 41.5; z += 1.25) {
      for (const radius of [0.28, 0.36, 0.6]) {
        const full = scene.collisionBoxes.some(b => {
          const dx = x - Math.max(b.minX, Math.min(x, b.maxX)), dz = z - Math.max(b.minZ, Math.min(z, b.maxZ));
          return dx * dx + dz * dz < radius * radius;
        });
        if (full !== scene.isBlockedAt(x, z, radius)) matches = false;
      }
    }
    check("碰撞索引與完整模型掃描結果一致", matches);
    scene.avatar = { position: new THREE.Vector3(0, 0, 4), playerGroup: new THREE.Group() };
    c.temple3d = scene;
    c.pilgrimage = { goTo(step, points) { this.route = { step, points, index: 0 }; } };
    let walked = 0;
    for (const target of c.templeVisit.targets().filter(t => t.map)) {
      const routed = c.templeVisit.go(target.id), r = c.pilgrimage.route;
      check(`地圖前往${target.title}能找到通路`, routed, routed ? "" : "無安全站位");
      if (!routed) continue;
      const [x, z] = r.step.spot;
      check(`${target.title}抵達後的 E 互動與目標一致`, c.templeVisit.nearby(scene, { x, z })?.id === target.id);
      let previous = [scene.avatar.position.x, scene.avatar.position.z], safe = true;
      for (const point of r.points) {
        const n = Math.max(1, Math.ceil(Math.hypot(point[0] - previous[0], point[1] - previous[1]) / 0.08));
        for (let i = 1; i <= n; i++) if (scene.isBlockedAt(previous[0] + (point[0] - previous[0]) * i / n, previous[1] + (point[1] - previous[1]) * i / n)) safe = false;
        previous = point;
      }
      check(`${target.title}路線不穿過實體模型`, safe); walked++;
    }
    check("已檢查至少十五個地圖地點", walked >= 15, `${walked} 個`);
    check("目的地在實體內時直接拒絕", scene.findWalkRoute([0, 4], [0, -0.6]).length === 0);

    // --- 分區邊界、群組切換與香客大樓真實分區驗證 ---
    check("本殿世界群組已抽離且天空仍在場景根層", scene.templeWorldGroup === scene.getZoneGroup("temple") && scene.templeWorldGroup.children.length > 0 && scene.scene.children.some(o => o.name === "skyDome"));
    check("統一分區邊界判定大殿與廟埕正確", scene.inZoneBounds(3.8, 4) && !scene.inZoneBounds(4.2, 4) && scene.inZoneBounds(17, 20) && !scene.inZoneBounds(0, 42));
    const [cx1, cz1] = scene.clampToZone(10, 4), [cx2, cz2] = scene.clampToZone(20, 45);
    check("統一分區邊界夾緊座標正確", cx1 === 3.8 && cz1 === 4 && cx2 === 17.5 && cz2 === 41.5);

    const templeTargetsBefore = scene.getInteractiveTargets();
    check("本殿分區下不應點到香客大樓內部物件", templeTargetsBefore.some(o => o.userData?.type === "hostelGate") && !templeTargetsBefore.some(o => o.userData?.type === "hostelSpot"));

    let addedMerit = 0;
    c.addMerit = n => { addedMerit += n; };
    scene.enterHostelZone();
    const hostelGroup = scene.getZoneGroup("hostel");
    check("傳送進香客大樓後隱藏本殿並顯示旅宿群組", scene.currentZone === "hostel" && !scene.templeWorldGroup.visible && hostelGroup.visible);
    check("傳送進香客大樓後不殘留本殿牆面/水面碰撞與拜墊高度面",
      !scene.collisionBoxes.some(b => ["hallSideWall", "pondWater"].includes(b.name)) && scene.collisionBoxes.some(b => b.name === "hostelCounterBody") && scene.walkSurfaces.length === 0,
      `boxes=${scene.collisionBoxes.map(b => b.name).slice(0, 6).join(",")}, surfaces=${scene.walkSurfaces.length}`);
    const hostelTargets = scene.getInteractiveTargets();
    check("旅宿分區下射線僅包含旅宿互動點", hostelTargets.length === 5 && hostelTargets.every(o => o.userData?.type === "hostelSpot"));
    check("旅宿分區內本殿山門座標不出現 E 互動提示", c.templeVisit.nearby(scene, { x: 0, z: 38.0 }) === null);
    check("旅宿分區尋路套用旅宿邊界", scene.inZoneBounds(8, 8) && !scene.inZoneBounds(12, 0) && !scene.inZoneBounds(0, 15));

    let hostelWalked = 0;
    for (const target of c.templeVisit.targets().filter(t => t.zone === "hostel" && t.map)) {
      const routed = c.templeVisit.go(target.id), r = c.pilgrimage.route;
      check(`旅宿前往${target.title}能找到通路`, routed, routed ? "" : "無安全站位");
      if (!routed) continue;
      const [hx, hz] = r.step.spot;
      check(`旅宿${target.title}抵達後 E 互動與目標一致`, c.templeVisit.nearby(scene, { x: hx, z: hz })?.id === target.id);
      let prev = [scene.avatar.position.x, scene.avatar.position.z], safe = true;
      for (const pt of r.points) {
        const n = Math.max(1, Math.ceil(Math.hypot(pt[0] - prev[0], pt[1] - prev[1]) / 0.08));
        for (let i = 1; i <= n; i++) if (scene.isBlockedAt(prev[0] + (pt[0] - prev[0]) * i / n, prev[1] + (pt[1] - prev[1]) * i / n)) safe = false;
        prev = pt;
      }
      check(`旅宿${target.title}路線不穿過牆壁與傢俱`, safe);
      hostelWalked++;
    }
    check("已檢查旅宿全數五個地圖地點", hostelWalked === 5, `${hostelWalked} 個`);
    check("旅宿內喝茶/休憩互動每日首次可獲功德且不重複給分",
      scene.interactWithHostelSpot("hostelTea") && scene.interactWithHostelSpot("hostelTea") && scene.interactWithHostelSpot("hostelBed") && addedMerit === 2,
      `addedMerit=${addedMerit}`);

    scene.exitHostelZone();
    check("返回本殿後恢復本殿碰撞、隱藏旅宿並回到入口前方", scene.currentZone === "temple" && scene.templeWorldGroup.visible && !hostelGroup.visible && scene.collisionBoxes.length === count && scene.walkSurfaces.length > 0 && Math.hypot(scene.avatar.position.x - 13.6, scene.avatar.position.z - 19.2) < 0.05);

    note("只建立 Three.js 幾何與碰撞方塊，未建立渲染器、瀏覽器或動畫迴圈。");
  }
};
