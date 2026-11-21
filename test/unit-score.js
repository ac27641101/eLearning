'use strict';

/* 證明：清除星星不會把已用的計分次數還原成 3 次。
   執行：node test/unit-score.js */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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
    const versions = {
      '../assets/gate.js': '20261121a',
      'style.css': '20261121b',
      '../assets/unit-score.js': '20261119c',
      '../assets/reward-approve.js': '20261121a',
      'data.js': '20261119c',
      'game.js': '20261121a'
    };
    Object.keys(versions).forEach(file => {
      assert.ok(html.includes(file + '?v=' + versions[file]), unit + ' ' + file);
    });
    assert.ok(js.includes('ELApprove.voucherDecor'), unit);
    assert.ok(js.includes('ELApprove.attach'), unit);
    assert.ok(!js.includes('爸爸簽名'), unit);
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
    assert.ok(html.includes('id="unitBackBtn">⬅ 回單元</button>\n    <button class="px-btn wood reset-dock" id="resetBtn">🧹 清除星星紀錄</button>'), unit);
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
  assert.ok(hubPage.includes('id="subjectBack"') && hubPage.includes('⬅ 回全部科目'));
  assert.ok(hubPage.includes('assets/gate.js?v=20261121a'), 'hub gate');
  ['assets/hub.css', 'assets/hub.js'].forEach(file => {
    assert.ok(hubPage.includes(file + '?v=20261119e'), 'hub ' + file);
  });
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  assert.ok(readme.includes('?v=20261121a') && readme.includes('每次發佈'), 'readme tells you to bump the asset version');
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
  assert.ok(parentPage.includes('../assets/gate.js?v=20261121a'), 'parent gate');
  assert.ok(parentPage.includes('../assets/reward-approve.js?v=20261121a'), 'parent approve');
  assert.ok(parentPage.includes('parent.css?v=20261121a'), 'parent css');
  assert.ok(parentPage.includes('parent.js?v=20261121a'), 'parent js');
  ['../assets/hub.css', '../assets/unit-score.js'].forEach(file => {
    assert.ok(parentPage.includes(file + '?v=20261119d'), 'parent ' + file);
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
  assert.ok(!gate.includes('placeholder='));
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

function testLevelMarkAndReview() {
  const running = S.emptyState();
  running.run = { levels: { lv1: 7 } };
  assert.strictEqual(S.levelMark(running, 'lv1'), '這次 ★ 7');
  assert.strictEqual(S.levelMark(running, 'lv2', { stars: 8, max: 10 }), '這次還沒玩');

  const done = S.emptyState();
  done.scores = [29];
  assert.strictEqual(done.run, null);
  assert.strictEqual(S.levelMark(done, 'lv1', null), '還沒有每關紀錄');
  assert.strictEqual(S.levelMark(done, 'lv1', { stars: 7, max: 8 }), '上次 ★ 7 / 8');
  assert.strictEqual(S.levelMark(done, 'lv1', { stars: 4, max: 0, wrong: [{ q: '題', a: '錯', c: '對' }] }), '還沒有每關紀錄');
  const partial = S.memoryStorage();
  S.saveReviewLevel('social-ch3', 'sugar', 'hand', {
    stars: 8, max: 8, wrong: [{ q: '舊題', a: '舊答', c: '對' }], at: '2026-11-01'
  }, partial);
  S.saveReviewLevel('social-ch3', 'sugar', 'hand', {
    wrong: [{ q: '新題', a: '新答', c: '對' }], at: '2026-11-02', commitStars: false
  }, partial);
  const kept = S.loadReview('social-ch3', 'sugar', partial).levels.hand;
  assert.strictEqual(kept.stars, 8);
  assert.strictEqual(kept.max, 8);
  assert.strictEqual(kept.wrong[0].q, '新題');
  assert.strictEqual(S.levelMark(S.emptyState(), 'hand', kept), '上次 ★ 8 / 8');

  const practice = S.emptyState();
  practice.scores = [1, 1, 1];
  assert.strictEqual(S.isPractice(practice), true);
  assert.strictEqual(S.levelMark(practice, 'lv1', { stars: 6, max: 8 }), '練習・上次 ★ 6 / 8');
  assert.strictEqual(S.levelMark(practice, 'lv1', null), '練習');

  const box = S.memoryStorage();
  const scoreKey = S.storageKey('science-ch3', 'u1');
  S.save('science-ch3', 'u1', { scores: [29], rewards: {}, run: null }, box);
  const before = box.getItem(scoreKey);
  const tally = S.createTally();
  S.noteWrong(tally, 'q1');
  S.rememberWrong(tally, { id: 'q1', q: '題目很長'.repeat(80), a: '孩子的答案', c: '正確答案' });
  S.noteRight(tally, 'q2');
  S.saveReviewLevel('science-ch3', 'u1', 'lv1', {
    stars: 7, max: 8, wrong: S.wrongList(tally), at: '2026-11-19'
  }, box);
  assert.strictEqual(box.getItem(scoreKey), before);
  const review = S.loadReview('science-ch3', 'u1', box);
  assert.strictEqual(review.levels.lv1.stars, 7);
  assert.strictEqual(review.levels.lv1.max, 8);
  assert.strictEqual(review.levels.lv1.wrong.length, 1);
  assert.strictEqual(review.levels.lv1.wrong[0].a, '孩子的答案');
  assert.ok(review.levels.lv1.wrong[0].q.length <= 200);
  const cloud = S.toReviewCloud('science-ch3', 'u1', review);
  assert.strictEqual(cloud.chapter + '__' + cloud.unitId, S.docId('science-ch3', 'u1'));
  assert.ok(cloud.updatedAt);
  assert.ok(!cloud.scores);
  const html = S.reviewBodyHtml(review.levels.lv1);
  assert.ok(html.includes('上次這關錯了 1 題'));
  assert.ok(html.includes('你的答案'));
  assert.ok(html.includes('正確答案'));
  assert.ok(S.reviewBodyHtml({ stars: 8, max: 8, wrong: [] }).includes('上次全對！'));
  assert.ok(S.reviewBodyHtml({ stars: 4, max: 8, wrong: [{ q: '題', a: '錯', c: '對' }] }, { current: true }).includes('這次這關錯了 1 題'));
  assert.ok(S.reviewBodyHtml({ stars: 8, max: 8, wrong: [] }, { current: true }).includes('這次全對！'));
  assert.strictEqual(S.showGlyph('📅'), '🌾');
  assert.strictEqual(S.showGlyph('🗓️'), '🌾');
  assert.deepStrictEqual(S.parseScreenHash('#/lesson/land/unit/sugar/play'), { lesson: 'land', unit: 'sugar', play: true });
  assert.strictEqual(S.screenHash({ lesson: 'land', unit: 'sugar' }), '#/lesson/land/unit/sugar');
  assert.deepStrictEqual(S.parseScreenHash(S.screenHash({ lesson: 'land', unit: 'sugar', play: true })), { lesson: 'land', unit: 'sugar', play: true });
  assert.ok(fs.readFileSync(path.join(root, 'english-u34/game.js'), 'utf8').includes('q.stem || q.q'));
  assert.ok(fs.readFileSync(path.join(root, 'english-u34/game.js'), 'utf8').includes('正確拼法：'));
  const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
  assert.ok(rules.includes('match /reviews/{reviewId}'));
  assert.ok(rules.includes('reviewId == request.resource.data.chapter + \'__\' + request.resource.data.unitId'));
  assert.ok(rules.includes('request.resource.data.levels.size() <= 8'));
  const scoreRules = rules.slice(rules.indexOf('match /scores/{scoreId}'), rules.indexOf('match /reviews/{reviewId}'));
  assert.ok(scoreRules.includes('childScoreWrite'));
  assert.ok(scoreRules.includes('validShape(scoreId)'));
}

function loadChapterUnits(dir) {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root, dir, 'data.js'), 'utf8'), ctx, { filename: dir + '/data.js' });
  return JSON.parse(JSON.stringify(ctx.window.UNITS));
}

