// avatar/appearance.js - 分身外觀與表情動作：捏臉（膚色、五官、配件）、髮型、頭上表情、持續動作
// 自己的分身與同行分身共用這份程式，別人看到的你和你自己看到的一致。
// 同行送來的設定一律只當作選項代號查表，查不到就用預設，不會把任意內容畫到畫面上。

const AVATAR_SKIN_TONES = { fair: "#ffe3cc", light: "#f5c9a3", tan: "#d9a47c", deep: "#a8724f" };
const AVATAR_HAIR_COLORS = { black: "#1a1110", brown: "#5a3520", chestnut: "#8a4b2a", silver: "#c9c9c9", gold: "#d9a53a" };

const AVATAR_FUR_COLORS = { cat: "#e8a35a", rabbit: "#f4efe8", bear: "#9a6a42", dragon: "#6fb58a" };
const AVATAR_PANTS_COLORS = { black: "#221111", navy: "#24365c", brown: "#5a3a24", cream: "#d9c9a8", red: "#8a2a22" };
const AVATAR_SHOE_COLORS = { black: "#1c1614", brown: "#6b4226", white: "#e8e2d6", red: "#a82a24", gold: "#c89a34" };
// 體型：整體比例（寬、高、深）與頭部比例
const AVATAR_BODY_SHAPES = {
  standard: { scale: [1, 1, 1], head: 1 },
  child: { scale: [0.8, 0.78, 0.8], head: 1.16 },
  tall: { scale: [0.92, 1.16, 0.92], head: 0.94 },
  plump: { scale: [1.28, 0.96, 1.28], head: 0.92 }
};

const AVATAR_OPTIONS = {
  character: { label: "角色版本", choices: { human: "人類", cat: "貓貓", rabbit: "玉兔", bear: "小熊", dragon: "小龍" } },
  body: { label: "體型", choices: { standard: "標準", child: "小童", tall: "高挑", plump: "圓潤" } },
  pants: { label: "褲裝", choices: { long: "長褲", shorts: "短褲", wide: "寬褲", skirt: "長裙" } },
  pantsColor: { label: "褲裝顏色", choices: { black: "墨黑", navy: "深藍", brown: "棕", cream: "米白", red: "暗紅" } },
  shoes: { label: "鞋子", choices: { cloth: "布鞋", boots: "靴子", sandals: "涼鞋", bare: "赤腳" } },
  shoesColor: { label: "鞋子顏色", choices: { black: "黑", brown: "棕", white: "白", red: "紅", gold: "金" } },
  skin: { label: "膚色", choices: { fair: "白皙", light: "自然", tan: "小麥", deep: "古銅" } },
  eyes: { label: "眼睛", choices: { round: "圓眼", smile: "笑眼", big: "大眼", closed: "閉目", dot: "豆豆眼", star: "星星眼", heart: "愛心眼", squint: "瞇瞇眼", wink: "眨眼", droopy: "下垂眼", swirl: "漩渦眼", teary: "淚眼" } },
  brows: { label: "眉毛", choices: { none: "無", thin: "細眉", thick: "粗眉", worried: "八字眉", angry: "劍眉" } },
  mouth: { label: "嘴巴", choices: { smile: "微笑", small: "小口", grin: "大笑", cat: "貓嘴", flat: "一字嘴", tongue: "吐舌" } },
  blush: { label: "腮紅", choices: { none: "無", soft: "淡淡", rosy: "紅潤" } },
  faceAcc: { label: "臉部配件", choices: { none: "無", glasses: "眼鏡", sunglasses: "墨鏡", mask: "口罩", mole: "美人痣", freckles: "雀斑", bandaid: "OK 繃", beard: "鬍子", whiskers: "貓鬍鬚", tikka: "眉心紅點", heart: "愛心貼紙" } },
  hair: { label: "髮型", choices: { none: "光頭", short: "短髮", bangs: "齊瀏海", twinbuns: "雙丸子", ponytail: "馬尾", long: "長髮", twintails: "雙馬尾", curly: "捲髮", bob: "鮑伯頭", topknot: "道髻", spiky: "刺蝟頭" } },
  hairColor: { label: "髮色", choices: { black: "烏黑", brown: "深棕", chestnut: "栗色", silver: "銀灰", gold: "金色" } }
};

