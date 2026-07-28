// Player, enemies, townsfolk, shop ghosts, and customers.

import { TS } from './art/tiles.js';
import { buildChar, buildGhost, CW, CH, DIR } from './art/chars.js';
import * as EN from './art/enemies.js';
import { FX } from './systems/particles.js';
import { RAMP } from './art/palette.js';
import { Loadout } from './gear.js';

const R = RAMP;

/* ------------------------------------------------------------------ */
function moveWithCollision(e, map, dx, dy) {
  const hw = e.hw, hh = e.hh;
  const solidAt = (px, py) => map.isSolid(Math.floor(px / TS), Math.floor(py / TS));
  // X
  if (dx) {
    const nx = e.x + dx;
    const side = dx > 0 ? nx + hw : nx - hw;
    if (!solidAt(side, e.y - hh + 1) && !solidAt(side, e.y) && !solidAt(side, e.y + hh - 1)) e.x = nx;
    else e.x = dx > 0 ? Math.floor((e.x + hw) / TS) * TS + TS - hw - 0.01
                      : Math.floor((e.x - hw) / TS) * TS + hw + 0.01;
  }
  // Y
  if (dy) {
    const ny = e.y + dy;
    const side = dy > 0 ? ny + hh : ny - hh;
    if (!solidAt(e.x - hw + 1, side) && !solidAt(e.x, side) && !solidAt(e.x + hw - 1, side)) e.y = ny;
    else e.y = dy > 0 ? Math.floor((e.y + hh) / TS) * TS + TS - hh - 0.01
                      : Math.floor((e.y - hh) / TS) * TS + hh + 0.01;
  }
}

/* ================================================================== *
 * PLAYER
 * ================================================================== */
export class Player {
  constructor(spec) {
    this.spec = spec;
    this.art = buildChar(spec);
    this.slash = EN.slashFrames();
    this.x = 0; this.y = 0;
    this.hw = 5; this.hh = 5;
    this.dir = DIR.S;
    this.animT = 0; this.frame = 0;
    this.speed = 82;
    this.maxHp = 60; this.hp = 60;
    this.maxEn = 100; this.en = 100;
    this.gold = 500;
    this.moving = false;

    this.swingT = 0; this.swingCd = 0; this.swingPhase = 0;
    this.blocking = false; this.blockPower = 0;
    this.hurtT = 0; this.iframe = 0;
    this.knock = { x: 0, y: 0 };
    this.hitList = new Set();
    this.combo = 0; this.comboT = 0;
    this.fastWindow = 0;   // granted by a successful block
    this.loadout = new Loadout();
    this.shootCd = 0;
    this.blockRaisedT = 99;   // seconds since the guard went up
    this.guardUsed = true;    // has this raise already answered a blow?
    this.guardBreak = 0;
  }

  get feetY() { return this.y + this.hh; }

  update(dt, input, map, game) {
    if (this.swingCd > 0) this.swingCd -= dt;
    if (this.shootCd > 0) this.shootCd -= dt;
    if (this.iframe > 0) this.iframe -= dt;
    if (this.hurtT > 0) this.hurtT -= dt;
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }
    if (this.fastWindow > 0) this.fastWindow -= dt;

    // knockback
    if (Math.abs(this.knock.x) > 1 || Math.abs(this.knock.y) > 1) {
      moveWithCollision(this, map, this.knock.x * dt, this.knock.y * dt);
      this.knock.x *= Math.pow(0.02, dt); this.knock.y *= Math.pow(0.02, dt);
    }

    const uiOpen = game.uiBlocking();
    let mx = 0, my = 0;
    if (!uiOpen) {
      if (input.isDown('a', 'ArrowLeft')) mx -= 1;
      if (input.isDown('d', 'ArrowRight')) mx += 1;
      if (input.isDown('w', 'ArrowUp')) my -= 1;
      if (input.isDown('s', 'ArrowDown')) my += 1;
    }

    const wantBlock = !uiOpen && input.isDown('Shift') && this.swingT <= 0
                      && this.loadout.canBlock() && this.guardBreak <= 0;
    if (wantBlock && !this.blocking) {
      this.blockRaisedT = 0;
      this.guardUsed = false;
      // raising the guard costs stamina up front, so mashing it is not free
      this.en = Math.max(0, this.en - 6);
    } else if (wantBlock) this.blockRaisedT += dt;
    else { this.blockRaisedT = 99; this.guardUsed = true; }
    this.blocking = wantBlock;
    // holding the guard up costs stamina, so turtling is not free
    if (this.blocking && this.blockRaisedT > 0.35) this.en = Math.max(0, this.en - 5 * dt);
    if (this.guardBreak > 0) this.guardBreak -= dt;

