import test from 'node:test';
import assert from 'node:assert/strict';
import { Engine, classify, rankFor, WINDOWS, POINTS } from '../src/engine.js';
import { buildChart, beatToSec } from '../src/chart.js';

test('classify: 判定窓の境界値', () => {
  assert.equal(classify(0), 'perfect');
  assert.equal(classify(WINDOWS.perfect), 'perfect');
  assert.equal(classify(-WINDOWS.perfect), 'perfect');
  assert.equal(classify(WINDOWS.perfect + 1), 'good');
  assert.equal(classify(WINDOWS.good), 'good');
  assert.equal(classify(-WINDOWS.good), 'good');
  assert.equal(classify(WINDOWS.good + 1), 'bad');
  assert.equal(classify(WINDOWS.bad), 'bad');
  assert.equal(classify(WINDOWS.bad + 1), null);
  assert.equal(classify(-1000), null);
});

test('得点仕様: ピタッ=2点 / まあまあ=1点 / お手つき・ミス=0点', () => {
  assert.equal(POINTS.perfect, 2);
  assert.equal(POINTS.good, 1);
  assert.equal(POINTS.bad, 0);
  assert.equal(POINTS.miss, 0);
});

test('全ノーツをぴったり押すと満点100点', () => {
  const chart = buildChart();
  const engine = new Engine(chart.notes.map((n) => beatToSec(n.beat) * 1000));
  for (const note of engine.notes) {
    const res = engine.press(note.timeMs);
    assert.equal(res.type, 'perfect');
  }
  assert.equal(engine.score, 100);
  assert.equal(engine.maxScore, 100);
  assert.ok(engine.finished);
  assert.equal(engine.counts.perfect, 50);
});

test('何も押さないと0点で全ノーツがミスになる', () => {
  const chart = buildChart();
  const engine = new Engine(chart.notes.map((n) => beatToSec(n.beat) * 1000));
  const missed = engine.advance(beatToSec(chart.endBeat) * 1000 + 1000);
  assert.equal(missed.length, 50);
  assert.equal(engine.score, 0);
  assert.equal(engine.counts.miss, 50);
  assert.ok(engine.finished);
});

test('判定ごとの得点が加算される', () => {
  const engine = new Engine([1000, 2000, 3000, 4000]);
  assert.equal(engine.press(1000).type, 'perfect'); // +2
  assert.equal(engine.press(2100).type, 'good'); //    +1
  assert.equal(engine.press(3150).type, 'bad'); //     +0
  engine.advance(10000); //                            miss +0
  assert.equal(engine.score, 3);
  assert.deepEqual(engine.counts, { perfect: 1, good: 1, bad: 1, miss: 1 });
});

test('早押し・遅押しの deltaMs が符号つきで記録される', () => {
  const engine = new Engine([1000, 2000]);
  const early = engine.press(950);
  assert.equal(early.type, 'perfect');
  assert.equal(early.deltaMs, -50);
  const late = engine.press(2080);
  assert.equal(late.type, 'good');
  assert.equal(late.deltaMs, 80);
});

test('窓の外の入力は stray でノーツを消費しない', () => {
  const engine = new Engine([1000]);
  const res = engine.press(500);
  assert.equal(res.type, 'stray');
  assert.equal(engine.score, 0);
  assert.equal(engine.notes[0].result, null); // ノーツは残る
  // その後ぴったり押せば取れる
  assert.equal(engine.press(1000).type, 'perfect');
});

test('最も近い未判定ノーツと照合される', () => {
  const engine = new Engine([1000, 1500]);
  const res = engine.press(1450);
  assert.equal(res.note.index, 1);
  assert.equal(res.type, 'perfect');
  // 1つ目はまだ未判定
  assert.equal(engine.notes[0].result, null);
});

test('同じノーツへの二度押しは stray になる', () => {
  const engine = new Engine([1000, 2000]);
  assert.equal(engine.press(1000).type, 'perfect');
  assert.equal(engine.press(1050).type, 'stray'); // 次のノーツは950ms先
  assert.equal(engine.score, 2);
});

test('advance は同じミスを二度返さない', () => {
  const engine = new Engine([1000]);
  assert.equal(engine.advance(2000).length, 1);
  assert.equal(engine.advance(3000).length, 0);
  assert.equal(engine.counts.miss, 1);
});

test('rankFor: リズム天国風の3段階ランク', () => {
  assert.equal(rankFor(100), 'ハイレベル！');
  assert.equal(rankFor(90), 'ハイレベル！');
  assert.equal(rankFor(89), '平凡');
  assert.equal(rankFor(70), '平凡');
  assert.equal(rankFor(69), 'やりなおし…');
  assert.equal(rankFor(0), 'やりなおし…');
});
