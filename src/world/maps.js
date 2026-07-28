// World maps: the snowbound town, the castle shop floor, the kitchen,
// and the Hollow Grove where you fight for ingredients.

import { TS, TILES, tileAt } from '../art/tiles.js';
import * as PR from '../art/props.js';
import { hash2, fnoise } from '../art/pixel.js';
import { RAMP } from '../art/palette.js';

const R = RAMP;

export class GameMap {
  constructor(id, w, h, opts = {}) {
    this.id = id;
    this.w = w; this.h = h;
    this.ground = new Array(w * h).fill(opts.base || 'snow');
    this.over = new Array(w * h).fill(null);
    this.solid = new Uint8Array(w * h);
    this.props = [];          // {x,y,img,sy}
    this.decals = [];         // floor decals drawn under everything
    this.lights = [];         // {x,y,r,col,warm,fl}
    this.smokes = [];
    this.warps = [];
    this.interact = [];
    this.forage = [];
    this.spawns = [];
    this.indoor = !!opts.indoor;
    this.ambient = opts.ambient || null;
    this.name = opts.name || id;
    this.bounds = { x0: 0, y0: 0, x1: w * TS, y1: h * TS };
  }
  idx(x, y) { return y * this.w + x; }
  inb(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  set(x, y, t) { if (this.inb(x, y)) this.ground[this.idx(x, y)] = t; }
  setOver(x, y, t) { if (this.inb(x, y)) this.over[this.idx(x, y)] = t; }
  block(x, y, v = 1) { if (this.inb(x, y)) this.solid[this.idx(x, y)] = v; }
  isSolid(x, y) { return !this.inb(x, y) ? 1 : this.solid[this.idx(x, y)]; }
  fill(x0, y0, w, h, t) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, t); }
  blockRect(x0, y0, w, h) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.block(x, y); }
  addProp(x, y, img, sy, shadow) {
    this.props.push({ x: x | 0, y: y | 0, img,
      sy: sy != null ? sy : (y + img.height), shadow: shadow || null });
    return this.props[this.props.length - 1];
  }
  addLight(x, y, r, col = '#ffd066', warm = 0.55, fl = 0, intensity = 0.72) {
    this.lights.push({ x, y, r, col, warm, fl, intensity });
  }
}

/* ================================================================== *
 * ART CACHE — build every sprite once.
 * ================================================================== */
export const ART = {};

export function buildArt() {
  ART.lamp = PR.lampPost();
  ART.fountain = PR.fountain();
  ART.pine = [PR.pineTree(1.0, true, 1), PR.pineTree(1.25, true, 2), PR.pineTree(0.8, true, 3), PR.pineTree(1.1, true, 4)];
  ART.pineBare = [PR.pineTree(1.0, false, 5), PR.pineTree(1.2, false, 6)];
  ART.bare = [PR.bareTree(1), PR.bareTree(2)];
  ART.bush = [PR.bush(true, 1), PR.bush(true, 2), PR.bush(false, 3)];
  ART.rock = [PR.rock(1, 1), PR.rock(1.4, 2), PR.rock(0.8, 3)];
  ART.barrel = PR.barrel();
  ART.crate = PR.crate();
  ART.fence = PR.fencePost();
  ART.grave = [PR.gravestone(1), PR.gravestone(2)];
  ART.counter = [PR.counter(0), PR.counter(1), PR.counter(2), PR.counter(3)];
  ART.shelf = [PR.shelf(0), PR.shelf(1), PR.shelf(2)];
  ART.cauldron = [0, 1, 2, 3].map(f => PR.cauldron(f));
  ART.table = PR.table();
  ART.chair = PR.chair();
  ART.candelabra = [0, 1, 2, 3].map(f => PR.candelabra(f));
  ART.fireplace = [0, 1, 2, 3].map(f => PR.fireplace(f));
  ART.chandelier = [0, 1, 2, 3].map(f => PR.chandelier(f));
  ART.forage = {};
  for (const k of ['cocoaPod','sugar','milk','cream','moonberry','gloomcap','frostmint','emberspice','spiritSalt','honey'])
    ART.forage[k] = PR.foragePlant(k);
  ART.castle = PR.castleShop();
  ART.houses = [
    PR.townhouse({ w: 66, h: 44, wall: 'cream', roof: 'brick', trim: 'wood', seed: 3, chimneys: [46] }),
    PR.townhouse({ w: 56, h: 52, wall: 'stone', roof: 'plum', trim: 'oak', seed: 7, chimneys: [12, 40], winW: 10, winH: 14 }),
    PR.townhouse({ w: 74, h: 40, wall: 'cream', roof: 'wood', trim: 'wood', seed: 11, chimneys: [56],
                   windows: [[14, 52], [36, 52], [58, 52]] }),
    PR.townhouse({ w: 48, h: 56, wall: 'stone', roof: 'brick', trim: 'oak', seed: 13, chimneys: [30], winW: 10, winH: 16 }),
    PR.townhouse({ w: 62, h: 46, wall: 'cream', roof: 'plum', trim: 'wood', seed: 17, chimneys: [10, 48] }),
  ];
  return ART;
}

