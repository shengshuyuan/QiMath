#!/usr/bin/env node
'use strict';
var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var vm = require('node:vm');

// 运行真实模块；仅在测试上下文暴露闭包，检查同题重试与跨题复习边界。
function element() {
  var classes = new Set();
  return {
    hidden: false, innerHTML: '', textContent: '', className: '',
    classList: {
      add: function (name) { classes.add(name); },
      remove: function () { Array.from(arguments).forEach(function (name) { classes.delete(name); }); },
      contains: function (name) { return classes.has(name); }, toggle: function () {}
    },
    appendChild: function () {}, addEventListener: function () {}, querySelector: function () { return null; }
  };
}
var book = { mastered: {}, needs: {}, wrong: {} }, saved = 0, awards = [];
var MT = {
  progress: { stats: { totalCorrect: 0, totalWrong: 0 }, settings: { autoNext: 'off' } },
  op: { current: function () { return {
    bag: function () { return book; }, levelTitle: function () { return '测试关卡'; },
    fact: function () { return { answer: 4, helpViz: { type: 'array', opts: {} } }; }
  }; } },
  storage: { save: function () { saved++; } }, bus: { emit: function () {} },
  badges: { unlock: function (id) { awards.push(id); } },
  sound: { play: function () {} }, speech: { play: function () {}, warmup: function () {} },
  visuals: { render: function () {} }
};
var context = vm.createContext({
  window: { MT: MT }, navigator: {}, console: console,
  document: { createElement: element }, setTimeout: function () { return 1; }, clearTimeout: function () {}
});
var source = fs.readFileSync(path.join(__dirname, '../js/quiz.js'), 'utf8');
source = source.replace('})(window.MT =', 'MT.testQuiz = { S: S, dom: dom, showQuestion: showQuestion, submit: submit, retry: retry, useHelp: useHelp };\n})(window.MT =');
vm.runInContext(source, context);
var test = MT.testQuiz;
['qCard', 'qTitle', 'qCount', 'qAsk', 'qTip', 'qInput', 'qFb', 'qHint', 'qActions', 'qDots', 'qBudget', 'btnHelp', 'keypad'].forEach(function (id) { test.dom[id] = element(); });
Object.assign(test.S, { active: true, round: ['2x2', '1x4'], idx: 0 });
function question() { test.showQuestion(); }
function answer(value) { test.S.answer = String(value); test.submit(); }

question(); answer(3); test.retry(); answer(4);
assert.equal(book.wrong['2x2'].rightStreak, 0, '同题答错后改对不是独立作答');
assert.equal(book.mastered['2x2'], undefined);
question(); answer(4);
assert.equal(book.wrong['2x2'].rightStreak, 1, '之后第一次独立答对仍保留错题');
question(); answer(4);
assert.equal(book.wrong['2x2'], undefined);
assert.equal(book.mastered['2x2'], true, '两次独立答对后恢复掌握');

question(); test.S.streak = 2;
var beforeWrong = MT.progress.stats.totalWrong, beforeSaved = saved;
test.useHelp();
assert.ok(book.wrong['2x2'], '求助后直接退出也要留下复习记录');
assert.equal(book.needs['2x2'], true);
assert.equal(book.mastered['2x2'], undefined, '求助题不能继续标为已掌握');
assert.equal(book.wrong['2x2'].rightStreak, 0);
assert.equal(MT.progress.stats.totalWrong, beforeWrong, '求助不算答错，也不扣挑战机会');
assert.ok(saved > beforeSaved, '求助时应立即安排保存');
answer(4);
assert.equal(book.wrong['2x2'].rightStreak, 0, '看答案后作答不累计独立复习次数');
assert.equal(test.S.streak, 0);
assert.equal(awards.includes('streak_master'), false, '求助不能接续独立连对勋章');
question(); answer(4);
assert.equal(book.wrong['2x2'].rightStreak, 1);
question(); test.useHelp();
assert.equal(book.wrong['2x2'].rightStreak, 0, '再次求助打断独立答对次数');
console.log('check-quiz-progress: ok (retry isolation, two clean reviews, persisted help, mastery, streak awards)');
