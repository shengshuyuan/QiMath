#!/usr/bin/env node
'use strict';

var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var vm = require('node:vm');
var sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'mixed.js'), 'utf8'), sandbox, { filename: 'mixed.js' });
var mixed = sandbox.window.MT.mixed;
var symbols = { '+': '＋', '-': '−', '*': '×', '/': '÷' };

function operation(op, a, b, range) {
  var result;
  if (op === '+') result = a + b;
  if (op === '-') result = a - b;
  if (op === '*') {
    assert.ok(a >= 1 && a <= 9 && b >= 1 && b <= 9, '乘法的两个因数必须在 1 到 9 之间');
    result = a * b;
  }
  if (op === '/') {
    assert.ok(b >= 1 && b <= 9, '除数必须在 1 到 9 之间');
    assert.equal(a % b, 0, '除法必须整除');
    result = a / b;
    assert.ok(result >= 1 && result <= 9, '除法的商必须在 1 到 9 之间');
  }
  assert.ok(Number.isInteger(result) && result >= 0 && result <= range, '每步结果必须是范围内的非负整数');
  return result;
}

function term(a, op, b) { return a + ' ' + symbols[op] + ' ' + b; }

function verify(q, range) {
  assert.equal(q.kind, 'steps');
  assert.equal(q.range, range);
  assert.equal(q.numbers.length, 3);
  assert.equal(q.operators.length, 2);
  q.numbers.forEach(function (n) {
    assert.ok(Number.isInteger(n) && n >= 0 && n <= range, '原始数字必须是范围内的非负整数');
  });
  var expectedFirst;
  if (q.group) expectedFirst = q.group === 'left' ? 0 : 1;
  else if (q.skill === 'priority') expectedFirst = q.operators[0] === '*' || q.operators[0] === '/' ? 0 : 1;
  else expectedFirst = 0;
  assert.equal(q.first, expectedFirst, '先算的位置应符合运算规则');
  assert.equal(q.correctFirst, expectedFirst);
  assert.equal(q.firstChoices.length, 2);
  assert.equal(q.firstChoices[0], term(q.numbers[0], q.operators[0], q.numbers[1]));
  assert.equal(q.firstChoices[1], term(q.numbers[1], q.operators[1], q.numbers[2]));
  assert.notEqual(q.firstChoices[0], q.firstChoices[1], '先算选项的文字不应重复');
  var intermediate = operation(q.operators[expectedFirst], q.numbers[expectedFirst], q.numbers[expectedFirst + 1], range);
  assert.equal(q.intermediate, intermediate, '中间结果应正确');
  var answer = expectedFirst === 0
    ? operation(q.operators[1], intermediate, q.numbers[2], range)
    : operation(q.operators[0], q.numbers[0], intermediate, range);
  var reduced = expectedFirst === 0
    ? term(intermediate, q.operators[1], q.numbers[2])
    : term(q.numbers[0], q.operators[0], intermediate);
  assert.equal(q.answer, answer, '最终结果应正确');
  assert.equal(q.reduced, reduced, '缩减式应保留未计算的数字和运算符');
  assert.equal(q.steps[0], q.firstChoices[expectedFirst] + ' ＝ ' + intermediate);
  assert.equal(q.steps[1], reduced + ' ＝ ' + answer);
  assert.ok(q.rule && q.hint && q.explanation && q.speech && q.printPrompt);
  assert.equal((q.expression.match(/（/g) || []).length, q.group ? 1 : 0);
  assert.equal((q.expression.match(/）/g) || []).length, q.group ? 1 : 0);
  var left = term(q.numbers[0], q.operators[0], q.numbers[1]);
  var right = term(q.numbers[1], q.operators[1], q.numbers[2]);
  var expression = q.group === 'left'
    ? '（' + left + '） ' + symbols[q.operators[1]] + ' ' + q.numbers[2]
    : q.group === 'right'
      ? q.numbers[0] + ' ' + symbols[q.operators[0]] + ' （' + right + '）'
      : left + ' ' + symbols[q.operators[1]] + ' ' + q.numbers[2];
  assert.equal(q.expression, expression, '显示算式应对应题目数据');
}

