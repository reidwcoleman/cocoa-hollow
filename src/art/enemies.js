// Enemy sprites: slimes, crows, bats, pot-crabs, and the Hollow Queen (bee boss).

import { P, outline, hash2 } from './pixel.js';
import { RAMP, mix } from './palette.js';

const R = RAMP;

/* ---------------- Slime ---------------- */
export function slimeFrame(variant, frame) {
  const p = new P(20, 18);
  const G = [R.toxic, R.wisp, R.ruby, R.ghost][variant % 4];
  // squash-stretch cycle
  const sq = [0, 1, 2, 1][frame % 4];
  const w = 8 + sq, h = 7 - sq;
  const cy = 12 - (frame % 4 === 2 ? 2 : 0);

  p.ellipse(10, cy, w, h, G[1]);
  p.ellipse(10, cy - 1, w - 1, h - 1, G[2]);
  p.ellipse(8, cy - 3, w - 4, Math.max(1, h - 4), G[3]);
  p.ellipse(7, cy - 4, 2, 1, G[4]);
  // jelly base
  p.rect(10 - w, cy + h - 2, w * 2, 2, G[0]);
  // eyes
  p.rect(6, cy - 2, 2, 3, R.void[0]);
  p.rect(12, cy - 2, 2, 3, R.void[0]);
  p.px(6, cy - 2, '#ffffff'); p.px(12, cy - 2, '#ffffff');
  // mouth
  p.hline(9, cy + 2, 3, R.void[0]);
  p.px(8, cy + 1, R.void[0]); p.px(12, cy + 1, R.void[0]);
  // inner core sparkle
  p.px(10, cy, G[4]);
  outline(p.canvas, '#07060e');
  return p.canvas;
}

/* ---------------- Crow ---------------- */
export function crowFrame(frame) {
  const p = new P(20, 18);
  const B = R.ink, K = R.wisp;
  const flap = [0, -3, -5, -3][frame % 4];
  // body
  p.ellipse(10, 11, 5, 4, B[2]);
  p.ellipse(9, 10, 4, 3, B[3]);
  // tail
  p.rect(14, 10, 5, 2, B[2]);
  p.px(19, 11, B[1]);
  // head
  p.circle(6, 7, 3, B[2]);
  p.circle(5, 6, 2, B[3]);
  // beak
  p.rect(2, 7, 3, 2, R.lamp[2]);
  p.px(1, 8, R.lamp[1]);
  // eye — glowing
  p.px(5, 6, R.ember[4]); p.px(6, 6, R.ember[3]);
  // wings
  for (let i = 0; i < 8; i++) {
    p.rect(7 + i, 8 + flap + Math.round(i * 0.35), 2, 3, B[i < 4 ? 3 : 2]);
  }
  p.rect(8, 7 + flap, 6, 2, B[3]);
  // spectral wisp trail
  p.px(16, 9, K[2]); p.px(18, 8, K[1]);
  // legs
  p.rect(9, 14, 1, 2, R.lamp[1]); p.rect(12, 14, 1, 2, R.lamp[1]);
  outline(p.canvas, '#07060e');
  return p.canvas;
}

/* ---------------- Bat ---------------- */
export function batFrame(frame) {
  const p = new P(22, 14);
  const B = R.plum;
  const f = [0, -2, 0, 2][frame % 4];
  p.ellipse(11, 8, 3, 3, B[2]);
  p.ellipse(10, 7, 2, 2, B[3]);
  // ears
  p.px(9, 4, B[2]); p.px(9, 3, B[2]); p.px(13, 4, B[2]); p.px(13, 3, B[2]);
  // eyes
  p.px(9, 7, R.ember[4]); p.px(12, 7, R.ember[4]);
  // wings
  for (let i = 0; i < 8; i++) {
    const yy = 6 + f * (i / 8) - Math.round(Math.sin(i / 7 * Math.PI) * 2);
    p.rect(8 - i, yy, 2, 3 + Math.round(Math.sin(i / 7 * Math.PI) * 2), B[2]);
    p.rect(13 + i, yy, 2, 3 + Math.round(Math.sin(i / 7 * Math.PI) * 2), B[2]);
    p.px(8 - i, yy, B[3]); p.px(14 + i, yy, B[3]);
  }
  outline(p.canvas, '#07060e');
  return p.canvas;
}