    if (mx || my) {
      const l = Math.hypot(mx, my) || 1;
      mx /= l; my /= l;
      const guardMult = this.loadout.stat('offhand', 'moveMult', 1);
      let sp = this.speed * (this.blocking ? guardMult : 1) * (this.swingT > 0 ? 0.35 : 1);
      if (this.en <= 0) sp *= 0.6;
      moveWithCollision(this, map, mx * sp * dt, my * sp * dt);
      this.moving = true;
      if (Math.abs(mx) > Math.abs(my)) this.dir = mx > 0 ? DIR.E : DIR.W;
      else this.dir = my > 0 ? DIR.S : DIR.N;
      this.animT += dt * (this.blocking ? 5 : 9);
      this.frame = Math.floor(this.animT) % 4;
      // footprint puffs in snow
      if (Math.random() < dt * 6 && !map.indoor)
        game.particles.spawn({ x: this.x + (Math.random() - 0.5) * 6, y: this.feetY, vx: (Math.random() - .5) * 8, vy: -6,
          life: 0.45, max: 0.45, col: '#c8d1ec', size: 1, drag: 0.92 });
    } else {
      this.moving = false;
      this.animT = 0; this.frame = 0;
    }

    // attack
    if (this.swingT > 0) {
      this.swingT -= dt;
      const total = this.fastWindow > 0 ? 0.22 : 0.32;
      const t = 1 - this.swingT / total;
      this.swingPhase = t < 0.3 ? 0 : t < 0.7 ? 1 : 2;
      if (this.swingT <= 0) this.hitList.clear();
    }
    if (!uiOpen && input.mouse.pressed || (!uiOpen && input.wasPressed(' '))) {
      this.attack(game);
    }
    // right mouse or F looses an arrow, if a bow is equipped
    if (!uiOpen && (input.mouse.rpressed || input.wasPressed('f'))) this.shoot(game);

