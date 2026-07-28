// Item, recipe, and character data.

export const INGREDIENTS = {
  cocoaPod:   { name: 'Cocoa Pod',    price: 18, desc: 'A ripe pod from the hollow groves.' },
  sugar:      { name: 'Sugar',        price: 8,  desc: 'Fine white crystals.' },
  milk:       { name: 'Milk',         price: 12, desc: 'Fresh from the town dairy.' },
  cream:      { name: 'Cream',        price: 20, desc: 'Thick and rich.' },
  moonberry:  { name: 'Moonberry',    price: 32, desc: 'Only ripens under a full moon.' },
  gloomcap:   { name: 'Gloomcap',     price: 26, desc: 'A mushroom that hums faintly.' },
  frostmint:  { name: 'Frostmint',    price: 22, desc: 'Cold to the touch. Always.' },
  emberspice: { name: 'Emberspice',   price: 30, desc: 'Warms the throat on the way down.' },
  spiritSalt: { name: 'Spirit Salt',  price: 44, desc: 'Harvested where the veil is thin.' },
  honey:      { name: 'Hollow Honey', price: 38, desc: 'The Queen guards this jealously.' },
};

export const INGREDIENT_ORDER = Object.keys(INGREDIENTS);

// kind indexes map to chocolateIcon() styles 0..4
export const RECIPES = [
  { id: 'darkTruffle', name: 'Dark Truffle',     kind: 0, base: 45,
    need: { cocoaPod: 2, sugar: 1 }, unlocked: true,
    desc: 'Bittersweet, dense, and a little brooding.' },
  { id: 'milkSquare',  name: 'Milk Square',      kind: 1, base: 40,
    need: { cocoaPod: 1, milk: 1, sugar: 1 }, unlocked: true,
    desc: 'The one everybody in town already loves.' },
  { id: 'moonBonbon',  name: 'Moon Bonbon',      kind: 2, base: 95,
    need: { cocoaPod: 1, cream: 1, moonberry: 1 }, unlocked: false, star: 1,
    desc: 'Pale as the moon. Tastes like a cold clear night.' },
  { id: 'rubyHeart',   name: 'Ruby Heart',       kind: 3, base: 120,
    need: { cocoaPod: 2, cream: 1, moonberry: 2 }, unlocked: false, star: 1,
    desc: 'Given, never sold. Except here.' },
  { id: 'emberCaramel',name: 'Ember Caramel',    kind: 4, base: 110,
    need: { sugar: 2, cream: 1, emberspice: 1 }, unlocked: false, star: 1,
    desc: 'A slow heat that follows you home.' },
  { id: 'gloomGanache',name: 'Gloom Ganache',    kind: 0, base: 150,
    need: { cocoaPod: 3, cream: 1, gloomcap: 2 }, unlocked: false, star: 2,
    desc: 'The ghosts fight over these.' },
  { id: 'frostShell',  name: 'Frost Shell',      kind: 2, base: 165,
    need: { cocoaPod: 2, frostmint: 2, sugar: 1 }, unlocked: false, star: 2,
    desc: 'Cracks like ice, melts like snow.' },
  { id: 'spiritPrali', name: 'Spirit Praline',   kind: 1, base: 240,
    need: { cocoaPod: 3, honey: 1, spiritSalt: 1 }, unlocked: false, star: 3,
    desc: 'They say it lets you hear the old voices.' },
  { id: 'hollowRoyale',name: 'Hollow Royale',    kind: 3, base: 380,
    need: { cocoaPod: 4, honey: 2, spiritSalt: 1, moonberry: 2 }, unlocked: false, star: 3,
    desc: 'The masterpiece. Worthy of the Queen herself.' },
];

export function recipeById(id) { return RECIPES.find(r => r.id === id); }

