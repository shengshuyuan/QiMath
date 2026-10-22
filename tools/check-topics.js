#!/usr/bin/env node
'use strict';

var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var vm = require('node:vm');

// 只模拟答题事件所需的 DOM；状态流转使用真实模块的公开入口和事件监听器。
var handlers = {};
var store = {};
var seed = 0;
var math = Object.create(Math);
math.random = function () { return (++seed) / 4294967296; };
var input = { value: '', select: function () {}, focus: function () {} };
var node = { textContent: '', classList: { toggle: function () {} }, focus: function () {} };
var work = {
  html: '',
  querySelector: function () { return node; }
};
Object.defineProperty(work, 'innerHTML', {
  get: function () { return this.html; },
  set: function (html) { this.html = html; input.value = ''; }
});
var panel = {
  classList: { toggle: function () {} },
  innerHTML: '',
  addEventListener: function (event, handler) { handlers[event] = handler; },
  querySelectorAll: function () { return []; },
  querySelector: function () { return null; },
  contains: function () { return true; }
};
var docHandlers = {};
var g = {
  console: console,
  Math: math,
  setTimeout: function () { return 1; },
  clearTimeout: function () {},
  localStorage: {
    getItem: function (key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
    setItem: function (key, value) { store[key] = String(value); },
    removeItem: function (key) { delete store[key]; }
  },
  document: {
    addEventListener: function (evt, fn) { (docHandlers[evt] || (docHandlers[evt] = [])).push(fn); },
    getElementById: function (id) {
      return id === 'panel-topic' ? panel : id === 'topic-work' ? work : id === 'topic-answer' ? input : node;
    }
  },
  addEventListener: function () {}
};
g.window = g;
var context = vm.createContext(g);
function load(file) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8'), context, { filename: file });
}
['core.js', 'ops.js', 'mul.js', 'div.js', 'add.js', 'sub.js', 'mixed.js', 'length.js', 'money.js', 'money-games.js', 'storage.js', 'topics.js'].forEach(load);
var MT = g.MT;
MT.speech = { stop: function () {}, play: function () {}, warmup: function () {} };
MT.sound = { play: function () {} };

// 旧版本没有 topics/settings.topic；读取时应补默认值并保留全部既有进度。
var legacy = {
  version: 1,
  mastered: { '3x2': true },
  needsPractice: { '4x3': true },
  wrong: { '5x2': { wrongCount: 2 } },
  levels: { 2: { unlocked: true, passed: true, bestStars: 3, roundsPlayed: 4 } },
  divMastered: { '12/3': true },
  divLevels: { 3: { unlocked: true, passed: true, bestStars: 2, roundsPlayed: 5 } },
  addMastered: { '3+4': true },
  addLevels: { 2: { unlocked: true, passed: true, bestStars: 2, roundsPlayed: 1 } },
  subWrong: { '9-3': { wrongCount: 2 } },
  subLevels: { 4: { unlocked: true, passed: true, bestStars: 1, roundsPlayed: 2 } },
  badges: ['star_starter'],
  settings: { op: 'add', soundOn: 'off' },
  stats: { totalCorrect: 27, totalWrong: 4, firstSeenAt: 1, lastSeenAt: 2 }
};
store['mt99.progress.v1'] = JSON.stringify(legacy);
var progress = MT.storage.load();
assert.equal(progress.settings.topic, 'basic');
assert.equal(Object.keys(progress.topics).length, 0);
assert.equal(progress.settings.op, 'add');
assert.equal(progress.settings.soundOn, 'off');
assert.equal(progress.mastered['2x3'], true);
assert.equal(progress.needsPractice['3x4'], true);
assert.equal(progress.wrong['2x5'].wrongCount, 2);
assert.equal(progress.divMastered['12/3'], true);
assert.equal(progress.addMastered['3+4'], true);
assert.equal(progress.subWrong['9-3'].wrongCount, 2);
assert.equal(progress.levels[2].bestStars, 3);
assert.equal(progress.divLevels[3].roundsPlayed, 5);
assert.equal(progress.addLevels[2].passed, true);
assert.equal(progress.subLevels[4].bestStars, 1);
assert.equal(progress.badges[0], 'star_starter');
assert.equal(progress.stats.totalCorrect, 27);
assert.equal(progress.stats.totalWrong, 4);
assert.equal(progress.stats.firstSeenAt, 1);

