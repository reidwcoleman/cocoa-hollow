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
| `Shift` | raise shield |
| `E` / `Enter` | interact |
| `I` / `Tab` | satchel |
| `C` | recipe book |
| `M` | journal |
| `Esc` | menu |

**The loop.** Head east from the square into the Hollow Grove. Gather cocoa
pods, moonberries, gloomcaps and spirit salt; kill what tries to stop you. Take
it back to the castle kitchen, pick a recipe at a cauldron, and hit the gold
band in the tempering minigame for a star-rated batch. Stock your display
counters, set a price, flip the sign, and watch the town come in.

**Combat** rewards patience over mashing. Blocking a hit with `Shift` while
facing the attacker stuns it and opens a ~2 second window where your swings are
faster and hit harder. The Hollow Queen at the far east of the grove is the
first real test of it.

**Pricing** matters. Every chocolate has a market value based on its recipe and
star rating. Undercut it and everything sells; go much above it and customers
walk away. Higher-star stock also draws bigger crowds.

## Layout

```
index.html          canvas + error reporting
main.js             boot, scene harness, capture mode
server.py           static server + /shot endpoint used by the art harness
test.html/.js       23-check self test over every system

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
  world/maps.js     the town, shop, kitchen and grove
  entities.js       player, enemies, boss, townsfolk, ghosts, customers
  data.js           ingredients, recipes, townsfolk
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
