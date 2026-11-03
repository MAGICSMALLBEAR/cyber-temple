// daily.js - 每日修行：每日簽到、每日三項功課、農曆節慶（初一十五、神明聖誕）
// 各科儀透過 window.emitRitual(type, detail) 通報，本模組只聽 "temple:ritual" 事件，不直接耦合各功能

window.emitRitual = function(type, detail = {}) {
  window.dispatchEvent(new CustomEvent("temple:ritual", { detail: { type, ...detail } }));
};

const DAILY_KEY = "temple_daily";
const TASK_REWARD = 30;
const ALL_DONE_BONUS = 50;

// 功課池：每天依日期固定抽 3 項，同一天重新整理不會變
const DAILY_TASK_POOL = [
  { id: "incense", type: "incense", goal: 1, icon: "🔥", text: "點燃三炷清香" },
  { id: "bwa3", type: "bwa", goal: 3, icon: "🌓", text: "向神明擲筊三次" },
  { id: "holyBwa", type: "holyBwa", goal: 1, icon: "✨", text: "擲得一次聖筊" },
  { id: "chiam", type: "chiam", goal: 1, icon: "🎋", text: "誠心求一支靈籤" },
  { id: "muyu33", type: "muyu", goal: 33, icon: "🪵", text: "親手敲木魚 33 下" },
  { id: "lantern", type: "lantern", goal: 1, icon: "🪔", text: "點一盞光明燈" },
  { id: "coin", type: "coin", goal: 1, icon: "🪙", text: "向蓮花池投幣許願" },
  { id: "paper", type: "paper", goal: 1, icon: "🔥", text: "到金爐化一次金紙" },
  { id: "bell", type: "bell", goal: 1, icon: "🔔", text: "叩撞東天鐘樓金鐘" },
  { id: "drum", type: "drum", goal: 1, icon: "🥁", text: "擊響西暮鼓樓天鼓" },
  { id: "bead27", type: "bead", goal: 27, icon: "📿", text: "撥念珠 27 顆" },
  { id: "bow3", type: "bow", goal: 3, icon: "🙇", text: "行禮三次（鞠躬、跪拜或合掌）" }
];

// 農曆節慶：deity 有值時當天多一項「在該神尊前點香」的節慶功課
const LUNAR_FESTIVALS = [
  { m: 1, d: 1, name: "春節 • 新春開廟門", desc: "新歲第一炷香，祈求整年平安順遂。" },
  { m: 1, d: 5, name: "迎財神", deity: "caishen", desc: "正月初五接財神，五路進寶迎好運。" },
  { m: 1, d: 9, name: "天公生 • 玉皇大帝聖誕", desc: "天公爐前三鞠躬，答謝上蒼庇佑。" },
  { m: 1, d: 15, name: "元宵 • 上元天官賜福", desc: "上元佳節點燈祈福，天官賜福。" },
  { m: 2, d: 2, name: "土地公聖誕 • 頭牙", deity: "tudigong", desc: "新年第一次作牙，商家犒賞、祈求整年生意興隆。" },
  { m: 2, d: 3, name: "文昌帝君聖誕", deity: "wenchang", desc: "學子祈求智慧開通、考運亨通的大日子。" },
  { m: 2, d: 19, name: "觀世音菩薩聖誕", deity: "guanyin", desc: "大慈大悲觀世音菩薩誕辰，誦念聖號，祈求平安離苦。" },
  { m: 3, d: 23, name: "天上聖母媽祖聖誕", deity: "mazu", desc: "三月瘋媽祖，向媽祖祝壽祈求平安。" },
  { m: 6, d: 19, name: "觀世音菩薩成道日", deity: "guanyin", desc: "紀念觀音菩薩成道，發慈悲心、行善布施。" },
  { m: 6, d: 24, name: "關聖帝君聖誕", deity: "guangong", desc: "恩主公誕辰，祈求正氣護身、事業守正得貴人。" },
  { m: 7, d: 7, name: "七夕 • 月老情人節", deity: "yuelao", desc: "向月下老人祈求良緣、感情和睦。" },
  { m: 7, d: 15, name: "中元普渡", desc: "慈悲普施，超薦祖先，心存敬意。" },
  { m: 8, d: 15, name: "中秋 • 月下老人聖誕", deity: "yuelao", desc: "月圓人團圓，月老聖誕祈求姻緣美滿。" },
  { m: 9, d: 19, name: "觀世音菩薩出家日", deity: "guanyin", desc: "紀念觀音菩薩出家，靜心持誦、放下煩惱。" },
  { m: 12, d: 16, name: "尾牙 • 土地公作牙", deity: "tudigong", desc: "一年最後一次作牙，感謝土地公一年來的庇佑。" }
];

