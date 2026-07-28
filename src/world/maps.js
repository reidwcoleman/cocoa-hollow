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
    this.noTree = new Uint8Array(w * h);   // keep scenery off structures
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
  reserve(x0, y0, w, h) {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) if (this.inb(x, y)) this.noTree[this.idx(x, y)] = 1;
  }
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
  ART.pine = [
    PR.pineTree(0.95, true, 1, 'pineB'), PR.pineTree(1.20, true, 2, 'pineB'),
    PR.pineTree(0.75, true, 3, 'pineD'), PR.pineTree(1.05, true, 4, 'pineC'),
    PR.pineTree(0.62, true, 5, 'pineB'), PR.pineTree(1.35, true, 6, 'pine'),
    PR.pineTree(0.88, true, 7, 'pineC'), PR.pineTree(1.12, true, 8, 'pineB'),
    PR.pineTree(1.00, true, 9, 'pineD'), PR.pineTree(0.82, true, 10, 'pineB'),
    PR.pineTree(1.08, true, 11, 'pineB'),PR.pineTree(0.90, true, 12, 'pineC'),
  ];
  ART.pineBare = [PR.pineTree(1.0, false, 5), PR.pineTree(1.2, false, 6)];
  ART.bare = [PR.bareTree(1), PR.bareTree(2), PR.bareTree(3), PR.bareTree(4)];
  ART.bush = [PR.bush(true, 1), PR.bush(true, 2), PR.bush(false, 3)];
  ART.rock = [PR.rock(1, 1), PR.rock(1.4, 2), PR.rock(0.8, 3)];
  ART.barrel = PR.barrel();
  ART.crate = PR.crate();
  ART.fence = PR.fencePost();
  ART.fencePanel = [PR.fencePanel(1), PR.fencePanel(2), PR.fencePanel(3)];
  ART.planter = [PR.planter(1), PR.planter(2), PR.planter(3)];
  ART.grave = [PR.gravestone(1), PR.gravestone(2)];
  ART.counter = [PR.counter(0), PR.counter(1), PR.counter(2), PR.counter(3)];
  ART.shelf = [PR.shelf(0), PR.shelf(1), PR.shelf(2)];
  ART.cauldron = [0, 1, 2, 3].map(f => PR.cauldron(f));
  ART.conche = [0, 1, 2, 3].map(f => PR.conche(f));
  ART.table = PR.table();
  ART.chair = PR.chair();
  ART.candelabra = [0, 1, 2, 3].map(f => PR.candelabra(f));
  ART.fireplace = [0, 1, 2, 3].map(f => PR.fireplace(f));
  ART.chandelier = [0, 1, 2, 3].map(f => PR.chandelier(f));
  ART.forage = {};
  for (const k of ['cocoaPod','sugar','milk','cream','moonberry','gloomcap','frostmint','emberspice','spiritSalt','honey'])
    ART.forage[k] = PR.foragePlant(k);
  ART.shopfronts = [
    PR.shopfront({ w: 122, sign: 'BAKERY',     roof: 'roofSlate', stone: 'river',   trim: 'wood', seed: 5,  chimneyX: 0.18 }),
    PR.shopfront({ w: 108, sign: 'APOTHECARY', roof: 'teal',      stone: 'brick',   trim: 'oak',  seed: 11, chimneyX: 0.78, signCol: '#4fc6ce' }),
    PR.shopfront({ w: 132, sign: 'THE ANVIL',  roof: 'plum',      stone: 'river',   trim: 'wood', seed: 17, chimneyX: 0.24, signCol: '#f0a52a' }),
    PR.shopfront({ w: 114, sign: 'TAILOR',     roof: 'ruby',      stone: 'masonry', trim: 'oak',  seed: 23, chimneyX: 0.66, signCol: '#c7b7ff' }),
    PR.shopfront({ w: 126, sign: 'THE LEDGER', roof: 'roofSlate', stone: 'brick',   trim: 'oak',  seed: 29, chimneyX: 0.30, signCol: '#faea61' }),
    PR.shopfront({ w: 104, sign: 'DAIRY',      roof: 'teal',      stone: 'river',   trim: 'wood', seed: 31, chimneyX: 0.72, signCol: '#e6e8ff' }),
    PR.shopfront({ w: 118, sign: 'THE LANTERN',roof: 'plum',      stone: 'masonry', trim: 'wood', seed: 37, chimneyX: 0.20, signCol: '#f0a52a' }),
  ];
  ART.roomFrame = {};
  ART.wallCabinet = PR.wallCabinet(3);
  ART.openSign = [PR.openSign(false), PR.openSign(true)];
  ART.castle = PR.castleShop();
  ART.houses = [
    PR.townhouse({ w: 74, facadeH: 34, roof: 'plum',  wall: 'masonry', trim: 'wood', seed: 3,  chimneys: [52] }),
    PR.townhouse({ w: 58, facadeH: 40, roof: 'teal',  wall: 'masonry', trim: 'oak',  seed: 7,  chimneys: [14, 40], winW: 11, winH: 14 }),
    PR.townhouse({ w: 88, facadeH: 32, roof: 'plum',  wall: 'brick',   trim: 'wood', seed: 11, chimneys: [66],
                   windows: [12, 34, 62] }),
    PR.townhouse({ w: 52, facadeH: 44, roof: 'ruby',  wall: 'masonry', trim: 'oak',  seed: 13, chimneys: [34], winW: 11, winH: 16 }),
    PR.townhouse({ w: 68, facadeH: 36, roof: 'teal',  wall: 'masonry', trim: 'wood', seed: 17, chimneys: [10, 52] }),
    PR.townhouse({ w: 62, facadeH: 30, roof: 'plum',  wall: 'brick',   trim: 'oak',  seed: 23, chimneys: [42], winW: 12, winH: 13 }),
  ];
  return ART;
}