MT.progress = MT.storage.defaults();
MT.topics.init();
if (MT.moneyGames && MT.moneyGames.init) MT.moneyGames.init();
MT.topics.enter('mixed');
var q = MT.mixed.generate('addsub', 20, 1);
function bag() { return MT.progress.topics.mixed; }
function stats() { return bag().skills.addsub; }
function click(dataset) {
  var button = { dataset: dataset, closest: function () { return button; } };
  var event = { target: button };
  if (handlers.click) handlers.click(event);
  (docHandlers.click || []).forEach(function (fn) { fn(event); });
}
function action(name, extra) {
  var dataset = { topicAction: name };
  Object.keys(extra || {}).forEach(function (key) { dataset[key] = extra[key]; });
  click(dataset);
}
function choose(index) { action('choice', { choice: String(index) }); }
function submit(value) {
  input.value = String(value);
  var prevented = false;
  handlers.submit({ target: { id: 'topic-answer-form' }, preventDefault: function () { prevented = true; } });
  assert.ok(prevented, '答题不应触发表单导航');
}
function practice() {
  seed = 0;
  action('start');
  assert.ok(MT.topics.isActive());
  assert.ok(work.html.includes(q.expression), '首题应由真实生成器还原');
}
function review() {
  assert.ok(bag().wrong[q.id], '复习入口必须有对应错题');
  action('review-one', { question: q.id });
  assert.ok(MT.topics.isActive());
}
function solve() {
  choose(q.correctFirst);
  submit(q.intermediate);
  submit(q.answer);
}
function roundTrip() {
  MT.storage.flush();
  MT.progress = MT.storage.load();
}

// 三步共同组成一道题；中途不计分，重复点击/提交也不能重复计分。
practice();
choose(q.correctFirst);
choose(q.correctFirst);
assert.equal(MT.progress.stats.totalCorrect, 0);
submit(q.intermediate);
assert.equal(MT.progress.stats.totalCorrect, 0);
submit(q.answer);
submit(q.answer);
choose(q.correctFirst);
assert.equal(MT.progress.stats.totalCorrect, 1);
assert.equal(stats().completed, 1);
assert.equal(stats().clean, 1);

// 答错后完成会记录错题，但不增加独立完成数。
practice();
choose(1 - q.correctFirst);
solve();
assert.equal(MT.progress.stats.totalWrong, 1);
assert.equal(stats().completed, 2);
assert.equal(stats().clean, 1);
assert.equal(bag().wrong[q.id].cleanStreak, 0);
assert.equal(bag().wrong[q.id].errorKind, 'order');

review();
solve();
assert.equal(bag().wrong[q.id].cleanStreak, 1, '独立完成一次仍应留在错题本');
MT.progress.settings.topic = 'mixed';
bag().range = 100;
bag().lastSkill = 'addsub';
roundTrip();
assert.equal(MT.progress.settings.topic, 'mixed');
assert.equal(bag().range, 100);
assert.equal(bag().lastSkill, 'addsub');
assert.equal(bag().wrong[q.id].range, 20, '错题保留原题范围，不受当前范围切换影响');
assert.equal(bag().wrong[q.id].seed, 1);
assert.equal(bag().wrong[q.id].skill, 'addsub');
assert.equal(bag().wrong[q.id].cleanStreak, 1, '一次连续独立完成应能保存后恢复');

// 新的计算错误中断连续次数，纠正后仍不算独立完成。
review();
var cleanBefore = stats().clean;
choose(q.correctFirst);
submit(q.intermediate + 1);
assert.equal(bag().wrong[q.id].cleanStreak, 0);
assert.equal(bag().wrong[q.id].errorKind, 'calculation');
submit(q.intermediate);
submit(q.answer);
assert.equal(stats().clean, cleanBefore);
review();
solve();
assert.equal(bag().wrong[q.id].cleanStreak, 1);

