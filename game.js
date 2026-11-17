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
    shelf:    { name: 'Shelf Unit',         icon: '🗄️', r: 0.75, cy: 1.0, free: true, desc: 'Holds 12 packed boxes. Full boxes you pack go to the nearest shelf with room.' },
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
  };

  // Upgrades. Their level is how many of their rewards you've unlocked.
  const UPGRADES = {
    hand:     { name: 'Bigger Handfuls', icon: '🤲', info: l => `Grab ${handSize(l)} crayons of the same shade at once` },
    reach:    { name: 'Wide Scoop',      icon: '🥄', info: l => `Scoop matching crayons from ${scoop(l).toFixed(2)}m around` },
    glow:     { name: 'Shade Spotter',   icon: '🔦', info: l => l >= 2 ? 'Looking at a crayon lights up its whole shade' : 'Crayons you hold light up their whole shade and their box' },
    bigBox:   { name: 'Roomier Boxes',   icon: '📦', info: l => `Boxes hold ${boxCap(l)} crayons` },
    speed:    { name: 'Comfy Sneakers',  icon: '👟', info: l => `Walk ${l * 15}% faster` },
    autoPack: { name: 'Tape Gun',        icon: '🧷', info: () => 'Full boxes pack themselves' },
    bots:     { name: 'Sortbot',         icon: '🤖', info: l => `${l} little robot${l > 1 ? 's' : ''} sorting alongside you` },
    botSpeed: { name: 'Sortbot Turbo',   icon: '⚙️', info: () => 'Sortbots drive faster and carry more' },
  };

  // Rewards: sort enough crayons from a color family to unlock each one.
  const TIERS = [30, 120, 300];
  const REWARDS = [
    /* Reds    */ [{ up: 'hand' },   { decor: 'plant' },    { up: 'hand' }],
    /* Blues   */ [{ up: 'reach' },  { decor: 'rug' },      { up: 'bots' }],
    /* Yellows */ [{ up: 'glow' },   { decor: 'lamp' },     { up: 'glow' }],
    /* Greens  */ [{ up: 'speed' },  { decor: 'beanbag' },  { up: 'bigBox' }],
    /* Oranges */ [{ up: 'bigBox' }, { decor: 'poster' },   { up: 'autoPack' }],
    /* Purples */ [{ up: 'hand' },   { decor: 'lights' },   { up: 'bots' }],
    /* Pinks   */ [{ up: 'reach' },  { decor: 'catbed' },   { up: 'hand' }],
    /* Browns  */ [{ up: 'hand' },   { decor: 'clock' },    { up: 'reach' }],
    /* Teals   */ [{ up: 'speed' },  { decor: 'fishbowl' }, { up: 'botSpeed' }],
    /* Grays   */ [{ decor: 'window' }, { up: 'bigBox' },   { up: 'bots' }],
  ];
  const rewardName = r => r.up ? UPGRADES[r.up].name : DECOR[r.decor].name;
  const rewardIcon = r => r.up ? UPGRADES[r.up].icon : DECOR[r.decor].icon;

  const handSize = l => [1, 3, 6, 10, 15, 20][Math.min(l, 5)];
  const scoop = l => 0.45 + l * 0.35;
  const boxCap = l => 30 + l * 15;
  const botCarry = l => 2 + l * 2;
  const walkSpeed = l => 4 * (1 + l * 0.15);
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
      familySorted: FAMILIES.map(() => 0),
      boxes: [],
      decor: [],
      player: { x: 0, z: 10, yaw: 0, pitch: -0.3 },
      done: false,
    };
  }

  // Which rewards have been earned, and the upgrade levels they add up to
  function earnedRewards() {
    const out = [];
    REWARDS.forEach((tiers, fi) => tiers.forEach((r, ti) => {
      if (state.familySorted[fi] >= TIERS[ti]) out.push({ ...r, fi, ti });
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
  }
  const lvl = id => levels[id] || 0;
  const capacity = () => boxCap(lvl('bigBox'));
  const isDrawer = b => b.kind === 'drawer';
  const capOf = b => isDrawer(b) ? capacity() * 3 : capacity();  // a drawer holds three boxes' worth
  const boxBase = b => isDrawer(b) ? b.level * DRAWER_H : 0;
  const boxTopY = b => isDrawer(b) ? (b.level + 1) * DRAWER_H : BOX_H;
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
    for (const [x, z] of [[-6, -6], [6, -6], [-6, 6], [6, 6], [0, 0]]) {
      const l = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 0.06, 24), new T.MeshBasicMaterial({ color: 0xfff6d8 }));
      l.position.set(x, WALL_H - 0.03, z);
      scene.add(l);
    }
  }

  // ---------------------------------------------------------------------------
  // Crayons: one instanced mesh for thousands of crayons
  // ---------------------------------------------------------------------------
  // Wrapper artwork adapted from "crayons w/ box" by Fine_poultry (Sketchfab, CC BY 4.0).
  // It is a grayscale mask, so each instance's shade color tints it.
  const WRAPPER_URI = 'data:image/jpeg;base64,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';
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
    const w = isDrawer(b) ? DRAWER_W : BOX_W, d = isDrawer(b) ? DRAWER_D : BOX_D;
    return b.rot % 2 ? [d / 2, w / 2] : [w / 2, d / 2];
  }

  function blockedAt(x, z, pad = 0.12) {
    for (const b of state.boxes) {
      const [hw, hd] = boxHalf(b);
      if (Math.abs(x - b.x) < hw + pad && Math.abs(z - b.z) < hd + pad) return b;
    }
    for (const d of state.decor) {
      const def = DECOR[d.type];
      if (def.wall || def.under) continue;
      if (d.type === 'shelf') {
        const lx = x - d.x, lz = z - d.z, c = Math.cos(d.ry || 0), sn = Math.sin(d.ry || 0);
        if (Math.abs(lx * c - lz * sn) < 1.08 + pad && Math.abs(lx * sn + lz * c) < 0.3 + pad) return d;
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

  function drawBoxLabel(b) {
    const c = b.labelCanvas;
    const g = c.getContext('2d');
    const s = SHADES[b.color];
    const full = b.count >= capOf(b);
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = s.hex;
    roundRect(g, 6, 6, c.width - 12, 74, 18); g.fill();
    g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.35)'; g.stroke();
    g.fillStyle = luminance(s.hex) > 0.6 ? '#2a2a2a' : '#fff';
    g.font = 'bold 40px "Trebuchet MS", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(s.name, c.width / 2, 45, c.width - 30);
    g.fillStyle = full ? '#2e9e5b' : 'rgba(40,30,30,.85)';
    roundRect(g, c.width / 2 - 110, 88, 220, 40, 14); g.fill();
    g.fillStyle = '#fff';
    g.font = 'bold 26px "Trebuchet MS", sans-serif';
    g.fillText(full ? (lvl('autoPack') ? 'Packing…' : 'FULL! Click to pack') : `${b.count} / ${capacity()}`, c.width / 2, 109, 210);
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
    Object.assign(b, { group: grp, mat, stripeMat, front, handle, gauge, openT: 0 });
    scene.add(grp);
    refreshBox(b);
  }

  function buildBox(b) {
    if (isDrawer(b)) { buildDrawer(b); return; }
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
    // the crayons inside rise as the box fills
    const fillMat = new T.MeshStandardMaterial({ color: SHADES[b.color].hex, roughness: 0.5 });
    const fill = new T.Mesh(new T.BoxGeometry(BOX_W - 0.1, 1, BOX_D - 0.1), fillMat);
    fill.visible = false;
    grp.add(fill);
    // floating sign above the box
    b.labelCanvas = document.createElement('canvas');
    b.labelCanvas.width = 320; b.labelCanvas.height = 136;
    b.labelTex = new T.CanvasTexture(b.labelCanvas);
    const sprite = new T.Sprite(new T.SpriteMaterial({ map: b.labelTex, transparent: true }));
    sprite.scale.set(1.15, 0.49, 1);
    sprite.position.y = BOX_H + 0.55;
    grp.add(sprite);
    Object.assign(b, { group: grp, mat, stripeMat, fillMat, fill });
    scene.add(grp);
    refreshBox(b);
  }

  function refreshBox(b) {
    b.group.position.set(b.x, boxBase(b), b.z);
    b.group.rotation.y = b.rot * Math.PI / 2;
    const col = SHADES[b.color].hex;
    b.stripeMat.color.set(col);
    if (isDrawer(b)) {
      const f = Math.min(1, b.count / capOf(b));
      b.gauge.visible = f > 0;
      b.gauge.scale.x = Math.max(0.001, f * (DRAWER_W - 0.16));
      b.handle.material = f >= 1 ? handleFullMat : handleMat;
      return;
    }
    b.fillMat.color.set(col);
    const f = Math.min(1, b.count / capOf(b));
    b.fill.visible = f > 0;
    const h = Math.max(0.02, f * (BOX_H - 0.08));
    b.fill.scale.y = h;
    b.fill.position.y = 0.04 + h / 2;
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

  function packBox(b) {
    if (isDrawer(b) || b.count < capacity()) return;
    // the nearest shelf unit with room gets the packed box
    let shelf = null, bd = Infinity;
    for (const d of state.decor) {
      if (d.type !== 'shelf' || d.packed.length >= SHELF_CAP) continue;
      const dist = (d.x - b.x) ** 2 + (d.z - b.z) ** 2;
      if (dist < bd) { bd = dist; shelf = d; }
    }
    if (!shelf) {
      toast('No shelf space! Place a Shelf Unit (E → Furniture) to store packed boxes.');
      return;
    }
    shelf.packed.push(b.color);
    rebuildDecor(shelf);
    b.count = 0;
    b.packed = (b.packed || 0) + 1;
    refreshBox(b);
    blip(520, 0.12, 'square', 0.04); setTimeout(() => blip(780, 0.15, 'square', 0.04), 90);
    toast(`Packed a box of ${SHADES[b.color].name} onto a shelf.`);
    save();
  }

  const plankMat = new T.MeshStandardMaterial({ color: 0xa8703f, roughness: 0.7 });

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
    }
    d.group = g;
    d.update = update;
    scene.add(g);
    refreshDecor(d);
  }

  function refreshDecor(d) {
    d.group.position.set(d.x, d.y || 0, d.z);
    d.group.rotation.y = d.ry || 0;
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
      if (placing && placing.obj === b) continue;
      const [hw, hd] = boxHalf(b);
      const dx = player.x - b.x, dz = player.z - b.z;
      const ox = hw + 0.3 - Math.abs(dx), oz = hd + 0.3 - Math.abs(dz);
      if (ox > 0 && oz > 0) {
        if (ox < oz) player.x += Math.sign(dx || 1) * ox; else player.z += Math.sign(dz || 1) * oz;
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
      const t = isDrawer(b)
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
    if (placing) { aim = { type: 'place', floor, wall: rayWall(o, d), box: rayBox(o, d, 12) }; return; }
    const cands = [];
    const cHit = rayCrayon(o, d, PICK_DIST);
    if (cHit) cands.push({ type: 'crayon', ...cHit });
    const bHit = rayBox(o, d, TOSS_DIST);
    if (bHit) cands.push({ type: 'box', ...bHit });
    const dHit = rayDecor(o, d, 8);
    if (dHit) cands.push({ type: 'decor', ...dHit });
    if (floor) cands.push({ type: 'floor', t: floor.t, point: floor.point });
    cands.sort((a, b) => a.t - b.t);
    aim = cands[0] || { type: null };
    // While holding crayons, a crayon of another shade in the way counts as "drop here"
    if (hand.n && aim.type === 'crayon' && aim.obj.c !== hand.c) {
      aim = { type: 'floor', t: aim.t, point: new T.Vector3().copy(o).addScaledVector(d, aim.t) };
    }
    if (aim.type === 'floor') aim.rug = rugAt(aim.point.x, aim.point.z);
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
    const r = scoop(lvl('reach'));
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
      const to = isDrawer(b)
        ? new T.Vector3(b.x + rand(-0.15, 0.15), boxBase(b) + DRAWER_H * 0.6, b.z + rand(-0.12, 0.12))
        : new T.Vector3(b.x + rand(-0.25, 0.25), BOX_H * 0.6, b.z + rand(-0.18, 0.18));
      startFlight(c, handWorld, to, i * 0.05, () => {
        if (b.color === c && b.count < capOf(b) && state.boxes.includes(b)) {
          b.count++;
          recordSort(c, true);
          refreshBox(b);
          if (isDrawer(b)) bumpDrawer(b);
          blip(620 + Math.random() * 200, 0.06, 'sine', 0.05);
          if (b.count >= capOf(b) && lvl('autoPack')) setTimeout(() => packBox(b), 400);
        } else {
          // bounce off onto the floor next to the box
          const a = Math.random() * TAU;
          addCrayon(b.x + Math.cos(a) * 0.9, b.z + Math.sin(a) * 0.75, c);
          if (!warned) {
            warned = true;
            blip(150, 0.18, 'sawtooth', 0.04);
            toast(b.color !== c ? `Nope! Those are ${SHADES[c].name}, not ${SHADES[b.color].name}.` : isDrawer(b) ? 'That drawer is full! Stack a new one on top.' : 'That box is full! Click it to pack it up.');
          }
        }
      });
    }
    hand.n = 0; hand.c = -1;
    refreshHand();
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
    let p = aim.floor && aim.floor.t < 12 ? aim.floor.point : null;
    if (!p) p = new T.Vector3(player.x - Math.sin(player.yaw) * 2.5, 0, player.z - Math.cos(player.yaw) * 2.5);
    o.x = clamp(p.x, -HALF + 0.7, HALF - 0.7);
    o.z = clamp(p.z, -HALF + 0.7, HALF - 0.7);
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
    if (r) {
      const list = [];
      forNear(o.x, o.z, r + 0.2, c => { if (blockedAt(c.x, c.z, 0.05)) list.push(c); });
      list.sort((a, b) => b.y - a.y).forEach(c => { removeCrayon(c); });
      list.forEach(c => addCrayon(c.x, c.z, c.c));
    }
    blip(500, 0.08, 'triangle', 0.05);
    save();
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
      toast(`Put away the ${SHADES[o.color].name} ${isDrawer(o) ? 'drawer' : 'box'}.`);
      placing = null;
      restack();
      save();
      return;
    } else {
      if (o.type === 'shelf' && o.packed.length) { toast('Only empty shelves can be put away.'); return; }
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
    if (show) floatAcc++;
    const n = state.familySorted[fi];
    const ti = TIERS.indexOf(n);
    if (ti >= 0) {
      const r = REWARDS[fi][ti];
      recomputeUnlocks();
      if (r.up === 'bots') syncBots();
      state.boxes.forEach(refreshBox);
      celebrate(`${rewardIcon(r)} Unlocked: ${rewardName(r)}!`, r.up ? UPGRADES[r.up].info(lvl(r.up)) : 'Find it under E → Furniture and place it anywhere.');
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

  // The next few rewards, for the HUD
  function nextReward() {
    let best = null;
    REWARDS.forEach((tiers, fi) => {
      const n = state.familySorted[fi];
      const ti = TIERS.findIndex(t => n < t);
      if (ti < 0) return;
      const need = TIERS[ti] - n;
      if (!best || need < best.need) best = { need, fi, r: tiers[ti] };
    });
    return best;
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
      const name = placing.kind === 'box' ? `${SHADES[o.color].name} ${isDrawer(o) ? 'drawer' : 'box'}` : DECOR[o.type].name;
      const canRotate = placing.kind === 'box' || !DECOR[o.type].wall;
      const stackNote = isDrawer(o) ? (placing.tooTall ? ' · stack is full' : o.level ? ` · stacking, level ${o.level + 1}` : ' · look at a drawer to stack on it') : '';
      html = `Placing <b>${name}</b> <span class="dim">${stackNote} · click to place${canRotate ? ' · R rotate' : ''}${' · X put away'}${placing.isNew ? '' : ' · Esc cancel'}</span>`;
    } else if (aim.type === 'crayon') {
      const s = SHADES[aim.obj.c];
      html = `${sw(s.hex)}<b>${s.name}</b> <span class="dim">· click to ${hand.n ? 'grab more' : 'pick up'}</span>`;
    } else if (aim.type === 'box') {
      const b = aim.obj, s = SHADES[b.color];
      const full = b.count >= capOf(b), dr = isDrawer(b);
      const what = hand.n ? 'click to toss' : full && dr ? 'full! stack another on top' : full && !lvl('autoPack') ? 'click to pack' : 'G move' + (b.count === 0 ? ' · C change shade' : '');
      html = `${sw(s.hex)}<b>${s.name}</b> ${dr ? 'drawer' : 'box'} ${b.count}/${capOf(b)} <span class="dim">· ${what}</span>`;
    } else if (aim.type === 'decor') {
      html = `<b>${DECOR[aim.obj.type].name}</b> <span class="dim">· G move</span>`;
    } else if (aim.type === 'floor') {
      if (hand.n && aim.t < 9) html = '<span class="dim">click to drop here</span>';
      else if (aim.rug && aim.t < 8) html = '<b>Cozy Rug</b> <span class="dim">· G move</span>';
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
    if (hand.n) {
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
      ? `Next: ${rewardIcon(nr.r)} <b>${rewardName(nr.r)}</b> in ${nr.need} more ${FAMILIES[nr.fi].name}`
      : 'Everything unlocked!';
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
    if (hand.n) {
      if (aim.type === 'crayon' && aim.obj.c === hand.c) pickUp(aim.obj);
      else if (aim.type === 'box') tossToBox(aim.obj);
      else if (aim.type === 'floor' && aim.t < 9) dropAt(aim.point);
      else if (aim.type === 'decor') toast('Toss crayons into a box, or click the floor to drop them.');
      return;
    }
    if (aim.type === 'crayon') pickUp(aim.obj);
    else if (aim.type === 'box' && isDrawer(aim.obj) && aim.obj.count >= capOf(aim.obj)) toast('This drawer is full. Stack a new one on top (E → Boxes & drawers).');
    else if (aim.type === 'box' && aim.obj.count >= capacity() && !lvl('autoPack')) packBox(aim.obj);
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
      return;
    }
    if (anyModal()) return;
    keys.add(e.code);
    if (e.code === 'KeyE' || e.code === 'Tab') { e.preventDefault(); openShop(); }
    else if (e.code === 'KeyF') openShop('collection');
    else if (e.code === 'KeyL') { if (!locked) requestLock(); }
    else if (e.code === 'KeyQ' && hand.n) dropAt(new T.Vector3(player.x - Math.sin(player.yaw) * 0.8, 0, player.z - Math.cos(player.yaw) * 0.8));
    else if (e.code === 'KeyR' && placing) {
      const o = placing.obj;
      if (placing.kind === 'box') { o.rot = ((o.rot || 0) + 1) % 4; refreshBox(o); }
      else if (!DECOR[o.type].wall) { o.ry = (o.ry || 0) + Math.PI / 4; refreshDecor(o); }
    } else if (e.code === 'KeyX' && placing) putAway();
    else if (e.code === 'KeyG' && !placing) {
      updateAim();
      if (aim.type === 'box') startPlacing('box', aim.obj, false);
      else if (aim.type === 'decor') startPlacing('decor', aim.obj, false);
      else if (aim.rug) startPlacing('decor', aim.rug, false);
      else toast('Look at a box or decoration, then press G to move it.');
    } else if (e.code === 'KeyC' && !placing) {
      updateAim();
      if (aim.type === 'box') {
        if (aim.obj.count === 0) openPicker(aim.obj);
        else toast(isDrawer(aim.obj) ? 'Only empty drawers can change shade.' : 'Only empty boxes can change shade. Fill it up and pack it first.');
      }
    }
  });
  window.addEventListener('keyup', e => keys.delete(e.code));
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
      const intro = document.createElement('div');
      intro.className = 'tab-intro';
      intro.innerHTML = `<div class="kind-pick">
          <button data-kind="box" class="${shopKind === 'box' ? 'active' : ''}">📦 Box<small>Packs onto a shelf when full</small></button>
          <button data-kind="drawer" class="${shopKind === 'drawer' ? 'active' : ''}">🗄️ Drawer<small>Holds ${capacity() * 3}, stacks ${STACK_MAX} high</small></button>
        </div>
        <p>${shopKind === 'drawer'
          ? 'Drawers are free. Look at a drawer while placing a new one to stack it on top, and build towers of sorting drawers.'
          : 'Boxes are free. Grab one for any shade and put it wherever makes sense to you. Make as many as you like.'}</p>`;
      intro.querySelectorAll('[data-kind]').forEach(b => { b.onclick = () => { shopKind = b.dataset.kind; renderShop(); }; });
      list.appendChild(intro);
      FAMILIES.forEach((f, fi) => {
        const row = document.createElement('div');
        row.className = 'shade-row';
        row.innerHTML = `<h4>${f.name}</h4>`;
        f.shades.forEach((_, si) => {
          const i = fi * 3 + si, s = SHADES[i];
          const nb = state.boxes.filter(b => b.color === i && !isDrawer(b)).length;
          const nd = state.boxes.filter(b => b.color === i && isDrawer(b)).length;
          const have = [nb && nb + ' box' + (nb > 1 ? 'es' : ''), nd && nd + ' drawer' + (nd > 1 ? 's' : '')].filter(Boolean).join(', ') || 'nothing yet';
          const btn = document.createElement('button');
          btn.innerHTML = `<span class="sw" style="background:${s.hex}"></span><span>${s.name}<small>${counts[i].toLocaleString()} on the floor · ${have}</small></span>`;
          btn.onclick = () => {
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
      Object.entries(DECOR).forEach(([type, def]) => {
        const open = unlockedDecor.has(type);
        const el = document.createElement('div');
        el.className = 'item' + (open ? '' : ' locked');
        let how = '';
        if (!open) {
          REWARDS.forEach((tiers, fi) => tiers.forEach((r, ti) => {
            if (r.decor === type) how = `Sort ${TIERS[ti]} ${FAMILIES[fi].name} to unlock (${Math.min(state.familySorted[fi], TIERS[ti])}/${TIERS[ti]})`;
          }));
        }
        const n = state.decor.filter(d => d.type === type).length;
        el.innerHTML = `<h3><span>${open ? def.icon : '🔒'}</span>${def.name}<span class="lvl">${n ? n + ' placed' : ''}</span></h3><p>${open ? (def.desc || (def.wall ? 'Hangs on a wall.' : 'Sits on the floor.')) : how}</p>`;
        const btn = document.createElement('button');
        btn.className = open ? 'primary' : '';
        btn.disabled = !open;
        btn.textContent = open ? 'Place one' : 'Locked';
        btn.onclick = () => {
          if (!open) return;
          const [x, z] = placeAhead();
          const d = { type, x, y: def.wall ? 2.2 : 0, z, ry: 0 };
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
      FAMILIES.forEach((f, fi) => {
        const n = state.familySorted[fi];
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
      btn.onclick = () => { box.color = i; refreshBox(box); save(); closeModals(); };
      list.appendChild(btn);
    });
    $('picker').hidden = false;
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
    newGame();
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
      bots.forEach(b => b.carry.forEach(c => loose.push(c)));
      const s = {
        sorted: state.sorted, familySorted: state.familySorted, done: state.done,
        boxes: state.boxes.map(({ x, z, rot, color, count, packed, kind, level }) => ({ x, z, rot, color, count, packed, kind, level })),
        decor: state.decor.map(({ type, x, y, z, ry, packed }) => ({ type, x, y, z, ry, packed })),
        player: { x: player.x, z: player.z, yaw: player.yaw, pitch: player.pitch },
        crayons: flat, loose,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    } catch (e) { /* storage may be unavailable or full */ }
  }

  function clearWorld() {
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
    placing = null;
    lampLights = 0;
    openDrawers.clear();
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
          player: s.player || state.player,
        });
        recomputeUnlocks();
        Object.assign(player, state.player);
        (s.boxes || []).forEach(b => { const o = addBox(b.x, b.z, b.color, b.rot || 0, b.count || 0, b.kind || 'box', b.level || 0); o.packed = b.packed || 0; });
        restack();
        (s.decor || []).forEach(d => {
          const o = { type: d.type, x: d.x, y: d.y || 0, z: d.z, ry: d.ry || 0, packed: d.packed || [] };
          state.decor.push(o);
          buildDecor(o);
        });
        const bin = atob(s.crayons || '');
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const f = new Int16Array(bytes.buffer, 0, Math.floor(bytes.length / 2));
        for (let i = 0; i + 6 < f.length && cr.length < MAX_CRAYONS; i += 7) {
          pushCrayon({ x: f[i] / 1000, y: f[i + 1] / 1000, z: f[i + 2] / 1000, ax: f[i + 3] / 32000, ay: f[i + 4] / 32000, az: f[i + 5] / 32000, c: f[i + 6], dy: 0, vy: 0, delay: 0 });
        }
        (s.loose || []).forEach(c => addCrayon(player.x + rand(-1, 1), player.z + rand(-1, 1), c));
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

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;

    if (!anyModal()) updatePlayer(dt);
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
  setTimeout(() => {
    load();
    refreshHand();
    updateHud();
    $('loading').hidden = true;
    $('help').hidden = false;
    last = performance.now();
    requestAnimationFrame(frame);
  }, 60);

  // Exposed for debugging in the console
  window.craySorting = {
    get state() { return state; }, get crayons() { return cr; }, get aim() { return aim; },
    player, SHADES, save, act, pickUp, tossToBox, hand, camera,
  };
})();
