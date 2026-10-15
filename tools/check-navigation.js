#!/usr/bin/env node
'use strict';

var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var vm = require('node:vm');
var context = { MT: { progress: { topics: {} } } };
context.window = context;
vm.createContext(context);
['mixed.js', 'length.js', 'navigation.js'].forEach(function (name) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', name), 'utf8'), context, { filename: name });
});
var nav = context.MT.navigation;
function plain(x) { return JSON.parse(JSON.stringify(x)); }

['', '#', '#/catalog', '#/course/unknown', '#/course/__proto__', '#/course/%3Cscript%3E'].forEach(function (hash) {
  assert.deepEqual(plain(nav.parse(hash)), { page: 'catalog' });
});
var checked = 0;
nav.courses.forEach(function (course) {
  var steps = course.topic === 'basic' ? ['explore', 'table', 'quiz', 'games'] : context.MT[course.id].skills.map(function (s) { return s.id; });
  ['learn', 'practice', 'wrong'].forEach(function (mode) {
    steps.forEach(function (step) {
      var normalized = nav.normalize({ course: course.id, mode: mode, view: step, skill: step });
      assert.deepEqual(plain(nav.parse(nav.hash(normalized))), plain(normalized), '复制地址、刷新和历史导航应恢复同一课程状态');
      assert.equal(normalized.mode, mode);
      if (course.topic === 'basic') {
        var allowed = mode === 'learn' ? ['explore', 'table'] : mode === 'practice' ? ['quiz', 'games'] : ['quiz'];
        assert.ok(allowed.includes(normalized.view), '工具必须属于当前学习方式');
      }
      checked++;
    });
  });
});
context.MT.progress.topics.mixed = { lastSkill: 'brackets' };
assert.equal(nav.normalize({ course: 'mixed' }).skill, 'brackets', '从目录进入时保留上次知识点');
assert.equal(nav.parse('#/course/mixed/addsub/learn').skill, 'addsub', '地址中明确的知识点优先于上次记录');
context.MT.progress.topics.mixed.lastSkill = 'missing';
assert.equal(nav.normalize({ course: 'mixed', skill: 'invalid', mode: 'invalid' }).skill, 'addsub');
assert.equal(nav.normalize({ course: 'mixed', mode: 'invalid' }).mode, 'learn');
assert.equal(nav.parse('#/course/mul/games/learn').view, 'explore');
assert.equal(nav.parse('#/course/add/table/wrong').view, 'quiz');
console.log('check-navigation: ok (' + checked + ' route combinations, invalid links, saved knowledge point)');
