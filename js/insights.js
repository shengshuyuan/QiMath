/* ==============================================================
   学习建议与家长小结
   ----------------------------------------------------------------
   用现有进度数据给出「今天练什么」和设置里的学习概况，不另存字段。
   对外：MT.insights.courseStats / recommend / parentSummary
   ============================================================== */
(function (MT) {
  'use strict';

  function courseStats(c) {
    var p = MT.progress, done = 0, total = 0, wrong = 0;
    if (!c || !p) return null;
    if (c.topic === 'basic') {
      var op = MT.op && MT.op.get(c.id);
      if (!op) return null;
      var bag = op.bag(p), levels = bag.levels || {};
      Object.keys(levels).forEach(function (k) { total++; if (levels[k] && levels[k].passed) done++; });
      wrong = Object.keys(bag.wrong || {}).length;
    } else {
      var model = MT[c.id], t = p.topics && p.topics[c.id];
      if (!model || !model.skills) return null;
      total = model.skills.length;
      model.skills.forEach(function (s) { if (t && t.skills[s.id] && t.skills[s.id].clean > 0) done++; });
      wrong = t ? Object.keys(t.wrong || {}).length : 0;
    }
    return { done: done, total: total, wrong: wrong, started: done > 0 || wrong > 0 };
  }

  function nextTopicSkill(c) {
    var model = MT[c.id], t = MT.progress && MT.progress.topics && MT.progress.topics[c.id];
    if (!model || !model.skills) return null;
    for (var i = 0; i < model.skills.length; i++) {
      var s = model.skills[i];
      if (!t || !t.skills[s.id] || !(t.skills[s.id].clean > 0)) return s;
    }
    return null;
  }

  // 优先级：错题最多 → 已开始未完成 → 还没打开过的课 → 全部完成就随意练一练。
  function recommend(stats) {
    var topWrong = null, incomplete = null, fresh = null, any = null;
    (stats || []).forEach(function (item) {
      if (!item || !item.c || !item.st) return;
      var c = item.c, st = item.st;
      if (!any) any = item;
      if (st.wrong > 0 && (!topWrong || st.wrong > topWrong.st.wrong)) topWrong = item;
      if (st.started && st.done < st.total) {
        var left = st.total - st.done;
        if (!incomplete || left > (incomplete.st.total - incomplete.st.done)) incomplete = item;
      }
      if (!st.started && !fresh) fresh = item;
    });

    if (topWrong) {
      return {
        course: topWrong.c.id,
        mode: 'wrong',
        title: '今天先复习错题',
        detail: '「' + topWrong.c.title + '」有 ' + topWrong.st.wrong + ' 道错题，连续答对两次就会消掉。',
        cta: '去复习 · ' + topWrong.c.title
      };
    }

    if (incomplete) {
      var c = incomplete.c;
      if (c.topic === 'basic') {
        return {
          course: c.id,
          mode: 'practice',
          view: 'quiz',
          title: '接着闯关',
          detail: '「' + c.title + '」已完成 ' + incomplete.st.done + ' / ' + incomplete.st.total + ' 关，继续往下闯。',
          cta: '继续闯关 · ' + c.title
        };
      }
      var skill = nextTopicSkill(c);
      return {
        course: c.id,
        mode: 'practice',
        skill: skill ? skill.id : undefined,
        title: '接着练一练',
        detail: skill
          ? '「' + c.title + '」下一个知识点：' + skill.title + '。'
          : '「' + c.title + '」还有未完成的知识点。',
        cta: '去练习 · ' + c.title + (skill ? ' · ' + skill.title : '')
      };
    }

    if (fresh) {
      return {
        course: fresh.c.id,
        mode: 'learn',
        title: '今天学点新的',
        detail: '还没打开过「' + fresh.c.title + '」，先看图理解，再动手试。',
        cta: '开始学习 · ' + fresh.c.title
      };
    }

    if (any) {
      return {
        course: any.c.id,
        mode: 'practice',
        view: any.c.topic === 'basic' ? 'games' : undefined,
        game: any.c.topic !== 'basic' ? 'impostor' : undefined,
        skill: any.c.topic !== 'basic' && MT[any.c.id] ? MT[any.c.id].skills[0].id : undefined,
        title: '全部学完啦',
        detail: '进度很棒。随便玩一玩找错游戏，保持手感。',
        cta: '轻松练一练 · ' + any.c.title
      };
    }
    return null;
  }

  function parentSummary(stats) {
    var started = 0, finished = 0, wrongTotal = 0, weakest = null, lines = [];
    (stats || []).forEach(function (item) {
      if (!item || !item.c || !item.st) return;
      var st = item.st;
      if (st.started) started++;
      if (st.total && st.done >= st.total) finished++;
      wrongTotal += st.wrong || 0;
      if (st.wrong > 0 && (!weakest || st.wrong > weakest.st.wrong)) weakest = item;
      if (st.started) {
        var unit = item.c.topic === 'basic' ? '关' : '个知识点';
        lines.push(item.c.title + '：' + st.done + '/' + st.total + ' ' + unit + (st.wrong ? '，错题 ' + st.wrong : ''));
      }
    });
    var tip = !started
      ? '还没有学习记录。打开一门课，先「学一学」再「练一练」。'
      : wrongTotal
        ? '建议先复习「' + weakest.c.title + '」的 ' + weakest.st.wrong + ' 道错题，再打印一张练习纸巩固。'
        : finished === started
          ? '已开始的课程都完成了。可以打印练习纸，或换一门新课继续探索。'
          : '继续未完成的课程即可。练习卡可在课程页右上角打印。';
    return {
      started: started,
      finished: finished,
      wrongTotal: wrongTotal,
      weakest: weakest ? weakest.c.title : '',
      lines: lines,
      tip: tip
    };
  }

  MT.insights = {
    courseStats: courseStats,
    recommend: recommend,
    parentSummary: parentSummary
  };
})(window.MT = window.MT || {});
