#!/usr/bin/env node
'use strict';
/*
  页面渲染检查：用本机 Chrome（无头模式）打开每个课程页面，确认
    1. 没有 JS 报错（Runtime 异常、console.error）
    2. 桌面与手机宽度下都没有横向溢出
    3. 可见按钮高度不小于 44px（小学生点得准）
  依赖：macOS/Linux 上已安装 Chrome；找不到时打印 skipped 并以 0 退出，不阻塞其他检查。
  用法：node tools/check-pages.js [--shots 目录]   加 --shots 会把每页截图存到目录里。
*/
var fs = require('node:fs');
var path = require('node:path');
var http = require('node:http');
var { spawn, execSync } = require('node:child_process');

var ROOT = path.join(__dirname, '..');
var shotDir = process.argv.indexOf('--shots') !== -1 ? process.argv[process.argv.indexOf('--shots') + 1] : '';
var VIEWPORTS = [{ name: 'desktop', width: 1280, height: 900 }, { name: 'mobile', width: 390, height: 844 }];
var ROUTES = ['#/catalog'];
['add', 'mul', 'div'].forEach(function (c) { ROUTES.push('#/course/' + c + '/explore/learn', '#/course/' + c + '/quiz/practice', '#/course/' + c + '/games/practice', '#/course/' + c + '/quiz/wrong'); });
ROUTES.push('#/course/sub/table/learn');
['mixed', 'length', 'angle', 'time', 'mass', 'money'].forEach(function (c) { ROUTES.push('#/course/' + c + '/_/learn', '#/course/' + c + '/_/practice', '#/course/' + c + '/_/practice/impostor', '#/course/' + c + '/_/wrong'); });
ROUTES.push('#/course/money/_/practice/combo', '#/course/money/_/practice/cashier');

function findChrome() {
  var candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'
  ].filter(Boolean);
  for (var i = 0; i < candidates.length; i++) if (fs.existsSync(candidates[i])) return candidates[i];
  try { return execSync('which google-chrome chromium chromium-browser 2>/dev/null', { encoding: 'utf8' }).split('\n')[0] || ''; } catch (e) { return ''; }
}

var TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.png': 'image/png' };
function serve() {
  return new Promise(function (resolve) {
    var server = http.createServer(function (req, res) {
      var file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (file.endsWith('/')) file += 'index.html';
      fs.readFile(file, function (err, data) {
        if (err) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', function () { resolve(server); });
  });
}

function fetchJSON(url, tries) {
  return new Promise(function (resolve, reject) {
    http.get(url, function (res) {
      var body = '';
      res.on('data', function (d) { body += d; });
      res.on('end', function () { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    }).on('error', function (err) {
      if (tries <= 0) return reject(err);
      setTimeout(function () { fetchJSON(url, tries - 1).then(resolve, reject); }, 200);
    });
  });
}

// 最小 CDP 客户端：发命令、收事件。Node 22 自带 WebSocket。
function connect(wsUrl) {
  var ws = new WebSocket(wsUrl), id = 0, pending = {}, listeners = {};
  // 每条命令 15 秒超时：页面崩溃或 Chrome 异常退出时直接报错，而不是让检查卡住。
  function send(method, params) {
    return new Promise(function (resolve, reject) {
      var n = ++id;
      var timer = setTimeout(function () { delete pending[n]; reject(new Error(method + ' 超时')); }, 15000);
      pending[n] = {
        resolve: function (v) { clearTimeout(timer); resolve(v); },
        reject: function (e) { clearTimeout(timer); reject(e); }
      };
      ws.send(JSON.stringify({ id: n, method: method, params: params || {} }));
    });
  }
  ws.onmessage = function (e) {
    var msg = JSON.parse(e.data);
    if (msg.id && pending[msg.id]) {
      var p = pending[msg.id]; delete pending[msg.id];
      msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
    } else if (msg.method && listeners[msg.method]) listeners[msg.method].forEach(function (fn) { fn(msg.params); });
  };
  return new Promise(function (resolve, reject) {
    var timer = setTimeout(function () { reject(new Error('连接 Chrome 调试端口超时')); }, 15000);
    ws.onopen = function () { clearTimeout(timer); resolve({ send: send, on: function (m, fn) { (listeners[m] = listeners[m] || []).push(fn); }, close: function () { ws.close(); } }); };
    ws.onerror = function (e) { clearTimeout(timer); reject(e); };
    ws.onclose = function () { Object.keys(pending).forEach(function (k) { pending[k].reject(new Error('Chrome 连接已断开')); pending = {}; }); };
  });
}

async function firstPage(port) {
  for (var i = 0; i < 25; i++) {
    var targets = await fetchJSON('http://127.0.0.1:' + port + '/json', 50);
    var page = targets.filter(function (t) { return t.type === 'page'; })[0];
    if (page) return page;
    await new Promise(function (res) { setTimeout(res, 200); });
  }
  throw new Error('Chrome 没有打开任何页面');
}

var INSPECT = '(' + function () {
  var out = { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, smallButtons: [], title: document.title };
  document.querySelectorAll('button, a.btn, [role="button"]').forEach(function (el) {
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    if (el.closest('.badge-dialog, .seg.div-story, .nums, .lv-row') && r.height >= 36) return; // 口诀表数字格与关卡格刻意更小
    if (r.height < 44 - 0.5) out.smallButtons.push((el.id ? '#' + el.id : el.className || el.tagName) + ' ' + Math.round(r.height) + 'px「' + (el.textContent || '').trim().slice(0, 12) + '」');
  });
  return JSON.stringify(out);
} + ')()';

async function main() {
  var chrome = findChrome();
  if (!chrome) { console.log('check-pages: skipped (Chrome not found; set CHROME_PATH to enable)'); return; }
  var server = await serve();
  var origin = 'http://127.0.0.1:' + server.address().port + '/';
  var port = 9300 + Math.floor(Math.random() * 500);
  var profile = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'qimath-chrome-'));
  var proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--user-data-dir=' + profile, '--remote-debugging-port=' + port, 'about:blank'], { stdio: 'ignore' });
  var problems = [], pages = 0;
  try {
    var page = await firstPage(port);
    var cdp = await connect(page.webSocketDebuggerUrl);
    var errors = [];
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');
    cdp.on('Runtime.exceptionThrown', function (p) { errors.push(p.exceptionDetails.text + ' ' + (p.exceptionDetails.exception && p.exceptionDetails.exception.description || '')); });
    cdp.on('Runtime.consoleAPICalled', function (p) { if (p.type === 'error') errors.push(p.args.map(function (a) { return a.value || a.description; }).join(' ')); });
    if (shotDir) fs.mkdirSync(shotDir, { recursive: true });

    for (var v = 0; v < VIEWPORTS.length; v++) {
      var vp = VIEWPORTS[v];
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.width < 600 });
      for (var r = 0; r < ROUTES.length; r++) {
        var route = ROUTES[r];
        errors.length = 0;
        // 每次换一个带版本号的地址，保证 hashchange 之外也能完整重载。
        await cdp.send('Page.navigate', { url: origin + '?p=' + r + route });
        await new Promise(function (res) { setTimeout(res, 450); });
        var result = JSON.parse((await cdp.send('Runtime.evaluate', { expression: INSPECT, returnByValue: true })).result.value);
        pages++;
        var label = vp.name + ' ' + route;
        if (errors.length) problems.push(label + ' JS 报错：' + errors.join(' | '));
        if (result.overflow > 1) problems.push(label + ' 横向溢出 ' + result.overflow + 'px');
        if (result.smallButtons.length) problems.push(label + ' 按钮不足 44px：' + result.smallButtons.join('；'));
        if (shotDir) {
          var shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
          fs.writeFileSync(path.join(shotDir, vp.name + '-' + route.replace(/[#/]+/g, '_') + '.png'), Buffer.from(shot.data, 'base64'));
        }
      }
    }
    cdp.close();
  } finally {
    proc.kill();
    server.close();
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}
  }
  if (problems.length) {
    console.error('check-pages: ' + problems.length + ' problem(s)\n  ' + problems.join('\n  '));
    process.exit(1);
  }
  console.log('check-pages: ok (' + pages + ' page renders, no JS errors, no overflow, buttons ≥ 44px)');
}

// 整体看门狗：无论哪一步卡住，4 分钟内一定给出结果。
var watchdog = setTimeout(function () { console.error('check-pages: failed (超过 4 分钟未完成)'); process.exit(1); }, 240000);
main().then(function () { clearTimeout(watchdog); process.exit(0); }, function (err) { console.error('check-pages: failed', err); process.exit(1); });
