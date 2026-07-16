// ゲーム本体（状態管理・入力・ループ）
import { buildChart, beatToSec } from './chart.js';
import { Engine, rankFor } from './engine.js';
import { buildShareUrl } from './share.js';
import { AudioEngine } from './audio.js';
import { Renderer, VIEW_W } from './render.js';

const JUDGE_LABEL = {
  perfect: { text: 'ピタッ！', color: '#ffb400' },
  good: { text: 'まあまあ', color: '#58b458' },
  bad: { text: 'おっと…', color: '#e57373' },
  stray: { text: 'おてつき！', color: '#e57373' },
  miss: { text: 'ミス…', color: '#8a99a8' },
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, p) => a + (b - a) * p;

// ---- DOM ----
const gameCanvas = document.getElementById('game');
const panelCanvas = document.getElementById('panel');
const overlayTitle = document.getElementById('overlay-title');
const overlayResult = document.getElementById('overlay-result');
const btnStart = document.getElementById('btn-start');
const btnRetry = document.getElementById('btn-retry');
const shareLink = document.getElementById('btn-share');
const resultScore = document.getElementById('result-score');
const resultRank = document.getElementById('result-rank');
const resultDetail = document.getElementById('result-detail');

const audio = new AudioEngine();
const renderer = new Renderer(gameCanvas, panelCanvas);

// ---- 鳥の配置 ----

function makeBirds() {
  const spec = [
    [150, 452, 30], [320, 448, 30], [490, 446, 30], [660, 448, 30], [830, 452, 30],
    [235, 482, 35], [405, 480, 35], [575, 480, 35], [745, 482, 35],
  ];
  const birds = spec.map(([x, y, size], i) => ({
    homeX: x, homeY: y, x, y, size,
    color: '#fff3cf', belly: '#ffffff',
    facing: x > VIEW_W / 2 ? -1 : 1,
    phase: i * 1.7, anim: null, flying: false, landed: false, isPlayer: false,
    flyIn: { start: 0.15 + i * 0.16, dur: 2.0, fromX: -120 - i * 70, fromY: 90 + (i % 3) * 40 },
    flyOut: { delay: i * 0.13, dur: 2.4, toX: VIEW_W + 160 + i * 60, toY: 40 + (i % 3) * 30 },
  }));
  const player = {
    homeX: 480, homeY: 514, x: 480, y: 514, size: 44,
    color: '#ff9db0', belly: '#ffe3ea',
    facing: 1, phase: 0.5, anim: null, flying: false, landed: false, isPlayer: true,
    flyIn: { start: 1.6, dur: 2.0, fromX: -260, fromY: 150 },
    flyOut: { delay: 1.3, dur: 2.4, toX: VIEW_W + 320, toY: 60 },
  };
  birds.push(player);
  return { birds, player };
}

// ---- 状態 ----

const state = {
  mode: 'title', // 'title' | 'playing' | 'result'
  chart: buildChart(),
  engine: null,
  songStart: 0,
  birds: [],
  player: null,
  popups: [],
  panel: {
    score: 0,
    maxScore: 100,
    counts: { perfect: 0, good: 0, bad: 0, miss: 0 },
    ticks: [],
    lastJudge: null,
  },
  nextNoteIdx: 0,
  nextCueIdx: 0,
};

function resetBirds() {
  const { birds, player } = makeBirds();
  state.birds = birds;
  state.player = player;
}

resetBirds();
// タイトル画面では定位置で待機
for (const bird of state.birds) bird.landed = true;

function clock() {
  if (state.mode === 'title') return performance.now() / 1000;
  return audio.now() - state.songStart;
}

// ---- ゲーム進行 ----

async function startGame() {
  audio.ensureContext();
  await audio.resume();
  state.chart = buildChart();
  state.engine = new Engine(state.chart.notes.map((n) => beatToSec(n.beat) * 1000));
  state.songStart = audio.now() + 0.35;
  audio.startSong(state.chart, state.songStart);

  resetBirds();
  state.popups = [];
  state.panel = {
    score: 0,
    maxScore: state.engine.maxScore,
    counts: state.engine.counts,
    ticks: [],
    lastJudge: null,
  };
  state.nextNoteIdx = 0;
  state.nextCueIdx = 0;
  state.mode = 'playing';
  overlayTitle.classList.add('hidden');
  overlayResult.classList.add('hidden');
}

