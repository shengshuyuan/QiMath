(function (MT) {
  'use strict';

  function escapeHTML(value) {
    return String(value === undefined ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function seedNumber(seed) {
    seed = Number(seed);
    return isFinite(seed) ? Math.floor(seed) >>> 0 : 0;
  }

  function random(seed) {
    var state = seed;
    return function (min, max) {
      state = (state + 0x6d2b79f5) >>> 0;
      var mixed = Math.imul(state ^ (state >>> 15), state | 1);
      mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
      return min + ((mixed ^ (mixed >>> 14)) >>> 0) % (max - min + 1);
    };
  }

  // 金额全部以整数“分”为内部单位：1元＝100分，1角＝10分
  var DENOMINATIONS = [
    { id: 'y100', name: '100元纸币', shortName: '100元', value: 10000, type: 'bill', unit: '元', num: 100, color: '#b83b48', bg: '#fde8ea', border: '#b83b48' },
    { id: 'y50',  name: '50元纸币',  shortName: '50元',  value: 5000,  type: 'bill', unit: '元', num: 50,  color: '#1b7a69', bg: '#e6f7f3', border: '#1b7a69' },
    { id: 'y20',  name: '20元纸币',  shortName: '20元',  value: 2000,  type: 'bill', unit: '元', num: 20,  color: '#9e5a26', bg: '#fdf1e7', border: '#9e5a26' },
    { id: 'y10',  name: '10元纸币',  shortName: '10元',  value: 1000,  type: 'bill', unit: '元', num: 10,  color: '#286299', bg: '#eaf3fc', border: '#286299' },
    { id: 'y5',   name: '5元纸币',   shortName: '5元',   value: 500,   type: 'bill', unit: '元', num: 5,   color: '#6e438c', bg: '#f5ebfb', border: '#6e438c' },
    { id: 'y1_p', name: '1元纸币',   shortName: '1元纸币', value: 100,   type: 'bill', unit: '元', num: 1,   color: '#556b2f', bg: '#f0f5e5', border: '#556b2f' },
    { id: 'j5_p', name: '5角纸币',   shortName: '5角纸币', value: 50,    type: 'bill', unit: '角', num: 5,   color: '#7b4f2c', bg: '#fbf0e8', border: '#7b4f2c' },
    { id: 'j1_p', name: '1角纸币',   shortName: '1角纸币', value: 10,    type: 'bill', unit: '角', num: 1,   color: '#5a4933', bg: '#f6f0ea', border: '#5a4933' },
    { id: 'y1_c', name: '1元硬币',   shortName: '1元硬币', value: 100,   type: 'coin', unit: '元', num: 1,   color: '#495057', bg: '#e9ecef', border: '#adb5bd' },
    { id: 'j5_c', name: '5角硬币',   shortName: '5角硬币', value: 50,    type: 'coin', unit: '角', num: 5,   color: '#8f5b00', bg: '#fff3cd', border: '#e0a800' },
    { id: 'j1_c', name: '1角硬币',   shortName: '1角硬币', value: 10,    type: 'coin', unit: '角', num: 1,   color: '#495057', bg: '#e2e6ea', border: '#ced4da' },
    { id: 'f5_c', name: '5分硬币',   shortName: '5分硬币', value: 5,     type: 'coin', unit: '分', num: 5,   color: '#6c757d', bg: '#f1f3f5', border: '#ced4da' },
    { id: 'f2_c', name: '2分硬币',   shortName: '2分硬币', value: 2,     type: 'coin', unit: '分', num: 2,   color: '#6c757d', bg: '#f1f3f5', border: '#ced4da' },
    { id: 'f1_c', name: '1分硬币',   shortName: '1分硬币', value: 1,     type: 'coin', unit: '分', num: 1,   color: '#6c757d', bg: '#f1f3f5', border: '#ced4da' }
  ];

  var DENOM_BY_ID = {};
  DENOMINATIONS.forEach(function (d) { DENOM_BY_ID[d.id] = d; });

  function centsToParts(cents) {
    cents = Math.max(0, Math.floor(cents));
    var y = Math.floor(cents / 100);
    var j = Math.floor((cents % 100) / 10);
    var f = cents % 10;
    return { yuan: y, jiao: j, fen: f };
  }

  function partsToCents(y, j, f) {
    return (Number(y) || 0) * 100 + (Number(j) || 0) * 10 + (Number(f) || 0);
  }

  function formatCN(cents, zeroFen) {
    cents = Math.max(0, Math.floor(cents));
    if (cents === 0) return '0元';
    var p = centsToParts(cents);
    var res = '';
    if (p.yuan > 0) res += p.yuan + '元';
    if (p.jiao > 0) res += p.jiao + '角';
    else if (p.yuan > 0 && p.fen > 0 && zeroFen) res += '零';
    if (p.fen > 0) res += p.fen + '分';
    return res;
  }

  function formatPrice(cents) {
    return (cents / 100).toFixed(2) + '元';
  }

  // 生成钱币 SVG 矢量图形（清晰、易读、适合高分屏和打印）
  function renderBillSVG(d, w, h) {
    w = w || 140;
    h = h || 74;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img" aria-label="' + escapeHTML(d.name) + '" class="money-svg money-bill">';
    svg += '<rect x="2" y="2" width="' + (w - 4) + '" height="' + (h - 4) + '" rx="6" fill="' + d.bg + '" stroke="' + d.border + '" stroke-width="2"/>';
    svg += '<rect x="6" y="6" width="' + (w - 12) + '" height="' + (h - 12) + '" rx="4" fill="none" stroke="' + d.border + '" stroke-width="1" stroke-dasharray="3 2" opacity="0.6"/>';
    svg += '<circle cx="' + (w * 0.24) + '" cy="' + (h * 0.5) + '" r="' + (h * 0.28) + '" fill="none" stroke="' + d.border + '" stroke-width="1" opacity="0.3"/>';
    svg += '<text x="' + (w * 0.12) + '" y="' + (h * 0.26) + '" font-size="' + Math.round(h * 0.16) + '" font-weight="700" fill="' + d.color + '">中国人民银行</text>';
    svg += '<text x="' + (w * 0.72) + '" y="' + (h * 0.62) + '" text-anchor="middle" font-size="' + Math.round(h * 0.44) + '" font-weight="900" fill="' + d.color + '" font-family="system-ui,sans-serif">' + d.num + '</text>';
    svg += '<text x="' + (w * 0.72) + '" y="' + (h * 0.84) + '" text-anchor="middle" font-size="' + Math.round(h * 0.2) + '" font-weight="700" fill="' + d.color + '">' + d.unit + ' (纸币)</text>';
    svg += '</svg>';
    return svg;
  }

  function renderCoinSVG(d, r) {
    r = r || 36;
    var d2 = r * 2;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + d2 + ' ' + d2 + '" width="' + d2 + '" height="' + d2 + '" role="img" aria-label="' + escapeHTML(d.name) + '" class="money-svg money-coin">';
    svg += '<circle cx="' + r + '" cy="' + r + '" r="' + (r - 2) + '" fill="' + d.bg + '" stroke="' + d.border + '" stroke-width="2.5"/>';
    svg += '<circle cx="' + r + '" cy="' + r + '" r="' + (r - 6) + '" fill="none" stroke="' + d.border + '" stroke-width="1" stroke-dasharray="2 2" opacity="0.7"/>';
    svg += '<text x="' + r + '" y="' + (r + r * 0.12) + '" text-anchor="middle" font-size="' + Math.round(r * 0.64) + '" font-weight="900" fill="' + d.color + '" font-family="system-ui,sans-serif">' + d.num + '</text>';
    svg += '<text x="' + r + '" y="' + (r + r * 0.58) + '" text-anchor="middle" font-size="' + Math.round(r * 0.32) + '" font-weight="700" fill="' + d.color + '">' + d.unit + '</text>';
    svg += '</svg>';
    return svg;
  }

  function renderDenomSVG(id, w, h) {
    var d = DENOM_BY_ID[id] || DENOMINATIONS[0];
    if (d.type === 'coin') return renderCoinSVG(d, w ? Math.floor(w / 2) : 34);
    return renderBillSVG(d, w || 140, h || 74);
  }

  function renderMoneyCard(d, count) {
    var svg = renderDenomSVG(d.id);
    return '<div class="money-card" data-denom="' + escapeHTML(d.id) + '">' +
      '<div class="money-card-visual">' + svg + '</div>' +
      '<div class="money-card-info"><b>' + escapeHTML(d.name) + '</b><small>' + escapeHTML(d.shortName) + (count ? ' × ' + count : '') + '</small></div>' +
      '</div>';
  }

  function renderTrayHTML(items, title) {
    var html = '<div class="money-tray">' + (title ? '<div class="money-tray-title">' + escapeHTML(title) + '</div>' : '') + '<div class="money-tray-items">';
    items.forEach(function (it) {
      var d = typeof it === 'string' ? DENOM_BY_ID[it] : (it.denom || it);
      var count = it.count || 1;
      for (var c = 0; c < count; c++) {
        html += '<div class="money-tray-item">' + renderDenomSVG(d.id, d.type === 'coin' ? 56 : 110, d.type === 'coin' ? 56 : 60) + '<span class="money-tag">' + escapeHTML(d.shortName) + '</span></div>';
      }
    });
    html += '</div></div>';
    return html;
  }

  function renderCompareHTML(leftItems, rightItems, leftLabel, rightLabel) {
    return '<div class="money-compare-diagram">' +
      '<div class="compare-side side-left"><span class="compare-side-tag">' + escapeHTML(leftLabel || '左边') + '</span>' + renderTrayHTML(leftItems) + '</div>' +
      '<div class="compare-vs" aria-hidden="true">VS</div>' +
      '<div class="compare-side side-right"><span class="compare-side-tag">' + escapeHTML(rightLabel || '右边') + '</span>' + renderTrayHTML(rightItems) + '</div>' +
      '</div>';
  }

  function buildChoices(correct, candidates, targetCount) {
    var list = [correct];
    for (var i = 0; i < candidates.length && list.length < (targetCount || 3); i++) {
      var c = candidates[i];
      if (c && list.indexOf(c) === -1) list.push(c);
    }
    return list;
  }

  function choose(q, choices, correct, next) {
    choices = choices.slice();
    for (var i = choices.length - 1; i > 0; i--) {
      var at = next(0, i);
      var tmp = choices[i];
      choices[i] = choices[at];
      choices[at] = tmp;
    }
    q.kind = 'choice';
    q.choices = choices;
    q.answer = choices.indexOf(correct);
    return q;
  }

  // 六大知识点定义
  var skills = [
    {
      id: 'recognize',
      title: '认识单位与面值',
      description: '认识元、角、分，认识纸币与硬币及同值不同形态。',
      lessonHTML: '<div class="topic-lesson">' +
        '<p>人民币是我国的法定货币，主要单位有三个：<strong>元（圆）</strong>、<strong>角</strong>、<strong>分</strong>。</p>' +
        '<div class="topic-example">' +
          '<p><strong>常用纸币：</strong>100元、50元、20元、10元、5元、1元，以及5角、1角。</p>' +
          renderTrayHTML(['y100', 'y50', 'y20', 'y10', 'y5', 'y1_p', 'j5_p', 'j1_p']) +
          '<p><strong>常用硬币：</strong>1元、5角、1角，以及分币（5分、2分、1分）。</p>' +
          renderTrayHTML(['y1_c', 'j5_c', 'j1_c', 'f5_c', 'f2_c', 'f1_c']) +
        '</div>' +
        '<p class="topic-rule"><strong>看数字和单位：</strong>认钱币要先看上面的阿拉伯数字和大写汉字，再看单位。相同面值可以有不同形式，例如 1元既有纸币也有硬币，它们的面值完全一样！</p>' +
        '<p class="topic-note">爱护人民币，不在人民币上乱涂乱画，不故意损坏钱币。</p>' +
        '</div>'
    },
    {
      id: 'readwrite',
      title: '读写钱数与标价',
      description: '数出钱币组合的总金额，看懂超市商品的标价。',
      lessonHTML: '<div class="topic-lesson">' +
        '<p>数钱币时，通常<strong>先数整元的，再数角的，最后数分的</strong>。</p>' +
        '<div class="topic-example">' +
          '<p>例如：1张 5元 ＋ 2张 1元 ＋ 3枚 1角 ＝ <strong>7元3角</strong>。</p>' +
          renderTrayHTML([{ denom: DENOM_BY_ID['y5'], count: 1 }, { denom: DENOM_BY_ID['y1_p'], count: 2 }, { denom: DENOM_BY_ID['j1_c'], count: 3 }]) +
        '</div>' +
        '<div class="topic-example">' +
          '<p><strong>商品标价读法：</strong>商店标价常用小数表示：</p>' +
          '<ul>' +
            '<li><strong>5.30元</strong>：小数点左边是 5元，右边第一位是 3角，第二位是 0分，合起来是 <strong>5元3角</strong>。</li>' +
            '<li><strong>2.05元</strong>：表示 <strong>2元零5分</strong>（中间是0，表示0角）。</li>' +
            '<li><strong>10.00元</strong>：表示正好 <strong>10元</strong>。</li>' +
          '</ul>' +
        '</div>' +
        '<p class="topic-rule">小数标价中：小数点左边看“元”，右边第一位看“角”，第二位看“分”。</p>' +
        '</div>'
    },
    {
      id: 'convert',
      title: '元角分换算',
      description: '牢记进率：1元＝10角、1角＝10分、1元＝100分。',
      lessonHTML: '<div class="topic-lesson">' +
        '<p>元、角、分相邻两个单位之间的进率是 <strong>10</strong>：</p>' +
        '<div class="topic-example">' +
          '<p><strong>1元 ＝ 10角</strong>（1张1元可以换10张1角或10枚1角）</p>' +
          renderCompareHTML(['y1_p'], [{ denom: DENOM_BY_ID['j1_c'], count: 10 }], '1元', '10角') +
          '<p><strong>1角 ＝ 10分</strong>（1枚1角可以换10枚1分）</p>' +
          '<p><strong>1元 ＝ 100分</strong>（1元里面有10个10分，合起来是100分）</p>' +
        '</div>' +
        '<div class="topic-example">' +
          '<p><strong>复合单位换算：</strong></p>' +
          '<p>• <strong>1元5角＝15角</strong>（1元是10角，10角＋5角＝15角）</p>' +
          '<p>• <strong>38角＝3元8角</strong>（30角是3元，还剩8角）</p>' +
        '</div>' +
        '<p class="topic-rule">特别提醒：1元是 10角，不是 100角！大单位换小单位乘进率，小单位换大单位看有几个十。</p>' +
        '</div>'
    },
    {
      id: 'compare',
      title: '比较钱数多少',
      description: '单位相同直接比数，单位不同先统一单位再比较。',
      lessonHTML: '<div class="topic-lesson">' +
        '<p>比较两堆钱数哪边多：</p>' +
        '<div class="topic-example">' +
          '<p><strong>1. 单位相同时：</strong>直接比较数的大小。例如 <strong>8元 ＞ 5元</strong>，<strong>15角 ＞ 9角</strong>。</p>' +
          '<p><strong>2. 单位不同时：</strong>不能直接只看数字！必须<strong>先换算成相同单位</strong>再比。</p>' +
          renderCompareHTML(['y20'], [{ denom: DENOM_BY_ID['y5'], count: 3 }], '20元', '15元') +
          '<p>例如：比较 <strong>2元</strong> 和 <strong>18角</strong>：<br>' +
          '把 2元 换成角是 <strong>20角</strong>。因为 20角 ＞ 18角，所以 <strong>2元 ＞ 18角</strong>。</p>' +
          '<p>例如：比较 <strong>1元</strong> 和 <strong>100分</strong>：<br>' +
          '1元 ＝ 100分，两边表示的钱数<strong>一样多</strong>。</p>' +
        '</div>' +
        '<p class="topic-rule">先看单位 → 统一单位（通常全换成角或分） → 比较数值大小。</p>' +
        '</div>'
    },
    {
      id: 'calc',
      title: '简单钱数加减',
      description: '同单位直接算，不同单位元和元加减、角和角加减，注意进位与退位。',
      lessonHTML: '<div class="topic-lesson">' +
        '<p>钱数计算遵循<strong>相同单位才能直接相加减</strong>：</p>' +
        '<div class="topic-example">' +
          '<p><strong>1. 不进位加减：</strong>元和元相加减，角和角相加减。<br>' +
          '• 2元3角 ＋ 1元5角 ＝ <strong>3元8角</strong>（2元＋1元＝3元，3角＋5角＝8角）<br>' +
          '• 5元7角 － 2元4角 ＝ <strong>3元3角</strong>（5元－2元＝3元，7角－4角＝3角）</p>' +
          '<p><strong>2. 进位加法：</strong>满 10角 要向元进 1元。<br>' +
          '• 8角 ＋ 5角 ＝ 13角 ＝ <strong>1元3角</strong><br>' +
          '• 1元7角 ＋ 6角 ＝ 1元13角 ＝ <strong>2元3角</strong></p>' +
          '<p><strong>3. 退位减法：</strong>角不够减时，从元借 1元 当作 10角。<br>' +
          '• 2元 － 6角 ＝ 1元10角 － 6角 ＝ <strong>1元4角</strong><br>' +
          '• 3元2角 － 5角 ＝ 2元12角 － 5角 ＝ <strong>2元7角</strong></p>' +
        '</div>' +
        '<p class="topic-rule">元与元算、角与角算。满 10角 进 1元；不够减借 1元 变 10角。</p>' +
        '</div>'
    },
    {
      id: 'shopping',
      title: '购物与找零',
      description: '算一算总价、判断钱够不够、计算应该找回多少钱。',
      lessonHTML: '<div class="topic-lesson">' +
        '<p>生活中的购物应用：</p>' +
        '<div class="topic-example">' +
          '<p><strong>1. 算总价：</strong>买两件或多件商品，把各件价钱<strong>加起来</strong>。<br>' +
          '买一支铅笔 8角，一块橡皮 5角，一共：8角＋5角＝13角＝<strong>1元3角</strong>。</p>' +
          '<p><strong>2. 钱够不够：</strong>比较带的钱和商品总价。<br>' +
          '有 10元 钱，想买 12元 的文具盒：10元 ＜ 12元，<strong>钱不够</strong>，还差 2元。</p>' +
          '<p><strong>3. 找零计算：</strong>付的钱比商品贵时，收银员要找钱。<br>' +
          '<strong>应找的钱 ＝ 付的钱 － 商品总价</strong><br>' +
          '买 6元5角 的彩笔，付了 10元：10元 － 6元5角 ＝ <strong>3元5角</strong>。<br>' +
          '（检验：6元5角 ＋ 3元5角 ＝ 10元，正好等于付的钱）</p>' +
        '</div>' +
        '<p class="topic-rule">算总价用加法，算找零用减法。学会合理规划零花钱！</p>' +
        '</div>'
    }
  ];

  // 1. 认识面值 (recognize)
  function genRecognize(q, next, seed) {
    var mode = seed % 4;
    if (mode === 0) {
      // 看图选面值
      var d = DENOMINATIONS[next(0, DENOMINATIONS.length - 1)];
      q.prompt = '看图，这张（枚）人民币的面值是多少？';
      q.visualHTML = '<div class="money-quiz-visual">' + renderDenomSVG(d.id, d.type === 'coin' ? 90 : 180, d.type === 'coin' ? 90 : 96) + '</div>';
      var dist1 = d.num + (d.unit === '元' ? '角' : '分');
      var dist2 = (d.num === 1 ? 5 : 1) + d.unit;
      var dist3 = (d.num * 10) + d.unit;
      var candidates = [dist1, dist2, dist3];
      for (var k = 0; k < DENOMINATIONS.length; k++) candidates.push(DENOMINATIONS[k].shortName);
      var choices = buildChoices(d.shortName, candidates, 3);
      q.hint = '先看钱币上的阿拉伯数字，再看汉字单位（元、角、分）。';
      q.explanation = '这是' + d.name + '，面值是 ' + d.shortName + '。';
      q.data = { type: 'recognize_card', denom: d.id, answer: d.shortName };
      return choose(q, choices, d.shortName, next);
    } else if (mode === 1) {
      // 找出表示指定面值的钱币（如找出1元）
      var targetNum = [1, 5, 10, 20, 50, 100][next(0, 5)];
      var targetUnit = targetNum <= 5 ? (seed % 2 === 0 ? '元' : '角') : '元';
      var targetText = targetNum + targetUnit;
      var matches = DENOMINATIONS.filter(function (x) { return x.shortName.indexOf(targetText) !== -1; });
      var target = matches.length ? matches[next(0, matches.length - 1)] : DENOM_BY_ID['y1_c'];
      var others = DENOMINATIONS.filter(function (x) { return x.value !== target.value; });
      var otherNames = others.map(function (x) { return x.name; });
      var choices = buildChoices(target.name, otherNames, 3);
      q.prompt = '下面哪一个表示 ' + target.shortName + '？';
      q.visualHTML = '<div class="money-quiz-visual">' + renderDenomSVG(target.id, target.type === 'coin' ? 80 : 160, target.type === 'coin' ? 80 : 86) + '</div>';
      q.hint = '看清面值数字和是纸币还是硬币。';
      q.explanation = '图中的钱币是 ' + target.name + '。';
      q.data = { type: 'recognize_target', denom: target.id, target: target.name };
      return choose(q, choices, target.name, next);
    } else if (mode === 2) {
      // 相同面值的不同形式（例如1元纸币与1元硬币）
      var coinPaperPairs = [
        { name: '1元', paper: 'y1_p', coin: 'y1_c', desc: '1元纸币和1元硬币' },
        { name: '5角', paper: 'j5_p', coin: 'j5_c', desc: '5角纸币和5角硬币' },
        { name: '1角', paper: 'j1_p', coin: 'j1_c', desc: '1角纸币和1角硬币' }
      ];
      var pair = coinPaperPairs[next(0, coinPaperPairs.length - 1)];
      q.prompt = pair.desc + '的面值一样吗？';
      q.visualHTML = '<div class="money-compare-diagram"><div class="compare-side">' + renderDenomSVG(pair.paper, 120, 64) + '</div><div class="compare-vs">和</div><div class="compare-side">' + renderDenomSVG(pair.coin, 64, 64) + '</div></div>';
      q.hint = '一个是纸币，一个是硬币，但它们表示的钱数是一样的。';
      q.explanation = pair.desc + '虽然形式不同（一张是纸币，一枚是硬币），但面值完全一样，都是 ' + pair.name + '。';
      q.data = { type: 'recognize_same_value', pair: pair.name, answer: '一样' };
      return choose(q, ['一样', '纸币更多', '硬币更多'], '一样', next);
    } else {
      // 单位常识
      var knowledgeQuestions = [
        { p: '人民币的基本单位是什么？', c: ['元', '角', '分'], a: '元', exp: '人民币的基本单位是“元”，辅币单位是“角”和“分”。' },
        { p: '人民币的辅助单位是什么？', c: ['角和分', '米和厘米', '斤和两'], a: '角和分', exp: '元是基本单位，角和分是辅助单位。' },
        { p: '1元钱和1角钱，哪一个面值更大？', c: ['1元', '1角', '一样大'], a: '1元', exp: '1元＝10角，所以 1元 比 1角 大得多。' },
        { p: '我们在生活中爱护人民币，下面哪种做法是正确的？', c: ['平整放好，不在上面乱涂乱画', '在纸币上画画做记号', '把纸币折剪成小玩具'], a: '平整放好，不在上面乱涂乱画', exp: '人民币是国家法定货币，应当爱护，不能随意涂画或损坏。' }
      ];
      var item = knowledgeQuestions[next(0, knowledgeQuestions.length - 1)];
      q.prompt = item.p;
      q.hint = '想一想人民币的元、角、分单位关系。';
      q.explanation = item.exp;
      q.data = { type: 'recognize_faq', answer: item.a };
      return choose(q, item.c, item.a, next);
    }
  }

  // 2. 读写钱数 (readwrite)
  function genReadWrite(q, next, seed, range) {
    var mode = seed % 3;
    if (mode === 0) {
      // 组合钱币读金额（看图数钱）
      var maxBills = range <= 20 ? 3 : 5;
      var y = next(1, range <= 20 ? 8 : 45);
      var j = next(1, 9);
      var f = (seed % 4 === 0 && range > 20) ? next(1, 9) : 0;
      var totalCents = partsToCents(y, j, f);
      var correctStr = formatCN(totalCents, true);
      var parts = centsToParts(totalCents);

      // 选几个钱币拼出视觉图（用临时变量拆分，避免改写原始金额）
      var trayItems = [];
      var remainingYuan = y;
      var remainingJiao = j;
      var remainingFen = f;
      if (remainingYuan >= 50) { trayItems.push('y50'); remainingYuan -= 50; }
      if (remainingYuan >= 20) { trayItems.push('y20'); remainingYuan -= 20; }
      if (remainingYuan >= 10) { trayItems.push('y10'); remainingYuan -= 10; }
      if (remainingYuan >= 5)  { trayItems.push('y5');  remainingYuan -= 5; }
      while (remainingYuan > 0) { trayItems.push('y1_c'); remainingYuan--; }
      if (remainingJiao >= 5) { trayItems.push('j5_c'); remainingJiao -= 5; }
      while (remainingJiao > 0) { trayItems.push('j1_c'); remainingJiao--; }
      if (remainingFen >= 5) { trayItems.push('f5_c'); remainingFen -= 5; }
      while (remainingFen > 0) { trayItems.push('f1_c'); remainingFen--; }

      q.prompt = '看图，一共有多少钱？';
      q.visualHTML = renderTrayHTML(trayItems, '钱币组合');
      q.hint = '先数有几元，再数有几角，最后数有几分。';
      q.explanation = '整元部分有 ' + parts.yuan + '元，角部分有 ' + parts.jiao + '角' + (parts.fen > 0 ? '，分部分有 ' + parts.fen + '分' : '') + '，合起来是 ' + correctStr + '。';

      var dist1 = formatCN(partsToCents(parts.yuan + 1, parts.jiao, parts.fen));
      var dist2 = formatCN(partsToCents(parts.yuan, Math.max(0, parts.jiao - 1), parts.fen));
      var dist3 = (parts.yuan * 10 + parts.jiao) + '元';
      var choices = buildChoices(correctStr, [dist1, dist2, dist3, (parts.yuan + 2) + '元', (parts.yuan + 1) + '元'], 3);
      q.data = { type: 'readwrite_count', cents: totalCents, answer: correctStr };
      return choose(q, choices, correctStr, next);
    } else if (mode === 1) {
      // 小数标价 -> 读作元角分
      var y = next(1, range <= 20 ? 15 : 88);
      var j = next(1, 9);
      var f = (seed % 3 === 0) ? next(1, 9) : 0;
      var totalCents = partsToCents(y, j, f);
      var priceStr = formatPrice(totalCents);
      var correctStr = formatCN(totalCents, true);

      q.prompt = '商品标价 ' + priceStr + '，表示多少钱？';
      q.visualHTML = '<div class="price-tag-card"><span class="price-tag-label">标价</span><b class="price-tag-amount">' + priceStr + '</b></div>';
      q.hint = '小数点左边是元，右边第一位是角，第二位是分。';
      q.explanation = priceStr + ' 中小数点左边是 ' + y + '元，右边是 ' + j + '角' + (f ? f + '分' : '') + '，表示 ' + correctStr + '。';

      var dist1 = y + '元' + (j ? j + '分' : '');
      var dist2 = (y * 10 + j) + '元';
      var choices = buildChoices(correctStr, [dist1, dist2, (y + 1) + '元' + j + '角', (y + 2) + '元'], 3);
      q.data = { type: 'readwrite_price_to_cn', cents: totalCents, price: priceStr, answer: correctStr };
      return choose(q, choices, correctStr, next);
    } else {
      // 元角分 -> 对应商品标价
      var y = next(1, range <= 20 ? 18 : 68);
      var j = (seed % 2 === 0) ? next(1, 9) : 0;
      var f = (j === 0 || seed % 3 === 0) ? next(1, 9) : 0;
      if (j === 0 && f === 0) j = 5;
      var totalCents = partsToCents(y, j, f);
      var cnStr = formatCN(totalCents, true);
      var correctPrice = formatPrice(totalCents);

      q.prompt = cnStr + ' 对应的商品标价是哪个？';
      q.hint = '元对应小数点前面，角是小数点后第一位，分是第二位。';
      q.explanation = cnStr + ' 写作小数标价就是 ' + correctPrice + '。';

      var dist1 = (y + '.' + (j < 10 && f === 0 ? j : '0' + j)) + '0元';
      var dist2 = ((totalCents / 10).toFixed(2)) + '元';
      var dist3 = (totalCents) + '.00元';
      var choices = buildChoices(correctPrice, [dist1, dist2, dist3, (y + 1).toFixed(2) + '元', (y + 2).toFixed(2) + '元'], 3);
      q.data = { type: 'readwrite_cn_to_price', cents: totalCents, cn: cnStr, answer: correctPrice };
      return choose(q, choices, correctPrice, next);
    }
  }

  // 3. 元角分换算 (convert)
  function genConvert(q, next, seed, range) {
    var mode = seed % 5;
    if (mode === 0) {
      // 整元换角：X元＝多少角？
      var y = next(1, range <= 20 ? 15 : 60);
      var toJiao = seed % 2 === 0;
      q.kind = 'number';
      q.prompt = toJiao ? y + '元 ＝ 多少角？' : (y * 10) + '角 ＝ 多少元？';
      q.answer = toJiao ? y * 10 : y;
      q.unit = toJiao ? '角' : '元';
      q.hint = toJiao ? '1元＝10角。有几元，就有几个10角。' : '10角＝1元。把角除以10就是元。';
      q.explanation = y + '元 ＝ ' + (y * 10) + '角。' + (toJiao ? y + ' 个 10角 是 ' + (y * 10) + '角。' : (y * 10) + '角 里面有 ' + y + ' 个 10角，就是 ' + y + '元。');
      q.data = { type: 'convert_yuan_jiao', yuan: y, jiao: y * 10, answer: q.answer };
      return q;
    } else if (mode === 1) {
      // 角与分换算：X角＝多少分？
      var j = next(1, 9);
      var toFen = seed % 2 === 0;
      q.kind = 'number';
      q.prompt = toFen ? j + '角 ＝ 多少分？' : (j * 10) + '分 ＝ 多少角？';
      q.answer = toFen ? j * 10 : j;
      q.unit = toFen ? '分' : '角';
      q.hint = '1角＝10分。进率是10。';
      q.explanation = j + '角 ＝ ' + (j * 10) + '分。';
      q.data = { type: 'convert_jiao_fen', jiao: j, fen: j * 10, answer: q.answer };
      return q;
    } else if (mode === 2) {
      // 元与分换算：X元＝多少分？
      var y = next(1, range <= 20 ? 5 : 9);
      var toFen = seed % 2 === 0;
      q.kind = 'number';
      q.prompt = toFen ? y + '元 ＝ 多少分？' : (y * 100) + '分 ＝ 多少元？';
      q.answer = toFen ? y * 100 : y;
      q.unit = toFen ? '分' : '元';
      q.hint = '1元＝100分。1元里面有10个10分。';
      q.explanation = y + '元 ＝ ' + (y * 100) + '分。';
      q.data = { type: 'convert_yuan_fen', yuan: y, fen: y * 100, answer: q.answer };
      return q;
    } else if (mode === 3) {
      // 复合换单单位：几元几角＝多少角？
      var y = next(1, range <= 20 ? 8 : 15);
      var j = next(1, 9);
      var totalJiao = y * 10 + j;
      q.kind = 'number';
      q.prompt = y + '元' + j + '角 ＝ 多少角？';
      q.answer = totalJiao;
      q.unit = '角';
      q.hint = y + '元是 ' + (y * 10) + '角，再加上 ' + j + '角。';
      q.explanation = y + '元＝' + (y * 10) + '角，' + (y * 10) + '角 ＋ ' + j + '角 ＝ ' + totalJiao + '角。';
      q.data = { type: 'convert_compound_to_jiao', yuan: y, jiao: j, answer: totalJiao };
      return q;
    } else {
      // 单单位换复合：X角＝几元几角？
      var y = next(1, range <= 20 ? 6 : 18);
      var j = next(1, 9);
      var totalJiao = y * 10 + j;
      var correctStr = y + '元' + j + '角';
      q.prompt = totalJiao + '角 ＝ 几元几角？';
      q.hint = '十位上的数表示几元，个位上的数表示几角。';
      q.explanation = totalJiao + '角 里有 ' + y + '个10角（即' + y + '元）还剩 ' + j + '角，所以等于 ' + correctStr + '。';
      var dist1 = (y + 1) + '元' + j + '角';
      var dist2 = j + '元' + y + '角';
      var dist3 = totalJiao + '元';
      var choices = buildChoices(correctStr, [dist1, dist2, dist3, (y + 2) + '元' + j + '角'], 3);
      q.data = { type: 'convert_jiao_to_compound', jiao: totalJiao, answer: correctStr };
      return choose(q, choices, correctStr, next);
    }
  }

  // 4. 比较钱数 (compare)
  function genCompare(q, next, seed, range) {
    var mode = seed % 4;
    var leftCents, rightCents, leftStr, rightStr;

    if (mode === 0) {
      // 相同单位比较
      var isYuan = seed % 2 === 0;
      var val1 = next(1, range <= 20 ? 18 : 80);
      var val2 = next(1, range <= 20 ? 18 : 80);
      leftCents = isYuan ? val1 * 100 : val1 * 10;
      rightCents = isYuan ? val2 * 100 : val2 * 10;
      leftStr = val1 + (isYuan ? '元' : '角');
      rightStr = val2 + (isYuan ? '元' : '角');
    } else if (mode === 1) {
      // 不同单位比较（元与角，或元角与角）
      var y = next(1, range <= 20 ? 10 : 30);
      var j = next(1, 9);
      leftCents = y * 100 + (seed % 2 === 0 ? j * 10 : 0);
      leftStr = formatCN(leftCents);
      var offset = [ -10, 0, 10, 20, -20 ][next(0, 4)];
      rightCents = Math.max(10, leftCents + offset);
      rightStr = (rightCents / 10) + '角';
    } else if (mode === 2) {
      // 特殊换算相等比较（1元与10角、1元与100分、2元5角与25角、50角与5元）
      var y = next(1, range <= 20 ? 8 : 20);
      var hasJiao = seed % 2 === 0;
      var j = hasJiao ? next(1, 9) : 0;
      leftCents = y * 100 + j * 10;
      leftStr = formatCN(leftCents);
      rightCents = leftCents;
      if (hasJiao) {
        rightStr = (leftCents / 10) + '角';
      } else {
        var eqType = seed % 2;
        rightStr = eqType === 0 ? (y * 10) + '角' : (y * 100) + '分';
      }
    } else {
      // 细微差距比较（如 2元 与 18角；3元5角 与 40角）
      var y = next(1, range <= 20 ? 8 : 20);
      var j = next(1, 9);
      leftCents = y * 100 + j * 10;
      leftStr = formatCN(leftCents);
      var diff = [ -20, -10, 10, 20 ][next(0, 3)];
      rightCents = Math.max(10, leftCents + diff);
      rightStr = (rightCents / 10) + '角';
    }

    var relation = leftCents > rightCents ? '左边多' : leftCents < rightCents ? '右边多' : '一样多';
    q.prompt = '左边是 ' + leftStr + '，右边是 ' + rightStr + '。哪边钱更多？';
    q.visualHTML = '<div class="compare-amount-cards">' +
      '<div class="compare-amount-box box-left"><span class="box-tag">左边</span><b>' + leftStr + '</b><small>' + (leftCents / 10) + '角</small></div>' +
      '<div class="compare-amount-mid">VS</div>' +
      '<div class="compare-amount-box box-right"><span class="box-tag">右边</span><b>' + rightStr + '</b><small>' + (rightCents / 10) + '角</small></div>' +
      '</div>';
    q.hint = '先看单位，单位不同时先换成相同的单位（例如全部换成“角”）再比大小。';
    q.explanation = leftStr + ' ＝ ' + (leftCents / 10) + '角，' + rightStr + ' ＝ ' + (rightCents / 10) + '角。' + (relation === '一样多' ? '两边表示的钱数一样多。' : relation === '左边多' ? leftStr + ' ＞ ' + rightStr + '，所以左边多。' : leftStr + ' ＜ ' + rightStr + '，所以右边多。');
    q.data = { type: 'compare_money', left: leftStr, right: rightStr, leftCents: leftCents, rightCents: rightCents, answer: relation };
    return choose(q, ['左边多', '右边多', '一样多'], relation, next);
  }

  // 5. 简单加减 (calc)
  function genCalc(q, next, seed, range) {
    var isPlus = seed % 2 === 0;
    var mode = seed % 4;

    if (mode === 0) {
      // 同单位加减：X元 ＋ Y元，或 X角 － Y角
      var isYuan = seed % 3 === 0;
      var a = next(2, range <= 20 ? 12 : 45);
      var b = next(1, a - 1);
      var ans = isPlus ? (a + b) : (a - b);
      var unit = isYuan ? '元' : '角';
      q.kind = 'number';
      q.prompt = a + unit + (isPlus ? ' ＋ ' : ' － ') + b + unit + ' ＝ 多少' + unit + '？';
      q.answer = ans;
      q.unit = unit;
      q.hint = '两边单位相同，直接把前面的数字相' + (isPlus ? '加' : '减') + '。';
      q.explanation = a + (isPlus ? ' ＋ ' : ' － ') + b + ' ＝ ' + ans + '，所以是 ' + ans + unit + '。';
      q.data = { type: 'calc_same_unit', a: a, b: b, op: isPlus ? '+' : '-', answer: ans, unit: unit };
      return q;
    } else if (mode === 1) {
      // 元角不进退位加减（加减各半；加时角之和 < 10，减时角够减）
      // mode===1 时 seed%2 恒为 1，不能再用外层 isPlus，否则加法永不出现。
      var noCarryPlus = Math.floor(seed / 4) % 2 === 0;
      var y1 = next(1, range <= 20 ? 8 : 30);
      var j1 = next(1, 8);
      var y2 = next(1, range <= 20 ? 5 : 20);
      var j2 = noCarryPlus ? next(1, 9 - j1) : next(1, 8);
      if (!noCarryPlus) {
        if (y1 < y2) { var ty = y1; y1 = y2; y2 = ty; }
        if (j1 < j2) { var tj = j1; j1 = j2; j2 = tj; }
      }
      var ansY = noCarryPlus ? (y1 + y2) : (y1 - y2);
      var ansJ = noCarryPlus ? (j1 + j2) : (j1 - j2);
      var ansCents = partsToCents(ansY, ansJ, 0);
      var correctStr = formatCN(ansCents);

      var expr = y1 + '元' + j1 + '角 ' + (noCarryPlus ? '＋ ' : '－ ') + y2 + '元' + j2 + '角';
      q.prompt = expr + ' ＝ 几元几角？';
      q.hint = '元和元相' + (noCarryPlus ? '加' : '减') + '，角和角相' + (noCarryPlus ? '加' : '减') + '。这道题不用进位或退位。';
      q.explanation = '元部分：' + y1 + (noCarryPlus ? '＋' : '－') + y2 + '＝' + ansY + '元；角部分：' + j1 + (noCarryPlus ? '＋' : '－') + j2 + '＝' + ansJ + '角。合起来是 ' + correctStr + '。';
      var dist1 = (ansY + 1) + '元' + ansJ + '角';
      var dist2 = ansY + '元' + Math.max(0, ansJ - 1) + '角';
      var choices = buildChoices(correctStr, [dist1, dist2, (ansY + 2) + '元', (ansY + 1) + '元'], 3);
      q.data = { type: 'calc_no_carry', expr: expr, answer: correctStr, op: noCarryPlus ? '+' : '-' };
      return choose(q, choices, correctStr, next);
    } else if (mode === 2) {
      // 进位加法（满10角进1元）：例如 8角 ＋ 5角 ＝ 1元3角，或 1元7角 ＋ 5角 ＝ 2元2角
      var y1 = next(0, range <= 20 ? 5 : 20);
      var j1 = next(4, 9);
      var j2 = next(10 - j1, 9); // 保证 j1 + j2 >= 10
      var totalJiao = j1 + j2;
      var carryY = Math.floor(totalJiao / 10);
      var remJ = totalJiao % 10;
      var finalY = y1 + carryY;
      var correctStr = formatCN(partsToCents(finalY, remJ, 0));

      var leftExpr = (y1 > 0 ? y1 + '元' : '') + j1 + '角';
      var expr = leftExpr + ' ＋ ' + j2 + '角';
      q.prompt = expr + ' ＝ 多少钱？';
      q.hint = j1 + '角 ＋ ' + j2 + '角 ＝ ' + totalJiao + '角。满 10角 要换算成 1元！';
      q.explanation = j1 + '角 ＋ ' + j2 + '角 ＝ ' + totalJiao + '角 ＝ ' + carryY + '元' + remJ + '角。' + (y1 > 0 ? y1 + '元 ＋ ' + carryY + '元' + remJ + '角 ＝ ' + correctStr + '。' : '所以是 ' + correctStr + '。');
      var dist1 = finalY + '元' + (remJ + 1) + '角';
      var dist2 = (finalY - 1) + '元' + totalJiao + '角';
      var dist3 = totalJiao + '角';
      var choices = buildChoices(correctStr, [dist1, dist2, dist3, (finalY + 1) + '元' + remJ + '角'], 3);
      q.data = { type: 'calc_carry_add', expr: expr, answer: correctStr };
      return choose(q, choices, correctStr, next);
    } else {
      // 退位减法：2元 － 6角 ＝ 1元4角，或 3元2角 － 5角 ＝ 2元7角
      var y = next(1, range <= 20 ? 8 : 25);
      var j1 = next(0, 5);
      var j2 = next(j1 + 1, 9); // 保证 j1 < j2 必须退位
      var totalCents = y * 100 + j1 * 10 - j2 * 10;
      var correctStr = formatCN(totalCents);
      var expr = (y + '元' + (j1 > 0 ? j1 + '角' : '')) + ' － ' + j2 + '角';

      q.prompt = expr + ' ＝ 多少钱？';
      q.hint = '角不够减，从 ' + y + '元 中借 1元 变 10角 再减。';
      q.explanation = '从 ' + y + '元 里拿出 1元 变成 10角，' + (j1 > 0 ? '10角 ＋ ' + j1 + '角 ＝ ' + (10 + j1) + '角，' : '') + (10 + j1) + '角 － ' + j2 + '角 ＝ ' + (10 + j1 - j2) + '角。还剩 ' + (y - 1) + '元，合起来是 ' + correctStr + '。';
      var dist1 = y + '元' + (10 + j1 - j2) + '角';
      var dist2 = (y - 1) + '元' + (j2 - j1) + '角';
      var choices = buildChoices(correctStr, [dist1, dist2, (y - 1) + '元', (y + 1) + '元'], 3);
      q.data = { type: 'calc_borrow_sub', expr: expr, answer: correctStr };
      return choose(q, choices, correctStr, next);
    }
  }

  // 6. 购物与找零 (shopping)
  function genShopping(q, next, seed, range) {
    var mode = seed % 3;
    var goods = [
      { name: '铅笔', price: 80, str: '8角' },
      { name: '橡皮', price: 50, str: '5角' },
      { name: '尺子', price: 150, str: '1元5角' },
      { name: '笔记本', price: 300, str: '3元' },
      { name: '彩笔', price: 650, str: '6元5角' },
      { name: '剪刀', price: 400, str: '4元' },
      { name: '笔袋', price: 900, str: '9元' },
      { name: '故事书', price: 1200, str: '12元' },
      { name: '水彩画本', price: 1500, str: '15元' },
      { name: '文具礼盒', price: 2500, str: '25元' }
    ];

    if (mode === 0) {
      // 买单件商品付款找零
      var item = goods[next(0, range <= 20 ? 6 : goods.length - 1)];
      var pays = [ 100, 200, 500, 1000, 2000, 5000 ];
      var validPays = pays.filter(function (p) { return p > item.price; });
      var paid = validPays[next(0, Math.min(validPays.length - 1, 2))];
      var changeCents = paid - item.price;
      var changeStr = formatCN(changeCents);
      var paidStr = formatCN(paid);

      q.prompt = '买一件 ' + item.name + ' 需要 ' + item.str + '，付给售货员 ' + paidStr + '，应找回多少钱？';
      q.visualHTML = '<div class="shopping-question-card"><div class="goods-pill"><b>' + escapeHTML(item.name) + '</b><span>' + escapeHTML(item.str) + '</span></div><div class="paid-pill"><b>付了</b><span>' + escapeHTML(paidStr) + '</span></div></div>';
      q.hint = '应找回的钱 ＝ 付的钱 － 商品价钱。';
      q.explanation = paidStr + ' － ' + item.str + ' ＝ ' + changeStr + '。应找回 ' + changeStr + '。（验算：' + item.str + ' ＋ ' + changeStr + ' ＝ ' + paidStr + '）';
      var dist1 = formatCN(changeCents + 100);
      var dist2 = formatCN(Math.max(10, changeCents - 100));
      var dist3 = formatCN(paid - (item.price - 10));
      var choices = buildChoices(changeStr, [dist1, dist2, dist3, formatCN(changeCents + 50)], 3);
      q.data = { type: 'shopping_change', item: item.name, price: item.price, paid: paid, answer: changeStr };
      return choose(q, choices, changeStr, next);
    } else if (mode === 1) {
      // 钱够不够判断
      var item = goods[next(2, range <= 20 ? 7 : goods.length - 1)];
      var diff = [ -200, -100, 0, 100, 200 ][next(0, 4)];
      var myMoney = Math.max(100, item.price + diff);
      var myMoneyStr = formatCN(myMoney);
      var isEnough = myMoney >= item.price;
      var diffStr = formatCN(Math.abs(item.price - myMoney));

      q.prompt = '小明有 ' + myMoneyStr + '，想买一本 ' + item.str + ' 的' + item.name + '，他的钱够吗？';
      q.hint = '比较带的钱和商品的价格。如果带的钱大于或等于价格就够，小于就不够。';
      var ansText = isEnough ? '够' : '不够，还差 ' + diffStr;
      q.explanation = '小明有 ' + myMoneyStr + '，商品需要 ' + item.str + '。因为 ' + myMoneyStr + (myMoney > item.price ? ' ＞ ' : myMoney < item.price ? ' ＜ ' : ' ＝ ') + item.str + '，所以' + (isEnough ? '钱够了。' : '钱不够，还差 ' + diffStr + '。');
      var choices = isEnough ? ['够', '不够，还差 2元'] : ['够', '不够，还差 ' + diffStr];
      q.data = { type: 'shopping_enough', price: item.price, money: myMoney, isEnough: isEnough, answer: ansText };
      return choose(q, choices, ansText, next);
    } else {
      // 买两件商品算总价
      var it1 = goods[next(0, 4)];
      var it2 = goods[next(1, range <= 20 ? 5 : 8)];
      var totalCents = it1.price + it2.price;
      var totalStr = formatCN(totalCents);

      q.prompt = '买一件 ' + it1.name + '（' + it1.str + '）和一件 ' + it2.name + '（' + it2.str + '），一共需要多少钱？';
      q.visualHTML = '<div class="shopping-cart-card"><span class="cart-item">' + escapeHTML(it1.name) + ' <b>' + escapeHTML(it1.str) + '</b></span><span class="cart-plus">＋</span><span class="cart-item">' + escapeHTML(it2.name) + ' <b>' + escapeHTML(it2.str) + '</b></span></div>';
      q.hint = '把两件商品的价钱相加：' + it1.str + ' ＋ ' + it2.str + '。';
      q.explanation = it1.str + ' ＋ ' + it2.str + ' ＝ ' + totalStr + '。一共需要 ' + totalStr + '。';
      var dist1 = formatCN(totalCents + 100);
      var dist2 = formatCN(Math.max(10, totalCents - 100));
      var dist3 = formatCN(it1.price + it2.price + 50);
      var choices = buildChoices(totalStr, [dist1, dist2, dist3, formatCN(totalCents + 200)], 3);
      q.data = { type: 'shopping_total', it1: it1.name, it2: it2.name, total: totalCents, answer: totalStr };
      return choose(q, choices, totalStr, next);
    }
  }

  function generate(skillId, range, seed) {
    range = Number(range) === 100 ? 100 : 20;
    seed = seedNumber(seed);
    var next = random(seed);
    var q = { id: 'money:' + skillId + ':' + seed, skill: skillId, range: range };

    if (skillId === 'recognize') q = genRecognize(q, next, seed);
    else if (skillId === 'readwrite') q = genReadWrite(q, next, seed, range);
    else if (skillId === 'convert') q = genConvert(q, next, seed, range);
    else if (skillId === 'compare') q = genCompare(q, next, seed, range);
    else if (skillId === 'calc') q = genCalc(q, next, seed, range);
    else if (skillId === 'shopping') q = genShopping(q, next, seed, range);
    else throw new RangeError('Unknown money skill: ' + skillId);

    q.speech = q.prompt;
    q.printPrompt = q.prompt;
    return q;
  }

  MT.money = {
    id: 'money',
    title: '认识人民币',
    subtitle: '认识面值、元角分换算、计算与购物应用',
    skills: skills,
    generate: generate,
    denominations: DENOMINATIONS,
    denomById: DENOM_BY_ID,
    centsToParts: centsToParts,
    partsToCents: partsToCents,
    formatCN: formatCN,
    formatPrice: formatPrice,
    renderDenomSVG: renderDenomSVG,
    renderMoneyCard: renderMoneyCard,
    renderTrayHTML: renderTrayHTML
  };
})(typeof window !== 'undefined' ? (window.MT = window.MT || {}) : (typeof global !== 'undefined' ? (global.MT = global.MT || {}) : {}));
