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

  function fitNow(changed, a, b) {
    var mod = MT.op.current();
    if (mod.fit) return mod.fit(changed, a, b);
    return { a: MT.core.clamp(a, 1, 9), b: MT.core.clamp(b, 1, 9) };
  }

  function viewList() {
    return MT.op.current().views || ['array', 'groups', 'numberline', 'area', 'all'];
  }

  function ensureView() {
    var list = viewList();
    if (list.indexOf(S.view) === -1) S.view = list[0];
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

  function fillNums(target, span) {
    var box = dom['nums-' + target];
    box.innerHTML = '';
    box.dataset.min = String(span.min);
    for (var i = span.min; i <= span.max; i++) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'num';
      btn.dataset.v = i;
      btn.textContent = i;
      btn.setAttribute('aria-pressed', 'false');
      box.appendChild(btn);
    }
  }

  function paintNums() {
    ['a', 'b'].forEach(function (target) {
      var mod = MT.op.current();
      var span = mod.span ? mod.span() : { min: 1, max: 9 };
      var box = dom['nums-' + target];
      var expect = span.max - span.min + 1;
      if (!box || box.children.length !== expect || box.dataset.min !== String(span.min)) {
        fillNums(target, span);
      }
      box.classList.toggle('nums-wide', expect > 9);
      for (var j = 0; j < box.children.length; j++) {
        var n = parseInt(box.children[j].dataset.v, 10);
        var on = n === S[target];
        var ok = mod.allow ? mod.allow(target, n, S.a, S.b) : true;
        box.children[j].classList.toggle('is-on', on);
        box.children[j].classList.toggle('is-off', !ok);
        box.children[j].disabled = !ok;
        box.children[j].setAttribute('aria-pressed', on ? 'true' : 'false');
      }
      var slider = dom['slider-' + target];
      if (slider) {
        slider.min = span.min;
        slider.max = span.max;
        slider.value = S[target];
      }
    });
  }

  function syncInputs() {
    dom['pv-a'].textContent = S.a;
    dom['pv-b'].textContent = S.b;
    paintNums();
  }

  function paintViewButtons() {
    ensureView();
    var list = viewList();
    var box = dom.viewswitch;
    box.innerHTML = '';
    for (var i = 0; i < list.length; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'vs' + (list[i] === S.view ? ' is-on' : '');
      b.dataset.view = list[i];
      b.textContent = (MT.visuals.label && MT.visuals.label[list[i]]) || list[i];
      b.setAttribute('aria-pressed', list[i] === S.view ? 'true' : 'false');
      box.appendChild(b);
    }
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
      dom.btnSwap.hidden = !v.canSwap;
      if (v.canSwap) {
        dom.btnSwap.textContent = v.swapLabel;
        dom.btnSwap.title = v.swapTitle;
      }
    }
    if (dom.storySeg) {
      var kids = dom.storySeg.children;
      for (var i = 0; i < kids.length; i++) {
        var on = kids[i].dataset.story === story();
        kids[i].classList.toggle('is-on', on);
        kids[i].setAttribute('aria-pressed', on ? 'true' : 'false');
      }
    }
    var aWord = v.wordA || (v.showStory ? '份数 ' : '行数 ');
    var bWord = v.wordB || (v.showStory ? '每份 ' : '每行 ');
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
    if (minusA) minusA.setAttribute('aria-label', v.minusA || (v.showStory ? '减少一份' : '减少一行'));
    if (plusA) plusA.setAttribute('aria-label', v.plusA || (v.showStory ? '增加一份' : '增加一行'));
    if (minusB) minusB.setAttribute('aria-label', v.minusB || (v.showStory ? '每份减少一个' : '减少一个'));
    if (plusB) plusB.setAttribute('aria-label', v.plusB || (v.showStory ? '每份增加一个' : '增加一个'));
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
    var next = fitNow(target, target === 'a' ? v : S.a, target === 'b' ? v : S.b);
    if (S.a === next.a && S.b === next.b) return;
    S.a = next.a;
    S.b = next.b;
    syncInputs();
    if (animate === false) renderSoon();
    else render(true);
    if (MT.badges) MT.badges.unlock('star_starter');
  }

  function setView(v) {
    var list = viewList();
    if (list.indexOf(v) === -1) v = list[0];
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

  function bindNums(target) {
    var box = dom['nums-' + target];
    box.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('.num') : e.target;
      if (!t || !t.dataset || t.dataset.v === undefined || t.disabled) return;
      MT.speech.warmup();
      MT.sound.play('click');
      setFactor(target, parseInt(t.dataset.v, 10));
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

      bindNums('a');
      bindNums('b');
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
      paintViewButtons();
      setView(S.view);
    },

    // 供其它模块调用：切到探究台并展示某个算式
    show: function (a, b) {
      var next = fitNow('sync', a, b);
      S.a = next.a;
      S.b = next.b;
      syncInputs();
      render(true);
    },

    redraw: function () {
      var next = fitNow('sync', S.a, S.b);
      S.a = next.a;
      S.b = next.b;
      ensureView();
      paintViewButtons();
      syncInputs();
      render(false);
    },

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
