// app.js - 賽博虛擬神殿 3D 全景主控中樞 (大殿、廟埕、許願池、108念珠與語音)

// 諸神配置
const DEITIES = {
  mazu: { id: "mazu", name: "天上聖母 媽祖", title: "護國庇民 • 萬事安泰", blessing: "四海清平，慈悲普照，信眾闔家吉祥安康。" },
  wenchang: { id: "wenchang", name: "文昌梓潼帝君", title: "魁星點斗 • 金榜題名", blessing: "文思泉湧，心性專注，考運與事業大道亨通。" },
  caishen: { id: "caishen", name: "五路武財神 趙公明", title: "八方聚寶 • 財源滾滾", blessing: "正偏財運利祿亨通，誠信經商，生生不息。" },
  yuelao: { id: "yuelao", name: "月下老人 尊神", title: "千里姻緣 • 喜結良緣", blessing: "紅線暗引，天定良緣，有情人終成眷屬。" },
  guaiguai: { id: "guaiguai", name: "科技守護 綠色乖乖神", title: "伺服器乖乖 • 永無Bug", blessing: "主機綠燈長亮，部署零故障，代碼順暢神仙保佑！" }
};

// 詩意隨機稱號庫
const RANDOM_TITLES = [
  "悠閒的雲",
  "淡淡的月光",
  "清醒的打工人",
  "伺服器守護使",
  "不當機的碼農",
  "心寬的大仙",
  "大殿裡的摸魚客",
  "修道的小沙彌",
  "滿懷感恩的樹",
  "尋求正緣的善信",
  "考運亨通的學子",
  "萬里求道者"
];

// 狀態管理
const state = {
  currentDeity: "mazu",
  meritCount: parseInt(localStorage.getItem("temple_merit") || "0", 10),
  consecutiveHolyBwa: 0,
  autoMuyuTimer: null,
  selectedChiam: null,
  avatarConfig: JSON.parse(localStorage.getItem("temple_avatar_cfg") || "null") || {
    roleType: "novice",
    robeColor: "#c24b2b",
    hatType: "headband",
    title: "悠閒的信眾",
    holdingItem: "incense"
  }
};

let temple3d = null;

// 初始化
window.addEventListener("DOMContentLoaded", () => {
  // 1. 初始化 3D WebGL 場景與角色
  if (window.Temple3DScene) {
    temple3d = new Temple3DScene("canvas3dContainer");
    // 其他模組（avatar3d、beads 與本檔多處）都透過 window.temple3d 取用場景
    window.temple3d = temple3d;
    if (temple3d.avatar && state.avatarConfig) {
      temple3d.avatar.customize(state.avatarConfig);
    }
  }

  // 2. 初始化 108 念珠與行動虛擬搖桿
  if (window.beadsSystem) {
    window.beadsSystem.init();
  }
  if (window.mobileJoystick) {
    window.mobileJoystick.init();
  }

  // 3. 初始化即時彈幕
  if (window.liveTempleWall) {
    window.liveTempleWall.init("danmakuContainer", {
      getPeerCount: () => (temple3d && temple3d.avatar && temple3d.avatar.peers ? temple3d.avatar.peers.size : 0),
      getSelfName: () => state.avatarConfig.title || "善信"
    });
  }

  // 3.5 每日修行（自動簽到需要 addMerit 與通知條，放在香火牆之後）
  if (window.dailyPractice) {
    window.dailyPractice.init({ getDeity: () => state.currentDeity });
  }

  // 4. 更新功德池與 AI 標籤
  updateMeritDisplay();
  updateAIEngineBadge();

  // 5. 綁定事件
  bindEvents();
});

