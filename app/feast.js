// 供品在背包與桌面間移轉；庫存、桌面、敬獻狀態一起保存在 inventory。
let currentFeastSlot = 0;
let currentFeastDishes = window.templeInventory.data.offering.slots.slice();
const FEAST_DEFAULT_DISHES = ["fruit", "peach", "fagao", "redturtle", "guaiguai"];
const FEAST_DISH_INFO = Object.fromEntries(Object.entries(BAG_ITEMS).filter(([id]) => window.templeInventory.isOffering(id)));
let feastSceneSignature = "";

function feastNotice(message) {
  const el = document.getElementById("feastMessage"); if (el) el.textContent = message;
  window.setDockStatus?.(message);
}
function feastResult(result, success) {
  feastNotice(result.ok ? success : ({ location: "請先走到大殿供品桌旁，再擺供、敬獻或收供。", stock: "背包供品不足，請先到供品鋪選購；桌面與庫存沒有變動。",
    presented: "這桌已敬獻，請先按「全部收供」再布置下一桌。", same: "這個供盤已擺放同款供品。", empty: "供盤是空的，請先擺上供品。", full: "背包數量已滿，暫時無法收回供品。" }[result.reason] || "無法進行這項操作。"));
  updateFeastSlotsUI(); return result.ok;
}

function bindFeastEvents() {
  document.getElementById("btnOpenFeast")?.addEventListener("click", () => window.openFeastModal());
  document.getElementById("feastModalClose")?.addEventListener("click", () => window.closeFeastModal());
  document.querySelectorAll(".feast-slot").forEach(slot => slot.addEventListener("click", () => {
    currentFeastSlot = Number(slot.dataset.slot); updateFeastSlotsUI();
  }));
  document.querySelectorAll(".feast-dish-picker").forEach(picker => picker.addEventListener("click", () => selectFeastDish(picker.dataset.dish)));
  document.getElementById("btnFeastPresent")?.addEventListener("click", presentFeastOffering);
  document.getElementById("btnFeastReset")?.addEventListener("click", resetFeastDishes);
  document.getElementById("btnFeastCollect")?.addEventListener("click", () => {
    if (feastResult(window.templeInventory.collectOfferings(), "已收供，桌上物品全部放回背包。")) window.closeFeastModal();
  });
  document.getElementById("btnFeastRemove")?.addEventListener("click", () => feastResult(window.templeInventory.collectOfferings(currentFeastSlot), "已將這一盤收回背包。"));
  document.getElementById("feastTableStyle")?.addEventListener("change", e => {
    if (window.templeInventory.setTableStyle(e.target.value)) feastNotice(`已換成${window.templeInventory.tableStyles[e.target.value]}。`);
  });
  document.getElementById("btnFeastShop")?.addEventListener("click", () => { window.closeFeastModal(); window.templeBag?.open("shop"); });
  document.getElementById("btnFeastGo")?.addEventListener("click", () => { window.closeFeastModal(); window.templeVisit?.go("offerings"); });
  document.getElementById("btnFeastCarryTray")?.addEventListener("click", () => {
    if (window.templeInventory.setCarryMode("tray")) { window.closeFeastModal(); window.setDockStatus?.("🍱 已雙手端盤，可走到供桌旁擺供。再次開啟供桌選擇供品。"); }
    else feastNotice("背包中沒有可端出的供品，請先選購或收供。");
  });
  window.addEventListener("temple:inventory", updateFeastSlotsUI);
  window.addEventListener("temple:offering-motion", e => window.temple3d?.avatar?.playRitualMotion?.(e.detail.name));
  window.addEventListener("storage", e => { if (!e.key || e.key === "temple_inventory") updateFeastSlotsUI(); });
  updateFeastSlotsUI();
}

window.openFeastModal = function() {
  const modal = document.getElementById("feastModal"); if (!modal) return;
  modal.classList.add("open");
  document.getElementById("feastMessage").textContent = "";
  updateFeastSlotsUI(); window.templeAudio?.playBell(528);
};
window.closeFeastModal = function() { document.getElementById("feastModal")?.classList.remove("open"); };

