// Tiny synthesised SFX + an ambient music bed. No audio files.

export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }
  ensure() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.22;
    this.master.connect(this.ctx.destination);
    this.startMusic();
    return this.ctx;
  }
  resume() { const c = this.ensure(); if (c && c.state === 'suspended') c.resume(); }

  blip(freq, dur, type = 'square', gain = 0.2, slide = 0) {
    const c = this.ensure(); if (!c || this.muted) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), c.currentTime + dur);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(gain, c.currentTime + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g); g.connect(this.master);
    o.start(); o.stop(c.currentTime + dur + 0.02);
  }
  noise(dur, gain = 0.15, hp = 800) {
    const c = this.ensure(); if (!c || this.muted) return;
    const n = c.sampleRate * dur;
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = c.createGain(); g.gain.value = gain;
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start();
  }

  play(name) {
    switch (name) {
      case 'swing': this.noise(0.12, 0.09, 1600); break;
      case 'hit': this.blip(180, 0.09, 'square', 0.16, -90); this.noise(0.08, 0.1, 900); break;
      case 'block': this.blip(520, 0.14, 'triangle', 0.2, 240); this.noise(0.1, 0.12, 2600); break;
      case 'hurt': this.blip(150, 0.2, 'sawtooth', 0.16, -70); break;
      case 'kill': this.blip(320, 0.18, 'triangle', 0.14, -180); this.noise(0.2, 0.08, 400); break;
      case 'pickup': this.blip(760, 0.07, 'square', 0.1, 320); break;
      case 'sale': this.blip(660, 0.08, 'square', 0.12); setTimeout(() => this.blip(990, 0.1, 'square', 0.11), 70); break;
      case 'coin': this.blip(880, 0.06, 'square', 0.1, 260); break;
      case 'door': this.blip(120, 0.2, 'sine', 0.14, 40); this.noise(0.14, 0.06, 300); break;
      case 'bell': this.blip(1040, 0.35, 'sine', 0.15); setTimeout(() => this.blip(1560, 0.3, 'sine', 0.1), 90); break;
      case 'craft': this.blip(440, 0.1, 'triangle', 0.12); setTimeout(() => this.blip(660, 0.12, 'triangle', 0.11), 90);
                    setTimeout(() => this.blip(880, 0.16, 'triangle', 0.1), 190); break;
      case 'place': this.blip(300, 0.06, 'square', 0.1); break;
      case 'shoot': this.blip(300, 0.1, 'sawtooth', 0.1, -140); break;
      case 'dash': this.noise(0.3, 0.1, 200); break;
    }
  }

  /* Slow minor-key pad + a sparse celesta motif. */
  startMusic() {
    const c = this.ctx;
    if (!c) return;
    const bus = c.createGain();
    bus.gain.value = 0.5;
    const rev = c.createConvolver();
    const len = c.sampleRate * 2.2;
    const ib = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ib.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    rev.buffer = ib;
    const wet = c.createGain(); wet.gain.value = 0.5;
    bus.connect(this.master); bus.connect(rev); rev.connect(wet); wet.connect(this.master);

    // drone
    const drone = (f, g2) => {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = c.createGain(); g.gain.value = g2;
      const lfo = c.createOscillator(); lfo.frequency.value = 0.07 + Math.random() * 0.05;
      const lg = c.createGain(); lg.gain.value = g2 * 0.6;
      lfo.connect(lg); lg.connect(g.gain);
      o.connect(g); g.connect(bus);
      o.start(); lfo.start();
    };
    drone(73.42, 0.06);   // D2
    drone(110.0, 0.045);  // A2
    drone(146.83, 0.03);  // D3

    // sparse motif — D minor pentatonic
    const notes = [587.33, 698.46, 880.0, 1046.5, 1174.7, 880.0, 698.46];
    let i = 0;
    this.motif = setInterval(() => {
      if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
      if (Math.random() < 0.42) return;
      const f = notes[i % notes.length]; i += 1 + ((Math.random() * 2) | 0);
      const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.07, c.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 1.8);
      o.connect(g); g.connect(bus);
      o.start(); o.stop(c.currentTime + 2);
    }, 1500);
  }
}
