// Buildings, scenery, furniture, and item icons.
// All hand-composed pixel art generated at load time.

import { P, makeCanvas, outline, hash2, fnoise, crop } from './pixel.js';
import { RAMP, mix, C } from './palette.js';
import { drawText } from './font.js';

const R = RAMP;

/* ================================================================== *
 * TOWN BUILDINGS
 * ================================================================== */

/**
 * Gothic snow-capped townhouse.
 * opts: { w, h, wall, roof, windows, chimneys, sign, door, storeys }
 */
/**
 * Snowbound townhouse drawn the way the reference does it: a large, bright
 * shingled roof *plane* dominating the shape, sitting over a much darker
 * violet masonry facade. The value split between roof and wall is what makes
 * these read as buildings seen from above rather than flat elevations.
 */
export function townhouse(opts = {}) {
  const w = opts.w || 72;
  const facH = opts.facadeH || 34;
  const roofH = opts.roofH || Math.round(w * 0.62);
  const eave = 4;
  const H = roofH + facH + 10;
  const p = new P(w + eave * 2, H);
  const OX = eave;                                  // origin of the facade
  const ROOF = R[opts.roof || 'plum'];
  const WALL = R[opts.wall || 'masonry'];
  const TRIM = R[opts.trim || 'wood'];
  const SNOW = R.snowRoof;
  const seed = opts.seed || 3;
  const facY = roofH + 2;
  const baseY = facY + facH;
  const lights = [], smokes = [];

  /* ---------------- facade ---------------- */
  p.rect(OX, facY, w, facH, WALL[3]);
  for (let y = facY; y < baseY; y++)
    for (let x = OX; x < OX + w; x++) {
      const n = fnoise(x / 7, y / 7, seed);
      if (n > 0.64) p.px(x, y, WALL[4]);
      else if (n < 0.36) p.px(x, y, WALL[2]);
    }
  // coursed stone
  for (let y = facY + 5; y < baseY; y += 6) {
    p.hline(OX, y, w, WALL[1]);
    for (let x = OX + (((y / 6) | 0) % 2) * 7; x < OX + w; x += 14) p.vline(x, y - 5, 5, WALL[1]);
  }
  p.rect(OX, facY, 1, facH, WALL[4]);
  p.rect(OX + w - 1, facY, 1, facH, WALL[1]);
  // the wall falls into shadow at its base, where snow banks against it
  p.rect(OX, baseY - 5, w, 5, WALL[1]);
  p.rect(OX, baseY - 2, w, 2, WALL[0]);
  p.rect(OX - 2, baseY - 1, w + 4, 3, R.snow[2]);
  p.rect(OX - 2, baseY - 1, w + 4, 1, R.snow[3]);

  /* ---------------- warm windows + door ---------------- */
  const winY = facY + Math.round(facH * 0.28);
  const wins = opts.windows || [Math.round(w * 0.16), Math.round(w * 0.62)];
  for (const wx of wins) {
    const X = OX + wx, ww = opts.winW || 13, wh = opts.winH || 15;
    p.rect(X - 2, winY - 2, ww + 4, wh + 4, TRIM[1]);
    p.rect(X - 1, winY - 1, ww + 2, wh + 2, TRIM[3]);
    p.rect(X, winY, ww, wh, R.lamp[2]);
    p.rect(X + 1, winY + 1, ww - 2, Math.round(wh * 0.45), R.lamp[3]);
    p.rect(X + 2, winY + 2, 4, 3, R.lamp[4]);
    p.rect(X, winY + wh - 4, ww, 3, R.lamp[1]);
    p.vline(X + ((ww / 2) | 0), winY, wh, TRIM[2]);
    p.hline(X, winY + ((wh / 2) | 0), ww, TRIM[2]);
    p.rect(X - 3, winY + wh + 2, ww + 6, 2, TRIM[2]);
    p.rect(X - 3, winY + wh + 1, ww + 6, 1, R.snow[4]);
    lights.push([X + ww / 2, winY + wh / 2, 46, true]);
  }
  if (opts.door !== false) {
    const dx = OX + (opts.doorX != null ? opts.doorX : Math.round(w / 2 - 7));
    const dy = baseY - 21;
    p.rect(dx - 2, dy - 3, 18, 24, WALL[4]);
    p.rect(dx, dy, 14, 21, TRIM[1]);
    for (let i = 0; i < 4; i++) p.rect(dx + (4 - i), dy - 4 + i, 14 - (4 - i) * 2, 1, TRIM[1]);
    for (let px2 = dx + 2; px2 < dx + 14; px2 += 4) p.vline(px2, dy - 3, 24, TRIM[0]);
    p.rect(dx, dy, 1, 21, TRIM[2]);
    p.px(dx + 11, dy + 11, R.gold[3]);
    // lamp over the door
    p.rect(dx + 6, dy - 9, 3, 4, R.lamp[3]);
    p.px(dx + 7, dy - 8, R.lamp[4]);
    lights.push([dx + 7, dy - 7, 34, true]);
  }

  /* ---------------- roof plane ---------------- */
  const ridgeHalf = Math.max(2, Math.round(w * 0.06));
  for (let i = 0; i < roofH; i++) {
    const t = i / (roofH - 1);
    const half = Math.round(ridgeHalf + (w / 2 + eave - ridgeHalf) * Math.pow(t, 0.86));
    const y = 3 + i;
    const x0 = OX + w / 2 - half;
    const len = half * 2;
    // shingle courses: a lit band, then progressively deeper tone
    const c = i % 6;
    let shade = c === 0 ? 4 : c < 3 ? 3 : c < 5 ? 2 : 1;
    if (t > 0.86) shade = Math.max(1, shade - 1);          // eaves fall into shade
    p.rect(x0, y, len, 1, ROOF[shade]);
    // scalloped shingle tips every course
    if (c === 5)
      for (let sx = 0; sx < len; sx += 5)
        p.px(x0 + sx + (((i / 6) | 0) % 2 ? 2 : 0), y, ROOF[0]);
    // snow lying along the top of each course
    if (t > 0.12 && fnoise(i / 3.5, seed, 7) > 0.36) {
      const inset = 1 + ((hash2(i, seed, 9) * 3) | 0);
      const sl = Math.max(1, len - inset * 2);
      p.rect(x0 + inset, y, sl, 1, SNOW[c === 0 ? 4 : 3]);
      if (c === 1) p.rect(x0 + inset + 1, y, Math.max(1, sl - 2), 1, SNOW[2]);
    }
  }
  // ridge cap
  p.rect(OX + w / 2 - ridgeHalf - 1, 2, ridgeHalf * 2 + 2, 3, ROOF[4]);
  p.rect(OX + w / 2 - ridgeHalf - 1, 1, ridgeHalf * 2 + 2, 2, SNOW[4]);
  // eave board + icicles
  p.rect(OX - eave, facY - 3, w + eave * 2, 3, TRIM[1]);
  p.rect(OX - eave, facY - 3, w + eave * 2, 1, TRIM[3]);
  for (let x = 0; x < w + eave * 2; x += 3)
    if (hash2(x, seed, 17) > 0.5) {
      const len = 2 + ((hash2(x, seed, 18) * 4) | 0);
      p.vline(OX - eave + x, facY, len, R.moon[2]);
      p.px(OX - eave + x, facY + len, R.moon[3]);
    }

  /* ---------------- chimneys ---------------- */
  for (const cx of (opts.chimneys || [Math.round(w * 0.72)])) {
    const ch = 14 + ((hash2(cx, seed, 23) * 6) | 0);
    const t = (cx / w);
    const roofY = 3 + Math.round(roofH * Math.pow(Math.abs(t - 0.5) * 2, 1 / 0.86));
    const cy = Math.max(0, roofY - ch);
    p.rect(OX + cx, cy, 10, ch + 4, R.brick[2]);
    p.rect(OX + cx, cy, 2, ch + 4, R.brick[3]);
    p.rect(OX + cx + 8, cy, 2, ch + 4, R.brick[1]);
    for (let by = cy + 3; by < cy + ch; by += 4) p.hline(OX + cx, by, 10, R.brick[1]);
    p.rect(OX + cx - 1, cy - 2, 12, 2, R.brick[3]);
    p.rect(OX + cx - 1, cy - 3, 12, 1, SNOW[4]);
    p.rect(OX + cx + 2, cy - 1, 6, 1, R.void[0]);
    smokes.push([OX + cx + 5, cy - 4]);
  }

  outline(p.canvas, '#050212');
  return { canvas: p.canvas, lights, smokes, groundY: baseY + 1 };
}

