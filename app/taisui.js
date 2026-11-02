// app/taisui.js - 安太歲與元辰斗燈

// 事件綁定：由 core.js 的 bindEvents() 依原本順序呼叫
function bindTaiSuiEvents() {
  // 太歲元辰殿彈窗開關
  document.getElementById("btnOpenTaiSui").addEventListener("click", () => {
    window.openTaiSuiModal();
  });

  document.getElementById("taiSuiModalClose").addEventListener("click", () => {
    document.getElementById("taiSuiModal").classList.remove("open");
  });

}

// ==========================================================================
// 2. 線上安太歲與元辰斗燈 (Tai Sui & Yuan Chen Shrine)
// ==========================================================================
const ZODIAC_DATA = {
  horse: { name: "馬 (午)", status: "值太歲 (本命坐太歲)", badge: "值太歲", desc: "本命值太歲，運勢起伏多變。宜虔誠安奉值年太歲星君，點亮本命元辰斗燈，化解太歲沖煞，護佑整年安康吉祥。", guardian: "大勢至菩薩" },
  rat: { name: "鼠 (子)", status: "正沖太歲 (歲破大沖)", badge: "正沖太歲", desc: "子午相沖，歲破正沖！衝動波折易有變故。務必誠心安奉值年太歲，以元辰長生斗燈固本培元，化險為夷、辟邪招祥。", guardian: "千手觀音" },
  ox: { name: "牛 (丑)", status: "害太歲 (是非小人化解)", badge: "害太歲", desc: "丑午相害，主易生阻滯與是非牽連。安奉太歲星君化解暗害，點亮長生斗燈以七星劍鎮煞，心開運泰。", guardian: "虛空藏菩薩" },
  rabbit: { name: "兔 (卯)", status: "破太歲 (破損波折預防)", badge: "破太歲", desc: "卯午相破，主防物損人傷、財氣漏失。安奉太歲以祈保本命元辰光彩，聚氣招吉，諸事圓融。", guardian: "文殊菩薩" },
  rooster: { name: "雞 (酉)", status: "偏沖太歲 (偏煞化解)", badge: "偏沖太歲", desc: "酉金遇午火，偏煞相克。宜安奉太歲星君化煞增福，心平氣和，凡事穩中求勝、吉曜護佑。", guardian: "不動明王" },
  tiger: { name: "虎 (寅)", status: "三合拱照 (吉星高照)", badge: "吉星拱照", desc: "寅午戌三合火局！貴人照曜，運途順遂。安奉太歲與元辰斗燈錦上添花，添福增壽，廣開財祿。", guardian: "虛空藏菩薩" },
  dog: { name: "狗 (戌)", status: "三合拱照 (福德齊臨)", badge: "吉星拱照", desc: "戌與午成三合，福星臨門、善緣廣進。安奉太歲星君感恩祈福，保佑家宅清吉、元辰光彩！", guardian: "阿彌陀佛" },
  goat: { name: "羊 (未)", status: "六合貴人 (大吉大利)", badge: "六合吉慶", desc: "午未六合！天地交泰，逢凶化吉、萬事亨通。安奉太歲答謝神恩，福祿綿長、四時無災。", guardian: "大日如來" },
  dragon: { name: "龍 (辰)", status: "平順吉安 (本命安穩)", badge: "平順吉安", desc: "歲運安詳，四時康泰。安奉太歲與元辰斗燈可固元培德，神光覆護，增益本命福報。", guardian: "普賢菩薩" },
  snake: { name: "蛇 (巳)", status: "平順祥和 (步步高升)", badge: "平順祥和", desc: "巳午比和，身心安適。虔奉太歲大將軍護持本命，智慧開朗，功名事業蒸蒸日上。", guardian: "普賢菩薩" },
  monkey: { name: "猴 (申)", status: "平順清吉 (吉慶臨門)", badge: "平順清吉", desc: "金火交融，安分守己則百福駢臻。安太歲以保四時順暢、百病不生、財源廣進。", guardian: "大日如來" },
  pig: { name: "豬 (亥)", status: "平順康寧 (祥光普照)", badge: "平順康寧", desc: "水火既濟，心平氣和。安奉太歲以祈元辰常耀，闔家安泰，災消福至。", guardian: "阿彌陀佛" }
};

window.openTaiSuiModal = function() {
  const modal = document.getElementById("taiSuiModal");
  if (!modal) return;
  const txtName = document.getElementById("txtTaiSuiName");
  if (txtName) txtName.value = state.avatarConfig.title || "善信";
  updateTaiSuiCard();
  modal.classList.add("open");
  if (window.templeAudio) window.templeAudio.playBell(560);
};

function updateTaiSuiCard() {
  const sel = document.getElementById("selectZodiac");
  const key = sel ? sel.value : "horse";
  const data = ZODIAC_DATA[key] || ZODIAC_DATA.horse;

  const titleEl = document.getElementById("cardZodiacTitle");
  const badgeEl = document.getElementById("badgeTaiSuiStatus");
  const descEl = document.getElementById("cardTaiSuiDesc");
  const guardEl = document.getElementById("cardGuardianName");

  if (titleEl) titleEl.innerText = `${data.name} • 歲次丙午歲運`;
  if (badgeEl) {
    badgeEl.innerText = data.badge;
    badgeEl.style.background = (data.badge.includes("值") || data.badge.includes("沖")) ? "#b71c1c" : "#2e7d32";
  }
  if (descEl) descEl.innerText = data.desc;
  if (guardEl) guardEl.innerText = data.guardian;
}

