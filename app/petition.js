// app/petition.js - 跪拜稟告：在神案前跪拜時，向神明說出稱呼、所求與想請示的是非題，再擲筊請神明回答
// 最多擲三筊：連得三個聖筊為「允杯」；途中出現笑筊或陰筊就停下並說明意思。
// 內容只存在本機（temple_petitions，最多 30 筆），不會送到任何伺服器或 AI。

const PETITION_KEY = "temple_petitions";
const PETITION_TOPICS = ["平安", "事業", "學業", "姻緣", "財運", "健康", "家庭", "其他"];
const PETITION_MAX_TOSSES = 3;
// app/core.js 的 state 是全域 const，不會掛在 window 上
const petitionState = () => (typeof state !== "undefined" ? state : null);

const templePetition = {
  open: false,
  busy: false,
  topic: "平安",
  holy: 0,
  finished: false,
  autoClosed: false,   // 玩家按 ✕ 後，這次開啟期間不再因跪拜自動跳出

  el(id) { return document.getElementById(id); },

  // 跪拜的地方要在大殿神案前（拜墊、神案前方），在廟埕跪拜不跳出
  inFrontOfAltar() {
    const p = window.temple3d?.avatar?.position;
    return !!p && Math.abs(p.x) <= 3.8 && p.z > -1 && p.z < 4.5;
  },

  onKneel(force = false) {
    if (this.open || window.chiamRitual?.active) return;
    if (!force && (this.autoClosed || !this.inFrontOfAltar())) return;
    this.show();
  },

  show() {
    this.open = true;
    document.body.classList.add("petition-active");
    this.busy = false;
    this.holy = 0;
    this.finished = false;
    const name = this.el("petitionName");
    if (name && !name.value) name.value = petitionState()?.avatarConfig?.title || "";
    this.render("跪在神前，說出你的稱呼與所求，想請示的事可以寫成一個是非題，再擲筊請神明回答。");
  },

  close(byUser = false) {
    this.open = false;
    this.busy = false;
    if (byUser) this.autoClosed = true;
    document.body.classList.remove("petition-active");
    const card = this.el("petitionCard");
    if (card) card.hidden = true;
  },

  deityName() {
    const id = petitionState()?.currentDeity;
    return (typeof DEITIES !== "undefined" && DEITIES[id]?.name) || "神明";
  },

  // 主按鈕：還沒擲就先稟告再擲第一筊；擲到聖筊未滿三個就再擲；問完了就重新稟告
  primary() {
    if (!this.open || this.busy) return;
    if (this.finished) { this.show(); return; }
    if (this.holy === 0) this.announce();
    this.toss();
  },

  announce() {
    const name = (this.el("petitionName")?.value || "").trim() || "弟子";
    const question = (this.el("petitionQuestion")?.value || "").trim();
    const text = `🙏 ${name}誠心稟告${this.deityName()}：所求${this.topic}${question ? `，請示「${question}」` : ""}`;
    window.setDockStatus?.(text);
    window.temple3d?.spawn3DFloatingText?.(`${name} • 稟告所求${this.topic}`, new THREE.Vector3(0, 2.6, 0.6));
  },

  toss() {
    this.busy = true;
    this.render("筊杯拋擲中，靜候神明回答……");
    const started = typeof performBwaToss === "function" && performBwaToss(result => {
      this.busy = false;
      this.onResult(result);
    });
    if (!started) {
      this.busy = false;
      this.render("筊杯還在空中，請稍候再擲。");
    }
  },

  onResult(result) {
    const n = this.holy + 1;
    if (result === "holy") {
      this.holy++;
      if (this.holy >= PETITION_MAX_TOSSES) {
        this.finish("allowed", "連得三個聖筊，神明「允杯」！此事可行，安心去做，也別忘了回來答謝。");
      } else {
        this.render(`第 ${n} 筊：聖筊。神明有應，請再擲一筊（連得三個聖筊為允杯）。`);
      }
    } else if (result === "laugh") {
      this.finish("laugh", `第 ${n} 筊：笑筊。神明笑而不答，可能問題不夠清楚或時機未明。換個問法再稟告看看。`);
    } else {
      this.finish("no", `第 ${n} 筊：陰筊。神明不允，此事宜暫緩，或再想想別的做法。`);
    }
  },

  finish(outcome, message) {
    this.finished = true;
    this.record(outcome);
    window.emitRitual?.("petition", { outcome });
    this.render(message);
  },

  record(outcome) {
    let list = [];
    try { list = JSON.parse(localStorage.getItem(PETITION_KEY) || "[]"); } catch (e) {}
    if (!Array.isArray(list)) list = [];
    list.unshift({
      at: new Date().toISOString(),
      deity: petitionState()?.currentDeity || "mazu",
      topic: this.topic,
      question: (this.el("petitionQuestion")?.value || "").trim().slice(0, 80),
      holy: this.holy,
      outcome
    });
    localStorage.setItem(PETITION_KEY, JSON.stringify(list.slice(0, 30)));
  },

  render(message) {
    const card = this.el("petitionCard");
    if (!card) return;
    card.hidden = !this.open;
    if (!this.open) return;
    this.el("petitionTitle").textContent = `🙏 向${this.deityName()}稟告`;
    this.el("petitionMessage").textContent = message;
    const asking = this.holy === 0 && !this.finished;
    this.el("petitionForm").hidden = !asking;
    const dots = this.el("petitionDots");
    dots.replaceChildren(...Array.from({ length: PETITION_MAX_TOSSES }, (_, i) => {
      const d = document.createElement("span");
      d.className = `onboarding-dot${i < this.holy ? " done" : ""}`;
      return d;
    }));
    const btn = this.el("btnPetitionToss");
    btn.disabled = this.busy;
    btn.textContent = this.finished ? "🙏 重新稟告" : asking ? "🙏 稟告並擲筊" : "🌓 再擲一筊";
    this.el("petitionTopics").querySelectorAll("button").forEach(b => {
      const on = b.dataset.topic === this.topic;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", String(on));
    });
  },

  init() {
    const topics = this.el("petitionTopics");
    if (topics) topics.replaceChildren(...PETITION_TOPICS.map(t => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn-custom-pill";
      b.dataset.topic = t;
      b.textContent = t;
      b.addEventListener("click", () => { this.topic = t; this.render(this.el("petitionMessage").textContent); });
      return b;
    }));
    this.el("btnPetitionToss")?.addEventListener("click", () => this.primary());
    this.el("btnPetitionClose")?.addEventListener("click", () => this.close(true));
    // 跪拜（K 鍵、動作列、拜墊跪坐）都會通報 bow + action: "kneel"
    window.addEventListener("temple:ritual", e => {
      if (e.detail?.type === "bow" && e.detail.action === "kneel") this.onKneel(window.pilgrimage?.step?.id === "kneel");
    });
  }
};

window.templePetition = templePetition;
