# Cray Sorting

A cozy browser game about sorting a ridiculous number of crayons.

Your room is buried under thousands of completely mixed-up crayons: 30 shades across 10 color families, all jumbled together with no pre-sorting at all. Dig through the piles, drop each crayon into the box for its exact shade, and earn coins to grow your sorting setup.

## How to run

No install or build step. Either:

- Open `index.html` in any modern browser (double-click it), or
- Serve the folder, e.g. `python3 -m http.server` and visit http://localhost:8000

Progress saves automatically in your browser (localStorage).

## How to play

- **Grab**: click a crayon to pick it up. Hover a crayon to see its shade name.
- **Sort**: click (or drag onto) the box with the matching shade to earn coins. Wrong box? It bounces back.
- **Pack**: full boxes show a PACK! bubble. Click to pack them for a bonus; packed boxes go on your wall shelves and earn coins over time.
- **More piles**: a new pile gets dumped in every 40 seconds, so the floor never stays clean.
- **Move**: rearrange boxes and decorations however you like.

## Shop

- **Boxes & Shelves**: you start with boxes for only 6 of the 30 shades. Buy boxes for the rest (or extra boxes for the same shade), plus shelves for packed boxes.
- **Upgrades**: Bigger Handfuls (grab several of the same shade at once), Long Reach, Shade Spotter (highlights matching crayons and their box), Roomier Boxes, Collector Reputation (more coins), Bigger Deliveries, Tape Gun (auto-pack), Sortbots (little robots that sort for you) and Sortbot Turbo.
- **Decorations**: plants, rugs, lamps, a beanbag, a fish bowl, a cat bed (with cat), posters, a clock, a window and fairy lights. Each adds coziness, which boosts every coin you earn.

## Files

- `index.html`: page layout, HUD and shop dialogs
- `style.css`: styling
- `game.js`: the whole game (canvas rendering, input, shop, saving)
