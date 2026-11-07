// 廟埕內容（無繪圖）：每日功德只給一次、燈牆與祈願絲帶對應實際紀錄
const { makeEnvironment } = require("./light-env");

module.exports = {
  name: "廟埕內容（無繪圖）",
  async run({ check, note }) {
    const THREE = await import("three"), env = makeEnvironment(THREE), c = env.context;
    for (const file of ["scene/core.js", "scene/temple-visuals.js", "scene/interior.js", "scene/temple-plaza.js", "app/plaza.js"]) env.load(file);
    let merit = 0;
    c.addMerit = points => { merit += points; };
    const plaza = c.templePlaza;

    env.setTime("2026-11-07T04:00:00Z");
    plaza.use("food0");
    plaza.use("food0");
    check("同一攤同一天只給一次功德", merit === 1, String(merit));
    plaza.use("lotusSpring");
    check("不同地點各自計算", merit === 2, String(merit));
    check("仍有回饋文字", /淨手/.test(c.lastNotice || ""));
    env.setTime("2026-11-08T04:00:00Z");
    plaza.use("food0");
    check("隔天可再領一次", merit === 3, String(merit));
    plaza.use("不存在的地點");
    check("未知地點不給功德", merit === 3);

    let opened = "";
    for (const id of ["btnOpenEma", "btnGoLantern"]) env.nodes.get(id).addEventListener("click", () => { opened = id; });
    plaza.use("wishTree");
    check("祈願樹開啟祈願木牌", opened === "btnOpenEma", opened);
    plaza.use("lampWall");
    check("光明燈牆開啟點燈", opened === "btnGoLantern", opened);

    c.localStorage.setItem("temple_lanterns_lit", "3");
    c.localStorage.setItem("temple_ema_plaques", JSON.stringify([{}, {}]));
    const Scene = c.Temple3DScene, init = Scene.prototype.init;
    Scene.prototype.init = function() { this.scene = new THREE.Scene(); };
    const scene = new Scene("canvas3dContainer"); Scene.prototype.init = init;
    scene.buildTempleVisuals();
    scene.buildTemplePlaza();
    check("亮燈數等於實際點燈數", scene.lampsLit === 3, String(scene.lampsLit));
    check("金色絲帶等於實際祈願數", scene.wishTreeGold === 2, String(scene.wishTreeGold));

    const color = new THREE.Color();
    const lamps = scene.lampWalls[0];
    lamps.getColorAt(2, color); const third = color.getHex();
    lamps.getColorAt(3, color); const fourth = color.getHex();
    check("第三盞亮、第四盞沒亮", third !== fourth);

    c.localStorage.setItem("temple_lanterns_lit", "9999");
    scene.refreshLampWall();
    check("亮燈數不超過燈位總數", scene.lampsLit === 168, String(scene.lampsLit));
    c.localStorage.setItem("temple_ema_plaques", "壞資料");
    scene.refreshWishTree();
    check("祈願資料損壞時不出錯", scene.wishTreeGold === 0, String(scene.wishTreeGold));
    check("地點表每個 id 不重複", new Set(c.TEMPLE_PLAZA_SPOTS?.map?.(s => s.id) ?? scene.plazaSpots.map(s => s.id)).size === scene.plazaSpots.length);
    const roofMat = () => [].concat(scene.scene.getObjectByName("hallLowerRoof").material)[0];
    const sideWall = scene.scene.getObjectByName("hallSideWall");
    scene.applyVisualQuality({ label: "低", softShadows: false });
    check("低畫質改用便宜材質", roofMat().isMeshLambertMaterial && scene.visualLite === true);
    check("低畫質保留多材質面的陣列", Array.isArray(sideWall.material) && sideWall.material.every(m => m.isMeshLambertMaterial));
    check("低畫質保留貼圖", !!roofMat().map);
    check("低畫質關閉各向異性濾鏡", scene.visualTextures.every(t => t.anisotropy === 1));
    scene.applyVisualQuality({ label: "高", softShadows: true });
    check("切回高畫質還原物理材質", roofMat().isMeshStandardMaterial && sideWall.material.every(m => m.isMeshStandardMaterial));
    check("高畫質恢復濾鏡", scene.visualTextures.every(t => t.anisotropy === 8));
    check("遠方地面不計算燈光", scene.distantLand.material.isMeshBasicMaterial);
    note("只建立幾何與資料，未建立渲染器或瀏覽器。");
  }
};
