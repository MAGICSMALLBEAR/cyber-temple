// app/chiam.js - 靈籤與 AI 解籤：籤詩彈窗、AI 深度解籤與設定、語音開示、結緣卡匯出

// 事件綁定：由 core.js 的 bindEvents() 依原本順序呼叫
function bindChiamAndAIEvents() {
  // 籤詩彈窗關閉
  document.getElementById("modalClose").addEventListener("click", () => {
    document.getElementById("chiamModal").classList.remove("open");
    window.templeAudio.stopSpeaking();
  });

  // 匯出結緣卡
  document.getElementById("btnExportCard").addEventListener("click", () => {
    if (state.selectedChiam) {
      exportFortuneCard(state.selectedChiam);
    }
  });

  // 聆聽神明聖諭開示 (語音 TTS)
  document.getElementById("btnSpeakOracle").addEventListener("click", () => {
    if (state.selectedChiam) {
      const oracleText = `${state.selectedChiam.fortune}。${state.selectedChiam.meaning}。${state.selectedChiam.advice}`;
      window.templeAudio.speakDivineMessage(oracleText);
      setDockStatus("🔊 神明法音慈悲開示中...");
    }
  });

  // AI 深度解籤請求
  document.getElementById("btnRequestAIDivine").addEventListener("click", () => {
    requestAIDivination();
  });

  // AI 設置彈窗
  document.getElementById("btnOpenSettings").addEventListener("click", () => {
    document.getElementById("txtGeminiKey").value = window.aiDivination.apiKey || "";
    document.getElementById("settingsModal").classList.add("open");
  });

  document.getElementById("settingsModalClose").addEventListener("click", () => {
    document.getElementById("settingsModal").classList.remove("open");
  });

  document.getElementById("btnSaveSettings").addEventListener("click", () => {
    const newKey = document.getElementById("txtGeminiKey").value.trim();
    window.aiDivination.setApiKey(newKey);
    updateAIEngineBadge();
    document.getElementById("settingsModal").classList.remove("open");
    setDockStatus("AI 設定儲存成功！");
  });

  document.getElementById("btnClearSettings").addEventListener("click", () => {
    window.aiDivination.setApiKey("");
    document.getElementById("txtGeminiKey").value = "";
    updateAIEngineBadge();
    document.getElementById("settingsModal").classList.remove("open");
    setDockStatus("已切換為本地高階心靈演繹引擎。");
  });

}

function updateAIEngineBadge() {
  const badge = document.getElementById("aiEngineBadge");
  if (!badge) return;
  if (window.aiDivination.hasApiKey()) {
    badge.innerText = "✨ Gemini 直連已就緒";
    badge.style.color = "#2e7d32";
  } else {
    badge.innerText = "✨ 神明推演引擎就緒 (免Key)";
    badge.style.color = "#7c1a1a";
  }
}

// 打開籤詩彈窗
function openChiamModal(chiam) {
  state.selectedChiam = chiam;
  window.templeBag?.updateFavoriteButton();
  document.getElementById("scrollTitle").innerText = `六十甲子媽祖靈籤 • 第 ${chiam.id} 籤`;
  document.getElementById("scrollFortune").innerText = `${chiam.ganZhi} • ${chiam.fortune}`;
  document.getElementById("scrollGuaTou").innerText = `典故：${chiam.guaTou}`;

  const poemBox = document.getElementById("scrollPoemBox");
  poemBox.innerHTML = "";
  [...chiam.poem].reverse().forEach(line => {
    const span = document.createElement("div");
    span.className = "poem-line";
    span.innerText = line;
    poemBox.appendChild(span);
  });

  document.getElementById("scrollMeaning").innerText = chiam.meaning;

  const detailsEl = document.getElementById("scrollDetails");
  detailsEl.innerHTML = `
    <div><strong>【功名/事業】</strong>：${chiam.details.career}</div>
    <div><strong>【感情/婚姻】</strong>：${chiam.details.romance}</div>
    <div><strong>【考運/學業】</strong>：${chiam.details.exam}</div>
    <div><strong>【財富/求財】</strong>：${chiam.details.wealth}</div>
    <div style="grid-column: span 2;"><strong>【健康/身心】</strong>：${chiam.details.health}</div>
  `;

  document.getElementById("scrollAdvice").innerText = chiam.advice;
  document.getElementById("aiResultCard").style.display = "none";
  document.getElementById("aiLoading").style.display = "none";
  document.getElementById("chiamModal").classList.add("open");
}

