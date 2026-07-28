// Parametric pixel character painter.
// 16x28 sprites, 4 directions x 4 walk frames, plus combat poses.
// Everything is drawn from ramps so lighting/tinting stays coherent.

import { P, makeCanvas, outline, ctxOf, crop } from './pixel.js';
import { RAMP, mix } from './palette.js';

const R = RAMP;
export const CW = 16, CH = 28;

export const DIR = { S: 0, W: 1, E: 2, N: 3 };

/** Build a color set from a spec. */
function tones(spec) {
  const skin = R[spec.skin || 'skinA'];
  const hair = R[spec.hair || 'ink'];
  const shirt = R[spec.shirt || 'plum'];
  const pants = R[spec.pants || 'ink'];
  const shoe = R[spec.shoe || 'wood'];
  const apron = spec.apron ? R[spec.apron] : null;
  const hat = spec.hat ? R[spec.hat] : null;
  const cape = spec.cape ? R[spec.cape] : null;
  return { skin, hair, shirt, pants, shoe, apron, hat, cape, spec };
}

/* ------------------------------------------------------------------ *
 * Head
 * ------------------------------------------------------------------ */
function head(p, t, dir, oy) {
  const S = t.skin, H = t.hair;
  const y = 2 + oy;

  // skull block 10 wide (x3..x12), 9 tall
  p.rect(3, y + 1, 10, 8, S[2]);
  p.rect(4, y, 8, 1, S[2]);
  p.rect(3, y + 9, 10, 1, S[1]);        // jaw shadow
  // light from upper-left
  p.rect(3, y + 1, 1, 8, S[1]);
  p.rect(12, y + 1, 1, 8, S[1]);
  p.rect(4, y + 1, 7, 1, S[3]);
  p.px(4, y + 2, S[3]); p.px(5, y + 2, S[3]);
  // neck
  p.rect(6, y + 10, 4, 2, S[1]);

  if (dir === DIR.N) {
    // back of head: all hair
    p.rect(3, y, 10, 9, H[2]);
    p.rect(3, y, 10, 1, H[3]);
    p.rect(4, y + 1, 6, 1, H[3]);
    p.rect(3, y + 8, 10, 1, H[1]);
    p.rect(3, y + 1, 1, 8, H[1]);
    p.rect(12, y + 1, 1, 8, H[1]);
    return;
  }

  // --- face ---
  const eyeY = y + 5;
  if (dir === DIR.S) {
    p.rect(5, eyeY, 2, 2, R.ink[0]);
    p.rect(9, eyeY, 2, 2, R.ink[0]);
    p.px(6, eyeY, R.moon[3]); p.px(10, eyeY, R.moon[3]);
    p.px(5, eyeY + 2, S[1]); p.px(10, eyeY + 2, S[1]);
    // brows
    p.rect(5, eyeY - 1, 2, 1, H[1]);
    p.rect(9, eyeY - 1, 2, 1, H[1]);
    // mouth
    p.px(8, y + 8, S[0]);
    // cheeks
    p.px(4, eyeY + 2, mix(S[2], '#c66a7c', 0.45));
    p.px(11, eyeY + 2, mix(S[2], '#c66a7c', 0.45));
  } else {
    const flip = dir === DIR.W;
    const ex = flip ? 4 : 10;
    p.rect(ex, eyeY, 2, 2, R.ink[0]);
    p.px(flip ? ex : ex + 1, eyeY, R.moon[3]);
    p.rect(ex, eyeY - 1, 2, 1, H[1]);
    // nose nub
    p.px(flip ? 3 : 12, eyeY + 1, S[1]);
    p.px(flip ? 4 : 11, y + 8, S[0]);
    p.px(flip ? 11 : 4, eyeY + 2, mix(S[2], '#c66a7c', 0.35));
  }

  // --- hair ---
  const style = t.spec.hairStyle || 'short';
  p.rect(3, y, 10, 2, H[2]);
  p.rect(4, y - 1, 8, 1, H[2]);
  p.rect(4, y - 1, 6, 1, H[3]);
  p.rect(3, y + 2, 1, 3, H[2]);
  p.rect(12, y + 2, 1, 3, H[2]);
  p.px(3, y + 1, H[1]); p.px(12, y + 1, H[1]);

  if (style === 'long') {
    p.rect(2, y + 2, 2, 9, H[2]);
    p.rect(12, y + 2, 2, 9, H[2]);
    p.rect(2, y + 2, 1, 9, H[1]);
    p.rect(13, y + 2, 1, 9, H[1]);
    p.px(3, y + 3, H[3]);
  } else if (style === 'bun') {
    p.circle(8, y - 2, 2, H[2]);
    p.px(7, y - 3, H[3]);
    p.rect(3, y + 2, 1, 4, H[2]);
    p.rect(12, y + 2, 1, 4, H[2]);
  } else if (style === 'wild') {
    p.px(2, y, H[2]); p.px(13, y, H[2]);
    p.px(3, y - 2, H[2]); p.px(11, y - 2, H[2]);
    p.px(6, y - 2, H[3]); p.px(9, y - 2, H[2]);
    p.rect(2, y + 1, 1, 5, H[1]);
    p.rect(13, y + 1, 1, 5, H[1]);
  } else if (style === 'bald') {
    p.rect(3, y, 10, 2, S[2]);
    p.rect(4, y - 1, 8, 1, S[2]);
    p.rect(4, y - 1, 6, 1, S[3]);
    p.rect(3, y + 2, 1, 3, S[2]);
    p.rect(12, y + 2, 1, 3, S[2]);
  }
  // fringe over forehead
  if (style !== 'bald') {
    if (dir === DIR.S) { p.rect(4, y + 2, 3, 1, H[2]); p.rect(10, y + 2, 2, 1, H[2]); }
    else if (dir === DIR.W) { p.rect(3, y + 2, 5, 1, H[2]); }
    else { p.rect(8, y + 2, 5, 1, H[2]); }
  }

  if (t.hat) {
    const Hc = t.hat;
    p.rect(2, y - 1, 12, 1, Hc[1]);   // brim
    p.rect(3, y - 4, 10, 3, Hc[2]);
    p.rect(3, y - 4, 8, 1, Hc[3]);
    p.rect(3, y - 2, 10, 1, Hc[1]);
    p.rect(3, y - 2, 10, 1, R.gold[2]); // band
  }
}

