// 平安幣與背包：單次操作先檢查全部庫存，成功才一起扣除、保存與通知。
const BAG_KEY = "temple_inventory";
const AMULET_TYPES = {
  mazu: "媽祖平安符", wenchang: "文昌功名符", caishen: "財神招財符", yuelao: "月老良緣符",
  guaiguai: "乖乖守護符", taisui: "太歲平安符", guanyin: "觀音護身符", guangong: "關公護身符", tudigong: "土地公平安符"
};
const BAG_ITEMS = {
  incense: { name: "清香一份", icon: "🔥", price: 2 }, paper: { name: "金紙一份", icon: "🧧", price: 4 },
  fruit: { name: "五福果盤", icon: "🍎", price: 6 }, peach: { name: "長生仙桃", icon: "🍑", price: 6 },
  fagao: { name: "富貴發糕", icon: "🍞", price: 6 }, redturtle: { name: "紅龜粿", icon: "🐢", price: 6 },
  guaiguai: { name: "金牌乖乖", icon: "🟢", price: 6 }, milktea: { name: "特大珍奶", icon: "🧋", price: 8 },
  chicken: { name: "香脆雞排", icon: "🍗", price: 8 }, flowers: { name: "百合素花", icon: "🌸", price: 6 },
  goldIngot: { name: "金元寶盤", icon: "🟨", price: 12, category: "treasure", description: "三枚船形金元寶，置於朱紅供盤" },
  silverIngot: { name: "銀元寶盤", icon: "⬜", price: 10, category: "treasure", description: "三枚銀色元寶，搭配藍白供盤" },
  treasureBowl: { name: "金銀聚寶盆", icon: "💰", price: 20, category: "treasure", description: "紅金寶盆盛放金銀元寶與銅錢" }
};
const DAILY_BAG = { incense: 6, paper: 3, fruit: 2, peach: 2, fagao: 2, redturtle: 2, guaiguai: 2 };
// 遊戲中的主題搭配，可逐盤自行更換。
const OFFERING_SETS = {
  peace: { name: "平安祈福", icon: "🪷", note: "鮮花與素果，為日常平安備供", dishes: ["fruit", "flowers", "redturtle", "fagao", "guaiguai"] },
  study: { name: "求學精進", icon: "📚", note: "以果品、糕點與乖乖表達心意", dishes: ["fruit", "fagao", "guaiguai", "peach", "flowers"] },
  wealth: { name: "招財納福", icon: "💰", note: "金銀元寶與聚寶盆的主題擺設", dishes: ["goldIngot", "silverIngot", "treasureBowl", "fruit", "fagao"] },
  birthday: { name: "祝壽添喜", icon: "🍑", note: "雙份仙桃搭配鮮花、糕點", dishes: ["peach", "peach", "flowers", "redturtle", "fagao"] },
  thanks: { name: "答謝還願", icon: "🙏", note: "鮮花、水果與點心，帶著感謝回來", dishes: ["flowers", "fruit", "peach", "redturtle", "guaiguai"] }
};

