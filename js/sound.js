(function (MT) {
  'use strict';

  var ctx = null;
  var supported = !!(window.AudioContext || window.webkitAudioContext);
  var failed = false;

  function ac() {
    if (!supported || failed) return null;
    if (!ctx) {
      try {
        var Ctor = window.AudioContext || window.webkitAudioContext;
        ctx = new Ctor();
      } catch (e) {
        failed = true;
        return null;
      }
    }
    return ctx;
  }

  function enabled() {
    var st = MT.progress && MT.progress.settings;
    return !st || st.soundOn !== 'off';
  }

  // iOS 必须由用户手势解锁音频上下文
  function unlock() {
    var c = ac();
    if (!c) return;
    try {
      if (c.state === 'suspended' && c.resume) c.resume();
    } catch (e) {}
  }

  // 单个音：osc -> lowpass -> gain -> destination
  function tone(c, r) {
    var t0 = c.currentTime + (r.at || 0);
    var osc = c.createOscillator();
    var filter = c.createBiquadFilter();
    var gain = c.createGain();

    osc.type = r.type || 'sine';
    osc.frequency.setValueAtTime(r.freq, t0);
    if (r.to && r.to !== r.freq) {
      osc.frequency.exponentialRampToValueAtTime(r.to, t0 + r.dur);
    }

    filter.type = 'lowpass';
    filter.frequency.value = 5000;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);

    // 包络：指数渐弱的终点不能是 0，否则抛错
    var peak = r.peak || 0.08;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + r.dur);

    osc.start(t0);
    osc.stop(t0 + r.dur + 0.03);
  }

  // C5 / E5 / G5 / C6
  var C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5;

  var RECIPES = {
    click: [
      { freq: 660, dur: 0.06, peak: 0.05 }
    ],
    right: [
      { freq: C5, dur: 0.18, peak: 0.10, at: 0 },
      { freq: E5, dur: 0.18, peak: 0.10, at: 0.07 },
      { freq: G5, dur: 0.22, peak: 0.10, at: 0.14 }
    ],
    wrong: [
      { freq: 392, to: 311.13, dur: 0.24, peak: 0.08 }
    ],
    pop: [
      { freq: 880, to: 440, dur: 0.08, peak: 0.09 }
    ],
    win: [
      { freq: C5, dur: 0.18, peak: 0.09, at: 0 },
      { freq: E5, dur: 0.18, peak: 0.09, at: 0.14 },
      { freq: G5, dur: 0.18, peak: 0.09, at: 0.28 },
      { freq: C6, dur: 0.50, peak: 0.10, at: 0.42 }
    ]
  };

  MT.sound = {
    supported: supported,
    unlock: unlock,

    play: function (name) {
      if (!enabled()) return;
      var c = ac();
      if (!c) return;
      try {
        if (c.state === 'suspended' && c.resume) c.resume();
      } catch (e) {}
      var recipe = RECIPES[name];
      if (!recipe) return;
      try {
        for (var i = 0; i < recipe.length; i++) tone(c, recipe[i]);
      } catch (e) {}
    }
  };
})(window.MT = window.MT || {});
