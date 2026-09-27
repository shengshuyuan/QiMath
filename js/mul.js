(function (MT) {
  'use strict';

  var CN = MT.core.CN;
  var readNumber = MT.core.readNumber;

  function key(a, b) { return a + 'x' + b; }

  function canon(a, b) {
    a = parseInt(a, 10);
    b = parseInt(b, 10);
    if (a > b) { var t = a; a = b; b = t; }
    return a + 'x' + b;
  }

  function parse(k) {
    var p = String(k).split('x');
    return { a: parseInt(p[0], 10), b: parseInt(p[1], 10) };
  }

  function readProduct(p) {
    return p < 10 ? '得' + CN[p] : readNumber(p);
  }

  function koujue(a, b) {
    return CN[a] + CN[b] + readProduct(a * b);
  }

  function spoken(a, b) {
    var st = MT.progress && MT.progress.settings;
    if (st && st.speechStyle === 'full') {
      return CN[a] + '乘' + CN[b] + '，等于' + readNumber(a * b);
    }
    return CN[a] + '、' + CN[b] + '、' + readProduct(a * b);
  }

  function scene() {
    var st = MT.progress && MT.progress.settings;
    return (st && st.speechStyle === 'full') ? 'calc' : 'koujue';
  }

  function triangleKeys() {
    var out = [];
    for (var b = 1; b <= 9; b++) {
      for (var a = 1; a <= b; a++) out.push(key(a, b));
    }
    return out;
  }

  function levelPool(n) {
    var out = [];
    for (var b = 1; b <= n; b++) {
      for (var a = 1; a <= b; a++) out.push(key(a, b));
    }
    return out;
  }

  function levelRow(n) {
    var out = [];
    for (var a = 1; a <= n; a++) out.push(key(a, n));
    return out;
  }

  function freshLevels() {
    var lv = {};
    for (var n = 1; n <= 9; n++) {
      lv[n] = { unlocked: n === 1, passed: false, bestStars: 0, roundsPlayed: 0 };
    }
    return lv;
  }

  var TARGETS = [12, 16, 18, 20, 24, 27, 28, 30, 32, 36, 40, 42, 45, 48, 54, 56, 63, 72, 8, 9, 15];

  var TRAPS = [
    { a: 7, b: 8, correct: 56, fake: 54, note: '七八五十六，容易和六九五十四混淆！' },
    { a: 6, b: 7, correct: 42, fake: 48, note: '六七四十二，容易和六八四十八混淆！' },
    { a: 4, b: 8, correct: 32, fake: 36, note: '四八三十二，容易和四九三十六混淆！' },
    { a: 8, b: 8, correct: 64, fake: 62, note: '八八六十四，得数是双数 64 哦！' },
    { a: 6, b: 9, correct: 54, fake: 56, note: '六九五十四，不是 56 哦！' },
    { a: 6, b: 6, correct: 36, fake: 32, note: '六六三十六，是个漂亮的平方数！' },
    { a: 3, b: 8, correct: 24, fake: 26, note: '三八二十四，可别粗心算成 26 啦！' },
    { a: 7, b: 7, correct: 49, fake: 47, note: '七七四十九，不是 47 哦！' },
    { a: 4, b: 9, correct: 36, fake: 38, note: '四九三十六，个位是 6 哦！' },
    { a: 8, b: 9, correct: 72, fake: 74, note: '八九七十二，十位和个位相加等于 9！' },
    { a: 7, b: 9, correct: 63, fake: 64, note: '七九六十三，容易和八八六十四混淆！' },
    { a: 3, b: 9, correct: 27, fake: 28, note: '三九二十七，各位数字相加是 9！' },
    { a: 6, b: 8, correct: 48, fake: 46, note: '六八四十八，可不是 46 哦！' },
    { a: 5, b: 7, correct: 35, fake: 30, note: '五七三十五，5乘单数个位一定是 5！' },
    { a: 9, b: 9, correct: 81, fake: 89, note: '九九八十一，是口诀表最大的一个！' }
  ];

  function bag(p) {
    return {
      levels: p.levels,
      mastered: p.mastered,
      wrong: p.wrong,
      needs: p.needsPractice
    };
  }

  function fact(k) {
    var f = parse(k);
    var prod = f.a * f.b;
    return {
      answer: prod,
      askHTML: '<span class="tk-brand">' + f.a + '</span> × <span class="tk-accent">' + f.b + '</span> = ?',
      tip: f.a + ' 个 ' + f.b + ' 相加',
      speak: spoken(f.a, f.b),
      scene: scene(),
      listHTML: f.a + ' × ' + f.b + ' = ?',
      helpCaption: '一共 ' + prod + ' 个',
      helpViz: { type: 'array', opts: { a: f.a, b: f.b, animate: true, compact: true } },
      viz: function (type, animate) {
        return { type: type, opts: { a: f.a, b: f.b, animate: animate !== false } };
      }
    };
  }

  MT.mul = {
    id: 'mul',
    tableTab: '📋 口诀表',
    levelTitle: function (n) { return '第 ' + n + ' 关'; },
    bag: bag,
    row: levelRow,
    pool: levelPool,
    keys: triangleKeys,
    canon: canon,
    parse: parse,
    koujue: koujue,
    spoken: spoken,
    read: spoken,
    score: function (k, b) {
      var s = 0;
      if (b.wrong[k]) s += 100 + Math.min(b.wrong[k].wrongCount || 0, 9);
      if (b.needs[k]) s += 20;
      if (!b.mastered[k]) s += 5;
      return s;
    },
    fact: fact,
    resetLevels: function (p) { p.levels = freshLevels(); },
    triangle: function () {
      var st = MT.progress && MT.progress.settings;
      return !st || st.tableMode !== 'full';
    },
    omit: function (col, row) { return this.triangle() && col > row; },
    corner: '×',
    colHead: function (n) { return String(n); },
    rowHead: function (n) { return String(n); },
    cell: function (col, row) {
      return {
        html: String(col * row),
        aria: koujue(col, row)
      };
    },
    cellKey: function (col, row) { return canon(col, row); },
    stat: function (p) {
      var keys = triangleKeys();
      var n = 0;
      for (var i = 0; i < keys.length; i++) if (p.mastered[keys[i]]) n++;
      return '乘法口诀表 · 已掌握 ' + n + ' / ' + keys.length;
    },
    detail: function (col, row, p) {
      var k = canon(col, row);
      var b = bag(p);
      var badge = b.mastered[k] ? '已掌握' : (b.wrong[k] ? '答错过' : (b.needs[k] ? '需再练' : ''));
      var f = fact(key(col, row));
      return {
        key: k,
        eqHTML: '<span class="tk-brand">' + col + '</span> × <span class="tk-accent">' + row + '</span> = ' + (col * row),
        koujueText: koujue(col, row) + (badge ? '　' + badge : ''),
        nameHTML: '',
        speak: f.speak,
        scene: f.scene,
        viz: function (type, animate) { return f.viz(type, animate); }
      };
    },
    speakCell: function (col, row) {
      var f = fact(key(col, row));
      return { text: f.speak, scene: f.scene };
    },
    explore: function (a, b) {
      var n = a * b;
      var add = [];
      for (var i = 0; i < a; i++) add.push('<span class="tk-accent">' + b + '</span>');
      var commute = (a !== b)
        ? ' · <span class="sum-commute">⇄ 交换律：' + b + ' × ' + a + ' = ' + n + '</span>'
        : ' · <span class="sum-commute">⭐ 两个数相同，是正方形</span>';
      var line = spoken(a, b);
      return {
        showStory: false,
        labelA: '有几行？',
        labelB: '每行有几个？',
        swapTitle: '交换因数 ⇄',
        swapLabel: '交换因数 ⇄',
        sumHTML:
          '<div class="sum-row sum-add">' + add.join(' <span class="op">+</span> ') + ' <span class="op">=</span> ' + n + '</div>' +
          '<div class="sum-row sum-mul"><span class="tk-brand">' + a + '</span> <span class="op">×</span> ' +
          '<span class="tk-accent">' + b + '</span> <span class="op">=</span> ' + n + '</div>' +
          '<div class="sum-legend">紫色是有几行几组，粉色是每行有几个' + commute + '</div>',
        speech: line,
        scene: scene(),
        swapSpeech: CN[a] + '乘' + CN[b] + '，同样等于' + readNumber(n),
        viz: { a: a, b: b }
      };
    },
    makeBubbles: function (roundIdx, memory) {
      if (roundIdx === 0 || !memory.mulTargets || !memory.mulTargets.length) {
        memory.mulTargets = MT.core.shuffle(TARGETS);
      }
      var target = memory.mulTargets[roundIdx % memory.mulTargets.length];
      var valid = [];
      var a, b;
      for (a = 1; a <= 9; a++) {
        for (b = 1; b <= 9; b++) {
          if (a * b === target) valid.push({ a: a, b: b });
        }
      }
      valid = MT.core.shuffle(valid);
      var targetCount = Math.min(valid.length, valid.length >= 3 ? 3 : 2);
      var pool = [];
      for (a = 1; a <= 9; a++) {
        for (b = 1; b <= 9; b++) {
          if (a * b !== target) pool.push({ a: a, b: b, diff: Math.abs(a * b - target) });
        }
      }
      pool = MT.core.shuffle(pool);
      var close = pool.filter(function (it) { return it.diff > 0 && it.diff <= 12; });
      var others = pool.filter(function (it) { return it.diff > 12; });
      var distractors = close.slice(0, 6 - targetCount);
      if (distractors.length < 6 - targetCount) {
        distractors = distractors.concat(others.slice(0, 6 - targetCount - distractors.length));
      }
      var items = [];
      var id = 0;
      var lines = [];
      for (var i = 0; i < valid.length; i++) {
        lines.push(valid[i].a + ' × ' + valid[i].b + ' = ' + target + '（' + koujue(valid[i].a, valid[i].b) + '）');
      }
      for (i = 0; i < targetCount; i++) {
        items.push({
          id: 't_' + (++id),
          text: valid[i].a + ' × ' + valid[i].b,
          isTarget: true,
          isPopped: false,
          speak: spoken(valid[i].a, valid[i].b),
          scene: 'ok',
          miss: valid[i].a + ' × ' + valid[i].b + ' = ' + (valid[i].a * valid[i].b) + '，不是 ' + target + ' 哦～'
        });
      }
      for (i = 0; i < distractors.length; i++) {
        items.push({
          id: 'd_' + (++id),
          text: distractors[i].a + ' × ' + distractors[i].b,
          isTarget: false,
          isPopped: false,
          miss: distractors[i].a + ' × ' + distractors[i].b + ' = ' + (distractors[i].a * distractors[i].b) + '，不是 ' + target + ' 哦～'
        });
      }
      return {
        targetNum: target,
        items: MT.core.shuffle(items),
        total: targetCount,
        prefix: '找一找积等于',
        suffix: '的气球！',
        summaryNote: '能算出 <b>' + target + '</b> 的口诀朋友都在这里：',
        summaryLines: lines
      };
    },
    makeImpostors: function (roundIdx, memory) {
      if (roundIdx === 0 || !memory.mulTraps || !memory.mulTraps.length) {
        memory.mulTraps = MT.core.shuffle(TRAPS);
      }
      var trap = memory.mulTraps[roundIdx % memory.mulTraps.length];
      var pool = [];
      var keys = triangleKeys();
      for (var i = 0; i < keys.length; i++) {
        var f = parse(keys[i]);
        if (f.a !== trap.a || f.b !== trap.b) pool.push(f);
      }
      pool = MT.core.shuffle(pool).slice(0, 3);
      var cards = [{
        id: 'impostor_card',
        left: trap.a + ' × ' + trap.b,
        correctVal: trap.correct,
        displayVal: trap.fake,
        isImpostor: true,
        note: trap.note,
        isChecked: false,
        speak: spoken(trap.a, trap.b),
        scene: 'ok',
        aside: '（' + koujue(trap.a, trap.b) + '）'
      }];
      for (i = 0; i < pool.length; i++) {
        cards.push({
          id: 'correct_' + i,
          left: pool[i].a + ' × ' + pool[i].b,
          correctVal: pool[i].a * pool[i].b,
          displayVal: pool[i].a * pool[i].b,
          isImpostor: false,
          note: '',
          isChecked: false,
          speak: spoken(pool[i].a, pool[i].b),
          scene: 'ok',
          aside: ''
        });
      }
      return { cards: MT.core.shuffle(cards) };
    }
  };

  MT.op.add(MT.mul);
})(window.MT = window.MT || {});
