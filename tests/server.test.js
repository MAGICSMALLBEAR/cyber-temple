// 本地伺服器安全性：只能讀專案資料夾、擋隱藏檔與 server.js、廣播大小上限
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { ROOT } = require("./helpers");

// 以原始路徑送出請求（不讓用戶端先把 ../ 正規化掉）
function request(base, rawPath, { method = "GET", body } = {}) {
  const { port } = new URL(base);
  return new Promise(resolve => {
    const req = http.request({ host: "127.0.0.1", port, path: rawPath, method }, res => {
      let data = "";
      res.on("data", c => { data += c; });
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", () => resolve({ status: 0, body: "" }));
    if (body) req.write(body);
    req.end();
  });
}

module.exports = {
  name: "伺服器安全性",
  async run({ base, check }) {
    // 在專案外放一個「機密」檔，試著用 ../ 讀它
    const secretDir = fs.mkdtempSync(path.join(os.tmpdir(), "temple-secret-"));
    const secretFile = path.join(secretDir, "secret.txt");
    fs.writeFileSync(secretFile, "TOP-SECRET");
    const rel = path.relative(ROOT, secretFile).split(path.sep).join("/");
    const sameDrive = !path.isAbsolute(rel);

    const ok = async (p, expect, name) => {
      const r = await request(base, p);
      check(name, r.status === expect, `${p} → ${r.status}`);
      return r;
    };

    await ok("/", 200, "首頁可讀");
    await ok("/style.css?v=1", 200, "帶查詢字串的檔案可讀");
    await ok("/%E5%95%9F%E5%8B%95%E7%A5%9E%E6%AE%BF.bat", 200, "中文檔名可讀");
    await ok("/app/core.js", 200, "子資料夾檔案可讀");
    if (sameDrive) {
      // 未編碼的 ../ 會先被網址解析收掉（變成專案內不存在的路徑 → 404），編碼過的則由路徑檢查擋下（403）；重點是讀不到內容
      const r = await request(base, "/" + rel);
      check("路徑穿越讀不到專案外的檔案", r.status !== 200 && !r.body.includes("TOP-SECRET"), `→ ${r.status}`);
      const enc = await request(base, "/" + rel.replace(/\//g, "%2F"));
      check("編碼過的路徑穿越也讀不到", enc.status === 403 && !enc.body.includes("TOP-SECRET"), `→ ${enc.status}`);
    }
    await ok("/.git/config", 403, "擋 .git");
    await ok("/server.js", 403, "擋 server.js 原始碼");
    await ok("/%E0%A4%A", 400, "錯誤的網址編碼回 400");

    const small = await request(base, "/api/broadcast", { method: "POST", body: '{"type":"PING"}' });
    check("一般廣播成功", small.status === 200);
    const big = await request(base, "/api/broadcast", { method: "POST", body: "a".repeat(100000) });
    check("超過 64KB 的廣播被拒絕", big.status !== 200, `→ ${big.status || "連線中斷"}`);

    fs.rmSync(secretDir, { recursive: true, force: true });
  }
};
