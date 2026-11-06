const templeReading = {
  sizes: { small: 14, normal: 16, large: 19 },
  apply(size, persist = true) {
    if (!Object.hasOwn(this.sizes, size)) size = "normal";
    document.documentElement.style.fontSize = `${this.sizes[size]}px`;
    document.documentElement.dataset.textSize = size;
    if (persist) localStorage.setItem("temple_text_size", size);
    const select = document.getElementById("selectTextSize"); if (select) select.value = size;
    window.pilgrimage?.place?.(); window.templeVisit?.positionTools?.();
  },
  blocksSceneKeys(e, allowGames = false) {
    if (e.defaultPrevented || e.target.isContentEditable || e.target.closest?.('input, textarea, select, button, a[href], [role="button"], [role="tab"]')) return true;
    const modal = document.querySelector(".modal-overlay.open");
    return !!modal && !(allowGames && ["rhythmModal", "bwaCompModal"].includes(modal.id));
  },
  focusable(root) {
    return [...root.querySelectorAll('button, input, select, textarea, a[href], [tabindex]')]
      .filter(el => !el.disabled && el.tabIndex >= 0 && !el.closest('[hidden], [inert], [aria-hidden="true"]') && el.getClientRects().length);
  },
  init() {
    if (this.initialized) return; this.initialized = true;
    this.apply(localStorage.getItem("temple_text_size") || "normal", false);
    document.getElementById("selectTextSize").addEventListener("change", e => this.apply(e.target.value));
    const choices = '.feast-slot, .feast-dish-picker, .shoujing-reason-card, .lantern-quick-pill, #beadTouchArea';
    document.querySelectorAll(choices).forEach(el => {
      if (el.tagName !== "BUTTON") { el.setAttribute("role", "button"); el.tabIndex = 0;
        el.addEventListener("keydown", e => { if (["Enter", " "].includes(e.key) && e.target === el) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) el.click(); } });
      }
      if (el.classList.contains("feast-slot")) el.setAttribute("aria-label", `供盤 ${Number(el.dataset.slot) + 1}：選取後可更換供品`);
      if (el.id === "beadTouchArea") el.setAttribute("aria-label", "撥動一顆念珠（Enter 或空白鍵）");
    });
    const selected = '.amulet-card-item, .feast-slot, .shoujing-reason-card, .btn-deity-pill, [data-bag-tab], .passport-tab-btn, .side-hall-tab-btn, .zen-mode-btn, .zen-time-btn, .sutra-color-btn, .sutra-size-btn, .pavilion-cat-tab, .btn-cam-view';
    document.querySelectorAll(selected).forEach(el => {
      const sync = () => el.setAttribute("aria-pressed", String(el.classList.contains("active")));
      sync(); new MutationObserver(sync).observe(el, { attributes: true, attributeFilter: ["class"] });
    });
    const fieldNames = { btnNearbyInteract: "與附近地點互動", avatarColorPicker: "分身衣袍顏色", avatarTitleInput: "善信稱呼", saveImportInput: "選擇要匯入的神殿存檔", zenWindVol: "禪修風聲音量", zenRainVol: "禪修雨聲音量", zenBirdsVol: "禪修鳥鳴音量", zenBowlVol: "禪修缽音音量", sutraSelect: "選擇抄寫經文" };
    Object.entries(fieldNames).forEach(([id, name]) => document.getElementById(id)?.setAttribute("aria-label", name));
    document.querySelectorAll('button, input, select, textarea').forEach(el => {
      if (el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby") || el.labels?.length) return;
      if (el.tagName === "BUTTON") {
        if (el.classList.contains("modal-close")) el.setAttribute("aria-label", "關閉視窗");
        else if (el.title) el.setAttribute("aria-label", el.title);
        else if (!el.textContent.trim() || /^[^\p{L}\p{N}]+$/u.test(el.textContent.trim())) el.setAttribute("aria-label", el.dataset.color ? `書寫顏色 ${el.dataset.color}` : "操作按鈕");
      } else {
        const label = el.previousElementSibling;
        el.setAttribute("aria-label", (label?.tagName === "LABEL" ? label.textContent : "") || el.placeholder || el.title || "設定選項");
      }
    });
    this.setupStudioTabs(); this.setupDialogs(); this.setupDropdowns();
  },
  setupStudioTabs() {
    const tabs = [...document.querySelectorAll('[data-studio-tab]')];
    tabs.forEach((tab, i) => {
      tab.setAttribute("role", "tab"); tab.id ||= `studio-tab-${tab.dataset.studioTab}`;
      const page = document.querySelector(`[data-studio-page="${tab.dataset.studioTab}"]`);
      if (page) { page.id ||= `studio-page-${tab.dataset.studioTab}`; page.setAttribute("role", "tabpanel"); page.setAttribute("aria-labelledby", tab.id); tab.setAttribute("aria-controls", page.id); }
      const sync = () => { const active = tab.classList.contains("active"); tab.setAttribute("aria-selected", String(active)); tab.tabIndex = active ? 0 : -1; };
      sync(); new MutationObserver(sync).observe(tab, { attributes: true, attributeFilter: ["class"] });
      tab.addEventListener("keydown", e => {
        let next;
        if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
        if (e.key === "ArrowLeft") next = (i + tabs.length - 1) % tabs.length;
        if (e.key === "Home") next = 0; if (e.key === "End") next = tabs.length - 1;
        if (next !== undefined) { e.preventDefault(); e.stopPropagation(); tabs[next].click(); tabs[next].focus(); }
      });
    });
  },
  setupDialogs() {
    const modals = [...document.querySelectorAll('.modal-overlay')], stack = [], inert = new Map();
    const focusHeading = modal => {
      const heading = modal.querySelector("h3, h2, [role=heading], .scroll-title") || modal.querySelector("button");
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    };
    const syncBackground = () => {
      inert.forEach((value, el) => { el.inert = value; }); inert.clear();
      const top = stack.at(-1)?.modal;
      // 換裝是可同時操作 3D 的非模態側欄，不封鎖背景。
      if (!top || top.id === "avatarModal") return;
      for (const el of document.body.children) {
        if (el === top || el.contains(top) || ["SCRIPT", "STYLE"].includes(el.tagName) || el.getAttribute("aria-live")) continue;
        inert.set(el, el.inert); el.inert = true;
      }
    };
    for (const modal of modals) {
      const panel = modal.querySelector('.settings-modal, .modal-content, .scroll-card, .pavilion-modal');
      const heading = modal.querySelector('h3, h2, .scroll-title');
      if (panel) {
        panel.setAttribute("role", "dialog"); panel.setAttribute("aria-modal", String(modal.id !== "avatarModal"));
        if (heading) { heading.id ||= `${modal.id}-title`; panel.setAttribute("aria-labelledby", heading.id); }
        else panel.setAttribute("aria-label", "神殿功能視窗");
      }
      modal.querySelectorAll('.modal-close').forEach(btn => btn.setAttribute('aria-label', `關閉${heading?.textContent.trim() || "視窗"}`));
      let opened = false;
      const sync = () => {
        const nowOpen = modal.classList.contains("open"); if (nowOpen === opened) return; opened = nowOpen;
        if (nowOpen) {
          stack.push({ modal, previous: document.activeElement, zIndex: modal.style.zIndex });
          modal.style.zIndex = String(1000 + stack.length * 2);
          if (panel) { panel.scrollTop = 0; panel.scrollLeft = 0; }
          window.temple3d?.avatar?.releaseMovementKeys?.();
          syncBackground(); focusHeading(modal);
        } else {
          const index = stack.findIndex(entry => entry.modal === modal), wasTop = index === stack.length - 1;
          const entry = index >= 0 ? stack.splice(index, 1)[0] : null;
          if (entry) modal.style.zIndex = entry.zIndex;
          syncBackground();
          if (wasTop && !modals.some(m => m.classList.contains("open") && !stack.some(s => s.modal === m))) {
            const top = stack.at(-1)?.modal, previous = entry?.previous;
            if (previous?.isConnected && previous.getClientRects().length && (!top || top.contains(previous))) previous.focus({ preventScroll: true });
            else if (top) focusHeading(top);
            else document.getElementById("btnOpenPavilion")?.focus({ preventScroll: true });
          }
        }
      };
      new MutationObserver(sync).observe(modal, { attributes: true, attributeFilter: ["class"] }); sync();
    }
    window.addEventListener("keydown", e => {
      const modal = stack.at(-1)?.modal; if (!modal) return;
      if (e.key === "Escape") {
        e.preventDefault(); e.stopImmediatePropagation();
        const close = modal.querySelector('.modal-close'); if (close) close.click(); else modal.classList.remove("open");
      }
      if (e.key !== "Tab" || modal.id === "avatarModal") return;
      const buttons = this.focusable(modal), first = buttons[0], last = buttons.at(-1);
      if (!first) { e.preventDefault(); focusHeading(modal); return; }
      if (!modal.contains(document.activeElement) || e.shiftKey && (document.activeElement === first || document.activeElement.tabIndex === -1)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }, true);
  },
  setupDropdowns() {
    for (const [buttonId, menuId] of [["deityDropdownBtn", "deityDropdownMenu"], ["cameraNavBtn", "cameraNavDropdown"], ["btnSoundMenu", "soundMenuPanel"]]) {
      const button = document.getElementById(buttonId), menu = document.getElementById(menuId); if (!button || !menu) continue;
      button.setAttribute("aria-controls", menuId); button.setAttribute("aria-expanded", String(menu.classList.contains("open")));
      if (menu.getAttribute("role") === "dialog") button.setAttribute("aria-haspopup", "dialog");
      new MutationObserver(() => { const open = menu.classList.contains("open"); button.setAttribute("aria-expanded", String(open)); if (!open && menu.contains(document.activeElement)) button.focus(); }).observe(menu, { attributes: true, attributeFilter: ["class"] });
      button.addEventListener("keydown", e => { if (["ArrowDown", "ArrowUp"].includes(e.key)) { e.preventDefault(); if (!menu.classList.contains("open")) button.click(); const items = this.focusable(menu); (e.key === "ArrowUp" ? items.at(-1) : items[0])?.focus(); } });
      menu.addEventListener("keydown", e => {
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); menu.classList.remove("open"); button.focus(); }
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key) || ["INPUT", "SELECT"].includes(e.target.tagName)) return;
        const items = this.focusable(menu), index = items.indexOf(document.activeElement); if (!items.length) return;
        e.preventDefault(); const n = e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : (index + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length; items[n].focus();
      });
    }
  }
};
window.templeReading = templeReading;
templeReading.apply(localStorage.getItem("temple_text_size") || "normal", false);
