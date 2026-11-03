// scene/collision.js - 角色碰撞：場景建好後把擋路的實體整理成俯視的碰撞方塊，讓分身不會穿牆
// 只算「和角色身體高度重疊」的實體：地板、步道、膝蓋以下的台階走得過去，高掛的燈籠與屋簷不擋。
// 不算：看不見的點選感應區、粒子、文字、其他人的分身與萌寵、會移動的神轎（遶境要能鑽轎腳）。

const COLLISION_BODY_MIN_Y = 0.45;   // 低於膝蓋的台階、石階、池邊矮緣走得上去
const COLLISION_BODY_MAX_Y = 1.6;    // 高於頭頂的燈籠、屋簷、橫樑不擋
const AVATAR_RADIUS = 0.28;

class TempleCollisionMixin {
  buildCollisionMap() {
    const skip = new Set([this.palanquinGroup, this.weatherGroup, this.xrDolly].filter(Boolean));
    if (this.avatar) {
      skip.add(this.avatar.playerGroup);
      if (this.avatar.petGroup) skip.add(this.avatar.petGroup);
      if (this.avatar.peers) this.avatar.peers.forEach(p => p.group && skip.add(p.group));
      (this.avatar.npcs || []).forEach(n => n && n.group && skip.add(n.group));
    }
    const box = new THREE.Box3();
    const boxes = [];
    this.scene.updateMatrixWorld(true);
    this.scene.traverse(obj => {
      if (!obj.isMesh || obj.userData.noCollision) return;
      // 往上找：被略過的群組、隱藏的物件都不算
      for (let a = obj; a; a = a.parent) {
        if (skip.has(a) || a.visible === false || a.userData.noCollision) return;
      }
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      if (mats.every(m => !m || m.visible === false || (m.transparent && m.opacity < 0.05))) return;
      // 拱門、圓環的外框會把中間的開口也算成實心（例如財神洞窟入口），不列入
      if (obj.geometry && obj.geometry.type === "TorusGeometry") return;
      box.setFromObject(obj);
      if (box.isEmpty()) return;
      if (box.max.y < COLLISION_BODY_MIN_Y || box.min.y > COLLISION_BODY_MAX_Y) return;
      boxes.push({ minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z, name: obj.name || obj.geometry.type });
    });
    // 蓮花池：池子比膝蓋矮不會被當成障礙，另外把水面列為禁區，只留橋面那一條走道
    this.walkSurfaces = [];
    if (this.pondWater && this.pondBridgeDeck) {
      const water = new THREE.Box3().setFromObject(this.pondWater);
      const deck = new THREE.Box3().setFromObject(this.pondBridgeDeck);
      const name = "pondWater";
      if (deck.min.z > water.min.z) boxes.push({ minX: water.min.x, maxX: water.max.x, minZ: water.min.z, maxZ: deck.min.z, name });
      if (deck.max.z < water.max.z) boxes.push({ minX: water.min.x, maxX: water.max.x, minZ: deck.max.z, maxZ: water.max.z, name });
      this.walkSurfaces.push({ minX: deck.min.x, maxX: deck.max.x, minZ: deck.min.z, maxZ: deck.max.z, y: deck.max.y });
    }

    this.collisionBoxes = boxes;
    if (this.avatar) {
      this.avatar.isBlockedAt = (x, z) => this.isBlockedAt(x, z);
      this.avatar.walkHeightAt = (x, z) => this.walkHeightAt(x, z);
    }
    return boxes;
  }

  // 站在橋面等可走的高台上時回傳台面高度，其餘為地面 0
  walkHeightAt(x, z) {
    for (const s of this.walkSurfaces || []) {
      if (x >= s.minX && x <= s.maxX && z >= s.minZ && z <= s.maxZ) return s.y;
    }
    return 0;
  }

  // 以角色為圓（半徑 AVATAR_RADIUS）檢查 (x, z) 是否會撞到任一碰撞方塊
  isBlockedAt(x, z) {
    const r = AVATAR_RADIUS;
    for (const b of this.collisionBoxes || []) {
      const cx = Math.max(b.minX, Math.min(x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
      const dx = x - cx, dz = z - cz;
      if (dx * dx + dz * dz < r * r) return true;
    }
    return false;
  }
}

installTempleMixin(TempleCollisionMixin);