/* ---------------- Pot crab ---------------- */
export function potCrabFrame(frame) {
  const p = new P(24, 20);
  const f = frame % 4;
  const bob = [0, -1, 0, 1][f];
  // clay pot shell
  p.ellipse(12, 11 + bob, 9, 6, R.caramel[1]);
  p.ellipse(12, 10 + bob, 9, 6, R.caramel[2]);
  p.ellipse(10, 8 + bob, 6, 3, R.caramel[3]);
  p.rect(3, 6 + bob, 18, 2, R.caramel[3]);
  p.rect(3, 5 + bob, 18, 1, R.caramel[4]);
  for (let i = 0; i < 5; i++) p.hline(4, 9 + i * 2 + bob, 16, R.caramel[1]);
  // crack + glow
  p.line(9, 8 + bob, 12, 14 + bob, R.ember[2]);
  p.px(10, 10 + bob, R.ember[4]);
  // eyes on stalks
  p.vline(8, 2 + bob, 4, R.ruby[2]); p.vline(15, 2 + bob, 4, R.ruby[2]);
  p.circle(8, 2 + bob, 1, R.void[0]); p.circle(15, 2 + bob, 1, R.void[0]);
  p.px(8, 2 + bob, '#ffffff'); p.px(15, 2 + bob, '#ffffff');
  // claws
  const ca = f === 1 ? 1 : f === 3 ? -1 : 0;
  p.rect(0, 10 + ca, 5, 4, R.ruby[2]);
  p.rect(0, 10 + ca, 5, 1, R.ruby[3]);
  p.rect(19, 10 - ca, 5, 4, R.ruby[2]);
  p.rect(19, 10 - ca, 5, 1, R.ruby[3]);
  // legs
  for (let i = 0; i < 3; i++) {
    p.rect(5 + i * 4, 16 + bob, 1, 3, R.ruby[1]);
    p.rect(13 + i * 3, 16 + bob, 1, 3, R.ruby[1]);
  }
  outline(p.canvas, '#07060e');
  return p.canvas;
}

/* ---------------- Wisp (ranged caster) ---------------- */
export function wispFrame(frame) {
  const p = new P(16, 16);
  const G = R.wisp;
  const f = frame % 4;
  const r = 4 + (f % 2);
  p.circle(8, 8, r + 2, mix(G[1], '#000000', 0.3));
  p.circle(8, 8, r, G[2]);
  p.circle(8, 8, r - 2, G[3]);
  p.circle(7, 7, 1, G[4]);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + f * 0.4;
    p.px(8 + Math.cos(a) * (r + 3), 8 + Math.sin(a) * (r + 3), G[3]);
  }
  return p.canvas;
}