/* ------------------------------------------------------------------ *
 * Shopfront: front-facing gable, scalloped shingles flanking a river-rock
 * gable end, a snow-laden fascia carrying the sign, and a band of big lit
 * windows underneath. Built to the same architectural grammar as the
 * reference winter town, from original geometry.
 * ------------------------------------------------------------------ */

/** One course of fish-scale shingles across [x0,x1) at row y. */
function scallopCourse(p, x0, x1, y, col, dark) {
  for (let x = x0; x < x1; x++) {
    const i = x - x0;
    const m = i % 5;
    // each shingle is a shallow arc: dip in the middle, lift at the seams
    const lift = (m === 0 || m === 4) ? 0 : (m === 2 ? 2 : 1);
    p.px(x, y + lift, col);
    p.px(x, y + lift + 1, col);
    if (m === 0) p.px(x, y, dark);
  }
}

/** Tapering icicle hanging from (x,y). */
function icicle(p, x, y, len) {
  for (let i = 0; i < len; i++) {
    p.px(x, y + i, i < len - 2 ? R.moon[3] : R.moon[2]);
    if (i < len * 0.45) p.px(x + 1, y + i, R.moon[2]);
  }
  p.px(x, y + len, R.moon[1]);
}

/**
 * opts: { w, sign, signCol, roof, stone, trim, seed, lit }
 */
function right0(x, cx) { return x > cx; }

