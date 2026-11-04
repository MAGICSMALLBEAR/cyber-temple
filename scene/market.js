// 廟埕南側兩個小場地，保留中央御道與鐘鼓樓的入口。
class TempleMarketMixin {
  buildNightMarket() {
    const wood = new THREE.MeshStandardMaterial({ color: 0x6b3521, roughness: 0.8 });
    const red = new THREE.MeshStandardMaterial({ color: 0x9b2426, roughness: 0.65 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.45, roughness: 0.55 });
    const box = (g, size, at, material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      mesh.position.set(...at); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); return mesh;
    };
    const stall = new THREE.Group(); stall.name = "ringStall"; stall.position.set(-6.5, 0, 25.5);
    box(stall, [2.6, 0.85, 1.3], [0, 0.425, 0], wood);
    box(stall, [2.9, 0.14, 1.7], [0, 2.5, 0], red);
    [-1.2, 1.2].forEach(x => box(stall, [0.10, 2.5, 0.10], [x, 1.25, -0.55], gold));
    [-0.8, -0.4, 0, 0.4, 0.8].forEach((x, i) => {
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.3, 10), new THREE.MeshStandardMaterial({ color: [0xe56d47, 0x9bbb72, 0xf1be42, 0x72a8ca, 0xb890c5][i] }));
      bottle.position.set(x, 1.02, 0); stall.add(bottle);
    });
    const sign = this.makeHallSign("平安套圈圈", 2.25, 0.42); sign.position.set(0, 2.18, 0.78); stall.add(sign);
    this.hallHit(stall, [2.6, 2.5, 1.5], 1.25, "ringStall", "🎯 平安套圈圈 • 五圈挑戰，點擊或走近按 E");
    this.scene.add(stall); this.ringStall = stall;

    const stage = new THREE.Group(); stage.name = "puppetStage"; stage.position.set(6.5, 0, 25.5);
    box(stage, [4.3, 0.65, 1.65], [0, 0.325, 0], wood);
    box(stage, [4.5, 0.20, 1.9], [0, 3.6, 0], red);
    box(stage, [4.2, 2.5, 0.12], [0, 2.0, -0.7], red);
    [-1.98, 1.98].forEach(x => box(stage, [0.18, 3.5, 0.25], [x, 1.75, 0.6], gold));
    [-1.63, 1.63].forEach(x => box(stage, [0.45, 2.1, 0.12], [x, 2.2, 0.65], red));
    const title = this.makeHallSign("平安掌中戲", 3.4, 0.48); title.position.set(0, 3.24, 0.72); stage.add(title);
    this.puppetActors = [];
    [[-0.7, 0xc44939], [0.7, 0x42669b]].forEach(([x, color], i) => {
      const doll = new THREE.Group(); doll.position.set(x, 1.2, 0.1);
      const cloth = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.68, 10), cloth); body.position.y = 0.35; doll.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), new THREE.MeshStandardMaterial({ color: 0xffdfc4 })); head.position.y = 0.85; doll.add(head);
      const hat = new THREE.Mesh(new THREE.ConeGeometry(0.20, 0.18, 8), i ? gold : cloth); hat.position.y = 1.06; doll.add(hat);
      [-0.05, 0.05].forEach(dx => { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), wood); eye.position.set(dx, 0.87, 0.15); doll.add(eye); });
      const arms = [];
      [-1, 1].forEach(side => {
        const arm = new THREE.Group(); arm.position.set(side * 0.20, 0.55, 0);
        const sleeve = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.37, 8), cloth); sleeve.position.y = -0.12; arm.add(sleeve);
        doll.add(arm); arms.push(arm);
      });
      stage.add(doll); this.puppetActors.push({ doll, arms, x });
    });
    const caption = this.makeHallSign("借一把傘 · 還一份善意", 3.4, 0.38); caption.position.set(0, 0.92, 0.85); stage.add(caption);
    this.hallHit(stage, [4.3, 3.6, 1.8], 1.8, "puppetStage", "🎭 平安掌中戲 • 借傘記，點擊或走近按 E 觀賞");
    this.scene.add(stage); this.puppetStage = stage;
  }

  tryMarketInteraction() {
    const p = this.avatar?.position; if (!p) return false;
    if (Math.hypot(p.x + 6.5, p.z - 25.5) < 2.8) { window.nightMarket?.open("ring"); return true; }
    if (Math.hypot(p.x - 6.5, p.z - 25.5) < 3) { window.nightMarket?.open("puppet"); return true; }
    return false;
  }

  updatePuppetStage(time) {
    const playing = window.nightMarket?.puppetPlaying;
    (this.puppetActors || []).forEach((a, i) => {
      a.doll.position.y = 1.2 + (playing ? Math.abs(Math.sin(time * 4 + i)) * 0.1 : 0);
      a.doll.rotation.z = playing ? Math.sin(time * 3 + i) * 0.1 : 0;
      a.arms.forEach((arm, j) => { arm.rotation.z = playing ? Math.sin(time * 5 + i + j) * 0.9 : (j ? 0.2 : -0.2); });
    });
  }
}
installTempleMixin(TempleMarketMixin);
