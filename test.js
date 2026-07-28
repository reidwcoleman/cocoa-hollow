// Headless-ish self test: drives the real Game object through every system
// and reports what actually happened. Run at /test.html.

import { Game } from './src/game.js';
import { Enemy } from './src/entities.js';
import { RECIPES, recipeById } from './src/data.js';
import { TS } from './src/art/tiles.js';
import { VW as VW_, VH as VH_ } from './src/engine/core.js';

const results = [];
function check(name, fn) {
  try {
    const detail = fn();
    results.push({ name, ok: true, detail: detail == null ? '' : String(detail) });
  } catch (e) {
    results.push({ name, ok: false, detail: (e && e.message) || String(e) });
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

const canvas = document.getElementById('game');
const G = new Game(canvas);
G.state = 'play';
G.audio = { play() {} };

// deterministic
let seed = 99;
Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

/** step the sim n frames with a set of keys held */
function step(n, keys = [], mouse = {}) {
  for (let i = 0; i < n; i++) {
    G.input.down = new Set(keys);
    G.input.pressed = new Set(i === 0 ? keys : []);
    Object.assign(G.input.mouse, { pressed: false, down: false }, mouse);
    G.update(1 / 60);
  }
  G.input.down = new Set();
  G.input.pressed = new Set();
}
/** press a key for exactly one frame */
function tap(key, n = 1) {
  G.input.pressed = new Set([key]);
  G.input.down = new Set([key]);
  G.update(1 / 60);
  G.input.pressed = new Set();
  G.input.down = new Set();
  for (let i = 1; i < n; i++) G.update(1 / 60);
}

/* ---------------- maps + art ---------------- */
check('all four maps build', () => {
  for (const id of ['town', 'shop', 'kitchen', 'grove']) assert(G.maps[id], 'missing ' + id);
  return Object.keys(G.maps).join(', ');
});

check('tiles referenced by maps all exist', () => {
  const { TILES } = window.__tiles;
  const missing = new Set();
  for (const id in G.maps) {
    const m = G.maps[id];
    for (const t of m.ground) if (t && !TILES[t]) missing.add(t);
    for (const t of m.over) if (t && !TILES[t]) missing.add(t);
  }
  assert(missing.size === 0, 'unknown tiles: ' + [...missing].join(','));
  return 'ok';
});

/* ---------------- movement + collision ---------------- */
check('player walks', () => {
  G.setMap('town', 41 * TS, 34 * TS);
  const x0 = G.player.x;
  step(40, ['d']);
  assert(G.player.x > x0 + 10, `moved only ${(G.player.x - x0).toFixed(1)}px`);
  return `+${(G.player.x - x0).toFixed(0)}px east`;
});

check('walls block movement', () => {
  G.setMap('shop', 16 * TS, 6 * TS);
  const y0 = G.player.y;
  step(90, ['w']);                       // walk hard into the back wall
  assert(G.player.y >= y0 - TS * 2.2, `passed through the wall (${(y0 - G.player.y).toFixed(0)}px)`);
  const solid = G.map.isSolid(16, 2);
  assert(solid, 'wall tile is not solid');
  return `stopped after ${(y0 - G.player.y).toFixed(0)}px`;
});

/* ---------------- combat ---------------- */
check('sword damages and kills an enemy', () => {
  G.setMap('grove', 30 * TS, 26 * TS);
  G.enemies.length = 0;
  const e = new Enemy('slime', G.player.x + 12, G.player.y);
  G.enemies.push(e);
  G.player.dir = 2;                      // east
  const hp0 = e.hp;
  let guard = 0;
  while (!e.dead && guard++ < 400) {
    G.player.swingCd = 0;
    G.player.dir = 2;
    G.player.attack(G);
    step(14);
    e.x = G.player.x + 12; e.y = G.player.y;   // keep it in reach
  }
  assert(e.dead, `enemy survived ${guard} swings (hp ${e.hp}/${hp0})`);
  return `killed in ${guard} swings`;
});

check('blocking stuns the attacker', () => {
  G.setMap('grove', 30 * TS, 26 * TS);
  G.enemies.length = 0;
  const e = new Enemy('slime', G.player.x + 14, G.player.y);
  G.enemies.push(e);
  G.player.dir = 2;
  G.player.blocking = true;
  G.player.blockRaisedT = 0;          // guard raised *into* the blow = parry
  G.player.iframe = 0;
  const r = G.player.hurt(5, e.x, e.y, G);
  assert(r === 'parried', 'hit was not parried, got: ' + r);
  assert(e.stun > 0, 'enemy was not stunned');
  assert(G.player.fastWindow > 0, 'no fast-attack window granted');
  return `stun ${e.stun.toFixed(1)}s, fast window ${G.player.fastWindow.toFixed(1)}s`;
});

check('a held guard soaks instead of parrying', () => {
  G.setMap('grove', 30 * TS, 26 * TS);
  G.player.dir = 2;
  G.player.blocking = true;
  G.player.blockRaisedT = 1.5;        // held too long — no parry
  G.player.iframe = 0;
  G.player.en = 100;
  const hp0 = G.player.hp;
  const r = G.player.hurt(10, G.player.x + 12, G.player.y, G);
  assert(r === 'guarded', 'expected a guard, got: ' + r);
  assert(G.player.hp < hp0, 'guarding took no chip damage');
  assert(G.player.hp > hp0 - 10, 'guard did not reduce the hit');
  return `chip ${hp0 - G.player.hp} of 10`;
});

check('enemies telegraph before they swing', () => {
  G.ui.close();
  G.setMap('grove', 30 * TS, 26 * TS);
  G.enemies.length = 0;
  const e = new Enemy('slime', G.player.x + 10, G.player.y);
  e.cd = 0; e.stun = 0;
  G.enemies.push(e);
  G.player.iframe = 99;               // ignore the damage, watch the wind-up
  G.player.knock.x = 0; G.player.knock.y = 0;   // clear bleed from the last check
  let seen = 0;
  for (let i = 0; i < 6; i++) {
    e.x = G.player.x + 10; e.y = G.player.y;    // hold it inside its reach
    G.update(1 / 60);
    if (e.windup > 0) seen++;
  }
  G.player.iframe = 0;
  assert(seen > 0,
    `no wind-up seen (mapId=${G.mapId} ui=${G.ui.mode} stun=${e.stun.toFixed(2)} ` +
    `cd=${e.cd.toFixed(2)} dead=${e.dead} dist=${Math.hypot(e.x - G.player.x, e.y - G.player.y).toFixed(1)})`);
  return `wind-up held for ${seen} frames`;
});

check('gear drops can be equipped and change the swing', () => {
  const L = G.player.loadout;
  const before = G.player.swingDamage(false);
  L.acquire({ slot: 'weapon', id: 'hollowCleaver', rarity: 'spectral' });
  L.equip('weapon', 'hollowCleaver', 'spectral');
  const after = G.player.swingDamage(false);
  assert(after > before, `damage unchanged (${before} -> ${after})`);
  L.equip('weapon', 'rustedBlade', 'common');
  return `${before} -> ${after} with a spectral cleaver`;
});

check('the bow fires and hurts an enemy', () => {
  G.setMap('grove', 30 * TS, 26 * TS);
  G.enemies.length = 0;
  G.projectiles.length = 0;
  const L = G.player.loadout;
  L.acquire({ slot: 'ranged', id: 'huntingBow', rarity: 'common' });
  L.equip('ranged', 'huntingBow', 'common');
  const e = new Enemy('slime', G.player.x + 34, G.player.y);
  G.enemies.push(e);
  G.player.dir = 2; G.player.shootCd = 0; G.player.en = 100;
  G.player.swingT = 0; G.player.swingCd = 0;
  const hp0 = e.hp;
  G.player.shoot(G);
  assert(G.projectiles.length === 1,
    `no arrow spawned (bow=${!!L.def('ranged')} swingT=${G.player.swingT.toFixed(2)} ` +
    `shootCd=${G.player.shootCd.toFixed(2)} en=${G.player.en.toFixed(0)})`);
  step(30);
  assert(e.hp < hp0, `arrow did not connect (${e.hp}/${hp0})`);
  return `arrow took ${hp0 - e.hp}`;
});

check('an empty off-hand cannot block at all', () => {
  const L = G.player.loadout;
  L.equip('offhand', 'none', 'common');
  assert(!L.canBlock(), 'bare hand still blocks');
  G.player.iframe = 0; G.player.blocking = true; G.player.blockRaisedT = 0;
  const r = G.player.hurt(6, G.player.x + 10, G.player.y, G);
  assert(r === true, 'expected a clean hit, got: ' + r);
  L.equip('offhand', 'oakBuckler', 'common');
  return 'bare hand takes the hit';
});

check('unblocked hits cost health', () => {
  G.player.blocking = false;
  G.player.iframe = 0;
  const hp0 = G.player.hp;
  G.player.hurt(7, G.player.x + 10, G.player.y, G);
  assert(G.player.hp === hp0 - 7, `hp ${G.player.hp} vs expected ${hp0 - 7}`);
  return `${hp0} -> ${G.player.hp}`;
});

check('enemy projectiles hit the player', () => {
  // find a pocket of open ground so the shot isn't eaten by a tree
  let ox = 30, oy = 26;
  outer: for (let y = 8; y < 44; y++)
    for (let x = 8; x < 60; x++) {
      let clear = true;
      for (let j = -1; j <= 1 && clear; j++)
        for (let i = -1; i <= 4 && clear; i++) if (G.maps.grove.isSolid(x + i, y + j)) clear = false;
      if (clear) { ox = x; oy = y; break outer; }
    }
  G.setMap('grove', ox * TS + 8, oy * TS + 8);
  G.projectiles.length = 0;
  const e = new Enemy('crow', G.player.x + 40, G.player.y);
  G.enemyAttack(e, G.player);
  assert(G.projectiles.length === 1, 'no projectile spawned');
  G.player.iframe = 0; G.player.blocking = false;
  const hp0 = G.player.hp;
  step(60);
  assert(G.player.hp < hp0, 'projectile never connected');
  return `hp ${hp0} -> ${G.player.hp}`;
});

/* ---------------- foraging ---------------- */
check('foraging adds to the satchel', () => {
  G.setMap('grove', 0, 0);
  const node = G.maps.grove.forage.find(f => !f.taken);
  assert(node, 'no forage nodes on the map');
  G.player.x = node.x; G.player.y = node.y;
  const before = G.inv.ing[node.kind] || 0;
  const h = G.nearInteract();
  assert(h && h.kind === 'forage', 'forage node not detected, got ' + (h && h.kind));
  tap('e');
  const after = G.inv.ing[node.kind] || 0;
  assert(after > before, `count unchanged (${before})`);
  assert(node.taken, 'node not marked as gathered');
  return `${node.kind} ${before} -> ${after}`;
});

/* ---------------- crafting ---------------- */
check('crafting consumes ingredients and yields chocolate', () => {
  const rec = recipeById('darkTruffle');
  for (const k in rec.need) G.inv.ing[k] = 10;
  const cocoa0 = G.inv.ing.cocoaPod;
  const n0 = G.inv.choc.reduce((a, s) => a + s.qty, 0);
  assert(G.canCraft(rec), 'canCraft false with full ingredients');
  G.doCraft(rec, 1);
  const n1 = G.inv.choc.reduce((a, s) => a + s.qty, 0);
  assert(n1 > n0, 'no chocolate produced');
  assert(G.inv.ing.cocoaPod === cocoa0 - rec.need.cocoaPod, 'ingredients not deducted');
  return `made ${n1 - n0}, cocoa ${cocoa0} -> ${G.inv.ing.cocoaPod}`;
});

check('recipes gate on ingredients', () => {
  const rec = recipeById('hollowRoyale');
  for (const k in rec.need) G.inv.ing[k] = 0;
  assert(!G.canCraft(rec), 'canCraft true with nothing in the satchel');
  return 'gated';
});

/* ---------------- shop ---------------- */
check('stocking a counter moves stock out of the satchel', () => {
  G.setMap('shop', 16 * TS, 12 * TS);
  const rec = recipeById('milkSquare');
  G.inv.choc = [{ id: rec.id, q: 0, qty: 10 }];
  const c = G.shopCounters()[0];
  c.item = rec; c.quality = 0; c.qty = 0; c.max = 12;
  c.price = rec.base;
  G.restock(c);
  assert(c.qty > 0, 'counter still empty');
  return `counter has ${c.qty}, satchel ${G.inv.choc.reduce((a, s) => a + s.qty, 0)}`;
});

check('customers buy and gold goes up', () => {
  G.setMap('shop', 16 * TS, 12 * TS);
  const rec = recipeById('milkSquare');
  G.shopCounters().forEach((c) => {
    c.item = rec; c.quality = 0; c.qty = 10; c.max = 12;
    c.price = Math.round(rec.base * 0.6);       // a bargain: everyone buys
  });
  G.customers.length = 0;
  G.shopOpen = true;
  G.customerTimer = 0;
  const gold0 = G.player.gold;
  const sales0 = G.totalSales;
  step(60 * 45);
  assert(G.totalSales > sales0, `no sales in 45s (customers seen: ${G.customers.length})`);
  assert(G.player.gold > gold0, 'gold did not increase');
  return `${G.totalSales - sales0} sold, +${G.player.gold - gold0}g`;
});

check('overpriced stock is refused at least sometimes', () => {
  const rec = recipeById('milkSquare');
  const c = G.shopCounters()[0];
  c.item = rec; c.quality = 0; c.qty = 500; c.price = rec.base * 8;
  let refused = 0;
  for (let i = 0; i < 200; i++) {
    const before = c.qty;
    G.customerBuy({ x: 0, y: 0, wallet: 99999 }, c);
    if (c.qty === before) refused++;
  }
  assert(refused > 60, `only ${refused}/200 refusals at 8x price`);
  return `${refused}/200 walked away`;
});

check('ghosts restock counters on their own', () => {
  G.setMap('shop', 16 * TS, 12 * TS);
  const rec = recipeById('milkSquare');
  G.inv.choc = [{ id: rec.id, q: 0, qty: 40 }];
  const c = G.shopCounters()[1];
  c.item = rec; c.quality = 0; c.qty = 0; c.max = 12;
  const gh = G.ghosts[0];
  gh.target = c; gh.carrying = true;
  gh.tx = c.x + 16; gh.ty = c.y + 22;
  step(60 * 12);
  assert(c.qty > 0, 'ghost never restocked the counter');
  return `counter now ${c.qty}`;
});

/* ---------------- warps + time ---------------- */
check('doors move you between maps', () => {
  G.setMap('shop', 0, 0);
  const w = G.map.warps.find(x => x.to === 'kitchen');
  assert(w, 'no kitchen door');
  G.player.x = w.x + w.w / 2; G.player.y = w.y + w.h / 2;
  const h = G.nearInteract();
  assert(h && h.kind === 'warp', 'door not detected, got ' + (h && h.kind));
  tap('e');
  assert(G.mapId === 'kitchen', 'still on ' + G.mapId);
  return 'shop -> kitchen';
});

check('clock advances and the day rolls over', () => {
  G.setMap('town', 41 * TS, 34 * TS);
  G.minutes = 6 * 60;
  step(120);
  assert(G.minutes > 6 * 60, 'clock frozen');
  const day0 = G.day;
  G.minutes = 26 * 60 - 1;
  step(120);
  assert(G.day === day0 + 1, `day did not roll (${day0} -> ${G.day})`);
  assert(G.player.en === G.player.maxEn, 'energy not restored overnight');
  return `day ${day0} -> ${G.day}, clock ${G.clockStr}`;
});

/* ---------------- boss ---------------- */
check('boss activates, takes damage, and dies', () => {
  G.ui.close();
  G.setMap('grove', G.boss.x, G.boss.y + 40);
  G.boss.active = true;
  G.boss.hp = G.boss.maxHp;
  G.bossDefeated = false;
  const gold0 = G.player.gold;
  let guard = 0;
  while (!G.boss.dead && guard++ < 200) {
    G.boss.hurt(30, G.player.x, G.player.y, G, false);
  }
  assert(G.boss.dead, 'boss survived');
  assert(G.bossDefeated, 'defeat flag not set');
  assert(G.player.gold > gold0, 'no reward paid');
  assert(G.unlocked.has('hollowRoyale'), 'endgame recipe not unlocked');
  return `killed in ${guard} hits, +${G.player.gold - gold0}g`;
});

/* ---------------- UI ---------------- */
check('every UI panel renders without throwing', () => {
  const modes = ['inventory', 'recipes', 'craft', 'stock', 'dialogue', 'dayEnd', 'journal', 'menu'];
  const done = [];
  for (const mode of modes) {
    G.setMap(mode === 'stock' ? 'shop' : 'town', 41 * TS, 34 * TS);
    const ctx = mode === 'stock' ? { counter: G.shopCounters()[0] }
              : mode === 'dialogue' ? { npc: G.npcs[0] }
              : mode === 'vendor' ? { vendorId: 'dairy' }
              : mode === 'conche' ? { conche: 0 } : {};
    G.ui.open(mode, ctx);
    G.ui.render(G.g);
    done.push(mode);
    G.ui.close();
  }
  return done.join(', ');
});

check('tempering minigame resolves to a quality', () => {
  G.setMap('kitchen', 12 * TS, 10 * TS);
  const rec = recipeById('darkTruffle');
  for (const k in rec.need) G.inv.ing[k] = 10;
  G.ui.open('craft', { cauldron: 0 });
  G.ui.craft = { recipe: rec, pos: 0.5, dir: 1, speed: 1, target: 0.5,
                 perfect: 0.05, good: 0.12, passes: 0, running: true };
  const n0 = G.inv.choc.reduce((a, s) => a + s.qty, 0);
  G.ui.update(1 / 60, { mouse: { pressed: true }, wasPressed: () => false });
  const n1 = G.inv.choc.reduce((a, s) => a + s.qty, 0);
  assert(n1 > n0, 'perfect temper produced nothing');
  return `+${n1 - n0} at perfect temper`;
});

check('NPC dialogue advances', () => {
  const npc = G.npcs[0];
  const i0 = npc.lineIdx;
  G.ui.open('dialogue', { npc });
  G.ui.render(G.g);
  assert(npc.lineIdx === i0 + 1, 'line did not advance');
  G.ui.close();
  return `${npc.def.name}: line ${npc.lineIdx}`;
});

/* ---------------- the two crafting routes ---------------- */
check('conching runs unattended and yields a bigger, plainer batch', () => {
  G.ui.close();
  G.setMap('kitchen', 12 * TS, 10 * TS);
  const rec = recipeById('darkTruffle');
  for (const k in rec.need) G.inv.ing[k] = 20;
  G.inv.choc = [];
  const cocoa0 = G.inv.ing.cocoaPod;
  assert(G.startConche(0, rec), 'machine refused a valid batch');
  assert(G.inv.ing.cocoaPod < cocoa0, 'ingredients not taken up front');
  assert(!G.startConche(0, rec), 'accepted a second batch while busy');
  // it should finish on its own, with the player elsewhere
  G.setMap('grove', 30 * TS, 26 * TS);
  let guard = 0;
  while (G.conches()[0].recipe && guard++ < 60 * 400) G.update(1 / 60);
  const made = G.inv.choc.reduce((a, s2) => a + s2.qty, 0);
  assert(made >= 8, `batch too small: ${made}`);
  assert(G.inv.choc.every(s2 => s2.q === 0), 'conching should only make base quality');
  G.setMap('kitchen', 12 * TS, 10 * TS);
  return `${made} made hands-off, all base quality`;
});

check('tempering by hand pays in quality instead of volume', () => {
  const rec = recipeById('darkTruffle');
  for (const k in rec.need) G.inv.ing[k] = 20;
  G.inv.choc = [];
  G.doCraft(rec, 2);                       // a perfect temper
  const s2 = G.inv.choc[0];
  assert(s2.q === 2, 'hand tempering lost its star rating');
  assert(s2.qty < 8, 'hand batch should be smaller than a conched one');
  assert(G.itemValue(rec, 2) > G.itemValue(rec, 0), 'stars are worth nothing');
  return `${s2.qty} at ★★ — worth ${G.itemValue(rec, 2)}g each vs ${G.itemValue(rec, 0)}g`;
});

/* ---------------- social + economy ---------------- */
check('gifting raises friendship and is limited to one a day', () => {
  const npc = G.npcs.find(n => n.def.id === 'ines');
  npc.friendship = 0; npc.hearts = 0; npc.giftedDay = -1;
  const rec = recipeById('rubyHeart');          // one of theirs
  G.inv.choc = [{ id: rec.id, q: 1, qty: 4 }];
  const ok = G.giveGift(npc, G.inv.choc[0]);
  assert(ok, 'gift refused');
  assert(npc.friendship > 0, 'friendship unchanged');
  const after = npc.friendship;
  const again = G.giveGift(npc, G.inv.choc[0]);
  assert(!again, 'accepted a second gift the same day');
  assert(npc.friendship === after, 'friendship moved on the refused gift');
  return `liked gift gave +${after}`;
});

check('a liked chocolate is worth more to the right person', () => {
  const rec = recipeById('rubyHeart');
  const c = G.shopCounters()[0];
  c.item = rec; c.quality = 0; c.qty = 500;
  c.price = Math.round(G.itemValue(rec, 0) * 1.35);   // over the going rate
  let plain = 0, fan = 0;
  for (let i = 0; i < 300; i++) {
    const q0 = c.qty;
    G.customerBuy({ x: 0, y: 0, wallet: 99999, taste: [] }, c);
    if (c.qty < q0) plain++;
    const q1 = c.qty;
    G.customerBuy({ x: 0, y: 0, wallet: 99999, taste: [rec.id] }, c);
    if (c.qty < q1) fan++;
  }
  assert(fan > plain, `fans did not pay more readily (${fan} vs ${plain})`);
  return `${fan}/300 fans bought vs ${plain}/300 others`;
});

check('vendors take gold and hand over goods', () => {
  G.player.gold = 500;
  const before = G.inv.ing.milk || 0;
  const bought = G.buyIngredient('dairy', { id: 'milk', markup: 1.4 });
  assert(bought, 'purchase refused with 500g in hand');
  assert((G.inv.ing.milk || 0) === before + 1, 'no milk delivered');
  assert(G.player.gold < 500, 'gold not deducted');
  G.player.gold = 0;
  assert(!G.buyIngredient('dairy', { id: 'cream', markup: 1.4 }), 'sold on credit');
  assert(G.player.gold === 0, 'gold went negative');
  return 'pays, delivers, refuses when broke';
});

check('town goodwill widens the crowd', () => {
  G.npcs.forEach(n => { n.hearts = 0; n.friendship = 0; });
  const cold = G.shopAppeal();
  G.npcs.forEach(n => { n.hearts = 4; n.friendship = 400; });
  const warm = G.shopAppeal();
  assert(warm > cold, `appeal did not rise (${cold} -> ${warm})`);
  G.npcs.forEach(n => { n.hearts = 0; n.friendship = 0; });
  return `${cold} -> ${warm} at four hearts each`;
});

/* ---------------- doors and spawns ---------------- */
check('every warp lands somewhere you can stand', () => {
  const bad = [];
  for (const id in G.maps) {
    const m = G.maps[id];
    for (const w of m.warps) {
      const dest = G.maps[w.to];
      assert(dest, `${id} warp points at unknown map ${w.to}`);
      let x, y;
      if (w.spawn) {
        assert(dest.spawn, `${id} -> ${w.to} asks for a spawn the map does not define`);
        x = dest.spawn.x; y = dest.spawn.y;
      } else {
        if (w.anchorTown) {
          const d = G.maps.town.castleDoor;
          assert(d, 'town does not publish a castle threshold');
          x = d.x; y = d.y;
        } else { x = w.tx; y = w.ty; }
      }
      const tx = Math.floor(x / TS), ty = Math.floor(y / TS);
      const inBounds = tx >= 0 && ty >= 0 && tx < dest.w && ty < dest.h;
      if (!inBounds || dest.isSolid(tx, ty))
        bad.push(`${id}->${w.to} at (${tx},${ty}) ${inBounds ? 'solid' : 'OUT OF BOUNDS'}`);
    }
  }
  assert(bad.length === 0, bad.join('; '));
  return 'all destinations walkable';
});

check('walking through a door leaves you free to move', () => {
  G.ui.close();
  G.setMap('town', 41 * TS, 22 * TS);
  const w = G.maps.town.warps.find(x => x.to === 'shop');
  G.player.x = w.x + w.w / 2; G.player.y = w.y + w.h / 2;
  const h = G.nearInteract();
  assert(h && h.kind === 'warp', 'shop door not detected');
  tap('e');
  assert(G.mapId === 'shop', 'did not enter the shop, on ' + G.mapId);
  const ptx = Math.floor(G.player.x / TS), pty = Math.floor(G.player.y / TS);
  assert(!G.map.isSolid(ptx, pty), `landed inside geometry at (${ptx},${pty})`);
  // and can actually walk away from where we landed
  const x0 = G.player.x, y0 = G.player.y;
  G.player.knock.x = 0; G.player.knock.y = 0;
  let moved = false;
  for (const k of ['w', 'a', 's', 'd']) {
    G.player.x = x0; G.player.y = y0;
    step(20, [k]);
    if (Math.hypot(G.player.x - x0, G.player.y - y0) > 6) { moved = true; break; }
  }
  assert(moved, 'wedged in the doorway — no direction moves the player');
  return `entered at (${ptx},${pty}) and can move`;
});

check('setMap never strands the player inside geometry', () => {
  // aim at a deliberately illegal spot: past the bottom edge of the shop
  G.setMap('shop', 15 * TS, 15 * TS);
  const tx = Math.floor(G.player.x / TS), ty = Math.floor(G.player.y / TS);
  assert(tx >= 0 && ty >= 0 && tx < G.map.w && ty < G.map.h,
    `left the player out of bounds at (${tx},${ty})`);
  assert(!G.map.isSolid(tx, ty), `left the player in a solid tile at (${tx},${ty})`);
  return `nudged to (${tx},${ty})`;
});

/* ---------------- UI interaction ---------------- */
check('panel buttons respond to a click', () => {
  G.ui.close();
  G.setMap('town', 41 * TS, 34 * TS);
  // a real press: set by the mousedown listener, cleared by endFrame before
  // render — the panel must still see it
  G.input.mouse.pressed = true;
  G.input.mouse.x = 4; G.input.mouse.y = 4;
  G.update(1 / 60);
  assert(G.uiClick === true, 'the click was not latched for the render pass');
  G.uiClick = false;
  return 'click survives update -> render';
});

check('the pause menu items actually fire', () => {
  G.ui.open('menu');
  // the Satchel row is the second item; menu rows are 18px apart from y+30
  const w = 180, h = 148, x = (VW_ - w) / 2, y = (VH_ - h) / 2;
  G.input.mouse.x = x + w / 2;
  G.input.mouse.y = y + 30 + 1 * 18 + 7;
  G.uiClick = true;
  G.ui.render(G.g);
  G.uiClick = false;
  assert(G.ui.mode === 'inventory', 'clicking Satchel did nothing, mode=' + G.ui.mode);
  G.ui.close();
  return 'menu -> satchel';
});

check('the close button shuts a panel', () => {
  G.ui.open('inventory');
  const w = 300, h = 156, x = (VW_ - w) / 2, y = (VH_ - h) / 2;
  G.input.mouse.x = x + w - 18 + 5;
  G.input.mouse.y = y + 6 + 5;
  G.uiClick = true;
  G.ui.render(G.g);
  G.uiClick = false;
  assert(G.ui.mode === null, 'panel stayed open, mode=' + G.ui.mode);
  return 'closes';
});

/* ---------------- render smoke test ---------------- */
check('every map renders a frame', () => {
  const done = [];
  for (const id of ['town', 'shop', 'kitchen', 'grove']) {
    G.setMap(id, 20 * TS, 20 * TS);
    for (let i = 0; i < 5; i++) G.update(1 / 60);
    G.render();
    done.push(id);
  }
  return done.join(', ');
});

check('render survives a full day of clock positions', () => {
  G.setMap('town', 41 * TS, 34 * TS);
  for (let m = 6 * 60; m < 26 * 60; m += 60) { G.minutes = m; G.render(); }
  return '20 hours';
});

/* ---------------- report ---------------- */
const pass = results.filter(r => r.ok).length;
const lines = results.map(r => `${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '  —  ' + r.detail : ''}`);
const report = `${pass}/${results.length} passed\n\n` + lines.join('\n');
document.getElementById('out').textContent = report;
fetch('/shot', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'selftest', text: report }),
});
