(function (MT) {
  'use strict';

  var BADGES = [
    {
      id: 'star_starter',
      icon: '🌟',
      title: '启程小星',
      desc: '在探究台探索过加法、减法、乘法或除法',
      hint: '在探究台调整一次数字即可解锁'
    },
    {
      id: 'bubble_popper',
      icon: '🎈',
      title: '气球大王',
      desc: '在气球爆破中找齐指定结果',
      hint: '在游乐场玩一轮气球爆破即可解锁'
    },
    {
      id: 'impostor_hunter',
      icon: '🕵️',
      title: '神探火眼',
      desc: '找出藏在算式里的捣蛋鬼',
      hint: '在游乐场挑错游戏中成功抓到捣蛋鬼'
    },
    {
      id: 'streak_master',
      icon: '⚡',
      title: '连对神算',
      desc: '在闯关练习中连续答对 3 题',
      hint: '在闯关中保持连对'
    },
    {
      id: 'table_explorer',
      icon: '📋',
      title: '口诀宝典',
      desc: '在口诀表中点击展开算式详情',
      hint: '在口诀表中点开任意格子查看大图'
    },
    {
      id: 'level_champion',
      icon: '👑',
      title: '通关金冠',
      desc: '闯关成功通过当前运算的最后一关',
      hint: '通关当前运算的最后一关'
    },
    {
      id: 'mistake_slayer',
      icon: '🛡️',
      title: '错题克星',
      desc: '在错题本中消灭巩固过错题',
      hint: '在错题本中把错题练对'
    },
    {
      id: 'swap_magician',
      icon: '🔄',
      title: '对调魔术师',
      desc: '交换加数或因数，看看结果有没有变',
      hint: '在探究台点击交换'
    }
  ];

  [
    ['mixed', '🧩', '算式小侦探'],
    ['length', '📏', '测量小能手'],
    ['angle', '📐', '角度观察员'],
    ['time', '🕰️', '时间小管家'],
    ['mass', '⚖️', '称重小达人'],
    ['money', '🪙', '零钱小掌柜']
  ].forEach(function (item) {
    BADGES.push({
      id: 'topic_' + item[0],
      topic: item[0],
      icon: item[1],
      title: item[2],
      desc: '每个知识点至少独立答对 1 题',
      hint: '每个知识点独立答对 1 题；看过提示或答错后完成的不计入'
    });
  });

  var previousFocus = null;
  var initialized = false;

  function topicProgress(id) {
    var model = MT[id];
    var skills = model && model.skills || [];
    var bag = MT.progress && MT.progress.topics && MT.progress.topics[id];
    var done = skills.filter(function (skill) {
      var count = bag && bag.skills && bag.skills[skill.id] && bag.skills[skill.id].clean;
      return typeof count === 'number' && isFinite(count) && count >= 1;
    }).length;
    return { done: done, total: skills.length };
  }

  function checkTopic(id, silent) {
    var badge = BADGES.filter(function (b) { return b.topic === id; })[0];
    if (!badge) return;
    var progress = topicProgress(id);
    if (progress.total && progress.done === progress.total) unlock(badge.id, silent);
  }

  function getBadges() {
    if (!MT.progress) return [];
    if (!Array.isArray(MT.progress.badges)) MT.progress.badges = [];
    return MT.progress.badges;
  }

  function has(id) {
    var list = getBadges();
    return list.indexOf(id) !== -1;
  }

  function showToast(badge) {
    var toast = document.getElementById('badge-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'badge-toast';
      toast.className = 'badge-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.innerHTML =
      '<div class="toast-sparkle">🎉 获得新勋章！</div>' +
      '<div class="toast-body">' +
      '<span class="toast-icon">' + badge.icon + '</span>' +
      '<span class="toast-title">' + badge.title + '</span>' +
      '</div>';
    toast.classList.remove('is-show');
    void toast.offsetWidth;
    toast.classList.add('is-show');

    if (MT.confetti) MT.confetti.burst();
    if (MT.sound) MT.sound.play('win');

    setTimeout(function () {
      toast.classList.remove('is-show');
    }, 3800);
  }

  function unlock(id, silent) {
    if (!MT.progress) return;
    if (has(id)) return;
    var badge = null;
    for (var i = 0; i < BADGES.length; i++) {
      if (BADGES[i].id === id) { badge = BADGES[i]; break; }
    }
    if (!badge) return;

    var list = getBadges();
    list.push(id);
    if (MT.storage && MT.storage.save) MT.storage.save();
    if (!silent) showToast(badge);
    renderModal();
  }

  function renderModal() {
    var grid = document.getElementById('badge-grid');
    var stat = document.getElementById('badge-stat');
    if (!grid) return;

    var list = getBadges();
    var collected = BADGES.filter(function (b) { return list.indexOf(b.id) !== -1; }).length;
    if (stat) stat.textContent = '已收集 ' + collected + ' / ' + BADGES.length + ' 枚勋章';

    grid.innerHTML = '';
    for (var i = 0; i < BADGES.length; i++) {
      var b = BADGES[i];
      var progress = b.topic ? topicProgress(b.topic) : null;
      var isUnlocked = list.indexOf(b.id) !== -1;
      var card = document.createElement('div');
      card.className = 'badge-card' + (isUnlocked ? ' is-unlocked' : ' is-locked');

      var iconWrap = document.createElement('div');
      iconWrap.className = 'badge-icon-wrap';
      iconWrap.innerHTML = '<span class="badge-icon">' + (isUnlocked ? b.icon : '🔒') + '</span>';

      var info = document.createElement('div');
      info.className = 'badge-info';
      info.innerHTML =
        '<div class="badge-title">' + b.title + '</div>' +
        '<div class="badge-desc">' + (isUnlocked ? b.desc : b.hint) + '</div>' +
        '<div class="badge-tag">' + (isUnlocked ? '✓ 已获得' : '探索中…') + (progress ? ' · 已独立完成 ' + progress.done + ' / ' + progress.total + ' 个知识点' : '') + '</div>';

      card.appendChild(iconWrap);
      card.appendChild(info);
      grid.appendChild(card);
    }
  }

  function openModal() {
    var m = document.getElementById('badges-modal');
    if (!m) return;
    if (m.hidden) previousFocus = document.activeElement;
    BADGES.forEach(function (b) { if (b.topic) checkTopic(b.topic, true); });
    renderModal();
    m.hidden = false;
    var closeBtn = document.getElementById('badges-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeModal() {
    var m = document.getElementById('badges-modal');
    if (!m || m.hidden) return;
    m.hidden = true;
    if (previousFocus && previousFocus.isConnected) previousFocus.focus();
    previousFocus = null;
  }

  MT.badges = {
    init: function () {
      if (initialized) return;
      initialized = true;
      var btn = document.getElementById('btn-badges');
      if (btn) {
        btn.addEventListener('click', function () {
          if (MT.sound) MT.sound.play('click');
          openModal();
        });
      }
      var closeBtn = document.getElementById('badges-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
      }
      var modal = document.getElementById('badges-modal');
      if (modal) {
        modal.addEventListener('click', function (e) {
          if (e.target === modal) closeModal();
        });
        document.addEventListener('keydown', function (e) {
          if (modal.hidden) return;
          if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
          if (e.key === 'Tab') {
            var nodes = Array.prototype.filter.call(modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'), function (el) {
              return !el.disabled && !el.hidden && el.getAttribute('aria-hidden') !== 'true';
            });
            var first = nodes[0], last = nodes[nodes.length - 1];
            if (!first) return;
            if (!modal.contains(document.activeElement) || (e.shiftKey ? document.activeElement === first : document.activeElement === last)) {
              e.preventDefault();
              (e.shiftKey ? last : first).focus();
            }
          }
        });
      }
    },
    unlock: unlock,
    checkTopic: checkTopic,
    has: has,
    open: openModal,
    close: closeModal
  };
})(window.MT = window.MT || {});
