'use strict';
const $ = id => document.getElementById(id);
const stripTags = html => String(html).replace(/<[^>]*>/g, '');
function restartAnim(el, cls){ el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

let laterIds = [];
function later(fn, ms){ const id = setTimeout(() => { laterIds = laterIds.filter(x => x !== id); fn(); }, ms); laterIds.push(id); return id; }
function clearLater(){
  laterIds.forEach(clearTimeout); laterIds = [];
  clearTimeout(toastTimer); $('toast').classList.remove('show');
  document.querySelectorAll('.confetti, .big-check').forEach(el => el.remove());
}
let toastTimer;
function toast(html, ms = 3200){ $('toast').innerHTML = html; $('toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), ms); }
function bigCheck(){ const d = document.createElement('div'); d.className = 'big-check'; d.textContent = '✔'; document.body.appendChild(d); later(() => d.remove(), 1100); }
function confetti(){
  const colors = ['#ff9800','#ffcf3f','#5dbb3f','#3b82f6','#e8433a','#8e3bd1'];
  for (let i = 0; i < 60; i++){
    const c = document.createElement('div'); c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw'; c.style.background = colors[i % colors.length];
    c.style.animationDelay = Math.random() * .8 + 's'; document.body.appendChild(c); later(() => c.remove(), 3400);
  }
}

const Sound = (() => {
  let ctx = null, muted = false, master = null, songTimer = null, songStep = 0, songNext = 0, song = null;
  const ensure = () => {
    if (!ctx){
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.22; master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  function tone(freq, start, dur, type = 'square', vol = .12){
    const c = ensure(); if (!c || muted) return;
    const t = c.currentTime + start, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + .02);
  }
  function note(f, t, dur, type, vol){
    if (!ctx || muted) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .03);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur + .2);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + .3);
  }
  function startBgm(){
    if (!ensure() || muted || songTimer) return;
    const root = 62, spb = 0.28, prog = [0, 5, 3, 4], penta = [0, 2, 4, 7, 9];
    song = {root, spb, prog, penta}; songStep = 0; songNext = ctx.currentTime + .05;
    const tick = () => {
      if (!ctx || muted) return;
      const talking = window.speechSynthesis && speechSynthesis.speaking;
      master.gain.setTargetAtTime(talking ? .05 : .22, ctx.currentTime, .08);
      while (songNext < ctx.currentTime + .35){
        const i = songStep % 32, bar = Math.floor(i / 8), t = songNext;
        const deg = penta[(i * 3 + bar) % 5];
        if (i % 2 === 0) note(440 * Math.pow(2, (root + 12 + deg - 69) / 12), t, spb * 1.4, 'triangle', .12);
        if (i % 8 === 0) note(440 * Math.pow(2, (root - 12 + [0,2,4,5,7,9,11][prog[bar]] - 69) / 12), t, spb * 6, 'sine', .1);
        songNext += spb; songStep++;
      }
    };
    songTimer = setInterval(tick, 100);
  }
  function stopBgm(){ if (songTimer){ clearInterval(songTimer); songTimer = null; } }
  return {
    unlock(){ ensure(); startBgm(); },
    toggle(){ muted = !muted; if (muted){ if (window.speechSynthesis) speechSynthesis.cancel(); stopBgm(); if (master) master.gain.setTargetAtTime(0, ctx ? ctx.currentTime : 0, .05); } else { startBgm(); } return muted; },
    get muted(){ return muted; },
    click(){ tone(880, 0, .05, 'square', .08); },
    ding(){ tone(1046, 0, .2, 'triangle', .2); tone(784, .15, .35, 'triangle', .2); },
    bad(){ tone(200, 0, .25, 'sawtooth', .08); tone(150, .12, .3, 'sawtooth', .08); },
    win(){ [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i * .11, .2, 'square', .09)); },
    tick(){ tone(1400, 0, .03, 'square', .04); }
  };
})();

function speak(text){
  if (!window.speechSynthesis || Sound.muted) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(stripTags(text));
  u.lang = 'zh-TW'; u.rate = .95;
  const v = speechSynthesis.getVoices().find(v => /zh[-_]TW/i.test(v.lang));
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}