const AVATAR_DEFAULT_LOOK = { character: "human", body: "standard", pants: "long", pantsColor: "black", shoes: "cloth", shoesColor: "black", skin: "light", eyes: "round", brows: "none", mouth: "smile", blush: "soft", faceAcc: "none", hair: "short", hairColor: "black" };

// 只保留合法的選項代號
function normalizeLook(cfg = {}) {
  const look = {};
  for (const key of Object.keys(AVATAR_DEFAULT_LOOK)) {
    look[key] = Object.hasOwn(AVATAR_OPTIONS[key].choices, String(cfg[key])) ? cfg[key] : AVATAR_DEFAULT_LOOK[key];   // hasOwn：擋掉 constructor 這類繼承屬性
  }
  return look;
}

function randomLook() {
  const look = {};
  for (const key of Object.keys(AVATAR_DEFAULT_LOOK)) {
    const keys = Object.keys(AVATAR_OPTIONS[key].choices);
    look[key] = keys[Math.floor(Math.random() * keys.length)];
  }
  return look;
}

// 造型代碼：外觀＋衣著選項壓成一串短碼，可複製給別人套用
// 新欄位只能往後加，舊代碼才解得開
const LOOK_CODE_KEYS = ["skin", "eyes", "brows", "mouth", "blush", "faceAcc", "hair", "hairColor", "character", "body", "pants", "pantsColor", "shoes", "shoesColor"];
function encodeLookCode(cfg) {
  const look = normalizeLook(cfg);
  const parts = LOOK_CODE_KEYS.map(k => Object.keys(AVATAR_OPTIONS[k].choices).indexOf(look[k]).toString(36));
  const color = String(cfg.robeColor || "#c24b2b").replace("#", "").toLowerCase();
  return `TP-${parts.join("")}-${/^[0-9a-f]{6}$/.test(color) ? color : "c24b2b"}`;
}

function decodeLookCode(code) {
  const m = String(code || "").trim().match(/^TP-([0-9a-z]{8}(?:[0-9a-z]{6})?)-([0-9a-fA-F]{6})$/);
  if (!m) return null;
  const look = {};
  for (let i = 0; i < LOOK_CODE_KEYS.length; i++) {
    const k = LOOK_CODE_KEYS[i];
    if (i >= m[1].length) { look[k] = AVATAR_DEFAULT_LOOK[k]; continue; }   // 舊版八碼代碼
    const key = Object.keys(AVATAR_OPTIONS[k].choices)[parseInt(m[1][i], 36)];
    if (!key) return null;
    look[k] = key;
  }
  look.robeColor = "#" + m[2].toLowerCase();
  return look;
}

