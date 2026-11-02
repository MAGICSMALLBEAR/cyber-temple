// save-data.js - 功德存檔匯出／匯入
// 所有進度都存在瀏覽器 localStorage（temple_ 開頭），清除瀏覽資料就會消失；這裡把它打包成一個 JSON 檔備份與還原

const SAVE_APP_ID = "cyber-temple-3d";
const SAVE_FORMAT = 1;
const SAVE_PREFIX = "temple_";
// 不寫進存檔：API Key 是個人憑證，存檔可能被分享出去；最後匯出時間屬於本機
const SAVE_EXCLUDE = new Set(["temple_gemini_key", "temple_last_export"]);
const SAVE_MAX_BYTES = 5 * 1024 * 1024;

const templeSave = {
  collect() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(SAVE_PREFIX) && !SAVE_EXCLUDE.has(key)) data[key] = localStorage.getItem(key);
    }
    return data;
  },

  exportFile() {
    const now = new Date();
    const payload = {
      app: SAVE_APP_ID,
      format: SAVE_FORMAT,
      exportedAt: now.toISOString(),
      merit: parseInt(localStorage.getItem("temple_merit") || "0", 10),
      data: this.collect()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `賽博神殿_功德存檔_${stamp}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    localStorage.setItem("temple_last_export", now.toISOString());
    this.renderStatus();
  },

  // 驗證存檔內容；回傳 { ok, error, payload }
  parse(text) {
    let payload;
    try {
      payload = JSON.parse(text);
    } catch (e) {
      return { ok: false, error: "檔案不是有效的存檔（無法解析 JSON）。" };
    }
    if (!payload || payload.app !== SAVE_APP_ID || typeof payload.data !== "object" || payload.data === null) {
      return { ok: false, error: "這不是賽博神殿的功德存檔。" };
    }
    if (payload.format > SAVE_FORMAT) {
      return { ok: false, error: "這個存檔來自較新的版本，請先更新神殿再匯入。" };
    }
    const data = {};
    for (const [key, value] of Object.entries(payload.data)) {
      if (key.startsWith(SAVE_PREFIX) && !SAVE_EXCLUDE.has(key) && typeof value === "string") data[key] = value;
    }
    if (Object.keys(data).length === 0) return { ok: false, error: "存檔裡沒有任何進度資料。" };
    return { ok: true, payload: { ...payload, data } };
  },

  importFile(file) {
    if (!file) return;
    if (file.size > SAVE_MAX_BYTES) {
      alert("檔案太大，不像是功德存檔。");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = this.parse(String(reader.result));
      if (!result.ok) {
        alert(`無法匯入：${result.error}`);
        return;
      }
      const { payload } = result;
      const when = payload.exportedAt ? new Date(payload.exportedAt).toLocaleString("zh-TW") : "未知時間";
      const curMerit = parseInt(localStorage.getItem("temple_merit") || "0", 10);
      const ok = confirm(
        `要用這個存檔取代目前的進度嗎？\n\n` +
        `存檔時間：${when}\n存檔功德：${(payload.merit ?? 0).toLocaleString()}\n目前功德：${curMerit.toLocaleString()}\n\n` +
        `目前的進度會被覆蓋，無法復原。建議先匯出一份目前的存檔。`
      );
      if (!ok) return;
      this.apply(payload.data);
      location.reload();
    };
    reader.readAsText(file);
  },

  // 先清掉現有進度（保留 API Key 等排除項），再寫入存檔
  apply(data) {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(SAVE_PREFIX) && !SAVE_EXCLUDE.has(key)) toRemove.push(key);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
    Object.entries(data).forEach(([k, v]) => localStorage.setItem(k, v));
  },

  renderStatus() {
    const el = document.getElementById("saveDataStatus");
    if (!el) return;
    const last = localStorage.getItem("temple_last_export");
    if (!last) {
      el.textContent = "進度只存在這個瀏覽器裡，清除瀏覽資料就會消失。建議定期匯出備份。";
      return;
    }
    const days = Math.floor((Date.now() - new Date(last).getTime()) / 86400000);
    el.textContent = `上次匯出：${new Date(last).toLocaleDateString("zh-TW")}${days >= 7 ? `（已經 ${days} 天，建議再備份一次）` : ""}`;
  },

  init() {
    document.getElementById("btnSaveExport")?.addEventListener("click", () => this.exportFile());
    const input = document.getElementById("saveImportInput");
    document.getElementById("btnSaveImport")?.addEventListener("click", () => input?.click());
    input?.addEventListener("change", () => {
      this.importFile(input.files[0]);
      input.value = "";
    });
    this.renderStatus();
  }
};

window.templeSave = templeSave;
