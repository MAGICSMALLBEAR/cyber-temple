// app/side-halls.js - 偏殿巡禮：文昌閣、月老閣、財神殿科儀

// 事件綁定：由 core.js 的 bindEvents() 依原本順序呼叫
function bindSideHallEvents() {
  // 偏殿巡禮彈窗開關
  document.getElementById("btnOpenSideHalls").addEventListener("click", () => {
    window.openSideHallModal('wenchang');
  });

  document.getElementById("sideHallModalClose").addEventListener("click", () => {
    document.getElementById("sideHallModal").classList.remove("open");
  });

  // 偏殿分頁切換
  document.querySelectorAll(".side-hall-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      switchSideHallTab(btn.dataset.hall);
      window.templeAudio.playBell(528);
    });
  });

  // 文昌閣儀式
  document.getElementById("btnWenchangBrush").addEventListener("click", () => {
    addMerit(35);
    window.templeAudio.playConsecrationChime();
    spawnAvatarFloatingText("🖌️ 文昌智慧筆點亮！思路澄澈、才思敏捷");
    if (window.liveTempleWall) window.liveTempleWall.addDanmaku("🖌️ 恭敬點亮文昌帝君硃砂智慧筆，祈求才思敏捷、智慧大開！");
    setDockStatus("🎓 文昌硃砂智慧筆已點亮！思路澄澈，才思敏捷，功德 +35！");
  });

  document.getElementById("btnWenchangOde").addEventListener("click", () => {
    addMerit(50);
    window.templeAudio.playMuyuSound();
    window.templeAudio.playBell(528);
    spawnAvatarFloatingText("📜 廣積陰騭，天必福之！福蔭門第");
    if (window.liveTempleWall) window.liveTempleWall.addDanmaku("📜 虔誦文昌帝君陰騭文：諸惡莫作，眾善奉行，福蔭後代！");
    setDockStatus("📜 虔誦《文昌陰騭文》，心神安寧，廣積陰騭，功德 +50！");
  });

  document.getElementById("btnSubmitWenchangBlessing").addEventListener("click", () => {
    const candidate = document.getElementById("txtWenchangCandidate").value.trim() || state.avatarConfig.title || "善信";
    const exam = document.getElementById("txtWenchangExam").value.trim() || "功名應試";
    addMerit(40);
    window.templeAudio.playBell(660);
    spawnAvatarFloatingText(`🌟 魁星點斗！祝 ${candidate} 金榜題名`);
    if (window.liveTempleWall) window.liveTempleWall.broadcastPrayer({ name: candidate, loc: "文昌閣", text: `祈求文昌帝君加持：${exam} 金榜及第、名列前茅！` });
    setDockStatus(`🌟 文昌祈願疏文奉呈！祈佑善信 ${candidate} 應試 ${exam} 魁星題名，功德 +40！`);
  });

  // 月老閣儀式
  document.getElementById("btnYuelaoThread").addEventListener("click", () => {
    addMerit(35);
    window.templeAudio.playBell(660);
    spawnAvatarFloatingText("🧶 月老賜紅絲線：千里良緣，情深意長");
    if (window.liveTempleWall) window.liveTempleWall.addDanmaku("🧶 恭請月下老人牽紅絲線，祝天下有情人終成眷屬！");
    setDockStatus("❤️ 月老紅絲線已求得！千里暗牽，早結良緣，功德 +35！");
  });

  document.getElementById("btnYuelaoLock").addEventListener("click", () => {
    addMerit(50);
    window.templeAudio.playBell(720);
    spawnAvatarFloatingText("🔒 同心金鎖永扣：琴瑟和鳴，白頭偕老");
    if (window.liveTempleWall) window.liveTempleWall.addDanmaku("🔒 扣上同心金鎖：心心相印，永結鸞儔！");
    setDockStatus("💕 同心金鎖已扣合！恩愛兩不疑，白頭偕老，功德 +50！");
  });

  document.getElementById("btnSubmitYuelaoBlessing").addEventListener("click", () => {
    const self = document.getElementById("txtYuelaoSelf").value.trim() || state.avatarConfig.title || "善信";
    const target = document.getElementById("txtYuelaoTarget").value.trim() || "相知相惜之善緣伴侶";
    addMerit(40);
    window.templeAudio.playBell(660);
    spawnAvatarFloatingText(`💕 天賜良緣！祈佑 ${self} 締結善緣`);
    if (window.liveTempleWall) window.liveTempleWall.broadcastPrayer({ name: self, loc: "月老閣", text: `祈求月下老人牽線：與 ${target} 結締良緣、恩愛永固！` });
    setDockStatus(`💕 月老牽線疏文奉呈！祈佑善信 ${self} 早結天賜良緣，功德 +40！`);
  });

  // 財神殿儀式
  document.getElementById("btnCaishenIngot").addEventListener("click", () => {
    addMerit(35);
    window.templeAudio.playCoinSound();
    spawnAvatarFloatingText("🪙 萬兩元寶聚寶：財源滾滾，日進斗金");
    if (window.liveTempleWall) window.liveTempleWall.addDanmaku("🪙 撫摸五路財神萬兩純金大元寶，八方進寶、財庫飽滿！");
    setDockStatus("💰 萬兩黃金元寶聚寶！財氣充盈，利路亨通，功德 +35！");
  });

  document.getElementById("btnCaishenWater").addEventListener("click", () => {
    addMerit(50);
    window.templeAudio.playChime(880);
    spawnAvatarFloatingText("💧 恭請五路發財水：甘露潤澤，生財有道");
    if (window.liveTempleWall) window.liveTempleWall.addDanmaku("💧 迎請五路財神開運發財水，甘霖潤澤、富貴吉祥！");
    setDockStatus("💧 五路開運發財水恭請加持！正偏財氣皆旺，功德 +50！");
  });

  document.getElementById("btnCaishenTiger").addEventListener("click", () => {
    addMerit(40);
    window.templeAudio.playBell(440);
    spawnAvatarFloatingText("🐯 金虎爺咬錢避煞：正偏財旺，諸邪退避");
    if (window.liveTempleWall) window.liveTempleWall.addDanmaku("🐯 金虎將軍顯神威咬錢送寶，避除凶煞、大發利市！");
    setDockStatus("🐯 金虎爺咬錢庇佑！避凶化煞，偏財亨通，功德 +40！");
  });

  document.getElementById("btnSubmitCaishenBlessing").addEventListener("click", () => {
    const wish = document.getElementById("txtCaishenWish").value.trim() || "日進斗金、財庫充盈";
    const name = state.avatarConfig.title || "善信";
    addMerit(40);
    window.templeAudio.playBell(660);
    spawnAvatarFloatingText(`💰 八方招財！祈佑 ${wish}`);
    if (window.liveTempleWall) window.liveTempleWall.broadcastPrayer({ name, loc: "財神殿", text: `祈求五路財神恩賜：${wish}、生意興隆！` });
    setDockStatus(`💰 五路財神疏文奉呈！祈佑所求 ${wish} 八方聚寶，功德 +40！`);
  });

}

