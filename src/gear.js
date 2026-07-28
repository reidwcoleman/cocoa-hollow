// Equipment: main-hand weapons, off-hand items that define a build, and bows.
// The off-hand is the interesting slot — a shield turns blocking into a stun
// engine, while the non-shield off-hands trade that away for something else.

export const RARITY = {
  common:    { name: 'Common',    col: '#c9c7ff', mult: 1.00 },
  fine:      { name: 'Fine',      col: '#52a5f3', mult: 1.18 },
  rare:      { name: 'Rare',      col: '#a394ee', mult: 1.40 },
  spectral:  { name: 'Spectral',  col: '#faea61', mult: 1.70 },
};
export const RARITY_ORDER = ['common', 'fine', 'rare', 'spectral'];

/* ------------------------------------------------------------------ *
 * Main hand
 * ------------------------------------------------------------------ */
export const WEAPONS = {
  rustedBlade: {
    name: 'Rusted Blade', icon: 'sword', tier: 0,
    dmg: 8, swing: 0.32, cd: 0.40, reach: 20, wide: 24, knock: 140,
    desc: 'It came with the castle. It has seen things.',
  },
  cocoaSteel: {
    name: 'Cocoa Steel', icon: 'sword', tier: 1,
    dmg: 12, swing: 0.30, cd: 0.36, reach: 21, wide: 25, knock: 160,
    desc: 'Folded with cocoa ash. Holds an edge, smells faintly of dessert.',
  },
  moonsteelSaber: {
    name: 'Moonsteel Saber', icon: 'sword', tier: 2,
    dmg: 15, swing: 0.24, cd: 0.28, reach: 22, wide: 24, knock: 150,
    desc: 'Light and quick. Sings a little on the backswing.',
  },
  hollowCleaver: {
    name: 'Hollow Cleaver', icon: 'sword', tier: 3,
    dmg: 24, swing: 0.42, cd: 0.56, reach: 25, wide: 30, knock: 240,
    desc: 'Slow, enormous, and deeply unsubtle.',
  },
};

/* ------------------------------------------------------------------ *
 * Off hand — this slot is the build
 * ------------------------------------------------------------------ */
export const OFFHANDS = {
  none: {
    name: 'Empty Hand', icon: 'shield', kind: 'none', tier: 0,
    desc: 'Nothing to hide behind. Move fast, hit first.',
    moveMult: 1.12, dmgMult: 1.12,
  },
  oakBuckler: {
    name: 'Oak Buckler', icon: 'shield', kind: 'shield', tier: 0,
    block: 0.24, stun: 1.8, fastWindow: 2.0, moveMult: 0.62, guardArc: 0.5,
    desc: 'Blocks a hit and staggers whatever threw it.',
  },
  ironKite: {
    name: 'Iron Kite', icon: 'shield', kind: 'shield', tier: 1,
    block: 0.30, stun: 2.4, fastWindow: 2.4, moveMult: 0.55, guardArc: 0.62,
    desc: 'Wider guard, longer stagger. Heavier on the arm.',
  },
  towerOfHollow: {
    name: 'Tower of Hollow', icon: 'shield', kind: 'shield', tier: 3,
    block: 0.40, stun: 3.2, fastWindow: 3.0, moveMult: 0.40, guardArc: 0.78,
    desc: 'You will not be moved. You will not be quick, either.',
  },
  wardingBell: {
    name: 'Warding Bell', icon: 'lantern', kind: 'shield', tier: 2,
    block: 0.26, stun: 2.0, fastWindow: 2.0, moveMult: 0.7, guardArc: 0.45,
    aoeStun: 78,
    desc: 'A blocked blow rings it, and the whole grove flinches.',
  },
  gloomLantern: {
    name: 'Gloom Lantern', icon: 'lantern', kind: 'utility', tier: 1,
    moveMult: 1.0, lightBonus: 62, forageBonus: 1,
    desc: 'No guard at all — but the dark opens up, and so does the forage.',
  },
  spiritWard: {
    name: 'Spirit Ward', icon: 'shield', kind: 'reflect', tier: 2,
    block: 0.22, stun: 0.8, fastWindow: 1.2, moveMult: 0.72, guardArc: 0.55,
    reflect: true,
    desc: 'Turns whatever is thrown at you back the way it came.',
  },
};

/* ------------------------------------------------------------------ *
 * Ranged
 * ------------------------------------------------------------------ */
export const BOWS = {
  huntingBow: {
    name: 'Hunting Bow', icon: 'bow', tier: 0,
    dmg: 7, cd: 0.55, speed: 190, energy: 4,
    desc: 'Keeps the crows honest.',
  },
  moonBow: {
    name: 'Moon Longbow', icon: 'bow', tier: 2,
    dmg: 12, cd: 0.48, speed: 240, energy: 5, pierce: 1,
    desc: 'The arrow keeps going after the first thing it meets.',
  },
};

export const ALL = { weapon: WEAPONS, offhand: OFFHANDS, ranged: BOWS };