function bindEvents() {
  // 3D 視角切換塢 (包含分身隨行、第一人稱、大殿、宏偉三進廟埕、偏殿、山門)
  document.querySelectorAll(".btn-cam-view").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".btn-cam-view").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const view = btn.dataset.view;
      if (temple3d) temple3d.setCameraView(view);
      if (view === "follow") {
        setDockStatus("🎥 鏡頭已鎖定跟隨分身漫遊！按 [C] 可隨時對齊分身身後。");
      } else if (view === "firstPerson") {
        setDockStatus("👁️ 第一人稱主觀視角已啟動！使用 WASD 漫步殿宇廟埕，身歷其境。");
      } else if (view === "wenchang") {
        setDockStatus("🎓 鏡頭已定位東翼文昌閣！靠近大殿東廊按 [E] 即可進行考運功名祈福。");
      } else if (view === "yuelao") {
        setDockStatus("❤️ 鏡頭已定位東翼月老閣！靠近東廊按 [E] 即可求取天賜良緣紅線。");
      } else if (view === "caishen") {
        setDockStatus("💰 鏡頭已定位西翼五路財神洞窟！靠近西廊按 [E] 撫摸萬兩黃金元寶。");
      } else if (view === "taisui") {
        setDockStatus("🏮 鏡頭已定位西翼太歲殿！靠近按 [E] 即可進行安太歲與元辰斗燈祈福。");
      } else if (view === "bellTower") {
        setDockStatus("🔔 鏡頭已定位東天鐘樓！靠近按 [E] 或點擊金鐘即可叩撞祈福。");
      } else if (view === "drumTower") {
        setDockStatus("🥁 鏡頭已定位西暮鼓樓！靠近按 [E] 或點擊雷鼓即可擊響祈福。");
      } else if (view === "parade") {
        setDockStatus("🏮 鏡頭已定位迎神遶境聖駕！隨香護駕、伏地鑽轎腳蒙神加持！");
      }
      window.templeAudio.playBell(560);
    });
  });

  // 神尊切換塢
  document.querySelectorAll(".btn-deity-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".btn-deity-pill").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const deityKey = btn.dataset.deity;
      state.currentDeity = deityKey;
      const deity = DEITIES[deityKey];

      // 神尊立體雕像即時變換
      if (temple3d) {
        temple3d.switchDeityStatue(deityKey);
      }

      setDockStatus(`🙏 當前參拜：【${deity.name}】（${deity.blessing}）`);
      window.templeAudio.playBell(520);
    });
  });

  // 角色禮佛動作列
  document.getElementById("btnActionBow").addEventListener("click", () => {
    if (temple3d && temple3d.avatar) temple3d.avatar.triggerAction("bow");
    window.emitRitual?.("bow");
    setDockStatus("🙇 恭敬行三鞠躬禮...");
  });

  document.getElementById("btnActionKneel").addEventListener("click", () => {
    if (temple3d && temple3d.avatar) temple3d.avatar.triggerAction("kneel");
    window.emitRitual?.("bow");
    setDockStatus("🧎 雙膝著地，虔誠跪拜禮佛...");
  });

  document.getElementById("btnActionPray").addEventListener("click", () => {
    if (temple3d && temple3d.avatar) temple3d.avatar.triggerAction("pray");
    window.emitRitual?.("bow");
    setDockStatus("🙏 雙手合十胸前，默念心中祈願...");
  });

  document.getElementById("btnActionMeditate").addEventListener("click", () => {
    if (temple3d && temple3d.avatar) temple3d.avatar.triggerAction("meditate");
    setDockStatus("🧘 盤腿打坐靜修，萬念放下，聆聽禪意鐘磬...");
  });

  // 角色疾步奔跑切換
  const btnSprint = document.getElementById("btnToggleSprint");
  if (btnSprint) {
    btnSprint.addEventListener("click", () => {
      if (temple3d && temple3d.avatar) {
        const running = temple3d.avatar.toggleSprint();
        btnSprint.classList.toggle("active", running);
        btnSprint.innerText = running ? "🚶 漫步 (Shift)" : "⚡ 疾步 (Shift)";
        setDockStatus(running ? "⚡ 已開啟疾步奔跑！行走速度倍增，快步遊覽宏偉廟境。" : "🚶 已切換為悠閒漫步。");
      }
    });
  }

  // 108 顆念珠開關
  document.getElementById("btnOpenBeads").addEventListener("click", () => {
    if (window.beadsSystem) window.beadsSystem.open();
  });

  // 點燃清香
  document.getElementById("btnLightIncense").addEventListener("click", () => {
    if (!temple3d) return;
    window.templeAudio.playLighter();
    setTimeout(() => {
      temple3d.lightIncense();
      window.templeAudio.playBell(440);
      setDockStatus("🔥 三炷清香已點燃，煙霧繚繞，誠心達天！");
      if (window.liveTempleWall) {
        window.liveTempleWall.broadcastIncense(state.avatarConfig.title || "善信");
      }
      window.emitRitual?.("incense", { deity: state.currentDeity });
    }, 120);
  });

  // 3D 擲筊
  document.getElementById("btnThrowBwa").addEventListener("click", () => {
    performBwaToss();
  });

  // 3D 搖籤筒抽籤
  document.getElementById("btnShakeChiam").addEventListener("click", () => {
    performChiamShake();
  });

  // 3D 敲木魚
  document.getElementById("btnKnockMuyu").addEventListener("click", () => {
    performMuyuStrike(true);
  });

  // 時辰天色切換
  const selShichen = document.getElementById("selectShichen");
  if (selShichen) {
    selShichen.addEventListener("change", (e) => {
      const val = e.target.value;
      if (temple3d) temple3d.setShichen(val);
      const labels = {
        auto: "跟隨真實時間",
        dawn: "🌅 卯時 • 晨霧金曦",
        noon: "☀️ 午時 • 烈日金光",
        dusk: "🌇 酉時 • 晚霞暮光",
        midnight: "🌌 子時 • 深夜星空"
      };
      setDockStatus(`🕒 已切換時辰天色為【${labels[val] || val}】`);
    });
  }

  // 天候氛圍切換 (晴空 -> 梵天微雨 -> 桃花落瓣)
  const btnWeather = document.getElementById("btnToggleWeather");
  if (btnWeather) {
    const WEATHER_MODES = ["clear", "rain", "blossoms"];
    const WEATHER_LABELS = {
      clear: "🌧️ 晴空",
      rain: "🌧️ 微雨",
      blossoms: "🌸 落瓣"
    };
    let currentWeatherIdx = 0;

    btnWeather.addEventListener("click", () => {
      currentWeatherIdx = (currentWeatherIdx + 1) % WEATHER_MODES.length;
      const mode = WEATHER_MODES[currentWeatherIdx];
      btnWeather.innerText = WEATHER_LABELS[mode];
      if (temple3d) {
        temple3d.setWeather(mode);
      }
    });
  }

  // 投擲金幣許願
  document.getElementById("btnTossCoin").addEventListener("click", () => {
    if (temple3d) temple3d.tossWishingCoin();
    const cur = parseInt(localStorage.getItem("temple_wishing_coins") || "0", 10) + 1;
    localStorage.setItem("temple_wishing_coins", cur);
  });

  // 焚燒金紙化寶
  document.getElementById("btnBurnPaper").addEventListener("click", () => {
    if (temple3d) temple3d.burnJossPaper();
    const cur = parseInt(localStorage.getItem("temple_burned_paper") || "0", 10) + 1;
    localStorage.setItem("temple_burned_paper", cur);
  });

  // 偏殿巡禮彈窗開關
  document.getElementById("btnOpenSideHalls").addEventListener("click", () => {
    window.openSideHallModal('wenchang');
  });

  document.getElementById("sideHallModalClose").addEventListener("click", () => {
    document.getElementById("sideHallModal").classList.remove("open");
  });

  // 偏殿分頁切換
  document.querySelectorAll(".side-hall-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      switchSideHallTab(btn.dataset.hall);
      window.templeAudio.playBell(528);
    });
  });

  // 文昌閣儀式
  document.getElementById("btnWenchangBrush").addEventListener("click", () => {
    addMerit(35);
    window.templeAudio.playConsecrationChime();
    spawnAvatarFloatingText("🖌️ 文昌智慧筆點亮！思路澄澈、才思敏捷");
    if (window.liveTempleWall) window.liveTempleWall.addDanmaku("🖌️ 恭敬點亮文昌帝君硃砂智慧筆，祈求才思敏捷、智慧大開！");
    setDockStatus("🎓 文昌硃砂智慧筆已點亮！思路澄澈，才思敏捷，功德 +35！");
  });

  document.getElementById("btnWenchangOde").addEventListener("click", () => {
    addMerit(50);
    window.templeAudio.playMuyuSound();
    window.templeAudio.playBell(528);
    spawnAvatarFloatingText("📜 廣積陰騭，天必福之！福蔭門第");
    if (window.liveTempleWall) window.liveTempleWall.addDanmaku("📜 虔誦文昌帝君陰騭文：諸惡莫作，眾善奉行，福蔭後代！");
    setDockStatus("📜 虔誦《文昌陰騭文》，心神安寧，廣積陰騭，功德 +50！");
  });

  document.getElementById("btnSubmitWenchangBlessing").addEventListener("click", () => {
    const candidate = document.getElementById("txtWenchangCandidate").value.trim() || state.avatarConfig.title || "善信";
    const exam = document.getElementById("txtWenchangExam").value.trim() || "功名應試";
    addMerit(40);
    window.templeAudio.playBell(660);
    spawnAvatarFloatingText(`🌟 魁星點斗！祝 ${candidate} 金榜題名`);
    if (window.liveTempleWall) window.liveTempleWall.broadcastPrayer({ name: candidate, loc: "文昌閣", text: `祈求文昌帝君加持：${exam} 金榜及第、名列前茅！` });
    setDockStatus(`🌟 文昌祈願疏文奉呈！祈佑善信 ${candidate} 應試 ${exam} 魁星題名，功德 +40！`);
  });

  // 月老閣儀式
  document.getElementById("btnYuelaoThread").addEventListener("click", () => {
    addMerit(35);
    window.templeAudio.playBell(660);
    spawnAvatarFloatingText("🧶 月老賜紅絲線：千里良緣，情深意長");
    if (window.liveTempleWall) window.liveTempleWall.addDanmaku("🧶 恭請月下老人牽紅絲線，祝天下有情人終成眷屬！");
    setDockStatus("❤️ 月老紅絲線已求得！千里暗牽，早結良緣，功德 +35！");
  });

  document.getElementById("btnYuelaoLock").addEventListener("click", () => {
    addMerit(50);
    window.templeAudio.playBell(720);
    spawnAvatarFloatingText("🔒 同心金鎖永扣：琴瑟和鳴，白頭偕老");
    if (window.liveTempleWall) window.liveTempleWall.addDanmaku("🔒 扣上同心金鎖：心心相印，永結鸞儔！");
    setDockStatus("💕 同心金鎖已扣合！恩愛兩不疑，白頭偕老，功德 +50！");
  });

  document.getElementById("btnSubmitYuelaoBlessing").addEventListener("click", () => {
    const self = document.getElementById("txtYuelaoSelf").value.trim() || state.avatarConfig.title || "善信";
    const target = document.getElementById("txtYuelaoTarget").value.trim() || "相知相惜之善緣伴侶";
    addMerit(40);
    window.templeAudio.playBell(660);
    spawnAvatarFloatingText(`💕 天賜良緣！祈佑 ${self} 締結善緣`);
    if (window.liveTempleWall) window.liveTempleWall.broadcastPrayer({ name: self, loc: "月老閣", text: `祈求月下老人牽線：與 ${target} 結締良緣、恩愛永固！` });
    setDockStatus(`💕 月老牽線疏文奉呈！祈佑善信 ${self} 早結天賜良緣，功德 +40！`);
  });

  // 財神殿儀式
  document.getElementById("btnCaishenIngot").addEventListener("click", () => {
    addMerit(35);
    window.templeAudio.playCoinSound();
    spawnAvatarFloatingText("🪙 萬兩元寶聚寶：財源滾滾，日進斗金");
    if (window.liveTempleWall) window.liveTempleWall.addDanmaku("🪙 撫摸五路財神萬兩純金大元寶，八方進寶、財庫飽滿！");
    setDockStatus("💰 萬兩黃金元寶聚寶！財氣充盈，利路亨通，功德 +35！");
  });

  document.getElementById("btnCaishenWater").addEventListener("click", () => {
    addMerit(50);
    window.templeAudio.playChime(880);
    spawnAvatarFloatingText("💧 恭請五路發財水：甘露潤澤，生財有道");
    if (window.liveTempleWall) window.liveTempleWall.addDanmaku("💧 迎請五路財神開運發財水，甘霖潤澤、富貴吉祥！");
    setDockStatus("💧 五路開運發財水恭請加持！正偏財氣皆旺，功德 +50！");
  });

  document.getElementById("btnCaishenTiger").addEventListener("click", () => {
    addMerit(40);
    window.templeAudio.playBell(440);
    spawnAvatarFloatingText("🐯 金虎爺咬錢避煞：正偏財旺，諸邪退避");
    if (window.liveTempleWall) window.liveTempleWall.addDanmaku("🐯 金虎將軍顯神威咬錢送寶，避除凶煞、大發利市！");
    setDockStatus("🐯 金虎爺咬錢庇佑！避凶化煞，偏財亨通，功德 +40！");
  });

  document.getElementById("btnSubmitCaishenBlessing").addEventListener("click", () => {
    const wish = document.getElementById("txtCaishenWish").value.trim() || "日進斗金、財庫充盈";
    const name = state.avatarConfig.title || "善信";
    addMerit(40);
    window.templeAudio.playBell(660);
    spawnAvatarFloatingText(`💰 八方招財！祈佑 ${wish}`);
    if (window.liveTempleWall) window.liveTempleWall.broadcastPrayer({ name, loc: "財神殿", text: `祈求五路財神恩賜：${wish}、生意興隆！` });
    setDockStatus(`💰 五路財神疏文奉呈！祈佑所求 ${wish} 八方聚寶，功德 +40！`);
  });

  // 功德福閣 • 數位平安開光靈符彈窗開關
  document.getElementById("btnOpenAmulet").addEventListener("click", () => {
    window.openAmuletModal();
  });

  // 迎神遶境慶典開關
  document.getElementById("btnTriggerParade").addEventListener("click", () => {
    if (temple3d) {
      temple3d.startParade();
    }
  });

  // 叩撞金鐘
  document.getElementById("btnStrikeBell").addEventListener("click", () => {
    if (temple3d) {
      temple3d.strikeBell();
    }
  });

  // 擊響雷鼓
  document.getElementById("btnBeatDrum").addEventListener("click", () => {
    if (temple3d) {
      temple3d.beatDrum();
    }
  });

  // 線上收驚科儀彈窗開關
  document.getElementById("btnOpenShoujing").addEventListener("click", () => {
    window.openShoujingModal();
  });

  document.getElementById("shoujingModalClose").addEventListener("click", () => {
    document.getElementById("shoujingModal").classList.remove("open");
  });

  // 法器結緣閣彈窗開關
  document.getElementById("btnOpenRelicShop").addEventListener("click", () => {
    window.openRelicShopModal();
  });

  document.getElementById("relicShopModalClose").addEventListener("click", () => {
    document.getElementById("relicShopModal").classList.remove("open");
  });

  // 拍立得留影坊彈窗開關
  document.getElementById("btnOpenPhoto").addEventListener("click", () => {
    window.openPhotoModal();
  });

  document.getElementById("photoModalClose").addEventListener("click", () => {
    document.getElementById("photoModal").classList.remove("open");
  });

  // 太歲元辰殿彈窗開關
  document.getElementById("btnOpenTaiSui").addEventListener("click", () => {
    window.openTaiSuiModal();
  });

  document.getElementById("taiSuiModalClose").addEventListener("click", () => {
    document.getElementById("taiSuiModal").classList.remove("open");
  });

  // 梵音課誦節奏法會彈窗開關
  document.getElementById("btnOpenRhythm").addEventListener("click", () => {
    window.openRhythmModal();
  });

  document.getElementById("rhythmModalClose").addEventListener("click", () => {
    document.getElementById("rhythmModal").classList.remove("open");
    stopRhythmGame();
  });

  // 萌寵護法神獸彈窗與互動
  const btnOpenPetEl = document.getElementById("btnOpenPet");
  if (btnOpenPetEl) {
    btnOpenPetEl.addEventListener("click", () => {
      window.openPetModal();
    });
  }

  const petModalCloseEl = document.getElementById("petModalClose");
  if (petModalCloseEl) {
    petModalCloseEl.addEventListener("click", () => {
      window.closePetModal();
    });
  }

  const btnPetInteractEl = document.getElementById("btnPetInteract");
  if (btnPetInteractEl) {
    btnPetInteractEl.addEventListener("click", () => {
      window.interactWithPet();
    });
  }

  const btnPetPettingEl = document.getElementById("btnPetPetting");
  if (btnPetPettingEl) {
    btnPetPettingEl.addEventListener("click", () => {
      window.interactWithPet();
    });
  }

  const btnPetDismissEl = document.getElementById("btnPetDismiss");
  if (btnPetDismissEl) {
    btnPetDismissEl.addEventListener("click", () => {
      if (window.temple3d && window.temple3d.avatar) {
        window.temple3d.avatar.setPetType("none");
      }
      if (typeof updatePetModalUI === "function") updatePetModalUI();
      if (window.setDockStatus) window.setDockStatus("🐾 靈寵已暫時回山修憩，處於獨步清修狀態。");
    });
  }

  document.querySelectorAll(".pet-card").forEach(card => {
    card.addEventListener("click", (e) => {
      const pType = card.dataset.petType;
      if (window.temple3d && window.temple3d.avatar) {
        window.temple3d.avatar.setPetType(pType);
      }
      if (typeof updatePetModalUI === "function") updatePetModalUI();
      if (window.templeAudio) window.templeAudio.playPetPurr(pType);
      if (window.setDockStatus) window.setDockStatus(`🐾 已選擇【${card.querySelector(".btn-select-pet")?.innerText || pType}】隨行護佑！`);
    });
  });

  // 平溪賽博祈安天燈彈窗與放飛
  const btnOpenSkyLanternEl = document.getElementById("btnOpenSkyLantern");
  if (btnOpenSkyLanternEl) {
    btnOpenSkyLanternEl.addEventListener("click", () => {
      window.openSkyLanternModal();
    });
  }

  const skyLanternModalCloseEl = document.getElementById("skyLanternModalClose");
  if (skyLanternModalCloseEl) {
    skyLanternModalCloseEl.addEventListener("click", () => {
      window.closeSkyLanternModal();
    });
  }

  document.querySelectorAll(".lantern-quick-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      const textInput = document.getElementById("skyLanternText");
      if (textInput) textInput.value = pill.dataset.text;
    });
  });

  const btnLaunchSkyLanternEl = document.getElementById("btnLaunchSkyLantern");
  if (btnLaunchSkyLanternEl) {
    btnLaunchSkyLanternEl.addEventListener("click", () => {
      launchCurrentSkyLantern();
    });
  }

  const btnLaunchWaterLanternEl = document.getElementById("btnLaunchWaterLantern");
  if (btnLaunchWaterLanternEl) {
    btnLaunchWaterLanternEl.addEventListener("click", () => {
      launchCurrentWaterLantern();
    });
  }

  // 賽博禪修堂彈窗與控制
  const btnOpenZenEl = document.getElementById("btnOpenZen");
  if (btnOpenZenEl) {
    btnOpenZenEl.addEventListener("click", () => {
      window.openZenModal();
    });
  }

  const zenModalCloseEl = document.getElementById("zenModalClose");
  if (zenModalCloseEl) {
    zenModalCloseEl.addEventListener("click", () => {
      window.closeZenModal();
    });
  }

  document.querySelectorAll(".zen-mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".zen-mode-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      zenMode = btn.dataset.mode;
    });
  });

  document.querySelectorAll(".zen-time-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".zen-time-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      zenTargetDuration = parseInt(btn.dataset.time, 10);
      const m = Math.floor(zenTargetDuration / 60);
      const s = zenTargetDuration % 60;
      const tText = zenTargetDuration > 0 ? `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}` : "00:00";
      const tEl = document.getElementById("zenTimerText");
      if (tEl) tEl.innerText = tText;
    });
  });

  // 混音器滑桿監聽
  ["Wind", "Rain", "Birds", "Bowl"].forEach(track => {
    const slider = document.getElementById(`zen${track}Vol`);
    if (slider) {
      slider.addEventListener("input", (e) => {
        const vol = parseFloat(e.target.value) / 100;
        if (window.templeAudio) {
          window.templeAudio.setZenTrackVolume(track.toLowerCase(), vol);
        }
      });
    }
  });

  const btnStartZenEl = document.getElementById("btnStartZen");
  if (btnStartZenEl) {
    btnStartZenEl.addEventListener("click", () => {
      startZenMeditation();
    });
  }

  const btnStopZenEl = document.getElementById("btnStopZen");
  if (btnStopZenEl) {
    btnStopZenEl.addEventListener("click", () => {
      stopZenMeditation(false);
    });
  }

  // 1. 搏杯大賽擂台事件綁定
  document.getElementById("btnOpenBwaComp")?.addEventListener("click", () => window.openBwaCompModal());
  document.getElementById("bwaCompModalClose")?.addEventListener("click", () => window.closeBwaCompModal());
  document.getElementById("btnBwaCompThrow")?.addEventListener("click", () => throwBwaCompetition());
  document.getElementById("btnBwaCompReset")?.addEventListener("click", () => resetBwaCompetition());
  document.getElementById("btnBwaCompDownload")?.addEventListener("click", () => generateBwaCertificate());
  document.getElementById("chkGoldenBwa")?.addEventListener("change", (e) => {
    if (window.temple3d) window.temple3d.setBwaGoldenMaterial(e.target.checked);
  });

  // 2. 宮廟藏經閣事件綁定
  document.getElementById("btnOpenLore")?.addEventListener("click", () => window.openLoreModal());
  document.getElementById("loreModalClose")?.addEventListener("click", () => window.closeLoreModal());
  document.getElementById("tabLoreChiam")?.addEventListener("click", () => switchLoreTab("chiam"));
  document.getElementById("tabLoreDeities")?.addEventListener("click", () => switchLoreTab("deities"));
  document.getElementById("tabLoreTraditions")?.addEventListener("click", () => switchLoreTab("traditions"));
  document.getElementById("loreSearchInput")?.addEventListener("input", (e) => renderLoreList(e.target.value));
  document.getElementById("btnLoreDetailBack")?.addEventListener("click", () => {
    const detailEl = document.getElementById("loreDetailView");
    const containerEl = document.getElementById("loreContentContainer");
    if (detailEl) detailEl.style.display = "none";
    if (containerEl) containerEl.style.display = "grid";
  });
  document.getElementById("btnLoreStudy")?.addEventListener("click", () => {
    addMerit(20);
    if (window.templeAudio) window.templeAudio.playBell(528);
    alert("📖 虔心研讀領悟經義！功德 +20，智慧增長！");
  });

  // 3. 賽博御賜平安齋事件綁定
  document.getElementById("btnOpenFeast")?.addEventListener("click", () => window.openFeastModal());
  document.getElementById("feastModalClose")?.addEventListener("click", () => window.closeFeastModal());
  document.querySelectorAll(".feast-slot").forEach(slot => {
    slot.addEventListener("click", () => {
      currentFeastSlot = parseInt(slot.dataset.slot, 10);
      updateFeastSlotsUI();
    });
  });
  document.querySelectorAll(".feast-dish-picker").forEach(picker => {
    picker.addEventListener("click", () => {
      selectFeastDish(picker.dataset.dish);
    });
  });
  document.getElementById("btnFeastPresent")?.addEventListener("click", () => presentFeastOffering());
  document.getElementById("btnFeastReset")?.addEventListener("click", () => resetFeastDishes());

  // 4. 線上抄經閣事件綁定
  document.getElementById("btnOpenCopySutra")?.addEventListener("click", () => window.openCopySutraModal());
  document.getElementById("copySutraModalClose")?.addEventListener("click", () => window.closeCopySutraModal());
  document.getElementById("sutraSelect")?.addEventListener("change", (e) => drawSutraCanvas(e.target.value));
  document.querySelectorAll(".sutra-color-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".sutra-color-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      sutraBrushColor = btn.dataset.color;
    });
  });
  document.querySelectorAll(".sutra-size-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".sutra-size-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      sutraBrushSize = parseInt(btn.dataset.size, 10);
    });
  });
  document.getElementById("btnSutraClear")?.addEventListener("click", () => {
    const sel = document.getElementById("sutraSelect");
    drawSutraCanvas(sel ? sel.value : "heart");
  });
  document.getElementById("btnSutraComplete")?.addEventListener("click", () => completeSutraCopying());
  document.getElementById("btnSutraDownload")?.addEventListener("click", () => downloadSutraPNG());
  initSutraCanvasEvents();

  document.getElementById("amuletModalClose").addEventListener("click", () => {
    document.getElementById("amuletModal").classList.remove("open");
  });

  // 靈符卡片選取
  document.querySelectorAll(".amulet-card-item").forEach(card => {
    card.addEventListener("click", () => {
      document.querySelectorAll(".amulet-card-item").forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      selectedAmuletType = card.dataset.amulet;
      window.templeAudio.playBell(600);
    });
  });

  // 靈符過香爐開光三圈儀式
  document.getElementById("btnConsecrateAmulet").addEventListener("click", () => {
    if (state.meritCount < 20) {
      setDockStatus("⚠️ 請領靈符開光需 20 功德，請先敬香或勤敲木魚積累功德！");
      window.templeAudio.playMuyuSound();
      return;
    }
    addMerit(-20);

    const statusText = document.getElementById("consecrateStatus");
    const animArea = document.getElementById("consecrateCenserAnim");
    const btn = document.getElementById("btnConsecrateAmulet");
    const resultSec = document.getElementById("amuletResultSection");

    btn.disabled = true;
    resultSec.style.display = "none";
    animArea.style.display = "flex";

    window.templeAudio.playConsecrationChime();

    statusText.innerHTML = "🌀 <b>過香爐第 1 圈</b> • 迎神降真，淨化身心...";
    setTimeout(() => {
      statusText.innerHTML = "🌀 <b>過香爐第 2 圈</b> • 仙真威光，法力灌注...";
    }, 1000);

    setTimeout(() => {
      statusText.innerHTML = "🌀 <b>過香爐第 3 圈</b> • 鈐蓋朱砂大印，神光煥發！";
    }, 2000);

    setTimeout(() => {
      animArea.style.display = "none";
      btn.disabled = false;
      statusText.innerHTML = "✨ <b>開光圓滿</b> • 靈符已具備神威守護！可下載桌布或隨身佩戴。";
      window.templeAudio.playBell(792);

      drawAmuletCanvas(selectedAmuletType);
      resultSec.style.display = "block";

      spawnAvatarFloatingText("🛡️ 平安靈符開光大吉！神聖法印護體！");
      if (window.liveTempleWall) {
        window.liveTempleWall.addDanmaku(`🛡️ 善信圓滿求取【${getAmuletName(selectedAmuletType)}】，神威護佑平安！`);
      }
      setDockStatus(`✨ 【${getAmuletName(selectedAmuletType)}】已過爐開光圓滿！神聖法印鈐蓋加持。`);
    }, 3100);
  });

  // 下載手機桌布靈符
  document.getElementById("btnDownloadAmuletPng").addEventListener("click", () => {
    const canvas = document.getElementById("amuletPreviewCanvas");
    if (!canvas) return;
    const link = document.createElement("a");
    const name = document.getElementById("txtAmuletPetitioner")?.value.trim() || "善信";
    link.download = `賽博神殿_開光護身靈符_${getAmuletName(selectedAmuletType)}_${name}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    window.templeAudio.playBell(660);
  });

  // 隨身佩戴護身靈光 (3D神光)
  document.getElementById("btnEquipAmuletAura").addEventListener("click", () => {
    if (temple3d && temple3d.avatar) {
      temple3d.avatar.equipAmulet(selectedAmuletType);
      window.templeAudio.playConsecrationChime();
      spawnAvatarFloatingText("✨ 護體神光已啟動！金光靈動圍繞分身");
      setDockStatus(`✨ 已隨身佩戴【${getAmuletName(selectedAmuletType)}】，3D 護身神光旋繞護佑！`);
    }
  });

  // 祈願繪馬木牌彈窗開關
  document.getElementById("btnOpenEma").addEventListener("click", () => {
    openEmaModal();
  });

  document.getElementById("emaModalClose").addEventListener("click", () => {
    document.getElementById("emaModal").classList.remove("open");
  });

  // 祈願繪馬分類選取
  let selectedEmaType = "exam";
  let selectedEmaIcon = "🎓";
  document.querySelectorAll("#emaCategoryPicker .btn-custom-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#emaCategoryPicker .btn-custom-pill").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedEmaType = btn.dataset.type;
      selectedEmaIcon = btn.dataset.icon;
    });
  });

  // 提交祈願木牌
  document.getElementById("btnSubmitEmaPlaque").addEventListener("click", () => {
    const name = document.getElementById("emaPetitionerName").value.trim() || state.avatarConfig.title || "善信";
    const wish = document.getElementById("emaWishMessage").value.trim() || "祈求諸事大吉、萬事順遂！";
    const plaqueData = {
      name,
      type: selectedEmaType,
      icon: selectedEmaIcon,
      wish,
      date: new Date().toLocaleDateString()
    };

    if (temple3d) {
      temple3d.hangNewEmaPlaque(plaqueData);
    }
    recordEmaToHistory(plaqueData);
    renderEmaPlaquesList();
    setDockStatus(`🪵 善信 ${name} 的祈願木牌已虔誠懸掛於廟埕木架！願力長存！`);
    document.getElementById("emaWishMessage").value = "";
    document.getElementById("emaModal").classList.remove("open");
  });

  // 善信修持錄 / 功德護照開關
  document.getElementById("btnOpenPassport").addEventListener("click", () => {
    openPassportModal();
  });

  // 每日修行
  document.getElementById("btnOpenDaily").addEventListener("click", () => window.dailyPractice?.open());
  document.getElementById("dailyModalClose").addEventListener("click", () => {
    document.getElementById("dailyModal").classList.remove("open");
  });

  // 即時香火牆
  document.getElementById("btnOpenLiveWall").addEventListener("click", () => {
    if (window.liveTempleWall) {
      window.liveTempleWall.renderStats();
      window.liveTempleWall.updateLiveFeedList();
    }
    document.getElementById("liveWallModal").classList.add("open");
  });
  document.getElementById("liveWallModalClose").addEventListener("click", () => {
    document.getElementById("liveWallModal").classList.remove("open");
  });

  document.getElementById("passportModalClose").addEventListener("click", () => {
    document.getElementById("passportModal").classList.remove("open");
  });

  document.getElementById("btnClosePassport").addEventListener("click", () => {
    document.getElementById("passportModal").classList.remove("open");
  });

  // 護照分頁切換
  document.querySelectorAll(".passport-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".passport-tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderPassportTab(btn.dataset.ptab);
    });
  });

  // 匯出修持功德狀
  document.getElementById("btnExportCertificate").addEventListener("click", () => {
    exportSpiritualCertificate();
  });

  // 自動敲木魚掛機
  const btnAuto = document.getElementById("btnAutoMuyuToggle");
  btnAuto.addEventListener("click", () => {
    if (state.autoMuyuTimer) {
      clearInterval(state.autoMuyuTimer);
      state.autoMuyuTimer = null;
      setAutoMuyuCardState(btnAuto, false);
      setDockStatus("已停止自動掛機敲木魚。");
    } else {
      state.autoMuyuTimer = setInterval(() => performMuyuStrike(), 850);
      setAutoMuyuCardState(btnAuto, true);
      setDockStatus("✨ 賽博摸魚掛機啟動中，功德持續滾動 +1...");
    }
  });

  // 鍵盤快捷鍵
  window.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if (e.code === "Space") {
      e.preventDefault();
      if (document.getElementById("bwaCompModal")?.classList.contains("open")) {
        throwBwaCompetition();
      } else if (typeof isRhythmGameRunning !== "undefined" && isRhythmGameRunning) {
        handleRhythmHit("muyu");
      } else {
        performMuyuStrike(true);
      }
    } else if (e.code === "KeyV") {
      window.openPhotoModal();
    } else if (e.code === "KeyR") {
      window.openRhythmModal();
    } else if (e.code === "KeyG") {
      if (typeof window.interactWithPet === "function") window.interactWithPet();
    } else if (e.code === "KeyL") {
      if (typeof window.openSkyLanternModal === "function") window.openSkyLanternModal();
    } else if (e.code === "KeyZ") {
      if (typeof window.openZenModal === "function") window.openZenModal();
    } else if (e.code === "KeyJ") {
      if (typeof isRhythmGameRunning !== "undefined" && isRhythmGameRunning) {
        handleRhythmHit("muyu");
      }
    } else if (e.code === "KeyK") {
      if (typeof isRhythmGameRunning !== "undefined" && isRhythmGameRunning) {
        handleRhythmHit("bell");
      }
    }
  });

  // 角色換裝彈窗
  document.getElementById("btnOpenAvatar").addEventListener("click", () => {
    document.getElementById("avatarModal").classList.add("open");
  });

  document.getElementById("avatarModalClose").addEventListener("click", () => {
    document.getElementById("avatarModal").classList.remove("open");
  });

  // 角色風格切換
  document.querySelectorAll("[data-role]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-role]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.avatarConfig.roleType = btn.dataset.role;
      state.avatarConfig.robeColor = btn.dataset.color;
      state.avatarConfig.hatType = btn.dataset.hat;
      document.getElementById("avatarColorPicker").value = btn.dataset.color;
    });
  });

  document.querySelectorAll("[data-hat-select]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-hat-select]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.avatarConfig.hatType = btn.dataset.hatSelect;
    });
  });

  document.querySelectorAll("[data-held]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-held]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.avatarConfig.holdingItem = btn.dataset.held;
    });
  });

  document.getElementById("btnRandomTitle").addEventListener("click", () => {
    const rTitle = RANDOM_TITLES[Math.floor(Math.random() * RANDOM_TITLES.length)];
    document.getElementById("avatarTitleInput").value = rTitle;
    state.avatarConfig.title = rTitle;
  });

  document.getElementById("btnSaveAvatar").addEventListener("click", () => {
    state.avatarConfig.robeColor = document.getElementById("avatarColorPicker").value;
    state.avatarConfig.title = document.getElementById("avatarTitleInput").value.trim() || "悠閒的信眾";

    localStorage.setItem("temple_avatar_cfg", JSON.stringify(state.avatarConfig));
    if (temple3d && temple3d.avatar) {
      temple3d.avatar.customize(state.avatarConfig);
    }
    document.getElementById("avatarModal").classList.remove("open");
    setDockStatus(`👤 角色已更新為【${state.avatarConfig.title}】，已身臨大殿！`);
    window.templeAudio.playBell(560);
  });

  // 點燈彈窗
  document.getElementById("btnGoLantern").addEventListener("click", () => {
    document.getElementById("lanternModal").classList.add("open");
  });

  document.getElementById("lanternModalClose").addEventListener("click", () => {
    document.getElementById("lanternModal").classList.remove("open");
  });

  document.getElementById("btnSubmitLantern").addEventListener("click", () => {
    submitLanternAction();
  });

  // 發送祈願彈幕
  const txtDanmaku = document.getElementById("txtDanmakuInput");
  const sendHandler = () => {
    const text = txtDanmaku.value.trim();
    if (!text) return;
    const author = state.avatarConfig.title || "雲端善信";
    if (window.liveTempleWall) {
      window.liveTempleWall.broadcastPrayer({ name: author, loc: "大殿", text });
    }
    txtDanmaku.value = "";
    window.templeAudio.playBell(580);
    setDockStatus("🚀 祈願彈幕已升空，神明洞察庇佑！");
  };

  document.getElementById("btnSendDanmaku").addEventListener("click", sendHandler);
  txtDanmaku.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendHandler();
    }
  });

  // 籤詩彈窗關閉
  document.getElementById("modalClose").addEventListener("click", () => {
    document.getElementById("chiamModal").classList.remove("open");
    window.templeAudio.stopSpeaking();
  });

  // 匯出結緣卡
  document.getElementById("btnExportCard").addEventListener("click", () => {
    if (state.selectedChiam) {
      exportFortuneCard(state.selectedChiam);
    }
  });

  // 聆聽神明聖諭開示 (語音 TTS)
  document.getElementById("btnSpeakOracle").addEventListener("click", () => {
    if (state.selectedChiam) {
      const oracleText = `${state.selectedChiam.fortune}。${state.selectedChiam.meaning}。${state.selectedChiam.advice}`;
      window.templeAudio.speakDivineMessage(oracleText);
      setDockStatus("🔊 神明法音慈悲開示中...");
    }
  });

  // AI 深度解籤請求
  document.getElementById("btnRequestAIDivine").addEventListener("click", () => {
    requestAIDivination();
  });

  // AI 設置彈窗
  document.getElementById("btnOpenSettings").addEventListener("click", () => {
    document.getElementById("txtGeminiKey").value = window.aiDivination.apiKey || "";
    document.getElementById("settingsModal").classList.add("open");
  });

  document.getElementById("settingsModalClose").addEventListener("click", () => {
    document.getElementById("settingsModal").classList.remove("open");
  });

  document.getElementById("btnSaveSettings").addEventListener("click", () => {
    const newKey = document.getElementById("txtGeminiKey").value.trim();
    window.aiDivination.setApiKey(newKey);
    updateAIEngineBadge();
    document.getElementById("settingsModal").classList.remove("open");
    setDockStatus("AI 設定儲存成功！");
  });

  document.getElementById("btnClearSettings").addEventListener("click", () => {
    window.aiDivination.setApiKey("");
    document.getElementById("txtGeminiKey").value = "";
    updateAIEngineBadge();
    document.getElementById("settingsModal").classList.remove("open");
    setDockStatus("已切換為本地高階心靈演繹引擎。");
  });

  // 禪音與靜音開關
  document.getElementById("btnToggleBGM").addEventListener("click", (e) => {
    const isPlaying = window.templeAudio.toggleAmbientBGM();
    e.currentTarget.innerText = isPlaying ? "🎵 禪音開" : "🎵 禪音";
    e.currentTarget.classList.toggle("active", isPlaying);
  });

  document.getElementById("btnToggleMute").addEventListener("click", (e) => {
    window.templeAudio.isMuted = !window.templeAudio.isMuted;
    e.currentTarget.innerText = window.templeAudio.isMuted ? "🔇 靜音" : "🔊 音效";
    e.currentTarget.classList.toggle("muted", window.templeAudio.isMuted);
  });

  // 新版 UI 外殼：下拉選單、萬寶閣、沉浸模式、操作秘笈
  bindModernUIShell();
}

// 掛機積德卡片狀態 (卡片內含圖示/標題/徽章，不可直接覆寫 innerText)
function setAutoMuyuCardState(el, isOn) {
  if (!el) return;
  el.classList.toggle("active", isOn);
  const title = el.querySelector(".card-title");
  const badge = el.querySelector(".card-badge");
  if (title) title.textContent = isOn ? "掛機積德木魚 • 運行中" : "掛機積德木魚";
  if (badge) badge.textContent = isOn ? "🟢 已開啟" : "自動積德";
  if (!title && !badge) el.innerText = isOn ? "✨ 掛機積德：開" : "✨ 掛機積德：關";
}

// ==========================================
// 新版 UI 外殼 (v10.1.0)：收納式介面整合
// ==========================================
function bindModernUIShell() {
  const $ = (id) => document.getElementById(id);
  const closeAllDropdowns = (except) => {
    ["deityDropdownMenu", "cameraNavDropdown"].forEach(id => {
      if (id !== except) $(id)?.classList.remove("open");
    });
  };

  // --- 神尊下拉選單 ---
  const deityBtn = $("deityDropdownBtn");
  const deityMenu = $("deityDropdownMenu");
  if (deityBtn && deityMenu) {
    deityBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllDropdowns("deityDropdownMenu");
      deityMenu.classList.toggle("open");
    });
    deityMenu.querySelectorAll(".btn-deity-pill").forEach(btn => {
      btn.addEventListener("click", () => {
        const label = $("currentDeityLabel");
        if (label) label.textContent = btn.textContent.replace(/\s+/g, " ").trim();
        deityMenu.classList.remove("open");
      });
    });
  }

  // --- 鏡頭視角導覽艙 ---
  const camBtn = $("cameraNavBtn");
  const camMenu = $("cameraNavDropdown");
  const syncCameraLabel = () => {
    const active = document.querySelector(".btn-cam-view.active");
    const label = $("currentCameraLabel");
    if (active && label) label.textContent = active.textContent.replace(/\s*\([A-Z]\)\s*$/, "").trim();
  };
  if (camBtn && camMenu) {
    camBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllDropdowns("cameraNavDropdown");
      camMenu.classList.toggle("open");
    });
    camMenu.querySelectorAll(".btn-cam-view").forEach(btn => {
      btn.addEventListener("click", () => {
        setTimeout(syncCameraLabel, 0);
        camMenu.classList.remove("open");
      });
    });
    // temple3d 內部 (如按 C 鍵) 也會切換 active，監聽 class 變化以同步標籤
    const observer = new MutationObserver(syncCameraLabel);
    camMenu.querySelectorAll(".btn-cam-view").forEach(b => observer.observe(b, { attributes: true, attributeFilter: ["class"] }));
  }

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".deity-dropdown-container") && !e.target.closest(".camera-nav-container")) {
      closeAllDropdowns();
    }
  });

  // --- 宮廟萬寶閣 ---
  const pavilion = $("pavilionModal");
  const openPavilion = () => pavilion?.classList.add("open");
  const closePavilion = () => pavilion?.classList.remove("open");
  window.togglePavilion = () => pavilion?.classList.toggle("open");
  $("btnOpenPavilion")?.addEventListener("click", openPavilion);
  $("pavilionModalClose")?.addEventListener("click", closePavilion);
  pavilion?.addEventListener("click", (e) => { if (e.target === pavilion) closePavilion(); });

  document.querySelectorAll(".pavilion-cat-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".pavilion-cat-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const cat = tab.dataset.cat;
      document.querySelectorAll(".pavilion-card").forEach(card => {
        card.style.display = (cat === "all" || card.dataset.cat === cat) ? "" : "none";
      });
    });
  });

  document.querySelectorAll(".pavilion-card").forEach(card => {
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.addEventListener("click", () => {
      // 代理卡片：轉發點擊到頂部列原本按鈕
      if (card.dataset.proxy) $(card.dataset.proxy)?.click();
      // 掛機開關為就地切換，不關閉萬寶閣；其他功能關閉萬寶閣讓出畫面
      if (card.id !== "btnAutoMuyuToggle") closePavilion();
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); card.click(); }
    });
  });

  // --- 祈願彈幕摺疊列 ---
  const danmakuRow = $("dockDanmakuRow");
  $("btnToggleDanmaku")?.addEventListener("click", (e) => {
    const open = danmakuRow?.classList.toggle("open");
    e.currentTarget.classList.toggle("active", !!open);
    if (open) setTimeout(() => $("txtDanmakuInput")?.focus(), 50);
  });

  // --- 沉浸模式 (隱藏所有 HUD) ---
  window.toggleHUD = () => {
    const hidden = document.body.classList.toggle("hud-hidden");
    if (hidden) setDockStatus("👁️ 已進入沉浸模式，按 H 恢復介面。");
  };
  $("btnToggleHUD")?.addEventListener("click", window.toggleHUD);
  $("btnExitHUD")?.addEventListener("click", window.toggleHUD);

  // --- 操作秘笈 ---
  const help = $("helpModal");
  window.toggleHelp = () => help?.classList.toggle("open");
  $("btnOpenHelp")?.addEventListener("click", () => help?.classList.add("open"));
  $("helpModalClose")?.addEventListener("click", () => help?.classList.remove("open"));
  $("btnHelpConfirm")?.addEventListener("click", () => {
    help?.classList.remove("open");
    localStorage.setItem("temple_ui_help_seen", "1");
  });
  if (!localStorage.getItem("temple_ui_help_seen")) {
    setTimeout(() => help?.classList.add("open"), 1800);
  }

  // --- 全域快捷鍵：H / Tab / ? / Esc ---
  window.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
    if (e.code === "KeyH") {
      window.toggleHUD();
    } else if (e.code === "Tab") {
      e.preventDefault();
      window.togglePavilion();
    } else if (e.key === "?") {
      window.toggleHelp();
    } else if (e.key === "Escape") {
      closeAllDropdowns();
      document.querySelectorAll(".modal-overlay.open").forEach(m => m.classList.remove("open"));
      if (document.body.classList.contains("hud-hidden")) document.body.classList.remove("hud-hidden");
    }
  });

  syncCameraLabel();
}

// 執行 3D 擲筊
function performBwaToss() {
  if (!temple3d || temple3d.isBwaTossing) return;
  setDockStatus("🌓 筊杯凌空旋轉拋擲中... 靜候神明聖諭...");

  temple3d.tossBwa(({ outcome1, outcome2 }) => {
    window.templeAudio.playBwaBweiSound();
    window.emitRitual?.("bwa");

    if (outcome1 !== outcome2) {
      state.consecutiveHolyBwa++;
      window.emitRitual?.("holyBwa");
      const curHigh = parseInt(localStorage.getItem("temple_highest_bwa") || "0", 10);
      if (state.consecutiveHolyBwa > curHigh) {
        localStorage.setItem("temple_highest_bwa", state.consecutiveHolyBwa);
      }
      const text = `【 聖筊 • 允筊 】連續 ${state.consecutiveHolyBwa} 聖筊！神明應允，所求大吉！`;
      setDockStatus(text);
      window.templeAudio.playBell(580);
      temple3d.spawn3DFloatingText("聖筊大吉！", new THREE.Vector3(0, 1.2, 1.8));

      if (state.consecutiveHolyBwa === 3) {
        setDockStatus("🔥 賀！連續獲得三個聖筊！神明大顯神通，萬事皆成！聖駕起駕出巡遶境！");
        window.templeAudio.playBell(660);
        if (temple3d) temple3d.startParade();
        if (window.liveTempleWall) window.liveTempleWall.announceHolyBwa(state.avatarConfig.title);
      }
    } else if (outcome1 === 0 && outcome2 === 0) {
      state.consecutiveHolyBwa = 0;
      setDockStatus("【 笑筊 】神明笑而不言。情況未明或所求不夠具體，請平心靜氣再稟。");
      window.templeAudio.playBell(440);
      temple3d.spawn3DFloatingText("笑筊", new THREE.Vector3(0, 1.2, 1.8));
    } else {
      state.consecutiveHolyBwa = 0;
      setDockStatus("【 陰筊 • 蓋杯 】神明示警不允，或時機未至，宜守成安分。");
      window.templeAudio.playBell(330);
      temple3d.spawn3DFloatingText("陰筊蓋杯", new THREE.Vector3(0, 1.2, 1.8));
    }
  });
}

// 執行 3D 搖籤筒
function performChiamShake() {
  if (!temple3d || temple3d.isChiamShaking) return;
  setDockStatus("🎋 籤筒晃動中... 諸神感應賜籤...");
  window.templeAudio.playShakeChiam();

  setTimeout(() => window.templeAudio.playShakeChiam(), 400);

  temple3d.shakeChiamBucket(() => {
    window.templeAudio.playBell(620);
    const randomIndex = Math.floor(Math.random() * window.CHIAM_DATA.length);
    const chosen = window.CHIAM_DATA[randomIndex];
    state.selectedChiam = chosen;
    recordChiamToHistory(chosen);
    window.emitRitual?.("chiam");

    setDockStatus(`🎋 抽得第 ${chosen.id} 籤【${chosen.ganZhi}】${chosen.fortune}！正在展開靈籤捲軸...`);
    temple3d.spawn3DFloatingText(`第${chosen.id}籤 • ${chosen.ganZhi}`, new THREE.Vector3(1.4, 2.2, -0.3));

    setTimeout(() => {
      openChiamModal(chosen);
    }, 700);
  });
}

// 執行 3D 敲木魚（manual：親手敲擊才算每日功課，掛機不算）
function performMuyuStrike(manual = false) {
  if (temple3d) {
    temple3d.strikeMuyu();
  }
  window.templeAudio.playWoodblock({ x: -1.4, y: 1.35, z: -0.3 });

  state.meritCount++;
  localStorage.setItem("temple_merit", state.meritCount);
  updateMeritDisplay();
  if (manual) window.emitRitual?.("muyu");
}

function addMerit(points) {
  state.meritCount = Math.max(0, state.meritCount + points);
  localStorage.setItem("temple_merit", state.meritCount);
  updateMeritDisplay();
  const shopMeritEl = document.getElementById("relicShopMeritCount");
  if (shopMeritEl) shopMeritEl.innerText = state.meritCount.toLocaleString();
}
window.addMerit = addMerit;

function updateMeritDisplay() {
  const el = document.getElementById("meritCounter");
  if (el) el.innerText = state.meritCount.toLocaleString();
}

function setDockStatus(text) {
  const el = document.getElementById("dockStatusBar");
  if (el) el.innerText = text;
}

function updateAIEngineBadge() {
  const badge = document.getElementById("aiEngineBadge");
  if (!badge) return;
  if (window.aiDivination.hasApiKey()) {
    badge.innerText = "✨ Gemini 直連已就緒";
    badge.style.color = "#2e7d32";
  } else {
    badge.innerText = "✨ 神明推演引擎就緒 (免Key)";
    badge.style.color = "#7c1a1a";
  }
}

// 點燈提交
function submitLanternAction() {
  const name = document.getElementById("lanternName")?.value.trim() || state.avatarConfig.title;
  const wish = document.getElementById("lanternWish")?.value.trim() || "平安順遂";
  window.emitRitual?.("lantern");

  if (window.liveTempleWall) {
    window.liveTempleWall.recordLantern(name);
    window.liveTempleWall.broadcastPrayer({
      name,
      loc: "大殿點燈閣",
      text: `點亮長明燈祈願：${wish}`
    });
  }

  // 記錄至善信護照光明燈名冊
  let lHist = [];
  try {
    lHist = JSON.parse(localStorage.getItem("temple_lantern_history") || "[]");
  } catch (e) {}
  lHist.unshift({ date: new Date().toLocaleDateString(), name, wish });
  localStorage.setItem("temple_lantern_history", JSON.stringify(lHist.slice(0, 30)));
  // 名冊只留 30 筆，累計點燈數另外記
  const litTotal = parseInt(localStorage.getItem("temple_lanterns_lit") || String(lHist.length - 1), 10) + 1;
  localStorage.setItem("temple_lanterns_lit", litTotal);

  window.templeAudio.playBell(560);
  if (temple3d) {
    temple3d.igniteLanternOnPagoda(name);
    temple3d.spawn3DFloatingText(`🏮 ${name} 點燈祈福成功！`, new THREE.Vector3(0, 2.5, 0));
  }
  document.getElementById("lanternModal").classList.remove("open");
  setDockStatus(`🏮 善信 ${name} 成功點亮光明長明燈！福德圓滿！`);
}

// 打開籤詩彈窗
function openChiamModal(chiam) {
  document.getElementById("scrollTitle").innerText = `六十甲子媽祖靈籤 • 第 ${chiam.id} 籤`;
  document.getElementById("scrollFortune").innerText = `${chiam.ganZhi} • ${chiam.fortune}`;
  document.getElementById("scrollGuaTou").innerText = `典故：${chiam.guaTou}`;

  const poemBox = document.getElementById("scrollPoemBox");
  poemBox.innerHTML = "";
  [...chiam.poem].reverse().forEach(line => {
    const span = document.createElement("div");
    span.className = "poem-line";
    span.innerText = line;
    poemBox.appendChild(span);
  });

  document.getElementById("scrollMeaning").innerText = chiam.meaning;

  const detailsEl = document.getElementById("scrollDetails");
  detailsEl.innerHTML = `
    <div><strong>【功名/事業】</strong>：${chiam.details.career}</div>
    <div><strong>【感情/婚姻】</strong>：${chiam.details.romance}</div>
    <div><strong>【考運/學業】</strong>：${chiam.details.exam}</div>
    <div><strong>【財富/求財】</strong>：${chiam.details.wealth}</div>
    <div style="grid-column: span 2;"><strong>【健康/身心】</strong>：${chiam.details.health}</div>
  `;

  document.getElementById("scrollAdvice").innerText = chiam.advice;
  document.getElementById("aiResultCard").style.display = "none";
  document.getElementById("aiLoading").style.display = "none";
  document.getElementById("chiamModal").classList.add("open");
}

// AI 深度解籤
async function requestAIDivination() {
  if (!state.selectedChiam) return;
  const chiam = state.selectedChiam;
  const deity = DEITIES[state.currentDeity];
  const userQuestion = document.getElementById("aiQuestionInput").value.trim() || "祈求安泰前程";

  const loadingEl = document.getElementById("aiLoading");
  const resultCard = document.getElementById("aiResultCard");

  loadingEl.style.display = "flex";
  resultCard.style.display = "none";
  window.templeAudio.playBell(520);

  try {
    const res = await window.aiDivination.divine({
      deity,
      chiam,
      userQuestion,
      userName: state.avatarConfig.title || "善信",
      userAddress: "台灣"
    });

    loadingEl.style.display = "none";
    resultCard.innerText = res.text;
    resultCard.style.display = "block";
    window.templeAudio.playBell(620);

    // 同步更新歷史紀錄之 AI 解籤開示
    updateChiamHistoryAI(chiam.id, userQuestion, res.text);
  } catch (err) {
    loadingEl.style.display = "none";
    resultCard.innerText = `解籤遇阻：${err.message}`;
    resultCard.style.display = "block";
  }
}

// 匯出平安結緣卡 (PNG)
function exportFortuneCard(chiam) {
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 900;
  const ctx = canvas.getContext("2d");

  const bgGrad = ctx.createLinearGradient(0, 0, 0, 900);
  bgGrad.addColorStop(0, "#f9f1de");
  bgGrad.addColorStop(0.5, "#eedab0");
  bgGrad.addColorStop(1, "#dfc48e");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 600, 900);

  ctx.strokeStyle = "#8b1c1c";
  ctx.lineWidth = 10;
  ctx.strokeRect(20, 20, 560, 860);
  ctx.strokeStyle = "#c89528";
  ctx.lineWidth = 2;
  ctx.strokeRect(30, 30, 540, 840);

  ctx.fillStyle = "#8b1c1c";
  ctx.font = "bold 32px 'Songti TC', serif";
  ctx.textAlign = "center";
  ctx.fillText("雲端虛擬神殿 3D • 靈籤結緣卡", 300, 85);

  ctx.fillStyle = "#331206";
  ctx.font = "bold 24px 'Songti TC', serif";
  ctx.fillText(`第 ${chiam.id} 籤 【${chiam.ganZhi}】 ${chiam.fortune}`, 300, 130);

  ctx.font = "18px 'Songti TC', serif";
  ctx.fillStyle = "#632d16";
  ctx.fillText(`典故：${chiam.guaTou}`, 300, 165);

  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.fillRect(70, 200, 460, 230);
  ctx.strokeStyle = "#b58742";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(70, 200, 460, 230);

  ctx.fillStyle = "#4a1204";
  ctx.font = "bold 28px 'Songti TC', serif";
  const startX = 450;
  const colSpacing = 90;
  chiam.poem.forEach((line, idx) => {
    const x = startX - idx * colSpacing;
    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      ctx.fillText(line[charIdx], x, 245 + charIdx * 25);
    }
  });

  ctx.fillStyle = "#33180c";
  ctx.font = "18px 'Songti TC', serif";
  ctx.textAlign = "left";

  const wrapText = (text, x, y, maxWidth, lineHeight) => {
    let line = "";
    for (let i = 0; i < text.length; i++) {
      const testLine = line + text[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line, x, y);
        line = text[i];
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
    return y + lineHeight;
  };

  ctx.fillText("【白話解析】", 70, 475);
  ctx.font = "16px 'Songti TC', serif";
  let curY = wrapText(chiam.meaning, 70, 505, 460, 24);

  curY += 10;
  ctx.font = "bold 17px 'Songti TC', serif";
  ctx.fillStyle = "#8b1c1c";
  wrapText(chiam.advice, 70, curY, 460, 24);

  ctx.save();
  ctx.strokeStyle = "#ba1f1f";
  ctx.lineWidth = 4;
  ctx.strokeRect(235, 740, 130, 90);
  ctx.fillStyle = "#ba1f1f";
  ctx.font = "bold 22px 'Songti TC', serif";
  ctx.textAlign = "center";
  ctx.fillText("神佛護佑", 300, 780);
  ctx.fillText("萬事順遂", 300, 812);
  ctx.restore();

  const link = document.createElement("a");
  link.download = `3D虛擬神殿_第${chiam.id}籤_${chiam.ganZhi}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// ==========================================
// 祈願木牌閣 (Ema Wall) 邏輯
// ==========================================

function openEmaModal() {
  document.getElementById("emaPetitionerName").value = state.avatarConfig.title || "善信";
  renderEmaPlaquesList();
  document.getElementById("emaModal").classList.add("open");
}

function renderEmaPlaquesList() {
  const container = document.getElementById("emaPlaquesList");
  if (!container) return;
  container.innerHTML = "";

  const defaultPlaques = [
    { name: "考生小明", type: "exam", icon: "🎓", wish: "文昌帝君保佑考研順利上岸！", date: "近期" },
    { name: "科技碼農", type: "tech", icon: "🟢", wish: "乖乖神保佑專案零Bug、伺服器常綠！", date: "近期" },
    { name: "虔誠信女", type: "romance", icon: "❤️", wish: "月老爺爺賜良緣，覓得相知相守之人。", date: "近期" },
    { name: "創業阿榮", type: "wealth", icon: "💰", wish: "武財神賜福正偏財亨通，生意興隆！", date: "近期" }
  ];

  let stored = [];
  try {
    stored = JSON.parse(localStorage.getItem("temple_ema_plaques") || "[]");
  } catch (e) {}

  const all = [...stored, ...defaultPlaques];

  all.forEach(p => {
    const card = document.createElement("div");
    card.className = "ema-card-item";
    card.innerHTML = `
      <div class="ema-header">
        <span>${p.icon || "🏮"} ${p.name}</span>
        <span style="font-size: 0.72rem; color: #eedab0;">${p.date || "吉日"}</span>
      </div>
      <div class="ema-wish">${p.wish}</div>
    `;
    container.appendChild(card);
  });
}

function recordEmaToHistory(data) {
  let stored = [];
  try {
    stored = JSON.parse(localStorage.getItem("temple_ema_plaques") || "[]");
  } catch (e) {}
  stored.unshift(data);
  localStorage.setItem("temple_ema_plaques", JSON.stringify(stored.slice(0, 30)));
}

// ==========================================
// 善信功德修持護照 (Merit Passport) 邏輯
// ==========================================

function recordChiamToHistory(chiam, question = "祈求安泰前程", aiText = "") {
  let hist = [];
  try {
    hist = JSON.parse(localStorage.getItem("temple_chiam_history") || "[]");
  } catch (e) {}

  hist.unshift({
    date: new Date().toLocaleDateString(),
    id: chiam.id,
    ganZhi: chiam.ganZhi,
    fortune: chiam.fortune,
    guaTou: chiam.guaTou,
    question,
    aiText,
    meaning: chiam.meaning,
    advice: chiam.advice
  });

  localStorage.setItem("temple_chiam_history", JSON.stringify(hist.slice(0, 40)));
}

function updateChiamHistoryAI(chiamId, userQuestion, aiText) {
  let hist = [];
  try {
    hist = JSON.parse(localStorage.getItem("temple_chiam_history") || "[]");
  } catch (e) {}
  const target = hist.find(h => h.id === chiamId);
  if (target) {
    target.question = userQuestion;
    target.aiText = aiText;
    localStorage.setItem("temple_chiam_history", JSON.stringify(hist));
  }
}

function openPassportModal() {
  const merit = state.meritCount;
  document.getElementById("statMeritTotal").innerText = merit.toLocaleString();
  document.getElementById("passportAvatarTitle").innerText = state.avatarConfig.title || "悠閒的信眾";

  // 念珠輪數
  const beadLoops = parseInt(localStorage.getItem("temple_beads_loops") || "0", 10);
  document.getElementById("statBeadLoops").innerText = beadLoops;

  // 最高連得聖筊
  const highestBwa = parseInt(localStorage.getItem("temple_highest_bwa") || "0", 10);
  document.getElementById("statHolyStreak").innerText = Math.max(highestBwa, state.consecutiveHolyBwa);

  // 點燈數
  let lanternHistLen = 0;
  try { lanternHistLen = JSON.parse(localStorage.getItem("temple_lantern_history") || "[]").length; } catch (e) {}
  const lanterns = Math.max(parseInt(localStorage.getItem("temple_lanterns_lit") || "0", 10), lanternHistLen);
  document.getElementById("statLanternsCount").innerText = lanterns;

  // 許願投幣數
  const coins = parseInt(localStorage.getItem("temple_wishing_coins") || "0", 10);
  document.getElementById("statCoinsCount").innerText = coins;

  // 焚燒金紙數
  const paper = parseInt(localStorage.getItem("temple_burned_paper") || "0", 10);
  document.getElementById("statPaperCount").innerText = paper;

  // 計算修行境界
  let rankIcon = "🌱";
  let rankTitle = "初入法門";
  let rankDesc = "萬丈高樓平地起，勤敲木魚以積累福德。";
  let progress = 10;

  if (merit >= 3000) {
    rankIcon = "👑";
    rankTitle = "賽博大德尊者";
    rankDesc = "功德無量，萬法通達，心明如鏡，受諸神聖加持護佑！";
    progress = 100;
  } else if (merit >= 1000) {
    rankIcon = "✨";
    rankTitle = "萬法圓通居士";
    rankDesc = "功德圓滿，常結善緣，神威顯赫，心想事成！";
    progress = Math.min(100, Math.round(((merit - 1000) / 2000) * 100));
  } else if (merit >= 500) {
    rankIcon = "🛡️";
    rankTitle = "金剛護法弟子";
    rankDesc = "道心堅定，邪魔不侵，諸神隨身庇佑百病不侵。";
    progress = Math.min(100, Math.round(((merit - 500) / 500) * 100));
  } else if (merit >= 200) {
    rankIcon = "🪷";
    rankTitle = "慈悲行者";
    rankDesc = "福田初成，善念萌發，氣息沉凝，所求漸次順遂。";
    progress = Math.min(100, Math.round(((merit - 200) / 300) * 100));
  } else if (merit >= 50) {
    rankIcon = "🌿";
    rankTitle = "虔誠信士";
    rankDesc = "心誠則靈，三炷清香達上天，神威初顯。";
    progress = Math.min(100, Math.round(((merit - 50) / 150) * 100));
  } else {
    progress = Math.min(100, Math.round((merit / 50) * 100));
  }

  document.getElementById("passportRankIcon").innerText = rankIcon;
  document.getElementById("passportRankTitle").innerText = rankTitle;
  document.getElementById("passportRankDesc").innerText = rankDesc;
  document.getElementById("passportRankProgress").style.width = `${progress}%`;

  renderPassportTab("chiam");
  document.getElementById("passportModal").classList.add("open");
}

function renderPassportTab(tabName) {
  const container = document.getElementById("passportTabContent");
  if (!container) return;
  container.innerHTML = "";

  if (tabName === "chiam") {
    let hist = [];
    try {
      hist = JSON.parse(localStorage.getItem("temple_chiam_history") || "[]");
    } catch (e) {}

    document.getElementById("countChiamHist").innerText = hist.length;

    if (hist.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: #a89173; padding: 20px;">尚無求籤紀錄。移步籤筒搖動賜籤即可載入！</div>`;
      return;
    }

    hist.forEach(h => {
      const item = document.createElement("div");
      item.className = "passport-chiam-item";
      item.innerHTML = `
        <div class="chiam-info">
          <div class="chiam-num">第 ${h.id} 籤 【${h.ganZhi}】 ${h.fortune}</div>
          <div class="chiam-sub">典故：${h.guaTou} • 占問：${h.question || "前程祈願"}（${h.date}）</div>
          ${h.aiText ? `<div style="font-size: 0.78rem; color: #ffe6ba; margin-top: 4px; line-height: 1.3;">🤖 AI 開示：${h.aiText.slice(0, 60)}...</div>` : ""}
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="btn-dock-action" style="padding: 4px 10px; font-size: 0.78rem;" data-chiam-id="${h.id}">📜 重閱</button>
        </div>
      `;

      item.querySelector("button").addEventListener("click", () => {
        const full = window.CHIAM_DATA.find(c => c.id === h.id);
        if (full) {
          document.getElementById("passportModal").classList.remove("open");
          openChiamModal(full);
        }
      });
      container.appendChild(item);
    });
  } else if (tabName === "lantern") {
    let lHist = [];
    try {
      lHist = JSON.parse(localStorage.getItem("temple_lantern_history") || "[]");
    } catch (e) {}

    document.getElementById("countLanternHist").innerText = lHist.length;

    if (lHist.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: #a89173; padding: 20px;">尚無光明燈登載。點亮殿前神燈即可登記！</div>`;
      return;
    }

    lHist.forEach(l => {
      const item = document.createElement("div");
      item.className = "passport-chiam-item";
      item.innerHTML = `
        <div class="chiam-info">
          <div class="chiam-num">🏮 長明祈福燈 • ${l.name}</div>
          <div class="chiam-sub">心願：${l.wish} • 登載日期：${l.date}</div>
        </div>
      `;
      container.appendChild(item);
    });
  } else if (tabName === "ema") {
    let eHist = [];
    try {
      eHist = JSON.parse(localStorage.getItem("temple_ema_plaques") || "[]");
    } catch (e) {}

    document.getElementById("countEmaHist").innerText = eHist.length;

    if (eHist.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: #a89173; padding: 20px;">尚無親題木牌。前往廟埕祈願木牌閣掛牌即可登載！</div>`;
      return;
    }

    eHist.forEach(e => {
      const item = document.createElement("div");
      item.className = "passport-chiam-item";
      item.innerHTML = `
        <div class="chiam-info">
          <div class="chiam-num">${e.icon || "🏮"} ${e.name} 的祈願木牌</div>
          <div class="chiam-sub">祝願：${e.wish} • 懸掛日期：${e.date}</div>
        </div>
      `;
      container.appendChild(item);
    });
  }
}

// 匯出修持功德榮譽狀 (PNG)
function exportSpiritualCertificate() {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 620;
  const ctx = canvas.getContext("2d");

  // 底色：仿古羊皮宣紙漸層
  const bg = ctx.createLinearGradient(0, 0, 900, 620);
  bg.addColorStop(0, "#f8f0dd");
  bg.addColorStop(0.5, "#eedab0");
  bg.addColorStop(1, "#dec28e");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 900, 620);

  // 雙層宮殿朱紅框
  ctx.strokeStyle = "#8b1c1c";
  ctx.lineWidth = 14;
  ctx.strokeRect(20, 20, 860, 580);

  ctx.strokeStyle = "#c89528";
  ctx.lineWidth = 3;
  ctx.strokeRect(34, 34, 832, 552);

  // 四角吉祥裝飾
  const drawCorner = (x, y, dx, dy) => {
    ctx.strokeStyle = "#8b1c1c";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y + dy * 24);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * 24, y);
    ctx.stroke();
  };
  drawCorner(42, 42, 1, 1);
  drawCorner(858, 42, -1, 1);
  drawCorner(42, 578, 1, -1);
  drawCorner(858, 578, -1, -1);

  // 頂部大標題
  ctx.fillStyle = "#8b1c1c";
  ctx.font = "bold 34px 'Songti TC', serif";
  ctx.textAlign = "center";
  ctx.fillText("賽 博 虛 擬 神 殿 • 功 德 修 持 榮 譽 狀", 450, 95);

  ctx.fillStyle = "#692c17";
  ctx.font = "18px 'Songti TC', serif";
  ctx.fillText("護國庇民 • 萬法通達 • 積德延壽 • 諸佛加持", 450, 135);

  // 證書主文
  ctx.fillStyle = "#33180c";
  ctx.font = "22px 'Songti TC', serif";
  ctx.textAlign = "left";

  const name = state.avatarConfig.title || "悠閒的善信";
  const rank = document.getElementById("passportRankTitle")?.innerText || "虔誠信士";
  const merit = state.meritCount.toLocaleString();

  ctx.fillText(`茲有善信 【 ${name} 】：`, 90, 200);

  ctx.font = "19px 'Songti TC', serif";
  ctx.fillStyle = "#451c0f";
  const lines = [
    `秉持赤誠之心，踏入賽博神殿大殿共修，勤勉於神前清心禮敬。`,
    `自入殿修持以來，已累計積攢無量功德達 【 ${merit} 】 點，`,
    `心性純良，道業精進，經神聖印可，證得修持法相：【 ${rank} 】。`,
    `特頒此榮譽狀以昭善德。願諸天仙真永垂冥佑，所求遂意，闔家吉祥！`
  ];

  lines.forEach((l, idx) => {
    ctx.fillText(l, 90, 245 + idx * 36);
  });

  // 神印
  ctx.save();
  ctx.strokeStyle = "#ba1f1f";
  ctx.lineWidth = 5;
  ctx.strokeRect(680, 410, 130, 130);
  ctx.fillStyle = "#ba1f1f";
  ctx.font = "bold 26px 'Songti TC', serif";
  ctx.textAlign = "center";
  ctx.fillText("天上聖母", 745, 465);
  ctx.fillText("通真神寶", 745, 510);
  ctx.restore();

  // 頒發日期
  ctx.fillStyle = "#692c17";
  ctx.font = "16px 'Songti TC', serif";
  ctx.textAlign = "left";
  ctx.fillText(`大殿印行：歲次丙午年吉日（${new Date().toLocaleDateString()}）`, 90, 540);

  const link = document.createElement("a");
  link.download = `3D虛擬神殿_功德修持榮譽狀_${name}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// ==========================================
// 偏殿室內探索與專屬祈福儀式邏輯 (Side Halls)
// ==========================================

function spawnAvatarFloatingText(text) {
  if (!temple3d) return;
  const pos = temple3d.avatar ? temple3d.avatar.position.clone().add(new THREE.Vector3(0, 1.6, 0)) : new THREE.Vector3(0, 2, 0);
  temple3d.spawn3DFloatingText(text, pos);
}

window.openSideHallModal = function(hallKey = 'wenchang') {
  const modal = document.getElementById("sideHallModal");
  if (!modal) return;
  switchSideHallTab(hallKey);
  modal.classList.add("open");
  window.templeAudio.playBell(660);
};

function switchSideHallTab(hallKey) {
  document.querySelectorAll(".side-hall-tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.hall === hallKey);
  });
  const pWenchang = document.getElementById("hallPanelWenchang");
  const pYuelao = document.getElementById("hallPanelYuelao");
  const pCaishen = document.getElementById("hallPanelCaishen");
  if (pWenchang) pWenchang.style.display = hallKey === "wenchang" ? "flex" : "none";
  if (pYuelao) pYuelao.style.display = hallKey === "yuelao" ? "flex" : "none";
  if (pCaishen) pCaishen.style.display = hallKey === "caishen" ? "flex" : "none";
}

// ==========================================
// 功德福閣 • 數位開光靈符求取系統 (Amulet System)
// ==========================================

let selectedAmuletType = "mazu";

window.openAmuletModal = function() {
  const modal = document.getElementById("amuletModal");
  if (!modal) return;
  const petitioner = document.getElementById("txtAmuletPetitioner");
  if (petitioner && !petitioner.value) {
    petitioner.value = state.avatarConfig.title || "善信";
  }
  modal.classList.add("open");
  window.templeAudio.playBell(528);
};

function getDefaultAmuletWish(key) {
  const map = {
    mazu: "行車平順，逢凶化吉，闔家安泰",
    wenchang: "文思泉湧，考運亨通，金榜及第",
    caishen: "日進斗金，生意興隆，財庫豐盈",
    yuelao: "千里良緣，情投意合，早結連理",
    guaiguai: "伺服器綠燈常亮，零當機無Bug",
    taisui: "吉星拱照，化解災煞，百邪不侵"
  };
  return map[key] || "祈求善信萬事如意、福祿雙全";
}

function getAmuletName(key) {
  const map = {
    mazu: "天上聖母平安護身符",
    wenchang: "文昌帝君狀元及第符",
    caishen: "五路財神進寶發財符",
    yuelao: "月下老人天賜真愛符",
    guaiguai: "科技綠色乖乖守護符",
    taisui: "值年太歲化煞安康符"
  };
  return map[key] || "護身開光靈符";
}

function drawAmuletCanvas(amuletKey) {
  const canvas = document.getElementById("amuletPreviewCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = 720;
  const H = 1280;
  canvas.width = W;
  canvas.height = H;

  const petitioner = document.getElementById("txtAmuletPetitioner")?.value.trim() || state.avatarConfig.title || "善信";
  const wish = document.getElementById("txtAmuletWish")?.value.trim() || getDefaultAmuletWish(amuletKey);

  // 1. 符紙主底色 (不同神明專屬氣場)
  const bgConfigs = {
    mazu: { c1: "#5c1818", c2: "#220808", border: "#f5c542", seal: "天上聖母", sealSub: "神威普照" },
    wenchang: { c1: "#3b1a59", c2: "#19082b", border: "#f5c542", seal: "文昌魁星", sealSub: "金榜及第" },
    caishen: { c1: "#61400e", c2: "#2b1a03", border: "#ffe066", seal: "五路財神", sealSub: "八方進寶" },
    yuelao: { c1: "#63172e", c2: "#2b0713", border: "#ff99bb", seal: "月下老人", sealSub: "天賜良緣" },
    guaiguai: { c1: "#0f4222", c2: "#041a0c", border: "#44ee77", seal: "科技乖乖", sealSub: "綠燈永駐" },
    taisui: { c1: "#471010", c2: "#1a0404", border: "#ffd700", seal: "太歲星君", sealSub: "辟邪化煞" }
  };
  const cfg = bgConfigs[amuletKey] || bgConfigs.mazu;

  const grad = ctx.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, 680);
  grad.addColorStop(0, cfg.c1);
  grad.addColorStop(1, cfg.c2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 符紙內襯微光
  ctx.fillStyle = "rgba(255, 235, 170, 0.06)";
  ctx.fillRect(40, 40, W - 80, H - 80);

  // 2. 雙重神聖金框與回紋四角
  ctx.strokeStyle = cfg.border;
  ctx.lineWidth = 14;
  ctx.strokeRect(36, 36, W - 72, H - 72);

  ctx.lineWidth = 3;
  ctx.strokeRect(52, 52, W - 104, H - 104);

  // 四角吉祥如意紋飾
  const drawCorner = (cx, cy, sx, sy) => {
    ctx.strokeStyle = cfg.border;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy + sy * 36);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + sx * 36, cy);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx + sx * 16, cy + sy * 16, 7, 0, Math.PI * 2);
    ctx.fillStyle = cfg.border;
    ctx.fill();
  };
  drawCorner(65, 65, 1, 1);
  drawCorner(W - 65, 65, -1, 1);
  drawCorner(65, H - 65, 1, -1);
  drawCorner(W - 65, H - 65, -1, -1);

  // 3. 符頭 (道家三清三圓點點化)
  ctx.fillStyle = "#ffe885";
  ctx.textAlign = "center";
  const dots = [-50, 0, 50];
  dots.forEach(offset => {
    ctx.beginPath();
    ctx.arc(W / 2 + offset, 115, 11, 0, Math.PI * 2);
    ctx.fill();
  });

  // 「勅 令」
  ctx.font = "bold 82px 'Songti TC', serif";
  ctx.fillText("勅  令", W / 2, 225);

  // 4. 符身主文 (真靈寶符神號)
  const talismanTitles = {
    mazu: "天上聖母護國庇民安泰真符",
    wenchang: "文昌梓潼帝君魁星及第金榜真符",
    caishen: "五路武財神趙公明八方聚寶真符",
    yuelao: "月下老人千里牽線天賜真愛符",
    guaiguai: "科技守護綠色乖乖機房零當機真符",
    taisui: "甲子太歲尊神辟邪消災化煞保命符"
  };

  const titleStr = talismanTitles[amuletKey] || talismanTitles.mazu;
  ctx.font = "bold 44px 'Songti TC', serif";
  ctx.fillStyle = "#ffffff";

  for (let i = 0; i < titleStr.length; i++) {
    ctx.fillText(titleStr[i], W / 2, 305 + i * 48);
  }

  // 5. 符膽天罡神印星芒
  ctx.save();
  ctx.strokeStyle = "rgba(255, 232, 133, 0.7)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(W / 2, 915, 65, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = "bold 38px 'Songti TC', serif";
  ctx.fillStyle = "#ffe885";
  ctx.fillText("罡", W / 2, 928);
  ctx.restore();

  // 6. 朱砂法印 (Cinnabar Red Seal)
  ctx.save();
  const sealSize = 175;
  const sealX = W / 2 - sealSize / 2;
  const sealY = 965;
  ctx.fillStyle = "#bb1b1b";
  ctx.strokeStyle = "#bb1b1b";
  ctx.lineWidth = 8;
  ctx.strokeRect(sealX, sealY, sealSize, sealSize);
  ctx.lineWidth = 2;
  ctx.strokeRect(sealX + 8, sealY + 8, sealSize - 16, sealSize - 16);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 34px 'Songti TC', serif";
  ctx.fillText(cfg.seal, W / 2, sealY + 68);
  ctx.fillText(cfg.sealSub, W / 2, sealY + 128);
  ctx.restore();

  // 7. 善信與祈願名款
  ctx.fillStyle = "rgba(255, 235, 180, 0.9)";
  ctx.font = "26px 'Songti TC', serif";
  ctx.fillText(`善信名款：【 ${petitioner} 】 虔誠請領`, W / 2, 1185);
  ctx.font = "21px 'Songti TC', serif";
  ctx.fillText(`祝禱所求：${wish}`, W / 2, 1222);
}

// ==========================================================================
// 線上收驚除煞科儀 (Virtual Shoujing Ceremony)
// ==========================================================================
let selectedShoujingReason = "calm";
const SHOUJING_REASONS = {
  calm: "心神不寧",
  nightmare: "噩夢驚悸",
  traffic: "行車驚魂",
  fortune: "運途坎坷",
  exam: "考前焦慮"
};

window.openShoujingModal = function() {
  const modal = document.getElementById("shoujingModal");
  if (!modal) return;
  const txtName = document.getElementById("txtShoujingName");
  if (txtName) txtName.value = state.avatarConfig.title || "善信";
  const animArea = document.getElementById("shoujingAnimationArea");
  if (animArea) animArea.style.display = "none";
  const resultSec = document.getElementById("shoujingResultSection");
  if (resultSec) resultSec.style.display = "none";
  const btnStart = document.getElementById("btnStartShoujing");
  if (btnStart) btnStart.disabled = false;
  const statusEl = document.getElementById("shoujingStageStatus");
  if (statusEl) statusEl.innerText = "請誠敬端坐，點擊下方啟動收驚科儀。三清帝鐘鳴響，九天玄火掃煞。";

  modal.classList.add("open");
  if (window.templeAudio) window.templeAudio.playBell(528);
};

// 收驚事由選取
document.querySelectorAll(".shoujing-reason-card").forEach(card => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".shoujing-reason-card").forEach(c => c.classList.remove("active"));
    card.classList.add("active");
    selectedShoujingReason = card.dataset.reason;
    if (window.templeAudio) window.templeAudio.playBell(440);
  });
});

// 啟動收驚科儀
const btnStartShoujing = document.getElementById("btnStartShoujing");
if (btnStartShoujing) {
  btnStartShoujing.addEventListener("click", () => {
    const nameInput = document.getElementById("txtShoujingName");
    const name = (nameInput && nameInput.value.trim()) ? nameInput.value.trim() : "善信";
    const reasonLabel = SHOUJING_REASONS[selectedShoujingReason] || "心神不寧";

    const animArea = document.getElementById("shoujingAnimationArea");
    const stepText = document.getElementById("shoujingStepText");
    const stageStatus = document.getElementById("shoujingStageStatus");
    const resultSec = document.getElementById("shoujingResultSection");

    btnStartShoujing.disabled = true;
    if (animArea) animArea.style.display = "flex";
    if (stageStatus) stageStatus.innerText = `正在為【${name}】啟動正統道教科儀（化煞：${reasonLabel}）...`;
    if (stepText) stepText.innerText = "🔥 敬稟仙真，前三後四淨香掃煞...";

    if (temple3d) {
      temple3d.startShoujingEffect(name, reasonLabel);
    }

    setTimeout(() => {
      if (stepText) stepText.innerText = "✨ 金光神咒加持，天光灌頂...";
    }, 1000);

    setTimeout(() => {
      if (animArea) animArea.style.display = "none";
      if (resultSec) resultSec.style.display = "block";
      if (stageStatus) stageStatus.innerText = "✨ 科儀圓滿！本命元神安泰，災厄消散！";
    }, 2600);
  });
}

// 佩戴「心魂安泰」殊勝稱號
const btnEquipShoujingTitle = document.getElementById("btnEquipShoujingTitle");
if (btnEquipShoujingTitle) {
  btnEquipShoujingTitle.addEventListener("click", () => {
    const newTitle = "🌟 心魂安泰";
    state.avatarConfig.title = newTitle;
    localStorage.setItem("temple_avatar_cfg", JSON.stringify(state.avatarConfig));
    if (temple3d && temple3d.avatar) {
      temple3d.avatar.customize({ title: newTitle });
    }
    setDockStatus("🌟 已成功佩戴【🌟 心魂安泰】殊勝尊榮稱號！神魂安定，百邪不侵！");
    if (window.templeAudio) window.templeAudio.playBell(720);
    const modal = document.getElementById("shoujingModal");
    if (modal) modal.classList.remove("open");
  });
}

// ==========================================================================
// 功德福田 • 法器結緣閣 (Merit Relic Shop)
// ==========================================================================
const RELIC_DEFINITIONS = {
  lotusSteps: { name: "步步生蓮 • 踏蓮神行", cost: 150 },
  sword: { name: "七星太極寶劍", cost: 200 },
  whisk: { name: "太極乾坤拂塵", cost: 180 },
  calabash: { name: "如意紫金葫蘆", cost: 120 },
  baguaMirror: { name: "紫薇八卦神鏡", cost: 250 },
  lotusThrone: { name: "琉璃九品蓮花座", cost: 300 }
};

function getUnlockedRelics() {
  try {
    return JSON.parse(localStorage.getItem("temple_unlocked_relics") || "{}");
  } catch (e) {
    return {};
  }
}

function saveUnlockedRelics(unlocked) {
  localStorage.setItem("temple_unlocked_relics", JSON.stringify(unlocked));
}

function updateRelicShopUI() {
  const meritEl = document.getElementById("relicShopMeritCount");
  if (meritEl) meritEl.innerText = state.meritCount.toLocaleString();

  const unlocked = getUnlockedRelics();
  const equipped = (temple3d && temple3d.avatar) ? temple3d.avatar.relics : JSON.parse(localStorage.getItem("temple_equipped_relics") || "{}");

  document.querySelectorAll(".relic-card-item").forEach(card => {
    const key = card.dataset.relic;
    const def = RELIC_DEFINITIONS[key];
    const btn = card.querySelector(".btn-relic-action");
    if (!def || !btn) return;

    const isUnlocked = !!unlocked[key];
    const isEquipped = !!equipped[key];

    card.classList.toggle("equipped", isEquipped);

    if (isEquipped) {
      btn.innerText = "已佩戴";
      btn.classList.add("equipped");
    } else if (isUnlocked) {
      btn.innerText = "點擊佩戴";
      btn.classList.remove("equipped");
    } else {
      btn.innerText = `結緣請領 (${def.cost}功德)`;
      btn.classList.remove("equipped");
    }
  });
}

window.openRelicShopModal = function() {
  const modal = document.getElementById("relicShopModal");
  if (!modal) return;
  updateRelicShopUI();
  modal.classList.add("open");
  if (window.templeAudio) window.templeAudio.playBell(528);
};

const relicGrid = document.getElementById("relicGrid");
if (relicGrid) {
  relicGrid.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-relic-action");
    if (!btn) return;
    const card = btn.closest(".relic-card-item");
    if (!card) return;
    const relicKey = card.dataset.relic;
    const def = RELIC_DEFINITIONS[relicKey];
    if (!def) return;

    const unlocked = getUnlockedRelics();
    const avatar = temple3d ? temple3d.avatar : null;
    const equipped = avatar ? avatar.relics : JSON.parse(localStorage.getItem("temple_equipped_relics") || "{}");

    if (unlocked[relicKey]) {
      // 切換裝備狀態
      const isEquipped = !equipped[relicKey];
      if (avatar) {
        avatar.equipRelic(relicKey, isEquipped);
      } else {
        equipped[relicKey] = isEquipped;
        localStorage.setItem("temple_equipped_relics", JSON.stringify(equipped));
      }
      if (window.templeAudio) window.templeAudio.playBell(isEquipped ? 660 : 440);
      setDockStatus(isEquipped ? `✨ 已佩戴法器【${def.name}】！` : `✨ 已卸下法器【${def.name}】。`);
    } else {
      // 結緣請領檢查功德
      if (state.meritCount < def.cost) {
        setDockStatus(`⚠️ 請領【${def.name}】尚需 ${def.cost} 功德 (當前功德：${state.meritCount})，請精誠禮佛積修！`);
        if (window.templeAudio) window.templeAudio.playMuyuSound();
        return;
      }

      // 扣除功德並解鎖
      addMerit(-def.cost);
      unlocked[relicKey] = true;
      saveUnlockedRelics(unlocked);

      if (avatar) {
        avatar.equipRelic(relicKey, true);
      } else {
        equipped[relicKey] = true;
        localStorage.setItem("temple_equipped_relics", JSON.stringify(equipped));
      }

      if (window.templeAudio) window.templeAudio.playConsecrationChime();
      if (window.liveTempleWall) window.liveTempleWall.addDanmaku(`🪷 恭喜善信成功結緣請領神聖法器【${def.name}】！道氣長存，法力隨身！`);
      setDockStatus(`🪷 功德圓融！已成功請領並佩戴【${def.name}】！`);
    }
    updateRelicShopUI();
  });
}

// ==========================================================================
// 1. 宮廟拍立得留影坊 (Temple Polaroid Camera & Photo Mode)
// ==========================================================================
let currentSnapshotImage = null;

window.openPhotoModal = function() {
  const modal = document.getElementById("photoModal");
  if (!modal) return;
  modal.classList.add("open");
  if (window.templeAudio) window.templeAudio.playCameraShutter();
  snapCurrentPhoto();
};

function snapCurrentPhoto() {
  if (!temple3d) return;
  const dataUrl = temple3d.takeSnapshot();
  const img = new Image();
  img.onload = () => {
    currentSnapshotImage = img;
    renderPhotoCanvas();
  };
  img.src = dataUrl;
}

const btnSnapPhoto = document.getElementById("btnSnapPhoto");
if (btnSnapPhoto) {
  btnSnapPhoto.addEventListener("click", () => {
    if (window.templeAudio) window.templeAudio.playCameraShutter();
    snapCurrentPhoto();
    setDockStatus("📸 拍立得快照已更新！已抓取當前神殿視角。");
  });
}

const selectPhotoFrame = document.getElementById("selectPhotoFrame");
if (selectPhotoFrame) selectPhotoFrame.addEventListener("change", () => renderPhotoCanvas());

const selectPhotoFilter = document.getElementById("selectPhotoFilter");
if (selectPhotoFilter) selectPhotoFilter.addEventListener("change", () => renderPhotoCanvas());

const txtPhotoInscription = document.getElementById("txtPhotoInscription");
if (txtPhotoInscription) txtPhotoInscription.addEventListener("input", () => renderPhotoCanvas());

function renderPhotoCanvas() {
  const canvas = document.getElementById("photoCanvas");
  if (!canvas || !currentSnapshotImage) return;
  const ctx = canvas.getContext("2d");
  const W = 600;
  const H = 750;
  canvas.width = W;
  canvas.height = H;

  const frameType = selectPhotoFrame ? selectPhotoFrame.value : "polaroid";
  const filterType = selectPhotoFilter ? selectPhotoFilter.value : "normal";
  const inscription = (txtPhotoInscription && txtPhotoInscription.value.trim()) ? txtPhotoInscription.value.trim() : "合境平安 萬福駢臻";

  if (frameType === "polaroid") {
    // 經典復古拍立得白色相紙
    ctx.fillStyle = "#faf7f2";
    ctx.fillRect(0, 0, W, H);

    // 相片陰影
    ctx.fillStyle = "#e0d9cd";
    ctx.fillRect(36, 36, 528, 528);

    // 繪製中心截圖
    ctx.drawImage(currentSnapshotImage, 40, 40, 520, 520);

    // 底邊手寫風格題字
    ctx.fillStyle = "#3e2723";
    ctx.font = "bold 24px 'Songti TC', serif";
    ctx.textAlign = "left";
    ctx.fillText(`🏮 ${inscription}`, 45, 620);

    ctx.font = "16px 'Songti TC', serif";
    ctx.fillStyle = "#795548";
    const dateStr = new Date().toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" });
    ctx.fillText(`歲次丙午年 • 賽博虛擬神殿 留念 (${dateStr})`, 45, 658);
    ctx.fillText(`善信：【 ${state.avatarConfig.title || "悠閒的信眾"} 】 祈安敬奉`, 45, 690);

    // 右下角硃砂法印
    drawCinnabarSeal(ctx, 470, 595, 90, "神威普照", "賽博神殿");
  } else if (frameType === "postcard") {
    // 宮闈雙龍金碧明信片
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#4a1212");
    grad.addColorStop(1, "#1e0606");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // 金色雙邊框
    ctx.strokeStyle = "#ffd54f";
    ctx.lineWidth = 6;
    ctx.strokeRect(18, 18, W - 36, H - 36);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(26, 26, W - 52, H - 52);

    // 頂部金字匾額
    ctx.fillStyle = "#ffd54f";
    ctx.font = "bold 22px 'Songti TC', serif";
    ctx.textAlign = "center";
    ctx.fillText("⛩️ 賽 博 虛 擬 神 殿 • 祈 安 留 影 明 信 片 ⛩️", W / 2, 60);

    // 照片繪製
    ctx.drawImage(currentSnapshotImage, 38, 80, 524, 480);

    // 底部題字
    ctx.fillStyle = "#ffe082";
    ctx.font = "bold 26px 'Songti TC', serif";
    ctx.fillText(`【 ${inscription} 】`, W / 2, 615);

    ctx.font = "18px 'Songti TC', serif";
    ctx.fillStyle = "#ebd197";
    ctx.fillText(`十方信眾：${state.avatarConfig.title || "善信"}  •  萬佛加被 福祿駢臻`, W / 2, 655);

    drawCinnabarSeal(ctx, 460, 630, 85, "太歲安康", "福澤綿長");
  } else {
    // 賽博神威框
    ctx.fillStyle = "#0a0e14";
    ctx.fillRect(0, 0, W, H);

    // 霓虹金青外框
    ctx.strokeStyle = "#00e5ff";
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, W - 40, H - 40);
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 1;
    ctx.strokeRect(28, 28, W - 56, H - 56);

    ctx.drawImage(currentSnapshotImage, 36, 36, 528, 530);

    ctx.fillStyle = "#00e5ff";
    ctx.font = "bold 20px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`CYBER TEMPLE 3D // SNAPSHOT_ID_${Date.now().toString().slice(-6)}`, 40, 605);

    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 24px 'Songti TC', serif";
    ctx.fillText(`✨ ${inscription}`, 40, 645);

    ctx.fillStyle = "#ffffff";
    ctx.font = "16px monospace";
    ctx.fillText(`AVATAR: [${state.avatarConfig.title || "PILGRIM"}]  MERIT: ${state.meritCount}`, 40, 680);

    drawCinnabarSeal(ctx, 470, 595, 88, "靈光永駐", "賽博真符");
  }

  // 套用濾鏡
  if (filterType === "warm") {
    ctx.fillStyle = "rgba(255, 180, 50, 0.16)";
    ctx.fillRect(0, 0, W, H);
  } else if (filterType === "vintage") {
    ctx.fillStyle = "rgba(180, 130, 80, 0.22)";
    ctx.fillRect(0, 0, W, H);
  } else if (filterType === "radiance") {
    ctx.fillStyle = "rgba(255, 235, 100, 0.18)";
    ctx.fillRect(0, 0, W, H);
  }
}