    // energy regen when not swinging
    if (!this.moving && this.swingT <= 0) this.en = Math.min(this.maxEn, this.en + 3 * dt);
  }

  attack(game) {
    if (this.swingCd > 0 || this.swingT > 0) return;
    const fast = this.fastWindow > 0;
    const sw = this.loadout.stat('weapon', 'swing', 0.32);
    const cd = this.loadout.stat('weapon', 'cd', 0.40);
    this.swingT = fast ? sw * 0.7 : sw;
    this.swingCd = fast ? cd * 0.62 : cd;
    this.swingPhase = 0;
    this.hitList.clear();
    this.en = Math.max(0, this.en - 2);
    game.sfx('swing');
    game.spawnSlash(this);
  }

  /** Damage of the current swing, before enemy-state bonuses. */
  swingDamage(targetStunned) {
    const base = this.loadout.stat('weapon', 'dmg', 8);
    const openHand = this.loadout.stat('offhand', 'dmgMult', 1);
    const bonus = this.fastWindow > 0 ? 1.35 : 1;
    const punish = targetStunned ? 1.75 : 1;
    return Math.max(1, Math.round(base * openHand * bonus * punish));
  }

  shoot(game) {
    const bow = this.loadout.def('ranged');
    if (!bow || this.shootCd > 0 || this.swingT > 0) return;
    const cost = bow.energy || 4;
    if (this.en < cost) { game.notify('Too tired to draw.'); return; }
    this.en -= cost;
    this.shootCd = this.loadout.stat('ranged', 'cd', 0.55);
    const a = { 0: Math.PI / 2, 1: Math.PI, 2: 0, 3: -Math.PI / 2 }[this.dir];
    game.spawnArrow(this, a, bow);
    game.sfx('shoot');
  }

  /** Rect covered by the current sword swing. */
  swingRect() {
    const reach = this.loadout.stat('weapon', 'reach', 20);
    const wide = this.loadout.stat('weapon', 'wide', 24);
    if (this.dir === DIR.E) return { x: this.x + 2, y: this.y - wide / 2, w: reach, h: wide };
    if (this.dir === DIR.W) return { x: this.x - 2 - reach, y: this.y - wide / 2, w: reach, h: wide };
    if (this.dir === DIR.S) return { x: this.x - wide / 2, y: this.y + 2, w: wide, h: reach };
    return { x: this.x - wide / 2, y: this.y - 2 - reach, w: wide, h: reach };
  }

  hurt(dmg, fromX, fromY, game, unblockable = false) {
    if (this.iframe > 0) return false;
    // shield check: are we facing the attacker?
    if (this.blocking && this.loadout.canBlock()) {
      const arc = this.loadout.stat('offhand', 'guardArc', 0.5);
      const ax = fromX - this.x, ay = fromY - this.y;
      const facing = (this.dir === DIR.E && ax > Math.abs(ay) * (1 - arc))
                  || (this.dir === DIR.W && -ax > Math.abs(ay) * (1 - arc))
                  || (this.dir === DIR.S && ay > Math.abs(ax) * (1 - arc))
                  || (this.dir === DIR.N && -ay > Math.abs(ax) * (1 - arc));
      if (facing && !unblockable) {
        // Raising the guard *into* the blow is a parry. The window is measured
        // against the ATTACK as well as the keypress: a slime telegraphs for
        // 0.42s, so a player reacting to the tell would always miss a window
        // measured only from when they pressed.
        const answering = this.guardUsed === false && this.blockRaisedT < 0.9;
        if (this.blockRaisedT < 0.35 || answering) {
          this.guardUsed = true;
          this.iframe = this.loadout.stat('offhand', 'block', 0.25);
          this.fastWindow = this.loadout.stat('offhand', 'fastWindow', 2.0);
          game.onBlock(this, fromX, fromY, true);
          return 'parried';
        }
        const chip = Math.max(1, Math.round(dmg * 0.3));
        this.hp = Math.max(0, this.hp - chip);
        this.iframe = 0.4;
        this.en = Math.max(0, this.en - 8);
        if (this.en <= 0) { this.guardBreak = 1.2; game.onGuardBreak(this); }
        const ga = Math.atan2(this.y - fromY, this.x - fromX);
        this.knock.x = Math.cos(ga) * 70; this.knock.y = Math.sin(ga) * 70;
        game.onBlock(this, fromX, fromY, false);
        return 'guarded';
      }
    }
    this.hp = Math.max(0, this.hp - dmg);
    this.iframe = 0.85;
    this.hurtT = 0.3;
    const a = Math.atan2(this.y - fromY, this.x - fromX);
    this.knock.x = Math.cos(a) * 150; this.knock.y = Math.sin(a) * 150;
    game.onPlayerHurt(dmg);
    return true;
  }

  sprite() {
    if (this.swingT > 0) return this.art.swing[this.dir][Math.min(2, this.swingPhase)];
    if (this.blocking) return this.art.block[this.dir];
    return this.art.walk[this.dir][this.moving ? this.frame : 0];
  }
}

/* ================================================================== *
 * ENEMIES
 * ================================================================== */
const ENEMY_DEF = {
  // `tell` is the wind-up you can read and answer. Without it a shield is just
  // a toggle; with it, blocking becomes a timing decision.
  slime:   { hp: 18, dmg: 5,  speed: 26, sight: 130, atkRange: 14, cd: 1.1, tell: 0.42, mass: 80, xp: 1, w: 20, h: 18, oy: 12, gold: [3, 9],
             drops: [['cocoaPod', 0.5], ['sugar', 0.35]] },
  crow:    { hp: 14, dmg: 6,  speed: 52, sight: 170, atkRange: 16, cd: 1.4, tell: 0.5, mass: 130, xp: 1, w: 20, h: 18, oy: 12, gold: [5, 12],
             drops: [['moonberry', 0.3], ['cocoaPod', 0.3]] },
  bat:     { hp: 12, dmg: 4,  speed: 62, sight: 150, atkRange: 14, cd: 0.9, tell: 0.3, mass: 140, xp: 1, w: 22, h: 14, oy: 10, gold: [4, 10],
             drops: [['gloomcap', 0.35], ['spiritSalt', 0.12]] },
  // the crab's slam is unblockable — you have to step out of it
  potcrab: { hp: 34, dmg: 9,  speed: 22, sight: 120, atkRange: 20, cd: 1.6, tell: 0.62, unblockable: true, mass: 45,
             xp: 2, w: 24, h: 20, oy: 14, gold: [10, 22],
             drops: [['emberspice', 0.4], ['sugar', 0.4]] },
};

