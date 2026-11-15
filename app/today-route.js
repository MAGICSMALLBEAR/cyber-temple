// app/today-route.js - 今日香火路線：把每日功課串成一條路線
// 新手引導結束後，畫面下方同一個位置改顯示「今日」卡：農曆日期、節慶、下一站與進度，按「出發」自動走到最近的一站。
// 功課本身與獎勵仍由 daily.js 負責；這裡只負責「去哪裡、下一站是什麼」，聽 temple:dailyprogress 更新。

const TODAY_ROUTE_KEY = "temple_today_route";

// 功課類型 → 在哪裡做（app/visit.js 的地點代號）、做的按鈕。沒有地點的（念珠）直接開面板。
const TODAY_STOPS = {
  incense: { place: "main", how: "按「🔥 點燃清香」" },
  bwa: { place: "main", how: "按「🌓 誠心擲筊」" },
  holyBwa: { place: "main", how: "按「🌓 誠心擲筊」" },
  bow: { place: "main", how: "按「🙇 鞠躬」或跪拜、合掌" },
  lantern: { place: "main", how: "按「🪔 點光明燈」", open: "btnGoLantern" },
  chiam: { place: "chiam", how: "按「🎋 搖筒求籤」" },
  muyu: { place: "muyu", how: "按「🪵 敲木魚」" },
  coin: { place: "pond", how: "按 [E] 投幣許願" },
  paper: { place: "furnace", how: "按 [E] 化金紙" },
  bell: { place: "bell", how: "按 [E] 叩鐘" },
  drum: { place: "drum", how: "按 [E] 擊鼓" },
  bead: { place: null, how: "撥動念珠", open: "btnOpenBeads" }
};

