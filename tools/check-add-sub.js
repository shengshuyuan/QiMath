#!/usr/bin/env node
'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var store = {};
var g = {
  console: console,
  localStorage: {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  },
  document: {
    addEventListener: function () {},
    visibilityState: 'visible'
  },
  addEventListener: function () {}
};
g.window = g;
var context = vm.createContext(g);

function load(file) {
  var code = fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8');
  vm.runInContext(code, context, { filename: file });
}

['core.js', 'ops.js', 'mul.js', 'div.js', 'add.js', 'sub.js', 'storage.js', 'quiz.js'].forEach(load);
var MT = g.MT;

function uniq(list) {
  var seen = {};
  for (var i = 0; i < list.length; i++) {
    if (seen[list[i]]) return false;
    seen[list[i]] = true;
  }
  return true;
}

var orderedAdd = 0;
MT.add.eachOrdered(function () { orderedAdd++; });
assert.strictEqual(orderedAdd, 231, '加法有序算式');
assert.strictEqual(MT.add.keys().length, 121, '加法交换归并');

var orderedSub = 0;
MT.sub.eachOrdered(function () { orderedSub++; });
assert.strictEqual(orderedSub, 231, '减法算式');
assert.strictEqual(MT.sub.keys().length, 231, '减法保留顺序');
assert.strictEqual(MT.mul.keys().length, 45, '乘法仍为 45 组');
assert.strictEqual(MT.div.keys().length, 81, '除法仍为 81 式');
assert.strictEqual(MT.mul.levelCount, 9);
assert.strictEqual(MT.div.levelCount, 9);
assert.strictEqual(MT.add.levelCount, 6);
assert.strictEqual(MT.sub.levelCount, 6);

function assertPartition(mod) {
  var seen = {};
  var n, i, row, pool;
  for (n = 1; n <= 5; n++) {
    row = mod.row(n);
    assert.ok(row.length > 0, mod.id + ' 第 ' + n + ' 关没有题');
    for (i = 0; i < row.length; i++) {
      assert.ok(!seen[row[i]], mod.id + ' 关卡重叠 ' + row[i]);
      seen[row[i]] = n;
    }
  }
  var keys = mod.keys();
  assert.strictEqual(Object.keys(seen).length, keys.length, mod.id + ' 前五关没有盖住全部题');
  for (n = 1; n <= 5; n++) {
    pool = {};
    var got = mod.pool(n);
    for (i = 0; i < got.length; i++) pool[got[i]] = true;
    for (i = 0; i < keys.length; i++) {
      var band = seen[keys[i]];
      assert.strictEqual(!!pool[keys[i]], band <= n, mod.id + ' 已学范围不对 ' + keys[i]);
    }
  }
  var all = {};
  mod.row(6).forEach(function (k) { all[k] = true; });
  assert.strictEqual(Object.keys(all).length, keys.length, mod.id + ' 综合关没有包含全部');
}

assertPartition(MT.add);
assertPartition(MT.sub);

assert.strictEqual(MT.add.canon(3, 4), MT.add.canon(4, 3));
assert.strictEqual(MT.add.fact('3+4').answer, 7);
assert.strictEqual(MT.add.fact('4+3').answer, 7);
assert.strictEqual(MT.add.fact('3+4').speak, MT.add.spoken(3, 4));
assert.strictEqual(MT.add.spoken(3, 4), '三加四等于七');
assert.strictEqual(MT.add.fact('0+0').answer, 0);
assert.strictEqual(MT.add.fact('20+0').answer, 20);
assert.strictEqual(MT.add.fact('0+20').answer, 20);
assert.strictEqual(MT.add.fact('9+8').answer, 17);
assert.ok(MT.add.method(8, 5).indexOf('8＋2＋3＝13') !== -1);
assert.ok(MT.add.method(9, 8).indexOf('9＋1＋7＝17') !== -1);

