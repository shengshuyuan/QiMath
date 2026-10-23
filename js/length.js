(function (MT) {
  'use strict';

  var SCREEN_NOTE = '屏幕为示意，请用真实尺子观察实际长度。';

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
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

  function svgOpen(label, height) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 ' + height + '" role="img" aria-label="' + escapeHTML(label) + '" style="display:block;width:100%;height:auto;font-family:system-ui,sans-serif">';
  }

  function figure(svg) {
    return '<figure class="length-diagram">' + svg + '<figcaption class="topic-note">' + SCREEN_NOTE + '</figcaption></figure>';
  }

  function ruler(start, end, max) {
    var x0 = 40;
    var step = 540 / max;
    var left = x0 + start * step;
    var right = x0 + end * step;
    var svg = svgOpen('厘米直尺：物体左端对齐 ' + start + '，右端对齐 ' + end + '。', 195);
    svg += '<rect x="28" y="105" width="564" height="70" rx="8" fill="#fff3cc" stroke="#b98a29" stroke-width="2"/>';
    svg += '<rect x="' + left + '" y="48" width="' + (right - left) + '" height="30" rx="5" fill="#7060d4"/>';
    svg += '<text x="' + ((left + right) / 2) + '" y="39" text-anchor="middle" font-size="24" fill="#40336c">物体</text>';
    svg += '<path d="M ' + left + ' 78 V 112 M ' + right + ' 78 V 112" stroke="#7060d4" stroke-width="2" stroke-dasharray="4 3"/>';
    for (var i = 0; i <= max; i++) {
      var x = x0 + i * step;
      svg += '<path d="M ' + x + ' 108 V ' + (i % 5 === 0 ? 139 : 129) + '" stroke="#624b1e" stroke-width="2"/>';
      svg += '<text x="' + x + '" y="166" text-anchor="middle" font-size="' + (max <= 10 ? 28 : 26) + '" fill="#4b3b1c">' + i + '</text>';
    }
    svg += '<text x="580" y="100" text-anchor="end" font-size="24" fill="#4b3b1c">单位：厘米</text></svg>';
    return figure(svg);
  }

  function meter() {
    var svg = svgOpen('1 米的示意米尺，分成 100 个 1 厘米的小格。每 10 厘米标一个数。', 180);
    svg += '<text x="310" y="28" text-anchor="middle" font-size="24" font-weight="700" fill="#40336c">1 米＝100 厘米</text>';
    svg += '<path d="M 40 57 V 45 H 580 V 57" fill="none" stroke="#7060d4" stroke-width="2"/>';
    for (var g = 0; g < 10; g++) {
      svg += '<rect x="' + (40 + g * 54) + '" y="68" width="54" height="58" fill="' + (g % 2 ? '#e8e0ff' : '#fff3cc') + '"/>';
    }
    for (var i = 0; i <= 100; i++) {
      var x = 40 + i * 5.4;
      svg += '<path d="M ' + x + ' 68 V ' + (i % 10 === 0 ? 99 : 82) + '" stroke="#624b1e" stroke-width="' + (i % 10 === 0 ? '2' : '1') + '"/>';
      if (i % 10 === 0) svg += '<text x="' + x + '" y="119" text-anchor="middle" font-size="18" fill="#4b3b1c">' + i + '</text>';
    }
    svg += '<text x="310" y="158" text-anchor="middle" font-size="20" fill="#40336c">每一大格 10 厘米，10 大格合起来是 100 厘米</text></svg>';
    return figure(svg);
  }

  function comparison(left, right) {
    var svg = svgOpen('左边：' + left.value + left.unit + '；右边：' + right.value + right.unit + '。', 130);
    svg += '<rect x="25" y="10" width="270" height="108" rx="16" fill="#eee9ff"/>';
    svg += '<rect x="325" y="10" width="270" height="108" rx="16" fill="#fff0d1"/>';
    svg += '<text x="160" y="42" text-anchor="middle" font-size="20" fill="#655b7e">左边</text>';
    svg += '<text x="460" y="42" text-anchor="middle" font-size="20" fill="#78613b">右边</text>';
    svg += '<text x="160" y="86" text-anchor="middle" font-size="30" font-weight="700" fill="#40336c">' + left.value + ' ' + left.unit + '</text>';
    svg += '<text x="460" y="86" text-anchor="middle" font-size="30" font-weight="700" fill="#70501b">' + right.value + ' ' + right.unit + '</text></svg>';
    return '<div class="length-diagram">' + svg + '</div>';
  }

  var skills = [
    {
      id: 'recognize',
      title: '认识米和厘米',
      description: '看看 1 厘米和 1 米，认识 m 与 cm。',
      lessonHTML: '<div class="topic-lesson"><p>测量长度，要选一个共同的单位。<strong>厘米</strong>常写作 <strong>cm</strong>，<strong>米</strong>常写作 <strong>m</strong>。</p>' +
        '<div class="topic-example"><p>拿一把真实直尺，找到相邻的两条厘米刻度线。比如从 0 到 1，这一段长 <strong>1 厘米</strong>。</p></div>' + ruler(0, 1, 10) +
        '<p>再看看真实米尺：从 0 到 100 厘米，这一整段就是 <strong>1 米</strong>。</p>' + meter() +
        '<p class="topic-rule">1 米＝100 厘米。米和厘米都能表示长度，1 米比 1 厘米长。</p></div>'
    },
    {
      id: 'unit',
      title: '选合适的单位',
      description: '测量身边的东西，选一个表达方便的单位。',
      lessonHTML: '<div class="topic-lesson"><p>先想一想物体有多长，再选单位，读数和记录会更方便。</p>' +
        '<div class="topic-example"><p><strong>较短的物体常用厘米：</strong>一支铅笔的长度、一块橡皮的长度、一枚纽扣的直径。</p>' +
        '<p><strong>较长的物体常用米：</strong>教室的长度、房间的宽度、旗杆的高度。</p></div>' +
        '<p class="topic-rule">记录时要带上单位。“15 厘米”和“15 米”表示的长度差很多。</p>' +
        '<p class="topic-note">同一段长度也可以用不同单位表示，例如 1 米也可以写成 100 厘米。这里练习的是通常选哪种单位更方便。</p></div>'
    },
    {
      id: 'ruler',
      title: '读尺量长度',
      description: '找起点、找终点，用终点刻度减起点刻度。',
      lessonHTML: '<div class="topic-lesson"><p>把直尺放平，沿着物体的长度方向测量。<strong>先看物体左端对齐的刻度，再看右端对齐的刻度。</strong></p>' +
        '<div class="topic-example"><p>左端对齐 0 厘米，右端对齐 6 厘米：<strong>6－0＝6</strong>，物体长 6 厘米。</p></div>' + ruler(0, 6, 10) +
        '<div class="topic-example"><p>左端没有对齐 0，也能量。左端在 3 厘米，右端在 12 厘米：<strong>12－3＝9</strong>，物体长 9 厘米。</p></div>' + ruler(3, 12, 15) +
        '<p class="topic-rule">长度＝终点刻度－起点刻度。只有起点是 0 时，终点的读数才等于物体的长度。</p></div>'
    },
    {
      id: 'compare',
      title: '比较长度',
      description: '先统一单位，再比较数的大小。',
      lessonHTML: '<div class="topic-lesson"><p><strong>单位相同</strong>，直接比较数：9 厘米比 7 厘米长。</p>' +
        '<p><strong>单位不同</strong>，先换成相同单位再比。不能只看数有多大。</p>' + comparison({ value: 2, unit: '米' }, { value: 150, unit: '厘米' }) +
        '<div class="topic-example"><p>2 米＝200 厘米，200＞150，所以 <strong>2 米比 150 厘米长</strong>。</p>' +
        '<p>1 米＝100 厘米，左右数的写法不同，表示的长度却一样。</p></div>' +
        '<p class="topic-rule">先看单位 → 统一单位 → 比较数值。</p></div>'
    },
    {
      id: 'convert',
      title: '米和厘米换算',
      description: '记住 1 米＝100 厘米，练习整米与厘米的换算。',
      lessonHTML: '<div class="topic-lesson">' + meter() +
        '<div class="topic-example"><p><strong>米换成厘米：</strong>每 1 米是 100 厘米。3 米里有 3 个 100 厘米，100＋100＋100＝300，所以 <strong>3 米＝300 厘米</strong>。</p>' +
        '<p><strong>厘米换成米：</strong>把每 100 厘米看作 1 组。400 厘米里有 4 组，所以 <strong>400 厘米＝4 米</strong>。</p></div>' +
        '<p class="topic-rule">米换厘米，数值乘 100；厘米换米，数值除以 100。长度相同，变的是数和单位。</p>' +
        '<p class="topic-note">这一阶段练习 1～9 米与 100～900 厘米的整米换算。</p></div>'
    }
  ];

  function segment(length) {
    var svg = svgOpen('一条直直的线段，有两个端点' + (length ? '，长 ' + length + ' 厘米' : '') + '。', 130);
    svg += '<path d="M 80 70 H 540" stroke="#7060d4" stroke-width="5"/><circle cx="80" cy="70" r="7" fill="#40336c"/><circle cx="540" cy="70" r="7" fill="#40336c"/>';
    svg += '<text x="80" y="110" text-anchor="middle" font-size="22">端点</text><text x="540" y="110" text-anchor="middle" font-size="22">端点</text>';
    if (length) svg += '<text x="310" y="40" text-anchor="middle" font-size="26">' + length + ' 厘米</text>';
    return figure(svg + '</svg>');
  }

  skills.push({
    id: 'segment', title: '认识和画线段', description: '线段是直的，有两个端点，可以量出长度。',
    lessonHTML: '<div class="topic-lesson"><p>把一根线拉紧，两手之间的一段可以看作<strong>线段</strong>。线段是直的，有两个端点，可以量出长度。</p>' + segment(5) +
      '<div class="topic-example"><p>画一条 5 厘米的线段：在 0 刻度处点一个端点，沿尺子画到 5 厘米处，再标出另一个端点。</p></div>' +
      '<p class="topic-rule">直直的、两个端点、可以量长度。弯曲的线不是线段。</p><p class="topic-note">请在纸上用真实尺子画一画，再检查端点和长度。</p></div>'
  }, {
    id: 'calculate', title: '长度的加减', description: '单位相同时相加减，单位不同时先换算。',
    lessonHTML: '<div class="topic-lesson"><p>长度相加或相减，先看单位是否相同。</p><div class="topic-example"><p>一根彩带长 80 厘米，接上 15 厘米：80＋15＝95 厘米。</p><p>1 米彩带剪去 30 厘米：先把 1 米换成 100 厘米，再算 100－30＝70 厘米。</p></div><p class="topic-rule">先统一单位 → 再计算 → 答案带单位。</p></div>'
  });

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

  function recognition(q, next) {
    var questions = [
      { prompt: '长度单位 cm 的中文名称是什么？', choices: ['厘米', '米'], correct: '厘米', explanation: 'cm 表示厘米，m 表示米。' },
      { prompt: '长度单位 m 的中文名称是什么？', choices: ['厘米', '米'], correct: '米', explanation: 'm 表示米，cm 表示厘米。' },
      { prompt: '表示“厘米”的写法是哪一个？', choices: ['cm', 'm'], correct: 'cm', explanation: '厘米写作 cm，米写作 m。' },
      { prompt: '表示“米”的写法是哪一个？', choices: ['cm', 'm'], correct: 'm', explanation: '米写作 m，厘米写作 cm。' },
      { prompt: '1 米平均分成 100 小段，每一小段长多少？', choices: ['1 厘米', '1 米', '100 厘米'], correct: '1 厘米', explanation: '1 米＝100 厘米，平均分成 100 小段，每段就是 1 厘米。' },
      { prompt: '真实直尺上，从 0 厘米刻度到 1 厘米刻度，这一段长多少？', choices: ['1 厘米', '1 米', '10 厘米'], correct: '1 厘米', explanation: '相邻两条厘米刻度线之间的长度是 1 厘米。' },
      { prompt: '下面哪一句正确？', choices: ['1 米＝100 厘米', '1 米＝10 厘米', '1 厘米＝100 米'], correct: '1 米＝100 厘米', explanation: '1 米和 100 厘米表示相同的长度。' },
      { prompt: '1 米和 1 厘米，哪个表示的长度更长？', choices: ['1 米', '1 厘米', '一样长'], correct: '1 米', explanation: '1 米＝100 厘米，所以 1 米比 1 厘米长。' }
    ];
    var index = next(0, questions.length - 1);
    var item = questions[index];
    q.prompt = item.prompt;
    q.hint = '想一想真实直尺和米尺：cm 是厘米，m 是米，1 米＝100 厘米。';
    q.explanation = item.explanation;
    q.data = { type: 'recognize', item: index, correctChoice: item.correct };
    return choose(q, item.choices, item.correct, next);
  }

  function selectUnit(q, next) {
    var items = [
      { object: '一支铅笔的长度', unit: '厘米' },
      { object: '一块橡皮的长度', unit: '厘米' },
      { object: '一枚纽扣的直径', unit: '厘米' },
      { object: '一根粉笔的长度', unit: '厘米' },
      { object: '一把小勺的长度', unit: '厘米' },
      { object: '一间教室的长度', unit: '米' },
      { object: '一个房间的宽度', unit: '米' },
      { object: '学校旗杆的高度', unit: '米' },
      { object: '一段走廊的长度', unit: '米' },
      { object: '一辆公共汽车的长度', unit: '米' }
    ];
    var item = items[next(0, items.length - 1)];
    q.prompt = '测量' + item.object + '，通常选哪个单位更方便？';
    q.hint = '较短的物体通常用厘米，较长的物体通常用米，记录起来更方便。';
    q.explanation = item.object + (item.unit === '厘米' ? '比较短，通常用厘米记录更方便。' : '比较长，通常用米记录更方便。');
    q.data = { type: 'unit', object: item.object, expectedUnit: item.unit };
    return choose(q, ['厘米', '米'], item.unit, next);
  }

  function readRuler(q, next, seed) {
    var start = seed % 2 === 0 ? 0 : next(1, 5);
    var length = next(1, start === 0 ? 10 : 15 - start);
    var end = start + length;
    var max = end <= 10 ? 10 : 15;
    q.kind = 'number';
    q.prompt = '看直尺，物体长多少厘米？';
    q.visualHTML = ruler(start, end, max);
    q.answer = length;
    q.unit = '厘米';
    q.hint = '先看左端和右端的刻度。长度＝终点刻度－起点刻度。';
    q.explanation = end + '－' + start + '＝' + length + '，所以物体长 ' + length + ' 厘米。' + (start ? '起点不是 0，不能直接把终点读数当作长度。' : '起点是 0，长度就是终点的读数。');
    q.data = { type: 'ruler', start: start, end: end, axisMax: max, length: length };
    return q;
  }

  function measure(value, unit) {
    return { value: value, unit: unit, cm: unit === '米' ? value * 100 : value };
  }

  function compare(q, next, seed) {
    var units = [['米', '米'], ['厘米', '厘米'], ['米', '厘米'], ['厘米', '米']][seed % 4];
    var left = measure(units[0] === '米' ? next(1, 9) : next(1, 18) * 50, units[0]);
    var right = measure(units[1] === '米' ? next(1, 9) : next(1, 18) * 50, units[1]);
    if (seed % 5 === 0) {
      var sameMeters = next(1, 9);
      left = measure(units[0] === '米' ? sameMeters : sameMeters * 100, units[0]);
      right = measure(units[1] === '米' ? sameMeters : sameMeters * 100, units[1]);
    }
    var relation = left.cm > right.cm ? 'greater' : left.cm < right.cm ? 'less' : 'equal';
    q.prompt = '左边是 ' + left.value + ' ' + left.unit + '，右边是 ' + right.value + ' ' + right.unit + '。比较它们的长度。';
    q.visualHTML = comparison(left, right);
    q.hint = left.unit === right.unit ? '两边单位相同，直接比较数的大小。' : '先统一成厘米再比较。1 米＝100 厘米。';
    q.explanation = left.value + ' ' + left.unit + '＝' + left.cm + ' 厘米，' + right.value + ' ' + right.unit + '＝' + right.cm + ' 厘米。' + (relation === 'equal' ? '两边一样长。' : relation === 'greater' ? '左边更长。' : '右边更长。');
    q.data = { type: 'compare', left: left, right: right, relation: relation };
    return choose(q, ['左边更长', '右边更长', '一样长'], relation === 'equal' ? '一样长' : relation === 'greater' ? '左边更长' : '右边更长', next);
  }

  function convert(q, next, seed) {
    var meters = next(1, 9);
    var toCM = seed % 2 === 0;
    q.kind = 'number';
    q.prompt = toCM ? meters + ' 米＝多少厘米？' : (meters * 100) + ' 厘米＝多少米？';
    q.answer = toCM ? meters * 100 : meters;
    q.unit = toCM ? '厘米' : '米';
    q.hint = toCM ? '每 1 米是 100 厘米。有几米，就有几个 100 厘米。' : '每 100 厘米是 1 米，数一数有几个 100 厘米。';
    q.explanation = meters + ' 米＝' + (meters * 100) + ' 厘米。' + (toCM ? meters + ' 个 100 是 ' + (meters * 100) + '。' : (meters * 100) + ' 里面有 ' + meters + ' 个 100。');
    q.data = { type: 'convert', direction: toCM ? 'm-cm' : 'cm-m', meters: meters, centimeters: meters * 100 };
    return q;
  }

  function generate(skillId, range, seed) {
    seed = seedNumber(seed);
    var next = random(seed);
    var q = { id: 'length:' + skillId + ':' + seed, skill: skillId };
    if (skillId === 'recognize') q = recognition(q, next);
    else if (skillId === 'unit') q = selectUnit(q, next);
    else if (skillId === 'ruler') q = readRuler(q, next, seed);
    else if (skillId === 'compare') q = compare(q, next, seed);
    else if (skillId === 'convert') q = convert(q, next, seed);
    else if (skillId === 'segment') {
      var facts = [
        ['一条线段有几个端点？', ['1 个', '2 个', '没有端点'], '2 个', '一条线段有两个端点。'],
        ['哪一种线可以是线段？', ['直直的，有两个端点', '弯弯的，有两个端点', '直直的，没有端点'], '直直的，有两个端点', '线段必须是直的，而且有两个端点。'],
        ['画 6 厘米的线段，起点在 2 厘米刻度，终点应在哪个刻度？', ['6 厘米', '8 厘米', '4 厘米'], '8 厘米', '2＋6＝8，终点应在 8 厘米刻度。']
      ];
      var fact = facts[next(0, facts.length - 1)];
      q.prompt = fact[0]; q.hint = '线段是直的，有两个端点；长度＝终点刻度－起点刻度。';
      q.explanation = fact[3]; q.data = { item: facts.indexOf(fact) };
      q = choose(q, fact[1], fact[2], next);
    }
    else if (skillId === 'calculate') {
      var total = next(1, 9) * 100, part = next(1, 9) * 10, subtract = seed % 2 === 0;
      q.kind = 'number'; q.unit = '厘米';
      q.prompt = subtract ? (total / 100) + ' 米彩带剪去 ' + part + ' 厘米，还剩多少厘米？' : part + ' 厘米彩带接上 ' + (total / 100) + ' 米，一共多少厘米？';
      q.answer = subtract ? total - part : total + part;
      q.hint = '先把米换成厘米，1 米＝100 厘米，再计算。';
      q.explanation = (total / 100) + ' 米＝' + total + ' 厘米，' + total + (subtract ? '－' : '＋') + part + '＝' + q.answer + '（厘米）。';
      q.data = { total: total, part: part, subtract: subtract };
    }
    else throw new RangeError('Unknown length skill: ' + skillId);
    q.speech = q.prompt;
    q.printPrompt = q.prompt;
    return q;
  }

  MT.length = {
    id: 'length',
    title: '长度单位',
    subtitle: '认识米和厘米、读尺、线段、比较与计算',
    skills: skills,
    generate: generate
  };
})(window.MT = window.MT || {});
