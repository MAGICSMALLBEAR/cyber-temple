// app/plaza.js - 廟埕新地點的互動：美食攤、淨泉、神位每日一次小功德，祈願樹與燈牆導向既有功能
const PLAZA_DAILY_KEY = "temple_plaza_daily";
const PLAZA_MESSAGES = {
  food0: "🍠 地瓜球外酥內Q，一口一個剛剛好。",
  food1: "🌭 烤香腸的香氣飄滿廟埕。",
  food2: "🍡 糖葫蘆酸酸甜甜，外層糖衣咬下去清脆作響。",
  food3: "🍧 一碗愛玉冰，清涼消暑。",
  food4: "🧋 古早味紅茶甘醇順口，解渴又解膩。",
  food5: "🌽 炭烤玉米刷上醬，甜中帶鹹。",
  lotusSpring: "⛲ 以清泉淨手，靜下心來再入殿。",
  shrineLife: "🪔 於註生娘娘神位前合掌，祈願孩子平安長大。",
  shrineEarth: "🪔 於地藏王菩薩神位前合掌，感念先人，願眾生離苦。"
};

const templePlaza = {
  today() {
    return window.templeInventory?.day?.() || new Date().toISOString().slice(0, 10);
  },
  loadDaily() {
    try {
      const d = JSON.parse(localStorage.getItem(PLAZA_DAILY_KEY) || "null");
      if (d && d.day === this.today() && Array.isArray(d.done)) return d;
    } catch (e) {}
    return { day: this.today(), done: [] };
  },
  // 每個地點每天只給一次功德，避免重複點擊刷分
  claimDaily(id) {
    const d = this.loadDaily();
    if (d.done.includes(id)) return false;
    d.done.push(id);
    localStorage.setItem(PLAZA_DAILY_KEY, JSON.stringify(d));
    return true;
  },
  use(id) {
    if (id === "wishTree") { document.getElementById("btnOpenEma")?.click(); return; }
    if (id === "lampWall") { document.getElementById("btnGoLantern")?.click(); return; }
    const message = PLAZA_MESSAGES[id];
    if (!message) return;
    const scene = window.temple3d, reward = this.claimDaily(id);
    if (reward) window.addMerit?.(1);
    window.setDockStatus?.(reward ? `${message}（功德 +1）` : message);
    window.templeAudio?.playBell?.(id.startsWith("food") ? 880 : 620);
    if (!id.startsWith("food")) scene?.avatar?.triggerAction?.("pray");
  }
};
window.templePlaza = templePlaza;
