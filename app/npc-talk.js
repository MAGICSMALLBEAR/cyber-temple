// app/npc-talk.js - 會說話的 NPC：走近按 E 或點 NPC 聊聊；台詞依時辰、天氣、節慶變化，每次換一句
// 攤販（賣地瓜球的阿姨、茶攤老闆）可用平安幣買現吃小點心或供品；山門道長講參拜順序與禮節。
// NPC 本身在 avatar/companions.js 生成（名字與位置），這裡依名字對應台詞，不另外維護位置。

const NPC_TALK_RANGE = 3.2;

// 台詞：any 平常、morning／day／evening／night 依時段、rain 下雨（含雷雨）、festival 節慶當天（{f} 會換成節慶名稱）
const NPC_PROFILES = {
  "淡淡的月光": {
    any: ["坐在蒲團上，什麼都不想，心就慢慢靜了。", "大殿的香煙往上飄，煩惱也跟著輕了。", "跪坐稟告時，先說自己是誰、住哪裡，再說所求。"],
    night: ["夜裡的大殿最安靜，連木魚聲都特別清楚。"],
    festival: ["今天是{f}，香客比平常多，記得排隊上香。"]
  },
  "靜心的雲": {
    any: ["擲筊時心要誠，問題要具體，神明才好回答。", "一正一反是聖筊，兩面朝上是笑筊，兩面朝下是陰筊。", "求到籤先別急著看吉凶，籤詩的意思要整首讀。"],
    morning: ["早上的第一炷香，最能讓人清醒。"],
    festival: ["{f}這天來拜拜，神明特別熱鬧。"]
  },
  "虔誠香客小美": {
    any: ["進廟先拜天公爐，敬天之後再進大殿拜主神。", "香舉到額頭，心裡默念，再插進爐裡。", "插香用左手，據說是比較恭敬的做法。"],
    rain: ["下雨天香比較難點，用手擋著風就好。"],
    festival: ["{f}！我一早就來搶頭香了。"]
  },
  "池畔許願小哥": {
    any: ["往蓮花池投一枚硬幣，許個願，聽說很靈。", "我每次投幣都許一樣的願，希望它記得我。"],
    rain: ["雨打在荷葉上的聲音，好好聽。"],
    night: ["晚上的蓮花池有燈映在水裡，很漂亮。"]
  },
  "長廊寫願學長": {
    any: ["祈願木牌寫好要掛在高一點的地方，比較顯眼。", "寫願望要具體，『考上第一志願』比『考試順利』好。", "我去年寫的木牌還掛在那邊，今年回來還願。"],
    festival: ["{f}這天掛木牌的人好多，都快沒位置了。"]
  },
  "山門迎客道長": {
    guide: true,
    any: [
      "初來乍到？參拜的順序是：服務處備好香與供品 → 天公爐敬天 → 大殿拜主神 → 擺供稟告 → 求籤 → 收供 → 金爐化紙。",
      "入廟從右邊的龍門進、左邊的虎門出，叫「龍進虎出」，中門是留給神明走的。",
      "拿香要用雙手，舉到眉間，先拜天公再拜主神；插香時一爐插一炷。",
      "供品擺好要先稟告神明，等香燒過一段再收供，最後到金爐把金紙化掉。",
      "不知道去哪？打開「廟區地圖」點地標就會帶你走；畫面下方的「今日香火」也會帶你做今天的功課。"
    ],
    morning: ["早！清晨的廟最清淨，正是參拜的好時候。"],
    night: ["夜深了，參拜完早點回去休息，神明不會怪你來得晚。"],
    festival: ["今天是{f}，廟裡特別熱鬧，參拜時互相禮讓。"]
  },
  "樹下祈願阿嬤": {
    any: ["少年仔，有空多回來拜拜，神明都記得你。", "阿嬤每天都來，拜完心就安了。", "繫在樹上的心願，風吹過就像在跟神明說話。"],
    rain: ["落雨囉，要記得帶傘，不要淋到感冒。"],
    evening: ["天要暗了，拜完早點回家吃飯。"],
    festival: ["{f}喔！阿嬤今天有準備紅龜粿來拜。"]
  },
  "泉邊靜心少年": {
    any: ["用泉水洗洗手，再進殿，心比較乾淨。", "我在這裡坐一下，聽水聲。"],
    day: ["中午太陽大，在泉邊坐一下最涼。"]
  },
  "賣地瓜球的阿姨": {
    vendor: { snack: { name: "地瓜球", icon: "🍠", price: 2, plaza: "food0" }, goods: ["redturtle", "fagao"] },
    any: ["地瓜球剛炸好喔！外酥內Q，來一份？", "拜拜完肚子餓了吧？阿姨這裡也有紅龜粿、發糕，拿去當供品剛好。"],
    rain: ["下雨天吃熱熱的地瓜球最對味！"],
    festival: ["{f}生意特別好，再晚就賣完囉！"]
  },
  "茶攤老闆": {
    vendor: { snack: { name: "古早味紅茶", icon: "🧋", price: 2, plaza: "food4" }, goods: ["teaSet"] },
    any: ["古早味紅茶，甘醇不甜膩，來一杯？", "要敬神的話，三才清茶組最合適，天地人三杯。"],
    day: ["天氣熱，喝杯冰紅茶消暑！"],
    rain: ["下雨天，熱紅茶暖暖身子。"]
  },
  "逛夜市的小情侶": {
    any: ["我們等等要去月老閣拜拜！", "套圈圈好難，我套了十次才中一個。"],
    evening: ["夜市要開了，布袋戲快開演囉！"],
    festival: ["{f}一起來拜拜，好有氣氛。"]
  },
  "來還願的學生": {
    any: ["我去年來求考運，今天考上了，特地來還願！", "還願要記得帶供品，跟神明說謝謝。", "文昌閣在東邊，要考試的話記得去拜。"],
    festival: ["{f}剛好放假，就來還願了。"]
  }
};