/* ================================================================== *
 * TOWN
 * ================================================================== */
export function buildTown() {
  /* A linear street town on terraces, not a plaza.
   *
   * One dead-straight east-west thoroughfare; every facade faces down-screen
   * and lands on a shared building line; the public corridor is a swept verge,
   * a flagstone walk, a masonry kerb, then a cobbled lower level. Buildings
   * never abut — the gaps between them are mostly closed with fence, bush and
   * a corner lamp, so the row reads as a street with interstices. */
  const W = 116, H = 44;
  const m = new GameMap('town', W, H, { base: 'snow', name: 'Hollow Street' });

  const BASE_Y = 20;            // shop ground line
  const VERGE_Y = BASE_Y + 1;   // swept strip under the shopfronts
  const WALK_Y = BASE_Y + 2;    // flagstone walk
  const WALK_H = 2;
  const KERB_Y = WALK_Y + WALK_H;
  const LOW_H = 3;              // cobbled carriageway below the kerb
  const LOW_Y = KERB_Y + 1;

  /* ---- the corridor ---- */
  m.fill(0, WALK_Y, W, WALK_H, 'cobble');
  m.fill(0, LOW_Y, W, LOW_H, 'cobbleBare');
  // snow reclaims the edges of the carriageway in irregular bites, so the
  // paving never reads as one poured sheet
  for (let x2 = 0; x2 < W; x2++) {
    const bite = fnoise(x2 / 6, 3, 41);
    if (bite > 0.62) m.set(x2, LOW_Y + LOW_H - 1, 'path');
    if (bite > 0.74) m.set(x2, LOW_Y + LOW_H - 2, 'path');
    if (fnoise(x2 / 5, 9, 43) > 0.7) m.set(x2, LOW_Y, 'path');
  }
  m.fill(0, KERB_Y, W, 1, 'cobbleBare');

  const lamps = [], gaps = [];

  /* ---- the shop row: one walker left to right along the baseline ---- */
  const placeBuilding = (art, tx, groundRow, isShop) => {
    const bw = Math.ceil(art.canvas.width / TS);
    const gy = groundRow * TS;
    const px = tx * TS, py = gy - art.groundY;
    const shW = Math.round(art.canvas.width * 1.1), shH = Math.round(art.canvas.height * 0.34);
    m.decals.push({ x: px - Math.round(art.canvas.width * 0.18),
                    y: gy - Math.round(shH * 0.45), img: PR.castShadow(shW, shH) });
    m.addProp(px, py, art.canvas, gy);
    for (const L of art.lights) {
      const [lx, ly, lr, lit] = L;
      if (lit === false) continue;
      m.addLight(px + lx, py + ly, lr, '#ffcf70', 0.55, 1, 0.7);
    }
    for (const [sx, sy] of art.smokes) m.smokes.push([px + sx, py + sy]);
    // solid from the ground line up through the facade
    const bh = Math.max(2, Math.ceil((art.canvas.height - art.groundY + 46) / TS));
    m.blockRect(tx, groundRow - bh, bw, bh);
    m.reserve(tx - 1, groundRow - Math.ceil(art.canvas.height / TS) - 1,
              bw + 2, Math.ceil(art.canvas.height / TS) + 3);
    // swept threshold, three tiles centred on the door, on the verge only
    const dtx = tx + Math.floor(bw / 2);
    for (let x = dtx - 1; x <= dtx + 1; x++) m.set(x, VERGE_Y, 'cobble');
    return bw;
  };

  let x = 4, i = 0;
  while (x < W - 16) {
    const useHouse = i % 3 === 2;
    const art = useHouse ? ART.houses[i % ART.houses.length]
                         : ART.shopfronts[i % ART.shopfronts.length];
    const jitter = hash2(i, 9, 3) > 0.62 ? 1 : 0;
    const bw = placeBuilding(art, x, BASE_Y + jitter, !useHouse);
    // verge under this frontage only — the gaps stay snow
    m.fill(x, VERGE_Y, bw, 1, 'cobbleBare');
    lamps.push(x - 1);
    lamps.push(x + bw);
    const gw = 3 + ((hash2(i, 4, 7) * 6) | 0);
    gaps.push({ x: x + bw, w: gw, i });
    x += bw + gw;
    i++;
  }

  /* ---- the castle shop anchors the row ---- */
  const cs = ART.castle;
  const csTX = 52;
  {
    const gy = (BASE_Y - 1) * TS;
    const px = csTX * TS, py = gy - cs.groundY;
    m.addProp(px, py, cs.canvas, gy);
    for (const [lx, ly, lr] of cs.lights) m.addLight(px + lx, py + ly, lr, '#ffcf70', 0.6, 1, 0.72);
    for (const [sx, sy] of cs.smokes) m.smokes.push([px + sx, py + sy]);
    const bw = Math.ceil(cs.canvas.width / TS);
    m.blockRect(csTX, BASE_Y - 1 - Math.ceil((cs.canvas.height - cs.groundY + 50) / TS), bw,
                Math.ceil((cs.canvas.height - cs.groundY + 50) / TS));
    m.reserve(csTX - 1, BASE_Y - 1 - Math.ceil(cs.canvas.height / TS) - 1,
              bw + 2, Math.ceil(cs.canvas.height / TS) + 3);
    const doorTX = csTX + Math.floor(bw / 2);
    for (let dx = -1; dx <= 1; dx++) { m.block(doorTX + dx, BASE_Y - 1, 0); m.set(doorTX + dx, VERGE_Y, 'cobble'); }
    m.fill(csTX, VERGE_Y, bw, 1, 'cobbleBare');
    m.warps.push({ x: (doorTX - 1) * TS, y: (BASE_Y - 1) * TS, w: TS * 3, h: TS,
                   to: 'shop', spawn: true, label: 'Enter the Shop' });
    m.castleDoor = { x: doorTX * TS + 8, y: VERGE_Y * TS + 10 };
  }

  /* ---- a second row of buildings on the lower terrace ----
   * Their roof planes fill the bottom of the frame the way the reference does,
   * instead of leaving the carriageway backed by empty snow. */
  const LOW_BASE = LOW_Y + LOW_H + 6;
  {
    let lx2 = 10, k = 0;
    while (lx2 < W - 20) {
      const art = ART.houses[(k + 2) % ART.houses.length];
      const bw = Math.ceil(art.canvas.width / TS);
      const gRow = LOW_BASE + (hash2(k, 13, 3) > 0.6 ? 1 : 0) - (k % 3 === 1 ? 1 : 0);
      const gy = gRow * TS, px = lx2 * TS, py = gy - art.groundY;
      const shW = Math.round(art.canvas.width * 1.1), shH = Math.round(art.canvas.height * 0.32);
      m.decals.push({ x: px - Math.round(art.canvas.width * 0.18),
                      y: gy - Math.round(shH * 0.45), img: PR.castShadow(shW, shH) });
      m.addProp(px, py, art.canvas, gy);
      for (const L of art.lights) {
        const [ax, ay, ar, lit] = L;
        if (lit === false) continue;
        m.addLight(px + ax, py + ay, ar, '#ffc95e', 0.5, 1, 0.62);
      }
      for (const [sx, sy] of art.smokes) m.smokes.push([px + sx, py + sy]);
      const bh = Math.max(2, Math.ceil((art.canvas.height - art.groundY + 42) / TS));
      m.blockRect(lx2, gRow - bh, bw, bh);
      m.reserve(lx2 - 1, gRow - Math.ceil(art.canvas.height / TS) - 1,
                bw + 2, Math.ceil(art.canvas.height / TS) + 3);
      // a path from the carriageway down to the door
      const dtx = lx2 + Math.floor(bw / 2);
      for (let y = LOW_Y + LOW_H; y <= gRow; y++)
        for (let x2 = dtx - 1; x2 <= dtx + 1; x2++) m.set(x2, y, 'path');
      lx2 += bw + 5 + ((hash2(k, 17, 5) * 7) | 0);
      k++;
    }
  }

  /* ---- masonry kerb with three flush stairs ---- */
  const stairs = [18, 54, 88];
  for (let kx = 0; kx < W; kx++) {
    if (stairs.some(sx => kx >= sx && kx < sx + 2)) {
      m.set(kx, KERB_Y, 'cobble');
      continue;
    }
    m.addProp(kx * TS, KERB_Y * TS - 8, PR.kerbWall(TS), KERB_Y * TS + TS - 2);
    m.block(kx, KERB_Y);
  }

  /* ---- gaps: mostly closed, roughly one in four a real alley ---- */
  for (const g of gaps) {
    if (g.x + g.w >= W - 4) continue;
    const isAlley = g.w >= 7 || g.i % 4 === 0;
    if (isAlley) {
      const lane = g.x + ((g.w / 2) | 0) - 1;
      for (let y = BASE_Y - 7; y <= BASE_Y; y++) { m.set(lane, y, 'path'); m.set(lane + 1, y, 'path'); }
      // service clutter on the flanks, never in the lane
      m.addProp((g.x) * TS, (BASE_Y - 2) * TS - 4, ART.barrel, (BASE_Y - 2) * TS + 14, [7]);
      m.block(g.x, BASE_Y - 2);
    } else if (g.w >= 5) {
      // a treed pocket: closed, but green rather than fenced
      for (let k = 0; k < 3; k++) {
        const tx2 = g.x + 1 + ((hash2(g.i, k, 51) * (g.w - 2)) | 0);
        const ty2 = BASE_Y - 1 - ((hash2(g.i, k, 52) * 5) | 0);
        if (m.isSolid(tx2, ty2)) continue;
        const img = ART.pine[(hash2(g.i, k, 53) * ART.pine.length) | 0];
        m.addProp(tx2 * TS - ((img.width - TS) >> 1), ty2 * TS - img.height + TS, img,
                  ty2 * TS + TS, [Math.round(img.width * 0.26)]);
        m.block(tx2, ty2);
      }
      const bush = ART.bush[g.i % 3];
      m.addProp((g.x + 1) * TS, BASE_Y * TS - bush.height + 10, bush, BASE_Y * TS + 8, [9]);
    } else {
      const fy = BASE_Y - 2;
      for (let fx = g.x; fx < g.x + g.w; fx += 2) {
        m.addProp(fx * TS, fy * TS - 8, ART.fencePanel[fx % 3], fy * TS + 12, [13]);
        m.blockRect(fx, fy, 2, 1);
      }
      const bush = ART.bush[g.i % 3];
      m.addProp(g.x * TS, BASE_Y * TS - bush.height + 10, bush, BASE_Y * TS + 8, [9]);
      if (g.w >= 5) {
        m.addProp((g.x + g.w - 2) * TS, (BASE_Y - 1) * TS - 4, ART.barrel, (BASE_Y - 1) * TS + 14, [7]);
        m.block(g.x + g.w - 2, BASE_Y - 1);
      }
    }
  }

  /* ---- lamps at the gap corners, on the verge, heads all on one row ---- */
  const placed = [];
  for (const lx of lamps) {
    if (lx < 2 || lx > W - 3) continue;
    if (placed.some(px2 => Math.abs(px2 - lx) < 5)) continue;
    placed.push(lx);
    const X = lx * TS, Y = VERGE_Y * TS - 40;
    m.addProp(X, Y, ART.lamp.canvas, VERGE_Y * TS + 12, [6]);
    m.addLight(X + ART.lamp.light[0], Y + ART.lamp.light[1], ART.lamp.light[2], '#ffc75e', 0.42, 1, 0.62);
    m.block(lx, VERGE_Y);
  }

  /* ---- furniture clusters along the lower kerb: planter, bench, lamp ---- */
  for (let cx = 10; cx < W - 12; cx += 14 + ((hash2(cx, 3, 5) * 5) | 0)) {
    const cy = LOW_Y + 1;
    m.addProp(cx * TS - 5, cy * TS - 10, ART.planter[cx % 3], cy * TS + 12, [11]);
    m.block(cx, cy);
    m.addProp((cx + 2) * TS, cy * TS - 6, PR.bench(), cy * TS + 14, [13]);
    m.blockRect(cx + 2, cy, 2, 1);
    if (hash2(cx, 7, 9) > 0.5) {
      const sx = cx + 5;
      m.addProp(sx * TS - 6, (cy + 1) * TS - 30, PR.marketStall(sx, ['ruby', 'teal', 'gold'][sx % 3]),
                (cy + 1) * TS + 14, [17]);
      m.blockRect(sx, cy + 1, 3, 1);
      m.addLight(sx * TS + 22, (cy + 1) * TS - 2, 34, '#ffc06a', 0.4, 1, 0.55);
    }
  }
  // greenery breaking up the carriageway, always against something
  for (let gx = 6; gx < W - 6; gx += 5 + ((hash2(gx, 5, 61) * 6) | 0)) {
    const gy = LOW_Y + LOW_H - 1;
    if (m.isSolid(gx, gy)) continue;
    if (hash2(gx, 6, 62) > 0.5) {
      const bush = ART.bush[gx % 3];
      m.addProp(gx * TS - 2, gy * TS - bush.height + 12, bush, gy * TS + 10, [9]);
    } else {
      m.addProp(gx * TS - 5, gy * TS - 10, ART.planter[gx % 3], gy * TS + 12, [11]);
      m.block(gx, gy);
    }
  }

  // snow banks against the kerb face and every fence run
  for (let dx = 3; dx < W - 3; dx += 3) {
    if (hash2(dx, 11, 3) < 0.45) continue;
    const img = PR.snowDrift(0.5 + hash2(dx, 12, 4) * 0.5, dx);
    m.addProp(dx * TS - (img.width >> 1), LOW_Y * TS - img.height + 6, img, LOW_Y * TS + 4);
  }

  /* ---- trees crowd right up to the corridor ---- */
  for (let i2 = 0; i2 < 1400; i2++) {
    const tx = ((hash2(i2, 1, 3) * W) | 0), ty = ((hash2(i2, 2, 4) * H) | 0);
    if (tx < 1 || ty < 1 || tx > W - 2 || ty > H - 2) continue;
    // a crown is ~7 tiles tall, so exclude far enough below that no tree
    // planted under the street can reach up into it
    if (ty >= BASE_Y - 1 && ty <= LOW_Y + LOW_H + 7) continue;
    if (m.ground[m.idx(tx, ty)] !== 'snow') continue;
    if (m.isSolid(tx, ty) || m.noTree[m.idx(tx, ty)]) continue;
    const roll = hash2(i2, 3, 5);
    let img;
    if (roll < 0.68) img = ART.pine[(hash2(i2, 4, 6) * ART.pine.length) | 0];
    else if (roll < 0.86) img = ART.bare[(hash2(i2, 5, 7) * 4) | 0];
    else if (roll < 0.95) img = ART.bush[(hash2(i2, 6, 8) * 3) | 0];
    else img = ART.rock[(hash2(i2, 7, 9) * 3) | 0];
    m.addProp(tx * TS - ((img.width - TS) >> 1), ty * TS - img.height + TS, img,
              ty * TS + TS, [Math.round(img.width * 0.26)]);
    if (roll < 0.86 || roll >= 0.95) m.block(tx, ty);
  }

  /* ---- vendors sit on the lower level, facing the street ---- */
  for (const [vx, vid, vlabel, hue] of [[24, 'dairy', "Poppy's Dairy — buy ingredients", 'teal'],
                                        [70, 'general', 'The Hollow Exchange — buy ingredients', 'ruby']]) {
    const stall = PR.marketStall(vx, hue);
    const vy = LOW_Y + 1;
    m.addProp(vx * TS - 6, vy * TS - 30, stall, vy * TS + 14, [17]);
    m.blockRect(vx, vy, 3, 1);
    m.addLight(vx * TS + 22, vy * TS - 2, 42, '#ffc06a', 0.5, 1, 0.66);
    m.interact.push({ x: (vx - 1) * TS, y: (vy - 1) * TS, w: TS * 5, h: TS * 3,
                      type: 'vendor', vendorId: vid, label: vlabel });
  }

  /* ---- the way out to the grove is an arch you can see from a distance ---- */
  const gate = PR.groveGate();
  const gateX = (W - 8) * TS, gateY = (LOW_Y + LOW_H) * TS - 96;
  m.addProp(gateX, gateY, gate.canvas, (LOW_Y + LOW_H) * TS + 2);
  for (const [lx, ly] of gate.lights)
    m.addLight(gateX + lx, gateY + ly, 56, '#ffc75e', 0.5, 1, 0.7);
  for (let y = LOW_Y; y < LOW_Y + LOW_H; y++)
    for (let x = W - 8; x < W - 2; x++) m.set(x, y, 'cobble');

  m.warps.push({ x: (W - 1) * TS, y: LOW_Y * TS, w: TS, h: TS * LOW_H,
                 to: 'grove', tx: 3 * TS, ty: 24 * TS, label: 'Hollow Grove — fight and forage' });
  for (let y = LOW_Y; y < LOW_Y + LOW_H; y++) m.block(W - 1, y, 0);

  /* ---- fingerposts telling you where everything is ---- */
  const posts = [
    [30, [{ text: 'GROVE', dir: 1 }, { text: 'YOUR SHOP', dir: -1 }]],
    [62, [{ text: 'GROVE', dir: 1 }, { text: 'MARKET', dir: -1 }]],
    [92, [{ text: 'GROVE', dir: 1 }]],
  ];
  for (const [sx, arms] of posts) {
    const img = PR.signpost(arms);
    m.addProp(sx * TS - 36, (LOW_Y + 1) * TS - 56, img, (LOW_Y + 1) * TS + 6, [8]);
    m.block(sx, LOW_Y + 1);
  }

  /* ---- edges ---- */
  for (let x2 = 0; x2 < W; x2++) { m.block(x2, 0); m.block(x2, H - 1); }
  for (let y = 0; y < H; y++) {
    m.block(0, y);
    if (!(y >= LOW_Y && y < LOW_Y + LOW_H)) m.block(W - 1, y);
  }

  m.spawn = { x: 46 * TS, y: (LOW_Y + 1) * TS };
  m.props.sort((a, b) => a.sy - b.sy);
  return m;
}

