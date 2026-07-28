# Cocoa Hollow

A moonlit pixel-art shop RPG: forage and fight for ingredients in a snowbound
forest, temper them into chocolate in a haunted castle kitchen, then open the
doors and let your ghost staff work the counters.

Runs in the browser. No build step, no dependencies, no image or audio files —
every sprite, tile, font glyph and sound effect is generated in code at load.

```
python3 server.py 4780      # then open http://127.0.0.1:4780/
```

## Playing

| | |
|---|---|
| `WASD` / arrows | move |
| `Space` or click | swing |
| right-click / `F` | loose an arrow (with a bow equipped) |
| `Shift` | raise guard |
| `E` / `Enter` | interact |
| `I` / `Tab` | satchel |
| `G` | equipment |
| `C` | recipe book |
| `M` | journal |
| `Esc` | menu |

**Where to go.** Fingerposts along the street point east to a lit timber arch
reading HOLLOW GROVE — that is where you fight and forage. Inside the castle, a
signed KITCHEN door leads to the cauldrons and conching machines. If a
destination is off-screen, an arrow at the frame edge points at it: orange
FIGHT for the grove, gold MAKE for the kitchen.

**The loop.** Head east along Hollow Street into the Grove. Gather cocoa
pods, moonberries, gloomcaps and spirit salt; kill what tries to stop you. Take
it back to the castle kitchen, pick a recipe at a cauldron, and hit the gold
band in the tempering minigame for a star-rated batch. Stock your display
counters, set a price, flip the sign, and watch the town come in.

**Combat** rewards reading your opponent, not holding a button. Every enemy
telegraphs before it commits — a flash and a `!`. Raise the guard *into* that
blow and you **parry**: the hit is negated, the attacker is stunned, and you get
a window where your swings are faster and hit harder. Stand behind a guard you
raised early and you merely **soak** it — chip damage, stamina drain, and if
your stamina runs out the guard breaks. The pot crab's slam and the Hollow
Queen's charge cannot be parried at all; those you have to step out of.

**Your off-hand is your build.** A buckler is the parry engine. The *Warding
Bell* staggers everything in a wide ring on a parry. The *Spirit Ward* turns
projectiles around and sends them back harder. The *Gloom Lantern* gives up
guarding entirely for a much wider light and a bigger forage haul, and an empty
off-hand trades safety for raw speed and damage. Weapons, off-hands and bows
drop from enemies at four rarities; the Hollow Queen pays out a full set.

**Two ways to make chocolate**, with reasons to use both. The **cauldron** is
hands-on: a tempering minigame that pays in star quality, and stars multiply an
item's value. The **conching machine** is hands-off: load it, walk away, forage
or fight, and come back to a much larger batch at plain quality.

**The town remembers you.** Gift chocolate to townsfolk — one each per day, and
their favourites count double — and their hearts rise, their dialogue warms,
and they start coming to the shop themselves, paying a premium for the thing
they love. Town goodwill widens the crowd. Gold goes back out at the dairy and
the exchange, which sell ingredients you'd otherwise have to fight for.

**Pricing** matters. Every chocolate has a market value based on its recipe and
star rating. Undercut it and everything sells; go much above it and customers
walk away. Higher-star stock and townsfolk goodwill both widen the crowd, and
the shop keeps trading while you are out in the grove — it reports what it took
when you walk back in.

**Gold has somewhere to go.** You start with two display counters; the rest are
shuttered and cost 900g to 15,000g to open. Ghost staff are hired, not given.
Every night takes an upkeep against the day's earnings.

## Layout

```
index.html          canvas + error reporting
main.js             boot, scene harness, capture mode
server.py           static server + /shot endpoint used by the art harness
test.html/.js       49-check self test over every system

src/
  engine/core.js    screen scaling, input, fixed-step loop, camera
  art/
    palette.js      every colour in the game, as darkest→lightest ramps
    pixel.js        the pixel-drawing toolkit + deterministic noise
    tiles.js        ground and floor tiles (16px, seamless, many variants)
    chars.js        parametric character painter, 4 dirs × walk/swing/block
    props.js        buildings, scenery, furniture, item icons
    enemies.js      slimes, crows, bats, pot crabs, the Hollow Queen
    font.js         5×7 bitmap font + ornate panel/slot/bar chrome
  systems/
    lighting.js     multiplied ambient darkness + additive warm bloom
    particles.js    snowfall, smoke, bursts, floating text
  world/maps.js     the street, shop, kitchen and grove
  entities.js       player, enemies, boss, townsfolk, ghosts, customers
  data.js           ingredients, recipes, townsfolk, vendors
  gear.js           weapons, build-defining off-hands, bows, loot tables
  ui.js             HUD and every panel
  game.js           state, simulation, render pipeline
  audio.js          synthesised SFX + an ambient music bed
```

## How the look is built

Three things carry the art direction:

1. **One palette, as ramps.** Everything indexes into `RAMP` in
   `art/palette.js`, so shading stays coherent across tiles, sprites and UI.
   Cool blue-white snow and violet stone sit against warm amber lamplight and
   cocoa browns.
2. **Lighting is a multiply pass, not a fog.** `systems/lighting.js` fills a
   layer with `mix(white, ambientTint, amount)`, cuts holes where lights are,
   and multiplies it over the frame — then adds a separate warm bloom on top.
   Laying a translucent colour over the scene instead makes night look hazy
   rather than dark; this doesn't.
3. **Ground noise wraps.** Tile texture uses `wrapNoise`, a value noise on a
   lattice that repeats inside the tile, so large snow fields have no seams and
   no diagonal banding.
4. **Interiors are islands on black.** A room is a *rectilinear polygon* — a
   union of rectangles with at least one concave step and one protruding porch —
   sitting on warm plum-black (`#120301`) with generous, deliberately unequal
   margins, and it never fills the viewport. `roomFrameFromMask()` traces a
   15px carved moulding round the silhouette from an outward distance field, so
   every convex and concave corner mitres at 45° for free and the thickness
   never varies by side. Floors are 8px boards with exactly one dark seam and no
   butt joints; a step between levels gets a riser lighter than both floors it
   joins. Lamps reach about two tiles — only a hearth lights a room.

## Development harness

`shot.sh` renders any scene to `shots/` without touching the screen: the page
simulates a fixed number of deterministic steps, draws one frame, and POSTs the
PNG to the dev server.

```
./shot.sh town  "scene=town&time=1290&zoom=2&px=41&py=30&nohud=1" 150
./shot.sh detail "scene=town&zoom=6&crop=150,110,130,75" 150
```

`scene` `time` `px` `py` `zoom` `crop` `nohud` `open` `boss` `ui` `unlock` `give`
are all supported; the same parameters work in the address bar for playing a
scene directly.

Open `/test.html` to run the self test — it drives the real `Game` object
through movement, collision, combat, blocking, foraging, crafting, stocking,
sales, pricing, ghosts, warps, the day cycle, the boss and every UI panel.

## Note on the reference

This is an original game built in the same genre and visual register as
ConcernedApe's *Haunted Chocolatier* — snowbound gothic town, ghost shop staff,
shield-and-stun combat, gather → craft → sell. All art here is original and
generated in code; none of it is copied from that game.
