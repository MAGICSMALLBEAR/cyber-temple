// app/rituals.js - 大殿參拜：點香、擲筊、求籤、木魚（含掛機）、投幣化寶、鐘鼓遶境、點燈、祈願彈幕

// 事件綁定：由 core.js 的 bindEvents() 依原本順序呼叫
function bindAltarRitualEvents() {
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
    // 正統求籤：擲筊請示 → 搖籤 → 擲筊確認（儀式小卡內也可改用快速求籤）
    if (window.chiamRitual) window.chiamRitual.start();
    else performChiamShake();
  });

  // 3D 敲木魚
  document.getElementById("btnKnockMuyu").addEventListener("click", () => {
    performMuyuStrike(true);
  });

}

function bindCourtyardOfferingEvents() {
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

}

function bindParadeAndTowerEvents() {
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

}

function bindAutoMuyuEvents() {
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

}

function bindLanternAndDanmakuEvents() {
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

// 執行 3D 擲筊
// onResult（可選）：擲筊結束後回報 "holy"（聖筊）、"laugh"（笑筊）、"yin"（陰筊），供求籤儀式使用
function performBwaToss(onResult) {
  if (!temple3d || temple3d.isBwaTossing) return false;
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
    if (onResult) onResult(outcome1 !== outcome2 ? "holy" : (outcome1 === 0 && outcome2 === 0 ? "laugh" : "yin"));
  });
  return true;
}

// 執行 3D 搖籤筒
// onDrawn（可選）：抽到籤後交給求籤儀式擲筊確認；沒有時照舊直接展開籤詩（快速求籤）
function performChiamShake(onDrawn) {
  if (!temple3d || temple3d.isChiamShaking) return false;
  setDockStatus("🎋 籤筒晃動中... 諸神感應賜籤...");
  window.templeAudio.playShakeChiam();

  setTimeout(() => window.templeAudio.playShakeChiam(), 400);

  temple3d.shakeChiamBucket(() => {
    window.templeAudio.playBell(620);
    const randomIndex = Math.floor(Math.random() * window.CHIAM_DATA.length);
    const chosen = window.CHIAM_DATA[randomIndex];
    state.selectedChiam = chosen;
    window.emitRitual?.("chiam");
    temple3d.spawn3DFloatingText(`第${chosen.id}籤 • ${chosen.ganZhi}`, new THREE.Vector3(1.4, 2.2, -0.3));

    if (onDrawn) {
      onDrawn(chosen);
      return;
    }
    recordChiamToHistory(chosen);
    setDockStatus(`🎋 抽得第 ${chosen.id} 籤【${chosen.ganZhi}】${chosen.fortune}！正在展開靈籤捲軸...`);
    setTimeout(() => {
      openChiamModal(chosen);
    }, 700);
  });
  return true;
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