/* ------------------------------------------------------------------ */
export const NPCS = [
  { id: 'marlow', name: 'Marlow', spec: { skin: 'skinB', hair: 'ink', hairStyle: 'short', shirt: 'teal', pants: 'ink', shoe: 'wood' },
    home: [24, 30], likes: ['darkTruffle', 'gloomGanache'],
    warm: ["You again. Good. The square's better with the lamps lit.",
           "I kept one of your truffles a whole week. Then I didn't."],
    close: ["Come by the river some evening. I'll show you where the lamps used to go.",
            "You've made this a place people walk to on purpose. That's not nothing."],
    lines: [
      "The lamps go out one by one down by the river. Nobody ever relights them.",
      "You bought the old castle? Brave. Or maybe just cold.",
      "If you get anything with a bite to it, I'll pay well.",
    ] },
  { id: 'ines', name: 'Ines', spec: { skin: 'skinC', hair: 'ruby', hairStyle: 'long', shirt: 'rose', pants: 'plum', shoe: 'wood' },
    home: [44, 26], likes: ['rubyHeart', 'moonBonbon'],
    warm: ["My grandmother would have liked what you've done with the place.",
           "I tell everyone about the shop. Everyone."],
    close: ["I saved the ribbon from the first box you sold me. Don't laugh.",
            "Whatever you're making next — put my name on one."],
    lines: [
      "You can smell the cocoa all the way to the square now. It's lovely.",
      "My grandmother worked in that castle. She said the staff never left.",
      "Something sweet, please. It's been a long winter.",
    ] },
  { id: 'oberon', name: 'Oberon', spec: { skin: 'skinA', hair: 'moon', hairStyle: 'wild', shirt: 'plum', pants: 'ink', shoe: 'ink', cape: 'plum' },
    home: [60, 34], likes: ['spiritPrali', 'hollowRoyale'],
    warm: ["The grove's quieter since you started going in. Interesting.",
           "You carry salt now. Good. You were going to learn that the hard way."],
    close: ["The old voices have stopped asking after the castle. They're satisfied.",
            "I'd wondered who the shop was waiting for. Now I don't."],
    lines: [
      "The veil is thinnest at the grove. Take salt. Take a shield.",
      "Ghosts are just people who forgot to stop working.",
      "Bring me something that tastes like a memory.",
    ] },
  { id: 'poppy', name: 'Poppy', spec: { skin: 'skinA', hair: 'lamp', hairStyle: 'bun', shirt: 'toxic', pants: 'oak', shoe: 'wood', apron: 'cream' },
    home: [36, 44], likes: ['milkSquare', 'frostShell'],
    warm: ["Cream's on the house today. Don't argue with me.",
           "The dairy's busier since you opened. Funny how that works."],
    close: ["Come for supper. Bring nothing. I mean it — nothing.",
            "You're the best thing to happen to this square in thirty years."],
    lines: [
      "I run the dairy. Cream's yours whenever you need it, chocolatier.",
      "The bees in the grove got big. Real big. Don't go alone.",
      "Milk Squares! Everyone wants Milk Squares.",
    ] },
  { id: 'tamsin', name: 'Tamsin', spec: { skin: 'skinB', hair: 'teal', hairStyle: 'long', shirt: 'gold', pants: 'wood', shoe: 'ink', hat: 'plum' },
    home: [52, 40], likes: ['emberCaramel', 'hollowRoyale'],
    warm: ["Your ledger's the only cheerful column I keep.",
           "Raise your prices. I've seen what they'll pay."],
    close: ["I've stopped auditing you. Take that as the compliment it is.",
            "Whatever you need financed — say the word."],
    lines: [
      "I keep the ledger for the whole square. Your shop's the talk of it.",
      "Price things too low and they'll think it's cursed. Trust me.",
      "Warm me up. Something with fire in it.",
    ] },
];

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ *
 * Town vendors — the gold sink
 * ------------------------------------------------------------------ */
export const VENDORS = {
  dairy: {
    name: "Poppy's Dairy", keeper: 'Poppy',
    line: 'Fresh this morning. Mostly.',
    stock: [
      { id: 'milk', markup: 1.4 },
      { id: 'cream', markup: 1.4 },
      { id: 'sugar', markup: 1.5 },
    ],
  },
  general: {
    name: 'The Hollow Exchange', keeper: 'Tamsin',
    line: 'Everything has a price. Yours is on the tag.',
    stock: [
      { id: 'cocoaPod', markup: 1.7 },
      { id: 'emberspice', markup: 1.9 },
      { id: 'frostmint', markup: 1.9 },
      { id: 'spiritSalt', markup: 2.2 },
    ],
  },
};

export const GHOST_NAMES = ['Bess', 'Corvin', 'Mim', 'Otto', 'Sable', 'Wick'];

export const TIPS = [
  'Hold SHIFT to raise your shield. A blocked hit stuns the enemy.',
  'Ingredients grow in the Hollow Grove. Head east from the square.',
  'Press C in the castle kitchen to open the recipe book.',
  'Stock your counters before you open the shop, or nobody buys anything.',
  'Ghosts restock counters for you while the shop is open.',
  'Higher-star chocolates sell for far more — and draw bigger crowds.',
];
