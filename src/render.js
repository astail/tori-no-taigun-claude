// Canvas 描画（背景・鳥・エフェクト・下画面のタイミングチェックパネル）
import { WINDOWS } from './engine.js';

export const VIEW_W = 960;
export const VIEW_H = 540;
export const PANEL_W = 960;
export const PANEL_H = 150;
export const GROUND_Y = 440;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export class Renderer {
  constructor(gameCanvas, panelCanvas) {
    this.gameCanvas = gameCanvas;
    this.panelCanvas = panelCanvas;
    this.g = gameCanvas.getContext('2d');
    this.p = panelCanvas.getContext('2d');
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.gameCanvas.width = Math.round(VIEW_W * dpr);
    this.gameCanvas.height = Math.round(VIEW_H * dpr);
    this.panelCanvas.width = Math.round(PANEL_W * dpr);
    this.panelCanvas.height = Math.round(PANEL_H * dpr);
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.p.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  drawGame(state, t) {
    const ctx = this.g;
    drawBackground(ctx, t);
    // 奥の鳥から手前の順に描画
    const birds = [...state.birds].sort((a, b) => a.homeY - b.homeY);
    for (const bird of birds) drawBird(ctx, bird, t);
    for (const popup of state.popups) drawPopup(ctx, popup, t);
  }

  drawPanel(panel, t, mode) {
    drawTimingPanel(this.p, panel, t, mode);
  }
}

// ---- 背景 ----

function drawBackground(ctx, t) {
  // 空
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#7ec8f0');
  sky.addColorStop(1, '#dff4ff');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, GROUND_Y);

  // 太陽
  ctx.fillStyle = 'rgba(255, 224, 138, 0.9)';
  ctx.beginPath();
  ctx.arc(836, 84, 42, 0, Math.PI * 2);
  ctx.fill();

  // 流れる雲
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  for (let k = 0; k < 3; k++) {
    const cx = ((t * 12 + k * 360) % (VIEW_W + 260)) - 130;
    const cy = 64 + k * 52;
    for (const [dx, dy, r] of [[-34, 6, 22], [0, 0, 30], [36, 8, 20]]) {
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 地面
  ctx.fillStyle = '#8ccf6f';
  ctx.fillRect(0, GROUND_Y, VIEW_W, VIEW_H - GROUND_Y);
  ctx.fillStyle = '#7bbd5f';
  ctx.fillRect(0, GROUND_Y, VIEW_W, 6);

  // 草（座標は決定的に散らす）
  ctx.strokeStyle = '#5ea952';
  ctx.lineWidth = 2;
  for (let i = 0; i < 16; i++) {
    const gx = ((i * 173 + 40) % VIEW_W);
    const gy = GROUND_Y + 18 + ((i * 61) % 70);
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx - 4, gy - 9);
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + 1, gy - 11);
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + 5, gy - 8);
    ctx.stroke();
  }
}

// ---- 鳥 ----

/**
 * デフォルメ鳥を描く。
 * bird: {x, y, size, color, belly, facing, phase, anim, flying}
 * anim: {type:'step'|'byaa'|'fail'|'sulk'|'call', start, dur, dir}
 */
