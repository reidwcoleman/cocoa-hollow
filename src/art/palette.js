// Cocoa Hollow — master palette.
// A moonlit gothic-cozy set: cold indigo/violet night, blue-white snow,
// warm amber lamplight, rich cocoa browns, pale spectral cyan.
// Every ramp goes darkest -> lightest so shading code can index consistently.

/* Ramps below are sampled from reference winter-town / moonlit-forest pixel art
 * rather than invented, which is why the snow is periwinkle with saturated
 * blue shadows and the paving is *lighter* than the snow, not darker. */
export const RAMP = {
  // --- night & sky ---
  void:    ['#050212', '#0a0620', '#120c32', '#1a1245', '#241a5c'],
  night:   ['#020044', '#0c2bc3', '#1f0a9f', '#2836d6', '#4050d7'],
  violet:  ['#1f0a4a', '#341570', '#4a2496', '#6039bd', '#7f57dd'],
  moon:    ['#4f77eb', '#8fa6ff', '#b1adfe', '#d8d6fb', '#ffffff'],

  // --- snow & stone ---
  snow:    ['#3a44c0', '#6082ff', '#96a8ff', '#c9c7ff', '#e6e8ff'],
  stone:   ['#3f4a92', '#5f6fc4', '#8290e2', '#a7b0f2', '#cdd2ff'],
  // paving is brighter than the snow it sits in — pale periwinkle flags
  pave:    ['#7c86d8', '#a3aaf0', '#c4c6fb', '#d8daff', '#eef1ff'],
  brick:   ['#3b1f3f', '#5a2f52', '#7a4468', '#9a5c80', '#b87a9c'],
  // building facades read dark violet under bright blue roof planes
  masonry: ['#0d0023', '#1f155d', '#382c70', '#4d4071', '#634d7e'],
  // snow lying on a roof picks up more lavender than snow on the ground
  snowRoof:['#7da8ff', '#a1bbff', '#c7b7ff', '#d2c4ff', '#e6ddff'],
  lampPost:['#06210f', '#0f3a1c', '#236a2f', '#009769', '#48d49a'],
  slate:   ['#181546', '#241d68', '#33298c', '#4438ad', '#5a4dcc'],

  // --- wood & interior ---
  wood:    ['#241009', '#3e1e17', '#4a251b', '#622d1f', '#8c4521'],
  oak:     ['#331818', '#572a1e', '#70391b', '#9e5b37', '#c16d43'],
  floor:   ['#2a1116', '#42201f', '#5a2c26', '#743c31', '#8f5340'],

  // --- chocolate ---
  cocoa:   ['#1d0f0c', '#301813', '#46241a', '#5e3324', '#7a4630'],
  milk:    ['#3c2116', '#5a3220', '#7b482c', '#9c633e', '#bf8354'],
  white:   ['#6b4f34', '#8d6c48', '#b08f63', '#d1b48a', '#eddbb6'],
  ruby:    ['#3c1020', '#5a1a30', '#7d2842', '#a33c58', '#c85a73'],
  caramel: ['#4a2510', '#6e3a17', '#94551f', '#bb7430', '#dd9c4c'],

  // --- light & fire ---
  ember:   ['#5a1b06', '#a53025', '#c85f1d', '#f0a52a', '#ffd85a'],
  lamp:    ['#7a3a08', '#c85f1d', '#f0a52a', '#faea61', '#fff8b0'],
  flame:   ['#8a2408', '#c85f1d', '#f0a52a', '#faea61', '#fff8b0'],

  // --- spectral ---
  ghost:   ['#1e4e86', '#2b7bf4', '#52a5f3', '#a8d8ff', '#ffffff'],
  wisp:    ['#3a2a6a', '#54409c', '#7460cc', '#a394ee', '#dcd4ff'],
  toxic:   ['#123a2a', '#1c5c3f', '#2a8657', '#48b477', '#7fe0a4'],

  // --- flora ---
  pine:    ['#00062f', '#001a4d', '#003b73', '#1e7ab3', '#52a5f3'],
  // a mintier conifer so a stand of trees isn't all one hue
  pineB:   ['#022630', '#054a52', '#0d7a78', '#2ba79b', '#5fd0bd'],
  pineC:   ['#0a1140', '#152a7a', '#2749b8', '#4f7bea', '#8fb0ff'],
  bark:    ['#1e1020', '#3a2020', '#5a3324', '#7c4a2c', '#a06a3e'],
  leaf:    ['#062b3a', '#0d4a5e', '#166f84', '#2b96b0', '#57bcd0'],

  // --- flesh ---
  skinA:   ['#4a2a26', '#6e433a', '#94614f', '#bb8468', '#dcab8a'],
  skinB:   ['#3a2018', '#543224', '#734935', '#916148', '#b3805f'],
  skinC:   ['#5a3520', '#7d4e2e', '#a06b41', '#c08e5c', '#dbb183'],

  // --- fabric ---
  plum:    ['#0b0c89', '#1e41d3', '#4575ff', '#759eff', '#c7b7ff'],
  teal:    ['#04303a', '#0a5560', '#107a86', '#2ba0aa', '#4fc6ce'],
  rose:    ['#3d1524', '#5c2135', '#803049', '#a4475f', '#c66a7c'],
  gold:    ['#54380c', '#7d5514', '#a87a20', '#d0a437', '#f0cc6a'],
  cream:   ['#6b5a4a', '#8f7a64', '#b39c82', '#d4c1a6', '#f2e6d0'],
  ink:     ['#08040f', '#12061e', '#1c0f30', '#2a1a48', '#3d2a64'],
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
