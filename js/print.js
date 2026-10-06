(function (MT) {
  'use strict';

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined && txt !== null) e.textContent = String(txt);
    return e;
  }

  function header(title, subtitle) {
    var h = el('div', 'print-head');
    h.appendChild(el('div', 'print-title', title));
    var metaText = (subtitle || '九九乘法表练习') + '　　姓名 __________　　日期 __________';
    h.appendChild(el('div', 'print-meta', metaText));
    return h;
  }

  function meta() {
    var mod = MT.op.current();
    return (mod && mod.printMeta) || {
      blankTitle: '空白口诀表',
      subtitle: '九九乘法表练习',
      answerTitle: '参考答案',
      problemTitle: function (n) { return '算一算（共 ' + n + ' 题）'; }
    };
  }

  function blankGrid() {
    var mod = MT.op.current();
    var isDiv = mod && mod.id === 'div';
    var grid = el('div', 'pt-grid');
    grid.appendChild(el('div', 'pt-cell pt-corner', isDiv ? '÷' : '×'));
    for (var a = 1; a <= 9; a++) {
      grid.appendChild(el('div', 'pt-cell pt-head', isDiv ? ('商' + a) : a));
    }
    for (var b = 1; b <= 9; b++) {
      grid.appendChild(el('div', 'pt-cell pt-head', isDiv ? ('÷' + b) : b));
      for (var a2 = 1; a2 <= 9; a2++) grid.appendChild(el('div', 'pt-cell pt-blank'));
    }
    return grid;
  }

  function blankSheet() {
    var mod = MT.op.current();
    var info = meta();
    var s = el('div', 'print-sheet');
    s.appendChild(header(info.blankTitle, info.subtitle));
    if (mod && mod.blankRows) {
      var rows = mod.blankRows();
      var table = document.createElement('table');
      table.className = 'pt-decomp';
      var thead = document.createElement('thead');
      var headRow = document.createElement('tr');
      var headCell = document.createElement('td');
      headCell.appendChild(header(info.blankTitle, info.subtitle));
      headRow.appendChild(headCell);
      thead.appendChild(headRow);
      table.appendChild(thead);
      var body = document.createElement('tbody');
      for (var i = 0; i < rows.length; i++) {
        var tr = document.createElement('tr');
        var td = document.createElement('td');
        var row = el('div', 'pt-sum-row');
        row.appendChild(el('div', 'pt-sum-label', rows[i].label));
        var cells = el('div', 'pt-sum-cells');
        for (var c = 0; c < rows[i].cells.length; c++) {
          cells.appendChild(el('div', 'pt-sum-cell', rows[i].cells[c]));
        }
        row.appendChild(cells);
        td.appendChild(row);
        tr.appendChild(td);
        body.appendChild(tr);
      }
      table.appendChild(body);
      s.appendChild(table);
      return s;
    }
    var t = el('div', 'print-table');
    t.appendChild(blankGrid());
    s.appendChild(t);
    return s;
  }

  function pickProblems(n) {
    var mod = MT.op.current();
    var p = MT.progress;
    var b = mod.bag(p);
    var allKeys = mod.keys();
    var wrong = Object.keys(b.wrong);
    var un = [], rest = [];
    for (var i = 0; i < allKeys.length; i++) {
      var k = allKeys[i];
      if (wrong.indexOf(k) !== -1) continue;
      if (b.mastered[k]) rest.push(k);
      else un.push(k);
    }
    var out = MT.core.shuffle(wrong)
      .concat(MT.core.shuffle(un))
      .concat(MT.core.shuffle(rest));
    return out.slice(0, n);
  }

  function problemSheet(keys, title, subtitle) {
    var mod = MT.op.current();
    var s = el('div', 'print-sheet');
    s.appendChild(header(title, subtitle));
    var grid = el('div', 'print-problems');
    for (var i = 0; i < keys.length; i++) {
      grid.appendChild(el('div', 'print-problem', mod.problemText(keys[i])));
    }
    s.appendChild(grid);
    return s;
  }

  function answerSheet(keys, subtitle) {
    var mod = MT.op.current();
    var info = meta();
    var s = el('div', 'print-sheet');
    s.appendChild(header(info.answerTitle, subtitle));
    var grid = el('div', 'print-problems print-answers');
    for (var i = 0; i < keys.length; i++) {
      grid.appendChild(el('div', 'print-problem', mod.answerText(keys[i])));
    }
    s.appendChild(grid);
    return s;
  }

  var clearTimer = null;

  function clear() {
    if (clearTimer) { clearTimeout(clearTimer); clearTimer = null; }
    var root = document.getElementById('print-root');
    if (root) root.innerHTML = '';
  }

  MT.print = {
    run: function () {
      var root = document.getElementById('print-root');
      if (!root) return;
      clear();
      var info = meta();
      var subtitle = info.subtitle;
      var keys = pickProblems(20);
      root.appendChild(blankSheet());
      var title = info.problemTitle(keys.length);
      root.appendChild(problemSheet(keys, title, subtitle));
      var st = MT.progress && MT.progress.settings;
      if (st && st.printAnswers === 'on') {
        root.appendChild(answerSheet(keys, subtitle));
      }

      try { window.print(); } catch (e) {}
      // 以 afterprint 为主，长延迟兜底防止慢速打印预览下 DOM 被提前清空
      if (clearTimer) clearTimeout(clearTimer);
      clearTimer = window.setTimeout(clear, 60000);
    }
  };

  window.addEventListener('afterprint', function () {
    if (clearTimer) { clearTimeout(clearTimer); clearTimer = null; }
    window.setTimeout(clear, 300);
  });
})(window.MT = window.MT || {});
