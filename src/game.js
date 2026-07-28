// Cocoa Hollow — game state, simulation, and the render pipeline.

import { Screen, Input, Loop, Camera, VW, VH } from './engine/core.js';
import { buildTiles, TILES, TS, tileAt } from './art/tiles.js';
import { buildArt, buildTown, buildShop, buildKitchen, buildGrove, ART } from './world/maps.js';
import { Player, Enemy, Boss, NPC, Ghost, Customer, buildEnemyArt } from './entities.js';
import { Lighting, flicker } from './systems/lighting.js';
import { Particles, Snowfall, Smoke, FloatText, FX } from './systems/particles.js';
import { drawText, textWidth, wrapText, panel, slot, bar } from './art/font.js';
import { RAMP, C, mix } from './art/palette.js';
import * as PR from './art/props.js';
import { DIR } from './art/chars.js';
import { INGREDIENTS, INGREDIENT_ORDER, RECIPES, recipeById, NPCS, GHOST_NAMES, TIPS, VENDORS } from './data.js';
import { UI } from './ui.js';
import { rollDrop, bossDrops, itemDef, RARITY } from './gear.js';

const R = RAMP;

export class Game {
  constructor(canvasEl) {
    this.screen = new Screen(canvasEl);
    this.g = this.screen.g;
    this.input = new Input(this.screen);
    this.cam = new Camera();
    this.lighting = new Lighting();
    this.particles = new Particles();
    this.snow = new Snowfall(170);
    this.smoke = new Smoke();
    this.floatText = new FloatText();
    this.t = 0;

    this.state = 'title';   // title | play
    this.ui = new UI(this);

    /* ---- art ---- */
    buildTiles();
    buildArt();
    buildEnemyArt();
    this.icons = {
      choc: {},          // `${kind}_${quality}` -> canvas
      ing: {},
      tool: {},
      coin: PR.coinIcon(),
    };
    for (let k = 0; k < 5; k++) for (let q = 0; q < 4; q++)
      this.icons.choc[`${k}_${q}`] = PR.chocolateIcon(k, q);
    for (const id of INGREDIENT_ORDER) this.icons.ing[id] = PR.ingredientIcon(id);
    for (const tk of ['sword', 'shield', 'bow', 'whisk', 'basket', 'lantern'])
      this.icons.tool[tk] = PR.toolIcon(tk);

    /* ---- maps ---- */
    this.maps = {
      town: buildTown(),
      shop: buildShop(),
      kitchen: buildKitchen(),
      grove: buildGrove(),
    };

    /* ---- player ---- */
    this.player = new Player({
      skin: 'skinA', hair: 'wood', hairStyle: 'short',
      shirt: 'plum', pants: 'ink', shoe: 'wood', apron: 'cream',
    });

    /* ---- progression ---- */
    this.inv = { ing: { cocoaPod: 6, sugar: 6, milk: 4, cream: 2 }, choc: [] };
    this.unlocked = new Set(RECIPES.filter(r => r.unlocked).map(r => r.id));
    this.day = 1;
    this.minutes = 6 * 60;      // 06:00
    this.season = 'Winter';
    this.shopOpen = false;
    this.dayGold = 0;
    this.totalSales = 0;
    this.bossDefeated = false;
    this.msgQueue = [];
    this.slashes = [];
    this.projectiles = [];
    this.pickups = [];

    /* ---- entities per map ---- */
    this.enemies = [];
    this.npcs = NPCS.map(d => new NPC(d));
    this.ghosts = [];
    this.customers = [];
    for (let i = 0; i < 4; i++)
      this.ghosts.push(new Ghost(i % 3, (7 + i * 4) * TS, (8 + (i % 2) * 3) * TS, GHOST_NAMES[i]));
    this.boss = new Boss(this.maps.grove.bossArena.x + this.maps.grove.bossArena.w / 2,
                         this.maps.grove.bossArena.y + this.maps.grove.bossArena.h / 2);

    this.spawnGroveEnemies();

    /* ---- shop counters ---- */
    for (const c of this.maps.shop.counterSlots) { c.max = 12; c.qty = 0; c.item = null; c.price = 0; }

    this.setMap('town', 41 * TS, 22 * TS);
    this.notify('Day 1 — ' + TIPS[0]);

    this.loop = new Loop(dt => this.update(dt), () => this.render());
  }

  start() { this.loop.start(); }

