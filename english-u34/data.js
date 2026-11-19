/* 五上英文（翰林）Unit 3–4 期末複習。只使用內容包裡的字、句、人名。
   選擇題正解放在 opts / choices / clocks 的第一個，遊戲會自己打亂。
   聽力不使用習作「需音檔」的題；語音是瀏覽器朗讀課本裡已出現的字句。

   答案標成推定的題（書上沒有印解答，或句子是依課文改寫）。家長請對一下：
   - u3l1-2 Mozart writes music → 室內〔課 p.52，推定〕
   - u3l1-3 Teddy watches TV → 室內〔課 p.52，推定〕
   - u3l1-4 study English → 室內〔習 p.23 圖是書桌，推定〕
   - u3l1-5 Rocky plays baseball → 戶外〔課 p.52，推定〕
   - u3l1-6 go jogging → 戶外〔課 p.50 戶外活動，推定〕
   - u3l1-7 ride a bike → 戶外〔推定〕
   - u3l1-8 play basketball → 戶外〔推定〕
   - u4l1-1 gets up at eight〔課 p.66 圈選 eight，推定〕
   - u4l1-2 has breakfast〔順序依課文，a.m. 推定〕
   - u4l1-3 makes a snowman〔a.m. 推定〕
   - u4l1-4 goes to school at ten〔十點歸 a.m.，推定〕
   - u4l1-5 wraps gifts at two〔圈選 two，推定〕
   - u4l1-6 goes home at five〔p.m. 推定〕
   - u4l1-7 has dinner at six thirty〔圈選 have dinner，推定〕
   - u4l1-8 goes to bed at nine thirty〔圈選 go to bed，推定〕
   - wk2-2 She is riding a bike〔推定：課本沒有 is + V-ing 整句，針對期中 rides / riding〕
   - wk2-4 He is playing basketball〔推定，同上〕
   - wk2-8 Jim is doing his homework〔推定，同上〕
   - wk3-1 Bella plays basketball → F〔習 p.24 名單推定〕
   - wk3-2 Bella plays baseball → T〔習 p.24 名單推定〕
   - wk3-3 圖表一共 22 人 → T〔依名單加總，解答未印，推定〕
   - wk4-1 Lucas：No, he doesn't. He watches TV.〔習 p.24，人稱 he 依內容包推定〕
   - wk4-2 Bella：Yes, she does.〔習 p.24，人稱 she 依內容包推定〕
   - wk4-3 Roy：No, he isn't. He is twelve years old.〔課 p.50 年齡是 twelve；整句是完整回答的寫法，推定〕
   - G1 Bella 的活動拼 baseball〔習 p.24 推定〕
   - G2 play baseball 的代號 G〔代號是這份考卷自己標的，請家長知道不是課本印的〕
   - G3 Bella plays basketball → F〔推定〕
   - G4 There are 21 people → F（實為 22）〔推定〕
   - G5 Lucas 的完整句〔推定〕
   - G6 Connie：She rides a bike in her free time.〔習 p.24，人稱 she 依內容包推定〕
   - H1 She gets up at eight o'clock.〔課 p.54 原文是 I get up at eight o'clock，改成 She，推定〕
   - H3 He is playing basketball.〔推定：進行式對比，課本寫的是 plays basketball〕

   另外請家長看一眼、但不是推定答案：
   - Internet 的字首大寫 I（內容包寫成 Internet）
   - 圓餅圖人名拼字：Stephan, Megan, Maya, Connie, Jeremy, Wilson… 請對習作 p.24
   - 模擬考 C 的圖是我們畫的，句子用 Jim and Eva 與句型頁的作息句
*/
(function () {
  var CHART = [
    '<div class="board">',
    '<p class="board-q">What do you do in your free time?</p>',
    '<div class="bars">',
    bar('A', '50%', '3', 'listen to music', 'Jerry, Sally, Ann'),
    bar('B', '100%', '6', 'play basketball', 'Stephan, Michael, Sam, Joan, Greg, Tim'),
    bar('C', '67%', '4', 'surf the Internet', 'Bill, Mark, Megan, Maya'),
    bar('D', '17%', '1', 'ride a bike', 'Connie'),
    bar('E', '33%', '2', 'watch TV', 'Emma, Lucas'),
    bar('F', '17%', '1', 'go jogging', 'Jeremy'),
    bar('G', '83%', '5', 'play baseball', 'Mario, Jack, Leo, Bella, Wilson'),
    '</div>',
    '<p class="board-note">長條上的數字是那一列的人數。名字都在圖上。</p>',
    '</div>'
  ].join('');

  function bar(code, w, n, name, who) {
    return '<div class="bar-row"><span class="code">' + code + '</span>' +
      '<span class="bar-track"><i style="width:' + w + '"></i></span><b>' + n + '</b>' +
      '<span class="bar-name">' + name + '</span><span class="bar-who">' + who + '</span></div>';
  }

  var JIM = '<div class="passage"><p>Jim and Eva are brother and sister. They go to school at seven thirty. Jim is an early bird. He gets up at six thirty, but Eva gets up at seven twenty. Then, they have lunch together at twelve o\'clock.</p>' +
    '<p>Jim and Eva go home at four o\'clock. Eva takes a shower at four thirty, but Jim does his homework first. Then, he plays basketball at five and takes a shower at six.</p>' +
    '<p>Jim and Eva have dinner with their mom and dad. After that, they watch TV. At nine thirty, Jim and Eva go to bed.</p></div>';

  window.UNITS = [
    {
      id: 'u3',
      icon: '🏀',
      tag: 'Unit 3',
      name: 'Free Time 休閒活動',
      lessons: ['活動單字', 'What do you do…?', 'oi / oy'],
      desc: 'Unit 3 What Do You Do in Your Free Time? 活動單字、What do you / does she do、第三人稱 -s / -es / -ies、所有格、Does he…?、發音 oi / oy。',
      levels: [
        {
          id: 'u3l1',
          kind: 'hand',
          type: 'sort',
          icon: '🧺',
          name: '室內還是戶外',
          ask: '這張活動卡是 Indoor 室內，還是 Outdoor 戶外？',
          bins: [
            { id: 'in', icon: '🏠', name: 'Indoor 室內' },
            { id: 'out', icon: '🌳', name: 'Outdoor 戶外' }
          ],
          items: [
            { id: 'u3l1-1', t: 'plays the piano', gloss: '彈鋼琴', bin: 'in', em: '🎹', tip: 'Beethoven plays the piano. 這是課本 T 表的室內例子。〔課 p.52〕', hint: '彈鋼琴放在室內。' },
            { id: 'u3l1-2', t: 'writes music', gloss: '寫曲子', bin: 'in', em: '🎼', infer: true, tip: 'Mozart writes music. 推定放在室內。〔課 p.52〕', hint: '寫曲子放在室內。' },
            { id: 'u3l1-3', t: 'watches TV', gloss: '看電視', bin: 'in', em: '📺', infer: true, tip: 'Teddy watches TV. 推定放在室內。〔課 p.52〕', hint: '看電視放在室內。' },
            { id: 'u3l1-4', t: 'study English', gloss: '讀英文', bin: 'in', em: '📖', infer: true, tip: '習作圖是男孩在書桌讀英文。推定為室內。〔習 p.23〕', hint: '在書桌讀英文，放在室內。' },
            { id: 'u3l1-5', t: 'plays baseball', gloss: '打棒球', bin: 'out', em: '⚾', infer: true, tip: 'Rocky plays baseball. 推定放在戶外。〔課 p.52〕', hint: '打棒球放在戶外。' },
            { id: 'u3l1-6', t: 'go jogging', gloss: '去慢跑', bin: 'out', em: '🏃', infer: true, tip: 'Discover 把 go jogging 放在戶外活動。推定。〔課 p.50〕', hint: '慢跑放在戶外。' },
            { id: 'u3l1-7', t: 'ride a bike', gloss: '騎腳踏車', bin: 'out', em: '🚲', infer: true, tip: '騎腳踏車推定為戶外。〔課 p.44、p.50〕', hint: '騎腳踏車放在戶外。' },
            { id: 'u3l1-8', t: 'play basketball', gloss: '打籃球', bin: 'out', em: '🏀', infer: true, tip: '打籃球推定為戶外。〔課 p.44〕', hint: '打籃球放在戶外。' }
          ],
          recap: '課本 T 表：室內有彈鋼琴、寫曲子、看電視；戶外有打棒球。慢跑、騎車、打籃球也放在戶外。'
        },
        {
          id: 'u3l2',
          kind: 'idea',
          type: 'quiz',
          icon: '💡',
          name: '句型觀念站',
          questions: [
            q('u3l2-1', '選出正確的字。', 'What ___ she do in her free time?', ['does', 'do', 'is'], 'she 要用 does。What does she do in her free time?〔課 p.44〕'),
            q('u3l2-2', '選出正確的字。', 'She ___ TV in her free time.', ['watches', 'watch', 'watching'], 'watch 字尾是 ch，第三人稱加 -es：watches。〔課 p.47〕'),
            q('u3l2-3', '選出正確的字。', 'My sister ___ English in her free time.', ['studies', 'studys', 'study'], '子音 + y 要去 y 加 -ies：study → studies。〔課 p.47〕'),
            q('u3l2-4', '選出正確的字。', 'She ___ jogging in her free time.', ['goes', 'go', 'going'], 'go 的第三人稱是 goes。〔課 p.47〕'),
            q('u3l2-5', 'I 的所有格是哪一個？', 'I go jogging in ___ free time.', ['my', 'his', 'their'], 'I → my。I go jogging in my free time.〔課 p.44〕'),
            q('u3l2-6', 'you 的所有格是哪一個？', 'What do you do in ___ free time?', ['your', 'my', 'their'], 'you → your。〔課 p.44〕'),
            q('u3l2-7', 'he 的所有格是哪一個？', 'He listens to music in ___ free time.', ['his', 'her', 'their'], 'he → his。He listens to music in his free time.〔課 p.47〕'),
            q('u3l2-8', 'she 的所有格是哪一個？', 'What does she do in ___ free time?', ['her', 'his', 'their'], 'she → her。What does she do in her free time?〔課 p.44〕'),
            q('u3l2-9', 'we 的所有格是哪一個？', 'We watch TV in ___ free time.', ['our', 'their', 'my'], 'we → our。習作格子是 in our free time。〔習 p.21、課 p.44〕'),
            q('u3l2-10', 'they 的所有格是哪一個？', 'They play basketball in ___ free time.', ['their', 'his', 'her'], 'they → their。〔課 p.44、p.47〕')
          ],
          recap: 'I/you/we/they 用原形，所有格是 my/your/our/their。he/she 用 -s/-es/-ies，所有格是 his/her。'
        },
        {
          id: 'u3l3',
          kind: 'boss',
          type: 'quiz',
          icon: '🔥',
          name: '聽音快問',
          time: 150,
          questions: [
            listen('u3l3-1', '聽單字，圈出發音組合。', 'c __ n', 'coin', ['oi', 'oy'], 'coin 的 oi。〔課 p.48〕'),
            listen('u3l3-2', '聽單字，圈出發音組合。', 'b __', 'boy', ['oy', 'oi'], 'boy 的 oy。〔課 p.48〕'),
            listen('u3l3-3', '聽單字，圈出發音組合。', 'p __ nt', 'point', ['oi', 'oy'], 'point 的 oi。〔課 p.48〕'),
            listen('u3l3-4', '聽單字，圈出發音組合。', 't __', 'toy', ['oy', 'oi'], 'toy 的 oy。〔課 p.48〕'),
            pic('u3l3-5', 'She watches TV in her free time.', ['📺', '⚾', '🏃'], 'She watches TV in her free time. 她看電視。〔課 p.44〕'),
            pic('u3l3-6', 'I play baseball on weekends.', ['⚾', '📺', '🚲'], 'I play baseball on weekends. 我週末打棒球。〔課 p.42〕')
          ],
          recap: 'oi：coin, point。oy：boy, toy。聽到整句，就點對的活動圖。'
        },
        {
          id: 'u3l4',
          kind: 'adv',
          type: 'quiz',
          icon: '🎯',
          name: '拼字與整句',
          questions: [
            spell('u3l4-1', '去慢跑的那個字。', '🏃', 'jogging', ['e', 'a', 'u'], 'go jogging。jogging 有兩個 g，不要漏。〔課 p.44〕'),
            spell('u3l4-2', '打籃球的那個字。', '🏀', 'basketball', ['i', 'o', 'r'], 'play basketball。中間有 ket，有兩個 l。〔課 p.44〕'),
            spell('u3l4-3', '上網的那個字。字首要大寫。', '💻', 'Internet', ['a', 'o', 'i'], 'surf the Internet。字首 I 要大寫，中間有兩個 e。〔課 p.44〕'),
            sentence('u3l4-4', '把字卡排成問句。', '你空閒的時候會做什麼？', ['What', 'do', 'you', 'do', 'in', 'your', 'free', 'time', '?'], ['does', 'is'], null, 'What do you do in your free time?〔課 p.44〕'),
            sentence('u3l4-5', '把字卡排成一句話。', '她空閒時會看電視。', ['She', 'watches', 'TV', 'in', 'her', 'free', 'time', '.'], ['watch', 'does', 'is'], null, 'She watches TV in her free time.〔課 p.44〕'),
            sentence('u3l4-6', '用完整的句子回答。', 'Mozart 空閒時會寫曲子嗎？', ['Yes,', 'he', 'does', '.'], ['is', 'do', "doesn't"], null, 'He writes music in his free time. 所以是 Yes, he does.〔課 p.42、習 p.24〕')
          ],
          recap: '拼的時候看中間有沒有漏字母。問句的第一個字要大寫，最後要有 ? 或 .。'
        }
      ]
    },
    {
      id: 'u4',
      icon: '⏰',
      tag: 'Unit 4',
      name: 'Daily Routines 作息時間',
      lessons: ['作息單字', 'What time…?', 'ou / ow'],
      desc: 'Unit 4 What Time Do You Get Up? 作息、What time do you / does he、時間的英文、a.m. / p.m.、gets / takes / goes / does / has、發音 ou / ow。',
      levels: [
        {
          id: 'u4l1',
          kind: 'hand',
          type: 'order',
          icon: '🗓️',
          name: 'Joy 的星期五',
          rounds: [
            {
              ask: '依課文，把 Joy 的星期五從早排到晚。',
              why: '早上：起床、吃早餐、堆雪人、十點上學。下午：兩點包禮物、五點回家、六點半吃晚餐、九點半上床。〔課 p.66，圈選為推定〕',
              items: [
                { id: 'u4l1-1', t: 'gets up at eight', gloss: 'a.m. 起床', em: '⏰', infer: true, hint: '她八點起床，這是第一件。' },
                { id: 'u4l1-2', t: 'has breakfast', gloss: 'a.m. 吃早餐', em: '🍳', infer: true, hint: '起床之後在院子吃早餐。' },
                { id: 'u4l1-3', t: 'makes a snowman', gloss: 'a.m. 堆雪人', em: '⛄', infer: true, hint: '早餐之後堆雪人。' },
                { id: 'u4l1-4', t: 'goes to school at ten', gloss: 'a.m. 上學', em: '🏫', infer: true, hint: '然後十點上學。' },
                { id: 'u4l1-5', t: 'wraps gifts at two', gloss: 'p.m. 包禮物', em: '🎁', infer: true, hint: '下午兩點在學校包禮物。' },
                { id: 'u4l1-6', t: 'goes home at five', gloss: 'p.m. 回家', em: '🏠', infer: true, hint: '五點回家。' },
                { id: 'u4l1-7', t: 'has dinner at six thirty', gloss: 'p.m. 吃晚餐', em: '🍽️', infer: true, hint: '六點半吃晚餐，不是先洗澡。' },
                { id: 'u4l1-8', t: 'goes to bed at nine thirty', gloss: 'p.m. 上床', em: '🛏️', infer: true, hint: '九點半上床睡覺。' }
              ]
            }
          ],
          recap: 'Joy：eight 起床、ten 上學、two 包禮物、five 回家、six thirty 吃晚餐、nine thirty 上床。早上是 a.m.，下午晚上是 p.m.。'
        },
        {
          id: 'u4l2',
          kind: 'idea',
          type: 'quiz',
          icon: '💡',
          name: '時間觀念站',
          questions: [
            q('u4l2-1', '6:30 用英文怎麼說？', '6:30', ['six thirty', 'six thirteen', "six o'clock"], '6:30 = six thirty。〔課 p.58〕'),
            q('u4l2-2', '8:00 用英文怎麼說？', '8:00', ["eight o'clock", 'eight thirty', 'eight fifteen'], "整點說 o'clock。I get up at eight o'clock.〔課 p.54〕"),
            q('u4l2-3', '12:15 用英文怎麼說？', '12:15', ['twelve fifteen', 'twelve fifty', 'twelve five'], '12:15 = twelve fifteen。〔課 p.59〕'),
            q('u4l2-4', '選出正確的字。', 'What time ___ he do his homework?', ['does', 'do', 'is'], 'he 要用 does。What time does he do his homework?〔課 p.58〕'),
            q('u4l2-5', '選出正確的字。', 'He ___ his homework at five.', ['does', 'do', 'doing'], 'do → does。He does his homework at five.〔課 p.58〕'),
            q('u4l2-6', '選出正確的字。', 'Lily ___ home at 4:30.', ['goes', 'go', 'going'], 'She goes home at 4:30. go → goes。〔課 p.61〕'),
            q('u4l2-7', '選出正確的字。', 'He ___ lunch at twelve o\'clock.', ['has', 'have', 'having'], 'have → has。They have lunch at twelve o\'clock. 他一個人就用 has。〔課 p.58、習 p.30〕'),
            q('u4l2-8', '早上七點要寫哪一個？', 'I go to school at 7:00. 7:00 in the morning is 7:00 ___.', ['a.m.', 'p.m.', "o'clock"], '早上是 a.m.，晚上是 p.m.。〔課 p.61〕')
          ],
          recap: '整點說 o\'clock，6:30 說 six thirty，12:15 說 twelve fifteen。早上 a.m.，下午晚上 p.m.。have 的第三人稱是 has。'
        },
        {
          id: 'u4l3',
          kind: 'boss',
          type: 'quiz',
          icon: '🔥',
          name: '聽音與時鐘',
          time: 150,
          questions: [
            listen('u4l3-1', '聽單字，圈出發音組合。', 'h __ se', 'house', ['ou', 'ow'], 'house 的 ou。〔課 p.62〕'),
            listen('u4l3-2', '聽單字，圈出發音組合。', '__ l', 'owl', ['ow', 'ou'], 'owl 的 ow。〔課 p.62〕'),
            listen('u4l3-3', '聽單字，圈出發音組合。', 'sh __ t', 'shout', ['ou', 'ow'], 'shout 的 ou。〔課 p.62〕'),
            listen('u4l3-4', '聽單字，圈出發音組合。', 'cl __ n', 'clown', ['ow', 'ou'], 'clown 的 ow。〔課 p.62〕'),
            listen('u4l3-5', '聽單字，圈出發音組合。', 'cl __ d', 'cloud', ['ou', 'ow'], 'cloud 的 ou。〔課 p.62〕'),
            clockQ('u4l3-6', 'six thirty', [[6, 30], [6, 0], [7, 30]], 'six thirty 是 6 點 30 分。〔課 p.58〕'),
            clockQ('u4l3-7', "eight o'clock", [[8, 0], [8, 15], [9, 0]], "eight o'clock 是 8 點整。〔課 p.54〕"),
            clockQ('u4l3-8', 'four thirty', [[4, 30], [4, 20], [5, 0]], 'four thirty 是 4 點 30 分。Eva takes a shower at four thirty.〔習 p.30〕')
          ],
          recap: 'ou：house, shout, cloud。ow：owl, clown。聽到時間就點對的時鐘。'
        },
        {
          id: 'u4l4',
          kind: 'adv',
          type: 'quiz',
          icon: '🎯',
          name: 'Jim 和 Eva',
          questions: [
            {
              id: 'u4l4-1', q: '選出正確的答案。', stem: 'What time does Eva get up?',
              opts: ['She gets up at seven twenty.', 'She gets up at six thirty.', 'She gets up at seven thirty.'],
              passage: JIM,
              why: 'Eva gets up at seven twenty. Jim 才是 six thirty。〔習 p.30〕'
            },
            {
              id: 'u4l4-2', q: '這句對不對？', stem: 'Jim gets up at six thirty.',
              opts: ['T', 'F'], passage: JIM,
              why: 'He gets up at six thirty. 這句是對的。〔習 p.30〕'
            },
            {
              id: 'u4l4-3', q: '這句對不對？', stem: 'Eva gets up at six thirty.',
              opts: ['F', 'T'], passage: JIM,
              why: 'six thirty 是 Jim。Eva gets up at seven twenty。〔習 p.30〕'
            },
            {
              id: 'u4l4-4', q: '這句對不對？看清楚是 baseball 還是 basketball。', stem: 'Jim plays baseball at five.',
              opts: ['F', 'T'], passage: JIM,
              why: 'He plays basketball at five. 不是 baseball。〔習 p.30〕'
            },
            sentence('u4l4-5', '用完整的句子回答。', 'Jim 和 Eva 幾點上床睡覺？', ['They', 'go', 'to', 'bed', 'at', 'nine', 'thirty', '.'], ['does', 'get', 'is'], null, 'At nine thirty, Jim and Eva go to bed.', JIM),
            sentence('u4l4-6', '用完整的句子回答。', 'Eva 幾點洗澡？', ['She', 'takes', 'a', 'shower', 'at', 'four', 'thirty', '.'], ['take', 'does', 'is'], [['Eva', 'takes', 'a', 'shower', 'at', 'four', 'thirty', '.']], 'Eva takes a shower at four thirty. 也可以說 She takes a shower at four thirty.〔習 p.30〕', JIM)
          ],
          recap: 'Jim 6:30 起床，Eva 7:20 起床。Eva 4:30 洗澡。Jim 五點打的是 basketball。'
        }
      ]
    },
    {
      id: 'weak',
      icon: '🎯',
      tag: '弱點',
      name: '弱點加強',
      lessons: ['拼字', '動詞形式', '完整句子'],
      desc: '針對期中容易漏字母、看錯圖表、答得不完整、把 -s 和 is + V-ing 搞混。題目都用 Unit 3 和 Unit 4 的字。',
      levels: [
        {
          id: 'wk1',
          kind: 'hand',
          type: 'quiz',
          icon: '🔤',
          name: '拼字特訓',
          questions: [
            spell('wk1-1', '騎腳踏車的第一個字。字尾有不發音的 e。', '🚲', 'ride', ['a', 'o', 's'], 'ride a bike。字尾 e 不要漏。〔課 p.44〕'),
            spell('wk1-2', '腳踏車的那個字。字尾有 e。', '🚲', 'bike', ['a', 'o', 'r'], 'ride a bike。字尾 e 不要漏。〔課 p.44〕'),
            spell('wk1-3', '回家：go 後面的那個字。', '🏠', 'home', ['a', 'i', 'u'], 'go home。字尾 e 不要漏。〔課 p.58〕'),
            spell('wk1-4', '房子。發音是 ou。', '🏡', 'house', ['i', 'a', 'n'], 'house。中間是 ou，字尾有 e。〔課 p.62〕'),
            spell('wk1-5', '洗澡：___ a shower 的第一個字。', '🚿', 'take', ['i', 'o', 'h'], 'take a shower。字尾 e 不要漏。〔課 p.58〕'),
            spell('wk1-6', '寫功課的那個字。', '✏️', 'homework', ['i', 'a', 'u'], 'do my homework。中間有 e，不要漏。〔課 p.58〕'),
            spell('wk1-7', '淋浴的那個字。', '🚿', 'shower', ['u', 'i', 'a'], 'take a shower。shower 是 ow。〔課 p.58、p.62〕'),
            spell('wk1-8', '澳洲。信箱上的國家，中間不要漏字母。', '🇦🇺', 'Australia', ['e', 'o', 'n'], 'Australia。中間是 ralia，不要漏 r。〔課 p.56〕')
          ],
          recap: '字尾不發音的 e：ride, bike, home, take, house。長字看中間：homework, shower, Australia。'
        },
        {
          id: 'wk2',
          kind: 'idea',
          type: 'quiz',
          icon: '💡',
          name: '動詞形式大對決',
          questions: [
            q('wk2-1', '沒有 is。選動詞的形。', 'She ___ a bike in her free time.', ['rides', 'riding', 'ride'], '沒有 is，第三人稱加 -s：rides。〔課 p.47〕'),
            q('wk2-2', '句子裡有 is。選動詞的形。', 'She is ___ a bike.', ['riding', 'rides', 'ride'], '有 is，動詞用 -ing：is riding。這句是和 -s 對比的加強題。', true),
            q('wk2-3', '沒有 is。選動詞的形。', 'He ___ basketball in his free time.', ['plays', 'playing', 'play'], '沒有 is，用 plays。〔課 p.47〕'),
            q('wk2-4', '句子裡有 is。選動詞的形。', 'He is ___ basketball.', ['playing', 'plays', 'play'], '有 is，用 playing：is playing。這句是對比加強題。', true),
            q('wk2-5', '選出正確的字。', 'Joy ___ up at eight o\'clock.', ['gets', 'getting', 'get'], 'get → gets。I get up at eight o\'clock. 她就是 gets。〔課 p.54、p.58〕'),
            q('wk2-6', '選出正確的字。', 'He ___ music in his free time.', ['writes', 'writing', 'write'], 'He writes music in his free time.〔課 p.42〕'),
            q('wk2-7', '選出正確的字。', 'Eva ___ a shower at four thirty.', ['takes', 'taking', 'take'], 'take → takes。Eva takes a shower at four thirty.〔習 p.30〕'),
            q('wk2-8', '句子裡有 is。選動詞的形。', 'Jim is ___ his homework.', ['doing', 'does', 'do'], '有 is，用 doing：is doing。平常說 He does his homework. 這句是對比加強題。', true)
          ],
          recap: '沒有 be 動詞：he/she 用 -s。有 is / am / are：動詞用 -ing。does 和 is doing 不一樣。'
        },
        {
          id: 'wk3',
          kind: 'boss',
          type: 'quiz',
          icon: '🔍',
          name: '細心偵探',
          time: 150,
          questions: [
            tf('wk3-1', '看圖表。這句對不對？', 'Bella plays basketball.', false, 'Bella 在 play baseball 那一列，不是 basketball。〔習 p.24〕', CHART, true),
            tf('wk3-2', '看圖表。這句對不對？', 'Bella plays baseball.', true, 'play baseball：Mario, Jack, Leo, Bella, Wilson。〔習 p.24〕', CHART, true),
            tf('wk3-3', '把每一列的人數加一加。這句對不對？', 'There are 22 people in the chart.', true, '3+6+4+1+2+1+5=22。每一列都要算。〔習 p.24〕', CHART, true),
            tf('wk3-4', '習作的句子是 Joe and I。這句對不對？', 'Joe and I are one person.', false, 'Joe and I 是兩個人。I 也要算進去。〔習 p.21〕'),
            tf('wk3-5', '看文章。這句對不對？', 'Jim gets up at seven twenty.', false, 'seven twenty 是 Eva。Jim gets up at six thirty。〔習 p.30〕', JIM),
            tf('wk3-6', '看文章。這句對不對？', 'Eva gets up at seven twenty.', true, 'Eva gets up at seven twenty. 文章裡有寫。〔習 p.30〕', JIM),
            tf('wk3-7', '看文章。這句對不對？', 'Jim plays basketball at five.', true, 'Then, he plays basketball at five.〔習 p.30〕', JIM),
            tf('wk3-8', '把吃飯的人都數一數。這句對不對？', 'There are 3 people at dinner.', false, 'Jim, Eva, mom, and dad，一共 4 個人。〔習 p.30〕', JIM)
          ],
          recap: 'baseball 和 basketball 要逐字看。人數要把每一個人都算進去，I、mom、dad 都不能漏。'
        },
        {
          id: 'wk4',
          kind: 'adv',
          type: 'quiz',
          icon: '📝',
          name: '完整句王',
          questions: [
            sentence('wk4-1', '用完整的句子回答。否定之後，補上他真正做的事。', '看上面的圖表。Lucas 空閒時會去慢跑嗎？如果不會，用完整的句子寫出他真正做的活動。', ['No,', 'he', "doesn't", '.', 'He', 'watches', 'TV', '.'], ['does', 'not', 'is', 'plays'], [['No,', 'he', 'does', 'not', '.', 'He', 'watches', 'TV', '.']], 'Lucas 在 watch TV 那一列。No, he doesn\'t. He watches TV.〔習 p.24〕', CHART, true),
            sentence('wk4-2', '用完整的句子回答。', '看上面的圖表。Bella 空閒時會打棒球嗎？', ['Yes,', 'she', 'does', '.'], ['is', 'do', "doesn't"], null, 'Bella 在 play baseball 那一列。Yes, she does.〔習 p.24〕', CHART, true),
            sentence('wk4-3', '用完整的句子回答。要有 years old。', 'Roy 是十歲嗎？回答要有 years old。', ['No,', 'he', "isn't", '.', 'He', 'is', 'twelve', 'years', 'old', '.'], ['does', "He's", 'ten'], [['No,', 'he', 'is', 'not', '.', 'He', 'is', 'twelve', 'years', 'old', '.'], ['No,', 'he', "isn't", '.', "He's", 'twelve', 'years', 'old', '.']], 'Roy is twelve years old. 要寫 years，不能只寫 twelve old。〔課 p.50〕', null, true),
            sentence('wk4-4', '用完整的句子回答。', 'Eva 幾點起床？', ['She', 'gets', 'up', 'at', 'seven', 'twenty', '.'], ['does', 'get', 'is'], null, 'She gets up at seven twenty.〔習 p.30〕', JIM),
            sentence('wk4-5', '用完整的句子回答。', 'Jim 幾點起床？', ['He', 'gets', 'up', 'at', 'six', 'thirty', '.'], ['does', 'seven', 'is'], null, 'He gets up at six thirty.〔習 p.30〕', JIM),
            sentence('wk4-6', '用完整的句子回答。', 'Tina 空閒時會做什麼？', ['She', 'watches', 'TV', 'in', 'her', 'free', 'time', '.'], ['watch', 'does', 'is'], null, 'She watches TV in her free time.〔課 p.44〕')
          ],
          recap: 'Does…? 要用 Yes, he does. 或 No, he doesn\'t. 題目要你補第二句時，第二句也要寫完。年齡要寫 years old。'
        }
      ]
    },
    {
      id: 'exam',
      icon: '📝',
      tag: '模擬考',
      name: '模擬考',
      lessons: ['聽力 A–C', '書寫 D–H', '100 分'],
      desc: '仿期中考卷的 Part A–H。四關合起來 30 題、100 分（聽力 36、書寫 64）。答對 1 題仍得 1 顆星，26 顆星一樣可以換 Switch。',
      levels: [
        {
          id: 'ex1',
          kind: 'exam',
          type: 'quiz',
          paper: true,
          icon: '🎧',
          name: '聽力 Part A–C',
          banner: '一、Listening 聽力（36 分）',
          questions: [
            examListen('A1', 'A', 3, '1. c __ n', 'coin', ['oi', 'oy'], 'coin 是 oi。〔課 p.48〕'),
            examListen('A2', 'A', 3, '2. b __', 'boy', ['oy', 'oi'], 'boy 是 oy。〔課 p.48〕'),
            examListen('A3', 'A', 3, '3. cl __ d', 'cloud', ['ou', 'ow'], 'cloud 是 ou。〔課 p.62〕'),
            examListen('A4', 'A', 3, '4. sh __ er', 'shower', ['ow', 'ou'], 'shower 是 ow。〔課 p.62〕'),
            cloze('B1', 0, 'boy', 'The boy has some soybeans and coins. 空格是 boy。〔課 p.48〕'),
            cloze('B2', 1, 'toy', 'He puts them in his toy. 空格是 toy。〔課 p.48〕'),
            cloze('B3', 2, 'clown', 'Shout out to the clown now! 空格是 clown。〔課 p.62〕'),
            cloze('B4', 3, 'crowd', 'Look how he bounces around the crowd. 空格是 crowd。〔課 p.62〕'),
            numPic('C1', '1', '⏰', '起床', '第 1 句：He gets up at six thirty.〔習 p.30〕'),
            numPic('C2', '2', '🏫', '上學', '第 2 句：They go to school at seven thirty.〔習 p.30〕'),
            numPic('C3', '3', '🍱', '吃午餐', '第 3 句：They have lunch together at twelve o\'clock.〔習 p.30〕'),
            numPic('C4', '4', '🛏️', '上床', '第 4 句：At nine thirty, Jim and Eva go to bed.〔習 p.30〕')
          ],
          recap: '聽力先聽整字或整句，再圈字母、填字庫、或給圖編號。'
        },
        {
          id: 'ex2',
          kind: 'exam',
          type: 'quiz',
          paper: true,
          icon: '✏️',
          name: '書寫 Part D–F',
          banner: '二、Writing 書寫',
          questions: [
            examSpell('D1', 'D', 4, '1. 看圖拼出這個活動。', '🏀', 'basketball', ['i', 'o', 'c'], 'basketball。中間有 ket。〔課 p.44〕'),
            examSpell('D2', 'D', 3, '2. 看圖拼出信箱上的這個國家（澳洲）。', '🇦🇺', 'Australia', ['e', 'o', 'n'], 'Australia。中間的 r 不要漏。〔課 p.56〕'),
            examSpell('D3', 'D', 3, '3. 看圖拼出這個作息。', '🚿', 'shower', ['u', 'i', 'a'], 'shower。〔課 p.58〕'),
            examChoice('E1', 'E', 3, '1. What time ___ Santa go home?', ['does', 'do', 'is'], 'What time does Santa go home?〔課 p.56〕'),
            examChoice('E2', 'E', 3, '2. He ___ an ice bath in his free time.', ['takes', 'take', 'taking'], 'He takes an ice bath.〔課 p.56〕'),
            examChoice('E3', 'E', 2, '3. I get up ___ six thirty.', ['at', 'on', 'in'], 'I get up at six thirty. 時間前面用 at。〔課 p.58〕'),
            examChoice('E4', 'E', 2, '4. I play baseball ___ weekends.', ['on', 'in', 'at'], 'I play baseball on weekends.〔課 p.42〕'),
            examSentence('F1', 'F', 5, '1. 重組句子。Tina 空閒時會做什麼？注意第一個字的大寫和問號。', ['What', 'does', 'Tina', 'do', 'in', 'her', 'free', 'time', '?'], ['is'], null, 'What does Tina do in her free time?〔課 p.44〕'),
            examSentence('F2', 'F', 4, '2. 重組句子。你幾點起床？注意第一個字的大寫和問號。', ['What', 'time', 'do', 'you', 'get', 'up', '?'], ['does', 'goes'], null, 'What time do you get up?〔課 p.58〕')
          ],
          recap: '拼字看中間和字尾。選擇題看 do/does、at、on weekends。重組要有大寫和標點。'
        },
        {
          id: 'ex3',
          kind: 'exam',
          type: 'quiz',
          paper: true,
          icon: '📊',
          name: '閱讀 Part G',
          banner: 'Part G：根據圖表回答問題。（22 分）',
          board: CHART,
          questions: [
            examSpell('G1', 'G', 4, '1. Bella 做哪一個活動？看表格拼出來（不是 basketball）。', '⚾', 'baseball', ['k', 't'], 'Bella 在 play baseball 那一列。〔習 p.24〕', true),
            examChoice('G2', 'G', 2, '2. play baseball 是哪一個代號？', ['G', 'B', 'C'], 'G 是 play baseball。B 是 play basketball，不要看錯。', true),
            examTf('G3', 'G', 3, '3. Bella plays basketball.', false, 'Bella 打的是 baseball，所以這句不對。〔習 p.24〕', true),
            examTf('G4', 'G', 3, '4. There are 21 people in the chart.', false, '3+6+4+1+2+1+5=22，不是 21。每一列都要加。〔習 p.24〕', true),
            examSentence('G5', 'G', 5, '5. 看上面的圖表。Lucas 空閒時會去慢跑嗎？如果不會，用完整的句子寫出他真正做的活動。', ['No,', 'he', "doesn't", '.', 'He', 'watches', 'TV', '.'], ['does', 'not', 'is', 'plays'], [['No,', 'he', 'does', 'not', '.', 'He', 'watches', 'TV', '.']], 'Lucas 在 watch TV。No, he doesn\'t. He watches TV.〔習 p.24〕', true),
            examSentence('G6', 'G', 5, '6. 看上面的圖表。Connie 空閒時會做什麼？用完整的句子回答。', ['She', 'rides', 'a', 'bike', 'in', 'her', 'free', 'time', '.'], ['ride', 'does', 'is'], null, 'Connie 在 ride a bike。She rides a bike in her free time.〔習 p.24〕', true)
          ],
          recap: '看名字在哪一列。basketball 和 baseball 不一樣。人數要把每一列加總。'
        },
        {
          id: 'ex4',
          kind: 'exam',
          type: 'quiz',
          paper: true,
          icon: '🖼️',
          name: '看圖 Part H',
          banner: 'Part H：看圖，圈出正確的字，再用完整的句子回答。（13 分）',
          scenes: [
            { who: 'Joy', icon: '⏰', h: 8, m: 0, cap: 'get up' },
            { who: 'Jim', icon: '🏀', h: 5, m: 0, cap: 'basketball' },
            { who: 'Eva', icon: '🚿', h: 4, m: 30, cap: 'shower' }
          ],
          questions: [
            examForm('H1', 5, '1. Joy 幾點起床？先選 do 或 does，再用字卡排成她的回答。', ['does', 'do'], ['She', 'gets', 'up', 'at', 'eight', "o'clock", '.'], ['get', 'do', 'is'], null, 'What time does Joy get up? She gets up at eight o\'clock.〔課 p.54〕', true),
            examForm('H2', 4, '2. Jim 五點會打籃球嗎？先選 play 或 plays，再用字卡排成回答。', ['play', 'plays'], ['Yes,', 'he', 'does', '.'], ['is', 'plays', 'No,'], null, 'Does 後面用原形 play。Yes, he does. He plays basketball at five.〔習 p.30〕'),
            examForm('H3', 4, '3. Jim 正在打籃球。先選 plays 或 playing，再用字卡排成句子。', ['playing', 'plays'], ['He', 'is', 'playing', 'basketball', '.'], ['plays', 'does', "He's"], [['He\'s', 'playing', 'basketball', '.']], '有 is，要用 playing。He is playing basketball. 這句是和 plays 對比的加強題。', true)
          ],
          recap: 'What time does…? Does 後面用原形。有 is 就用 -ing。完整句要有句號。'
        }
      ]
    }
  ];

  function q(id, ask, stem, opts, why, infer) {
    return { id: id, q: ask, stem: stem, opts: opts, why: why, infer: !!infer };
  }
  function listen(id, ask, stem, say, opts, why) {
    return { id: id, mode: 'listen', q: ask, stem: stem, say: say, opts: opts, why: why };
  }
  function pic(id, say, opts, why) {
    return { id: id, mode: 'listen', q: '聽句子，點出對的圖。', say: say, opts: opts, why: why, big: true };
  }
  function clockQ(id, say, clocks, why) {
    return { id: id, mode: 'listen', q: '聽時間，點出時鐘。', say: say, clocks: clocks, why: why };
  }
  function spell(id, ask, art, answer, extra, why) {
    return { id: id, mode: 'spell', q: '看提示，用字母卡拼出單字。', stem: ask, art: art, answer: answer, extra: extra, why: why };
  }
  function sentence(id, ask, stem, tokens, extra, also, why, passage, infer) {
    var accept = [tokens].concat(also || []);
    return { id: id, mode: 'sentence', q: ask, stem: stem, tokens: tokens, extra: extra, accept: accept, why: why, passage: passage || '', infer: !!infer };
  }
  function tf(id, ask, stem, yes, why, passage, infer) {
    return {
      id: id, q: ask, stem: stem, passage: passage || '',
      opts: yes ? ['T', 'F'] : ['F', 'T'],
      why: why, infer: !!infer
    };
  }
  function examListen(id, part, points, prompt, say, opts, why) {
    return { id: id, part: part, points: points, mode: 'listen', prompt: prompt, stem: prompt, say: say, opts: opts, why: why, q: prompt };
  }
  function cloze(id, slot, answer, why) {
    return {
      id: id, part: 'B', points: 3, mode: 'cloze', group: 'passageB', slot: slot, answer: answer, why: why,
      prompt: '短文第 ' + (slot + 1) + ' 格',
      say: "The boy has some soybeans and coins. He puts them in his toy. Oh, no! It makes a big noise! Shout out! Shout out to the clown now! Look how he bounces around the crowd.",
      passage: 'The ___ has some soybeans and coins. He puts them in his ___. Shout out to the ___ now! Look how he bounces around the ___.',
      bank: ['boy', 'toy', 'clown', 'crowd', 'noise', 'cloud', 'oil', 'house']
    };
  }
  function numPic(id, n, art, label, why) {
    return {
      id: id, part: 'C', points: 3, mode: 'number', group: 'picsC', answer: n, art: art, label: label, why: why,
      prompt: label,
      say: "Number one. He gets up at six thirty. Number two. They go to school at seven thirty. Number three. They have lunch together at twelve o'clock. Number four. At nine thirty, Jim and Eva go to bed."
    };
  }
  function examSpell(id, part, points, prompt, art, answer, extra, why, infer) {
    return { id: id, part: part, points: points, mode: 'spell', prompt: prompt, stem: prompt, art: art, answer: answer, extra: extra, why: why, infer: !!infer, q: prompt };
  }
  function examChoice(id, part, points, stem, opts, why, infer) {
    return { id: id, part: part, points: points, mode: 'choice', prompt: stem, stem: stem, opts: opts, why: why, infer: !!infer, q: stem };
  }
  function examTf(id, part, points, stem, yes, why, infer) {
    return {
      id: id, part: part, points: points, mode: 'choice', prompt: stem, stem: stem, infer: !!infer, why: why, q: stem,
      opts: yes ? ['T', 'F'] : ['F', 'T']
    };
  }
  function examSentence(id, part, points, prompt, tokens, extra, also, why, infer) {
    return {
      id: id, part: part, points: points, mode: 'sentence', prompt: prompt, stem: prompt, q: prompt,
      tokens: tokens, extra: extra, accept: [tokens].concat(also || []), why: why, infer: !!infer
    };
  }
  function examForm(id, points, stem, choices, tokens, extra, also, why, infer) {
    return {
      id: id, part: 'H', points: points, mode: 'form', prompt: stem, stem: stem, q: stem,
      choices: choices, tokens: tokens, extra: extra, accept: [tokens].concat(also || []),
      why: why, infer: !!infer
    };
  }
})();
