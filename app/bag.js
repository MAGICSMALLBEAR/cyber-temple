const templeBag = {
  tab: "items",
  basket: {},
  shopFilter: "all",
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
    const bag = window.templeInventory;
    const needs = window.pilgrimage?.materialNeeds ? window.pilgrimage.materialNeeds() : bag.ritualRequirements(step, bag.offeringSets[bag.data.offeringSet].dishes);
    const quote = window.templeInventory.restockQuote(needs);
    const section = document.createElement("details"); section.className = "restock-summary";
    section.open = progress?.active && progress.step === 0;
    const summary = document.createElement("summary"); summary.textContent = "一鍵補齊參拜材料"; section.append(summary);
    const title = document.createElement("h4"); title.textContent = progress?.active ? "這次參拜的剩餘材料" : "一次完整參拜所需材料"; section.append(title);
    const note = document.createElement("p"); note.className = "wall-footnote"; note.textContent = "依所選主題與剩餘步驟備料；持有數包含供桌上的份數，只買缺額。"; section.append(note);
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
  renderOfferingSets(box, context = "shop") {
    const bag = window.templeInventory, d = bag.data, theme = bag.offeringSets[d.offeringSet];
    const section = document.createElement("section"); section.className = "offering-set-panel";
    const label = document.createElement("label"); label.textContent = "主題供品組合 ";
    const select = document.createElement("select"); select.className = "temple-select"; select.id = context === "shop" ? "shopOfferingSet" : "feastOfferingSet"; select.setAttribute("aria-label", "選擇主題供品組合");
    Object.entries(bag.offeringSets).forEach(([id, set]) => { const option = document.createElement("option"); option.value = id; option.textContent = `${set.icon} ${set.name}`; select.append(option); });
    select.value = d.offeringSet;
    select.addEventListener("change", () => { bag.selectOfferingSet(select.value); document.getElementById(select.id)?.focus(); }); label.append(select); section.append(label);
    const note = document.createElement("p"); note.className = "wall-footnote"; note.textContent = `${theme.note}。可自行換盤；選擇主題只作預覽。`; section.append(note);
    const preview = document.createElement("div"); preview.className = "offering-set-preview";
    theme.dishes.forEach(id => { const chip = document.createElement("span"); chip.textContent = `${BAG_ITEMS[id].icon} ${BAG_ITEMS[id].name}`; preview.append(chip); }); section.append(preview);
    const needs = bag.offeringSetNeeds(), quote = bag.restockQuote(needs);
    const stock = document.createElement("p"); stock.className = "offering-set-stock";
    stock.textContent = quote.total ? `還缺：${quote.items.filter(item => item.missing).map(item => `${item.name} × ${item.missing}`).join("、")} · 補買 ${quote.total} 平安幣` : "此組供品已備齊（含桌上份數），可在供桌一鍵擺放。"; section.append(stock);
    const action = document.createElement("button"); action.className = "btn-dock-action";
    if (context === "shop") {
      action.id = "btnBuyOfferingSet"; action.textContent = quote.total ? `只補買此組缺額 · ${quote.total} 平安幣` : "此組已備齊";
      action.disabled = !bag.nearService() || !quote.total || d.coins < quote.total;
      action.addEventListener("click", () => {
        const result = bag.buyRestock(needs, quote.total);
        this.notice(result.ok ? `已補買${theme.name}缺額，共 ${result.total} 平安幣；已放入背包。` : "庫存、位置或餘額有變動，請確認最新明細後再購買。");
      });
    } else {
      action.id = "btnPlaceOfferingSet"; action.textContent = `擺上${theme.name}組合`;
      action.disabled = !bag.nearOfferingTable() || d.offering.presented || quote.total > 0;
      action.addEventListener("click", () => { const result = bag.placeOfferingSet(theme.dishes); feastResult(result, `已擺上${theme.name}組合，原供品已放回背包。`); });
    }
    section.append(action); box.append(section);
  },
  renderShop(box, near, d) {
    const heading = document.createElement("h4"); heading.textContent = "🏮 廟埕供品鋪"; box.append(heading);
    const intro = document.createElement("p"); intro.className = "wall-footnote";
    intro.textContent = "挑選供品與金銀財寶，加入採買籃後一起結帳。物品放入背包，再帶到大殿供桌擺供。"; box.append(intro);
    this.renderOfferingSets(box, "shop");
    if (window.pilgrimage?.data?.active && window.pilgrimage.data.step === 0) {
      this.renderRestock(box, near);
      const ready = document.createElement("button"); ready.id = "btnPilgrimSuppliesReady"; ready.className = "btn-dock-action"; ready.textContent = "✓ 材料備齊，開始參拜";
      const complete = window.pilgrimage.materialQuote?.().total === 0;
      ready.disabled = !near || !complete;
      ready.addEventListener("click", () => window.pilgrimage.confirmSupplies()); box.append(ready);
    }
    const filters = document.createElement("div"); filters.className = "shop-filters";
    for (const [id, name] of [["all", "全部"], ["food", "鮮花供品"], ["treasure", "金銀財寶"], ["supplies", "香與金紙"]]) {
      const b = document.createElement("button"); b.className = "btn-custom-pill"; b.textContent = name; b.setAttribute("aria-pressed", String(this.shopFilter === id));
      b.addEventListener("click", () => { this.shopFilter = id; this.render(); }); filters.append(b);
    }
    box.append(filters);
    const grid = document.createElement("div"); grid.className = "shop-catalog";
    Object.entries(BAG_ITEMS).forEach(([id, def]) => {
      const category = def.category || (window.templeInventory.isOffering(id) ? "food" : "supplies");
      if (this.shopFilter !== "all" && this.shopFilter !== category) return;
      const card = document.createElement("article"); card.className = "shop-product"; card.dataset.product = id;
      const art = document.createElement("div"); art.className = "shop-product-art"; art.dataset.item = id; art.setAttribute("aria-hidden", "true"); art.textContent = def.icon;
      const title = document.createElement("h5"); title.textContent = def.name;
      const detail = document.createElement("p"); detail.textContent = def.description || (category === "food" ? "可帶到大殿，選擇供盤擺放" : "參拜時從背包取用");
      const price = document.createElement("small"); price.textContent = `${def.price} 平安幣／份 · 背包 ${d.items[id]} 份`;
      const controls = document.createElement("div"); controls.className = "shop-product-controls";
      const quantity = document.createElement("input"); quantity.type = "number"; quantity.min = "1"; quantity.max = "10"; quantity.step = "1"; quantity.value = "1"; quantity.setAttribute("aria-label", `${def.name}購買數量`);
      const add = document.createElement("button"); add.className = "btn-dock-action"; add.textContent = "加入採買籃"; add.disabled = !near;
      add.addEventListener("click", () => {
        const n = Number(quantity.value);
        if (!Number.isInteger(n) || n < 1 || n > 10 || (this.basket[id] || 0) + n > 10) { this.notice("每種商品一次可選 1～10 份。"); return; }
        this.basket[id] = (this.basket[id] || 0) + n; this.render(); this.notice(`已加入${def.name} ${n} 份，尚未扣款。`);
      });
      controls.append(quantity, add); card.append(art, title, detail, price, controls); grid.append(card);
    }); box.append(grid);
    const basket = document.createElement("section"); basket.className = "shop-basket";
    const title = document.createElement("h4"); title.textContent = "🧺 採買籃"; basket.append(title);
    let total = 0;
    Object.entries(this.basket).forEach(([id, n]) => {
      const def = BAG_ITEMS[id]; total += def.price * n;
      basket.append(this.row(`${def.icon} ${def.name} × ${n}`, `${def.price * n} 平安幣`, "移除", () => { delete this.basket[id]; this.render(); }));
    });
    const summary = document.createElement("p"); summary.id = "shopBasketTotal"; summary.textContent = total ? `合計 ${total} 平安幣${total > d.coins ? ` · 還差 ${total - d.coins} 幣` : ` · 結帳後剩 ${d.coins - total} 幣`}` : "尚未選購商品。"; basket.append(summary);
    const checkout = document.createElement("button"); checkout.id = "btnShopCheckout"; checkout.className = "btn-dock-action"; checkout.textContent = "結帳並放入背包"; checkout.disabled = !near || !total || d.coins < total;
    checkout.addEventListener("click", () => {
      const result = window.templeInventory.buyBasket(this.basket, total);
      if (result.ok) this.basket = {};
      this.render(); this.notice(result.ok ? `已結帳 ${result.total} 平安幣，供品已放入背包。到大殿供桌擺上即可敬獻。` : ({ location: "請先走近供品鋪。", full: "背包數量已滿，沒有扣款。", funds: "平安幣不足，沒有扣款。" }[result.reason] || "採買內容有變動，請重新確認。"));
    }); basket.append(checkout);
    const table = document.createElement("button"); table.className = "btn-custom-pill"; table.textContent = "🍱 前往供桌擺供";
    table.addEventListener("click", () => { document.getElementById("bagModal").classList.remove("open"); window.templeVisit?.go("offerings"); }); basket.append(table); box.append(basket);
  },
  render() {
    const box = document.getElementById("bagContents"); if (!box) return;
    const d = window.templeInventory.data;
    document.getElementById("bagCoins").textContent = d.coins.toLocaleString();
    document.getElementById("bagSupplyStatus").textContent = d.supplyDay === window.templeInventory.day() ? "今日補給已領取：30 平安幣、清香、金紙與五品供品" : "今日補給尚未領取";
    document.querySelectorAll("[data-bag-tab]").forEach(b => b.classList.toggle("active", b.dataset.bagTab === this.tab));
    box.replaceChildren();
    if (this.tab === "items") {
      Object.entries(BAG_ITEMS).forEach(([id, def]) => box.append(this.row(`${def.icon} ${def.name}`, `背包 ${d.items[id]} 份 · 桌上 ${d.offering.slots.filter(item => item === id).length} 份`, window.templeInventory.isOffering(id) ? "擺供／收供" : "", () => { document.getElementById("bagModal").classList.remove("open"); window.openFeastModal?.(); })));
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
      this.renderShop(box, near, d);
      if (!window.pilgrimage?.data?.active || window.pilgrimage.data.step !== 0) this.renderRestock(box, near);
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
    document.getElementById("btnBagCarry")?.addEventListener("click", () => {
      const bag = window.templeInventory, carrying = !!bag.data.carryMode;
      this.notice(bag.setCarryMode(carrying ? "" : "basket") ? carrying ? "已放下提籃，供品仍在背包。" : "已提起供品籃，關閉背包即可查看。" : "背包中還沒有可攜帶的供品。");
    });
    window.addEventListener("temple:inventory", () => { this.render(); this.updateFavoriteButton(); });
    window.addEventListener("storage", e => { if (e.key === BAG_KEY || e.key === null) { this.render(); this.updateFavoriteButton(); } });
    this.render();
  }
};
window.templeBag = templeBag;