/* ================================================================== *
 * SHOP INTERIOR
 * ================================================================== */
/**
 * Build a rectilinear room: floor/wall tiles inside a union of rects, solid
 * everywhere else, and a carved moulding traced round the resulting outline.
 * `rects` are [x, y, w, h] in tiles. Returns helpers the caller needs.
 */
function carveRoom(m, rects, opts) {
  const wallH = opts.wallH != null ? opts.wallH : 3;
  const wallTile = opts.wall || 'roomBrick';
  const floorTile = opts.floor || 'woodFloor';

  const inRoomTile = (tx, ty) => rects.some(([rx, ry, rw, rh]) =>
    tx >= rx && ty >= ry && tx < rx + rw && ty < ry + rh);

  // the wall band is the top `wallH` rows of whichever rect a tile belongs to
  const topOf = (tx, ty) => {
    let best = Infinity;
    for (const [rx, ry, rw] of rects)
      if (tx >= rx && tx < rx + rw) best = Math.min(best, ry);
    return best;
  };

  for (let ty = 0; ty < m.h; ty++) {
    for (let tx = 0; tx < m.w; tx++) {
      if (!inRoomTile(tx, ty)) { m.set(tx, ty, 'void'); m.block(tx, ty); continue; }
      const isWall = ty < topOf(tx, ty) + wallH;
      m.set(tx, ty, isWall ? wallTile : floorTile);
      if (isWall) m.block(tx, ty);
    }
  }

  // moulding traced from the pixel silhouette — corners mitre for free
  const insidePx = (px, py) => inRoomTile(Math.floor(px / TS), Math.floor(py / TS));
  const fr = PR.roomFrameFromMask(m.w * TS, m.h * TS, insidePx);
  m.addProp(0, 0, fr.canvas, 1e9);

  return { inRoomTile, topOf };
}