const templeInventory = {
  tableStyles: { wood: "紅木雕花", brocade: "紅布金繡", stone: "青石供桌" },
  offeringSets: OFFERING_SETS,
  isOffering(id) { return typeof id === "string" && Object.hasOwn(BAG_ITEMS, id) && !["incense", "paper"].includes(id); },
  day() {
    const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const part = type => parts.find(p => p.type === type).value;
    return `${part("year")}-${part("month")}-${part("day")}`;
  },
  load() {
    let raw;
    try { raw = JSON.parse(localStorage.getItem(BAG_KEY)); } catch (e) {}
    const d = raw && typeof raw === "object" ? raw : {};
    const count = n => Number.isSafeInteger(n) && n >= 0 ? Math.min(n, 1000000) : 0;
    const items = {};
    Object.keys(BAG_ITEMS).forEach(id => { items[id] = count(d.items?.[id]); });
    const amulets = Array.isArray(d.amulets) ? [...new Set(d.amulets.filter(id => typeof id === "string" && Object.hasOwn(AMULET_TYPES, id)))] : [];
    const legacy = localStorage.getItem("temple_equipped_amulet");
    if (Object.hasOwn(AMULET_TYPES, legacy) && !amulets.includes(legacy)) amulets.push(legacy);
    // 舊版擺盤只是預覽，並未扣庫存；升級時不能將舊預覽當成可收回的實物。
    const slots = Array.from({ length: 5 }, (_, i) => this.isOffering(d.offering?.slots?.[i]) ? d.offering.slots[i] : null);
    const offering = { slots, presented: slots.some(Boolean) && d.offering?.presented === true,
      style: Object.hasOwn(this.tableStyles, d.offering?.style) ? d.offering.style : "wood" };
    return { version: 2, coins: raw ? count(d.coins) : 60, items, amulets, offering,
      offeringSet: Object.hasOwn(OFFERING_SETS, d.offeringSet) ? d.offeringSet : "peace",
      carryMode: ["basket", "tray"].includes(d.carryMode) && Object.keys(items).some(id => this.isOffering(id) && items[id] > 0) ? d.carryMode : "",
      offeringRewardDay: typeof d.offeringRewardDay === "string" ? d.offeringRewardDay : "",
      favorites: Array.isArray(d.favorites) ? [...new Set(d.favorites.filter(n => Number.isInteger(n) && n >= 1 && n <= 60))] : [],
      supplyDay: typeof d.supplyDay === "string" ? d.supplyDay : "", marketDay: typeof d.marketDay === "string" ? d.marketDay : "", marketRewards: count(d.marketRewards) };
  },
  save(d) {
    localStorage.setItem(BAG_KEY, JSON.stringify(d));
    window.dispatchEvent(new CustomEvent("temple:inventory"));
  },
  get data() { return this.load(); },
  claimDaily() {
    const d = this.load(), day = this.day();
    if (d.supplyDay === day) return false;
    d.supplyDay = day; d.coins = Math.min(1000000, d.coins + 30);
    Object.entries(DAILY_BAG).forEach(([id, n]) => { d.items[id] = Math.min(999, d.items[id] + n); });
    this.save(d); return true;
  },
  consume(needs) {
    const d = this.load();
    if (!needs || !Object.keys(needs).length) return false;
    for (const [id, n] of Object.entries(needs)) {
      if (!Object.hasOwn(BAG_ITEMS, id) || !Number.isInteger(n) || n <= 0) return false;
      if (d.items[id] < n) {
        window.setDockStatus?.(`🎒 ${BAG_ITEMS[id].name}不足，請到服務處補給或購買。`);
        window.templeBag?.open("shop"); return false;
      }
    }
    Object.entries(needs).forEach(([id, n]) => { d.items[id] -= n; });
    this.save(d); return true;
  },
  nearService() {
    const a = window.temple3d?.avatar;
    return !!a && Math.hypot(a.position.x - SERVICE_DESK_POS[0], a.position.z - SERVICE_DESK_POS[1]) < 2.2;
  },
  buy(id, quantity = 1) {
    if (typeof id !== "string" || !this.nearService() || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) return false;
    const d = this.load(), charm = id.startsWith("amulet:") ? id.slice(7) : null;
    const definition = charm ? (Object.hasOwn(AMULET_TYPES, charm) ? { price: 25 } : null) : Object.hasOwn(BAG_ITEMS, id) ? BAG_ITEMS[id] : null;
    if (!definition || (charm && (quantity !== 1 || d.amulets.includes(charm)))) return false;
    const cost = definition.price * quantity;
    if (d.coins < cost || (!charm && d.items[id] + quantity > 999)) return false;
    d.coins -= cost;
    if (charm) d.amulets.push(charm); else d.items[id] += quantity;
    if (!charm && this.isOffering(id)) d.carryMode = "basket";
    this.save(d); return true;
  },
  buyBasket(basket, expectedTotal) {
    if (!this.nearService()) return { ok: false, reason: "location" };
    if (!basket || typeof basket !== "object" || Array.isArray(basket)) return { ok: false, reason: "invalid" };
    const entries = Object.entries(basket), d = this.load(); let total = 0;
    if (!entries.length || entries.some(([id, n]) => !Object.hasOwn(BAG_ITEMS, id) || !Number.isInteger(n) || n < 1 || n > 10)) return { ok: false, reason: "invalid" };
    for (const [id, n] of entries) {
      if (d.items[id] + n > 999) return { ok: false, reason: "full" };
      total += BAG_ITEMS[id].price * n;
    }
    if (total !== expectedTotal) return { ok: false, reason: "changed" };
    if (d.coins < total) return { ok: false, reason: "funds" };
    d.coins -= total; entries.forEach(([id, n]) => { d.items[id] += n; });
    if (entries.some(([id]) => this.isOffering(id))) d.carryMode = "basket";
    this.save(d); return { ok: true, total };
  },
  nearOfferingTable() {
    const p = window.temple3d?.avatar?.position;
    return !!p && Math.hypot(p.x, p.z) < 3.2;
  },
  setTableStyle(style) {
    if (!Object.hasOwn(this.tableStyles, style)) return false;
    const d = this.load(); d.offering.style = style; this.save(d); return true;
  },
  selectOfferingSet(id) {
    if (!Object.hasOwn(OFFERING_SETS, id)) return false;
    const d = this.load(); d.offeringSet = id; this.save(d); return true;
  },
  offeringSetNeeds(id = this.data.offeringSet) {
    if (!Object.hasOwn(OFFERING_SETS, id)) return null;
    const needs = {}; OFFERING_SETS[id].dishes.forEach(item => { needs[item] = (needs[item] || 0) + 1; }); return needs;
  },
  setCarryMode(mode) {
    if (!["", "basket", "tray"].includes(mode)) return false;
    const d = this.load();
    if (mode && !Object.keys(d.items).some(id => this.isOffering(id) && d.items[id])) return false;
    d.carryMode = mode; this.save(d); return true;
  },
  // 提籃／供盤裡顯示的供品：只取背包現有的，先依目前主題組合的順序、再依商品順序；
  // 先各放一樣，還有空位才放第二份。只是外觀，不扣也不另存庫存。
  carryDisplayItems(d = this.load(), limit = 3) {
    const order = [...new Set([...(OFFERING_SETS[d.offeringSet]?.dishes || []), ...Object.keys(BAG_ITEMS)])].filter(id => this.isOffering(id) && d.items[id] > 0);
    const left = Object.fromEntries(order.map(id => [id, d.items[id]])), picked = [];
    while (picked.length < limit && order.some(id => left[id] > 0)) {
      for (const id of order) { if (picked.length < limit && left[id] > 0) { picked.push(id); left[id]--; } }
    }
    return picked;
  },
  // 桌面與背包寫在同一份存檔，一次完成取出／替換／歸還。
  placeOffering(slot, id) {
    if (!this.nearOfferingTable()) return { ok: false, reason: "location" };
    if (!Number.isInteger(slot) || slot < 0 || slot > 4 || !this.isOffering(id)) return { ok: false, reason: "invalid" };
    const d = this.load(), old = d.offering.slots[slot];
    if (d.offering.presented) return { ok: false, reason: "presented" };
    if (old === id) return { ok: false, reason: "same" };
    if (!d.items[id]) return { ok: false, reason: "stock" };
    if (old && d.items[old] >= 1000000) return { ok: false, reason: "full" };
    d.items[id]--; if (old) d.items[old]++;
    d.offering.slots[slot] = id; this.save(d);
    window.dispatchEvent(new CustomEvent("temple:offering-motion", { detail: { name: "placeOffering" } })); return { ok: true };
  },
  placeOfferingSet(ids) {
    if (!this.nearOfferingTable()) return { ok: false, reason: "location" };
    if (!Array.isArray(ids) || ids.length !== 5 || !ids.every(id => this.isOffering(id))) return { ok: false, reason: "invalid" };
    const d = this.load();
    if (d.offering.presented) return { ok: false, reason: "presented" };
    const next = { ...d.items };
    d.offering.slots.forEach(id => { if (id) next[id]++; });
    for (const id of ids) { if (!next[id]) return { ok: false, reason: "stock" }; next[id]--; }
    if (Object.values(next).some(n => n > 1000000)) return { ok: false, reason: "full" };
    d.items = next; d.offering.slots = ids.slice(); this.save(d);
    window.dispatchEvent(new CustomEvent("temple:offering-motion", { detail: { name: "placeOffering" } })); return { ok: true };
  },
  collectOfferings(slot = null) {
    if (!this.nearOfferingTable()) return { ok: false, reason: "location" };
    if (slot !== null && (!Number.isInteger(slot) || slot < 0 || slot > 4)) return { ok: false, reason: "invalid" };
    const d = this.load();
    if (slot !== null && d.offering.presented) return { ok: false, reason: "presented" };
    const indices = slot === null ? [0, 1, 2, 3, 4] : [slot];
    if (!indices.some(i => d.offering.slots[i])) return { ok: false, reason: "empty" };
    const next = { ...d.items };
    indices.forEach(i => { const id = d.offering.slots[i]; if (id) next[id]++; });
    if (Object.values(next).some(n => n > 1000000)) return { ok: false, reason: "full" };
    const wasPresented = d.offering.presented, count = indices.filter(i => d.offering.slots[i]).length;
    d.items = next; indices.forEach(i => { d.offering.slots[i] = null; }); d.offering.presented = false; d.carryMode = "basket";
    this.save(d);
    window.dispatchEvent(new CustomEvent("temple:offering-motion", { detail: { name: "collectOffering" } }));
    window.emitRitual?.("offeringsCollected", { all: slot === null, wasPresented, count }); return { ok: true };
  },
  presentOfferings() {
    if (!this.nearOfferingTable()) return { ok: false, reason: "location" };
    const d = this.load();
    if (d.offering.presented) return { ok: false, reason: "presented" };
    if (!d.offering.slots.some(Boolean)) return { ok: false, reason: "empty" };
    d.offering.presented = true; d.carryMode = "";
    const reward = d.offeringRewardDay === this.day() ? 0 : 128;
    if (reward) d.offeringRewardDay = this.day();
    this.save(d); return { ok: true, reward };
  },
  addAmulet(id) {
    if (!Object.hasOwn(AMULET_TYPES, id)) return false;
    const d = this.load(); if (!d.amulets.includes(id)) d.amulets.push(id);
    this.save(d); return true;
  },
  ritualRequirements(step = 0, dishes = ["fruit", "peach", "fagao", "redturtle", "guaiguai"]) {
    if (!Number.isInteger(step) || step < 0 || step > 7) step = 0;
    const needs = {};
    if (step <= 1) needs.incense = 2;
    else if (step <= 2) needs.incense = 1;
    if (step <= 3) {
      const defaults = ["fruit", "peach", "fagao", "redturtle", "guaiguai"];
      for (let i = 0; i < 5; i++) {
        const id = dishes?.[i];
        const food = this.isOffering(id) ? id : defaults[i];
        needs[food] = (needs[food] || 0) + 1;
      }
    }
    needs.paper = 1;
    return needs;
  },
  restockQuote(needs, d = this.load()) {
    if (!needs || typeof needs !== "object" || Array.isArray(needs)) return { valid: false, items: [], total: 0 };
    const items = [];
    for (const [id, need] of Object.entries(needs)) {
      if (!Object.hasOwn(BAG_ITEMS, id) || !Number.isInteger(need) || need < 1 || need > 999) return { valid: false, items: [], total: 0 };
      const onTable = d.offering.slots.filter(item => item === id).length;
      const have = d.items[id] + onTable, missing = Math.max(0, need - have), price = BAG_ITEMS[id].price;
      items.push({ id, name: BAG_ITEMS[id].name, icon: BAG_ITEMS[id].icon, need, have, missing, price, cost: missing * price });
    }
    return { valid: items.length > 0, items, total: items.reduce((sum, item) => sum + item.cost, 0) };
  },
  buyRestock(needs, expectedTotal) {
    if (!this.nearService()) return { ok: false, reason: "location" };
    const d = this.load(), quote = this.restockQuote(needs, d);
    if (!quote.valid || !Number.isSafeInteger(expectedTotal) || expectedTotal < 0) return { ok: false, reason: "invalid" };
    if (quote.total !== expectedTotal) return { ok: false, reason: "changed" };
    if (!quote.total) return { ok: false, reason: "complete" };
    if (d.coins < quote.total) return { ok: false, reason: "funds" };
    quote.items.forEach(item => { d.items[item.id] += item.missing; });
    d.coins -= quote.total;
    if (quote.items.some(item => item.missing && this.isOffering(item.id))) d.carryMode = "basket";
    this.save(d);
    return { ok: true, total: quote.total };
  },
  favorite(id) {
    if (!Number.isInteger(id) || !window.CHIAM_DATA?.some(c => c.id === id)) return false;
    const d = this.load();
    if (d.favorites.includes(id)) d.favorites = d.favorites.filter(n => n !== id);
    else d.favorites.push(id);
    this.save(d); return true;
  },
  awardMarket(score) {
    const d = this.load(), day = this.day();
    if (d.marketDay !== day) { d.marketDay = day; d.marketRewards = 0; }
    if (d.marketRewards >= 3) return 0;
    const reward = Math.min(15, Math.max(0, Math.floor(score)) * 3);
    if (!reward) return 0;
    d.marketRewards++; d.coins = Math.min(1000000, d.coins + reward); this.save(d); return reward;
  },
  init() {
    this.claimDaily();
    window.addEventListener("focus", () => this.claimDaily());
  }
};
window.templeInventory = templeInventory;
