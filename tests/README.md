# 測試

## 自動化測試

```
npm test                      # 全部跑（約 8–10 分鐘）
node tests/run-all.js daily   # 只跑名稱含 daily 的測試
TEST_VERBOSE=1 npm test       # 連通過的項目也列出
```

**需要：** Node.js、電腦上的 Google Chrome（沒有可設 `TEST_BROWSER_CHANNEL=msedge` 改用 Edge）、Playwright（`npm i -g playwright`）。測試會自己啟動 `server.js`（隨機埠號），跑完自動關閉。

| 檔案 | 測什麼 |
| :--- | :--- |
| `server.test.js` | 伺服器只能讀專案資料夾、擋 `.git`／`server.js`／`tests`／`tools`／`node_modules`、連線偵測、廣播大小與頻率上限、拒收不合法 JSON |
| `festival.test.js` | 農曆換算與節慶日期、閏月、節慶表每筆對得到神尊；二十四節氣與已知天文時刻比對（誤差 30 分鐘內） |
| `deities.test.js` | 8 位神尊切換、法器、藏經閣列傳、關公紅臉還原、神尊聖誕的節慶功課 |
| `onboarding.test.js` | 新手引導四步、順序錯不前進、完成給功德、略過、老玩家不顯示、桌機與手機都不擋按鈕和搖桿 |
| `chiam-ritual.test.js` | 正統求籤三步驟每個分支（笑筊／陰筊重來、被拒的籤不記錄）、問題帶進 AI 解籤、不在途中觸發遶境、快速求籤、真實動畫走完全程、手機不擋按鈕 |
| `three.test.js` | Three.js 版本、r128 外觀相容層（燈光強度與衰減、色彩）、OrbitControls、載入與切換時無警告 |
| `xr.test.js` | 一般瀏覽器不顯示 VR 按鈕、偵測到頭盔才顯示、頭盔連不上有提示；進出 VR 的鏡頭／分身／滑鼠視角切換與還原（以模擬方式，無實體頭盔） |
| `loader.test.js` | 載入畫面立即顯示與參拜提示、3D 建好後移除且不擋按鈕、主控程式下載失敗時出現重新整理 |
| `click-through.test.js` | 打開萬寶閣每張卡片、點遍視窗內按鈕，不能有任何 JS 錯誤或載入失敗 |
| `daily.test.js` | 簽到、各科儀通報、掛機不算功課、獎勵不重複、連續簽到、節慶加倍、節氣功課 |
| `save-data.test.js` | 存檔匯出內容、不含 API Key、匯入還原、壞檔拒絕 |
| `quality.test.js` | 高／中／低實際設定、手動選擇保留、幀率不足自動降級 |
| `sound-motion.test.js` | 頂部列一排、聲音面板開關、三軌音量與儲存、語音音量、靜音連背景音一起停、減少動態（含跟隨系統設定） |
| `parade.test.js` | 開場鏡頭不被神轎擋住、遶境與鑽轎腳、回鑾 |
| `live-wall.test.js` | 兩台裝置互相看到祈願與點香、在線人數、去重、擋 HTML 注入、跨日歸零 |
| `pwa.test.js` | 預存清單完整、可安裝、斷網可開、字型離線可用 |
| `static-hosting.test.js` | 用 `tools/build-site.js` 產生的網站放在子路徑、沒有伺服器時正常運作（不連 SSE、不送廣播、香火牆說明原因），且不含測試與伺服器程式 |

**注意：**
- 測試用軟體繪圖跑 3D（不需顯示卡），所以「自動畫質」一定會選「低」，幀率數字也只能拿來做相對比較。
- **新增 JS 檔時**，`pwa.test.js` 會檢查它有沒有加進 `sw.js` 的預存清單，忘了加會失敗。
- 新功能請在對應的 `*.test.js` 加檢查；新的一組測試要加進 `run-all.js` 的 `SUITES`。

## 持續整合

`.github/workflows/test.yml`：專案放上 GitHub 後，每次推送與 Pull Request 都會自動跑 `npm test`，並檢查 `libs/three.bundle.min.js` 是否由目前的 `tools/three-entry.js` 打包（改了打包設定卻忘了執行 `npm run build:three` 會失敗）。

## 真機驗收

自動化測試看不到的部分（實際顯示卡效能、聲音、手機觸控、真實多裝置）請照 [MANUAL-CHECKLIST.md](MANUAL-CHECKLIST.md) 實際操作一輪。
