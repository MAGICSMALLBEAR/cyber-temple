// app/pwa.js - PWA：Service Worker 註冊與安裝按鈕

// ==========================================
// PWA：離線快取與安裝到主畫面
// ==========================================
// Service Worker 只在 https 或 localhost 能註冊；直接開 index.html（file://）時略過
if ("serviceWorker" in navigator && window.isSecureContext && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(err => console.warn("Service Worker 註冊失敗：", err));
  });
}

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
