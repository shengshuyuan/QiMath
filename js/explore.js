(function (MT) {
  'use strict';

  var S = { a: 3, b: 4, view: 'array' };
  var dom = {};
  var raf = null;

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
    var add = [];
    for (var i = 0; i < S.a; i++) add.push('<span class="tk-accent">' + S.b + '</span>');
    var addHtml = add.join(' <span class="op">+</span> ');
    var commuteHtml = (S.a !== S.b)
      ? ' · <span class="sum-commute">⇄ 交换律：' + S.b + ' × ' + S.a + ' = ' + (S.a * S.b) + '</span>'
      : ' · <span class="sum-commute">⭐ 两个数相同，是正方形</span>';
    dom.sumline.innerHTML =
      '<div class="sum-row sum-add">' + addHtml + ' <span class="op">=</span> ' + (S.a * S.b) + '</div>' +
      '<div class="sum-row sum-mul"><span class="tk-brand">' + S.a + '</span> <span class="op">×</span> ' +
      '<span class="tk-accent">' + S.b + '</span> <span class="op">=</span> ' + (S.a * S.b) + '</div>' +
      '<div class="sum-legend">紫色是有几行几组，粉色是每行有几个' + commuteHtml + '</div>';
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
    MT.speech.warmup();
    MT.speech.play(MT.core.CN[S.a] + '乘' + MT.core.CN[S.b] + '，同样等于' + MT.core.readNumber(S.a * S.b), 'ok');
  }

  // 拖动滑块时关掉逐个弹出的动画，避免动画永远播不完导致的抖动/掉帧
  function render(animate) {
    MT.visuals.render(dom.stage, S.view, { a: S.a, b: S.b, animate: animate !== false });
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
        MT.speech.play(MT.core.read(S.a, S.b), 'koujue');
      });

      document.getElementById('btn-replay').addEventListener('click', function () {
        MT.speech.warmup();
        MT.sound.play('click');
        render(true);
      });

      var btnSwap = document.getElementById('btn-swap');
      if (btnSwap) {
        btnSwap.addEventListener('click', function () {
          MT.speech.warmup();
          swapFactors();
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

    redraw: function () { render(false); }
  };
})(window.MT = window.MT || {});
