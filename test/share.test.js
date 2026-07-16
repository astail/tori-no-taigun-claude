import test from 'node:test';
import assert from 'node:assert/strict';
import { buildShareUrl } from '../src/share.js';

test('X の intent URL が生成される', () => {
  const url = buildShareUrl({
    score: 87,
    maxScore: 100,
    rank: '平凡',
    pageUrl: 'https://example.com/game/',
  });
  assert.ok(url.startsWith('https://twitter.com/intent/tweet?'));
  const params = new URL(url).searchParams;
  assert.ok(params.get('text').includes('87/100'));
  assert.ok(params.get('text').includes('平凡'));
  assert.equal(params.get('url'), 'https://example.com/game/');
  assert.equal(params.get('hashtags'), '鳥の大群');
});

test('特殊文字が URL エンコードされる（インジェクション対策）', () => {
  const url = buildShareUrl({
    score: 0,
    maxScore: 100,
    rank: 'やりなおし…',
    pageUrl: 'https://example.com/?a=1&b=2#hash',
  });
  const parsed = new URL(url);
  // 生の & や # がクエリ構造を壊していないこと
  assert.equal(parsed.searchParams.get('url'), 'https://example.com/?a=1&b=2#hash');
  assert.ok(!url.includes('#hash'), 'フラグメントが素のまま埋め込まれている');
  assert.ok(parsed.searchParams.get('text').includes('0/100'));
});
