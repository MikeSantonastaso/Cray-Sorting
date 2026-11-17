(() => {
  'use strict';
  const T = window.THREE;

  // ---------------------------------------------------------------------------
  // World constants (units are roughly meters)
  // ---------------------------------------------------------------------------
  const HALF = 12;            // room is 24 x 24
  const WALL_H = 4.6;
  const CL = 0.42;            // crayon length (chunky, toy-sized crayons)
  const CR = 0.045;           // crayon radius
  const MAX_CRAYONS = 10000;
  const BOX_W = 1.1, BOX_D = 0.8, BOX_H = 0.7;
  const PICK_DIST = 3.6;      // how far away you can grab a crayon
  const TOSS_DIST = 16;       // how far away you can toss into a box
  const SHELF_SLOTS = [-9, -5.4, -1.8, 1.8, 5.4, 9];
  const SHELF_CAP = 5;
  const SAVE_KEY = 'cray-sorting-3d-v1';
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
  FAMILIES.forEach((f, fi) => f.shades.forEach(([name, hex]) => {
    SHADES.push({ name, hex, family: fi, value: 1 + Math.floor(fi / 2) });
  }));
  const SHADE_COLORS = SHADES.map(s => new T.Color(s.hex));
  // The boxes you start with: the middle shade of the first six families
  const START_BOXES = [1, 4, 7, 10, 13, 16];

  const DECOR = {
    plant:    { name: 'Potted Plant',       icon: '🪴', price: 40,  cozy: 2,  r: 0.4,  cy: 0.6 },
    rug:      { name: 'Cozy Rug',           icon: '🟣', price: 60,  cozy: 3,  r: 1.5,  cy: 0.05, under: true },
    lamp:     { name: 'Floor Lamp',         icon: '💡', price: 70,  cozy: 3,  r: 0.35, cy: 0.9 },
    beanbag:  { name: 'Beanbag',            icon: '🛋️', price: 90,  cozy: 4,  r: 0.7,  cy: 0.35 },
    fishbowl: { name: 'Fish Bowl',          icon: '🐟', price: 150, cozy: 6,  r: 0.45, cy: 0.8 },
    catbed:   { name: 'Cat Bed (with cat)', icon: '🐈', price: 250, cozy: 10, r: 0.65, cy: 0.25 },
    poster:   { name: 'Rainbow Poster',     icon: '🌈', price: 50,  cozy: 2,  r: 0.7,  wall: true },
    clock:    { name: 'Wall Clock',         icon: '🕰️', price: 45,  cozy: 2,  r: 0.45, wall: true },
    window:   { name: 'Window',             icon: '🪟', price: 100, cozy: 4,  r: 1.0,  wall: true },
    lights:   { name: 'Fairy Lights',       icon: '✨', price: 120, cozy: 5,  r: 1.6,  wall: true },
  };

  const handSize = l => [1, 3, 5, 8, 12, 16, 22][l];
  const scoop = l => 0.45 + l * 0.3;
  const boxCap = l => 20 + l * 10;
  const deliveryInterval = l => 45 - l * 7;
  const pileSize = l => 300 + l * 100;
  const botCarry = l => 1 + Math.floor((l + 1) / 2);
  const walkSpeed = l => 4 * (1 + l * 0.15);

  const UPGRADES = [
    { id: 'hand', name: 'Bigger Handfuls', icon: '🤲', max: 6, base: 30, mult: 2.1,
      desc: l => `Grab up to ${handSize(l + 1)} crayons of the same shade in one click (now ${handSize(l)}).` },
    { id: 'reach', name: 'Wide Scoop', icon: '🥄', max: 4, base: 45, mult: 2.2,
      desc: l => `Scoop matching crayons from a wider area (${scoop(l).toFixed(2)}m → ${scoop(l + 1).toFixed(2)}m).` },
    { id: 'glow', name: 'Shade Spotter', icon: '🔦', max: 2, base: 60, mult: 4,
      desc: l => l === 0 ? 'While you hold crayons, every crayon of that shade glows, and so does its box.'
                         : 'Just looking at a crayon lights up its whole shade and its box.' },
    { id: 'bigBox', name: 'Roomier Boxes', icon: '📦', max: 5, base: 50, mult: 2,
      desc: l => `Boxes hold ${boxCap(l + 1)} crayons (now ${boxCap(l)}).` },
    { id: 'pay', name: 'Collector Reputation', icon: '⭐', max: 8, base: 75, mult: 2,
      desc: l => `+25% coins for every crayon sorted (now +${l * 25}%).` },
    { id: 'speed', name: 'Comfy Sneakers', icon: '👟', max: 4, base: 40, mult: 2.2,
      desc: l => `Walk 15% faster (now +${l * 15}%).` },
    { id: 'delivery', name: 'Bigger Deliveries', icon: '🚚', max: 4, base: 80, mult: 2.3,
      desc: l => `New piles arrive every ${deliveryInterval(l + 1)}s with ${pileSize(l + 1)} crayons.` },
    { id: 'autoPack', name: 'Tape Gun', icon: '🧷', max: 1, base: 300, mult: 1,
      desc: () => 'Full boxes pack themselves and go straight onto a shelf.' },
    { id: 'bots', name: 'Sortbot', icon: '🤖', max: 4, base: 250, mult: 3,
      desc: l => `A little robot that roams the piles and sorts crayons for you. (${l} owned)` },
    { id: 'botSpeed', name: 'Sortbot Turbo', icon: '⚙️', max: 5, base: 200, mult: 2,
      desc: l => `Sortbots drive faster and carry more (${botCarry(l)} → ${botCarry(l + 1)} crayons).` },
  ];

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
      coins: 0,
      sorted: 0,
      boxes: [],
      shelves: [{ slot: 2, packed: [] }],
      decor: [],
      upgrades: Object.fromEntries(UPGRADES.map(u => [u.id, 0])),
      deliveryT: deliveryInterval(0),
      extraBoxesBought: 0,
      player: { x: 0, z: 9.5, yaw: 0, pitch: -0.32 },
      seenHelp: false,
    };
  }

  const cozyPct = () => Math.min(100, state.decor.reduce((s, d) => s + DECOR[d.type].cozy, 0));
  const coinMult = () => (1 + state.upgrades.pay * 0.25) * (1 + cozyPct() / 100);
  const capacity = () => boxCap(state.upgrades.bigBox);
  const maxFloor = () => 8400 + state.upgrades.delivery * 400;
  const upgradeCost = u => Math.round(u.base * Math.pow(u.mult, state.upgrades[u.id]));
  const boxCost = () => Math.round(20 * Math.pow(1.18, state.extraBoxesBought));
  const shelfCost = () => Math.round(80 * Math.pow(1.8, state.shelves.length - 1));

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
  function mergeGeos(parts) {
    const pos = [], nor = [], col = [];
    for (const [g0, gray] of parts) {
      const g = g0.index ? g0.toNonIndexed() : g0;
      const p = g.attributes.position.array, n = g.attributes.normal.array;
      for (let i = 0; i < p.length; i++) { pos.push(p[i]); nor.push(n[i]); }
      for (let i = 0; i < p.length / 3; i++) col.push(gray, gray, gray);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    return g;
  }

  const crayonGeo = (() => {
    const body = new T.CylinderGeometry(CR, CR, CL - 0.08, 8);
    body.translate(0, -0.04, 0);
    const tip = new T.CylinderGeometry(0.012, CR, 0.08, 8);
    tip.translate(0, CL / 2 - 0.04, 0);
    const wrap = new T.CylinderGeometry(CR * 1.12, CR * 1.12, 0.2, 8);
    wrap.translate(0, -0.05, 0);
    const g = mergeGeos([[body, 1], [tip, 1], [wrap, 0.62]]);
    g.rotateZ(-Math.PI / 2); // long axis along +X, tip at +X
    g.computeBoundingSphere();
    return g;
  })();

  const crayonMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0 });
  const crayonMesh = new T.InstancedMesh(crayonGeo, crayonMat, MAX_CRAYONS);
  crayonMesh.setColorAt(0, new T.Color(1, 1, 1)); // creates the per-instance color buffer
  crayonMesh.count = 0;
  crayonMesh.castShadow = true;
  crayonMesh.receiveShadow = true;
  crayonMesh.frustumCulled = false;
  scene.add(crayonMesh);

  const shadeMats = SHADES.map(s => new T.MeshStandardMaterial({ color: s.hex, vertexColors: true, roughness: 0.55 }));

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
  const CONTACT = 0.13;
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
    return b.rot % 2 ? [BOX_D / 2, BOX_W / 2] : [BOX_W / 2, BOX_D / 2];
  }

  function blockedAt(x, z, pad = 0.12) {
    for (const b of state.boxes) {
      const [hw, hd] = boxHalf(b);
      if (Math.abs(x - b.x) < hw + pad && Math.abs(z - b.z) < hd + pad) return b;
    }
    for (const d of state.decor) {
      const def = DECOR[d.type];
      if (def.wall || def.under) continue;
      if ((x - d.x) ** 2 + (z - d.z) ** 2 < (def.r + pad) ** 2) return d;
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
        const nx = x + Math.cos(a) * 0.2, nz = z + Math.sin(a) * 0.2;
        if (Math.abs(nx) > HALF - 0.3 || Math.abs(nz) > HALF - 0.3 || blockedAt(nx, nz)) continue;
        const ny = supportAt(nx, nz);
        if (ny < by - 0.17) { by = ny; best = [nx, nz]; }
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
      forNear(qx, qz, 0.22, o => {
        if (o.y > qy + 0.01 && (o.x - qx) ** 2 + (o.z - qz) ** 2 < 0.22 * 0.22) list.push(o);
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

  function spawnPile(cx, cz, n, animate) {
    const radius = 0.6 + Math.sqrt(n) * 0.06;
    let placed = 0;
    for (let i = 0; i < n * 3 && placed < n; i++) {
      const r = Math.abs(gauss()) * radius;
      const a = Math.random() * TAU;
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      if (Math.abs(x) > HALF - 0.4 || Math.abs(z) > HALF - 0.4) continue;
      if (addCrayon(x, z, randomShade(), animate ? rand(4, 5.5) : 0, animate ? rand(0, 1.6) : 0)) placed++;
    }
    return placed;
  }

  function spawnCarpet(n) {
    for (let i = 0; i < n; i++) addCrayon(rand(-HALF + 0.5, HALF - 0.5), rand(-HALF + 0.5, HALF - 0.5), randomShade());
  }

  function deliverPile() {
    const space = maxFloor() - cr.length;
    if (space < 50) { toast('The room is too full for another pile. Sort some crayons!'); return false; }
    const n = Math.min(pileSize(state.upgrades.delivery), space);
    let cx = 0, cz = 0;
    for (let i = 0; i < 40; i++) {
      cx = rand(-HALF + 3, HALF - 3); cz = rand(-HALF + 3, HALF - 3);
      if (!blockedAt(cx, cz, 1.2) && Math.hypot(cx - player.x, cz - player.z) > 2.5) break;
    }
    spawnPile(cx, cz, n, true);
    blip(180, 0.4, 'triangle', 0.07);
    toast(`Look out! ${n} more crayons just got dumped in.`);
    return true;
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
    const full = b.count >= capacity();
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
    g.fillText(full ? (state.upgrades.autoPack ? 'Packing…' : 'FULL! Click to pack') : `${b.count} / ${capacity()}`, c.width / 2, 109, 210);
    b.labelTex.needsUpdate = true;
  }

  function buildBox(b) {
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
    b.group.position.set(b.x, 0, b.z);
    b.group.rotation.y = b.rot * Math.PI / 2;
    const col = SHADES[b.color].hex;
    b.stripeMat.color.set(col);
    b.fillMat.color.set(col);
    const f = Math.min(1, b.count / capacity());
    b.fill.visible = f > 0;
    const h = Math.max(0.02, f * (BOX_H - 0.08));
    b.fill.scale.y = h;
    b.fill.position.y = 0.04 + h / 2;
    drawBoxLabel(b);
  }

  function addBox(x, z, color, rot = 0, count = 0) {
    const b = { x, z, color, rot, count, incoming: 0 };
    state.boxes.push(b);
    buildBox(b);
    return b;
  }

  function packBox(b) {
    if (b.count < capacity()) return;
    const v = SHADES[b.color].value;
    const bonus = capacity() * v * 0.5 * coinMult();
    b.count = 0;
    refreshBox(b);
    const shelf = state.shelves.find(s => s.packed.length < SHELF_CAP);
    if (shelf) { shelf.packed.push(b.color); buildShelf(shelf); }
    earn(bonus, true);
    blip(520, 0.12, 'square', 0.04); setTimeout(() => blip(780, 0.15, 'square', 0.04), 90);
    toast(shelf ? `Packed a box of ${SHADES[b.color].name}! It's up on the shelf.` : 'Box packed! Buy another shelf to display it and earn coins over time.');
  }

  // ---------------------------------------------------------------------------
  // Shelves on the back wall
  // ---------------------------------------------------------------------------
  const shelfGroups = new Map();
  const plankMat = new T.MeshStandardMaterial({ color: 0xa8703f, roughness: 0.7 });
  function buildShelf(s) {
    let g = shelfGroups.get(s);
    if (g) scene.remove(g);
    g = new T.Group();
    const plank = new T.Mesh(new T.BoxGeometry(3.0, 0.08, 0.55), plankMat);
    plank.position.set(0, 1.6, 0.28);
    plank.castShadow = true; plank.receiveShadow = true;
    g.add(plank);
    for (const bx of [-1.2, 1.2]) {
      const br = new T.Mesh(new T.BoxGeometry(0.06, 0.3, 0.45), plankMat);
      br.position.set(bx, 1.42, 0.24);
      g.add(br);
    }
    s.packed.forEach((c, i) => {
      const pb = new T.Group();
      const box = new T.Mesh(new T.BoxGeometry(0.5, 0.42, 0.42), new T.MeshStandardMaterial({ color: cardboard, roughness: 0.9 }));
      box.castShadow = true;
      pb.add(box);
      pb.add(new T.Mesh(new T.BoxGeometry(0.1, 0.425, 0.425), new T.MeshStandardMaterial({ color: 0xe9d7b5, roughness: 0.4 })));
      const label = new T.Mesh(new T.PlaneGeometry(0.32, 0.16), new T.MeshStandardMaterial({ color: SHADES[c].hex, roughness: 0.6 }));
      label.position.set(0, 0, 0.212);
      pb.add(label);
      pb.position.set(-1.16 + i * 0.58, 1.85, 0.28);
      g.add(pb);
    });
    g.position.set(SHELF_SLOTS[s.slot], 0, -HALF);
    scene.add(g);
    shelfGroups.set(s, g);
  }
  function shelfIncome() {
    let v = 0;
    state.shelves.forEach(s => s.packed.forEach(c => { v += SHADES[c].value * 0.15; }));
    return v * coinMult();
  }

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
      const sp = walkSpeed(state.upgrades.speed) * (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 1.7 : 1) * Math.min(1, len) / len;
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
    const target = 1.65 + Math.min(1.2, topAt(player.x, player.z, 0.35)) * 0.85;
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
      const t = rayAABB(o, d, [b.x - hw, 0, b.z - hd], [b.x + hw, BOX_H + 0.85, b.z + hd]);
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
    if (placing) { aim = { type: 'place', floor, wall: rayWall(o, d) }; return; }
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
  handGroup.scale.setScalar(0.32);
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
    const n = handSize(state.upgrades.hand);
    if (hand.n && hand.c !== first.c) return;
    const space = n - hand.n;
    if (space <= 0) { toast(`Your hands are full (${n}). Toss them into a box!`); return; }
    const picked = [first];
    const r = scoop(state.upgrades.reach);
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
      const to = new T.Vector3(b.x + rand(-0.25, 0.25), BOX_H * 0.6, b.z + rand(-0.18, 0.18));
      startFlight(c, handWorld, to, i * 0.05, () => {
        if (b.color === c && b.count < capacity() && state.boxes.includes(b)) {
          b.count++;
          state.sorted++;
          earn(SHADES[c].value * coinMult(), true);
          refreshBox(b);
          blip(620 + Math.random() * 200, 0.06, 'sine', 0.05);
          if (b.count >= capacity() && state.upgrades.autoPack) setTimeout(() => packBox(b), 400);
        } else {
          // bounce off onto the floor next to the box
          const a = Math.random() * TAU;
          addCrayon(b.x + Math.cos(a) * 0.9, b.z + Math.sin(a) * 0.75, c);
          if (!warned) {
            warned = true;
            blip(150, 0.18, 'sawtooth', 0.04);
            toast(b.color !== c ? `Nope! Those are ${SHADES[c].name}, not ${SHADES[b.color].name}.` : 'That box is full! Click it to pack it up.');
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
    while (bots.length < state.upgrades.bots) {
      const { g, carry } = buildBot();
      bots.push({ g, carryMesh: carry, x: rand(-6, 6), z: rand(-6, 6), y: 0, state: 'idle', target: null, box: null, carry: [], wait: rand(0, 1), bob: Math.random() * 6 });
    }
  }

  function boxWithSpace(c, x, z) {
    let best = null, bd = Infinity;
    for (const b of state.boxes) {
      if (b.color !== c || b.count + b.incoming >= capacity()) continue;
      if (placing && placing.obj === b) continue;
      const d = (b.x - x) ** 2 + (b.z - z) ** 2;
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  function updateBot(bot, dt) {
    const speed = 1.6 + state.upgrades.botSpeed * 0.6;
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
      state.boxes.forEach(b => { if (b.count + b.incoming < capacity()) ok.add(b.color); });
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
          const want = Math.min(botCarry(state.upgrades.botSpeed), capacity() - box.count - box.incoming);
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
            if (box.color === c && box.count < capacity()) {
              box.count++; state.sorted++;
              earn(SHADES[c].value * coinMult(), false);
            } else addCrayon(bot.x, bot.z, c);
          }
          refreshBox(box);
          if (box.count >= capacity() && state.upgrades.autoPack) setTimeout(() => packBox(box), 400);
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
    placing = { kind, obj, isNew, prev: { x: obj.x, y: obj.y, z: obj.z, rot: obj.rot, ry: obj.ry } };
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
    if (placing.kind === 'box') refreshBox(o); else refreshDecor(o);
  }

  function finishPlacing() {
    const o = placing.obj;
    const kind = placing.kind;
    placing = null;
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
    const kind = placing.kind;
    placing = null;
    if (kind === 'box') refreshBox(o); else refreshDecor(o);
  }

  function putAway() {
    if (!placing || placing.kind !== 'decor') return;
    const d = placing.obj;
    scene.remove(d.group);
    state.decor = state.decor.filter(x => x !== d);
    const refund = Math.floor(DECOR[d.type].price / 2);
    state.coins += refund;
    toast(`Put away the ${DECOR[d.type].name} (+🪙${refund}).`);
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
  function earn(amount, show) {
    state.coins += amount;
    if (show) floatAcc += amount;
  }
  function flushFloaters(dt) {
    floatT -= dt;
    if (floatAcc > 0 && floatT <= 0) {
      const d = document.createElement('div');
      d.textContent = '+' + (floatAcc < 10 ? floatAcc.toFixed(1).replace(/\.0$/, '') : fmt(floatAcc)) + ' 🪙';
      $('floaters').appendChild(d);
      setTimeout(() => d.remove(), 1100);
      floatAcc = 0;
      floatT = 0.12;
    }
  }

  // ---------------------------------------------------------------------------
  // Highlighting (Shade Spotter upgrade)
  // ---------------------------------------------------------------------------
  let lastGlow = -1;
  const _gc = new T.Color();
  const GLOW_TO = new T.Color(1, 1, 0.75);
  function updateGlow(time) {
    let glow = -1;
    if (hand.n && state.upgrades.glow >= 1) glow = hand.c;
    else if (!hand.n && state.upgrades.glow >= 2 && aim.type === 'crayon') glow = aim.obj.c;
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
      const name = placing.kind === 'box' ? `${SHADES[o.color].name} box` : DECOR[o.type].name;
      const canRotate = placing.kind === 'box' || !DECOR[o.type].wall;
      html = `Placing <b>${name}</b> <span class="dim">· click to place${canRotate ? ' · R rotate' : ''}${placing.kind === 'decor' ? ' · X put away' : ''}${placing.isNew ? '' : ' · Esc cancel'}</span>`;
    } else if (aim.type === 'crayon') {
      const s = SHADES[aim.obj.c];
      html = `${sw(s.hex)}<b>${s.name}</b> <span class="dim">· click to ${hand.n ? 'grab more' : 'pick up'}</span>`;
    } else if (aim.type === 'box') {
      const b = aim.obj, s = SHADES[b.color];
      const full = b.count >= capacity();
      const what = hand.n ? 'click to toss' : full && !state.upgrades.autoPack ? 'click to pack' : 'G move' + (b.count === 0 ? ' · C change shade' : '');
      html = `${sw(s.hex)}<b>${s.name}</b> box ${b.count}/${capacity()} <span class="dim">· ${what}</span>`;
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
    hint.textContent = locked ? 'WASD walk · Shift run · E shop · G move furniture · Esc free the mouse'
      : 'WASD walk · drag to look · click to act · E shop · L lock mouse';
  }

  function updateHud() {
    $('coins').textContent = '🪙 ' + fmt(state.coins);
    $('shopCoins').textContent = '🪙 ' + fmt(state.coins);
    const inc = shelfIncome();
    $('income').textContent = `Shelves +${inc < 10 ? inc.toFixed(1) : fmt(inc)}/s`;
    $('cozy').textContent = `Cozy +${cozyPct()}%`;
    $('floorCount').textContent = `${cr.length.toLocaleString()} crayons to sort`;
    $('delivery').textContent = cr.length >= maxFloor() - 50 ? 'Room is full!' : `Next pile in ${Math.max(0, Math.ceil(state.deliveryT))}s`;
    $('btnDeliver').disabled = cr.length > 400;
    $('btnLock').classList.toggle('active', locked);
    if (!$('shop').hidden) refreshShopButtons();
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
    else if (aim.type === 'box' && aim.obj.count >= capacity() && !state.upgrades.autoPack) packBox(aim.obj);
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
        else toast('Only empty boxes can change shade. Fill it up and pack it first.');
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
  // Shop
  // ---------------------------------------------------------------------------
  let shopTab = 'storage';
  let shopButtons = [];

  function closeModals() { document.querySelectorAll('.modal').forEach(m => { m.hidden = true; }); }
  function openShop() {
    if (locked) document.exitPointerLock();
    keys.clear();
    $('shop').hidden = false;
    renderShop();
    updateHud();
  }

  function shopItems() {
    const items = [];
    if (shopTab === 'storage') {
      const covered = new Set(state.boxes.map(b => b.color)).size;
      items.push({
        icon: '📦', name: 'Sorting Box', price: boxCost(), level: `${covered}/30 shades`,
        desc: `Holds ${capacity()} crayons of one shade. Pick the shade, then place it in the room.`,
        buy: () => openPicker(null), custom: true,
      });
      items.push({
        icon: '🪵', name: 'Shelf', price: shelfCost(), soldOut: state.shelves.length >= SHELF_SLOTS.length,
        level: `${state.shelves.length}/${SHELF_SLOTS.length}`,
        desc: `Hangs on the back wall and holds ${SHELF_CAP} packed boxes. Every packed box on a shelf earns coins over time.`,
        buy: () => {
          const used = new Set(state.shelves.map(s => s.slot));
          const slot = [2, 3, 1, 4, 0, 5].find(s => !used.has(s));
          const s = { slot, packed: [] };
          state.shelves.push(s);
          buildShelf(s);
          toast('New shelf hung on the back wall!');
        },
      });
    } else if (shopTab === 'upgrades') {
      UPGRADES.forEach(u => {
        const l = state.upgrades[u.id];
        items.push({
          icon: u.icon, name: u.name, price: upgradeCost(u), soldOut: l >= u.max,
          level: u.max > 1 ? `Lv ${l}/${u.max}` : (l ? 'Owned' : ''),
          desc: l >= u.max ? 'Maxed out!' : u.desc(l),
          buy: () => {
            state.upgrades[u.id]++;
            if (u.id === 'bots') { syncBots(); toast('Sortbot activated! Beep boop.'); }
            if (u.id === 'bigBox' || u.id === 'autoPack') state.boxes.forEach(refreshBox);
            if (u.id === 'autoPack') state.boxes.forEach(b => { if (b.count >= capacity()) packBox(b); });
          },
        });
      });
    } else if (shopTab === 'decor') {
      Object.entries(DECOR).forEach(([type, def]) => {
        const n = state.decor.filter(d => d.type === type).length;
        items.push({
          icon: def.icon, name: def.name, price: def.price, level: n ? `${n} owned` : '',
          desc: `+${def.cozy}% cozy (boosts all coins). ${def.wall ? 'Hangs on a wall.' : 'Sits on the floor.'}`,
          buy: () => {
            const d = { type, x: player.x - Math.sin(player.yaw) * 2.5, y: def.wall ? 2.2 : 0, z: player.z - Math.cos(player.yaw) * 2.5, ry: 0 };
            state.decor.push(d);
            buildDecor(d);
            closeModals();
            startPlacing('decor', d, true);
            toast(def.wall ? 'Look at a wall and click to hang it.' : 'Look where you want it and click to place it.');
          },
        });
      });
    }
    return items;
  }

  function renderShop() {
    document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === shopTab));
    const list = $('shopList');
    list.innerHTML = '';
    shopButtons = [];
    shopItems().forEach(it => {
      const el = document.createElement('div');
      el.className = 'item';
      el.innerHTML = `<h3><span>${it.icon}</span>${it.name}<span class="lvl">${it.level || ''}</span></h3><p>${it.desc}</p>`;
      const btn = document.createElement('button');
      btn.className = 'primary';
      if (it.soldOut) { btn.textContent = 'Maxed'; btn.disabled = true; btn.className = ''; }
      else btn.textContent = `Buy · 🪙 ${fmt(it.price)}`;
      btn.onclick = () => {
        if (it.soldOut || state.coins < it.price) return;
        if (it.custom) { it.buy(); return; }
        state.coins -= it.price;
        it.buy();
        blip(880, 0.1, 'triangle', 0.06);
        save();
        if (!$('shop').hidden) renderShop();
        updateHud();
      };
      el.appendChild(btn);
      list.appendChild(el);
      shopButtons.push({ btn, it });
    });
    refreshShopButtons();
  }

  function refreshShopButtons() {
    shopButtons.forEach(({ btn, it }) => { if (!it.soldOut) btn.disabled = state.coins < it.price; });
  }

  $('btnShop').onclick = openShop;
  document.querySelectorAll('.tabs button').forEach(b => { b.onclick = () => { shopTab = b.dataset.tab; renderShop(); }; });
  document.querySelectorAll('[data-close]').forEach(b => { b.onclick = () => { $(b.dataset.close).hidden = true; }; });
  document.querySelectorAll('.modal').forEach(m => m.addEventListener('pointerdown', e => { if (e.target === m) m.hidden = true; }));

  // Shade picker for a new box (box = null) or recoloring an empty one
  function openPicker(box) {
    if (locked) document.exitPointerLock();
    $('pickerTitle').textContent = box ? 'Change this box to which shade?' : `New box (🪙 ${fmt(boxCost())}): which shade?`;
    const list = $('pickerList');
    list.innerHTML = '';
    const counts = new Array(SHADES.length).fill(0);
    cr.forEach(o => { counts[o.c]++; });
    const hasBox = i => state.boxes.some(b => b.color === i);
    SHADES.map((s, i) => i).sort((a, b) => (hasBox(a) - hasBox(b)) || a - b).forEach(i => {
      const s = SHADES[i];
      const nb = state.boxes.filter(b => b.color === i).length;
      const btn = document.createElement('button');
      btn.innerHTML = `<span class="sw" style="background:${s.hex}"></span><span>${s.name}<small>${counts[i]} on the floor · ${nb ? nb + ' box' + (nb > 1 ? 'es' : '') : 'no box yet'}</small></span>`;
      btn.onclick = () => {
        if (box) { box.color = i; refreshBox(box); save(); closeModals(); return; }
        const cost = boxCost();
        if (state.coins < cost) { toast('Not enough coins!'); return; }
        state.coins -= cost;
        state.extraBoxesBought++;
        const b = addBox(player.x - Math.sin(player.yaw) * 2.5, player.z - Math.cos(player.yaw) * 2.5, i);
        blip(880, 0.1, 'triangle', 0.06);
        closeModals();
        startPlacing('box', b, true);
        toast(`New ${s.name} box! Look where you want it and click to place it.`);
        updateHud();
      };
      list.appendChild(btn);
    });
    $('picker').hidden = false;
  }

  // ---------------------------------------------------------------------------
  // Other buttons
  // ---------------------------------------------------------------------------
  $('btnDeliver').onclick = () => {
    if (cr.length > 400) return;
    if (deliverPile()) state.deliveryT = deliveryInterval(state.upgrades.delivery);
  };
  $('btnSound').onclick = () => { muted = !muted; $('btnSound').textContent = muted ? '🔇' : '🔊'; };
  $('btnHelp').onclick = () => { if (locked) document.exitPointerLock(); $('help').hidden = false; };
  $('btnLock').onclick = () => { if (locked) document.exitPointerLock(); else requestLock(); };
  $('btnStart').onclick = () => {
    $('help').hidden = true;
    state.seenHelp = true;
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
    toast('Fresh room, fresh mess.');
  };

  // ---------------------------------------------------------------------------
  // Save / load
  // ---------------------------------------------------------------------------
  function save() {
    try {
      const flat = [];
      const r3 = v => Math.round(v * 1000) / 1000;
      for (const o of cr) flat.push(r3(o.x), r3(o.y), r3(o.z), r3(o.ax), r3(o.ay), r3(o.az), o.c);
      // crayons in your hands, in the air or on a bot go back to the floor in the save
      const loose = [];
      for (let i = 0; i < hand.n; i++) loose.push(hand.c);
      flights.forEach(f => loose.push(f.c));
      bots.forEach(b => b.carry.forEach(c => loose.push(c)));
      const s = {
        coins: state.coins, sorted: state.sorted, deliveryT: state.deliveryT, extraBoxesBought: state.extraBoxesBought,
        upgrades: state.upgrades, seenHelp: state.seenHelp,
        shelves: state.shelves,
        boxes: state.boxes.map(({ x, z, rot, color, count }) => ({ x, z, rot, color, count })),
        decor: state.decor.map(({ type, x, y, z, ry }) => ({ type, x, y, z, ry })),
        player: { x: player.x, z: player.z, yaw: player.yaw, pitch: player.pitch },
        crayons: flat, loose,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    } catch (e) { /* storage may be unavailable */ }
  }

  function clearWorld() {
    if (state) {
      state.boxes.forEach(b => scene.remove(b.group));
      state.decor.forEach(d => scene.remove(d.group));
    }
    shelfGroups.forEach(g => scene.remove(g));
    shelfGroups.clear();
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
  }

  function newGame() {
    state = freshState();
    Object.assign(player, state.player);
    START_BOXES.forEach((c, i) => addBox(-5 + i * 2, 7, c));
    state.shelves.forEach(buildShelf);
    // Crayons absolutely everywhere, plus some huge heaps. Every crayon is a random shade.
    spawnCarpet(1800);
    spawnPile(-6, -5, 1300);
    spawnPile(5, -6, 1300);
    spawnPile(-1, 0, 1100);
    spawnPile(7, 3, 900);
    spawnPile(-8, 4, 700);
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        state = freshState();
        Object.assign(state, {
          coins: s.coins || 0, sorted: s.sorted || 0, deliveryT: s.deliveryT ?? state.deliveryT,
          extraBoxesBought: s.extraBoxesBought || 0, seenHelp: !!s.seenHelp,
          upgrades: Object.assign(state.upgrades, s.upgrades || {}),
          shelves: s.shelves && s.shelves.length ? s.shelves : state.shelves,
          player: s.player || state.player,
        });
        Object.assign(player, state.player);
        (s.boxes || []).forEach(b => addBox(b.x, b.z, b.color, b.rot || 0, b.count || 0));
        (s.decor || []).forEach(d => { const o = { type: d.type, x: d.x, y: d.y || 0, z: d.z, ry: d.ry || 0 }; state.decor.push(o); buildDecor(o); });
        state.shelves.forEach(buildShelf);
        const f = s.crayons || [];
        for (let i = 0; i + 6 < f.length && cr.length < MAX_CRAYONS; i += 7) {
          pushCrayon({ x: f[i], y: f[i + 1], z: f[i + 2], ax: f[i + 3], ay: f[i + 4], az: f[i + 5], c: f[i + 6], dy: 0, vy: 0, delay: 0 });
        }
        (s.loose || []).forEach(c => addCrayon(player.x + rand(-1, 1), player.z + rand(-1, 1), c));
        syncBots();
        return;
      }
    } catch (e) {
      clearWorld();
    }
    newGame();
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

    state.coins += shelfIncome() * dt;
    state.deliveryT -= dt;
    if (state.deliveryT <= 0) {
      state.deliveryT = deliveryInterval(state.upgrades.delivery);
      if (cr.length < maxFloor() - 50) deliverPile();
    }

    if (matDirty) { crayonMesh.instanceMatrix.needsUpdate = true; matDirty = false; }
    if (colDirty) { crayonMesh.instanceColor.needsUpdate = true; colDirty = false; }

    renderer.render(scene, camera);
    updateAimLabel();
    flushFloaters(dt);

    saveT += dt;
    if (saveT > 6) { saveT = 0; save(); }
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

  load();
  resize();
  refreshHand();
  updateHud();
  $('help').hidden = false;
  requestAnimationFrame(frame);

  // Exposed for debugging in the console
  window.craySorting = {
    get state() { return state; }, get crayons() { return cr; }, get aim() { return aim; },
    player, SHADES, save, act, pickUp, tossToBox, hand, camera,
  };
})();
