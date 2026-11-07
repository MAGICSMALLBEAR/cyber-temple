// scene/temple-plaza.js - 廟埕內容：美食街、祈願樹、蓮心淨泉、神位小龕、殿內光明燈牆
// 位置依實際碰撞地圖挑選空地；地點表 TEMPLE_PLAZA_SPOTS 同時供地圖、近身提示與點選使用。

const TEMPLE_FOOD_STALLS = [
  { id: "food0", name: "地瓜球", x: -15.5, side: 0, awning: ["#c8402c", "#f4e6c8"], goods: "balls" },
  { id: "food1", name: "烤香腸", x: -12.5, side: 0, awning: ["#2f6f5e", "#f4e6c8"], goods: "sausage" },
  { id: "food2", name: "糖葫蘆", x: -9.5, side: 0, awning: ["#b8862c", "#fff2d6"], goods: "candy" },
  { id: "food3", name: "愛玉冰", x: 9.5, side: 1, awning: ["#2c6fa8", "#f0f6f8"], goods: "jelly" },
  { id: "food4", name: "古早味紅茶", x: 12.5, side: 1, awning: ["#8a3a1e", "#f6e2c0"], goods: "tea" },
  { id: "food5", name: "烤玉米", x: 15.5, side: 1, awning: ["#d08a20", "#fff0c8"], goods: "corn" }
];
const FOOD_ROW_Z = 34.6;
const WISH_TREE_POS = [-7.5, 18];
const LOTUS_SPRING_POS = [6, 17];
const TABLET_SHRINES = [
  { id: "shrineLife", title: "註生娘娘神位", text: "註生娘娘神位", pos: [-9.6, 7.6] },
  { id: "shrineEarth", title: "地藏王菩薩神位", text: "地藏王菩薩神位", pos: [5.6, 8.2] }
];
const LAMP_WALL_ROWS = 7, LAMP_WALL_COLS = 12;

const TEMPLE_PLAZA_SPOTS = [
  ...TEMPLE_FOOD_STALLS.map((s, i) => ({ id: s.id, title: s.name, icon: "🍢", center: [s.x, FOOD_ROW_Z], spot: [s.x, FOOD_ROW_Z + 1.5], radius: 1.45, label: "嚐一口", map: i === 0 || i === 3 })),
  { id: "wishTree", title: "祈願樹", icon: "🌳", center: WISH_TREE_POS, spot: [WISH_TREE_POS[0], WISH_TREE_POS[1] + 2.2], radius: 2.6, label: "繫上心願", map: true },
  { id: "lotusSpring", title: "蓮心淨泉", icon: "⛲", center: LOTUS_SPRING_POS, spot: [LOTUS_SPRING_POS[0], LOTUS_SPRING_POS[1] + 2.4], radius: 2.7, label: "淨手靜心", map: true },
  ...TABLET_SHRINES.map(s => ({ id: s.id, title: s.title, icon: "🪔", center: s.pos, spot: [s.pos[0], s.pos[1] + 1.5], radius: 1.8, label: "合掌致意", map: true }))
];

class TemplePlazaMixin {
  buildTemplePlaza() {
    this.plazaSpots = TEMPLE_PLAZA_SPOTS;
    TEMPLE_FOOD_STALLS.forEach(stall => this.buildFoodStall(stall));
    this.buildWishTree();
    this.buildLotusSpring();
    TABLET_SHRINES.forEach(shrine => this.buildTabletShrine(shrine));
    this.buildLampWalls();
  }

  plazaHit(group, size, y, spotId, tooltip) {
    this.hallHit(group, size, y, "plazaSpot", tooltip, { spotId });
  }

