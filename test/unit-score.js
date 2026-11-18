'use strict';

/* 證明：清除星星不會把已用的計分次數還原成 3 次。
   執行：node test/unit-score.js */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
require(path.join(root, 'assets/unit-score.js'));
const S = global.UnitScore;

const IDS = ['lv1', 'lv2', 'lv3', 'lv4'];
const ISO = '2026-11-12';

function finishRun(state, total) {
  let s = state;
  let last = null;
  IDS.forEach((id, i) => {
    const stars = i === IDS.length - 1 ? total : 0;
    last = S.commitLevel(s, { levelId: id, stars: stars, levelIds: IDS, iso: ISO });
    assert.strictEqual(last.wrote, true, 'a scored run should write each new level');
    s = last.state;
  });
  assert.strictEqual(last.completed, true);
  assert.strictEqual(last.state.scores[last.state.scores.length - 1], total);
  return last.state;
}

function testThreeScoresStayUsed() {
  const box = S.memoryStorage();
  let state = S.emptyState();
  state = finishRun(state, 10);
  state = finishRun(state, 20);
  state = finishRun(state, 28);
  assert.strictEqual(state.scores.length, 3);
  assert.ok(state.rewards.reward1);
  state.run = { levels: { lv1: 4 } };
  S.save('science-ch3', 'acids', state, box);

  const otherRaw = JSON.stringify({
    scores: [30],
    rewards: { reward1: '2026-01-02', reward2: '2026-01-03' },
    run: { levels: { lv1: 7 } }
  });
  const otherKey = S.storageKey('science-ch3', 'other');
  const chapterKey = S.storageKey('social-g5', 'acids');
  box.setItem(otherKey, otherRaw);
  box.setItem(chapterKey, otherRaw);

  S.clear('science-ch3', 'acids', box);

  const after = S.load('science-ch3', 'acids', box);
  assert.deepStrictEqual(after.scores, [0, 0, 0]);
  assert.notStrictEqual(after.scores.length, 0);
  assert.strictEqual(S.attemptsUsed(after), 3);
  assert.strictEqual(S.attemptsLeft(after), 0);
  assert.strictEqual(S.isPractice(after), true);
  assert.strictEqual(S.best(after), 0);
  assert.deepStrictEqual(after.rewards, {});
  assert.strictEqual(after.run, null);
  assert.strictEqual(box.getItem(otherKey), otherRaw);
  assert.strictEqual(box.getItem(chapterKey), otherRaw);

  let practice = after;
  IDS.forEach(id => {
    const step = S.commitLevel(practice, { levelId: id, stars: 30, levelIds: IDS, iso: ISO });
    assert.strictEqual(step.wrote, false);
    assert.strictEqual(step.practice, true);
    assert.strictEqual(step.completed, false);
    assert.deepStrictEqual(step.unlocked, []);
    assert.strictEqual(step.state.scores.length, 3);
    practice = step.state;
  });
  S.save('science-ch3', 'acids', practice, box);
  const saved = S.load('science-ch3', 'acids', box);
  assert.deepStrictEqual(saved.scores, [0, 0, 0]);
  assert.strictEqual(S.attemptsUsed(saved), 3);
  assert.deepStrictEqual(saved.rewards, {});
  assert.strictEqual(box.getItem(otherKey), otherRaw);
}

