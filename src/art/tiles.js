// Ground / floor tile generation. 16x16, several deterministic variants each
// so large areas never visibly repeat.

import { P, makeCanvas, hash2, fnoise, vnoise, wrapNoise, ctxOf } from './pixel.js';
import { RAMP, mix } from './palette.js';

export const TS = 16; // tile size

const R = RAMP;

function tile(seed, fn) {
  const p = new P(TS, TS);
  fn(p, seed);
  return p.canvas;
}

/* ---------------- snow ---------------- */
function snowTile(p, seed) {
  // Snow is a broad calm surface. All variation is on a lattice that wraps
  // inside the tile, so no seams and no diagonal banding across a field.
  const CELLS = 4, SC = TS / CELLS;
  for (let y = 0; y < TS; y++) {
    for (let x = 0; x < TS; x++) {
      const n = wrapNoise(x / SC, y / SC, CELLS, 300 + seed);
      let i = 3;
      if (n < 0.34) i = 2;
      else if (n > 0.74) i = 4;
      p.px(x, y, R.snow[i]);
    }
  }
  // occasional twig, on roughly one tile in three
  if (hash2(seed, 0, 51) > 0.66) {
    const gx = 3 + ((hash2(seed, 1, 52) * (TS - 6)) | 0);
    const gy = 4 + ((hash2(seed, 2, 53) * (TS - 8)) | 0);
    p.px(gx, gy, R.bark[2]); p.px(gx, gy - 1, R.bark[3]);
    p.px(gx + 1, gy - 2, R.bark[2]);
  }
  // sparse glints
  for (let k = 0; k < 2; k++) {
    if (hash2(seed, k, 61) < 0.55) continue;
    p.px((hash2(seed, k, 62) * TS) | 0, (hash2(seed, k, 63) * TS) | 0, '#ffffff');
  }
}

/* ---------------- cobblestone (snow-dusted) ---------------- */
/**
 * Cobbles built from a Voronoi cell map so the setts are round and irregular
 * and never read as a brick wall the way a row layout does.
 */
/**
 * Town paving: pale periwinkle flagstones in offset courses with bright joints.
 * It reads *lighter* than the surrounding snow, which is what makes a cleared
 * square look swept rather than like a hole in the ground.
 */
function flagstoneTile(p, seed) {
  p.rect(0, 0, TS, TS, R.snow[2]);            // blue grout between the flags
  const rowH = 8;
  for (let ry = 0; ry < TS; ry += rowH) {
    const r = (ry / rowH) | 0;
    const off = (r + seed) % 2 ? 5 : 0;       // running bond
    for (let fx = -8; fx < TS; fx += 8) {
      const x = fx + off, y = ry;
      const k = (x * 7 + y * 13 + seed * 31) | 0;
      const b = 2 + Math.round(hash2(k, seed, 251) * 1.8 - 0.4);
      p.rect(x + 1, y + 1, 6, 6, R.pave[Math.max(1, Math.min(4, b))]);
      // lit top-left edge, shaded bottom-right
      p.hline(x + 1, y + 1, 6, R.pave[Math.min(4, b + 1)]);
      p.vline(x + 1, y + 1, 6, R.pave[Math.min(4, b + 1)]);
      p.hline(x + 1, y + 6, 6, R.pave[Math.max(0, b - 2)]);
      p.vline(x + 6, y + 1, 6, R.pave[Math.max(0, b - 2)]);
      // a little wear
      if (hash2(k, seed, 252) > 0.7)
        p.px(x + 2 + ((hash2(k, seed, 253) * 4) | 0), y + 2 + ((hash2(k, seed, 254) * 4) | 0),
             R.pave[Math.max(0, b - 1)]);
    }
  }
  // a few flags sunk deeper into shadow
  for (let y = 0; y < TS; y++)
    for (let x = 0; x < TS; x++)
      if (hash2(x + seed * 5, y + seed * 3, 255) > 0.965) p.px(x, y, R.snow[1]);
  // drifted snow creeping across
  for (let y = 0; y < TS; y++)
    for (let x = 0; x < TS; x++) {
      const n = wrapNoise(x / 4, y / 4, 4, 560 + seed);
      if (n > 0.80) p.px(x, y, R.snow[3]);
    }
}

