/* 新增單元時，在 UNITS 加一筆，並放上同名資料夾。
   href 用相對路徑（大小寫要和資料夾一樣）。
   subject 用 SUBJECTS 的 id。沒有單元的科目仍會出現，標成「尚未開放」。 */
(function () {
  'use strict';

  var SUBJECTS = [
    { id: 'chinese', name: '國語', icon: '📖' },
    { id: 'math', name: '數學', icon: '🔢' },
    { id: 'social', name: '社會', icon: '🧭' },
    { id: 'science', name: '自然', icon: '🌿' },
    { id: 'english', name: '英文', icon: '🔤' }
  ];

  var UNITS = [
    {
      subject: 'social',
      href: 'social-ch3/',
      icon: '🌾',
      title: '五上社會 CH3\n臺灣的物產資源',
      desc: '第三單元：田裡、牧場海洋、山林與山城'
    },
    {
      subject: 'social',
      href: 'social-g5/',
      icon: '🧭',
      title: '五上社會 CH4\n看見福爾摩沙',
      desc: '第四單元：從潟湖貿易走到大航海時代'
    },
    {
      subject: 'science',
      href: 'science-ch3/',
      icon: '🧪',
      title: '五上自然 CH3\n神奇的水溶液',
      desc: '第三單元：水溶液、酸鹼和導電'
    },
    {
      subject: 'science',
      href: 'science-ch4/',
      icon: '🍎',
      title: '五上自然 CH4\n力與運動',
      desc: '第四單元：地球引力、測量力和摩擦力'
    }
  ];

  var subjectList = document.getElementById('subject-list');
  var unitList = document.getElementById('unit-list');
  var titleEl = document.getElementById('hubTitle');
  var subEl = document.getElementById('hubSub');
  var noteEl = document.getElementById('hubNote');
  var backBtn = document.getElementById('subjectBack');
  if (!subjectList || !unitList) return;

  var known = {};
  SUBJECTS.forEach(function (subject) { known[subject.id] = subject; });

  var groups = SUBJECTS.map(function (subject) {
    return { subject: subject, units: [] };
  });
  UNITS.forEach(function (unit) {
    var group = groups.filter(function (item) { return item.subject.id === unit.subject; })[0];
    if (group) group.units.push(unit);
  });

  function makeCard(unit) {
    var link = document.createElement('a');
    link.className = 'unit-card px';
    link.href = unit.href;

    var icon = document.createElement('span');
    icon.className = 'unit-icon';
    icon.textContent = unit.icon;
    icon.setAttribute('aria-hidden', 'true');

    var title = document.createElement('span');
    title.className = 'unit-title';
    title.textContent = unit.title;

    var desc = document.createElement('span');
    desc.className = 'unit-desc';
    desc.textContent = unit.desc;

    var go = document.createElement('span');
    go.className = 'unit-go';
    go.textContent = '開始玩';

    link.append(icon, title, desc, go);
    return link;
  }

  function showNote(text) {
    noteEl.hidden = !text;
    noteEl.textContent = text || '';
  }

  function showSubjects() {
    subjectList.hidden = false;
    unitList.hidden = true;
    backBtn.hidden = true;
    titleEl.textContent = '選擇一個科目';
    subEl.textContent = '五年級的遊戲化學習。點一個科目，再挑單元！';
    showNote('');
    window.scrollTo(0, 0);
  }

  function showChapters(subjectId) {
    var group = groups.filter(function (item) { return item.subject.id === subjectId; })[0];
    if (!group || !group.units.length) {
      showSubjects();
      showNote('這個科目還沒開放，先選別的科目玩吧！');
      return;
    }
    subjectList.hidden = true;
    unitList.hidden = false;
    backBtn.hidden = false;
    titleEl.textContent = group.subject.name;
    subEl.textContent = '點一張卡片，就出發！';
    showNote('');

    unitList.replaceChildren();
    unitList.dataset.subject = group.subject.id;

    var banner = document.createElement('div');
    banner.className = 'subject-banner px';
    var icon = document.createElement('span');
    icon.className = 'subject-icon';
    icon.textContent = group.subject.icon;
    icon.setAttribute('aria-hidden', 'true');
    var heading = document.createElement('h2');
    heading.className = 'subject-name';
    heading.textContent = group.subject.name;
    banner.append(icon, heading);

    var units = document.createElement('div');
    units.className = 'subject-units';
    group.units.forEach(function (unit) { units.appendChild(makeCard(unit)); });
    unitList.append(banner, units);
    window.scrollTo(0, 0);
  }

  function openSubject(subjectId, push) {
    if (push) history.pushState({ subject: subjectId }, '', '#/' + subjectId);
    showChapters(subjectId);
  }

  groups.forEach(function (group) {
    var open = group.units.length > 0;
    var card = document.createElement('button');
    card.type = 'button';
    card.className = 'subject-card px' + (open ? '' : ' locked');
    card.dataset.subject = group.subject.id;
    if (!open) card.setAttribute('aria-disabled', 'true');

    var icon = document.createElement('span');
    icon.className = 'pick-icon';
    icon.textContent = group.subject.icon;
    icon.setAttribute('aria-hidden', 'true');

    var name = document.createElement('span');
    name.className = 'pick-name';
    name.textContent = group.subject.name;

    var state = document.createElement('span');
    state.className = open ? 'pick-count' : 'pick-soon';
    state.textContent = open ? group.units.length + ' 個單元' : '尚未開放';

    card.append(icon, name, state);
    card.addEventListener('click', function () {
      if (!open) {
        showNote(group.subject.name + '還沒開放，先選別的科目玩吧！');
        card.classList.remove('shake');
        void card.offsetWidth;
        card.classList.add('shake');
        return;
      }
      openSubject(group.subject.id, true);
    });
    subjectList.appendChild(card);
  });

  backBtn.addEventListener('click', function () {
    if (location.hash) history.back();
    else showSubjects();
  });

  window.addEventListener('popstate', function () {
    var id = (location.hash || '').replace(/^#\/?/, '');
    if (known[id]) showChapters(id);
    else showSubjects();
  });

  var startId = (location.hash || '').replace(/^#\/?/, '');
  if (known[startId]) showChapters(startId);
  else showSubjects();
})();
