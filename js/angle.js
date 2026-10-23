(function (MT) {
  'use strict';

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function diagram(degrees, label, size) {
    var length = size || 140, r = degrees * Math.PI / 180;
    var x = 185 + length * Math.cos(r), y = 185 - length * Math.sin(r);
    return '<figure class="length-diagram"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" role="img" aria-label="' + esc(label) + '" style="display:block;width:100%;height:auto"><path d="M 325 185 L 185 185 L ' + x + ' ' + y + '" fill="none" stroke="#7060d4" stroke-width="7" stroke-linecap="round"/><path d="M 225 185 A 40 40 0 0 0 ' + (185 + 40 * Math.cos(r)) + ' ' + (185 - 40 * Math.sin(r)) + '" fill="none" stroke="#d18b2f" stroke-width="3"/>' + (degrees === 90 ? '<path d="M 205 185 V 165 H 185" fill="none" stroke="#d18b2f" stroke-width="3"/>' : '') + '<circle cx="185" cy="185" r="6" fill="#40336c"/><text x="185" y="220" text-anchor="middle" font-size="22" fill="#40336c">顶点</text></svg></figure>';
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
    q.answer = q.choices.indexOf(correct); q.data.correctChoice = correct; return q;
  }
  var skills = [
    { id: 'parts', practiceCount: 2, title: '认识角', description: '找顶点和两条直直的边。', lessonHTML: '<p>从一个点引出两条直直的边，就组成一个角。角有 <strong>1 个顶点、2 条边</strong>。</p>' + diagram(60, '角的两条直边相交在一个顶点') + '<p class="topic-rule">沿着两条边找到相交的点，这就是顶点。弯曲的线不能当作角的边。</p><p>打开的剪刀、三角尺和书本的角，都能帮助我们找角。</p>' },
    { id: 'classify', title: '直角、锐角和钝角', description: '把角与三角尺的直角比一比。', lessonHTML: '<p>用三角尺上的直角来比：顶点重合，一条边重合，再看另一条边。</p>' + diagram(90, '带有小方框标记的直角') + '<p class="topic-rule">比直角小的是锐角；与直角一样大的是直角；比直角大、比平角小的是钝角。</p><p>书本的方角和墙角常能看到直角。图中小方框是直角标记。</p>' },
    { id: 'compare', title: '比较角的大小', description: '看两条边张开的程度。', lessonHTML: '<p>两条边张开得越大，角就越大。边画得长一些、短一些，角的大小都不会变。</p>' + diagram(45, '开口较小的角') + diagram(120, '开口较大的角') + '<p class="topic-rule">比开口，不比边长。把顶点和一条边重合，更容易比较。</p>' },
    { id: 'judge', practiceCount: 3, title: '角的易错辨析', description: '边长和摆放方向会改变角吗？', lessonHTML: '<p>把一个角转一转，或把它的边画长一些，只要两条边张开的程度没变，这个角就没有变大或变小。</p><div class="topic-example"><p>用两根小棒摆一个角：固定开口，移动或转动整个角，再观察它的大小。</p></div><p class="topic-rule">角的大小与边的长短、摆放方向无关。</p>' }
  ];
  skills.forEach(function (skill) { skill.lessonHTML = '<div class="topic-lesson">' + skill.lessonHTML + '</div>'; });
  function generate(skill, range, seed) {
    seed = isFinite(Number(seed)) ? Math.floor(Number(seed)) >>> 0 : 0;
    var q = { id: 'angle:' + skill + ':' + seed, skill: skill, data: { type: skill } };
    if (skill === 'parts') {
      var vertex = seed % 2 === 0;
      q.prompt = vertex ? '一个角有几个顶点？' : '一个角有几条边？'; q.kind = 'number'; q.answer = vertex ? 1 : 2; q.unit = vertex ? '个' : '条';
      q.visualHTML = diagram(60, '一个角，由一个顶点和两条直边组成');
      q.hint = vertex ? '找一找两条直边相交的点。' : '数一数从顶点引出的直直的边。'; q.explanation = '一个角有 1 个顶点、2 条直直的边。'; q.data.part = vertex ? 'vertex' : 'sides';
    } else if (skill === 'classify') {
      var degrees = [30, 45, 60, 90, 110, 120, 135][seed % 7];
      var type = degrees < 90 ? '锐角' : degrees === 90 ? '直角' : '钝角';
      q.prompt = '看图，这是什么角？'; q.visualHTML = diagram(degrees, '两条直边组成的角，' + (degrees === 90 ? '有直角小方框标记' : degrees < 90 ? '开口小于直角' : '开口大于直角、小于平角'));
      q.hint = '和三角尺上的直角比一比。'; q.explanation = type + (degrees < 90 ? '比直角小。' : degrees === 90 ? '与三角尺的直角一样大。' : '比直角大、比平角小。'); q.data.degrees = degrees;
      choice(q, ['锐角', '直角', '钝角'], type, seed);
    } else if (skill === 'compare') {
      var left = [45, 90, 120][seed % 3], right = [45, 90, 120][Math.floor(seed / 3) % 3];
      var leftLabel = left === right ? '上面的角，开口与下面相同，边画得较短' : left > right ? '上面的角，开口较大' : '上面的角，开口较小';
      var rightLabel = left === right ? '下面的角，开口与上面相同，边画得较长' : right > left ? '下面的角，开口较大' : '下面的角，开口较小';
      q.prompt = '比较下面两个角，上面的角和下面的角哪个更大？'; q.visualHTML = diagram(left, leftLabel, 95) + diagram(right, rightLabel, 150);
      q.hint = '看两条边张开的程度，不能用边的长短判断。'; q.explanation = left === right ? '两个角张开程度相同，虽然边长不同，角一样大。' : '张开程度越大，角越大。' + (left > right ? '上面的角更大。' : '下面的角更大。');
      q.data.left = left; q.data.right = right;
      choice(q, ['上面的角更大', '下面的角更大', '一样大'], left === right ? '一样大' : left > right ? '上面的角更大' : '下面的角更大', seed);
    } else if (skill === 'judge') {
      var items = [ ['把角的两条边画长一些，开口不变，角会变大吗？', '不会变大', '边画长了，但张开的程度没有变，角的大小不变。'], ['把一个角整体转一转，角的大小会改变吗？', '不会改变', '只改变摆放方向，张开的程度没有变，角的大小不变。'], ['把角的两条边张开得更大，角会怎样？', '变大', '两条边张开得更大，角就变大。'] ];
      var item = items[seed % items.length]; q.prompt = item[0]; q.hint = '角的大小由张开的程度决定。'; q.explanation = item[2]; q.data.item = seed % items.length;
      choice(q, seed % 3 === 0 ? ['会变大', '不会变大'] : seed % 3 === 1 ? ['会改变', '不会改变'] : ['变大', '变小', '不变'], item[1], seed);
    } else throw new RangeError('Unknown angle skill: ' + skill);
    q.speech = q.prompt; q.printPrompt = q.prompt; return q;
  }
  MT.angle = { id: 'angle', title: '角的初步认识', subtitle: '找顶点、比开口、认识三种角', skills: skills, generate: generate };
})(window.MT = window.MT || {});
