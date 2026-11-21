/* Choice options: the correct one is stored first (the game shuffles).
   Fail if, in any 小單元, that option is strictly the longest in more than 30% of items. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const FILES = [
  'social-ch3/data.js',
  'social-g5/data.js',
  'science-ch3/data.js',
  'science-ch4/data.js',
  'english-u34/data.js'
];

function loadUnits(file, root) {
  const window = {};
  vm.runInContext(
    fs.readFileSync(path.join(root, file), 'utf8'),
    vm.createContext({ window, console }),
    { filename: file }
  );
  const out = [];
  (window.UNITS || []).forEach(u => out.push(u));
  (window.LESSONS || []).forEach(ls => (ls.units || []).forEach(u => out.push(u)));
  (window.STANDALONE || []).forEach(u => out.push(u));
  return out;
}

function plain(s) {
  return String(s || '').replace(/<[^>]+>/g, '').trim();
}

function choiceOpts(q) {
  const raw = (q.opts && q.opts.length >= 2) ? q.opts : q.choices;
  if (!raw || raw.length < 2) return null;
  return raw.map(plain).filter(Boolean);
}

function unitRows(root) {
  const rows = [];
  FILES.forEach(file => {
    loadUnits(file, root).forEach(unit => {
      let items = 0;
      let longest = 0;
      (unit.levels || []).forEach(level => {
        (level.questions || []).forEach(q => {
          const opts = choiceOpts(q);
          if (!opts) return;
          items++;
          const lens = opts.map(o => o.length);
          const max = Math.max.apply(null, lens);
          if (lens[0] === max && lens.filter(n => n === max).length === 1) longest++;
        });
      });
      if (!items) return;
      rows.push({
        file: file.split('/')[0],
        id: unit.id,
        name: unit.name,
        items,
        longest,
        ratio: longest / items
      });
    });
  });
  return rows;
}

function report(rows) {
  rows.forEach(row => {
    const pct = (row.ratio * 100).toFixed(1);
    console.log(pct + '%  ' + row.longest + '/' + row.items + '  ' + row.file + '  ' + row.id + '  ' + row.name);
  });
}

function assertWithinLimit(rows) {
  assert.ok(rows.length >= 20, 'expected every live 小單元');
  const over = rows.filter(row => row.ratio > 0.30);
  over.forEach(row => {
    console.error(
      'TOO LONG: ' + row.file + ' ' + row.id + ' ' + row.name +
      '  ' + row.longest + '/' + row.items +
      '  ' + (row.ratio * 100).toFixed(1) + '%'
    );
  });
  assert.strictEqual(over.length, 0, 'correct option is strictly longest in more than 30% of a 小單元');
}

function main() {
  const root = path.join(__dirname, '..');
  const rows = unitRows(root);
  report(rows);
  assertWithinLimit(rows);
  console.log('option-length check passed');
}

if (require.main === module) main();

module.exports = { unitRows, report, assertWithinLimit, main };
