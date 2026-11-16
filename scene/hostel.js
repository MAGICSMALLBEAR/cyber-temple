// scene/hostel.js - 寺廟旅宿／清心香客大樓：廟埕入口牌樓與獨立傳送分區
// 依「分區邊界與群組抽離」架構建於 "hostel" 分區，互不污染本殿碰撞與點擊射線

const HOSTEL_ENTRANCE_SPOT = {
  id: "hostelEntrance",
  title: "香客大樓",
  icon: "🛏️",
  center: [15.8, 19.2],
  spot: [13.6, 19.2],
  radius: 2.6,
  label: "前往旅宿休息",
  map: true,
  zone: "temple"
};

const HOSTEL_SPOTS = [
  { id: "hostelCheckin", title: "知客櫃台", icon: "🛎️", center: [0, -1.6], spot: [0, 0.2], radius: 2.3, label: "掛單報到", map: true, zone: "hostel" },
  { id: "hostelBed", title: "清心禪房床榻", icon: "🛏️", center: [6.5, -5.0], spot: [4.2, -5.0], radius: 2.8, label: "小憩養神", map: true, zone: "hostel" },
  { id: "hostelTea", title: "品茗禪茶席", icon: "🍵", center: [-6.5, -5.0], spot: [-4.2, -5.0], radius: 2.8, label: "品茶靜心", map: true, zone: "hostel" },
  { id: "hostelStudy", title: "靜思抄經桌", icon: "📜", center: [0, -6.2], spot: [0, -4.4], radius: 2.4, label: "靜坐抄經", map: true, zone: "hostel" },
  { id: "hostelReturn", title: "山門回廊", icon: "🏛️", center: [0, 9.5], spot: [0, 7.6], radius: 2.4, label: "返回神殿本殿", map: true, zone: "hostel" }
];

const HOSTEL_DAILY_KEY = "temple_hostel_daily";
const HOSTEL_INTERACTIONS = {
  hostelCheckin: {
    action: "bow",
    bell: 660,
    floating: "🛎️ 掛單登記圓滿 • 祝旅途平安",
    status: "🛎️ 知客師兄已為您辦理掛單登記，清心禪房隨時歡迎安歇。",
    merit: true
  },
  hostelBed: {
    action: "meditate",
    bell: 528,
    floating: "🛏️ 身心安頓 • 洗去塵勞",
    status: "🛏️ 在清心禪房小憩養神片刻，精神飽滿，煩憂盡消。",
    merit: true
  },
  hostelTea: {
    action: "pray",
    bell: 700,
    floating: "🍵 禪茶一味 • 清心回甘",
    status: "🍵 輕啜一盞廟宇烏龍清茶，齒頰留香，心境澄澈清明。",
    merit: true
  },
  hostelStudy: {
    action: "meditate",
    bell: 580,
    floating: "📜 靜心觀照 • 萬緣放下",
    status: "📜 在靜思抄經桌前調息靜坐，寫下虔誠願心，平靜安詳。",
    merit: true,
    openSutra: true
  }
};

class TempleHostelMixin {
  buildHostelZone() {
    this.hostelEntranceSpot = HOSTEL_ENTRANCE_SPOT;
    this.hostelSpots = HOSTEL_SPOTS;
    this.buildHostelEntranceInTemple();
    this.buildHostelBuildings();
  }

  // 建立自帶碰撞排除與透明感應盒的旅宿互動區
  addHostelHitBox(parent, size, at, type, tooltip, extra = {}, zoneId = "hostel") {
    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(...size),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hit.position.set(...at);
    hit.userData = { type, tooltip, zone: zoneId, noCollision: true, ...extra };
    parent.add(hit);
    this.interactiveObjects?.push(hit);
    return hit;
  }

