// 私人心願手帳：只寫入本機進度，不送到同行廣播。
const JOURNAL_KEY = "temple_wish_journal";
const JOURNAL_STATUS = { pending: "祈願中", fulfilled: "已實現", returned: "已還願" };
// 每則心願的敬獻紀錄：祈求保佑或答謝還願，記下日期、神尊、稱呼、心意與供品
const JOURNAL_VISIT_KINDS = { pray: "祈求保佑", thanks: "答謝還願" };
const JOURNAL_VISIT_LIMIT = 50;
function normalizeJournalVisit(v) {
  if (!v || !Object.hasOwn(JOURNAL_VISIT_KINDS, v.kind) || typeof v.at !== "string" || !Number.isFinite(Date.parse(v.at))) return null;
  const text = (s, n) => typeof s === "string" ? s.trim().slice(0, n) : "";
  const isDish = id => window.templeInventory?.isOffering(id) ?? (typeof id === "string" && id.length <= 20);
  return { at: v.at, kind: v.kind, deity: typeof DEITIES !== "undefined" && Object.hasOwn(DEITIES, v.deity) ? v.deity : "",
    name: text(v.name, 20), message: text(v.message, 100), dishes: Array.isArray(v.dishes) ? v.dishes.filter(isDish).slice(0, 5) : [] };
}
const templeJournal = {
  editing: null,
  load() {
    let raw; try { raw = JSON.parse(localStorage.getItem(JOURNAL_KEY)); } catch (e) {}
    const seen = new Set();
    return (Array.isArray(raw?.entries) ? raw.entries : []).filter(e => {
      if (!e || typeof e.id !== "string" || seen.has(e.id) || typeof e.wish !== "string") return false;
      seen.add(e.id); return true;
    }).map(e => ({ id: e.id, wish: e.wish.slice(0, 120), notes: typeof e.notes === "string" ? e.notes.slice(0, 2000) : "",
      status: typeof e.status === "string" && Object.hasOwn(JOURNAL_STATUS, e.status) ? e.status : "pending",
      chiamId: Number.isInteger(e.chiamId) && e.chiamId >= 1 && e.chiamId <= 60 ? e.chiamId : null,
      createdAt: typeof e.createdAt === "string" && Number.isFinite(Date.parse(e.createdAt)) ? e.createdAt : new Date().toISOString(),
      updatedAt: typeof e.updatedAt === "string" && Number.isFinite(Date.parse(e.updatedAt)) ? e.updatedAt : new Date().toISOString(),
      returnedAt: typeof e.returnedAt === "string" && Number.isFinite(Date.parse(e.returnedAt)) ? e.returnedAt : null,
      visits: (Array.isArray(e.visits) ? e.visits : []).map(normalizeJournalVisit).filter(Boolean).slice(-JOURNAL_VISIT_LIMIT) }));
  },
  persist(entries) {
    localStorage.setItem(JOURNAL_KEY, JSON.stringify({ version: 1, entries }));
    window.dispatchEvent(new CustomEvent("temple:journal"));
  },
  saveEntry(input, id = null) {
    const wish = typeof input?.wish === "string" ? input.wish.trim() : "";
    const notes = typeof input?.notes === "string" ? input.notes.trim() : "";
    if (!wish || wish.length > 120 || notes.length > 2000 || typeof input.status !== "string" || !Object.hasOwn(JOURNAL_STATUS, input.status)) return { ok: false, error: "請填寫 120 字內的心願，心得以 2000 字為限。" };
    const entries = this.load(), old = id ? entries.find(e => e.id === id) : null;
    if (id && !old) return { ok: false, error: "這則心願已被移除，請重新整理清單。" };
    if (!old && entries.length >= 200) return { ok: false, error: "手帳最多保存 200 則心願，請先匯出存檔並整理舊紀錄。" };
    const now = new Date().toISOString();
    const entry = { id: old?.id || (globalThis.crypto?.randomUUID?.() || `wish_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`), wish, notes, status: input.status,
      chiamId: Number.isInteger(input.chiamId) && input.chiamId >= 1 && input.chiamId <= 60 ? input.chiamId : null,
      createdAt: old?.createdAt || now, updatedAt: now, returnedAt: input.status === "returned" ? old?.returnedAt || now : null, visits: old?.visits || [] };
    if (old) entries.splice(entries.findIndex(e => e.id === id), 1, entry); else entries.unshift(entry);
    this.persist(entries); return { ok: true, entry };
  },
  // 敬獻時可選的心願：還沒還願的，最近更新的在前
  offerable() { return this.load().filter(e => e.status !== "returned").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); },
  // 敬獻完成後記到心願裡；答謝還願會把心願標為已還願
  recordOffering(id, visit) {
    const entries = this.load(), entry = entries.find(e => e.id === id);
    if (!entry) return { ok: false, error: "找不到這則心願，可能已被刪除。" };
    if (entry.status === "returned") return { ok: false, error: "這則心願已經還願過了。" };
    const now = new Date().toISOString(), record = normalizeJournalVisit({ ...visit, at: now });
    if (!record) return { ok: false, error: "敬獻方式不正確。" };
    entry.visits = [...entry.visits, record].slice(-JOURNAL_VISIT_LIMIT); entry.updatedAt = now;
    if (record.kind === "thanks") { entry.status = "returned"; entry.returnedAt = now; }
    this.persist(entries); return { ok: true, entry, visit: record };
  },
  remove(id) {
    const entries = this.load(), remaining = entries.filter(e => e.id !== id);
    if (remaining.length === entries.length) return false;
    this.persist(remaining); return true;
  },
  form(entry = null) {
    this.editing = entry?.id || null;
    document.getElementById("journalWish").value = entry?.wish || "";
    document.getElementById("journalNotes").value = entry?.notes || "";
    document.getElementById("journalStatus").value = entry?.status || "pending";
    document.getElementById("journalChiam").value = entry?.chiamId || "";
    document.getElementById("journalSave").textContent = entry?.id ? "儲存近況" : "保存心願";
    document.getElementById("journalMessage").textContent = "";
  },
  open(prefill = null) {
    document.getElementById("passportModal").classList.remove("open");
    document.getElementById("chiamModal").classList.remove("open");
    this.form(prefill); this.render();
    document.getElementById("journalModal").classList.add("open");
  },
  fromChiam() {
    const c = state.selectedChiam;
    if (!c) return;
    const question = document.getElementById("aiQuestionInput")?.value.trim();
    this.open({ wish: question?.slice(0, 120) || `記下第 ${c.id} 籤的祈願`, chiamId: c.id });
  },
  render() {
    const list = document.getElementById("journalList"); if (!list) return;
    const all = this.load(), filter = document.getElementById("journalFilter").value;
    const query = document.getElementById("journalSearch").value.trim().toLocaleLowerCase();
    const entries = all.filter(e => (filter === "all" || e.status === filter) && `${e.wish}\n${e.notes}`.toLocaleLowerCase().includes(query)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    list.replaceChildren();
    document.getElementById("journalCount").textContent = `${entries.length} / ${all.length} 則心願`;
    if (!entries.length) { const empty = document.createElement("p"); empty.textContent = all.length ? "沒有符合篩選條件的心願。" : "把祈願和後續心得留在這裡，日後回來記錄實現與還願。"; list.append(empty); }
    entries.forEach(e => {
      const card = document.createElement("article"); card.className = "journal-entry";
      const title = document.createElement("strong"); title.textContent = e.wish;
      const status = document.createElement("span"); status.className = `journal-status ${e.status}`; status.textContent = JOURNAL_STATUS[e.status];
      const date = document.createElement("small"); date.textContent = `記於 ${new Date(e.createdAt).toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })}${e.returnedAt ? ` · 還願 ${new Date(e.returnedAt).toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })}` : ""}`;
      const notes = document.createElement("p"); notes.textContent = e.notes || "尚未補寫心得。";
      let visits = null;
      if (e.visits.length) {
        visits = document.createElement("ol"); visits.className = "journal-visits"; visits.setAttribute("aria-label", "敬獻紀錄");
        e.visits.slice(-5).reverse().forEach(v => {
          const li = document.createElement("li");
          const dishes = v.dishes.map(id => (typeof BAG_ITEMS !== "undefined" && BAG_ITEMS[id]?.name) || id).join("、");
          li.textContent = [new Date(v.at).toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" }), JOURNAL_VISIT_KINDS[v.kind],
            v.deity && typeof DEITIES !== "undefined" ? `向${DEITIES[v.deity].name}` : "", v.name, dishes && `供品：${dishes}`, v.message && `「${v.message}」`].filter(Boolean).join(" · ");
          visits.append(li);
        });
        if (e.visits.length > 5) { const more = document.createElement("li"); more.textContent = `另有 ${e.visits.length - 5} 次較早的敬獻`; visits.append(more); }
      }
      const actions = document.createElement("div"); actions.className = "journal-actions";
      const button = (text, fn) => { const b = document.createElement("button"); b.type = "button"; b.className = "btn-custom-pill"; b.textContent = text; b.addEventListener("click", fn); actions.append(b); };
      button("編輯／更新近況", () => { this.form(e); document.getElementById("journalForm").scrollIntoView({ block: "nearest" }); document.getElementById("journalWish").focus(); });
      if (e.chiamId) button(`重閱第 ${e.chiamId} 籤`, () => {
        const c = window.CHIAM_DATA.find(c => c.id === e.chiamId);
        if (c) { document.getElementById("journalModal").classList.remove("open"); window.openChiamModal(c); }
      });
      button("刪除", () => { if (window.confirm("刪除這則心願與心得？此動作無法復原。")) { this.remove(e.id); if (this.editing === e.id) this.form(); } });
      card.append(status, title, date, notes, ...(visits ? [visits] : []), actions); list.append(card);
    });
  },
  init() {
    document.getElementById("btnOpenJournal").addEventListener("click", () => this.open());
    document.getElementById("btnJournalPassport").addEventListener("click", () => this.open());
    document.getElementById("btnJournalChiam").addEventListener("click", () => this.fromChiam());
    document.getElementById("journalClose").addEventListener("click", () => document.getElementById("journalModal").classList.remove("open"));
    document.getElementById("journalNew").addEventListener("click", () => this.form());
    document.getElementById("journalForm").addEventListener("submit", e => {
      e.preventDefault();
      const result = this.saveEntry({ wish: document.getElementById("journalWish").value, notes: document.getElementById("journalNotes").value, status: document.getElementById("journalStatus").value,
        chiamId: Number(document.getElementById("journalChiam").value) || null }, this.editing);
      if (result.ok) { this.form(); document.getElementById("journalFilter").value = "all"; document.getElementById("journalSearch").value = ""; this.render(); }
      document.getElementById("journalMessage").textContent = result.ok ? "已保存到自己的心願手帳。" : result.error;
    });
    document.getElementById("journalSearch").addEventListener("input", () => this.render());
    document.getElementById("journalFilter").addEventListener("change", () => this.render());
    window.addEventListener("temple:journal", () => this.render());
    window.addEventListener("storage", e => { if (e.key === JOURNAL_KEY || e.key === null) this.render(); });
  }
};
window.templeJournal = templeJournal;
