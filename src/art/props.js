// Buildings, scenery, furniture, and item icons.
// All hand-composed pixel art generated at load time.

import { P, makeCanvas, outline, hash2, fnoise, crop } from './pixel.js';
import { RAMP, mix, C } from './palette.js';

const R = RAMP;

/* ================================================================== *
 * TOWN BUILDINGS
 * ================================================================== */

/**
 * Gothic snow-capped townhouse.
 * opts: { w, h, wall, roof, windows, chimneys, sign, door, storeys }
 */
export function townhouse(opts = {}) {
  const w = opts.w || 64, bodyH = opts.h || 48;
  const roofH = opts.roofH || Math.round(w * 0.42);
  const H = bodyH + roofH + 6;
  const p = new P(w, H);
  const WALL = R[opts.wall || 'cream'];
  const ROOF = R[opts.roof || 'brick'];
  const TRIM = R[opts.trim || 'wood'];
  const seed = opts.seed || 3;
  const top = roofH + 4;

  /* ---- body ---- */
  p.rect(0, top, w, bodyH, WALL[2]);
  p.rect(0, top, 1, bodyH, WALL[1]);
  p.rect(w - 1, top, 1, bodyH, WALL[1]);
  p.rect(1, top, w - 2, 1, WALL[3]);
  // plaster grain
  for (let y = top; y < top + bodyH; y++)
    for (let x = 0; x < w; x++)
      if (hash2(x, y, seed) > 0.9) p.px(x, y, WALL[hash2(x, y, seed + 1) > 0.5 ? 3 : 1]);
  // shadow gradient at base
  p.rect(0, top + bodyH - 4, w, 4, mix(WALL[1], R.night[1], 0.35));
  p.rect(0, top + bodyH - 2, w, 2, mix(WALL[0], R.night[0], 0.5));

  /* ---- half-timber framing ---- */
  const beams = opts.timber !== false;
  if (beams) {
    p.rect(0, top, 3, bodyH, TRIM[2]);
    p.rect(w - 3, top, 3, bodyH, TRIM[2]);
    p.rect(0, top, 3, bodyH, TRIM[2]);
    p.rect(1, top, 1, bodyH, TRIM[3]);
    p.rect(w - 2, top, 1, bodyH, TRIM[1]);
    const mid = top + Math.round(bodyH * 0.55);
    p.rect(0, mid, w, 3, TRIM[2]);
    p.rect(0, mid, w, 1, TRIM[3]);
    p.rect(0, mid + 2, w, 1, TRIM[1]);
    // diagonal braces
    for (let i = 0; i < 10; i++) {
      p.px(4 + i, mid - 4 - i, TRIM[2]); p.px(5 + i, mid - 4 - i, TRIM[2]);
      p.px(w - 5 - i, mid - 4 - i, TRIM[2]); p.px(w - 6 - i, mid - 4 - i, TRIM[2]);
    }
  }

  /* ---- windows ---- */
  const winList = opts.windows || [[Math.round(w * 0.22), top + 8], [Math.round(w * 0.66), top + 8]];
  const lights = [];
  for (const [wx, wy] of winList) {
    gothicWindow(p, wx, wy, opts.winW || 12, opts.winH || 16, opts.lit !== false);
    lights.push([wx + (opts.winW || 12) / 2, wy + (opts.winH || 16) / 2, 34, opts.lit !== false]);
  }

  /* ---- door ---- */
  if (opts.door !== false) {
    const dx = opts.doorX != null ? opts.doorX : Math.round(w / 2 - 7);
    const dy = top + bodyH - 22;
    doorArched(p, dx, dy, 14, 22, TRIM);
    lights.push([dx + 7, dy + 4, 20, true]);
  }

  /* ---- roof ---- */
  const eaves = 3;
  for (let i = 0; i < roofH; i++) {
    const inset = Math.round((i / roofH) * (w / 2 - 2));
    const x0 = inset - eaves, len = w - inset * 2 + eaves * 2;
    const shade = i < 2 ? 3 : i < roofH * 0.5 ? 2 : 1;
    p.rect(x0, top - i + 3, len, 1, ROOF[shade]);
    // shingle notches
    if (i % 3 === 0) for (let s = 0; s < len; s += 5)
      p.px(x0 + s + (i % 6 === 0 ? 2 : 0), top - i + 3, ROOF[Math.max(0, shade - 1)]);
  }
  // snow on the roof
  for (let i = 0; i < roofH; i++) {
    const inset = Math.round((i / roofH) * (w / 2 - 2));
    const x0 = inset - eaves, len = w - inset * 2 + eaves * 2;
    const yy = top - i + 3;
    const cover = fnoise(i / 4, seed, 5);
    if (i > roofH * 0.25 && cover > 0.34) {
      const l = Math.round(len * Math.min(1, (cover - 0.2) * 2.2));
      p.rect(x0 + ((len - l) >> 1), yy, l, 1, R.snow[i > roofH * 0.6 ? 4 : 3]);
    }
  }
  // ridge cap + icicles
  p.rect(Math.round(w / 2 - 3), top - roofH + 3, 6, 2, R.snow[4]);
  for (let x = 0; x < w; x += 3) {
    if (hash2(x, seed, 17) > 0.55) {
      const len = 2 + ((hash2(x, seed, 18) * 3) | 0);
      p.vline(x, top + 3, len, R.moon[2]);
      p.px(x, top + 3 + len, R.moon[3]);
    }
  }
  // eave board
  p.rect(-eaves, top + 2, w + eaves * 2, 2, TRIM[1]);
  p.rect(-eaves, top + 2, w + eaves * 2, 1, TRIM[3]);

  /* ---- chimneys ---- */
  const chims = opts.chimneys || [Math.round(w * 0.7)];
  const smokes = [];
  for (const cx of chims) {
    const ch = 12 + ((hash2(cx, seed, 23) * 6) | 0);
    const cy = top - Math.round(roofH * 0.55) - ch + 6;
    p.rect(cx, cy, 9, ch, R.brick[2]);
    p.rect(cx, cy, 1, ch, R.brick[3]);
    p.rect(cx + 8, cy, 1, ch, R.brick[1]);
    for (let by = cy + 2; by < cy + ch; by += 3) {
      p.hline(cx, by, 9, R.brick[1]);
      p.px(cx + ((by % 6 === 0) ? 3 : 6), by + 1, R.brick[1]);
    }
    p.rect(cx - 1, cy - 2, 11, 2, R.brick[3]);
    p.rect(cx - 1, cy - 3, 11, 1, R.snow[4]);
    p.rect(cx + 1, cy - 1, 7, 1, R.void[0]);
    smokes.push([cx + 4, cy - 4]);
  }

  outline(p.canvas, '#07060e');
  return { canvas: p.canvas, lights, smokes, groundY: top + bodyH };
}

/** Gothic arched window with warm interior glow. */
export function gothicWindow(p, x, y, w, h, lit) {
  const frame = R.wood;
  const glass = lit ? R.lamp : R.night;
  // stone surround
  p.rect(x - 2, y - 3, w + 4, h + 5, R.stone[2]);
  p.rect(x - 2, y - 3, w + 4, 1, R.stone[3]);
  p.rect(x - 2, y + h + 1, w + 4, 1, R.stone[1]);
  // arch
  for (let i = 0; i < 4; i++) {
    const inset = 4 - i;
    p.rect(x - 2 + inset, y - 6 + i, w + 4 - inset * 2, 1, R.stone[2]);
  }
  // glass
  p.rect(x, y, w, h, glass[lit ? 2 : 1]);
  for (let i = 0; i < 3; i++)
    p.rect(x, y - 3 + i, w - (3 - i) * 2 + (3 - i) * 2, 0, glass[2]);
  // arch glass
  for (let i = 0; i < 3; i++) {
    const inset = 3 - i;
    p.rect(x + inset, y - 3 + i, w - inset * 2, 1, glass[lit ? 2 : 1]);
  }
  if (lit) {
    p.rect(x + 1, y + 1, w - 2, Math.round(h * 0.4), glass[3]);
    p.rect(x + 2, y + 2, 3, 3, glass[4]);
  } else {
    p.rect(x + 1, y + 1, w - 2, 3, glass[2]);
  }
  // mullions
  p.vline(x + ((w / 2) | 0), y - 3, h + 3, frame[2]);
  p.hline(x, y + ((h / 2) | 0), w, frame[2]);
  p.frame(x - 1, y - 1, w + 2, h + 2, frame[2]);
  // snow on the sill
  p.rect(x - 3, y + h + 1, w + 6, 2, R.wood[2]);
  p.rect(x - 3, y + h, w + 6, 1, R.snow[4]);
}

