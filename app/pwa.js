// app/pwa.js - PWA：Service Worker 註冊與安裝按鈕

// ==========================================
// PWA：離線快取與安裝到主畫面
// ==========================================
// Service Worker 只在 https 或 localhost 能註冊；直接開 index.html（file://）時略過
if ("serviceWorker" in navigator && window.isSecureContext && location.protocol.startsWith("http")) {
  // 新版 sw.js 安裝後會立刻接管（skipWaiting + clients.claim），但已開著的畫面仍是舊版程式。
  // 原本就有舊版接管、又換成新版時，提示玩家重新整理；第一次安裝不提示。
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hadController) showTempleUpdateBanner();
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then(reg => {
      // 長時間開著（手機主畫面 App）也要能發現新版：回到畫面時最多每 30 分鐘檢查一次
      let lastCheck = Date.now();
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState !== "visible" || Date.now() - lastCheck < 30 * 60 * 1000) return;
        lastCheck = Date.now();
        reg.update().catch(() => {});
      });
    }).catch(err => console.warn("Service Worker 註冊失敗：", err));
  });
}

function showTempleUpdateBanner() {
  if (document.getElementById("pwaUpdateBanner")) return;
  const bar = document.createElement("div");
  bar.id = "pwaUpdateBanner";
  bar.className = "pwa-update-banner";
  bar.setAttribute("role", "status");
  const text = document.createElement("span");
  text.textContent = "🏮 神殿有新版本，重新整理後生效（進度不會消失）。";
  const reload = document.createElement("button");
  reload.type = "button";
  reload.textContent = "重新整理";
  reload.addEventListener("click", () => location.reload());
  const later = document.createElement("button");
  later.type = "button";
  later.className = "pwa-update-later";
  later.textContent = "稍後";
  later.setAttribute("aria-label", "稍後再更新");
  later.addEventListener("click", () => bar.remove());
  bar.append(text, reload, later);
  document.body.appendChild(bar);
}
window.showTempleUpdateBanner = showTempleUpdateBanner;

let deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const btn = document.getElementById("btnInstallApp");
  if (btn) btn.hidden = false;
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  const btn = document.getElementById("btnInstallApp");
  if (btn) btn.hidden = true;
  if (window.setDockStatus) window.setDockStatus("📲 神殿已安裝到主畫面，離線也能參拜！");
});

document.getElementById("btnInstallApp")?.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  document.getElementById("btnInstallApp").hidden = true;
});
