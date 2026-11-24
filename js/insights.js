/* ==============================================================
   学习建议与家长小结
   ----------------------------------------------------------------
   用现有进度数据给出「今天练什么」和设置里的学习概况，不另存字段。
   对外：MT.insights.courseStats / recommend / parentSummary
   ============================================================== */
(function (MT) {
  'use strict';

  function topicWrongSkills(t) {
    var map = {};
    if (!t || !t.wrong) return map;
    Object.keys(t.wrong).forEach(function (key) {
      var w = t.wrong[key];
      if (w && w.skill) map[w.skill] = true;
    });
    return map;
  }

  function courseStats(c) {
    var p = MT.progress, done = 0, mastered = 0, total = 0, wrong = 0;
    if (!c || !p) return null;
    if (c.topic === 'basic') {
      var op = MT.op && MT.op.get(c.id);
      if (!op) return null;
      var bag = op.bag(p), levels = bag.levels || {};
      Object.keys(levels).forEach(function (k) { total++; if (levels[k] && levels[k].passed) done++; });
      mastered = done;
      wrong = Object.keys(bag.wrong || {}).length;
    } else {
      var model = MT[c.id], t = p.topics && p.topics[c.id];
      if (!model || !model.skills) return null;
      var wrongBySkill = topicWrongSkills(t);
      total = model.skills.length;
      model.skills.forEach(function (s) {
        var clean = t && t.skills && t.skills[s.id] ? t.skills[s.id].clean : 0;
        if (clean > 0) done++;
        if (clean >= (s.practiceCount || 6) && !wrongBySkill[s.id]) mastered++;
      });
      wrong = t ? Object.keys(t.wrong || {}).length : 0;
    }
    return { done: done, mastered: mastered, total: total, wrong: wrong, started: done > 0 || wrong > 0 };
  }

  function parseDay(day) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(day || ''));
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  }

  function activityStats(progress) {
    var days = progress && progress.stats && Array.isArray(progress.stats.activeDays)
      ? progress.stats.activeDays.slice().sort()
      : [];
    if (!days.length) return { totalDays: 0, recent7Days: 0, streakDays: 0 };
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var recent7 = 0;
    var parsed = [];
    days.forEach(function (d) {
      var dt = parseDay(d);
      if (!dt) return;
      parsed.push(dt);
      var diff = Math.round((today - dt) / 86400000);
      if (diff >= 0 && diff < 7) recent7++;
    });
    var streak = 0;
    if (parsed.length) {
      var latest = parsed[parsed.length - 1];
      var gap = Math.round((today - latest) / 86400000);
      if (gap <= 1) {
        streak = 1;
        for (var i = parsed.length - 2; i >= 0; i--) {
          if (Math.round((parsed[i + 1] - parsed[i]) / 86400000) === 1) streak++;
          else break;
        }
      }
    }
    return { totalDays: parsed.length, recent7Days: recent7, streakDays: streak };
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
    var topWrong = null, totalWrong = 0, incomplete = null, fresh = null, any = null;
    (stats || []).forEach(function (item) {
      if (!item || !item.c || !item.st) return;
      var c = item.c, st = item.st;
      if (!any) any = item;
      if (st.wrong > 0) {
        totalWrong += st.wrong;
        if (!topWrong || st.wrong > topWrong.st.wrong) topWrong = item;
      }
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
        totalWrong: totalWrong,
        courseWrong: topWrong.st.wrong,
        title: '今天先复习错题',
        detail: totalWrong > topWrong.st.wrong
          ? '共有 ' + totalWrong + ' 道错题待复习，先从「' + topWrong.c.title + '」的 ' + topWrong.st.wrong + ' 道开始，连续答对两次就会消掉。'
          : '「' + topWrong.c.title + '」有 ' + topWrong.st.wrong + ' 道错题，连续答对两次就会消掉。',
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
    var started = 0, finished = 0, wrongTotal = 0, weakest = null, lines = [], courses = [];
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
        courses.push({
          id: item.c.id,
          title: item.c.title,
          topic: item.c.topic,
          done: st.done,
          mastered: st.mastered || 0,
          total: st.total,
          wrong: st.wrong || 0,
          unit: unit
        });
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
      courses: courses,
      activity: activityStats(MT.progress),
      tip: tip
    };
  }

  MT.insights = {
    courseStats: courseStats,
    activityStats: activityStats,
    recommend: recommend,
    parentSummary: parentSummary
  };
})(window.MT = window.MT || {});
