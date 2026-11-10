/* 新增單元時，在 UNITS 加一筆即可。href 請用相對路徑（大小寫要和資料夾一樣）。 */
(function () {
  'use strict';

  var UNITS = [
    {
      href: 'social-g5/',
      icon: '🧭',
      title: '五年級社會・看見福爾摩沙',
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

  UNITS.forEach(function (unit) {
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
    list.appendChild(link);
  });
})();
