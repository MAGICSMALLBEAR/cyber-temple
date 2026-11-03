// app/chiam-ritual.js - 正統求籤儀式：擲筊請示 → 搖籤筒 → 擲筊確認是不是這支籤（聖筊才算，否則放回重抽）
// 以畫面下方的小卡引導（不擋住 3D 的擲筊與搖籤動畫）；卡片上可改用「快速求籤」直接抽籤

const RITUAL_STEPS = ["請示", "抽籤", "確認"];
const BWA_NAMES = { holy: "聖筊", laugh: "笑筊", yin: "陰筊" };

const chiamRitual = {
  active: false,
  phase: "ask",        // ask：稟告請示；shake：已獲應允、待搖籤；confirm：已抽籤、待確認
  busy: false,
  drawn: null,
  question: "",
  tries: { ask: 0, confirm: 0 },

  el(id) {
    return document.getElementById(id);
  },

  start() {
    if (this.active) return;
    this.active = true;
    this.phase = "ask";
    this.busy = false;
    this.drawn = null;
    this.tries = { ask: 0, confirm: 0 };
    // 求籤中的擲筊另外計算：避免先前單獨擲出的聖筊加上儀式裡的兩個，湊成三聖筊而在途中觸發遶境
    state.consecutiveHolyBwa = 0;
    const q = this.el("chiamRitualQuestion");
    if (q) q.value = "";
    document.body.classList.add("chiam-ritual-active");
    this.render("請先在心中向神明稟告姓名、住址與想問的事，再擲筊請示能否求籤。");
  },

  close() {
    this.active = false;
    this.busy = false;
    document.body.classList.remove("chiam-ritual-active");
    const card = this.el("chiamRitualCard");
    if (card) card.hidden = true;
  },

  // 快速求籤：不擲筊，直接抽籤並展開籤詩
  quick() {
    if (this.busy) return;
    this.close();
    performChiamShake();
  },

  primary() {
    if (!this.active || this.busy) return;
    if (this.phase === "ask") this.askPermission();
    else if (this.phase === "shake") this.shake();
    else if (this.phase === "confirm") this.confirm();
  },

  askPermission() {
    this.question = (this.el("chiamRitualQuestion")?.value || "").trim();
    this.toss(result => {
      this.tries.ask++;
      if (result === "holy") {
        this.phase = "shake";
        this.render("聖筊！神明應允你求籤，請搖動籤筒。");
      } else if (result === "laugh") {
        this.render("笑筊：神明笑而不答，可能問題還不夠清楚。請把想問的事說得更具體，再擲一次。");
      } else {
        this.render("陰筊：神明暫時不應允。請靜心片刻、再次誠心稟告後重擲。");
      }
    });
  },

  shake() {
    this.busy = true;
    this.render("籤筒搖動中……");
    if (temple3d) temple3d.setCameraView("chiam");
    const started = performChiamShake(chosen => {
      this.busy = false;
      this.drawn = chosen;
      this.phase = "confirm";
      this.render(`抽得第 ${chosen.id} 籤【${chosen.ganZhi}】。請擲筊向神明確認：是不是這一支籤？`);
    });
    if (!started) {
      this.busy = false;
      this.render("籤筒還在搖動，請稍候再試。");
    }
  },

  confirm() {
    const chiam = this.drawn;
    this.toss(result => {
      this.tries.confirm++;
      if (result === "holy") {
        this.render(`聖筊！確認是第 ${chiam.id} 籤，正在展開籤詩……`);
        recordChiamToHistory(chiam, this.question || "祈求安泰前程");
        setDockStatus(`🎋 第 ${chiam.id} 籤【${chiam.ganZhi}】${chiam.fortune}，經聖筊確認，正在展開靈籤捲軸...`);
        const q = this.question;
        setTimeout(() => {
          this.close();
          openChiamModal(chiam);
          // 求籤時稟告的問題，直接帶進 AI 深度解籤
          const ai = this.el("aiQuestionInput");
          if (ai && q) ai.value = q;
        }, 900);
      } else {
        this.drawn = null;
        this.phase = "shake";
        this.render(`${BWA_NAMES[result]}：不是這一支籤。請把籤放回籤筒，重新搖籤。`);
      }
    });
  },

  // 擲筊並等待結果；鏡頭切到筊杯特寫
  toss(onResult) {
    this.busy = true;
    this.render("筊杯拋擲中，靜候神明聖意……");
    if (temple3d) temple3d.setCameraView("bwa");
    const started = performBwaToss(result => {
      this.busy = false;
      onResult(result);
    });
    if (!started) {
      this.busy = false;
      this.render("筊杯還在空中，請稍候再擲。");
    }
  },

  render(message) {
    const card = this.el("chiamRitualCard");
    if (!card) return;
    card.hidden = !this.active;
    if (!this.active) return;
    const stepIndex = { ask: 0, shake: 1, confirm: 2 }[this.phase];
    this.el("chiamRitualMessage").textContent = message;
    const steps = this.el("chiamRitualSteps");
    steps.replaceChildren(...RITUAL_STEPS.map((name, i) => {
      const s = document.createElement("span");
      s.className = `ritual-step${i < stepIndex ? " done" : i === stepIndex ? " current" : ""}`;
      s.textContent = `${i + 1}. ${name}`;
      return s;
    }));
    const label = { ask: "🌓 擲筊請示", shake: "🎋 搖籤筒", confirm: "🌓 擲筊確認" }[this.phase];
    const primary = this.el("btnChiamRitualPrimary");
    primary.textContent = this.phase === "ask" && this.tries.ask > 0 ? "🌓 再擲一次" : label;
    primary.disabled = this.busy;
    this.el("btnChiamRitualQuick").disabled = this.busy;
    // 問題欄位只在請示階段可填
    this.el("chiamRitualQuestionRow").hidden = this.phase !== "ask";
  },

  init() {
    this.el("btnChiamRitualPrimary")?.addEventListener("click", () => this.primary());
    this.el("btnChiamRitualQuick")?.addEventListener("click", () => this.quick());
    this.el("btnChiamRitualClose")?.addEventListener("click", () => this.close());
  }
};

window.chiamRitual = chiamRitual;