const CHAPTER = 'science-ch3';
const REWARD_UNIT = '五上自然・神奇的水溶液';
const HONOR = { reward1: '水溶液小達人', reward2: '水溶液大師' };
const KIND = { hand: ['🖐️ 動手', 'k-hand'], idea: ['💡 觀念', 'k-idea'], boss: ['🔥 計時挑戰', 'k-boss'], adv: ['🎯 進階', 'k-adv'] };
const S = window.UnitScore;
function loadScore(unit){ return S.load(CHAPTER, unit.id); }
function saveScore(unit, state){ S.save(CHAPTER, unit.id, state); }
function portalScore(u){
  const st = loadScore(u);
  const b = S.best(st);
  const tag = S.earned(st, 'reward2') ? '60分鐘' : (S.earned(st, 'reward1') ? '30分鐘' : '');
  return `<span class="p-score"><b>★ ${b}</b> / ${S.STAR_MAX}${tag ? '・' + tag : ''}</span>`;
}

function showModal({icon = '', title = '', html = '', center = false, buttons = [{label: '好！', value: true}]}){
  return new Promise(resolve => {
    $('modal').innerHTML = `<div class="m-icon">${icon}</div><h3>${title}</h3><div class="m-body ${center ? 'center' : ''}">${html}</div>
      <div class="m-btns">${buttons.map((b, i) => `<button class="px-btn ${b.cls || ''}" data-i="${i}">${b.label}</button>`).join('')}</div>`;
    $('modal').querySelectorAll('.m-btns button').forEach(btn => btn.addEventListener('click', () => {
      Sound.click(); $('overlay').classList.remove('open'); resolve(buttons[+btn.dataset.i].value);
    }));
    $('overlay').classList.add('open'); $('modal').scrollTop = 0;
  });
}

