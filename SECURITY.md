# セキュリティポリシー

## 設計上のセキュリティ対策

このリポジトリは公開を前提に、攻撃面を最小化する構成を採っています。

| 項目 | 対策 |
| --- | --- |
| 依存パッケージ | **ゼロ**（ランタイム・開発ともに npm 依存なし）。サプライチェーン攻撃の余地を排除 |
| 外部リソース | CDN・外部フォント・外部 API を一切使用しない。音・画像はすべてコード生成 |
| CSP | `default-src 'none'` ベースの Content-Security-Policy を meta タグで宣言 |
| データ | Cookie / localStorage / 送信処理なし。スコアはメモリ上のみ（リロードで消える） |
| 外部リンク | X シェアは `URLSearchParams` でエスケープした intent URL を `rel="noopener noreferrer"` で開くのみ |
| GitHub Actions | 全アクションをコミット SHA で固定。`permissions` は最小権限（既定 `contents: read`） |
| シークレット | 不使用。ワークフローは `GITHUB_TOKEN`（最小権限）のみ |

## 脆弱性の報告

脆弱性を発見した場合は、公開 Issue ではなく GitHub の
[Private vulnerability reporting](../../security/advisories/new) から報告してください。
