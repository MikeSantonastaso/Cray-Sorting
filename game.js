(() => {
  'use strict';
  const T = window.THREE;

  // ---------------------------------------------------------------------------
  // World constants (units are roughly meters)
  // ---------------------------------------------------------------------------
  const HALF = 12;            // room is 24 x 24
  const WALL_H = 6.5;
  const CL = 0.3;             // crayon length (a bit bigger than real life, so you can see them)
  const CR = 0.032;           // crayon radius
  const TOTAL = 60000;        // the whole job: this many crayons, all mixed up
  const MAX_CRAYONS = TOTAL + 1000;
  const BOX_W = 1.1, BOX_D = 0.8, BOX_H = 0.7;
  const DRAWER_W = 0.8, DRAWER_D = 0.62, DRAWER_H = 0.42, STACK_MAX = 8; // stackable sorting drawers
  const PICK_DIST = 3.6;      // how far away you can grab a crayon
  const TOSS_DIST = 16;       // how far away you can toss into a box
  const SHELF_CAP = 12;       // packed boxes per shelf unit (3 levels x 4)
  const SAVE_KEY = 'cray-sorting-3d-v4';
  const TAU = Math.PI * 2;

  // Every color family comes in three shades. Each shade is sorted on its own.
  const FAMILIES = [
    { name: 'Reds',    shades: [['Strawberry', '#ff6b6b'], ['Cherry', '#d90429'], ['Brick', '#8d1c1c']] },
    { name: 'Blues',   shades: [['Sky', '#8ecdf7'], ['Ocean', '#1d6fd8'], ['Navy', '#1a2a6c']] },
    { name: 'Yellows', shades: [['Butter', '#fff27a'], ['Sunshine', '#ffcc00'], ['Mustard', '#b8930a']] },
    { name: 'Greens',  shades: [['Mint', '#9be8a6'], ['Leaf', '#2fb344'], ['Pine', '#1b5e20']] },
    { name: 'Oranges', shades: [['Peach', '#ffbe8a'], ['Tangerine', '#ff8a12'], ['Rust', '#b4400b']] },
    { name: 'Purples', shades: [['Lavender', '#cdb0f7'], ['Grape', '#8e44ad'], ['Plum', '#4a1a5e']] },
    { name: 'Pinks',   shades: [['Cotton Candy', '#ffc6df'], ['Bubblegum', '#ff6fae'], ['Magenta', '#c2185b']] },
    { name: 'Browns',  shades: [['Sand', '#e2c398'], ['Cocoa', '#8b5a2b'], ['Coffee', '#4a2f24']] },
    { name: 'Teals',   shades: [['Seafoam', '#93e6d6'], ['Teal', '#14a39a'], ['Deep Sea', '#0a5650']] },
    { name: 'Grays',   shades: [['Snow', '#f7f7f7'], ['Silver', '#a9a9a9'], ['Charcoal', '#343434']] },
  ];
  const SHADES = [];
  FAMILIES.forEach((f, fi) => f.shades.forEach(([name, hex]) => SHADES.push({ name, hex, family: fi })));
  const SHADE_COLORS = SHADES.map(s => new T.Color(s.hex));
  // The boxes already in the room when you start: the middle shade of the first six families
  const START_BOXES = [1, 4, 7, 10, 13, 16];

  const DECOR = {
    shelf:    { name: 'Shelf Unit',         icon: '🗄️', r: 0.75, cy: 1.0, free: true, desc: 'Holds 12 packed boxes. Full boxes you pack go to the nearest shelf with room. Click a packed box to carry it to another spot, and press C on a shelf to tidy it by color.' },
    plant:    { name: 'Potted Plant',       icon: '🪴', r: 0.4,  cy: 0.6 },
    rug:      { name: 'Cozy Rug',           icon: '🟣', r: 1.5,  cy: 0.05, under: true },
    lamp:     { name: 'Floor Lamp',         icon: '💡', r: 0.35, cy: 0.9 },
    beanbag:  { name: 'Beanbag',            icon: '🛋️', r: 0.7,  cy: 0.35 },
    fishbowl: { name: 'Fish Bowl',          icon: '🐟', r: 0.45, cy: 0.8 },
    catbed:   { name: 'Cat Bed (with cat)', icon: '🐈', r: 0.65, cy: 0.25 },
    poster:   { name: 'Rainbow Poster',     icon: '🌈', r: 0.7,  wall: true },
    clock:    { name: 'Wall Clock',         icon: '🕰️', r: 0.45, wall: true },
    window:   { name: 'Window',             icon: '🪟', r: 1.0,  wall: true },
    lights:   { name: 'Fairy Lights',       icon: '✨', r: 1.6,  wall: true },
    // Everyday furniture: free from the start, move it around however you like
    table:    { name: 'Coloring Table',     icon: '🖍️', r: 0.85, cy: 0.55, free: true, desc: 'Comes with coloring books. Click it to color with the crayons you have sorted.' },
    chair:    { name: 'Little Chair',       icon: '🪑', r: 0.32, cy: 0.4,  free: true },
    sofa:     { name: 'Sofa',               icon: '🛋️', r: 1.0,  cy: 0.45, free: true },
    armchair: { name: 'Armchair',           icon: '💺', r: 0.55, cy: 0.45, free: true },
    bookcase: { name: 'Bookcase',           icon: '📚', r: 0.65, cy: 0.9,  free: true },
    toychest: { name: 'Toy Chest',          icon: '🧸', r: 0.55, cy: 0.35, free: true },
    sidetable:{ name: 'Side Table',         icon: '🫖', r: 0.32, cy: 0.35, free: true },
    arearug:  { name: 'Area Rug',           icon: '🟫', r: 1.6,  cy: 0.05, free: true, under: true, desc: 'A big rug. Crayons cover it until you clear them away.' },
    easel:    { name: 'Art Easel',          icon: '🎨', r: 0.5,  cy: 1.0,  free: true },
    desk:     { name: 'Art Desk',           icon: '🖊️', r: 0.75, cy: 0.5,  free: true },
    tallplant:{ name: 'Tall Plant',         icon: '🌿', r: 0.4,  cy: 0.9,  free: true },
    coatrack: { name: 'Coat Rack',          icon: '🧥', r: 0.3,  cy: 1.0,  free: true },
    cubby:    { name: 'Toy Cubbies',        icon: '🧺', r: 0.8,  cy: 0.6,  free: true },
    blocks:   { name: 'Alphabet Blocks',    icon: '🔤', r: 0.55, cy: 0.15, free: true, desc: 'Wooden letter blocks that spell out CRAY.' },
    duck:     { name: 'Rubber Duck',        icon: '🦆', r: 0.35, cy: 0.1,  free: true, desc: 'A friendly rubber duck to keep you company.' },
    cabinet:  { name: '30-Drawer Cabinet',  icon: '🗃️', r: 1.0,  cy: 0.8,  bins: true, desc: 'One drawer for every shade, 10 color families across. Takes one storage spot. Fill all three shades of a family for a complete set.' },
    cart:     { name: 'Rolling Cart',       icon: '🛒', r: 0.55, cy: 0.5,  bins: true, desc: 'Three drawers for one color family. Walk into it to push it wherever you are working. C on an empty cart changes its family.' },
    teddy:    { name: 'Teddy Bear',         icon: '🧸', r: 0.45, cy: 0.25, free: true, desc: 'A sleepy teddy in a yellow raincoat.' },
  };

  // Upgrades. Their level is how many of their rewards you've unlocked.
  const UPGRADES = {
    hand:     { name: 'Bigger Handfuls', icon: '🤲', info: l => `Scoop up to ${handSize(l)} crayons of one shade from ${scoop(l).toFixed(1)}m around` },
    storage:  { name: 'Storage Permit',  icon: '📋', info: l => `Room for ${limTxt(boxLimit(l))} boxes and drawers, and ${limTxt(shelfLimit(l))} shelf units` },
    glow:     { name: 'Shade Spotter',   icon: '🔦', info: l => l >= 2 ? 'Looking at a crayon lights up its whole shade' : 'Crayons you hold light up their whole shade and their box' },
    bigBox:   { name: 'Roomier Boxes',   icon: '📦', info: l => `Boxes hold ${boxCap(l)} crayons` },
    speed:    { name: 'Comfy Sneakers',  icon: '👟', info: l => `Walk ${l * 15}% faster` },
    autoPack: { name: 'Tape Gun',        icon: '🧷', info: () => 'Full boxes pack themselves' },
    bots:     { name: 'Sortbot',         icon: '🤖', info: l => `${l} little robot${l > 1 ? 's' : ''} sorting alongside you` },
    botSpeed: { name: 'Sortbot Turbo',   icon: '⚙️', info: () => 'Sortbots drive faster and carry more' },
    labels:   { name: 'Label Maker',     icon: '🏷️', info: () => 'Box signs show from across the room, and drawers get name labels' },
    tote:     { name: 'Tote Bucket',     icon: '🪣', info: l => `Press B for the tote: scoop ${toteCap(l)} crayons of any color, and boxes you walk past take their own shade` },
    jars:     { name: 'Crayon Jars',     icon: '🫙', info: () => 'See-through jars that hold twice a box and show how full they are (E → Boxes)' },
    tape:     { name: 'Floor Tape and Planner', icon: '📐', info: () => 'N lays colored tape lanes on the floor, P opens a top-down planner view' },
    wagon:    { name: 'Wagon',           icon: '🛻', info: () => 'Your tote becomes a wagon: 120 mixed crayons, and boxes within 2.5 m take their shade' },
    finder:   { name: 'Finder Arrow',    icon: '🧭', info: () => 'An arrow points to the nearest box with room for what you carry' },
  };

  // The main unlock ladder: total crayons sorted, across every box, drawer and shelf.
  // Unlocks use the best total you've reached, so taking crayons out never locks anything.
  const LADDER = [
    { at: 60, up: 'storage' },
    { at: 100, up: 'hand' },
    { at: 250, up: 'storage' },
    { at: 1200, up: 'storage' },
    { at: 2200, up: 'storage' },
    { at: 3500, up: 'storage' },
    { at: 4500, up: 'hand' },
    { at: 5200, up: 'storage' },
    { at: 9500, up: 'storage' },
    { at: 13000, up: 'storage' },
    { at: 17000, up: 'storage' },
    { at: 22000, up: 'storage' },
    { at: 200, up: 'speed' },
    { at: 300, up: 'labels' },
    { at: 450, up: 'storage' },
    { at: 600, up: 'glow' },
    { at: 800, up: 'bigBox' },
    { at: 1000, up: 'hand' },
    { at: 1000, up: 'jars' },
    { at: 1500, up: 'tote' },
    { at: 1800, up: 'finder' },
    { at: 2500, up: 'autoPack' },
    { at: 2500, up: 'tape' },
    { at: 3200, up: 'speed' },
    { at: 4000, up: 'tote' },
    { at: 4000, decor: 'cabinet' },
    { at: 5000, up: 'bigBox' },
    { at: 6000, up: 'glow' },
    { at: 6000, up: 'wagon' },
    { at: 6000, decor: 'cart' },
    { at: 7000, up: 'storage' },
    { at: 7500, up: 'tote' },
    { at: 9000, up: 'hand' },
    { at: 9000, soon: 'Sorter Hopper', icon: '🎰' },
    { at: 11000, up: 'bots' },
    { at: 12000, up: 'bigBox' },
    { at: 13000, soon: 'Conveyor Belts', icon: '➰' },
    { at: 15000, up: 'bots' },
    { at: 18000, up: 'botSpeed' },
    { at: 18000, soon: 'Crayon Roomba', icon: '🧹' },
    { at: 22000, up: 'bots' },
    { at: 25000, soon: 'Crayon Vacuum', icon: '🌀' },
    { at: 35000, soon: 'Color Vacuum and Color Roomba', icon: '🌀' },
    { at: 45000, soon: 'Shade Vacuum and Shade Roomba', icon: '🌀' },
    { at: 60000, soon: 'Rainbow Wall', icon: '🌈' },
  ];

  // Color milestones are cosmetic: sort enough of one color family to unlock its decoration.
  const TIERS = [150];
  const REWARDS = [
    /* Reds    */ [{ decor: 'plant' }],
    /* Blues   */ [{ decor: 'rug' }],
    /* Yellows */ [{ decor: 'lamp' }],
    /* Greens  */ [{ decor: 'beanbag' }],
    /* Oranges */ [{ decor: 'poster' }],
    /* Purples */ [{ decor: 'lights' }],
    /* Pinks   */ [{ decor: 'catbed' }],
    /* Browns  */ [{ decor: 'clock' }],
    /* Teals   */ [{ decor: 'fishbowl' }],
    /* Grays   */ [{ decor: 'window' }],
  ];
  const rewardName = r => r.soon ? r.soon : r.up ? UPGRADES[r.up].name : DECOR[r.decor].name;
  const rewardIcon = r => r.soon ? r.icon : r.up ? UPGRADES[r.up].icon : DECOR[r.decor].icon;

  const handSize = l => [1, 5, 10, 16, 24][Math.min(l, 4)];
  const scoop = l => 0.45 + l * 0.4;   // the reach grows with your handful
  // Storage is capped, and Storage Permits raise the cap as you sort
  const BOX_LIMITS = [10, 13, 16, 20, 25, 30, 36, 44, 54, 66, 80, 100, Infinity];
  const SHELF_LIMITS = [2, 3, 4, 5, 7, 9, 12, 15, 19, 24, 30, 38, Infinity];
  const boxLimit = l => BOX_LIMITS[Math.min(l, BOX_LIMITS.length - 1)];
  const shelfLimit = l => SHELF_LIMITS[Math.min(l, SHELF_LIMITS.length - 1)];
  const limTxt = n => n === Infinity ? 'unlimited' : String(n);
  const boxCap = l => 30 + l * 15;
  const botCarry = l => 2 + l * 2;
  const walkSpeed = l => 4 * (1 + l * 0.15);
  const toteCap = l => lvl('wagon') ? 120 : [0, 15, 25, 40][Math.min(l, 3)];
  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  const $ = id => document.getElementById(id);

  function fmt(n) {
    n = Math.floor(n);
    if (n < 10000) return String(n);
    if (n < 1e6) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
  }
  function luminance(hex) {
    const n = parseInt(hex.slice(1), 16);
    return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  let state;

  function freshState() {
    return {
      sorted: 0,
      familySorted: FAMILIES.map(() => 0), // crayons of each family sitting in boxes right now
      familyBest: FAMILIES.map(() => 0),   // the most ever sorted at once (unlocks never go away)
      shadeSorted: SHADES.map(() => 0),   // every crayon ever sorted, per shade (unlocks coloring colors)
      bestTotal: 0,                        // highest total ever sorted: drives the unlock ladder
      boxes: [],
      decor: [],
      tape: [],
      player: { x: 0, z: 10, yaw: 0, pitch: -0.3 },
      done: false,
    };
  }

  // Which rewards have been earned, and the upgrade levels they add up to
  function earnedRewards() {
    const out = [];
    REWARDS.forEach((tiers, fi) => tiers.forEach((r, ti) => {
      if (state.familyBest[fi] >= TIERS[ti]) out.push({ ...r, fi, ti });
    }));
    return out;
  }
  let levels = {};
  let unlockedDecor = new Set();
  function recomputeUnlocks() {
    levels = Object.fromEntries(Object.keys(UPGRADES).map(k => [k, 0]));
    unlockedDecor = new Set(Object.keys(DECOR).filter(k => DECOR[k].free));
    for (const r of earnedRewards()) {
      if (r.up) levels[r.up]++;
      else unlockedDecor.add(r.decor);
    }
    for (const r of LADDER) if (state.bestTotal >= r.at) { if (r.up) levels[r.up]++; else if (r.decor) unlockedDecor.add(r.decor); }
  }
  const lvl = id => levels[id] || 0;
  const capacity = () => boxCap(lvl('bigBox'));
  const isDrawer = b => b.kind === 'drawer';
  const isBox = b => !b.kind || b.kind === 'box';
  const isJar = b => b.kind === 'jar';
  const isBin = b => b.kind === 'bin';   // a drawer that belongs to a cabinet or cart
  // a drawer holds three boxes' worth, jars and cabinet drawers two
  const capOf = b => isDrawer(b) ? capacity() * 3 : isJar(b) || isBin(b) ? capacity() * 2 : capacity();
  const boxBase = b => isDrawer(b) ? b.level * DRAWER_H : isBin(b) ? b.y0 : 0;
  const boxTopY = b => isDrawer(b) ? (b.level + 1) * DRAWER_H : isBin(b) ? b.y0 + b.h : isJar(b) ? JAR_H : BOX_H;
  const kindName = b => isDrawer(b) || isBin(b) ? 'drawer' : isJar(b) ? 'jar' : 'box';
  const JAR_H = 0.78, JAR_R = 0.2;
  // boxes and drawers each take one storage spot; a whole cabinet or cart takes one too
  const storageUsed = () => state.boxes.filter(b => !isBin(b)).length + state.decor.filter(d => DECOR[d.type].bins).length;
  // ---------------------------------------------------------------------------
  // Renderer, scene, camera
  // ---------------------------------------------------------------------------
  const canvas = $('game');
  const renderer = new T.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene();
  scene.background = new T.Color(0x2b2233);
  const camera = new T.PerspectiveCamera(70, 1, 0.03, 100);
  camera.rotation.order = 'YXZ';
  scene.add(camera);

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // Lights
  scene.add(new T.HemisphereLight(0xfff3e0, 0x8a6a50, 0.62));
  scene.add(new T.AmbientLight(0xffffff, 0.12));
  const sun = new T.DirectionalLight(0xfff2dc, 0.6);
  sun.position.set(6, 14, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 40 });
  sun.shadow.bias = -0.0008;
  scene.add(sun);

  // ---------------------------------------------------------------------------
  // Canvas textures
  // ---------------------------------------------------------------------------
  function canvasTex(w, h, draw, repeat) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c);
    if (repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    t.anisotropy = 4;
    return t;
  }

  const woodTex = canvasTex(512, 512, (g, w, h) => {
    const rows = 8;
    for (let r = 0; r < rows; r++) {
      const y = r * h / rows;
      for (let k = 0; k < 3; k++) {
        const x0 = ((r % 2) * 0.5 + k) * w / 2 - w / 4;
        g.fillStyle = `hsl(${28 + Math.random() * 6}, ${45 + Math.random() * 10}%, ${56 + Math.random() * 10}%)`;
        g.fillRect(x0, y, w / 2, h / rows);
        g.strokeStyle = 'rgba(90,55,25,.35)';
        g.lineWidth = 3;
        g.strokeRect(x0, y, w / 2, h / rows);
      }
      g.strokeStyle = 'rgba(120,75,40,.12)';
      g.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        g.beginPath();
        g.moveTo(0, y + 6 + Math.random() * (h / rows - 12));
        g.bezierCurveTo(w / 3, y + Math.random() * h / rows, 2 * w / 3, y + Math.random() * h / rows, w, y + 6 + Math.random() * (h / rows - 12));
        g.stroke();
      }
    }
  }, [6, 6]);

  const wallTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#f7e6cf'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(232,190,150,.45)';
    for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 24, h);
    g.fillStyle = 'rgba(255,140,120,.25)';
    for (let x = 44; x < w; x += 64) for (let y = 16; y < h; y += 48) { g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill(); }
  }, [12, 2.5]);

  // ---------------------------------------------------------------------------
  // Room
  // ---------------------------------------------------------------------------
  {
    const floor = new T.Mesh(new T.PlaneGeometry(HALF * 2, HALF * 2), new T.MeshStandardMaterial({ map: woodTex, roughness: 0.8 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const wallMat = new T.MeshStandardMaterial({ map: wallTex, roughness: 0.95 });
    const baseMat = new T.MeshStandardMaterial({ color: 0xfff7ea, roughness: 0.7 });
    [[0, -HALF, 0], [0, HALF, Math.PI], [-HALF, 0, Math.PI / 2], [HALF, 0, -Math.PI / 2]].forEach(([x, z, ry]) => {
      const wall = new T.Mesh(new T.PlaneGeometry(HALF * 2, WALL_H), wallMat);
      wall.position.set(x, WALL_H / 2, z);
      wall.rotation.y = ry;
      wall.receiveShadow = true;
      scene.add(wall);
      const base = new T.Mesh(new T.BoxGeometry(HALF * 2, 0.18, 0.05), baseMat);
      base.position.set(x, 0.09, z);
      base.rotation.y = ry;
      base.translateZ(0.025);
      scene.add(base);
    });
    const ceil = new T.Mesh(new T.PlaneGeometry(HALF * 2, HALF * 2), new T.MeshStandardMaterial({ color: 0xfffaf2, roughness: 1 }));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = WALL_H;
    scene.add(ceil);
  }

  // ---------------------------------------------------------------------------
  // Room details: wainscoting, trim, windows, a door, beams, lamps, an art board
  // ---------------------------------------------------------------------------
  {
    const trimMat = new T.MeshStandardMaterial({ color: 0xfff7ea, roughness: 0.6 });
    const beamMat = new T.MeshStandardMaterial({ color: 0x9a6a42, roughness: 0.75 });
    // add a part on a wall: (u along the wall, y up, out from the wall), sizes in the same frame
    const WALLS = {
      north: { ry: 0, at: (u, out) => [u, -HALF + out] },
      south: { ry: Math.PI, at: (u, out) => [-u, HALF - out] },
      west: { ry: Math.PI / 2, at: (u, out) => [-HALF + out, -u] },
      east: { ry: -Math.PI / 2, at: (u, out) => [HALF - out, u] },
    };
    function part(wall, geo, mat, u, y, out, shadow = false) {
      const w = WALLS[wall];
      const m = new T.Mesh(geo, mat);
      const [x, z] = w.at(u, out);
      m.position.set(x, y, z);
      m.rotation.y = w.ry;
      m.castShadow = shadow; m.receiveShadow = true;
      scene.add(m);
      return m;
    }
    const box = (w, h, d) => new T.BoxGeometry(w, h, d);

    // Wainscoting: painted boards on the lower wall, a chair rail, crown molding, and a crayon frieze
    const wainTex = canvasTex(256, 128, (g, w, h) => {
      g.fillStyle = '#b9cfb4'; g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 32) {
        g.fillStyle = 'rgba(60,90,60,.22)'; g.fillRect(x, 0, 3, h);
        g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x + 3, 0, 2, h);
      }
    }, [HALF * 2 / 1.6, 1]);
    const wainMat = new T.MeshStandardMaterial({ map: wainTex, roughness: 0.7 });
    const friezeTex = canvasTex(1024, 64, (g, w, h) => {
      g.fillStyle = '#fff4e2'; g.fillRect(0, 0, w, h);
      const n = 16;
      for (let i = 0; i < n; i++) {
        const x = i * w / n + 6, len = w / n - 12, col = SHADES[(i * 7) % SHADES.length].hex;
        g.fillStyle = col;
        g.fillRect(x, 24, len - 14, 16);
        g.beginPath(); g.moveTo(x + len - 14, 24); g.lineTo(x + len, 32); g.lineTo(x + len - 14, 40); g.fill();
        g.fillStyle = 'rgba(0,0,0,.35)';
        g.fillRect(x + 8, 24, 3, 16); g.fillRect(x + len - 34, 24, 3, 16);
      }
    }, [3, 1]);
    const friezeMat = new T.MeshStandardMaterial({ map: friezeTex, roughness: 0.8 });
    for (const wall of Object.keys(WALLS)) {
      part(wall, box(HALF * 2, 1.2, 0.03), wainMat, 0, 0.6, 0.015);
      part(wall, box(HALF * 2, 0.07, 0.07), trimMat, 0, 1.22, 0.035);
      part(wall, box(HALF * 2, 0.16, 0.12), trimMat, 0, WALL_H - 0.08, 0.06);
      part(wall, box(HALF * 2, 0.05, 0.05), trimMat, 0, WALL_H - 0.75, 0.025);
      part(wall, new T.PlaneGeometry(HALF * 2, 0.42), friezeMat, 0, WALL_H - 0.45, 0.004);
    }

    // Windows with a sunny view, sills, curtains and a radiator underneath
    const skyTex = canvasTex(256, 256, (g, w, h) => {
      const grad = g.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#7fbcf0'); grad.addColorStop(0.7, '#cfe8ff'); grad.addColorStop(1, '#e8f4ff');
      g.fillStyle = grad; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,.9)';
      for (const [x, y, r] of [[60, 60, 22], [85, 52, 28], [112, 62, 20], [190, 100, 16], [210, 94, 22], [232, 102, 15]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
      g.fillStyle = '#8cc58a';
      g.beginPath(); g.moveTo(0, 200); g.quadraticCurveTo(80, 150, 160, 195); g.quadraticCurveTo(220, 170, 256, 185); g.lineTo(256, 256); g.lineTo(0, 256); g.fill();
      g.fillStyle = '#6aa86b';
      g.beginPath(); g.moveTo(0, 230); g.quadraticCurveTo(120, 195, 256, 228); g.lineTo(256, 256); g.lineTo(0, 256); g.fill();
    });
    const skyMat = new T.MeshBasicMaterial({ map: skyTex });
    const curtainTex = canvasTex(64, 64, (g, w, h) => {
      g.fillStyle = '#f6b7a8'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,.5)';
      for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 6, h);
    }, [3, 1]);
    const curtainMat = new T.MeshStandardMaterial({ map: curtainTex, roughness: 0.95 });
    const radMat = new T.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.45, metalness: 0.2 });
    function windowOn(wall, u) {
      const W = 2.2, H = 2.3, y0 = 1.75, yc = y0 + H / 2;
      part(wall, new T.PlaneGeometry(W, H), skyMat, u, yc, 0.005);
      for (const dy of [-H / 2, H / 2]) part(wall, box(W + 0.24, 0.12, 0.14), trimMat, u, yc + dy, 0.07);
      for (const du of [-W / 2, W / 2]) part(wall, box(0.12, H + 0.12, 0.14), trimMat, u + du, yc, 0.07);
      part(wall, box(0.05, H, 0.06), trimMat, u, yc, 0.04);
      part(wall, box(W, 0.05, 0.06), trimMat, u, yc + 0.25, 0.04);
      part(wall, box(W + 0.5, 0.06, 0.3), trimMat, u, y0 - 0.06, 0.15, true);
      // curtains, gathered at the sides, and the rod above
      part(wall, new T.CylinderGeometry(0.025, 0.025, W + 1.3, 8).rotateZ(Math.PI / 2), beamMat, u, y0 + H + 0.28, 0.16);
      for (const side of [-1, 1]) {
        const c = part(wall, new T.CylinderGeometry(0.2, 0.26, H + 0.55, 10, 1, true), curtainMat, u + side * (W / 2 + 0.38), y0 + H / 2 + 0.02, 0.2, true);
        c.scale.z = 0.45;
      }
      // a radiator under the sill
      for (let k = 0; k < 9; k++) part(wall, box(0.07, 0.62, 0.12), radMat, u - 0.6 + k * 0.15, 0.62, 0.12);
      part(wall, box(1.4, 0.05, 0.1), radMat, u, 0.95, 0.12);
    }
    windowOn('north', -5.2);
    windowOn('north', 5.2);
    windowOn('east', -3);

    // A door on the west wall, with a light switch next to it
    const doorMat = new T.MeshStandardMaterial({ color: 0xfaf3e6, roughness: 0.5 });
    const doorU = 3, DW = 1.05, DH = 2.3;
    part('west', box(DW, DH, 0.05), doorMat, doorU, DH / 2, 0.03, true);
    for (const [du, dy, h] of [[0, 0.62, 0.8], [0, 1.65, 0.95]]) part('west', box(DW - 0.3, h, 0.02), new T.MeshStandardMaterial({ color: 0xf0e6d4, roughness: 0.6 }), doorU + du, dy, 0.06);
    for (const du of [-DW / 2 - 0.06, DW / 2 + 0.06]) part('west', box(0.12, DH + 0.1, 0.07), trimMat, doorU + du, (DH + 0.1) / 2, 0.035);
    part('west', box(DW + 0.24, 0.12, 0.07), trimMat, doorU, DH + 0.1, 0.035);
    part('west', new T.SphereGeometry(0.045, 12, 8), new T.MeshStandardMaterial({ color: 0xd9a531, roughness: 0.25, metalness: 0.7 }), doorU + DW / 2 - 0.12, 1.05, 0.09);
    part('west', box(0.09, 0.14, 0.015), trimMat, doorU + DW / 2 + 0.35, 1.35, 0.008);

    // A corkboard of crayon drawings between the north windows
    const artTex = canvasTex(1024, 576, (g, w, h) => {
      g.fillStyle = '#c99a62'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(90,55,25,.18)';
      for (let i = 0; i < 1800; i++) g.fillRect(Math.random() * w, Math.random() * h, 3, 3);
      const crayon = (col, width = 7) => { g.strokeStyle = col; g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round'; };
      const paper = (x, y, pw, ph, rot, draw) => {
        g.save(); g.translate(x + pw / 2, y + ph / 2); g.rotate(rot);
        g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(-pw / 2 + 5, -ph / 2 + 6, pw, ph);
        g.fillStyle = '#fffdf7'; g.fillRect(-pw / 2, -ph / 2, pw, ph);
        g.translate(-pw / 2, -ph / 2); draw(pw, ph);
        g.fillStyle = '#e04848'; g.beginPath(); g.arc(pw / 2, 12, 8, 0, TAU); g.fill();
        g.restore();
      };
      // a sunny house
      paper(40, 50, 280, 220, -0.05, (pw, ph) => {
        crayon('#ffd400'); g.beginPath(); g.arc(225, 55, 26, 0, TAU); g.stroke();
        for (let a = 0; a < 8; a++) { g.beginPath(); g.moveTo(225 + Math.cos(a * 0.785) * 34, 55 + Math.sin(a * 0.785) * 34); g.lineTo(225 + Math.cos(a * 0.785) * 48, 55 + Math.sin(a * 0.785) * 48); g.stroke(); }
        crayon('#d7263d'); g.strokeRect(60, 115, 100, 80);
        g.beginPath(); g.moveTo(50, 118); g.lineTo(110, 70); g.lineTo(170, 118); g.stroke();
        crayon('#7a4a2a'); g.strokeRect(97, 155, 26, 40);
        crayon('#2e9e4f'); g.beginPath(); g.moveTo(10, 200); g.lineTo(270, 200); g.stroke();
      });
      // a rainbow
      paper(370, 40, 300, 200, 0.04, (pw, ph) => {
        ['#e63946', '#ff8c1a', '#ffd400', '#3cb371', '#1e6fd9', '#8e44ad'].forEach((c, i) => { crayon(c, 11); g.beginPath(); g.arc(150, 180, 120 - i * 13, Math.PI, 0); g.stroke(); });
        crayon('#9ec9ff', 9); g.beginPath(); g.arc(40, 170, 18, 0, TAU); g.stroke(); g.beginPath(); g.arc(262, 170, 18, 0, TAU); g.stroke();
      });
      // a cat
      paper(720, 60, 250, 230, -0.03, (pw, ph) => {
        crayon('#ff8c1a'); g.beginPath(); g.arc(125, 135, 55, 0, TAU); g.stroke();
        g.beginPath(); g.moveTo(80, 100); g.lineTo(85, 55); g.lineTo(110, 82); g.moveTo(140, 82); g.lineTo(165, 55); g.lineTo(170, 100); g.stroke();
        crayon('#222', 6); g.beginPath(); g.arc(105, 125, 5, 0, TAU); g.arc(145, 125, 5, 0, TAU); g.stroke();
        g.beginPath(); g.moveTo(115, 150); g.quadraticCurveTo(125, 160, 135, 150); g.stroke();
      });
      // flowers
      paper(120, 320, 330, 210, 0.05, (pw, ph) => {
        ['#e05aa8', '#8e44ad', '#ff5050', '#1e90ff'].forEach((c, i) => {
          const x = 50 + i * 75, y = 85 + (i % 2) * 20;
          crayon('#2e9e4f'); g.beginPath(); g.moveTo(x, y + 20); g.lineTo(x, 195); g.stroke();
          crayon(c); for (let a = 0; a < 5; a++) { g.beginPath(); g.arc(x + Math.cos(a * 1.256) * 18, y + Math.sin(a * 1.256) * 18, 12, 0, TAU); g.stroke(); }
          crayon('#ffd400'); g.beginPath(); g.arc(x, y, 6, 0, TAU); g.stroke();
        });
      });
      // scribbles, a fish and a sorted crayon list
      paper(520, 300, 230, 240, -0.06, (pw, ph) => {
        crayon('#1e90ff'); g.beginPath(); g.ellipse(110, 120, 70, 40, 0, 0, TAU); g.stroke();
        g.beginPath(); g.moveTo(178, 120); g.lineTo(215, 90); g.lineTo(215, 150); g.closePath(); g.stroke();
        crayon('#222', 6); g.beginPath(); g.arc(75, 110, 5, 0, TAU); g.stroke();
        crayon('#00b3a4', 5); for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(160 - k * 30, 50 - k * 6, 6 + k, 0, TAU); g.stroke(); }
      });
      paper(790, 330, 190, 210, 0.07, (pw, ph) => {
        SHADES.slice(0, 18).forEach((s, i) => { crayon(s.hex, 8); const y = 40 + (i % 9) * 18, x = i < 9 ? 20 : 105; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 65, y); g.stroke(); });
      });
    });
    part('north', box(3.7, 2.1, 0.06), beamMat, 0, 2.95, 0.03, true);
    part('north', new T.PlaneGeometry(3.5, 1.9), new T.MeshStandardMaterial({ map: artTex, roughness: 0.9 }), 0, 2.95, 0.062);

    // Ceiling beams and pendant lamps
    for (const x of [-9, -3, 3, 9]) {
      const b = new T.Mesh(box(0.32, 0.34, HALF * 2), beamMat);
      b.position.set(x, WALL_H - 0.17, 0);
      scene.add(b);
    }
    const cordMat = new T.MeshBasicMaterial({ color: 0x3a2e2a });
    const shadeMat = new T.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.5, side: T.DoubleSide });
    const bulbMat = new T.MeshBasicMaterial({ color: 0xfff3c8 });
    for (const [x, z] of [[-6, -6], [6, -6], [-6, 6], [6, 6], [0, 0]]) {
      const cord = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 1.0, 6), cordMat);
      cord.position.set(x, WALL_H - 0.5, z);
      scene.add(cord);
      const shade = new T.Mesh(new T.CylinderGeometry(0.14, 0.45, 0.36, 24, 1, true), shadeMat);
      shade.position.set(x, WALL_H - 1.15, z);
      scene.add(shade);
      const bulb = new T.Mesh(new T.SphereGeometry(0.12, 14, 10), bulbMat);
      bulb.position.set(x, WALL_H - 1.25, z);
      scene.add(bulb);
    }
  }

  // ---------------------------------------------------------------------------
  // Crayons: one instanced mesh for thousands of crayons
  // ---------------------------------------------------------------------------
  // Wrapper artwork adapted from "crayons w/ box" by Fine_poultry (Sketchfab, CC BY 4.0).
  // It is a grayscale mask, so each instance's shade color tints it.
  const WRAPPER_URI = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/wAALCAEAAEABAREA/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEBAAA/APsjzYv+eif99CjzYv8Anon/AH0KPNi/56J/30KPNi/56J/30KPOi/56J/30KPNi/wCeif8AfQo82P8A56J/30KPNi/56J/30K+Bv+GO/i5/0MHhv/wOn/8AjVL/AMMd/Fz/AKGDw1/4HT//ABqk/wCGO/i5/wBDB4b/APA+f/41R/wx38XP+hg8N/8AgdP/APGqX/hjv4uf9DB4a/8AA6f/AONUn/DHfxc/6GDw3/4Hz/8Axul/4Y7+Ln/QweG//A6f/wCNUf8ADHfxc/6GDw1/4Hz/APxqvp1v2l/ggP8Ame7c/Syuf/jdRt+058EF/wCZ3jP0sLn/AON1G37UPwQH/M55+mnXP/xuo2/am+CA/wCZvkP0025/+IqJv2q/giP+ZquD9NMuP/iKjP7V/wAEx08S3h+ml3H/AMTTT+1j8FR08QXx+mlz/wDxNNb9rP4Lj/mN6ifppk3+Fcsv7FPw6H3vEvio/wDbWD/43Ui/sWfDUdfEHio/9vEH/wAaqRf2LvhgOut+Kz/29Q//ABqpF/Yx+FY66t4rP/b5D/8AGqkX9jP4UDrqHio/W+i/+NVIP2NvhKP+XvxOf+3+P/43Tl/Y5+EY6zeJD9b9P/jdPX9jz4QjqfELfXUB/wDEV9D0UUUUUUUUUUUUUUUUUVg+MvGHhrwfZJeeI9Xt9PjkO2MPkvIe4VQCzfgKd4O8XeHPF9g174d1a31CJG2ybCQ8Z9GU4K/iK3KKKKKp63qVno+kXeq38oitbSFp5nPZVGTXwH8R/F+peN/Ft3r+ouw81itvCTkW8I+6g9OOvqSTT/hl4y1HwL4utddsWdo1IS7gBwLiEn5kPv3HoQK++9Iv7XVNLtdSsZRNa3UKzQuP4kYZB/I1aooorwz9sXxK2meBLTw9BJtm1i4/egH/AJYxYZh+LFB+dfI9FfX37H3iU6r8PJ9CnkLT6NceWgP/ADxkyyfkd4/AV7bRRRXxn+1vrZ1P4syaer5i0q0jtwB03t+8b/0JR+FeQUV7L+yFrR074qNpjNiLVbKSLBPBdP3i/jgOPxr7GoooPSvzy+IuqHW/Huv6tnK3WozOh/2d5C/oBWDRXR/C/Vf7E+I3h7VN21YNRh3nP8DMFb9GNfoQOlFFZniy+/szwvquo5x9lspps/7qE/0r85wSwDN94jJ+tFFAdoz5inDJ8yn3HIr9HPDt7/aOgafqAORdWsUwP+8gP9av0Vw3x+uzZfBvxRODgmwaIf8AAyE/9mr4NPWur8J/D/xH4k0ttVs10+1sBKYUuL+9S2SRx1VC33iO+OlU/GXhDXPCctqurwQeTdoXtrm2nWeCYKcNtdeCQeo6isDrxX3v8Dbw3/wh8LXDHJ/s2JCfdBt/9lrtKK8r/aruTB8FdVQHHnzW8X1zKp/pXxRXa69daTrfws0ALqkcGpeH1mtZNNlU5uElmMgmiOMEjdhgeflHtlfFV1pOn/DbQvC1jq0Oq3f22XVbp4EIitDJEqLACercFmxwDXE19u/suXH2j4JaGuc+SZ4vymf/ABr06ivGf2w5NnwiVc/6zU7df/Qj/SvjqvXZPHfjDwx8KPBg8L6olrp7JdQ3UqRRSOLoTu3lNuUlQI2Rh67jz0rh/GHjvxZ4ttoLbxFq730VvIZIlaGNNrEYz8ijtXNV9lfshS+Z8Hol/wCeeoXK/wDjwP8AWvYaK8R/bNbHwtsl/vavF/6Lkr5Cr1nwf4d8Of2H4dk1HQTfJNpt/wCIL+7eZ1DpbGRFtFA4CllQufvHcB0rC8bw6VqvgHR/F9p4ds/Dt5PqM9hLa2e8QXCJGriVFYkggsUOOCa4OvsL9jhs/CaYf3dVnH/jqGvaaK8Q/bOGfhfYH01eL/0XLXyHXrHwz8daJ4Y8MRWX/CZeOdMuJGaS4trCytJrZXJPKebkjIxnpzWl4z1HTPFNhpGq+IvHfiTU/CU1xNbRM2nW6XVjeqq8SKoCtGY2LZXnjpXlXjDQ5/DXinU9AuZUllsLhoTIgwrgchh6ZBBx719Wfsbgj4UXB9dWn/8AQI69qorxb9shN3wmgf8AuarAfzVx/Wvj2vXvhtoHh3UfB9rfav4J0fBd4hqWqeK309bx1b5vLj2n7oIUkcZHrmtXxlq3h3wpoel6Xd/C7TbrSGupL6wntPE0l1azTgKrlnVfnIAUFT2+prxzxJq954g8QX+t6iytd307Ty7RhQT2A7ADAHsK+tv2PUK/CHcR9/U7hv8A0Ef0r2WivI/2toPO+DV4+P8AU3ltJ/5E2/8As1fGFeoaNo2keM/Bmgwapf6zolzo8M1rHImh3F7b3cTTNIHRoh8rAsysO+BVL4iRWGg+CtL8JaU+qX8EeozahPqF3pktnG0rxqgiiSQZwFXJPc155X2r+yjB5PwW0x8f66e4k/8AIrD+lerUV53+0jbfavgp4kUDJjt0mH/AJEb+QNfDB617X4dl8d678MfDGn/DrxDJA2mLcxanZw6mlrMkrTF0c72XdGUYYwcA54rkfifpnxNsNPs38d6he3Vq8xFss+qpdASbTkgK7YOM81wQ6192/s72xtPgt4YiIwWs/NP/AAN2b+td9RXO/Eyx/tP4eeIbDGTPptwij38tsfrivz1U5UH1ANBAPUA/UUAAdAB+FDnCMR1ANfoh8P7Eab4G0LT9u02+nQRke4jXP61uUU2aNJYmicZVwVYeoPFfnHr9i+l67qGmSAq9pdSwEHtscr/SqVFaXhbTn1fxNpWlICWvL2GAAf7TgH9M1+i8ahECqAFHAA7CnUUHpXw1+0lo50f4ya4oXEd46XsZx1Eijd/48GrzmivS/wBmTRzq/wAZNHLJuisBJeycdNi4X/x5lr7gooor5p/bW8PN/wASLxTDHkDfYXDAdM/PH/7OPxr5qor6b/Yq8PFLTXfFMqEea6WNu3svzyfqUH4V9IUUUVy3xW8KxeM/AeqaA21Zp4t1s7fwTKdyH/voAH2Jr4CvLa4s7ua0u4WhuIJGjljYYKOpwQfoRTrC0ub++gsbKFp7m4kWKGNRy7scAD8TX6AfDHwvD4O8DaX4eiKs1rCPOcfxyt8zt+LE/hiukooooNeKfG34FW3jTVG1/QLyDTNWlwLlZUJhuMDAY7eVfHGcHPf1qT4IfA218EakNe1y8h1PWEBW3ESEQ22eCy55ZyOMnGBnA717OKKKKKKKKKKKKKKKKKKKKKKKKKKK+IP+G3fEP/Qh6V/4Hyf/ABNH/DbviH/oQ9K/8D5P/iaP+G3fEP8A0Ielf+B8n/xNH/DbviH/AKEPSv8AwPk/+Jo/4bd8Q/8AQh6V/wCB8n/xNH/DbviH/oQ9K/8AA+T/AOJo/wCG3fEP/Qh6V/4Hyf8AxNH/AA274h/6EPSv/A+T/wCJrvR+0R+zd/0LQH/cuRU4ftD/ALNv/QuIP+5cjpR+0N+zX30CMfXw5H/hTh+0J+zV/wBAOEf9y2n+FKP2gv2aT/zBrcf9y2v/AMTTh+0D+zP/ANAm1H/ctj/4mnD4/wD7M3/QMsx/3LY/+Ipw+Pv7Mv8A0D7If9y1/wDYVtH9kf4NH/mGasPpqUlNP7Ivwb/6B+sD/uJP/hSH9kT4OnpZa0P+4k3+FNP7IXwe/wCfXWx/3Ej/APE0h/ZB+D//ADw10f8AcRP/AMTTT+x/8ID/AMs9fH/cR/8Asab/AMMe/CH08Q/+DAf/ABFNP7Hnwi/veIh/3EF/+Ir/2Q==';
  const wrapperTex = new T.TextureLoader().load(WRAPPER_URI);
  wrapperTex.wrapS = T.RepeatWrapping;
  wrapperTex.anisotropy = 4;

  function mergeGeos(parts) {
    const pos = [], nor = [], col = [], uv = [];
    for (const [g0, gray, wrapped] of parts) {
      const g = g0.index ? g0.toNonIndexed() : g0;
      const p = g.attributes.position.array, n = g.attributes.normal.array, t = g.attributes.uv.array;
      for (let i = 0; i < p.length; i++) { pos.push(p[i]); nor.push(n[i]); }
      for (let i = 0; i < p.length / 3; i++) {
        col.push(gray, gray, gray);
        // bare wax samples a plain part of the wrapper (white in the mask)
        if (wrapped) uv.push(t[i * 2], t[i * 2 + 1]); else uv.push(0, 0.5);
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    return g;
  }

  const crayonGeo = (() => {
    // low-poly on purpose: there are tens of thousands of these
    const tipLen = CL * 0.2;
    const body = new T.CylinderGeometry(CR, CR, CL - tipLen, 6, 1, true);
    body.translate(0, -tipLen / 2, 0);
    const base = new T.CircleGeometry(CR, 6);
    base.rotateX(Math.PI / 2);
    base.translate(0, -CL / 2, 0);
    const tip = new T.CylinderGeometry(CR * 0.25, CR, tipLen, 6, 1, false);
    tip.translate(0, CL / 2 - tipLen / 2, 0);
    const wrap = new T.CylinderGeometry(CR * 1.08, CR * 1.08, CL * 0.7, 6, 1, true);
    wrap.translate(0, -CL * 0.06, 0);
    const g = mergeGeos([[body, 1], [base, 0.8], [tip, 1], [wrap, 0.92, true]]);
    g.rotateZ(-Math.PI / 2); // long axis along +X, tip at +X
    g.computeBoundingSphere();
    return g;
  })();

  const crayonMat = new T.MeshStandardMaterial({ map: wrapperTex, vertexColors: true, roughness: 0.55, metalness: 0 });
  const crayonMesh = new T.InstancedMesh(crayonGeo, crayonMat, MAX_CRAYONS);
  crayonMesh.setColorAt(0, new T.Color(1, 1, 1)); // creates the per-instance color buffer
  crayonMesh.count = 0;
  crayonMesh.castShadow = false; // 20,000 shadow casters would be too heavy
  crayonMesh.receiveShadow = true;
  crayonMesh.frustumCulled = false;
  scene.add(crayonMesh);

  // Crayons that are sorted into open boxes stand up in them, tips out, like a real crayon box
  const STORED_MAX = 16000;
  const storedMesh = new T.InstancedMesh(crayonGeo, crayonMat, STORED_MAX);
  storedMesh.setColorAt(0, new T.Color(1, 1, 1));
  storedMesh.count = 0;
  storedMesh.frustumCulled = false;
  storedMesh.receiveShadow = true;
  scene.add(storedMesh);
  let storedDirty = true;
  const STAND_NX = 11, STAND_NZ = 8, STAND_FLOOR = BOX_H - 0.37; // a raised insert so the tips peek over the rim
  // fill from the middle out, so a half-full box looks tidy
  const STAND_SLOTS = [];
  for (let i = 0; i < STAND_NX; i++) for (let k = 0; k < STAND_NZ; k++) {
    const x = (i - (STAND_NX - 1) / 2) * 0.088, z = (k - (STAND_NZ - 1) / 2) * 0.083;
    STAND_SLOTS.push({ x, z, d: Math.hypot(x * 0.75, z) + ((i * 7 + k * 13) % 5) * 0.004 });
  }
  STAND_SLOTS.sort((a, b) => a.d - b.d);
  STAND_SLOTS.forEach((sl, i) => {
    // a little tilt and wobble each, fixed per slot so it doesn't jitter
    const h = Math.sin(i * 12.9898) * 43758.5453;
    const r1 = h - Math.floor(h), r2 = (h * 7.13) - Math.floor(h * 7.13);
    sl.tilt = (r1 - 0.5) * 0.12; sl.tilt2 = (r2 - 0.5) * 0.12; sl.y = r1 * 0.02;
  });
  const _sm = new T.Matrix4(), _sq = new T.Quaternion(), _sq2 = new T.Quaternion(), _se = new T.Euler(), _sp = new T.Vector3(), _ss = new T.Vector3(1, 1, 1);
  const UPRIGHT = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), Math.PI / 2);
  function rebuildStored() {
    storedDirty = false;
    let n = 0;
    for (const b of state.boxes) {
      if (!isBox(b) || !b.count) continue;
      const ry = b.rot * Math.PI / 2, cy = Math.cos(ry), sy = Math.sin(ry);
      const shown = Math.min(b.count, STAND_SLOTS.length);
      for (let i = 0; i < shown && n < STORED_MAX; i++) {
        const sl = STAND_SLOTS[i];
        _sp.set(b.x + sl.x * cy + sl.z * sy, STAND_FLOOR + CL / 2 + sl.y, b.z - sl.x * sy + sl.z * cy);
        _se.set(sl.tilt, ry + i, sl.tilt2);
        _sq.setFromEuler(_se).multiply(UPRIGHT);
        _sm.compose(_sp, _sq, _ss);
        storedMesh.setMatrixAt(n, _sm);
        storedMesh.setColorAt(n, SHADE_COLORS[b.color]);
        n++;
      }
    }
    storedMesh.count = n;
    storedMesh.instanceMatrix.needsUpdate = true;
    if (storedMesh.instanceColor) storedMesh.instanceColor.needsUpdate = true;
  }

  const shadeMats = SHADES.map(s => new T.MeshStandardMaterial({ map: wrapperTex, color: s.hex, vertexColors: true, roughness: 0.55 }));

  // Live floor crayons. Index in this array == instance index.
  let cr = [];
  const animating = new Set();
  let matDirty = false, colDirty = false;
  const _m = new T.Matrix4(), _q = new T.Quaternion(), _p = new T.Vector3(), _v = new T.Vector3(), _s = new T.Vector3(1, 1, 1);
  const XAXIS = new T.Vector3(1, 0, 0);

  function writeMatrix(o) {
    _p.set(o.x, o.y + o.dy, o.z);
    _q.setFromUnitVectors(XAXIS, _v.set(o.ax, o.ay, o.az));
    _m.compose(_p, _q, _s);
    crayonMesh.setMatrixAt(o.i, _m);
    matDirty = true;
  }
  function writeColor(o, color) {
    crayonMesh.setColorAt(o.i, color || SHADE_COLORS[o.c]);
    colDirty = true;
  }

  // Spatial hash so piles can be built and re-settled quickly
  const CELL = 0.2;
  const grid = new Map();
  const cellKey = (ix, iz) => (ix + 1000) * 4000 + (iz + 1000);
  function hashInsert(o) {
    o.k = cellKey(Math.floor(o.x / CELL), Math.floor(o.z / CELL));
    let a = grid.get(o.k);
    if (!a) grid.set(o.k, a = []);
    a.push(o);
  }
  function hashRemove(o) {
    const a = grid.get(o.k);
    if (!a) return;
    const i = a.indexOf(o);
    if (i >= 0) { a[i] = a[a.length - 1]; a.pop(); }
  }
  function forNear(x, z, r, fn) {
    const x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL);
    const z0 = Math.floor((z - r) / CELL), z1 = Math.floor((z + r) / CELL);
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
      const a = grid.get(cellKey(ix, iz));
      if (a) for (let i = 0; i < a.length; i++) fn(a[i]);
    }
  }

  // Height a crayon's center would rest at, at (x, z)
  const CONTACT = 0.095;
  function supportAt(x, z) {
    let top = CR;
    forNear(x, z, CONTACT, o => {
      const dx = o.x - x, dz = o.z - z;
      if (dx * dx + dz * dz < CONTACT * CONTACT) top = Math.max(top, o.y + CR * 1.7);
    });
    return top;
  }
  function topAt(x, z, r = 0.3) {
    let top = 0;
    forNear(x, z, r, o => {
      const dx = o.x - x, dz = o.z - z;
      if (dx * dx + dz * dz < r * r) top = Math.max(top, o.y + CR);
    });
    return top;
  }

  function boxHalf(b) {
    if (isJar(b)) return [JAR_R + 0.02, JAR_R + 0.02];
    if (isBin(b)) return [b.hw, b.hd];
    const w = isDrawer(b) ? DRAWER_W : BOX_W, d = isDrawer(b) ? DRAWER_D : BOX_D;
    return b.rot % 2 ? [d / 2, w / 2] : [w / 2, d / 2];
  }

  function blockedAt(x, z, pad = 0.12) {
    for (const b of state.boxes) {
      if (isBin(b)) continue;   // its cabinet or cart is the solid part
      const [hw, hd] = boxHalf(b);
      if (Math.abs(x - b.x) < hw + pad && Math.abs(z - b.z) < hd + pad) return b;
    }
    for (const d of state.decor) {
      const def = DECOR[d.type];
      if (def.wall || def.under) continue;
      if (d.type === 'shelf' || d.type === 'cabinet') {
        const lx = x - d.x, lz = z - d.z, c = Math.cos(d.ry || 0), sn = Math.sin(d.ry || 0);
        const hw = d.type === 'shelf' ? 1.08 : 1.25;
        if (Math.abs(lx * c - lz * sn) < hw + pad && Math.abs(lx * sn + lz * c) < 0.3 + pad) return d;
      } else if ((x - d.x) ** 2 + (z - d.z) ** 2 < (def.r + pad) ** 2) return d;
    }
    return null;
  }

  function pushOut(x, z) {
    for (let k = 0; k < 6; k++) {
      const b = blockedAt(x, z);
      if (!b) break;
      let dx = x - b.x, dz = z - b.z;
      const l = Math.hypot(dx, dz) || 1;
      dx /= l; dz /= l;
      x += dx * 0.35; z += dz * 0.35;
    }
    return [clamp(x, -HALF + 0.3, HALF - 0.3), clamp(z, -HALF + 0.3, HALF - 0.3)];
  }

  // Let a crayon roll down the side of a pile until it finds a resting spot
  function settlePoint(x, z) {
    [x, z] = pushOut(x, z);
    let y = supportAt(x, z);
    // a step longer than the contact radius, and a drop that gives a steep-ish heap
    for (let k = 0; k < 30; k++) {
      let best = null, by = y;
      for (let j = 0; j < 6; j++) {
        const a = Math.random() * TAU;
        const nx = x + Math.cos(a) * 0.14, nz = z + Math.sin(a) * 0.14;
        if (Math.abs(nx) > HALF - 0.3 || Math.abs(nz) > HALF - 0.3 || blockedAt(nx, nz)) continue;
        const ny = supportAt(nx, nz);
        if (ny < by - 0.1) { by = ny; best = [nx, nz]; }
      }
      if (!best) break;
      [x, z] = best; y = by;
    }
    return [x, y, z];
  }

  function setAxis(o, onPile) {
    const yaw = Math.random() * TAU;
    const tilt = onPile ? rand(-0.35, 0.35) : rand(-0.04, 0.04);
    o.ax = Math.cos(tilt) * Math.cos(yaw);
    o.ay = Math.sin(tilt);
    o.az = -Math.cos(tilt) * Math.sin(yaw);
  }

  function pushCrayon(o) {
    o.i = cr.length;
    hashInsert(o);
    cr.push(o);
    crayonMesh.count = cr.length;
    writeMatrix(o);
    writeColor(o);
    return o;
  }

  function addCrayon(x, z, c, dropFrom = 0, delay = 0) {
    if (cr.length >= MAX_CRAYONS) return null;
    const [sx, sy, sz] = settlePoint(x, z);
    const o = { x: sx, y: sy, z: sz, c, dy: 0, vy: 0, delay: 0 };
    setAxis(o, sy > CR + 0.01);
    if (dropFrom > 0) { o.dy = dropFrom; o.delay = delay; animating.add(o); }
    return pushCrayon(o);
  }

  function removeCrayon(o) {
    if (o.dead) return;
    o.dead = true;
    hashRemove(o);
    animating.delete(o);
    const idx = o.i;
    const last = cr.pop();
    if (last !== o) {
      cr[idx] = last;
      last.i = idx;
      writeMatrix(last);
      writeColor(last);
    }
    crayonMesh.count = cr.length;
    resettle(o.x, o.z, o.y);
  }

  // When a crayon is taken out of a pile, the ones resting on it slide down
  function resettle(x, z, y0) {
    const queue = [[x, z, y0]];
    let guard = 0;
    while (queue.length && guard++ < 250) {
      const [qx, qz, qy] = queue.shift();
      const list = [];
      forNear(qx, qz, 0.16, o => {
        if (o.y > qy + 0.01 && (o.x - qx) ** 2 + (o.z - qz) ** 2 < 0.16 * 0.16) list.push(o);
      });
      list.sort((a, b) => a.y - b.y);
      for (const o of list) {
        hashRemove(o);
        const ny = supportAt(o.x, o.z);
        if (ny < o.y - 0.01) {
          o.dy += o.y - ny;
          o.y = ny;
          animating.add(o);
          queue.push([o.x, o.z, ny]);
        }
        hashInsert(o);
      }
    }
  }

  const randomShade = () => Math.floor(Math.random() * SHADES.length);

  function spawnPile(cx, cz, n) {
    const radius = 0.6 + Math.sqrt(n) * 0.05;
    let placed = 0;
    for (let i = 0; i < n * 3 && placed < n; i++) {
      const r = Math.abs(gauss()) * radius;
      const a = Math.random() * TAU;
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      if (Math.abs(x) > HALF - 0.4 || Math.abs(z) > HALF - 0.4) continue;
      if (addCrayon(x, z, randomShade())) placed++;
    }
    return placed;
  }

  function spawnCarpet(n) {
    for (let i = 0; i < n; i++) addCrayon(rand(-HALF + 0.5, HALF - 0.5), rand(-HALF + 0.5, HALF - 0.5), randomShade());
  }

  // ---------------------------------------------------------------------------
  // Boxes
  // ---------------------------------------------------------------------------
  const cardboard = 0xc99a62;

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  const UI_FONT = '"Fredoka", "Trebuchet MS", sans-serif';
  function drawBoxLabel(b) {
    const c = b.labelCanvas;
    const g = c.getContext('2d');
    const s = SHADES[b.color];
    const full = b.count >= capOf(b);
    g.clearRect(0, 0, c.width, c.height);
    // a chunky paper sign with a marker outline and a hard drop shadow
    g.fillStyle = '#3b2414';
    roundRect(g, 8, 12, c.width - 16, 70, 20); g.fill();
    g.fillStyle = s.hex;
    roundRect(g, 8, 6, c.width - 16, 70, 20); g.fill();
    g.lineWidth = 5; g.strokeStyle = '#3b2414'; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.22)'; roundRect(g, 18, 12, c.width - 36, 18, 9); g.fill();
    const light = luminance(s.hex) > 0.6;
    g.font = `700 42px ${UI_FONT}`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineJoin = 'round';
    if (!light) { g.lineWidth = 6; g.strokeStyle = '#3b2414'; g.strokeText(s.name, c.width / 2, 42, c.width - 40); }
    g.fillStyle = light ? '#3b2414' : '#fff';
    g.fillText(s.name, c.width / 2, 42, c.width - 40);
    g.fillStyle = '#3b2414';
    roundRect(g, c.width / 2 - 112, 88, 224, 42, 16); g.fill();
    g.fillStyle = full ? '#4cbf6b' : '#fffaf0';
    roundRect(g, c.width / 2 - 110, 86, 220, 38, 14); g.fill();
    g.lineWidth = 3.5; g.strokeStyle = '#3b2414'; g.stroke();
    g.fillStyle = full ? '#fff' : '#3b2414';
    g.font = `600 26px ${UI_FONT}`;
    g.fillText(full ? (!isBox(b) ? 'FULL' : lvl('autoPack') ? 'Packing…' : 'FULL! Click to pack') : `${b.count} / ${capOf(b)}`, c.width / 2, 106, 206);
    b.labelTex.needsUpdate = true;
  }

  // Shared parts for drawers: there can be hundreds of them
  const drawerGeo = {
    body: new T.BoxGeometry(DRAWER_W, DRAWER_H - 0.02, DRAWER_D),
    front: new T.BoxGeometry(DRAWER_W - 0.08, DRAWER_H - 0.1, 0.04),
    handle: new T.BoxGeometry(0.26, 0.045, 0.05),
    gauge: new T.BoxGeometry(1, 0.035, 0.012),
  };
  drawerGeo.gauge.translate(0.5, 0, 0); // grows from the left
  const handleMat = new T.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.35 });
  const handleFullMat = new T.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.3, metalness: 0.3, emissive: 0x4a3200 });
  const gaugeMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, emissive: 0x555555 });

  function buildDrawer(b) {
    const grp = new T.Group();
    const mat = new T.MeshStandardMaterial({ color: 0xf3ead8, roughness: 0.75, emissive: 0x000000 });
    const body = new T.Mesh(drawerGeo.body, mat);
    body.position.y = DRAWER_H / 2;
    body.castShadow = true; body.receiveShadow = true;
    grp.add(body);
    // the drawer front slides out a little when crayons go in
    const front = new T.Group();
    const stripeMat = new T.MeshStandardMaterial({ color: SHADES[b.color].hex, roughness: 0.55 });
    const panel = new T.Mesh(drawerGeo.front, stripeMat);
    front.add(panel);
    const handle = new T.Mesh(drawerGeo.handle, handleMat);
    handle.position.set(0, 0.06, 0.035);
    front.add(handle);
    const gauge = new T.Mesh(drawerGeo.gauge, gaugeMat);
    gauge.position.set(-(DRAWER_W - 0.16) / 2, -0.09, 0.024);
    front.add(gauge);
    front.position.set(0, DRAWER_H / 2, DRAWER_D / 2);
    grp.add(front);
    if (lvl('labels')) {
      const lc = document.createElement('canvas'); lc.width = 256; lc.height = 48;
      const g = lc.getContext('2d');
      g.fillStyle = '#fffdf6'; roundRect(g, 4, 4, 248, 40, 10); g.fill();
      g.lineWidth = 3; g.strokeStyle = '#3b2414'; g.stroke();
      g.fillStyle = '#3b2414'; g.font = `600 28px ${UI_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(SHADES[b.color].name, 128, 25, 236);
      const lab = new T.Mesh(new T.PlaneGeometry(0.4, 0.075), new T.MeshBasicMaterial({ map: new T.CanvasTexture(lc), transparent: true }));
      lab.position.set(0, 0.125, 0.023);
      front.add(lab);
      b.labelMat = lab.material;
    }
    Object.assign(b, { group: grp, mat, stripeMat, front, handle, gauge, openT: 0 });
    scene.add(grp);
    refreshBox(b);
  }

  function buildJar(b) {
    const grp = new T.Group();
    const glass = new T.Mesh(new T.CylinderGeometry(JAR_R, JAR_R, JAR_H - 0.06, 24, 1, true),
      new T.MeshStandardMaterial({ color: 0xdff3ff, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.28, side: T.DoubleSide, depthWrite: false }));
    glass.position.y = (JAR_H - 0.06) / 2;
    grp.add(glass);
    grp.add(mesh(new T.CylinderGeometry(JAR_R, JAR_R, 0.02, 24), new T.MeshStandardMaterial({ color: 0xdff3ff, roughness: 0.1, transparent: true, opacity: 0.5 }), 0, 0.01, 0, false));
    const stripeMat = new T.MeshStandardMaterial({ color: SHADES[b.color].hex, roughness: 0.5, emissive: 0x000000 });
    const lid = mesh(new T.CylinderGeometry(JAR_R + 0.025, JAR_R + 0.025, 0.07, 24), stripeMat, 0, JAR_H - 0.03, 0);
    grp.add(lid);
    // the crayons inside: a stack of upright sticks whose height shows how full it is
    const fillGeo = new T.CylinderGeometry(JAR_R - 0.025, JAR_R - 0.025, 1, 20);
    fillGeo.translate(0, 0.5, 0);
    const fillTex = canvasTex(128, 64, (g, w, h) => {
      g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? 'rgba(0,0,0,.16)' : 'rgba(255,255,255,.2)'; g.fillRect(i * 8, 0, 4, h); }
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, h * 0.18, w, 3); g.fillRect(0, h * 0.78, w, 3);
    });
    const fill = mesh(fillGeo, new T.MeshStandardMaterial({ color: SHADES[b.color].hex, roughness: 0.7, map: fillTex }), 0, 0.02, 0, false);
    grp.add(fill);
    const tips = mesh(new T.ConeGeometry(JAR_R - 0.03, 0.06, 20), new T.MeshStandardMaterial({ color: SHADES[b.color].hex, roughness: 0.6 }), 0, 0, 0, false);
    grp.add(tips);
    b.labelCanvas = document.createElement('canvas');
    b.labelCanvas.width = 320; b.labelCanvas.height = 136;
    b.labelTex = new T.CanvasTexture(b.labelCanvas);
    const sprite = new T.Sprite(new T.SpriteMaterial({ map: b.labelTex, transparent: true }));
    sprite.scale.set(1.15, 0.49, 1);
    sprite.position.y = JAR_H + 0.45;
    grp.add(sprite);
    Object.assign(b, { group: grp, mat: stripeMat, stripeMat, sprite, fill, tips });
    scene.add(grp);
    refreshBox(b);
  }

  // One drawer of a cabinet or cart: built into its parent's group, at a local spot
  const binGeo = { front: new T.BoxGeometry(1, 1, 0.03), gauge: new T.BoxGeometry(1, 0.025, 0.01), knob: new T.SphereGeometry(0.018, 8, 6) };
  binGeo.gauge.translate(0.5, 0, 0);
  function buildBin(b, parentGroup) {
    const grp = new T.Group();
    grp.position.set(b.lx, b.ly, b.lz);
    const stripeMat = new T.MeshStandardMaterial({ color: SHADES[b.color].hex, roughness: 0.55, emissive: 0x000000 });
    const front = new T.Mesh(binGeo.front, stripeMat);
    front.scale.set(b.fw, b.fh, 1);
    front.castShadow = false; front.receiveShadow = true;
    grp.add(front);
    const knob = new T.Mesh(binGeo.knob, handleMat);
    knob.position.set(0, b.fh * 0.12, 0.025);
    grp.add(knob);
    const gauge = new T.Mesh(binGeo.gauge, gaugeMat);
    gauge.position.set(-b.fw * 0.4, -b.fh * 0.3, 0.02);
    grp.add(gauge);
    parentGroup.add(grp);
    Object.assign(b, { group: grp, mat: stripeMat, stripeMat, gauge, knobMesh: knob, front: grp, openT: 0 });
    refreshBox(b);
  }
  // World positions of a cabinet's or cart's drawers, for aiming, tossing and the tote
  function syncBins(d) {
    if (!d.bins) return;
    const c = Math.cos(d.ry || 0), sn = Math.sin(d.ry || 0);
    for (const b of d.bins) {
      b.x = d.x + b.lx * c + b.lz * sn;
      b.z = d.z - b.lx * sn + b.lz * c;
      b.y0 = (d.y || 0) + b.ly - b.fh / 2;
    }
  }
  // Make (or reuse) the drawer objects for a cabinet or cart
  function ensureBins(d, layout) {
    if (!d.bins) {
      d.bins = layout.map((L, i) => {
        const b = { kind: 'bin', color: L.color, count: (d.counts && d.counts[i]) || 0, incoming: 0, level: 0, rot: 0, parent: d, idx: i };
        state.boxes.push(b);
        return b;
      });
      delete d.counts;
    }
    d.bins.forEach((b, i) => Object.assign(b, layout[i], { h: layout[i].fh, hw: 0.13, hd: 0.13 }));
    syncBins(d);
  }
  function checkSet(b) {
    const d = b.parent;
    if (!d || d.type !== 'cabinet') return;
    const fi = SHADES[b.color].family;
    if (!d.sets) d.sets = [];
    if (d.sets[fi]) return;
    if (d.bins.filter(x => SHADES[x.color].family === fi).every(x => x.count >= capOf(x))) {
      d.sets[fi] = true;
      celebrate(`🏆 Complete set: ${FAMILIES[fi].name}!`, 'Every shade of the family is full in your cabinet.');
    }
  }
  function cabinetLayout() {
    // ten columns, one per color family, three shades each, lightest on top
    const out = [];
    for (let f = 0; f < 10; f++) for (let k = 0; k < 3; k++) {
      out.push({ color: f * 3 + k, lx: -1.08 + f * 0.24, ly: 1.27 - k * 0.4, lz: 0.26, fw: 0.21, fh: 0.34 });
    }
    return out;
  }
  function cartLayout(fam) {
    return [0, 1, 2].map(k => ({ color: fam * 3 + k, lx: -0.3 + k * 0.3, ly: 0.62, lz: 0.2, fw: 0.26, fh: 0.22 }));
  }

  function buildBox(b) {
    if (isDrawer(b)) { buildDrawer(b); return; }
    if (isJar(b)) { buildJar(b); return; }
    const grp = new T.Group();
    const mat = new T.MeshStandardMaterial({ color: cardboard, roughness: 0.9, emissive: 0x000000 });
    const t = 0.035;
    const parts = [
      [BOX_W, t, BOX_D, 0, t / 2, 0],
      [BOX_W, BOX_H, t, 0, BOX_H / 2, BOX_D / 2 - t / 2],
      [BOX_W, BOX_H, t, 0, BOX_H / 2, -BOX_D / 2 + t / 2],
      [t, BOX_H, BOX_D, BOX_W / 2 - t / 2, BOX_H / 2, 0],
      [t, BOX_H, BOX_D, -BOX_W / 2 + t / 2, BOX_H / 2, 0],
    ];
    for (const [w, h, d, x, y, z] of parts) {
      const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      m.castShadow = true; m.receiveShadow = true;
      grp.add(m);
    }
    // colored stripe all the way round, so you can spot the shade from any side
    const stripeMat = new T.MeshStandardMaterial({ color: SHADES[b.color].hex, roughness: 0.6 });
    for (const [w, d, x, z] of [[BOX_W + 0.012, 0.012, 0, BOX_D / 2], [BOX_W + 0.012, 0.012, 0, -BOX_D / 2], [0.012, BOX_D + 0.012, BOX_W / 2, 0], [0.012, BOX_D + 0.012, -BOX_W / 2, 0]]) {
      const stripe = new T.Mesh(new T.BoxGeometry(w, 0.16, d), stripeMat);
      stripe.position.set(x, BOX_H * 0.62, z);
      grp.add(stripe);
    }
    // a raised cardboard insert: the crayons you toss in stand on it, tips up
    const insert = new T.Mesh(new T.BoxGeometry(BOX_W - 2 * t, 0.02, BOX_D - 2 * t), mat);
    insert.position.y = STAND_FLOOR - 0.01;
    insert.receiveShadow = true;
    grp.add(insert);
    // floating sign above the box
    b.labelCanvas = document.createElement('canvas');
    b.labelCanvas.width = 320; b.labelCanvas.height = 136;
    b.labelTex = new T.CanvasTexture(b.labelCanvas);
    const sprite = new T.Sprite(new T.SpriteMaterial({ map: b.labelTex, transparent: true }));
    sprite.scale.set(1.15, 0.49, 1);
    sprite.position.y = BOX_H + 0.55;
    grp.add(sprite);
    Object.assign(b, { group: grp, mat, stripeMat, sprite });
    scene.add(grp);
    refreshBox(b);
  }

  function refreshBox(b) {
    storedDirty = true;
    if (isBin(b)) {
      const f = Math.min(1, b.count / capOf(b));
      b.stripeMat.color.set(SHADES[b.color].hex);
      b.gauge.visible = f > 0;
      b.gauge.scale.x = Math.max(0.001, f * b.fw * 0.8);
      b.knobMesh.material = f >= 1 ? handleFullMat : handleMat;
      return;
    }
    b.group.position.set(b.x, boxBase(b), b.z);
    b.group.rotation.y = b.rot * Math.PI / 2;
    const col = SHADES[b.color].hex;
    b.stripeMat.color.set(col);
    if (isJar(b)) {
      const f = Math.min(1, b.count / capOf(b));
      b.fill.visible = f > 0; b.tips.visible = f > 0;
      const hgt = Math.max(0.001, f * (JAR_H - 0.2));
      b.fill.scale.y = hgt; b.tips.position.y = 0.02 + hgt + 0.03;
      b.fill.material.color.set(col); b.tips.material.color.set(col);
      drawBoxLabel(b);
      return;
    }
    if (isDrawer(b)) {
      const f = Math.min(1, b.count / capOf(b));
      b.gauge.visible = f > 0;
      b.gauge.scale.x = Math.max(0.001, f * (DRAWER_W - 0.16));
      b.handle.material = f >= 1 ? handleFullMat : handleMat;
      return;
    }
    drawBoxLabel(b);
  }

  function addBox(x, z, color, rot = 0, count = 0, kind = 'box', level = 0) {
    const b = { x, z, color, rot, count, incoming: 0, kind, level };
    state.boxes.push(b);
    buildBox(b);
    return b;
  }

  // Drawers that share a spot form a stack. Close any gaps so nothing floats.
  const sameSpot = (a, b) => Math.abs(a.x - b.x) < 0.02 && Math.abs(a.z - b.z) < 0.02;
  function stackAt(x, z, except) {
    return state.boxes.filter(b => isDrawer(b) && b !== except && !(placing && placing.obj === b) && sameSpot(b, { x, z }));
  }
  function restack() {
    const seen = new Set();
    for (const b of state.boxes) {
      if (!isDrawer(b) || seen.has(b) || (placing && placing.obj === b)) continue;
      const st = stackAt(b.x, b.z).sort((p, q) => p.level - q.level);
      st.forEach((d, i) => { seen.add(d); if (d.level !== i) { d.level = i; refreshBox(d); } });
    }
  }
  const openDrawers = new Set();
  function bumpDrawer(b) { b.openT = 1; openDrawers.add(b); }
  function updateDrawers(dt) {
    for (const b of openDrawers) {
      b.openT = Math.max(0, b.openT - dt * 2.2);
      b.front.position.z = DRAWER_D / 2 + Math.sin(Math.min(1, b.openT) * Math.PI) * 0.16;
      if (!b.openT) openDrawers.delete(b);
    }
  }

  const shelfUsed = d => d.packed.filter(c => c != null).length;
  function packBox(b) {
    if (!isBox(b) || b.count < capacity()) return;
    // the nearest shelf unit with room gets the packed box
    let shelf = null, bd = Infinity;
    for (const d of state.decor) {
      if (d.type !== 'shelf' || shelfUsed(d) >= SHELF_CAP) continue;
      const dist = (d.x - b.x) ** 2 + (d.z - b.z) ** 2;
      if (dist < bd) { bd = dist; shelf = d; }
    }
    if (!shelf) {
      toast('No shelf space! Place a Shelf Unit (E → Furniture) to store packed boxes.');
      return;
    }
    const gap = shelf.packed.findIndex((c, i) => c == null && !(carry && carry.shelf === shelf && carry.slot === i));
    if (gap >= 0) shelf.packed[gap] = b.color; else shelf.packed.push(b.color);
    rebuildDecor(shelf);
    b.count = 0;
    b.packed = (b.packed || 0) + 1;
    refreshBox(b);
    blip(520, 0.12, 'square', 0.04); setTimeout(() => blip(780, 0.15, 'square', 0.04), 90);
    toast(`Packed a box of ${SHADES[b.color].name} onto a shelf.`);
    save();
  }

  const plankMat = new T.MeshStandardMaterial({ color: 0xa8703f, roughness: 0.7 });
  const rugTex = canvasTex(512, 330, (g, w, h) => {
    g.fillStyle = '#f3e3c3'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#c4566b'; g.lineWidth = 10; g.strokeRect(24, 24, w - 48, h - 48);
    g.strokeStyle = '#7fbf9b'; g.lineWidth = 6; g.strokeRect(44, 44, w - 88, h - 88);
    const cols = ['#e88a8a', '#f6d38b', '#7fbf9b', '#7fbfe0'];
    for (let i = 0; i < 6; i++) for (let k = 0; k < 3; k++) {
      g.fillStyle = cols[(i + k) % 4];
      g.beginPath(); const x = 95 + i * 64, y = 95 + k * 70;
      g.moveTo(x, y - 22); g.lineTo(x + 22, y); g.lineTo(x, y + 22); g.lineTo(x - 22, y); g.fill();
    }
  });
  const easelTex = canvasTex(256, 192, (g, w, h) => {
    g.fillStyle = '#fffdf6'; g.fillRect(0, 0, w, h);
    g.lineCap = 'round'; g.lineWidth = 7;
    [['#7fbfe0', 20, 30, 236, 30], ['#7fbfe0', 20, 48, 236, 48]].forEach(([c, x1, y1, x2, y2]) => { g.strokeStyle = c; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); });
    g.strokeStyle = '#2e9e4f'; g.lineWidth = 10; g.beginPath(); g.moveTo(10, 170); g.quadraticCurveTo(128, 130, 246, 170); g.stroke();
    g.fillStyle = '#ffd400'; g.beginPath(); g.arc(200, 55, 22, 0, TAU); g.fill();
    g.strokeStyle = '#d7263d'; g.lineWidth = 6; g.strokeRect(70, 95, 70, 55);
    g.beginPath(); g.moveTo(62, 98); g.lineTo(105, 65); g.lineTo(148, 98); g.stroke();
  });

  // ---------------------------------------------------------------------------
  // Decorations
  // ---------------------------------------------------------------------------
  const std = (color, extra) => new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.8 }, extra || {}));
  function mesh(geo, mat, x = 0, y = 0, z = 0, shadow = true) {
    const m = new T.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = shadow; m.receiveShadow = true;
    return m;
  }

  // ---------------------------------------------------------------------------
  // 3D models from Sketchfab (CC BY, credited in the help card), embedded in
  // models.js so the game still runs from a plain file. Anything that fails to
  // load falls back to the simple built-in shapes.
  // ---------------------------------------------------------------------------
  const MODEL_SPECS = {
    teddy:     { src: 'teddy',  h: 0.42, rot: [Math.PI / 2, 0, 0] },
    duck:      { src: 'duck',   h: 0.17 },
    rocket:    { src: 'rocket', h: 0.46, skipFlat: true },
    plant:     { src: 'plants', h: 1.05, keep: ['Pot_1'] },
    tallplant: { src: 'plants', h: 1.95, keep: ['Pot_10'] },
  };
  for (const L of 'CRAYSOT') MODEL_SPECS['block' + L] = { src: 'blocks', h: 0.17, keep: [L + '_low'] };
  const gltfCache = {}, MODELS = {};
  function parseGLB(name) {
    if (gltfCache[name]) return gltfCache[name];
    const b64 = (window.CRAY_MODELS || {})[name];
    if (!b64 || !T.GLTFLoader) return Promise.reject(new Error('no model ' + name));
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
    return (gltfCache[name] = new Promise((res, rej) => new T.GLTFLoader().parse(bin, '', g => res(g.scene), rej)));
  }
  function prepModel(root, spec) {
    root.updateMatrixWorld(true);
    const full = new T.Box3().setFromObject(root).getSize(new T.Vector3());
    const inner = new T.Group();
    root.traverse(o => {
      if (!o.isMesh) return;
      if (spec.keep) { let q = o, ok = false; for (; q; q = q.parent) if (spec.keep.includes(q.name)) ok = true; if (!ok) return; }
      if (spec.skipFlat) {   // drop a display base plate: a thin slab nearly as wide as the whole model
        const ob = new T.Box3().setFromObject(o).getSize(new T.Vector3());
        if (ob.y < full.y * 0.12 && Math.max(ob.x, ob.z) > Math.max(full.x, full.z) * 0.6) return;
      }
      const mats = (Array.isArray(o.material) ? o.material : [o.material]).map(m0 => {
        const m = m0.clone();
        // the room renders in linear color, so keep textures and colors as they were painted
        if (m.map) { m.map.encoding = T.LinearEncoding; m.map.needsUpdate = true; }
        if (m.color) m.color.convertLinearToSRGB();
        m.metalness = 0; m.roughness = Math.max(0.6, m.roughness || 0);
        if (m.transparent || (m.map && m.alphaTest > 0)) { m.transparent = false; m.alphaTest = 0.5; m.side = T.DoubleSide; }
        return m;
      });
      const mm = new T.Mesh(o.geometry, mats.length > 1 ? mats : mats[0]);  // plain mesh, even for skinned ones
      mm.applyMatrix4(o.matrixWorld);
      mm.castShadow = !mats[0].alphaTest; mm.receiveShadow = true;
      inner.add(mm);
    });
    if (spec.rot) inner.rotation.set(...spec.rot);
    const wrap = new T.Group(); wrap.add(inner);
    const out = new T.Group(); out.add(wrap);
    out.updateMatrixWorld(true);
    const sz = new T.Box3().setFromObject(out).getSize(new T.Vector3());
    wrap.scale.setScalar(spec.h / (sz.y || 1));
    out.updateMatrixWorld(true);
    const bb = new T.Box3().setFromObject(out);   // then sit the base on y = 0, centered
    wrap.position.set(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
    return out;
  }
  function loadModels() {
    const jobs = Object.entries(MODEL_SPECS).map(([id, spec]) =>
      parseGLB(spec.src).then(root => { MODELS[id] = prepModel(root, spec); }).catch(() => {}));
    return Promise.race([Promise.all(jobs), new Promise(r => setTimeout(r, 8000))]);
  }
  // Adds a copy of a model to a group. Returns false when it isn't available.
  function addModel(g, id, x = 0, y = 0, z = 0, ry = 0, scale = 1) {
    const m = MODELS[id];
    if (!m) return false;
    const c = m.clone();
    c.position.set(x, y, z); c.rotation.y = ry; c.scale.setScalar(scale);
    g.add(c);
    return true;
  }

  let lampLights = 0;
  function buildDecor(d) {
    const g = new T.Group();
    let update = null;
    switch (d.type) {
      case 'shelf': {
        if (!d.packed) d.packed = [];
        const wood = plankMat;
        for (const y of [0.05, 0.75, 1.45, 2.1]) g.add(mesh(new T.BoxGeometry(2.1, 0.06, 0.55), wood, 0, y, 0));
        for (const x of [-1.03, 1.03]) g.add(mesh(new T.BoxGeometry(0.06, 2.15, 0.55), wood, x, 1.07, 0));
        g.add(mesh(new T.BoxGeometry(2.1, 2.15, 0.03), std(0x8a5a35), 0, 1.07, -0.26));
        d.packed.forEach((c, i) => {
          if (c == null || (carry && carry.shelf === d && carry.slot === i)) return;
          const level = Math.floor(i / 4), slot = i % 4;
          const pb = new T.Group();
          pb.add(mesh(new T.BoxGeometry(0.44, 0.5, 0.44), std(cardboard, { roughness: 0.9 })));
          pb.add(mesh(new T.BoxGeometry(0.08, 0.505, 0.445), std(0xe9d7b5, { roughness: 0.4 }), 0, 0, 0, false));
          pb.add(mesh(new T.PlaneGeometry(0.3, 0.16), std(SHADES[c].hex, { roughness: 0.6 }), 0, 0.05, 0.222, false));
          pb.position.set(-0.75 + slot * 0.5, 0.33 + level * 0.7, 0);
          g.add(pb);
        });
        break;
      }
      case 'plant': {
        if (addModel(g, 'plant')) break;
        g.add(mesh(new T.CylinderGeometry(0.26, 0.19, 0.42, 16), std(0xd16d3c), 0, 0.21, 0));
        g.add(mesh(new T.CylinderGeometry(0.27, 0.27, 0.06, 16), std(0xb4582c), 0, 0.42, 0));
        const leaf = std(0x3d9a52), leaf2 = std(0x5cbf6c);
        [[0, 0.75, 0, 0.26], [-0.18, 0.62, 0.05, 0.2], [0.17, 0.66, -0.06, 0.2], [0.05, 0.98, 0.04, 0.18], [-0.08, 0.86, -0.12, 0.17]].forEach(([x, y, z, r], i) => {
          g.add(mesh(new T.SphereGeometry(r, 14, 10), i % 2 ? leaf2 : leaf, x, y, z));
        });
        break;
      }
      case 'rug': {
        [[1.5, 0xc4566b], [1.25, 0xe88a8a], [0.95, 0xf6d38b], [0.6, 0x7fbf9b]].forEach(([r, c], i) => {
          const m = mesh(new T.CylinderGeometry(r, r, 0.012, 40), std(c, { roughness: 1 }), 0, 0.006 + i * 0.002, 0, false);
          m.scale.z = 0.66;
          g.add(m);
        });
        break;
      }
      case 'lamp': {
        g.add(mesh(new T.CylinderGeometry(0.22, 0.25, 0.05, 20), std(0x5b4636), 0, 0.025, 0));
        g.add(mesh(new T.CylinderGeometry(0.025, 0.025, 1.6, 8), std(0x5b4636), 0, 0.8, 0));
        g.add(mesh(new T.CylinderGeometry(0.18, 0.32, 0.36, 20, 1, true), std(0xffd98a, { emissive: 0xffc560, emissiveIntensity: 0.6, side: T.DoubleSide }), 0, 1.66, 0));
        if (lampLights < 4) {
          lampLights++;
          const pl = new T.PointLight(0xffd59a, 0.7, 7, 2);
          pl.position.set(0, 1.55, 0);
          g.add(pl);
        }
        break;
      }
      case 'beanbag': {
        const m1 = mesh(new T.SphereGeometry(0.6, 24, 16), std(0x6a8fd6, { roughness: 0.95 }), 0, 0.3, 0);
        m1.scale.set(1, 0.55, 1);
        g.add(m1);
        const m2 = mesh(new T.SphereGeometry(0.4, 20, 14), std(0x86a8ea, { roughness: 0.95 }), -0.08, 0.55, -0.15);
        m2.scale.set(1, 0.6, 0.8);
        g.add(m2);
        break;
      }
      case 'fishbowl': {
        const wood = std(0x7a5235);
        g.add(mesh(new T.BoxGeometry(0.8, 0.05, 0.6), wood, 0, 0.6, 0));
        for (const [x, z] of [[-0.35, -0.25], [0.35, -0.25], [-0.35, 0.25], [0.35, 0.25]]) g.add(mesh(new T.BoxGeometry(0.05, 0.6, 0.05), wood, x, 0.3, z));
        g.add(mesh(new T.SphereGeometry(0.27, 24, 16), new T.MeshStandardMaterial({ color: 0x7fc8ff, transparent: true, opacity: 0.45, roughness: 0.1 }), 0, 0.9, 0, false));
        const fish = new T.Group();
        const fb = mesh(new T.SphereGeometry(0.07, 12, 8), std(0xff8a12, { emissive: 0x331100 }), 0, 0, 0, false);
        fb.scale.set(1.4, 0.8, 0.6);
        fish.add(fb);
        const tail = mesh(new T.ConeGeometry(0.05, 0.08, 8), std(0xff8a12), -0.12, 0, 0, false);
        tail.rotation.z = Math.PI / 2;
        fish.add(tail);
        fish.position.y = 0.88;
        g.add(fish);
        update = t => { fish.position.x = Math.sin(t * 0.9) * 0.12; fish.position.z = Math.cos(t * 0.9) * 0.08; fish.rotation.y = -t * 0.9 + Math.PI; };
        break;
      }
      case 'catbed': {
        const bed = mesh(new T.CylinderGeometry(0.6, 0.55, 0.22, 28), std(0xb36a8f, { roughness: 1 }), 0, 0.11, 0);
        bed.scale.z = 0.75;
        g.add(bed);
        const cush = mesh(new T.CylinderGeometry(0.48, 0.48, 0.06, 28), std(0xf2c4d8, { roughness: 1 }), 0, 0.23, 0, false);
        cush.scale.z = 0.75;
        g.add(cush);
        const fur = std(0xf0a046, { roughness: 1 });
        const cat = new T.Group();
        const body = mesh(new T.SphereGeometry(0.26, 18, 12), fur, 0.05, 0, 0);
        body.scale.set(1.2, 0.6, 0.85);
        cat.add(body);
        cat.add(mesh(new T.SphereGeometry(0.14, 16, 12), fur, -0.3, 0.02, 0.06));
        const e1 = mesh(new T.ConeGeometry(0.05, 0.1, 8), fur, -0.34, 0.15, 0.0); e1.rotation.z = 0.3; cat.add(e1);
        const e2 = mesh(new T.ConeGeometry(0.05, 0.1, 8), fur, -0.3, 0.14, 0.13); e2.rotation.x = 0.4; cat.add(e2);
        const tailM = mesh(new T.TorusGeometry(0.22, 0.035, 8, 20, Math.PI * 0.9), fur, 0.12, -0.05, 0.05);
        tailM.rotation.x = Math.PI / 2;
        cat.add(tailM);
        cat.position.y = 0.38;
        g.add(cat);
        update = t => { body.scale.y = 0.6 + Math.sin(t * 1.8) * 0.03; };
        break;
      }
      case 'poster': {
        const tex = canvasTex(256, 340, (c, w) => {
          c.fillStyle = '#fffaf2'; c.fillRect(0, 0, w, 340);
          ['#ff6b6b', '#ff8a12', '#ffcc00', '#2fb344', '#1d6fd8', '#8e44ad'].forEach((col, i) => {
            c.strokeStyle = col; c.lineWidth = 16;
            c.beginPath(); c.arc(w / 2, 200, 110 - i * 16, Math.PI, 0); c.stroke();
          });
          c.fillStyle = '#3a2e2a'; c.font = 'bold 30px "Trebuchet MS", sans-serif'; c.textAlign = 'center';
          c.fillText('Every shade', w / 2, 260); c.fillText('has a home', w / 2, 298);
        });
        g.add(mesh(new T.PlaneGeometry(1.0, 1.33), new T.MeshStandardMaterial({ map: tex, roughness: 0.9 }), 0, 0, 0.01, false));
        break;
      }
      case 'clock': {
        const rim = mesh(new T.CylinderGeometry(0.4, 0.4, 0.06, 32), std(0x8a5a35), 0, 0, 0.03, false);
        rim.rotation.x = Math.PI / 2;
        g.add(rim);
        g.add(mesh(new T.CircleGeometry(0.34, 32), std(0xfffaf0), 0, 0, 0.065, false));
        const hand = (len, w) => {
          const p = new T.Group();
          p.add(mesh(new T.BoxGeometry(w, len, 0.01), std(0x3a2e2a), 0, len / 2, 0, false));
          p.position.z = 0.075;
          g.add(p);
          return p;
        };
        const hh = hand(0.18, 0.035), mh = hand(0.27, 0.022);
        update = () => {
          const now = new Date();
          hh.rotation.z = -((now.getHours() % 12) + now.getMinutes() / 60) / 12 * TAU;
          mh.rotation.z = -(now.getMinutes() + now.getSeconds() / 60) / 60 * TAU;
        };
        break;
      }
      case 'window': {
        const sky = canvasTex(256, 200, (c, w, h) => {
          const gr = c.createLinearGradient(0, 0, 0, h);
          gr.addColorStop(0, '#6fbaf0'); gr.addColorStop(1, '#d8f0ff');
          c.fillStyle = gr; c.fillRect(0, 0, w, h);
          c.fillStyle = '#fff';
          [[60, 60], [170, 90]].forEach(([x, y]) => { [0, 22, 44].forEach((o, i) => { c.beginPath(); c.arc(x + o, y - (i === 1 ? 10 : 0), 20, 0, TAU); c.fill(); }); });
          c.fillStyle = '#7ccf73'; c.beginPath(); c.ellipse(w / 2, h + 40, w, 80, 0, 0, TAU); c.fill();
        });
        g.add(mesh(new T.PlaneGeometry(1.7, 1.3), new T.MeshBasicMaterial({ map: sky }), 0, 0, 0.01, false));
        const frame = std(0xfffaf0);
        g.add(mesh(new T.BoxGeometry(1.86, 0.08, 0.08), frame, 0, 0.69, 0.04));
        g.add(mesh(new T.BoxGeometry(1.86, 0.08, 0.08), frame, 0, -0.69, 0.04));
        g.add(mesh(new T.BoxGeometry(0.08, 1.46, 0.08), frame, 0.89, 0, 0.04));
        g.add(mesh(new T.BoxGeometry(0.08, 1.46, 0.08), frame, -0.89, 0, 0.04));
        g.add(mesh(new T.BoxGeometry(0.05, 1.3, 0.05), frame, 0, 0, 0.04));
        g.add(mesh(new T.BoxGeometry(1.7, 0.05, 0.05), frame, 0, 0, 0.04));
        g.add(mesh(new T.BoxGeometry(2.0, 0.08, 0.2), frame, 0, -0.74, 0.1));
        const curtain = std(0xf4b6c2, { roughness: 1 });
        g.add(mesh(new T.BoxGeometry(0.3, 1.7, 0.04), curtain, -1.1, 0.05, 0.08));
        g.add(mesh(new T.BoxGeometry(0.3, 1.7, 0.04), curtain, 1.1, 0.05, 0.08));
        break;
      }
      case 'lights': {
        const cols = [0xff6b6b, 0xffcc00, 0x2fb344, 0x8ecdf7, 0xff6fae, 0xcdb0f7];
        const bulbs = [];
        const n = 16;
        for (let i = 0; i < n; i++) {
          const t = i / (n - 1);
          const x = -1.6 + t * 3.2;
          const y = -Math.sin((t * 2 % 1) * Math.PI) * 0.18 - 0.05;
          const mat = new T.MeshStandardMaterial({ color: cols[i % cols.length], emissive: cols[i % cols.length], emissiveIntensity: 0.8 });
          const b = mesh(new T.SphereGeometry(0.045, 10, 8), mat, x, y, 0.05, false);
          b.scale.y = 1.4;
          g.add(b);
          bulbs.push(mat);
        }
        g.add(mesh(new T.BoxGeometry(3.3, 0.01, 0.01), std(0x4a5a3a), 0, 0, 0.04, false));
        update = t => bulbs.forEach((m, i) => { m.emissiveIntensity = 0.45 + 0.45 * Math.sin(t * 3 + i * 1.7); });
        break;
      }
      case 'table': {
        // a low craft table with an open coloring book and a cup of crayons
        const top = std(0xf6d38b, { roughness: 0.6 });
        g.add(mesh(new T.BoxGeometry(1.6, 0.06, 1.0), top, 0, 0.6, 0));
        g.add(mesh(new T.BoxGeometry(1.64, 0.04, 1.04), std(0x7fbf9b), 0, 0.565, 0));
        for (const [x, z] of [[-0.7, -0.4], [0.7, -0.4], [-0.7, 0.4], [0.7, 0.4]]) g.add(mesh(new T.CylinderGeometry(0.04, 0.035, 0.56, 10), std(0x7fbf9b), x, 0.28, z));
        addTableSheets(d, g);
        const cup = mesh(new T.CylinderGeometry(0.08, 0.07, 0.16, 14, 1, true), std(0x6a8fd6, { side: T.DoubleSide }), 0.6, 0.71, -0.25);
        g.add(cup);
        COLOR_STARTERS.concat([13, 19]).forEach((c, i) => {
          const m = new T.Mesh(crayonGeo, shadeMats[c]);
          m.rotation.set((i - 2) * 0.12, i, Math.PI / 2 - 0.1 * (i % 2));
          m.position.set(0.6 + Math.cos(i * 1.3) * 0.03, 0.78, -0.25 + Math.sin(i * 1.3) * 0.03);
          g.add(m);
        });
        break;
      }
      case 'arearug': {
        g.add(mesh(new T.BoxGeometry(3.4, 0.012, 2.3), std(0x3e6d8e, { roughness: 1 }), 0, 0.006, 0, false));
        g.add(mesh(new T.BoxGeometry(3.1, 0.012, 2.0), new T.MeshStandardMaterial({ map: rugTex, roughness: 1 }), 0, 0.009, 0, false));
        break;
      }
      case 'easel': {
        const wood = std(0xc28a5a);
        for (const [x, rz] of [[-0.32, -0.12], [0.32, 0.12]]) { const l = mesh(new T.BoxGeometry(0.05, 1.8, 0.05), wood, x, 0.88, 0.05); l.rotation.z = rz; l.rotation.x = -0.12; g.add(l); }
        const back = mesh(new T.BoxGeometry(0.05, 1.7, 0.05), wood, 0, 0.82, -0.32); back.rotation.x = 0.3; g.add(back);
        g.add(mesh(new T.BoxGeometry(0.8, 0.05, 0.12), wood, 0, 0.62, 0.12));
        g.add(mesh(new T.BoxGeometry(0.78, 0.6, 0.03), std(0xfffdf6), 0, 0.96, 0.1));
        const pic = new T.Mesh(new T.PlaneGeometry(0.72, 0.54), new T.MeshStandardMaterial({ map: easelTex, roughness: 0.9 }));
        pic.position.set(0, 0.96, 0.117); pic.rotation.x = -0.06;
        g.add(pic);
        break;
      }
      case 'desk': {
        const top = std(0xf3ead8, { roughness: 0.6 }), side = std(0x7fbfe0);
        g.add(mesh(new T.BoxGeometry(1.4, 0.05, 0.7), top, 0, 0.74, 0));
        g.add(mesh(new T.BoxGeometry(0.42, 0.72, 0.66), side, 0.47, 0.36, 0));
        for (const y of [0.18, 0.42, 0.62]) g.add(mesh(new T.BoxGeometry(0.36, 0.16, 0.02), std(0xf6d38b), 0.47, y, 0.34, false));
        for (const z of [-0.3, 0.3]) g.add(mesh(new T.BoxGeometry(0.04, 0.72, 0.04), side, -0.66, 0.36, z));
        g.add(mesh(new T.CylinderGeometry(0.07, 0.06, 0.14, 12, 1, true), std(0xd7263d, { side: T.DoubleSide }), -0.45, 0.83, -0.18));
        [16, 22, 25, 2].forEach((c, i) => {
          const m = new T.Mesh(crayonGeo, shadeMats[c]);
          m.rotation.set((i - 1.5) * 0.15, i, Math.PI / 2);
          m.position.set(-0.45 + (i - 1.5) * 0.02, 0.9, -0.18);
          g.add(m);
        });
        g.add(mesh(new T.BoxGeometry(0.42, 0.01, 0.3), std(0xfffdf6), 0.05, 0.77, 0.05, false));
        break;
      }
      case 'tallplant': {
        if (addModel(g, 'tallplant')) break;
        g.add(mesh(new T.CylinderGeometry(0.28, 0.22, 0.5, 16), std(0xf3ead8), 0, 0.25, 0));
        g.add(mesh(new T.CylinderGeometry(0.03, 0.04, 1.1, 8), std(0x7a5230), 0, 0.95, 0));
        const leaf = std(0x2f7d46), leaf2 = std(0x4fa865);
        [[0, 1.6, 0, 0.35], [-0.22, 1.35, 0.1, 0.28], [0.24, 1.4, -0.08, 0.3], [0.05, 1.15, 0.2, 0.25], [-0.1, 1.85, -0.1, 0.25], [0.15, 1.75, 0.15, 0.22]].forEach(([x, y, z, r], i) => {
          g.add(mesh(new T.SphereGeometry(r, 12, 9), i % 2 ? leaf2 : leaf, x, y, z));
        });
        break;
      }
      case 'coatrack': {
        const wood = std(0x8a5a35);
        g.add(mesh(new T.CylinderGeometry(0.03, 0.035, 1.8, 10), wood, 0, 0.9, 0));
        for (let k = 0; k < 4; k++) { const f = mesh(new T.BoxGeometry(0.5, 0.03, 0.05), wood, 0, 0.03, 0); f.rotation.y = k * Math.PI / 4; g.add(f); }
        for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; g.add(mesh(new T.CylinderGeometry(0.015, 0.015, 0.16, 6), wood, Math.cos(a) * 0.08, 1.7, Math.sin(a) * 0.08)); }
        const scarf = mesh(new T.BoxGeometry(0.12, 0.7, 0.04), std(0xe05aa8, { roughness: 1 }), 0.1, 1.35, 0); g.add(scarf);
        g.add(mesh(new T.CylinderGeometry(0.16, 0.16, 0.12, 16), std(0xf2c14e, { roughness: 0.9 }), -0.08, 1.82, 0));
        g.add(mesh(new T.CylinderGeometry(0.24, 0.24, 0.02, 16), std(0xf2c14e, { roughness: 0.9 }), -0.08, 1.77, 0));
        const coat = mesh(new T.CylinderGeometry(0.14, 0.24, 0.85, 12), std(0x3e6d8e, { roughness: 1 }), 0, 1.22, -0.12); g.add(coat);
        break;
      }
      case 'cabinet': {
        const wood = std(0xf6efe2, { roughness: 0.7 }), trim = std(0xc28a5a);
        g.add(mesh(new T.BoxGeometry(2.5, 1.5, 0.5), wood, 0, 0.75 + 0.06, 0));
        g.add(mesh(new T.BoxGeometry(2.56, 0.06, 0.56), trim, 0, 1.59, 0));
        g.add(mesh(new T.BoxGeometry(2.4, 0.08, 0.46), trim, 0, 0.04, 0));
        ensureBins(d, cabinetLayout());
        d.bins.forEach(b => buildBin(b, g));
        // family name plates under each column
        FAMILIES.forEach((f, fi) => g.add(mesh(new T.BoxGeometry(0.2, 0.05, 0.02), std(f.shades[1][1]), -1.08 + fi * 0.24, 0.3, 0.26, false)));
        break;
      }
      case 'cart': {
        if (d.fam == null) d.fam = 0;
        const metal = std(0x7fb3d5, { roughness: 0.4, metalness: 0.2 }), dark = std(0x333333);
        g.add(mesh(new T.BoxGeometry(0.95, 0.42, 0.42), metal, 0, 0.6, 0));
        g.add(mesh(new T.BoxGeometry(1.0, 0.04, 0.46), std(0xf6efe2), 0, 0.83, 0));
        g.add(mesh(new T.BoxGeometry(0.9, 0.03, 0.4), metal, 0, 0.22, 0));
        for (const [x, z] of [[-0.42, -0.17], [0.42, -0.17], [-0.42, 0.17], [0.42, 0.17]]) {
          g.add(mesh(new T.CylinderGeometry(0.02, 0.02, 0.6, 8), metal, x, 0.5, z));
          const w = mesh(new T.CylinderGeometry(0.06, 0.06, 0.04, 14), dark, x, 0.06, z); w.rotation.x = Math.PI / 2; g.add(w);
        }
        const bar = mesh(new T.CylinderGeometry(0.018, 0.018, 0.9, 8), metal, 0, 1.05, -0.22); bar.rotation.z = Math.PI / 2; g.add(bar);
        ensureBins(d, cartLayout(d.fam));
        d.bins.forEach(b => buildBin(b, g));
        break;
      }
      case 'blocks': {
        const L = [['C', -0.27, 0, 0.1], ['R', -0.09, 0, -0.08], ['A', 0.09, 0, 0.06], ['Y', 0.27, 0, -0.1], ['S', -0.09, 0.17, -0.08], ['O', 0.2, 0, 0.25], ['T', -0.25, 0, 0.3]];
        const cols = [0xd7263d, 0x2e9e4f, 0x1e6fd9, 0xf2c14e, 0x8e44ad, 0xff8c1a, 0xd7263d];
        L.forEach(([l, x, y, z], i) => {
          const ry = (i * 0.7) % 1.2 - 0.6;
          if (!addModel(g, 'block' + l, x, y, z, ry)) {
            const m = mesh(new T.BoxGeometry(0.16, 0.16, 0.16), std(cols[i]), x, y + 0.08, z); m.rotation.y = ry; g.add(m);
          }
        });
        break;
      }
      case 'duck': {
        if (!addModel(g, 'duck', 0, 0, 0, 0, 1.4)) {
          g.add(mesh(new T.SphereGeometry(0.11, 14, 10), std(0xffd21f), 0, 0.1, 0));
          g.add(mesh(new T.SphereGeometry(0.07, 14, 10), std(0xffd21f), 0.06, 0.22, 0));
          const beak = mesh(new T.ConeGeometry(0.03, 0.07, 8), std(0xff8c1a), 0.13, 0.22, 0); beak.rotation.z = -Math.PI / 2; g.add(beak);
        }
        break;
      }
      case 'teddy': {
        if (!addModel(g, 'teddy', 0, 0, 0, 0, 1.3)) {
          g.add(mesh(new T.SphereGeometry(0.16, 14, 10), std(0xb07a4a, { roughness: 1 }), 0, 0.16, 0));
          g.add(mesh(new T.SphereGeometry(0.11, 14, 10), std(0xb07a4a, { roughness: 1 }), 0, 0.4, 0));
        }
        break;
      }
      case 'cubby': {
        const wood = std(0xf3ead8, { roughness: 0.7 });
        g.add(mesh(new T.BoxGeometry(1.6, 1.0, 0.04), wood, 0, 0.5, -0.2));
        for (const x of [-0.78, -0.26, 0.26, 0.78]) g.add(mesh(new T.BoxGeometry(0.04, 1.0, 0.42), wood, x, 0.5, 0));
        for (const y of [0.02, 0.5, 0.98]) g.add(mesh(new T.BoxGeometry(1.6, 0.04, 0.42), wood, 0, y, 0));
        [0xd7263d, 0x1e6fd9, 0xf2c14e, 0x2e9e4f, 0x8e44ad, 0xff8c1a].forEach((c, i) => {
          const x = -0.52 + (i % 3) * 0.52, y = i < 3 ? 0.25 : 0.73;
          g.add(mesh(new T.BoxGeometry(0.44, 0.38, 0.36), std(c, { roughness: 0.9 }), x, y, 0.02));
        });
        break;
      }
      case 'chair': {
        const col = [0xe88a8a, 0x7fbfe0, 0xf2c14e, 0x9ccf8a][Math.abs(Math.round(d.x * 3 + d.z * 7)) % 4];
        const m = std(col, { roughness: 0.6 });
        g.add(mesh(new T.BoxGeometry(0.42, 0.05, 0.42), m, 0, 0.36, 0));
        g.add(mesh(new T.BoxGeometry(0.42, 0.4, 0.05), m, 0, 0.6, -0.19));
        for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) g.add(mesh(new T.CylinderGeometry(0.022, 0.022, 0.36, 8), std(0xa8703f), x, 0.18, z));
        break;
      }
      case 'sofa': {
        const fab = std(0x5aa3a0, { roughness: 0.95 }), fab2 = std(0x6fb9b5, { roughness: 0.95 });
        g.add(mesh(new T.BoxGeometry(2.0, 0.3, 0.9), fab, 0, 0.25, 0));
        for (const x of [-0.47, 0.47]) g.add(mesh(new T.BoxGeometry(0.9, 0.14, 0.72), fab2, x, 0.47, 0.06));
        g.add(mesh(new T.BoxGeometry(2.0, 0.55, 0.2), fab, 0, 0.62, -0.35));
        for (const x of [-0.95, 0.95]) g.add(mesh(new T.BoxGeometry(0.2, 0.5, 0.9), fab, x, 0.4, 0));
        for (const x of [-0.85, 0.85]) for (const z of [-0.35, 0.35]) g.add(mesh(new T.CylinderGeometry(0.03, 0.02, 0.1, 8), std(0x5b4636), x, 0.05, z));
        g.add(mesh(new T.BoxGeometry(0.36, 0.3, 0.12), std(0xf6b7a8, { roughness: 1 }), -0.6, 0.66, -0.2));
        break;
      }
      case 'armchair': {
        const fab = std(0xe0a83c, { roughness: 0.95 });
        g.add(mesh(new T.BoxGeometry(0.95, 0.3, 0.85), fab, 0, 0.25, 0));
        g.add(mesh(new T.BoxGeometry(0.62, 0.14, 0.66), std(0xeebc5a, { roughness: 0.95 }), 0, 0.47, 0.06));
        g.add(mesh(new T.BoxGeometry(0.95, 0.6, 0.2), fab, 0, 0.65, -0.33));
        for (const x of [-0.4, 0.4]) g.add(mesh(new T.BoxGeometry(0.16, 0.48, 0.85), fab, x, 0.4, 0));
        break;
      }
      case 'bookcase': {
        const wood = std(0xc28a5a, { roughness: 0.7 });
        g.add(mesh(new T.BoxGeometry(1.3, 1.85, 0.04), wood, 0, 0.925, -0.18));
        for (const x of [-0.63, 0.63]) g.add(mesh(new T.BoxGeometry(0.04, 1.85, 0.4), wood, x, 0.925, 0));
        const cols = [0xd7263d, 0x1e6fd9, 0xf2c14e, 0x2e9e4f, 0x8e44ad, 0xff8c1a, 0x00b3a4, 0xe05aa8];
        for (let k = 0; k < 4; k++) {
          const y = 0.04 + k * 0.6;
          g.add(mesh(new T.BoxGeometry(1.26, 0.04, 0.38), wood, 0, Math.min(y, 1.83), 0));
          if (k === 3) break;
          let x = -0.56, i = k * 5;
          while (x < 0.5) {
            const w = 0.06 + ((i * 37) % 5) * 0.012, h = 0.3 + ((i * 53) % 4) * 0.04;
            g.add(mesh(new T.BoxGeometry(w, h, 0.26), std(cols[i % cols.length], { roughness: 0.8 }), x + w / 2, y + 0.02 + h / 2, 0.02, false));
            x += w + 0.01; i++;
            if (i % 7 === 3) x += 0.12;
          }
        }
        break;
      }
      case 'toychest': {
        const body = std(0xd9534f, { roughness: 0.7 });
        g.add(mesh(new T.BoxGeometry(1.0, 0.5, 0.55), body, 0, 0.25, 0));
        g.add(mesh(new T.BoxGeometry(1.04, 0.08, 0.59), std(0xf2c14e), 0, 0.53, 0));
        g.add(mesh(new T.BoxGeometry(1.01, 0.08, 0.56), std(0xffffff), 0, 0.3, 0, false));
        if (!addModel(g, 'teddy', 0.22, 0.57, 0.02, 0.3)) {
          g.add(mesh(new T.SphereGeometry(0.12, 14, 10), std(0xb07a4a, { roughness: 1 }), 0.25, 0.68, 0));
          g.add(mesh(new T.SphereGeometry(0.09, 14, 10), std(0xb07a4a, { roughness: 1 }), 0.25, 0.85, 0));
          for (const x of [0.18, 0.32]) g.add(mesh(new T.SphereGeometry(0.035, 8, 6), std(0xb07a4a, { roughness: 1 }), x, 0.93, 0));
        }
        addModel(g, 'rocket', -0.28, 0.57, 0, -0.5, 0.75);
        break;
      }
      case 'sidetable': {
        g.add(mesh(new T.CylinderGeometry(0.3, 0.3, 0.04, 24), std(0xc28a5a), 0, 0.55, 0));
        g.add(mesh(new T.CylinderGeometry(0.04, 0.05, 0.53, 10), std(0x8a5a35), 0, 0.27, 0));
        g.add(mesh(new T.CylinderGeometry(0.18, 0.2, 0.03, 20), std(0x8a5a35), 0, 0.015, 0));
        g.add(mesh(new T.CylinderGeometry(0.06, 0.05, 0.12, 14), std(0xfff7ea), 0.08, 0.63, 0.04));
        addModel(g, 'duck', -0.1, 0.57, -0.06, 0.9);
        break;
      }
    }
    d.group = g;
    d.update = update;
    scene.add(g);
    refreshDecor(d);
  }

  function refreshDecor(d) {
    d.group.position.set(d.x, d.y || 0, d.z);
    d.group.rotation.y = d.ry || 0;
    if (d.bins) syncBins(d);
  }
  function rebuildDecor(d) {
    scene.remove(d.group);
    buildDecor(d);
  }

  // ---------------------------------------------------------------------------
  // Player
  // ---------------------------------------------------------------------------
  const player = { x: 0, z: 9.5, yaw: 0, pitch: -0.3, eye: 1.65 };
  const keys = new Set();
  let locked = false;
  const joy = { x: 0, y: 0 };

  function updatePlayer(dt) {
    let fx = 0, fz = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) fz += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) fz -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) fx += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) fx -= 1;
    fx += joy.x; fz += -joy.y;
    const len = Math.hypot(fx, fz);
    if (len > 0.01) {
      const sp = walkSpeed(lvl('speed')) * (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 1.7 : 1) * Math.min(1, len) / len;
      const sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
      player.x += (fx * cy - fz * sy) * sp * dt;
      player.z += (-fx * sy - fz * cy) * sp * dt;
    }
    player.x = clamp(player.x, -HALF + 0.35, HALF - 0.35);
    player.z = clamp(player.z, -HALF + 0.35, HALF - 0.35);
    // don't walk through boxes
    for (const b of state.boxes) {
      if ((placing && placing.obj === b) || isBin(b)) continue;
      const [hw, hd] = boxHalf(b);
      const dx = player.x - b.x, dz = player.z - b.z;
      const ox = hw + 0.3 - Math.abs(dx), oz = hd + 0.3 - Math.abs(dz);
      if (ox > 0 && oz > 0) {
        if (ox < oz) player.x += Math.sign(dx || 1) * ox; else player.z += Math.sign(dz || 1) * oz;
      }
    }
    // and around furniture
    for (const d of state.decor) {
      const def = DECOR[d.type];
      if (def.wall || def.under || (placing && placing.obj === d)) continue;
      const dx = player.x - d.x, dz = player.z - d.z, l = Math.hypot(dx, dz), min = def.r * 0.85 + 0.25;
      if (l < min && l > 1e-4) {
        if (d.type === 'cart') {
          // walking into the cart rolls it along in front of you
          const push = min - l;
          const nx = clamp(d.x - dx / l * push, -HALF + 0.7, HALF - 0.7), nz = clamp(d.z - dz / l * push, -HALF + 0.7, HALF - 0.7);
          d.x = nx; d.z = nz; refreshDecor(d); syncBins(d); d.moved = true;
          const l2 = Math.hypot(player.x - d.x, player.z - d.z);
          if (l2 < min && l2 > 1e-4) { player.x = d.x + (player.x - d.x) / l2 * min; player.z = d.z + (player.z - d.z) / l2 * min; }
        } else { player.x = d.x + dx / l * min; player.z = d.z + dz / l * min; }
      }
    }
    // wade up onto piles a little
    const target = 1.65 + Math.min(4.6, topAt(player.x, player.z, 0.35)) * 0.92;
    player.eye += (target - player.eye) * Math.min(1, dt * 6);
    camera.position.set(player.x, player.eye, player.z);
    camera.rotation.set(player.pitch, player.yaw, 0);
  }

  // ---------------------------------------------------------------------------
  // Aiming
  // ---------------------------------------------------------------------------
  const raycaster = new T.Raycaster();
  const CENTER = new T.Vector2(0, 0);
  const mouseNDC = new T.Vector2(0, 0);
  let aim = { type: null };

  function rayCrayon(o, d, maxT) {
    let best = null, bt = maxT;
    const ox = o.x, oy = o.y, oz = o.z, dx = d.x, dy = d.y, dz = d.z;
    for (let i = 0; i < cr.length; i++) {
      const c = cr[i];
      if (c.delay > 0 || c.dy > 0.5) continue;
      const cx = c.x - ox, cy = c.y + c.dy - oy, cz = c.z - oz;
      const t0 = cx * dx + cy * dy + cz * dz;
      if (t0 < 0 || t0 > bt + 0.3) continue;
      const perp2 = cx * cx + cy * cy + cz * cz - t0 * t0;
      if (perp2 > 0.09) continue;
      // closest approach between the ray and the crayon's center line
      const wx = c.ax * CL, wy = c.ay * CL, wz = c.az * CL;
      const rx = -cx + wx / 2, ry = -cy + wy / 2, rz = -cz + wz / 2; // ray origin minus segment start
      const b = dx * wx + dy * wy + dz * wz;
      const cc = wx * wx + wy * wy + wz * wz;
      const dd = dx * rx + dy * ry + dz * rz;
      const e = wx * rx + wy * ry + wz * rz;
      const den = cc - b * b;
      let u = den > 1e-9 ? (e - b * dd) / den : 0;
      u = clamp(u, 0, 1);
      const s = b * u - dd;
      if (s < 0) continue;
      const px = rx + dx * s - wx * u, py = ry + dy * s - wy * u, pz = rz + dz * s - wz * u;
      if (px * px + py * py + pz * pz < (CR * 1.6) ** 2 && s < bt) { bt = s; best = c; }
    }
    return best ? { obj: best, t: bt } : null;
  }

  function rayAABB(o, d, lo, hi) {
    let t0 = 0, t1 = Infinity;
    const oo = [o.x, o.y, o.z], dd = [d.x, d.y, d.z];
    for (let k = 0; k < 3; k++) {
      if (Math.abs(dd[k]) < 1e-9) { if (oo[k] < lo[k] || oo[k] > hi[k]) return null; continue; }
      let a = (lo[k] - oo[k]) / dd[k], b = (hi[k] - oo[k]) / dd[k];
      if (a > b) [a, b] = [b, a];
      t0 = Math.max(t0, a); t1 = Math.min(t1, b);
      if (t0 > t1) return null;
    }
    return t0;
  }

  function rayBox(o, d, maxT) {
    let best = null, bt = maxT;
    for (const b of state.boxes) {
      if (placing && placing.obj === b) continue;
      const [hw, hd] = boxHalf(b);
      if (isBin(b) && placing && placing.obj === b.parent) continue;
      const t = !isBox(b)
        ? rayAABB(o, d, [b.x - hw, boxBase(b), b.z - hd], [b.x + hw, boxTopY(b), b.z + hd])
        : rayAABB(o, d, [b.x - hw, 0, b.z - hd], [b.x + hw, BOX_H + 0.85, b.z + hd]);
      if (t !== null && t < bt) { bt = t; best = b; }
    }
    return best ? { obj: best, t: bt } : null;
  }

  function rayDecor(o, d, maxT) {
    let best = null, bt = maxT;
    for (const dc of state.decor) {
      if (placing && placing.obj === dc) continue;
      const def = DECOR[dc.type];
      if (def.under) continue;
      const cy = def.wall ? dc.y : def.cy;
      const cx = dc.x - o.x, cyy = cy - o.y, cz = dc.z - o.z;
      const t0 = cx * d.x + cyy * d.y + cz * d.z;
      if (t0 < 0) continue;
      const perp2 = cx * cx + cyy * cyy + cz * cz - t0 * t0;
      if (perp2 < def.r * def.r && t0 < bt) { bt = t0; best = dc; }
    }
    return best ? { obj: best, t: bt } : null;
  }

  function rugAt(x, z) {
    for (const dc of state.decor) {
      if (!DECOR[dc.type].under) continue;
      const lx = x - dc.x, lz = z - dc.z;
      const c = Math.cos(-(dc.ry || 0)), s = Math.sin(-(dc.ry || 0));
      const rx = lx * c - lz * s, rz = lx * s + lz * c;
      if ((rx / 1.5) ** 2 + (rz / 1.0) ** 2 < 1) return dc;
    }
    return null;
  }

  function rayFloor(o, d) {
    if (d.y >= -1e-4) return null;
    const t = -o.y / d.y;
    const x = o.x + d.x * t, z = o.z + d.z * t;
    if (Math.abs(x) > HALF || Math.abs(z) > HALF) return null;
    return { t, point: new T.Vector3(x, 0, z) };
  }

  function rayWall(o, d) {
    let best = null;
    const tryPlane = (t, ry) => {
      if (t <= 0) return;
      const p = new T.Vector3().copy(o).addScaledVector(d, t);
      if (p.y < 0 || p.y > WALL_H || Math.abs(p.x) > HALF + 0.01 || Math.abs(p.z) > HALF + 0.01) return;
      if (!best || t < best.t) best = { t, point: p, ry };
    };
    if (d.z < 0) tryPlane((-HALF - o.z) / d.z, 0);
    if (d.z > 0) tryPlane((HALF - o.z) / d.z, Math.PI);
    if (d.x < 0) tryPlane((-HALF - o.x) / d.x, Math.PI / 2);
    if (d.x > 0) tryPlane((HALF - o.x) / d.x, -Math.PI / 2);
    return best;
  }

  function updateAim() {
    raycaster.setFromCamera(locked ? CENTER : mouseNDC, camera);
    const o = raycaster.ray.origin, d = raycaster.ray.direction;
    const floor = rayFloor(o, d);
    if (placing) { aim = { type: 'place', floor, wall: rayWall(o, d), box: rayBox(o, d, planner.on ? 60 : 12) }; return; }
    const cands = [];
    const far = planner.on ? 60 : 0;
    const cHit = planner.on || tapeMode.on ? null : rayCrayon(o, d, PICK_DIST);
    if (cHit) cands.push({ type: 'crayon', ...cHit });
    const bHit = rayBox(o, d, far || TOSS_DIST);
    if (bHit) cands.push({ type: 'box', ...bHit });
    const dHit = rayDecor(o, d, far || 8);
    const sHit = planner.on ? null : shelfSlotAt(o, d, 6);
    if (sHit) cands.push({ type: 'decor', ...sHit });
    else if (dHit) cands.push({ type: 'decor', ...dHit });
    if (floor) cands.push({ type: 'floor', t: floor.t, point: floor.point });
    cands.sort((a, b) => a.t - b.t);
    aim = cands[0] || { type: null };
    // paper sheets sit on (or in) other things, so they win unless a crayon or box is in front
    const pgHit = rayPages(4.5);
    if (pgHit && (!['crayon', 'box'].includes(aim.type) || pgHit.t < aim.t)) aim = { type: 'page', ...pgHit };
    // While holding crayons, a crayon of another shade in the way counts as "drop here"
    if (hand.n && aim.type === 'crayon' && aim.obj.c !== hand.c) {
      aim = { type: 'floor', t: aim.t, point: new T.Vector3().copy(o).addScaledVector(d, aim.t) };
    }
    if (aim.type === 'floor') aim.rug = rugAt(aim.point.x, aim.point.z);
    aim.floorHit = floor;
  }

  // ---------------------------------------------------------------------------
  // Hand, tossing, flights
  // ---------------------------------------------------------------------------
  const hand = { c: -1, n: 0 };
  const handGroup = new T.Group();
  handGroup.position.set(0.22, -0.17, -0.42);
  handGroup.scale.setScalar(0.42);
  camera.add(handGroup);
  const handMeshes = [];
  for (let i = 0; i < 9; i++) {
    const m = new T.Mesh(crayonGeo, shadeMats[0]);
    m.visible = false;
    m.rotation.set(0.15, Math.PI / 2 + 0.35, 1.0 + (i - 4) * 0.05);
    m.position.set((i - 4) * 0.035, -Math.abs(i - 4) * 0.008, 0);
    handGroup.add(m);
    handMeshes.push(m);
  }
  function refreshHand() {
    const show = Math.min(hand.n, 9);
    handMeshes.forEach((m, i) => {
      m.visible = i < show;
      if (m.visible) m.material = shadeMats[hand.c];
    });
  }

  function pickUp(first) {
    const n = handSize(lvl('hand'));
    if (hand.n && hand.c !== first.c) return;
    const space = n - hand.n;
    if (space <= 0) { toast(`Your hands are full (${n}). Toss them into a box!`); return; }
    const picked = [first];
    const r = scoop(lvl('hand'));
    if (space > 1) {
      const cands = [];
      forNear(first.x, first.z, r, o => {
        if (o === first || o.c !== first.c || o.delay > 0) return;
        const d2 = (o.x - first.x) ** 2 + (o.z - first.z) ** 2;
        if (d2 < r * r) cands.push([d2 - o.y * 0.2, o]); // prefer crayons near the top
      });
      cands.sort((a, b) => a[0] - b[0]);
      for (let i = 0; i < cands.length && picked.length < space; i++) picked.push(cands[i][1]);
    }
    // take the top-most first so the pile collapses sensibly
    picked.sort((a, b) => b.y - a.y).forEach(removeCrayon);
    hand.c = first.c;
    hand.n += picked.length;
    refreshHand();
    blip(440 + picked.length * 25, 0.07, 'sine', 0.06);
  }

  const flights = [];
  const handWorld = new T.Vector3();
  function startFlight(c, from, to, delay, onLand) {
    const m = new T.Mesh(crayonGeo, shadeMats[c]);
    m.castShadow = true;
    m.visible = false;
    scene.add(m);
    const dist = from.distanceTo(to);
    flights.push({ m, c, from: from.clone(), to: to.clone(), t: -delay, dur: 0.35 + dist * 0.05, h: 0.4 + dist * 0.1, onLand, spin: rand(8, 14) });
  }

  function tossToBox(b) {
    handGroup.getWorldPosition(handWorld);
    const n = hand.n, c = hand.c;
    let warned = false;
    for (let i = 0; i < n; i++) {
      const to = !isBox(b)
        ? new T.Vector3(b.x + rand(-0.08, 0.08), boxBase(b) + (boxTopY(b) - boxBase(b)) * 0.6, b.z + rand(-0.06, 0.06))
        : new T.Vector3(b.x + rand(-0.25, 0.25), BOX_H * 0.6, b.z + rand(-0.18, 0.18));
      startFlight(c, handWorld, to, i * 0.05, () => {
        if (b.color === c && b.count < capOf(b) && state.boxes.includes(b)) {
          b.count++;
          recordSort(c, true);
          refreshBox(b);
          if (isDrawer(b)) bumpDrawer(b);
          if (isBin(b)) checkSet(b);
          blip(620 + Math.random() * 200, 0.06, 'sine', 0.05);
          if (b.count >= capOf(b) && lvl('autoPack')) setTimeout(() => packBox(b), 400);
        } else {
          // bounce off onto the floor next to the box
          const a = Math.random() * TAU;
          addCrayon(b.x + Math.cos(a) * 0.9, b.z + Math.sin(a) * 0.75, c);
          if (!warned) {
            warned = true;
            blip(150, 0.18, 'sawtooth', 0.04);
            toast(b.color !== c ? `Nope! Those are ${SHADES[c].name}, not ${SHADES[b.color].name}.` : isDrawer(b) ? 'That drawer is full! Stack a new one on top.' : !isBox(b) ? `That ${kindName(b)} is full!` : 'That box is full! Click it to pack it up.');
          }
        }
      });
    }
    hand.n = 0; hand.c = -1;
    refreshHand();
  }

  // Take crayons back out of a box or drawer, a handful at a time
  function takeFromBox(b) {
    if (tote.on) { toast('Put the tote away (B) to take crayons out by hand.'); return; }
    if (!b.count) { toast(`That ${kindName(b)} is empty.`); return; }
    if (hand.n && hand.c !== b.color) { toast('Your hands are full of another shade. Drop them first (Q).'); return; }
    const space = handSize(lvl('hand')) - hand.n;
    if (space <= 0) { toast('Your hands are full!'); return; }
    const n = Math.min(space, b.count);
    b.count -= n;
    unsort(b.color, n);
    hand.c = b.color;
    hand.n += n;
    refreshBox(b);
    if (isDrawer(b)) bumpDrawer(b);
    refreshHand();
    blip(380, 0.07, 'sine', 0.05);
  }

  function dropAt(point, quiet = false) {
    handGroup.getWorldPosition(handWorld);
    const c = hand.c;
    for (let i = 0; i < hand.n; i++) {
      const to = point.clone().add(new T.Vector3(rand(-0.25, 0.25), 0, rand(-0.25, 0.25)));
      to.y = Math.max(CR, topAt(to.x, to.z, 0.2));
      startFlight(c, handWorld, to, i * 0.03, () => addCrayon(to.x, to.z, c));
    }
    hand.n = 0; hand.c = -1;
    refreshHand();
    if (!quiet) blip(300, 0.08, 'triangle', 0.04);
  }

  // ---------------------------------------------------------------------------
  // Tote bucket: scoop mixed crayons, and boxes you pass take their own shade
  // ---------------------------------------------------------------------------
  const tote = { on: false, items: [], t: 0 };
  const toteGroup = new T.Group();
  toteGroup.position.set(0.25, -0.3, -0.5);
  toteGroup.rotation.set(0.35, -0.3, 0);
  toteGroup.visible = false;
  camera.add(toteGroup);
  {
    const pail = new T.Mesh(new T.CylinderGeometry(0.13, 0.1, 0.17, 20, 1, true), new T.MeshStandardMaterial({ color: 0x5aa3a0, roughness: 0.5, side: T.DoubleSide }));
    toteGroup.add(pail);
    const rim = new T.Mesh(new T.TorusGeometry(0.13, 0.008, 6, 24), new T.MeshStandardMaterial({ color: 0x3e7d7a, roughness: 0.4 }));
    rim.rotation.x = Math.PI / 2; rim.position.y = 0.085;
    toteGroup.add(rim);
    const handle = new T.Mesh(new T.TorusGeometry(0.12, 0.006, 6, 20, Math.PI), new T.MeshStandardMaterial({ color: 0xd9d4c8, roughness: 0.4 }));
    handle.position.y = 0.085;
    toteGroup.add(handle);
    const bottom = new T.Mesh(new T.CircleGeometry(0.1, 20), pail.material);
    bottom.rotation.x = -Math.PI / 2; bottom.position.y = -0.085;
    toteGroup.add(bottom);
  }
  const toteCrayons = [];
  for (let i = 0; i < 14; i++) {
    const m = new T.Mesh(crayonGeo, shadeMats[0]);
    const a = i * 2.4, r = 0.035 + (i % 3) * 0.025;
    m.position.set(Math.cos(a) * r, -0.03 + (i % 4) * 0.012, Math.sin(a) * r);
    m.rotation.set(Math.cos(a) * 0.35, a, Math.PI / 2 + Math.sin(a) * 0.35);
    m.scale.setScalar(0.75);
    m.visible = false;
    toteGroup.add(m);
    toteCrayons.push(m);
  }
  function refreshTote() {
    toteGroup.visible = tote.on;
    handGroup.visible = !tote.on;
    const n = tote.items.length, show = Math.min(toteCrayons.length, Math.ceil(n / Math.max(1, toteCap(lvl('tote'))) * toteCrayons.length));
    toteCrayons.forEach((m, i) => {
      m.visible = i < show;
      if (m.visible) m.material = shadeMats[tote.items[(i * 7) % n]];
    });
  }
  function toggleTote() {
    if (carry) { toast('Put the box you are carrying on a shelf first.'); return; }
    if (!lvl('tote')) { toast('The tote bucket unlocks at 1,500 crayons sorted.'); return; }
    tote.on = !tote.on;
    if (tote.on && hand.n) {
      // what's in your hands goes into the tote
      const space = toteCap(lvl('tote')) - tote.items.length, n = Math.min(space, hand.n);
      for (let i = 0; i < n; i++) tote.items.push(hand.c);
      hand.n -= n;
      if (hand.n) dropAt(new T.Vector3(player.x - Math.sin(player.yaw) * 0.8, 0, player.z - Math.cos(player.yaw) * 0.8), true);
      hand.n = 0; hand.c = -1;
      refreshHand();
    }
    refreshTote();
    blip(tote.on ? 520 : 400, 0.08, 'triangle', 0.05);
  }
  function scoopTote(first) {
    const cap = toteCap(lvl('tote')), space = cap - tote.items.length;
    if (space <= 0) { toast('Your tote is full! Walk past boxes to drop crayons off, or press Q to dump it.'); return; }
    const r = Math.max(0.6, scoop(lvl('hand')) + 0.2), picked = [first], cands = [];
    forNear(first.x, first.z, r, o => {
      if (o === first || o.delay > 0 || o.claimed) return;
      const d2 = (o.x - first.x) ** 2 + (o.z - first.z) ** 2;
      if (d2 < r * r) cands.push([d2 - o.y * 0.3, o]);
    });
    cands.sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < cands.length && picked.length < space; i++) picked.push(cands[i][1]);
    picked.sort((a, b) => b.y - a.y).forEach(removeCrayon);
    picked.forEach(o => tote.items.push(o.c));
    refreshTote();
    blip(300 + picked.length * 12, 0.09, 'triangle', 0.06);
  }
  // hand the box every crayon of its shade that fits
  function depositTote(b, quiet) {
    if (!tote.items.length || !state.boxes.includes(b)) return 0;
    let room = capOf(b) - b.count - b.incoming, n = 0;
    if (room <= 0) return 0;
    toteGroup.getWorldPosition(handWorld);
    const keep = [];
    for (const c of tote.items) {
      if (c === b.color && room > 0) {
        room--; n++;
        b.incoming++;
        const to = new T.Vector3(b.x + rand(-0.1, 0.1), boxBase(b) + (boxTopY(b) - boxBase(b)) * 0.6, b.z + rand(-0.08, 0.08));
        startFlight(c, handWorld, to, n * 0.04, () => {
          b.incoming = Math.max(0, b.incoming - 1);
          if (state.boxes.includes(b) && b.count < capOf(b)) {
            b.count++;
            recordSort(c, true);
            refreshBox(b);
            if (isDrawer(b)) bumpDrawer(b);
            if (isBin(b)) checkSet(b);
            if (b.count >= capOf(b) && lvl('autoPack')) setTimeout(() => packBox(b), 400);
          } else addCrayon(b.x + rand(-0.8, 0.8), b.z + rand(-0.8, 0.8), c);
        });
      } else keep.push(c);
    }
    if (n) { tote.items = keep; refreshTote(); blip(660, 0.06, 'sine', 0.05); }
    else if (!quiet) toast(`Nothing in your tote for the ${SHADES[b.color].name} ${kindName(b)}.`);
    return n;
  }
  function dumpTote() {
    const at = new T.Vector3(player.x - Math.sin(player.yaw) * 0.9, 0, player.z - Math.cos(player.yaw) * 0.9);
    toteGroup.getWorldPosition(handWorld);
    tote.items.forEach((c, i) => {
      const to = at.clone().add(new T.Vector3(rand(-0.35, 0.35), 0, rand(-0.35, 0.35)));
      to.y = Math.max(CR, topAt(to.x, to.z, 0.2));
      startFlight(c, handWorld, to, i * 0.02, () => addCrayon(to.x, to.z, c));
    });
    tote.items = [];
    refreshTote();
  }
  // walking past boxes drops off what they take
  function updateTote(dt) {
    if (!tote.on || !tote.items.length) return;
    tote.t -= dt;
    if (tote.t > 0) return;
    tote.t = 0.3;
    for (const b of state.boxes) {
      if (Math.hypot(b.x - player.x, b.z - player.z) < (lvl('wagon') ? 2.5 : 1.5)) depositTote(b, true);
      if (!tote.items.length) break;
    }
  }

  // ---------------------------------------------------------------------------
  // Rearranging shelves: lift a packed box, carry it, put it in any shelf spot
  // ---------------------------------------------------------------------------
  let carry = null;   // { shelf, slot, color } while you carry a packed box
  const carryGroup = new T.Group();
  {
    carryGroup.add(mesh(new T.BoxGeometry(0.44, 0.5, 0.44), std(cardboard, { roughness: 0.9 }), 0, 0, 0, false));
    carryGroup.add(mesh(new T.BoxGeometry(0.08, 0.505, 0.445), std(0xe9d7b5, { roughness: 0.4 }), 0, 0, 0, false));
    const tag = mesh(new T.PlaneGeometry(0.3, 0.16), std(0xffffff, { roughness: 0.6 }), 0, 0.05, 0.222, false);
    carryGroup.add(tag); carryGroup.userData.tag = tag;
    carryGroup.position.set(0.3, -0.32, -0.75); carryGroup.rotation.set(0.15, -0.5, 0);
    carryGroup.visible = false;
    camera.add(carryGroup);
  }
  function shelfSlotAt(o, d, maxT) {
    let best = null;
    const inv = new T.Matrix4(), ray = new T.Ray(), hit = new T.Vector3();
    const plane = new T.Plane(new T.Vector3(0, 0, 1), -0.28);
    for (const dc of state.decor) {
      if (dc.type !== 'shelf' || !dc.group || (placing && placing.obj === dc)) continue;
      dc.group.updateMatrixWorld();
      inv.copy(dc.group.matrixWorld).invert();
      ray.set(o, d).applyMatrix4(inv);
      if (ray.direction.z >= 0 || !ray.intersectPlane(plane, hit)) continue;
      const t = hit.distanceTo(ray.origin);
      if (t > maxT || (best && t > best.t) || Math.abs(hit.x) > 1.05 || hit.y < 0.06 || hit.y > 2.1) continue;
      const col = Math.max(0, Math.min(3, Math.round((hit.x + 0.75) / 0.5)));
      const lev = Math.max(0, Math.min(2, Math.floor((hit.y - 0.08) / 0.7)));
      best = { obj: dc, t, slot: lev * 4 + col };
    }
    return best;
  }
  function refreshCarry() {
    carryGroup.visible = !!carry;
    if (carry) carryGroup.userData.tag.material.color.set(SHADES[carry.color].hex);
  }
  function liftPacked(shelf, slot) {
    const c = shelf.packed[slot];
    if (c == null) return false;
    carry = { shelf, slot, color: c };
    rebuildDecor(shelf); refreshCarry();
    blip(440, 0.08, 'triangle', 0.05);
    return true;
  }
  function placeCarry(shelf, slot) {
    const src = carry;
    if (shelf === src.shelf && slot === src.slot) { carry = null; rebuildDecor(shelf); refreshCarry(); return; }
    while (shelf.packed.length <= slot) shelf.packed.push(null);
    const other = shelf.packed[slot];
    shelf.packed[slot] = src.color;
    src.shelf.packed[src.slot] = other == null ? null : other;   // swap when the spot was taken
    carry = null;
    rebuildDecor(shelf); if (src.shelf !== shelf) rebuildDecor(src.shelf);
    refreshCarry();
    blip(620, 0.1, 'triangle', 0.05);
    save();
  }
  function cancelCarry() {
    if (!carry) return;
    const sh = carry.shelf; carry = null; rebuildDecor(sh); refreshCarry();
  }
  function tidyShelf(shelf) {
    const order = shelf.packed.filter(c => c != null).sort((a, b) => a - b);
    shelf.packed = order;
    rebuildDecor(shelf);
    toast(order.length ? 'Tidied the shelf: boxes sorted by color.' : 'This shelf is empty.');
    save();
  }

  // ---------------------------------------------------------------------------
  // Wagon: once unlocked, the tote rolls along behind you as a wagon
  // ---------------------------------------------------------------------------
  const wagonGroup = new T.Group();
  {
    const red = std(0xd7263d, { roughness: 0.5 }), dark = std(0x333333), wood = std(0xc28a5a);
    wagonGroup.add(mesh(new T.BoxGeometry(0.62, 0.22, 0.95), red, 0, 0.3, 0));
    wagonGroup.add(mesh(new T.BoxGeometry(0.56, 0.05, 0.89), wood, 0, 0.42, 0, false));
    for (const [x, z] of [[-0.33, -0.32], [0.33, -0.32], [-0.33, 0.32], [0.33, 0.32]]) {
      const w = mesh(new T.CylinderGeometry(0.11, 0.11, 0.05, 16), dark, x, 0.11, z); w.rotation.z = Math.PI / 2; wagonGroup.add(w);
    }
    const handle = mesh(new T.CylinderGeometry(0.015, 0.015, 0.8, 8), dark, 0, 0.45, -0.75); handle.rotation.x = 1.0; wagonGroup.add(handle);
    // a heap of crayons in the bed, sized to how full it is
    const heap = mesh(new T.SphereGeometry(0.3, 14, 8, 0, TAU, 0, Math.PI / 2), new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: false, roughness: 0.7, map: canvasTex(64, 64, (g, w, h) => {
      const cols = ['#ef5a45', '#3f8fe8', '#ffd23f', '#4cbf6b', '#9b6bdb', '#ff9a3c', '#ff7eb6'];
      for (let i = 0; i < 60; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect((i * 37) % w, (i * 23) % h, 9, 4); }
    }) }), 0, 0.42, 0, false);
    heap.scale.set(0.9, 0.001, 1.4);
    wagonGroup.userData.heap = heap; wagonGroup.add(heap);
    wagonGroup.visible = false;
    scene.add(wagonGroup);
  }
  const wagonPos = new T.Vector3();
  function updateWagon(dt) {
    const on = tote.on && lvl('wagon') > 0;
    if (on && !wagonGroup.visible) wagonPos.set(player.x + Math.sin(player.yaw) * 1.3, 0, player.z + Math.cos(player.yaw) * 1.3);
    wagonGroup.visible = on;
    if (!on) return;
    // follow at the end of the handle
    const dx = wagonPos.x - player.x, dz = wagonPos.z - player.z, l = Math.hypot(dx, dz) || 1;
    if (l > 1.3) { wagonPos.x = player.x + dx / l * 1.3; wagonPos.z = player.z + dz / l * 1.3; }
    wagonPos.y = Math.min(1.2, topAt(wagonPos.x, wagonPos.z, 0.3) * 0.6);
    wagonGroup.position.lerp(wagonPos, Math.min(1, dt * 10));
    wagonGroup.rotation.y = Math.atan2(player.x - wagonPos.x, player.z - wagonPos.z);
    const f = tote.items.length / toteCap(lvl('tote'));
    wagonGroup.userData.heap.scale.y = Math.max(0.001, f * 0.7);
  }

  // ---------------------------------------------------------------------------
  // Floor tape: lay colored lanes and zones on the floor (N)
  // ---------------------------------------------------------------------------
  const TAPE_COLORS = ['#ffd23f', '#ef5a45', '#3f8fe8', '#4cbf6b', '#9b6bdb', '#ffffff'];
  const tapeGroup = new T.Group();
  scene.add(tapeGroup);
  const tapeMats = TAPE_COLORS.map(c => new T.MeshStandardMaterial({ color: c, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }));
  const tapeMode = { on: false, start: null, color: 0 };
  const tapePreview = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }));
  tapePreview.rotation.x = -Math.PI / 2; tapePreview.visible = false; scene.add(tapePreview);
  function tapeMesh(t, m) {
    const len = Math.hypot(t.x2 - t.x1, t.z2 - t.z1);
    m.scale.set(0.12, Math.max(0.12, len + 0.12), 1);
    m.position.set((t.x1 + t.x2) / 2, 0.006, (t.z1 + t.z2) / 2);
    m.rotation.set(-Math.PI / 2, 0, Math.atan2(t.x2 - t.x1, t.z2 - t.z1) + Math.PI);
    return m;
  }
  const tapeGeo = new T.PlaneGeometry(1, 1);
  function rebuildTape() {
    tapeGroup.clear();
    for (const t of state.tape) { const m = tapeMesh(t, new T.Mesh(tapeGeo, tapeMats[t.c])); m.receiveShadow = true; tapeGroup.add(m); }
  }
  function toggleTapeMode() {
    if (!lvl('tape')) { toast('Floor tape unlocks at 2,500 crayons sorted.'); return; }
    tapeMode.on = !tapeMode.on; tapeMode.start = null;
    if (tapeMode.on && hand.n) dropAt(new T.Vector3(player.x, 0, player.z), true);
    toast(tapeMode.on ? 'Tape mode: click the floor to start a lane, click again to end it. R color · Backspace undo · N done.' : 'Put the tape away.');
  }
  const snapTape = v => Math.round(v * 4) / 4;
  function tapeClick() {
    const fl = aim.floorHit;
    if (!fl || fl.t > 30) return;
    const x = clamp(snapTape(fl.point.x), -HALF + 0.1, HALF - 0.1), z = clamp(snapTape(fl.point.z), -HALF + 0.1, HALF - 0.1);
    if (!tapeMode.start) { tapeMode.start = { x, z }; blip(500, 0.05, 'triangle', 0.04); return; }
    const st = tapeMode.start;
    if (Math.hypot(x - st.x, z - st.z) < 0.2) { tapeMode.start = null; return; }
    if (state.tape.length >= 400) { toast('That is a lot of tape! Undo some with Backspace first.'); return; }
    state.tape.push({ x1: st.x, z1: st.z, x2: x, z2: z, c: tapeMode.color });
    tapeMode.start = { x, z };   // keep going from the end, so you can draw a zone in a few clicks
    rebuildTape();
    blip(420, 0.12, 'sawtooth', 0.02);
    save();
  }
  function updateTapePreview() {
    const fl = aim.floorHit;
    const show = tapeMode.on && tapeMode.start && fl;
    tapePreview.visible = !!show;
    if (!show) return;
    const t = { x1: tapeMode.start.x, z1: tapeMode.start.z, x2: snapTape(fl.point.x), z2: snapTape(fl.point.z) };
    tapeMesh(t, tapePreview);
    tapePreview.position.y = 0.01;
    tapePreview.material.color.set(TAPE_COLORS[tapeMode.color]);
  }

  // ---------------------------------------------------------------------------
  // Planner view (P): look down on the whole room and move things around
  // ---------------------------------------------------------------------------
  const planner = { on: false, x: 0, z: 0, h: 27, hidden: [] };
  const plannerMarker = new T.Mesh(new T.ConeGeometry(0.35, 0.9, 3), new T.MeshBasicMaterial({ color: 0xef5a45 }));
  plannerMarker.rotation.x = -Math.PI / 2; plannerMarker.visible = false;
  scene.add(plannerMarker);
  function togglePlanner() {
    if (!lvl('tape')) { toast('The planner view unlocks with floor tape, at 2,500 crayons sorted.'); return; }
    planner.on = !planner.on;
    if (planner.on) {
      if (locked) document.exitPointerLock();
      if (hand.n) dropAt(new T.Vector3(player.x, 0, player.z), true);
      planner.x = 0; planner.z = 0;
      planner.hidden = scene.children.filter(o => o.visible && o.isMesh && o.position.y > WALL_H - 1.4);
      planner.hidden.forEach(o => { o.visible = false; });
      camera.children.forEach(c => { c.userData.wasVisible = c.visible; c.visible = false; });
      toast('Planner view: WASD to pan, scroll to zoom, click anything to move it. P to go back.');
    } else {
      planner.hidden.forEach(o => { o.visible = true; });
      camera.children.forEach(c => { c.visible = !!c.userData.wasVisible; });
      plannerMarker.visible = false;
    }
  }
  function updatePlanner(dt) {
    let fx = 0, fz = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) fz -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) fz += 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) fx += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) fx -= 1;
    planner.x = clamp(planner.x + fx * dt * 12, -HALF, HALF);
    planner.z = clamp(planner.z + fz * dt * 12, -HALF, HALF);
    camera.position.set(planner.x, planner.h, planner.z + 0.001);
    camera.rotation.set(-Math.PI / 2, 0, 0);
    plannerMarker.visible = true;
    plannerMarker.position.set(player.x, WALL_H - 1.6, player.z);
    plannerMarker.rotation.set(-Math.PI / 2, 0, -player.yaw + Math.PI);
  }
  canvas.addEventListener('wheel', e => { if (planner.on) { planner.h = clamp(planner.h + Math.sign(e.deltaY) * 2, 12, 34); e.preventDefault(); } }, { passive: false });

  // ---------------------------------------------------------------------------
  // Finder arrow: points at the nearest box with room for what you're carrying
  // ---------------------------------------------------------------------------
  const finderEl = $('finder');
  function updateFinder() {
    let target = null, best = Infinity, shade = -1;
    if (lvl('finder') && !placing && (hand.n || (tote.on && tote.items.length))) {
      const want = hand.n ? new Set([hand.c]) : new Set(tote.items);
      for (const b of state.boxes) {
        if (!want.has(b.color) || b.count + b.incoming >= capOf(b)) continue;
        const d = Math.hypot(b.x - player.x, b.z - player.z);
        if (d < best) { best = d; target = b; }
      }
      if (!target && hand.n) shade = hand.c;
    }
    if (!target && shade < 0) { finderEl.hidden = true; return; }
    finderEl.hidden = false;
    if (!target) {
      finderEl.innerHTML = `<b>No ${SHADES[shade].name} box yet</b><small>E to make one</small>`;
      finderEl.style.setProperty('--rot', '0deg');
      finderEl.classList.add('none');
      return;
    }
    finderEl.classList.remove('none');
    const dx = target.x - player.x, dz = target.z - player.z;
    const ang = Math.atan2(dx, -dz) + player.yaw; // 0 = straight ahead
    finderEl.style.setProperty('--rot', `${ang}rad`);
    finderEl.style.setProperty('--c', SHADES[target.color].hex);
    finderEl.innerHTML = `<i></i><b>${SHADES[target.color].name}</b><small>${best < 1.6 ? 'right here' : best.toFixed(0) + ' m'}</small>`;
  }

  // ---------------------------------------------------------------------------
  // Label maker: signs readable from far away, and name labels on drawers
  // ---------------------------------------------------------------------------
  function applyLabels() {
    state.boxes.filter(isDrawer).forEach(b => { scene.remove(b.group); openDrawers.delete(b); buildDrawer(b); });
  }
  function updateSigns() {
    const far = lvl('labels') > 0;
    for (const b of state.boxes) {
      if (!b.sprite) continue;
      const d = Math.hypot(b.x - player.x, b.z - player.z);
      b.sprite.visible = far || d < 7;
      const sc = far ? 1 + Math.min(1, Math.max(0, d - 6) / 10) * 0.8 : 1;
      b.sprite.scale.set(1.15 * sc, 0.49 * sc, 1);
    }
  }

  function updateFlights(dt) {
    for (let i = flights.length - 1; i >= 0; i--) {
      const f = flights[i];
      f.t += dt;
      if (f.t < 0) continue;
      const k = Math.min(1, f.t / f.dur);
      f.m.visible = true;
      f.m.position.lerpVectors(f.from, f.to, k);
      f.m.position.y += Math.sin(k * Math.PI) * f.h;
      f.m.rotation.set(k * f.spin, k * f.spin * 0.6, 0);
      if (k >= 1) {
        scene.remove(f.m);
        flights.splice(i, 1);
        f.onLand();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Sortbots
  // ---------------------------------------------------------------------------
  const bots = [];
  function buildBot() {
    const g = new T.Group();
    g.add(mesh(new T.SphereGeometry(0.3, 20, 14), std(0xe9edf2, { roughness: 0.4 }), 0, 0.3, 0));
    g.add(mesh(new T.BoxGeometry(0.34, 0.14, 0.1), std(0x2d3a4a, { roughness: 0.3 }), 0, 0.36, 0.26));
    const eye = new T.MeshStandardMaterial({ color: 0x7ff0c0, emissive: 0x7ff0c0, emissiveIntensity: 0.9 });
    g.add(mesh(new T.SphereGeometry(0.03, 8, 6), eye, -0.07, 0.36, 0.31, false));
    g.add(mesh(new T.SphereGeometry(0.03, 8, 6), eye, 0.07, 0.36, 0.31, false));
    g.add(mesh(new T.CylinderGeometry(0.01, 0.01, 0.18, 6), std(0x9aa6b2), 0, 0.66, 0));
    g.add(mesh(new T.SphereGeometry(0.04, 8, 6), std(0xff6b6b, { emissive: 0xff3030, emissiveIntensity: 0.6 }), 0, 0.76, 0, false));
    const carry = new T.Mesh(crayonGeo, shadeMats[0]);
    carry.position.set(0, 0.45, 0.33);
    carry.rotation.y = Math.PI / 2;
    carry.visible = false;
    g.add(carry);
    scene.add(g);
    return { g, carry };
  }
  function syncBots() {
    while (bots.length < lvl('bots')) {
      const { g, carry } = buildBot();
      bots.push({ g, carryMesh: carry, x: rand(-6, 6), z: rand(-6, 6), y: 0, state: 'idle', target: null, box: null, carry: [], wait: rand(0, 1), bob: Math.random() * 6 });
    }
  }

  function boxWithSpace(c, x, z) {
    let best = null, bd = Infinity;
    for (const b of state.boxes) {
      if (b.color !== c || b.count + b.incoming >= capOf(b)) continue;
      if (placing && placing.obj === b) continue;
      const d = (b.x - x) ** 2 + (b.z - z) ** 2;
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  function updateBot(bot, dt) {
    const speed = 1.6 + lvl('botSpeed') * 0.6;
    bot.bob += dt * 8;
    const moveTo = (tx, tz) => {
      const dx = tx - bot.x, dz = tz - bot.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.12) return true;
      const s = Math.min(d, speed * dt);
      bot.x += dx / d * s; bot.z += dz / d * s;
      bot.g.rotation.y = Math.atan2(dx, dz);
      return false;
    };
    if (bot.wait > 0) bot.wait -= dt;
    else if (bot.state === 'idle') {
      const ok = new Set();
      state.boxes.forEach(b => { if (b.count + b.incoming < capOf(b)) ok.add(b.color); });
      let best = null, bd = Infinity;
      if (ok.size) for (const c of cr) {
        if (c.claimed || c.delay > 0 || !ok.has(c.c)) continue;
        const d = (c.x - bot.x) ** 2 + (c.z - bot.z) ** 2;
        if (d < bd) { bd = d; best = c; }
      }
      if (!best) bot.wait = 1.5;
      else { best.claimed = true; bot.target = best; bot.state = 'toCrayon'; }
    } else if (bot.state === 'toCrayon') {
      const t = bot.target;
      if (!t || t.dead) { bot.state = 'idle'; bot.target = null; }
      else if (moveTo(t.x, t.z)) {
        const box = boxWithSpace(t.c, t.x, t.z);
        if (!box) { t.claimed = false; bot.state = 'idle'; }
        else {
          const want = Math.min(botCarry(lvl('botSpeed')), capOf(box) - box.count - box.incoming);
          const grab = [t];
          forNear(t.x, t.z, 0.5, o => {
            if (grab.length < want && o !== t && o.c === t.c && !o.claimed && o.delay <= 0) grab.push(o);
          });
          grab.sort((a, b) => b.y - a.y).forEach(removeCrayon);
          bot.carry = grab.map(o => o.c);
          bot.box = box;
          box.incoming += grab.length;
          bot.target = null;
          bot.state = 'toBox';
          bot.wait = 0.3;
          bot.carryMesh.material = shadeMats[t.c];
          bot.carryMesh.visible = true;
        }
      }
    } else if (bot.state === 'toBox') {
      const box = bot.box;
      if (!state.boxes.includes(box)) {
        bot.carry.forEach(c => addCrayon(bot.x, bot.z, c));
        bot.carry = []; bot.state = 'idle'; bot.carryMesh.visible = false;
      } else {
        const [, hd] = boxHalf(box);
        if (moveTo(box.x, box.z + (bot.z > box.z ? hd + 0.4 : -hd - 0.4))) {
          box.incoming = Math.max(0, box.incoming - bot.carry.length);
          for (const c of bot.carry) {
            if (box.color === c && box.count < capOf(box)) {
              box.count++;
              recordSort(c, false);
            } else addCrayon(bot.x, bot.z, c);
          }
          refreshBox(box);
          if (isDrawer(box)) bumpDrawer(box);
          if (box.count >= capOf(box) && lvl('autoPack')) setTimeout(() => packBox(box), 400);
          bot.carry = []; bot.box = null; bot.state = 'idle'; bot.wait = 0.3;
          bot.carryMesh.visible = false;
        }
      }
    }
    const ground = topAt(bot.x, bot.z, 0.25);
    bot.y += (ground - bot.y) * Math.min(1, dt * 8);
    bot.g.position.set(bot.x, bot.y + Math.abs(Math.sin(bot.bob)) * 0.03, bot.z);
  }

  // ---------------------------------------------------------------------------
  // Moving / placing furniture
  // ---------------------------------------------------------------------------
  let placing = null; // { kind: 'box'|'decor', obj, isNew, prev }

  function startPlacing(kind, obj, isNew) {
    if (hand.n) dropAt(new T.Vector3(player.x, 0, player.z), true);
    placing = { kind, obj, isNew, prev: { x: obj.x, y: obj.y, z: obj.z, rot: obj.rot, ry: obj.ry, level: obj.level } };
    if (!isNew && !(kind === 'decor' && (DECOR[obj.type].wall || DECOR[obj.type].under))) {
      removeMarksNear(obj.x, obj.z, kind === 'box' ? 0.75 : DECOR[obj.type].r + 0.2);
      saveMarks();
    }
    if (isDrawer(obj)) restack(); // drawers above the one you lift drop down
  }

  function updatePlacing() {
    if (!placing) return;
    const o = placing.obj;
    if (placing.kind === 'decor' && DECOR[o.type].wall) {
      const w = aim.wall;
      if (w && w.t < 14) {
        o.ry = w.ry;
        o.x = clamp(w.point.x + Math.sin(w.ry) * 0.02, -HALF + 1, HALF - 1);
        o.z = clamp(w.point.z + Math.cos(w.ry) * 0.02, -HALF + 1, HALF - 1);
        o.y = clamp(w.point.y, 1.0, WALL_H - 0.8);
      }
      refreshDecor(o);
      return;
    }
    let p = aim.floor && aim.floor.t < (planner.on ? 60 : 12) ? aim.floor.point : null;
    if (!p) p = new T.Vector3(player.x - Math.sin(player.yaw) * 2.5, 0, player.z - Math.cos(player.yaw) * 2.5);
    o.x = clamp(p.x, -HALF + 0.7, HALF - 0.7);
    o.z = clamp(p.z, -HALF + 0.7, HALF - 0.7);
    // snap to a 25 cm grid so rows line up; hold Alt to place freely
    placing.snap = !(keys.has('AltLeft') || keys.has('AltRight'));
    if (placing.snap) { o.x = Math.round(o.x * 4) / 4; o.z = Math.round(o.z * 4) / 4; }
    if (isDrawer(o)) {
      // Looking at a drawer (or the floor under one) stacks the new drawer on top of it
      let base = aim.box && isDrawer(aim.box.obj) ? aim.box.obj : null;
      if (!base) base = state.boxes.find(b => isDrawer(b) && b !== o && Math.abs(o.x - b.x) < DRAWER_W * 0.6 && Math.abs(o.z - b.z) < DRAWER_W * 0.6);
      o.level = 0;
      placing.tooTall = false;
      if (base) {
        const st = stackAt(base.x, base.z, o);
        o.x = base.x; o.z = base.z; o.rot = base.rot;
        o.level = st.length;
        placing.tooTall = st.length >= STACK_MAX;
      }
    }
    if (placing.kind === 'box') refreshBox(o); else refreshDecor(o);
  }

  function finishPlacing() {
    const o = placing.obj;
    const kind = placing.kind;
    if (placing.tooTall) { toast(`That stack is already ${STACK_MAX} drawers tall. Start a new one beside it.`); return; }
    placing = null;
    if (isDrawer(o)) restack();
    // Crayons under the new spot get shoved aside
    let r = 0;
    if (kind === 'box') r = Math.max(BOX_W, BOX_D) / 2 + 0.2;
    else if (!DECOR[o.type].wall && !DECOR[o.type].under) r = DECOR[o.type].r + 0.15;
    if (r) clearUnder(o.x, o.z, r);
    blip(500, 0.08, 'triangle', 0.05);
    save();
  }

  function clearUnder(x, z, r) {
    const list = [];
    forNear(x, z, r + 0.2, c => { if (blockedAt(c.x, c.z, 0.05)) list.push(c); });
    list.sort((a, b) => b.y - a.y).forEach(c => { removeCrayon(c); });
    list.forEach(c => addCrayon(c.x, c.z, c.c));
  }

  function cancelPlacing() {
    if (!placing) return;
    if (placing.isNew) { finishPlacing(); return; }
    const o = placing.obj;
    Object.assign(o, placing.prev);
    if (isDrawer(o)) o.level -= 0.5; // slots back in where it came from
    const kind = placing.kind;
    placing = null;
    if (isDrawer(o)) restack();
    if (kind === 'box') refreshBox(o); else refreshDecor(o);
  }

  function putAway() {
    if (!placing) return;
    const o = placing.obj;
    if (placing.kind === 'box') {
      if (o.count > 0) { toast(isDrawer(o) ? 'Only empty drawers can be put away.' : 'Only empty boxes can be put away. Pack it first.'); return; }
      scene.remove(o.group);
      state.boxes = state.boxes.filter(x => x !== o);
      openDrawers.delete(o);
      storedDirty = true;
      toast(`Put away the ${SHADES[o.color].name} ${isDrawer(o) ? 'drawer' : 'box'}.`);
      placing = null;
      restack();
      save();
      return;
    } else {
      if (o.type === 'shelf' && shelfUsed(o)) { toast('Only empty shelves can be put away.'); return; }
      if (o.bins && o.bins.some(b => b.count)) { toast(`Empty every drawer first to put away the ${DECOR[o.type].name}.`); return; }
      if (o.bins) state.boxes = state.boxes.filter(b => b.parent !== o);
      scene.remove(o.group);
      state.decor = state.decor.filter(x => x !== o);
      toast(`Put away the ${DECOR[o.type].name}.`);
    }
    placing = null;
    save();
  }

  // ---------------------------------------------------------------------------
  // Effects: sound, toasts, coin floaters
  // ---------------------------------------------------------------------------
  let muted = false;
  let actx = null;
  function blip(freq, dur, type = 'sine', vol = 0.06) {
    if (muted) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
      o.connect(g).connect(actx.destination);
      o.start();
      o.stop(actx.currentTime + dur);
    } catch (e) { /* audio not available */ }
  }

  const toastEl = $('toast');
  function toast(msg) {
    const d = document.createElement('div');
    d.textContent = msg;
    toastEl.appendChild(d);
    while (toastEl.children.length > 3) toastEl.firstChild.remove();
    setTimeout(() => d.remove(), 2900);
  }

  let floatAcc = 0, floatT = 0;
  // A crayon landed in the right box: count it and check for unlocks
  function recordSort(c, show) {
    const fi = SHADES[c].family;
    state.sorted++;
    state.familySorted[fi]++;
    state.shadeSorted[c]++;
    if (show) floatAcc++;
    const n = state.familySorted[fi];
    const ti = n > state.familyBest[fi] ? TIERS.indexOf(n) : -1;
    state.familyBest[fi] = Math.max(state.familyBest[fi], n);
    if (ti >= 0) {
      const r = REWARDS[fi][ti];
      recomputeUnlocks();
      if (r.up === 'bots') syncBots();
      state.boxes.forEach(refreshBox);
      celebrate(`${rewardIcon(r)} Unlocked: ${rewardName(r)}!`, r.up ? UPGRADES[r.up].info(lvl(r.up)) : 'Find it under E → Furniture and place it anywhere.');
    }
    if (state.sorted > state.bestTotal) {
      const before = state.bestTotal;
      state.bestTotal = state.sorted;
      const hit = LADDER.filter(r => r.at > before && r.at <= state.bestTotal);
      if (hit.length) {
        recomputeUnlocks();
        if (hit.some(r => r.up === 'bots')) syncBots();
        if (hit.some(r => r.up === 'labels')) applyLabels();
        state.boxes.forEach(refreshBox);
        const r = hit.find(x => x.up || x.decor);
        if (r) celebrate(`${rewardIcon(r)} Unlocked: ${rewardName(r)}!`, r.up ? UPGRADES[r.up].info(lvl(r.up)) : 'Find it under E → Furniture.');
      }
    }
    if (!state.done && cr.length === 0 && hand.n === 0 && flights.length <= 1 && bots.every(b => !b.carry.length)) {
      state.done = true;
      celebrate('🎉 Every single crayon is sorted!', `All ${state.sorted.toLocaleString()} of them. The room is finally clean.`);
    }
  }
  function celebrate(title, sub) {
    const el = $('unlock');
    el.querySelector('b').textContent = title;
    el.querySelector('span').textContent = sub;
    el.hidden = false;
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    clearTimeout(celebrate.t);
    celebrate.t = setTimeout(() => { el.hidden = true; }, 4200);
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.18, 'triangle', 0.06), i * 110));
  }
  function flushFloaters(dt) {
    floatT -= dt;
    if (floatAcc > 0 && floatT <= 0) {
      const d = document.createElement('div');
      d.textContent = '+' + floatAcc + ' sorted';
      $('floaters').appendChild(d);
      setTimeout(() => d.remove(), 1100);
      floatAcc = 0;
      floatT = 0.15;
    }
  }

  // Taking crayons back out of a box un-sorts them (unlocks you've earned stay)
  function unsort(c, n) {
    const fi = SHADES[c].family;
    state.sorted = Math.max(0, state.sorted - n);
    state.familySorted[fi] = Math.max(0, state.familySorted[fi] - n);
  }

  // The next rung of the ladder, for the HUD
  function nextReward() {
    const i = LADDER.findIndex(r => (r.up || r.decor) && r.at > state.bestTotal);
    if (i < 0) return null;
    const r = LADDER[i];
    const prev = LADDER.slice(0, i).filter(x => x.up || x.decor).map(x => x.at).pop() || 0;
    return { r, need: r.at - state.bestTotal, frac: (state.bestTotal - prev) / (r.at - prev) };
  }

  // ---------------------------------------------------------------------------
  // Highlighting (Shade Spotter upgrade)
  // ---------------------------------------------------------------------------
  let lastGlow = -1;
  const _gc = new T.Color();
  const GLOW_TO = new T.Color(1, 1, 0.75);
  function updateGlow(time) {
    let glow = -1;
    if (hand.n && lvl('glow') >= 1) glow = hand.c;
    else if (!hand.n && lvl('glow') >= 2 && aim.type === 'crayon') glow = aim.obj.c;
    if (glow !== lastGlow && lastGlow >= 0) {
      for (const o of cr) if (o.c === lastGlow) writeColor(o);
    }
    lastGlow = glow;
    const pulse = 0.35 + 0.25 * Math.sin(time * 6);
    if (glow >= 0) {
      _gc.copy(SHADE_COLORS[glow]).lerp(GLOW_TO, pulse);
      for (const o of cr) if (o.c === glow) writeColor(o, _gc);
    }
    for (const b of state.boxes) {
      const on = glow >= 0 && b.color === glow;
      b.mat.emissive.setRGB(on ? 0.5 * pulse + 0.15 : 0, on ? 0.45 * pulse + 0.12 : 0, 0);
    }
  }

  // ---------------------------------------------------------------------------
  // HUD
  // ---------------------------------------------------------------------------
  const aimLabel = $('aimLabel'), handLabel = $('handLabel'), hint = $('hint'), crosshair = $('crosshair');
  const sw = hex => `<span class="sw" style="background:${hex}"></span>`;
  let lastAimHTML = '', lastHandHTML = '';

  function updateAimLabel() {
    let html = '';
    if (placing) {
      const o = placing.obj;
      const name = placing.kind === 'box' ? `${SHADES[o.color].name} ${kindName(o)}` : DECOR[o.type].name;
      const canRotate = placing.kind === 'box' || !DECOR[o.type].wall;
      const stackNote = isDrawer(o) ? (placing.tooTall ? ' · stack is full' : o.level ? ` · stacking, level ${o.level + 1}` : ' · look at a drawer to stack on it') : '';
      html = `Placing <b>${name}</b> <span class="dim">${stackNote} · click to place${canRotate ? ' · R rotate' : ''}${' · X put away'}${placing.isNew ? '' : ' · Esc cancel'}${placing.snap ? ' · hold Alt to place freely' : ''}</span>`;
    } else if (aim.type === 'crayon') {
      const s = SHADES[aim.obj.c];
      html = `${sw(s.hex)}<b>${s.name}</b> <span class="dim">· click to ${hand.n ? 'grab more' : 'pick up'}</span>`;
    } else if (aim.type === 'box') {
      const b = aim.obj, s = SHADES[b.color];
      const full = b.count >= capOf(b), dr = isDrawer(b);
      const what = hand.n ? 'click to toss' + (hand.c === b.color ? ' · T take more' : '')
        : isBin(b) ? (b.count ? 'click to take some out · ' : '') + `G move the ${DECOR[b.parent.type].name.toLowerCase()}` + (b.parent.type === 'cart' ? ' · C change family' : '')
        : full && isBox(b) && !lvl('autoPack') ? 'click to pack · T take some out'
        : (b.count ? 'click to take some out · ' : '') + (full && dr ? 'full, stack another on top · ' : '') + 'G move' + (b.count === 0 ? ' · C change shade' : '');
      html = `${sw(s.hex)}<b>${s.name}</b> ${kindName(b)} ${b.count}/${capOf(b)} <span class="dim">· ${what}</span>`;
    } else if (aim.type === 'page') {
      const u = aim.obj.userData;
      html = u.hidden ? '📄 <b>A coloring page!</b> <span class="dim">· click to take it</span>'
        : `📄 <b>${PAGES[u.page].name}</b> <span class="dim">· ${hand.n ? 'click or V to color with ' + SHADES[hand.c].name : 'pick up a crayon to color'}</span>`;
    } else if (aim.type === 'decor' && aim.slot != null) {
      const sh = aim.obj, here = sh.packed[aim.slot];
      const lifted = carry && carry.shelf === sh && carry.slot === aim.slot;
      const what = carry ? (lifted ? 'click to put it back' : here != null ? `click to swap with ${SHADES[here].name}` : 'click to put it here')
        : here != null ? `${sw(SHADES[here].hex)}${SHADES[here].name} · click to pick up` : 'empty spot';
      html = `<b>Shelf</b> ${shelfUsed(sh)}/${SHELF_CAP} <span class="dim">· ${what}${carry ? '' : ' · C tidy by color · G move'}</span>`;
    } else if (aim.type === 'decor') {
      html = `<b>${DECOR[aim.obj.type].name}</b> <span class="dim">· G move</span>`;
    } else if (aim.type === 'floor') {
      if (hand.n && aim.t < 9) html = '<span class="dim">click to drop here</span>';
      else if (aim.rug && aim.t < 8) html = `<b>${DECOR[aim.rug.type].name}</b> <span class="dim">· G move</span>`;
    }
    if (html !== lastAimHTML) { aimLabel.innerHTML = html; lastAimHTML = html; }
    aimLabel.hidden = !html;
    if (!locked) {
      aimLabel.classList.add('free');
      aimLabel.style.left = (mouseNDC.x + 1) / 2 * window.innerWidth + 'px';
      aimLabel.style.top = (1 - mouseNDC.y) / 2 * window.innerHeight + 26 + 'px';
    } else {
      aimLabel.classList.remove('free');
      aimLabel.style.left = ''; aimLabel.style.top = '';
    }
    crosshair.classList.toggle('free', !locked);
    crosshair.classList.toggle('on', aim.type === 'crayon' || aim.type === 'box');
    let hh = '';
    if (tapeMode.on) {
      hh = `<span class="sw" style="background:${TAPE_COLORS[tapeMode.color]}"></span>Floor tape <span class="dim">· ${tapeMode.start ? 'click to end the lane' : 'click the floor to start a lane'} · R color · Backspace undo · N done</span>`;
    } else if (planner.on) {
      hh = '📐 Planner view <span class="dim">· WASD pan · scroll zoom · click something to move it · P back</span>';
    } else if (carry) {
      hh = `${sw(SHADES[carry.color].hex)}Carrying a packed <b>${SHADES[carry.color].name}</b> box <span class="dim">· click a shelf spot · Q put back</span>`;
    } else if (tote.on) {
      const kinds = new Set(tote.items).size;
      hh = `${lvl('wagon') ? '🛻 Wagon' : '🪣 Tote'} <b>${tote.items.length} / ${toteCap(lvl('tote'))}</b>${kinds ? ` <span class="dim">· ${kinds} shade${kinds > 1 ? 's' : ''} · walk past boxes to drop off · Q dump · B put away</span>` : ' <span class="dim">· click crayons to scoop · B put away</span>'}`;
    } else if (hand.n) {
      const s = SHADES[hand.c];
      hh = `${sw(s.hex)}Holding <b>${hand.n} ${s.name}</b> <span class="dim">· Q drop</span>`;
    }
    if (hh !== lastHandHTML) { handLabel.innerHTML = hh; lastHandHTML = hh; }
    handLabel.hidden = !hh;
    hint.textContent = locked ? 'WASD walk · Shift run · E build · F collection · G move · Esc free the mouse'
      : 'WASD walk · drag to look · click to act · E build · F collection · L lock mouse';
  }

  function updateHud() {
    const pct = state.sorted / TOTAL * 100;
    $('progressText').textContent = `${state.sorted.toLocaleString()} / ${TOTAL.toLocaleString()} sorted`;
    $('progressPct').textContent = pct < 10 ? pct.toFixed(2) + '%' : pct.toFixed(1) + '%';
    $('progressFill').style.width = Math.min(100, pct) + '%';
    $('floorCount').textContent = `${cr.length.toLocaleString()} still on the floor`;
    const nr = nextReward();
    $('nextReward').innerHTML = nr
      ? `<span>Next: ${rewardIcon(nr.r)} <b>${rewardName(nr.r)}</b> in ${nr.need.toLocaleString()} more</span><i style="width:${Math.round(nr.frac * 100)}%"></i>`
      : '<span>Everything unlocked!</span>';
    $('btnLock').classList.toggle('active', locked);
    if (!$('shop').hidden && shopTab === 'collection') renderShop();
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------
  const anyModal = () => !$('shop').hidden || !$('picker').hidden || !$('help').hidden;
  const isTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

  function requestLock() {
    const fail = () => toast('Mouse lock is not available here. Drag to look around instead.');
    try {
      const p = canvas.requestPointerLock && canvas.requestPointerLock();
      if (p && p.catch) p.catch(fail);
    } catch (e) { fail(); }
  }
  document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === canvas; keys.clear(); });

  function act() {
    updateAim();
    if (placing) { finishPlacing(); return; }
    if (tapeMode.on) { tapeClick(); return; }
    if (planner.on) {
      if (aim.type === 'box' && isBin(aim.obj)) startPlacing('decor', aim.obj.parent, false);
      else if (aim.type === 'box') startPlacing('box', aim.obj, false);
      else if (aim.type === 'decor') startPlacing('decor', aim.obj, false);
      else if (aim.type === 'floor' && aim.rug) startPlacing('decor', aim.rug, false);
      return;
    }
    if (carry) {
      if (aim.type === 'decor' && aim.slot != null) placeCarry(aim.obj, aim.slot);
      else toast('Click a spot on a shelf to put the box there. Q puts it back.');
      return;
    }
    if (tote.on) {
      if (aim.type === 'crayon') scoopTote(aim.obj);
      else if (aim.type === 'box') depositTote(aim.obj);
      else if (aim.type === 'page' && aim.obj.userData.hidden) findPage(aim.obj);
      else if (aim.type === 'page') toast('Put the tote away (B) and hold a crayon to color.');
      return;
    }
    if (hand.n) {
      if (aim.type === 'crayon' && aim.obj.c === hand.c) pickUp(aim.obj);
      else if (aim.type === 'box') tossToBox(aim.obj);
      else if (aim.type === 'floor' && aim.t < 9) dropAt(aim.point);
      else if (aim.type === 'page' && aim.obj.userData.hidden) findPage(aim.obj);
      else if (aim.type === 'page') openColoring(aim.obj.userData.page);
      else if (aim.type === 'decor') toast('Toss crayons into a box, or click the floor to drop them.');
      return;
    }
    if (aim.type === 'crayon') pickUp(aim.obj);
    else if (aim.type === 'decor' && aim.slot != null && aim.obj.packed[aim.slot] != null) liftPacked(aim.obj, aim.slot);
    else if (aim.type === 'page' && aim.obj.userData.hidden) findPage(aim.obj);
    else if (aim.type === 'page') toast('Pick up a crayon, then click this page (or press V) to color it.');
    else if (aim.type === 'box' && isBox(aim.obj) && aim.obj.count >= capacity() && !lvl('autoPack')) packBox(aim.obj);
    else if (aim.type === 'box') takeFromBox(aim.obj);
  }

  function setMouse(e) {
    mouseNDC.set(e.clientX / window.innerWidth * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  }

  let drag = null;
  canvas.addEventListener('pointerdown', e => {
    if (anyModal()) return;
    if (actx && actx.state === 'suspended') actx.resume();
    if (locked) {
      if (e.button === 0) act();
      else if (e.button === 2 && placing) cancelPlacing();
      return;
    }
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: false, button: e.button };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    setMouse(e);
  });
  canvas.addEventListener('pointermove', e => {
    if (locked) {
      player.yaw -= e.movementX * 0.0022;
      player.pitch = clamp(player.pitch - e.movementY * 0.0022, -1.45, 1.45);
      return;
    }
    setMouse(e);
    if (drag && drag.id === e.pointerId) {
      if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) drag.moved = true;
      if (drag.moved) {
        const k = e.pointerType === 'touch' ? 0.006 : 0.0045;
        player.yaw -= (e.clientX - drag.lx) * k;
        player.pitch = clamp(player.pitch - (e.clientY - drag.ly) * k, -1.45, 1.45);
      }
      drag.lx = e.clientX; drag.ly = e.clientY;
    }
  });
  canvas.addEventListener('pointerup', e => {
    if (locked || !drag || drag.id !== e.pointerId) return;
    if (!drag.moved) {
      setMouse(e);
      if (drag.button === 2) { if (placing) cancelPlacing(); }
      else act();
    }
    drag = null;
  });
  canvas.addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  window.addEventListener('keydown', e => {
    if (e.code === 'Escape') {
      if (anyModal()) { closeModals(); return; }
      if (placing) cancelPlacing();
      else if (tapeMode.on) toggleTapeMode();
      else if (planner.on) togglePlanner();
      return;
    }
    if (anyModal()) return;
    keys.add(e.code);
    if (e.code === 'KeyE' || e.code === 'Tab') { e.preventDefault(); openShop(); }
    else if (e.code === 'KeyF') openShop('collection');
    else if (e.code === 'KeyL') { if (!locked) requestLock(); }
    else if (e.code === 'KeyB' && !planner.on) toggleTote();
    else if (e.code === 'KeyN' && !planner.on) toggleTapeMode();
    else if (e.code === 'KeyP' && !placing) togglePlanner();
    else if (e.code === 'Backspace' && tapeMode.on) { e.preventDefault(); if (state.tape.pop()) { rebuildTape(); save(); } tapeMode.start = null; }
    else if (e.code === 'KeyR' && tapeMode.on && !placing) { tapeMode.color = (tapeMode.color + 1) % TAPE_COLORS.length; toast('Tape color changed.'); }
    else if (e.code === 'KeyQ' && carry) cancelCarry();
    else if (e.code === 'KeyQ' && tote.on && tote.items.length) dumpTote();
    else if (e.code === 'KeyQ' && hand.n) dropAt(new T.Vector3(player.x - Math.sin(player.yaw) * 0.8, 0, player.z - Math.cos(player.yaw) * 0.8));
    else if (e.code === 'KeyR' && placing) {
      const o = placing.obj;
      if (placing.kind === 'box') { o.rot = ((o.rot || 0) + 1) % 4; refreshBox(o); }
      else if (!DECOR[o.type].wall) { o.ry = (o.ry || 0) + Math.PI / 4; refreshDecor(o); }
    } else if (e.code === 'KeyV' && !placing && !e.repeat) {
      updateAim();
      if (aim.type === 'page' && aim.obj.userData.hidden) findPage(aim.obj);
      else if (aim.type === 'page') openColoring(aim.obj.userData.page);
      else startScribble();
    } else if (e.code === 'KeyX' && placing) putAway();
    else if (e.code === 'KeyT' && !placing) {
      updateAim();
      if (aim.type === 'box') takeFromBox(aim.obj);
    }
    else if (e.code === 'KeyG' && !placing) {
      updateAim();
      if (carry) { toast('Put the box you are carrying on a shelf first (Q puts it back).'); return; }
      if (aim.type === 'box' && isBin(aim.obj)) startPlacing('decor', aim.obj.parent, false);
      else if (aim.type === 'box') startPlacing('box', aim.obj, false);
      else if (aim.type === 'decor') startPlacing('decor', aim.obj, false);
      else if (aim.rug) startPlacing('decor', aim.rug, false);
      else toast('Look at a box or decoration, then press G to move it.');
    } else if (e.code === 'KeyC' && !placing) {
      updateAim();
      if (aim.type === 'decor' && aim.obj.type === 'shelf' && !carry) tidyShelf(aim.obj);
      else if ((aim.type === 'box' && isBin(aim.obj) && aim.obj.parent.type === 'cart') || (aim.type === 'decor' && aim.obj.type === 'cart')) {
        const cart = aim.obj.parent || aim.obj;
        if (cart.bins.some(b => b.count)) toast('Empty the cart to change its color family.');
        else { cart.fam = (cart.fam + 1) % FAMILIES.length; cart.bins.forEach((b, k) => { b.color = cart.fam * 3 + k; refreshBox(b); }); toast(`The cart now takes ${FAMILIES[cart.fam].name}.`); save(); }
      } else if (aim.type === 'box' && isBin(aim.obj)) toast('Cabinet drawers keep their shade.');
      else if (aim.type === 'box') {
        if (aim.obj.count === 0) openPicker(aim.obj);
        else toast(isDrawer(aim.obj) ? 'Only empty drawers can change shade.' : 'Only empty boxes can change shade. Fill it up and pack it first.');
      }
    }
  });
  window.addEventListener('keyup', e => { keys.delete(e.code); if (e.code === 'KeyV') stopScribble(); });
  window.addEventListener('blur', () => keys.clear());

  // Touch joystick for walking on phones and tablets
  const joyEl = $('joystick');
  if (isTouch) joyEl.hidden = false;
  let joyId = null;
  const knob = joyEl.querySelector('.knob');
  function joyMove(e) {
    const r = joyEl.getBoundingClientRect();
    let x = (e.clientX - r.left - r.width / 2) / (r.width / 2);
    let y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    joy.x = x; joy.y = y;
    knob.style.transform = `translate(${x * 35}px, ${y * 35}px)`;
  }
  joyEl.addEventListener('pointerdown', e => { joyId = e.pointerId; joyEl.setPointerCapture(e.pointerId); joyMove(e); });
  joyEl.addEventListener('pointermove', e => { if (e.pointerId === joyId) joyMove(e); });
  const joyEnd = e => { if (e.pointerId === joyId) { joyId = null; joy.x = joy.y = 0; knob.style.transform = ''; } };
  joyEl.addEventListener('pointerup', joyEnd);
  joyEl.addEventListener('pointercancel', joyEnd);

  // ---------------------------------------------------------------------------
  // Build menu: boxes, furniture, and the collection of unlocks
  // ---------------------------------------------------------------------------
  let shopTab = 'boxes';

  function closeModals() { document.querySelectorAll('.modal').forEach(m => { m.hidden = true; }); }
  function openShop(tab) {
    if (locked) document.exitPointerLock();
    keys.clear();
    if (tab) shopTab = tab;
    $('shop').hidden = false;
    renderShop();
  }

  function placeAhead() {
    return [player.x - Math.sin(player.yaw) * 2.5, player.z - Math.cos(player.yaw) * 2.5];
  }

  let shopKind = 'box';
  function renderShop() {
    document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === shopTab));
    const list = $('shopList');
    const scroll = list.scrollTop;
    list.innerHTML = '';
    list.className = 'shop-list ' + shopTab;
    if (shopTab === 'boxes') {
      const counts = new Array(SHADES.length).fill(0);
      cr.forEach(o => { counts[o.c]++; });
      const used = storageUsed(), lim = boxLimit(lvl('storage'));
      const full = used >= lim;
      const nextPermit = LADDER.find(r => r.up === 'storage' && r.at > state.bestTotal);
      const intro = document.createElement('div');
      intro.className = 'tab-intro';
      intro.innerHTML = `<div class="kind-pick">
          <button data-kind="box" class="${shopKind === 'box' ? 'active' : ''}">📦 Box<small>Packs onto a shelf when full</small></button>
          <button data-kind="drawer" class="${shopKind === 'drawer' ? 'active' : ''}">🗄️ Drawer<small>Holds ${capacity() * 3}, stacks ${STACK_MAX} high</small></button>
          ${lvl('jars') ? `<button data-kind="jar" class="${shopKind === 'jar' ? 'active' : ''}">🫙 Jar<small>Holds ${capacity() * 2}, see-through, small</small></button>` : ''}
        </div>
        <div class="limit${full ? ' full' : ''}"><b>📋 ${used} / ${limTxt(lim)}</b> boxes and drawers placed${lim === Infinity ? '' : nextPermit ? ` <span>· the next Storage Permit at ${nextPermit.at.toLocaleString()} sorted adds more</span>` : ''}</div>
        <p>${full ? 'Your storage is full. Press C on an empty box to give it a new shade, put one away with G then X, or sort more to earn a Storage Permit.'
          : shopKind === 'jar' ? 'Jars are small and see-through, so a shelf of them shows which shades are nearly done.'
          : shopKind === 'drawer'
          ? 'Look at a drawer while placing a new one to stack it on top, and build towers of sorting drawers.'
          : 'Grab a box for any shade and put it wherever makes sense to you. Full boxes pack onto a shelf and the box is ready to fill again.'}</p>`;
      intro.querySelectorAll('[data-kind]').forEach(b => { b.onclick = () => { shopKind = b.dataset.kind; renderShop(); }; });
      list.appendChild(intro);
      FAMILIES.forEach((f, fi) => {
        const row = document.createElement('div');
        row.className = 'shade-row';
        row.innerHTML = `<h4>${f.name}</h4>`;
        f.shades.forEach((_, si) => {
          const i = fi * 3 + si, s = SHADES[i];
          const nb = state.boxes.filter(b => b.color === i && isBox(b)).length;
          const nd = state.boxes.filter(b => b.color === i && (isDrawer(b) || isBin(b))).length;
          const nj = state.boxes.filter(b => b.color === i && isJar(b)).length;
          const have = [nb && nb + ' box' + (nb > 1 ? 'es' : ''), nd && nd + ' drawer' + (nd > 1 ? 's' : ''), nj && nj + ' jar' + (nj > 1 ? 's' : '')].filter(Boolean).join(', ') || 'nothing yet';
          const btn = document.createElement('button');
          btn.innerHTML = `<span class="sw" style="background:${s.hex}"></span><span>${s.name}<small>${counts[i].toLocaleString()} on the floor · ${have}</small></span>`;
          btn.disabled = full;
          btn.onclick = () => {
            if (storageUsed() >= boxLimit(lvl('storage'))) return;
            const [x, z] = placeAhead();
            const b = addBox(x, z, i, 0, 0, shopKind);
            closeModals();
            startPlacing('box', b, true);
            blip(700, 0.08, 'triangle', 0.05);
          };
          row.appendChild(btn);
        });
        list.appendChild(row);
      });
    } else if (shopTab === 'furniture') {
      Object.entries(DECOR).sort((a, b) => (b[1].free ? 1 : 0) - (a[1].free ? 1 : 0)).forEach(([type, def]) => {
        const open = unlockedDecor.has(type);
        const el = document.createElement('div');
        el.className = 'item' + (open ? '' : ' locked');
        let how = '';
        if (!open) {
          REWARDS.forEach((tiers, fi) => tiers.forEach((r, ti) => {
            if (r.decor === type) how = `Sort ${TIERS[ti]} ${FAMILIES[fi].name} to unlock (${Math.min(state.familyBest[fi], TIERS[ti])}/${TIERS[ti]})`;
          }));
        }
        const n = state.decor.filter(d => d.type === type).length;
        const capped = (type === 'shelf' && n >= shelfLimit(lvl('storage'))) || (def.bins && storageUsed() >= boxLimit(lvl('storage')));
        const lad = LADDER.find(r => r.decor === type);
        if (!open && lad) how = `Sort ${lad.at.toLocaleString()} crayons in total to unlock (${Math.min(state.bestTotal, lad.at).toLocaleString()}/${lad.at.toLocaleString()})`;
        if (def.bins && open && capped) how = 'Your storage is full. A Storage Permit makes room.';
        if (type === 'shelf' && open) how = capped ? `All ${n} shelf units placed. A Storage Permit adds more.` : `${n} of ${limTxt(shelfLimit(lvl('storage')))} shelf units placed.`;
        el.innerHTML = `<h3><span>${open ? def.icon : '🔒'}</span>${def.name}<span class="lvl">${n ? n + ' placed' : ''}</span></h3><p>${open ? (def.desc || (def.wall ? 'Hangs on a wall.' : 'Sits on the floor.')) + (how ? ' ' + how : '') : how}</p>`;
        const btn = document.createElement('button');
        btn.className = open ? 'primary' : '';
        btn.disabled = !open || capped;
        btn.textContent = !open ? 'Locked' : capped ? 'At the limit' : 'Place one';
        btn.onclick = () => {
          if (!open || capped) return;
          const [x, z] = placeAhead();
          const d = { type, x, y: def.wall ? 2.2 : 0, z, ry: 0, packed: [] };
          state.decor.push(d);
          buildDecor(d);
          closeModals();
          startPlacing('decor', d, true);
          toast(def.wall ? 'Look at a wall and click to hang it.' : 'Look where you want it and click to place it.');
        };
        el.appendChild(btn);
        list.appendChild(el);
      });
    } else {
      // Collection: progress per color family and what it unlocks
      const ups = document.createElement('div');
      ups.className = 'ups';
      ups.innerHTML = '<h4>Your upgrades</h4>' + Object.entries(UPGRADES).map(([id, u]) => {
        const l = lvl(id);
        return `<div class="up${l ? '' : ' off'}">${u.icon} <b>${u.name}</b>${l > 1 && !['autoPack', 'botSpeed'].includes(id) ? ' ×' + l : ''}<small>${l ? u.info(l) : 'Not unlocked yet'}</small></div>`;
      }).join('');
      list.appendChild(ups);
      const lad = document.createElement('div');
      lad.className = 'ladder';
      const nxt = LADDER.find(r => (r.up || r.decor) && r.at > state.bestTotal);
      lad.innerHTML = `<h4>Sorting milestones <span class="lvl">${state.bestTotal.toLocaleString()} sorted at best</span></h4><ol>` + LADDER.map(r => {
        const got = !r.soon && state.bestTotal >= r.at;
        const cls = r.soon ? 'soon' : got ? 'got' : r === nxt ? 'next' : '';
        return `<li class="${cls}"><span class="tier">${r.at.toLocaleString()}</span>${rewardIcon(r)} ${rewardName(r)}${got ? ' ✓' : r.soon ? ' <small>coming in a later update</small>' : r === nxt ? ` <small>${(r.at - state.bestTotal).toLocaleString()} to go</small>` : ''}</li>`;
      }).join('') + '</ol>';
      list.appendChild(lad);
      const pg = document.createElement('div');
      pg.className = 'ups';
      pg.innerHTML = `<h4>📄 Coloring pages: ${coloring.found.size} of ${PAGES.length} found</h4>` + PAGES.map((page, i) => {
        const got = coloring.found.has(i);
        return `<div class="up${got ? '' : ' off'}">${got ? '📄' : '❔'} <b>${got ? page.name : 'Hidden somewhere'}</b><small>${got ? (coloring.strokes[i] ? coloring.strokes[i] + ' strokes colored' : 'Not colored yet') : 'Keep looking around the room'}</small></div>`;
      }).join('');
      list.appendChild(pg);
      FAMILIES.forEach((f, fi) => {
        const n = state.familyBest[fi];
        const el = document.createElement('div');
        el.className = 'fam';
        const swatches = f.shades.map(s => `<span class="sw" style="background:${s[1]}"></span>`).join('');
        const tiers = REWARDS[fi].map((r, ti) => {
          const got = n >= TIERS[ti];
          return `<li class="${got ? 'got' : ''}"><span class="tier">${TIERS[ti]}</span>${rewardIcon(r)} ${rewardName(r)}${got ? ' ✓' : ''}</li>`;
        }).join('');
        const max = TIERS[TIERS.length - 1];
        el.innerHTML = `<h3>${swatches}${f.name}<span class="lvl">${n.toLocaleString()} sorted</span></h3>
          <div class="bar"><div style="width:${Math.min(100, n / max * 100)}%"></div></div><ul>${tiers}</ul>`;
        list.appendChild(el);
      });
    }
    list.scrollTop = scroll;
  }

  $('btnShop').onclick = () => openShop();
  document.querySelectorAll('.tabs button').forEach(b => { b.onclick = () => { shopTab = b.dataset.tab; $('shopList').scrollTop = 0; renderShop(); }; });
  document.querySelectorAll('[data-close]').forEach(b => { b.onclick = () => { $(b.dataset.close).hidden = true; }; });
  document.querySelectorAll('.modal').forEach(m => m.addEventListener('pointerdown', e => { if (e.target === m) m.hidden = true; }));

  // Shade picker for changing an empty box's shade
  function openPicker(box) {
    if (locked) document.exitPointerLock();
    $('pickerTitle').textContent = `Change this ${isDrawer(box) ? 'drawer' : 'box'} to which shade?`;
    const list = $('pickerList');
    list.innerHTML = '';
    SHADES.forEach((s, i) => {
      const btn = document.createElement('button');
      btn.innerHTML = `<span class="sw" style="background:${s.hex}"></span><span>${s.name}</span>`;
      btn.onclick = () => { box.color = i; if (isDrawer(box) && lvl('labels')) { scene.remove(box.group); buildDrawer(box); } else refreshBox(box); save(); closeModals(); };
      list.appendChild(btn);
    });
    $('picker').hidden = false;
  }

  // ---------------------------------------------------------------------------
  // Coloring pages: color line-art pages with the crayon you're holding
  // ---------------------------------------------------------------------------
  const COLOR_KEY = 'cray-sorting-coloring-v1';
  const COLOR_STARTERS = [1, 4, 7]; // the crayons standing in the cup on the coloring table
  const PAGE_W = 640, PAGE_H = 480;
  const line = (g, w = 6) => { g.strokeStyle = '#222'; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; };
  const circle = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); };
  const ellipse = (g, x, y, rx, ry, rot = 0) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); g.stroke(); };
  const poly = (g, pts, close = true) => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); if (close) g.closePath(); g.stroke(); };
  const PAGES = [
    { name: 'Sleepy Cat', draw: g => {
      line(g);
      ellipse(g, 330, 330, 170, 95);                       // body
      circle(g, 200, 230, 80);                             // head
      poly(g, [[140, 185], [150, 110], [195, 155]]); poly(g, [[205, 150], [250, 105], [262, 180]]);
      g.beginPath(); g.moveTo(170, 230); g.quadraticCurveTo(180, 240, 190, 230); g.moveTo(215, 230); g.quadraticCurveTo(225, 240, 235, 230); g.stroke();
      poly(g, [[196, 252], [210, 252], [203, 262]]);
      g.beginPath(); g.moveTo(490, 330); g.bezierCurveTo(600, 300, 590, 420, 500, 400); g.stroke(); // tail
      ellipse(g, 300, 420, 60, 18); ellipse(g, 400, 420, 60, 18);
      line(g, 4); for (const [x1, y1, x2, y2] of [[150, 255, 95, 245], [150, 265, 95, 275], [255, 255, 310, 245], [255, 265, 310, 275]]) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
      line(g, 5); for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(330 + i * 45, 250); g.quadraticCurveTo(345 + i * 45, 290, 330 + i * 45, 320); g.stroke(); }
      g.font = 'bold 34px "Trebuchet MS", sans-serif'; g.fillStyle = '#222'; g.fillText('z', 300, 150); g.fillText('z', 330, 115); g.fillText('Z', 365, 80);
    } },
    { name: 'Cozy House', draw: g => {
      line(g);
      g.strokeRect(170, 220, 300, 200);
      poly(g, [[140, 230], [320, 90], [500, 230]]);
      g.strokeRect(290, 320, 60, 100);
      g.strokeRect(200, 260, 60, 55); g.strokeRect(380, 260, 60, 55);
      g.beginPath(); g.moveTo(230, 260); g.lineTo(230, 315); g.moveTo(200, 287); g.lineTo(260, 287); g.moveTo(410, 260); g.lineTo(410, 315); g.moveTo(380, 287); g.lineTo(440, 287); g.stroke();
      g.strokeRect(410, 110, 40, 70);
      circle(g, 560, 80, 40);
      for (let a = 0; a < 8; a++) { g.beginPath(); g.moveTo(560 + Math.cos(a * 0.785) * 52, 80 + Math.sin(a * 0.785) * 52); g.lineTo(560 + Math.cos(a * 0.785) * 72, 80 + Math.sin(a * 0.785) * 72); g.stroke(); }
      g.beginPath(); g.moveTo(10, 440); g.quadraticCurveTo(320, 405, 630, 440); g.stroke();
      ellipse(g, 70, 300, 45, 70); g.beginPath(); g.moveTo(70, 370); g.lineTo(70, 430); g.stroke();
      ellipse(g, 120, 90, 60, 25); ellipse(g, 170, 80, 45, 22);
    } },
    { name: 'Goldfish Friends', draw: g => {
      line(g);
      const fish = (x, y, s, flip) => {
        g.save(); g.translate(x, y); g.scale(flip ? -s : s, s);
        ellipse(g, 0, 0, 90, 55);
        poly(g, [[85, 0], [150, -50], [150, 50]]);
        poly(g, [[-10, -50], [20, -95], [40, -48]]);
        circle(g, -50, -12, 10);
        g.beginPath(); g.arc(-20, 0, 40, -0.9, 0.9); g.stroke();
        g.restore();
      };
      fish(220, 200, 1, false); fish(470, 330, 0.8, true);
      for (const [x, y, r] of [[120, 120, 14], [100, 80, 10], [90, 45, 7], [560, 200, 12], [575, 160, 8]]) circle(g, x, y, r);
      for (const x of [60, 330, 600]) { g.beginPath(); g.moveTo(x, 470); g.bezierCurveTo(x - 30, 420, x + 30, 380, x, 330); g.stroke(); }
      g.beginPath(); g.moveTo(0, 470); g.lineTo(640, 470); g.stroke();
    } },
    { name: 'Rocket Trip', draw: g => {
      line(g);
      g.beginPath(); g.moveTo(320, 50); g.bezierCurveTo(400, 120, 400, 260, 380, 340); g.lineTo(260, 340); g.bezierCurveTo(240, 260, 240, 120, 320, 50); g.stroke();
      circle(g, 320, 180, 38); circle(g, 320, 180, 26);
      poly(g, [[262, 270], [210, 360], [265, 340]]); poly(g, [[378, 270], [430, 360], [375, 340]]);
      poly(g, [[280, 340], [300, 410], [320, 370], [340, 410], [360, 340]], false);
      circle(g, 110, 120, 55); ellipse(g, 110, 120, 95, 20, -0.3);
      const star = (x, y, r) => { const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } poly(g, pts); };
      star(520, 100, 32); star(560, 330, 24); star(90, 380, 26); star(470, 230, 16);
      g.beginPath(); g.arc(560, 210, 40, 0.6 * Math.PI, 1.6 * Math.PI); g.arc(580, 200, 34, 1.5 * Math.PI, 0.7 * Math.PI, true); g.stroke();
    } },
    { name: 'Flower Garden', draw: g => {
      line(g);
      const flower = (x, y, r, petals) => {
        g.beginPath(); g.moveTo(x, y + r); g.quadraticCurveTo(x - 15, y + 140, x, 450); g.stroke();
        ellipse(g, x - 35, y + r + 80, 30, 12, -0.5);
        for (let i = 0; i < petals; i++) { const a = i * TAU / petals; ellipse(g, x + Math.cos(a) * r * 1.5, y + Math.sin(a) * r * 1.5, r * 0.9, r * 0.55, a); }
        circle(g, x, y, r * 0.8);
      };
      flower(150, 190, 34, 6); flower(330, 140, 40, 8); flower(510, 210, 30, 5);
      g.beginPath(); g.moveTo(0, 450); g.lineTo(640, 450); g.stroke();
      // a butterfly
      ellipse(g, 450, 70, 30, 22, -0.5); ellipse(g, 492, 70, 30, 22, 0.5); ellipse(g, 455, 108, 22, 15, 0.4); ellipse(g, 488, 108, 22, 15, -0.4);
      g.beginPath(); g.moveTo(471, 60); g.lineTo(471, 120); g.moveTo(471, 60); g.lineTo(455, 35); g.moveTo(471, 60); g.lineTo(487, 35); g.stroke();
    } },
    { name: 'Dino Stomp', draw: g => {
      line(g);
      g.beginPath(); g.moveTo(120, 330); g.bezierCurveTo(130, 220, 260, 200, 330, 240); g.bezierCurveTo(360, 180, 360, 120, 400, 95);
      g.bezierCurveTo(440, 70, 520, 80, 520, 120); g.bezierCurveTo(520, 150, 470, 150, 440, 145); g.bezierCurveTo(420, 200, 430, 260, 420, 300);
      g.bezierCurveTo(400, 360, 300, 370, 230, 350); g.bezierCurveTo(170, 345, 100, 360, 30, 330); g.bezierCurveTo(70, 320, 100, 330, 120, 330); g.stroke();
      circle(g, 470, 105, 8);
      g.beginPath(); g.moveTo(480, 130); g.lineTo(510, 128); g.stroke();
      for (const x of [200, 260, 330, 380]) { g.beginPath(); g.moveTo(x, 345); g.lineTo(x - 5, 420); g.lineTo(x + 25, 420); g.lineTo(x + 25, 350); g.stroke(); }
      for (const [x, y] of [[190, 235], [240, 215], [290, 215], [335, 225], [365, 175], [385, 130]]) poly(g, [[x - 18, y + 6], [x, y - 26], [x + 18, y + 4]], false);
      g.beginPath(); g.moveTo(0, 425); g.lineTo(640, 425); g.stroke();
      circle(g, 560, 360, 40); circle(g, 545, 345, 6); circle(g, 575, 370, 8);
    } },
    { name: 'Friendly Robot', draw: g => {
      line(g);
      g.strokeRect(240, 70, 160, 120); circle(g, 285, 125, 18); circle(g, 355, 125, 18);
      g.strokeRect(285, 160, 70, 14);
      g.beginPath(); g.moveTo(320, 70); g.lineTo(320, 35); g.stroke(); circle(g, 320, 26, 10);
      g.strokeRect(210, 200, 220, 170); g.strokeRect(260, 230, 120, 70);
      circle(g, 285, 335, 12); circle(g, 320, 335, 12); circle(g, 355, 335, 12);
      g.strokeRect(150, 210, 50, 130); g.strokeRect(440, 210, 50, 130);
      circle(g, 175, 360, 22); circle(g, 465, 360, 22);
      g.strokeRect(250, 370, 50, 70); g.strokeRect(340, 370, 50, 70);
      g.strokeRect(235, 440, 80, 22); g.strokeRect(325, 440, 80, 22);
    } },
    { name: 'Sailboat Day', draw: g => {
      line(g);
      g.beginPath(); g.moveTo(170, 330); g.lineTo(470, 330); g.lineTo(420, 400); g.lineTo(220, 400); g.closePath(); g.stroke();
      g.beginPath(); g.moveTo(320, 330); g.lineTo(320, 70); g.stroke();
      poly(g, [[320, 80], [320, 310], [190, 310]]); poly(g, [[330, 110], [330, 310], [450, 310]]);
      poly(g, [[320, 70], [370, 82], [320, 94]]);
      for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(0, 410 + i * 18); for (let x = 0; x <= 640; x += 40) g.quadraticCurveTo(x + 20, 400 + i * 18, x + 40, 410 + i * 18); g.stroke(); }
      circle(g, 90, 90, 45);
      g.beginPath(); g.moveTo(500, 120); g.quadraticCurveTo(515, 105, 530, 120); g.quadraticCurveTo(545, 105, 560, 120); g.stroke();
    } },
    { name: 'Teddy Bear', draw: g => {
      line(g);
      circle(g, 320, 150, 80); circle(g, 250, 85, 30); circle(g, 390, 85, 30);
      ellipse(g, 320, 180, 35, 25); circle(g, 290, 135, 8); circle(g, 350, 135, 8);
      g.beginPath(); g.moveTo(320, 170); g.lineTo(320, 188); g.moveTo(305, 192); g.quadraticCurveTo(320, 202, 335, 192); g.stroke();
      ellipse(g, 320, 330, 95, 105); ellipse(g, 320, 340, 50, 55);
      ellipse(g, 205, 290, 30, 55, 0.6); ellipse(g, 435, 290, 30, 55, -0.6);
      ellipse(g, 255, 430, 45, 30); ellipse(g, 385, 430, 45, 30);
      poly(g, [[290, 230], [320, 245], [350, 230], [350, 260], [320, 245], [290, 260]]);
    } },
    { name: 'Crayon Castle', draw: g => {
      line(g);
      g.strokeRect(180, 200, 280, 240);
      for (const x of [120, 460]) { g.strokeRect(x, 140, 60, 300); poly(g, [[x - 10, 140], [x + 30, 70], [x + 70, 140]]); }
      for (let i = 0; i < 7; i++) g.strokeRect(180 + i * 40, 175, 20, 25);
      g.beginPath(); g.moveTo(280, 440); g.lineTo(280, 360); g.arc(320, 360, 40, Math.PI, 0); g.lineTo(360, 440); g.stroke();
      g.strokeRect(220, 250, 35, 50); g.strokeRect(385, 250, 35, 50);
      for (const x of [150, 490]) { g.beginPath(); g.moveTo(x, 70); g.lineTo(x, 30); g.stroke(); poly(g, [[x, 30], [x + 35, 40], [x, 50]]); }
      g.beginPath(); g.moveTo(0, 440); g.lineTo(640, 440); g.stroke();
    } },
  ];

  // Three pages start on the coloring table; the rest are hidden around the room
  const STARTER_PAGES = [0, 1, 2];
  const HIDDEN_PAGES = [
    { page: 3, where: 'buried in the big heap', pos: [-1.2, 0.006, -0.8], rot: [-Math.PI / 2, 0.4, 0] },
    { page: 4, where: 'on top of a bookcase', pos: [-11.6, 1.868, 1.6], rot: [-Math.PI / 2, 1.2, 0] },
    { page: 5, where: 'behind the sofa', pos: [11.25, 0.006, 8.9], rot: [-Math.PI / 2, -0.3, 0] },
    { page: 6, where: 'on a windowsill', pos: [5.6, 1.718, -11.85], rot: [-Math.PI / 2, 0.15, 0] },
    { page: 7, where: 'on top of the toy cubbies', pos: [11.55, 1.025, 3.2], rot: [-Math.PI / 2, 2.0, 0] },
    { page: 8, where: 'taped to the door', pos: [-HALF + 0.07, 1.55, -3.15], rot: [0, Math.PI / 2, 0.08] },
    { page: 9, where: 'on top of a shelf unit', pos: [4.3, 2.16, 11.35], rot: [-Math.PI / 2 + 0.5, Math.PI, 0] },
  ];
  const coloring = { page: 0, size: 14, eraser: false, found: new Set(STARTER_PAGES), strokes: PAGES.map(() => 0) };
  const paintCanvases = PAGES.map(() => { const c = document.createElement('canvas'); c.width = PAGE_W; c.height = PAGE_H; return c; });
  const lineCanvases = PAGES.map(pg => {
    const c = document.createElement('canvas'); c.width = PAGE_W; c.height = PAGE_H;
    pg.draw(c.getContext('2d'));
    return c;
  });
  // small textures of each page for the paper sheets in the room
  const pageThumbs = PAGES.map(() => { const c = document.createElement('canvas'); c.width = 256; c.height = 192; return c; });
  const pageTexs = pageThumbs.map(c => { const t = new T.CanvasTexture(c); t.anisotropy = 4; return t; });
  function updatePageTex(i) {
    const g = pageThumbs[i].getContext('2d');
    g.fillStyle = '#fffdf6'; g.fillRect(0, 0, 256, 192);
    g.drawImage(paintCanvases[i], 0, 0, 256, 192);
    g.drawImage(lineCanvases[i], 0, 0, 256, 192);
    pageTexs[i].needsUpdate = true;
  }
  PAGES.forEach((_, i) => updatePageTex(i));

  function loadColoring() {
    try {
      const s = JSON.parse(localStorage.getItem(COLOR_KEY) || 'null');
      if (!s) return;
      (s.found || []).forEach(i => { if (PAGES[i]) coloring.found.add(i); });
      (s.strokes || []).forEach((n, i) => { if (i < PAGES.length) coloring.strokes[i] = n || 0; });
      (s.pages || []).forEach((url, i) => {
        if (!url || !paintCanvases[i]) return;
        paintCanvases[i].hasPaint = true;
        const img = new Image();
        img.onload = () => { paintCanvases[i].getContext('2d').drawImage(img, 0, 0); updatePageTex(i); };
        img.src = url;
      });
    } catch (e) { /* ignore */ }
  }
  function saveColoring() {
    try {
      const pages = paintCanvases.map(c => c.hasPaint ? c.toDataURL('image/png') : null);
      localStorage.setItem(COLOR_KEY, JSON.stringify({ found: [...coloring.found], strokes: coloring.strokes, pages }));
    } catch (e) { /* storage may be full */ }
  }
  loadColoring();

  // Paper sheets you can look at and click
  const sheetGeo = new T.PlaneGeometry(0.3, 0.225);
  const sheetMats = pageTexs.map(t => new T.MeshStandardMaterial({ map: t, roughness: 0.9, side: T.DoubleSide }));
  const pageMeshes = [];   // sheets on the coloring table
  const hiddenMeshes = []; // sheets still waiting to be found
  const sheetSpots = [[-0.55, -0.25, 0.2], [-0.22, -0.3, -0.15], [0.12, -0.22, 0.1], [-0.6, 0.05, -0.1], [-0.27, 0.02, 0.25], [0.06, 0.1, -0.2],
    [0.38, 0.2, 0.15], [-0.55, 0.33, 0.05], [-0.2, 0.35, -0.25], [0.15, 0.36, 0.3]];
  const mainTable = () => state && state.decor.find(t => t.type === 'table');
  function addTableSheets(d, g) {
    for (let k = pageMeshes.length - 1; k >= 0; k--) if (pageMeshes[k].userData.table === d) pageMeshes.splice(k, 1);
    if (d !== mainTable()) return;
    [...coloring.found].sort((a, b) => a - b).forEach((i, k) => {
      const [x, z, r] = sheetSpots[k % sheetSpots.length];
      const m = new T.Mesh(sheetGeo, sheetMats[i]);
      m.rotation.set(-Math.PI / 2, 0, r);
      m.position.set(x, 0.632 + k * 0.0015, z);
      m.receiveShadow = true;
      m.userData = { page: i, table: d };
      g.add(m);
      pageMeshes.push(m);
    });
  }
  function refreshTableSheets() {
    const t = mainTable();
    state.decor.filter(d => d.type === 'table').forEach(rebuildDecor);
    if (!t) pageMeshes.length = 0;
  }
  const hiddenGroup = new T.Group();
  scene.add(hiddenGroup);
  function placeHiddenPages() {
    hiddenMeshes.forEach(m => hiddenGroup.remove(m));
    hiddenMeshes.length = 0;
    for (const h of HIDDEN_PAGES) {
      if (coloring.found.has(h.page)) continue;
      const m = new T.Mesh(sheetGeo, sheetMats[h.page]);
      m.position.set(...h.pos);
      m.rotation.set(h.rot[0], h.rot[1], h.rot[2], 'YXZ');
      m.userData = { page: h.page, hidden: h };
      hiddenGroup.add(m);
      hiddenMeshes.push(m);
    }
  }
  placeHiddenPages();
  function rayPages(maxT) {
    raycaster.far = maxT;
    const hits = raycaster.intersectObjects(pageMeshes.concat(hiddenMeshes), false);
    raycaster.far = Infinity;
    return hits.length ? { obj: hits[0].object, t: hits[0].distance } : null;
  }
  function findPage(m) {
    const h = m.userData.hidden;
    coloring.found.add(h.page);
    saveColoring();
    placeHiddenPages();
    refreshTableSheets();
    celebrate(`📄 Found a coloring page: ${PAGES[h.page].name}!`, `It was ${h.where}. It's on the coloring table now (${coloring.found.size} of ${PAGES.length} found).`);
  }

  const colorView = $('colorCanvas');
  const cvx = colorView.getContext('2d');
  function drawColoringView() {
    cvx.fillStyle = '#fffdf6'; cvx.fillRect(0, 0, PAGE_W, PAGE_H);
    cvx.drawImage(paintCanvases[coloring.page], 0, 0);
    cvx.drawImage(lineCanvases[coloring.page], 0, 0);
  }
  function renderColoringUI() {
    $('colorTitle').textContent = PAGES[coloring.page].name;
    $('colorFound').textContent = `${coloring.found.size} of ${PAGES.length} pages found`;
    const s = SHADES[coloring.color];
    $('colorCurrent').innerHTML = coloring.eraser ? 'Eraser' : `<span class="sw" style="background:${s.hex}"></span>${s.name}`;
    document.querySelectorAll('#colorTools [data-size]').forEach(b => b.classList.toggle('active', !coloring.eraser && +b.dataset.size === coloring.size));
    $('colorEraser').classList.toggle('active', coloring.eraser);
    $('colorNote').textContent = coloring.found.size < PAGES.length
      ? `You're coloring with the crayon in your hand. Pick up another shade to switch colors. ${PAGES.length - coloring.found.size} more pages are hidden around the room.`
      : "You're coloring with the crayon in your hand. Pick up another shade to switch colors. You've found every page!";
  }
  function openColoring(page) {
    if (!hand.n) { toast('Pick up a crayon first, then color with it (V).'); return; }
    if (locked) document.exitPointerLock();
    coloring.page = page;
    coloring.color = hand.c;
    coloring.eraser = false;
    renderColoringUI();
    drawColoringView();
    $('coloring').hidden = false;
  }

  // Waxy crayon strokes: lots of tiny grains, so it looks drawn rather than painted
  function crayonDab(g, x, y, r) {
    const n = Math.ceil(r * 1.6);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * r;
      g.globalAlpha = 0.35 + Math.random() * 0.4;
      g.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, 2.2, 2.2);
    }
    g.globalAlpha = 1;
  }
  let stroke = null;
  function strokeTo(x, y) {
    const c = paintCanvases[coloring.page], g = c.getContext('2d');
    const r = coloring.eraser ? coloring.size * 1.4 : coloring.size / 2;
    g.save();
    if (coloring.eraser) g.globalCompositeOperation = 'destination-out';
    g.fillStyle = coloring.eraser ? '#000' : SHADES[coloring.color].hex;
    const [px, py] = stroke.last || [x, y];
    const dist = Math.hypot(x - px, y - py), steps = Math.max(1, Math.ceil(dist / Math.max(1.5, r / 3)));
    for (let k = 1; k <= steps; k++) {
      const t = k / steps, xx = px + (x - px) * t, yy = py + (y - py) * t;
      if (coloring.eraser) { g.beginPath(); g.arc(xx, yy, r, 0, TAU); g.fill(); } else crayonDab(g, xx, yy, r);
    }
    g.restore();
    c.hasPaint = true;
    stroke.last = [x, y];
    if (!viewQueued) { viewQueued = true; requestAnimationFrame(() => { viewQueued = false; drawColoringView(); }); }
  }
  let viewQueued = false;
  const pagePoint = e => {
    const rc = colorView.getBoundingClientRect();
    return [(e.clientX - rc.left) / rc.width * PAGE_W, (e.clientY - rc.top) / rc.height * PAGE_H];
  };
  colorView.addEventListener('pointerdown', e => {
    e.preventDefault();
    colorView.setPointerCapture(e.pointerId);
    stroke = { id: e.pointerId, last: null };
    strokeTo(...pagePoint(e));
  });
  colorView.addEventListener('pointermove', e => { if (stroke && stroke.id === e.pointerId) strokeTo(...pagePoint(e)); });
  const endStroke = () => {
    if (!stroke) return;
    stroke = null;
    if (!coloring.eraser) coloring.strokes[coloring.page]++;
    updatePageTex(coloring.page);
    saveColoring();
  };
  colorView.addEventListener('pointerup', endStroke);
  colorView.addEventListener('pointercancel', endStroke);
  document.querySelectorAll('#colorTools [data-size]').forEach(b => { b.onclick = () => { coloring.size = +b.dataset.size; coloring.eraser = false; renderColoringUI(); }; });
  $('colorEraser').onclick = () => { coloring.eraser = !coloring.eraser; renderColoringUI(); };
  let clearArmed = 0;
  $('colorClear').onclick = () => {
    if (Date.now() - clearArmed > 3000) { clearArmed = Date.now(); $('colorClear').textContent = 'Click again to clear'; setTimeout(() => { $('colorClear').textContent = '🧽 Clear page'; }, 3000); return; }
    clearArmed = 0; $('colorClear').textContent = '🧽 Clear page';
    const c = paintCanvases[coloring.page];
    c.getContext('2d').clearRect(0, 0, PAGE_W, PAGE_H);
    c.hasPaint = false;
    drawColoringView(); updatePageTex(coloring.page); saveColoring();
  };

  // ---------------------------------------------------------------------------
  // Scribbling on the room: hold V with a crayon to draw on walls and furniture
  // ---------------------------------------------------------------------------
  const MARKS_KEY = 'cray-sorting-marks-v1';
  const MARK_MAX = 20000;
  const markMesh = new T.InstancedMesh(new T.CircleGeometry(0.02, 7), new T.MeshStandardMaterial({ roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), MARK_MAX);
  markMesh.setColorAt(0, new T.Color(1, 1, 1));
  markMesh.count = 0;
  markMesh.frustumCulled = false;
  scene.add(markMesh);
  const marks = []; // {x,y,z,nx,ny,nz,c}
  let markHead = 0;
  const _mq = new T.Quaternion(), _mq2 = new T.Quaternion(), _mz = new T.Vector3(0, 0, 1), _mn = new T.Vector3(), _mp = new T.Vector3(), _ms = new T.Vector3(), _mm = new T.Matrix4();
  function writeMark(i) {
    const k = marks[i];
    _mn.set(k.nx, k.ny, k.nz);
    _mq.setFromUnitVectors(_mz, _mn);
    _mq2.setFromAxisAngle(_mz, (i * 2.399) % TAU);
    _mq.multiply(_mq2);
    const sc = 0.75 + ((i * 7919) % 50) / 100;
    _ms.set(sc, sc * 0.8, 1);
    _mp.set(k.x, k.y, k.z);
    _mm.compose(_mp, _mq, _ms);
    markMesh.setMatrixAt(i, _mm);
    markMesh.setColorAt(i, SHADE_COLORS[k.c]);
  }
  function addMark(p, n, c) {
    const k = { x: p.x + n.x * 0.004, y: p.y + n.y * 0.004, z: p.z + n.z * 0.004, nx: n.x, ny: n.y, nz: n.z, c };
    let i;
    if (marks.length < MARK_MAX) { i = marks.length; marks.push(k); }
    else { i = markHead; marks[i] = k; markHead = (markHead + 1) % MARK_MAX; }
    writeMark(i);
    markMesh.count = marks.length;
    markMesh.instanceMatrix.needsUpdate = true;
    markMesh.instanceColor.needsUpdate = true;
  }
  function rebuildMarks() {
    marks.forEach((_, i) => writeMark(i));
    markMesh.count = marks.length;
    markMesh.instanceMatrix.needsUpdate = true;
    if (markMesh.instanceColor) markMesh.instanceColor.needsUpdate = true;
  }
  // moving or putting away furniture takes its scribbles with it (they'd float otherwise)
  function removeMarksNear(x, z, r) {
    const keep = marks.filter(k => Math.hypot(k.x - x, k.z - z) > r || Math.abs(k.x) > HALF - 0.05 || Math.abs(k.z) > HALF - 0.05);
    if (keep.length === marks.length) return;
    marks.length = 0; marks.push(...keep); markHead = 0;
    rebuildMarks();
  }
  function clearMarks() { marks.length = 0; markHead = 0; markMesh.count = 0; try { localStorage.removeItem(MARKS_KEY); } catch (e) { /* ignore */ } }
  function saveMarks() {
    try {
      const f = new Int16Array(marks.length * 7);
      marks.forEach((k, i) => { f.set([k.x * 1000, k.y * 1000, k.z * 1000, k.nx * 1000, k.ny * 1000, k.nz * 1000, k.c], i * 7); });
      const bytes = new Uint8Array(f.buffer);
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      localStorage.setItem(MARKS_KEY, btoa(bin));
    } catch (e) { /* storage may be full */ }
  }
  (function loadMarks() {
    try {
      const raw = localStorage.getItem(MARKS_KEY);
      if (!raw) return;
      const bin = atob(raw), bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const f = new Int16Array(bytes.buffer, 0, Math.floor(bytes.length / 2));
      for (let i = 0; i + 6 < f.length && marks.length < MARK_MAX; i += 7) marks.push({ x: f[i] / 1000, y: f[i + 1] / 1000, z: f[i + 2] / 1000, nx: f[i + 3] / 1000, ny: f[i + 4] / 1000, nz: f[i + 5] / 1000, c: f[i + 6] });
      rebuildMarks();
    } catch (e) { /* ignore */ }
  })();

  let scribbling = false, scribbleLast = null, scribbleSound = 0;
  const _sn = new T.Vector3();
  function scribbleStep(dt) {
    if (!hand.n) { scribbling = false; return; }
    raycaster.setFromCamera(locked ? CENTER : mouseNDC, camera);
    raycaster.camera = camera;
    raycaster.far = 6;
    const targets = scene.children.filter(o => o !== crayonMesh && o !== storedMesh && o !== markMesh && o !== camera && !o.isLight && o !== hiddenGroup);
    const hit = raycaster.intersectObjects(targets, true).find(h => h.face && !h.object.isSprite);
    raycaster.far = Infinity;
    if (!hit) { scribbleLast = null; return; }
    _sn.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
    if (_sn.dot(raycaster.ray.direction) > 0) _sn.negate();
    const p = hit.point;
    if (scribbleLast && scribbleLast.p.distanceTo(p) < 0.6 && scribbleLast.n.dot(_sn) > 0.9) {
      const d = scribbleLast.p.distanceTo(p), steps = Math.min(40, Math.ceil(d / 0.012));
      for (let k = 1; k <= steps; k++) addMark(scribbleLast.p.clone().lerp(p, k / steps), _sn, hand.c);
    } else addMark(p, _sn, hand.c);
    scribbleLast = { p: p.clone(), n: _sn.clone() };
    scribbleSound -= dt;
    if (scribbleSound <= 0) { scribbleSound = 0.12; blip(90 + Math.random() * 60, 0.05, 'sawtooth', 0.012); }
  }
  function startScribble() {
    if (!hand.n) { toast('Pick up a crayon, then hold V to color with it.'); return; }
    scribbling = true; scribbleLast = null;
  }
  function stopScribble() {
    if (!scribbling) return;
    scribbling = false; scribbleLast = null;
    saveMarks();
  }


  // ---------------------------------------------------------------------------
  // Other buttons
  // ---------------------------------------------------------------------------
  $('btnCollection').onclick = () => openShop('collection');
  $('btnSound').onclick = () => { muted = !muted; $('btnSound').textContent = muted ? '🔇' : '🔊'; };
  $('btnHelp').onclick = () => { if (locked) document.exitPointerLock(); $('help').hidden = false; };
  $('btnLock').onclick = () => { if (locked) document.exitPointerLock(); else requestLock(); };
  $('btnStart').onclick = () => {
    $('help').hidden = true;
    if (!isTouch) requestLock();
  };
  let resetArmed = 0;
  $('btnReset').onclick = () => {
    // Two-step confirm inside the page (browser confirm dialogs are not available everywhere)
    if (Date.now() - resetArmed > 3000) {
      resetArmed = Date.now();
      $('btnReset').textContent = 'Click again to erase everything';
      setTimeout(() => { $('btnReset').textContent = 'Reset all progress'; }, 3000);
      return;
    }
    resetArmed = 0;
    $('btnReset').textContent = 'Reset all progress';
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
    clearWorld();
    clearMarks();
    newGame();
    refreshTableSheets();
    save();
    toast('Fresh room, fresh mountain of crayons.');
  };

  // ---------------------------------------------------------------------------
  // Save / load
  // ---------------------------------------------------------------------------
  function save() {
    try {
      // Crayons are packed into 16-bit integers and base64, so 60,000 of them save quickly
      const buf = new Int16Array(cr.length * 7);
      let k = 0;
      for (const o of cr) {
        buf[k++] = Math.round(o.x * 1000); buf[k++] = Math.round(o.y * 1000); buf[k++] = Math.round(o.z * 1000);
        buf[k++] = Math.round(o.ax * 32000); buf[k++] = Math.round(o.ay * 32000); buf[k++] = Math.round(o.az * 32000);
        buf[k++] = o.c;
      }
      const bytes = new Uint8Array(buf.buffer);
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      const flat = btoa(bin);
      // crayons in your hands, in the air or on a bot go back to the floor in the save
      const loose = [];
      for (let i = 0; i < hand.n; i++) loose.push(hand.c);
      flights.forEach(f => loose.push(f.c));
      tote.items.forEach(c => loose.push(c));
      bots.forEach(b => b.carry.forEach(c => loose.push(c)));
      const s = {
        sorted: state.sorted, familySorted: state.familySorted, familyBest: state.familyBest, shadeSorted: state.shadeSorted, bestTotal: state.bestTotal, done: state.done, furnished: state.furnished || 0, tape: state.tape,
        boxes: state.boxes.filter(b => !isBin(b)).map(({ x, z, rot, color, count, packed, kind, level }) => ({ x, z, rot, color, count, packed, kind, level })),
        decor: state.decor.map(({ type, x, y, z, ry, packed, bins, fam, sets }) => ({ type, x, y, z, ry, packed, fam, sets, counts: bins ? bins.map(b => b.count) : undefined })),
        player: { x: player.x, z: player.z, yaw: player.yaw, pitch: player.pitch },
        crayons: flat, loose,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    } catch (e) { /* storage may be unavailable or full */ }
  }

  function clearWorld() {
    tapeGroup.clear();
    if (state) {
      state.boxes.forEach(b => scene.remove(b.group));
      state.decor.forEach(d => scene.remove(d.group));
    }
    bots.forEach(b => scene.remove(b.g));
    bots.length = 0;
    flights.forEach(f => scene.remove(f.m));
    flights.length = 0;
    cr = [];
    grid.clear();
    animating.clear();
    crayonMesh.count = 0;
    hand.n = 0; hand.c = -1;
    refreshHand();
    tote.items = []; tote.on = false; refreshTote();
    placing = null;
    lampLights = 0;
    openDrawers.clear();
    storedDirty = true;
  }

  // The room comes furnished. Everything can still be moved with G.
  const FURNISHINGS = [
    // coloring corner (south-west)
    ['arearug', -8.4, 7.4, 0], ['table', -8.6, 7.2, 0.3], ['chair', -8.4, 8.3, Math.PI + 0.3], ['chair', -9.2, 6.2, -0.4],
    ['tallplant', -11.2, 11.2, 0], ['cubby', -8, 11.6, Math.PI],
    // by the door (west wall)
    ['coatrack', -11.4, -1.4, 0], ['bookcase', -11.6, 1.6, Math.PI / 2], ['bookcase', -11.6, 3.1, Math.PI / 2],
    // art corner (north-west)
    ['desk', -9.6, -11.45, 0], ['chair', -9.7, -10.55, Math.PI], ['easel', -9.4, -8.6, 0.83], ['tallplant', -11.2, -11.2, 0],
    // under the corkboard
    ['toychest', 0, -11.55, 0],
    // reading nook (north-east)
    ['arearug', 9.4, -9.3, -Math.PI / 4], ['armchair', 10, -10, -Math.PI / 4], ['sidetable', 11.1, -8.5, 0],
    ['bookcase', 11.6, -7, -Math.PI / 2], ['tallplant', 11.2, -11.2, 0],
    // east wall
    ['cubby', 11.6, 3, -Math.PI / 2],
    // lounge (south-east)
    ['arearug', 8.4, 8.2, Math.PI / 2], ['sofa', 9.6, 8.2, -Math.PI / 2], ['sidetable', 9.8, 6.6, 0], ['armchair', 7.2, 10.2, -2.53],
    ['tallplant', 11.2, 11.2, 0],
    // toys (added in furnishing version 2)
    ['blocks', -6.9, 9.3, 0.4, 2], ['duck', -11.3, -5.2, 0.8, 2], ['teddy', 8.6, 9.6, -2.2, 2],
  ];
  const FURNISH_V = 2;
  function furnish(existing = false, from = 0) {
    for (const [type, x, z, ry, v = 1] of FURNISHINGS) {
      if (v <= from) continue;
      // in an older save, skip any spot you've already used for something else
      if (existing && !DECOR[type].under && (blockedAt(x, z, DECOR[type].r) || state.boxes.some(b => Math.hypot(b.x - x, b.z - z) < DECOR[type].r + 0.7))) continue;
      const d = { type, x, y: 0, z, ry, packed: [] };
      state.decor.push(d);
      buildDecor(d);
      if (existing && !DECOR[type].under) clearUnder(x, z, DECOR[type].r + 0.15);
    }
    state.furnished = FURNISH_V;
  }

  function newGame() {
    state = freshState();
    recomputeUnlocks();
    Object.assign(player, state.player);
    START_BOXES.forEach((c, i) => addBox(-5 + i * 2, 8.6, c));
    // a starter tower of sorting drawers between the shelves
    [2, 5, 8, 11].forEach((c, i) => addBox(0, 11.5, c, 2, 0, 'drawer', i));
    [-4, 4].forEach(x => {
      const d = { type: 'shelf', x, y: 0, z: 11.4, ry: Math.PI, packed: [] };
      state.decor.push(d);
      buildDecor(d);
    });
    furnish();
    // An absurd amount of crayons covering every bit of floor, drifted into heaps.
    // Every crayon is a random shade, so there's no pre-sorting anywhere.
    const heaps = [[-6, -6, 3.5], [5, -7, 3], [-1, -1, 3.2], [7.5, 2, 2.6], [-8, 3.5, 2.4], [1, 4.5, 2], [-4, 8, 1.6], [9, -1.5, 1.8]];
    const depth = (x, z) => {
      let h = 0.6 + 0.35 * Math.sin(x * 0.7) * Math.cos(z * 0.55);
      for (const [hx, hz, r] of heaps) h += 2.6 * Math.max(0, 1 - Math.hypot(x - hx, z - hz) / r) ** 1.3;
      const clear = Math.hypot(x / 5.5, (z - 9.6) / 2.4);   // a thinner patch where your first boxes sit
      if (clear < 1) h *= 0.25 + 0.75 * clear;
      return h;
    };
    let tries = 0;
    while (cr.length < TOTAL && tries++ < TOTAL * 40) {
      const x = rand(-HALF + 0.3, HALF - 0.3), z = rand(-HALF + 0.3, HALF - 0.3);
      if (Math.random() * 3.6 > depth(x, z)) continue;
      addCrayon(x, z, randomShade());
    }
    while (cr.length < TOTAL) spawnCarpet(TOTAL - cr.length);
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        state = freshState();
        Object.assign(state, {
          sorted: s.sorted || 0, done: !!s.done,
          familySorted: FAMILIES.map((_, i) => (s.familySorted && s.familySorted[i]) || 0),
          familyBest: FAMILIES.map((_, i) => Math.max((s.familyBest && s.familyBest[i]) || 0, (s.familySorted && s.familySorted[i]) || 0)),
          shadeSorted: SHADES.map((_, i) => (s.shadeSorted && s.shadeSorted[i]) || 0),
          bestTotal: Math.max(s.bestTotal || 0, s.sorted || 0),
          player: s.player || state.player,
        });
        recomputeUnlocks();
        Object.assign(player, state.player);
        (s.boxes || []).forEach(b => { const o = addBox(b.x, b.z, b.color, b.rot || 0, b.count || 0, b.kind || 'box', b.level || 0); o.packed = b.packed || 0; });
        restack();
        // older saves didn't track shades: count what's already in boxes
        state.boxes.forEach(b => { state.shadeSorted[b.color] = Math.max(state.shadeSorted[b.color], b.count + (b.packed || 0) * capacity()); });
        (s.decor || []).forEach(d => {
          const o = { type: d.type, x: d.x, y: d.y || 0, z: d.z, ry: d.ry || 0, packed: d.packed || [], counts: d.counts, fam: d.fam, sets: d.sets };
          state.decor.push(o);
          buildDecor(o);
        });
        state.boxes.forEach(b => { if (isBin(b)) state.shadeSorted[b.color] = Math.max(state.shadeSorted[b.color], b.count); });
        const bin = atob(s.crayons || '');
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const f = new Int16Array(bytes.buffer, 0, Math.floor(bytes.length / 2));
        for (let i = 0; i + 6 < f.length && cr.length < MAX_CRAYONS; i += 7) {
          pushCrayon({ x: f[i] / 1000, y: f[i + 1] / 1000, z: f[i + 2] / 1000, ax: f[i + 3] / 32000, ay: f[i + 4] / 32000, az: f[i + 5] / 32000, c: f[i + 6], dy: 0, vy: 0, delay: 0 });
        }
        (s.loose || []).forEach(c => addCrayon(player.x + rand(-1, 1), player.z + rand(-1, 1), c));
        const fv = s.furnished === true ? 1 : (s.furnished || 0);
        state.furnished = fv;
        state.tape = Array.isArray(s.tape) ? s.tape.filter(t => t && isFinite(t.x1)) : [];
        rebuildTape();
        if (fv < FURNISH_V) {
          // rooms saved before new furniture arrived get it now (minus spots you already used)
          furnish(true, fv);
          save();
        }
        syncBots();
        return true;
      }
    } catch (e) {
      clearWorld();
    }
    newGame();
    return false;
  }

  // ---------------------------------------------------------------------------
  // Main loop
  // ---------------------------------------------------------------------------
  let last = performance.now();
  let time = 0, saveT = 0, hudT = 0;

  function updateAnimating(dt) {
    for (const o of animating) {
      if (o.delay > 0) { o.delay -= dt; if (o.delay > 0) { writeMatrix(o); continue; } }
      o.vy += 14 * dt;
      o.dy -= o.vy * dt;
      if (o.dy <= 0) {
        o.dy = 0; o.vy = 0; o.delay = 0;
        animating.delete(o);
      }
      writeMatrix(o);
    }
  }

  const coloringEl = $('coloring');
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    // the room is hidden behind the coloring book, so give the page all the speed
    if (!coloringEl.hidden) { requestAnimationFrame(frame); return; }
    time += dt;

    if (planner.on) updatePlanner(dt);
    else if (!anyModal()) updatePlayer(dt);
    else { camera.position.set(player.x, player.eye, player.z); camera.rotation.set(player.pitch, player.yaw, 0); }
    updateAim();
    updatePlacing();
    updateAnimating(dt);
    updateFlights(dt);
    syncBots();
    bots.forEach(b => updateBot(b, dt));
    updateGlow(time);
    state.decor.forEach(d => d.update && d.update(time));
    updateDrawers(dt);
    updateTote(dt);
    updateWagon(dt);
    updateTapePreview();
    state.decor.forEach(d => { if (d.moved) { d.moved = false; d.dirtyT = 1; } if (d.dirtyT && (d.dirtyT -= dt) <= 0) { d.dirtyT = 0; clearUnder(d.x, d.z, DECOR[d.type].r + 0.1); save(); } });
    updateSigns();
    updateFinder();
    if (storedDirty) rebuildStored();
    if (scribbling && !anyModal()) scribbleStep(dt);


    if (matDirty) { crayonMesh.instanceMatrix.needsUpdate = true; matDirty = false; }
    if (colDirty) { crayonMesh.instanceColor.needsUpdate = true; colDirty = false; }

    renderer.render(scene, camera);
    updateAimLabel();
    flushFloaters(dt);

    saveT += dt;
    if (saveT > 20) { saveT = 0; save(); }
    hudT += dt;
    if (hudT > 0.2) { hudT = 0; updateHud(); }
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------------------
  // Start
  // ---------------------------------------------------------------------------
  window.addEventListener('resize', resize);
  window.addEventListener('beforeunload', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

  resize();
  // Give the loading screen a moment to paint before building 20,000 crayons
  setTimeout(async () => {
    await loadModels();
    load();
    refreshHand();
    updateHud();
    $('loading').hidden = true;
    $('help').hidden = false;
    last = performance.now();
    requestAnimationFrame(frame);
    // Signs were drawn before the web font arrived: redraw them once it has
    if (document.fonts && document.fonts.load) {
      Promise.all([document.fonts.load('700 42px "Fredoka"'), document.fonts.load('600 26px "Fredoka"')]).then(() => {
        state.boxes.forEach(b => { if (b.labelCanvas) drawBoxLabel(b); });
        if (lvl('labels')) applyLabels();
      }).catch(() => {});
    }
  }, 60);

  // Exposed for debugging in the console
  window.craySorting = {
    get state() { return state; }, get crayons() { return cr; }, get aim() { return aim; },
    player, SHADES, save, act, pickUp, tossToBox, takeFromBox, refreshBox, hand, camera, coloring, get marks() { return marks; },
    tote, toggleTote, scoopTote, toggleTapeMode, togglePlanner, planner, tapeMode, tapeClick, storageUsed, startPlacing, finishPlacing, addBox, buildDecor, get placing() { return placing; }, openShop, celebrate, liftPacked, placeCarry, tidyShelf, get carry() { return carry; }, shelfSlotAt, packBox, lvl, boxLimit,
    setBest(n) { state.bestTotal = n; recomputeUnlocks(); applyLabels(); syncBots(); state.boxes.forEach(refreshBox); },
  };
})();
