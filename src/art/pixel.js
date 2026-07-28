// Low-level pixel-art toolkit. Everything in the game is drawn with this —
// no external image assets, so the whole look lives in code.

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w | 0);
  c.height = Math.max(1, h | 0);
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  return c;
}

export function ctxOf(c) {
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  return x;
}

/* ------------------------------------------------------------------ *
 * Deterministic noise — art must be identical every run.
 * ------------------------------------------------------------------ */
export function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 2D value hash in 0..1 */
export function hash2(x, y, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695040888963407) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth-ish value noise on an integer grid. */
export function vnoise(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

/**
 * Value noise on a lattice that wraps every `cells` steps, so a tile drawn
 * with it is seamless against copies of itself. `x`/`y` are in lattice units.
 */
export function wrapNoise(x, y, cells, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const m = (n) => ((n % cells) + cells) % cells;
  const a = hash2(m(xi), m(yi), seed), b = hash2(m(xi + 1), m(yi), seed);
  const c = hash2(m(xi), m(yi + 1), seed), d = hash2(m(xi + 1), m(yi + 1), seed);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

/** Fractal noise, 3 octaves. */
export function fnoise(x, y, seed = 0) {
  return vnoise(x, y, seed) * 0.55 + vnoise(x * 2.1, y * 2.1, seed + 7) * 0.3
       + vnoise(x * 4.3, y * 4.3, seed + 19) * 0.15;
}

/* ------------------------------------------------------------------ *
 * Painter — integer-snapped drawing ops.
 * ------------------------------------------------------------------ */
export class P {
  constructor(canvasOrW, h) {
    if (typeof canvasOrW === 'number') this.c = makeCanvas(canvasOrW, h);
    else this.c = canvasOrW;
    this.x = ctxOf(this.c);
    this.w = this.c.width; this.h = this.c.height;
  }
  get canvas() { return this.c; }

  clear() { this.x.clearRect(0, 0, this.w, this.h); return this; }

  px(x, y, col) {
    if (!col) return this;
    this.x.fillStyle = col;
    this.x.fillRect(x | 0, y | 0, 1, 1);
    return this;
  }
  rect(x, y, w, h, col) {
    if (!col) return this;
    this.x.fillStyle = col;
    this.x.fillRect(x | 0, y | 0, Math.round(w), Math.round(h));
    return this;
  }
  frame(x, y, w, h, col) {
    this.rect(x, y, w, 1, col); this.rect(x, y + h - 1, w, 1, col);
    this.rect(x, y, 1, h, col); this.rect(x + w - 1, y, 1, h, col);
    return this;
  }
  hline(x, y, len, col) { return this.rect(x, y, len, 1, col); }
  vline(x, y, len, col) { return this.rect(x, y, 1, len, col); }

  line(x0, y0, x1, y1, col) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, col);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  }

  /** Filled axis-aligned ellipse (pixel-perfect, no AA). */
  ellipse(cx, cy, rx, ry, col) {
    if (!col || rx <= 0 || ry <= 0) return this;
    this.x.fillStyle = col;
    for (let y = -ry; y <= ry; y++) {
      const t = 1 - (y * y) / (ry * ry);
      if (t < 0) continue;
      const half = Math.floor(rx * Math.sqrt(t) + 0.5);
      if (half < 0) continue;
      this.x.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2 + 1, 1);
    }
    return this;
  }
  ring(cx, cy, rx, ry, col) {
    for (let a = 0; a < 360; a += 3)
      this.px(Math.round(cx + Math.cos(a * Math.PI / 180) * rx),
              Math.round(cy + Math.sin(a * Math.PI / 180) * ry), col);
    return this;
  }
  circle(cx, cy, r, col) { return this.ellipse(cx, cy, r, r, col); }

  /** Vertical gradient made of hard 1px bands (keeps the pixel feel). */
  vgrad(x, y, w, h, cols) {
    for (let i = 0; i < h; i++) {
      const t = h === 1 ? 0 : i / (h - 1);
      const idx = Math.min(cols.length - 1, Math.floor(t * cols.length));
      this.rect(x, y + i, w, 1, cols[idx]);
    }
    return this;
  }

  /** Scatter deterministic speckles for texture. */
  speckle(x, y, w, h, col, density, seed) {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++)
        if (hash2(x + i, y + j, seed) < density) this.px(x + i, y + j, col);
    return this;
  }

  blit(src, dx, dy) { this.x.drawImage(src, dx | 0, dy | 0); return this; }
  blitPart(src, sx, sy, sw, sh, dx, dy) {
    this.x.drawImage(src, sx | 0, sy | 0, sw | 0, sh | 0, dx | 0, dy | 0, sw | 0, sh | 0);
    return this;
  }

  /** Draw string-art. `art` = array of equal-length strings; `map` = char->color. */
  art(art, map, ox = 0, oy = 0) {
    for (let j = 0; j < art.length; j++) {
      const row = art[j];
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        const col = map[ch];
        if (col) this.px(ox + i, oy + j, col);
      }
    }
    return this;
  }
}