function testOneScoreLeavesTwoChances() {
  const box = S.memoryStorage();
  let state = finishRun(S.emptyState(), 27);
  assert.ok(state.rewards.reward1);
  assert.ok(!state.rewards.reward2);
  state.run = { levels: { lv1: 2, lv2: 3 } };
  S.save('social-ch3', 'rice', state, box);

  S.clear('social-ch3', 'rice', box);
  const after = S.load('social-ch3', 'rice', box);
  assert.deepStrictEqual(after.scores, [0]);
  assert.strictEqual(S.attemptsUsed(after), 1);
  assert.strictEqual(S.attemptsLeft(after), 2);
  assert.notStrictEqual(S.attemptsLeft(after), 3);
  assert.strictEqual(S.isPractice(after), false);
  assert.strictEqual(S.best(after), 0);
  assert.deepStrictEqual(after.rewards, {});
  assert.strictEqual(after.run, null);

  const again = finishRun(after, 10);
  assert.deepStrictEqual(again.scores, [0, 10]);
  assert.strictEqual(S.attemptsLeft(again), 1);
  assert.strictEqual(S.best(again), 10);
  assert.deepStrictEqual(again.rewards, {});

  const qualifying = finishRun(again, 30);
  assert.strictEqual(qualifying.scores.length, 3);
  assert.strictEqual(S.attemptsLeft(qualifying), 0);
  assert.strictEqual(S.best(qualifying), 30);
  assert.ok(qualifying.rewards.reward1);
  assert.ok(qualifying.rewards.reward2);

  const blocked = S.commitLevel(qualifying, { levelId: 'lv1', stars: 30, levelIds: IDS, iso: ISO });
  assert.strictEqual(blocked.wrote, false);
  assert.strictEqual(blocked.state.scores.length, 3);
}

function testTwoScoresLeaveOneChance() {
  const box = S.memoryStorage();
  let state = finishRun(S.emptyState(), 18);
  state = finishRun(state, 22);
  S.save('science-ch4', 'force', state, box);
  S.clear('science-ch4', 'force', box);
  const after = S.load('science-ch4', 'force', box);
  assert.deepStrictEqual(after.scores, [0, 0]);
  assert.strictEqual(S.attemptsLeft(after), 1);
  assert.strictEqual(S.attemptsUsed(after), 2);
}

function testRunOnlyDoesNotSpendAnAttempt() {
  const box = S.memoryStorage();
  const state = S.emptyState();
  state.run = { levels: { lv1: 4 } };
  state.rewards.reward1 = '2026-03-01';
  S.save('science-ch4', 'mid', state, box);
  S.clear('science-ch4', 'mid', box);
  assert.strictEqual(box.getItem(S.storageKey('science-ch4', 'mid')), null);
  const after = S.load('science-ch4', 'mid', box);
  assert.strictEqual(S.attemptsLeft(after), S.ATTEMPT_LIMIT);
  assert.strictEqual(after.run, null);
  assert.deepStrictEqual(after.rewards, {});
}

function testPreviewDoesNotWrite() {
  const box = S.memoryStorage();
  const key = S.storageKey('social-g5', 'preview');
  box.setItem(key, 'leave-me');
  const view = S.previewView(ISO);
  assert.strictEqual(view.write, false);
  assert.strictEqual(view.preview, true);
  assert.strictEqual(view.iso, ISO);
  assert.strictEqual(view.dateLabel, '預覽，不會記成已獲得');
  assert.strictEqual(box.getItem(key), 'leave-me');
  assert.strictEqual(S.earned(S.load('social-g5', 'preview', box), 'reward1'), false);
  assert.strictEqual(S.earned(S.load('social-g5', 'preview', box), 'reward2'), false);

  ['social-ch3', 'social-g5', 'science-ch3', 'science-ch4', 'english-u34'].forEach(unit => {
    const src = fs.readFileSync(path.join(root, unit, 'game.js'), 'utf8');
    const start = src.indexOf('function showRewardCard');
    const end = src.indexOf('function renderRewards');
    assert.ok(start > 0 && end > start, unit);
    const fn = src.slice(start, end);
    assert.ok(fn.includes('if (preview) S.previewView(S.todayISO())'), unit);
    assert.ok(!fn.includes('saveScore'), unit);
    assert.ok(!fn.includes('S.save('), unit);
    assert.ok(src.includes('preview: true'), unit);
  });
}

