// 房間分流、同行供席與新供品（無繪圖）：伺服器只把訊息送給同房間，前端只收同房間的分身與供桌，
// 供桌只送角色稱呼與桌上供品；同行供席收到不合法資料也不會出錯。不開瀏覽器、不建立 WebGLRenderer。
const http = require("http");
const { makeEnvironment } = require("./light-env");

function request(base, path, { method = "GET", body } = {}) {
  const { port } = new URL(base);
  return new Promise(resolve => {
    const req = http.request({ host: "127.0.0.1", port, path, method, headers: body ? { "Content-Type": "application/json" } : {} }, res => {
      let data = "";
      res.on("data", c => { data += c; });
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", () => resolve({ status: 0, body: "" }));
    if (body) req.write(body);
    req.end();
  });
}

// 連上某房間的即時頻道，收集收到的 data 事件
function listen(base, room) {
  const { port } = new URL(base);
  const got = [];
  return new Promise(resolve => {
    const path = room === undefined ? "/api/events" : `/api/events?room=${encodeURIComponent(room)}`;
    const req = http.get({ host: "127.0.0.1", port, path }, res => {
      let buf = "";
      res.on("data", chunk => {
        buf += chunk;
        let i;
        while ((i = buf.indexOf("\n\n")) >= 0) {
          const block = buf.slice(0, i); buf = buf.slice(i + 2);
          block.split("\n").filter(l => l.startsWith("data: ")).forEach(l => { try { got.push(JSON.parse(l.slice(6))); } catch (e) {} });
        }
      });
      resolve({ got, close: () => req.destroy() });
    });
    req.on("error", () => {});
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

module.exports = {
  name: "房間分流、同行供席與新供品（無繪圖）",
  async run({ base, check }) {
    // ---- 伺服器：房間分流 ----
    const main = await listen(base, undefined), east = await listen(base, "east"), secret = await listen(base, "好友密室-42");
    await sleep(200);
    const rooms = JSON.parse((await request(base, "/api/rooms")).body);
    check("房間清單只列預設四殿，不洩漏自訂密室房號", Object.keys(rooms.rooms).sort().join() === "east,main,west,zen" && !JSON.stringify(rooms).includes("好友密室"));
    check("房間清單回報各殿連線數", rooms.rooms.east >= 1 && rooms.rooms.main >= 1, JSON.stringify(rooms.rooms));
    const tag = `T${Date.now()}`;
    await request(base, "/api/broadcast", { method: "POST", body: JSON.stringify({ type: tag, room: "east", n: 1 }) });
    await request(base, "/api/broadcast", { method: "POST", body: JSON.stringify({ type: tag, n: 2 }) });
    await request(base, "/api/broadcast", { method: "POST", body: JSON.stringify({ type: tag, room: "  好友密室-42  ", n: 3 }) });
    await request(base, "/api/broadcast", { method: "POST", body: JSON.stringify({ type: tag, room: { evil: 1 }, n: 4 }) });
    await request(base, "/api/broadcast", { method: "POST", body: JSON.stringify({ type: tag, room: "沒人的房間", n: 5 }) });
    await sleep(300);
    const ns = list => list.filter(m => m.type === tag).map(m => m.n).join();
    check("指定房間的訊息只送到該房間", ns(east.got) === "1", ns(east.got));
    check("沒帶房間（舊版）或房間格式不對的訊息送到主殿", ns(main.got) === "2,4", ns(main.got));
    check("自訂密室房號前後空白不影響", ns(secret.got) === "3", ns(secret.got));
    const after = JSON.parse((await request(base, "/api/rooms")).body);
    check("送到沒人的房間不會憑空建立房間", !JSON.stringify(after).includes("沒人的房間"));
    [main, east, secret].forEach(c => c.close());
    const o2o = await request(base, "/api/o2o/orders", { method: "POST", body: JSON.stringify({ recipient: "測試", phone: "0900" }) });
    check("已移除實體訂單 API，不收姓名電話地址", o2o.status !== 200 && !o2o.body.includes("trackingNo"), String(o2o.status));

    // ---- 前端：同行供席 ----
    const THREE = await import("three"), env = makeEnvironment(THREE), c = env.context;
    for (const file of ["scene/core.js", "scene/offering-models.js", "inventory.js", "save-data.js", "scene/peer-tables.js"]) env.load(file);
    const t = Object.create(env.run("Temple3DScene").prototype);
    t.scene = new THREE.Scene(); t.interactiveObjects = [];
    t.initPeerTables();
    c.temple3d = t;
    check("四處供席，起始皆虛位以待", t.peerTableSlots.length === 4 && t.peerTableSlots.every(s => !s.occupiedBy && s.dishesGroup.children.length === 0));
    check("供席桌面可點選開啟彈窗", t.interactiveObjects.filter(o => o.userData.type === "peerAltarTable").length === 4);
    let thrown = null;
    try { t.updatePeerOfferingTable("p1", { name: "阿明", slots: ["fruit", "__proto__", "ingotTower", 5, "incense", "teaSet", "fagao"], presented: true }); } catch (e) { thrown = e; }
    check("第一次收到同行供桌不會出錯", !thrown, thrown?.message);
    const s0 = t.peerTableSlots[0];
    check("收到後分配到第一席", s0.occupiedBy === "p1" && t.peerTables.get("p1")?.slotIndex === 0);
    check("只擺合法供品、最多五盤（香、金紙、未知與第六盤以後略過）", s0.dishesGroup.children.length === 2 && s0.dishesGroup.children.map(g => g.userData.dish).join() === "fruit,ingotTower", s0.dishesGroup.children.map(g => g.userData.dish).join());
    check("合法供品清單補成五格", c.peerTableDishes({ slots: ["fruit"] }).length === 5 && c.peerTableDishes({ slots: "壞資料" }).every(x => x === null) && c.peerTableDishes(null).length === 5);
    let disposed = 0; s0.dishesGroup.traverse(o => o.geometry?.addEventListener("dispose", () => disposed++));
    t.updatePeerOfferingTable("p1", { name: "阿明", slots: ["peach"], presented: false });
    check("同一位同行更新時沿用原席並釋放舊供品", s0.occupiedBy === "p1" && s0.dishesGroup.children.length === 1 && disposed > 0 && t.peerTables.size === 1);
    ["p2", "p3", "p4", "p5"].forEach(id => t.updatePeerOfferingTable(id, { name: id, slots: [] }));
    check("席位滿了不再分配，也不覆蓋別人的席位", t.peerTables.size === 4 && !t.peerTables.has("p5") && s0.occupiedBy === "p1");
    t.removePeerOfferingTable("p1");
    check("同行離開後清空供品並釋出席位", !s0.occupiedBy && s0.dishesGroup.children.length === 0 && !t.peerTables.has("p1"));
    t.updatePeerOfferingTable("p5", { name: "p5", slots: [] });
    check("釋出的席位可給下一位同行", s0.occupiedBy === "p5");
    ["p2", "p3", "p4", "p5"].forEach(id => t.removePeerOfferingTable(id));

    // ---- 前端：同行分身的房間過濾 ----
    for (const file of ["avatar/appearance.js", "avatar/core.js", "avatar/ritual-props.js", "avatar/social.js", "avatar/relics.js", "avatar/companions.js"]) env.load(file);
    const a = Object.create(env.run("TempleAvatarSystem").prototype), sent = [];
    let onMessage = null;
    a.scene = t.scene; a.playerGroup = new THREE.Group(); a.position = new THREE.Vector3(); a.limbs = {};
    a.config = { ...env.run("AVATAR_DEFAULT_LOOK"), title: "測試善信" };
    a.currentAction = "idle"; a.keys = {}; a.relics = {}; a.peers = new Map(); a.lastBroadcastPos = new THREE.Vector3(); a.lastBroadcastTime = 0;
    a.channel = { postMessage: m => sent.push(m), addEventListener: (_, fn) => { onMessage = fn; } };
    a.myPeerId = "self";
    c.localStorage.setItem("temple_room", "main");
    c.templeJournal = { load: () => [{ wish: "私人心願：希望考上研究所", status: "pending" }] };
    c.localStorage.setItem("temple_offering_name", "王小明本名");
    a.initMultiplayerPeers();
    const peerMsg = (id, room, extra = {}) => ({ type: "PEER_AVATAR_UPDATE", id, room, config: a.config, pos: [1, 0, 2], rot: 0, action: "idle", timestamp: 0, ...extra });
    onMessage({ data: peerMsg("east-peer", "east") });
    check("不同房間的同行分身不會出現", !a.peers.has("east-peer"));
    onMessage({ data: peerMsg("old-peer", undefined) });
    check("沒帶房間的舊版訊息當作主殿", a.peers.has("old-peer"));
    onMessage({ data: { type: "PEER_TABLE_UPDATE", id: "early", room: "main", name: "早到", slots: ["fruit"] } });
    check("分身還沒出現前收到的供桌先暫存，不占席位", !t.peerTables.has("early"));
    onMessage({ data: peerMsg("early", "main") });
    check("分身出現後擺上先前收到的供桌", t.peerTables.has("early"));
    const tables = sent.filter(m => m.type === "PEER_TABLE_UPDATE");
    check("新同行出現時主動補送自己的供桌", tables.length >= 1);
    const table = tables.at(-1);
    check("供桌訊息只含角色稱呼與桌上供品，不含心願或敬獻稱呼", Object.keys(table).sort().join() === "id,name,presented,room,slots,tableStyle,type" && table.name === "測試善信" && !JSON.stringify(table).includes("心願") && !JSON.stringify(table).includes("王小明"));
    onMessage({ data: { type: "PEER_TABLE_UPDATE", id: "east-peer", room: "east", name: "東", slots: ["fruit"] } });
    check("不同房間的供桌不會擺出來", !t.peerTables.has("east-peer"));
    sent.length = 0;
    a.switchRoom(" east ");
    const leave = sent.find(m => m.type === "PEER_AVATAR_LEAVE"), hello = sent.find(m => m.type === "PEER_AVATAR_HELLO");
    check("換房先向舊房間告別", leave?.room === "main" && sent.indexOf(leave) < sent.indexOf(hello));
    check("換房後清掉舊房的分身與供桌", a.peers.size === 0 && t.peerTables.size === 0);
    check("換房後所有訊息都帶新房間並記住", a.currentRoom === "east" && c.localStorage.getItem("temple_room") === "east" && sent.filter(m => m.type !== "PEER_AVATAR_LEAVE").every(m => m.room === "east"));
    onMessage({ data: peerMsg("east-peer", "east") });
    check("換房後看得到新房間的同行", a.peers.has("east-peer"));
    onMessage({ data: { type: "PEER_AVATAR_LEAVE", id: "east-peer", room: "east" } });
    check("同行離開時分身與暫存一併清除", !a.peers.has("east-peer"));

    // ---- 新供品 ----
    const NEW_ITEMS = ["ingotTower", "goldBars", "coinString", "teaSet", "flowerBasket", "fruitTower"];
    check("六款新供品都可擺供且有定價", NEW_ITEMS.every(id => c.templeInventory.isOffering(id) && env.run("BAG_ITEMS")[id].price > 0));
    check("新供品都有自己的模型（不只是空盤）", NEW_ITEMS.every(id => { const g = c.buildOfferingDish(id); let n = 0; g.traverse(o => { if (o.isMesh && o.name !== "plate") n++; }); return n >= 3; }));
    const filters = ["food", "treasure", "supplies"];
    check("每樣商品都屬於供品鋪的某個篩選分類", Object.entries(env.run("BAG_ITEMS")).every(([id, d]) => filters.includes(d.category || (c.templeInventory.isOffering(id) ? "food" : "supplies"))));
    check("供桌選擇器有六款新供品的按鈕", NEW_ITEMS.every(id => env.html.includes(`data-dish="${id}"`)));
  }
};
