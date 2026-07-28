// HUD and all interface panels.

import { VW, VH } from './engine/core.js';
import { drawText, textWidth, wrapText, panel, slot, slot as slot_, bar } from './art/font.js';
import { RAMP, C, mix } from './art/palette.js';
import { INGREDIENTS, INGREDIENT_ORDER, RECIPES, recipeById, VENDORS } from './data.js';
import { itemDef, RARITY, OFFHANDS } from './gear.js';

const R = RAMP;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export class UI {
  constructor(game) {
    this.game = game;
    this.mode = null;
    this.ctx = {};
    this.hot = null;
    this.sel = 0;
    this.craft = null;
    this.toolIdx = 0;
  }

  open(mode, ctx = {}) { this.mode = mode; this.ctx = ctx; this.sel = 0; if (mode === 'craft') this.craft = null; }
  close() { this.mode = null; this.ctx = {}; this.craft = null; }
  toggle(mode) { if (this.mode === mode) this.close(); else this.open(mode); }

  /* ================================================================ */
  update(dt, inp) {
    const G = this.game;
    if (this.mode === 'craft' && this.craft && this.craft.running) {
      const c = this.craft;
      c.pos += c.dir * dt * c.speed;
      if (c.pos > 1) { c.pos = 1; c.dir = -1; c.passes++; }
      if (c.pos < 0) { c.pos = 0; c.dir = 1; c.passes++; }
      if (c.passes > 5) { this.resolveCraft(0); }
      if (inp.mouse.pressed || inp.wasPressed(' ', 'Enter')) {
        const d = Math.abs(c.pos - c.target);
        const q = d < c.perfect ? 2 : d < c.good ? 1 : 0;
        this.resolveCraft(q);
      }
    }
    if (this.mode === 'dayEnd' && (inp.wasPressed('Enter', ' ', 'Escape') || inp.mouse.pressed)) this.close();
    if (this.mode === 'dialogue' && inp.wasPressed('Enter', 'e', ' ', 'Escape')) this.close();
  }

  resolveCraft(q) {
    const c = this.craft;
    this.craft = null;
    this.game.doCraft(c.recipe, q);
    if (q === 2) this.game.notify('Perfect temper! ★★');
    else if (q === 1) this.game.notify('Good temper. ★');
    this.close();
  }

  /* ================================================================ *
   * HUD
   * ================================================================ */
  render(g) {
    const G = this.game;
    this.hot = null;

    this.drawClock(g);
    this.drawVitals(g);
    this.drawHotbar(g);
    if (G.mapId === 'shop') this.drawShopStatus(g);
    if (G.mapId === 'grove' && G.boss.active && !G.boss.dead) this.drawBossBar(g);
    this.drawPrompt(g);
    this.drawToast(g);

    switch (this.mode) {
      case 'inventory': this.panelInventory(g); break;
      case 'recipes': this.panelRecipes(g); break;
      case 'craft': this.panelCraft(g); break;
      case 'stock': this.panelStock(g); break;
      case 'dialogue': this.panelDialogue(g); break;
      case 'dayEnd': this.panelDayEnd(g); break;
      case 'journal': this.panelJournal(g); break;
      case 'menu': this.panelMenu(g); break;
      case 'gear': this.panelGear(g); break;
      case 'vendor': this.panelVendor(g); break;
      case 'conche': this.panelConche(g); break;
    }
  }

  /* ---------------- clock ---------------- */
  drawClock(g) {
    const G = this.game;
    const w = 104, h = 58, x = VW - w - 6, y = 6;
    const inner = panel(g, x, y, w, h, 'wood');

    const dayName = DAYS[(G.day - 1) % 7];
    drawText(g, `${dayName}. ${G.season} ${G.day}`, x + w / 2, y + 10, { color: C.textGold, align: 'center' });

    // dial
    const cx = x + 26, cy = y + 36;
    g.fillStyle = '#0b0710';
    g.beginPath(); g.arc(cx, cy, 15, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#241729';
    g.beginPath(); g.arc(cx, cy, 13, 0, Math.PI * 2); g.fill();
    // day arc fill (6am -> 2am = 20h)
    const prog = Math.max(0, Math.min(1, (G.minutes - 6 * 60) / (20 * 60)));
    g.strokeStyle = prog > 0.82 ? '#c8384e' : prog > 0.6 ? '#d0a437' : '#8fc9dc';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(cx, cy, 11, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
    g.stroke();
    // hand
    const a = -Math.PI / 2 + prog * Math.PI * 2;
    g.strokeStyle = '#f2e6d0'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9); g.stroke();
    g.fillStyle = '#ffd066'; g.fillRect(cx - 1, cy - 1, 2, 2);

    drawText(g, G.clockStr, x + 68, y + 26, { color: C.text, align: 'center', scale: 1 });
    // gold
    g.drawImage(G.icons.coin, x + 48, y + 38);
    drawText(g, String(G.player.gold), x + 60, y + 40, { color: C.textGold });
  }

  /* ---------------- vitals ---------------- */
  drawVitals(g) {
    const G = this.game, p = G.player;
    const bw = 12, bh = 74, x = VW - 24, y = VH - bh - 10;
    // energy
    this.vbar(g, x, y, bw, bh, p.en / p.maxEn, '#7fe0a4', '#2a8657', '#123a2a');
    // health
    this.vbar(g, x - 16, y, bw, bh, p.hp / p.maxHp, '#e0697c', '#a3243c', '#3c1020');
    drawText(g, 'HP', x - 16 + bw / 2, y - 9, { color: '#e0697c', align: 'center' });
    drawText(g, 'EN', x + bw / 2, y - 9, { color: '#7fe0a4', align: 'center' });
  }
  vbar(g, x, y, w, h, t, ca, cb, bg) {
    g.fillStyle = '#0b0710'; g.fillRect(x - 2, y - 2, w + 4, h + 4);
    g.fillStyle = '#33202a'; g.fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle = bg; g.fillRect(x, y, w, h);
    const fh = Math.round(h * Math.max(0, Math.min(1, t)));
    g.fillStyle = cb; g.fillRect(x, y + h - fh, w, fh);
    g.fillStyle = ca; g.fillRect(x, y + h - fh, Math.max(1, w - 4), fh);
    g.fillStyle = '#ffffff33'; g.fillRect(x + 1, y + h - fh, 2, fh);
    // notches
    g.fillStyle = '#00000055';
    for (let i = 1; i < 4; i++) g.fillRect(x, y + Math.round(h * i / 4), w, 1);
  }

  /* ---------------- hotbar ---------------- */
  drawHotbar(g) {
    const G = this.game;
    const n = 8, s = 22, gap = 2;
    const totalW = n * s + (n - 1) * gap;
    const x0 = Math.round((VW - totalW) / 2), y = VH - s - 6;

    g.fillStyle = 'rgba(8,5,14,0.55)';
    g.fillRect(x0 - 5, y - 5, totalW + 10, s + 10);

    const tools = ['sword', 'shield', 'basket', 'whisk'];
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (s + gap);
      const seld = i === this.toolIdx;
      slot(g, x, y, s, seld, true);
      if (i < tools.length) {
        const ic = G.icons.tool[tools[i]];
        g.drawImage(ic, x + (s - ic.width) / 2 | 0, y + (s - ic.height) / 2 | 0);
      } else {
        const ci = i - tools.length;
        const st = G.inv.choc[ci];
        if (st) {
          const rec = recipeById(st.id);
          const ic = G.icons.choc[`${rec.kind}_${st.q}`];
          g.drawImage(ic, x + (s - ic.width) / 2 | 0, y + (s - ic.height) / 2 | 0);
          drawText(g, String(st.qty), x + s - 2, y + s - 8, { color: C.text, align: 'right' });
        }
      }
      drawText(g, String(i + 1), x + 2, y + 1, { color: '#6a5a70' });
    }
  }

  /* ---------------- shop status ---------------- */
  drawShopStatus(g) {
    const G = this.game;
    const w = 108, h = 40, x = 6, y = 6;
    panel(g, x, y, w, h, 'wood');
    drawText(g, G.shopOpen ? 'SHOP OPEN' : 'SHOP CLOSED', x + w / 2, y + 10,
      { color: G.shopOpen ? '#7fe0a4' : '#a8927c', align: 'center' });
    drawText(g, `Sales today: ${G.dayGold}g`, x + w / 2, y + 21, { color: C.textGold, align: 'center' });
    drawText(g, `Customers: ${G.customers.length}`, x + w / 2, y + 30, { color: C.textDim, align: 'center' });
  }

  drawBossBar(g) {
    const G = this.game, b = G.boss;
    const w = 220, h = 12, x = (VW - w) / 2, y = 12;
    drawText(g, 'THE HOLLOW QUEEN', VW / 2, y - 10, { color: '#ffd066', align: 'center' });
    bar(g, x, y, w, h, b.hp / b.maxHp, '#ffb84a', '#b35510', '#3c1020');
    if (b.stun > 0) drawText(g, 'STUNNED', VW / 2, y + 16, { color: '#ffd066', align: 'center' });
  }

  /* ---------------- interaction prompt ---------------- */
  drawPrompt(g) {
    const G = this.game;
    if (!G.hover || this.mode) return;
    const label = G.hover.label || 'Interact';
    const str = `[E] ${label}`;
    const w = textWidth(str) + 14;
    const x = Math.round(VW / 2 - w / 2), y = VH - 62;
    g.fillStyle = 'rgba(8,5,14,0.8)';
    g.fillRect(x, y, w, 15);
    g.fillStyle = '#d0a437';
    g.fillRect(x, y, w, 1); g.fillRect(x, y + 14, w, 1);
    drawText(g, str, x + 7, y + 4, { color: C.text });
  }

  drawToast(g) {
    const G = this.game;
    if (!G.msg || G.msgT <= 0) return;
    const a = Math.min(1, G.msgT / 0.6);
    const lines = wrapText(G.msg, 260);
    const w = Math.max(...lines.map(l => textWidth(l))) + 20;
    const h = lines.length * 10 + 12;
    const x = Math.round(VW / 2 - w / 2), y = 34;
    g.globalAlpha = a;
    g.fillStyle = 'rgba(12,8,20,0.88)';
    g.fillRect(x, y, w, h);
    g.fillStyle = '#d0a437';
    g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1);
    g.fillRect(x, y, 1, h); g.fillRect(x + w - 1, y, 1, h);
    lines.forEach((l, i) => drawText(g, l, VW / 2, y + 6 + i * 10, { color: C.text, align: 'center' }));
    g.globalAlpha = 1;
  }

  /* ================================================================ *
   * PANELS
   * ================================================================ */
  hitTest(inp, x, y, w, h) {
    const m = this.game.input.mouse;
    return m.x >= x && m.y >= y && m.x < x + w && m.y < y + h;
  }
  clicked(x, y, w, h) {
    const m = this.game.input.mouse;
    return m.pressed && m.x >= x && m.y >= y && m.x < x + w && m.y < y + h;
  }

  header(g, x, y, w, title) {
    drawText(g, title, x + w / 2, y + 10, { color: C.textGold, align: 'center', scale: 1, tracking: 2 });
    g.fillStyle = '#54380c'; g.fillRect(x + 12, y + 20, w - 24, 1);
    g.fillStyle = '#7d5514'; g.fillRect(x + 12, y + 21, w - 24, 1);
  }

  closeBtn(g, x, y) {
    const s = 11;
    const over = this.hitTest(null, x, y, s, s);
    g.fillStyle = over ? '#8c4a5a' : '#3f1a47';
    g.fillRect(x, y, s, s);
    g.fillStyle = '#0b0710'; g.fillRect(x, y, s, 1); g.fillRect(x, y + s - 1, s, 1);
    g.fillRect(x, y, 1, s); g.fillRect(x + s - 1, y, 1, s);
    drawText(g, 'x', x + 3, y + 2, { color: C.text });
    if (this.clicked(x, y, s, s)) this.close();
  }

  /* ---------------- inventory ---------------- */
  panelInventory(g) {
    const G = this.game;
    const w = 300, h = 156, x = (VW - w) / 2, y = (VH - h) / 2;
    const I = panel(g, x, y, w, h, 'wood');
    this.header(g, x, y, w, 'SATCHEL');
    this.closeBtn(g, x + w - 18, y + 6);

    drawText(g, 'INGREDIENTS', x + 18, y + 28, { color: C.textDim });
    const s = 24, cols = 5;
    INGREDIENT_ORDER.forEach((id, i) => {
      const cx = x + 18 + (i % cols) * (s + 4);
      const cy = y + 40 + Math.floor(i / cols) * (s + 4);
      const qty = G.inv.ing[id] || 0;
      slot(g, cx, cy, s, false, qty === 0);
      const ic = G.icons.ing[id];
      g.globalAlpha = qty ? 1 : 0.25;
      g.drawImage(ic, cx + 5, cy + 5);
      g.globalAlpha = 1;
      if (qty) drawText(g, String(qty), cx + s - 2, cy + s - 9, { color: C.text, align: 'right' });
      if (this.hitTest(null, cx, cy, s, s)) this.tip = { name: INGREDIENTS[id].name, desc: INGREDIENTS[id].desc, price: INGREDIENTS[id].price };
    });

    g.fillStyle = '#54380c'; g.fillRect(x + 150, y + 26, 1, 74);
    drawText(g, 'CHOCOLATES', x + 158, y + 28, { color: C.textDim });
    G.inv.choc.slice(0, 12).forEach((st, i) => {
      const cx = x + 158 + (i % 5) * (s + 4);
      const cy = y + 40 + Math.floor(i / 5) * (s + 4);
      slot(g, cx, cy, s, false, false);
      const rec = recipeById(st.id);
      g.drawImage(G.icons.choc[`${rec.kind}_${st.q}`], cx + 5, cy + 5);
      drawText(g, String(st.qty), cx + s - 2, cy + s - 9, { color: C.text, align: 'right' });
      if (this.hitTest(null, cx, cy, s, s)) this.tip = { name: rec.name + (st.q ? ' ' + '★'.repeat(st.q) : ''), desc: rec.desc, price: Math.round(rec.base * (1 + st.q * 0.35)) };
    });
    if (!G.inv.choc.length) drawText(g, 'nothing made yet', x + 158, y + 44, { color: '#6a5a70' });

    // tooltip strip
    g.fillStyle = '#160e1e'; g.fillRect(x + 12, y + h - 40, w - 24, 28);
    g.fillStyle = '#3a2536'; g.fillRect(x + 12, y + h - 40, w - 24, 1);
    if (this.tip) {
      drawText(g, this.tip.name, x + 18, y + h - 35, { color: C.textGold });
      drawText(g, this.tip.desc, x + 18, y + h - 24, { color: C.textDim });
      drawText(g, this.tip.price + 'g', x + w - 18, y + h - 35, { color: C.textGold, align: 'right' });
    }
    this.tip = null;
  }

  /* ---------------- recipe book ---------------- */
  panelRecipes(g) {
    const G = this.game;
    const w = 330, h = 208, x = (VW - w) / 2, y = (VH - h) / 2;
    panel(g, x, y, w, h, 'parchment');
    drawText(g, 'RECIPE BOOK', x + w / 2, y + 10, { color: '#4a2d0e', align: 'center', tracking: 2, shadow: null });
    g.fillStyle = '#8a6a3c'; g.fillRect(x + 12, y + 20, w - 24, 1);
    this.closeBtn(g, x + w - 18, y + 6);

    const list = RECIPES;
    const rowH = 17;
    list.forEach((rec, i) => {
      const ry = y + 26 + i * rowH;
      if (ry > y + h - 26) return;
      const known = G.unlocked.has(rec.id);
      const can = known && G.canCraft(rec);
      const over = this.hitTest(null, x + 12, ry, w - 24, rowH - 2);
      if (over) { g.fillStyle = 'rgba(90,60,20,0.16)'; g.fillRect(x + 12, ry, w - 24, rowH - 2); }
      const ic = G.icons.choc[`${rec.kind}_${rec.star || 0}`];
      g.globalAlpha = known ? 1 : 0.28;
      g.drawImage(ic, x + 16, ry + 2);
      const col = !known ? '#8a7a5c' : can ? '#2d4a1e' : '#6a4a30';
      drawText(g, known ? rec.name : '? ? ?', x + 34, ry + 3, { color: col, shadow: null });
      if (known) {
        drawText(g, rec.base + 'g', x + w - 16, ry + 3, { color: '#7a5a24', align: 'right', shadow: null });
        // ingredient chips
        let cx = x + 158;
        for (const k in rec.need) {
          const have = (G.inv.ing[k] || 0) >= rec.need[k];
          g.globalAlpha = have ? 1 : 0.35;
          g.drawImage(G.icons.ing[k], cx, ry + 1);
          g.globalAlpha = 1;
          drawText(g, 'x' + rec.need[k], cx + 12, ry + 5, { color: have ? '#2d4a1e' : '#8a3a3a', shadow: null });
          cx += 26;
        }
        if (rec.star) drawText(g, '★'.repeat(rec.star), x + 130, ry + 3, { color: '#a8791a', shadow: null });
      }
      g.globalAlpha = 1;
    });
    drawText(g, 'Stand at a cauldron and press E to temper.', x + w / 2, y + h - 15,
      { color: '#7a5a3c', align: 'center', shadow: null });
  }

  /* ---------------- crafting / tempering ---------------- */
  panelCraft(g) {
    const G = this.game;
    const w = 280, h = 176, x = (VW - w) / 2, y = (VH - h) / 2;
    panel(g, x, y, w, h, 'wood');
    this.closeBtn(g, x + w - 18, y + 6);

    if (!this.craft) {
      this.header(g, x, y, w, 'CHOOSE A RECIPE');
      const known = RECIPES.filter(r => G.unlocked.has(r.id));
      known.forEach((rec, i) => {
        const ry = y + 28 + i * 19;
        if (ry > y + h - 22) return;
        const can = G.canCraft(rec);
        const over = this.hitTest(null, x + 12, ry, w - 24, 17);
        if (over) { g.fillStyle = 'rgba(208,164,55,0.14)'; g.fillRect(x + 12, ry, w - 24, 17); }
        g.globalAlpha = can ? 1 : 0.4;
        g.drawImage(G.icons.choc[`${rec.kind}_0`], x + 16, ry + 1);
        drawText(g, rec.name, x + 34, ry + 3, { color: can ? C.text : '#7a6a70' });
        let cx = x + 138;
        for (const k in rec.need) {
          const have = (G.inv.ing[k] || 0) >= rec.need[k];
          g.globalAlpha = have ? 1 : 0.3;
          g.drawImage(G.icons.ing[k], cx, ry + 1);
          g.globalAlpha = 1;
          drawText(g, String(rec.need[k]), cx + 12, ry + 5, { color: have ? C.textDim : '#c8384e' });
          cx += 24;
        }
        g.globalAlpha = 1;
        if (can && this.clicked(x + 12, ry, w - 24, 17)) {
          this.craft = { recipe: rec, pos: 0, dir: 1, speed: 0.85 + (rec.star || 0) * 0.22,
                         target: 0.35 + Math.random() * 0.3, perfect: 0.045, good: 0.11, passes: 0, running: true };
        }
      });
      if (!known.length) drawText(g, 'no recipes yet', x + w / 2, y + 60, { color: C.textDim, align: 'center' });
      return;
    }

    /* tempering minigame */
    const c = this.craft;
    this.header(g, x, y, w, 'TEMPERING — ' + c.recipe.name.toUpperCase());
    const tw = w - 48, tx = x + 24, ty = y + 62;

    // track
    g.fillStyle = '#0b0710'; g.fillRect(tx - 2, ty - 2, tw + 4, 18);
    g.fillStyle = '#2a1830'; g.fillRect(tx, ty, tw, 14);
    // gradient of temperature
    for (let i = 0; i < tw; i++) {
      const t = i / tw;
      g.fillStyle = mix('#2a4a8c', '#b35510', t);
      g.globalAlpha = 0.5;
      g.fillRect(tx + i, ty, 1, 14);
    }
    g.globalAlpha = 1;
    // good / perfect zones
    const gx = tx + (c.target - c.good) * tw, gw = c.good * 2 * tw;
    g.fillStyle = 'rgba(72,180,119,0.55)'; g.fillRect(gx, ty, gw, 14);
    const px = tx + (c.target - c.perfect) * tw, pw = c.perfect * 2 * tw;
    g.fillStyle = 'rgba(240,204,106,0.9)'; g.fillRect(px, ty, pw, 14);
    // needle
    const nx = Math.round(tx + c.pos * tw);
    g.fillStyle = '#ffffff'; g.fillRect(nx - 1, ty - 5, 3, 24);
    g.fillStyle = '#c8384e'; g.fillRect(nx, ty - 5, 1, 24);

    drawText(g, 'CLICK when the needle hits the gold', x + w / 2, y + 90, { color: C.textDim, align: 'center' });
    drawText(g, `Passes left: ${Math.max(0, 6 - c.passes)}`, x + w / 2, y + 104, { color: C.text, align: 'center' });

    // cauldron preview
    const ic = G.icons.choc[`${c.recipe.kind}_0`];
    g.drawImage(ic, x + w / 2 - 7, y + 118);
    drawText(g, c.recipe.desc, x + w / 2, y + h - 22, { color: C.textDim, align: 'center' });
  }

  /* ---------------- stock a counter ---------------- */
  panelStock(g) {
    const G = this.game;
    const c = this.ctx.counter;
    const w = 280, h = 168, x = (VW - w) / 2, y = (VH - h) / 2;
    panel(g, x, y, w, h, 'wood');
    this.header(g, x, y, w, 'DISPLAY COUNTER');
    this.closeBtn(g, x + w - 18, y + 6);

    // current
    drawText(g, 'On display:', x + 16, y + 28, { color: C.textDim });
    if (c.item) {
      g.drawImage(G.icons.choc[`${c.item.kind}_${c.quality || 0}`], x + 92, y + 25);
      drawText(g, `${c.item.name} x${c.qty}`, x + 110, y + 28, { color: C.text });
      // price control
      drawText(g, 'Price:', x + 16, y + 44, { color: C.textDim });
      const bx = x + 60;
      for (const [dx2, delta, lab] of [[0, -10, '<<'], [16, -1, '<'], [58, 1, '>'], [70, 10, '>>']]) {
        const over = this.hitTest(null, bx + dx2, y + 42, 12, 11);
        g.fillStyle = over ? '#7d5514' : '#3f1a47';
        g.fillRect(bx + dx2, y + 42, 12, 11);
        drawText(g, lab, bx + dx2 + 6, y + 44, { color: C.text, align: 'center' });
        if (this.clicked(bx + dx2, y + 42, 12, 11)) c.price = Math.max(1, c.price + delta);
      }
      drawText(g, c.price + 'g', bx + 42, y + 44, { color: C.textGold, align: 'center' });
      const fair = Math.round(c.item.base * (1 + (c.quality || 0) * 0.35));
      const ratio = c.price / fair;
      const verdict = ratio < 0.75 ? ['a steal', '#7fe0a4'] : ratio < 1.1 ? ['fair', '#f2e6d0'] :
                      ratio < 1.5 ? ['pricey', '#f0cc6a'] : ['outrageous', '#c8384e'];
      drawText(g, `market ${fair}g — ${verdict[0]}`, x + 150, y + 44, { color: verdict[1] });

      const over = this.hitTest(null, x + 16, y + 58, 60, 12);
      g.fillStyle = over ? '#8c4a5a' : '#3f1a47'; g.fillRect(x + 16, y + 58, 60, 12);
      drawText(g, 'CLEAR', x + 46, y + 61, { color: C.text, align: 'center' });
      if (this.clicked(x + 16, y + 58, 60, 12)) {
        // return stock
        if (c.qty > 0) {
          let s = G.inv.choc.find(s2 => s2.id === c.item.id && s2.q === (c.quality || 0));
          if (!s) { s = { id: c.item.id, q: c.quality || 0, qty: 0 }; G.inv.choc.push(s); }
          s.qty += c.qty;
        }
        c.item = null; c.qty = 0;
      }
    } else {
      drawText(g, 'empty', x + 92, y + 28, { color: '#6a5a70' });
    }

    g.fillStyle = '#54380c'; g.fillRect(x + 12, y + 76, w - 24, 1);
    drawText(g, 'YOUR STOCK — click to place', x + w / 2, y + 82, { color: C.textDim, align: 'center' });

    G.inv.choc.slice(0, 14).forEach((st, i) => {
      const cx = x + 20 + (i % 7) * 34, cy = y + 96 + Math.floor(i / 7) * 30;
      const over = this.hitTest(null, cx, cy, 26, 26);
      slot(g, cx, cy, 26, over, false);
      const rec = recipeById(st.id);
      g.drawImage(G.icons.choc[`${rec.kind}_${st.q}`], cx + 6, cy + 6);
      drawText(g, String(st.qty), cx + 24, cy + 17, { color: C.text, align: 'right' });
      if (this.clicked(cx, cy, 26, 26)) {
        // clear existing first
        if (c.item) {
          let s = G.inv.choc.find(s2 => s2.id === c.item.id && s2.q === (c.quality || 0));
          if (!s) { s = { id: c.item.id, q: c.quality || 0, qty: 0 }; G.inv.choc.push(s); }
          s.qty += c.qty;
        }
        const take = Math.min(c.max, st.qty);
        st.qty -= take;
        c.item = rec; c.quality = st.q; c.qty = take;
        c.price = Math.round(rec.base * (1 + st.q * 0.35));
        G.inv.choc = G.inv.choc.filter(s2 => s2.qty > 0);
        G.sfx('place');
      }
    });
    if (!G.inv.choc.length) drawText(g, 'make some chocolate in the kitchen first', x + w / 2, y + 110, { color: '#6a5a70', align: 'center' });
  }

  /* ---------------- dialogue ---------------- */
  panelDialogue(g) {
    const G = this.game;
    const npc = this.ctx.npc;
    const w = 330, h = 74, x = (VW - w) / 2, y = VH - h - 40;
    panel(g, x, y, w, h, 'wood');
    // portrait
    const pf = npc.art.walk[0][0];
    g.fillStyle = '#160e1e'; g.fillRect(x + 12, y + 12, 34, 46);
    g.save(); g.imageSmoothingEnabled = false;
    g.drawImage(pf, 0, 0, pf.width, pf.height, x + 12, y + 8, pf.width * 1.7, pf.height * 1.7);
    g.restore();
    g.fillStyle = '#0b0710';
    g.fillRect(x + 12, y + 54, 34, 4);

    drawText(g, npc.def.name, x + 54, y + 14, { color: C.textGold });
    // hearts
    for (let i = 0; i < 5; i++)
      drawText(g, '♥', x + 108 + i * 8, y + 14,
               { color: i < (npc.hearts || 0) ? '#c66a7c' : '#3a2536' });

    // warmer people say warmer things
    const pool = (npc.hearts >= 4 && npc.def.close) ? npc.def.close
               : (npc.hearts >= 2 && npc.def.warm) ? npc.def.warm
               : npc.def.lines;
    const line = pool[npc.lineIdx % pool.length];
    const lines = wrapText(line, w - 74);
    lines.forEach((l, i) => drawText(g, l, x + 54, y + 28 + i * 11, { color: C.text }));

    // gift row
    const gifted = npc.giftedDay === G.day;
    drawText(g, gifted ? 'already gifted today' : 'give a gift:', x + 54, y + h - 26,
             { color: gifted ? '#6a5a70' : C.textDim });
    if (!gifted) {
      G.inv.choc.slice(0, 6).forEach((st, i) => {
        const bx = x + 120 + i * 22, by = y + h - 30;
        const over = this.hitTest(null, bx, by, 20, 20);
        slot_(g, bx, by, 20, over, false);
        const rec = recipeById(st.id);
        g.drawImage(G.icons.choc[`${rec.kind}_${st.q}`], bx + 3, by + 3);
        if (over) {
          const liked = npc.def.likes.includes(rec.id);
          drawText(g, rec.name + (liked ? ' ♥' : ''), x + 54, y + h - 15,
                   { color: liked ? '#c66a7c' : C.textDim });
        }
        if (this.clicked(bx, by, 20, 20)) { G.giveGift(npc, st); this.close(); }
      });
    }
    drawText(g, '[E] leave', x + w - 16, y + h - 14, { color: C.textDim, align: 'right' });
    if (!this.ctx.advanced) { npc.lineIdx++; this.ctx.advanced = true; }
  }

  /* ---------------- day summary ---------------- */
  panelDayEnd(g) {
    const G = this.game;
    const w = 240, h = 140, x = (VW - w) / 2, y = (VH - h) / 2;
    g.fillStyle = 'rgba(4,4,12,0.7)'; g.fillRect(0, 0, VW, VH);
    panel(g, x, y, w, h, 'wood');
    this.header(g, x, y, w, `DAY ${G.day - 1} COMPLETE`);
    drawText(g, `Earned today: ${G.lastDayGold || G.dayGold}g`, x + w / 2, y + 40, { color: C.textGold, align: 'center' });
    drawText(g, `Total gold: ${G.player.gold}g`, x + w / 2, y + 54, { color: C.text, align: 'center' });
    drawText(g, `Chocolates sold: ${G.totalSales}`, x + w / 2, y + 68, { color: C.text, align: 'center' });
    const tip = wrapText('The lamps relight themselves at dawn. So do you.', w - 40);
    tip.forEach((l, i) => drawText(g, l, x + w / 2, y + 90 + i * 11, { color: C.textDim, align: 'center' }));
    drawText(g, '[ENTER]', x + w / 2, y + h - 20, { color: C.textGold, align: 'center' });
  }

  /* ---------------- journal ---------------- */
  panelJournal(g) {
    const G = this.game;
    const w = 250, h = 160, x = (VW - w) / 2, y = (VH - h) / 2;
    panel(g, x, y, w, h, 'parchment');
    drawText(g, 'JOURNAL', x + w / 2, y + 10, { color: '#4a2d0e', align: 'center', tracking: 2, shadow: null });
    g.fillStyle = '#8a6a3c'; g.fillRect(x + 12, y + 20, w - 24, 1);
    this.closeBtn(g, x + w - 18, y + 6);
    const rows = [
      ['Day', String(G.day)],
      ['Gold', G.player.gold + 'g'],
      ['Chocolates sold', String(G.totalSales)],
      ['Recipes known', `${G.unlocked.size} / ${RECIPES.length}`],
      ['Hollow Queen', G.bossDefeated ? 'defeated' : 'stirring in the grove'],
    ];
    rows.forEach(([k, v], i) => {
      drawText(g, k, x + 20, y + 32 + i * 14, { color: '#6a4a30', shadow: null });
      drawText(g, v, x + w - 20, y + 32 + i * 14, { color: '#2d1a10', align: 'right', shadow: null });
    });
    const t = wrapText('"They never left. They just wanted someone to open the shop again."', w - 40);
    t.forEach((l, i) => drawText(g, l, x + w / 2, y + h - 40 + i * 11, { color: '#7a5a3c', align: 'center', shadow: null }));
  }

  /* ---------------- conching machine ---------------- */
  panelConche(g) {
    const G = this.game;
    const c = G.conches()[this.ctx.conche || 0];
    const w = 280, h = 170, x = (VW - w) / 2, y = (VH - h) / 2;
    panel(g, x, y, w, h, 'wood');
    this.header(g, x, y, w, 'CONCHING MACHINE');
    this.closeBtn(g, x + w - 18, y + 6);

    if (!c) return;
    if (c.recipe) {
      drawText(g, 'Grinding: ' + c.recipe.name, x + w / 2, y + 34, { color: C.text, align: 'center' });
      g.drawImage(G.icons.choc[`${c.recipe.kind}_0`], x + w / 2 - 7, y + 48);
      bar(g, x + 30, y + 74, w - 60, 12, c.t / c.dur, '#f0a52a', '#a53025', '#3c1020');
      drawText(g, `${Math.round(100 * c.t / c.dur)}%  —  ${c.qty} on the way`,
               x + w / 2, y + 92, { color: C.textGold, align: 'center' });
      const t = wrapText('It runs on its own. Go forage, go fight — it will be done when you get back.', w - 40);
      t.forEach((l, i) => drawText(g, l, x + w / 2, y + 112 + i * 11, { color: C.textDim, align: 'center' }));
      return;
    }

    const t = wrapText('Slower and plainer than tempering by hand — but it needs none of your attention, and it makes far more.', w - 36);
    t.forEach((l, i) => drawText(g, l, x + w / 2, y + 26 + i * 10, { color: C.textDim, align: 'center' }));

    const known = RECIPES.filter(r => G.unlocked.has(r.id));
    known.forEach((rec, i) => {
      const ry = y + 56 + i * 17;
      if (ry > y + h - 22) return;
      const can = G.canCraft(rec);
      const over = this.hitTest(null, x + 14, ry, w - 28, 15);
      if (over && can) { g.fillStyle = 'rgba(208,164,55,0.14)'; g.fillRect(x + 14, ry, w - 28, 15); }
      g.globalAlpha = can ? 1 : 0.4;
      g.drawImage(G.icons.choc[`${rec.kind}_0`], x + 18, ry + 1);
      drawText(g, rec.name, x + 36, ry + 3, { color: can ? C.text : '#7a6a70' });
      drawText(g, `${8 + (rec.star || 0) * 2} per batch`, x + w - 20, ry + 3,
               { color: C.textDim, align: 'right' });
      g.globalAlpha = 1;
      if (can && this.clicked(x + 14, ry, w - 28, 15)) {
        G.startConche(this.ctx.conche || 0, rec);
        this.close();
      }
    });
  }

  /* ---------------- vendor ---------------- */
  panelVendor(g) {
    const G = this.game;
    const v = VENDORS[this.ctx.vendorId] || VENDORS.dairy;
    const w = 260, h = 150, x = (VW - w) / 2, y = (VH - h) / 2;
    panel(g, x, y, w, h, 'wood');
    this.header(g, x, y, w, v.name.toUpperCase());
    this.closeBtn(g, x + w - 18, y + 6);
    drawText(g, v.line, x + w / 2, y + 26, { color: C.textDim, align: 'center' });

    v.stock.forEach((entry, i) => {
      const ing = INGREDIENTS[entry.id];
      const price = Math.round(ing.price * entry.markup);
      const ry = y + 42 + i * 22;
      const afford = G.player.gold >= price;
      const over = this.hitTest(null, x + 14, ry, w - 28, 20);
      g.fillStyle = over && afford ? '#4a3320' : '#241729';
      g.fillRect(x + 14, ry, w - 28, 20);
      g.drawImage(G.icons.ing[entry.id], x + 18, ry + 3);
      drawText(g, ing.name, x + 36, ry + 6, { color: afford ? C.text : '#7a6a70' });
      drawText(g, 'have ' + (G.inv.ing[entry.id] || 0), x + 150, ry + 6, { color: C.textDim });
      drawText(g, price + 'g', x + w - 20, ry + 6,
               { color: afford ? C.textGold : '#c8384e', align: 'right' });
      if (afford && this.clicked(x + 14, ry, w - 28, 20)) G.buyIngredient(this.ctx.vendorId, entry);
    });

    g.drawImage(G.icons.coin, x + 16, y + h - 22);
    drawText(g, String(G.player.gold) + 'g', x + 30, y + h - 20, { color: C.textGold });
    drawText(g, 'click to buy one', x + w - 16, y + h - 20, { color: C.textDim, align: 'right' });
  }

  /* ---------------- equipment ---------------- */
  panelGear(g) {
    const G = this.game, L = G.player.loadout;
    const w = 340, h = 200, x = (VW - w) / 2, y = (VH - h) / 2;
    panel(g, x, y, w, h, 'wood');
    this.header(g, x, y, w, 'EQUIPMENT');
    this.closeBtn(g, x + w - 18, y + 6);

    const SLOTS = [['weapon', 'MAIN HAND'], ['offhand', 'OFF HAND'], ['ranged', 'RANGED']];
    let colX = x + 14;
    let detail = null;

    for (const [slot, label] of SLOTS) {
      drawText(g, label, colX, y + 26, { color: C.textDim });
      // equipped
      const eq = L[slot];
      const eqDef = eq ? itemDef(slot, eq.id) : null;
      slot_(g, colX, y + 36, 28, true, !eqDef);
      if (eqDef) {
        const ic = G.icons.tool[eqDef.icon];
        g.drawImage(ic, colX + 7, y + 43);
        g.fillStyle = RARITY[eq.rarity].col;
        g.fillRect(colX, y + 36, 28, 1);
      }
      // owned list for this slot
      const owned = L.forSlot(slot);
      owned.forEach((o, i) => {
        const bx = colX, by = y + 72 + i * 20;
        if (by > y + h - 34) return;
        const on = eq && eq.id === o.id;
        const over = this.hitTest(null, bx, by, 100, 18);
        g.fillStyle = on ? '#4a3320' : over ? '#3a2536' : '#241729';
        g.fillRect(bx, by, 100, 18);
        g.fillStyle = RARITY[o.rarity].col;
        g.fillRect(bx, by, 2, 18);
        const d = itemDef(slot, o.id);
        const ic = G.icons.tool[d.icon];
        g.drawImage(ic, bx + 4, by + 2);
        drawText(g, d.name.length > 13 ? d.name.slice(0, 12) + '.' : d.name,
                 bx + 21, by + 6, { color: on ? C.textGold : C.text });
        if (over) detail = { d, r: o.rarity, slot };
        if (this.clicked(bx, by, 100, 18)) {
          L.equip(slot, o.id, o.rarity);
          G.sfx('place');
        }
      });
      colX += 108;
    }

    // detail strip
    g.fillStyle = '#160e1e'; g.fillRect(x + 12, y + h - 30, w - 24, 20);
    g.fillStyle = '#3a2536'; g.fillRect(x + 12, y + h - 30, w - 24, 1);
    if (detail) {
      drawText(g, `${RARITY[detail.r].name} ${detail.d.name}`, x + 18, y + h - 26,
               { color: RARITY[detail.r].col });
      drawText(g, detail.d.desc, x + 18, y + h - 17, { color: C.textDim });
    } else {
      const od = L.def('offhand');
      drawText(g, od ? od.desc : '', x + 18, y + h - 22, { color: C.textDim });
    }
  }

  /* ---------------- menu ---------------- */
  panelMenu(g) {
    const G = this.game;
    g.fillStyle = 'rgba(4,4,12,0.72)'; g.fillRect(0, 0, VW, VH);
    const w = 180, h = 130, x = (VW - w) / 2, y = (VH - h) / 2;
    panel(g, x, y, w, h, 'wood');
    this.header(g, x, y, w, 'PAUSED');
    const items = [
      ['Resume', () => this.close()],
      ['Satchel', () => this.open('inventory')],
      ['Recipe Book', () => this.open('recipes')],
      ['Journal', () => this.open('journal')],
      ['Sleep until dawn', () => { this.close(); G.lastDayGold = G.dayGold; G.advanceDay(); }],
    ];
    items.forEach(([label, fn], i) => {
      const by = y + 30 + i * 18;
      const over = this.hitTest(null, x + 18, by, w - 36, 15);
      g.fillStyle = over ? '#5e3a3e' : '#2b1b28';
      g.fillRect(x + 18, by, w - 36, 15);
      g.fillStyle = over ? '#d0a437' : '#3a2536';
      g.fillRect(x + 18, by, w - 36, 1);
      drawText(g, label, x + w / 2, by + 4, { color: over ? C.textGold : C.text, align: 'center' });
      if (this.clicked(x + 18, by, w - 36, 15)) fn();
    });
  }
}
