# Cray Sorting

A first-person 3D sorting game. You're standing in a room buried under 60,000 completely mixed-up crayons (30 shades across 10 color families) covering every inch of the floor. There are no waves and no timers: it's one huge, daunting job. Lay out your boxes and shelves however you like, toss each crayon into the box for its exact shade, and keep going until the floor is clean.

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
| Pack a full box | Click it. It goes onto the nearest shelf unit with room |
| Build menu (free boxes, shelves, furniture) | `E` |
| Collection (unlocks and progress) | `F` |
| Move a box, shelf or decoration | Look at it and press `G`, then click to place (`R` rotates, `X` puts it away) |
| Change an empty box's shade | Look at it and press `C` |

On phones and tablets there's an on-screen joystick for walking; drag to look and tap to act.

## Organizing and unlocks

- **Boxes are free.** Make a box for any shade, as many as you want, and place it anywhere. Six boxes are in the room when you start.
- **Shelf units are free too.** When a box is full, click it to pack it onto the nearest shelf with room.
- **Unlocks come from sorting.** Each color family has three milestones (30, 120 and 300 crayons sorted). They unlock upgrades (Bigger Handfuls, Wide Scoop, Shade Spotter, Roomier Boxes, Comfy Sneakers, Tape Gun, Sortbots, Sortbot Turbo) and furniture (plant, rug, lamp, beanbag, fish bowl, cat bed, poster, clock, window, fairy lights). The Collection screen shows what's next.

## Files

- `index.html`: page, HUD and build menu
- `style.css`: styling
- `game.js`: the whole game (3D scene, crayon piles, controls, unlocks, saving)
- `vendor/three.min.js`: Three.js r128 (MIT, see `vendor/three.LICENSE`)
