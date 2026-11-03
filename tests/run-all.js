// tests/run-all.js - 一鍵跑全部自動化測試
// 用法：node tests/run-all.js            全部跑
//       node tests/run-all.js daily save  只跑名稱含 daily 或 save 的測試
//       TEST_VERBOSE=1 node tests/run-all.js   連通過的項目也列出
const { startServer, closeAll, Checker } = require("./helpers");

const SUITES = [
  "server.test.js",
  "festival.test.js",
  "three.test.js",
  "xr.test.js",
  "loader.test.js",
  "click-through.test.js",
  "daily.test.js",
  "deities.test.js",
  "onboarding.test.js",
  "chiam-ritual.test.js",
  "save-data.test.js",
  "quality.test.js",
  "sound-motion.test.js",
  "parade.test.js",
  "collision.test.js",
  "live-wall.test.js",
  "pwa.test.js",
  "static-hosting.test.js"
];

(async () => {
  const filters = process.argv.slice(2);
  const selected = SUITES.filter(f => filters.length === 0 || filters.some(k => f.includes(k)));
  if (selected.length === 0) {
    console.log(`沒有符合的測試。可用：${SUITES.join("、")}`);
    process.exit(1);
  }

  const server = await startServer();
  console.log(`測試伺服器：${server.base}\n`);
  const results = [];
  const started = Date.now();

  for (const file of selected) {
    const suite = require(`./${file}`);
    const checker = new Checker();
    const t0 = Date.now();
    console.log(`▶ ${suite.name}（${file}）`);
    try {
      await suite.run({ base: server.base, check: checker.check.bind(checker), note: checker.note.bind(checker) });
    } catch (err) {
      checker.check("測試執行時發生例外", false, err.stack.split("\n").slice(0, 3).join(" | "));
    }
    // 測試中途失敗時可能沒關到瀏覽器，統一收掉，避免拖慢後面的測試
    await closeAll();
    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    console.log(`  ${checker.failed.length ? "✗" : "✓"} ${checker.passed} 通過${checker.failed.length ? `，${checker.failed.length} 失敗` : ""}（${secs} 秒）\n`);
    results.push({ name: suite.name, ...checker });
  }

  server.stop();
  const failed = results.filter(r => r.failed.length);
  const total = results.reduce((n, r) => n + r.passed + r.failed.length, 0);
  console.log("─".repeat(40));
  console.log(`共 ${results.length} 組、${total} 項檢查，耗時 ${((Date.now() - started) / 1000).toFixed(0)} 秒`);
  if (failed.length) {
    console.log(`✗ 失敗：${failed.map(r => `${r.name}（${r.failed.join("、")}）`).join("；")}`);
    process.exit(1);
  }
  console.log("✓ 全部通過");
})().catch(err => {
  console.error(err);
  process.exit(1);
});
