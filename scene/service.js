// scene/service.js - 廟埕服務處：參拜前在這裡領清香、金紙（完整參拜流程的第一站）
// 位置：走出大殿正門的右手邊（廟埕西側），與東側的神轎停放處（x 3.8, z 9）左右對稱、互不重疊；
// 離中央御道有段距離，不擋住去天公爐與金爐的路。其他程式（參拜指引、背包商店）都讀這個常數。

const SERVICE_DESK_POS = [-5.2, 8.2];

class TempleServiceMixin {
  buildServiceDesk() {
    const g = new THREE.Group();
    g.name = "serviceDesk";
    g.position.set(SERVICE_DESK_POS[0], 0, SERVICE_DESK_POS[1]);
    g.rotation.y = Math.PI / 2;    // 櫃台正面朝 +x（朝中央御道）

    const red = new THREE.MeshStandardMaterial({ color: 0x9a1f1a, roughness: 0.6 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x6b3a1f, roughness: 0.7 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xd4a034, metalness: 0.6, roughness: 0.35 });

    // 櫃台與桌面
    const counter = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.95, 0.8), red);
    counter.position.y = 0.475;
    counter.castShadow = true;
    counter.receiveShadow = true;
    g.add(counter);
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.08, 0.92), wood);
    top.position.y = 0.99;
    g.add(top);

    // 同一服務處擴成供品鋪，商品陳列在原櫃台範圍內，不占中央通道。
    const awning = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.1, 1.25), red); awning.position.set(0, 2.63, -0.08); g.add(awning);
    const fringes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.21, 0.18, 0.04), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 }), 11);
    fringes.userData.noCollision = true;
    const fm = new THREE.Matrix4(), fCol = new THREE.Color();
    for (let i = -5; i <= 5; i++) {
      fm.makeTranslation(i * 0.23, 2.5, 0.53); fringes.setMatrixAt(i + 5, fm);
      fringes.setColorAt(i + 5, fCol.setHex(i % 2 ? 0x6b3a1f : 0xd4a034));
    }
    fringes.instanceColor.needsUpdate = true;
    g.add(fringes);
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 0.25), wood); shelf.position.set(0, 1.62, -0.26); g.add(shelf);
    ["goldIngot", "silverIngot", "treasureBowl"].forEach((id, i) => {
      const sample = this.createTreasureOffering(id); sample.scale.setScalar(1.5); sample.position.set((i - 1) * 0.55, 1.66, -0.26); sample.userData.noCollision = true; g.add(sample);
    });

    // 桌上：一束清香、疊好的金紙、一盤水果
    const incense = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.45, 10), new THREE.MeshStandardMaterial({ color: 0xc0623a }));
    incense.position.set(-0.6, 1.25, 0);
    incense.userData.noCollision = true;
    g.add(incense);
    const papers = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.04, 0.3), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.3 }), 4);
    papers.userData.noCollision = true;
    const pObj = new THREE.Object3D();
    for (let i = 0; i < 4; i++) {
      pObj.position.set(0.05, 1.05 + i * 0.045, 0);
      pObj.rotation.set(0, i * 0.12, 0);
      pObj.updateMatrix();
      papers.setMatrixAt(i, pObj.matrix);
      papers.setColorAt(i, fCol.setHex(i % 2 ? 0xe6b422 : 0xf0c74a));
    }
    papers.instanceColor.needsUpdate = true;
    g.add(papers);
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.05, 16), gold);
    plate.position.set(0.65, 1.05, 0);
    plate.userData.noCollision = true;
    g.add(plate);
    const fruits = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 10, 10), new THREE.MeshStandardMaterial({ color: 0xff7a1a }), 3);
    fruits.userData.noCollision = true;
    [[0, 0], [0.08, 0.05], [-0.07, 0.06]].forEach(([dx, dz], idx) => {
      fm.makeTranslation(0.65 + dx, 1.13, dz);
      fruits.setMatrixAt(idx, fm);
    });
    g.add(fruits);

    // 招牌：兩根柱子撐起「服務處」橫匾（文字在畫布上繪製）
    const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.05, 2.3, 8), wood, 2);
    posts.userData.noCollision = true;
    [-1.05, 1.05].forEach((x, idx) => {
      fm.makeTranslation(x, 1.15, -0.35);
      posts.setMatrixAt(idx, fm);
    });
    g.add(posts);
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#7a1410";
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = "#f5c542";
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 496, 112);
    ctx.fillStyle = "#ffe885";
    ctx.font = "bold 52px 'Noto Serif TC', 'Microsoft JhengHei', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("供品鋪・服務處", 256, 68);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.55, 0.06), [wood, wood, wood, wood, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) }), wood]);
    sign.position.set(0, 2.15, -0.35);
    g.add(sign);

    // 小紅燈籠
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 14), new THREE.MeshStandardMaterial({ color: 0xd42020, emissive: 0x661010 }));
    lantern.scale.y = 1.25;
    lantern.position.set(1.0, 1.7, 0.1);
    g.add(lantern);

    this.addToZone(g);
    this.serviceDesk = g;
    this.serviceDeskPos = new THREE.Vector3(SERVICE_DESK_POS[0], 0, SERVICE_DESK_POS[1]);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(2.35, 2.5, 0.92), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 1.25;
    hit.userData = { type: "serviceDesk", tooltip: "🏮 供品鋪・服務處 • 供品、金銀元寶與香品（走近按 E）", noCollision: true };
    g.add(hit);
    this.interactiveObjects.push(hit);
    this.batchStaticGroup?.(g);
  }
}

installTempleMixin(TempleServiceMixin);