/** Arched wooden door. */
export function doorArched(p, x, y, w, h, TRIM) {
  p.rect(x - 2, y - 2, w + 4, h + 2, R.stone[2]);
  p.rect(x - 2, y - 2, w + 4, 1, R.stone[3]);
  for (let i = 0; i < 4; i++) p.rect(x - 2 + (4 - i), y - 5 + i, w + 4 - (4 - i) * 2, 1, R.stone[2]);
  p.rect(x, y, w, h, TRIM[2]);
  for (let i = 0; i < 3; i++) p.rect(x + (3 - i), y - 3 + i, w - (3 - i) * 2, 1, TRIM[2]);
  // planks
  for (let px2 = x + 2; px2 < x + w; px2 += 4) p.vline(px2, y - 2, h + 2, TRIM[1]);
  p.rect(x, y, 1, h, TRIM[3]);
  p.hline(x, y + 4, w, TRIM[1]);
  p.hline(x, y + h - 6, w, TRIM[1]);
  // handle + hinges
  p.px(x + w - 4, y + Math.round(h / 2), R.gold[3]);
  p.px(x + w - 3, y + Math.round(h / 2), R.gold[2]);
  p.rect(x + 1, y + 3, 3, 1, R.stone[3]);
  p.rect(x + 1, y + h - 7, 3, 1, R.stone[3]);
}

/**
 * The player's haunted castle chocolate shop. Big, ornate, warm windows.
 */
export function castleShop() {
  const w = 148, H = 152;
  const p = new P(w, H);
  const ST = R.brick, ROOF = R.plum;
  const baseY = H - 6;
  const bodyTop = 56;

  /* --- main block --- */
  p.rect(14, bodyTop, w - 28, baseY - bodyTop, ST[2]);
  for (let y = bodyTop; y < baseY; y++)
    for (let x = 14; x < w - 14; x++) {
      const n = fnoise(x / 9, y / 9, 3);
      if (n > 0.62) p.px(x, y, ST[3]);
      else if (n < 0.36) p.px(x, y, ST[1]);
    }
  // stone courses
  for (let y = bodyTop + 5; y < baseY; y += 6) {
    p.hline(14, y, w - 28, ST[1]);
    for (let x = 14 + (((y / 6) | 0) % 2) * 6; x < w - 14; x += 12) p.vline(x, y - 5, 5, ST[1]);
  }
  p.rect(14, bodyTop, 2, baseY - bodyTop, ST[3]);
  p.rect(w - 16, bodyTop, 2, baseY - bodyTop, ST[0]);
  p.rect(14, baseY - 6, w - 28, 6, mix(ST[0], R.night[0], 0.4));

  /* --- side towers --- */
  const lights = [], smokes = [];
  for (const tx of [10, w - 34]) {
    const ty = 30, th = baseY - ty;
    p.rect(tx, ty, 24, th, ST[2]);
    p.rect(tx, ty, 2, th, ST[3]);
    p.rect(tx + 22, ty, 2, th, ST[0]);
    for (let y = ty + 4; y < baseY; y += 6) {
      p.hline(tx, y, 24, ST[1]);
      for (let x = tx + (((y / 6) | 0) % 2) * 6; x < tx + 24; x += 12) p.vline(x, y - 4, 4, ST[1]);
    }
    // crenellations
    for (let i = 0; i < 24; i += 6) {
      p.rect(tx + i, ty - 5, 4, 5, ST[3]);
      p.rect(tx + i, ty - 6, 4, 1, R.snow[4]);
    }
    p.rect(tx - 2, ty - 1, 28, 2, ST[3]);
    p.rect(tx - 2, ty - 2, 28, 1, R.snow[3]);
    // conical roof above tower
    for (let i = 0; i < 20; i++) {
      const inset = Math.round((i / 20) * 11);
      p.rect(tx + inset, ty - 7 - i, 24 - inset * 2, 1, ROOF[i < 3 ? 3 : i < 10 ? 2 : 1]);
      if (i > 5 && fnoise(i / 3, tx, 9) > 0.45)
        p.rect(tx + inset, ty - 7 - i, Math.max(1, 24 - inset * 2 - 4), 1, R.snow[3]);
    }
    p.vline(tx + 12, ty - 32, 6, R.stone[3]);
    p.rect(tx + 13, ty - 32, 6, 4, R.ruby[3]);   // pennant
    p.rect(tx + 13, ty - 32, 6, 1, R.ruby[4]);
    // tower windows
    for (const wy of [ty + 12, ty + 34]) {
      gothicWindow(p, tx + 8, wy, 8, 12, true);
      lights.push([tx + 12, wy + 6, 30, 1]);
    }
  }

  /* --- gabled roof over main block --- */
  const gTop = 20;
  for (let i = 0; i < bodyTop - gTop; i++) {
    const t = i / (bodyTop - gTop);
    const inset = Math.round(t * (w / 2 - 30));
    const x0 = 30 + (w / 2 - 30 - (w / 2 - 30)) + inset;
    const lenX0 = 22 + inset, len = w - 44 - inset * 2;
    p.rect(lenX0, bodyTop - i, len, 1, ROOF[i < 3 ? 1 : i < 12 ? 2 : 3]);
    if (i % 4 === 0) for (let s = 0; s < len; s += 6) p.px(lenX0 + s, bodyTop - i, ROOF[0]);
  }
  for (let i = 0; i < bodyTop - gTop; i++) {
    const t = i / (bodyTop - gTop);
    const inset = Math.round(t * (w / 2 - 30));
    const lenX0 = 22 + inset, len = w - 44 - inset * 2;
    if (t > 0.2 && fnoise(i / 5, 2, 11) > 0.33)
      p.rect(lenX0 + 1, bodyTop - i, Math.max(1, len - 2), 1, R.snow[t > 0.55 ? 4 : 3]);
  }
  p.rect(w / 2 - 6, gTop, 12, 2, R.snow[4]);
  p.rect(20, bodyTop, w - 40, 3, R.wood[2]);
  p.rect(20, bodyTop, w - 40, 1, R.wood[3]);

  /* --- big dormer / rose window in the gable --- */
  const rx = w / 2, ry = 40;
  p.circle(rx, ry, 11, R.stone[2]);
  p.circle(rx, ry, 9, R.lamp[2]);
  p.circle(rx, ry, 6, R.lamp[3]);
  p.circle(rx, ry, 3, R.lamp[4]);
  for (let a = 0; a < 360; a += 45) {
    const dx = Math.cos(a * Math.PI / 180), dy = Math.sin(a * Math.PI / 180);
    for (let r2 = 3; r2 < 10; r2++) p.px(rx + dx * r2, ry + dy * r2, R.stone[2]);
  }
  p.ring(rx, ry, 10, 10, R.stone[3]);
  lights.push([rx, ry, 46, 1]);

  /* --- shop front: big display windows + door --- */
  const fy = baseY - 40;
  for (const wx of [30, w - 54]) {
    p.rect(wx - 2, fy - 2, 28, 30, R.wood[2]);
    p.rect(wx - 2, fy - 2, 28, 1, R.wood[3]);
    p.rect(wx, fy, 24, 26, R.lamp[2]);
    p.rect(wx + 1, fy + 1, 22, 12, R.lamp[3]);
    p.rect(wx + 2, fy + 2, 6, 4, R.lamp[4]);
    // chocolate display silhouettes in the window
    for (let i = 0; i < 4; i++) {
      const cxp = wx + 3 + i * 5;
      p.rect(cxp, fy + 16, 4, 4, [R.cocoa, R.milk, R.white, R.ruby][i % 4][1]);
      p.px(cxp, fy + 16, [R.cocoa, R.milk, R.white, R.ruby][i % 4][3]);
    }
    p.rect(wx, fy + 20, 24, 2, R.wood[1]);
    p.vline(wx + 12, fy, 26, R.wood[2]);
    p.hline(wx, fy + 13, 24, R.wood[2]);
    p.rect(wx - 3, fy + 26, 30, 3, R.wood[1]);
    p.rect(wx - 3, fy + 25, 30, 1, R.snow[4]);
    lights.push([wx + 12, fy + 13, 42, 1]);
  }
  // door
  doorArched(p, w / 2 - 9, baseY - 30, 18, 30, R.wood);
  lights.push([w / 2, baseY - 26, 30, 1]);
  // steps
  p.rect(w / 2 - 14, baseY - 1, 28, 2, R.stone[2]);
  p.rect(w / 2 - 17, baseY + 1, 34, 2, R.stone[1]);
  p.rect(w / 2 - 14, baseY - 2, 28, 1, R.snow[3]);

  /* --- hanging shop sign --- */
  const sx = w / 2 + 30, sy = baseY - 52;
  p.rect(sx, sy, 2, 8, R.stone[2]);
  p.rect(sx - 14, sy + 8, 18, 2, R.wood[2]);
  p.rect(sx - 16, sy + 10, 22, 14, R.wood[2]);
  p.rect(sx - 16, sy + 10, 22, 1, R.wood[3]);
  p.frame(sx - 16, sy + 10, 22, 14, R.gold[2]);
  // little cocoa bean glyph
  p.ellipse(sx - 5, sy + 17, 5, 3, R.cocoa[3]);
  p.ellipse(sx - 6, sy + 16, 3, 2, R.cocoa[4]);
  p.hline(sx - 9, sy + 17, 9, R.cocoa[1]);
  lights.push([sx - 5, sy + 17, 22, 1]);

  /* --- wall lanterns flanking the door --- */
  for (const lx of [w / 2 - 22, w / 2 + 22]) {
    const ly = baseY - 36;
    p.rect(lx, ly, 1, 6, R.ink[2]);
    p.rect(lx - 3, ly + 6, 7, 8, R.ink[2]);
    p.rect(lx - 2, ly + 7, 5, 6, R.lamp[3]);
    p.rect(lx - 1, ly + 8, 3, 3, R.lamp[4]);
    p.rect(lx - 4, ly + 14, 9, 1, R.ink[2]);
    lights.push([lx, ly + 10, 40, 1]);
  }

  /* --- chimneys --- */
  for (const cx of [34, w - 44]) {
    const ch = 20, cy = 12;
    p.rect(cx, cy, 11, ch + 20, R.brick[2]);
    p.rect(cx, cy, 2, ch + 20, R.brick[3]);
    p.rect(cx + 9, cy, 2, ch + 20, R.brick[0]);
    for (let by = cy + 3; by < cy + ch + 20; by += 4) p.hline(cx, by, 11, R.brick[1]);
    p.rect(cx - 1, cy - 3, 13, 3, R.brick[3]);
    p.rect(cx - 1, cy - 4, 13, 1, R.snow[4]);
    p.rect(cx + 2, cy - 2, 7, 2, R.void[0]);
    smokes.push([cx + 5, cy - 5]);
  }

  outline(p.canvas, '#07060e');
  return { canvas: p.canvas, lights, smokes, groundY: baseY };
}

