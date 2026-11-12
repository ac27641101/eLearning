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

每個小單元自己計分，不會把整章的星星加在一起換獎勵。舊的整章星星不會用來解鎖。

- 一個小單元有 4 關、30 題。答對 1 題得 1 顆星，最多 30 顆星。
- 最好成績達到 26 顆星：可以玩 Nintendo Switch 30 分鐘。
- 最好成績 30 顆星：再得到一張黃金卡，可以玩 Nintendo Switch 60 分鐘。
- 每個小單元只有前 3 次「四關都玩完」會計分，留下最好的一次。
- 玩到一半離開，不算一次，也不會先鎖住這次的分數。可以接著玩，或整次重來。
- 3 次用完還可以練習。題目一樣，順序會變，但不會改星星、次數或獎勵日期。
- 在小單元裡按「清除星星紀錄」，會清掉這一單元的星星和獎勵日期。用過的計分次數不會回來，也不能清掉後再重新計分 3 次。其他單元不會動。

家長想先看卡片、又不想幫孩子解鎖時，用預覽網址（只會打開預覽，不會寫下獲得日期）：

- [社會 CH3・30 分鐘](https://ac27641101.github.io/eLearning/social-ch3/?preview=reward1)
- [社會 CH3・60 分鐘](https://ac27641101.github.io/eLearning/social-ch3/?preview=reward2)
- [社會 CH4・30 分鐘](https://ac27641101.github.io/eLearning/social-g5/?preview=reward1)
- [社會 CH4・60 分鐘](https://ac27641101.github.io/eLearning/social-g5/?preview=reward2)
- [自然 CH3・30 分鐘](https://ac27641101.github.io/eLearning/science-ch3/?preview=reward1)
- [自然 CH3・60 分鐘](https://ac27641101.github.io/eLearning/science-ch3/?preview=reward2)
- [自然 CH4・30 分鐘](https://ac27641101.github.io/eLearning/science-ch4/?preview=reward1)
- [自然 CH4・60 分鐘](https://ac27641101.github.io/eLearning/science-ch4/?preview=reward2)