  makeHostelPlaque(text, width = 2.6, height = 0.62) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#2b160c";
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = "#d4a034";
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 496, 112);
    ctx.fillStyle = "#ffe599";
    ctx.font = "bold 46px 'Noto Serif TC', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 66);
    const tex = new THREE.CanvasTexture(canvas);
    return new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ map: tex })
    );
  }

  // 通用木構雙柱牌坊（廟埕入口與旅宿返回門共用）
  buildHostelArchway({ name, pos, rotY = 0, signText, zoneId, hitType, hitTooltip, extra = {} }) {
    const group = new THREE.Group();
    group.name = name;
    group.position.set(...pos);
    group.rotation.y = rotY;

    const wood = new THREE.MeshStandardMaterial({ color: 0x5c2f1b, roughness: 0.72 });
    const tile = new THREE.MeshStandardMaterial({ color: 0x26353a, roughness: 0.55 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xd4a034, roughness: 0.35, metalness: 0.6 });
    const glow = new THREE.MeshBasicMaterial({ color: 0xffd27a });

    const box = (size, at, mat, noCol = false) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
      m.position.set(...at);
      m.castShadow = true;
      m.receiveShadow = true;
      if (noCol) m.userData.noCollision = true;
      group.add(m);
      return m;
    };

    [-1.4, 1.4].forEach(x => {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.28, 12), tile);
      base.position.set(x, 0.14, 0);
      group.add(base);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.1, 14), wood);
      col.position.set(x, 1.65, 0);
      col.castShadow = true;
      group.add(col);
      const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), glow);
      lantern.position.set(x, 2.55, 0.28);
      lantern.scale.set(1, 1.25, 1);
      lantern.userData.noCollision = true;
      group.add(lantern);
    });

    box([3.3, 0.22, 0.26], [0, 3.05, 0], wood, true);
    box([3.8, 0.18, 0.9], [0, 3.35, 0], tile, true);
    box([3.9, 0.08, 0.14], [0, 3.48, 0], gold, true);

    const plaque = this.makeHostelPlaque(signText, 2.4, 0.56);
    plaque.position.set(0, 2.75, 0.18);
    plaque.userData.noCollision = true;
    group.add(plaque);

    const step = box([2.6, 0.06, 1.1], [0, 0.03, 0.15], tile, true);
    step.name = `${name}Step`;

    this.addHostelHitBox(group, [2.4, 2.8, 1.3], [0, 1.4, 0.15], hitType, hitTooltip, extra, zoneId);
    this.batchStaticGroup?.(group);
    this.addToZone(group, zoneId);
    return group;
  }

  // 1. 廟埕東側入口牌坊（位於 "temple" 分區，點擊或按 E 傳送至 "hostel"）
  buildHostelEntranceInTemple() {
    this.buildHostelArchway({
      name: "hostelEntranceGate",
      pos: [HOSTEL_ENTRANCE_SPOT.center[0], 0, HOSTEL_ENTRANCE_SPOT.center[1]],
      rotY: -Math.PI / 2,
      signText: "香客大樓・禪房",
      zoneId: "temple",
      hitType: "hostelGate",
      hitTooltip: "🛏️ 香客大樓入口 • 點擊或走近按 E 前往旅宿休息"
    });
  }

  // 2. 獨立旅宿建築群（位於 "hostel" 分區）
  buildHostelBuildings() {
    const stone = new THREE.MeshStandardMaterial({ color: 0x5c5850, roughness: 0.88 });
    const woodDeck = new THREE.MeshStandardMaterial({ color: 0x6f4326, roughness: 0.68 });
    const timber = new THREE.MeshStandardMaterial({ color: 0x4b2818, roughness: 0.7 });
    const plaster = new THREE.MeshStandardMaterial({ color: 0xe6dcc8, roughness: 0.8 });
    const roofTile = new THREE.MeshStandardMaterial({ color: 0x26353a, roughness: 0.5 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xd4a034, roughness: 0.35, metalness: 0.6 });
    const bambooMat = new THREE.MeshStandardMaterial({ color: 0x3b6e3c, roughness: 0.6 });
    const cushionMat = new THREE.MeshStandardMaterial({ color: 0x9e3422, roughness: 0.75 });
    const linenMat = new THREE.MeshStandardMaterial({ color: 0xf0eadc, roughness: 0.85 });

    const root = new THREE.Group();
    root.name = "hostelBuildings";
    this.addToZone(root, "hostel");

    const addBox = (parent, name, size, at, mat, noCol = false) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
      m.name = name;
      m.position.set(...at);
      m.castShadow = true;
      m.receiveShadow = true;
      if (noCol) m.userData.noCollision = true;
      parent.add(m);
      return m;
    };

    // 石板庭院與木質廊道地面（均低於膝蓋高度或標記 noCollision）
    addBox(root, "hostelYardFloor", [21.0, 0.08, 9.0], [0, -0.04, 6.5], stone, true);
    addBox(root, "hostelHallFloor", [20.4, 0.1, 10.6], [0, -0.04, -3.2], woodDeck, true);
    addBox(root, "hostelCenterPath", [2.6, 0.02, 7.6], [0, 0.01, 5.8], plaster, true);

    // 香客大樓木構主建築（南向開放門廳，方便鏡頭俯瞰與自由進出）
    addBox(root, "hostelBackWall", [20.8, 3.6, 0.35], [0, 1.8, -8.3], plaster);
    [-10.3, 10.3].forEach(x => addBox(root, "hostelSideWall", [0.35, 3.6, 10.6], [x, 1.8, -3.2], plaster));
    [-9.4, -3.2, 3.2, 9.4].forEach(x => {
      [-8.0, -3.2, 1.8].forEach(z => {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.6, 12), timber);
        col.name = "hostelPillar";
        col.position.set(x, 1.8, z);
        col.castShadow = true;
        root.add(col);
      });
    });

    // 屋頂與飛簷（高於頭頂不擋路）
    addBox(root, "hostelRoofBeam", [20.4, 0.25, 0.3], [0, 3.55, 1.8], timber, true);
    const roof = addBox(root, "hostelRoof", [21.6, 0.45, 11.8], [0, 3.9, -3.2], roofTile, true);
    roof.rotation.x = 0.04;
    const plaque = this.makeHostelPlaque("清心香客居", 3.6, 0.78);
    plaque.position.set(0, 3.05, 2.02);
    plaque.userData.noCollision = true;
    root.add(plaque);

    // 庭院矮竹籬與翠竹景觀
    [-10.3, 10.3].forEach(x => addBox(root, "hostelYardFence", [0.22, 0.9, 8.6], [x, 0.45, 6.3], timber));
    [-6.0, 6.0].forEach(x => addBox(root, "hostelSouthFence", [8.4, 0.9, 0.22], [x, 0.45, 10.3], timber));
    [[-8.6, 8.8], [8.6, 8.8], [-8.6, 3.2], [8.6, 3.2]].forEach(([bx, bz]) => {
      addBox(root, "hostelPlanter", [0.9, 0.42, 0.9], [bx, 0.21, bz], stone, true);
      [-0.18, 0.18].forEach((ox, idx) => {
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.3 + idx * 0.4, 8), bambooMat);
        stalk.name = "hostelBamboo";
        stalk.position.set(bx + ox, 1.3, bz + (idx ? 0.12 : -0.12));
        root.add(stalk);
      });
    });

    // ① 知客櫃台 (X: 0, Z: -1.6)
    const desk = new THREE.Group();
    desk.name = "hostelCheckinDesk";
    desk.position.set(0, 0, -1.6);
    addBox(desk, "hostelCounterBody", [2.4, 0.95, 0.75], [0, 0.475, 0], timber);
    addBox(desk, "hostelCounterTop", [2.55, 0.08, 0.88], [0, 0.98, 0], woodDeck, true);
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), gold);
    bell.position.set(0.6, 1.08, 0.15);
    bell.userData.noCollision = true;
    desk.add(bell);
    this.addHostelHitBox(desk, [2.6, 1.6, 1.0], [0, 0.8, 0], "hostelSpot", "🛎️ 知客櫃台 • 點擊或按 E 掛單報到", { spotId: "hostelCheckin" });
    root.add(desk);

    // ② 東廂清心榻／休憩床鋪 (X: 6.5, Z: -5.0)
    const bed = new THREE.Group();
    bed.name = "hostelRestBed";
    bed.position.set(6.5, 0, -5.0);
    addBox(bed, "hostelBedFrame", [2.4, 0.5, 1.7], [0, 0.25, 0], timber);
    addBox(bed, "hostelBedHeadboard", [0.16, 1.1, 1.75], [1.15, 0.55, 0], timber);
    addBox(bed, "hostelBedMattress", [2.15, 0.18, 1.5], [-0.05, 0.59, 0], linenMat, true);
    addBox(bed, "hostelBedQuilt", [1.3, 0.12, 1.44], [-0.45, 0.7, 0], cushionMat, true);
    addBox(bed, "hostelNightstand", [0.55, 0.6, 0.55], [0.8, 0.3, -1.25], timber);
    this.addHostelHitBox(bed, [2.6, 1.5, 1.9], [0, 0.75, 0], "hostelSpot", "🛏️ 清心禪房床榻 • 點擊或按 E 小憩養神", { spotId: "hostelBed" });
    root.add(bed);

    // ③ 西廂品茗禪茶席 (X: -6.5, Z: -5.0)
    const tea = new THREE.Group();
    tea.name = "hostelTeaCorner";
    tea.position.set(-6.5, 0, -5.0);
    addBox(tea, "hostelTeaMat", [2.6, 0.04, 2.2], [0, 0.02, 0], linenMat, true);
    addBox(tea, "hostelTeaTable", [1.4, 0.48, 0.95], [0, 0.24, 0], timber);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.16, 10), cushionMat);
    pot.position.set(0, 0.56, 0);
    pot.userData.noCollision = true;
    tea.add(pot);
    [[-0.95, 0], [0.95, 0]].forEach(([cx, cz]) => {
      const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.1, 14), cushionMat);
      cushion.position.set(cx, 0.08, cz);
      cushion.userData.noCollision = true;
      tea.add(cushion);
    });
    this.addHostelHitBox(tea, [1.8, 1.4, 1.4], [0, 0.7, 0], "hostelSpot", "🍵 品茗禪茶席 • 點擊或按 E 品茶靜心", { spotId: "hostelTea" });
    root.add(tea);

    // ④ 中堂靜思抄經桌 (X: 0, Z: -6.2)
    const study = new THREE.Group();
    study.name = "hostelStudyDesk";
    study.position.set(0, 0, -6.2);
    addBox(study, "hostelStudyTable", [2.0, 0.74, 0.85], [0, 0.37, 0], timber);
    addBox(study, "hostelSutraScroll", [0.85, 0.03, 0.42], [0, 0.76, 0], linenMat, true);
    const studyCushion = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.4, 0.1, 16), cushionMat);
    studyCushion.position.set(0, 0.06, 0.85);
    studyCushion.userData.noCollision = true;
    study.add(studyCushion);
    this.addHostelHitBox(study, [2.2, 1.5, 1.1], [0, 0.75, 0], "hostelSpot", "📜 靜思抄經桌 • 點擊或按 E 靜坐抄經", { spotId: "hostelStudy" });
    root.add(study);

    // 室內柔和暖光（歸在 hostelWorldGroup 內，僅在旅宿分區開啟）
    const warmLight = new THREE.PointLight(0xffcf88, 1.9, 24);
    warmLight.position.set(0, 3.1, -2.5);
    root.add(warmLight);

    // ⑤ 返回大殿南側牌坊 (X: 0, Z: 9.5)
    this.buildHostelArchway({
      name: "hostelReturnGate",
      pos: [0, 0, 9.5],
      rotY: 0,
      signText: "返回神殿本殿",
      zoneId: "hostel",
      hitType: "hostelSpot",
      hitTooltip: "🏛️ 山門回廊 • 點擊或走近按 E 返回神殿本殿",
      extra: { spotId: "hostelReturn" }
    });
    this.batchStaticGroup?.(root);
  }

  claimHostelDaily(id) {
    if (window.templePlaza?.claimDaily) return window.templePlaza.claimDaily(`hostel:${id}`);
    const day = window.templeInventory?.day?.() || new Date().toISOString().slice(0, 10);
    let data = { day, done: [] };
    try {
      const parsed = JSON.parse(localStorage.getItem(HOSTEL_DAILY_KEY) || "null");
      if (parsed && parsed.day === day && Array.isArray(parsed.done)) data = parsed;
    } catch (e) {}
    if (data.done.includes(id)) return false;
    data.done.push(id);
    localStorage.setItem(HOSTEL_DAILY_KEY, JSON.stringify(data));
    return true;
  }

  enterHostelZone() {
    this.switchZone("hostel");
    window.templeAudio?.playBell?.(640);
    this.spawn3DFloatingText?.("🛏️ 歡迎蒞臨清心香客大樓", new THREE.Vector3(0, 2.4, 6.2));
    window.setDockStatus?.("🛏️ 已傳送至【清心香客大樓】，可至櫃台報到、品茗靜心或小憩養神。");
  }

  exitHostelZone() {
    this.switchZone("temple", HOSTEL_ENTRANCE_SPOT.spot);
    window.templeAudio?.playBell?.(580);
    this.spawn3DFloatingText?.("🏛️ 回到神殿廟埕", new THREE.Vector3(HOSTEL_ENTRANCE_SPOT.spot[0], 2.4, HOSTEL_ENTRANCE_SPOT.spot[1]));
    window.setDockStatus?.("🏛️ 已從香客大樓返回神殿廟埕。");
  }

  interactWithHostelSpot(spotId) {
    if (spotId === "hostelReturn") {
      this.exitHostelZone();
      return true;
    }
    const cfg = HOSTEL_INTERACTIONS[spotId];
    const spot = HOSTEL_SPOTS.find(s => s.id === spotId);
    if (!cfg || !spot) return false;

    this.avatar?.triggerAction?.(cfg.action);
    window.templeAudio?.playBell?.(cfg.bell);
    this.spawn3DFloatingText?.(cfg.floating, new THREE.Vector3(spot.center[0], 2.1, spot.center[1]));
    const reward = cfg.merit ? this.claimHostelDaily(spotId) : false;
    if (reward) window.addMerit?.(1);
    window.setDockStatus?.(reward ? `${cfg.status}（功德 +1）` : cfg.status);
    if (cfg.openSutra && typeof window.openSutraModal === "function") window.openSutraModal();
    return true;
  }
}

installTempleMixin(TempleHostelMixin);
