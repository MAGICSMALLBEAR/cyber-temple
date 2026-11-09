// scene/atmosphere.js - 氛圍：時辰光影、宮燈亮度、星空、金塵、天候、雨滴漣漪、畫質分級

class TempleAtmosphereMixin {
  // 繁星穹頂 (Night Starfield) - 覆蓋浩瀚三進聖境夜空
  buildStarField() {
    const starCount = 1200;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 85;
      positions[i * 3 + 1] = 10.0 + Math.random() * 32;
      positions[i * 3 + 2] = -15.0 + Math.random() * 75;

      const r = 0.8 + Math.random() * 0.2;
      const g = 0.85 + Math.random() * 0.15;
      const b = 0.95 + Math.random() * 0.05;
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.22,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    });

    this.starPoints = new THREE.Points(geo, mat);
    this.scene.add(this.starPoints);
  }

  // 四時辰光影晝夜切換 (卯時晨霧 / 午時金陽 / 酉時夕照 / 子時星空)
  // 適應廣闊 40 米大埕視野，霧氣濃度調降為 0.009 ~ 0.016 確保深遠景深
  setShichen(shichenKey, { silent = false } = {}) {
    this.currentShichen = shichenKey;
    let actualKey = shichenKey;
    if (shichenKey === "auto") {
      const h = new Date().getHours();
      if (h >= 5 && h < 9) actualKey = "dawn";
      else if (h >= 9 && h < 16) actualKey = "noon";
      else if (h >= 16 && h < 19) actualKey = "dusk";
      else actualKey = "midnight";
    }

    if (actualKey === "dawn") {
      this.renderer.setClearColor(0x281926, 1);
      this.scene.fog.color.setHex(0x352033);
      this.scene.fog.density = 0.012;
      if (this.ambientLight) this.ambientLight.color.setHex(0x916d7e);
      if (this.mainSpot) { this.mainSpot.color.setHex(0xffe6c2); this.mainSpot.intensity = 2.4; }
      if (this.sunMoonLight) {
        this.sunMoonLight.color.setHex(0xffb896);
        this.sunMoonLight.intensity = 1.4;
        this.sunMoonLight.position.set(16, 18, 26);
      }
      if (this.starPoints) this.starPoints.material.opacity = 0;
      this.setLanternsIntensity(1.0);
    } else if (actualKey === "noon") {
      this.renderer.setClearColor(0x1a120e, 1);
      this.scene.fog.color.setHex(0x241812);
      this.scene.fog.density = 0.009;
      if (this.ambientLight) this.ambientLight.color.setHex(0x7a3d2e);
      if (this.mainSpot) { this.mainSpot.color.setHex(0xffdf88); this.mainSpot.intensity = 3.2; }
      if (this.sunMoonLight) {
        this.sunMoonLight.color.setHex(0xfff6df);
        this.sunMoonLight.intensity = 2.0;
        this.sunMoonLight.position.set(8, 28, 20);
      }
      if (this.starPoints) this.starPoints.material.opacity = 0;
      this.setLanternsIntensity(1.2);
    } else if (actualKey === "dusk") {
      this.renderer.setClearColor(0x240d12, 1);
      this.scene.fog.color.setHex(0x36141a);
      this.scene.fog.density = 0.014;
      if (this.ambientLight) this.ambientLight.color.setHex(0x752e25);
      if (this.mainSpot) { this.mainSpot.color.setHex(0xff8833); this.mainSpot.intensity = 2.6; }
      if (this.sunMoonLight) {
        this.sunMoonLight.color.setHex(0xff5511);
        this.sunMoonLight.intensity = 1.6;
        this.sunMoonLight.position.set(-18, 16, 24);
      }
      if (this.starPoints) this.starPoints.material.opacity = 0.25;
      this.setLanternsIntensity(1.8);
    } else if (actualKey === "midnight") {
      this.renderer.setClearColor(0x050711, 1);
      this.scene.fog.color.setHex(0x080c18);
      this.scene.fog.density = 0.016;
      if (this.ambientLight) this.ambientLight.color.setHex(0x1c2438);
      if (this.mainSpot) { this.mainSpot.color.setHex(0xffb555); this.mainSpot.intensity = 2.3; }
      if (this.sunMoonLight) {
        this.sunMoonLight.color.setHex(0x6688cc);
        this.sunMoonLight.intensity = 1.0;
        this.sunMoonLight.position.set(12, 22, 22);
      }
      if (this.starPoints) this.starPoints.material.opacity = 0.95;
      this.setLanternsIntensity(2.4);
    }

    this.applySkyMood?.(actualKey);
    // 天氣的陰暗與閃電以時辰天色為基準往下調
    this.captureWeatherBase?.();
    this.applyWeatherLighting?.();

    if (!silent && window.templeAudio) {
      window.templeAudio.playShichenChime(actualKey);
    }
  }

  setLanternsIntensity(factor) {
    this.lanternLights.forEach(light => {
      light.intensity = 1.2 * factor;
      light.distance = 4.5 * factor;
    });
  }

  // 天氣（雨、雷雨、落瓣）在 scene/weather.js


  setupDustParticles() {
    const particleCount = 260;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 12;
      positions[i + 1] = 0.2 + Math.random() * 5.0;
      positions[i + 2] = -2 + Math.random() * 16;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffd700,
      size: 0.045,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });

    this.dustPoints = new THREE.Points(geo, mat);
    this.scene.add(this.dustPoints);
  }

  // ---------- 畫質分級 ----------
  applyQuality(preset) {
    this.qualityPreset = preset;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, preset.maxPixelRatio));
    this.onWindowResize();

    // r187 已移除 PCFSoftShadowMap，柔和陰影改以 PCF 陰影的模糊半徑實現
    const shadowType = THREE.PCFShadowMap;
    [this.sunMoonLight, this.mainSpot].forEach(light => { if (light) light.shadow.radius = preset.softShadows ? 4 : 1; });
    const shadowsChanged = this.renderer.shadowMap.enabled !== preset.shadows || this.renderer.shadowMap.type !== shadowType;
    this.renderer.shadowMap.enabled = preset.shadows;
    this.renderer.shadowMap.type = shadowType;
    [[this.sunMoonLight, preset.sunShadowSize], [this.mainSpot, preset.spotShadowSize]].forEach(([light, size]) => {
      if (!light || light.shadow.mapSize.width === size) return;
      light.shadow.mapSize.set(size, size);
      // 舊的陰影貼圖要丟掉，three 才會以新尺寸重建
      if (light.shadow.map) {
        light.shadow.map.dispose();
        light.shadow.map = null;
      }
    });
    // 陰影開關或類型改變後，所有材質都要重新編譯
    if (shadowsChanged) {
      this.scene.traverse(obj => {
        if (!obj.material) return;
        (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => { m.needsUpdate = true; });
      });
    }
    this.applyVisualQuality?.(preset);
    this.applyParticleBudget();
    this.applyLightBudget();
  }

  // 粒子只畫前面一部分，不重建幾何
  applyParticleBudget() {
    const factor = this.qualityPreset ? this.qualityPreset.particles : 1;
    [this.starPoints, this.dustPoints, this.weatherPoints].forEach(points => {
      if (!points) return;
      // 雨絲幾何是共用的，小雨只畫一部分，雷雨畫全部
      const total = points === this.rainPoints ? this.weatherRainCount || 0 : points.geometry.attributes.position.count;
      // 減少動態：飄動與落下的粒子（金塵、雨、花瓣）不畫
      const moving = points === this.dustPoints || points === this.weatherPoints;
      points.geometry.setDrawRange(0, this.reduceMotion && moving ? 0 : Math.max(1, Math.floor(total * factor)));
    });
  }

  setReducedMotion(on) {
    this.reduceMotion = !!on;
    this.applyParticleBudget();
  }

  // 低畫質關掉裝飾用點光源（每盞點光源都會增加每個像素的計算），只留神像主光
  applyLightBudget() {
    const allow = !this.qualityPreset || this.qualityPreset.decorLights;
    this.scene.traverse(obj => {
      if (obj.isPointLight && obj !== this.shrineBacklight && obj.visible !== allow) obj.visible = allow;
    });
  }
}

installTempleMixin(TempleAtmosphereMixin);