const todayRoute = {
  data: null,

  load() {
    try {
      const d = JSON.parse(localStorage.getItem(TODAY_ROUTE_KEY) || "null");
      if (d && typeof d === "object") return d;
    } catch (e) {}
    return {};
  },
  save() { localStorage.setItem(TODAY_ROUTE_KEY, JSON.stringify(this.data)); },

  get daily() { return window.dailyPractice; },
  get todayKey() { return typeof dateKey === "function" ? dateKey(new Date()) : ""; },

  // 換日時清掉「今天已關閉」與「路線進行中」
  syncDay() {
    if (this.data.date !== this.todayKey) {
      this.data = { date: this.todayKey, dismissed: false, active: false };
      this.save();
    }
  },

  pending() {
    const d = this.daily;
    if (!d) return [];
    return d.tasks.filter(t => !d.data.done.includes(t.id));
  },

  stopOf(task) { return TODAY_STOPS[task.type] || { place: "main", how: "依功課說明完成" }; },

  // 地點表每次重建成本不小，同一輪計算只取一次
  targets() {
    const now = Date.now();
    if (!this._targets || now - this._targetsAt > 200) { this._targets = window.templeVisit?.targets() || []; this._targetsAt = now; }
    return this._targets;
  },
  placeOf(id) { return id ? this.targets().find(t => t.id === id) || null : null; },

  // 由近到遠排：從目前位置出發，每次挑最近的一站（同一地點的功課會排在一起）
  ordered() {
    const list = this.pending();
    const a = window.temple3d?.avatar?.position;
    if (!a || list.length < 2) return list;
    const result = [];
    let cur = [a.x, a.z];
    const left = list.slice();
    while (left.length) {
      let best = 0, bestDist = Infinity;
      left.forEach((t, i) => {
        const p = this.placeOf(this.stopOf(t).place);
        const dist = p ? Math.hypot(p.center[0] - cur[0], p.center[1] - cur[1]) : 999;   // 念珠等不必走路的放最後
        if (dist < bestDist) { best = i; bestDist = dist; }
      });
      const [t] = left.splice(best, 1);
      result.push(t);
      const p = this.placeOf(this.stopOf(t).place);
      if (p) cur = p.center;
    }
    return result;
  },

  next() { return this.ordered()[0] || null; },

  // 走去做某一項功課；節慶功課要在指定神尊前做，先換神尊
  go(task) {
    if (!task) return false;
    const current = typeof state !== "undefined" ? state.currentDeity : null;   // app/core.js 的全域 const
    if (task.deity && current !== task.deity) {
      document.querySelector(`.btn-deity-pill[data-deity="${task.deity}"]`)?.click();
    }
    const stop = this.stopOf(task);
    const place = this.placeOf(stop.place);
    if (!place) {
      if (stop.open) document.getElementById(stop.open)?.click();
      this.notify(`📿 今日功課「${task.text}」：${stop.how}。`);
      return true;
    }
    if (window.templeVisit.nearby()?.id === place.id) {
      if (stop.open) document.getElementById(stop.open)?.click();
      this.notify(`📍 就在${place.title}：${stop.how}，完成「${task.text}」。`);
      return true;
    }
    const ok = window.templeVisit.go(place.id);
    if (ok) this.notify(`🚶 前往${place.title}：到了之後${stop.how}，完成「${task.text}」。`);
    return ok;
  },

  start() {
    this.syncDay();
    const task = this.next();
    if (!task) { this.render(); return false; }
    this.data.active = true;
    this.data.dismissed = false;
    this.save();
    document.getElementById("dailyModal")?.classList.remove("open");
    const ok = this.go(task);
    this.render();
    return ok;
  },

  dismiss() {
    this.syncDay();
    this.data.dismissed = true;
    this.data.active = false;
    this.save();
    this.render();
  },

  onProgress() {
    this.syncDay();
    if (this.data.active) {
      const task = this.next();
      if (!task) {
        this.data.active = false;
        this.save();
      } else {
        const place = this.placeOf(this.stopOf(task).place);
        // 等功課完成的通知顯示一下再提示下一站
        setTimeout(() => this.notify(`🧭 下一站：${place ? place.title : "隨時隨地"}，「${task.text}」。按今日卡的「前往下一站」。`), 2600);
      }
    }
    this.render();
  },

  // 這個月有幾天完成全部功課（與「三十日圓滿」成就同一份紀錄）
  monthStamps() {
    let days = [];
    try { days = JSON.parse(localStorage.getItem("temple_achievements") || "{}").practiceDays || []; } catch (e) {}
    const prefix = this.todayKey.slice(0, 7);
    return Array.isArray(days) ? days.filter(d => typeof d === "string" && d.startsWith(prefix)).length : 0;
  },

  get visible() {
    return !!this.daily && !window.templeOnboarding?.active && !this.data.dismissed;
  },

  render() {
    const card = document.getElementById("todayCard");
    if (!card || !this.data) return;
    this.syncDay();
    card.hidden = !this.visible;
    if (card.hidden) return;
    const d = this.daily, tasks = d.tasks, left = this.pending(), now = new Date();
    const lunar = typeof toLunar === "function" ? toLunar(now) : null;
    const f = d.festival;
    const set = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
    set("todayCardDate", `📅 今日香火 · ${now.getMonth() + 1}/${now.getDate()}${lunar ? ` · 農曆${lunar.label}` : ""}`);
    const go = document.getElementById("btnTodayGo");
    if (!left.length) {
      set("todayCardTitle", "🎉 今日功課圓滿");
      set("todayCardHint", `本月已圓滿 ${this.monthStamps()} 天。明天再來，路線會換新的功課。`);
      if (go) go.style.display = "none";
    } else {
      const task = this.next(), place = this.placeOf(this.stopOf(task).place);
      set("todayCardTitle", `${place ? `${place.icon} ${place.title}` : "📿 隨時隨地"} · ${task.text}`);
      const festText = f ? `🏮 ${f.name}${d.multiplier > 1 ? "（功德加倍）" : ""} · ` : "";
      set("todayCardHint", `${festText}已完成 ${tasks.length - left.length} / ${tasks.length} 項`);
      if (go) {
        go.style.display = "";
        go.textContent = window.pilgrimage?.route ? "🚶 前往中…" : this.data.active ? "🧭 前往下一站" : "🚶 出發";
      }
    }
    const dots = document.getElementById("todayCardDots");
    if (dots) dots.replaceChildren(...tasks.map(t => {
      const dot = document.createElement("span");
      dot.className = `onboarding-dot${d.data.done.includes(t.id) ? " done" : ""}`;
      return dot;
    }));
  },

  notify(msg) { window.templeNotify ? window.templeNotify(msg) : window.setDockStatus?.(msg); },

  init() {
    this.data = this.load();
    this.syncDay();
    document.getElementById("btnTodayGo")?.addEventListener("click", () => this.start());
    document.getElementById("btnTodayList")?.addEventListener("click", () => this.daily?.open());
    document.getElementById("btnTodayClose")?.addEventListener("click", () => this.dismiss());
    document.getElementById("btnDailyRoute")?.addEventListener("click", () => this.start());
    window.addEventListener("temple:dailyprogress", () => this.onProgress());
    window.addEventListener("temple:checkin", () => this.render());
    window.addEventListener("temple:onboardingdone", () => this.render());
    // 走動中按鈕文字（前往中／前往下一站）與換日
    setInterval(() => this.render(), 1000);
    this.render();
  }
};

window.todayRoute = todayRoute;
