// app/passport.js - 善信功德修持護照與榮譽狀

// 事件綁定：由 core.js 的 bindEvents() 依原本順序呼叫
function bindPassportOpenEvents() {
  // 善信修持錄 / 功德護照開關
  document.getElementById("btnOpenPassport").addEventListener("click", () => {
    openPassportModal();
  });

}

function bindPassportEvents() {
  // 護照分頁切換
  document.querySelectorAll(".passport-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".passport-tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderPassportTab(btn.dataset.ptab);
    });
  });

  // 匯出修持功德狀
  document.getElementById("btnExportCertificate").addEventListener("click", () => {
    exportSpiritualCertificate();
  });

}

// ==========================================
// 善信功德修持護照 (Merit Passport) 邏輯
// ==========================================

function recordChiamToHistory(chiam, question = "祈求安泰前程", aiText = "") {
  let hist = [];
  try {
    hist = JSON.parse(localStorage.getItem("temple_chiam_history") || "[]");
  } catch (e) {}

  hist.unshift({
    date: new Date().toLocaleDateString(),
    id: chiam.id,
    ganZhi: chiam.ganZhi,
    fortune: chiam.fortune,
    guaTou: chiam.guaTou,
    question,
    aiText,
    meaning: chiam.meaning,
    advice: chiam.advice
  });

  localStorage.setItem("temple_chiam_history", JSON.stringify(hist.slice(0, 40)));
}

function updateChiamHistoryAI(chiamId, userQuestion, aiText) {
  let hist = [];
  try {
    hist = JSON.parse(localStorage.getItem("temple_chiam_history") || "[]");
  } catch (e) {}
  const target = hist.find(h => h.id === chiamId);
  if (target) {
    target.question = userQuestion;
    target.aiText = aiText;
    localStorage.setItem("temple_chiam_history", JSON.stringify(hist));
  }
}

function openPassportModal() {
  window.templeSave?.renderStatus();
  const merit = state.meritCount;
  document.getElementById("statMeritTotal").innerText = merit.toLocaleString();
  document.getElementById("passportAvatarTitle").innerText = state.avatarConfig.title || "悠閒的信眾";

  // 念珠輪數
  const beadLoops = parseInt(localStorage.getItem("temple_beads_loops") || "0", 10);
  document.getElementById("statBeadLoops").innerText = beadLoops;

  // 最高連得聖筊
  const highestBwa = parseInt(localStorage.getItem("temple_highest_bwa") || "0", 10);
  document.getElementById("statHolyStreak").innerText = Math.max(highestBwa, state.consecutiveHolyBwa);

  // 點燈數
  let lanternHistLen = 0;
  try { lanternHistLen = JSON.parse(localStorage.getItem("temple_lantern_history") || "[]").length; } catch (e) {}
  const lanterns = Math.max(parseInt(localStorage.getItem("temple_lanterns_lit") || "0", 10), lanternHistLen);
  document.getElementById("statLanternsCount").innerText = lanterns;

  // 許願投幣數
  const coins = parseInt(localStorage.getItem("temple_wishing_coins") || "0", 10);
  document.getElementById("statCoinsCount").innerText = coins;

  // 焚燒金紙數
  const paper = parseInt(localStorage.getItem("temple_burned_paper") || "0", 10);
  document.getElementById("statPaperCount").innerText = paper;

  // 計算修行境界
  let rankIcon = "🌱";
  let rankTitle = "初入法門";
  let rankDesc = "萬丈高樓平地起，勤敲木魚以積累福德。";
  let progress = 10;

  if (merit >= 3000) {
    rankIcon = "👑";
    rankTitle = "賽博大德尊者";
    rankDesc = "功德無量，萬法通達，心明如鏡，受諸神聖加持護佑！";
    progress = 100;
  } else if (merit >= 1000) {
    rankIcon = "✨";
    rankTitle = "萬法圓通居士";
    rankDesc = "功德圓滿，常結善緣，神威顯赫，心想事成！";
    progress = Math.min(100, Math.round(((merit - 1000) / 2000) * 100));
  } else if (merit >= 500) {
    rankIcon = "🛡️";
    rankTitle = "金剛護法弟子";
    rankDesc = "道心堅定，邪魔不侵，諸神隨身庇佑百病不侵。";
    progress = Math.min(100, Math.round(((merit - 500) / 500) * 100));
  } else if (merit >= 200) {
    rankIcon = "🪷";
    rankTitle = "慈悲行者";
    rankDesc = "福田初成，善念萌發，氣息沉凝，所求漸次順遂。";
    progress = Math.min(100, Math.round(((merit - 200) / 300) * 100));
  } else if (merit >= 50) {
    rankIcon = "🌿";
    rankTitle = "虔誠信士";
    rankDesc = "心誠則靈，三炷清香達上天，神威初顯。";
    progress = Math.min(100, Math.round(((merit - 50) / 150) * 100));
  } else {
    progress = Math.min(100, Math.round((merit / 50) * 100));
  }

  document.getElementById("passportRankIcon").innerText = rankIcon;
  document.getElementById("passportRankTitle").innerText = rankTitle;
  document.getElementById("passportRankDesc").innerText = rankDesc;
  document.getElementById("passportRankProgress").style.width = `${progress}%`;

  renderPassportTab("chiam");
  document.getElementById("passportModal").classList.add("open");
}

