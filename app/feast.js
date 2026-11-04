// app/feast.js - 御賜平安齋供品擺盤

// 事件綁定：由 core.js 的 bindEvents() 依原本順序呼叫
function bindFeastEvents() {
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
  document.querySelectorAll(".feast-dish-picker").forEach(picker => {
    let stock = picker.querySelector(".feast-stock");
    if (!stock) { stock = document.createElement("small"); stock.className = "feast-stock"; picker.append(stock); }
    stock.textContent = `持有 ${window.templeInventory?.data.items[picker.dataset.dish] || 0} 份`;
  });
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
  const needs = {};
  currentFeastDishes.forEach(id => { needs[id] = (needs[id] || 0) + 1; });
  if (window.templeInventory && !window.templeInventory.consume(needs)) return;
  if (window.temple3d) {
    window.temple3d.celebrateFeastOffering();
  }
  window.emitRitual?.("feast");
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
