#!/usr/bin/env node
'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var stored = {};

function reqUrl(request) {
  return typeof request === 'string' ? request : request.url;
}

var fakeCache = {
  match: function (request) {
    var url = reqUrl(request);
    return Promise.resolve(stored[url] || null);
  },
  put: function (request, response) {
    stored[reqUrl(request)] = response;
    return Promise.resolve();
  },
  addAll: function () { return Promise.resolve(); }
};

var g = {
  CACHE_NAME: '',
  caches: {
    open: function () { return Promise.resolve(fakeCache); },
    match: function (request) { return fakeCache.match(request); },
    keys: function () { return Promise.resolve([]); },
    delete: function () { return Promise.resolve(true); }
  },
  fetch: function () { return Promise.reject(new Error('offline')); },
  console: console,
  skipWaiting: function () { return Promise.resolve(); },
  clients: { claim: function () { return Promise.resolve(); } },
  addEventListener: function () {}
};
g.self = g;
vm.createContext(g);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8'), g, { filename: 'sw.js' });

var origin = 'https://qimath.example';
stored[origin + '/js/add.js'] = { url: origin + '/js/add.js', body: 'add' };
stored[origin + '/'] = { url: origin + '/', body: 'home' };

g.matchCached({ url: origin + '/js/add.js?v=2.3.4' }).then(function (hit) {
  assert.ok(hit, '带版本的脚本应回退到预缓存');
  assert.strictEqual(hit.body, 'add');
  return g.matchCached({ url: origin + '/js/missing.js?v=2.3.4' });
}).then(function (miss) {
  assert.strictEqual(miss, null);
  return g.matchCached({ url: origin + '/js/add.js' });
}).then(function (exact) {
  assert.strictEqual(exact.body, 'add');
  console.log('check-sw-precache: ok');
}).catch(function (err) {
  console.error(err);
  process.exit(1);
});