function cobbleTile(p, seed, snowy = true) {
  // Explicitly drawn rounded setts on a jittered 3x3 grid. Drawing each stone
  // (rather than deriving them from a distance field) is what makes them
  // actually read as cobbles instead of camouflage mottle.
  p.rect(0, 0, TS, TS, R.pave[0]);            // joint / mortar

  const G = 3, CELL = TS / G;
  const stones = [];
  for (let j = 0; j < G; j++) {
    for (let i = 0; i < G; i++) {
      const k = j * G + i;
      stones.push({
        x: i * CELL + CELL / 2 + (hash2(k, seed, 221) - 0.5) * 1.6,
        y: j * CELL + CELL / 2 + (hash2(k, seed, 222) - 0.5) * 1.6,
        rx: 1.85 + hash2(k, seed, 223) * 0.5,
        ry: 1.55 + hash2(k, seed, 224) * 0.45,
        shade: 2 + Math.round(hash2(k, seed, 225) * 1.4 - 0.2),
      });
    }
  }

  // three passes so wrapped copies never paint over a neighbour's highlight
  const forEachCopy = (fn) => {
    for (const s of stones)
      for (const ox of [-TS, 0, TS])
        for (const oy of [-TS, 0, TS]) {
          const cx = s.x + ox, cy = s.y + oy;
          if (cx < -5 || cy < -5 || cx > TS + 5 || cy > TS + 5) continue;
          fn(s, cx, cy);
        }
  };
  // 1. bodies
  forEachCopy((s, cx, cy) => {
    p.ellipse(cx, cy, s.rx, s.ry, R.pave[Math.max(1, Math.min(3, s.shade))]);
  });
  // 2. shaded undersides
  forEachCopy((s, cx, cy) => {
    const base = Math.max(1, Math.min(3, s.shade));
    for (let a = 20; a < 160; a += 14) {
      const rad = a * Math.PI / 180;
      p.px(Math.round(cx + Math.cos(rad) * s.rx), Math.round(cy + Math.sin(rad) * s.ry),
           R.pave[Math.max(0, base - 1)]);
    }
  });
  // 3. lit crowns, upper-left
  forEachCopy((s, cx, cy) => {
    const base = Math.max(1, Math.min(3, s.shade));
    p.ellipse(cx - 0.5, cy - 0.6, s.rx - 0.9, s.ry - 0.7, R.pave[Math.min(4, base + 1)]);
    p.px(Math.round(cx - s.rx * 0.35), Math.round(cy - s.ry * 0.55), R.pave[Math.min(4, base + 2)]);
  });

  // a little grit in the joints
  for (let k = 0; k < 5; k++) {
    const gx = (hash2(k, seed, 231) * TS) | 0, gy = (hash2(k, seed, 232) * TS) | 0;
    p.px(gx, gy, R.pave[1]);
  }

  if (snowy) {
    // snow settles in the joints and along the north edge of each stone
    for (let y = 0; y < TS; y++)
      for (let x = 0; x < TS; x++) {
        const n = wrapNoise(x / 4, y / 4, 4, 500 + seed);
        if (n > 0.84) p.px(x, y, R.snow[2]);
      }
    for (const s of stones) {
      if (hash2(s.x | 0, seed, 241) < 0.72) continue;
      for (let a = 200; a < 340; a += 22) {
        const rad = a * Math.PI / 180;
        p.px(Math.round(s.x + Math.cos(rad) * (s.rx + 0.6)),
             Math.round(s.y + Math.sin(rad) * (s.ry + 0.6)), R.snow[2]);
      }
    }
  }
}

/** Lay drifted snow over whatever is already on the tile. */
function snowOver(p, seed, amount) {
  for (let y = 0; y < TS; y++)
    for (let x = 0; x < TS; x++) {
      const n = wrapNoise(x / 4, y / 4, 4, 600 + seed);
      if (n < amount) {
        const deep = n < amount * 0.5;
        p.px(x, y, R.snow[deep ? 3 : 2]);
      }
    }
}

