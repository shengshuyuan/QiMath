(function (MT) {
  'use strict';

  var KEY = 'mt99.progress.v1';
  var BROKEN = 'mt99.progress.broken.';

  var available = true;
  var mem = null;

  try {
    localStorage.setItem('__mt_t', '1');
    localStorage.removeItem('__mt_t');
  } catch (e) {
    available = false;
  }

  function defaultLevels(count) {
    var lv = {};
    var n;
    for (n = 1; n <= count; n++) {
      lv[n] = { unlocked: n === 1, passed: false, bestStars: 0, roundsPlayed: 0 };
    }
    return lv;
  }

  function copyLevels(src, count) {
    var lv = defaultLevels(count);
    if (!src) return lv;
    for (var n = 1; n <= count; n++) {
      if (!src[n]) continue;
      lv[n] = {
        unlocked: !!src[n].unlocked || n === 1,
        passed: !!src[n].passed,
        bestStars: src[n].bestStars || 0,
        roundsPlayed: src[n].roundsPlayed || 0
      };
    }
    return lv;
  }

  function defaults() {
    return {
      version: 1,
      mastered: {},
      needsPractice: {},
      wrong: {},
      levels: defaultLevels(9),
      divMastered: {},
      divNeedsPractice: {},
      divWrong: {},
      divLevels: defaultLevels(9),
      addMastered: {},
      addNeedsPractice: {},
      addWrong: {},
      addLevels: defaultLevels(6),
      subMastered: {},
      subNeedsPractice: {},
      subWrong: {},
      subLevels: defaultLevels(6),
      badges: [],
      settings: {
        speechOn: true,
        speechStyle: 'koujue',
        speechRate: 'normal',
        soundOn: 'on',
        tableMode: 'triangle',
        autoNext: 'on',
        reduceMotion: 'off',
        printAnswers: 'off',
        lastView: 'array',
        objectSkin: 'dot',
        hapticOn: 'on',
        op: 'mul',
        divStory: 'share'
      },
      stats: { totalCorrect: 0, totalWrong: 0, firstSeenAt: Date.now(), lastSeenAt: Date.now() }
    };
  }

  function rawGet() {
    if (!available) return mem;
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function rawSet(str) {
    if (!available) { mem = str; return; }
    try { localStorage.setItem(KEY, str); } catch (e) { available = false; mem = str; }
  }

  function foldMap(map, merge) {
    var out = {};
    if (!map) return out;
    for (var k in map) {
      if (!Object.prototype.hasOwnProperty.call(map, k)) continue;
      var ck = k;
      if (String(k).indexOf('x') !== -1 && MT.mul) {
        var f = MT.mul.parse(k);
        if (f.a && f.b) ck = MT.mul.canon(f.a, f.b);
      }
      if (!Object.prototype.hasOwnProperty.call(out, ck)) out[ck] = map[k];
      else if (merge) out[ck] = merge(out[ck], map[k]);
    }
    return out;
  }

  function load() {
    var txt = rawGet();
    if (!txt) return defaults();
    var data;
    try { data = JSON.parse(txt); } catch (e) { data = null; }
    if (!data || data.version !== 1) {
      try {
        if (available) {
          localStorage.removeItem(KEY);
          localStorage.setItem(BROKEN + 'last', txt);
        }
      } catch (e) {}
      return defaults();
    }
    var d = defaults();
    d.mastered = foldMap(data.mastered);
    d.needsPractice = foldMap(data.needsPractice);
    d.wrong = foldMap(data.wrong, function (a, b) {
      return (b.wrongCount || 0) > (a.wrongCount || 0) ? b : a;
    });
    d.stats = data.stats || d.stats;
    if (data.settings) {
      for (var k in d.settings) {
        if (Object.prototype.hasOwnProperty.call(data.settings, k)) d.settings[k] = data.settings[k];
      }
    }
    d.levels = copyLevels(data.levels, 9);
    d.divLevels = copyLevels(data.divLevels, 9);
    d.addLevels = copyLevels(data.addLevels, 6);
    d.subLevels = copyLevels(data.subLevels, 6);
    if (data.divWrong) d.divWrong = data.divWrong;
    if (data.divMastered) d.divMastered = data.divMastered;
    if (data.divNeedsPractice) d.divNeedsPractice = data.divNeedsPractice;
    if (data.addWrong) d.addWrong = data.addWrong;
    if (data.addMastered) d.addMastered = data.addMastered;
    if (data.addNeedsPractice) d.addNeedsPractice = data.addNeedsPractice;
    if (data.subWrong) d.subWrong = data.subWrong;
    if (data.subMastered) d.subMastered = data.subMastered;
    if (data.subNeedsPractice) d.subNeedsPractice = data.subNeedsPractice;
    if (Array.isArray(data.badges)) {
      d.badges = data.badges;
    }
    return d;
  }

  var timer = null;

  function flush() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!MT.progress) return;
    MT.progress.stats.lastSeenAt = Date.now();
    try { rawSet(JSON.stringify(MT.progress)); } catch (e) {}
  }

  function save() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, 150);
  }

  function reset() {
    MT.progress = defaults();
    try { if (available) localStorage.removeItem(KEY); } catch (e) {}
    flush();
  }

  MT.storage = {
    available: available,
    load: load,
    save: save,
    flush: flush,
    reset: reset,
    defaults: defaults
  };

  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flush();
  });
})(window.MT = window.MT || {});