/* ================================================================== *
 * TOWN
 * ================================================================== */
export function buildTown() {
  const W = 84, H = 62;
  const m = new GameMap('town', W, H, { base: 'snow', name: 'Hollow Square' });

  // deep snow everywhere, cobbled plaza in the middle
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const n = fnoise(x / 9, y / 9, 3);
      m.set(x, y, n > 0.63 ? 'snow' : 'snow');
    }

  // plaza — a compact square, deliberately small so snow and props frame it
  const pcx = 41, pcy = 35, prx = 11, pry = 7;
  for (let y = pcy - pry - 1; y <= pcy + pry + 1; y++)
    for (let x = pcx - prx - 1; x <= pcx + prx + 1; x++) {
      const dx = (x - pcx) / prx, dy = (y - pcy) / pry;
      const d = Math.sqrt(dx * dx + dy * dy);
      const edge = 0.98 + fnoise(x / 3.5, y / 3.5, 9) * 0.28;
      if (d < edge) m.set(x, y, 'path');              // packed snow underfoot
      else if (d < edge + 0.26) m.set(x, y, 'snow');
    }
  // cobbled apron ringing the fountain
  for (let y = pcy - 5; y <= pcy + 5; y++)
    for (let x = pcx - 8; x <= pcx + 8; x++) {
      const dx = (x - pcx) / 8, dy = (y - pcy + 0.5) / 5;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 0.94 + fnoise(x / 3, y / 3, 33) * 0.22) m.set(x, y, 'cobble');
    }

  // feather the paving edge with two rings of increasingly snowy cobble
  const cobbleFeather = () => {
    const snap = m.ground.slice();
    const at = (x, y) => (m.inb(x, y) ? snap[m.idx(x, y)] : 'snow');
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (at(x, y) !== 'cobble') continue;
        const n4 = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)];
        const n8 = n4.concat([at(x - 1, y - 1), at(x + 1, y - 1), at(x - 1, y + 1), at(x + 1, y + 1)]);
        if (n4.some(t => t !== 'cobble' && t !== 'cobbleBare')) m.set(x, y, 'cobbleEdge');
        else if (n8.some(t => t !== 'cobble' && t !== 'cobbleBare')) m.set(x, y, 'cobbleEdge2');
      }
  };

  // roads: north to the castle, east to the grove, south + west out of town
  for (let y = 12; y < pcy; y++) for (let x = 39; x < 44; x++) m.set(x, y, 'cobble');
  for (let x = pcx + prx; x < W; x++) for (let y = 32; y < 37; y++) m.set(x, y, 'path');
  for (let x = 4; x < pcx - prx + 1; x++) for (let y = 33; y < 37; y++) m.set(x, y, 'path');
  for (let y = pcy + pry; y < H - 6; y++) for (let x = 38; x < 43; x++) m.set(x, y, 'path');

  cobbleFeather();

  /* ---- the castle shop (north) ---- */
  const cs = ART.castle;
  const csx = 41 * TS - (cs.canvas.width >> 1), csy = 2 * TS;
  m.addProp(csx, csy, cs.canvas, csy + cs.groundY);
  for (const [lx, ly, lr] of cs.lights) m.addLight(csx + lx, csy + ly, lr, '#ffcf70', 0.55, 1, 0.68);
  for (const [sx, sy] of cs.smokes) m.smokes.push([csx + sx, csy + sy]);
  // collision: whole footprint except the doorway
  const cbx = Math.floor(csx / TS), cby = Math.floor((csy + 30) / TS);
  const cbw = Math.ceil(cs.canvas.width / TS), cbh = Math.ceil((cs.groundY - 30) / TS);
  m.blockRect(cbx, cby, cbw, cbh);
  const doorTX = 41, doorTY = Math.floor((csy + cs.groundY) / TS);
  m.block(doorTX - 1, doorTY - 1, 0); m.block(doorTX, doorTY - 1, 0); m.block(doorTX + 1, doorTY - 1, 0);
  m.warps.push({ x: (doorTX - 1) * TS, y: (doorTY - 1) * TS, w: TS * 3, h: TS,
                 to: 'shop', tx: 15 * TS, ty: 15 * TS, label: 'Enter the Shop' });
  // shop-front snow shoveled
  for (let y = doorTY - 1; y < doorTY + 3; y++) for (let x = doorTX - 4; x <= doorTX + 4; x++) m.set(x, y, 'cobbleBare');

  /* ---- townhouses — pulled in tight around the square ---- */
  const houseSpots = [
    [18, 20, 0], [56, 18, 1], [12, 36, 2], [62, 34, 3], [24, 46, 4],
    [50, 47, 0], [10, 24, 3], [68, 24, 4], [30, 14, 1], [64, 44, 2],
  ];
  for (const [tx, ty, hi] of houseSpots) {
    const hs = ART.houses[hi % ART.houses.length];
    const hx = tx * TS, hy = ty * TS;
    m.addProp(hx, hy, hs.canvas, hy + hs.groundY);
    for (const [lx, ly, lr, lit] of hs.lights) if (lit) m.addLight(hx + lx, hy + ly, lr, '#ffc95e', 0.5, 1, 0.6);
    for (const [sx, sy] of hs.smokes) m.smokes.push([hx + sx, hy + sy]);
    const bw = Math.ceil(hs.canvas.width / TS), bh = Math.max(1, Math.ceil((hs.groundY - hs.canvas.height * 0.42) / TS));
    m.blockRect(tx, ty + Math.floor((hs.groundY / TS) - bh), bw, bh);
    // trodden snow at the door
    const dtx = tx + Math.floor(bw / 2), dty = ty + Math.floor(hs.groundY / TS);
    for (let y = dty; y < dty + 2; y++) for (let x = dtx - 2; x <= dtx + 2; x++) m.set(x, y, 'path');
  }

  /* ---- fountain ---- */
  const fo = ART.fountain;
  const fx = 41 * TS - 23, fy = 33 * TS - 30;
  m.addProp(fx, fy, fo.canvas, fy + 38, [20]);
  m.addLight(fx + fo.light[0], fy + fo.light[1], fo.light[2], '#b8c2ec', 0.4, 0, 0.45);
  m.blockRect(38, 32, 6, 3);

  /* ---- market stalls, benches, woodpiles ---- */
  const stalls = [[31, 29, 'ruby'], [47, 29, 'teal'], [31, 40, 'gold'], [47, 40, 'plum']];
  for (const [sx, sy, hue] of stalls) {
    const img = PR.marketStall(sx, hue);
    const X = sx * TS - 6, Y = sy * TS - 30;
    m.addProp(X, Y, img, sy * TS + 14, [17]);
    m.blockRect(sx, sy, 3, 1);
    m.addLight(sx * TS + 22, sy * TS - 2, 40, '#ffc06a', 0.45, 1, 0.6);
  }
  const benches = [[36, 30], [44, 30], [36, 41], [44, 41]];
  for (const [bx, by] of benches) {
    m.addProp(bx * TS, by * TS - 6, PR.bench(), by * TS + 14, [13]);
    m.blockRect(bx, by, 2, 1);
  }
  for (const [wx, wy] of [[28, 33], [54, 37]]) {
    m.addProp(wx * TS, wy * TS - 4, PR.woodpile(), wy * TS + 14, [10]);
    m.blockRect(wx, wy, 2, 1);
  }
  // drifted snow softening the paving edges
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const dx2 = pcx + Math.cos(a) * (prx - 0.4), dy2 = pcy + Math.sin(a) * (pry - 0.4);
    const img = PR.snowDrift(0.55 + hash2(i, 5, 3) * 0.5, i);
    m.addProp(Math.round(dx2 * TS - img.width / 2), Math.round(dy2 * TS - img.height + 8),
              img, Math.round(dy2 * TS + 6));
  }

  /* ---- lamp posts ---- */
  const lamps = [[31, 26], [51, 26], [31, 44], [51, 44], [41, 24], [41, 46],
                 [26, 35], [56, 35], [12, 34], [72, 34], [41, 14], [41, 56]];
  for (const [lx, ly] of lamps) {
    const X = lx * TS + 1, Y = ly * TS - 32;
    m.addProp(X, Y, ART.lamp.canvas, Y + 46, [5]);
    m.addLight(X + ART.lamp.light[0], Y + ART.lamp.light[1], ART.lamp.light[2], '#ffc75e', 0.42, 1, 0.62);
    m.block(lx, ly, 1);
  }

  /* ---- trees, bushes, fences ---- */
  for (let i = 0; i < 170; i++) {
    const tx = ((hash2(i, 1, 3) * W) | 0), ty = ((hash2(i, 2, 4) * H) | 0);
    if (tx < 2 || ty < 2 || tx > W - 3 || ty > H - 3) continue;
    if (m.ground[m.idx(tx, ty)] !== 'snow') continue;
    if (m.isSolid(tx, ty)) continue;
    // keep the square itself clear, but let trees crowd right up to its rim
    const dxp = (tx - 41) / 13, dyp = (ty - 35) / 9;
    if (dxp * dxp + dyp * dyp < 1) continue;
    const roll = hash2(i, 3, 5);
    if (roll < 0.55) {
      const img = ART.pine[(hash2(i, 4, 6) * ART.pine.length) | 0];
      m.addProp(tx * TS - ((img.width - TS) >> 1), ty * TS - img.height + TS, img, ty * TS + TS, [Math.round(img.width * 0.28)]);
      m.block(tx, ty);
    } else if (roll < 0.72) {
      const img = ART.bare[(hash2(i, 5, 7) * 2) | 0];
      m.addProp(tx * TS - ((img.width - TS) >> 1), ty * TS - img.height + TS, img, ty * TS + TS, [Math.round(img.width * 0.22)]);
      m.block(tx, ty);
    } else if (roll < 0.9) {
      const img = ART.bush[(hash2(i, 6, 8) * 3) | 0];
      m.addProp(tx * TS - 2, ty * TS - img.height + TS, img, ty * TS + TS, [Math.round(img.width * 0.3)]);
    } else {
      const img = ART.rock[(hash2(i, 7, 9) * 3) | 0];
      m.addProp(tx * TS - 1, ty * TS - img.height + TS, img, ty * TS + TS, [Math.round(img.width * 0.4)]);
      m.block(tx, ty);
    }
  }

  // plaza dressing: crates + barrels near a stall
  m.addProp(28 * TS, 28 * TS - 4, ART.barrel, 28 * TS + 16, [7]); m.block(28, 28);
  m.addProp(29 * TS + 4, 29 * TS, ART.crate, 29 * TS + 16, [7]); m.block(29, 29);
  m.addProp(53 * TS, 41 * TS - 4, ART.barrel, 41 * TS + 16, [7]); m.block(53, 41);

  /* ---- warp east to the grove ---- */
  m.warps.push({ x: (W - 1) * TS, y: 32 * TS, w: TS, h: TS * 5, to: 'grove', tx: 3 * TS, ty: 24 * TS, label: 'Hollow Grove' });
  for (let y = 32; y < 37; y++) m.block(W - 1, y, 0);

  // edge walls
  for (let x = 0; x < W; x++) { m.block(x, 0); m.block(x, 1); m.block(x, H - 1); }
  for (let y = 0; y < H; y++) { m.block(0, y); m.block(1, y); if (!(y >= 32 && y < 37)) { m.block(W - 1, y); m.block(W - 2, y); } }

  m.props.sort((a, b) => a.sy - b.sy);
  return m;
}

