// avatar/appearance.js - 分身外觀與表情動作：捏臉（膚色、五官、配件）、髮型、頭上表情、持續動作
// 自己的分身與同行分身共用這份程式，別人看到的你和你自己看到的一致。
// 同行送來的設定一律只當作選項代號查表，查不到就用預設，不會把任意內容畫到畫面上。

const AVATAR_SKIN_TONES = { fair: "#ffe3cc", light: "#f5c9a3", tan: "#d9a47c", deep: "#a8724f" };
const AVATAR_HAIR_COLORS = { black: "#1a1110", brown: "#5a3520", chestnut: "#8a4b2a", silver: "#c9c9c9", gold: "#d9a53a" };

const AVATAR_OPTIONS = {
  skin: { label: "膚色", choices: { fair: "白皙", light: "自然", tan: "小麥", deep: "古銅" } },
  eyes: { label: "眼睛", choices: { round: "圓眼", smile: "笑眼", big: "大眼", closed: "閉目", dot: "豆豆眼", star: "星星眼", heart: "愛心眼", squint: "瞇瞇眼", wink: "眨眼", droopy: "下垂眼", swirl: "漩渦眼", teary: "淚眼" } },
  brows: { label: "眉毛", choices: { none: "無", thin: "細眉", thick: "粗眉", worried: "八字眉", angry: "劍眉" } },
  mouth: { label: "嘴巴", choices: { smile: "微笑", small: "小口", grin: "大笑", cat: "貓嘴", flat: "一字嘴", tongue: "吐舌" } },
  blush: { label: "腮紅", choices: { none: "無", soft: "淡淡", rosy: "紅潤" } },
  faceAcc: { label: "臉部配件", choices: { none: "無", glasses: "眼鏡", sunglasses: "墨鏡", mask: "口罩", mole: "美人痣", freckles: "雀斑", bandaid: "OK 繃", beard: "鬍子", whiskers: "貓鬍鬚", tikka: "眉心紅點", heart: "愛心貼紙" } },
  hair: { label: "髮型", choices: { none: "光頭", short: "短髮", bangs: "齊瀏海", twinbuns: "雙丸子", ponytail: "馬尾", long: "長髮", twintails: "雙馬尾", curly: "捲髮" } },
  hairColor: { label: "髮色", choices: { black: "烏黑", brown: "深棕", chestnut: "栗色", silver: "銀灰", gold: "金色" } }
};

const AVATAR_DEFAULT_LOOK = { skin: "light", eyes: "round", brows: "none", mouth: "smile", blush: "soft", faceAcc: "none", hair: "short", hairColor: "black" };

// 只保留合法的選項代號
function normalizeLook(cfg = {}) {
  const look = {};
  for (const key of Object.keys(AVATAR_DEFAULT_LOOK)) {
    look[key] = AVATAR_OPTIONS[key].choices[cfg[key]] ? cfg[key] : AVATAR_DEFAULT_LOOK[key];
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
const LOOK_CODE_KEYS = ["skin", "eyes", "brows", "mouth", "blush", "faceAcc", "hair", "hairColor"];
function encodeLookCode(cfg) {
  const look = normalizeLook(cfg);
  const parts = LOOK_CODE_KEYS.map(k => Object.keys(AVATAR_OPTIONS[k].choices).indexOf(look[k]).toString(36));
  const color = String(cfg.robeColor || "#c24b2b").replace("#", "").toLowerCase();
  return `TP-${parts.join("")}-${/^[0-9a-f]{6}$/.test(color) ? color : "c24b2b"}`;
}

function decodeLookCode(code) {
  const m = String(code || "").trim().match(/^TP-([0-9a-z]{8})-([0-9a-fA-F]{6})$/);
  if (!m) return null;
  const look = {};
  for (let i = 0; i < LOOK_CODE_KEYS.length; i++) {
    const k = LOOK_CODE_KEYS[i];
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
  if (look.hair === "none") return [];
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
    case "twintails": add(new THREE.ConeGeometry(0.07, 0.4, 10), -0.26, HY - 0.08, -0.04, 0, -0.25); add(new THREE.ConeGeometry(0.07, 0.4, 10), 0.26, HY - 0.08, -0.04, 0, 0.25); break;
    case "curly": for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; add(new THREE.SphereGeometry(0.065, 8, 8), Math.cos(a) * 0.22, HY + 0.08 + Math.sin(k) * 0.04, Math.sin(a) * 0.2 - 0.05); } break;
  }
  return parts;
}

function avatarSkinColor(cfg) {
  return AVATAR_SKIN_TONES[normalizeLook(cfg).skin];
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
  deepBow: { icon: "🙇", label: "鞠躬九十度" }, sit: { icon: "🪑", label: "坐下休息" }, lie: { icon: "🛌", label: "躺平休息" }
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
