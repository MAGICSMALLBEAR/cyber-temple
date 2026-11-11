// scene/peer-tables.js - 多人供桌實體展示：大殿兩側同行信眾供席位分配、供品渲染與離線清理
// 4 處供席（東一、西一、東二、西二），讓同房間的同行看見彼此桌上的供品。
// 只顯示對方的角色稱呼與桌上供品；對方的心願手帳與敬獻稱呼不會送過來。
// 位置量過碰撞（大殿內可走範圍 |x| ≤ 3.8）：一席在神案（到 x=±2.1）與大柱之間，靠內留 0.75m 走道；
// 二席在入口內側、大柱與門檻之間，不擋中央御道。tests/collision.test.js 會檢查每席都走得到。
const PEER_TABLE_SLOTS = [
  { id: 0, pos: [3.15, 0, 1.15], rotY: -Math.PI / 2, label: "東一席" },
  { id: 1, pos: [-3.15, 0, 1.15], rotY: Math.PI / 2, label: "西一席" },
  { id: 2, pos: [2.95, 0, 5.0], rotY: Math.PI, label: "東二席" },
  { id: 3, pos: [-2.95, 0, 5.0], rotY: Math.PI, label: "西二席" }
];
const PEER_TABLE_DISH_X = [-0.56, -0.28, 0, 0.28, 0.56];

