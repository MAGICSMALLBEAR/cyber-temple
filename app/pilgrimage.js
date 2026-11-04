// app/pilgrimage.js - 完整參拜流程：服務處請香 → 天公爐敬天 → 正殿上香 → 擺供品 → 跪拜稟告 → 擲筊求籤 → 金爐化金紙
// 右上角「🧭 參拜指引」卡：離目標遠時「前往」會自動走過去（從大殿到廟埕先經過正門），走到附近按鈕變成這一步的動作。
// 進度聽 temple:ritual 事件；每一步都需在現場完成。進度存在 localStorage。

const PILGRIM_KEY = "temple_pilgrimage";
const PILGRIM_REWARD = 168;

const PILGRIM_STEPS = [
  { id: "supplies", title: "服務處請香", hint: "走出大殿正門，右手邊的服務處領取清香與金紙。", spot: [SERVICE_DESK_POS[0] + 1.1, SERVICE_DESK_POS[1]], face: SERVICE_DESK_POS, radius: 1.8, action: "🧧 領取", done: "supplies" },
  { id: "heaven", title: "天公爐敬天", hint: "參拜先敬天：到廟埕中央的天公爐上香三拜。", spot: [0, 9.6], face: [0, 11.5], radius: 1.9, action: "🔥 上香", done: "heavenCenser" },
  { id: "main", title: "正殿向主神上香", hint: "回到大殿神案前，向主神上香。", spot: [0, 1.7], face: [0, -1], radius: 2.4, action: "🔥 上香", done: "incense", nearOnly: true },
  { id: "offer", title: "擺上供品", hint: "在神案擺好供品，恭行三獻禮呈獻。", spot: [0, 1.7], face: [0, -1], radius: 3.2, action: "🍱 擺供品", done: "feast" },
  { id: "kneel", title: "跪拜稟告", hint: "在神前跪拜，心中稟明姓名、住址與所求。", spot: [0, 1.7], face: [0, -1], radius: 3.2, action: "🧎 跪拜", done: "bow", nearOnly: true },
  { id: "chiam", title: "擲筊求籤", hint: "擲筊請示後求一支籤，聖筊確認後展開籤詩。", spot: [0, 1.7], face: [0, -1], radius: 3.5, action: "🎋 求籤", done: "chiamReceived" },
  { id: "paper", title: "金爐化金紙", hint: "到廟埕西側的八角金爐，把金紙焚化給神明，參拜圓滿。", spot: [-12.5, 12.3], face: [-12.5, 14.5], radius: 2.4, action: "🔥 化金紙", done: "paper", nearOnly: true }
];

