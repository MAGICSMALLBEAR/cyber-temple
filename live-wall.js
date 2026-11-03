// live-wall.js - 即時香火牆、同行信眾連線與祈願彈幕系統
// 支援：跨分頁 BroadcastChannel + 本地伺服器 SSE（跨裝置）廣播、真實今日香火統計、飛天彈幕
// 所有數字只計真實操作：在線＝自己＋連線中的同行分身；今日香火／點燈＝本機今日＋本次連線收到的同行

const WALL_STATS_KEY = "temple_wall_today";

// 偵測有沒有即時伺服器（server.js）。放在 GitHub Pages 等靜態空間時沒有，就不建立 SSE、不送廣播，改為單機模式。
// 有些靜態主機找不到網址時會回 200 的首頁，所以要確認回應真的是 {"ok":true}。香火牆與多人同行分身共用這個結果。
window.templeServer = {
  available: false,
  ready: (window.location.protocol.startsWith("http")
    ? fetch("/api/ping", { cache: "no-store" })
        .then(r => (r.ok ? r.json() : null))
        .then(j => !!(j && j.ok === true))
        .catch(() => false)
    : Promise.resolve(false))
};
window.templeServer.ready.then(ok => { window.templeServer.available = ok; });
const WALL_TEXT_MAX = 200;

// 示範祈願：只用於飛天彈幕點綴，一律標示「示範」，不冒充真人
const DEMO_PRAYERS = [
  "祈求家人手術順利、早日康復安泰 🙏",
  "祈求綠色乖乖保佑！週五伺服器千萬別崩潰 🟢",
  "文昌帝君在上，保佑國考一戰成名金榜題名 📜",
  "五路財神保佑新店開張大吉、財源滾滾 💰",
  "祈求月老賜正緣，揮別爛桃花，遇良善之人 ❤️",
  "願天地無 Bug，代碼行行暢通，順利下班 ☕",
  "人在海外遙拜媽祖，祈求父母身心健康 🌸",
  "祈求全家出入平安、工作順心、闔家和睦 🏮",
  "求乖乖神顯靈，線上系統運行絲滑無延遲！",
  "感謝媽祖慈悲保佑，今年果園大豐收！"
];

function wallTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function wallClip(text, max = WALL_TEXT_MAX) {
  const s = String(text ?? "");
  return s.length > max ? s.slice(0, max) + "…" : s;
}

class LiveTempleWall {
  constructor() {
    this.senderId = "wall_" + Math.random().toString(36).slice(2, 9);
    this.seenIds = new Set();
    this.channel = null;
    this.eventSource = null;

    // 舊版的模擬計數（起始 8642 / 1288 並自動亂增）不再沿用
    localStorage.removeItem("temple_today_incense");
    localStorage.removeItem("temple_today_lanterns");

    this.ownToday = this.loadOwnToday();       // 本機今日，持久化、隔日歸零
    this.othersSession = { incense: 0, lanterns: 0 }; // 本次連線收到的同行，不持久化（避免同瀏覽器多分頁重複計算）
    this.prayerFeed = [];                      // 真實祈願（自己與同行）
    this.container = null;
    this.danmakuTimer = null;

    this.getPeerCount = () => 0;
    this.getSelfName = () => "善信";
  }

  init(containerId, { getPeerCount, getSelfName } = {}) {
    this.container = document.getElementById(containerId);
    if (getPeerCount) this.getPeerCount = getPeerCount;
    if (getSelfName) this.getSelfName = getSelfName;
    this.initChannels();
    this.renderStats();
    this.updateLiveFeedList();
    this.startLivingTicker();
    this.startDanmakuStream();
  }

  // ---------- 統計 ----------
  loadOwnToday() {
    try {
      const saved = JSON.parse(localStorage.getItem(WALL_STATS_KEY) || "null");
      if (saved && saved.date === wallTodayKey()) {
        return { date: saved.date, incense: saved.incense | 0, lanterns: saved.lanterns | 0 };
      }
    } catch (e) {}
    return { date: wallTodayKey(), incense: 0, lanterns: 0 };
  }

