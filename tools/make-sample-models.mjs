// tools/make-sample-models.mjs - 產生試驗用 .glb：驗證模型流程用，不是最終美術
// 用法：node tools/make-sample-models.mjs [專案根目錄] [輸出資料夾]
// 幾何與貼圖全由程式產生，不含外部素材。
import { pathToFileURL } from "url";
import path from "path";
import fs from "fs";
import zlib from "zlib";

const root = path.resolve(process.argv[2] || ".");
const outDir = path.resolve(process.argv[3] || path.join(root, "models"));
const THREE = await import(pathToFileURL(path.join(root, "node_modules/three/build/three.module.js")).href);

// ---------- PNG ----------
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const t = Buffer.from(type, "ascii"), len = Buffer.alloc(4), sum = Buffer.alloc(4);
  len.writeUInt32BE(data.length); sum.writeUInt32BE(crc(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, sum]);
}
function png(size, pixel) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const [r, g, b] = pixel(x / size, y / size), o = y * (size * 3 + 1) + 1 + x * 3;
    raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
// 可無縫平鋪的值雜訊
const hash = (x, y, s) => { const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return n - Math.floor(n); };
function noise(u, v, cells, seed) {
  const x = u * cells, y = v * cells, xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const w = i => ((i % cells) + cells) % cells, sm = t => t * t * (3 - 2 * t);
  const a = hash(w(xi), w(yi), seed), b = hash(w(xi + 1), w(yi), seed), c = hash(w(xi), w(yi + 1), seed), d = hash(w(xi + 1), w(yi + 1), seed);
  return a + (b - a) * sm(fx) + (c - a) * sm(fy) + (a - b - c + d) * sm(fx) * sm(fy);
}
const fbm = (u, v, seed) => noise(u, v, 4, seed) * 0.5 + noise(u, v, 8, seed + 1) * 0.3 + noise(u, v, 16, seed + 2) * 0.2;
const mix = (a, b, t) => a.map((c, i) => Math.max(0, Math.min(255, c + (b[i] - c) * t)));
const bronzeTexture = () => png(256, (u, v) => {
  const base = mix([120, 84, 34], [176, 130, 58], fbm(u, v, 3));
  const patina = Math.max(0, fbm(u, v, 9) - 0.56) * 5;
  return mix(base, [74, 128, 110], Math.min(1, patina));
});
const stoneTexture = () => png(256, (u, v) => {
  const n = fbm(u, v, 21), speck = noise(u, v, 64, 5) > 0.82 ? -26 : 0;
  return mix([128, 122, 112], [190, 184, 172], n).map(c => Math.max(0, c + speck));
});

// ---------- 組模型 ----------
class Model {
  constructor() { this.parts = new Map(); }
  add(material, geometry, { at = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], quat } = {}) {
    const q = quat || new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot));
    geometry.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...at), q, new THREE.Vector3(...scale)));
    if (!this.parts.has(material)) this.parts.set(material, []);
    this.parts.get(material).push(geometry);
  }
  tube(material, points, radius, radial = 10) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    this.add(material, new THREE.TubeGeometry(curve, points.length * 10, radius, radial, false));
  }
}
const ball = (r = 1, w = 20, h = 14) => new THREE.SphereGeometry(r, w, h);