export function buildShop() {
  // A 30x17 stage. The room is a rectilinear polygon — a wide upper block, an
  // inset lower block and a porch pushing out of the bottom edge — sitting on
  // warm black with generous, deliberately unequal margins. A plain rectangle
  // sized to the viewport is the thing that reads as a placeholder.
  const W = 30, H = 17;
  const m = new GameMap('shop', W, H, { base: 'void', indoor: true, name: 'The Cocoa Hollow' });
  m.ambient = { key: 'night', amount: 0.52, tint: '#a06a50', bloom: 0.5, vignetteAmt: 0.10 };

  const UPPER = [2, 2, 24, 7];       // x, y, w, h in tiles
  const LOWER = [9, 9, 17, 5];
  const PORCH = [16, 14, 3, 1];
  const rects = [UPPER, LOWER, PORCH];
  const WALLH = 3;
  carveRoom(m, rects, { wallH: WALLH, wall: 'roomBrick', floor: 'woodFloor' });

  const FY0 = UPPER[1] + WALLH;                   // first walkable row, 5
  const LOWY = LOWER[1];                          // 9 — the lower terrace
  const RX0 = UPPER[0], RX1 = UPPER[0] + UPPER[2] - 1;

  // the lower block sits a step down; darker boards plus a lit riser face
  for (let y = LOWY; y < LOWER[1] + LOWER[3]; y++)
    for (let x = LOWER[0]; x < LOWER[0] + LOWER[2]; x++) m.set(x, y, 'woodFloorDark');
  m.addProp(LOWER[0] * TS, LOWY * TS - 9, PR.terraceRiser(LOWER[2] * TS), LOWY * TS - 1);

  /* ---- back wall dressing ---- */
  m.addProp(11 * TS, UPPER[1] * TS + 2, PR.curtain(7 * TS, WALLH * TS - 6), FY0 * TS - 2);
  m.addProp(RX0 * TS + 6, UPPER[1] * TS + 6, ART.wallCabinet, FY0 * TS - 3);
  for (const sx of [19, 22]) m.addProp(sx * TS, UPPER[1] * TS + 6, ART.shelf[sx % 3], FY0 * TS - 1);
  const fp = PR.fireplace(0);
  m.addProp(8 * TS, UPPER[1] * TS + 4, fp.canvas, FY0 * TS + 2);
  m.props[m.props.length - 1].anim = 'fireplace';
  // a hearth is the only source that lights a room — about three tiles of reach
  m.addLight(8 * TS + fp.light[0], UPPER[1] * TS + 4 + fp.light[1], 54, '#ff9a3c', 0.8, 1, 0.9);

  m.decals.push({ x: 12 * TS, y: (LOWY + 1) * TS, img: PR.rugLarge(9 * TS, 3 * TS) });

  /* ---- furniture pressed to the walls; the middle stays open ---- */
  m.counterSlots = [];
  const cSpots = [[4, FY0], [8, FY0], [15, FY0], [19, FY0], [23, FY0], [10, LOWY + 3]];
  cSpots.forEach(([cx, cy], i) => {
    m.addProp(cx * TS, cy * TS - 10, ART.counter[i % 4], cy * TS + 16, [15]);
    m.blockRect(cx, cy, 2, 1);
    m.counterSlots.push({ tx: cx, ty: cy, x: cx * TS, y: cy * TS - 10,
                          item: null, qty: 0, price: 0, style: i % 4, id: i });
  });
  for (const [tx, ty] of [[21, LOWY + 3], [24, LOWY + 1]]) {
    m.addProp(tx * TS, ty * TS - 6, ART.table, ty * TS + 16, [11]);
    m.blockRect(tx, ty, 2, 1);
    m.addProp((tx - 1) * TS - 4, ty * TS - 10, ART.chair, ty * TS + 15, [6]);
  }
  for (const [px2, py2] of [[RX0, FY0 + 1], [RX1 - 1, FY0 + 1], [RX0, FY0 + 3]]) {
    m.addProp(px2 * TS, py2 * TS - 14, PR.pottedPlant(px2), py2 * TS + 14, [8]);
    m.block(px2, py2);
  }
  m.addProp(4 * TS, (FY0 + 3) * TS - 4, ART.barrel, (FY0 + 3) * TS + 14, [7]);
  m.block(4, FY0 + 3);

  /* ---- lamps reach about two tiles, no more ---- */
  for (const [cx, cy] of [[14, FY0 + 2], [22, FY0 + 2], [16, LOWY + 2]])
    m.addLight(cx * TS, cy * TS, 38, '#ffb066', 0.42, 0, 0.6);

  /* ---- the porch notch is the way out ---- */
  const doorX = PORCH[0] + 1;
  m.warps.push({ x: PORCH[0] * TS, y: PORCH[1] * TS, w: PORCH[2] * TS, h: TS,
                 to: 'town', anchorTown: true, label: 'Step Outside' });
  // the way to the kitchen is a signed door, not an invisible tile
  m.addProp(RX0 * TS + 2, (FY0 - 3) * TS + 4, PR.innerDoor('KITCHEN'), FY0 * TS + 8);
  m.addLight(RX0 * TS + 23, FY0 * TS - 6, 40, '#ffd066', 0.45, 0, 0.6);
  m.warps.push({ x: RX0 * TS, y: FY0 * TS, w: TS * 3, h: TS * 2,
                 to: 'kitchen', spawn: true, label: 'The Kitchen — make chocolate' });
  // the open/closed sign is an object you can see, and it flips with the state
  m.openSignProp = m.addProp(24 * TS, (LOWY + 1) * TS - 6, ART.openSign[0], (LOWY + 2) * TS + 6);
  m.openSignProp.anim = 'openSign';
  m.interact.push({ x: 23 * TS, y: (LOWY + 1) * TS, w: TS * 3, h: TS * 2,
                    type: 'openSign', label: 'Open / Close the Shop' });

  m.roam = { x: RX0 + 2, y: FY0, w: UPPER[2] - 5, h: 3 };
  m.door = { x: doorX * TS + 8, y: PORCH[1] * TS + 8 };
  m.browseY = (FY0 + 2) * TS;
  m.spawn = { x: doorX * TS + 8, y: (LOWY + 2) * TS };
  m.bounds = { x0: 0, y0: 0, x1: W * TS, y1: H * TS };
  m.props.sort((a, b) => a.sy - b.sy);
  return m;
}

