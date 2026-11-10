// app/core.js - 主控中樞：神尊與狀態設定、初始化、bindEvents 總表、功德與狀態列


// 諸神配置
const DEITIES = {
  mazu: { id: "mazu", name: "天上聖母 媽祖", title: "護國庇民 • 萬事安泰", blessing: "四海清平，慈悲普照，信眾闔家吉祥安康。" },
  wenchang: { id: "wenchang", name: "文昌梓潼帝君", title: "魁星點斗 • 金榜題名", blessing: "文思泉湧，心性專注，考運與事業大道亨通。" },
  caishen: { id: "caishen", name: "五路武財神 趙公明", title: "八方聚寶 • 財源滾滾", blessing: "正偏財運利祿亨通，誠信經商，生生不息。" },
  yuelao: { id: "yuelao", name: "月下老人 尊神", title: "千里姻緣 • 喜結良緣", blessing: "紅線暗引，天定良緣，有情人終成眷屬。" },
  guanyin: { id: "guanyin", name: "觀世音菩薩", title: "大慈大悲 • 聞聲救苦", blessing: "楊枝甘露灑淨，心安無懼，眾苦離散，身心清涼。" },
  guangong: { id: "guangong", name: "關聖帝君 恩主公", title: "忠義仁勇 • 伏魔護正", blessing: "正氣凜然，信義為本，事業守正必得貴人護持。" },
  tudigong: { id: "tudigong", name: "福德正神 土地公", title: "守護鄉里 • 福德生財", blessing: "安家守土，五穀豐登，生意興隆，出入平安。" },
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

  // 3.3 畫質設定選單（場景本身在 Temple3DScene 建立時已套用畫質）與減少動態
  if (window.templeQuality) window.templeQuality.init();
  if (window.templeMotion) window.templeMotion.init();
  if (window.templePower) window.templePower.init();

  // 3.4 功德存檔匯出／匯入
  if (window.templeSave) window.templeSave.init();

  // 3.43 換造型面板與表情動作面板
  if (window.avatarStudio) window.avatarStudio.init();
  if (window.templeChat) window.templeChat.init();

  // 3.44 正統求籤儀式卡與完整參拜指引
  if (window.chiamRitual) window.chiamRitual.init();
  if (window.pilgrimage) window.pilgrimage.init();
  if (window.hallActivities) window.hallActivities.init();
  if (window.templeInventory) window.templeInventory.init();
  if (window.templeBag) window.templeBag.init();
  if (window.nightMarket) window.nightMarket.init();
  if (window.templeVisit) window.templeVisit.init();
  if (window.templeJournal) window.templeJournal.init();
  if (window.templeWeather) window.templeWeather.init();
  if (window.templeReading) window.templeReading.init();

  // 3.45 新手引導（是否為新玩家已在每日簽到發功德之前判定）
  if (window.templeOnboarding) window.templeOnboarding.init();

  // 3.5 每日修行（自動簽到需要 addMerit 與通知條，放在香火牆之後）
  if (window.dailyPractice) {
    window.dailyPractice.init({ getDeity: () => state.currentDeity });
  }
  if (window.templeAchievements) window.templeAchievements.init();

  // 4. 更新功德池與 AI 標籤
  updateMeritDisplay();
  updateAIEngineBadge();

  // 5. 綁定事件
  bindEvents();

  // 6. 收起載入畫面（index.html 最前面的 templeLoader）
  if (window.templeLoader) window.templeLoader.done();

  // 7. 開場後才在背景載入 3D 模型（models/manifest.json）
  temple3d?.loadTempleModels?.();
});

