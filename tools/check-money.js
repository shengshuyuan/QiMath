#!/usr/bin/env node
'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var g = {};
g.window = g;
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'money.js'), 'utf8'), g, { filename: 'money.js' });
var money = g.MT.money;

assert.strictEqual(money.id, 'money');
assert.deepStrictEqual(Array.from(money.skills, function (s) { return s.id; }), ['recognize', 'readwrite', 'convert', 'compare', 'calc', 'shopping']);

money.skills.forEach(function (skill) {
  assert.ok(skill.title && skill.description && skill.lessonHTML, skill.id + ' 课程内容完整');
});

// 验证面值常量与基础工具
assert.strictEqual(money.denominations.length, 14, '包含14种法定面额');
assert.strictEqual(money.centsToParts(158).yuan, 1);
assert.strictEqual(money.centsToParts(158).jiao, 5);
assert.strictEqual(money.centsToParts(158).fen, 8);
assert.strictEqual(money.partsToCents(5, 3, 0), 530);
assert.strictEqual(money.formatCN(530), '5元3角');
assert.strictEqual(money.formatCN(205, true), '2元零5分');
assert.strictEqual(money.formatPrice(530), '5.30元');
assert.strictEqual(money.formatPrice(205), '2.05元');

assert.throws(function () { money.generate('unknown', 20, 0); }, /Unknown money skill/);

function amountInCents(text) {
  if (!/^\d/.test(text)) return null;
  var total = 0;
  for (var part of text.matchAll(/(\d+(?:\.\d+)?)\s*([元角分])/g)) {
    total += Math.round(Number(part[1]) * ({ 元: 100, 角: 10, 分: 1 })[part[2]]);
  }
  return total;
}

// 历史误判：5元13角与6元3角等值，不能作为错误选项。
var carryExample = money.generate('calc', 20, 2);
assert.ok(carryExample.prompt.includes('5元8角'));
assert.equal(carryExample.choices.filter(function (c) { return amountInCents(c) === 630; }).length, 1);

// 分别遍历两个范围，避免把范围与种子奇偶绑定而漏掉子分支。
[20, 100].forEach(function (range) {
  var coverage = new Set();
  money.skills.forEach(function (skill) {
    for (var seed = 0; seed < 2000; seed++) {
      var q = money.generate(skill.id, range, seed);
      if (q.kind === 'choice' && q.choices.every(function (c) { return /^\d/.test(c); })) {
        var amounts = q.choices.map(amountInCents);
        assert.equal(new Set(amounts).size, amounts.length, '选项金额必须不同: ' + q.id + ' ' + q.choices.join(', '));
      }
      var d = q.data;
      if (d.type === 'readwrite_price_to_cn') coverage.add('price-fen-' + (d.cents % 10 !== 0));
      if (d.type === 'readwrite_cn_to_price' && d.cents % 100 >= 10 && d.cents % 10) coverage.add('cn-yuan-jiao-fen');
      if (d.type === 'compare_money') {
        if (/^\d+角$/.test(d.left) && /^\d+角$/.test(d.right)) coverage.add('compare-jiao');
        if (d.right.includes('分')) coverage.add('compare-fen');
        if (d.left.includes('元') && d.left.includes('角')) coverage.add('compare-compound');
      }
      if (d.type === 'calc_same_unit') coverage.add('same-' + d.unit + d.op);
      if (d.type === 'recognize_target' && /^1[元角]/.test(d.target)) coverage.add('target-' + d.target.charAt(1));
    }
  });
  ['price-fen-true', 'price-fen-false', 'cn-yuan-jiao-fen', 'compare-jiao', 'compare-fen', 'compare-compound',
    'same-元+', 'same-元-', 'same-角+', 'same-角-', 'target-元', 'target-角'].forEach(function (branch) {
    assert.ok(coverage.has(branch), range + '范围应覆盖 ' + branch);
  });
});