export function shopfront(opts = {}) {
  const w = opts.w || 116;
  const gh = opts.gableH || Math.round(w * 0.56);      // gable height
  const fasc = 16;                                     // fascia + snow band
  const band = 34;                                     // shop window band
  const base = 8;
  // the roof does not stop at the gable — it runs back up-screen behind the
  // apex, split by a ridge. Leaving this out is what makes a building read as
  // a flat elevation sticker instead of a solid volume.
  const depthRun = Math.round(w * 0.42);
  const H = depthRun + gh + fasc + band + base;
  const eave = 6;
  const p = new P(w + eave * 2, H + 6);
  const OX = eave;
  const cx = OX + (w >> 1);
  const ROOF = R[opts.roof || 'roofSlate'];
  const STONE = R[opts.stone || 'river'];
  const TRIM = R[opts.trim || 'wood'];
  const SNOW = R.snowRoof;
  const seed = opts.seed || 5;
  const lights = [], smokes = [];
  const apexY = depthRun;
  const fascY = depthRun + gh;
  const bandY = fascY + fasc;
  const groundY = bandY + band + base;

  /* ---------------- roof running back behind the ridge ---------------- */
  {
    const xl = cx - (w / 2 + eave), xr = cx + (w / 2 + eave);
    for (let y = 0; y < depthRun; y++) {
      const t = y / (depthRun - 1);                    // 0 far end, 1 at apex
      // 5px course exposure with a half-course offset, and every shingle gets a
      // lit top edge and a dark butt — flat bands read as a painted slab
      const course = y % 5;
      const band = (y / 5) | 0;
      for (let x = xl; x <= xr; x++) {
        const right = x > cx;
        const sx = x + (band % 2 ? 6 : 0);
        const within = ((sx % 12) + 12) % 12;
        let shade = course === 0 ? 3 : course === 1 ? 2 : course < 4 ? 1 : 0;
        if (within === 0) shade = 0;                  // vertical joint between tiles
        if (right) shade = Math.min(4, shade + 1);
        p.px(x, y, ROOF[Math.max(0, shade)]);
      }
      // a weathered tile roughly one in seven
      if (course === 1)
        for (let x = xl; x <= xr; x += 12)
          if (hash2(x, band + seed, 55) > 0.72) {
            const t2 = hash2(x, band, 56) > 0.5 ? 4 : 0;
            for (let k = 0; k < 11 && x + k <= xr; k++) p.px(x + k, y, ROOF[t2]);
          }
      // snow lies heaviest at the far end and along the ridge
      // patchy snow — the shingles must stay visible or the roof dissolves
      // into the snowfield behind it
      const cover = 0.40 - t * 0.26;
      for (let x = xl; x <= xr; x++) {
        const q = fnoise(x / 6, y / 6, seed + 11);
        if (q < cover) p.px(x, y, SNOW[q < cover * 0.5 ? 3 : 2]);
      }
      // ridge, running the whole depth
      p.rect(cx - 1, y, 2, 1, ROOF[4]);
      p.px(cx + 1, y, ROOF[0]);
      if (y % 4 !== 3) p.px(cx - 1, y, SNOW[4]);
      // verge boards down both outer edges keep the plane readable
      p.rect(xl, y, 2, 1, ROOF[0]);
      p.rect(xr - 1, y, 2, 1, ROOF[0]);
      p.px(xl + 2, y, ROOF[4]);
      // far eave
      if (y < 3) {
        p.rect(xl, y, xr - xl, 1, ROOF[y === 0 ? 0 : 1]);
        if (y > 0) p.rect(xl + 1, y, xr - xl - 2, 1, SNOW[4]);
      }
    }
  }

  /* ---------------- gable: roof slopes flanking a stone end ------------- */
  const rakeT = Math.round(w * 0.24);                  // roof band thickness
  for (let yy = 0; yy < gh; yy++) {
    const y = apexY + yy;
    const t = yy / (gh - 1);
    const half = Math.round((w / 2 + eave) * t);
    if (half < 2) continue;
    const xL = cx - half, xR = cx + half;
    // near the apex the slopes are all there is — never let a band overhang
    const rt = Math.min(rakeT, half);

    // --- stone gable end between the two roof slopes ---
    const sL = xL + rt, sR = xR - rt;
    for (let x = sL; x < sR; x++) {
      const n = fnoise(x / 5, yy / 5, seed);
      p.px(x, y, STONE[n > 0.62 ? 3 : n < 0.36 ? 1 : 2]);
    }
    // rounded river stones picked out of the mass
    if (yy % 5 === 2) {
      for (let x = sL + ((yy / 5 | 0) % 2 ? 4 : 0); x < sR - 3; x += 8) {
        const b = 1 + Math.round(hash2(x, yy + seed, 401) * 2);
        p.ellipse(x + 3, y + 1, 3, 2, STONE[b]);
        p.ellipse(x + 2, y, 2, 1, STONE[Math.min(4, b + 1)]);
        p.px(x + 5, y + 2, STONE[0]);
      }
    }

    // --- roof slopes ---
    for (const [a, b] of [[xL, xL + rt], [xR - rt, xR]]) {
      const course = (yy % 6);
      const shade = course === 0 ? 4 : course < 3 ? 3 : 2;
      p.rect(a, y, b - a, 1, ROOF[shade]);
      if (course === 0) scallopCourse(p, a, b, y, ROOF[3], ROOF[1]);
      // the slope facing right catches the light
      if (a > cx) p.rect(a, y, b - a, 1, ROOF[Math.min(4, shade + 1)]);
      // snow lies heavy near the ridge and thins toward the eave
      const cover = 1 - t * 0.55;
      if (fnoise(yy / 3.5, seed, 7) < cover) {
        for (let x = a; x < b; x++) {
          const q = fnoise(x / 4.5, yy / 4.5, seed + 3);
          if (q < cover * 0.95) p.px(x, y, SNOW[q < cover * 0.55 ? 4 : 3]);
        }
      }
    }
    // rake boards along both outer edges
    p.rect(xL, y, 3, 1, ROOF[4]);
    p.rect(xR - 3, y, 3, 1, ROOF[1]);
    p.px(xL, y, SNOW[4]);
  }
  // apex cap where the gable meets the receding ridge
  p.rect(cx - 4, apexY - 2, 9, 4, ROOF[4]);
  p.rect(cx - 5, apexY - 3, 11, 2, SNOW[4]);

  /* ---------------- arched gable window ---------------- */
  {
    const ww = Math.round(w * 0.16), wh = Math.round(gh * 0.42);
    const wx = cx - (ww >> 1), wy = apexY + Math.round(gh * 0.34);
    p.rect(wx - 3, wy - 2, ww + 6, wh + 5, TRIM[1]);
    for (let i = 0; i < 6; i++) p.rect(wx - 3 + (6 - i), wy - 8 + i, ww + 6 - (6 - i) * 2, 1, TRIM[1]);
    p.rect(wx, wy, ww, wh, R.lamp[3]);
    for (let i = 0; i < 5; i++) p.rect(wx + (5 - i), wy - 5 + i, ww - (5 - i) * 2, 1, R.lamp[3]);
    p.rect(wx + 1, wy + 1, ww - 2, Math.round(wh * 0.4), R.lamp[4]);
    // muntins: two columns, three rows
    p.vline(wx + ((ww / 2) | 0), wy - 5, wh + 5, TRIM[2]);
    for (let k = 1; k < 3; k++) p.hline(wx, wy + Math.round(wh * k / 3), ww, TRIM[2]);
    p.frame(wx - 1, wy - 1, ww + 2, wh + 2, TRIM[3]);
    // pane glints
    p.px(wx + 2, wy + 3, '#fffdf0'); p.px(wx + 2, wy + 4, '#fffdf0');
    p.px(wx + ww - 4, wy + Math.round(wh * 0.5), '#fffdf0');
    lights.push([wx + ww / 2, wy + wh / 2, 54, true]);
  }

  /* ---------------- fascia, sign, snow drift ---------------- */
  p.rect(OX - eave, fascY, w + eave * 2, fasc, '#2b182f');
  p.rect(OX - eave, fascY, w + eave * 2, 2, '#3a2440');
  p.rect(OX - eave, fascY + fasc - 2, w + eave * 2, 2, '#1d1020');
  // heavy snow sitting on the fascia with a soft wavy underside
  for (let x = 0; x < w + eave * 2; x++) {
    const d = 4 + Math.round(2.6 * Math.sin(x * 0.11 + seed) + 1.6 * Math.sin(x * 0.31));
    p.rect(OX - eave + x, fascY - 3, 1, d + 3, R.snow[4]);
    p.px(OX - eave + x, fascY - 3 + d + 2, R.snow[3]);
  }
  // icicles off the snow band
  for (let x = 2; x < w + eave * 2; x += 3)
    if (hash2(x, seed, 17) > 0.42)
      icicle(p, OX - eave + x, fascY + 3, 2 + ((hash2(x, seed, 18) * 6) | 0));
  // sign lettering
  if (opts.sign) {
    drawText(p.x, opts.sign, cx, fascY + fasc - 11,
      { color: opts.signCol || '#a13636', align: 'center', scale: 1, tracking: 2, shadow: '#150a12' });
  }

  /* ---------------- shop window band ---------------- */
  p.rect(OX, bandY, w, band, TRIM[2]);
  p.rect(OX, bandY, w, 2, TRIM[3]);
  const doorW = 20, dx = cx - (doorW >> 1);
  for (const [wx0, wx1] of [[OX + 4, dx - 3], [dx + doorW + 3, OX + w - 4]]) {
    const ww = wx1 - wx0;
    if (ww < 10) continue;
    p.rect(wx0, bandY + 4, ww, band - 10, TRIM[1]);
    p.rect(wx0 + 2, bandY + 6, ww - 4, band - 14, R.lamp[3]);
    // orange heat at the top of every pane, gold below
    p.rect(wx0 + 2, bandY + 6, ww - 4, 5, R.lamp[2]);
    p.rect(wx0 + 3, bandY + 11, ww - 6, band - 20, R.lamp[4]);
    // mullions
    const panes = Math.max(2, Math.round(ww / 11));
    for (let k = 1; k < panes; k++)
      p.vline(wx0 + Math.round(ww * k / panes), bandY + 4, band - 10, TRIM[1]);
    p.hline(wx0, bandY + 12, ww, TRIM[1]);
    // little curtain hooks catching the light
    for (let k = 0; k < panes; k++)
      p.px(wx0 + Math.round(ww * (k + 0.4) / panes), bandY + 16, R.lamp[1]);
    p.frame(wx0, bandY + 4, ww, band - 10, TRIM[0]);
    p.rect(wx0 - 1, bandY + band - 6, ww + 2, 3, TRIM[2]);
    lights.push([wx0 + ww / 2, bandY + band / 2, 62, true]);
  }

  /* ---------------- doorway ---------------- */
  p.rect(dx - 2, bandY + 2, doorW + 4, band - 2, TRIM[1]);
  p.rect(dx, bandY + 4, doorW, band - 4, R.lamp[2]);        // warm spill from inside
  p.rect(dx + 2, bandY + 6, doorW - 4, band - 8, R.lamp[3]);
  // open leaf hinged on the left
  p.rect(dx - 1, bandY + 4, 7, band - 6, TRIM[2]);
  p.rect(dx - 1, bandY + 4, 7, 1, TRIM[3]);
  for (let k = 1; k < 6; k += 2) p.vline(dx - 1 + k, bandY + 4, band - 6, TRIM[1]);
  p.px(dx + 4, bandY + Math.round(band * 0.55), R.gold[3]);
  lights.push([cx, bandY + band * 0.6, 50, true]);

  /* ---------------- stoop + light spill on the snow ---------------- */
  const gy = groundY;
  p.ellipse(cx, gy - 2, 15, 5, R.stone[1]);
  p.ellipse(cx, gy - 3, 15, 5, R.stone[2]);
  for (let a = 0; a < 360; a += 26) {
    const rad = a * Math.PI / 180;
    p.ellipse(cx + Math.cos(rad) * 11, gy - 3 + Math.sin(rad) * 3.4, 3, 2, R.stone[3]);
  }
  p.rect(OX, gy - 4, w, 4, R.snow[3]);
  p.rect(OX, gy - 4, w, 1, R.snow[4]);
  // warm light thrown onto the snow in front of each window
  for (let k = 0; k < 10; k++) {
    const lx = OX + 6 + ((hash2(k, seed, 21) * (w - 12)) | 0);
    if (Math.abs(lx - cx) < 14) continue;
    p.hline(lx, gy - 3 + ((hash2(k, seed, 22) * 3) | 0), 3 + ((hash2(k, seed, 23) * 4) | 0), R.lamp[3]);
  }

  /* ---------------- chimney ---------------- */
  {
    const ccx = OX + Math.round(w * (opts.chimneyX != null ? opts.chimneyX : 0.2));
    const t = Math.abs((ccx - cx)) / (w / 2 + eave);
    const roofY = apexY + Math.round(gh * t);
    const ch = 20;
    const cy = Math.max(0, roofY - ch + 6);
    p.rect(ccx, cy, 11, ch + 6, R.brick[2]);
    p.rect(ccx, cy, 2, ch + 6, R.brick[3]);
    p.rect(ccx + 9, cy, 2, ch + 6, R.brick[1]);
    for (let by = cy + 3; by < cy + ch + 4; by += 4) p.hline(ccx, by, 11, R.brick[1]);
    p.rect(ccx - 1, cy - 2, 13, 2, R.brick[3]);
    p.rect(ccx - 1, cy - 3, 13, 1, SNOW[4]);
    p.rect(ccx + 2, cy - 1, 3, 1, R.void[0]);
    p.rect(ccx + 6, cy - 1, 3, 1, R.void[0]);
    smokes.push([ccx + 5, cy - 4]);
  }

  outline(p.canvas, '#050212');
  return { canvas: p.canvas, lights, smokes, groundY };
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

/**
 * Conifer built from overlapping jagged needle tufts rather than smooth
 * triangles — at this scale the silhouette is most of the read, and a clean
 * cone looks like a Christmas-tree icon instead of a tree.
 */
export function pineTree(size = 1, snowy = true, seed = 1, hue = 'pine') {
  const w = Math.round(66 * size), h = Math.round(112 * size);
  const p = new P(w, h);
  const cx = w >> 1;
  const PN = R[hue] || R.pine;
  const trunkH = Math.round(h * 0.09);

  // trunk + root flare
  p.rect(cx - 4, h - trunkH, 9, trunkH, R.bark[1]);
  p.rect(cx - 4, h - trunkH, 3, trunkH, R.bark[2]);
  p.rect(cx + 4, h - trunkH, 1, trunkH, R.bark[0]);
  for (let i = 0; i < 4; i++) {
    p.px(cx - 4 - i, h - 4 + Math.round(i * 0.7), R.bark[1]);
    p.px(cx + 4 + i, h - 4 + Math.round(i * 0.7), R.bark[1]);
  }
  p.ellipse(cx, h - 2, 9, 2, R.bark[0]);

  /** one downward-drooping needle tuft */
  const tuft = (x, y, len, dir, shade) => {
    for (let i = 0; i < len; i++) {
      const yy = y + Math.round(i * 0.55);
      const xx = x + dir * i;
      p.px(xx, yy, PN[shade]);
      p.px(xx, yy + 1, PN[Math.max(0, shade - 1)]);
      if (i % 2 === 0) p.px(xx, yy - 1, PN[Math.min(4, shade + 1)]);
    }
  };

  const tiers = Math.round(11 * size);
  const top = Math.round(h * 0.045);
  for (let t = 0; t < tiers; t++) {
    const f = t / (tiers - 1);                       // 0 at top, 1 at base
    const ty = top + Math.round(f * (h - trunkH - top + 8) * 0.74)
             + Math.round((hash2(t, seed, 23) - 0.5) * 5);
    const rad = Math.max(3, Math.round((w / 2 - 2) * Math.pow(f, 0.62)));
    const jitter = (hash2(t, seed, 11) - 0.5) * 3;

    // Each tier is drawn column by column down to a *ragged* skirt line. The
    // raggedness is the whole read — a clean skirt edge looks like a plastic
    // Christmas tree rather than a conifer.
    const depth = Math.max(5, Math.round(rad * 0.95));
    const snowCover = hash2(t, seed, 17) > 0.18;
    for (let n = -rad; n <= rad; n++) {
      const a = Math.abs(n) / rad;
      // a bough droops away from the trunk: both its upper and lower surfaces
      // slope down as they run out, and both edges are jagged
      const jagT = Math.round((hash2(n + 40, t + seed * 7, 21) - 0.5) * 2.4);
      const jagB = Math.round((hash2(n + 90, t + seed * 3, 22) - 0.35) * 3.4);
      const colTop = ty + Math.round(depth * 0.9 * Math.pow(a, 1.25)) + jagT;
      const thick = Math.max(2, Math.round(depth * (0.62 - 0.34 * a)));
      const colBottom = colTop + thick + jagB;
      const x = cx + n + jitter;
      for (let y = colTop; y <= colBottom; y++) {
        const v = (y - colTop) / Math.max(1, colBottom - colTop);
        // lit on the upper-left, shadow gathering under and to the right
        // use the full ramp — clamping to the top three steps left the frosted
        // variants as flat white cones with no needle structure
        let shade = v < 0.28 ? 4 : v < 0.52 ? 3 : v < 0.78 ? 2 : 1;
        if (n < -rad * 0.15 && v < 0.45) shade = Math.min(4, shade + 1);
        if (n > rad * 0.42) shade = Math.max(0, shade - 1);
        p.px(x, y, PN[shade]);
      }
      // dark lip along the underside
      p.px(x, colBottom, PN[1]);
      // needles poking past the silhouette
      if (hash2(n, t + seed * 5, 13) > 0.6)
        tuft(x, colBottom - 1, 2, n < 0 ? -1 : 1, 1);

      if (snowCover && hash2(n, t + seed, 18) > 0.28) {
        // snow settles on the upper surface, patchy and thinning outward
        const cap = Math.max(1, Math.round((1 - a) * 2.4));
        for (let k = 0; k < cap && colTop + k <= colBottom; k++)
          p.px(x, colTop + k, R.snow[k === 0 ? 4 : 3]);
      }
    }
  }

  // tip
  p.vline(cx, top - 3, 5, PN[3]);
  p.px(cx, top - 4, PN[4]);
  if (snowy) { p.px(cx, top - 4, R.snow[4]); p.px(cx, top - 3, R.snow[3]); }

  outline(p.canvas, mix(PN[0], '#050212', 0.35), false, true);
  return p.canvas;
}

export function bareTree(seed = 1) {
  const w = 52, h = 92;
  const p = new P(w, h);
  const cx = w >> 1;
  const trunkH = Math.round(h * 0.55);

  // trunk: warm bark, lit from the upper left, with a root flare
  for (let y = h - trunkH; y < h; y++) {
    const t = (y - (h - trunkH)) / trunkH;
    const half = Math.round(2 + t * 3.2);
    for (let x = -half; x <= half; x++) {
      const a = (x + half) / (half * 2 || 1);
      const shade = a < 0.28 ? 3 : a < 0.62 ? 2 : 1;
      p.px(cx + x, y, R.bark[shade]);
    }
    if (hash2(y, seed, 31) > 0.72) p.px(cx + ((hash2(y, seed, 32) * 5) | 0) - 2, y, R.bark[0]);
  }
  for (let i = 0; i < 7; i++) {
    p.px(cx - 5 - i, h - 5 + Math.round(i * 0.7), R.bark[1]);
    p.px(cx + 5 + i, h - 5 + Math.round(i * 0.7), R.bark[1]);
    p.px(cx - 5 - i, h - 4 + Math.round(i * 0.7), R.bark[0]);
    p.px(cx + 5 + i, h - 4 + Math.round(i * 0.7), R.bark[0]);
  }
  p.ellipse(cx, h - 1, 11, 2, R.bark[0]);

  // branches, thinning as they fork
  function branch(x, y, ang, len, thick, depth) {
    let bx = x, by = y, a = ang;
    for (let i = 0; i < len; i++) {
      bx += Math.cos(a); by += Math.sin(a);
      for (let t = 0; t < thick; t++) {
        p.px(bx + t, by, R.bark[2]);
        if (thick > 1) p.px(bx, by, R.bark[3]);
      }
      // snow rides the upper surface of every limb
      if (hash2(i, depth * 13 + seed, 33) > 0.42) p.px(bx, by - 1, R.snow[4]);
      a += (hash2(i, depth * 7 + seed + len, 34) - 0.5) * 0.32;
    }
    if (depth < 3 && len > 5) {
      branch(bx, by, a - 0.55 - hash2(depth, seed, 35) * 0.3, Math.round(len * 0.62),
             Math.max(1, thick - 1), depth + 1);
      branch(bx, by, a + 0.55 + hash2(depth, seed, 36) * 0.3, Math.round(len * 0.62),
             Math.max(1, thick - 1), depth + 1);
    }
  }
  const topY = h - trunkH;
  branch(cx, topY, -Math.PI / 2, 16, 3, 0);
  branch(cx - 1, topY + 6, -Math.PI / 2 - 0.85, 13, 2, 1);
  branch(cx + 2, topY + 4, -Math.PI / 2 + 0.85, 13, 2, 1);
  branch(cx - 2, topY + 16, -Math.PI / 2 - 1.15, 9, 2, 2);
  branch(cx + 3, topY + 19, -Math.PI / 2 + 1.15, 9, 2, 2);

  // snow packed in the crooks
  for (let k = 0; k < 5; k++) {
    const bx = 8 + ((hash2(k, seed, 37) * (w - 16)) | 0);
    const by = 10 + ((hash2(k, seed, 38) * (trunkH - 6)) | 0);
    p.px(bx, by, R.snow[3]); p.px(bx + 1, by, R.snow[4]);
  }
  outline(p.canvas, mix(R.bark[0], '#050212', 0.3), false, true);
  return p.canvas;
}

/**
 * Soft blue shadow cast onto the snow by a building. Returned as its own
 * translucent canvas so it can be laid down as a floor decal under everything.
 */
export function castShadow(w, h) {
  const c = makeCanvas(w, h);
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const dx = (i - w / 2) / (w / 2), dy = (j - h / 2) / (h / 2);
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1) continue;
      const a = 0.62 * (1 - Math.pow(d, 2.4));
      x.fillStyle = `rgba(96,110,214,${a.toFixed(3)})`;
      x.fillRect(i, j, 1, 1);
    }
  }
  return c;
}

