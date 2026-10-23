#!/usr/bin/env node
'use strict';
var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var vm = require('node:vm');

// 执行实际全局键盘处理器，确保弹窗不会把按键传给后台题目。
var source = fs.readFileSync(path.join(__dirname, '../js/quiz.js'), 'utf8');
var handler = source.slice(source.indexOf('  function onKey(e) {'), source.indexOf('  /* ---------- 模式切换'));
var visibleModal = false, submissions = 0, prevented = 0, closed = 0;
var state = { active: true, locked: false, answer: '1' };
var dom = { resetModal: { hidden: true }, panel: { hidden: false }, quizPlay: { hidden: false } };
var onKey = vm.runInNewContext('(' + handler.trim() + ')', {
  S: state, dom: dom,
  document: { querySelector: function () { return visibleModal ? {} : null; } },
  haptic: function () {}, renderInput: function () {},
  submit: function () { submissions++; }, resetClose: function () { closed++; }
});
function press(key) { onKey({ key: key, preventDefault: function () { prevented++; } }); }
visibleModal = true;
['2', 'Backspace', 'Enter'].forEach(press);
assert.equal(state.answer, '1');
assert.equal(submissions, 0);
assert.equal(prevented, 0, 'Enter 必须留给弹窗中的原生按钮');
visibleModal = false;
press('2'); assert.equal(state.answer, '12');
press('Backspace'); assert.equal(state.answer, '1');
press('Enter'); assert.equal(submissions, 1); assert.equal(prevented, 1);
dom.resetModal.hidden = false;
press('Enter'); assert.equal(submissions, 1);
press('Escape'); assert.equal(closed, 1);
console.log('check-quiz-keyboard: ok (modal isolation, native Enter, digits, backspace, reset Escape)');