  // 攤位：櫃台、條紋棚、招牌與小燈串，品項各有陳列
  buildFoodStall(stall) {
    const g = new THREE.Group();
    g.name = "foodStall";
    g.position.set(stall.x, 0, FOOD_ROW_Z);
    const wood = new THREE.MeshStandardMaterial({ color: 0x7a4a2a, roughness: 0.75 });
    const box = (size, at, material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      mesh.position.set(...at); mesh.castShadow = true; g.add(mesh); return mesh;
    };
    box([2.3, 0.9, 1], [0, 0.45, 0], wood);
    box([2.4, 0.08, 1.12], [0, 0.94, 0], new THREE.MeshStandardMaterial({ color: 0xc9a06a, roughness: 0.6 }));
    [[-1.1, -0.45], [1.1, -0.45], [-1.1, 0.5], [1.1, 0.5]].forEach(([x, z]) => box([0.08, 2.5, 0.08], [x, 1.25, z], wood));

    const stripes = this.makeTempleTexture(128, (c, s) => {
      for (let i = 0; i < 8; i++) { c.fillStyle = stall.awning[i % 2]; c.fillRect(i * s / 8, 0, s / 8, s); }
    });
    const awning = box([2.7, 0.08, 1.6], [0, 2.55, 0.14], new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.7 }));
    awning.rotation.x = 0.16;
    const sign = this.makeHallSign(stall.name, 2.1, 0.46);
    sign.position.set(0, 2.12, 0.56);
    g.add(sign);

    const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe9a8, toneMapped: false }), 9);
    const m = new THREE.Matrix4();
    for (let i = 0; i < 9; i++) {
      m.makeTranslation((i - 4) * 0.3, 2.38 - Math.sin(i / 8 * Math.PI) * 0.12, 0.84);
      bulbs.setMatrixAt(i, m);
    }
    bulbs.userData.noCollision = true;
    g.add(bulbs);

    this.addStallGoods(g, stall.goods);
    this.plazaHit(g, [2.6, 2.6, 1.4], 1.3, stall.id, `🍢 ${stall.name} • 點擊或走近按 E 嚐一口`);
    this.scene.add(g);
  }

  addStallGoods(g, kind) {
    const y = 1.0;
    const put = (geo, color, x, yy, z, extra = {}) => {
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...extra }));
      mesh.position.set(x, yy, z); mesh.userData.noCollision = true; g.add(mesh); return mesh;
    };
    // 同款小物件用實例化，一次繪製
    const many = (geo, material, points) => {
      const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, ...material }), points.length), at = new THREE.Matrix4(), color = new THREE.Color();
      points.forEach(([x, yy, z, hex], i) => { at.makeTranslation(x, yy, z); mesh.setMatrixAt(i, at); mesh.setColorAt(i, color.setHex(hex)); });
      mesh.userData.noCollision = true; g.add(mesh);
    };
    if (kind === "balls") {
      put(new THREE.CylinderGeometry(0.42, 0.34, 0.14, 16), 0x3a3a3e, -0.3, y + 0.08, 0.08, { metalness: 0.5 });
      many(new THREE.SphereGeometry(0.07, 8, 6), {}, Array.from({ length: 18 }, (_, i) => [-0.3 + Math.cos(i * 2.4) * (0.08 + i * 0.016), y + 0.18 + (i % 3) * 0.04, 0.08 + Math.sin(i * 2.4) * (0.08 + i * 0.016), i % 2 ? 0xe0a23c : 0xd98a26]));
    } else if (kind === "sausage") {
      put(new THREE.BoxGeometry(1.5, 0.08, 0.5), 0x2a2a2c, 0, y + 0.05, 0.1, { metalness: 0.6 });
      for (let i = 0; i < 9; i++) { const s = put(new THREE.CapsuleGeometry(0.05, 0.3, 4, 8), 0xa83a24, -0.6 + i * 0.15, y + 0.13, 0.1); s.rotation.x = Math.PI / 2; }
    } else if (kind === "candy") {
      const rack = put(new THREE.CylinderGeometry(0.14, 0.14, 0.9, 10), 0xc9a06a, 0, y + 0.45, 0.1);
      rack.userData.noCollision = true;
      const sticks = [], fruit = [];
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2, r = 0.16;
        sticks.push([Math.cos(a) * r, y + 0.72, 0.1 + Math.sin(a) * r, 0xe0d0b0]);
        for (let k = 0; k < 3; k++) fruit.push([Math.cos(a) * (r + 0.02), y + 0.66 + k * 0.1, 0.1 + Math.sin(a) * (r + 0.02), 0xd42a2a]);
      }
      many(new THREE.CylinderGeometry(0.008, 0.008, 0.46, 5), {}, sticks);
      many(new THREE.SphereGeometry(0.05, 8, 6), { roughness: 0.15 }, fruit);
    } else if (kind === "jelly") {
      [-0.5, 0.5].forEach(x => {
        put(new THREE.CylinderGeometry(0.34, 0.28, 0.24, 16), 0xdfeaf0, x, y + 0.12, 0.1);
        put(new THREE.CylinderGeometry(0.31, 0.31, 0.02, 16), 0xe6d67a, x, y + 0.23, 0.1, { roughness: 0.15 });
      });
    } else if (kind === "tea") {
      put(new THREE.CylinderGeometry(0.22, 0.22, 0.6, 16), 0xb7b7bb, -0.55, y + 0.3, 0.05, { metalness: 0.7, roughness: 0.3 });
      for (let i = 0; i < 6; i++) put(new THREE.CylinderGeometry(0.075, 0.06, 0.2, 10), 0x8a3d1a, -0.05 + (i % 3) * 0.26, y + 0.1, -0.02 + Math.floor(i / 3) * 0.28, { roughness: 0.2 });
    } else {
      put(new THREE.BoxGeometry(1.5, 0.08, 0.5), 0x2a2a2c, 0, y + 0.05, 0.1, { metalness: 0.6 });
      for (let i = 0; i < 6; i++) { const c = put(new THREE.CapsuleGeometry(0.07, 0.26, 4, 10), 0xe0ac34, -0.55 + i * 0.22, y + 0.15, 0.1); c.rotation.x = Math.PI / 2; }
    }
  }

  // 祈願樹：枝幹以管狀幾何長出，樹冠用實例化球叢，絲帶數量固定、玩家許過的願染成金色
  buildWishTree() {
    const g = new THREE.Group();
    g.name = "wishTree";
    g.position.set(WISH_TREE_POS[0], 0, WISH_TREE_POS[1]);
    const bark = new THREE.MeshStandardMaterial({ color: 0x4a3324, roughness: 0.95 });
    const rnd = templeRandom(71);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.58, 3, 12), bark);
    trunk.position.y = 1.5; trunk.castShadow = true; trunk.name = "wishTreeTrunk";
    g.add(trunk);
    const planter = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.6, 0.34, 20), new THREE.MeshStandardMaterial({ color: 0x8c8378, roughness: 0.9 }));
    planter.position.y = 0.17; planter.userData.noCollision = true;
    g.add(planter);
    const soil = new THREE.Mesh(new THREE.CircleGeometry(1.4, 20), new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 1 }));
    soil.rotation.x = -Math.PI / 2; soil.position.y = 0.345; soil.userData.noCollision = true;
    g.add(soil);

    const tips = [];
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2 + rnd() * 0.4, reach = 2 + rnd() * 1.2, top = 4 + rnd() * 1.3;
      const tip = [Math.cos(a) * reach, top, Math.sin(a) * reach];
      const branch = this.tube([[0, 2.7, 0], [Math.cos(a) * reach * 0.45, 3.5 + rnd() * 0.3, Math.sin(a) * reach * 0.45], tip], 0.11, bark, 7);
      branch.userData.noCollision = true;
      g.add(branch);
      tips.push(tip);
    }

    const leafCount = 54;
    const leaves = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.72, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true }), leafCount);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), color = new THREE.Color();
    for (let i = 0; i < leafCount; i++) {
      const tip = tips[i % tips.length], s = 0.8 + rnd() * 0.75;
      m.compose(new THREE.Vector3(tip[0] + (rnd() - 0.5) * 2.2, tip[1] + (rnd() - 0.3) * 1.3, tip[2] + (rnd() - 0.5) * 2.2), q, new THREE.Vector3(s, s * 0.72, s));
      leaves.setMatrixAt(i, m);
      leaves.setColorAt(i, color.setHex([0x2f6b3a, 0x3f8146, 0x28593a, 0x52924c][i % 4]));
    }
    leaves.castShadow = true;
    leaves.userData.noCollision = true;
    g.add(leaves);

    const ribbonCount = 36;
    const ribbons = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.1, 0.62), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, side: THREE.DoubleSide }), ribbonCount);
    for (let i = 0; i < ribbonCount; i++) {
      const tip = tips[i % tips.length], k = 0.42 + rnd() * 0.55;
      q.setFromEuler(new THREE.Euler(0, rnd() * Math.PI, (rnd() - 0.5) * 0.2));
      m.compose(new THREE.Vector3(tip[0] * k + (rnd() - 0.5) * 0.5, 2.5 + (tip[1] - 2.5) * k - 0.3, tip[2] * k + (rnd() - 0.5) * 0.5), q, new THREE.Vector3(1, 1, 1));
      ribbons.setMatrixAt(i, m);
    }
    ribbons.userData.noCollision = true;
    g.add(ribbons);
    this.wishRibbons = ribbons;
    this.refreshWishTree();

    const sign = this.makeHallSign("祈願樹", 1.5, 0.38);
    sign.position.set(0, 0.7, 1.68);
    g.add(sign);
    this.plazaHit(g, [3.4, 4, 3.4], 2, "wishTree", "🌳 祈願樹 • 點擊或走近按 E 繫上心願");
    this.scene.add(g);
  }

  // 金色絲帶數量＝玩家實際掛過的祈願木牌數
  refreshWishTree() {
    if (!this.wishRibbons) return;
    let wishes = 0;
    try { wishes = JSON.parse(localStorage.getItem("temple_ema_plaques") || "[]").length; } catch (e) {}
    const color = new THREE.Color();
    for (let i = 0; i < this.wishRibbons.count; i++) {
      this.wishRibbons.setColorAt(i, color.setHex(i < wishes ? 0xf0c040 : 0xc8282a));
    }
    this.wishRibbons.instanceColor.needsUpdate = true;
    this.wishTreeGold = Math.min(wishes, this.wishRibbons.count);
  }

  // 蓮心淨泉：八角石池、中央蓮花與四道水流
  buildLotusSpring() {
    const g = new THREE.Group();
    g.name = "lotusSpring";
    g.position.set(LOTUS_SPRING_POS[0], 0, LOTUS_SPRING_POS[1]);
    const stone = new THREE.MeshStandardMaterial({ color: 0xa79d90, roughness: 0.88 });
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.9, 0.62, 8), stone);
    rim.position.y = 0.31; rim.name = "springRim"; rim.castShadow = true;
    g.add(rim);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.03, 8), new THREE.MeshStandardMaterial({ color: 0x4f9fb0, roughness: 0.12, metalness: 0.25, transparent: true, opacity: 0.86 }));
    water.position.y = 0.64; water.userData.noCollision = true;
    g.add(water);
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.52, 0.62, 12), stone);
    column.position.y = 0.95; column.userData.noCollision = true;
    g.add(column);

    const petal = new THREE.SphereGeometry(0.2, 10, 8);
    petal.scale(0.62, 1.2, 0.3);
    [[12, 0.62, 1.34, 1.15, 0xeeb4c6], [10, 0.44, 1.42, 0.8, 0xf4cdd8], [8, 0.26, 1.5, 0.42, 0xfbe4ea]].forEach(([count, radius, y, tilt, color]) => {
      const petals = new THREE.InstancedMesh(petal, new THREE.MeshStandardMaterial({ color, roughness: 0.5 }), count), p = new THREE.Object3D();
      for (let i = 0; i < count; i++) {
        const a = i / count * Math.PI * 2;
        p.position.set(Math.cos(a) * radius, y, Math.sin(a) * radius);
        p.rotation.set(0, -a + Math.PI / 2, 0);
        p.rotateX(tilt);
        p.updateMatrix();
        petals.setMatrixAt(i, p.matrix);
      }
      petals.userData.noCollision = true;
      g.add(petals);
    });
    const bud = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xa86a10, emissiveIntensity: 0.5, roughness: 0.4 }));
    bud.position.y = 1.62; bud.userData.noCollision = true;
    g.add(bud);

    const flow = this.makeTempleTexture(64, (c, s) => {
      c.fillStyle = "#cfeff5"; c.fillRect(0, 0, s, s);
      c.fillStyle = "#ffffff";
      for (let i = 0; i < 4; i++) c.fillRect(0, i * 16, s, 7);
    }, 1, 4);
    this.springFlow = flow;
    const streamMat = new THREE.MeshBasicMaterial({ map: flow, transparent: true, opacity: 0.75 });
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI * 2 + Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
      const stream = this.tube([[c * 0.08, 1.7, s * 0.08], [c * 0.5, 2.05, s * 0.5], [c * 0.95, 1.5, s * 0.95], [c * 1.2, 0.66, s * 1.2]], 0.032, streamMat, 6);
      stream.userData.noCollision = true;
      g.add(stream);
    }
    this.springRings = [0, 1, 2, 3].map(i => {
      const a = i / 4 * Math.PI * 2 + Math.PI / 4;
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.13, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(Math.cos(a) * 1.2, 0.665, Math.sin(a) * 1.2);
      ring.userData.noCollision = true;
      g.add(ring);
      return ring;
    });

    const sign = this.makeHallSign("蓮心淨泉", 1.7, 0.36);
    sign.position.set(0, 0.34, 1.82);
    g.add(sign);
    this.plazaHit(g, [3.6, 2.2, 3.6], 1.1, "lotusSpring", "⛲ 蓮心淨泉 • 點擊或走近按 E 淨手靜心");
    this.scene.add(g);
  }

  // 神位小龕：以牌位供奉，不做神像
  buildTabletShrine(shrine) {
    const g = new THREE.Group();
    g.name = "tabletShrine";
    g.position.set(shrine.pos[0], 0, shrine.pos[1]);
    const red = new THREE.MeshStandardMaterial({ color: 0x3a0f0c, roughness: 0.55 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xd4a034, roughness: 0.35, metalness: 0.6 });
    const painted = new THREE.MeshStandardMaterial({ map: this.repeatedTexture(this.templeTex.painted, 1, 1), roughness: 0.55 });
    const box = (size, at, material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      mesh.position.set(...at); mesh.castShadow = true; g.add(mesh); return mesh;
    };
    box([1.5, 0.95, 0.85], [0, 0.475, 0], painted);
    box([1.6, 0.06, 0.95], [0, 0.98, 0], gold);
    box([1.4, 1.5, 0.12], [0, 1.75, -0.38], red);
    [-0.66, 0.66].forEach(x => box([0.1, 1.5, 0.1], [x, 1.75, 0.34], gold));
    box([1.44, 0.07, 0.14], [0, 2.46, -0.36], gold);
    box([0.5, 1.26, 0.04], [0, 1.66, -0.32], gold);
    const roof = new THREE.Mesh(this.roofSurfaceGeometry({ halfTop: 0.72, halfEave: 1.05, zRidge: 0, zEave: 0.72, yRidge: 2.95, yEave: 2.5, lift: 0.14, segU: 12, segV: 5 }), new THREE.MeshStandardMaterial({ map: this.templeTex.tile, roughness: 0.35 }));
    roof.userData.noCollision = true;
    g.add(roof);
    const back = roof.clone(); back.rotation.y = Math.PI; g.add(back);
    const tablet = this.makeHallSign(shrine.text, 0.3, 1.1, true);
    tablet.position.set(0, 1.66, -0.29);
    g.add(tablet);
    const flame = new THREE.MeshBasicMaterial({ color: 0xffd070, toneMapped: false });
    [-0.42, 0.42].forEach(x => {
      box([0.07, 0.3, 0.07], [x, 1.16, 0.15], new THREE.MeshStandardMaterial({ color: 0xc83a2a }));
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), flame);
      f.scale.y = 1.6; f.position.set(x, 1.36, 0.15); f.userData.noCollision = true;
      g.add(f);
    });
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.14, 12), gold);
    bowl.position.set(0, 1.08, 0.15); bowl.userData.noCollision = true;
    g.add(bowl);
    this.plazaHit(g, [1.8, 3, 1.4], 1.5, shrine.id, `🪔 ${shrine.title} • 點擊或走近按 E 合掌致意`);
    this.scene.add(g);
  }

  // 光明燈牆：亮著的燈數＝玩家實際點過的燈，其餘是未點亮的燈座
  buildLampWalls() {
    this.lampWalls = [];
    const cell = this.makeTempleTexture(128, (c, s) => {
      c.fillStyle = "#1c0a07"; c.fillRect(0, 0, s, s);
      c.fillStyle = "#4a1410"; c.fillRect(10, 10, s - 20, s - 20);
      c.strokeStyle = "#c8962e"; c.lineWidth = 7; c.strokeRect(10, 10, s - 20, s - 20);
    }, LAMP_WALL_COLS, LAMP_WALL_ROWS);
    const glow = this.makeTempleTexture(64, (c, s) => {
      const r = c.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s / 2);
      r.addColorStop(0, "rgba(255,226,140,1)"); r.addColorStop(0.45, "rgba(255,170,60,0.55)"); r.addColorStop(1, "rgba(255,120,20,0)");
      c.clearRect(0, 0, s, s); c.fillStyle = r; c.fillRect(0, 0, s, s);
    });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a100a, roughness: 0.5 });
    const cellMat = new THREE.MeshStandardMaterial({ map: cell, roughness: 0.5 });
    const trim = new THREE.MeshStandardMaterial({ color: 0xd4a034, roughness: 0.35, metalness: 0.6 });
    [-1, 1].forEach(side => {
      const g = new THREE.Group();
      g.name = "lampWall";
      g.position.set(side * 6.72, 0, 1.1);
      g.rotation.y = -side * Math.PI / 2;
      const body = new THREE.Mesh(new THREE.BoxGeometry(7.2, 4.5, 0.3), frameMat);
      body.position.y = 3.1;
      g.add(body);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(6.72, 3.71), cellMat);
      face.position.set(0, 2.84, 0.16);
      face.userData.noCollision = true;
      g.add(face);
      const crown = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.22, 0.46), trim);
      crown.position.set(0, 5.46, 0.05);
      g.add(crown);
      const base = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.86, 0.5), trim);
      base.position.set(0, 0.43, 0.05);
      g.add(base);
      const title = this.makeHallSign("光明燈", 1.9, 0.42);
      title.position.set(0, 5.1, 0.17);
      g.add(title);

      const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), LAMP_WALL_ROWS * LAMP_WALL_COLS);
      const halos = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.56, 0.53), new THREE.MeshBasicMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), LAMP_WALL_ROWS * LAMP_WALL_COLS);
      const m = new THREE.Matrix4();
      for (let r = 0; r < LAMP_WALL_ROWS; r++) {
        for (let c = 0; c < LAMP_WALL_COLS; c++) {
          m.makeTranslation((c - (LAMP_WALL_COLS - 1) / 2) * 0.56, 1.25 + r * 0.53, 0.24);
          lamps.setMatrixAt(r * LAMP_WALL_COLS + c, m);
          halos.setMatrixAt(r * LAMP_WALL_COLS + c, m);
        }
      }
      lamps.userData.noCollision = true;
      halos.userData.noCollision = true;
      lamps.userData.halos = halos;
      g.add(lamps, halos);
      this.lampWalls.push(lamps);
      this.hallHit(g, [7.2, 4.5, 0.5], 3.1, "plazaSpot", "🏮 光明燈牆 • 點擊為家人點一盞燈", { spotId: "lampWall" });
      this.scene.add(g);
    });
    this.refreshLampWall();
  }

  refreshLampWall() {
    if (!this.lampWalls) return;
    let history = 0;
    try { history = JSON.parse(localStorage.getItem("temple_lantern_history") || "[]").length; } catch (e) {}
    const lit = Math.max(parseInt(localStorage.getItem("temple_lanterns_lit") || "0", 10) || 0, history);
    const on = new THREE.Color(0xffe08a), off = new THREE.Color(0x3a1a12), noGlow = new THREE.Color(0x000000), white = new THREE.Color(0xffffff);
    let left = lit;
    this.lampWalls.forEach(lamps => {
      const halos = lamps.userData.halos;
      for (let i = 0; i < lamps.count; i++) {
        const isLit = left-- > 0;
        lamps.setColorAt(i, isLit ? on : off);
        halos.setColorAt(i, isLit ? white : noGlow);   // 加法混合下黑色＝不發光
      }
      lamps.instanceColor.needsUpdate = true;
      halos.instanceColor.needsUpdate = true;
    });
    this.lampsLit = Math.min(lit, LAMP_WALL_ROWS * LAMP_WALL_COLS * 2);
  }

  updateTemplePlaza(time) {
    if (this.springFlow) this.springFlow.offset.y = -time * 1.4;
    (this.springRings || []).forEach((ring, i) => {
      const phase = (time * 0.7 + i * 0.25) % 1;
      ring.scale.setScalar(1 + phase * 3.2);
      ring.material.opacity = 0.5 * (1 - phase);
    });
  }
}

installTempleMixin(TemplePlazaMixin);