function drawCinnabarSeal(ctx, x, y, size, line1, line2) {
  ctx.save();
  ctx.fillStyle = "#c62828";
  ctx.strokeStyle = "#c62828";
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, size, size);
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 4, y + 4, size - 8, size - 8);

  ctx.fillStyle = "#c62828";
  ctx.font = `bold ${Math.floor(size * 0.22)}px 'Songti TC', serif`;
  ctx.textAlign = "center";
  ctx.fillText(line1, x + size / 2, y + size * 0.42);
  ctx.fillText(line2, x + size / 2, y + size * 0.78);
  ctx.restore();
}

const btnDownloadPhoto = document.getElementById("btnDownloadPhoto");
if (btnDownloadPhoto) {
  btnDownloadPhoto.addEventListener("click", () => {
    const canvas = document.getElementById("photoCanvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = `賽博虛擬神殿_拍立得明信片_${Date.now()}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
    setDockStatus("💾 拍立得明信片已成功下載！可分享結緣至社群。");
    if (window.templeAudio) window.templeAudio.playBell(660);
  });
}

const btnSharePhotoToWall = document.getElementById("btnSharePhotoToWall");
if (btnSharePhotoToWall) {
  btnSharePhotoToWall.addEventListener("click", () => {
    const title = (txtPhotoInscription && txtPhotoInscription.value.trim()) || "合境平安";
    if (window.liveTempleWall) {
      window.liveTempleWall.addDanmaku(`📷 善信【${state.avatarConfig.title || "善信"}】在神殿拍攝留影拍立得：${title}！`);
    }
    setDockStatus("🏮 拍立得留影已同步發布至神殿香火牆！同殿信眾皆可共睹勝景。");
    if (window.templeAudio) window.templeAudio.playConsecrationChime();
  });
}

// ==========================================================================
// 2. 線上安太歲與元辰斗燈 (Tai Sui & Yuan Chen Shrine)
// ==========================================================================
const ZODIAC_DATA = {
  horse: { name: "馬 (午)", status: "值太歲 (本命坐太歲)", badge: "值太歲", desc: "本命值太歲，運勢起伏多變。宜虔誠安奉值年太歲星君，點亮本命元辰斗燈，化解太歲沖煞，護佑整年安康吉祥。", guardian: "大勢至菩薩" },
  rat: { name: "鼠 (子)", status: "正沖太歲 (歲破大沖)", badge: "正沖太歲", desc: "子午相沖，歲破正沖！衝動波折易有變故。務必誠心安奉值年太歲，以元辰長生斗燈固本培元，化險為夷、辟邪招祥。", guardian: "千手觀音" },
  ox: { name: "牛 (丑)", status: "害太歲 (是非小人化解)", badge: "害太歲", desc: "丑午相害，主易生阻滯與是非牽連。安奉太歲星君化解暗害，點亮長生斗燈以七星劍鎮煞，心開運泰。", guardian: "虛空藏菩薩" },
  rabbit: { name: "兔 (卯)", status: "破太歲 (破損波折預防)", badge: "破太歲", desc: "卯午相破，主防物損人傷、財氣漏失。安奉太歲以祈保本命元辰光彩，聚氣招吉，諸事圓融。", guardian: "文殊菩薩" },
  rooster: { name: "雞 (酉)", status: "偏沖太歲 (偏煞化解)", badge: "偏沖太歲", desc: "酉金遇午火，偏煞相克。宜安奉太歲星君化煞增福，心平氣和，凡事穩中求勝、吉曜護佑。", guardian: "不動明王" },
  tiger: { name: "虎 (寅)", status: "三合拱照 (吉星高照)", badge: "吉星拱照", desc: "寅午戌三合火局！貴人照曜，運途順遂。安奉太歲與元辰斗燈錦上添花，添福增壽，廣開財祿。", guardian: "虛空藏菩薩" },
  dog: { name: "狗 (戌)", status: "三合拱照 (福德齊臨)", badge: "吉星拱照", desc: "戌與午成三合，福星臨門、善緣廣進。安奉太歲星君感恩祈福，保佑家宅清吉、元辰光彩！", guardian: "阿彌陀佛" },
  goat: { name: "羊 (未)", status: "六合貴人 (大吉大利)", badge: "六合吉慶", desc: "午未六合！天地交泰，逢凶化吉、萬事亨通。安奉太歲答謝神恩，福祿綿長、四時無災。", guardian: "大日如來" },
  dragon: { name: "龍 (辰)", status: "平順吉安 (本命安穩)", badge: "平順吉安", desc: "歲運安詳，四時康泰。安奉太歲與元辰斗燈可固元培德，神光覆護，增益本命福報。", guardian: "普賢菩薩" },
  snake: { name: "蛇 (巳)", status: "平順祥和 (步步高升)", badge: "平順祥和", desc: "巳午比和，身心安適。虔奉太歲大將軍護持本命，智慧開朗，功名事業蒸蒸日上。", guardian: "普賢菩薩" },
  monkey: { name: "猴 (申)", status: "平順清吉 (吉慶臨門)", badge: "平順清吉", desc: "金火交融，安分守己則百福駢臻。安太歲以保四時順暢、百病不生、財源廣進。", guardian: "大日如來" },
  pig: { name: "豬 (亥)", status: "平順康寧 (祥光普照)", badge: "平順康寧", desc: "水火既濟，心平氣和。安奉太歲以祈元辰常耀，闔家安泰，災消福至。", guardian: "阿彌陀佛" }
};

window.openTaiSuiModal = function() {
  const modal = document.getElementById("taiSuiModal");
  if (!modal) return;
  const txtName = document.getElementById("txtTaiSuiName");
  if (txtName) txtName.value = state.avatarConfig.title || "善信";
  updateTaiSuiCard();
  modal.classList.add("open");
  if (window.templeAudio) window.templeAudio.playBell(560);
};

function updateTaiSuiCard() {
  const sel = document.getElementById("selectZodiac");
  const key = sel ? sel.value : "horse";
  const data = ZODIAC_DATA[key] || ZODIAC_DATA.horse;

  const titleEl = document.getElementById("cardZodiacTitle");
  const badgeEl = document.getElementById("badgeTaiSuiStatus");
  const descEl = document.getElementById("cardTaiSuiDesc");
  const guardEl = document.getElementById("cardGuardianName");

  if (titleEl) titleEl.innerText = `${data.name} • 歲次丙午歲運`;
  if (badgeEl) {
    badgeEl.innerText = data.badge;
    badgeEl.style.background = (data.badge.includes("值") || data.badge.includes("沖")) ? "#b71c1c" : "#2e7d32";
  }
  if (descEl) descEl.innerText = data.desc;
  if (guardEl) guardEl.innerText = data.guardian;
}

const selectZodiac = document.getElementById("selectZodiac");
if (selectZodiac) selectZodiac.addEventListener("change", updateTaiSuiCard);

const btnSubmitTaiSui = document.getElementById("btnSubmitTaiSui");
if (btnSubmitTaiSui) {
  btnSubmitTaiSui.addEventListener("click", () => {
    if (state.meritCount < 50) {
      setDockStatus("⚠️ 安奉太歲星君與元辰斗燈需 50 功德，請先勤敲木魚或敬香積累功德！");
      if (window.templeAudio) window.templeAudio.playMuyuSound();
      return;
    }

    addMerit(-50);
    const name = (document.getElementById("txtTaiSuiName")?.value.trim()) || "善信";
    const zodiacKey = selectZodiac ? selectZodiac.value : "horse";
    const zData = ZODIAC_DATA[zodiacKey] || ZODIAC_DATA.horse;
    const generalName = "章詞大將軍";

    if (temple3d) {
      temple3d.lightTaiSuiDipper(name, zData.name, generalName);
    }

    renderTaiSuiCertificate(name, zData.name, zData.guardian, generalName);

    const resSec = document.getElementById("taiSuiResultSection");
    if (resSec) resSec.style.display = "block";
    setDockStatus(`🏮 恭賀善信【${name}】安奉值年太歲大將軍圓滿！本命元辰斗燈長耀！`);
  });
}

function renderTaiSuiCertificate(name, zodiacName, guardian, generalName) {
  const canvas = document.getElementById("taiSuiCertificateCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = 560;
  const H = 780;
  canvas.width = W;
  canvas.height = H;

  // 1. 皇家黃綾錦盒背景
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#5a3a0e");
  grad.addColorStop(0.5, "#3d2406");
  grad.addColorStop(1, "#261502");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 雙金框與回紋
  ctx.strokeStyle = "#ffd54f";
  ctx.lineWidth = 8;
  ctx.strokeRect(20, 20, W - 40, H - 40);
  ctx.lineWidth = 2;
  ctx.strokeRect(30, 30, W - 60, H - 60);

  // 2. 標題：安奉太歲植福文疏
  ctx.fillStyle = "#ffd54f";
  ctx.font = "bold 26px 'Songti TC', serif";
  ctx.textAlign = "center";
  ctx.fillText("歲次丙午年安奉太歲星君祈安植福文疏", W / 2, 75);

  ctx.strokeStyle = "rgba(255, 213, 79, 0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, 95);
  ctx.lineTo(W - 60, 95);
  ctx.stroke();

  // 3. 文疏主文
  ctx.fillStyle = "#fff8e1";
  ctx.font = "18px 'Songti TC', serif";
  ctx.textAlign = "left";
  const startX = 60;
  let curY = 140;

  const lines = [
    `伏 以`,
    `天運昌隆，吉星拱照；神威廣大，元辰光彩。`,
    `今據 中華民國 虔誠奉道信眾：【 ${name} 】`,
    `歲次生肖：【 ${zodiacName} 】 吉旦立案，`,
    `專誠恭候 丙午年值年太歲星君：【 ${generalName} 】尊神，`,
    `並承 本命元辰守護神：【 ${guardian} 】垂慈覆護。`,
    `切念 凡身寄世，運途亨險難定；星宿流轉，陰陽造化無常。`,
    `今特於 賽博虛擬神殿太歲元辰殿 虔備五穀長生斗燈、`,
    `七星寶劍、辟邪神印，虔具文疏，恭叩神恩。`,
    `祈 求：`,
    `本命元辰光芒永耀，災星退避，吉曜照臨；`,
    `四時無災，八節有慶，出入平安，貴人輔弼；`,
    `逢凶化吉，福運齊臻，闔家泰寧，所求順遂！`,
    `天運歲次丙午年孟春吉旦  具疏呈奏`
  ];

  lines.forEach(line => {
    ctx.fillText(line, startX, curY);
    curY += 34;
  });

  // 4. 三大硃砂印章
  drawCinnabarSeal(ctx, 80, 640, 80, "太歲統御", "天曹真宰");
  drawCinnabarSeal(ctx, 240, 640, 80, "元辰長耀", "本命光彩");
  drawCinnabarSeal(ctx, 400, 640, 80, "虛擬神殿", "具疏奉申");
}

const btnDownloadTaiSuiCert = document.getElementById("btnDownloadTaiSuiCert");
if (btnDownloadTaiSuiCert) {
  btnDownloadTaiSuiCert.addEventListener("click", () => {
    const canvas = document.getElementById("taiSuiCertificateCanvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = `安奉太歲植福文疏_${Date.now()}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
    setDockStatus("💾 安太歲植福文疏已下載！保佑歲運安康、元辰光彩。");
    if (window.templeAudio) window.templeAudio.playBell(720);
  });
}

// ==========================================================================
// 3. 梵音課誦節奏法會 (Cyber Dharma Rhythm Mode)
// ==========================================================================
let isRhythmGameRunning = false;
let rhythmAnimFrame = null;
let rhythmStartTime = 0;
let rhythmCombo = 0;
let rhythmEarnedMerit = 0;
let rhythmSelectedSutra = "qingxin";

const SUTRA_SONGS = {
  qingxin: {
    name: "清心普善咒",
    bpm: 72,
    notes: [
      { beat: 1.0, type: "muyu", text: "清" },
      { beat: 2.0, type: "muyu", text: "心" },
      { beat: 3.0, type: "bell", text: "普" },
      { beat: 4.0, type: "muyu", text: "善" },
      { beat: 5.0, type: "muyu", text: "萬" },
      { beat: 6.0, type: "muyu", text: "念" },
      { beat: 7.0, type: "bell", text: "皆" },
      { beat: 8.0, type: "muyu", text: "空" },
      { beat: 9.0, type: "muyu", text: "靈" },
      { beat: 10.0, type: "muyu", text: "台" },
      { beat: 11.0, type: "bell", text: "明" },
      { beat: 12.0, type: "muyu", text: "澈" },
      { beat: 13.0, type: "muyu", text: "普" },
      { beat: 14.0, type: "muyu", text: "濟" },
      { beat: 15.0, type: "bell", text: "眾" },
      { beat: 16.0, type: "bell", text: "生" }
    ]
  },
  yinzhi: {
    name: "文昌陰騭文",
    bpm: 88,
    notes: [
      { beat: 1.0, type: "muyu", text: "諸" },
      { beat: 2.0, type: "muyu", text: "惡" },
      { beat: 2.5, type: "muyu", text: "莫" },
      { beat: 3.0, type: "bell", text: "作" },
      { beat: 4.0, type: "muyu", text: "眾" },
      { beat: 5.0, type: "muyu", text: "善" },
      { beat: 5.5, type: "muyu", text: "奉" },
      { beat: 6.0, type: "bell", text: "行" },
      { beat: 7.0, type: "muyu", text: "廣" },
      { beat: 8.0, type: "muyu", text: "行" },
      { beat: 8.5, type: "muyu", text: "陰" },
      { beat: 9.0, type: "bell", text: "騭" },
      { beat: 10.0, type: "muyu", text: "上" },
      { beat: 11.0, type: "muyu", text: "格" },
      { beat: 11.5, type: "bell", text: "蒼" },
      { beat: 12.0, type: "bell", text: "穹" }
    ]
  },
  qingjing: {
    name: "太上清靜經",
    bpm: 80,
    notes: [
      { beat: 1.0, type: "muyu", text: "大" },
      { beat: 2.0, type: "muyu", text: "道" },
      { beat: 3.0, type: "bell", text: "無" },
      { beat: 4.0, type: "muyu", text: "形" },
      { beat: 5.0, type: "muyu", text: "生" },
      { beat: 6.0, type: "muyu", text: "育" },
      { beat: 7.0, type: "bell", text: "天" },
      { beat: 8.0, type: "bell", text: "地" },
      { beat: 9.0, type: "muyu", text: "清" },
      { beat: 10.0, type: "muyu", text: "靜" },
      { beat: 11.0, type: "bell", text: "自" },
      { beat: 12.0, type: "bell", text: "然" }
    ]
  }
};

let currentRhythmSong = SUTRA_SONGS.qingxin;
let activeNotes = [];

window.openRhythmModal = function() {
  const modal = document.getElementById("rhythmModal");
  if (!modal) return;
  modal.classList.add("open");
  resetRhythmGame();
  drawRhythmIdleTrack();
  if (window.templeAudio) window.templeAudio.playBell(528);
};

function resetRhythmGame() {
  rhythmCombo = 0;
  rhythmEarnedMerit = 0;
  const comboEl = document.getElementById("rhythmCombo");
  const meritEl = document.getElementById("rhythmEarnedMerit");
  const accEl = document.getElementById("rhythmAccuracyText");
  if (comboEl) comboEl.innerText = "0";
  if (meritEl) meritEl.innerText = "+0";
  if (accEl) {
    accEl.innerText = "靜心以待";
    accEl.style.color = "#a5d6a7";
  }
}

// 課誦曲目分頁切換
document.querySelectorAll(".side-hall-tab-btn[data-sutra]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".side-hall-tab-btn[data-sutra]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    rhythmSelectedSutra = btn.dataset.sutra;
    currentRhythmSong = SUTRA_SONGS[rhythmSelectedSutra] || SUTRA_SONGS.qingxin;
    stopRhythmGame();
    resetRhythmGame();
    drawRhythmIdleTrack();
    if (window.templeAudio) window.templeAudio.playBell(600);
  });
});

