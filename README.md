# eLearning

五年級孩子的遊戲化學習網站，用靜態網頁放在 GitHub Pages。

網站：https://ac27641101.github.io/eLearning/

## 單元

首頁依科目分組（國語、數學、社會、自然、英文）。還沒有單元的科目不會出現。

- 社會
  - [五上社會 CH3・臺灣的物產資源](social-ch3/)
  - [五上社會 CH4・看見福爾摩沙](social-g5/)

新單元只要把資料夾放進這個專案，再在 `assets/hub.js` 的 `UNITS` 陣列加一筆（填好 `subject`）。新頁面請在 `<head>` 引入 `assets/gate.js`（路徑用相對路徑）。

## 獎勵

每個單元的星星和獎勵卡分開記在這台裝置上，不會互相蓋掉。集滿星星可以兌換 Switch 遊戲時間：24 顆星是 1 小時，48 顆星（全部）是 3 小時。拿到的日期會留著。

家長想先看卡片、又不想幫孩子解鎖時，用預覽網址（只會打開預覽）：

- [CH3・1 小時](https://ac27641101.github.io/eLearning/social-ch3/?preview=reward1)
- [CH3・3 小時](https://ac27641101.github.io/eLearning/social-ch3/?preview=reward2)
- [CH4・1 小時](https://ac27641101.github.io/eLearning/social-g5/?preview=reward1)
- [CH4・3 小時](https://ac27641101.github.io/eLearning/social-g5/?preview=reward2)
