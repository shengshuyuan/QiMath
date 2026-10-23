#!/usr/bin/env node
'use strict';

var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var vm = require('node:vm');
var handlers = {}, saves = 0, wins = 0;
var document;
function node() {
  return {
    hidden: false, isConnected: true, children: [], attributes: {}, innerHTML: '',
    classList: { add: function () {}, remove: function () {} },
    appendChild: function (child) { this.children.push(child); },
    setAttribute: function (key, value) { this.attributes[key] = value; },
    getAttribute: function (key) { return this.attributes[key]; },
    focus: function () { document.activeElement = this; },
    addEventListener: function (name, fn) { this[name] = fn; }
  };
}
var ids = {};
['badge-grid', 'badge-stat', 'badges-modal', 'badges-close', 'btn-badges'].forEach(function (id) { ids[id] = node(); });
Object.defineProperty(ids['badge-grid'], 'innerHTML', { set: function () { this.children = []; } });
ids['badges-modal'].hidden = true;
ids['badges-modal'].querySelectorAll = function () { return [ids['badges-close']]; };
ids['badges-modal'].contains = function (target) { return target === ids['badges-close']; };
document = {
  activeElement: ids['btn-badges'], body: node(),
  createElement: node,
  getElementById: function (id) { return ids[id] || null; },
  addEventListener: function (event, fn) { (handlers[event] || (handlers[event] = [])).push(fn); }
};
var g = { document: document, setTimeout: function () {}, MT: {
  progress: { badges: ['star_starter', 'star_starter', 'unknown'], topics: {} },
  storage: { save: function () { saves++; } },
  sound: { play: function (id) { if (id === 'win') wins++; } }
} };
g.window = g;
var context = vm.createContext(g);
['mixed', 'length', 'angle', 'time', 'mass', 'money', 'badges'].forEach(function (id) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', id + '.js'), 'utf8'), context, { filename: id + '.js' });
});
var MT = g.MT;
MT.badges.init();
MT.badges.init();
assert.equal(handlers.keydown.length, 1, '重复初始化不得重复绑定');
MT.badges.open();
assert.equal(ids['badge-stat'].textContent, '已收集 1 / 14 枚勋章', '未知或重复 ID 不计入统计');
assert.equal(ids['badge-grid'].children.length, 14);
assert.equal(document.activeElement, ids['badges-close']);
var themeHtml = ids['badge-grid'].children.map(function (card) { return card.children[1].innerHTML; }).join('\n');
assert.ok(themeHtml.includes('看过提示或答错后完成的不计入'));
assert.ok(themeHtml.includes('0 / ' + MT.mixed.skills.length));
assert.ok(ids['badge-grid'].children[0].children[1].innerHTML.includes('启程小星'), '原来的勋章排在主题勋章前面');
function key(name, shift) {
  var e = { key: name, shiftKey: !!shift, prevented: false, preventDefault: function () { this.prevented = true; } };
  handlers.keydown.forEach(function (fn) { fn(e); });
  return e;
}
assert.equal(key('Tab').prevented, true);
assert.equal(document.activeElement, ids['badges-close']);
document.activeElement = ids['btn-badges'];
assert.equal(key('Tab', true).prevented, true);
assert.equal(document.activeElement, ids['badges-close']);
assert.equal(key('Escape').prevented, true);
assert.equal(ids['badges-modal'].hidden, true);
assert.equal(document.activeElement, ids['btn-badges']);
assert.equal(key('Tab').prevented, false, '关闭后不能截获页面 Tab');

['mixed', 'length', 'angle', 'time', 'mass', 'money'].forEach(function (id) {
  var skills = MT[id].skills;
  var bag = MT.progress.topics[id] = { skills: {} };
  MT.badges.checkTopic(id);
  assert.equal(MT.badges.has('topic_' + id), false);
  skills.forEach(function (skill) { bag.skills[skill.id] = { completed: 10, clean: 0 }; });
  MT.badges.checkTopic(id);
  assert.equal(MT.badges.has('topic_' + id), false, '提示后完成不可解锁');
  skills.forEach(function (skill, index) { bag.skills[skill.id].clean = index === 0 ? 0 : 1; });
  [0, -1, NaN, Infinity, '1'].forEach(function (invalid) {
    bag.skills[skills[0].id].clean = invalid;
    MT.badges.checkTopic(id);
    assert.equal(MT.badges.has('topic_' + id), false, '必须每个知识点都有效独立答对');
  });
  bag.skills.unknown = { clean: 999 };
  bag.skills[skills[0].id].clean = 1;
  var before = saves;
  MT.badges.checkTopic(id);
  MT.badges.checkTopic(id);
  assert.equal(MT.badges.has('topic_' + id), true);
  assert.equal(saves, before + 1, '不重复保存发放同一徽章');
  assert.equal(MT.progress.badges.filter(function (badge) { return badge === 'topic_' + id; }).length, 1);
});
assert.equal(wins, 6);
MT.badges.checkTopic('missing');
delete MT.progress.badges;
var beforeWins = wins;
MT.badges.open();
assert.equal(MT.progress.badges.length, 6, '打开时兼容旧用户历史达标进度');
assert.equal(wins, beforeWins, '补发不连续播放六个庆祝音');
assert.equal(ids['badge-stat'].textContent, '已收集 6 / 14 枚勋章');
MT.badges.unlock('not_a_badge');
assert.equal(MT.progress.badges.length, 6);
MT.progress = null;
MT.badges.unlock('star_starter');
MT.badges.checkTopic('mass');
console.log('check-badges: ok (6 topic awards, legacy counting, independent progress, idempotence, dialog keyboard/focus)');
