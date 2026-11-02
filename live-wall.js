// live-wall.js - 多人即時香火牆、全球信眾連線與祈願彈幕系統
// 支援：跨分頁 BroadcastChannel 零延遲廣播 + 擬真實體在線湧泉 + 畫布飛天彈幕

class LiveTempleWall {
  constructor() {
    this.channel = null;
    this.initBroadcastChannel();

    // 基礎統計數據 (支援本機持久化)
    this.onlinePilgrims = Math.floor(1180 + Math.random() * 160);
    this.todayIncense = parseInt(localStorage.getItem("temple_today_incense") || "8642", 10);
    this.todayLanterns = parseInt(localStorage.getItem("temple_today_lanterns") || "1288", 10);

    // 擬真社群願力池 (定期自動滾動彈幕)
    this.presetPrayers = [
      { name: "台北 林善信", loc: "大安區", text: "祈求媽媽手術順利、早日康復安泰 🙏" },
      { name: "新竹 小陳", loc: "竹科", text: "祈求綠色乖乖保佑！週五伺服器千萬別崩潰 🟢" },
      { name: "台中 張同學", loc: "西屯區", text: "文昌帝君在上，保佑國考一戰成名金榜題名 📜" },
      { name: "台南 黃老闆", loc: "中西區", text: "五路財神保佑新店開張大吉、財源滾滾 💰" },
      { name: "高雄 吳小姐", loc: "左營區", text: "祈求月老賜正緣，揮別爛桃花，遇良善之人 ❤️" },
      { name: "矽谷 程式猿", loc: "加州", text: "願天地無Bug，代碼行行暢通，順利下班 ☕" },
      { name: "東京 留學生", loc: "新宿", text: "人在海外遙拜媽祖，祈求遠在台灣的父母身心健康 🌸" },
      { name: "新北 曾爸爸", loc: "板橋區", text: "祈求全家出入平安、工作順心、闔家和睦 🏮" },
      { name: "桃園 郭工程師", loc: "中壢區", text: "求乖乖神顯靈，線上系統運行絲滑無延遲！" },
      { name: "屏東 李信眾", loc: "潮州", text: "感謝媽祖慈悲保佑，今年果園大豐收！" }
    ];

    this.livePrayerHistory = [...this.presetPrayers];
    this.container = null;
    this.danmakuTimer = null;
  }

  init(containerId) {
    this.container = document.getElementById(containerId);
    this.renderStats();
    this.startLivingTicker();
    this.startDanmakuStream();
  }

  initBroadcastChannel() {
    if ("BroadcastChannel" in window) {
      this.channel = new BroadcastChannel("temple_realtime_stream");
      this.channel.onmessage = (event) => {
        const { type, payload } = event.data;
        if (type === "NEW_PRAYER") {
          this.receiveLivePrayer(payload, false);
        } else if (type === "INCENSE_LIT") {
          this.todayIncense++;
          this.renderStats();
          this.showBroadcastNotice(`🔥 雲端善信【${payload.name || "善信"}】點燃三炷清香！`);
        } else if (type === "HOLY_BWA") {
          this.showBroadcastNotice(`✨ 賀！善信【${payload.name || "善信"}】連續獲得三聖筊，神尊大吉應允！`);
        }
      };
    }
  }

  // 發布祈願彈幕 (跨分頁廣播 + 畫面展示)
  broadcastPrayer({ name, loc, text }) {
    const item = {
      name: name || "虔誠信眾",
      loc: loc || "雲端",
      text: text,
      time: new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })
    };

    // 廣播給其他分頁
    if (this.channel) {
      this.channel.postMessage({ type: "NEW_PRAYER", payload: item });
    }

    // 當前畫面渲染
    this.receiveLivePrayer(item, true);
  }

  // 廣播點香
  broadcastIncense(name) {
    this.todayIncense++;
    localStorage.setItem("temple_today_incense", this.todayIncense);
    this.renderStats();
    if (this.channel) {
      this.channel.postMessage({ type: "INCENSE_LIT", payload: { name } });
    }
  }

  // 接收並呈現彈幕
  receiveLivePrayer(item, isSelf = false) {
    this.livePrayerHistory.unshift(item);
    if (this.livePrayerHistory.length > 50) this.livePrayerHistory.pop();

    this.createDanmakuElement(item, isSelf);
    this.updateLiveFeedList();
  }

  // 產生橫越畫面的發光彈幕
  createDanmakuElement(item, isSelf) {
    if (!this.container) return;

    const danmaku = document.createElement("div");
    danmaku.className = `live-danmaku-item ${isSelf ? "self-danmaku" : ""}`;
    danmaku.innerHTML = `
      <span class="danmaku-badge">🏮 ${item.name} (${item.loc})</span>
      <span class="danmaku-text">${item.text}</span>
    `;

    // 隨機縱向軌道 (20px ~ 130px)
    const topOffset = 18 + (Math.random() * 110);
    danmaku.style.top = `${topOffset}px`;

    this.container.appendChild(danmaku);

    // 動畫結束自動移除
    setTimeout(() => {
      danmaku.remove();
    }, 12000);
  }

  // 定期產生社群善信祈願彈幕 (模擬全球活躍香火)
  startDanmakuStream() {
    const spawnRandom = () => {
      const randomPrayer = this.presetPrayers[Math.floor(Math.random() * this.presetPrayers.length)];
      this.createDanmakuElement(randomPrayer, false);
      const nextDelay = 4000 + Math.random() * 5000; // 每 4~9 秒隨機飄過一條
      this.danmakuTimer = setTimeout(spawnRandom, nextDelay);
    };
    spawnRandom();
  }

  // 線上人數動態微呼吸 (模擬真人浮動)
  startLivingTicker() {
    setInterval(() => {
      const delta = (Math.random() > 0.48 ? 1 : -1) * Math.floor(Math.random() * 3 + 1);
      this.onlinePilgrims = Math.max(900, this.onlinePilgrims + delta);

      if (Math.random() < 0.25) {
        this.todayIncense++;
        localStorage.setItem("temple_today_incense", this.todayIncense);
      }

      this.renderStats();
    }, 4500);
  }

  renderStats() {
    const onlineEl = document.getElementById("statOnlineCount");
    const incenseEl = document.getElementById("statTodayIncense");
    const lanternEl = document.getElementById("statTodayLantern");

    if (onlineEl) onlineEl.innerText = this.onlinePilgrims.toLocaleString();
    if (incenseEl) incenseEl.innerText = this.todayIncense.toLocaleString();
    if (lanternEl) lanternEl.innerText = this.todayLanterns.toLocaleString();
  }

  updateLiveFeedList() {
    const listEl = document.getElementById("liveWallFeed");
    if (!listEl) return;
    listEl.innerHTML = "";

    this.livePrayerHistory.slice(0, 15).forEach(item => {
      const div = document.createElement("div");
      div.className = "wall-feed-item";
      div.innerHTML = `
        <div class="feed-header">
          <strong style="color: var(--gold-bright);">🏮 ${item.name}</strong>
          <span style="color: #c9a76e; font-size: 0.75rem;">${item.loc}</span>
        </div>
        <div class="feed-body">${item.text}</div>
      `;
      listEl.appendChild(div);
    });
  }

  showBroadcastNotice(msg) {
    const bar = document.getElementById("templeBroadcastNotice");
    if (!bar) return;
    bar.innerText = msg;
    bar.classList.add("show");
    setTimeout(() => {
      bar.classList.remove("show");
    }, 4000);
  }
}

window.liveTempleWall = new LiveTempleWall();

