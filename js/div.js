(function (MT) {
  'use strict';

  var CN = MT.core.CN;
  var readNumber = MT.core.readNumber;

  function key(n, divisor) { return n + 'd' + divisor; }

  function parse(k) {
    var parts = String(k).split('d');
    var n = parseInt(parts[0], 10);
    var divisor = parseInt(parts[1], 10);
    var quot = Math.round(n / divisor);
    return { n: n, divisor: divisor, quot: quot };
  }

  // 除法只说这一句，不跟乘法的口诀档走。
  function speak(n, divisor) {
    var quot = n / divisor;
    return readNumber(n) + '除以' + CN[divisor] + '，等于' + readNumber(quot);
  }

  function allKeys() {
    var out = [];
    for (var d = 1; d <= 9; d++) {
      for (var q = 1; q <= 9; q++) out.push(key(d * q, d));
    }
    return out;
  }

  function levelRow(n) {
    var out = [];
    for (var q = 1; q <= 9; q++) out.push(key(n * q, n));
    return out;
  }

  function levelPool(n) {
    var out = [];
    var maxDiv = Math.max(1, Math.min(9, n));
    for (var d = 1; d <= maxDiv; d++) {
      for (var q = 1; q <= 9; q++) out.push(key(d * q, d));
    }
    return out;
  }

  function freshLevels() {
    var lv = {};
    for (var n = 1; n <= 9; n++) {
      lv[n] = { unlocked: n === 1, passed: false, bestStars: 0, roundsPlayed: 0 };
    }
    return lv;
  }

  function captions(a, b, story) {
    var n = a * b;
    var share = story !== 'measure';
    var divisor = share ? a : b;
    var quot = share ? b : a;
    var eq = n + ' ÷ ' + divisor + ' = ' + quot;
    return {
      capArray: share
        ? '一共 ' + n + ' 个，平均分成 ' + a + ' 行，每行 ' + b + ' 个'
        : '一共 ' + n + ' 个，每行 ' + b + ' 个，有 ' + a + ' 行',
      capGroups: share
        ? '一共 ' + n + ' 个，平均分成 ' + a + ' 组，每组 ' + b + ' 个'
        : '一共 ' + n + ' 个，每 ' + b + ' 个一组，有 ' + a + ' 组',
      capLine: '一共 ' + n + '。所以 ' + eq,
      capArea: '一共 ' + n + ' 格。所以 ' + eq
    };
  }

  function fromFactors(a, b, story) {
    var n = a * b;
    var share = story !== 'measure';
    var divisor = share ? a : b;
    var quot = share ? b : a;
    return { n: n, divisor: divisor, quot: quot, share: share };
  }

  var TRAPS = [
    { n: 24, divisor: 4, correct: 6, fake: 7, note: '24 ÷ 4 商应该是 6，不是 7！' },
    { n: 35, divisor: 5, correct: 7, fake: 6, note: '35 ÷ 5 商应该是 7，不是 6！' },
    { n: 8, divisor: 2, correct: 4, fake: 16, note: '8 ÷ 2 是平均分成 2 份，每份 4 个，不是 8 × 2！' },
    { n: 48, divisor: 6, correct: 8, fake: 7, note: '48 ÷ 6 商应该是 8，不是 7！' },
    { n: 56, divisor: 7, correct: 8, fake: 9, note: '56 ÷ 7 商应该是 8！' },
    { n: 18, divisor: 3, correct: 6, fake: 5, note: '18 ÷ 3 商应该是 6，不是 5！' },
    { n: 7, divisor: 1, correct: 7, fake: 1, note: '任何数除以 1 都得原数，7 ÷ 1 应该等于 7！' },
    { n: 54, divisor: 6, correct: 9, fake: 8, note: '54 ÷ 6 商应该是 9，不是 8！' },
    { n: 64, divisor: 8, correct: 8, fake: 7, note: '64 ÷ 8 商应该是 8，不是 7！' },
    { n: 72, divisor: 8, correct: 9, fake: 8, note: '72 ÷ 8 商应该是 9，不是 8！' },
    { n: 6, divisor: 3, correct: 2, fake: 18, note: '6 平均分成 3 份，每份是 2，不是 6 × 3！' },
    { n: 36, divisor: 4, correct: 9, fake: 8, note: '36 ÷ 4 商应该是 9，不是 8！' },
    { n: 63, divisor: 9, correct: 7, fake: 6, note: '63 ÷ 9 商应该是 7，不是 6！' },
    { n: 8, divisor: 8, correct: 1, fake: 0, note: '8 ÷ 8 应该等于 1！' },
    { n: 45, divisor: 5, correct: 9, fake: 8, note: '45 ÷ 5 商应该是 9，不是 8！' }
  ];

  function bag(p) {
    if (!p.divLevels) p.divLevels = freshLevels();
    p.divMastered = p.divMastered || {};
    p.divWrong = p.divWrong || {};
    p.divNeedsPractice = p.divNeedsPractice || {};
    return {
      levels: p.divLevels,
      mastered: p.divMastered,
      wrong: p.divWrong,
      needs: p.divNeedsPractice
    };
  }

  function fact(k) {
    var d = parse(k);
    var line = speak(d.n, d.divisor);
    var caps = captions(d.divisor, d.quot, 'share');
    return {
      answer: d.quot,
      askHTML: '<span class="tk-brand">' + d.n + '</span> ÷ <span class="tk-accent">' + d.divisor + '</span> = ?',
      tip: '口诀：' + readNumber(d.n) + '除以' + CN[d.divisor] + '，等于（ ）',
      speak: line,
      scene: 'calc',
      listHTML: d.n + ' ÷ ' + d.divisor + ' = ?',
      helpCaption: line,
      helpViz: { type: 'groups', opts: { a: d.divisor, b: d.quot, animate: true, compact: true, captions: caps } },
      viz: function (type, animate) {
        return {
          type: type,
          opts: { a: d.divisor, b: d.quot, story: 'share', animate: animate !== false, captions: caps }
        };
      }
    };
  }

  MT.div = {
    id: 'div',
    tableTab: '📋 除法表',
    levelCount: 9,
    layout: 'grid',
    views: ['array', 'groups', 'numberline', 'area', 'all'],
    detailViews: ['array', 'groups', 'numberline', 'area'],
    min: 1,
    max: 9,
    levelTitle: function (n) { return '除法第 ' + n + ' 关'; },
    bag: bag,
    row: levelRow,
    pool: levelPool,
    keys: allKeys,
    parse: parse,
    score: function (k, b) {
      var s = 0;
      if (b.wrong[k]) s += 100 + Math.min(b.wrong[k].wrongCount || 0, 9);
      if (b.needs[k]) s += 20;
      if (!b.mastered[k]) s += 5;
      return s;
    },
    fact: fact,
    speak: speak,
    resetLevels: function (p) { p.divLevels = freshLevels(); },
    omit: function () { return false; },
    corner: '÷',
    colHead: function (n) { return '商' + n; },
    rowHead: function (n) { return '÷' + n; },
    cell: function (col, row) {
      return {
        html: '<div class="div-cell-inner"><span class="div-cell-eq">' + (col * row) + '÷' + row + '</span><span class="div-cell-ans">=' + col + '</span></div>',
        aria: speak(col * row, row)
      };
    },
    cellKey: function (col, row) { return key(col * row, row); },
    stat: function (p) {
      var keys = allKeys();
      var b = bag(p);
      var n = 0;
      for (var i = 0; i < keys.length; i++) if (b.mastered[keys[i]]) n++;
      return '表内除法算式整理表 · 已掌握 ' + n + ' / ' + keys.length;
    },
    detail: function (col, row, p) {
      var k = key(col * row, row);
      var b = bag(p);
      var badge = b.mastered[k] ? '已掌握' : (b.wrong[k] ? '答错过' : (b.needs[k] ? '需再练' : ''));
      var line = speak(col * row, row);
      var f = fact(k);
      return {
        key: k,
        eqHTML: '<span class="tk-brand">' + (col * row) + '</span> ÷ <span class="tk-accent">' + row + '</span> = ' + col,
        koujueText: line + (badge ? '　' + badge : ''),
        nameHTML: '<span class="sum-tag">算式名称</span>被除数 <b>' + (col * row) + '</b> ÷ 除数 <b>' + row + '</b> = 商 <b>' + col + '</b>',
        speak: line,
        scene: 'calc',
        viz: f.viz
      };
    },
    speakCell: function (col, row) {
      return { text: speak(col * row, row), scene: 'calc' };
    },
    fit: function (changed, a, b) {
      void changed;
      return {
        a: MT.core.clamp(parseInt(a, 10) || 1, 1, 9),
        b: MT.core.clamp(parseInt(b, 10) || 1, 1, 9)
      };
    },
    span: function () { return { min: 1, max: 9 }; },
    allow: function (which, n) {
      void which;
      return n >= 1 && n <= 9;
    },
    problemText: function (k) {
      var d = parse(k);
      return d.n + ' ÷ ' + d.divisor + ' = ______';
    },
    answerText: function (k) {
      var d = parse(k);
      return d.n + ' ÷ ' + d.divisor + ' = ' + d.quot;
    },
    printMeta: {
      blankTitle: '空白除法算式整理表',
      subtitle: '表内除法练习',
      answerTitle: '除法参考答案',
      problemTitle: function (n) { return '除法算一算（共 ' + n + ' 题）'; }
    },
    explore: function (a, b, story) {
      var part = fromFactors(a, b, story);
      var n = a * b;
      var line = speak(part.n, part.divisor);
      var previewDiv = part.share ? b : a;
      var previewQuot = part.share ? a : b;
      var commute = (a !== b)
        ? ' · <span class="sum-commute">⇄ 对调后：' + n + ' ÷ ' + previewDiv + ' = ' + previewQuot + '</span>'
        : ' · <span class="sum-commute">⭐ 两个数相同，是正方形</span>';
      var legend = part.share
        ? '紫色是分成几份，粉色是每份几个'
        : '粉色是每份几个，紫色是有几份';
      return {
        showStory: true,
        canSwap: true,
        labelA: part.share ? '分成几份？' : '有几份？',
        labelB: '每份几个？',
        swapTitle: '12÷3=4 和 12÷4=3 是同一张图',
        swapLabel: '对调除数和商 ⇄',
        sumHTML:
          '<div class="sum-row sum-div"><span class="tk-brand">' + part.n + '</span> <span class="op">÷</span> ' +
          '<span class="tk-accent">' + part.divisor + '</span> <span class="op">=</span> <span class="tk-quot">' + part.quot + '</span></div>' +
          '<div class="sum-desc"><span class="sum-tag">算式名称</span>被除数 <b>' + part.n + '</b> ÷ 除数 <b>' + part.divisor + '</b> = 商 <b>' + part.quot + '</b></div>' +
          '<div class="sum-think">读作：<b>' + line + '</b></div>' +
          '<div class="sum-bridge" style="font-size:13px; color:var(--ink-2); margin-top:3px;">同一副图：<b>' + a + ' × ' + b + ' = ' + n + '</b></div>' +
          '<div class="sum-legend">' + legend + commute + '</div>',
        speech: line,
        scene: 'calc',
        swapSpeech: line,
        viz: { a: a, b: b, story: part.share ? 'share' : 'measure', captions: captions(a, b, story) }
      };
    },
    makeBubbles: function (roundIdx, memory) {
      var targets = [2, 3, 4, 5, 6, 7, 8, 9];
      if (roundIdx === 0 || !memory.divTargets || !memory.divTargets.length) {
        memory.divTargets = MT.core.shuffle(targets);
      }
      var target = memory.divTargets[roundIdx % memory.divTargets.length];
      var valid = [];
      var d, q;
      for (d = 1; d <= 9; d++) valid.push({ n: d * target, divisor: d, quot: target });
      valid = MT.core.shuffle(valid);
      var targetCount = Math.min(valid.length, 3);
      var pool = [];
      for (d = 1; d <= 9; d++) {
        for (q = 1; q <= 9; q++) {
          if (q !== target) pool.push({ n: d * q, divisor: d, quot: q, diff: Math.abs(q - target) });
        }
      }
      pool = MT.core.shuffle(pool);
      var close = pool.filter(function (it) { return it.diff > 0 && it.diff <= 2; });
      var others = pool.filter(function (it) { return it.diff > 2; });
      var distractors = close.slice(0, 6 - targetCount);
      if (distractors.length < 6 - targetCount) {
        distractors = distractors.concat(others.slice(0, 6 - targetCount - distractors.length));
      }
      var items = [];
      var id = 0;
      var lines = [];
      var i;
      for (i = 0; i < valid.length; i++) {
        lines.push(valid[i].n + ' ÷ ' + valid[i].divisor + ' = ' + target);
      }
      for (i = 0; i < targetCount; i++) {
        items.push({
          id: 't_' + (++id),
          text: valid[i].n + ' ÷ ' + valid[i].divisor,
          isTarget: true,
          isPopped: false,
          speak: speak(valid[i].n, valid[i].divisor),
          scene: 'calc',
          miss: valid[i].n + ' ÷ ' + valid[i].divisor + ' = ' + valid[i].quot + '，商不是 ' + target + ' 哦～'
        });
      }
      for (i = 0; i < distractors.length; i++) {
        items.push({
          id: 'd_' + (++id),
          text: distractors[i].n + ' ÷ ' + distractors[i].divisor,
          isTarget: false,
          isPopped: false,
          miss: distractors[i].n + ' ÷ ' + distractors[i].divisor + ' = ' + distractors[i].quot + '，商不是 ' + target + ' 哦～'
        });
      }
      return {
        targetNum: target,
        items: MT.core.shuffle(items),
        total: targetCount,
        prefix: '找一找商等于',
        suffix: '的除法气球！',
        summaryNote: '商等于 <b>' + target + '</b> 的算式都在这里：',
        summaryLines: lines
      };
    },
    makeImpostors: function (roundIdx, memory) {
      if (roundIdx === 0 || !memory.divTraps || !memory.divTraps.length) {
        memory.divTraps = MT.core.shuffle(TRAPS);
      }
      var trap = memory.divTraps[roundIdx % memory.divTraps.length];
      var pool = [];
      var keys = allKeys();
      for (var i = 0; i < keys.length; i++) {
        var d = parse(keys[i]);
        if (d.n !== trap.n || d.divisor !== trap.divisor) pool.push(d);
      }
      pool = MT.core.shuffle(pool).slice(0, 3);
      var cards = [{
        id: 'impostor_card',
        left: trap.n + ' ÷ ' + trap.divisor,
        correctVal: trap.correct,
        displayVal: trap.fake,
        isImpostor: true,
        note: trap.note,
        isChecked: false,
        speak: speak(trap.n, trap.divisor),
        scene: 'calc',
        aside: ''
      }];
      for (i = 0; i < pool.length; i++) {
        cards.push({
          id: 'correct_' + i,
          left: pool[i].n + ' ÷ ' + pool[i].divisor,
          correctVal: pool[i].quot,
          displayVal: pool[i].quot,
          isImpostor: false,
          note: '',
          isChecked: false,
          speak: speak(pool[i].n, pool[i].divisor),
          scene: 'calc',
          aside: ''
        });
      }
      return { cards: MT.core.shuffle(cards) };
    }
  };

  MT.op.add(MT.div);
})(window.MT = window.MT || {});