export function itemDef(slot, id) { return (ALL[slot] || {})[id] || null; }

/* Keys where a *smaller* number is better. Multiplying these by the rarity
 * bonus alongside damage cancels the bonus exactly — a spectral weapon hits
 * 1.7x harder on a 1.7x longer cooldown, which is identical DPS to a common
 * one. They have to be divided instead. */
const INVERSE = new Set(['cd', 'swing', 'energy', 'moveMult']);
/* Keys that are ratios or flags and must not scale at all. */
const UNSCALED = new Set(['tier', 'guardArc', 'dmgMult', 'pierce']);

/** Scale a stat by rarity. */
export function scaled(def, rarity, key) {
  const v = def[key];
  if (typeof v !== 'number') return v;
  if (UNSCALED.has(key)) return v;
  const mult = (RARITY[rarity] || RARITY.common).mult;
  if (key === 'moveMult') return Math.min(1.15, v * Math.sqrt(mult));
  if (INVERSE.has(key)) return v / mult;
  return v * mult;
}

/* ------------------------------------------------------------------ *
 * Loot
 * ------------------------------------------------------------------ */
const DROP_TABLE = {
  slime:   [['weapon', 'rustedBlade', 0.02], ['offhand', 'oakBuckler', 0.03]],
  crow:    [['ranged', 'huntingBow', 0.05], ['offhand', 'gloomLantern', 0.02]],
  bat:     [['offhand', 'spiritWard', 0.025], ['weapon', 'moonsteelSaber', 0.015]],
  potcrab: [['offhand', 'ironKite', 0.06], ['weapon', 'cocoaSteel', 0.05]],
  boss:    [['weapon', 'hollowCleaver', 1.0], ['offhand', 'towerOfHollow', 1.0],
            ['ranged', 'moonBow', 1.0], ['offhand', 'wardingBell', 1.0]],
};

/**
 * Roll gear for a slain enemy. `luck` nudges rarity upward.
 * Returns null, or {slot, id, rarity}.
 */
export function rollDrop(type, rand, luck = 0) {
  const table = DROP_TABLE[type];
  if (!table) return null;
  for (const [slot, id, chance] of table) {
    if (rand() < chance) {
      let rarity = 'common';
      const r = rand() + luck * 0.08;
      if (r > 0.965) rarity = 'spectral';
      else if (r > 0.88) rarity = 'rare';
      else if (r > 0.66) rarity = 'fine';
      return { slot, id, rarity };
    }
  }
  return null;
}

/** Every boss drop at once — the fight should feel like it paid out. */
export function bossDrops(rand) {
  return DROP_TABLE.boss.map(([slot, id]) => ({
    slot, id, rarity: rand() > 0.5 ? 'spectral' : 'rare',
  }));
}

/* ------------------------------------------------------------------ *
 * Loadout
 * ------------------------------------------------------------------ */
export class Loadout {
  constructor() {
    this.weapon = { id: 'rustedBlade', rarity: 'common' };
    this.offhand = { id: 'oakBuckler', rarity: 'common' };
    this.ranged = null;
    this.owned = [
      { slot: 'weapon', id: 'rustedBlade', rarity: 'common' },
      { slot: 'offhand', id: 'oakBuckler', rarity: 'common' },
      { slot: 'offhand', id: 'none', rarity: 'common' },
    ];
  }

  def(slot) {
    const eq = this[slot];
    if (!eq) return slot === 'offhand' ? OFFHANDS.none : null;
    return itemDef(slot, eq.id);
  }
  rarity(slot) { return (this[slot] && this[slot].rarity) || 'common'; }

  stat(slot, key, fallback = 0) {
    const d = this.def(slot);
    if (!d || d[key] == null) return fallback;
    return scaled(d, this.rarity(slot), key);
  }

  /** true when the off-hand can actually parry. */
  canBlock() {
    const d = this.def('offhand');
    return !!d && (d.kind === 'shield' || d.kind === 'reflect');
  }

  has(slot, id) { return this.owned.some(o => o.slot === slot && o.id === id); }

  /** Add a drop; upgrades rarity in place if it is a better copy. */
  acquire(drop) {
    const existing = this.owned.find(o => o.slot === drop.slot && o.id === drop.id);
    if (existing) {
      if (RARITY_ORDER.indexOf(drop.rarity) > RARITY_ORDER.indexOf(existing.rarity)) {
        existing.rarity = drop.rarity;
        return 'upgraded';
      }
      return 'duplicate';
    }
    this.owned.push({ slot: drop.slot, id: drop.id, rarity: drop.rarity });
    return 'new';
  }

  equip(slot, id, rarity) {
    if (slot === 'ranged' && this.ranged && this.ranged.id === id) { this.ranged = null; return; }
    this[slot] = { id, rarity: rarity || 'common' };
  }

  forSlot(slot) { return this.owned.filter(o => o.slot === slot); }
}

// expose for the self test
if (typeof window !== 'undefined') window.__gear = { WEAPONS, OFFHANDS, BOWS, scaled, RARITY };
