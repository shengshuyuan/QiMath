#!/usr/bin/env node
'use strict';
// 今日推荐与家长小结：错题优先、未完成接着练、全新课先学、全部完成可轻松练。
var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var vm = require('node:vm');

var g = {
  console: console,
  MT: {
    op: {
      get: function (id) {
        if (id !== 'mul') return null;
        return {
          bag: function (p) {
            return p.mul;
          }
        };
      }
    },
    mixed: {
      skills: [
        { id: 'addsub', title: '加减混合' },
        { id: 'muldiv', title: '乘除混合' }
      ]
    },
    progress: {
      mul: {
        levels: { 1: { passed: true }, 2: { passed: false }, 3: { passed: false } },
        wrong: { a: 1, b: 1 }
      },
      topics: {
        mixed: {
          skills: { addsub: { clean: 1 } },
          wrong: {}
        }
      }
    }
  }
};
g.window = g;
vm.createContext(g);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'insights.js'), 'utf8'), g);

var MT = g.MT;
var courses = [
  { id: 'mul', topic: 'basic', title: '乘法', domain: '数与运算' },
  { id: 'mixed', topic: 'mixed', title: '混合运算', domain: '数与运算' },
  { id: 'length', topic: 'length', title: '长度单位', domain: '量与测量' }
];
MT.length = { skills: [{ id: 'ruler', title: '读尺' }] };

var stats = courses.map(function (c) { return { c: c, st: MT.insights.courseStats(c) }; });
assert.equal(stats[0].st.wrong, 2);
assert.equal(stats[0].st.done, 1);
assert.equal(stats[1].st.done, 1);
assert.equal(stats[1].st.total, 2);
assert.equal(stats[2].st.started, false);

var tip = MT.insights.recommend(stats);
assert.equal(tip.mode, 'wrong');
assert.equal(tip.course, 'mul');
assert.ok(/错题/.test(tip.title));

MT.progress.mul.wrong = {};
stats = courses.map(function (c) { return { c: c, st: MT.insights.courseStats(c) }; });
tip = MT.insights.recommend(stats);
assert.equal(tip.course, 'mul');
assert.equal(tip.mode, 'practice');
assert.equal(tip.view, 'quiz');

MT.progress.mul.levels = { 1: { passed: true }, 2: { passed: true }, 3: { passed: true } };
stats = courses.map(function (c) { return { c: c, st: MT.insights.courseStats(c) }; });
tip = MT.insights.recommend(stats);
assert.equal(tip.course, 'mixed');
assert.equal(tip.mode, 'practice');
assert.equal(tip.skill, 'muldiv');

MT.progress.topics.mixed.skills = { addsub: { clean: 1 }, muldiv: { clean: 2 } };
stats = courses.map(function (c) { return { c: c, st: MT.insights.courseStats(c) }; });
tip = MT.insights.recommend(stats);
assert.equal(tip.course, 'length');
assert.equal(tip.mode, 'learn');

var summary = MT.insights.parentSummary(stats);
assert.equal(summary.started, 2);
assert.equal(summary.wrongTotal, 0);
assert.ok(summary.tip);

console.log('check-insights: ok (wrong → incomplete → fresh, parent summary)');
