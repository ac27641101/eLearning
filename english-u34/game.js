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
function pickEnglishVoice(){
  if (!window.speechSynthesis) return null;
  const voices = speechSynthesis.getVoices();
  const enUS = voices.filter(v => /en[-_]US/i.test(v.lang));
  return enUS.find(v => /female|samantha|karen|google us english|zira|jenny/i.test(v.name))
    || enUS[0]
    || voices.find(v => /^en/i.test(v.lang))
    || null;
}
function speakEN(text, rate){
  return new Promise(resolve => {
    if (!window.speechSynthesis){ resolve('none'); return; }
    const voices = speechSynthesis.getVoices();
    const voice = pickEnglishVoice();
    if (voices.length && !voice){ resolve('none'); return; }
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = rate || 0.9;
      if (voice) u.voice = voice;
      let done = false;
      const finish = status => { if (done) return; done = true; resolve(status); };
      u.onend = () => finish('ok');
      u.onerror = () => finish('err');
      speechSynthesis.speak(u);
    } catch (e) { resolve('err'); }
  });
}
function audioBar(){
  return '<div class="audio-bar"><button type="button" class="px-btn say-en" data-rate="0.9">▶ 播放</button><button type="button" class="px-btn stone say-en" data-rate="0.7">🐢 慢速</button><p class="voice-note" hidden></p><p class="voice-fallback" hidden></p></div>';
}
function bindAudio(root, text){
  const note = root.querySelector('.voice-note');
  const fb = root.querySelector('.voice-fallback');
  const showFallback = () => {
    if (!note || !fb) return;
    note.hidden = false;
    note.textContent = '這台裝置沒有英文語音，先看英文再作答。';
    fb.hidden = false;
    fb.textContent = text;
  };
  const voices = window.speechSynthesis ? speechSynthesis.getVoices() : [];
  if (!window.speechSynthesis || (voices.length && !voices.some(v => /^en/i.test(v.lang)))) showFallback();
  else if (!voices.length) later(() => {
    const again = speechSynthesis.getVoices();
    if (!again.length || !again.some(v => /^en/i.test(v.lang))) showFallback();
  }, 900);
  root.querySelectorAll('.say-en').forEach(btn => btn.addEventListener('click', () => {
    Sound.unlock();
    if (Sound.muted){ toast('音效關著，請先按右上角打開聲音。'); return; }
    speakEN(text, +btn.dataset.rate).then(status => { if (status !== 'ok') showFallback(); });
  }));
}
function clockSVG(h, m){
  const rad = deg => deg * Math.PI / 180;
  const hourAngle = ((h % 12) + m / 60) * 30 - 90;
  const minAngle = (m * 6) - 90;
  const hx = (50 + Math.cos(rad(hourAngle)) * 16).toFixed(1);
  const hy = (50 + Math.sin(rad(hourAngle)) * 16).toFixed(1);
  const mx = (50 + Math.cos(rad(minAngle)) * 26).toFixed(1);
  const my = (50 + Math.sin(rad(minAngle)) * 26).toFixed(1);
  let ticks = '';
  for (let i = 0; i < 12; i++){
    const a = rad(i * 30 - 90);
    const x1 = (50 + Math.cos(a) * 36).toFixed(1), y1 = (50 + Math.sin(a) * 36).toFixed(1);
    const x2 = (50 + Math.cos(a) * 44).toFixed(1), y2 = (50 + Math.sin(a) * 44).toFixed(1);
    ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#232323" stroke-width="3"/>`;
  }
  return `<svg class="clock" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="#fff8e6" stroke="#232323" stroke-width="4"/>${ticks}<line x1="50" y1="50" x2="${hx}" y2="${hy}" stroke="#232323" stroke-width="4" stroke-linecap="round"/><line x1="50" y1="50" x2="${mx}" y2="${my}" stroke="#e8433a" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="50" r="3" fill="#232323"/></svg>`;
}
function showSentence(tokens){
  return tokens.join(' ').replace(/\s+([?.!,])/g, '$1');
}
function canonSentence(tokens){
  let s = tokens.map(t => String(t).replace(/[’‘]/g, "'")).join(' ');
  s = s.replace(/\s+([?.!,])/g, '$1');
  s = s.replace(/\s+/g, ' ').trim().toLowerCase();
  s = s.replace(/\bdoesn't\b/g, 'does not');
  s = s.replace(/\bdon't\b/g, 'do not');
  s = s.replace(/\bisn't\b/g, 'is not');
  s = s.replace(/\bshe's\b/g, 'she is');
  s = s.replace(/\bhe's\b/g, 'he is');
  s = s.replace(/\bit's\b/g, 'it is');
  return s.replace(/\s+/g, ' ').trim();
}
function sentenceOk(got, accepts){
  const g = canonSentence(got || []);
  return (accepts || []).some(a => canonSentence(a) === g);
}
function spellDiff(answer, got){
  const n = Math.max(answer.length, got.length);
  let html = '';
  for (let i = 0; i < n; i++){
    const a = answer[i] || '';
    const g = got[i] || '';
    if (a && a === g) html += `<b class="ok-ch">${S.escapeHtml(a)}</b>`;
    else html += `<b class="bad-ch">${S.escapeHtml(g || '□')}<i>${S.escapeHtml(a)}</i></b>`;
  }
  return html;
}

const CHAPTER = 'english-u34';
const REWARD_UNIT = '五上英文・Unit 3–4 期末複習';
const HONOR = { reward1: '英文小達人', reward2: '英文期末大師' };
const KIND = {
  hand: ['🖐️ 動手', 'k-hand'],
  idea: ['💡 觀念', 'k-idea'],
  boss: ['🔥 計時挑戰', 'k-boss'],
  adv: ['🎯 進階', 'k-adv'],
  exam: ['📝 考卷', 'k-exam']
};
const PART_INFO = {
  A: 'Part A：圈出聽到的發音組合。（12 分）',
  B: 'Part B：從字庫把聽到的單字填進空格。（12 分）',
  C: 'Part C：聽句子，依順序把圖片編號。（12 分）',
  D: 'Part D：看圖並拼出單字。（10 分）',
  E: 'Part E：選擇題。（10 分）',
  F: 'Part F：句子重組，注意大小寫。（9 分）',
  G: 'Part G：根據圖表回答問題。（22 分）',
  H: 'Part H：看圖，圈出正確的字，再用完整的句子回答。（13 分）'
};
const PAPER_KEY = 'el-paper-v1:english-u34:exam';
let paperMemory = null;
const S = window.UnitScore;
function loadScore(unit){ return S.load(CHAPTER, unit.id); }
function saveScore(unit, state){ S.save(CHAPTER, unit.id, state); }
function readPaper(){
  try {
    const raw = localStorage.getItem(PAPER_KEY);
    return raw ? JSON.parse(raw) : paperMemory;
  } catch (e) { return paperMemory; }
}
function writePaper(data){
  paperMemory = data;
  try { localStorage.setItem(PAPER_KEY, JSON.stringify(data)); } catch (e) {}
}
function clearPaper(){
  paperMemory = null;
  try { localStorage.removeItem(PAPER_KEY); } catch (e) {}
}
function paperBag(){
  const st = loadScore(curUnit);
  const practice = S.isPractice(st);
  const attempt = S.attemptsUsed(st);
  let saved = readPaper();
  if (!saved || saved.practice !== practice || saved.attempt !== attempt) {
    saved = { practice: practice, attempt: attempt, levels: {} };
  }
  return saved;
}
function summarize(saved){
  const items = [];
  Object.keys(saved.levels || {}).forEach(id => (saved.levels[id].items || []).forEach(it => items.push(it)));
  let got = 0, listen = 0, write = 0;
  const parts = {};
  items.forEach(it => {
    parts[it.part] = true;
    if (!it.ok) return;
    got += it.points;
    if (it.part === 'A' || it.part === 'B' || it.part === 'C') listen += it.points;
    else write += it.points;
  });
  const all = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].every(p => parts[p]);
  return { got: got, listen: listen, write: write, all: all, items: items };
}
function portalScore(u){
  const st = loadScore(u);
  const b = S.best(st);
  const tag = S.earned(st, 'reward2') ? '60分鐘' : (S.earned(st, 'reward1') ? '30分鐘' : '');
  const exam = u.id === 'exam' && typeof st.examBest === 'number' ? `<span class="p-score">考卷 ${st.examBest} / 100</span>` : '';
  return `<span class="p-score"><b>★ ${b}</b> / ${S.STAR_MAX}${tag ? '・' + tag : ''}</span>${exam}`;
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
  const home = $('homeBtn');
  if (id === 'lobby') home.hidden = true;
  else {
    home.hidden = false;
    home.textContent = id === 'play' ? '⬅ 回小單元' : '⬅ 回單元';
  }
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
function rewardCardHTML(meta, unitName, iso, preview, approval){
  const gold = meta.tier === 'gold';
  const dateLine = preview
    ? '預覽，不會記成已獲得'
    : (iso ? S.formatDate(iso) : '');
  const decor = ELApprove.voucherDecor(approval, preview);
  return `<article class="ticket px${gold ? ' gold' : ''}${decor.used ? ' used' : ''}">
    ${decor.stamp}
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
      ${decor.foot}
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
  const approval = (!preview && curUnit) ? ELApprove.cached(CHAPTER, curUnit.id, meta.id) : null;
  $('rewardCard').innerHTML = rewardCardHTML(meta, unitName, iso, preview, approval);
  ELApprove.attach($('rewardCard'), {
    chapter: CHAPTER,
    unitId: curUnit ? curUnit.id : '',
    unitName: unitName,
    rewardId: meta.id,
    minutes: meta.minutes,
    preview: preview,
    approval: approval
  });
  $('rewardOverlay').hidden = false;
  document.body.classList.add('reward-open');
  const tip = $('rewardTip');
  if (tip) tip.textContent = ELApprove.tipText(preview, approval);
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
  const text = S.isPractice(st) ? '' : S.hintText(b);
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
      <span class="p-icon">${S.showGlyph(u.icon)}</span><span class="p-lv">${u.tag}</span>
      <span class="p-name">${u.name}</span><span class="p-desc">${u.lessons.join('<br>')}</span>
      ${portalScore(u)}</button>`).join('');
  $('portals').querySelectorAll('.portal').forEach(p => p.addEventListener('click', () => { Sound.click(); Sound.unlock(); openUnit(UNITS[+p.dataset.u]); }));
  $('topTitle').textContent = '🔤 五上英文・期末複習';
  show('lobby');
  placeScreen({});
}

function openUnit(u){
  curUnit = u;
  const st = loadScore(u);
  $('unitTitle').textContent = `${u.icon} ${u.name}`;
  $('unitChip').textContent = `最好 ★ ${S.best(st)} / ${S.STAR_MAX}` + (u.id === 'exam' && typeof st.examBest === 'number' ? `　考卷 ${st.examBest} / 100` : '');
  $('unitDesc').innerHTML = u.desc;
  $('rulesStrip').innerHTML = S.RULES_HTML;
  renderRewards(u);
  const review = S.loadReview(CHAPTER, u.id);
  $('levels').innerHTML = u.levels.map((l, i) => {
    const lvRev = review.levels[l.id];
    const see = lvRev ? '<button type="button" class="px-btn lv-review" data-review="' + i + '">看錯題</button>' : '';
    return `<div class="lv-card px" data-l="${i}">
      <span class="lv-ico">${S.showGlyph(l.icon)}</span><span class="chip ${KIND[l.kind][1]}">${KIND[l.kind][0]}</span>
      <span class="lv-name">第 ${i + 1} 關：${l.name}</span><span class="lv-how">${S.howLine(l)}</span>
      <span class="lv-st">${S.levelMark(st, l.id, lvRev)}</span>${see}</div>`;
  }).join('');
  $('levels').querySelectorAll('.lv-card').forEach(c => c.addEventListener('click', () => { Sound.click(); startLevel(u.levels[+c.dataset.l]); }));
  $('levels').querySelectorAll('.lv-review').forEach(b => b.addEventListener('click', (e) => {
    e.stopPropagation();
    Sound.click();
    const level = u.levels[+b.dataset.review];
    const lvRev = S.loadReview(CHAPTER, u.id).levels[level.id];
    const stNow = loadScore(curUnit);
    const current = !!(stNow && stNow.run && stNow.run.levels && Object.prototype.hasOwnProperty.call(stNow.run.levels, level.id));
    showModal({icon: '📝', title: level.name, html: S.reviewBodyHtml(lvRev, { current: current }), buttons: [{label: '關閉', value: true, cls: 'stone'}]});
  }));
  $('topTitle').textContent = `${u.icon} ${u.name}`;
  show('unit');
  placeScreen({ lesson: (typeof curLesson !== 'undefined' && curLesson) ? curLesson.id : '', unit: curUnit && curUnit.id });
}

function startLevel(level){
  curLevel = level;
  const st = loadScore(curUnit);
  const practice = S.isPractice(st);
  const replay = !practice && S.runLevelStars(st, level.id) !== null;
  show('play');
  placeScreen({ lesson: (typeof curLesson !== 'undefined' && curLesson) ? curLesson.id : '', unit: curUnit && curUnit.id, play: true });
  game = { level, tally: S.createTally(), over: false, practice, replay, items: S.countItems(level), startedAt: Date.now(), graded: false, paperSummary: null };
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
  if (level.paper) renderPaper(level);
  else RENDER[level.type](level);
}
function setAsk(html){ $('lvAsk').innerHTML = html; }
function setProg(i, n, kind){ $('lvProg').textContent = kind === 'cards' ? `已放 ${i} / ${n} 張` : `${i} / ${n}`; }
function missItem(id, tip, detail){
  S.noteWrong(game.tally, id);
  if (detail) S.rememberWrong(game.tally, Object.assign({ id: id }, detail));
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
    buttons: [{label: '🔁 再挑戰', value: 'again', cls: 'orange'}, {label: '📋 回小單元', value: 'unit', cls: 'wood'}]});
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
  try {
    const at = S.todayISO();
    const wrong = S.wrongList(game.tally);
    const updates = [];
    if (result.runLevels) {
      (curUnit.levels || []).forEach(lv => {
        if (typeof result.runLevels[lv.id] !== 'number') return;
        updates.push({
          levelId: lv.id,
          stars: result.runLevels[lv.id],
          max: S.countItems(lv),
          wrong: lv.id === curLevel.id ? wrong : null,
          at: at,
          commitStars: true,
          keepWrong: lv.id !== curLevel.id
        });
      });
    } else {
      updates.push({ levelId: curLevel.id, wrong: wrong, at: at, commitStars: false });
    }
    S.saveReviewLevels(CHAPTER, curUnit.id, updates);
  } catch (err) {}
  if (result.wrote) saveScore(curUnit, result.state);
  const after = result.wrote ? result.state : before;
  if (stars && !game.practice) { Sound.win(); confetti(); } else if (!game.practice && stars === 0) Sound.bad();
  else if (game.practice) Sound.ding();
  const idx = curUnit.levels.indexOf(curLevel), next = curUnit.levels[idx + 1];
  const btns = [{label: '🔁 再玩一次', value: 'again', cls: 'wood'}];
  if (next) btns.push({label: '▶ 下一關', value: 'next', cls: 'orange'});
  btns.push({label: '📋 回小單元', value: 'unit', cls: 'stone'});
  btns.push({label: '⬅ 回單元', value: 'lobby', cls: 'wood'});
  const used = (curLevel && curLevel.time && game.startedAt) ? Math.max(1, Math.min(curLevel.time, Math.round((Date.now() - game.startedAt) / 1000))) : 0;
  const timeLine = used ? `<div class="m-time">這關用了 ${used} 秒</div>` : '';
  let html = `<div class="m-stars">★ ${stars} / ${game.items}</div>${timeLine}`;
  if (game.practice || result.practice) html += '練習模式，這次不會算星星。';
  else if (game.replay || result.replay) html += '這一關這次已經算過了，分數沒有改變。';
  else if (result.completed){
    html += `這一關得到 ${stars} 顆星。<br>這一單元這次共 <b>${result.total}</b> 顆星。最好成績 ★ ${S.best(after)} / ${S.STAR_MAX}。<br>${S.chancesText(after)}`;
  } else html += `這一關得到 ${stars} 顆星。<br>四關都玩完，才會用掉 1 次計分機會。`;
  if (curLevel.paper && game.paperSummary){
    const s = game.paperSummary;
    html += `<div class="explain" style="margin-top:10px;text-align:left">📝 考卷分數 <b>${s.got}</b> / 100<br>聽力 ${s.listen} / 36　書寫 ${s.write} / 64</div>`;
  }
  if (curLevel.recap) html += `<div class="explain" style="margin-top:10px;text-align:left">📌 ${S.escapeHtml(curLevel.recap)}</div>`;
  const v = await showModal({icon: stars ? '🎉' : '💪', title: game.practice ? '練習結束' : '這一關玩完了', center: true,
    html, buttons: btns});
  for (const id of result.unlocked){
    const meta = S.rewardMeta(id);
    if (meta) await showRewardCard(meta, {celebrate: true, unitName: curUnit.name});
  }
  if (v === 'again') startLevel(curLevel);
  else if (v === 'next') startLevel(next);
  else if (v === 'lobby') renderLobby();
  else openUnit(curUnit);
}

function makeDraggable(card, {findTarget, onDrop, onTap}){
  let st = null;
  card.addEventListener('pointerdown', e => {
    if (card.classList.contains('ok') || game.over) return;
    if (e.button != null && e.button !== 0) return;
    st = {x: e.clientX, y: e.clientY, id: e.pointerId, moved: false, ghost: null, over: null};
    try { card.setPointerCapture(e.pointerId); } catch (err) {}
  });
  card.addEventListener('pointermove', e => {
    if (!st || st.id !== e.pointerId) return;
    if (!st.moved && Math.hypot(e.clientX - st.x, e.clientY - st.y) > 8){
      st.moved = true;
      e.preventDefault();
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
  return `<div class="explain" style="margin-top:10px">💡 ${S.escapeHtml(q.why || '答對了！')}</div>`;
}
function nextBtn(i, n){
  return `<div class="next-row" style="margin-top:10px"><button type="button" class="px-btn orange" id="nextQ">${i + 1 < n ? '下一題 ▶' : '完成 🏁'}</button></div>`;
}
function panelBits(q){
  return `${q.passage || ''}${q.art ? `<div class="q-art">${S.showGlyph(q.art)}</div>` : ''}${q.stem ? `<p class="stem">${S.escapeHtml(q.stem)}</p>` : ''}`;
}
function optButton(o, i){
  if (String(o.t).indexOf('<svg') === 0) return `<button type="button" class="px-btn opt opt-clock" data-i="${i}">${o.t}</button>`;
  const big = [...String(o.t)].length <= 2;
  const text = big ? S.escapeHtml(o.t) : ('ABCD'[i] + '. ' + S.escapeHtml(o.t));
  return `<button type="button" class="px-btn opt${big ? ' opt-big' : ''}" data-i="${i}">${text}</button>`;
}
function cardFace(it){
  return `<span class="em">${S.showGlyph(it.em || '')}</span><span class="tx">${S.escapeHtml(it.t)}${it.gloss ? `<small class="gloss">${S.escapeHtml(it.gloss)}</small>` : ''}</span>`;
}
function makePool(pieces, extra){
  const tiles = [];
  pieces.forEach((t, i) => tiles.push({ id: 'a' + i, t: t }));
  (extra || []).forEach((t, i) => tiles.push({ id: 'e' + i, t: t }));
  return S.shuffle(tiles);
}
function mountTiles(container, spec){
  const origin = makePool(spec.pieces, spec.extra);
  let pool = origin.slice();
  let placed = [];
  let locked = false;
  container.innerHTML = '<div class="build-line"></div><div class="tile-bank"></div><div class="tile-actions"><button type="button" class="px-btn stone" data-act="clear">清除重排</button></div>';
  const line = container.querySelector('.build-line');
  const bank = container.querySelector('.tile-bank');
  const clearBtn = container.querySelector('[data-act="clear"]');
  clearBtn.addEventListener('click', () => {
    if (locked) return;
    Sound.click();
    pool = origin.slice();
    placed = [];
    draw();
  });
  function draw(){
    if (spec.mode === 'spell'){
      const n = Math.max(spec.pieces.length, placed.length);
      while (line.children.length > n) line.lastChild.remove();
      while (line.children.length < n) line.appendChild(document.createElement('div'));
      for (let i = 0; i < n; i++){
        const slot = line.children[i];
        slot.className = 'slot-box' + (placed[i] ? ' filled' : '');
        const tile = placed[i] ? tileEl(placed[i]) : null;
        if (tile){ if (slot.firstChild !== tile) slot.replaceChildren(tile); }
        else if (slot.firstChild) slot.replaceChildren();
      }
    } else if (!placed.length){
      line.replaceChildren();
      const hint = document.createElement('span');
      hint.className = 'line-hint';
      hint.textContent = '點字卡排到這裡，或拖進來';
      line.appendChild(hint);
    } else {
      const row = placed.map(tileEl);
      if (line.childNodes.length !== row.length || row.some((el, i) => line.childNodes[i] !== el)){
        const frag = document.createDocumentFragment();
        row.forEach(el => frag.appendChild(el));
        line.replaceChildren(frag);
      }
    }
    const bankTiles = pool.map(tileEl);
    if (bank.childNodes.length !== bankTiles.length || bankTiles.some((el, i) => bank.childNodes[i] !== el)){
      const frag = document.createDocumentFragment();
      bankTiles.forEach(el => frag.appendChild(el));
      bank.replaceChildren(frag);
    }
    clearBtn.disabled = locked;
  }
  function tileEl(p){
    if (!p.el){
      const el = document.createElement('div');
      el.className = 'ltile';
      el.textContent = p.t;
      el.dataset.id = p.id;
      el.setAttribute('role', 'button');
      el.tabIndex = 0;
      p.el = el;
      makeDraggable(el, {
        findTarget: node => node && node.closest('.ltile.in-line, .build-line, .tile-bank'),
        onDrop: (card, target) => {
          if (locked) return;
          if (target.classList.contains('tile-bank')) putBank(p);
          else if (target.classList.contains('ltile') && target.dataset.id !== p.id) insertBefore(p, target.dataset.id);
          else putLine(p);
        },
        onTap: () => { if (!locked) (placed.indexOf(p) >= 0 ? putBank(p) : putLine(p)); }
      });
    }
    p.el.classList.toggle('in-line', placed.indexOf(p) >= 0);
    p.el.classList.toggle('ok', locked);
    return p.el;
  }
  function take(p){
    pool = pool.filter(x => x !== p);
    placed = placed.filter(x => x !== p);
  }
  function putLine(p){ take(p); placed.push(p); draw(); }
  function putBank(p){ take(p); pool.push(p); draw(); }
  function insertBefore(p, id){
    take(p);
    const i = placed.findIndex(x => x.id === id);
    if (i < 0) placed.push(p); else placed.splice(i, 0, p);
    draw();
  }
  draw();
  return {
    value(){ return spec.mode === 'spell' ? placed.map(p => p.t).join('') : placed.map(p => p.t); },
    lock(){ locked = true; draw(); }
  };
}

const RENDER = {
  sort(lv){
    setAsk(lv.ask);
    const items = S.shuffle(lv.items);
    let done = 0, selected = null;
    $('stage').innerHTML = `<div class="panel px"><div class="tray" id="tray"></div></div><div class="bins" id="bins"></div>`;
    $('bins').innerHTML = lv.bins.map(b => `<div class="bin px tapme" data-b="${b.id}"><h3>${b.icon} ${b.name}</h3><div class="bin-items"></div></div>`).join('');
    setProg(0, items.length, 'cards');
    const tray = $('tray');
    const drop = (card, bin) => {
      if (card.classList.contains('ok') || game.over) return;
      const it = items[+card.dataset.i];
      const key = 's' + card.dataset.i;
      if (selected){ selected.classList.remove('sel'); selected = null; }
      if (it.bin === bin.dataset.b){
        goodItem(key); card.classList.add('ok'); bin.querySelector('.bin-items').appendChild(card);
        restartAnim(bin, 'flash-ok'); done++; setProg(done, items.length, 'cards');
        if (it.tip) toast('✅ ' + it.tip, 2600);
        if (done === items.length) later(finishLevel, 600);
      } else {
        const wrongBin = (lv.bins.find(b => b.id === bin.dataset.b) || {}).name || '';
        const rightBin = (lv.bins.find(b => b.id === it.bin) || {}).name || '';
        restartAnim(card, 'shake'); missItem(key, '放錯了，這張應該放「' + rightBin + '」。', { q: it.t, a: wrongBin, c: rightBin });
      }
    };
    items.forEach((it, i) => {
      const c = document.createElement('div'); c.className = 'chipcard'; c.dataset.i = i;
      c.innerHTML = cardFace(it);
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
      const q = qs[qi];
      if (q.mode === 'spell') renderSpellQ(q, () => { qi++; step(); }, qi, qs.length);
      else if (q.mode === 'sentence') renderSentenceQ(q, () => { qi++; step(); }, qi, qs.length);
      else renderChoiceQ(q, () => { qi++; step(); }, qi, qs.length);
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
          slot.classList.add('filled'); slot.innerHTML = `<span class="em">${S.showGlyph(r.items[i].em)}</span>${S.escapeHtml(r.items[i].t)}`;
          card.remove(); next++; setProg(next, r.items.length);
          if (next === r.items.length){
            $('why').innerHTML = `<div class="explain">💡 ${S.escapeHtml(r.why || '順序完全正確！')}</div>
              <div class="next-row" style="margin-top:10px"><button class="px-btn orange" id="nextR">${ri + 1 < lv.rounds.length ? '下一回合 ▶' : '完成 🏁'}</button></div>`;
            $('nextR').addEventListener('click', () => { Sound.click(); ri++; round(); });
          }
        } else {
          restartAnim(card, 'shake'); missItem(key, r.items[i].hint || `「${r.items[i].t}」還不是下一個，這顆星拿不到。`, { q: ((r.ask || '') + ' ' + r.items[i].t).trim(), a: r.items[i].t, c: (r.items[next] || {}).t || '' });
        }
      };
      S.shuffle(r.items.map((it, i) => ({...it, i}))).forEach(it => {
        const c = document.createElement('div'); c.className = 'chipcard'; c.dataset.i = it.i;
        c.innerHTML = cardFace(it);
        makeDraggable(c, {findTarget: el => el && el.closest('.slots'), onDrop: tryPlace, onTap: tryPlace});
        $('tray').appendChild(c);
      });
    };
    round();
  }
};

function renderChoiceQ(q, next, index, total){
  setProg(index + 1, total); setAsk(q.q);
  const opts = q.clocks ? S.choiceDeck(q.clocks.map(c => clockSVG(c[0], c[1]))) : S.choiceDeck(q.opts);
  let locked = false;
  $('stage').innerHTML = `<div class="panel px">${panelBits(q)}${q.say ? audioBar() : ''}<div class="opts">${opts.map((o, i) => optButton(o, i)).join('')}</div><div id="why"></div></div>`;
  if (q.say) bindAudio($('stage'), q.say);
  $('stage').querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
    if (game.over || locked) return;
    locked = true;
    const picked = +b.dataset.i;
    const o = opts[picked];
    if (o.right){ goodItem(q.id); bigCheck(); }
    else missItem(q.id, '這題沒答對，這顆星拿不到。', { q: stripTags(q.q), a: stripTags(o.t) || '（圖）', c: stripTags((opts.find(x => x.right) || {}).t) || '（圖）' });
    $('stage').querySelectorAll('.opt').forEach(x => {
      x.disabled = true;
      const choice = opts[+x.dataset.i];
      if (choice.right) x.classList.add('right');
      else if (+x.dataset.i === picked){ x.classList.add('wrong'); restartAnim(x, 'shake'); }
    });
    $('why').innerHTML = quizWhy(q) + nextBtn(index, total);
    $('nextQ').addEventListener('click', () => { Sound.click(); next(); });
  }));
}
function renderSpellQ(q, next, index, total){
  setProg(index + 1, total); setAsk(q.q);
  $('stage').innerHTML = `<div class="panel px">${panelBits(q)}<div id="tiles"></div><button type="button" class="px-btn orange check-btn" id="checkBtn">檢查</button><div id="why"></div></div>`;
  const box = mountTiles($('tiles'), { pieces: q.answer.split(''), extra: q.extra, mode: 'spell' });
  let locked = false;
  $('checkBtn').addEventListener('click', () => {
    if (locked || game.over) return;
    locked = true;
    box.lock();
    const got = box.value();
    const ok = got === q.answer;
    if (ok){ goodItem(q.id); bigCheck(); }
    else missItem(q.id, '拼得不一樣，這顆星拿不到。', { q: stripTags(q.stem || q.q), a: got || '（空白）', c: q.answer });
    $('why').innerHTML = (ok ? quizWhy(q) : `<div class="explain" style="margin-top:10px">💡 ${spellDiff(q.answer, got)}<p class="spell-fix">正確拼法：${S.escapeHtml(q.answer)}</p><br>${S.escapeHtml(q.why || '')}</div>`) + nextBtn(index, total);
    $('checkBtn').disabled = true;
    $('nextQ').addEventListener('click', () => { Sound.click(); next(); });
  });
}
function renderSentenceQ(q, next, index, total){
  setProg(index + 1, total); setAsk(q.q);
  $('stage').innerHTML = `<div class="panel px">${panelBits(q)}<div id="tiles"></div><button type="button" class="px-btn orange check-btn" id="checkBtn">檢查</button><div id="why"></div></div>`;
  const box = mountTiles($('tiles'), { pieces: q.tokens, extra: q.extra, mode: 'words' });
  let locked = false;
  $('checkBtn').addEventListener('click', () => {
    if (locked || game.over) return;
    locked = true;
    box.lock();
    const got = box.value();
    const ok = sentenceOk(got, q.accept);
    const yours = got.length ? showSentence(got) : '（空白）';
    if (ok){ goodItem(q.id); bigCheck(); }
    else missItem(q.id, '句子還不對，這顆星拿不到。', { q: stripTags(q.q), a: yours, c: showSentence(q.tokens) });
    $('why').innerHTML = `<div class="explain" style="margin-top:10px">💡 ${S.escapeHtml(q.why || '')}<br>你排成：${S.escapeHtml(yours)}<br>可以寫成：${S.escapeHtml(showSentence(q.tokens))}</div>` + nextBtn(index, total);
    $('checkBtn').disabled = true;
    $('nextQ').addEventListener('click', () => { Sound.click(); next(); });
  });
}

function orderPaperQuestions(questions){
  const parts = [];
  const map = {};
  questions.forEach(q => {
    if (!map[q.part]){ map[q.part] = []; parts.push(q.part); }
    map[q.part].push(q);
  });
  const out = [];
  parts.forEach(p => {
    const items = map[p];
    const mode = items[0] && items[0].mode;
    if (mode === 'cloze' || mode === 'number') out.push(...items);
    else out.push(...S.shuffle(items));
  });
  return out;
}
function scenesHTML(scenes){
  return '<div class="comic">' + scenes.map(s =>
    `<figure class="scene"><div class="scene-ico">${s.icon}</div>${clockSVG(s.h, s.m)}<figcaption><b>${S.escapeHtml(s.who)}</b><small>${S.escapeHtml(s.cap)}</small></figcaption></figure>`
  ).join('') + '</div>';
}
function mountCloze(host, items){
  const ordered = items.slice().sort((a, b) => a.slot - b.slot);
  const fills = {};
  let bank = ordered[0].bank.slice();
  let selected = null;
  const box = document.createElement('div');
  box.className = 'paper-q';
  box.innerHTML = audioBar() + '<p class="stem-help">先點字庫的字，再點空格。再點空格可以把字拿回來。</p><div class="cloze-pass"></div><div class="tile-bank cloze-bank"></div>';
  host.appendChild(box);
  bindAudio(box, ordered[0].say);
  function draw(){
    const parts = ordered[0].passage.split('___');
    const pass = box.querySelector('.cloze-pass');
    pass.innerHTML = '';
    parts.forEach((text, i) => {
      pass.appendChild(document.createTextNode(text));
      if (i >= ordered.length) return;
      const q = ordered[i];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'blank' + (fills[q.id] ? ' filled' : '');
      b.textContent = fills[q.id] || '____';
      b.addEventListener('click', () => {
        if (game.graded) return;
        Sound.click();
        if (fills[q.id] && !selected){
          bank.push(fills[q.id]);
          delete fills[q.id];
        } else if (selected){
          if (fills[q.id]) bank.push(fills[q.id]);
          fills[q.id] = selected;
          const at = bank.indexOf(selected);
          if (at >= 0) bank.splice(at, 1);
          selected = null;
        }
        draw();
      });
      pass.appendChild(b);
    });
    const bankEl = box.querySelector('.cloze-bank');
    bankEl.innerHTML = '';
    bank.forEach(w => {
      const t = document.createElement('button');
      t.type = 'button';
      t.className = 'ltile' + (selected === w ? ' sel' : '');
      t.textContent = w;
      t.addEventListener('click', () => {
        if (game.graded) return;
        Sound.click();
        selected = selected === w ? null : w;
        draw();
      });
      bankEl.appendChild(t);
    });
  }
  draw();
  return { read(q){ return fills[q.id] || ''; } };
}
function mountNumber(host, items){
  const order = S.shuffle(items.slice());
  const assigned = {};
  const box = document.createElement('div');
  box.className = 'paper-q';
  box.innerHTML = audioBar() + '<p class="stem-help">點圖片依序編號 1、2、3、4。再點一次可以取消。</p><div class="pic-row"></div>';
  host.appendChild(box);
  bindAudio(box, items[0].say);
  const row = box.querySelector('.pic-row');
  function draw(){
    row.innerHTML = '';
    order.forEach(q => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pic-card';
      const n = assigned[q.id];
      b.innerHTML = `<span class="pic-no">${n || ''}</span><span class="pic-art">${q.art}</span><span class="pic-label">${S.escapeHtml(q.label)}</span>`;
      b.addEventListener('click', () => {
        if (game.graded) return;
        Sound.click();
        if (assigned[q.id]) delete assigned[q.id];
        else {
          const used = Object.keys(assigned).map(id => Number(assigned[id]));
          let n = 1;
          while (used.indexOf(n) >= 0) n++;
          if (n <= items.length) assigned[q.id] = String(n);
        }
        draw();
      });
      row.appendChild(b);
    });
  }
  draw();
  return { read(q){ return assigned[q.id] || ''; } };
}
function mountPaperQ(host, q){
  const box = document.createElement('div');
  box.className = 'paper-q';
  box.dataset.id = q.id;
  if (q.mode === 'spell'){
    box.innerHTML = `${q.art ? `<div class="q-art">${S.showGlyph(q.art)}</div>` : ''}<p class="stem">${S.escapeHtml(q.stem || q.prompt || '')}</p><div class="tiles"></div>`;
    host.appendChild(box);
    const tiles = mountTiles(box.querySelector('.tiles'), { pieces: q.answer.split(''), extra: q.extra, mode: 'spell' });
    return {
      read: () => tiles.value(),
      ok: got => got === q.answer,
      yours: got => got || '（空白）',
      answer: () => q.answer,
      lock: () => tiles.lock()
    };
  }
  if (q.mode === 'sentence'){
    box.innerHTML = `<p class="stem">${S.escapeHtml(q.stem || q.prompt || '')}</p><div class="tiles"></div>`;
    host.appendChild(box);
    const tiles = mountTiles(box.querySelector('.tiles'), { pieces: q.tokens, extra: q.extra, mode: 'words' });
    return {
      read: () => tiles.value(),
      ok: got => sentenceOk(got, q.accept),
      yours: got => (got && got.length) ? showSentence(got) : '（空白）',
      answer: () => showSentence(q.tokens),
      lock: () => tiles.lock()
    };
  }
  if (q.mode === 'form'){
    const deck = S.choiceDeck(q.choices);
    let picked = -1;
    box.innerHTML = `<p class="stem">${S.escapeHtml(q.stem || '')}</p><div class="pick-row">${deck.map((o, i) => `<button type="button" class="px-btn opt" data-i="${i}">${S.escapeHtml(o.t)}</button>`).join('')}</div><p class="stem-help">再用字卡排成完整的句子。</p><div class="tiles"></div>`;
    host.appendChild(box);
    const tiles = mountTiles(box.querySelector('.tiles'), { pieces: q.tokens, extra: q.extra, mode: 'words' });
    box.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
      if (game.graded) return;
      Sound.click();
      picked = +b.dataset.i;
      box.querySelectorAll('.opt').forEach(x => x.classList.toggle('picked', +x.dataset.i === picked));
    }));
    return {
      read: () => ({ form: picked < 0 ? '' : deck[picked].t, words: tiles.value(), formOk: picked >= 0 && !!deck[picked].right }),
      ok: got => !!(got && got.formOk && sentenceOk(got.words, q.accept)),
      yours: got => `${(got && got.form) || '（沒圈）'} / ${(got && got.words && got.words.length) ? showSentence(got.words) : '（空白）'}`,
      answer: () => `${q.choices[0]} / ${showSentence(q.tokens)}`,
      lock(){ tiles.lock(); box.querySelectorAll('.opt').forEach(b => { b.disabled = true; }); }
    };
  }
  const opts = S.choiceDeck(q.opts);
  let picked = -1;
  box.innerHTML = `${q.say ? audioBar() : ''}${q.art ? `<div class="q-art">${S.showGlyph(q.art)}</div>` : ''}<p class="stem">${S.escapeHtml(q.stem || q.prompt || '')}</p><div class="opts">${opts.map((o, i) => optButton(o, i)).join('')}</div>`;
  host.appendChild(box);
  if (q.say) bindAudio(box, q.say);
  box.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
    if (game.graded) return;
    Sound.click();
    picked = +b.dataset.i;
    box.querySelectorAll('.opt').forEach(x => x.classList.toggle('picked', +x.dataset.i === picked));
  }));
  return {
    read: () => (picked < 0 ? '' : opts[picked].t),
    ok: () => picked >= 0 && !!opts[picked].right,
    yours: () => (picked < 0 ? '（空白）' : opts[picked].t),
    answer: () => (q.opts || [])[0] || '',
    lock(){ box.querySelectorAll('.opt').forEach(b => { b.disabled = true; }); }
  };
}
function wrongHTML(items){
  const bad = items.filter(it => !it.ok);
  if (!bad.length) return '<p class="explain">這裡全對。</p>';
  return '<h3 class="review-title">錯題</h3><ol class="wrong-list">' + bad.map(it =>
    `<li><b>${S.escapeHtml(it.part)} ${S.escapeHtml(it.id)}</b> ${S.escapeHtml(it.prompt)}<br>你的答案：<s>${S.escapeHtml(it.yours || '（空白）')}</s><br>正解：<span class="pen">${S.escapeHtml(it.answer)}</span> <span class="deduct">−${it.points}</span><br>${S.escapeHtml(it.why || '')}</li>`
  ).join('') + '</ol>';
}
function showGraded(lv, levelItems, sum){
  if (window.speechSynthesis) speechSynthesis.cancel();
  let html = '<article class="sheet px graded">';
  html += `<div class="score-row"><div class="score-stamp" aria-label="考卷分數"><b>${sum.got}</b><span>/ 100</span></div><div class="score-side"><p class="score-line">聽力 ${sum.listen} / 36${sum.items.some(i => i.part === 'A' || i.part === 'B' || i.part === 'C') ? '' : '（尚未作答）'}</p><p class="score-line">書寫 ${sum.write} / 64${sum.items.some(i => 'DEFGH'.indexOf(i.part) >= 0) ? '' : '（尚未作答）'}</p><p class="score-line">${sum.all ? '四個部分都交卷了。' : '還沒做的部分，分數先算 0。'}</p></div></div>`;
  if (lv.board) html += lv.board;
  if (lv.scenes) html += scenesHTML(lv.scenes);
  let last = '';
  levelItems.forEach(it => {
    if (it.part !== last){
      html += `<h4 class="part-title">${S.escapeHtml(PART_INFO[it.part] || it.part)}</h4>`;
      last = it.part;
    }
    html += `<div class="paper-q ${it.ok ? 'q-ok' : 'q-bad'}"><div class="q-line"><b>${S.escapeHtml(it.id)}</b> ${S.escapeHtml(it.prompt)} ${it.ok ? '<span class="pen ok-mark">✔</span>' : `<span class="deduct">−${it.points}</span>`}</div>`;
    if (!it.ok) html += `<div class="mark-row">你的答案 <s>${S.escapeHtml(it.yours || '（空白）')}</s>　正解 <span class="pen circle">${S.escapeHtml(it.answer)}</span></div>`;
    html += '</div>';
  });
  html += wrongHTML(sum.all ? sum.items : levelItems);
  html += '<button type="button" class="px-btn orange hand-in" id="donePaper">看星星結算</button></article>';
  $('stage').innerHTML = html;
  $('donePaper').addEventListener('click', () => { Sound.click(); finishLevel(); });
  window.scrollTo(0, 0);
}
function gradePaper(lv, qs, single, groups){
  if (!game || game.graded || game.over) return;
  game.graded = true;
  const items = qs.map(q => {
    let ok, yours, answer;
    if (q.group){
      const got = groups[q.group].read(q);
      ok = got === q.answer;
      yours = got || '（空白）';
      answer = q.mode === 'number' ? (q.answer + '（' + q.label + '）') : q.answer;
    } else {
      const w = single[q.id];
      const got = w.read();
      ok = w.ok(got);
      yours = w.yours(got);
      answer = w.answer();
      w.lock();
    }
    const promptText = q.prompt || q.stem || q.q || '';
    if (ok) S.noteRight(game.tally, q.id);
    else {
      S.noteWrong(game.tally, q.id);
      S.rememberWrong(game.tally, { id: q.id, q: promptText, a: yours, c: answer });
    }
    return { id: q.id, part: q.part, points: q.points, ok: ok, prompt: promptText, yours: yours, answer: answer, why: q.why || '' };
  });
  if (items.some(it => !it.ok)) Sound.bad(); else Sound.ding();
  const saved = paperBag();
  saved.levels[lv.id] = { items: items };
  writePaper(saved);
  const sum = summarize(saved);
  game.paperSummary = sum;
  if (sum.all && curUnit && curUnit.id === 'exam') {
    const st = loadScore(curUnit);
    if (!S.isPractice(st)) {
      const n = Math.max(0, Math.min(100, Math.round(sum.got)));
      if (!(typeof st.examBest === 'number' && st.examBest >= n)) {
        st.examBest = n;
        saveScore(curUnit, st);
      }
    }
  }
  showGraded(lv, items, sum);
}
function renderPaper(lv){
  const qs = orderPaperQuestions(lv.questions);
  setAsk('模擬考。做完按交卷，才會批改。');
  setProg(qs.length, qs.length);
  const sheet = document.createElement('article');
  sheet.className = 'sheet px';
  if (lv.banner){
    const h = document.createElement('h3');
    h.className = 'sheet-banner';
    h.textContent = lv.banner;
    sheet.appendChild(h);
  }
  const note = document.createElement('p');
  note.className = 'sheet-note';
  note.textContent = '交卷前可以修改。交卷之後才批改，每一題只算一次。';
  sheet.appendChild(note);
  if (lv.board){
    const hold = document.createElement('div');
    hold.innerHTML = lv.board;
    while (hold.firstChild) sheet.appendChild(hold.firstChild);
  }
  if (lv.scenes){
    const hold = document.createElement('div');
    hold.innerHTML = scenesHTML(lv.scenes);
    while (hold.firstChild) sheet.appendChild(hold.firstChild);
  }
  const single = {};
  const groups = {};
  let lastPart = '';
  qs.forEach(q => {
    if (q.part !== lastPart){
      const h = document.createElement('h4');
      h.className = 'part-title';
      h.textContent = PART_INFO[q.part] || q.part;
      sheet.appendChild(h);
      lastPart = q.part;
    }
    if (q.group){
      if (!groups[q.group]){
        const members = qs.filter(x => x.group === q.group);
        groups[q.group] = q.mode === 'cloze' ? mountCloze(sheet, members) : mountNumber(sheet, members);
      }
      return;
    }
    single[q.id] = mountPaperQ(sheet, q);
  });
  const hand = document.createElement('button');
  hand.type = 'button';
  hand.className = 'px-btn orange hand-in';
  hand.id = 'handIn';
  hand.textContent = '交卷';
  hand.addEventListener('click', () => { Sound.click(); gradePaper(lv, qs, single, groups); });
  sheet.appendChild(hand);
  $('stage').appendChild(sheet);
}

