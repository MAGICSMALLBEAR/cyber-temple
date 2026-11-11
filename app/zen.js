// app/zen.js - 賽博禪修堂

// 事件綁定：由 core.js 的 bindEvents() 依原本順序呼叫
function bindZenEvents() {
  // 賽博禪修堂彈窗與控制
  const btnOpenZenEl = document.getElementById("btnOpenZen");
  if (btnOpenZenEl) {
    btnOpenZenEl.addEventListener("click", () => {
      window.openZenModal();
    });
  }

  const zenModalCloseEl = document.getElementById("zenModalClose");
  if (zenModalCloseEl) {
    zenModalCloseEl.addEventListener("click", () => {
      window.closeZenModal();
    });
  }

  document.querySelectorAll(".zen-mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".zen-mode-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      zenMode = btn.dataset.mode;
    });
  });

  document.querySelectorAll(".zen-time-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".zen-time-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      zenTargetDuration = parseInt(btn.dataset.time, 10);
      const m = Math.floor(zenTargetDuration / 60);
      const s = zenTargetDuration % 60;
      const tText = zenTargetDuration > 0 ? `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}` : "00:00";
      const tEl = document.getElementById("zenTimerText");
      if (tEl) tEl.innerText = tText;
    });
  });

  // 混音器滑桿監聽
  ["Wind", "Rain", "Birds", "Bowl"].forEach(track => {
    const slider = document.getElementById(`zen${track}Vol`);
    if (slider) {
      slider.addEventListener("input", (e) => {
        const vol = parseFloat(e.target.value) / 100;
        if (window.templeAudio) {
          window.templeAudio.setZenTrackVolume(track.toLowerCase(), vol);
        }
      });
    }
  });

  const btnStartZenEl = document.getElementById("btnStartZen");
  if (btnStartZenEl) {
    btnStartZenEl.addEventListener("click", () => {
      startZenMeditation();
    });
  }

  const btnStopZenEl = document.getElementById("btnStopZen");
  if (btnStopZenEl) {
    btnStopZenEl.addEventListener("click", () => {
      stopZenMeditation(false);
    });
  }

}

// ==========================================================================
// 賽博禪修堂 • 數息定心冥想 (Zen Breathwork & Ambient Soundscape)
// ==========================================================================
let isZenRunning = false;
let zenMode = "box"; // "box", "478", "free"
let zenTargetDuration = 300; // 秒 (預設 5 分鐘, 0 為無限)
let zenStartTime = 0;
let zenElapsedSeconds = 0;
const ZEN_DAILY_MERIT_CAP = 300;
let zenAnimFrameId = null;

window.openZenModal = function() {
  const modal = document.getElementById("zenModal");
  if (!modal) return;
  modal.classList.add("open");
  drawZenMandala("idle", 0);
  if (window.templeAudio) window.templeAudio.playBell(396);
};

window.closeZenModal = function() {
  const modal = document.getElementById("zenModal");
  if (modal) modal.classList.remove("open");
};

function drawZenMandala(phase, scaleFactor) {
  const canvas = document.getElementById("zenMandalaCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2;

  ctx.clearRect(0, 0, W, H);

  // 外圈柔和呼吸光暈
  const glowRadius = Math.max(20, 75 + scaleFactor * 45);
  const radialGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, glowRadius);
  radialGrad.addColorStop(0, "rgba(255, 215, 0, 0.45)");
  radialGrad.addColorStop(0.6, "rgba(245, 158, 11, 0.18)");
  radialGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = radialGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  // 八瓣動態曼陀羅幾何線條
  const petalCount = 8;
  const petalLen = 35 + scaleFactor * 38;
  const petalWidth = 14 + scaleFactor * 10;

  ctx.save();
  ctx.translate(cx, cy);

  for (let ring = 0; ring < 2; ring++) {
    const rScale = ring === 0 ? 1 : 0.65;
    const rPetalLen = petalLen * rScale;
    const rPetalWidth = petalWidth * rScale;
    ctx.rotate(ring * (Math.PI / petalCount));

    for (let i = 0; i < petalCount; i++) {
      ctx.rotate((Math.PI * 2) / petalCount);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-rPetalWidth, rPetalLen * 0.4, -rPetalWidth * 0.7, rPetalLen, 0, rPetalLen);
      ctx.bezierCurveTo(rPetalWidth * 0.7, rPetalLen, rPetalWidth, rPetalLen * 0.4, 0, 0);

      ctx.strokeStyle = ring === 0 ? "rgba(255, 215, 0, 0.85)" : "rgba(245, 158, 11, 0.7)";
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.fillStyle = ring === 0 ? "rgba(255, 225, 100, 0.12)" : "rgba(245, 158, 11, 0.08)";
      ctx.fill();
    }
  }

  // 中心同心金環與微芒
  ctx.beginPath();
  ctx.arc(0, 0, 12 + scaleFactor * 5, 0, Math.PI * 2);
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 2.2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();

  ctx.restore();
}