function buildCenser() {
  const m = new Model();
  m.add("plinth", new THREE.CylinderGeometry(0.98, 1.08, 0.22, 8), { at: [0, 0.11, 0] });
  m.add("plinth", new THREE.CylinderGeometry(0.82, 0.92, 0.14, 8), { at: [0, 0.29, 0] });
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * Math.PI * 2 + Math.PI / 6, c = Math.cos(a), s = Math.sin(a);
    m.tube("bronze", [[c * 0.42, 1.04, s * 0.42], [c * 0.68, 0.86, s * 0.68], [c * 0.7, 0.58, s * 0.7], [c * 0.62, 0.4, s * 0.62]], 0.1);
    m.add("bronze", ball(0.16), { at: [c * 0.64, 0.42, s * 0.64], scale: [1, 0.62, 1] });
  }
  const profile = [[0, 0.92], [0.42, 0.95], [0.66, 1.12], [0.77, 1.35], [0.77, 1.55], [0.7, 1.66], [0.8, 1.72], [0.82, 1.77], [0.72, 1.77], [0.66, 1.62], [0, 1.6]];
  m.add("bronze", new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 56));
  [1.3, 1.42, 1.54].forEach((y, i) => m.add("gold", new THREE.TorusGeometry(0.775, i === 1 ? 0.03 : 0.016, 8, 56), { at: [0, y, 0], rot: [Math.PI / 2, 0, 0] }));
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * Math.PI * 2 + Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
    m.add("gold", ball(0.095, 14, 10), { at: [c * 0.8, 1.44, s * 0.8] });
    m.add("gold", new THREE.TorusGeometry(0.085, 0.016, 8, 22), { at: [c * 0.86, 1.33, s * 0.86], rot: [0, -a + Math.PI / 2, 0] });
  }
  [-1, 1].forEach(side => {
    m.tube("bronze", [[side * 0.74, 1.73, -0.2], [side * 0.9, 2.0, -0.21], [side * 0.92, 2.14, 0], [side * 0.9, 2.0, 0.21], [side * 0.74, 1.73, 0.2]], 0.05);
  });
  m.add("ash", new THREE.CylinderGeometry(0.67, 0.67, 0.03, 40), { at: [0, 1.66, 0] });
  for (let i = 0; i < 11; i++) {
    const a = i * 2.4, r = 0.14 + (i % 4) * 0.1, x = Math.cos(a) * r, z = Math.sin(a) * r, h = 0.62 + (i % 3) * 0.08, lean = [Math.sin(a) * 0.05, 0, -Math.cos(a) * 0.05];
    m.add("incense", new THREE.CylinderGeometry(0.012, 0.014, h, 6), { at: [x, 1.66 + h / 2, z], rot: lean });
    m.add("ember", ball(0.022, 8, 6), { at: [x, 1.66 + h, z] });
  }
  return m;
}