export class Enemy {
  constructor(type, x, y) {
    const d = ENEMY_DEF[type];
    this.type = type; this.def = d;
    this.x = x; this.y = y;
    this.hw = 6; this.hh = 5;
    this.maxHp = d.hp; this.hp = d.hp;
    this.state = 'idle';
    this.t = 0; this.animT = Math.random() * 4; this.frame = 0;
    this.cd = Math.random() * d.cd;
    this.stun = 0; this.hurtT = 0;
    this.knock = { x: 0, y: 0 };
    this.dead = false; this.deathT = 0;
    this.home = { x, y };
    this.wanderA = Math.random() * Math.PI * 2;
    this.wanderT = 0;
    this.flash = 0;
    this.windup = 0;
    this.telegraphed = false;
    this.knockCd = 0;
    this.bobPh = Math.random() * 6;
  }

  frames() {
    const f = this.frame;
    if (this.type === 'slime') return Enemy.cache.slime[f];
    if (this.type === 'crow') return Enemy.cache.crow[f];
    if (this.type === 'bat') return Enemy.cache.bat[f];
    return Enemy.cache.potcrab[f];
  }

  update(dt, map, player, game) {
    this.animT += dt * (this.type === 'bat' ? 12 : this.type === 'crow' ? 10 : 6);
    this.frame = Math.floor(this.animT) % 4;
    if (this.flash > 0) this.flash -= dt;
    if (this.hurtT > 0) this.hurtT -= dt;
    if (this.knockCd > 0) this.knockCd -= dt;
    if (this.dead) { this.deathT += dt; return; }

    if (this.stun > 0) {
      this.stun -= dt;
      moveWithCollision(this, map, this.knock.x * dt, this.knock.y * dt);
      this.knock.x *= Math.pow(0.02, dt); this.knock.y *= Math.pow(0.02, dt);
      if (Math.random() < dt * 12)
        game.particles.spawn({ x: this.x + (Math.random() - .5) * 12, y: this.y - 16, vx: 0, vy: -14,
          life: 0.5, max: 0.5, col: '#ffd066', size: 1 });
      return;
    }

    if (Math.abs(this.knock.x) > 2 || Math.abs(this.knock.y) > 2) {
      moveWithCollision(this, map, this.knock.x * dt, this.knock.y * dt);
      this.knock.x *= Math.pow(0.02, dt); this.knock.y *= Math.pow(0.02, dt);
    }

    const d = this.def;
    const dx = player.x - this.x, dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < d.sight) {
      this.state = 'chase';
      if (this.cd > 0) this.cd -= dt;
      if (this.windup > 0) {
        // committed: rooted while the wind-up plays out
        this.windup -= dt;
        if (this.windup <= 0) { game.enemyAttack(this, player); this.cd = d.cd; }
        return;
      }
      if (dist > d.atkRange) {
        const sp = d.speed;
        moveWithCollision(this, map, (dx / dist) * sp * dt, (dy / dist) * sp * dt);
      } else if (this.cd <= 0) {
        this.windup = d.tell || 0.4;
        this.telegraphed = true;
        game.onEnemyTelegraph(this);
      }
    } else {
      this.state = 'idle';
      this.wanderT -= dt;
      if (this.wanderT <= 0) { this.wanderT = 1.2 + Math.random() * 2; this.wanderA = Math.random() * Math.PI * 2; }
      const hx = this.home.x - this.x, hy = this.home.y - this.y;
      if (Math.hypot(hx, hy) > 70) this.wanderA = Math.atan2(hy, hx);
      moveWithCollision(this, map, Math.cos(this.wanderA) * d.speed * 0.35 * dt, Math.sin(this.wanderA) * d.speed * 0.35 * dt);
    }
  }

  hurt(dmg, fromX, fromY, game, stunned) {
    if (this.dead) return;
    this.hp -= dmg;
    this.flash = 0.12;
    this.hurtT = 0.2;
    // Displacement is rate-limited and mass-scaled. Without this, the knock
    // from a normal swing outlasts its own cooldown, so holding attack pushes
    // anything out of reach forever and the whole telegraph/parry layer is
    // bypassed.
    if (this.knockCd <= 0) {
      const a = Math.atan2(this.y - fromY, this.x - fromX);
      const k = (stunned ? 220 : 140) * (60 / (this.def.mass || 90));
      this.knock.x = Math.cos(a) * k; this.knock.y = Math.sin(a) * k;
      this.knockCd = stunned ? 0.5 : 1.0;
    }
    FX.hit(game.particles, this.x, this.y - 8);
    game.floatText.add(this.x, this.y - 20, String(dmg), stunned ? '#ffd066' : '#ffffff');
    if (this.hp <= 0) this.die(game);
  }

  die(game) {
    this.dead = true; this.deathT = 0;
    const col = this.type === 'slime' ? ['#48b477', '#2a8657'] : ['#a394ee', '#7460cc'];
    FX.slimeSplat(game.particles, this.x, this.y - 6, col);
    FX.ghostPoof(game.particles, this.x, this.y - 10);
    game.onEnemyKilled(this);
  }
}
Enemy.cache = null;
export function buildEnemyArt() {
  Enemy.cache = {
    slime: [0, 1, 2, 3].map(f => EN.slimeFrame(0, f)),
    crow: [0, 1, 2, 3].map(f => EN.crowFrame(f)),
    bat: [0, 1, 2, 3].map(f => EN.batFrame(f)),
    potcrab: [0, 1, 2, 3].map(f => EN.potCrabFrame(f)),
    boss: [0, 1, 2, 3].map(f => EN.beeBossFrame(f)),
    stinger: EN.stingerProj(),
    orb: EN.orbProj('wisp'),
    arrow: EN.arrowProj(),
  };
  return Enemy.cache;
}