// ==========================================
// 偏殿室內探索與專屬祈福儀式邏輯 (Side Halls)
// ==========================================

function spawnAvatarFloatingText(text) {
  if (!temple3d) return;
  const pos = temple3d.avatar ? temple3d.avatar.position.clone().add(new THREE.Vector3(0, 1.6, 0)) : new THREE.Vector3(0, 2, 0);
  temple3d.spawn3DFloatingText(text, pos);
}

window.openSideHallModal = function(hallKey = 'wenchang') {
  const modal = document.getElementById("sideHallModal");
  if (!modal) return;
  switchSideHallTab(hallKey);
  modal.classList.add("open");
  window.templeAudio.playBell(660);
};

function switchSideHallTab(hallKey) {
  document.querySelectorAll(".side-hall-tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.hall === hallKey);
  });
  const pWenchang = document.getElementById("hallPanelWenchang");
  const pYuelao = document.getElementById("hallPanelYuelao");
  const pCaishen = document.getElementById("hallPanelCaishen");
  if (pWenchang) pWenchang.style.display = hallKey === "wenchang" ? "flex" : "none";
  if (pYuelao) pYuelao.style.display = hallKey === "yuelao" ? "flex" : "none";
  if (pCaishen) pCaishen.style.display = hallKey === "caishen" ? "flex" : "none";
}
