import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChart, beatToSec, BPM, SEC_PER_BEAT } from '../src/chart.js';
import { POINTS } from '../src/engine.js';

test('ノーツはちょうど50個（満点100点）', () => {
  const chart = buildChart();
  assert.equal(chart.notes.length, 50);
  assert.equal(chart.notes.length * POINTS.perfect, 100);
});

test('ノーツは狭義単調増加で曲の範囲内にある', () => {
  const chart = buildChart();
  for (let i = 1; i < chart.notes.length; i++) {
    assert.ok(chart.notes[i].beat > chart.notes[i - 1].beat, `notes[${i}] が昇順でない`);
  }
  assert.ok(chart.notes[0].beat >= 8, 'イントロ中にノーツがある');
  assert.ok(chart.notes.at(-1).beat < chart.flyOutBeat, '飛び去り後にノーツがある');
  assert.ok(chart.flyOutBeat < chart.endBeat);
});

test('隣接ノーツの間隔は判定窓(±200ms)が重ならない', () => {
  const chart = buildChart();
  for (let i = 1; i < chart.notes.length; i++) {
    const gapMs = beatToSec(chart.notes[i].beat - chart.notes[i - 1].beat) * 1000;
    assert.ok(gapMs > 400, `notes[${i}] の間隔 ${gapMs}ms が狭すぎる`);
  }
});

test('「ビャー！」ノーツは6個（2連続×3回）', () => {
  const chart = buildChart();
  const byaa = chart.notes.filter((n) => n.type === 'byaa');
  assert.equal(byaa.length, 6);
});

test('鳴き声キューが存在し、ビャー以外はノーツと重ならない', () => {
  const chart = buildChart();
  assert.ok(chart.cues.length > 0);
  const noteBeats = new Set(chart.notes.map((n) => n.beat));
  for (const cue of chart.cues) {
    if (cue.voice === 'byaa') continue; // ビャーはノーツと同時に鳴く
    assert.ok(!noteBeats.has(cue.beat), `キュー(${cue.voice}, 拍${cue.beat}) がノーツと重複`);
  }
});

test('曲の長さは約60秒', () => {
  const chart = buildChart();
  const lengthSec = beatToSec(chart.endBeat);
  assert.ok(lengthSec >= 55 && lengthSec <= 75, `曲の長さが ${lengthSec} 秒`);
  assert.equal(beatToSec(BPM), 60); // BPM 拍ぶんでちょうど1分
  assert.equal(SEC_PER_BEAT, 60 / BPM);
});