  bumpOwn(field) {
    if (this.ownToday.date !== wallTodayKey()) {
      this.ownToday = { date: wallTodayKey(), incense: 0, lanterns: 0 };
      this.othersSession = { incense: 0, lanterns: 0 };
    }
    this.ownToday[field]++;
    localStorage.setItem(WALL_STATS_KEY, JSON.stringify(this.ownToday));
  }

  get onlineCount() {
    return 1 + (this.getPeerCount() || 0);
  }

  get todayIncense() {
    return this.ownToday.incense + this.othersSession.incense;
  }

  get todayLanterns() {
    return this.ownToday.lanterns + this.othersSession.lanterns;
  }

  // ---------- 傳輸：同瀏覽器分頁走 BroadcastChannel，跨裝置走伺服器 SSE ----------
  initChannels() {
    if ("BroadcastChannel" in window) {
      this.channel = new BroadcastChannel("temple_realtime_stream");
      this.channel.onmessage = (event) => this.receive(event.data);
    }
    window.templeServer.ready.then(ok => {
      if (!ok || !("EventSource" in window)) {
        this.showNoServerNote();
        return;
      }
      try {
        this.eventSource = new EventSource("/api/events");
        this.eventSource.onmessage = (event) => {
          try {
            this.receive(JSON.parse(event.data));
          } catch (e) {}
        };
      } catch (e) {}
    });
  }

  showNoServerNote() {
    const note = document.getElementById("wallConnectionNote");
    if (note) note.textContent = "目前沒有連線伺服器，只會同步同一個瀏覽器的分頁。要和其他裝置同行，請用「啟動神殿.bat」開啟，或部署到有執行 server.js 的主機。";
  }

