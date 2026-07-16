// X（Twitter）シェア URL 生成（純粋ロジック）

const INTENT_BASE = 'https://twitter.com/intent/tweet';

/**
 * X のポスト画面 URL を生成する。
 * すべてのパラメータは URLSearchParams でエスケープされる。
 * @param {{score:number, maxScore:number, rank:string, pageUrl:string}} result
 */
export function buildShareUrl({ score, maxScore, rank, pageUrl }) {
  const text = `リズムゲーム「鳥の大群」 スコア ${score}/${maxScore} 点（${rank}） ピーピャコ ピャッコ ビャー！ビャー！！`;
  const params = new URLSearchParams({
    text,
    url: pageUrl,
    hashtags: '鳥の大群',
  });
  return `${INTENT_BASE}?${params.toString()}`;
}
