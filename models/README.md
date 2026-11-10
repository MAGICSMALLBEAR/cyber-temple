# 3D 模型資料夾

把 `.glb` 檔放進這個資料夾，再到 `manifest.json` 加一筆，重新整理頁面就會出現。不用改程式。
檔案壞掉或寫錯時，遊戲會保留原本的程式模型，瀏覽器主控台會顯示原因。

## 清單範例

```json
{
  "models": [
    { "file": "heaven-censer.glb", "replace": "heavenCenser", "height": 2.6 },
    { "file": "mazu.glb", "deity": "mazu", "height": 2.3, "offsetY": 0 },
    { "file": "lantern.glb", "position": [6, 0, 21], "height": 2, "rotationY": 90 }
  ]
}
```

## 欄位

| 欄位 | 必填 | 說明 |
| :--- | :--- | :--- |
| `file` | 是 | 這個資料夾裡的檔名，只能是 `.glb`，不能含路徑 |
| `replace` | 三選一 | 取代場景中的物件，沿用它的位置和互動，名稱見下表 |
| `replaceAll` | 否 | 設為 `true` 時替換場景中所有同名物件（例如一對石獅、多座路燈） |
| `deity` | 三選一 | 當作某位神尊的神像，切換神尊時自動換。只在供奉該尊時才下載；同一尊只用清單裡的第一筆 |
| `position` | 三選一 | 放在指定位置 `[x, y, z]`，單位公尺 |
| `height` | 建議 | 想要的高度（公尺），會等比縮放 |
| `rotationY` | 否 | 水平旋轉角度，模型方向不對時調整 |
| `offsetY` | 否 | 上下高度微調（公尺） |
| `ground` | 否 | 設為 `true` 時強制貼地（`y = 0`）；預設會沿用被取代物件的高度（例如放在桌上的木魚、籤筒） |
| `collision` | 否 | 設 `false` 時角色可以穿過 |

模型會自動底部貼地、水平置中，所以原點不用很準。替換物件時只隱藏原物件的實體部分，火焰、大香、香煙微粒與光源會留著（天公爐換模型後仍看得到大香與火光）。

## 可以取代的物件

`heavenCenser` 天公爐、`stoneLionWest` 西側石獅、`stoneLionEast` 東側石獅、`censer` 大殿香爐、`jossFurnace` 八角金爐、`mountainGate` 山門、`wishingPond` 蓮花池、`wishTree` 祈願樹、`lotusSpring` 蓮心淨泉、`chiamBucket` 籤筒、`muyu` 木魚、`wenchangPavilion` 文昌閣、`yuelaoPavilion` 月老閣、`caishenCave` 財神殿、`taisuiShrine` 太歲殿

神尊代號：`mazu` 媽祖、`wenchang` 文昌、`caishen` 財神、`yuelao` 月老、`guanyin` 觀音、`guangong` 關公、`tudigong` 土地公、`guaiguai` 乖乖

## 模型規格

| 項目 | 建議 |
| :--- | :--- |
| 格式 | `.glb`，貼圖內嵌 |
| 面數 | 單件 3～5 萬三角面以內，超過 10 萬會在主控台警告 |
| 貼圖 | 1024～2048 像素 |
| 檔案大小 | 單檔 5 MB 以內 |
| 壓縮 | 不支援 Draco、Meshopt，匯出時請關閉 |

## 授權

每個模型都要留下來源和授權證明，記在下面。沒有確認可以商用的模型不要放進來。

| 檔案 | 來源 | 授權 |
| :--- | :--- | :--- |
| `sample-censer.glb`、`sample-lion.glb` | `tools/make-sample-models.mjs` 程式產生 | 本專案原創；試驗用，正式美術完成後替換 |
| `reference/mazu-front.png` | Codex 圖片生成（2026-11-08） | 建模參考圖，不隨網站發布；商用前要確認使用方案的條款 |
| `reference/mazu-side.png`、`reference/mazu-back.png` | Codex 圖片生成（2026-11-08），以正面圖為參考畫出左側面與背面 | 同上。背面圖椅座下露出衣襬，與側面圖的實心座身不符，建模以側面圖為準 |
| `reference/<神尊>-front.png`（文昌、財神、月老、觀音、關公、土地公） | Codex 圖片生成（2026-11-09），提示詞見 `reference/PROMPTS.md`，附媽祖正面圖統一風格 | 同媽祖參考圖 |
| `mazu.glb` | 以 `reference/` 三張參考圖，用 Hugging Face 上的 TRELLIS（微軟開源，MIT 授權）轉成 3D（2026-11-08）。約 2 萬面、1 張貼圖、無法線（載入時自動補） | 參考圖的條款同上；轉換工具本身可商用 |
