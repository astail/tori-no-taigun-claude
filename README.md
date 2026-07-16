# 鳥の大群（tori-no-taigun-claude）

[![CI](https://github.com/astail/tori-no-taigun-claude/actions/workflows/ci.yml/badge.svg)](https://github.com/astail/tori-no-taigun-claude/actions/workflows/ci.yml)
[![Deploy](https://github.com/astail/tori-no-taigun-claude/actions/workflows/deploy.yml/badge.svg)](https://github.com/astail/tori-no-taigun-claude/actions/workflows/deploy.yml)

リズム天国「鳥の大群」風の**非公式ファンメイド**ブラウザリズムゲームです。
群れの鳥と同じタイミングでステップを踏んで、100点満点を目指します。

**▶ 遊ぶ: https://astail.github.io/tori-no-taigun-claude/**

## 遊び方

- リズムに合わせて **クリック / スペースキー / タップ**（スマホ対応）
- 群れの鳥はいつもお手本どおりに動きます。同じタイミングで押せば一緒にステップ！
- 「ピー ピャコ ピャッコ」の鳴き声のあとは「**ビャー！ビャー！！**」で2連続入力
- 判定: ピタッ！（±60ms）= 2点 ／ まあまあ（±120ms）= 1点 ／ ミス = 0点
- ノーツは全50個、**100点満点**（曲は約1分）
- 画面下部はDS下画面風の「タイミングチェック」。押した瞬間の早い/遅いが刻まれます
- 結果画面から X（Twitter）にスコアをポストできます
- スコアの保存はありません（リロードで消えます）

## ローカルで動かす

静的サイトなので HTTP サーバーで配信するだけです（ES Modules のため `file://` 直開きは不可）。

```bash
# Docker
docker compose up web          # → http://localhost:8080

# または Python
python3 -m http.server 8080
```

## テスト

```bash
npm test                       # Node 20+（node --test、依存パッケージなし）
docker compose run --rm test   # Docker で実行する場合
```

## ドキュメント

- [ゲーム仕様](docs/SPEC.md)
- [アーキテクチャ](docs/ARCHITECTURE.md)
- [テストと CI/CD](docs/TESTING.md)
- [セキュリティポリシー](SECURITY.md)

## セキュリティ

公開リポジトリとして攻撃面を最小化しています:
依存パッケージゼロ / 外部リソース読み込みなし / CSP 宣言 / データ収集なし /
GitHub Actions は SHA 固定 + 最小権限。詳細は [SECURITY.md](SECURITY.md) を参照。

## 免責

本作品は任天堂株式会社および「リズム天国」シリーズとは一切関係のない、個人による二次創作的ファンメイド作品です。
グラフィック・音楽・効果音はすべてプログラムによるオリジナル生成で、原作のアセットは使用していません。

## ライセンス

[MIT](LICENSE)
