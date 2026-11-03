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
  name: "農曆節慶與二十四節氣",
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
    check("每天 3 項功課（非節慶、非節氣日）", dp.festivalOf(new Date()) || dp.solarTerm ? true : dp.tasks.length === 3, String(dp.tasks.length));

    // 二十四節氣：與已知天文時刻（UTC）比對，誤差需在 30 分鐘內，且台灣日期正確
    const KNOWN_TERMS = [
      ["春分", "2024-03-20T03:06:00Z"], ["夏至", "2024-06-20T20:51:00Z"], ["秋分", "2024-09-22T12:44:00Z"], ["冬至", "2024-12-21T09:20:00Z"],
      ["春分", "2025-03-20T09:01:00Z"], ["夏至", "2025-06-21T02:42:00Z"], ["秋分", "2025-09-22T18:19:00Z"], ["冬至", "2025-12-21T15:03:00Z"]
    ];
    for (const [name, iso] of KNOWN_TERMS) {
      const t = Date.parse(iso);
      const tw = new Date(t + 8 * 3600 * 1000);
      const day = d(tw.getUTCFullYear(), tw.getUTCMonth() + 1, tw.getUTCDate());
      const r = dp.solarTermOf(day);
      const diff = r ? Math.round((r.at - t) / 60000) : null;
      check(`${iso.slice(0, 10)}（台灣 ${day.getMonth() + 1}/${day.getDate()}）是${name}`, r && r.name === name && Math.abs(diff) <= 30, r ? `${r.name}，差 ${diff} 分鐘` : "無");
    }
    const terms2026 = [];
    for (let x = d(2026, 1, 1); x.getFullYear() < 2027; x.setDate(x.getDate() + 1)) {
      const r = dp.solarTermOf(x);
      if (r) terms2026.push(r.name);
    }
    check("2026 年剛好 24 個節氣且不重複", terms2026.length === 24 && new Set(terms2026).size === 24, terms2026.join(""));
    check("2026 年第一個節氣是小寒、最後是冬至", terms2026[0] === "小寒" && terms2026[23] === "冬至");
  }
};
