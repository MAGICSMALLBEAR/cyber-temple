const ACHIEVEMENT_KEY = "temple_achievements";
const ACHIEVEMENT_DEITIES = ["mazu", "wenchang", "caishen", "yuelao", "guanyin", "guangong", "tudigong", "guaiguai"];
const ACHIEVEMENTS = [
  { id: "pilgrim1", icon: "🧭", name: "初次圓滿", desc: "完成一次七步完整參拜", stat: "pilgrimages", goal: 1 },
  { id: "pilgrim10", icon: "🏮", name: "常來常安", desc: "累計完成十次完整參拜", stat: "pilgrimages", goal: 10 },
  { id: "streak7", icon: "🗓️", name: "七日心誠", desc: "連續簽到七天", stat: "bestStreak", goal: 7 },
  { id: "deities8", icon: "🙏", name: "諸神結緣", desc: "分別在八位神尊前點香", stat: "deities", goal: 8 },
  { id: "fortune1", icon: "🎋", name: "靈籤初緣", desc: "求得並接收一支籤詩", stat: "fortunes", goal: 1 },
  { id: "ring1", icon: "🎯", name: "好手氣", desc: "在夜市套中第一個瓶子", stat: "ringHits", goal: 1 },
  { id: "favorites10", icon: "📚", name: "藏籤有緣", desc: "收藏十首不同籤詩", stat: "favorites", goal: 10 },
  { id: "beads1", icon: "📿", name: "一念一心", desc: "完成一輪 108 顆念珠", stat: "beadLoops", goal: 1 },
  { id: "streak30", icon: "🌅", name: "三十日不輟", desc: "連續簽到三十天", stat: "bestStreak", goal: 30, advanced: true },
  { id: "birthday1", icon: "🎂", name: "敬賀神辰", desc: "在神尊聖誕、成道或出家紀念日完成專屬點香功課", stat: "birthdays", goal: 1, advanced: true },
  { id: "birthdays6", icon: "🎊", name: "六聖同慶", desc: "在媽祖、文昌、觀音、關公、土地公、月老的慶典完成專屬功課", stat: "birthdays", goal: 6, advanced: true },
  { id: "solar24", icon: "🌿", name: "四時全勤", desc: "同一曆年完成二十四個不同節氣的點燈功課", stat: "solarTerms", goal: 24, advanced: true },
  { id: "daily30", icon: "📜", name: "三十日圓滿", desc: "累計三十天完成當日全部功課（不必連續）", stat: "practiceDays", goal: 30, advanced: true },
  { id: "amulets9", icon: "🛡️", name: "九符集福", desc: "透過開光或服務處收集九款不同平安符", stat: "amulets", goal: 9, advanced: true }
];
const templeAchievements = {
  read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (e) { return fallback; } },
  load() {
    const raw = this.read(ACHIEVEMENT_KEY, {}), d = raw && typeof raw === "object" ? raw : {};
    const unlocked = {};
    ACHIEVEMENTS.forEach(a => { if (typeof d.unlocked?.[a.id] === "string" && Number.isFinite(Date.parse(d.unlocked[a.id]))) unlocked[a.id] = d.unlocked[a.id]; });
    const unique = (value, valid) => Array.isArray(value) ? [...new Set(value.filter(valid))] : [];
    const solarYears = {};
    if (d.solarYears && typeof d.solarYears === "object") Object.keys(d.solarYears).filter(y => /^20\d{2}$/.test(y)).forEach(y => {
      solarYears[y] = unique(d.solarYears[y], n => Number.isInteger(n) && n >= 0 && n < 24);
    });
    return { version: 2, unlocked, deities: unique(d.deities, id => ACHIEVEMENT_DEITIES.includes(id)),
      birthdayDeities: unique(d.birthdayDeities, id => ["mazu", "wenchang", "guanyin", "guangong", "tudigong", "yuelao"].includes(id)),
      solarYears, practiceDays: unique(d.practiceDays, day => typeof day === "string" && /^20\d{2}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day))).sort().slice(-4000),
      ringHits: Number.isSafeInteger(d.ringHits) && d.ringHits > 0 ? Math.min(d.ringHits, 1000000) : 0 };
  },
  stats(d = this.load()) {
    const pilgrim = this.read("temple_pilgrimage", {}), daily = this.read("temple_daily", {}), bag = window.templeInventory?.data;
    const hist = this.read("temple_chiam_history", []);
    const nonnegative = n => Number.isFinite(Number(n)) ? Math.max(0, Number(n)) : 0;
    return { pilgrimages: nonnegative(pilgrim?.completed), bestStreak: nonnegative(daily?.checkIn?.best), deities: d.deities.length,
      fortunes: Array.isArray(hist) ? hist.length : 0, ringHits: Math.max(d.ringHits, bag?.marketRewards > 0 ? 1 : 0),
      favorites: bag?.favorites.length || 0, beadLoops: nonnegative(localStorage.getItem("temple_beads_loops")),
      birthdays: d.birthdayDeities.length, solarTerms: Math.max(0, ...Object.values(d.solarYears).map(a => a.length)),
      practiceDays: d.practiceDays.length, amulets: bag?.amulets.length || 0 };
  },
  recordDaily(data) {
    const daily = window.dailyPractice;
    if (!daily?.data) return;
    const today = daily.today;
    const day = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    if (daily.data.date !== day) return;
    const before = JSON.stringify(data), done = daily.data.done || [];
    const f = daily.festival, term = daily.solarTerm;
    if (done.includes("festival") && f?.deity && /聖誕|成道|出家/.test(f.name) && !data.birthdayDeities.includes(f.deity)) data.birthdayDeities.push(f.deity);
    if (done.includes("solarTerm") && term && Number.isInteger(term.index) && term.index >= 0 && term.index < 24) {
      const list = data.solarYears[String(today.getFullYear())] ||= [];
      if (!list.includes(term.index)) list.push(term.index);
    }
    if (daily.data.bonus && daily.tasks.every(t => done.includes(t.id)) && !data.practiceDays.includes(day)) data.practiceDays.push(day);
    if (JSON.stringify(data) !== before) localStorage.setItem(ACHIEVEMENT_KEY, JSON.stringify(data));
  },
  reconcile(announce = false, data = this.load()) {
    this.recordDaily(data);
    const stats = this.stats(data), newly = [];
    ACHIEVEMENTS.forEach(a => {
      if (!data.unlocked[a.id] && stats[a.stat] >= a.goal) { data.unlocked[a.id] = new Date().toISOString(); newly.push(a); }
    });
    if (newly.length) localStorage.setItem(ACHIEVEMENT_KEY, JSON.stringify(data));
    const count = document.getElementById("countAchievements"); if (count) count.textContent = Object.keys(data.unlocked).length;
    if (announce && newly.length) window.liveTempleWall?.showBroadcastNotice(`🏅 新成就：${newly.map(a => a.name).join("、")}。可在護照查看。`);
    if (document.querySelector('.passport-tab-btn.active[data-ptab="achievements"]')) this.render(document.getElementById("passportTabContent"), data);
    return newly;
  },
  onRitual(detail) {
    const d = this.load(); let changed = false;
    if (detail.type === "incense" && ACHIEVEMENT_DEITIES.includes(detail.deity) && !d.deities.includes(detail.deity)) { d.deities.push(detail.deity); changed = true; }
    if (detail.type === "marketHit") { d.ringHits++; changed = true; }
    if (changed) localStorage.setItem(ACHIEVEMENT_KEY, JSON.stringify(d));
    this.reconcile(true, d);
  },
  render(container, data = this.load()) {
    if (!container) return;
    const stats = this.stats(data); container.replaceChildren();
    const summary = document.createElement("p"); summary.className = "achievement-summary";
    summary.textContent = `已取得 ${Object.keys(data.unlocked).length} / ${ACHIEVEMENTS.length} 枚 · 8 枚基礎、6 枚進階。慶典、節氣與全日功課從本版起記錄，現有可確認的進度會補認。`;
    container.append(summary);
    ACHIEVEMENTS.forEach(a => {
      const unlocked = data.unlocked[a.id], card = document.createElement("article"); card.className = `achievement-card${unlocked ? " unlocked" : ""}`;
      const title = document.createElement("strong"); title.textContent = `${a.icon} ${a.name}`;
      const desc = document.createElement("p"); desc.textContent = `${a.advanced ? "進階 · " : ""}${a.desc}`;
      const progress = document.createElement("progress"); progress.max = a.goal; progress.value = unlocked ? a.goal : Math.min(a.goal, stats[a.stat]); progress.setAttribute("aria-label", `${a.name}進度`);
      const label = document.createElement("small"); label.textContent = unlocked ? `已解鎖 · ${new Date(unlocked).toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })}` : `${Math.min(a.goal, stats[a.stat])} / ${a.goal}`;
      card.append(title, desc, progress, label); container.append(card);
    });
  },
  init() {
    this.reconcile(false);
    window.addEventListener("temple:ritual", e => this.onRitual(e.detail));
    window.addEventListener("temple:inventory", () => this.reconcile(true));
    window.addEventListener("temple:checkin", () => this.reconcile(true));
    window.addEventListener("temple:dailyprogress", () => this.reconcile(true));
    window.addEventListener("focus", () => this.reconcile(false));
    window.addEventListener("storage", e => { if (e.key === ACHIEVEMENT_KEY || e.key === null) this.reconcile(false); });
  }
};
window.templeAchievements = templeAchievements;
