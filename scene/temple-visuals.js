// scene/temple-visuals.js - 畫面質感：程式繪製的材質、依時辰變化的天空、大殿殿身與重簷屋頂、殿內天花
// 全部在執行時用 Canvas 與幾何建立，不載入外部圖片或模型。

const HALL_HALF_WIDTH = 7.1;          // 大殿半寬（對齊後牆）
const HALL_HALF_DEPTH = 4.7;          // 大殿半深
const HALL_CENTER_Z = 1.25;           // 大殿中心（後牆 -3.4、前牆 5.95）
const HALL_WALL_HEIGHT = 8;

const TEMPLE_SKY_MOODS = {
  dawn:     { stops: ["#3b3f78", "#c9758f", "#ffc79a"], sun: [0.72, 0.44, "#ffe2b8"], cloud: "#ffd2c0", hill: "#4a3550", fog: 0xd9a08f, density: 0.006, hemi: [0xffd8c8, 0x6b4a40, 0.24], ambient: 0x916d7e, ambientLevel: 0.62 },
  noon:     { stops: ["#2f7fd0", "#7fc0ee", "#e9f1f0"], sun: [0.3, 0.16, "#fffbe8"], cloud: "#ffffff", hill: "#5d7f78", fog: 0xcfe2ea, density: 0.005, hemi: [0xffffff, 0x8a7050, 0.3], ambient: 0x8a7060, ambientLevel: 0.6 },
  dusk:     { stops: ["#2b2360", "#a83a5e", "#ff9a4a"], sun: [0.34, 0.46, "#ffe6a8"], cloud: "#ff8f70", hill: "#3a2036", fog: 0xb4604f, density: 0.007, hemi: [0xffc09a, 0x5a3040, 0.2], ambient: 0x752e25, ambientLevel: 0.7 },
  midnight: { stops: ["#050814", "#0e1a38", "#26304f"], sun: [0.62, 0.2, "#dfe8ff"], cloud: "#2a3558", hill: "#0c1120", fog: 0x0e1424, density: 0.012, hemi: [0x4a5a88, 0x1a1a22, 0.14], ambient: 0x1c2438, ambientLevel: 1.1 }
};

