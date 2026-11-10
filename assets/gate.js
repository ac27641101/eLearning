/* 輕量入口：同一台裝置通過後，把 passed 記在 localStorage。
   這只是輕輕擋一下，不是真正的安全措施。密碼只以 SHA-256 雜湊比對。 */
(function () {
  'use strict';

  var STORAGE_KEY = 'elearning-gate';
  var PASSED = 'passed';
  // UTF-8 SHA-256。要換密碼時只改這段雜湊，不要把密碼寫進檔案。
  var PASS_HASH = '2dea8d8d4c4577d1ab7253f686cc20b4cd847d33db6216334bd59fe541c7c47a';

  function alreadyPassed() {
    try {
      return localStorage.getItem(STORAGE_KEY) === PASSED;
    } catch (err) {
      return false;
    }
  }

  if (alreadyPassed()) return;

  var style = document.createElement('style');
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
    '#el-gate .el-card{position:relative;width:min(420px,100%);background:#fff8e6;border:4px solid #232323;border-radius:8px;',
    'box-shadow:inset -5px -5px 0 rgba(0,0,0,.22),inset 5px 5px 0 rgba(255,255,255,.35),0 5px 0 rgba(0,0,0,.35);',
    'padding:22px 18px 16px;text-align:center}',
    '#el-gate .el-card.el-shake{animation:el-shake .4s}',
    '@keyframes el-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}',
    '#el-gate .el-icon{font-size:52px;line-height:1;margin-bottom:4px}',
    '#el-gate h1{margin:0;font-size:28px;font-weight:900}',
    '#el-gate .el-hint{margin:8px 0 14px;font-size:16px;line-height:1.5;color:#5a3000}',
    '#el-gate label{display:block;text-align:left;font-size:15px;margin:0 0 6px}',
    '#el-gate input{display:block;width:100%;border:4px solid #232323;border-radius:10px;background:#fff;',
    'font:900 22px/1.2 inherit;padding:12px 14px;letter-spacing:.2em;text-align:center;',
    'box-shadow:inset -4px -4px 0 rgba(0,0,0,.12),inset 4px 4px 0 rgba(255,255,255,.6)}',
    '#el-gate input:focus{outline:4px solid #ff9800;outline-offset:2px}',
    '#el-gate button{margin-top:12px;width:100%;border:4px solid #232323;border-radius:10px;padding:12px 16px;',
    'font:900 20px/1 inherit;color:#fff;background:#5dbb3f;text-shadow:2px 2px 0 rgba(0,0,0,.35);cursor:pointer;',
    'box-shadow:inset -5px -5px 0 rgba(0,0,0,.25),inset 5px 5px 0 rgba(255,255,255,.3),0 5px 0 rgba(0,0,0,.4);',
    'touch-action:manipulation}',
    '#el-gate button:active{transform:translateY(4px);box-shadow:inset -5px -5px 0 rgba(0,0,0,.25),inset 5px 5px 0 rgba(255,255,255,.3),0 1px 0 rgba(0,0,0,.4)}',
    '#el-gate .el-msg{min-height:1.5em;margin:12px 0 0;font-size:16px;line-height:1.5;color:#b3261e}',
    '@media (prefers-reduced-motion:reduce){#el-gate .el-cloud{animation:none}#el-gate .el-card.el-shake{animation:none}}'
  ].join('');
  document.head.appendChild(style);
  document.documentElement.classList.add('el-locked');

  function hex(buffer) {
    var bytes = new Uint8Array(buffer);
    var out = '';
    for (var i = 0; i < bytes.length; i++) {
      out += bytes[i].toString(16).padStart(2, '0');
    }
    return out;
  }

  function sameHash(a, b) {
    if (a.length !== b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  function digitsOnly(value) {
    return String(value).replace(/[０-９]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xFF10 + 0x30);
    }).replace(/\s+/g, '');
  }

  function showMessage(text) {
    var msg = document.getElementById('el-gate-msg');
    var card = document.querySelector('#el-gate .el-card');
    if (msg) msg.textContent = text;
    if (card) {
      card.classList.remove('el-shake');
      void card.offsetWidth;
      card.classList.add('el-shake');
    }
  }

  function unlock() {
    try {
      localStorage.setItem(STORAGE_KEY, PASSED);
    } catch (err) { /* 記不住就下次再問 */ }
    var gate = document.getElementById('el-gate');
    if (gate) gate.remove();
    Array.prototype.forEach.call(document.body.children, function (el) {
      if ('inert' in el) el.inert = false;
    });
    document.documentElement.classList.remove('el-locked');
  }

  var busy = false;
  async function onSubmit(event) {
    event.preventDefault();
    if (busy) return;
    var input = document.getElementById('el-pass');
    var value = digitsOnly(input ? input.value : '');
    if (!value) {
      showMessage('還沒輸入密碼喔，再試一次吧！');
      if (input) input.focus();
      return;
    }
    if (!window.crypto || !crypto.subtle) {
      showMessage('這個畫面沒辦法檢查密碼，請改用一般的瀏覽器開啟網站。');
      return;
    }
    busy = true;
    try {
      var digest = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
      if (sameHash(digest, PASS_HASH)) {
        unlock();
        return;
      }
      showMessage('密碼不對喔，再試一次吧！');
      if (input) {
        input.value = '';
        input.focus();
      }
    } finally {
      busy = false;
    }
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
      '<form id="el-gate-form" novalidate autocomplete="off">',
      '<div class="el-card">',
      '<div class="el-icon" aria-hidden="true">🧭</div>',
      '<h1 id="el-gate-title">請輸入密碼</h1>',
      '<p class="el-hint">請輸入數字密碼，就可以開始玩囉！</p>',
      '<label for="el-pass">密碼</label>',
      '<input id="el-pass" name="pass" type="password" inputmode="numeric" pattern="[0-9]*"',
      ' autocomplete="off" enterkeyhint="go" autocapitalize="off" autocorrect="off" spellcheck="false" autofocus>',
      '<button type="submit">進入</button>',
      '<p id="el-gate-msg" class="el-msg" role="alert" aria-live="assertive"></p>',
      '</div></form>'
    ].join('');
    document.body.prepend(gate);
    Array.prototype.forEach.call(document.body.children, function (el) {
      if (el !== gate && 'inert' in el) el.inert = true;
    });
    var form = document.getElementById('el-gate-form');
    form.addEventListener('submit', onSubmit);
    var input = document.getElementById('el-pass');
    input.addEventListener('input', function () {
      var msg = document.getElementById('el-gate-msg');
      if (msg && msg.textContent) msg.textContent = '';
    });
    input.focus();
  }

  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
