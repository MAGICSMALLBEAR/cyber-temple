// 參拜道具為外觀，不另存一份庫存；自己與同行共用模型、姿勢與動作時序。
const RITUAL_MOTION_SECONDS = { placeOffering: 1.35, collectOffering: 1.25, presentOffering: 2.4, incenseOffering: 2.8 };

function normalizeRitualState(value) {
  const carry = ["basket", "tray"].includes(value?.carry) ? value.carry : "";
  const m = value?.motion, now = Date.now();
  const motion = m && Object.hasOwn(RITUAL_MOTION_SECONDS, m.name) && Number.isFinite(m.startedAt) && m.startedAt <= now + 1000 && now - m.startedAt < RITUAL_MOTION_SECONDS[m.name] * 1000
    ? { name: m.name, startedAt: Math.min(m.startedAt, now) } : null;
  return { carry, motion };
}

function createRitualProp(kind) {
  const group = new THREE.Group(); group.name = `ritual-${kind}`; group.userData.noCollision = true;
  const wood = new THREE.MeshStandardMaterial({ color: 0x9b6536, roughness: 0.85 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xdbb65c, metalness: 0.65, roughness: 0.35 });
  const red = new THREE.MeshStandardMaterial({ color: 0x971e24, roughness: 0.45 });
  const add = (geometry, material, at) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...at); mesh.castShadow = true; group.add(mesh); return mesh; };
  if (kind === "incense") {
    for (let i = -1; i <= 1; i++) {
      add(new THREE.CylinderGeometry(0.006, 0.006, 0.4, 6), wood, [i * 0.025, 0.16, 0]);
      add(new THREE.SphereGeometry(0.009, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff6a34 }), [i * 0.025, 0.365, 0]);
    }
    return group;
  }
  if (kind === "basket") {
    add(new THREE.BoxGeometry(0.34, 0.2, 0.24), wood, [0, 0, 0]);
    for (const y of [-0.07, 0, 0.07]) for (const z of [-0.125, 0.125]) add(new THREE.BoxGeometry(0.35, 0.012, 0.01), gold, [0, y, z]);
    for (let i = -3; i <= 3; i++) for (const z of [-0.13, 0.13]) add(new THREE.BoxGeometry(0.012, 0.2, 0.01), wood, [i * 0.045, 0, z]);
    const handle = add(new THREE.TorusGeometry(0.16, 0.016, 6, 20, Math.PI), wood, [0, 0.1, 0]);
    handle.rotation.z = 0;
  } else {
    add(new THREE.BoxGeometry(0.6, 0.035, 0.32), red, [0, 0, 0]);
    for (const z of [-0.155, 0.155]) add(new THREE.BoxGeometry(0.6, 0.035, 0.018), gold, [0, 0.026, z]);
    for (const x of [-0.29, 0.29]) add(new THREE.BoxGeometry(0.018, 0.035, 0.32), gold, [x, 0.026, 0]);
  }
  // 小型果品作為提籃／端盤的視覺提示；實際擺盤仍由供桌模型呈現。
  for (let i = -1; i <= 1; i++) {
    const mat = new THREE.MeshStandardMaterial({ color: i === 0 ? 0xf5a33d : 0xd94041, roughness: 0.4 });
    add(new THREE.SphereGeometry(kind === "basket" ? 0.06 : 0.065, 10, 8), mat, [i * (kind === "basket" ? 0.085 : 0.14), kind === "basket" ? 0.1 : 0.08, 0]);
  }
  return group;
}

function disposeRitualProps(owner) {
  const geometries = new Set(), materials = new Set();
  Object.values(owner.ritualProps || {}).forEach(prop => {
    prop.removeFromParent(); prop.traverse(o => { if (o.geometry) geometries.add(o.geometry); if (o.material) materials.add(o.material); });
  });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); owner.ritualProps = {};
}

function resetRitualPoseFor(owner, limbs) {
  if (!owner.ritualPoseActive) return;
  ["armL", "armR", "torso", "head"].forEach(key => limbs[key]?.rotation.set(0, 0, 0));
}