// 不进退位加减应同时覆盖加法与减法，且加法角之和始终 < 10
var noCarryPlus = 0;
var noCarryMinus = 0;
var i;
for (i = 0; i < 4000; i++) {
  var cq = money.generate('calc', 100, i);
  if (!cq.data || cq.data.type !== 'calc_no_carry') continue;
  var nums = cq.data.expr.match(/\d+/g).map(Number);
  assert.equal(nums.length, 4, '不进退位题应含四个数字');
  if (cq.data.op === '+') {
    noCarryPlus++;
    assert.ok(nums[1] + nums[3] < 10, '不进位加法角之和应小于 10: ' + cq.data.expr);
  } else {
    noCarryMinus++;
    assert.ok(nums[1] >= nums[3], '不退位减法角应够减: ' + cq.data.expr);
  }
}
assert.ok(noCarryPlus > 0, '不进退位题应包含加法');
assert.ok(noCarryMinus > 0, '不进退位题应包含减法');

// 含“分”的数钱题，讲解里必须说出分部分（不能因拆分托盘时改写原金额而漏掉）
var fenExplained = 0;
for (i = 0; i < 2000; i++) {
  var rq = money.generate('readwrite', 100, i);
  if (!rq.data || rq.data.type !== 'readwrite_count') continue;
  var fen = rq.data.cents % 10;
  if (!fen) continue;
  assert.ok(rq.explanation.indexOf('分部分有 ' + fen + '分') !== -1, '应说明分部分: ' + rq.explanation);
  fenExplained++;
}
assert.ok(fenExplained > 0, '进阶范围应出现含分的数钱题');

var seen = {
  recognizeCard: 0,
  recognizeTarget: 0,
  recognizeSame: 0,
  recognizeFaq: 0,
  readwriteCount: 0,
  readwritePriceToCn: 0,
  readwriteCnToPrice: 0,
  convertYuanJiao: 0,
  convertJiaoFen: 0,
  convertYuanFen: 0,
  convertCompound: 0,
  convertJiaoCompound: 0,
  compareEqual: 0,
  compareLeft: 0,
  compareRight: 0,
  calcSameUnit: 0,
  calcNoCarry: 0,
  calcCarryAdd: 0,
  calcBorrowSub: 0,
  shoppingChange: 0,
  shoppingEnough: 0,
  shoppingTotal: 0,
  seen100Boundary: false,
  seenZeroFen: false,
  seenZeroJiao: false
};

