// avatar/rain-gear.js - 雨傘與雨衣：下雨時依換裝設定出現，自己與同行共用。
// 天氣用看的人自己場景裡的天氣（依時辰時各裝置一致），所以不另外同步；款式跟著造型設定（config）傳給同行。
// 雨傘：在戶外、雙手有空時左手撐開（提籃在右手可以同時拿）；端盤、持香、跪拜、打坐或走進屋簷下就收起。
// 雨衣：下雨時一直穿著，含兜帽與袖套。

const RAIN_UMBRELLA_COLORS = { red: [0xb3261e, 0xe8b34a], green: [0x2f7d5b, 0xe6d9a2], plain: [0xf1ead8, 0xb5402f] };
const RAIN_COAT_COLORS = { yellow: [0xf2c12e, 0.95], clear: [0xdcecf5, 0.42], blue: [0x2f6fb5, 0.95] };
const RAIN_UMBRELLA_ACTIONS = ["idle", "walk", "bow"];

function templeIsRaining() {
  return ["rain", "storm"].includes(window.temple3d?.currentWeather);
}

// 油紙傘：原點在手握處，傘柄往上，傘面在頭頂上方
function createRainUmbrella(style) {
  const [canopyColor, trimColor] = RAIN_UMBRELLA_COLORS[style] || RAIN_UMBRELLA_COLORS.red;
  const group = new THREE.Group(); group.name = `umbrella-${style}`; group.userData.noCollision = true;
  const bamboo = new THREE.MeshStandardMaterial({ color: 0x9a7444, roughness: 0.7 });
  const paper = new THREE.MeshStandardMaterial({ color: canopyColor, roughness: 0.65, side: THREE.DoubleSide });
  const trim = new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.5 });
  const add = (geo, mat, y) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; m.castShadow = true; group.add(m); return m; };
  const top = 1.08, rim = top - 0.17, R = 0.5;                                               // 傘頂高度、傘緣高度、半徑
  add(new THREE.CylinderGeometry(0.012, 0.012, top, 6), bamboo, top / 2);                   // 傘柄
  add(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8), bamboo, 0.02);                        // 握把
  add(new THREE.ConeGeometry(R, top - rim, 16, 1, true), paper, (top + rim) / 2);           // 傘面
  add(new THREE.TorusGeometry(R, 0.012, 4, 32), trim, rim).rotation.x = Math.PI / 2;        // 傘緣
  add(new THREE.TorusGeometry(0.22, 0.008, 4, 24), trim, top - 0.1).rotation.x = Math.PI / 2;   // 傘面圈紋
  add(new THREE.SphereGeometry(0.025, 8, 6), trim, top + 0.01);                               // 傘頂
  // 傘骨：從傘頂沿著傘面內側斜到傘緣，用方向向量擺正
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2, from = new THREE.Vector3(0, top - 0.012, 0), to = new THREE.Vector3(Math.cos(a) * R * 0.97, rim - 0.008, Math.sin(a) * R * 0.97);
    const dir = to.clone().sub(from), rib = add(new THREE.CylinderGeometry(0.005, 0.005, dir.length(), 4), bamboo, 0);
    rib.position.copy(from).addScaledVector(dir, 0.5);
    rib.quaternion.setFromUnitVectors(up, dir.normalize());
  }
  return group;
}

// 雨衣：罩在袍子外的斗篷、兜帽（跟著頭動）與兩隻袖套（跟著手臂動）
function createRainCoat(style, limbs, root) {
  const [color, opacity] = RAIN_COAT_COLORS[style] || RAIN_COAT_COLORS.yellow;
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.05, transparent: opacity < 1, opacity, side: THREE.DoubleSide, depthWrite: opacity >= 1 });
  const parts = [];
  const put = (parent, geo, x, y, z, name) => {
    if (!parent) return;
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.name = name; m.castShadow = opacity >= 1; m.userData.noCollision = true;
    parent.add(m); parts.push(m);
  };
  put(root, new THREE.CylinderGeometry(0.245, 0.37, 0.64, 18, 1, true), 0, 0.5, 0, "raincoat-body");
  put(limbs.head, new THREE.SphereGeometry(0.27, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.56), 0, 0.02, -0.02, "raincoat-hood");
  const sleeve = () => { const g = new THREE.CylinderGeometry(0.078, 0.085, 0.34, 10, 1, true); g.translate(0, -0.15, 0); return g; };
  put(limbs.armL, sleeve(), 0, 0, 0, "raincoat-sleeve");
  put(limbs.armR, sleeve(), 0, 0, 0, "raincoat-sleeve");
  return parts;
}

function disposeRainGear(owner) {
  const gear = owner.rainGear; if (!gear) return;
  const geometries = new Set(), materials = new Set();
  [gear.umbrella, ...(gear.coat || [])].forEach(obj => {
    if (!obj) return;
    obj.removeFromParent();
    obj.traverse(o => { if (o.geometry) geometries.add(o.geometry); if (o.material) materials.add(o.material); });
  });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
  owner.rainGear = null; owner.rainPoseActive = false;
}

// 每幀：依天氣、位置、動作與雙手狀況決定雨傘與雨衣；在參拜道具之後執行
function animateRainGearFor(owner, limbs, root, action, config, time, reduced = false) {
  if (!limbs?.armL || !root) return;
  const look = normalizeLook(config || {}), key = `${look.umbrella}|${look.raincoat}`;
  if (owner.rainGear && owner.rainGear.key !== key) disposeRainGear(owner);
  const raining = templeIsRaining();
  if (!owner.rainGear) {
    if (!raining) { owner.rainPoseActive = false; return; }   // 沒下過雨就不建模型
    owner.rainGear = { key, umbrella: null, coat: null };
  }
  const gear = owner.rainGear;

  const coatOn = raining && look.raincoat !== "none";
  if (coatOn && !gear.coat) gear.coat = createRainCoat(look.raincoat, limbs, root);
  gear.coat?.forEach(m => { m.visible = coatOn; });

  const sheltered = typeof templeSheltered === "function" && templeSheltered(root.position.x, root.position.z);
  const handsBusy = ["tray", "incense"].some(k => owner.ritualProps?.[k]?.visible);
  const open = raining && !sheltered && look.umbrella !== "none" && RAIN_UMBRELLA_ACTIONS.includes(action) && !handsBusy;
  if (open && !gear.umbrella) { gear.umbrella = createRainUmbrella(look.umbrella); root.add(gear.umbrella); }
  if (gear.umbrella) gear.umbrella.visible = open;
  owner.rainPoseActive = open;
  // 頭上的名牌在撐傘時往上移，不被傘面擋住
  const label = root.children.find(o => o.isSprite);
  if (label) { label.userData.baseY ??= label.position.y; label.position.y = label.userData.baseY + (open ? 0.32 : 0); }
  if (!open) return;

  // 左手往前舉起握傘，傘面略往頭頂後方傾，走路時輕輕晃
  const sway = reduced ? 0 : Math.sin(time * (action === "walk" ? 8 : 1.6)) * (action === "walk" ? 0.03 : 0.012);
  limbs.armL.rotation.set(-0.95, 0, -0.22);
  gear.umbrella.position.set(-0.24, 0.5, 0.27);
  gear.umbrella.rotation.set(-0.3 + sway, 0, -0.2 + sway * 0.5);
}

class AvatarRainGearMixin {
  animateRainGear(time) {
    animateRainGearFor(this, this.limbs, this.playerGroup, this.currentAction, this.config, time, !!window.templeMotion?.reduced);
  }
}
installAvatarMixin(AvatarRainGearMixin);
