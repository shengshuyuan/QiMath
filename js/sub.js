(function (MT) {
  'use strict';

  var readNumber = MT.core.readNumber;
  var NAMES = ['', '5 以内', '10 以内基础', '十减几', '20 以内不退位', '20 以内退位', '综合巩固'];

  function key(m, s) { return m + '-' + s; }

  function parse(k) {
    var p = String(k).split('-');
    var m = parseInt(p[0], 10);
    var s = parseInt(p[1], 10);
    return { m: m, s: s, diff: m - s };
  }

  function spoken(m, s) {
    return readNumber(m) + '减' + readNumber(s) + '等于' + readNumber(m - s);
  }

  function bandOf(m, s) {
    if (m <= 5) return 1;
    if (m <= 9) return 2;
    if (m === 10) return 3;
    if ((s % 10) > (m % 10)) return 5;
    return 4;
  }

  function eachOrdered(fn) {
    var m, s;
    for (m = 0; m <= 20; m++) {
      for (s = 0; s <= m; s++) fn(m, s);
    }
  }

  function allKeys() {
    var out = [];
    eachOrdered(function (m, s) { out.push(key(m, s)); });
    return out;
  }

  function inBand(n) {
    var out = [];
    eachOrdered(function (m, s) {
      if (bandOf(m, s) === n) out.push(key(m, s));
    });
    return out;
  }

  function freshLevels() {
    var lv = {};
    for (var n = 1; n <= 6; n++) {
      lv[n] = { unlocked: n === 1, passed: false, bestStars: 0, roundsPlayed: 0 };
    }
    return lv;
  }

  function bag(p) {
    if (!p.subLevels) p.subLevels = freshLevels();
    p.subMastered = p.subMastered || {};
    p.subWrong = p.subWrong || {};
    p.subNeedsPractice = p.subNeedsPractice || {};
    return {
      levels: p.subLevels,
      mastered: p.subMastered,
      wrong: p.subWrong,
      needs: p.subNeedsPractice
    };
  }

  // 破十：被减数拆成 10 和剩下的，先用 10 去减。
  function method(m, s) {
    var diff = m - s;
    if (m < 10) return '被减数不到十，直接减。';
    if (m === 10) return '十减几：10－' + s + '＝' + diff + '。';
    if ((s % 10) <= (m % 10)) return '个位够减，不用破十。';
    if (s < 10) {
      return m + '－' + s + '＝10－' + s + '＋' + (m - 10) + '＝' + diff + '。先破开十来减。';
    }
    var tens = s - (s % 10);
    var ones = s % 10;
    return m + '－' + s + '＝' + m + '－' + tens + '－' + ones + '＝' + diff + '。先减整十，再减个位。';
  }

  function vizOpts(m, s, animate) {
    var diff = m - s;
    return {
      kind: 'sub',
      a: m,
      b: s,
      minuend: m,
      sub: s,
      from: m,
      to: diff,
      step: s,
      dir: -1,
      max: 20,
      parts: ['objects', 'numberline'],
      animate: animate !== false,
      captions: {
        capObjects: '原来 ' + m + ' 个，拿走 ' + s + ' 个，还剩 ' + diff + ' 个',
        capLine: '从 ' + m + ' 向左跳 ' + s + '，到 ' + diff
      }
    };
  }

  function fact(k) {
    var d = parse(k);
    var line = spoken(d.m, d.s);
    var how = method(d.m, d.s);
    return {
      answer: d.diff,
      askHTML: '<span class="tk-brand">' + d.m + '</span> － <span class="tk-accent">' + d.s + '</span> = ?',
      tip: '拿走一些，看还剩多少',
      speak: line,
      scene: 'calc',
      listHTML: d.m + ' － ' + d.s + ' = ?',
      helpCaption: how,
      helpViz: { type: 'objects', opts: vizOpts(d.m, d.s, true) },
      viz: function (type, animate) {
        var o = vizOpts(d.m, d.s, animate);
        o.compact = true;
        return { type: type, opts: o };
      }
    };
  }

  function fit(changed, a, b) {
    a = MT.core.clamp(parseInt(a, 10) || 0, 0, 20);
    b = MT.core.clamp(parseInt(b, 10) || 0, 0, 20);
    if (changed === 'b') {
      if (b > a) b = a;
    } else if (b > a) {
      b = a;
    }
    return { a: a, b: b };
  }

  var HEADS = [];
  for (var hi = 0; hi <= 20; hi++) HEADS.push(hi);

  var TRAPS = [
    { m: 13, s: 5, correct: 8, fake: 7, note: '13－5 要破十：10－5＋3＝8，不是 7。' },
    { m: 15, s: 7, correct: 8, fake: 7, note: '15－7：10－7＋5＝8，不是 7。' },
    { m: 12, s: 5, correct: 7, fake: 8, note: '12－5：10－5＋2＝7，不是 8。' },
    { m: 11, s: 3, correct: 8, fake: 7, note: '11－3：10－3＋1＝8，不是 7。' },
    { m: 14, s: 6, correct: 8, fake: 9, note: '14－6：10－6＋4＝8，不是 9。' },
    { m: 16, s: 9, correct: 7, fake: 8, note: '16－9：10－9＋6＝7，不是 8。' },
    { m: 10, s: 7, correct: 3, fake: 4, note: '10－7＝3，不是 4。' },
    { m: 20, s: 20, correct: 0, fake: 20, note: '20－20＝0，全部拿走就一个不剩。' },
    { m: 20, s: 8, correct: 12, fake: 18, note: '20－8：10－8＋10＝12，不是 18。' },
    { m: 17, s: 9, correct: 8, fake: 9, note: '17－9：10－9＋7＝8，不是 9。' },
    { m: 8, s: 3, correct: 5, fake: 6, note: '8－3＝5，被减数不到十，不是 6。' },
    { m: 10, s: 10, correct: 0, fake: 1, note: '10－10＝0。' }
  ];

  function rowText(m, s) { return m + ' - ' + s; }

  MT.sub = {
    id: 'sub',
    tableTab: '📋 减法表',
    levelCount: 6,
    layout: 'sums',
    views: ['objects', 'numberline', 'all'],
    detailViews: ['objects', 'numberline'],
    min: 0,
    max: 20,
    levelTitle: function (n) { return '第 ' + n + ' 关 · ' + NAMES[n]; },
    levelName: function (n) { return NAMES[n]; },
    bag: bag,
    row: function (n) { return n >= 6 ? allKeys() : inBand(n); },
    pool: function (n) {
      if (n >= 6) return allKeys();
      var out = [];
      for (var i = 1; i <= n; i++) out = out.concat(inBand(i));
      return out;
    },
    keys: allKeys,
    parse: parse,
    spoken: spoken,
    method: method,
    band: bandOf,
    eachOrdered: eachOrdered,
    score: function (k, b) {
      var s = 0;
      if (b.wrong[k]) s += 100 + Math.min(b.wrong[k].wrongCount || 0, 9);
      if (b.needs[k]) s += 20;
      if (!b.mastered[k]) s += 5;
      return s;
    },
    fact: fact,
    resetLevels: function (p) { p.subLevels = freshLevels(); },
    totals: function () { return HEADS.slice(); },
    totalLabel: '被减数',
    equations: function (m) {
      var out = [];
      for (var s = 0; s <= m; s++) out.push({ a: m, b: s });
      return out;
    },
    cell: function (m, s) {
      return { html: m + '−' + s, aria: spoken(m, s) };
    },
    cellKey: function (m, s) { return key(m, s); },
    stat: function (p) {
      var keys = allKeys();
      var book = bag(p);
      var n = 0;
      for (var i = 0; i < keys.length; i++) if (book.mastered[keys[i]]) n++;
      return '20 以内减法 · 已掌握 ' + n + ' / ' + keys.length;
    },
    detail: function (m, s, p) {
      var k = key(m, s);
      var book = bag(p);
      var badge = book.mastered[k] ? '已掌握' : (book.wrong[k] ? '答错过' : (book.needs[k] ? '需再练' : ''));
      var line = spoken(m, s);
      var f = fact(k);
      return {
        key: k,
        canSwap: false,
        eqHTML: '<span class="tk-brand">' + m + '</span> － <span class="tk-accent">' + s + '</span> = ' + (m - s),
        koujueText: line + (badge ? '　' + badge : ''),
        method: method(m, s),
        nameHTML: '<span class="sum-tag">算式名称</span>被减数 <b>' + m + '</b> － 减数 <b>' + s + '</b> = 差 <b>' + (m - s) + '</b>',
        speak: line,
        scene: 'calc',
        viz: f.viz
      };
    },
    speakCell: function (m, s) {
      return { text: spoken(m, s), scene: 'calc' };
    },
    fit: fit,
    span: function () { return { min: 0, max: 20 }; },
    allow: function (which, n, a) {
      if (which === 'b') return n >= 0 && n <= a;
      return n >= 0 && n <= 20;
    },
    explore: function (m, s) {
      var diff = m - s;
      var line = spoken(m, s);
      return {
        showStory: false,
        canSwap: false,
        labelA: '原来有几个？',
        labelB: '拿走几个？',
        wordA: '原来 ',
        wordB: '拿走 ',
        minusA: '原来减少一个',
        plusA: '原来增加一个',
        minusB: '少拿一个',
        plusB: '多拿一个',
        swapTitle: '',
        swapLabel: '',
        sumHTML:
          '<div class="sum-row sum-sub"><span class="tk-brand">' + m + '</span> <span class="op">－</span> ' +
          '<span class="tk-accent">' + s + '</span> <span class="op">=</span> ' + diff + '</div>' +
          '<div class="sum-desc"><span class="sum-tag">算式名称</span>被减数 <b>' + m + '</b> － 减数 <b>' + s + '</b> = 差 <b>' + diff + '</b></div>' +
          '<div class="sum-think">读作：<b>' + line + '</b></div>' +
          '<div class="sum-desc">' + method(m, s) + '</div>' +
          '<div class="sum-legend">留下的是还在的，划掉的是被拿走的</div>',
        speech: line,
        scene: 'calc',
        swapSpeech: line,
        viz: vizOpts(m, s, true)
      };
    },
    problemText: function (k) {
      var d = parse(k);
      return d.m + ' - ' + d.s + ' = ______';
    },
    answerText: function (k) {
      var d = parse(k);
      return d.m + ' - ' + d.s + ' = ' + d.diff;
    },
    printMeta: {
      blankTitle: '20 以内减法分解表',
      subtitle: '20 以内减法',
      answerTitle: '减法参考答案',
      problemTitle: function (n) { return '减法算一算（共 ' + n + ' 题）'; }
    },
    blankRows: function () {
      var rows = [];
      for (var m = 0; m <= 20; m++) {
        var cells = [];
        for (var s = 0; s <= m; s++) cells.push(m + '－' + s + '＝____');
        rows.push({ label: '被减数 ' + m, cells: cells });
      }
      return rows;
    },
    makeBubbles: function (roundIdx, memory) {
      if (roundIdx === 0 || !memory.subTargets || !memory.subTargets.length) {
        memory.subTargets = MT.core.shuffle(HEADS);
      }
      var target = memory.subTargets[roundIdx % memory.subTargets.length];
      var valid = [];
      var m, s;
      for (m = target; m <= 20; m++) valid.push({ m: m, s: m - target });
      valid = MT.core.shuffle(valid);
      var targetCount = Math.min(2, valid.length);
      var pool = [];
      eachOrdered(function (mm, ss) {
        var diff = mm - ss;
        if (diff !== target) pool.push({ m: mm, s: ss, diff: Math.abs(diff - target), value: diff });
      });
      pool = MT.core.shuffle(pool);
      pool.sort(function (p, q) { return p.diff - q.diff; });
      var items = [];
      var used = {};
      var id = 0;
      var i;
      var text;
      for (i = 0; i < targetCount; i++) {
        text = rowText(valid[i].m, valid[i].s);
        used[text] = true;
        items.push({
          id: 't_' + (++id),
          text: text,
          isTarget: true,
          isPopped: false,
          speak: spoken(valid[i].m, valid[i].s),
          scene: 'calc',
          miss: text + ' = ' + target + '，这张差就是 ' + target + '。'
        });
      }
      for (i = 0; i < pool.length && items.length < 6; i++) {
        text = rowText(pool[i].m, pool[i].s);
        if (used[text]) continue;
        used[text] = true;
        items.push({
          id: 'd_' + (++id),
          text: text,
          isTarget: false,
          isPopped: false,
          miss: text + ' = ' + pool[i].value + '，差不是 ' + target + ' 哦～'
        });
      }
      var lines = [];
      for (i = 0; i < valid.length; i++) {
        lines.push(valid[i].m + ' － ' + valid[i].s + ' = ' + target);
      }
      return {
        targetNum: target,
        items: MT.core.shuffle(items),
        total: targetCount,
        prefix: '找一找差等于',
        suffix: '的气球！',
        summaryNote: '差等于 <b>' + target + '</b> 的减法都在这里：',
        summaryLines: lines
      };
    },
    makeImpostors: function (roundIdx, memory) {
      if (roundIdx === 0 || !memory.subTraps || !memory.subTraps.length) {
        memory.subTraps = MT.core.shuffle(TRAPS);
      }
      var trap = memory.subTraps[roundIdx % memory.subTraps.length];
      var pool = [];
      eachOrdered(function (m, s) {
        if (m === trap.m && s === trap.s) return;
        pool.push({ m: m, s: s });
      });
      pool = MT.core.shuffle(pool);
      var picked = [];
      var seen = {};
      seen[rowText(trap.m, trap.s)] = true;
      for (var i = 0; i < pool.length && picked.length < 3; i++) {
        var text = rowText(pool[i].m, pool[i].s);
        if (seen[text]) continue;
        seen[text] = true;
        picked.push(pool[i]);
      }
      var cards = [{
        id: 'impostor_card',
        left: rowText(trap.m, trap.s),
        correctVal: trap.correct,
        displayVal: trap.fake,
        isImpostor: true,
        note: trap.note,
        isChecked: false,
        speak: spoken(trap.m, trap.s),
        scene: 'calc',
        aside: ''
      }];
      for (i = 0; i < picked.length; i++) {
        cards.push({
          id: 'correct_' + i,
          left: rowText(picked[i].m, picked[i].s),
          correctVal: picked[i].m - picked[i].s,
          displayVal: picked[i].m - picked[i].s,
          isImpostor: false,
          note: '',
          isChecked: false,
          speak: spoken(picked[i].m, picked[i].s),
          scene: 'calc',
          aside: ''
        });
      }
      return { cards: MT.core.shuffle(cards) };
    }
  };

  MT.op.add(MT.sub);
})(window.MT = window.MT || {});
