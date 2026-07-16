// BGM・SE 合成エンジン（Web Audio API・外部音源ファイル不使用）
import { beatToSec } from './chart.js';

const midiHz = (midi) => 440 * 2 ** ((midi - 69) / 12);

// コード構成音（MIDI ノート番号）
const CHORDS = {
  C: [48, 52, 55],
  F: [41, 45, 48],
  G: [43, 47, 50],
  Am: [45, 48, 52],
};
const PROGRESSION = ['C', 'C', 'F', 'G', 'C', 'Am', 'F', 'G'];

// 8小節（32拍）のメロディ [拍, MIDIノート, 長さ(拍)]
const MELODY = [
  [0, 64, 1], [1, 67, 1], [2, 64, 1], [3, 67, 1],
  [4, 69, 1], [5, 67, 1], [6, 64, 1], [7, 60, 1],
  [8, 65, 1], [9, 69, 1], [10, 72, 1], [11, 69, 1],
  [12, 62, 1], [13, 65, 1], [14, 67, 1], [15, 71, 1],
  [16, 72, 1], [17, 67, 1], [18, 64, 1], [19, 67, 1],
  [20, 69, 1], [21, 72, 1], [22, 76, 1], [23, 72, 1],
  [24, 65, 1], [25, 69, 1], [26, 72, 1], [27, 74, 1],
  [28, 76, 1], [29, 74, 1], [30, 71, 1], [31, 67, 1],
];

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
    this.timer = null;
    this.events = [];
    this.nextEvent = 0;
    this.songStart = 0;
  }

  /** AudioContext はユーザー操作を起点に生成する（自動再生制限対策） */
  ensureContext() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    const comp = this.ctx.createDynamicsCompressor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.6;
    this.master.connect(comp);
    comp.connect(this.ctx.destination);
    this.noiseBuffer = this.makeNoiseBuffer();
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') return this.ctx.resume();
    return Promise.resolve();
  }

  now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  makeNoiseBuffer() {
    const len = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ---- 音源プリミティブ ----

  tone(when, { freq, endFreq = 0, dur, type = 'square', gain = 0.15, attack = 0.004, release = 0.08, lowpass = 0 }) {
    const t0 = Math.max(when, this.ctx.currentTime + 0.001);
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq > 0) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);
    const amp = this.ctx.createGain();
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.linearRampToValueAtTime(gain, t0 + attack);
    amp.gain.exponentialRampToValueAtTime(0.001, t0 + dur + release);
    let head = osc;
    if (lowpass > 0) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass;
      osc.connect(filter);
      head = filter;
    }
    head.connect(amp);
    amp.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + release + 0.02);
  }

  noise(when, { dur, gain = 0.1, band = 0 }) {
    const t0 = Math.max(when, this.ctx.currentTime + 0.001);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const amp = this.ctx.createGain();
    amp.gain.setValueAtTime(gain, t0);
    amp.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    let head = src;
    if (band > 0) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = band;
      filter.Q.value = 1;
      src.connect(filter);
      head = filter;
    }
    head.connect(amp);
    amp.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  // ---- 鳥の鳴き声（ピーピャコ ピャッコ ビャー！ビャー！！） ----

  voice(name, when = 0) {
    const t = when || this.ctx.currentTime;
    switch (name) {
      case 'pii': // ピー
        this.tone(t, { freq: 2093, endFreq: 1760, dur: 0.3, type: 'sine', gain: 0.22 });
        this.tone(t, { freq: 4186, endFreq: 3520, dur: 0.3, type: 'sine', gain: 0.05 });
        break;
      case 'pyako': // ピャコ
        this.tone(t, { freq: 1568, endFreq: 1245, dur: 0.09, type: 'sine', gain: 0.2 });
        this.tone(t + 0.13, { freq: 1047, endFreq: 932, dur: 0.11, type: 'sine', gain: 0.18 });
        break;
      case 'pyakko': // ピャッコ
        this.tone(t, { freq: 1568, endFreq: 1319, dur: 0.07, type: 'sine', gain: 0.2 });
        this.tone(t + 0.18, { freq: 988, endFreq: 880, dur: 0.14, type: 'sine', gain: 0.2 });
        break;
      case 'byaa': // ビャー！
        this.tone(t, { freq: 932, endFreq: 415, dur: 0.42, type: 'sawtooth', gain: 0.3, lowpass: 2600 });
        this.tone(t, { freq: 947, endFreq: 425, dur: 0.42, type: 'sawtooth', gain: 0.18, lowpass: 2200 });
        this.noise(t, { dur: 0.12, gain: 0.08, band: 2500 });
        break;
    }
  }

  // ---- ゲーム SE ----

  /** 群れのステップ音（リズムの目印になる「コッ」） */
  stepTick(when) {
    this.noise(when, { dur: 0.04, gain: 0.09, band: 3200 });
    this.tone(when, { freq: 660, dur: 0.035, type: 'triangle', gain: 0.12 });
  }

  /** プレイヤー入力音（判定別） */
  pressSE(result) {
    const t = this.ctx.currentTime;
    if (result === 'perfect') {
      this.tone(t, { freq: 1319, endFreq: 1976, dur: 0.07, type: 'sine', gain: 0.22 });
      this.tone(t + 0.05, { freq: 2637, dur: 0.09, type: 'sine', gain: 0.12 });
    } else if (result === 'good') {
      this.tone(t, { freq: 1245, endFreq: 1568, dur: 0.07, type: 'sine', gain: 0.2 });
    } else {
      // bad / stray（お手つき）: ブベッ
      this.tone(t, { freq: 523, endFreq: 220, dur: 0.22, type: 'sawtooth', gain: 0.22, lowpass: 1800 });
      this.noise(t, { dur: 0.08, gain: 0.07, band: 900 });
    }
  }

  /** 見逃し音（ピェ…） */
  missSE() {
    this.tone(this.ctx.currentTime, { freq: 880, endFreq: 494, dur: 0.18, type: 'sine', gain: 0.12 });
  }

  // ---- BGM シーケンサ ----

  buildSongEvents(chart) {
    const events = [];
    const push = (beat, kind, data = {}) => events.push({ t: beatToSec(beat), kind, ...data });
    const totalBars = Math.floor(chart.endBeat / 4);
    // 鳴き声カットインのある小節はメロディを休符にして声を目立たせる
    const restBars = new Set(chart.cues.map((c) => Math.floor(c.beat / 4)));

    // 伴奏（最終小節は終止和音に譲る）
    for (let bar = 0; bar < totalBars - 1; bar++) {
      const [root, third, fifth] = CHORDS[PROGRESSION[bar % PROGRESSION.length]];
      for (let i = 0; i < 4; i++) {
        const beat = bar * 4 + i;
        push(beat, 'bass', { midi: i % 2 === 0 ? root - 12 : fifth - 12 });
        push(beat + 0.5, 'hat');
        if (i % 2 === 0) push(beat, 'kick');
      }
      push(bar * 4 + 1, 'chord', { midis: [root + 12, third + 12, fifth + 12] });
      push(bar * 4 + 3, 'chord', { midis: [root + 12, third + 12, fifth + 12] });
    }

    // メロディ（32拍ループ）
    for (let phrase = 0; phrase * 32 < chart.endBeat; phrase++) {
      for (const [b, midi, len] of MELODY) {
        const beat = phrase * 32 + b;
        if (beat >= chart.endBeat - 4) continue;
        if (restBars.has(Math.floor(beat / 4))) continue;
        push(beat, 'melody', { midi, len });
      }
    }

    // 終止和音（ジャーン）
    push(chart.endBeat - 4, 'final');

    // 鳴き声カットインと群れのステップ音
    for (const cue of chart.cues) push(cue.beat, 'voice', { name: cue.voice });
    for (const note of chart.notes) push(note.beat, 'tick');

    events.sort((a, b) => a.t - b.t);
    return events;
  }

  playEvent(event, when) {
    switch (event.kind) {
      case 'bass':
        this.tone(when, { freq: midiHz(event.midi), dur: 0.22, type: 'triangle', gain: 0.3, lowpass: 900 });
        break;
      case 'kick':
        this.tone(when, { freq: 160, endFreq: 55, dur: 0.09, type: 'sine', gain: 0.4 });
        break;
      case 'hat':
        this.noise(when, { dur: 0.03, gain: 0.045, band: 7000 });
        break;
      case 'chord':
        for (const midi of event.midis) {
          this.tone(when, { freq: midiHz(midi), dur: 0.16, type: 'square', gain: 0.045, lowpass: 2400 });
        }
        break;
      case 'melody':
        this.tone(when, { freq: midiHz(event.midi), dur: 0.28 * (event.len ?? 1), type: 'square', gain: 0.11, lowpass: 3200 });
        break;
      case 'final':
        for (const midi of [36, 48, 52, 55, 60, 64, 72]) {
          this.tone(when, { freq: midiHz(midi), dur: 1.6, type: 'triangle', gain: 0.12, release: 0.5 });
        }
        this.tone(when, { freq: midiHz(84), dur: 1.2, type: 'sine', gain: 0.15, release: 0.4 });
        break;
      case 'voice':
        this.voice(event.name, when);
        break;
      case 'tick':
        this.stepTick(when);
        break;
    }
  }

  /** 曲全体をルックアヘッド方式でスケジュールする */
  startSong(chart, startTime) {
    this.stopSong();
    this.songStart = startTime;
    this.events = this.buildSongEvents(chart);
    this.nextEvent = 0;
    this.timer = setInterval(() => this.pump(), 40);
    this.pump();
  }

  pump() {
    const horizon = this.ctx.currentTime + 0.18;
    while (this.nextEvent < this.events.length) {
      const event = this.events[this.nextEvent];
      const when = this.songStart + event.t;
      if (when > horizon) break;
      this.playEvent(event, when);
      this.nextEvent += 1;
    }
    if (this.nextEvent >= this.events.length) this.stopSong();
  }

  stopSong() {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.events = [];
    this.nextEvent = 0;
  }
}
