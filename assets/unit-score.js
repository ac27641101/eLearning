/* 每個小單元自己的 30 顆星、3 次計分、獎勵日期。
   舊的整章星星（formosa-g5-stars、social-ch3-stars 等）完全不讀。
   預覽獎勵卡不會寫入獲得日期。
   清除星星會把各次星星改成 0、清掉獎勵日期和沒算完的 run。
   已經用掉的計分次數（scores 的長度）不會變回 3 次。
   登入之後，雲端文件 users/{uid}/scores/{chapter__unitId} 才是準的。
   這台裝置只留快取 el-score-v3:<uid>:<chapter>:<unitId>。舊的 el-score-v2 不讀、不搬。
   rev 用來認出家長重置：孩子寫不回比較舊的那一代。
   examBest 是英文模擬考最好的卷面分數（0–100），有寫進來才會留。 */
(function (root) {
  const STAR_MAX = 30;
  const ATTEMPT_LIMIT = 3;
  const NEED_MINUTES_30 = 26;
  const NEED_MINUTES_60 = 30;
  const REWARD_IDS = ['reward1', 'reward2'];

  let boundUid = null;
  let shadow = {};
  let writer = null;
  let ready = false;
  const waiters = [];

  function storageKey(chapter, unitId, uid) {
    const id = chapter + ':' + unitId;
    return uid ? 'el-score-v3:' + uid + ':' + id : 'el-score-v3:' + id;
  }

  function docId(chapter, unitId) {
    return String(chapter) + '__' + String(unitId);
  }

  function scoresAllZero(scores) {
    return !!(scores && scores.length) && scores.every(n => n === 0);
  }

  function prefixEqual(base, next) {
    if (!next || next.length < base.length) return false;
    for (let i = 0; i < base.length; i++) {
      if (next[i] !== base[i]) return false;
    }
    return true;
  }

  /* cloud 是雲端那一代。rev 比較新的話，整筆以雲端為準（家長剛重置）。
     同一代裡，次數不會變少；清星星只把同一長度改成 0。
     前面的分數被改掉時，不採用這次寫入的星星。examBest 只留比較高的。 */
  function mergeState(local, cloud) {
    const next = normalize(local);
    if (cloud == null) return next;
    const prev = normalize(cloud);
    if ((prev.rev || 0) > (next.rev || 0)) return prev;

    const exams = [];
    if (typeof next.examBest === 'number') exams.push(next.examBest);
    if (typeof prev.examBest === 'number') exams.push(prev.examBest);
    const examBest = exams.length ? Math.max.apply(null, exams) : undefined;
    const sameLength = next.scores.length === prev.scores.length;
    const clearing = sameLength && prev.scores.length > 0 && scoresAllZero(next.scores) && prev.scores.some(n => n > 0);

    let scores;
    let rewards;
    let run;
    if (clearing) {
      scores = next.scores.slice();
      rewards = {};
      run = null;
    } else if (next.scores.length < prev.scores.length || !prefixEqual(prev.scores, next.scores)) {
      scores = prev.scores.slice();
      rewards = Object.assign({}, prev.rewards);
      run = prev.run;
    } else {
      scores = next.scores.slice(0, ATTEMPT_LIMIT);
      rewards = Object.assign({}, prev.rewards, next.rewards);
      run = next.run;
    }
    const out = { scores: scores, rewards: rewards, run: run, rev: prev.rev || 0 };
    if (typeof examBest === 'number') out.examBest = examBest;
    const merged = normalize(out);
    if (!clearing) {
      REWARD_IDS.forEach(id => {
        if (!merged.rewards[id] && prev.rewards[id]) merged.rewards[id] = prev.rewards[id];
      });
    }
    const top = best(merged);
    if (top < NEED_MINUTES_30) delete merged.rewards.reward1;
    if (top < NEED_MINUTES_60) delete merged.rewards.reward2;
    return merged;
  }

  function keyFor(chapter, unitId, storage) {
    if (storage) return storageKey(chapter, unitId);
    return storageKey(chapter, unitId, boundUid);
  }

  function resolveBox(storage) {
    if (storage) return storage;
    try {
      if (root.localStorage) return root.localStorage;
    } catch (e) { /* 隱私模式 */ }
    if (!root.__elMemory) root.__elMemory = memoryStorage();
    return root.__elMemory;
  }

  function readKey(box, key) {
    try {
      const raw = box.getItem(key);
      return normalize(raw ? JSON.parse(raw) : null);
    } catch (e) {
      return emptyState();
    }
  }

  function writeKey(box, key, state) {
    box.setItem(key, JSON.stringify(normalize(state)));
  }

  function cloudFor(chapter, unitId, storage) {
    if (storage && typeof storage.cloudGet === 'function') {
      const value = storage.cloudGet(chapter, unitId);
      return value == null ? null : value;
    }
    if (storage) return null;
    const id = docId(chapter, unitId);
    return Object.prototype.hasOwnProperty.call(shadow, id) ? shadow[id] : null;
  }

  function queueWrite(chapter, unitId, state) {
    if (typeof writer !== 'function') return;
    try {
      const result = writer(chapter, unitId, state);
      if (result && typeof result.then === 'function') result.then(function () {}, function () {});
    } catch (e) { /* 寫入端自己處理失敗 */ }
  }

  function bindUid(uid) {
    boundUid = uid || null;
  }

  function setCloudWriter(fn) {
    writer = typeof fn === 'function' ? fn : null;
  }

  function noteCloud(chapter, unitId, raw, storage) {
    const incoming = normalize(raw);
    const id = docId(chapter, unitId);
    let floor = incoming;
    if (!storage && Object.prototype.hasOwnProperty.call(shadow, id)) {
      floor = mergeState(shadow[id], incoming);
    }
    if (!storage) shadow[id] = floor;
    const box = resolveBox(storage);
    const key = keyFor(chapter, unitId, storage);
    const merged = mergeState(readKey(box, key), floor);
    writeKey(box, key, merged);
    return merged;
  }

  function resetSession() {
    boundUid = null;
    shadow = {};
    writer = null;
    reviewShadow = {};
    reviewWriter = null;
    ready = false;
    waiters.length = 0;
    try { root.ELScoresReady = false; } catch (e) {}
  }

  function markReady() {
    ready = true;
    try { root.ELScoresReady = true; } catch (e) {}
    if (root.document && typeof root.CustomEvent === 'function') {
      root.document.dispatchEvent(new root.CustomEvent('el-scores-ready'));
    }
    const queued = waiters.splice(0);
    queued.forEach(fn => {
      try { fn(); } catch (e) {}
    });
  }

  function whenReady(fn) {
    if (typeof fn !== 'function') return;
    if (ready) fn();
    else waiters.push(fn);
  }

  function toCloud(chapter, unitId, state) {
    const s = normalize(state);
    const out = {
      chapter: String(chapter),
      unitId: String(unitId),
      scores: s.scores,
      rewards: s.rewards,
      run: s.run,
      rev: s.rev || 0,
      updatedAt: new Date().toISOString()
    };
    if (typeof s.examBest === 'number') out.examBest = s.examBest;
    return out;
  }

  function switchMinutes(state) {
    const b = best(state);
    if (b >= NEED_MINUTES_60) return 60;
    if (b >= NEED_MINUTES_30) return 30;
    return 0;
  }

  function summarize(state) {
    const s = normalize(state);
    return {
      best: best(s),
      attemptsUsed: attemptsUsed(s),
      attemptsLeft: attemptsLeft(s),
      switchMinutes: switchMinutes(s),
      examBest: typeof s.examBest === 'number' ? s.examBest : null,
      rev: s.rev || 0,
      scores: s.scores.slice()
    };
  }

  function emptyState() {
    return { scores: [], rewards: {}, run: null, rev: 0 };
  }

  function normalize(raw) {
    const s = emptyState();
    if (!raw || typeof raw !== 'object') return s;
    if (Array.isArray(raw.scores)) {
      raw.scores.forEach(n => {
        if (s.scores.length >= ATTEMPT_LIMIT) return;
        if (typeof n !== 'number' || !isFinite(n)) return;
        s.scores.push(Math.max(0, Math.min(STAR_MAX, Math.round(n))));
      });
    }
    if (raw.rewards && typeof raw.rewards === 'object') {
      REWARD_IDS.forEach(id => {
        const v = raw.rewards[id];
        if (typeof v === 'string' && v) s.rewards[id] = v;
      });
    }
    if (raw.run && raw.run.levels && typeof raw.run.levels === 'object') {
      const levels = {};
      Object.keys(raw.run.levels).forEach(id => {
        const n = raw.run.levels[id];
        if (typeof n === 'number' && isFinite(n)) levels[id] = Math.max(0, Math.round(n));
      });
      s.run = { levels: levels };
    }
    if (typeof raw.examBest === 'number' && isFinite(raw.examBest)) {
      s.examBest = Math.max(0, Math.min(100, Math.round(raw.examBest)));
    }
    if (typeof raw.rev === 'number' && isFinite(raw.rev) && raw.rev > 0) {
      s.rev = Math.min(100000, Math.round(raw.rev));
    }
    return s;
  }

  function clone(state) {
    return normalize(JSON.parse(JSON.stringify(state || emptyState())));
  }

  function best(state) {
    return (state && state.scores || []).reduce((m, n) => Math.max(m, n), 0);
  }

  function attemptsUsed(state) {
    return (state && state.scores || []).length;
  }

  function attemptsLeft(state) {
    return Math.max(0, ATTEMPT_LIMIT - attemptsUsed(state));
  }

  function isPractice(state) {
    return attemptsUsed(state) >= ATTEMPT_LIMIT;
  }

  function earned(state, rewardId) {
    return !!(state && state.rewards && state.rewards[rewardId]);
  }

  function createTally() {
    return { right: 0, miss: 0, missed: {}, wrongs: {} };
  }

  function clipText(value, max) {
    const text = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    const limit = max || 200;
    return text.length > limit ? text.slice(0, limit) : text;
  }

  function rememberWrong(tally, detail) {
    if (!tally || !detail) return;
    if (!tally.wrongs) tally.wrongs = {};
    tally.wrongs[detail.id || ('w' + Object.keys(tally.wrongs).length)] = {
      q: clipText(detail.q, 200),
      a: clipText(detail.a, 200),
      c: clipText(detail.c, 200)
    };
  }

  function wrongList(tally) {
    const bag = (tally && tally.wrongs) || {};
    const missed = (tally && tally.missed) || {};
    const list = [];
    Object.keys(bag).forEach(id => {
      if (missed[id] !== true) return;
      list.push(bag[id]);
    });
    return list.slice(0, 40);
  }

  function noteWrong(tally, itemId) {
    tally.miss += 1;
    tally.missed[itemId] = true;
    return 0;
  }

  function noteRight(tally, itemId) {
    if (tally.missed[itemId]) return tally.right;
    tally.missed[itemId] = 'ok';
    tally.right += 1;
    return tally.right;
  }

  function countItems(level) {
    if (!level) return 0;
    if (level.type === 'quiz') return (level.questions || []).length;
    if (level.type === 'sort') return (level.items || []).length;
    if (level.type === 'order') return (level.rounds || []).reduce((n, r) => n + ((r.items || []).length), 0);
    return 0;
  }

  function unitItemCount(unit) {
    return (unit.levels || []).reduce((n, lv) => n + countItems(lv), 0);
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  function choiceDeck(opts) {
    return shuffle((opts || []).map((t, i) => ({ t: t, right: i === 0 })));
  }

  function levelIds(unit) {
    return (unit.levels || []).map(lv => lv.id);
  }

  function runLevelStars(state, levelId) {
    if (!state || !state.run || !state.run.levels) return null;
    if (!Object.prototype.hasOwnProperty.call(state.run.levels, levelId)) return null;
    return state.run.levels[levelId];
  }

  function runDoneCount(state, ids) {
    if (!state || !state.run) return 0;
    return ids.filter(id => Object.prototype.hasOwnProperty.call(state.run.levels, id)).length;
  }

  /* 完成一關。練習模式、或這一關在本次已經算過，都不寫入。
     四關都完成才把加總放進 scores（最多 3 次），並在跨過 26 / 30 時記下獎勵日期。 */
  function commitLevel(state, info) {
    const next = clone(state);
    const ids = info.levelIds || [];
    const levelId = info.levelId;
    const stars = Math.max(0, Math.round(info.stars || 0));
    if (isPractice(next)) {
      return { state: next, wrote: false, practice: true, replay: false, completed: false, total: null, unlocked: [], runLevels: null };
    }
    if (next.run && Object.prototype.hasOwnProperty.call(next.run.levels, levelId)) {
      return { state: next, wrote: false, practice: false, replay: true, completed: false, total: null, unlocked: [], runLevels: null };
    }
    if (!next.run) next.run = { levels: {} };
    next.run.levels[levelId] = stars;
    const done = ids.length > 0 && ids.every(id => Object.prototype.hasOwnProperty.call(next.run.levels, id));
    const unlocked = [];
    let total = null;
    let completed = false;
    let runLevels = null;
    if (done) {
      runLevels = Object.assign({}, next.run.levels);
      total = ids.reduce((n, id) => n + next.run.levels[id], 0);
      if (next.scores.length < ATTEMPT_LIMIT) {
        next.scores.push(Math.max(0, Math.min(STAR_MAX, total)));
        completed = true;
        const b = best(next);
        const iso = info.iso || '';
        if (b >= NEED_MINUTES_30 && !next.rewards.reward1) {
          next.rewards.reward1 = iso;
          unlocked.push('reward1');
        }
        if (b >= NEED_MINUTES_60 && !next.rewards.reward2) {
          next.rewards.reward2 = iso;
          unlocked.push('reward2');
        }
      }
      next.run = null;
    }
    return { state: next, wrote: true, practice: false, replay: false, completed: completed, total: total, unlocked: unlocked, runLevels: runLevels };
  }

  function restartRun(state) {
    const next = clone(state);
    next.run = null;
    return next;
  }

  function memoryStorage() {
    const bag = {};
    return {
      getItem(k) { return Object.prototype.hasOwnProperty.call(bag, k) ? bag[k] : null; },
      setItem(k, v) { bag[k] = String(v); },
      removeItem(k) { delete bag[k]; }
    };
  }

  function load(chapter, unitId, storage) {
    const box = resolveBox(storage);
    const key = keyFor(chapter, unitId, storage);
    const local = readKey(box, key);
    const cloud = cloudFor(chapter, unitId, storage);
    if (cloud == null) return local;
    const merged = mergeState(local, cloud);
    if (JSON.stringify(merged) !== JSON.stringify(local)) writeKey(box, key, merged);
    return merged;
  }

  function save(chapter, unitId, state, storage) {
    const box = resolveBox(storage);
    const key = keyFor(chapter, unitId, storage);
    const cloud = cloudFor(chapter, unitId, storage);
    const next = cloud == null ? normalize(state) : mergeState(state, cloud);
    if (storage && typeof storage.cloudSet === 'function') storage.cloudSet(chapter, unitId, next);
    if (!storage) {
      shadow[docId(chapter, unitId)] = normalize(next);
      queueWrite(chapter, unitId, next);
    }
    writeKey(box, key, next);
  }

  /* 清掉這一單元的星星和獎勵日期，也可以丟掉還沒算完的 run。
     計分次數看 scores 的長度：長度留下，數字改成 0，所以用過的次數不會回來。
     一次都還沒計分時，本地那筆刪掉（只會清掉 run 或獎勵）。其他單元的 key 不動。
     雲端若已有這一代的紀錄，會把星星寫成空的，rev 維持不變。模擬考分數留下。 */
  function clear(chapter, unitId, storage) {
    const box = resolveBox(storage);
    const key = keyFor(chapter, unitId, storage);
    const prev = load(chapter, unitId, storage);
    if (!prev.scores.length) {
      box.removeItem(key);
      const empty = emptyState();
      empty.rev = prev.rev || 0;
      if (typeof prev.examBest === 'number') empty.examBest = prev.examBest;
      const dirty = prev.run || Object.keys(prev.rewards).length;
      if (dirty && storage && typeof storage.cloudSet === 'function') {
        storage.cloudSet(chapter, unitId, normalize(empty));
      } else if (dirty && !storage) {
        shadow[docId(chapter, unitId)] = normalize(empty);
        queueWrite(chapter, unitId, empty);
      }
      return;
    }
    const kept = emptyState();
    kept.rev = prev.rev || 0;
    kept.scores = prev.scores.map(() => 0);
    if (typeof prev.examBest === 'number') kept.examBest = prev.examBest;
    save(chapter, unitId, kept, storage);
  }

  /* 預覽只產生畫面用的日期文字，不讀寫紀錄。 */
  function previewView(today) {
    return { write: false, preview: true, iso: today || '', dateLabel: '預覽，不會記成已獲得' };
  }

  function hintText(bestScore) {
    if (bestScore < NEED_MINUTES_30) return '還差 ' + (NEED_MINUTES_30 - bestScore) + ' 顆就可以玩 Switch 30分鐘';
    if (bestScore < NEED_MINUTES_60) return '還差 ' + (NEED_MINUTES_60 - bestScore) + ' 顆就可以玩 Switch 60分鐘';
    return '';
  }

  function chancesText(state) {
    if (isPractice(state)) return '練習模式，這次不會算星星';
    const n = attemptsLeft(state);
    return '還有 ' + n + ' 次計分機會';
  }

  function todayISO(date) {
    const d = date || new Date();
    const z = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
  }

  function formatDate(iso) {
    const p = String(iso || '').split('-');
    if (p.length !== 3) return iso || '';
    return Number(p[0]) + '年' + Number(p[1]) + '月' + Number(p[2]) + '日';
  }

  function howLine(level) {
    const n = countItems(level);
    if (level && level.type === 'quiz' && level.time) return '計時 ' + level.time + ' 秒！共 ' + n + ' 題，答對 1 題得 1 顆星。';
    if (level && level.type === 'quiz') return '共 ' + n + ' 題，答對 1 題得 1 顆星。';
    if (level && level.type === 'sort') return '把 ' + n + ' 張卡片分對。放對 1 張得 1 顆星。放錯就沒有這顆星。';
    if (level && level.type === 'order') return '排對 ' + n + ' 張卡片。排對 1 張得 1 顆星。排錯就沒有這顆星。';
    return (level && level.how) || '';
  }

  function levelMark(state, levelId, levelReview, itemMax) {
    const practice = isPractice(state);
    const hasRun = !!(state && state.run && state.run.levels);
    const inRun = hasRun && Object.prototype.hasOwnProperty.call(state.run.levels, levelId);
    if (inRun) {
      const stars = Math.max(0, Math.round(state.run.levels[levelId]));
      const max = positiveCount(itemMax) || positiveCount(levelReview && levelReview.max) || positiveCount(levelReview && levelReview.lastRunMax);
      if (max) {
        const text = '上次 ★ ' + stars + ' / ' + max;
        return practice ? '練習・' + text : text;
      }
    }
    const last = lastRunText(levelReview);
    if (practice) return last ? '練習・' + last : '練習';
    if (last) return last;
    return '還沒玩過';
  }

  function positiveCount(value) {
    if (typeof value !== 'number' || !isFinite(value) || value <= 0) return 0;
    return Math.max(0, Math.min(30, Math.round(value)));
  }

  /* 新紀錄用 lastRunStars / lastRunMax。更早的關卡紀錄只有 stars、max，
     那就是這一關最近一次玩完的星數，畫面仍要顯示，但不改寫分數文件。 */
  function finishedRunMark(levelReview) {
    if (!levelReview) return null;
    if (typeof levelReview.lastRunStars !== 'number' || !isFinite(levelReview.lastRunStars)) return null;
    if (typeof levelReview.lastRunMax !== 'number' || !isFinite(levelReview.lastRunMax) || levelReview.lastRunMax <= 0) return null;
    return {
      lastRunStars: Math.max(0, Math.min(30, Math.round(levelReview.lastRunStars))),
      lastRunMax: Math.max(0, Math.min(30, Math.round(levelReview.lastRunMax)))
    };
  }

  function legacyRunMark(levelReview) {
    if (!levelReview) return null;
    const max = positiveCount(levelReview.max);
    if (!max) return null;
    if (typeof levelReview.stars !== 'number' || !isFinite(levelReview.stars)) return null;
    return {
      lastRunStars: Math.max(0, Math.min(30, Math.round(levelReview.stars))),
      lastRunMax: max
    };
  }

  function lastRunText(levelReview) {
    const mark = finishedRunMark(levelReview) || legacyRunMark(levelReview);
    if (!mark) return '';
    return '上次 ★ ' + mark.lastRunStars + ' / ' + mark.lastRunMax;
  }

  let reviewShadow = {};
  let reviewWriter = null;

  function reviewStorageKey(chapter, unitId, uid) {
    const id = chapter + ':' + unitId;
    return uid ? 'el-review-v1:' + uid + ':' + id : 'el-review-v1:' + id;
  }

  function reviewKeyFor(chapter, unitId, storage) {
    if (storage) return reviewStorageKey(chapter, unitId);
    return reviewStorageKey(chapter, unitId, boundUid);
  }

  function emptyReview() {
    return { levels: {} };
  }

  function normalizeReviewLevel(raw) {
    const wrong = [];
    if (raw && Array.isArray(raw.wrong)) {
      raw.wrong.slice(0, 40).forEach(item => {
        if (!item || typeof item !== 'object') return;
        wrong.push({
          q: clipText(item.q, 200),
          a: clipText(item.a, 200),
          c: clipText(item.c, 200)
        });
      });
    }
    const stars = raw && typeof raw.stars === 'number' && isFinite(raw.stars) ? Math.max(0, Math.min(30, Math.round(raw.stars))) : 0;
    const max = raw && typeof raw.max === 'number' && isFinite(raw.max) ? Math.max(0, Math.min(30, Math.round(raw.max))) : 0;
    const level = {
      stars: stars,
      max: max,
      wrong: wrong,
      at: raw && typeof raw.at === 'string' ? raw.at.slice(0, 40) : ''
    };
    const mark = finishedRunMark(raw);
    if (mark) {
      level.lastRunStars = mark.lastRunStars;
      level.lastRunMax = mark.lastRunMax;
    }
    return level;
  }

  function normalizeReview(raw) {
    const out = emptyReview();
    const levels = raw && raw.levels && typeof raw.levels === 'object' ? raw.levels : null;
    if (!levels) return out;
    Object.keys(levels).slice(0, 8).forEach(id => {
      out.levels[id] = normalizeReviewLevel(levels[id]);
    });
    return out;
  }

  function readReviewKey(box, key) {
    try {
      const raw = box.getItem(key);
      return normalizeReview(raw ? JSON.parse(raw) : null);
    } catch (e) {
      return emptyReview();
    }
  }

  function writeReviewKey(box, key, review) {
    box.setItem(key, JSON.stringify(normalizeReview(review)));
  }

  function loadReview(chapter, unitId, storage) {
    const box = resolveBox(storage);
    const key = reviewKeyFor(chapter, unitId, storage);
    const local = readReviewKey(box, key);
    if (storage) return local;
    const id = docId(chapter, unitId);
    if (!Object.prototype.hasOwnProperty.call(reviewShadow, id)) return local;
    return normalizeReview(reviewShadow[id]);
  }

  function setReviewWriter(fn) {
    reviewWriter = typeof fn === 'function' ? fn : null;
  }

  function queueReview(chapter, unitId, review) {
    if (typeof reviewWriter !== 'function') return;
    try {
      const result = reviewWriter(chapter, unitId, review);
      if (result && typeof result.then === 'function') result.then(function () {}, function () {});
    } catch (e) { /* 錯題寫入失敗不能擋住計分 */ }
  }

  function writeReviewDoc(chapter, unitId, next, storage) {
    const ids = Object.keys(next.levels);
    if (ids.length > 8) {
      ids.sort((a, b) => String(next.levels[a].at).localeCompare(String(next.levels[b].at)));
      ids.forEach(id => {
        if (Object.keys(next.levels).length > 8) delete next.levels[id];
      });
    }
    const saved = normalizeReview(next);
    const box = resolveBox(storage);
    const key = reviewKeyFor(chapter, unitId, storage);
    if (!storage) reviewShadow[docId(chapter, unitId)] = saved;
    writeReviewKey(box, key, saved);
    if (!storage) queueReview(chapter, unitId, saved);
  }

  function applyReviewUpdate(next, record) {
    const levelId = record.levelId;
    const prev = next.levels[levelId];
    const incoming = normalizeReviewLevel(record);
    delete incoming.lastRunStars;
    delete incoming.lastRunMax;
    if (record.commitStars === false) {
      incoming.stars = prev ? prev.stars : 0;
      incoming.max = prev ? prev.max : 0;
    }
    if (record && record.commitStars === true && incoming.max > 0) {
      incoming.lastRunStars = incoming.stars;
      incoming.lastRunMax = incoming.max;
    } else {
      const kept = finishedRunMark(prev);
      if (kept) {
        incoming.lastRunStars = kept.lastRunStars;
        incoming.lastRunMax = kept.lastRunMax;
      }
    }
    if (record.keepWrong && prev) incoming.wrong = prev.wrong || [];
    next.levels[levelId] = incoming;
  }

  function saveReviewLevel(chapter, unitId, levelId, record, storage) {
    try {
      const next = loadReview(chapter, unitId, storage);
      applyReviewUpdate(next, Object.assign({ levelId: levelId }, record || {}));
      writeReviewDoc(chapter, unitId, next, storage);
    } catch (e) { /* 錯題寫入失敗不能擋住計分 */ }
  }

  function saveReviewLevels(chapter, unitId, updates, storage) {
    try {
      const next = loadReview(chapter, unitId, storage);
      (updates || []).forEach(update => applyReviewUpdate(next, update || {}));
      writeReviewDoc(chapter, unitId, next, storage);
    } catch (e) { /* 錯題寫入失敗不能擋住計分 */ }
  }

  function noteReview(chapter, unitId, raw, storage) {
    const saved = normalizeReview(raw);
    if (!storage) reviewShadow[docId(chapter, unitId)] = saved;
    writeReviewKey(resolveBox(storage), reviewKeyFor(chapter, unitId, storage), saved);
    return saved;
  }

  function replaceReviews(entries) {
    const prefix = 'el-review-v1:' + (boundUid ? boundUid + ':' : '');
    const keep = {};
    reviewShadow = {};
    (entries || []).forEach(entry => {
      if (!entry || !entry.chapter || !entry.unitId) return;
      const saved = noteReview(entry.chapter, entry.unitId, entry.data);
      keep[reviewStorageKey(entry.chapter, entry.unitId, boundUid)] = saved;
    });
    try {
      const box = resolveBox();
      if (typeof box.key !== 'function' || typeof box.length !== 'number') return;
      const doomed = [];
      for (let i = 0; i < box.length; i++) {
        const key = box.key(i);
        if (key && key.indexOf(prefix) === 0 && !Object.prototype.hasOwnProperty.call(keep, key)) doomed.push(key);
      }
      doomed.forEach(key => box.removeItem(key));
    } catch (e) {}
  }

  function clearReview(chapter, unitId, storage) {
    try {
      const box = resolveBox(storage);
      box.removeItem(reviewKeyFor(chapter, unitId, storage));
      if (!storage) delete reviewShadow[docId(chapter, unitId)];
    } catch (e) {}
  }

  function toReviewCloud(chapter, unitId, review) {
    const saved = normalizeReview(review);
    return {
      chapter: String(chapter),
      unitId: String(unitId),
      levels: saved.levels,
      updatedAt: new Date().toISOString()
    };
  }

  function mergeReview(cloud, incoming) {
    const base = normalizeReview(cloud);
    const extra = normalizeReview(incoming);
    Object.keys(extra.levels).forEach(id => { base.levels[id] = extra.levels[id]; });
    const ids = Object.keys(base.levels);
    if (ids.length > 8) {
      ids.sort((a, b) => String(base.levels[a].at).localeCompare(String(base.levels[b].at)));
      while (Object.keys(base.levels).length > 8) delete base.levels[ids.shift()];
    }
    return normalizeReview(base);
  }

  function reviewBodyHtml(levelReview, opts) {
    const wrong = (levelReview && levelReview.wrong) || [];
    const current = !!(opts && opts.current);
    const head = wrong.length
      ? ((current ? '這次這關錯了 ' : '上次這關錯了 ') + wrong.length + ' 題')
      : (current ? '這次全對！' : '上次全對！');
    let html = '<p class="wrong-head"><b>' + head + '</b></p>';
    wrong.forEach(item => {
      const q = spellClue(item.q);
      html += '<div class="wrong-item"><p>題目：' + escapeHtml(q) + '</p>'
        + '<p class="ans-bad">你的答案：' + escapeHtml(item.a || '（空白）') + '</p>'
        + '<p class="ans-good">正確答案：' + escapeHtml(item.c) + '</p></div>';
    });
    return html;
  }

  function spellClue(text) {
    const raw = String(text || '');
    if (raw === '看提示，用字母卡拼出單字。') return '這題的提示沒有另外記下來。';
    return raw;
  }

  function showGlyph(value) {
    return String(value == null ? '' : value).replace(/🗓️|📅/g, '🌾');
  }

  function parseScreenHash(hash) {
    let raw = String(hash == null ? '' : hash).replace(/^#\/?/, '');
    const play = /(^|\/)play$/.test(raw);
    raw = raw.replace(/(^|\/)play$/, '');
    const parts = raw.split('/').filter(Boolean);
    const out = { lesson: '', unit: '', play: play };
    for (let i = 0; i < parts.length - 1; i += 2) {
      const key = parts[i];
      const val = decodeURIComponent(parts[i + 1] || '');
      if (key === 'lesson' || key === 'unit') out[key] = val;
    }
    return out;
  }

  function screenHash(screen) {
    const s = screen || {};
    const bits = [];
    if (s.lesson) bits.push('lesson', encodeURIComponent(s.lesson));
    if (s.unit) bits.push('unit', encodeURIComponent(s.unit));
    if (s.play) bits.push('play');
    return bits.length ? '#/' + bits.join('/') : '#/';
  }

  const REWARD_META = [
    {
      id: 'reward1', need: NEED_MINUTES_30, minutes: 30, tier: 'star',
      short: 'Switch 30 分鐘', title: 'Switch 30 分鐘獎勵卡',
      redeem: '憑此卡可以玩 Switch 30 分鐘', kicker: '星星級'
    },
    {
      id: 'reward2', need: NEED_MINUTES_60, minutes: 60, tier: 'gold',
      short: 'Switch 60 分鐘', title: 'Switch 60 分鐘黃金卡',
      redeem: '憑此卡可以玩 Switch 60 分鐘', kicker: '黃金豪華'
    }
  ];

  function rewardMeta(id) {
    return REWARD_META.find(r => r.id === id) || null;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  const RULES_HTML = [
    '<h2>摘星換獎勵</h2>',
    '<ul>',
    '<li>這一單元有 <b>30</b> 題，答對 <b>1</b> 題就得 <b>1</b> 顆星。</li>',
    '<li>集到 <b>26</b> 顆星：可以玩 Switch <b>30</b> 分鐘。</li>',
    '<li>集滿 <b>30</b> 顆星：可以玩 Switch <b>60</b> 分鐘。</li>',
    '<li>你有 <b>3</b> 次計分機會，會留下最好的一次。</li>',
    '<li><b>3</b> 次用完後還可以再玩，但只是練習，不會再加星星，也不能再換獎勵。</li>',
    '<li>再玩的時候題目一樣，只是順序會變。</li>',
    '</ul>'
  ].join('');

  root.UnitScore = {
    STAR_MAX: STAR_MAX,
    ATTEMPT_LIMIT: ATTEMPT_LIMIT,
    NEED_MINUTES_30: NEED_MINUTES_30,
    NEED_MINUTES_60: NEED_MINUTES_60,
    storageKey: storageKey,
    emptyState: emptyState,
    normalize: normalize,
    best: best,
    attemptsUsed: attemptsUsed,
    attemptsLeft: attemptsLeft,
    isPractice: isPractice,
    earned: earned,
    createTally: createTally,
    noteWrong: noteWrong,
    rememberWrong: rememberWrong,
    wrongList: wrongList,
    noteRight: noteRight,
    countItems: countItems,
    unitItemCount: unitItemCount,
    shuffle: shuffle,
    choiceDeck: choiceDeck,
    levelIds: levelIds,
    runLevelStars: runLevelStars,
    runDoneCount: runDoneCount,
    commitLevel: commitLevel,
    restartRun: restartRun,
    memoryStorage: memoryStorage,
    docId: docId,
    mergeState: mergeState,
    toCloud: toCloud,
    switchMinutes: switchMinutes,
    summarize: summarize,
    bindUid: bindUid,
    setCloudWriter: setCloudWriter,
    noteCloud: noteCloud,
    resetSession: resetSession,
    markReady: markReady,
    whenReady: whenReady,
    load: load,
    save: save,
    clear: clear,
    previewView: previewView,
    hintText: hintText,
    chancesText: chancesText,
    todayISO: todayISO,
    formatDate: formatDate,
    howLine: howLine,
    levelMark: levelMark,
    loadReview: loadReview,
    saveReviewLevel: saveReviewLevel,
    saveReviewLevels: saveReviewLevels,
    noteReview: noteReview,
    replaceReviews: replaceReviews,
    clearReview: clearReview,
    setReviewWriter: setReviewWriter,
    toReviewCloud: toReviewCloud,
    mergeReview: mergeReview,
    reviewBodyHtml: reviewBodyHtml,
    showGlyph: showGlyph,
    parseScreenHash: parseScreenHash,
    screenHash: screenHash,
    REWARD_META: REWARD_META,
    rewardMeta: rewardMeta,
    escapeHtml: escapeHtml,
    RULES_HTML: RULES_HTML
  };
})(typeof window !== 'undefined' ? window : globalThis);
