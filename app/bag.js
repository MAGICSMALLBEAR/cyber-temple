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
  renderRestock(box, near) {
    const progress = window.pilgrimage?.data;
    const step = progress?.active ? progress.step : 0;
    const dishes = typeof currentFeastDishes !== "undefined" ? currentFeastDishes : undefined;
    const needs = window.templeInventory.ritualRequirements(step, dishes);
    const quote = window.templeInventory.restockQuote(needs);
    const section = document.createElement("section"); section.className = "restock-summary";
    const title = document.createElement("h4"); title.textContent = progress?.active ? "這次參拜的剩餘材料" : "一次完整參拜所需材料"; section.append(title);
    const note = document.createElement("p"); note.className = "wall-footnote"; note.textContent = "供品依目前擺盤計算，只買缺少的數量。"; section.append(note);
    quote.items.forEach(item => {
      const line = document.createElement("p"); line.className = item.missing ? "restock-missing" : "restock-ready";
      line.textContent = `${item.icon} ${item.name}：持有 ${item.have}／需要 ${item.need}${item.missing ? `，補 ${item.missing} 份 × ${item.price} 幣＝${item.cost} 幣` : "，已備齊"}`; section.append(line);
    });
    const total = document.createElement("strong"); total.textContent = quote.total ? `本次合計 ${quote.total} 平安幣` : "材料已備齊，不需購買"; section.append(total);
    const buy = document.createElement("button"); buy.className = "btn-dock-action"; buy.textContent = quote.total ? `一鍵補齊 · ${quote.total} 平安幣` : "已備齊";
    buy.disabled = !near || quote.total === 0 || window.templeInventory.data.coins < quote.total;
    buy.addEventListener("click", () => {
      const result = window.templeInventory.buyRestock(needs, quote.total);
      this.render();
      this.notice(result.ok ? `補給完成，已扣 ${result.total} 平安幣；所有材料已放入背包。` : ({ changed: "庫存已變動，請確認更新後的金額再購買。", complete: "材料已備齊。", funds: "平安幣不足，沒有扣款。", location: "請先走近服務處。" }[result.reason] || "無法購買這份補給清單。"));
    });
    section.append(buy);
    if (near && quote.total > window.templeInventory.data.coins) {
      const short = document.createElement("p"); short.textContent = `還差 ${quote.total - window.templeInventory.data.coins} 平安幣，可先領取每日補給。`; section.append(short);
    }
    box.append(section);
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
      this.renderRestock(box, near);
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