/* ================================================================== *
 * SHOP INTERIOR
 * ================================================================== */
export function buildShop() {
  const W = 32, H = 22;
  const m = new GameMap('shop', W, H, { base: 'woodFloor', indoor: true, name: 'The Cocoa Hollow' });
  m.ambient = { key: 'night', amount: 0.40, tint: '#5a3a66', bloom: 0.7, vignetteAmt: 0.38 };

  m.fill(0, 0, W, H, 'woodFloor');

  /* ---- walls: five courses of castle stone with a wainscot base ---- */
  const WALL_H = 5;
  for (let x = 0; x < W; x++) for (let y = 0; y < WALL_H; y++) m.set(x, y, 'wallCastle');
  m.blockRect(0, 0, W, WALL_H);
  for (let y = 0; y < H; y++) {
    m.set(0, y, 'wallCastle'); m.set(1, y, 'wallCastle');
    m.set(W - 1, y, 'wallCastle'); m.set(W - 2, y, 'wallCastle');
    m.block(0, y); m.block(1, y); m.block(W - 1, y); m.block(W - 2, y);
  }
  for (let x = 0; x < W; x++) m.block(x, H - 1);
  m.addProp(0, WALL_H * TS - 12, PR.wainscot(W * TS), WALL_H * TS - 1);

  /* ---- one big rug as a floor decal ---- */
  const rugW = 12 * TS, rugH = 6 * TS;
  m.decals.push({ x: 10 * TS, y: 11 * TS, img: PR.rugLarge(rugW, rugH) });

  /* ---- windows + hearth on the back wall ---- */
  for (const wx of [5, 24]) {
    m.addProp(wx * TS, TS + 6, PR.interiorWindow(true), WALL_H * TS - 4);
    m.addLight(wx * TS + 14, TS + 20, 70, '#8a97cf', 0.35, 0, 0.5);
  }
  const fp = PR.fireplace(0);
  m.addProp(14 * TS, TS - 6, fp.canvas, WALL_H * TS + 2);
  m.props[m.props.length - 1].anim = 'fireplace';
  m.addLight(14 * TS + fp.light[0], TS - 6 + fp.light[1], fp.light[2], '#ff9a3c', 0.8, 1, 0.9);
  m.blockRect(14, 4, 3, 1);

  /* ---- warm overhead light pools (lamps hang out of frame) ---- */
  for (const [cx, cy] of [[10, 11], [22, 11], [16, 17]])
    m.addLight(cx * TS, cy * TS, 88, '#ffc86a', 0.4, 0, 0.66);

  /* ---- display counters facing the customers ---- */
  m.counterSlots = [];
  const cSpots = [[6, 7], [11, 7], [16, 7], [21, 7], [5, 16], [24, 16]];
  cSpots.forEach(([cx, cy], i) => {
    m.addProp(cx * TS, cy * TS - 10, ART.counter[i % 4], cy * TS + 16, [15]);
    m.blockRect(cx, cy, 2, 1);
    m.counterSlots.push({ tx: cx, ty: cy, x: cx * TS, y: cy * TS - 10, item: null, qty: 0, price: 0, style: i % 4, id: i });
  });

  /* ---- shelves + menu board against the back wall ---- */
  for (const sx of [2, 9, 19, 28]) {
    m.addProp(sx * TS, WALL_H * TS - 34, ART.shelf[(sx / 6) % 3 | 0], WALL_H * TS + 6, [14]);
    m.blockRect(sx, WALL_H, 2, 1);
  }
  m.addProp(19 * TS, TS + 8, PR.chalkboard(), WALL_H * TS - 3);

  /* ---- seating + greenery ---- */
  for (const [tx, ty] of [[4, 19], [26, 19]]) {
    m.addProp(tx * TS, ty * TS - 6, ART.table, ty * TS + 16, [11]);
    m.blockRect(tx, ty, 2, 1);
    m.addProp((tx - 1) * TS - 4, ty * TS - 10, ART.chair, ty * TS + 15, [6]);
    m.addProp((tx + 2) * TS + 2, ty * TS - 10, ART.chair, ty * TS + 15, [6]);
  }
  for (const [px2, py2] of [[3, 12], [28, 12], [3, 8], [28, 8]]) {
    m.addProp(px2 * TS, py2 * TS - 14, PR.pottedPlant(px2), py2 * TS + 14, [8]);
    m.block(px2, py2);
  }
  for (const [bx, by] of [[9, 19], [22, 19]]) {
    m.addProp(bx * TS, by * TS - 4, ART.barrel, by * TS + 14, [7]);
    m.block(bx, by);
  }

  /* ---- candelabras on the side walls ---- */
  for (const [lx, ly] of [[2, 10], [29, 10], [2, 16], [29, 16]]) {
    m.addProp(lx * TS, ly * TS - 14, ART.candelabra[0].canvas, ly * TS + 12);
    m.props[m.props.length - 1].anim = 'candelabra';
    m.addLight(lx * TS + 7, ly * TS - 10, 52, '#ffd066', 0.6, 0.4);
    m.block(lx, ly);
  }

  /* ---- exits ---- */
  m.warps.push({ x: 14 * TS, y: (H - 2) * TS, w: TS * 4, h: TS * 2, to: 'town', tx: 41 * TS, ty: 0, label: 'Step Outside', anchorTown: true });
  for (let x = 14; x < 18; x++) { m.block(x, H - 1, 0); m.block(x, H - 2, 0); m.set(x, H - 1, 'castleFloor'); }
  m.warps.push({ x: 2 * TS, y: WALL_H * TS, w: TS * 2, h: TS * 2, to: 'kitchen', tx: 12 * TS, ty: 13 * TS, label: 'The Kitchen' });
  m.block(2, WALL_H, 0); m.block(3, WALL_H, 0);
  m.set(2, WALL_H, 'castleFloor'); m.set(3, WALL_H, 'castleFloor');

  m.interact.push({ x: 20 * TS, y: 19 * TS, w: TS * 2, h: TS * 2, type: 'openSign', label: 'Open / Close Shop' });

  m.props.sort((a, b) => a.sy - b.sy);
  return m;
}

