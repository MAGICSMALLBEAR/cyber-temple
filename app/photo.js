// app/photo.js - 宮廟拍立得留影坊

// 事件綁定：由 core.js 的 bindEvents() 依原本順序呼叫
function bindPhotoEvents() {
  // 拍立得留影坊彈窗開關
  document.getElementById("btnOpenPhoto").addEventListener("click", () => {
    window.openPhotoModal();
  });

  document.getElementById("photoModalClose").addEventListener("click", () => {
    document.getElementById("photoModal").classList.remove("open");
  });

}

// ==========================================================================
// 1. 宮廟拍立得留影坊 (Temple Polaroid Camera & Photo Mode)
// ==========================================================================
let currentSnapshotImage = null;

window.openPhotoModal = function() {
  const modal = document.getElementById("photoModal");
  if (!modal) return;
  modal.classList.add("open");
  if (window.templeAudio) window.templeAudio.playCameraShutter();
  snapCurrentPhoto();
};

function snapCurrentPhoto() {
  if (!temple3d) return;
  const dataUrl = temple3d.takeSnapshot();
  const img = new Image();
  img.onload = () => {
    currentSnapshotImage = img;
    renderPhotoCanvas();
  };
  img.src = dataUrl;
}

const btnSnapPhoto = document.getElementById("btnSnapPhoto");
if (btnSnapPhoto) {
  btnSnapPhoto.addEventListener("click", () => {
    if (window.templeAudio) window.templeAudio.playCameraShutter();
    snapCurrentPhoto();
    setDockStatus("📸 拍立得快照已更新！已抓取當前神殿視角。");
  });
}

const selectPhotoFrame = document.getElementById("selectPhotoFrame");
if (selectPhotoFrame) selectPhotoFrame.addEventListener("change", () => renderPhotoCanvas());

const selectPhotoFilter = document.getElementById("selectPhotoFilter");
if (selectPhotoFilter) selectPhotoFilter.addEventListener("change", () => renderPhotoCanvas());

const txtPhotoInscription = document.getElementById("txtPhotoInscription");
if (txtPhotoInscription) txtPhotoInscription.addEventListener("input", () => renderPhotoCanvas());