/* ================================================================== *
 * BOSS — the Hollow Queen
 * ================================================================== */
export class Boss {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.hw = 20; this.hh = 14;
    this.maxHp = 320; this.hp = 320;
    this.frame = 0; this.animT = 0;
    this.state = 'idle'; this.t = 0;
    this.phase = 1;
    this.cd = 2;
    this.stun = 0; this.flash = 0;
    this.dead = false; this.deathT = 0;
    this.knock = { x: 0, y: 0 };
    this.dashT = 0; this.dashA = 0;
    this.windup = 0; this.pending = null;
    this.active = false;
  }
  update(dt, map, player, game) {
    this.animT += dt * 14;
    this.frame = Math.floor(this.animT) % 4;
    if (this.flash > 0) this.flash -= dt;
    if (this.dead) { this.deathT += dt; return; }
    if (!this.active) return;

    if (this.stun > 0) {
      this.stun -= dt;
      if (Math.random() < dt * 16)
        game.particles.spawn({ x: this.x + (Math.random() - .5) * 30, y: this.y - 34, vx: 0, vy: -18,
          life: 0.6, max: 0.6, col: '#ffd066', size: 2 });
      return;
    }

    this.phase = this.hp < this.maxHp * 0.4 ? 3 : this.hp < this.maxHp * 0.72 ? 2 : 1;
    this.cd -= dt;
    const dx = player.x - this.x, dy = player.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;

    if (this.dashT > 0) {
      this.dashT -= dt;
      const sp = 210;
      moveWithCollision(this, map, Math.cos(this.dashA) * sp * dt, Math.sin(this.dashA) * sp * dt);
      if (dist < 30) game.bossTouch(this, player);
      return;
    }

    // drift toward the player
    const sp = 30 + this.phase * 8;
    moveWithCollision(this, map, (dx / dist) * sp * dt, (dy / dist) * sp * dt);

    // wind-up: rooted and flashing, so the charge can be read and stepped out of
    if (this.windup > 0) {
      this.windup -= dt;
      if (this.windup <= 0) {
        if (this.pending === 'dash') { this.dashA = Math.atan2(dy, dx); this.dashT = 0.65; game.sfx('dash'); }
        else if (this.pending === 'volley') game.bossVolley(this, player, this.phase * 3 + 3);
        else game.bossSummon(this);
        this.pending = null;
      }
      return;
    }
    if (this.cd <= 0) {
      const roll = Math.random();
      if (roll < 0.4 || this.phase === 1) {
        this.pending = 'volley'; this.windup = 0.55;
        this.cd = 2.6 - this.phase * 0.4 + this.windup;
      } else if (roll < 0.75) {
        this.pending = 'dash'; this.windup = 0.75;
        this.cd = 2.8 - this.phase * 0.3 + this.windup;
      } else {
        this.pending = 'summon'; this.windup = 0.5;
        this.cd = 4.5 + this.windup;
      }
      game.onEnemyTelegraph(this, this.pending === 'dash');
    }
    if (Math.abs(this.knock.x) > 2 || Math.abs(this.knock.y) > 2) {
      moveWithCollision(this, map, this.knock.x * dt, this.knock.y * dt);
      this.knock.x *= Math.pow(0.05, dt); this.knock.y *= Math.pow(0.05, dt);
    }
  }
  hurt(dmg, fromX, fromY, game, stunned) {
    if (this.dead || !this.active) return;
    this.hp -= dmg;
    this.flash = 0.1;
    const a = Math.atan2(this.y - fromY, this.x - fromX);
    this.knock.x = Math.cos(a) * (stunned ? 90 : 40);
    this.knock.y = Math.sin(a) * (stunned ? 90 : 40);
    FX.hit(game.particles, this.x, this.y - 20);
    game.floatText.add(this.x, this.y - 40, String(dmg), stunned ? '#ffd066' : '#ffffff');
    if (this.hp <= 0) { this.dead = true; game.onBossKilled(this); }
  }
}

