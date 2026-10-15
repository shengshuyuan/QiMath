(function (MT) {
  'use strict';

  var SYMBOLS = { '+': '＋', '-': '−', '*': '×', '/': '÷' };
  var WORDS = { '+': '加', '-': '减', '*': '乘', '/': '除以' };
  var RULES = {
    addsub: '只有加法和减法，按从左往右的顺序计算。',
    muldiv: '只有乘法和除法，按从左往右的顺序计算。',
    priority: '没有括号时，先算乘法和除法，再算加法和减法。',
    brackets: '有小括号时，先算括号里面，再算括号外面。'
  };
  var pairCache = {};
  var planCache = {};

  // 每个模板只描述两个运算符、先算的位置与括号位置，不解析表达式。
  var TEMPLATES = {
    addsub: [
      ['+', '-', 0], ['-', '+', 0], ['+', '+', 0], ['-', '-', 0]
    ],
    muldiv: [
      ['*', '/', 0], ['/', '*', 0], ['*', '*', 0], ['/', '/', 0]
    ],
    priority: [
      ['+', '*', 1], ['-', '*', 1], ['+', '/', 1], ['-', '/', 1],
      ['*', '+', 0], ['*', '-', 0], ['/', '+', 0], ['/', '-', 0]
    ],
    brackets: [
      ['+', '*', 0, 'left'], ['-', '*', 0, 'left'],
      ['+', '/', 0, 'left'], ['-', '/', 0, 'left'],
      ['*', '+', 1, 'right'], ['*', '-', 1, 'right'],
      ['/', '+', 1, 'right'], ['/', '-', 1, 'right'],
      ['-', '+', 1, 'right'], ['-', '-', 1, 'right'],
      ['/', '*', 1, 'right'], ['/', '/', 1, 'right'],
      ['*', '+', 0, 'left'], ['/', '-', 0, 'left'],
      ['+', '*', 1, 'right'], ['-', '/', 1, 'right']
    ]
  };

  function calculate(op, a, b, range) {
    var result;
    if (op === '+') result = a + b;
    else if (op === '-') result = a - b;
    else if (op === '*') {
      if (a < 1 || a > 9 || b < 1 || b > 9) return null;
      result = a * b;
    } else {
      if (b < 1 || b > 9 || a % b !== 0) return null;
      result = a / b;
      if (result < 1 || result > 9) return null;
    }
    return result >= 0 && result <= range ? result : null;
  }

  // 按结果分组，生成题目时先选中间结果，再挑能接上的第二步。
  // 这样不需要随机重试，也不会在较小范围里生成负数或分数。
  function pairs(op, range) {
    var key = op + ':' + range;
    if (pairCache[key]) return pairCache[key];
    var groups = {};
    var a, b, value;
    for (a = 0; a <= range; a++) {
      for (b = 0; b <= range; b++) {
        value = calculate(op, a, b, range);
        if (value !== null) {
          if (!groups[value]) groups[value] = [];
          groups[value].push([a, b]);
        }
      }
    }
    pairCache[key] = groups;
    return groups;
  }

  function plan(template, range) {
    var key = template.slice(0, 3).join(':') + ':' + range;
    if (planCache[key]) return planCache[key];
    var first = template[2];
    var firstOp = template[first];
    var nextOp = template[1 - first];
    var groups = pairs(firstOp, range);
    var out = [];
    var value, other, choices;
    for (value = 0; value <= range; value++) {
      if (!groups[value]) continue;
      choices = [];
      for (other = 0; other <= range; other++) {
        var answer = first === 0
          ? calculate(nextOp, value, other, range)
          : calculate(nextOp, other, value, range);
        if (answer !== null) choices.push(other);
      }
      if (choices.length) out.push({ value: value, pairs: groups[value], others: choices });
    }
    planCache[key] = out;
    return out;
  }

  function normalizeSeed(seed) {
    var number = Number(seed);
    return isFinite(number) ? Math.floor(number) >>> 0 : 0;
  }

  function random(seed) {
    var state = (seed ^ 0x9e3779b9) >>> 0;
    return function (size) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return Math.floor(state / 4294967296 * size);
    };
  }

  function term(a, op, b) { return a + ' ' + SYMBOLS[op] + ' ' + b; }

  function question(skill, range, seed, numbers, template) {
    var left = term(numbers[0], template[0], numbers[1]);
    var right = term(numbers[1], template[1], numbers[2]);
    var first = template[2];
    var group = template[3] || null;
    var intermediate = calculate(template[first], numbers[first], numbers[first + 1], range);
    var reduced = first === 0
      ? term(intermediate, template[1], numbers[2])
      : term(numbers[0], template[0], intermediate);
    var answer = first === 0
      ? calculate(template[1], intermediate, numbers[2], range)
      : calculate(template[0], numbers[0], intermediate, range);
    var expression = group === 'left'
      ? '（' + left + '） ' + SYMBOLS[template[1]] + ' ' + numbers[2]
      : group === 'right'
        ? numbers[0] + ' ' + SYMBOLS[template[0]] + ' （' + right + '）'
        : left + ' ' + SYMBOLS[template[1]] + ' ' + numbers[2];
    var firstChoices = [left, right];
    var steps = [firstChoices[first] + ' ＝ ' + intermediate, reduced + ' ＝ ' + answer];
    var spokenLeft = numbers[0] + WORDS[template[0]] + numbers[1];
    var spokenRight = numbers[1] + WORDS[template[1]] + numbers[2];
    var spokenExpression = group === 'left'
      ? '小括号，' + spokenLeft + '，括号结束，' + WORDS[template[1]] + numbers[2]
      : group === 'right'
        ? numbers[0] + WORDS[template[0]] + '，小括号，' + spokenRight + '，括号结束'
        : spokenLeft + WORDS[template[1]] + numbers[2];
    return {
      id: 'mixed:' + skill + ':' + range + ':' + seed,
      skill: skill,
      range: range,
      kind: 'steps',
      prompt: '先选出第一步，再算出中间结果和最后答案。',
      expression: expression,
      firstChoices: firstChoices,
      correctFirst: first,
      intermediate: intermediate,
      reduced: reduced,
      answer: answer,
      steps: steps,
      rule: RULES[skill],
      hint: '先算 ' + firstChoices[first] + '，把结果写回原式。',
      explanation: '先算 ' + steps[0] + '，再算 ' + steps[1] + '。',
      speech: spokenExpression + '，等于多少？' + RULES[skill],
      printPrompt: expression + ' ＝ ______',
      numbers: numbers.slice(),
      operators: template.slice(0, 2),
      group: group,
      first: first
    };
  }

  function generate(skillId, range, seed) {
    var skill = Object.prototype.hasOwnProperty.call(TEMPLATES, skillId) ? skillId : 'addsub';
    range = Number(range) === 100 ? 100 : 20;
    seed = normalizeSeed(seed);
    var templates = TEMPLATES[skill];
    var template = templates[seed % templates.length];
    var pick = random(seed);
    var options = plan(template, range);
    var option = options[pick(options.length)];
    var pair = option.pairs[pick(option.pairs.length)];
    var others = option.others;
    if (template[0] === template[1]) {
      // 两个按钮若都显示「2 ＋ 2」，孩子无法凭文字区分左右位置。
      // 保留同级连算，但避开这类重复的选项。
      var boundary = template[2] === 0 ? 0 : 1;
      var distinct = others.filter(function (n) { return n !== pair[boundary]; });
      if (!distinct.length) {
        for (var i = 0; i < option.pairs.length; i++) {
          if (option.pairs[i][boundary] !== others[0]) {
            pair = option.pairs[i];
            break;
          }
        }
        distinct = others.filter(function (n) { return n !== pair[boundary]; });
      }
      others = distinct;
    }
    var other = others[pick(others.length)];
    var numbers = template[2] === 0 ? [pair[0], pair[1], other] : [other, pair[0], pair[1]];
    return question(skill, range, seed, numbers, template);
  }

  MT.mixed = {
    id: 'mixed',
    title: '混合运算',
    subtitle: '先看顺序，再一步一步算',
    skills: [
      {
        id: 'addsub', title: '加减混合',
        description: '从 20 以内起步，再挑战 100 以内。',
        lessonHTML: '<div class="topic-rule">只有加法和减法，从左往右依次计算。</div>' +
          '<p>先圈出最左边的两个数，把第一步的结果写回算式，再算下一步。</p>' +
          '<div class="topic-example">16 − 6 ＋ 2<br>＝ 10 ＋ 2<br>＝ 12</div>' +
          '<p>减法和加法同级。看到加号，也要先把左边的减法算完。</p>',
        example: question('addsub', 20, 'example', [16, 6, 2], ['-', '+', 0])
      },
      {
        id: 'muldiv', title: '乘除混合',
        description: '用表内乘除法，练习从左往右计算。',
        lessonHTML: '<div class="topic-rule">只有乘法和除法，也从左往右依次计算。</div>' +
          '<p>乘法和除法同级，不能看到乘号就抢先算。</p>' +
          '<div class="topic-example">24 ÷ 3 × 2<br>＝ 8 × 2<br>＝ 16</div>' +
          '<p>这里先算 24 ÷ 3。把右边的 3 × 2 抢先算，运算顺序就变了。</p>',
        example: question('muldiv', 100, 'example', [24, 3, 2], ['/', '*', 0])
      },
      {
        id: 'priority', title: '先乘除后加减',
        description: '先找到乘除法，再完成加减法。',
        lessonHTML: '<div class="topic-rule">没有括号时，先算乘除，再算加减。</div>' +
          '<p>先观察整道算式。乘除法即使在右边，也要先算。</p>' +
          '<div class="topic-example">6 ＋ 3 × 4<br>＝ 6 ＋ 12<br>＝ 18</div>' +
          '<p>先算 3 × 4，再把 12 写回原位；第一步没算到的 6 和加号要保留。</p>',
        example: question('priority', 20, 'example', [6, 3, 4], ['+', '*', 1])
      },
      {
        id: 'brackets', title: '小括号优先',
        description: '先算括号里面，理解括号怎样改变顺序。',
        lessonHTML: '<div class="topic-rule">有小括号时，先算括号里，再算括号外。</div>' +
          '<div class="topic-example">（6 ＋ 3） × 4<br>＝ 9 × 4<br>＝ 36</div>' +
          '<p>括号把 6 ＋ 3 圈成一组，要先合成 9。和没有括号的 6 ＋ 3 × 4 ＝ 18 比一比，顺序改变，答案也会改变。</p>' +
          '<p>括号在右边也要先算。例如 12 −（3 ＋ 2），先算 3 ＋ 2，再算 12 − 5。</p>',
        example: question('brackets', 100, 'example', [6, 3, 4], ['+', '*', 0, 'left'])
      }
    ],
    generate: generate
  };
})(window.MT = window.MT || {});
