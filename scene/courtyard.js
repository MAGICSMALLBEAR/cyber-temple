// scene/courtyard.js - 廟埕：天公爐、蓮花許願池與錦鯉、八角金爐、天燈與水燈

class TempleCourtyardMixin {
  // 7. 戶外天公爐 (中進中央 Z: 11.5)
  buildHeavenCenser() {
    this.heavenCenser = new THREE.Group();
    this.heavenCenser.position.set(0, 0, 11.5);
    this.heavenCenser.name = "heavenCenser";

    const bronzeMat = new THREE.MeshStandardMaterial({ color: 0xb5882e, metalness: 0.85, roughness: 0.3 });

    // 天公高腳八卦鼎
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.75, 0.35, 8), bronzeMat);
    base.position.y = 0.175;
    this.heavenCenser.add(base);

    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.8, 12), bronzeMat);
    pillar.position.y = 0.75;
    this.heavenCenser.add(pillar);

    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.55, 0.65, 16), bronzeMat);
    bowl.position.y = 1.35;
    bowl.castShadow = true;
    this.heavenCenser.add(bowl);

    // 香灰與通天大香
    const ash = new THREE.Mesh(new THREE.CircleGeometry(0.65, 16), new THREE.MeshStandardMaterial({ color: 0x888078 }));
    ash.rotation.x = -Math.PI / 2;
    ash.position.y = 1.65;
    this.heavenCenser.add(ash);

    const bigStick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 1.5, 8),
      new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.7 })
    );
    bigStick.position.y = 2.3;
    this.heavenCenser.add(bigStick);

    const ember = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff4400 }));
    ember.position.y = 3.05;
    this.heavenCenser.add(ember);

    this.interactiveObjects.push(bowl);
    bowl.userData = { type: "heavenCenser", tooltip: "🔥 點擊天公爐 或 走近按 [E]：敬拜天公 (行禮)" };

    this.scene.add(this.heavenCenser);
  }

  // 8. 東進院落：蓮花池與九曲石拱橋 (X: 12.5, Z: 13.5)
  buildWishingPond() {
    this.wishingPond = new THREE.Group();
    this.wishingPond.position.set(12.5, 0, 13.5);
    this.wishingPond.name = "wishingPond";

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4d423b, roughness: 0.8 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x6e6056, roughness: 0.6 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.5 });
    const lotusMat = new THREE.MeshStandardMaterial({ color: 0xf06292, roughness: 0.4 });
    const goldCenterMat = new THREE.MeshStandardMaterial({ color: 0xffd54f, metalness: 0.8 });

    // 大荷花池岸 (寬 8.5m x 長 12m)
    const pondBase = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.4, 12.5), stoneMat);
    pondBase.position.y = 0.2;
    this.wishingPond.add(pondBase);

    // 水面 (翠綠清澈微波)
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x1d5d61,
      roughness: 0.1,
      metalness: 0.5,
      transparent: true,
      opacity: 0.88
    });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(8.0, 12.0), waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.35;
    this.wishingPond.add(water);

    // 跨池九曲石拱橋 (3D 實體可走踏拱橋)
    const bridgeGroup = new THREE.Group();
    const bridgeArch = new THREE.Mesh(
      new THREE.BoxGeometry(7.8, 0.22, 1.6),
      new THREE.MeshStandardMaterial({ color: 0xd8d0c8, roughness: 0.6 })
    );
    bridgeArch.position.set(0, 0.55, 0);
    bridgeGroup.add(bridgeArch);

    // 拱橋欄杆
    [-0.8, 0.8].forEach(bz => {
      const bRail = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.45, 0.1), rimMat);
      bRail.position.set(0, 0.85, bz);
      bridgeGroup.add(bRail);
    });
    this.wishingPond.add(bridgeGroup);

    // 蓮花座中央金台 (投幣目標)
    const goldPedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 0.3, 8), goldCenterMat);
    goldPedestal.position.set(0, 0.45, 2.8);
    this.wishingPond.add(goldPedestal);

    // 盛開蓮花瓣
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), lotusMat);
      petal.scale.set(0.6, 1.4, 0.3);
      petal.rotation.x = 0.5;
      petal.rotation.y = angle;
      petal.position.set(Math.cos(angle) * 0.24, 0.6, 2.8 + Math.sin(angle) * 0.24);
      this.wishingPond.add(petal);
    }

    // 散落池面蓮葉
    [[-1.8, 1.5], [1.9, -2.4], [-2.2, -1.8], [2.1, 2.2], [-1.2, 3.4]].forEach(([lx, lz]) => {
      const pad = new THREE.Mesh(new THREE.CircleGeometry(0.35, 12), leafMat);
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(lx, 0.36, lz);
      this.wishingPond.add(pad);
    });

    // 錦鯉池水生生態 (Koi Fish Ecology)
    this.buildKoiFish();

    this.interactiveObjects.push(pondBase);
    pondBase.userData = { type: "wishingPond", tooltip: "🪙 點擊許願池 或 走近按 [E]：投擲金幣許願" };

    this.scene.add(this.wishingPond);
  }

  // 構建蓮花池 3D 錦鯉生態群
  buildKoiFish() {
    this.koiFish = [];
    const fishStyles = [
      { name: "kohaku1", color: 0xffffff, spotColor: 0xef4444 }, // 紅白錦鯉
      { name: "kohaku2", color: 0xffffff, spotColor: 0xf97316 }, // 橙白錦鯉
      { name: "gold1", color: 0xf59e0b, spotColor: 0xffd700 }, // 純金黃金錦鯉
      { name: "gold2", color: 0xd97706, spotColor: 0xfbbf24 }, // 琉璃金錦鯉
      { name: "showa", color: 0x1e293b, spotColor: 0xef4444 }, // 墨黑赤紅三色
      { name: "kohaku3", color: 0xfef08a, spotColor: 0xe11d48 } // 緋白錦鯉
    ];

    fishStyles.forEach((style, idx) => {
      const fishGroup = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({
        color: style.color,
        roughness: 0.35,
        metalness: 0.1
      });
      const spotMat = new THREE.MeshStandardMaterial({
        color: style.spotColor,
        roughness: 0.3,
        metalness: 0.2
      });

      // 1. 流線形魚身
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.42, 8), bodyMat);
      body.rotation.x = Math.PI / 2;
      body.scale.set(1.0, 1.0, 0.55);
      fishGroup.add(body);

      // 斑紋色塊
      const spot = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), spotMat);
      spot.scale.set(0.9, 0.4, 1.4);
      spot.position.set(0, 0.02, 0.04);
      fishGroup.add(spot);

      // 2. 擺動尾鰭
      const tailFin = new THREE.Mesh(
        new THREE.PlaneGeometry(0.12, 0.16),
        new THREE.MeshStandardMaterial({ color: style.spotColor, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
      );
      tailFin.position.set(0, 0.02, -0.26);
      fishGroup.add(tailFin);

      // 3. 左右胸鰭
      [-0.07, 0.07].forEach(fx => {
        const fin = new THREE.Mesh(
          new THREE.PlaneGeometry(0.06, 0.09),
          new THREE.MeshStandardMaterial({ color: style.color, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
        );
        fin.position.set(fx, 0, 0.08);
        fin.rotation.z = fx > 0 ? -0.4 : 0.4;
        fin.rotation.y = fx > 0 ? 0.3 : -0.3;
        fishGroup.add(fin);
      });

      // 初始游弋參數 (分佈於蓮花池中)
      const angle = (idx / fishStyles.length) * Math.PI * 2;
      const radiusX = 1.3 + (idx % 3) * 0.7;
      const radiusZ = 2.0 + (idx % 2) * 1.3;
      fishGroup.position.set(Math.cos(angle) * radiusX, 0.25, Math.sin(angle) * radiusZ);

      this.wishingPond.add(fishGroup);

      this.koiFish.push({
        group: fishGroup,
        tailFin: tailFin,
        angle: angle,
        speed: 0.45 + (idx % 4) * 0.15,
        radiusX: radiusX,
        radiusZ: radiusZ,
        targetPos: null,
        jumpProgress: 0,
        baseY: 0.24 + (idx % 3) * 0.03
      });
    });
  }

  // 9. 西進院落：八角金爐閣 (X: -12.5, Z: 14.5)
  buildJossPaperFurnace() {
    this.jossFurnace = new THREE.Group();
    this.jossFurnace.position.set(-12.5, 0, 14.5);
    this.jossFurnace.name = "jossFurnace";

    const brickMat = new THREE.MeshStandardMaterial({ color: 0x8a241c, roughness: 0.75 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.75, roughness: 0.25 });

    // 磚造八角爐身
    const furnaceBase = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 1.8, 8), brickMat);
    furnaceBase.position.y = 0.9;
    furnaceBase.castShadow = true;
    this.jossFurnace.add(furnaceBase);

    // 投紙口 (黑色拱洞 + 內部火光)
    const archHole = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.55, 0.3), new THREE.MeshBasicMaterial({ color: 0x110202 }));
    archHole.position.set(0.9, 0.95, 0);
    archHole.rotation.y = Math.PI / 2;
    this.jossFurnace.add(archHole);

    // 爐內常明火點光源
    const furnaceLight = new THREE.PointLight(0xff5500, 2.6, 5);
    furnaceLight.position.set(0.7, 0.95, 0);
    this.jossFurnace.add(furnaceLight);

    // 爐頂金色寶塔尖
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.1, 8), roofMat);
    roof.position.y = 2.3;
    this.jossFurnace.add(roof);

    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.6, 8), roofMat);
    spire.position.y = 3.0;
    this.jossFurnace.add(spire);

    this.interactiveObjects.push(furnaceBase);
    furnaceBase.userData = { type: "jossFurnace", tooltip: "🔥 點擊金爐 或 走近按 [E]：焚燒金紙化寶" };

    this.scene.add(this.jossFurnace);
  }

  // 投擲金幣許願 (Wishing Coin Toss)
  tossWishingCoin() {
    if (this.isCoinTossing) return;
    this.isCoinTossing = true;
    window.emitRitual?.("coin");

    if (this.avatar) {
      this.avatar.triggerAction("pray");
    }

    // 生成金幣模型
    const coinGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.015, 12);
    const coinMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.1 });
    const coin = new THREE.Mesh(coinGeo, coinMat);

    const startPos = this.avatar ? this.avatar.position.clone().add(new THREE.Vector3(0, 0.8, 0)) : new THREE.Vector3(10.5, 1.0, 13.5);
    const targetPos = new THREE.Vector3(12.5 + (Math.random() - 0.5) * 1.5, 0.36, 13.5 + (Math.random() - 0.5) * 2.0);

    coin.position.copy(startPos);
    this.scene.add(coin);

    const startTime = performance.now();
    const duration = 1100;

    const animateCoin = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress < 1) {
        // 拋物線
        coin.position.lerpVectors(startPos, targetPos, progress);
        coin.position.y += Math.sin(progress * Math.PI) * 1.2;

        coin.rotation.x += 0.25;
        coin.rotation.z += 0.2;
        requestAnimationFrame(animateCoin);
      } else {
        // 落水
        this.scene.remove(coin);
        window.templeAudio.playCoinWaterSplash();

        // 水花漣漪
        this.spawnPondRipple(targetPos);
        this.spawn3DFloatingText("心想事成 • 金幣落池", targetPos.clone().add(new THREE.Vector3(0, 0.6, 0)));

        // 激起錦鯉爭食聚集
        if (this.wishingPond) {
          const localTarget = this.wishingPond.worldToLocal(targetPos.clone());
          this.feedKoiFish(localTarget);
        }

        const wishes = [
          "🪙 金幣入池！文昌帝君保佑：才思泉湧，心想事成！",
          "🪙 金幣落入蓮花池！武財神恩賜：財運大通，八方進寶！",
          "🪙 蓮花泛水！月老牽引：佳偶良緣，和睦美滿！"
        ];
        const wishMsg = wishes[Math.floor(Math.random() * wishes.length)];
        document.getElementById("dockStatusBar").innerText = wishMsg;

        this.isCoinTossing = false;
      }
    };

    requestAnimationFrame(animateCoin);
  }

  // 錦鯉投食爭游
  feedKoiFish(pondLocalPos) {
    if (!this.koiFish) return;
    this.koiFish.forEach(fish => {
      fish.targetPos = pondLocalPos.clone();
      fish.targetPos.y = fish.baseY;
    });
  }

  // 每一影格更新錦鯉游動姿態
  updateKoiFish(time, dt) {
    if (!this.koiFish || this.koiFish.length === 0) return;

    this.koiFish.forEach((fish, idx) => {
      const tailSpeed = fish.targetPos ? 15 : 7;
      fish.tailFin.rotation.y = Math.sin(time * tailSpeed + idx) * 0.38;

      if (fish.targetPos) {
        // 朝投幣水花游動
        const cur = fish.group.position;
        const dx = fish.targetPos.x - cur.x;
        const dz = fish.targetPos.z - cur.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > 0.28) {
          const heading = Math.atan2(dx, dz);
          fish.group.rotation.y = THREE.MathUtils.lerp(fish.group.rotation.y, heading, 0.12);
          fish.group.position.x += Math.sin(heading) * dt * 1.35;
          fish.group.position.z += Math.cos(heading) * dt * 1.35;
        } else {
          // 到達聚攏點，有機會破水翻騰小跳
          if (fish.jumpProgress <= 0 && Math.random() < 0.5) {
            fish.jumpProgress = 1.0;
          }
          fish.targetPos = null;
        }
      } else {
        // 常態巡遊軌跡
        fish.angle += dt * fish.speed * 0.35;
        const curX = Math.cos(fish.angle) * fish.radiusX;
        const curZ = Math.sin(fish.angle) * fish.radiusZ;

        const nextAngle = fish.angle + 0.05;
        const nextX = Math.cos(nextAngle) * fish.radiusX;
        const nextZ = Math.sin(nextAngle) * fish.radiusZ;
        const heading = Math.atan2(nextX - curX, nextZ - curZ);

        fish.group.rotation.y = THREE.MathUtils.lerp(fish.group.rotation.y, heading, 0.08);
        fish.group.position.x = THREE.MathUtils.lerp(fish.group.position.x, curX, 0.08);
        fish.group.position.z = THREE.MathUtils.lerp(fish.group.position.z, curZ, 0.08);
      }

      // 破水小跳躍
      let jumpY = 0;
      if (fish.jumpProgress > 0) {
        fish.jumpProgress -= dt * 2.2;
        jumpY = Math.sin((1 - Math.max(0, fish.jumpProgress)) * Math.PI) * 0.26;
      }
      fish.group.position.y = fish.baseY + jumpY + Math.sin(time * 3 + idx) * 0.012;
    });
  }

  // -------------------------------------------------------------
  // 平溪賽博祈願天燈盛典 (Sky Lanterns)
  // -------------------------------------------------------------
  launchSkyLantern({ text = "萬事順遂", color = "#dc2626", petitionerName = "善信" } = {}) {
    if (!this.skyLanterns) this.skyLanterns = [];

    const lanternGroup = new THREE.Group();
    // 燈罩四角錐梯形
    const lanternGeo = new THREE.CylinderGeometry(0.28, 0.42, 0.75, 4);

    // 動態繪製祈願題詞畫布材質
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 256, 256);

    // 仿古金邊框
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, 232, 232);
    ctx.strokeRect(18, 18, 220, 220);

    // 祈願直書文字
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px 'Noto Serif TC', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const chars = (text || "平安喜樂").split("");
    const startY = 128 - (chars.length * 28) / 2;
    chars.forEach((c, idx) => {
      ctx.fillText(c, 128, startY + idx * 30);
    });

    // 善信落款與小朱印
    ctx.font = "14px serif";
    ctx.fillStyle = "#fef08a";
    ctx.fillText(`${petitionerName || "善信"} 虔祈`, 128, 218);

    const tex = new THREE.CanvasTexture(canvas);
    const lanternMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.4,
      metalness: 0.1,
      transparent: true,
      opacity: 0.92,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.5
    });

    const lanternMesh = new THREE.Mesh(lanternGeo, lanternMat);
    lanternMesh.position.y = 0.38;
    lanternGroup.add(lanternMesh);

    // 底座竹篾鐵圈
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.015, 6, 16), ringMat);
    ring.rotation.x = Math.PI / 2;
    lanternGroup.add(ring);

    // 內部金光燭火點光源
    const fireLight = new THREE.PointLight(0xffaa22, 1.4, 6.0);
    fireLight.position.set(0, 0.3, 0);
    lanternGroup.add(fireLight);

    // 初始位置：信眾面前或廟埕中庭
    let startPos = new THREE.Vector3(0, 1.2, 12.0);
    if (this.avatar) {
      const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.avatar.playerGroup.rotation.y);
      startPos = this.avatar.position.clone().add(forward.multiplyScalar(0.95)).add(new THREE.Vector3(0, 1.1, 0));
    }
    lanternGroup.position.copy(startPos);
    this.scene.add(lanternGroup);

    if (window.templeAudio) {
      window.templeAudio.playSkyLanternLaunch();
    }

    this.skyLanterns.push({
      group: lanternGroup,
      fireLight: fireLight,
      vy: 0.95 + Math.random() * 0.3,
      vx: 0.12 + (Math.random() - 0.5) * 0.15,
      vz: -0.22 + (Math.random() - 0.5) * 0.12,
      rotSpeed: (Math.random() - 0.5) * 0.015,
      life: 0,
      maxLife: 60 + Math.random() * 15
    });

    this.spawn3DFloatingText(`🏮「${text}」祈願天燈冉冉升空，福運直達天聽！`, startPos.clone().add(new THREE.Vector3(0, 0.6, 0)));
  }

  // 每一影格更新天燈漂浮上升物理
  updateSkyLanterns(time, dt) {
    if (!this.skyLanterns || this.skyLanterns.length === 0) return;

    for (let i = this.skyLanterns.length - 1; i >= 0; i--) {
      const sl = this.skyLanterns[i];
      sl.life += dt;

      sl.group.position.y += sl.vy * dt;
      sl.group.position.x += sl.vx * dt;
      sl.group.position.z += sl.vz * dt;

      sl.group.rotation.x = Math.sin(time * 1.8 + i) * 0.05;
      sl.group.rotation.z = Math.cos(time * 1.5 + i) * 0.05;
      sl.group.rotation.y += sl.rotSpeed;

      if (sl.fireLight) {
        sl.fireLight.intensity = 1.1 + Math.sin(time * 10 + i * 2) * 0.35;
      }

      if (sl.life >= sl.maxLife || sl.group.position.y > 65.0) {
        this.scene.remove(sl.group);
        this.skyLanterns.splice(i, 1);
      }
    }
  }

  // 水院祈願水燈 (Floating River Lamp)
  launchWaterLantern({ text = "心願順遂", petitionerName = "善信" } = {}) {
    if (!this.waterLanterns) this.waterLanterns = [];

    const lanternGroup = new THREE.Group();
    const lotusMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.4 });
    const centerMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.3 });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), lotusMat);
      petal.scale.set(0.6, 1.4, 0.3);
      petal.rotation.x = 0.6;
      petal.rotation.y = angle;
      petal.position.set(Math.cos(angle) * 0.12, 0.03, Math.sin(angle) * 0.12);
      lanternGroup.add(petal);
    }
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 8), centerMat);
    candle.position.y = 0.04;
    lanternGroup.add(candle);

    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 6), flameMat);
    flame.position.y = 0.09;
    lanternGroup.add(flame);

    const candleLight = new THREE.PointLight(0xff9900, 0.9, 2.5);
    candleLight.position.y = 0.1;
    lanternGroup.add(candleLight);

    lanternGroup.position.set(12.5 + (Math.random() - 0.5) * 1.5, 0.36, 13.5 + 2.0);
    this.scene.add(lanternGroup);

    if (window.templeAudio) {
      window.templeAudio.playWaterLanternRelease();
    }

    this.waterLanterns.push({
      group: lanternGroup,
      candleLight: candleLight,
      vx: (Math.random() - 0.5) * 0.06,
      vz: (Math.random() - 0.5) * 0.06,
      birth: performance.now(),
      duration: 45000
    });

    this.spawn3DFloatingText(`🪷「${text}」祈願水燈順流漂動，點亮福田！`, lanternGroup.position.clone().add(new THREE.Vector3(0, 0.4, 0)));
  }

  // 每一影格更新水燈漂浮
  updateWaterLanterns(time, dt) {
    if (!this.waterLanterns || this.waterLanterns.length === 0) return;

    const now = performance.now();
    for (let i = this.waterLanterns.length - 1; i >= 0; i--) {
      const wl = this.waterLanterns[i];
      const elapsed = now - wl.birth;
      if (elapsed < wl.duration) {
        wl.group.position.x += wl.vx * dt;
        wl.group.position.z += wl.vz * dt;
        wl.group.rotation.y += dt * 0.05;
        if (wl.candleLight) {
          wl.candleLight.intensity = 0.8 + Math.sin(time * 8 + i) * 0.25;
        }
      } else {
        this.scene.remove(wl.group);
        this.waterLanterns.splice(i, 1);
      }
    }
  }

  spawnPondRipple(pos) {
    const ringGeo = new THREE.RingGeometry(0.02, 0.06, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xaaeedd, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(pos);
    ring.position.y = 0.37;
    this.scene.add(ring);

    this.pondRipples.push({ mesh: ring, birth: performance.now(), duration: 900 });
  }

  // 焚燒金紙化寶 (Joss Paper Burning)
  burnJossPaper() {
    if (this.isBurningPaper) return;
    this.isBurningPaper = true;
    window.emitRitual?.("paper");

    if (this.avatar) {
      this.avatar.triggerAction("bow");
    }

    window.templeAudio.playJossPaperFlame();
    this.spawn3DFloatingText("金紙化寶 • 功德無量", new THREE.Vector3(-12.5, 2.6, 14.5));

    // 金紙張飛入火門
    const paperMat = new THREE.MeshStandardMaterial({ color: 0xf5c542, roughness: 0.4 });
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.12), paperMat);
        paper.position.set(-11.5 + (Math.random() - 0.5) * 0.3, 1.2, 14.5 + (Math.random() - 0.5) * 0.3);
        this.scene.add(paper);

        const pStart = performance.now();
        const fly = (now) => {
          const prog = (now - pStart) / 600;
          if (prog < 1) {
            paper.position.x -= 0.016;
            paper.position.y -= 0.005;
            paper.rotation.z += 0.1;
            requestAnimationFrame(fly);
          } else {
            this.scene.remove(paper);
            // 產生金燼火花
            this.spawnFlameEmber(new THREE.Vector3(-12.5, 1.8, 14.5));
          }
        };
        requestAnimationFrame(fly);
      }, i * 140);
    }

    document.getElementById("dockStatusBar").innerText = "🔥 金紙化寶入金爐！香火長明，神佛共鑒，增福添壽！";
    setTimeout(() => {
      this.isBurningPaper = false;
    }, 1500);
  }

  spawnFlameEmber(pos) {
    const ember = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
    ember.position.copy(pos);
    this.scene.add(ember);
    this.flameParticles.push({ mesh: ember, birth: performance.now(), duration: 800 });
  }
}

installTempleMixin(TempleCourtyardMixin);
