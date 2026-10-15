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