/* ------------------------------------------------------------------ *
 * Post-process helpers (operate on whole canvases).
 * ------------------------------------------------------------------ */

/** Add a 1px outline around every opaque pixel. */
export function outline(canvas, col = '#05050c', diagonal = false) {
  const x = ctxOf(canvas);
  const w = canvas.width, h = canvas.height;
  const src = x.getImageData(0, 0, w, h);
  const d = src.data;
  const out = x.createImageData(w, h);
  const o = out.data;
  o.set(d);
  const oc = col.startsWith('#')
    ? [parseInt(col.slice(1, 3), 16), parseInt(col.slice(3, 5), 16), parseInt(col.slice(5, 7), 16)]
    : [0, 0, 0];
  const A = (i, j) => (i < 0 || j < 0 || i >= w || j >= h) ? 0 : d[(j * w + i) * 4 + 3];
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const k = (j * w + i) * 4;
      if (d[k + 3] > 8) continue;
      let n = A(i - 1, j) + A(i + 1, j) + A(i, j - 1) + A(i, j + 1);
      if (diagonal) n += A(i - 1, j - 1) + A(i + 1, j - 1) + A(i - 1, j + 1) + A(i + 1, j + 1);
      if (n > 8) { o[k] = oc[0]; o[k + 1] = oc[1]; o[k + 2] = oc[2]; o[k + 3] = 255; }
    }
  }
  x.putImageData(out, 0, 0);
  return canvas;
}

/** Return a new canvas with the source tinted toward `col` by `amt`. */
export function tinted(src, col, amt) {
  const c = makeCanvas(src.width, src.height);
  const x = ctxOf(c);
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-atop';
  x.globalAlpha = amt;
  x.fillStyle = col;
  x.fillRect(0, 0, c.width, c.height);
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';
  return c;
}

/** Solid silhouette of a sprite in one color (used for flash + shadows). */
export function silhouette(src, col) {
  const c = makeCanvas(src.width, src.height);
  const x = ctxOf(c);
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = col;
  x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = 'source-over';
  return c;
}

export function flipH(src) {
  const c = makeCanvas(src.width, src.height);
  const x = ctxOf(c);
  x.translate(src.width, 0); x.scale(-1, 1);
  x.drawImage(src, 0, 0);
  return c;
}

/** Crop a sub-rect into its own canvas. */
export function crop(src, sx, sy, sw, sh) {
  const c = makeCanvas(sw, sh);
  ctxOf(c).drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh);
  return c;
}

/** Slice a horizontal strip into N frames. */
export function slice(src, fw) {
  const out = [];
  for (let i = 0; i < Math.floor(src.width / fw); i++)
    out.push(crop(src, i * fw, 0, fw, src.height));
  return out;
}
