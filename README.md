# eLearning

五年級孩子的遊戲化學習網站，用靜態網頁放在 GitHub Pages。

網站：https://ac27641101.github.io/eLearning/

## 單元

進站後先選科目（國語、數學、社會、自然、英文）。還沒有單元的科目仍會出現，上面寫「尚未開放」。點進科目後才看到單元，可以回到科目清單。

章節資料夾名稱和小單元 id 寫進雲端之後就不能改。

- 國語
  - [五上國語・第參單元](chinese-u3/)（`chinese-u3`：`ch7`、`ch8`、`ch9`）
  - [五上國語・第肆單元　平凡中的特別](chinese-u4/)（`chinese-u4`：`ch10`、`ch11`、`ch12`）
- 數學
  - [五上數學 U6・異分母分數的加減](math-u6/)（`math-u6`：`6-1`、`6-2`、`6-3`）
  - [五上數學 U7・線對稱圖形](math-u7/)（`math-u7`：`7-1`、`7-2`、`7-3`）
  - [五上數學 U8・整數四則運算](math-u8/)（`math-u8`：`8-1`、`8-2`、`8-3`、`8-4`）
  - [五上數學 U9・面積](math-u9/)（`math-u9`：`9-1`、`9-2`、`9-3`、`9-4`）
  - [五上數學 U10・柱體、錐體和球](math-u10/)（`math-u10`：`10-1`、`10-2`、`10-3`、`10-5`）
- 社會
  - [五上社會 CH3・臺灣的物產資源](social-ch3/)
  - [五上社會 CH4・看見福爾摩沙](social-g5/)
- 自然
  - [五上自然 CH3・神奇的水溶液](science-ch3/)
  - [五上自然 CH4・力與運動](science-ch4/)
- 英文
  - [五上英文 Unit 3–4 期末複習](english-u34/)

新單元只要把資料夾放進這個專案，再在 `assets/hub.js` 的 `UNITS` 陣列加一筆（填好 `subject`）。新頁面請在 `<head>` 引入 `assets/gate.js`（路徑用相對路徑）。

## 登入

每一頁都先登入。沒有 `@` 的帳號會自動補上 `@kids.local`。小朋友輸入 `ysc` 或 `ytc`。媽媽輸入 `smc`。另一位家長輸入完整的 `ac27641101@gmail.com`。密碼錯誤時會看到「帳號或密碼不對喔，再試一次吧！」。

登入會記在這台裝置（Firebase Auth 的 local persistence），所以平常不用每次重打。學習島右上角有名字和「登出」。只有家長登入時，旁邊才有「家長頁」。

## 成績存在雲端

星星、計分次數、獎勵日期寫在 Cloud Firestore，換平板也還在。這台裝置另有一份快取（`el-score-v3:<uid>:<chapter>:<unitId>`），大廳可以先畫出來；雲端資料到了會再畫一次。

舊的 `el-score-v2` 不會搬過來。每個人從 0 顆星、3 次計分機會開始。

計分次數以雲端那筆為準。清除星星只會把星星和獎勵日期清掉，次數不會回來。清掉瀏覽器資料或換一台裝置，也不會把次數變回 3 次。家長重置會換一個新的 `rev`，孩子的舊紀錄寫不回去。

英文模擬考要四個部分都交卷，而且還在計分機會裡，才會把最好的考卷分數（0–100）寫進「模擬考」這個小單元。家長頁看得到。練習模式不會改這個分數。考卷做到一半的答案仍留在這台裝置。

每一關最近一次玩的星星和錯題寫在另一份紀錄 `users/{uid}/reviews/{chapter__unitId}`。星星檔 `scores` 的格式不變。看錯題失敗也不會擋住計分。家長重置小單元時，這份錯題紀錄會一起清掉。孩子自己按「清除星星紀錄」會留下錯題。

## 家長頁

家長登入後，從學習島進 [家長頁](parent/)。每個孩子會列出國語、數學、社會、自然、英文的每個小單元：最好星星 / 30、已用次數 / 3、Switch 分鐘（0、30 或 60），錯題，以及這個孩子總共得到的 Switch 分鐘。英文模擬考如果有考卷分數，會顯示最好成績 / 100。

26 顆星是 30 分鐘，30 顆星是 60 分鐘。每個小單元分開算，再把分鐘加總。

頁面上方的「全家 Switch」只加 ysc 和 ytc。`test@kids.local` 是測試用的孩子帳號，登入方式和計分規則與 ysc、ytc 相同。家長頁把它收在最下面的「測試帳號」裡，分鐘不計入全家合計。測試帳號清單在 `assets/gate.js` 的 `TEST_ACCOUNTS`。

家長可以重置某一個小單元（會先問一次）。重置之後星星、次數、獎勵和模擬考分數都回到可以再計分 3 次的狀態。