function testNewSubjects() {
  require(path.join(root, 'assets/subject-play.js'));
  const P = global.SubjectPlay;
  assert.ok(P, 'subject-play exports SubjectPlay');
  assert.strictEqual(P.valuesEqual('9/12', '3/4'), true);
  assert.strictEqual(P.valuesEqual('6/8', '3/4'), true);
  assert.strictEqual(P.valuesEqual('3/2', '1又1/2'), true);
  assert.strictEqual(P.valuesEqual('1又2/4', '6/4'), true);
  assert.strictEqual(P.valuesEqual('1.5', '3/2'), true);
  assert.strictEqual(P.valuesEqual('2', '4/2'), true);
  assert.strictEqual(P.valuesEqual('1/2', '1/3'), false);
  assert.strictEqual(P.valuesEqual('1又', '1'), false);
  assert.strictEqual(P.valuesEqual('', '0'), false);
  assert.strictEqual(P.valuesEqual('1/0', '0'), false);
  let typed = '';
  ['3', '/', '2'].forEach(k => { typed = P.keypadPush(typed, k); });
  assert.strictEqual(typed, '3/2');
  let mixed = '';
  ['1', '又', '1', '/', '2'].forEach(k => { mixed = P.keypadPush(mixed, k); });
  assert.strictEqual(mixed, '1又1/2');
  assert.strictEqual(P.valuesEqual(typed, mixed), true);
  let ninth = '';
  ['9', '/', '1', '2'].forEach(k => { ninth = P.keypadPush(ninth, k); });
  assert.strictEqual(P.valuesEqual(ninth, '3/4'), true);
  assert.strictEqual(P.valuesEqual(ninth, '6/8'), true);
  assert.strictEqual(P.keypadPush('1/2', '/'), '1/2');
  assert.strictEqual(P.keypadPush('', '又'), '');
  assert.strictEqual(P.cardSay('剛「ㄈㄢˇ」家'), '剛「空格」家');
  const poem = '「海內存知己，天涯若比『ㄌㄧㄣˊ』」。引號裡的注音是哪個字？';
  const poemSaid = P.cardSay(poem);
  assert.ok(poemSaid.includes('海內存知己'), poemSaid);
  assert.ok(poemSaid.includes('空格'), poemSaid);
  assert.ok(!poemSaid.includes('ㄌㄧㄣ'), poemSaid);
  assert.strictEqual(P.spokenStem({ noTTS: true, mode: 'mc', q: '這裡的「得」怎麼讀？', opts: ['ㄉㄟˇ'] }), '');
  assert.ok(!P.spokenStem({ mode: 'card', q: '剛「ㄈㄢˇ」家的爸爸' }).includes('ㄈㄢ'));

  const play = fs.readFileSync(path.join(root, 'assets/subject-play.js'), 'utf8');
  const renderQ = play.slice(play.indexOf('function renderQuestion'), play.indexOf('function renderChoice'));
  assert.ok(renderQ.includes('q.noTTS'), 'pronunciation questions are flagged before speech');
  assert.ok(renderQ.includes('say.hidden = !!q.noTTS'));
  assert.ok(!renderQ.includes('speak('), 'a new question is not read aloud by itself');
  assert.ok(play.includes('spokenStem(game && game.question)'));
  assert.ok(play.includes('S.shuffle(lv.questions)'));
  assert.ok(play.includes('S.choiceDeck(q.opts)'));
  assert.ok(play.includes('valuesEqual(buf, q.accept)'));
  assert.ok(play.includes('if (result.runLevels)'));
  assert.ok(play.includes('commitStars: true'));
  assert.ok(play.includes('commitStars: false'));
  const finish = play.slice(play.indexOf('async function finishLevel'), play.indexOf('function makeDraggable'));
  const labels = [...finish.matchAll(/label: '([^']+)'/g)].map(m => m[1]);
  assert.deepStrictEqual(labels, ['🔁 再玩一次', '▶ 下一關', '📋 回小單元']);
  assert.ok(play.includes("home.textContent = id === 'play' ? '⬅ 回小單元' : '⬅ 回單元'"));
  assert.ok(play.includes("if (unitBackBtn) unitBackBtn.addEventListener('click', () => { Sound.click(); renderLobby(); });"));
  assert.ok(play.includes('這一單元的星星和獎勵卡日期會清掉。用過的計分次數不會回來，不能清掉後再重新計分 3 次。其他單元不會動。'));
  assert.ok(play.includes('if (preview) S.previewView(S.todayISO())'));
  assert.ok(play.includes('preview: true'));
  assert.ok(play.includes("document.addEventListener('el-scores-ready', refreshAfterScores);"));

  const chapters = {
    'chinese-u3': { subject: 'chinese', ids: ['ch7', 'ch8', 'ch9'], time: 120 },
    'chinese-u4': { subject: 'chinese', ids: ['ch10', 'ch11', 'ch12'], time: 120 },
    'math-u6': { subject: 'math', ids: ['6-1', '6-2', '6-3'], time: 150 },
    'math-u7': { subject: 'math', ids: ['7-1', '7-2', '7-3'], time: 150 },
    'math-u8': { subject: 'math', ids: ['8-1', '8-2', '8-3', '8-4'], time: 150 },
    'math-u9': { subject: 'math', ids: ['9-1', '9-2', '9-3', '9-4'], time: 150 },
    'math-u10': { subject: 'math', ids: ['10-1', '10-2', '10-3', '10-5'], time: 150 }
  };
  const hub = fs.readFileSync(path.join(root, 'assets/hub.js'), 'utf8');
  const parentJs = fs.readFileSync(path.join(root, 'parent/parent.js'), 'utf8');
  let questions = 0;
  let noTts = 0;
  Object.keys(chapters).forEach(dir => {
    const spec = chapters[dir];
    const html = fs.readFileSync(path.join(root, dir, 'index.html'), 'utf8');
    const game = fs.readFileSync(path.join(root, dir, 'game.js'), 'utf8');
    assert.ok(html.includes('href="../#/' + spec.subject + '">⬅ 回科目</a>'), dir);
    assert.ok(html.includes('id="unitBackBtn">⬅ 回單元</button>'), dir);
    assert.ok(html.includes('id="homeBtn"'), dir);
    assert.ok(!html.includes('回學習島'), dir);
    const versions = {
      '../assets/subject.css': '20261121b',
      '../assets/subject-play.js': '20261121a',
      '../assets/reward-approve.js': '20261121a',
      'data.js': '20261119e',
      'game.js': '20261119e',
      '../assets/gate.js': '20261121a',
      '../assets/unit-score.js': '20261119e'
    };
    Object.keys(versions).forEach(file => {
      assert.ok(html.includes(file + '?v=' + versions[file]), dir + ' ' + file);
    });
    assert.ok(game.includes('"chapter": "' + dir + '"'), dir);
    assert.ok(hub.includes("href: '" + dir + "/'"), dir);
    assert.ok(parentJs.includes("chapter: '" + dir + "'"), dir);
    const units = loadChapterUnits(dir);
    assert.deepStrictEqual(units.map(u => u.id), spec.ids, dir + ' unit ids');
    units.forEach(unit => {
      assert.ok(parentJs.includes("id: '" + unit.id + "'"), unit.id);
      assert.strictEqual(unit.levels.length, 4, unit.id);
      assert.deepStrictEqual(unit.levels.map(lv => lv.id), ['hand', 'idea', 'boss', 'adv'], unit.id);
      assert.deepStrictEqual(unit.levels.map(lv => lv.kind), ['hand', 'idea', 'boss', 'adv'], unit.id);
      unit.levels.forEach(lv => {
        assert.ok(!['動手', '觀念', '計時挑戰', '進階'].includes(lv.name), unit.id + ' ' + lv.name);
      });
      unit.levels.forEach(lv => {
        assert.strictEqual(lv.type, 'quiz', unit.id + ' ' + lv.id);
        assert.strictEqual(S.countItems(lv), lv.questions.length, unit.id + ' ' + lv.id);
      });
      const counts = unit.levels.map(lv => lv.questions.length);
      assert.strictEqual(counts.reduce((n, x) => n + x, 0), 30, unit.id);
      assert.strictEqual(counts[0], 8, unit.id);
      assert.strictEqual(counts[1], 8, unit.id);
      if (unit.id === '8-1') assert.deepStrictEqual(counts, [8, 8, 8, 6], 'bank keeps 8-1 as 8/8/8/6');
      else assert.deepStrictEqual(counts, [8, 8, 7, 7], unit.id);
      assert.strictEqual(unit.levels[2].time, spec.time, unit.id);
      assert.ok(!unit.levels[0].time && !unit.levels[1].time && !unit.levels[3].time, unit.id);
      assert.strictEqual(S.unitItemCount(unit), 30, unit.id);
      unit.levels.forEach(lv => {
        lv.questions.forEach(q => {
          questions += 1;
          if (q.noTTS) {
            noTts += 1;
            assert.strictEqual(P.spokenStem(q), '', q.id);
            assert.ok(q.q.includes('怎麼讀'), q.id);
          } else if (q.mode === 'card') {
            const said = P.spokenStem(q);
            assert.ok(said.includes('空格'), q.id);
            assert.ok(!/[ㄅ-ㄩ]/.test(said), q.id + ' spoken stem still has 注音');
            assert.ok(!said.includes(q.opts[0]), q.id + ' spoken stem contains the answer');
            if (q.id === 'ch8-hand-5') assert.ok(said.includes('海內存知己'), said);
          }
          if (q.id === 'ch8-adv-1') {
            assert.strictEqual(q.opts[0], '視覺和聽覺');
            assert.ok(q.q.includes('蜜蜂營營'));
          }
          if (q.fig && q.fig.paint && q.fig.ax != null && q.id !== '7-3-adv-5') {
            q.fig.paint.forEach(cell => {
              assert.ok(cell[1] < q.fig.ax, q.id + ' figure paints the unknown side');
            });
          }
          if (q.mode === 'mc' || q.mode === 'card') {
            assert.ok(q.opts && q.opts.length >= 2, q.id);
            assert.strictEqual(new Set(q.opts).size, q.opts.length, q.id + ' duplicate option');
            for (let i = 0; i < q.opts.length; i++) {
              for (let j = i + 1; j < q.opts.length; j++) {
                if (P.parseValue(q.opts[i]) && P.parseValue(q.opts[j])) {
                  assert.strictEqual(P.valuesEqual(q.opts[i], q.opts[j]), false, q.id + ' equivalent options');
                }
              }
            }
          }
          if (q.mode === 'keypad') {
            assert.ok(q.accept, q.id);
            assert.strictEqual(P.valuesEqual(q.a, q.accept), true, q.id);
            assert.ok(!q.opts, q.id + ' keypad must not ship a visible choice list');
          }
          if (q.mode === 'tiles' || q.mode === 'order') {
            assert.ok(q.tokens.length >= 2, q.id);
            assert.strictEqual(new Set(q.tokens).size, q.tokens.length, q.id);
          }
          assert.ok(!Object.prototype.hasOwnProperty.call(q, 'display'), q.id);
          assert.ok(!Object.prototype.hasOwnProperty.call(q, 'why') || q.why, q.id);
        });
      });
    });
  });
  assert.strictEqual(questions, 720);
  assert.strictEqual(noTts, 5);
  assert.ok(parentJs.includes('第七課 美景閒情——詩兩首'));
  assert.ok(parentJs.includes('10-5 球'));
  assert.ok(parentJs.includes('7-3～7-4 繪製線對稱圖形與應用'));
  assert.ok(play.includes('ELApprove.voucherDecor'));
  assert.ok(play.includes('ELApprove.attach'));
  assert.ok(!play.includes('爸爸簽名'));
}

