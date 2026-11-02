// quality.js - 畫質分級：高／中／低／自動
// 自動模式：依硬體猜起始等級，再實測幀率，持續偏低就自動降一級（只降不升，避免來回跳動）

const QUALITY_KEY = "temple_quality";

const QUALITY_PRESETS = {
  high:   { label: "高", maxPixelRatio: 2,   shadows: true,  softShadows: true,  sunShadowSize: 2048, spotShadowSize: 1024, particles: 1.0,  decorLights: true,  antialias: true },
  medium: { label: "中", maxPixelRatio: 1.5, shadows: true,  softShadows: false, sunShadowSize: 1024, spotShadowSize: 512,  particles: 0.6,  decorLights: true,  antialias: true },
  low:    { label: "低", maxPixelRatio: 1,   shadows: false, softShadows: false, sunShadowSize: 512,  spotShadowSize: 512,  particles: 0.35, decorLights: false, antialias: false }
};
const QUALITY_ORDER = ["high", "medium", "low"];

const FPS_WARMUP_MS = 5000;     // 剛載入時著色器編譯會卡，先不量
const FPS_WINDOW_MS = 4000;
const FPS_LOW_THRESHOLD = 28;

const templeQuality = {
  mode: localStorage.getItem(QUALITY_KEY) || "auto",   // auto | high | medium | low
  level: null,                                          // 實際套用中的等級
  fps: 0,
  scene: null,

  // 自動模式的起始猜測
  guessLevel() {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      if (!gl) return "low";
      const info = gl.getExtension("WEBGL_debug_renderer_info");
      const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
      // 軟體繪圖（沒有可用的顯示卡）
      if (/swiftshader|llvmpipe|software|basic render/i.test(renderer)) return "low";
      const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
      const cores = navigator.hardwareConcurrency || 4;
      const memory = navigator.deviceMemory || 8;
      if (coarse || cores <= 4 || memory <= 4) return "medium";
      return "high";
    } catch (e) {
      return "medium";
    }
  },

  resolveLevel() {
    if (this.level) return this.level;
    this.level = this.mode === "auto" ? this.guessLevel() : this.mode;
    return this.level;
  },

  get preset() {
    return QUALITY_PRESETS[this.resolveLevel()];
  },

  // temple3d 建好場景後呼叫
  attach(scene3d) {
    this.scene = scene3d;
    scene3d.applyQuality(this.preset);
    this.startFpsMonitor();
    this.renderUI();
  },

  setMode(mode) {
    if (mode !== "auto" && !QUALITY_PRESETS[mode]) return;
    const prevAntialias = this.preset.antialias;
    this.mode = mode;
    localStorage.setItem(QUALITY_KEY, mode);
    this.level = null;
    this.lowFpsWindows = 0;
    if (this.scene) this.scene.applyQuality(this.preset);
    this.renderUI(prevAntialias !== this.preset.antialias);
  },

  stepDown() {
    const i = QUALITY_ORDER.indexOf(this.level);
    if (i < 0 || i >= QUALITY_ORDER.length - 1) return false;
    this.level = QUALITY_ORDER[i + 1];
    if (this.scene) this.scene.applyQuality(this.preset);
    this.renderUI();
    const msg = `🖥️ 畫面不太順，已自動把畫質調為「${this.preset.label}」。可在 ⚙️ 設定 調整。`;
    if (window.liveTempleWall) window.liveTempleWall.showBroadcastNotice(msg);
    return true;
  },

  startFpsMonitor() {
    let frames = 0;
    let windowStart = performance.now() + FPS_WARMUP_MS;
    const tick = (now) => {
      requestAnimationFrame(tick);
      // 分頁在背景時瀏覽器會降頻，不列入計算
      if (document.hidden) { frames = 0; windowStart = now + 1000; return; }
      if (now < windowStart) return;
      frames++;
      const elapsed = now - windowStart;
      if (elapsed < FPS_WINDOW_MS) return;
      this.fps = Math.round((frames * 1000) / elapsed);
      frames = 0;
      windowStart = now;
      this.renderFps();
      // 連續兩個量測區間都偏低才降，避免單次卡頓誤判
      if (this.mode === "auto" && this.fps < FPS_LOW_THRESHOLD) {
        this.lowFpsWindows = (this.lowFpsWindows || 0) + 1;
        if (this.lowFpsWindows >= 2) {
          this.lowFpsWindows = 0;
          if (this.stepDown()) windowStart = now + FPS_WARMUP_MS;
        }
      } else {
        this.lowFpsWindows = 0;
      }
    };
    requestAnimationFrame(tick);
  },

  renderFps() {
    const el = document.getElementById("qualityFps");
    if (el) el.textContent = this.fps ? `目前約 ${this.fps} FPS` : "量測中…";
  },

  renderUI(antialiasChanged = false) {
    const select = document.getElementById("selectQuality");
    if (select) {
      select.value = this.mode;
      const autoOpt = select.querySelector('option[value="auto"]');
      if (autoOpt) autoOpt.textContent = this.mode === "auto" ? `自動（目前：${this.preset.label}）` : "自動";
    }
    const note = document.getElementById("qualityNote");
    if (note && antialiasChanged) note.textContent = "抗鋸齒的切換會在下次開啟神殿時生效。";
    this.renderFps();
  },

  init() {
    const select = document.getElementById("selectQuality");
    select?.addEventListener("change", () => this.setMode(select.value));
    this.renderUI();
  }
};

window.templeQuality = templeQuality;
