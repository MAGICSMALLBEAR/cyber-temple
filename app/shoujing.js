// app/shoujing.js - 線上收驚科儀

// 事件綁定：由 core.js 的 bindEvents() 依原本順序呼叫
function bindShoujingEvents() {
  // 線上收驚科儀彈窗開關
  document.getElementById("btnOpenShoujing").addEventListener("click", () => {
    window.openShoujingModal();
  });

  document.getElementById("shoujingModalClose").addEventListener("click", () => {
    document.getElementById("shoujingModal").classList.remove("open");
  });

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
