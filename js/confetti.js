(function (MT) {
  'use strict';

  var canvas = null;
  var ctx = null;
  var particles = [];
  var animId = null;

  var COLORS = ['#8B5CF6', '#F472B6', '#2FBFA0', '#F2B544', '#60A5FA', '#EC4899'];

  function initCanvas() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '999';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
  }

  function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth * (window.devicePixelRatio || 1);
    canvas.height = window.innerHeight * (window.devicePixelRatio || 1);
  }

  function spawn(x, y, count) {
    initCanvas();
    resize();
    var dpr = window.devicePixelRatio || 1;
    var originX = (x != null ? x : window.innerWidth / 2) * dpr;
    var originY = (y != null ? y : window.innerHeight * 0.4) * dpr;

    for (var i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = (Math.random() * 8 + 4) * dpr;
      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: (Math.sin(angle) * speed) - (4 * dpr),
        size: (Math.random() * 8 + 6) * dpr,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        life: 1,
        decay: Math.random() * 0.015 + 0.012
      });
    }

    if (!animId) loop();
  }

  function loop() {
    if (!particles.length) {
      if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
      animId = null;
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var gravity = 0.28 * (window.devicePixelRatio || 1);

    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += gravity;
      p.rotation += p.rotSpeed;
      p.life -= p.decay;

      if (p.life <= 0 || p.y > canvas.height + 50) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
      ctx.restore();
    }

    var raf = window.requestAnimationFrame || (typeof setTimeout !== 'undefined' ? setTimeout : null);
    if (raf) animId = raf(loop, 16);
  }

  MT.confetti = {
    burst: function (x, y) {
      // 检查减弱动画设置
      var st = MT.progress && MT.progress.settings;
      if (st && st.reduceMotion === 'on') return;
      spawn(x, y, 65);
    }
  };
})(window.MT = window.MT || {});
