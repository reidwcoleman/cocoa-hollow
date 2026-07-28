// Particle systems: snowfall, embers, smoke, dust motes, sparkles, damage puffs.

import { RAMP } from '../art/palette.js';
import { VW, VH } from '../engine/core.js';

const R = RAMP;

export class Particles {
  constructor() { this.list = []; }
  clear() { this.list.length = 0; }

  spawn(o) {
    this.list.push(Object.assign({
      x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, g: 0,
      life: 1, max: 1, size: 1, col: '#ffffff', fade: true,
      shrink: false, glow: 0, drag: 1, kind: 'px',
    }, o));
  }

  burst(x, y, n, opts = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (opts.speed || 40) * (0.4 + Math.random() * 0.8);
      this.spawn(Object.assign({}, opts, {
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp * (opts.flat ? 0.45 : 1),
        life: (opts.life || 0.5) * (0.6 + Math.random() * 0.7),
        max: (opts.life || 0.5),
        size: opts.size || 1,
        col: Array.isArray(opts.col) ? opts.col[(Math.random() * opts.col.length) | 0] : (opts.col || '#ffffff'),
      }));
    }
  }

  update(dt) {
    const l = this.list;
    for (let i = l.length - 1; i >= 0; i--) {
      const p = l[i];
      p.life -= dt;
      if (p.life <= 0) { l.splice(i, 1); continue; }
      p.vy += p.g * dt;
      p.vx *= Math.pow(p.drag, dt * 60);
      p.vy *= Math.pow(p.drag, dt * 60);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.wobble) p.x += Math.sin(p.life * p.wobble * 6) * p.wobbleAmt * dt * 60;
    }
  }

  /** Draw world-space particles (camera applied by caller offsets). */
  draw(g, camx, camy) {
    for (const p of this.list) {
      const t = p.life / p.max;
      const a = p.fade ? Math.max(0, Math.min(1, t)) : 1;
      const s = p.shrink ? Math.max(1, Math.round(p.size * t)) : p.size;
      g.globalAlpha = a;
      g.fillStyle = p.col;
      const x = Math.round(p.x - camx), y = Math.round(p.y - camy);
      if (p.kind === 'px') g.fillRect(x, y, s, s);
      else if (p.kind === 'streak') g.fillRect(x, y, s * 2, Math.max(1, s / 2));
      else if (p.kind === 'ring') {
        g.globalAlpha = a * 0.7;
        const r = p.size * (1.6 - t);
        g.strokeStyle = p.col; g.lineWidth = 1;
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
      }
      g.globalAlpha = 1;
    }
  }
}

/* ------------------------------------------------------------------ *
 * Weather: screen-space snowfall with parallax layers.
 * ------------------------------------------------------------------ */
export class Snowfall {
  constructor(count = 150) {
    this.flakes = [];
    for (let i = 0; i < count; i++) this.flakes.push(this._mk(true));
    this.wind = -14;
    this.windT = 0;
    this.intensity = 1;
  }
  _mk(anywhere) {
    const layer = Math.random();
    return {
      x: Math.random() * (VW + 80) - 40,
      y: anywhere ? Math.random() * VH : -6,
      z: layer,                                   // 0 far .. 1 near
      s: layer > 0.75 ? 2 : 1,
      vy: 12 + layer * 34,
      ph: Math.random() * Math.PI * 2,
      sw: 4 + layer * 10,
    };
  }
  update(dt, t) {
    this.windT += dt;
    this.wind = -14 + Math.sin(this.windT * 0.23) * 16 + Math.sin(this.windT * 0.07) * 8;
    for (const f of this.flakes) {
      f.y += f.vy * dt * this.intensity;
      f.x += (this.wind * (0.4 + f.z) + Math.sin(t * 1.4 + f.ph) * f.sw) * dt;
      if (f.y > VH + 4) { Object.assign(f, this._mk(false)); f.y = -4; }
      if (f.x < -40) f.x += VW + 80;
      if (f.x > VW + 40) f.x -= VW + 80;
    }
  }
  draw(g) {
    for (const f of this.flakes) {
      g.globalAlpha = 0.28 + f.z * 0.62;
      g.fillStyle = f.z > 0.6 ? '#ffffff' : f.z > 0.3 ? '#dfe4fa' : '#b8c2ec';
      g.fillRect(f.x | 0, f.y | 0, f.s, f.s);
    }
    g.globalAlpha = 1;
  }
}