/* ------------------------------------------------------------------ *
 * Torso + limbs
 * ------------------------------------------------------------------ */
function torso(p, t, dir, oy, armL, armR) {
  const Sh = t.shirt, Sk = t.skin, Ap = t.apron;
  const y = 14 + oy;

  // shoulders/chest 10 wide
  p.rect(3, y, 10, 6, Sh[2]);
  p.rect(3, y, 10, 1, Sh[3]);
  p.rect(3, y + 5, 10, 1, Sh[1]);
  p.rect(3, y, 1, 6, Sh[1]);
  p.rect(12, y, 1, 6, Sh[1]);
  p.rect(4, y + 1, 4, 1, Sh[3]);

  if (dir === DIR.S) {
    // collar
    p.rect(6, y, 4, 1, Sh[1]);
    p.px(7, y + 1, Sk[1]); p.px(8, y + 1, Sk[1]);
  } else if (dir === DIR.N) {
    p.rect(5, y, 6, 1, Sh[1]);
    p.rect(7, y + 1, 2, 4, Sh[1]);   // spine seam
  }

  if (Ap) {
    // apron bib + skirt
    p.rect(5, y + 2, 6, 4, Ap[3]);
    p.rect(5, y + 2, 6, 1, Ap[4]);
    p.rect(5, y + 5, 6, 1, Ap[2]);
    p.px(4, y + 1, Ap[3]); p.px(11, y + 1, Ap[3]);
    if (dir === DIR.S) { p.px(7, y + 3, Ap[2]); p.px(9, y + 4, Ap[2]); }
  }

  // arms — armL/armR are vertical offsets from the swing
  const sleeve = Sh, hand = Sk;
  // left arm (screen-left, x=2)
  p.rect(2, y + 1 + armL, 2, 4, sleeve[2]);
  p.px(2, y + 1 + armL, sleeve[3]);
  p.rect(2, y + 5 + armL, 2, 2, hand[2]);
  p.px(2, y + 6 + armL, hand[1]);
  // right arm (x=12)
  p.rect(12, y + 1 + armR, 2, 4, sleeve[2]);
  p.px(13, y + 1 + armR, sleeve[1]);
  p.rect(12, y + 5 + armR, 2, 2, hand[2]);
  p.px(13, y + 6 + armR, hand[1]);

  if (t.cape) {
    const Cp = t.cape;
    if (dir === DIR.N) { p.rect(3, y, 10, 9, Cp[2]); p.rect(3, y, 10, 1, Cp[3]); p.rect(3, y + 8, 10, 1, Cp[1]); }
    else { p.rect(1, y + 1, 2, 8, Cp[2]); p.rect(13, y + 1, 2, 8, Cp[2]); p.px(1, y + 8, Cp[1]); p.px(14, y + 8, Cp[1]); }
  }
}

function legs(p, t, dir, oy, legL, legR) {
  const Pt = t.pants, Sh = t.shoe;
  const y = 20 + oy;
  // hips
  p.rect(4, y, 8, 2, Pt[2]);
  p.rect(4, y, 8, 1, Pt[3]);
  // legs
  p.rect(4, y + 2 + legL, 3, 4, Pt[2]);
  p.rect(9, y + 2 + legR, 3, 4, Pt[2]);
  p.rect(4, y + 2 + legL, 1, 4, Pt[1]);
  p.rect(9, y + 2 + legR, 1, 4, Pt[3]);
  // shoes
  p.rect(3, y + 6 + legL, 4, 2, Sh[2]);
  p.rect(9, y + 6 + legR, 4, 2, Sh[2]);
  p.rect(3, y + 7 + legL, 4, 1, Sh[1]);
  p.rect(9, y + 7 + legR, 4, 1, Sh[1]);
}

