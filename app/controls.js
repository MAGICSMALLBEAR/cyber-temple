// app/controls.js - 介面與操控：視角、神尊、分身動作、時辰天候、快捷鍵、換裝、頂部列面板、收納式 HUD

// 事件綁定：由 core.js 的 bindEvents() 依原本順序呼叫
function bindCameraAndAvatarControls() {
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
    window.emitRitual?.("bow", { action: "kneel" });
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

}

function bindAtmosphereControls() {
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

  // 天氣按鈕由 app/weather.js 綁定（依時辰自動或固定）

}

function bindHudPanelEvents() {
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

}

function bindKeyboardAndAvatarEvents() {
  // 鍵盤快捷鍵
  window.addEventListener("keydown", (e) => {
    if (window.templeReading?.blocksSceneKeys(e, true)) return;
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

}

function bindSoundToggles() {
  // 禪音與靜音開關
  document.getElementById("btnToggleBGM").addEventListener("click", (e) => {
    const isPlaying = window.templeAudio.toggleAmbientBGM();
    e.currentTarget.innerText = isPlaying ? "🎵 禪音開" : "🎵 禪音";
    e.currentTarget.classList.toggle("active", isPlaying);
  });

  document.getElementById("btnToggleMute").addEventListener("click", (e) => {
    window.templeAudio.setMuted(!window.templeAudio.isMuted);
    e.currentTarget.innerText = window.templeAudio.isMuted ? "🔇 靜音" : "🔊 音效";
    e.currentTarget.classList.toggle("muted", window.templeAudio.isMuted);
    const menuBtn = document.getElementById("btnSoundMenu");
    if (menuBtn) menuBtn.textContent = window.templeAudio.isMuted ? "🔇 靜音中" : "🔊 聲音";
  });

  // 三軌音量滑桿
  document.querySelectorAll("#soundMenuPanel input[data-track]").forEach(slider => {
    const track = slider.dataset.track;
    const out = document.querySelector(`#soundMenuPanel output[data-track-value="${track}"]`);
    const show = () => { if (out) out.textContent = `${slider.value}%`; };
    slider.value = Math.round(window.templeAudio.volumes[track] * 100);
    show();
    slider.addEventListener("input", () => {
      window.templeAudio.setVolume(track, slider.value / 100);
      show();
    });
  });

}

// ==========================================
// 新版 UI 外殼 (v10.1.0)：收納式介面整合
// ==========================================
// 頂部列在較窄的螢幕會換行變高：視角按鈕與彈幕層跟著往下移，避免互相遮住
function layoutBelowHeader() {
  const status = document.querySelector("#templeHeader .header-status");
  if (!status) return;
  const bottom = Math.round(status.getBoundingClientRect().bottom);
  const camNav = document.getElementById("cameraNavContainer");
  if (camNav) {
    camNav.style.top = "";
    const navTop = Math.round(camNav.getBoundingClientRect().top);
    if (navTop < bottom + 6) camNav.style.top = `${bottom + 6}px`;
  }
  const danmaku = document.getElementById("danmakuContainer");
  if (danmaku) {
    const below = Math.max(bottom, camNav ? Math.round(camNav.getBoundingClientRect().bottom) : 0);
    danmaku.style.top = `${Math.max(70, below + 8)}px`;
  }
}

function bindModernUIShell() {
  layoutBelowHeader();
  window.addEventListener("resize", layoutBelowHeader);
  // 字型載入完成後按鈕寬度會變，再排一次
  document.fonts?.ready.then(layoutBelowHeader);
  const $ = (id) => document.getElementById(id);
  const closeAllDropdowns = (except) => {
    ["deityDropdownMenu", "cameraNavDropdown", "soundMenuPanel"].forEach(id => {
      if (id !== except) $(id)?.classList.remove("open");
    });
    if (except !== "soundMenuPanel") $("btnSoundMenu")?.setAttribute("aria-expanded", "false");
  };

  // --- 聲音面板：固定定位，打開時對齊到按鈕下方並避免超出螢幕 ---
  const soundBtn = $("btnSoundMenu");
  const soundPanel = $("soundMenuPanel");
  if (soundBtn && soundPanel) {
    soundBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllDropdowns("soundMenuPanel");
      const open = soundPanel.classList.toggle("open");
      soundBtn.setAttribute("aria-expanded", String(open));
      if (open) {
        const r = soundBtn.getBoundingClientRect();
        const w = soundPanel.offsetWidth;
        soundPanel.style.top = `${Math.round(r.bottom + 6)}px`;
        soundPanel.style.left = `${Math.round(Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)))}px`;
      }
    });
  }

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
    if (!e.target.closest(".deity-dropdown-container") && !e.target.closest(".camera-nav-container") && !e.target.closest("#soundMenuPanel")) {
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
    if (e.key === "Escape") {
      closeAllDropdowns();
      document.querySelectorAll(".modal-overlay.open").forEach(m => m.classList.remove("open"));
      if (document.body.classList.contains("hud-hidden")) document.body.classList.remove("hud-hidden");
      return;
    }
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
    if (e.code === "Tab" && document.querySelector(".modal-overlay.open")) return;
    if (e.code !== "Tab" && window.templeReading?.blocksSceneKeys(e)) return;
    if (e.code === "KeyH") {
      window.toggleHUD();
    } else if (e.code === "Tab") {
      e.preventDefault();
      window.togglePavilion();
    } else if (e.key === "?") {
      window.toggleHelp();
    }
  });

  syncCameraLabel();
}
