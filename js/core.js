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
    readNumber: readNumber
  };

  MT.bus = bus;
})(window.MT = window.MT || {});