money.skills.forEach(function (skill) {
  for (var seed = 0; seed < 2000; seed++) {
    var range = (seed % 2 === 0) ? 20 : 100;
    var q = money.generate(skill.id, range, seed);

    // 验证种子可重复还原
    var qRepeat = money.generate(skill.id, range, seed);
    assert.strictEqual(JSON.stringify(q), JSON.stringify(qRepeat), skill.id + ' seed 必须严格可还原');

    assert.strictEqual(q.id, 'money:' + skill.id + ':' + seed);
    assert.strictEqual(q.skill, skill.id);
    assert.ok(q.prompt && q.hint && q.explanation && q.speech && q.printPrompt, '说明字段完整');
    assert.ok(q.kind === 'number' || q.kind === 'choice', '题目类型合法');

    if (q.kind === 'choice') {
      assert.ok(Array.isArray(q.choices) && q.choices.length >= 2, '选项至少2项');
      assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length, '答案在选项索引内');
      assert.strictEqual(new Set(q.choices).size, q.choices.length, '选项不能有重复项: ' + q.choices.join(', '));
      assert.ok(q.choices[q.answer], '答案对应选项有值');
    } else {
      assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 999, '数值答案为非负整数且不超过3位数: ' + q.answer);
      assert.ok(q.unit === '元' || q.unit === '角' || q.unit === '分', '单位必须是元/角/分: ' + q.unit);
    }

    // 统计各分支覆盖情况
    var t = q.data && q.data.type;
    if (t === 'recognize_card') seen.recognizeCard++;
    if (t === 'recognize_target') seen.recognizeTarget++;
    if (t === 'recognize_same_value') seen.recognizeSame++;
    if (t === 'recognize_faq') seen.recognizeFaq++;
    if (t === 'readwrite_count') seen.readwriteCount++;
    if (t === 'readwrite_price_to_cn') seen.readwritePriceToCn++;
    if (t === 'readwrite_cn_to_price') seen.readwriteCnToPrice++;
    if (t === 'convert_yuan_jiao') seen.convertYuanJiao++;
    if (t === 'convert_jiao_fen') seen.convertJiaoFen++;
    if (t === 'convert_yuan_fen') seen.convertYuanFen++;
    if (t === 'convert_compound_to_jiao') seen.convertCompound++;
    if (t === 'convert_jiao_to_compound') seen.convertJiaoCompound++;
    if (t === 'compare_money') {
      if (q.data.answer === '一样多') seen.compareEqual++;
      else if (q.data.answer === '左边多') seen.compareLeft++;
      else seen.compareRight++;
    }
    if (t === 'calc_same_unit') seen.calcSameUnit++;
    if (t === 'calc_no_carry') seen.calcNoCarry++;
    if (t === 'calc_carry_add') seen.calcCarryAdd++;
    if (t === 'calc_borrow_sub') seen.calcBorrowSub++;
    if (t === 'shopping_change') seen.shoppingChange++;
    if (t === 'shopping_enough') seen.shoppingEnough++;
    if (t === 'shopping_total') seen.shoppingTotal++;

    if (q.prompt.indexOf('100元') !== -1 || (q.data && (q.data.cents === 10000 || q.data.yuan === 100))) {
      seen.seen100Boundary = true;
    }
    if (q.prompt.indexOf('0分') !== -1 || q.prompt.indexOf('零5分') !== -1 || (q.data && typeof q.data.price === 'string' && q.data.price.indexOf('.0') !== -1)) {
      seen.seenZeroFen = true;
    }
    if (q.prompt.indexOf('0角') !== -1 || (q.data && typeof q.data.price === 'string' && q.data.price.indexOf('.05') !== -1)) {
      seen.seenZeroJiao = true;
    }
  }
});

// 验证覆盖率指标
assert.ok(seen.recognizeCard > 300, '看图选面值覆盖充分');
assert.ok(seen.recognizeTarget > 300, '目标面值匹配覆盖充分');
assert.ok(seen.recognizeSame > 300, '纸币硬币等值覆盖充分');
assert.ok(seen.readwriteCount > 400, '组合钱币读取覆盖充分');
assert.ok(seen.readwritePriceToCn > 400, '标价读写覆盖充分');
assert.ok(seen.convertYuanJiao > 250, '元角换算覆盖充分');
assert.ok(seen.convertJiaoFen > 250, '角分换算覆盖充分');
assert.ok(seen.convertYuanFen > 250, '元分换算覆盖充分');
assert.ok(seen.convertCompound > 250, '复合换单单位覆盖充分');
assert.ok(seen.convertJiaoCompound > 250, '单单位换复合覆盖充分');
assert.ok(seen.compareEqual > 200, '比较相等覆盖充分');
assert.ok(seen.compareLeft > 200, '比较左多覆盖充分');
assert.ok(seen.compareRight > 200, '比较右多覆盖充分');
assert.ok(seen.calcCarryAdd > 300, '进位加法覆盖充分');
assert.ok(seen.calcBorrowSub > 300, '退位减法覆盖充分');
assert.ok(seen.shoppingChange > 400, '购物找零覆盖充分');
assert.ok(seen.shoppingEnough > 400, '钱够不够覆盖充分');
assert.ok(seen.shoppingTotal > 400, '两件总价覆盖充分');
assert.ok(seen.seen100Boundary, '100元边界已覆盖');
assert.ok(seen.seenZeroFen, '零分情况已覆盖');
assert.ok(seen.seenZeroJiao, '零角情况已覆盖');

console.log('check-money: ok (6 skills, 12000 seeded questions verified)');