const DEITY_NAMES = { mazu: "媽祖", wenchang: "文昌帝君", caishen: "五路財神", yuelao: "月下老人", guanyin: "觀世音菩薩", guangong: "關聖帝君", tudigong: "土地公", guaiguai: "乖乖神" };
const LUNAR_MONTHS = { "正月": 1, "二月": 2, "三月": 3, "四月": 4, "五月": 5, "六月": 6, "七月": 7, "八月": 8, "九月": 9, "十月": 10, "冬月": 11, "臘月": 12 };
const LUNAR_MONTH_LABELS = ["", "正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "冬月", "臘月"];
const LUNAR_DAY_NAMES = ["", "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
  "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
  "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"];

let lunarFormatter = null;
try {
  lunarFormatter = new Intl.DateTimeFormat("zh-TW-u-ca-chinese", { month: "numeric", day: "numeric" });
} catch (e) {}

// 以瀏覽器內建農曆換算；不支援時回傳 null，節慶功能自動停用
function toLunar(date) {
  if (!lunarFormatter) return null;
  const parts = lunarFormatter.formatToParts(date);
  const monthName = parts.find(p => p.type === "month")?.value || "";
  const day = parseInt(parts.find(p => p.type === "day")?.value, 10);
  // 各瀏覽器格式不一：可能是「正月」「閏六月」，也可能是「1」「閏6」「6bis」
  const isLeap = monthName.startsWith("閏") || monthName.endsWith("bis");
  const bare = monthName.replace("閏", "").replace("bis", "");
  const month = LUNAR_MONTHS[bare] || parseInt(bare, 10);
  if (!month || month > 12 || !day) return null;
  const monthLabel = (isLeap ? "閏" : "") + LUNAR_MONTH_LABELS[month];
  return { month, day, isLeap, label: `${monthLabel}${LUNAR_DAY_NAMES[day] || day}` };
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date, n) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() + n, 12);
  return d;
}

// 取得某天的節慶（含除夕：隔天是正月初一）；閏月不過節
function festivalOf(date) {
  const lunar = toLunar(date);
  if (!lunar || lunar.isLeap) return null;
  const fixed = LUNAR_FESTIVALS.find(f => f.m === lunar.month && f.d === lunar.day);
  if (fixed) return fixed;
  const tomorrow = toLunar(addDays(date, 1));
  if (tomorrow && !tomorrow.isLeap && tomorrow.month === 1 && tomorrow.day === 1) {
    return { name: "除夕 • 辭歲謝神", desc: "一年將盡，答謝神明一年來的庇佑。" };
  }
  if (lunar.day === 1 || lunar.day === 15) {
    return { name: lunar.day === 1 ? "初一 • 朔日敬神" : "十五 • 望日敬神", desc: "初一十五，宮廟香火最盛的日子。", minor: true };
  }
  return null;
}

