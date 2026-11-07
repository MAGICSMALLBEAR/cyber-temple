// 八位神尊的獨立程序模型；只保留當前一尊，切換時釋放幾何與材質。
function disposeTempleObject(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  root.traverse(o => {
    if (o.geometry) geometries.add(o.geometry);
    for (const m of (Array.isArray(o.material) ? o.material : o.material ? [o.material] : [])) {
      materials.add(m); if (m.map) textures.add(m.map);
    }
  });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
  root.removeFromParent();
}

function createTempleDeity(id) {
  const group = new THREE.Group(); group.name = `deity-${id}`; group.userData.deity = id;
  const mat = (color, metalness = 0.15) => new THREE.MeshStandardMaterial({ color, metalness, roughness: 0.48 });
  const gold = mat(0xe9bd58, 0.7), dark = mat(0x28252a), ivory = mat(0xf4e4ba), skin = mat(0xe6b58b);
  const mesh = (name, geo, material, pos, scale) => {
    const m = new THREE.Mesh(geo, material); m.name = name; m.position.set(...pos);
    if (scale) m.scale.set(...scale); m.castShadow = true; group.add(m); return m;
  };
  const ball = (name, material, pos, scale) => mesh(name, new THREE.SphereGeometry(1, 16, 12), material, pos, scale);
  const box = (name, material, pos, scale) => mesh(name, new THREE.BoxGeometry(...scale), material, pos);
  const rod = (name, material, from, to, radius = 0.035) => {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), d = b.clone().sub(a);
    const m = mesh(name, new THREE.CylinderGeometry(radius, radius, d.length(), 10), material, a.add(b).multiplyScalar(0.5).toArray());
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m;
  };
  const robe = (name, material, profile, z = 0) => mesh(name, new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 24), material, [0, 0, z]);
  const trim = (radius, y, color = gold) => { const m = mesh("robe-trim", new THREE.TorusGeometry(radius, 0.025, 6, 32), color, [0, y, 0]); m.rotation.x = Math.PI / 2; return m; };
  const face = (material, y, width = 0.29, height = 0.35) => {
    const head = ball("face", material, [0, y, 0.08], [width, height, 0.26]);
    for (const x of [-0.105, 0.105]) {
      ball("eye", dark, [x, y + 0.015, 0.321], [0.026, 0.018, 0.012]);
      rod("eyebrow", dark, [x - 0.045, y + 0.09, 0.315], [x + 0.045, y + 0.09, 0.315], 0.012);
      ball("ear", material, [Math.sign(x) * width, y - 0.015, 0.065], [0.055, 0.1, 0.06]);
    }
    ball("nose", material, [0, y - 0.045, 0.34], [0.042, 0.07, 0.05]);
    rod("smile", mat(0x9c5142), [-0.06, y - 0.15, 0.305], [0.06, y - 0.15, 0.305], 0.012);
    return head;
  };
  const beard = (color, y, length, width = 0.22) => {
    const m = mesh("flowing-beard", new THREE.ConeGeometry(width, length, 14), color, [0, y, 0.35], [1, 1, 0.45]); m.rotation.x = Math.PI;
    for (const x of [-0.08, 0.08]) rod("moustache", color, [0, y + length * 0.42, 0.37], [x, y + length * 0.31, 0.4], 0.035);
  };
  const seat = (color, width = 0.72) => {
    mesh("throne-plinth", new THREE.CylinderGeometry(width, width + 0.05, 0.16, 16), color, [0, 0.08, 0]);
    box("throne-back", color, [0, 0.65, -0.32], [width * 1.7, 1.15, 0.16]);
  };
  const hands = (y, span = 0.42, material = skin) => {
    ball("left-hand", material, [-span, y, 0.4], [0.11, 0.14, 0.1]);
    ball("right-hand", material, [span, y, 0.4], [0.11, 0.14, 0.1]);
  };
  const yuanbao = (pos, size = 0.28) => {
    ball("gold-ingot", gold, pos, [size, size * 0.4, size * 0.65]);
    for (const s of [-1, 1]) ball("ingot-tip", gold, [pos[0] + s * size * 0.8, pos[1] + size * 0.18, pos[2]], [size * 0.27, size * 0.38, size * 0.6]);
  };
  let body, head, halo = 0xffdf83;
  if (id === "mazu") {
    // 媽祖：寬袖鳳袍、端坐、九旒冕與雙鳳冠翼。
    const red = mat(0x9d2935), crown = mat(0x5b1927, 0.3); seat(gold, 0.8);
    body = robe("phoenix-robe", red, [[0.7, 0.18], [0.73, 0.45], [0.56, 0.95], [0.48, 1.3], [0.32, 1.52]]);
    for (const s of [-1, 1]) {
      ball("wide-royal-sleeve", red, [s * 0.49, 1.0, 0.15], [0.28, 0.43, 0.38]);
      rod("phoenix-wing", gold, [s * 0.27, 2.18, 0], [s * 0.58, 2.32, -0.02], 0.05);
      for (let i = 0; i < 3; i++) ball("phoenix-feather", gold, [s * (0.4 + i * 0.07), 2.25 + i * 0.06, 0], [0.035, 0.13, 0.025]);
    }
    head = face(skin, 1.83); hands(0.99);
    box("royal-crown", crown, [0, 2.19, 0.04], [0.58, 0.22, 0.47]); box("nine-tassel-board", gold, [0, 2.34, 0.08], [0.76, 0.07, 0.65]);
    for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) ball("crown-pearl", ivory, [(i - 4) * 0.077, 2.27 - j * 0.075, 0.4], [0.021, 0.024, 0.021]);
    box("royal-stole", gold, [0, 1.02, 0.56], [0.16, 0.73, 0.035]); trim(0.73, 0.26);
  } else if (id === "wenchang") {
    const blue = mat(0x303f76); seat(gold, 0.65);
    body = robe("scholar-long-robe", blue, [[0.49, 0.18], [0.52, 0.5], [0.38, 1.1], [0.4, 1.42], [0.25, 1.61]]);
    head = face(skin, 1.93, 0.255, 0.32); hands(1.15, 0.37); beard(dark, 1.45, 0.5, 0.14);
    box("scholar-hat", dark, [0, 2.26, 0.03], [0.51, 0.28, 0.41]);
    for (const s of [-1, 1]) box("official-hat-wing", dark, [s * 0.51, 2.25, 0.02], [0.51, 0.075, 0.11]);
    for (const s of [-1, 1]) ball("scholar-sleeve", blue, [s * 0.36, 1.13, 0.12], [0.18, 0.35, 0.25]);
    rod("jade-brush", dark, [0.4, 0.96, 0.51], [0.52, 1.76, 0.46], 0.024);
    mesh("brush-tip", new THREE.ConeGeometry(0.045, 0.16, 10), ivory, [0.53, 1.84, 0.46]);
    box("book-of-wisdom", ivory, [-0.27, 1.18, 0.57], [0.38, 0.08, 0.27]); trim(0.52, 0.24);
  } else if (id === "caishen") {
    const red = mat(0x841b25); seat(gold, 0.88);
    body = robe("prosperity-broad-robe", red, [[0.79, 0.16], [0.8, 0.6], [0.63, 1.15], [0.5, 1.5], [0.28, 1.64]]);
    head = face(skin, 1.96, 0.32, 0.33); beard(dark, 1.48, 0.5);
    for (const s of [-1, 1]) ball("brocade-sleeve", red, [s * 0.57, 1.04, 0.2], [0.28, 0.4, 0.37]); hands(1.04, 0.37);
    box("wealth-crown", gold, [0, 2.28, 0], [0.68, 0.21, 0.45]);
    for (const x of [-0.22, 0, 0.22]) ball("crown-jewel", mat(0xc32a37), [x, 2.36, 0.25], [0.065, 0.1, 0.04]);
    yuanbao([0, 1.05, 0.68], 0.42); trim(0.815, 0.24); trim(0.62, 1.22);
    for (const s of [-1, 1]) mesh("coin-medallion", new THREE.TorusGeometry(0.12, 0.045, 6, 16), gold, [s * 0.42, 0.6, 0.66]);
  } else if (id === "yuelao") {
    const pink = mat(0x8f4761); seat(mat(0x684132), 0.68);
    body = robe("elder-rose-robe", pink, [[0.59, 0.15], [0.6, 0.4], [0.48, 0.9], [0.36, 1.29], [0.25, 1.46]]);
    head = face(skin, 1.78, 0.3, 0.34); beard(ivory, 1.2, 0.7); hands(0.97, 0.39);
    ball("elder-hair", ivory, [0, 1.95, -0.09], [0.34, 0.25, 0.23]); ball("hair-bun", ivory, [0, 2.18, -0.03], [0.15, 0.14, 0.13]);
    for (const s of [-1, 1]) ball("elder-sleeve", pink, [s * 0.4, 1.02, 0.1], [0.21, 0.32, 0.28]);
    const red = mat(0xe93256); ball("red-thread-ball", red, [0.36, 1.03, 0.53], [0.16, 0.16, 0.16]);
    const thread = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.38, 1.06, 0.54), new THREE.Vector3(-0.2, 0.67, 0.68), new THREE.Vector3(0.2, 0.72, 0.68), new THREE.Vector3(0.36, 1.03, 0.53)]);
    mesh("red-fate-thread", new THREE.TubeGeometry(thread, 24, 0.016, 6, false), red, [0, 0, 0]);
    box("marriage-register", ivory, [-0.37, 1.01, 0.57], [0.25, 0.2, 0.06]); halo = 0xff9fbb;
  } else if (id === "guanyin") {
    const white = mat(0xf5eee0), lotus = mat(0xe6a4ba); halo = 0xfff5dd;
    body = robe("white-flowing-gown", white, [[0.54, 0.21], [0.57, 0.5], [0.37, 1.1], [0.32, 1.55], [0.2, 1.7]]);
    head = face(skin, 2.0, 0.24, 0.32);
    // 披巾包覆頭後，臉部保持開放。
    ball("white-veil", white, [0, 2.0, -0.15], [0.35, 0.49, 0.2]);
    mesh("bodhisattva-crown", new THREE.ConeGeometry(0.19, 0.33, 8), gold, [0, 2.38, 0]);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const p = ball("lotus-petal", lotus, [Math.cos(a) * 0.49, 0.17, Math.sin(a) * 0.49], [0.15, 0.24, 0.12]); p.rotation.z = -Math.cos(a) * 0.6; p.rotation.x = Math.sin(a) * 0.6; }
    for (const s of [-1, 1]) ball("flowing-white-sleeve", white, [s * 0.33, 1.22, 0.1], [0.17, 0.42, 0.23]);
    ball("blessing-hand", skin, [-0.34, 1.57, 0.39], [0.08, 0.16, 0.07]); ball("vase-hand", skin, [0.31, 1.2, 0.39], [0.1, 0.11, 0.1]);
    mesh("purification-vase", new THREE.LatheGeometry([[0, 0], [0.1, 0.02], [0.12, 0.15], [0.04, 0.28], [0.04, 0.4], [0.07, 0.43]].map(p => new THREE.Vector2(...p)), 16), white, [0.32, 1.15, 0.5]);
    rod("willow-branch", mat(0x568d45), [0.32, 1.57, 0.5], [0.49, 2.04, 0.5], 0.012);
    for (let i = 0; i < 5; i++) ball("willow-leaf", mat(0x78a850), [0.37 + i * 0.03, 1.66 + i * 0.07, 0.5], [0.06, 0.025, 0.02]);
    ball("forehead-mark", mat(0xbe393a), [0, 2.14, 0.33], [0.025, 0.035, 0.015]);
  } else if (id === "guangong") {
    const green = mat(0x214f42), red = mat(0xa93930); seat(mat(0x443329), 0.8); halo = 0xffb567;
    body = robe("warrior-armour", green, [[0.64, 0.15], [0.69, 0.55], [0.45, 1.08], [0.54, 1.46], [0.29, 1.62]]);
    head = face(red, 1.97, 0.3, 0.37); beard(dark, 1.28, 0.9, 0.23); hands(1.13, 0.52, red);
    for (const s of [-1, 1]) { ball("gold-shoulder-armour", gold, [s * 0.48, 1.41, 0.02], [0.25, 0.2, 0.29]); ball("armoured-sleeve", green, [s * 0.5, 1.11, 0.06], [0.19, 0.31, 0.25]); }
    box("armour-belt", gold, [0, 0.87, 0.47], [0.77, 0.13, 0.1]);
    ball("green-warrior-headcloth", green, [0, 2.25, -0.02], [0.33, 0.18, 0.28]);
    rod("guandao-shaft", mat(0x514435, 0.5), [0.88, 0.05, 0.25], [0.88, 2.13, 0.25], 0.035);
    const blade = new THREE.Shape(); blade.moveTo(0, 0); blade.quadraticCurveTo(0.43, 0.12, 0.3, 0.63); blade.quadraticCurveTo(0.12, 0.35, 0, 0.26); blade.lineTo(0, 0);
    mesh("green-dragon-blade", new THREE.ExtrudeGeometry(blade, { depth: 0.04, bevelEnabled: false }), mat(0xc3d3cd, 0.9), [0.88, 2.08, 0.23]);
    for (let i = 0; i < 4; i++) box("armour-plate", gold, [0, 0.35 + i * 0.12, 0.64 - i * 0.035], [0.35, 0.055, 0.035]);
  } else if (id === "tudigong") {
    const ochre = mat(0x9d642e); seat(mat(0x60452b), 0.7);
    body = robe("earth-lord-round-robe", ochre, [[0.64, 0.15], [0.68, 0.5], [0.54, 1.01], [0.36, 1.32], [0.24, 1.45]]);
    head = face(skin, 1.73, 0.32, 0.32); beard(ivory, 1.13, 0.65, 0.24); hands(0.99, 0.44);
    ball("elder-official-cap", gold, [0, 2.02, 0], [0.35, 0.18, 0.29]); ball("cap-red-jewel", mat(0xbf3131), [0, 2.17, 0], [0.075, 0.08, 0.075]);
    for (const s of [-1, 1]) ball("earth-lord-sleeve", ochre, [s * 0.44, 0.99, 0.08], [0.22, 0.33, 0.29]);
    rod("dragon-walking-stick", mat(0x654026), [0.75, 0.08, 0.4], [0.75, 1.93, 0.4], 0.045);
    ball("dragon-cane-head", gold, [0.7, 1.93, 0.42], [0.14, 0.09, 0.08]); yuanbao([-0.39, 1.04, 0.56], 0.23); trim(0.67, 0.24);
  } else {
    // 乖乖：完整袋身與鋸齒封口，與人形神尊使用不同幾何。
    const green = mat(0x27a447); halo = 0x71f39a;
    body = box("snack-packet", green, [0, 1.03, 0], [1.12, 1.65, 0.48]);
    for (const y of [0.19, 1.87]) { box("packet-seal", gold, [0, y, 0], [1.2, 0.1, 0.5]); for (let i = 0; i < 11; i++) box("seal-ridge", green, [(i - 5) * 0.105, y, 0.27], [0.025, 0.13, 0.025]); }
    head = ball("packet-emblem", ivory, [0, 1.2, 0.255], [0.39, 0.4, 0.035]);
    const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext("2d"); ctx.fillStyle = "#fff3cf"; ctx.fillRect(0, 0, 256, 256); ctx.textAlign = "center"; ctx.fillStyle = "#198b3b"; ctx.font = "bold 76px sans-serif"; ctx.fillText("乖乖", 128, 116); ctx.font = "30px sans-serif"; ctx.fillText("綠燈常亮", 128, 180);
    mesh("packet-lettering", new THREE.PlaneGeometry(0.74, 0.74), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) }), [0, 1.18, 0.3]);
    mesh("green-lotus-base", new THREE.CylinderGeometry(0.7, 0.8, 0.17, 16), gold, [0, 0.08, 0]);
  }
  group.userData.halo = halo;
  return { group, body, head };
}

class TempleDeitiesMixin {
  buildDeityThrone() {
    this.throneGroup = new THREE.Group(); this.throneGroup.position.set(0, 1.8, -2.4);
    this.deityHalo = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.035, 8, 48), new THREE.MeshBasicMaterial({ color: 0xffdf83 }));
    this.deityHalo.position.set(0, 1.96, -0.38); this.throneGroup.add(this.deityHalo);
    this.scene.add(this.throneGroup); this.switchDeityStatue("mazu");
  }
  switchDeityStatue(id) {
    if (!this.throneGroup) return;
    const valid = ["mazu", "wenchang", "caishen", "yuelao", "guanyin", "guangong", "tudigong", "guaiguai"];
    if (!valid.includes(id)) id = "mazu";
    if (this.deityModel?.userData.deity === id) return;
    if (this.deityModel) disposeTempleObject(this.deityModel);
    const { group, body, head } = createTempleDeity(id);
    this.deityModel = group; this.deityStatue = body; this.deityHead = head;
    this.deityAccessories = group.children.filter(o => o !== body && o !== head);
    this.deityHalo.material.color.setHex(group.userData.halo); this.throneGroup.add(group);
    this.syncDeityModel?.();
  }
}
installTempleMixin(TempleDeitiesMixin);
