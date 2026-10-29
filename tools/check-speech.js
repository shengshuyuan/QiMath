#!/usr/bin/env node
'use strict';
var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var vm = require('node:vm');
var audio, spoken = [], timers = new Map(), nextTimer = 0;
function Audio() { audio = this; this.paused = true; this.ended = false; this.plays = 0; }
Audio.prototype.addEventListener = function () {};
Audio.prototype.pause = function () { this.paused = true; };
Audio.prototype.play = function () { this.paused = false; this.plays++; return Promise.resolve(); };
var synth = {
  speaking: false, pending: false,
  getVoices: function () { return [{ lang: 'zh-CN', name: '普通话', localService: true }]; },
  cancel: function () { this.speaking = false; this.pending = false; },
  speak: function (utterance) {
    assert.ok(!audio || audio.paused, '合成语音开始时录音必须已暂停');
    spoken.push(utterance.text); this.speaking = true;
  }
};
var g = {
  Audio: Audio, speechSynthesis: synth,
  SpeechSynthesisUtterance: function (text) { this.text = text; },
  setTimeout: function (fn) { var id = ++nextTimer; timers.set(id, fn); return id; },
  clearTimeout: function (id) { timers.delete(id); },
  MT: { voiceClips: { '三四十二': 'test.mp3' }, progress: { settings: { speechOn: true } }, core: { clamp: function (v) { return v; } } }
};
g.window = g;
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/speech.js'), 'utf8'), g);
var speech = g.MT.speech;
speech.play('三四十二', 'koujue');
assert.equal(audio.paused, false);
speech.play('三四十二', 'koujue');
assert.equal(audio.plays, 1, '正在播放同一句时不重播');
speech.play('认识克和千克', 'calc');
assert.equal(audio.paused, true);
assert.deepEqual(spoken, ['认识克和千克']);
speech.play('旧的讲解', 'calc');
assert.equal(timers.size, 1);
speech.play('新的题目', 'calc');
assert.equal(timers.size, 0, '新朗读必须取消旧的延迟请求');
assert.deepEqual(spoken, ['认识克和千克', '新的题目']);
speech.play('另一段讲解', 'calc');
assert.equal(timers.size, 1);
speech.play('三四十二', 'koujue');
assert.equal(timers.size, 0);
assert.equal(synth.speaking, false, '切回录音时取消合成语音');
assert.equal(audio.paused, false);
speech.stop();
assert.equal(audio.paused, true);
assert.equal(timers.size, 0);
console.log('check-speech: ok (clip/synthesis exclusivity, pending cancellation, repeated speech, stop)');