/* ================================================================== *
 * SCENERY
 * ================================================================== */

export function pineTree(size = 1, snowy = true, seed = 1) {
  const w = Math.round(34 * size), h = Math.round(62 * size);
  const p = new P(w, h);
  const cx = w >> 1;
  // trunk
  p.rect(cx - 2, h - 14, 5, 14, R.bark[1]);
  p.rect(cx - 2, h - 14, 2, 14, R.bark[2]);
  p.rect(cx + 2, h - 14, 1, 14, R.bark[0]);
  // roots
  p.rect(cx - 5, h - 3, 11, 3, R.bark[1]);
  // layered boughs
  const tiers = 5;
  for (let t = 0; t < tiers; t++) {
    const ty = h - 16 - t * Math.round((h - 22) / tiers);
    const rad = Math.round((w / 2 - 1) * (1 - t / tiers) * 0.95) + 2;
    for (let i = 0; i < 10; i++) {
      const yy = ty - i;
      const rr = Math.max(1, Math.round(rad * (1 - i / 11)));
      const shade = i < 3 ? 1 : i < 6 ? 2 : 3;
      p.rect(cx - rr, yy, rr * 2 + 1, 1, R.pine[shade]);
    }
    // needle jags along the bottom edge
    for (let x = -rad; x <= rad; x += 2)
      if (hash2(x, t + seed, 5) > 0.4) p.px(cx + x, ty + 1, R.pine[1]);
    if (snowy) {
      for (let i = 3; i < 9; i++) {
        const yy = ty - i;
        const rr = Math.max(1, Math.round(rad * (1 - i / 11)));
        if (fnoise(i / 2, t + seed, 7) > 0.42)
          p.rect(cx - rr + 1, yy, Math.max(1, rr * 2 - 1), 1, R.snow[i > 6 ? 4 : 3]);
      }
      for (let x = -rad; x <= rad; x += 3)
        if (hash2(x, t + seed, 8) > 0.55) p.px(cx + x, ty - 2, R.snow[4]);
    }
  }
  // tip
  p.vline(cx, 1, 4, R.pine[3]);
  if (snowy) p.px(cx, 1, R.snow[4]);
  outline(p.canvas, '#06050c');
  return p.canvas;
}

export function bareTree(seed = 1) {
  const w = 40, h = 58;
  const p = new P(w, h);
  const cx = w >> 1;
  p.rect(cx - 3, h - 30, 7, 30, R.bark[1]);
  p.rect(cx - 3, h - 30, 2, 30, R.bark[2]);
  p.rect(cx + 3, h - 30, 1, 30, R.bark[0]);
  p.rect(cx - 6, h - 3, 13, 3, R.bark[1]);
  // gnarled branches
  function branch(x, y, ang, len, thick) {
    if (len < 3) return;
    let bx = x, by = y;
    for (let i = 0; i < len; i++) {
      bx += Math.cos(ang); by += Math.sin(ang);
      for (let t = 0; t < thick; t++) p.px(bx + t, by, R.bark[2]);
      p.px(bx, by, R.bark[3]);
      ang += (hash2(i, seed + len, 9) - 0.5) * 0.35;
    }
    if (len > 6) {
      branch(bx, by, ang - 0.6, Math.round(len * 0.6), Math.max(1, thick - 1));
      branch(bx, by, ang + 0.6, Math.round(len * 0.6), Math.max(1, thick - 1));
    }
  }
  branch(cx, h - 30, -Math.PI / 2, 14, 3);
  branch(cx - 1, h - 24, -Math.PI / 2 - 0.9, 10, 2);
  branch(cx + 2, h - 26, -Math.PI / 2 + 0.9, 10, 2);
  // snow on the upper sides of branches
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const im = p.x.getImageData(x, y, 1, 1).data;
      if (im[3] > 0 && hash2(x, y, 12) > 0.72) p.px(x, y - 1, R.snow[3]);
    }
  outline(p.canvas, '#06050c');
  return p.canvas;
}

export function lampPost() {
  const p = new P(14, 46);
  p.rect(6, 8, 2, 34, R.ink[2]);
  p.rect(6, 8, 1, 34, R.ink[3]);
  p.rect(3, 42, 8, 3, R.ink[2]);
  p.rect(3, 41, 8, 1, R.ink[3]);
  p.rect(2, 44, 10, 2, R.ink[1]);
  // decorative curls
  p.px(4, 14, R.ink[2]); p.px(3, 15, R.ink[2]); p.px(9, 14, R.ink[2]); p.px(10, 15, R.ink[2]);
  // lantern housing
  p.rect(2, 2, 10, 2, R.ink[3]);
  p.rect(3, 0, 8, 2, R.ink[2]);
  p.px(7, -1, R.ink[3]);
  p.rect(3, 4, 8, 8, R.ink[2]);
  p.rect(4, 4, 6, 8, R.lamp[3]);
  p.rect(5, 5, 4, 5, R.lamp[4]);
  p.rect(6, 6, 2, 2, '#fffbe6');
  p.vline(6, 4, 8, R.ink[2]); p.vline(9, 4, 8, R.ink[2]);
  p.rect(2, 12, 10, 2, R.ink[3]);
  p.rect(3, 11, 8, 1, R.snow[4]);
  p.rect(2, 1, 10, 1, R.snow[4]);
  outline(p.canvas, '#06050c');
  return { canvas: p.canvas, light: [7, 8, 62] };
}

