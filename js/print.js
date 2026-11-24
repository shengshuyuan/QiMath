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

  function escHTML(value) {
    return MT.core && MT.core.esc ? MT.core.esc(value) : String(value === undefined ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function collectAllWrong() {
    var list = [], p = MT.progress;
    if (!p || !MT.navigation) return list;
    MT.navigation.courses.forEach(function (c) {
      if (c.topic === 'basic') {
        var op = MT.op && MT.op.get(c.id);
        if (!op) return;
        var wr = op.bag(p).wrong || {};
        Object.keys(wr).forEach(function (k) {
          list.push({
            course: c.title,
            prompt: op.problemText(k),
            answer: op.answerText(k),
            explain: '',
            visualHTML: ''
          });
        });
      } else {
        var mod = MT[c.id], t = p.topics && p.topics[c.id];
        if (!mod || !t || !t.wrong) return;
        Object.keys(t.wrong).forEach(function (k) {
          var w = t.wrong[k];
          if (!w || !w.skill) return;
          var q = mod.generate(w.skill, w.range, w.seed);
          if (!q || q.id !== k) return;
          var ans = q.kind === 'choice' ? q.choices[q.answer] : q.answer + (q.unit || '');
          var extra = q.kind === 'steps'
            ? '<p class="topic-print-space">先算 ____________________　再算 ____________________</p>'
            : q.kind === 'choice'
              ? '<p>' + q.choices.map(function (s, j) { return String.fromCharCode(65 + j) + '. ' + escHTML(s); }).join('　') + '</p>'
              : '<p>答案：________ ' + escHTML(q.unit || '') + '</p>';
          list.push({
            course: c.title,
            prompt: q.kind === 'steps' ? q.expression + ' = ______' : (q.printPrompt || q.prompt),
            answer: ans,
            explain: q.steps ? q.steps.join('；') : (q.explanation || ''),
            visualHTML: q.visualHTML || '',
            extraHTML: extra
          });
        });
      }
    });
    return list;
  }

  function triggerPrint() {
    try { window.print(); } catch (e) {}
    // 以 afterprint 为主，长延迟兜底防止慢速打印预览下 DOM 被提前清空
    if (clearTimer) clearTimeout(clearTimer);
    clearTimer = window.setTimeout(clear, 60000);
  }

  MT.print = {
    run: function () {
      var root = document.getElementById('print-root');
      if (!root) return;
      clear();
      var topicPrinted = MT.progress.settings.topic !== 'basic' && MT.topics && MT.topics.buildPrint(root);
      if (!topicPrinted) {
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
      }
      triggerPrint();
    },

    runWrongSheet: function () {
      var root = document.getElementById('print-root');
      if (!root) return false;
      var items = collectAllWrong();
      if (!items.length) return false;
      clear();
      var slice = items.slice(0, 24);
      var today = (MT.core && MT.core.todayKey) ? MT.core.todayKey() : new Date().toISOString().slice(0, 10);
      var subText = '共 ' + slice.length + ' 题 · 生成日期 ' + today;
      var sheetHTML = '<div class="print-sheet"><div class="print-head"><div class="print-title">QiMath · 错题巩固练习纸</div><div class="print-meta">' + escHTML(subText) + '　姓名 __________</div></div>' +
        '<div class="topic-print-questions">' + slice.map(function (it, i) {
          return '<div class="topic-print-question"><p>' + (i + 1) + '. [' + escHTML(it.course) + '] ' + escHTML(it.prompt) + '</p>' + (it.visualHTML || '') + (it.extraHTML || '') + '</div>';
        }).join('') + '</div></div>';
      var st = MT.progress && MT.progress.settings;
      if (st && st.printAnswers === 'on') {
        sheetHTML += '<div class="print-sheet"><div class="print-head"><div class="print-title">错题巩固 · 参考答案</div><div class="print-meta">' + escHTML(subText) + '</div></div>' +
          slice.map(function (it, i) {
            return '<div class="topic-print-question"><p>' + (i + 1) + '. [' + escHTML(it.course) + '] ' + escHTML(it.answer) + '</p>' + (it.explain ? '<p>' + escHTML(it.explain) + '</p>' : '') + '</div>';
          }).join('') + '</div>';
      }
      root.innerHTML = sheetHTML;
      triggerPrint();
      return true;
    }
  };

  window.addEventListener('afterprint', function () {
    if (clearTimer) { clearTimeout(clearTimer); clearTimer = null; }
    window.setTimeout(clear, 300);
  });
})(window.MT = window.MT || {});
