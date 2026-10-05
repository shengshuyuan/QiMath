(function (MT) {
  'use strict';

  var dom = {};

  var S = {
    submode: 'bubbles',
    timer: null,
    bubbles: {
      roundIdx: 0,
      totalRounds: 5,
      targetList: [],
      targetNum: 24,
      items: [],
      foundCount: 0,
      targetTotal: 0,
      isRoundClear: false,
      isGameComplete: false,
      score: 0
    },
    impostor: {
      roundIdx: 0,
      totalRounds: 5,
      trapList: [],
      cards: [],
      currentTrap: null,
      streak: 0,
      madeMistake: false,
      isRoundClear: false,
      isGameComplete: false
    }
  };

  function clearTimer() {
    if (S.timer) {
      clearTimeout(S.timer);
      S.timer = null;
    }
  }

  /* ==============================================================
     游戏 1：气球爆破（逆向因数找朋友）
     ============================================================== */

  function startBubbleRound(roundIdx) {
    clearTimer();
    var bState = S.bubbles;
    bState.roundIdx = roundIdx;
    bState.isRoundClear = false;
    bState.isGameComplete = false;
    bState.foundCount = 0;
    var pack = MT.op.current().makeBubbles(roundIdx, bState);
    bState.currentOp = MT.op.current().id;
    bState.targetNum = pack.targetNum;
    bState.items = pack.items;
    bState.targetTotal = pack.total;
    bState.hudPrefix = pack.prefix;
    bState.hudSuffix = pack.suffix;
    bState.summaryNote = pack.summaryNote;
    bState.summaryLines = pack.summaryLines;
    renderBubblesHUD();
    renderBubblesStage();
  }

  function renderBubblesHUD() {
    var bState = S.bubbles;
    if (!dom.bubbleTargetNum) return;
    if (dom.bubbleTargetPrefix) dom.bubbleTargetPrefix.textContent = bState.hudPrefix || '找一找积等于';
    dom.bubbleTargetNum.textContent = bState.targetNum;
    if (dom.bubbleTargetSuffix) dom.bubbleTargetSuffix.textContent = bState.hudSuffix || '的气球！';
    dom.bubbleFoundCount.textContent = bState.foundCount;
    dom.bubbleTotalTarget.textContent = bState.targetTotal;
    dom.bubbleRoundNum.textContent = '第 ' + (bState.roundIdx + 1) + ' / ' + bState.totalRounds + ' 轮';
    dom.bubbleFeedback.hidden = true;
    if (!bState.isRoundClear) dom.bubbleSummary.hidden = true;
  }

  function renderBubblesStage() {
    var sky = dom.bubbleSky;
    if (!sky) return;
    sky.innerHTML = '';
    var bState = S.bubbles;

    for (var i = 0; i < bState.items.length; i++) {
      var item = bState.items[i];
      var balloon = document.createElement('button');
      balloon.type = 'button';
      balloon.className = 'balloon balloon-color-' + (i % 5) + (item.isPopped ? ' is-popped-idle' : '');
      balloon.style.setProperty('--bi', String(i));
      balloon.dataset.id = item.id;
      balloon.setAttribute('aria-label', item.text || (item.a + ' 乘 ' + item.b));

      var txt = document.createElement('span');
      txt.className = 'balloon-text';
      txt.textContent = item.text || (item.a + ' × ' + item.b);

      var string = document.createElement('span');
      string.className = 'balloon-string';

      balloon.appendChild(txt);
      balloon.appendChild(string);

      (function (btn, it) {
        btn.addEventListener('click', function () {
          onBubbleClick(btn, it);
        });
      })(balloon, item);

      sky.appendChild(balloon);
    }
  }

  function onBubbleClick(btn, item) {
    var bState = S.bubbles;
    if (item.isPopped || bState.isRoundClear || bState.isGameComplete) return;

    MT.speech.warmup();

    if (item.isTarget) {
      item.isPopped = true;
      btn.classList.add('is-popped');
      bState.foundCount++;
      bState.score += 10;
      dom.bubbleFoundCount.textContent = bState.foundCount;

      haptic('tap');
      MT.sound.play('pop');
      if (item.speak) MT.speech.play(item.speak, item.scene || 'ok');

      if (bState.foundCount >= bState.targetTotal) {
        onBubbleRoundClear();
      }
    } else {
      btn.classList.remove('is-wobble');
      void btn.offsetWidth;
      btn.classList.add('is-wobble');

      var msg = item.miss || (item.text + ' 不是这一题哦～');
      showBubbleFeedback(msg, false);

      haptic('bad');
      MT.sound.play('wrong');
    }
  }

  function showBubbleFeedback(msg, isOk) {
    if (!dom.bubbleFeedback) return;
    dom.bubbleFeedback.textContent = msg;
    dom.bubbleFeedback.className = 'game-feedback' + (isOk ? ' is-ok' : ' is-bad');
    dom.bubbleFeedback.hidden = false;
  }

  function onBubbleRoundClear() {
    var bState = S.bubbles;
    bState.isRoundClear = true;
    haptic('ok');
    MT.sound.play('win');

    var formulas = bState.summaryLines || [];

    var clearedIdx = bState.roundIdx;
    var isLast = clearedIdx >= bState.totalRounds - 1;
    if (isLast) {
      bState.isGameComplete = true;
      if (MT.bus && MT.bus.emit) MT.bus.emit('game:end', {});
    }
    if (MT.badges) MT.badges.unlock('bubble_popper');
    if (isLast && MT.confetti) MT.confetti.burst();
    if (!isLast) showBubbleFeedback('找齐啦，下一轮马上开始', true);
    dom.bubbleSummary.hidden = false;
    dom.bubbleSummary.innerHTML =
      '<div class="summary-title">' + (isLast ? '🎉 气球大挑战全部通关！' : '🎈 找齐啦！太棒了！') + '</div>' +
      '<div class="summary-note">' + (bState.summaryNote || '') + '</div>' +
      '<div class="summary-list">' +
      formulas.map(function (f) { return '<span class="summary-chip">' + f + '</span>'; }).join('') +
      '</div>' +
      '<div class="summary-actions">' +
      '<button type="button" class="btn btn-main" id="btn-bubble-next">' +
      (isLast ? '再玩一轮' : '进入下一轮') +
      '</button>' +
      '</div>';

    var btnNext = document.getElementById('btn-bubble-next');
    if (btnNext) {
      btnNext.addEventListener('click', function () {
        MT.speech.warmup();
        MT.sound.play('click');
        if (isLast) {
          bState.score = 0;
          startBubbleRound(0);
        } else {
          startBubbleRound(clearedIdx + 1);
        }
      });
    }
    if (!isLast) {
      S.timer = setTimeout(function () {
        S.timer = null;
        if (bState.roundIdx !== clearedIdx || bState.currentOp !== MT.op.current().id) return;
        startBubbleRound(clearedIdx + 1);
      }, 1100);
    }
  }

  /* ==============================================================
     游戏 2：找出捣蛋鬼（挑错游戏）
     ============================================================== */

  function startImpostorRound(roundIdx) {
    clearTimer();
    var iState = S.impostor;
    iState.roundIdx = roundIdx;
    iState.isRoundClear = false;
    iState.isGameComplete = false;
    iState.madeMistake = false;
    var pack = MT.op.current().makeImpostors(roundIdx, iState);
    iState.currentOp = MT.op.current().id;
    iState.cards = pack.cards;
    renderImpostorHUD();
    renderImpostorStage();
  }

  function renderImpostorHUD() {
    var iState = S.impostor;
    if (!dom.impostorStreak) return;
    dom.impostorStreak.textContent = iState.streak;
    dom.impostorRoundNum.textContent = '第 ' + (iState.roundIdx + 1) + ' / ' + iState.totalRounds + ' 轮';
    dom.impostorFeedback.hidden = true;
    if (!iState.isRoundClear) dom.impostorSummary.hidden = true;
  }

  function renderImpostorStage() {
    var box = dom.impostorCards;
    if (!box) return;
    box.innerHTML = '';
    var iState = S.impostor;

    for (var i = 0; i < iState.cards.length; i++) {
      var card = iState.cards[i];
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'impostor-card' +
        (card.isChecked ? (card.isImpostor ? ' is-caught' : ' is-correct-checked') : '');
      btn.dataset.id = card.id;

      var formula = document.createElement('div');
      formula.className = 'impostor-formula';

      var leftStr = card.left;

      if (card.isChecked && card.isImpostor) {
        formula.innerHTML = leftStr + ' = ' +
          '<span class="impostor-strike">' + card.displayVal + '</span>' +
          '<span class="impostor-fixed">' + card.correctVal + '</span>';
      } else {
        formula.textContent = leftStr + ' = ' + card.displayVal;
      }

      var tag = document.createElement('div');
      tag.className = 'impostor-tag';
      if (card.isChecked && card.isImpostor) {
        tag.innerHTML = '<span class="impostor-badge">🕵️ 捣蛋鬼被抓啦！</span>';
      } else if (card.isChecked) {
        tag.innerHTML = '<span class="impostor-badge-ok">✓ 算式正确</span>';
      } else {
        tag.textContent = '点它验算一下？';
      }

      btn.appendChild(formula);
      btn.appendChild(tag);

      (function (button, c) {
        button.addEventListener('click', function () {
          onImpostorCardClick(button, c);
        });
      })(btn, card);

      box.appendChild(btn);
    }
  }

  function onImpostorCardClick(btn, card) {
    var iState = S.impostor;
    if (card.isChecked || iState.isRoundClear || iState.isGameComplete) return;

    MT.speech.warmup();

    var leftStr = card.left;

    if (card.isImpostor) {
      card.isChecked = true;
      iState.isRoundClear = true;
      if (!iState.madeMistake) {
        iState.streak++;
      } else {
        iState.streak = 1;
      }
      dom.impostorStreak.textContent = iState.streak;

      btn.classList.add('is-caught');
      var formula = btn.querySelector('.impostor-formula');
      if (formula) {
        formula.innerHTML = leftStr + ' = ' +
          '<span class="impostor-strike">' + card.displayVal + '</span>' +
          '<span class="impostor-fixed">' + card.correctVal + '</span>';
      }
      var tag = btn.querySelector('.impostor-tag');
      if (tag) tag.innerHTML = '<span class="impostor-badge">🕵️ 抓到啦！</span>';

      haptic('ok');
      MT.sound.play('win');
      if (card.speak) MT.speech.play(card.speak, card.scene || 'ok');

      onImpostorRoundClear(card);
    } else {
      card.isChecked = true;
      iState.madeMistake = true;
      btn.classList.add('is-correct-checked');
      var tagOk = btn.querySelector('.impostor-tag');
      if (tagOk) tagOk.innerHTML = '<span class="impostor-badge-ok">✓ 算式正确</span>';

      var msg = leftStr + ' = ' + card.correctVal + ' 算得完全正确，它不是捣蛋鬼哦！再找找别的～';
      showImpostorFeedback(msg, false);

      haptic('bad');
      MT.sound.play('wrong');
    }
  }

  function showImpostorFeedback(msg, isOk) {
    if (!dom.impostorFeedback) return;
    dom.impostorFeedback.textContent = msg;
    dom.impostorFeedback.className = 'game-feedback' + (isOk ? ' is-ok' : ' is-bad');
    dom.impostorFeedback.hidden = false;
  }

  function onImpostorRoundClear(card) {
    var iState = S.impostor;
    var isLast = iState.roundIdx >= iState.totalRounds - 1;
    if (isLast) {
      iState.isGameComplete = true;
      if (MT.bus && MT.bus.emit) MT.bus.emit('game:end', {});
    }
    if (MT.badges) MT.badges.unlock('impostor_hunter');
    if (isLast && MT.confetti) MT.confetti.burst();

    var correctFormulaStr = '<b>' + card.left + ' = ' + card.correctVal + '</b>' + (card.aside || '');

    dom.impostorSummary.hidden = false;
    dom.impostorSummary.innerHTML =
      '<div class="summary-title">' + (isLast ? '🕵️ 5 轮全部通关！你是火眼金睛大侦探！' : '🕵️ 抓到捣蛋鬼啦！') + '</div>' +
      '<div class="summary-note">' + correctFormulaStr + '</div>' +
      '<div class="summary-note">' + card.note + '</div>' +
      '<div class="summary-actions">' +
      '<button type="button" class="btn btn-main" id="btn-impostor-next">' +
      (isLast ? '再玩一轮' : '进入下一轮') +
      '</button>' +
      '</div>';

    var btnNext = document.getElementById('btn-impostor-next');
    if (btnNext) {
      btnNext.addEventListener('click', function () {
        MT.speech.warmup();
        MT.sound.play('click');
        if (isLast) {
          iState.streak = 0;
          startImpostorRound(0);
        } else {
          startImpostorRound(iState.roundIdx + 1);
        }
      });
    }
  }

  /* ==============================================================
     模式切换与重置（状态常驻内存，切走不丢失进度）
     ============================================================== */

  function setSubmode(mode) {
    S.submode = mode;
    var kids = dom.submodeSeg.children;
    for (var i = 0; i < kids.length; i++) {
      var on = kids[i].dataset.game === mode;
      kids[i].classList.toggle('is-on', on);
      kids[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }

    dom.viewBubbles.hidden = (mode !== 'bubbles');
    dom.viewImpostor.hidden = (mode !== 'impostor');

    var curOp = MT.op.current().id;
    if (mode === 'bubbles') {
      if (S.bubbles.currentOp !== curOp || !S.bubbles.items || !S.bubbles.items.length) {
        startBubbleRound(0);
      } else {
        renderBubblesHUD();
        renderBubblesStage();
      }
    } else {
      if (S.impostor.currentOp !== curOp || !S.impostor.cards || !S.impostor.cards.length) {
        startImpostorRound(0);
      } else {
        renderImpostorHUD();
        renderImpostorStage();
      }
    }
  }

  function resetCurrent() {
    clearTimer();
    MT.sound.play('click');
    if (S.submode === 'bubbles') {
      S.bubbles.score = 0;
      startBubbleRound(0);
    } else {
      S.impostor.streak = 0;
      startImpostorRound(0);
    }
  }

  function resetAll() {
    clearTimer();
    var curOp = MT.op.current().id;
    S.bubbles.currentOp = curOp;
    S.bubbles.score = 0;
    S.bubbles.roundIdx = 0;
    S.bubbles.items = [];
    S.bubbles.targetList = [];
    S.bubbles.divTargetList = [];
    S.impostor.currentOp = curOp;
    S.impostor.streak = 0;
    S.impostor.roundIdx = 0;
    S.impostor.cards = [];
    S.impostor.trapList = [];
    S.impostor.divTrapList = [];
    if (S.submode === 'bubbles') startBubbleRound(0);
    else startImpostorRound(0);
  }

  MT.games = {
    init: function () {
      dom.panel = document.getElementById('panel-games');
      dom.submodeSeg = document.getElementById('game-submode');
      dom.btnReset = document.getElementById('btn-game-reset');
      dom.viewBubbles = document.getElementById('game-view-bubbles');
      dom.viewImpostor = document.getElementById('game-view-impostor');

      dom.bubbleTargetPrefix = document.getElementById('bubble-target-prefix');
      dom.bubbleTargetNum = document.getElementById('bubble-target-num');
      dom.bubbleTargetSuffix = document.getElementById('bubble-target-suffix');
      dom.bubbleFoundCount = document.getElementById('bubble-found-count');
      dom.bubbleTotalTarget = document.getElementById('bubble-total-target');
      dom.bubbleRoundNum = document.getElementById('bubble-round-num');
      dom.bubbleSky = document.getElementById('bubble-sky');
      dom.bubbleFeedback = document.getElementById('bubble-feedback');
      dom.bubbleSummary = document.getElementById('bubble-summary');

      dom.impostorStreak = document.getElementById('impostor-streak');
      dom.impostorRoundNum = document.getElementById('impostor-round-num');
      dom.impostorCards = document.getElementById('impostor-cards');
      dom.impostorFeedback = document.getElementById('impostor-feedback');
      dom.impostorSummary = document.getElementById('impostor-summary');

      if (dom.submodeSeg) {
        dom.submodeSeg.addEventListener('click', function (e) {
          var t = e.target;
          if (!t || !t.dataset || !t.dataset.game) return;
          MT.speech.warmup();
          MT.sound.play('click');
          setSubmode(t.dataset.game);
        });
      }

      if (dom.btnReset) {
        dom.btnReset.addEventListener('click', function () {
          resetCurrent();
        });
      }

      setSubmode(S.submode);
    },

    pause: function () {
      clearTimer();
    },

    resume: function () {
      var curOp = MT.op.current().id;
      if (S.submode === 'bubbles') {
        if (S.bubbles.currentOp !== curOp || !S.bubbles.items || !S.bubbles.items.length) {
          startBubbleRound(0);
        } else {
          renderBubblesHUD();
          renderBubblesStage();
        }
      } else {
        if (S.impostor.currentOp !== curOp || !S.impostor.cards || !S.impostor.cards.length) {
          startImpostorRound(0);
        } else {
          renderImpostorHUD();
          renderImpostorStage();
        }
      }
    },

    isActive: function () {
      if (!dom.panel || dom.panel.hidden) return false;
      if (S.submode === 'bubbles') {
        return !S.bubbles.isGameComplete && !S.bubbles.isRoundClear && S.bubbles.roundIdx < S.bubbles.totalRounds;
      }
      if (S.submode === 'impostor') {
        return !S.impostor.isGameComplete && !S.impostor.isRoundClear && S.impostor.roundIdx < S.impostor.totalRounds;
      }
      return false;
    },

    resetAll: resetAll,
    setSubmode: setSubmode,
    state: S
  };
})(window.MT = window.MT || {});
