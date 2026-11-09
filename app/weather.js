// app/weather.js - 依時辰排定的天氣：同一個時辰每台裝置算出相同結果，同行不必另外同步，離線也能用。
// 天氣來源二選一：模擬（依台灣時間的日期與時辰、季節機率）或真實天氣（Open-Meteo，免金鑰）。
// 真實天氣取不到（離線、逾時、定位被拒）時自動改用模擬。也可以固定某種天氣。設定都保存在本機。
const WEATHER_KEY = "temple_weather";
const WEATHER_INFO = {
  clear: { icon: "☀️", name: "晴" }, cloudy: { icon: "☁️", name: "多雲" },
  rain: { icon: "🌧️", name: "雨" }, storm: { icon: "⛈️", name: "雷雨" }, blossoms: { icon: "🌸", name: "落瓣" }
};
const WEATHER_MODES = ["auto", "clear", "cloudy", "rain", "storm", "blossoms"];
const WEATHER_SLOT_MS = 2 * 3600 * 1000;
const WEATHER_REAL_KEY = "temple_weather_real";            // 最近一次取得的真實天氣（快取）
const WEATHER_REAL_FRESH_MS = 20 * 60 * 1000;               // 20 分鐘內不重抓
const WEATHER_REAL_STALE_MS = 3 * 3600 * 1000;              // 3 小時內的舊資料取不到新資料時仍可用
const WEATHER_RETRY_MS = 5 * 60 * 1000;                     // 查詢失敗後同一地點的重試間隔
const WEATHER_CITIES = {
  taipei: { name: "台北", lat: 25.04, lon: 121.56 }, keelung: { name: "基隆", lat: 25.13, lon: 121.74 }, taoyuan: { name: "桃園", lat: 24.99, lon: 121.3 },
  hsinchu: { name: "新竹", lat: 24.8, lon: 120.97 }, taichung: { name: "台中", lat: 24.15, lon: 120.67 }, changhua: { name: "彰化", lat: 24.08, lon: 120.54 },
  chiayi: { name: "嘉義", lat: 23.48, lon: 120.45 }, tainan: { name: "台南", lat: 22.99, lon: 120.21 }, kaohsiung: { name: "高雄", lat: 22.63, lon: 120.3 },
  pingtung: { name: "屏東", lat: 22.67, lon: 120.49 }, yilan: { name: "宜蘭", lat: 24.76, lon: 121.75 }, hualien: { name: "花蓮", lat: 23.99, lon: 121.6 },
  taitung: { name: "台東", lat: 22.76, lon: 121.14 }, penghu: { name: "澎湖", lat: 23.57, lon: 119.58 }, kinmen: { name: "金門", lat: 24.43, lon: 118.32 }
};

const weatherOffline = () => globalThis.navigator?.onLine === false;

