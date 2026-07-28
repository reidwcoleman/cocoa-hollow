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
    PR.pineTree(0.95, true, 1, 'pine'),  PR.pineTree(1.20, true, 2, 'pineB'),
    PR.pineTree(0.75, true, 3, 'pineC'), PR.pineTree(1.05, true, 4, 'pine'),
    PR.pineTree(0.62, true, 5, 'pineB'), PR.pineTree(1.35, true, 6, 'pineC'),
    PR.pineTree(0.88, true, 7, 'pineB'), PR.pineTree(1.12, true, 8, 'pine'),
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
    PR.shopfront({ w: 128, sign: 'BAKERY',     roof: 'roofSlate', stone: 'river', trim: 'wood', seed: 5,  chimneyX: 0.18 }),
    PR.shopfront({ w: 112, sign: 'APOTHECARY', roof: 'teal',      stone: 'river', trim: 'oak',  seed: 11, chimneyX: 0.78, signCol: '#4fc6ce' }),
    PR.shopfront({ w: 136, sign: 'THE ANVIL',  roof: 'plum',      stone: 'river', trim: 'wood', seed: 17, chimneyX: 0.24, signCol: '#f0a52a' }),
  ];
  ART.roomFrame = {};
  ART.wallCabinet = PR.wallCabinet(3);
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
  const W = 84, H = 62;
  const m = new GameMap('town', W, H, { base: 'snow', name: 'Hollow Square' });

  // deep snow everywhere, cobbled plaza in the middle
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const n = fnoise(x / 9, y / 9, 3);
      m.set(x, y, n > 0.63 ? 'snow' : 'snow');
    }

  // plaza — a compact square, deliberately small so snow and props frame it
  const pcx = 41, pcy = 35, prx = 9, pry = 6;
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
  {
    const shW = Math.round(cs.canvas.width * 1.1), shH = Math.round(cs.canvas.height * 0.4);
    m.decals.push({ x: csx - Math.round(cs.canvas.width * 0.12),
                    y: csy + cs.groundY - Math.round(shH * 0.55),
                    img: PR.castShadow(shW, shH) });
  }
  m.addProp(csx, csy, cs.canvas, csy + cs.groundY);
  for (const [lx, ly, lr] of cs.lights) m.addLight(csx + lx, csy + ly, lr, '#ffcf70', 0.55, 1, 0.68);
  for (const [sx, sy] of cs.smokes) m.smokes.push([csx + sx, csy + sy]);
  // collision: whole footprint except the doorway
  const cbx = Math.floor(csx / TS), cby = Math.floor((csy + 30) / TS);
  const cbw = Math.ceil(cs.canvas.width / TS), cbh = Math.ceil((cs.groundY - 30) / TS);
  m.blockRect(cbx, cby, cbw, cbh);
  m.reserve(Math.floor(csx / TS) - 1, Math.floor(csy / TS) - 1,
            Math.ceil(cs.canvas.width / TS) + 2, Math.ceil(cs.canvas.height / TS) + 2);
  const doorTX = 41, doorTY = Math.floor((csy + cs.groundY) / TS);
  m.block(doorTX - 1, doorTY - 1, 0); m.block(doorTX, doorTY - 1, 0); m.block(doorTX + 1, doorTY - 1, 0);
  m.warps.push({ x: (doorTX - 1) * TS, y: (doorTY - 1) * TS, w: TS * 3, h: TS,
                 to: 'shop', spawn: true, label: 'Enter the Shop' });
  // shop-front snow shoveled
  for (let y = doorTY - 1; y < doorTY + 3; y++) for (let x = doorTX - 4; x <= doorTX + 4; x++) m.set(x, y, 'cobbleBare');

  /* ---- shopfronts facing the square ---- */
  const shopSpots = [[18, 17, 0], [50, 16, 1], [12, 45, 2]];
  for (const [tx, ty, si] of shopSpots) {
    const sf = ART.shopfronts[si];
    const sx = tx * TS, sy = ty * TS;
    const shW = Math.round(sf.canvas.width * 1.12), shH = Math.round(sf.canvas.height * 0.4);
    m.decals.push({ x: sx - Math.round(sf.canvas.width * 0.2),
                    y: sy + sf.groundY - Math.round(shH * 0.42),
                    img: PR.castShadow(shW, shH) });
    m.addProp(sx, sy, sf.canvas, sy + sf.groundY);
    for (const [lx, ly, lr, lit] of sf.lights)
      if (lit) m.addLight(sx + lx, sy + ly, lr, '#ffcf70', 0.55, 1, 0.7);
    for (const [smx, smy] of sf.smokes) m.smokes.push([sx + smx, sy + smy]);
    const bw = Math.ceil(sf.canvas.width / TS);
    const bh = Math.max(2, Math.ceil((sf.canvas.height - sf.groundY + 40) / TS));
    m.blockRect(tx, ty + Math.floor(sf.groundY / TS) - bh, bw, bh);
    m.reserve(tx - 1, ty - 1, bw + 2, Math.ceil(sf.canvas.height / TS) + 2);
    // swept threshold
    const dtx = tx + Math.floor(bw / 2), dty = ty + Math.floor(sf.groundY / TS);
    for (let y = dty; y < dty + 2; y++) for (let x = dtx - 3; x <= dtx + 3; x++) m.set(x, y, 'cobble');
  }

  /* ---- townhouses — pulled in tight around the square ---- */
  const houseSpots = [
    [22, 22, 0], [53, 21, 1], [17, 33, 2], [58, 32, 3], [26, 44, 4],
    [50, 45, 5], [12, 24, 3], [66, 24, 4], [31, 15, 1], [62, 43, 2],
    [10, 43, 5], [70, 36, 0], [36, 12, 4], [46, 12, 3],
  ];
  for (const [tx, ty, hi] of houseSpots) {
    const hs = ART.houses[hi % ART.houses.length];
    const hx = tx * TS, hy = ty * TS;
    const shW = Math.round(hs.canvas.width * 1.15), shH = Math.round(hs.canvas.height * 0.46);
    m.decals.push({ x: hx - Math.round(hs.canvas.width * 0.22),
                    y: hy + hs.groundY - Math.round(shH * 0.42),
                    img: PR.castShadow(shW, shH) });
    m.addProp(hx, hy, hs.canvas, hy + hs.groundY);
    for (const [lx, ly, lr, lit] of hs.lights) if (lit) m.addLight(hx + lx, hy + ly, lr, '#ffc95e', 0.5, 1, 0.6);
    for (const [sx, sy] of hs.smokes) m.smokes.push([hx + sx, hy + sy]);
    const bw = Math.ceil(hs.canvas.width / TS);
    const fullH = Math.ceil(hs.canvas.height / TS);
    const bh = Math.max(2, Math.ceil((hs.canvas.height - hs.groundY + 34) / TS));
    m.blockRect(tx, ty + Math.floor(hs.groundY / TS) - bh, bw, bh);
    m.reserve(tx - 1, ty - 1, bw + 2, fullH + 2);
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
  const stalls = [[33, 30, 'ruby'], [46, 30, 'teal'], [33, 40, 'gold'], [46, 40, 'plum']];
  for (const [sx, sy, hue] of stalls) {
    const img = PR.marketStall(sx, hue);
    const X = sx * TS - 6, Y = sy * TS - 30;
    m.addProp(X, Y, img, sy * TS + 14, [17]);
    m.blockRect(sx, sy, 3, 1);
    m.addLight(sx * TS + 22, sy * TS - 2, 40, '#ffc06a', 0.45, 1, 0.6);
  }
  const benches = [[37, 31], [44, 31], [37, 40], [44, 40], [41, 29], [41, 42]];
  for (const [bx, by] of benches) {
    m.addProp(bx * TS, by * TS - 6, PR.bench(), by * TS + 14, [13]);
    m.blockRect(bx, by, 2, 1);
  }
  for (const [wx, wy] of [[30, 33], [52, 37]]) {
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

  /* ---- fences and planters lining the square ---- */
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const fx2 = Math.round(pcx + Math.cos(a) * (prx + 1.6));
    const fy2 = Math.round(pcy + Math.sin(a) * (pry + 1.4));
    if (!m.inb(fx2, fy2) || m.isSolid(fx2, fy2) || m.noTree[m.idx(fx2, fy2)]) continue;
    if (Math.abs(fx2 - 41) < 4) continue;                       // leave the roads open
    if (Math.abs(fy2 - 34) < 4 && (fx2 < 8 || fx2 > 72)) continue;
    if (hash2(i, 7, 3) > 0.45) {
      m.addProp(fx2 * TS - 8, fy2 * TS - 8, ART.fencePanel[i % 3], fy2 * TS + 12, [13]);
      m.blockRect(fx2, fy2, 2, 1);
    } else {
      m.addProp(fx2 * TS - 5, fy2 * TS - 10, ART.planter[i % 3], fy2 * TS + 12, [11]);
      m.block(fx2, fy2);
    }
  }

  /* ---- lamp posts ---- */
  const lamps = [[31, 26], [51, 26], [31, 44], [51, 44], [41, 24], [41, 46],
                 [26, 35], [56, 35], [12, 34], [72, 34], [41, 14], [41, 56],
                 [34, 28], [48, 28], [34, 42], [48, 42], [22, 30], [60, 30],
                 [22, 40], [60, 40], [41, 20], [41, 50]];
  for (const [lx, ly] of lamps) {
    const X = lx * TS, Y = ly * TS - 40;
    m.addProp(X, Y, ART.lamp.canvas, Y + 54, [6]);
    m.addLight(X + ART.lamp.light[0], Y + ART.lamp.light[1], ART.lamp.light[2], '#ffc75e', 0.42, 1, 0.62);
    m.block(lx, ly, 1);
  }

  /* ---- trees, bushes, fences ---- */
  for (let i = 0; i < 340; i++) {
    const tx = ((hash2(i, 1, 3) * W) | 0), ty = ((hash2(i, 2, 4) * H) | 0);
    if (tx < 2 || ty < 2 || tx > W - 3 || ty > H - 3) continue;
    if (m.ground[m.idx(tx, ty)] !== 'snow') continue;
    if (m.isSolid(tx, ty) || m.noTree[m.idx(tx, ty)]) continue;
    // keep the square itself clear, but let trees crowd right up to its rim
    const dxp = (tx - 41) / 11, dyp = (ty - 35) / 8;
    if (dxp * dxp + dyp * dyp < 1) continue;
    const roll = hash2(i, 3, 5);
    if (roll < 0.55) {
      const img = ART.pine[(hash2(i, 4, 6) * ART.pine.length) | 0];
      m.addProp(tx * TS - ((img.width - TS) >> 1), ty * TS - img.height + TS, img, ty * TS + TS, [Math.round(img.width * 0.28)]);
      m.block(tx, ty);
    } else if (roll < 0.72) {
      const img = ART.bare[(hash2(i, 5, 7) * 4) | 0];
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

  /* ---- vendors: the dairy and the exchange ---- */
  m.interact.push({ x: 33 * TS, y: 30 * TS, w: TS * 3, h: TS * 2,
                    type: 'vendor', vendorId: 'dairy', label: "Poppy's Dairy" });
  m.interact.push({ x: 46 * TS, y: 30 * TS, w: TS * 3, h: TS * 2,
                    type: 'vendor', vendorId: 'general', label: 'The Hollow Exchange' });

  /* ---- street clutter away from the square ---- */
  for (let i = 0; i < 34; i++) {
    const tx = 4 + ((hash2(i, 61, 3) * (W - 8)) | 0);
    const ty = 6 + ((hash2(i, 62, 4) * (H - 12)) | 0);
    if (!m.inb(tx, ty) || m.isSolid(tx, ty) || m.noTree[m.idx(tx, ty)]) continue;
    const dxp = (tx - 41) / 12, dyp = (ty - 35) / 9;
    if (dxp * dxp + dyp * dyp < 1) continue;
    const roll = hash2(i, 63, 5);
    if (roll < 0.3) {
      m.addProp(tx * TS - 8, ty * TS - 8, ART.fencePanel[i % 3], ty * TS + 12, [13]);
      m.blockRect(tx, ty, 2, 1);
    } else if (roll < 0.55) {
      m.addProp(tx * TS - 5, ty * TS - 10, ART.planter[i % 3], ty * TS + 12, [11]);
      m.block(tx, ty);
    } else if (roll < 0.72) {
      m.addProp(tx * TS, ty * TS - 4, ART.barrel, ty * TS + 14, [7]);
      m.block(tx, ty);
    } else if (roll < 0.86) {
      m.addProp(tx * TS, ty * TS, ART.crate, ty * TS + 14, [7]);
      m.block(tx, ty);
    } else {
      m.addProp(tx * TS - 6, ty * TS - 6, PR.bench(), ty * TS + 14, [13]);
      m.blockRect(tx, ty, 2, 1);
    }
  }

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
  m.ambient = { key: 'night', amount: 0.30, tint: '#6a4438', bloom: 0.55, vignetteAmt: 0.16 };

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
                 to: 'town', tx: 41 * TS, ty: 0, label: 'Step Outside', anchorTown: true });
  m.warps.push({ x: RX0 * TS, y: FY0 * TS, w: TS * 2, h: TS * 2,
                 to: 'kitchen', spawn: true, label: 'The Kitchen' });
  m.interact.push({ x: 24 * TS, y: (LOWY + 2) * TS, w: TS * 2, h: TS * 2,
                    type: 'openSign', label: 'Open / Close Shop' });

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
  m.ambient = { key: 'deep', amount: 0.40, tint: '#4a2f56', bloom: 0.6, vignetteAmt: 0.18 };

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
  m.ambient = { key: 'night', amount: 0.44, tint: '#2b3f86', bloom: 0.75, vignetteAmt: 0.40 };

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
  for (let i = 0; i < 780; i++) {
    const tx = ((hash2(i, 11, 3) * W) | 0), ty = ((hash2(i, 12, 4) * H) | 0);
    if (!m.inb(tx, ty) || m.isSolid(tx, ty)) continue;
    const edge = tx < 5 || ty < 4 || tx > W - 6 || ty > H - 5;
    const dense = edge || hash2(i, 13, 5) < 0.72;
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
