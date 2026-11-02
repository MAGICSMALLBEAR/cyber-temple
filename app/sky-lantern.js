// app/sky-lantern.js - 平溪祈安天燈與水燈

// 事件綁定：由 core.js 的 bindEvents() 依原本順序呼叫
function bindSkyLanternEvents() {
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

}

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
