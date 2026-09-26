(function (MT) {
  'use strict';

  var dom = {};

  var BUBBLE_TARGETS = [
    12, 16, 18, 20, 24, 27, 28, 30, 32, 36, 40, 42, 45, 48, 54, 56, 63, 72, 8, 9, 15
  ];

  var IMPOSTOR_TRAPS = [
    { a: 7, b: 8, correct: 56, fake: 54, note: '七八五十六，容易和六九五十四混淆！' },
    { a: 6, b: 7, correct: 42, fake: 48, note: '六七四十二，容易和六八四十八混淆！' },
    { a: 4, b: 8, correct: 32, fake: 36, note: '四八三十二，容易和四九三十六混淆！' },
    { a: 8, b: 8, correct: 64, fake: 62, note: '八八六十四，得数是双数 64 哦！' },
    { a: 6, b: 9, correct: 54, fake: 56, note: '六九五十四，不是 56 哦！' },
    { a: 6, b: 6, correct: 36, fake: 32, note: '六六三十六，是个漂亮的平方数！' },
    { a: 3, b: 8, correct: 24, fake: 26, note: '三八二十四，可别粗心算成 26 啦！' },
    { a: 7, b: 7, correct: 49, fake: 47, note: '七七四十九，不是 47 哦！' },
    { a: 4, b: 9, correct: 36, fake: 38, note: '四九三十六，个位是 6 哦！' },
    { a: 8, b: 9, correct: 72, fake: 74, note: '八九七十二，十位和个位相加等于 9！' },
    { a: 7, b: 9, correct: 63, fake: 64, note: '七九六十三，容易和八八六十四混淆！' },
    { a: 3, b: 9, correct: 27, fake: 28, note: '三九二十七，各位数字相加是 9！' },
    { a: 6, b: 8, correct: 48, fake: 46, note: '六八四十八，可不是 46 哦！' },
    { a: 5, b: 7, correct: 35, fake: 30, note: '五七三十五，5乘单数个位一定是 5！' },
    { a: 9, b: 9, correct: 81, fake: 89, note: '九九八十一，是口诀表最大的一个！' }
  ];

  function haptic(type) {
    var st = MT.progress && MT.progress.settings;
    if (st && st.hapticOn === 'off') return;
    if (!('vibrate' in navigator)) return;
    try {
      if (type === 'tap') navigator.vibrate(10);
      else if (type === 'ok') navigator.vibrate([20, 30, 20]);
      else if (type === 'bad') navigator.vibrate([45, 35, 45]);
    } catch (e) {}
  }

  /* ---------- 内存状态（在标签切换时缓存，除非刷新网页） ---------- */

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

  function getAllMultipliersFor(target) {
    var list = [];
    for (var a = 1; a <= 9; a++) {
      for (var b = 1; b <= 9; b++) {
        if (a * b === target) list.push({ a: a, b: b });
      }
    }
    return list;
  }

  function getDistractorMultipliers(target, count) {
    var pool = [];
    for (var a = 1; a <= 9; a++) {
      for (var b = 1; b <= 9; b++) {
        if (a * b !== target) {
          pool.push({ a: a, b: b, prod: a * b, diff: Math.abs(a * b - target) });
        }
      }
    }
    pool = MT.core.shuffle(pool);
    // 优先选差值在 12 以内的迷惑性因数（如目标 24，出现 3×7=21 或 4×7=28）
    var close = pool.filter(function (it) { return it.diff > 0 && it.diff <= 12; });
    var others = pool.filter(function (it) { return it.diff > 12; });
    var selected = close.slice(0, count);
    if (selected.length < count) {
      selected = selected.concat(others.slice(0, count - selected.length));
    }
    return selected;
  }

  function startBubbleRound(roundIdx) {
    clearTimer();
    var bState = S.bubbles;
    bState.roundIdx = roundIdx;
    bState.isRoundClear = false;
    bState.isGameComplete = false;
    bState.foundCount = 0;

    if (roundIdx === 0 || !bState.targetList || !bState.targetList.length) {
      bState.targetList = MT.core.shuffle(BUBBLE_TARGETS);
    }
    bState.targetNum = bState.targetList[roundIdx % bState.targetList.length];

    var valid = getAllMultipliersFor(bState.targetNum);
    valid = MT.core.shuffle(valid);

    var targetCount = Math.min(valid.length, valid.length >= 3 ? 3 : 2);
    var targetPairs = valid.slice(0, targetCount);
    bState.targetTotal = targetPairs.length;

    var distractorCount = 6 - targetCount;
    var distractors = getDistractorMultipliers(bState.targetNum, distractorCount);

    var items = [];
    var idCounter = 0;

    for (var i = 0; i < targetPairs.length; i++) {
      items.push({
        id: 't_' + (++idCounter),
        a: targetPairs[i].a,
        b: targetPairs[i].b,
        isTarget: true,
        isPopped: false
      });
    }

    for (var j = 0; j < distractors.length; j++) {
      items.push({
        id: 'd_' + (++idCounter),
        a: distractors[j].a,
        b: distractors[j].b,
        isTarget: false,
        isPopped: false
      });
    }

    bState.items = MT.core.shuffle(items);
    renderBubblesHUD();
    renderBubblesStage();
  }

  function renderBubblesHUD() {
    var bState = S.bubbles;
    if (!dom.bubbleTargetNum) return;
    dom.bubbleTargetNum.textContent = bState.targetNum;
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
      balloon.setAttribute('aria-label', item.a + ' 乘 ' + item.b);

      var txt = document.createElement('span');
      txt.className = 'balloon-text';
      txt.textContent = item.a + ' × ' + item.b;

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
      MT.speech.play(MT.core.read(item.a, item.b), 'ok');

      if (bState.foundCount >= bState.targetTotal) {
        onBubbleRoundClear();
      }
    } else {
      btn.classList.remove('is-wobble');
      void btn.offsetWidth;
      btn.classList.add('is-wobble');

      var prod = item.a * item.b;
      var msg = item.a + ' × ' + item.b + ' = ' + prod + '，不是 ' + bState.targetNum + ' 哦～';
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

    var validAll = getAllMultipliersFor(bState.targetNum);
    var formulas = [];
    for (var i = 0; i < validAll.length; i++) {
      formulas.push(validAll[i].a + ' × ' + validAll[i].b + ' = ' + bState.targetNum + '（' + MT.core.koujue(validAll[i].a, validAll[i].b) + '）');
    }

    var isLast = bState.roundIdx >= bState.totalRounds - 1;
    if (MT.badges) MT.badges.unlock('bubble_popper');
    if (isLast && MT.confetti) MT.confetti.burst();
    dom.bubbleSummary.hidden = false;
    dom.bubbleSummary.innerHTML =
      '<div class="summary-title">' + (isLast ? '🎉 气球大挑战全部通关！' : '🎈 找齐啦！太棒了！') + '</div>' +
      '<div class="summary-note">能算出 <b>' + bState.targetNum + '</b> 的口诀朋友都在这里：</div>' +
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
          startBubbleRound(bState.roundIdx + 1);
        }
      });
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

    if (roundIdx === 0 || !iState.trapList || !iState.trapList.length) {
      iState.trapList = MT.core.shuffle(IMPOSTOR_TRAPS);
    }
    var trap = iState.trapList[roundIdx % iState.trapList.length];
    iState.currentTrap = trap;

    var correctPool = [];
    var allKeys = MT.core.triangleKeys();
    for (var k = 0; k < allKeys.length; k++) {
      var p = MT.core.parse(allKeys[k]);
      if (p.a !== trap.a || p.b !== trap.b) {
        correctPool.push(p);
      }
    }
    correctPool = MT.core.shuffle(correctPool).slice(0, 3);

    var cards = [
      {
        id: 'impostor_card',
        a: trap.a,
        b: trap.b,
        correctVal: trap.correct,
        displayVal: trap.fake,
        isImpostor: true,
        note: trap.note,
        isChecked: false
      }
    ];

    for (var i = 0; i < correctPool.length; i++) {
      var cp = correctPool[i];
      cards.push({
        id: 'correct_' + i,
        a: cp.a,
        b: cp.b,
        correctVal: cp.a * cp.b,
        displayVal: cp.a * cp.b,
        isImpostor: false,
        note: '',
        isChecked: false
      });
    }

    iState.cards = MT.core.shuffle(cards);
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

      if (card.isChecked && card.isImpostor) {
        formula.innerHTML = card.a + ' × ' + card.b + ' = ' +
          '<span class="impostor-strike">' + card.displayVal + '</span>' +
          '<span class="impostor-fixed">' + card.correctVal + '</span>';
      } else {
        formula.textContent = card.a + ' × ' + card.b + ' = ' + card.displayVal;
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
        formula.innerHTML = card.a + ' × ' + card.b + ' = ' +
          '<span class="impostor-strike">' + card.displayVal + '</span>' +
          '<span class="impostor-fixed">' + card.correctVal + '</span>';
      }
      var tag = btn.querySelector('.impostor-tag');
      if (tag) tag.innerHTML = '<span class="impostor-badge">🕵️ 抓到啦！</span>';

      haptic('ok');
      MT.sound.play('win');
      MT.speech.play(MT.core.read(card.a, card.b), 'ok');

      onImpostorRoundClear(card);
    } else {
      card.isChecked = true;
      iState.madeMistake = true;
      btn.classList.add('is-correct-checked');
      var tagOk = btn.querySelector('.impostor-tag');
      if (tagOk) tagOk.innerHTML = '<span class="impostor-badge-ok">✓ 算式正确</span>';

      var msg = card.a + ' × ' + card.b + ' = ' + card.correctVal + ' 算得完全正确，它不是捣蛋鬼哦！再找找别的～';
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
    if (MT.badges) MT.badges.unlock('impostor_hunter');
    if (isLast && MT.confetti) MT.confetti.burst();

    dom.impostorSummary.hidden = false;
    dom.impostorSummary.innerHTML =
      '<div class="summary-title">' + (isLast ? '🕵️ 5 轮全部通关！你是火眼金睛大侦探！' : '🕵️ 抓到捣蛋鬼啦！') + '</div>' +
      '<div class="summary-note"><b>' + card.a + ' × ' + card.b + ' = ' + card.correctVal + '</b>（' + MT.core.koujue(card.a, card.b) + '）</div>' +
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

    if (mode === 'bubbles') {
      if (!S.bubbles.items || !S.bubbles.items.length) startBubbleRound(0);
      else { renderBubblesHUD(); renderBubblesStage(); }
    } else {
      if (!S.impostor.cards || !S.impostor.cards.length) startImpostorRound(0);
      else { renderImpostorHUD(); renderImpostorStage(); }
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
    S.bubbles.score = 0;
    S.bubbles.roundIdx = 0;
    S.impostor.streak = 0;
    S.impostor.roundIdx = 0;
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

      dom.bubbleTargetNum = document.getElementById('bubble-target-num');
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
      if (S.submode === 'bubbles') {
        renderBubblesHUD();
        renderBubblesStage();
      } else {
        renderImpostorHUD();
        renderImpostorStage();
      }
    },

    resetAll: resetAll,
    state: S
  };
})(window.MT = window.MT || {});