function renderPassportTab(tabName) {
  const container = document.getElementById("passportTabContent");
  if (!container) return;
  container.innerHTML = "";

  if (tabName === "chiam") {
    let hist = [];
    try {
      hist = JSON.parse(localStorage.getItem("temple_chiam_history") || "[]");
    } catch (e) {}

    document.getElementById("countChiamHist").innerText = hist.length;

    if (hist.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: #a89173; padding: 20px;">尚無求籤紀錄。移步籤筒搖動賜籤即可載入！</div>`;
      return;
    }

    hist.forEach(h => {
      const item = document.createElement("div");
      item.className = "passport-chiam-item";
      item.innerHTML = `
        <div class="chiam-info">
          <div class="chiam-num">第 ${h.id} 籤 【${h.ganZhi}】 ${h.fortune}</div>
          <div class="chiam-sub">典故：${h.guaTou} • 占問：${h.question || "前程祈願"}（${h.date}）</div>
          ${h.aiText ? `<div style="font-size: 0.78rem; color: #ffe6ba; margin-top: 4px; line-height: 1.3;">🤖 AI 開示：${h.aiText.slice(0, 60)}...</div>` : ""}
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="btn-dock-action" style="padding: 4px 10px; font-size: 0.78rem;" data-chiam-id="${h.id}">📜 重閱</button>
        </div>
      `;

      item.querySelector("button").addEventListener("click", () => {
        const full = window.CHIAM_DATA.find(c => c.id === h.id);
        if (full) {
          document.getElementById("passportModal").classList.remove("open");
          openChiamModal(full);
        }
      });
      container.appendChild(item);
    });
  } else if (tabName === "lantern") {
    let lHist = [];
    try {
      lHist = JSON.parse(localStorage.getItem("temple_lantern_history") || "[]");
    } catch (e) {}

    document.getElementById("countLanternHist").innerText = lHist.length;

    if (lHist.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: #a89173; padding: 20px;">尚無光明燈登載。點亮殿前神燈即可登記！</div>`;
      return;
    }

    lHist.forEach(l => {
      const item = document.createElement("div");
      item.className = "passport-chiam-item";
      item.innerHTML = `
        <div class="chiam-info">
          <div class="chiam-num">🏮 長明祈福燈 • ${l.name}</div>
          <div class="chiam-sub">心願：${l.wish} • 登載日期：${l.date}</div>
        </div>
      `;
      container.appendChild(item);
    });
  } else if (tabName === "ema") {
    let eHist = [];
    try {
      eHist = JSON.parse(localStorage.getItem("temple_ema_plaques") || "[]");
    } catch (e) {}

    document.getElementById("countEmaHist").innerText = eHist.length;

    if (eHist.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: #a89173; padding: 20px;">尚無親題木牌。前往廟埕祈願木牌閣掛牌即可登載！</div>`;
      return;
    }

    eHist.forEach(e => {
      const item = document.createElement("div");
      item.className = "passport-chiam-item";
      item.innerHTML = `
        <div class="chiam-info">
          <div class="chiam-num">${e.icon || "🏮"} ${e.name} 的祈願木牌</div>
          <div class="chiam-sub">祝願：${e.wish} • 懸掛日期：${e.date}</div>
        </div>
      `;
      container.appendChild(item);
    });
  }
}

