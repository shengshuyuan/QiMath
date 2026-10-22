#!/usr/bin/env node
'use strict';

var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var vm = require('node:vm');
var clickHandler;
var board = { innerHTML: '' };
var g = {
  document: { addEventListener: function (event, handler) { if (event === 'click') clickHandler = handler; } }
};
g.window = g;
['money.js', 'money-games.js'].forEach(function (file) {
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8'), g, { filename: file });
});
var MT = g.MT;
MT.sound = { play: function () {} };
MT.storage = { save: function () {} };
MT.moneyGames.init();

function click(action, extra) {
  var btn = { dataset: Object.assign({ gameAction: action }, extra), closest: function () { return btn; } };
  clickHandler({ target: btn });
}
function add(ids) { ids.forEach(function (id) { click('add-denom', { id: id }); }); }
function passed() { return board.innerHTML.includes('data-game-action="next-level"'); }
function pay(ids) {
  add(ids);
  click('confirm-combo');
  assert.ok(passed(), '普通凑钱关卡仍应一次凑对即可通关');
  click('next-level');
}
function enterAlternative(range) {
  MT.moneyGames.startCombo(board, function () {});
  pay(range === 20 ? ['y1_c', 'y1_c', 'y1_c', 'y1_c', 'y1_c'] : ['y10', 'y5']);
  pay(range === 20 ? ['y1_c', 'y1_c', 'y1_c', 'j5_c'] : ['y5', 'y1_c', 'y1_c', 'y1_c', 'j5_c']);
  assert.ok(board.innerHTML.includes('第 3 关 · 换一种付法'));
  assert.ok(!board.innerHTML.includes('第一种付法已记录'), '上一关不得留下比较基准');
}

[20, 100].forEach(function (range) {
  MT.progress = { topics: { money: { range: range, games: {} } } };
  var first = range === 20 ? ['y1_c', 'y1_c'] : ['y5', 'y1_c'];
  var second = range === 20 ? ['j5_c', 'j5_c', 'j5_c', 'j5_c'] : ['y5', 'j5_c', 'j5_c'];
  enterAlternative(range);
  add(first);
  click('confirm-combo');
  assert.ok(board.innerHTML.includes('第一种付法凑对啦'));
  assert.ok(!passed(), '首次凑对只记录第一种付法，不能通关');
  click('next-level');
  assert.ok(board.innerHTML.includes('第 3 关 · 换一种付法'), '未通过不能进入下一关');
  assert.match(board.innerHTML, /data-game-action="undo"\s*>/, '首次凑对后仍能撤回');
  assert.match(board.innerHTML, /data-game-action="clear"\s*>/, '首次凑对后仍能清空');

  click('clear');
  add(first.slice().reverse());
  click('confirm-combo');
  assert.ok(!passed(), '相同组合即使调整加入顺序也不能通过');
  assert.ok(board.innerHTML.includes('这是上一次的付法哦'));
  click('clear');
  add(second);
  click('add-denom', { id: 'j1_c' });
  click('undo');
  click('remove-item', { index: String(second.length - 1) });
  add([second[second.length - 1]]);
  click('confirm-combo');
  assert.ok(passed(), '撤回、移除并修正后的第二种等值组合应通过');
  click('next-level');

  pay(range === 20 ? ['y5', 'y1_c', 'y1_c', 'j5_c', 'j1_c', 'j1_c', 'j1_c'] : ['y20', 'y5', 'y1_c', 'y1_c', 'y1_c']);
  pay(range === 20 ? ['y5', 'y1_c', 'y1_c', 'y1_c', 'y1_c', 'j5_c', 'j1_c'] : ['y50', 'y1_c', 'y1_c', 'j5_c']);
  assert.equal(MT.progress.topics.money.games.combo.rounds, 1);
  assert.equal(MT.progress.topics.money.games.combo.bestStars, 4, '重复组合记错后不应获得该关独立之星');

  // 再开一轮，比较记录清空；两次独立凑对仍可获得第 3 关星星。
  enterAlternative(range);
  add(first); click('confirm-combo');
  assert.ok(!passed());
  click('clear'); add(second); click('confirm-combo');
  assert.ok(passed());
  click('next-level');
  var starClasses = Array.from(board.innerHTML.matchAll(/class="game-star ([^"]+)"/g), function (match) { return match[1]; });
  assert.equal(starClasses[2], 'is-won', '两种付法均独立完成应获得第 3 关星星');

  MT.moneyGames.startCashier(board, function () {});
  add(['j5_c']); click('confirm-cashier');
  assert.ok(passed(), '收银员找零规则保持不变');
  click('next-level'); click('judge-exact');
  assert.ok(passed(), '收银员正好付款规则保持不变');
});

console.log('check-money-games: ok (both ranges, two payment methods, repeated combinations, edits, stars, cashier)');
