// tools/draw-views.js - 逐尊請 Codex 畫左側面與背面；用法：node draw-views.js [代號...]
// 需要已登入的 Codex App（用 App 內附的 codex.exe；npm 版太舊）。log 存在 .test-cache/。
const fs = require("fs"), path = require("path"), { spawnSync } = require("child_process");
const root = path.resolve(__dirname, ".."), ref = path.join(root, "models/reference");
const binDir = "C:/Users/user/AppData/Local/OpenAI/Codex/bin";
const codex = fs.readdirSync(binDir).map(d => path.join(binDir, d, "codex.exe")).filter(f => fs.existsSync(f))
  .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
const md = fs.readFileSync(path.join(ref, "PROMPTS.md"), "utf8").replace(/\r\n/g, "\n");
const rows = [...md.matchAll(/^\| `(\w+)` \| ([^|]+) \| ([^|]+) \|$/gm)].map(m => ({ id: m[1], name: m[2].trim(), desc: m[3].trim() }));
const want = process.argv.slice(2);
const tail = "- 正交視角感、無透視變形，神像與座椅完整入鏡，不裁切。\n- 純淺灰背景、柔和均勻光線、無陰影、無文字、無浮水印。\n- 直式構圖 1024x1536。";
const finish = f => `\n\n畫好後存成 models/reference/${f}（不要改動資料夾裡其他檔案），最後回報存檔路徑。如果因為額度或其他原因無法生成，直接說明原因，不要用別的方式替代。`;
function run(r, view, images, prompt) {
  const file = `${r.id}-${view}.png`, out = path.join(ref, file);
  if (fs.existsSync(out)) { console.log(`${file}: 已存在，略過`); return true; }
  const t0 = Date.now(), args = ["exec", "--sandbox", "workspace-write", "--skip-git-repo-check"];
  for (const im of images) args.push("-i", `models/reference/${im}`);
  args.push("-");
  const res = spawnSync(codex, args, { cwd: root, input: prompt + finish(file), encoding: "utf8", maxBuffer: 1 << 26 });
  const log = (res.stdout || "") + "\n" + (res.stderr || "");
  fs.writeFileSync(path.join(root, ".test-cache", `codex-${r.id}-${view}.log`), log);
  const ok = fs.existsSync(out), last = log.trim().split("\n").slice(-3).join(" / ").slice(0, 300);
  console.log(`${file}（${r.name}）：${ok ? "完成" : "失敗"}，結束碼 ${res.status}，${Math.round((Date.now() - t0) / 1000)} 秒｜${last}`);
  if (!ok && /quota|limit|額度|rate/i.test(last)) { console.log("疑似額度用完，停止後續"); process.exit(2); }
  return ok;
}
for (const r of rows.filter(r => !want.length || want.includes(r.id))) {
  const side = `附上的圖片是 models/reference/${r.id}-front.png，一尊「${r.name}」神像的正面參考圖。

請用圖片生成功能，畫出「同一尊神像」的正側面圖（左側面，神像面朝畫面左方，純側面 90 度），用途是 3D 建模的三視圖參考。要求：
- 同一尊神像：臉部五官、頭冠、鬚髮、服飾紋樣與顏色、手持物品、座椅與底座，造型、顏色、比例都要和正面圖一致。
- 造型參考：${r.desc}
- 持物的位置與高度要和正面圖一致；從側面看清楚坐姿、膝蓋與衣袍前後的厚度、座椅與底座的深度。
${tail}`;
  if (!run(r, "side", [`${r.id}-front.png`], side)) continue;
  const back = `附上兩張圖：models/reference/${r.id}-front.png（正面）與 models/reference/${r.id}-side.png（左側面），是同一尊坐著的「${r.name}」神像。

請用圖片生成功能，畫出「同一尊神像」的正背面圖（從神像正後方看，180 度），用途是 3D 建模的三視圖參考。要求：
- 必須和兩張參考圖是同一尊：頭冠或頭巾的背面、鬚髮、服飾顏色與紋樣、座椅與底座，造型、顏色、比例一致。
- 依參考圖的座椅畫：如果座椅有高椅背，從背後看椅背會擋住身體大部分，畫出椅背背面（同風格浮雕），椅背上方露出頭部與肩背；如果沒有高椅背或坐在蓮花座上，就畫出神像完整的背部與衣袍。從背後看不到的持物不要硬畫出來，只畫露出的部分。
- 從背後看座椅下方應該是實心的座身，不要畫出垂到座椅後面的衣襬。
- 寬度、高度、底座輪廓要和正面圖相同（左右對稱）。
${tail}`;
  run(r, "back", [`${r.id}-front.png`, `${r.id}-side.png`], back);
}
