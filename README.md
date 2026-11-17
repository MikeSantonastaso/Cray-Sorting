# Cray Sorting

A cozy first-person 3D sorting game. You're standing in a room buried under thousands of completely mixed-up crayons (30 shades across 10 color families) heaped into huge piles. Dig through them, toss each crayon into the box for its exact shade, and earn coins to grow your sorting setup.

## How to run

No install or build step. Either:

- Open `index.html` in a modern desktop browser (double-click it), or
- Serve the folder, e.g. `python3 -m http.server` and visit http://localhost:8000

Three.js (r128) is vendored in `vendor/`, so it works offline. Progress saves automatically in your browser (localStorage).

## Controls

| Action | Keys / mouse |
| --- | --- |
| Walk / run | `W` `A` `S` `D`, hold `Shift` to run |
| Look around | Mouse (click **Mouse look** or press `L` to lock the cursor), or drag |
| Pick up a crayon | Click it (look at a crayon to see its shade name) |
| Toss into a box | Click the box while holding crayons |
| Drop crayons | Click the floor, or press `Q` |
| Pack a full box | Click it. Packed boxes go onto your wall shelves |
| Shop | `E` |
| Move a box or decoration | Look at it and press `G`, then click to place (`R` rotates, `X` puts decorations away) |
| Change an empty box's shade | Look at it and press `C` |

On phones and tablets there's an on-screen joystick for walking; drag to look and tap to act.

## Shop

- **Boxes & Shelves**: you start with boxes for only 6 of the 30 shades. Buy boxes for the rest and place them anywhere. Shelves hold packed boxes and earn coins over time.
- **Upgrades**: Bigger Handfuls, Wide Scoop, Shade Spotter (matching crayons and their box glow), Roomier Boxes, Collector Reputation, Comfy Sneakers, Bigger Deliveries, Tape Gun (auto-pack), Sortbots (little robots that sort for you) and Sortbot Turbo.
- **Decorations**: plants, rugs, lamps, a beanbag, a fish bowl, a cat bed (with a sleeping cat), a poster, a clock, a window and fairy lights. Each adds coziness, which boosts every coin you earn.

## Files

- `index.html`: page, HUD and shop dialogs
- `style.css`: styling
- `game.js`: the whole game (3D scene, crayon piles, controls, shop, saving)
- `vendor/three.min.js`: Three.js r128 (MIT, see `vendor/three.LICENSE`)
