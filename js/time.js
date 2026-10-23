(function (MT) {
  'use strict';

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function clock(hour, minute) {
    var label = '钟面：短时针' + (minute ? '过了 ' + hour + '，还没到下一时' : '正好指向 ' + hour) + '，长分针' + (minute ? '从 12 顺时针走了 ' + minute + ' 个小格' : '正好指向 12');
    var svg = '<figure class="length-diagram"><svg class="time-clock" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360" role="img" aria-label="' + esc(label) + '" style="display:block;width:100%;height:auto"><circle cx="180" cy="180" r="165" fill="#fffaf0" stroke="#7060d4" stroke-width="4"/>';
    for (var i = 0; i < 60; i++) {
      var a = i * Math.PI / 30, major = i % 5 === 0;
      svg += '<path d="M ' + (180 + Math.sin(a) * (major ? 140 : 150)) + ' ' + (180 - Math.cos(a) * (major ? 140 : 150)) + ' L ' + (180 + Math.sin(a) * 158) + ' ' + (180 - Math.cos(a) * 158) + '" stroke="#655b7e" stroke-width="' + (major ? 3 : 1) + '"/>';
    }
    for (var n = 1; n <= 12; n++) {
      var t = n * Math.PI / 6;
      svg += '<text x="' + (180 + Math.sin(t) * 122) + '" y="' + (189 - Math.cos(t) * 122) + '" text-anchor="middle" font-size="26" fill="#40336c">' + n + '</text>';
    }
    var h = (hour % 12 + minute / 60) * Math.PI / 6, m = minute * Math.PI / 30;
    svg += '<path d="M 180 180 L ' + (180 + Math.sin(h) * 78) + ' ' + (180 - Math.cos(h) * 78) + '" stroke="#40336c" stroke-width="9" stroke-linecap="round"/><path d="M 180 180 L ' + (180 + Math.sin(m) * 112) + ' ' + (180 - Math.cos(m) * 112) + '" stroke="#ba612a" stroke-width="5" stroke-linecap="round"/><circle cx="180" cy="180" r="8" fill="#40336c"/></svg><figcaption class="topic-note">短而粗的是时针，长而细的是分针。</figcaption></figure>';
    return svg;
  }
  function label(hour, minute) { return hour + ':' + (minute < 10 ? '0' : '') + minute; }
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
  var skills = [
    { id: 'clock', title: '认识钟面和读时刻', description: '认清时针、分针，按大格读分。', lessonHTML: '<p>钟面有 <strong>12 个数字、12 个大格、60 个小格</strong>。短而粗的是时针，长而细的是分针。</p>' + clock(8, 25) + '<p>分针走 1 小格是 1 分，走 1 大格是 5 分。分针指向 5，就是 5 个 5 分：25 分。时针过了 8，还没到 9，是 8 时。</p><p class="topic-rule">先看时针确定几时，再看分针确定几分：8 时 25 分，写作 8:25。</p>' },
    { id: 'minute', title: '精确读到几分', description: '先数大格，再接着数小格。', lessonHTML: '<p>分针没有正好指着数字时，先找到它刚经过的数字，每个大格算 5 分，再加后面的小格数。</p>' + clock(8, 7) + '<p class="topic-rule">经过数字 1 是 5 分，再走 2 小格是 7 分。所以是 8 时 7 分，写作 8:07。</p><p>冒号后要写两位数：7 分写作 07。快到 9 时，只要时针还没到 9，就仍然是 8 时。</p>' },
    { id: 'convert', title: '时和分的换算', description: '理解 1 时＝60 分。', lessonHTML: '<p>分针走一圈是 60 分，同时，时针走 1 大格，经过 1 时。</p><div class="topic-example"><p>1 时＝60 分；2 时＝120 分；1 时 20 分＝60＋20＝80 分。</p></div><p class="topic-rule">时和分之间按 60 换算。钟面数字每相邻一格是 5 分，不是 10 分。</p>' },
    { id: 'elapsed', title: '经过了多长时间', description: '从开始时刻数到结束时刻。', lessonHTML: '<p><strong>时刻</strong>表示什么时候，<strong>经过时间</strong>表示一共用了多久。</p><div class="topic-example"><p>8:00 开始，8:40 结束：经过 40 分。</p><p>8:45 开始，9:10 结束：先从 8:45 数到 9:00，是 15 分；再到 9:10，是 10 分，合起来 25 分。</p></div><p class="topic-rule">跨整时时，可以先数到整时，再把两段分钟相加。这里练习同一天、结束晚于开始的时间。</p><p class="topic-note">题目也会用下午的时刻：13:00 是下午 1 时，14:00 是下午 2 时，15:00 是下午 3 时，16:00 是下午 4 时。计算经过时间的方法相同。</p>' }
  ];
  skills.forEach(function (skill) { skill.lessonHTML = '<div class="topic-lesson">' + skill.lessonHTML + '</div>'; });
  function generate(skill, range, seed) {
    seed = isFinite(Number(seed)) ? Math.floor(Number(seed)) >>> 0 : 0;
    var q = { id: 'time:' + skill + ':' + seed, skill: skill, data: { type: skill } };
    if (skill === 'clock' || skill === 'minute') {
      var hour = seed % 12 + 1, minute = skill === 'clock' ? Math.floor(seed / 12) % 12 * 5 : Math.floor(seed / 12) % 60;
      var correct = label(hour, minute), wrongMinute = label(hour, (minute + 5) % 60), wrongHour = label(hour === 12 ? 1 : hour + 1, minute);
      q.prompt = '看钟面，现在是几时几分？'; q.visualHTML = clock(hour, minute); q.hint = '先看短时针过了几，再看长分针走了多少小格。';
      q.explanation = '短时针' + (minute ? '过了 ' + hour + '，还没有到下一时' : '正好指向 ' + hour) + '，长分针从 12 顺时针走了 ' + minute + ' 个小格，所以是 ' + hour + ' 时 ' + minute + ' 分，写作 ' + correct + '。';
      q.data.hour = hour; q.data.minute = minute; choice(q, [correct, wrongMinute, wrongHour], correct, seed);
    } else if (skill === 'convert') {
      var hours = seed % 3 + 1, extra = Math.floor(seed / 3) % 6 * 10, direction = Math.floor(seed / 18) % 3;
      q.kind = 'number'; q.data.hours = hours; q.data.extra = direction === 2 ? extra : 0; q.data.minutes = hours * 60 + q.data.extra; q.data.direction = direction;
      q.prompt = direction === 0 ? hours + ' 时＝多少分？' : direction === 1 ? hours * 60 + ' 分＝多少时？' : hours + ' 时 ' + extra + ' 分＝多少分？';
      q.answer = direction === 1 ? hours : q.data.minutes; q.unit = direction === 1 ? '时' : '分'; q.hint = '每 1 时是 60 分，先数几个 60，再加剩下的分。'; q.explanation = hours + ' 时＝' + hours * 60 + ' 分。' + (direction === 2 ? '再加 ' + extra + ' 分，共 ' + q.data.minutes + ' 分。' : '每 60 分是 1 时。');
    } else if (skill === 'elapsed') {
      var start = (7 + seed % 9) * 60 + Math.floor(seed / 9) % 12 * 5, duration = (Math.floor(seed / 108) % 12 + 1) * 5, end = start + duration;
      q.kind = 'number'; q.prompt = '同一天，小明从 ' + label(Math.floor(start / 60), start % 60) + ' 开始阅读，到 ' + label(Math.floor(end / 60), end % 60) + ' 结束，一共经过多少分？';
      q.answer = duration; q.unit = '分'; q.hint = '先数到整时，再数到结束时刻，把两段相加。';
      q.explanation = Math.floor(start / 60) === Math.floor(end / 60) ? '同一小时内，' + end % 60 + '－' + start % 60 + '＝' + duration + '，经过 ' + duration + ' 分。' : '先到下一整时，经过 ' + (60 - start % 60) + ' 分；再经过 ' + end % 60 + ' 分，合计 ' + duration + ' 分。';
      q.data.start = start; q.data.end = end; q.data.duration = duration;
    } else throw new RangeError('Unknown time skill: ' + skill);
    q.speech = q.prompt; q.printPrompt = q.prompt; return q;
  }
  MT.time = { id: 'time', title: '认识时间', subtitle: '认钟面、读时刻、算经过时间', skills: skills, generate: generate };
})(window.MT = window.MT || {});