// ---------- 臉部貼圖（128×128，眼睛在 y≈60、x 42／86） ----------
function drawAvatarFace(cfg) {
  const look = normalizeLook(cfg);
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const ink = "#2b1408";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const EX = [42, 86], EY = 60;

  // 腮紅
  if (look.blush !== "none") {
    ctx.fillStyle = look.blush === "rosy" ? "rgba(255, 90, 100, 0.6)" : "rgba(255, 120, 120, 0.4)";
    ctx.beginPath();
    ctx.ellipse(30, 76, 10, 7, 0, 0, Math.PI * 2);
    ctx.ellipse(98, 76, 10, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 眼睛
  const dot = (x, y, r, color = ink) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
  const stroke = (w, color = ink) => { ctx.strokeStyle = color; ctx.lineWidth = w; };
  EX.forEach((x, i) => {
    switch (look.eyes) {
      case "smile": stroke(3.5); ctx.beginPath(); ctx.arc(x, EY + 4, 7, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); break;
      case "big": dot(x, EY, 10); dot(x - 3, EY - 3, 4, "#fff"); dot(x + 3, EY + 3, 1.8, "#fff"); break;
      case "closed": stroke(3.5); ctx.beginPath(); ctx.arc(x, EY - 3, 7, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); break;
      case "dot": dot(x, EY, 3.5); break;
      case "star": {
        ctx.fillStyle = "#f2b705";
        ctx.beginPath();
        for (let k = 0; k < 10; k++) {
          const r = k % 2 ? 4 : 10, a = -Math.PI / 2 + k * Math.PI / 5;
          ctx.lineTo(x + Math.cos(a) * r, EY + Math.sin(a) * r);
        }
        ctx.closePath(); ctx.fill(); break;
      }
      case "heart":
        ctx.fillStyle = "#e0245e";
        ctx.beginPath(); ctx.moveTo(x, EY + 8);
        ctx.bezierCurveTo(x - 12, EY - 1, x - 6, EY - 10, x, EY - 3);
        ctx.bezierCurveTo(x + 6, EY - 10, x + 12, EY - 1, x, EY + 8);
        ctx.fill(); break;
      case "squint": {
        // 左眼「>」、右眼「<」
        const d = i ? -1 : 1;
        stroke(3.5); ctx.beginPath(); ctx.moveTo(x - d * 6, EY - 5); ctx.lineTo(x + d * 5, EY); ctx.lineTo(x - d * 6, EY + 5); ctx.stroke(); break;
      }
      case "wink":
        if (i === 1) { stroke(3.5); ctx.beginPath(); ctx.arc(x, EY + 4, 7, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
        else { dot(x, EY, 7); dot(x - 2, EY - 2, 2.5, "#fff"); }
        break;
      case "droopy": dot(x, EY + 2, 6); stroke(3); ctx.beginPath(); ctx.moveTo(x - 8, EY - 4); ctx.lineTo(x + 8, EY - 1 + (i ? -3 : 3)); ctx.stroke(); break;
      case "swirl": stroke(2.5); ctx.beginPath(); for (let a = 0; a < Math.PI * 5; a += 0.3) ctx.lineTo(x + Math.cos(a) * a * 0.6, EY + Math.sin(a) * a * 0.6); ctx.stroke(); break;
      case "teary": dot(x, EY, 7); dot(x - 2, EY - 2, 2.5, "#fff"); ctx.fillStyle = "rgba(80, 170, 255, 0.85)"; ctx.beginPath(); ctx.ellipse(x + (i ? 6 : -6), EY + 12, 3, 5, 0, 0, Math.PI * 2); ctx.fill(); break;
      default: dot(x, EY, 7); dot(x - 2, EY - 2, 2.5, "#fff");
    }
  });

  // 眉毛
  if (look.brows !== "none") {
    stroke(look.brows === "thick" ? 5 : 2.5);
    EX.forEach((x, i) => {
      const s = i ? 1 : -1;
      ctx.beginPath();
      if (look.brows === "worried") { ctx.moveTo(x - s * 9, EY - 12); ctx.lineTo(x + s * 7, EY - 17); }
      else if (look.brows === "angry") { ctx.moveTo(x - s * 9, EY - 17); ctx.lineTo(x + s * 7, EY - 12); }
      else { ctx.moveTo(x - 8, EY - 15); ctx.quadraticCurveTo(x, EY - 19, x + 8, EY - 15); }
      ctx.stroke();
    });
  }

  // 嘴巴
  const MY = 82;
  stroke(3, "#441d0c");
  ctx.beginPath();
  switch (look.mouth) {
    case "small": ctx.fillStyle = "#7a2a1a"; ctx.ellipse(64, MY, 4, 3.5, 0, 0, Math.PI * 2); ctx.fill(); break;
    case "grin": ctx.fillStyle = "#7a2a1a"; ctx.moveTo(52, MY - 4); ctx.lineTo(76, MY - 4); ctx.arc(64, MY - 4, 12, 0, Math.PI); ctx.fill(); ctx.fillStyle = "#ff8a8a"; ctx.beginPath(); ctx.arc(64, MY + 4, 5, 0, Math.PI); ctx.fill(); break;
    case "cat": ctx.arc(58, MY - 2, 6, 0.1, Math.PI - 0.1); ctx.moveTo(76, MY - 2); ctx.arc(70, MY - 2, 6, 0.1, Math.PI - 0.1); ctx.stroke(); break;
    case "flat": ctx.moveTo(56, MY); ctx.lineTo(72, MY); ctx.stroke(); break;
    case "tongue": ctx.arc(64, MY - 6, 9, 0.25, Math.PI - 0.25); ctx.stroke(); ctx.fillStyle = "#ff6f7d"; ctx.beginPath(); ctx.ellipse(64, MY + 4, 5, 6, 0, 0, Math.PI); ctx.fill(); break;
    default: ctx.arc(64, MY - 6, 10, 0.2, Math.PI - 0.2); ctx.stroke();
  }

  // 臉部配件
  switch (look.faceAcc) {
    case "glasses": stroke(2.5, "#222"); EX.forEach(x => { ctx.beginPath(); ctx.arc(x, EY, 12, 0, Math.PI * 2); ctx.stroke(); }); ctx.beginPath(); ctx.moveTo(54, EY); ctx.lineTo(74, EY); ctx.stroke(); break;
    case "sunglasses": ctx.fillStyle = "rgba(15, 15, 15, 0.92)"; EX.forEach(x => { ctx.beginPath(); ctx.ellipse(x, EY, 14, 10, 0, 0, Math.PI * 2); ctx.fill(); }); stroke(3, "#111"); ctx.beginPath(); ctx.moveTo(54, EY - 2); ctx.lineTo(74, EY - 2); ctx.stroke(); break;
    case "mask": ctx.fillStyle = "#e8f1f6"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(38, 70, 52, 30, 10) : ctx.rect(38, 70, 52, 30); ctx.fill(); stroke(1.5, "#9fb4c0"); ctx.beginPath(); ctx.moveTo(42, 80); ctx.lineTo(86, 80); ctx.moveTo(42, 88); ctx.lineTo(86, 88); ctx.stroke(); break;
    case "mole": dot(78, 74, 2.2, "#3b2416"); break;
    case "freckles": [[32, 70], [27, 74], [35, 77], [96, 70], [101, 74], [93, 77]].forEach(([x, y]) => dot(x, y, 1.6, "#a0603a")); break;
    case "bandaid": ctx.save(); ctx.translate(96, 72); ctx.rotate(-0.5); ctx.fillStyle = "#f2c79b"; ctx.fillRect(-11, -4, 22, 8); ctx.fillStyle = "#e3a877"; ctx.fillRect(-4, -4, 8, 8); ctx.restore(); break;
    case "beard": ctx.fillStyle = "rgba(40, 25, 18, 0.85)"; ctx.beginPath(); ctx.moveTo(40, 86); ctx.quadraticCurveTo(64, 124, 88, 86); ctx.quadraticCurveTo(64, 100, 40, 86); ctx.fill(); break;
    case "whiskers": stroke(1.8, "#3b2416"); [[-1, 0], [1, 0]].forEach(([s]) => { [-4, 0, 4].forEach(dy => { ctx.beginPath(); ctx.moveTo(64 + s * 18, 78 + dy); ctx.lineTo(64 + s * 40, 74 + dy * 2); ctx.stroke(); }); }); break;
    case "tikka": dot(64, EY - 20, 3.5, "#d81b1b"); break;
    case "heart": ctx.fillStyle = "#ff4f8b"; ctx.beginPath(); ctx.moveTo(98, 80); ctx.bezierCurveTo(90, 74, 93, 67, 98, 71); ctx.bezierCurveTo(103, 67, 106, 74, 98, 80); ctx.fill(); break;
  }
  return new THREE.CanvasTexture(canvas);
}

// ---------- 臉：貼合頭部球面的曲面（半徑略大於頭），掛在頭底下跟著頭動 ----------
// 原本用平面放在 z=0.22，但頭的半徑是 0.24，平面中央其實被包在頭裡，五官一直看不到
const FACE_PATCH_ANGLE = 1.2;   // 臉部曲面的水平與垂直張角（弧度）
function createAvatarFaceMesh(texture) {
  const geo = new THREE.SphereGeometry(0.244, 24, 24,
    Math.PI / 2 - FACE_PATCH_ANGLE / 2, FACE_PATCH_ANGLE,
    Math.PI / 2 - FACE_PATCH_ANGLE / 2, FACE_PATCH_ANGLE);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: texture, transparent: true }));
  mesh.name = "avatarFace";
  return mesh;
}

// ---------- 髮型：掛在頭底下（頭的區域座標，中心為原點、半徑 0.24、臉朝 +z） ----------
function buildAvatarHair(group, cfg, HY = 0) {
  const look = normalizeLook(cfg);
  if (look.hair === "none" || look.character !== "human") return [];   // 動物造型靠耳朵與毛色，不戴頭髮
  const mat = new THREE.MeshStandardMaterial({ color: AVATAR_HAIR_COLORS[look.hairColor], roughness: 0.7 });
  const parts = [];
  const add = (geo, x, y, z, rx = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, 0, rz);
    m.castShadow = true;
    group.add(m);
    parts.push(m);
    return m;
  };
  // 共同的頭頂髮帽：只蓋頭頂與後腦，往後傾讓髮際線落在臉部貼圖上緣（y≈1.09）之上，才不會擋住五官
  add(new THREE.SphereGeometry(0.258, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.4), 0, HY, -0.01, -0.62);
  switch (look.hair) {
    // 齊瀏海：貼合額頭的曲面，下緣停在眉毛上方（臉部貼圖的眉毛約在頭頂往下 1.39 弧度處）
    case "bangs": add(new THREE.SphereGeometry(0.262, 20, 6, Math.PI / 2 - 0.95, 1.9, 0.63, 0.67), 0, HY, 0); break;
    case "twinbuns": add(new THREE.SphereGeometry(0.09, 12, 12), -0.17, HY + 0.2, -0.02); add(new THREE.SphereGeometry(0.09, 12, 12), 0.17, HY + 0.2, -0.02); break;
    case "ponytail": add(new THREE.CylinderGeometry(0.05, 0.03, 0.32, 10), 0, HY - 0.04, -0.27, 0.35); add(new THREE.SphereGeometry(0.05, 10, 10), 0, HY + 0.1, -0.25); break;
    case "long": add(new THREE.BoxGeometry(0.42, 0.42, 0.08), 0, HY - 0.14, -0.17, 0.12); break;
    case "bob": add(new THREE.SphereGeometry(0.27, 20, 12, 0, Math.PI * 2, 0.5, 1.3), 0, HY - 0.03, -0.05, -0.28); break;
    case "topknot": add(new THREE.SphereGeometry(0.095, 12, 12), 0, HY + 0.27, -0.05); add(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 12), 0, HY + 0.22, -0.05); break;
    case "spiky": for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2, r = 0.13; add(new THREE.ConeGeometry(0.06, 0.2, 7), Math.cos(a) * r, HY + 0.25, -0.03 + Math.sin(a) * r, Math.sin(a) * 0.5, -Math.cos(a) * 0.5); } add(new THREE.ConeGeometry(0.06, 0.22, 7), 0, HY + 0.3, -0.03); break;
    case "twintails": add(new THREE.ConeGeometry(0.07, 0.4, 10), -0.26, HY - 0.08, -0.04, 0, -0.25); add(new THREE.ConeGeometry(0.07, 0.4, 10), 0.26, HY - 0.08, -0.04, 0, 0.25); break;
    case "curly": for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; if (Math.sin(a) > 0.3) continue; add(new THREE.SphereGeometry(0.065, 8, 8), Math.cos(a) * 0.22, HY + 0.08 + Math.sin(k) * 0.04, Math.sin(a) * 0.2 - 0.05); } break;
  }
  return parts;
}