function testRewardApproval() {
  require(path.join(root, 'assets/gate.js'));
  require(path.join(root, 'assets/reward-approve.js'));
  const A = global.ELAccount;
  const R = global.ELApprove;
  assert.strictEqual(A.firebaseConfig.projectId, 'elearning-6448b');
  assert.strictEqual(R.approvalId('math-u6', '6-1', 'reward1'), 'math-u6__6-1__reward1');
  assert.strictEqual(R.approvalId('social-ch3', 'sugar', 'reward2'), 'social-ch3__sugar__reward2');
  assert.strictEqual(R.minutesFor('reward1'), 30);
  assert.strictEqual(R.minutesFor('reward2'), 60);
  assert.strictEqual(R.minutesFor('reward3'), 0);

  const low = { scores: [25], rewards: { reward1: '2026-11-01' }, run: null };
  assert.strictEqual(R.tierEarned(low, 'reward1'), false);
  const star = { scores: [26], rewards: { reward1: '2026-11-01' }, run: null };
  assert.strictEqual(R.tierEarned(star, 'reward1'), true);
  assert.strictEqual(R.tierEarned(star, 'reward2'), false);
  const goldStars = { scores: [30], rewards: {}, run: null };
  assert.strictEqual(R.tierEarned(goldStars, 'reward2'), false);
  const gold = { scores: [18, 30], rewards: { reward1: '2026-11-01', reward2: '2026-11-02' }, run: null };
  assert.strictEqual(R.tierEarned(gold, 'reward1'), true);
  assert.strictEqual(R.tierEarned(gold, 'reward2'), true);
  assert.strictEqual(S.switchMinutes(gold), 60);

  assert.strictEqual(R.formatTaipei('2026-11-21T14:30:00.000Z'), '2026/11/21 22:30');
  assert.strictEqual(R.formatTaipei({ seconds: Date.parse('2026-11-21T14:30:00.000Z') / 1000 }), '2026/11/21 22:30');
  assert.strictEqual(R.formatTaipei(''), '');

  const open = R.voucherDecor(null, false);
  assert.ok(open.foot.includes('父母簽名'));
  assert.ok(open.foot.includes('class="sign-line"'));
  assert.ok(open.foot.includes('點這裡請父母簽名'));
  assert.ok(!open.stamp);
  assert.strictEqual(open.used, false);
  const preview = R.voucherDecor(null, true);
  assert.ok(preview.foot.includes('父母簽名'));
  assert.ok(preview.foot.includes('<i></i>'));
  assert.ok(!preview.foot.includes('sign-line'));
  const signed = {
    id: 'math-u6__6-1__reward2',
    approverName: 'smc',
    approvedAt: '2026-11-21T14:30:00.000Z',
    minutes: 60,
    chapter: 'math-u6',
    unitId: '6-1',
    tier: 'reward2',
    unitName: '6-1 異分母分數的加法'
  };
  const used = R.voucherDecor(signed, false);
  assert.strictEqual(used.used, true);
  assert.ok(used.stamp.includes('APPROVED'));
  assert.ok(used.stamp.includes('已核准'));
  assert.ok(used.stamp.includes('smc'));
  assert.ok(used.stamp.includes('2026/11/21 22:30'));
  assert.ok(used.foot.includes('已使用'));
  assert.ok(used.foot.includes('2026/11/21 22:30'));
  assert.ok(!used.foot.includes('sign-line'));
  assert.ok(!used.foot.includes('<button'));
  const nasty = R.voucherDecor(Object.assign({}, signed, { approverName: '<script>' }), false);
  assert.ok(nasty.stamp.includes('&lt;script&gt;'));
  assert.ok(!nasty.stamp.includes('<script>'));

  const smc = A.profileFromUser({ uid: 'smc-uid', email: 'smc@kids.local' });
  const mom = A.profileFromUser({ uid: 'mom-uid', email: 'ac27641101@gmail.com' });
  const ysc = A.profileFromUser({ uid: 'ysc-uid', email: 'ysc@kids.local' });
  assert.strictEqual(R.decisionAfterSignIn(smc).ok, true);
  assert.strictEqual(R.decisionAfterSignIn(mom).ok, true);
  assert.strictEqual(R.decisionAfterSignIn(ysc).ok, false);
  assert.strictEqual(R.decisionAfterSignIn(ysc).message, '這個帳號不是家長，不能核准兌換券。');
  assert.strictEqual(R.failureMessage('auth/wrong-password'), '帳號或密碼不對喔，再試一次吧！');
  assert.strictEqual(R.failureMessage('auth/invalid-credential'), '帳號或密碼不對喔，再試一次吧！');
  assert.strictEqual(R.failureMessage('already'), '這張兌換券已經核准過了，不能再用。');
  const record = R.approvalRecord({
    chapter: 'math-u6', unitId: '6-1', rewardId: 'reward2', unitName: '6-1 異分母分數的加法'
  }, smc);
  assert.deepStrictEqual(Object.keys(record).sort(), [
    'approvedBy', 'approverName', 'chapter', 'minutes', 'tier', 'unitId', 'unitName'
  ]);
  assert.strictEqual(record.approvedBy, 'smc-uid');
  assert.strictEqual(record.approverName, 'smc');
  assert.strictEqual(record.minutes, 60);
  assert.strictEqual(record.tier, 'reward2');
  assert.ok(!Object.prototype.hasOwnProperty.call(record, 'password'));
  const momRecord = R.approvalRecord({
    chapter: 'science-ch3', unitId: 'u1', rewardId: 'reward1', unitName: '水溶液中的物質'
  }, mom);
  assert.strictEqual(momRecord.approverName, '家長');
  assert.strictEqual(momRecord.minutes, 30);

  const bag = {
    'math-u6__6-1__reward1': Object.assign({}, record, { tier: 'reward1', minutes: 30, approvedAt: '2026-11-21T14:30:00.000Z' }),
    'math-u6__6-1__reward2': Object.assign({}, record, { approvedAt: '2026-11-21T15:00:00.000Z' }),
    'science-ch3__u1__reward1': momRecord
  };
  bag['science-ch3__u1__reward1'].approvedAt = '2026-11-20T01:00:00.000Z';
  assert.strictEqual(R.approvedMinutes(bag), 90);
  assert.strictEqual(R.approvedMinutesFor(bag, 'math-u6', '6-1'), 60);
  assert.strictEqual(R.approvedMinutesFor(bag, 'science-ch3', 'u1'), 30);
  const list = R.parentListHtml(bag, (chapter, unitId) => unitId === '6-1' ? '6-1 異分母分數的加法' : '');
  assert.ok(list.includes('已核准的兌換券'));
  assert.ok(list.includes('核准之後不能取消'));
  assert.ok(list.includes('已核准 Switch 一共 <b>90</b> 分鐘'));
  assert.ok(list.includes('6-1 異分母分數的加法'));
  assert.ok(list.includes('60 分鐘'));
  assert.ok(list.includes('smc'));
  assert.ok(list.includes('家長'));
  assert.ok(list.includes('2026/11/21 22:30'));
  assert.ok(list.includes('2026/11/21 23:00'));
  assert.strictEqual(R.parentListHtml({}, () => ''), R.parentListHtml({}, () => ''));
  assert.ok(R.parentListHtml({}, () => '').includes('還沒有核准過的兌換券。'));
  assert.strictEqual(R.tipText(false, null).includes('父母簽名'), true);
  assert.strictEqual(R.tipText(false, signed), '這張兌換券已經核准，不能再用。');
  assert.strictEqual(R.tipText(true, null), '這是預覽，不會幫孩子解鎖。');

  const src = fs.readFileSync(path.join(root, 'assets/reward-approve.js'), 'utf8');
  assert.ok(src.includes("initializeApp(config, 'approver')"));
  assert.ok(src.includes('inMemoryPersistence'));
  assert.ok(src.includes('signInWithEmailAndPassword(approverAuth, email, password)'));
  assert.ok(src.includes('signOut(approverAuth)'));
  assert.ok(src.includes('serverTimestamp()'));
  assert.ok(src.includes('passInput.value = \'\''));
  assert.ok(src.includes('ELAccount.loginEmail'));
  assert.ok(!src.includes('console.'));
  assert.ok(!src.includes('localStorage'));
  assert.ok(!src.includes('sessionStorage'));
  assert.ok(!src.includes('location.reload'));
  assert.ok(!src.includes('爸爸簽名'));

  const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
  const block = rules.slice(rules.indexOf('match /approvals/{approvalId}'));
  assert.ok(block.includes('allow get, list: if isOwner(uid) || isParent();'));
  assert.ok(block.includes('allow create: if isParent() && validApproval(uid, approvalId);'));
  assert.ok(block.includes('allow update, delete: if false;'));
  assert.ok(!block.includes('allow delete: if isParent()'));
  assert.ok(rules.includes('function validApproval(uid, approvalId)'));
  assert.ok(rules.includes('function childEarnedTier(uid, data)'));
  assert.ok(rules.includes("approvalId == request.resource.data.chapter + '__' + request.resource.data.unitId + '__' + request.resource.data.tier"));
  assert.ok(rules.includes("request.resource.data.approvedBy == request.auth.uid"));
  assert.ok(rules.includes('request.resource.data.approvedAt == request.time'));
  assert.ok(rules.includes("request.auth.token.email == 'smc@kids.local' && request.resource.data.approverName == 'smc'"));
  assert.ok(rules.includes("request.auth.token.email == 'ac27641101@gmail.com' && request.resource.data.approverName == '家長'"));
  assert.ok(rules.includes("data.tier == 'reward1' && data.minutes == 30 && maxOf(score.scores) >= 26"));
  assert.ok(rules.includes("data.tier == 'reward2' && data.minutes == 60 && maxOf(score.scores) >= 30"));
  assert.strictEqual(A.displayName('smc', 'parent'), 'smc');
  assert.strictEqual(A.displayName('ac27641101@gmail.com', 'parent'), '家長');

  const parentJs = fs.readFileSync(path.join(root, 'parent/parent.js'), 'utf8');
  assert.ok(parentJs.includes('ELApprove.parentListHtml'));
  assert.ok(parentJs.includes('ELApprove.approvedMinutesFor'));
  assert.ok(parentJs.includes("fb.collection(fb.db, 'users', profile.uid, 'approvals')"));
  assert.ok(parentJs.includes('function familySwitchMinutes'));
  assert.ok(parentJs.includes('function totalMinutes'));
  assert.ok(!parentJs.includes('deleteDoc(fb.doc(fb.db, \'users\', uid, \'approvals\''));
  ['social-ch3', 'social-g5', 'science-ch3', 'science-ch4', 'english-u34', 'math-u6', 'chinese-u3', 'parent'].forEach(dir => {
    const html = fs.readFileSync(path.join(root, dir, 'index.html'), 'utf8');
    assert.ok(html.includes('reward-approve.js?v=20261121a'), dir);
    assert.ok(!html.includes('爸爸簽名'), dir);
  });
}

testNewSubjects();
testRewardApproval();
testLevelMarkAndReview();
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