/* ---------------- packed snow path ---------------- */
function pathTile(p, seed) {
  const CELLS = 4, SC = TS / CELLS;
  for (let y = 0; y < TS; y++)
    for (let x = 0; x < TS; x++) {
      const n = wrapNoise(x / SC, y / SC, CELLS, 400 + seed);
      p.px(x, y, n < 0.38 ? R.snow[1] : n > 0.70 ? R.snow[3] : R.snow[2]);
    }
  // boot-scuffed grit showing through the packed snow
  for (let k = 0; k < 3; k++) {
    if (hash2(k, seed, 90) < 0.45) continue;
    const gx = (hash2(k, seed, 91) * TS) | 0, gy = (hash2(k, seed, 92) * TS) | 0;
    p.px(gx, gy, R.pave[1]); p.px(gx + 1, gy, R.pave[2]); p.px(gx, gy + 1, R.pave[0]);
  }
}

/* ---------------- castle stone floor ---------------- */
function castleFloorTile(p, seed) {
  p.rect(0, 0, TS, TS, R.brick[0]);
  const slabs = [[0, 0, 8, 8], [8, 0, 8, 8], [0, 8, 8, 8], [8, 8, 8, 8]];
  for (let i = 0; i < 4; i++) {
    const [x, y, w, h] = slabs[i];
    const v = hash2(i, seed, 61);
    const b = 1 + Math.floor(v * 2.2);
    p.rect(x, y, w - 1, h - 1, R.brick[b]);
    p.hline(x, y, w - 1, R.brick[b + 1]);
    p.vline(x, y, h - 1, R.brick[b + 1]);
    p.hline(x, y + h - 2, w - 1, R.brick[Math.max(0, b - 1)]);
    for (let j = 0; j < 5; j++) {
      const gx = x + 1 + ((hash2(j, i + seed, 71) * (w - 3)) | 0);
      const gy = y + 1 + ((hash2(j, i + seed, 72) * (h - 3)) | 0);
      p.px(gx, gy, R.brick[Math.max(0, b - 1)]);
    }
  }
}

/* ---------------- shop wooden floor ---------------- */
function woodFloorTile(p, seed) {
  const plankH = 8;                      // wider boards, softer banding
  for (let py = 0; py < TS; py += plankH) {
    const i = (py / plankH) | 0;
    const v = hash2(i, seed, 101);
    const b = 2 + Math.round(v * 0.9 - 0.45);
    p.rect(0, py, TS, plankH, R.floor[b]);
    p.hline(0, py, TS, R.floor[Math.min(4, b + 1)]);
    p.hline(0, py + plankH - 1, TS, R.floor[Math.max(0, b - 1)]);
    // grain streaks
    for (let g = 0; g < 4; g++) {
      const gx = (hash2(g, i + seed * 4, 111) * TS) | 0;
      const gl = 2 + ((hash2(g, i + seed * 4, 112) * 4) | 0);
      p.hline(gx, py + 1 + ((hash2(g, i, 113) * (plankH - 2)) | 0),
              Math.min(gl, TS - gx), R.floor[Math.max(0, b - 1)]);
    }
    // plank seam
    const seam = ((hash2(i, seed, 121) * TS) | 0);
    p.vline(seam, py, plankH, R.floor[0]);
  }
}

/* ---------------- dark lab tile ---------------- */
function labFloorTile(p, seed) {
  // dark flagstone; the arcane inlay appears on only a few tiles so it reads
  // as scattered sigils rather than wallpaper
  p.rect(0, 0, TS, TS, R.slate[0]);
  const slabs = seed % 2
    ? [[0, 0, 16, 7], [0, 7, 9, 9], [9, 7, 7, 9]]
    : [[0, 0, 9, 9], [9, 0, 7, 9], [0, 9, 16, 7]];
  slabs.forEach((sl, i) => {
    const [x, y, w, h] = sl;
    const b = 1 + Math.round(hash2(i, seed, 601) * 1.2);
    p.rect(x, y, w - 1, h - 1, R.slate[b]);
    p.hline(x, y, w - 1, R.slate[Math.min(4, b + 1)]);
    p.vline(x, y, h - 1, R.slate[Math.min(4, b + 1)]);
    p.hline(x, y + h - 2, w - 1, R.slate[Math.max(0, b - 1)]);
    for (let j = 0; j < 4; j++)
      p.px(x + 1 + ((hash2(j, i + seed, 602) * (w - 3)) | 0),
           y + 1 + ((hash2(j, i + seed, 603) * (h - 3)) | 0), R.slate[Math.max(0, b - 1)]);
  });
  if (seed % 4 === 0) {
    const cx = 8, cy = 8;
    for (let d = 0; d < 4; d++) {
      p.px(cx + d, cy, R.violet[2]); p.px(cx - d, cy, R.violet[2]);
      p.px(cx, cy + d, R.violet[2]); p.px(cx, cy - d, R.violet[2]);
    }
    p.px(cx, cy, R.wisp[3]);
  }
}

