// Three.js 版本與 r128 外觀相容層（tools/three-entry.js）：升級 Three.js 後這組必須仍然通過
const { launch, newContext } = require("./helpers");

module.exports = {
  name: "Three.js 相容層",
  async run({ base, check }) {
    const browser = await launch();
    const ctx = await newContext(browser);
    const p = await ctx.newPage();
    const warnings = [];
    p.on("console", m => { if (m.type() === "warning" || m.type() === "error") warnings.push(m.text().slice(0, 160)); });
    await p.goto(base);

    const r = await p.evaluate(() => {
      const light = new THREE.PointLight(0xffffff, 2, 5);
      const spot = new THREE.SpotLight(0xffffff, 1.5);
      const amb = new THREE.AmbientLight(0xffffff, 0.5);
      const copy = light.clone();
      light.intensity = 3;
      return {
        revision: THREE.REVISION,
        pointIntensity: light.intensity / Math.PI,
        pointDecay: new THREE.PointLight(0xffffff, 1).decay,
        explicitDecay: new THREE.PointLight(0xffffff, 1, 0, 2).decay,
        spotDecay: spot.decay,
        spotIntensity: spot.intensity / Math.PI,
        ambIntensity: amb.intensity / Math.PI,
        cloneIntensity: copy.intensity / Math.PI,
        isLight: light.isPointLight && light instanceof THREE.Light,
        colorMgmt: THREE.ColorManagement.enabled,
        output: window.temple3d.renderer.outputColorSpace === THREE.LinearSRGBColorSpace,
        legacyFalloff: THREE.ShaderChunk.lights_pars_begin.includes("- lightDistance / cutoffDistance + 1.0"),
        orbit: typeof THREE.OrbitControls === "function" && window.temple3d.controls instanceof THREE.OrbitControls,
        loopSet: !!window.temple3d.renderer.xr
      };
    });
    check("Three.js 版本為 r187", r.revision === "187", r.revision);
    check("燈光強度以舊單位寫入、交給渲染器時乘 π", Math.abs(r.pointIntensity - 3) < 1e-9 && Math.abs(r.spotIntensity - 1.5) < 1e-9 && Math.abs(r.ambIntensity - 0.5) < 1e-9);
    check("複製燈光不會被乘兩次 π", Math.abs(r.cloneIntensity - 2) < 1e-9, String(r.cloneIntensity));
    check("點光源、聚光燈預設衰減維持 1", r.pointDecay === 1 && r.spotDecay === 1);
    check("明確指定的衰減值照樣生效", r.explicitDecay === 2);
    check("相容燈光仍是 THREE.PointLight", r.isLight);
    check("色彩管理關閉、輸出線性色彩（維持舊配色）", r.colorMgmt === false && r.output);
    check("著色器使用舊式線性距離衰減", r.legacyFalloff);
    check("OrbitControls 已打包並使用中", r.orbit);

    // 換場景、切天候、切畫質都不能冒出棄用警告
    await p.evaluate(() => {
      const t = window.temple3d;
      ["dawn", "noon", "dusk", "midnight"].forEach(s => t.setShichen(s));
      ["rain", "blossoms", "clear"].forEach(w => t.setWeather(w));
      ["high", "medium", "low"].forEach(q => templeQuality.setMode(q));
    });
    await p.waitForTimeout(1500);
    const unique = [...new Set(warnings)].filter(w => !/GPU stall|GL Driver Message|Automatic fallback to software WebGL/.test(w));
    check("載入與切換時沒有 Three.js 警告或錯誤", unique.length === 0, unique.slice(0, 3).join(" | "));
    await browser.close();
  }
};
