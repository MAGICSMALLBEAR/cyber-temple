// scene/halls.js - 偏殿：祈願木牌閣、文昌閣、月老閣、財神殿、太歲殿、收驚特效

class TempleHallsMixin {
  // 祈願繪馬木牌閣 (Ema Plaque Wishing Wall - 西進祈願長廊 X: -13.5, Z: 8.5)
  buildEmaWall() {
    this.emaRackGroup = new THREE.Group();
    this.emaRackGroup.position.set(-13.5, 0, 8.5);
    this.emaRackGroup.rotation.y = 0;
    this.emaRackGroup.name = "emaWall";

    const woodDarkMat = new THREE.MeshStandardMaterial({ color: 0x3d1d14, roughness: 0.7 });
    const woodBarMat = new THREE.MeshStandardMaterial({ color: 0x825232, roughness: 0.5 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x8a241c, roughness: 0.4, metalness: 0.1 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.7 });

    // 兩根主木柱
    [-1.4, 1.4].forEach(x => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 3.2, 12), woodDarkMat);
      pillar.position.set(x, 1.6, 0);
      pillar.castShadow = true;
      this.emaRackGroup.add(pillar);
    });

    // 橫樑 (上橫樑、中橫樑、下橫樑)
    [1.1, 1.8, 2.5].forEach(y => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.08, 0.08), woodBarMat);
      beam.position.set(0, y, 0);
      this.emaRackGroup.add(beam);
    });

    // 屋頂遮簷
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.16, 0.6), roofMat);
    roof.position.set(0, 3.2, 0);
    this.emaRackGroup.add(roof);

    const roofRidge = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.4, 8), goldMat);
    roofRidge.rotation.z = Math.PI / 2;
    roofRidge.position.set(0, 3.32, 0);
    this.emaRackGroup.add(roofRidge);

    // 牌匾 "祈願木牌閣"
    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.35, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x22110c, roughness: 0.6 })
    );
    signBoard.position.set(0, 2.9, 0.08);
    this.emaRackGroup.add(signBoard);

    const signCanvas = document.createElement("canvas");
    signCanvas.width = 256;
    signCanvas.height = 64;
    const sCtx = signCanvas.getContext("2d");
    sCtx.fillStyle = "#f5c542";
    sCtx.font = "bold 26px 'Noto Serif TC', serif";
    sCtx.textAlign = "center";
    sCtx.fillText("⛩️ 祈願木牌閣", 128, 42);
    const signTex = new THREE.CanvasTexture(signCanvas);
    const signFace = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.3), new THREE.MeshBasicMaterial({ map: signTex, transparent: true }));
    signFace.position.set(0, 2.9, 0.12);
    this.emaRackGroup.add(signFace);

    // 點擊判定區
    const clickZone = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 3.2, 0.6),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    clickZone.position.set(0, 1.6, 0);
    this.emaRackGroup.add(clickZone);

    this.interactiveObjects.push(clickZone);
    clickZone.userData = {
      type: "emaWall",
      tooltip: "⛩️ 祈願木牌閣 • 點擊掛上/查看木牌 (按 [E] 亦可)"
    };

    this.scene.add(this.emaRackGroup);

    // 載入掛牌
    this.loadEmaPlaques();
  }

  // 載入預設與儲存的祈願木牌
  loadEmaPlaques() {
    const defaultPlaques = [
      { name: "考生小明", type: "exam", wish: "文昌帝君保佑考研順利上岸！", icon: "🎓" },
      { name: "科技碼農", type: "tech", wish: "乖乖神保佑專案零Bug、伺服器常綠！", icon: "🟢" },
      { name: "虔誠信女", type: "romance", wish: "月老爺爺賜良緣，覓得相知相守之人。", icon: "❤️" },
      { name: "創業阿榮", type: "wealth", wish: "武財神賜福正偏財亨通，生意興隆！", icon: "💰" },
      { name: "雲端居士", type: "peace", wish: "天上聖母慈悲護佑，信眾全家康泰祥和。", icon: "🛡️" }
    ];

    let stored = [];
    try {
      stored = JSON.parse(localStorage.getItem("temple_ema_plaques") || "[]");
    } catch (e) {}

    const all = [...defaultPlaques, ...stored];
    all.slice(-8).forEach((item, idx) => {
      this.spawnEmaPlaqueMesh(item, idx);
    });
  }

  // 在木架上實體掛上一片 3D 木牌
  spawnEmaPlaqueMesh(data, slotIdx) {
    if (!this.emaRackGroup) return;

    const row = Math.floor(slotIdx / 4);
    const col = slotIdx % 4;

    const x = -1.05 + col * 0.7;
    const y = row === 0 ? 2.3 : 1.6;

    const group = new THREE.Group();
    group.position.set(x, y, 0.05);

    // 掛繩
    const rope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.22, 6),
      new THREE.MeshBasicMaterial({ color: 0xcc2222 })
    );
    rope.position.y = 0.12;
    group.add(rope);

    // 木牌本體
    const plaqueMat = new THREE.MeshStandardMaterial({ color: 0xecd5ab, roughness: 0.6 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.38, 0.02), plaqueMat);
    board.castShadow = true;
    group.add(board);

    // 木牌正面文字貼圖
    const canvas = document.createElement("canvas");
    canvas.width = 192;
    canvas.height = 228;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#eedab0";
    ctx.fillRect(0, 0, 192, 228);

    ctx.strokeStyle = "#8b1c1c";
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, 180, 216);

    ctx.font = "32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(data.icon || "🏮", 96, 45);

    ctx.fillStyle = "#8b1c1c";
    ctx.font = "bold 20px 'Noto Serif TC', serif";
    ctx.fillText(data.name || "善信", 96, 80);

    ctx.fillStyle = "#3a1708";
    ctx.font = "16px 'Noto Serif TC', serif";
    const shortWish = (data.wish || "平安吉祥").slice(0, 16);
    ctx.fillText(shortWish.slice(0, 8), 96, 118);
    if (shortWish.length > 8) {
      ctx.fillText(shortWish.slice(8, 16), 96, 142);
    }

    ctx.fillStyle = "#a82020";
    ctx.font = "14px 'Noto Serif TC', serif";
    ctx.fillText("虔誠祈福", 96, 195);

    const tex = new THREE.CanvasTexture(canvas);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.36), new THREE.MeshBasicMaterial({ map: tex }));
    face.position.set(0, 0, 0.012);
    group.add(face);

    // 點擊個別木牌查看
    const plaqueHit = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.42, 0.08), new THREE.MeshBasicMaterial({ visible: false }));
    group.add(plaqueHit);
    this.interactiveObjects.push(plaqueHit);
    plaqueHit.userData = {
      type: "emaPlaque",
      data: data,
      tooltip: `📜 【${data.name}】祈願：${data.wish}`
    };

    this.emaRackGroup.add(group);
    this.emaPlaques.push({ group, offset: slotIdx * 0.9 });
  }

  // 懸掛新木牌
  hangNewEmaPlaque(data) {
    let stored = [];
    try {
      stored = JSON.parse(localStorage.getItem("temple_ema_plaques") || "[]");
    } catch (e) {}
    stored.push(data);
    localStorage.setItem("temple_ema_plaques", JSON.stringify(stored));

    const slotIdx = this.emaPlaques.length % 8;
    this.spawnEmaPlaqueMesh(data, slotIdx);

    if (window.templeAudio) {
      window.templeAudio.playPlaqueHang();
    }
    this.spawn3DFloatingText(`🪵 ${data.name} 祈願木牌已掛上！`, new THREE.Vector3(-13.5, 2.8, 8.5));
  }

  // 11. 東進院落：文昌閣智慧殿 (X: 13.5, Z: 5.5)
  buildWenchangPavilion() {
    const group = new THREE.Group();
    group.position.set(13.5, 0, 5.5);
    group.name = "wenchangPavilion";

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d1c12, roughness: 0.6 });
    const blueRoofMat = new THREE.MeshStandardMaterial({ color: 0x1d4e66, roughness: 0.35, metalness: 0.2 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.8, roughness: 0.2 });

    // 青石八角台基
    const base = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.4, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0x4a423d, roughness: 0.7 }));
    base.position.y = 0.2;
    base.receiveShadow = true;
    group.add(base);

    // 八根八角立柱
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.6, 8), woodMat);
      col.position.set(Math.cos(angle) * 2.6, 1.8, Math.sin(angle) * 2.6);
      col.castShadow = true;
      group.add(col);
    }

    // 閣身木雕花壁
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 3.2, 8, 1, true), new THREE.MeshStandardMaterial({ color: 0x5a2818, roughness: 0.7 }));
    wall.position.y = 1.8;
    group.add(wall);

    // 下層歇山飛簷
    const lowerRoof = new THREE.Mesh(new THREE.ConeGeometry(3.6, 0.8, 8), blueRoofMat);
    lowerRoof.position.y = 3.8;
    group.add(lowerRoof);

    // 上層閣樓
    const upperWall = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 1.6, 8), woodMat);
    upperWall.position.y = 4.8;
    group.add(upperWall);

    // 上層金頂飛簷寶塔
    const upperRoof = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.0, 8), blueRoofMat);
    upperRoof.position.y = 5.8;
    group.add(upperRoof);

    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 1.0, 8), goldMat);
    spire.position.y = 6.6;
    group.add(spire);

    // 金字匾額 "文昌閣 • 魁星點斗"
    const plaqueMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 0.08), new THREE.MeshStandardMaterial({ color: 0x1a0a0a }));
    plaqueMesh.position.set(0, 3.1, 2.35);
    group.add(plaqueMesh);

    const pCanvas = document.createElement("canvas");
    pCanvas.width = 256;
    pCanvas.height = 64;
    const pCtx = pCanvas.getContext("2d");
    pCtx.fillStyle = "#f5c542";
    pCtx.font = "bold 24px 'Noto Serif TC', serif";
    pCtx.textAlign = "center";
    pCtx.fillText("🎓 文 昌 閣", 128, 42);
    const pTex = new THREE.CanvasTexture(pCanvas);
    const pFace = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.4), new THREE.MeshBasicMaterial({ map: pTex, transparent: true }));
    pFace.position.set(0, 3.1, 2.4);
    group.add(pFace);

    // 門前立體魁星金筆 (Giant Scholar Brush)
    const brushGroup = new THREE.Group();
    brushGroup.position.set(0, 0, 3.2);

    const brushStand = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x4a423d }));
    brushStand.position.y = 0.25;
    brushGroup.add(brushStand);

    const brushPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.8, 12), goldMat);
    brushPole.position.y = 1.35;
    brushGroup.add(brushPole);

    const brushTip = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.6, 12), new THREE.MeshStandardMaterial({ color: 0x221111, roughness: 0.8 }));
    brushTip.position.y = 2.45;
    brushGroup.add(brushTip);

    group.add(brushGroup);

    // 點擊判定區
    const hitBox = new THREE.Mesh(new THREE.BoxGeometry(5.0, 5.0, 5.0), new THREE.MeshBasicMaterial({ visible: false }));
    hitBox.position.set(0, 2.5, 0);
    group.add(hitBox);
    this.interactiveObjects.push(hitBox);
    hitBox.userData = {
      type: "wenchangPavilion",
      tooltip: "🎓 文昌閣智慧殿 • 點智慧筆、求功名利祿 (按 [E] 亦可)"
    };

    this.scene.add(group);
  }

  // 12. 東進院落：月老天賜良緣閣 (X: 13.5, Z: 23.5)
  buildYuelaoPavilion() {
    const group = new THREE.Group();
    group.position.set(13.5, 0, 23.5);
    group.name = "yuelaoPavilion";

    const redWoodMat = new THREE.MeshStandardMaterial({ color: 0x8a2020, roughness: 0.5 });
    const pinkRoofMat = new THREE.MeshStandardMaterial({ color: 0xa83248, roughness: 0.4, metalness: 0.1 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.8 });

    // 桃紅台基
    const base = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.2, 0.4, 6), new THREE.MeshStandardMaterial({ color: 0x4d3838, roughness: 0.7 }));
    base.position.y = 0.2;
    base.receiveShadow = true;
    group.add(base);

    // 六根朱紅木柱
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 3.4, 8), redWoodMat);
      col.position.set(Math.cos(angle) * 2.4, 1.7, Math.sin(angle) * 2.4);
      group.add(col);
    }

    // 亭頂粉桃六角攢尖頂
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.3, 1.4, 6), pinkRoofMat);
    roof.position.y = 4.0;
    group.add(roof);

    const roofBall = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), goldMat);
    roofBall.position.y = 4.9;
    group.add(roofBall);

    // 粉紅暖光燈
    const pLight = new THREE.PointLight(0xff6688, 1.8, 6.0);
    pLight.position.set(0, 2.2, 0);
    group.add(pLight);

    // 金字匾額 "月老閣 • 天賜良緣"
    const pCanvas = document.createElement("canvas");
    pCanvas.width = 256;
    pCanvas.height = 64;
    const pCtx = pCanvas.getContext("2d");
    pCtx.fillStyle = "#ffd0d8";
    pCtx.font = "bold 24px 'Noto Serif TC', serif";
    pCtx.textAlign = "center";
    pCtx.fillText("❤️ 月 老 閣", 128, 42);
    const pTex = new THREE.CanvasTexture(pCanvas);
    const pFace = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.38), new THREE.MeshBasicMaterial({ map: pTex, transparent: true }));
    pFace.position.set(0, 3.1, 2.15);
    group.add(pFace);

    // 門前巨型同心金鎖 (Giant Concentric Love Lock)
    const lockGroup = new THREE.Group();
    lockGroup.position.set(0, 0, 2.8);

    const lockStand = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x4a423d }));
    lockStand.position.y = 0.25;
    lockGroup.add(lockStand);

    const lockBody = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.38, 0.16), goldMat);
    lockBody.position.y = 0.72;
    lockGroup.add(lockBody);

    const lockShackle = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 8, 16, Math.PI), goldMat);
    lockShackle.rotation.z = Math.PI;
    lockShackle.position.set(0, 1.05, 0);
    lockGroup.add(lockShackle);

    group.add(lockGroup);

    // 點擊判定區
    const hitBox = new THREE.Mesh(new THREE.BoxGeometry(4.8, 4.8, 4.8), new THREE.MeshBasicMaterial({ visible: false }));
    hitBox.position.set(0, 2.4, 0);
    group.add(hitBox);
    this.interactiveObjects.push(hitBox);
    hitBox.userData = {
      type: "yuelaoPavilion",
      tooltip: "❤️ 月老天賜良緣閣 • 牽紅線、扣同心鎖、問良緣 (按 [E] 亦可)"
    };

    this.scene.add(group);
  }

  // 13. 西進院落：五路財神金庫洞窟 (X: -13.5, Z: 23.5)
  buildCaishenCave() {
    const group = new THREE.Group();
    group.position.set(-13.5, 0, 23.5);
    group.name = "caishenCave";

    const rockMat = new THREE.MeshStandardMaterial({ color: 0x3d352e, roughness: 0.85 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.15 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0x8a1c1c, roughness: 0.5 });

    // 洞窟金石基座
    const base = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.5, 0.4, 8), rockMat);
    base.position.y = 0.2;
    base.receiveShadow = true;
    group.add(base);

    // 金石洞窟拱門主體
    const caveArch = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.8, 8, 16, Math.PI), rockMat);
    caveArch.position.set(0, 1.8, 0);
    caveArch.rotation.z = Math.PI;
    group.add(caveArch);

    const backWall = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 3.2, 8, 1, false, 0, Math.PI), rockMat);
    backWall.position.set(0, 1.8, -0.2);
    group.add(backWall);

    // 洞頂琉璃金瓦簷
    const roof = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.35, 2.6), redMat);
    roof.position.set(0, 3.5, 0);
    group.add(roof);

    // 洞內黃金寶光
    const goldLight = new THREE.PointLight(0xffbb22, 2.4, 6.0);
    goldLight.position.set(0, 1.6, 0.2);
    group.add(goldLight);

    // 金字匾額 "財神殿 • 招財進寶"
    const pCanvas = document.createElement("canvas");
    pCanvas.width = 256;
    pCanvas.height = 64;
    const pCtx = pCanvas.getContext("2d");
    pCtx.fillStyle = "#ffdd44";
    pCtx.font = "bold 24px 'Noto Serif TC', serif";
    pCtx.textAlign = "center";
    pCtx.fillText("💰 財 神 殿", 128, 42);
    const pTex = new THREE.CanvasTexture(pCanvas);
    const pFace = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.38), new THREE.MeshBasicMaterial({ map: pTex, transparent: true }));
    pFace.position.set(0, 3.1, 1.15);
    group.add(pFace);

    // 洞前巨型金元寶聚寶盆 (Treasure Basin with Golden Ingot)
    const basinGroup = new THREE.Group();
    basinGroup.position.set(0, 0, 2.2);

    const basinBase = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.45, 12), redMat);
    basinBase.position.y = 0.225;
    basinGroup.add(basinBase);

    // 金元寶造型 (雙橢圓金錠)
    const ingotBody = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), goldMat);
    ingotBody.scale.set(1.5, 0.7, 0.9);
    ingotBody.position.y = 0.65;
    basinGroup.add(ingotBody);

    const ingotTop = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), goldMat);
    ingotTop.position.set(0, 0.82, 0);
    basinGroup.add(ingotTop);

    // 金虎爺像 (Golden Tiger General)
    const tigerMat = new THREE.MeshStandardMaterial({ color: 0xd49b20, roughness: 0.4 });
    const tiger = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.55), tigerMat);
    tiger.position.set(1.4, 0.35, 1.8);
    basinGroup.add(tiger);

    group.add(basinGroup);

    // 點擊判定區
    const hitBox = new THREE.Mesh(new THREE.BoxGeometry(4.8, 4.8, 4.8), new THREE.MeshBasicMaterial({ visible: false }));
    hitBox.position.set(0, 2.4, 0);
    group.add(hitBox);
    this.interactiveObjects.push(hitBox);
    hitBox.userData = {
      type: "caishenCave",
      tooltip: "💰 五路財神金庫 • 摸金元寶、請發財水、金虎爺咬錢 (按 [E] 亦可)"
    };

    this.scene.add(group);
  }

  // 13.5 西進院落：太歲本命元辰殿 (X: -13.5, Z: 5.5)
  buildTaiSuiShrine() {
    const group = new THREE.Group();
    group.position.set(-13.5, 0, 5.5);
    group.name = "taisuiShrine";

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a1818, roughness: 0.6 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.8, roughness: 0.25 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x1f3b30, roughness: 0.45, metalness: 0.1 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x3d3532, roughness: 0.7 });

    // 1. 基座台基
    const base = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.45, 4.8), stoneMat);
    base.position.y = 0.225;
    group.add(base);

    // 2. 四根朱漆大柱與金箍
    const pillarGeo = new THREE.CylinderGeometry(0.14, 0.14, 3.2, 12);
    [
      [-1.9, 1.82, -1.9],
      [1.9, 1.82, -1.9],
      [-1.9, 1.82, 1.9],
      [1.9, 1.82, 1.9]
    ].forEach(([x, y, z]) => {
      const p = new THREE.Mesh(pillarGeo, woodMat);
      p.position.set(x, y, z);
      group.add(p);

      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.1, 12), goldMat);
      cap.position.set(x, 3.42, z);
      group.add(cap);
    });

    // 3. 殿宇重檐歇山頂
    const roofGeo = new THREE.ConeGeometry(3.6, 1.5, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 4.15;
    group.add(roof);

    // 寶頂金葫蘆
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), goldMat);
    finial.position.y = 4.95;
    group.add(finial);

    // 4. 殿額金匾「太歲元辰殿」
    const plaqueGeo = new THREE.BoxGeometry(1.6, 0.42, 0.08);
    const plaque = new THREE.Mesh(plaqueGeo, woodMat);
    plaque.position.set(0, 3.15, 1.95);
    group.add(plaque);

    const pBorder = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.48, 0.06), goldMat);
    pBorder.position.set(0, 3.15, 1.93);
    group.add(pBorder);

    // 5. 神案與太歲神牌
    const altar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.85, 1.2), woodMat);
    altar.position.set(0, 0.87, 0);
    group.add(altar);

    // 太歲星君金光神牌 (Golden Tai Sui Plaque)
    const plaqueTable = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.1, 0.08), goldMat);
    plaqueTable.position.set(0, 1.85, -0.15);
    group.add(plaqueTable);
    this.taiSuiPlaqueMesh = plaqueTable;

    // 6. 本命元辰長生斗燈 (Yuan Chen Dipper Lamp)
    const dipperGroup = new THREE.Group();
    dipperGroup.position.set(0, 1.32, 0.2);

    // 八角長生斗 (木質斗桶盛滿五穀白米)
    const dipperGeo = new THREE.CylinderGeometry(0.38, 0.32, 0.28, 8);
    const dipperMat = new THREE.MeshStandardMaterial({ color: 0x8a2020, roughness: 0.5 });
    const dipperMesh = new THREE.Mesh(dipperGeo, dipperMat);
    dipperGroup.add(dipperMesh);

    // 斗內白米五穀
    const riceGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.04, 16);
    const riceMat = new THREE.MeshStandardMaterial({ color: 0xfffde7, roughness: 0.8 });
    const rice = new THREE.Mesh(riceGeo, riceMat);
    rice.position.y = 0.12;
    dipperGroup.add(rice);

    // 斗中法器：青銅七星神劍、吉祥剪刀、度量尺
    const swordMat = new THREE.MeshStandardMaterial({ color: 0x80deea, metalness: 0.8 });
    const dipperSword = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.45, 0.01), swordMat);
    dipperSword.position.set(-0.12, 0.32, 0);
    dipperGroup.add(dipperSword);

    const rulerMat = new THREE.MeshStandardMaterial({ color: 0xd4a034 });
    const ruler = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.38, 0.008), rulerMat);
    ruler.position.set(0.12, 0.28, 0);
    dipperGroup.add(ruler);

    // 斗心長明琉璃斗燈 (Eternal Flame & Light)
    const lampGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.07, 0.16, 12),
      new THREE.MeshStandardMaterial({ color: 0xffecb3, transparent: true, opacity: 0.75, emissive: 0xffb300, emissiveIntensity: 0.4 })
    );
    lampGlass.position.set(0, 0.22, 0);
    dipperGroup.add(lampGlass);

    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff6d00 });
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 8), flameMat);
    flame.position.set(0, 0.34, 0);
    dipperGroup.add(flame);
    this.taiSuiFlameMesh = flame;

    // 斗燈神聖光源
    const dipperLight = new THREE.PointLight(0xffaa22, 1.4, 5.5);
    dipperLight.position.set(0, 0.45, 0);
    dipperGroup.add(dipperLight);
    this.taiSuiDipperLight = dipperLight;

    group.add(dipperGroup);

    // 7. 點擊與射線互動判定盒
    const hitBox = new THREE.Mesh(new THREE.BoxGeometry(4.8, 4.8, 4.8), new THREE.MeshBasicMaterial({ visible: false }));
    hitBox.position.set(0, 2.4, 0);
    group.add(hitBox);
    this.interactiveObjects.push(hitBox);
    hitBox.userData = {
      type: "taisuiShrine",
      tooltip: "🏮 太歲殿 • 安奉太歲星君與元辰斗燈 (點擊或按 [E] 進入)"
    };

    this.scene.add(group);
  }

  // 點亮元辰斗燈與安奉太歲星君科儀特效
  lightTaiSuiDipper(petitionerName = "善信", zodiacName = "生肖", generalName = "太歲星君") {
    if (this.avatar) {
      this.avatar.triggerAction("pray");
    }
    if (window.templeAudio) {
      window.templeAudio.playTaiSuiBlessing();
    }

    const pos = new THREE.Vector3(-13.5, 1.8, 5.5);

    // 金牌加持輝光
    if (this.taiSuiDipperLight) {
      this.taiSuiDipperLight.intensity = 3.2;
      setTimeout(() => {
        if (this.taiSuiDipperLight) this.taiSuiDipperLight.intensity = 1.4;
      }, 2500);
    }

    this.spawn3DFloatingText(`🏮 ${petitionerName} 安奉太歲 • 元辰光彩！`, pos.clone().add(new THREE.Vector3(0, 2.2, 0)));
    if (window.setDockStatus) window.setDockStatus(`🏮 善信【${petitionerName}】（${zodiacName}）已於太歲殿虔誠安奉【${generalName}】，本命元辰斗燈長明！`);
    if (window.liveTempleWall) window.liveTempleWall.addDanmaku(`🏮 恭賀善信【${petitionerName}】於太歲殿祈安植福，元辰光彩、逢凶化吉！`);
    if (window.addMerit) window.addMerit(150);
  }

  // ==========================================
  // 線上收驚除煞科儀 (Virtual Shoujing Ceremony)
  // ==========================================
  startShoujingEffect(petitionerName = "善信", reasonLabel = "心神不寧") {
    if (this.avatar) {
      this.avatar.triggerAction("pray");
    }
    if (window.templeAudio) {
      window.templeAudio.playShoujingChime();
    }

    const pos = this.avatar ? this.avatar.position.clone() : new THREE.Vector3(0, 0, 4.0);

    this.spawn3DFloatingText("🪔 敬稟仙真 • 前三後四淨香掃煞", pos.clone().add(new THREE.Vector3(0, 2.5, 0)));
    if (window.setDockStatus) window.setDockStatus(`🪔 正在為【${petitionerName}】進行收驚解厄科儀（事由：${reasonLabel}）...`);

    // 階段 1：掃煞（生成 24 顆環繞黑灰色陰煞濁氣，被金香驅散）
    const purgeCount = 24;
    for (let i = 0; i < purgeCount; i++) {
      const pGeo = new THREE.SphereGeometry(0.08, 6, 6);
      const pMat = new THREE.MeshBasicMaterial({
        color: 0x37474f,
        transparent: true,
        opacity: 0.8
      });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      const angle = (i / purgeCount) * Math.PI * 2;
      pMesh.position.set(pos.x + Math.cos(angle) * 0.7, pos.y + 0.3 + (i % 5) * 0.25, pos.z + Math.sin(angle) * 0.7);
      this.scene.add(pMesh);
      this.shoujingPurgeParticles.push({
        mesh: pMesh,
        mat: pMat,
        vx: Math.cos(angle) * 0.02,
        vy: 0.025 + Math.random() * 0.02,
        vz: Math.sin(angle) * 0.02,
        life: 1.0
      });
    }

    // 階段 2：金光神咒降臨加持天柱 (1.0 秒後)
    setTimeout(() => {
      const beamGeo = new THREE.CylinderGeometry(0.85, 0.95, 16, 24, 1, true);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0xffd54f,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(pos.x, 8.0, pos.z);
      this.scene.add(beam);
      this.shoujingLightBeam = { mesh: beam, mat: beamMat, life: 1.0 };

      this.spawn3DFloatingText("✨ 金光覆照 • 魂魄歸位", pos.clone().add(new THREE.Vector3(0, 3.2, 0)));
      if (window.templeAudio) window.templeAudio.playBell(528);
    }, 1000);

    // 階段 3：科儀圓滿 (2.6 秒後)
    setTimeout(() => {
      this.spawn3DFloatingText("🌟 魂魄安泰 • 災厄不侵 (+120功德)", pos.clone().add(new THREE.Vector3(0, 3.6, 0)));
      if (window.setDockStatus) window.setDockStatus(`🌟 【${petitionerName}】收驚科儀圓滿！三魂七魄歸位，獲金光庇佑 (+120 功德)。`);
      if (window.liveTempleWall) window.liveTempleWall.addDanmaku(`🪔 賀【${petitionerName}】收驚科儀圓滿！神魂安泰，災厄消散！`);
      if (window.addMerit) window.addMerit(120);
    }, 2600);
  }
}

installTempleMixin(TempleHallsMixin);
