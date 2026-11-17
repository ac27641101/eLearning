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

  ['social-ch3', 'social-g5', 'science-ch3', 'science-ch4'].forEach(unit => {
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
  ['social-ch3', 'social-g5', 'science-ch3', 'science-ch4'].forEach(unit => {
    const html = fs.readFileSync(path.join(root, unit, 'index.html'), 'utf8');
    const js = fs.readFileSync(path.join(root, unit, 'game.js'), 'utf8');
    assert.ok(!html.includes('回學習島'), unit);
    assert.ok(html.includes('id="homeBtn"'), unit);
    const subjectHash = unit.startsWith('social-') ? '../#/social' : '../#/science';
    const otherHash = unit.startsWith('social-') ? '#/science' : '#/social';
    assert.ok(!html.includes(otherHash), unit + ' should not link to the other subject');
    const lobbyEnd = html.indexOf('id="lesson"') > 0 && unit === 'social-ch3'
      ? html.indexOf('id="lesson"')
      : html.indexOf('id="unit"');
    const lobby = html.slice(html.indexOf('id="lobby"'), lobbyEnd);
    const deeper = html.slice(lobbyEnd);
    assert.ok(lobby.includes('href="' + subjectHash + '">⬅ 回科目</a>'), unit + ' lobby');
    assert.ok(!lobby.includes('回課程'), unit + ' lobby is 回科目');
    assert.strictEqual((lobby.match(/⬅ 回科目/g) || []).length, 1, unit + ' lobby');
    assert.deepStrictEqual(html.match(/href="\.\.\/[^"]*"/g) || [], ['href="' + subjectHash + '"'], unit + ' only the lobby links upward');
    assert.ok(!deeper.includes('#/social') && !deeper.includes('#/science'), unit + ' deeper screens stay in the unit');
    assert.ok(!deeper.includes('回課程') && !deeper.includes('回科目'), unit + ' deeper labels name the next level up');
    assert.ok(html.includes('id="resetBtn">🧹 清除星星紀錄</button>\n    <button type="button" class="px-btn wood notes-btn" id="unitBackBtn">⬅ 回單元</button>'), unit);
    if (unit === 'social-ch3') {
      const lesson = html.slice(html.indexOf('id="lesson"'), html.indexOf('id="unit"'));
      assert.ok(lesson.includes('id="lessonBackBtn">⬅ 回單元</button>'), 'lesson screen');
      assert.ok(!lesson.includes('回第三課'), 'lesson screen');
      assert.ok(js.includes("$('lessonBackBtn').addEventListener('click', () => {\n  Sound.click();\n  renderLobby();\n});"), 'lesson back uses the lobby navigation');
      assert.ok(js.includes("unitBack.textContent = curLesson ? '⬅ 回' + curLesson.tag : '⬅ 回單元';"), 'lesson units name the lesson');
      assert.ok(js.includes("$('unitBackBtn').addEventListener('click', () => {\n  Sound.click();\n  if (curLesson) openLesson(curLesson);\n  else renderLobby();\n});"), 'unit back is one level up');
    } else {
      assert.ok(js.includes("$('unitBackBtn').addEventListener('click', () => { Sound.click(); renderLobby(); });"), unit + ' unit back returns to the chapter lobby');
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
  assert.strictEqual(S.ATTEMPT_LIMIT, 3);
  assert.strictEqual(S.NEED_MINUTES_30, 26);
  assert.strictEqual(S.NEED_MINUTES_60, 30);
  assert.strictEqual(S.STAR_MAX, 30);
}

testThreeScoresStayUsed();
testOneScoreLeavesTwoChances();
testTwoScoresLeaveOneChance();
testRunOnlyDoesNotSpendAnAttempt();
testPreviewDoesNotWrite();
testCopyAndSubjectLinks();
console.log('unit-score tests passed');