let curUnit = null, curLevel = null, timerId = null, game = null;
function show(id){
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  $('homeBtn').hidden = id === 'lobby';
  stopTimer(); clearLater(); $('overlay').classList.remove('open');
  if (window.speechSynthesis) speechSynthesis.cancel();
  window.scrollTo(0, 0);
}
function controllerSVG(){
  return `<svg class="pad" viewBox="0 0 84 54" aria-hidden="true" focusable="false">
    <rect class="pad-l" x="1" y="18" width="18" height="32" rx="6"/>
    <rect class="pad-r" x="65" y="18" width="18" height="32" rx="6"/>
    <rect class="pad-body" x="16" y="4" width="52" height="36" rx="6"/>
    <rect class="pad-screen" x="30" y="10" width="24" height="16" rx="2"/>
    <path class="pad-ink" d="M22 24h5v-5h4v5h5v4h-5v5h-4v-5h-5z"/>
    <circle class="pad-a" cx="60" cy="14" r="2.4"/>
    <circle class="pad-b" cx="66" cy="20" r="2.4"/>
    <circle class="pad-c" cx="60" cy="26" r="2.4"/>
    <circle class="pad-d" cx="54" cy="20" r="2.4"/>
  </svg>`;
}
function rewardCardHTML(meta, unitName, iso, preview){
  const gold = meta.tier === 'gold';
  const dateLine = preview
    ? '預覽，不會記成已獲得'
    : (iso ? S.formatDate(iso) : '');
  return `<article class="ticket px${gold ? ' gold' : ''}">
    <div class="ticket-stub">
      <span class="stub-kicker">${meta.kicker}</span>
      ${controllerSVG()}
      <div class="stub-stars">${meta.minutes} 分</div>
      <div class="stub-word">獎勵卡</div>
    </div>
    <div class="ticket-main">
      <p class="ticket-unit">${S.escapeHtml(REWARD_UNIT)}・${S.escapeHtml(unitName)}</p>
      <h2 id="rewardTitle">${meta.title}</h2>
      ${gold ? '<div class="gems" aria-hidden="true"><i></i><i></i><i></i></div>' : ''}
      <p class="ticket-redeem">${meta.redeem}</p>
      <p class="ticket-honor">稱號：${HONOR[meta.id]}</p>
      <p class="ticket-date">${preview ? dateLine : '獲得日期：<time datetime="' + S.escapeHtml(iso) + '">' + dateLine + '</time>'}</p>
      <div class="sign-row"><span>爸爸簽名</span><i></i></div>
      <div class="sign-row"><span>兌換日期</span><i></i></div>
    </div>
  </article>`;
}
let rewardCloser = null;
function showRewardCard(meta, opts){
  const preview = !!(opts && opts.preview);
  const unitName = (opts && opts.unitName) || (curUnit ? curUnit.name : '這個小單元');
  const st = (!preview && curUnit) ? loadScore(curUnit) : null;
  const iso = preview ? '' : (st && st.rewards[meta.id]) || '';
  if (preview) S.previewView(S.todayISO());
  $('rewardCard').innerHTML = rewardCardHTML(meta, unitName, iso, preview);
  $('rewardOverlay').hidden = false;
  document.body.classList.add('reward-open');
  const tip = $('rewardTip');
  if (tip) tip.textContent = preview ? '這是預覽，不會幫孩子解鎖。' : '把這張卡給爸爸看，或列印下來兌換。';
  if (opts && opts.celebrate){
    confetti();
    if (meta.tier === 'gold') confetti();
    Sound.win();
  }
  return new Promise(resolve => {
    rewardCloser = () => {
      rewardCloser = null;
      $('rewardOverlay').hidden = true;
      document.body.classList.remove('reward-open');
      resolve();
    };
    $('rewardClose').focus();
  });
}
function renderRewards(u){
  const st = loadScore(u);
  const b = S.best(st);
  const hint = $('rewardHint');
  const text = S.hintText(b);
  hint.hidden = !text;
  hint.textContent = text;
  const status = $('scoreStatus');
  if (status) status.innerHTML = `目前最好 <b>★ ${b}</b> / ${S.STAR_MAX}　${S.chancesText(st)}`;
  const bar = $('scoreBar');
  if (bar){
    const pct = Math.round(b / S.STAR_MAX * 100);
    bar.setAttribute('aria-valuenow', String(b));
    bar.setAttribute('aria-valuemax', String(S.STAR_MAX));
    bar.querySelector('span').style.width = pct + '%';
  }
  const runNote = $('runNote');
  if (runNote){
    if (S.isPractice(st)) runNote.textContent = '';
    else if (st.run){
      const done = S.runDoneCount(st, S.levelIds(u));
      runNote.textContent = done
        ? `這次已玩完 ${done} 關，還沒算完。可以接著玩，或按「這次重來」。`
        : '';
    } else runNote.textContent = '';
  }
  const restart = $('restartRunBtn');
  if (restart) restart.hidden = S.isPractice(st) || !st.run;
  const list = $('rewardList');
  list.replaceChildren();
  S.REWARD_META.forEach(meta => {
    const got = S.earned(st, meta.id);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'peek-row' + (meta.tier === 'gold' ? ' gold' : '') + (got ? ' unlocked' : ' locked');
    btn.dataset.reward = meta.id;
    btn.setAttribute('aria-label', got ? meta.title + '，已解鎖，點開查看' : meta.title + '，還沒解鎖');
    btn.innerHTML = `<span class="peek-ico" aria-hidden="true">${controllerSVG()}</span>
      <span class="peek-title">${meta.short}</span>` + (got
      ? `<span class="peek-open">點開</span>`
      : `<span class="peek-lock" aria-hidden="true">🔒</span>`);
    btn.addEventListener('click', () => {
      if (!S.earned(loadScore(u), meta.id)){
        const left = S.hintText(S.best(loadScore(u)));
        toast(left ? '🔒 ' + left : '再努力一下就解鎖囉！');
        Sound.bad();
        return;
      }
      Sound.click();
      showRewardCard(meta, {unitName: u.name});
    });
    list.appendChild(btn);
  });
}
function renderLobby(){
  $('totalStars').textContent = '每個小單元自己集星，最多 30 顆，集滿就能換 Switch 時間。';
  $('portals').innerHTML = UNITS.map((u, i) => `<button class="portal px" data-u="${i}">
      <span class="p-icon">${u.icon}</span><span class="p-lv">${u.tag}</span>
      <span class="p-name">${u.name}</span><span class="p-desc">${u.lessons.join('<br>')}</span>
      ${portalScore(u)}</button>`).join('');
  $('portals').querySelectorAll('.portal').forEach(p => p.addEventListener('click', () => { Sound.click(); Sound.unlock(); openUnit(UNITS[+p.dataset.u]); }));
  $('topTitle').textContent = '🧪 五上自然・神奇的水溶液';
  show('lobby');
}

