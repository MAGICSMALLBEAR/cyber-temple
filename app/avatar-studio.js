// app/avatar-studio.js - 換造型面板（右側、即時預覽、捏臉、髮型、造型代碼）與表情動作面板
// 選項清單來自 avatar/appearance.js；面板打開時鏡頭轉到分身正面，沒按儲存就關閉會恢復原本造型

const avatarStudio = {
  snapshot: null,
  saved: false,

  get avatar() {
    return temple3d && temple3d.avatar;
  },

  // ---------- 面板內容 ----------
  buildOptions() {
    const groups = { studioFaceOptions: ["skin", "eyes", "brows", "mouth", "blush", "faceAcc"], studioHairOptions: ["hair", "hairColor"] };
    Object.entries(groups).forEach(([containerId, keys]) => {
      const box = document.getElementById(containerId);
      if (!box) return;
      box.replaceChildren(...keys.map(key => {
        const section = document.createElement("div");
        section.className = "studio-section";
        const label = document.createElement("div");
        label.className = "studio-label";
        label.textContent = AVATAR_OPTIONS[key].label;
        const row = document.createElement("div");
        row.className = "studio-options";
        Object.entries(AVATAR_OPTIONS[key].choices).forEach(([value, name]) => {
          const btn = document.createElement("button");
          btn.dataset.lookKey = key;
          btn.dataset.lookValue = value;
          btn.title = name;
          const swatch = key === "skin" ? AVATAR_SKIN_TONES[value] : key === "hairColor" ? AVATAR_HAIR_COLORS[value] : null;
          if (swatch) {
            btn.className = "studio-swatch";
            btn.style.background = swatch;
            btn.setAttribute("aria-label", name);
          } else {
            btn.className = "btn-custom-pill";
            btn.textContent = name;
          }
          row.appendChild(btn);
        });
        section.append(label, row);
        return section;
      }));
    });
  },

  syncActive() {
    const cfg = state.avatarConfig;
    const look = normalizeLook(cfg);
    document.querySelectorAll("#avatarModal [data-look-key]").forEach(b => b.classList.toggle("active", look[b.dataset.lookKey] === b.dataset.lookValue));
    document.querySelectorAll("#avatarModal [data-role]").forEach(b => b.classList.toggle("active", b.dataset.role === cfg.roleType));
    document.querySelectorAll("#avatarModal [data-hat-select]").forEach(b => b.classList.toggle("active", b.dataset.hatSelect === cfg.hatType));
    document.querySelectorAll("#avatarModal [data-held]").forEach(b => b.classList.toggle("active", b.dataset.held === cfg.holdingItem));
    const picker = document.getElementById("avatarColorPicker");
    if (picker && cfg.robeColor) picker.value = cfg.robeColor;
    const title = document.getElementById("avatarTitleInput");
    if (title && document.activeElement !== title) title.value = cfg.title || "";
    const code = document.getElementById("studioLookCode");
    if (code && document.activeElement !== code) code.value = encodeLookCode(cfg);
  },

  // 每改一項就重建分身，馬上看得到
  applyLive() {
    if (this.avatar) this.avatar.customize(state.avatarConfig);
    this.syncActive();
  },

  setLook(partial) {
    Object.assign(state.avatarConfig, partial);
    this.applyLive();
  },

  // ---------- 鏡頭：轉到分身正面，分身放在畫面左側（右側是面板） ----------
  preview(view = "full") {
    const a = this.avatar;
    if (!a) return;
    const yaw = a.playerGroup.rotation.y;
    const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const v = view === "face"
      ? { dist: 1.0, h: 0.94, lookY: 0.94, offset: 0.2 }
      : { dist: 2.7, h: 1.1, lookY: 0.75, offset: 0.6 };
    const base = a.position.clone();
    // 視角控制器平常限制鏡頭至少離目標 1.4m，臉部特寫會被推遠推高（布條會擋住眼睛），預覽時暫時放寬
    temple3d.controls.minDistance = 0.5;
    temple3d.followAvatar = false;
    temple3d.targetCameraPos = base.clone().add(fwd.clone().multiplyScalar(v.dist)).add(new THREE.Vector3(0, v.h, 0));
    // 鏡頭從正面看回來時，分身的 right 方向就是畫面右方：看向分身右側一點，分身落在畫面左邊（右邊被面板佔住）
    temple3d.targetLookAt = base.clone().add(new THREE.Vector3(0, v.lookY, 0)).add(right.multiplyScalar(v.offset));
    document.querySelectorAll("[data-studio-view]").forEach(b => b.classList.toggle("active", b.dataset.studioView === view));
  },

  open() {
    // 先補齊捏臉欄位再記下原狀：否則還原時缺少的欄位會被當成「不改」，剛選的五官留著不會恢復
    Object.assign(state.avatarConfig, normalizeLook({ ...(this.avatar ? this.avatar.config : {}), ...state.avatarConfig }));
    this.snapshot = JSON.stringify(state.avatarConfig);
    this.showTab("face");
    this.saved = false;
    this.syncActive();
    this.preview("full");
  },

  // 關閉（✕、Esc、儲存都會走到這裡）
  closed() {
    if (!this.saved && this.snapshot) {
      state.avatarConfig = JSON.parse(this.snapshot);
      if (this.avatar) this.avatar.customize(state.avatarConfig);
    }
    this.snapshot = null;
    if (temple3d) {
      temple3d.controls.minDistance = 1.4;
      temple3d.resetCameraBehindAvatar(true);
    }
  },

  showTab(tab) {
    document.querySelectorAll("[data-studio-tab]").forEach(b => b.classList.toggle("active", b.dataset.studioTab === tab));
    document.querySelectorAll("[data-studio-page]").forEach(p => { p.hidden = p.dataset.studioPage !== tab; });
  },

  initStudio() {
    this.buildOptions();
    const modal = document.getElementById("avatarModal");
    if (!modal) return;

    modal.addEventListener("click", (e) => {
      const look = e.target.closest("[data-look-key]");
      if (look) { this.setLook({ [look.dataset.lookKey]: look.dataset.lookValue }); return; }
      const tab = e.target.closest("[data-studio-tab]");
      if (tab) { this.showTab(tab.dataset.studioTab); return; }
      const view = e.target.closest("[data-studio-view]");
      if (view) { this.preview(view.dataset.studioView); return; }
      // 身份、頭飾、持物按鈕由 app/controls.js 更新設定，這裡接著即時預覽
      if (e.target.closest("[data-role], [data-hat-select], [data-held], #btnRandomTitle")) setTimeout(() => this.applyLive(), 0);
    });
    document.getElementById("avatarColorPicker")?.addEventListener("input", (e) => this.setLook({ robeColor: e.target.value }));
    document.getElementById("avatarTitleInput")?.addEventListener("input", (e) => {
      state.avatarConfig.title = e.target.value.trim() || "悠閒的信眾";
      if (this.avatar) { this.avatar.config.title = state.avatarConfig.title; this.avatar.updateTitleBadge(); }
    });
    document.getElementById("btnStudioRandom")?.addEventListener("click", () => this.setLook(randomLook()));

    // 造型代碼
    const note = (t) => { const n = document.getElementById("studioCodeNote"); if (n) n.textContent = t; };
    document.getElementById("btnStudioCopyCode")?.addEventListener("click", async () => {
      const code = encodeLookCode(state.avatarConfig);
      try {
        await navigator.clipboard.writeText(code);
        note(`已複製：${code}`);
      } catch (e) {
        const input = document.getElementById("studioLookCode");
        input.value = code;
        input.select();
        note("瀏覽器不允許自動複製，已幫你選取代碼，請按 Ctrl+C。");
      }
    });
    document.getElementById("btnStudioApplyCode")?.addEventListener("click", () => {
      const look = decodeLookCode(document.getElementById("studioLookCode").value);
      if (!look) { note("代碼格式不對，應該像 TP-xxxxxxxx-xxxxxx。"); return; }
      this.setLook(look);
      note("已套用造型代碼，記得按儲存。");
    });

    // 儲存要在 controls.js 關閉面板之前標記，關閉時才不會被還原
    document.getElementById("btnSaveAvatar")?.addEventListener("click", () => { this.saved = true; }, true);

    let wasOpen = false;
    new MutationObserver(() => {
      const isOpen = modal.classList.contains("open");
      if (isOpen && !wasOpen) this.open();
      if (!isOpen && wasOpen) this.closed();
      wasOpen = isOpen;
    }).observe(modal, { attributes: true, attributeFilter: ["class"] });
  },

  // ---------- 表情與動作 ----------
  initEmotes() {
    const panel = document.getElementById("emotePanel");
    const btn = document.getElementById("btnOpenEmotes");
    if (!panel || !btn) return;
    const make = (list, attr) => Object.entries(list).map(([id, e]) => {
      const b = document.createElement("button");
      b.className = "emote-btn";
      b.dataset[attr] = id;
      b.title = e.label;
      const icon = document.createElement("span");
      icon.className = "emote-icon";
      icon.textContent = e.icon;
      const label = document.createElement("span");
      label.textContent = e.label;
      b.append(icon, label);
      return b;
    });
    document.getElementById("emoteGrid").replaceChildren(...make(AVATAR_EMOTES, "emote"));
    document.getElementById("emoteActionGrid").replaceChildren(...make(AVATAR_ACTIONS, "emoteAction"));

    const toggle = (force) => {
      const open = force !== undefined ? force : !panel.classList.contains("open");
      panel.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", String(open));
      if (open) {
        // 開在左側動作列的右邊，不蓋住動作按鈕
        const bar = (document.getElementById("avatarActionBar") || btn).getBoundingClientRect();
        const left = Math.min(window.innerWidth - panel.offsetWidth - 8, bar.right + 8);
        panel.style.left = `${Math.round(Math.max(8, left))}px`;
        panel.style.bottom = `${Math.round(Math.max(8, window.innerHeight - bar.bottom))}px`;
        panel.style.maxHeight = `${Math.round(Math.max(150, Math.min(window.innerHeight * 0.7, bar.bottom - 96)))}px`;
      }
    };
    btn.addEventListener("click", (e) => { e.stopPropagation(); toggle(); });
    document.getElementById("btnCloseEmotes")?.addEventListener("click", () => toggle(false));
    panel.addEventListener("click", (e) => {
      const a = this.avatar;
      const emote = e.target.closest("[data-emote]");
      if (emote && a) { a.playEmote(emote.dataset.emote); return; }
      const action = e.target.closest("[data-emote-action]");
      if (action && a) {
        const id = action.dataset.emoteAction;
        a.triggerAction(id);
        if (id === "deepBow") window.emitRitual?.("bow");   // 鞠躬九十度也算親自行禮
        setDockStatus(`${AVATAR_ACTIONS[id].icon} ${AVATAR_ACTIONS[id].label}中，移動或按「停止動作」就會停下。`);
        return;
      }
      if (e.target.closest("#btnStopAction") && a) a.triggerAction("idle");
    });
    document.addEventListener("click", (e) => {
      if (panel.classList.contains("open") && !e.target.closest("#emotePanel, #btnOpenEmotes")) toggle(false);
    });
    window.addEventListener("keydown", (e) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      if (e.code === "KeyT") toggle();
      if (e.key === "Escape") toggle(false);
    });
  },

  init() {
    this.initStudio();
    this.initEmotes();
  }
};

window.avatarStudio = avatarStudio;