const templeNpc = {
  talks: {},   // 每位 NPC 本次聊到第幾句

  npcs() { return window.temple3d?.avatar?.npcs || []; },
  profile(i) { return NPC_PROFILES[this.npcs()[i]?.name] || null; },
  isVendor(i) { return !!this.profile(i)?.vendor; },

  period(date = new Date()) {
    const h = date.getHours();
    return h >= 5 && h < 11 ? "morning" : h >= 11 && h < 17 ? "day" : h >= 17 && h < 23 ? "evening" : "night";
  },

  // 依目前情境排出台詞：情境台詞在前（節慶 → 天氣 → 時段），平常台詞在後
  lines(i, date = new Date()) {
    const prof = this.profile(i);
    if (!prof) return ["願你平安順遂。"];
    const list = [];
    const festival = window.dailyPractice?.festival;
    if (festival && prof.festival) list.push(...prof.festival.map(l => l.replace("{f}", festival.name.split(" • ")[0])));
    const weather = window.templeWeather?.current?.(date);
    if ((weather === "rain" || weather === "storm") && prof.rain) list.push(...prof.rain);
    const period = this.period(date);
    if (prof[period]) list.push(...prof[period]);
    list.push(...prof.any);
    return list;
  },

  near(i) {
    const n = this.npcs()[i], a = window.temple3d?.avatar?.position;
    return !!n && !!a && Math.hypot(a.x - n.group.position.x, a.z - n.group.position.z) <= NPC_TALK_RANGE;
  },

  // 聊天：太遠就先走過去；到了才說話（攤販另外打開買東西的視窗）
  talk(i) {
    const n = this.npcs()[i];
    if (!n) return false;
    if (!this.near(i)) {
      const ok = window.templeVisit?.go(`npc${i}`);
      this.notify(ok ? `🚶 走向${n.name}，到了再點一次或按 E 聊聊。` : `💬 ${n.name}離你有點遠，走近一點再聊。`);
      return false;
    }
    const list = this.lines(i);
    const k = this.talks[i] || 0;
    this.talks[i] = k + 1;
    const line = list[k % list.length];
    this.say(i, line);
    if (this.isVendor(i)) this.openShop(i, line);
    window.emitRitual?.("npcTalk", { npc: n.name });
    return line;
  },

  say(i, line) {
    const n = this.npcs()[i];
    const a = window.temple3d?.avatar;
    // 轉身面向 NPC
    if (a) a.playerGroup.rotation.y = Math.atan2(n.group.position.x - a.position.x, n.group.position.z - a.position.z);
    window.temple3d?.spawn3DFloatingText?.("💬", new THREE.Vector3(n.group.position.x, 1.6, n.group.position.z));
    this.notify(`💬 ${n.name}：「${line}」`);
  },

  // ---------- 攤販 ----------
  openShop(i, line) {
    const prof = this.profile(i), n = this.npcs()[i], modal = document.getElementById("npcShopModal");
    if (!prof?.vendor || !modal) return;
    this.shopNpc = i;
    document.getElementById("npcShopTitle").textContent = `🛒 ${n.name}`;
    document.getElementById("npcShopLine").textContent = `「${line}」`;
    const list = document.getElementById("npcShopItems");
    const { snack, goods } = prof.vendor;
    const row = (icon, name, note, price, onBuy) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn-dock-action npc-shop-item";
      b.dataset.price = String(price);
      b.innerHTML = `<span>${icon} ${name}</span><small>${note}</small><strong>${price} 平安幣</strong>`;
      b.addEventListener("click", onBuy);
      return b;
    };
    list.replaceChildren(
      row(snack.icon, snack.name, "現買現吃", snack.price, () => this.buySnack(i)),
      ...goods.filter(id => typeof BAG_ITEMS !== "undefined" && BAG_ITEMS[id]).map(id => {
        const item = BAG_ITEMS[id];
        return row(item.icon, item.name, "放進背包，可當供品", item.price, () => this.buyGoods(i, id));
      })
    );
    this.renderShop("");
    modal.classList.add("open");
  },

  renderShop(message) {
    const coins = window.templeInventory?.load().coins ?? 0;
    document.getElementById("npcShopCoins").textContent = `🪙 平安幣 ${coins}`;
    document.querySelectorAll("#npcShopItems .npc-shop-item").forEach(b => { b.disabled = coins < Number(b.dataset.price); });
    const msg = document.getElementById("npcShopMessage");
    if (msg) msg.textContent = message || (coins < 2 ? "平安幣不夠了。每天到服務處可領補給，夜市套圈圈也能贏平安幣。" : "");
  },

  buySnack(i) {
    const snack = this.profile(i)?.vendor?.snack;
    if (!snack || !this.near(i)) { this.renderShop("走遠了，回到攤位前再買。"); return false; }
    if (!window.templeInventory?.spendCoins(snack.price)) { this.renderShop("平安幣不夠。"); return false; }
    window.templePlaza?.use(snack.plaza);   // 嚐一口：與攤位相同的訊息，每天第一次 +1 功德
    this.renderShop(`${snack.icon} 買了一份${snack.name}，${this.npcs()[i].name}笑著說：「慢慢吃喔！」`);
    window.emitRitual?.("npcBuy", { item: snack.name });
    return true;
  },

  buyGoods(i, id) {
    if (!this.near(i)) { this.renderShop("走遠了，回到攤位前再買。"); return false; }
    if (!window.templeInventory?.purchase(id, 1)) { this.renderShop("平安幣不夠，或背包放不下了。"); return false; }
    const item = BAG_ITEMS[id];
    this.renderShop(`${item.icon} ${item.name}放進背包了，可以到大殿供品桌擺供。`);
    window.emitRitual?.("npcBuy", { item: id });
    return true;
  },

  notify(msg) { window.templeNotify ? window.templeNotify(msg) : window.setDockStatus?.(msg); },

  init() {
    document.getElementById("npcShopClose")?.addEventListener("click", () => document.getElementById("npcShopModal")?.classList.remove("open"));
  }
};

window.templeNpc = templeNpc;