function testCopyAndSubjectLinks() {
  const dialog = '這一單元的星星和獎勵卡日期會清掉。用過的計分次數不會回來，不能清掉後再重新計分 3 次。其他單元不會動。';
  ['social-ch3', 'social-g5', 'science-ch3', 'science-ch4', 'english-u34'].forEach(unit => {
    const html = fs.readFileSync(path.join(root, unit, 'index.html'), 'utf8');
    const js = fs.readFileSync(path.join(root, unit, 'game.js'), 'utf8');
    assert.ok(!html.includes('回學習島'), unit);
    assert.ok(html.includes('id="homeBtn"'), unit);
    ['../assets/gate.js', 'style.css', '../assets/unit-score.js', 'data.js', 'game.js'].forEach(file => {
      assert.ok(html.includes(file + '?v=20261118e'), unit + ' ' + file);
    });
    const subject = unit.startsWith('social-') ? 'social' : (unit.startsWith('science-') ? 'science' : 'english');
    const subjectHash = '../#/' + subject;
    ['social', 'science', 'english'].forEach(s => {
      if (s !== subject) assert.ok(!html.includes('#/' + s), unit + ' should not link to ' + s);
    });
    const lobbyEnd = html.indexOf('id="lesson"') > 0 && unit === 'social-ch3'
      ? html.indexOf('id="lesson"')
      : html.indexOf('id="unit"');
    const lobby = html.slice(html.indexOf('id="lobby"'), lobbyEnd);
    const deeper = html.slice(lobbyEnd);
    assert.ok(lobby.includes('href="' + subjectHash + '">⬅ 回科目</a>'), unit + ' lobby');
    assert.ok(!lobby.includes('回課程'), unit + ' lobby is 回科目');
    assert.strictEqual((lobby.match(/⬅ 回科目/g) || []).length, 1, unit + ' lobby');
    assert.deepStrictEqual(html.match(/href="\.\.\/[^"]*"/g) || [], ['href="' + subjectHash + '"'], unit + ' only the lobby links upward');
    assert.ok(!deeper.includes('#/social') && !deeper.includes('#/science') && !deeper.includes('#/english'), unit + ' deeper screens stay in the unit');
    assert.ok(!deeper.includes('回課程') && !deeper.includes('回科目'), unit + ' deeper labels name the next level up');
    assert.ok(html.includes('id="resetBtn">🧹 清除星星紀錄</button>\n    <button type="button" class="px-btn wood notes-btn" id="unitBackBtn">⬅ 回單元</button>'), unit);
    if (unit === 'social-ch3') {
      const lesson = html.slice(html.indexOf('id="lesson"'), html.indexOf('id="unit"'));
      assert.ok(lesson.includes('id="lessonBackBtn">⬅ 回單元</button>'), 'lesson screen');
      assert.ok(!lesson.includes('回第三課'), 'lesson screen');
      assert.ok(js.includes("if (lessonBackBtn) lessonBackBtn.addEventListener('click', () => {\n  Sound.click();\n  renderLobby();\n});"), 'lesson back uses the lobby navigation');
      assert.ok(js.includes("if (unitBack) unitBack.textContent = curLesson ? '⬅ 回' + curLesson.tag : '⬅ 回單元';"), 'lesson units name the lesson');
      assert.ok(js.includes("if (unitBackBtn) unitBackBtn.addEventListener('click', () => {\n  Sound.click();\n  if (curLesson) openLesson(curLesson);\n  else renderLobby();\n});"), 'unit back is one level up');
    } else {
      assert.ok(js.includes("if (unitBackBtn) unitBackBtn.addEventListener('click', () => { Sound.click(); renderLobby(); });"), unit + ' unit back returns to the chapter lobby');
    }
    assert.ok(js.includes(dialog), unit);
    assert.ok(!js.includes('3 次分數'), unit);
    assert.ok(js.includes("{label: '📋 回小單元', value: 'unit', cls: 'stone'}"), unit);
    assert.ok(js.includes("{label: '📋 回小單元', value: 'unit', cls: 'wood'}"), unit);
    assert.ok(!js.includes("{label: '📋 回單元'"), unit + ' small-unit back button is 回小單元');
    assert.ok(js.includes("{label: '⬅ 回單元', value: 'lobby', cls: 'wood'}"), unit);
    assert.ok(js.includes("else if (v === 'lobby') renderLobby();"), unit);
    assert.ok(!js.includes("location.href = '../'"), unit + ' finish dialog stays in the unit');
    const finish = js.slice(js.indexOf('async function finishLevel'), js.indexOf('function makeDraggable'));
    const labels = [...finish.matchAll(/label: '([^']+)'/g)].map(m => m[1]);
    assert.strictEqual(new Set(labels).size, labels.length, unit + ' finish labels ' + labels.join(' | '));
    const rewardAt = finish.indexOf('for (const id of result.unlocked)');
    const lobbyAt = finish.indexOf("v === 'lobby'");
    assert.ok(rewardAt > 0 && lobbyAt > rewardAt, unit + ' shows a new reward card before leaving');
  });

  const hub = fs.readFileSync(path.join(root, 'assets/hub.js'), 'utf8');
  assert.ok(hub.includes("id === 'subjects'"));
  assert.ok(hub.includes('function showSubjects'));
  assert.ok(hub.includes('function showChapters'));
  assert.ok(hub.includes('if (id) showChapters(id);'));
  assert.ok(hub.includes("location.pathname + location.search + '#/subjects'"));
  assert.ok(hub.includes('showSubjects();'));
  const hubPage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(hubPage.includes('id="subjectBack"') && hubPage.includes('⬅ 回科目'));
  ['assets/gate.js', 'assets/hub.css', 'assets/hub.js'].forEach(file => {
    assert.ok(hubPage.includes(file + '?v=20261118e'), 'hub ' + file);
  });
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  assert.ok(readme.includes('?v=20261118e') && readme.includes('每次發佈'), 'readme tells you to bump the asset version');
  assert.strictEqual(S.ATTEMPT_LIMIT, 3);
  assert.strictEqual(S.NEED_MINUTES_30, 26);
  assert.strictEqual(S.NEED_MINUTES_60, 30);
  assert.strictEqual(S.STAR_MAX, 30);
  ['social-ch3', 'social-g5', 'science-ch3', 'science-ch4', 'english-u34'].forEach(unit => {
    const js = fs.readFileSync(path.join(root, unit, 'game.js'), 'utf8');
    assert.ok(js.includes("document.addEventListener('el-scores-ready', refreshAfterScores);"), unit);
  });
  const english = fs.readFileSync(path.join(root, 'english-u34/game.js'), 'utf8');
  assert.ok(english.includes('st.examBest = n'), 'a finished mock exam stores examBest');
  const parentPage = fs.readFileSync(path.join(root, 'parent/index.html'), 'utf8');
  ['../assets/gate.js', '../assets/hub.css', 'parent.css', '../assets/unit-score.js', 'parent.js'].forEach(file => {
    assert.ok(parentPage.includes(file + '?v=20261118e'), 'parent ' + file);
  });
  assert.ok(parentPage.includes('⬅ 回學習島'));
}

function cloudBox(initial) {
  const local = S.memoryStorage();
  const cloud = JSON.parse(JSON.stringify(initial || {}));
  local.cloudGet = (chapter, unitId) => {
    const key = chapter + '/' + unitId;
    return cloud[key] ? JSON.parse(JSON.stringify(cloud[key])) : null;
  };
  local.cloudSet = (chapter, unitId, state) => {
    const key = chapter + '/' + unitId;
    const prev = cloud[key];
    if (prev && state.scores.length < prev.scores.length) {
      throw new Error('attempts decreased');
    }
    cloud[key] = JSON.parse(JSON.stringify(S.normalize(state)));
  };
  local.cloudDump = () => cloud;
  return local;
}

function testIgnoresOldLocalKey() {
  const box = S.memoryStorage();
  box.setItem('el-score-v2:science-ch3:u1', JSON.stringify({
    scores: [30, 30, 30],
    rewards: { reward1: '2026-01-01' },
    run: null
  }));
  const loaded = S.load('science-ch3', 'u1', box);
  assert.deepStrictEqual(loaded.scores, []);
  assert.strictEqual(S.attemptsUsed(loaded), 0);
  assert.ok(S.storageKey('science-ch3', 'u1').indexOf('el-score-v2') !== 0);
  assert.ok(S.storageKey('science-ch3', 'u1', 'uid').indexOf('el-score-v3:uid:') === 0);
}

function testCloudAttemptsSurviveLocalWipe() {
  const box = cloudBox({
    'science-ch3/u1': { scores: [28, 30], rewards: { reward1: '2026-11-01', reward2: '2026-11-02' }, run: null, rev: 0 }
  });
  box.removeItem(S.storageKey('science-ch3', 'u1'));
  const loaded = S.load('science-ch3', 'u1', box);
  assert.deepStrictEqual(loaded.scores, [28, 30]);
  assert.strictEqual(S.attemptsUsed(loaded), 2);
  assert.strictEqual(S.attemptsLeft(loaded), 1);
  assert.strictEqual(S.switchMinutes(loaded), 60);

  S.clear('science-ch3', 'u1', box);
  const cleared = S.load('science-ch3', 'u1', box);
  assert.deepStrictEqual(cleared.scores, [0, 0]);
  assert.strictEqual(S.attemptsUsed(cleared), 2);
  assert.strictEqual(S.attemptsLeft(cleared), 1);
  assert.strictEqual(S.best(cleared), 0);
  assert.strictEqual(S.switchMinutes(cleared), 0);
  assert.deepStrictEqual(cleared.rewards, {});
  assert.deepStrictEqual(box.cloudDump()['science-ch3/u1'].scores, [0, 0]);

  S.save('science-ch3', 'u1', S.emptyState(), box);
  const kept = S.load('science-ch3', 'u1', box);
  assert.deepStrictEqual(kept.scores, [0, 0]);
  assert.strictEqual(S.attemptsUsed(kept), 2);

  const again = finishRun(kept, 30);
  S.save('science-ch3', 'u1', again, box);
  const third = S.load('science-ch3', 'u1', box);
  assert.deepStrictEqual(third.scores, [0, 0, 30]);
  assert.strictEqual(S.attemptsLeft(third), 0);
  assert.strictEqual(S.best(third), 30);
  assert.strictEqual(S.switchMinutes(third), 60);
}

function testCloudRejectsTamperedPrefix() {
  const box = cloudBox({
    'social-g5/u1': { scores: [10, 20], rewards: {}, run: null, rev: 0 }
  });
  S.save('social-g5', 'u1', { scores: [30, 30, 30], rewards: { reward2: '2026-11-08' }, run: null }, box);
  const loaded = S.load('social-g5', 'u1', box);
  assert.deepStrictEqual(loaded.scores, [10, 20]);
  assert.strictEqual(S.attemptsLeft(loaded), 1);
  assert.deepStrictEqual(loaded.rewards, {});
  assert.deepStrictEqual(box.cloudDump()['social-g5/u1'].scores, [10, 20]);
}

function testResetGenerationDropsStaleAttempts() {
  const box = cloudBox({
    'science-ch4/u2': { scores: [], rewards: {}, run: null, rev: 2 }
  });
  box.setItem(S.storageKey('science-ch4', 'u2'), JSON.stringify({
    scores: [30, 30, 30], rewards: { reward1: '2026-01-01', reward2: '2026-01-02' }, run: null, rev: 0
  }));
  const loaded = S.load('science-ch4', 'u2', box);
  assert.deepStrictEqual(loaded.scores, []);
  assert.strictEqual(loaded.rev, 2);
  assert.strictEqual(S.attemptsLeft(loaded), 3);
  S.save('science-ch4', 'u2', { scores: [30], rewards: {}, run: null, rev: 0 }, box);
  assert.deepStrictEqual(S.load('science-ch4', 'u2', box).scores, []);
  assert.strictEqual(box.cloudDump()['science-ch4/u2'].rev, 2);
}

function testExamBestAndSwitchMinutes() {
  assert.strictEqual(S.switchMinutes({ scores: [25], rewards: {}, run: null }), 0);
  assert.strictEqual(S.switchMinutes({ scores: [26], rewards: {}, run: null }), 30);
  assert.strictEqual(S.switchMinutes({ scores: [29], rewards: {}, run: null }), 30);
  assert.strictEqual(S.switchMinutes({ scores: [30], rewards: {}, run: null }), 60);
  const merged = S.mergeState(
    { scores: [26], rewards: {}, run: null, examBest: 80, rev: 0 },
    { scores: [26], rewards: { reward1: '2026-11-01' }, run: null, examBest: 90, rev: 0 }
  );
  assert.strictEqual(merged.examBest, 90);
  assert.ok(merged.rewards.reward1);
  const unearned = S.mergeState(
    { scores: [10, 30], rewards: { reward1: '2026-11-01', reward2: '2026-11-02' }, run: null, rev: 0 },
    { scores: [10], rewards: {}, run: null, rev: 0 }
  );
  assert.deepStrictEqual(unearned.scores, [10, 30]);
  assert.strictEqual(unearned.rewards.reward1, '2026-11-01');
  assert.strictEqual(unearned.rewards.reward2, '2026-11-02');
  const tooSoon = S.mergeState(
    { scores: [26], rewards: { reward2: '2026-11-02' }, run: null, rev: 0 },
    { scores: [26], rewards: {}, run: null, rev: 0 }
  );
  assert.ok(!tooSoon.rewards.reward2);
  const cleared = S.mergeState(
    { scores: [0], rewards: {}, run: null, examBest: 80, rev: 0 },
    { scores: [26], rewards: { reward1: '2026-11-01' }, run: null, examBest: 70, rev: 0 }
  );
  assert.deepStrictEqual(cleared.scores, [0]);
  assert.deepStrictEqual(cleared.rewards, {});
  assert.strictEqual(cleared.examBest, 80);
  assert.strictEqual(S.attemptsUsed(cleared), 1);
  const payload = S.toCloud('english-u34', 'exam', cleared);
  assert.strictEqual(payload.chapter + '__' + payload.unitId, S.docId('english-u34', 'exam'));
  assert.strictEqual(payload.examBest, 80);
  assert.strictEqual(payload.rev, 0);
  assert.ok(payload.updatedAt);
  assert.strictEqual(S.normalize({ examBest: 140, scores: [] }).examBest, 100);
  assert.strictEqual(S.normalize({ examBest: -4, scores: [] }).examBest, 0);
}

function testLoginAccountAndRules() {
  require(path.join(root, 'assets/gate.js'));
  const A = global.ELAccount;
  assert.deepStrictEqual(A.PARENT_EMAILS, [
    'ac27641101@gmail.com',
    'smc@kids.local'
  ]);
  assert.strictEqual(A.loginEmail('ysc'), 'ysc@kids.local');
  assert.strictEqual(A.loginEmail('YTC'), 'ytc@kids.local');
  assert.strictEqual(A.loginEmail('smc'), 'smc@kids.local');
  assert.strictEqual(A.loginEmail('SMC'), 'smc@kids.local');
  assert.strictEqual(A.loginEmail(' ac27641101@gmail.com '), 'ac27641101@gmail.com');
  assert.strictEqual(A.roleFromEmail('ac27641101@gmail.com'), 'parent');
  assert.strictEqual(A.roleFromEmail('smc@kids.local'), 'parent');
  assert.strictEqual(A.roleFromEmail('ysc@kids.local'), 'child');
  assert.strictEqual(A.roleFromEmail('ytc@kids.local'), 'child');
  assert.strictEqual(A.roleFromEmail('dad@kids.local'), 'child');
  assert.strictEqual(A.roleFromEmail('mom@kids.local'), 'child');
  assert.strictEqual(A.displayName('ysc', 'child'), 'ysc');
  assert.strictEqual(A.displayName('ytc', 'child'), 'ytc');
  assert.strictEqual(A.displayName('smc', 'parent'), 'smc');
  assert.strictEqual(A.displayName('ac27641101@gmail.com', 'parent'), '家長');
  const smc = A.profileFromUser({ uid: 'smc-uid', email: 'SMC@kids.local' });
  assert.strictEqual(smc.role, 'parent');
  assert.strictEqual(smc.account, 'smc');
  assert.strictEqual(smc.displayName, 'smc');
  assert.notStrictEqual(smc.role, 'child');
  assert.deepStrictEqual(A.TEST_ACCOUNTS, ['test@kids.local']);
  assert.strictEqual(A.loginEmail('test'), 'test@kids.local');
  assert.strictEqual(A.loginEmail('Test'), 'test@kids.local');
  assert.strictEqual(A.isTestAccount('test'), true);
  assert.strictEqual(A.isTestAccount('test@kids.local'), true);
  assert.strictEqual(A.isTestAccount('ysc'), false);
  assert.strictEqual(A.isTestAccount('smc@kids.local'), false);
  assert.strictEqual(A.roleFromEmail('test@kids.local'), 'child');
  assert.strictEqual(A.displayName('test', 'child'), 'test');
  const tester = A.profileFromUser({ uid: 'test-uid', email: 'Test@kids.local' });
  assert.strictEqual(tester.role, 'child');
  assert.strictEqual(tester.account, 'test');
  assert.strictEqual(tester.email, 'test@kids.local');
  const parentJs = fs.readFileSync(path.join(root, 'parent/parent.js'), 'utf8');
  assert.ok(parentJs.includes('<summary>測試帳號</summary>'));
  assert.ok(parentJs.includes('class="test-fold"'));
  assert.ok(parentJs.includes('function familySwitchMinutes'));
  assert.ok(parentJs.includes('if (isTestProfile(child)) return;'));
  assert.ok(parentJs.includes('window.ELAccount.TEST_ACCOUNTS'));
  assert.strictEqual(A.authErrorText('auth/invalid-credential'), '帳號或密碼不對喔，再試一次吧！');
  assert.strictEqual(A.authErrorText('auth/wrong-password'), '帳號或密碼不對喔，再試一次吧！');
  assert.strictEqual(A.authErrorText('auth/user-not-found'), '帳號或密碼不對喔，再試一次吧！');
  const gate = fs.readFileSync(path.join(root, 'assets/gate.js'), 'utf8');
  assert.ok(gate.includes('browserLocalPersistence'));
  assert.ok(gate.includes("html.el-locked body{visibility:hidden !important}"));
  assert.ok(!gate.includes('小朋友輸入帳號就好'));
  assert.ok(!gate.includes('class="el-hint"'));
  const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
  assert.ok(rules.includes("request.auth.token.email in ['ac27641101@gmail.com','smc@kids.local']"));
  assert.ok(!rules.includes('test@kids.local'));
  assert.ok(!rules.includes('dad@kids.local') && !rules.includes('mom@kids.local'));
  assert.ok(rules.includes('!isParent()'));
  assert.ok(rules.includes('request.resource.data.scores.size() >= resource.data.scores.size()'));
  assert.ok(rules.includes('request.resource.data.rev == resource.data.rev'));
  assert.ok(rules.includes('allow read, write: if false'));
  const hub = fs.readFileSync(path.join(root, 'assets/hub.js'), 'utf8');
  assert.ok(hub.includes("getElementById('parentLink').hidden = auth.role !== 'parent'"));
  assert.ok(hub.includes('家長頁'));
}

testThreeScoresStayUsed();
testOneScoreLeavesTwoChances();
testTwoScoresLeaveOneChance();
testRunOnlyDoesNotSpendAnAttempt();
testPreviewDoesNotWrite();
testCopyAndSubjectLinks();
testIgnoresOldLocalKey();
testCloudAttemptsSurviveLocalWipe();
testCloudRejectsTamperedPrefix();
testResetGenerationDropsStaleAttempts();
testExamBestAndSwitchMinutes();
testLoginAccountAndRules();
console.log('unit-score tests passed');