function openUnit(u){
  curUnit = u;
  const st = loadScore(u);
  $('unitTitle').textContent = `${u.icon} ${u.name}`;
  $('unitChip').textContent = `最好 ★ ${S.best(st)} / ${S.STAR_MAX}`;
  $('unitDesc').innerHTML = u.desc;
  $('rulesStrip').innerHTML = S.RULES_HTML;
  renderRewards(u);
  $('levels').innerHTML = u.levels.map((l, i) => `<button class="lv-card px" data-l="${i}">
      <span class="lv-ico">${l.icon}</span><span class="chip ${KIND[l.kind][1]}">${KIND[l.kind][0]}</span>
      <span class="lv-name">第 ${i + 1} 關：${l.name}</span><span class="lv-how">${S.howLine(l)}</span>
      <span class="lv-st">${S.levelMark(st, l.id)}</span></button>`).join('');
  $('levels').querySelectorAll('.lv-card').forEach(c => c.addEventListener('click', () => { Sound.click(); startLevel(u.levels[+c.dataset.l]); }));
  $('topTitle').textContent = `${u.icon} ${u.name}`;
  show('unit');
}

function startLevel(level){
  curLevel = level;
  const st = loadScore(curUnit);
  const practice = S.isPractice(st);
  const replay = !practice && S.runLevelStars(st, level.id) !== null;
  show('play');
  game = { level, tally: S.createTally(), over: false, practice, replay, items: S.countItems(level) };
  $('lvTitle').textContent = `${level.icon} ${level.name}`;
  $('lvKind').textContent = KIND[level.kind][0]; $('lvKind').className = 'chip ' + KIND[level.kind][1];
  $('lvProg').textContent = '';
  $('stage').innerHTML = '';
  const banner = $('practiceBanner');
  if (practice){
    banner.hidden = false;
    banner.textContent = '練習模式，這次不會算星星';
  } else if (replay){
    banner.hidden = false;
    banner.textContent = '這一關這次已經算過了，再玩不會改分數。';
  } else banner.hidden = true;
  if (level.time) startTimer(level.time);
  RENDER[level.type](level);
}
function setAsk(html){ $('lvAsk').innerHTML = html; }
function setProg(i, n){ $('lvProg').textContent = `${i} / ${n}`; }
function missItem(id, tip){
  S.noteWrong(game.tally, id);
  Sound.bad();
  const msg = tip || '這次沒答對，這顆星拿不到。';
  toast('🤔 ' + msg, 4200);
}
function goodItem(id){
  const before = game.tally.right;
  S.noteRight(game.tally, id);
  Sound.ding();
  if (game.tally.right === before) toast('放對了，可是這顆星剛剛已經拿不到了。', 2200);
}

function startTimer(sec){
  let left = sec;
  const el = $('lvTimer'); el.hidden = false; el.textContent = `⏱ ${left} 秒`;
  timerId = setInterval(() => {
    left--; el.textContent = `⏱ ${left} 秒`;
    if (left <= 10 && left > 0) Sound.tick();
    if (left <= 0){ stopTimer(); timeUp(); }
  }, 1000);
}
function stopTimer(){ clearInterval(timerId); timerId = null; $('lvTimer').hidden = true; }
async function timeUp(){
  if (!game || game.over) return;
  game.over = true;
  const v = await showModal({icon: '⏰', title: '時間到！', center: true,
    html: '這一關還沒玩完，不會扣掉計分機會，也不會先鎖住這次的分數。可以再挑戰這一關。',
    buttons: [{label: '🔁 再挑戰', value: 'again', cls: 'orange'}, {label: '📋 回單元', value: 'unit', cls: 'wood'}]});
  v === 'again' ? startLevel(curLevel) : openUnit(curUnit);
}