function avatarSkinColor(cfg) {
  const look = normalizeLook(cfg);
  return AVATAR_FUR_COLORS[look.character] || AVATAR_SKIN_TONES[look.skin];
}

// 體型、褲裝、鞋子與動物特徵。自己與同行分身共用，別人看到的才會一致。
// parts：{ head, legs: [{ obj, mesh, footY }] }；obj 是會跟著走路擺動的節點，footY 是腳底在 obj 內的高度
function dressAvatar(group, parts, cfg) {
  const look = normalizeLook(cfg), shape = AVATAR_BODY_SHAPES[look.body];
  group.scale.set(...shape.scale);
  parts.head.scale.setScalar(shape.head);
  const skin = new THREE.MeshStandardMaterial({ color: avatarSkinColor(cfg), roughness: 0.6 });
  const cloth = new THREE.MeshStandardMaterial({ color: AVATAR_PANTS_COLORS[look.pantsColor], roughness: 0.75 });
  const shoe = new THREE.MeshStandardMaterial({ color: AVATAR_SHOE_COLORS[look.shoesColor], roughness: 0.55 });
  const piece = (parent, geo, mat, x, y, z, scale) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (scale) m.scale.set(...scale);
    m.castShadow = true;
    m.name = "avatarDress";
    parent.add(m);
    return m;
  };

  parts.legs.forEach(({ obj, mesh, footY }) => {
    mesh.material = look.pants === "shorts" || look.pants === "skirt" ? skin : cloth;
    if (look.pants === "wide") mesh.scale.set(1.45, 1, 1.45);
    if (look.pants === "shorts") piece(obj, new THREE.CylinderGeometry(0.085, 0.09, 0.12, 12), cloth, 0, footY + 0.2, 0);
    const foot = new THREE.SphereGeometry(1, 12, 8);
    if (look.shoes === "bare") { piece(obj, foot, skin, 0, footY + 0.02, 0.03, [0.07, 0.035, 0.1]); return; }
    if (look.shoes === "sandals") {
      piece(obj, foot, skin, 0, footY + 0.03, 0.03, [0.065, 0.032, 0.095]);
      piece(obj, new THREE.BoxGeometry(0.15, 0.02, 0.22), shoe, 0, footY + 0.01, 0.03);
      piece(obj, new THREE.TorusGeometry(0.058, 0.012, 6, 14), shoe, 0, footY + 0.03, 0.05, [1, 0.5, 1]).rotation.x = Math.PI / 2;
      return;
    }
    piece(obj, foot, shoe, 0, footY + 0.04, 0.035, [0.082, 0.05, 0.12]);
    if (look.shoes === "boots") piece(obj, new THREE.CylinderGeometry(0.088, 0.08, 0.16, 12), shoe, 0, footY + 0.12, 0);
  });
  if (look.pants === "skirt") piece(group, new THREE.CylinderGeometry(0.27, 0.36, 0.3, 16), cloth, 0, 0.17, 0);

  const c = look.character;
  if (c === "human") return;
  const inner = new THREE.MeshStandardMaterial({ color: c === "dragon" ? "#e8c860" : "#f2b7b0", roughness: 0.6 });
  const tail = (points, radius) => {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, radius, 8, false), skin);
    m.name = "avatarDress"; m.castShadow = true; group.add(m);
  };
  [-1, 1].forEach(s => {
    if (c === "cat") {
      piece(parts.head, new THREE.ConeGeometry(0.085, 0.16, 8), skin, s * 0.15, 0.21, -0.02).rotation.z = -s * 0.28;
      piece(parts.head, new THREE.ConeGeometry(0.05, 0.1, 8), inner, s * 0.15, 0.205, 0.03).rotation.z = -s * 0.28;
      [-0.03, 0.02].forEach(y => { piece(parts.head, new THREE.BoxGeometry(0.14, 0.006, 0.006), new THREE.MeshBasicMaterial({ color: 0x3a2a20 }), s * 0.25, y - 0.04, 0.13).rotation.z = s * y * 3; });
    } else if (c === "rabbit") {
      piece(parts.head, new THREE.SphereGeometry(1, 12, 10), skin, s * 0.11, 0.34, -0.03, [0.06, 0.2, 0.05]).rotation.z = -s * 0.14;
      piece(parts.head, new THREE.SphereGeometry(1, 10, 8), inner, s * 0.11, 0.34, 0.005, [0.035, 0.15, 0.03]).rotation.z = -s * 0.14;
    } else if (c === "bear") {
      piece(parts.head, new THREE.SphereGeometry(0.085, 12, 10), skin, s * 0.18, 0.18, -0.02);
      piece(parts.head, new THREE.SphereGeometry(0.05, 10, 8), inner, s * 0.18, 0.18, 0.03);
    } else {
      piece(parts.head, new THREE.ConeGeometry(0.04, 0.2, 8), inner, s * 0.12, 0.25, -0.05).rotation.z = -s * 0.22;
      piece(parts.head, new THREE.ConeGeometry(0.05, 0.1, 6), skin, s * 0.24, 0.05, -0.04).rotation.z = -s * 1.2;
    }
  });
  if (c === "cat") tail([[0, 0.34, -0.26], [0.06, 0.38, -0.46], [0.02, 0.62, -0.5], [-0.06, 0.74, -0.42]], 0.04);
  else if (c === "rabbit") piece(group, new THREE.SphereGeometry(0.09, 12, 10), skin, 0, 0.32, -0.3);
  else if (c === "bear") piece(group, new THREE.SphereGeometry(0.065, 10, 8), skin, 0, 0.3, -0.31);
  else {
    tail([[0, 0.34, -0.26], [0, 0.26, -0.5], [0.04, 0.2, -0.72], [0.1, 0.24, -0.86]], 0.055);
    [0.82, 0.7, 0.58, 0.46].forEach((y, i) => piece(group, new THREE.ConeGeometry(0.04, 0.09, 5), inner, 0, y, -0.2 - i * 0.03).rotation.x = -0.9);
  }
}