const pilgrimage = {
  data: null,
  route: null,
  routeTimer: null,

  load() {
    try {
      const d = JSON.parse(localStorage.getItem(PILGRIM_KEY) || "null");
      if (d && Number.isInteger(d.step) && d.step >= 0 && d.step < PILGRIM_STEPS.length) {
        return { active: d.active === true, step: d.step, completed: Number.isSafeInteger(d.completed) && d.completed >= 0 ? d.completed : 0 };
      }
    } catch (e) {}
    return { active: false, step: 0, completed: 0 };
  },

  save() {
    localStorage.setItem(PILGRIM_KEY, JSON.stringify(this.data));
  },

  get avatar() {
    return temple3d && temple3d.avatar;
  },

  get step() {
    return this.data.active ? PILGRIM_STEPS[this.data.step] : null;
  },

  distanceTo(spot) {
    const a = this.avatar;
    if (!a || !spot) return Infinity;
    return Math.hypot(a.position.x - spot[0], a.position.z - spot[1]);
  },

  isNear(step = this.step) {
    return !!step && this.distanceTo(step.spot) < step.radius;
  },

  // ---------- 流程 ----------
  start() {
    this.cancelRoute();
    this.data.active = true;
    this.data.step = 0;
    this.save();
    this.render();
    this.notify("🧭 開始完整參拜：依指引從服務處請香開始，按「前往」會自動走過去。");
  },

  stop() {
    this.cancelRoute();
    this.data.active = false;
    this.save();
    this.render();
  },

  onRitual(type, detail = {}) {
    const step = this.step;
    if (!step || step.done !== type) return;
    if (!this.isNear(step)) {
      this.notify(`🧭 「${step.title}」要在現場進行：請按「前往」走到定點再做一次。`);
      return;
    }
    if (step.id === "kneel" && detail.action !== "kneel") return;
    if (step.id === "chiam" && !detail.confirmed) return;
    this.advance();
  },

  advance() {
    this.cancelRoute();
    this.data.step++;
    if (this.data.step >= PILGRIM_STEPS.length) {
      this.data.active = false;
      this.data.step = 0;
      this.data.completed = (this.data.completed || 0) + 1;
      this.save();
      this.render();
      if (window.addMerit) window.addMerit(PILGRIM_REWARD);
      this.notify(`🎉 完整參拜圓滿！從請香、敬天、上香、獻供、稟告、求籤到化金紙，禮數周全，功德 +${PILGRIM_REWARD}。`);
      return;
    }
    this.save();
    this.render();
    this.notify(`🧭 參拜指引 ${this.data.step + 1}/${PILGRIM_STEPS.length}：${this.step.title}`);
  },

  // 服務處：[E] 或指引卡上的「領取」
  claimSupplies() {
    if (this.distanceTo(PILGRIM_STEPS[0].spot) >= PILGRIM_STEPS[0].radius) {
      this.notify("🧧 請先到服務處櫃台旁，再領取清香與金紙。");
      return;
    }
    const step = this.step;
    window.templeInventory?.claimDaily();
    window.templeAudio?.playBell(620);
    if (step && step.id === "supplies") {
      window.emitRitual?.("supplies");
      this.notify("🧧 香品已備妥；庫存與每日補給可在背包查看，接著到天公爐敬天。");
    } else {
      window.templeBag?.open("shop");
    }
  },

  // 指引卡的主按鈕：遠的時候前往，近的時候做這一步
  primary() {
    const step = this.step;
    if (!step) { this.start(); return; }
    if (!this.isNear(step)) { this.goTo(step); return; }
    this.faceTarget(step);
    switch (step.id) {
      case "supplies": this.claimSupplies(); break;
      case "heaven": temple3d.triggerNearbyInteraction(); break;
      case "main": document.getElementById("btnLightIncense")?.click(); break;
      case "offer": window.openFeastModal?.(); break;
      case "kneel": document.getElementById("btnActionKneel")?.click(); break;
      case "chiam": window.chiamRitual?.start(); break;
      case "paper": document.getElementById("btnBurnPaper")?.click(); break;
    }
  },

  // ---------- 自動走過去 ----------
  planRoute(dest) {
    const a = this.avatar;
    return temple3d.findWalkRoute([a.position.x, a.position.z], dest);
  },

  goTo(step) {
    const a = this.avatar;
    if (!a) return;
    this.cancelRoute();
    const points = this.planRoute(step.spot);
    if (!points.length) { this.notify("🧭 暫時找不到通路，請移動到空曠處再試一次。"); return; }
    this.route = { points, index: 0, step };
    this.route.sprinting = a.isSprinting;
    a.isSprinting = true;
    this.nextWaypoint();
    this.routeTimer = setInterval(() => this.tickRoute(), 150);
    this.render();
  },

  nextWaypoint() {
    const [x, z] = this.route.points[this.route.index];
    this.avatar.targetPos = new THREE.Vector3(x, 0, z);
  },

  tickRoute() {
    const a = this.avatar, r = this.route;
    if (!a || !r) return;
    // 玩家自己按方向鍵：交給玩家，停止自動走
    if (["forward", "backward", "left", "right"].some(k => a.keys[k])) { this.cancelRoute(); this.render(); return; }
    if (a.targetPos) return;   // 還在走
    const [x, z] = r.points[r.index];
    if (Math.hypot(a.position.x - x, a.position.z - z) < 0.5) {
      r.index++;
      if (r.index < r.points.length) { this.nextWaypoint(); return; }
      this.cancelRoute();
      this.faceTarget(r.step);
      this.notify(`🧭 已到達：${r.step.title}。按「${r.step.action}」繼續。`);
    } else {
      this.cancelRoute();
      this.notify("🧭 前方被擋住了，請用方向鍵稍微繞開後再按「前往」。");
    }
    this.render();
  },

  cancelRoute() {
    if (this.routeTimer) clearInterval(this.routeTimer);
    this.routeTimer = null;
    if (this.route && this.avatar) {
      this.avatar.isSprinting = this.route.sprinting;
      this.avatar.targetPos = null;
      this.avatar.targetMarker.material.opacity = 0;
    }
    this.route = null;
  },

  faceTarget(step) {
    const a = this.avatar;
    if (!a || !step.face) return;
    a.playerGroup.rotation.y = Math.atan2(step.face[0] - a.position.x, step.face[1] - a.position.z);
  },

  notify(msg) {
    if (window.liveTempleWall) window.liveTempleWall.showBroadcastNotice(msg);
    if (window.setDockStatus) window.setDockStatus(msg);
  },

  // ---------- 指引卡 ----------
  render() {
    const card = document.getElementById("pilgrimCard");
    if (!card) return;
    this.place();
    const step = this.step;
    card.classList.toggle("collapsed", !step);
    const set = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
    if (!step) {
      set("pilgrimProgress", "🧭 參拜指引");
      set("pilgrimTitle", "完整參拜");
      set("pilgrimHint", this.data.completed ? `已圓滿 ${this.data.completed} 次。依指引再參拜一次？` : "請香、敬天、上香、獻供、稟告、求籤、化金紙，一步步帶你走。");
      set("btnPilgrimPrimary", "開始參拜");
      document.getElementById("pilgrimDots").replaceChildren();
      document.getElementById("btnPilgrimStop").hidden = true;
      return;
    }
    set("pilgrimProgress", `🧭 參拜指引 ${this.data.step + 1}/${PILGRIM_STEPS.length}`);
    set("pilgrimTitle", step.title);
    set("pilgrimHint", step.hint);
    set("btnPilgrimPrimary", this.route ? "🚶 前往中…" : this.isNear(step) ? step.action : "🧭 前往");
    document.getElementById("btnPilgrimStop").hidden = false;
    document.getElementById("pilgrimDots").replaceChildren(...PILGRIM_STEPS.map((_, i) => {
      const d = document.createElement("span");
      d.className = `onboarding-dot${i < this.data.step ? " done" : i === this.data.step ? " current" : ""}`;
      return d;
    }));
  },

  place() {
    const card = document.getElementById("pilgrimCard");
    const nav = document.getElementById("cameraNavContainer");
    if (card && nav) card.style.top = `${Math.round(nav.getBoundingClientRect().bottom + 8)}px`;
  },

  init() {
    this.data = this.load();
    window.addEventListener("temple:ritual", e => this.onRitual(e.detail.type, e.detail));
    document.getElementById("btnPilgrimPrimary")?.addEventListener("click", () => this.primary());
    document.getElementById("btnPilgrimStop")?.addEventListener("click", () => this.stop());
    // 走近或走遠時更新按鈕（前往／做這一步）
    setInterval(() => { if (this.step && !this.route) this.render(); }, 500);
    window.addEventListener("resize", () => this.place());
    this.place();
    this.render();
  }
};

window.pilgrimage = pilgrimage;
