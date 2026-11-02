// app/bwa-competition.js - 搏杯大賽擂台

// 事件綁定：由 core.js 的 bindEvents() 依原本順序呼叫
function bindBwaCompetitionEvents() {
  // 1. 搏杯大賽擂台事件綁定
  document.getElementById("btnOpenBwaComp")?.addEventListener("click", () => window.openBwaCompModal());
  document.getElementById("bwaCompModalClose")?.addEventListener("click", () => window.closeBwaCompModal());
  document.getElementById("btnBwaCompThrow")?.addEventListener("click", () => throwBwaCompetition());
  document.getElementById("btnBwaCompReset")?.addEventListener("click", () => resetBwaCompetition());
  document.getElementById("btnBwaCompDownload")?.addEventListener("click", () => generateBwaCertificate());
  document.getElementById("chkGoldenBwa")?.addEventListener("change", (e) => {
    if (window.temple3d) window.temple3d.setBwaGoldenMaterial(e.target.checked);
  });

}

// ==========================================================================
// 1. 搏杯大賽 • 連得聖筊發財擂台 (Bwa Competition Logic)
// ==========================================================================
let bwaStreak = 0;
let bwaEarnedMerit = 0;
let bwaPersonalBest = parseInt(localStorage.getItem("temple_bwa_best") || "0", 10);
let bwaLeaderboard = JSON.parse(localStorage.getItem("temple_bwa_leaders") || "[]");
let isBwaCompRunning = false;

if (bwaLeaderboard.length === 0) {
  bwaLeaderboard = [
    { name: "大甲朝聖使", streak: 12, title: "🌟 天選信徒", date: "2026-03-15" },
    { name: "伺服器守護神", streak: 9, title: "👑 爐主福星", date: "2026-06-22" },
    { name: "悠閒的修行客", streak: 7, title: "✨ 神明降祥", date: "2026-08-01" },
    { name: "北港進香客", streak: 6, title: "✨ 神明降祥", date: "2026-09-19" },
    { name: "善信林居士", streak: 5, title: "✨ 神明降祥", date: "2026-10-10" }
  ];
}

window.openBwaCompModal = function() {
  const modal = document.getElementById("bwaCompModal");
  if (!modal) return;
  modal.classList.add("open");
  updateBwaCompUI();
  renderBwaLeaderboard();
  if (window.templeAudio) window.templeAudio.playBell(528);
};

window.closeBwaCompModal = function() {
  const modal = document.getElementById("bwaCompModal");
  if (modal) modal.classList.remove("open");
};

function getBwaTitleByStreak(streak) {
  if (streak >= 10) return "🌟 天選信徒";
  if (streak >= 8) return "👑 爐主福星";
  if (streak >= 5) return "✨ 神明降祥";
  if (streak >= 3) return "🌱 聚氣福緣";
  return "🌱 初入法門";
}

function updateBwaCompUI() {
  const sEl = document.getElementById("bwaCompStreak");
  const mEl = document.getElementById("bwaCompMerit");
  const pbEl = document.getElementById("bwaCompPersonalBest");
  const tbEl = document.getElementById("bwaCompTitleBadge");

  if (sEl) sEl.innerText = bwaStreak.toString();
  if (mEl) mEl.innerText = `+${bwaEarnedMerit}`;
  if (pbEl) pbEl.innerText = bwaPersonalBest.toString();
  if (tbEl) tbEl.innerText = getBwaTitleByStreak(bwaStreak);
}

function renderBwaLeaderboard() {
  const listEl = document.getElementById("bwaLeaderboardList");
  if (!listEl) return;
  listEl.innerHTML = bwaLeaderboard.slice(0, 5).map((item, idx) => `
    <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed rgba(255,255,255,0.08);">
      <span>${idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "🎖️"} 第 ${idx + 1} 名：【${item.name}】</span>
      <span style="color: #ffd700; font-weight: bold;">${item.streak} 連聖 (${item.title})</span>
    </div>
  `).join("");
}