/* ================================================================== *
 * TOWNSFOLK
 * ================================================================== */
export class NPC {
  constructor(def) {
    this.def = def;
    this.art = buildChar(def.spec);
    this.x = def.home[0] * TS; this.y = def.home[1] * TS;
    this.hw = 5; this.hh = 5;
    this.dir = DIR.S; this.frame = 0; this.animT = 0; this.moving = false;
    this.wanderT = Math.random() * 3;
    this.tx = this.x; this.ty = this.y;
    this.lineIdx = 0;
    this.hearts = 0;
    this.friendship = 0;
    this.giftedDay = -1;
  }
  update(dt, map, player) {
    this.wanderT -= dt;
    if (this.wanderT <= 0) {
      this.wanderT = 2 + Math.random() * 4;
      this.tx = this.def.home[0] * TS + (Math.random() - 0.5) * 90;
      this.ty = this.def.home[1] * TS + (Math.random() - 0.5) * 70;
    }
    const dx = this.tx - this.x, dy = this.ty - this.y;
    const d = Math.hypot(dx, dy);
    // face the player when close
    const pd = Math.hypot(player.x - this.x, player.y - this.y);
    if (pd < 36) {
      this.moving = false;
      const ax = player.x - this.x, ay = player.y - this.y;
      if (Math.abs(ax) > Math.abs(ay)) this.dir = ax > 0 ? DIR.E : DIR.W;
      else this.dir = ay > 0 ? DIR.S : DIR.N;
      return;
    }
    if (d > 4) {
      const sp = 32;
      moveWithCollision(this, map, (dx / d) * sp * dt, (dy / d) * sp * dt);
      this.moving = true;
      if (Math.abs(dx) > Math.abs(dy)) this.dir = dx > 0 ? DIR.E : DIR.W;
      else this.dir = dy > 0 ? DIR.S : DIR.N;
      this.animT += dt * 8;
      this.frame = Math.floor(this.animT) % 4;
    } else { this.moving = false; this.frame = 0; }
  }
  sprite() { return this.art.walk[this.dir][this.moving ? this.frame : 0]; }
}

/* ================================================================== *
 * SHOP GHOSTS + CUSTOMERS
 * ================================================================== */
export class Ghost {
  constructor(variant, x, y, name) {
    this.art = buildGhost(variant);
    this.x = x; this.y = y; this.name = name;
    this.frame = 0; this.animT = Math.random() * 4;
    this.carrying = false;
    this.tx = x; this.ty = y;
    this.taskT = Math.random() * 3;
    this.job = 'idle';
    this.bob = Math.random() * 6;
  }
  update(dt, map, game) {
    this.animT += dt * 5;
    this.frame = Math.floor(this.animT) % 4;
    const dx = this.tx - this.x, dy = this.ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d > 3) {
      const sp = 42;
      this.x += (dx / d) * sp * dt;
      this.y += (dy / d) * sp * dt;
    } else {
      this.taskT -= dt;
      if (this.taskT <= 0) {
        this.taskT = 2 + Math.random() * 3;
        // restock a counter that is running low
        const low = game.shopCounters().filter(c => c.item && c.qty < c.max);
        if (low.length && Math.random() < 0.75) {
          const c = low[(Math.random() * low.length) | 0];
          this.tx = c.x + 16; this.ty = c.y + 22;
          this.carrying = true;
          this.target = c;
        } else {
          const r = (map && map.roam) || { x: 4, y: 5, w: 17, h: 4 };
          this.tx = (r.x + Math.random() * r.w) * TS;
          this.ty = (r.y + Math.random() * r.h) * TS;
          if (this.carrying && this.target) {
            game.restock(this.target);
            this.target = null;
          }
          this.carrying = false;
        }
      }
    }
    if (this.carrying && this.target && Math.hypot(this.target.x + 16 - this.x, this.target.y + 22 - this.y) < 6) {
      game.restock(this.target);
      this.target = null; this.carrying = false;
      this.taskT = 0.4;
    }
  }
  sprite() { return this.carrying ? this.art.carry[this.frame] : this.art.idle[this.frame]; }
}