// Open-Meteo 的 WMO 天氣代碼換成遊戲裡的天氣
function weatherFromWmo(code) {
  if (!Number.isInteger(code)) return null;
  if (code >= 95) return "storm";                                  // 雷雨
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";   // 毛毛雨、雨、陣雨
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "rain";    // 下雪很少見，當作下雨
  if (code >= 2) return "cloudy";                                  // 多雲、陰天、霧
  return "clear";
}

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
  settings() {
    let raw; try { raw = JSON.parse(localStorage.getItem(WEATHER_KEY)); } catch (e) {}
    const here = raw?.here && Number.isFinite(raw.here.lat) && Number.isFinite(raw.here.lon) ? { lat: raw.here.lat, lon: raw.here.lon } : null;
    const city = raw?.city === "here" ? (here ? "here" : "taipei") : Object.hasOwn(WEATHER_CITIES, raw?.city) ? raw.city : "taipei";
    return { mode: WEATHER_MODES.includes(raw?.mode) ? raw.mode : "auto", source: raw?.source === "real" ? "real" : "sim", city, here };
  },
  save(patch) {
    localStorage.setItem(WEATHER_KEY, JSON.stringify({ ...this.settings(), ...patch }));
  },
  mode() { return this.settings().mode; },
  setMode(mode) {
    if (!WEATHER_MODES.includes(mode)) return false;
    this.save({ mode }); this.apply({ announce: true }); return true;
  },
  setSource(source) {
    if (!["sim", "real"].includes(source)) return false;
    this.save({ source }); this.apply({ announce: true }); return true;
  },
  setCity(city) {
    if (!Object.hasOwn(WEATHER_CITIES, city)) return false;
    this.save({ city }); this.apply({ announce: true }); return true;
  },
  // 目前位置：瀏覽器會先問是否同意；座標只取到小數兩位（約一公里），只存在本機、只送給天氣服務
  useHere() {
    return new Promise(resolve => {
      if (!globalThis.navigator?.geolocation) { this.realStatus = "無法定位，改用模擬"; this.syncUI(); resolve(false); return; }
      this.realStatus = "定位中…"; this.syncUI();
      globalThis.navigator.geolocation.getCurrentPosition(pos => {
        const round = v => Math.round(v * 100) / 100;
        this.save({ city: "here", here: { lat: round(pos.coords.latitude), lon: round(pos.coords.longitude) } });
        this.apply({ announce: true }); resolve(true);
      }, () => { this.realStatus = "沒有取得定位同意，地點維持原設定"; this.syncUI(); resolve(false); }, { timeout: 10000, maximumAge: 3600 * 1000 });
    });
  },
  place(s = this.settings()) {
    return s.city === "here" && s.here ? { key: `here:${s.here.lat},${s.here.lon}`, name: "目前位置", ...s.here } : { key: s.city, ...WEATHER_CITIES[s.city] };
  },
  cached(key) {
    try { const c = JSON.parse(localStorage.getItem(WEATHER_REAL_KEY)); return c?.key === key && WEATHER_INFO[c.type] && Number.isFinite(c.at) ? c : null; } catch (e) { return null; }
  },
  // 背景向 Open-Meteo 取目前天氣；同一地點同時只抓一次，失敗就保持模擬
  async fetchReal(place) {
    if (this.fetching === place.key) return;
    this.fetching = place.key; this.lastAttempt = { key: place.key, at: Date.now() };
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = setTimeout(() => controller?.abort(), 8000);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}&current=weather_code&timezone=Asia%2FTaipei`;
      const res = await fetch(url, { signal: controller?.signal, cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const type = weatherFromWmo((await res.json())?.current?.weather_code);
      if (!type) throw new Error("資料格式不符");
      localStorage.setItem(WEATHER_REAL_KEY, JSON.stringify({ key: place.key, type, at: Date.now() }));
      this.realStatus = "";
    } catch (e) {
      this.lastError = e?.message || String(e);   // 留給除錯用
      this.realStatus = weatherOffline() ? "離線中，暫用模擬天氣" : "真實天氣暫時取不到，暫用模擬天氣";
    } finally {
      clearTimeout(timer); this.fetching = null; this.apply();
    }
  },
  // 真實天氣：新資料直接用；過期就背景重抓，期間先用三小時內的舊資料，再不行用模擬
  realWeather(date = new Date()) {
    const place = this.place(), c = this.cached(place.key), age = c ? Date.now() - c.at : Infinity;
    // 失敗後同一地點 5 分鐘內不再重試，避免一直打天氣服務
    const tried = this.lastAttempt?.key === place.key && Date.now() - this.lastAttempt.at < WEATHER_RETRY_MS;
    if (age > WEATHER_REAL_FRESH_MS && !tried && !weatherOffline()) this.fetchReal(place);
    if (age <= WEATHER_REAL_STALE_MS) return { type: c.type, real: true, place };
    if (weatherOffline()) this.realStatus = "離線中，暫用模擬天氣";
    return { type: this.forecast(date), real: false, place };
  },
  resolve(date = new Date()) {
    const s = this.settings();
    if (s.mode !== "auto") return { type: s.mode, how: "固定" };
    if (s.source === "real") {
      const r = this.realWeather(date);
      return { type: r.type, how: r.real ? `真實・${r.place.name}` : "模擬・真實天氣取不到" };
    }
    return { type: this.forecast(date), how: "依時辰" };
  },
  current(date = new Date()) { return this.resolve(date).type; },
  label() {
    const r = this.resolve(), i = WEATHER_INFO[r.type];
    return `${i.icon} ${i.name}（${r.how}）`;
  },
  // 設定視窗的選單與狀態文字
  syncUI() {
    const s = this.settings(), $ = id => document.getElementById(id);
    if ($("selectWeatherSource")) $("selectWeatherSource").value = s.source;
    if ($("selectWeatherCity")) $("selectWeatherCity").value = s.city;
    if ($("selectWeatherMode")) $("selectWeatherMode").value = s.mode;
    if ($("weatherCityRow")) $("weatherCityRow").hidden = s.source !== "real";
    const status = $("weatherStatus");
    if (status) {
      const r = this.resolve(), place = this.place(s);
      status.textContent = s.mode !== "auto" ? `目前固定為${WEATHER_INFO[s.mode].name}，不跟隨天氣來源。`
        : s.source === "sim" ? `依台灣時間的時辰與季節變化，目前${WEATHER_INFO[r.type].name}；同一時辰大家看到的天氣相同，不需連網。`
        : this.realStatus ? `${this.realStatus}（${place.name}）。`
        : r.how.startsWith("真實") ? `${place.name}目前${WEATHER_INFO[r.type].name}，約每 20 分鐘更新（資料：Open-Meteo）。` : `正在取得${place.name}的天氣…`;
    }
  },
  // 天氣有變才通知場景；announce 為手動切換時的提示
  apply({ announce = false } = {}) {
    const type = this.current(), btn = document.getElementById("btnToggleWeather");
    if (btn) { btn.textContent = this.label(); btn.setAttribute("aria-label", `天氣：${this.label()}，按一下切換`); }
    this.syncUI();
    if (type === this.applied) return type;
    const first = this.applied === undefined;
    this.applied = type;
    window.temple3d?.setWeather?.(type, { announce, quiet: first });
    window.dispatchEvent(new CustomEvent("temple:weather", { detail: { type } }));
    return type;
  },
  init() {
    const btn = document.getElementById("btnToggleWeather"), $ = id => document.getElementById(id);
    btn?.addEventListener("click", () => {
      const next = WEATHER_MODES[(WEATHER_MODES.indexOf(this.mode()) + 1) % WEATHER_MODES.length];
      this.setMode(next);
      window.setDockStatus?.(next === "auto" ? `🕒 天氣改回跟隨${this.settings().source === "real" ? "真實天氣" : "時辰模擬"}，目前${WEATHER_INFO[this.current()].name}。` : `${WEATHER_INFO[next].icon} 天氣固定為${WEATHER_INFO[next].name}。`);
    });
    $("selectWeatherSource")?.addEventListener("change", e => this.setSource(e.target.value));
    $("selectWeatherMode")?.addEventListener("change", e => this.setMode(e.target.value));
    $("selectWeatherCity")?.addEventListener("change", e => { if (e.target.value === "here") this.useHere(); else this.setCity(e.target.value); });
    window.addEventListener("online", () => { this.realStatus = ""; this.apply(); });
    this.apply();
    clearInterval(this.timer);
    this.timer = setInterval(() => this.apply(), 60 * 1000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) this.apply(); });
  }
};
window.templeWeather = templeWeather;