# 部署到網路（https）

部署後任何人拿到網址都能開，手機可以「加到主畫面」安裝、斷網可開，Quest 等 VR 頭盔的瀏覽器也能進入 VR（瀏覽器規定這些都要 https）。

**目前狀態：** 設定檔都已準備好，**尚未發布**。下面兩種方式擇一，由你決定要不要、何時做。

## 兩種方式比較

| | A. GitHub Pages | B. Render 雲端主機 |
| :--- | :--- | :--- |
| 費用 | 免費 | 免費方案可用 |
| 需要的帳號 | GitHub（這台電腦已登入 MAGICSMALLBEAR） | GitHub ＋ Render（要自己註冊） |
| 程式碼 | 免費帳號的 Pages 必須是**公開 repo** | 可維持**私人 repo** |
| 多人同行、跨裝置香火牆 | ❌ 沒有伺服器，只同步同一個瀏覽器的分頁 | ✅ 執行 `server.js`，完整保留 |
| 單人功能（參拜、求籤、每日修行、存檔、VR…） | ✅ | ✅ |
| 速度 | 隨時秒開 | 免費方案閒置一段時間會休眠，再開要等它喚醒 |
| 網址 | `https://magicsmallbear.github.io/<repo 名稱>/` | `https://<服務名稱>.onrender.com/` |

兩種方式都會用到的程式調整已完成：
- 沒有伺服器時自動改為單機模式，不會一直嘗試連線（香火牆會說明原因）。
- 伺服器已加上公開網路需要的防護：擋 `tests/`、`tools/`、`node_modules/` 與設定檔；每個來源每秒最多 20 則廣播；同時連線上限 200；只轉發合法 JSON。

## A. GitHub Pages

1. 建立 repo 並推送（**這一步就會公開程式碼**）：
   ```
   gh repo create virtual-temple --public --source . --push
   ```
2. 到 repo 的 **Settings → Pages → Build and deployment → Source** 選「**GitHub Actions**」。
3. 發布（只能手動觸發，之後推送程式碼**不會**自動更新網站）：
   ```
   gh workflow run pages.yml
   ```
   或在 GitHub 網頁的 **Actions → 部署到 GitHub Pages → Run workflow**。
4. 幾分鐘後打開 `https://magicsmallbear.github.io/virtual-temple/`。之後改了程式要更新網站，重複第 3 步。

公開的只有網頁本身需要的檔案（由 `tools/build-site.js` 依 `sw.js` 的預存清單挑出），測試、工具、文件、`server.js` 不會放到網站上；但 repo 本身是公開的，裡面的所有檔案都看得到。

## B. Render（保留多人同行）

1. 建立**私人** repo 並推送：
   ```
   gh repo create virtual-temple --private --source . --push
   ```
2. 到 [render.com](https://render.com) 註冊，並授權讀取你的 GitHub repo。
3. 在 Render 選 **New → Blueprint**，選這個 repo。Render 會讀 `render.yaml` 建立服務（免費方案、`node server.js`、健康檢查 `/api/ping`）。
4. 部署完成後，Render 會給你一個 `https://….onrender.com` 網址。之後推送程式碼，Render 會自動重新部署。

## 部署後驗收

照 [tests/MANUAL-CHECKLIST.md](tests/MANUAL-CHECKLIST.md) 操作一輪，並特別確認：
- 手機開網址 → 瀏覽器選單「加到主畫面」→ 從桌面開啟、關掉網路再開一次。
- （B 方式）電腦與手機同時開，互相看得到分身、祈願與點香。
- （有頭盔）Quest 瀏覽器開網址，頂部出現「🥽 VR」，進入後站在大殿正中。

## 注意

- AI 解籤的 Gemini API Key 只存在每個人自己的瀏覽器，不會被部署出去。
- 每位玩家的功德進度存在他自己的瀏覽器裡，換網址（例如從 Pages 換到 Render）不會帶過去，可用護照裡的「匯出／匯入存檔」搬移。
- 要停止公開：A 方式到 Settings → Pages 停用（或把 repo 改私人／刪除）；B 方式在 Render 刪除服務。