function renderPhotoCanvas() {
  const canvas = document.getElementById("photoCanvas");
  if (!canvas || !currentSnapshotImage) return;
  const ctx = canvas.getContext("2d");
  const W = 600;
  const H = 750;
  canvas.width = W;
  canvas.height = H;

  const frameType = selectPhotoFrame ? selectPhotoFrame.value : "polaroid";
  const filterType = selectPhotoFilter ? selectPhotoFilter.value : "normal";
  const inscription = (txtPhotoInscription && txtPhotoInscription.value.trim()) ? txtPhotoInscription.value.trim() : "合境平安 萬福駢臻";

  if (frameType === "polaroid") {
    // 經典復古拍立得白色相紙
    ctx.fillStyle = "#faf7f2";
    ctx.fillRect(0, 0, W, H);

    // 相片陰影
    ctx.fillStyle = "#e0d9cd";
    ctx.fillRect(36, 36, 528, 528);

    // 繪製中心截圖
    ctx.drawImage(currentSnapshotImage, 40, 40, 520, 520);

    // 底邊手寫風格題字
    ctx.fillStyle = "#3e2723";
    ctx.font = "bold 24px 'Songti TC', serif";
    ctx.textAlign = "left";
    ctx.fillText(`🏮 ${inscription}`, 45, 620);

    ctx.font = "16px 'Songti TC', serif";
    ctx.fillStyle = "#795548";
    const dateStr = new Date().toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" });
    ctx.fillText(`歲次丙午年 • 賽博虛擬神殿 留念 (${dateStr})`, 45, 658);
    ctx.fillText(`善信：【 ${state.avatarConfig.title || "悠閒的信眾"} 】 祈安敬奉`, 45, 690);

    // 右下角硃砂法印
    drawCinnabarSeal(ctx, 470, 595, 90, "神威普照", "賽博神殿");
  } else if (frameType === "postcard") {
    // 宮闈雙龍金碧明信片
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#4a1212");
    grad.addColorStop(1, "#1e0606");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // 金色雙邊框
    ctx.strokeStyle = "#ffd54f";
    ctx.lineWidth = 6;
    ctx.strokeRect(18, 18, W - 36, H - 36);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(26, 26, W - 52, H - 52);

    // 頂部金字匾額
    ctx.fillStyle = "#ffd54f";
    ctx.font = "bold 22px 'Songti TC', serif";
    ctx.textAlign = "center";
    ctx.fillText("⛩️ 賽 博 虛 擬 神 殿 • 祈 安 留 影 明 信 片 ⛩️", W / 2, 60);

    // 照片繪製
    ctx.drawImage(currentSnapshotImage, 38, 80, 524, 480);

    // 底部題字
    ctx.fillStyle = "#ffe082";
    ctx.font = "bold 26px 'Songti TC', serif";
    ctx.fillText(`【 ${inscription} 】`, W / 2, 615);

    ctx.font = "18px 'Songti TC', serif";
    ctx.fillStyle = "#ebd197";
    ctx.fillText(`十方信眾：${state.avatarConfig.title || "善信"}  •  萬佛加被 福祿駢臻`, W / 2, 655);

    drawCinnabarSeal(ctx, 460, 630, 85, "太歲安康", "福澤綿長");
  } else {
    // 賽博神威框
    ctx.fillStyle = "#0a0e14";
    ctx.fillRect(0, 0, W, H);

    // 霓虹金青外框
    ctx.strokeStyle = "#00e5ff";
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, W - 40, H - 40);
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 1;
    ctx.strokeRect(28, 28, W - 56, H - 56);

    ctx.drawImage(currentSnapshotImage, 36, 36, 528, 530);

    ctx.fillStyle = "#00e5ff";
    ctx.font = "bold 20px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`CYBER TEMPLE 3D // SNAPSHOT_ID_${Date.now().toString().slice(-6)}`, 40, 605);

    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 24px 'Songti TC', serif";
    ctx.fillText(`✨ ${inscription}`, 40, 645);

    ctx.fillStyle = "#ffffff";
    ctx.font = "16px monospace";
    ctx.fillText(`AVATAR: [${state.avatarConfig.title || "PILGRIM"}]  MERIT: ${state.meritCount}`, 40, 680);

    drawCinnabarSeal(ctx, 470, 595, 88, "靈光永駐", "賽博真符");
  }

  // 套用濾鏡
  if (filterType === "warm") {
    ctx.fillStyle = "rgba(255, 180, 50, 0.16)";
    ctx.fillRect(0, 0, W, H);
  } else if (filterType === "vintage") {
    ctx.fillStyle = "rgba(180, 130, 80, 0.22)";
    ctx.fillRect(0, 0, W, H);
  } else if (filterType === "radiance") {
    ctx.fillStyle = "rgba(255, 235, 100, 0.18)";
    ctx.fillRect(0, 0, W, H);
  }
}

function drawCinnabarSeal(ctx, x, y, size, line1, line2) {
  ctx.save();
  ctx.fillStyle = "#c62828";
  ctx.strokeStyle = "#c62828";
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, size, size);
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 4, y + 4, size - 8, size - 8);

  ctx.fillStyle = "#c62828";
  ctx.font = `bold ${Math.floor(size * 0.22)}px 'Songti TC', serif`;
  ctx.textAlign = "center";
  ctx.fillText(line1, x + size / 2, y + size * 0.42);
  ctx.fillText(line2, x + size / 2, y + size * 0.78);
  ctx.restore();
}

const btnDownloadPhoto = document.getElementById("btnDownloadPhoto");
if (btnDownloadPhoto) {
  btnDownloadPhoto.addEventListener("click", () => {
    const canvas = document.getElementById("photoCanvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = `賽博虛擬神殿_拍立得明信片_${Date.now()}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
    setDockStatus("💾 拍立得明信片已成功下載！可分享結緣至社群。");
    if (window.templeAudio) window.templeAudio.playBell(660);
  });
}

const btnSharePhotoToWall = document.getElementById("btnSharePhotoToWall");
if (btnSharePhotoToWall) {
  btnSharePhotoToWall.addEventListener("click", () => {
    const title = (txtPhotoInscription && txtPhotoInscription.value.trim()) || "合境平安";
    if (window.liveTempleWall) {
      window.liveTempleWall.addDanmaku(`📷 善信【${state.avatarConfig.title || "善信"}】在神殿拍攝留影拍立得：${title}！`);
    }
    setDockStatus("🏮 拍立得留影已同步發布至神殿香火牆！同殿信眾皆可共睹勝景。");
    if (window.templeAudio) window.templeAudio.playConsecrationChime();
  });
}
