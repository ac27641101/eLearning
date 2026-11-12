'use strict';
const $ = id => document.getElementById(id);
const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
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

const Store = {
  key: 'social-ch3-stars',
  mem: {},
  get(){ try { return JSON.parse(localStorage.getItem(this.key)) || {}; } catch(e){ return this.mem; } },
  set(id, stars){
    const s = this.get(); s[id] = Math.max(s[id] || 0, stars); this.mem = s;
    try { localStorage.setItem(this.key, JSON.stringify(s)); } catch(e){}
  },
  clear(){ this.mem = {}; try { localStorage.removeItem(this.key); } catch(e){} }
};
function starsFor(miss, total){
  total = Math.max(1, total);
  if (miss === 0) return 3;
  if (miss <= Math.max(1, Math.round(total / 4))) return 2;
  return miss <= total / 2 ? 1 : 0;
}
function starVerdict(stars, miss){
  return stars === 3 ? '全對！太厲害了！'
    : stars === 2 ? `答錯 ${miss} 次，很棒！再細心一點就能拿到 3 顆星。`
    : stars === 1 ? `答錯 ${miss} 次，過關了！再複習一下，可以拿到更多星星。`
    : `答錯 ${miss} 次，這次還沒拿到星星。先看看下面的重點，再挑戰一次吧！💪`;
}
const starHTML = n => '<b>' + '★'.repeat(n) + '</b>' + '☆'.repeat(3 - n);
const KIND = { hand: ['🖐️ 動手', 'k-hand'], idea: ['💡 觀念', 'k-idea'], boss: ['🔥 計時挑戰', 'k-boss'], adv: ['🎯 進階', 'k-adv'] };

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
function unitStars(u){ const s = Store.get(); return u.levels.reduce((n, l) => n + (s[l.id] || 0), 0); }

