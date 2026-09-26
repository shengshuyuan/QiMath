(function (MT) {
  'use strict';

  var cur = null;
  var vizType = 'array';
  var dom = {};
  var lastCell = null;

  function isDiv() {
    return MT.progress && MT.progress.settings && MT.progress.settings.op === 'div';
  }

  function isTriangle() {
    var st = MT.progress && MT.progress.settings;
    return !st || st.tableMode !== 'full';
  }

  function isSheetMode() {
    return !!(window.matchMedia && window.matchMedia('(max-width: 639px)').matches);
  }

  function build() {
    var t = dom.table;
    t.innerHTML = '';
    var divMode = isDiv();
    var tri = !divMode && isTriangle();

    var thead = document.createElement('thead');
    var hr = document.createElement('tr');
    var corner = document.createElement('th');
    corner.textContent = divMode ? '÷' : '×';
    hr.appendChild(corner);
    for (var a = 1; a <= 9; a++) {
      var th = document.createElement('th');
      th.textContent = a;
      th.scope = 'col';
      th.title = divMode ? '商 ' + a : '因数 ' + a;
      hr.appendChild(th);
    }
    thead.appendChild(hr);
    t.appendChild(thead);

    var tb = document.createElement('tbody');
    for (var b = 1; b <= 9; b++) {
      var tr = document.createElement('tr');
      var rh = document.createElement('th');
      rh.textContent = b;
      rh.scope = 'row';
      rh.title = divMode ? '除数 ' + b : '因数 ' + b;
      tr.appendChild(rh);
      for (var a2 = 1; a2 <= 9; a2++) {
        var td = document.createElement('td');
        if (tri && a2 > b) {
          var empty = document.createElement('div');
          empty.className = 'cell-empty';
          td.appendChild(empty);
        } else {
          var cell = document.createElement('button');
          cell.type = 'button';
          cell.className = 'cell';
          cell.dataset.a = a2;
          cell.dataset.b = b;
          if (divMode) {
            cell.textContent = a2 * b;
            cell.setAttribute('aria-label', (a2 * b) + '除以' + b + '等于' + a2);
          } else {
            cell.textContent = a2 * b;
            cell.setAttribute('aria-label', MT.core.koujue(a2, b));
          }
          td.appendChild(cell);
        }
        tr.appendChild(td);
      }
      tb.appendChild(tr);
    }
    t.appendChild(tb);
    refresh();
  }

  function cellState(a, b) {
    var p = MT.progress;
    if (isDiv()) {
      var dk = (a * b) + 'd' + b;
      if (p.divWrong && p.divWrong[dk]) return 'is-wrong';
      if (p.divNeedsPractice && p.divNeedsPractice[dk]) return 'is-practice';
      if (p.divMastered && p.divMastered[dk]) return 'is-mastered';
      return '';
    }
    var k = MT.core.canon(a, b);
    if (p.wrong[k]) return 'is-wrong';
    if (p.needsPractice[k]) return 'is-practice';
    if (p.mastered[k]) return 'is-mastered';
    return '';
  }

  function refresh() {
    var cells = dom.table.querySelectorAll('.cell');
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i];
      var a = parseInt(c.dataset.a, 10), b = parseInt(c.dataset.b, 10);
      c.classList.remove('is-mastered', 'is-practice', 'is-wrong', 'is-on');
      var st = cellState(a, b);
      if (st) c.classList.add(st);
      if (cur && cur.a === a && cur.b === b) c.classList.add('is-on');
    }
    if (isDiv()) {
      var divKeys = MT.core.allDivKeys();
      var dn = 0;
      for (var di = 0; di < divKeys.length; di++) {
        if (MT.progress.divMastered && MT.progress.divMastered[divKeys[di]]) dn++;
      }
      dom.stat.textContent = '表内除法表 · 已掌握 ' + dn + ' / ' + divKeys.length;
    } else {
      var keys = MT.core.triangleKeys();
      var n = 0;
      for (var j = 0; j < keys.length; j++) {
        if (MT.progress.mastered[keys[j]]) n++;
      }
      dom.stat.textContent = '乘法口诀表 · 已掌握 ' + n + ' / ' + keys.length;
    }
  }

  function renderDetail() {
    if (!cur) return;
    var a = cur.a, b = cur.b;
    var body = dom.detailBody;
    var divMode = isDiv();
    var p = MT.progress;

    body.innerHTML = '';

    var head = document.createElement('div');
    head.className = 'detail-head';
    var eq = document.createElement('div');
    eq.className = 'detail-eq';

    var kj = document.createElement('div');
    kj.className = 'detail-koujue';

    var k;
    if (divMode) {
      var nVal = a * b;
      k = nVal + 'd' + b;
      var dBadge = (p.divMastered && p.divMastered[k]) ? '已掌握' :
        ((p.divWrong && p.divWrong[k]) ? '答错过' :
        ((p.divNeedsPractice && p.divNeedsPractice[k]) ? '需再练' : ''));
      eq.innerHTML = '<span class="tk-brand">' + nVal + '</span> ÷ <span class="tk-accent">' + b + '</span> = ' + a;
      var dParts = MT.core.divParts(b, a, 'share');
      kj.textContent = '💡 想乘法口诀：' + dParts.chant + '，商是 ' + a + (dBadge ? '　' + dBadge : '');
    } else {
      k = MT.core.canon(a, b);
      var badge = p.mastered[k] ? '已掌握' : (p.wrong[k] ? '答错过' : (p.needsPractice[k] ? '需再练' : ''));
      eq.innerHTML = '<span class="tk-brand">' + a + '</span> × <span class="tk-accent">' + b + '</span> = ' + (a * b);
      kj.textContent = MT.core.koujue(a, b) + (badge ? '　' + badge : '');
    }

    head.appendChild(eq);
    head.appendChild(kj);
    body.appendChild(head);

    var seg = document.createElement('div');
    seg.className = 'seg seg-viz';
    var views = ['array', 'groups', 'numberline', 'area'];
    for (var vi = 0; vi < views.length; vi++) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'seg-btn' + (views[vi] === vizType ? ' is-on' : '');
      btn.dataset.viz = views[vi];
      btn.textContent = MT.visuals.label[views[vi]];
      seg.appendChild(btn);
    }
    body.appendChild(seg);

    var viz = document.createElement('div');
    viz.className = 'detail-viz';
    body.appendChild(viz);

    var acts = document.createElement('div');
    acts.className = 'detail-actions';

    var bSay = document.createElement('button');
    bSay.type = 'button';
    bSay.className = 'btn btn-main';
    bSay.textContent = '读一遍';
    bSay.addEventListener('click', function () {
      MT.speech.warmup();
      if (divMode) {
        var dp = MT.core.divParts(b, a, 'share');
        MT.speech.play(dp.read, 'calc');
      } else {
        MT.speech.play(MT.core.read(a, b), 'koujue');
      }
    });
    acts.appendChild(bSay);

    var bOk = document.createElement('button');
    bOk.type = 'button';
    bOk.className = 'btn';
    var isM = divMode ? (p.divMastered && p.divMastered[k]) : p.mastered[k];
    bOk.textContent = isM ? '取消掌握' : '已掌握';
    bOk.addEventListener('click', function () {
      MT.sound.play('click');
      if (divMode) {
        p.divMastered = p.divMastered || {};
        p.divNeedsPractice = p.divNeedsPractice || {};
        p.divWrong = p.divWrong || {};
        if (p.divMastered[k]) {
          delete p.divMastered[k];
        } else {
          p.divMastered[k] = true;
          delete p.divNeedsPractice[k];
          delete p.divWrong[k];
        }
      } else {
        if (p.mastered[k]) {
          delete p.mastered[k];
        } else {
          p.mastered[k] = true;
          delete p.needsPractice[k];
          delete p.wrong[k];
        }
      }
      MT.storage.save();
      MT.bus.emit('progress:change', { key: k });
    });
    acts.appendChild(bOk);

    var bAgain = document.createElement('button');
    bAgain.type = 'button';
    bAgain.className = 'btn';
    var isNP = divMode ? (p.divNeedsPractice && p.divNeedsPractice[k]) : p.needsPractice[k];
    bAgain.textContent = isNP ? '取消标记' : '需再练';
    bAgain.addEventListener('click', function () {
      MT.sound.play('click');
      if (divMode) {
        p.divMastered = p.divMastered || {};
        p.divNeedsPractice = p.divNeedsPractice || {};
        if (p.divNeedsPractice[k]) {
          delete p.divNeedsPractice[k];
        } else {
          p.divNeedsPractice[k] = true;
          delete p.divMastered[k];
        }
      } else {
        if (p.needsPractice[k]) {
          delete p.needsPractice[k];
        } else {
          p.needsPractice[k] = true;
          delete p.mastered[k];
        }
      }
      MT.storage.save();
      MT.bus.emit('progress:change', { key: k });
    });
    acts.appendChild(bAgain);

    body.appendChild(acts);

    seg.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.dataset || !t.dataset.viz) return;
      vizType = t.dataset.viz;
      var kids = seg.children;
      for (var i = 0; i < kids.length; i++) {
        kids[i].classList.toggle('is-on', kids[i].dataset.viz === vizType);
      }
      MT.sound.play('click');
      drawViz();
    });

    drawViz();
  }

  function drawViz() {
    if (!cur) return;
    var box = dom.detailBody.querySelector('.detail-viz');
    if (!box) return;
    if (isDiv()) {
      MT.visuals.render(box, vizType, { a: cur.b, b: cur.a, story: 'share', animate: true });
    } else {
      MT.visuals.render(box, vizType, { a: cur.a, b: cur.b, animate: true });
    }
  }

  // 窗口在桌面/手机宽度之间变化时，同步弹层相关的状态
  function syncMode() {
    if (!cur) return;
    var sheet = isSheetMode();
    dom.detail.setAttribute('aria-modal', sheet ? 'true' : 'false');
    if (dom.backdrop) dom.backdrop.hidden = !sheet;
    document.body.classList.toggle('no-scroll', sheet);
  }

  function open(a, b, trigger) {
    if (trigger) lastCell = trigger;
    cur = { a: a, b: b };
    if (MT.badges) MT.badges.unlock('table_explorer');
    var sheet = isSheetMode();
    if (dom.detail) dom.detail.setAttribute('aria-modal', sheet ? 'true' : 'false');
    dom.detail.hidden = false;
    if (dom.backdrop) dom.backdrop.hidden = !sheet;
    if (dom.split) dom.split.classList.add('has-detail');
    if (sheet) document.body.classList.add('no-scroll');
    renderDetail();
    refresh();
    MT.speech.warmup();
    MT.sound.play('click');
    MT.speech.play(MT.core.read(a, b), 'koujue');
    if (sheet && dom.detailClose) {
      try { dom.detailClose.focus(); } catch (e) {}
    }
  }

  function close() {
    if (!cur && dom.detail.hidden) return;
    cur = null;
    dom.detail.hidden = true;
    if (dom.backdrop) dom.backdrop.hidden = true;
    if (dom.split) dom.split.classList.remove('has-detail');
    document.body.classList.remove('no-scroll');
    refresh();
    if (lastCell && lastCell.focus && document.contains(lastCell)) {
      try { lastCell.focus(); } catch (e) {}
    }
  }

  MT.table = {
    init: function () {
      dom.table = document.getElementById('mul-table');
      dom.stat = document.getElementById('table-stat');
      dom.detail = document.getElementById('table-detail');
      dom.detailBody = document.getElementById('detail-body');
      dom.detailClose = document.getElementById('detail-close');
      dom.backdrop = document.getElementById('sheet-backdrop');
      dom.split = document.querySelector('.table-split');

      dom.table.addEventListener('click', function (e) {
        var t = e.target;
        if (!t || !t.dataset || !t.dataset.a) return;
        open(parseInt(t.dataset.a, 10), parseInt(t.dataset.b, 10), t);
      });

      dom.detailClose.addEventListener('click', close);
      if (dom.backdrop) dom.backdrop.addEventListener('click', close);

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !dom.detail.hidden) close();
      });

      MT.bus.on('progress:change', function () {
        if (cur) renderDetail();
        refresh();
      });

      build();
    },

    build: build,
    refresh: refresh,
    close: close,
    redraw: function () {
      syncMode();
      drawViz();
    }
  };
})(window.MT = window.MT || {});