export function fountain() {
  const p = new P(46, 40);
  // basin
  p.ellipse(23, 30, 22, 9, R.stone[1]);
  p.ellipse(23, 29, 22, 9, R.stone[2]);
  p.ellipse(23, 29, 19, 7, R.night[1]);
  p.ellipse(23, 29, 17, 6, R.night[2]);
  for (let i = 0; i < 22; i++) {
    const a = i / 22 * Math.PI * 2;
    p.px(23 + Math.cos(a) * 20, 29 + Math.sin(a) * 8, R.stone[3]);
  }
  p.ellipse(23, 27, 8, 3, R.moon[1]);   // moon reflection
  // frozen pillar
  p.rect(20, 12, 6, 16, R.stone[2]);
  p.rect(20, 12, 2, 16, R.stone[3]);
  p.ellipse(23, 12, 9, 3, R.stone[2]);
  p.ellipse(23, 11, 9, 3, R.stone[3]);
  p.ellipse(23, 10, 6, 2, R.snow[4]);
  // icicles under the bowl
  for (let x = 15; x < 32; x += 3) p.vline(x, 14, 2 + ((hash2(x, 1, 3) * 4) | 0), R.moon[2]);
  // top ornament
  p.rect(21, 4, 4, 6, R.stone[2]);
  p.circle(23, 3, 3, R.moon[2]);
  p.circle(22, 2, 2, R.moon[3]);
  p.rect(19, 28, 8, 1, R.snow[4]);
  outline(p.canvas, '#06050c');
  return { canvas: p.canvas, light: [23, 4, 34] };
}

export function barrel(seed = 1) {
  const p = new P(16, 20);
  p.rect(2, 3, 12, 16, R.oak[2]);
  p.rect(2, 3, 2, 16, R.oak[3]);
  p.rect(12, 3, 2, 16, R.oak[1]);
  for (let x = 4; x < 13; x += 3) p.vline(x, 3, 16, R.oak[1]);
  p.rect(1, 6, 14, 2, R.stone[2]);
  p.rect(1, 14, 14, 2, R.stone[2]);
  p.rect(1, 6, 14, 1, R.stone[3]);
  p.ellipse(8, 3, 6, 2, R.oak[3]);
  p.ellipse(8, 2, 6, 2, R.snow[4]);
  outline(p.canvas, '#06050c');
  return p.canvas;
}

export function crate() {
  const p = new P(16, 16);
  p.rect(1, 2, 14, 13, R.oak[2]);
  p.frame(1, 2, 14, 13, R.oak[1]);
  p.rect(1, 2, 14, 1, R.oak[3]);
  p.line(2, 3, 13, 13, R.oak[1]);
  p.line(13, 3, 2, 13, R.oak[1]);
  p.rect(1, 1, 14, 1, R.snow[4]);
  outline(p.canvas, '#06050c');
  return p.canvas;
}

export function fencePost() {
  const p = new P(16, 20);
  p.rect(6, 4, 4, 16, R.wood[2]);
  p.rect(6, 4, 1, 16, R.wood[3]);
  p.rect(0, 8, 16, 3, R.wood[2]);
  p.rect(0, 8, 16, 1, R.wood[3]);
  p.rect(0, 14, 16, 2, R.wood[2]);
  p.rect(0, 7, 16, 1, R.snow[4]);
  p.rect(6, 3, 4, 1, R.snow[4]);
  outline(p.canvas, '#06050c');
  return p.canvas;
}

export function gravestone(seed = 1) {
  const p = new P(16, 22);
  p.rect(3, 6, 10, 15, R.stone[2]);
  for (let i = 0; i < 4; i++) p.rect(3 + (4 - i), 2 + i, 10 - (4 - i) * 2, 1, R.stone[2]);
  p.rect(3, 6, 1, 15, R.stone[3]);
  p.rect(12, 6, 1, 15, R.stone[0]);
  for (let k = 0; k < 6; k++)
    p.px(4 + ((hash2(k, seed, 3) * 8) | 0), 8 + ((hash2(k, seed, 4) * 11) | 0), R.stone[1]);
  p.hline(5, 11, 6, R.stone[1]); p.hline(5, 14, 5, R.stone[1]); p.hline(5, 17, 6, R.stone[1]);
  p.rect(2, 20, 12, 2, R.snow[3]);
  p.rect(3, 1, 10, 1, R.snow[4]);
  outline(p.canvas, '#06050c');
  return p.canvas;
}

export function bush(snowy = true, seed = 1) {
  const p = new P(20, 16);
  p.ellipse(10, 11, 9, 5, R.pine[1]);
  p.ellipse(7, 9, 6, 4, R.pine[2]);
  p.ellipse(13, 10, 5, 4, R.pine[2]);
  p.ellipse(8, 8, 3, 2, R.pine[3]);
  for (let k = 0; k < 14; k++)
    p.px(2 + ((hash2(k, seed, 5) * 16) | 0), 6 + ((hash2(k, seed, 6) * 9) | 0), R.pine[3]);
  if (snowy) {
    p.ellipse(8, 7, 5, 2, R.snow[4]);
    p.ellipse(13, 8, 3, 1, R.snow[3]);
  }
  outline(p.canvas, '#06050c');
  return p.canvas;
}

/** Covered market stall with a striped awning and goods on the table. */
export function marketStall(seed = 1, hue = 'ruby') {
  const p = new P(44, 46);
  const A = R[hue];
  // posts
  p.rect(2, 14, 3, 26, R.oak[1]); p.rect(39, 14, 3, 26, R.oak[1]);
  p.rect(2, 14, 1, 26, R.oak[2]); p.rect(39, 14, 1, 26, R.oak[2]);
  // awning — scalloped stripes
  for (let i = 0; i < 44; i++) {
    const band = ((i / 5) | 0) % 2;
    const drop = 10 + Math.round(Math.sin(i / 43 * Math.PI) * 3);
    p.rect(i, 4, 1, drop, band ? A[2] : R.cream[3]);
    p.px(i, 4, band ? A[3] : R.cream[4]);
    p.px(i, 4 + drop - 1, band ? A[1] : R.cream[2]);
    // scallop tips
    if (i % 5 === 2) p.px(i, 4 + drop, band ? A[1] : R.cream[2]);
  }
  p.rect(0, 2, 44, 2, R.oak[2]);
  p.rect(0, 2, 44, 1, R.snow[4]);
  // table
  p.rect(4, 30, 36, 4, R.oak[2]);
  p.rect(4, 30, 36, 1, R.oak[3]);
  p.rect(4, 34, 36, 2, R.oak[0]);
  // goods
  for (let i = 0; i < 6; i++) {
    const gx = 6 + i * 6, col = [R.cocoa, R.milk, R.ruby, R.caramel, R.white, R.toxic][(i + seed) % 6];
    p.rect(gx, 26, 4, 4, col[2]);
    p.px(gx, 26, col[4]);
    p.px(gx + 3, 29, col[0]);
  }
  // crates underneath
  p.rect(6, 36, 9, 8, R.oak[1]);
  p.frame(6, 36, 9, 8, R.oak[0]);
  p.rect(29, 37, 8, 7, R.oak[1]);
  p.frame(29, 37, 8, 7, R.oak[0]);
  outline(p.canvas, '#06050c');
  return p.canvas;
}

/** Snow-topped park bench. */
export function bench() {
  const p = new P(30, 20);
  p.rect(2, 14, 3, 6, R.ink[2]); p.rect(25, 14, 3, 6, R.ink[2]);
  p.rect(1, 11, 28, 3, R.oak[2]);
  p.rect(1, 11, 28, 1, R.oak[3]);
  p.rect(1, 10, 28, 1, R.snow[4]);
  for (let i = 0; i < 3; i++) {
    p.rect(3, 3 + i * 3, 24, 2, R.oak[2]);
    p.rect(3, 3 + i * 3, 24, 1, R.oak[3]);
  }
  p.rect(2, 2, 2, 12, R.ink[2]); p.rect(26, 2, 2, 12, R.ink[2]);
  p.rect(3, 2, 24, 1, R.snow[4]);
  outline(p.canvas, '#06050c');
  return p.canvas;
}

/** A soft mound of drifted snow — breaks up flat paving. */
export function snowDrift(size = 1, seed = 1) {
  const w = Math.round(30 * size), h = Math.round(12 * size);
  const p = new P(w, h);
  p.ellipse(w / 2, h - 2, w / 2 - 1, h / 2, R.snow[2]);
  p.ellipse(w / 2 - 2, h - 4, w / 2 - 4, h / 2 - 1, R.snow[3]);
  p.ellipse(w / 2 - 3, h - 6, w / 2 - 8, 2, R.snow[4]);
  for (let k = 0; k < 8; k++)
    p.px(2 + ((hash2(k, seed, 3) * (w - 4)) | 0), 3 + ((hash2(k, seed, 4) * (h - 4)) | 0), R.snow[4]);
  return p.canvas;
}

