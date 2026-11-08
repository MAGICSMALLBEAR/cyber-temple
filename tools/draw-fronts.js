// tools/draw-fronts.js - 依 models/reference/PROMPTS.md 逐尊請 Codex 畫正面圖；用法：node draw-fronts.js [代號...]
// 需要已登入的 Codex App（用 App 內附的 codex.exe；npm 版太舊）。log 存在 .test-cache/。
const fs = require("fs"), path = require("path"), { spawnSync } = require("child_process");
const root = path.resolve(__dirname, ".."), ref = path.join(root, "models/reference");
const binDir = "C:/Users/user/AppData/Local/OpenAI/Codex/bin";
const codex = fs.readdirSync(binDir).map(d => path.join(binDir, d, "codex.exe")).filter(f => fs.existsSync(f))
  .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
const md = fs.readFileSync(path.join(ref, "PROMPTS.md"), "utf8").replace(/\r\n/g, "\n");
const common = md.split("## 共通要求")[1].match(/```\n([\s\S]*?)```/)[1].trim();
const rows = [...md.matchAll(/^\| `(\w+)` \| ([^|]+) \| ([^|]+) \|$/gm)].map(m => ({ id: m[1], name: m[2].trim(), desc: m[3].trim() }));
const want = process.argv.slice(2);
for (const r of rows.filter(r => !want.length || want.includes(r.id))) {
  const out = path.join(ref, `${r.id}-front.png`);
  if (fs.existsSync(out)) { console.log(`${r.id}: 已存在，略過`); continue; }
  const prompt = `附上的圖片是 models/reference/mazu-front.png，是同系列神像的風格參考。

請用圖片生成功能，畫出「${r.name}」神像的正面圖（面朝畫面，正前方），用途是 3D 建模的三視圖參考。
造型：${r.desc}
${common}

畫好後存成 models/reference/${r.id}-front.png（不要改動資料夾裡其他檔案），最後回報存檔路徑。如果因為額度或其他原因無法生成，直接說明原因，不要用別的方式替代。`;
  const t0 = Date.now();
  const res = spawnSync(codex, ["exec", "--sandbox", "workspace-write", "--skip-git-repo-check", "-i", "models/reference/mazu-front.png", "-"], { cwd: root, input: prompt, encoding: "utf8", maxBuffer: 1 << 26 });
  fs.writeFileSync(path.join(root, ".test-cache", `codex-${r.id}.log`), (res.stdout || "") + "\n" + (res.stderr || ""));
  const ok = fs.existsSync(out);
  const tail = ((res.stdout || "") + (res.stderr || "")).trim().split("\n").slice(-3).join(" / ");
  console.log(`${r.id}（${r.name}）：${ok ? "完成" : "失敗"}，結束碼 ${res.status}，${Math.round((Date.now() - t0) / 1000)} 秒｜${tail.slice(0, 300)}`);
  if (!ok && /quota|limit|額度|rate/i.test(tail)) { console.log("疑似額度用完，停止後續"); break; }
}
