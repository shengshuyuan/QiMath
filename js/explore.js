(function (MT) {
  'use strict';

  var S = { a: 3, b: 4, view: 'array' };
  var dom = {};
  var raf = null;

  function settings() {
    return (MT.progress && MT.progress.settings) || {};
  }

  function isDiv() {
    return settings().op === 'div';
  }

  function story() {
    return settings().divStory === 'measure' ? 'measure' : 'share';
  }

  function parts() {
    return MT.core.divParts(S.a, S.b, story());
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
    var n = S.a * S.b;
    var commuteHtml = (S.a !== S.b)
      ? ' · <span class="sum-commute">⇄ ' + (isDiv() ? '对调后：' + MT.core.divParts(S.b, S.a, story()).eq : '交换律：' + S.b + ' × ' + S.a + ' = ' + n) + '</span>'
      : ' · <span class="sum-commute">⭐ 两个数相同，是正方形</span>';
    if (isDiv()) {
      var p = parts();
      var legend = p.share
        ? '紫色是分成几份，粉色是每份几个'
        : '粉色是每份几个，紫色是有几份';
      dom.sumline.innerHTML =
        '<div class="sum-row sum-div"><span class="tk-brand">' + p.n + '</span> <span class="op">÷</span> ' +
        '<span class="tk-accent">' + p.divisor + '</span> <span class="op">=</span> <span class="tk-quot">' + p.quot + '</span></div>' +
        '<div class="sum-desc"><span class="sum-tag">算式名称</span>被除数 <b>' + p.n + '</b> ÷ 除数 <b>' + p.divisor + '</b> = 商 <b>' + p.quot + '</b></div>' +
        '<div class="sum-think">💡 想乘法口诀求商：<b>' + p.think + '</b></div>' +
        '<div class="sum-legend">' + legend + commuteHtml + '</div>';
      return;
    }
    var add = [];
    for (var i = 0; i < S.a; i++) add.push('<span class="tk-accent">' + S.b + '</span>');
    dom.sumline.innerHTML =
      '<div class="sum-row sum-add">' + add.join(' <span class="op">+</span> ') + ' <span class="op">=</span> ' + n + '</div>' +
      '<div class="sum-row sum-mul"><span class="tk-brand">' + S.a + '</span> <span class="op">×</span> ' +
      '<span class="tk-accent">' + S.b + '</span> <span class="op">=</span> ' + n + '</div>' +
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
    if (MT.badges) MT.badges.unlock('swap_magician');
    MT.speech.warmup();
    var line = isDiv()
      ? parts().readSame
      : (MT.core.CN[S.a] + '乘' + MT.core.CN[S.b] + '，同样等于' + MT.core.readNumber(S.a * S.b));
    MT.speech.play(line, 'ok');
  }

  function paintChrome() {
    var div = isDiv();
    var share = story() !== 'measure';
    if (dom.labelA) dom.labelA.textContent = div ? (share ? '分成几份？' : '有几份？') : '有几行？';
    if (dom.labelB) dom.labelB.textContent = div ? '每份几个？' : '每行有几个？';
    if (dom.storySeg) dom.storySeg.hidden = !div;
    if (dom.btnSwap) {
      dom.btnSwap.textContent = div ? '对调除数和商 ⇄' : '交换因数 ⇄';
      dom.btnSwap.title = div ? '12÷3=4 和 12÷4=3 是同一张图' : '交换行与列 (乘法交换律)';
    }
    if (dom.storySeg) {
      var kids = dom.storySeg.children;
      for (var i = 0; i < kids.length; i++) {
        var on = kids[i].dataset.story === story();
        kids[i].classList.toggle('is-on', on);
        kids[i].setAttribute('aria-pressed', on ? 'true' : 'false');
      }
    }
    var aWord = div ? (share ? '份数 ' : '份数 ') : '行数 ';
    var bWord = div ? '每份 ' : '每行 ';
    ['a', 'b'].forEach(function (target) {
      var box = dom['nums-' + target];
      if (!box) return;
      var prefix = target === 'a' ? aWord : bWord;
      for (var j = 0; j < box.children.length; j++) {
        box.children[j].setAttribute('aria-label', prefix + box.children[j].dataset.v);
      }
      var slider = dom['slider-' + target];
      if (slider) slider.setAttribute('aria-label', target === 'a' ? (div ? (share ? '分成几份' : '有几份') : '行数') : (div ? '每份几个' : '每行个数'));
    });
    var minusA = document.querySelector('.mini[data-factor="a"][data-delta="-1"]');
    var plusA = document.querySelector('.mini[data-factor="a"][data-delta="1"]');
    var minusB = document.querySelector('.mini[data-factor="b"][data-delta="-1"]');
    var plusB = document.querySelector('.mini[data-factor="b"][data-delta="1"]');
    if (minusA) minusA.setAttribute('aria-label', div ? '减少一份' : '减少一行');
    if (plusA) plusA.setAttribute('aria-label', div ? '增加一份' : '增加一行');
    if (minusB) minusB.setAttribute('aria-label', div ? '每份减少一个' : '减少一个');
    if (plusB) plusB.setAttribute('aria-label', div ? '每份增加一个' : '增加一个');
  }

  // 拖动滑块时关掉逐个弹出的动画，避免动画永远播不完导致的抖动/掉帧
  function render(animate) {
    var opts = { a: S.a, b: S.b, animate: animate !== false };
    if (isDiv()) opts.story = story();
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
        MT.speech.play(isDiv() ? parts().read : MT.core.read(S.a, S.b), isDiv() ? 'calc' : 'koujue');
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
          MT.speech.play(parts().read, 'calc');
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
      var div = isDiv();
      var p = div ? parts() : null;
      return {
        op: div ? 'div' : 'mul',
        story: story(),
        a: S.a,
        b: S.b,
        eq: div ? p.eq : (S.a + ' × ' + S.b + ' = ' + (S.a * S.b)),
        read: div ? p.read : MT.core.read(S.a, S.b)
      };
    }
  };
})(window.MT = window.MT || {});