/* ================================================================== *
 * KITCHEN / FOOD LABORATORY
 * ================================================================== */
export function buildKitchen() {
  const W = 26, H = 18;
  const m = new GameMap('kitchen', W, H, { base: 'labFloor', indoor: true, name: 'The Food Laboratory' });
  m.ambient = { key: 'deep', amount: 0.50, tint: '#3b2a63', bloom: 0.75, vignetteAmt: 0.42 };

  m.fill(0, 0, W, H, 'labFloor');
  for (let x = 0; x < W; x++) for (let y = 0; y < 3; y++) m.set(x, y, 'wallCastle');
  for (let y = 0; y < H; y++) { m.set(0, y, 'wallCastle'); m.set(1, y, 'wallCastle'); m.set(W - 1, y, 'wallCastle'); m.set(W - 2, y, 'wallCastle'); }
  m.blockRect(0, 0, W, 3);
  for (let y = 0; y < H; y++) { m.block(0, y); m.block(1, y); m.block(W - 1, y); m.block(W - 2, y); }
  for (let x = 0; x < W; x++) m.block(x, H - 1);

  // three cauldrons — the crafting stations
  m.cauldrons = [];
  [[6, 6], [12, 6], [18, 6]].forEach(([cx, cy], i) => {
    const pr = { x: cx * TS - 12, y: cy * TS - 22, img: ART.cauldron[0].canvas, sy: cy * TS + 20, anim: 'cauldron', shadow: [15] };
    m.props.push(pr);
    m.blockRect(cx, cy, 2, 1);
    m.addLight(cx * TS + 8, cy * TS + 8, 56, '#ff9c30', 0.7, 1, 0.85);
    m.cauldrons.push({ tx: cx, ty: cy, id: i, busy: 0, recipe: null });
    m.interact.push({ x: cx * TS - 8, y: cy * TS, w: TS * 3, h: TS * 2, type: 'cauldron', id: i, label: 'Temper Chocolate' });
  });

  // shelves of ingredients
  for (const sx of [3, 9, 15, 21]) {
    m.addProp(sx * TS, 3 * TS - 6, ART.shelf[sx % 3], 3 * TS + 34);
    m.blockRect(sx, 3, 2, 2);
  }
  // work bench
  for (const [bx, by] of [[6, 12], [12, 12], [18, 12]]) {
    m.addProp(bx * TS, by * TS - 10, ART.counter[1], by * TS + 16);
    m.blockRect(bx, by, 2, 1);
  }
  m.interact.push({ x: 11 * TS, y: 12 * TS, w: TS * 3, h: TS * 2, type: 'recipeBook', label: 'Recipe Book' });

  for (const [lx, ly] of [[4, 15], [21, 15]]) {
    m.addProp(lx * TS, ly * TS - 14, ART.candelabra[0].canvas, ly * TS + 12);
    m.props[m.props.length - 1].anim = 'candelabra';
    m.addLight(lx * TS + 7, ly * TS - 10, 50, '#ffd066', 0.55, 0.4);
    m.block(lx, ly);
  }

  // clutter: sacks, crates, barrels and a hanging herb line
  for (const [bx, by] of [[3, 9], [22, 9], [8, 15], [17, 15], [12, 9]]) {
    m.addProp(bx * TS, by * TS - 4, ART.barrel, by * TS + 14, [7]);
    m.block(bx, by);
  }
  for (const [bx, by] of [[5, 15], [20, 15], [10, 3]]) {
    m.addProp(bx * TS, by * TS, ART.crate, by * TS + 14, [7]);
    m.block(bx, by);
  }
  for (const [px2, py2] of [[3, 12], [22, 12]]) {
    m.addProp(px2 * TS, py2 * TS - 14, PR.pottedPlant(px2), py2 * TS + 14, [8]);
    m.block(px2, py2);
  }


  m.warps.push({ x: 11 * TS, y: (H - 2) * TS, w: TS * 4, h: TS * 2, to: 'shop', tx: 3 * TS, ty: 5 * TS, label: 'Back to the Shop' });
  for (let x = 11; x < 15; x++) { m.block(x, H - 1, 0); m.block(x, H - 2, 0); }

  m.props.sort((a, b) => a.sy - b.sy);
  return m;
}

