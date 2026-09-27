(function (MT) {
  'use strict';

  var map = {};

  MT.op = {
    add: function (mod) {
      map[mod.id] = mod;
    },
    get: function (id) {
      return map[id] || null;
    },
    current: function () {
      var st = MT.progress && MT.progress.settings;
      var id = st && st.op;
      return map[id] || map.mul;
    }
  };
})(window.MT = window.MT || {});
