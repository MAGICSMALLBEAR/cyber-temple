// avatar/core.js - 玩家分身核心：建模、頭飾持物、稱號、行走與點擊移動、禮佛動作、骨架動畫
// 護身法器、萌寵、同行分身與 NPC 的方法在 avatar/*.js，以 installAvatarMixin() 掛回 TempleAvatarSystem.prototype

class TempleAvatarSystem {
  constructor(scene, camera, controls) {
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;

    // 角色設定狀態
    this.config = {
      roleType: "novice", // novice(小沙彌), taoist(道門弟子), scholar(文昌學子), tech(科技打工人)
      robeColor: "#c24b2b", // 袍服主色
      hatType: "headband", // none, bun(髮髻), headband(進香布條), taoCap(道士帽)
      title: "悠閒的信眾",
      holdingItem: "incense" // none, incense(持香), mallet(木魚槌), beads(念珠)
    };

    // 玩家角色根節點
    this.playerGroup = new THREE.Group();
    this.playerGroup.name = "playerAvatar";
    this.scene.add(this.playerGroup);

    // 肢體節點 (供骨架動畫驅動)
    this.limbs = {
      head: null,
      torso: null,
      robe: null,
      armL: null,
      armR: null,
      legL: null,
      legR: null,
      heldObject: null,
      headband: null,
      titleSprite: null,
      amuletAura: null,
      baguaMirror: null,
      lotusThrone: null
    };

    this.equippedAmulet = localStorage.getItem("temple_equipped_amulet") || null;

    // 法器結緣閣裝備狀態
    this.relics = JSON.parse(localStorage.getItem("temple_equipped_relics") || "{}");
    this.config.hasLotusSteps = !!this.relics.lotusSteps;
    this.config.hasBaguaMirror = !!this.relics.baguaMirror;
    this.config.hasLotusThrone = !!this.relics.lotusThrone;
    if (this.relics.sword) this.config.holdingItem = "sword";
    else if (this.relics.whisk) this.config.holdingItem = "whisk";
    else if (this.relics.calabash) this.config.holdingItem = "calabash";

    this.lotusDecals = [];
    this.lastStepDecalTime = 0;

    // 移動與物理狀態
    this.position = new THREE.Vector3(0, 0, 4.0);
    this.rotationY = 0;
    this.baseSpeed = 3.2;
    this.sprintSpeed = 6.2;
    this.speed = this.baseSpeed;
    this.isSprinting = false; // 是否開啟疾步奔跑
    this.isMoving = false;
    this.targetPos = null; // 點擊地面移動的目標點

    // 動作狀態機
    // 'idle', 'walk', 'bow', 'kneel', 'pray', 'meditate'
    this.currentAction = "idle";
    this.actionProgress = 0;

    // 按鍵狀態 (WASD + Shift 疾步)
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      shift: false
    };

    // 地面點擊標記圈
    this.createGroundTargetMarker();

    // 殿內其他安靜禮佛的 NPC 善信分身 (如同 Sansatemple 氛圍)
    this.npcs = [];

    // 連線多人同殿分身系統 (Multiplayer Peer Avatars Sync)
    this.myPeerId = "peer_" + Math.random().toString(36).substr(2, 7);
    this.peers = new Map();
    this.lastBroadcastTime = 0;
    this.lastBroadcastPos = new THREE.Vector3();
    this.channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("cyber_temple_channel") : null;
    this.initMultiplayerPeers();

    // 祥瑞隨身萌寵護法系統 (Spiritual Guardian Beasts)
    this.petType = localStorage.getItem("temple_active_pet") || "tiger";
    this.petGroup = new THREE.Group();
    this.petGroup.name = "playerPet";
    this.scene.add(this.petGroup);
    this.petLimbs = {};
    this.petPos = new THREE.Vector3(this.position.x + 0.4, 0.02, this.position.z + 0.9);
    this.petJumpTimer = 0;
    this.petSparks = [];
    this.buildPetMesh(this.petType);

