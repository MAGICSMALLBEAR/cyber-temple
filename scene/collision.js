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
    (this.prayerMats || []).forEach(mat => this.walkSurfaces.push({
      minX: mat.position.x - 0.44, maxX: mat.position.x + 0.44,
      minZ: mat.position.z - 0.525, maxZ: mat.position.z + 0.525, y: 0.15
    }));
    if (this.pondWater && this.pondBridgeDeck) {
      const water = new THREE.Box3().setFromObject(this.pondWater);
      const deck = new THREE.Box3().setFromObject(this.pondBridgeDeck);
      const name = "pondWater";
      if (deck.min.z > water.min.z) boxes.push({ minX: water.min.x, maxX: water.max.x, minZ: water.min.z, maxZ: deck.min.z, name });
      if (deck.max.z < water.max.z) boxes.push({ minX: water.min.x, maxX: water.max.x, minZ: deck.max.z, maxZ: water.max.z, name });
      this.walkSurfaces.push({ minX: deck.min.x, maxX: deck.max.x, minZ: deck.min.z, maxZ: deck.max.z, y: deck.max.y });
    }

    this.collisionBoxes = boxes;
    // 一公尺格子的碰撞索引，尋路時不用對每個取樣點掃過整座神殿。
    this.collisionIndex = new Map();
    for (const b of boxes) {
      for (let x = Math.floor(b.minX - 0.5); x <= Math.floor(b.maxX + 0.5); x++) {
        for (let z = Math.floor(b.minZ - 0.5); z <= Math.floor(b.maxZ + 0.5); z++) {
          const key = `${x},${z}`;
          if (!this.collisionIndex.has(key)) this.collisionIndex.set(key, []);
          this.collisionIndex.get(key).push(b);
        }
      }
    }
    this.collisionIndexBoxes = boxes;
    if (this.avatar) {
      this.avatar.isBlockedAt = (x, z) => this.isBlockedAt(x, z);
      this.avatar.walkHeightAt = (x, z) => this.walkHeightAt(x, z);
    }
    return boxes;
  }

  // 導引專用路徑：四向格網避開實體，再合併能直走的路段。
  findWalkRoute(from, dest) {
    const spacing = 0.25;
    const inBounds = (x, z) => z >= -2.8 && z <= 41.5 && Math.abs(x) <= (z > 5.8 ? 17.5 : 3.8);
    if (![...from, ...dest].every(Number.isFinite) || !inBounds(...dest) || this.isBlockedAt(...dest, AVATAR_RADIUS + 0.08)) return [];
    const clearLine = (a, b) => {
      const count = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.08));
      for (let i = 1; i <= count; i++) {
        const x = a[0] + (b[0] - a[0]) * i / count, z = a[1] + (b[1] - a[1]) * i / count;
        if (!inBounds(x, z) || this.isBlockedAt(x, z, AVATAR_RADIUS + 0.08)) return false;
      }
      return true;
    };
    if (clearLine(from, dest)) return [dest];
    const key = (x, z) => `${x},${z}`;
    const start = [Math.round(from[0] / spacing), Math.round(from[1] / spacing)];
    const heuristic = point => (Math.abs(point[0] - dest[0]) + Math.abs(point[1] - dest[1])) / spacing;
    const nodes = [{ cell: start, point: from, prev: -1, cost: 0 }];
    const best = new Map([[key(...start), 0]]), closed = new Set(), blockedCells = new Set();
    // A* 優先走向目的地，避免為一個遠端地標掃過整座廟埕。
    const heap = [];
    const less = (a, b) => a.score < b.score || (a.score === b.score && a.h < b.h);
    const push = index => {
      const n = nodes[index], h = heuristic(n.point), item = { index, h, score: n.cost + h };
      heap.push(item); let i = heap.length - 1;
      while (i > 0) { const parent = (i - 1) >> 1; if (!less(item, heap[parent])) break; heap[i] = heap[parent]; i = parent; }
      heap[i] = item;
    };
    const pop = () => {
      const root = heap[0], last = heap.pop();
      if (heap.length) {
        let i = 0;
        while (i * 2 + 1 < heap.length) {
          let child = i * 2 + 1;
          if (child + 1 < heap.length && less(heap[child + 1], heap[child])) child++;
          if (!less(heap[child], last)) break;
          heap[i] = heap[child]; i = child;
        }
        heap[i] = last;
      }
      return root.index;
    };
    push(0);
    let end = -1;
    while (heap.length) {
      const head = pop();
      const n = nodes[head];
      const currentKey = key(...n.cell);
      if (closed.has(currentKey) || n.cost !== best.get(currentKey)) continue;
      closed.add(currentKey);
      if (Math.hypot(n.point[0] - dest[0], n.point[1] - dest[1]) < 0.4 && clearLine(n.point, dest)) { end = head; break; }
      for (const [dx, dz] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
        const cell = [n.cell[0] + dx, n.cell[1] + dz], k = key(...cell);
        const cost = n.cost + 1;
        if (closed.has(k) || blockedCells.has(k) || cost >= (best.get(k) ?? Infinity)) continue;
        const point = cell.map(v => v * spacing);
        if (!inBounds(...point) || this.isBlockedAt(...point, AVATAR_RADIUS + 0.08)) { blockedCells.add(k); continue; }
        if (!clearLine(n.point, point)) continue;
        best.set(k, cost);
        nodes.push({ cell, point, prev: head, cost }); push(nodes.length - 1);
      }
    }
    if (end < 0) return [];
    const raw = [dest];
    for (let i = end; i >= 0; i = nodes[i].prev) raw.push(nodes[i].point);
    raw.reverse();
    const route = [];
    for (let i = 0; i < raw.length - 1;) {
      let next = raw.length - 1;
      while (next > i + 1 && !clearLine(raw[i], raw[next])) next--;
      route.push(raw[next]);
      i = next;
    }
    return route;
  }

  // 站在橋面等可走的高台上時回傳台面高度，其餘為地面 0
  walkHeightAt(x, z) {
    for (const s of this.walkSurfaces || []) {
      if (x >= s.minX && x <= s.maxX && z >= s.minZ && z <= s.maxZ) return s.y;
    }
    return 0;
  }

  // 以角色為圓（半徑 AVATAR_RADIUS）檢查 (x, z) 是否會撞到任一碰撞方塊
  isBlockedAt(x, z, r = AVATAR_RADIUS) {
    const candidates = this.collisionIndex && this.collisionIndexBoxes === this.collisionBoxes && r <= 0.5
      ? this.collisionIndex.get(`${Math.floor(x)},${Math.floor(z)}`) || [] : this.collisionBoxes || [];
    for (const b of candidates) {
      const cx = Math.max(b.minX, Math.min(x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
      const dx = x - cx, dz = z - cz;
      if (dx * dx + dz * dz < r * r) return true;
    }
    return false;
  }
}

installTempleMixin(TempleCollisionMixin);