function bindEvents() {
  bindCameraAndAvatarControls();
  bindAltarRitualEvents();
  bindAtmosphereControls();
  bindCourtyardOfferingEvents();
  bindSideHallEvents();
  bindAmuletOpenEvent();
  bindParadeAndTowerEvents();
  bindShoujingEvents();
  bindRelicShopEvents();
  bindPhotoEvents();
  bindTaiSuiEvents();
  bindRhythmEvents();
  bindPetEvents();
  bindSkyLanternEvents();
  bindZenEvents();
  bindBwaCompetitionEvents();
  bindLoreEvents();
  bindFeastEvents();
  bindSutraEvents();
  bindAmuletEvents();
  bindEmaEvents();
  bindPassportOpenEvents();
  bindHudPanelEvents();
  bindPassportEvents();
  bindAutoMuyuEvents();
  bindKeyboardAndAvatarEvents();
  bindLanternAndDanmakuEvents();
  bindChiamAndAIEvents();
  bindSoundToggles();

  // 新版 UI 外殼：下拉選單、萬寶閣、沉浸模式、操作秘笈
  bindModernUIShell();

  // 行動裝置：軟鍵盤彈起時彈窗不被遮住
  setupMobileExperience();

  // 多人分流房間與同行供桌事件
  bindMultiplayerRoomAndTableEvents();
}

