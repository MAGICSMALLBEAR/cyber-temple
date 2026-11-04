const templeBag = {
  tab: "items",
  open(tab = "items") {
    this.tab = tab; this.render();
    document.getElementById("bagModal").classList.add("open");
  },
  notice(message) { document.getElementById("bagMessage").textContent = message; },
  row(label, detail, buttonText, action, disabled = false) {
    const row = document.createElement("div"); row.className = "bag-row";
    const info = document.createElement("div"), title = document.createElement("strong"), sub = document.createElement("small");
    title.textContent = label; sub.textContent = detail; info.append(title, sub); row.append(info);
    if (buttonText) {
      const button = document.createElement("button"); button.className = "btn-dock-action"; button.textContent = buttonText; button.disabled = disabled;
      button.addEventListener("click", action); row.append(button);
    }
    return row;
  },
  render() {
    const box = document.getElementById("bagContents"); if (!box) return;
    const d = window.templeInventory.data;
    document.getElementById("bagCoins").textContent = d.coins.toLocaleString();
    document.getElementById("bagSupplyStatus").textContent = d.supplyDay === window.templeInventory.day() ? "今日補給已領取：30 平安幣、清香、金紙與五品供品" : "今日補給尚未領取";
    document.querySelectorAll("[data-bag-tab]").forEach(b => b.classList.toggle("active", b.dataset.bagTab === this.tab));
    box.replaceChildren();
    if (this.tab === "items") {
      Object.entries(BAG_ITEMS).forEach(([id, def]) => box.append(this.row(`${def.icon} ${def.name}`, `持有 ${d.items[id]} 份 · 參拜時自動取用`)));
    } else if (this.tab === "amulets") {
      const equipped = localStorage.getItem("temple_equipped_amulet");
      d.amulets.forEach(id => box.append(this.row(`🛡️ ${AMULET_TYPES[id]}`, id === equipped ? "已掛在胸前，同行看得到" : "可掛在胸前", id === equipped ? "卸下" : "佩戴", () => {
        window.temple3d.avatar.equipAmulet(id === equipped ? null : id); this.render();
      })));
      if (!d.amulets.length) box.append(this.row("還沒有平安符", "到服務處購買，或在功德福閣過爐開光。"));
    } else if (this.tab === "favorites") {
      d.favorites.forEach(id => {
        const c = window.CHIAM_DATA.find(c => c.id === id); if (!c) return;
        const row = this.row(`第 ${id} 籤 · ${c.ganZhi}`, `${c.fortune} · ${c.guaTou}`, "重閱", () => {
          document.getElementById("bagModal").classList.remove("open"); window.openChiamModal(c);
        });
        const remove = document.createElement("button"); remove.className = "onboarding-skip"; remove.textContent = "取消收藏";
        remove.addEventListener("click", () => window.templeInventory.favorite(id)); row.append(remove); box.append(row);
      });
      if (!d.favorites.length) box.append(this.row("尚無收藏", "求得籤詩後，按籤詩視窗的「收藏」；收藏不受歷史筆數限制。"));
    } else {
      const near = window.templeInventory.nearService();
      if (!near) box.append(this.row("服務處商店", "購買請先到服務處（走出大殿正門的右手邊）。", "前往服務處", () => {
        document.getElementById("bagModal").classList.remove("open"); window.pilgrimage.goTo(PILGRIM_STEPS[0]);
      }));
      const purchase = (id, name) => {
        const ok = window.templeInventory.buy(id);
        this.render(); this.notice(ok ? `已購入${name}，放入背包。` : "平安幣不足、已持有，或請先走近服務處。");
      };
      Object.entries(BAG_ITEMS).forEach(([id, def]) => box.append(this.row(`${def.icon} ${def.name}`, `持有 ${d.items[id]} 份`, `${def.price} 平安幣`, () => purchase(id, def.name), !near || d.coins < def.price)));
      Object.entries(AMULET_TYPES).forEach(([id, name]) => box.append(this.row(`🛡️ ${name}`, d.amulets.includes(id) ? "已持有" : "可永久佩戴", "25 平安幣", () => purchase(`amulet:${id}`, name), !near || d.coins < 25 || d.amulets.includes(id))));
    }
  },
  updateFavoriteButton() {
    const button = document.getElementById("btnFavoriteChiam");
    if (button) button.textContent = window.templeInventory.data.favorites.includes(state.selectedChiam?.id) ? "⭐ 已收藏（點擊取消）" : "☆ 收藏籤詩";
  },
  init() {
    document.getElementById("btnOpenBag").addEventListener("click", () => this.open());
    document.getElementById("btnOpenBagPavilion").addEventListener("click", () => this.open());
    document.getElementById("bagModalClose").addEventListener("click", () => document.getElementById("bagModal").classList.remove("open"));
    document.querySelectorAll("[data-bag-tab]").forEach(b => b.addEventListener("click", () => { this.tab = b.dataset.bagTab; this.notice(""); this.render(); }));
    document.getElementById("btnBagDaily").addEventListener("click", () => { const claimed = window.templeInventory.claimDaily(); this.render(); this.notice(claimed ? "已領取今日補給。" : "今日已領取，明天台灣時間再來領取。"); });
    document.getElementById("btnFavoriteChiam").addEventListener("click", () => { if (state.selectedChiam) window.templeInventory.favorite(state.selectedChiam.id); });
    window.addEventListener("temple:inventory", () => { this.render(); this.updateFavoriteButton(); });
    window.addEventListener("storage", e => { if (e.key === BAG_KEY || e.key === null) { this.render(); this.updateFavoriteButton(); } });
    this.render();
  }
};
window.templeBag = templeBag;
