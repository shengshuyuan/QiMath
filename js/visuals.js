(function (MT) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined && txt !== null) e.textContent = String(txt);
    return e;
  }

  function sv(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, String(attrs[k]));
    }
    return e;
  }

  function ext(o, extra) {
    var r = {}, k;
    for (k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k];
    for (k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) r[k] = extra[k];
    return r;
  }

  function motion() {
    var st = MT.progress && MT.progress.settings;
    if (st && st.reduceMotion === 'on') return false;
    var mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    return !(mq && mq.matches);
  }

  function isAnim(o) {
    return o.animate !== false && motion();
  }

  function ms(v) { return Math.round(v) + 'ms'; }

  function setup(wrap, o, vars) {
    if (!isAnim(o)) {
      wrap.classList.add('no-anim');
      return;
    }
    wrap.classList.add('anim');
    for (var k in vars) wrap.style.setProperty(k, ms(vars[k]));
  }

  /* ---------- ① 阵列图 ---------- */

  function arrayViz(o) {
    var a = o.a, b = o.b, n = a * b;
    var wrap = el('div', 'viz viz-array');
    var grid = el('div', 'dot-grid');
    grid.style.gridTemplateColumns = 'repeat(' + b + ', 1fr)';
    for (var r = 0; r < a; r++) {
      for (var c = 0; c < b; c++) {
        var d = el('i', 'dot');
        d.style.setProperty('--i', String(r * b + c));
        grid.appendChild(d);
      }
    }
    wrap.appendChild(grid);
    if (!o.compact) {
      wrap.appendChild(el('div', 'viz-cap', a + ' 行，每行 ' + b + ' 个，一共 ' + n + ' 个'));
    }
    setup(wrap, o, { '--stagger': Math.min(45, (o.maxStaggerTotal || 1200) / Math.max(1, n)) });
    return wrap;
  }

  /* ---------- ② 等组图 ---------- */

  function groupsViz(o) {
    var a = o.a, b = o.b;
    var wrap = el('div', 'viz viz-groups');
    var list = el('div', 'group-list');
    for (var g = 0; g < a; g++) {
      var box = el('div', 'group');
      box.style.setProperty('--gi', String(g));
      var inner = el('div', 'group-dots');
      inner.style.gridTemplateColumns = 'repeat(' + Math.min(b, 5) + ', 1fr)';
      for (var i = 0; i < b; i++) {
        var d = el('i', 'dot');
        d.style.setProperty('--i', String(i));
        inner.appendChild(d);
      }
      box.appendChild(inner);
      if (!o.compact) box.appendChild(el('div', 'group-label', '第 ' + (g + 1) + ' 组'));
      list.appendChild(box);
    }
    wrap.appendChild(list);
    if (!o.compact) {
      wrap.appendChild(el('div', 'viz-cap', a + ' 组，每组 ' + b + ' 个，一共 ' + (a * b) + ' 个'));
    }
    setup(wrap, o, {
      '--gstagger': Math.min(200, 900 / Math.max(1, a)),
      '--stagger': Math.min(40, 320 / Math.max(1, b))
    });
    return wrap;
  }

  /* ---------- ③ 数轴跳格 ---------- */

  function numberlineViz(o) {
    var a = o.a, b = o.b, total = a * b;
    var W = Math.max(220, Math.min(760, o.width || 620));
    var H = 136, axisY = 98, padL = 24, padR = 24;
    var avail = W - padL - padR;
    var u = avail / Math.max(1, total);

    function X(v) { return padL + v * u; }

    var svg = sv('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      width: W,
      height: H,
      class: 'nl-svg',
      role: 'img'
    });
    var ti = sv('title');
    ti.textContent = '数轴跳格：跳 ' + a + ' 次，每次加 ' + b + '，一共 ' + total;
    svg.appendChild(ti);

    svg.appendChild(sv('line', { x1: padL - 10, y1: axisY, x2: W - padR + 10, y2: axisY, class: 'nl-axis' }));

    if (u >= 18) {
      for (var v = 0; v <= total; v++) {
        if (v % b === 0) continue;
        svg.appendChild(sv('line', { x1: X(v), y1: axisY - 4, x2: X(v), y2: axisY + 4, class: 'nl-minor' }));
      }
    }

    for (var k = 0; k <= a; k++) {
      var mv = k * b;
      svg.appendChild(sv('line', { x1: X(mv), y1: axisY - 9, x2: X(mv), y2: axisY + 9, class: 'nl-major' }));
      var t = sv('text', { x: X(mv), y: axisY + 28, class: 'nl-num', 'text-anchor': 'middle' });
      t.textContent = String(mv);
      svg.appendChild(t);
    }

    var startBall = sv('circle', { cx: X(0), cy: axisY - 13, r: 9, class: 'nl-ball nl-ball-start' });
    svg.appendChild(startBall);

    for (var j = 0; j < a; j++) {
      var x1 = X(j * b), x2 = X((j + 1) * b), cxm = (x1 + x2) / 2;
      var p = sv('path', {
        d: 'M' + x1 + ' ' + axisY + ' Q' + cxm + ' ' + (axisY - 84) + ' ' + x2 + ' ' + axisY,
        class: 'nl-arc',
        fill: 'none'
      });
      p.style.setProperty('--i', String(j));
      svg.appendChild(p);

      var lb = sv('text', { x: cxm, y: axisY - 60, class: 'nl-plus', 'text-anchor': 'middle' });
      lb.textContent = '+' + b;
      lb.style.setProperty('--i', String(j));
      svg.appendChild(lb);

      var ball = sv('circle', { cx: x2, cy: axisY - 13, r: 9, class: 'nl-ball' });
      ball.style.setProperty('--i', String(j));
      svg.appendChild(ball);
    }

    var wrap = el('div', 'viz viz-nl');
    var scroller = el('div', 'nl-scroll');
    scroller.appendChild(svg);
    wrap.appendChild(scroller);
    if (!o.compact) {
      wrap.appendChild(el('div', 'viz-cap', '从 0 开始，跳 ' + a + ' 次，每次加 ' + b + '，到 ' + total));
    }
    setup(wrap, o, { '--jstagger': Math.min(260, 1100 / Math.max(1, a)) });
    return wrap;
  }

  /* ---------- ④ 面积模型 ---------- */

  function areaViz(o) {
    var a = o.a, b = o.b;
    var wrap = el('div', 'viz viz-area');
    var g = el('div', 'area-grid');
    g.style.gridTemplateColumns = '18px repeat(' + b + ', 1fr)';
    g.style.gridTemplateRows = '18px repeat(' + a + ', 1fr)';
    var ar = (b + 1) / (a + 1);
    g.style.aspectRatio = MT.core.clamp(ar, 0.75, 2.4).toFixed(3) + ' / 1';

    g.appendChild(el('div', 'ax ax-corner'));
    for (var c = 0; c < b; c++) g.appendChild(el('div', 'ax ax-top', String(c + 1)));
    for (var r = 0; r < a; r++) {
      g.appendChild(el('div', 'ax ax-left', String(r + 1)));
      for (var c2 = 0; c2 < b; c2++) {
        var cell = el('div', 'cell');
        cell.style.setProperty('--i', String(r * b + c2));
        g.appendChild(cell);
      }
    }
    wrap.appendChild(g);
    if (!o.compact) {
      wrap.appendChild(el('div', 'viz-cap', a + ' 行 × ' + b + ' 列 = ' + (a * b) + ' 个小方格'));
    }
    setup(wrap, o, { '--stagger': Math.min(45, (o.maxStaggerTotal || 1200) / Math.max(1, a * b)) });
    return wrap;
  }

  /* ---------- 并排四图 ---------- */

  var BUILD = {
    array: arrayViz,
    groups: groupsViz,
    numberline: numberlineViz,
    area: areaViz
  };

  var LABEL = {
    array: '阵列',
    groups: '分组',
    numberline: '数轴',
    area: '方格'
  };

  function allGrid(o) {
    var grid = el('div', 'viz-all');
    var order = ['array', 'groups', 'numberline', 'area'];
    // 与 .viz-all 的断点保持一致：宽屏是 2 列，窄屏是 1 列
    var twoCol = !!(window.matchMedia && window.matchMedia('(min-width: 640px)').matches);
    var boxW = o.width || 620;
    var subW = twoCol ? (boxW - 10) / 2 - 22 : boxW - 22;
    for (var i = 0; i < order.length; i++) {
      var t = order[i];
      var card = el('div', 'viz-card');
      card.appendChild(el('div', 'viz-card-title', LABEL[t]));
      var body = el('div', 'viz-card-body');
      var sub = ext(o, { compact: true, width: Math.max(220, subW) });
      body.appendChild(BUILD[t](sub));
      card.appendChild(body);
      grid.appendChild(card);
    }
    return grid;
  }

  function postMount(root) {
    var arcs = root.querySelectorAll('.nl-arc');
    for (var i = 0; i < arcs.length; i++) {
      var p = arcs[i];
      try {
        var len = p.getTotalLength();
        if (len && isFinite(len)) p.style.setProperty('--len', String(Math.ceil(len)));
      } catch (e) {}
    }
  }

  MT.visuals = {
    array: arrayViz,
    groups: groupsViz,
    numberline: numberlineViz,
    area: areaViz,
    motion: motion,
    label: LABEL,

    render: function (mount, type, opts) {
      if (!mount) return null;
      var o = opts || {};
      // clientWidth 含 padding，扣掉一点再交给数轴用；宁可略窄（居中留白）也不要溢出
      if (!o.width) o.width = Math.max(220, (mount.clientWidth || 620) - 24);
      mount.innerHTML = '';
      if (type === 'all') {
        mount.appendChild(allGrid(o));
      } else {
        mount.appendChild((BUILD[type] || arrayViz)(o));
      }
      postMount(mount);
      return mount;
    },

    // 给「连加算式」用的小工具：返回 "4 + 4 + 4" 这种串
    addends: function (a, b) {
      var out = [];
      for (var i = 0; i < a; i++) out.push(b);
      return out;
    }
  };
})(window.MT = window.MT || {});