export function drawBird(ctx, bird, t) {
  const s = bird.size;
  let hop = 0;
  let lean = 0;
  let squash = 1;
  let rot = 0;
  let beakOpen = 0;
  let wingFlap = 0;
  let legTuck = 0;
  let mark = null;

  const anim = bird.anim;
  const p = anim ? clamp((t - anim.start) / anim.dur, 0, 1) : 1;
  const active = anim && p < 1;
  if (active) {
    switch (anim.type) {
      case 'step': {
        const arc = Math.sin(Math.PI * p);
        hop = arc * s * 0.35;
        lean = (anim.dir ?? 1) * 0.18 * arc;
        wingFlap = arc * 0.5;
        break;
      }
      case 'byaa': {
        const arc = Math.sin(Math.PI * p);
        hop = arc * s * 0.9;
        wingFlap = Math.sin(p * Math.PI * 4);
        beakOpen = 1 - p * 0.5;
        legTuck = arc;
        break;
      }
      case 'fail': {
        rot = Math.sin(p * Math.PI * 5) * (1 - p) * 0.45;
        squash = 1 - 0.25 * (1 - p);
        beakOpen = 1 - p;
        mark = 'sweat';
        break;
      }
      case 'sulk': {
        squash = 1 - 0.12 * Math.sin(Math.PI * p);
        mark = 'dots';
        break;
      }
      case 'call': {
        beakOpen = Math.sin(Math.PI * p);
        break;
      }
    }
  } else {
    hop = Math.abs(Math.sin(t * 2 + bird.phase)) * 1.5; // 待機の上下ゆれ
  }

  if (bird.flying) {
    wingFlap = Math.sin(t * 22 + bird.phase);
    legTuck = 1;
  }

  const x = bird.x;
  const y = bird.y - hop;

  // 影
  if (!bird.flying) {
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.ellipse(bird.x, bird.y + 3, s * 0.5 * (1 - hop / (s * 2)), s * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.translate(x, y - s * 0.55);
  ctx.rotate((rot + lean) * bird.facing);
  ctx.scale(bird.facing, squash);

  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#4a3c2a';
  ctx.lineJoin = 'round';

  // 脚
  if (legTuck < 0.9) {
    const legLen = s * 0.5 * (1 - legTuck * 0.7);
    ctx.strokeStyle = '#e8933a';
    ctx.lineWidth = 3;
    for (const lx of [-s * 0.14, s * 0.14]) {
      ctx.beginPath();
      ctx.moveTo(lx, s * 0.3);
      ctx.lineTo(lx, s * 0.3 + legLen);
      ctx.lineTo(lx + s * 0.14, s * 0.3 + legLen);
      ctx.stroke();
    }
    ctx.strokeStyle = '#4a3c2a';
    ctx.lineWidth = 2.5;
  }

  // 尾羽
  ctx.fillStyle = bird.color;
  ctx.beginPath();
  ctx.moveTo(-s * 0.42, -s * 0.05);
  ctx.lineTo(-s * 0.78, -s * 0.34);
  ctx.lineTo(-s * 0.62, 0.02 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 体
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.52, s * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // おなか
  ctx.fillStyle = bird.belly;
  ctx.beginPath();
  ctx.ellipse(s * 0.1, s * 0.1, s * 0.3, s * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();

  // 翼
  ctx.save();
  ctx.translate(-s * 0.08, -s * 0.04);
  ctx.rotate(-0.25 - wingFlap * 0.9);
  ctx.fillStyle = bird.color;
  ctx.beginPath();
  ctx.ellipse(-s * 0.16, 0, s * 0.3, s * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 頭
  ctx.fillStyle = bird.color;
  ctx.beginPath();
  ctx.arc(s * 0.38, -s * 0.42, s * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // とさか
  ctx.beginPath();
  ctx.moveTo(s * 0.3, -s * 0.66);
  ctx.quadraticCurveTo(s * 0.36, -s * 0.86, s * 0.48, -s * 0.66);
  ctx.fill();
  ctx.stroke();

  // くちばし（beakOpen で開く）
  ctx.fillStyle = '#f6a623';
  const bx = s * 0.6;
  const by = -s * 0.44;
  const open = beakOpen * s * 0.12;
  ctx.beginPath();
  ctx.moveTo(bx, by - s * 0.07);
  ctx.lineTo(bx + s * 0.26, by - open);
  ctx.lineTo(bx, by + s * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bx, by + s * 0.03);
  ctx.lineTo(bx + s * 0.22, by + s * 0.06 + open);
  ctx.lineTo(bx, by + s * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 目とほっぺ
  ctx.fillStyle = '#2c2c2c';
  ctx.beginPath();
  ctx.arc(s * 0.44, -s * 0.5, s * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,140,160,0.55)';
  ctx.beginPath();
  ctx.arc(s * 0.5, -s * 0.36, s * 0.07, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // マーク（汗 / …）
  if (mark === 'sweat') {
    ctx.fillStyle = '#6ec2f0';
    ctx.beginPath();
    ctx.ellipse(x + s * 0.5, y - s * 1.25, s * 0.08, s * 0.13, 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (mark === 'dots') {
    ctx.fillStyle = 'rgba(90,90,90,0.8)';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x + s * 0.35 + i * 8, y - s * 1.3, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ---- 判定ポップアップ ----

const POPUP_LIFE = 0.8;

function drawPopup(ctx, popup, t) {
  const p = clamp((t - popup.start) / POPUP_LIFE, 0, 1);
  if (p >= 1) return;
  ctx.save();
  ctx.globalAlpha = 1 - p;
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  const y = popup.y - p * 34;
  ctx.strokeText(popup.text, popup.x, y);
  ctx.fillStyle = popup.color;
  ctx.fillText(popup.text, popup.x, y);
  ctx.restore();
}

// ---- 下画面: タイミングチェックパネル（DS 下画面モチーフ） ----

const TICK_LIFE = 4;
const JUDGE_FLASH = 1.2;

function drawTimingPanel(ctx, panel, t, mode) {
  ctx.fillStyle = '#22304c';
  ctx.fillRect(0, 0, PANEL_W, PANEL_H);
  ctx.fillStyle = '#16203a';
  ctx.fillRect(0, 0, PANEL_W, 4);

  // 見出しとスコア
  ctx.textAlign = 'left';
  ctx.fillStyle = '#9fb3d9';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('タイミングチェック', 18, 26);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(`スコア ${panel.score} / ${panel.maxScore}`, PANEL_W - 20, 32);

  if (mode === 'title') {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c8d6f0';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('リズムに合わせて クリック / スペース / タップ！', PANEL_W / 2, 88);
    return;
  }

  // メーター（中央 = ピッタリ、左 = はやい、右 = おそい）
  const cx = PANEL_W / 2;
  const my = 78;
  const halfW = 330;
  const scale = halfW / WINDOWS.bad;
  const zone = (ms, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(cx - ms * scale, my, ms * scale * 2, 26);
  };
  zone(WINDOWS.bad, '#47506b');
  zone(WINDOWS.good, '#4f7d55');
  zone(WINDOWS.perfect, '#d4af37');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - 1.5, my - 8, 3, 42);

  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = '#9fb3d9';
  ctx.textAlign = 'left';
  ctx.fillText('← はやい', cx - halfW, my + 46);
  ctx.textAlign = 'right';
  ctx.fillText('おそい →', cx + halfW, my + 46);
  ctx.textAlign = 'center';
  ctx.fillText('ピッタリ', cx, my - 14);

  // 入力の刻み（新しいものほど濃い）
  for (const tick of panel.ticks) {
    const age = t - tick.at;
    if (age < 0 || age > TICK_LIFE) continue;
    const x = cx + clamp(tick.deltaMs, -WINDOWS.bad, WINDOWS.bad) * scale;
    ctx.globalAlpha = 1 - age / TICK_LIFE;
    ctx.fillStyle = tick.type === 'perfect' ? '#ffd700' : tick.type === 'good' ? '#8be28b' : '#ff7b7b';
    ctx.fillRect(x - 2, my - 5, 4, 36);
    ctx.globalAlpha = 1;
  }

  // 判定カウント
  ctx.textAlign = 'left';
  ctx.font = 'bold 17px sans-serif';
  const counts = panel.counts;
  ctx.fillStyle = '#ffd700';
  ctx.fillText(`◎ ピタッ！ ${counts.perfect}`, 18, PANEL_H - 12);
  ctx.fillStyle = '#8be28b';
  ctx.fillText(`○ まあまあ ${counts.good}`, 190, PANEL_H - 12);
  ctx.fillStyle = '#ff9b9b';
  ctx.fillText(`✕ ミス ${counts.bad + counts.miss}`, 370, PANEL_H - 12);

  // 直近の判定表示
  if (panel.lastJudge) {
    const age = t - panel.lastJudge.at;
    if (age >= 0 && age < JUDGE_FLASH) {
      ctx.globalAlpha = 1 - age / JUDGE_FLASH;
      ctx.textAlign = 'center';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillStyle = panel.lastJudge.color;
      ctx.fillText(panel.lastJudge.text, cx, 40);
      ctx.globalAlpha = 1;
    }
  }
}