// ---------- 頭上表情 ----------
const AVATAR_EMOTES = {
  happy: { icon: "😊", label: "開心" }, lol: { icon: "😂", label: "笑哭" }, love: { icon: "😍", label: "喜愛" },
  wow: { icon: "😮", label: "驚訝" }, sad: { icon: "😢", label: "難過" }, angry: { icon: "😤", label: "生氣" },
  sleepy: { icon: "😴", label: "想睡" }, think: { icon: "🤔", label: "思考" }, thanks: { icon: "🙏", label: "感恩" },
  like: { icon: "👍", label: "讚" }, heart: { icon: "❤️", label: "愛心" }, party: { icon: "🎉", label: "慶祝" }
};
const EMOTE_SECONDS = 3;

function showEmoteBubble(holder, group, emoteId) {
  const emote = AVATAR_EMOTES[emoteId];
  if (!emote) return;
  if (holder.emoteSprite) group.remove(holder.emoteSprite);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(255, 250, 235, 0.95)";
  ctx.beginPath(); ctx.arc(64, 58, 50, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(52, 100); ctx.lineTo(64, 124); ctx.lineTo(76, 100); ctx.fill();
  ctx.font = "64px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(emote.icon, 64, 62);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false, transparent: true }));
  sprite.position.set(0, 1.85, 0);
  sprite.renderOrder = 10;
  sprite.userData.noCollision = true;
  group.add(sprite);
  holder.emoteSprite = sprite;
  holder.emoteBorn = performance.now();
  holder.emoteId = emoteId;
}

// 每格更新：彈出、浮動、時間到移除
function updateEmoteBubble(holder, group) {
  const s = holder.emoteSprite;
  if (!s) return;
  const age = (performance.now() - holder.emoteBorn) / 1000;
  if (age > EMOTE_SECONDS) {
    group.remove(s);
    s.material.map.dispose();
    s.material.dispose();
    holder.emoteSprite = null;
    return;
  }
  const pop = Math.min(1, age / 0.18);
  const fade = age > EMOTE_SECONDS - 0.4 ? (EMOTE_SECONDS - age) / 0.4 : 1;
  const scale = 0.42 * (0.6 + 0.4 * pop) * (1 + (pop < 1 ? 0.15 * Math.sin(pop * Math.PI) : 0));
  s.scale.set(scale, scale, 1);
  s.position.y = 1.85 + Math.sin(age * 3) * 0.03;
  s.material.opacity = fade;
}

// ---------- 持續動作（做到移動或按停止為止） ----------
const AVATAR_ACTIONS = {
  jump: { icon: "🦘", label: "開心跳跳" }, wave: { icon: "👋", label: "揮手招呼" }, clap: { icon: "👏", label: "拍手" },
  sway: { icon: "💃", label: "搖擺舞" }, cheer: { icon: "🙌", label: "舉手歡呼" }, stretch: { icon: "🙆", label: "伸懶腰" },
  deepBow: { icon: "🙇", label: "鞠躬九十度" }, sit: { icon: "🪑", label: "坐下休息" }, lie: { icon: "🛌", label: "躺平休息" },
  kneelSit: { icon: "🧎", label: "跪坐靜心" }
};

// 切換動作時先把姿勢歸零，避免上一個動作的角度殘留（例如躺平後站起來還歪著）
function resetAvatarPose(limbs, root) {
  ["armL", "armR", "legL", "legR", "torso", "head"].forEach(k => { if (limbs[k]) limbs[k].rotation.set(0, 0, 0); });
  root.rotation.x = 0;
  root.rotation.z = 0;
}

// 回傳 true 表示這是表情動作並已處理；自己與同行分身共用（同行分身的手臂軸心在中央，角度一樣可用）
function animateExpressiveAction(limbs, root, action, time) {
  if (!AVATAR_ACTIONS[action] || !limbs.armL) return false;
  const { armL, armR, legL, legR, torso, head } = limbs;
  const s = Math.sin;
  switch (action) {
    case "jump":
      root.position.y = Math.abs(s(time * 6)) * 0.25;
      armL.rotation.set(0, 0, -0.5 - Math.abs(s(time * 6)) * 0.6);
      armR.rotation.set(0, 0, 0.5 + Math.abs(s(time * 6)) * 0.6);
      legL.rotation.x = legR.rotation.x = -Math.abs(s(time * 6)) * 0.3;
      break;
    case "wave":
      root.position.y = 0;
      armR.rotation.set(0, 0, 2.6 + s(time * 8) * 0.35);
      armL.rotation.set(0, 0, -0.1);
      head.rotation.z = s(time * 4) * 0.08;
      break;
    case "clap": {
      const c = 0.25 + Math.abs(s(time * 7)) * 0.35;
      root.position.y = 0;
      armL.rotation.set(-1.2, 0, c);
      armR.rotation.set(-1.2, 0, -c);
      break;
    }
    case "sway":
      root.position.y = Math.abs(s(time * 4)) * 0.05;
      torso.rotation.z = s(time * 4) * 0.18;
      head.rotation.z = -s(time * 4) * 0.12;
      armL.rotation.set(s(time * 4) * 0.6, 0, -0.7);
      armR.rotation.set(-s(time * 4) * 0.6, 0, 0.7);
      legL.rotation.x = s(time * 4) * 0.25;
      legR.rotation.x = -s(time * 4) * 0.25;
      break;
    case "cheer":
      root.position.y = Math.abs(s(time * 5)) * 0.08;
      armL.rotation.set(0, 0, -2.7 + s(time * 10) * 0.25);
      armR.rotation.set(0, 0, 2.7 - s(time * 10) * 0.25);
      break;
    case "stretch":
      root.position.y = 0.03 + s(time * 1.5) * 0.03;
      armL.rotation.set(0, 0, -2.9);
      armR.rotation.set(0, 0, 2.9);
      torso.rotation.z = s(time * 1.5) * 0.12;
      head.rotation.x = -0.2;
      break;
    case "deepBow":
      root.position.y = 0;
      torso.rotation.x = 1.15;
      head.rotation.x = 0.45;
      armL.rotation.set(0.2, 0, 0);
      armR.rotation.set(0.2, 0, 0);
      break;
    case "kneelSit":
      root.position.y = -0.18;
      legL.rotation.x = legR.rotation.x = 1.5;
      armL.rotation.set(-0.7, 0.35, 0);
      armR.rotation.set(-0.7, -0.35, 0);
      torso.rotation.x = 0.08;
      head.rotation.x = 0.15;
      break;
    case "sit":
      root.position.y = -0.2;
      legL.rotation.x = legR.rotation.x = -1.45;
      armL.rotation.set(-0.4, 0, -0.1);
      armR.rotation.set(-0.4, 0, 0.1);
      head.rotation.x = s(time * 1.2) * 0.05;
      break;
    case "lie":
      root.rotation.x = -Math.PI / 2 * 0.96;
      root.position.y = 0.22;
      armL.rotation.set(0, 0, -0.35);
      armR.rotation.set(0, 0, 0.35);
      head.rotation.y = s(time * 0.8) * 0.15;
      break;
  }
  return true;
}