export class Customer {
  constructor(spec, x, y) {
    this.art = buildChar(spec);
    this.x = x; this.y = y;
    this.hw = 5; this.hh = 5;
    this.dir = DIR.N; this.frame = 0; this.animT = 0; this.moving = false;
    this.state = 'enter';
    this.t = 0;
    this.target = null;
    this.patience = 22 + Math.random() * 14;
    this.bought = false;
    this.thought = 0;
    this.stuck = 0;
    this.wallet = 60 + Math.random() * 340;
  }
  update(dt, map, game) {
    this.t += dt;
    this.patience -= dt;
    if (this.thought > 0) this.thought -= dt;

    // `arrive` has to exceed the collision standoff of whatever we're walking
    // up to — a counter stops you ~5px out, so a 3px radius is never reached.
    const goto = (tx, ty, sp = 42, arrive = 4) => {
      const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy);
      if (d < arrive) { this.moving = false; this.frame = 0; return true; }
      const px = this.x, py = this.y;
      moveWithCollision(this, map, (dx / d) * sp * dt, (dy / d) * sp * dt);
      this.moving = true;
      if (Math.abs(dx) > Math.abs(dy)) this.dir = dx > 0 ? DIR.E : DIR.W;
      else this.dir = dy > 0 ? DIR.S : DIR.N;
      this.animT += dt * 8;
      this.frame = Math.floor(this.animT) % 4;
      // wedged against furniture: count it as close enough rather than freeze
      if (Math.hypot(this.x - px, this.y - py) < sp * dt * 0.25) {
        this.stuck += dt;
        if (this.stuck > 1.2) { this.stuck = 0; return true; }
      } else this.stuck = 0;
      return false;
    };

    const door = map.door || { x: 16 * TS, y: 21 * TS };
    const browseY = map.browseY != null ? map.browseY : 17 * TS;

    if (this.state === 'enter') {
      if (goto(this.x, browseY, 42, 6)) { this.state = 'browse'; this.pickTarget(game); }
    } else if (this.state === 'browse') {
      if (!this.target) { this.pickTarget(game); if (!this.target) { this.state = 'leave'; return; } }
      const c = this.target;
      if (goto(c.x + 16, c.y + 30, 42, 11)) {
        this.dir = DIR.N;
        this.state = 'buy'; this.t = 0; this.thought = 1.4;
      }
    } else if (this.state === 'buy') {
      this.moving = false;
      if (this.t > 1.0) {
        game.customerBuy(this, this.target);
        this.bought = true;
        this.target = null;
        this.state = Math.random() < 0.45 ? 'browse' : 'leave';
        this.t = 0;
      }
    } else if (this.state === 'leave') {
      if (goto(door.x, door.y, 46, 8)) this.done = true;
    }
    if (this.patience <= 0 && this.state !== 'leave') this.state = 'leave';
  }
  pickTarget(game) {
    const stocked = game.shopCounters().filter(c => c.item && c.qty > 0 && c.price <= this.wallet);
    if (!stocked.length) { this.target = null; return; }
    // prefer the best value-for-star option
    const score = (c) => (c.item.star || 0) * 2
      + ((this.taste && this.taste.includes(c.item.id)) ? 6 : 0)
      + Math.random();
    stocked.sort((a, b) => score(b) - score(a));
    this.target = stocked[Math.min(stocked.length - 1, (Math.random() * 2) | 0)];
  }
  sprite() { return this.art.walk[this.dir][this.moving ? this.frame : 0]; }
}