/** Stack of firewood. */
export function woodpile() {
  const p = new P(24, 18);
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 5 - row; i++) {
      const x = 2 + row * 2 + i * 4, y = 12 - row * 4;
      p.ellipse(x + 2, y + 2, 2, 2, R.bark[2]);
      p.ellipse(x + 2, y + 1, 2, 2, R.bark[3]);
      p.px(x + 1, y, R.oak[3]);
    }
  }
  p.rect(2, 14, 20, 3, R.bark[1]);
  p.ellipse(11, 1, 9, 2, R.snow[4]);
  outline(p.canvas, '#06050c');
  return p.canvas;
}

export function rock(size = 1, seed = 1) {
  const w = Math.round(18 * size), h = Math.round(14 * size);
  const p = new P(w, h);
  p.ellipse(w / 2, h - 4, w / 2 - 1, h / 2 - 1, R.stone[1]);
  p.ellipse(w / 2 - 1, h - 5, w / 2 - 3, h / 2 - 3, R.stone[2]);
  p.ellipse(w / 2 - 2, h - 7, w / 2 - 6, 2, R.stone[3]);
  for (let k = 0; k < 6; k++)
    p.px(3 + ((hash2(k, seed, 7) * (w - 6)) | 0), 4 + ((hash2(k, seed, 8) * (h - 6)) | 0), R.stone[0]);
  p.ellipse(w / 2 - 1, h - 9, w / 2 - 4, 1, R.snow[4]);
  outline(p.canvas, '#06050c');
  return p.canvas;
}

/* ================================================================== *
 * SHOP FURNITURE
 * ================================================================== */

/** Display counter. style 0..3 changes the wood + trim. */
export function counter(style = 0) {
  const p = new P(32, 26);
  const WOODS = ['oak', 'wood', 'plum', 'teal'];
  const TRIMS = ['gold', 'gold', 'moon', 'gold'];
  const W = R[WOODS[style % 4]], T = R[TRIMS[style % 4]];
  // glass case top
  p.rect(0, 6, 32, 4, mix(R.moon[2], W[1], 0.55));
  p.rect(0, 6, 32, 1, R.moon[3]);
  p.rect(1, 7, 30, 2, mix(R.night[2], R.moon[1], 0.4));
  for (let x = 2; x < 30; x += 7) p.vline(x, 6, 4, R.moon[3]);
  // body
  p.rect(0, 10, 32, 14, W[2]);
  p.rect(0, 10, 32, 1, W[3]);
  p.rect(0, 23, 32, 2, W[0]);
  p.rect(0, 10, 1, 14, W[3]);
  p.rect(31, 10, 1, 14, W[0]);
  // panels
  for (const px2 of [3, 17]) {
    p.rect(px2, 13, 12, 8, W[1]);
    p.frame(px2, 13, 12, 8, T[2]);
    p.rect(px2 + 1, 14, 10, 1, W[3]);
  }
  p.rect(0, 10, 32, 2, T[2]);
  p.rect(0, 11, 32, 1, T[1]);
  outline(p.canvas, '#06050c');
  return p.canvas;
}

/** Shelf/hutch against a wall. */
export function shelf(style = 0) {
  const p = new P(32, 40);
  const W = R[['oak', 'wood', 'plum'][style % 3]];
  p.rect(0, 0, 32, 40, W[1]);
  p.rect(0, 0, 32, 2, W[3]);
  p.rect(0, 0, 2, 40, W[2]);
  p.rect(30, 0, 2, 40, W[0]);
  for (const sy of [10, 22, 34]) {
    p.rect(2, sy, 28, 2, W[2]);
    p.rect(2, sy, 28, 1, W[3]);
    p.rect(2, sy + 2, 28, 1, W[0]);
  }
  // jars & bowls
  const jars = [[5, 4], [13, 5], [22, 4], [6, 16], [16, 17], [24, 16], [8, 28], [19, 28]];
  jars.forEach(([jx, jy], i) => {
    const col = [R.cocoa, R.milk, R.white, R.ruby, R.caramel, R.toxic][i % 6];
    p.rect(jx, jy, 6, 6, mix(col[2], R.moon[2], 0.25));
    p.rect(jx, jy, 6, 1, R.moon[3]);
    p.rect(jx + 1, jy + 2, 4, 4, col[2]);
    p.px(jx + 1, jy + 2, col[4]);
    p.rect(jx, jy - 1, 6, 1, R.oak[2]);
  });
  outline(p.canvas, '#06050c');
  return p.canvas;
}

/** Bubbling chocolate cauldron. frame 0..3 */
export function cauldron(frame = 0) {
  const p = new P(40, 42);
  const CX = 20;

  // stone hearth ring
  p.ellipse(CX, 38, 17, 5, R.stone[1]);
  p.ellipse(CX, 37, 17, 5, R.stone[2]);
  for (let a = 0; a < 360; a += 30) {
    const rad = a * Math.PI / 180;
    p.ellipse(CX + Math.cos(rad) * 15, 37 + Math.sin(rad) * 4, 3, 2, R.stone[3]);
    p.ellipse(CX + Math.cos(rad) * 15, 36 + Math.sin(rad) * 4, 2, 1, R.stone[4]);
  }

  // fire under the pot
  const fh = [8, 11, 9, 12][frame % 4];
  for (let i = -9; i <= 9; i += 2) {
    const h = fh - Math.abs(i) * 0.55 + ((hash2(i, frame, 3) * 3) | 0);
    if (h <= 0) continue;
    p.rect(CX + i, 34 - h, 2, h, R.flame[1]);
    p.rect(CX + i, 34 - h + 2, 2, Math.max(1, h - 3), R.flame[3]);
    p.px(CX + i, 34 - h + 3, R.flame[4]);
  }

  // iron legs
  for (const lx of [-11, 0, 11]) {
    p.rect(CX + lx - 1, 26, 3, 9, R.ink[2]);
    p.rect(CX + lx - 1, 26, 1, 9, R.ink[3]);
  }

  // pot belly
  p.ellipse(CX, 20, 18, 13, R.ink[1]);
  p.ellipse(CX, 19, 18, 13, R.ink[2]);
  p.ellipse(CX - 6, 15, 9, 6, R.ink[3]);
  p.ellipse(CX - 8, 12, 4, 2, R.ink[4]);
  // rim
  p.rect(1, 9, 38, 4, R.ink[2]);
  p.ellipse(CX, 9, 18, 5, R.ink[3]);
  p.ellipse(CX, 10, 18, 5, R.ink[1]);

  // molten chocolate
  p.ellipse(CX, 9, 15, 4, R.cocoa[1]);
  p.ellipse(CX, 9, 14, 3, R.cocoa[3]);
  p.ellipse(CX - 4, 8, 7, 2, R.milk[2]);
  p.ellipse(CX - 6, 7, 4, 1, R.milk[4]);
  // swirl
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2 + frame * 0.5;
    p.px(CX + Math.cos(a) * 8, 9 + Math.sin(a) * 2, R.milk[3]);
  }
  // bubbles
  const bubs = [[-7, 9], [1, 8], [7, 10], [-2, 10], [11, 8]];
  bubs.forEach(([bx, by], i) => {
    if ((i + frame) % 4 < 2) {
      const lift = (frame + i) % 3;
      p.circle(CX + bx, by - lift, 1, R.milk[4]);
      p.px(CX + bx, by - lift - 1, R.white[4]);
    }
  });

  // handles
  for (let i = 0; i < 8; i++) {
    p.px(2 - Math.round(Math.sin(i / 7 * Math.PI) * 2), 11 + i, R.ink[3]);
    p.px(37 + Math.round(Math.sin(i / 7 * Math.PI) * 2), 11 + i, R.ink[3]);
  }
  // wooden paddle resting in the pot
  p.line(CX + 9, 8, CX + 15, -2, R.oak[2]);
  p.line(CX + 10, 8, CX + 16, -2, R.oak[1]);

  outline(p.canvas, '#06050c');
  return { canvas: p.canvas, light: [CX, 24, 52] };
}

