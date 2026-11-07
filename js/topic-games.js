/* ==============================================================
   专题课通用小游戏：找出算错的小捣蛋
   ----------------------------------------------------------------
   给混合运算、长度、角、时间、质量、人民币这些课共用。每轮从当前课程
   的文字题里取 3 道，把其中一道的答案悄悄改错，让孩子找出来。
   题目全部来自各课程现成的 generate(skill, range, seed)，不另写题库；
   带图的题（读尺、看钟）不适合做成文字卡片，会被跳过。
   样式复用 games.css 里的 .impostor-* 组件。

   对外接口：
     MT.topicGames.available(model)                 这门课有没有足够的文字题
     MT.topicGames.start(work, model, range, onExit)  在 work 容器里开始游戏
   ============================================================== */
(function () {
  'use strict';
  var MT = window.MT = window.MT || {};

  var ROUNDS = 5;
  var CARDS = 3;
  var MAX_TRIES = 80;

  function esc(text) {
    return String(text).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function randomSeed() { return Math.floor(Math.random() * 4294967296) >>> 0; }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  function haptic(type) {
    var st = MT.progress && MT.progress.settings;
    if (!st || st.hapticOn === 'off' || !('vibrate' in navigator)) return;
    try { navigator.vibrate(type === 'ok' ? [20, 30, 20] : [50, 40, 50]); } catch (e) {}
  }

  /* ---------- 把一道题变成一张「陈述卡」 ---------- */

  // 文字题才能做卡片：没有图，并且能用一句话说清「题目 → 答案」。
  function textual(q) {
    if (!q || q.visualHTML) return false;
    if (q.kind === 'steps') return !!q.expression && typeof q.answer === 'number';
    if (q.kind === 'choice') return Array.isArray(q.choices) && q.choices.length >= 2 && typeof q.answer === 'number';
    return typeof q.answer === 'number' && !!q.prompt;
  }

  // 给数值答案造一个像样的错误答案：小数字差 1～3，大数字按 10% 左右偏移，保证非负且不同。
  function wrongNumber(answer) {
    var delta = answer >= 100 ? Math.max(10, Math.round(answer / 10)) : answer >= 20 ? pick([1, 2, 5, 10]) : pick([1, 2, 3]);
    var sign = answer - delta >= 0 && Math.random() < 0.5 ? -1 : 1;
    var value = answer + sign * delta;
    return value === answer || value < 0 ? answer + delta : value;
  }

  function cardFrom(q, impostor) {
    var card = { kind: q.kind, impostor: impostor, explanation: q.steps ? q.steps.join('；') : (q.explanation || '') };
    if (q.kind === 'steps') {
      card.left = q.expression;
      card.correct = String(q.answer);
      card.shown = impostor ? String(wrongNumber(q.answer)) : card.correct;
      card.formula = true;
    } else if (q.kind === 'choice') {
      var others = q.choices.map(function (_, i) { return i; }).filter(function (i) { return i !== q.answer; });
      card.left = q.prompt;
      card.correct = q.choices[q.answer];
      card.shown = impostor ? q.choices[pick(others)] : card.correct;
    } else {
      card.left = q.prompt;
      card.correct = q.answer + (q.unit || '');
      card.shown = (impostor ? wrongNumber(q.answer) : q.answer) + (q.unit || '');
    }
    return card;
  }

  // 从这门课所有知识点里随机抽文字题，直到凑够 CARDS 道互不相同的题。
  function drawQuestions(model, range) {
    var out = [], seen = {}, tries = 0;
    while (out.length < CARDS && tries++ < MAX_TRIES) {
      var skill = pick(model.skills);
      var q = model.generate(skill.id, range, randomSeed());
      if (!textual(q)) continue;
      var key = q.expression || q.prompt;
      if (seen[key]) continue;
      seen[key] = true;
      out.push(q);
    }
    return out.length === CARDS ? out : null;
  }

  function available(model) {
    if (!model || !model.skills || !model.generate) return false;
    // 任意一个知识点有文字题即可；连抽 12 次都不是文字题就视为不适合。
    for (var i = 0; i < model.skills.length; i++) {
      for (var s = 0; s < 12; s++) if (textual(model.generate(model.skills[i].id, 20, s))) return true;
    }
    return false;
  }

  /* ---------- 游戏流程 ---------- */

  function start(work, model, range, onExit) {
    var state = { round: 0, streak: 0, best: 0, mistake: false, cards: [], cleared: false };

    function hud() {
      return '<div class="game-hud"><div class="hud-target"><span class="hud-label">🕵️ 找出算错的那张卡</span></div>' +
        '<div class="hud-stats"><span class="hud-score">连胜: <b>' + state.streak + '</b></span><span class="hud-round">第 ' + (state.round + 1) + ' / ' + ROUNDS + ' 轮</span></div></div>';
    }

    function render() {
      work.innerHTML = '<article class="topic-card topic-game"><p class="topic-eyebrow">趣味游戏 · ' + esc(model.title || '') + '</p><h3 tabindex="-1">找出算错的小捣蛋</h3>' +
        '<p class="topic-note">三张卡里有一张的答案是错的，点一点把它找出来。点到正确的卡不扣分，但会断掉连胜。</p>' +
        hud() + '<div class="impostor-cards topic-impostor-cards" id="topic-impostor-cards"></div>' +
        '<div class="game-feedback" id="topic-impostor-feedback" hidden></div><div class="game-summary-card" id="topic-impostor-summary" hidden></div>' +
        '<div class="topic-actions"><button type="button" class="btn btn-soft" id="topic-impostor-exit">退出游戏</button></div></article>';
      renderCards();
      var exit = document.getElementById('topic-impostor-exit');
      if (exit) exit.addEventListener('click', function () { MT.speech.stop(); onExit(); });
      var title = work.querySelector('h3');
      if (title && state.round === 0) title.focus({ preventScroll: true });
    }

    function cardHTML(card) {
      var answer = card.checked && card.impostor
        ? '<span class="impostor-strike">' + esc(card.shown) + '</span><span class="impostor-fixed">' + esc(card.correct) + '</span>'
        : esc(card.shown);
      var tag = card.checked && card.impostor ? '<span class="impostor-badge">🕵️ 捣蛋鬼被抓啦！</span>'
        : card.checked ? '<span class="impostor-badge-ok">✓ 这张是对的</span>' : '点它验算一下？';
      return '<div class="impostor-formula' + (card.formula ? '' : ' is-text') + '">' +
        (card.formula ? esc(card.left) + ' = ' + answer : '<span class="impostor-question">' + esc(card.left) + '</span><span class="impostor-answer">' + answer + '</span>') +
        '</div><div class="impostor-tag">' + tag + '</div>';
    }

    function renderCards() {
      var box = document.getElementById('topic-impostor-cards');
      if (!box) return;
      box.innerHTML = '';
      state.cards.forEach(function (card, index) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'impostor-card' + (card.checked ? (card.impostor ? ' is-caught' : ' is-correct-checked') : '');
        btn.innerHTML = cardHTML(card);
        btn.addEventListener('click', function () { onCard(index, btn); });
        box.appendChild(btn);
      });
    }

    function feedback(text, ok) {
      var box = document.getElementById('topic-impostor-feedback');
      if (!box) return;
      box.textContent = text;
      box.className = 'game-feedback ' + (ok ? 'is-ok' : 'is-bad');
      box.hidden = false;
    }

    function onCard(index, btn) {
      var card = state.cards[index];
      if (card.checked || state.cleared) return;
      MT.speech.warmup();
      card.checked = true;
      if (card.impostor) {
        state.cleared = true;
        state.streak = state.mistake ? 1 : state.streak + 1;
        state.best = Math.max(state.best, state.streak);
        btn.className = 'impostor-card is-caught';
        btn.innerHTML = cardHTML(card);
        haptic('ok');
        MT.sound.play('win');
        MT.speech.play('答对啦', 'ok');
        summary(card);
      } else {
        state.mistake = true;
        btn.className = 'impostor-card is-correct-checked';
        btn.innerHTML = cardHTML(card);
        haptic('bad');
        MT.sound.play('wrong');
        feedback('这张是对的：' + card.left + (card.formula ? ' = ' : '，答案是 ') + card.correct + '。再找找别的～', false);
      }
    }

    function summary(card) {
      var last = state.round >= ROUNDS - 1;
      var box = document.getElementById('topic-impostor-summary');
      var fb = document.getElementById('topic-impostor-feedback');
      if (fb) fb.hidden = true;
      if (MT.badges) MT.badges.unlock('impostor_hunter');
      if (last && MT.confetti) MT.confetti.burst();
      if (!box) return;
      box.hidden = false;
      box.innerHTML = '<div class="summary-title">' + (last ? '🕵️ ' + ROUNDS + ' 轮全部通关！最高连胜 ' + state.best + '。' : '🕵️ 抓到捣蛋鬼啦！') + '</div>' +
        '<div class="summary-note"><b>' + esc(card.left) + (card.formula ? ' = ' : ' → ') + esc(card.correct) + '</b></div>' +
        (card.explanation ? '<div class="summary-note">' + esc(card.explanation) + '</div>' : '') +
        '<div class="summary-actions"><button type="button" class="btn btn-main" id="topic-impostor-next">' + (last ? '再玩一轮' : '进入下一轮') + '</button></div>';
      var next = document.getElementById('topic-impostor-next');
      if (next) {
        next.addEventListener('click', function () {
          MT.speech.warmup();
          MT.sound.play('click');
          if (last) state.streak = 0;
          startRound(last ? 0 : state.round + 1);
        });
        next.focus({ preventScroll: true });
      }
    }

    function startRound(round) {
      var questions = drawQuestions(model, range);
      if (!questions) {
        work.innerHTML = '<article class="topic-card"><h3 tabindex="-1">这门课暂时没有适合的游戏题</h3><div class="topic-actions"><button type="button" class="btn btn-soft" id="topic-impostor-exit">返回练习</button></div></article>';
        document.getElementById('topic-impostor-exit').addEventListener('click', onExit);
        return;
      }
      var impostorIndex = Math.floor(Math.random() * CARDS);
      state.round = round;
      state.mistake = false;
      state.cleared = false;
      state.cards = questions.map(function (q, i) { return cardFrom(q, i === impostorIndex); });
      render();
    }

    startRound(0);
  }

  MT.topicGames = { available: available, start: start };
})();
