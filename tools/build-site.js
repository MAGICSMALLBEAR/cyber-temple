// tools/build-site.js - 整理要放上靜態空間（GitHub Pages 等）的檔案
// 用法：node tools/build-site.js <輸出資料夾>
// 直接以 sw.js 的預存清單（APP_SHELL）為準，加上 sw.js 本身：網頁需要的檔案一個不少，
// 測試、工具、文件、server.js 等都不會被公開。
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const out = path.resolve(process.argv[2] || "_site");

const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
const list = sw.match(/const APP_SHELL = \[([\s\S]*?)\];/);
if (!list) throw new Error("sw.js 裡找不到 APP_SHELL 清單");
const files = [...list[1].matchAll(/"([^"]+)"/g)].map(m => m[1]).filter(f => f !== "./");
files.push("sw.js");

fs.rmSync(out, { recursive: true, force: true });
for (const f of files) {
  const src = path.join(ROOT, f);
  if (!fs.existsSync(src)) throw new Error(`預存清單裡的檔案不存在：${f}`);
  const dest = path.join(out, f);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}
// 模型檔不放進預存清單（太大），用到時才快取，但部署時要一起帶上
const modelDir = path.join(ROOT, "models");
const models = fs.existsSync(modelDir) ? fs.readdirSync(modelDir).filter(f => f.endsWith(".glb")) : [];
for (const f of models) {
  fs.mkdirSync(path.join(out, "models"), { recursive: true });
  fs.copyFileSync(path.join(modelDir, f), path.join(out, "models", f));
}
console.log(`已整理 ${files.length + models.length} 個檔案到 ${out}`);