async function finishLevel(){
  if (!game || game.over) return;
  game.over = true; stopTimer();
  const stars = game.tally.right;
  const before = loadScore(curUnit);
  const result = S.commitLevel(before, {
    levelId: curLevel.id,
    stars: stars,
    levelIds: S.levelIds(curUnit),
    iso: S.todayISO()
  });
  if (result.wrote) saveScore(curUnit, result.state);
  const after = result.wrote ? result.state : before;
  if (stars && !game.practice) { Sound.win(); confetti(); } else if (!game.practice && stars === 0) Sound.bad();
  else if (game.practice) Sound.ding();
  const idx = curUnit.levels.indexOf(curLevel), next = curUnit.levels[idx + 1];
  const btns = [{label: '🔁 再玩一次', value: 'again', cls: 'wood'}];
  if (next) btns.push({label: '▶ 下一關', value: 'next', cls: 'orange'});
  btns.push({label: '📋 回單元', value: 'unit', cls: 'stone'});
  let html = `<div class="m-stars">★ ${stars} / ${game.items}</div>`;
  if (game.practice || result.practice) html += '練習模式，這次不會算星星。';
  else if (game.replay || result.replay) html += '這一關這次已經算過了，分數沒有改變。';
  else if (result.completed){
    html += `這一關得到 ${stars} 顆星。<br>這一單元這次共 <b>${result.total}</b> 顆星。最好成績 ★ ${S.best(after)} / ${S.STAR_MAX}。<br>${S.chancesText(after)}`;
  } else html += `這一關得到 ${stars} 顆星。<br>四關都玩完，才會用掉 1 次計分機會。`;
  if (curLevel.recap) html += `<div class="explain" style="margin-top:10px;text-align:left">📌 ${curLevel.recap}</div>`;
  const v = await showModal({icon: stars ? '🎉' : '💪', title: game.practice ? '練習結束' : '這一關玩完了', center: true,
    html, buttons: btns});
  for (const id of result.unlocked){
    const meta = S.rewardMeta(id);
    if (meta) await showRewardCard(meta, {celebrate: true, unitName: curUnit.name});
  }
  if (v === 'again') startLevel(curLevel);
  else if (v === 'next') startLevel(next);
  else openUnit(curUnit);
}

function makeDraggable(card, {findTarget, onDrop, onTap}){
  let st = null;
  card.addEventListener('pointerdown', e => {
    if (card.classList.contains('ok') || game.over) return;
    e.preventDefault(); Sound.unlock();
    st = {x: e.clientX, y: e.clientY, id: e.pointerId, moved: false, ghost: null, over: null};
    card.setPointerCapture(e.pointerId);
  });
  card.addEventListener('pointermove', e => {
    if (!st || st.id !== e.pointerId) return;
    if (!st.moved && Math.hypot(e.clientX - st.x, e.clientY - st.y) > 8){
      st.moved = true;
      const r = card.getBoundingClientRect();
      st.ghost = card.cloneNode(true); st.ghost.classList.add('dragging'); st.ghost.classList.remove('sel');
      st.ghost.style.width = r.width + 'px'; st.dx = e.clientX - r.left; st.dy = e.clientY - r.top;
      document.body.appendChild(st.ghost); card.classList.add('placeholder');
    }
    if (st.moved){
      st.ghost.style.left = (e.clientX - st.dx) + 'px'; st.ghost.style.top = (e.clientY - st.dy) + 'px';
      const t = findTarget(document.elementFromPoint(e.clientX, e.clientY), e.clientX, e.clientY);
      if (t !== st.over){ st.over && st.over.classList.remove('over'); t && t.classList.add('over'); st.over = t; }
      const zone = Math.max(56, innerHeight * 0.13);
      if (e.clientY < zone) window.scrollBy(0, -10);
      else if (e.clientY > innerHeight - zone) window.scrollBy(0, 10);
    }
  });
  const end = e => {
    if (!st || st.id !== e.pointerId) return;
    const s = st; st = null;
    if (s.moved){
      s.ghost.remove(); card.classList.remove('placeholder'); s.over && s.over.classList.remove('over');
      if (s.over) onDrop(card, s.over);
    } else if (e.type === 'pointerup') onTap(card);
  };
  card.addEventListener('pointerup', end);
  card.addEventListener('pointercancel', end);
}

