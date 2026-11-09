// scene/weather.js - 天氣畫面：雨（大殿與各殿閣屋簷下不下雨）、多雲與雷雨的天色、閃電、地面濕亮、落瓣。
// 天氣種類由 app/weather.js 依時辰決定；這裡只負責畫面與聲音，疊在時辰天色（setShichen）之上。

// 有屋頂的地方：大殿含下層腰簷，以及廟埕兩側的殿閣與鐘鼓樓。角色雨具也用這份判斷是否在室內。
const TEMPLE_SHELTERS = [
  { x0: -9.1, x1: 9.1, z0: -5.5, z1: 8.0 },          // 大殿（腰簷外伸 2 公尺）
  { x: 13.5, z: 5.5, r: 3.6 }, { x: 13.5, z: 23.5, r: 3.6 },     // 文昌閣、月老閣
  { x: -13.5, z: 5.5, r: 3.6 }, { x: -13.5, z: 23.5, r: 3.6 },   // 太歲殿、財神洞
  { x: 9.5, z: 30, r: 2.6 }, { x: -9.5, z: 30, r: 2.6 }          // 鐘樓、鼓樓
];
function templeSheltered(x, z) {
  return TEMPLE_SHELTERS.some(s => s.r ? Math.hypot(x - s.x, z - s.z) < s.r : x > s.x0 && x < s.x1 && z > s.z0 && z < s.z1);
}

// 各天氣的陰暗程度（0 晴 → 1 最暗）、雨絲顆數（高畫質）、雨聲大小
const WEATHER_LOOK = {
  clear: { dark: 0, rain: 0, sound: 0 }, blossoms: { dark: 0, rain: 0, sound: 0 },
  cloudy: { dark: 0.35, rain: 0, sound: 0 },
  rain: { dark: 0.55, rain: 900, sound: 0.08 },
  storm: { dark: 0.8, rain: 1400, sound: 0.15 }
};
const WEATHER_RAIN_MAX = 1400;
const WEATHER_MESSAGES = {
  clear: ["☀️ 天朗氣清 • 晴空萬里", "☀️ 晴空碧藍，宮闕巍峨，陽光普照神威顯赫。"],
  cloudy: ["☁️ 雲蔭蔽日 • 清涼自在", "☁️ 雲層漸厚，廟埕陰涼，適合慢慢走走。"],
  rain: ["🌧️ 梵天甘霖 • 潤澤十方", "🌧️ 微雨飄落，滌淨廟埕青石塵埃；殿內與屋簷下不會淋到雨。"],
  storm: ["⛈️ 雷雨交加 • 心定神安", "⛈️ 雷雨來了，可以先到大殿或殿閣屋簷下避雨。"],
  blossoms: ["🌸 春桃芳菲 • 祥光普照", "🌸 桃花花瓣隨微風輕舞廟埕長廊，春滿人間，吉慶祥瑞。"]
};

class TempleWeatherMixin {
  // type：clear／cloudy／rain／storm／blossoms。announce：手動切換時顯示提示；quiet：開場第一次套用不提示
  setWeather(weatherType, { announce = true, quiet = false } = {}) {
    const type = Object.hasOwn(WEATHER_LOOK, weatherType) ? weatherType : "clear";
    this.currentWeather = type;
    const look = WEATHER_LOOK[type];
    this.weatherTarget = look.dark;
    if (this.weatherDark === undefined) this.weatherDark = quiet ? look.dark : 0;

    // 落瓣與雨各用一組粒子；換天氣時先清掉落瓣與漣漪，雨絲保留重用
    if (this.blossomPoints) { this.weatherGroup.remove(this.blossomPoints); this.blossomPoints.geometry.dispose(); this.blossomPoints.material.dispose(); this.blossomPoints = null; this.blossomSeeds = null; }
    this.groundRipples.forEach(r => { this.weatherGroup.remove(r.mesh); r.mesh.geometry.dispose(); r.mat.dispose(); });
    this.groundRipples = [];

    if (look.rain) {
      if (!this.rainPoints) this.buildRainPoints();
      this.rainPoints.visible = true;
      this.weatherPoints = this.rainPoints; this.weatherVels = this.rainVels;
      window.templeAudio?.startRainSound?.(look.sound);
      window.templeAudio?.setRainLevel?.(look.sound);
    } else {
      if (this.rainPoints) this.rainPoints.visible = false;
      this.weatherPoints = null; this.weatherVels = null;
      window.templeAudio?.stopRainSound?.();
      if (type === "blossoms") this.buildBlossomPoints();
    }
    this.weatherRainCount = look.rain;
    this.nextLightning = type === "storm" ? 3 + Math.random() * 6 : Infinity;

    const [floating, status] = WEATHER_MESSAGES[type];
    if (announce && !quiet) this.spawn3DFloatingText?.(floating, new THREE.Vector3(0, 3.5, 8.0));
    if (!quiet) window.setDockStatus?.(status);
    this.applyParticleBudget();
    this.applyWeatherLighting();
  }

