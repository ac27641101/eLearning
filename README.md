# eLearning

五年級孩子的遊戲化學習網站，用靜態網頁放在 GitHub Pages。

網站：https://ac27641101.github.io/eLearning/

## 單元

進站後先選科目（國語、數學、社會、自然、英文）。還沒有單元的科目仍會出現，上面寫「尚未開放」。點進科目後才看到單元，可以回到科目清單。

- 社會
  - [五上社會 CH3・臺灣的物產資源](social-ch3/)
  - [五上社會 CH4・看見福爾摩沙](social-g5/)
- 自然
  - [五上自然 CH3・神奇的水溶液](science-ch3/)
  - [五上自然 CH4・力與運動](science-ch4/)

新單元只要把資料夾放進這個專案，再在 `assets/hub.js` 的 `UNITS` 陣列加一筆（填好 `subject`）。新頁面請在 `<head>` 引入 `assets/gate.js`（路徑用相對路徑）。

## 獎勵

每個單元的星星和獎勵卡分開記在這台裝置上，不會互相蓋掉。集滿星星可以兌換 Switch 遊戲時間：24 顆星是 1 小時，48 顆星（全部）是 3 小時。拿到的日期會留著。

家長想先看卡片、又不想幫孩子解鎖時，用預覽網址（只會打開預覽）：

- [社會 CH3・1 小時](https://ac27641101.github.io/eLearning/social-ch3/?preview=reward1)
- [社會 CH3・3 小時](https://ac27641101.github.io/eLearning/social-ch3/?preview=reward2)
- [社會 CH4・1 小時](https://ac27641101.github.io/eLearning/social-g5/?preview=reward1)
- [社會 CH4・3 小時](https://ac27641101.github.io/eLearning/social-g5/?preview=reward2)
- [自然 CH3・1 小時](https://ac27641101.github.io/eLearning/science-ch3/?preview=reward1)
- [自然 CH3・3 小時](https://ac27641101.github.io/eLearning/science-ch3/?preview=reward2)
- [自然 CH4・1 小時](https://ac27641101.github.io/eLearning/science-ch4/?preview=reward1)
- [自然 CH4・3 小時](https://ac27641101.github.io/eLearning/science-ch4/?preview=reward2)
