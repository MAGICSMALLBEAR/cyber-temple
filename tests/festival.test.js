// 農曆節慶換算（不需瀏覽器）：以已知日期對照 daily.js 的結果
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { ROOT } = require("./helpers");

function loadDaily() {
  const ctx = {
    window: { addEventListener() {}, dispatchEvent() {} },
    CustomEvent: class {},
    localStorage: { getItem: () => null, setItem() {} },
    Intl, Date, Math, JSON, console
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "daily.js"), "utf8"), ctx);
  ctx.window.dailyPractice.__ctx = ctx;
  return ctx.window.dailyPractice;
}

module.exports = {
  name: "農曆節慶換算",
  async run({ check }) {
    const dp = loadDaily();
    const d = (y, m, day) => new Date(y, m - 1, day, 12);

    // 2026 年各節慶的國曆日期
    const KNOWN = [
      [d(2026, 2, 16), "除夕"],
      [d(2026, 2, 17), "春節"],
      [d(2026, 2, 21), "迎財神"],
      [d(2026, 2, 25), "天公生"],
      [d(2026, 3, 3), "元宵"],
      [d(2026, 3, 21), "文昌帝君聖誕"],
      [d(2026, 5, 9), "媽祖聖誕"],
      [d(2026, 8, 19), "七夕"],
      [d(2026, 8, 27), "中元"],
      [d(2026, 9, 25), "中秋"]
    ];
    for (const [date, name] of KNOWN) {
      const f = dp.festivalOf(date);
      check(`${date.getMonth() + 1}/${date.getDate()} 是${name}`, f && f.name.includes(name), f ? f.name : "無");
    }

    check("今年 2026/11/2 是農曆九月廿四", dp.toLunar(d(2026, 11, 2)).label === "九月廿四", dp.toLunar(d(2026, 11, 2)).label);
    const leap = dp.toLunar(d(2025, 7, 25));
    check("閏月判斷：2025/7/25 是閏六月初一", leap.isLeap && leap.label === "閏六月初一", leap.label);
    check("閏月不過節", dp.festivalOf(d(2025, 7, 25)) === null || dp.festivalOf(d(2025, 7, 25)).minor);

    let major = 0, minor = 0;
    for (let x = d(2026, 1, 1); x.getFullYear() < 2027; x.setDate(x.getDate() + 1)) {
      const f = dp.festivalOf(x);
      if (f && !f.minor) major++;
      if (f && f.minor) minor++;
    }
    check("2026 年大節慶 16 個（含觀音、關公、土地公節慶）", major === 16, String(major));
    check("2026 年初一十五（扣掉與節慶重疊）21 天", minor === 21, String(minor));

    // 節慶表的每一筆都要在一年內對得到農曆日期，且有神尊的節慶要對得到神尊名稱
    const table = vm.runInContext("LUNAR_FESTIVALS", dp.__ctx);
    const names = vm.runInContext("DEITY_NAMES", dp.__ctx);
    const coreSrc = fs.readFileSync(path.join(ROOT, "app/core.js"), "utf8");
    for (const f of table) {
      let hit = null;
      for (let x = d(2026, 1, 1); x < d(2027, 3, 1) && !hit; x.setDate(x.getDate() + 1)) {
        const l = dp.toLunar(x);
        if (!l.isLeap && l.month === f.m && l.day === f.d) hit = new Date(x);
      }
      check(`節慶「${f.name}」對得到農曆 ${f.m}/${f.d}`, hit && dp.festivalOf(hit).name === f.name, hit ? hit.toISOString().slice(0, 10) : "找不到");
      if (f.deity) check(`節慶「${f.name}」的神尊 ${f.deity} 存在`, !!names[f.deity] && coreSrc.includes(`  ${f.deity}: { id: "${f.deity}"`));
    }

    const t1 = dp.tasks.map(t => t.id).join(), t2 = dp.tasks.map(t => t.id).join();
    check("同一天抽到的功課固定", t1 === t2);
    check("每天 3 項功課（非節慶日）", dp.festivalOf(new Date()) ? true : dp.tasks.length === 3, String(dp.tasks.length));
  }
};