/* ================================================================== *
 * KITCHEN / FOOD LABORATORY
 * ================================================================== */
export function buildKitchen() {
  const W = 30, H = 17;
  const m = new GameMap('kitchen', W, H, { base: 'void', indoor: true, name: 'The Food Laboratory' });
  m.ambient = { key: 'deep', amount: 0.56, tint: '#7a4aff', bloom: 0.55, vignetteAmt: 0.10 };

  // a working hall with an alcove stepping out to the right and a stair landing
  const HALL  = [3, 2, 20, 8];
  const ALCOVE = [23, 5, 4, 6];
  const LAND  = [8, 10, 12, 4];
  const rects = [HALL, ALCOVE, LAND];
  const WALLH = 3;
  carveRoom(m, rects, { wallH: WALLH, wall: 'wallCastle', floor: 'labFloor' });

  const FY0 = HALL[1] + WALLH;                    // 5
  const LOWY = LAND[1];                           // 10
  const RX0 = HALL[0], RX1 = HALL[0] + HALL[2] - 1;

  m.addProp(LAND[0] * TS, LOWY * TS - 9, PR.terraceRiser(LAND[2] * TS, 'cool'), LOWY * TS - 1);

  /* ---- three cauldrons along the working wall ---- */
  m.cauldrons = [];
  [[5, FY0 + 1], [11, FY0 + 1], [17, FY0 + 1]].forEach(([cx, cy], i) => {
    m.props.push({ x: cx * TS - 12, y: cy * TS - 22, img: ART.cauldron[0].canvas,
                   sy: cy * TS + 20, anim: 'cauldron', shadow: [15] });
    m.blockRect(cx, cy, 2, 1);
    m.addLight(cx * TS + 8, cy * TS + 8, 46, '#ff9c30', 0.7, 1, 0.85);
    m.cauldrons.push({ tx: cx, ty: cy, id: i, busy: 0, recipe: null });
    m.interact.push({ x: cx * TS - 10, y: cy * TS, w: TS * 3, h: TS * 2,
                      type: 'cauldron', id: i, label: 'Temper Chocolate' });
  });

  /* ---- conching machines on the landing ---- */
  m.conches = [];
  [[9, LOWY + 2], [17, LOWY + 2]].forEach(([cx, cy], i) => {
    m.props.push({ x: cx * TS - 9, y: cy * TS - 18, img: ART.conche[0].canvas,
                   sy: cy * TS + 18, anim: 'conche', shadow: [13] });
    m.blockRect(cx, cy, 2, 1);
    m.addLight(cx * TS + 8, cy * TS, 30, '#ffb84a', 0.38, 0, 0.55);
    m.conches.push({ id: i, recipe: null, t: 0, dur: 0, qty: 0 });
    m.interact.push({ x: cx * TS - 10, y: cy * TS - 6, w: TS * 3, h: TS * 2,
                      type: 'conche', id: i, label: 'Conching Machine' });
  });

  /* ---- shelves and benches against the walls ---- */
  for (const sx of [4, 9, 15, 20])
    m.addProp(sx * TS, HALL[1] * TS + 6, ART.shelf[sx % 3], FY0 * TS - 1);
  m.addProp(12 * TS, HALL[1] * TS + 4, ART.wallCabinet, FY0 * TS - 2);
  for (const [bx, by] of [[8, FY0 + 3], [13, FY0 + 3]]) {
    m.addProp(bx * TS, by * TS - 10, ART.counter[1], by * TS + 16, [15]);
    m.blockRect(bx, by, 2, 1);
  }
  m.interact.push({ x: 8 * TS, y: (FY0 + 3) * TS, w: TS * 7, h: TS * 2,
                    type: 'recipeBook', label: 'Recipe Book' });

  /* ---- the alcove is the still-room ---- */
  m.addProp(ALCOVE[0] * TS, (ALCOVE[1] + 3) * TS - 4, ART.barrel, (ALCOVE[1] + 3) * TS + 14, [7]);
  m.block(ALCOVE[0], ALCOVE[1] + 3);
  m.addProp((ALCOVE[0] + 2) * TS, (ALCOVE[1] + 4) * TS, ART.crate, (ALCOVE[1] + 4) * TS + 14, [7]);
  m.block(ALCOVE[0] + 2, ALCOVE[1] + 4);
  m.addLight((ALCOVE[0] + 2) * TS, (ALCOVE[1] + 3) * TS, 34, '#a394ee', 0.4, 1, 0.55);

  for (const [px2, py2] of [[RX0, FY0], [RX1 - 1, FY0]]) {
    m.addProp(px2 * TS, py2 * TS - 14, PR.pottedPlant(px2), py2 * TS + 14, [8]);
    m.block(px2, py2);
  }
  for (const [lx, ly] of [[LAND[0], LOWY + 2], [LAND[0] + LAND[2] - 1, LOWY + 2]]) {
    m.addProp(lx * TS, ly * TS - 14, ART.candelabra[0].canvas, ly * TS + 12);
    m.props[m.props.length - 1].anim = 'candelabra';
    m.addLight(lx * TS + 7, ly * TS - 10, 34, '#ffd066', 0.45, 1, 0.6);
    m.block(lx, ly);
  }

  m.addProp(13 * TS, (LOWY + LAND[3] - 1) * TS - 30, PR.innerDoor('SHOP'),
            (LOWY + LAND[3] - 1) * TS + 8);
  m.warps.push({ x: 13 * TS, y: (LOWY + LAND[3] - 1) * TS, w: TS * 3, h: TS,
                 to: 'shop', spawn: true, label: 'Back to the Shop' });

  m.spawn = { x: 14 * TS, y: (LOWY + 1) * TS };
  m.bounds = { x0: 0, y0: 0, x1: W * TS, y1: H * TS };
  m.props.sort((a, b) => a.sy - b.sy);
  return m;
}

/* ================================================================== *
 * HOLLOW GROVE — foraging + combat
 * ================================================================== */
export function buildGrove() {
  const W = 76, H = 52;
  const m = new GameMap('grove', W, H, { base: 'snow', name: 'The Hollow Grove' });
  m.ambient = { key: 'night', amount: 0.30, tint: '#3a52ff', bloom: 0.62, vignetteAmt: 0.06 };

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
    const dense = edge || hash2(i, 13, 5) < 0.86;
    if (!dense) continue;
    if (m.ground[m.idx(tx, ty)] === 'path' && !edge) continue;
    const roll = hash2(i, 14, 6);
    let img;
    if (roll < 0.72) img = ART.pine[(hash2(i, 15, 7) * ART.pine.length) | 0];
    else if (roll < 0.86) img = ART.bare[(hash2(i, 16, 8) * 4) | 0];
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
