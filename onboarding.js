// onboarding.js - 新手引導任務：第一次來的玩家依序完成「點香 → 擲筊 → 求籤 → 讀完籤詩」
// 進度聽 temple:ritual 事件；讀完籤詩以籤詩彈窗由開到關判定（任何關法都算）。已有功德的老玩家不顯示。

const ONBOARDING_KEY = "temple_onboarding";
const ONBOARDING_REWARD = 88;
const ONBOARDING_STEPS = [
  { type: "incense", title: "點燃三炷清香", hint: "按下方「🔥 點燃清香」，或走到香爐前按 [E]", target: "btnLightIncense" },
  { type: "bwa", title: "向神明擲筊請示", hint: "按「🌓 誠心擲筊」，聖筊代表神明應允", target: "btnThrowBwa" },
  { type: "chiam", title: "搖籤筒求一支籤", hint: "按「🎋 搖筒求籤」，心中默念想問的事", target: "btnShakeChiam" },
  { type: "readChiam", title: "讀完你的籤詩", hint: "看完籤詩與解說後，關閉籤詩卷", target: null }
];

// 在每日簽到發功德之前判斷：完全沒有功德紀錄才算新玩家
const onboardingFreshPlayer = !localStorage.getItem("temple_merit");

const templeOnboarding = {
  state: null,

  load() {
    try {
      return JSON.parse(localStorage.getItem(ONBOARDING_KEY) || "null");
    } catch (e) {
      return null;
    }
  },

  save() {
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(this.state));
  },

  get active() {
    return !!this.state && !this.state.done && !this.state.skipped;
  },

  init() {
    this.state = this.load();
    if (!this.state) {
      if (!onboardingFreshPlayer) return;   // 老玩家：不打擾
      this.state = { step: 0, done: false, skipped: false };
      this.save();
    }
    if (!this.active) return;

    window.addEventListener("temple:ritual", (e) => this.advance(e.detail.type));
    const chiamModal = document.getElementById("chiamModal");
    if (chiamModal) {
      let wasOpen = chiamModal.classList.contains("open");
      new MutationObserver(() => {
        const open = chiamModal.classList.contains("open");
        if (wasOpen && !open) this.advance("readChiam");
        wasOpen = open;
      }).observe(chiamModal, { attributes: true, attributeFilter: ["class"] });
    }
    document.getElementById("btnOnboardingSkip")?.addEventListener("click", () => this.skip());
    this.render();
  },

  advance(type) {
    if (!this.active) return;
    const step = ONBOARDING_STEPS[this.state.step];
    if (!step || step.type !== type) return;
    this.state.step++;
    if (this.state.step >= ONBOARDING_STEPS.length) {
      this.state.done = true;
      this.save();
      this.render();
      if (window.addMerit) window.addMerit(ONBOARDING_REWARD);
      const msg = `🎉 新手參拜圓滿！你已經學會點香、擲筊、求籤，功德 +${ONBOARDING_REWARD}。萬寶閣裡還有更多科儀等你探索。`;
      if (window.liveTempleWall) window.liveTempleWall.showBroadcastNotice(msg);
      if (window.setDockStatus) window.setDockStatus(msg);
      return;
    }
    this.save();
    this.render();
  },

  skip() {
    if (!this.state) return;
    this.state.skipped = true;
    this.save();
    this.render();
  },

  render() {
    const card = document.getElementById("onboardingCard");
    document.querySelectorAll(".onboarding-target").forEach(el => el.classList.remove("onboarding-target"));
    if (!card) return;
    if (!this.active) {
      card.hidden = true;
      return;
    }
    const i = this.state.step;
    const step = ONBOARDING_STEPS[i];
    card.hidden = false;
    document.getElementById("onboardingProgress").textContent = `新手參拜 ${i + 1} / ${ONBOARDING_STEPS.length}`;
    document.getElementById("onboardingTitle").textContent = step.title;
    document.getElementById("onboardingHint").textContent = step.hint;
    const dots = document.getElementById("onboardingDots");
    dots.replaceChildren(...ONBOARDING_STEPS.map((_, k) => {
      const dot = document.createElement("span");
      dot.className = `onboarding-dot${k < i ? " done" : k === i ? " current" : ""}`;
      return dot;
    }));
    if (step.target) document.getElementById(step.target)?.classList.add("onboarding-target");
  }
};

window.templeOnboarding = templeOnboarding;