function seededPick(seedText, pool, count) {
  let h = 2166136261;
  for (const ch of seedText) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

class DailyPractice {
  constructor() {
    this.data = this.load();
    this.getDeity = () => "mazu";
  }

  init({ getDeity } = {}) {
    if (getDeity) this.getDeity = getDeity;
    window.addEventListener("temple:ritual", (e) => this.onRitual(e.detail));
    this.ensureToday();
    this.renderBadge();
  }

  load() {
    try {
      const d = JSON.parse(localStorage.getItem(DAILY_KEY) || "null");
      if (d && d.checkIn) return d;
    } catch (e) {}
    return { date: "", progress: {}, done: [], bonus: false, checkIn: { last: "", streak: 0, best: 0, total: 0 } };
  }

  save() {
    localStorage.setItem(DAILY_KEY, JSON.stringify(this.data));
  }

  // ---------- 今日內容 ----------
  get today() {
    return new Date();
  }

  get festival() {
    return festivalOf(this.today);
  }

  // 大節慶（非初一十五）功德加倍
  get multiplier() {
    const f = this.festival;
    return f && !f.minor ? 2 : 1;
  }

  get tasks() {
    const list = seededPick(dateKey(this.today), DAILY_TASK_POOL, 3);
    const f = this.festival;
    if (f && f.deity) {
      list.push({ id: "festival", type: "incense", deity: f.deity, goal: 1, icon: "🏮", text: `節慶功課：在${DEITY_NAMES[f.deity]}神尊前點香`, festival: true });
    } else if (f) {
      list.push({ id: "festival", type: "incense", goal: 1, icon: "🏮", text: `節慶功課：${f.name.split(" • ")[0]}上香敬神`, festival: true });
    }
    return list;
  }

  nextFestival() {
    for (let i = 1; i <= 400; i++) {
      const d = addDays(this.today, i);
      const f = festivalOf(d);
      if (f && !f.minor) return { ...f, inDays: i, date: d };
    }
    return null;
  }

  // 換日：重置功課並自動簽到
  ensureToday() {
    const todayKey = dateKey(this.today);
    if (this.data.date === todayKey) return;

    const ci = this.data.checkIn;
    const yesterdayKey = dateKey(addDays(this.today, -1));
    ci.streak = ci.last === yesterdayKey ? ci.streak + 1 : 1;
    ci.best = Math.max(ci.best, ci.streak);
    ci.total++;
    ci.last = todayKey;
    this.data.date = todayKey;
    this.data.progress = {};
    this.data.done = [];
    this.data.bonus = false;
    this.save();

    const reward = (20 + Math.min(ci.streak, 7) * 5) * this.multiplier;
    this.award(reward);
    const f = this.festival;
    const festText = f ? `今天是【${f.name}】${this.multiplier > 1 ? "，功德加倍" : ""}！` : "";
    this.notify(`🗓️ 每日簽到：連續 ${ci.streak} 天，功德 +${reward}！${festText}`);
  }

  // ---------- 功課進度 ----------
  onRitual(detail) {
    this.ensureToday();
    let changed = false;
    for (const task of this.tasks) {
      if (task.type !== detail.type || this.data.done.includes(task.id)) continue;
      if (task.deity && task.deity !== (detail.deity || this.getDeity())) continue;
      const cur = Math.min(task.goal, (this.data.progress[task.id] || 0) + (detail.amount || 1));
      this.data.progress[task.id] = cur;
      changed = true;
      if (cur >= task.goal) {
        this.data.done.push(task.id);
        const reward = TASK_REWARD * this.multiplier;
        this.award(reward);
        this.notify(`✅ 完成每日功課「${task.text}」，功德 +${reward}！`);
      }
    }
    if (changed) {
      const allDone = this.tasks.every(t => this.data.done.includes(t.id));
      if (allDone && !this.data.bonus) {
        this.data.bonus = true;
        const reward = ALL_DONE_BONUS * this.multiplier;
        this.award(reward);
        setTimeout(() => this.notify(`🎉 今日功課全部圓滿，額外功德 +${reward}！`), 2500);
      }
      this.save();
      this.renderBadge();
      if (document.getElementById("dailyModal")?.classList.contains("open")) this.renderPanel();
    }
  }

  award(points) {
    if (window.addMerit) window.addMerit(points);
  }

  notify(msg) {
    if (window.liveTempleWall) window.liveTempleWall.showBroadcastNotice(msg);
    if (window.setDockStatus) window.setDockStatus(msg);
  }

  // ---------- 呈現 ----------
  renderBadge() {
    const dot = document.getElementById("dailyPendingDot");
    if (!dot) return;
    const left = this.tasks.filter(t => !this.data.done.includes(t.id)).length;
    dot.hidden = left === 0;
    dot.textContent = left;
  }

  renderPanel() {
    this.ensureToday();
    const now = this.today;
    const lunar = toLunar(now);
    const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };

    set("dailyDateLabel", `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日${lunar ? ` • 農曆${lunar.label}` : ""}`);

    const f = this.festival;
    const festEl = document.getElementById("dailyFestival");
    if (festEl) {
      festEl.hidden = !f;
      if (f) {
        set("dailyFestivalName", `🏮 ${f.name}${this.multiplier > 1 ? " • 功德加倍" : ""}`);
        set("dailyFestivalDesc", f.desc);
      }
    }
    const next = this.nextFestival();
    set("dailyNextFestival", next
      ? `下一個節慶：${next.name}（${next.date.getMonth() + 1}/${next.date.getDate()}，還有 ${next.inDays} 天）`
      : (lunarFormatter ? "" : "此瀏覽器不支援農曆換算，節慶功能暫停"));

    const ci = this.data.checkIn;
    set("dailyStreak", ci.streak);
    set("dailyBestStreak", ci.best);
    set("dailyTotalDays", ci.total);
    const dots = document.getElementById("dailyStreakDots");
    if (dots) {
      dots.replaceChildren();
      const filled = ((ci.streak - 1) % 7) + 1;
      for (let i = 1; i <= 7; i++) {
        const s = document.createElement("span");
        s.className = `daily-streak-dot${i <= filled ? " on" : ""}`;
        s.textContent = i;
        dots.appendChild(s);
      }
    }

    const list = document.getElementById("dailyTaskList");
    if (list) {
      list.replaceChildren();
      for (const t of this.tasks) {
        const done = this.data.done.includes(t.id);
        const cur = done ? t.goal : (this.data.progress[t.id] || 0);
        const row = document.createElement("div");
        row.className = `daily-task${done ? " done" : ""}${t.festival ? " festival" : ""}`;
        const label = document.createElement("div");
        label.className = "daily-task-label";
        label.textContent = `${done ? "✅" : t.icon} ${t.text}`;
        const meta = document.createElement("div");
        meta.className = "daily-task-meta";
        meta.textContent = `${cur} / ${t.goal} • +${TASK_REWARD * this.multiplier}`;
        const bar = document.createElement("div");
        bar.className = "daily-task-bar";
        const fill = document.createElement("div");
        fill.style.width = `${(cur / t.goal) * 100}%`;
        bar.appendChild(fill);
        row.append(label, meta, bar);
        list.appendChild(row);
      }
    }
    set("dailyBonusNote", this.data.bonus
      ? "🎉 今日功課已全部圓滿"
      : `全部完成再加 +${ALL_DONE_BONUS * this.multiplier} 功德`);
  }

  open() {
    this.renderPanel();
    document.getElementById("dailyModal")?.classList.add("open");
  }
}

window.dailyPractice = new DailyPractice();
// 供測試與除錯使用
window.dailyPractice.toLunar = toLunar;
window.dailyPractice.festivalOf = festivalOf;
