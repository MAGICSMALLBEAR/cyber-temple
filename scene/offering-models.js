// scene/offering-models.js - 供品與金銀財寶的 3D 模型
// 神案供盤、供品鋪樣品、角色提籃與端盤共用同一套外觀；每次呼叫都建新的幾何與材質，呼叫端負責釋放。
// 原點在盤底中央、朝上擺放，盤子直徑約 0.36。

const OFFERING_MODEL_TYPES = ["fruit", "peach", "fagao", "redturtle", "guaiguai", "milktea", "chicken", "flowers", "goldIngot", "silverIngot", "treasureBowl", "ingotTower", "goldBars", "coinString", "teaSet", "flowerBasket", "fruitTower"];
const TREASURE_MODEL_TYPES = ["goldIngot", "silverIngot", "treasureBowl", "ingotTower", "goldBars", "coinString"];

function buildIngotModel(silver = false) {
  const group = new THREE.Group(); group.name = silver ? "silver-ingot" : "gold-ingot";
  const mat = new THREE.MeshStandardMaterial({ color: silver ? 0xd9e5ed : 0xf6c34b, metalness: 0.86, roughness: silver ? 0.22 : 0.27 });
  // 船形底、兩端翹角與中央鼓起的寶心。
  const shape = new THREE.Shape(); shape.moveTo(-0.14, 0.14);
  shape.quadraticCurveTo(-0.12, -0.035, 0, -0.015); shape.quadraticCurveTo(0.12, -0.035, 0.14, 0.14);
  shape.quadraticCurveTo(0.08, 0.065, 0, 0.055); shape.quadraticCurveTo(-0.08, 0.065, -0.14, 0.14);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.12, steps: 1, bevelEnabled: true, bevelSize: 0.009, bevelThickness: 0.009, bevelSegments: 2, curveSegments: 8 }); geo.translate(0, 0, -0.06);
  const boat = new THREE.Mesh(geo, mat); group.add(boat);
  const heart = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), mat); heart.scale.set(1.05, 0.7, 0.76); heart.position.y = 0.075; group.add(heart);
  group.traverse(o => { if (o.isMesh) o.castShadow = true; }); return group;
}

function buildTreasureOffering(type) {
  const g = new THREE.Group(); g.name = type;
  const bowl = type === "treasureBowl";
  if (bowl) {
    const red = new THREE.MeshStandardMaterial({ color: 0x9d1b26, roughness: 0.38, metalness: 0.25 });
    const vessel = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.09, 0.11, 20), red); vessel.position.y = 0.08; g.add(vessel);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.013, 6, 24), new THREE.MeshStandardMaterial({ color: 0xeabd50, metalness: 0.8, roughness: 0.3 })); rim.rotation.x = Math.PI / 2; rim.position.y = 0.138; g.add(rim);
  }
  if (type === "ingotTower") {
    // 🪙 九層元寶塔：三層立體堆疊金元寶
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf6c34b, metalness: 0.88, roughness: 0.25 });
    for (let i = 0; i < 4; i++) {
      const ing = buildIngotModel(false); ing.scale.setScalar(0.42);
      const angle = (i / 4) * Math.PI * 2;
      ing.position.set(Math.cos(angle) * 0.08, 0.04, Math.sin(angle) * 0.08);
      ing.rotation.y = angle; g.add(ing);
    }
    for (let i = 0; i < 2; i++) {
      const ing = buildIngotModel(false); ing.scale.setScalar(0.38);
      ing.position.set((i - 0.5) * 0.08, 0.095, 0); g.add(ing);
    }
    const topIngot = buildIngotModel(false); topIngot.scale.setScalar(0.35); topIngot.position.set(0, 0.145, 0); g.add(topIngot);
    const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 10), goldMat); pearl.position.set(0, 0.21, 0); g.add(pearl);
    return g;
  }
  if (type === "goldBars") {
    // 🧱 萬兩金條盤：雙排 6 根黃金條磚
    const goldBarMat = new THREE.MeshStandardMaterial({ color: 0xf6ba35, metalness: 0.85, roughness: 0.22 });
    for (let layer = 0; layer < 2; layer++) {
      for (let i = 0; i < 3; i++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.026, 0.045), goldBarMat);
        bar.position.set((i - 1) * 0.05, 0.04 + layer * 0.028, (layer % 2 === 0 ? 0 : 0.01));
        if (layer === 1) bar.rotation.y = Math.PI / 2;
        g.add(bar);
      }
    }
    return g;
  }
  if (type === "coinString") {
    // 📿 五帝銅錢串：紅線串連五枚古幣與朱紅流蘇
    const coinMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.8, roughness: 0.3 });
    const redCord = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.6 });
    for (let i = 0; i < 5; i++) {
      const c = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.006, 6, 16), coinMat);
      c.rotation.x = Math.PI / 2;
      c.position.set((i - 2) * 0.042, 0.04 + (i % 2) * 0.008, 0);
      g.add(c);
    }
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.24, 8), redCord);
    cord.rotation.z = Math.PI / 2; cord.position.set(0, 0.042, 0); g.add(cord);
    const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 8), redCord);
    tassel.rotation.z = -Math.PI / 2; tassel.position.set(0.14, 0.042, 0); g.add(tassel);
    return g;
  }
  const count = bowl ? 5 : 3;
  for (let i = 0; i < count; i++) {
    const ingot = buildIngotModel(type === "silverIngot" || bowl && i % 2 === 1);
    ingot.scale.setScalar(bowl ? 0.42 : 0.53);
    const angle = i / count * Math.PI * 2;
    ingot.position.set(Math.cos(angle) * (bowl ? 0.06 : 0.07), bowl ? 0.155 + i % 2 * 0.02 : 0.045, Math.sin(angle) * 0.06);
    ingot.rotation.y = angle; g.add(ingot);
  }
  if (bowl) for (let i = 0; i < 5; i++) {
    const coin = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 5, 10), new THREE.MeshStandardMaterial({ color: 0xf3cd61, metalness: 0.8, roughness: 0.3 }));
    coin.rotation.x = -Math.PI / 2; coin.position.set((i - 2) * 0.04, 0.19, 0.055); g.add(coin);
  }
  return g;
}