  /* ================================================================ *
   * WORLD
   * ================================================================ */
  /** Nearest walkable point to (x,y), searched outward in rings. */
  freeSpotNear(map, x, y) {
    const tx = Math.floor(x / TS), ty = Math.floor(y / TS);
    if (!map.isSolid(tx, ty)) return { x, y };
    for (let r = 1; r < 24; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const nx = tx + dx, ny = ty + dy;
          if (map.isSolid(nx, ny)) continue;
          return { x: nx * TS + TS / 2, y: ny * TS + TS / 2 };
        }
      }
    }
    return { x, y };
  }

  setMap(id, x, y) {
    this.map = this.maps[id];
    this.mapId = id;
    if (x == null || y == null) {
      const sp = this.map.spawn || { x: (this.map.w / 2) * TS, y: (this.map.h / 2) * TS };
      x = sp.x; y = sp.y;
    }
    // a target that has drifted into geometry must not strand the player
    const safe = this.freeSpotNear(this.map, x, y);
    x = safe.x; y = safe.y;
    this.player.x = x; this.player.y = y;
    this.cam.follow(x, y, this.map.bounds, true);
    this.smoke.setSources(this.map.smokes || []);
    this.smoke.puffs.length = 0;
    this.particles.clear();
    if (id === 'grove' && this.enemies.length === 0) this.spawnGroveEnemies();
  }

  spawnGroveEnemies() {
    this.enemies = this.maps.grove.spawns.map(s => new Enemy(s.type, s.x, s.y));
  }

  uiBlocking() { return this.ui.mode !== null; }

  /* ================================================================ *
   * TIME
   * ================================================================ */
  get hour() { return Math.floor(this.minutes / 60); }
  get clockStr() {
    let h = Math.floor(this.minutes / 60) % 24;
    const m = Math.floor(this.minutes % 60 / 10) * 10;
    const ap = h < 12 || h >= 24 ? 'am' : 'pm';
    let hh = h % 12; if (hh === 0) hh = 12;
    return `${hh}:${m.toString().padStart(2, '0')}${ap}`;
  }
  ambientKey() {
    const h = this.hour;
    if (h < 5) return 'deep';
    if (h < 8) return 'dawn';
    if (h < 17) return 'day';
    if (h < 20) return 'dusk';
    if (h < 25) return 'night';
    return 'deep';
  }

  advanceDay() {
    this.day++;
    this.minutes = 6 * 60;
    this.player.hp = this.player.maxHp;
    this.player.en = this.player.maxEn;
    this.shopOpen = false;
    this.customers.length = 0;
    // forage respawn
    for (const f of this.maps.grove.forage) if (Math.random() < 0.75) f.taken = false;
    this.lastDayGold = this.dayGold;
    this.lastDaySpent = this.daySpent || 0;
    this.daySpent = 0;
    this.spawnGroveEnemies();
    this.dayGold = 0;
    this.setMap('shop');
    this.notify(`Day ${this.day}. ${TIPS[(this.day - 1) % TIPS.length]}`);
    this.ui.open('dayEnd');
  }

  /* ================================================================ *
   * UPDATE
   * ================================================================ */
  update(dt) {
    this.t += dt;
    const inp = this.input;

    if (this.state === 'title') {
      if (inp.wasPressed('Enter', ' ') || inp.mouse.pressed) { this.state = 'play'; }
      this.snow.update(dt, this.t);
      inp.endFrame();
      return;
    }

    // global hotkeys
    if (inp.wasPressed('Escape')) { if (this.ui.mode) this.ui.close(); else this.ui.open('menu'); }
    if (inp.wasPressed('i', 'Tab')) this.ui.toggle('inventory');
    if (inp.wasPressed('c')) this.ui.toggle('recipes');
    if (inp.wasPressed('m')) this.ui.toggle('journal');
    if (inp.wasPressed('g')) this.ui.toggle('gear');

    // endFrame() clears mouse.pressed before render() runs, and every panel
    // hit-tests during render — so latch the click across the boundary
    if (inp.mouse.pressed) this.uiClick = true;
    if (inp.mouse.rpressed) this.uiRClick = true;
    this.ui.update(dt, inp);

    if (!this.uiBlocking()) {
      // time only advances during play
      this.minutes += dt * (this.mapId === 'grove' ? 1.6 : 2.0);
      if (this.minutes >= 26 * 60) { this.advanceDay(); inp.endFrame(); return; }

      this.player.update(dt, inp, this.map, this);
      this.handleInteract(inp);
    }

    this.cam.update(dt);
    this.cam.follow(Math.round(this.player.x), Math.round(this.player.y - 6), this.map.bounds);

    /* ---- entities ---- */
    if (this.mapId === 'town') for (const n of this.npcs) n.update(dt, this.map, this.player);
    if (this.mapId === 'shop') {
      for (const gh of this.ghosts) gh.update(dt, this.map, this);
      this.updateShop(dt);
    }
    if (this.mapId === 'grove') this.updateGrove(dt);

    /* ---- slashes / projectiles ---- */
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const s = this.slashes[i];
      s.t += dt;
      if (s.t > 0.24) this.slashes.splice(i, 1);
    }
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      p.rot = (p.rot || 0) + dt * 8;
      p.age = (p.age || 0) + dt;
      const hitWall = p.age > 0.1 && this.map.isSolid(Math.floor(p.x / TS), Math.floor(p.y / TS));
      if (p.life <= 0 || hitWall) {
        FX.hit(this.particles, p.x, p.y);
        this.projectiles.splice(i, 1); continue;
      }
      if (p.friendly) {
        let consumed = false;
        for (const e of this.enemies) {
          if (e.dead || p.hits.has(e)) continue;
          if (Math.hypot(p.x - e.x, p.y - e.y) < 11) {
            p.hits.add(e);
            e.hurt(p.dmg + ((Math.random() * 3) | 0), p.x, p.y, this, e.stun > 0);
            this.sfx('hit');
            if (p.pierce > 0) p.pierce--; else consumed = true;
            break;
          }
        }
        if (!consumed && this.boss.active && !this.boss.dead && !p.hits.has(this.boss)
            && Math.hypot(p.x - this.boss.x, p.y - (this.boss.y - 16)) < 26) {
          p.hits.add(this.boss);
          this.boss.hurt(p.dmg + 2, p.x, p.y, this, this.boss.stun > 0);
          if (p.pierce > 0) p.pierce--; else consumed = true;
        }
        if (consumed) { FX.hit(this.particles, p.x, p.y); this.projectiles.splice(i, 1); }
        continue;
      }
      if (Math.hypot(p.x - this.player.x, p.y - this.player.y) < 10) {
        // the Spirit Ward build turns incoming shots around instead of eating them
        if (this.player.blocking && this.player.loadout.def('offhand')
            && this.player.loadout.def('offhand').reflect) {
          p.vx = -p.vx; p.vy = -p.vy;
          p.friendly = true; p.hits = new Set();
          p.dmg = Math.round(p.dmg * 1.5);
          p.life = 1.6;
          this.floatText.add(this.player.x, this.player.y - 26, 'REFLECT', '#a394ee');
          this.sfx('block');
          continue;
        }
        const r = this.player.hurt(p.dmg, p.x, p.y, this);
        if (r) { this.projectiles.splice(i, 1); FX.hit(this.particles, p.x, p.y); }
      }
    }
    // pickups drift toward the player
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      pk.life -= dt; pk.bob += dt * 5;
      const d = Math.hypot(pk.x - this.player.x, pk.y - this.player.y);
      if (d < 46) {
        const a = Math.atan2(this.player.y - pk.y, this.player.x - pk.x);
        const sp = 160 * (1 - d / 46) + 30;
        pk.x += Math.cos(a) * sp * dt; pk.y += Math.sin(a) * sp * dt;
      }
      if (d < 9) {
        this.collect(pk);
        this.pickups.splice(i, 1); continue;
      }
      if (pk.life <= 0) this.pickups.splice(i, 1);
    }

    this.updateConches(dt);
    this.particles.update(dt);
    this.floatText.update(dt);
    this.smoke.update(dt, this.t);
    if (!this.map.indoor) this.snow.update(dt, this.t);

    if (this.msgT > 0) this.msgT -= dt;
    inp.endFrame();
  }

  /* ---------------- combat resolution ---------------- */
  updateGrove(dt) {
    const pl = this.player;
    for (const e of this.enemies) {
      if (e.dead && e.deathT > 0.6) continue;
      e.update(dt, this.map, pl, this);
    }
    // boss activation
    const ba = this.maps.grove.bossArena;
    if (!this.bossDefeated && !this.boss.active
        && pl.x > ba.x && pl.x < ba.x + ba.w && pl.y > ba.y && pl.y < ba.y + ba.h) {
      this.boss.active = true;
      this.notify('The Hollow Queen stirs.');
      this.cam.kick(5);
    }
    if (this.boss.active) this.boss.update(dt, this.map, pl, this);

    // sword hits
    if (pl.swingT > 0 && pl.swingPhase >= 1) {
      const rect = pl.swingRect();
      const stunBonus = pl.fastWindow > 0;
      for (const e of this.enemies) {
        if (e.dead || pl.hitList.has(e)) continue;
        if (this.overlap(rect, { x: e.x - 8, y: e.y - 12, w: 16, h: 18 })) {
          pl.hitList.add(e);
          const dmg = pl.swingDamage(e.stun > 0) + ((Math.random() * 3) | 0);
          e.hurt(dmg, pl.x, pl.y, this, e.stun > 0);
          this.cam.kick(2.2);
          this.sfx('hit');
        }
      }
      if (this.boss.active && !this.boss.dead && !pl.hitList.has(this.boss)) {
        if (this.overlap(rect, { x: this.boss.x - 18, y: this.boss.y - 30, w: 36, h: 46 })) {
          pl.hitList.add(this.boss);
          const dmg = Math.round(pl.swingDamage(this.boss.stun > 0) * 1.2) + ((Math.random() * 4) | 0);
          this.boss.hurt(dmg, pl.x, pl.y, this, this.boss.stun > 0);
          this.cam.kick(3);
          this.sfx('hit');
        }
      }
    }

    // enemy touch damage
    for (const e of this.enemies) {
      if (e.dead || e.stun > 0) continue;
      if (Math.hypot(e.x - pl.x, e.y - pl.y) < 12) pl.hurt(e.def.dmg, e.x, e.y, this);
    }
    // clean up long-dead
    this.enemies = this.enemies.filter(e => !(e.dead && e.deathT > 1.2));
  }

  overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  spawnSlash(pl) {
    this.slashes.push({ x: pl.x, y: pl.y - 6, dir: pl.dir, t: 0 });
  }

  spawnArrow(pl, angle, bow) {
    const sp = bow.speed || 190;
    this.projectiles.push({
      x: pl.x, y: pl.y - 6,
      vx: Math.cos(angle) * sp, vy: Math.sin(angle) * sp,
      life: 1.6, dmg: Math.round(pl.loadout.stat('ranged', 'dmg', 7)),
      img: Enemy.cache.arrow, rot: angle, friendly: true,
      pierce: bow.pierce || 0, hits: new Set(),
    });
  }

  onEnemyTelegraph(e) {
    e.flash = 0.18;
    this.floatText.add(e.x, e.y - 26, '!', '#ff5a4a');
    this.particles.burst(e.x, e.y - 8, 6,
      { speed: 30, life: 0.35, col: ['#ff5a4a', '#faea61'], size: 1, drag: 0.9 });
  }

  onGuardBreak(pl) {
    this.cam.kick(5);
    this.sfx('hurt');
    this.floatText.add(pl.x, pl.y - 30, 'GUARD BROKEN', '#ff5a4a');
  }

  onBlock(pl, fx, fy, parried) {
    this.cam.kick(parried ? 3 : 1.5);
    this.sfx('block');
    this.floatText.add(pl.x, pl.y - 26, parried ? 'PARRY!' : 'guard',
                       parried ? '#ffd066' : '#a8b4d8');
    if (!parried) return;
    this.particles.burst(pl.x + (fx - pl.x) * 0.4, pl.y - 8 + (fy - pl.y) * 0.3, 14,
      { speed: 110, life: 0.35, col: ['#ffffff', '#ffd066', '#b8c2ec'], size: 2, shrink: true, drag: 0.9 });
    // stagger whatever the off-hand reaches
    const stun = pl.loadout.stat('offhand', 'stun', 2.0);
    const reach = pl.loadout.stat('offhand', 'aoeStun', 0) || 34;
    if (reach > 40) {
      this.cam.kick(5);
      this.particles.burst(pl.x, pl.y - 8, 26,
        { speed: 150, life: 0.5, col: ['#ffd066', '#faea61', '#ffffff'], size: 2, shrink: true, drag: 0.9 });
    }
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - pl.x, e.y - pl.y) < reach) {
        e.stun = stun;
        e.knock.x = (e.x - pl.x) * 5; e.knock.y = (e.y - pl.y) * 5;
      }
    }
    if (this.boss.active && Math.hypot(this.boss.x - pl.x, this.boss.y - pl.y) < Math.max(60, reach)) {
      this.boss.stun = stun * 0.8; this.boss.dashT = 0;
    }
  }

  onPlayerHurt(dmg) {
    this.cam.kick(4);
    this.sfx('hurt');
    this.floatText.add(this.player.x, this.player.y - 24, '-' + dmg, '#ff7a8a');
    if (this.player.hp <= 0) {
      this.notify('You black out in the snow… and wake up at home.');
      this.player.hp = Math.round(this.player.maxHp * 0.5);
      this.minutes = Math.max(this.minutes, 24 * 60);
      this.setMap('shop');
    }
  }

  enemyAttack(e, pl) {
    if (e.type === 'crow' || e.type === 'bat') {
      const a = Math.atan2(pl.y - e.y, pl.x - e.x);
      this.projectiles.push({ x: e.x, y: e.y - 6, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110,
        life: 2.4, dmg: e.def.dmg, img: Enemy.cache.orb, rot: 0 });
    } else {
      pl.hurt(e.def.dmg, e.x, e.y, this, !!e.def.unblockable);
    }
  }

  bossVolley(b, pl, n) {
    const base = Math.atan2(pl.y - b.y, pl.x - b.x);
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * 0.24;
      this.projectiles.push({ x: b.x, y: b.y - 6, vx: Math.cos(a) * 96, vy: Math.sin(a) * 96,
        life: 3.2, dmg: 8, img: Enemy.cache.stinger, rot: a });
    }
    this.sfx('shoot');
  }
  bossSummon(b) {
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * Math.PI * 2;
      const e = new Enemy('bat', b.x + Math.cos(a) * 40, b.y + Math.sin(a) * 40);
      this.enemies.push(e);
      FX.ghostPoof(this.particles, e.x, e.y);
    }
  }
  bossTouch(b, pl) { pl.hurt(12, b.x, b.y, this, true); }   // the charge cannot be parried

  onEnemyKilled(e) {
    const [g0, g1] = e.def.gold;
    const gold = g0 + ((Math.random() * (g1 - g0)) | 0);
    this.player.gold += gold;
    this.floatText.add(e.x, e.y - 30, '+' + gold + 'g', '#ffd066');
    for (const [item, chance] of e.def.drops) {
      if (Math.random() < chance) this.dropPickup(e.x, e.y, 'ing', item);
    }
    const gear = rollDrop(e.type, Math.random, this.day * 0.1);
    if (gear) this.dropGear(e.x, e.y, gear);
    this.sfx('kill');
  }

  onBossKilled(b) {
    this.bossDefeated = true;
    this.notify('The Hollow Queen falls. Her hive is yours.');
    this.player.gold += 800;
    for (let i = 0; i < 6; i++) this.dropPickup(b.x + (Math.random() - .5) * 40, b.y + (Math.random() - .5) * 30, 'ing', 'honey');
    bossDrops(Math.random).forEach((g, i) => {
      const a = (i / 4) * Math.PI * 2;
      this.dropGear(b.x + Math.cos(a) * 34, b.y + Math.sin(a) * 26, g);
    });
    for (const id of ['spiritPrali', 'hollowRoyale']) this.unlocked.add(id);
    this.cam.kick(9);
    FX.ghostPoof(this.particles, b.x, b.y - 20);
  }

  dropPickup(x, y, kind, id) {
    this.pickups.push({ x, y, kind, id, life: 26, bob: Math.random() * 6, qty: 1 });
  }

  dropGear(x, y, gear) {
    this.pickups.push({ x, y, kind: 'gear', gear, life: 60, bob: Math.random() * 6, qty: 1 });
    FX.sparkle(this.particles, x, y, RARITY[gear.rarity].col);
  }

  collect(pk) {
    if (pk.kind === 'gear') {
      const g = pk.gear;
      const def = itemDef(g.slot, g.id);
      const res = this.player.loadout.acquire(g);
      const rc = RARITY[g.rarity];
      if (res === 'duplicate') {
        const worth = 40 + (def.tier || 0) * 60;
        this.player.gold += worth;
        this.floatText.add(pk.x, pk.y - 14, '+' + worth + 'g', '#ffd066');
      } else {
        this.floatText.add(pk.x, pk.y - 14, `${rc.name} ${def.name}`, rc.col);
        this.notify(`Found: ${rc.name} ${def.name} — ${def.desc}`);
      }
      FX.sparkle(this.particles, pk.x, pk.y, rc.col);
      this.sfx('pickup');
      return;
    }
    if (pk.kind === 'ing') {
      this.inv.ing[pk.id] = (this.inv.ing[pk.id] || 0) + pk.qty;
      this.floatText.add(pk.x, pk.y - 14, '+' + INGREDIENTS[pk.id].name, '#d6f4ff');
      FX.sparkle(this.particles, pk.x, pk.y, '#d6f4ff');
    }
    this.sfx('pickup');
  }

  /* ---------------- interaction ---------------- */
  nearInteract() {
    const pl = this.player;
    const pr = { x: pl.x - 14, y: pl.y - 10, w: 28, h: 26 };
    for (const w of this.map.warps)
      if (this.overlap(pr, w)) return { kind: 'warp', data: w, label: w.label };
    for (const it of this.map.interact)
      if (this.overlap(pr, it)) return { kind: it.type, data: it, label: it.label };
    if (this.mapId === 'shop') {
      for (const c of this.map.counterSlots)
        if (this.overlap(pr, { x: c.x, y: c.y, w: 32, h: 30 }))
          return { kind: 'counter', data: c, label: c.item ? `${c.item.name} x${c.qty}` : 'Stock Counter' };
    }
    if (this.mapId === 'grove') {
      for (const f of this.map.forage) {
        if (f.taken) continue;
        if (this.overlap(pr, { x: f.x - 8, y: f.y - 8, w: 16, h: 16 }))
          return { kind: 'forage', data: f, label: 'Gather ' + INGREDIENTS[f.kind].name };
      }
    }
    if (this.mapId === 'town') {
      for (const n of this.npcs)
        if (this.overlap(pr, { x: n.x - 8, y: n.y - 10, w: 16, h: 20 }))
          return { kind: 'npc', data: n, label: 'Talk to ' + n.def.name };
    }
    return null;
  }

  handleInteract(inp) {
    this.hover = this.nearInteract();
    if (!inp.wasPressed('e', 'Enter')) return;
    const h = this.hover;
    if (!h) return;
    if (h.kind === 'warp') {
      const w = h.data;
      if (w.spawn) {
        this.setMap(w.to);
      } else {
        let tx = w.tx, ty = w.ty;
        if (w.anchorTown) { ty = this.maps.town.warps[0].y + TS + 6; }
        this.setMap(w.to, tx, ty);
      }
      this.sfx('door');
    } else if (h.kind === 'forage') {
      h.data.taken = true;
      const bonus = this.player.loadout.stat('offhand', 'forageBonus', 0);
      this.inv.ing[h.data.kind] = (this.inv.ing[h.data.kind] || 0) + 1
        + (Math.random() < 0.25 ? 1 : 0) + Math.round(bonus);
      this.floatText.add(h.data.x, h.data.y - 12, '+' + INGREDIENTS[h.data.kind].name, '#d6f4ff');
      FX.sparkle(this.particles, h.data.x, h.data.y, '#8fc9dc');
      this.player.en = Math.max(0, this.player.en - 2);
      this.sfx('pickup');
    } else if (h.kind === 'npc') {
      this.ui.open('dialogue', { npc: h.data });
    } else if (h.kind === 'cauldron') {
      this.ui.open('craft', { cauldron: h.data.id });
    } else if (h.kind === 'conche') {
      this.ui.open('conche', { conche: h.data.id });
    } else if (h.kind === 'recipeBook') {
      this.ui.open('recipes');
    } else if (h.kind === 'counter') {
      this.ui.open('stock', { counter: h.data });
    } else if (h.kind === 'openSign') {
      this.toggleShop();
    } else if (h.kind === 'vendor') {
      this.ui.open('vendor', { vendorId: h.data.vendorId });
    }
  }

  toggleShop() {
    this.shopOpen = !this.shopOpen;
    if (this.shopOpen) {
      this.notify('The shop is open. Ghosts to your stations!');
      this.customerTimer = 1.5;
    } else {
      this.notify('Closed for the evening.');
      this.customers.length = 0;
    }
    this.sfx('bell');
  }

  /* ---------------- shop simulation ---------------- */
  shopCounters() { return this.maps.shop.counterSlots; }

  restock(c) {
    if (!c.item) return;
    const stock = this.inv.choc.find(s => s.id === c.item.id && s.q === c.quality);
    if (!stock || stock.qty <= 0) return;
    const take = Math.min(c.max - c.qty, stock.qty, 4);
    if (take <= 0) return;
    stock.qty -= take;
    c.qty += take;
    if (stock.qty <= 0) this.inv.choc = this.inv.choc.filter(s => s.qty > 0);
    FX.sparkle(this.particles, c.x + 16, c.y + 6, '#d6f4ff');
  }

  updateShop(dt) {
    if (this.shopOpen) {
      this.customerTimer -= dt;
      const appeal = this.shopAppeal();
      if (this.customerTimer <= 0 && this.customers.length < 7) {
        this.customerTimer = Math.max(1.2, 6.5 - appeal * 0.35);
        this.spawnCustomer();
      }
    }
    for (let i = this.customers.length - 1; i >= 0; i--) {
      const c = this.customers[i];
      c.update(dt, this.map, this);
      if (c.done) this.customers.splice(i, 1);
    }
  }

  shopAppeal() {
    let a = 0;
    for (const c of this.shopCounters()) if (c.item && c.qty > 0) a += 2 + (c.item.star || 0) * 2;
    return a + this.townHearts() * 1.5;      // a well-liked shop draws a crowd
  }

  spawnCustomer() {
    // townsfolk you know come in first, and come in more often
    const known = this.npcs.filter(n => !this.customers.some(c => c.npcId === n.def.id));
    if (known.length && Math.random() < 0.35 + Math.min(0.4, this.townHearts() * 0.03)) {
      const weights = known.map(n => 1 + (n.hearts || 0) * 0.6);
      let r = Math.random() * weights.reduce((a, b) => a + b, 0);
      let pick = known[0];
      for (let i = 0; i < known.length; i++) { r -= weights[i]; if (r <= 0) { pick = known[i]; break; } }
      const d = this.maps.shop.door || { x: 16 * TS, y: 21 * TS };
      const c = new Customer(pick.def.spec, d.x + (Math.random() - 0.5) * 12, d.y);
      c.npcId = pick.def.id;
      c.name = pick.def.name;
      c.taste = pick.def.likes;
      c.wallet = 120 + (pick.hearts || 0) * 90 + Math.random() * 260;
      this.customers.push(c);
      return;
    }
    const palettes = [
      { skin: 'skinA', hair: 'ink', hairStyle: 'short', shirt: 'teal', pants: 'ink', shoe: 'wood' },
      { skin: 'skinB', hair: 'wood', hairStyle: 'long', shirt: 'gold', pants: 'plum', shoe: 'ink' },
      { skin: 'skinC', hair: 'ruby', hairStyle: 'bun', shirt: 'rose', pants: 'ink', shoe: 'wood' },
      { skin: 'skinA', hair: 'moon', hairStyle: 'wild', shirt: 'plum', pants: 'oak', shoe: 'ink', hat: 'wood' },
      { skin: 'skinB', hair: 'ink', hairStyle: 'short', shirt: 'cream', pants: 'teal', shoe: 'wood', cape: 'teal' },
    ];
    const sp = palettes[(Math.random() * palettes.length) | 0];
    const d = this.maps.shop.door || { x: 16 * TS, y: 21 * TS };
    const c = new Customer(sp, d.x + (Math.random() - 0.5) * 12, d.y);
    c.taste = [];
    this.customers.push(c);
  }

  customerBuy(cust, counter) {
    if (!counter || !counter.item || counter.qty <= 0) return;
    const rec = counter.item;
    const fair = this.itemValue(rec, counter.quality);
    const loves = cust.taste && cust.taste.includes(rec.id);
    // someone buying their favourite will stretch well past the going rate
    const ratio = counter.price / (fair * (loves ? 1.5 : 1));
    // willingness curve: cheap sells always, overpriced sometimes walks
    const chance = ratio <= 1 ? 1 : Math.max(0.08, 1.55 - ratio * 0.55);
    if (Math.random() > chance) {
      this.floatText.add(cust.x, cust.y - 26, 'too dear!', '#a8927c');
      return;
    }
    counter.qty -= 1;
    const paid = Math.round(counter.price);
    this.player.gold += paid;
    this.dayGold += paid;
    this.totalSales += 1;
    this.floatText.add(counter.x + 16, counter.y - 6, '+' + paid + 'g',
                       loves ? '#c66a7c' : '#ffd066');
    if (loves && cust.npcId) {
      const npc = this.npcs.find(n => n.def.id === cust.npcId);
      if (npc) {
        npc.friendship = Math.min(1000, (npc.friendship || 0) + 12);
        npc.hearts = Math.floor(npc.friendship / 100);
      }
      this.floatText.add(cust.x, cust.y - 30, 'their favourite!', '#c66a7c');
    }
    FX.coin(this.particles, counter.x + 16, counter.y);
    this.sfx('sale');
  }

  /* ---------------- conching: the conventional, hands-off route ---------- */
  conches() { return this.maps.kitchen.conches || []; }

  /** Load a machine. Cheaper attention, lower quality, bigger batch. */
  startConche(id, rec) {
    const c = this.conches()[id];
    if (!c || c.recipe) return false;
    if (!this.canCraft(rec)) return false;
    for (const k in rec.need) this.inv.ing[k] -= rec.need[k];
    c.recipe = rec;
    c.dur = 90 + (rec.star || 0) * 45;      // in game-minutes
    c.t = 0;
    c.qty = 8 + (rec.star || 0) * 2;
    this.notify(`The ${rec.name} batch is grinding. It will keep going without you.`);
    this.sfx('craft');
    return true;
  }

  updateConches(dt) {
    const rate = dt * (this.mapId === 'grove' ? 1.6 : 2.0);   // matches the clock
    for (const c of this.conches()) {
      if (!c.recipe) continue;
      c.t += rate;
      if (c.t < c.dur) continue;
      let stock = this.inv.choc.find(x => x.id === c.recipe.id && x.q === 0);
      if (!stock) { stock = { id: c.recipe.id, q: 0, qty: 0 }; this.inv.choc.push(stock); }
      stock.qty += c.qty;
      this.notify(`${c.qty} × ${c.recipe.name} finished conching.`);
      this.sfx('bell');
      c.recipe = null; c.t = 0; c.qty = 0;
    }
  }

  /* ---------------- crafting ---------------- */
  canCraft(rec) {
    for (const k in rec.need) if ((this.inv.ing[k] || 0) < rec.need[k]) return false;
    return true;
  }
  doCraft(rec, quality) {
    for (const k in rec.need) this.inv.ing[k] -= rec.need[k];
    const n = 3 + (quality > 0 ? 1 : 0) + (quality > 1 ? 1 : 0);
    let s = this.inv.choc.find(x => x.id === rec.id && x.q === quality);
    if (!s) { s = { id: rec.id, q: quality, qty: 0 }; this.inv.choc.push(s); }
    s.qty += n;
    this.notify(`Made ${n} × ${rec.name}${quality ? ' (' + '★'.repeat(quality) + ')' : ''}.`);
    this.player.en = Math.max(0, this.player.en - 6);
    FX.sparkle(this.particles, this.player.x, this.player.y - 10, '#ffd066');
    this.sfx('craft');
    // discovery is earned: every few successful batches opens the next tier you
    // have the ingredients to reach
    this.totalCrafts = (this.totalCrafts || 0) + 1;
    if (this.totalCrafts % 2 === 0) {
      const locked = RECIPES
        .filter(r => !this.unlocked.has(r.id))
        .sort((a, b) => (a.star || 0) - (b.star || 0));
      const reachable = locked.find(r => this.canCraft(r)) || locked[0];
      if (reachable && (reachable.star || 0) <= 1 + (this.totalCrafts / 4)) {
        this.unlocked.add(reachable.id);
        this.notify('New recipe discovered: ' + reachable.name + '!');
      }
    }
  }

  /** Market value of one chocolate at a given star quality. */
  itemValue(rec, q) { return Math.round(rec.base * (1 + (q || 0) * 0.35)); }

  /** Guarded spend — gold can never go negative. */
  spend(n) {
    if (this.player.gold < n) return false;
    this.player.gold -= n;
    this.daySpent = (this.daySpent || 0) + n;
    return true;
  }

  buyIngredient(vendorId, entry) {
    const v = VENDORS[vendorId];
    const ing = INGREDIENTS[entry.id];
    const price = Math.round(ing.price * entry.markup);
    if (!this.spend(price)) { this.notify("You can't afford that."); this.sfx('hurt'); return false; }
    this.inv.ing[entry.id] = (this.inv.ing[entry.id] || 0) + 1;
    this.floatText.add(this.player.x, this.player.y - 24, '-' + price + 'g', '#ff9a8a');
    this.sfx('sale');
    return true;
  }

  /** Give a chocolate to a townsperson. One per person per day. */
  giveGift(npc, stock) {
    if (npc.giftedDay === this.day) { this.notify(`${npc.def.name} has already had a gift today.`); return false; }
    const rec = recipeById(stock.id);
    if (!rec || stock.qty <= 0) return false;
    stock.qty -= 1;
    this.inv.choc = this.inv.choc.filter(sx => sx.qty > 0);
    npc.giftedDay = this.day;
    const liked = npc.def.likes.includes(rec.id);
    const gain = Math.round((liked ? 80 : 30) * (1 + (stock.q || 0) * 0.3));
    const before = npc.hearts;
    npc.friendship = Math.min(1000, (npc.friendship || 0) + gain);
    npc.hearts = Math.floor(npc.friendship / 100);
    this.floatText.add(npc.x, npc.y - 28, (liked ? '♥♥ ' : '♥ ') + '+' + gain, '#c66a7c');
    FX.sparkle(this.particles, npc.x, npc.y - 10, '#c66a7c');
    this.sfx('sale');
    this.notify(liked
      ? `${npc.def.name} lights up. That was exactly right.`
      : `${npc.def.name} accepts the ${rec.name} politely.`);
    if (npc.hearts > before) this.notify(`${npc.def.name} — ${npc.hearts} ♥`);
    return true;
  }

  /** Total goodwill in town, which feeds shop footfall. */
  townHearts() { return this.npcs.reduce((a, n) => a + (n.hearts || 0), 0); }

  notify(str) { this.msg = str; this.msgT = 5.0; }
  sfx(name) { if (this.audio) this.audio.play(name); }

  /* ================================================================ *
   * RENDER
   * ================================================================ */
  render() {
    const g = this.g;
    g.imageSmoothingEnabled = false;

    if (this.state === 'title') {
      this.renderTitle(); this.screen.present();
      this.uiClick = false; this.uiRClick = false;
      return;
    }

    const camx = this.cam.ox, camy = this.cam.oy;
    const map = this.map;

    /* ---- background ---- */
    g.fillStyle = map.indoor ? '#0d0a16' : '#0a0c1c';
    g.fillRect(0, 0, VW, VH);

    /* ---- ground ---- */
    const tx0 = Math.max(0, Math.floor(camx / TS)), ty0 = Math.max(0, Math.floor(camy / TS));
    const tx1 = Math.min(map.w - 1, Math.ceil((camx + VW) / TS)), ty1 = Math.min(map.h - 1, Math.ceil((camy + VH) / TS));
    for (let y = ty0; y <= ty1; y++) {
      for (let x = tx0; x <= tx1; x++) {
        const name = map.ground[map.idx(x, y)];
        const img = tileAt(name, x, y);
        if (img) g.drawImage(img, x * TS - camx, y * TS - camy);
        const ov = map.over[map.idx(x, y)];
        if (ov) { const oi = tileAt(ov, x, y); if (oi) g.drawImage(oi, x * TS - camx, y * TS - camy); }
      }
    }

    /* ---- floor decals (rugs) ---- */
    for (const d of map.decals || []) {
      if (d.x + d.img.width < camx || d.x > camx + VW) continue;
      if (d.y + d.img.height < camy || d.y > camy + VH) continue;
      g.drawImage(d.img, Math.round(d.x - camx), Math.round(d.y - camy));
    }

    /* ---- sorted renderables ---- */
    const draw = [];
    for (const p of map.props) {
      if (p.x + p.img.width < camx - 8 || p.x > camx + VW + 8) continue;
      if (p.y + p.img.height < camy - 8 || p.y > camy + VH + 8) continue;
      let img = p.img;
      if (p.anim === 'cauldron') img = ART.cauldron[Math.floor(this.t * 6) % 4].canvas;
      else if (p.anim === 'candelabra') img = ART.candelabra[Math.floor(this.t * 7) % 4].canvas;
      else if (p.anim === 'fireplace') img = ART.fireplace[Math.floor(this.t * 8) % 4].canvas;
      else if (p.anim === 'chandelier') img = ART.chandelier[Math.floor(this.t * 5) % 4].canvas;
      else if (p.anim === 'conche') img = ART.conche[Math.floor(this.t * 4) % 4].canvas;
      draw.push({
        sy: p.sy, img, x: p.x, y: p.y,
        shadow: p.shadow ? [Math.round(p.x + img.width / 2 + (p.shadow[1] || 0)), p.sy - 2, p.shadow[0]] : null,
      });
    }

    // forage nodes
    if (this.mapId === 'grove') {
      for (const f of map.forage) {
        if (f.taken) continue;
        const img = ART.forage[f.kind] || this.icons.ing[f.kind];
        draw.push({ sy: f.y + 8, img, x: Math.round(f.x - img.width / 2), y: Math.round(f.y - img.height + 8),
                    shadow: [Math.round(f.x), Math.round(f.y + 6), 6] });
      }
    }

    // counters' stocked chocolate
    if (this.mapId === 'shop') {
      for (const c of map.counterSlots) {
        if (!c.item || c.qty <= 0) continue;
        const icon = this.icons.choc[`${c.item.kind}_${c.quality || 0}`];
        const n = Math.min(4, Math.ceil(c.qty / 3));
        for (let i = 0; i < n; i++)
          draw.push({ sy: c.y + 15, icon, x: c.x + 3 + i * 7, y: c.y - 2 });
      }
    }

    // entities
    const addChar = (e, sprite, extra = {}) => {
      draw.push(Object.assign({
        sy: e.y + (e.hh || 5), img: sprite,
        x: Math.round(e.x - sprite.width / 2), y: Math.round(e.y - sprite.height + 6),
        shadow: [Math.round(e.x), Math.round(e.y + 4), Math.round(sprite.width * 0.34)],
      }, extra));
    };

    addChar(this.player, this.player.sprite(), { flash: this.player.hurtT > 0 ? '#ff8fa0' : null });

    if (this.mapId === 'town') for (const n of this.npcs) addChar(n, n.sprite());
    if (this.mapId === 'shop') {
      for (const gh of this.ghosts) {
        const s = gh.sprite();
        draw.push({ sy: gh.y + 8, img: s, x: Math.round(gh.x - s.width / 2),
          y: Math.round(gh.y - s.height + Math.sin(this.t * 2 + gh.bob) * 2), alpha: 0.82, glow: '#8fc9dc' });
      }
      for (const c of this.customers) addChar(c, c.sprite());
    }
    if (this.mapId === 'grove') {
      for (const e of this.enemies) {
        const s = e.frames();
        const bob = e.type === 'bat' || e.type === 'crow' ? Math.sin(this.t * 4 + e.bobPh) * 3 : 0;
        draw.push({ sy: e.y + 4, img: s,
          x: Math.round(e.x - s.width / 2), y: Math.round(e.y - s.height + 6 + bob),
          shadow: [Math.round(e.x), Math.round(e.y + 4), 7],
          flash: e.flash > 0 ? '#ffffff' : null,
          alpha: e.dead ? Math.max(0, 1 - e.deathT * 1.6) : 1,
          stun: e.stun > 0 });
      }
      if (this.boss.active && !this.boss.dead) {
        const bs = Enemy.cache.boss[this.boss.frame];
        draw.push({ sy: this.boss.y + 8, img: bs.canvas,
          x: Math.round(this.boss.x - bs.canvas.width / 2), y: Math.round(this.boss.y - bs.canvas.height + 18),
          shadow: [Math.round(this.boss.x), Math.round(this.boss.y + 8), 20],
          flash: this.boss.flash > 0 ? '#ffffff' : null, stun: this.boss.stun > 0 });
      }
    }

    // pickups
    for (const pk of this.pickups) {
      const icon = pk.kind === 'gear'
        ? this.icons.tool[itemDef(pk.gear.slot, pk.gear.id).icon]
        : this.icons.ing[pk.id];
      draw.push({ sy: pk.y + 4, icon, x: Math.round(pk.x - icon.width / 2),
                  y: Math.round(pk.y - 10 + Math.sin(pk.bob) * 2) });
    }

    draw.sort((a, b) => a.sy - b.sy);

    /* ---- shadows first ---- */
    g.save();
    for (const d of draw) {
      if (!d.shadow) continue;
      const [sx, sy, sr] = d.shadow;
      g.globalAlpha = 0.34;
      g.fillStyle = '#05050c';
      g.beginPath();
      g.ellipse(sx - camx, sy - camy, sr, Math.max(2, sr * 0.4), 0, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    g.restore();

    /* ---- sorted draw ---- */
    for (const d of draw) {
      const img = d.img || d.icon;
      if (!img) continue;
      const dx = Math.round(d.x - camx), dy = Math.round(d.y - camy);
      if (d.alpha != null) g.globalAlpha = d.alpha;
      if (d.stun) {
        g.save(); g.globalAlpha = (d.alpha != null ? d.alpha : 1) * 0.9;
      }
      g.drawImage(img, dx, dy);
      if (d.stun) g.restore();
      if (d.flash) {
        g.save();
        g.globalCompositeOperation = 'source-atop';
        // approximate flash with an additive overlay of the sprite
        g.globalAlpha = 0.75;
        g.drawImage(img, dx, dy);
        g.globalCompositeOperation = 'source-over';
        g.restore();
        g.save();
        g.globalAlpha = 0.55;
        g.fillStyle = d.flash;
        g.globalCompositeOperation = 'lighter';
        g.drawImage(img, dx, dy);
        g.globalCompositeOperation = 'source-over';
        g.restore();
      }
      g.globalAlpha = 1;
      if (d.stun) {
        // dizzy stars
        for (let i = 0; i < 3; i++) {
          const a = this.t * 5 + i * 2.1;
          g.fillStyle = '#ffd066';
          g.fillRect(Math.round(dx + img.width / 2 + Math.cos(a) * 9), Math.round(dy - 4 + Math.sin(a) * 3), 2, 2);
        }
      }
    }

    /* ---- slash arcs ---- */
    for (const s of this.slashes) {
      const f = Math.min(3, Math.floor(s.t / 0.06));
      const img = this.player.slash[f];
      const off = { 0: [0, 14], 1: [-14, 0], 2: [14, 0], 3: [0, -14] }[s.dir];
      const rot = { 0: Math.PI / 2, 1: Math.PI, 2: 0, 3: -Math.PI / 2 }[s.dir];
      g.save();
      g.translate(Math.round(s.x - camx + off[0]), Math.round(s.y - camy + off[1]));
      g.rotate(rot);
      g.globalAlpha = 1 - s.t / 0.26;
      g.drawImage(img, -17, -17);
      g.globalAlpha = 1;
      g.restore();
    }

    /* ---- projectiles ---- */
    for (const p of this.projectiles) {
      g.save();
      g.translate(Math.round(p.x - camx), Math.round(p.y - camy));
      g.rotate(p.rot || 0);
      g.drawImage(p.img, -p.img.width / 2 | 0, -p.img.height / 2 | 0);
      g.restore();
    }

    /* ---- particles + smoke ---- */
    this.particles.draw(g, camx, camy);
    if (!map.indoor) this.smoke.draw(g, camx, camy);

    /* ---- lighting ---- */
    this.lighting.begin();
    for (const L of map.lights) {
      const fl = L.fl ? flicker(this.t, (L.x * 7 + L.y) | 0, 0.16) : 1;
      this.lighting.add(L.x - camx, L.y - camy, L.r * fl, L.col,
                        (L.intensity != null ? L.intensity : 0.72) * fl, L.warm);
    }
    // player lantern
    const lampR = 58 + this.player.loadout.stat('offhand', 'lightBonus', 0);
    this.lighting.add(this.player.x - camx, this.player.y - camy - 6, lampR, '#ffcf8a',
                      lampR > 80 ? 0.72 : 0.5, 0.16);
    // cauldrons / dynamic
    for (const pk of this.pickups)
      this.lighting.add(pk.x - camx, pk.y - camy - 6, pk.kind === 'gear' ? 30 : 22,
                        pk.kind === 'gear' ? RARITY[pk.gear.rarity].col : '#d6f4ff', 0.85, 0.55);
    if (this.mapId === 'grove') {
      for (const f of map.forage) if (!f.taken)
        this.lighting.add(f.x - camx, f.y - camy - 4, 26, '#9fd8e8', 0.45, 0.3);
      for (const e of this.enemies) if (!e.dead && (e.type === 'crow' || e.type === 'bat'))
        this.lighting.add(e.x - camx, e.y - camy - 6, 22, '#e0871f', 0.5, 0.5);
      if (this.boss.active && !this.boss.dead)
        this.lighting.add(this.boss.x - camx, this.boss.y - camy - 26, 70, '#ffb84a', 0.9, 0.6);
    }
    for (const gh of this.ghosts) if (this.mapId === 'shop')
      this.lighting.add(gh.x - camx, gh.y - camy - 8, 34, '#8fc9dc', 0.75, 0.5);
    for (const s of this.slashes)
      this.lighting.add(s.x - camx, s.y - camy, 40, '#dfe4fa', 1 - s.t / 0.24, 0.6);
    for (const p of this.projectiles)
      this.lighting.add(p.x - camx, p.y - camy, 26, '#ffc35a', 0.8, 0.6);

    const amb = map.ambient || {};
    const key = map.indoor ? (amb.key || 'night') : this.ambientKey();
    this.lighting.render(g, key, {
      amount: amb.amount != null ? amb.amount : undefined,
      tint: amb.tint,
      bloom: amb.bloom != null ? amb.bloom : 0.8,
      vignetteAmt: amb.vignetteAmt != null ? amb.vignetteAmt : 0.34,
      gradeAmt: map.indoor ? 0.05 : 0.06,
      gradeCol: map.indoor ? '#6a4a80' : '#5a6ab4',
    });

    /* ---- weather over the lighting ---- */
    if (!map.indoor) this.snow.draw(g);

    /* ---- float text ---- */
    for (const f of this.floatText.list) {
      const a = Math.min(1, f.life / 0.4);
      g.globalAlpha = a;
      drawText(g, f.str, Math.round(f.x - camx), Math.round(f.y - camy), { color: f.col, align: 'center' });
      g.globalAlpha = 1;
    }

    /* ---- HUD + panels ---- */
    if (!this.hideHud) this.ui.render(g);
    this.uiClick = false;
    this.uiRClick = false;

    this.screen.present();
  }

  /* ---------------- title ---------------- */
  renderTitle() {
    const g = this.g;
    // moonlit gradient sky
    for (let y = 0; y < VH; y++) {
      const t = y / VH;
      g.fillStyle = mix('#0a0a1e', '#2a1840', t);
      g.fillRect(0, y, VW, 1);
    }
    // moon
    g.fillStyle = '#dfe4fa';
    g.beginPath(); g.arc(VW - 78, 58, 26, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#b8c2ec';
    g.beginPath(); g.arc(VW - 70, 52, 6, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(VW - 86, 66, 4, 0, Math.PI * 2); g.fill();
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35;
    const gr = g.createRadialGradient(VW - 78, 58, 10, VW - 78, 58, 90);
    gr.addColorStop(0, '#8a97cf'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(VW - 190, -32, 220, 200);
    g.restore();

    // stars
    for (let i = 0; i < 90; i++) {
      const x = (i * 137.5) % VW, y = (i * 71.3) % (VH * 0.6);
      g.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(this.t * 1.2 + i));
      g.fillStyle = '#ffffff';
      g.fillRect(x | 0, y | 0, 1, 1);
    }
    g.globalAlpha = 1;

    // far hills
    g.fillStyle = '#141128';
    g.beginPath();
    g.moveTo(0, VH);
    for (let x = 0; x <= VW; x += 8) g.lineTo(x, VH - 68 - Math.sin(x / 60) * 16 - Math.sin(x / 23) * 6);
    g.lineTo(VW, VH); g.closePath(); g.fill();

    // the castle, sitting on the ridge
    const cImg = ART.castle.canvas;
    g.drawImage(cImg, Math.round(VW / 2 - cImg.width / 2), VH - cImg.height - 6);

    // near ridge + pines in front of it
    g.fillStyle = '#0b0a18';
    g.beginPath();
    g.moveTo(0, VH);
    for (let x = 0; x <= VW; x += 8) g.lineTo(x, VH - 30 - Math.sin(x / 40 + 2) * 8);
    g.lineTo(VW, VH); g.closePath(); g.fill();
    for (let i = 0; i < 11; i++) {
      const img = ART.pine[i % ART.pine.length];
      const x = (i * 47 + 6) % (VW + 40) - 20;
      if (x > VW / 2 - 84 && x < VW / 2 + 60) continue;    // keep the facade clear
      g.globalAlpha = 0.7;
      g.drawImage(img, x, VH - 30 - img.height + 22);
    }
    g.globalAlpha = 1;

    this.snow.draw(g);

    // scrims so the type always reads against the art
    let sc = g.createLinearGradient(0, 0, 0, 96);
    sc.addColorStop(0, 'rgba(6,5,16,0.88)');
    sc.addColorStop(1, 'rgba(6,5,16,0)');
    g.fillStyle = sc; g.fillRect(0, 0, VW, 96);
    sc = g.createLinearGradient(0, VH - 52, 0, VH - 22);
    sc.addColorStop(0, 'rgba(6,5,16,0)');
    sc.addColorStop(1, 'rgba(6,5,16,0.95)');
    g.fillStyle = sc; g.fillRect(0, VH - 52, VW, 30);
    g.fillStyle = 'rgba(6,5,16,0.95)'; g.fillRect(0, VH - 22, VW, 22);

    // logo
    const cx = VW / 2;
    drawText(g, 'COCOA', cx, 16, { color: '#f0cc6a', align: 'center', scale: 3, tracking: 3, shadow: '#2a1010' });
    drawText(g, 'HOLLOW', cx, 42, { color: '#f2e6d0', align: 'center', scale: 3, tracking: 3, shadow: '#2a1010' });
    g.fillStyle = '#7460cc';
    g.fillRect(cx - 128, 68, 44, 1); g.fillRect(cx + 84, 68, 44, 1);
    drawText(g, 'a haunted chocolatier', cx, 65, { color: '#a394ee', align: 'center', scale: 1, tracking: 2 });

    const pulse = 0.55 + 0.45 * Math.sin(this.t * 3);
    g.globalAlpha = pulse;
    drawText(g, 'PRESS ENTER', cx, VH - 26, { color: '#ffd066', align: 'center', scale: 2, tracking: 2 });
    g.globalAlpha = 1;
    drawText(g, 'WASD move  ·  SPACE swing  ·  SHIFT block  ·  E interact',
      cx, VH - 9, { color: '#8a97cf', align: 'center', scale: 1, tracking: 1 });
  }
}
