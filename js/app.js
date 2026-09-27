(function (MT) {
  'use strict';

  var current = 'explore';

  function showFatal(msg) {
    var box = document.getElementById('boot-error');
    if (!box) return;
    box.hidden = false;
    box.style.display = 'flex';
    var card = box.querySelector('.boot-card');
    if (card) {
      var h = card.querySelector('h2');
      var p = card.querySelector('p');
      if (h) h.textContent = '页面出了点问题';
      if (p) p.textContent = msg || '请刷新页面重试。';
    }
  }

  function showTab(name) {
    MT.speech.stop();
    if (name !== 'quiz') MT.quiz.stop();
    if (name !== 'games' && MT.games) MT.games.pause();
    if (name === 'games' && MT.games) MT.games.resume();

    current = name;
    var panels = ['explore', 'table', 'quiz', 'games'];
    for (var i = 0; i < panels.length; i++) {
      var p = document.getElementById('panel-' + panels[i]);
      if (p) p.hidden = (panels[i] !== name);
    }
    var tabs = document.querySelectorAll('.tab');
    for (var j = 0; j < tabs.length; j++) {
      var on = tabs[j].dataset.tab === name;
      tabs[j].classList.toggle('is-on', on);
      tabs[j].setAttribute('aria-selected', on ? 'true' : 'false');
    }
    closeSettings();
    if (name === 'explore') MT.explore.redraw();
    if (name === 'table') MT.table.refresh();
    if (name === 'quiz') MT.quiz.refresh();
    if (MT.bus && MT.bus.emit) MT.bus.emit('tab:change', { tab: name });
    window.scrollTo(0, 0);
  }

  function syncOp() {
    var st = MT.progress && MT.progress.settings;
    var op = st && st.op === 'div' ? 'div' : 'mul';
    var box = document.getElementById('op-switch');
    if (box) {
      var kids = box.children;
      for (var i = 0; i < kids.length; i++) {
        var on = kids[i].dataset.op === op;
        kids[i].classList.toggle('is-on', on);
        kids[i].setAttribute('aria-pressed', on ? 'true' : 'false');
      }
    }
    document.body.classList.toggle('op-div', op === 'div');
    var tabTable = document.querySelector('.tab[data-tab="table"]');
    if (tabTable) {
      tabTable.textContent = (MT.op.current() && MT.op.current().tableTab) || '📋 口诀表';
    }
    var tmSeg = document.querySelector('.seg[data-setting="tableMode"]');
    if (tmSeg) {
      var tmRow = tmSeg.closest ? tmSeg.closest('.set-row') : tmSeg.parentElement;
      if (tmRow) tmRow.style.display = (op === 'div') ? 'none' : '';
    }
  }

  function setOp(op) {
    if (!MT.progress || !MT.progress.settings) return false;
    if (op !== 'mul' && op !== 'div') return false;
    if (MT.progress.settings.op === op) {
      syncOp();
      return false;
    }
    MT.progress.settings.op = op;
    MT.storage.save();
    syncOp();
    if (MT.explore) MT.explore.redraw();
    if (MT.table) {
      MT.table.build();
      MT.table.close();
    }
    if (MT.quiz) {
      MT.quiz.stop();
      MT.quiz.refresh();
    }
    if (MT.games) {
      MT.games.resetAll();
    }
    return true;
  }

  function syncSegs() {
    var segs = document.querySelectorAll('.seg[data-setting]');
    for (var i = 0; i < segs.length; i++) {
      var seg = segs[i];
      var name = seg.dataset.setting;
      var val = MT.progress.settings[name];
      var kids = seg.children;
      for (var j = 0; j < kids.length; j++) {
        var on = kids[j].dataset.value === val;
        kids[j].classList.toggle('is-on', on);
        kids[j].setAttribute('aria-pressed', on ? 'true' : 'false');
      }
    }
  }

  function applySettings() {
    var st = MT.progress.settings;
    document.body.classList.toggle('no-motion', st.reduceMotion === 'on');
    var sp = document.getElementById('btn-speech');
    if (sp) {
      var icon = sp.querySelector('#speech-icon');
      var txt = sp.querySelector('#speech-text');
      if (icon && txt) {
        icon.textContent = st.speechOn ? '🔊' : '🔇';
        txt.textContent = st.speechOn ? '朗读' : '静音';
      } else {
        sp.textContent = '朗读：' + (st.speechOn ? '开' : '关');
      }
      sp.setAttribute('aria-pressed', st.speechOn ? 'true' : 'false');
    }
    syncSegs();
    syncOp();
  }

  function closeSettings() {
    var box = document.getElementById('settings');
    if (box.hidden) return;
    box.hidden = true;
    document.getElementById('btn-settings').setAttribute('aria-expanded', 'false');
  }

  function toggleSettings() {
    var box = document.getElementById('settings');
    box.hidden = !box.hidden;
    document.getElementById('btn-settings').setAttribute('aria-expanded', box.hidden ? 'false' : 'true');
  }

  function bindSettings() {
    var segs = document.querySelectorAll('.seg[data-setting]');
    for (var i = 0; i < segs.length; i++) {
      (function (seg) {
        seg.addEventListener('click', function (e) {
          var t = e.target;
          if (!t || !t.dataset || !t.dataset.value) return;
          var key = seg.dataset.setting;
          MT.progress.settings[key] = t.dataset.value;
          MT.storage.save();
          applySettings();
          if (key === 'tableMode') MT.table.build();
          if (key === 'reduceMotion') MT.explore.redraw();
          if (key === 'soundOn' && t.dataset.value === 'on') MT.sound.play('right');
          if (key === 'speechRate') MT.speech.play('三、四、十二', 'koujue');
          if (key === 'hapticOn' && t.dataset.value === 'on' && 'vibrate' in navigator) {
            try { navigator.vibrate(20); } catch (err) {}
          }
        });
      })(segs[i]);
    }

    document.getElementById('btn-reset').addEventListener('click', function () {
      if (!window.confirm('清空全部学习进度？已掌握的标记、闯关星星和错题都会没有。')) return;
      MT.storage.reset();
      MT.progress = MT.storage.load();
      applySettings();
      MT.table.build();
      MT.table.close();
      MT.quiz.stop();
      MT.quiz.refresh();
      if (MT.games) MT.games.resetAll();
      MT.explore.redraw();
      closeSettings();
    });
  }

  function bindHeader() {
    document.getElementById('btn-speech').addEventListener('click', function () {
      var st = MT.progress.settings;
      st.speechOn = !st.speechOn;
      MT.storage.save();
      applySettings();
      if (st.speechOn) {
        MT.speech.warmup();
        MT.speech.play('朗读打开啦', 'ok');
      } else {
        MT.speech.stop();
      }
    });

    document.getElementById('btn-print').addEventListener('click', function () {
      MT.sound.play('click');
      closeSettings();
      MT.print.run();
    });

    document.getElementById('btn-settings').addEventListener('click', function (e) {
      e.stopPropagation();
      MT.sound.play('click');
      toggleSettings();
    });

    document.getElementById('settings').addEventListener('click', function (e) {
      e.stopPropagation();
    });

    document.addEventListener('click', function () {
      if (!document.getElementById('settings').hidden) closeSettings();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeSettings();
    });

    var opSwitch = document.getElementById('op-switch');
    if (opSwitch) {
      opSwitch.addEventListener('click', function (e) {
        var t = e.target;
        if (!t || !t.dataset || !t.dataset.op) return;
        MT.speech.warmup();
        MT.sound.play('click');
        if (setOp(t.dataset.op) && t.dataset.op === 'div' && current === 'explore' && MT.explore && MT.explore.describe) {
          var heard = MT.explore.describe();
          MT.speech.play(heard.read, heard.scene || 'koujue');
        }
      });
    }

    var tabs = document.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          MT.speech.warmup();
          MT.sound.play('click');
          showTab(btn.dataset.tab);
        });
      })(tabs[i]);
    }
  }

  function notes() {
    if (!MT.storage.available) {
      document.getElementById('storage-note').hidden = false;
    }
    if (!MT.speech.supported) {
      document.getElementById('speech-note').hidden = false;
      document.getElementById('btn-speech').style.display = 'none';
    }
  }

  var rt = null;
  function onResize() {
    if (rt) clearTimeout(rt);
    rt = setTimeout(function () {
      if (current === 'explore') MT.explore.redraw();
      if (current === 'table') MT.table.redraw();
    }, 200);
  }

  function registerSW() {
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      var refreshing = false;
      var pendingReload = false;

      function shouldDeferReload() {
        if (MT.quiz && MT.quiz.isActive && MT.quiz.isActive()) return true;
        if (MT.games && MT.games.isActive && MT.games.isActive()) return true;
        return false;
      }

      function performReload() {
        if (refreshing) return;
        if (shouldDeferReload()) {
          pendingReload = true;
          return;
        }
        refreshing = true;
        window.location.reload();
      }

      navigator.serviceWorker.addEventListener('controllerchange', function () {
        performReload();
      });

      if (MT.bus && MT.bus.on) {
        MT.bus.on('quiz:end', function () {
          if (pendingReload) performReload();
        });
        MT.bus.on('game:end', function () {
          if (pendingReload) performReload();
        });
        MT.bus.on('tab:change', function () {
          if (pendingReload) performReload();
        });
      }

      window.addEventListener('load', function () {
        navigator.serviceWorker.register('./sw.js').then(function (reg) {
          try { reg.update(); } catch (e) {}
        }).catch(function () {});
      });
    }
  }

  MT.app = {
    init: function () {
      MT.progress = MT.storage.load();

      MT.explore.init();
      MT.table.init();
      MT.quiz.init();
      if (MT.games) MT.games.init();
      if (MT.badges) MT.badges.init();

      bindHeader();
      bindSettings();
      notes();
      applySettings();
      showTab('explore');
      registerSW();

      window.addEventListener('resize', onResize);
      window.addEventListener('orientationchange', onResize);
      window.addEventListener('pagehide', function () { MT.speech.stop(); });

      document.addEventListener('pointerdown', function once() {
        MT.speech.warmup();
        MT.sound.unlock();
        document.removeEventListener('pointerdown', once);
      });
    },

    showFatal: showFatal
  };

  function boot() {
    try {
      MT.app.init();
    } catch (e) {
      console.error(e);
      showFatal('页面初始化失败：' + (e && e.message ? e.message : '未知错误'));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window.MT = window.MT || {});