// 求助也中断连续次数，完成被展示答案的题不能算独立答对。
review();
cleanBefore = stats().clean;
action('hint');
action('hint');
assert.equal(bag().wrong[q.id].cleanStreak, 0);
assert.equal(bag().wrong[q.id].errorKind, 'help');
solve();
assert.equal(stats().clean, cleanBefore);
assert.equal(bag().wrong[q.id].cleanStreak, 0);
review();
solve();
assert.equal(bag().wrong[q.id].cleanStreak, 1);
review();
solve();
assert.equal(bag().wrong[q.id], undefined, '连续两次独立完成后才移出错题本');
roundTrip();
assert.equal(bag().wrong[q.id], undefined, '移出错题本的状态应保存');

// 退出活动练习时先清理状态和重绘，再通知延迟更新可以继续。
bag().range = 20;
var ends = [];
MT.bus.on('topic:end', function () {
  ends.push({ active: MT.topics.isActive(), rendered: work.html.includes('开始 6 题练习') });
});
practice();
action('quit');
assert.equal(MT.topics.isActive(), false);
assert.equal(ends.length, 1);
assert.equal(ends[0].active, false);
assert.equal(ends[0].rendered, true);
click({ topicMode: 'learn' });
assert.equal(ends.length, 1, '没有活动练习时不应重复通知结束');

// 验证认识人民币课程接入与练习状态流转
MT.topics.enter('money', { skill: 'convert', mode: 'practice' });
assert.ok(work.html.includes('元角分换算练习'));
assert.ok(work.html.includes('20 元以内 · 基础'));
assert.ok(work.html.includes('100 元以内 · 进阶'));
assert.ok(work.html.includes('凑钱小能手'));
assert.ok(work.html.includes('小小收银员'));

// 验证人民币游戏子页面启动与退出
action('play-game', { game: 'combo' });
assert.equal(MT.moneyGames.getActiveGame(), 'combo');
assert.ok(work.html.includes('凑钱小能手'));
assert.equal(MT.topics.isActive(), true);

click({ gameAction: 'quit' });
assert.equal(MT.moneyGames.getActiveGame(), null);
assert.ok(work.html.includes('元角分换算练习'));

// 从游戏切到学习/错题时，应结束游戏，不能继续占用练习状态。
['combo', 'cashier'].forEach(function (game) {
  ['learn', 'wrong', 'practice'].forEach(function (mode) {
    action('play-game', { game: game });
    MT.topics.changeMode(mode);
    assert.equal(MT.moneyGames.getActiveGame(), null);
    assert.equal(MT.topics.isActive(), false, game + '切到' + mode + '应清理活动状态');
    assert.ok(!work.html.includes('data-game-action='));
  });
});

// 验证人民币打印纸生成
var printRoot = { innerHTML: '' };
assert.equal(MT.topics.buildPrint(printRoot), true);
assert.ok(printRoot.innerHTML.includes('认识人民币 · 练习纸'));
assert.ok(printRoot.innerHTML.includes('元角分换算'));

// 认识人民币进度、错题与游戏记录刷新后必须能恢复（曾漏接 storage 白名单）
MT.progress.topics.money = {
  skills: { convert: { completed: 4, clean: 2 }, shopping: { completed: 1, clean: 1 } },
  wrong: { 'money:convert:7': { skill: 'convert', seed: 7, range: 20, wrongCount: 2, cleanStreak: 1, errorKind: 'answer' } },
  range: 100,
  lastSkill: 'shopping',
  games: { combo: { rounds: 3, bestStars: 4 }, cashier: { rounds: 1, bestStars: 2 } }
};
MT.storage.flush();
MT.progress = MT.storage.load();
assert.ok(MT.progress.topics.money, 'money 主题进度应被加载');
assert.equal(MT.progress.topics.money.range, 100);
assert.equal(MT.progress.topics.money.lastSkill, 'shopping');
assert.equal(MT.progress.topics.money.skills.convert.clean, 2);
assert.equal(MT.progress.topics.money.wrong['money:convert:7'].seed, 7);
assert.equal(MT.progress.topics.money.games.combo.bestStars, 4);
assert.equal(MT.progress.topics.money.games.cashier.rounds, 1);

console.log('check-topics: ok (legacy data, persistence, scoring, clean streak, practice exit, money curriculum)');
