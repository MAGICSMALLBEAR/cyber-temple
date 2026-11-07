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
| `deity` | 三選一 | 當作某位神尊的神像，切換神尊時自動換 |
| `position` | 三選一 | 放在指定位置 `[x, y, z]`，單位公尺 |
| `height` | 建議 | 想要的高度（公尺），會等比縮放 |
| `rotationY` | 否 | 水平旋轉角度，模型方向不對時調整 |
| `offsetY` | 否 | 神像專用，上下微調 |
| `collision` | 否 | 設 `false` 時角色可以穿過 |

模型會自動底部貼地、水平置中，所以原點不用很準。

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