const btnStartRhythm = document.getElementById("btnStartRhythm");
if (btnStartRhythm) {
  btnStartRhythm.addEventListener("click", () => {
    startRhythmGame();
  });
}

const btnStopRhythm = document.getElementById("btnStopRhythm");
if (btnStopRhythm) {
  btnStopRhythm.addEventListener("click", () => {
    stopRhythmGame();
  });
}

function startRhythmGame() {
  if (isRhythmGameRunning) return;
  isRhythmGameRunning = true;
  resetRhythmGame();
  rhythmStartTime = performance.now();

  const song = currentRhythmSong;
  const secPerBeat = 60 / song.bpm;

  // 構建三輪循環節奏音符
  activeNotes = [];
  const loopCount = 3;
  const loopDuration = song.notes[song.notes.length - 1].beat * secPerBeat + 2.0;

  for (let l = 0; l < loopCount; l++) {
    const loopOffset = l * loopDuration;
    song.notes.forEach(n => {
      activeNotes.push({
        time: n.beat * secPerBeat + loopOffset,
        type: n.type,
        text: n.text,
        hit: false,
        missed: false
      });
    });
  }

  rhythmGameLoop();
  setDockStatus(`🎵 課誦《${song.name}》啟動！跟隨軌道敲擊木魚 [J] 與引磬 [K] 積累無量功德！`);
}

