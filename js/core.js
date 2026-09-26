(function (MT) {
  'use strict';

  var CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

  function clamp(v, min, max) {
    return v < min ? min : (v > max ? max : v);
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  var bus = (function () {
    var map = {};
    return {
      on: function (evt, fn) {
        (map[evt] = map[evt] || []).push(fn);
      },
      emit: function (evt, data) {
        var list = map[evt] || [];
        for (var i = 0; i < list.length; i++) {
          try { list[i](data); } catch (e) { console.error(e); }
        }
      }
    };
  })();

  // 纯数字读法：6 -> 六，12 -> 十二，10 -> 一十，20 -> 二十，81 -> 八十一
  function readNumber(p) {
    if (p < 10) return CN[p];
    if (p < 20) return (p % 10 === 0) ? '一十' : '十' + CN[p % 10];
    var t = Math.floor(p / 10), o = p % 10;
    return CN[t] + '十' + (o ? CN[o] : '');
  }

  MT.core = {
    CN: CN,
    nums: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    clamp: clamp,
    shuffle: shuffle,

    key: function (a, b) { return a + 'x' + b; },

    // 小九九只记 a≤b 这一式。4×3 和 3×4 共用掌握、错题。
    canon: function (a, b) {
      a = parseInt(a, 10);
      b = parseInt(b, 10);
      if (a > b) { var t = a; a = b; b = t; }
      return a + 'x' + b;
    },

    parse: function (k) {
      var p = String(k).split('x');
      return { a: parseInt(p[0], 10), b: parseInt(p[1], 10) };
    },

    readNumber: readNumber,

    // 积的口诀读法：6 -> 得六，12 -> 十二，10 -> 一十，81 -> 八十一
    readProduct: function (p) {
      return p < 10 ? '得' + CN[p] : readNumber(p);
    },

    // 屏幕上的口诀写法：三四十二
    koujue: function (a, b) {
      return CN[a] + CN[b] + MT.core.readProduct(a * b);
    },

    // 朗读用的口诀：三、四、十二（用顿号给合成器制造停顿，形成节奏）
    // Web Speech API 不解析 SSML，只能用标点控制停顿
    koujueSpoken: function (a, b) {
      return CN[a] + '、' + CN[b] + '、' + MT.core.readProduct(a * b);
    },

    // 朗读用的完整算式：三乘四，等于十二（乘积用中文，避免裸阿拉伯数字被读成「一二」）
    fullRead: function (a, b) {
      return CN[a] + '乘' + CN[b] + '，等于' + readNumber(a * b);
    },

    // 屏幕上展示的完整算式：3 × 4 的纯文本形式
    calcText: function (a, b) {
      return a + ' × ' + b + ' = ' + (a * b);
    },

    // 按设置挑朗读文本
    read: function (a, b) {
      var st = MT.progress && MT.progress.settings;
      if (st && st.speechStyle === 'full') return MT.core.fullRead(a, b);
      return MT.core.koujueSpoken(a, b);
    },

    // 三角 45 式的全部 key（a <= b）
    triangleKeys: function () {
      var out = [];
      for (var b = 1; b <= 9; b++) {
        for (var a = 1; a <= b; a++) out.push(MT.core.key(a, b));
      }
      return out;
    },

    // 第 n 关的题目池：累计到 n 的全部三角式
    levelPool: function (n) {
      var out = [];
      for (var b = 1; b <= n; b++) {
        for (var a = 1; a <= b; a++) out.push(MT.core.key(a, b));
      }
      return out;
    },

    // 第 n 关自身的口诀行：1xn .. nxn
    levelRow: function (n) {
      var out = [];
      for (var a = 1; a <= n; a++) out.push(MT.core.key(a, n));
      return out;
    },

    divKey: function (n, divisor) {
      return n + 'd' + divisor;
    },

    divParse: function (k) {
      var parts = String(k).split('d');
      var n = parseInt(parts[0], 10);
      var divisor = parseInt(parts[1], 10);
      var quot = Math.round(n / divisor);
      var minF = Math.min(divisor, quot);
      var maxF = Math.max(divisor, quot);
      var chant = CN[minF] + CN[maxF] + (n < 10 ? '得' + CN[n] : readNumber(n));
      var think = '想：' + (divisor === minF ? CN[minF] + '(' + CN[maxF] + ')' : '(' + CN[minF] + ')' + CN[maxF]) + (n < 10 ? '得' + CN[n] : readNumber(n)) + '，商是 ' + quot;
      return {
        n: n,
        divisor: divisor,
        quot: quot,
        chant: chant,
        think: think,
        eq: n + ' ÷ ' + divisor + ' = ' + quot,
        read: readNumber(n) + '除以' + CN[divisor] + '，等于' + readNumber(quot)
      };
    },

    // 表内除法第 n 关自身行（以除数 n 为主）
    divRow: function (n) {
      var out = [];
      for (var q = 1; q <= 9; q++) {
        out.push((n * q) + 'd' + n);
      }
      return out;
    },

    // 表内除法第 n 关题目池（涵盖到除数 n 的全部算式）
    divPool: function (n) {
      var out = [];
      var maxDiv = Math.max(1, Math.min(9, n));
      for (var d = 1; d <= maxDiv; d++) {
        for (var q = 1; q <= 9; q++) {
          out.push((d * q) + 'd' + d);
        }
      }
      return out;
    },

    // 表内除法全部 81 个整除算式 key
    allDivKeys: function () {
      var out = [];
      for (var d = 1; d <= 9; d++) {
        for (var q = 1; q <= 9; q++) {
          out.push((d * q) + 'd' + d);
        }
      }
      return out;
    },

    // 同一张 a 行、每行 b 个的图，读成表内整除。
    // share 平均分：总数 ÷ 行数 = 每行几个。measure 几个一份：总数 ÷ 每份个数 = 有几份。
    divParts: function (a, b, story) {
      a = parseInt(a, 10);
      b = parseInt(b, 10);
      var n = a * b;
      var share = story !== 'measure';
      var divisor = share ? a : b;
      var quot = share ? b : a;
      var eq = n + ' ÷ ' + divisor + ' = ' + quot;
      var minF = Math.min(divisor, quot);
      var maxF = Math.max(divisor, quot);
      var chant = CN[minF] + CN[maxF] + (n < 10 ? '得' + CN[n] : readNumber(n));
      var think = '想：' + (divisor === minF ? CN[minF] + '(' + CN[maxF] + ')' : '(' + CN[minF] + ')' + CN[maxF]) + (n < 10 ? '得' + CN[n] : readNumber(n)) + '，商是 ' + quot;
      return {
        n: n,
        divisor: divisor,
        quot: quot,
        share: share,
        eq: eq,
        chant: chant,
        think: think,
        read: readNumber(n) + '除以' + CN[divisor] + '，等于' + readNumber(quot),
        readSame: readNumber(n) + '除以' + CN[divisor] + '，同样等于' + readNumber(quot),
        capArray: share
          ? '一共 ' + n + ' 个，平均分成 ' + a + ' 行，每行 ' + b + ' 个'
          : '一共 ' + n + ' 个，每行 ' + b + ' 个，有 ' + a + ' 行',
        capGroups: share
          ? '一共 ' + n + ' 个，平均分成 ' + a + ' 组，每组 ' + b + ' 个'
          : '一共 ' + n + ' 个，每 ' + b + ' 个一组，有 ' + a + ' 组',
        capLine: share
          ? '跳 ' + a + ' 次，每次 ' + b + '，一共 ' + n + '。所以 ' + eq
          : '每次跳 ' + b + '，跳了 ' + a + ' 次到 ' + n + '。所以 ' + eq,
        capArea: share
          ? '分成 ' + a + ' 行，每行 ' + b + ' 格，一共 ' + n + ' 格。所以 ' + eq
          : '每行 ' + b + ' 格，有 ' + a + ' 行，一共 ' + n + ' 格。所以 ' + eq
      };
    },

    // 小学教材 15 组经典高频易错除法题库（用于挑错大侦探）
    divImpostors: [
      { n: 24, divisor: 4, correct: 6, fake: 7, note: '想：四六二十四，24 ÷ 4 商应该是 6，不是 7！' },
      { n: 35, divisor: 5, correct: 7, fake: 6, note: '想：五七三十五，35 ÷ 5 商应该是 7，不是 6！' },
      { n: 8, divisor: 2, correct: 4, fake: 16, note: '混淆乘除法啦！8 ÷ 2 是平均分成 2 份，每份 4 个，不是 8 × 2！' },
      { n: 48, divisor: 6, correct: 8, fake: 7, note: '想：六八四十八，48 ÷ 6 商应该是 8，不是 7！' },
      { n: 56, divisor: 7, correct: 8, fake: 9, note: '想：七八五十六，56 ÷ 7 商应该是 8，容易和六十三混淆！' },
      { n: 18, divisor: 3, correct: 6, fake: 5, note: '想：三六十八，18 ÷ 3 商应该是 6，不是 5！' },
      { n: 7, divisor: 1, correct: 7, fake: 1, note: '任何数除以 1 都得原数，7 ÷ 1 应该等于 7！' },
      { n: 54, divisor: 6, correct: 9, fake: 8, note: '想：六九五十四，54 ÷ 6 商应该是 9，不是 8！' },
      { n: 64, divisor: 8, correct: 8, fake: 7, note: '想：八八六十四，64 ÷ 8 商应该是 8，不是 7！' },
      { n: 72, divisor: 8, correct: 9, fake: 8, note: '想：八九七十二，72 ÷ 8 商应该是 9，不是 8！' },
      { n: 6, divisor: 3, correct: 2, fake: 18, note: '混淆乘除法！6 平均分成 3 份每份是 2，不是 6 × 3！' },
      { n: 36, divisor: 4, correct: 9, fake: 8, note: '想：四九三十六，36 ÷ 4 商应该是 9，不是 8！' },
      { n: 63, divisor: 9, correct: 7, fake: 6, note: '想：七九六十三，63 ÷ 9 商应该是 7，不是 6！' },
      { n: 8, divisor: 8, correct: 1, fake: 0, note: '除数和被除数相同且不为 0 时商等于 1，8 ÷ 8 应该等于 1！' },
      { n: 45, divisor: 5, correct: 9, fake: 8, note: '想：五九四十五，45 ÷ 5 商应该是 9，不是 8！' }
    ]
  };

  MT.bus = bus;
})(window.MT = window.MT || {});
