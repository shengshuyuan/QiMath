(function (MT) {
  'use strict';

  var current = 'explore';
  var currentTopic = 'catalog';
  var route = { page: 'catalog' };
  var applyingRoute = false;
  var handledHash = '';
  var basicViews = { learn: 'explore', practice: 'quiz' };

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
      tabs[j].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    closeSettings();
    if (name === 'explore') MT.explore.redraw();
    if (name === 'table') MT.table.refresh();
    if (name === 'quiz') MT.quiz.refresh();
    if (MT.bus && MT.bus.emit) MT.bus.emit('tab:change', { tab: name });
    window.scrollTo(0, 0);
  }

  function knownOp(id) {
    return !!(id && MT.op.get(id));
  }

  // 汇总一门课的学习情况：done / total 是已通关数（基础运算）或已独立答对过的知识点数（专题课），wrong 是错题数。
  function courseStats(c) {
    var p = MT.progress, done = 0, total = 0, wrong = 0;
    if (c.topic === 'basic') {
      var op = MT.op.get(c.id);
      if (!op) return null;
      var bag = op.bag(p), levels = bag.levels || {};
      Object.keys(levels).forEach(function (k) { total++; if (levels[k] && levels[k].passed) done++; });
      wrong = Object.keys(bag.wrong || {}).length;
    } else {
      var model = MT[c.id], t = p.topics && p.topics[c.id];
      if (!model) return null;
      total = model.skills.length;
      model.skills.forEach(function (s) { if (t && t.skills[s.id] && t.skills[s.id].clean > 0) done++; });
      wrong = t ? Object.keys(t.wrong || {}).length : 0;
    }
    return { done: done, total: total, wrong: wrong, started: done > 0 || wrong > 0 };
  }

  function courseProgressHTML(c, st) {
    if (!st || !st.started) return '';
    var unit = c.topic === 'basic' ? '关' : '个知识点';
    var pct = st.total ? Math.round(st.done / st.total * 100) : 0;
    var text = (st.done >= st.total ? '全部完成 🎉' : '已完成 ' + st.done + ' / ' + st.total + ' ' + unit) + (st.wrong ? ' · ' + st.wrong + ' 道错题' : '');
    return '<span class="course-progress"><span class="course-progress-bar" aria-hidden="true"><i style="width:' + pct + '%"></i></span><span class="course-progress-text">' + text + '</span></span>';
  }

  function renderWrongBanner(stats) {
    var box = document.getElementById('wrong-banner');
    if (!box) return;
    var top = null, totalWrong = 0;
    stats.forEach(function (item) {
      if (!item.st || !item.st.wrong) return;
      totalWrong += item.st.wrong;
      if (!top || item.st.wrong > top.st.wrong) top = item;
    });
    box.hidden = !top;
    if (!top) return;
    box.dataset.course = top.c.id;
    box.innerHTML = '<span class="wrong-banner-icon" aria-hidden="true">📝</span><span class="wrong-banner-copy"><b>有 ' + totalWrong + ' 道错题等着复习</b><small>先从「' + top.c.title + '」的 ' + top.st.wrong + ' 道开始，连续答对两次就会消掉。</small></span><span class="course-arrow" aria-hidden="true">→</span>';
  }

  function renderCatalog() {
    var stats = [];
    ['number', 'measure'].forEach(function (group) {
      var courses = MT.navigation.courses.filter(function (c) { return (c.domain === '量与测量') === (group === 'measure'); });
      document.getElementById(group + '-courses').innerHTML = courses.map(function (c) {
        var st = courseStats(c);
        stats.push({ c: c, st: st });
        return '<button type="button" class="course-card' + (st && st.started ? ' is-started' : '') + '" data-course="' + c.id + '"><span class="course-mark" aria-hidden="true">' + c.mark + '</span><span class="course-card-copy"><b>' + c.title + '</b><small>' + c.description + '</small>' + courseProgressHTML(c, st) + '</span><span class="course-arrow" aria-hidden="true">→</span></button>';
      }).join('');
    });
    renderWrongBanner(stats);
    var last = MT.navigation.parse(MT.progress.settings.lastLocation);
    var resume = document.getElementById('btn-continue');
    resume.hidden = last.page !== 'course';
    if (!resume.hidden) {
      var c = MT.navigation.course(last.course);
      var m = c.topic === 'basic' ? null : MT[c.id];
      var skill = m && m.skills.filter(function (s) { return s.id === last.skill; })[0];
      resume.textContent = '继续学习 · ' + c.title + (skill ? ' · ' + skill.title : '') + ' →';
    }
  }

  function syncCourseModes(mode) {
    document.querySelectorAll('[data-course-mode]').forEach(function (btn) {
      var on = btn.dataset.courseMode === mode;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', String(on));
    });
    document.getElementById('basic-tabs').hidden = currentTopic !== 'basic' || mode === 'wrong';
    document.querySelectorAll('[data-tab]').forEach(function (btn) {
      btn.hidden = mode === 'learn' ? ['explore', 'table'].indexOf(btn.dataset.tab) === -1 : ['quiz', 'games'].indexOf(btn.dataset.tab) === -1;
    });
    document.getElementById('btn-quiz-reset').hidden = mode !== 'practice';
  }

  function rememberRoute(r, replace) {
    var hash = MT.navigation.hash(r);
    if (location.hash !== hash) {
      // 不刷新页面，让浏览器的返回/前进能恢复课程、知识点与学习方式。
      window.history[replace ? 'replaceState' : 'pushState'](null, '', hash);
    }
    handledHash = hash;
    if (r.page === 'course') {
      MT.progress.settings.lastLocation = hash;
      MT.storage.save();
    }
  }

  function openRoute(next, replace) {
    var previous = route;
    route = MT.navigation.normalize(next);
    rememberRoute(route, replace);
    applyingRoute = true;
    MT.speech.stop();
    MT.quiz.stop();
    MT.quiz.closeDialogs();
    if (MT.badges) MT.badges.close();
    if (MT.games) MT.games.pause();
    MT.table.close();
    MT.topics.leave();
    closeSettings();
    ['explore', 'table', 'quiz', 'games', 'topic'].forEach(function (name) { document.getElementById('panel-' + name).hidden = true; });
    var catalog = route.page === 'catalog';
    currentTopic = catalog ? 'catalog' : MT.navigation.course(route.course).topic;
    document.body.classList.toggle('topic-basic', currentTopic === 'basic');
    document.body.classList.toggle('in-catalog', catalog);
    document.body.classList.remove('is-practicing');
    document.getElementById('catalog-page').hidden = !catalog;
    document.getElementById('course-heading').hidden = catalog;
    document.getElementById('btn-directory').setAttribute('aria-current', catalog ? 'page' : 'false');
    document.getElementById('btn-print').hidden = catalog;
    document.getElementById('btn-badges').hidden = false;
    document.querySelectorAll('[data-basic-setting]').forEach(function (row) { row.hidden = currentTopic !== 'basic'; });
    if (catalog) renderCatalog();
    else {
      var c = MT.navigation.course(route.course);
      MT.progress.settings.topic = c.topic;
      document.getElementById('course-domain').textContent = c.domain;
      document.getElementById('breadcrumb-course').textContent = c.title;
      document.getElementById('course-title').textContent = c.title;
      syncCourseModes(route.mode);
      if (c.topic === 'basic') {
        setOp(c.id);
        syncOp();
        showTab(route.view);
        if (route.view === 'quiz') MT.quiz.setMode(route.mode === 'wrong' ? 'wrong' : 'levels');
        if (route.mode !== 'wrong') basicViews[route.mode] = route.view;
      } else {
        document.getElementById('panel-topic').hidden = false;
        MT.topics.enter(c.id, { skill: route.skill, mode: route.mode, game: route.game });
      }
    }
    applyingRoute = false;
    if (MT.bus) MT.bus.emit('tab:change', { page: route.page, course: route.course });
    window.scrollTo(0, 0);
    if (catalog || previous.course !== route.course) {
      document.getElementById(catalog ? 'catalog-title' : 'course-title').focus({ preventScroll: true });
    }
  }

  function changeCourseMode(mode) {
    if (route.page !== 'course' || route.mode === mode) return;
    if (currentTopic === 'basic') openRoute({ course: route.course, mode: mode, view: basicViews[mode] });
    else MT.topics.changeMode(mode);
  }

  function syncOp() {
    var st = MT.progress && MT.progress.settings;
    var op = st && knownOp(st.op) ? st.op : 'mul';
    document.body.classList.toggle('op-div', op === 'div');
    var tabTable = document.querySelector('.tab[data-tab="table"]');
    if (tabTable) {
      tabTable.textContent = ((MT.op.current() && MT.op.current().tableTab) || '口诀表').replace('📋 ', '');
    }
    var tmSeg = document.querySelector('.seg[data-setting="tableMode"]');
    if (tmSeg) {
      var tmRow = tmSeg.closest ? tmSeg.closest('.set-row') : tmSeg.parentElement;
      if (tmRow) tmRow.style.display = (op === 'mul') ? '' : 'none';
    }
  }

  function setOp(op) {
    if (!MT.progress || !MT.progress.settings) return false;
    if (!knownOp(op)) return false;
    if (MT.progress.settings.op === op) {
      syncOp();
      return false;
    }
    MT.speech.stop();
    MT.progress.settings.op = op;
    MT.storage.save();
    syncOp();
    if (MT.explore) MT.explore.redraw();
    if (MT.table) {
      MT.table.close();
      MT.table.build();
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

  // 离线语音：只在基础运算课显示（录音只覆盖加减乘除），下载当前运算的全部录音让 Service Worker 缓存。
  function bindVoiceCache() {
    var btn = document.getElementById('btn-cache-voice');
    var status = document.getElementById('voice-cache-status');
    var row = document.getElementById('voice-cache-row');
    if (!btn || !status || !row) return;
    if (!MT.speech.hasClips() || !('serviceWorker' in navigator)) {
      row.hidden = true;
      row.removeAttribute('data-basic-setting');
      return;
    }
    btn.addEventListener('click', function () {
      var op = MT.progress.settings.op;
      var title = (MT.navigation.course(op) || {}).title || '这门课';
      btn.disabled = true;
      status.textContent = '正在下载「' + title + '」的语音……';
      MT.speech.cacheClips(op, function (done, total) {
        status.textContent = '正在下载「' + title + '」的语音 ' + done + ' / ' + total;
      }).then(function (r) {
        status.textContent = r.failed ? '下载完成，有 ' + r.failed + ' 段没成功，联网后再点一次即可补全。' : '「' + title + '」的语音已存好，断网也能听。';
      }, function (e) {
        status.textContent = e && e.message ? e.message : '下载失败，请检查网络后再试。';
      }).then(function () { btn.disabled = false; });
    });
  }

  function bindSettings() {
    bindVoiceCache();
    var transferStatus = document.getElementById('progress-transfer-status');
    var progressFile = document.getElementById('progress-file');
    document.getElementById('btn-export-progress').addEventListener('click', function () {
      var url;
      try {
        var link = document.createElement('a');
        url = URL.createObjectURL(new Blob([MT.storage.backup()], { type: 'application/json' }));
        link.href = url;
        link.download = 'QiMath-progress-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(link);
        link.click();
        link.remove();
        transferStatus.textContent = '进度文件已保存到下载位置，把它发到新设备后点「读取进度文件」。';
      } catch (e) {
        transferStatus.textContent = '导出失败，请换一个支持文件下载的浏览器。';
      }
      if (url) setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });
    document.getElementById('btn-import-progress').addEventListener('click', function () {
      progressFile.value = '';
      progressFile.click();
    });
    progressFile.addEventListener('change', function () {
      var file = progressFile.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        transferStatus.textContent = '文件太大，请选择不超过 2 MB 的 QiMath 进度备份。';
        return;
      }
      var reader = new FileReader();
      reader.onerror = function () { transferStatus.textContent = '文件读取失败，原进度没有改变。'; };
      reader.onload = function () {
        try {
          MT.storage.readBackup(reader.result);
          if (!window.confirm('导入会替换这个浏览器的全部学习进度。建议先导出当前进度备份。确认导入？')) {
            transferStatus.textContent = '已取消导入，当前进度没有改变。';
            return;
          }
          MT.storage.importBackup(reader.result);
          window.location.reload();
        } catch (e) { transferStatus.textContent = e.message; }
      };
      reader.readAsText(file);
    });

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
      openRoute({ page: 'catalog' });
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

    document.getElementById('btn-directory').addEventListener('click', function () { openRoute({ page: 'catalog' }); });
    document.getElementById('catalog-page').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-course]');
      if (btn) openRoute({ course: btn.dataset.course, mode: 'learn' });
    });
    document.getElementById('btn-continue').addEventListener('click', function () {
      openRoute(MT.navigation.parse(MT.progress.settings.lastLocation));
    });
    document.getElementById('wrong-banner').addEventListener('click', function (e) {
      openRoute({ course: e.currentTarget.dataset.course, mode: 'wrong' });
    });
    document.getElementById('course-modes').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-course-mode]');
      if (btn) changeCourseMode(btn.dataset.courseMode);
    });
    document.querySelectorAll('[data-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (current === btn.dataset.tab) return;
        MT.sound.play('click');
        openRoute({ course: route.course, mode: route.mode, view: btn.dataset.tab });
      });
    });
    MT.bus.on('topic:navigate', function (state) {
      if (applyingRoute || route.page !== 'course' || currentTopic === 'basic') return;
      route = MT.navigation.normalize({ course: route.course, mode: state.mode, skill: state.skill, game: state.game });
      syncCourseModes(route.mode);
      rememberRoute(route);
    });
    function onHistory() {
      if (location.hash !== handledHash) openRoute(MT.navigation.parse(location.hash), true);
    }
    window.addEventListener('popstate', onHistory);
    window.addEventListener('hashchange', onHistory);
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
      if (currentTopic === 'basic' && current === 'explore') MT.explore.redraw();
      if (currentTopic === 'basic' && current === 'table') MT.table.redraw();
    }, 200);
  }

  function registerSW() {
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      var refreshing = false;
      var pendingReload = false;

      function shouldDeferReload() {
        if (MT.quiz && MT.quiz.isActive && MT.quiz.isActive()) return true;
        if (MT.games && MT.games.isActive && MT.games.isActive()) return true;
        if (MT.topics && MT.topics.isActive()) return true;
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
        MT.bus.on('topic:end', function () {
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
      MT.topics.init();
      if (MT.moneyGames) MT.moneyGames.init();

      bindHeader();
      bindSettings();
      notes();
      applySettings();
      openRoute(MT.navigation.parse(location.hash), true);
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