export function lampPost() {
  const p = new P(16, 54);
  const G = R.lampPost;
  // green enamel column on a stepped base
  p.rect(7, 12, 3, 36, G[2]);
  p.rect(7, 12, 1, 36, G[3]);
  p.rect(9, 12, 1, 36, G[1]);
  p.rect(4, 46, 9, 4, G[1]);
  p.rect(4, 45, 9, 1, G[2]);
  p.rect(3, 50, 11, 3, G[0]);
  p.rect(3, 49, 11, 1, R.snow[3]);
  // decorative collar + scroll brackets
  p.rect(5, 18, 7, 2, G[3]);
  p.px(5, 22, G[2]); p.px(4, 23, G[2]); p.px(11, 22, G[2]); p.px(12, 23, G[2]);
  // lantern housing
  p.rect(3, 6, 11, 2, G[1]);
  p.rect(4, 4, 9, 2, G[2]);
  p.rect(6, 1, 5, 3, G[1]);
  p.px(8, 0, G[3]);
  p.rect(4, 8, 9, 9, G[1]);
  p.rect(5, 8, 7, 9, R.lamp[2]);
  p.rect(5, 9, 7, 6, R.lamp[3]);
  p.rect(6, 10, 5, 4, R.lamp[4]);
  p.rect(7, 11, 3, 2, '#fffdf0');
  p.vline(7, 8, 9, G[1]); p.vline(10, 8, 9, G[1]);
  p.rect(3, 17, 11, 2, G[2]);
  p.rect(3, 16, 11, 1, R.snow[4]);
  p.rect(4, 3, 9, 1, R.snow[4]);
  // red ribbon tied under the lantern
  p.rect(5, 20, 7, 2, R.ember[1]);
  p.px(4, 22, R.ember[1]); p.px(12, 22, R.ember[1]);
  p.px(4, 23, R.ember[0]); p.px(12, 23, R.ember[0]);
  p.px(6, 20, R.ember[3]);
  outline(p.canvas, '#050212');
  return { canvas: p.canvas, light: [8, 12, 68] };
}