function stopRhythmGame() {
  if (!isRhythmGameRunning) return;
  isRhythmGameRunning = false;
  if (rhythmAnimFrame) {
    cancelAnimationFrame(rhythmAnimFrame);
    rhythmAnimFrame = null;
  }
  if (rhythmEarnedMerit > 0) {
    addMerit(rhythmEarnedMerit);
    setDockStatus(`🌟 課誦法會圓滿！共獲修持功德 +${rhythmEarnedMerit}，法喜充滿！`);
    if (window.liveTempleWall) window.liveTempleWall.addDanmaku(`🎵 善信課誦《${currentRhythmSong.name}》圓滿，獲 +${rhythmEarnedMerit} 功德！`);
    if (window.templeAudio) window.templeAudio.playConsecrationChime();
  }
  drawRhythmIdleTrack();
}

function rhythmGameLoop() {
  if (!isRhythmGameRunning) return;
  const canvas = document.getElementById("rhythmTrackCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  const curTime = (performance.now() - rhythmStartTime) * 0.001;
  const speed = 160; // 像素/秒
  const targetX = 90; // 敲擊判定靶心位置

  ctx.clearRect(0, 0, W, H);

  // 1. 經文卷軸底色
  const scrollGrad = ctx.createLinearGradient(0, 0, 0, H);
  scrollGrad.addColorStop(0, "#2c100a");
  scrollGrad.addColorStop(0.5, "#180705");
  scrollGrad.addColorStop(1, "#2c100a");
  ctx.fillStyle = scrollGrad;
  ctx.fillRect(0, 0, W, H);

  // 上下裝飾金線
  ctx.strokeStyle = "rgba(212, 160, 52, 0.4)";
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, W - 8, H - 8);

  // 中央節奏導軌線
  ctx.strokeStyle = "rgba(255, 235, 150, 0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(targetX, H / 2);
  ctx.lineTo(W, H / 2);
  ctx.stroke();

  // 2. 判定目標靶心圓環
  ctx.strokeStyle = "#ffd54f";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(targetX, H / 2, 28, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 213, 79, 0.15)";
  ctx.fill();

  ctx.fillStyle = "#fff8e1";
  ctx.font = "bold 13px 'Songti TC', serif";
  ctx.textAlign = "center";
  ctx.fillText("擊", targetX, H / 2 + 5);

  // 3. 繪製流動中的節奏音符
  let allDone = true;

  activeNotes.forEach(note => {
    if (note.hit) return;
    const dt = note.time - curTime;
    const x = targetX + dt * speed;

    // 若超出左側判定區且未敲擊則標記偏失
    if (x < targetX - 55 && !note.missed) {
      note.missed = true;
      rhythmCombo = 0;
      updateRhythmDisplay("偏失", "#ef5350");
    }

    if (x > -40 && x < W + 40) {
      allDone = false;

      // 繪製音符球
      const isMuyu = note.type === "muyu";
      ctx.fillStyle = isMuyu ? "#8d4320" : "#d4a034";
      ctx.beginPath();
      ctx.arc(x, H / 2, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isMuyu ? "#ffd54f" : "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // 音符內經文字符
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px 'Songti TC', serif";
      ctx.textAlign = "center";
      ctx.fillText(note.text, x, H / 2 + 6);
    } else if (dt > 0) {
      allDone = false;
    }
  });

  if (allDone && curTime > 5) {
    stopRhythmGame();
    return;
  }

  rhythmAnimFrame = requestAnimationFrame(rhythmGameLoop);
}

function drawRhythmIdleTrack() {
  const canvas = document.getElementById("rhythmTrackCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  ctx.fillStyle = "#1e0b07";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(212, 160, 52, 0.3)";
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, W - 8, H - 8);

  ctx.strokeStyle = "#ffd54f";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(90, H / 2, 28, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#ebd197";
  ctx.font = "bold 16px 'Songti TC', serif";
  ctx.textAlign = "center";
  ctx.fillText("點擊下方「開始課誦」以啟動法會節奏迷你遊戲", W / 2, H / 2 + 6);
}

function handleRhythmHit(hitType) {
  if (!isRhythmGameRunning) return;
  const curTime = (performance.now() - rhythmStartTime) * 0.001;

  // 尋找最近之音符
  let closestNote = null;
  let minDiff = 999;

  activeNotes.forEach(note => {
    if (note.hit || note.missed) return;
    const diff = Math.abs(note.time - curTime);
    if (diff < minDiff && diff < 0.38) {
      minDiff = diff;
      closestNote = note;
    }
  });

  if (closestNote) {
    closestNote.hit = true;
    let accuracy = "perfect";
    let pts = 5;

    if (minDiff < 0.12) {
      accuracy = "perfect";
      pts = closestNote.type === hitType ? 8 : 4;
      updateRhythmDisplay("圓融！", "#69f0ae");
    } else {
      accuracy = "good";
      pts = closestNote.type === hitType ? 5 : 2;
      updateRhythmDisplay("精進！", "#ffd54f");
    }

    rhythmCombo++;
    const multiplier = Math.min(3, 1 + Math.floor(rhythmCombo / 10));
    const addedMerit = pts * multiplier;
    rhythmEarnedMerit += addedMerit;

    const comboEl = document.getElementById("rhythmCombo");
    const meritEl = document.getElementById("rhythmEarnedMerit");
    if (comboEl) comboEl.innerText = rhythmCombo.toString();
    if (meritEl) meritEl.innerText = `+${rhythmEarnedMerit}`;

    if (window.templeAudio) {
      window.templeAudio.playRhythmHit(closestNote.type, accuracy);
      if (rhythmCombo > 0 && rhythmCombo % 10 === 0) {
        window.templeAudio.playRhythmHit("combo");
      }
    }
  } else {
    // 偏擊
    if (window.templeAudio) window.templeAudio.playRhythmHit(hitType, "good");
  }
}

function updateRhythmDisplay(accText, color) {
  const el = document.getElementById("rhythmAccuracyText");
  if (el) {
    el.innerText = accText;
    el.style.color = color;
  }
}

// 木魚與引磬點擊按鈕
const btnHitMuyu = document.getElementById("btnHitMuyu");
if (btnHitMuyu) {
  btnHitMuyu.addEventListener("click", () => {
    handleRhythmHit("muyu");
  });
}

const btnHitBell = document.getElementById("btnHitBell");
if (btnHitBell) {
  btnHitBell.addEventListener("click", () => {
    handleRhythmHit("bell");
  });
}

// ==========================================================================
// 山海祥瑞 • 隨身萌寵護法小窩 (Pet Sanctuary)
// ==========================================================================
window.openPetModal = function() {
  const modal = document.getElementById("petModal");
  if (!modal) return;
  modal.classList.add("open");
  updatePetModalUI();
  if (window.templeAudio) window.templeAudio.playBell(528);
};

window.closePetModal = function() {
  const modal = document.getElementById("petModal");
  if (modal) modal.classList.remove("open");
};

function updatePetModalUI() {
  const currentPet = (window.temple3d && window.temple3d.avatar) ? window.temple3d.avatar.petType : "tiger";
  document.querySelectorAll(".pet-card").forEach(card => {
    const pType = card.dataset.petType;
    const isActive = pType === currentPet;
    card.classList.toggle("active", isActive);
    const btn = card.querySelector(".btn-select-pet");
    if (btn) {
      btn.innerText = isActive ? "✅ 當前隨行" : "選擇隨行";
      btn.style.background = isActive ? "#b45309" : (pType === "turtle" ? "#065f46" : (pType === "rabbit" ? "#831843" : "#4b5563"));
    }
  });

  const petInfo = {
    tiger: { title: "當前靈寵：🐯 金虎爺大將軍", desc: "額頂「王」字符印，口銜萬兩元寶。按 [G] 鍵撫摸靈寵，觸發歡快跳躍、咕嚕聲與金幣神光！" },
    turtle: { title: "當前靈寵：🐢 九品金靈龜", desc: "太極八卦雕紋，周身翡翠生機靈光。按 [G] 鍵撫摸靈龜，長生凝氣，神清氣爽！" },
    rabbit: { title: "當前靈寵：🐰 廣寒玉兔", desc: "通體雪白玉潔，雙耳輕晃，長生藥杵臼。按 [G] 鍵撫摸玉兔，祛病消災，吉祥喜樂！" },
    none: { title: "當前狀態：🍃 獨步清修", desc: "靈寵已暫時回山修憩，可隨時在此重新召喚神獸隨侍護法。" }
  };
  const info = petInfo[currentPet] || petInfo.tiger;
  const tEl = document.getElementById("petCurrentTitle");
  const dEl = document.getElementById("petCurrentDesc");
  if (tEl) tEl.innerText = info.title;
  if (dEl) dEl.innerText = info.desc;
}

window.interactWithPet = function() {
  if (!window.temple3d || !window.temple3d.avatar) return;
  const res = window.temple3d.avatar.interactWithPet();
  if (res) {
    addMerit(res.merits);
    const msg = `🐾 撫摸【${res.name}】！心生歡喜，神光護體，功德 +${res.merits}！`;
    if (window.setDockStatus) window.setDockStatus(msg);
    if (typeof showFloatingDanmaku !== "undefined") {
      showFloatingDanmaku(msg, "#fde047");
    }
  } else {
    if (window.setDockStatus) window.setDockStatus("🐾 目前處於獨步清修狀態，可點擊底部 [🐾 萌寵神獸] 召喚靈寵同行！");
  }
};

// ==========================================================================
// 平溪賽博祈安天燈盛典 (Sky Lanterns & Floating River Lamps)
// ==========================================================================
window.openSkyLanternModal = function() {
  const modal = document.getElementById("skyLanternModal");
  if (!modal) return;
  modal.classList.add("open");
  const petNameInput = document.getElementById("skyLanternPetitioner");
  if (petNameInput && state.avatarConfig && state.avatarConfig.title) {
    petNameInput.value = state.avatarConfig.title;
  }
  if (window.templeAudio) window.templeAudio.playBell(432);
};

window.closeSkyLanternModal = function() {
  const modal = document.getElementById("skyLanternModal");
  if (modal) modal.classList.remove("open");
};

function launchCurrentSkyLantern() {
  const textInput = document.getElementById("skyLanternText");
  const colorSelect = document.getElementById("skyLanternColor");
  const petitionerInput = document.getElementById("skyLanternPetitioner");

  const text = (textInput ? textInput.value.trim() : "") || "萬事順遂";
  const color = colorSelect ? colorSelect.value : "#dc2626";
  const petitioner = (petitionerInput ? petitionerInput.value.trim() : "") || "善信";

  if (window.temple3d) {
    window.temple3d.launchSkyLantern({ text, color, petitionerName: petitioner });
  }

  addMerit(80);
  const broadcastMsg = `🏮 善信【${petitioner}】在神殿放飛祈安天燈：「${text}」，願力通達九天！`;
  if (window.liveTempleWall) window.liveTempleWall.addDanmaku(broadcastMsg);
  if (typeof showFloatingDanmaku !== "undefined") {
    showFloatingDanmaku(broadcastMsg, "#ffd700");
  }
  if (window.setDockStatus) {
    window.setDockStatus(`🏮 祈願天燈已點燃升空！萬民祈福，功德 +80！`);
  }
  window.closeSkyLanternModal();
}

function launchCurrentWaterLantern() {
  const textInput = document.getElementById("skyLanternText");
  const petitionerInput = document.getElementById("skyLanternPetitioner");

  const text = (textInput ? textInput.value.trim() : "") || "心願順遂";
  const petitioner = (petitionerInput ? petitionerInput.value.trim() : "") || "善信";

  if (window.temple3d) {
    window.temple3d.launchWaterLantern({ text, petitionerName: petitioner });
  }

  addMerit(50);
  const broadcastMsg = `🪷 善信【${petitioner}】在蓮花池放流祈願水燈：「${text}」，波光照耀福海！`;
  if (window.liveTempleWall) window.liveTempleWall.addDanmaku(broadcastMsg);
  if (typeof showFloatingDanmaku !== "undefined") {
    showFloatingDanmaku(broadcastMsg, "#a7f3d0");
  }
  if (window.setDockStatus) {
    window.setDockStatus(`🪷 祈願水燈已順水漂流！池泛金波，功德 +50！`);
  }
  window.closeSkyLanternModal();
}

// ==========================================================================
// 賽博禪修堂 • 數息定心冥想 (Zen Breathwork & Ambient Soundscape)
// ==========================================================================
let isZenRunning = false;
let zenMode = "box"; // "box", "478", "free"
let zenTargetDuration = 300; // 秒 (預設 5 分鐘, 0 為無限)
let zenStartTime = 0;
let zenElapsedSeconds = 0;
let zenAnimFrameId = null;

window.openZenModal = function() {
  const modal = document.getElementById("zenModal");
  if (!modal) return;
  modal.classList.add("open");
  drawZenMandala("idle", 0);
  if (window.templeAudio) window.templeAudio.playBell(396);
};

window.closeZenModal = function() {
  const modal = document.getElementById("zenModal");
  if (modal) modal.classList.remove("open");
};

function drawZenMandala(phase, scaleFactor) {
  const canvas = document.getElementById("zenMandalaCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2;

  ctx.clearRect(0, 0, W, H);

  // 外圈柔和呼吸光暈
  const glowRadius = Math.max(20, 75 + scaleFactor * 45);
  const radialGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, glowRadius);
  radialGrad.addColorStop(0, "rgba(255, 215, 0, 0.45)");
  radialGrad.addColorStop(0.6, "rgba(245, 158, 11, 0.18)");
  radialGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = radialGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  // 八瓣動態曼陀羅幾何線條
  const petalCount = 8;
  const petalLen = 35 + scaleFactor * 38;
  const petalWidth = 14 + scaleFactor * 10;

  ctx.save();
  ctx.translate(cx, cy);

  for (let ring = 0; ring < 2; ring++) {
    const rScale = ring === 0 ? 1 : 0.65;
    const rPetalLen = petalLen * rScale;
    const rPetalWidth = petalWidth * rScale;
    ctx.rotate(ring * (Math.PI / petalCount));

    for (let i = 0; i < petalCount; i++) {
      ctx.rotate((Math.PI * 2) / petalCount);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-rPetalWidth, rPetalLen * 0.4, -rPetalWidth * 0.7, rPetalLen, 0, rPetalLen);
      ctx.bezierCurveTo(rPetalWidth * 0.7, rPetalLen, rPetalWidth, rPetalLen * 0.4, 0, 0);

      ctx.strokeStyle = ring === 0 ? "rgba(255, 215, 0, 0.85)" : "rgba(245, 158, 11, 0.7)";
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.fillStyle = ring === 0 ? "rgba(255, 225, 100, 0.12)" : "rgba(245, 158, 11, 0.08)";
      ctx.fill();
    }
  }

  // 中心同心金環與微芒
  ctx.beginPath();
  ctx.arc(0, 0, 12 + scaleFactor * 5, 0, Math.PI * 2);
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 2.2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();

  ctx.restore();
}

function startZenMeditation() {
  if (isZenRunning) return;
  isZenRunning = true;
  zenStartTime = performance.now();
  zenElapsedSeconds = 0;

  // 3D 分身端坐打坐蓮花座
  if (window.temple3d && window.temple3d.avatar) {
    window.temple3d.avatar.triggerAction("meditate");
    if (window.temple3d.avatar.limbs && window.temple3d.avatar.config && window.temple3d.avatar.config.hasLotusThrone) {
      window.temple3d.avatar.buildLotusThrone(true);
    }
  }

  // 啟動 4 軌禪音環境混音器
  if (window.templeAudio) {
    window.templeAudio.initZenSoundscape();
    const wind = (document.getElementById("zenWindVol")?.value || 40) / 100;
    const rain = (document.getElementById("zenRainVol")?.value || 35) / 100;
    const birds = (document.getElementById("zenBirdsVol")?.value || 30) / 100;
    const bowl = (document.getElementById("zenBowlVol")?.value || 45) / 100;
    window.templeAudio.setZenTrackVolume("wind", wind);
    window.templeAudio.setZenTrackVolume("rain", rain);
    window.templeAudio.setZenTrackVolume("birds", birds);
    window.templeAudio.setZenTrackVolume("bowl", bowl);
  }

  const btnStart = document.getElementById("btnStartZen");
  if (btnStart) {
    btnStart.innerText = "🧘 禪修中…";
    btnStart.style.background = "#15803d";
  }

  runZenLoop();
}

function runZenLoop() {
  if (!isZenRunning) return;

  const now = performance.now();
  const elapsedSec = (now - zenStartTime) * 0.001;
  zenElapsedSeconds = Math.floor(elapsedSec);

  let displaySec = zenTargetDuration > 0 ? Math.max(0, zenTargetDuration - zenElapsedSeconds) : zenElapsedSeconds;
  const m = Math.floor(displaySec / 60);
  const s = displaySec % 60;
  const timerText = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;

  const tEl = document.getElementById("zenTimerText");
  if (tEl) tEl.innerText = timerText;

  let phaseName = "吸氣…引納九天清靈氣";
  let scale = 0;

  if (zenMode === "box") {
    const cycle = elapsedSec % 16;
    if (cycle < 4) {
      phaseName = "吸氣…引九天靈光入心 (4s)";
      scale = cycle / 4;
    } else if (cycle < 8) {
      phaseName = "持息…安住清淨本心 (4s)";
      scale = 1.0;
    } else if (cycle < 12) {
      phaseName = "呼氣…釋放塵世雜念 (4s)";
      scale = 1 - (cycle - 8) / 4;
    } else {
      phaseName = "空息…萬緣放下如如 (4s)";
      scale = 0.0;
    }
  } else if (zenMode === "478") {
    const cycle = elapsedSec % 19;
    if (cycle < 4) {
      phaseName = "吸氣…深吸清寧 (4s)";
      scale = cycle / 4;
    } else if (cycle < 11) {
      phaseName = "持息…定心凝神 (7s)";
      scale = 1.0;
    } else {
      phaseName = "呼氣…完全放鬆 (8s)";
      scale = 1 - (cycle - 11) / 8;
    }
  } else {
    const cycle = elapsedSec % 10;
    scale = cycle < 5 ? cycle / 5 : 1 - (cycle - 5) / 5;
    phaseName = cycle < 5 ? "徐緩吸氣…" : "悠然呼氣…";
  }

  const pEl = document.getElementById("zenPhaseText");
  if (pEl) pEl.innerText = phaseName;

  drawZenMandala(phaseName, scale);

  if (zenTargetDuration > 0 && zenElapsedSeconds >= zenTargetDuration) {
    stopZenMeditation(true);
    return;
  }

  zenAnimFrameId = requestAnimationFrame(runZenLoop);
}

function stopZenMeditation(isCompleted = false) {
  if (!isZenRunning) return;
  isZenRunning = false;
  if (zenAnimFrameId) {
    cancelAnimationFrame(zenAnimFrameId);
    zenAnimFrameId = null;
  }

  if (window.templeAudio) {
    window.templeAudio.stopZenSoundscape();
    window.templeAudio.playBell(216);
  }

  if (window.temple3d && window.temple3d.avatar) {
    window.temple3d.avatar.triggerAction("idle");
  }

  const btnStart = document.getElementById("btnStartZen");
  if (btnStart) {
    btnStart.innerText = "🧘 開始定心禪修";
    btnStart.style.background = "#2e7d32";
  }

  const minutes = Math.max(1, Math.round(zenElapsedSeconds / 60));
  const earnedMerit = Math.max(30, minutes * 30);
  addMerit(earnedMerit);

  const titleText = isCompleted ? "🎉 禪修圓滿！出定收功！" : "🧘 暫歇禪修，功德圓融！";
  const msg = `${titleText} 總計修持 ${minutes} 分鐘，積攢功德 +${earnedMerit}！心如止水，福慧增長！`;

  const pEl = document.getElementById("zenPhaseText");
  if (pEl) pEl.innerText = "禪修圓滿 • 福慧雙全";
  drawZenMandala("idle", 0.5);

  if (window.setDockStatus) window.setDockStatus(msg);
  alert(msg);
}

// ==========================================================================
// 1. 搏杯大賽 • 連得聖筊發財擂台 (Bwa Competition Logic)
// ==========================================================================
let bwaStreak = 0;
let bwaEarnedMerit = 0;
let bwaPersonalBest = parseInt(localStorage.getItem("temple_bwa_best") || "0", 10);
let bwaLeaderboard = JSON.parse(localStorage.getItem("temple_bwa_leaders") || "[]");
let isBwaCompRunning = false;

if (bwaLeaderboard.length === 0) {
  bwaLeaderboard = [
    { name: "大甲朝聖使", streak: 12, title: "🌟 天選信徒", date: "2026-03-15" },
    { name: "伺服器守護神", streak: 9, title: "👑 爐主福星", date: "2026-06-22" },
    { name: "悠閒的修行客", streak: 7, title: "✨ 神明降祥", date: "2026-08-01" },
    { name: "北港進香客", streak: 6, title: "✨ 神明降祥", date: "2026-09-19" },
    { name: "善信林居士", streak: 5, title: "✨ 神明降祥", date: "2026-10-10" }
  ];
}

window.openBwaCompModal = function() {
  const modal = document.getElementById("bwaCompModal");
  if (!modal) return;
  modal.classList.add("open");
  updateBwaCompUI();
  renderBwaLeaderboard();
  if (window.templeAudio) window.templeAudio.playBell(528);
};

window.closeBwaCompModal = function() {
  const modal = document.getElementById("bwaCompModal");
  if (modal) modal.classList.remove("open");
};

function getBwaTitleByStreak(streak) {
  if (streak >= 10) return "🌟 天選信徒";
  if (streak >= 8) return "👑 爐主福星";
  if (streak >= 5) return "✨ 神明降祥";
  if (streak >= 3) return "🌱 聚氣福緣";
  return "🌱 初入法門";
}

function updateBwaCompUI() {
  const sEl = document.getElementById("bwaCompStreak");
  const mEl = document.getElementById("bwaCompMerit");
  const pbEl = document.getElementById("bwaCompPersonalBest");
  const tbEl = document.getElementById("bwaCompTitleBadge");

  if (sEl) sEl.innerText = bwaStreak.toString();
  if (mEl) mEl.innerText = `+${bwaEarnedMerit}`;
  if (pbEl) pbEl.innerText = bwaPersonalBest.toString();
  if (tbEl) tbEl.innerText = getBwaTitleByStreak(bwaStreak);
}

function renderBwaLeaderboard() {
  const listEl = document.getElementById("bwaLeaderboardList");
  if (!listEl) return;
  listEl.innerHTML = bwaLeaderboard.slice(0, 5).map((item, idx) => `
    <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed rgba(255,255,255,0.08);">
      <span>${idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "🎖️"} 第 ${idx + 1} 名：【${item.name}】</span>
      <span style="color: #ffd700; font-weight: bold;">${item.streak} 連聖 (${item.title})</span>
    </div>
  `).join("");
}

function throwBwaCompetition() {
  if (isBwaCompRunning) return;
  isBwaCompRunning = true;

  const resText = document.getElementById("bwaCompResultText");
  if (resText) resText.innerText = "🎲 筊杯凌空拋起，飛騰轉運中…";

  if (window.temple3d) {
    window.temple3d.tossBwa(res => {
      isBwaCompRunning = false;
      const isHoly = (res.outcome1 === 0 && res.outcome2 === 1) || (res.outcome1 === 1 && res.outcome2 === 0);
      const isLaugh = (res.outcome1 === 0 && res.outcome2 === 0);

      if (isHoly) {
        bwaStreak++;
        const pts = bwaStreak * 25;
        bwaEarnedMerit += pts;

        if (bwaStreak > bwaPersonalBest) {
          bwaPersonalBest = bwaStreak;
          localStorage.setItem("temple_bwa_best", bwaPersonalBest.toString());
        }

        updateBwaCompUI();
        if (window.templeAudio) window.templeAudio.playBwaCompetitionChime(bwaStreak);

        if (resText) {
          resText.innerHTML = `🌓 <span style="color:#69f0ae;">聖筊！</span>【第 ${bwaStreak} 連聖】！神威默佑，福澤綿長！`;
        }

        if (bwaStreak >= 3) {
          const chk = document.getElementById("chkGoldenBwa");
          if (chk && !chk.checked) {
            chk.checked = true;
            if (window.temple3d) window.temple3d.setBwaGoldenMaterial(true);
          }
        }

        if (bwaStreak >= 5) {
          const bMsg = `🎉 善信【${state.avatarConfig.title || "善信"}】在搏杯大賽連續擲得【${bwaStreak} 聖筊】！${getBwaTitleByStreak(bwaStreak)}！`;
          if (window.liveTempleWall) window.liveTempleWall.addDanmaku(bMsg);
          if (typeof showFloatingDanmaku !== "undefined") showFloatingDanmaku(bMsg, "#ffd700");
        }
      } else {
        const finalStreak = bwaStreak;
        const finalMerit = bwaEarnedMerit;

        if (finalMerit > 0) {
          addMerit(finalMerit);
        }

        if (finalStreak >= 3) {
          const myName = state.avatarConfig.title || "善信";
          bwaLeaderboard.push({
            name: myName,
            streak: finalStreak,
            title: getBwaTitleByStreak(finalStreak),
            date: new Date().toISOString().split("T")[0]
          });
          bwaLeaderboard.sort((a, b) => b.streak - a.streak);
          bwaLeaderboard = bwaLeaderboard.slice(0, 8);
          localStorage.setItem("temple_bwa_leaders", JSON.stringify(bwaLeaderboard));
          renderBwaLeaderboard();
        }

        if (isLaugh) {
          if (window.templeAudio) window.templeAudio.playBell(330);
          if (resText) resText.innerHTML = `🌕 <span style="color:#ffd54f;">笑筊！</span>神明微笑未置可否。總計 ${finalStreak} 連聖，獲 +${finalMerit} 功德！`;
        } else {
          if (window.templeAudio) window.templeAudio.playBell(220);
          if (resText) resText.innerHTML = `🌑 <span style="color:#f87171;">陰筊！</span>神明諭示順其自然。總計 ${finalStreak} 連聖，獲 +${finalMerit} 功德！`;
        }

        bwaStreak = 0;
        bwaEarnedMerit = 0;
        updateBwaCompUI();
      }
    });
  }
}

function resetBwaCompetition() {
  bwaStreak = 0;
  bwaEarnedMerit = 0;
  updateBwaCompUI();
  const resText = document.getElementById("bwaCompResultText");
  if (resText) resText.innerText = "請誠心默禱，點擊下方「誠心起擲」重啟挑戰！";
}

function generateBwaCertificate() {
  const canvas = document.getElementById("bwaCompCertCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = 600, H = 800;
  canvas.width = W; canvas.height = H;

  // 仿古金黃宣紙底色
  ctx.fillStyle = "#fff8e7";
  ctx.fillRect(0, 0, W, H);

  // 雙重朱紅與金雙邊框
  ctx.strokeStyle = "#8b0000";
  ctx.lineWidth = 10;
  ctx.strokeRect(18, 18, W - 36, H - 36);

  ctx.strokeStyle = "#d4af37";
  ctx.lineWidth = 4;
  ctx.strokeRect(26, 26, W - 52, H - 52);

  // 標題
  ctx.fillStyle = "#8b0000";
  ctx.font = "bold 30px 'Songti TC', serif";
  ctx.textAlign = "center";
  ctx.fillText("賽博虛擬神殿 • 搏杯大賽榮譽敕令", W / 2, 85);

  ctx.font = "16px 'Songti TC', serif";
  ctx.fillStyle = "#666";
  ctx.fillText("天賜神聖 • 靈光感應 • 萬事亨通", W / 2, 115);

  ctx.strokeStyle = "#d4af37";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(70, 135); ctx.lineTo(W - 70, 135);
  ctx.stroke();

  ctx.font = "20px 'Songti TC', serif";
  ctx.fillStyle = "#222";
  ctx.textAlign = "left";
  const petitioner = state.avatarConfig.title || "善信";
  const streakCount = Math.max(1, bwaPersonalBest);
  const title = getBwaTitleByStreak(streakCount);

  const lines = [
    `善信尊諱：【 ${petitioner} 】`,
    `祈問神尊：天上聖母 • 五路財神 • 文昌帝君`,
    `大顯神威：連續擲得【 ${streakCount} 聖筊 】`,
    `蒙賜法位：【 ${title} 】`,
    ``,
    `敕曰：`,
    `誠心感格九天宮，聖筊連連兆運隆。`,
    `福祿壽康齊駢臻，神明默佑展奇功。`,
    ``,
    `頒發歲次：丙午年吉月吉日`,
    `特頒此敕，以昭神威靈驗，永垂吉庇！`
  ];

  lines.forEach((line, i) => {
    ctx.fillText(line, 75, 180 + i * 36);
  });

  // 硃砂大印
  ctx.save();
  ctx.strokeStyle = "#c2185b";
  ctx.lineWidth = 4;
  ctx.strokeRect(W - 190, H - 220, 120, 120);
  ctx.fillStyle = "#c2185b";
  ctx.font = "bold 24px 'Songti TC', serif";
  ctx.textAlign = "center";
  ctx.fillText("天上聖母", W - 130, H - 170);
  ctx.fillText("通真神寶", W - 130, H - 130);
  ctx.restore();

  const link = document.createElement("a");
  link.download = `賽博神殿_搏杯榮譽敕令_${petitioner}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// ==========================================================================
// 2. 宮廟藏經閣 • 靈籤寶典與仙真史料館 (Lore Pavilion Logic)
// ==========================================================================
let currentLoreTab = "chiam";

const LORE_DEITIES = [
  {
    id: "mazu",
    title: "天上聖母 • 媽祖林默娘",
    badge: "護國庇民 • 慈悲海神",
    desc: "生於湄洲嶼，自幼通靈顯化，能乘席渡海、預知休咎。歷朝累封天妃、天后、天上聖母，為護佑四海生民航海、闔家安康之主神，座前配祀千里眼、順風耳二大將軍。",
    advice: "常懷慈悲救難之心，遇風浪處心不慌亂，靜守正念自有神助。"
  },
  {
    id: "wenchang",
    title: "文昌帝君 • 梓潼梓帝",
    badge: "文章司命 • 魁星點斗",
    desc: "主宰人間功名、學業、利祿與考運之神仙。七十七次化身人間，濟人之急，救人之難。手持如意與硃砂筆，點選士子及第，座前配侍天聾、地啞，象徵文才守密不漏天機。",
    advice: "行陰騭、廣讀詩書，積德於暗室之中，功名自然水到渠成。"
  },
  {
    id: "caishen",
    title: "五路武財神 • 玄壇真君趙公明",
    badge: "迎祥納福 • 招財進寶",
    desc: "峨眉山得道仙真，跨黑虎、執九節金鞭，統領招寶天尊蕭升、納珍天尊曹寶、招財使者陳九公、利市仙官姚少司，合稱五路財神，管領人間一切財帛庫藏。",
    advice: "取財有道，以義取財，多行布施善舉，正偏財聚寶盆自然滿盈。"
  },
  {
    id: "yuelao",
    title: "月下老人 • 天賜良緣仙長",
    badge: "千里姻緣 • 紅繩和合",
    desc: "道家職司姻緣愛戀之仙翁。手持鴛鴦譜，袋中暗繫紅絲線，凡經其牽合者，縱隔關山千里、冤家世仇，終成眷屬同諧白首。座右配備同心金鎖，鎖定永世真愛。",
    advice: "彼此體諒寬容，真心珍惜眼前緣分，切莫因執著小節錯失佳期。"
  },
  {
    id: "taisui",
    title: "值年太歲星君 • 六十甲子本命神",
    badge: "元辰光彩 • 化煞除災",
    desc: "依六十甲子干支輪值人間禍福，率領太歲神將監察人間善惡。本命年或流年沖煞者，安奉太歲、點元辰長生斗燈，可消災解厄、護佑一歲平安順遂。",
    advice: "遇沖煞之年宜靜不宜躁，凡事謙退，常行孝道，太歲反作福星。"
  },
  {
    id: "guaiguai",
    title: "科技綠乖乖神 • 伺服器護法天神",
    badge: "機房長綠 • 永不宕機",
    desc: "台灣科技工程師獨特民俗崇拜神物。供奉於伺服器機櫃與電腦主機之上，唯認「椰子綠色包裝」，象徵機房運轉燈號常保綠燈，驅散 Bug 陰霾，護佑軟硬體百萬行程式碼安然無恙。",
    advice: "切莫偷吃祭壇乖乖！按時備份資料，保持代碼簡潔，乖乖自會守護神機。"
  }
];

const LORE_TRADITIONS = [
  {
    id: "bwa_rule",
    title: "擲筊聖意科儀古法",
    badge: "陰陽兩儀 • 天人感應",
    desc: "筊杯一正一反象徵太極陰陽調和，為「聖筊」，代表神明允諾大吉；兩平面向上為「笑筊」，代表神意未定或信眾已有定見無需再問；兩凸面向上為「陰筊」，代表神明不允，宜反躬自省。",
    advice: "稟報姓名、生辰、住址與事由務必清楚，心誠則靈。"
  },
  {
    id: "incense_rule",
    title: "敬香三獻禮與天公爐法度",
    badge: "一炷清香 • 通達九天",
    desc: "入廟必先朝外向天公爐行三鞠躬敬奉天公玉皇上帝，再入大殿拜主神。上香時以左手（清淨手）插香，三炷香象徵敬天、敬地、敬人。",
    advice: "香火裊裊，心隨香散，雜念全消。"
  },
  {
    id: "shoujing_lore",
    title: "道家行天宮正統收驚古法",
    badge: "魂魄歸位 • 淨香掃煞",
    desc: "人遇車禍、惡夢或大病，三魂七魄易生震盪遊離。透過淨香、帝鐘、金光神咒三度加持，驅散體外濁煞黑氣，令元神歸位、心平氣和。",
    advice: "收驚後宜靜養安歇，切忌驚躁。"
  },
  {
    id: "beads_lore",
    title: "108 顆菩提念珠斷除煩惱",
    badge: "數息明心 • 圓融大覺",
    desc: "108 顆念珠象徵斷除世間一百零八種無明煩惱（六根各具苦、樂、捨三受，涉過去現在未來三世）。每撥一顆誦一偈，定心寧神。",
    advice: "指尖輕撥，雜念頓消，日行一輪，功德自固。"
  }
];

window.openLoreModal = function() {
  const modal = document.getElementById("loreModal");
  if (!modal) return;
  modal.classList.add("open");
  switchLoreTab("chiam");
  if (window.templeAudio) window.templeAudio.playBell(440);
};

window.closeLoreModal = function() {
  const modal = document.getElementById("loreModal");
  if (modal) modal.classList.remove("open");
};

function switchLoreTab(tab) {
  currentLoreTab = tab;
  document.querySelectorAll(".lore-tab-btn").forEach(b => b.classList.remove("active"));
  if (tab === "chiam") document.getElementById("tabLoreChiam")?.classList.add("active");
  else if (tab === "deities") document.getElementById("tabLoreDeities")?.classList.add("active");
  else if (tab === "traditions") document.getElementById("tabLoreTraditions")?.classList.add("active");

  const detailView = document.getElementById("loreDetailView");
  const container = document.getElementById("loreContentContainer");
  if (detailView) detailView.style.display = "none";
  if (container) container.style.display = "grid";

  renderLoreList();
}

function renderLoreList(filterText = "") {
  const container = document.getElementById("loreContentContainer");
  if (!container) return;
  const kw = filterText.toLowerCase().trim();

  if (currentLoreTab === "chiam") {
    const list = (window.CHIAM_DATA || []).filter(p => {
      if (!kw) return true;
      return p.ganZhi.includes(kw) || p.guaTou.includes(kw) || p.fortune.includes(kw) || p.id.toString() === kw;
    });

    container.innerHTML = list.map(item => `
      <div class="lore-card" onclick="showChiamLoreDetail(${item.id})">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-weight: bold; color: #ffd700;">第 ${item.id} 籤 【${item.ganZhi}】</span>
          <span style="font-size: 0.72rem; color: #4ade80;">${item.fortune.split("•")[0]}</span>
        </div>
        <div style="font-size: 0.78rem; color: #fde047; margin-bottom: 4px;">📜 典故：${item.guaTou.split("/")[0]}</div>
        <div style="font-size: 0.72rem; color: #cbd5e1; line-height: 1.3;">${item.poem[0]}，${item.poem[1]}...</div>
      </div>
    `).join("");
  } else if (currentLoreTab === "deities") {
    const list = LORE_DEITIES.filter(d => !kw || d.title.includes(kw) || d.desc.includes(kw));
    container.innerHTML = list.map(item => `
      <div class="lore-card" onclick="showDeityLoreDetail('${item.id}')">
        <div style="font-weight: bold; color: #ffd700; margin-bottom: 4px;">${item.title}</div>
        <div style="font-size: 0.72rem; color: #fde047; margin-bottom: 4px;">${item.badge}</div>
        <div style="font-size: 0.72rem; color: #cbd5e1; line-height: 1.3;">${item.desc.substring(0, 48)}...</div>
      </div>
    `).join("");
  } else {
    const list = LORE_TRADITIONS.filter(t => !kw || t.title.includes(kw) || t.desc.includes(kw));
    container.innerHTML = list.map(item => `
      <div class="lore-card" onclick="showTraditionLoreDetail('${item.id}')">
        <div style="font-weight: bold; color: #ffd700; margin-bottom: 4px;">${item.title}</div>
        <div style="font-size: 0.72rem; color: #fde047; margin-bottom: 4px;">${item.badge}</div>
        <div style="font-size: 0.72rem; color: #cbd5e1; line-height: 1.3;">${item.desc.substring(0, 48)}...</div>
      </div>
    `).join("");
  }
}

function showChiamLoreDetail(id) {
  const p = (window.CHIAM_DATA || []).find(item => item.id === id);
  if (!p) return;

  const container = document.getElementById("loreContentContainer");
  const detail = document.getElementById("loreDetailView");
  if (container) container.style.display = "none";
  if (detail) detail.style.display = "block";

  document.getElementById("loreDetailTitle").innerText = `第 ${p.id} 籤 • 【${p.ganZhi}】`;
  document.getElementById("loreDetailFortune").innerText = p.fortune;
  document.getElementById("loreDetailGua").innerText = `📜 正統卦頭典故：${p.guaTou}`;
  document.getElementById("loreDetailPoem").innerHTML = p.poem.join("<br>");
  document.getElementById("loreDetailStory").innerHTML = `<b>【白話義理】</b>：${p.meaning}<br><br><b>【五分占斷】</b>：<br>• 事業：${p.details.career}<br>• 感情：${p.details.romance}<br>• 考運：${p.details.exam}<br>• 財運：${p.details.wealth}<br>• 健康：${p.details.health}`;
  document.getElementById("loreDetailAdvice").innerText = p.advice;
}

function showDeityLoreDetail(id) {
  const d = LORE_DEITIES.find(item => item.id === id);
  if (!d) return;

  const container = document.getElementById("loreContentContainer");
  const detail = document.getElementById("loreDetailView");
  if (container) container.style.display = "none";
  if (detail) detail.style.display = "block";

  document.getElementById("loreDetailTitle").innerText = d.title;
  document.getElementById("loreDetailFortune").innerText = d.badge;
  document.getElementById("loreDetailGua").innerText = `🏮 仙真聖號：${d.title}`;
  document.getElementById("loreDetailPoem").innerHTML = `【神尊法相聖蹟】`;
  document.getElementById("loreDetailStory").innerHTML = `<b>【聖德列傳】</b>：<br>${d.desc}`;
  document.getElementById("loreDetailAdvice").innerText = `神明開示：${d.advice}`;
}

function showTraditionLoreDetail(id) {
  const t = LORE_TRADITIONS.find(item => item.id === id);
  if (!t) return;

  const container = document.getElementById("loreContentContainer");
  const detail = document.getElementById("loreDetailView");
  if (container) container.style.display = "none";
  if (detail) detail.style.display = "block";

  document.getElementById("loreDetailTitle").innerText = t.title;
  document.getElementById("loreDetailFortune").innerText = t.badge;
  document.getElementById("loreDetailGua").innerText = `🏮 正統科儀：${t.title}`;
  document.getElementById("loreDetailPoem").innerHTML = `【道門科儀源流】`;
  document.getElementById("loreDetailStory").innerHTML = `<b>【儀軌詳解】</b>：<br>${t.desc}`;
  document.getElementById("loreDetailAdvice").innerText = `民俗叮嚀：${t.advice}`;
}

// ==========================================================================
// 3. 賽博御賜平安齋 • 祈福供品擺盤 (Feast Offering Logic)
// ==========================================================================
let currentFeastSlot = 0;
let currentFeastDishes = JSON.parse(localStorage.getItem("temple_feast_dishes") || '["fruit", "peach", "fagao", "redturtle", "guaiguai"]');

const FEAST_DISH_INFO = {
  fruit: { name: "五福果盤", icon: "🍎" },
  peach: { name: "長生仙桃", icon: "🍑" },
  fagao: { name: "富貴發糕", icon: "🍞" },
  redturtle: { name: "紅龜粿", icon: "🐢" },
  guaiguai: { name: "金牌乖乖", icon: "🟢" },
  milktea: { name: "特大珍奶", icon: "🧋" },
  chicken: { name: "香脆雞排", icon: "🍗" },
  flowers: { name: "百合素花", icon: "🌸" }
};

window.openFeastModal = function() {
  const modal = document.getElementById("feastModal");
  if (!modal) return;
  modal.classList.add("open");
  updateFeastSlotsUI();
  if (window.templeAudio) window.templeAudio.playBell(528);
};

window.closeFeastModal = function() {
  const modal = document.getElementById("feastModal");
  if (modal) modal.classList.remove("open");
};

function updateFeastSlotsUI() {
  for (let i = 0; i < 5; i++) {
    const dishKey = currentFeastDishes[i] || "fruit";
    const info = FEAST_DISH_INFO[dishKey] || FEAST_DISH_INFO.fruit;
    const iconEl = document.getElementById(`feastSlotIcon${i}`);
    const nameEl = document.getElementById(`feastSlotName${i}`);
    const slotEl = document.getElementById(`feastSlot${i}`);
    if (iconEl) iconEl.innerText = info.icon;
    if (nameEl) nameEl.innerText = info.name;
    if (slotEl) slotEl.classList.toggle("active", i === currentFeastSlot);
  }
}

function selectFeastDish(dishKey) {
  currentFeastDishes[currentFeastSlot] = dishKey;
  localStorage.setItem("temple_feast_dishes", JSON.stringify(currentFeastDishes));
  updateFeastSlotsUI();
  if (window.temple3d) {
    window.temple3d.updateAltarFeastOfferings(currentFeastDishes);
  }
  if (window.templeAudio) window.templeAudio.playWoodblock();
}

function presentFeastOffering() {
  if (window.temple3d) {
    window.temple3d.celebrateFeastOffering();
  }
  addMerit(128);
  const petitioner = state.avatarConfig.title || "善信";
  const msg = `🍱 善信【${petitioner}】在神案呈獻御賜五品大筵席，神威廣大，功德 +128！全天福星高照！`;
  if (window.liveTempleWall) window.liveTempleWall.addDanmaku(msg);
  if (typeof showFloatingDanmaku !== "undefined") showFloatingDanmaku(msg, "#fde047");
  if (window.setDockStatus) window.setDockStatus(msg);
  window.closeFeastModal();
  alert(`🙏 恭行三獻禮呈獻大典圓滿！神尊慈悲受納，賜福長生、事業興旺！功德 +128！`);
}

function resetFeastDishes() {
  currentFeastDishes = ["fruit", "peach", "fagao", "redturtle", "guaiguai"];
  localStorage.setItem("temple_feast_dishes", JSON.stringify(currentFeastDishes));
  updateFeastSlotsUI();
  if (window.temple3d) {
    window.temple3d.updateAltarFeastOfferings(currentFeastDishes);
  }
}

// ==========================================================================
// 4. 線上抄經閣 • 虔心描紅抄經 (Calligraphy Logic)
// ==========================================================================
let isSutraDrawing = false;
let sutraLastX = 0, sutraLastY = 0;
let sutraBrushColor = "#18181b";
let sutraBrushSize = 6;

const SUTRA_TEXTS = {
  heart: [
    "觀自在菩薩。行深般若波羅蜜多時。照見五蘊皆空。度一切苦厄。",
    "舍利子。色不異空。空不異色。色即是空。空即是色。",
    "受想行識。亦復如是。舍利子。是諸法空相。不生不滅。",
    "不垢不淨。不增不減。是故空中無色。無受想行識。"
  ],
  qingjing: [
    "老君曰。大道無形。生育天地。大道無情。運行日月。",
    "大道無名。長養萬物。吾不知其名。強名曰道。",
    "夫道者。有清有濁。有動有靜。天清地濁。天動地靜。",
    "男清女濁。男動女靜。降本流末。而生萬物。"
  ],
  yinzhi: [
    "帝君曰。吾一十七世為士大夫身。未嘗虐民酷吏。",
    "救人之難。濟人之急。閔人之孤。容人之過。",
    "廣行陰騭。上格蒼穹。人能如我存心。天必賜汝以福。",
    "諸惡莫作。眾善奉行。永錫難老。萬福駢臻。"
  ]
};

window.openCopySutraModal = function() {
  const modal = document.getElementById("copySutraModal");
  if (!modal) return;
  modal.classList.add("open");
  const sel = document.getElementById("sutraSelect");
  drawSutraCanvas(sel ? sel.value : "heart");
  if (window.templeAudio) window.templeAudio.playBell(396);
};

window.closeCopySutraModal = function() {
  const modal = document.getElementById("copySutraModal");
  if (modal) modal.classList.remove("open");
};

function drawSutraCanvas(key = "heart") {
  const canvas = document.getElementById("sutraCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;

  // 宣紙底色
  ctx.fillStyle = "#fefae0";
  ctx.fillRect(0, 0, W, H);

  // 紅色九宮格界線
  ctx.strokeStyle = "rgba(220, 38, 38, 0.18)";
  ctx.lineWidth = 1;
  const colW = (W - 40) / 4;
  for (let c = 0; c <= 4; c++) {
    ctx.beginPath();
    ctx.moveTo(20 + c * colW, 20);
    ctx.lineTo(20 + c * colW, H - 20);
    ctx.stroke();
  }

  // 淺灰楷書描紅水墨字
  const lines = SUTRA_TEXTS[key] || SUTRA_TEXTS.heart;
  ctx.font = "26px 'Songti TC', 'Noto Serif TC', serif";
  ctx.fillStyle = "rgba(120, 113, 108, 0.28)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  lines.forEach((line, lineIdx) => {
    const chars = line.split("");
    const charSpacing = (H - 50) / Math.max(1, chars.length);
    const colX = W - 35 - lineIdx * colW;

    chars.forEach((ch, cIdx) => {
      ctx.fillText(ch, colX, 35 + cIdx * charSpacing);
    });
  });
}

function initSutraCanvasEvents() {
  const canvas = document.getElementById("sutraCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  function startDraw(e) {
    e.preventDefault();
    isSutraDrawing = true;
    const pos = getPos(e);
    sutraLastX = pos.x;
    sutraLastY = pos.y;
    if (window.templeAudio) window.templeAudio.playCalligraphyInkSound();
  }

  function drawMove(e) {
    if (!isSutraDrawing) return;
    e.preventDefault();
    const pos = getPos(e);

    ctx.save();
    ctx.strokeStyle = sutraBrushColor;
    ctx.fillStyle = sutraBrushColor;
    ctx.lineWidth = sutraBrushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(sutraLastX, sutraLastY);
    ctx.quadraticCurveTo(sutraLastX, sutraLastY, (sutraLastX + pos.x) / 2, (sutraLastY + pos.y) / 2);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, sutraBrushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    sutraLastX = pos.x;
    sutraLastY = pos.y;
  }

  function stopDraw(e) {
    isSutraDrawing = false;
  }

  canvas.addEventListener("mousedown", startDraw);
  canvas.addEventListener("mousemove", drawMove);
  canvas.addEventListener("mouseup", stopDraw);
  canvas.addEventListener("mouseleave", stopDraw);

  canvas.addEventListener("touchstart", startDraw, { passive: false });
  canvas.addEventListener("touchmove", drawMove, { passive: false });
  canvas.addEventListener("touchend", stopDraw);
}

function completeSutraCopying() {
  const canvas = document.getElementById("sutraCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const targetInput = document.getElementById("sutraDedicationTarget");
  const target = (targetInput ? targetInput.value.trim() : "") || "天下蒼生";

  // 在右下角加蓋正統硃砂雙印「心安即福」
  ctx.save();
  ctx.strokeStyle = "#bb1b1b";
  ctx.lineWidth = 3;
  ctx.strokeRect(30, canvas.height - 85, 60, 60);
  ctx.fillStyle = "#bb1b1b";
  ctx.font = "bold 15px 'Songti TC', serif";
  ctx.textAlign = "center";
  ctx.fillText("心安", 60, canvas.height - 62);
  ctx.fillText("即福", 60, canvas.height - 40);

  ctx.font = "14px 'Songti TC', serif";
  ctx.fillStyle = "#444";
  ctx.textAlign = "left";
  ctx.fillText(`迴向信眾：【 ${target} 】 虔心手抄`, 105, canvas.height - 48);
  ctx.restore();

  addMerit(150);
  if (window.templeAudio) window.templeAudio.playBell(108);

  const msg = `🪷 抄經圓滿！將無量功德迴向給【${target}】！消除業障，功德 +150！`;
  if (window.liveTempleWall) window.liveTempleWall.addDanmaku(msg);
  if (typeof showFloatingDanmaku !== "undefined") showFloatingDanmaku(msg, "#6ee7b7");
  if (window.setDockStatus) window.setDockStatus(msg);
  alert(`🪷 虔心抄經功德圓滿！朱印已鈐蓋於墨寶之上，功德 +150，願力廣被【${target}】！`);
}

function downloadSutraPNG() {
  const canvas = document.getElementById("sutraCanvas");
  if (!canvas) return;
  const link = document.createElement("a");
  link.download = `賽博神殿_虔心手抄經文墨寶.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}


// ==========================================
// PWA：離線快取與安裝到主畫面
// ==========================================
// Service Worker 只在 https 或 localhost 能註冊；直接開 index.html（file://）時略過
if ("serviceWorker" in navigator && window.isSecureContext && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(err => console.warn("Service Worker 註冊失敗：", err));
  });
}

let deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const btn = document.getElementById("btnInstallApp");
  if (btn) btn.hidden = false;
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  const btn = document.getElementById("btnInstallApp");
  if (btn) btn.hidden = true;
  if (window.setDockStatus) window.setDockStatus("📲 神殿已安裝到主畫面，離線也能參拜！");
});

document.getElementById("btnInstallApp")?.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  document.getElementById("btnInstallApp").hidden = true;
});
