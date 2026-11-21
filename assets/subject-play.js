/* 國語、數學共用的小單元遊玩。
   題幹先出現。正解、解析、出處只在作答之後放進畫面。
   noTTS 的讀音題不朗讀。選字卡只念句子，括號念「空格」，不念選項。
   分數鍵盤：9/12、3/4、6/8 這種數值相同的答案都算對；3/2 和 1又1/2 也一樣。
   上次的每關星星只在四關都玩完、commitLevel 交出 runLevels 時寫入。 */
(function (root) {
  'use strict';

  function isBopomofo(text) {
    return /[ㄅ-ㄩˊˇˋ˙]/.test(text) && !/[一-龥]/.test(text);
  }

  /* 只把注音空掉。『注音』或「純注音」變成空格；句子本身留著，不把整句讀成空格。 */
  function cardSay(text) {
    let s = String(text == null ? '' : text);
    if (s.indexOf('『') >= 0) s = s.replace(/『[^』]*』/g, '空格');
    return s.replace(/「([^」]*)」/g, (full, inner) => (isBopomofo(inner) ? '「空格」' : full));
  }

  /* 朗讀只用題幹。讀音題回傳空字串，呼叫端就不發聲。 */
  function spokenStem(q) {
    if (!q || q.noTTS) return '';
    const text = q.mode === 'card' ? cardSay(q.q) : String(q.q || '');
    return text;
  }

  function toRatio(token) {
    if (!/^\d+(\.\d+)?$/.test(token)) return null;
    const parts = token.split('.');
    const frac = parts[1] || '';
    return [BigInt(parts[0] + frac), frac ? 10n ** BigInt(frac.length) : 1n];
  }

  function divRatio(n, d) {
    if (!n || !d || d[0] === 0n) return null;
    return [n[0] * d[1], n[1] * d[0]];
  }

  function parseValue(raw) {
    const s = String(raw == null ? '' : raw).replace(/\s+/g, '');
    if (!s) return null;
    let m = s.match(/^(\d+)又(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
    if (m) {
      const frac = divRatio(toRatio(m[2]), toRatio(m[3]));
      if (!frac) return null;
      return [BigInt(m[1]) * frac[1] + frac[0], frac[1]];
    }
    m = s.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
    if (m) return divRatio(toRatio(m[1]), toRatio(m[2]));
    return toRatio(s);
  }

  function valuesEqual(a, b) {
    const pa = parseValue(a);
    const pb = parseValue(b);
    if (!pa || !pb) return false;
    return pa[0] * pb[1] === pb[0] * pa[1];
  }

  function keypadPush(buf, key) {
    const s = String(buf || '');
    if (key === '⌫') return s.slice(0, -1);
    if (key === '清空') return '';
    if (s.length >= 24) return s;
    if (key === '又') return /^\d+$/.test(s) ? s + '又' : s;
    if (key === '/') return /^\d+(\.\d+)?(又\d+(\.\d+)?)?$/.test(s) ? s + '/' : s;
    if (key === '.') {
      const seg = s.split(/又|\//).pop();
      if (seg.indexOf('.') >= 0) return s;
      if (s === '' || /[又/]$/.test(s)) return s + '0.';
      if (!/\d$/.test(s)) return s;
      return s + '.';
    }
    if (/^[0-9]$/.test(key)) return s + key;
    return s;
  }

  root.SubjectPlay = {
    cardSay: cardSay,
    spokenStem: spokenStem,
    parseValue: parseValue,
    valuesEqual: valuesEqual,
    keypadPush: keypadPush
  };

  if (typeof document === 'undefined') return;

  const $ = id => document.getElementById(id);
  const S = root.UnitScore;
  function unitList() { return root.UNITS || []; }
  const KIND = { hand: ['🖐️ 動手', 'k-hand'], idea: ['💡 觀念', 'k-idea'], boss: ['🔥 計時挑戰', 'k-boss'], adv: ['🎯 進階', 'k-adv'] };
  const KEYS = [
    { k: '1', t: '1' }, { k: '2', t: '2' }, { k: '3', t: '3' }, { k: '⌫', t: '刪' },
    { k: '4', t: '4' }, { k: '5', t: '5' }, { k: '6', t: '6' }, { k: '/', t: '／' },
    { k: '7', t: '7' }, { k: '8', t: '8' }, { k: '9', t: '9' }, { k: '又', t: '又' },
    { k: '0', t: '0' }, { k: '.', t: '.' }, { k: '清空', t: '清空', wide: true }
  ];

  function restartAnim(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
  let laterIds = [];
  let toastTimer;
  function later(fn, ms) {
    const id = setTimeout(() => { laterIds = laterIds.filter(x => x !== id); fn(); }, ms);
    laterIds.push(id);
    return id;
  }
  function clearToast() {
    clearTimeout(toastTimer);
    const toastEl = $('toast');
    if (toastEl) { toastEl.classList.remove('show'); toastEl.innerHTML = ''; }
    document.querySelectorAll('.confetti, .big-check').forEach(el => el.remove());
  }
  function clearLater() {
    laterIds.forEach(clearTimeout);
    laterIds = [];
    clearToast();
    document.querySelectorAll('.confetti, .big-check').forEach(el => el.remove());
  }
  function toast(html, ms) {
    const el = $('toast');
    el.innerHTML = html;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms || 3200);
  }
  function bigCheck() {
    const d = document.createElement('div');
    d.className = 'big-check';
    d.textContent = '✔';
    document.body.appendChild(d);
    later(() => d.remove(), 1100);
  }
  function confetti() {
    const colors = ['#ff9800', '#ffcf3f', '#5dbb3f', '#3b82f6', '#e8433a', '#8e3bd1'];
    for (let i = 0; i < 60; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = colors[i % colors.length];
      c.style.animationDelay = Math.random() * .8 + 's';
      document.body.appendChild(c);
      later(() => c.remove(), 3400);
    }
  }

  const Sound = (() => {
    let ctx = null, muted = false, master = null, songTimer = null, songStep = 0, songNext = 0;
    const ensure = () => {
      if (!ctx) {
        const AC = root.AudioContext || root.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.22;
        master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    };
    function tone(freq, start, dur, type, vol) {
      const c = ensure();
      if (!c || muted) return;
      const t = c.currentTime + start;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || .12, t + .01);
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + dur + .02);
    }
    function note(f, t, dur, type, vol) {
      if (!ctx || muted) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + .03);
      g.gain.exponentialRampToValueAtTime(.0001, t + dur + .2);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + dur + .3);
    }
    function startBgm() {
      if (!ensure() || muted || songTimer) return;
      const base = 62, spb = 0.28, prog = [0, 5, 3, 4], penta = [0, 2, 4, 7, 9];
      songStep = 0;
      songNext = ctx.currentTime + .05;
      const tick = () => {
        if (!ctx || muted) return;
        const talking = root.speechSynthesis && root.speechSynthesis.speaking;
        master.gain.setTargetAtTime(talking ? .05 : .22, ctx.currentTime, .08);
        while (songNext < ctx.currentTime + .35) {
          const i = songStep % 32;
          const bar = Math.floor(i / 8);
          const t = songNext;
          const deg = penta[(i * 3 + bar) % 5];
          if (i % 2 === 0) note(440 * Math.pow(2, (base + 12 + deg - 69) / 12), t, spb * 1.4, 'triangle', .12);
          if (i % 8 === 0) note(440 * Math.pow(2, (base - 12 + [0, 2, 4, 5, 7, 9, 11][prog[bar]] - 69) / 12), t, spb * 6, 'sine', .1);
          songNext += spb;
          songStep++;
        }
      };
      songTimer = setInterval(tick, 100);
    }
    function stopBgm() { if (songTimer) { clearInterval(songTimer); songTimer = null; } }
    return {
      unlock() { ensure(); startBgm(); },
      toggle() {
        muted = !muted;
        if (muted) {
          if (root.speechSynthesis) root.speechSynthesis.cancel();
          stopBgm();
          if (master) master.gain.setTargetAtTime(0, ctx ? ctx.currentTime : 0, .05);
        } else startBgm();
        return muted;
      },
      get muted() { return muted; },
      click() { tone(880, 0, .05, 'square', .08); },
      ding() { tone(1046, 0, .2, 'triangle', .2); tone(784, .15, .35, 'triangle', .2); },
      bad() { tone(200, 0, .25, 'sawtooth', .08); tone(150, .12, .3, 'sawtooth', .08); },
      win() { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i * .11, .2, 'square', .09)); },
      tick() { tone(1400, 0, .03, 'square', .04); }
    };
  })();

  function speak(text) {
    if (!text || (game && game.quiet)) return;
    if (!root.speechSynthesis || Sound.muted) return;
    root.speechSynthesis.cancel();
    const u = new root.SpeechSynthesisUtterance(String(text));
    u.lang = 'zh-TW';
    u.rate = 0.95;
    try {
      const voices = root.speechSynthesis.getVoices() || [];
      const v = voices.find(voice => voice && /zh[-_]TW/i.test(voice.lang));
      if (v) u.voice = v;
    } catch (err) { /* 沒有中文語音時，仍用預設聲音把題目念出來 */ }
    root.speechSynthesis.speak(u);
  }

  function hush() {
    if (root.speechSynthesis) root.speechSynthesis.cancel();
  }

  let CFG = null;
  let curUnit = null, curLevel = null, timerId = null, game = null, rewardCloser = null;
  let screenMode = 'push';

  function loadScore(unit) { return S.load(CFG.chapter, unit.id); }
  function saveScore(unit, state) { S.save(CFG.chapter, unit.id, state); }
  function esc(value) { return S.escapeHtml(value); }
  function attr(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }
  function fracHtml(n, d) {
    return '<span class="frac"><sup>' + n + '</sup><sub>' + d + '</sub></span>';
  }
  function formatRich(text) {
    return esc(text)
      .replace(/(\d+)又(\d+)\/(\d+)/g, (_, w, n, d) => '<span class="mix"><span class="mix-w">' + w + '</span>' + fracHtml(n, d) + '</span>')
      .replace(/(\d+)\/(\d+)/g, (_, n, d) => fracHtml(n, d));
  }
  function portalScore(u) {
    const st = loadScore(u);
    const b = S.best(st);
    const tag = S.earned(st, 'reward2') ? '60分鐘' : (S.earned(st, 'reward1') ? '30分鐘' : '');
    return '<span class="p-score"><b>★ ' + b + '</b> / ' + S.STAR_MAX + (tag ? '・' + tag : '') + '</span>';
  }
  function showModal(opts) {
    const buttons = opts.buttons || [{ label: '好！', value: true }];
    return new Promise(resolve => {
      $('modal').innerHTML = '<div class="m-icon">' + (opts.icon || '') + '</div><h3>' + esc(opts.title || '') + '</h3><div class="m-body ' + (opts.center ? 'center' : '') + '">' + (opts.html || '') + '</div><div class="m-btns">' + buttons.map((b, i) => '<button type="button" class="px-btn ' + (b.cls || '') + '" data-i="' + i + '">' + b.label + '</button>').join('') + '</div>';
      $('modal').querySelectorAll('.m-btns button').forEach(btn => btn.addEventListener('click', () => {
        Sound.click();
        $('overlay').classList.remove('open');
        resolve(buttons[+btn.dataset.i].value);
      }));
      $('overlay').classList.add('open');
      $('modal').scrollTop = 0;
    });
  }
  function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    const home = $('homeBtn');
    home.hidden = id === 'lobby';
    if (!home.hidden) home.textContent = id === 'play' ? '⬅ 回小單元' : '⬅ 回單元';
    stopTimer();
    clearLater();
    $('overlay').classList.remove('open');
    hush();
    root.scrollTo(0, 0);
  }
  function controllerSVG() {
    return '<svg class="pad" viewBox="0 0 84 54" aria-hidden="true" focusable="false"><rect class="pad-l" x="1" y="18" width="18" height="32" rx="6"/><rect class="pad-r" x="65" y="18" width="18" height="32" rx="6"/><rect class="pad-body" x="16" y="4" width="52" height="36" rx="6"/><rect class="pad-screen" x="30" y="10" width="24" height="16" rx="2"/><path class="pad-ink" d="M22 24h5v-5h4v5h5v4h-5v5h-4v-5h-5z"/><circle class="pad-a" cx="60" cy="14" r="2.4"/><circle class="pad-b" cx="66" cy="20" r="2.4"/><circle class="pad-c" cx="60" cy="26" r="2.4"/><circle class="pad-d" cx="54" cy="20" r="2.4"/></svg>';
  }
  function rewardCardHTML(meta, unitName, iso, preview, approval) {
    const gold = meta.tier === 'gold';
    const dateLine = preview ? '預覽，不會記成已獲得' : (iso ? S.formatDate(iso) : '');
    const decor = root.ELApprove.voucherDecor(approval, preview);
    return '<article class="ticket px' + (gold ? ' gold' : '') + (decor.used ? ' used' : '') + '">' + decor.stamp + '<div class="ticket-stub"><span class="stub-kicker">' + meta.kicker + '</span>' + controllerSVG() + '<div class="stub-stars">' + meta.minutes + ' 分</div><div class="stub-word">獎勵卡</div></div><div class="ticket-main"><p class="ticket-unit">' + esc(CFG.rewardUnit) + '・' + esc(unitName) + '</p><h2 id="rewardTitle">' + meta.title + '</h2>' + (gold ? '<div class="gems" aria-hidden="true"><i></i><i></i><i></i></div>' : '') + '<p class="ticket-redeem">' + meta.redeem + '</p><p class="ticket-honor">稱號：' + esc(CFG.honor[meta.id] || '') + '</p><p class="ticket-date">' + (preview ? dateLine : '獲得日期：<time datetime="' + esc(iso) + '">' + dateLine + '</time>') + '</p>' + decor.foot + '</div></article>';
  }
  function showRewardCard(meta, opts) {
    const preview = !!(opts && opts.preview);
    const unitName = (opts && opts.unitName) || (curUnit ? curUnit.name : '這個小單元');
    const st = (!preview && curUnit) ? loadScore(curUnit) : null;
    const iso = preview ? '' : (st && st.rewards[meta.id]) || '';
    if (preview) S.previewView(S.todayISO());
    const approval = (!preview && curUnit) ? root.ELApprove.cached(CFG.chapter, curUnit.id, meta.id) : null;
    $('rewardCard').innerHTML = rewardCardHTML(meta, unitName, iso, preview, approval);
    root.ELApprove.attach($('rewardCard'), {
      chapter: CFG.chapter,
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
    if (tip) tip.textContent = root.ELApprove.tipText(preview, approval);
    if (opts && opts.celebrate) {
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
  function renderRewards(u) {
    const st = loadScore(u);
    const b = S.best(st);
    const hint = $('rewardHint');
    const text = S.isPractice(st) ? '' : S.hintText(b);
    hint.hidden = !text;
    hint.textContent = text;
    const status = $('scoreStatus');
    if (status) status.innerHTML = '目前最好 <b>★ ' + b + '</b> / ' + S.STAR_MAX + '　' + S.chancesText(st);
    const bar = $('scoreBar');
    if (bar) {
      bar.setAttribute('aria-valuenow', String(b));
      bar.setAttribute('aria-valuemax', String(S.STAR_MAX));
      bar.querySelector('span').style.width = Math.round(b / S.STAR_MAX * 100) + '%';
    }
    const runNote = $('runNote');
    if (runNote) {
      if (S.isPractice(st)) runNote.textContent = '';
      else if (st.run) {
        const done = S.runDoneCount(st, S.levelIds(u));
        runNote.textContent = done ? '這次已玩完 ' + done + ' 關，還沒算完。可以接著玩，或按「這次重來」。' : '';
      } else runNote.textContent = '';
    }
    const restart = $('restartRunBtn');
    if (restart) restart.hidden = S.isPractice(st) || !st.run;
    const list = $('rewardList');
    list.replaceChildren();
    root.ELApprove.offersFor(st, CFG.chapter, u.id).forEach(offer => {
      const meta = root.ELApprove.cardMeta(offer);
      const got = !offer.locked;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'peek-row' + (meta.tier === 'gold' ? ' gold' : '') + (got ? ' unlocked' : ' locked');
      btn.dataset.reward = meta.id;
      btn.setAttribute('aria-label', meta.title + (offer.approval ? '，已核准' : (got ? '，已解鎖，點開查看' : '，還沒解鎖')));
      btn.innerHTML = '<span class="peek-ico" aria-hidden="true">' + controllerSVG() + '</span><span class="peek-title">' + meta.short + '</span>' + (offer.approval ? '<span class="peek-open">已核准</span>' : (got ? '<span class="peek-open">點開</span>' : '<span class="peek-lock" aria-hidden="true">🔒</span>'));
      btn.addEventListener('click', () => {
        if (offer.locked) {
          const left = S.hintText(S.best(loadScore(u)));
          toast(left ? '🔒 ' + left : '再努力一下就解鎖囉！');
          Sound.bad();
          return;
        }
        Sound.click();
        showRewardCard(meta, { unitName: u.name });
      });
      list.appendChild(btn);
    });
  }
  function renderLobby() {
    $('totalStars').textContent = '每個小單元自己集星，最多 30 顆，集滿就能換 Switch 時間。';
    $('lobbyTitle').textContent = CFG.lobbyTitle;
    $('lobbySub').textContent = CFG.lobbySub;
    const UNITS = unitList();
    $('portals').innerHTML = UNITS.map((u, i) => '<button type="button" class="portal px" data-u="' + i + '"><span class="p-icon">' + u.icon + '</span><span class="p-lv">' + esc(u.tag) + '</span><span class="p-name">' + esc(u.name) + '</span><span class="p-desc">' + (u.lessons || []).map(esc).join('<br>') + '</span>' + portalScore(u) + '</button>').join('');
    $('portals').querySelectorAll('.portal').forEach(p => p.addEventListener('click', () => {
      Sound.click();
      Sound.unlock();
      openUnit(UNITS[+p.dataset.u]);
    }));
    $('topTitle').textContent = CFG.topTitle;
    show('lobby');
    placeScreen({});
  }
  function openUnit(u) {
    curUnit = u;
    const st = loadScore(u);
    $('unitTitle').textContent = u.icon + ' ' + u.name;
    $('unitChip').textContent = '最好 ★ ' + S.best(st) + ' / ' + S.STAR_MAX;
    $('unitDesc').textContent = u.desc || '';
    $('rulesStrip').innerHTML = S.RULES_HTML;
    renderRewards(u);
    const review = S.loadReview(CFG.chapter, u.id);
    $('levels').innerHTML = u.levels.map((l, i) => {
      const lvRev = review.levels[l.id];
      const see = lvRev ? '<button type="button" class="px-btn lv-review" data-review="' + i + '">看錯題</button>' : '';
      return '<div class="lv-card px" data-l="' + i + '"><span class="lv-ico">' + l.icon + '</span><span class="chip ' + KIND[l.kind][1] + '">' + KIND[l.kind][0] + '</span><span class="lv-name">第 ' + (i + 1) + ' 關：' + esc(l.name) + '</span><span class="lv-how">' + esc(S.howLine(l)) + '</span><span class="lv-st">' + esc(S.levelMark(st, l.id, lvRev)) + '</span>' + see + '</div>';
    }).join('');
    $('levels').querySelectorAll('.lv-card').forEach(c => c.addEventListener('click', () => {
      Sound.click();
      startLevel(u.levels[+c.dataset.l]);
    }));
    $('levels').querySelectorAll('.lv-review').forEach(b => b.addEventListener('click', (e) => {
      e.stopPropagation();
      Sound.click();
      const level = u.levels[+b.dataset.review];
      const lvRev = S.loadReview(CFG.chapter, u.id).levels[level.id];
      const stNow = loadScore(curUnit);
      const current = !!(stNow && stNow.run && stNow.run.levels && Object.prototype.hasOwnProperty.call(stNow.run.levels, level.id));
      showModal({ icon: '📝', title: level.name, html: S.reviewBodyHtml(lvRev, { current: current }), buttons: [{ label: '關閉', value: true, cls: 'stone' }] });
    }));
    $('topTitle').textContent = u.icon + ' ' + u.name;
    show('unit');
    placeScreen({ unit: curUnit && curUnit.id });
  }
  function startLevel(level) {
    curLevel = level;
    const st = loadScore(curUnit);
    const practice = S.isPractice(st);
    const replay = !practice && S.runLevelStars(st, level.id) !== null;
    show('play');
    placeScreen({ unit: curUnit && curUnit.id, play: true });
    game = { level: level, tally: S.createTally(), over: false, practice: practice, replay: replay, items: S.countItems(level), startedAt: Date.now(), question: null, quiet: false };
    $('lvTitle').textContent = level.name;
    $('lvKind').textContent = KIND[level.kind][0];
    $('lvKind').className = 'chip ' + KIND[level.kind][1];
    $('lvProg').textContent = '';
    $('stage').innerHTML = '';
    const banner = $('practiceBanner');
    if (practice) {
      banner.hidden = false;
      banner.textContent = '練習模式，這次不會算星星';
    } else if (replay) {
      banner.hidden = false;
      banner.textContent = '這一關這次已經算過了，再玩不會改分數。';
    } else banner.hidden = true;
    if (level.time) startTimer(level.time);
    RENDER[level.type](level);
  }
  function setAsk(q) {
    $('lvAsk').innerHTML = formatRich(q.q);
  }
  function setProg(i, n) { $('lvProg').textContent = i + ' / ' + n; }
  function missItem(id, tip, detail) {
    S.noteWrong(game.tally, id);
    if (detail) S.rememberWrong(game.tally, Object.assign({ id: id }, detail));
    Sound.bad();
    toast('🤔 ' + (tip || '這次沒答對，這顆星拿不到。'), 4200);
  }
  function goodItem(id) {
    S.noteRight(game.tally, id);
    Sound.ding();
  }
  function startTimer(sec) {
    let left = sec;
    const el = $('lvTimer');
    el.hidden = false;
    el.textContent = '⏱ ' + left + ' 秒';
    timerId = setInterval(() => {
      left--;
      el.textContent = '⏱ ' + left + ' 秒';
      if (left <= 10 && left > 0) Sound.tick();
      if (left <= 0) { stopTimer(); timeUp(); }
    }, 1000);
  }
  function stopTimer() {
    clearInterval(timerId);
    timerId = null;
    const el = $('lvTimer');
    if (el) el.hidden = true;
  }
  async function timeUp() {
    if (!game || game.over) return;
    game.over = true;
    const v = await showModal({
      icon: '⏰', title: '時間到！', center: true,
      html: '這一關還沒玩完，不會扣掉計分機會，也不會先鎖住這次的分數。可以再挑戰這一關。',
      buttons: [{ label: '🔁 再挑戰', value: 'again', cls: 'orange' }, { label: '📋 回小單元', value: 'unit', cls: 'wood' }]
    });
    v === 'again' ? startLevel(curLevel) : openUnit(curUnit);
  }
  async function finishLevel() {
    if (!game || game.over) return;
    game.over = true;
    stopTimer();
    const stars = game.tally.right;
    const before = loadScore(curUnit);
    const result = S.commitLevel(before, {
      levelId: curLevel.id,
      stars: stars,
      levelIds: S.levelIds(curUnit),
      iso: S.todayISO()
    });
    try {
      const at = new Date().toISOString();
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
      S.saveReviewLevels(CFG.chapter, curUnit.id, updates);
    } catch (err) { /* 錯題寫入失敗不能擋住計分 */ }
    if (result.wrote) saveScore(curUnit, result.state);
    const after = result.wrote ? result.state : before;
    if (stars && !game.practice) { Sound.win(); confetti(); }
    else if (!game.practice && stars === 0) Sound.bad();
    else if (game.practice) Sound.ding();
    const idx = curUnit.levels.indexOf(curLevel);
    const next = curUnit.levels[idx + 1];
    const btns = [{ label: '🔁 再玩一次', value: 'again', cls: 'wood' }];
    if (next) btns.push({ label: '▶ 下一關', value: 'next', cls: 'orange' });
    btns.push({ label: '📋 回小單元', value: 'unit', cls: 'stone' });
    const used = (curLevel && curLevel.time && game.startedAt) ? Math.max(1, Math.min(curLevel.time, Math.round((Date.now() - game.startedAt) / 1000))) : 0;
    const timeLine = used ? '<div class="m-time">這關用了 ' + used + ' 秒</div>' : '';
    let html = '<div class="m-stars">★ ' + stars + ' / ' + game.items + '</div>' + timeLine;
    if (game.practice || result.practice) html += '練習模式，這次不會算星星。';
    else if (game.replay || result.replay) html += '這一關這次已經算過了，分數沒有改變。';
    else if (result.completed) html += '這一關得到 ' + stars + ' 顆星。<br>這一單元這次共 <b>' + result.total + '</b> 顆星。最好成績 ★ ' + S.best(after) + ' / ' + S.STAR_MAX + '。<br>' + S.chancesText(after);
    else html += '這一關得到 ' + stars + ' 顆星。<br>四關都玩完，才會用掉 1 次計分機會。';
    const v = await showModal({
      icon: stars ? '🎉' : '💪',
      title: game.practice ? '練習結束' : '這一關玩完了',
      center: true,
      html: html,
      buttons: btns
    });
    for (const offer of root.ELApprove.celebrateOffers(result.unlocked, after, CFG.chapter, curUnit.id)) {
      await showRewardCard(root.ELApprove.cardMeta(offer), { celebrate: true, unitName: curUnit.name });
    }
    if (v === 'again') startLevel(curLevel);
    else if (v === 'next') startLevel(next);
    else openUnit(curUnit);
  }

  function makeDraggable(card, hooks) {
    let st = null;
    card.addEventListener('pointerdown', e => {
      if (card.classList.contains('ok') || (game && game.over)) return;
      if (e.button != null && e.button !== 0) return;
      st = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false, ghost: null, over: null };
      try { card.setPointerCapture(e.pointerId); } catch (err) {}
    });
    card.addEventListener('pointermove', e => {
      if (!st || st.id !== e.pointerId) return;
      if (!st.moved && Math.hypot(e.clientX - st.x, e.clientY - st.y) > 8) {
        st.moved = true;
        e.preventDefault();
        const r = card.getBoundingClientRect();
        st.ghost = card.cloneNode(true);
        st.ghost.classList.add('dragging');
        st.ghost.style.width = r.width + 'px';
        st.dx = e.clientX - r.left;
        st.dy = e.clientY - r.top;
        document.body.appendChild(st.ghost);
        card.classList.add('placeholder');
      }
      if (st.moved) {
        st.ghost.style.left = (e.clientX - st.dx) + 'px';
        st.ghost.style.top = (e.clientY - st.dy) + 'px';
        const t = hooks.findTarget(document.elementFromPoint(e.clientX, e.clientY));
        if (t !== st.over) {
          if (st.over) st.over.classList.remove('over');
          if (t) t.classList.add('over');
          st.over = t;
        }
      }
    });
    const end = e => {
      if (!st || st.id !== e.pointerId) return;
      const s = st;
      st = null;
      if (s.moved) {
        s.ghost.remove();
        card.classList.remove('placeholder');
        if (s.over) s.over.classList.remove('over');
        if (s.over) hooks.onDrop(card, s.over);
      } else if (e.type === 'pointerup') hooks.onTap(card);
    };
    card.addEventListener('pointerup', end);
    card.addEventListener('pointercancel', end);
  }

  function nextBtn(i, n) {
    return '<div class="next-row"><button type="button" class="px-btn orange" id="nextQ">' + (i + 1 < n ? '下一題 ▶' : '完成 🏁') + '</button></div>';
  }
  function explainHtml(q, yours, correct) {
    let html = '<div class="explain">💡 ' + formatRich(q.why || '答對了！');
    if (q.guess) html += '<div class="trap">這題的答案是依課文推定的，請家長核對。</div>';
    if (yours != null) html += '<p>你的答案：' + (yours ? formatRich(yours) : '（空白）') + '</p><p>正確答案：' + formatRich(correct) + '</p>';
    if (q.src) html += '<p class="src">〔出處：' + esc(q.src) + '〕</p>';
    return html + '</div>';
  }
  function bindNext(next) {
    const btn = $('nextQ');
    btn.addEventListener('click', () => { Sound.click(); next(); });
    requestAnimationFrame(() => { try { btn.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (err) {} });
  }
  function gridSVG(fig) {
    const cell = 48;
    const pad = 22;
    const rows = fig.rows;
    const cols = fig.cols;
    const w = cols * cell + pad * 2;
    const h = rows * cell + pad * 2;
    const paint = {};
    (fig.paint || []).forEach(p => { paint[p[0] + ',' + p[1]] = true; });
    let svg = '<svg class="gridfig" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + attr(fig.alt || '方格紙') + '">';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = pad + c * cell;
        const y = pad + r * cell;
        svg += '<rect x="' + (x + 2) + '" y="' + (y + 2) + '" width="' + (cell - 4) + '" height="' + (cell - 4) + '" class="cell' + (paint[r + ',' + c] ? ' on' : '') + '"/>';
      }
    }
    if (fig.axis === 'h') {
      const y = pad + fig.ay * cell;
      svg += '<line x1="' + (pad - 8) + '" y1="' + y + '" x2="' + (pad + cols * cell + 8) + '" y2="' + y + '" class="axis"/>';
    } else {
      const x = pad + fig.ax * cell;
      svg += '<line x1="' + x + '" y1="' + (pad - 8) + '" x2="' + x + '" y2="' + (pad + rows * cell + 8) + '" class="axis"/>';
    }
    (fig.segs || []).forEach(s => {
      const x1 = pad + s[1] * cell + cell / 2;
      const y1 = pad + s[0] * cell + cell / 2;
      const x2 = pad + s[3] * cell + cell / 2;
      const y2 = pad + s[2] * cell + cell / 2;
      svg += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" class="seg"/>';
    });
    (fig.dots || []).forEach(d => {
      const cx = pad + d[1] * cell + cell / 2;
      const cy = pad + d[0] * cell + cell / 2;
      svg += '<circle cx="' + cx + '" cy="' + cy + '" r="9" class="dot"/>';
      if (d[2]) svg += '<text x="' + cx + '" y="' + (cy - 14) + '" class="dotlab">' + esc(d[2]) + '</text>';
    });
    return svg + '</svg>';
  }
  function figBlock(q) {
    if (!q || !q.fig) return '';
    return '<div class="figwrap">' + gridSVG(q.fig) + '</div>';
  }
  function sameList(got, tokens) {
    if (!got || got.length !== tokens.length) return false;
    for (let i = 0; i < tokens.length; i++) if (got[i] !== tokens[i]) return false;
    return true;
  }
  function arrangeText(tokens, mode) {
    return mode === 'order' ? tokens.join(' → ') : tokens.join('');
  }

  function renderQuestion(q, next, index, total) {
    game.question = q;
    game.quiet = !!q.noTTS;
    hush();
    const say = $('sayBtn');
    say.hidden = !!q.noTTS;
    say.disabled = !!q.noTTS;
    clearToast();
    setProg(index + 1, total);
    setAsk(q);
    $('stage').dataset.qid = q.id;
    $('stage').dataset.mode = q.mode;
    if (q.mode === 'card') renderCard(q, next, index, total);
    else if (q.mode === 'keypad') renderKeypad(q, next, index, total);
    else if (q.mode === 'tiles' || q.mode === 'order') renderArrange(q, next, index, total);
    else renderChoice(q, next, index, total);
  }
  function renderChoice(q, next, index, total) {
    const opts = S.choiceDeck(q.opts);
    let locked = false;
    $('stage').innerHTML = figBlock(q) + '<div class="panel px"><div class="opts">' + opts.map((o, i) => '<button type="button" class="px-btn opt" data-i="' + i + '" data-plain="' + attr(o.t) + '">' + 'ABCD'[i] + '. ' + formatRich(o.t) + '</button>').join('') + '</div><div id="why"></div></div>';
    $('stage').dataset.qid = q.id;
    $('stage').dataset.mode = q.mode;
    $('stage').querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
      if (game.over || locked) return;
      locked = true;
      const o = opts[+b.dataset.i];
      if (o.right) { goodItem(q.id); bigCheck(); }
      else missItem(q.id, '這題沒答對，這顆星拿不到。', { q: q.q, a: o.t, c: q.opts[0] || '' });
      $('stage').querySelectorAll('.opt').forEach(x => {
        x.disabled = true;
        const choice = opts[+x.dataset.i];
        if (choice.right) x.classList.add('right');
        else if (x === b && !choice.right) { x.classList.add('wrong'); restartAnim(x, 'shake'); }
      });
      $('why').innerHTML = nextBtn(index, total) + explainHtml(q, null, '');
      bindNext(next);
    }));
  }
  function renderCard(q, next, index, total) {
    const opts = S.choiceDeck(q.opts);
    let locked = false;
    $('stage').innerHTML = figBlock(q) + '<div class="panel px"><div class="char-grid">' + opts.map((o, i) => '<button type="button" class="px-btn opt opt-char" data-i="' + i + '" data-plain="' + attr(o.t) + '">' + formatRich(o.t) + '</button>').join('') + '</div><div id="why"></div></div>';
    $('stage').dataset.qid = q.id;
    $('stage').dataset.mode = q.mode;
    $('stage').querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
      if (game.over || locked) return;
      locked = true;
      const o = opts[+b.dataset.i];
      if (o.right) { goodItem(q.id); bigCheck(); }
      else missItem(q.id, '這個字不對，這顆星拿不到。', { q: q.q, a: o.t, c: q.opts[0] || '' });
      $('stage').querySelectorAll('.opt').forEach(x => {
        x.disabled = true;
        const choice = opts[+x.dataset.i];
        if (choice.right) x.classList.add('right');
        else if (x === b && !choice.right) { x.classList.add('wrong'); restartAnim(x, 'shake'); }
      });
      $('why').innerHTML = nextBtn(index, total) + explainHtml(q, null, '');
      bindNext(next);
    }));
  }
  function renderKeypad(q, next, index, total) {
    let buf = '';
    let locked = false;
    const unit = q.unit ? '<span class="key-unit">' + esc(q.unit) + '</span>' : '';
    $('stage').innerHTML = figBlock(q) + '<div class="panel px keypad-wrap"><div class="key-screen" id="keyScreen" aria-live="polite"><span id="keyValue"></span>' + unit + '</div><p class="key-hint">輸入數字就好。分數用／，帶分數用又。</p><div class="keypad">' + KEYS.map(item => '<button type="button" class="px-btn key' + (item.wide ? ' wide' : '') + '" data-k="' + attr(item.k) + '">' + item.t + '</button>').join('') + '</div><button type="button" class="px-btn orange check-btn" id="checkBtn">檢查</button><div id="why"></div></div>';
    $('stage').dataset.qid = q.id;
    $('stage').dataset.mode = q.mode;
    const paint = () => {
      $('keyValue').innerHTML = buf ? formatRich(buf) : '<span class="key-ph">?</span>';
    };
    paint();
    $('stage').querySelectorAll('.key').forEach(b => b.addEventListener('click', () => {
      if (locked || game.over) return;
      Sound.click();
      buf = keypadPush(buf, b.dataset.k);
      paint();
    }));
    $('checkBtn').addEventListener('click', () => {
      if (locked || game.over) return;
      locked = true;
      const ok = valuesEqual(buf, q.accept);
      $('keyScreen').classList.add(ok ? 'ok' : 'bad');
      $('stage').querySelectorAll('.key').forEach(b => { b.disabled = true; });
      $('checkBtn').disabled = true;
      if (ok) { goodItem(q.id); bigCheck(); }
      else missItem(q.id, '數字還不對，這顆星拿不到。', { q: q.q, a: buf || '（空白）', c: q.a });
      $('why').innerHTML = nextBtn(index, total) + explainHtml(q, buf, q.a);
      bindNext(next);
    });
  }
  function makePool(pieces) {
    const tiles = pieces.map((t, i) => ({ id: 't' + i, t: t }));
    const pool = S.shuffle(tiles);
    const same = pool.length > 1 && pool.every((p, i) => p.t === pieces[i]);
    if (same) {
      const tmp = pool[0];
      pool[0] = pool[1];
      pool[1] = tmp;
    }
    return pool;
  }
  function renderArrange(q, next, index, total) {
    const hint = q.mode === 'order' ? '點卡片排上去，或拖過去。排好再按檢查。' : '點詞卡排成一句，或拖過去。排好再按檢查。';
    $('stage').innerHTML = figBlock(q) + '<div class="panel px"><p class="arrange-hint">' + hint + '</p><div id="tiles"></div><button type="button" class="px-btn orange check-btn" id="checkBtn">檢查</button><div id="why"></div></div>';
    $('stage').dataset.qid = q.id;
    $('stage').dataset.mode = q.mode;
    const box = mountTiles($('tiles'), q.tokens);
    let locked = false;
    $('checkBtn').addEventListener('click', () => {
      if (locked || game.over) return;
      locked = true;
      box.lock();
      const got = box.value();
      const ok = sameList(got, q.tokens);
      const yours = got.length ? arrangeText(got, q.mode) : '';
      const correct = arrangeText(q.tokens, q.mode);
      $('checkBtn').disabled = true;
      if (ok) { goodItem(q.id); bigCheck(); }
      else missItem(q.id, '順序還不對，這顆星拿不到。', { q: q.q, a: yours || '（空白）', c: correct });
      $('why').innerHTML = nextBtn(index, total) + explainHtml(q, yours, correct);
      bindNext(next);
    });
  }
  function mountTiles(container, tokens) {
    const origin = makePool(tokens);
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
    function draw() {
      if (!placed.length) {
        line.replaceChildren();
        const hint = document.createElement('span');
        hint.className = 'line-hint';
        hint.textContent = '點字卡排到這裡，或拖進來';
        line.appendChild(hint);
      } else {
        const row = placed.map(tileEl);
        const frag = document.createDocumentFragment();
        row.forEach(el => frag.appendChild(el));
        line.replaceChildren(frag);
      }
      const frag = document.createDocumentFragment();
      pool.forEach(p => frag.appendChild(tileEl(p)));
      bank.replaceChildren(frag);
      clearBtn.disabled = locked;
    }
    function tileEl(p) {
      if (!p.el) {
        const el = document.createElement('div');
        el.className = 'ltile';
        el.textContent = p.t;
        el.dataset.id = p.id;
        el.dataset.text = p.t;
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
    function take(p) {
      pool = pool.filter(x => x !== p);
      placed = placed.filter(x => x !== p);
    }
    function putLine(p) { take(p); placed.push(p); draw(); }
    function putBank(p) { take(p); pool.push(p); draw(); }
    function insertBefore(p, id) {
      take(p);
      const i = placed.findIndex(x => x.id === id);
      if (i < 0) placed.push(p);
      else placed.splice(i, 0, p);
      draw();
    }
    draw();
    return {
      value() { return placed.map(p => p.t); },
      lock() { locked = true; draw(); }
    };
  }

  const RENDER = {
    quiz(lv) {
      const qs = S.shuffle(lv.questions);
      let qi = 0;
      const step = () => {
        if (game.over) return;
        if (qi >= qs.length) return finishLevel();
        renderQuestion(qs[qi], () => { qi++; step(); }, qi, qs.length);
      };
      step();
    }
  };

  function placeScreen(screen) {
    if (screenMode === 'silent') return;
    const hash = S.screenHash(screen || {});
    const url = location.pathname + location.search + hash;
    if (screenMode === 'replace' || location.hash === hash) history.replaceState(screen || {}, '', url);
    else history.pushState(screen || {}, '', url);
  }
  function restoreScreen(raw) {
    const h = raw && raw.play ? { lesson: raw.lesson, unit: raw.unit, play: false } : raw;
    if (raw && raw.play) {
      const prev = screenMode;
      screenMode = 'replace';
      placeScreen(h);
      screenMode = prev;
    }
    if (h && h.unit) {
      const unit = unitList().find(u => u.id === h.unit);
      if (unit) { openUnit(unit); return; }
    }
    renderLobby();
  }
  function refreshAfterScores() {
    if ($('play').classList.contains('active')) return;
    if ($('unit').classList.contains('active') && curUnit) openUnit(curUnit);
    else renderLobby();
  }

  function boot(cfg) {
    if (!S) throw new Error('找不到 unit-score');
    if (!unitList().length) throw new Error('這個章節沒有小單元');
    CFG = cfg;
    $('homeBtn').addEventListener('click', async () => {
      Sound.click();
      if ($('play').classList.contains('active') && curUnit) {
        if (game && !game.over) {
          const ok = await showModal({
            icon: '🚪', title: '離開這一關？', center: true,
            html: '這關還沒玩完，要離開嗎？',
            buttons: [{ label: '離開', value: true, cls: 'orange' }, { label: '繼續玩', value: false, cls: 'stone' }]
          });
          if (!ok) return;
        }
        openUnit(curUnit);
      } else renderLobby();
    });
    const unitBackBtn = $('unitBackBtn');
    if (unitBackBtn) unitBackBtn.addEventListener('click', () => { Sound.click(); renderLobby(); });
    $('muteBtn').addEventListener('click', () => {
      const m = Sound.toggle();
      $('muteBtn').textContent = m ? '🔇' : '🔊';
    });
    $('sayBtn').addEventListener('click', () => {
      const text = spokenStem(game && game.question);
      if (!text) return;
      Sound.unlock();
      speak(text);
    });
    $('restartRunBtn').addEventListener('click', async () => {
      if (!curUnit) return;
      const ok = await showModal({
        icon: '🔁', title: '這次重來？', center: true,
        html: '這一次已經玩完的關會清掉。計分次數不會減少。',
        buttons: [{ label: '確定重來', value: true, cls: 'orange' }, { label: '取消', value: false, cls: 'stone' }]
      });
      if (!ok) return;
      saveScore(curUnit, S.restartRun(loadScore(curUnit)));
      openUnit(curUnit);
    });
    $('resetBtn').addEventListener('click', async () => {
      if (!curUnit) return;
      const ok = await showModal({
        icon: '🧹', title: '清除這一單元的星星？', center: true,
        html: '這一單元的星星和獎勵卡日期會清掉。用過的計分次數不會回來，不能清掉後再重新計分 3 次。其他單元不會動。',
        buttons: [{ label: '確定清除', value: true, cls: 'red' }, { label: '取消', value: false, cls: 'stone' }]
      });
      if (!ok) return;
      S.clear(CFG.chapter, curUnit.id);
      openUnit(curUnit);
    });
    $('rewardClose').addEventListener('click', () => { Sound.click(); if (rewardCloser) rewardCloser(); });
    $('rewardPrint').addEventListener('click', () => { Sound.click(); root.print(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && rewardCloser) rewardCloser(); });
    document.addEventListener('pointerdown', () => Sound.unlock(), { once: true });
    if (root.speechSynthesis) root.speechSynthesis.getVoices();

    const bootHash = S.parseScreenHash(location.hash);
    screenMode = (bootHash.unit || bootHash.play) ? 'silent' : 'replace';
    if (bootHash.unit || bootHash.play) restoreScreen(bootHash);
    else renderLobby();
    screenMode = 'push';
    root.addEventListener('popstate', () => {
      screenMode = 'silent';
      restoreScreen(S.parseScreenHash(location.hash));
      screenMode = 'push';
    });
    document.addEventListener('el-scores-ready', refreshAfterScores);
    document.addEventListener('el-approvals-ready', refreshAfterScores);
    document.addEventListener('el-scores-updated', refreshAfterScores);
    if (root.ELScoresReady) refreshAfterScores();
    const preview = S.rewardMeta(new URLSearchParams(location.search).get('preview'));
    if (preview) showRewardCard(preview, { celebrate: true, preview: true, unitName: '預覽' });
  }

  root.SubjectPlay.boot = boot;
})(typeof window !== 'undefined' ? window : globalThis);
