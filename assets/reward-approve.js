/* Switch 兌換券的父母簽名。
   孩子維持原本的登入。核准時另外開一個名叫 approver 的 Firebase app，
   用家長帳號 signIn，寫下 users/{孩子}/approvals/{chapter__unitId__rewardTier}，然後立刻 signOut。
   密碼只放在這次登入呼叫裡，不寫進畫面以外的地方，也不寫進紀錄。
   核准文件一旦寫下就不能改、不能刪。 */
(function (root) {
  'use strict';

  var TIERS = { reward1: 30, reward2: 60 };

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function approvalId(chapter, unitId, tier) {
    return String(chapter) + '__' + String(unitId) + '__' + String(tier);
  }

  function minutesFor(tier) {
    return TIERS[tier] || 0;
  }

  function tierEarned(state, tier) {
    var scores = root.UnitScore;
    if (!scores || (tier !== 'reward1' && tier !== 'reward2')) return false;
    var normalized = scores.normalize(state);
    if (!scores.earned(normalized, tier)) return false;
    var top = scores.best(normalized);
    if (tier === 'reward1') return top >= scores.NEED_MINUTES_30;
    return top >= scores.NEED_MINUTES_60;
  }

  function toDate(value) {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    if (typeof value.toDate === 'function') {
      try { return toDate(value.toDate()); } catch (e) { return null; }
    }
    if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
    if (typeof value === 'string' || typeof value === 'number') {
      var parsed = new Date(value);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  }

  function formatTaipei(value) {
    var date = toDate(value);
    if (!date) return '';
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(date);
    function pick(type) {
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].type === type) return parts[i].value;
      }
      return '';
    }
    var hour = pick('hour');
    if (hour === '24') hour = '00';
    return pick('year') + '/' + pick('month') + '/' + pick('day') + ' ' + hour + ':' + pick('minute');
  }

  function plainApproval(id, data) {
    var raw = data || {};
    var tier = raw.tier === 'reward2' ? 'reward2' : (raw.tier === 'reward1' ? 'reward1' : '');
    var minutes = raw.minutes === 60 ? 60 : (raw.minutes === 30 ? 30 : minutesFor(tier));
    var when = toDate(raw.approvedAt);
    var parts = String(id || '').split('__');
    return {
      id: id || approvalId(raw.chapter || parts[0] || '', raw.unitId || parts[1] || '', tier),
      approvedBy: raw.approvedBy || '',
      approverName: raw.approverName || '',
      approvedAt: when ? when.toISOString() : '',
      minutes: minutes === 30 || minutes === 60 ? minutes : 0,
      chapter: raw.chapter || parts[0] || '',
      unitId: raw.unitId || parts[1] || '',
      tier: tier,
      unitName: raw.unitName || ''
    };
  }

  function approvalRows(bag) {
    var list = [];
    if (!bag) return list;
    if (Array.isArray(bag)) {
      bag.forEach(function (item) {
        if (!item) return;
        list.push(plainApproval(item.id || approvalId(item.chapter, item.unitId, item.tier), item));
      });
    } else {
      Object.keys(bag).forEach(function (id) {
        list.push(plainApproval(id, bag[id]));
      });
    }
    list = list.filter(function (row) { return row.minutes === 30 || row.minutes === 60; });
    list.sort(function (a, b) {
      if (a.approvedAt === b.approvedAt) return a.id < b.id ? -1 : 1;
      return a.approvedAt < b.approvedAt ? 1 : -1;
    });
    return list;
  }

  function approvedMinutes(bag) {
    var best = {};
    approvalRows(bag).forEach(function (row) {
      var key = row.chapter + '__' + row.unitId;
      best[key] = Math.max(best[key] || 0, row.minutes);
    });
    return Object.keys(best).reduce(function (sum, key) { return sum + best[key]; }, 0);
  }

  function approvedMinutesFor(bag, chapter, unitId) {
    var best = 0;
    approvalRows(bag).forEach(function (row) {
      if (row.chapter === chapter && row.unitId === unitId) best = Math.max(best, row.minutes);
    });
    return best;
  }

  function footHtml(approval, preview) {
    if (approval) {
      return '<div class="sign-row signed"><span>父母簽名</span><b class="sign-name">' + escapeHtml(approval.approverName || '') + '</b></div>'
        + '<div class="sign-row signed"><span>兌換日期</span><b class="sign-when">' + escapeHtml(formatTaipei(approval.approvedAt)) + '</b><em class="used-tag">已使用</em></div>';
    }
    if (preview) {
      return '<div class="sign-row"><span>父母簽名</span><i></i></div><div class="sign-row"><span>兌換日期</span><i></i></div>';
    }
    return '<div class="sign-row"><span>父母簽名</span><button type="button" class="sign-line">點這裡請父母簽名</button></div>'
      + '<div class="sign-row"><span>兌換日期</span><i></i></div>';
  }

  function stampHtml(approval) {
    if (!approval) return '';
    var when = formatTaipei(approval.approvedAt);
    return '<div class="ticket-stamp" aria-label="已核准"><b>APPROVED</b><span>已核准</span><small>'
      + escapeHtml(approval.approverName || '') + '</small><time datetime="'
      + escapeHtml(approval.approvedAt || '') + '">' + escapeHtml(when) + '</time></div>';
  }

  function voucherDecor(approval, preview) {
    return {
      used: !!approval,
      stamp: stampHtml(approval),
      foot: '<div data-ticket-foot>' + footHtml(approval, preview) + '</div>'
    };
  }

  function tipText(preview, approval) {
    if (preview) return '這是預覽，不會幫孩子解鎖。';
    if (approval) return '這張兌換券已經核准，不能再用。';
    return '請父母點「父母簽名」後面的欄位，輸入帳號和密碼。核准後這張券就不能再使用。';
  }

  function failureMessage(code) {
    if (code === 'not-parent') return '這個帳號不是家長，不能核准兌換券。';
    if (code === 'not-earned') return '這張卡還沒有集到足夠的星星，不能核准。';
    if (code === 'already') return '這張兌換券已經核准過了，不能再用。';
    if (code === 'no-child') return '請先用孩子的帳號登入，再請父母簽名。';
    if (code === 'empty-account') return '請先輸入家長帳號喔。';
    if (code === 'empty-password') return '請先輸入密碼喔。';
    if (code === 'permission-denied' || code === 'already-exists') {
      return '沒有核准成功。請確認 Firestore 規則已經貼上，而且這張卡真的已經集到星星。已經核准過的兌換券不能再核准。';
    }
    if (root.ELAccount && typeof root.ELAccount.authErrorText === 'function') return root.ELAccount.authErrorText(code);
    return '登入沒有成功，請再試一次。';
  }

  function decisionAfterSignIn(profile) {
    var accounts = root.ELAccount;
    var email = profile && profile.email;
    if (!accounts || !profile || profile.role !== 'parent' || !accounts.isParentEmail(email)) {
      return { ok: false, code: 'not-parent', message: failureMessage('not-parent') };
    }
    return { ok: true };
  }

  function approvalRecord(ctx, profile) {
    return {
      approvedBy: profile.uid,
      approverName: profile.displayName,
      minutes: minutesFor(ctx.rewardId),
      chapter: String(ctx.chapter),
      unitId: String(ctx.unitId),
      tier: ctx.rewardId,
      unitName: String(ctx.unitName || '')
    };
  }

  function parentListHtml(bag, nameOf) {
    var rows = approvalRows(bag);
    var html = '<section class="approve-block"><h3>已核准的兌換券</h3>'
      + '<p class="approve-note">核准之後不能取消，兌換券也不能再使用。同一個小單元如果兩張都核准，分鐘合計用比較高的那張。</p>'
      + '<p class="approve-total">已核准 Switch 一共 <b>' + approvedMinutes(rows) + '</b> 分鐘</p>';
    if (!rows.length) return html + '<p class="approve-empty">還沒有核准過的兌換券。</p></section>';
    html += '<ul class="approve-list">';
    rows.forEach(function (row) {
      var name = row.unitName || row.unitId;
      if (typeof nameOf === 'function') {
        var found = nameOf(row.chapter, row.unitId);
        if (found) name = found;
      }
      html += '<li><span class="approve-unit">' + escapeHtml(name) + '</span><span>'
        + row.minutes + ' 分鐘</span><span>' + escapeHtml(row.approverName) + '</span><time>'
        + escapeHtml(formatTaipei(row.approvedAt)) + '</time></li>';
    });
    return html + '</ul></section>';
  }

  var cache = {};
  var seen = {};

  function cached(chapter, unitId, tier) {
    var id = approvalId(chapter, unitId, tier);
    return seen[id] ? cache[id] : null;
  }

  function remember(row) {
    if (!row || !row.id) return;
    cache[row.id] = row;
    seen[row.id] = true;
  }

  function rememberMissing(chapter, unitId, tier) {
    var id = approvalId(chapter, unitId, tier);
    if (seen[id]) return;
    cache[id] = null;
    seen[id] = true;
  }

  root.ELApprove = {
    approvalId: approvalId,
    minutesFor: minutesFor,
    tierEarned: tierEarned,
    formatTaipei: formatTaipei,
    plainApproval: plainApproval,
    approvalRows: approvalRows,
    approvedMinutes: approvedMinutes,
    approvedMinutesFor: approvedMinutesFor,
    footHtml: footHtml,
    stampHtml: stampHtml,
    voucherDecor: voucherDecor,
    tipText: tipText,
    failureMessage: failureMessage,
    decisionAfterSignIn: decisionAfterSignIn,
    approvalRecord: approvalRecord,
    parentListHtml: parentListHtml,
    cached: cached,
    escapeHtml: escapeHtml
  };

  if (typeof document === 'undefined') return;

  var approverApp = null;
  var approverAuth = null;
  var approverDb = null;
  var authMod = null;
  var fsMod = null;
  var approverReady = false;
  var signing = false;

  function injectStyle() {
    if (document.getElementById('el-approve-style')) return;
    var style = document.createElement('style');
    style.id = 'el-approve-style';
    style.textContent = [
      '.ticket{position:relative}',
      '.ticket-stamp{position:absolute;top:18px;right:14px;z-index:2;transform:rotate(-8deg);',
      'border:4px solid #c62828;color:#c62828;background:rgba(255,255,255,.9);padding:6px 10px;text-align:center;',
      'line-height:1.15;pointer-events:none;box-shadow:3px 3px 0 rgba(198,40,40,.18)}',
      '.ticket-stamp b{display:block;font-size:20px;letter-spacing:.06em}',
      '.ticket-stamp span{display:block;font-size:18px}',
      '.ticket-stamp small,.ticket-stamp time{display:block;font-size:13px;font-weight:900;color:#7a1f1f}',
      '.sign-line{flex:1;min-width:80px;min-height:44px;border:0;border-bottom:3px solid #232323;background:transparent;',
      'font:900 16px/1.2 inherit;color:#c46a00;text-align:left;padding:6px 2px 2px;cursor:pointer}',
      '.sign-line:focus{outline:3px solid #ff9800;outline-offset:2px}',
      '.sign-row.signed b{flex:1;border-bottom:3px solid #232323;min-height:1.3em}',
      '.used-tag{margin-left:8px;background:#c62828;color:#fff;border-radius:99px;padding:2px 8px;font-style:normal;font-size:14px;white-space:nowrap}',
      '.el-approve{position:fixed;inset:0;z-index:400;display:flex;align-items:center;justify-content:center;padding:18px 12px;',
      'background:rgba(20,32,48,.62)}',
      '.el-approve-card{width:min(440px,100%);background:#fff8e6;padding:18px 16px 14px;text-align:left}',
      '.el-approve-card h3{margin:0 0 8px;font-size:28px;text-align:center}',
      '.el-approve-card p{margin:0 0 8px;font-size:16px;line-height:1.45}',
      '.el-approve-card label{display:block;margin:10px 0 4px;font-size:18px}',
      '.el-approve-card input{display:block;width:100%;border:4px solid #232323;border-radius:12px;background:#fff;',
      'font:900 20px/1.2 inherit;padding:12px;min-height:52px}',
      '.el-approve-card input:focus{outline:4px solid #ff9800;outline-offset:2px}',
      '.el-approve-error{color:#b3261e;font-size:16px}',
      '.el-approve-actions{display:flex;gap:8px;margin-top:12px}',
      '.el-approve-actions .px-btn{flex:1}',
      '@media print{#el-approve{display:none !important}}'
    ].join('');
    document.head.appendChild(style);
  }

  function firebaseUrl(name) {
    var version = root.ELAccount && root.ELAccount.FIREBASE_VERSION;
    return 'https://www.gstatic.com/firebasejs/' + version + '/' + name + '.js';
  }

  function ensureApprover() {
    if (approverReady) return Promise.resolve();
    var config = root.ELAccount && root.ELAccount.firebaseConfig;
    return Promise.all([
      import(firebaseUrl('firebase-app')),
      import(firebaseUrl('firebase-auth')),
      import(firebaseUrl('firebase-firestore'))
    ]).then(function (mods) {
      var appMod = mods[0];
      authMod = mods[1];
      fsMod = mods[2];
      var existing = (appMod.getApps ? appMod.getApps() : []).filter(function (app) {
        return app.name === 'approver';
      })[0];
      approverApp = existing || appMod.initializeApp(config, 'approver');
      approverAuth = authMod.getAuth(approverApp);
      approverDb = fsMod.getFirestore(approverApp);
      return authMod.setPersistence(approverAuth, authMod.inMemoryPersistence);
    }).then(function () {
      approverReady = true;
    });
  }

  function ensureLoaded(chapter, unitId, tier) {
    var id = approvalId(chapter, unitId, tier);
    if (seen[id]) return Promise.resolve(cache[id]);
    var auth = root.ELAuth;
    var fb = root.ELFirebase;
    if (!auth || !auth.uid || !fb || !fb.getDoc) return Promise.resolve(null);
    return fb.getDoc(fb.doc(fb.db, 'users', auth.uid, 'approvals', id)).then(function (snap) {
      if (snap && typeof snap.exists === 'function' && snap.exists()) {
        var row = plainApproval(snap.id || id, snap.data() || {});
        remember(row);
        return row;
      }
      rememberMissing(chapter, unitId, tier);
      return null;
    }).catch(function () { return null; });
  }

  function loadAll() {
    var auth = root.ELAuth;
    var fb = root.ELFirebase;
    if (!auth || !auth.uid || !fb || !fb.getDocs) return;
    fb.getDocs(fb.collection(fb.db, 'users', auth.uid, 'approvals')).then(function (snap) {
      if (!snap || !snap.forEach) return;
      snap.forEach(function (docSnap) {
        remember(plainApproval(docSnap.id, docSnap.data() || {}));
      });
    }).catch(function () {});
  }

  function paintTicket(article, ctx) {
    if (!article) return;
    article.classList.toggle('used', !!ctx.approval);
    if (ctx.approval && document.getElementById('el-approve')) closeModal();
    var oldStamp = article.querySelector('.ticket-stamp');
    if (oldStamp) oldStamp.remove();
    if (ctx.approval) article.insertAdjacentHTML('afterbegin', stampHtml(ctx.approval));
    var foot = article.querySelector('[data-ticket-foot]');
    if (foot) foot.innerHTML = footHtml(ctx.approval, ctx.preview);
    var tip = document.getElementById('rewardTip');
    if (tip) tip.textContent = tipText(ctx.preview, ctx.approval);
    mountTicket(article, ctx);
  }

  function setModalError(text) {
    var el = document.getElementById('el-approve-error');
    if (!el) return;
    el.hidden = !text;
    el.textContent = text || '';
  }

  function closeModal() {
    var pass = document.getElementById('el-approve-pass');
    if (pass) pass.value = '';
    var layer = document.getElementById('el-approve');
    if (layer) layer.remove();
    signing = false;
  }

  function openModal(ctx, article) {
    closeModal();
    injectStyle();
    var layer = document.createElement('div');
    layer.id = 'el-approve';
    layer.className = 'el-approve';
    layer.innerHTML = '<form class="el-approve-card px" role="dialog" aria-modal="true" aria-labelledby="el-approve-title" method="post" action="#">'
      + '<h3 id="el-approve-title">父母簽名</h3>'
      + '<p>請輸入家長帳號和密碼，核准這張 ' + escapeHtml(String(ctx.minutes || minutesFor(ctx.rewardId))) + ' 分鐘兌換券。密碼只用來確認是家長，不會被保存。</p>'
      + '<label for="el-approve-account">家長帳號</label>'
      + '<input id="el-approve-account" name="el-approve-account" autocomplete="username" autocapitalize="none" spellcheck="false">'
      + '<label for="el-approve-pass">密碼</label>'
      + '<input id="el-approve-pass" name="el-approve-pass" type="password" autocomplete="current-password">'
      + '<p class="el-approve-error" id="el-approve-error" hidden></p>'
      + '<div class="el-approve-actions"><button type="submit" class="px-btn" id="el-approve-go">核准</button>'
      + '<button type="button" class="px-btn stone" id="el-approve-cancel">取消</button></div></form>';
    document.body.appendChild(layer);
    var accountInput = document.getElementById('el-approve-account');
    var passInput = document.getElementById('el-approve-pass');
    layer.addEventListener('click', function (event) {
      if (event.target === layer) closeModal();
    });
    document.getElementById('el-approve-cancel').addEventListener('click', function () { closeModal(); });
    layer.querySelector('form').addEventListener('submit', function (event) {
      event.preventDefault();
      if (signing) return;
      var typed = accountInput ? accountInput.value : '';
      var password = passInput ? passInput.value : '';
      if (passInput) passInput.value = '';
      var email = root.ELAccount.loginEmail(typed);
      if (!email) {
        setModalError(failureMessage('empty-account'));
        if (accountInput) accountInput.focus();
        return;
      }
      if (!password) {
        setModalError(failureMessage('empty-password'));
        if (passInput) passInput.focus();
        return;
      }
      var child = root.ELAuth;
      if (!child || !child.uid || child.role === 'parent') {
        setModalError(failureMessage('no-child'));
        return;
      }
      var state = root.UnitScore.load(ctx.chapter, ctx.unitId);
      if (!tierEarned(state, ctx.rewardId)) {
        setModalError(failureMessage('not-earned'));
        return;
      }
      if (cached(ctx.chapter, ctx.unitId, ctx.rewardId)) {
        setModalError(failureMessage('already'));
        return;
      }
      signing = true;
      var go = document.getElementById('el-approve-go');
      if (go) go.disabled = true;
      setModalError('');
      approveWithPassword(ctx, child.uid, email, password).then(function (result) {
        password = '';
        if (!result || !result.ok) {
          signing = false;
          if (go) go.disabled = false;
          setModalError((result && result.message) || failureMessage(''));
          return;
        }
        remember(result.approval);
        closeModal();
        paintTicket(article, Object.assign({}, ctx, { approval: result.approval, preview: false }));
      }).catch(function () {
        password = '';
        signing = false;
        if (go) go.disabled = false;
        setModalError(failureMessage(''));
      });
    });
    if (accountInput) accountInput.focus();
  }

  function approveWithPassword(ctx, childUid, email, password) {
    var signedIn = false;
    return ensureApprover().then(function () {
      if (approverAuth.currentUser) return authMod.signOut(approverAuth);
    }).then(function () {
      return authMod.signInWithEmailAndPassword(approverAuth, email, password);
    }).then(function (cred) {
      signedIn = true;
      var profile = root.ELAccount.profileFromUser(cred.user);
      var gate = decisionAfterSignIn(profile);
      if (!gate.ok) return gate;
      var id = approvalId(ctx.chapter, ctx.unitId, ctx.rewardId);
      var ref = fsMod.doc(approverDb, 'users', childUid, 'approvals', id);
      return fsMod.getDoc(ref).then(function (snap) {
        if (snap && typeof snap.exists === 'function' && snap.exists()) {
          var existing = plainApproval(snap.id || id, snap.data() || {});
          remember(existing);
          return { ok: false, code: 'already', message: failureMessage('already'), approval: existing };
        }
        var record = approvalRecord(ctx, profile);
        record.approvedAt = fsMod.serverTimestamp();
        return fsMod.setDoc(ref, record).then(function () {
          return fsMod.getDoc(ref);
        }).then(function (saved) {
          var row = plainApproval(saved.id || id, (saved && saved.data && saved.data()) || record);
          if (!row.approvedAt) row.approvedAt = new Date().toISOString();
          return { ok: true, approval: row };
        });
      });
    }).catch(function (err) {
      var code = err && err.code ? String(err.code).replace(/^firestore\//, '') : '';
      if (code.indexOf('permission-denied') !== -1) code = 'permission-denied';
      if (code.indexOf('already-exists') !== -1) code = 'already-exists';
      return { ok: false, code: code, message: failureMessage(code) };
    }).then(function (result) {
      var done = Promise.resolve();
      if (signedIn && approverAuth) {
        done = authMod.signOut(approverAuth).catch(function () {});
      }
      return done.then(function () { return result; });
    });
  }

  function mountTicket(article, ctx) {
    if (!article) return;
    var button = article.querySelector('.sign-line');
    if (!button || ctx.preview || ctx.approval) return;
    button.onclick = function () {
      var known = cached(ctx.chapter, ctx.unitId, ctx.rewardId);
      if (known) {
        paintTicket(article, Object.assign({}, ctx, { approval: known }));
        return;
      }
      var state = root.UnitScore.load(ctx.chapter, ctx.unitId);
      if (!tierEarned(state, ctx.rewardId)) {
        var tip = document.getElementById('rewardTip');
        if (tip) tip.textContent = failureMessage('not-earned');
        return;
      }
      openModal(ctx, article);
    };
  }

  function attach(container, ctx) {
    var article = container && container.querySelector ? container.querySelector('.ticket') : null;
    if (!article) return;
    mountTicket(article, ctx);
    if (ctx.preview || !ctx.chapter || !ctx.unitId || !ctx.rewardId) return;
    ensureLoaded(ctx.chapter, ctx.unitId, ctx.rewardId).then(function (approval) {
      if (!approval || !article.isConnected) return;
      paintTicket(article, Object.assign({}, ctx, { approval: approval, preview: false }));
    });
  }

  root.ELApprove.attach = attach;
  root.ELApprove.paintTicket = paintTicket;

  injectStyle();
  document.addEventListener('el-auth', loadAll);
  if (root.ELAuth) loadAll();
})(typeof window !== 'undefined' ? window : globalThis);
