(function (MT) {
  'use strict';

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined && txt !== null) e.textContent = String(txt);
    return e;
  }

  function header(title) {
    var h = el('div', 'print-head');
    h.appendChild(el('div', 'print-title', title));
    h.appendChild(el('div', 'print-meta', '九九乘法表练习　　姓名 __________　　日期 __________'));
    return h;
  }

  function blankSheet() {
    var s = el('div', 'print-sheet');
    s.appendChild(header('空白口诀表'));
    var t = el('div', 'print-table');
    var grid = el('div', 'pt-grid');
    grid.appendChild(el('div', 'pt-cell pt-corner', '×'));
    for (var a = 1; a <= 9; a++) grid.appendChild(el('div', 'pt-cell pt-head', a));
    for (var b = 1; b <= 9; b++) {
      grid.appendChild(el('div', 'pt-cell pt-head', b));
      for (var a2 = 1; a2 <= 9; a2++) grid.appendChild(el('div', 'pt-cell pt-blank'));
    }
    t.appendChild(grid);
    s.appendChild(t);
    return s;
  }

  function pickProblems(n) {
    var p = MT.progress;
    var tri = MT.core.triangleKeys();
    var wrong = Object.keys(p.wrong);
    var un = [], rest = [];
    for (var i = 0; i < tri.length; i++) {
      var k = tri[i];
      if (wrong.indexOf(k) !== -1) continue;
      if (p.mastered[k]) rest.push(k);
      else un.push(k);
    }
    var out = MT.core.shuffle(wrong)
      .concat(MT.core.shuffle(un))
      .concat(MT.core.shuffle(rest));
    return out.slice(0, n);
  }

  function problemSheet(keys, title) {
    var s = el('div', 'print-sheet');
    s.appendChild(header(title));
    var grid = el('div', 'print-problems');
    for (var i = 0; i < keys.length; i++) {
      var f = MT.core.parse(keys[i]);
      grid.appendChild(el('div', 'print-problem', f.a + ' × ' + f.b + ' = ______'));
    }
    s.appendChild(grid);
    return s;
  }

  function answerSheet(keys) {
    var s = el('div', 'print-sheet');
    s.appendChild(header('参考答案'));
    var grid = el('div', 'print-problems print-answers');
    for (var i = 0; i < keys.length; i++) {
      var f = MT.core.parse(keys[i]);
      grid.appendChild(el('div', 'print-problem', f.a + ' × ' + f.b + ' = ' + (f.a * f.b)));
    }
    s.appendChild(grid);
    return s;
  }

  function clear() {
    var root = document.getElementById('print-root');
    if (root) root.innerHTML = '';
  }

  MT.print = {
    run: function () {
      var root = document.getElementById('print-root');
      if (!root) return;
      root.innerHTML = '';
      var keys = pickProblems(20);
      root.appendChild(blankSheet());
      root.appendChild(problemSheet(keys, '算一算（共 ' + keys.length + ' 题）'));
      var st = MT.progress && MT.progress.settings;
      if (st && st.printAnswers === 'on') root.appendChild(answerSheet(keys));

      try { window.print(); } catch (e) {}
      // 以 afterprint 为主，这里只是兜底（部分浏览器打印是异步的）
      window.setTimeout(clear, 3000);
    }
  };

  window.addEventListener('afterprint', function () {
    window.setTimeout(clear, 300);
  });
})(window.MT = window.MT || {});
