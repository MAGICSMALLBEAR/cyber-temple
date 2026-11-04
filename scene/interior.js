// 大殿布置：低矮拜墊不擋路，櫃體與護法像沿用場景碰撞。
class TempleInteriorMixin {
  makeHallSign(text, width, height, vertical = false) {
    const canvas = document.createElement("canvas");
    canvas.width = vertical ? 128 : 768;
    canvas.height = vertical ? 768 : 192;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#42150e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#d4a034";
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
    ctx.fillStyle = "#ffe29a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${vertical ? 70 : 90}px 'Noto Serif TC', 'Microsoft JhengHei', serif`;
    if (vertical) Array.from(text).forEach((c, i, chars) => ctx.fillText(c, 64, 54 + i * (660 / Math.max(1, chars.length - 1))));
    else ctx.fillText(text, 384, 100, 720);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) }));
    mesh.userData.noCollision = true;
    return mesh;
  }

  hallHit(group, size, y, type, tooltip, extra = {}) {
    const hit = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = y;
    hit.userData = { type, tooltip, noCollision: true, ...extra };
    group.add(hit);
    this.interactiveObjects.push(hit);
  }

  buildHallInterior() {
    const wood = new THREE.MeshStandardMaterial({ color: 0x56271b, roughness: 0.65 });
    const red = new THREE.MeshStandardMaterial({ color: 0x9b2426, roughness: 0.85 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.65, roughness: 0.4 });
    const addBox = (g, size, pos, mat) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
      mesh.position.set(...pos);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.add(mesh);
      return mesh;
    };
    this.hallInterior = new THREE.Group();
    this.hallInterior.name = "hallInterior";
    this.scene.add(this.hallInterior);

    const plaque = this.makeHallSign("神恩浩蕩", 4.5, 1.0);
    plaque.name = "mainHallPlaque";
    plaque.position.set(0, 5.45, -2.95);
    this.hallInterior.add(plaque);
    [[3.4, "神恩廣被千家樂"], [-3.4, "聖德長昭萬戶安"]].forEach(([x, text]) => {
      const sign = this.makeHallSign(text, 0.36, 2.55, true);
      sign.name = "hallCouplet";
      sign.position.set(x, 3.05, 4.51);
      this.hallInterior.add(sign);
    });

    // 留出正中御道與筊杯前方空間，拜墊在兩側。
    this.prayerMats = [];
    [-1.35, 1.35].forEach(x => {
      const g = new THREE.Group();
      g.name = "prayerMat";
      g.position.set(x, 0, 2.65);
      addBox(g, [0.88, 0.08, 1.05], [0, 0.04, 0], gold);
      addBox(g, [0.80, 0.10, 0.97], [0, 0.10, 0], red);
      const sign = this.makeHallSign("跪坐 · E", 0.6, 0.16);
      sign.rotation.x = -Math.PI / 2;
      sign.position.set(0, 0.155, 0.32);
      g.add(sign);
      this.hallHit(g, [0.88, 0.22, 1.05], 0.11, "prayerMat", "🧎 拜墊 • 跪坐稟告，再按 E 起身；移動也可起身");
      this.hallInterior.add(g);
      this.prayerMats.push(g);
    });

    this.hallGuardians = [];
    [[-2.65, "千里眼", 0x4b8260], [2.65, "順風耳", 0xb74b3b]].forEach(([x, name, color], index) => {
      const g = new THREE.Group();
      g.name = name;
      g.position.set(x, 0, -1.9);
      addBox(g, [0.75, 0.30, 0.75], [0, 0.15, 0], wood);
      const armor = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.36, 0.9, 8), gold);
      armor.position.y = 1.0;
      g.add(armor);
      const faceMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 16, 12), faceMat);
      head.position.set(0, 1.68, 0);
      g.add(head);
      [-0.085, 0.085].forEach(dx => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfff5d6 }));
        eye.position.set(dx, 1.7, 0.205);
        g.add(eye);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), wood);
        pupil.position.set(dx, 1.7, 0.252);
        g.add(pupil);
      });
      const helmet = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.3, 8), gold);
      helmet.position.y = 1.94;
      g.add(helmet);
      [-1, 1].forEach(side => {
        addBox(g, [0.15, 0.5, 0.19], [side * 0.16, 0.5, 0], faceMat);
        const arm = addBox(g, [0.14, 0.55, 0.16], [side * 0.35, 1.24, 0.02], faceMat);
        arm.rotation.z = side * 0.25;
      });
      // 千里眼舉手遠眺；順風耳手掌攏耳，輪廓也能辨識。
      const palm = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), faceMat);
      palm.scale.set(index ? 0.55 : 1.4, index ? 1.5 : 0.5, 0.7);
      palm.position.set(index ? 0.27 : -0.12, 1.74, index ? 0.03 : 0.28);
      g.add(palm);
      const sign = this.makeHallSign(name, 0.66, 0.22);
      sign.position.set(0, 0.17, 0.38);
      g.add(sign);
      this.hallInterior.add(g);
      this.hallGuardians.push(g);
    });

    const donation = new THREE.Group();
    donation.name = "donationBox";
    donation.position.set(-2.8, 0, 3.0);
    addBox(donation, [0.68, 0.92, 0.6], [0, 0.46, 0], wood);
    addBox(donation, [0.74, 0.07, 0.66], [0, 0.95, 0], gold);
    addBox(donation, [0.29, 0.008, 0.055], [0, 0.99, 0], new THREE.MeshBasicMaterial({ color: 0x110907 }));
    const dsign = this.makeHallSign("香油箱", 0.59, 0.23);
    dsign.position.set(0, 0.65, 0.305);
    donation.add(dsign);
    this.hallHit(donation, [0.8, 1.2, 0.7], 0.6, "donationBox", "🪙 香油箱 • 隨喜奉獻遊戲功德");
    this.hallInterior.add(donation);
    this.donationBox = donation;

    const cabinet = new THREE.Group();
    cabinet.name = "chiamCabinet";
    cabinet.position.set(2.8, 0, 3.0);
    addBox(cabinet, [0.8, 1.65, 0.5], [0, 0.825, 0], wood);
    for (let row = 0; row < 5; row++) for (let col = 0; col < 3; col++) {
      addBox(cabinet, [0.22, 0.22, 0.04], [(col - 1) * 0.25, 0.23 + row * 0.25, 0.27], red);
      addBox(cabinet, [0.07, 0.025, 0.03], [(col - 1) * 0.25, 0.23 + row * 0.25, 0.3], gold);
    }
    const csign = this.makeHallSign("籤詩櫃", 0.73, 0.23);
    csign.position.set(0, 1.47, 0.26);
    cabinet.add(csign);
    this.hallHit(cabinet, [0.85, 1.7, 0.6], 0.85, "chiamCabinet", "📜 籤詩櫃 • 重閱已求得的籤詩");
    this.hallInterior.add(cabinet);
    this.chiamCabinet = cabinet;
  }

  interactWithHallObject(obj) {
    const type = obj.userData.type;
    if (type === "prayerMat") {
      const a = this.avatar;
      if (!a) return;
      const mat = obj.parent;
      // 須走到拜墊旁，避免遠端點擊把分身移穿障礙。
      if (Math.hypot(a.position.x - mat.position.x, a.position.z - mat.position.z) > 1.15) {
        window.setDockStatus?.("🧎 請走近拜墊後按 E 跪坐。");
        return;
      }
      if (a.currentAction === "kneelSit") {
        a.triggerAction("idle");
        window.setDockStatus?.("🙏 已起身，願身心安定。");
      } else {
        a.position.set(mat.position.x, 0.15, mat.position.z);
        a.playerGroup.rotation.y = Math.PI;
        a.triggerAction("kneelSit");
        window.emitRitual?.("bow", { action: "kneel" });
        window.setDockStatus?.("🧎 在拜墊上跪坐稟告；按 E 或移動即可起身。");
      }
    } else if (type === "donationBox") window.hallActivities?.openDonation();
    else if (type === "chiamCabinet") {
      window.openPassportModal?.();
      document.querySelector('.passport-tab-btn[data-ptab="chiam"]')?.click();
    }
  }

  tryHallInteraction() {
    if (!this.avatar) return false;
    const p = this.avatar.position;
    const targets = this.interactiveObjects.filter(o => ["prayerMat", "donationBox", "chiamCabinet"].includes(o.userData.type));
    const nearest = targets.map(o => ({ o, d: Math.hypot(p.x - o.parent.position.x, p.z - o.parent.position.z) })).sort((a, b) => a.d - b.d)[0];
    if (!nearest || nearest.d > (nearest.o.userData.type === "prayerMat" ? 0.8 : 1.1)) return false;
    this.interactWithHallObject(nearest.o);
    return true;
  }
}

installTempleMixin(TempleInteriorMixin);