/* ---------------- grass / forest floor ---------------- */
function grassTile(p, seed) {
  for (let y = 0; y < TS; y++)
    for (let x = 0; x < TS; x++) {
      const n = wrapNoise(x / 4, y / 4, 4, 700 + seed);
      p.px(x, y, n < 0.38 ? R.leaf[0] : n > 0.64 ? R.leaf[2] : R.leaf[1]);
    }
  for (let k = 0; k < 10; k++) {
    const gx = (hash2(k, seed, 131) * TS) | 0, gy = (hash2(k, seed, 132) * TS) | 0;
    p.px(gx, gy, R.leaf[3]);
    if (hash2(k, seed, 133) > 0.6) p.px(gx, gy - 1, R.leaf[3]);
  }
  for (let k = 0; k < 3; k++) {
    const gx = (hash2(k, seed, 141) * TS) | 0, gy = (hash2(k, seed, 142) * TS) | 0;
    p.px(gx, gy, R.pine[1]);
  }
}

/* ---------------- dirt / cave floor ---------------- */
function dirtTile(p, seed) {
  for (let y = 0; y < TS; y++)
    for (let x = 0; x < TS; x++) {
      const n = wrapNoise(x / 4, y / 4, 4, 800 + seed);
      p.px(x, y, n < 0.37 ? R.bark[1] : n > 0.63 ? R.bark[3] : R.bark[2]);
    }
  for (let k = 0; k < 6; k++) {
    const gx = (hash2(k, seed, 151) * TS) | 0, gy = (hash2(k, seed, 152) * TS) | 0;
    p.px(gx, gy, R.bark[0]);
  }
}

/* ---------------- water (animated frames) ---------------- */
function waterTile(p, seed, frame = 0) {
  const off = frame * 2;
  for (let y = 0; y < TS; y++)
    for (let x = 0; x < TS; x++) {
      const n = fnoise((x + off) / 5, (y + seed * 3) / 5, 41);
      p.px(x, y, n < 0.4 ? R.night[1] : n > 0.66 ? R.night[3] : R.night[2]);
    }
  for (let k = 0; k < 4; k++) {
    const gx = ((hash2(k, seed, 161) * TS) | 0 + off) % TS;
    const gy = (hash2(k, seed, 162) * TS) | 0;
    p.hline(gx, gy, 3, R.moon[1]);
  }
}

/* ---------------- shop rug ---------------- */
function rugTile(p, seed, edge = 'mid') {
  p.rect(0, 0, TS, TS, R.rose[1]);
  for (let y = 0; y < TS; y++)
    for (let x = 0; x < TS; x++)
      if (hash2(x + seed, y + seed, 171) > 0.86) p.px(x, y, R.rose[2]);
  // woven diamond motif
  for (let d = 0; d <= 5; d++) {
    p.px(8 + d, 8, R.gold[2]); p.px(8 - d, 8, R.gold[2]);
    p.px(8, 8 + d, R.gold[2]); p.px(8, 8 - d, R.gold[2]);
  }
  for (let d = 0; d <= 3; d++) {
    p.px(8 + d, 8 - (3 - d), R.gold[3]); p.px(8 - d, 8 - (3 - d), R.gold[3]);
    p.px(8 + d, 8 + (3 - d), R.gold[3]); p.px(8 - d, 8 + (3 - d), R.gold[3]);
  }
  if (edge === 'top') { p.hline(0, 0, TS, R.rose[0]); p.hline(0, 1, TS, R.gold[1]); }
  if (edge === 'bot') { p.hline(0, TS - 1, TS, R.rose[0]); p.hline(0, TS - 2, TS, R.gold[1]); }
  if (edge === 'left') { p.vline(0, 0, TS, R.rose[0]); p.vline(1, 0, TS, R.gold[1]); }
  if (edge === 'right') { p.vline(TS - 1, 0, TS, R.rose[0]); p.vline(TS - 2, 0, TS, R.gold[1]); }
}

