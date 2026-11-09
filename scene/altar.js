// scene/altar.js - 大殿法器：香爐、筊杯、籤筒、木魚、供品與三獻禮

class TempleAltarMixin {
  buildCenser() {
    this.censerGroup = new THREE.Group();
    this.censerGroup.position.set(0, 1.35, -0.3);
    this.censerGroup.name = "censer";

    const bronzeMat = new THREE.MeshStandardMaterial({ color: 0xaa7a28, metalness: 0.8, roughness: 0.3 });
    const potGeo = new THREE.SphereGeometry(0.36, 24, 16);
    potGeo.scale(1, 0.65, 1);
    const pot = new THREE.Mesh(potGeo, bronzeMat);
    pot.position.y = 0.22;
    pot.castShadow = true;
    this.censerGroup.add(pot);

    const earGeo = new THREE.TorusGeometry(0.08, 0.025, 8, 16);
    const earL = new THREE.Mesh(earGeo, bronzeMat);
    earL.position.set(-0.36, 0.26, 0);
    earL.rotation.y = Math.PI / 2;
    this.censerGroup.add(earL);

    const earR = new THREE.Mesh(earGeo, bronzeMat);
    earR.position.set(0.36, 0.26, 0);
    earR.rotation.y = Math.PI / 2;
    this.censerGroup.add(earR);

    [[0, -0.22], [-0.18, 0.12], [0.18, 0.12]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.12, 12), bronzeMat);
      leg.position.set(lx, 0.06, lz);
      this.censerGroup.add(leg);
    });

    const ash = new THREE.Mesh(new THREE.CircleGeometry(0.28, 24), new THREE.MeshStandardMaterial({ color: 0x999088, roughness: 0.9 }));
    ash.rotation.x = -Math.PI / 2;
    ash.position.y = 0.35;
    this.censerGroup.add(ash);

    const stickMat = new THREE.MeshStandardMaterial({ color: 0x8b2500, roughness: 0.6 });
    const emberMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });

    this.incenseSticks = [];
    [-0.07, 0, 0.07].forEach((sx, idx) => {
      const stickGroup = new THREE.Group();
      stickGroup.position.set(sx, 0.35, 0);
      stickGroup.rotation.z = (idx - 1) * 0.05;

      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.65, 8), stickMat);
      stick.position.y = 0.325;
      stickGroup.add(stick);

      const ember = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), emberMat);
      ember.position.y = 0.65;
      ember.visible = false;
      stickGroup.add(ember);

      this.censerGroup.add(stickGroup);
      this.incenseSticks.push({ group: stickGroup, ember });
    });

    this.interactiveObjects.push(pot);
    pot.userData = { type: "censer", tooltip: "🔥 點擊香爐 或 走近按 [E]：插香祈願" };

    this.scene.add(this.censerGroup);
  }

  buildBwaBwei() {
    this.bwaBlocks = [];
    const bwaMatRound = new THREE.MeshStandardMaterial({ color: 0xe03838, roughness: 0.35, metalness: 0.1 });

    for (let i = 0; i < 2; i++) {
      const bwaGroup = new THREE.Group();
      bwaGroup.name = `bwa_${i}`;

      const shape = new THREE.Shape();
      shape.moveTo(-0.16, -0.32);
      shape.quadraticCurveTo(-0.25, 0, -0.16, 0.32);
      shape.quadraticCurveTo(0.12, 0, -0.16, -0.32);

      const extrudeSettings = { depth: 0.1, bevelEnabled: true, bevelSegments: 4, steps: 1, bevelSize: 0.04, bevelThickness: 0.05 };
      const bwaGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      bwaGeo.center();

      const bwaMesh = new THREE.Mesh(bwaGeo, bwaMatRound);
      bwaMesh.rotation.x = Math.PI / 2;
      bwaMesh.castShadow = true;
      bwaGroup.add(bwaMesh);

      const initialX = (i === 0 ? -0.32 : 0.32);
      bwaGroup.position.set(initialX, 0.08, 1.8);
      bwaGroup.rotation.y = (i === 0 ? 0.3 : -0.3);

      this.scene.add(bwaGroup);
      this.bwaBlocks.push(bwaGroup);

      this.interactiveObjects.push(bwaMesh);
      bwaMesh.userData = { type: "bwa", tooltip: "🌓 點擊筊杯 或 走近按 [E]：誠心擲筊請示" };
    }
  }

  buildChiamBucket() {
    this.chiamBucket = new THREE.Group();
    this.chiamBucket.position.set(1.4, 1.35, -0.3);
    this.chiamBucket.name = "chiamBucket";

    const bucketMat = new THREE.MeshStandardMaterial({ color: 0x6e2510, roughness: 0.4 });
    const bucketMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.15, 0.55, 18, 1, true), bucketMat);
    bucketMesh.position.y = 0.275;
    bucketMesh.castShadow = true;
    this.chiamBucket.add(bucketMesh);

    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.7 });
    const hoop1 = new THREE.Mesh(new THREE.TorusGeometry(0.162, 0.012, 8, 24), goldMat);
    hoop1.position.y = 0.15;
    hoop1.rotation.x = Math.PI / 2;
    this.chiamBucket.add(hoop1);

    const hoop2 = new THREE.Mesh(new THREE.TorusGeometry(0.162, 0.012, 8, 24), goldMat);
    hoop2.position.y = 0.45;
    hoop2.rotation.x = Math.PI / 2;
    this.chiamBucket.add(hoop2);

    this.chiamSticks = [];
    const stickMat = new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.5 });
    const stickRedMat = new THREE.MeshStandardMaterial({ color: 0xaa2020 });

    for (let i = 0; i < 28; i++) {
      const sGroup = new THREE.Group();
      const angle = (i / 28) * Math.PI * 2;
      const radius = 0.04 + Math.random() * 0.08;
      sGroup.position.set(Math.cos(angle) * radius, 0.28, Math.sin(angle) * radius);
      sGroup.rotation.z = (Math.random() - 0.5) * 0.12;

      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.5, 6), stickMat);
      body.position.y = 0.25;
      sGroup.add(body);

      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.08, 6), stickRedMat);
      tip.position.y = 0.48;
      sGroup.add(tip);

      this.chiamBucket.add(sGroup);
      this.chiamSticks.push(sGroup);
    }

    this.interactiveObjects.push(bucketMesh);
    bucketMesh.userData = { type: "chiam", tooltip: "🎋 點擊籤筒 或 走近按 [E]：虔心搖筒求籤" };

    this.scene.add(this.chiamBucket);
  }

  buildMuyu() {
    this.muyuGroup = new THREE.Group();
    this.muyuGroup.position.set(-1.4, 1.35, -0.3);
    this.muyuGroup.name = "muyu";

    const cushionMat = new THREE.MeshStandardMaterial({ color: 0x992020, roughness: 0.7 });
    const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.08, 16), cushionMat);
    cushion.position.y = 0.04;
    this.muyuGroup.add(cushion);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a2d12, roughness: 0.35, metalness: 0.1 });
    const bodyGeo = new THREE.SphereGeometry(0.18, 18, 16);
    bodyGeo.scale(1.2, 0.85, 1);
    const muyuMesh = new THREE.Mesh(bodyGeo, woodMat);
    muyuMesh.position.y = 0.18;
    muyuMesh.castShadow = true;
    this.muyuGroup.add(muyuMesh);

    this.mallet = new THREE.Group();
    this.mallet.position.set(-0.15, 0.32, 0.18);
    this.mallet.rotation.z = -0.4;

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.38, 8), new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.6 }));
    handle.position.y = 0.19;
    this.mallet.add(handle);

    const malletHead = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), cushionMat);
    malletHead.position.y = 0.38;
    this.mallet.add(malletHead);

    this.muyuGroup.add(this.mallet);

    this.interactiveObjects.push(muyuMesh);
    muyuMesh.userData = { type: "muyu", tooltip: "🪵 點擊木魚 或 走近按 [E]：功德+1 (按空白鍵亦可)" };

    this.scene.add(this.muyuGroup);
  }

  buildOfferings() {
    this.offeringsGroup = new THREE.Group();
    this.offeringsGroup.position.set(0, 1.35, 0.1);
    this.scene.add(this.offeringsGroup);

    // 讀取本地儲存或預設五大經典御賜供品
    this.offeringsGroup.userData.noCollision = true;
    const savedDishes = window.templeInventory?.data.offering.slots || [null, null, null, null, null];
    this.updateAltarFeastOfferings(savedDishes);
  }

  // 模型本體在 scene/offering-models.js，與角色提籃、端盤共用
  createIngotModel(silver = false) { return buildIngotModel(silver); }
  createTreasureOffering(type) { return buildTreasureOffering(type); }

  // 更新神案上的五大供品 3D 模型
  updateAltarFeastOfferings(dishTypes = ["fruit", "peach", "fagao", "redturtle", "guaiguai"]) {
    if (!this.offeringsGroup) return;

    // 清除舊供品物件
    const geometries = new Set(), materials = new Set();
    this.offeringsGroup.traverse(o => { if (o.geometry) geometries.add(o.geometry); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m)); });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
    while (this.offeringsGroup.children.length > 0) this.offeringsGroup.remove(this.offeringsGroup.children[0]);

    const slotXs = [-1.05, -0.52, 0, 0.52, 1.05];
    dishTypes.forEach((type, idx) => {
      const dishGroup = buildOfferingDish(type);
      dishGroup.name = `offering-slot-${idx}`;
      dishGroup.position.set(slotXs[idx] !== undefined ? slotXs[idx] : (idx - 2) * 0.5, 0, 0);
      this.offeringsGroup.add(dishGroup);
    });
  }

  // 呈獻大典金光神威慶典
  celebrateFeastOffering() {
    if (this.deityHalo) {
      this.deityHalo.scale.set(1.2, 1.2, 1.2);
      setTimeout(() => {
        if (this.deityHalo) this.deityHalo.scale.set(1, 1, 1);
      }, 1500);
    }
    this.spawn3DFloatingText("✨ 筵席呈獻 • 神威顯赫 • 福壽綿長！", new THREE.Vector3(0, 2.8, 0.1));
    if (window.templeAudio) {
      window.templeAudio.playFeastOffering();
    }
  }

  // 金色筊杯外觀開關
  setBwaGoldenMaterial(isGolden) {
    if (!this.bwaBlocks || this.bwaBlocks.length < 2) return;
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.85, roughness: 0.2 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xe03838, roughness: 0.35, metalness: 0.1 });
    const mat = isGolden ? goldMat : redMat;
    this.bwaBlocks.forEach(bGroup => {
      bGroup.children.forEach(child => {
        if (child.material) child.material = mat;
      });
    });
  }

  lightIncense() {
    this.isIncenseLit = true;
    this.incenseSticks.forEach(item => {
      item.ember.visible = true;
    });

    if (!this.emberLight) {
      this.emberLight = new THREE.PointLight(0xff5500, 1.5, 2.5);
      this.emberLight.position.set(0, 2.0, -0.3);
      this.scene.add(this.emberLight);
    }

    this.spawn3DFloatingText("三炷清香 • 誠心達天", new THREE.Vector3(0, 2.2, -0.3));
    if (this.avatar) {
      if (this.avatar.playRitualMotion) this.avatar.playRitualMotion("incenseOffering");
      else this.avatar.triggerAction("bow");
    }
  }

  tossBwa(callback) {
    if (this.isBwaTossing) return;
    this.isBwaTossing = true;

    if (this.avatar) {
      this.avatar.triggerAction("kneel");
    }

    const startTime = performance.now();
    const duration = 1200;

    const outcome1 = Math.random() < 0.5 ? 0 : 1;
    const outcome2 = Math.random() < 0.5 ? 0 : 1;

    const bwa1 = this.bwaBlocks[0];
    const bwa2 = this.bwaBlocks[1];

    const animateToss = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress < 1) {
        const height = Math.sin(progress * Math.PI) * 1.5;
        bwa1.position.y = 0.08 + height;
        bwa2.position.y = 0.08 + height;

        bwa1.rotation.x += 0.28;
        bwa1.rotation.y += 0.24;
        bwa1.rotation.z += 0.18;

        bwa2.rotation.x += 0.24;
        bwa2.rotation.y += 0.30;
        bwa2.rotation.z += 0.15;

        requestAnimationFrame(animateToss);
      } else {
        bwa1.position.set(-0.35 + (Math.random() - 0.5) * 0.1, 0.08, 1.8 + (Math.random() - 0.5) * 0.1);
        bwa2.position.set(0.35 + (Math.random() - 0.5) * 0.1, 0.08, 1.8 + (Math.random() - 0.5) * 0.1);

        bwa1.rotation.set(outcome1 === 0 ? Math.PI / 2 : -Math.PI / 2, Math.random() * 0.5, 0);
        bwa2.rotation.set(outcome2 === 0 ? Math.PI / 2 : -Math.PI / 2, -Math.random() * 0.5, 0);

        this.isBwaTossing = false;
        if (callback) callback({ outcome1, outcome2 });
      }
    };

    requestAnimationFrame(animateToss);
  }

  shakeChiamBucket(callback) {
    if (this.isChiamShaking) return;
    this.isChiamShaking = true;

    if (this.avatar) {
      this.avatar.triggerAction("pray");
    }

    const startTime = performance.now();
    const duration = 1400;
    const bucket = this.chiamBucket;
    const targetStick = this.chiamSticks[Math.floor(Math.random() * this.chiamSticks.length)];

    const animateShake = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress < 0.7) {
        bucket.rotation.z = Math.sin(elapsed * 0.035) * 0.12;
        bucket.rotation.x = Math.cos(elapsed * 0.025) * 0.08;
        requestAnimationFrame(animateShake);
      } else if (progress < 1) {
        bucket.rotation.set(0, 0, 0);
        targetStick.position.y = 0.28 + ((progress - 0.7) / 0.3) * 0.35;
        requestAnimationFrame(animateShake);
      } else {
        this.isChiamShaking = false;
        if (callback) callback();
      }
    };

    requestAnimationFrame(animateShake);
  }

  strikeMuyu() {
    if (!this.mallet || this.isMuyuStriking) return;
    this.isMuyuStriking = true;

    this.mallet.rotation.z = 0.15;
    this.muyuGroup.position.y = 1.32;

    setTimeout(() => {
      this.mallet.rotation.z = -0.4;
      this.muyuGroup.position.y = 1.35;
      this.isMuyuStriking = false;
    }, 120);

    const customTxt = document.getElementById("txtCustomFloat")?.value || "功德 +1";
    this.spawn3DFloatingText(customTxt, new THREE.Vector3(-1.4, 1.8, -0.3));

    if (this.avatar) {
      this.avatar.triggerAction("pray");
    }
  }
}

installTempleMixin(TempleAltarMixin);
