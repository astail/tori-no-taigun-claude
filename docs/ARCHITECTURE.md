# アーキテクチャ

依存パッケージゼロの静的サイト。ビルド工程なし・ES Modules をそのまま配信する。

## モジュール構成

```
index.html          エントリ HTML（CSP 宣言・オーバーレイ UI）
style.css           レイアウト・UI スタイル
src/
├── chart.js        譜面データ生成（純粋ロジック）★
├── engine.js       判定・採点エンジン（純粋ロジック）★
├── share.js        X シェア URL 生成（純粋ロジック）★
├── audio.js        BGM/SE 合成（Web Audio API 依存）
├── render.js       Canvas 描画（DOM 依存）
└── main.js         状態管理・入力・ゲームループ（すべてを結線）
```

★ = ブラウザ API 非依存。Node.js の `node --test` でユニットテストする対象。

## 設計方針

1. **純粋ロジックの分離**: 判定窓・得点・譜面・シェア URL は DOM / Web Audio に
   一切依存させず、Node.js 単体でテスト可能にする
2. **依存ゼロ**: フレームワーク・ビルドツール・外部アセットなし
   （公開リポジトリのサプライチェーンリスク排除と GitHub Pages 直配信のため）
3. **アセットのコード生成**: 鳥・背景は Canvas 描画、BGM・SE は Web Audio 合成

## タイミングモデル

- マスタークロックは `AudioContext.currentTime`（音とゲームの基準を一致させる）
- 曲開始時に `songStart = ctx.currentTime + 0.35` を記録し、
  以降は `t = ctx.currentTime - songStart` を曲内時刻とする
- 入力イベント時に `t` をミリ秒化して `Engine.press(tMs)` に渡す
- 描画は `requestAnimationFrame`。毎フレーム `Engine.advance(tMs)` で見逃しを確定

## BGM シーケンサ（audio.js）

- 譜面（chart.js）から BGM イベント列を事前生成:
  キック / ベース / コード / ハット / メロディ / 鳴き声 / 群れのステップ音
- `setInterval`（40ms）+ 180ms 先読みのルックアヘッド方式で
  `OscillatorNode` / ノイズバッファをスケジュール
- コード進行: C → C → F → G → C → Am → F → G（8小節ループ）
- 鳴き声カットインの小節はメロディを休符にして声を目立たせる

## 描画（render.js）

- ゲーム画面: 論理座標 960×540、下画面パネル: 960×150
- `devicePixelRatio`（上限2）で実ピクセルを確保し、CSS で幅 100% に縮尺（スマホ対応）
- 鳥は body/head/beak/wing/legs をパラメトリック描画。
  アニメーションは `{type, start, dur, dir}` の宣言的な形で持ち、描画時に補間

## 入力

- `keydown`（Space・リピート抑止）と `pointerdown`（マウス/タッチ統合）
- `touch-action: none` + `preventDefault()` でスクロール・ダブルタップズームを抑止
- ボタン類（`button, a`）への pointerdown はゲーム入力から除外

## 状態遷移

```
title ──スタート──▶ playing ──曲終了──▶ result
  ▲                                        │
  └────────────── もういちど ◀─────────────┘
```

スコア等はすべてメモリ上のみ。永続化なし。
