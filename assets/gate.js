/* 每一頁共用的登入。Firebase Auth（email/password，local persistence）。
   沒有 @ 的帳號會補上 @kids.local，所以小朋友打 ysc，媽媽打 smc。
   家長信箱只維護 PARENT_EMAILS 這一份。測試小孩在 TEST_ACCOUNTS，規則和一般孩子相同。
   這個檔在 <head> 裡同步執行，先把畫面鎖住。 */
(function (root) {
  'use strict';

  var PARENT_EMAILS = [
    'ac27641101@gmail.com',
    'smc@kids.local'
  ];
  var TEST_ACCOUNTS = [
    'test@kids.local'
  ];
  var DISPLAY_NAMES = { ysc: 'ysc', ytc: 'ytc', smc: 'smc', test: 'test' };
  var FIREBASE_VERSION = '12.6.0';

  var firebaseConfig = {
    apiKey: 'AIzaSyA_Ekniq-tpOR2RbTtlrjpPuBo3W8rLBCQ',
    authDomain: 'elearning-6448b.firebaseapp.com',
    projectId: 'elearning-6448b',
    storageBucket: 'elearning-6448b.firebasestorage.app',
    messagingSenderId: '61870775992',
    appId: '1:61870775992:web:3ebd39741faf7588839e4d'
  };

  function loginEmail(typed) {
    var value = String(typed || '').trim().toLowerCase();
    if (!value) return '';
    if (value.indexOf('@') === -1) return value + '@kids.local';
    return value;
  }

  function isParentEmail(email) {
    return PARENT_EMAILS.indexOf(String(email || '').trim().toLowerCase()) !== -1;
  }

  function isTestAccount(accountOrEmail) {
    var value = String(accountOrEmail || '').trim().toLowerCase();
    if (!value) return false;
    if (TEST_ACCOUNTS.indexOf(value) !== -1) return true;
    if (value.indexOf('@') === -1 && TEST_ACCOUNTS.indexOf(value + '@kids.local') !== -1) return true;
    return false;
  }

  function accountFromEmail(email) {
    var value = String(email || '').trim().toLowerCase();
    var at = value.indexOf('@');
    if (at > 0 && value.slice(at) === '@kids.local') return value.slice(0, at);
    return value;
  }

  function roleFromEmail(email) {
    return isParentEmail(email) ? 'parent' : 'child';
  }

  function displayName(account, role) {
    if (DISPLAY_NAMES[account]) return DISPLAY_NAMES[account];
    if (role === 'parent') return '家長';
    return account || '';
  }

  function authErrorText(code) {
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found' || code === 'auth/invalid-email') {
      return '帳號或密碼不對喔，再試一次吧！';
    }
    if (code === 'auth/too-many-requests') return '試太多次了，休息一下再來。';
    if (code === 'auth/network-request-failed') return '網路連不上，請檢查網路再試一次。';
    if (code === 'auth/unauthorized-domain') return '這個網站還沒加入登入名單。請爸爸到 Firebase 的 Authorized domains 加上 ac27641101.github.io。';
    return '登入沒有成功，請再試一次。';
  }

  function profileFromUser(user) {
    var email = String(user && user.email || '').toLowerCase();
    var role = roleFromEmail(email);
    var account = accountFromEmail(email);
    return {
      uid: user.uid,
      email: email,
      account: account,
      role: role,
      displayName: displayName(account, role)
    };
  }

  root.ELAccount = {
    PARENT_EMAILS: PARENT_EMAILS,
    TEST_ACCOUNTS: TEST_ACCOUNTS,
    DISPLAY_NAMES: DISPLAY_NAMES,
    loginEmail: loginEmail,
    isParentEmail: isParentEmail,
    isTestAccount: isTestAccount,
    accountFromEmail: accountFromEmail,
    roleFromEmail: roleFromEmail,
    displayName: displayName,
    authErrorText: authErrorText,
    profileFromUser: profileFromUser
  };

  if (typeof document === 'undefined') return;

  var auth = null;
  var authMod = null;
  var db = null;
  var fs = null;
  var booted = false;
  var busy = false;
  var reloading = false;
  var authSettled = false;

  function firebaseUrl(name) {
    return 'https://www.gstatic.com/firebasejs/' + FIREBASE_VERSION + '/' + name + '.js';
  }

  function injectStyle() {
    if (document.getElementById('el-gate-style')) return;
    var style = document.createElement('style');
    style.id = 'el-gate-style';
    style.textContent = [
      'html.el-locked,html.el-locked body{overflow:hidden}',
      'html.el-locked body{visibility:hidden !important}',
      'html.el-locked #el-gate,html.el-locked #el-gate *{visibility:visible !important}',
      '#el-gate{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;',
      'padding:24px 16px;background:linear-gradient(180deg,#7cc8ff 0%,#b9e6ff 62%,#5dbb3f 62%,#5dbb3f 66%,#8b5a2b 66%);',
      'font-family:"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC","WenQuanYi Micro Hei",sans-serif;',
      'color:#232323;font-weight:700}',
      '#el-gate *{box-sizing:border-box}',
      '#el-gate .el-cloud{position:absolute;top:8%;left:0;width:120px;height:28px;background:#fff;opacity:.85;',
      'box-shadow:24px -16px 0 #fff,56px -16px 0 #fff;pointer-events:none;animation:el-drift 60s linear infinite}',
      '#el-gate .el-cloud.c2{top:18%;width:90px;animation-duration:80s;animation-delay:-30s}',
      '@keyframes el-drift{from{transform:translateX(-200px)}to{transform:translateX(110vw)}}',
      '#el-gate .el-card{position:relative;width:min(520px,100%);background:#fff8e6;border:4px solid #232323;border-radius:8px;',
      'box-shadow:inset -5px -5px 0 rgba(0,0,0,.22),inset 5px 5px 0 rgba(255,255,255,.35),0 5px 0 rgba(0,0,0,.35);',
      'padding:22px 18px 16px;text-align:center}',
      '#el-gate .el-card.el-shake{animation:el-shake .4s}',
      '@keyframes el-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}',
      '#el-gate .el-icon{font-size:56px;line-height:1;margin-bottom:4px}',
      '#el-gate h1{margin:0 0 8px;font-size:32px;font-weight:900}',
      '#el-gate label{display:block;text-align:left;font-size:18px;margin:12px 0 6px}',
      '#el-gate input{display:block;width:100%;border:4px solid #232323;border-radius:12px;background:#fff;',
      'font:900 22px/1.2 inherit;padding:14px 14px;text-align:center;min-height:56px;',
      'box-shadow:inset -4px -4px 0 rgba(0,0,0,.12),inset 4px 4px 0 rgba(255,255,255,.6)}',
      '#el-gate input:focus{outline:4px solid #ff9800;outline-offset:2px}',
      '#el-gate button{margin-top:12px;width:100%;border:4px solid #232323;border-radius:12px;padding:14px 16px;min-height:56px;',
      'font:900 22px/1 inherit;color:#fff;background:#5dbb3f;text-shadow:2px 2px 0 rgba(0,0,0,.35);cursor:pointer;',
      'box-shadow:inset -5px -5px 0 rgba(0,0,0,.25),inset 5px 5px 0 rgba(255,255,255,.3),0 5px 0 rgba(0,0,0,.4);',
      'touch-action:manipulation}',
      '#el-gate button.el-secondary{background:#c08a55;min-height:52px;font-size:18px}',
      '#el-gate button:active{transform:translateY(4px);box-shadow:inset -5px -5px 0 rgba(0,0,0,.25),inset 5px 5px 0 rgba(255,255,255,.3),0 1px 0 rgba(0,0,0,.4)}',
      '#el-gate button:disabled{opacity:.7;cursor:default;transform:none}',
      '#el-gate .el-loading{font-size:20px;margin:8px 0 0;color:#5a3000}',
      '#el-gate .el-msg{min-height:1.5em;margin:12px 0 0;font-size:18px;line-height:1.5;color:#b3261e}',
      '#el-gate [hidden]{display:none !important}',
      '@media (prefers-reduced-motion:reduce){#el-gate .el-cloud{animation:none}#el-gate .el-card.el-shake{animation:none}}'
    ].join('');
    document.head.appendChild(style);
  }

  function pageUsesScores() {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute('src') || '';
      if (src.indexOf('unit-score.js') !== -1) return true;
    }
    return false;
  }

  function setInert(on) {
    if (!document.body) return;
    Array.prototype.forEach.call(document.body.children, function (el) {
      if (el.id === 'el-gate') return;
      if ('inert' in el) el.inert = on;
    });
  }

  function showMessage(text) {
    var msg = document.getElementById('el-gate-msg');
    var card = document.querySelector('#el-gate .el-card');
    if (msg) msg.textContent = text || '';
    if (text && card) {
      card.classList.remove('el-shake');
      void card.offsetWidth;
      card.classList.add('el-shake');
    }
  }

  function showLoading(text) {
    var loading = document.getElementById('el-gate-loading');
    var form = document.getElementById('el-gate-form');
    if (loading) {
      loading.hidden = false;
      loading.textContent = text || '正在確認是誰在玩…';
    }
    if (form) form.hidden = true;
  }

  function showForm() {
    var loading = document.getElementById('el-gate-loading');
    var form = document.getElementById('el-gate-form');
    if (loading) loading.hidden = true;
    if (form) form.hidden = false;
    var account = document.getElementById('el-account');
    if (account) account.focus();
  }

  function unlock() {
    var gate = document.getElementById('el-gate');
    if (gate) gate.remove();
    setInert(false);
    document.documentElement.classList.remove('el-locked');
  }

  function mount() {
    if (document.getElementById('el-gate')) return;
    var gate = document.createElement('div');
    gate.id = 'el-gate';
    gate.setAttribute('role', 'dialog');
    gate.setAttribute('aria-modal', 'true');
    gate.setAttribute('aria-labelledby', 'el-gate-title');
    gate.innerHTML = [
      '<div class="el-cloud"></div><div class="el-cloud c2"></div>',
      '<div class="el-card">',
      '<div class="el-icon" aria-hidden="true">🧭</div>',
      '<h1 id="el-gate-title">學習島</h1>',
      '<p id="el-gate-loading" class="el-loading">正在確認是誰在玩…</p>',
      '<form id="el-gate-form" hidden novalidate>',
      '<label for="el-account">帳號</label>',
      '<input id="el-account" name="username" type="text" autocomplete="username" autocapitalize="none"',
      ' autocorrect="off" spellcheck="false" enterkeyhint="next">',
      '<label for="el-pass">密碼</label>',
      '<input id="el-pass" name="password" type="password" autocomplete="current-password" enterkeyhint="go">',
      '<button type="button" class="el-secondary" id="el-show">顯示密碼</button>',
      '<button type="submit" id="el-go">進入</button>',
      '<p id="el-gate-msg" class="el-msg" role="alert" aria-live="assertive"></p>',
      '</form></div>'
    ].join('');
    document.body.appendChild(gate);
    setInert(true);
    var form = document.getElementById('el-gate-form');
    form.addEventListener('submit', onSubmit);
    document.getElementById('el-show').addEventListener('click', function () {
      var input = document.getElementById('el-pass');
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      this.textContent = show ? '隱藏密碼' : '顯示密碼';
      input.focus();
    });
    document.getElementById('el-account').addEventListener('input', function () {
      if (document.getElementById('el-gate-msg').textContent) showMessage('');
    });
    document.getElementById('el-pass').addEventListener('input', function () {
      if (document.getElementById('el-gate-msg').textContent) showMessage('');
    });
  }

  function publishAuth(profile) {
    root.ELAuth = profile;
    document.dispatchEvent(new CustomEvent('el-auth', { detail: profile }));
  }

  function waitForScoreApi(ms) {
    return new Promise(function (resolve) {
      var start = Date.now();
      (function tick() {
        if (root.UnitScore) return resolve(true);
        if (Date.now() - start > ms) return resolve(false);
        setTimeout(tick, 30);
      })();
    });
  }

  function writeProfile(user, profile) {
    var ref = fs.doc(db, 'users', user.uid);
    return fs.setDoc(ref, {
      account: profile.account,
      role: profile.role,
      email: profile.email,
      displayName: profile.displayName,
      updatedAt: new Date().toISOString()
    });
  }

  function writeScore(uid, chapter, unitId, state) {
    var ref = fs.doc(db, 'users', uid, 'scores', root.UnitScore.docId(chapter, unitId));
    var before = root.UnitScore.normalize(state);
    return fs.runTransaction(db, function (tx) {
      return tx.get(ref).then(function (snap) {
        var cloud = snap.exists() ? snap.data() : null;
        var merged = root.UnitScore.mergeState(state, cloud);
        tx.set(ref, root.UnitScore.toCloud(chapter, unitId, merged));
        return merged;
      });
    }).then(function (merged) {
      root.UnitScore.noteCloud(chapter, unitId, merged);
      if (JSON.stringify(root.UnitScore.normalize(before)) !== JSON.stringify(root.UnitScore.normalize(merged))) {
        document.dispatchEvent(new CustomEvent('el-scores-updated'));
      }
    }).catch(function () {
      return fs.getDoc(ref).then(function (snap) {
        if (!snap.exists() || !root.UnitScore) return;
        root.UnitScore.noteCloud(chapter, unitId, snap.data());
        document.dispatchEvent(new CustomEvent('el-scores-updated'));
      }).catch(function () {});
    });
  }

  function writeReview(uid, chapter, unitId, review) {
    var ref = fs.doc(db, 'users', uid, 'reviews', root.UnitScore.docId(chapter, unitId));
    return fs.runTransaction(db, function (tx) {
      return tx.get(ref).then(function (snap) {
        var cloud = snap.exists() ? snap.data() : null;
        var merged = root.UnitScore.mergeReview(cloud, review);
        tx.set(ref, root.UnitScore.toReviewCloud(chapter, unitId, merged));
        return merged;
      });
    }).then(function (merged) {
      root.UnitScore.noteReview(chapter, unitId, merged);
    }).catch(function () {});
  }

  function hydrateScores(user) {
    var finished = false;
    function finish(updated) {
      if (!root.UnitScore) return;
      if (!finished) {
        finished = true;
        root.UnitScore.markReady();
        return;
      }
      if (updated) document.dispatchEvent(new CustomEvent('el-scores-updated'));
    }
    var job = waitForScoreApi(8000).then(function (ok) {
      if (!ok || !root.UnitScore) return;
      root.UnitScore.bindUid(user.uid);
      root.UnitScore.setCloudWriter(function (chapter, unitId, state) {
        return writeScore(user.uid, chapter, unitId, state);
      });
      root.UnitScore.setReviewWriter(function (chapter, unitId, review) {
        return writeReview(user.uid, chapter, unitId, review);
      });
      return Promise.all([
        fs.getDocs(fs.collection(db, 'users', user.uid, 'scores')).then(function (snap) {
          snap.forEach(function (docSnap) {
            var data = docSnap.data() || {};
            var parts = docSnap.id.split('__');
            var chapter = data.chapter || parts[0];
            var unitId = data.unitId || parts.slice(1).join('__');
            if (chapter && unitId) root.UnitScore.noteCloud(chapter, unitId, data);
          });
        }),
        fs.getDocs(fs.collection(db, 'users', user.uid, 'reviews')).then(function (snap) {
          var entries = [];
          snap.forEach(function (docSnap) {
            var data = docSnap.data() || {};
            var parts = docSnap.id.split('__');
            entries.push({
              chapter: data.chapter || parts[0],
              unitId: data.unitId || parts.slice(1).join('__'),
              data: data
            });
          });
          root.UnitScore.replaceReviews(entries);
        }).catch(function () {})
      ]);
    }).then(function () {
      finish(true);
    }).catch(function () {
      finish(false);
    });
    setTimeout(function () { finish(false); }, 12000);
    return job;
  }

  var generation = 0;
  function onUser(user) {
    if (reloading) return;
    var gen = ++generation;
    authSettled = true;
    if (!user) {
      if (root.UnitScore) root.UnitScore.resetSession();
      root.ELAuth = null;
      showForm();
      return;
    }
    showLoading('正在準備你的星星…');
    var profile = profileFromUser(user);
    var tasks = [writeProfile(user, profile).catch(function () {})];
    if (pageUsesScores()) tasks.push(hydrateScores(user));
    Promise.all(tasks).then(function () {
      if (gen !== generation) return;
      publishAuth(profile);
      unlock();
    });
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (busy) return;
    if (!auth || !authMod) {
      showMessage('現在沒辦法連到登入服務，請檢查網路再重新整理。');
      return;
    }
    var accountInput = document.getElementById('el-account');
    var passInput = document.getElementById('el-pass');
    var email = loginEmail(accountInput ? accountInput.value : '');
    var password = passInput ? passInput.value : '';
    if (!email) {
      showMessage('請先輸入帳號喔。');
      if (accountInput) accountInput.focus();
      return;
    }
    if (!password) {
      showMessage('請先輸入密碼喔。');
      if (passInput) passInput.focus();
      return;
    }
    busy = true;
    reloading = true;
    var button = document.getElementById('el-go');
    if (button) button.disabled = true;
    showMessage('');
    try {
      await authMod.signInWithEmailAndPassword(auth, email, password);
      location.reload();
    } catch (err) {
      reloading = false;
      showMessage(authErrorText(err && err.code));
      if (passInput) {
        passInput.value = '';
        passInput.focus();
      }
    } finally {
      busy = false;
      if (button) button.disabled = false;
    }
  }

  root.ELSignOut = function () {
    reloading = true;
    var done = auth && authMod ? authMod.signOut(auth) : Promise.resolve();
    Promise.resolve(done).then(function () { location.reload(); }, function () { location.reload(); });
  };

  async function boot() {
    if (booted) return;
    booted = true;
    try {
      var mods = await Promise.all([
        import(firebaseUrl('firebase-app')),
        import(firebaseUrl('firebase-auth')),
        import(firebaseUrl('firebase-firestore'))
      ]);
      var appMod = mods[0];
      authMod = mods[1];
      var fsMod = mods[2];
      var app = appMod.initializeApp(firebaseConfig);
      auth = authMod.getAuth(app);
      await authMod.setPersistence(auth, authMod.browserLocalPersistence);
      db = fsMod.getFirestore(app);
      fs = fsMod;
      root.ELFirebase = {
        auth: auth,
        db: db,
        doc: fsMod.doc,
        getDoc: fsMod.getDoc,
        setDoc: fsMod.setDoc,
        deleteDoc: fsMod.deleteDoc,
        getDocs: fsMod.getDocs,
        collection: fsMod.collection,
        query: fsMod.query,
        where: fsMod.where
      };
      authMod.onAuthStateChanged(auth, onUser);
    } catch (err) {
      authSettled = true;
      showForm();
      showMessage('現在沒辦法連到登入服務，請檢查網路再重新整理。');
    }
    setTimeout(function () {
      if (!authSettled) showForm();
    }, 8000);
  }

  injectStyle();
  document.documentElement.classList.add('el-locked');
  if (document.body) {
    mount();
    boot();
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      mount();
      boot();
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
