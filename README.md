# Cray Sorting

A first-person 3D sorting game. You're standing in a cozy art room (wainscoting, sunny windows, a corkboard of crayon drawings) buried under 60,000 completely mixed-up crayons (30 shades across 10 color families) covering every inch of the floor. There are no waves and no timers: it's one huge, daunting job. Lay out your boxes and shelves however you like, toss each crayon into the box for its exact shade, and keep going until the floor is clean.

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
| Toss into a box or drawer | Click it while holding crayons |
| Take crayons back out | Click a box or drawer with empty hands, or press `T` (works on full boxes too) |
| Drop crayons | Click the floor, or press `Q` |
| Pack a full box | Click it. It goes onto the nearest shelf unit with room |
| Build menu (free boxes, drawers, shelves, furniture) | `E` |
| Collection (unlocks and progress) | `F` |
| Move a box, drawer, shelf or decoration | Look at it and press `G`, then click to place (`R` rotates, `X` puts it away) |
| Change an empty box's shade | Look at it and press `C` |
| Color a page on the coloring table | Hold a crayon, look at the page, click or press `V` |
| Scribble on walls and furniture | Hold `V` while holding a crayon |
| Take a hidden coloring page | Click it |
| Tote bucket (after 1,500 sorted) | `B` to switch; click crayons to scoop any color, walk past boxes to drop each shade off, `Q` dumps it |
| Carry a packed box to another shelf spot | Click it on the shelf, click the spot (swaps if taken). `Q` cancels, `C` on a shelf tidies it by color |
| Place off the grid | Hold `Alt` while placing |
| Floor tape (after 2,500) | `N`, click points, `R` changes color, `Backspace` undoes, `Esc` exits |
| Room planner (after 2,500) | `P` for the overhead view: `W` `A` `S` `D` pans, wheel zooms, click something to move it |
| Conveyor belt (after 13,000) | `K`, click points, `Enter` or click the last point to finish, `Backspace` undoes |
| Feed a hopper | Click it with crayons in hand, or walk up with the tote. Click it empty-handed to take a tray |
| Roomba dock settings | Look at the dock and press `C` to pick any color, one family, or one shade |
| Vacuum (after 25,000) | `H` to switch, hold click to suck up crayons, `R` sets the filter, walk past boxes to drop off |

On phones and tablets there's an on-screen joystick for walking; drag to look and tap to act.

## Organizing and unlocks

- **Boxes are free, but space is limited.** Make a box for any shade and place it anywhere, but you start with room for 10 boxes and drawers and 2 shelf units. Storage Permits on the ladder raise those limits (60, 250, 450, 1,200 and on up to unlimited at 22,000), so plan where each shade lives. Crayons you sort stand up in the box, tips out, and you can take them back out any time.
- **Organize your shelves.** A full box packs onto the nearest shelf unit with room. Click a packed box to carry it to any spot on any shelf (it swaps if the spot is taken), or press `C` on a shelf to tidy it by color.
- **Sorting drawers stack.** Each one holds three boxes' worth and never needs packing. While placing a drawer, look at another drawer to stack it on top, up to 8 high.
- **Upgrades come from your total.** A milestone ladder runs on the most crayons you've ever had sorted at once (taking crayons back out never loses an unlock). Bigger Handfuls grab 5, 10, 16 and then 24 crayons from a wider area. Along the way come the Label Maker, Shade Spotter, Roomier Boxes, the Tote Bucket, the Finder Arrow, jars (twice a box), floor tape and the room planner, the wagon (a 120-crayon tote), a 30-bin sorting cabinet, a rolling bin cart for one color family, the hopper, conveyor belts, Crayon Roombas with docks, the vacuum and its shade filters. The Rainbow Wall lights each stripe as you finish a shade, and the Collection has 17 achievements.
- **Furniture comes from colors.** Sorting 150 of a color family unlocks a piece of decor (plant, rug, lamp, beanbag, fish bowl, cat bed, poster, clock, window, fairy lights). The Collection screen shows what's next.

## Furniture and coloring books

- **The room comes furnished.** There's a coloring corner, an art corner with a desk and easel, a reading nook, a lounge with a sofa, bookcases and cubbies by the walls, area rugs (buried under crayons until you clear them), plants in the corners, and toys: a teddy and toy rocket on the toy chest, alphabet blocks by the coloring corner, a rubber duck by the door. Older saves get the furniture added on load, skipping any spot you've already used. Move anything with `G`, and add more from E → Furniture.
- **Coloring pages.** Coloring pages are scattered on the coloring table. Hold a crayon, look at a page and click it (or press `V`) to color it with that crayon. Pick up a different shade to switch colors. Three pages start on the table, and seven more are hidden around the room: in heaps, on furniture, on a windowsill, taped to the door. Click a hidden page to add it to the table. The Collection screen tracks what you've found and colored.
- **Scribble on anything.** Hold `V` with a crayon in hand and look around to draw on the walls, furniture, boxes, anything. Scribbles save, and moving a piece of furniture wipes the scribbles on it.

## Files

- `index.html`: page, HUD and build menu
- `style.css`: the crayon-box UI (paper tags, chunky crayon-colored buttons, cardboard menus). Uses the Fredoka and Patrick Hand fonts from Google Fonts, with system fallbacks offline
- `game.js`: the whole game (3D scene, crayon piles, controls, unlocks, saving)
- `vendor/three.min.js`, `vendor/GLTFLoader.js`: Three.js r128 and its glTF loader (MIT, see `vendor/three.LICENSE`)
- `assets/models/*.glb`: 3D models, with textures shrunk for the web. `models.js` embeds them as base64 so the game runs from `file://`; rebuild it with `python3 tools/pack-models.py`.
- `assets/crayon_wrapper.jpg`: the crayon wrapper mask (also embedded in `game.js` so the game runs from `file://`)

## Credits

The crayon wrapper artwork is adapted from ["crayons w/ box"](https://sketchfab.com/3d-models/crayons-w-box-5b3ce4c8e5e545cba43f394af1b2d711) by Fine_poultry, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). It was converted to a grayscale mask and is tinted per shade in game.

3D models from Sketchfab, all licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Textures were resized and extra material maps removed for size:

- ["Lil' Bear"](https://sketchfab.com/3d-models/lil-bear-55ee397cf40c4f86af1ee31fb2096d82) by Cherryvania (teddy bear)
- ["Wooden Alphabet Blocks"](https://sketchfab.com/3d-models/wooden-alphabet-blocks-5f8dfddbbc7d468784ca014378f7e5fe) by Cherryvania
- ["Quick little toy rocket"](https://sketchfab.com/3d-models/quick-little-toy-rocket-58a99811d3a6477885be82d00da5ae40) by naam (base plate removed)
- ["Cartoony Rubber Ducky"](https://sketchfab.com/3d-models/cartoony-rubber-ducky-8a6e661916b74f9caa1c20dd6fdf77ad) by Xabier Garcia
- ["Optimized Potted Plants"](https://sketchfab.com/3d-models/optimized-potted-plants-967b4bf23fac4098993776fcfc2d3318) by Nicholas-3D (potted and tall plants)
- ["Robot vacuum cleaner low poly"](https://sketchfab.com/3d-models/robot-vacuum-cleaner-low-poly-7230d8d80e8b4a82b4a34a5e7926d0d3) by Moryak (Crayon Roomba)
