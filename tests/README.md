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
| `server.test.js` | 伺服器只能讀專案資料夾、擋 `.git` 與 `server.js`、廣播大小上限 |
| `festival.test.js` | 農曆換算與 2026 年各節慶日期、閏月、每日功課固定 |
| `click-through.test.js` | 打開萬寶閣每張卡片、點遍視窗內按鈕，不能有任何 JS 錯誤或載入失敗 |
| `daily.test.js` | 簽到、各科儀通報、掛機不算功課、獎勵不重複、連續簽到、節慶加倍 |
| `save-data.test.js` | 存檔匯出內容、不含 API Key、匯入還原、壞檔拒絕 |
| `quality.test.js` | 高／中／低實際設定、手動選擇保留、幀率不足自動降級 |
| `parade.test.js` | 開場鏡頭不被神轎擋住、遶境與鑽轎腳、回鑾 |
| `live-wall.test.js` | 兩台裝置互相看到祈願與點香、在線人數、去重、擋 HTML 注入、跨日歸零 |
| `pwa.test.js` | 預存清單完整、可安裝、斷網可開、字型離線可用 |

**注意：**
- 測試用軟體繪圖跑 3D（不需顯示卡），所以「自動畫質」一定會選「低」，幀率數字也只能拿來做相對比較。
- **新增 JS 檔時**，`pwa.test.js` 會檢查它有沒有加進 `sw.js` 的預存清單，忘了加會失敗。
- 新功能請在對應的 `*.test.js` 加檢查；新的一組測試要加進 `run-all.js` 的 `SUITES`。

## 真機驗收

自動化測試看不到的部分（實際顯示卡效能、聲音、手機觸控、真實多裝置）請照 [MANUAL-CHECKLIST.md](MANUAL-CHECKLIST.md) 實際操作一輪。