/** Low picket fence panel, snow-capped. */
export function fencePanel(seed = 1) {
  const p = new P(32, 22);
  for (let i = 0; i < 5; i++) {
    const x = 1 + i * 6;
    p.rect(x, 4, 4, 17, R.wood[2]);
    p.rect(x, 4, 1, 17, R.wood[3]);
    p.rect(x + 3, 4, 1, 17, R.wood[1]);
    // pointed cap
    p.px(x + 1, 3, R.wood[2]); p.px(x + 2, 3, R.wood[2]);
    p.rect(x, 2, 4, 1, R.snow[4]);
    p.rect(x, 3, 4, 1, R.snow[3]);
    if (hash2(i, seed, 3) > 0.6) p.rect(x, 9, 4, 1, R.wood[1]);
  }
  p.rect(0, 8, 32, 2, R.wood[2]);
  p.rect(0, 8, 32, 1, R.wood[3]);
  p.rect(0, 15, 32, 2, R.wood[2]);
  p.rect(0, 15, 32, 1, R.wood[3]);
  p.rect(0, 7, 32, 1, R.snow[3]);
  outline(p.canvas, '#050212');
  return p.canvas;
}

/** Planter box with a small snow-dusted shrub. */
export function planter(seed = 1) {
  const p = new P(26, 22);
  const B = R.pineB;
  p.ellipse(9, 8, 7, 5, B[1]);
  p.ellipse(16, 9, 6, 4, B[2]);
  p.ellipse(8, 6, 5, 3, B[3]);
  for (let k = 0; k < 10; k++)
    p.px(3 + ((hash2(k, seed, 5) * 20) | 0), 3 + ((hash2(k, seed, 6) * 9) | 0), B[4]);
  p.ellipse(8, 5, 4, 2, R.snow[4]);
  p.ellipse(17, 7, 3, 1, R.snow[3]);
  // a few red berries
  for (let k = 0; k < 3; k++)
    p.px(5 + ((hash2(k, seed, 7) * 16) | 0), 5 + ((hash2(k, seed, 8) * 7) | 0), R.ember[2]);
  p.rect(1, 12, 24, 9, R.wood[2]);
  p.rect(1, 12, 24, 1, R.wood[3]);
  p.rect(1, 20, 24, 1, R.wood[0]);
  for (let x = 4; x < 24; x += 6) p.vline(x, 12, 9, R.wood[1]);
  p.rect(0, 11, 26, 2, R.wood[3]);
  p.rect(0, 10, 26, 1, R.snow[4]);
  outline(p.canvas, '#050212');
  return p.canvas;
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
  const WOODS = ['oak', 'wood', 'floor', 'caramel'];
  const TRIMS = ['gold', 'gold', 'gold', 'ruby'];
  const W = R[WOODS[style % 4]], T = R[TRIMS[style % 4]];
  // glass case top
  p.rect(0, 6, 32, 4, mix(R.cream[2], W[1], 0.5));
  p.rect(0, 6, 32, 1, R.cream[4]);
  p.rect(1, 7, 30, 2, mix(W[1], R.lamp[1], 0.35));
  for (let x = 2; x < 30; x += 7) p.vline(x, 6, 4, R.cream[3]);
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
  const W = R[['oak', 'wood', 'frameWood'][style % 3]];   // interior woods stay warm
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
    p.rect(jx, jy, 6, 6, mix(col[2], R.cream[3], 0.28));
    p.rect(jx, jy, 6, 1, R.cream[4]);
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

/**
 * Conching machine — the conventional route. A slow motorised drum that grinds
 * a batch unattended, in contrast to the cauldron's hands-on tempering.
 */
export function conche(frame = 0) {
  const p = new P(34, 34);
  const M = R.ink, B = R.brick;
  // brick plinth
  p.rect(2, 24, 30, 9, B[2]);
  p.rect(2, 24, 30, 1, B[3]);
  for (let y = 27; y < 33; y += 3) p.hline(2, y, 30, B[1]);
  // drum
  p.ellipse(17, 15, 14, 10, M[1]);
  p.ellipse(17, 14, 14, 10, M[2]);
  p.ellipse(13, 10, 8, 5, M[3]);
  p.ellipse(11, 7, 4, 2, M[4]);
  // iron bands
  for (const bx of [8, 17, 26]) {
    for (let y = 5; y < 24; y++) {
      const dx = Math.round(Math.sin((y - 5) / 19 * Math.PI) * 1.5);
      p.px(bx + dx, y, M[3]);
    }
  }
  // rotating hatch shows the chocolate turning over
  const a = frame * Math.PI / 2;
  p.ellipse(17, 13, 6, 5, R.cocoa[1]);
  p.ellipse(17, 13, 5, 4, R.cocoa[2]);
  p.ellipse(17 + Math.cos(a) * 2, 13 + Math.sin(a) * 1.6, 3, 2, R.milk[3]);
  p.px(17 + Math.cos(a) * 2, 12 + Math.sin(a) * 1.6, R.milk[4]);
  p.ring(17, 13, 6, 5, R.gold[2]);
  // crank + flywheel
  p.rect(30, 12, 3, 3, M[3]);
  p.circle(31, 18, 4, M[2]);
  p.circle(31, 18, 3, M[3]);
  p.px(31 + Math.cos(-a) * 2, 18 + Math.sin(-a) * 2, R.gold[3]);
  // funnel
  p.rect(12, 0, 10, 3, M[3]);
  p.rect(13, 3, 8, 3, M[2]);
  p.rect(15, 6, 4, 2, M[1]);
  outline(p.canvas, '#050212');
  return { canvas: p.canvas, light: [17, 14, 30] };
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
  const F = R.rose, G = R.gold, D = R.ruby;
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
  // hard keyline, and a single contact line along the bottom edge only
  p.frame(0, 0, w, h, '#2a0f18');
  p.hline(1, h - 1, w - 2, '#1d0a12');
  return p.canvas;
}

/**
 * The moulded border that separates an interior room from the black around it.
 * Drawn as a hollow rectangle of concentric bands — dark groove, light bead,
 * mid field — mitred at the corners. This frame is the single strongest
 * signature of the reference interior idiom.
 */
export function roomFrame(w, h) {
  // kept for callers that still want a plain rectangular ring
  return roomFrameFromMask(w, h, (x, y) => x >= 16 && y >= 16 && x < w - 16 && y < h - 16);
}

/**
 * Carved moulding traced around an arbitrary rectilinear room silhouette.
 *
 * The profile is painted from an outward distance field rather than as four
 * straight edges, so every convex and concave corner mitres at 45 degrees for
 * free and the thickness never varies by side — both of which the reference
 * idiom is strict about.
 *
 * `inside(x, y)` returns true for pixels that are room interior.
 */
export function roomFrameFromMask(w, h, inside) {
  const F = R.frameWood;
  // outward-to-inward: keyline, double incised groove, flat field,
  // mirrored groove, keyline. 15px total, then a 2px shadow inside the room.
  const PROFILE = [
    '#210c12',                                  // outer keyline
    '#4d2513', '#70391b', '#4d2513', '#70391b', // double groove
    '#4d2513', '#4d2513', '#4d2513', '#4d2513', '#4d2513',   // flat field
    '#70391b', '#4d2513', '#70391b', '#4d2513', // mirrored groove
    '#210c12',                                  // inner keyline
  ];
  const T = PROFILE.length;

  const inRoom = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (inside(x, y)) inRoom[y * w + x] = 1;

  // BFS outward from the room edge; the queue distance is the profile index
  const dist = new Int16Array(w * h).fill(-1);
  let frontier = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (inRoom[y * w + x]) continue;
      // adjacent to the room (8-way) => distance 0, the outermost inner band
      let touch = false;
      for (let dy = -1; dy <= 1 && !touch; dy++)
        for (let dx = -1; dx <= 1 && !touch; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (inRoom[ny * w + nx]) touch = true;
        }
      if (touch) { dist[y * w + x] = 0; frontier.push(y * w + x); }
    }
  }
  for (let d = 0; d < T && frontier.length; d++) {
    const next = [];
    for (const idx of frontier) {
      const x = idx % w, y = (idx / w) | 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const ni = ny * w + nx;
          if (inRoom[ni] || dist[ni] !== -1) continue;
          dist[ni] = d + 1;
          next.push(ni);
        }
    }
    frontier = next;
  }

  const p = new P(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = dist[y * w + x];
      if (d < 0 || d >= T) continue;
      // the field is painted inward-to-outward, so flip the index
      p.px(x, y, PROFILE[T - 1 - d]);
    }
  }
  // 2px shadow band just inside the room, where the ceiling casts down
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!inRoom[y * w + x]) continue;
      let near = false;
      for (let dy = -2; dy <= 2 && !near; dy++)
        for (let dx = -2; dx <= 2 && !near; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) { near = true; break; }
          if (!inRoom[ny * w + nx]) near = true;
        }
      if (near) p.px(x, y, '#331818');
    }
  return { canvas: p.canvas, inset: T };
}

