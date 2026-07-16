# テストと CI/CD

## ユニットテスト

Node.js 組み込みテストランナー（`node --test`）を使用。**依存パッケージなし**。

```bash
npm test                        # = node --test（test/*.test.js を自動検出）
docker compose run --rm test    # Docker（node:22-alpine）で実行
```

### テスト対象と観点

| ファイル | 対象 | 主な観点 |
| --- | --- | --- |
| `test/chart.test.js` | `src/chart.js` | ノーツ数50（満点100点）/ 昇順 / 判定窓が重ならない間隔 / ビャー6個 / 曲長約60秒 |
| `test/engine.test.js` | `src/engine.js` | 判定窓の境界値 / 得点仕様(2/1/0) / 全perfect=100点 / 無入力=0点 / 空振り / 二度押し / miss確定の冪等性 / ランク境界 |
| `test/share.test.js` | `src/share.js` | intent URL 形式 / パラメータのエスケープ（インジェクション対策） |

ブラウザ依存部（Canvas 描画・Web Audio）はユニットテストの対象外とし、
ブラウザでの手動確認（下記）でカバーする。

## 手動確認手順

```bash
docker compose up web   # http://localhost:8080
```

1. タイトル画面 →「スタート」で鳥が飛来し BGM が始まる
2. 群れのステップ音に合わせてクリック/スペース/タップ → 判定表示・得点加算
3. わざと外す → 失敗モーション・下画面に赤い刻み
4. 曲終了（約1分）→ リザルト表示・「Xで結果をポスト」で intent 画面が開く
5. リロード → スコアが消えてタイトルに戻る
6. スマホ実機 or DevTools のデバイスモードでタップ動作を確認

## CI（.github/workflows/ci.yml）

- トリガー: `main` への push / すべての PR
- 内容: Node 22 / 24 のマトリクスで `node --test`
- 権限: `contents: read` のみ。アクションはコミット SHA 固定

## CD（.github/workflows/deploy.yml）

- トリガー: `main` への push（+ 手動 `workflow_dispatch`）
- フロー: **test → build → deploy** （テスト失敗時はデプロイされない）
- build: `index.html` / `style.css` / `src/` のみを `_site/` に集めて
  Pages アーティファクト化（テスト・ドキュメント・設定ファイルは配信しない）
- deploy: `actions/deploy-pages` で GitHub Pages へ。
  `pages: write` / `id-token: write` は deploy ジョブだけに付与
