// app/sutra.js - 線上抄經閣

// 事件綁定：由 core.js 的 bindEvents() 依原本順序呼叫
function bindSutraEvents() {
  // 4. 線上抄經閣事件綁定
  document.getElementById("btnOpenCopySutra")?.addEventListener("click", () => window.openCopySutraModal());
  document.getElementById("copySutraModalClose")?.addEventListener("click", () => window.closeCopySutraModal());
  document.getElementById("sutraSelect")?.addEventListener("change", (e) => drawSutraCanvas(e.target.value));
  document.querySelectorAll(".sutra-color-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".sutra-color-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      sutraBrushColor = btn.dataset.color;
    });
  });
  document.querySelectorAll(".sutra-size-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".sutra-size-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      sutraBrushSize = parseInt(btn.dataset.size, 10);
    });
  });
  document.getElementById("btnSutraClear")?.addEventListener("click", () => {
    const sel = document.getElementById("sutraSelect");
    drawSutraCanvas(sel ? sel.value : "heart");
  });
  document.getElementById("btnSutraComplete")?.addEventListener("click", () => completeSutraCopying());
  document.getElementById("btnSutraDownload")?.addEventListener("click", () => downloadSutraPNG());
  initSutraCanvasEvents();

  document.getElementById("amuletModalClose").addEventListener("click", () => {
    document.getElementById("amuletModal").classList.remove("open");
  });

}

// ==========================================================================
// 4. 線上抄經閣 • 虔心描紅抄經 (Calligraphy Logic)
// ==========================================================================
let isSutraDrawing = false;
let sutraLastX = 0, sutraLastY = 0;
let sutraBrushColor = "#18181b";
let sutraBrushSize = 6;

const SUTRA_TEXTS = {
  heart: [
    "觀自在菩薩。行深般若波羅蜜多時。照見五蘊皆空。度一切苦厄。",
    "舍利子。色不異空。空不異色。色即是空。空即是色。",
    "受想行識。亦復如是。舍利子。是諸法空相。不生不滅。",
    "不垢不淨。不增不減。是故空中無色。無受想行識。"
  ],
  qingjing: [
    "老君曰。大道無形。生育天地。大道無情。運行日月。",
    "大道無名。長養萬物。吾不知其名。強名曰道。",
    "夫道者。有清有濁。有動有靜。天清地濁。天動地靜。",
    "男清女濁。男動女靜。降本流末。而生萬物。"
  ],
  yinzhi: [
    "帝君曰。吾一十七世為士大夫身。未嘗虐民酷吏。",
    "救人之難。濟人之急。閔人之孤。容人之過。",
    "廣行陰騭。上格蒼穹。人能如我存心。天必賜汝以福。",
    "諸惡莫作。眾善奉行。永錫難老。萬福駢臻。"
  ]
};

window.openCopySutraModal = function() {
  const modal = document.getElementById("copySutraModal");
  if (!modal) return;
  modal.classList.add("open");
  const sel = document.getElementById("sutraSelect");
  drawSutraCanvas(sel ? sel.value : "heart");
  if (window.templeAudio) window.templeAudio.playBell(396);
};

window.closeCopySutraModal = function() {
  const modal = document.getElementById("copySutraModal");
  if (modal) modal.classList.remove("open");
};

function drawSutraCanvas(key = "heart") {
  const canvas = document.getElementById("sutraCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;

  // 宣紙底色
  ctx.fillStyle = "#fefae0";
  ctx.fillRect(0, 0, W, H);

  // 紅色九宮格界線
  ctx.strokeStyle = "rgba(220, 38, 38, 0.18)";
  ctx.lineWidth = 1;
  const colW = (W - 40) / 4;
  for (let c = 0; c <= 4; c++) {
    ctx.beginPath();
    ctx.moveTo(20 + c * colW, 20);
    ctx.lineTo(20 + c * colW, H - 20);
    ctx.stroke();
  }

  // 淺灰楷書描紅水墨字
  const lines = SUTRA_TEXTS[key] || SUTRA_TEXTS.heart;
  ctx.font = "26px 'Songti TC', 'Noto Serif TC', serif";
  ctx.fillStyle = "rgba(120, 113, 108, 0.28)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  lines.forEach((line, lineIdx) => {
    const chars = line.split("");
    const charSpacing = (H - 50) / Math.max(1, chars.length);
    const colX = W - 35 - lineIdx * colW;

    chars.forEach((ch, cIdx) => {
      ctx.fillText(ch, colX, 35 + cIdx * charSpacing);
    });
  });
}