$('homeBtn').addEventListener('click', () => {
  Sound.click();
  if ($('play').classList.contains('active') && curUnit){
    if (game && game.graded && !game.over){ finishLevel(); return; }
    openUnit(curUnit);
  } else renderLobby();
});
const unitBackBtn = $('unitBackBtn');
if (unitBackBtn) unitBackBtn.addEventListener('click', () => { Sound.click(); renderLobby(); });
$('muteBtn').addEventListener('click', () => { const m = Sound.toggle(); $('muteBtn').textContent = m ? '🔇' : '🔊'; });
$('sayBtn').addEventListener('click', () => { Sound.unlock(); speak($('lvAsk').innerHTML); });
$('restartRunBtn').addEventListener('click', async () => {
  if (!curUnit) return;
  const ok = await showModal({icon: '🔁', title: '這次重來？', center: true,
    html: '這一次已經玩完的關會清掉。計分次數不會減少。',
    buttons: [{label: '確定重來', value: true, cls: 'orange'}, {label: '取消', value: false, cls: 'stone'}]});
  if (!ok) return;
  if (curUnit.id === 'exam') clearPaper();
  saveScore(curUnit, S.restartRun(loadScore(curUnit)));
  openUnit(curUnit);
});
$('resetBtn').addEventListener('click', async () => {
  if (!curUnit) return;
  const ok = await showModal({icon: '🧹', title: '清除這一單元的星星？', center: true,
    html: '這一單元的星星和獎勵卡日期會清掉。用過的計分次數不會回來，不能清掉後再重新計分 3 次。其他單元不會動。',
    buttons: [{label: '確定清除', value: true, cls: 'red'}, {label: '取消', value: false, cls: 'stone'}]});
  if (!ok) return;
  S.clear(CHAPTER, curUnit.id);
  if (curUnit.id === 'exam') clearPaper();
  openUnit(curUnit);
});
$('rewardClose').addEventListener('click', () => { Sound.click(); if (rewardCloser) rewardCloser(); });
$('rewardPrint').addEventListener('click', () => { Sound.click(); window.print(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && rewardCloser) rewardCloser(); });
document.addEventListener('pointerdown', () => Sound.unlock(), {once: true});
if (window.speechSynthesis){
  speechSynthesis.getVoices();
  speechSynthesis.addEventListener('voiceschanged', () => speechSynthesis.getVoices());
}

