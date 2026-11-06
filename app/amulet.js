// app/amulet.js - 數位開光靈符

// 事件綁定：由 core.js 的 bindEvents() 依原本順序呼叫
function bindAmuletOpenEvent() {
  // 功德福閣 • 數位平安開光靈符彈窗開關
  document.getElementById("btnOpenAmulet").addEventListener("click", () => {
    window.openAmuletModal();
  });

}

function bindAmuletEvents() {
  // 靈符卡片選取
  document.querySelectorAll(".amulet-card-item").forEach(card => {
    card.addEventListener("click", () => {
      if (document.getElementById("btnConsecrateAmulet").disabled) return;
      document.querySelectorAll(".amulet-card-item").forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      selectedAmuletType = card.dataset.amulet;
      document.querySelectorAll(".amulet-card-item").forEach(c => c.setAttribute("aria-pressed", String(c === card)));
      document.getElementById("amuletResultSection").style.display = "none";
      window.templeAudio.playBell(600);
    });
  });

  // 靈符過香爐開光三圈儀式
  document.getElementById("btnConsecrateAmulet").addEventListener("click", () => {
    if (document.getElementById("btnConsecrateAmulet").disabled) return;
    if (state.meritCount < 20) {
      setDockStatus("⚠️ 請領靈符開光需 20 功德，請先敬香或勤敲木魚積累功德！");
      window.templeAudio.playMuyuSound();
      return;
    }
    addMerit(-20);
    const consecratedType = selectedAmuletType;
    const details = {
      petitioner: document.getElementById("txtAmuletPetitioner").value.trim() || state.avatarConfig.title || "善信",
      wish: document.getElementById("txtAmuletWish").value.trim() || getDefaultAmuletWish(consecratedType)
    };

    const statusText = document.getElementById("consecrateStatus");
    const animArea = document.getElementById("consecrateCenserAnim");
    const btn = document.getElementById("btnConsecrateAmulet");
    const resultSec = document.getElementById("amuletResultSection");

    btn.disabled = true;
    document.querySelectorAll(".amulet-card-item").forEach(c => { c.disabled = true; });
    document.getElementById("txtAmuletPetitioner").readOnly = true;
    document.getElementById("txtAmuletWish").readOnly = true;
    document.getElementById("amuletModal").setAttribute("aria-busy", "true");
    resultSec.style.display = "none";
    animArea.style.display = "flex";

    window.templeAudio.playConsecrationChime();

    statusText.innerHTML = "🌀 <b>過香爐第 1 圈</b> • 迎神降真，淨化身心...";
    setTimeout(() => {
      statusText.innerHTML = "🌀 <b>過香爐第 2 圈</b> • 仙真威光，法力灌注...";
    }, 1000);

    setTimeout(() => {
      statusText.innerHTML = "🌀 <b>過香爐第 3 圈</b> • 鈐蓋朱砂大印，神光煥發！";
    }, 2000);

    setTimeout(() => {
      animArea.style.display = "none";
      btn.disabled = false;
      document.querySelectorAll(".amulet-card-item").forEach(c => { c.disabled = false; });
      document.getElementById("txtAmuletPetitioner").readOnly = false;
      document.getElementById("txtAmuletWish").readOnly = false;
      document.getElementById("amuletModal").setAttribute("aria-busy", "false");
      statusText.innerHTML = "✨ <b>開光圓滿</b> • 靈符已具備神威守護！可下載桌布或隨身佩戴。";
      window.templeAudio.playBell(792);

      window.templeInventory?.addAmulet(consecratedType);
      completedAmulet = { type: consecratedType, ...details };
      drawAmuletCanvas(consecratedType, details);
      resultSec.style.display = "block";

      spawnAvatarFloatingText("🛡️ 平安靈符開光大吉！神聖法印護體！");
      if (window.liveTempleWall) {
        window.liveTempleWall.addDanmaku(`🛡️ 善信圓滿求取【${getAmuletName(consecratedType)}】，神威護佑平安！`);
      }
      setDockStatus(`✨ 【${getAmuletName(consecratedType)}】已過爐開光圓滿！已放入背包，可掛在胸前。`);
    }, 3100);
  });

  // 下載手機桌布靈符
  document.getElementById("btnDownloadAmuletPng").addEventListener("click", () => {
    const canvas = document.getElementById("amuletPreviewCanvas");
    if (!canvas || !completedAmulet) return;
    const link = document.createElement("a");
    link.download = `賽博神殿_開光護身靈符_${getAmuletName(completedAmulet.type)}_${completedAmulet.petitioner}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    window.templeAudio.playBell(660);
  });

  // 隨身佩戴護身靈光 (3D神光)
  document.getElementById("btnEquipAmuletAura").addEventListener("click", () => {
    if (completedAmulet && temple3d && temple3d.avatar) {
      if (temple3d.avatar.equipAmulet(completedAmulet.type) === false) return;
      window.templeAudio.playConsecrationChime();
      spawnAvatarFloatingText("✨ 護體神光已啟動！金光靈動圍繞分身");
      setDockStatus(`✨ 已隨身佩戴【${getAmuletName(completedAmulet.type)}】，3D 護身神光旋繞護佑！`);
    }
  });

}

// ==========================================
// 功德福閣 • 數位開光靈符求取系統 (Amulet System)
// ==========================================

let selectedAmuletType = "mazu";
let completedAmulet = null;

window.openAmuletModal = function() {
  const modal = document.getElementById("amuletModal");
  if (!modal) return;
  const petitioner = document.getElementById("txtAmuletPetitioner");
  if (petitioner && !petitioner.value) {
    petitioner.value = state.avatarConfig.title || "善信";
  }
  modal.classList.add("open");
  window.templeAudio.playBell(528);
};

function getDefaultAmuletWish(key) {
  const map = {
    mazu: "行車平順，逢凶化吉，闔家安泰",
    wenchang: "文思泉湧，考運亨通，金榜及第",
    caishen: "日進斗金，生意興隆，財庫豐盈",
    yuelao: "千里良緣，情投意合，早結連理",
    guaiguai: "伺服器綠燈常亮，零當機無Bug",
    guanyin: "慈悲護念，身心清淨，闔家平安",
    guangong: "正氣護身，信義立業，出入平安",
    tudigong: "安居樂業，福德綿長，鄉里平安",
    taisui: "吉星拱照，化解災煞，百邪不侵"
  };
  return map[key] || "祈求善信萬事如意、福祿雙全";
}

function getAmuletName(key) {
  const map = {
    mazu: "天上聖母平安護身符",
    wenchang: "文昌帝君狀元及第符",
    caishen: "五路財神進寶發財符",
    yuelao: "月下老人天賜真愛符",
    guaiguai: "科技綠色乖乖守護符",
    guanyin: "觀世音菩薩慈悲護身符",
    guangong: "關聖帝君忠義護身符",
    tudigong: "福德正神安居平安符",
    taisui: "值年太歲化煞安康符"
  };
  return map[key] || "護身開光靈符";
}

function drawAmuletCanvas(amuletKey, details = {}) {
  const canvas = document.getElementById("amuletPreviewCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = 720;
  const H = 1280;
  canvas.width = W;
  canvas.height = H;

  const petitioner = details.petitioner || document.getElementById("txtAmuletPetitioner")?.value.trim() || state.avatarConfig.title || "善信";
  const wish = details.wish || document.getElementById("txtAmuletWish")?.value.trim() || getDefaultAmuletWish(amuletKey);

  // 1. 符紙主底色 (不同神明專屬氣場)
  const bgConfigs = {
    mazu: { c1: "#5c1818", c2: "#220808", border: "#f5c542", seal: "天上聖母", sealSub: "神威普照" },
    wenchang: { c1: "#3b1a59", c2: "#19082b", border: "#f5c542", seal: "文昌魁星", sealSub: "金榜及第" },
    caishen: { c1: "#61400e", c2: "#2b1a03", border: "#ffe066", seal: "五路財神", sealSub: "八方進寶" },
    yuelao: { c1: "#63172e", c2: "#2b0713", border: "#ff99bb", seal: "月下老人", sealSub: "天賜良緣" },
    guaiguai: { c1: "#0f4222", c2: "#041a0c", border: "#44ee77", seal: "科技乖乖", sealSub: "綠燈永駐" },
    guanyin: { c1: "#245a58", c2: "#081e25", border: "#d9f1dc", seal: "觀音護念", sealSub: "慈悲清淨" },
    guangong: { c1: "#214b34", c2: "#0b1b12", border: "#f0c466", seal: "關聖帝君", sealSub: "忠義護身" },
    tudigong: { c1: "#75502b", c2: "#291a0b", border: "#ffe0a0", seal: "福德正神", sealSub: "安居樂業" },
    taisui: { c1: "#471010", c2: "#1a0404", border: "#ffd700", seal: "太歲星君", sealSub: "辟邪化煞" }
  };
  const cfg = bgConfigs[amuletKey] || bgConfigs.mazu;

  const grad = ctx.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, 680);
  grad.addColorStop(0, cfg.c1);
  grad.addColorStop(1, cfg.c2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 符紙內襯微光
  ctx.fillStyle = "rgba(255, 235, 170, 0.06)";
  ctx.fillRect(40, 40, W - 80, H - 80);

  // 2. 雙重神聖金框與回紋四角
  ctx.strokeStyle = cfg.border;
  ctx.lineWidth = 14;
  ctx.strokeRect(36, 36, W - 72, H - 72);

  ctx.lineWidth = 3;
  ctx.strokeRect(52, 52, W - 104, H - 104);

  // 四角吉祥如意紋飾
  const drawCorner = (cx, cy, sx, sy) => {
    ctx.strokeStyle = cfg.border;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy + sy * 36);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + sx * 36, cy);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx + sx * 16, cy + sy * 16, 7, 0, Math.PI * 2);
    ctx.fillStyle = cfg.border;
    ctx.fill();
  };
  drawCorner(65, 65, 1, 1);
  drawCorner(W - 65, 65, -1, 1);
  drawCorner(65, H - 65, 1, -1);
  drawCorner(W - 65, H - 65, -1, -1);

  // 3. 符頭 (道家三清三圓點點化)
  ctx.fillStyle = "#ffe885";
  ctx.textAlign = "center";
  const dots = [-50, 0, 50];
  dots.forEach(offset => {
    ctx.beginPath();
    ctx.arc(W / 2 + offset, 115, 11, 0, Math.PI * 2);
    ctx.fill();
  });

  // 「勅 令」
  ctx.font = "bold 82px 'Songti TC', serif";
  ctx.fillText("勅  令", W / 2, 225);

  // 4. 符身主文 (真靈寶符神號)
  const talismanTitles = {
    mazu: "天上聖母護國庇民安泰真符",
    wenchang: "文昌梓潼帝君魁星及第金榜真符",
    caishen: "五路武財神趙公明八方聚寶真符",
    yuelao: "月下老人千里牽線天賜真愛符",
    guaiguai: "科技守護綠色乖乖機房零當機真符",
    guanyin: "觀世音菩薩慈悲護念清淨平安符",
    guangong: "關聖帝君忠義護身正氣平安符",
    tudigong: "福德正神安居樂業福德平安符",
    taisui: "甲子太歲尊神辟邪消災化煞保命符"
  };

  const titleStr = talismanTitles[amuletKey] || talismanTitles.mazu;
  const titleStep = Math.min(48, 510 / Math.max(1, titleStr.length - 1));
  ctx.font = `bold ${Math.min(44, titleStep * 0.85)}px 'Songti TC', serif`;
  ctx.fillStyle = "#ffffff";

  for (let i = 0; i < titleStr.length; i++) {
    ctx.fillText(titleStr[i], W / 2, 305 + i * titleStep);
  }

  // 5. 符膽天罡神印星芒
  ctx.save();
  ctx.strokeStyle = "rgba(255, 232, 133, 0.7)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(W / 2, 915, 65, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = "bold 38px 'Songti TC', serif";
  ctx.fillStyle = "#ffe885";
  ctx.fillText("罡", W / 2, 928);
  ctx.restore();

  // 6. 朱砂法印 (Cinnabar Red Seal)
  ctx.save();
  const sealSize = 175;
  const sealX = W / 2 - sealSize / 2;
  const sealY = 965;
  ctx.fillStyle = "#bb1b1b";
  ctx.strokeStyle = "#bb1b1b";
  ctx.lineWidth = 8;
  ctx.strokeRect(sealX, sealY, sealSize, sealSize);
  ctx.lineWidth = 2;
  ctx.strokeRect(sealX + 8, sealY + 8, sealSize - 16, sealSize - 16);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 34px 'Songti TC', serif";
  ctx.fillText(cfg.seal, W / 2, sealY + 68);
  ctx.fillText(cfg.sealSub, W / 2, sealY + 128);
  ctx.restore();

  // 7. 善信與祈願名款
  ctx.fillStyle = "rgba(255, 235, 180, 0.9)";
  ctx.font = "26px 'Songti TC', serif";
  ctx.fillText(`善信名款：【 ${petitioner} 】 虔誠請領`, W / 2, 1185, W - 100);
  ctx.font = "21px 'Songti TC', serif";
  ctx.fillText(`祝禱所求：${wish}`, W / 2, 1222, W - 100);
}
