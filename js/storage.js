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
      topics: {},
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
        topic: 'basic',
        lastLocation: '',
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
    return restore(data);
  }

  function restore(data) {
    var d = defaults();
    d.mastered = foldMap(data.mastered);
    d.needsPractice = foldMap(data.needsPractice);
    d.wrong = foldMap(data.wrong, function (a, b) {
      return (b.wrongCount || 0) > (a.wrongCount || 0) ? b : a;
    });
    if (data.stats && typeof data.stats === 'object') {
      Object.keys(d.stats).forEach(function (key) {
        var value = data.stats[key];
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0) d.stats[key] = Math.floor(value);
      });
    }
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
    if (data.topics && typeof data.topics === 'object' && !Array.isArray(data.topics)) {
      // 目录是课程清单；导航还没加载时用这份兜底，避免漏一门就丢掉进度。
      var topicIds = (MT.navigation && MT.navigation.courses)
        ? MT.navigation.courses.filter(function (c) { return c.topic !== 'basic'; }).map(function (c) { return c.id; })
        : ['mixed', 'length', 'money', 'angle', 'time', 'mass'];
      topicIds.forEach(function (id) {
        var src = data.topics[id];
        if (!src || typeof src !== 'object') return;
        var dest = { skills: {}, wrong: {}, range: src.range === 100 ? 100 : 20, lastSkill: '' };
        if (typeof src.lastSkill === 'string') dest.lastSkill = src.lastSkill;
        if (src.skills && typeof src.skills === 'object') {
          Object.keys(src.skills).forEach(function (key) {
            if (!/^[a-z]+$/.test(key)) return;
            var s = src.skills[key];
            if (!s || typeof s !== 'object') return;
            dest.skills[key] = {
              completed: Math.max(0, Math.floor(Number(s.completed) || 0)),
              clean: Math.max(0, Math.floor(Number(s.clean) || 0))
            };
          });
        }
        if (src.wrong && typeof src.wrong === 'object') {
          Object.keys(src.wrong).forEach(function (key) {
            var w = src.wrong[key];
            if (!w || !/^[a-z]+$/.test(w.skill) || !Number.isFinite(w.seed) || !Number.isInteger(w.seed)) return;
            // 仅保存重建题目所需的数据，不信任本地记录中的 HTML。
            dest.wrong[key] = {
              skill: w.skill, seed: w.seed >>> 0, range: w.range === 100 ? 100 : 20,
              wrongCount: Math.max(1, Math.floor(Number(w.wrongCount) || 1)),
              cleanStreak: w.cleanStreak === 1 ? 1 : 0,
              errorKind: typeof w.errorKind === 'string' ? w.errorKind : 'answer'
            };
          });
        }
        // 人民币趣味游戏的历史星级与轮次，需与课程进度一同恢复。
        if (id === 'money' && src.games && typeof src.games === 'object') {
          dest.games = {};
          Object.keys(src.games).forEach(function (key) {
            if (!/^[a-z]+$/.test(key)) return;
            var g = src.games[key];
            if (!g || typeof g !== 'object') return;
            dest.games[key] = {
              rounds: Math.max(0, Math.floor(Number(g.rounds) || 0)),
              bestStars: Math.max(0, Math.floor(Number(g.bestStars) || 0))
            };
          });
        }
        d.topics[id] = dest;
      });
    }
    if (Array.isArray(data.badges)) {
      d.badges = data.badges;
    }
    return d;
  }

  function backup() {
    return JSON.stringify({ app: 'QiMath', version: 1, progress: MT.progress || load() }, null, 2);
  }

  function readBackup(text) {
    var data;
    if (typeof text !== 'string' || text.length > 2 * 1024 * 1024) throw new Error('请选择不超过 2 MB 的 QiMath 进度备份。');
    try {
      data = JSON.parse(text, function (key, value) {
        if (key === '__proto__' || key === 'prototype' || key === 'constructor') throw new Error('不安全的字段');
        return value;
      });
    } catch (e) { throw new Error('文件不是有效的 QiMath 进度备份。'); }
    function record(value) { return value && typeof value === 'object' && !Array.isArray(value); }
    function requireValid(ok) { if (!ok) throw new Error('备份格式或进度数据不正确，请选择从 QiMath 导出的 JSON 文件。'); }
    function number(value) { return Number.isSafeInteger(value) && value >= 0; }
    function numericRecord(value, allowed) {
      requireValid(record(value));
      Object.keys(value).forEach(function (key) {
        requireValid(allowed.indexOf(key) !== -1 && number(value[key]));
      });
    }
    requireValid(record(data) && data.app === 'QiMath' && data.version === 1 && record(data.progress));
    var p = data.progress, model = defaults();
    requireValid(p.version === 1);
    Object.keys(p).forEach(function (key) { requireValid(Object.prototype.hasOwnProperty.call(model, key)); });
    Object.keys(model).forEach(function (key) {
      if (key === 'version') return;
      requireValid(Array.isArray(model[key]) ? Array.isArray(p[key]) : record(p[key]));
    });
    numericRecord(p.stats, Object.keys(model.stats));
    requireValid(Object.keys(model.stats).every(function (key) { return number(p.stats[key]); }));
    Object.keys(p.settings).forEach(function (key) {
      requireValid(Object.prototype.hasOwnProperty.call(model.settings, key) && typeof p.settings[key] === typeof model.settings[key]);
      if (typeof p.settings[key] === 'string') requireValid(p.settings[key].length <= 200 && /^[a-zA-Z0-9_/#.\-]*$/.test(p.settings[key]));
    });
    p.badges.forEach(function (id) { requireValid(typeof id === 'string' && /^[a-z_]+$/.test(id)); });
    ['', 'div', 'add', 'sub'].forEach(function (prefix) {
      function field(name) { return prefix ? prefix + name : name.charAt(0).toLowerCase() + name.slice(1); }
      ['Mastered', 'NeedsPractice', 'Wrong'].forEach(function (name) {
        var map = p[field(name)];
        Object.keys(map).forEach(function (key) {
          requireValid(/^\d{1,2}[x/+\-]\d{1,2}$/.test(key));
          if (name === 'Wrong') {
            numericRecord(map[key], ['wrongCount', 'rightStreak', 'lastAt', 'fromLevel']);
            requireValid(number(map[key].wrongCount) && map[key].wrongCount >= 1);
          } else requireValid(typeof map[key] === 'boolean');
        });
      });
      var levels = p[field('Levels')], count = prefix === 'add' || prefix === 'sub' ? 6 : 9;
      Object.keys(levels).forEach(function (key) {
        var level = levels[key];
        requireValid(/^[1-9]$/.test(key) && Number(key) <= count && record(level));
        requireValid(typeof level.unlocked === 'boolean' && typeof level.passed === 'boolean' && number(level.bestStars) && level.bestStars <= 3 && number(level.roundsPlayed));
      });
    });
    var topicIds = ['mixed', 'length', 'money', 'angle', 'time', 'mass'];
    Object.keys(p.topics).forEach(function (id) {
      var topic = p.topics[id];
      requireValid(topicIds.indexOf(id) !== -1 && record(topic) && record(topic.skills) && record(topic.wrong));
      requireValid((topic.range === 20 || topic.range === 100) && typeof topic.lastSkill === 'string' && /^[a-z]*$/.test(topic.lastSkill));
      Object.keys(topic.skills).forEach(function (key) {
        requireValid(/^[a-z]+$/.test(key));
        numericRecord(topic.skills[key], ['completed', 'clean']);
        requireValid(number(topic.skills[key].completed) && number(topic.skills[key].clean));
      });
      Object.keys(topic.wrong).forEach(function (key) {
        var wrong = topic.wrong[key];
        requireValid(/^[a-z0-9_:.-]+$/.test(key) && record(wrong) && typeof wrong.skill === 'string' && /^[a-z]+$/.test(wrong.skill));
        requireValid(number(wrong.seed) && wrong.seed <= 4294967295 && number(wrong.wrongCount) && number(wrong.cleanStreak));
        requireValid((wrong.range === 20 || wrong.range === 100) && (wrong.errorKind === undefined || (typeof wrong.errorKind === 'string' && /^(answer|order|calculation|unit|reading)$/.test(wrong.errorKind))));
      });
      if (topic.games !== undefined) {
        requireValid(id === 'money' && record(topic.games));
        Object.keys(topic.games).forEach(function (key) {
          requireValid(/^[a-z]+$/.test(key));
          numericRecord(topic.games[key], ['rounds', 'bestStars']);
          requireValid(number(topic.games[key].rounds) && number(topic.games[key].bestStars) && topic.games[key].bestStars <= 5);
        });
      }
    });
    return restore(p);
  }

  function importBackup(text) {
    var progress = readBackup(text);
    // 导入不能回退到内存模式；写入失败时保留原记录，并留下导入前的备份。
    if (!available) throw new Error('这个浏览器不能保存进度，暂时无法导入。');
    try {
      localStorage.setItem(KEY + '.before-import', backup());
      localStorage.setItem(KEY, JSON.stringify(progress));
    } catch (e) { throw new Error('进度未导入：浏览器存储空间不足或不允许保存。原进度仍保留。'); }
    if (timer) { clearTimeout(timer); timer = null; }
    MT.progress = progress;
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
    backup: backup,
    readBackup: readBackup,
    importBackup: importBackup,
    defaults: defaults
  };

  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flush();
  });
})(window.MT = window.MT || {});
