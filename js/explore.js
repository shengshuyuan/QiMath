(function (MT) {
  'use strict';

  var S = { a: 3, b: 4, view: 'array' };
  var dom = {};
  var raf = null;

  function settings() {
    return (MT.progress && MT.progress.settings) || {};
  }

  function story() {
    return settings().divStory === 'measure' ? 'measure' : 'share';
  }

  function view() {
    return MT.op.current().explore(S.a, S.b, story());
  }

  function num(target, v) {
    var box = dom['nums-' + target];
    var kids = box.children;
    for (var i = 0; i < kids.length; i++) {
      kids[i].classList.toggle('is-on', parseInt(kids[i].dataset.v, 10) === v);
    }
  }

  function syncInputs() {
    dom['pv-a'].textContent = S.a;
    dom['pv-b'].textContent = S.b;
    dom['slider-a'].value = S.a;
    dom['slider-b'].value = S.b;
    num('a', S.a);
    num('b', S.b);
  }

  function sumline() {
    dom.sumline.innerHTML = view().sumHTML;
  }

  function swapFactors() {
    var oldA = S.a, oldB = S.b;
    if (oldA === oldB) {
      MT.sound.play('click');
      return;
    }
    S.a = oldB;
    S.b = oldA;
    syncInputs();
    MT.sound.play('click');
    render(true);
    if (MT.badges) MT.badges.unlock('swap_magician');
    MT.speech.warmup();
    var v = view();
    MT.speech.play(v.swapSpeech, v.scene);
  }

  function paintChrome() {
    var v = view();
    if (dom.labelA) dom.labelA.textContent = v.labelA;
    if (dom.labelB) dom.labelB.textContent = v.labelB;
    if (dom.storySeg) dom.storySeg.hidden = !v.showStory;
    if (dom.btnSwap) {
      dom.btnSwap.textContent = v.swapLabel;
      dom.btnSwap.title = v.swapTitle;
    }
    if (dom.storySeg) {
      var kids = dom.storySeg.children;
      for (var i = 0; i < kids.length; i++) {
        var on = kids[i].dataset.story === story();
        kids[i].classList.toggle('is-on', on);
        kids[i].setAttribute('aria-pressed', on ? 'true' : 'false');
      }
    }
    var aWord = v.showStory ? '份数 ' : '行数 ';
    var bWord = v.showStory ? '每份 ' : '每行 ';
    ['a', 'b'].forEach(function (target) {
      var box = dom['nums-' + target];
      if (!box) return;
      var prefix = target === 'a' ? aWord : bWord;
      for (var j = 0; j < box.children.length; j++) {
        box.children[j].setAttribute('aria-label', prefix + box.children[j].dataset.v);
      }
      var slider = dom['slider-' + target];
      if (slider) slider.setAttribute('aria-label', target === 'a' ? v.labelA : v.labelB);
    });
    var minusA = document.querySelector('.mini[data-factor="a"][data-delta="-1"]');
    var plusA = document.querySelector('.mini[data-factor="a"][data-delta="1"]');
    var minusB = document.querySelector('.mini[data-factor="b"][data-delta="-1"]');
    var plusB = document.querySelector('.mini[data-factor="b"][data-delta="1"]');
    if (minusA) minusA.setAttribute('aria-label', v.showStory ? '减少一份' : '减少一行');
    if (plusA) plusA.setAttribute('aria-label', v.showStory ? '增加一份' : '增加一行');
    if (minusB) minusB.setAttribute('aria-label', v.showStory ? '每份减少一个' : '减少一个');
    if (plusB) plusB.setAttribute('aria-label', v.showStory ? '每份增加一个' : '增加一个');
  }

  // 拖动滑块时关掉逐个弹出的动画，避免动画永远播不完导致的抖动/掉帧
  function render(animate) {
    var v = view();
    var opts = v.viz;
    opts.animate = animate !== false;
    MT.visuals.render(dom.stage, S.view, opts);
    paintChrome();
    sumline();
  }

  function renderSoon() {
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = null;
      render(false);
    });
  }

  function setFactor(target, v, animate) {
    v = MT.core.clamp(v, 1, 9);
    if (S[target] === v) return;
    S[target] = v;
    syncInputs();
    if (animate === false) renderSoon();
    else render(true);
    if (MT.badges) MT.badges.unlock('star_starter');
  }

  function setView(v) {
    S.view = v;
    var st = MT.progress && MT.progress.settings;
    if (st) { st.lastView = v; MT.storage.save(); }
    var kids = dom.viewswitch.children;
    for (var i = 0; i < kids.length; i++) {
      kids[i].classList.toggle('is-on', kids[i].dataset.view === v);
      kids[i].setAttribute('aria-pressed', kids[i].dataset.view === v ? 'true' : 'false');
    }
    render(true);
  }

  function buildNums(target) {
    var box = dom['nums-' + target];
    box.innerHTML = '';
    for (var i = 1; i <= 9; i++) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'num';
      btn.dataset.v = i;
      btn.textContent = i;
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('aria-label', (target === 'a' ? '行数 ' : '每行 ') + i);
      box.appendChild(btn);
    }
    box.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.dataset || !t.dataset.v) return;
      MT.speech.warmup();
      MT.sound.play('click');
      var v = parseInt(t.dataset.v, 10);
      for (var j = 0; j < box.children.length; j++) {
        box.children[j].setAttribute('aria-pressed', box.children[j].dataset.v === t.dataset.v ? 'true' : 'false');
      }
      setFactor(target, v);
    });
  }

  function bindSteps() {
    var list = document.querySelectorAll('.mini[data-factor]');
    for (var i = 0; i < list.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var f = btn.dataset.factor;
          var d = parseInt(btn.dataset.delta, 10);
          MT.speech.warmup();
          MT.sound.play('click');
          setFactor(f, S[f] + d);
        });
      })(list[i]);
    }
  }

  MT.explore = {
    init: function () {
      dom.stage = document.getElementById('stage');
      dom.sumline = document.getElementById('sumline');
      dom.viewswitch = document.getElementById('view-switch');
      dom.storySeg = document.getElementById('div-story');
      dom.labelA = document.getElementById('label-a');
      dom.labelB = document.getElementById('label-b');
      dom.btnSwap = document.getElementById('btn-swap');
      dom['pv-a'] = document.getElementById('pv-a');
      dom['pv-b'] = document.getElementById('pv-b');
      dom['nums-a'] = document.getElementById('nums-a');
      dom['nums-b'] = document.getElementById('nums-b');
      dom['slider-a'] = document.getElementById('slider-a');
      dom['slider-b'] = document.getElementById('slider-b');

      buildNums('a');
      buildNums('b');
      bindSteps();

      ['a', 'b'].forEach(function (target) {
        var slider = dom['slider-' + target];
        slider.addEventListener('input', function () {
          setFactor(target, parseInt(this.value, 10), false);
        });
        slider.addEventListener('change', function () {
          MT.speech.warmup();
          render(true);
        });
      });

      dom.viewswitch.addEventListener('click', function (e) {
        var t = e.target;
        if (!t || !t.dataset || !t.dataset.view) return;
        MT.speech.warmup();
        MT.sound.play('click');
        setView(t.dataset.view);
      });

      document.getElementById('btn-say').addEventListener('click', function () {
        MT.speech.warmup();
        var heard = view();
        MT.speech.play(heard.speech, heard.scene);
      });

      document.getElementById('btn-replay').addEventListener('click', function () {
        MT.speech.warmup();
        MT.sound.play('click');
        render(true);
      });

      if (dom.btnSwap) {
        dom.btnSwap.addEventListener('click', function () {
          MT.speech.warmup();
          swapFactors();
        });
      }

      if (dom.storySeg) {
        dom.storySeg.addEventListener('click', function (e) {
          var t = e.target;
          if (!t || !t.dataset || !t.dataset.story) return;
          if (!MT.progress || !MT.progress.settings) return;
          MT.progress.settings.divStory = t.dataset.story === 'measure' ? 'measure' : 'share';
          MT.storage.save();
          MT.speech.warmup();
          MT.sound.play('click');
          render(true);
          var heard = view();
          MT.speech.play(heard.speech, heard.scene);
        });
      }

      var skinBox = document.getElementById('skin-options');
      if (skinBox) {
        var curSkin = (MT.progress && MT.progress.settings && MT.progress.settings.objectSkin) || 'dot';
        var btns = skinBox.children;
        for (var b = 0; b < btns.length; b++) {
          var on = btns[b].dataset.skin === curSkin;
          btns[b].classList.toggle('is-on', on);
          btns[b].setAttribute('aria-pressed', on ? 'true' : 'false');
        }
        skinBox.addEventListener('click', function (e) {
          var t = e.target;
          if (!t || !t.dataset || !t.dataset.skin) return;
          if (!MT.progress || !MT.progress.settings) return;
          MT.progress.settings.objectSkin = t.dataset.skin;
          MT.storage.save();
          for (var i = 0; i < btns.length; i++) {
            var active = btns[i].dataset.skin === t.dataset.skin;
            btns[i].classList.toggle('is-on', active);
            btns[i].setAttribute('aria-pressed', active ? 'true' : 'false');
          }
          MT.sound.play('click');
          render(true);
        });
      }

      var st = MT.progress && MT.progress.settings;
      if (st && st.lastView) S.view = st.lastView;

      syncInputs();
      setView(S.view);
    },

    // 供其它模块调用：切到探究台并展示某个算式
    show: function (a, b) {
      S.a = a; S.b = b;
      syncInputs();
      render(true);
    },

    redraw: function () { render(false); },

    describe: function () {
      var v = view();
      return {
        op: MT.op.current().id,
        story: story(),
        a: S.a,
        b: S.b,
        read: v.speech,
        scene: v.scene
      };
    }
  };
})(window.MT = window.MT || {});