/**
 * The riser face of a step between two floor levels. Always lighter than both
 * floors it joins, with a bright nosing on top and a near-black line beneath.
 */
export function terraceRiser(w, hue = 'warm') {
  const T = hue === 'cool'
    ? ['#7a6ad0', '#5f51ab', '#4a3e8c', '#3d3374', '#1d1840']
    : hue === 'stone'
    ? ['#d8daff', '#8290e2', '#5f6fc4', '#3f4a92', '#1b2050']
    : ['#bc592b', '#99462a', '#7c352a', '#6b352a', '#3f2019'];
  const p = new P(w, 9);
  p.rect(0, 0, w, 1, T[0]);            // nosing / coping catches the light
  p.rect(0, 1, w, 3, T[1]);
  p.rect(0, 4, w, 3, T[2]);
  p.rect(0, 7, w, 1, T[3]);
  p.rect(0, 8, w, 1, T[4]);            // contact line
  if (hue === 'stone') {
    // running-bond blocks in the wall face, with a snow ridge on the coping
    p.rect(0, 0, w, 2, T[0]);
    p.rect(0, 2, w, 1, T[2]);
    for (let x = 0; x < w; x++) {
      const row = 3;
      if ((x + 8) % 16 === 0) p.rect(x, row, 1, 3, T[3]);
      if ((x + 0) % 16 === 0) p.rect(x, row + 3, 1, 3, T[3]);
    }
    p.rect(0, 5, w, 1, T[3]);
    for (let x = 2; x < w - 2; x += 24)
      if (hash2(x, 9, 73) > 0.55) { p.px(x, 4, T[1]); p.px(x + 1, 6, T[1]); }
    p.rect(0, 0, w, 1, '#eef1ff');     // snow lies along every coping
  } else {
    for (let x = 3; x < w - 3; x += 7)
      if (hash2(x, 5, 71) > 0.5) p.px(x, 3, T[1]);
  }
  return p.canvas;
}

