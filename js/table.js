(function (MT) {
  'use strict';

  var cur = null;
  var vizType = 'array';
  var dom = {};
  var lastCell = null;

  function isSheetMode() {
    return !!(window.matchMedia && window.matchMedia('(max-width: 639px)').matches);
  }

  function build() {
    var t = dom.table;
    var mod = MT.op.current();
    t.innerHTML = '';

    var thead = document.createElement('thead');
    var hr = document.createElement('tr');
    var corner = document.createElement('th');
    corner.textContent = mod.corner;
    corner.className = 'table-corner';
    hr.appendChild(corner);
    for (var a = 1; a <= 9; a++) {
      var th = document.createElement('th');
      th.textContent = mod.colHead(a);
      th.scope = 'col';
      hr.appendChild(th);
    }
    thead.appendChild(hr);
    t.appendChild(thead);

    var tb = document.createElement('tbody');
    for (var b = 1; b <= 9; b++) {
      var tr = document.createElement('tr');
      var rh = document.createElement('th');
      rh.textContent = mod.rowHead(b);
      rh.scope = 'row';
      tr.appendChild(rh);
      for (var a2 = 1; a2 <= 9; a2++) {
        var td = document.createElement('td');
        if (mod.omit(a2, b)) {
          var empty = document.createElement('div');
          empty.className = 'cell-empty';
          td.appendChild(empty);
        } else {
          var spec = mod.cell(a2, b);
          var cell = document.createElement('button');
          cell.type = 'button';
          cell.className = 'cell' + (mod.id === 'div' ? ' is-div-cell' : '');
          cell.dataset.a = a2;
          cell.dataset.b = b;
          cell.innerHTML = spec.html;
          cell.setAttribute('aria-label', spec.aria);
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
    var mod = MT.op.current();
    var book = mod.bag(MT.progress);
    var k = mod.cellKey(a, b);
    if (book.wrong[k]) return 'is-wrong';
    if (book.needs[k]) return 'is-practice';
    if (book.mastered[k]) return 'is-mastered';
    return '';
  }

  function refresh() {
    if (!dom.table) return;
    var cells = dom.table.querySelectorAll('.cell');
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i];
      var a = parseInt(c.dataset.a, 10), b = parseInt(c.dataset.b, 10);
      c.classList.remove('is-mastered', 'is-practice', 'is-wrong', 'is-on');
      var st = cellState(a, b);
      if (st) c.classList.add(st);
      if (cur && cur.a === a && cur.b === b) c.classList.add('is-on');
    }
    if (dom.stat) dom.stat.textContent = MT.op.current().stat(MT.progress);
    updateScrollHint();
  }

  function updateScrollHint() {
    if (!dom.scrollHint || !dom.wrap) return;
    var canScroll = dom.wrap.scrollWidth > dom.wrap.clientWidth + 6;
    if (!canScroll) {
      dom.scrollHint.hidden = true;
      return;
    }
    var atEnd = (dom.wrap.scrollLeft + dom.wrap.clientWidth) >= (dom.wrap.scrollWidth - 10);
    if (atEnd) {
      dom.scrollHint.textContent = '👈 滑动查看前面列';
    } else {
      dom.scrollHint.textContent = '👈 左右滑动查看完整表格 👉';
    }
    dom.scrollHint.hidden = false;
  }

  function renderDetail() {
    if (!cur) return;
    var a = cur.a, b = cur.b;
    var body = dom.detailBody;
    var mod = MT.op.current();
    var info = mod.detail(a, b, MT.progress);
    var book = mod.bag(MT.progress);
    var k = info.key;

    body.innerHTML = '';

    var head = document.createElement('div');
    head.className = 'detail-head';
    var eq = document.createElement('div');
    eq.className = 'detail-eq';
    eq.innerHTML = info.eqHTML;

    var kj = document.createElement('div');
    kj.className = 'detail-koujue';
    kj.textContent = info.koujueText;

    head.appendChild(eq);
    head.appendChild(kj);
    body.appendChild(head);

    if (info.nameHTML) {
      var nameRow = document.createElement('div');
      nameRow.className = 'sum-desc';
      nameRow.style.marginBottom = '10px';
      nameRow.innerHTML = info.nameHTML;
      body.appendChild(nameRow);
    }

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
      var heard = MT.op.current().speakCell(a, b);
      MT.speech.play(heard.text, heard.scene);
    });
    acts.appendChild(bSay);

    var bOk = document.createElement('button');
    bOk.type = 'button';
    bOk.className = 'btn';
    var isM = !!book.mastered[k];
    bOk.textContent = isM ? '取消掌握' : '已掌握';
    bOk.addEventListener('click', function () {
      MT.sound.play('click');
      var live = MT.op.current().bag(MT.progress);
      if (live.mastered[k]) {
        delete live.mastered[k];
      } else {
        live.mastered[k] = true;
        delete live.needs[k];
        delete live.wrong[k];
      }
      MT.storage.save();
      MT.bus.emit('progress:change', { key: k });
    });
    acts.appendChild(bOk);

    var bAgain = document.createElement('button');
    bAgain.type = 'button';
    bAgain.className = 'btn';
    var isNP = !!book.needs[k];
    bAgain.textContent = isNP ? '取消标记' : '需再练';
    bAgain.addEventListener('click', function () {
      MT.sound.play('click');
      var live = MT.op.current().bag(MT.progress);
      if (live.needs[k]) {
        delete live.needs[k];
      } else {
        live.needs[k] = true;
        delete live.mastered[k];
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
    var view = MT.op.current().detail(cur.a, cur.b, MT.progress).viz(vizType, true);
    MT.visuals.render(box, view.type, view.opts);
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
    var heard = MT.op.current().speakCell(a, b);
    MT.speech.play(heard.text, heard.scene);
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
      dom.scrollHint = document.getElementById('table-scroll-hint');
      dom.wrap = document.getElementById('table-wrap') || document.querySelector('.table-wrap');
      dom.detail = document.getElementById('table-detail');
      dom.detailBody = document.getElementById('detail-body');
      dom.detailClose = document.getElementById('detail-close');
      dom.backdrop = document.getElementById('sheet-backdrop');
      dom.split = document.querySelector('.table-split');

      dom.table.addEventListener('click', function (e) {
        var t = e.target && e.target.closest ? e.target.closest('.cell') : null;
        if (!t || !t.dataset || !t.dataset.a) return;
        open(parseInt(t.dataset.a, 10), parseInt(t.dataset.b, 10), t);
      });

      if (dom.wrap) {
        dom.wrap.addEventListener('scroll', updateScrollHint, { passive: true });
      }
      window.addEventListener('resize', updateScrollHint);

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
      updateScrollHint();
    }
  };
})(window.MT = window.MT || {});