var add85 = MT.add.explore(8, 5);
assert.strictEqual(add85.viz.a, 8);
assert.strictEqual(add85.viz.b, 5);
assert.strictEqual(add85.viz.dir, 1);
assert.strictEqual(add85.viz.from, 8);
assert.strictEqual(add85.viz.to, 13);
assert.strictEqual(MT.add.explore(0, 0).viz.a + MT.add.explore(0, 0).viz.b, 0);
assert.strictEqual(MT.add.explore(20, 0).viz.to, 20);

var fitAdd = MT.add.fit('a', 15, 10);
assert.strictEqual(fitAdd.a, 15);
assert.strictEqual(fitAdd.b, 5);
fitAdd = MT.add.fit('b', 15, 8);
assert.strictEqual(fitAdd.a, 15);
assert.strictEqual(fitAdd.b, 5);
assert.strictEqual(MT.add.allow('b', 6, 15), false);
assert.strictEqual(MT.add.allow('b', 5, 15), true);

assert.strictEqual(MT.sub.fact('0-0').answer, 0);
assert.strictEqual(MT.sub.fact('20-0').answer, 20);
assert.strictEqual(MT.sub.fact('20-20').answer, 0);
assert.strictEqual(MT.sub.fact('13-5').answer, 8);
assert.strictEqual(MT.sub.spoken(7, 3), '七减三等于四');
assert.ok(MT.sub.method(13, 5).indexOf('10－5＋3＝8') !== -1);
var sub135 = MT.sub.explore(13, 5);
assert.strictEqual(sub135.viz.minuend, 13);
assert.strictEqual(sub135.viz.sub, 5);
assert.strictEqual(sub135.viz.dir, -1);
assert.strictEqual(sub135.viz.from, 13);
assert.strictEqual(sub135.viz.to, 8);
assert.strictEqual(sub135.canSwap, false);
assert.strictEqual(MT.add.explore(3, 4).canSwap, true);
var fitSub = MT.sub.fit('a', 4, 9);
assert.strictEqual(fitSub.a, 4);
assert.strictEqual(fitSub.b, 4);
fitSub = MT.sub.fit('b', 6, 9);
assert.strictEqual(fitSub.a, 6);
assert.strictEqual(fitSub.b, 6);

function checkBubbles(mod, rounds) {
  var memory = {};
  for (var r = 0; r < rounds; r++) {
    var pack = mod.makeBubbles(r, memory);
    var texts = {};
    var targets = 0;
    assert.ok(pack.targetNum >= 0 && pack.targetNum <= 20);
    for (var i = 0; i < pack.items.length; i++) {
      var it = pack.items[i];
      assert.ok(!texts[it.text], mod.id + ' 气球重复 ' + it.text);
      texts[it.text] = true;
      var bits = it.text.split(mod.id === 'add' ? ' + ' : ' - ').map(Number);
      var value = mod.id === 'add' ? bits[0] + bits[1] : bits[0] - bits[1];
      if (it.isTarget) {
        targets++;
        assert.strictEqual(value, pack.targetNum);
      } else {
        assert.notStrictEqual(value, pack.targetNum);
      }
    }
    assert.strictEqual(targets, pack.total);
    assert.ok(targets >= 1 && pack.items.length <= 6 && pack.items.length >= targets);
  }
}

function checkImpostors(mod, rounds) {
  var memory = {};
  for (var r = 0; r < rounds; r++) {
    var pack = mod.makeImpostors(r, memory);
    var bad = 0;
    var lefts = {};
    assert.strictEqual(pack.cards.length, 4);
    for (var i = 0; i < pack.cards.length; i++) {
      var card = pack.cards[i];
      assert.ok(!lefts[card.left], mod.id + ' 捣蛋鬼卡片重复 ' + card.left);
      lefts[card.left] = true;
      var bits = card.left.split(mod.id === 'add' ? ' + ' : ' - ').map(Number);
      var value = mod.id === 'add' ? bits[0] + bits[1] : bits[0] - bits[1];
      assert.strictEqual(card.correctVal, value);
      if (card.isImpostor) {
        bad++;
        assert.notStrictEqual(card.displayVal, card.correctVal);
        assert.ok(card.note);
      } else {
        assert.strictEqual(card.displayVal, card.correctVal);
      }
    }
    assert.strictEqual(bad, 1);
  }
}