// 行動端：軟鍵盤彈起時補彈窗底部空間並把輸入框捲到中間。只在觸控為主的裝置生效，電腦上不改版面
function setupMobileExperience() {
  const touchFirst = () => window.matchMedia?.("(pointer: coarse)").matches;
  const adjustForInput = (target) => {
    if (!touchFirst() || !target || !("closest" in target)) return;
    const modal = target.closest(".settings-modal, .modal-content, .pavilion-modal, .journal-modal");
    if (!modal) return;
    modal.style.paddingBottom = "280px";
    setTimeout(() => {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
  };

  const resetModalPadding = (target) => {
    if (!target || !("closest" in target)) return;
    const modal = target.closest(".settings-modal, .modal-content, .pavilion-modal, .journal-modal");
    if (!modal) return;
    setTimeout(() => {
      if (!modal.contains(document.activeElement)) {
        modal.style.paddingBottom = "";
      }
    }, 150);
  };

  window.addEventListener("focusin", (e) => {
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) {
      adjustForInput(t);
    }
  });

  window.addEventListener("focusout", (e) => {
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) {
      resetModalPadding(t);
    }
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", () => {
      if (!touchFirst()) return;
      const openModal = document.querySelector(".modal-overlay.open :is(.settings-modal, .modal-content, .pavilion-modal, .journal-modal)");
      if (!openModal) return;
      const keyboardH = window.innerHeight - window.visualViewport.height;
      if (keyboardH > 80) {
        openModal.style.paddingBottom = `${keyboardH + 24}px`;
        if (document.activeElement && openModal.contains(document.activeElement)) {
          document.activeElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } else if (!document.activeElement || !openModal.contains(document.activeElement)) {
        openModal.style.paddingBottom = "";
      }
    });
  }

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

// 多人房間分流與同行供桌事件處理
function bindMultiplayerRoomAndTableEvents() {
  const ROOM_NAMES = {
    main: "🌟 天樞殿 (主線)",
    east: "🌅 玉衡殿 (東翼)",
    west: "🌇 開陽殿 (西翼)",
    zen: "📿 天璇殿 (清修)"
  };

  const updateRoomUI = () => {
    const cur = normalizePeerRoom(localStorage.getItem("temple_room"));
    const label = ROOM_NAMES[cur] || `🔒 密室 (${cur})`;
    // 頂部列已滿（多一顆按鈕在 1280 寬會換行蓋到其他按鈕），目前房間顯示在萬寶閣卡片與分流視窗
    const topLabel = document.getElementById("roomCardName");
    if (topLabel) topLabel.textContent = PEER_ROOM_NAMES[cur] || "密室";
    const statusText = document.getElementById("roomCurrentStatus");
    if (statusText) statusText.textContent = `目前所在分流：${label}`;
    document.querySelectorAll(".room-pick-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.room === cur);
    });
  };

  const openRoomModal = () => {
    updateRoomUI();
    document.getElementById("roomModal")?.classList.add("open");
  };

  document.getElementById("btnOpenRoomPavilion")?.addEventListener("click", () => {
    document.getElementById("pavilionModal")?.classList.remove("open");
    openRoomModal();
  });
  document.getElementById("roomClose")?.addEventListener("click", () => {
    document.getElementById("roomModal")?.classList.remove("open");
  });

  document.querySelectorAll(".room-pick-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetRoom = btn.dataset.room;
      window.temple3d?.avatar?.switchRoom?.(targetRoom);
      updateRoomUI();
      document.getElementById("roomModal")?.classList.remove("open");
    });
  });

  document.getElementById("btnJoinCustomRoom")?.addEventListener("click", () => {
    const custom = document.getElementById("customRoomInput")?.value.trim();
    if (custom) {
      window.temple3d?.avatar?.switchRoom?.(custom);
      updateRoomUI();
      document.getElementById("roomModal")?.classList.remove("open");
    }
  });

  window.addEventListener("temple:roomchange", updateRoomUI);
  updateRoomUI();

  // 同行供桌彈窗：只顯示對方的角色稱呼與桌上供品。隨喜讚嘆每位同行每次入殿只算一次功德
  const praisedPeers = new Set();
  let praiseTarget = null;
  window.openPeerTableModal = function(slotIndex) {
    const slot = window.temple3d?.peerTableSlots?.[slotIndex];
    if (!slot) return;
    const peerEntry = slot.occupiedBy ? window.temple3d?.peerTables?.get(slot.occupiedBy) : null;
    praiseTarget = peerEntry ? slot.occupiedBy : null;
    const praiseBtn = document.getElementById("btnPeerPraise");
    if (praiseBtn) {
      praiseBtn.disabled = !praiseTarget || praisedPeers.has(praiseTarget);
      praiseBtn.textContent = praiseTarget && praisedPeers.has(praiseTarget) ? "🙏 已隨喜讚嘆" : "🙏 隨喜讚嘆 (+6 功德)";
    }
    const nameEl = document.getElementById("peerTableName");
    const wishEl = document.getElementById("peerTableWish");
    const dishesList = document.getElementById("peerTableDishesList");
    if (!peerEntry) {
      nameEl.textContent = `🏮 ${slot.label} • 虛位以待`;
      wishEl.textContent = "此供桌目前尚無善信入座，等待同行信眾擺供祈願。";
      dishesList.innerHTML = `<span style="color:#888;">尚未敬奉供品</span>`;
    } else {
      const d = peerEntry.data || {};
      nameEl.textContent = `🏮 善信【${d.name || "同行善信"}】${d.presented ? "已敬獻" : "布置中"}`;
      wishEl.textContent = d.presented ? "供品已敬獻神前。" : "正在布置供桌。";
      const dishes = peerTableDishes(d).filter(Boolean);
      dishesList.innerHTML = dishes.map(id => `<span class="btn-custom-pill" style="pointer-events:none;">${BAG_ITEMS[id].icon} ${BAG_ITEMS[id].name}</span>`).join("") || `<span style="color:#888;">空盤</span>`;
    }
    document.getElementById("peerTableModal")?.classList.add("open");
  };

  document.getElementById("peerTableClose")?.addEventListener("click", () => {
    document.getElementById("peerTableModal")?.classList.remove("open");
  });

  document.getElementById("btnPeerPraise")?.addEventListener("click", () => {
    if (!praiseTarget || praisedPeers.has(praiseTarget)) return;
    praisedPeers.add(praiseTarget);
    addMerit(6);
    window.templeAudio?.playChiamGood?.();
    setDockStatus("🙏 隨喜讚嘆同行的供桌，功德 +6");
    document.getElementById("peerTableModal")?.classList.remove("open");
  });
}
