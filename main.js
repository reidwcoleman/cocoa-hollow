import { Game } from './src/game.js';
import { Audio } from './src/audio.js';
import { RECIPES } from './src/data.js';
window.__RECIPES = RECIPES;

const canvas = document.getElementById('game');
const game = new Game(canvas);
game.audio = new Audio();
window.__game = game;

// unlock WebAudio on first gesture
const unlock = () => { game.audio.resume(); removeEventListener('pointerdown', unlock); removeEventListener('keydown', unlock); };
addEventListener('pointerdown', unlock);
addEventListener('keydown', unlock);

/* ------------------------------------------------------------------ *
 * Scene harness — lets a scene be opened directly for review/capture:
 *   ?scene=town&time=1300&ui=inventory&open=1&boss=1&px=41&py=30
 * ------------------------------------------------------------------ */
const q = new URLSearchParams(location.search);
if (q.has('scene')) {
  const TS = 16;
  const scene = q.get('scene');
  game.state = 'play';
  if (q.has('time')) game.minutes = parseInt(q.get('time'), 10);
  const spawns = {
    town: [41 * TS, 30 * TS],
    shop: [16 * TS, 14 * TS],
    kitchen: [12 * TS, 10 * TS],
    grove: [16 * TS, 26 * TS],
  };
  const s = spawns[scene] || spawns.town;
  const px = q.has('px') ? parseFloat(q.get('px')) * TS : s[0];
  const py = q.has('py') ? parseFloat(q.get('py')) * TS : s[1];
  game.setMap(scene, px, py);
  if (q.get('open') === '1') {
    game.shopOpen = true;
    game.customerTimer = 0.2;
    // pre-stock the counters so the shop reads as a working business
    const stock = [['darkTruffle', 0], ['milkSquare', 0], ['moonBonbon', 1], ['rubyHeart', 1],
                   ['emberCaramel', 1], ['gloomGanache', 2]];
    game.shopCounters().forEach((c, i) => {
      const [id, qy] = stock[i % stock.length];
      const rec = game.unlockAll ? null : null;
      const r = (window.__RECIPES || []).find(x => x.id === id);
      if (r) { c.item = r; c.quality = qy; c.qty = 8; c.price = Math.round(r.base * (1 + qy * 0.35)); }
    });
    for (let i = 0; i < 5; i++) game.spawnCustomer();
  }
  if (q.get('boss') === '1') { game.boss.active = true; game.setMap('grove', game.boss.x - 60, game.boss.y + 40); }
  if (q.has('ui')) game.ui.open(q.get('ui'), q.get('ui') === 'stock' ? { counter: game.shopCounters()[0] } : {});
  if (q.get('unlock') === '1') (window.__RECIPES || []).forEach(r => game.unlocked.add(r.id));
  if (q.has('give')) {
    for (const k in game.inv.ing) game.inv.ing[k] = 20;
    ['cocoaPod', 'sugar', 'milk', 'cream', 'moonberry', 'gloomcap', 'frostmint', 'emberspice', 'spiritSalt', 'honey']
      .forEach(k => game.inv.ing[k] = 20);
    (window.__RECIPES || []).forEach((r, i) => game.inv.choc.push({ id: r.id, q: i % 3, qty: 9 }));
  }
}

document.getElementById('boot').classList.add('hide');

/* Capture mode: simulate a fixed number of deterministic steps, render one
 * frame, and POST it back to the dev server. No rAF, so it works in a
 * background tab. */
if (q.has('shot')) {
  const steps = parseInt(q.get('steps') || '120', 10);
  const zoom = parseInt(q.get('zoom') || '2', 10);
  const rnd = mulberryLocal(1234);
  Math.random = rnd;                      // deterministic captures
  for (let i = 0; i < steps; i++) game.update(1 / 60);
  if (q.get('nohud') === '1') { game.msgT = 0; game.hideHud = true; }
  game.render();
  const src = game.screen.buf;
  // optional crop=x,y,w,h for inspecting a detail at high magnification
  const cr = (q.get('crop') || '').split(',').map(Number);
  const [sx, sy, sw, sh] = cr.length === 4 && cr.every(v => !isNaN(v))
    ? cr : [0, 0, src.width, src.height];
  const out = document.createElement('canvas');
  out.width = sw * zoom; out.height = sh * zoom;
  const oc = out.getContext('2d');
  oc.imageSmoothingEnabled = false;
  oc.drawImage(src, sx, sy, sw, sh, 0, 0, out.width, out.height);
  fetch('/shot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: q.get('shot'), png: out.toDataURL('image/png') }),
  }).then(r => r.text()).then(t => { document.title = 'SHOT OK ' + t; });
} else {
  game.start();
}

function mulberryLocal(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