/** Small round cafe table with chocolates on it. */
export function table() {
  const p = new P(26, 22);
  p.ellipse(13, 8, 12, 5, R.oak[1]);
  p.ellipse(13, 7, 12, 5, R.oak[2]);
  p.ellipse(13, 6, 10, 4, R.oak[3]);
  p.rect(11, 10, 4, 9, R.oak[1]);
  p.ellipse(13, 19, 7, 3, R.oak[1]);
  p.ellipse(13, 18, 7, 3, R.oak[2]);
  outline(p.canvas, '#06050c');
  return p.canvas;
}

export function chair(dir = 0) {
  const p = new P(14, 22);
  p.rect(2, 10, 10, 3, R.oak[2]);
  p.rect(2, 10, 10, 1, R.oak[3]);
  if (dir === 0) { p.rect(2, 2, 10, 8, R.oak[1]); p.rect(3, 3, 8, 6, R.oak[2]); }
  p.rect(3, 13, 2, 8, R.oak[1]);
  p.rect(9, 13, 2, 8, R.oak[1]);
  outline(p.canvas, '#06050c');
  return p.canvas;
}

/**
 * One big woven rug drawn as a single floor decal, so the medallion reads as
 * one motif instead of repeating once per tile.
 */
export function rugLarge(w, h) {
  const p = new P(w, h);
  const F = R.rose, G = R.gold, D = R.plum;
  p.rect(0, 0, w, h, F[1]);
  // pile texture
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (hash2(x, y, 301) > 0.82) p.px(x, y, F[2]);
  // borders
  p.frame(0, 0, w, h, F[0]);
  p.frame(2, 2, w - 4, h - 4, G[1]);
  p.frame(3, 3, w - 6, h - 6, G[2]);
  p.frame(6, 6, w - 12, h - 12, D[2]);
  p.frame(7, 7, w - 14, h - 14, G[1]);
  // running key pattern along the border band
  for (let x = 10; x < w - 10; x += 8) {
    p.rect(x, 4, 4, 1, G[3]); p.rect(x, h - 5, 4, 1, G[3]);
  }
  for (let y = 10; y < h - 10; y += 8) {
    p.rect(4, y, 1, 4, G[3]); p.rect(w - 5, y, 1, 4, G[3]);
  }
  // central medallion
  const cx = w >> 1, cy = h >> 1;
  const rx = Math.round(w * 0.27), ry = Math.round(h * 0.30);
  p.ellipse(cx, cy, rx, ry, D[1]);
  p.ellipse(cx, cy, rx - 2, ry - 2, F[2]);
  p.ellipse(cx, cy, rx - 5, ry - 5, D[2]);
  p.ring(cx, cy, rx, ry, G[2]);
  p.ring(cx, cy, rx - 5, ry - 5, G[1]);
  // rosette of petals rather than full spokes — reads as weaving, not a web
  for (let a = 0; a < 360; a += 45) {
    const rad = a * Math.PI / 180;
    const px2 = cx + Math.cos(rad) * (rx - 9);
    const py2 = cy + Math.sin(rad) * (ry - 9);
    p.ellipse(px2, py2, 3, 2, G[1]);
    p.ellipse(px2, py2 - 1, 2, 1, G[2]);
  }
  p.ellipse(cx, cy, 5, 4, D[1]);
  p.ring(cx, cy, 5, 4, G[2]);
  p.ellipse(cx, cy, 2, 2, G[3]);
  p.px(cx - 1, cy - 1, G[4]);
  // corner rosettes
  for (const [ox, oy] of [[14, 14], [w - 15, 14], [14, h - 15], [w - 15, h - 15]]) {
    p.ellipse(ox, oy, 4, 4, D[2]);
    p.ring(ox, oy, 4, 4, G[2]);
    p.px(ox, oy, G[3]);
  }
  // fringe
  for (let x = 1; x < w - 1; x += 2) {
    p.px(x, 0, R.cream[3]); p.px(x, h - 1, R.cream[3]);
  }
  return p.canvas;
}

/** Interior window with night outside and a warm sill. */
export function interiorWindow(lit = true) {
  const p = new P(28, 30);
  p.rect(0, 0, 28, 28, R.wood[2]);
  p.rect(0, 0, 28, 1, R.wood[3]);
  p.rect(2, 2, 24, 24, R.night[0]);
  // moonlit sky + falling snow beyond the glass
  p.rect(2, 2, 24, 24, R.night[1]);
  p.ellipse(19, 8, 4, 4, R.moon[3]);
  p.ellipse(20, 7, 3, 3, R.moon[4]);
  for (let k = 0; k < 22; k++)
    p.px(3 + ((hash2(k, 1, 311) * 22) | 0), 3 + ((hash2(k, 2, 312) * 22) | 0), R.moon[2]);
  // distant rooftops
  p.rect(2, 20, 10, 6, R.brick[1]);
  p.rect(2, 20, 10, 1, R.snow[3]);
  p.rect(14, 22, 12, 4, R.brick[1]);
  p.rect(14, 22, 12, 1, R.snow[3]);
  // mullions
  p.vline(14, 2, 24, R.wood[2]); p.hline(2, 14, 24, R.wood[2]);
  p.vline(13, 2, 24, R.wood[1]); p.hline(2, 13, 24, R.wood[1]);
  p.frame(2, 2, 24, 24, R.wood[1]);
  // sill
  p.rect(-2, 26, 32, 3, R.wood[3]);
  p.rect(-2, 26, 32, 1, R.wood[4]);
  if (lit) { p.rect(3, 3, 22, 2, mix(R.night[2], R.lamp[2], 0.3)); }
  outline(p.canvas, '#06050c');
  return p.canvas;
}

/** Stone hearth with a live fire. */
export function fireplace(frame = 0) {
  const p = new P(46, 44);
  const S = R.brick;
  p.rect(0, 0, 46, 40, S[2]);
  for (let y = 2; y < 40; y += 5) {
    p.hline(0, y, 46, S[1]);
    for (let x = ((y / 5) | 0) % 2 * 6; x < 46; x += 12) p.vline(x, y - 5, 5, S[1]);
  }
  p.rect(0, 0, 46, 2, S[3]);
  // mantel
  p.rect(-2, 8, 50, 4, R.oak[2]);
  p.rect(-2, 8, 50, 1, R.oak[3]);
  p.rect(-2, 12, 50, 1, R.oak[0]);
  // arched firebox
  p.rect(9, 16, 28, 24, R.void[0]);
  for (let i = 0; i < 6; i++) p.rect(9 + (6 - i), 10 + i, 28 - (6 - i) * 2, 1, R.void[0]);
  p.frame(9, 15, 28, 25, S[3]);
  // logs
  p.ellipse(17, 35, 6, 2, R.bark[2]);
  p.ellipse(28, 36, 6, 2, R.bark[1]);
  p.ellipse(23, 33, 5, 2, R.bark[3]);
  // flames
  const fh = [9, 12, 10, 13][frame % 4];
  for (let i = -8; i <= 8; i += 2) {
    const h = fh - Math.abs(i) * 0.75 + ((hash2(i, frame, 321) * 3) | 0);
    if (h <= 0) continue;
    p.rect(23 + i, 34 - h, 2, h, R.flame[2]);
    p.rect(23 + i, 34 - h + 2, 2, Math.max(1, h - 3), R.flame[3]);
    p.px(23 + i, 34 - h + 3, R.flame[4]);
  }
  // mantel clutter
  p.rect(4, 2, 5, 6, R.cocoa[2]); p.px(4, 2, R.cocoa[4]);
  p.rect(37, 3, 5, 5, R.milk[2]); p.px(37, 3, R.milk[4]);
  p.rect(20, 1, 7, 7, R.gold[2]); p.frame(20, 1, 7, 7, R.gold[3]);
  outline(p.canvas, '#06050c');
  return { canvas: p.canvas, light: [23, 30, 86] };
}

