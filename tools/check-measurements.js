#!/usr/bin/env node
'use strict';
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var g = {}; g.window = g;
['angle', 'time', 'mass'].forEach(function (name) {
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'js', name + '.js'), 'utf8'), g, { filename: name + '.js' });
});
var seen = { hour12: false, minute0: false, minute59: false, crossHour: false, sameHour: false, mass1000: false, mass9000: false, equalMass: false, equalAngle: false, acute: false, right: false, obtuse: false, subtract: false, add: false, zeroMass: false };
var count = 0;
['angle', 'time', 'mass'].forEach(function (name) {
  var model = g.MT[name];
  assert.strictEqual(model.id, name);
  assert.throws(function () { model.generate('invalid', 20, 0); }, /Unknown/);
  model.skills.forEach(function (skill) {
    assert.ok(skill.title && skill.description && skill.lessonHTML);
    for (var seed = 0; seed < 1600; seed++) {
      var q = model.generate(skill.id, 20, seed), d = q.data;
      count++;
      assert.strictEqual(q.id, name + ':' + skill.id + ':' + seed);
      assert.strictEqual(JSON.stringify(q), JSON.stringify(model.generate(skill.id, 100, seed)), 'questions restore deterministically regardless of arithmetic range');
      assert.ok(q.prompt && q.hint && q.explanation && q.speech && q.printPrompt && d);
      var answer = q.kind === 'choice' ? q.choices[q.answer] : q.answer;
      if (q.kind === 'choice') {
        assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length);
        assert.strictEqual(new Set(q.choices).size, q.choices.length);
        assert.strictEqual(answer, d.correctChoice);
      } else {
        assert.strictEqual(q.kind, 'number');
        assert.ok(Number.isInteger(answer) && answer >= 0 && answer <= 9000);
      }
      if (q.visualHTML) assert.ok(q.visualHTML.includes('role="img"') && q.visualHTML.includes('viewBox='));
      if (name === 'angle') {
        if (skill.id === 'parts') {
          assert.strictEqual(answer, d.part === 'vertex' ? 1 : 2);
          assert.ok(d.part === 'vertex' ? q.hint.includes('相交的点') : q.hint.includes('直直的边'));
        }
        if (skill.id === 'classify' || skill.id === 'compare') {
          var rays = Array.from(q.visualHTML.matchAll(/M 325 185 L 185 185 L ([\d.e+-]+) ([\d.e+-]+)/g));
          var actual = rays.map(function (r) { return Math.atan2(185 - Number(r[2]), Number(r[1]) - 185) * 180 / Math.PI; });
          if (skill.id === 'classify') {
            assert.strictEqual(answer, Math.abs(actual[0] - 90) < 1e-6 ? '直角' : actual[0] < 90 ? '锐角' : '钝角');
          } else {
            assert.strictEqual(actual.length, 2);
            assert.strictEqual(answer, Math.abs(actual[0] - actual[1]) < 1e-6 ? '一样大' : actual[0] > actual[1] ? '上面的角更大' : '下面的角更大');
          }
        }
        if (skill.id === 'classify') {
          assert.strictEqual(answer, d.degrees < 90 ? '锐角' : d.degrees === 90 ? '直角' : '钝角');
          seen[d.degrees < 90 ? 'acute' : d.degrees === 90 ? 'right' : 'obtuse'] = true;
        }
        if (skill.id === 'compare') {
          assert.strictEqual(answer, d.left === d.right ? '一样大' : d.left > d.right ? '上面的角更大' : '下面的角更大');
          if (d.left === d.right) seen.equalAngle = true;
          assert.ok(!/开口为 \d+ 度/.test(q.visualHTML), '比较角的读屏说明不能直接报出度数');
        }
      } else if (name === 'time') {
        if (skill.id === 'clock' || skill.id === 'minute') {
          assert.ok(d.hour >= 1 && d.hour <= 12 && d.minute >= 0 && d.minute < 60);
          assert.strictEqual(answer, d.hour + ':' + String(d.minute).padStart(2, '0'));
          var hands = Array.from(q.visualHTML.matchAll(/<path d="M 180 180 L ([\d.e+-]+) ([\d.e+-]+)"/g));
          assert.strictEqual(hands.length, 2);
          var positions = hands.map(function (r) { return (Math.atan2(Number(r[1]) - 180, 180 - Number(r[2])) + 2 * Math.PI) % (2 * Math.PI); });
          var readHour = Math.floor(positions[0] * 6 / Math.PI + 1e-7) || 12;
          var readMinute = Math.round(positions[1] * 30 / Math.PI) % 60;
          assert.strictEqual(answer, readHour + ':' + String(readMinute).padStart(2, '0'), '由SVG指针坐标独立读钟');
          if (skill.id === 'clock') assert.strictEqual(d.minute % 5, 0);
          for (var digit = 1; digit <= 12; digit++) assert.ok(q.visualHTML.includes('>' + digit + '</text>'));
          assert.strictEqual((q.visualHTML.match(/<path /g) || []).length, 62, '60 minute ticks plus two clock hands');
          if (d.hour === 12) seen.hour12 = true;
          if (d.minute === 0) {
            seen.minute0 = true;
            assert.ok(q.visualHTML.includes('正好指向 12'));
            assert.ok(!q.visualHTML.includes('第 0 个小格'));
          }
          if (d.minute === 59) seen.minute59 = true;
        }
        if (skill.id === 'convert') {
          assert.strictEqual(d.minutes, d.hours * 60 + d.extra);
          assert.strictEqual(answer, d.direction === 1 ? d.hours : d.minutes);
        }
        if (skill.id === 'elapsed') {
          assert.strictEqual(answer, d.end - d.start);
          assert.ok(d.start >= 0 && d.end < 24 * 60 && d.end > d.start);
          seen[Math.floor(d.start / 60) === Math.floor(d.end / 60) ? 'sameHour' : 'crossHour'] = true;
        }
      } else {
        if (skill.id === 'unit') assert.strictEqual(answer, d.expectedUnit);
        if (skill.id === 'convert') {
          assert.strictEqual(d.grams, d.kilograms * 1000);
          assert.strictEqual(answer, d.direction === 'kg-g' ? d.grams : d.kilograms);
          if (answer === 1000) seen.mass1000 = true;
          if (answer === 9000) seen.mass9000 = true;
        }
        if (skill.id === 'compare') {
          [d.left, d.right].forEach(function (m) { assert.strictEqual(m.grams, m.unit === '千克' ? m.value * 1000 : m.value); });
          assert.strictEqual(answer, d.left.grams === d.right.grams ? '一样重' : d.left.grams > d.right.grams ? '左边更重' : '右边更重');
          if (d.left.grams === d.right.grams) seen.equalMass = true;
        }
        if (skill.id === 'calculate') {
          assert.strictEqual(answer, d.initialGrams + (d.subtract ? -d.changeGrams : d.changeGrams));
          seen[d.subtract ? 'subtract' : 'add'] = true;
          if (answer === 0) seen.zeroMass = true;
        }
        if (skill.id === 'scale') { assert.strictEqual(answer, d.value); assert.strictEqual(q.unit, d.unit); }
      }
    }
    [-1, 0xffffffff, NaN, undefined].forEach(function (seed) {
      assert.strictEqual(JSON.stringify(model.generate(skill.id, 20, seed)), JSON.stringify(model.generate(skill.id, 20, seed)));
    });
  });
});
Object.keys(seen).forEach(function (key) { assert.ok(seen[key], 'must exercise boundary: ' + key); });
assert.ok(g.MT.mass.skills.find(function (s) { return s.id === 'compare'; }).lessonHTML.includes('1 千克棉花与 1 千克铁一样重'));
['angle', 'time', 'mass'].forEach(function (id) {
  g.MT[id].skills.forEach(function (skill) {
    var positions = {};
    for (var i = 0; i < 500; i++) {
      var q = g.MT[id].generate(skill.id, 20, i);
      if (q.kind !== 'choice') continue;
      var key = id === 'angle' && skill.id === 'judge' ? q.data.item : 'all';
      (positions[key] || (positions[key] = new Set())).add(q.answer);
    }
    Object.keys(positions).forEach(function (key) {
      assert.ok(positions[key].size >= 2, id + '/' + skill.id + '的每类选择题正确位置应变化');
      if (id === 'angle' && skill.id === 'judge' && key === '2') assert.strictEqual(positions[key].size, 3);
    });
  });
});
assert.ok(g.MT.time.skills.find(function (s) { return s.id === 'elapsed'; }).lessonHTML.includes('13:00 是下午 1 时'));
assert.ok(g.MT.mass.skills[0].lessonHTML.includes('二分硬币约重 1 克'));
assert.ok(!g.MT.mass.skills[0].lessonHTML.includes('一分硬币约重 2 克'));
console.log('check-measurements: ok (' + count + ' deterministic questions, angle/time/mass boundaries)');
