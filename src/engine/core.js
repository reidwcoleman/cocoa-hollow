// Renderer, scaling, input, and the fixed-step game loop.

import { makeCanvas, ctxOf } from '../art/pixel.js';

export const VW = 400, VH = 225;   // internal pixel resolution (25 x 14 tiles)

export class Screen {
  constructor(canvasEl) {
    this.el = canvasEl;
    this.buf = makeCanvas(VW, VH);
    this.g = ctxOf(this.buf);
    this.out = ctxOf(canvasEl);
    this.scale = 1;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  resize() {
    const pad = 0;
    const w = window.innerWidth - pad, h = window.innerHeight - pad;
    let s = Math.min(w / VW, h / VH);
    // prefer integer scaling for crisp pixels, fall back to fractional on small screens
    const si = Math.floor(s);
    this.scale = si >= 1 ? si : s;
    this.el.width = Math.round(VW * this.scale);
    this.el.height = Math.round(VH * this.scale);
    this.el.style.width = this.el.width + 'px';
    this.el.style.height = this.el.height + 'px';
    this.out = ctxOf(this.el);
  }
  present() {
    this.out.imageSmoothingEnabled = false;
    this.out.clearRect(0, 0, this.el.width, this.el.height);
    this.out.drawImage(this.buf, 0, 0, VW, VH, 0, 0, this.el.width, this.el.height);
  }
  /** Convert a client-space point to virtual pixels. */
  toVirtual(cx, cy) {
    const r = this.el.getBoundingClientRect();
    return { x: (cx - r.left) / this.scale, y: (cy - r.top) / this.scale };
  }
}

/* ------------------------------------------------------------------ */
export class Input {
  constructor(screen) {
    this.screen = screen;
    this.down = new Set();
    this.pressed = new Set();
    this.released = new Set();
    this.mouse = { x: 0, y: 0, down: false, pressed: false, released: false, rdown: false, rpressed: false, wheel: 0 };
    this._blockNext = false;

    addEventListener('keydown', e => {
      const k = norm(e);
      if (!this.down.has(k)) this.pressed.add(k);
      this.down.add(k);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Tab'].includes(e.key)) e.preventDefault();
    });
    addEventListener('keyup', e => { const k = norm(e); this.down.delete(k); this.released.add(k); });
    addEventListener('blur', () => { this.down.clear(); });

    const el = screen.el;
    el.addEventListener('mousemove', e => {
      const v = screen.toVirtual(e.clientX, e.clientY);
      this.mouse.x = v.x; this.mouse.y = v.y;
    });
    el.addEventListener('mousedown', e => {
      const v = screen.toVirtual(e.clientX, e.clientY);
      this.mouse.x = v.x; this.mouse.y = v.y;
      if (e.button === 0) { this.mouse.down = true; this.mouse.pressed = true; }
      if (e.button === 2) { this.mouse.rdown = true; this.mouse.rpressed = true; }
      e.preventDefault();
    });
    addEventListener('mouseup', e => {
      if (e.button === 0) { this.mouse.down = false; this.mouse.released = true; }
      if (e.button === 2) this.mouse.rdown = false;
    });
    el.addEventListener('contextmenu', e => e.preventDefault());
    el.addEventListener('wheel', e => { this.mouse.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });

    function norm(e) {
      const k = e.key;
      if (k.length === 1) return k.toLowerCase();
      return k;
    }
  }
  isDown(...keys) { return keys.some(k => this.down.has(k)); }
  wasPressed(...keys) { return keys.some(k => this.pressed.has(k)); }
  endFrame() {
    this.pressed.clear(); this.released.clear();
    this.mouse.pressed = false; this.mouse.released = false;
    this.mouse.rpressed = false; this.mouse.wheel = 0;
  }
}

/* ------------------------------------------------------------------ */
export class Loop {
  constructor(update, render, hz = 60) {
    this.update = update; this.render = render;
    this.step = 1 / hz;
    this.acc = 0; this.last = 0; this.running = false;
    this.time = 0;
  }
  start() {
    this.running = true;
    this.last = performance.now();
    const tick = (now) => {
      if (!this.running) return;
      let dt = (now - this.last) / 1000;
      this.last = now;
      if (dt > 0.25) dt = 0.25;
      this.acc += dt;
      let guard = 0;
      while (this.acc >= this.step && guard++ < 5) {
        this.update(this.step);
        this.time += this.step;
        this.acc -= this.step;
      }
      this.render(this.acc / this.step);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

/* ------------------------------------------------------------------ */
export class Camera {
  constructor() { this.x = 0; this.y = 0; this.tx = 0; this.ty = 0; this.shake = 0; this.shakeT = 0; }
  follow(x, y, bounds, snap = false) {
    this.tx = x - VW / 2;
    this.ty = y - VH / 2;
    if (bounds) {
      this.tx = Math.max(bounds.x0, Math.min(bounds.x1 - VW, this.tx));
      this.ty = Math.max(bounds.y0, Math.min(bounds.y1 - VH, this.ty));
      if (bounds.x1 - bounds.x0 < VW) this.tx = (bounds.x0 + bounds.x1) / 2 - VW / 2;
      if (bounds.y1 - bounds.y0 < VH) this.ty = (bounds.y0 + bounds.y1) / 2 - VH / 2;
    }
    if (snap) { this.x = this.tx; this.y = this.ty; }
    else { this.x += (this.tx - this.x) * 0.16; this.y += (this.ty - this.y) * 0.16; }
  }
  kick(amount) { this.shake = Math.max(this.shake, amount); this.shakeT = 0.28; }
  update(dt) {
    if (this.shakeT > 0) { this.shakeT -= dt; if (this.shakeT <= 0) this.shake = 0; }
  }
  get ox() {
    const s = this.shake * (this.shakeT > 0 ? this.shakeT / 0.28 : 0);
    return Math.round(this.x + (s ? (Math.random() - 0.5) * s * 2 : 0));
  }
  get oy() {
    const s = this.shake * (this.shakeT > 0 ? this.shakeT / 0.28 : 0);
    return Math.round(this.y + (s ? (Math.random() - 0.5) * s * 2 : 0));
  }
}
