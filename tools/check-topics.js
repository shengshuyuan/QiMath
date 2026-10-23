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
['core.js', 'ops.js', 'mul.js', 'div.js', 'add.js', 'sub.js', 'mixed.js', 'length.js', 'angle.js', 'time.js', 'mass.js', 'money.js', 'money-games.js', 'storage.js', 'topics.js'].forEach(load);
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


// 每门新课程真实进入、答错、重试、刷新、复习和打印，防止只加目录漏接共用流程。
['angle', 'time', 'mass'].forEach(function (id) {
  var model = MT[id], skill = model.skills[0].id;
  MT.topics.enter(id, { skill: skill, mode: 'learn' });
  assert.ok(work.html.includes(model.skills[0].title));
  seed = 0;
  action('start');
  var question = model.generate(skill, 20, 1);
  assert.ok(work.html.includes(question.prompt));
  if (question.kind === 'choice') {
    choose((question.answer + 1) % question.choices.length);
    choose(question.answer);
  } else {
    submit(question.answer + 1);
    submit(question.answer);
  }
  var topic = MT.progress.topics[id];
  assert.equal(topic.skills[skill].completed, 1);
  assert.equal(topic.skills[skill].clean, 0);
  assert.ok(topic.wrong[question.id]);
  roundTrip();
  assert.equal(MT.progress.topics[id].wrong[question.id].seed, 1);
  MT.topics.enter(id, { skill: skill, mode: 'wrong' });
  action('review-one', { question: question.id });
  if (question.kind === 'choice') choose(question.answer); else submit(question.answer);
  assert.equal(MT.progress.topics[id].wrong[question.id].cleanStreak, 1);
  action('quit');
  MT.progress.settings.printAnswers = 'on';
  assert.equal(MT.topics.buildPrint(printRoot), true);
  assert.ok(printRoot.innerHTML.includes(model.title + ' · 练习纸'));
  assert.ok(printRoot.innerHTML.includes('参考答案'));
});

// 克的换算必须允许输入四位数，包括屏幕键盘、粘贴过滤和提交校验。
var massSkill = MT.mass.skills.find(function (s) {
  return Array.from({ length: 20 }, function (_, i) { return MT.mass.generate(s.id, 20, i); })
    .some(function (q) { return q.kind === 'number' && q.answer >= 1000; });
});
assert.ok(massSkill, '必须包含千克换克的数值练习');
var massSeed = 0, massQuestion;
do { massQuestion = MT.mass.generate(massSkill.id, 20, ++massSeed); } while (massQuestion.kind !== 'number' || massQuestion.answer < 1000);
MT.progress.topics.mass.wrong[massQuestion.id] = { skill: massSkill.id, seed: massSeed, range: 20, wrongCount: 1, cleanStreak: 0 };
MT.topics.enter('mass', { skill: massSkill.id, mode: 'wrong' });
action('review-one', { question: massQuestion.id });
assert.ok(work.html.includes('maxlength="4"'));
String(massQuestion.answer).split('').forEach(function (key) { action('key', { key: key }); });
assert.equal(input.value, String(massQuestion.answer));
handlers.input({ target: Object.assign(input, { id: 'topic-answer' }) });
submit(input.value);
assert.equal(MT.progress.topics.mass.wrong[massQuestion.id].cleanStreak, 1);

// 提示先给思路，再显示解答；求助不能触发独立完成勋章。
var awards = [];
MT.badges = { checkTopic: function (id) { awards.push('topic:' + id); }, unlock: function (id) { awards.push(id); } };
MT.topics.enter('mass', { skill: 'convert', mode: 'practice' });
seed = 0;
action('start');
var helpQuestion = MT.mass.generate('convert', 20, 1);
action('hint');
assert.ok(work.html.includes(helpQuestion.hint));
assert.ok(work.html.includes('topic-hint'), '提示使用中性色块');
assert.ok(!work.html.includes('topic-solution'), '未完成时提示不能用答对的绿色块');
assert.ok(!work.html.includes(helpQuestion.explanation), '第一次提示不能直接展示完整解答');
assert.ok(work.html.includes('看完整解答'));
action('hint');
assert.ok(work.html.includes(helpQuestion.explanation));
assert.ok(work.html.includes('topic-hint'));
assert.ok(!work.html.includes('data-topic-action="hint"'), '完整解答展开后不再重复这个按钮');
submit(helpQuestion.answer);
assert.equal(awards.length, 0);
action('quit');
assert.ok(work.html.includes('独立完成 0 / 1 题'));
assert.ok(work.html.includes('本轮计划 6 题，已完成 1 题'));

// 两次复习明确展示进度；第二次才移出错题本、触发错题克星。
action('review-one', { question: helpQuestion.id });
submit(helpQuestion.answer);
assert.ok(work.html.includes('1 / 2 次'));
assert.deepEqual(awards, ['topic:mass']);
action('review-one', { question: helpQuestion.id });
submit(helpQuestion.answer);
assert.ok(work.html.includes('这题已移出错题本'));
assert.deepEqual(awards, ['topic:mass', 'mistake_slayer', 'topic:mass']);

// 小题库按实际变式数开轮，文案和结果一致；完成后能继续下一知识点。
MT.topics.enter('angle', { skill: 'parts', mode: 'practice' });
assert.ok(work.html.includes('每轮 2 题'));
assert.ok(work.html.includes('开始 2 题练习'));
seed = 0;
action('start');
assert.ok(work.html.includes('第 1 / 2 题'));
submit(MT.angle.generate('parts', 20, 1).answer);
action('next');
submit(MT.angle.generate('parts', 20, 2).answer);
action('next');
assert.ok(work.html.includes('独立完成 2 / 2 题'));
assert.ok(work.html.includes('学习下一个知识点'));
action('next-skill');
assert.equal(MT.progress.topics.angle.lastSkill, 'classify');
assert.ok(work.html.includes('直角、锐角和钝角'));
MT.topics.enter('angle', { skill: 'judge', mode: 'practice' });
assert.ok(work.html.includes('每轮 3 题'));

// 看图错题必须能展开原图，不靠相同题干猜是哪一题。
MT.progress.topics.time.wrong['time:clock:1'] = { skill: 'clock', seed: 1, range: 20, wrongCount: 1, cleanStreak: 0 };
MT.topics.enter('time', { skill: 'clock', mode: 'wrong' });
assert.ok(work.html.includes('查看这道题的图'));
assert.ok(work.html.includes(MT.time.generate('clock', 20, 1).visualHTML));

console.log('check-topics: ok (legacy progress, scoring, hints, partial rounds, short banks, next skill, awards, visual review, four-digit input, persistence/print)');
