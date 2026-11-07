// scene/architecture.js - 殿宇建築：大殿、廟埕、御道、山門、石獅、燈道、林木圍牆、宮燈、神案神像、千佛燈塔

class TempleArchitectureMixin {
  buildTempleArchitecture() {
    // 1. 大殿青石地磚 (Z 範圍 -3.2 到 5.5)
    const floorGeo = new THREE.PlaneGeometry(16, 10);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1c1210, roughness: 0.25, metalness: 0.2 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 1.15);
    floor.receiveShadow = true;
    this.scene.add(floor);

    const gridHelper = new THREE.GridHelper(14, 14, 0x5a2d18, 0x38190c);
    gridHelper.position.set(0, 0.005, 1.15);
    this.scene.add(gridHelper);

    // 2. 後殿神龕木雕背牆
    const wallGeo = new THREE.BoxGeometry(14, 8, 0.4);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3d100d, roughness: 0.6 });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(0, 4, -3.2);
    wall.receiveShadow = true;
    this.scene.add(wall);

    const corniceGeo = new THREE.BoxGeometry(14.4, 0.35, 0.8);
    const corniceMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.6, roughness: 0.3 });
    const cornice = new THREE.Mesh(corniceGeo, corniceMat);
    cornice.position.set(0, 6.8, -2.8);
    this.scene.add(cornice);

    // 3. 朱紅大柱
    const pillarGeo = new THREE.CylinderGeometry(0.28, 0.3, 7.5, 24);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x8a1818, roughness: 0.35, metalness: 0.1 });
    const pillarBaseMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.7, roughness: 0.25 });

    [[-3.4, -1.8], [3.4, -1.8], [-3.4, 4.2], [3.4, 4.2]].forEach(([x, z]) => {
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(x, 3.75, z);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      this.scene.add(pillar);

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 0.35, 24), pillarBaseMat);
      base.position.set(x, 0.175, z);
      this.scene.add(base);
    });

    // 4. 大殿與廟埕交界：朱紅大門門檻與牌匾山門
    const thresholdGeo = new THREE.BoxGeometry(8, 0.25, 0.4);
    const thresholdMat = new THREE.MeshStandardMaterial({ color: 0x6e1b1b, roughness: 0.5 });
    const threshold = new THREE.Mesh(thresholdGeo, thresholdMat);
    threshold.position.set(0, 0.125, 5.8);
    this.scene.add(threshold);

    // 左右照壁
    const screenWallGeo = new THREE.BoxGeometry(3.5, 5.5, 0.3);
    const screenL = new THREE.Mesh(screenWallGeo, wallMat);
    screenL.position.set(-5.2, 2.75, 5.8);
    this.scene.add(screenL);

    const screenR = new THREE.Mesh(screenWallGeo, wallMat);
    screenR.position.set(5.2, 2.75, 5.8);
    this.scene.add(screenR);

    this.buildHangingLanterns();
  }

  // 構建宏偉三進戶外廟埕群 (Courtyard & Plaza)
  buildCourtyard() {
    // 1. 宏偉青石大地坪 (寬 38m，深 38m)
    this.buildPlazaGround();

    // 2. 中央御道九龍神道
    this.buildCentralImperialPath();

    // 3. 巍峨山門牌樓 (Z: 38.0)
    this.buildMountainGate();

    // 4. 青石守護神獅 (Z: 34.0)
    this.buildStoneLions();

    // 5. 神道宮燈與旌旗大道 (Z: 22.0 ~ 36.0)
    this.buildLanternAvenue();

    // 6. 漢白玉圍欄與深山古松林 (四周邊界)
    this.buildPerimeterTreesAndWalls();

    // 7. 戶外天公爐 (中進中央 Z: 11.5)
    this.buildHeavenCenser();

    // 8. 東進院落：荷花池與九曲石拱橋 (X: 12.5, Z: 13.5)
    this.buildWishingPond();

    // 9. 西進院落：八角金爐閣 (X: -12.5, Z: 14.5)
    this.buildJossPaperFurnace();

    // 10. 西進院落：祈願繪馬長廊 (X: -13.5, Z: 8.5)
    this.buildEmaWall();

    // 11. 東進院落：文昌閣智慧殿 (X: 13.5, Z: 5.5)
    this.buildWenchangPavilion();

    // 12. 東進院落：月老天賜良緣閣 (X: 13.5, Z: 23.5)
    this.buildYuelaoPavilion();

    // 13. 西進院落：五路財神金庫洞窟 (X: -13.5, Z: 23.5)
    this.buildCaishenCave();

    // 13.5 西進院落：太歲本命元辰殿 (X: -13.5, Z: 5.5)
    this.buildTaiSuiShrine();

    // 14. 東側前埕：晨鐘天鐘樓 (X: 9.5, Z: 30.0)
    this.buildBellTower();

    // 15. 西側前埕：暮鼓雷音樓 (X: -9.5, Z: 30.0)
    this.buildDrumTower();

    // 16. 迎神遶境八抬神轎與儀仗 (中央神道起點)
    this.buildPalanquinProcession();
  }

  // 1. 宏偉廟埕地坪 (中進廟埕 + 外進大埕)
  buildPlazaGround() {
    const stoneMat1 = new THREE.MeshStandardMaterial({ color: 0x2e2320, roughness: 0.55, metalness: 0.05 });
    const stoneMat2 = new THREE.MeshStandardMaterial({ color: 0x241a18, roughness: 0.6, metalness: 0.05 });

    // 中進廟埕廣場地磚 (Z: 5.5 ~ 23.5, 寬度 36m)
    const courtGeo1 = new THREE.PlaneGeometry(36, 18);
    const court1 = new THREE.Mesh(courtGeo1, stoneMat1);
    court1.rotation.x = -Math.PI / 2;
    court1.position.set(0, -0.01, 14.5);
    court1.receiveShadow = true;
    this.scene.add(court1);

    // 外進廟埕與山門前廣場 (Z: 23.5 ~ 43.5, 寬度 38m)
    const courtGeo2 = new THREE.PlaneGeometry(38, 20);
    const court2 = new THREE.Mesh(courtGeo2, stoneMat2);
    court2.rotation.x = -Math.PI / 2;
    court2.position.set(0, -0.01, 33.5);
    court2.receiveShadow = true;
    this.scene.add(court2);
  }

  // 2. 中央御道九龍神道
  buildCentralImperialPath() {
    const pathMat = new THREE.MeshStandardMaterial({ color: 0x4a3a30, roughness: 0.45, metalness: 0.1 });
    const borderMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, roughness: 0.35, metalness: 0.6 });

    // 漢白玉與青石浮雕神道 (寬 4.8m，貫穿整座大殿至山門 Z: 5.8 ~ 37.0)
    const path = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 31.5), pathMat);
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.005, 21.5);
    path.receiveShadow = true;
    this.scene.add(path);

    // 御道兩側金黃銅邊條
    [-2.42, 2.42].forEach(x => {
      const border = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 31.5), borderMat);
      border.position.set(x, 0.015, 21.5);
      this.scene.add(border);
    });
  }

  // 3. 巍峨山門牌樓 (Z: 38.0)
  buildMountainGate() {
    const gateGroup = new THREE.Group();
    gateGroup.position.set(0, 0, 38.0);
    gateGroup.name = "mountainGate";

    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x8a1c1c, roughness: 0.35 });
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x5a524c, roughness: 0.7 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.75, roughness: 0.25 });
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x224422, roughness: 0.5 });

    // 4根巍峨主柱 (中門寬 4.8m，兩側夾門各寬 2.4m)
    const pillarPositions = [-4.8, -1.8, 1.8, 4.8];
    pillarPositions.forEach(x => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.45, 9.2, 24), pillarMat);
      pillar.position.set(x, 4.6, 0);
      pillar.castShadow = true;
      gateGroup.add(pillar);

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.8, 16), baseMat);
      base.position.set(x, 0.4, 0);
      gateGroup.add(base);
    });

    // 大額枋橫樑 (綠色斗栱雕彩)
    const mainBeam = new THREE.Mesh(new THREE.BoxGeometry(11.8, 0.45, 0.7), beamMat);
    mainBeam.position.set(0, 7.8, 0);
    gateGroup.add(mainBeam);

    const subBeam = new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.35, 0.9), beamMat);
    subBeam.position.set(0, 8.3, 0);
    gateGroup.add(subBeam);

    // 中央主樓歇山頂簷 (高聳九重)
    const mainRoof = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.4, 3.2), roofMat);
    mainRoof.position.set(0, 9.2, 0);
    gateGroup.add(mainRoof);

    const mainRidge = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6.4, 8), roofMat);
    mainRidge.rotation.z = Math.PI / 2;
    mainRidge.position.set(0, 9.5, 0);
    gateGroup.add(mainRidge);

    // 左右兩側次樓飛簷
    [-3.8, 3.8].forEach(x => {
      const sideRoof = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.3, 2.4), roofMat);
      sideRoof.position.set(x, 8.6, 0);
      gateGroup.add(sideRoof);
    });

    // 山門正中金字大牌匾
    const plaqueBoard = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.6, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x1a0808, roughness: 0.6 })
    );
    plaqueBoard.position.set(0, 7.1, 0.38);
    gateGroup.add(plaqueBoard);

    const pCanvas = document.createElement("canvas");
    pCanvas.width = 512;
    pCanvas.height = 128;
    const pCtx = pCanvas.getContext("2d");
    pCtx.fillStyle = "#f5c542";
    pCtx.font = "bold 44px 'Noto Serif TC', serif";
    pCtx.textAlign = "center";
    pCtx.fillText("⛩️ 賽 博 聖 境", 256, 75);
    const pTex = new THREE.CanvasTexture(pCanvas);
    const plaqueFace = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.55), new THREE.MeshBasicMaterial({ map: pTex, transparent: true }));
    plaqueFace.position.set(0, 7.1, 0.44);
    gateGroup.add(plaqueFace);

    // 山門前進香玉階 (5階步道)
    for (let i = 0; i < 5; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(11.2 - i * 0.4, 0.12, 0.55), baseMat);
      step.position.set(0, -i * 0.12, 1.2 + i * 0.55);
      gateGroup.add(step);
    }

    // 點擊判定區
    const gateHit = new THREE.Mesh(new THREE.BoxGeometry(11.5, 9.0, 1.5), new THREE.MeshBasicMaterial({ visible: false }));
    gateHit.position.set(0, 4.5, 0);
    gateGroup.add(gateHit);
    this.interactiveObjects.push(gateHit);
    gateHit.userData = { type: "mountainGate", tooltip: "⛩️ 巍峨山門牌樓 • 步入聖境，滌淨塵心 (點擊祈福)" };

    this.scene.add(gateGroup);
  }

  // 4. 青石守護神獅 (雄獅踩繡球、雌獅撫幼獅)
  buildStoneLions() {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x5a524c, roughness: 0.65 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.4 });

    [-5.5, 5.5].forEach((x, idx) => {
      const lionGroup = new THREE.Group();
      lionGroup.position.set(x, 0, 34.0);
      lionGroup.rotation.y = x > 0 ? -Math.PI / 12 : Math.PI / 12;

      // 雕花石台座
      const pedestal = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1.8), stoneMat);
      pedestal.position.y = 0.45;
      pedestal.castShadow = true;
      lionGroup.add(pedestal);

      // 獅身
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 1.2), stoneMat);
      body.position.set(0, 1.25, 0);
      body.castShadow = true;
      lionGroup.add(body);

      // 獅頭
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 16, 16), stoneMat);
      head.position.set(0, 1.8, 0.35);
      lionGroup.add(head);

      // 卷毛鬃毛
      for (let m = 0; m < 6; m++) {
        const mane = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), stoneMat);
        mane.position.set((m % 3 - 1) * 0.32, 1.85, 0.1 - Math.floor(m / 3) * 0.25);
        lionGroup.add(mane);
      }

      // 繡球 / 幼獅
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), redMat);
      ball.position.set(x > 0 ? -0.25 : 0.25, 0.95, 0.6);
      lionGroup.add(ball);

      // 判定區
      const hit = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 2.0), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.y = 1.1;
      lionGroup.add(hit);
      this.interactiveObjects.push(hit);
      hit.userData = {
        type: "stoneLion",
        tooltip: `🦁 青石神獅（${idx === 0 ? "雄獅踏繡球" : "雌獅撫幼獅"}）• 威鎮山門辟邪迎祥 (按 [E] 亦可)`
      };

      this.scene.add(lionGroup);
    });
  }

  // 5. 神道宮燈與旌旗大道 (Z: 22.0 ~ 36.0)
  buildLanternAvenue() {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6e665e, roughness: 0.6 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8a1c1c, roughness: 0.4 });

    [22.0, 26.0, 30.0, 34.0].forEach((z, zIdx) => {
      [-3.8, 3.8].forEach(x => {
        const lanternGroup = new THREE.Group();
        lanternGroup.position.set(x, 0, z);

        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.3, 8), stoneMat);
        base.position.y = 0.15;
        lanternGroup.add(base);

        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.4, 8), stoneMat);
        pillar.position.y = 0.9;
        lanternGroup.add(pillar);

        // 燈室與金光
        const chamber = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.35, 0.5, 6),
          new THREE.MeshStandardMaterial({ color: 0xffaa33, emissive: 0x884411 })
        );
        chamber.position.y = 1.7;
        lanternGroup.add(chamber);

        const roof = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.35, 6), stoneMat);
        roof.position.y = 2.1;
        lanternGroup.add(roof);

        // 燈幢點光源
        const pLight = new THREE.PointLight(0xff9922, 0.85, 4.5);
        pLight.position.set(0, 1.7, 0);
        lanternGroup.add(pLight);
        this.lanternLights.push(pLight);

        // 綵旗神幡
        const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 4.2), woodMat);
        flagPole.position.set(x > 0 ? 0.6 : -0.6, 2.1, 0);
        lanternGroup.add(flagPole);

        const flag = new THREE.Mesh(
          new THREE.PlaneGeometry(0.55, 1.2),
          new THREE.MeshStandardMaterial({ color: zIdx % 2 === 0 ? 0xd4a034 : 0xcc2222, side: THREE.DoubleSide })
        );
        flag.position.set(x > 0 ? 0.9 : -0.9, 3.2, 0);
        lanternGroup.add(flag);

        this.scene.add(lanternGroup);
      });
    });
  }

  // 6. 漢白玉圍欄與深山古松林 (四周邊界)
  buildPerimeterTreesAndWalls() {
    const railMat = new THREE.MeshStandardMaterial({ color: 0xd8d0c8, roughness: 0.5 });
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x3d281a, roughness: 0.8 });
    const pineNeedleMat = new THREE.MeshStandardMaterial({ color: 0x183818, roughness: 0.6 });

    // 漢白玉圍欄 (左右兩側 X = ±18.2, 縱貫 Z: 5.8 ~ 42.0)
    [-18.2, 18.2].forEach(x => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.85, 36.5), railMat);
      rail.position.set(x, 0.42, 24.0);
      this.scene.add(rail);

      // 望柱荷花蓮瓣
      for (let z = 6.0; z <= 42.0; z += 3.0) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.15, 8), railMat);
        post.position.set(x, 0.58, z);
        this.scene.add(post);

        const bud = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), railMat);
        bud.position.set(x, 1.22, z);
        this.scene.add(bud);
      }
    });

    // 外圍深山松柏古樹群 (X = ±20.5)
    [-20.5, 20.5].forEach(x => {
      for (let z = 7.0; z <= 41.0; z += 4.5) {
        const tree = new THREE.Group();
        tree.position.set(x + (Math.random() - 0.5) * 1.5, 0, z + (Math.random() - 0.5) * 1.5);

        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 3.8, 8), treeTrunkMat);
        trunk.position.y = 1.9;
        tree.add(trunk);

        // 三層錐形松樹冠
        [2.8, 3.8, 4.8].forEach((ty, lvl) => {
          const foliage = new THREE.Mesh(new THREE.ConeGeometry(1.6 - lvl * 0.35, 1.6, 8), pineNeedleMat);
          foliage.position.y = ty;
          foliage.castShadow = true;
          tree.add(foliage);
        });

        this.scene.add(tree);
      }
    });
  }

  // 大殿千佛光明燈塔 (Twin 3D Lantern Pagodas)
  buildLanternPagodas() {
    this.lanternPagodaTiers = [];
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.7, roughness: 0.3 });
    const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xffb84d });

    const pagodaPositions = [
      [-3.6, -0.6], [3.6, -0.6]
    ];

    pagodaPositions.forEach(([px, pz]) => {
      const pagodaGroup = new THREE.Group();
      pagodaGroup.position.set(px, 0, pz);

      for (let tier = 0; tier < 5; tier++) {
        const y = 0.4 + tier * 0.65;
        const radius = 0.65 - tier * 0.08;

        const eave = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.7, radius, 0.08, 6), goldMat);
        eave.position.y = y + 0.3;
        pagodaGroup.add(eave);

        for (let j = 0; j < 6; j++) {
          const angle = (j / 6) * Math.PI * 2;
          const lx = Math.cos(angle) * (radius * 0.75);
          const lz = Math.sin(angle) * (radius * 0.75);

          const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), lampGlowMat);
          lamp.position.set(lx, y + 0.12, lz);
          pagodaGroup.add(lamp);
          this.lanternPagodaTiers.push(lamp);
        }
      }

      const topJewel = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffe885 }));
      topJewel.position.y = 3.8;
      pagodaGroup.add(topJewel);

      this.scene.add(pagodaGroup);
    });
  }

  igniteLanternOnPagoda(name = "善信") {
    if (this.lanternPagodaTiers.length === 0) return;
    const targetLamp = this.lanternPagodaTiers[Math.floor(Math.random() * this.lanternPagodaTiers.length)];
    if (targetLamp) {
      const worldPos = new THREE.Vector3();
      targetLamp.getWorldPosition(worldPos);

      this.spawn3DFloatingText(`🏮 ${name} 長明祈福`, worldPos.clone().add(new THREE.Vector3(0, 0.4, 0)));
      if (window.templeAudio) window.templeAudio.playBell(720);
    }
  }

  buildHangingLanterns() {
    [
      [-2.6, 3.5, -0.5],
      [2.6, 3.5, -0.5],
      [-2.6, 3.5, 1.8],
      [2.6, 3.5, 1.8]
    ].forEach(([x, y, z], idx) => {
      const group = new THREE.Group();
      group.position.set(x, y, z);

      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2), new THREE.MeshBasicMaterial({ color: 0x9e782f }));
      rope.position.y = 0.6;
      group.add(rope);

      const bodyGeo = new THREE.SphereGeometry(0.32, 16, 16);
      bodyGeo.scale(1, 1.3, 1);
      const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: 0xcc2222, emissive: 0x771111, roughness: 0.4 }));
      group.add(body);

      // 宮燈點光源
      const lanternLight = new THREE.PointLight(0xff7722, 1.2, 4.5);
      lanternLight.position.set(0, 0, 0);
      group.add(lanternLight);
      this.lanternLights.push(lanternLight);

      const capGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.08, 16);
      const capMat = new THREE.MeshStandardMaterial({ color: 0xf5c542, metalness: 0.8 });
      const capTop = new THREE.Mesh(capGeo, capMat);
      capTop.position.y = 0.42;
      group.add(capTop);

      const capBottom = new THREE.Mesh(capGeo, capMat);
      capBottom.position.y = -0.42;
      group.add(capBottom);

      const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.06, 0.35, 8), capMat);
      tassel.position.y = -0.62;
      group.add(tassel);

      this.scene.add(group);
      this.lanterns.push({ group, offset: idx * 0.8 });
    });
  }

  buildAltarAndDeity() {
    const altarGroup = new THREE.Group();
    altarGroup.position.set(0, 0, -0.6);

    const tableTopGeo = new THREE.BoxGeometry(4.2, 0.2, 1.6);
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x42150e, roughness: 0.3, metalness: 0.15 });
    const tableTop = new THREE.Mesh(tableTopGeo, tableMat);
    tableTop.position.y = 1.25;
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    tableTop.userData = { type: "feastTable", tooltip: "🍱 供品桌 • 擺供、敬獻與收供" };
    this.interactiveObjects.push(tableTop);
    altarGroup.add(tableTop);

    const skirt = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.75, 1.5), new THREE.MeshStandardMaterial({ color: 0x821a1a, roughness: 0.5 }));
    skirt.position.y = 0.78;
    altarGroup.add(skirt);

    const legGeo = new THREE.BoxGeometry(0.2, 1.2, 0.2);
    [[-1.9, -0.65], [1.9, -0.65], [-1.9, 0.65], [1.9, 0.65]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, tableMat);
      leg.position.set(lx, 0.6, lz);
      leg.castShadow = true;
      altarGroup.add(leg);
    });

    this.offeringTableMaterials = { base: tableMat, skirt: skirt.material };
    this.offeringTableDecor = new THREE.Group(); this.offeringTableDecor.userData.noCollision = true;
    altarGroup.add(this.offeringTableDecor);
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xd9ae54, metalness: 0.7, roughness: 0.3 });
    for (const y of [0.43, 1.12]) {
      const border = new THREE.Mesh(new THREE.BoxGeometry(4.06, 0.035, 0.025), trimMat); border.position.set(0, y, 0.765); this.offeringTableDecor.add(border);
    }
    for (let i = -4; i <= 4; i++) {
      const motif = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.014, 5, 4), trimMat);
      motif.position.set(i * 0.43, 0.79, 0.77); motif.rotation.z = Math.PI / 4; this.offeringTableDecor.add(motif);
    }
    this.offeringTableCloth = new THREE.Mesh(new THREE.BoxGeometry(4.14, 0.68, 0.025), new THREE.MeshStandardMaterial({ color: 0xb01825, roughness: 0.95 }));
    this.offeringTableCloth.position.set(0, 0.79, 0.756); this.offeringTableCloth.userData.noCollision = true; altarGroup.add(this.offeringTableCloth);
    this.offeringTable = altarGroup;
    this.updateOfferingTableStyle(window.templeInventory?.data.offering.style || "wood");
    this.scene.add(altarGroup);
    this.buildDeityThrone();
  }

  updateOfferingTableStyle(style = "wood") {
    if (!this.offeringTableMaterials) return;
    const stone = style === "stone", brocade = style === "brocade";
    this.offeringTableMaterials.base.color.set(stone ? 0x788780 : brocade ? 0x4b1714 : 0x42150e);
    this.offeringTableMaterials.base.roughness = stone ? 0.85 : 0.3;
    this.offeringTableMaterials.base.metalness = stone ? 0 : 0.15;
    this.offeringTableMaterials.skirt.color.set(stone ? 0x8b9790 : brocade ? 0xa31922 : 0x5d2716);
    this.offeringTableCloth.visible = brocade;
    this.offeringTableDecor.visible = !stone;
    this.offeringTable.userData.style = stone ? "stone" : brocade ? "brocade" : "wood";
  }

}

installTempleMixin(TempleArchitectureMixin);