/**
 * Retaining wall between two street levels: a lighter coping band on top and
 * about a tile and a half of running-bond masonry face below. Tall enough to
 * read as a level change rather than a painted line.
 */
export function kerbWall(w) {
  const h = 24;
  const p = new P(w, h);
  const S = R.stone;
  // coping
  p.rect(0, 0, w, 2, S[4]);
  p.rect(0, 0, w, 1, '#eef1ff');           // snow lies along it
  p.rect(0, 2, w, 1, S[2]);
  // face
  p.rect(0, 3, w, h - 5, S[1]);
  for (let ry = 3; ry < h - 2; ry += 5) {
    const off = ((ry / 5) | 0) % 2 ? 8 : 0;
    for (let bx = -16; bx < w; bx += 16) {
      const x = bx + off;
      const b = 1 + Math.round(hash2(x, ry, 81) * 1.4);
      p.rect(x + 1, ry, 14, 4, S[Math.max(0, Math.min(3, b))]);
      p.hline(x + 1, ry, 14, S[Math.min(4, b + 1)]);
    }
    p.hline(0, ry + 4, w, S[0]);
  }
  // diagonal inset panel every so often
  for (let px2 = 6; px2 < w - 10; px2 += 160)
    for (let k = 0; k < 8; k++) { p.px(px2 + k, 6 + k, S[3]); p.px(px2 + 8 - k, 6 + k, S[3]); }
  // base shadow and drifted snow at the foot
  p.rect(0, h - 2, w, 2, '#1b2050');
  return p.canvas;
}

