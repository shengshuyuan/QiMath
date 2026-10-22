(function (MT) {
  'use strict';

  var activeGame = null; // 'combo' | 'cashier' | null
  var container = null;
  var currentRound = null;
  var onExitCallback = null;

  function esc(value) {
    return String(value === undefined ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function getMoneyBag() {
    var all = MT.progress.topics || (MT.progress.topics = {});
    if (!all.money) all.money = { skills: {}, wrong: {}, range: 20, lastSkill: 'recognize', games: {} };
    if (!all.money.games) all.money.games = {};
    return all.money;
  }

  function saveProgress() {
    if (MT.storage && MT.storage.save) MT.storage.save();
  }

  function formatCN(cents) {
    return MT.money.formatCN(cents, true);
  }

  // ---------------- 游戏一：凑钱小能手 (combo) ----------------
  // 5 关设计，支持任意等值组合，支持“换一种付法”
  function createComboLevels(range) {
    // 基础关（range <= 20）：以元和角为主；进阶关（range > 20）：加入更大面额与分
    var isAdv = range > 20;
    var levels = [];

    // 关卡 1: 小额整数元或角 (保证解法多)
    levels.push({
      targetCents: isAdv ? 1500 : 500, // 15元 或 5元
      denoms: isAdv ? ['y10', 'y5', 'y1_p', 'y1_c', 'j5_c'] : ['y1_p', 'y1_c', 'j5_c', 'j1_c'],
      isAlt: false,
      title: '第 1 关 · 基础凑钱'
    });

    // 关卡 2: 元角组合 (如 3元5角)
    levels.push({
      targetCents: isAdv ? 850 : 350,
      denoms: ['y5', 'y1_c', 'j5_c', 'j1_c'],
      isAlt: false,
      title: '第 2 关 · 元角搭配'
    });

    // 关卡 3: 换一种付法关卡！(保留目标金额，要求用不同的张数/面值组合)
    levels.push({
      targetCents: isAdv ? 600 : 200, // 6元 或 2元
      denoms: ['y5', 'y1_c', 'j5_c', 'j1_c'],
      isAlt: true,
      title: '第 3 关 · 换一种付法'
    });

    // 关卡 4: 进阶换算凑整 (如 12元 或 7元8角)
    levels.push({
      targetCents: isAdv ? 2800 : 780,
      denoms: isAdv ? ['y20', 'y10', 'y5', 'y1_c', 'j5_c'] : ['y5', 'y1_c', 'j5_c', 'j1_c'],
      isAlt: false,
      title: '第 4 关 · 综合付款'
    });

    // 关卡 5: 挑战大关 (含分或多角)
    levels.push({
      targetCents: isAdv ? 5250 : 960,
      denoms: isAdv ? ['y50', 'y20', 'y10', 'y5', 'y1_c', 'j5_c', 'j1_c', 'f5_c'] : ['y5', 'y1_c', 'j5_c', 'j1_c'],
      isAlt: false,
      title: '第 5 关 · 终极挑战'
    });

    return levels;
  }

  function getComboSignature(selected) {
    var counts = {};
    selected.forEach(function (d) { counts[d.id] = (counts[d.id] || 0) + 1; });
    var keys = Object.keys(counts).sort();
    return keys.map(function (k) { return k + ':' + counts[k]; }).join(',');
  }

  // ---------------- 游戏二：小小收银员 (cashier) ----------------
  function createCashierLevels(range) {
    var isAdv = range > 20;
    var goodsRepo = [
      { name: '自动铅笔', price: 250 },
      { name: '卡通橡皮', price: 150 },
      { name: '直尺三角板', price: 200 },
      { name: '荧光笔', price: 300 },
      { name: '修正带', price: 450 },
      { name: '精装画本', price: 800 },
      { name: '水彩笔套装', price: 1450 },
      { name: '多功能笔袋', price: 1800 }
    ];

    var levels = [];

    // 关卡 1: 单件，需要找零
    levels.push({
      goods: [ goodsRepo[1] ], // 1.50元
      paid: 200, // 付2元，找5角
      title: '第 1 关 · 基础找零'
    });

    // 关卡 2: 恰好付款，不用找零！
    levels.push({
      goods: [ goodsRepo[0] ], // 2.50元
      paid: 250, // 付2.50元，正好
      title: '第 2 关 · 正好付清'
    });

    // 关卡 3: 钱不够判断！
    levels.push({
      goods: [ goodsRepo[4] ], // 4.50元
      paid: 400, // 只付了4元，不够！
      title: '第 3 关 · 细心辨别'
    });

    // 关卡 4: 单件较大找零
    levels.push({
      goods: [ goodsRepo[5] ], // 8.00元
      paid: 1000, // 付10元，找2元
      title: '第 4 关 · 整元找零'
    });

    // 关卡 5: 进阶两件商品合算与找零
    levels.push({
      goods: isAdv ? [ goodsRepo[2], goodsRepo[4] ] : [ goodsRepo[0], goodsRepo[1] ], // (2元+4.5元=6.5元) 或 (2.5元+1.5元=4元)
      paid: isAdv ? 1000 : 500, // 找3.5元 或 找1元
      title: '第 5 关 · 两件购物结算'
    });

    return levels;
  }

  // ---------------- 游戏渲染与交互引擎 ----------------
  function startComboGame(targetElement, onExit) {
    activeGame = 'combo';
    container = targetElement;
    onExitCallback = onExit;

    var bag = getMoneyBag();
    var levels = createComboLevels(bag.range);

    currentRound = {
      game: 'combo',
      levelIdx: 0,
      levels: levels,
      stars: [0, 0, 0, 0, 0],
      selected: [],
      hadWrong: false,
      helped: false,
      passed: false,
      prevComboSig: null,
      feedback: '点击下方钱币，凑出目标金额。',
      feedbackGood: true
    };

    renderComboView();
  }

  function startCashierGame(targetElement, onExit) {
    activeGame = 'cashier';
    container = targetElement;
    onExitCallback = onExit;

    var bag = getMoneyBag();
    var levels = createCashierLevels(bag.range);

    currentRound = {
      game: 'cashier',
      levelIdx: 0,
      levels: levels,
      stars: [0, 0, 0, 0, 0],
      selected: [],
      hadWrong: false,
      helped: false,
      passed: false,
      feedback: '先核对商品总价与顾客付款，再选择找零或说明钱不够。',
      feedbackGood: true
    };

    renderCashierView();
  }

  function renderGameHeader(title, levelIdx, stars) {
    var starsHTML = '';
    for (var i = 0; i < 5; i++) {
      starsHTML += '<span class="game-star ' + (i < levelIdx ? (stars[i] ? 'is-won' : 'is-done') : (i === levelIdx ? 'is-current' : '')) + '">' + (stars[i] ? '⭐' : '★') + '</span>';
    }
    return '<div class="money-game-top">' +
      '<button type="button" class="btn btn-soft game-btn-back" data-game-action="quit">✕ 退出游戏</button>' +
      '<div class="game-top-title"><b>' + esc(title) + '</b><small>第 ' + (levelIdx + 1) + ' / 5 关</small></div>' +
      '<div class="game-stars-track">' + starsHTML + '</div>' +
      '</div>';
  }

  function renderComboView() {
    var r = currentRound;
    var lvl = r.levels[r.levelIdx];
    var currentCents = r.selected.reduce(function (sum, d) { return sum + d.value; }, 0);

    var html = '<div class="money-game-board combo-board">';
    html += renderGameHeader('凑钱小能手', r.levelIdx, r.stars);

    // 关卡目标卡片
    html += '<div class="game-mission-card">';
    html += '<p class="mission-label">' + esc(lvl.title) + '</p>';
    html += '<div class="mission-target">目标金额：<b class="target-amount">' + esc(formatCN(lvl.targetCents)) + '</b></div>';
    if (lvl.isAlt) {
      html += '<p class="mission-tip">💡 换一种付法：' + (r.prevComboSig ? '第一种付法已记录，请换一种不同的钱币数量组合！' : '先凑出一种付法，再用不同的钱币数量组合凑出同一金额！') + '</p>';
    }
    html += '</div>';

    // 已选付款区 (Tray)
    html += '<div class="game-stage-area">';
    html += '<div class="game-tray-head">';
    html += '<span>已放入付款区（合计：<b class="current-total ' + (currentCents === lvl.targetCents ? 'is-exact' : currentCents > lvl.targetCents ? 'is-over' : '') + '">' + esc(formatCN(currentCents)) + '</b>）</span>';
    html += '<div class="game-tray-btns">';
    html += '<button type="button" class="btn btn-soft btn-sm" data-game-action="undo" ' + (r.selected.length === 0 || r.passed ? 'disabled' : '') + '>↩ 撤回一张</button>';
    html += '<button type="button" class="btn btn-soft btn-sm" data-game-action="clear" ' + (r.selected.length === 0 || r.passed ? 'disabled' : '') + '>清空</button>';
    html += '</div>';
    html += '</div>';

    // 托盘中的钱币图标
    html += '<div class="game-tray-slots">';
    if (r.selected.length === 0) {
      html += '<p class="tray-empty-hint">点击下方的钱币加入这里</p>';
    } else {
      r.selected.forEach(function (d, idx) {
        html += '<button type="button" class="game-tray-coin" data-game-action="remove-item" data-index="' + idx + '" ' + (r.passed ? 'disabled' : '') + ' title="点击拿掉这张">' +
          MT.money.renderDenomSVG(d.id, d.type === 'coin' ? 52 : 94, d.type === 'coin' ? 52 : 52) +
          '</button>';
      });
    }
    html += '</div>';
    html += '</div>';

    // 反馈提示条
    html += '<div class="game-feedback-bar ' + (r.feedbackGood ? 'is-good' : 'is-warn') + '">' + esc(r.feedback) + '</div>';

    // 底部控制与可用钱币池
    if (!r.passed) {
      html += '<div class="game-denom-pool">';
      html += '<p class="pool-title">点击钱币放入付款区：</p>';
      html += '<div class="pool-grid">';
      lvl.denoms.forEach(function (id) {
        var d = MT.money.denomById[id];
        if (d) {
          html += '<button type="button" class="pool-denom-btn" data-game-action="add-denom" data-id="' + esc(d.id) + '">' +
            MT.money.renderDenomSVG(d.id, d.type === 'coin' ? 56 : 100, d.type === 'coin' ? 56 : 56) +
            '<span class="denom-btn-name">' + esc(d.shortName) + '</span>' +
            '</button>';
        }
      });
      html += '</div>';
      html += '</div>';

      html += '<div class="game-bottom-actions">';
      html += '<button type="button" class="btn btn-soft" data-game-action="hint">💡 提示</button>';
      html += '<button type="button" class="btn btn-main btn-lg" data-game-action="confirm-combo" ' + (currentCents === 0 ? 'disabled' : '') + '>确认凑好了 ✔</button>';
      html += '</div>';
    } else {
      html += '<div class="game-passed-banner">';
      html += '<div class="passed-title">🎉 凑对啦！太棒了！</div>';
      html += '<div class="game-bottom-actions">';
      html += '<button type="button" class="btn btn-main btn-lg" data-game-action="next-level">' + (r.levelIdx === 4 ? '查看最终挑战结果 →' : '进入下一关 →') + '</button>';
      html += '</div>';
      html += '</div>';
    }

    html += '</div>';
    container.innerHTML = html;
  }

  function renderCashierView() {
    var r = currentRound;
    var lvl = r.levels[r.levelIdx];
    var totalPrice = lvl.goods.reduce(function (sum, g) { return sum + g.price; }, 0);
    var changeNeeded = lvl.paid - totalPrice;
    var currentChange = r.selected.reduce(function (sum, d) { return sum + d.value; }, 0);

    var html = '<div class="money-game-board cashier-board">';
    html += renderGameHeader('小小收银员', r.levelIdx, r.stars);

    // 顾客购买信息与付款
    html += '<div class="cashier-counter-card">';
    html += '<div class="counter-goods-list">';
    html += '<span class="counter-label">顾客购买商品：</span>';
    html += '<div class="counter-goods-chips">';
    lvl.goods.forEach(function (g) {
      html += '<div class="counter-chip">🛍️ ' + esc(g.name) + ' <b class="chip-price">' + esc(formatCN(g.price)) + '</b></div>';
    });
    html += '</div>';
    if (lvl.goods.length > 1) {
      html += '<div class="counter-total">商品总价：<b>' + esc(formatCN(totalPrice)) + '</b></div>';
    }
    html += '</div>';

    html += '<div class="counter-payment-box">';
    html += '<span class="counter-label">顾客付了：</span>';
    html += '<div class="counter-paid-amount">💵 <b>' + esc(formatCN(lvl.paid)) + '</b></div>';
    html += '</div>';
    html += '</div>';

    // 找零与决策区
    if (!r.passed) {
      html += '<div class="cashier-action-desk">';
      html += '<div class="quick-decisions">';
      html += '<button type="button" class="btn btn-soft cashier-quick-btn" data-game-action="judge-not-enough">⚠️ 钱不够</button>';
      html += '<button type="button" class="btn btn-soft cashier-quick-btn" data-game-action="judge-exact">✅ 正好，不用找零</button>';
      html += '</div>';

      // 找零托盘
      html += '<div class="game-stage-area">';
      html += '<div class="game-tray-head">';
      html += '<span>应找零钱托盘（当前已凑：<b class="current-total">' + esc(formatCN(currentChange)) + '</b>）</span>';
      html += '<div class="game-tray-btns">';
      html += '<button type="button" class="btn btn-soft btn-sm" data-game-action="undo" ' + (r.selected.length === 0 ? 'disabled' : '') + '>↩ 撤回一张</button>';
      html += '<button type="button" class="btn btn-soft btn-sm" data-game-action="clear" ' + (r.selected.length === 0 ? 'disabled' : '') + '>清空</button>';
      html += '</div>';
      html += '</div>';

      html += '<div class="game-tray-slots">';
      if (r.selected.length === 0) {
        html += '<p class="tray-empty-hint">若需找零，点击下方钱币放入这里凑出找零金额</p>';
      } else {
        r.selected.forEach(function (d, idx) {
          html += '<button type="button" class="game-tray-coin" data-game-action="remove-item" data-index="' + idx + '" title="拿掉这张">' +
            MT.money.renderDenomSVG(d.id, d.type === 'coin' ? 52 : 94, d.type === 'coin' ? 52 : 52) +
            '</button>';
        });
      }
      html += '</div>';
      html += '</div>';

      // 钱币选择池
      var cashierDenoms = ['y10', 'y5', 'y1_c', 'j5_c', 'j1_c'];
      html += '<div class="game-denom-pool">';
      html += '<p class="pool-title">收银抽屉（点击拿取钱币找零）：</p>';
      html += '<div class="pool-grid">';
      cashierDenoms.forEach(function (id) {
        var d = MT.money.denomById[id];
        if (d) {
          html += '<button type="button" class="pool-denom-btn" data-game-action="add-denom" data-id="' + esc(d.id) + '">' +
            MT.money.renderDenomSVG(d.id, d.type === 'coin' ? 56 : 100, d.type === 'coin' ? 56 : 56) +
            '<span class="denom-btn-name">' + esc(d.shortName) + '</span>' +
            '</button>';
        }
      });
      html += '</div>';
      html += '</div>';

      // 提示条与提交
      html += '<div class="game-feedback-bar ' + (r.feedbackGood ? 'is-good' : 'is-warn') + '">' + esc(r.feedback) + '</div>';
      html += '<div class="game-bottom-actions">';
      html += '<button type="button" class="btn btn-soft" data-game-action="hint">💡 算式提示</button>';
      html += '<button type="button" class="btn btn-main btn-lg" data-game-action="confirm-cashier" ' + (currentChange === 0 ? 'disabled' : '') + '>确认找零 ✔</button>';
      html += '</div>';
      html += '</div>';
    } else {
      // 通过并展示核算
      html += '<div class="game-passed-banner cashier-audit-banner">';
      html += '<div class="passed-title">🎉 收银结算正确！</div>';
      html += '<div class="cashier-audit-details">';
      html += '<p><strong>收银核算：</strong>' + esc(formatCN(lvl.paid)) + ' － ' + esc(formatCN(totalPrice)) + ' ＝ ' + (changeNeeded > 0 ? esc(formatCN(changeNeeded)) : '0元') + '</p>';
      html += '<p><strong>反向核验：</strong>' + esc(formatCN(totalPrice)) + ' ＋ ' + (changeNeeded > 0 ? esc(formatCN(changeNeeded)) : '0元') + ' ＝ ' + esc(formatCN(lvl.paid)) + '（正好等于付的钱）</p>';
      html += '</div>';
      html += '<div class="game-bottom-actions">';
      html += '<button type="button" class="btn btn-main btn-lg" data-game-action="next-level">' + (r.levelIdx === 4 ? '查看收银挑战结果 →' : '接待下一位顾客 →') + '</button>';
      html += '</div>';
      html += '</div>';
    }

    html += '</div>';
    container.innerHTML = html;
  }

  function renderGameSummary() {
    var r = currentRound;
    var wonStars = r.stars.filter(function (s) { return s === 1; }).length;

    // 记录最佳星数与轮次
    var bag = getMoneyBag();
    var rec = bag.games[r.game] || (bag.games[r.game] = { rounds: 0, bestStars: 0 });
    rec.rounds = (rec.rounds || 0) + 1;
    rec.bestStars = Math.max(rec.bestStars || 0, wonStars);
    saveProgress();

    var isCombo = r.game === 'combo';
    var title = isCombo ? '凑钱小能手 · 挑战完成' : '小小收银员 · 营业结业';

    var html = '<div class="money-game-board game-summary-board">';
    html += '<article class="topic-card">';
    html += '<p class="topic-eyebrow">本轮 5 关全部通关！</p>';
    html += '<h3>' + esc(title) + '</h3>';
    html += '<div class="summary-stars-row">';
    for (var i = 0; i < 5; i++) {
      html += '<span class="big-star ' + (r.stars[i] ? 'is-won' : 'is-missed') + '">' + (r.stars[i] ? '⭐' : '☆') + '</span>';
    }
    html += '</div>';
    html += '<p class="summary-stars-copy">独立完成获得 <strong>' + wonStars + ' / 5 颗独立之星</strong>（历史最佳：' + rec.bestStars + ' 颗星，共玩 ' + rec.rounds + ' 轮）</p>';

    html += '<div class="summary-review-box">';
    html += '<b>知识小锦囊：</b>';
    if (isCombo) {
      html += '<p>• 相同的金额可以有许多种不同的付法，灵活使用元和角换算。</p>';
      html += '<p>• 1元＝10角，1角＝10分，付钱时先看面值上的数字和单位。</p>';
    } else {
      html += '<p>• 找零计算用减法：<strong>应找的钱 ＝ 付的钱 － 商品总价</strong>。</p>';
      html += '<p>• 还可以用加法验算：<strong>商品总价 ＋ 找零 ＝ 付款金额</strong>。</p>';
    }
    html += '</div>';

    html += '<div class="topic-actions">';
    html += '<button type="button" class="btn btn-main" data-game-action="replay">再挑战一轮 ↺</button>';
    html += '<button type="button" class="btn btn-soft" data-game-action="quit">返回练习页 →</button>';
    html += '</div>';

    html += '</article>';
    html += '</div>';
    container.innerHTML = html;
  }

  // ---------------- 事件处理 ----------------
  function handleComboAction(action, target) {
    var r = currentRound;
    var lvl = r.levels[r.levelIdx];

    if (action === 'add-denom') {
      var d = MT.money.denomById[target.dataset.id];
      if (d) {
        r.selected.push(d);
        MT.sound.play('click');
        r.feedback = '已加入 ' + d.shortName + '。';
        r.feedbackGood = true;
        renderComboView();
      }
    } else if (action === 'undo') {
      if (r.selected.length > 0) {
        var removed = r.selected.pop();
        MT.sound.play('click');
        r.feedback = '已拿掉 ' + removed.shortName + '。';
        r.feedbackGood = true;
        renderComboView();
      }
    } else if (action === 'clear') {
      r.selected = [];
      MT.sound.play('click');
      r.feedback = '已清空托盘。';
      r.feedbackGood = true;
      renderComboView();
    } else if (action === 'remove-item') {
      var idx = Number(target.dataset.index);
      if (!isNaN(idx) && idx >= 0 && idx < r.selected.length) {
        r.selected.splice(idx, 1);
        MT.sound.play('click');
        renderComboView();
      }
    } else if (action === 'confirm-combo') {
      var currentCents = r.selected.reduce(function (sum, d) { return sum + d.value; }, 0);
      if (currentCents === lvl.targetCents) {
        if (lvl.isAlt) {
          var curSig = getComboSignature(r.selected);
          if (!r.prevComboSig) {
            r.prevComboSig = curSig;
            r.feedback = '第一种付法凑对啦！已记录，现在换一种不同的钱币数量组合。';
            r.feedbackGood = true;
            MT.sound.play('right');
            renderComboView();
            return;
          }
          if (curSig === r.prevComboSig) {
            r.hadWrong = true;
            r.feedback = '这是上一次的付法哦，请换一种不同的钱币张数组合再试一次！';
            r.feedbackGood = false;
            MT.sound.play('wrong');
            renderComboView();
            return;
          }
        }
        // 成功！
        r.passed = true;
        if (!r.hadWrong && !r.helped) r.stars[r.levelIdx] = 1;
        MT.sound.play('right');
        r.feedback = '太棒了！金额正好匹配！';
        r.feedbackGood = true;
        renderComboView();
      } else if (currentCents < lvl.targetCents) {
        r.hadWrong = true;
        var diff = lvl.targetCents - currentCents;
        r.feedback = '还差 ' + formatCN(diff) + '，继续添加钱币吧！';
        r.feedbackGood = false;
        MT.sound.play('wrong');
        renderComboView();
      } else {
        r.hadWrong = true;
        var over = currentCents - lvl.targetCents;
        r.feedback = '超过了 ' + formatCN(over) + '，可以点击“撤回一张”拿掉多余的钱币。';
        r.feedbackGood = false;
        MT.sound.play('wrong');
        renderComboView();
      }
    } else if (action === 'hint') {
      r.helped = true;
      var currentCents = r.selected.reduce(function (sum, d) { return sum + d.value; }, 0);
      var diff = lvl.targetCents - currentCents;
      if (diff > 0) {
        r.feedback = '提示：目标金额是 ' + formatCN(lvl.targetCents) + '，当前已有 ' + formatCN(currentCents) + '，还差 ' + formatCN(diff) + '。';
      } else if (diff < 0) {
        r.feedback = '提示：当前已经超过了 ' + formatCN(Math.abs(diff)) + '，拿掉一些钱币吧。';
      } else {
        r.feedback = lvl.isAlt ? (r.prevComboSig ? '提示：金额已经正好啦，请确认这次的钱币组合与第一种不同。' : '提示：金额已经正好啦，点击“确认凑好了”记录第一种付法，再换一种组合。') : '提示：金额已经正好啦，点击“确认凑好了”即可通关！';
      }
      r.feedbackGood = true;
      renderComboView();
    } else if (action === 'next-level') {
      if (!r.passed) return;
      if (r.levelIdx < 4) {
        r.levelIdx++;
        r.selected = [];
        r.hadWrong = false;
        r.helped = false;
        r.passed = false;
        r.prevComboSig = null;
        r.feedback = '点击下方钱币，凑出目标金额。';
        r.feedbackGood = true;
        renderComboView();
      } else {
        renderGameSummary();
      }
    } else if (action === 'replay') {
      startComboGame(container, onExitCallback);
    } else if (action === 'quit') {
      exitGame();
    }
  }

  function handleCashierAction(action, target) {
    var r = currentRound;
    var lvl = r.levels[r.levelIdx];
    var totalPrice = lvl.goods.reduce(function (sum, g) { return sum + g.price; }, 0);
    var changeNeeded = lvl.paid - totalPrice;

    if (action === 'add-denom') {
      var d = MT.money.denomById[target.dataset.id];
      if (d) {
        r.selected.push(d);
        MT.sound.play('click');
        renderCashierView();
      }
    } else if (action === 'undo') {
      if (r.selected.length > 0) {
        r.selected.pop();
        MT.sound.play('click');
        renderCashierView();
      }
    } else if (action === 'clear') {
      r.selected = [];
      MT.sound.play('click');
      renderCashierView();
    } else if (action === 'remove-item') {
      var idx = Number(target.dataset.index);
      if (!isNaN(idx) && idx >= 0 && idx < r.selected.length) {
        r.selected.splice(idx, 1);
        MT.sound.play('click');
        renderCashierView();
      }
    } else if (action === 'judge-not-enough') {
      if (lvl.paid < totalPrice) {
        r.passed = true;
        if (!r.hadWrong && !r.helped) r.stars[r.levelIdx] = 1;
        MT.sound.play('right');
        r.feedback = '判断正确！顾客付了 ' + formatCN(lvl.paid) + '，商品需要 ' + formatCN(totalPrice) + '，钱不够。';
        r.feedbackGood = true;
        renderCashierView();
      } else {
        r.hadWrong = true;
        MT.sound.play('wrong');
        r.feedback = '再算算看：顾客付的钱是够的哦！';
        r.feedbackGood = false;
        renderCashierView();
      }
    } else if (action === 'judge-exact') {
      if (lvl.paid === totalPrice) {
        r.passed = true;
        if (!r.hadWrong && !r.helped) r.stars[r.levelIdx] = 1;
        MT.sound.play('right');
        r.feedback = '判断正确！付款正好等于商品总价，不需要找零。';
        r.feedbackGood = true;
        renderCashierView();
      } else if (lvl.paid < totalPrice) {
        r.hadWrong = true;
        MT.sound.play('wrong');
        r.feedback = '不对哦，顾客付的钱还不够买这些商品呢。';
        r.feedbackGood = false;
        renderCashierView();
      } else {
        r.hadWrong = true;
        MT.sound.play('wrong');
        r.feedback = '不对哦，顾客付了 ' + formatCN(lvl.paid) + '，超过了总价 ' + formatCN(totalPrice) + '，应该找零！';
        r.feedbackGood = false;
        renderCashierView();
      }
    } else if (action === 'confirm-cashier') {
      var currentChange = r.selected.reduce(function (sum, d) { return sum + d.value; }, 0);
      if (lvl.paid <= totalPrice) {
        r.hadWrong = true;
        MT.sound.play('wrong');
        r.feedback = '这单不需要找零，请点击上方的“钱不够”或“正好，不用找零”。';
        r.feedbackGood = false;
        renderCashierView();
        return;
      }
      if (currentChange === changeNeeded) {
        r.passed = true;
        if (!r.hadWrong && !r.helped) r.stars[r.levelIdx] = 1;
        MT.sound.play('right');
        r.feedback = '找零金额正好！收银结账成功！';
        r.feedbackGood = true;
        renderCashierView();
      } else if (currentChange < changeNeeded) {
        r.hadWrong = true;
        MT.sound.play('wrong');
        var diff = changeNeeded - currentChange;
        r.feedback = '找零还少 ' + formatCN(diff) + '，请继续添加找零钱币。';
        r.feedbackGood = false;
        renderCashierView();
      } else {
        r.hadWrong = true;
        MT.sound.play('wrong');
        var over = currentChange - changeNeeded;
        r.feedback = '找多了 ' + formatCN(over) + '，请拿掉一些钱币。';
        r.feedbackGood = false;
        renderCashierView();
      }
    } else if (action === 'hint') {
      r.helped = true;
      if (lvl.paid < totalPrice) {
        r.feedback = '提示：商品总价是 ' + formatCN(totalPrice) + '，顾客只付了 ' + formatCN(lvl.paid) + '。想一想钱够不够？';
      } else if (lvl.paid === totalPrice) {
        r.feedback = '提示：商品总价是 ' + formatCN(totalPrice) + '，顾客正好付了 ' + formatCN(lvl.paid) + '。需要找零吗？';
      } else {
        r.feedback = '提示：应找金额 ＝ 付款（' + formatCN(lvl.paid) + '）－ 总价（' + formatCN(totalPrice) + '）＝ ' + formatCN(changeNeeded) + '。';
      }
      r.feedbackGood = true;
      renderCashierView();
    } else if (action === 'next-level') {
      if (r.levelIdx < 4) {
        r.levelIdx++;
        r.selected = [];
        r.hadWrong = false;
        r.helped = false;
        r.passed = false;
        r.feedback = '先核对商品总价与顾客付款，再选择找零或说明钱不够。';
        r.feedbackGood = true;
        renderCashierView();
      } else {
        renderGameSummary();
      }
    } else if (action === 'replay') {
      startCashierGame(container, onExitCallback);
    } else if (action === 'quit') {
      exitGame();
    }
  }

  function onBoardClick(e) {
    var btn = e.target.closest('[data-game-action]');
    if (!btn || !activeGame) return;
    var action = btn.dataset.gameAction;
    if (activeGame === 'combo') handleComboAction(action, btn);
    else if (activeGame === 'cashier') handleCashierAction(action, btn);
  }

  function exitGame() {
    activeGame = null;
    currentRound = null;
    if (onExitCallback) onExitCallback();
  }

  MT.moneyGames = {
    init: function () {
      document.addEventListener('click', onBoardClick);
    },
    startCombo: startComboGame,
    startCashier: startCashierGame,
    getActiveGame: function () { return activeGame; },
    exit: exitGame
  };

})(typeof window !== 'undefined' ? (window.MT = window.MT || {}) : (typeof global !== 'undefined' ? (global.MT = global.MT || {}) : {}));
