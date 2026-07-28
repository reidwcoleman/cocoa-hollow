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
  moon:    ['#1f24e4', '#6a6ff7', '#9f90f6', '#c9c5f3', '#f7f7f7'],

  // --- snow & stone ---
  snow:    ['#2a00ba', '#1c18f7', '#6469f7', '#aea9f7', '#d4d7f7'],
  stone:   ['#202e8b', '#394dba', '#5c6ed7', '#8691e6', '#b2b9f2'],
  // paving is brighter than the snow it sits in — pale periwinkle flags
  pave:    ['#525fcb', '#7c85e2', '#a4a6ec', '#bcbff0', '#d9ddf0'],
  // the lower carriageway sits a clear step darker than the upper walk,
  // so two adjacent paved strips never read as one poured sheet
  paveLow: ['#2c388e', '#4250b2', '#5b67cb', '#767fda', '#939be4'],
  brick:   ['#38163c', '#56234d', '#753460', '#944975', '#b1668f'],
  // building facades read dark violet under bright blue roof planes
  masonry: ['#0c0021', '#0f0358', '#281a6a', '#41316b', '#583e78'],
  // snow lying on a roof picks up more lavender than snow on the ground
  snowRoof:['#3f7af2', '#7195f2', '#a58ff2', '#b4a1f2', '#d0c3f2'],
  lampPost:['#06210f', '#0f3a1c', '#236a2f', '#009769', '#48d49a'],
  // shop roofs sit lighter and cooler than house roofs
  roofSlate:['#0026c6', '#0c47f0', '#4687f0', '#7f9ff0', '#b5c5f0'],
  // warm olive river-rock for gable ends, against the cold roof
  river:   ['#282113', '#433723', '#59492c', '#756139', '#95804f'],
  // interior room frame moulding, and the black it floats on
  frameWood:['#120200', '#20010a', '#4b1700', '#6e2700', '#974400'],
  roomBrick:['#150409', '#310707', '#5b000b', '#7a0000', '#9c1100'],
  boards:  ['#2a0600', '#3f0c01', '#551804', '#6d240a', '#863511'],
  slate:   ['#181546', '#241d68', '#33298c', '#4438ad', '#5a4dcc'],

  // --- wood & interior ---
  wood:    ['#240b02', '#3e160d', '#4a1c0f', '#62200e', '#8c3306'],
  oak:     ['#331212', '#572011', '#702d08', '#9e4c20', '#c15b27'],
  floor:   ['#2a0910', '#421615', '#5a1e16', '#742b1d', '#8f4128'],

  // --- chocolate ---
  cocoa:   ['#1d0f0c', '#301813', '#46241a', '#5e3324', '#7a4630'],
  milk:    ['#3c2116', '#5a3220', '#7b482c', '#9c633e', '#bf8354'],
  white:   ['#6b4f34', '#8d6c48', '#b08f63', '#d1b48a', '#eddbb6'],
  ruby:    ['#3c0b1d', '#5a122b', '#7d1e3b', '#a3304f', '#c84d69'],
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
  pine:    ['#0b002f', '#00004d', '#001c73', '#0f5eb3', '#4291f3'],
  // a mintier conifer so a stand of trees isn't all one hue
  pineB:   ['#003641', '#00646a', '#00928d', '#1cbaa7', '#5fdac3'],
  pineC:   ['#110051', '#190090', '#0d04c7', '#3b51e1', '#8ca0eb'],
  // a frosted conifer that reads almost white against the snow
  pineD:   ['#130061', '#100097', '#2629c2', '#6a7ed7', '#b7c3e0'],
  bark:    ['#1e1020', '#3a2020', '#5a3324', '#7c4a2c', '#a06a3e'],
  leaf:    ['#062b3a', '#0d4a5e', '#166f84', '#2b96b0', '#57bcd0'],

  // --- flesh ---
  skinA:   ['#4a2a26', '#6e433a', '#94614f', '#bb8468', '#dcab8a'],
  skinB:   ['#3a2018', '#543224', '#734935', '#916148', '#b3805f'],
  skinC:   ['#5a3520', '#7d4e2e', '#a06b41', '#c08e5c', '#dbb183'],

  // --- fabric ---
  plum:    ['#000189', '#032bd3', '#2960ff', '#608fff', '#bfacff'],
  teal:    ['#002f3a', '#005460', '#007886', '#189eaa', '#3cc5ce'],
  rose:    ['#3d0f20', '#5c182f', '#802441', '#a43955', '#c65c71'],
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

/* Ambient light per time-of-day. The lighting pass MULTIPLIES by these, so a
 * tint whose blue channel is low crushes blue out of the whole frame and turns
 * shadow into black. Keeping blue pegged near 255 and carrying the darkening
 * in red and green is what keeps night saturated blue instead of grey. */
export const AMBIENT = {
  dawn:  { tint: '#8a72ff', amt: 0.42, warm: '#8a6a80' },
  day:   { tint: '#c4c6ff', amt: 0.20, warm: '#9a96b8' },
  dusk:  { tint: '#7a4aff', amt: 0.54, warm: '#9c5a6a' },
  night: { tint: '#3a4aff', amt: 0.74, warm: '#2a3a70' },
  deep:  { tint: '#2634f5', amt: 0.82, warm: '#22285c' },
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