/** Heavy striped curtain hung on a rail, for a back wall. *//** Heavy striped curtain hung on a rail, for a back wall. */
export function curtain(w, h) {
  const p = new P(w, h);
  const C1 = R.roomBrick[2], C2 = R.roomBrick[3];
  // rail
  p.rect(0, 0, w, 4, R.frameWood[2]);
  p.rect(0, 0, w, 1, R.frameWood[3]);
  p.rect(0, 3, w, 1, R.frameWood[1]);
  // pleats
  for (let x = 0; x < w; x++) {
    const band = ((x / 5) | 0) % 2;
    p.rect(x, 4, 1, h - 6, band ? C1 : C2);
    if (x % 5 === 0) p.rect(x, 4, 1, h - 6, R.roomBrick[1]);
    if (x % 5 === 2) p.rect(x, 4, 1, Math.round((h - 6) * 0.35), R.roomBrick[4]);
  }
  // hem
  p.rect(0, h - 3, w, 3, R.roomBrick[1]);
  p.rect(0, h - 3, w, 1, R.roomBrick[2]);
  // frame around the whole hanging
  p.frame(0, 0, w, h, R.frameWood[1]);
  p.frame(1, 1, w - 2, h - 2, R.frameWood[3]);
  outline(p.canvas, '#120301');
  return p.canvas;
}

/**
 * Wall-hung cabinet: a plank shelf on brackets carrying a ledger, a slate and
 * a strongbox — the sort of clutter that makes a back wall feel worked in.
 */
export function wallCabinet(seed = 1) {
  const p = new P(58, 30);
  const W = R.frameWood;
  // back board
  p.rect(2, 4, 54, 20, W[1]);
  p.rect(2, 4, 54, 1, W[2]);
  // shaped pediment
  p.rect(10, 1, 8, 4, W[1]);
  p.rect(11, 0, 6, 2, R.roomBrick[3]);
  p.rect(26, 1, 10, 3, W[1]);
  p.px(30, 0, W[3]); p.px(31, 0, W[3]);
  // open ledger
  p.rect(6, 9, 20, 12, R.cream[3]);
  p.rect(6, 9, 20, 1, R.cream[4]);
  p.vline(16, 9, 12, R.roomBrick[2]);
  for (let ry = 11; ry < 20; ry += 2) {
    p.hline(8, ry, 6, R.frameWood[1]);
    p.hline(18, ry, 6, R.frameWood[1]);
  }
  p.rect(5, 8, 22, 1, R.roomBrick[2]);
  // quill + inkpot
  p.line(27, 8, 30, 16, R.cream[4]);
  p.ellipse(29, 20, 2, 2, R.gold[2]);
  // slate board
  p.rect(31, 10, 20, 11, R.night[0]);
  p.frame(31, 10, 20, 11, W[2]);
  for (let k = 0; k < 9; k++)
    p.px(33 + ((hash2(k, seed, 3) * 16) | 0), 12 + ((hash2(k, seed, 4) * 7) | 0), R.moon[2]);
  // strongbox
  p.rect(52, 9, 5, 12, R.roomBrick[2]);
  p.rect(52, 9, 5, 1, R.roomBrick[3]);
  p.px(54, 15, R.gold[3]);
  // shelf + brackets
  p.rect(2, 21, 54, 3, W[2]);
  p.rect(2, 21, 54, 1, W[3]);
  for (const bx of [6, 26, 48]) { p.rect(bx, 24, 2, 4, W[1]); p.px(bx, 27, W[0]); }
  outline(p.canvas, '#120301');
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
  const S = R.roomBrick;   // warm interior brick, not the cold exterior ramp
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
