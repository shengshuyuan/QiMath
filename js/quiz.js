(function (MT) {
  'use strict';

  var S = {
    mode: 'levels',
    level: 1,
    round: [],
    idx: 0,
    correct: 0,
    misses: 0,
    helps: 0,
    failed: false,
    answer: '',
    locked: false,
    active: false,
    wrongMode: false,
    wrongBefore: 0,
    streak: 0,
    timer: null,
    lastOk: -1,
    lastBad: -1
  };

  var dom = {};

  /* ---------- 反馈语（避免连续重复） ---------- */

  var OK_WORDS = ['答对啦', '真棒', '太厉害了', '就是这样', '完全正确', '好厉害呀'];
  var OK_STREAK = ['连对三题，厉害', '哇，一直答对', '越答越顺了', '手速好快'];
  var BAD_WORDS = ['再想想', '差一点点', '没关系，再来一次', '换个思路'];
  var MAX_MISS = 3;
  var MAX_HELP = 2;

  function pickWord(list, lastKey) {
    var i = Math.floor(Math.random() * list.length);
    if (list.length > 1 && i === S[lastKey]) {
      i = (i + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length;
    }
    S[lastKey] = i;
    return list[i];
  }

  function haptic(type) {
    var st = MT.progress && MT.progress.settings;
    if (st && st.hapticOn === 'off') return;
    if (!('vibrate' in navigator)) return;
    try {
      if (type === 'tap') navigator.vibrate(10);
      else if (type === 'ok') navigator.vibrate([20, 30, 20]);
      else if (type === 'bad') navigator.vibrate([50, 40, 50]);
    } catch (e) {}
  }

  /* ---------- 小图标（颜色交给 CSS 变量，跟随主题） ---------- */

  function iconStar(filled) {
    return '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path class="' +
      (filled ? 'star-on' : 'star-off') +
      '" d="M12 2.5l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.4l-6 3.2 1.3-6.6L2.4 9.4l6.7-.8z"/></svg>';
  }

  function iconLock() {
    return '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">' +
      '<path class="lock-shackle" d="M7 10V8a5 5 0 0110 0v2" stroke-width="2"/>' +
      '<rect class="lock-body" x="5" y="10" width="14" height="10" rx="2.5"/></svg>';
  }

  function iconCheck() {
    return '<svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true">' +
      '<circle class="check-stroke" cx="20" cy="20" r="17" fill="none" stroke-width="3"/>' +
      '<path class="check-path" d="M11 20.5l6 6 12-13" fill="none" stroke-width="3.5" ' +
      'stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function sub() { return MT.op.current(); }

  function bags() { return sub().bag(MT.progress); }

  function starsRow(n) {
    var lv = bags().levels[n];
    var out = '';
    for (var i = 1; i <= 3; i++) out += iconStar(lv.bestStars >= i);
    return out;
  }

  function clearTimer() {
    if (S.timer) {
      clearTimeout(S.timer);
      S.timer = null;
    }
  }

  function later(fn, ms) {
    clearTimer();
    S.timer = setTimeout(fn, ms);
  }

  /* ---------- 关卡 ---------- */

  function buildLevelBar() {
    var bar = dom.levelBar;
    bar.innerHTML = '';
    var lvs = bags().levels;
    for (var n = 1; n <= 9; n++) {
      var lv = lvs[n];
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'lv' + (lv.unlocked ? '' : ' is-locked') + (lv.passed ? ' is-passed' : '');
      b.dataset.level = n;
      b.setAttribute('aria-label', sub().levelTitle(n) + (lv.unlocked ? '' : '，未解锁'));
      b.innerHTML = '<span class="lv-n">' + n + '</span>' +
        '<span class="lv-star">' + (lv.unlocked ? starsRow(n) : iconLock()) + '</span>';
      bar.appendChild(b);
    }
  }

  /* ---------- 出题 ---------- */

  function spreadDupes(list) {
    var r = MT.core.shuffle(list);
    for (var j = 1; j < r.length; j++) {
      if (r[j] === r[j - 1]) {
        for (var m = j + 1; m < r.length; m++) {
          if (r[m] !== r[j - 1]) {
            var t = r[j]; r[j] = r[m]; r[m] = t;
            break;
          }
        }
      }
    }
    return r;
  }

  // 这一行全部题目，再加最多 4 道本关范围内错过或还没掌握的旧题。
  function planRound(n, progress) {
    var mod = sub();
    var b = mod.bag(progress);
    var own = mod.row(n);
    var pool = mod.pool(n);
    var seen = {};
    var i;
    for (i = 0; i < own.length; i++) seen[own[i]] = true;
    var review = [];
    for (i = 0; i < pool.length; i++) {
      var k = pool[i];
      if (seen[k]) continue;
      if (b.wrong[k] || b.needs[k] || !b.mastered[k]) review.push(k);
    }
    review = MT.core.shuffle(review);
    review.sort(function (a, c) { return mod.score(c, b) - mod.score(a, b); });
    return spreadDupes(own.concat(review.slice(0, 4)));
  }

  function starsFor(misses, helps) {
    if (misses >= MAX_MISS) return 0;
    if (misses === 0 && helps === 0) return 3;
    if (misses <= 1 && helps <= 1) return 2;
    return 1;
  }

  /* ---------- 显示 ---------- */

  function renderDots() {
    var box = dom.qDots;
    box.innerHTML = '';
    for (var i = 0; i < S.round.length; i++) {
      var d = document.createElement('i');
      d.className = 'qdot' + (i < S.idx ? ' is-done' : (i === S.idx ? ' is-now' : ''));
      box.appendChild(d);
    }
  }

  function showQuestion() {
    var k = S.round[S.idx];
    S.answer = '';
    S.locked = false;
    S.hinted = false;
    dom.qCard.classList.remove('is-right', 'is-wrong');
    var fact = sub().fact(k);
    dom.qTitle.textContent = S.wrongMode ? '错题本' : sub().levelTitle(S.level);
    dom.qCount.textContent = (S.idx + 1) + ' / ' + S.round.length;
    dom.qAsk.innerHTML = fact.askHTML;
    dom.qTip.textContent = fact.tip;
    dom.qInput.textContent = '';
    dom.qInput.className = 'q-input is-empty';
    dom.qFb.className = 'q-fb';
    dom.qFb.innerHTML = '';
    dom.qHint.hidden = true;
    dom.qHint.innerHTML = '';
    dom.qActions.innerHTML = '';
    renderDots();
    renderBudget();
    renderHelpButton();
  }

  function renderBudget() {
    if (!dom.qBudget) return;
    var left = MAX_MISS - S.misses;
    if (left < 0) left = 0;
    var hearts = '';
    for (var h = 0; h < MAX_MISS; h++) {
      hearts += (h < left ? '❤️' : '🤍');
    }
    dom.qBudget.innerHTML = '<span class="q-lives" title="挑战机会">' + hearts + '</span><span class="q-sep"> · </span><span class="q-help-left">💡 求助 ' + (MAX_HELP - S.helps) + ' 次</span>';
    dom.qBudget.classList.toggle('is-low', left <= 1);
  }

  function renderHelpButton() {
    var b = dom.btnHelp;
    if (!b) return;
    var answeredRight = S.locked && dom.qCard && dom.qCard.classList.contains('is-right');
    if (!S.active || S.failed || answeredRight) {
      b.disabled = true;
      b.textContent = '求助解答';
      return;
    }
    if (S.hinted) {
      b.disabled = true;
      b.textContent = '本题已求助';
      return;
    }
    if (S.helps >= MAX_HELP) {
      b.disabled = true;
      b.textContent = '求助已用完';
      return;
    }
    b.disabled = false;
    b.textContent = '求助解答';
  }

  function renderInput() {
    dom.qInput.textContent = S.answer;
    dom.qInput.classList.toggle('is-empty', !S.answer);
    var okBtn = dom.keypad && dom.keypad.querySelector('.key-ok');
    if (okBtn) okBtn.classList.toggle('is-ready', !!S.answer);
  }

  /* ---------- 判定 ---------- */

  function onRight(k) {
    var p = MT.progress;
    var st = p.settings;
    p.stats.totalCorrect++;
    var book = bags();
    if (S.hinted) {
      if (!book.mastered[k]) book.needs[k] = true;
      if (book.wrong[k]) book.wrong[k].rightStreak = 0;
    } else if (book.wrong[k]) {
      book.wrong[k].rightStreak = (book.wrong[k].rightStreak || 0) + 1;
      if (book.wrong[k].rightStreak >= 2) {
        delete book.wrong[k];
        delete book.needs[k];
        book.mastered[k] = true;
      }
    } else {
      delete book.needs[k];
      book.mastered[k] = true;
    }
    S.correct++;
    S.streak++;
    S.locked = true;
    if (S.streak >= 3 && MT.badges) MT.badges.unlock('streak_master');

    var word = (S.streak >= 3 && S.streak % 3 === 0)
      ? pickWord(OK_STREAK, 'lastOk')
      : pickWord(OK_WORDS, 'lastOk');

    dom.qCard.classList.add('is-right');
    dom.qFb.className = 'q-fb is-ok';
    dom.qFb.innerHTML = iconCheck() + '<span>' + word + '</span>';
    dom.qInput.className = 'q-input is-ok';
    MT.storage.save();
    MT.bus.emit('progress:change', { key: k });

    haptic('ok');
    MT.sound.play('right');
    MT.speech.play(word, 'ok');

    var last = S.idx >= S.round.length - 1;
    dom.qActions.innerHTML = '';
    renderHelpButton();
    if (last) {
      later(finish, 1100);
    } else if (st.autoNext === 'on') {
      later(next, 1500);
    } else {
      addAction('下一题', next, true);
    }
  }

  function onWrong(k) {
    var p = MT.progress;
    p.stats.totalWrong++;
    var book = bags();
    var prev = book.wrong[k];
    book.wrong[k] = {
      wrongCount: (prev ? prev.wrongCount : 0) + 1,
      rightStreak: 0,
      lastAt: Date.now(),
      fromLevel: S.level
    };
    delete book.mastered[k];
    book.needs[k] = true;
    S.misses++;
    S.streak = 0;
    MT.storage.save();
    MT.bus.emit('progress:change', { key: k });

    S.locked = true;
    var failedNow = S.misses >= MAX_MISS;
    var word = failedNow
      ? (S.wrongMode ? '这轮先停一下' : '这关先停一下')
      : pickWord(BAD_WORDS, 'lastBad');

    dom.qCard.classList.remove('is-right');
    dom.qCard.classList.add('is-wrong');
    dom.qFb.className = 'q-fb is-bad';
    dom.qFb.textContent = word;
    dom.qInput.className = 'q-input is-bad';

    haptic('bad');
    MT.sound.play('wrong');
    if (!failedNow) MT.speech.play(word, 'bad');

    renderBudget();
    dom.qActions.innerHTML = '';
    if (failedNow) {
      S.failed = true;
      later(finish, 700);
      renderHelpButton();
      return;
    }
    addAction('再试一次', retry, true);
    renderHelpButton();
  }

  function addAction(text, fn, primary) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn' + (primary ? ' btn-main' : '');
    b.textContent = text;
    b.addEventListener('click', fn);
    dom.qActions.appendChild(b);
  }

  function submit() {
    if (S.locked || !S.active) return;
    if (!S.answer) {
      dom.qInput.classList.add('is-nudge');
      setTimeout(function () { dom.qInput.classList.remove('is-nudge'); }, 400);
      return;
    }
    var k = S.round[S.idx];
    if (parseInt(S.answer, 10) === sub().fact(k).answer) onRight(k);
    else onWrong(k);
  }

  function useHelp() {
    if (!S.active || S.failed || S.hinted || S.helps >= MAX_HELP) return;
    if (S.locked && dom.qCard.classList.contains('is-right')) return;
    var k = S.round[S.idx];
    S.helps++;
    S.hinted = true;
    S.locked = false;
    S.answer = '';
    dom.qHint.hidden = false;
    var fact = sub().fact(k);
    MT.visuals.render(dom.qHint, fact.helpViz.type, fact.helpViz.opts);
    var tip = document.createElement('div');
    tip.className = 'hint-cap';
    tip.textContent = fact.helpCaption;
    dom.qHint.appendChild(tip);
    MT.speech.warmup();
    MT.speech.play(fact.speak, fact.scene);
    dom.qInput.className = 'q-input is-empty';
    dom.qInput.textContent = '';
    renderInput();
    renderBudget();
    renderHelpButton();
  }

  function retry() {
    if (!S.active || S.failed) return;
    S.locked = false;
    S.answer = '';
    dom.qCard.classList.remove('is-wrong');
    dom.qFb.className = 'q-fb';
    dom.qFb.innerHTML = '';
    dom.qInput.className = 'q-input is-empty';
    dom.qInput.textContent = '';
    dom.qActions.innerHTML = '';
    if (!S.hinted) {
      dom.qHint.hidden = true;
      dom.qHint.innerHTML = '';
    }
    renderHelpButton();
  }

  function next() {
    if (!S.active) return;
    S.idx++;
    if (S.idx >= S.round.length) { finish(); return; }
    showQuestion();
  }

  function finish() {
    clearTimer();
    S.active = false;
    MT.bus.emit('quiz:end', {});
    dom.quizPlay.hidden = true;
    var box = dom.quizResult;
    box.hidden = false;
    box.innerHTML = '';

    var len = S.round.length;
    var p = MT.progress;

    var summary = '答错 ' + S.misses + ' 次 · 求助 ' + S.helps + ' 次';

    if (S.wrongMode) {
      if (S.failed) {
        box.innerHTML = '<div class="res-title">这轮先停一下</div>' +
          '<div class="res-line">' + summary + '</div>' +
          '<div class="res-line res-sub">3 次挑战机会用完啦，这轮先停。</div>';
        addResAction('回到错题本', function () { box.hidden = true; showWrongList(); });
        return;
      }
      var wrMap = bags().wrong;
      var now = Object.keys(wrMap).length;
      var cut = S.wrongBefore - now;
      box.innerHTML = '<div class="res-title">练完啦！太棒了！</div>' +
        '<div class="res-line">答对 ' + S.correct + ' / ' + len + '</div>' +
        '<div class="res-line">' + summary + '</div>' +
        '<div class="res-line">消灭了 ' + (cut > 0 ? cut : 0) + ' 道错题</div>';
      addResAction('回到错题本', function () { box.hidden = true; showWrongList(); });
      if (cut > 0) {
        MT.sound.play('win');
        if (MT.badges) MT.badges.unlock('mistake_slayer');
        if (MT.confetti) MT.confetti.burst();
      }
      return;
    }

    var n = S.level;
    var lvs = bags().levels;
    var lv = lvs[n];
    lv.roundsPlayed++;

    if (S.failed) {
      MT.storage.save();
      MT.bus.emit('progress:change', {});
      box.innerHTML = '<div class="res-title">🌈 别灰心，再试一次！</div>' +
        '<div class="res-line">' + summary + '</div>' +
        '<div class="res-line res-sub">小算式有点调皮，多练一次就能攻克它！</div>';
      addResAction('再试一次 ↺', function () { box.hidden = true; startLevel(n); });
      addResAction('换一关', function () { box.hidden = true; buildLevelBar(); });
      return;
    }

    var stars = starsFor(S.misses, S.helps);
    lv.passed = true;
    if (stars > lv.bestStars) lv.bestStars = stars;
    if (n < 9) lvs[n + 1].unlocked = true;
    MT.storage.save();
    MT.bus.emit('progress:change', {});

    var starHtml = '';
    for (var i = 1; i <= 3; i++) {
      starHtml += '<span class="big-star" style="--i:' + i + '">' + iconStar(i <= stars) + '</span>';
    }

    box.innerHTML = '<div class="res-title">🎉 第 ' + n + ' 关通过！</div>' +
      '<div class="res-stars">' + starHtml + '</div>' +
      '<div class="res-line">答对 ' + S.correct + ' / ' + len + '</div>' +
      '<div class="res-line">' + summary + '</div>' +
      '<div class="res-line res-sub">' +
      (n < 9 ? '第 ' + (n + 1) + ' 关已解锁' : '🏆 恭喜通关全部 9 关！太厉害了！') +
      '</div>';

    addResAction('再来一轮', function () { box.hidden = true; startLevel(n); });
    if (n < 9) addResAction('下一关', function () { box.hidden = true; startLevel(n + 1); });
    addResAction('选关', function () { box.hidden = true; buildLevelBar(); });

    MT.sound.play('win');
    MT.speech.play('第' + n + '关通过', 'ok');
    if (MT.confetti) MT.confetti.burst();
    if (n === 9 && MT.badges) MT.badges.unlock('level_champion');
    confetti(box);
  }

  function addResAction(text, fn) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn';
    b.textContent = text;
    b.addEventListener('click', fn);
    var row = dom.quizResult.querySelector('.res-actions');
    if (!row) {
      row = document.createElement('div');
      row.className = 'res-actions';
      dom.quizResult.appendChild(row);
    }
    row.appendChild(b);
  }

  function confetti(box) {
    if (!MT.visuals.motion()) return;
    var wrap = document.createElement('div');
    wrap.className = 'confetti';
    for (var i = 0; i < 12; i++) {
      var s = document.createElement('i');
      s.style.setProperty('--dx', (Math.random() * 160 - 80).toFixed(0) + 'px');
      s.style.setProperty('--dy', (60 + Math.random() * 80).toFixed(0) + 'px');
      s.style.animationDelay = (i * 40) + 'ms';
      wrap.appendChild(s);
    }
    box.appendChild(wrap);
  }

  /* ---------- 启动 ---------- */

  function resetRound() {
    clearTimer();
    S.idx = 0;
    S.correct = 0;
    S.misses = 0;
    S.helps = 0;
    S.failed = false;
    S.streak = 0;
    S.active = true;
    dom.quizResult.hidden = true;
    dom.quizPlay.hidden = false;
  }

  function startLevel(n) {
    var lv = bags().levels[n];
    if (!lv || !lv.unlocked) return;
    S.level = n;
    S.wrongMode = false;
    S.round = planRound(n, MT.progress);
    resetRound();
    showQuestion();
  }

  function startWrong() {
    var wrMap = bags().wrong;
    var keys = Object.keys(wrMap);
    if (!keys.length) return;
    S.wrongMode = true;
    S.wrongBefore = keys.length;
    keys.sort(function (a, b) {
      return (wrMap[b].wrongCount || 0) - (wrMap[a].wrongCount || 0);
    });
    S.round = spreadDupes(keys.slice(0, 10));
    resetRound();
    showQuestion();
  }

  /* ---------- 错题本 ---------- */

  function showWrongList() {
    var list = dom.wrongList;
    var wrMap = bags().wrong;
    var keys = Object.keys(wrMap);
    keys.sort(function (x, y) {
      return (wrMap[y].wrongCount || 0) - (wrMap[x].wrongCount || 0);
    });
    dom.wrongStat.textContent = keys.length
      ? ('共 ' + keys.length + ' 个，错得多的排在前面')
      : '还没有错题，真棒';
    dom.btnWrong.hidden = keys.length === 0;
    list.innerHTML = '';
    for (var i = 0; i < keys.length; i++) {
      (function (k) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'wrong-item';
        var item = sub().fact(k);
        b.innerHTML = '<span class="wi-eq">' + item.listHTML + '</span>' +
          '<span class="wi-count">错 ' + wrMap[k].wrongCount + ' 次</span>';
        b.addEventListener('click', function () {
          var box = dom.wrongDetail;
          box.hidden = false;
          box.innerHTML = '';
          var type = 'array';
          var seg = document.createElement('div');
          seg.className = 'seg seg-viz';
          var views = ['array', 'groups', 'numberline', 'area'];
          for (var vi = 0; vi < views.length; vi++) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'seg-btn' + (views[vi] === type ? ' is-on' : '');
            btn.dataset.viz = views[vi];
            btn.textContent = MT.visuals.label[views[vi]];
            seg.appendChild(btn);
          }
          box.appendChild(seg);
          var viz = document.createElement('div');
          viz.className = 'detail-viz';
          box.appendChild(viz);
          var draw = function (t) {
            var view = sub().fact(k).viz(t, true);
            MT.visuals.render(viz, view.type, view.opts);
          };
          seg.addEventListener('click', function (e) {
            var tg = e.target;
            if (!tg || !tg.dataset || !tg.dataset.viz) return;
            var kids = seg.children;
            for (var q = 0; q < kids.length; q++) {
              kids[q].classList.toggle('is-on', kids[q].dataset.viz === tg.dataset.viz);
            }
            MT.sound.play('click');
            draw(tg.dataset.viz);
          });
          draw(type);
          MT.speech.warmup();
          MT.sound.play('click');
          var heard = sub().fact(k);
          MT.speech.play(heard.speak, heard.scene);
        });
        list.appendChild(b);
      })(keys[i]);
    }
    if (!keys.length) dom.wrongDetail.hidden = true;
  }

  /* ---------- 键盘 ---------- */

  function buildKeypad() {
    var pad = dom.keypad;
    var keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'del', '0', 'ok'];
    var label = { del: '删除', ok: '确定' };
    pad.innerHTML = '';
    for (var i = 0; i < keys.length; i++) {
      (function (k) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'key' + (k === 'ok' ? ' key-ok' : (k === 'del' ? ' key-del' : ''));
        b.dataset.k = k;
        b.textContent = label[k] || k;
        b.addEventListener('click', function () {
          if (!S.active) return;
          haptic('tap');
          if (k === 'ok') { submit(); return; }
          if (k === 'del') {
            if (!S.locked) { S.answer = S.answer.slice(0, -1); renderInput(); }
            return;
          }
          if (S.locked || S.answer.length >= 2) return;
          S.answer += k;
          renderInput();
        });
        pad.appendChild(b);
      })(keys[i]);
    }
  }

  function resetOpen() {
    if (!dom.resetModal) return;
    dom.resetModal.hidden = false;
    if (dom.resetCancel && dom.resetCancel.focus) dom.resetCancel.focus();
  }

  function resetClose() {
    if (!dom.resetModal) return;
    dom.resetModal.hidden = true;
    if (dom.btnReset && dom.btnReset.focus) dom.btnReset.focus();
  }

  function resetLevels() {
    MT.speech.stop();
    sub().resetLevels(MT.progress);
    MT.storage.save();
    MT.bus.emit('progress:change', {});
    resetClose();
    setMode('levels');
  }

  function onKey(e) {
    if (dom.resetModal && !dom.resetModal.hidden) {
      if (e.key === 'Escape') resetClose();
      return;
    }
    if (!S.active || !dom.panel || dom.panel.hidden) return;
    if (!dom.quizPlay || dom.quizPlay.hidden) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key;
    if (k >= '0' && k <= '9') {
      if (S.locked || S.answer.length >= 2) return;
      haptic('tap');
      S.answer += k;
      renderInput();
    } else if (k === 'Backspace') {
      if (!S.locked) {
        haptic('tap');
        S.answer = S.answer.slice(0, -1);
        renderInput();
      }
    } else if (k === 'Enter') {
      e.preventDefault();
      haptic('tap');
      submit();
    }
  }

  /* ---------- 模式切换 ---------- */

  function setMode(m) {
    S.mode = m;
    var kids = dom.modeSeg.children;
    for (var i = 0; i < kids.length; i++) {
      kids[i].classList.toggle('is-on', kids[i].dataset.mode === m);
      kids[i].setAttribute('aria-pressed', kids[i].dataset.mode === m ? 'true' : 'false');
    }
    var isWrong = m === 'wrong';
    dom.levelsBox.hidden = isWrong;
    dom.wrongBox.hidden = !isWrong;
    if (isWrong) {
      MT.quiz.stop();
      showWrongList();
    } else {
      MT.quiz.stop();
      buildLevelBar();
    }
  }

  MT.quiz = {
    init: function () {
      dom.panel = document.getElementById('panel-quiz');
      dom.modeSeg = document.getElementById('quiz-mode');
      dom.levelsBox = document.getElementById('quiz-levels');
      dom.wrongBox = document.getElementById('quiz-wrong');
      dom.levelBar = document.getElementById('level-bar');
      dom.quizPlay = document.getElementById('quiz-play');
      dom.quizResult = document.getElementById('quiz-result');
      dom.qCard = document.getElementById('qcard');
      dom.qTitle = document.getElementById('q-title');
      dom.qCount = document.getElementById('q-count');
      dom.qBudget = document.getElementById('q-budget');
      dom.btnHelp = document.getElementById('btn-quiz-help');
      dom.qDots = document.getElementById('q-dots');
      dom.qAsk = document.getElementById('q-ask');
      dom.qTip = document.getElementById('q-tip');
      dom.qInput = document.getElementById('q-input');
      dom.qFb = document.getElementById('q-fb');
      dom.qHint = document.getElementById('q-hint');
      dom.qActions = document.getElementById('q-actions');
      dom.keypad = document.getElementById('keypad');
      dom.wrongList = document.getElementById('wrong-list');
      dom.wrongDetail = document.getElementById('wrong-detail');
      dom.wrongStat = document.getElementById('wrong-stat');
      dom.btnWrong = document.getElementById('btn-practice-wrong');
      dom.btnReset = document.getElementById('btn-quiz-reset');
      dom.resetModal = document.getElementById('quiz-reset-modal');
      dom.resetCancel = document.getElementById('quiz-reset-cancel');
      dom.resetOk = document.getElementById('quiz-reset-ok');

      buildKeypad();

      if (dom.btnHelp) {
        dom.btnHelp.addEventListener('click', function () {
          MT.sound.play('click');
          useHelp();
        });
      }

      dom.modeSeg.addEventListener('click', function (e) {
        var t = e.target;
        if (!t || !t.dataset || !t.dataset.mode) return;
        MT.speech.warmup();
        MT.sound.play('click');
        setMode(t.dataset.mode);
      });

      dom.levelBar.addEventListener('click', function (e) {
        var t = e.target.closest ? e.target.closest('.lv') : null;
        if (!t) return;
        var n = parseInt(t.dataset.level, 10);
        var lv = bags().levels[n];
        if (!lv.unlocked) {
          dom.levelBar.classList.remove('is-nudge');
          void dom.levelBar.offsetWidth;
          dom.levelBar.classList.add('is-nudge');
          setTimeout(function () { dom.levelBar.classList.remove('is-nudge'); }, 420);
          return;
        }
        MT.speech.warmup();
        MT.sound.play('click');
        startLevel(n);
      });

      dom.btnWrong.addEventListener('click', function () {
        MT.speech.warmup();
        MT.sound.play('click');
        startWrong();
      });

      if (dom.btnReset) {
        dom.btnReset.addEventListener('click', function () {
          MT.sound.play('click');
          resetOpen();
        });
      }
      if (dom.resetCancel) dom.resetCancel.addEventListener('click', resetClose);
      if (dom.resetOk) {
        dom.resetOk.addEventListener('click', function () {
          MT.sound.play('click');
          resetLevels();
        });
      }
      if (dom.resetModal) {
        dom.resetModal.addEventListener('click', function (e) {
          if (e.target === dom.resetModal) resetClose();
        });
      }

      document.addEventListener('keydown', onKey);

      MT.bus.on('progress:change', function () {
        buildLevelBar();
        if (S.mode === 'wrong' && !S.active) showWrongList();
      });

      buildLevelBar();
    },

    refresh: function () {
      buildLevelBar();
      if (S.mode === 'wrong') showWrongList();
    },

    stop: function () {
      clearTimer();
      S.active = false;
      if (dom.quizPlay) dom.quizPlay.hidden = true;
      if (dom.quizResult) dom.quizResult.hidden = true;
    },

    isActive: function () {
      return !!S.active;
    },

    planRound: planRound,
    starsFor: starsFor
  };
})(window.MT = window.MT || {});