    // 初始化角色外觀與事件
    this.buildAvatarMesh();
    this.spawnQuietCompanions();
    this.bindInputEvents();
  }

  // 構建 Q 版 3D 角色模型
  buildAvatarMesh() {
    // 清除舊物件
    while (this.playerGroup.children.length > 0) {
      this.playerGroup.remove(this.playerGroup.children[0]);
    }

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdfc4, roughness: 0.6 });
    const robeMat = new THREE.MeshStandardMaterial({ color: this.config.robeColor, roughness: 0.5 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x221111, roughness: 0.8 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.7 });

    // 1. 軀幹與道袍/袈裟 (圓潤梯形)
    const torsoGeo = new THREE.CylinderGeometry(0.22, 0.32, 0.55, 16);
    this.limbs.torso = new THREE.Mesh(torsoGeo, robeMat);
    this.limbs.torso.position.y = 0.52;
    this.limbs.torso.castShadow = true;
    this.playerGroup.add(this.limbs.torso);

    // 腰帶
    const beltGeo = new THREE.CylinderGeometry(0.26, 0.28, 0.08, 16);
    const belt = new THREE.Mesh(beltGeo, goldMat);
    belt.position.y = 0.52;
    this.playerGroup.add(belt);

    // 2. 圓滾滾頭部
    const headGeo = new THREE.SphereGeometry(0.24, 20, 20);
    this.limbs.head = new THREE.Mesh(headGeo, skinMat);
    this.limbs.head.position.y = 0.96;
    this.limbs.head.castShadow = true;
    this.playerGroup.add(this.limbs.head);

    // 臉部 Q 版眼睛與腮紅 (使用 Canvas 動態貼圖)
    const faceTex = this.createFaceTexture();
    const faceMat = new THREE.MeshBasicMaterial({ map: faceTex, transparent: true });
    const faceGeo = new THREE.PlaneGeometry(0.28, 0.28);
    const faceMesh = new THREE.Mesh(faceGeo, faceMat);
    faceMesh.position.set(0, 0.95, 0.22);
    this.playerGroup.add(faceMesh);

    // 3. 髮型 / 頭飾 (進香布條 / 髮髻 / 道士帽)
    this.buildHeadgear(goldMat);

    // 4. 左手臂 (以肩關節為中心可旋轉)
    this.limbs.armL = new THREE.Group();
    this.limbs.armL.position.set(-0.28, 0.72, 0);
    const armGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.38, 12);
    armGeo.translate(0, -0.16, 0); // 將軸心移至肩部
    const armLMesh = new THREE.Mesh(armGeo, robeMat);
    this.limbs.armL.add(armLMesh);
    const handL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), skinMat);
    handL.position.y = -0.36;
    this.limbs.armL.add(handL);
    this.playerGroup.add(this.limbs.armL);

    // 5. 右手臂
    this.limbs.armR = new THREE.Group();
    this.limbs.armR.position.set(0.28, 0.72, 0);
    const armRMesh = new THREE.Mesh(armGeo, robeMat);
    this.limbs.armR.add(armRMesh);
    const handR = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), skinMat);
    handR.position.y = -0.36;
    this.limbs.armR.add(handR);
    this.playerGroup.add(this.limbs.armR);

    // 6. 手持法器 / 線香
    this.buildHeldItem();

    // 7. 雙腿 (以髖部為軸心前後擺動)
    this.limbs.legL = new THREE.Group();
    this.limbs.legL.position.set(-0.12, 0.26, 0);
    const legGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.26, 12);
    legGeo.translate(0, -0.13, 0);
    const legLMesh = new THREE.Mesh(legGeo, darkMat);
    this.limbs.legL.add(legLMesh);
    this.playerGroup.add(this.limbs.legL);

    this.limbs.legR = new THREE.Group();
    this.limbs.legR.position.set(0.12, 0.26, 0);
    const legRMesh = new THREE.Mesh(legGeo, darkMat);
    this.limbs.legR.add(legRMesh);
    this.playerGroup.add(this.limbs.legR);

    // 8. 頭頂稱號浮空字牌 (如「悠閒的信眾」)
    this.updateTitleBadge();

    // 9. 護體靈光環 (若有佩戴開光平安符)
    this.buildAmuletAura(this.equippedAmulet);

    // 10. 紫薇八卦神鏡 (浮空自轉法器)
    this.buildBaguaMirror(this.config.hasBaguaMirror);

    // 11. 琉璃九品蓮花座 (靜坐時顯現)
    this.buildLotusThrone(this.config.hasLotusThrone && this.currentAction === "meditate");

    // 更新角色位置
    this.playerGroup.position.copy(this.position);
  }

  buildHeadgear(goldMat) {
    if (this.config.hatType === "bun") {
      // 髮髻 (丸子頭)
      const bunGeo = new THREE.SphereGeometry(0.1, 12, 12);
      const bunMat = new THREE.MeshStandardMaterial({ color: 0x1a0d0d });
      const bun = new THREE.Mesh(bunGeo, bunMat);
      bun.position.set(0, 1.22, -0.05);
      this.playerGroup.add(bun);
    } else if (this.config.hatType === "headband") {
      // 進香紅布條 (繡有金色文字)
      const bandGeo = new THREE.CylinderGeometry(0.245, 0.245, 0.06, 20);
      const bandMat = new THREE.MeshStandardMaterial({ color: 0xc42020 });
      const band = new THREE.Mesh(bandGeo, bandMat);
      band.position.set(0, 1.02, 0);
      this.playerGroup.add(band);
    } else if (this.config.hatType === "taoCap") {
      // 道士方帽
      const capGeo = new THREE.BoxGeometry(0.26, 0.16, 0.26);
      const capMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(0, 1.24, 0);
      this.playerGroup.add(cap);
    }
  }

  buildHeldItem() {
    if (this.config.holdingItem === "incense") {
      // 雙手捧持三炷點燃的清香
      const incenseHolder = new THREE.Group();
      incenseHolder.position.set(0, -0.34, 0.12);

      const stickMat = new THREE.MeshStandardMaterial({ color: 0x8b2500 });
      const emberMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });

      for (let i = -1; i <= 1; i++) {
        const s = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.32, 6), stickMat);
        s.position.set(i * 0.02, 0.16, 0);
        incenseHolder.add(s);
        const ember = new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 6), emberMat);
        ember.position.set(i * 0.02, 0.32, 0);
        incenseHolder.add(ember);
      }
      this.limbs.armR.add(incenseHolder);
      this.limbs.heldObject = incenseHolder;
    } else if (this.config.holdingItem === "beads") {
      // 108 顆念珠手環
      const beadsGeo = new THREE.TorusGeometry(0.08, 0.02, 8, 16);
      const beadsMat = new THREE.MeshStandardMaterial({ color: 0x733f1c });
      const beads = new THREE.Mesh(beadsGeo, beadsMat);
      beads.position.set(0, -0.34, 0.05);
      this.limbs.armL.add(beads);
    } else if (this.config.holdingItem === "sword") {
      // 七星太極寶劍
      const swordGroup = new THREE.Group();
      swordGroup.position.set(0, -0.28, 0.18);
      swordGroup.rotation.set(-0.35, 0.2, -0.1);

      // 劍柄
      const hiltGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.16, 8);
      const hiltMat = new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.7 });
      const hilt = new THREE.Mesh(hiltGeo, hiltMat);
      swordGroup.add(hilt);

      // 劍首與朱紅劍穗
      const pommelGeo = new THREE.SphereGeometry(0.024, 8, 8);
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.8 });
      const pommel = new THREE.Mesh(pommelGeo, goldMat);
      pommel.position.y = -0.09;
      swordGroup.add(pommel);

      const tasselGeo = new THREE.CylinderGeometry(0.006, 0.02, 0.14, 6);
      const redMat = new THREE.MeshStandardMaterial({ color: 0xcc2222 });
      const tassel = new THREE.Mesh(tasselGeo, redMat);
      tassel.position.y = -0.17;
      swordGroup.add(tassel);

      // 太極劍格 (護手)
      const guardGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.018, 12);
      const guard = new THREE.Mesh(guardGeo, goldMat);
      guard.position.y = 0.09;
      swordGroup.add(guard);

      // 劍身 (青光道家七星劍刃)
      const bladeGeo = new THREE.BoxGeometry(0.038, 0.62, 0.012);
      bladeGeo.translate(0, 0.31, 0);
      const bladeMat = new THREE.MeshStandardMaterial({
        color: 0x80deea,
        metalness: 0.85,
        roughness: 0.15,
        emissive: 0x00838f,
        emissiveIntensity: 0.25
      });
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.y = 0.1;
      swordGroup.add(blade);

      // 劍身鑲嵌北斗七星金光
      const starGeo = new THREE.SphereGeometry(0.007, 6, 6);
      const starMat = new THREE.MeshBasicMaterial({ color: 0xffeb3b });
      const starOffsets = [
        [0, 0.16, 0.008],
        [0.008, 0.23, 0.008],
        [0.005, 0.30, 0.008],
        [-0.005, 0.37, 0.008],
        [-0.009, 0.44, 0.008],
        [-0.002, 0.51, 0.008],
        [0.006, 0.58, 0.008]
      ];
      starOffsets.forEach(pos => {
        const star = new THREE.Mesh(starGeo, starMat);
        star.position.set(pos[0], pos[1], pos[2]);
        swordGroup.add(star);
      });

      this.limbs.armR.add(swordGroup);
      this.limbs.heldObject = swordGroup;
    } else if (this.config.holdingItem === "whisk") {
      // 太極乾坤拂塵
      const whiskGroup = new THREE.Group();
      whiskGroup.position.set(0, -0.26, 0.14);
      whiskGroup.rotation.set(-0.25, 0.15, 0);

      // 烏木握柄
      const handleGeo = new THREE.CylinderGeometry(0.014, 0.012, 0.32, 8);
      const handleMat = new THREE.MeshStandardMaterial({ color: 0x1f1712, roughness: 0.6 });
      const handle = new THREE.Mesh(handleGeo, handleMat);
      whiskGroup.add(handle);

      // 鎏金箍箍
      const ferruleGeo = new THREE.CylinderGeometry(0.022, 0.018, 0.04, 10);
      const ferruleMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.8 });
      const ferrule = new THREE.Mesh(ferruleGeo, ferruleMat);
      ferrule.position.y = 0.17;
      whiskGroup.add(ferrule);

      // 雪白拂絲 (錐形束)
      const hairGeo = new THREE.ConeGeometry(0.08, 0.45, 12);
      hairGeo.translate(0, 0.22, 0);
      const hairMat = new THREE.MeshStandardMaterial({
        color: 0xfafafa,
        roughness: 0.95
      });
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.set(0, 0.18, 0.04);
      hair.rotation.x = 0.18;
      whiskGroup.add(hair);

      // 朱紅繩結裝飾
      const knotGeo = new THREE.SphereGeometry(0.018, 8, 8);
      const knotMat = new THREE.MeshBasicMaterial({ color: 0xd32f2f });
      const knot = new THREE.Mesh(knotGeo, knotMat);
      knot.position.set(0, 0.14, 0.025);
      whiskGroup.add(knot);

      this.limbs.armR.add(whiskGroup);
      this.limbs.heldObject = whiskGroup;
    } else if (this.config.holdingItem === "calabash") {
      // 如意紫金葫蘆
      const gourdGroup = new THREE.Group();
      gourdGroup.position.set(0, -0.28, 0.12);
      gourdGroup.rotation.set(0.1, 0, 0.2);

      const gourdMat = new THREE.MeshStandardMaterial({
        color: 0x6a1b9a,
        metalness: 0.65,
        roughness: 0.25
      });

      // 下肚 (較大)
      const bottomSphere = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 16), gourdMat);
      bottomSphere.position.y = 0.075;
      gourdGroup.add(bottomSphere);

      // 金箍腰帶
      const waistMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.8 });
      const waist = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.008, 8, 16), waistMat);
      waist.position.y = 0.15;
      waist.rotation.x = Math.PI / 2;
      gourdGroup.add(waist);

      // 紅絲帶結
      const ribbonMat = new THREE.MeshBasicMaterial({ color: 0xd32f2f });
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), ribbonMat);
      knot.position.set(0, 0.15, 0.05);
      gourdGroup.add(knot);

      // 上肚 (較小)
      const topSphere = new THREE.Mesh(new THREE.SphereGeometry(0.052, 14, 14), gourdMat);
      topSphere.position.y = 0.21;
      gourdGroup.add(topSphere);

      // 葫蘆塞 (金口)
      const stopper = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.04, 10), waistMat);
      stopper.position.y = 0.27;
      gourdGroup.add(stopper);

      this.limbs.armR.add(gourdGroup);
      this.limbs.heldObject = gourdGroup;
    }
  }

  // 繪製臉部動態表情 Canvas
  createFaceTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, 128, 128);

    // 圓滾滾大眼睛
    ctx.fillStyle = "#2b1408";
    ctx.beginPath();
    ctx.arc(42, 60, 7, 0, Math.PI * 2);
    ctx.arc(86, 60, 7, 0, Math.PI * 2);
    ctx.fill();

    // 眼神高光
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(40, 58, 2.5, 0, Math.PI * 2);
    ctx.arc(84, 58, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 腮紅
    ctx.fillStyle = "rgba(255, 120, 120, 0.45)";
    ctx.beginPath();
    ctx.arc(32, 74, 9, 0, Math.PI * 2);
    ctx.arc(96, 74, 9, 0, Math.PI * 2);
    ctx.fill();

    // 溫和微笑
    ctx.strokeStyle = "#441d0c";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(64, 76, 10, 0.2, Math.PI - 0.2);
    ctx.stroke();

    return new THREE.CanvasTexture(canvas);
  }

  // 頭頂稱號牌
  updateTitleBadge() {
    if (this.limbs.titleSprite) {
      this.playerGroup.remove(this.limbs.titleSprite);
    }

    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");

    // 底框
    ctx.fillStyle = "rgba(42, 10, 10, 0.85)";
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 3;
    ctx.roundRect(10, 10, 236, 44, 20);
    ctx.fill();
    ctx.stroke();

    // 稱號文字
    ctx.fillStyle = "#ffe885";
    ctx.font = "bold 22px 'Noto Serif TC', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`🏮 ${this.config.title}`, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    this.limbs.titleSprite = new THREE.Sprite(spriteMat);
    this.limbs.titleSprite.position.set(0, 1.48, 0);
    this.limbs.titleSprite.scale.set(0.9, 0.25, 1);
    this.playerGroup.add(this.limbs.titleSprite);
  }

  // 地面點擊移動光圈
  createGroundTargetMarker() {
    const geo = new THREE.RingGeometry(0.18, 0.24, 24);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffe885, side: THREE.DoubleSide, transparent: true, opacity: 0 });
    this.targetMarker = new THREE.Mesh(geo, mat);
    this.targetMarker.rotation.x = -Math.PI / 2;
    this.targetMarker.position.y = 0.015;
    this.scene.add(this.targetMarker);
  }

  // 疾步奔跑切換
  toggleSprint() {
    this.isSprinting = !this.isSprinting;
    return this.isSprinting;
  }

  // 鍵盤與滑鼠事件綁定
  bindInputEvents() {
    window.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.code === "KeyW" || e.code === "ArrowUp") this.keys.forward = true;
      if (e.code === "KeyS" || e.code === "ArrowDown") this.keys.backward = true;
      if (e.code === "KeyA" || e.code === "ArrowLeft") this.keys.left = true;
      if (e.code === "KeyD" || e.code === "ArrowRight") this.keys.right = true;
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") this.keys.shift = true;

      // 視角重置快捷鍵
      if (e.code === "KeyC") {
        if (window.temple3d) window.temple3d.resetCameraBehindAvatar(true);
      }

      // 互動快捷鍵
      if (e.code === "KeyE") {
        if (window.temple3d) window.temple3d.triggerNearbyInteraction();
      }

      // 動作快捷鍵
      // 玩家親自行禮才算每日功課；科儀附帶的鞠躬動畫不算
      if (e.code === "KeyB") { this.triggerAction("bow"); window.emitRitual?.("bow"); }      // 鞠躬禮
      if (e.code === "KeyK") { this.triggerAction("kneel"); window.emitRitual?.("bow"); }    // 跪拜
      if (e.code === "KeyP") { this.triggerAction("pray"); window.emitRitual?.("bow"); }     // 合掌
      if (e.code === "KeyM") this.triggerAction("meditate"); // 打坐
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === "KeyW" || e.code === "ArrowUp") this.keys.forward = false;
      if (e.code === "KeyS" || e.code === "ArrowDown") this.keys.backward = false;
      if (e.code === "KeyA" || e.code === "ArrowLeft") this.keys.left = false;
      if (e.code === "KeyD" || e.code === "ArrowRight") this.keys.right = false;
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") this.keys.shift = false;
    });

    // 滑鼠右鍵或點擊地面移動 (Click to Move: Shift+點擊 或 Alt+點擊)
    this.sceneRaycaster = new THREE.Raycaster();
    this.mouseVec = new THREE.Vector2();

    const canvas = this.scene.renderer ? this.scene.renderer.domElement : window;
    window.addEventListener("pointerdown", (e) => {
      if (e.button === 0 && (e.shiftKey || e.altKey)) { // Shift+點擊 或 Alt+點擊 地面尋路
        this.handleClickToMove(e);
      }
    });
  }

  handleClickToMove(e) {
    this.mouseVec.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouseVec.y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.sceneRaycaster.setFromCamera(this.mouseVec, this.camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const target = new THREE.Vector3();
    if (this.sceneRaycaster.ray.intersectPlane(plane, target)) {
      // 限制在大殿與宏偉三進廟埕範圍內 (Z: -2.8 ~ 41.5, X: ±17.5)
      const maxSide = target.z > 5.8 ? 17.5 : 3.8;
      target.x = Math.max(-maxSide, Math.min(maxSide, target.x));
      target.z = Math.max(-2.8, Math.min(41.5, target.z));
      target.y = 0;

      this.targetPos = target;
      this.targetMarker.position.set(target.x, 0.02, target.z);
      this.targetMarker.material.opacity = 0.85;
    }
  }

  // 觸發儀式動作
  triggerAction(actionName) {
    this.currentAction = actionName;
    this.actionProgress = 0;
    this.isMoving = false;
    this.targetPos = null;

    if (actionName === "bow") {
      window.templeAudio.playBell(520);
    } else if (actionName === "pray") {
      window.templeAudio.playBell(440);
    } else if (actionName === "kneel") {
      window.templeAudio.playBell(380);
    } else if (actionName === "meditate") {
      window.templeAudio.playBell(432);
      if (this.config.hasLotusThrone) {
        this.buildLotusThrone(true);
      }
    }

    if (actionName !== "meditate" && this.limbs.lotusThrone) {
      this.buildLotusThrone(false);
    }

    // 立即同步動作至同殿信眾
    this.broadcastMyState(true);
  }

  // 角色換裝與自訂套用
  customize({ roleType, robeColor, hatType, title, holdingItem }) {
    if (roleType) this.config.roleType = roleType;
    if (robeColor) this.config.robeColor = robeColor;
    if (hatType) this.config.hatType = hatType;
    if (title) this.config.title = title;
    if (holdingItem) this.config.holdingItem = holdingItem;

    this.buildAvatarMesh();
    this.broadcastMyState(true);
  }

  // 每一影格更新移動與肢體動畫
  update(dt) {
    const time = performance.now() * 0.001;

    // 1. 移動處理 (WASD 或 點擊尋路)
    let moveDir = new THREE.Vector3();

    if (this.keys.forward) moveDir.z -= 1;
    if (this.keys.backward) moveDir.z += 1;
    if (this.keys.left) moveDir.x -= 1;
    if (this.keys.right) moveDir.x += 1;

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      this.targetPos = null; // 鍵盤覆蓋點擊移動
      this.targetMarker.material.opacity = 0;
    } else if (this.targetPos) {
      const diff = new THREE.Vector3().subVectors(this.targetPos, this.position);
      diff.y = 0;
      if (diff.length() > 0.12) {
        moveDir.copy(diff.normalize());
      } else {
        this.targetPos = null;
        this.targetMarker.material.opacity = 0;
      }
    }

    if (moveDir.lengthSq() > 0) {
      this.isMoving = true;
      this.currentAction = "walk";
      if (this.limbs.lotusThrone) {
        this.buildLotusThrone(false);
      }

      // 疾步奔跑或普通行走步長
      const isSprint = (this.isSprinting || this.keys.shift);
      const curSpeed = isSprint ? this.sprintSpeed : this.baseSpeed;
      const step = moveDir.clone().multiplyScalar(curSpeed * dt);

      // 限制大殿與宏偉三進廟埕活動範圍
      // 大殿內 (Z <= 5.8): 寬度限制 X: ±3.8, 深度 Z: -2.8 ~ 5.8
      // 戶外宏偉廟埕 (Z > 5.8): 寬度大幅擴展至 X: ±17.5, 深度貫通至山門階梯 Z: 41.5
      const clampTo = (x, z) => {
        const maxSide = z > 5.8 ? 17.5 : 3.8;
        return [Math.max(-maxSide, Math.min(maxSide, x)), Math.max(-2.8, Math.min(41.5, z))];
      };
      // 碰撞：先試整步；撞到就沿牆滑（只走 X 或只走 Z）；都走不了就停下。已經卡在障礙裡時允許走出來
      const blocked = this.isBlockedAt || (() => false);
      const free = (x, z) => !blocked(x, z);
      const stuck = blocked(this.position.x, this.position.z);
      const tries = [
        clampTo(this.position.x + step.x, this.position.z + step.z),
        clampTo(this.position.x + step.x, this.position.z),
        clampTo(this.position.x, this.position.z + step.z)
      ];
      // 備選必須真的有移動（正面撞牆時「只走 X」的位移是 0，原地不動不算找到路）
      const moves = ([x, z]) => Math.abs(x - this.position.x) + Math.abs(z - this.position.z) > 1e-6;
      const next = stuck ? tries[0] : tries.find(c => moves(c) && free(c[0], c[1]));
      if (next) {
        this.position.x = next[0];
        this.position.z = next[1];
      } else if (this.targetPos) {
        // 點地面走路被擋住：停下來，不在原地一直踏步
        this.targetPos = null;
        this.targetMarker.material.opacity = 0;
      }

      // 角色平滑轉向行進方向
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      this.playerGroup.rotation.y = THREE.MathUtils.lerp(this.playerGroup.rotation.y, targetAngle, 0.18);
    } else {
      this.isMoving = false;
      if (this.currentAction === "walk") {
        this.currentAction = "idle";
      }
    }

    // 走上橋面等高台時平順抬高
    const groundY = this.walkHeightAt ? this.walkHeightAt(this.position.x, this.position.z) : 0;
    this.position.y += (groundY - this.position.y) * Math.min(1, dt * 12);
    this.playerGroup.position.copy(this.position);

    // 更新步步生蓮踏蓮印記
    if (this.lotusDecals && this.lotusDecals.length > 0) {
      for (let i = this.lotusDecals.length - 1; i >= 0; i--) {
        const item = this.lotusDecals[i];
        item.life -= dt * 0.7;
        item.mat.opacity = Math.max(0, item.life * 0.9);
        item.mesh.scale.multiplyScalar(1 + dt * 0.15);
        if (item.life <= 0) {
          this.scene.remove(item.mesh);
          item.mat.dispose();
          this.lotusDecals.splice(i, 1);
        }
      }
    }

    // 同步本機角色狀態給其他連線分身 (平滑心跳與位移廣播)
    this.broadcastMyState();

    // 2. 祥瑞隨身萌寵跟隨與動畫更新
    this.updatePet(time, dt);

    // 3. 肢體動作動畫狀態機驅動
    this.animateLimbs(time, dt);

    // 3. 更新同殿連線信眾分身 (Peer Avatars)
    this.updatePeers(time, dt);

    // 4. NPC 安靜呼吸與禮佛微動
    this.npcs.forEach(npc => {
      if (npc.action === "meditate") {
        npc.group.position.y = Math.sin(time * 1.5 + npc.offset) * 0.015;
      } else if (npc.action === "bow") {
        npc.group.rotation.x = Math.sin(time * 1.2 + npc.offset) * 0.12;
      }
    });

    // 5. 光圈微弱脈衝
    if (this.targetMarker.material.opacity > 0) {
      this.targetMarker.scale.setScalar(1 + Math.sin(time * 8) * 0.08);
    }
  }

  // 肢體關節運動調製
  animateLimbs(time, dt) {
    if (!this.limbs.armL || !this.limbs.legL) return;

    if (this.currentAction === "walk") {
      // 疾步加速步伐頻率與擺幅
      const isSprint = (this.isSprinting || this.keys.shift);
      const walkFreq = isSprint ? 13.5 : 8.0;
      const walkCycle = time * walkFreq;
      const legSwing = isSprint ? 0.72 : 0.55;
      const armSwing = isSprint ? 0.62 : 0.45;

      this.limbs.legL.rotation.x = Math.sin(walkCycle) * legSwing;
      this.limbs.legR.rotation.x = -Math.sin(walkCycle) * legSwing;

      this.limbs.armL.rotation.x = -Math.sin(walkCycle) * armSwing;
      this.limbs.armR.rotation.x = Math.sin(walkCycle) * armSwing;

      // 上下顛簸 (Bobbing)
      this.playerGroup.position.y = Math.abs(Math.sin(walkCycle)) * (isSprint ? 0.07 : 0.04);
      this.limbs.torso.rotation.x = isSprint ? 0.16 : 0.08;

      // 步步生蓮：行走時綻放蓮華
      if (this.config.hasLotusSteps) {
        const now = performance.now();
        if (now - this.lastStepDecalTime > 320) {
          this.lastStepDecalTime = now;
          this.spawnLotusStepDecal();
        }
      }
    } else if (this.currentAction === "idle") {
      // 靜止站立：自然呼吸
      const breathe = Math.sin(time * 2.2) * 0.015;
      this.playerGroup.position.y = breathe;

      this.limbs.legL.rotation.x = 0;
      this.limbs.legR.rotation.x = 0;

      // 手持清香向上恭敬捧持
      if (this.config.holdingItem === "incense") {
        this.limbs.armL.rotation.set(-0.85, 0.4, 0);
        this.limbs.armR.rotation.set(-0.85, -0.4, 0);
      } else {
        this.limbs.armL.rotation.set(0, 0, Math.sin(time * 2) * 0.03);
        this.limbs.armR.rotation.set(0, 0, -Math.sin(time * 2) * 0.03);
      }
      this.limbs.torso.rotation.x = 0;
    } else if (this.currentAction === "bow") {
      // 躬身三鞠躬禮
      this.actionProgress += dt * 2.5;
      const bowAngle = Math.sin(this.actionProgress * Math.PI) * 0.55;
      this.limbs.torso.rotation.x = bowAngle;
      this.limbs.head.rotation.x = bowAngle * 0.5;

      if (this.actionProgress >= 1) {
        this.currentAction = "idle";
      }
    } else if (this.currentAction === "kneel") {
      // 跪拜 (雙膝著地，俯首拜拜)
      this.actionProgress += dt * 1.8;
      const kneelPhase = Math.sin(this.actionProgress * Math.PI);
      this.playerGroup.position.y = -kneelPhase * 0.35;
      this.limbs.torso.rotation.x = kneelPhase * 0.8;
      this.limbs.head.rotation.x = kneelPhase * 0.5;

      if (this.actionProgress >= 1) {
        this.currentAction = "idle";
      }
    } else if (this.currentAction === "pray") {
      // 雙手合十胸前
      this.limbs.armL.rotation.set(-1.1, 0.7, 0);
      this.limbs.armR.rotation.set(-1.1, -0.7, 0);
      this.limbs.torso.rotation.x = 0.12;
      this.actionProgress += dt;
      if (this.actionProgress > 2.5) {
        this.currentAction = "idle";
      }
    } else if (this.currentAction === "meditate") {
      // 盤腿打坐靜修
      if (this.config.hasLotusThrone) {
        if (!this.limbs.lotusThrone) this.buildLotusThrone(true);
        this.playerGroup.position.y = 0.18 + Math.sin(time * 2.0) * 0.03;
        if (this.limbs.lotusThrone) {
          this.limbs.lotusThrone.rotation.y += dt * 0.8;
        }
      } else {
        this.playerGroup.position.y = -0.32;
      }
      this.limbs.armL.rotation.set(-0.5, 0.5, 0);
      this.limbs.armR.rotation.set(-0.5, -0.5, 0);
      this.limbs.torso.rotation.x = 0;
    }

    // 護體靈光環緩慢自轉與浮動
    if (this.limbs.amuletAura) {
      this.limbs.amuletAura.rotation.y += dt * 2.2;
      this.limbs.amuletAura.position.y = 0.52 + Math.sin(time * 3.2) * 0.04;
    }

    // 紫薇八卦神鏡自轉與緩升浮動
    if (this.limbs.baguaMirror) {
      this.limbs.baguaMirror.rotation.z += dt * 1.5;
      this.limbs.baguaMirror.position.y = 1.15 + Math.sin(time * 3.0) * 0.04;
    }
  }
}

window.TempleAvatarSystem = TempleAvatarSystem;


// 把 mixin 類別的方法掛到 TempleAvatarSystem；同名方法視為錯誤，避免兩個檔案互相覆蓋
function installAvatarMixin(mixin) {
  for (const key of Object.getOwnPropertyNames(mixin.prototype)) {
    if (key === "constructor") continue;
    if (Object.prototype.hasOwnProperty.call(TempleAvatarSystem.prototype, key)) {
      throw new Error(`TempleAvatarSystem 方法重複定義：${key}`);
    }
    Object.defineProperty(TempleAvatarSystem.prototype, key, Object.getOwnPropertyDescriptor(mixin.prototype, key));
  }
}