// 一盤供品；plate: false 時不放盤子（例如裝在提籃裡）。type 為空時只有空盤。
function buildOfferingDish(type, { plate = true } = {}) {
  const dishGroup = new THREE.Group();
  dishGroup.userData.dish = type || null;
  const goldPlateMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.85, roughness: 0.2 });
  const redPlateMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.4 });
  const greenMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.4 });
  const add = (geometry, material, x = 0, y = 0, z = 0) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); dishGroup.add(mesh); return mesh; };

  // 金紋底盤（元寶類改用朱紅或藍白盤）
  if (plate) {
    const plateMat = type === "silverIngot" ? new THREE.MeshStandardMaterial({ color: 0x315b88, roughness: 0.3 }) : TREASURE_MODEL_TYPES.includes(type) ? redPlateMat : goldPlateMat;
    const mesh = add(new THREE.CylinderGeometry(0.18, 0.15, 0.025, 20), plateMat, 0, 0.012, 0); mesh.name = "plate";
  }

  if (TREASURE_MODEL_TYPES.includes(type)) {
    dishGroup.add(buildTreasureOffering(type));
  } else if (type === "fruit") {
    // 🍎 五福平安果盤
    const fruitMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.25 });
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35 });
    [[-0.05, 0.04, -0.04], [0.05, 0.04, -0.04], [0, 0.04, 0.05]].forEach(pos => add(new THREE.SphereGeometry(0.045, 10, 10), fruitMat, ...pos));
    add(new THREE.SphereGeometry(0.042, 10, 10), orangeMat, 0, 0.11, 0);
  } else if (type === "peach") {
    // 🍑 長生仙桃 (王母蟠桃)
    const peachMat = new THREE.MeshStandardMaterial({ color: 0xfda4af, roughness: 0.3 });
    [-0.04, 0.04].forEach(px => {
      add(new THREE.SphereGeometry(0.055, 12, 10), peachMat, px, 0.065, 0).scale.set(0.9, 1.2, 0.9);
      add(new THREE.BoxGeometry(0.03, 0.005, 0.06), greenMat, px, 0.02, 0.06).rotation.x = 0.3;   // 綠葉
    });
  } else if (type === "fagao") {
    // 🍞 富貴發糕 (開花發糕)
    const cakeMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.8 });
    add(new THREE.CylinderGeometry(0.08, 0.065, 0.07, 14), cakeMat, 0, 0.045, 0);
    for (let b = 0; b < 4; b++) {
      const angle = (b / 4) * Math.PI * 2;
      add(new THREE.SphereGeometry(0.035, 8, 8), cakeMat, Math.cos(angle) * 0.035, 0.085, Math.sin(angle) * 0.035);
    }
  } else if (type === "redturtle") {
    // 🐢 祈福紅龜粿，香蕉葉墊底
    const turtleMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 });
    add(new THREE.SphereGeometry(0.075, 12, 10), turtleMat, 0, 0.04, 0).scale.set(1.1, 0.45, 1.3);
    add(new THREE.PlaneGeometry(0.18, 0.22), greenMat, 0, 0.024, 0).rotation.x = -Math.PI / 2;
  } else if (type === "guaiguai") {
    // 🟢 金牌科技乖乖
    const bagMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.4, metalness: 0.1 });
    add(new THREE.BoxGeometry(0.16, 0.20, 0.07), bagMat, 0, 0.11, 0).rotation.y = 0.15;
    add(new THREE.BoxGeometry(0.162, 0.04, 0.072), goldPlateMat, 0, 0.11, 0).rotation.y = 0.15;   // 金牌彩帶
  } else if (type === "milktea") {
    // 🧋 全糖特大珍珠奶茶
    const teaMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 });
    add(new THREE.CylinderGeometry(0.05, 0.04, 0.14, 16), teaMat, 0, 0.08, 0);
    add(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 8), redPlateMat, 0.015, 0.15, 0).rotation.z = 0.15;   // 吸管
  } else if (type === "chicken") {
    // 🍗 香脆現炸大雞排與紙袋
    const chickenMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.85 });
    add(new THREE.BoxGeometry(0.16, 0.04, 0.11), chickenMat, 0, 0.04, 0).rotation.y = 0.2;
    const bagMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.7 });
    add(new THREE.BoxGeometry(0.17, 0.042, 0.06), bagMat, 0, 0.038, 0.03).rotation.y = 0.2;
  } else if (type === "flowers") {
    // 🌸 清雅鮮花花瓶，百合與菊花花球
    const vaseMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.3, roughness: 0.2 });
    add(new THREE.CylinderGeometry(0.04, 0.03, 0.12, 12), vaseMat, 0, 0.07, 0);
    const flowerMat = new THREE.MeshStandardMaterial({ color: 0xfef08a });
    for (let f = 0; f < 3; f++) add(new THREE.SphereGeometry(0.03, 8, 8), flowerMat, (f - 1) * 0.025, 0.14, 0);
  } else if (type === "teaSet") {
    // 🍵 三才敬神清茶組
    const cupMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
    const teaLiquidMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.1 });
    const trayMat = new THREE.MeshStandardMaterial({ color: 0x5c2b16, roughness: 0.4 });
    add(new THREE.BoxGeometry(0.24, 0.015, 0.1), trayMat, 0, 0.035, 0);
    [-0.07, 0, 0.07].forEach(cx => {
      add(new THREE.CylinderGeometry(0.024, 0.016, 0.04, 12), cupMat, cx, 0.06, 0);
      add(new THREE.CircleGeometry(0.021, 10), teaLiquidMat, cx, 0.078, 0).rotation.x = -Math.PI / 2;
    });
  } else if (type === "flowerBasket") {
    // 🧺 精緻祈安花籃
    const basketMat = new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.75 });
    const petalRed = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.3 });
    const petalPink = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.3 });
    add(new THREE.CylinderGeometry(0.09, 0.065, 0.08, 14), basketMat, 0, 0.05, 0);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.008, 6, 16, Math.PI), basketMat);
    handle.position.set(0, 0.085, 0); dishGroup.add(handle);
    for (let f = 0; f < 5; f++) {
      const a = (f / 5) * Math.PI * 2;
      add(new THREE.SphereGeometry(0.026, 8, 8), f % 2 === 0 ? petalRed : petalPink, Math.cos(a) * 0.045, 0.095, Math.sin(a) * 0.045);
    }
  } else if (type === "fruitTower") {
    // 🍍 十全水果塔
    const pineappleMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 });
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35 });
    const grapeMat = new THREE.MeshStandardMaterial({ color: 0x7e22ce, roughness: 0.2 });
    add(new THREE.CylinderGeometry(0.055, 0.065, 0.12, 12), pineappleMat, 0, 0.08, 0);
    for (let o = 0; o < 4; o++) {
      const a = (o / 4) * Math.PI * 2;
      add(new THREE.SphereGeometry(0.028, 8, 8), orangeMat, Math.cos(a) * 0.05, 0.14, Math.sin(a) * 0.05);
    }
    add(new THREE.SphereGeometry(0.026, 8, 8), grapeMat, 0, 0.18, 0);
  }
  // 沒用到的共用材質一併釋放，避免累積
  [goldPlateMat, redPlateMat, greenMat].forEach(mat => { let used = false; dishGroup.traverse(o => { if (o.material === mat) used = true; }); if (!used) mat.dispose(); });
  return dishGroup;
}