  buildRainPoints() {
    const pos = new Float32Array(WEATHER_RAIN_MAX * 3), vels = new Float32Array(WEATHER_RAIN_MAX);
    for (let i = 0; i < WEATHER_RAIN_MAX; i++) {
      this.placeRainDrop(pos, i);
      pos[i * 3 + 1] = Math.random() * 14 + 0.5;
      vels[i] = 0.42 + Math.random() * 0.28;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    // 每顆是一條細長雨絲（貼圖中間一道直線），比圓點更像雨，顆數與負擔不變
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 64;
    const g = canvas.getContext("2d"), grad = g.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, "rgba(255,255,255,0)"); grad.addColorStop(0.5, "rgba(255,255,255,1)"); grad.addColorStop(1, "rgba(255,255,255,0.2)");
    g.fillStyle = grad; g.fillRect(30, 0, 4, 64);
    this.rainPoints = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xd6e8f7, size: 0.7, map: new THREE.CanvasTexture(canvas), transparent: true, opacity: 0.7, depthWrite: false }));
    this.rainPoints.name = "rainPoints";
    this.rainVels = vels;
    this.weatherGroup.add(this.rainPoints);
  }

  // 雨絲落在角色周圍約 16 公尺內（顆數不變、看起來更密），只落在沒有屋頂的地方
  placeRainDrop(pos, i) {
    const cx = this.avatar?.position?.x ?? 0, cz = this.avatar?.position?.z ?? 15;
    let x, z, tries = 0;
    do { x = cx + (Math.random() - 0.5) * 32; z = cz + (Math.random() - 0.5) * 32; } while (templeSheltered(x, z) && ++tries < 12);
    if (templeSheltered(x, z)) { x = cx; z = cz + 20; }   // 找不到露天位置時放到遠處，不落進屋內
    pos[i * 3] = x; pos[i * 3 + 2] = z;
  }

  buildBlossomPoints() {
    const count = 320, pos = new Float32Array(count * 3), seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 44; pos[i * 3 + 1] = Math.random() * 18 + 0.5; pos[i * 3 + 2] = Math.random() * 52 - 6;
      seeds[i] = Math.random() * 100;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.blossomPoints = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xff80ab, size: 0.26, transparent: true, opacity: 0.85 }));
    this.weatherGroup.add(this.blossomPoints);
    this.weatherPoints = this.blossomPoints; this.blossomSeeds = seeds;
  }

  // 地面雨滴漣漪
  spawnGroundRipple(x, z) {
    const geo = new THREE.RingGeometry(0.04, 0.09, 16);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0xbbdefb, transparent: true, opacity: 0.65, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.02, z);
    this.weatherGroup.add(mesh);
    this.groundRipples.push({ mesh, mat, life: 1.0 });
  }

  // 時辰天色換好後記下基準，天氣再依陰暗程度往下調
  captureWeatherBase() {
    this.weatherBase = {
      // 曝光不會被時辰重設，只記第一次的值，否則雨天換時辰會越調越暗
      exposure: this.weatherBase?.exposure ?? this.renderer?.toneMappingExposure ?? 1, sun: this.sunMoonLight?.intensity ?? 0, sky: this.skyLight?.intensity ?? 0, ambient: this.ambientLight?.intensity ?? 0,
      fog: this.scene.fog.density, fogColor: this.scene.fog.color.clone()
    };
  }

  applyWeatherLighting(flash = 0) {
    if (!this.weatherBase) this.captureWeatherBase();
    const b = this.weatherBase, d = this.weatherDark ?? 0;
    // 環境光很強且有色調映射，只調日光看不出差別；整體曝光一起往下調
    if (this.renderer) this.renderer.toneMappingExposure = b.exposure * (1 - 0.3 * d + flash * 0.18);
    if (this.sunMoonLight) this.sunMoonLight.intensity = b.sun * (1 - 0.7 * d);
    if (this.skyLight) this.skyLight.intensity = b.sky * (1 - 0.5 * d) + flash * 1.5;
    if (this.ambientLight) this.ambientLight.intensity = b.ambient * (1 - 0.45 * d) + flash * 0.8;
    this.scene.fog.density = b.fog * (1 + 1.2 * d);
    this.scene.fog.color.copy(b.fogColor).lerp(WEATHER_FOG_GRAY, d * 0.5);
    if (this.skyDome) this.skyDome.material.color.setScalar(1 - 0.55 * d + flash * 1.1);
    // 雨天地面濕亮：石板粗糙度降低
    const wet = Math.max(0, (d - 0.4) / 0.4);
    const surfaces = this.templeSurfaces || {};
    [surfaces.plazaInner, surfaces.plazaOuter].forEach(mat => {
      if (!mat) return;
      mat.userData.dryRoughness ??= mat.roughness;
      mat.roughness = mat.userData.dryRoughness * (1 - 0.55 * Math.min(1, wet));
    });
  }

  // 每幀：雨絲落下、落瓣飄動、漣漪、陰暗程度漸變、閃電
  updateWeather(time, dt) {
    const step = dt * 60;
    if (this.rainPoints?.visible && this.weatherVels) {
      const pos = this.rainPoints.geometry.attributes.position.array, n = this.rainPoints.geometry.drawRange.count;
      const wind = this.currentWeather === "storm" ? 0.06 : 0;
      for (let i = 0; i < Math.min(n, this.weatherVels.length); i++) {
        pos[i * 3 + 1] -= this.weatherVels[i] * step * (this.currentWeather === "storm" ? 1.35 : 1);
        pos[i * 3] += wind * step;
        if (pos[i * 3 + 1] < 0.05) {
          this.placeRainDrop(pos, i);
          pos[i * 3 + 1] = 12.0 + Math.random() * 3.0;
          if (Math.random() < 0.03 && this.groundRipples.length < 25) this.spawnGroundRipple(pos[i * 3], pos[i * 3 + 2]);
        }
      }
      this.rainPoints.geometry.attributes.position.needsUpdate = true;
    } else if (this.blossomPoints && this.blossomSeeds) {
      const pos = this.blossomPoints.geometry.attributes.position.array;
      for (let i = 0; i < this.blossomSeeds.length; i++) {
        const seed = this.blossomSeeds[i];
        pos[i * 3 + 1] -= 0.035 * step;
        pos[i * 3] += (Math.sin(time * 1.5 + seed) * 0.02 + 0.015) * step;
        pos[i * 3 + 2] += Math.cos(time * 1.2 + seed) * 0.01 * step;
        if (pos[i * 3 + 1] < 0.05) {
          pos[i * 3 + 1] = 18.0 + Math.random() * 2.0;
          pos[i * 3] = (Math.random() - 0.5) * 44;
          pos[i * 3 + 2] = Math.random() * 52 - 6;
        }
      }
      this.blossomPoints.geometry.attributes.position.needsUpdate = true;
    }

    for (let i = this.groundRipples.length - 1; i >= 0; i--) {
      const rip = this.groundRipples[i];
      rip.life -= 0.035 * step;
      rip.mesh.scale.multiplyScalar(1 + 0.04 * step);
      rip.mat.opacity = Math.max(0, rip.life * 0.65);
      if (rip.life <= 0) {
        this.weatherGroup.remove(rip.mesh); rip.mesh.geometry.dispose(); rip.mat.dispose();
        this.groundRipples.splice(i, 1);
      }
    }

    // 天色約 8 秒內漸變
    let changed = false;
    const target = this.weatherTarget ?? 0;
    if (this.weatherDark !== undefined && this.weatherDark !== target) {
      const delta = target - this.weatherDark, move = Math.sign(delta) * Math.min(Math.abs(delta), dt / 8);
      this.weatherDark += move; changed = true;
    }

    // 閃電：亮兩下約 0.3 秒；減少動態時不閃，只有雷聲
    let flash = 0;
    if (this.currentWeather === "storm") {
      this.nextLightning -= dt;
      if (this.nextLightning <= 0) {
        this.nextLightning = 18 + Math.random() * 30;
        if (!this.reduceMotion) this.lightningStart = time;
        window.templeAudio?.playThunder?.(0.6 + Math.random() * 2);
      }
    }
    if (this.lightningStart !== undefined) {
      const t = time - this.lightningStart;
      if (t > 0.32) { this.lightningStart = undefined; changed = true; }
      else { flash = t < 0.08 ? 1 : t < 0.16 ? 0.2 : t < 0.24 ? 0.7 : 0.15; changed = true; }
    }
    if (changed) this.applyWeatherLighting(flash);
  }
}
const WEATHER_FOG_GRAY = new THREE.Color(0x2a2e33);

installTempleMixin(TempleWeatherMixin);
