// 判定・採点エンジン（純粋ロジック・DOM / Web Audio 非依存）

/** 判定窓（ms）。ノーツ時刻との差の絶対値で判定する */
export const WINDOWS = Object.freeze({
  perfect: 60, //  ピタッ！
  good: 120, //    まあまあ
  bad: 200, //     お手つき（ノーツを消費するが 0 点）
});

/** 判定ごとの得点 */
export const POINTS = Object.freeze({ perfect: 2, good: 1, bad: 0, miss: 0 });

/**
 * 入力とノーツの時間差から判定を返す。
 * @param {number} deltaMs 入力時刻 - ノーツ時刻（負 = 早い、正 = 遅い）
 * @returns {'perfect'|'good'|'bad'|null} すべての窓の外なら null
 */
export function classify(deltaMs) {
  const abs = Math.abs(deltaMs);
  if (abs <= WINDOWS.perfect) return 'perfect';
  if (abs <= WINDOWS.good) return 'good';
  if (abs <= WINDOWS.bad) return 'bad';
  return null;
}

/** スコアからランクを返す（リズム天国風の3段階） */
export function rankFor(score, maxScore = 100) {
  const ratio = score / maxScore;
  if (ratio >= 0.9) return 'ハイレベル！';
  if (ratio >= 0.7) return '平凡';
  return 'やりなおし…';
}

export class Engine {
  /** @param {number[]} noteTimesMs ノーツ時刻（ms・昇順） */
  constructor(noteTimesMs) {
    this.notes = noteTimesMs.map((timeMs, index) => ({
      index,
      timeMs,
      result: null, // 'perfect' | 'good' | 'bad' | 'miss'
      deltaMs: null,
    }));
    this.score = 0;
    this.counts = { perfect: 0, good: 0, bad: 0, miss: 0 };
  }

  get maxScore() {
    return this.notes.length * POINTS.perfect;
  }

  get finished() {
    return this.notes.every((n) => n.result !== null);
  }

  /**
   * 入力を処理する。最も近い未判定ノーツと照合する。
   * どの判定窓にも入らなければ 'stray'（空振り）でノーツは消費しない。
   * @param {number} timeMs 入力時刻（曲頭からの ms）
   * @returns {{type:'perfect'|'good'|'bad'|'stray', deltaMs:number|null, note:object|null}}
   */
  press(timeMs) {
    let best = null;
    let bestAbs = Infinity;
    for (const note of this.notes) {
      if (note.result !== null) continue;
      const abs = Math.abs(timeMs - note.timeMs);
      if (abs < bestAbs) {
        best = note;
        bestAbs = abs;
      }
      if (note.timeMs > timeMs + WINDOWS.bad) break;
    }
    const type = best === null ? null : classify(timeMs - best.timeMs);
    if (type === null) return { type: 'stray', deltaMs: null, note: null };

    best.result = type;
    best.deltaMs = timeMs - best.timeMs;
    this.counts[type] += 1;
    this.score += POINTS[type];
    return { type, deltaMs: best.deltaMs, note: best };
  }

  /**
   * 時刻を進め、判定窓を過ぎたノーツを miss にする。
   * @param {number} timeMs 現在時刻（曲頭からの ms）
   * @returns {object[]} 新たに miss になったノーツ
   */
  advance(timeMs) {
    const missed = [];
    for (const note of this.notes) {
      if (note.result === null && note.timeMs + WINDOWS.bad < timeMs) {
        note.result = 'miss';
        this.counts.miss += 1;
        missed.push(note);
      }
    }
    return missed;
  }
}
