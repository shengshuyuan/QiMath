/* ==============================================================
   专题课「学一学」互动教具
   ----------------------------------------------------------------
   为时间、角、长度、人民币提供动手调节的轻量可视化教具，零依赖。
   对外：MT.topicWidgets.mount(slot, modelId, skillId)
   ============================================================== */
(function (MT) {
  'use strict';

  function clockSVG(hour, minute) {
    var svg = '<svg class="time-clock" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360" role="img" aria-label="互动钟面：' + hour + '时' + minute + '分"><circle cx="180" cy="180" r="165" fill="#fffaf0" stroke="#7060d4" stroke-width="4"/>';
    for (var i = 0; i < 60; i++) {
      var a = i * Math.PI / 30, major = i % 5 === 0;
      svg += '<path d="M ' + (180 + Math.sin(a) * (major ? 140 : 150)) + ' ' + (180 - Math.cos(a) * (major ? 140 : 150)) + ' L ' + (180 + Math.sin(a) * 158) + ' ' + (180 - Math.cos(a) * 158) + '" stroke="#655b7e" stroke-width="' + (major ? 3 : 1) + '"/>';
    }
    for (var n = 1; n <= 12; n++) {
      var t = n * Math.PI / 6;
      svg += '<text x="' + (180 + Math.sin(t) * 122) + '" y="' + (189 - Math.cos(t) * 122) + '" text-anchor="middle" font-size="26" fill="#40336c">' + n + '</text>';
    }
    var h = (hour % 12 + minute / 60) * Math.PI / 6, m = minute * Math.PI / 30;
    svg += '<path d="M 180 180 L ' + (180 + Math.sin(h) * 78) + ' ' + (180 - Math.cos(h) * 78) + '" stroke="#40336c" stroke-width="9" stroke-linecap="round"/><path d="M 180 180 L ' + (180 + Math.sin(m) * 112) + ' ' + (180 - Math.cos(m) * 112) + '" stroke="#ba612a" stroke-width="5" stroke-linecap="round"/><circle cx="180" cy="180" r="8" fill="#40336c"/></svg>';
    return svg;
  }

  function mountClock(slot) {
    var total = 8 * 60 + 50;
    function render() {
      var h = Math.floor(total / 60) % 12 || 12;
      var m = total % 60;
      var timeStr = h + ':' + (m < 10 ? '0' : '') + m;
      var note = m === 0 ? '整点时，分针正好指向 12，时针正指数字 ' + h + '。'
        : m >= 50 ? '注意：时针已经快指到 ' + (h === 12 ? 1 : h + 1) + ' 了，但还没到，所以还是 ' + h + ' 时！'
        : '分针走了 ' + m + ' 小格，时针也跟着往 ' + (h === 12 ? 1 : h + 1) + ' 轻轻移动了一点。';
      slot.innerHTML = '<div class="topic-widget"><div class="topic-widget-head"><b>🕰️ 动手拨一拨钟表</b><span>观察分针走动时时针怎样慢慢转动</span></div>' +
        clockSVG(h, m) +
        '<div class="topic-widget-readout">' + timeStr + '（' + h + ' 时 ' + m + ' 分）</div>' +
        '<p class="topic-widget-note">' + note + '</p>' +
        '<div class="topic-widget-controls">' +
        '<button type="button" class="btn btn-soft" data-delta="-15">−15分</button>' +
        '<button type="button" class="btn btn-soft" data-delta="-5">−5分</button>' +
        '<button type="button" class="btn btn-soft" data-delta="-1">−1分</button>' +
        '<button type="button" class="btn btn-soft" data-delta="1">+1分</button>' +
        '<button type="button" class="btn btn-soft" data-delta="5">+5分</button>' +
        '<button type="button" class="btn btn-soft" data-delta="15">+15分</button>' +
        '<button type="button" class="btn btn-soft" data-delta="60">+1时</button>' +
        '</div></div>';
    }
    slot.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-delta]');
      if (!btn) return;
      total = (total + Number(btn.dataset.delta) + 720) % 720;
      if (MT.sound) MT.sound.play('click');
      render();
    });
    render();
  }

  function mountAngle(slot) {
    var deg = 60, len = 130;
    function angleType(d) { return d < 90 ? '锐角' : d === 90 ? '直角' : '钝角'; }
    function angleSVG() {
      var r = deg * Math.PI / 180;
      var x = 185 + len * Math.cos(r), y = 185 - len * Math.sin(r);
      var x2 = 185 + len;
      return '<svg viewBox="0 0 400 230" role="img" aria-label="互动角：' + angleType(deg) + '"><path d="M ' + x2 + ' 185 L 185 185 L ' + x + ' ' + y + '" fill="none" stroke="#7060d4" stroke-width="7" stroke-linecap="round"/>' +
        '<path d="M 225 185 A 40 40 0 0 0 ' + (185 + 40 * Math.cos(r)) + ' ' + (185 - 40 * Math.sin(r)) + '" fill="none" stroke="#d18b2f" stroke-width="3"/>' +
        (deg === 90 ? '<path d="M 205 185 V 165 H 185" fill="none" stroke="#d18b2f" stroke-width="3"/>' : '') +
        '<circle cx="185" cy="185" r="6" fill="#40336c"/></svg>';
    }
    function render() {
      var kind = angleType(deg);
      var note = deg === 90 ? '刚好和三角尺的直角重合，出现了直角小方框！' : '改变边的长短，只要两条边张开的程度不变，它还是 ' + kind + '。';
      slot.innerHTML = '<div class="topic-widget"><div class="topic-widget-head"><b>📐 动手转一转角</b><span>试着调节张口大小和边长</span></div>' +
        angleSVG() +
        '<div class="topic-widget-readout">' + kind + '</div>' +
        '<p class="topic-widget-note">' + note + '</p>' +
        '<label class="topic-widget-slider"><span>张口大小</span><input type="range" min="15" max="165" step="5" value="' + deg + '" id="widget-angle-range"></label>' +
        '<div class="topic-widget-controls">' +
        '<button type="button" class="btn btn-soft" data-deg="90">摆成直角</button>' +
        '<button type="button" class="btn btn-soft' + (len === 90 ? ' is-on' : '') + '" data-len="90">短边</button>' +
        '<button type="button" class="btn btn-soft' + (len === 130 ? ' is-on' : '') + '" data-len="130">中边</button>' +
        '<button type="button" class="btn btn-soft' + (len === 165 ? ' is-on' : '') + '" data-len="165">长边</button>' +
        '</div></div>';
      var range = slot.querySelector('#widget-angle-range');
      if (range) range.addEventListener('input', function () { deg = Number(this.value); render(); });
    }
    slot.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      if (btn.dataset.deg) deg = Number(btn.dataset.deg);
      if (btn.dataset.len) len = Number(btn.dataset.len);
      if (MT.sound) MT.sound.play('click');
      render();
    });
    render();
  }

  function mountRuler(slot) {
    var start = 2, length = 5, max = 15;
    function rulerSVG() {
      var x0 = 40, step = 540 / max, left = x0 + start * step, right = x0 + (start + length) * step;
      var svg = '<svg viewBox="0 0 620 195" role="img" aria-label="互动直尺：起点 ' + start + '，终点 ' + (start + length) + '"><rect x="28" y="105" width="564" height="70" rx="8" fill="#fff3cc" stroke="#b98a29" stroke-width="2"/>' +
        '<rect x="' + left + '" y="48" width="' + (right - left) + '" height="30" rx="5" fill="#7060d4"/>' +
        '<text x="' + ((left + right) / 2) + '" y="39" text-anchor="middle" font-size="24" fill="#40336c">物体（' + length + ' 厘米）</text>' +
        '<path d="M ' + left + ' 78 V 112 M ' + right + ' 78 V 112" stroke="#7060d4" stroke-width="2" stroke-dasharray="4 3"/>';
      for (var i = 0; i <= max; i++) {
        var x = x0 + i * step;
        svg += '<path d="M ' + x + ' 108 V ' + (i % 5 === 0 ? 139 : 129) + '" stroke="#624b1e" stroke-width="2"/><text x="' + x + '" y="166" text-anchor="middle" font-size="24" fill="#4b3b1c">' + i + '</text>';
      }
      return svg + '</svg>';
    }
    function render() {
      var end = start + length;
      slot.innerHTML = '<div class="topic-widget"><div class="topic-widget-head"><b>📏 动手移动物体读尺</b><span>试试不从 0 刻度开始量</span></div>' +
        rulerSVG() +
        '<div class="topic-widget-readout">' + end + ' − ' + start + ' ＝ ' + length + ' 厘米</div>' +
        '<p class="topic-widget-note">' + (start === 0 ? '左端对齐 0，长度直接看右端刻度。' : '左右移动物体，终点和起点的差永远等于物体长度。') + '</p>' +
        '<div class="topic-widget-controls">' +
        '<button type="button" class="btn btn-soft" data-shift="-1"' + (start <= 0 ? ' disabled' : '') + '>← 起点左移</button>' +
        '<button type="button" class="btn btn-soft" data-shift="1"' + (end >= max ? ' disabled' : '') + '>起点右移 →</button>' +
        '<button type="button" class="btn btn-soft" data-size="-1"' + (length <= 1 ? ' disabled' : '') + '>变短 1 cm</button>' +
        '<button type="button" class="btn btn-soft" data-size="1"' + (end >= max ? ' disabled' : '') + '>变长 1 cm</button>' +
        '</div></div>';
    }
    slot.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn || btn.disabled) return;
      if (btn.dataset.shift) start = Math.max(0, Math.min(max - length, start + Number(btn.dataset.shift)));
      if (btn.dataset.size) length = Math.max(1, Math.min(max - start, length + Number(btn.dataset.size)));
      if (MT.sound) MT.sound.play('click');
      render();
    });
    render();
  }

  function mountMoneyConvert(slot) {
    if (!MT.money || !MT.money.renderTrayHTML) return;
    var mode = 'y2j', split = false;
    var CASES = {
      y2j: { label: '1元 ⇄ 10角', big: ['y1_p'], small: [{ denom: MT.money.denomById['j1_c'], count: 10 }], bigText: '1 张 1元 ＝ 10 枚 1角', smallText: '10 枚 1角 ＝ 1 张 1元' },
      j2f: { label: '1角 ⇄ 10分', big: ['j1_c'], small: [{ denom: MT.money.denomById['f1_c'], count: 10 }], bigText: '1 枚 1角 ＝ 10 枚 1分', smallText: '10 枚 1分 ＝ 1 枚 1角' },
      y10: { label: '10元 ⇄ 10个1元', big: ['y10'], small: [{ denom: MT.money.denomById['y1_c'], count: 10 }], bigText: '1 张 10元 ＝ 10 枚 1元', smallText: '10 枚 1元 ＝ 1 张 10元' }
    };
    function render() {
      var c = CASES[mode];
      var tabs = Object.keys(CASES).map(function (k) {
        return '<button type="button" class="btn btn-soft' + (k === mode ? ' is-on' : '') + '" data-m="' + k + '">' + CASES[k].label + '</button>';
      }).join('');
      var tray = MT.money.renderTrayHTML(split ? c.small : c.big, split ? '拆成零钱' : '整张面值');
      slot.innerHTML = '<div class="topic-widget"><div class="topic-widget-head"><b>🪙 动手换零钱</b><span>点一点，看看大面值和零钱怎样等值互换</span></div>' +
        '<div class="topic-widget-controls">' + tabs + '</div>' + tray +
        '<div class="topic-widget-readout">' + (split ? c.smallText : c.bigText) + '</div>' +
        '<div class="topic-widget-controls"><button type="button" class="btn btn-main" data-toggle="1">' + (split ? '合成整张 ↑' : '拆成零钱 ↓') + '</button></div></div>';
    }
    slot.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      if (btn.dataset.m) { mode = btn.dataset.m; split = false; }
      if (btn.dataset.toggle) split = !split;
      if (MT.sound) MT.sound.play('click');
      render();
    });
    render();
  }

  function mount(slot, modelId, skillId) {
    if (!slot) return;
    slot.innerHTML = '';
    if (modelId === 'time' && (skillId === 'clock' || skillId === 'minute')) mountClock(slot);
    else if (modelId === 'angle' && (skillId === 'classify' || skillId === 'compare' || skillId === 'judge')) mountAngle(slot);
    else if (modelId === 'length' && skillId === 'ruler') mountRuler(slot);
    else if (modelId === 'money' && skillId === 'convert') mountMoneyConvert(slot);
  }

  MT.topicWidgets = { mount: mount };
})(window.MT = window.MT || {});
