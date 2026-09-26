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
    }
  };

  MT.bus = bus;
})(window.MT = window.MT || {});
