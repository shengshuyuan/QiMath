(function (MT) {
  'use strict';

  // 课程目录与地址共用一份定义，新增课程不再增加一排全局按钮。
  var courses = [
    { id: 'add', topic: 'basic', title: '加法', domain: '数与运算', mark: '＋', description: '20 以内，看图理解合起来有多少' },
    { id: 'sub', topic: 'basic', title: '减法', domain: '数与运算', mark: '−', description: '20 以内，看图理解去掉与相差' },
    { id: 'mul', topic: 'basic', title: '乘法', domain: '数与运算', mark: '×', description: '用分组与阵列理解九九乘法' },
    { id: 'div', topic: 'basic', title: '除法', domain: '数与运算', mark: '÷', description: '平均分与包含，练习表内除法' },
    { id: 'mixed', topic: 'mixed', title: '混合运算', domain: '数与运算', mark: '( )', description: '从左往右、先乘除后加减与小括号' },
    { id: 'length', topic: 'length', title: '米和厘米', domain: '量与测量', mark: 'm / cm', description: '认识长度单位、读尺、比较与换算' }
  ];

  function course(id) { return courses.filter(function (c) { return c.id === id; })[0] || null; }
  function model(id) { return id === 'mixed' ? MT.mixed : id === 'length' ? MT.length : null; }

  function normalize(route) {
    var c = course(route && route.course);
    if (!c) return { page: 'catalog' };
    var mode = ['learn', 'practice', 'wrong'].indexOf(route.mode) !== -1 ? route.mode : 'learn';
    var result = { page: 'course', course: c.id, mode: mode };
    if (c.topic === 'basic') {
      var views = mode === 'learn' ? ['explore', 'table'] : mode === 'practice' ? ['quiz', 'games'] : ['quiz'];
      result.view = views.indexOf(route.view) !== -1 ? route.view : views[0];
    } else {
      var m = model(c.id);
      var skills = m.skills.map(function (s) { return s.id; });
      var saved = MT.progress && MT.progress.topics[c.id];
      var last = saved && saved.lastSkill;
      result.skill = skills.indexOf(route.skill) !== -1 ? route.skill : skills.indexOf(last) !== -1 ? last : skills[0];
    }
    return result;
  }

  function parse(hash) {
    var parts = String(hash || '').replace(/^#\/?/, '').split('/');
    if (parts[0] !== 'course') return { page: 'catalog' };
    var c = course(parts[1]);
    if (!c) return { page: 'catalog' };
    return normalize({ course: c.id, mode: parts[3], view: c.topic === 'basic' ? parts[2] : '', skill: c.topic === 'basic' ? '' : parts[2] });
  }

  function hash(route) {
    var r = normalize(route);
    if (r.page === 'catalog') return '#/catalog';
    return '#/course/' + r.course + '/' + (r.skill || r.view) + '/' + r.mode;
  }

  MT.navigation = { courses: courses, course: course, normalize: normalize, parse: parse, hash: hash };
})(window.MT = window.MT || {});
