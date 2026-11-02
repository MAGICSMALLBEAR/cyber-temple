// app/rhythm.js - 梵音課誦節奏法會

// 事件綁定：由 core.js 的 bindEvents() 依原本順序呼叫
function bindRhythmEvents() {
  // 梵音課誦節奏法會彈窗開關
  document.getElementById("btnOpenRhythm").addEventListener("click", () => {
    window.openRhythmModal();
  });

  document.getElementById("rhythmModalClose").addEventListener("click", () => {
    document.getElementById("rhythmModal").classList.remove("open");
    stopRhythmGame();
  });

}

// ==========================================================================
// 3. 梵音課誦節奏法會 (Cyber Dharma Rhythm Mode)
// ==========================================================================
let isRhythmGameRunning = false;
let rhythmAnimFrame = null;
let rhythmStartTime = 0;
let rhythmCombo = 0;
let rhythmEarnedMerit = 0;
let rhythmSelectedSutra = "qingxin";

const SUTRA_SONGS = {
  qingxin: {
    name: "清心普善咒",
    bpm: 72,
    notes: [
      { beat: 1.0, type: "muyu", text: "清" },
      { beat: 2.0, type: "muyu", text: "心" },
      { beat: 3.0, type: "bell", text: "普" },
      { beat: 4.0, type: "muyu", text: "善" },
      { beat: 5.0, type: "muyu", text: "萬" },
      { beat: 6.0, type: "muyu", text: "念" },
      { beat: 7.0, type: "bell", text: "皆" },
      { beat: 8.0, type: "muyu", text: "空" },
      { beat: 9.0, type: "muyu", text: "靈" },
      { beat: 10.0, type: "muyu", text: "台" },
      { beat: 11.0, type: "bell", text: "明" },
      { beat: 12.0, type: "muyu", text: "澈" },
      { beat: 13.0, type: "muyu", text: "普" },
      { beat: 14.0, type: "muyu", text: "濟" },
      { beat: 15.0, type: "bell", text: "眾" },
      { beat: 16.0, type: "bell", text: "生" }
    ]
  },
  yinzhi: {
    name: "文昌陰騭文",
    bpm: 88,
    notes: [
      { beat: 1.0, type: "muyu", text: "諸" },
      { beat: 2.0, type: "muyu", text: "惡" },
      { beat: 2.5, type: "muyu", text: "莫" },
      { beat: 3.0, type: "bell", text: "作" },
      { beat: 4.0, type: "muyu", text: "眾" },
      { beat: 5.0, type: "muyu", text: "善" },
      { beat: 5.5, type: "muyu", text: "奉" },
      { beat: 6.0, type: "bell", text: "行" },
      { beat: 7.0, type: "muyu", text: "廣" },
      { beat: 8.0, type: "muyu", text: "行" },
      { beat: 8.5, type: "muyu", text: "陰" },
      { beat: 9.0, type: "bell", text: "騭" },
      { beat: 10.0, type: "muyu", text: "上" },
      { beat: 11.0, type: "muyu", text: "格" },
      { beat: 11.5, type: "bell", text: "蒼" },
      { beat: 12.0, type: "bell", text: "穹" }
    ]
  },
  qingjing: {
    name: "太上清靜經",
    bpm: 80,
    notes: [
      { beat: 1.0, type: "muyu", text: "大" },
      { beat: 2.0, type: "muyu", text: "道" },
      { beat: 3.0, type: "bell", text: "無" },
      { beat: 4.0, type: "muyu", text: "形" },
      { beat: 5.0, type: "muyu", text: "生" },
      { beat: 6.0, type: "muyu", text: "育" },
      { beat: 7.0, type: "bell", text: "天" },
      { beat: 8.0, type: "bell", text: "地" },
      { beat: 9.0, type: "muyu", text: "清" },
      { beat: 10.0, type: "muyu", text: "靜" },
      { beat: 11.0, type: "bell", text: "自" },
      { beat: 12.0, type: "bell", text: "然" }
    ]
  }
};

let currentRhythmSong = SUTRA_SONGS.qingxin;
let activeNotes = [];

window.openRhythmModal = function() {
  const modal = document.getElementById("rhythmModal");
  if (!modal) return;
  modal.classList.add("open");
  resetRhythmGame();
  drawRhythmIdleTrack();
  if (window.templeAudio) window.templeAudio.playBell(528);
};