/* ------------------------------------------------------------------ *
 * Chimney smoke — soft rising puffs.
 * ------------------------------------------------------------------ */
export class Smoke {
  constructor() { this.puffs = []; this.timer = 0; this.sources = []; }
  setSources(list) { this.sources = list; }
  update(dt, t) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 0.28;
      for (const [sx, sy] of this.sources) {
        this.puffs.push({ x: sx + (Math.random() - 0.5) * 2, y: sy, life: 3.4, max: 3.4, r: 1.6, ph: Math.random() * 6 });
      }
    }
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i];
      p.life -= dt;
      if (p.life <= 0) { this.puffs.splice(i, 1); continue; }
      const age = 1 - p.life / p.max;
      p.y -= (11 - age * 5) * dt;
      p.x += (Math.sin(t * 0.8 + p.ph) * 5 - 3) * dt;
      p.r = 1.6 + age * 6.5;
    }
  }
  draw(g, camx, camy) {
    for (const p of this.puffs) {
      const age = 1 - p.life / p.max;
      g.globalAlpha = (1 - age) * 0.3;
      g.fillStyle = age < 0.3 ? '#6a6a8b' : '#50506e';
      const x = Math.round(p.x - camx), y = Math.round(p.y - camy), r = Math.round(p.r);
      // chunky pixel puff
      g.fillRect(x - r, y - r + 1, r * 2, r * 2 - 2);
      g.fillRect(x - r + 1, y - r, r * 2 - 2, r * 2);
    }
    g.globalAlpha = 1;
  }
}

/* ------------------------------------------------------------------ *
 * Floating text (damage numbers, +gold).
 * ------------------------------------------------------------------ */
export class FloatText {
  constructor() { this.list = []; }
  add(x, y, str, col = '#ffffff', vy = -26) {
    this.list.push({ x, y, str, col, life: 1.1, max: 1.1, vy });
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const f = this.list[i];
      f.life -= dt;
      if (f.life <= 0) { this.list.splice(i, 1); continue; }
      f.y += f.vy * dt;
      f.vy *= 0.94;
    }
  }
}

/* Preset burst helpers ------------------------------------------- */
export const FX = {
  hit: (P, x, y) => P.burst(x, y, 10, { speed: 90, life: 0.32, col: ['#ffffff', '#dfe4fa', '#b8c2ec'], size: 2, shrink: true, drag: 0.9, g: 120 }),
  slimeSplat: (P, x, y, col) => P.burst(x, y, 14, { speed: 70, life: 0.5, col: col, size: 2, g: 220, drag: 0.96, shrink: true }),
  dust: (P, x, y) => P.burst(x, y, 5, { speed: 22, life: 0.4, col: ['#8a8aa9', '#6a6a8b'], size: 1, flat: true, drag: 0.9 }),
  sparkle: (P, x, y, col = '#ffd066') => P.burst(x, y, 8, { speed: 30, life: 0.7, col: [col, '#ffffff'], size: 1, g: -10, drag: 0.94 }),
  ember: (P, x, y) => P.burst(x, y, 3, { speed: 14, life: 1.0, col: ['#ffc35a', '#e0871f', '#b35510'], size: 1, g: -22, drag: 0.97 }),
  ghostPoof: (P, x, y) => P.burst(x, y, 16, { speed: 46, life: 0.8, col: ['#d6f4ff', '#8fc9dc', '#5c98b3'], size: 2, g: -30, drag: 0.93, shrink: true }),
  cocoa: (P, x, y) => P.burst(x, y, 10, { speed: 40, life: 0.6, col: ['#7a4630', '#5e3324', '#bf8354'], size: 2, g: 160, drag: 0.95 }),
  coin: (P, x, y) => P.burst(x, y, 6, { speed: 50, life: 0.7, col: ['#f0cc6a', '#d0a437'], size: 2, g: 200, drag: 0.94 }),
};
