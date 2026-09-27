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

  function blankSheet() {
    var mod = MT.op.current();
    var isDiv = (mod && mod.id === 'div');
    var s = el('div', 'print-sheet');
    var title = isDiv ? '空白除法算式整理表' : '空白口诀表';
    var subtitle = isDiv ? '表内除法练习' : '九九乘法表练习';
    s.appendChild(header(title, subtitle));
    var t = el('div', 'print-table');
    var grid = el('div', 'pt-grid');
    var corner = isDiv ? '÷' : '×';
    grid.appendChild(el('div', 'pt-cell pt-corner', corner));
    for (var a = 1; a <= 9; a++) {
      var colText = isDiv ? ('商' + a) : a;
      grid.appendChild(el('div', 'pt-cell pt-head', colText));
    }
    for (var b = 1; b <= 9; b++) {
      var rowText = isDiv ? ('÷' + b) : b;
      grid.appendChild(el('div', 'pt-cell pt-head', rowText));
      for (var a2 = 1; a2 <= 9; a2++) {
        grid.appendChild(el('div', 'pt-cell pt-blank'));
      }
    }
    t.appendChild(grid);
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
    var isDiv = (mod && mod.id === 'div');
    var s = el('div', 'print-sheet');
    s.appendChild(header(title, subtitle));
    var grid = el('div', 'print-problems');
    for (var i = 0; i < keys.length; i++) {
      var text = '';
      if (isDiv) {
        var d = MT.div.parse(keys[i]);
        text = d.n + ' ÷ ' + d.divisor + ' = ______';
      } else {
        var f = MT.mul.parse(keys[i]);
        text = f.a + ' × ' + f.b + ' = ______';
      }
      grid.appendChild(el('div', 'print-problem', text));
    }
    s.appendChild(grid);
    return s;
  }

  function answerSheet(keys, subtitle) {
    var mod = MT.op.current();
    var isDiv = (mod && mod.id === 'div');
    var s = el('div', 'print-sheet');
    s.appendChild(header(isDiv ? '除法参考答案' : '乘法参考答案', subtitle));
    var grid = el('div', 'print-problems print-answers');
    for (var i = 0; i < keys.length; i++) {
      var text = '';
      if (isDiv) {
        var d = MT.div.parse(keys[i]);
        text = d.n + ' ÷ ' + d.divisor + ' = ' + d.quot;
      } else {
        var f = MT.mul.parse(keys[i]);
        text = f.a + ' × ' + f.b + ' = ' + (f.a * f.b);
      }
      grid.appendChild(el('div', 'print-problem', text));
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
      var mod = MT.op.current();
      var isDiv = (mod && mod.id === 'div');
      var subtitle = isDiv ? '表内除法练习' : '九九乘法表练习';
      var keys = pickProblems(20);
      root.appendChild(blankSheet());
      var title = (isDiv ? '除法算一算（共 ' : '乘法算一算（共 ') + keys.length + ' 题）';
      root.appendChild(problemSheet(keys, title, subtitle));
      var st = MT.progress && MT.progress.settings;
      if (st && st.printAnswers === 'on') {
        root.appendChild(answerSheet(keys, subtitle));
      }

      try { window.print(); } catch (e) {}
      // 以 afterprint 为主，这里只是兜底（部分浏览器打印是异步的）
      window.setTimeout(clear, 3000);
    }
  };

  window.addEventListener('afterprint', function () {
    window.setTimeout(clear, 300);
  });
})(window.MT = window.MT || {});
