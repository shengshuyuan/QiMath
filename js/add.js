(function (MT) {
  'use strict';

  var readNumber = MT.core.readNumber;
  var NAMES = ['', '5 以内', '10 以内基础', '凑成 10', '20 以内不进位', '20 以内进位', '综合巩固'];

  function key(a, b) { return a + '+' + b; }

  function canon(a, b) {
    a = parseInt(a, 10);
    b = parseInt(b, 10);
    if (a > b) { var t = a; a = b; b = t; }
    return a + '+' + b;
  }

  function parse(k) {
    var p = String(k).split('+');
    return { a: parseInt(p[0], 10), b: parseInt(p[1], 10) };
  }

  function spoken(a, b) {
    return readNumber(a) + '加' + readNumber(b) + '等于' + readNumber(a + b);
  }

  function bandOf(a, b) {
    var x = a <= b ? a : b;
    var y = a <= b ? b : a;
    var sum = x + y;
    if (sum <= 5) return 1;
    if (sum <= 9) return 2;
    if (sum === 10) return 3;
    if ((x % 10) + (y % 10) < 10) return 4;
    return 5;
  }

  function eachOrdered(fn) {
    var a, b;
    for (a = 0; a <= 20; a++) {
      for (b = 0; b <= 20 - a; b++) fn(a, b);
    }
  }

  function allCanon() {
    var out = [];
    var seen = {};
    eachOrdered(function (a, b) {
      var k = canon(a, b);
      if (!seen[k]) { seen[k] = true; out.push(k); }
    });
    return out;
  }

  function inBand(n) {
    var out = [];
    var keys = allCanon();
    for (var i = 0; i < keys.length; i++) {
      var f = parse(keys[i]);
      if (bandOf(f.a, f.b) === n) out.push(keys[i]);
    }
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
    if (!p.addLevels) p.addLevels = freshLevels();
    p.addMastered = p.addMastered || {};
    p.addWrong = p.addWrong || {};
    p.addNeedsPractice = p.addNeedsPractice || {};
    return {
      levels: p.addLevels,
      mastered: p.addMastered,
      wrong: p.addWrong,
      needs: p.addNeedsPractice
    };
  }

  // 凑十：先把较大的加数补成 10，再加剩下的。
  function method(a, b) {
    var sum = a + b;
    var base = a >= b ? a : b;
    var other = sum - base;
    if (sum < 10) return '两个数合起来不到十，直接数一数就行。';
    if (sum === 10) return a + '＋' + b + '刚好凑成十。';
    if (base >= 10) return base + ' 里已经有一个十，再添上 ' + other + '，就是 ' + sum + '。';
    var need = 10 - base;
    var rest = other - need;
    return base + '＋' + other + '＝' + base + '＋' + need + '＋' + rest + '＝' + sum + '。先把 ' + base + ' 凑成十。';
  }

  function vizOpts(a, b, animate) {
    var sum = a + b;
    return {
      kind: 'add',
      a: a,
      b: b,
      from: a,
      to: sum,
      step: b,
      dir: 1,
      max: 20,
      parts: ['objects', 'numberline'],
      animate: animate !== false,
      captions: {
        capObjects: '紫色 ' + a + ' 个，粉色 ' + b + ' 个，合起来 ' + sum + ' 个',
        capLine: '从 ' + a + ' 向右跳 ' + b + '，到 ' + sum
      }
    };
  }

  function fact(k) {
    var f = parse(k);
    var sum = f.a + f.b;
    var line = spoken(f.a, f.b);
    var how = method(f.a, f.b);
    return {
      answer: sum,
      askHTML: '<span class="tk-brand">' + f.a + '</span> ＋ <span class="tk-accent">' + f.b + '</span> = ?',
      tip: '把两部分合在一起',
      speak: line,
      scene: 'calc',
      listHTML: f.a + ' ＋ ' + f.b + ' = ?',
      helpCaption: how,
      helpViz: { type: 'objects', opts: vizOpts(f.a, f.b, true) },
      viz: function (type, animate) {
        var o = vizOpts(f.a, f.b, animate);
        o.compact = true;
        return { type: type, opts: o };
      }
    };
  }

  function fit(changed, a, b) {
    a = MT.core.clamp(parseInt(a, 10) || 0, 0, 20);
    b = MT.core.clamp(parseInt(b, 10) || 0, 0, 20);
    if (a + b > 20) b = 20 - a;
    void changed;
    return { a: a, b: b };
  }

  var SUMS = [];
  for (var si = 0; si <= 20; si++) SUMS.push(si);

  var TRAPS = [
    { a: 8, b: 5, correct: 13, fake: 12, note: '8＋5 要凑十：8＋2＋3＝13，不是 12。' },
    { a: 9, b: 6, correct: 15, fake: 14, note: '9＋6：9＋1＋5＝15，不是 14。' },
    { a: 7, b: 8, correct: 15, fake: 14, note: '7＋8 把 8 凑成十：8＋2＋5＝15，不是 14。' },
    { a: 9, b: 9, correct: 18, fake: 17, note: '9＋9：9＋1＋8＝18，不是 17。' },
    { a: 6, b: 7, correct: 13, fake: 12, note: '6＋7 把 7 凑成十：7＋3＋3＝13，不是 12。' },
    { a: 5, b: 8, correct: 13, fake: 12, note: '5＋8：8＋2＋3＝13，不是 12。' },
    { a: 4, b: 9, correct: 13, fake: 12, note: '4＋9：9＋1＋3＝13，不是 12。' },
    { a: 7, b: 5, correct: 12, fake: 11, note: '7＋5：7＋3＋2＝12，不是 11。' },
    { a: 8, b: 7, correct: 15, fake: 16, note: '8＋7：8＋2＋5＝15，不是 16。' },
    { a: 9, b: 3, correct: 12, fake: 11, note: '9＋3：9＋1＋2＝12，不是 11。' },
    { a: 6, b: 5, correct: 11, fake: 10, note: '6＋5：6＋4＋1＝11，不是 10。' },
    { a: 3, b: 4, correct: 7, fake: 8, note: '3＋4＝7，合起来不到十，不是 8。' }
  ];

  function rowText(a, b) { return a + ' + ' + b; }

  MT.add = {
    id: 'add',
    tableTab: '📋 加法表',
    levelCount: 6,
    layout: 'sums',
    views: ['objects', 'numberline', 'all'],
    detailViews: ['objects', 'numberline'],
    min: 0,
    max: 20,
    levelTitle: function (n) { return '第 ' + n + ' 关 · ' + NAMES[n]; },
    levelName: function (n) { return NAMES[n]; },
    bag: bag,
    row: function (n) { return n >= 6 ? allCanon() : inBand(n); },
    pool: function (n) {
      if (n >= 6) return allCanon();
      var out = [];
      for (var i = 1; i <= n; i++) out = out.concat(inBand(i));
      return out;
    },
    keys: allCanon,
    canon: canon,
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
    resetLevels: function (p) { p.addLevels = freshLevels(); },
    totals: function () { return SUMS.slice(); },
    totalLabel: '和',
    equations: function (sum) {
      var out = [];
      for (var a = 0; a <= sum; a++) out.push({ a: a, b: sum - a });
      return out;
    },
    cell: function (a, b) {
      return { html: a + '+' + b, aria: spoken(a, b) };
    },
    cellKey: function (a, b) { return canon(a, b); },
    stat: function (p) {
      var keys = allCanon();
      var book = bag(p);
      var n = 0;
      for (var i = 0; i < keys.length; i++) if (book.mastered[keys[i]]) n++;
      return '20 以内加法 · 已掌握 ' + n + ' / ' + keys.length;
    },
    detail: function (a, b, p) {
      var k = canon(a, b);
      var book = bag(p);
      var badge = book.mastered[k] ? '已掌握' : (book.wrong[k] ? '答错过' : (book.needs[k] ? '需再练' : ''));
      var line = spoken(a, b);
      var f = fact(key(a, b));
      return {
        key: k,
        canSwap: a !== b,
        eqHTML: '<span class="tk-brand">' + a + '</span> ＋ <span class="tk-accent">' + b + '</span> = ' + (a + b),
        koujueText: line + (badge ? '　' + badge : ''),
        method: method(a, b),
        nameHTML: '',
        speak: line,
        scene: 'calc',
        viz: f.viz
      };
    },
    speakCell: function (a, b) {
      return { text: spoken(a, b), scene: 'calc' };
    },
    fit: fit,
    span: function () { return { min: 0, max: 20 }; },
    allow: function (which, n, a) {
      if (which === 'b') return n >= 0 && n <= 20 - a;
      return n >= 0 && n <= 20;
    },
    explore: function (a, b) {
      var sum = a + b;
      var how = method(a, b);
      var swapLine = spoken(b, a);
      return {
        showStory: false,
        canSwap: true,
        labelA: '第一个加数',
        labelB: '第二个加数',
        wordA: '第一个加数 ',
        wordB: '第二个加数 ',
        minusA: '减少第一个加数',
        plusA: '增加第一个加数',
        minusB: '减少第二个加数',
        plusB: '增加第二个加数',
        swapTitle: '交换两个加数，和不变',
        swapLabel: '交换加数 ⇄',
        sumHTML:
          '<div class="sum-row sum-add"><span class="tk-brand">' + a + '</span> <span class="op">＋</span> ' +
          '<span class="tk-accent">' + b + '</span> <span class="op">=</span> ' + sum + '</div>' +
          '<div class="sum-think">读作：<b>' + spoken(a, b) + '</b></div>' +
          '<div class="sum-desc">' + how + '</div>' +
          '<div class="sum-legend">紫色是第一个加数，粉色是第二个加数</div>',
        speech: spoken(a, b),
        scene: 'calc',
        swapSpeech: swapLine,
        viz: vizOpts(a, b, true)
      };
    },
    problemText: function (k) {
      var f = parse(k);
      return f.a + ' + ' + f.b + ' = ______';
    },
    answerText: function (k) {
      var f = parse(k);
      return f.a + ' + ' + f.b + ' = ' + (f.a + f.b);
    },
    printMeta: {
      blankTitle: '20 以内加法分解表',
      subtitle: '20 以内加法',
      answerTitle: '加法参考答案',
      problemTitle: function (n) { return '加法算一算（共 ' + n + ' 题）'; }
    },
    blankRows: function () {
      var rows = [];
      for (var s = 0; s <= 20; s++) {
        var cells = [];
        for (var a = 0; a <= s; a++) cells.push(a + '＋' + (s - a) + '＝____');
        rows.push({ label: '和 ' + s, cells: cells });
      }
      return rows;
    },
    makeBubbles: function (roundIdx, memory) {
      if (roundIdx === 0 || !memory.addTargets || !memory.addTargets.length) {
        memory.addTargets = MT.core.shuffle(SUMS);
      }
      var target = memory.addTargets[roundIdx % memory.addTargets.length];
      var valid = [];
      var a, b;
      for (a = 0; a <= target; a++) valid.push({ a: a, b: target - a });
      valid = MT.core.shuffle(valid);
      var targetCount = Math.min(3, valid.length);
      var pool = [];
      eachOrdered(function (x, y) {
        if (x + y !== target) pool.push({ a: x, b: y, diff: Math.abs(x + y - target) });
      });
      pool = MT.core.shuffle(pool);
      pool.sort(function (p, q) { return p.diff - q.diff; });
      var items = [];
      var used = {};
      var id = 0;
      var i;
      for (i = 0; i < targetCount; i++) {
        var text = rowText(valid[i].a, valid[i].b);
        used[text] = true;
        items.push({
          id: 't_' + (++id),
          text: text,
          isTarget: true,
          isPopped: false,
          speak: spoken(valid[i].a, valid[i].b),
          scene: 'calc',
          miss: text + ' = ' + target + '，这张就是和。'
        });
      }
      for (i = 0; i < pool.length && items.length < 6; i++) {
        text = rowText(pool[i].a, pool[i].b);
        if (used[text]) continue;
        used[text] = true;
        items.push({
          id: 'd_' + (++id),
          text: text,
          isTarget: false,
          isPopped: false,
          miss: text + ' = ' + (pool[i].a + pool[i].b) + '，不是 ' + target + ' 哦～'
        });
      }
      var lines = [];
      for (a = 0; a <= target; a++) lines.push(a + ' ＋ ' + (target - a) + ' = ' + target);
      return {
        targetNum: target,
        items: MT.core.shuffle(items),
        total: targetCount,
        prefix: '找一找和等于',
        suffix: '的气球！',
        summaryNote: '和等于 <b>' + target + '</b> 的加法都在这里：',
        summaryLines: lines
      };
    },
    makeImpostors: function (roundIdx, memory) {
      if (roundIdx === 0 || !memory.addTraps || !memory.addTraps.length) {
        memory.addTraps = MT.core.shuffle(TRAPS);
      }
      var trap = memory.addTraps[roundIdx % memory.addTraps.length];
      var pool = [];
      eachOrdered(function (a, b) {
        if (a === trap.a && b === trap.b) return;
        pool.push({ a: a, b: b });
      });
      pool = MT.core.shuffle(pool);
      var picked = [];
      var seen = {};
      seen[rowText(trap.a, trap.b)] = true;
      for (var i = 0; i < pool.length && picked.length < 3; i++) {
        var text = rowText(pool[i].a, pool[i].b);
        if (seen[text]) continue;
        seen[text] = true;
        picked.push(pool[i]);
      }
      var cards = [{
        id: 'impostor_card',
        left: rowText(trap.a, trap.b),
        correctVal: trap.correct,
        displayVal: trap.fake,
        isImpostor: true,
        note: trap.note,
        isChecked: false,
        speak: spoken(trap.a, trap.b),
        scene: 'calc',
        aside: ''
      }];
      for (i = 0; i < picked.length; i++) {
        cards.push({
          id: 'correct_' + i,
          left: rowText(picked[i].a, picked[i].b),
          correctVal: picked[i].a + picked[i].b,
          displayVal: picked[i].a + picked[i].b,
          isImpostor: false,
          note: '',
          isChecked: false,
          speak: spoken(picked[i].a, picked[i].b),
          scene: 'calc',
          aside: ''
        });
      }
      return { cards: MT.core.shuffle(cards) };
    }
  };

  MT.op.add(MT.add);
})(window.MT = window.MT || {});
