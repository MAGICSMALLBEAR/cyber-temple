// app/relic-shop.js - 法器結緣閣

// 事件綁定：由 core.js 的 bindEvents() 依原本順序呼叫
function bindRelicShopEvents() {
  // 法器結緣閣彈窗開關
  document.getElementById("btnOpenRelicShop").addEventListener("click", () => {
    window.openRelicShopModal();
  });

  document.getElementById("relicShopModalClose").addEventListener("click", () => {
    document.getElementById("relicShopModal").classList.remove("open");
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