function resetRhythmGame() {
  rhythmCombo = 0;
  rhythmEarnedMerit = 0;
  const comboEl = document.getElementById("rhythmCombo");
  const meritEl = document.getElementById("rhythmEarnedMerit");
  const accEl = document.getElementById("rhythmAccuracyText");
  if (comboEl) comboEl.innerText = "0";
  if (meritEl) meritEl.innerText = "+0";
  if (accEl) {
    accEl.innerText = "靜心以待";
    accEl.style.color = "#a5d6a7";
  }
}

// 課誦曲目分頁切換
document.querySelectorAll(".side-hall-tab-btn[data-sutra]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".side-hall-tab-btn[data-sutra]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    rhythmSelectedSutra = btn.dataset.sutra;
    currentRhythmSong = SUTRA_SONGS[rhythmSelectedSutra] || SUTRA_SONGS.qingxin;
    stopRhythmGame();
    resetRhythmGame();
    drawRhythmIdleTrack();
    if (window.templeAudio) window.templeAudio.playBell(600);
  });
});

const btnStartRhythm = document.getElementById("btnStartRhythm");
if (btnStartRhythm) {
  btnStartRhythm.addEventListener("click", () => {
    startRhythmGame();
  });
}

const btnStopRhythm = document.getElementById("btnStopRhythm");
if (btnStopRhythm) {
  btnStopRhythm.addEventListener("click", () => {
    stopRhythmGame();
  });
}

function startRhythmGame() {
  if (isRhythmGameRunning) return;
  isRhythmGameRunning = true;
  resetRhythmGame();
  rhythmStartTime = performance.now();

  const song = currentRhythmSong;
  const secPerBeat = 60 / song.bpm;

  // 構建三輪循環節奏音符
  activeNotes = [];
  const loopCount = 3;
  const loopDuration = song.notes[song.notes.length - 1].beat * secPerBeat + 2.0;

  for (let l = 0; l < loopCount; l++) {
    const loopOffset = l * loopDuration;
    song.notes.forEach(n => {
      activeNotes.push({
        time: n.beat * secPerBeat + loopOffset,
        type: n.type,
        text: n.text,
        hit: false,
        missed: false
      });
    });
  }

  rhythmGameLoop();
  setDockStatus(`🎵 課誦《${song.name}》啟動！跟隨軌道敲擊木魚 [J] 與引磬 [K] 積累無量功德！`);
}

function stopRhythmGame() {
  if (!isRhythmGameRunning) return;
  isRhythmGameRunning = false;
  if (rhythmAnimFrame) {
    cancelAnimationFrame(rhythmAnimFrame);
    rhythmAnimFrame = null;
  }
  if (rhythmEarnedMerit > 0) {
    addMerit(rhythmEarnedMerit);
    setDockStatus(`🌟 課誦法會圓滿！共獲修持功德 +${rhythmEarnedMerit}，法喜充滿！`);
    if (window.liveTempleWall) window.liveTempleWall.addDanmaku(`🎵 善信課誦《${currentRhythmSong.name}》圓滿，獲 +${rhythmEarnedMerit} 功德！`);
    if (window.templeAudio) window.templeAudio.playConsecrationChime();
  }
  drawRhythmIdleTrack();
}