/* ================================================================== *
 * HOLLOW GROVE — foraging + combat
 * ================================================================== */
export function buildGrove() {
  const W = 76, H = 52;
  const m = new GameMap('grove', W, H, { base: 'snow', name: 'The Hollow Grove' });
  m.ambient = { key: 'night', amount: 0.58, tint: '#24365e', bloom: 0.8, vignetteAmt: 0.44 };

  // deep snow, with bare ground only where the canopy is thickest
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const n = fnoise(x / 11, y / 11, 21);
      m.set(x, y, n > 0.70 ? 'dirt' : 'snow');
    }
  // winding trodden trail in from the west
  let py = 26;
  for (let x = 0; x < W - 6; x++) {
    py += Math.round((fnoise(x / 7, 3, 5) - 0.5) * 2.4);
    py = Math.max(6, Math.min(H - 8, py));
    const wdt = 2 + (fnoise(x / 5, 9, 12) > 0.55 ? 1 : 0);
    for (let d = -wdt; d <= wdt; d++) m.set(x, py + d, 'path');
  }
  // break the hard rectangles of bare ground with a ring of packed snow
  {
    const snap = m.ground.slice();
    const at = (x, y) => (m.inb(x, y) ? snap[m.idx(x, y)] : 'snow');
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (at(x, y) === 'dirt' &&
            [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].some(t => t !== 'dirt'))
          m.set(x, y, 'path');
  }

  // dense pine border + scattered interior
  for (let i = 0; i < 900; i++) {
    const tx = ((hash2(i, 11, 3) * W) | 0), ty = ((hash2(i, 12, 4) * H) | 0);
    if (!m.inb(tx, ty) || m.isSolid(tx, ty)) continue;
    const edge = tx < 5 || ty < 4 || tx > W - 6 || ty > H - 5;
    const dense = edge || hash2(i, 13, 5) < 0.62;
    if (!dense) continue;
    if (m.ground[m.idx(tx, ty)] === 'path' && !edge) continue;
    const roll = hash2(i, 14, 6);
    let img;
    if (roll < 0.72) img = ART.pine[(hash2(i, 15, 7) * ART.pine.length) | 0];
    else if (roll < 0.86) img = ART.bare[(hash2(i, 16, 8) * 2) | 0];
    else if (roll < 0.95) { img = ART.bush[(hash2(i, 17, 9) * 3) | 0]; }
    else img = ART.rock[(hash2(i, 18, 10) * 3) | 0];
    m.addProp(tx * TS - ((img.width - TS) >> 1), ty * TS - img.height + TS, img, ty * TS + TS, [Math.round(img.width * 0.26)]);
    if (roll < 0.86 || roll >= 0.95) m.block(tx, ty);
  }

  // gravestones in a small clearing
  for (let i = 0; i < 7; i++) {
    const gx = 50 + ((hash2(i, 21, 3) * 12) | 0), gy = 10 + ((hash2(i, 22, 4) * 10) | 0);
    if (!m.inb(gx, gy)) continue;
    m.addProp(gx * TS, gy * TS - 6, ART.grave[i % 2], gy * TS + 16, [7]);
    m.block(gx, gy);
    if (i % 3 === 0) m.addLight(gx * TS + 8, gy * TS - 2, 34, '#7460cc', 0.5, 1);
  }

  // forage nodes
  const kinds = ['cocoaPod', 'cocoaPod', 'cocoaPod', 'moonberry', 'gloomcap', 'frostmint', 'emberspice', 'spiritSalt', 'honey'];
  for (let i = 0; i < 70; i++) {
    const fx = 6 + ((hash2(i, 31, 3) * (W - 12)) | 0);
    const fy = 5 + ((hash2(i, 32, 4) * (H - 10)) | 0);
    if (!m.inb(fx, fy) || m.isSolid(fx, fy)) continue;
    const kind = kinds[(hash2(i, 33, 5) * kinds.length) | 0];
    m.forage.push({ tx: fx, ty: fy, x: fx * TS + 8, y: fy * TS + 8, kind, taken: false, respawn: 0 });
  }

  // enemy spawn points
  for (let i = 0; i < 22; i++) {
    const sx = 10 + ((hash2(i, 41, 3) * (W - 20)) | 0);
    const sy = 6 + ((hash2(i, 42, 4) * (H - 12)) | 0);
    if (!m.inb(sx, sy) || m.isSolid(sx, sy)) continue;
    const roll = hash2(i, 43, 5);
    const type = roll < 0.45 ? 'slime' : roll < 0.68 ? 'crow' : roll < 0.85 ? 'bat' : 'potcrab';
    m.spawns.push({ x: sx * TS + 8, y: sy * TS + 8, type });
  }

  // boss arena at the far east
  m.bossArena = { x: (W - 16) * TS, y: 26 * TS, w: 14 * TS, h: 16 * TS };
  for (let y = 26; y < 42; y++) for (let x = W - 16; x < W - 2; x++) m.set(x, y, 'dirt');
  for (let y = 25; y < 43; y++) { m.set(W - 16, y, 'path'); m.set(W - 3, y, 'path'); }
  for (let x = W - 16; x < W - 2; x++) { m.set(x, 26, 'path'); m.set(x, 41, 'path'); }
  m.addLight((W - 9) * TS, 34 * TS, 130, '#ffb84a', 0.45, 0.5);
  // hive wreckage ringing the arena
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const hx = (W - 9) * TS + Math.cos(a) * 88;
    const hy = 34 * TS + Math.sin(a) * 104;
    const img = i % 3 === 0 ? ART.rock[i % 3] : PR.foragePlant('honey');
    m.addProp(Math.round(hx - img.width / 2), Math.round(hy - img.height + 8), img,
              Math.round(hy + 6), [7]);
    if (i % 3 !== 0) m.addLight(hx, hy - 6, 30, '#ffd066', 0.5, 0.4);
  }

  m.warps.push({ x: 0, y: 22 * TS, w: TS, h: TS * 6, to: 'town', tx: (84 - 3) * TS, ty: 34 * TS, label: 'Back to Town' });

  for (let x = 0; x < W; x++) { m.block(x, 0); m.block(x, 1); m.block(x, H - 1); m.block(x, H - 2); }
  for (let y = 0; y < H; y++) { if (!(y >= 22 && y < 28)) { m.block(0, y); m.block(1, y); } m.block(W - 1, y); m.block(W - 2, y); }

  m.props.sort((a, b) => a.sy - b.sy);
  return m;
}
