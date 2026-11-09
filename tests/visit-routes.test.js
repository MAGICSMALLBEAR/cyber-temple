const { makeEnvironment } = require("./light-env");
module.exports = {
  name: "地圖站位與實際碰撞（無繪圖）",
  async run({ check, note }) {
    const THREE = await import("three"), env = makeEnvironment(THREE), c = env.context;
    for (const file of ["scene/core.js", "scene/architecture.js", "scene/temple-visuals.js", "scene/deities.js", "scene/seasonal.js", "scene/offering-models.js", "scene/altar.js", "scene/courtyard.js", "scene/halls.js", "scene/festival.js", "scene/service.js", "scene/interior.js", "scene/market.js", "scene/temple-plaza.js", "scene/collision.js", "app/visit.js"]) env.load(file);
    const Scene = c.Temple3DScene, init = Scene.prototype.init;
    Scene.prototype.init = function() { this.scene = new THREE.Scene(); };
    const scene = new Scene("canvas3dContainer"); Scene.prototype.init = init;
    for (const name of ["buildTempleArchitecture", "buildCourtyard", "buildTempleVisuals", "buildAltarAndDeity", "buildCenser", "buildBwaBwei", "buildChiamBucket", "buildMuyu", "buildOfferings", "buildLanternPagodas", "buildServiceDesk", "buildHallInterior", "buildNightMarket", "buildTemplePlaza"]) scene[name]();
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
    note("只建立 Three.js 幾何與碰撞方塊，未建立渲染器、瀏覽器或動畫迴圈。");
  }
};
