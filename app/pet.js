// app/pet.js - 萌寵護法神獸

// 事件綁定：由 core.js 的 bindEvents() 依原本順序呼叫
function bindPetEvents() {
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