class TemplePeerTablesMixin {
  initPeerTables() {
    this.peerTablesGroup = new THREE.Group();
    this.peerTablesGroup.name = "peerTablesGroup";
    this.peerTables = new Map(); // peerId -> { slotIndex, tableGroup, dishesGroup, signMesh, data }
    this.peerTableSlots = PEER_TABLE_SLOTS.map(slot => ({
      ...slot,
      occupiedBy: null,
      tableMeshGroup: null,
      dishesGroup: null,
      signCanvas: null,
      signTexture: null,
      signMesh: null
    }));

    const tableMat = new THREE.MeshStandardMaterial({ color: 0x481812, roughness: 0.35, metalness: 0.1 });
    const skirtMat = new THREE.MeshStandardMaterial({ color: 0x891c1c, roughness: 0.5 });
    const legGeo = new THREE.BoxGeometry(0.12, 1.05, 0.12);

    this.peerTableSlots.forEach((slot, idx) => {
      const g = new THREE.Group();
      g.position.set(...slot.pos);
      g.rotation.y = slot.rotY;
      g.name = `peer-table-slot-${idx}`;

      // 1. 供桌本體（桌面長 1.5m、寬 0.6m、高 1.1m）
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.6), tableMat);
      top.position.y = 1.05;
      top.castShadow = true;
      top.receiveShadow = true;
      top.userData = { type: "peerAltarTable", slotIndex: idx };
      this.interactiveObjects.push(top);
      g.add(top);

      const skirt = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.65, 0.55), skirtMat);
      skirt.position.y = 0.65;
      g.add(skirt);

      [[-0.66, -0.22], [0.66, -0.22], [-0.66, 0.22], [0.66, 0.22]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(legGeo, tableMat);
        leg.position.set(lx, 0.525, lz);
        g.add(leg);
      });

      // 2. 供品子群組
      const dishesGroup = new THREE.Group();
      dishesGroup.position.set(0, 1.12, 0);
      dishesGroup.userData.noCollision = true;
      g.add(dishesGroup);
      slot.dishesGroup = dishesGroup;

      // 3. 木質水牌（展示同行的角色稱呼）
      const canvas = document.createElement("canvas");
      canvas.width = 384;
      canvas.height = 128;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.NoColorSpace;
      const signMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.28), signMat);
      signMesh.position.set(0, 1.35, 0.31);
      signMesh.userData.noCollision = true;   // 薄板不必擋路
      g.add(signMesh);

      slot.tableMeshGroup = g;
      slot.signCanvas = canvas;
      slot.signTexture = tex;
      slot.signMesh = signMesh;

      this.renderPeerTableSign(idx, null);
      this.peerTablesGroup.add(g);
    });

    this.scene.add(this.peerTablesGroup);
  }

  // 繪製水牌文字
  renderPeerTableSign(slotIndex, data) {
    const slot = this.peerTableSlots[slotIndex];
    if (!slot || !slot.signCanvas) return;
    const ctx = slot.signCanvas.getContext("2d");
    ctx.clearRect(0, 0, 384, 128);

    // 仿古朱紅木牌底色
    ctx.fillStyle = data ? "#521414" : "#241818";
    ctx.fillRect(4, 4, 376, 120);
    ctx.lineWidth = 4;
    ctx.strokeStyle = data ? "#f59e0b" : "#554444";
    ctx.strokeRect(8, 8, 368, 112);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (!data) {
      ctx.fillStyle = "#888888";
      ctx.font = "bold 28px sans-serif";
      ctx.fillText(`🏮 ${slot.label} • 虛位以待`, 192, 64);
    } else {
      ctx.fillStyle = "#fef08a";
      ctx.font = "bold 28px sans-serif";
      const name = data.name || "同行善信";
      ctx.fillText(`🏮 善信【${name}】${data.presented ? "已敬獻" : "布置中"}`, 192, 42);

      ctx.fillStyle = "#ffffff";
      ctx.font = "22px sans-serif";
      const count = peerTableDishes(data).filter(Boolean).length;
      ctx.fillText(count ? `桌上供品 ${count} 盤` : "尚未擺供", 192, 86);
    }

    slot.signTexture.needsUpdate = true;
  }

  // 同行更新供桌
  updatePeerOfferingTable(peerId, data) {
    if (!peerId || !data) return;
    let entry = this.peerTables.get(peerId);

    // 若未分配席位，挑選第一個空閒席位
    if (!entry) {
      const freeSlotIndex = this.peerTableSlots.findIndex(s => !s.occupiedBy);
      if (freeSlotIndex === -1) return; // 席位已滿
      this.peerTableSlots[freeSlotIndex].occupiedBy = peerId;
      entry = { slotIndex: freeSlotIndex, data };
      this.peerTables.set(peerId, entry);
    } else {
      entry.data = data;
    }

    const slot = this.peerTableSlots[entry.slotIndex];
    this.renderPeerTableSign(entry.slotIndex, data);

    // 清空舊供品並重新擺放
    const dg = slot.dishesGroup;
    while (dg.children.length > 0) {
      const child = dg.children[0];
      dg.remove(child);
      child.traverse?.(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
      });
    }

    peerTableDishes(data).forEach((type, i) => {
      if (!type || typeof buildOfferingDish !== "function") return;
      const dishGroup = buildOfferingDish(type);
      dishGroup.scale.setScalar(0.8); // 稍微縮小以容納於同行供席
      dishGroup.position.set(PEER_TABLE_DISH_X[i], 0, 0);
      dishGroup.traverse(o => { o.userData.noCollision = true; });
      dg.add(dishGroup);
    });
  }

  // 同行離線清理
  removePeerOfferingTable(peerId) {
    const entry = this.peerTables.get(peerId);
    if (!entry) return;
    const slot = this.peerTableSlots[entry.slotIndex];
    if (slot) {
      slot.occupiedBy = null;
      const dg = slot.dishesGroup;
      while (dg.children.length > 0) {
        const child = dg.children[0];
        dg.remove(child);
        child.traverse?.(o => {
          if (o.geometry) o.geometry.dispose();
          if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
        });
      }
      this.renderPeerTableSign(entry.slotIndex, null);
    }
    this.peerTables.delete(peerId);
  }

  // 單機模式（GitHub Pages 等沒有 server.js 的空間）：沒有人會入座，四張空桌與水牌全部收起，
  // 不擋路、不能點選；若碰撞已整理過就重整一次，免得留下看不見的障礙。
  disablePeerTables() {
    if (!this.peerTablesGroup || this.peerTablesDisabled) return;
    this.peerTablesDisabled = true;
    this.peerTablesGroup.visible = false;
    for (let i = this.interactiveObjects.length - 1; i >= 0; i--) {
      if (this.interactiveObjects[i].userData?.type === "peerAltarTable") this.interactiveObjects.splice(i, 1);
    }
    if (this.collisionBoxes) this.buildCollisionMap?.();
  }
}

// 收到的供品清單來自網路：最多五盤，只接受背包裡有定義的供品，其餘當空盤
function peerTableDishes(data) {
  const list = Array.isArray(data?.slots) ? data.slots.slice(0, 5) : [];
  const valid = id => typeof id === "string" && typeof BAG_ITEMS !== "undefined" && Object.hasOwn(BAG_ITEMS, id) && !["incense", "paper"].includes(id) && (typeof OFFERING_MODEL_TYPES === "undefined" || OFFERING_MODEL_TYPES.includes(id));
  return Array.from({ length: 5 }, (_, i) => valid(list[i]) ? list[i] : null);
}

installTempleMixin(TemplePeerTablesMixin);

