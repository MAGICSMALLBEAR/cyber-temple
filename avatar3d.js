// avatar3d.js - 3D 角色系統、外觀捏人自訂與動作/移動控制器
// 參考熱門虛擬寺廟 (如 Sansatemple 等) 打造的 Q 版互動分身

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

  // 構建開光平安符護身靈光環
  buildAmuletAura(amuletType) {
    if (this.limbs.amuletAura) {
      this.playerGroup.remove(this.limbs.amuletAura);
      this.limbs.amuletAura = null;
    }
    if (!amuletType) return;

    const auraGroup = new THREE.Group();
    auraGroup.position.set(0, 0.52, 0);

    const ringGeo = new THREE.TorusGeometry(0.48, 0.02, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.85 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    auraGroup.add(ring);

    // 8 顆金色靈動旋轉微粒
    const dotCount = 8;
    for (let i = 0; i < dotCount; i++) {
      const angle = (i / dotCount) * Math.PI * 2;
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffd700 })
      );
      dot.position.set(Math.cos(angle) * 0.48, 0, Math.sin(angle) * 0.48);
      auraGroup.add(dot);
    }

    this.playerGroup.add(auraGroup);
    this.limbs.amuletAura = auraGroup;
  }

  equipAmulet(amuletType) {
    this.equippedAmulet = amuletType;
    if (amuletType) {
      localStorage.setItem("temple_equipped_amulet", amuletType);
    } else {
      localStorage.removeItem("temple_equipped_amulet");
    }
    this.buildAmuletAura(amuletType);
  }

  // 構建浮空旋轉紫薇八卦神鏡
  buildBaguaMirror(enabled) {
    if (this.limbs.baguaMirror) {
      this.playerGroup.remove(this.limbs.baguaMirror);
      this.limbs.baguaMirror = null;
    }
    if (!enabled) return;

    const mirrorGroup = new THREE.Group();
    mirrorGroup.position.set(0.42, 1.15, -0.15);

    // 八角紅木/青銅外框
    const frameGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.025, 8);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x8b3a1a, roughness: 0.6, metalness: 0.3 });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.rotation.x = Math.PI / 2;
    mirrorGroup.add(frameMesh);

    // 鏡心銀光青銅凹面
    const mirrorGeo = new THREE.CircleGeometry(0.12, 24);
    const mirrorMat = new THREE.MeshStandardMaterial({
      color: 0xe0f7fa,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x26c6da,
      emissiveIntensity: 0.35
    });
    const mirrorDisc = new THREE.Mesh(mirrorGeo, mirrorMat);
    mirrorDisc.position.z = 0.015;
    mirrorGroup.add(mirrorDisc);

    // 太極陰陽金色靈珠
    const beadGeo = new THREE.SphereGeometry(0.03, 12, 12);
    const beadMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8 });
    const bead = new THREE.Mesh(beadGeo, beadMat);
    bead.position.z = 0.025;
    mirrorGroup.add(bead);

    // 外圈金色靈光環
    const haloGeo = new THREE.TorusGeometry(0.21, 0.008, 6, 24);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.8 });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    mirrorGroup.add(halo);

    this.playerGroup.add(mirrorGroup);
    this.limbs.baguaMirror = mirrorGroup;
  }

  // 構建琉璃九品蓮花座
  buildLotusThrone(show) {
    if (this.limbs.lotusThrone) {
      this.playerGroup.remove(this.limbs.lotusThrone);
      this.limbs.lotusThrone = null;
    }
    if (!show) return;

    const throneGroup = new THREE.Group();
    throneGroup.position.set(0, -0.05, 0);

    // 八角鎏金台座底盤
    const baseGeo = new THREE.CylinderGeometry(0.46, 0.52, 0.08, 8);
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.75, roughness: 0.3 });
    const base = new THREE.Mesh(baseGeo, goldMat);
    base.position.y = 0.04;
    throneGroup.add(base);

    // 核心金色蓮蓬台
    const podGeo = new THREE.CylinderGeometry(0.32, 0.30, 0.06, 16);
    const podMat = new THREE.MeshStandardMaterial({ color: 0xffd54f, emissive: 0xffa000, emissiveIntensity: 0.3 });
    const pod = new THREE.Mesh(podGeo, podMat);
    pod.position.y = 0.09;
    throneGroup.add(pod);

    // 12 瓣盛開粉紅琉璃蓮花花瓣
    const petalMat = new THREE.MeshStandardMaterial({
      color: 0xff80ab,
      roughness: 0.4,
      metalness: 0.15
    });
    const petalCount = 12;
    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2;
      const petalGeo = new THREE.ConeGeometry(0.09, 0.24, 4);
      petalGeo.scale(1.2, 1, 0.35);
      const petal = new THREE.Mesh(petalGeo, petalMat);
      petal.position.set(Math.cos(angle) * 0.38, 0.12, Math.sin(angle) * 0.38);
      petal.rotation.y = -angle + Math.PI / 2;
      petal.rotation.z = -0.35;
      throneGroup.add(petal);
    }

    // 座底柔和發光符陣光圈
    const glowGeo = new THREE.RingGeometry(0.2, 0.65, 24);
    glowGeo.rotateX(-Math.PI / 2);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffb74d,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.y = 0.01;
    throneGroup.add(glow);

    this.playerGroup.add(throneGroup);
    this.limbs.lotusThrone = throneGroup;
  }

  // 步步生蓮踏蓮印記生成
  spawnLotusStepDecal() {
    if (!this.lotusDecalGeo) {
      this.lotusDecalGeo = new THREE.CircleGeometry(0.24, 16);
      this.lotusDecalGeo.rotateX(-Math.PI / 2);
    }
    if (!this.lotusDecalTex) {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      ctx.translate(32, 32);
      ctx.fillStyle = "rgba(255, 105, 180, 0.85)";
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.ellipse(0, 16, 7, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.rotate((Math.PI * 2) / 8);
      }
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fillStyle = "#ffd700";
      ctx.fill();
      this.lotusDecalTex = new THREE.CanvasTexture(canvas);
    }

    const mat = new THREE.MeshBasicMaterial({
      map: this.lotusDecalTex,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(this.lotusDecalGeo, mat);
    mesh.position.set(this.position.x, 0.02, this.position.z);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(mesh);
    this.lotusDecals.push({ mesh, mat, life: 1.0 });
  }

  // 法器結緣裝備開關
  equipRelic(relicType, isEquipped) {
    this.relics[relicType] = isEquipped;

    if (relicType === "sword") {
      if (isEquipped) {
        this.relics["whisk"] = false;
        this.relics["calabash"] = false;
        this.config.holdingItem = "sword";
      } else {
        this.config.holdingItem = "incense";
      }
      this.buildAvatarMesh();
    } else if (relicType === "whisk") {
      if (isEquipped) {
        this.relics["sword"] = false;
        this.relics["calabash"] = false;
        this.config.holdingItem = "whisk";
      } else {
        this.config.holdingItem = "incense";
      }
      this.buildAvatarMesh();
    } else if (relicType === "calabash") {
      if (isEquipped) {
        this.relics["sword"] = false;
        this.relics["whisk"] = false;
        this.config.holdingItem = "calabash";
      } else {
        this.config.holdingItem = "incense";
      }
      this.buildAvatarMesh();
    } else if (relicType === "baguaMirror") {
      this.config.hasBaguaMirror = isEquipped;
      this.buildBaguaMirror(isEquipped);
    } else if (relicType === "lotusSteps") {
      this.config.hasLotusSteps = isEquipped;
    } else if (relicType === "lotusThrone") {
      this.config.hasLotusThrone = isEquipped;
      if (this.currentAction === "meditate") {
        this.buildLotusThrone(isEquipped);
      }
    }

    localStorage.setItem("temple_equipped_relics", JSON.stringify(this.relics));
    this.broadcastMyState(true);
  }

  // 構建祥瑞萌寵護法神獸 3D 模型
  buildPetMesh(type) {
    this.petType = type || "none";
    this.petLimbs = {};

    // 清空舊寵物物件
    while (this.petGroup && this.petGroup.children.length > 0) {
      const child = this.petGroup.children[0];
      this.petGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    }

    if (!this.petGroup || this.petType === "none") {
      if (this.petGroup) this.petGroup.visible = false;
      return;
    }
    this.petGroup.visible = true;

    if (this.petType === "tiger") {
      // 🐯 金虎爺大將軍：萌系金虎身形、額頭金印「王」、小翅膀、口銜金元寶、搖晃尾巴
      const goldFurMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 });
      const bellyMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.6 });
      const stripeMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 });
      const goldShinyMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2 });
      const pinkMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.5 });
      const blackMat = new THREE.MeshBasicMaterial({ color: 0x18181b });

      // 1. 圓滾滾身軀
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 14), goldFurMat);
      body.scale.set(1.0, 0.85, 1.25);
      body.position.set(0, 0.24, 0);
      this.petGroup.add(body);

      // 白拋拋肚肚
      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), bellyMat);
      belly.scale.set(0.85, 0.7, 1.1);
      belly.position.set(0, 0.18, 0.05);
      this.petGroup.add(belly);

      // 虎紋條紋 (左右兩側暗紋)
      [-0.18, 0.18].forEach(sx => {
        [-0.05, 0.08].forEach(sz => {
          const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.02), stripeMat);
          stripe.position.set(sx, 0.26, sz);
          stripe.rotation.y = sx > 0 ? 0.3 : -0.3;
          this.petGroup.add(stripe);
        });
      });

      // 2. 圓滾滾大頭部
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 14), goldFurMat);
      head.position.set(0, 0.36, 0.2);
      this.petGroup.add(head);

      // 額頭金印「王」字
      const wangPlat = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.02), goldShinyMat);
      wangPlat.position.set(0, 0.46, 0.35);
      this.petGroup.add(wangPlat);

      // 圓滾滾虎耳朵 (外金內粉)
      [-0.11, 0.11].forEach(ex => {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), goldFurMat);
        ear.position.set(ex, 0.48, 0.16);
        this.petGroup.add(ear);

        const innerEar = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), pinkMat);
        innerEar.position.set(ex, 0.48, 0.19);
        this.petGroup.add(innerEar);
      });

      // 黑眼睛與黑鼻尖
      [-0.065, 0.065].forEach(ox => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), blackMat);
        eye.position.set(ox, 0.38, 0.36);
        this.petGroup.add(eye);
      });
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), blackMat);
      nose.position.set(0, 0.33, 0.38);
      this.petGroup.add(nose);

      // 口銜萬兩金元寶
      const yuanbaoGroup = new THREE.Group();
      const ybBase = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.065, 0.04, 10), goldShinyMat);
      const ybTop = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), goldShinyMat);
      ybTop.scale.set(1.4, 0.6, 0.8);
      ybTop.position.set(0, 0.025, 0);
      yuanbaoGroup.add(ybBase);
      yuanbaoGroup.add(ybTop);
      yuanbaoGroup.position.set(0, 0.28, 0.38);
      this.petGroup.add(yuanbaoGroup);

      // 祥雲小羽翼 (背後左右各一片白金翅膀)
      [-0.14, 0.14].forEach(wx => {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.02), bellyMat);
        wing.position.set(wx, 0.38, -0.08);
        wing.rotation.z = wx > 0 ? -0.35 : 0.35;
        this.petGroup.add(wing);
      });

      // 4 隻短短萌爪
      [[-0.11, 0.1], [0.11, 0.1], [-0.11, -0.15], [0.11, -0.15]].forEach(([px, pz]) => {
        const paw = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.12, 8), goldFurMat);
        paw.position.set(px, 0.06, pz);
        this.petGroup.add(paw);
      });

      // 翹翹搖擺虎尾巴
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.22, 8), goldFurMat);
      tail.position.set(0, 0.3, -0.26);
      tail.rotation.x = -0.7;
      this.petGroup.add(tail);
      this.petLimbs.tail = tail;

    } else if (this.petType === "turtle") {
      // 🐢 九品金靈龜：翠玉金背甲、太極八卦雕紋、生機碧綠靈環
      const jadeMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3, metalness: 0.2 });
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.7, roughness: 0.3 });
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xa7f3d0, roughness: 0.6 });
      const blackMat = new THREE.MeshBasicMaterial({ color: 0x111827 });

      // 1. 拱形玉甲
      const shell = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), jadeMat);
      shell.scale.set(1.0, 0.55, 1.2);
      shell.position.set(0, 0.18, 0);
      this.petGroup.add(shell);

      // 金色甲邊緣
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.03, 8, 20), goldMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(0, 0.12, 0);
      this.petGroup.add(rim);

      // 背上太極八卦浮印金環
      const baguaRing = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.11, 8), goldMat);
      baguaRing.rotation.x = -Math.PI / 2;
      baguaRing.position.set(0, 0.315, 0);
      this.petGroup.add(baguaRing);

      // 2. 探出的小龜頭
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), skinMat);
      head.position.set(0, 0.16, 0.3);
      this.petGroup.add(head);

      // 眼睛
      [-0.045, 0.045].forEach(ex => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), blackMat);
        eye.position.set(ex, 0.18, 0.36);
        this.petGroup.add(eye);
      });

      // 4 個扁扁划動槳足
      [[-0.18, 0.14], [0.18, 0.14], [-0.18, -0.14], [0.18, -0.14]].forEach(([fx, fz]) => {
        const flipper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.08), skinMat);
        flipper.position.set(fx, 0.08, fz);
        flipper.rotation.y = fx > 0 ? 0.4 : -0.4;
        this.petGroup.add(flipper);
      });

      // 短尾巴
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 8), skinMat);
      tail.rotation.x = -Math.PI / 2;
      tail.position.set(0, 0.12, -0.3);
      this.petGroup.add(tail);

      // 懸浮聚氣綠光環
      const aura = new THREE.Mesh(
        new THREE.TorusGeometry(0.3, 0.015, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.7 })
      );
      aura.rotation.x = Math.PI / 2;
      aura.position.set(0, 0.34, 0);
      this.petGroup.add(aura);
      this.petLimbs.aura = aura;

    } else if (this.petType === "rabbit") {
      // 🐰 廣寒玉兔：通體雪白泛光、長長耳廓、小搗藥杵臼、紅寶石眼睛
      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
      const innerEarMat = new THREE.MeshStandardMaterial({ color: 0xfda4af, roughness: 0.5 });
      const redEyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.7 });

      // 1. 胖胖雪白兔身
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 14), whiteMat);
      body.scale.set(0.95, 1.15, 1.1);
      body.position.set(0, 0.22, 0);
      this.petGroup.add(body);

      // 圓滾滾頭部
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), whiteMat);
      head.position.set(0, 0.38, 0.14);
      this.petGroup.add(head);

      // 長長的兔耳朵 (豎立微晃)
      [-0.07, 0.07].forEach(ex => {
        const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.045, 0.25, 8), whiteMat);
        ear.position.set(ex, 0.58, 0.1);
        ear.rotation.z = ex > 0 ? -0.15 : 0.15;
        this.petGroup.add(ear);

        const innerEar = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.01), innerEarMat);
        innerEar.position.set(ex, 0.58, 0.125);
        this.petGroup.add(innerEar);
      });

      // 紅寶石眼睛與粉鼻
      [-0.06, 0.06].forEach(ox => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), redEyeMat);
        eye.position.set(ox, 0.4, 0.27);
        this.petGroup.add(eye);
      });
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 6), innerEarMat);
      nose.position.set(0, 0.35, 0.29);
      this.petGroup.add(nose);

      // 雙手捧著小長生藥臼與搗藥杵
      const mortar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.035, 0.08, 10), woodMat);
      mortar.position.set(0, 0.18, 0.26);
      this.petGroup.add(mortar);

      const pestle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.11, 8), woodMat);
      pestle.position.set(0.02, 0.22, 0.26);
      pestle.rotation.z = 0.3;
      this.petGroup.add(pestle);

      // 4 隻兔爪
      [[-0.08, 0.1], [0.08, 0.1], [-0.09, -0.08], [0.09, -0.08]].forEach(([px, pz]) => {
        const foot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), whiteMat);
        foot.position.set(px, 0.05, pz);
        this.petGroup.add(foot);
      });

      // 圓滾滾毛球尾巴
      const tail = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), whiteMat);
      tail.position.set(0, 0.18, -0.22);
      this.petGroup.add(tail);
    }
  }

  // 切換萌寵護法
  setPetType(type) {
    this.petType = type;
    localStorage.setItem("temple_active_pet", type);
    this.buildPetMesh(type);
  }

  // 撫摸萌寵互動 (Petting Interaction)
  interactWithPet() {
    if (this.petType === "none") return null;
    this.petJumpTimer = 1.0;
    this.spawnPetSparks();
    if (window.templeAudio) {
      window.templeAudio.playPetPurr(this.petType);
    }
    const petNames = {
      tiger: "🐯 金虎爺大將軍",
      turtle: "🐢 九品金靈龜",
      rabbit: "🐰 廣寒玉兔"
    };
    return {
      type: this.petType,
      name: petNames[this.petType] || "祥瑞萌寵",
      merits: 36
    };
  }

  // 萌寵歡欣金幣愛心微粒
  spawnPetSparks() {
    for (let i = 0; i < 7; i++) {
      const sparkMat = new THREE.MeshBasicMaterial({
        color: this.petType === "tiger" ? 0xffd700 : (this.petType === "turtle" ? 0x34d399 : 0xf472b6),
        transparent: true,
        opacity: 0.95
      });
      const spark = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), sparkMat);
      spark.position.copy(this.petGroup.position).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.35,
        0.2 + Math.random() * 0.3,
        (Math.random() - 0.5) * 0.35
      ));
      this.scene.add(spark);
      this.petSparks.push({
        mesh: spark,
        vy: 0.02 + Math.random() * 0.025,
        vx: (Math.random() - 0.5) * 0.015,
        vz: (Math.random() - 0.5) * 0.015,
        life: 1.0
      });
    }
  }

  // 萌寵每影格跟隨與動作更新
  updatePet(time, dt) {
    if (this.petType === "none" || !this.petGroup || !this.petGroup.visible) return;

    // 計算分身背後的目標站位 (身後約 1.1m，略偏右側 0.42m)
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerGroup.rotation.y);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerGroup.rotation.y);
    const targetPetPos = this.position.clone()
      .sub(forward.clone().multiplyScalar(1.05))
      .add(right.clone().multiplyScalar(0.42));
    targetPetPos.y = 0.02;

    // 平滑追隨分身位置
    this.petPos.lerp(targetPetPos, 0.12);

    // 萌寵朝向：朝向分身或行進方向
    const toPlayer = new THREE.Vector3().subVectors(this.position, this.petPos);
    toPlayer.y = 0;
    if (toPlayer.lengthSq() > 0.01) {
      const targetAngle = Math.atan2(toPlayer.x, toPlayer.z);
      this.petGroup.rotation.y = THREE.MathUtils.lerp(this.petGroup.rotation.y, targetAngle, 0.15);
    }

    // 動作動畫調制
    let bob = 0;
    if (this.petJumpTimer > 0) {
      // 撫摸跳躍翻滾特效
      this.petJumpTimer -= dt * 2.2;
      const jumpNorm = Math.max(0, this.petJumpTimer);
      bob = Math.sin((1 - jumpNorm) * Math.PI) * 0.42;
      this.petGroup.rotation.y += dt * 10.0;
    } else if (this.isMoving) {
      // 跟隨奔跑顛簸小跳
      const hopFreq = (this.isSprinting || this.keys.shift) ? 14 : 9;
      bob = Math.abs(Math.sin(time * hopFreq)) * 0.11;
    } else {
      // 原地呼吸微動
      bob = Math.sin(time * 2.5) * 0.015;
    }

    this.petGroup.position.set(this.petPos.x, targetPetPos.y + bob, this.petPos.z);

    // 虎尾巴搖擺
    if (this.petLimbs.tail) {
      this.petLimbs.tail.rotation.y = Math.sin(time * 7) * 0.35;
    }
    // 靈龜光環自轉
    if (this.petLimbs.aura) {
      this.petLimbs.aura.rotation.z += 0.03;
    }

    // 更新萌寵金幣愛心微粒
    for (let i = this.petSparks.length - 1; i >= 0; i--) {
      const sp = this.petSparks[i];
      sp.life -= dt * 1.5;
      sp.mesh.position.y += sp.vy;
      sp.mesh.position.x += sp.vx;
      sp.mesh.position.z += sp.vz;
      sp.mesh.material.opacity = Math.max(0, sp.life);
      if (sp.life <= 0) {
        this.scene.remove(sp.mesh);
        sp.mesh.geometry.dispose();
        sp.mesh.material.dispose();
        this.petSparks.splice(i, 1);
      }
    }
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

  // 生成遍布三進廟宇各處的同行 NPC 善信 (沉浸式寧靜零社交同在氛圍)
  spawnQuietCompanions() {
    const companionPresets = [
      { name: "淡淡的月光", color: 0x8a3818, pos: [-1.4, 0, 1.2], action: "meditate" }, // 大殿後方蒲團
      { name: "靜心的雲", color: 0x2d4875, pos: [1.4, 0, 1.2], action: "pray" }, // 大殿供桌旁
      { name: "虔誠香客小美", color: 0xc24b2b, pos: [0, 0, 9.6], action: "bow" }, // 天公爐前
      { name: "池畔許願小哥", color: 0x2e7d32, pos: [11.2, 0, 13.5], action: "pray" }, // 東進蓮花池拱橋前
      { name: "長廊寫願學長", color: 0x6a1b9a, pos: [-12.2, 0, 8.5], action: "meditate" }, // 西進祈願長廊
      { name: "山門迎客道長", color: 0xd4a034, pos: [-2.2, 0, 36.5], action: "bow" } // 巍峨山門前
    ];

    companionPresets.forEach(p => {
      const npcGroup = new THREE.Group();
      npcGroup.position.set(...p.pos);

      // 蒲團
      const matMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.32, 0.06, 16),
        new THREE.MeshStandardMaterial({ color: 0x822020 })
      );
      matMesh.position.y = 0.03;
      npcGroup.add(matMesh);

      // 身形
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.28, 0.45, 12),
        new THREE.MeshStandardMaterial({ color: p.color })
      );
      body.position.y = 0.32;
      npcGroup.add(body);

      // 頭部
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xffdfc4 })
      );
      head.position.y = 0.68;
      npcGroup.add(head);

      // 稱號
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "rgba(20, 5, 5, 0.8)";
      ctx.strokeStyle = "#cba260";
      ctx.lineWidth = 2;
      ctx.roundRect(10, 10, 236, 44, 20);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#e0cb9d";
      ctx.font = "bold 20px 'Noto Serif TC', serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.name, 128, 32);

      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) }));
      sprite.position.set(0, 1.1, 0);
      sprite.scale.set(0.75, 0.2, 1);
      npcGroup.add(sprite);

      this.scene.add(npcGroup);
      this.npcs.push({ group: npcGroup, action: p.action, offset: Math.random() * 5 });
    });
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
      if (e.code === "KeyB") this.triggerAction("bow");      // 鞠躬禮
      if (e.code === "KeyK") this.triggerAction("kneel");    // 跪拜
      if (e.code === "KeyP") this.triggerAction("pray");     // 合掌
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
      this.position.add(step);

      // 限制大殿與宏偉三進廟埕活動範圍
      // 大殿內 (Z <= 5.8): 寬度限制 X: ±3.8, 深度 Z: -2.8 ~ 5.8
      // 戶外宏偉廟埕 (Z > 5.8): 寬度大幅擴展至 X: ±17.5, 深度貫通至山門階梯 Z: 41.5
      const maxSide = this.position.z > 5.8 ? 17.5 : 3.8;
      this.position.x = Math.max(-maxSide, Math.min(maxSide, this.position.x));
      this.position.z = Math.max(-2.8, Math.min(41.5, this.position.z));

      // 角色平滑轉向行進方向
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      this.playerGroup.rotation.y = THREE.MathUtils.lerp(this.playerGroup.rotation.y, targetAngle, 0.18);
    } else {
      this.isMoving = false;
      if (this.currentAction === "walk") {
        this.currentAction = "idle";
      }
    }

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

  // ==========================================
  // 多人同殿連線分身系統 (Multiplayer Peers Sync)
  // ==========================================

  initMultiplayerPeers() {
    if (this.channel) {
      this.channel.addEventListener("message", (event) => {
        const data = event.data;
        if (!data) return;

        if (data.type === "PEER_AVATAR_UPDATE") {
          if (data.id === this.myPeerId) return;
          this.handlePeerUpdate(data);
        } else if (data.type === "PEER_AVATAR_LEAVE") {
          this.removePeer(data.id);
        } else if (data.type === "PEER_AVATAR_HELLO") {
          if (data.id !== this.myPeerId) {
            this.broadcastMyState(true);
          }
        }
      });

      // 入殿時向全頻道打招呼，請求既有信眾同步
      this.channel.postMessage({ type: "PEER_AVATAR_HELLO", id: this.myPeerId });

      window.addEventListener("beforeunload", () => {
        if (this.channel) {
          this.channel.postMessage({ type: "PEER_AVATAR_LEAVE", id: this.myPeerId });
        }
      });
    }

    // 支援 HTTP 本地伺服器 SSE 廣播同步
    if (typeof window !== "undefined" && window.location && window.location.protocol.startsWith("http")) {
      try {
        const evtSource = new EventSource("/api/events");
        evtSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (!data) return;
            if (data.type === "PEER_AVATAR_UPDATE" && data.id !== this.myPeerId) {
              this.handlePeerUpdate(data);
            } else if (data.type === "PEER_AVATAR_LEAVE") {
              this.removePeer(data.id);
            }
          } catch (e) {}
        };
      } catch (err) {}
    }
  }

  // 廣播本機角色狀態
  broadcastMyState(force = false) {
    const now = performance.now();
    const posDist = this.position.distanceTo(this.lastBroadcastPos);

    // 平滑節流：非強迫更新時，每 120ms 且位移大於 0.04m 或每 1.8 秒送心跳
    if (!force) {
      if (now - this.lastBroadcastTime < 120) return;
      if (posDist < 0.04 && (now - this.lastBroadcastTime < 1800)) return;
    }

    this.lastBroadcastTime = now;
    this.lastBroadcastPos.copy(this.position);

    const payload = {
      type: "PEER_AVATAR_UPDATE",
      id: this.myPeerId,
      config: this.config,
      pos: [
        parseFloat(this.position.x.toFixed(3)),
        parseFloat(this.position.y.toFixed(3)),
        parseFloat(this.position.z.toFixed(3))
      ],
      rot: parseFloat(this.playerGroup.rotation.y.toFixed(3)),
      action: this.currentAction,
      timestamp: Date.now()
    };

    if (this.channel) {
      this.channel.postMessage(payload);
    }

    // 若透過 HTTP 伺服器啟動，向後端發送廣播 (供不同電腦/手機同頻)
    if (typeof window !== "undefined" && window.location && window.location.protocol.startsWith("http")) {
      fetch("/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).catch(() => {});
    }
  }

  // 處理收到的同行分身狀態
  handlePeerUpdate(data) {
    let peer = this.peers.get(data.id);
    if (!peer) {
      peer = this.createPeerAvatarMesh(data.config || {}, data.id);
      this.peers.set(data.id, peer);

      if (window.templeAudio) {
        window.templeAudio.playBell(720);
      }
      const title = (data.config && data.config.title) ? data.config.title : "善信";
      if (document.getElementById("dockStatusBar")) {
        document.getElementById("dockStatusBar").innerText = `✨ 善信【${title}】已踏入大殿，同頻共修！`;
      }
    }

    peer.targetPos.set(data.pos[0], data.pos[1], data.pos[2]);
    peer.targetRot = data.rot;
    peer.action = data.action || "idle";
    peer.lastSeen = performance.now();
  }

  // 構建連線信眾 3D 模型
  createPeerAvatarMesh(cfg, id) {
    const peerGroup = new THREE.Group();
    peerGroup.name = `peer_${id}`;

    const robeColor = cfg.robeColor || "#3a7bd5";
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdfc4, roughness: 0.6 });
    const robeMat = new THREE.MeshStandardMaterial({ color: robeColor, roughness: 0.5 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.7 });

    // 軀幹
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 0.55, 16), robeMat);
    torso.position.y = 0.52;
    torso.castShadow = true;
    peerGroup.add(torso);

    // 腰帶
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.08, 16), goldMat);
    belt.position.y = 0.52;
    peerGroup.add(belt);

    // 頭部
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), skinMat);
    head.position.y = 0.96;
    head.castShadow = true;
    peerGroup.add(head);

    // 臉部
    const faceTex = this.createFaceTexture();
    const faceMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.28),
      new THREE.MeshBasicMaterial({ map: faceTex, transparent: true })
    );
    faceMesh.position.set(0, 0.95, 0.22);
    peerGroup.add(faceMesh);

    // 頭飾 (布條或道冠)
    if (cfg.hatType === "headband") {
      const hb = new THREE.Mesh(
        new THREE.CylinderGeometry(0.245, 0.245, 0.05, 16),
        new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.4 })
      );
      hb.position.y = 1.0;
      peerGroup.add(hb);
    } else if (cfg.hatType === "bun") {
      const bun = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0x221111 })
      );
      bun.position.set(0, 1.22, -0.06);
      peerGroup.add(bun);
    }

    // 雙臂與雙腿
    const limbMat = new THREE.MeshStandardMaterial({ color: robeColor, roughness: 0.5 });
    const armGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.42, 12);
    const legGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.45, 12);

    const armL = new THREE.Mesh(armGeo, limbMat);
    armL.position.set(-0.31, 0.52, 0);
    peerGroup.add(armL);

    const armR = new THREE.Mesh(armGeo, limbMat);
    armR.position.set(0.31, 0.52, 0);
    peerGroup.add(armR);

    const legL = new THREE.Mesh(legGeo, limbMat);
    legL.position.set(-0.13, 0.22, 0);
    peerGroup.add(legL);

    const legR = new THREE.Mesh(legGeo, limbMat);
    legR.position.set(0.13, 0.22, 0);
    peerGroup.add(legR);

    // 手持物
    if (cfg.holdingItem === "incense") {
      const stick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 0.35, 6),
        new THREE.MeshBasicMaterial({ color: 0x7a3015 })
      );
      stick.position.set(0, 0.72, 0.28);
      stick.rotation.x = -Math.PI / 6;
      peerGroup.add(stick);

      const ember = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xff3300 })
      );
      ember.position.set(0, 0.88, 0.37);
      peerGroup.add(ember);
    }

    // 浮動頭銜標籤 (綠色在線同頻標誌)
    const titleSprite = this.createPeerTitleSprite(cfg.title || "善信");
    titleSprite.position.set(0, 1.48, 0);
    peerGroup.add(titleSprite);

    this.scene.add(peerGroup);

    return {
      group: peerGroup,
      limbs: { torso, head, armL, armR, legL, legR },
      targetPos: new THREE.Vector3(0, 0, 4.0),
      targetRot: 0,
      action: "idle",
      actionProgress: 0,
      lastSeen: performance.now(),
      config: cfg
    };
  }

  // 繪製連線同道善信頭頂標籤 (帶在線光點)
  createPeerTitleSprite(titleText) {
    const canvas = document.createElement("canvas");
    canvas.width = 384;
    canvas.height = 96;
    const ctx = canvas.getContext("2d");

    // 半透明背景
    ctx.fillStyle = "rgba(10, 16, 26, 0.75)";
    ctx.roundRect(16, 16, 352, 64, 20);
    ctx.fill();

    ctx.strokeStyle = "rgba(76, 175, 80, 0.7)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // 綠色在線同頻指示光點
    ctx.fillStyle = "#4caf50";
    ctx.beginPath();
    ctx.arc(42, 48, 7, 0, Math.PI * 2);
    ctx.fill();

    // 標題文字
    ctx.font = "bold 26px 'Noto Serif TC', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.fillText(`${titleText}`, 62, 57);

    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.2, 0.3, 1);
    return sprite;
  }

  // 移除斷線分身
  removePeer(id) {
    const peer = this.peers.get(id);
    if (peer) {
      this.scene.remove(peer.group);
      this.peers.delete(id);
    }
  }

  // 更新所有同行分身位移與動作動畫
  updatePeers(time, dt) {
    const now = performance.now();

    this.peers.forEach((peer, id) => {
      // 超過 10 秒未收心跳則淡出移除
      if (now - peer.lastSeen > 10000) {
        this.removePeer(id);
        return;
      }

      // 平滑位移插值 (Lerp)
      peer.group.position.lerp(peer.targetPos, 0.22);

      // 平滑旋轉插值
      let curRot = peer.group.rotation.y;
      let diffRot = peer.targetRot - curRot;
      while (diffRot < -Math.PI) diffRot += Math.PI * 2;
      while (diffRot > Math.PI) diffRot -= Math.PI * 2;
      peer.group.rotation.y += diffRot * 0.22;

      // 肢體動畫驅動
      this.animatePeerLimbs(peer, time, dt);
    });
  }

  // 動態更新同頻分身肢體動畫
  animatePeerLimbs(peer, time, dt) {
    const limbs = peer.limbs;
    if (!limbs || !limbs.armL) return;

    if (peer.action === "walk") {
      const walkCycle = time * 8;
      limbs.legL.rotation.x = Math.sin(walkCycle) * 0.55;
      limbs.legR.rotation.x = -Math.sin(walkCycle) * 0.55;
      limbs.armL.rotation.x = -Math.sin(walkCycle) * 0.45;
      limbs.armR.rotation.x = Math.sin(walkCycle) * 0.45;
      peer.group.position.y = Math.abs(Math.sin(walkCycle)) * 0.04;
      limbs.torso.rotation.x = 0.08;
    } else if (peer.action === "bow") {
      peer.actionProgress += dt * 2.5;
      const bowAngle = Math.sin(peer.actionProgress * Math.PI) * 0.55;
      limbs.torso.rotation.x = bowAngle;
      limbs.head.rotation.x = bowAngle * 0.5;
      if (peer.actionProgress >= 1) peer.action = "idle";
    } else if (peer.action === "kneel") {
      peer.actionProgress += dt * 1.8;
      const kneelPhase = Math.sin(peer.actionProgress * Math.PI);
      peer.group.position.y = -kneelPhase * 0.35;
      limbs.torso.rotation.x = kneelPhase * 0.8;
      limbs.head.rotation.x = kneelPhase * 0.5;
      if (peer.actionProgress >= 1) peer.action = "idle";
    } else if (peer.action === "pray") {
      limbs.armL.rotation.set(-1.1, 0.7, 0);
      limbs.armR.rotation.set(-1.1, -0.7, 0);
      limbs.torso.rotation.x = 0.12;
    } else if (peer.action === "meditate") {
      peer.group.position.y = -0.32;
      limbs.armL.rotation.set(-0.5, 0.5, 0);
      limbs.armR.rotation.set(-0.5, -0.5, 0);
      limbs.torso.rotation.x = 0;
    } else {
      // idle 自然呼吸
      limbs.legL.rotation.x = 0;
      limbs.legR.rotation.x = 0;
      limbs.armL.rotation.set(0, 0, Math.sin(time * 2) * 0.03);
      limbs.armR.rotation.set(0, 0, -Math.sin(time * 2) * 0.03);
      limbs.torso.rotation.x = 0;
    }
  }
}

window.TempleAvatarSystem = TempleAvatarSystem;

