#!/usr/bin/env node
'use strict';
var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var vm = require('node:vm');
var values = {}, rejectWrite = '';
var context = {
  localStorage: {
    getItem: function (key) { return values[key] || null; },
    setItem: function (key, value) {
      if (key === rejectWrite) throw new Error('quota');
      values[key] = String(value);
    },
    removeItem: function (key) { delete values[key]; }
  },
  setTimeout: function () { return 1; },
  clearTimeout: function () {},
  addEventListener: function () {},
  document: { addEventListener: function () {} }
};
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/storage.js'), 'utf8'), context);
var MT = context.MT, key = 'mt99.progress.v1';
MT.progress = MT.storage.defaults();
MT.progress.mastered['2x3'] = true;
MT.progress.divWrong['12/3'] = { wrongCount: 2, rightStreak: 1, lastAt: 10, fromLevel: 3 };
MT.progress.addLevels[2].passed = true;
MT.progress.subMastered['9-3'] = true;
MT.progress.stats.totalCorrect = 21;
MT.progress.badges.push('star_starter');
['mixed', 'length', 'money', 'angle', 'time', 'mass'].forEach(function (id) {
  MT.progress.topics[id] = {
    skills: { convert: { completed: 4, clean: 2 } },
    wrong: {}, range: 100, lastSkill: 'convert'
  };
  MT.progress.topics[id].wrong[id + ':convert:100:3'] = {
    skill: 'convert', seed: 3, range: 100, wrongCount: 2, cleanStreak: 1, errorKind: 'calculation'
  };
});
MT.progress.topics.money.games = { combo: { rounds: 2, bestStars: 5 } };
MT.storage.flush();
var original = JSON.stringify(MT.progress);
var backup = MT.storage.backup();
var parsed = MT.storage.readBackup(backup);
assert.equal(JSON.stringify(parsed), original, 'all courses, stars, wrong answers and settings survive backup parsing');
MT.progress = MT.storage.defaults();
MT.progress.stats.totalCorrect = 3;
MT.storage.flush();
var previous = values[key];
MT.storage.importBackup(backup);
assert.equal(JSON.stringify(MT.storage.load()), original, 'import survives reload through the normal storage loader');
assert.equal(JSON.parse(values[key + '.before-import']).progress.stats.totalCorrect, 3, 'previous progress is retained independently');
assert.equal(JSON.parse(previous).stats.totalCorrect, 3);

function rejected(change) {
  var bad = JSON.parse(backup);
  change(bad);
  var before = values[key];
  assert.throws(function () { MT.storage.importBackup(JSON.stringify(bad)); });
  assert.equal(values[key], before, 'invalid backups never replace saved progress');
}
rejected(function (b) { b.app = 'OtherApp'; });
rejected(function (b) { b.version = 2; });
rejected(function (b) { b.progress = {}; });
rejected(function (b) { b.progress.stats.totalCorrect = -1; });
rejected(function (b) { b.progress.settings.speechOn = 'yes'; });
rejected(function (b) { b.progress.mastered['<img src=x>'] = true; });
rejected(function (b) { b.progress.divWrong['12/3'].wrongCount = '2'; });
rejected(function (b) { b.progress.levels[1].bestStars = 99; });
rejected(function (b) { b.progress.topics.money.games.combo.rounds = null; });
rejected(function (b) { b.progress.topics.money.wrong['money:convert:100:3'].seed = -1; });
assert.throws(function () { MT.storage.readBackup('{"__proto__":{},"app":"QiMath"}'); });
assert.throws(function () { MT.storage.readBackup('not JSON'); });
rejectWrite = key + '.before-import';
assert.throws(function () { MT.storage.importBackup(backup); }, /原进度仍保留/);
assert.equal(values[key], original, 'backup storage failure leaves current progress untouched');
rejectWrite = key;
assert.throws(function () { MT.storage.importBackup(backup); }, /原进度仍保留/);
assert.equal(values[key], original, 'import storage failure leaves current progress untouched');
console.log('check-progress-backup: ok (all courses, strict input, previous backup, storage failure)');