// 匯出修持功德榮譽狀 (PNG)
function exportSpiritualCertificate() {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 620;
  const ctx = canvas.getContext("2d");

  // 底色：仿古羊皮宣紙漸層
  const bg = ctx.createLinearGradient(0, 0, 900, 620);
  bg.addColorStop(0, "#f8f0dd");
  bg.addColorStop(0.5, "#eedab0");
  bg.addColorStop(1, "#dec28e");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 900, 620);

  // 雙層宮殿朱紅框
  ctx.strokeStyle = "#8b1c1c";
  ctx.lineWidth = 14;
  ctx.strokeRect(20, 20, 860, 580);

  ctx.strokeStyle = "#c89528";
  ctx.lineWidth = 3;
  ctx.strokeRect(34, 34, 832, 552);

  // 四角吉祥裝飾
  const drawCorner = (x, y, dx, dy) => {
    ctx.strokeStyle = "#8b1c1c";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y + dy * 24);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * 24, y);
    ctx.stroke();
  };
  drawCorner(42, 42, 1, 1);
  drawCorner(858, 42, -1, 1);
  drawCorner(42, 578, 1, -1);
  drawCorner(858, 578, -1, -1);

  // 頂部大標題
  ctx.fillStyle = "#8b1c1c";
  ctx.font = "bold 34px 'Songti TC', serif";
  ctx.textAlign = "center";
  ctx.fillText("賽 博 虛 擬 神 殿 • 功 德 修 持 榮 譽 狀", 450, 95);

  ctx.fillStyle = "#692c17";
  ctx.font = "18px 'Songti TC', serif";
  ctx.fillText("護國庇民 • 萬法通達 • 積德延壽 • 諸佛加持", 450, 135);

  // 證書主文
  ctx.fillStyle = "#33180c";
  ctx.font = "22px 'Songti TC', serif";
  ctx.textAlign = "left";

  const name = state.avatarConfig.title || "悠閒的善信";
  const rank = document.getElementById("passportRankTitle")?.innerText || "虔誠信士";
  const merit = state.meritCount.toLocaleString();

  ctx.fillText(`茲有善信 【 ${name} 】：`, 90, 200);

  ctx.font = "19px 'Songti TC', serif";
  ctx.fillStyle = "#451c0f";
  const lines = [
    `秉持赤誠之心，踏入賽博神殿大殿共修，勤勉於神前清心禮敬。`,
    `自入殿修持以來，已累計積攢無量功德達 【 ${merit} 】 點，`,
    `心性純良，道業精進，經神聖印可，證得修持法相：【 ${rank} 】。`,
    `特頒此榮譽狀以昭善德。願諸天仙真永垂冥佑，所求遂意，闔家吉祥！`
  ];

  lines.forEach((l, idx) => {
    ctx.fillText(l, 90, 245 + idx * 36);
  });

  // 神印
  ctx.save();
  ctx.strokeStyle = "#ba1f1f";
  ctx.lineWidth = 5;
  ctx.strokeRect(680, 410, 130, 130);
  ctx.fillStyle = "#ba1f1f";
  ctx.font = "bold 26px 'Songti TC', serif";
  ctx.textAlign = "center";
  ctx.fillText("天上聖母", 745, 465);
  ctx.fillText("通真神寶", 745, 510);
  ctx.restore();

  // 頒發日期
  ctx.fillStyle = "#692c17";
  ctx.font = "16px 'Songti TC', serif";
  ctx.textAlign = "left";
  ctx.fillText(`大殿印行：歲次丙午年吉日（${new Date().toLocaleDateString()}）`, 90, 540);

  const link = document.createElement("a");
  link.download = `3D虛擬神殿_功德修持榮譽狀_${name}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
