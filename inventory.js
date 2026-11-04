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
  chicken: { name: "香脆雞排", icon: "🍗", price: 8 }, flowers: { name: "百合素花", icon: "🌸", price: 6 }
};
const DAILY_BAG = { incense: 6, paper: 3, fruit: 2, peach: 2, fagao: 2, redturtle: 2, guaiguai: 2 };

const templeInventory = {
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
    return { version: 1, coins: raw ? count(d.coins) : 60, items, amulets,
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
    this.save(d); return true;
  },
  addAmulet(id) {
    if (!Object.hasOwn(AMULET_TYPES, id)) return false;
    const d = this.load(); if (!d.amulets.includes(id)) d.amulets.push(id);
    this.save(d); return true;
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