/** Hanging chandelier of candles. */
export function chandelier(frame = 0) {
  const p = new P(34, 26);
  p.vline(17, 0, 5, R.ink[2]);
  p.ellipse(17, 6, 3, 2, R.gold[2]);
  // arms
  for (let i = 0; i < 12; i++) {
    p.px(5 + i, 10 + Math.round(Math.sin(i / 11 * Math.PI) * -2), R.gold[2]);
    p.px(17 + i, 10 + Math.round(Math.sin(i / 11 * Math.PI) * -2), R.gold[2]);
  }
  p.rect(4, 9, 26, 2, R.gold[2]);
  p.rect(4, 9, 26, 1, R.gold[3]);
  for (const cx of [5, 12, 21, 28]) {
    p.rect(cx, 11, 2, 3, R.gold[1]);
    p.rect(cx, 5, 2, 5, R.cream[3]);
    p.px(cx, 5, R.cream[4]);
    const f = (frame + cx) % 4;
    p.rect(cx, 2 - (f % 2), 2, 3, R.flame[3]);
    p.px(cx, 1 - (f % 2), R.flame[4]);
  }
  // drop crystals
  for (const cx of [8, 17, 25]) { p.px(cx, 13, R.moon[3]); p.px(cx, 14, R.moon[2]); }
  outline(p.canvas, '#06050c');
  return { canvas: p.canvas, light: [17, 8, 78] };
}

/** Chalkboard menu on the wall. */
export function chalkboard() {
  const p = new P(34, 28);
  p.rect(0, 0, 34, 28, R.oak[2]);
  p.rect(0, 0, 34, 1, R.oak[3]);
  p.rect(0, 27, 34, 1, R.oak[0]);
  p.rect(2, 2, 30, 24, R.void[1]);
  p.frame(2, 2, 30, 24, R.oak[1]);
  // chalk writing
  p.hline(6, 5, 20, R.cream[3]);
  for (let i = 0; i < 5; i++) {
    const y = 9 + i * 3;
    p.hline(5, y, 12 + ((hash2(i, 1, 331) * 8) | 0), R.cream[2]);
    p.hline(26, y, 3, R.gold[3]);
  }
  p.px(4, 24, R.cream[4]);
  outline(p.canvas, '#06050c');
  return p.canvas;
}

/** Potted cocoa sapling. */
export function pottedPlant(seed = 1) {
  const p = new P(20, 30);
  p.rect(5, 20, 10, 9, R.caramel[2]);
  p.rect(5, 20, 10, 1, R.caramel[3]);
  p.rect(4, 18, 12, 3, R.caramel[3]);
  p.rect(4, 18, 12, 1, R.caramel[4]);
  p.rect(5, 27, 10, 2, R.caramel[1]);
  p.rect(6, 17, 8, 2, R.bark[1]);
  p.vline(10, 8, 10, R.bark[2]);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + seed;
    const lx = 10 + Math.cos(a) * (4 + hash2(i, seed, 341) * 3);
    const ly = 9 + Math.sin(a) * (4 + hash2(i, seed, 342) * 3);
    p.ellipse(lx, ly, 3, 2, R.leaf[2]);
    p.ellipse(lx - 1, ly - 1, 2, 1, R.leaf[3]);
  }
  p.ellipse(13, 12, 2, 3, R.caramel[3]);   // a hanging pod
  outline(p.canvas, '#06050c');
  return p.canvas;
}

/** Wainscot panelling strip drawn along the base of a wall. */
export function wainscot(w) {
  const p = new P(w, 12);
  p.rect(0, 0, w, 12, R.wood[2]);
  p.rect(0, 0, w, 2, R.wood[3]);
  p.rect(0, 11, w, 1, R.wood[0]);
  for (let x = 2; x < w - 4; x += 14) {
    p.rect(x, 3, 11, 7, R.wood[1]);
    p.frame(x, 3, 11, 7, R.wood[3]);
  }
  return p.canvas;
}

/** Ornate rug centrepiece (drawn as a prop, not a tile). */
export function candelabra(frame = 0) {
  const p = new P(14, 26);
  p.rect(5, 12, 4, 12, R.gold[1]);
  p.rect(5, 12, 1, 12, R.gold[3]);
  p.ellipse(7, 24, 6, 2, R.gold[2]);
  p.rect(1, 10, 12, 2, R.gold[2]);
  p.rect(1, 10, 12, 1, R.gold[3]);
  for (const cx of [1, 7, 12]) {
    p.rect(cx, 5, 2, 6, R.cream[3]);
    p.px(cx, 5, R.cream[4]);
    const f = (frame + cx) % 4;
    p.rect(cx, 2 - (f % 2), 2, 3, R.flame[3]);
    p.px(cx, 1 - (f % 2), R.flame[4]);
  }
  outline(p.canvas, '#06050c');
  return { canvas: p.canvas, light: [7, 4, 40] };
}

/* ================================================================== *
 * ITEM ICONS — 14x14
 * ================================================================== */

const IS = 14;

function icoBase() { return new P(IS, IS); }

export function chocolateIcon(kind = 0, quality = 0) {
  const p = icoBase();
  const sets = [R.cocoa, R.milk, R.white, R.ruby, R.caramel];
  const K = sets[kind % 5];
  switch (kind % 5) {
    case 0: // dark truffle
      p.ellipse(7, 8, 5, 4, K[1]);
      p.ellipse(7, 7, 5, 4, K[2]);
      p.ellipse(5, 6, 3, 2, K[3]);
      p.px(5, 5, K[4]);
      p.speckle(3, 4, 9, 6, K[0], 0.15, 4);
      break;
    case 1: // milk square
      p.rect(2, 4, 10, 8, K[2]);
      p.rect(2, 4, 10, 1, K[4]);
      p.rect(2, 4, 1, 8, K[3]);
      p.rect(11, 4, 1, 8, K[0]);
      p.rect(2, 11, 10, 1, K[0]);
      p.hline(2, 8, 10, K[1]); p.vline(7, 4, 8, K[1]);
      break;
    case 2: // white bonbon
      p.ellipse(7, 8, 5, 4, K[2]);
      p.ellipse(7, 7, 5, 4, K[3]);
      p.ellipse(5, 6, 3, 2, K[4]);
      p.rect(4, 4, 6, 1, R.cocoa[2]);  // drizzle
      p.px(6, 3, R.cocoa[2]); p.px(9, 3, R.cocoa[2]);
      break;
    case 3: // ruby heart
      p.ellipse(5, 6, 3, 3, K[2]);
      p.ellipse(9, 6, 3, 3, K[2]);
      for (let i = 0; i < 6; i++) p.rect(2 + i, 8 + i, 11 - i * 2, 1, K[2]);
      p.ellipse(5, 5, 2, 1, K[4]);
      p.px(4, 4, K[4]);
      break;
    default: // caramel swirl
      p.ellipse(7, 8, 5, 4, K[1]);
      p.ellipse(7, 7, 5, 4, K[2]);
      p.ellipse(6, 6, 3, 2, K[3]);
      p.line(3, 9, 11, 6, K[4]);
      p.line(4, 11, 10, 8, K[3]);
      break;
  }
  if (quality > 0) {
    // silver / gold star in the corner
    const st = quality === 1 ? R.moon[3] : quality === 2 ? R.gold[3] : R.wisp[4];
    p.px(11, 2, st); p.px(10, 3, st); p.px(12, 3, st); p.px(11, 3, st); p.px(11, 4, st);
  }
  outline(p.canvas, '#0a0710');
  return p.canvas;
}

