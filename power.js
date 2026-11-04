// 繪圖節流與畫質分開：閒置不被判成跑不動，背景暫停繪圖仍保留連線心跳。
const templePower = {
  enabled: localStorage.getItem("temple_idle_power") !== "off",
  limit: [0, 30, 60].includes(Number(localStorage.getItem("temple_frame_limit"))) ? Number(localStorage.getItem("temple_frame_limit")) : 0,
  idleAfter: 30000,
  lastActive: performance.now(),
  lastRendered: -Infinity,
  status: "active",
  wake() {
    this.lastActive = performance.now();
    this.lastRendered = -Infinity;
    this.status = "active";
  },
  isBusy(scene) {
    const a = scene.avatar;
    return !!(a && (a.targetPos || Object.values(a.keys).some(Boolean) || ["walk", "bow", "kneel", "jump", "wave", "clap", "sway", "cheer", "stretch"].includes(a.currentAction)) ||
      scene.isBwaTossing || scene.isChiamShaking || scene.isBurningPaper || scene.isParading ||
      window.chiamRitual?.busy || window.nightMarket?.playing || window.nightMarket?.puppetPlaying ||
      (a?.peers && [...a.peers.values()].some(p => p.action === "walk")));
  },
  shouldRender(now, scene) {
    if (scene.isXR) { this.status = "vr"; return true; }
    if (document.hidden) { this.status = "hidden"; return false; }
    if (this.isBusy(scene)) this.lastActive = now;
    const idle = this.enabled && now - this.lastActive >= this.idleAfter;
    this.status = idle ? "idle" : "active";
    const fps = idle ? 15 : this.limit;
    if (fps && now - this.lastRendered < 1000 / fps - 1) return false;
    this.lastRendered = now;
    return true;
  },
  get throttled() { return this.status === "idle" || this.status === "hidden"; },
  renderUI() {
    document.getElementById("chkIdlePower").checked = this.enabled;
    document.getElementById("selectFrameLimit").value = String(this.limit);
  },
  init() {
    this.renderUI();
    for (const name of ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"]) {
      window.addEventListener(name, () => this.wake(), { passive: true });
    }
    document.addEventListener("visibilitychange", () => {
      this.wake();
      if (window.temple3d) {
        window.temple3d.lastTime = performance.now();
        window.temple3d.avatar?.broadcastMyState(true);
      }
      window.templeQuality?.startFpsMonitor();
    });
    document.getElementById("chkIdlePower").addEventListener("change", e => {
      this.enabled = e.target.checked;
      localStorage.setItem("temple_idle_power", this.enabled ? "on" : "off"); this.wake();
    });
    document.getElementById("selectFrameLimit").addEventListener("change", e => {
      this.limit = Number(e.target.value);
      localStorage.setItem("temple_frame_limit", String(this.limit)); this.wake();
      window.templeQuality?.startFpsMonitor();
    });
  }
};
window.templePower = templePower;