function rhythmGameLoop() {
  if (!isRhythmGameRunning) return;
  const canvas = document.getElementById("rhythmTrackCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  const curTime = (performance.now() - rhythmStartTime) * 0.001;
  const speed = 160; // 像素/秒
  const targetX = 90; // 敲擊判定靶心位置

  ctx.clearRect(0, 0, W, H);

  // 1. 經文卷軸底色
  const scrollGrad = ctx.createLinearGradient(0, 0, 0, H);
  scrollGrad.addColorStop(0, "#2c100a");
  scrollGrad.addColorStop(0.5, "#180705");
  scrollGrad.addColorStop(1, "#2c100a");
  ctx.fillStyle = scrollGrad;
  ctx.fillRect(0, 0, W, H);

  // 上下裝飾金線
  ctx.strokeStyle = "rgba(212, 160, 52, 0.4)";
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, W - 8, H - 8);

  // 中央節奏導軌線
  ctx.strokeStyle = "rgba(255, 235, 150, 0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(targetX, H / 2);
  ctx.lineTo(W, H / 2);
  ctx.stroke();

  // 2. 判定目標靶心圓環
  ctx.strokeStyle = "#ffd54f";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(targetX, H / 2, 28, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 213, 79, 0.15)";
  ctx.fill();

  ctx.fillStyle = "#fff8e1";
  ctx.font = "bold 13px 'Songti TC', serif";
  ctx.textAlign = "center";
  ctx.fillText("擊", targetX, H / 2 + 5);

  // 3. 繪製流動中的節奏音符
  let allDone = true;

  activeNotes.forEach(note => {
    if (note.hit) return;
    const dt = note.time - curTime;
    const x = targetX + dt * speed;

    // 若超出左側判定區且未敲擊則標記偏失
    if (x < targetX - 55 && !note.missed) {
      note.missed = true;
      rhythmCombo = 0;
      updateRhythmDisplay("偏失", "#ef5350");
    }

    if (x > -40 && x < W + 40) {
      allDone = false;

      // 繪製音符球
      const isMuyu = note.type === "muyu";
      ctx.fillStyle = isMuyu ? "#8d4320" : "#d4a034";
      ctx.beginPath();
      ctx.arc(x, H / 2, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isMuyu ? "#ffd54f" : "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // 音符內經文字符
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px 'Songti TC', serif";
      ctx.textAlign = "center";
      ctx.fillText(note.text, x, H / 2 + 6);
    } else if (dt > 0) {
      allDone = false;
    }
  });

  if (allDone && curTime > 5) {
    stopRhythmGame();
    return;
  }

  rhythmAnimFrame = requestAnimationFrame(rhythmGameLoop);
}

function drawRhythmIdleTrack() {
  const canvas = document.getElementById("rhythmTrackCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  ctx.fillStyle = "#1e0b07";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(212, 160, 52, 0.3)";
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, W - 8, H - 8);

  ctx.strokeStyle = "#ffd54f";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(90, H / 2, 28, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#ebd197";
  ctx.font = "bold 16px 'Songti TC', serif";
  ctx.textAlign = "center";
  ctx.fillText("點擊下方「開始課誦」以啟動法會節奏迷你遊戲", W / 2, H / 2 + 6);
}

function handleRhythmHit(hitType) {
  if (!isRhythmGameRunning) return;
  const curTime = (performance.now() - rhythmStartTime) * 0.001;

  // 尋找最近之音符
  let closestNote = null;
  let minDiff = 999;

  activeNotes.forEach(note => {
    if (note.hit || note.missed) return;
    const diff = Math.abs(note.time - curTime);
    if (diff < minDiff && diff < 0.38) {
      minDiff = diff;
      closestNote = note;
    }
  });

  if (closestNote) {
    closestNote.hit = true;
    let accuracy = "perfect";
    let pts = 5;

    if (minDiff < 0.12) {
      accuracy = "perfect";
      pts = closestNote.type === hitType ? 8 : 4;
      updateRhythmDisplay("圓融！", "#69f0ae");
    } else {
      accuracy = "good";
      pts = closestNote.type === hitType ? 5 : 2;
      updateRhythmDisplay("精進！", "#ffd54f");
    }

    rhythmCombo++;
    const multiplier = Math.min(3, 1 + Math.floor(rhythmCombo / 10));
    const addedMerit = pts * multiplier;
    rhythmEarnedMerit += addedMerit;

    const comboEl = document.getElementById("rhythmCombo");
    const meritEl = document.getElementById("rhythmEarnedMerit");
    if (comboEl) comboEl.innerText = rhythmCombo.toString();
    if (meritEl) meritEl.innerText = `+${rhythmEarnedMerit}`;

    if (window.templeAudio) {
      window.templeAudio.playRhythmHit(closestNote.type, accuracy);
      if (rhythmCombo > 0 && rhythmCombo % 10 === 0) {
        window.templeAudio.playRhythmHit("combo");
      }
    }
  } else {
    // 偏擊
    if (window.templeAudio) window.templeAudio.playRhythmHit(hitType, "good");
  }
}

function updateRhythmDisplay(accText, color) {
  const el = document.getElementById("rhythmAccuracyText");
  if (el) {
    el.innerText = accText;
    el.style.color = color;
  }
}

// 木魚與引磬點擊按鈕
const btnHitMuyu = document.getElementById("btnHitMuyu");
if (btnHitMuyu) {
  btnHitMuyu.addEventListener("click", () => {
    handleRhythmHit("muyu");
  });
}

const btnHitBell = document.getElementById("btnHitBell");
if (btnHitBell) {
  btnHitBell.addEventListener("click", () => {
    handleRhythmHit("bell");
  });
}