export function ingredientIcon(kind) {
  const p = icoBase();
  switch (kind) {
    case 'cocoaPod':
      p.ellipse(7, 7, 4, 6, R.caramel[2]);
      p.ellipse(6, 6, 3, 5, R.caramel[3]);
      for (let y = 2; y < 13; y += 2) p.px(5, y, R.caramel[1]), p.px(9, y, R.caramel[1]);
      p.rect(6, 0, 2, 2, R.leaf[2]);
      break;
    case 'sugar':
      p.rect(3, 5, 8, 7, R.cream[3]);
      p.rect(3, 5, 8, 1, R.cream[4]);
      p.rect(3, 11, 8, 1, R.cream[1]);
      p.speckle(4, 6, 6, 5, R.cream[4], 0.3, 9);
      p.rect(3, 4, 8, 1, R.moon[2]);
      break;
    case 'milk':
      p.rect(4, 3, 6, 9, R.moon[3]);
      p.rect(4, 3, 6, 1, R.moon[4]);
      p.rect(5, 1, 4, 2, R.moon[2]);
      p.rect(4, 6, 6, 5, R.cream[4]);
      p.rect(9, 3, 1, 9, R.moon[1]);
      break;
    case 'moonberry':
      p.circle(5, 8, 3, R.wisp[2]); p.circle(9, 7, 3, R.wisp[3]);
      p.circle(7, 10, 2, R.wisp[2]);
      p.px(4, 6, R.wisp[4]); p.px(8, 5, R.wisp[4]);
      p.line(7, 5, 8, 2, R.leaf[2]);
      break;
    case 'gloomcap':
      p.ellipse(7, 6, 6, 4, R.plum[2]);
      p.ellipse(6, 5, 5, 3, R.plum[3]);
      p.px(4, 4, R.plum[4]); p.px(9, 5, R.wisp[4]); p.px(6, 3, R.wisp[4]);
      p.rect(6, 8, 3, 5, R.cream[2]);
      p.rect(6, 8, 1, 5, R.cream[3]);
      break;
    case 'frostmint':
      for (let i = 0; i < 3; i++) {
        p.ellipse(4 + i * 3, 6 + (i % 2) * 3, 3, 2, R.toxic[2]);
        p.ellipse(4 + i * 3, 6 + (i % 2) * 3 - 1, 2, 1, R.toxic[3]);
      }
      p.line(7, 12, 7, 6, R.toxic[1]);
      p.px(5, 5, R.moon[4]); p.px(10, 8, R.moon[4]);
      break;
    case 'emberspice':
      p.ellipse(7, 8, 4, 4, R.ember[2]);
      p.ellipse(6, 7, 3, 3, R.ember[3]);
      p.px(5, 6, R.ember[4]);
      p.line(4, 4, 10, 3, R.ember[1]);
      p.speckle(3, 4, 9, 8, R.ember[4], 0.1, 3);
      break;
    case 'spiritSalt':
      p.ellipse(7, 9, 5, 3, R.ghost[1]);
      p.rect(3, 5, 9, 5, R.ghost[3]);
      p.rect(3, 5, 9, 1, R.ghost[4]);
      p.speckle(4, 6, 7, 4, '#ffffff', 0.25, 6);
      p.px(6, 3, R.ghost[4]); p.px(9, 2, R.ghost[3]);
      break;
    case 'honey':
      p.rect(4, 4, 7, 8, R.lamp[3]);
      p.rect(4, 4, 7, 1, R.lamp[4]);
      p.rect(10, 4, 1, 8, R.lamp[1]);
      p.rect(3, 2, 9, 2, R.oak[2]);
      p.hline(5, 8, 5, R.lamp[2]);
      break;
    case 'cream':
      p.ellipse(7, 10, 5, 3, R.cream[2]);
      p.rect(3, 6, 9, 5, R.cream[3]);
      p.ellipse(7, 6, 5, 3, R.cream[4]);
      p.px(5, 5, '#ffffff');
      break;
    default:
      p.circle(7, 7, 4, R.stone[2]);
  }
  outline(p.canvas, '#0a0710');
  return p.canvas;
}

export function toolIcon(kind) {
  const p = icoBase();
  switch (kind) {
    case 'sword':
      p.line(3, 11, 10, 3, R.moon[3]);
      p.line(4, 11, 11, 3, R.moon[2]);
      p.px(11, 2, R.moon[4]);
      p.line(2, 9, 5, 12, R.gold[2]);
      p.rect(1, 11, 3, 3, R.wood[2]);
      break;
    case 'shield':
      p.rect(3, 2, 9, 7, R.stone[3]);
      for (let i = 0; i < 4; i++) p.rect(3 + i, 9 + i, 9 - i * 2, 1, R.stone[3]);
      p.rect(4, 3, 7, 5, R.stone[2]);
      p.rect(4, 3, 7, 1, R.stone[4]);
      p.circle(7, 6, 2, R.gold[3]);
      p.px(6, 5, R.gold[4]);
      break;
    case 'bow':
      for (let i = 0; i < 12; i++) {
        const a = (i / 11) * Math.PI - Math.PI / 2;
        p.px(4 + Math.cos(a) * 5, 7 + Math.sin(a) * 6, R.oak[3]);
        p.px(5 + Math.cos(a) * 5, 7 + Math.sin(a) * 6, R.oak[2]);
      }
      p.line(4, 1, 4, 13, R.cream[3]);
      break;
    case 'whisk':
      p.rect(6, 8, 2, 6, R.moon[2]);
      for (let i = 0; i < 4; i++) {
        p.line(7, 8, 3 + i * 2, 1, R.moon[3]);
      }
      p.ellipse(7, 2, 4, 2, R.moon[2]);
      break;
    case 'basket':
      p.ellipse(7, 8, 6, 5, R.oak[2]);
      p.ellipse(7, 6, 6, 3, R.oak[3]);
      for (let x = 2; x < 13; x += 2) p.vline(x, 6, 5, R.oak[1]);
      for (let i = 0; i < 10; i++) p.px(2 + i, 3 - Math.round(Math.sin(i / 9 * Math.PI) * 3), R.oak[2]);
      break;
    case 'lantern':
      p.rect(4, 4, 6, 8, R.ink[2]);
      p.rect(5, 5, 4, 6, R.lamp[3]);
      p.rect(6, 6, 2, 3, R.lamp[4]);
      p.rect(3, 3, 8, 1, R.ink[3]);
      p.rect(3, 12, 8, 1, R.ink[3]);
      for (let i = 0; i < 6; i++) p.px(4 + i, 2 - Math.round(Math.sin(i / 5 * Math.PI) * 2), R.ink[2]);
      break;
    default:
      p.circle(7, 7, 4, R.stone[2]);
  }
  outline(p.canvas, '#0a0710');
  return p.canvas;
}

/**
 * A gatherable growing in the world — a small snow-dusted plant carrying the
 * ingredient, so forage points read as scenery rather than floating icons.
 */
export function foragePlant(kind) {
  const p = new P(18, 20);
  const base = { cocoaPod: 'caramel', moonberry: 'wisp', gloomcap: 'plum', frostmint: 'toxic',
                 emberspice: 'ember', spiritSalt: 'ghost', honey: 'lamp', sugar: 'cream',
                 milk: 'moon', cream: 'cream' }[kind] || 'leaf';
  const K = R[base];

  if (kind === 'gloomcap' || kind === 'frostmint') {
    // mushroom cluster
    const caps = [[6, 12, 4], [11, 14, 3], [8, 9, 3]];
    for (const [cx, cy, r] of caps) {
      p.rect(cx - 1, cy, 3, 5, R.cream[2]);
      p.rect(cx - 1, cy, 1, 5, R.cream[3]);
      p.ellipse(cx, cy, r + 1, r - 1, K[1]);
      p.ellipse(cx, cy - 1, r, r - 1, K[2]);
      p.ellipse(cx - 1, cy - 2, r - 2, 1, K[3]);
      p.px(cx + 1, cy - 1, K[4]);
    }
    p.ellipse(9, 18, 7, 2, R.snow[2]);
  } else if (kind === 'honey') {
    // hive nub on a stump
    p.ellipse(9, 16, 7, 3, R.bark[1]);
    p.ellipse(9, 12, 6, 5, K[1]);
    p.ellipse(9, 11, 6, 5, K[2]);
    for (let i = 0; i < 4; i++) p.ellipse(9, 8 + i * 2, 6 - i, 1, K[1]);
    p.ellipse(7, 8, 3, 1, K[3]);
    p.circle(9, 14, 1, R.void[0]);
    p.px(4, 6, K[4]); p.px(13, 9, K[4]);
  } else {
    // leafy bush carrying fruit
    p.ellipse(9, 14, 8, 5, R.pine[1]);
    p.ellipse(7, 12, 6, 4, R.pine[2]);
    p.ellipse(11, 13, 5, 3, R.pine[2]);
    p.ellipse(7, 10, 3, 2, R.pine[3]);
    for (let k = 0; k < 3; k++) {
      const bx = 4 + ((hash2(k, 3, 401) * 11) | 0);
      const by = 9 + ((hash2(k, 4, 402) * 6) | 0);
      p.ellipse(bx, by, 2, 2, K[2]);
      p.ellipse(bx, by - 1, 1, 1, K[4]);
    }
    p.ellipse(7, 9, 4, 1, R.snow[3]);
    p.ellipse(12, 11, 2, 1, R.snow[2]);
  }
  outline(p.canvas, '#06050c');
  return p.canvas;
}

/** Coin pile icon for gold. */
export function coinIcon() {
  const p = new P(10, 10);
  p.ellipse(5, 5, 4, 4, R.gold[1]);
  p.ellipse(5, 4, 4, 4, R.gold[3]);
  p.ellipse(4, 3, 2, 2, R.gold[4]);
  p.ellipse(5, 4, 2, 2, R.gold[2]);
  outline(p.canvas, '#0a0710');
  return p.canvas;
}