function quizWhy(q){
  return `<div class="explain" style="margin-top:10px">💡 ${q.why || '答對了！'}${q.trap ? `<div class="trap">⚠️ 小心陷阱：${q.trap}</div>` : ''}</div>`;
}
const RENDER = {
  sort(lv){
    setAsk(lv.ask);
    const items = S.shuffle(lv.items);
    let done = 0, selected = null;
    $('stage').innerHTML = `<div class="panel px"><div class="tray" id="tray"></div></div><div class="bins" id="bins"></div>`;
    $('bins').innerHTML = lv.bins.map(b => `<div class="bin px tapme" data-b="${b.id}"><h3>${b.icon} ${b.name}</h3><div class="bin-items"></div></div>`).join('');
    setProg(0, items.length);
    const tray = $('tray');
    const drop = (card, bin) => {
      if (card.classList.contains('ok') || game.over) return;
      const it = items[+card.dataset.i];
      const key = 's' + card.dataset.i;
      if (selected){ selected.classList.remove('sel'); selected = null; }
      if (it.bin === bin.dataset.b){
        goodItem(key); card.classList.add('ok'); bin.querySelector('.bin-items').appendChild(card);
        restartAnim(bin, 'flash-ok'); done++; setProg(done, items.length);
        if (it.tip) toast('✅ ' + it.tip, 2600);
        if (done === items.length) later(finishLevel, 600);
      } else {
        restartAnim(card, 'shake'); missItem(key, it.hint || '放錯了，這顆星拿不到。再放到對的箱子才能過關。');
      }
    };
    items.forEach((it, i) => {
      const c = document.createElement('div'); c.className = 'chipcard'; c.dataset.i = i;
      c.innerHTML = `<span class="em">${it.em}</span><span class="tx">${it.t}</span>`;
      makeDraggable(c, {
        findTarget: el => el && el.closest('.bin'),
        onDrop: drop,
        onTap: card => { Sound.click(); if (selected) selected.classList.remove('sel'); selected = selected === card ? null : card; selected && selected.classList.add('sel'); }
      });
      tray.appendChild(c);
    });
    $('bins').querySelectorAll('.bin').forEach(b => b.addEventListener('click', () => { if (selected && !game.over) drop(selected, b); }));
  },

  quiz(lv){
    const qs = S.shuffle(lv.questions);
    let qi = 0;
    const step = () => {
      if (game.over) return;
      if (qi >= qs.length) return finishLevel();
      const q = qs[qi]; setProg(qi + 1, qs.length); setAsk(q.q);
      const opts = S.choiceDeck(q.opts);
      let locked = false;
      $('stage').innerHTML = `<div class="panel px">${q.art ? `<div class="q-art">${q.art}</div>` : ''}
        <div class="opts">${opts.map((o, i) => `<button class="px-btn opt" data-i="${i}">${'ABCD'[i]}. ${o.t}</button>`).join('')}</div>
        <div id="why"></div></div>`;
      $('stage').querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
        if (game.over || locked) return;
        locked = true;
        const picked = +b.dataset.i;
        const o = opts[picked];
        const key = 'q' + qi;
        if (o.right){ goodItem(key); bigCheck(); }
        else missItem(key, q.hint || '這題沒答對，這顆星拿不到。');
        $('stage').querySelectorAll('.opt').forEach(x => {
          x.disabled = true;
          const choice = opts[+x.dataset.i];
          if (choice.right) x.classList.add('right');
          else if (+x.dataset.i === picked){ x.classList.add('wrong'); restartAnim(x, 'shake'); }
        });
        $('why').innerHTML = quizWhy(q) +
          `<div class="next-row" style="margin-top:10px"><button class="px-btn orange" id="nextQ">${qi + 1 < qs.length ? '下一題 ▶' : '完成 🏁'}</button></div>`;
        $('nextQ').addEventListener('click', () => { Sound.click(); qi++; step(); });
      }));
    };
    step();
  },

  order(lv){
    let ri = 0;
    const round = () => {
      if (game.over) return;
      if (ri >= lv.rounds.length) return finishLevel();
      const r = lv.rounds[ri]; setAsk(r.ask);
      let next = 0;
      $('stage').innerHTML = `<div class="panel px"><div class="slots" id="slots">${r.items.map((_, i) =>
          `<div class="slot" data-s="${i}"><span class="n">${r.labels ? r.labels[i] : i + 1}</span></div>`).join('<span class="arrow">➜</span>')}</div></div>
        <div class="panel px"><div class="tray" id="tray"></div></div><div id="why"></div>`;
      setProg(0, r.items.length);
      const tryPlace = card => {
        if (card.classList.contains('ok') || game.over) return;
        const i = +card.dataset.i;
        const key = 'r' + ri + '-' + i;
        if (i === next){
          goodItem(key); const slot = $('slots').children[next * 2];
          slot.classList.add('filled'); slot.innerHTML = `<span class="em">${r.items[i].em}</span>${r.items[i].t}`;
          card.remove(); next++; setProg(next, r.items.length);
          if (next === r.items.length){
            $('why').innerHTML = `<div class="explain">💡 ${r.why || '順序完全正確！'}</div>
              <div class="next-row" style="margin-top:10px"><button class="px-btn orange" id="nextR">${ri + 1 < lv.rounds.length ? '下一回合 ▶' : '完成 🏁'}</button></div>`;
            $('nextR').addEventListener('click', () => { Sound.click(); ri++; round(); });
          }
        } else {
          restartAnim(card, 'shake'); missItem(key, r.items[i].hint || `「${r.items[i].t}」還不是下一個，這顆星拿不到。`);
        }
      };
      S.shuffle(r.items.map((it, i) => ({...it, i}))).forEach(it => {
        const c = document.createElement('div'); c.className = 'chipcard'; c.dataset.i = it.i;
        c.innerHTML = `<span class="em">${it.em}</span><span class="tx">${it.t}</span>`;
        makeDraggable(c, {findTarget: el => el && el.closest('.slots'), onDrop: tryPlace, onTap: tryPlace});
        $('tray').appendChild(c);
      });
    };
    round();
  }
};

