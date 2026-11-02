// scene/festival.js - 鐘鼓與遶境：東天鐘樓、西暮鼓樓、神轎出巡與鞭炮

class TempleFestivalMixin {
  // 14. 東側前埕：晨鐘天鐘樓 (X: 9.5, Z: 30.0)
  buildBellTower() {
    const towerGroup = new THREE.Group();
    towerGroup.position.set(9.5, 0, 30.0);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4a423e, roughness: 0.7 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x7c1a1a, roughness: 0.5 });
    const tileMat = new THREE.MeshStandardMaterial({ color: 0x243d34, roughness: 0.45 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.7, roughness: 0.3 });
    const bronzeMat = new THREE.MeshStandardMaterial({ color: 0x826842, metalness: 0.85, roughness: 0.35 });

    // 1. 基座石階
    const baseGeo = new THREE.BoxGeometry(4.2, 0.7, 4.2);
    const base = new THREE.Mesh(baseGeo, stoneMat);
    base.position.y = 0.35;
    base.receiveShadow = true;
    towerGroup.add(base);

    // 2. 四根朱紅大柱
    const pillarPositions = [
      [-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]
    ];
    pillarPositions.forEach(([px, pz]) => {
      const pGeo = new THREE.CylinderGeometry(0.14, 0.16, 3.6, 12);
      const pillar = new THREE.Mesh(pGeo, woodMat);
      pillar.position.set(px, 2.5, pz);
      pillar.castShadow = true;
      towerGroup.add(pillar);
    });

    // 3. 飛簷屋頂 (重檐歇山頂)
    const roof1 = new THREE.Mesh(new THREE.ConeGeometry(3.6, 1.2, 4), tileMat);
    roof1.position.y = 4.6;
    roof1.rotation.y = Math.PI / 4;
    towerGroup.add(roof1);

    const roof2 = new THREE.Mesh(new THREE.ConeGeometry(2.6, 0.9, 4), tileMat);
    roof2.position.y = 5.4;
    roof2.rotation.y = Math.PI / 4;
    towerGroup.add(roof2);

    // 金色寶頂
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), goldMat);
    finial.position.y = 6.0;
    towerGroup.add(finial);

    // 4. 大梵金鐘 (Grand Bronze Bell)
    const bellGroup = new THREE.Group();
    bellGroup.position.set(0, 2.6, 0);

    const bellBody = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.95, 1.5, 20), bronzeMat);
    bellBody.castShadow = true;
    bellGroup.add(bellBody);

    const bellTop = new THREE.Mesh(new THREE.SphereGeometry(0.56, 16, 16), bronzeMat);
    bellTop.position.y = 0.75;
    bellGroup.add(bellTop);

    // 鐘口祥雲下緣
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.96, 0.08, 12, 24), goldMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -0.75;
    bellGroup.add(rim);

    // 鐘紐蒲牢神獸吊環
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.06, 8, 16), goldMat);
    hook.position.y = 1.35;
    bellGroup.add(hook);

    towerGroup.add(bellGroup);

    // 5. 懸掛撞木 (Striker Log)
    const strikerGroup = new THREE.Group();
    strikerGroup.position.set(1.5, 3.2, 0);

    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 8), woodMat);
    cord.position.set(0, -0.6, 0);
    strikerGroup.add(cord);

    const logGeo = new THREE.CylinderGeometry(0.12, 0.14, 1.4, 12);
    const logMat = new THREE.MeshStandardMaterial({ color: 0x5a2d0c, roughness: 0.8 });
    const log = new THREE.Mesh(logGeo, logMat);
    log.rotation.z = Math.PI / 2;
    log.position.set(-0.3, -1.2, 0);
    strikerGroup.add(log);

    // 撞木紅綢彩帶
    const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.15), new THREE.MeshBasicMaterial({ color: 0xd93838 }));
    ribbon.position.set(-0.3, -1.4, 0);
    strikerGroup.add(ribbon);

    towerGroup.add(strikerGroup);
    this.bellStrikerMesh = strikerGroup;

    // 點擊判定區
    const hitBox = new THREE.Mesh(new THREE.BoxGeometry(4.2, 5.5, 4.2), new THREE.MeshBasicMaterial({ visible: false }));
    hitBox.position.set(0, 2.75, 0);
    towerGroup.add(hitBox);
    this.interactiveObjects.push(hitBox);
    hitBox.userData = {
      type: "bellTower",
      tooltip: "🔔 東天鐘樓 • 叩撞金鐘祈福 (按 [E] 亦可)"
    };

    this.scene.add(towerGroup);
  }

  // 15. 西側前埕：暮鼓雷音樓 (X: -9.5, Z: 30.0)
  buildDrumTower() {
    const towerGroup = new THREE.Group();
    towerGroup.position.set(-9.5, 0, 30.0);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4a423e, roughness: 0.7 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x7c1a1a, roughness: 0.5 });
    const tileMat = new THREE.MeshStandardMaterial({ color: 0x243d34, roughness: 0.45 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.7, roughness: 0.3 });
    const drumSkinMat = new THREE.MeshStandardMaterial({ color: 0xded2b8, roughness: 0.85 });

    // 1. 基座石階
    const base = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.7, 4.2), stoneMat);
    base.position.y = 0.35;
    base.receiveShadow = true;
    towerGroup.add(base);

    // 2. 四根朱紅大柱
    const pillarPositions = [
      [-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]
    ];
    pillarPositions.forEach(([px, pz]) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.6, 12), woodMat);
      p.position.set(px, 2.5, pz);
      p.castShadow = true;
      towerGroup.add(p);
    });

    // 3. 飛簷屋頂
    const roof1 = new THREE.Mesh(new THREE.ConeGeometry(3.6, 1.2, 4), tileMat);
    roof1.position.y = 4.6;
    roof1.rotation.y = Math.PI / 4;
    towerGroup.add(roof1);

    const roof2 = new THREE.Mesh(new THREE.ConeGeometry(2.6, 0.9, 4), tileMat);
    roof2.position.y = 5.4;
    roof2.rotation.y = Math.PI / 4;
    towerGroup.add(roof2);

    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), goldMat);
    finial.position.y = 6.0;
    towerGroup.add(finial);

    // 4. 雷音大天鼓 (Grand Temple Drum)
    const drumGroup = new THREE.Group();
    drumGroup.position.set(0, 2.5, 0);

    const bodyGeo = new THREE.CylinderGeometry(0.9, 0.9, 1.3, 24);
    const drumBody = new THREE.Mesh(bodyGeo, woodMat);
    drumBody.rotation.z = Math.PI / 2;
    drumBody.castShadow = true;
    drumGroup.add(drumBody);

    const skinGeo = new THREE.CircleGeometry(0.88, 24);
    const skinLeft = new THREE.Mesh(skinGeo, drumSkinMat);
    skinLeft.rotation.y = -Math.PI / 2;
    skinLeft.position.x = -0.655;
    drumGroup.add(skinLeft);

    const skinRight = new THREE.Mesh(skinGeo, drumSkinMat);
    skinRight.rotation.y = Math.PI / 2;
    skinRight.position.x = 0.655;
    drumGroup.add(skinRight);

    const rimL = new THREE.Mesh(new THREE.TorusGeometry(0.91, 0.04, 8, 24), goldMat);
    rimL.rotation.y = Math.PI / 2;
    rimL.position.x = -0.64;
    drumGroup.add(rimL);

    const rimR = new THREE.Mesh(new THREE.TorusGeometry(0.91, 0.04, 8, 24), goldMat);
    rimR.rotation.y = Math.PI / 2;
    rimR.position.x = 0.64;
    drumGroup.add(rimR);

    // 鼓架 (四足雕花木架)
    const standMat = new THREE.MeshStandardMaterial({ color: 0x3d1708, roughness: 0.7 });
    for (let sx of [-0.4, 0.4]) {
      for (let sz of [-0.6, 0.6]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.8, 8), standMat);
        leg.position.set(sx, -0.9, sz);
        drumGroup.add(leg);
      }
    }

    towerGroup.add(drumGroup);

    // 5. 紅纓鼓槌
    const stickGroup = new THREE.Group();
    stickGroup.position.set(0.9, 2.5, 0.4);

    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.75, 8), woodMat);
    stick.rotation.x = Math.PI / 4;
    stickGroup.add(stick);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshBasicMaterial({ color: 0xd93838 }));
    head.position.set(0, 0.25, -0.25);
    stickGroup.add(head);

    towerGroup.add(stickGroup);
    this.drumstickMesh = stickGroup;

    // 點擊判定區
    const hitBox = new THREE.Mesh(new THREE.BoxGeometry(4.2, 5.5, 4.2), new THREE.MeshBasicMaterial({ visible: false }));
    hitBox.position.set(0, 2.75, 0);
    towerGroup.add(hitBox);
    this.interactiveObjects.push(hitBox);
    hitBox.userData = {
      type: "drumTower",
      tooltip: "🥁 西暮鼓樓 • 擊響雷鼓祈福 (按 [E] 亦可)"
    };

    this.scene.add(towerGroup);
  }

  // 16. 迎神遶境八抬神轎與儀仗隊伍 (中央神道起點)
  buildPalanquinProcession() {
    this.palanquinGroup = new THREE.Group();
    // 平時停在御道東側，不擋大殿入口的視線；遶境時才移到中央御道
    this.palanquinGroup.position.set(PALANQUIN_REST_X, 0.8, PALANQUIN_REST_Z);

    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf5c542, metalness: 0.8, roughness: 0.25 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0x991f1f, roughness: 0.45 });
    const yellowSilkMat = new THREE.MeshStandardMaterial({ color: 0xf5cf3d, roughness: 0.55 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a180d, roughness: 0.7 });

    // 1. 兩條超長金龍雕花抬轎大桿 (長 4.8m)
    for (let x of [-0.65, 0.65]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 4.8, 12), redMat);
      pole.rotation.x = Math.PI / 2;
      this.palanquinGroup.add(pole);

      // 前後金龍首飾
      for (let z of [-2.4, 2.4]) {
        const dragonHead = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.25, 8), goldMat);
        dragonHead.rotation.x = z > 0 ? Math.PI / 2 : -Math.PI / 2;
        dragonHead.position.set(x, 0, z);
        this.palanquinGroup.add(dragonHead);
      }
    }

    // 2. 八抬轎廂 (Palanquin Cabin)
    const cabin = new THREE.Group();
    cabin.position.set(0, 0.2, 0);

    const floor = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 1.1), woodMat);
    cabin.add(floor);

    for (let cx of [-0.48, 0.48]) {
      for (let cz of [-0.48, 0.48]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.1, 8), goldMat);
        col.position.set(cx, 0.55, cz);
        cabin.add(col);
      }
    }

    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.55, 4), yellowSilkMat);
    roof.position.y = 1.35;
    roof.rotation.y = Math.PI / 4;
    cabin.add(roof);

    for (let rx of [-0.6, 0.6]) {
      for (let rz of [-0.6, 0.6]) {
        const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.25, 6), new THREE.MeshBasicMaterial({ color: 0xd93838 }));
        tassel.position.set(rx, 1.1, rz);
        cabin.add(tassel);
      }
    }

    const statue = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.65, 12), goldMat);
    statue.position.set(0, 0.38, 0);
    cabin.add(statue);

    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 8, 20), new THREE.MeshBasicMaterial({ color: 0xffe885 }));
    halo.position.set(0, 0.65, -0.05);
    cabin.add(halo);

    this.palanquinGroup.add(cabin);

    // 3. 轎前旋轉黃羅涼傘 (Imperial Sun Canopy)
    this.liangsanMesh = new THREE.Group();
    this.liangsanMesh.position.set(0, 0, 2.2);

    const umbrellaPole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 8), woodMat);
    umbrellaPole.position.y = 1.1;
    this.liangsanMesh.add(umbrellaPole);

    const umbrellaTop = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.55, 0.35, 16), yellowSilkMat);
    umbrellaTop.position.y = 1.95;
    this.liangsanMesh.add(umbrellaTop);

    const umbrellaRoof = new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.25, 16), goldMat);
    umbrellaRoof.position.y = 2.2;
    this.liangsanMesh.add(umbrellaRoof);

    this.palanquinGroup.add(this.liangsanMesh);

    // 點擊判定區
    const hitBox = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.8, 5.0), new THREE.MeshBasicMaterial({ visible: false }));
    hitBox.position.set(0, 1.2, 0);
    this.palanquinGroup.add(hitBox);
    this.interactiveObjects.push(hitBox);
    hitBox.userData = {
      type: "palanquin",
      tooltip: "🏮 神明聖駕 • 恭敬鑽轎腳 / 隨香護駕 (按 [E] 亦可)"
    };

    this.scene.add(this.palanquinGroup);
  }

  // 叩撞金鐘動作與特效
  strikeBell() {
    if (this.isBellStriking) return;
    this.isBellStriking = true;
    window.emitRitual?.("bell");

    if (window.templeAudio) window.templeAudio.playTempleBellStrike();

    if (this.bellStrikerMesh) {
      let swingProgress = 0;
      const initialRotZ = this.bellStrikerMesh.rotation.z;
      const swingInterval = setInterval(() => {
        swingProgress += 0.12;
        if (swingProgress < Math.PI) {
          this.bellStrikerMesh.rotation.z = initialRotZ + Math.sin(swingProgress) * 0.45;
        } else {
          this.bellStrikerMesh.rotation.z = initialRotZ;
          clearInterval(swingInterval);
          this.isBellStriking = false;
        }
      }, 25);
    } else {
      setTimeout(() => { this.isBellStriking = false; }, 800);
    }

    const waveGeo = new THREE.RingGeometry(0.3, 0.45, 24);
    const waveMat = new THREE.MeshBasicMaterial({ color: 0xffe885, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const wave = new THREE.Mesh(waveGeo, waveMat);
    wave.rotation.x = Math.PI / 2;
    wave.position.set(9.5, 2.0, 30.0);
    this.scene.add(wave);
    this.pondRipples.push({ mesh: wave, birth: performance.now(), duration: 2500 });

    this.spawn3DFloatingText("🔔 晨鐘震響 • 萬籟俱寂，梵音廣被！", new THREE.Vector3(9.5, 3.8, 30.0));
    if (window.addMerit) window.addMerit(108);
    if (window.setDockStatus) window.setDockStatus("🔔 東鐘樓大梵金鐘鳴響！萬籟俱寂，煩惱全消，增長無量功德 +108！");
    if (window.liveTempleWall) window.liveTempleWall.addDanmaku("🔔 叩撞東天鐘樓大梵金鐘：願此鐘聲超法界，鐵圍幽暗悉皆聞！");
    this.avatar?.triggerAction("bow");
  }

  // 擊響雷鼓動作與特效
  beatDrum() {
    if (this.isDrumBeating) return;
    this.isDrumBeating = true;
    window.emitRitual?.("drum");

    if (window.templeAudio) window.templeAudio.playTempleDrumStrike();

    if (this.drumstickMesh) {
      let beatProgress = 0;
      const initialRotX = this.drumstickMesh.rotation.x;
      const beatInterval = setInterval(() => {
        beatProgress += 0.14;
        if (beatProgress < Math.PI) {
          this.drumstickMesh.rotation.x = initialRotX - Math.sin(beatProgress) * 0.4;
        } else {
          this.drumstickMesh.rotation.x = initialRotX;
          clearInterval(beatInterval);
          this.isDrumBeating = false;
        }
      }, 25);
    } else {
      setTimeout(() => { this.isDrumBeating = false; }, 600);
    }

    const waveGeo = new THREE.RingGeometry(0.4, 0.6, 24);
    const waveMat = new THREE.MeshBasicMaterial({ color: 0xff5533, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const wave = new THREE.Mesh(waveGeo, waveMat);
    wave.rotation.x = Math.PI / 2;
    wave.position.set(-9.5, 2.0, 30.0);
    this.scene.add(wave);
    this.pondRipples.push({ mesh: wave, birth: performance.now(), duration: 2200 });

    this.spawn3DFloatingText("🥁 暮鼓雷音 • 警世破迷，慧光通明！", new THREE.Vector3(-9.5, 3.8, 30.0));
    if (window.addMerit) window.addMerit(108);
    if (window.setDockStatus) window.setDockStatus("🥁 西鼓樓雷音法鼓震響！破迷啟悟，正氣充盈，增長無量功德 +108！");
    if (window.liveTempleWall) window.liveTempleWall.addDanmaku("🥁 擊響西暮鼓樓法雨雷音鼓：如雷警世，破除三障，福慧雙圓！");
    this.avatar?.triggerAction("bow");
  }

  // 迎神遶境巡禮啟動
  startParade() {
    if (this.isParading) {
      if (window.setDockStatus) window.setDockStatus("🏮 迎神遶境巡禮正在盛大進行中！可隨香同行護駕。");
      return;
    }
    this.isParading = true;
    this.paradeZ = PALANQUIN_REST_Z;
    this.paradeDirection = 1;
    this.hasKneeledUnderPalanquin = false;

    if (window.templeAudio) window.templeAudio.playParadeMusic();
    this.spawn3DFloatingText("🏮 聖駕起駕 • 迎神遶境大吉！", new THREE.Vector3(0, 3.2, PALANQUIN_REST_Z));

    if (window.setDockStatus) window.setDockStatus("🏮 神明聖駕起駕！八抬大轎出巡，鑼鼓齊鳴、鞭炮喧天！信眾可隨香祈福！");
    if (window.liveTempleWall) window.liveTempleWall.addDanmaku("🏮 恭迎神明聖駕出巡遶境！風調雨順，國泰民安，四時吉祥！");

    this.setCameraView("parade");
  }

  spawnFirecrackerParticle() {
    if (!this.palanquinGroup) return;
    const x = (Math.random() > 0.5 ? 1 : -1) * (1.6 + Math.random() * 1.6);
    const z = this.palanquinGroup.position.z + (Math.random() - 0.5) * 3.0;

    const sparkGeo = new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 6, 6);
    const sparkMat = new THREE.MeshBasicMaterial({
      color: Math.random() > 0.3 ? 0xffea00 : 0xff3300,
      transparent: true,
      opacity: 0.95
    });
    const spark = new THREE.Mesh(sparkGeo, sparkMat);
    spark.position.set(x, 0.15 + Math.random() * 0.4, z);
    this.scene.add(spark);

    this.firecrackerParticles.push({
      mesh: spark,
      vx: (Math.random() - 0.5) * 0.04,
      vy: 0.03 + Math.random() * 0.05,
      vz: (Math.random() - 0.5) * 0.04,
      life: 0,
      maxLife: 35 + Math.random() * 20
    });
  }

  kneelUnderPalanquin() {
    if (this.hasKneeledUnderPalanquin) return;
    this.hasKneeledUnderPalanquin = true;
    setTimeout(() => { this.hasKneeledUnderPalanquin = false; }, 8000);

    this.avatar?.triggerAction("kneel");
    if (window.templeAudio) window.templeAudio.playBell(792);

    const jiaoZ = this.palanquinGroup ? this.palanquinGroup.position.z : 12.0;
    this.spawn3DFloatingText("✨ 聖駕過頂 • 鑽轎腳大吉！消災延壽", new THREE.Vector3(0, 2.2, jiaoZ));
    if (window.addMerit) window.addMerit(168);
    if (window.setDockStatus) window.setDockStatus("✨ 善信恭迎聖駕鑽轎腳！神威從頂門加持，消災解厄，賜福延壽，功德 +168！");
    if (window.liveTempleWall) window.liveTempleWall.addDanmaku("✨ 誠心伏地鑽轎腳！蒙神聖過頂加持，逢凶化吉、百病皆消！");
  }
}

installTempleMixin(TempleFestivalMixin);