function buildLion() {
  const m = new Model(), S = "stone";
  m.add(S, new THREE.BoxGeometry(1.34, 0.46, 1.86), { at: [0, 0.23, 0] });
  m.add(S, new THREE.BoxGeometry(1.46, 0.09, 1.98), { at: [0, 0.505, 0] });
  m.add(S, new THREE.BoxGeometry(1.2, 0.08, 1.7), { at: [0, 0.59, 0] });
  // 身體
  [-1, 1].forEach(x => {
    m.add(S, ball(), { at: [x * 0.34, 0.98, -0.44], scale: [0.27, 0.36, 0.44] });
    m.add(S, ball(), { at: [x * 0.36, 0.72, -0.08], scale: [0.14, 0.09, 0.28] });
    m.add(S, new THREE.CylinderGeometry(0.115, 0.15, 0.78, 14), { at: [x * 0.25, 1.0, 0.5] });
    m.add(S, ball(), { at: [x * 0.25, 0.7, 0.6], scale: [0.17, 0.1, 0.23] });
    for (let t = -1; t <= 1; t++) m.add(S, ball(0.05, 10, 8), { at: [x * 0.25 + t * 0.09, 0.67, 0.8] });
  });
  m.add(S, ball(), { at: [0, 1.22, -0.1], rot: [0.32, 0, 0], scale: [0.45, 0.72, 0.6] });
  m.add(S, ball(), { at: [0, 1.32, 0.2], scale: [0.4, 0.46, 0.34] });
  // 頭
  m.add(S, ball(), { at: [0, 2.03, 0.3], scale: [0.47, 0.42, 0.44] });
  m.add(S, ball(), { at: [0, 1.91, 0.67], scale: [0.26, 0.17, 0.21] });
  m.add(S, ball(), { at: [0, 1.77, 0.62], scale: [0.2, 0.075, 0.17] });
  m.add(S, ball(0.075, 12, 10), { at: [0, 2.0, 0.84], scale: [1.2, 0.8, 0.9] });
  [-1, 1].forEach(x => {
    m.add(S, ball(0.1, 14, 10), { at: [x * 0.2, 2.13, 0.64], scale: [1, 0.85, 0.7] });
    m.add("eye", ball(0.052, 12, 10), { at: [x * 0.205, 2.13, 0.7] });
    m.add(S, ball(), { at: [x * 0.22, 2.24, 0.62], rot: [0, 0, x * 0.34], scale: [0.17, 0.055, 0.09] });
    m.add(S, ball(), { at: [x * 0.42, 2.28, 0.22], rot: [0, 0, -x * 0.5], scale: [0.1, 0.16, 0.06] });
    m.add("gold", new THREE.BoxGeometry(0.03, 0.07, 0.03), { at: [x * 0.09, 1.84, 0.83] });
  });
  // 卷毛：沿頭後方與頸部排列的小漩渦
  const center = new THREE.Vector3(0, 2.0, 0.22), dummy = new THREE.Object3D();
  const curl = (p, radius) => {
    dummy.position.copy(p); dummy.lookAt(center); dummy.rotateY(Math.PI);
    m.add(S, new THREE.TorusGeometry(radius, radius * 0.4, 7, 14), { at: p.toArray(), quat: dummy.quaternion.clone() });
    m.add(S, ball(radius * 0.72, 9, 7), { at: p.toArray() });
  };
  for (let row = 0; row < 6; row++) {
    const lat = -0.75 + row * 0.42, count = 13 - Math.abs(row - 2) * 2;
    for (let i = 0; i < count; i++) {
      const a = Math.PI * (0.02 + 0.96 * (i + (row % 2) * 0.5) / count);   // 頭後半圈
      const r = 0.52, y = Math.sin(lat) * r * 1.02, h = Math.cos(lat) * r;
      curl(new THREE.Vector3(Math.cos(a) * h, center.y + y, center.z - Math.sin(a) * h * 1.02), 0.078);
    }
  }
  for (let i = 0; i < 9; i++) {
    const a = i / 8 * Math.PI, x = Math.cos(a) * 0.33, z = 0.36 + Math.sin(a) * 0.12;
    curl(new THREE.Vector3(x, 1.54 - Math.sin(a) * 0.12, z), 0.072);
  }
  // 項圈、鈴、繡球、尾
  m.add("gold", new THREE.TorusGeometry(0.34, 0.03, 8, 36), { at: [0, 1.62, 0.26], rot: [Math.PI / 2 - 0.25, 0, 0] });
  m.add("gold", ball(0.085, 14, 10), { at: [0, 1.48, 0.58] });
  m.add("red", ball(0.21), { at: [0.3, 0.84, 0.72] });
  [0, Math.PI / 2, Math.PI / 4].forEach(a => m.add("gold", new THREE.TorusGeometry(0.212, 0.012, 6, 30), { at: [0.3, 0.84, 0.72], rot: [0, a, 0] }));
  m.tube(S, [[0, 0.98, -0.82], [0, 1.25, -0.98], [0.06, 1.62, -0.86], [0.02, 1.78, -0.66], [-0.08, 1.7, -0.6]], 0.07);
  for (let i = 0; i < 6; i++) { const a = i * 1.05; curl(new THREE.Vector3(Math.cos(a) * 0.1, 1.76 + Math.sin(a) * 0.1, -0.68), 0.06); }
  return m;
}

// ---------- 寫出 GLB ----------
const MATERIALS = {
  bronze: { pbrMetallicRoughness: { metallicFactor: 0.55, roughnessFactor: 0.42, baseColorTexture: { index: 0 } } },
  stone: { pbrMetallicRoughness: { metallicFactor: 0, roughnessFactor: 0.85, baseColorTexture: { index: 0 } } },
  plinth: { pbrMetallicRoughness: { baseColorFactor: [0.5, 0.48, 0.44, 1], metallicFactor: 0, roughnessFactor: 0.9 } },
  gold: { pbrMetallicRoughness: { baseColorFactor: [0.85, 0.62, 0.2, 1], metallicFactor: 0.7, roughnessFactor: 0.35 } },
  ash: { pbrMetallicRoughness: { baseColorFactor: [0.42, 0.4, 0.38, 1], metallicFactor: 0, roughnessFactor: 1 } },
  incense: { pbrMetallicRoughness: { baseColorFactor: [0.6, 0.12, 0.08, 1], metallicFactor: 0, roughnessFactor: 0.7 } },
  ember: { pbrMetallicRoughness: { baseColorFactor: [1, 0.5, 0.12, 1], metallicFactor: 0, roughnessFactor: 0.6 }, emissiveFactor: [1, 0.42, 0.08] },
  eye: { pbrMetallicRoughness: { baseColorFactor: [0.05, 0.04, 0.04, 1], metallicFactor: 0.2, roughnessFactor: 0.25 } },
  red: { pbrMetallicRoughness: { baseColorFactor: [0.62, 0.1, 0.09, 1], metallicFactor: 0.1, roughnessFactor: 0.5 } }
};