function startZenMeditation() {
  if (isZenRunning) return;
  isZenRunning = true;
  zenStartTime = performance.now();
  zenElapsedSeconds = 0;

  // 3D 分身端坐打坐蓮花座
  if (window.temple3d && window.temple3d.avatar) {
    window.temple3d.avatar.triggerAction("meditate");
    if (window.temple3d.avatar.limbs && window.temple3d.avatar.config && window.temple3d.avatar.config.hasLotusThrone) {
      window.temple3d.avatar.buildLotusThrone(true);
    }
  }

  // 啟動 4 軌禪音環境混音器
  if (window.templeAudio) {
    window.templeAudio.initZenSoundscape();
    const wind = (document.getElementById("zenWindVol")?.value || 40) / 100;
    const rain = (document.getElementById("zenRainVol")?.value || 35) / 100;
    const birds = (document.getElementById("zenBirdsVol")?.value || 30) / 100;
    const bowl = (document.getElementById("zenBowlVol")?.value || 45) / 100;
    window.templeAudio.setZenTrackVolume("wind", wind);
    window.templeAudio.setZenTrackVolume("rain", rain);
    window.templeAudio.setZenTrackVolume("birds", birds);
    window.templeAudio.setZenTrackVolume("bowl", bowl);
  }

  const btnStart = document.getElementById("btnStartZen");
  if (btnStart) {
    btnStart.innerText = "🧘 禪修中…";
    btnStart.style.background = "#15803d";
  }

  runZenLoop();
}

function runZenLoop() {
  if (!isZenRunning) return;

  const now = performance.now();
  const elapsedSec = (now - zenStartTime) * 0.001;
  zenElapsedSeconds = Math.floor(elapsedSec);

  let displaySec = zenTargetDuration > 0 ? Math.max(0, zenTargetDuration - zenElapsedSeconds) : zenElapsedSeconds;
  const m = Math.floor(displaySec / 60);
  const s = displaySec % 60;
  const timerText = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;

  const tEl = document.getElementById("zenTimerText");
  if (tEl) tEl.innerText = timerText;

  let phaseName = "吸氣…引納九天清靈氣";
  let scale = 0;

  if (zenMode === "box") {
    const cycle = elapsedSec % 16;
    if (cycle < 4) {
      phaseName = "吸氣…引九天靈光入心 (4s)";
      scale = cycle / 4;
    } else if (cycle < 8) {
      phaseName = "持息…安住清淨本心 (4s)";
      scale = 1.0;
    } else if (cycle < 12) {
      phaseName = "呼氣…釋放塵世雜念 (4s)";
      scale = 1 - (cycle - 8) / 4;
    } else {
      phaseName = "空息…萬緣放下如如 (4s)";
      scale = 0.0;
    }
  } else if (zenMode === "478") {
    const cycle = elapsedSec % 19;
    if (cycle < 4) {
      phaseName = "吸氣…深吸清寧 (4s)";
      scale = cycle / 4;
    } else if (cycle < 11) {
      phaseName = "持息…定心凝神 (7s)";
      scale = 1.0;
    } else {
      phaseName = "呼氣…完全放鬆 (8s)";
      scale = 1 - (cycle - 11) / 8;
    }
  } else {
    const cycle = elapsedSec % 10;
    scale = cycle < 5 ? cycle / 5 : 1 - (cycle - 5) / 5;
    phaseName = cycle < 5 ? "徐緩吸氣…" : "悠然呼氣…";
  }

  const pEl = document.getElementById("zenPhaseText");
  if (pEl) pEl.innerText = phaseName;

  drawZenMandala(phaseName, scale);

  if (zenTargetDuration > 0 && zenElapsedSeconds >= zenTargetDuration) {
    stopZenMeditation(true);
    return;
  }

  zenAnimFrameId = requestAnimationFrame(runZenLoop);
}

function stopZenMeditation(isCompleted = false) {
  if (!isZenRunning) return;
  isZenRunning = false;
  if (zenAnimFrameId) {
    cancelAnimationFrame(zenAnimFrameId);
    zenAnimFrameId = null;
  }

  if (window.templeAudio) {
    window.templeAudio.stopZenSoundscape();
    window.templeAudio.playBell(216);
  }

  if (window.temple3d && window.temple3d.avatar) {
    window.temple3d.avatar.triggerAction("idle");
  }

  const btnStart = document.getElementById("btnStartZen");
  if (btnStart) {
    btnStart.innerText = "🧘 開始定心禪修";
    btnStart.style.background = "#2e7d32";
  }

  // 每滿一分鐘 +30，未滿一分鐘不計；每天禪修功德最多 300（十分鐘）
  const minutes = Math.floor(zenElapsedSeconds / 60);
  const earnedMerit = minutes > 0 ? claimDailyMerit("zen", minutes * 30, ZEN_DAILY_MERIT_CAP) : 0;

  const titleText = isCompleted ? "🎉 禪修圓滿！出定收功！" : "🧘 暫歇禪修，功德圓融！";
  const msg = minutes < 1
    ? "🧘 靜坐未滿一分鐘，這次不計功德。再坐久一點，心會更靜。"
    : earnedMerit > 0
      ? `${titleText} 總計修持 ${minutes} 分鐘，功德 +${earnedMerit}！心如止水，福慧增長！`
      : `${titleText} 總計修持 ${minutes} 分鐘。今日禪修功德已滿 ${ZEN_DAILY_MERIT_CAP}，明日再來。`;

  const pEl = document.getElementById("zenPhaseText");
  if (pEl) pEl.innerText = "禪修圓滿 • 福慧雙全";
  drawZenMandala("idle", 0.5);

  window.templeNotify?.(msg);
}