/* ------------------------------------------------------------------ *
 * Frame assembly
 * ------------------------------------------------------------------ */
const WALK = [
  // {bob, armL, armR, legL, legR}
  { bob: 0, aL: 0, aR: 0, lL: 0, lR: 0 },
  { bob: -1, aL: -1, aR: 1, lL: -1, lR: 1 },
  { bob: 0, aL: 0, aR: 0, lL: 0, lR: 0 },
  { bob: -1, aL: 1, aR: -1, lL: 1, lR: -1 },
];

export function charFrame(spec, dir, frame) {
  const t = tones(spec);
  const p = new P(CW, CH);
  const w = WALK[frame % 4];
  const oy = w.bob;
  legs(p, t, dir, oy, w.lL, w.lR);
  torso(p, t, dir, oy, w.aL, w.aR);
  head(p, t, dir, oy);
  outline(p.canvas, '#0a0710');
  return p.canvas;
}

/** Sword-swing pose. phase 0..2 (wind-up, strike, recover) */
export function swingFrame(spec, dir, phase) {
  const t = tones(spec);
  const p = new P(CW, CH);
  const lean = phase === 1 ? 1 : 0;
  legs(p, t, dir, 0, phase === 1 ? -1 : 0, phase === 1 ? 1 : 0);
  torso(p, t, dir, lean ? -1 : 0, phase === 0 ? -3 : phase === 1 ? 2 : 0,
        phase === 0 ? -3 : phase === 1 ? 2 : 0);
  head(p, t, dir, lean ? -1 : 0);
  outline(p.canvas, '#0a0710');
  return p.canvas;
}

/** Shield-block pose. */
export function blockFrame(spec, dir) {
  const t = tones(spec);
  const p = new P(CW, CH);
  legs(p, t, dir, 0, 0, 0);
  torso(p, t, dir, 0, -2, -2);
  head(p, t, dir, 0);
  outline(p.canvas, '#0a0710');
  return p.canvas;
}

/** Build the full animation set for a character spec. */
export function buildChar(spec) {
  const set = { walk: [[], [], [], []], swing: [[], [], [], []], block: [] };
  for (let d = 0; d < 4; d++) {
    for (let f = 0; f < 4; f++) set.walk[d].push(charFrame(spec, d, f));
    for (let ph = 0; ph < 3; ph++) set.swing[d].push(swingFrame(spec, d, ph));
    set.block.push(blockFrame(spec, d));
  }
  return set;
}

/* ------------------------------------------------------------------ *
 * Ghosts — the shop staff. Soft, translucent, bobbing.
 * ------------------------------------------------------------------ */
export function ghostFrame(variant, frame, carrying) {
  const p = new P(16, 20);
  const G = variant === 1 ? R.wisp : variant === 2 ? R.toxic : R.ghost;
  const bob = [0, -1, -2, -1][frame % 4];
  const y = 3 + bob;

  // body: rounded top, wavy tail
  p.ellipse(8, y + 5, 6, 6, G[2]);
  p.rect(2, y + 5, 13, 6, G[2]);
  // wavy hem
  const wave = frame % 4;
  for (let i = 0; i < 13; i++) {
    const h = 2 + Math.round(1.6 * Math.sin((i + wave * 1.5) * 0.9));
    p.rect(2 + i, y + 11, 1, h, G[2]);
  }
  // shading
  p.ellipse(6, y + 4, 4, 4, G[3]);
  p.rect(2, y + 5, 2, 7, G[1]);
  p.rect(13, y + 5, 2, 7, G[1]);
  p.ellipse(6, y + 2, 2, 1, G[4]);
  // face
  p.rect(5, y + 4, 2, 3, R.void[0]);
  p.rect(9, y + 4, 2, 3, R.void[0]);
  p.px(5, y + 4, G[4]); p.px(9, y + 4, G[4]);
  p.ellipse(8, y + 8, 2, 1, R.void[0]);
  // little arms
  p.rect(1, y + 6, 2, 2, G[2]);
  p.rect(13, y + 6, 2, 2, G[2]);

  if (carrying) {
    // holding a tray of chocolates overhead
    p.rect(4, y - 3, 9, 1, R.oak[3]);
    p.rect(4, y - 2, 9, 1, R.oak[1]);
    p.rect(5, y - 5, 2, 2, R.cocoa[3]);
    p.rect(8, y - 5, 2, 2, R.milk[3]);
    p.rect(11, y - 5, 2, 2, R.white[3]);
    p.px(5, y - 5, R.cocoa[4]); p.px(8, y - 5, R.milk[4]); p.px(11, y - 5, R.white[4]);
    p.rect(1, y + 2, 2, 5, G[2]);   // arms up
    p.rect(13, y + 2, 2, 5, G[2]);
  }
  return p.canvas;
}

export function buildGhost(variant) {
  const idle = [], carry = [];
  for (let f = 0; f < 4; f++) { idle.push(ghostFrame(variant, f, false)); carry.push(ghostFrame(variant, f, true)); }
  return { idle, carry };
}
