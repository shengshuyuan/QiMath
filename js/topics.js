(function (MT) {
  'use strict';

  // 知识主题共用学习/练习流程；基础运算仍由 MT.op 与原有页面负责。
  var model = null, skill = null, mode = 'learn', session = null, demoStep = 0, currentSubGame = null;
  var panel, work;

  function esc(value) {
    return String(value === undefined ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function button(action, text, cls, extra) {
    return '<button type="button" class="btn ' + (cls || '') + '" data-topic-action="' + action + '"' + (extra || '') + '>' + esc(text) + '</button>';
  }

  function bag() {
    var all = MT.progress.topics || (MT.progress.topics = {});
    if (!all[model.id]) all[model.id] = { skills: {}, wrong: {}, range: 20, lastSkill: model.skills[0].id };
    return all[model.id];
  }

  function skillById(id) {
    return model.skills.filter(function (s) { return s.id === id; })[0];
  }

  function save() { MT.storage.save(); }
  function focus(selector) {
    var node = work.querySelector(selector || 'h3');
    if (node) {
      var target = !selector && node.closest ? node.closest('.topic-card') || node : node;
      if (target.scrollIntoView) target.scrollIntoView({ block: 'nearest' });
      node.focus({ preventScroll: true });
    }
  }
  function say(text) { MT.speech.play(text, 'calc'); }

  function syncNavigation() {
    var b = bag();
    panel.querySelectorAll('[data-skill]').forEach(function (btn) {
      var on = btn.dataset.skill === skill.id;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', String(on));
      var s = b.skills[btn.dataset.skill];
      btn.querySelector('small').textContent = s ? '独立答对 ' + s.clean + ' 题' : '还没开始练习';
    });
    panel.querySelectorAll('[data-topic-range]').forEach(function (btn) {
      var on = Number(btn.dataset.topicRange) === b.range;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', String(on));
    });
    var label = panel.querySelector('#topic-current-skill');
    if (label) label.textContent = skill.title;
    panel.classList.toggle('is-practicing', !!((session && !session.done) || currentSubGame));
    panel.classList.toggle('is-wrong', mode === 'wrong');
    if (MT.bus) MT.bus.emit('topic:navigate', { mode: mode, skill: skill.id, game: currentSubGame });
  }

  function pickerForScreen() {
    var picker = panel.querySelector('.topic-skill-picker');
    if (picker) picker.open = !window.matchMedia || window.matchMedia('(min-width: 721px)').matches;
  }

  function renderShell() {
    panel.innerHTML = '<div class="topic-layout"><details class="topic-skill-picker"><summary><span>知识点目录</span><b id="topic-current-skill"></b><span class="picker-indicator" aria-hidden="true">⌄</span></summary><div class="topic-skills" role="group" aria-label="知识点">' + model.skills.map(function (s, index) {
      return '<button type="button" class="topic-skill" data-skill="' + esc(s.id) + '"><span class="topic-skill-num">' + (index + 1) + '</span><span><b>' + esc(s.title) + '</b><small></small></span></button>';
    }).join('') + '</div></details><div class="topic-content"><div id="topic-work"></div></div></div>';
    work = document.getElementById('topic-work');
    pickerForScreen();
    syncNavigation();
  }

  function launchGame(gameId) {
    if (!MT.moneyGames) return;
    currentSubGame = gameId;
    panel.classList.toggle('is-practicing', true);
    if (MT.bus) MT.bus.emit('topic:navigate', { mode: mode, skill: skill.id, game: gameId });
    if (gameId === 'combo') {
      MT.moneyGames.startCombo(work, function () {
        currentSubGame = null;
        renderPracticeIntro();
      });
    } else if (gameId === 'cashier') {
      MT.moneyGames.startCashier(work, function () {
        currentSubGame = null;
        renderPracticeIntro();
      });
    }
  }

  function roundSize() { return skill.practiceCount || 6; }

  function nextSkill() { return model.skills[model.skills.indexOf(skill) + 1]; }

  function renderPracticeIntro() {
    currentSubGame = null;
    var ranged = (model.id === 'mixed' && skill.id !== 'muldiv') || model.id === 'money';
    work.innerHTML = '<article class="topic-card"><p class="topic-eyebrow">每轮 ' + roundSize() + ' 题 · 按自己的节奏完成</p><h3 tabindex="-1">' + esc(skill.title) + '练习</h3>' +
      (ranged ? '<fieldset class="practice-range"><legend>这次练习的范围</legend><div class="seg"><button type="button" class="seg-btn" data-topic-range="20">' + (model.id === 'money' ? '20 元以内 · 基础' : '20 以内 · 起步') + '</button><button type="button" class="seg-btn" data-topic-range="100">' + (model.id === 'money' ? '100 元以内 · 进阶' : '100 以内 · 进阶') + '</button></div></fieldset>' : '<p class="topic-note">' + (model.id === 'mixed' ? '表内乘除，所有步骤都是整数结果。' : model.id === 'angle' ? '找顶点、看开口，不用边的长短判断角的大小。' : model.id === 'time' ? '看清钟面或时间文字，分清时与分。' : '看清题目里的单位，再开始作答。') + '</p>') +
      '<p class="topic-note">' + (model.id === 'mixed' ? '先判断运算顺序，再一步一步计算。' : model.id === 'money' ? '看清钱币的面值与单位（元、角、分），选择或输入答案。' : model.id === 'angle' ? '观察角的顶点、两条边和开口，选择或输入答案。' : model.id === 'time' ? '先看时针，再看分针；计算时分清时刻和经过时间。选择或输入答案。' : '看清图示和单位，选择或输入答案。') + '需要帮助可以看提示，看过提示的题会加入错题复习。</p>' +
      '<div class="topic-actions">' + button('start', '开始 ' + roundSize() + ' 题练习 →', 'btn-main') + '</div>' +
      (model.id === 'money' ? '<div class="topic-game-entries"><p class="topic-eyebrow">趣味游戏挑战 · 玩中学应用</p><div class="topic-game-row"><div class="topic-game-item"><div><b>🎮 凑钱小能手</b><small>用不同面额凑出目标金额，练习换算与付款</small></div><button type="button" class="btn btn-soft" data-topic-action="play-game" data-game="combo">去挑战 →</button></div><div class="topic-game-item"><div><b>🛒 小小收银员</b><small>计算商品总价，判断钱够不够与找零计算</small></div><button type="button" class="btn btn-soft" data-topic-action="play-game" data-game="cashier">去挑战 →</button></div></div></div>' : '') +
      '</article>';
    syncNavigation();
  }

  function renderLearn() {
    var example = skill.example;
    work.innerHTML = '<article class="topic-card"><div class="topic-card-head"><div><h3 tabindex="-1">' + esc(skill.title) + '</h3><p>' + esc(skill.description) + '</p></div>' +
      button('read-lesson', '🔊 听方法', 'btn-soft') + '</div><div class="topic-lesson">' + skill.lessonHTML + '</div>' +
      (example ? '<div class="topic-demo"><p class="topic-eyebrow">跟着例题走两步</p><div class="topic-expression">' + esc(example.expression) + '</div>' +
        '<div class="topic-demo-steps" aria-live="polite">' + example.steps.slice(0, demoStep).map(function (s, i) {
          return '<p><span class="topic-step-label">第 ' + (i + 1) + ' 步</span>' + esc(s) + '</p>';
        }).join('') + '</div>' + (demoStep < example.steps.length ? button('demo-next', demoStep ? '看第二步' : '先看第一步', 'btn-soft') : '<p class="topic-rule">' + esc(example.rule) + '</p>') + '</div>' : '') +
      '<div class="topic-actions">' + button('start', '现在自己试一试 →', 'btn-main') + '</div></article>';
  }

  function makeItem(skillId, range, seed) {
    return { skill: skillId, range: range, seed: seed, q: model.generate(skillId, range, seed) };
  }

  function randomSeed() { return Math.floor(Math.random() * 4294967296) >>> 0; }

  function reviewItems() {
    var b = bag();
    return Object.keys(b.wrong).map(function (key) {
      var w = b.wrong[key];
      if (!skillById(w.skill)) return null;
      var item = makeItem(w.skill, w.range, w.seed);
      // 从合法生成器重建内容，不显示本地存储中的任意文案或图形。
      if (item.q.id !== key) return null;
      return item;
    }).filter(Boolean);
  }

  function start(items) {
    MT.speech.stop();
    mode = items ? 'wrong' : 'practice';
    var questions = items;
    if (!questions) {
      questions = [];
      var used = {}, retries = 0;
      while (questions.length < roundSize()) {
        var item = makeItem(skill.id, bag().range, randomSeed());
        var key = item.q.expression || item.q.prompt + ':' + JSON.stringify(item.q.data || {});
        // 认知题的题库较小，重试后允许重复，但不阻塞出题。
        if (used[key] && retries++ < 40) continue;
        used[key] = true;
        questions.push(item);
      }
    }
    session = { questions: questions, index: 0, correct: 0, clean: 0, done: false };
    resetQuestion();
    syncNavigation();
    renderQuestion();
    focus();
  }

  function resetQuestion() {
    var q = session.questions[session.index].q;
    session.phase = q.kind === 'steps' ? 'order' : 'answer';
    session.hadWrong = false;
    session.helped = false;
    session.feedback = '';
    session.good = false;
    session.revealed = false;
    session.hintShown = false;
  }

  function currentItem() { return session.questions[session.index]; }

  function keyHTML() {
    return '<div class="topic-keypad" role="group" aria-label="数字键盘">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, '清空', 0, '退格'].map(function (key) {
      return button('key', key, 'btn-soft', ' data-key="' + key + '" aria-label="' + (key === '退格' ? '删除最后一位' : key) + '"');
    }).join('') + '</div>';
  }

  function renderQuestion() {
    var item = currentItem(), q = item.q;
    var isDone = session.phase === 'complete';
    var order = session.phase === 'order';
    var step = q.kind === 'steps';
    var phaseLabel = step ? (order ? '第 1 步 · 判断先算哪一部分' : session.phase === 'intermediate' ? '第 2 步 · 算出中间结果' : '第 3 步 · 算出最后结果') : '想一想，再作答';
    var choices = order ? q.firstChoices : q.choices;
    var numeric = !order && q.kind !== 'choice' && !isDone;
    work.innerHTML = '<article class="topic-card topic-question"><div class="topic-round-meta"><span>' + esc(skillById(item.skill).title) + '</span><span>第 ' + (session.index + 1) + ' / ' + session.questions.length + ' 题</span></div>' +
      '<progress class="topic-progress" aria-label="本轮练习进度" max="' + session.questions.length + '" value="' + session.index + '"></progress>' +
      '<h3 tabindex="-1">' + esc(isDone ? '这道题完成啦' : (step ? phaseLabel : q.prompt)) + '</h3>' +
      (step ? '<p class="topic-expression">' + esc(q.expression) + (isDone ? ' = ' + q.answer : '') + '</p>' : '') +
      (q.visualHTML || '') +
      (step && session.phase === 'intermediate' ? '<p class="topic-prompt">先算：<b>' + esc(q.firstChoices[q.correctFirst]) + ' = ?</b></p>' : '') +
      (step && session.phase === 'answer' ? '<p class="topic-prompt">中间结果是 ' + q.intermediate + '，现在算：<b>' + esc(q.reduced) + ' = ?</b></p>' : '') +
      (!isDone && choices && !numeric ? '<div class="topic-choices" role="group" aria-label="' + (order ? '先算的部分' : '答案选项') + '">' + choices.map(function (c, i) {
        return button('choice', c, '', ' data-choice="' + i + '"');
      }).join('') + '</div>' : '') +
      (numeric ? '<form id="topic-answer-form" class="topic-answer-form"><label for="topic-answer">' + (session.phase === 'intermediate' ? '中间结果' : '你的答案') + '</label><div class="topic-answer-row"><input id="topic-answer" name="answer" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" aria-describedby="topic-feedback" required><span class="topic-unit">' + esc(q.unit || '') + '</span><button type="submit" class="btn btn-main">确认答案</button></div></form>' + keyHTML() : '') +
      '<div id="topic-feedback" class="topic-feedback ' + (session.good ? 'is-good' : session.hintShown ? 'is-help' : '') + '" role="status" aria-live="polite">' + esc(session.feedback) + '</div>' +
      (!isDone && session.hintShown && !session.revealed ? '<div class="topic-hint"><p>' + esc(q.hint) + '</p></div>' : '') +
      (!isDone && session.revealed ? '<div class="topic-hint">' + (q.steps ? q.steps.map(function (s) { return '<p>' + esc(s) + '</p>'; }).join('') : '<p>' + esc(q.explanation) + '</p>') + '</div>' : '') +
      (isDone ? '<div class="topic-solution">' + (q.steps ? q.steps.map(function (s) { return '<p>' + esc(s) + '</p>'; }).join('') : '<p>' + esc(q.explanation) + '</p>') + '</div>' : '') +
      '<div class="topic-actions">' + (isDone ? button('next', session.index + 1 === session.questions.length ? '查看本轮结果 →' : '下一题 →', 'btn-main') : (session.revealed ? '' : button('hint', session.hintShown ? '看完整解答' : '看提示', 'btn-soft'))) + button('read-question', '🔊 读题', 'btn-soft') + button('quit', '结束本轮', 'btn-soft') + '</div></article>';
  }

  function feedback(text, good) {
    session.feedback = text;
    session.good = !!good;
    var node = document.getElementById('topic-feedback');
    node.textContent = text;
    node.classList.toggle('is-good', !!good);
    node.classList.toggle('is-help', false);
  }

  function needPractice(kind) {
    var item = currentItem(), q = item.q, b = bag();
    var w = b.wrong[q.id] || { skill: item.skill, range: item.range, seed: item.seed, wrongCount: 0, cleanStreak: 0 };
    w.wrongCount++;
    w.cleanStreak = 0;
    w.errorKind = kind;
    b.wrong[q.id] = w;
    save();
    syncNavigation();
  }

  function wrong(kind) {
    session.hadWrong = true;
    needPractice(kind);
    MT.progress.stats.totalWrong++;
    MT.sound.play('wrong');
    save();
  }

  function finishQuestion() {
    var item = currentItem(), q = item.q, b = bag();
    var clean = !session.hadWrong && !session.helped;
    var s = b.skills[item.skill] || (b.skills[item.skill] = { completed: 0, clean: 0 });
    s.completed++;
    session.correct++;
    if (clean) { s.clean++; session.clean++; }
    MT.progress.stats.totalCorrect++;
    var w = b.wrong[q.id];
    if (w && clean) {
      w.cleanStreak++;
      if (w.cleanStreak >= 2) {
        delete b.wrong[q.id];
        if (MT.badges) MT.badges.unlock('mistake_slayer');
      }
    }
    session.phase = 'complete';
    session.feedback = clean ? '答对啦！这道题是你独立完成的。' : '完成啦！再独立练两次，就能把它移出错题本。';
    if (clean && w) session.feedback += b.wrong[q.id] ? ' 已连续独立答对 1 / 2 次，再独立答对一次就能移出错题本。' : ' 已连续独立答对 2 次，这题已移出错题本！';
    session.good = true;
    MT.sound.play('right');
    if (clean && MT.badges) MT.badges.checkTopic(model.id);
    save();
    syncNavigation();
    renderQuestion();
    focus('[data-topic-action="next"]');
  }

  function choose(index) {
    if (!session || session.done || session.phase === 'complete') return;
    var q = currentItem().q;
    if (session.phase === 'order') {
      if (index !== q.correctFirst) {
        wrong('order');
        feedback('顺序再想一想：' + q.rule, false);
        return;
      }
      session.phase = 'intermediate';
      session.feedback = '顺序选对了！算一算这部分。';
      session.good = true;
      renderQuestion();
      focus('#topic-answer');
    } else if (q.kind === 'choice') {
      if (index === q.answer) finishQuestion();
      else { wrong('answer'); feedback('再想一想：' + q.hint, false); }
    }
  }

  function submit() {
    if (!session || session.done || session.phase === 'complete' || session.phase === 'order') return;
    var input = document.getElementById('topic-answer');
    if (!input || !/^[0-9]{1,4}$/.test(input.value)) { feedback('先填入一个整数答案。'); return; }
    var q = currentItem().q;
    var expected = session.phase === 'intermediate' ? q.intermediate : q.answer;
    if (Number(input.value) !== expected) {
      wrong(session.phase === 'intermediate' ? 'calculation' : 'answer');
      feedback('还差一点：' + (session.phase === 'intermediate' ? '先单独算好选中的这一部分。' : q.hint), false);
      input.select();
      return;
    }
    if (session.phase === 'intermediate') {
      session.phase = 'answer';
      session.feedback = '中间结果正确！继续算最后一步。';
      session.good = true;
      renderQuestion();
      focus('#topic-answer');
    } else finishQuestion();
  }

  function renderResult() {
    session.done = true;
    syncNavigation();
    work.innerHTML = '<article class="topic-card topic-result"><p class="topic-eyebrow">本轮练习结束</p><h3 tabindex="-1">独立完成 ' + session.clean + ' / ' + session.correct + ' 题</h3><p>本轮计划 ' + session.questions.length + ' 题，已完成 ' + session.correct + ' 题。看过提示或答错的题，会留在错题本中帮你复习。</p><p>同一道错题连续两次独立答对，就会移出错题本。</p><div class="topic-actions">' + button('start', '再练 ' + roundSize() + ' 题', 'btn-main') + button('show-wrong', '去错题本', 'btn-soft') + button('learn', '回顾方法', 'btn-soft') + (mode === 'practice' && session.correct === session.questions.length && nextSkill() ? button('next-skill', '学习下一个知识点 →', 'btn-soft') : '') + '</div></article>';
    if (MT.bus) MT.bus.emit('topic:end');
    focus();
  }

  function renderWrong() {
    var items = reviewItems();
    var labels = { order: '运算顺序', calculation: '中间计算', answer: '答案', help: '看过提示' };
    work.innerHTML = '<article class="topic-card"><h3 tabindex="-1">' + esc(model.title) + '错题本</h3><p class="topic-muted">连续两次独立答对同一道题，就会移出错题本。</p>' +
      (items.length ? '<div class="topic-actions">' + button('review-all', '复习这 ' + Math.min(10, items.length) + ' 题', 'btn-main') + '</div><div class="topic-wrong-list">' + items.map(function (item) {
        var w = bag().wrong[item.q.id];
        return '<div class="topic-wrong-row"><div><b>' + esc(item.q.expression || item.q.prompt) + '</b><small>' + esc(skillById(item.skill).title) + ' · ' + esc(labels[w.errorKind] || '答案') + ' · 已连续答对 ' + w.cleanStreak + ' / 2 次</small>' + (item.q.visualHTML ? '<details class="topic-wrong-preview"><summary>查看这道题的图</summary>' + item.q.visualHTML + '</details>' : '') + '</div>' + button('review-one', '复习', 'btn-soft', ' data-question="' + esc(item.q.id) + '"') + '</div>';
      }).join('') + '</div>' : '<div class="topic-empty"><span aria-hidden="true">🌱</span><p>这里还没有需要复习的题。</p>' + button('start', '开始练习', 'btn-main') + '</div>') + '</article>';
  }

  function changeMode(next) {
    var wasActive = MT.topics.isActive();
    MT.speech.stop();
    if (MT.moneyGames && MT.moneyGames.getActiveGame()) MT.moneyGames.exit();
    currentSubGame = null;
    session = null;
    mode = next;
    if (mode === 'practice') renderPracticeIntro();
    else { syncNavigation(); if (mode === 'wrong') renderWrong(); else renderLearn(); }
    var heading = work.querySelector('h3');
    if (heading) heading.focus({ preventScroll: true });
    if (window.scrollTo) window.scrollTo(0, 0);
    if (wasActive && MT.bus) MT.bus.emit('topic:end');
  }

  function onClick(e) {
    var btn = e.target.closest('button');
    if (!btn || !panel.contains(btn)) return;
    MT.speech.warmup();
    if (btn.dataset.skill) {
      skill = skillById(btn.dataset.skill);
      bag().lastSkill = skill.id;
      demoStep = 0;
      save();
      changeMode(mode);
      var picker = panel.querySelector('.topic-skill-picker');
      if (picker && window.matchMedia && !window.matchMedia('(min-width: 721px)').matches) picker.open = false;
    } else if (btn.dataset.topicMode) changeMode(btn.dataset.topicMode);
    else if (btn.dataset.topicRange) {
      bag().range = Number(btn.dataset.topicRange);
      save();
      changeMode('practice');
    } else {
      var action = btn.dataset.topicAction;
      if (action === 'start') start();
      if (action === 'learn') changeMode('learn');
      if (action === 'quit') {
        if (session && !session.done && session.correct > 0) renderResult();
        else changeMode(mode === 'wrong' ? 'wrong' : 'practice');
      }
      if (action === 'next-skill' && nextSkill()) {
        skill = nextSkill(); bag().lastSkill = skill.id; demoStep = 0; save(); changeMode('learn');
      }
      if (action === 'show-wrong') changeMode('wrong');
      if (action === 'demo-next') { demoStep++; renderLearn(); focus(demoStep < skill.example.steps.length ? '[data-topic-action="demo-next"]' : '[data-topic-action="start"]'); }
      if (action === 'read-lesson') say(skill.title + '。' + skill.description + '。' + work.querySelector('.topic-lesson').textContent);
      if (action === 'read-question' && session) { var q = currentItem().q; say(q.speech || q.prompt + '。' + (q.expression || '')); }
      if (action === 'choice') choose(Number(btn.dataset.choice));
      if (action === 'next' && session && session.phase === 'complete') {
        MT.speech.stop();
        if (++session.index >= session.questions.length) renderResult();
        else { resetQuestion(); renderQuestion(); focus(); }
      }
      if (action === 'hint' && session && session.phase !== 'complete') {
        if (!session.helped) { session.helped = true; needPractice('help'); }
        if (session.hintShown) session.revealed = true;
        session.hintShown = true;
        session.good = false;
        session.feedback = session.revealed ? '一起看完整解答，理解后再独立复习。这题已加入错题本。' : '先想一想提示，再试着作答。这题已加入错题本，之后可以独立复习。';
        renderQuestion();
        focus('[data-topic-action="hint"]');
      }
      if (action === 'key') {
        var input = document.getElementById('topic-answer');
        if (!input) return;
        var key = btn.dataset.key;
        var cursorStart = input.selectionStart, cursorEnd = input.selectionEnd;
        if (cursorStart === null || cursorStart === undefined) cursorStart = cursorEnd = input.value.length;
        if (key === '清空') { input.value = ''; cursorStart = 0; }
        else if (key === '退格') {
          if (cursorStart === cursorEnd) cursorStart = Math.max(0, cursorStart - 1);
          input.value = input.value.slice(0, cursorStart) + input.value.slice(cursorEnd);
        } else {
          var value = input.value.slice(0, cursorStart) + key + input.value.slice(cursorEnd);
          if (value.length <= 4) { input.value = value; cursorStart++; }
        }
        input.focus({ preventScroll: true });
        if (input.setSelectionRange) input.setSelectionRange(cursorStart, cursorStart);
      }
      if (action === 'play-game') launchGame(btn.dataset.game);
      if (action === 'review-all') start(reviewItems().slice(0, 10));
      if (action === 'review-one') start(reviewItems().filter(function (item) { return item.q.id === btn.dataset.question; }));
    }
  }

  function printHeader(title) {
    var rangeText = model.id === 'mixed' ? (skill.id === 'muldiv' ? ' · 表内乘除' : ' · ' + bag().range + ' 以内') : model.id === 'money' ? ' · ' + bag().range + ' 元以内' : '';
    return '<div class="print-head"><div class="print-title">' + esc(model.title + ' · ' + title) + '</div><div class="print-meta">' + esc(skill.title) + rangeText + '　姓名 __________　日期 __________</div></div>';
  }

  MT.topics = {
    init: function () {
      panel = document.getElementById('panel-topic');
      panel.addEventListener('click', onClick);
      panel.addEventListener('submit', function (e) { if (e.target.id === 'topic-answer-form') { e.preventDefault(); submit(); } });
      if (window.matchMedia) {
        var media = window.matchMedia('(min-width: 721px)');
        if (media.addEventListener) media.addEventListener('change', function () { if (model) pickerForScreen(); });
      }
      panel.addEventListener('input', function (e) { if (e.target.id === 'topic-answer') e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4); });
    },
    enter: function (id, options) {
      options = options || {};
      model = MT[id];
      skill = skillById(options.skill) || skillById(bag().lastSkill) || model.skills[0];
      bag().lastSkill = skill.id;
      mode = ['learn', 'practice', 'wrong'].indexOf(options.mode) !== -1 ? options.mode : 'learn';
      session = null; demoStep = 0; currentSubGame = null;
      renderShell();
      if (mode === 'practice') {
        if (options.game && id === 'money' && MT.moneyGames) {
          launchGame(options.game);
        } else {
          renderPracticeIntro();
        }
      }
      else if (mode === 'wrong') renderWrong();
      else renderLearn();
      save();
    },
    leave: function () {
      if (MT.moneyGames && MT.moneyGames.getActiveGame()) {
        MT.moneyGames.exit();
      }
      session = null; model = null; currentSubGame = null;
    },
    changeMode: changeMode,
    refresh: function () { if (model) this.enter(model.id); },
    isActive: function () { return !!((session && !session.done) || currentSubGame); },
    buildPrint: function (root) {
      if (!model) return false;
      var items = [];
      var count = (model.id === 'length' && skill.id === 'ruler') || (model.id === 'money') ? 6 : 8;
      for (var i = 0; i < count; i++) {
        var item = makeItem(skill.id, bag().range, randomSeed());
        // 打印为独立练习，不影响屏幕上的答题状态。
        items.push(item.q);
      }
      root.innerHTML = '<div class="print-sheet">' + printHeader('练习纸') + '<div class="topic-print-questions">' + items.map(function (q, i) {
        return '<div class="topic-print-question"><p>' + (i + 1) + '. ' + esc(q.kind === 'steps' ? q.expression + ' = ______' : (q.printPrompt || q.prompt)) + '</p>' + (q.visualHTML || '') +
          (q.kind === 'steps' ? '<p class="topic-print-space">先算 ____________________　再算 ____________________</p>' : q.kind === 'choice' ? '<p>' + q.choices.map(function (s, j) { return String.fromCharCode(65 + j) + '. ' + esc(s); }).join('　') + '</p>' : '<p>答案：________ ' + esc(q.unit || '') + '</p>') + '</div>';
      }).join('') + '</div></div>';
      if (MT.progress.settings.printAnswers === 'on') {
        root.innerHTML += '<div class="print-sheet">' + printHeader('参考答案') + items.map(function (q, i) {
          return '<div class="topic-print-question"><p>' + (i + 1) + '. ' + esc(q.kind === 'choice' ? q.choices[q.answer] : q.answer + (q.unit || '')) + '</p><p>' + esc(q.steps ? q.steps.join('；') : q.explanation) + '</p></div>';
        }).join('') + '</div>';
      }
      return true;
    }
  };
})(window.MT = window.MT || {});
