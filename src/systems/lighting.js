// Two-pass lighting: a tinted darkness layer with lights punched out,
// then an additive warm bloom pass. This is what gives the game its
// moonlit-with-cozy-windows look.

import { makeCanvas, ctxOf } from '../art/pixel.js';
import { VW, VH } from '../engine/core.js';
import { AMBIENT, hexToRgb, mix } from '../art/palette.js';

export class Lighting {
  constructor() {
    this.shadow = makeCanvas(VW, VH);
    this.sg = ctxOf(this.shadow);
    this.glow = makeCanvas(VW, VH);
    this.gg = ctxOf(this.glow);
    this.lights = [];
    this.gradCache = new Map();
  }

  begin() { this.lights.length = 0; }

  /**
   * Queue a light.
   * x,y in screen space. r = radius. col = hex. intensity 0..1.
   * warm = how much additive bloom it contributes.
   */
  add(x, y, r, col = '#ffd066', intensity = 1, warm = 0.55) {
    if (x < -r || y < -r || x > VW + r || y > VH + r) return;
    this.lights.push({ x, y, r, col, intensity, warm });
  }

  _grad(ctx, key, r, stops) {
    // gradients are cheap enough per-frame; cache by radius+key on the ctx
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    for (const [t, c] of stops) g.addColorStop(t, c);
    return g;
  }

  /**
   * Composite onto the main buffer.
   * ambientKey: 'dawn'|'day'|'dusk'|'night'|'deep'
   */
  render(g, ambientKey, opts = {}) {
    const A = AMBIENT[ambientKey] || AMBIENT.night;
    const amt = opts.amount != null ? opts.amount : A.amt;
    const tint = opts.tint || A.tint;

    /* ---- pass 1: multiplied darkness with lights cut out ----
     * The layer is a *filter*: white = untouched, tinted = darkened toward
     * the ambient colour. Multiplying (rather than laying a translucent
     * colour on top) is what keeps night dark instead of merely foggy. */
    const sg = this.sg;
    sg.globalCompositeOperation = 'source-over';
    sg.clearRect(0, 0, VW, VH);
    sg.fillStyle = mix('#ffffff', tint, Math.max(0, Math.min(1, amt)));
    sg.fillRect(0, 0, VW, VH);

    // vignette: darken the frame edges before the lights are cut out
    if (opts.vignette !== false) {
      const vg = sg.createRadialGradient(VW / 2, VH / 2, VH * 0.34, VW / 2, VH / 2, VH * 1.0);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, `rgba(6,6,18,${opts.vignetteAmt != null ? opts.vignetteAmt : 0.5})`);
      sg.fillStyle = vg;
      sg.fillRect(0, 0, VW, VH);
    }

    // lights erase the filter, restoring full brightness underneath
    sg.globalCompositeOperation = 'destination-out';
    for (const L of this.lights) {
      sg.save();
      sg.translate(L.x, L.y);
      const grd = sg.createRadialGradient(0, 0, 0, 0, 0, L.r);
      const a = Math.min(1, L.intensity);
      grd.addColorStop(0, `rgba(0,0,0,${a})`);
      grd.addColorStop(0.35, `rgba(0,0,0,${a * 0.8})`);
      grd.addColorStop(0.68, `rgba(0,0,0,${a * 0.34})`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      sg.fillStyle = grd;
      sg.fillRect(-L.r, -L.r, L.r * 2, L.r * 2);
      sg.restore();
    }
    sg.globalCompositeOperation = 'source-over';

    g.save();
    g.globalCompositeOperation = 'multiply';
    g.drawImage(this.shadow, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.restore();

    /* ---- pass 2: additive warm bloom ---- */
    const gg = this.gg;
    gg.globalCompositeOperation = 'source-over';
    gg.clearRect(0, 0, VW, VH);
    gg.globalCompositeOperation = 'lighter';
    for (const L of this.lights) {
      if (L.warm <= 0) continue;
      gg.save();
      gg.translate(L.x, L.y);
      const rr = L.r * 1.15;
      const grd = gg.createRadialGradient(0, 0, 0, 0, 0, rr);
      const c = hexToRgb(L.col);
      const a = L.warm * L.intensity;
      grd.addColorStop(0, `rgba(${c.r},${c.g},${c.b},${a * 0.62})`);
      grd.addColorStop(0.3, `rgba(${c.r},${c.g},${c.b},${a * 0.4})`);
      grd.addColorStop(0.7, `rgba(${c.r},${c.g},${c.b},${a * 0.12})`);
      grd.addColorStop(1, `rgba(${c.r},${c.g},${c.b},0)`);
      gg.fillStyle = grd;
      gg.fillRect(-rr, -rr, rr * 2, rr * 2);
      gg.restore();
    }
    gg.globalCompositeOperation = 'source-over';

    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = opts.bloom != null ? opts.bloom : 0.85;
    g.drawImage(this.glow, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    g.restore();

    /* ---- pass 3: cool colour grade ---- */
    if (opts.grade !== false) {
      g.save();
      g.globalCompositeOperation = 'overlay';
      g.globalAlpha = opts.gradeAmt != null ? opts.gradeAmt : 0.12;
      g.fillStyle = opts.gradeCol || '#4a4a8c';
      g.fillRect(0, 0, VW, VH);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      g.restore();
    }
  }
}

/** Flicker helper — stable per-id pseudo-random flame wobble. */
export function flicker(t, id = 0, amt = 0.12) {
  return 1 - amt * (0.5 + 0.5 * Math.sin(t * 9.3 + id * 2.1) * Math.sin(t * 4.1 + id));
}
