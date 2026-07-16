// 譜面データ（純粋ロジック・DOM / Web Audio 非依存）

export const BPM = 120;
export const SEC_PER_BEAT = 60 / BPM;

/** 拍数を秒に変換する */
export function beatToSec(beat) {
  return beat * SEC_PER_BEAT;
}

/**
 * 譜面を生成する。
 *
 * ノーツはちょうど 50 個（満点 = 50 × 2 = 100 点）。
 * - note.type 'step' : 通常のステップ
 * - note.type 'byaa' : 「ビャー！」のアクセントジャンプ
 * - cues             : 鳥の鳴き声カットイン（入力対象ではない演出）
 */
export function buildChart() {
  const notes = [];
  const cues = [];

  // 「ピー ピャコ ピャッコ」の掛け声（3拍）
  const call = (beat) => {
    cues.push({ beat, voice: 'pii' });
    cues.push({ beat: beat + 1, voice: 'pyako' });
    cues.push({ beat: beat + 2, voice: 'pyakko' });
  };
  // 2拍ごとの行進ステップ
  const march = (start, count) => {
    for (let i = 0; i < count; i++) notes.push({ beat: start + i * 2, type: 'step' });
  };
  // 毎拍の駆け足ステップ
  const trot = (start, count) => {
    for (let i = 0; i < count; i++) notes.push({ beat: start + i, type: 'step' });
  };
  // 掛け声のあと「ビャー！ビャー！！」で2連続ジャンプ
  const byaa = (start) => {
    call(start);
    notes.push({ beat: start + 4, type: 'byaa' });
    notes.push({ beat: start + 5, type: 'byaa' });
    cues.push({ beat: start + 4, voice: 'byaa' });
    cues.push({ beat: start + 5, voice: 'byaa' });
  };

  call(4); //           イントロの鳴き声（入力なし）
  march(8, 12); //      拍 8..30   : ステップ ×12
  byaa(32); //          拍 36,37   : ビャー ×2
  march(40, 12); //     拍 40..62  : ステップ ×12
  byaa(64); //          拍 68,69   : ビャー ×2
  trot(72, 8); //       拍 72..79  : 駆け足 ×8
  byaa(80); //          拍 84,85   : ビャー ×2
  march(88, 12); //     拍 88..110 : ステップ ×12
  // 合計 12+2+12+2+8+2+12 = 50 ノーツ

  return {
    bpm: BPM,
    notes,
    cues,
    flyOutBeat: 112, // 鳥の群れが飛び去り始める拍
    endBeat: 120, //   曲の終端（= 60 秒）
  };
}