function writeGlb(model, texture, file) {
  const chunks = [], bufferViews = [], accessors = [], primitives = [], materials = [];
  let offset = 0, triangles = 0;
  const pushView = (buf, target) => {
    const pad = (4 - buf.length % 4) % 4, view = { buffer: 0, byteOffset: offset, byteLength: buf.length };
    if (target) view.target = target;
    chunks.push(buf, Buffer.alloc(pad)); offset += buf.length + pad; bufferViews.push(view);
    return bufferViews.length - 1;
  };
  for (const [name, geos] of model.parts) {
    const pos = [], nor = [], uv = [], idx = [];
    for (const g of geos) {
      const base = pos.length / 3, p = g.attributes.position, n = g.attributes.normal, t = g.attributes.uv;
      for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); uv.push(t.getX(i), t.getY(i)); }
      const index = g.index ? Array.from(g.index.array) : Array.from({ length: p.count }, (_, i) => i);
      for (const i of index) idx.push(i + base);
    }
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < pos.length; i++) { lo[i % 3] = Math.min(lo[i % 3], pos[i]); hi[i % 3] = Math.max(hi[i % 3], pos[i]); }
    const f32 = a => Buffer.from(new Float32Array(a).buffer);
    const count = pos.length / 3;
    accessors.push({ bufferView: pushView(f32(pos), 34962), componentType: 5126, count, type: "VEC3", min: lo, max: hi });
    const position = accessors.length - 1;
    accessors.push({ bufferView: pushView(f32(nor), 34962), componentType: 5126, count, type: "VEC3" });
    accessors.push({ bufferView: pushView(f32(uv), 34962), componentType: 5126, count, type: "VEC2" });
    accessors.push({ bufferView: pushView(Buffer.from(new Uint32Array(idx).buffer), 34963), componentType: 5125, count: idx.length, type: "SCALAR" });
    materials.push({ name, ...MATERIALS[name] });
    primitives.push({ attributes: { POSITION: position, NORMAL: position + 1, TEXCOORD_0: position + 2 }, indices: position + 3, material: materials.length - 1 });
    triangles += idx.length / 3;
  }
  const imageView = pushView(texture);
  const json = {
    asset: { version: "2.0", generator: "tools/make-sample-models.mjs" }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: path.basename(file, ".glb") }],
    meshes: [{ primitives }], materials, accessors, bufferViews,
    images: [{ bufferView: imageView, mimeType: "image/png" }], samplers: [{ wrapS: 10497, wrapT: 10497 }], textures: [{ source: 0, sampler: 0 }],
    buffers: [{ byteLength: offset }]
  };
  let text = Buffer.from(JSON.stringify(json));
  text = Buffer.concat([text, Buffer.alloc((4 - text.length % 4) % 4, 0x20)]);
  const bin = Buffer.concat(chunks), head = Buffer.alloc(12), jh = Buffer.alloc(8), bh = Buffer.alloc(8);
  head.write("glTF", 0, "ascii"); head.writeUInt32LE(2, 4); head.writeUInt32LE(28 + text.length + bin.length, 8);
  jh.writeUInt32LE(text.length, 0); jh.write("JSON", 4, "ascii");
  bh.writeUInt32LE(bin.length, 0); bh.write("BIN\0", 4, "ascii");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.concat([head, jh, text, bh, bin]));
  console.log(`${path.basename(file)}：${Math.round(triangles)} 三角面，${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
}

writeGlb(buildCenser(), bronzeTexture(), path.join(outDir, "sample-censer.glb"));
writeGlb(buildLion(), stoneTexture(), path.join(outDir, "sample-lion.glb"));
