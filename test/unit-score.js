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
    assert.ok(!html.includes('#/social'), unit);
    assert.ok(!html.includes('#/science'), unit);
    assert.ok(!html.includes('回學習島'), unit);
    assert.ok(html.includes('id="homeBtn"'), unit);
    const links = html.match(/<a class="px-btn wood notes-btn" href="\.\.\/">⬅ 回科目<\/a>/g) || [];
    assert.strictEqual(links.length, unit === 'social-ch3' ? 3 : 2, unit);
    assert.ok(html.includes('id="resetBtn">🧹 清除星星紀錄</button>\n    <a class="px-btn wood notes-btn" href="../">⬅ 回科目</a>'), unit);
    if (unit === 'social-ch3') {
      const lesson = html.slice(html.indexOf('id="lesson"'), html.indexOf('id="unit"'));
      assert.ok(lesson.includes('href="../">⬅ 回科目</a>'), 'lesson screen');
    }
    const lobby = html.slice(html.indexOf('id="lobby"'), html.indexOf('id="lesson"') > 0 && unit === 'social-ch3' ? html.indexOf('id="lesson"') : html.indexOf('id="unit"'));
    assert.ok(lobby.includes('href="../">⬅ 回科目</a>'), unit + ' lobby');
    assert.ok(js.includes(dialog), unit);
    assert.ok(!js.includes('3 次分數'), unit);
    assert.ok(js.includes("{label: '⬅ 回科目', value: 'subjects', cls: 'wood'}"), unit);
    assert.ok(js.includes("else if (v === 'subjects') location.href = '../';"), unit);
  });

  const hub = fs.readFileSync(path.join(root, 'assets/hub.js'), 'utf8');
  assert.ok(hub.includes("id === 'subjects'"));
  assert.ok(hub.includes('function showSubjects'));
  assert.ok(hub.includes('function showChapters'));
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