function initSutraCanvasEvents() {
  const canvas = document.getElementById("sutraCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  function startDraw(e) {
    e.preventDefault();
    isSutraDrawing = true;
    const pos = getPos(e);
    sutraLastX = pos.x;
    sutraLastY = pos.y;
    if (window.templeAudio) window.templeAudio.playCalligraphyInkSound();
  }

  function drawMove(e) {
    if (!isSutraDrawing) return;
    e.preventDefault();
    const pos = getPos(e);

    ctx.save();
    ctx.strokeStyle = sutraBrushColor;
    ctx.fillStyle = sutraBrushColor;
    ctx.lineWidth = sutraBrushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(sutraLastX, sutraLastY);
    ctx.quadraticCurveTo(sutraLastX, sutraLastY, (sutraLastX + pos.x) / 2, (sutraLastY + pos.y) / 2);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, sutraBrushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    sutraLastX = pos.x;
    sutraLastY = pos.y;
  }

  function stopDraw(e) {
    isSutraDrawing = false;
  }

  canvas.addEventListener("mousedown", startDraw);
  canvas.addEventListener("mousemove", drawMove);
  canvas.addEventListener("mouseup", stopDraw);
  canvas.addEventListener("mouseleave", stopDraw);

  canvas.addEventListener("touchstart", startDraw, { passive: false });
  canvas.addEventListener("touchmove", drawMove, { passive: false });
  canvas.addEventListener("touchend", stopDraw);
}

function completeSutraCopying() {
  const canvas = document.getElementById("sutraCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const targetInput = document.getElementById("sutraDedicationTarget");
  const target = (targetInput ? targetInput.value.trim() : "") || "天下蒼生";

  // 在右下角加蓋正統硃砂雙印「心安即福」
  ctx.save();
  ctx.strokeStyle = "#bb1b1b";
  ctx.lineWidth = 3;
  ctx.strokeRect(30, canvas.height - 85, 60, 60);
  ctx.fillStyle = "#bb1b1b";
  ctx.font = "bold 15px 'Songti TC', serif";
  ctx.textAlign = "center";
  ctx.fillText("心安", 60, canvas.height - 62);
  ctx.fillText("即福", 60, canvas.height - 40);

  ctx.font = "14px 'Songti TC', serif";
  ctx.fillStyle = "#444";
  ctx.textAlign = "left";
  ctx.fillText(`迴向信眾：【 ${target} 】 虔心手抄`, 105, canvas.height - 48);
  ctx.restore();

  addMerit(150);
  if (window.templeAudio) window.templeAudio.playBell(108);

  const msg = `🪷 抄經圓滿！將無量功德迴向給【${target}】！消除業障，功德 +150！`;
  if (window.liveTempleWall) window.liveTempleWall.addDanmaku(msg);
  if (typeof showFloatingDanmaku !== "undefined") showFloatingDanmaku(msg, "#6ee7b7");
  if (window.setDockStatus) window.setDockStatus(msg);
  alert(`🪷 虔心抄經功德圓滿！朱印已鈐蓋於墨寶之上，功德 +150，願力廣被【${target}】！`);
}

function downloadSutraPNG() {
  const canvas = document.getElementById("sutraCanvas");
  if (!canvas) return;
  const link = document.createElement("a");
  link.download = `賽博神殿_虔心手抄經文墨寶.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