function finishGame() {
  state.mode = 'result';
  audio.stopSong();
  const score = state.engine.score;
  const max = state.engine.maxScore;
  const rank = rankFor(score, max);
  const counts = state.engine.counts;
  resultScore.textContent = `スコア ${score} / ${max}`;
  resultRank.textContent = rank;
  resultDetail.textContent = `ピタッ！ ${counts.perfect} ／ まあまあ ${counts.good} ／ ミス ${counts.bad + counts.miss}`;
  shareLink.href = buildShareUrl({
    score,
    maxScore: max,
    rank,
    pageUrl: location.href.split(/[?#]/)[0],
  });
  overlayResult.classList.remove('hidden');
}

function addPopup(text, color, t) {
  state.popups.push({ text, color, x: state.player.x, y: state.player.y - state.player.size * 1.6, start: t });
}

function setJudge(type, t) {
  const label = JUDGE_LABEL[type];
  state.panel.lastJudge = { text: label.text, color: label.color, at: t };
  addPopup(label.text, label.color, t);
}

// ステップの向きはノーツ番号の偶奇で決める（群れとプレイヤーで共通）
const stepDir = (noteIndex) => (noteIndex % 2 === 0 ? 1 : -1);

function onPress() {
  if (state.mode === 'title') {
    startGame();
    return;
  }
  if (state.mode !== 'playing') return;
  const t = clock();
  const tMs = t * 1000;
  if (tMs < 0) return;

  const res = state.engine.press(tMs);
  const bird = state.player;
  if (res.type === 'perfect' || res.type === 'good') {
    const noteType = state.chart.notes[res.note.index].type;
    bird.anim = {
      type: noteType === 'byaa' ? 'byaa' : 'step',
      start: t,
      dur: noteType === 'byaa' ? 0.45 : 0.3,
      dir: stepDir(res.note.index),
    };
    audio.pressSE(res.type);
    state.panel.ticks.push({ deltaMs: res.deltaMs, type: res.type, at: t });
  } else if (res.type === 'bad') {
    bird.anim = { type: 'fail', start: t, dur: 0.6 };
    audio.pressSE('bad');
    state.panel.ticks.push({ deltaMs: res.deltaMs, type: 'bad', at: t });
  } else {
    // stray: どのノーツにも掛からない空振り
    bird.anim = { type: 'fail', start: t, dur: 0.6 };
    audio.pressSE('bad');
  }
  setJudge(res.type, t);
}

// ---- 飛来・飛び去りの位置計算 ----

function positionBird(bird, t) {
  const flyOutStart = beatToSec(state.chart.flyOutBeat) + bird.flyOut.delay;
  if (t < bird.flyIn.start + bird.flyIn.dur) {
    const p = clamp((t - bird.flyIn.start) / bird.flyIn.dur, 0, 1);
    const ease = 1 - (1 - p) ** 3;
    bird.x = lerp(bird.flyIn.fromX, bird.homeX, ease);
    bird.y = lerp(bird.flyIn.fromY, bird.homeY, ease) - Math.sin(p * Math.PI) * 50;
    bird.flying = p < 1;
    if (p >= 1 && !bird.landed) {
      bird.landed = true;
      bird.anim = { type: 'step', start: t, dur: 0.3, dir: 1 };
    }
  } else if (t >= flyOutStart) {
    const p = clamp((t - flyOutStart) / bird.flyOut.dur, 0, 1);
    const ease = p * p;
    bird.x = lerp(bird.homeX, bird.flyOut.toX, ease);
    bird.y = lerp(bird.homeY, bird.flyOut.toY, ease) - Math.sin(p * Math.PI) * 30;
    bird.flying = p > 0;
  } else {
    bird.x = bird.homeX;
    bird.y = bird.homeY;
    bird.flying = false;
  }
}

// ---- 更新 ----

function update(t) {
  const chart = state.chart;

  for (const bird of state.birds) positionBird(bird, t);

  // 群れは常にお手本どおりに動く
  while (state.nextNoteIdx < chart.notes.length && beatToSec(chart.notes[state.nextNoteIdx].beat) <= t) {
    const note = chart.notes[state.nextNoteIdx];
    for (const bird of state.birds) {
      if (bird.isPlayer || bird.flying) continue;
      bird.anim = {
        type: note.type === 'byaa' ? 'byaa' : 'step',
        start: t,
        dur: note.type === 'byaa' ? 0.45 : 0.3,
        dir: stepDir(state.nextNoteIdx),
      };
    }
    state.nextNoteIdx += 1;
  }

  // 鳴き声カットインでは何羽かがくちばしを開ける
  while (state.nextCueIdx < chart.cues.length && beatToSec(chart.cues[state.nextCueIdx].beat) <= t) {
    const flock = state.birds.filter((b) => !b.isPlayer);
    for (const offset of [0, 4]) {
      const bird = flock[(state.nextCueIdx + offset) % flock.length];
      if (!bird.flying) bird.anim = { type: 'call', start: t, dur: 0.35 };
    }
    state.nextCueIdx += 1;
  }

  // 見逃しの処理
  const missed = state.engine.advance(t * 1000);
  if (missed.length > 0) {
    state.player.anim = { type: 'sulk', start: t, dur: 0.6 };
    audio.missSE();
    setJudge('miss', t);
  }

  state.panel.score = state.engine.score;
  state.popups = state.popups.filter((p) => t - p.start < 1);
  state.panel.ticks = state.panel.ticks.filter((tick) => t - tick.at < 5);

  if (t >= beatToSec(chart.endBeat) + 0.6) finishGame();
}

// ---- メインループ ----

function frame() {
  const t = clock();
  if (state.mode === 'playing') update(t);
  renderer.drawGame(state, t);
  renderer.drawPanel(state.panel, t, state.mode);
  requestAnimationFrame(frame);
}

// ---- 入力 ----

window.addEventListener('keydown', (e) => {
  if (e.code !== 'Space') return;
  e.preventDefault();
  if (!e.repeat) onPress();
});

document.getElementById('game-area').addEventListener('pointerdown', (e) => {
  if (e.target.closest('button, a')) return; // ボタン操作は入力にしない
  e.preventDefault();
  onPress();
});

btnStart.addEventListener('click', startGame);
btnRetry.addEventListener('click', startGame);
window.addEventListener('resize', () => renderer.resize());

requestAnimationFrame(frame);

// E2E テスト・デバッグ用の読み取りフック（ゲームロジックには影響しない）
window.__tori = { state, audio, clock };
