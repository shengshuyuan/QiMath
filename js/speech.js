(function (MT) {
  'use strict';

  var supported = (typeof window !== 'undefined') && ('speechSynthesis' in window) &&
    (typeof window.SpeechSynthesisUtterance === 'function');

  var voice = null;
  var warmCount = 0;
  var lastText = '';
  var timer = null;

  // 场景化的语速/音高。
  // 注意：不再用 pitch > 1 去「装可爱」——抬高基频会让中文合成音更薄、金属味更重。
  var SCENES = {
    koujue: { rate: 0.82, pitch: 1.00 },
    calc:   { rate: 0.90, pitch: 1.00 },
    ok:     { rate: 1.00, pitch: 1.06 },
    bad:    { rate: 0.90, pitch: 0.98 }
  };

  var RATE_FACTOR = { slow: 0.8, normal: 1, fast: 1.15 };

  // 严格过滤掉粤语、港澳方言、台语等非普通话音色
  function isCantonese(lang, name) {
    if (/^(zh-(hk|mo|yue)|yue)\b/i.test(lang)) return true;
    if (/(cantonese|hong kong|sin-?ji|sinji|善怡|善知|粤语|廣東話)/i.test(name)) return true;
    return false;
  }

  function isMandarin(lang, name) {
    if (isCantonese(lang, name)) return false;
    if (lang.indexOf('zh') !== 0 && lang.indexOf('cmn') !== 0) return false;
    if (/(minnan|hakka|客家|台语|閩南)/i.test(name)) return false;
    return true;
  }

  // 给音色打分，强制锁定普通话，优先挑更自然的音色
  function score(v) {
    var lang = String(v.lang || '').replace('_', '-').toLowerCase();
    var name = String(v.name || '');
    if (!isMandarin(lang, name)) return -1000;

    var s = 0;
    if (lang === 'zh-cn' || lang === 'cmn-hans-cn' || lang === 'zh-cmn') s += 100;
    else if (lang.indexOf('hans') !== -1 || lang === 'zh') s += 80;
    else if (lang === 'zh-sg') s += 40;
    else if (lang === 'zh-tw') s += 20;
    else s += 10;

    if (/(enhanced|premium|natural|增强|高级)/i.test(name)) s += 35;
    if (/(ting-?ting|婷婷|yu-?shu|雨舒|li-?mu|力睦|xiao-?xiao|晓晓|yun-?xi|云希|hui-?hui|慧慧)/i.test(name)) s += 40;
    if (/siri/i.test(name)) s += 30;
    if (/google.*(普通话|mandarin|china)/i.test(name)) s += 30;
    else if (/google/i.test(name)) s += 20;
    if (v.localService) s += 15;
    if (/(compact|espeak|eloquence)/i.test(name)) s -= 30;

    return s;
  }

  function pickVoice() {
    if (!supported) return null;
    var list = [];
    try { list = window.speechSynthesis.getVoices() || []; } catch (e) { return null; }
    var best = null, bestScore = -999;
    for (var i = 0; i < list.length; i++) {
      var s = score(list[i]);
      if (s > bestScore) { bestScore = s; best = list[i]; }
    }
    return bestScore > 0 ? best : null;
  }

  function loadVoices() {
    voice = pickVoice();
    if (voice) return;
    var tries = 0;
    var t = setInterval(function () {
      voice = pickVoice();
      tries++;
      if (voice || tries >= 6) clearInterval(t);
    }, 100);
  }

  if (supported) {
    loadVoices();
    try {
      window.speechSynthesis.onvoiceschanged = function () { voice = pickVoice(); };
    } catch (e) {}
  }

  function hasClips() {
    var map = MT.voiceClips;
    if (!map) return false;
    for (var k in map) {
      if (Object.prototype.hasOwnProperty.call(map, k)) return true;
    }
    return false;
  }

  function clipUrl(text) {
    var map = MT.voiceClips;
    if (!map || !Object.prototype.hasOwnProperty.call(map, text)) return '';
    return map[text];
  }

  var player = null;
  var playerUrl = '';
  var audioCtx = null;

  function getPlayer() {
    if (player) return player;
    player = new Audio();
    player.preload = 'auto';
    player.addEventListener('loadedmetadata', function () {
      try { player.playbackRate = rateFactor(); } catch (e) {}
    });
    return player;
  }

  function clipSpeaking() {
    return !!(player && !player.paused && !player.ended);
  }

  function stopClip() {
    if (!player) return;
    try { player.pause(); } catch (e) {}
  }

  // Piper 录音已经按口诀节奏合成。这里只跟用户的慢/正常/快，不再叠一层场景语速。
  function playClip(text) {
    var url = clipUrl(text);
    if (!url) return false;
    var p = getPlayer();
    try { p.pause(); } catch (e) {}
    if (playerUrl !== url) {
      p.src = url;
      playerUrl = url;
    } else {
      try { p.currentTime = 0; } catch (e) {}
    }
    try { p.playbackRate = rateFactor(); } catch (e) {}
    p.volume = 1;
    var ret = p.play();
    if (ret && ret.catch) ret.catch(function () {});
    return true;
  }

  function enabled() {
    var st = MT.progress && MT.progress.settings;
    if (!st || !st.speechOn) return false;
    return supported || hasClips();
  }

  function rateFactor() {
    var st = MT.progress && MT.progress.settings;
    var f = st && RATE_FACTOR[st.speechRate];
    return f || 1;
  }

  function isSpeaking() {
    if (clipSpeaking()) return true;
    if (!supported) return false;
    try {
      return !!(window.speechSynthesis.speaking || window.speechSynthesis.pending);
    } catch (e) {
      return false;
    }
  }

  function utter(text, scene) {
    if (!voice) voice = pickVoice();
    var prof = SCENES[scene] || SCENES.calc;
    try {
      var u = new window.SpeechSynthesisUtterance(String(text));
      u.lang = 'zh-CN';
      if (voice) u.voice = voice;
      u.rate = MT.core.clamp(prof.rate * rateFactor(), 0.5, 1.5);
      u.pitch = prof.pitch;
      u.volume = 1;
      u.onerror = function () {};
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  // 统一入口：同一句正在播就忽略；有别的话在播就先掐掉再播，避免一句句排队堆积。
  // 没有东西在播时同步调用，保证 iOS 仍处在用户手势的调用栈里。
  function play(text, scene) {
    if (!enabled() || !text) return;
    if (text === lastText && isSpeaking()) return;
    if (playClip(text)) {
      if (timer) { clearTimeout(timer); timer = null; }
      if (supported) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
      }
      lastText = text;
      return;
    }
    if (!supported) return;
    if (isSpeaking()) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () { utter(text, scene); }, 70);
    } else {
      utter(text, scene);
    }
    lastText = text;
  }

  // iOS Safari 要求首次发声发生在用户手势的同步调用栈内。
  // 用极短的真实音节预热，最多两次（调用点每次交互都会调，等于自动重试一次）。
  function warmup() {
    if (!enabled() || warmCount >= 2) return;
    warmCount++;
    if (hasClips()) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      try {
        if (!audioCtx) audioCtx = new Ctx();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        var buf = audioCtx.createBuffer(1, 1, 22050);
        var src = audioCtx.createBufferSource();
        src.buffer = buf;
        src.connect(audioCtx.destination);
        src.start(0);
      } catch (e) {}
      return;
    }
    if (!supported) return;
    if (!voice) voice = pickVoice();
    try {
      var u = new window.SpeechSynthesisUtterance('一');
      u.lang = 'zh-CN';
      if (voice) u.voice = voice;
      u.volume = 0.01;
      u.rate = 2;
      u.onerror = function () {};
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  function stop() {
    if (timer) { clearTimeout(timer); timer = null; }
    lastText = '';
    stopClip();
    if (!supported) return;
    try { window.speechSynthesis.cancel(); } catch (e) {}
  }

  MT.speech = {
    supported: supported || hasClips(),
    hasClips: hasClips,
    play: play,
    stop: stop,
    warmup: warmup,
    enabled: enabled
  };
})(window.MT = window.MT || {});
