#!/usr/bin/env node
'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var g = {};
g.window = g;
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'length.js'), 'utf8'), g, { filename: 'length.js' });
var length = g.MT.length;

assert.strictEqual(length.id, 'length');
assert.deepStrictEqual(Array.from(length.skills, function (s) { return s.id; }), ['recognize', 'unit', 'ruler', 'compare', 'convert']);
length.skills.forEach(function (skill) {
  assert.ok(skill.title && skill.description && skill.lessonHTML, skill.id + ' 课程内容完整');
});
assert.ok(length.skills[0].lessonHTML.includes('屏幕为示意，请用真实尺子观察实际长度。'));
assert.ok(length.skills[2].lessonHTML.includes('12－3＝9'));
assert.ok(length.skills[3].lessonHTML.includes('200＞150'));
assert.ok(length.skills[4].lessonHTML.includes('1 米＝100 厘米'));
assert.throws(function () { length.generate('unknown', 20, 0); }, /Unknown length skill/);

var seen = { zero: false, offset: false, answer100: false, answer900: false, input900: false, differentUnits: false, sameUnits: false, equal: false, greater: false, less: false };
var recognized = {};
var units = {};
var objects = {};
var comparisons = {};
var offsets = {};

length.skills.forEach(function (skill) {
  for (var seed = 0; seed < 2000; seed++) {
    var q = length.generate(skill.id, 20, seed);
    assert.strictEqual(JSON.stringify(q), JSON.stringify(length.generate(skill.id, 100, seed)), skill.id + ' seed 可还原，range 不改变长度题');
    assert.strictEqual(q.id, 'length:' + skill.id + ':' + seed);
    assert.strictEqual(q.skill, skill.id);
    assert.ok(q.prompt && q.hint && q.explanation && q.speech && q.printPrompt, '题目说明完整');
    assert.ok(q.kind === 'number' || q.kind === 'choice');
    if (q.kind === 'choice') {
      assert.ok(Array.isArray(q.choices));
      assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length);
      assert.strictEqual(new Set(q.choices).size, q.choices.length, '选项不能重名');
    } else {
      assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 900, '数值答案至多 3 位');
      assert.ok(q.unit === '米' || q.unit === '厘米');
    }
    var data = q.data;
    if (skill.id === 'recognize') {
      recognized[data.item] = true;
      assert.strictEqual(q.choices[q.answer], data.correctChoice);
    } else if (skill.id === 'unit') {
      units[data.expectedUnit] = true;
      objects[data.object] = true;
      assert.strictEqual(q.choices[q.answer], data.expectedUnit);
      assert.ok(q.prompt.includes('通常选哪个单位更方便'));
    } else if (skill.id === 'ruler') {
      assert.ok(data.start >= 0 && data.end <= data.axisMax && data.axisMax <= 15);
      assert.ok(data.end > data.start);
      assert.strictEqual(q.answer, data.end - data.start, '读尺应为终点减起点');
      assert.strictEqual(data.length, q.answer);
      assert.strictEqual(q.prompt, '看直尺，物体长多少厘米？', '读尺题干应要求看图');
      assert.ok(!/\d/.test(q.prompt), '题干不直接给出左右刻度');
      assert.strictEqual(q.printPrompt, q.prompt, '打印题同样通过图读尺');
      assert.ok(q.visualHTML.includes('viewBox="0 0 620 195"') && q.visualHTML.includes('role="img"'));
      assert.ok(q.visualHTML.includes('aria-label="厘米直尺：物体左端对齐 ' + data.start + '，右端对齐 ' + data.end + '。"'), '读屏名称保留左右端点');
      assert.ok(q.visualHTML.includes('font-size="' + (data.axisMax <= 10 ? 28 : 26) + '"'), '尺图刻度字号适合手机阅读');
      assert.ok(q.visualHTML.includes('单位：厘米') && q.visualHTML.includes('>0</text>'));
      assert.ok(q.visualHTML.includes('屏幕为示意，请用真实尺子观察实际长度。'));
      if (data.start === 0) seen.zero = true;
      else {
        seen.offset = true;
        offsets[data.start + ':' + data.end] = true;
        assert.notStrictEqual(q.answer, data.end, '偏移读尺不能把终点误当长度');
      }
    } else if (skill.id === 'compare') {
      [data.left, data.right].forEach(function (item) {
        assert.ok(Number.isInteger(item.value) && item.value >= 1);
        assert.ok(item.unit === '米' || item.unit === '厘米');
        assert.strictEqual(item.cm, item.unit === '米' ? item.value * 100 : item.value);
        assert.ok(item.cm <= 900, '比较长度不超过 9 米');
      });
      if (data.left.unit === data.right.unit) seen.sameUnits = true;
      else seen.differentUnits = true;
      comparisons[data.left.unit + ':' + data.right.unit] = true;
      var relation = data.left.cm > data.right.cm ? 'greater' : data.left.cm < data.right.cm ? 'less' : 'equal';
      var answer = relation === 'greater' ? '左边更长' : relation === 'less' ? '右边更长' : '一样长';
      assert.strictEqual(data.relation, relation);
      assert.strictEqual(q.choices[q.answer], answer, '比较前先统一单位');
      seen[relation] = true;
    } else if (skill.id === 'convert') {
      assert.ok(Number.isInteger(data.meters) && data.meters >= 1 && data.meters <= 9);
      assert.strictEqual(data.centimeters, data.meters * 100);
      assert.ok(data.centimeters <= 900);
      assert.strictEqual(q.answer, data.direction === 'm-cm' ? data.centimeters : data.meters);
      assert.strictEqual(q.unit, data.direction === 'm-cm' ? '厘米' : '米');
      if (q.answer === 100) seen.answer100 = true;
      if (q.answer === 900) seen.answer900 = true;
      if (q.prompt.includes('900 厘米')) seen.input900 = true;
    }
  }
});

assert.strictEqual(Object.keys(recognized).length, 8, '覆盖所有认知题');
assert.strictEqual(Object.keys(units).length, 2, '单位选择覆盖米和厘米');
assert.strictEqual(Object.keys(objects).length, 10, '覆盖全部日常测量对象');
assert.strictEqual(Object.keys(comparisons).length, 4, '两种单位的四种左右组合均有覆盖');
assert.ok(offsets['3:12'], '覆盖从 3 到 12，长度 9 厘米的偏移读尺');
Object.keys(seen).forEach(function (key) { assert.ok(seen[key], '应覆盖 ' + key); });
[0, 1, 0x7fffffff, 0xffffffff, -1, 123456789].forEach(function (seed) {
  length.skills.forEach(function (skill) {
    assert.strictEqual(JSON.stringify(length.generate(skill.id, 20, seed)), JSON.stringify(length.generate(skill.id, 20, seed)));
  });
});

console.log('check-length: ok (5 skills, 10000 seeded questions)');
