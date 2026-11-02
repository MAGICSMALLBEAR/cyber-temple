// beads.js - 108 顆念珠靜心冥想系統 (參考《山寺》核心禪修互動)
// 支援滑動/點擊撥動 108 顆菩提念珠，清心除念，累計功德

class BeadsMeditationSystem {
  constructor() {
    this.currentCount = parseInt(localStorage.getItem("temple_beads_count") || "0", 10);
    this.totalLoops = parseInt(localStorage.getItem("temple_beads_loops") || "0", 10);
    this.modal = null;
    this.zenQuotes = [
      "心若止水，波瀾不驚。",
      "一念清淨，萬境皆明。",
      "行到水窮處，坐看雲起時。",
      "放下萬般執著，方得本來圓滿。",
      "心隨境轉是凡夫，境隨心轉是聖賢。",
      "日日是好日，時時是好時。",
      "常懷感恩慈悲，善緣自然相隨。",
      "身心放下，萬慮澄澈。",
      "不垢不淨，不增不減。",
      "福由心造，命自天生，心正法明。",
      "靜定之中，自生無量般若智慧。"
    ];
  }

  init() {
    this.modal = document.getElementById("beadsModal");
    this.renderDisplay();
    this.bindEvents();
  }

  open() {
    if (this.modal) {
      this.modal.classList.add("open");
      this.renderDisplay();
    }
  }

  close() {
    if (this.modal) {
      this.modal.classList.remove("open");
    }
  }

  // 撥動下一顆念珠
  advanceBead() {
    this.currentCount++;
    window.emitRitual?.("bead");
    window.templeAudio.playBeadClick();

    // 觸覺微震動 (如果裝置支援)
    if ("vibrate" in navigator) {
      navigator.vibrate(20);
    }

    if (this.currentCount >= 108) {
      // 達成 108 顆圓滿一輪！
      this.completeLoop();
    } else {
      this.renderDisplay();
    }

    localStorage.setItem("temple_beads_count", this.currentCount);
  }

  // 108 顆圓滿大典
  completeLoop() {
    this.currentCount = 0;
    this.totalLoops++;
    localStorage.setItem("temple_beads_count", "0");
    localStorage.setItem("temple_beads_loops", this.totalLoops);

    // 鳴響長鳴大鐘
    window.templeAudio.playBell(330);

    // 增加功德池 +108
    if (window.state) {
      window.state.meritCount += 108;
      localStorage.setItem("temple_merit", window.state.meritCount);
      if (typeof window.updateMeritDisplay === "function") {
        window.updateMeritDisplay();
      }
    }

    // 3D 空間飄出金光
    if (window.temple3d) {
      window.temple3d.spawn3DFloatingText("✨ 108念珠圓滿 • 功德+108", new THREE.Vector3(0, 2.6, 1.8));
    }

    this.renderDisplay();
    alert("🎉 賀！恭喜圓滿完成 108 顆念珠持誦修行！\n心靈澄澈，雜念盡消，全殿為您注入 +108 功德！");
  }

  renderDisplay() {
    const countEl = document.getElementById("beadCounterText");
    const loopsEl = document.getElementById("beadLoopsText");
    const quoteEl = document.getElementById("beadZenQuote");
    const progressRing = document.getElementById("beadProgressRing");

    if (countEl) countEl.innerText = this.currentCount;
    if (loopsEl) loopsEl.innerText = `累計圓滿修行：${this.totalLoops} 輪`;

    if (quoteEl) {
      const idx = Math.floor(this.currentCount / 10) % this.zenQuotes.length;
      quoteEl.innerText = this.zenQuotes[idx];
    }

    if (progressRing) {
      const percent = this.currentCount / 108;
      const circumference = 2 * Math.PI * 90; // 半徑 90
      progressRing.style.strokeDashoffset = circumference * (1 - percent);
    }
  }

  bindEvents() {
    const beadArea = document.getElementById("beadTouchArea");
    if (beadArea) {
      // 點擊撥動
      beadArea.addEventListener("click", () => this.advanceBead());

      // 滑動手勢撥動
      let startY = 0;
      beadArea.addEventListener("touchstart", (e) => {
        startY = e.touches[0].clientY;
      }, { passive: true });

      beadArea.addEventListener("touchend", (e) => {
        const deltaY = startY - e.changedTouches[0].clientY;
        if (Math.abs(deltaY) > 20) {
          this.advanceBead();
        }
      }, { passive: true });
    }

    // 關閉按鈕
    document.getElementById("beadsModalClose")?.addEventListener("click", () => this.close());

    // 快捷鍵 [N] 開啟/關閉念珠
    window.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.code === "KeyN") {
        if (this.modal && this.modal.classList.contains("open")) {
          this.close();
        } else {
          this.open();
        }
      }
    });
  }
}

window.beadsSystem = new BeadsMeditationSystem();