/* ---------------- Boss: the Hollow Queen ---------------- */
export function beeBossFrame(frame) {
  const p = new P(64, 56);
  const f = frame % 4;
  const bob = [0, -2, -3, -2][f];
  const Y = R.lamp, K = R.ink;
  const cx = 32, cy = 30 + bob;

  // wings (behind)
  const wf = f % 2 ? 4 : 0;
  for (const s of [-1, 1]) {
    for (let i = 0; i < 18; i++) {
      const t = i / 17;
      const wy = cy - 14 - Math.round(Math.sin(t * Math.PI) * (7 + wf));
      const hgt = 3 + Math.round(Math.sin(t * Math.PI) * (8 + wf));
      p.rect(cx + s * (6 + i), wy, 2, hgt, mix(R.moon[3], R.wisp[2], 0.4));
      p.px(cx + s * (6 + i), wy, R.moon[4]);
    }
  }

  // abdomen (striped)
  p.ellipse(cx, cy + 8, 15, 13, K[1]);
  p.ellipse(cx, cy + 7, 15, 13, Y[2]);
  for (let i = -12; i < 13; i += 6) {
    p.ellipse(cx, cy + 7 + i, 15 - Math.abs(i) * 0.4, 2, K[1]);
  }
  p.ellipse(cx - 5, cy + 1, 6, 4, Y[3]);
  p.ellipse(cx - 6, cy - 1, 3, 2, Y[4]);
  // fuzz
  for (let i = 0; i < 40; i++) {
    const a = hash2(i, 1, 3) * Math.PI * 2, rr = 12 + hash2(i, 2, 4) * 4;
    p.px(cx + Math.cos(a) * rr, cy + 7 + Math.sin(a) * rr * 0.85, Y[hash2(i, 3, 5) > 0.5 ? 4 : 1]);
  }
  // stinger
  p.rect(cx - 1, cy + 20, 2, 5, K[2]);
  p.px(cx, cy + 25, R.ruby[3]);

  // thorax
  p.ellipse(cx, cy - 8, 11, 9, K[2]);
  p.ellipse(cx - 3, cy - 11, 6, 4, K[3]);
  for (let i = 0; i < 30; i++) {
    const a = hash2(i, 7, 3) * Math.PI * 2, rr = 8 + hash2(i, 8, 4) * 3;
    p.px(cx + Math.cos(a) * rr, cy - 8 + Math.sin(a) * rr * 0.85, hash2(i, 9, 5) > 0.5 ? Y[3] : K[3]);
  }

  // head + crown
  p.ellipse(cx, cy - 20, 9, 7, K[2]);
  p.ellipse(cx - 3, cy - 22, 5, 3, K[3]);
  // compound eyes, glowing
  p.ellipse(cx - 5, cy - 20, 3, 4, R.ember[2]);
  p.ellipse(cx + 5, cy - 20, 3, 4, R.ember[2]);
  p.ellipse(cx - 5, cy - 21, 2, 2, R.ember[4]);
  p.ellipse(cx + 5, cy - 21, 2, 2, R.ember[4]);
  // mandibles
  p.rect(cx - 3, cy - 15, 2, 3, R.moon[2]);
  p.rect(cx + 2, cy - 15, 2, 3, R.moon[2]);
  // antennae
  p.line(cx - 4, cy - 26, cx - 9, cy - 33, K[2]);
  p.line(cx + 4, cy - 26, cx + 9, cy - 33, K[2]);
  p.circle(cx - 9, cy - 34, 1, Y[3]); p.circle(cx + 9, cy - 34, 1, Y[3]);
  // crown
  for (let i = -6; i <= 6; i += 3) {
    p.rect(cx + i, cy - 30, 2, 4, R.gold[3]);
    p.px(cx + i, cy - 31, R.gold[4]);
  }
  p.rect(cx - 7, cy - 27, 15, 2, R.gold[2]);
  p.px(cx, cy - 26, R.ruby[3]);

  // legs
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      p.line(cx + s * 8, cy - 6 + i * 4, cx + s * 16, cy + 2 + i * 5, K[2]);
      p.line(cx + s * 16, cy + 2 + i * 5, cx + s * 14, cy + 8 + i * 5, K[1]);
    }
  }

  outline(p.canvas, '#07060e');
  return { canvas: p.canvas, light: [cx, cy - 20, 40] };
}

/* ---------------- projectiles / effects ---------------- */
export function stingerProj() {
  const p = new P(10, 10);
  p.ellipse(5, 5, 4, 2, R.lamp[2]);
  p.ellipse(5, 5, 3, 1, R.lamp[4]);
  p.rect(8, 4, 2, 2, R.ink[2]);
  return p.canvas;
}

export function orbProj(col = 'wisp') {
  const p = new P(10, 10);
  const G = R[col];
  p.circle(5, 5, 4, G[1]);
  p.circle(5, 5, 3, G[2]);
  p.circle(5, 5, 2, G[3]);
  p.circle(4, 4, 1, G[4]);
  return p.canvas;
}

export function arrowProj() {
  const p = new P(14, 6);
  p.rect(0, 2, 10, 1, R.oak[2]);
  p.rect(0, 3, 10, 1, R.oak[1]);
  p.rect(10, 1, 3, 3, R.moon[3]);
  p.px(13, 2, R.moon[4]);
  p.px(0, 1, R.cream[3]); p.px(1, 1, R.cream[2]);
  p.px(0, 4, R.cream[3]); p.px(1, 4, R.cream[2]);
  return p.canvas;
}

/** Sword slash arc — 4 frames, drawn at the swing direction. */
export function slashFrames() {
  const out = [];
  for (let f = 0; f < 4; f++) {
    const p = new P(34, 34);
    const spread = 1.5;
    const start = -spread / 2 - 0.25 + f * 0.28;
    const alphaR = [R.moon[4], R.moon[3], R.moon[2], R.moon[1]][f];
    for (let i = 0; i < 26; i++) {
      const t = i / 25;
      const a = start + t * spread;
      const rad = 13 + Math.sin(t * Math.PI) * 3;
      const x = 17 + Math.cos(a) * rad, y = 17 + Math.sin(a) * rad;
      const thick = 1 + Math.round(Math.sin(t * Math.PI) * 2);
      for (let k = 0; k < thick; k++) {
        p.px(x, y + k, alphaR);
        p.px(x + 1, y + k, f < 2 ? '#ffffff' : R.moon[3]);
      }
    }
    out.push(p.canvas);
  }
  return out;
}
