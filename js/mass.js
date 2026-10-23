(function (MT) {
  'use strict';

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function scale(value, unit) {
    return '<figure class="length-diagram"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 230" role="img" aria-label="' + esc('电子秤显示 ' + value + ' ' + unit) + '" style="display:block;width:100%;height:auto"><rect x="90" y="25" width="260" height="32" rx="12" fill="#e1d9fa" stroke="#7060d4" stroke-width="3"/><path d="M 125 60 L 75 200 H 365 L 315 60 Z" fill="#fff3cc" stroke="#b98a29" stroke-width="3"/><rect x="120" y="95" width="200" height="65" rx="8" fill="#f5fff2" stroke="#637d5b" stroke-width="2"/><text x="220" y="139" text-anchor="middle" font-size="32" fill="#304b2c">' + esc(value + ' ' + unit) + '</text></svg><figcaption class="topic-note">看清数字，也要看清显示的单位。</figcaption></figure>';
  }
  function choice(q, choices, correct, seed) {
    var state = seed >>> 0;
    q.kind = 'choice'; q.choices = choices.slice();
    for (var i = q.choices.length - 1; i > 0; i--) {
      state = (state + 0x6d2b79f5) >>> 0;
      var mixed = Math.imul(state ^ (state >>> 15), state | 1);
      mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
      var at = ((mixed ^ (mixed >>> 14)) >>> 0) % (i + 1);
      var temp = q.choices[i]; q.choices[i] = q.choices[at]; q.choices[at] = temp;
    }
    q.answer = q.choices.indexOf(correct); q.data.correctChoice = correct;
  }
  var items = [
    { object: '一枚二分硬币约重 1', unit: '克' },
    { object: '一个鸡蛋约重 50', unit: '克' },
    { object: '一袋食盐约重 500', unit: '克' },
    { object: '一个苹果约重 200', unit: '克' },
    { object: '一个小学生约重 25', unit: '千克' },
    { object: '一袋大米约重 5', unit: '千克' },
    { object: '一个西瓜约重 3', unit: '千克' },
    { object: '一位成年人约重 60', unit: '千克' }
  ];
  var skills = [
    { id: 'unit', title: '认识克和千克', description: '选合适的质量单位，建立轻重感觉。', lessonHTML: '<p>表示物体有多重，常用 <strong>克（g）</strong>和 <strong>千克（kg）</strong>。千克也叫公斤。</p><div class="topic-example"><p>一枚二分硬币约重 1 克，一个鸡蛋约重 50 克；一袋大米可以重 5 千克，一个小学生可以重 25 千克。</p></div><p class="topic-rule">较轻的物品通常用克；较重的物体通常用千克。1 千克＝1000 克。</p><p class="topic-note">这些是帮助估量的例子，实物质量会不同。物体看起来大，不一定更重。</p>' },
    { id: 'convert', title: '克和千克换算', description: '每 1000 克组成 1 千克。', lessonHTML: '<p class="topic-rule">1 千克＝1000 克。</p><div class="topic-example"><p>3 千克是 3 个 1000 克，所以 3 千克＝3000 克。</p><p>4000 克里有 4 个 1000 克，所以 4000 克＝4 千克。</p></div><p>同一物体换一个单位表示，质量不会改变。这里练习 1～9 千克与 1000～9000 克的整千克换算。</p>' },
    { id: 'compare', title: '比较物体的轻重', description: '先统一单位，再比较数值。', lessonHTML: '<p>单位相同可以直接比较数；单位不同要先统一。</p><div class="topic-example"><p>2 千克＝2000 克，2000 克＞1500 克，所以 2 千克更重。</p><p>1 千克棉花与 1 千克铁一样重，虽然体积可能不同。</p></div><p class="topic-rule">不能只比较数字，也不能只看物体大小：先看单位，统一单位，再比较。</p>' },
    { id: 'calculate', title: '质量加减计算', description: '先统一成克，再算合起来或还剩多少。', lessonHTML: '<p>单位不同时，先统一单位再相加、相减。</p><div class="topic-example"><p>1 千克苹果加 500 克苹果：1000＋500＝1500 克。</p><p>2 千克大米吃掉 500 克：2000－500＝1500 克。</p></div><p class="topic-rule">先换单位，再计算，最后写单位。</p>' },
    { id: 'scale', title: '读秤和估量', description: '认常见秤，读出数字和单位。', lessonHTML: '<p>称物品可以用天平、台秤、电子秤、体重秤等工具。用前应按工具要求放平、归零，再称物体。</p>' + scale(500, 'g') + '<p>显示 500 g，就是 500 克；显示 3 kg，就是 3 千克。数字后面的单位不能漏。</p><p class="topic-rule">先估一估，再用合适的秤称一称。估计和实际测量会有差别。</p>' }
  ];
  function measure(value, unit) { return { value: value, unit: unit, grams: unit === '千克' ? value * 1000 : value }; }
  skills.forEach(function (skill) { skill.lessonHTML = '<div class="topic-lesson">' + skill.lessonHTML + '</div>'; });
  function generate(skill, range, seed) {
    seed = isFinite(Number(seed)) ? Math.floor(Number(seed)) >>> 0 : 0;
    var q = { id: 'mass:' + skill + ':' + seed, skill: skill, data: { type: skill } };
    if (skill === 'unit') {
      var item = items[seed % items.length]; q.prompt = item.object + '（　）。括号里通常填哪个单位？'; q.hint = '先想一想实际有多重，克用于较轻物品，千克用于较重物体。'; q.explanation = item.object + ' ' + item.unit + '，这是帮助估量的例子，实际应称一称。'; q.data.item = seed % items.length; q.data.expectedUnit = item.unit;
      choice(q, ['克', '千克'], item.unit, seed);
    } else if (skill === 'convert') {
      var kg = seed % 9 + 1, toGrams = Math.floor(seed / 9) % 2 === 0;
      q.kind = 'number'; q.prompt = toGrams ? kg + ' 千克＝多少克？' : kg * 1000 + ' 克＝多少千克？'; q.answer = toGrams ? kg * 1000 : kg; q.unit = toGrams ? '克' : '千克';
      q.hint = '每 1 千克是 1000 克。'; q.explanation = kg + ' 千克＝' + kg * 1000 + ' 克。' + kg * 1000 + ' 里有 ' + kg + ' 个 1000。'; q.data.kilograms = kg; q.data.grams = kg * 1000; q.data.direction = toGrams ? 'kg-g' : 'g-kg';
    } else if (skill === 'compare') {
      var left = measure(seed % 9 + 1, '千克'), right = measure((Math.floor(seed / 9) % 18 + 1) * 500, '克');
      if (seed % 5 === 0) right = measure(left.grams, '克');
      if (seed % 2) { var swap = left; left = right; right = swap; }
      var correct = left.grams === right.grams ? '一样重' : left.grams > right.grams ? '左边更重' : '右边更重';
      q.prompt = '左边 ' + left.value + ' ' + left.unit + '，右边 ' + right.value + ' ' + right.unit + '，哪边更重？'; q.hint = '先都换成克，再比较。1 千克＝1000 克。'; q.explanation = '左边是 ' + left.grams + ' 克，右边是 ' + right.grams + ' 克，所以' + correct + '。'; q.data.left = left; q.data.right = right;
      choice(q, ['左边更重', '右边更重', '一样重'], correct, seed);
    } else if (skill === 'calculate') {
      var initial = seed % 5 + 2, change = (Math.floor(seed / 5) % 4 + 1) * 500, subtract = Math.floor(seed / 20) % 2 === 1;
      q.kind = 'number'; q.prompt = initial + ' 千克大米' + (subtract ? '，吃掉 ' : '，又买来 ') + change + ' 克，现在有多少克？';
      q.answer = initial * 1000 + (subtract ? -change : change); q.unit = '克'; q.hint = '先把千克换成克，再按题意相加或相减。';
      q.explanation = initial + ' 千克＝' + initial * 1000 + ' 克；' + initial * 1000 + (subtract ? '－' : '＋') + change + '＝' + q.answer + '，现在有 ' + q.answer + ' 克。';
      q.data.initialGrams = initial * 1000; q.data.changeGrams = change; q.data.subtract = subtract;
    } else if (skill === 'scale') {
      var grams = seed % 2 === 0, value = grams ? (Math.floor(seed / 2) % 18 + 1) * 50 : Math.floor(seed / 2) % 9 + 1;
      q.kind = 'number'; q.prompt = '看电子秤，物品的质量是多少' + (grams ? '克' : '千克') + '？'; q.visualHTML = scale(value, grams ? 'g' : 'kg'); q.answer = value; q.unit = grams ? '克' : '千克'; q.hint = '先看数字，再看单位：g 是克，kg 是千克。'; q.explanation = '显示 ' + value + ' ' + (grams ? 'g' : 'kg') + '，就是 ' + value + ' ' + q.unit + '。'; q.data.value = value; q.data.unit = q.unit;
    } else throw new RangeError('Unknown mass skill: ' + skill);
    q.speech = q.prompt; q.printPrompt = q.prompt; return q;
  }
  MT.mass = { id: 'mass', title: '克和千克', subtitle: '认识质量单位、读秤、换算、比较和计算', skills: skills, generate: generate };
})(window.MT = window.MT || {});
