/* 新增單元時，在 UNITS 加一筆，並放上同名資料夾。
   href 用相對路徑（大小寫要和資料夾一樣）。
   subject 用 SUBJECTS 的 id。還沒有單元的科目不會出現在首頁。 */
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
    }
  ];

  var list = document.getElementById('unit-list');
  if (!list) return;

  if (!UNITS.length) {
    var empty = document.createElement('p');
    empty.className = 'empty px';
    empty.textContent = '單元還沒放上來，晚一點再來玩吧！';
    list.appendChild(empty);
    return;
  }

  var known = {};
  SUBJECTS.forEach(function (subject) { known[subject.id] = subject; });

  var groups = SUBJECTS.map(function (subject) {
    return { subject: subject, units: [] };
  });
  var extra = [];

  UNITS.forEach(function (unit) {
    var subject = known[unit.subject];
    if (!subject) {
      extra.push(unit);
      return;
    }
    groups.forEach(function (group) {
      if (group.subject.id === subject.id) group.units.push(unit);
    });
  });

  if (extra.length) {
    groups.push({
      subject: { id: 'more', name: '其他', icon: '📚' },
      units: extra
    });
  }

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

  groups.forEach(function (group) {
    if (!group.units.length) return;

    var section = document.createElement('section');
    section.className = 'subject';
    section.dataset.subject = group.subject.id;

    var banner = document.createElement('div');
    banner.className = 'subject-banner px';

    var icon = document.createElement('span');
    icon.className = 'subject-icon';
    icon.textContent = group.subject.icon;
    icon.setAttribute('aria-hidden', 'true');

    var heading = document.createElement('h2');
    heading.className = 'subject-name';
    heading.id = 'subject-' + group.subject.id;
    heading.textContent = group.subject.name;
    section.setAttribute('aria-labelledby', heading.id);

    banner.append(icon, heading);

    var units = document.createElement('div');
    units.className = 'subject-units';
    group.units.forEach(function (unit) { units.appendChild(makeCard(unit)); });

    section.append(banner, units);
    list.appendChild(section);
  });
})();