function animateRitualPropsFor(owner, limbs, root, action, time, reduced = false) {
  let motion = owner.ritualMotion;
  if (motion && (Date.now() - motion.startedAt >= RITUAL_MOTION_SECONDS[motion.name] * 1000 || action === "walk")) { owner.ritualMotion = null; motion = null; }
  // 跪拜、打坐等動作暫時放下道具；恢復站立或行走後再顯示。
  const allowed = ["idle", "walk", "bow"].includes(action);
  const kind = allowed ? motion?.name === "incenseOffering" ? "incense" : motion ? "tray" : owner.ritualCarry : "";
  owner.ritualProps ||= {};
  Object.values(owner.ritualProps).forEach(prop => { prop.visible = false; });
  if (limbs.heldObject) limbs.heldObject.visible = !kind;
  owner.ritualPoseActive = !!kind;
  if (!kind || !limbs.armL || !limbs.armR) return;
  let prop = owner.ritualProps[kind];
  if (!prop) { prop = createRitualProp(kind); owner.ritualProps[kind] = prop; }
  if (prop.parent !== root) root.add(prop);
  prop.visible = true; prop.rotation.set(0, 0, 0);
  const bob = reduced ? 0 : Math.sin(time * (action === "walk" ? 8 : 2)) * 0.012;
  if (kind === "basket") {
    prop.position.set(0.34, 0.13 + bob, 0.17); prop.rotation.z = reduced ? 0 : Math.sin(time * 4) * 0.035;
    limbs.armR.rotation.set(-0.35, 0, -0.12);
  } else {
    prop.position.set(0, 0.57 + bob, 0.39);
    limbs.armL.rotation.set(-1.1, 0.25, 0); limbs.armR.rotation.set(-1.1, -0.25, 0);
  }
  if (!motion) return;
  const phase = Math.max(0, Math.min(1, (Date.now() - motion.startedAt) / (RITUAL_MOTION_SECONDS[motion.name] * 1000)));
  const reach = reduced ? 0 : Math.sin(phase * Math.PI);
  if (kind === "incense") {
    const bow = reduced ? 0.08 : Math.pow(Math.sin(phase * Math.PI * 3), 2) * 0.23;
    limbs.torso.rotation.x = bow; limbs.head.rotation.x = bow * 0.5;
    limbs.armL.rotation.set(-0.85, 0.15, 0.72); limbs.armR.rotation.set(-0.85, -0.15, -0.72);
    prop.position.set(0, 0.6 - bow * 0.1, 0.22 + bow * 0.12);
  } else {
    prop.position.z += reach * 0.13;
    prop.position.y += reach * (motion.name === "collectOffering" ? -0.05 : 0.12);
    limbs.torso.rotation.x = reach * 0.18; limbs.head.rotation.x = reach * 0.12;
    limbs.armL.rotation.x -= reach * 0.2; limbs.armR.rotation.x -= reach * 0.2;
  }
}

class AvatarRitualPropsMixin {
  setRitualCarry(mode = "") {
    mode = ["basket", "tray"].includes(mode) ? mode : "";
    if (this.ritualCarry === mode) return;
    this.ritualCarry = mode; this.broadcastMyState?.(true);
  }
  playRitualMotion(name) {
    if (!Object.hasOwn(RITUAL_MOTION_SECONDS, name)) return false;
    this.triggerAction("idle");
    this.ritualMotion = { name, startedAt: Date.now() }; this.broadcastMyState?.(true); return true;
  }
  resetRitualPose() { resetRitualPoseFor(this, this.limbs); }
  animateRitualProps(time) {
    const before = this.ritualMotion;
    animateRitualPropsFor(this, this.limbs, this.playerGroup, this.currentAction, time, !!window.templeMotion?.reduced);
    if (before && !this.ritualMotion) this.broadcastMyState?.(true);
  }
}
installAvatarMixin(AvatarRitualPropsMixin);