function throwBwaCompetition() {
  if (isBwaCompRunning) return;
  isBwaCompRunning = true;

  const resText = document.getElementById("bwaCompResultText");
  if (resText) resText.innerText = "🎲 筊杯凌空拋起，飛騰轉運中…";

  if (window.temple3d) {
    window.temple3d.tossBwa(res => {
      isBwaCompRunning = false;
      const isHoly = (res.outcome1 === 0 && res.outcome2 === 1) || (res.outcome1 === 1 && res.outcome2 === 0);
      const isLaugh = (res.outcome1 === 0 && res.outcome2 === 0);

      if (isHoly) {
        bwaStreak++;
        const pts = bwaStreak * 25;
        bwaEarnedMerit += pts;

        if (bwaStreak > bwaPersonalBest) {
          bwaPersonalBest = bwaStreak;
          localStorage.setItem("temple_bwa_best", bwaPersonalBest.toString());
        }

        updateBwaCompUI();
        if (window.templeAudio) window.templeAudio.playBwaCompetitionChime(bwaStreak);

        if (resText) {
          resText.innerHTML = `🌓 <span style="color:#69f0ae;">聖筊！</span>【第 ${bwaStreak} 連聖】！神威默佑，福澤綿長！`;
        }

        if (bwaStreak >= 3) {
          const chk = document.getElementById("chkGoldenBwa");
          if (chk && !chk.checked) {
            chk.checked = true;
            if (window.temple3d) window.temple3d.setBwaGoldenMaterial(true);
          }
        }

        if (bwaStreak >= 5) {
          const bMsg = `🎉 善信【${state.avatarConfig.title || "善信"}】在搏杯大賽連續擲得【${bwaStreak} 聖筊】！${getBwaTitleByStreak(bwaStreak)}！`;
          if (window.liveTempleWall) window.liveTempleWall.addDanmaku(bMsg);
          if (typeof showFloatingDanmaku !== "undefined") showFloatingDanmaku(bMsg, "#ffd700");
        }
      } else {
        const finalStreak = bwaStreak;
        const finalMerit = bwaEarnedMerit;

        if (finalMerit > 0) {
          addMerit(finalMerit);
        }

        if (finalStreak >= 3) {
          const myName = state.avatarConfig.title || "善信";
          bwaLeaderboard.push({
            name: myName,
            streak: finalStreak,
            title: getBwaTitleByStreak(finalStreak),
            date: new Date().toISOString().split("T")[0]
          });
          bwaLeaderboard.sort((a, b) => b.streak - a.streak);
          bwaLeaderboard = bwaLeaderboard.slice(0, 8);
          localStorage.setItem("temple_bwa_leaders", JSON.stringify(bwaLeaderboard));
          renderBwaLeaderboard();
        }

        if (isLaugh) {
          if (window.templeAudio) window.templeAudio.playBell(330);
          if (resText) resText.innerHTML = `🌕 <span style="color:#ffd54f;">笑筊！</span>神明微笑未置可否。總計 ${finalStreak} 連聖，獲 +${finalMerit} 功德！`;
        } else {
          if (window.templeAudio) window.templeAudio.playBell(220);
          if (resText) resText.innerHTML = `🌑 <span style="color:#f87171;">陰筊！</span>神明諭示順其自然。總計 ${finalStreak} 連聖，獲 +${finalMerit} 功德！`;
        }

        bwaStreak = 0;
        bwaEarnedMerit = 0;
        updateBwaCompUI();
      }
    });
  }
}

function resetBwaCompetition() {
  bwaStreak = 0;
  bwaEarnedMerit = 0;
  updateBwaCompUI();
  const resText = document.getElementById("bwaCompResultText");
  if (resText) resText.innerText = "請誠心默禱，點擊下方「誠心起擲」重啟挑戰！";
}

function generateBwaCertificate() {
  const canvas = document.getElementById("bwaCompCertCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = 600, H = 800;
  canvas.width = W; canvas.height = H;

  // 仿古金黃宣紙底色
  ctx.fillStyle = "#fff8e7";
  ctx.fillRect(0, 0, W, H);

  // 雙重朱紅與金雙邊框
  ctx.strokeStyle = "#8b0000";
  ctx.lineWidth = 10;
  ctx.strokeRect(18, 18, W - 36, H - 36);

  ctx.strokeStyle = "#d4af37";
  ctx.lineWidth = 4;
  ctx.strokeRect(26, 26, W - 52, H - 52);

  // 標題
  ctx.fillStyle = "#8b0000";
  ctx.font = "bold 30px 'Songti TC', serif";
  ctx.textAlign = "center";
  ctx.fillText("賽博虛擬神殿 • 搏杯大賽榮譽敕令", W / 2, 85);

  ctx.font = "16px 'Songti TC', serif";
  ctx.fillStyle = "#666";
  ctx.fillText("天賜神聖 • 靈光感應 • 萬事亨通", W / 2, 115);

  ctx.strokeStyle = "#d4af37";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(70, 135); ctx.lineTo(W - 70, 135);
  ctx.stroke();

  ctx.font = "20px 'Songti TC', serif";
  ctx.fillStyle = "#222";
  ctx.textAlign = "left";
  const petitioner = state.avatarConfig.title || "善信";
  const streakCount = Math.max(1, bwaPersonalBest);
  const title = getBwaTitleByStreak(streakCount);

  const lines = [
    `善信尊諱：【 ${petitioner} 】`,
    `祈問神尊：天上聖母 • 五路財神 • 文昌帝君`,
    `大顯神威：連續擲得【 ${streakCount} 聖筊 】`,
    `蒙賜法位：【 ${title} 】`,
    ``,
    `敕曰：`,
    `誠心感格九天宮，聖筊連連兆運隆。`,
    `福祿壽康齊駢臻，神明默佑展奇功。`,
    ``,
    `頒發歲次：丙午年吉月吉日`,
    `特頒此敕，以昭神威靈驗，永垂吉庇！`
  ];

  lines.forEach((line, i) => {
    ctx.fillText(line, 75, 180 + i * 36);
  });

  // 硃砂大印
  ctx.save();
  ctx.strokeStyle = "#c2185b";
  ctx.lineWidth = 4;
  ctx.strokeRect(W - 190, H - 220, 120, 120);
  ctx.fillStyle = "#c2185b";
  ctx.font = "bold 24px 'Songti TC', serif";
  ctx.textAlign = "center";
  ctx.fillText("天上聖母", W - 130, H - 170);
  ctx.fillText("通真神寶", W - 130, H - 130);
  ctx.restore();

  const link = document.createElement("a");
  link.download = `賽博神殿_搏杯榮譽敕令_${petitioner}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