$('homeBtn').addEventListener('click', () => { Sound.click(); $('play').classList.contains('active') && curUnit ? openUnit(curUnit) : renderLobby(); });
$('muteBtn').addEventListener('click', () => { const m = Sound.toggle(); $('muteBtn').textContent = m ? '🔇' : '🔊'; });
$('sayBtn').addEventListener('click', () => { Sound.unlock(); speak($('lvAsk').innerHTML); });
$('restartRunBtn').addEventListener('click', async () => {
  if (!curUnit) return;
  const ok = await showModal({icon: '🔁', title: '這次重來？', center: true,
    html: '這一次已經玩完的關會清掉。計分次數不會減少。',
    buttons: [{label: '確定重來', value: true, cls: 'orange'}, {label: '取消', value: false, cls: 'stone'}]});
  if (!ok) return;
  saveScore(curUnit, S.restartRun(loadScore(curUnit)));
  openUnit(curUnit);
});
$('resetBtn').addEventListener('click', async () => {
  if (!curUnit) return;
  const ok = await showModal({icon: '🧹', title: '清除這一單元的星星？', center: true,
    html: '這一單元的星星、3 次分數，還有獎勵卡日期，都會清掉。其他單元不會動。',
    buttons: [{label: '確定清除', value: true, cls: 'red'}, {label: '取消', value: false, cls: 'stone'}]});
  if (!ok) return;
  S.clear(CHAPTER, curUnit.id);
  openUnit(curUnit);
});
$('rewardClose').addEventListener('click', () => { Sound.click(); if (rewardCloser) rewardCloser(); });
$('rewardPrint').addEventListener('click', () => { Sound.click(); window.print(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && rewardCloser) rewardCloser(); });
document.addEventListener('pointerdown', () => Sound.unlock(), {once: true});
if (window.speechSynthesis) speechSynthesis.getVoices();
renderLobby();
{
  const preview = S.rewardMeta(new URLSearchParams(location.search).get('preview'));
  if (preview) showRewardCard(preview, {celebrate: true, preview: true, unitName: '預覽'});
}
