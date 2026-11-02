// app/ema.js - 祈願木牌閣

// 事件綁定：由 core.js 的 bindEvents() 依原本順序呼叫
function bindEmaEvents() {
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