const selectZodiac = document.getElementById("selectZodiac");
if (selectZodiac) selectZodiac.addEventListener("change", updateTaiSuiCard);

const btnSubmitTaiSui = document.getElementById("btnSubmitTaiSui");
if (btnSubmitTaiSui) {
  btnSubmitTaiSui.addEventListener("click", () => {
    if (state.meritCount < 50) {
      setDockStatus("⚠️ 安奉太歲星君與元辰斗燈需 50 功德，請先勤敲木魚或敬香積累功德！");
      if (window.templeAudio) window.templeAudio.playMuyuSound();
      return;
    }

    addMerit(-50);
    const name = (document.getElementById("txtTaiSuiName")?.value.trim()) || "善信";
    const zodiacKey = selectZodiac ? selectZodiac.value : "horse";
    const zData = ZODIAC_DATA[zodiacKey] || ZODIAC_DATA.horse;
    const generalName = "章詞大將軍";

    if (temple3d) {
      temple3d.lightTaiSuiDipper(name, zData.name, generalName);
    }

    renderTaiSuiCertificate(name, zData.name, zData.guardian, generalName);

    const resSec = document.getElementById("taiSuiResultSection");
    if (resSec) resSec.style.display = "block";
    setDockStatus(`🏮 恭賀善信【${name}】安奉值年太歲大將軍圓滿！本命元辰斗燈長耀！`);
  });
}

function renderTaiSuiCertificate(name, zodiacName, guardian, generalName) {
  const canvas = document.getElementById("taiSuiCertificateCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = 560;
  const H = 780;
  canvas.width = W;
  canvas.height = H;

  // 1. 皇家黃綾錦盒背景
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#5a3a0e");
  grad.addColorStop(0.5, "#3d2406");
  grad.addColorStop(1, "#261502");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 雙金框與回紋
  ctx.strokeStyle = "#ffd54f";
  ctx.lineWidth = 8;
  ctx.strokeRect(20, 20, W - 40, H - 40);
  ctx.lineWidth = 2;
  ctx.strokeRect(30, 30, W - 60, H - 60);

  // 2. 標題：安奉太歲植福文疏
  ctx.fillStyle = "#ffd54f";
  ctx.font = "bold 26px 'Songti TC', serif";
  ctx.textAlign = "center";
  ctx.fillText("歲次丙午年安奉太歲星君祈安植福文疏", W / 2, 75);

  ctx.strokeStyle = "rgba(255, 213, 79, 0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, 95);
  ctx.lineTo(W - 60, 95);
  ctx.stroke();

  // 3. 文疏主文
  ctx.fillStyle = "#fff8e1";
  ctx.font = "18px 'Songti TC', serif";
  ctx.textAlign = "left";
  const startX = 60;
  let curY = 140;

  const lines = [
    `伏 以`,
    `天運昌隆，吉星拱照；神威廣大，元辰光彩。`,
    `今據 中華民國 虔誠奉道信眾：【 ${name} 】`,
    `歲次生肖：【 ${zodiacName} 】 吉旦立案，`,
    `專誠恭候 丙午年值年太歲星君：【 ${generalName} 】尊神，`,
    `並承 本命元辰守護神：【 ${guardian} 】垂慈覆護。`,
    `切念 凡身寄世，運途亨險難定；星宿流轉，陰陽造化無常。`,
    `今特於 賽博虛擬神殿太歲元辰殿 虔備五穀長生斗燈、`,
    `七星寶劍、辟邪神印，虔具文疏，恭叩神恩。`,
    `祈 求：`,
    `本命元辰光芒永耀，災星退避，吉曜照臨；`,
    `四時無災，八節有慶，出入平安，貴人輔弼；`,
    `逢凶化吉，福運齊臻，闔家泰寧，所求順遂！`,
    `天運歲次丙午年孟春吉旦  具疏呈奏`
  ];

  lines.forEach(line => {
    ctx.fillText(line, startX, curY);
    curY += 34;
  });

  // 4. 三大硃砂印章
  drawCinnabarSeal(ctx, 80, 640, 80, "太歲統御", "天曹真宰");
  drawCinnabarSeal(ctx, 240, 640, 80, "元辰長耀", "本命光彩");
  drawCinnabarSeal(ctx, 400, 640, 80, "虛擬神殿", "具疏奉申");
}

const btnDownloadTaiSuiCert = document.getElementById("btnDownloadTaiSuiCert");
if (btnDownloadTaiSuiCert) {
  btnDownloadTaiSuiCert.addEventListener("click", () => {
    const canvas = document.getElementById("taiSuiCertificateCanvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = `安奉太歲植福文疏_${Date.now()}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
    setDockStatus("💾 安太歲植福文疏已下載！保佑歲運安康、元辰光彩。");
    if (window.templeAudio) window.templeAudio.playBell(720);
  });
}