/* 新增獎勵：在 REWARDS 加一筆即可。id 用 reward3 這種名字，預覽網址就是 ?preview=reward3。 */
const REWARD_UNIT = '五上社會・臺灣的物產資源';
const REWARDS = [
  {
    id: 'reward1', need: 24, tier: 'star',
    short: 'Switch 1 小時獎勵卡',
    title: 'Switch 遊戲 1 小時 獎勵卡',
    redeem: '憑此卡可兌換 Switch 遊戲時間 1 小時',
    honor: '臺灣物產小達人',
    badge: '🎮 我的 1 小時獎勵卡'
  },
  {
    id: 'reward2', need: 48, tier: 'gold',
    short: 'Switch 3 小時獎勵卡',
    title: 'Switch 遊戲 3 小時 獎勵卡',
    redeem: '憑此卡可兌換 Switch 遊戲時間 3 小時',
    honor: '物產資源大師',
    badge: '💎 我的 3 小時獎勵卡'
  }
];
const RewardStore = {
  key: 'social-ch3-rewards',
  all(){ try { return JSON.parse(localStorage.getItem(this.key)) || {}; } catch (e) { return {}; } },
  date(id){ return this.all()[id] || ''; },
  set(id, iso){
    const bag = this.all(); bag[id] = iso;
    try { localStorage.setItem(this.key, JSON.stringify(bag)); } catch (e) {}
  }
};
function starTotal(){ return UNITS.reduce((n, u) => n + unitStars(u), 0); }
function starMax(){ return UNITS.reduce((n, u) => n + u.levels.length * 3, 0); }
function todayISO(){
  const d = new Date(), z = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
}
function formatDate(iso){
  const p = String(iso || '').split('-');
  if (p.length !== 3) return iso || '';
  return Number(p[0]) + '年' + Number(p[1]) + '月' + Number(p[2]) + '日';
}
function isEarned(reward){ return !!RewardStore.date(reward.id) || starTotal() >= reward.need; }
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
function rewardCardHTML(reward, iso){
  const gold = reward.tier === 'gold';
  return `<article class="ticket px${gold ? ' gold' : ''}">
    <div class="ticket-stub">
      <span class="stub-kicker">${gold ? '鑽石級' : '星星級'}</span>
      ${controllerSVG()}
      <div class="stub-stars">★ ${reward.need}</div>
      <div class="stub-word">獎勵卡</div>
    </div>
    <div class="ticket-main">
      <p class="ticket-unit">${REWARD_UNIT}</p>
      <h2 id="rewardTitle">${reward.title}</h2>
      ${gold ? '<div class="gems" aria-hidden="true"><i></i><i></i><i></i></div>' : ''}
      <p class="ticket-redeem">${reward.redeem}</p>
      <p class="ticket-honor">稱號：${reward.honor}</p>
      <p class="ticket-date">獲得日期：<time datetime="${iso}">${formatDate(iso)}</time></p>
      <div class="sign-row"><span>爸爸簽名</span><i></i></div>
      <div class="sign-row"><span>兌換日期</span><i></i></div>
    </div>
  </article>`;
}
let rewardCloser = null;
function showRewardCard(reward, opts){
  const preview = !!(opts && opts.preview);
  if (!preview && starTotal() >= reward.need && !RewardStore.date(reward.id)) RewardStore.set(reward.id, todayISO());
  const iso = RewardStore.date(reward.id) || todayISO();
  $('rewardCard').innerHTML = rewardCardHTML(reward, iso);
  $('rewardOverlay').hidden = false;
  document.body.classList.add('reward-open');
  if (opts && opts.celebrate){
    confetti();
    if (reward.tier === 'gold') confetti();
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
function renderRewards(){
  const all = starTotal();
  const next = REWARDS.find(r => !isEarned(r));
  const hint = $('rewardHint');
  if (next){
    hint.hidden = false;
    hint.textContent = `再 ${next.need - all} 顆星就能拿到 ${next.short}！`;
  } else {
    hint.hidden = true;
    hint.textContent = '';
  }
  const list = $('rewardList');
  list.replaceChildren();
  REWARDS.forEach(r => {
    const earned = isEarned(r);
    const have = earned ? r.need : Math.min(all, r.need);
    const pct = Math.round(have / r.need * 100);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'peek-row' + (r.tier === 'gold' ? ' gold' : '') + (earned ? ' unlocked' : ' locked');
    btn.dataset.reward = r.id;
    btn.setAttribute('aria-label', earned
      ? r.title + '，已解鎖，點開查看'
      : r.title + '，尚未解鎖，' + have + '/' + r.need);
    btn.innerHTML = `<span class="peek-ico" aria-hidden="true">${controllerSVG()}</span>
      <span class="peek-title">${r.short}</span>` + (earned
      ? `<span class="peek-open">點開</span>`
      : `<span class="peek-lock" aria-hidden="true">🔒</span>
         <span class="peek-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${r.need}" aria-valuenow="${have}"><span style="width:${pct}%"></span></span>
         <span class="peek-count">${have}/${r.need}</span>`);
    btn.addEventListener('click', () => {
      if (!isEarned(r)){
        const left = r.need - starTotal();
        toast(left > 0 ? `🔒 再 ${left} 顆星就解鎖囉，加油！` : '再努力一下就解鎖囉！');
        Sound.bad();
        return;
      }
      Sound.click();
      showRewardCard(r);
    });
    list.appendChild(btn);
  });
}
async function celebratePending(){
  const all = starTotal();
  for (const r of REWARDS){
    if (all >= r.need && !RewardStore.date(r.id)){
      RewardStore.set(r.id, todayISO());
      renderRewards();
      await showRewardCard(r, {celebrate: true});
    }
  }
}

function renderLobby(){
  const all = starTotal(), max = starMax();
  $('totalStars').innerHTML = `目前收集 <b>★ ${all}</b> / ${max}` + (all === max && max ? '　🏆 你是物產資源大師！' : '');
  renderRewards();
  $('portals').innerHTML = UNITS.map((u, i) => {
    const s = Store.get();
    const groups = u.levels.map(l => `<span class="star-grp">${starHTML(s[l.id] || 0)}</span>`).join('');
    return `<button class="portal px" data-u="${i}">
      <span class="p-icon">${u.icon}</span><span class="p-lv">${u.tag}</span>
      <span class="p-name">${u.name}</span><span class="p-desc">${u.lessons.join('、')}</span>
      <span class="p-stars">${groups}</span></button>`;
  }).join('');
  $('portals').querySelectorAll('.portal').forEach(p => p.addEventListener('click', () => { Sound.click(); Sound.unlock(); openUnit(UNITS[+p.dataset.u]); }));
  $('topTitle').textContent = '🌾 五上社會・臺灣的物產資源';
  show('lobby');
}

function openUnit(u){
  curUnit = u;
  const s = Store.get();
  $('unitTitle').textContent = `${u.icon} ${u.name}`;
  $('unitChip').textContent = `★ ${unitStars(u)} / ${u.levels.length * 3}`;
  $('unitDesc').innerHTML = u.desc;
  $('levels').innerHTML = u.levels.map((l, i) => `<button class="lv-card px" data-l="${i}">
      <span class="lv-ico">${l.icon}</span><span class="chip ${KIND[l.kind][1]}">${KIND[l.kind][0]}</span>
      <span class="lv-name">第 ${i + 1} 關：${l.name}</span><span class="lv-how">${l.how}</span>
      <span class="lv-st">${starHTML(s[l.id] || 0)}</span></button>`).join('');
  $('levels').querySelectorAll('.lv-card').forEach(c => c.addEventListener('click', () => { Sound.click(); startLevel(u.levels[+c.dataset.l]); }));
  $('topTitle').textContent = `${u.icon} ${u.name}`;
  show('unit');
}

function startLevel(level){
  curLevel = level;
  show('play');
  game = { level, miss: 0, right: 0, over: false };
  $('lvTitle').textContent = `${level.icon} ${level.name}`;
  $('lvKind').textContent = KIND[level.kind][0]; $('lvKind').className = 'chip ' + KIND[level.kind][1];
  $('lvProg').textContent = '';
  $('stage').innerHTML = '';
  if (level.time) startTimer(level.time);
  RENDER[level.type](level);
}
function setAsk(html){ $('lvAsk').innerHTML = html; }
function setProg(i, n){ $('lvProg').textContent = `${i} / ${n}`; }
function miss(tip){ game.miss++; Sound.bad(); if (tip) toast('🤔 ' + tip, 4200); }
function good(){ if (game) game.right++; Sound.ding(); }

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
    html: '差一點點！計時挑戰要在時間內完成喔。<br>先複習一下觀念關，再來挑戰吧！',
    buttons: [{label: '🔁 再挑戰', value: 'again', cls: 'orange'}, {label: '📋 回單元', value: 'unit', cls: 'wood'}]});
  v === 'again' ? startLevel(curLevel) : openUnit(curUnit);
}