checkBubbles(MT.add, 21);
checkBubbles(MT.sub, 21);
checkImpostors(MT.add, 12);
checkImpostors(MT.sub, 12);

var mulPack = MT.mul.makeBubbles(0, {});
assert.ok(mulPack.items.length <= 6 && mulPack.total >= 1);
assert.strictEqual(MT.div.makeImpostors(0, {}).cards.length, 4);

var fresh = MT.storage.defaults();
MT.progress = fresh;
fresh.settings.op = 'mul';
var mulRound = MT.quiz.planRound(9, fresh);
assert.ok(mulRound.length <= 13 && mulRound.length >= 9);
assert.ok(uniq(mulRound));
fresh.settings.op = 'add';
var addRound = MT.quiz.planRound(6, fresh);
assert.ok(addRound.length <= 14 && addRound.length >= 1);
assert.ok(uniq(addRound));
addRound.forEach(function (k) {
  var ans = MT.add.fact(k).answer;
  assert.ok(ans >= 0 && ans <= 20);
});

store['mt99.progress.v1'] = JSON.stringify({
  version: 1,
  mastered: { '2x3': true, '3x2': true },
  needsPractice: {},
  wrong: { '4x4': { wrongCount: 2, rightStreak: 0 } },
  levels: { 3: { unlocked: true, passed: true, bestStars: 2, roundsPlayed: 4 } },
  divMastered: { '12d3': true },
  divLevels: { 2: { unlocked: true, passed: true, bestStars: 3, roundsPlayed: 1 } },
  badges: ['level_champion'],
  settings: { op: 'div', speechStyle: 'full' }
});
var loaded = MT.storage.load();
assert.strictEqual(loaded.mastered['2x3'], true);
assert.ok(!loaded.mastered['3x2']);
assert.strictEqual(loaded.levels[3].bestStars, 2);
assert.strictEqual(loaded.levels[3].passed, true);
assert.strictEqual(loaded.levels[1].unlocked, true);
assert.strictEqual(loaded.divMastered['12d3'], true);
assert.strictEqual(loaded.divLevels[2].bestStars, 3);
assert.strictEqual(loaded.addLevels[1].unlocked, true);
assert.strictEqual(loaded.addLevels[2].unlocked, false);
assert.strictEqual(Object.keys(loaded.addMastered).length, 0);
assert.strictEqual(Object.keys(loaded.subWrong).length, 0);
assert.strictEqual(loaded.badges[0], 'level_champion');
assert.strictEqual(loaded.settings.op, 'div');
assert.strictEqual(loaded.settings.speechOn, true);
loaded.addLevels[4].unlocked = true;
MT.add.resetLevels(loaded);
assert.strictEqual(loaded.addLevels[4].unlocked, false);
assert.strictEqual(loaded.levels[3].passed, true);
assert.strictEqual(loaded.subLevels[1].unlocked, true);

var blank = MT.add.blankRows();
assert.strictEqual(blank.length, 21);
assert.strictEqual(blank[13].cells.length, 14);
assert.ok(blank[13].cells.indexOf('8＋5＝____') !== -1);
var subBlank = MT.sub.blankRows();
assert.ok(subBlank[13].cells.indexOf('13－5＝____') !== -1);
assert.strictEqual(MT.add.problemText('8+5'), '8 + 5 = ______');
assert.strictEqual(MT.add.answerText('8+5'), '8 + 5 = 13');
assert.strictEqual(MT.sub.answerText('13-5'), '13 - 5 = 8');
assert.strictEqual(MT.mul.problemText('3x4'), '3 × 4 = ______');
assert.strictEqual(MT.div.answerText('12d3'), '12 ÷ 3 = 4');

console.log('check-add-sub: ok');