let screenMode = 'push';
function placeScreen(screen){
  if (screenMode === 'silent') return;
  const hash = S.screenHash(screen || {});
  const url = location.pathname + location.search + hash;
  if (screenMode === 'replace' || location.hash === hash) history.replaceState(screen || {}, '', url);
  else history.pushState(screen || {}, '', url);
}
function restoreScreen(raw){
  const h = raw && raw.play ? { lesson: raw.lesson, unit: raw.unit, play: false } : raw;
  if (raw && raw.play){
    const prev = screenMode;
    screenMode = 'replace';
    placeScreen(h);
    screenMode = prev;
  }
  if (h.unit){
    const list = window.UNITS || [];
    let unit = list.find(u => u.id === h.unit);
    let lesson = null;
    if (!unit && typeof findUnit === 'function'){
      const found = findUnit(h.unit);
      unit = found && found.unit;
      lesson = found && found.lesson;
    }
    if (!lesson && h.lesson && window.LESSONS) lesson = window.LESSONS.find(ls => ls.id === h.lesson) || null;
    if (unit){
      if (typeof curLesson !== 'undefined') curLesson = lesson;
      openUnit(unit);
      return;
    }
  }
  if (h.lesson && window.LESSONS && typeof openLesson === 'function'){
    const ls = window.LESSONS.find(x => x.id === h.lesson);
    if (ls){ openLesson(ls); return; }
  }
  renderLobby();
}

const bootHash = S.parseScreenHash(location.hash);
screenMode = (bootHash.lesson || bootHash.unit || bootHash.play) ? 'silent' : 'replace';
if (bootHash.lesson || bootHash.unit || bootHash.play) restoreScreen(bootHash);
else renderLobby();
screenMode = 'push';
window.addEventListener('popstate', () => { screenMode = 'silent'; restoreScreen(S.parseScreenHash(location.hash)); screenMode = 'push'; });
function refreshAfterScores(){
  if ($('play').classList.contains('active')) return;
  const lesson = $('lesson');
  if ($('unit').classList.contains('active') && curUnit) openUnit(curUnit);
  else if (lesson && lesson.classList.contains('active') && typeof curLesson !== 'undefined' && curLesson) openLesson(curLesson);
  else renderLobby();
}
document.addEventListener('el-scores-ready', refreshAfterScores);
document.addEventListener('el-scores-updated', refreshAfterScores);
if (window.ELScoresReady) refreshAfterScores();
{
  const preview = S.rewardMeta(new URLSearchParams(location.search).get('preview'));
  if (preview) showRewardCard(preview, {celebrate: true, preview: true, unitName: '預覽'});
}
