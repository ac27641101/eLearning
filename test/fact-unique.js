/* Every quiz question declares factKey: the one fact it tests.
   The same fact asked again — reworded, flipped to the negative, or
   bundled as 「哪兩項都對」— must reuse that key, and this check fails.
   Sort cards and order rounds are the lesson text, not a second quiz. */
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

function questionsOf(unit) {
  const out = [];
  (unit.levels || []).forEach(level => {
    (level.questions || []).forEach(q => out.push(q));
  });
  return out;
}

function audit(root) {
  const rows = [];
  FILES.forEach(file => {
    loadUnits(file, root).forEach(unit => {
      const qs = questionsOf(unit);
      const groups = {};
      const missing = [];
      qs.forEach(q => {
        if (!q.factKey) {
          missing.push(q.q || q.id || '(no question text)');
          return;
        }
        (groups[q.factKey] = groups[q.factKey] || []).push(q.q || q.id);
      });
      const dups = Object.keys(groups).filter(k => groups[k].length > 1);
      rows.push({
        file: file.split('/')[0],
        id: unit.id,
        name: unit.name,
        questions: qs.length,
        facts: Object.keys(groups).length,
        extra: qs.length - Object.keys(groups).length,
        missing,
        dups: dups.map(k => ({ key: k, n: groups[k].length, sample: groups[k][0] }))
      });
    });
  });
  return rows;
}

function report(rows) {
  rows.forEach(row => {
    const mark = (row.missing.length || row.dups.length) ? 'DUP' : 'ok ';
    console.log(
      mark + '  ' + row.file + '  ' + row.id + '  ' + row.name +
      '  題' + row.questions + '  不同事實' + row.facts +
      (row.extra ? '  多出' + row.extra : '')
    );
    row.dups.forEach(d => console.log('    ' + d.key + ' ×' + d.n + '  例：' + d.sample));
    row.missing.forEach(q => console.log('    缺 factKey：' + q));
  });
}

function assertUnique(rows) {
  const bad = rows.filter(row => row.missing.length || row.dups.length);
  assert.strictEqual(
    bad.length,
    0,
    'duplicate or missing factKey in: ' + bad.map(r => r.file + '/' + r.id).join(', ')
  );
}

function main() {
  const root = path.join(__dirname, '..');
  const rows = audit(root);
  report(rows);
  assertUnique(rows);
  console.log('fact-unique check passed');
}

if (require.main === module) main();

module.exports = { audit, report, assertUnique, main };