// AI 深度解籤
async function requestAIDivination() {
  if (!state.selectedChiam) return;
  const chiam = state.selectedChiam;
  const deity = DEITIES[state.currentDeity];
  const userQuestion = document.getElementById("aiQuestionInput").value.trim() || "祈求安泰前程";

  const loadingEl = document.getElementById("aiLoading");
  const resultCard = document.getElementById("aiResultCard");

  loadingEl.style.display = "flex";
  resultCard.style.display = "none";
  window.templeAudio.playBell(520);

  try {
    const res = await window.aiDivination.divine({
      deity,
      chiam,
      userQuestion,
      userName: state.avatarConfig.title || "善信",
      userAddress: "台灣"
    });

    loadingEl.style.display = "none";
    resultCard.innerText = res.text;
    resultCard.style.display = "block";
    window.templeAudio.playBell(620);

    // 同步更新歷史紀錄之 AI 解籤開示
    updateChiamHistoryAI(chiam.id, userQuestion, res.text);
  } catch (err) {
    loadingEl.style.display = "none";
    resultCard.innerText = `解籤遇阻：${err.message}`;
    resultCard.style.display = "block";
  }
}

// 匯出平安結緣卡 (PNG)
function exportFortuneCard(chiam) {
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 900;
  const ctx = canvas.getContext("2d");

  const bgGrad = ctx.createLinearGradient(0, 0, 0, 900);
  bgGrad.addColorStop(0, "#f9f1de");
  bgGrad.addColorStop(0.5, "#eedab0");
  bgGrad.addColorStop(1, "#dfc48e");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 600, 900);

  ctx.strokeStyle = "#8b1c1c";
  ctx.lineWidth = 10;
  ctx.strokeRect(20, 20, 560, 860);
  ctx.strokeStyle = "#c89528";
  ctx.lineWidth = 2;
  ctx.strokeRect(30, 30, 540, 840);

  ctx.fillStyle = "#8b1c1c";
  ctx.font = "bold 32px 'Songti TC', serif";
  ctx.textAlign = "center";
  ctx.fillText("雲端虛擬神殿 3D • 靈籤結緣卡", 300, 85);

  ctx.fillStyle = "#331206";
  ctx.font = "bold 24px 'Songti TC', serif";
  ctx.fillText(`第 ${chiam.id} 籤 【${chiam.ganZhi}】 ${chiam.fortune}`, 300, 130);

  ctx.font = "18px 'Songti TC', serif";
  ctx.fillStyle = "#632d16";
  ctx.fillText(`典故：${chiam.guaTou}`, 300, 165);

  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.fillRect(70, 200, 460, 230);
  ctx.strokeStyle = "#b58742";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(70, 200, 460, 230);

  ctx.fillStyle = "#4a1204";
  ctx.font = "bold 28px 'Songti TC', serif";
  const startX = 450;
  const colSpacing = 90;
  chiam.poem.forEach((line, idx) => {
    const x = startX - idx * colSpacing;
    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      ctx.fillText(line[charIdx], x, 245 + charIdx * 25);
    }
  });

  ctx.fillStyle = "#33180c";
  ctx.font = "18px 'Songti TC', serif";
  ctx.textAlign = "left";

  const wrapText = (text, x, y, maxWidth, lineHeight) => {
    let line = "";
    for (let i = 0; i < text.length; i++) {
      const testLine = line + text[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line, x, y);
        line = text[i];
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
    return y + lineHeight;
  };

  ctx.fillText("【白話解析】", 70, 475);
  ctx.font = "16px 'Songti TC', serif";
  let curY = wrapText(chiam.meaning, 70, 505, 460, 24);

  curY += 10;
  ctx.font = "bold 17px 'Songti TC', serif";
  ctx.fillStyle = "#8b1c1c";
  wrapText(chiam.advice, 70, curY, 460, 24);

  ctx.save();
  ctx.strokeStyle = "#ba1f1f";
  ctx.lineWidth = 4;
  ctx.strokeRect(235, 740, 130, 90);
  ctx.fillStyle = "#ba1f1f";
  ctx.font = "bold 22px 'Songti TC', serif";
  ctx.textAlign = "center";
  ctx.fillText("神佛護佑", 300, 780);
  ctx.fillText("萬事順遂", 300, 812);
  ctx.restore();

  const link = document.createElement("a");
  link.download = `3D虛擬神殿_第${chiam.id}籤_${chiam.ganZhi}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