/* ---------------- walls (vertical faces) ---------------- */
function wallTile(p, seed, kind = 'castle') {
  if (kind === 'warm') {
    p.rect(0, 0, TS, TS, R.wood[1]);
    const rows = [[0, 0, 10, 5], [10, 0, 6, 5], [0, 5, 6, 5], [6, 5, 10, 5], [0, 10, 9, 6], [9, 10, 7, 6]];
    rows.forEach((r, i) => {
      const [x, y, w, h] = r;
      const b = 1 + Math.round(hash2(i, seed, 181) * 1.6);
      p.rect(x, y, w - 1, h - 1, R.wood[b]);
      p.hline(x, y, w - 1, R.wood[Math.min(4, b + 1)]);
      p.hline(x, y + h - 2, w - 1, R.wood[Math.max(0, b - 1)]);
      if (hash2(i, seed, 182) > 0.7)
        p.px(x + 2, y + 2, R.wood[Math.max(0, b - 1)]);
    });
    return;
  }
  if (kind === 'castle') {
    p.rect(0, 0, TS, TS, R.brick[1]);
    const rows = [[0, 0, 10, 5], [10, 0, 6, 5], [0, 5, 6, 5], [6, 5, 10, 5], [0, 10, 9, 6], [9, 10, 7, 6]];
    rows.forEach((r, i) => {
      const [x, y, w, h] = r;
      const b = 1 + Math.floor(hash2(i, seed, 181) * 2.3);
      p.rect(x, y, w - 1, h - 1, R.brick[b]);
      p.hline(x, y, w - 1, R.brick[b + 1]);
      p.hline(x, y + h - 2, w - 1, R.brick[Math.max(0, b - 1)]);
    });
  } else { // plaster/timber townhouse
    p.rect(0, 0, TS, TS, R.cream[1]);
    for (let y = 0; y < TS; y++)
      for (let x = 0; x < TS; x++)
        if (hash2(x + seed, y + seed, 191) > 0.88) p.px(x, y, R.cream[2]);
    p.rect(0, 0, 2, TS, R.wood[2]);
    p.rect(TS - 2, 0, 2, TS, R.wood[2]);
  }
}

/* ------------------------------------------------------------------ */

export const TILES = {};

function variants(name, n, fn) {
  TILES[name] = [];
  for (let i = 0; i < n; i++) TILES[name].push(tile(i + 1, (p, s) => fn(p, s)));
}

export function buildTiles() {
  variants('snow', 6, snowTile);
  variants('cobble', 6, flagstoneTile);
  variants('cobbleEdge', 6, (p, s) => { flagstoneTile(p, s); snowOver(p, s, 0.55); });
  variants('cobbleEdge2', 6, (p, s) => { flagstoneTile(p, s); snowOver(p, s, 0.28); });
  variants('cobbleBare', 4, (p, s) => cobbleTile(p, s, false));
  variants('path', 5, pathTile);
  variants('castleFloor', 5, castleFloorTile);
  variants('woodFloor', 5, woodFloorTile);
  variants('labFloor', 4, labFloorTile);
  variants('grass', 6, grassTile);
  variants('dirt', 5, dirtTile);
  variants('rug', 3, (p, s) => rugTile(p, s, 'mid'));
  TILES.rugTop = [tile(1, (p, s) => rugTile(p, s, 'top'))];
  TILES.rugBot = [tile(2, (p, s) => rugTile(p, s, 'bot'))];
  TILES.rugLeft = [tile(3, (p, s) => rugTile(p, s, 'left'))];
  TILES.rugRight = [tile(4, (p, s) => rugTile(p, s, 'right'))];
  variants('wallCastle', 4, (p, s) => wallTile(p, s, 'castle'));
  variants('wallWarm', 4, (p, s) => wallTile(p, s, 'warm'));
  variants('wallHouse', 3, (p, s) => wallTile(p, s, 'house'));
  TILES.water = [0, 1, 2, 3].map(f => tile(1, (p, s) => waterTile(p, s, f)));
  return TILES;
}

/** Pick a deterministic variant for a world position. */
export function tileAt(name, tx, ty) {
  const arr = TILES[name];
  if (!arr) return null;
  return arr[(hash2(tx, ty, 999) * arr.length) | 0];
}

// expose for the self test
if (typeof window !== 'undefined') window.__tiles = { TILES, TS };