孩子第一次登入時，會寫下 `users/{uid}`：`{account:'ysc', role:'child'}`，家長頁才找得到人。家長登入寫的是 `role:'parent'`，不會被列成孩子。家長信箱集中在 `assets/gate.js` 的 `PARENT_EMAILS`。

## Firebase 主控台

成績和登入要能用，請在 [Firebase 主控台](https://console.firebase.google.com/project/elearning-6448b) 做這兩件事：

1. **Authentication → Settings → Authorized domains** 加入 `ac27641101.github.io`。沒有這一步，GitHub Pages 上的登入會被拒絕。`localhost` 預設就有。
2. **Firestore Database → Rules** 貼上這個專案根目錄的 `firestore.rules`，然後發布。資料庫目前是 production 模式，沒貼規則之前所有讀寫都會被拒絕。

Email/Password 登入維持開啟。孩子帳號是 `ysc@kids.local`、`ytc@kids.local`，測試帳號是 `test@kids.local`。家長帳號是 `ac27641101@gmail.com`、`smc@kids.local`。若 Authentication 裡還沒有 `smc@kids.local` 或 `test@kids.local`，請先新增這兩個使用者。

規則的意思：孩子只能讀寫自己的 `users/{自己的 uid}/**`。`ac27641101@gmail.com` 和 `smc@kids.local` 可以讀全部 `users/**`，也可以寫（用來重置）。這兩個信箱不能把自己寫成 `role:child`。孩子不能把計分次數變少。

## 發佈時要換版本

GitHub Pages 會把 JS 和 CSS 快取約 10 分鐘。每次發佈都要把頁面上本地 `<script>` 和 `<link rel="stylesheet">` 的 `?v=` 換成新的一組。這次父母簽名用的是 `?v=20261121a`（`gate.js`、`reward-approve.js`、`subject-play.js`、有改過的 `game.js`，以及家長頁的 `parent.css`、`parent.js`）。還沒改到的檔案仍是較早的版本：社會、自然、英文的 `style.css`、`data.js`、`unit-score.js` 是 `?v=20261119c`；家長頁的 `hub.css`、`unit-score.js` 是 `?v=20261119d`；學習島的 `hub.css`、`hub.js`，以及國語、數學的 `subject.css`、`data.js`、`unit-score.js` 是 `?v=20261119e`。HTML 重新整理後才會載入新程式；版本沒換時，回單元按鈕可能點了沒反應。

## 獎勵

每個小單元自己計分，不會把整章的星星加在一起換獎勵。舊的整章星星不會用來解鎖。

- 一個小單元有 4 關、30 題。答對 1 題得 1 顆星，最多 30 顆星。
- 最好成績達到 26 顆星：可以玩 Nintendo Switch 30 分鐘。
- 最好成績 30 顆星：再得到一張黃金卡，可以玩 Nintendo Switch 60 分鐘。
- 兌換券上的「父母簽名」可以點。父母輸入自己的帳號密碼之後，兌換券變成已核准，並寫下時間。孩子不會被登出。核准之後不能取消，這張券也不能再使用。家長頁看得到每一張核准紀錄。星星和計分次數不會因為核准而改變。
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
- [英文 Unit 3–4・30 分鐘](https://ac27641101.github.io/eLearning/english-u34/?preview=reward1)
- [英文 Unit 3–4・60 分鐘](https://ac27641101.github.io/eLearning/english-u34/?preview=reward2)
- [國語第參單元・30 分鐘](https://ac27641101.github.io/eLearning/chinese-u3/?preview=reward1)
- [國語第參單元・60 分鐘](https://ac27641101.github.io/eLearning/chinese-u3/?preview=reward2)
- [國語第肆單元・30 分鐘](https://ac27641101.github.io/eLearning/chinese-u4/?preview=reward1)
- [國語第肆單元・60 分鐘](https://ac27641101.github.io/eLearning/chinese-u4/?preview=reward2)
- [數學 U6・30 分鐘](https://ac27641101.github.io/eLearning/math-u6/?preview=reward1)
- [數學 U6・60 分鐘](https://ac27641101.github.io/eLearning/math-u6/?preview=reward2)
- [數學 U7・30 分鐘](https://ac27641101.github.io/eLearning/math-u7/?preview=reward1)
- [數學 U7・60 分鐘](https://ac27641101.github.io/eLearning/math-u7/?preview=reward2)
- [數學 U8・30 分鐘](https://ac27641101.github.io/eLearning/math-u8/?preview=reward1)
- [數學 U8・60 分鐘](https://ac27641101.github.io/eLearning/math-u8/?preview=reward2)
- [數學 U9・30 分鐘](https://ac27641101.github.io/eLearning/math-u9/?preview=reward1)
- [數學 U9・60 分鐘](https://ac27641101.github.io/eLearning/math-u9/?preview=reward2)
- [數學 U10・30 分鐘](https://ac27641101.github.io/eLearning/math-u10/?preview=reward1)
- [數學 U10・60 分鐘](https://ac27641101.github.io/eLearning/math-u10/?preview=reward2)
