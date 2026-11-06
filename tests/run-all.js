// tests/run-all.js - 一鍵跑全部自動化測試
// 用法：node tests/run-all.js            全部跑
//       node tests/run-all.js daily save  只跑名稱含 daily 或 save 的測試
//       TEST_VERBOSE=1 node tests/run-all.js   連通過的項目也列出
const fs = require("fs");
const path = require("path");
const lockDir = path.join(__dirname, "..", ".test-cache");
const lockPath = path.join(lockDir, "test-run.lock");
fs.mkdirSync(lockDir, { recursive: true });
let ownsLock = false;
for (let attempt = 0; attempt < 2 && !ownsLock; attempt++) {
  try {
    const fd = fs.openSync(lockPath, "wx");
    fs.writeFileSync(fd, String(process.pid)); fs.closeSync(fd); ownsLock = true;
  } catch (e) {
    if (e.code !== "EEXIST") throw e;
    let live = false;
    try { const pid = Number(fs.readFileSync(lockPath, "utf8")); if (pid > 0) { process.kill(pid, 0); live = true; } }
    catch (err) { if (err.code === "EPERM") live = true; }
    if (live) { console.error("已有一套測試正在執行；為避免電腦負載過高，不同時啟動第二套。"); process.exit(1); }
    fs.unlinkSync(lockPath);
  }
}
if (!ownsLock) { console.error("無法取得測試執行鎖。"); process.exit(1); }
process.on("exit", () => {
  try { if (fs.readFileSync(lockPath, "utf8") === String(process.pid)) fs.unlinkSync(lockPath); } catch (e) {}
});
const { startServer, closeAll, Checker } = require("./helpers");
let activeServer;
let stopping = false;
async function shutdown(code) {
  if (stopping) return; stopping = true;
  if (activeServer) activeServer.stop();
  await closeAll(); process.exit(code);
}
process.once("SIGINT", () => shutdown(130));
process.once("SIGTERM", () => shutdown(143));

const SUITES = [
  "server.test.js",
  "festival.test.js",
  "movement.test.js",
  "visitor-logic.test.js",
  "visit-routes.test.js",
  "temple-expansion.test.js",
  "visitor-ui.test.js",
  "expansion-ui.test.js",
  "three.test.js",
  "xr.test.js",
  "loader.test.js",
  "click-through.test.js",
  "daily.test.js",
  "deities.test.js",
  "avatar-look.test.js",
  "social-power.test.js",
  "onboarding.test.js",
  "chiam-ritual.test.js",
  "pilgrimage.test.js",
  "interior.test.js",
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
  const args = process.argv.slice(2);
  const full = args.includes("--full");
  const filters = args.filter(a => a !== "--full");
  const quick = ["server.test.js", "festival.test.js", "movement.test.js", "visitor-logic.test.js", "visit-routes.test.js", "temple-expansion.test.js"];
  const selected = SUITES.filter(f => filters.length ? filters.some(k => f.includes(k)) : full || quick.includes(f));
  if (!full && !filters.length) console.log("輕量檢查：不開啟 3D 瀏覽器。完整測試使用 npm run test:full。");
  if (selected.length === 0) {
    console.log(`沒有符合的測試。可用：${SUITES.join("、")}`);
    process.exit(1);
  }

  const server = await startServer();
  activeServer = server;
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
  shutdown(1);
});