// 固定種子，材質每次長得一樣，截圖比對才有意義
function templeRandom(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

class TempleVisualsMixin {
  buildTempleVisuals() {
    this.templeTex = this.createTempleTextures();
    this.applyTempleSurfaces();
    this.buildSkyAndLand();
    this.buildMainHallShell();
    this.buildHallCeiling();
    this.setShichen?.(this.currentShichen, { silent: true });   // 開場就套用目前時辰
  }

  makeTempleTexture(size, draw, repeatX = 1, repeatY = 1) {
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    draw(canvas.getContext("2d"), size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.anisotropy = 8;
    return tex;
  }

  repeatedTexture(tex, repeatX, repeatY) {
    const copy = tex.clone();
    copy.repeat.set(repeatX, repeatY);
    copy.needsUpdate = true;
    return copy;
  }

  createTempleTextures() {
    const brick = this.makeTempleTexture(512, (g, s) => {
      const rnd = templeRandom(11), rows = 16, cols = 8, h = s / rows, w = s / cols;
      g.fillStyle = "#b9a48e"; g.fillRect(0, 0, s, s);
      for (let r = 0; r < rows; r++) {
        for (let c = -1; c < cols; c++) {
          const x = c * w + (r % 2 ? w / 2 : 0), v = rnd();
          g.fillStyle = `rgb(${150 + v * 46},${44 + v * 22},${30 + v * 14})`;
          g.fillRect(x + 1.5, r * h + 1.5, w - 3, h - 3);
          g.fillStyle = `rgba(0,0,0,${0.05 + rnd() * 0.1})`;
          g.fillRect(x + 1.5, r * h + h - 7, w - 3, 5.5);
        }
      }
    });
    const paver = this.makeTempleTexture(512, (g, s) => {
      const rnd = templeRandom(23), rows = 8, cols = 4, h = s / rows, w = s / cols;
      g.fillStyle = "#6b4a33"; g.fillRect(0, 0, s, s);
      for (let r = 0; r < rows; r++) {
        for (let c = -1; c < cols; c++) {
          const x = c * w + (r % 2 ? w / 2 : 0), v = rnd();
          g.fillStyle = `rgb(${176 + v * 40},${124 + v * 32},${82 + v * 24})`;
          g.fillRect(x + 2, r * h + 2, w - 4, h - 4);
        }
      }
      for (let i = 0; i < 2400; i++) {
        g.fillStyle = `rgba(${rnd() > 0.5 ? "60,36,20" : "235,205,165"},${0.06 + rnd() * 0.12})`;
        g.fillRect(rnd() * s, rnd() * s, 1 + rnd() * 2, 1 + rnd() * 2);
      }
    });
    const slate = this.makeTempleTexture(512, (g, s) => {
      const rnd = templeRandom(37), n = 2, t = s / n;
      g.fillStyle = "#14100e"; g.fillRect(0, 0, s, s);
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const v = rnd();
          g.fillStyle = `rgb(${62 + v * 22},${50 + v * 16},${42 + v * 12})`;
          g.fillRect(x * t + 3, y * t + 3, t - 6, t - 6);
          g.strokeStyle = "rgba(205,165,95,0.16)"; g.lineWidth = 1;
          for (let i = 0; i < 3; i++) {
            let px = x * t + rnd() * t, py = y * t + rnd() * t;
            g.beginPath(); g.moveTo(px, py);
            for (let k = 0; k < 5; k++) { px += (rnd() - 0.5) * 60; py += (rnd() - 0.5) * 60; g.lineTo(px, py); }
            g.stroke();
          }
        }
      }
    });
    const tile = this.makeTempleTexture(256, (g, s) => {
      const cols = 8, w = s / cols;
      for (let c = 0; c < cols; c++) {
        const grad = g.createLinearGradient(c * w, 0, (c + 1) * w, 0);
        grad.addColorStop(0, "#7a3208"); grad.addColorStop(0.45, "#f0a42c"); grad.addColorStop(0.7, "#d97f16"); grad.addColorStop(1, "#6a2a06");
        g.fillStyle = grad; g.fillRect(c * w, 0, w, s);
      }
      for (let y = 0; y < s; y += s / 4) {
        g.fillStyle = "rgba(50,18,4,0.55)"; g.fillRect(0, y, s, 5);
        g.fillStyle = "rgba(255,226,150,0.35)"; g.fillRect(0, y + 5, s, 3);
      }
    });
    const painted = this.makeTempleTexture(512, (g, s) => {
      g.fillStyle = "#123f45"; g.fillRect(0, 0, s, s);
      g.fillStyle = "#d4a034"; g.fillRect(0, 0, s, 34); g.fillRect(0, s - 34, s, 34);
      g.fillStyle = "#8a1818"; g.fillRect(0, 34, s, 26); g.fillRect(0, s - 60, s, 26);
      for (let i = 0; i < 4; i++) {
        const cx = i * 128 + 64, cy = s / 2;
        g.fillStyle = i % 2 ? "#b8301f" : "#1f7a6a";
        g.beginPath(); g.moveTo(cx - 56, cy); g.lineTo(cx, cy - 130); g.lineTo(cx + 56, cy); g.lineTo(cx, cy + 130); g.closePath(); g.fill();
        g.strokeStyle = "#e6bd5c"; g.lineWidth = 6; g.stroke();
        g.fillStyle = "#e6bd5c"; g.beginPath(); g.arc(cx, cy, 24, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#123f45"; g.beginPath(); g.arc(cx, cy, 11, 0, Math.PI * 2); g.fill();
      }
    });
    const coffer = this.makeTempleTexture(512, (g, s) => {
      const n = 4, t = s / n;
      g.fillStyle = "#3a120c"; g.fillRect(0, 0, s, s);
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const cx = x * t + t / 2, cy = y * t + t / 2;
          g.fillStyle = (x + y) % 2 ? "#1c5a55" : "#7c2318"; g.fillRect(x * t + 9, y * t + 9, t - 18, t - 18);
          g.strokeStyle = "#d4a034"; g.lineWidth = 5; g.strokeRect(x * t + 9, y * t + 9, t - 18, t - 18);
          g.beginPath(); g.arc(cx, cy, t * 0.25, 0, Math.PI * 2); g.stroke();
          g.fillStyle = "#e6bd5c"; g.beginPath(); g.arc(cx, cy, t * 0.09, 0, Math.PI * 2); g.fill();
        }
      }
    });
    return { brick, paver, slate, tile, painted, coffer };
  }

  // 既有的牆、地面換上材質；幾何與碰撞不變
  applyTempleSurfaces() {
    const s = this.templeSurfaces, t = this.templeTex;
    if (!s) return;
    const dress = (mat, map, color = 0xffffff, roughness = 0.8, metalness = 0) => {
      mat.map = map; mat.color.setHex(color); mat.roughness = roughness; mat.metalness = metalness; mat.needsUpdate = true;
    };
    dress(s.hallFloor, this.repeatedTexture(t.slate, 8, 5), 0xffffff, 0.3, 0.15);
    if (s.hallGrid) s.hallGrid.visible = false;
    // 殿內有神案聚光與宮燈，牆面要比室外深，否則會曝光過度
    dress(s.backWall.material, this.repeatedTexture(t.brick, 7, 4), 0x6a4a44);
    const screenMat = new THREE.MeshStandardMaterial({ map: this.repeatedTexture(t.brick, 2, 3), roughness: 0.8, color: 0xcfc0b4 });
    s.screens.forEach(mesh => { mesh.material = screenMat; mesh.castShadow = true; });
    dress(s.plazaInner, this.repeatedTexture(t.paver, 18, 9));
    dress(s.plazaOuter, this.repeatedTexture(t.paver, 19, 10), 0xe9dccb);
    dress(s.path, this.repeatedTexture(t.slate, 3, 20), 0xd9cfc4, 0.55, 0.05);
  }

  // 天空穹頂與遠方地面
  buildSkyAndLand() {
    this.skyTextures = {};
    this.skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(165, 32, 20),
      new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false })
    );
    this.skyDome.name = "skyDome";
    this.skyDome.position.set(0, 0, 15);
    this.skyDome.renderOrder = -10;
    this.skyDome.userData.noCollision = true;
    this.scene.add(this.skyDome);

    const land = new THREE.Mesh(new THREE.CircleGeometry(170, 48), new THREE.MeshStandardMaterial({ color: 0x3a4032, roughness: 1 }));
    land.name = "distantLand";
    land.rotation.x = -Math.PI / 2;
    land.position.set(0, -0.08, 15);
    land.userData.noCollision = true;
    this.scene.add(land);

    this.skyLight = new THREE.HemisphereLight(0xffffff, 0x665544, 0.6);
    this.scene.add(this.skyLight);
  }

  drawSky(mood) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024; canvas.height = 512;
    const g = canvas.getContext("2d"), w = canvas.width, h = canvas.height, horizon = h * 0.5;
    const rnd = templeRandom(53);
    const grad = g.createLinearGradient(0, 0, 0, horizon);
    grad.addColorStop(0, mood.stops[0]); grad.addColorStop(0.62, mood.stops[1]); grad.addColorStop(1, mood.stops[2]);
    g.fillStyle = grad; g.fillRect(0, 0, w, horizon);
    g.fillStyle = mood.stops[2]; g.fillRect(0, horizon, w, h - horizon);

    const [sx, sy, sunColor] = mood.sun, px = sx * w, py = sy * h;
    const glow = g.createRadialGradient(px, py, 2, px, py, 130);
    glow.addColorStop(0, sunColor); glow.addColorStop(0.12, sunColor); glow.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = glow; g.fillRect(px - 130, py - 130, 260, 260);

    g.fillStyle = mood.cloud;
    for (let i = 0; i < 26; i++) {
      const cx = rnd() * w, cy = horizon * (0.3 + rnd() * 0.62), len = 50 + rnd() * 130;
      g.globalAlpha = 0.1 + rnd() * 0.22;
      for (let k = 0; k < 5; k++) {
        g.beginPath();
        g.ellipse(cx + (k - 2) * len * 0.34, cy + (rnd() - 0.5) * 8, len * (0.3 + rnd() * 0.3), 5 + rnd() * 9, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.globalAlpha = 1;

    // 兩層遠山，遮住地平線
    [[0.82, 22, 0.75], [1, 12, 1]].forEach(([shade, height, alpha], layer) => {
      g.globalAlpha = alpha; g.fillStyle = mood.hill;
      g.beginPath(); g.moveTo(0, horizon + 4);
      for (let x = 0; x <= w; x += 8) {
        const y = Math.sin(x * 0.012 + layer * 2) * 0.5 + Math.sin(x * 0.031 + layer) * 0.3 + Math.sin(x * 0.0061) * 0.6;
        g.lineTo(x, horizon - (height + y * height * shade));
      }
      g.lineTo(w, horizon + 4); g.closePath(); g.fill();
    });
    g.globalAlpha = 1;
    g.fillStyle = mood.hill; g.fillRect(0, horizon, w, h - horizon);
    return new THREE.CanvasTexture(canvas);
  }

  // setShichen 的最後一步：換天空、霧與環境光
  applySkyMood(key) {
    if (!this.skyDome) return;
    const mood = TEMPLE_SKY_MOODS[key] || TEMPLE_SKY_MOODS.noon;
    if (!this.skyTextures[key]) this.skyTextures[key] = this.drawSky(mood);
    this.skyDome.material.map = this.skyTextures[key];
    this.skyDome.material.needsUpdate = true;
    this.scene.fog.color.setHex(mood.fog);
    this.scene.fog.density = mood.density;
    this.skyLight.color.setHex(mood.hemi[0]);
    this.skyLight.groundColor.setHex(mood.hemi[1]);
    this.skyLight.intensity = mood.hemi[2];
    if (this.ambientLight) { this.ambientLight.color.setHex(mood.ambient); this.ambientLight.intensity = mood.ambientLevel; }
  }

  // 屋面：從脊到簷內凹的曲面，角落起翹。原點在大殿中心，靠旋轉產生其他面。
  roofSurfaceGeometry({ halfTop, halfEave, zRidge, zEave, yRidge, yEave, lift, ridgeRise = 0, segU = 28, segV = 10 }) {
    const pos = [], uv = [], idx = [], slope = Math.hypot(zEave - zRidge, yRidge - yEave);
    for (let j = 0; j <= segV; j++) {
      const v = j / segV;
      for (let i = 0; i <= segU; i++) {
        const u = i / segU * 2 - 1, half = halfTop + (halfEave - halfTop) * v, a = Math.abs(u);
        pos.push(u * half, this.roofHeight(u, v, yRidge, yEave, lift, ridgeRise), zRidge + (zEave - zRidge) * v);
        uv.push(u * half / 1.6, v * slope / 1.6);
      }
    }
    const row = segU + 1;
    for (let j = 0; j < segV; j++) {
      for (let i = 0; i < segU; i++) {
        const a = j * row + i, b = a + 1, c = a + row, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }

  roofHeight(u, v, yRidge, yEave, lift, ridgeRise) {
    const a = Math.abs(u);
    return yEave + (yRidge - yEave) * Math.pow(1 - v, 1.6) + lift * Math.pow(a, 5) * v + ridgeRise * Math.pow(a, 4) * (1 - v);
  }

  // 簷口彩繪帶與滴水瓦
  addEaveTrim(group, spec, fasciaMat, dripMat, rotationY) {
    const { halfEave, zEave, yEave, lift } = spec, seg = 40, pos = [], uv = [], idx = [];
    const y0 = u => this.roofHeight(u, 1, spec.yRidge, yEave, lift, spec.ridgeRise || 0);
    for (let i = 0; i <= seg; i++) {
      const u = i / seg * 2 - 1, x = u * halfEave;
      pos.push(x, y0(u) + 0.02, zEave, x, y0(u) - 0.42, zEave);
      uv.push(x / 1.4, 1, x / 1.4, 0);
    }
    for (let i = 0; i < seg; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx); geo.computeVertexNormals();
    const band = new THREE.Mesh(geo, fasciaMat);
    band.rotation.y = rotationY;
    group.add(band);

    const count = Math.floor(halfEave * 2 / 0.3);
    const drips = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 10), dripMat, count);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), one = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < count; i++) {
      const u = (i + 0.5) / count * 2 - 1;
      m.compose(new THREE.Vector3(u * halfEave, y0(u) + 0.02, zEave + 0.03), q, one);
      drips.setMatrixAt(i, m);
    }
    drips.rotation.y = rotationY;
    group.add(drips);
  }

  tube(points, radius, material, radial = 10) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    return new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(24, points.length * 12), radius, radial, false), material);
  }

  buildMainHallShell() {
    const t = this.templeTex, W = HALL_HALF_WIDTH, D = HALL_HALF_DEPTH, H = HALL_WALL_HEIGHT;
    const group = new THREE.Group();
    group.name = "mainHallShell";
    group.position.set(0, 0, HALL_CENTER_Z);
    this.scene.add(group);

    const brickMat = new THREE.MeshStandardMaterial({ map: this.repeatedTexture(t.brick, 5, 4), roughness: 0.82 });
    const brickInner = new THREE.MeshStandardMaterial({ map: this.repeatedTexture(t.brick, 5, 4), roughness: 0.85, color: 0x6a4a44 });
    const paintMat = new THREE.MeshStandardMaterial({ map: this.repeatedTexture(t.painted, 1, 1), roughness: 0.55 });
    const fasciaMat = new THREE.MeshStandardMaterial({ map: this.repeatedTexture(t.painted, 1, 1), roughness: 0.5, side: THREE.DoubleSide });
    const tileMat = new THREE.MeshStandardMaterial({ map: t.tile, roughness: 0.34, metalness: 0.12 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a034, roughness: 0.32, metalness: 0.65 });
    const jadeMat = new THREE.MeshStandardMaterial({ color: 0x1f8a72, roughness: 0.35, metalness: 0.2 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0x8a1818, roughness: 0.45 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x9a9184, roughness: 0.85 });
    const add = (geo, mat, x, y, z, name) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      if (name) mesh.name = name;
      group.add(mesh);
      return mesh;
    };

    // 殿身：兩側山牆與門楣。門洞維持寬 6.9、高 5.5，原本的動線不變。
    [-1, 1].forEach(side => {
      // 方塊面序 +x、-x、+y、-y、+z、-z；朝殿內那面用較深的磚
      const faces = side < 0 ? [brickInner, brickMat] : [brickMat, brickInner];
      const wall = add(new THREE.BoxGeometry(0.3, H, D * 2 - 0.05), [...faces, brickMat, brickMat, brickMat, brickMat], side * (W + 0.1), H / 2, 0, "hallSideWall");
      wall.castShadow = true; wall.receiveShadow = true;
      add(new THREE.BoxGeometry(0.42, 0.8, D * 2 + 0.1), stoneMat, side * (W + 0.1), 0.4, 0, "hallPlinth");
    });
    const lintel = add(new THREE.BoxGeometry(W * 2 + 0.2, H - 5.5, 0.3), brickMat, 0, (H + 5.5) / 2, D - 0.1, "hallLintel");
    lintel.castShadow = true;
    add(new THREE.BoxGeometry(W * 2 + 0.2, 0.82, 0.36), paintMat, 0, 5.92, D - 0.08);

    // 前簷下的斗栱列
    const bracketCount = 22;
    const brackets = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.2, 0.42), goldMat, bracketCount);
    const blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.2, 0.24), redMat, bracketCount);
    const m = new THREE.Matrix4();
    for (let i = 0; i < bracketCount; i++) {
      const x = ((i + 0.5) / bracketCount * 2 - 1) * (W - 0.2);
      m.makeTranslation(x, 7.5, D + 0.2); brackets.setMatrixAt(i, m);
      m.makeTranslation(x, 7.28, D + 0.12); blocks.setMatrixAt(i, m);
    }
    group.add(brackets, blocks);

    // 正面匾額
    const sign = document.createElement("canvas");
    sign.width = 768; sign.height = 224;
    const g = sign.getContext("2d");
    g.fillStyle = "#1a0d0a"; g.fillRect(0, 0, 768, 224);
    g.strokeStyle = "#e6bd5c"; g.lineWidth = 14; g.strokeRect(10, 10, 748, 204);
    g.fillStyle = "#f0cd72"; g.font = "bold 128px 'Noto Serif TC', serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("賽博神殿", 384, 116);
    add(new THREE.BoxGeometry(4.2, 1.22, 0.1), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(sign), roughness: 0.4 }), 0, 6.86, D + 0.1, "hallFrontPlaque");

    // 兩側八角花窗
    const lattice = this.makeTempleTexture(256, (c, s) => {
      c.fillStyle = "#2a0f08"; c.fillRect(0, 0, s, s);
      c.strokeStyle = "#d4a034"; c.lineWidth = 7;
      for (let i = -s; i < s * 2; i += 42) {
        c.beginPath(); c.moveTo(i, 0); c.lineTo(i + s, s); c.stroke();
        c.beginPath(); c.moveTo(i, s); c.lineTo(i + s, 0); c.stroke();
      }
    });
    [-5.2, 5.2].forEach(x => {
      const frame = add(new THREE.CylinderGeometry(1.08, 1.08, 0.12, 8), goldMat, x, 3.1, D + 0.72);
      frame.rotation.x = Math.PI / 2; frame.rotation.y = Math.PI / 8;
      const pane = add(new THREE.CylinderGeometry(0.94, 0.94, 0.14, 8), new THREE.MeshStandardMaterial({ map: lattice, roughness: 0.6 }), x, 3.1, D + 0.73);
      pane.rotation.x = Math.PI / 2; pane.rotation.y = Math.PI / 8;
    });

    // 下層四面腰簷
    const lower = { yRidge: 9.1, yEave: 7.7, lift: 0.75 };
    const skirt = (half, depth, rotationY) => {
      const spec = { ...lower, halfTop: half - 0.3, halfEave: half + 2.0, zRidge: depth - 0.3, zEave: depth + 2.0 };
      const mesh = new THREE.Mesh(this.roofSurfaceGeometry(spec), tileMat);
      mesh.name = "hallLowerRoof";
      mesh.rotation.y = rotationY;
      mesh.castShadow = true;
      group.add(mesh);
      this.addEaveTrim(group, spec, fasciaMat, goldMat, rotationY);
    };
    skirt(W, D, 0); skirt(W, D, Math.PI); skirt(D, W, Math.PI / 2); skirt(D, W, -Math.PI / 2);
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) => {
      group.add(this.tube([
        [sx * (W - 0.3), 9.1, sz * (D - 0.3)], [sx * (W + 0.9), 8.05, sz * (D + 0.9)],
        [sx * (W + 2.0), 8.45, sz * (D + 2.0)], [sx * (W + 2.5), 9.1, sz * (D + 2.5)]
      ], 0.13, jadeMat));
    });

    // 上下層之間的彩繪牆
    add(new THREE.BoxGeometry((W - 0.4) * 2, 1.7, (D - 0.4) * 2), new THREE.MeshStandardMaterial({ map: this.repeatedTexture(t.painted, 6, 1), roughness: 0.55 }), 0, 9.75, 0);

    // 上層兩坡屋面與山花
    const upper = { halfTop: W - 0.2, halfEave: W + 0.5, zRidge: 0, zEave: D + 0.3, yRidge: 13.1, yEave: 10.2, lift: 0.7, ridgeRise: 0.32 };
    [0, Math.PI].forEach(rotationY => {
      const mesh = new THREE.Mesh(this.roofSurfaceGeometry(upper), tileMat);
      mesh.name = "hallUpperRoof";
      mesh.rotation.y = rotationY;
      mesh.castShadow = true;
      group.add(mesh);
      this.addEaveTrim(group, upper, fasciaMat, goldMat, rotationY);
    });
    const gable = new THREE.Shape();
    gable.moveTo(-(D + 0.2), 10.1);
    for (let i = 0; i <= 10; i++) gable.lineTo(-(D + 0.2) * (1 - i / 10), 10.1 + 2.95 * Math.pow(i / 10, 1.6));
    for (let i = 9; i >= 0; i--) gable.lineTo((D + 0.2) * (1 - i / 10), 10.1 + 2.95 * Math.pow(i / 10, 1.6));
    gable.closePath();
    [-1, 1].forEach(side => {
      const panel = new THREE.Mesh(new THREE.ShapeGeometry(gable), redMat);
      panel.position.set(side * (W - 0.45), 0, 0);
      panel.rotation.y = side * Math.PI / 2;
      group.add(panel);
      const crest = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.1, 8), goldMat);
      crest.position.set(side * (W - 0.4), 11.25, 0);
      crest.rotation.z = Math.PI / 2;
      group.add(crest);
      const crestCore = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.12, 8), jadeMat);
      crestCore.position.set(side * (W - 0.39), 11.25, 0);
      crestCore.rotation.z = Math.PI / 2;
      group.add(crestCore);
    });

    // 正脊：中段略低、兩端上揚，末端分岔成燕尾
    const ridgeTop = 13.1, end = W + 0.7;
    group.add(this.tube([
      [-end - 0.5, ridgeTop + 1.05, 0], [-end, ridgeTop + 0.6, 0], [-end + 1.4, ridgeTop + 0.22, 0], [-3, ridgeTop + 0.06, 0], [0, ridgeTop + 0.02, 0],
      [3, ridgeTop + 0.06, 0], [end - 1.4, ridgeTop + 0.22, 0], [end, ridgeTop + 0.6, 0], [end + 0.5, ridgeTop + 1.05, 0]
    ], 0.27, jadeMat, 12));
    group.add(this.tube([[-end + 0.6, ridgeTop + 0.5, 0.2], [-3, ridgeTop + 0.26, 0.2], [0, ridgeTop + 0.22, 0.2], [3, ridgeTop + 0.26, 0.2], [end - 0.6, ridgeTop + 0.5, 0.2]], 0.06, goldMat));
    [-1, 1].forEach(side => [-1, 1].forEach(fork => {
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.14, 1.1, 8), jadeMat);
      tail.position.set(side * (end + 0.8), ridgeTop + 1.4, fork * 0.16);
      tail.rotation.set(fork * 0.4, 0, -side * 0.55);
      group.add(tail);
    }));

    // 脊上雙龍朝中央寶珠
    const pearl = add(new THREE.SphereGeometry(0.42, 20, 16), new THREE.MeshStandardMaterial({ color: 0xffd76a, emissive: 0xff8a1a, emissiveIntensity: 0.9, roughness: 0.25, metalness: 0.3 }), 0, ridgeTop + 1.3, 0, "ridgePearl");
    add(new THREE.CylinderGeometry(0.2, 0.38, 0.7, 12), goldMat, 0, ridgeTop + 0.55, 0);
    add(new THREE.TorusGeometry(0.62, 0.05, 8, 28), goldMat, 0, pearl.position.y, 0);
    [-1, 1].forEach(side => this.addRidgeDragon(group, side, ridgeTop));

    // 門前高掛紅燈籠
    const lanternMat = new THREE.MeshStandardMaterial({ color: 0xc81e1e, emissive: 0xc01a10, emissiveIntensity: 0.75, roughness: 0.5 });
    [-5.6, -2.3, 2.3, 5.6].forEach(x => {
      const lantern = add(new THREE.SphereGeometry(0.42, 16, 12), lanternMat, x, 5.55, D + 1.35, "eaveLantern");
      lantern.scale.y = 1.15;
      add(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 12), goldMat, x, 6.06, D + 1.35);
      add(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 12), goldMat, x, 5.04, D + 1.35);
      add(new THREE.CylinderGeometry(0.015, 0.015, 1.5, 6), goldMat, x, 6.8, D + 1.35);
    });
  }

  // 程式生成的龍：蜿蜒的身體加上背鰭、頭與鬚
  addRidgeDragon(group, side, ridgeTop) {
    const body = new THREE.MeshStandardMaterial({ color: side > 0 ? 0xc8501e : 0x2a8f6a, roughness: 0.32, metalness: 0.35 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xe0b040, roughness: 0.3, metalness: 0.6 });
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14, x = side * (5.6 - t * 4.6);
      pts.push([x, ridgeTop + 0.55 + Math.sin(t * Math.PI * 3) * 0.32 + t * 0.3, Math.cos(t * Math.PI * 3) * 0.22]);
    }
    group.add(this.tube(pts, 0.15, body, 10));
    const finGeo = new THREE.ConeGeometry(0.075, 0.28, 5);
    for (let i = 1; i < 13; i += 1) {
      const fin = new THREE.Mesh(finGeo, gold);
      fin.position.set(pts[i][0], pts[i][1] + 0.2, pts[i][2]);
      group.add(fin);
    }
    const headAt = pts[pts.length - 1];
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 10), body);
    head.scale.set(1.5, 0.95, 0.95);
    head.position.set(headAt[0] - side * 0.22, headAt[1] + 0.05, headAt[2]);
    group.add(head);
    [-1, 1].forEach(s => {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.42, 6), gold);
      horn.position.set(head.position.x + side * 0.14, head.position.y + 0.3, head.position.z + s * 0.14);
      horn.rotation.z = side * 0.55;
      group.add(horn);
      group.add(this.tube([
        [head.position.x - side * 0.38, head.position.y - 0.04, head.position.z + s * 0.1],
        [head.position.x - side * 0.62, head.position.y + 0.12, head.position.z + s * 0.24],
        [head.position.x - side * 0.8, head.position.y + 0.02, head.position.z + s * 0.32]
      ], 0.016, gold, 5));
    });
  }

  // 殿內天花：彩繪格板、樑與中央八角藻井
  buildHallCeiling() {
    const t = this.templeTex, W = HALL_HALF_WIDTH, D = HALL_HALF_DEPTH, y = 7.62;
    const group = new THREE.Group();
    group.name = "hallCeiling";
    group.position.set(0, 0, HALL_CENTER_Z);
    this.scene.add(group);

    const panel = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, D * 2), new THREE.MeshStandardMaterial({ map: this.repeatedTexture(t.coffer, 4, 3), roughness: 0.65 }));
    panel.rotation.x = Math.PI / 2;   // 只朝下，鏡頭在屋內高處時不會被擋住
    panel.position.y = y;
    group.add(panel);

    const beamMat = new THREE.MeshStandardMaterial({ map: this.repeatedTexture(t.painted, 6, 1), roughness: 0.5 });
    [-3, 3].forEach(z => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(W * 2, 0.5, 0.42), beamMat);
      beam.position.set(0, y - 0.25, z);
      group.add(beam);
    });

    const colors = [0xd4a034, 0x1c5a55, 0x8a1818, 0xd4a034];
    colors.forEach((color, i) => {
      const ring = new THREE.Mesh(
        new THREE.CylinderGeometry(2.3 - i * 0.5, 2.5 - i * 0.5, 0.16, 8, 1, true),
        new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: i % 3 ? 0.1 : 0.55, side: THREE.DoubleSide })
      );
      ring.position.y = y - 0.08 + i * 0.002;
      ring.rotation.y = Math.PI / 8;
      group.add(ring);
    });
    const crown = new THREE.Mesh(new THREE.CircleGeometry(0.72, 8), new THREE.MeshStandardMaterial({ color: 0xffd76a, emissive: 0x8a4a10, emissiveIntensity: 0.5, roughness: 0.4 }));
    crown.rotation.x = Math.PI / 2;
    crown.position.y = y - 0.01;
    group.add(crown);
  }
}

installTempleMixin(TempleVisualsMixin);
