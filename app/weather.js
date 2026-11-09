// app/weather.js - 依時辰排定的天氣：同一個時辰每台裝置算出相同結果，同行不必另外同步，離線也能用。
// 「自動」依台灣時間的日期與時辰、季節機率決定；也可以固定某種天氣（保存在本機）。
const WEATHER_KEY = "temple_weather";
const WEATHER_INFO = {
  clear: { icon: "☀️", name: "晴" }, cloudy: { icon: "☁️", name: "多雲" },
  rain: { icon: "🌧️", name: "雨" }, storm: { icon: "⛈️", name: "雷雨" }, blossoms: { icon: "🌸", name: "落瓣" }
};
const WEATHER_MODES = ["auto", "clear", "cloudy", "rain", "storm", "blossoms"];
const WEATHER_SLOT_MS = 2 * 3600 * 1000;

// FNV-1a 雜湊 → [0, 1)，同樣的字串永遠得到同樣的數字
function weatherHash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0) / 4294967296;
}

const templeWeather = {
  info: WEATHER_INFO, modes: WEATHER_MODES,
  // 時辰：子時從 23 點開始，所以先加一小時再算日期與第幾個時辰（0 子、6 午、11 亥）
  slot(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(date.getTime() + 3600 * 1000));
    const part = type => parts.find(p => p.type === type).value;
    const index = Math.floor(Number(part("hour")) / 2);
    return { key: `${part("year")}-${part("month")}-${part("day")}#${index}`, month: Number(part("month")), index };
  },
  // 各季節的機率：梅雨季多雨、夏季午後（未申酉）常有雷雨、冬季多毛毛雨
  weights(month, index) {
    if (month >= 5 && month <= 6) return { clear: 0.3, cloudy: 0.3, rain: 0.32, storm: 0.08 };
    if (month >= 7 && month <= 9) return index >= 7 && index <= 9 ? { clear: 0.38, cloudy: 0.25, rain: 0.15, storm: 0.22 } : { clear: 0.55, cloudy: 0.3, rain: 0.12, storm: 0.03 };
    if (month === 12 || month <= 2) return { clear: 0.35, cloudy: 0.35, rain: 0.28, storm: 0.02 };
    return { clear: 0.45, cloudy: 0.3, rain: 0.22, storm: 0.03 };
  },
  sample(slot) {
    const r = weatherHash(slot.key), w = this.weights(slot.month, slot.index);
    let acc = 0;
    for (const type of ["clear", "cloudy", "rain", "storm"]) { acc += w[type]; if (r < acc) return type; }
    return "clear";
  },
  // 有四成五的機會延續上一個時辰的天氣，避免每兩小時就大翻轉
  forecast(date = new Date()) {
    const slot = this.slot(date);
    if (weatherHash(slot.key + ":keep") < 0.45) return this.sample(this.slot(new Date(date.getTime() - WEATHER_SLOT_MS)));
    return this.sample(slot);
  },
  mode() {
    try { const m = JSON.parse(localStorage.getItem(WEATHER_KEY))?.mode; return WEATHER_MODES.includes(m) ? m : "auto"; } catch (e) { return "auto"; }
  },
  setMode(mode) {
    if (!WEATHER_MODES.includes(mode)) return false;
    localStorage.setItem(WEATHER_KEY, JSON.stringify({ mode }));
    this.apply({ announce: true }); return true;
  },
  current(date = new Date()) { const m = this.mode(); return m === "auto" ? this.forecast(date) : m; },
  label() {
    const type = this.current(), i = WEATHER_INFO[type];
    return `${i.icon} ${i.name}${this.mode() === "auto" ? "（依時辰）" : "（固定）"}`;
  },
  // 天氣有變才通知場景；announce 為手動切換時的提示
  apply({ announce = false } = {}) {
    const type = this.current(), btn = document.getElementById("btnToggleWeather");
    if (btn) { btn.textContent = this.label(); btn.setAttribute("aria-label", `天氣：${this.label()}，按一下切換`); }
    if (type === this.applied) return type;
    const first = this.applied === undefined;
    this.applied = type;
    window.temple3d?.setWeather?.(type, { announce, quiet: first });
    window.dispatchEvent(new CustomEvent("temple:weather", { detail: { type } }));
    return type;
  },
  init() {
    const btn = document.getElementById("btnToggleWeather");
    btn?.addEventListener("click", () => {
      const next = WEATHER_MODES[(WEATHER_MODES.indexOf(this.mode()) + 1) % WEATHER_MODES.length];
      this.setMode(next);
      window.setDockStatus?.(next === "auto" ? `🕒 天氣改回依時辰自動變化，目前${WEATHER_INFO[this.current()].name}。` : `${WEATHER_INFO[next].icon} 天氣固定為${WEATHER_INFO[next].name}。`);
    });
    this.apply();
    clearInterval(this.timer);
    this.timer = setInterval(() => this.apply(), 60 * 1000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) this.apply(); });
  }
};
window.templeWeather = templeWeather;
