/* 家長頁：列出每個孩子的小單元星星、次數、Switch 分鐘，以及英文模擬考 /100。 */
(function () {
  'use strict';

  var CHILDREN = [
    { account: 'ysc', email: 'ysc@kids.local' },
    { account: 'ytc', email: 'ytc@kids.local' }
  ];

  var CATALOG = [
    {
      subject: '社會',
      chapters: [
        {
          chapter: 'social-ch3',
          name: '五上社會 CH3・臺灣的物產資源',
          units: [
            { id: 'sugar', name: '蔗糖的興起', group: '第1課・豐饒的土地' },
            { id: 'variety', name: '臺灣農業的多樣性', group: '第1課・豐饒的土地' },
            { id: 'agri-future', name: '農業的挑戰與未來', group: '第1課・豐饒的土地' },
            { id: 'livestock', name: '畜牧業的發展與轉變', group: '第1課・豐饒的土地' },
            { id: 'fishery', name: '漁業的挑戰與未來', group: '第1課・豐饒的土地' },
            { id: 'forest', name: '山林資源', group: '第2課・山中的故事' },
            { id: 'forestry', name: '林場的轉型', group: '第2課・山中的故事' },
            { id: 'mineral', name: '礦物資源', group: '第2課・山中的故事' },
            { id: 'railway', name: '鐵道與聚落', group: '第2課・山中的故事' },
            { id: 'mountain-town', name: '山城新風貌', group: '第2課・山中的故事' },
            { id: 'inquiry', name: '如何讓臺灣物產資源和地方生活永續發展？', group: '探究實作' },
            { id: 'review', name: '全課總複習', group: '總複習' }
          ]
        },
        {
          chapter: 'social-g5',
          name: '五上社會 CH4・看見福爾摩沙',
          units: [
            { id: 'u1', name: '潟湖上的海上貿易' },
            { id: 'u2', name: '大航海時期來臺的人們' },
            { id: 'u3', name: '大航海時期對臺的影響' },
            { id: 'u4', name: '穿越時空遇見你' }
          ]
        }
      ]
    },
    {
      subject: '自然',
      chapters: [
        {
          chapter: 'science-ch3',
          name: '五上自然 CH3・神奇的水溶液',
          units: [
            { id: 'u1', name: '水溶液中的物質' },
            { id: 'u2', name: '水溶液的酸鹼性' },
            { id: 'u3', name: '水溶液的導電性' },
            { id: 'u4', name: '科學閱讀・總複習' }
          ]
        },
        {
          chapter: 'science-ch4',
          name: '五上自然 CH4・力與運動',
          units: [
            { id: 'u1', name: '地球引力' },
            { id: 'u2', name: '力的測量' },
            { id: 'u3', name: '摩擦力' },
            { id: 'u4', name: '自由落體・總複習' }
          ]
        }
      ]
    },
    {
      subject: '英文',
      chapters: [
        {
          chapter: 'english-u34',
          name: '五上英文 Unit 3–4 期末複習',
          units: [
            { id: 'u3', name: 'Free Time 休閒活動' },
            { id: 'u4', name: 'Daily Routines 作息時間' },
            { id: 'weak', name: '弱點加強' },
            { id: 'exam', name: '模擬考', exam: true }
          ]
        }
      ]
    }
  ];

  var knownIds = {};
  CATALOG.forEach(function (subject) {
    subject.chapters.forEach(function (chapter) {
      chapter.units.forEach(function (unit) {
        knownIds[chapter.chapter + '__' + unit.id] = true;
      });
    });
  });

  var rootEl = document.getElementById('parentRoot');
  var statusEl = document.getElementById('parentStatus');
  var demo = new URLSearchParams(location.search).get('demo') === '1';
  var viewing = [];

  function esc(value) {
    if (window.UnitScore) return UnitScore.escapeHtml(value);
    return String(value == null ? '' : value);
  }

  function setStatus(text) {
    statusEl.hidden = !text;
    statusEl.textContent = text || '';
  }

  function blank(state) {
    if (!state) return true;
    var s = UnitScore.normalize(state);
    return !s.scores.length && !s.run && !Object.keys(s.rewards).length && typeof s.examBest !== 'number';
  }

  function scoreOf(child, chapter, unitId) {
    if (!child.scores) return null;
    return child.scores[chapter + '__' + unitId] || null;
  }

  function totalMinutes(child) {
    if (!child.scores) return 0;
    return Object.keys(child.scores).reduce(function (sum, key) {
      return sum + UnitScore.switchMinutes(child.scores[key]);
    }, 0);
  }

  function examBits(child) {
    if (!child.scores) return [];
    return Object.keys(child.scores).filter(function (key) {
      return typeof UnitScore.normalize(child.scores[key]).examBest === 'number';
    }).map(function (key) {
      var raw = child.scores[key];
      var state = UnitScore.normalize(raw);
      return {
        key: key,
        label: (raw.chapter || key) + '・' + (raw.unitId || ''),
        examBest: state.examBest
      };
    });
  }

  function findUnitName(chapter, unitId) {
    var found = '';
    CATALOG.forEach(function (subject) {
      subject.chapters.forEach(function (block) {
        if (block.chapter !== chapter) return;
        block.units.forEach(function (unit) {
          if (unit.id === unitId) found = unit.name;
        });
      });
    });
    return found || unitId;
  }

  function rowHtml(child, chapter, unit, state) {
    var sum = state ? UnitScore.summarize(state) : {
      best: 0, attemptsUsed: 0, switchMinutes: 0, examBest: null
    };
    var quiet = sum.best === 0 && sum.attemptsUsed === 0 && sum.examBest == null;
    var end = '';
    if (unit.exam || sum.examBest != null) {
      end += '<span class="stat exam">' + (sum.examBest == null ? '考卷 — / 100' : '考卷 ' + sum.examBest + ' / 100') + '</span>';
    }
    if (child.uid && state && !blank(state)) {
      end += '<button type="button" class="reset-btn" data-uid="' + esc(child.uid) + '" data-chapter="' + esc(chapter) + '" data-unit="' + esc(unit.id) + '" data-name="' + esc(unit.name) + '">重置</button>';
    }
    return '<div class="score-row">' +
      '<div class="score-name">' + esc(unit.name) + '</div>' +
      '<span class="stat' + (quiet ? ' zero' : '') + '">★ ' + sum.best + ' / 30</span>' +
      '<span class="stat' + (quiet ? ' zero' : '') + '">次數 ' + sum.attemptsUsed + ' / 3</span>' +
      '<span class="stat' + (quiet ? ' zero' : '') + '">Switch ' + sum.switchMinutes + ' 分鐘</span>' +
      '<div class="row-end">' + end + '</div></div>';
  }

  function chapterHtml(child, block) {
    var html = '<section class="chapter-block"><h4>' + esc(block.name) + '</h4>';
    var lastGroup = '';
    block.units.forEach(function (unit) {
      if (unit.group && unit.group !== lastGroup) {
        lastGroup = unit.group;
        html += '<p class="group-label">' + esc(unit.group) + '</p>';
      }
      html += rowHtml(child, block.chapter, unit, scoreOf(child, block.chapter, unit.id));
    });
    html += '</section>';
    return html;
  }

  function extraHtml(child) {
    if (!child.scores) return '';
    var keys = Object.keys(child.scores).filter(function (key) { return !knownIds[key]; });
    if (!keys.length) return '';
    var html = '<section class="chapter-block"><h4>其他紀錄</h4>';
    keys.forEach(function (key) {
      var raw = child.scores[key];
      var chapter = raw.chapter || key.split('__')[0];
      var unitId = raw.unitId || key.split('__').slice(1).join('__');
      html += rowHtml(child, chapter, {
        id: unitId,
        name: findUnitName(chapter, unitId),
        exam: typeof UnitScore.normalize(raw).examBest === 'number'
      }, raw);
    });
    html += '</section>';
    return html;
  }

  function childHtml(child) {
    var exams = examBits(child);
    var html = '<section class="kid px"><div class="kid-head"><h2>' + esc(child.account) + '</h2><span class="account">' + esc(child.email || '') + '</span></div>';
    if (!child.uid) {
      html += '<p class="absent">還沒有登入過。這個帳號進學習島一次之後，這裡才看得到成績。</p></section>';
      return html;
    }
    html += '<p class="total-min">Switch 一共 <b>' + totalMinutes(child) + '</b> 分鐘</p>';
    if (exams.length) {
      html += '<p class="exam-line">' + exams.map(function (item) {
        return '模擬考最好 ' + item.examBest + ' / 100';
      }).join('　') + '</p>';
    }
    CATALOG.forEach(function (subject) {
      html += '<section class="subject-block"><h3>' + esc(subject.subject) + '</h3>';
      subject.chapters.forEach(function (block) { html += chapterHtml(child, block); });
      html += '</section>';
    });
    html += extraHtml(child);
    html += '</section>';
    return html;
  }

  function bindResets() {
    rootEl.querySelectorAll('.reset-btn').forEach(function (button) {
      button.addEventListener('click', function () {
        var uid = button.getAttribute('data-uid');
        var chapter = button.getAttribute('data-chapter');
        var unitId = button.getAttribute('data-unit');
        var name = button.getAttribute('data-name');
        var child = viewing.filter(function (item) { return item.uid === uid; })[0];
        if (!child) return;
        if (demo) {
          window.alert('這是預覽，不會真的清掉。');
          return;
        }
        var ok = window.confirm('確定要重置「' + name + '」嗎？\n星星、計分次數、Switch 分鐘和模擬考分數都會清成 0，這個小單元可以再計分 3 次。');
        if (!ok) return;
        var state = scoreOf(child, chapter, unitId) || {};
        var rev = UnitScore.normalize(state).rev + 1;
        button.disabled = true;
        var fb = window.ELFirebase;
        fb.setDoc(fb.doc(fb.db, 'users', uid, 'scores', chapter + '__' + unitId), {
          chapter: chapter,
          unitId: unitId,
          scores: [],
          rewards: {},
          run: null,
          rev: rev,
          updatedAt: new Date().toISOString()
        }).then(function () {
          child.scores[chapter + '__' + unitId] = {
            chapter: chapter, unitId: unitId, scores: [], rewards: {}, run: null, rev: rev
          };
          render(viewing);
        }).catch(function () {
          button.disabled = false;
          setStatus('沒有重置成功。請確認 Firestore 規則已經貼上並發布。');
        });
      });
    });
  }

  function render(children) {
    viewing = children;
    var parts = splitFamily(children);
    var html = '';
    if (demo) html += '<p class="demo-banner px">這是預覽資料，不是真正的成績。</p>';
    html += '<p class="family-total px">全家 Switch 一共 <b>' + familySwitchMinutes(parts.family) + '</b> 分鐘</p>';
    parts.family.forEach(function (child) { html += childHtml(child); });
    if (parts.tests.length) {
      html += '<details class="test-fold"><summary>測試帳號</summary>' +
        parts.tests.map(childHtml).join('') + '</details>';
    }
    rootEl.innerHTML = html;
    bindResets();
  }

  function demoChildren() {
    function pack(chapter, unitId, scores, extras) {
      var state = { chapter: chapter, unitId: unitId, scores: scores, rewards: {}, run: null, rev: 0 };
      if (extras) Object.keys(extras).forEach(function (key) { state[key] = extras[key]; });
      return state;
    }
    return [
      {
        account: 'ysc',
        email: 'ysc@kids.local',
        uid: 'demo-ysc',
        scores: {
          'social-ch3__sugar': pack('social-ch3', 'sugar', [18, 28], { rewards: { reward1: '2026-11-02' } }),
          'science-ch3__u1': pack('science-ch3', 'u1', [30], { rewards: { reward1: '2026-11-03', reward2: '2026-11-03' } }),
          'science-ch4__u2': pack('science-ch4', 'u2', [0, 0, 0]),
          'english-u34__exam': pack('english-u34', 'exam', [26, 22], { rewards: { reward1: '2026-11-04' }, examBest: 86 })
        }
      },
      {
        account: 'ytc',
        email: 'ytc@kids.local',
        uid: 'demo-ytc',
        scores: {
          'social-ch3__fishery': pack('social-ch3', 'fishery', [26], { rewards: { reward1: '2026-11-05' } }),
          'english-u34__u4': pack('english-u34', 'u4', [20, 24, 22]),
          'english-u34__exam': pack('english-u34', 'exam', [30], { rewards: { reward1: '2026-11-06', reward2: '2026-11-06' }, examBest: 72 })
        }
      },
      {
        account: 'test',
        email: 'test@kids.local',
        uid: 'demo-test',
        scores: {
          'science-ch3__u2': pack('science-ch3', 'u2', [30], { rewards: { reward1: '2026-11-07', reward2: '2026-11-07' } })
        }
      }
    ];
  }

  function testRoster() {
    var emails = (window.ELAccount && window.ELAccount.TEST_ACCOUNTS) || [];
    return emails.map(function (email) {
      var at = String(email).indexOf('@');
      var account = at > 0 ? String(email).slice(0, at) : String(email);
      return { account: account, email: email };
    });
  }

  function isTestProfile(profile) {
    var accounts = window.ELAccount;
    if (!profile || !accounts || typeof accounts.isTestAccount !== 'function') return false;
    return accounts.isTestAccount(profile.email) || accounts.isTestAccount(profile.account);
  }

  function splitFamily(children) {
    var family = [];
    var tests = [];
    children.forEach(function (child) {
      if (isTestProfile(child)) tests.push(child);
      else family.push(child);
    });
    return { family: family, tests: tests };
  }

  function familySwitchMinutes(children) {
    var total = 0;
    children.forEach(function (child) {
      if (isTestProfile(child)) return;
      total += totalMinutes(child);
    });
    return total;
  }

  function isParentProfile(profile) {
    var accounts = window.ELAccount;
    if (!accounts || typeof accounts.isParentEmail !== 'function') return false;
    if (accounts.isParentEmail(profile.email)) return true;
    if (accounts.isParentEmail(profile.account)) return true;
    if (profile.account && accounts.isParentEmail(profile.account + '@kids.local')) return true;
    return false;
  }

  function assemble(profiles) {
    var byAccount = {};
    profiles.forEach(function (profile) {
      if (isParentProfile(profile)) return;
      if (profile.account && !byAccount[profile.account]) byAccount[profile.account] = profile;
    });
    var seen = {};
    var list = CHILDREN.map(function (child) {
      var found = byAccount[child.account];
      if (found) {
        seen[child.account] = true;
        found.email = found.email || child.email;
        return found;
      }
      return { account: child.account, email: child.email, uid: null, scores: null };
    });
    profiles.forEach(function (profile) {
      if (isParentProfile(profile) || isTestProfile(profile)) return;
      if (!profile.account || seen[profile.account]) return;
      list.push(profile);
    });
    var tests = testRoster().map(function (child) {
      var found = byAccount[child.account];
      if (found) {
        seen[child.account] = true;
        found.email = found.email || child.email;
        return found;
      }
      return { account: child.account, email: child.email, uid: null, scores: null };
    });
    return list.concat(tests);
  }

  function loadLive() {
    var fb = window.ELFirebase;
    if (!fb) {
      setStatus('登入服務還沒準備好，請重新整理。');
      return;
    }
    setStatus('正在讀取成績…');
    fb.getDocs(fb.query(fb.collection(fb.db, 'users'), fb.where('role', '==', 'child'))).then(function (snap) {
      var profiles = [];
      snap.forEach(function (docSnap) {
        var data = docSnap.data() || {};
        profiles.push({
          uid: docSnap.id,
          account: data.account || '',
          email: data.email || '',
          scores: {}
        });
      });
      return Promise.all(profiles.map(function (profile) {
        return fb.getDocs(fb.collection(fb.db, 'users', profile.uid, 'scores')).then(function (scores) {
          scores.forEach(function (scoreSnap) {
            var data = scoreSnap.data() || {};
            var parts = scoreSnap.id.split('__');
            var chapter = data.chapter || parts[0];
            var unitId = data.unitId || parts.slice(1).join('__');
            profile.scores[chapter + '__' + unitId] = data;
          });
          return profile;
        });
      }));
    }).then(function (profiles) {
      setStatus('');
      render(assemble(profiles || []));
    }).catch(function (err) {
      var code = String(err && err.code || '');
      if (code.indexOf('permission') !== -1) {
        setStatus('讀不到成績。請到 Firebase 主控台的 Firestore「規則」貼上專案裡的 firestore.rules，然後發布。');
      } else {
        setStatus('讀取成績時網路中斷了，請再試一次。');
      }
    });
  }

  function start(auth) {
    if (!auth || auth.role !== 'parent') {
      rootEl.innerHTML = '<section class="kid px"><p class="absent">這個頁面只有家長可以看。</p></section>';
      return;
    }
    loadLive();
  }

  document.getElementById('parentLogout').addEventListener('click', function () {
    if (window.ELSignOut) window.ELSignOut();
  });

  if (demo) {
    render(demoChildren());
    return;
  }
  if (window.ELAuth) start(window.ELAuth);
  document.addEventListener('el-auth', function (event) {
    start(event.detail || window.ELAuth);
  });
})();
