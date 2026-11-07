#!/usr/bin/env node
'use strict';
// 通用找错游戏：每门专题课都能凑出 3 张文字卡、恰好 1 张答案错；点错不结束、点对进入下一轮、5 轮通关可重开。
var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var vm = require('node:vm');

// 极简 DOM：只提供游戏用到的 innerHTML / className / 事件 / appendChild / getElementById。
var byId = {};
function Element() { this.children = []; this.listeners = {}; this.className = ''; this.hidden = false; this.html = ''; }
Object.defineProperty(Element.prototype, 'innerHTML', {
  get: function () { return this.html; },
  set: function (html) {
    this.html = html;
    this.children = [];
    // 用 id="xxx" 登记新节点，让 getElementById 能找到刚渲染出来的容器。
    var re = /id="([^"]+)"/g, m;
    while ((m = re.exec(html))) byId[m[1]] = new Element();
  }
});
Element.prototype.addEventListener = function (type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); };
Element.prototype.click = function () { (this.listeners.click || []).forEach(function (fn) { fn(); }); };
Element.prototype.appendChild = function (child) { this.children.push(child); };
Element.prototype.querySelector = function () { return new Element(); };
Element.prototype.focus = function () {};
Object.defineProperty(Element.prototype, 'textContent', { set: function (t) { this.html = t; }, get: function () { return this.html; } });

var g = {
  console: console, Math: Math, navigator: {},
  document: {
    createElement: function () { return new Element(); },
    getElementById: function (id) { return byId[id] || null; }
  },
  MT: { progress: { settings: {} }, speech: { play: function () {}, stop: function () {}, warmup: function () {} }, sound: { play: function () {} } }
};
g.window = g;
vm.createContext(g);
['mixed.js', 'length.js', 'angle.js', 'time.js', 'mass.js', 'money.js', 'topic-games.js'].forEach(function (name) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', name), 'utf8'), g, { filename: name });
});
var MT = g.MT;

['mixed', 'length', 'angle', 'time', 'mass', 'money'].forEach(function (id) {
  var model = MT[id];
  assert.ok(MT.topicGames.available(model), id + ' 应有足够的文字题开放找错游戏');
  var exited = 0;
  var work = new Element();
  MT.topicGames.start(work, model, 20, function () { exited++; });
  assert.ok(work.innerHTML.includes('找出算错的小捣蛋'));

  for (var round = 0; round < 5; round++) {
    var cards = byId['topic-impostor-cards'].children;
    assert.equal(cards.length, 3, id + ' 每轮 3 张卡');
    var caught = cards.filter(function (c) { return c.className.includes('is-caught'); });
    assert.equal(caught.length, 0);
    // 先点一张对的卡：不结束本轮，给出反馈；再把错的那张找出来。
    var wrongPick = null, impostor = null;
    cards.forEach(function (card) {
      card.click();
      if (card.className.includes('is-caught')) impostor = card;
      else if (!wrongPick && card.className.includes('is-correct-checked')) wrongPick = card;
    });
    assert.ok(impostor, id + ' 第 ' + (round + 1) + ' 轮必须恰好有一张错卡');
    assert.equal(cards.filter(function (c) { return c.className.includes('is-caught'); }).length, 1);
    assert.ok(impostor.innerHTML.includes('impostor-fixed'), '抓到后显示正确答案');
    var summary = byId['topic-impostor-summary'];
    assert.equal(summary.hidden, false);
    assert.ok(summary.innerHTML.includes(round === 4 ? '全部通关' : '进入下一轮'));
    byId['topic-impostor-next'].click();
  }
  assert.ok(work.innerHTML.includes('第 1 / 5 轮'), '通关后再玩一轮回到第 1 轮');
  byId['topic-impostor-exit'].click();
  assert.equal(exited, 1, '退出按钮回到练习准备页');
});

// 不同范围下也能出题（混合运算与人民币有 100 以内进阶）。
var work100 = new Element();
MT.topicGames.start(work100, MT.money, 100, function () {});
assert.equal(byId['topic-impostor-cards'].children.length, 3);

console.log('check-topic-games: ok (6 courses, 3 cards with one impostor, wrong pick continues, 5 rounds, replay, exit)');
