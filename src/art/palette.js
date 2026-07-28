// Cocoa Hollow — master palette.
// A moonlit gothic-cozy set: cold indigo/violet night, blue-white snow,
// warm amber lamplight, rich cocoa browns, pale spectral cyan.
// Every ramp goes darkest -> lightest so shading code can index consistently.

export const RAMP = {
  // --- night & sky ---
  void:    ['#05050c', '#0a0a16', '#10101f', '#171729', '#1f1f36'],
  night:   ['#12122a', '#1b1b3a', '#25254e', '#323265', '#41417e'],
  violet:  ['#241435', '#35204d', '#4a2d68', '#5f3b83', '#7a4fa4'],
  moon:    ['#5c6ba8', '#8a97cf', '#b8c2ec', '#dfe4fa', '#ffffff'],

  // --- snow & stone ---
  snow:    ['#7986ae', '#9aa6cc', '#bcc6e6', '#dbe2f6', '#f6f9ff'],
  stone:   ['#38384f', '#4b4b68', '#63637f', '#7e7e9c', '#9e9eba'],
  // ground paving — deliberately darker/warmer than `stone` so snow reads bright
  pave:    ['#37304a', '#4e4660', '#635873', '#786c8a', '#8f83a2'],
  brick:   ['#3c2f43', '#513e59', '#67506f', '#7f6488', '#9a82a2'],
  slate:   ['#232338', '#31314c', '#414162', '#53537a', '#68689a'],

  // --- wood & interior ---
  wood:    ['#241318', '#3a2026', '#512d33', '#6b3f41', '#8a5751'],
  oak:     ['#2e1d13', '#48301d', '#63452a', '#82603c', '#a67e53'],
  floor:   ['#33202a', '#4a303c', '#5f4050', '#775468', '#8e6a80'],

  // --- chocolate ---
  cocoa:   ['#1d0f0c', '#301813', '#46241a', '#5e3324', '#7a4630'],
  milk:    ['#3c2116', '#5a3220', '#7b482c', '#9c633e', '#bf8354'],
  white:   ['#6b4f34', '#8d6c48', '#b08f63', '#d1b48a', '#eddbb6'],
  ruby:    ['#3c1020', '#5a1a30', '#7d2842', '#a33c58', '#c85a73'],
  caramel: ['#4a2510', '#6e3a17', '#94551f', '#bb7430', '#dd9c4c'],

  // --- light & fire ---
  ember:   ['#4a1a06', '#7d3208', '#b35510', '#e0871f', '#ffc35a'],
  lamp:    ['#7a4a0e', '#b8761a', '#e8a832', '#ffd066', '#fff0bb'],
  flame:   ['#8a2408', '#c74a10', '#f08326', '#ffbb50', '#fff2b0'],

  // --- spectral ---
  ghost:   ['#2b4a5e', '#3f6d86', '#5c98b3', '#8fc9dc', '#d6f4ff'],
  wisp:    ['#3a2a6a', '#54409c', '#7460cc', '#a394ee', '#dcd4ff'],
  toxic:   ['#123a2a', '#1c5c3f', '#2a8657', '#48b477', '#7fe0a4'],

  // --- flora ---
  pine:    ['#163429', '#204a3a', '#2c6650', '#3b8468', '#51a383'],
  bark:    ['#241a14', '#372a20', '#4d3a2c', '#65503c', '#806753'],
  leaf:    ['#22412a', '#2e5a35', '#3e7844', '#519b55', '#6cbe6c'],

  // --- flesh ---
  skinA:   ['#4a2a26', '#6e433a', '#94614f', '#bb8468', '#dcab8a'],
  skinB:   ['#3a2018', '#543224', '#734935', '#916148', '#b3805f'],
  skinC:   ['#5a3520', '#7d4e2e', '#a06b41', '#c08e5c', '#dbb183'],

  // --- fabric ---
  plum:    ['#2a1030', '#3f1a47', '#571f5f', '#70307a', '#8c4a95'],
  teal:    ['#0e2a30', '#153f47', '#1e5a63', '#2a7d84', '#3fa5a8'],
  rose:    ['#3d1524', '#5c2135', '#803049', '#a4475f', '#c66a7c'],
  gold:    ['#54380c', '#7d5514', '#a87a20', '#d0a437', '#f0cc6a'],
  cream:   ['#6b5a4a', '#8f7a64', '#b39c82', '#d4c1a6', '#f2e6d0'],
  ink:     ['#0d0d16', '#16162a', '#22223e', '#303055', '#42426f'],
};

// Flat named colors for UI / effects.
export const C = {
  clear:      'rgba(0,0,0,0)',
  black:      '#05050c',
  white:      '#ffffff',

  // UI wood frame (the ornate panel look)
  uiEdgeDark: '#1a0f16',
  uiEdge:     '#33202a',
  uiWoodD:    '#452a30',
  uiWood:     '#5e3a3e',
  uiWoodL:    '#7d5150',
  uiWoodHi:   '#9a6a63',
  uiFill:     '#2b1b28',
  uiFillHi:   '#3a2536',
  uiGold:     '#d0a437',
  uiGoldHi:   '#f0cc6a',
  uiGoldDk:   '#7d5514',

  text:       '#f2e6d0',
  textDim:    '#a8927c',
  textDark:   '#2a1a20',
  textGold:   '#ffd066',
  textGhost:  '#d6f4ff',

  hpRed:      '#c8384e',
  hpRedDk:    '#5e1626',
  enRed:      '#3fa5a8',
  enGreen:    '#48b477',
  enGreenDk:  '#123a2a',
  mana:       '#7460cc',
};

// Ambient light colors per time-of-day key (used by the lighting pass).
export const AMBIENT = {
  dawn:  { tint: '#5a4f8c', amt: 0.52, warm: '#8a6a80' },
  day:   { tint: '#8f96c8', amt: 0.26, warm: '#9a96b8' },
  dusk:  { tint: '#4a3168', amt: 0.66, warm: '#9c5a6a' },
  night: { tint: '#1a2258', amt: 0.84, warm: '#2a3a70' },
  deep:  { tint: '#121846', amt: 0.90, warm: '#22285c' },
};

/** hex -> {r,g,b} */
export function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Mix two hex colors, t in 0..1 */
export function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  const r = Math.round(A.r + (B.r - A.r) * t);
  const g = Math.round(A.g + (B.g - A.g) * t);
  const bl = Math.round(A.b + (B.b - A.b) * t);
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
}

/** Shift a ramp lookup safely. */
export function ramp(name, i) {
  const r = RAMP[name];
  if (!r) throw new Error('no ramp ' + name);
  return r[Math.max(0, Math.min(r.length - 1, i | 0))];
}
