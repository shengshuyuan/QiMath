(function (MT) {
  'use strict';

  var current = 'explore';
  var currentTopic = 'catalog';
  var route = { page: 'catalog' };
  var applyingRoute = false;
  var handledHash = '';
  var basicViews = { learn: 'explore', practice: 'quiz' };
  var gradeFilter = 'all';
  var reportFocus = null;
  var settingsFocus = null;
  var SPEECH_SVG_ON = '<svg class="nav-svg" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  var SPEECH_SVG_OFF = '<svg class="nav-svg" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>';
  var TARGET_SVG = '<svg class="nav-svg" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>';
  var PRINT_SVG = '<svg class="nav-svg" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V4h12v5"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="6"/></svg>';
  var COURSE_MARKS_SVG = {
    length: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="8" rx="1.5"/><path d="M7 8v3M11 8v4M15 8v3M19 8v3"/></svg>',
    mass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v15M7 19h10M5 7h14"/><path d="M5 7l-2 6h4zM19 7l-2 6h4z"/></svg>'
  };

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

  function courseStats(c) {
    return MT.insights.courseStats(c);
  }

  function courseProgressHTML(c, st) {
    if (!st || !st.started) return '';
    var unit = c.topic === 'basic' ? '关' : '个知识点';
    var pct = st.total ? Math.round(st.done / st.total * 100) : 0;
    var extra = (c.topic !== 'basic' && st.mastered > 0 && st.done < st.total) ? '（熟练 ' + st.mastered + '）' : '';
    var text = (st.done >= st.total ? '全部完成 🎉' : '已完成 ' + st.done + ' / ' + st.total + ' ' + unit + extra) + (st.wrong ? ' · ' + st.wrong + ' 道错题' : '');
    return '<span class="course-progress"><span class="course-progress-bar" aria-hidden="true"><i style="width:' + pct + '%"></i></span><span class="course-progress-text">' + text + '</span></span>';
  }

  function collectStats() {
    return MT.navigation.courses.map(function (c) { return { c: c, st: courseStats(c) }; });
  }

  function renderWrongBanner(stats, tip) {
    var box = document.getElementById('wrong-banner');
    if (!box) return;
    if (tip && tip.mode === 'wrong') {
      box.hidden = true;
      return;
    }
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

  function renderTodayRecommend(stats) {
    var box = document.getElementById('today-recommend');
    if (!box) return null;
    var tip = MT.insights.recommend(stats);
    box.hidden = !tip;
    if (!tip) return null;
    box.dataset.course = tip.course;
    box.dataset.mode = tip.mode || 'learn';
    box.dataset.view = tip.view || '';
    box.dataset.skill = tip.skill || '';
    box.dataset.game = tip.game || '';
    box.innerHTML = '<span class="today-recommend-icon" aria-hidden="true">' + TARGET_SVG + '</span><span class="today-recommend-copy"><b>' + tip.title + '</b><small>' + tip.detail + '</small></span><span class="today-recommend-cta">' + tip.cta + ' →</span>';
    return tip;
  }

  function renderParentSummary() {
    var box = document.getElementById('parent-summary');
    if (!box || !MT.insights) return;
    var summary = MT.insights.parentSummary(collectStats());
    var act = summary.activity || { totalDays: 0, streakDays: 0 };
    var daysLine = act.totalDays ? ' · 累计练习 <b>' + act.totalDays + '</b> 天' + (act.streakDays > 1 ? '（连学 ' + act.streakDays + ' 天）' : '') : '';
    var list = summary.lines.length
      ? '<ul class="parent-summary-list">' + summary.lines.map(function (line) { return '<li>' + line + '</li>'; }).join('') + '</ul>'
      : '<p class="set-note">还没有各课明细。</p>';
    box.innerHTML = '<p class="parent-summary-stats">已开始 <b>' + summary.started + '</b> 门 · 全部完成 <b>' + summary.finished + '</b> 门 · 错题 <b>' + summary.wrongTotal + '</b> 道' + daysLine + '</p>' +
      list + '<p class="set-note">' + summary.tip + '</p>';
  }

  function renderReportModal() {
    var body = document.getElementById('report-body');
    var stat = document.getElementById('report-stat');
    if (!body || !MT.insights) return;
    var summary = MT.insights.parentSummary(collectStats());
    var act = summary.activity || { totalDays: 0, recent7Days: 0, streakDays: 0 };
    var badgesCount = Array.isArray(MT.progress && MT.progress.badges) ? MT.progress.badges.length : 0;
    if (stat) {
      stat.textContent = act.streakDays > 1
        ? '已连续坚持 ' + act.streakDays + ' 天 · 近 7 天学习 ' + act.recent7Days + ' 天'
        : '本地学习数据实时汇总，无需联网即可查看';
    }
    var listHTML = summary.courses.length
      ? '<div class="report-course-list">' + summary.courses.map(function (item) {
        var desc = item.done + '/' + item.total + ' ' + item.unit +
          (item.topic !== 'basic' && item.mastered ? '（熟练 ' + item.mastered + '）' : '') +
          (item.wrong ? ' · 错题 ' + item.wrong + ' 道' : '');
        var btnText = item.wrong ? '复习错题' : '去练习';
        var mode = item.wrong ? 'wrong' : 'practice';
        return '<div class="report-course-row"><div class="report-course-info"><b>' + item.title + '</b><small>' + desc + '</small></div>' +
          '<button type="button" class="btn btn-soft" data-report-course="' + item.id + '" data-report-mode="' + mode + '">' + btnText + ' →</button></div>';
      }).join('') + '</div>'
      : '<p class="set-note">还没有学习记录。回到知识目录挑一门课，先「学一学」再「练一练」吧。</p>';
    body.innerHTML = '<div class="report-summary-grid">' +
      '<div class="report-stat-box"><b>' + summary.started + ' / ' + MT.navigation.courses.length + '</b><span>已学课程</span></div>' +
      '<div class="report-stat-box' + (summary.wrongTotal ? ' is-alert' : '') + '"><b>' + summary.wrongTotal + '</b><span>待复习错题</span></div>' +
      '<div class="report-stat-box"><b>' + badgesCount + ' / 14</b><span>收集勋章</span></div>' +
      '<div class="report-stat-box"><b>' + act.totalDays + ' 天</b><span>累计练习</span></div>' +
      '</div>' + listHTML +
      '<div class="report-tip">' + summary.tip + '</div>' +
      '<div class="report-actions">' +
      (summary.wrongTotal ? '<button type="button" class="btn btn-main" id="btn-print-wrong-sheet">' + PRINT_SVG + '<span>打印错题巩固卷（' + summary.wrongTotal + ' 题）</span></button>' : '') +
      '<button type="button" class="btn btn-soft" id="btn-report-done">知道了</button>' +
      '</div>';
  }

  function openReportModal() {
    var modal = document.getElementById('report-modal');
    if (!modal) return;
    closeSettings();
    if (MT.badges) MT.badges.close();
    if (modal.hidden) reportFocus = document.activeElement;
    renderReportModal();
    modal.hidden = false;
    var closeBtn = document.getElementById('report-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeReportModal() {
    var modal = document.getElementById('report-modal');
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    if (reportFocus && reportFocus.isConnected) reportFocus.focus();
    reportFocus = null;
  }

  function renderCatalog() {
    var stats = [];
    ['number', 'measure'].forEach(function (group) {
      var courses = MT.navigation.courses.filter(function (c) {
        var matchDomain = (c.domain === '量与测量') === (group === 'measure');
        var matchGrade = gradeFilter === 'all' || c.grade === gradeFilter;
        return matchDomain && matchGrade;
      });
      var grid = document.getElementById(group + '-courses');
      var section = grid && grid.closest ? grid.closest('.catalog-group') : null;
      if (section) section.hidden = courses.length === 0;
      grid.innerHTML = courses.map(function (c) {
        var st = courseStats(c);
        stats.push({ c: c, st: st });
        var gradeTag = c.grade ? '<span class="course-grade">' + c.grade + '</span>' : '';
        var markHTML = COURSE_MARKS_SVG[c.id] || c.mark;
        return '<button type="button" class="course-card' + (st && st.started ? ' is-started' : '') + '" data-course="' + c.id + '"><span class="course-mark" aria-hidden="true">' + markHTML + '</span><span class="course-card-copy"><span class="course-card-head"><b>' + c.title + '</b>' + gradeTag + '</span><small>' + c.description + '</small>' + courseProgressHTML(c, st) + '</span><span class="course-arrow" aria-hidden="true">→</span></button>';
      }).join('');
    });
    if (gradeFilter !== 'all') stats = collectStats();
    document.querySelectorAll('#grade-filter [data-grade]').forEach(function (btn) {
      var on = btn.dataset.grade === gradeFilter;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', String(on));
    });
    var tip = renderTodayRecommend(stats);
    renderWrongBanner(stats, tip);
    var last = MT.navigation.parse(MT.progress.settings.lastLocation);
    var resume = document.getElementById('btn-continue');
    var sameAsTip = tip && last.page === 'course' && tip.course === last.course && tip.mode === last.mode;
    resume.hidden = last.page !== 'course' || !!sameAsTip;
    if (!resume.hidden) {
      var c = MT.navigation.course(last.course);
      var m = c.topic === 'basic' ? null : MT[c.id];
      var skill = m && m.skills.filter(function (s) { return s.id === last.skill; })[0];
      resume.innerHTML = '<span>继续上次：' + c.title + (skill ? ' · ' + skill.title : '') + '</span><span aria-hidden="true">→</span>';
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
    closeReportModal();
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
        icon.innerHTML = st.speechOn ? SPEECH_SVG_ON : SPEECH_SVG_OFF;
        txt.textContent = st.speechOn ? '朗读' : '静音';
      } else {
        sp.textContent = '朗读：' + (st.speechOn ? '开' : '关');
      }
      sp.setAttribute('aria-pressed', st.speechOn ? 'true' : 'false');
    }
    syncSegs();
    syncOp();
  }

  function closeSettings(restoreFocus) {
    var box = document.getElementById('settings');
    var backdrop = document.getElementById('settings-backdrop');
    if (backdrop) backdrop.hidden = true;
    if (box.hidden) return;
    box.hidden = true;
    document.getElementById('btn-settings').setAttribute('aria-expanded', 'false');
    if (restoreFocus) {
      var target = settingsFocus && settingsFocus.isConnected ? settingsFocus : document.getElementById('btn-settings');
      if (target && target.focus) target.focus();
    }
    settingsFocus = null;
  }

  function toggleSettings() {
    var box = document.getElementById('settings');
    var backdrop = document.getElementById('settings-backdrop');
    if (!box.hidden) {
      closeSettings(true);
      return;
    }
    settingsFocus = document.getElementById('btn-settings') || document.activeElement;
    box.hidden = false;
    if (backdrop) backdrop.hidden = false;
    document.getElementById('btn-settings').setAttribute('aria-expanded', 'true');
    renderParentSummary();
    var closeBtn = document.getElementById('settings-close');
    if (closeBtn && closeBtn.focus) closeBtn.focus();
  }

  function openRecommend(btn) {
    var route = {
      course: btn.dataset.course,
      mode: btn.dataset.mode || 'learn'
    };
    if (btn.dataset.view) route.view = btn.dataset.view;
    if (btn.dataset.skill) route.skill = btn.dataset.skill;
    if (btn.dataset.game) route.game = btn.dataset.game;
    openRoute(route);
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

    var settingsClose = document.getElementById('settings-close');
    if (settingsClose) settingsClose.addEventListener('click', function () { closeSettings(true); });

    var sBackdrop = document.getElementById('settings-backdrop');
    if (sBackdrop) sBackdrop.addEventListener('click', function () { closeSettings(true); });

    document.addEventListener('click', function () {
      if (!document.getElementById('settings').hidden) closeSettings();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeSettings(true);
    });

    var reportBtn = document.getElementById('btn-report');
    if (reportBtn) reportBtn.addEventListener('click', function () { MT.sound.play('click'); openReportModal(); });
    var openReportBtn = document.getElementById('btn-open-report');
    if (openReportBtn) openReportBtn.addEventListener('click', function () { MT.sound.play('click'); openReportModal(); });
    var reportClose = document.getElementById('report-close');
    if (reportClose) reportClose.addEventListener('click', closeReportModal);
    var reportModal = document.getElementById('report-modal');
    if (reportModal) {
      reportModal.addEventListener('click', function (e) {
        if (e.target === reportModal) { closeReportModal(); return; }
        var doneBtn = e.target.closest('#btn-report-done');
        if (doneBtn) { closeReportModal(); return; }
        var printBtn = e.target.closest('#btn-print-wrong-sheet');
        if (printBtn) { MT.sound.play('click'); closeReportModal(); MT.print.runWrongSheet(); return; }
        var jump = e.target.closest('[data-report-course]');
        if (jump) {
          var cid = jump.dataset.reportCourse;
          var md = jump.dataset.reportMode || 'practice';
          closeReportModal();
          openRoute({ course: cid, mode: md, view: 'quiz' });
        }
      });
      document.addEventListener('keydown', function (e) {
        if (reportModal.hidden) return;
        if (e.key === 'Escape') { e.preventDefault(); closeReportModal(); return; }
        if (e.key === 'Tab') {
          var nodes = Array.prototype.filter.call(reportModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'), function (el) {
            return !el.disabled && !el.hidden && el.getAttribute('aria-hidden') !== 'true';
          });
          var first = nodes[0], last = nodes[nodes.length - 1];
          if (!first) return;
          if (!reportModal.contains(document.activeElement) || (e.shiftKey ? document.activeElement === first : document.activeElement === last)) {
            e.preventDefault();
            (e.shiftKey ? last : first).focus();
          }
        }
      });
    }

    document.getElementById('btn-directory').addEventListener('click', function () { openRoute({ page: 'catalog' }); });
    document.getElementById('catalog-page').addEventListener('click', function (e) {
      var pill = e.target.closest('[data-grade]');
      if (pill) {
        MT.sound.play('click');
        gradeFilter = pill.dataset.grade || 'all';
        renderCatalog();
        return;
      }
      var btn = e.target.closest('.course-card[data-course]');
      if (btn) openRoute({ course: btn.dataset.course, mode: 'learn' });
    });
    document.getElementById('btn-continue').addEventListener('click', function () {
      openRoute(MT.navigation.parse(MT.progress.settings.lastLocation));
    });
    document.getElementById('wrong-banner').addEventListener('click', function (e) {
      openRoute({ course: e.currentTarget.dataset.course, mode: 'wrong' });
    });
    document.getElementById('today-recommend').addEventListener('click', function (e) {
      openRecommend(e.currentTarget);
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
