const PUPPET_STORY = [
  { title: "第一幕 · 廟埕遇雨", text: "旅人：雨來得急，我忘了帶傘。村人：這把傘借你，平安回家最要緊。" },
  { title: "第二幕 · 拾得錢袋", text: "旅人：路上拾到一只錢袋，失主一定很著急。我先到服務處請人幫忙找尋。" },
  { title: "第三幕 · 原物奉還", text: "村人：原來是我遺落的錢袋！旅人：你借我一把傘，我也想把這份善意傳下去。" },
  { title: "第四幕 · 平安謝幕", text: "兩人：一把傘遮雨，一顆心結緣。願大家出入平安，善念常在。謝謝觀賞！" }
];
const nightMarket = {
  tab: "ring", playing: false, puppetPlaying: false, remaining: 0, hits: 0, targets: [], frame: null, flight: null,
  aimAt(seconds) { return 280 + Math.sin(seconds * 2.2) * 215; },
  open(tab = "ring") {
    this.tab = tab; document.getElementById("marketModal").classList.add("open"); this.render();
    document.getElementById("marketModal").classList.toggle("puppet-view", tab === "puppet");
    if (tab === "puppet") window.temple3d?.setCameraView("puppet");
    else window.temple3d?.setCameraView("market");
    this.startPainting();
  },
  render() {
    document.getElementById("ringPanel").hidden = this.tab !== "ring";
    document.getElementById("puppetPanel").hidden = this.tab !== "puppet";
    document.querySelectorAll("[data-market-tab]").forEach(b => b.classList.toggle("active", b.dataset.marketTab === this.tab));
    document.getElementById("btnRingThrow").disabled = !this.playing || !!this.flight;
    document.getElementById("btnRingStart").disabled = this.playing;
    document.getElementById("btnPuppetPlay").disabled = this.puppetPlaying;
    document.getElementById("ringCounter").textContent = `剩餘 ${this.remaining} 圈 · 命中 ${this.hits} 個`;
    const d = window.templeInventory.data;
    const rewarded = d.marketDay === window.templeInventory.day() ? d.marketRewards : 0;
    document.getElementById("marketRewardNote").textContent = `免費遊玩；每日前 3 場命中可領平安幣，今日已領 ${rewarded}/3 場。之後仍可練習。`;
  },
  startRing() {
    if (this.playing) return;
    this.stopPuppet(); this.playing = true; this.remaining = 5; this.hits = 0; this.flight = null;
    this.targets = [90, 185, 280, 375, 470].map(x => ({ x, hit: false }));
    this.ringStarted = performance.now(); this.aim = this.aimAt(0);
    document.getElementById("ringMessage").textContent = "準星左右移動，對準瓶子按「拋圈」或空白鍵。每個瓶子只計一次。";
    this.render(); this.startPainting();
  },
  throwRing() {
    if (!this.playing || this.flight) return;
    this.remaining--; this.flight = { x: this.aim, born: performance.now() }; this.render();
  },
  settleRing(x) {
    const target = this.targets.find(t => !t.hit && Math.abs(t.x - x) <= 22);
    if (target) { target.hit = true; this.hits++; window.templeAudio?.playBell(720); }
    else window.templeAudio?.playWoodblock();
    document.getElementById("ringMessage").textContent = target ? "套中了！再接再厲。" : "差一點，下次抓準時機！";
    if (this.remaining === 0) {
      this.playing = false;
      const reward = window.templeInventory.awardMarket(this.hits);
      document.getElementById("ringMessage").textContent = `五圈結束，命中 ${this.hits} 個！${reward ? `平安幣 +${reward}，已放入背包。` : "這場為練習，歡迎再挑戰。"}`;
    }
    this.render();
  },
  paint(now) {
    const canvas = document.getElementById("ringCanvas"), ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    ctx.fillStyle = "#251612"; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#644330"; ctx.fillRect(25, 125, 510, 105);
    ctx.strokeStyle = "#bd8a42"; ctx.lineWidth = 3; ctx.strokeRect(25, 125, 510, 105);
    const targets = this.targets.length ? this.targets : [90, 185, 280, 375, 470].map(x => ({ x }));
    targets.forEach((t, i) => {
      ctx.fillStyle = t.hit ? "#4b483a" : ["#e56d47", "#9bbb72", "#f1be42", "#72a8ca", "#b890c5"][i];
      ctx.beginPath(); ctx.roundRect(t.x - 13, 104, 26, 55, 6); ctx.fill(); ctx.fillRect(t.x - 7, 88, 14, 22);
      if (t.hit) { ctx.strokeStyle = "#ffe78b"; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(t.x, 143, 28, 10, 0, 0, Math.PI * 2); ctx.stroke(); }
    });
    if (this.playing && !this.flight) this.aim = this.aimAt((now - this.ringStarted) / 1000);
    const x = this.aim || 280;
    ctx.strokeStyle = "#ffe58a"; ctx.lineWidth = 2; ctx.setLineDash([6, 7]); ctx.beginPath(); ctx.moveTo(x, 230); ctx.lineTo(x, 175); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#ffe58a"; ctx.beginPath(); ctx.moveTo(x, 238); ctx.lineTo(x - 9, 254); ctx.lineTo(x + 9, 254); ctx.fill();
    if (this.flight) {
      const flight = this.flight, progress = Math.min(1, (now - flight.born) / 550);
      ctx.strokeStyle = "#ffe58a"; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.ellipse(flight.x, 290 - progress * 150 - Math.sin(progress * Math.PI) * 100, 30 - progress * 4, 12, 0, 0, Math.PI * 2); ctx.stroke();
      if (progress === 1) { this.flight = null; this.settleRing(flight.x); }
    } else {
      ctx.strokeStyle = "#ffe58a"; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(x, 293, 32, 12, 0, 0, Math.PI * 2); ctx.stroke();
    }
  },
  startPainting() {
    if (this.frame !== null) return;
    let previous = -Infinity;
    const tick = now => {
      this.frame = null;
      if (!document.getElementById("marketModal").classList.contains("open")) return;
      if (this.tab === "ring" && !document.hidden && now - previous >= 32) { this.paint(now); previous = now; }
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  },
  playPuppet() {
    if (this.puppetPlaying) return;
    this.cancelRing(); this.puppetPlaying = true; this.puppetStep = 0;
    this.showPuppetScene(); this.render();
    window.temple3d?.setCameraView("puppet");
    this.puppetTimer = setInterval(() => {
      if (!document.getElementById("marketModal").classList.contains("open")) { this.close(); return; }
      this.puppetStep++;
      if (this.puppetStep >= PUPPET_STORY.length) { this.stopPuppet(); document.getElementById("puppetSubtitle").textContent = "演出圓滿，願善念與你同行。可再次播放。"; }
      else this.showPuppetScene();
    }, 6000);
  },
  showPuppetScene() {
    const scene = PUPPET_STORY[this.puppetStep];
    document.getElementById("puppetScene").textContent = scene.title;
    document.getElementById("puppetSubtitle").textContent = scene.text;
    if (this.puppetStep % 2) window.templeAudio?.playTempleDrumStrike();
    else window.templeAudio?.playTempleBellStrike();
  },
  stopPuppet() {
    if (this.puppetTimer) clearInterval(this.puppetTimer);
    this.puppetTimer = null; this.puppetPlaying = false; this.render();
  },
  cancelRing() { this.playing = false; this.flight = null; this.remaining = 0; },
  close() {
    this.cancelRing(); this.stopPuppet();
    if (this.frame !== null) cancelAnimationFrame(this.frame); this.frame = null;
    document.getElementById("marketModal").classList.remove("open");
  },
  init() {
    document.getElementById("btnOpenMarket").addEventListener("click", () => this.open());
    document.getElementById("marketModalClose").addEventListener("click", () => this.close());
    document.getElementById("btnRingStart").addEventListener("click", () => this.startRing());
    document.getElementById("btnRingThrow").addEventListener("click", () => this.throwRing());
    document.getElementById("btnPuppetPlay").addEventListener("click", () => this.playPuppet());
    document.getElementById("btnPuppetStop").addEventListener("click", () => this.stopPuppet());
    document.querySelectorAll("[data-market-tab]").forEach(b => b.addEventListener("click", () => {
      this.cancelRing(); this.stopPuppet(); this.open(b.dataset.marketTab);
    }));
    window.addEventListener("keydown", e => {
      if (e.code === "Space" && this.playing && !["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) this.throwRing(); }
    }, true);
    const modal = document.getElementById("marketModal");
    new MutationObserver(() => { if (!modal.classList.contains("open") && (this.playing || this.puppetPlaying || this.frame !== null)) this.close(); }).observe(modal, { attributes: true, attributeFilter: ["class"] });
  }
};
window.nightMarket = nightMarket;
