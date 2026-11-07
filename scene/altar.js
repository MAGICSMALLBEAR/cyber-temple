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

  createIngotModel(silver = false) {
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

  createTreasureOffering(type) {
    const g = new THREE.Group(); g.name = type;
    const bowl = type === "treasureBowl";
    if (bowl) {
      const red = new THREE.MeshStandardMaterial({ color: 0x9d1b26, roughness: 0.38, metalness: 0.25 });
      const vessel = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.09, 0.11, 20), red); vessel.position.y = 0.08; g.add(vessel);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.013, 6, 24), new THREE.MeshStandardMaterial({ color: 0xeabd50, metalness: 0.8, roughness: 0.3 })); rim.rotation.x = Math.PI / 2; rim.position.y = 0.138; g.add(rim);
    }
    const count = bowl ? 5 : 3;
    for (let i = 0; i < count; i++) {
      const ingot = this.createIngotModel(type === "silverIngot" || bowl && i % 2 === 1);
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

  // 更新神案上的五大供品 3D 模型
  updateAltarFeastOfferings(dishTypes = ["fruit", "peach", "fagao", "redturtle", "guaiguai"]) {
    if (!this.offeringsGroup) return;

    // 清除舊供品物件
    const geometries = new Set(), materials = new Set();
    this.offeringsGroup.traverse(o => { if (o.geometry) geometries.add(o.geometry); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m)); });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
    while (this.offeringsGroup.children.length > 0) {
      const child = this.offeringsGroup.children[0];
      this.offeringsGroup.remove(child);
    }

    const goldPlateMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.85, roughness: 0.2 });
    const redPlateMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.4 });
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.4 });

    const slotXs = [-1.05, -0.52, 0, 0.52, 1.05];

    dishTypes.forEach((type, idx) => {
      const posX = slotXs[idx] !== undefined ? slotXs[idx] : (idx - 2) * 0.5;
      const dishGroup = new THREE.Group();
      dishGroup.userData.dish = type || null; dishGroup.name = `offering-slot-${idx}`;
      dishGroup.position.set(posX, 0, 0);

      // 金紋底盤
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.025, 20), goldPlateMat);
      plate.position.y = 0.012;
      dishGroup.add(plate);

      if (["goldIngot", "silverIngot", "treasureBowl"].includes(type)) {
        plate.material = type === "silverIngot" ? new THREE.MeshStandardMaterial({ color: 0x315b88, roughness: 0.3 }) : redPlateMat;
        dishGroup.add(this.createTreasureOffering(type));
      } else if (type === "fruit") {
        // 🍎 五福平安果盤
        const fruitMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.25 });
        const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35 });
        [[-0.05, 0.04, -0.04], [0.05, 0.04, -0.04], [0, 0.04, 0.05]].forEach(pos => {
          const apple = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), fruitMat);
          apple.position.set(pos[0], pos[1], pos[2]);
          dishGroup.add(apple);
        });
        const orange = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 10), orangeMat);
        orange.position.set(0, 0.11, 0);
        dishGroup.add(orange);
      } else if (type === "peach") {
        // 🍑 長生仙桃 (王母蟠桃)
        const peachMat = new THREE.MeshStandardMaterial({ color: 0xfda4af, roughness: 0.3 });
        [-0.04, 0.04].forEach(px => {
          const peach = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), peachMat);
          peach.scale.set(0.9, 1.2, 0.9);
          peach.position.set(px, 0.065, 0);
          dishGroup.add(peach);
          // 綠葉
          const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.005, 0.06), greenMat);
          leaf.position.set(px, 0.02, 0.06);
          leaf.rotation.x = 0.3;
          dishGroup.add(leaf);
        });
      } else if (type === "fagao") {
        // 🍞 富貴發糕 (開花發糕)
        const cakeMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.8 });
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.065, 0.07, 14), cakeMat);
        base.position.y = 0.045;
        dishGroup.add(base);
        // 開花頂部
        for (let b = 0; b < 4; b++) {
          const petal = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), cakeMat);
          const angle = (b / 4) * Math.PI * 2;
          petal.position.set(Math.cos(angle) * 0.035, 0.085, Math.sin(angle) * 0.035);
          dishGroup.add(petal);
        }
      } else if (type === "redturtle") {
        // 🐢 祈福紅龜粿
        const turtleMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 });
        const cake = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), turtleMat);
        cake.scale.set(1.1, 0.45, 1.3);
        cake.position.y = 0.04;
        dishGroup.add(cake);
        // 香蕉葉墊底
        const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.22), greenMat);
        leaf.rotation.x = -Math.PI / 2;
        leaf.position.y = 0.024;
        dishGroup.add(leaf);
      } else if (type === "guaiguai") {
        // 🟢 金牌科技乖乖
        const bagMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.4, metalness: 0.1 });
        const bag = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.20, 0.07), bagMat);
        bag.position.y = 0.11;
        bag.rotation.y = 0.15;
        dishGroup.add(bag);
        // 金牌彩帶
        const goldBand = new THREE.Mesh(new THREE.BoxGeometry(0.162, 0.04, 0.072), goldPlateMat);
        goldBand.position.y = 0.11;
        goldBand.rotation.y = 0.15;
        dishGroup.add(goldBand);
      } else if (type === "milktea") {
        // 🧋 全糖特大珍珠奶茶
        const teaMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 });
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.14, 16), teaMat);
        cup.position.y = 0.08;
        dishGroup.add(cup);
        // 吸管
        const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 8), redPlateMat);
        straw.position.set(0.015, 0.15, 0);
        straw.rotation.z = 0.15;
        dishGroup.add(straw);
      } else if (type === "chicken") {
        // 🍗 香脆現炸大雞排
        const chickenMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.85 });
        const chicken = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.11), chickenMat);
        chicken.position.y = 0.04;
        chicken.rotation.y = 0.2;
        dishGroup.add(chicken);
        // 紙袋下半部
        const bagMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.7 });
        const bag = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.042, 0.06), bagMat);
        bag.position.set(0, 0.038, 0.03);
        bag.rotation.y = 0.2;
        dishGroup.add(bag);
      } else if (type === "flowers") {
        // 🌸 清雅素果鮮花花瓶
        const vaseMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.3, roughness: 0.2 });
        const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.12, 12), vaseMat);
        vase.position.y = 0.07;
        dishGroup.add(vase);
        // 百合與菊花花球
        const flowerMat = new THREE.MeshStandardMaterial({ color: 0xfef08a });
        for (let f = 0; f < 3; f++) {
          const fl = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), flowerMat);
          fl.position.set((f - 1) * 0.025, 0.14, 0);
          dishGroup.add(fl);
        }
      }

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