  send(type, payload) {
    const msg = { wall: true, id: this.senderId + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6), from: this.senderId, type, payload };
    this.seenIds.add(msg.id);
    if (this.channel) this.channel.postMessage(msg);
    if (this.eventSource) {
      fetch("/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg)
      }).catch(() => {});
    }
  }

  // 同一則訊息可能同時從 BroadcastChannel 與 SSE 抵達，以 id 去重
  receive(msg) {
    if (!msg || !msg.wall || msg.from === this.senderId || !msg.id || this.seenIds.has(msg.id)) return;
    this.seenIds.add(msg.id);
    if (this.seenIds.size > 500) this.seenIds = new Set([...this.seenIds].slice(-250));

    const p = msg.payload || {};
    const name = wallClip(p.name || "善信", 30);
    if (msg.type === "PRAYER") {
      this.receiveLivePrayer({ name, loc: wallClip(p.loc || "雲端", 20), text: wallClip(p.text), time: wallClip(p.time, 10) }, false);
    } else if (msg.type === "INCENSE") {
      this.othersSession.incense++;
      this.renderStats();
      this.showBroadcastNotice(`🔥 同行善信【${name}】點燃三炷清香！`);
    } else if (msg.type === "LANTERN") {
      this.othersSession.lanterns++;
      this.renderStats();
    } else if (msg.type === "HOLY_BWA") {
      this.showBroadcastNotice(`✨ 賀！同行善信【${name}】連續獲得三聖筊，神尊大吉應允！`);
    }
  }

  // ---------- 對外 API ----------
  // 發布祈願（彈幕 + 香火牆 + 廣播給同行）
  broadcastPrayer({ name, loc, text }) {
    if (!text) return;
    const item = {
      name: wallClip(name || "虔誠信眾", 30),
      loc: wallClip(loc || "雲端", 20),
      text: wallClip(text),
      time: new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })
    };
    this.send("PRAYER", item);
    this.receiveLivePrayer(item, true);
  }

  // 科儀完成的公告式彈幕，以自己的名義發布
  addDanmaku(text, loc = "神殿") {
    this.broadcastPrayer({ name: this.getSelfName(), loc, text });
  }

  broadcastIncense(name) {
    this.bumpOwn("incense");
    this.renderStats();
    this.send("INCENSE", { name: name || this.getSelfName() });
  }

  recordLantern(name) {
    this.bumpOwn("lanterns");
    this.renderStats();
    this.send("LANTERN", { name: name || this.getSelfName() });
  }

  announceHolyBwa(name) {
    this.send("HOLY_BWA", { name: name || this.getSelfName() });
  }

  // ---------- 呈現 ----------
  receiveLivePrayer(item, isSelf = false) {
    this.prayerFeed.unshift({ ...item, isSelf });
    if (this.prayerFeed.length > 50) this.prayerFeed.pop();
    this.createDanmakuElement(`🏮 ${item.name}（${item.loc}）`, item.text, isSelf ? "self-danmaku" : "");
    this.updateLiveFeedList();
  }

  createDanmakuElement(badgeText, bodyText, extraClass = "") {
    if (!this.container) return;
    const danmaku = document.createElement("div");
    danmaku.className = `live-danmaku-item ${extraClass}`.trim();
    const badge = document.createElement("span");
    badge.className = "danmaku-badge";
    badge.textContent = badgeText;
    const body = document.createElement("span");
    body.className = "danmaku-text";
    body.textContent = bodyText;
    danmaku.append(badge, body);

    // 隨機縱向軌道 (18px ~ 128px)
    danmaku.style.top = `${18 + Math.random() * 110}px`;
    this.container.appendChild(danmaku);
    setTimeout(() => danmaku.remove(), 12000);
  }

  // 示範祈願點綴：明確標示，間隔較長，不進香火牆
  startDanmakuStream() {
    const spawnDemo = () => {
      const text = DEMO_PRAYERS[Math.floor(Math.random() * DEMO_PRAYERS.length)];
      this.createDanmakuElement("📜 示範祈願", text, "demo-danmaku");
      this.danmakuTimer = setTimeout(spawnDemo, 9000 + Math.random() * 9000);
    };
    this.danmakuTimer = setTimeout(spawnDemo, 3000);
  }

  // 同行分身由 avatar3d 依心跳增減，定期刷新在線人數；跨日自動歸零
  startLivingTicker() {
    setInterval(() => {
      if (this.ownToday.date !== wallTodayKey()) {
        this.ownToday = { date: wallTodayKey(), incense: 0, lanterns: 0 };
        this.othersSession = { incense: 0, lanterns: 0 };
      }
      this.renderStats();
    }, 3000);
  }

  renderStats() {
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v.toLocaleString();
    };
    set("statOnlineCount", this.onlineCount);
    set("statTodayIncense", this.todayIncense);
    set("statTodayLantern", this.todayLanterns);
    set("hudOnlineCount", this.onlineCount);
  }

  updateLiveFeedList() {
    const listEl = document.getElementById("liveWallFeed");
    if (!listEl) return;
    listEl.replaceChildren();

    if (this.prayerFeed.length === 0) {
      const empty = document.createElement("div");
      empty.className = "wall-feed-empty";
      empty.textContent = "本次連線尚無祈願。從底部 💬 祈願發出第一則，同行善信都看得到。";
      listEl.appendChild(empty);
      return;
    }

    this.prayerFeed.slice(0, 30).forEach(item => {
      const div = document.createElement("div");
      div.className = `wall-feed-item${item.isSelf ? " is-self" : ""}`;
      const header = document.createElement("div");
      header.className = "feed-header";
      const who = document.createElement("strong");
      who.textContent = `🏮 ${item.name}${item.isSelf ? "（你）" : ""}`;
      const meta = document.createElement("span");
      meta.textContent = [item.loc, item.time].filter(Boolean).join(" • ");
      header.append(who, meta);
      const body = document.createElement("div");
      body.className = "feed-body";
      body.textContent = item.text;
      div.append(header, body);
      listEl.appendChild(div);
    });
  }

  showBroadcastNotice(msg) {
    const bar = document.getElementById("templeBroadcastNotice");
    if (!bar) return;
    bar.textContent = msg;
    bar.classList.add("show");
    clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => bar.classList.remove("show"), 4000);
  }
}

window.liveTempleWall = new LiveTempleWall();