function updateFeastSlotsUI() {
  const bag = window.templeInventory, d = bag.data, table = d.offering, near = bag.nearOfferingTable();
  window.temple3d?.avatar?.setRitualCarry?.(d.carryMode);
  const carry = document.getElementById("btnBagCarry"); if (carry) carry.textContent = d.carryMode ? "🧺 放下提籃／供盤" : "🧺 提起供品籃";
  const sets = document.getElementById("feastOfferingSets"); if (sets && window.templeBag?.renderOfferingSets) { sets.replaceChildren(); window.templeBag.renderOfferingSets(sets, "table"); }
  currentFeastDishes = table.slots.slice();
  document.querySelectorAll(".feast-dish-picker").forEach(picker => {
    const id = picker.dataset.dish, stock = picker.querySelector(".feast-stock");
    if (stock) stock.textContent = `背包 ${d.items[id]} 份`;
    picker.disabled = !near || table.presented || !d.items[id];
  });
  table.slots.forEach((id, i) => {
    const info = FEAST_DISH_INFO[id], slot = document.getElementById(`feastSlot${i}`);
    const icon = document.getElementById(`feastSlotIcon${i}`), name = document.getElementById(`feastSlotName${i}`);
    if (icon) { icon.textContent = info?.icon || "＋"; icon.dataset.item = id || ""; }
    if (name) name.textContent = info?.name || "空供盤";
    if (slot) { slot.classList.toggle("active", i === currentFeastSlot); slot.setAttribute("aria-pressed", String(i === currentFeastSlot)); slot.setAttribute("aria-label", `供盤 ${i + 1}：${info?.name || "空供盤"}`); }
  });
  const occupied = table.slots.filter(Boolean).length;
  const status = document.getElementById("feastTableStatus");
  if (status) status.textContent = !near ? "目前可查看供桌。請按「前往供桌」到現場操作。" : table.presented ? `已敬獻 · ${occupied} 盤供品留在桌上，拜完可全部收回。` : `已擺 ${occupied}／5 盤 · 選一個供盤，再從背包選供品擺上。`;
  const style = document.getElementById("feastTableStyle"); if (style) style.value = table.style;
  const tray = document.getElementById("feastTray"); if (tray) tray.dataset.style = table.style;
  const go = document.getElementById("btnFeastGo"); if (go) go.hidden = near;
  const present = document.getElementById("btnFeastPresent");
  if (present) { present.disabled = !near || !occupied || table.presented; present.textContent = table.presented ? "✓ 本桌已敬獻" : d.offeringRewardDay === bag.day() ? "🙏 敬獻（今日功德已領）" : "🙏 敬獻供品 · 今日首次 +128 功德"; }
  const collect = document.getElementById("btnFeastCollect"); if (collect) collect.disabled = !near || !occupied;
  const remove = document.getElementById("btnFeastRemove"); if (remove) remove.disabled = !near || table.presented || !table.slots[currentFeastSlot];
  const reset = document.getElementById("btnFeastReset"); if (reset) reset.disabled = !near || table.presented;
  const signature = JSON.stringify([table.style, table.slots]);
  if (window.temple3d && signature !== feastSceneSignature) {
    window.temple3d.updateOfferingTableStyle?.(table.style);
    window.temple3d.updateAltarFeastOfferings?.(table.slots);
    feastSceneSignature = signature;
  }
}

function selectFeastDish(id) {
  if (feastResult(window.templeInventory.placeOffering(currentFeastSlot, id), `已將${FEAST_DISH_INFO[id]?.name || "供品"}擺上第 ${currentFeastSlot + 1} 盤；換下的供品已放回背包。`)) window.templeAudio?.playWoodblock();
}
function resetFeastDishes() {
  feastResult(window.templeInventory.placeOfferingSet(FEAST_DEFAULT_DISHES), "已從背包擺上五品供品，原桌上的物品已放回背包。庫存不足可到供品鋪補齊。");
}
function presentFeastOffering() {
  const result = window.templeInventory.presentOfferings();
  if (!result.ok) { feastResult(result, ""); return; }
  window.temple3d?.celebrateFeastOffering?.();
  window.temple3d?.avatar?.playRitualMotion?.("presentOffering");
  if (result.reward) addMerit(result.reward);
  window.emitRitual?.("feast");
  feastResult(result, result.reward ? "🙏 敬獻完成，今日首次獻供 +128 功德。供品保留在桌上，拜完可收供。" : "🙏 敬獻完成。今日獻供功德已領取，供品保留在桌上，拜完可收供。");
  window.closeFeastModal();
}
