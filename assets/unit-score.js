/* 每個小單元自己的 30 顆星、3 次計分、獎勵日期。
   舊的整章星星（formosa-g5-stars、social-ch3-stars 等）完全不讀。
   預覽獎勵卡不會寫入獲得日期。 */
(function (root) {
  const STAR_MAX = 30;
  const ATTEMPT_LIMIT = 3;
  const NEED_MINUTES_30 = 26;
  const NEED_MINUTES_60 = 30;
  const REWARD_IDS = ['reward1', 'reward2'];

  function storageKey(chapter, unitId) {
    return 'el-score-v2:' + chapter + ':' + unitId;
  }

  function emptyState() {
    return { scores: [], rewards: {}, run: null };
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
    return { right: 0, miss: 0, missed: {} };
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
      return { state: next, wrote: false, practice: true, replay: false, completed: false, total: null, unlocked: [] };
    }
    if (next.run && Object.prototype.hasOwnProperty.call(next.run.levels, levelId)) {
      return { state: next, wrote: false, practice: false, replay: true, completed: false, total: null, unlocked: [] };
    }
    if (!next.run) next.run = { levels: {} };
    next.run.levels[levelId] = stars;
    const done = ids.length > 0 && ids.every(id => Object.prototype.hasOwnProperty.call(next.run.levels, id));
    const unlocked = [];
    let total = null;
    let completed = false;
    if (done) {
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
    return { state: next, wrote: true, practice: false, replay: false, completed: completed, total: total, unlocked: unlocked };
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
    const box = storage || root.localStorage;
    try {
      const raw = box.getItem(storageKey(chapter, unitId));
      return normalize(raw ? JSON.parse(raw) : null);
    } catch (e) {
      return emptyState();
    }
  }

  function save(chapter, unitId, state, storage) {
    const box = storage || root.localStorage;
    box.setItem(storageKey(chapter, unitId), JSON.stringify(normalize(state)));
  }

  function clear(chapter, unitId, storage) {
    const box = storage || root.localStorage;
    box.removeItem(storageKey(chapter, unitId));
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

  function levelMark(state, levelId) {
    if (isPractice(state)) return '練習';
    const stars = runLevelStars(state, levelId);
    if (stars === null) return '這次還沒玩';
    return '這次 ★ ' + stars;
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
    REWARD_META: REWARD_META,
    rewardMeta: rewardMeta,
    escapeHtml: escapeHtml,
    RULES_HTML: RULES_HTML
  };
})(typeof window !== 'undefined' ? window : globalThis);