var skillIds = mixed.skills.map(function (skill) { return skill.id; });
assert.equal(JSON.stringify(skillIds), JSON.stringify(['addsub', 'muldiv', 'priority', 'brackets']));
var count = 0;
var sawZero = false;
var sawHundred = false;
var sawLeftBracket = false;
var sawRightBracket = false;
var sawBracketChangesPriority = false;
var sawDivThenMul = false;
var sawNonAssociativeDivision = false;
var sawPriorityLeft = false;
var sawPriorityRight = false;

mixed.skills.forEach(function (skill) {
  assert.ok(skill.title && skill.description && skill.lessonHTML);
  verify(skill.example, skill.example.range);
  [20, 100].forEach(function (range) {
    var unique = {};
    for (var seed = 0; seed < 4000; seed++) {
      var q = mixed.generate(skill.id, range, seed);
      verify(q, range);
      assert.equal(q.skill, skill.id);
      assert.equal(q.id, 'mixed:' + skill.id + ':' + range + ':' + seed);
      assert.equal(JSON.stringify(q), JSON.stringify(mixed.generate(skill.id, range, seed)), '相同 seed 应产生相同题目');
      unique[q.expression] = true;
      if (q.numbers.indexOf(0) >= 0 || q.answer === 0 || q.intermediate === 0) sawZero = true;
      if (q.numbers.indexOf(100) >= 0 || q.answer === 100 || q.intermediate === 100) sawHundred = true;
      if (skill.id === 'brackets') {
        if (q.group === 'left') sawLeftBracket = true;
        if (q.group === 'right') sawRightBracket = true;
        var firstOp = q.operators[q.first];
        var secondOp = q.operators[1 - q.first];
        if ((firstOp === '+' || firstOp === '-') && (secondOp === '*' || secondOp === '/')) sawBracketChangesPriority = true;
      }
      if (skill.id === 'priority') {
        if (q.first === 0) sawPriorityLeft = true;
        if (q.first === 1) sawPriorityRight = true;
      }
      if (skill.id === 'muldiv' && q.operators[0] === '/' && q.operators[1] === '*') {
        sawDivThenMul = true;
        if (q.numbers[2] > 1 && q.answer !== q.numbers[0] / (q.numbers[1] * q.numbers[2])) sawNonAssociativeDivision = true;
      }
      count++;
    }
    assert.ok(Object.keys(unique).length > 200, skill.id + ' 的题目应有足够变化');
  });
});

assert.ok(sawZero, '加减题应覆盖零');
assert.ok(sawHundred, '100 以内题应覆盖边界 100');
assert.ok(sawLeftBracket && sawRightBracket, '括号应覆盖左右位置');
assert.ok(sawBracketChangesPriority, '括号应覆盖先加减后乘除');
assert.ok(sawPriorityLeft && sawPriorityRight, '乘除优先应覆盖乘除在左右位置');
assert.ok(sawDivThenMul && sawNonAssociativeDivision, '除乘混合应从左向右，不能按右结合计算');

var leftToRight = mixed.skills[1].example;
assert.equal(leftToRight.expression, '24 ÷ 3 × 2');
assert.equal(leftToRight.correctFirst, 0);
assert.equal(leftToRight.intermediate, 8);
assert.equal(leftToRight.answer, 16);
assert.equal(mixed.skills[0].example.answer, 12);
assert.equal(mixed.skills[2].example.answer, 18);
assert.equal(mixed.skills[3].example.answer, 36);

[-1, 1.8, NaN, Infinity, undefined, '17', 4294967297].forEach(function (seed) {
  assert.equal(JSON.stringify(mixed.generate('priority', 20, seed)), JSON.stringify(mixed.generate('priority', 20, seed)));
});
assert.equal(mixed.generate('unknown', 10, 0).skill, 'addsub');
assert.equal(mixed.generate('unknown', 10, 0).range, 20);
assert.equal(mixed.generate('priority', '100', 5).range, 100);

console.log('check-mixed: ok (' + count + ' generated questions, 4 lesson examples)');