async function finishLevel(){
  if (!game || game.over) return;
  game.over = true; stopTimer();
  const before = starTotal();
  const stars = starsFor(game.miss, game.right);
  Store.set(curLevel.id, stars);
  const after = starTotal();
  const crossed = REWARDS.filter(r => before < r.need && after >= r.need && !RewardStore.date(r.id));
  if (stars) { Sound.win(); confetti(); } else Sound.bad();
  const idx = curUnit.levels.indexOf(curLevel), next = curUnit.levels[idx + 1];
  const btns = [{label: '🔁 再玩一次', value: 'again', cls: 'wood'}];
  if (next) btns.push({label: '▶ 下一關', value: 'next', cls: 'orange'});
  btns.push({label: '📋 回單元', value: 'unit', cls: 'stone'});
  const v = await showModal({icon: stars ? '🎉' : '💪', title: stars ? '過關！' : '再試一次！', center: true,
    html: `<div class="m-stars">${starHTML(stars)}</div>${starVerdict(stars, game.miss)}
      ${curLevel.recap ? `<div class="explain" style="margin-top:10px;text-align:left">📌 ${curLevel.recap}</div>` : ''}`,
    buttons: btns});
  for (const r of crossed){
    RewardStore.set(r.id, todayISO());
    await showRewardCard(r, {celebrate: true});
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

const RENDER = {
  sort(lv){
    setAsk(lv.ask);
    const items = shuffle(lv.items);
    let done = 0, selected = null;
    $('stage').innerHTML = `<div class="panel px"><div class="tray" id="tray"></div></div><div class="bins" id="bins"></div>`;
    $('bins').innerHTML = lv.bins.map(b => `<div class="bin px tapme" data-b="${b.id}"><h3>${b.icon} ${b.name}</h3><div class="bin-items"></div></div>`).join('');
    setProg(0, items.length);
    const tray = $('tray');
    const drop = (card, bin) => {
      const it = items[+card.dataset.i];
      if (selected){ selected.classList.remove('sel'); selected = null; }
      if (it.bin === bin.dataset.b){
        good(); card.classList.add('ok'); bin.querySelector('.bin-items').appendChild(card);
        restartAnim(bin, 'flash-ok'); done++; setProg(done, items.length);
        if (it.tip) toast('✅ ' + it.tip, 2600);
        if (done === items.length) later(finishLevel, 600);
      } else {
        restartAnim(card, 'shake'); miss(it.hint || '再想想看，它應該放在別的地方喔！');
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
    const qs = lv.shuffle === false ? lv.questions : shuffle(lv.questions);
    let qi = 0;
    const step = () => {
      if (game.over) return;
      if (qi >= qs.length) return finishLevel();
      const q = qs[qi]; setProg(qi + 1, qs.length); setAsk(q.q);
      const opts = shuffle(q.opts.map((t, i) => ({t, right: i === 0})));
      $('stage').innerHTML = `<div class="panel px">${q.art ? `<div class="q-art">${q.art}</div>` : ''}
        <div class="opts">${opts.map((o, i) => `<button class="px-btn opt" data-i="${i}">${'ABCD'[i]}. ${o.t}</button>`).join('')}</div>
        <div id="why"></div></div>`;
      $('stage').querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
        if (game.over) return;
        const o = opts[+b.dataset.i];
        if (o.right){
          good(); bigCheck(); b.classList.add('right');
          $('stage').querySelectorAll('.opt').forEach(x => x.disabled = true);
          $('why').innerHTML = `<div class="explain" style="margin-top:10px">💡 ${q.why || '答對了！'}${q.trap ? `<div class="trap">⚠️ 小心陷阱：${q.trap}</div>` : ''}</div>
            <div class="next-row" style="margin-top:10px"><button class="px-btn orange" id="nextQ">${qi + 1 < qs.length ? '下一題 ▶' : '完成 🏁'}</button></div>`;
          $('nextQ').addEventListener('click', () => { Sound.click(); qi++; step(); });
        } else {
          b.classList.add('wrong'); b.disabled = true; restartAnim(b, 'shake');
          miss(q.hint || '不是這個喔，再想一想！');
          $('why').innerHTML = `<div class="explain" style="margin-top:10px">💡 ${q.why || ''}${q.trap ? `<div class="trap">⚠️ 小心陷阱：${q.trap}</div>` : ''}</div>`;
        }
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
        const i = +card.dataset.i;
        if (i === next){
          good(); const slot = $('slots').children[next * 2];
          slot.classList.add('filled'); slot.innerHTML = `<span class="em">${r.items[i].em}</span>${r.items[i].t}`;
          card.remove(); next++; setProg(next, r.items.length);
          if (next === r.items.length){
            $('why').innerHTML = `<div class="explain">💡 ${r.why || '順序完全正確！'}</div>
              <div class="next-row" style="margin-top:10px"><button class="px-btn orange" id="nextR">${ri + 1 < lv.rounds.length ? '下一回合 ▶' : '完成 🏁'}</button></div>`;
            $('nextR').addEventListener('click', () => { Sound.click(); ri++; round(); });
          }
        } else {
          restartAnim(card, 'shake'); miss(r.items[i].hint || `「${r.items[i].t}」不是第 ${next + 1} 個喔！`);
        }
      };
      shuffle(r.items.map((it, i) => ({...it, i}))).forEach(it => {
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
$('resetBtn').addEventListener('click', async () => {
  const ok = await showModal({icon: '🧹', title: '清除星星？', center: true, html: '所有關卡的星星紀錄都會歸零喔！已經拿到的獎勵卡還在。',
    buttons: [{label: '確定清除', value: true, cls: 'red'}, {label: '取消', value: false, cls: 'stone'}]});
  if (ok){ Store.clear(); renderLobby(); }
});
$('rewardClose').addEventListener('click', () => { Sound.click(); if (rewardCloser) rewardCloser(); });
$('rewardPrint').addEventListener('click', () => { Sound.click(); window.print(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && rewardCloser) rewardCloser(); });
document.addEventListener('pointerdown', () => Sound.unlock(), {once: true});
if (window.speechSynthesis) speechSynthesis.getVoices();
renderLobby();
{
  const preview = REWARDS.find(r => r.id === new URLSearchParams(location.search).get('preview'));
  if (preview) showRewardCard(preview, {celebrate: true, preview: true});
  else celebratePending();
}
