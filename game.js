(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // World constants
  // ---------------------------------------------------------------------------
  const W = 1280;          // world width
  const H = 800;           // world height
  const WALL = 160;        // wall height (floor starts below)
  const CL = 34;           // crayon length
  const CW = 9;            // crayon width
  const BW = 84;           // sorting box width
  const BH = 66;           // sorting box height
  const SHELF_W = 170;
  const SHELF_SLOTS = 6;
  const SHELF_CAP = 4;
  const SAVE_KEY = 'cray-sorting-save-v2';

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
  // Every box you start with: the middle shade of the first six families
  const START_BOXES = [1, 4, 7, 10, 13, 16];

  const DECOR = {
    plant:    { name: 'Potted Plant',     price: 40,  cozy: 2,  w: 54,  h: 74 },
    rug:      { name: 'Cozy Rug',         price: 60,  cozy: 3,  w: 230, h: 130, under: true },
    lamp:     { name: 'Floor Lamp',       price: 70,  cozy: 3,  w: 44,  h: 110 },
    beanbag:  { name: 'Beanbag',          price: 90,  cozy: 4,  w: 92,  h: 70 },
    fishbowl: { name: 'Fish Bowl',        price: 150, cozy: 6,  w: 62,  h: 70 },
    catbed:   { name: 'Cat Bed (with cat)', price: 250, cozy: 10, w: 104, h: 62 },
    poster:   { name: 'Rainbow Poster',   price: 50,  cozy: 2,  w: 70,  h: 92,  wall: true },
    clock:    { name: 'Wall Clock',       price: 45,  cozy: 2,  w: 58,  h: 58,  wall: true },
    window:   { name: 'Window',           price: 100, cozy: 4,  w: 124, h: 104, wall: true },
    lights:   { name: 'Fairy Lights',     price: 120, cozy: 5,  w: 280, h: 40,  wall: true },
  };

  const UPGRADES = [
    { id: 'hand', name: 'Bigger Handfuls', icon: '🤲', max: 6, base: 30, mult: 2.1,
      desc: l => `Scoop up to ${handSize(l + 1)} crayons of the same shade at once (now ${handSize(l)}).` },
    { id: 'reach', name: 'Long Reach', icon: '📏', max: 4, base: 45, mult: 2.2,
      desc: l => `Scoop matching crayons from farther away (${reach(l)}px → ${reach(l + 1)}px).` },
    { id: 'glow', name: 'Shade Spotter', icon: '🔦', max: 2, base: 60, mult: 4,
      desc: l => l === 0 ? 'While holding crayons, their box glows and matching crayons in the piles light up.'
                         : 'Hovering any crayon also lights up its box and every crayon of that shade.' },
    { id: 'bigBox', name: 'Roomier Boxes', icon: '📦', max: 5, base: 50, mult: 2,
      desc: l => `Boxes hold ${boxCap(l + 1)} crayons (now ${boxCap(l)}).` },
    { id: 'pay', name: 'Collector Reputation', icon: '⭐', max: 8, base: 75, mult: 2,
      desc: l => `+25% coins for every crayon sorted (now +${l * 25}%).` },
    { id: 'delivery', name: 'Bigger Deliveries', icon: '🚚', max: 4, base: 80, mult: 2.3,
      desc: l => `New piles arrive every ${deliveryInterval(l + 1)}s with ${pileSize(l + 1)} crayons.` },
    { id: 'autoPack', name: 'Tape Gun', icon: '🧷', max: 1, base: 300, mult: 1,
      desc: () => 'Full boxes pack themselves automatically.' },
    { id: 'bots', name: 'Sortbot', icon: '🤖', max: 4, base: 250, mult: 3,
      desc: l => `A little robot that sorts crayons for you. (${l} owned)` },
    { id: 'botSpeed', name: 'Sortbot Turbo', icon: '⚙️', max: 5, base: 200, mult: 2,
      desc: l => `Sortbots move faster and carry more (${botCarry(l)} → ${botCarry(l + 1)} crayons).` },
  ];

  const handSize = l => [1, 3, 5, 8, 12, 16, 22][l];
  const reach = l => 90 + l * 40;
  const boxCap = l => 20 + l * 10;
  const deliveryInterval = l => 40 - l * 6;
  const pileSize = l => 250 + l * 80;
  const botCarry = l => 1 + Math.floor((l + 1) / 2);
  const maxFloor = () => 4500 + state.upgrades.delivery * 400;

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  let state;
  let uid = 1;

  function freshState() {
    const s = {
      coins: 0,
      sorted: 0,
      boxes: [],
      shelves: [{ slot: 1, packed: [] }],
      decor: [],
      upgrades: Object.fromEntries(UPGRADES.map(u => [u.id, 0])),
      crayons: [],
      deliveryT: deliveryInterval(0),
      extraBoxesBought: 0,
      seenHelp: false,
    };
    return s;
  }

  function allShades() {
    return SHADES.map((s, i) => i);
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        const base = freshState();
        state = Object.assign(base, s);
        state.upgrades = Object.assign(base.upgrades, s.upgrades || {});
        state.boxes.forEach(b => { b.id = uid++; });
        state.decor.forEach(d => { d.id = uid++; });
        touch();
        return;
      }
    } catch (e) { /* ignore broken saves */ }
    newGame();
  }

  function newGame() {
    state = freshState();
    START_BOXES.forEach((c, i) => {
      state.boxes.push({ id: uid++, x: 340 + i * 120, y: 735, color: c, count: 0 });
    });
    // Crayons absolutely everywhere, plus some extra-big heaps on top. Totally random shades.
    spawnCarpet(1800);
    spawnPile(280, 380, 420);
    spawnPile(700, 310, 380);
    spawnPile(1060, 480, 420);
    spawnPile(560, 580, 320);
    touch();
  }

  function save() {
    try {
      const s = Object.assign({}, state, {
        boxes: state.boxes.map(({ x, y, color, count }) => ({ x, y, color, count })),
        decor: state.decor.map(({ type, x, y }) => ({ type, x, y })),
        crayons: state.crayons.map(c => ({ x: Math.round(c.x), y: Math.round(c.y), a: +c.a.toFixed(2), c: c.c })),
      });
      // Crayons in hand / on bots go back to the floor in the save
      hand.forEach(c => s.crayons.push({ x: Math.round(c.x), y: Math.round(c.y), a: c.a, c: c.c }));
      bots.forEach(b => b.carry.forEach(c => s.crayons.push({ x: Math.round(b.x), y: Math.round(b.y), a: c.a, c: c.c })));
      localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    } catch (e) { /* storage may be unavailable */ }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = clamp((n >> 16) + amt, 0, 255);
    const g = clamp(((n >> 8) & 255) + amt, 0, 255);
    const b = clamp((n & 255) + amt, 0, 255);
    return `rgb(${r},${g},${b})`;
  }

  function fmt(n) {
    n = Math.floor(n);
    if (n < 10000) return String(n);
    if (n < 1e6) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
  }

  function cozyPct() {
    return Math.min(100, state.decor.reduce((s, d) => s + DECOR[d.type].cozy, 0));
  }
  function coinMult() {
    return (1 + state.upgrades.pay * 0.25) * (1 + cozyPct() / 100);
  }
  function capacity() { return boxCap(state.upgrades.bigBox); }

  function upgradeCost(u) {
    return Math.round(u.base * Math.pow(u.mult, state.upgrades[u.id]));
  }
  function boxCost() { return Math.round(20 * Math.pow(1.18, state.extraBoxesBought)); }
  function shelfCost() { return Math.round(80 * Math.pow(1.8, state.shelves.length - 1)); }

  function earn(amount, x, y) {
    state.coins += amount;
    if (x !== undefined) floaters.push({ x, y, text: '+' + (amount < 10 ? amount.toFixed(1).replace(/\.0$/, '') : fmt(amount)), t: 0 });
  }

  // ---------------------------------------------------------------------------
  // Crayon piles
  // ---------------------------------------------------------------------------
  function blockedAt(x, y, pad = 8) {
    for (const b of state.boxes) {
      if (Math.abs(x - b.x) < BW / 2 + pad && Math.abs(y - b.y) < BH / 2 + pad) return true;
    }
    for (const d of state.decor) {
      const def = DECOR[d.type];
      if (def.wall || def.under) continue;
      if (Math.abs(x - d.x) < def.w / 2 + pad && Math.abs(y - d.y) < def.h / 2 + pad) return true;
    }
    return false;
  }

  function onFloor(x, y) {
    return x > 20 && x < W - 20 && y > WALL + 18 && y < H - 14;
  }

  // Every crayon gets a completely random shade: no clumping by color at all.
  const randomShade = () => Math.floor(Math.random() * SHADES.length);

  function spawnPile(cx, cy, n, animate = false) {
    const radius = 50 + Math.sqrt(n) * 7;
    let placed = 0, tries = 0;
    while (placed < n && tries < n * 30) {
      tries++;
      const r = Math.abs(gauss()) * radius;
      const ang = Math.random() * Math.PI * 2;
      const x = cx + Math.cos(ang) * r * 1.3;
      const y = cy + Math.sin(ang) * r * 0.85;
      if (!onFloor(x, y) || blockedAt(x, y)) continue;
      const cr = { x, y, a: Math.random() * Math.PI * 2, c: randomShade() };
      if (animate) { cr.drop = rand(0, 0.6); cr.fall = 0; }
      state.crayons.push(cr);
      placed++;
    }
    touch();
    return placed;
  }

  // A layer of crayons spread over the whole floor
  function spawnCarpet(n) {
    let placed = 0, tries = 0;
    while (placed < n && tries < n * 20) {
      tries++;
      const x = rand(24, W - 24), y = rand(WALL + 20, H - 16);
      if (blockedAt(x, y)) continue;
      state.crayons.push({ x, y, a: Math.random() * Math.PI * 2, c: randomShade() });
      placed++;
    }
    touch();
  }

  function deliverPile() {
    const room = maxFloor() - state.crayons.length;
    if (room < 20) { toast('The floor is too crowded for another pile. Sort some crayons!'); return false; }
    const n = Math.min(pileSize(state.upgrades.delivery), room);
    let cx = 640, cy = 440;
    for (let i = 0; i < 40; i++) {
      cx = rand(180, W - 180); cy = rand(WALL + 110, H - 150);
      if (!blockedAt(cx, cy, 40)) break;
    }
    spawnPile(cx, cy, n, true);
    blip(220, 0.25, 'triangle', 0.06);
    toast(`Another ${n} crayons just got dumped on the floor!`);
    return true;
  }

  function crayonAt(px, py) {
    for (let i = state.crayons.length - 1; i >= 0; i--) {
      const c = state.crayons[i];
      const dx = px - c.x, dy = py - c.y;
      if (dx * dx + dy * dy > 30 * 30) continue;
      const cos = Math.cos(-c.a), sin = Math.sin(-c.a);
      const lx = dx * cos - dy * sin, ly = dx * sin + dy * cos;
      if (Math.abs(lx) <= CL / 2 + 4 && Math.abs(ly) <= CW / 2 + 6) return c;
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Boxes & shelves
  // ---------------------------------------------------------------------------
  function boxAt(px, py, pad = 0) {
    for (let i = state.boxes.length - 1; i >= 0; i--) {
      const b = state.boxes[i];
      if (Math.abs(px - b.x) <= BW / 2 + pad && Math.abs(py - b.y) <= BH / 2 + pad) return b;
    }
    return null;
  }

  function shelfX(slot) { return 30 + SHELF_W / 2 + slot * ((W - 60 - SHELF_W) / (SHELF_SLOTS - 1)); }

  function packBox(b) {
    if (b.count < capacity()) return;
    const v = SHADES[b.color].value;
    const bonus = capacity() * v * 0.5 * coinMult();
    b.count = 0;
    b.shake = 0.4;
    const shelf = state.shelves.find(s => s.packed.length < SHELF_CAP);
    if (shelf) shelf.packed.push(b.color);
    earn(bonus, b.x, b.y - 40);
    blip(520, 0.12, 'square', 0.04); setTimeout(() => blip(780, 0.15, 'square', 0.04), 90);
    if (!shelf) toast('Box packed! Buy another shelf to display it and earn coins over time.');
  }

  function shelfIncome() {
    let v = 0;
    state.shelves.forEach(s => s.packed.forEach(c => { v += SHADES[c].value * 0.15; }));
    return v * coinMult();
  }

  function pushCrayonsOutOf(x, y, w, h) {
    for (const c of state.crayons) {
      if (Math.abs(c.x - x) < w / 2 + 6 && Math.abs(c.y - y) < h / 2 + 6) {
        const dy = c.y < y ? -(h / 2 + 10) : (h / 2 + 10);
        c.y = clamp(y + dy + rand(-6, 6), WALL + 20, H - 16);
        if (Math.abs(c.y - y) < h / 2 + 4) c.x = x + (c.x < x ? -1 : 1) * (w / 2 + 12);
      }
    }
    touch();
  }

  function freeSpot(w, h, wall) {
    for (let i = 0; i < 300; i++) {
      const x = rand(w / 2 + 20, W - w / 2 - 20);
      const y = wall ? rand(h / 2 + 6, WALL - h / 2 - 4) : rand(WALL + h / 2 + 20, H - h / 2 - 10);
      let ok = true;
      if (!wall) {
        for (const b of state.boxes) if (Math.abs(x - b.x) < (BW + w) / 2 + 10 && Math.abs(y - b.y) < (BH + h) / 2 + 10) ok = false;
        for (const d of state.decor) {
          const def = DECOR[d.type];
          if (def.wall || def.under) continue;
          if (Math.abs(x - d.x) < (def.w + w) / 2 + 10 && Math.abs(y - d.y) < (def.h + h) / 2 + 10) ok = false;
        }
        // Prefer clear floor
        if (ok && i < 200) {
          let n = 0;
          for (const c of state.crayons) if (Math.abs(c.x - x) < w / 2 + 10 && Math.abs(c.y - y) < h / 2 + 10) n++;
          if (n > 3) ok = false;
        }
      }
      if (ok) return { x, y };
    }
    return { x: W / 2, y: wall ? WALL / 2 : H - 80 };
  }

  // ---------------------------------------------------------------------------
  // Player hand
  // ---------------------------------------------------------------------------
  let hand = [];                // crayons currently held
  let mouse = { x: W / 2, y: H / 2, inside: false };
  let pressed = null;           // { x, y, mode }
  let editMode = false;
  let selected = null;          // { kind: 'box'|'decor', obj }
  let dragOff = null;

  function pickUp(first) {
    const n = handSize(state.upgrades.hand);
    const r2 = reach(state.upgrades.reach) ** 2;
    const picked = [first];
    const candidates = [];
    for (const c of state.crayons) {
      if (c === first || c.c !== first.c || c.claimed) continue;
      const d = dist2(c.x, c.y, first.x, first.y);
      if (d <= r2) candidates.push([d, c]);
    }
    candidates.sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < candidates.length && picked.length < n; i++) picked.push(candidates[i][1]);
    const set = new Set(picked);
    state.crayons = state.crayons.filter(c => !set.has(c));
    picked.forEach(c => { c.claimed = null; c.drop = 0; });
    hand = picked;
    touch();
    blip(440 + picked.length * 20, 0.06, 'sine', 0.06);
  }

  function dropHandOnFloor(x, y) {
    hand.forEach((c, i) => {
      c.x = clamp(x + rand(-14, 14) * Math.sqrt(i + 1) * 0.6, 24, W - 24);
      c.y = clamp(y + rand(-10, 10) * Math.sqrt(i + 1) * 0.6, WALL + 20, H - 16);
      c.a = Math.random() * Math.PI * 2;
      state.crayons.push(c);
    });
    hand = [];
    touch();
  }

  function depositInto(box, items, x, y) {
    const space = capacity() - box.count;
    if (space <= 0) return 0;
    const n = Math.min(space, items.length);
    box.count += n;
    state.sorted += n;
    const amount = n * SHADES[box.color].value * coinMult();
    earn(amount, x ?? box.x, (y ?? box.y) - 30);
    box.bump = 0.25;
    for (let i = 0; i < Math.min(8, n * 2); i++) {
      sparks.push({ x: box.x + rand(-20, 20), y: box.y - 20, vx: rand(-60, 60), vy: rand(-140, -60), t: 0, col: SHADES[box.color].hex });
    }
    if (box.count >= capacity() && state.upgrades.autoPack) setTimeout(() => packBox(box), 350);
    return n;
  }

  function tryDeposit(px, py) {
    const box = boxAt(px, py, 14);
    if (!box) return false;
    const shadeIdx = hand[0].c;
    if (box.color !== shadeIdx) {
      box.shake = 0.35;
      blip(160, 0.15, 'sawtooth', 0.04);
      toast(`Nope! That's ${SHADES[shadeIdx].name}, not ${SHADES[box.color].name}.`);
      return true;
    }
    if (box.count >= capacity()) {
      box.shake = 0.3;
      toast(state.upgrades.autoPack ? 'This box is being packed…' : 'That box is full! Click it to pack it up.');
      return true;
    }
    const n = depositInto(box, hand);
    hand.splice(0, n);
    blip(660 + Math.random() * 120, 0.08, 'sine', 0.07);
    return true;
  }

  // ---------------------------------------------------------------------------
  // Sortbots
  // ---------------------------------------------------------------------------
  let bots = [];
  function syncBots() {
    while (bots.length < state.upgrades.bots) {
      bots.push({ x: rand(200, W - 200), y: rand(WALL + 60, H - 60), state: 'idle', target: null, box: null, carry: [], wait: 0, face: 1, bob: Math.random() * 6 });
    }
  }

  function boxWithSpace(shadeIdx, x, y) {
    let best = null, bd = Infinity;
    for (const b of state.boxes) {
      if (b.color !== shadeIdx || b.count + (b.incoming || 0) >= capacity()) continue;
      const d = dist2(x, y, b.x, b.y);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  function updateBot(bot, dt) {
    const speed = 90 + state.upgrades.botSpeed * 35;
    bot.bob += dt * 8;
    if (bot.wait > 0) { bot.wait -= dt; return; }
    const moveTo = (tx, ty) => {
      const dx = tx - bot.x, dy = ty - bot.y;
      const d = Math.hypot(dx, dy);
      if (d < 4) return true;
      const s = Math.min(d, speed * dt);
      bot.x += dx / d * s; bot.y += dy / d * s;
      if (Math.abs(dx) > 1) bot.face = Math.sign(dx);
      return false;
    };

    if (bot.state === 'idle') {
      // Find the nearest crayon that has a box with room
      let best = null, bd = Infinity;
      for (const c of state.crayons) {
        if (c.claimed || c.drop > 0) continue;
        const d = dist2(bot.x, bot.y, c.x, c.y);
        if (d < bd && boxWithSpace(c.c, c.x, c.y)) { bd = d; best = c; }
      }
      if (!best) { bot.wait = 1; return; }
      best.claimed = bot;
      bot.target = best;
      bot.state = 'toCrayon';
    }

    if (bot.state === 'toCrayon') {
      const t = bot.target;
      if (!t || !state.crayons.includes(t)) { bot.state = 'idle'; bot.target = null; return; }
      if (moveTo(t.x, t.y - 6)) {
        const box = boxWithSpace(t.c, t.x, t.y);
        if (!box) { t.claimed = null; bot.state = 'idle'; return; }
        const want = Math.min(botCarry(state.upgrades.botSpeed), capacity() - box.count - (box.incoming || 0));
        const grab = [t];
        for (const c of state.crayons) {
          if (grab.length >= want) break;
          if (c !== t && c.c === t.c && !c.claimed && c.drop <= 0 && dist2(c.x, c.y, t.x, t.y) < 60 * 60) grab.push(c);
        }
        const set = new Set(grab);
        state.crayons = state.crayons.filter(c => !set.has(c));
        touch();
        bot.carry = grab;
        bot.box = box;
        box.incoming = (box.incoming || 0) + grab.length;
        bot.target = null;
        bot.state = 'toBox';
        bot.wait = 0.2;
      }
    }

    if (bot.state === 'toBox') {
      const box = bot.box;
      if (!state.boxes.includes(box)) {
        bot.carry.forEach(c => { c.x = bot.x + rand(-8, 8); c.y = bot.y + rand(-8, 8); c.claimed = null; state.crayons.push(c); });
        bot.carry = []; bot.state = 'idle'; touch(); return;
      }
      if (moveTo(box.x, box.y + BH / 2 + 14)) {
        box.incoming = Math.max(0, (box.incoming || 0) - bot.carry.length);
        if (box.color === bot.carry[0].c) {
          const n = depositInto(box, bot.carry, box.x, box.y);
          bot.carry.splice(0, n);
        }
        bot.carry.forEach(c => { c.x = bot.x + rand(-12, 12); c.y = bot.y + rand(4, 16); c.claimed = null; state.crayons.push(c); });
        bot.carry = [];
        touch();
        bot.box = null;
        bot.state = 'idle';
        bot.wait = 0.25;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------
  let floaters = [];
  let sparks = [];
  let time = 0;

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

  const toastEl = document.getElementById('toast');
  function toast(msg) {
    const d = document.createElement('div');
    d.textContent = msg;
    toastEl.appendChild(d);
    while (toastEl.children.length > 3) toastEl.firstChild.remove();
    setTimeout(() => d.remove(), 2900);
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------
  const canvas = document.getElementById('game');
  const mainCtx = canvas.getContext('2d');
  let ctx = mainCtx;
  // Floor crayons are drawn once into an offscreen layer and only redrawn when they change,
  // so the room can hold thousands of them.
  const layerCanvas = document.createElement('canvas');
  const layerCtx = layerCanvas.getContext('2d');
  let layerScale = 1;
  let crayonsDirty = true;
  function touch() { crayonsDirty = true; }
  const settled = c => !(c.drop > 0) && c.fall === undefined;
  function renderCrayonLayer() {
    crayonsDirty = false;
    ctx = layerCtx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, layerCanvas.width, layerCanvas.height);
    ctx.setTransform(layerScale, 0, 0, layerScale, 0, 0);
    for (const c of state.crayons) if (settled(c)) drawCrayon(c.x, c.y, c.a, c.c);
    ctx = mainCtx;
  }
  let scale = 1, offX = 0, offY = 0, dpr = 1;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    scale = Math.min(r.width / W, r.height / H);
    offX = (r.width - W * scale) / 2;
    offY = (r.height - H * scale) / 2;
    layerScale = Math.min(2, Math.max(0.5, scale * dpr));
    layerCanvas.width = Math.round(W * layerScale);
    layerCanvas.height = Math.round(H * layerScale);
    touch();
  }

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawCrayon(x, y, a, ci, glow) {
    const col = SHADES[ci].hex;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    if (glow) {
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#fffbe0';
      rr(-CL / 2 - 3, -CW / 2 - 3, CL + 6, CW + 6, 6);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = 'rgba(60,30,10,.18)';
      rr(-CL / 2 + 2, -CW / 2 + 3, CL - 4, CW, 4);
      ctx.fill();
    }
    // body
    ctx.fillStyle = col;
    rr(-CL / 2, -CW / 2, CL - 8, CW, 3);
    ctx.fill();
    // tip
    ctx.beginPath();
    ctx.moveTo(CL / 2 - 9, -CW / 2 + 1);
    ctx.lineTo(CL / 2, -1);
    ctx.lineTo(CL / 2, 1);
    ctx.lineTo(CL / 2 - 9, CW / 2 - 1);
    ctx.closePath();
    ctx.fill();
    // paper wrapper
    ctx.fillStyle = shade(col, -35);
    ctx.fillRect(-CL / 2 + 5, -CW / 2, 15, CW);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.fillRect(-CL / 2 + 7, -CW / 2, 1.5, CW);
    ctx.fillRect(-CL / 2 + 17, -CW / 2, 1.5, CW);
    // shine
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillRect(-CL / 2 + 1, -CW / 2 + 1.5, CL - 11, 1.6);
    // outline (helps the very light shades)
    ctx.strokeStyle = 'rgba(0,0,0,.28)';
    ctx.lineWidth = 0.8;
    rr(-CL / 2, -CW / 2, CL - 8, CW, 3);
    ctx.stroke();
    ctx.restore();
  }

  function drawRoom() {
    // wall
    ctx.fillStyle = '#f7e6cf';
    ctx.fillRect(0, 0, W, WALL);
    ctx.fillStyle = 'rgba(232, 196, 160, .45)';
    for (let x = 0; x < W; x += 40) ctx.fillRect(x, 0, 14, WALL);
    // floor planks
    ctx.fillStyle = '#d8b088';
    ctx.fillRect(0, WALL, W, H - WALL);
    ctx.strokeStyle = 'rgba(120, 75, 40, .22)';
    ctx.lineWidth = 2;
    for (let y = WALL + 34, row = 0; y < H; y += 34, row++) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      for (let x = (row % 2) * 110; x < W; x += 220) {
        ctx.beginPath(); ctx.moveTo(x, y - 34); ctx.lineTo(x, y); ctx.stroke();
      }
    }
    // baseboard
    ctx.fillStyle = '#fff7ea';
    ctx.fillRect(0, WALL - 8, W, 14);
    ctx.fillStyle = 'rgba(0,0,0,.08)';
    ctx.fillRect(0, WALL + 6, W, 6);
  }

  function drawShelves() {
    state.shelves.forEach(s => {
      const x = shelfX(s.slot);
      const y = 128;
      // brackets
      ctx.fillStyle = '#8a5a35';
      ctx.fillRect(x - SHELF_W / 2 + 14, y, 8, 18);
      ctx.fillRect(x + SHELF_W / 2 - 22, y, 8, 18);
      // packed boxes
      s.packed.forEach((c, i) => {
        const bx = x - SHELF_W / 2 + 8 + i * 40;
        ctx.fillStyle = '#c99a62';
        ctx.fillRect(bx, y - 32, 34, 32);
        ctx.fillStyle = '#b5844c';
        ctx.fillRect(bx, y - 32, 34, 5);
        ctx.fillStyle = SHADES[c].hex;
        ctx.fillRect(bx + 6, y - 22, 22, 12);
        ctx.strokeStyle = 'rgba(0,0,0,.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + 6, y - 22, 22, 12);
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        ctx.fillRect(bx + 15, y - 32, 4, 32);
      });
      // plank
      ctx.fillStyle = '#a8703f';
      rr(x - SHELF_W / 2, y, SHELF_W, 10, 3);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.2)';
      ctx.fillRect(x - SHELF_W / 2 + 3, y + 1, SHELF_W - 6, 2);
    });
  }

  function drawBox(b, highlight) {
    let x = b.x, y = b.y;
    if (b.shake > 0) x += Math.sin(time * 60) * 4 * (b.shake / 0.35);
    const bump = b.bump > 0 ? Math.sin((b.bump / 0.25) * Math.PI) * 4 : 0;
    const cap = capacity();
    const full = b.count >= cap;
    const col = SHADES[b.color].hex;

    ctx.save();
    ctx.translate(x, y - bump);
    if (highlight) {
      ctx.shadowColor = '#fff59a';
      ctx.shadowBlur = 24 + Math.sin(time * 6) * 8;
      ctx.fillStyle = '#fff59a';
      rr(-BW / 2 - 6, -BH / 2 - 16, BW + 12, BH + 22, 12);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    // shadow
    ctx.fillStyle = 'rgba(60,30,10,.22)';
    ctx.beginPath(); ctx.ellipse(0, BH / 2 + 2, BW / 2 + 4, 8, 0, 0, Math.PI * 2); ctx.fill();
    // back of box (inside)
    ctx.fillStyle = '#9c6f3e';
    ctx.fillRect(-BW / 2 + 4, -BH / 2 - 8, BW - 8, 14);
    // crayons poking out, more as it fills
    const shown = Math.ceil((b.count / cap) * 12);
    for (let i = 0; i < shown; i++) {
      const cx = -BW / 2 + 10 + (i % 12) * ((BW - 20) / 11);
      const h = 10 + ((i * 7) % 5) * 2;
      ctx.fillStyle = col;
      ctx.fillRect(cx - 3, -BH / 2 - 4 - h, 6, h + 6);
      ctx.beginPath();
      ctx.moveTo(cx - 3, -BH / 2 - 4 - h); ctx.lineTo(cx, -BH / 2 - 10 - h); ctx.lineTo(cx + 3, -BH / 2 - 4 - h); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 0.7;
      ctx.strokeRect(cx - 3, -BH / 2 - 4 - h, 6, h + 6);
    }
    // front of box
    ctx.fillStyle = '#c99a62';
    rr(-BW / 2, -BH / 2 + 2, BW, BH - 2, 6);
    ctx.fill();
    ctx.fillStyle = '#b5844c';
    ctx.fillRect(-BW / 2, -BH / 2 + 2, BW, 6);
    // label
    ctx.fillStyle = col;
    rr(-BW / 2 + 8, -BH / 2 + 12, BW - 16, 20, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = luminance(col) > 0.6 ? '#2a2a2a' : '#fff';
    ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(SHADES[b.color].name, 0, -BH / 2 + 22.5, BW - 18);
    // fill meter
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    rr(-BW / 2 + 8, BH / 2 - 16, BW - 16, 9, 4); ctx.fill();
    ctx.fillStyle = full ? '#3bb273' : '#fff';
    rr(-BW / 2 + 8, BH / 2 - 16, (BW - 16) * Math.min(1, b.count / cap), 9, 4); ctx.fill();
    ctx.fillStyle = '#4a2f18';
    ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
    ctx.fillText(`${b.count}/${cap}`, 0, BH / 2 - 25);
    ctx.restore();

    if (full && !state.upgrades.autoPack) {
      const py = y - BH / 2 - 34 + Math.sin(time * 5) * 3;
      ctx.fillStyle = '#3bb273';
      rr(x - 30, py - 12, 60, 22, 11); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('PACK!', x, py);
    }
  }

  function luminance(hex) {
    const n = parseInt(hex.slice(1), 16);
    return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  }

  function drawDecor(d) {
    const def = DECOR[d.type];
    const { x, y } = d;
    ctx.save();
    ctx.translate(x, y);
    switch (d.type) {
      case 'rug': {
        ctx.fillStyle = '#c4566b';
        ctx.beginPath(); ctx.ellipse(0, 0, def.w / 2, def.h / 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e88a8a';
        ctx.beginPath(); ctx.ellipse(0, 0, def.w / 2 - 14, def.h / 2 - 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f6d38b';
        ctx.beginPath(); ctx.ellipse(0, 0, def.w / 2 - 34, def.h / 2 - 28, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#7fbf9b';
        ctx.beginPath(); ctx.ellipse(0, 0, def.w / 2 - 60, def.h / 2 - 44, 0, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'plant': {
        ctx.fillStyle = 'rgba(0,0,0,.2)';
        ctx.beginPath(); ctx.ellipse(0, 34, 24, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3d9a52';
        [[-12, -14, 16], [12, -14, 16], [0, -26, 17], [-4, -6, 14], [8, -2, 12]].forEach(([lx, ly, r]) => {
          ctx.beginPath(); ctx.arc(lx, ly, r, 0, Math.PI * 2); ctx.fill();
        });
        ctx.fillStyle = '#5cbf6c';
        ctx.beginPath(); ctx.arc(-6, -22, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#d16d3c';
        ctx.beginPath(); ctx.moveTo(-20, 4); ctx.lineTo(20, 4); ctx.lineTo(15, 36); ctx.lineTo(-15, 36); ctx.fill();
        ctx.fillStyle = '#b4582c'; ctx.fillRect(-21, 4, 42, 7);
        break;
      }
      case 'lamp': {
        ctx.fillStyle = 'rgba(0,0,0,.2)';
        ctx.beginPath(); ctx.ellipse(0, 52, 20, 5, 0, 0, Math.PI * 2); ctx.fill();
        const g = ctx.createRadialGradient(0, -30, 4, 0, -30, 90);
        g.addColorStop(0, 'rgba(255,240,170,.45)'); g.addColorStop(1, 'rgba(255,240,170,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -30, 90, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#5b4636'; ctx.fillRect(-2, -30, 4, 80);
        ctx.fillRect(-14, 48, 28, 5);
        ctx.fillStyle = '#ffd98a';
        ctx.beginPath(); ctx.moveTo(-12, -54); ctx.lineTo(12, -54); ctx.lineTo(20, -26); ctx.lineTo(-20, -26); ctx.fill();
        break;
      }
      case 'beanbag': {
        ctx.fillStyle = 'rgba(0,0,0,.2)';
        ctx.beginPath(); ctx.ellipse(0, 28, 44, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6a8fd6';
        ctx.beginPath(); ctx.ellipse(0, 6, 44, 28, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#86a8ea';
        ctx.beginPath(); ctx.ellipse(-6, -8, 30, 20, -0.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.25)';
        ctx.beginPath(); ctx.ellipse(-14, -16, 10, 5, -0.4, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'fishbowl': {
        ctx.fillStyle = '#7a5235'; ctx.fillRect(-26, 22, 52, 12);
        ctx.fillStyle = 'rgba(150, 210, 255, .55)';
        ctx.beginPath(); ctx.arc(0, -2, 28, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, -2, 28, 0, Math.PI * 2); ctx.stroke();
        const fx = Math.sin(time * 1.3) * 12, dir = Math.cos(time * 1.3) >= 0 ? 1 : -1;
        ctx.fillStyle = '#ff8a12';
        ctx.beginPath(); ctx.ellipse(fx, 2, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(fx - dir * 7, 2); ctx.lineTo(fx - dir * 14, -3); ctx.lineTo(fx - dir * 14, 7); ctx.fill();
        ctx.fillStyle = '#3d9a52'; ctx.fillRect(-14, 10, 3, 14); ctx.fillRect(10, 6, 3, 18);
        break;
      }
      case 'catbed': {
        ctx.fillStyle = 'rgba(0,0,0,.2)';
        ctx.beginPath(); ctx.ellipse(0, 22, 52, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#b36a8f';
        ctx.beginPath(); ctx.ellipse(0, 6, 52, 26, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f2c4d8';
        ctx.beginPath(); ctx.ellipse(0, 4, 40, 18, 0, 0, Math.PI * 2); ctx.fill();
        // sleeping cat
        const breathe = Math.sin(time * 2) * 1.5;
        ctx.fillStyle = '#f0a046';
        ctx.beginPath(); ctx.ellipse(4, 0, 26, 13 + breathe * 0.4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-18, -4, 11, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-26, -10); ctx.lineTo(-24, -20); ctx.lineTo(-18, -13); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-15, -14); ctx.lineTo(-10, -20); ctx.lineTo(-9, -10); ctx.fill();
        ctx.strokeStyle = '#d07e2a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(22, 4, 12, -0.5, 2.2); ctx.stroke();
        ctx.strokeStyle = '#5a3d22'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(-22, -4, 2.5, 0.2, Math.PI - 0.2); ctx.stroke();
        ctx.beginPath(); ctx.arc(-14, -4, 2.5, 0.2, Math.PI - 0.2); ctx.stroke();
        ctx.fillStyle = 'rgba(90,61,34,' + (0.5 + Math.sin(time * 2) * 0.4) + ')';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('z', -6 + Math.sin(time) * 2, -26 - (time * 6) % 8);
        break;
      }
      case 'poster': {
        ctx.fillStyle = '#fff';
        ctx.fillRect(-def.w / 2, -def.h / 2, def.w, def.h);
        ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.strokeRect(-def.w / 2, -def.h / 2, def.w, def.h);
        ['#ff6b6b', '#ff8a12', '#ffcc00', '#2fb344', '#1d6fd8', '#8e44ad'].forEach((c, i) => {
          ctx.strokeStyle = c; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.arc(0, 18, 34 - i * 5, Math.PI, 0); ctx.stroke();
        });
        ctx.fillStyle = '#e35d6a'; ctx.beginPath(); ctx.arc(-def.w / 2 + 6, -def.h / 2 + 6, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(def.w / 2 - 6, -def.h / 2 + 6, 3, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'clock': {
        ctx.fillStyle = '#8a5a35'; ctx.beginPath(); ctx.arc(0, 0, 29, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill();
        const now = new Date();
        const hA = ((now.getHours() % 12) + now.getMinutes() / 60) / 12 * Math.PI * 2;
        const mA = (now.getMinutes() + now.getSeconds() / 60) / 60 * Math.PI * 2;
        ctx.strokeStyle = '#3a2e2a'; ctx.lineCap = 'round';
        ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(hA) * 12, -Math.cos(hA) * 12); ctx.stroke();
        ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(mA) * 18, -Math.cos(mA) * 18); ctx.stroke();
        ctx.lineCap = 'butt';
        break;
      }
      case 'window': {
        const w = def.w, h = def.h;
        ctx.fillStyle = '#fffaf0'; ctx.fillRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12);
        const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
        g.addColorStop(0, '#8ecdf7'); g.addColorStop(1, '#d6f0ff');
        ctx.fillStyle = g; ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.fillStyle = '#fff';
        const cx = ((time * 8) % (w + 60)) - w / 2 - 30;
        ctx.save(); ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.clip();
        [[0, 0, 12], [12, -4, 14], [24, 0, 11]].forEach(([ox, oy, r]) => { ctx.beginPath(); ctx.arc(cx + ox, -18 + oy, r, 0, Math.PI * 2); ctx.fill(); });
        ctx.fillStyle = '#6fbf6a'; ctx.beginPath(); ctx.ellipse(0, h / 2 + 10, w * 0.8, 30, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#fffaf0'; ctx.fillRect(-3, -h / 2, 6, h); ctx.fillRect(-w / 2, -3, w, 6);
        ctx.fillStyle = '#f4b6c2'; ctx.fillRect(-w / 2 - 14, -h / 2 - 10, 16, h + 16); ctx.fillRect(w / 2 - 2, -h / 2 - 10, 16, h + 16);
        break;
      }
      case 'lights': {
        ctx.strokeStyle = '#4a5a3a'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-def.w / 2, -10);
        ctx.quadraticCurveTo(-def.w / 4, 16, 0, -10); ctx.quadraticCurveTo(def.w / 4, 16, def.w / 2, -10); ctx.stroke();
        const cols = ['#ff6b6b', '#ffcc00', '#2fb344', '#8ecdf7', '#ff6fae', '#cdb0f7'];
        for (let i = 0; i <= 12; i++) {
          const t = i / 12;
          const half = t < 0.5 ? t * 2 : (t - 0.5) * 2;
          const px = -def.w / 2 + t * def.w;
          const py = -10 + 4 * half * (1 - half) * 13;
          const on = 0.55 + 0.45 * Math.sin(time * 3 + i * 1.7);
          ctx.globalAlpha = on;
          ctx.fillStyle = cols[i % cols.length];
          ctx.shadowColor = cols[i % cols.length]; ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.ellipse(px, py + 6, 4, 6, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
        break;
      }
    }
    ctx.restore();
  }

  function drawBot(b) {
    const y = b.y + Math.sin(b.bob) * 1.5;
    ctx.save();
    ctx.translate(b.x, y);
    ctx.fillStyle = 'rgba(0,0,0,.2)';
    ctx.beginPath(); ctx.ellipse(0, 16, 20, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e9edf2';
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#9aa6b2'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#2d3a4a';
    rr(-11, -9, 22, 11, 5); ctx.fill();
    ctx.fillStyle = '#7ff0c0';
    ctx.beginPath(); ctx.arc(-4 + b.face * 2, -4, 2.5, 0, Math.PI * 2); ctx.arc(4 + b.face * 2, -4, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#9aa6b2';
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(0, -26); ctx.stroke();
    ctx.fillStyle = '#ff6b6b'; ctx.beginPath(); ctx.arc(0, -27, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    b.carry.forEach((c, i) => drawCrayon(b.x + b.face * 8 + i * 3, y + 6 - i * 3, 0.3 * b.face, c.c));
  }

  function draw() {
    const cw = canvas.width, ch = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#2b2233';
    ctx.fillRect(0, 0, cw, ch);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offX, dpr * offY);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();

    drawRoom();
    state.decor.filter(d => DECOR[d.type].wall).forEach(drawDecor);
    drawShelves();
    state.decor.filter(d => DECOR[d.type].under).forEach(drawDecor);

    // What shade should glow?
    let glowShade = null;
    if (hand.length && state.upgrades.glow >= 1) glowShade = hand[0].c;
    else if (!hand.length && state.upgrades.glow >= 2 && hovered) glowShade = hovered.c;

    // crayons: cached layer, then anything still falling, then highlighted shade on top
    if (crayonsDirty) renderCrayonLayer();
    ctx.drawImage(layerCanvas, 0, 0, W, H);
    for (const c of state.crayons) {
      if (settled(c) || c.drop > 0) continue;
      drawCrayon(c.x, c.y - (1 - c.fall) * (1 - c.fall) * 160, c.a, c.c);
    }
    if (glowShade !== null) {
      for (const c of state.crayons) if (c.c === glowShade && settled(c)) drawCrayon(c.x, c.y, c.a, c.c, true);
    }

    // Floor decor and boxes, sorted by y so things overlap naturally
    const things = [];
    state.decor.forEach(d => { const def = DECOR[d.type]; if (!def.wall && !def.under) things.push({ y: d.y + def.h / 2, f: () => drawDecor(d) }); });
    state.boxes.forEach(b => things.push({ y: b.y + BH / 2, f: () => drawBox(b, glowShade !== null && b.color === glowShade) }));
    things.sort((a, b) => a.y - b.y);
    things.forEach(t => t.f());

    bots.forEach(drawBot);

    // edit selection
    if (editMode && selected) {
      const o = selected.obj;
      const w = selected.kind === 'box' ? BW : DECOR[o.type].w;
      const h = selected.kind === 'box' ? BH : DECOR[o.type].h;
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = '#ff7a59'; ctx.lineWidth = 3;
      ctx.strokeRect(o.x - w / 2 - 6, o.y - h / 2 - 6, w + 12, h + 12);
      ctx.setLineDash([]);
    }

    // held crayons follow the cursor in a little fan
    if (hand.length) {
      hand.forEach((c, i) => {
        const off = i - (hand.length - 1) / 2;
        drawCrayon(mouse.x + off * 4, mouse.y + 6 + Math.abs(off) * 1.2, -1.2 + off * 0.08, c.c);
      });
      ctx.fillStyle = 'rgba(40,30,30,.85)';
      rr(mouse.x + 14, mouse.y - 34, 26, 18, 9); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(hand.length, mouse.x + 27, mouse.y - 25);
    }

    // sparks & floating text
    sparks.forEach(s => {
      ctx.globalAlpha = Math.max(0, 1 - s.t / 0.7);
      ctx.fillStyle = s.col;
      ctx.beginPath(); ctx.arc(s.x, s.y, 3.5, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.font = 'bold 18px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    floaters.forEach(f => {
      ctx.globalAlpha = Math.max(0, 1 - f.t / 1.2);
      ctx.strokeStyle = 'rgba(80,50,20,.8)'; ctx.lineWidth = 4;
      ctx.strokeText('🪙' + f.text, f.x, f.y - f.t * 40);
      ctx.fillStyle = '#ffe066';
      ctx.fillText('🪙' + f.text, f.x, f.y - f.t * 40);
    });
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Update loop
  // ---------------------------------------------------------------------------
  let last = performance.now();
  let saveT = 0;
  let hudT = 0;

  function update(dt) {
    time += dt;
    // falling crayons from a new delivery
    for (const c of state.crayons) {
      if (c.drop > 0) { c.drop -= dt; continue; }
      if (c.fall !== undefined) { c.fall += dt * 2.2; if (c.fall >= 1) { delete c.fall; touch(); } }
    }
    state.boxes.forEach(b => {
      if (b.shake > 0) b.shake -= dt;
      if (b.bump > 0) b.bump -= dt;
    });
    floaters.forEach(f => { f.t += dt; });
    floaters = floaters.filter(f => f.t < 1.2);
    sparks.forEach(s => { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 300 * dt; });
    sparks = sparks.filter(s => s.t < 0.7);

    syncBots();
    bots.forEach(b => updateBot(b, dt));

    // passive shelf income
    state.coins += shelfIncome() * dt;

    // deliveries
    state.deliveryT -= dt;
    if (state.deliveryT <= 0) {
      state.deliveryT = deliveryInterval(state.upgrades.delivery);
      if (state.crayons.length < maxFloor() - 20) deliverPile();
    }

    saveT += dt;
    if (saveT > 5) { saveT = 0; save(); }
    hudT += dt;
    if (hudT > 0.2) { hudT = 0; updateHud(); }
  }

  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------------------
  // HUD
  // ---------------------------------------------------------------------------
  const $ = id => document.getElementById(id);
  function updateHud() {
    $('coins').textContent = '🪙 ' + fmt(state.coins);
    $('shopCoins').textContent = '🪙 ' + fmt(state.coins);
    const inc = shelfIncome();
    $('income').textContent = `Shelves +${inc < 10 ? inc.toFixed(1) : fmt(inc)}/s`;
    $('cozy').textContent = `Cozy +${cozyPct()}%`;
    $('floorCount').textContent = `${state.crayons.length} crayons to sort`;
    $('delivery').textContent = state.crayons.length >= maxFloor() - 20 ? 'Floor is full!' : `Next pile in ${Math.ceil(state.deliveryT)}s`;
    $('btnDeliver').disabled = state.crayons.length > 300;
    if (!$('shop').hidden) refreshShopButtons();
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------
  let hovered = null;
  const tooltip = $('tooltip');

  function toWorld(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left - offX) / scale, y: (e.clientY - r.top - offY) / scale, sx: e.clientX - r.left, sy: e.clientY - r.top };
  }

  function editItemAt(x, y) {
    // boxes first (they sit on top), then floor decor, then wall decor, then rugs
    const b = boxAt(x, y);
    if (b) return { kind: 'box', obj: b };
    const order = [...state.decor].sort((a, b) => layer(b) - layer(a));
    for (const d of order) {
      const def = DECOR[d.type];
      if (Math.abs(x - d.x) <= def.w / 2 && Math.abs(y - d.y) <= def.h / 2) return { kind: 'decor', obj: d };
    }
    return null;
  }
  const layer = d => DECOR[d.type].under ? 0 : DECOR[d.type].wall ? 1 : 2;

  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId);
    const p = toWorld(e);
    mouse.x = p.x; mouse.y = p.y;
    if (editMode) {
      const it = editItemAt(p.x, p.y);
      selectItem(it);
      if (it) dragOff = { dx: it.obj.x - p.x, dy: it.obj.y - p.y };
      return;
    }
    if (hand.length) {
      pressed = { x: p.x, y: p.y, mode: 'drop' };
      return;
    }
    const box = boxAt(p.x, p.y);
    if (box && box.count >= capacity() && !state.upgrades.autoPack) { packBox(box); return; }
    const c = crayonAt(p.x, p.y);
    if (c) {
      pickUp(c);
      pressed = { x: p.x, y: p.y, mode: 'grab' };
    }
  });

  canvas.addEventListener('pointermove', e => {
    const p = toWorld(e);
    mouse.x = p.x; mouse.y = p.y;
    if (editMode && selected && dragOff) {
      moveItem(selected, p.x + dragOff.dx, p.y + dragOff.dy);
      return;
    }
    // hover tooltip
    hovered = (!hand.length && !editMode) ? crayonAt(p.x, p.y) : null;
    if (hovered) {
      const s = SHADES[hovered.c];
      tooltip.innerHTML = `<span class="sw" style="background:${s.hex}"></span>${s.name}`;
      tooltip.style.left = p.sx + 'px';
      tooltip.style.top = p.sy + 'px';
      tooltip.hidden = false;
    } else tooltip.hidden = true;
    const box = boxAt(p.x, p.y);
    canvas.style.cursor = editMode ? (editItemAt(p.x, p.y) ? 'move' : 'default')
      : hand.length ? 'grabbing' : (hovered || (box && box.count >= capacity())) ? 'pointer' : 'default';
  });

  canvas.addEventListener('pointerleave', () => { tooltip.hidden = true; hovered = null; });

  canvas.addEventListener('pointerup', e => {
    const p = toWorld(e);
    if (editMode) {
      if (selected && dragOff) finishMove(selected);
      dragOff = null;
      return;
    }
    if (!pressed || !hand.length) { pressed = null; return; }
    const moved = Math.hypot(p.x - pressed.x, p.y - pressed.y) > 12;
    if (pressed.mode === 'grab' && !moved) { pressed = null; return; } // click to pick up, keep holding
    // Either a drag ended or a second click happened: deposit or drop
    if (!tryDeposit(p.x, p.y)) dropHandOnFloor(p.x, p.y);
    pressed = null;
  });

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (hand.length) dropHandOnFloor(mouse.x, mouse.y);
      document.querySelectorAll('.modal').forEach(m => { m.hidden = true; });
    }
  });

  // ---------------------------------------------------------------------------
  // Move mode
  // ---------------------------------------------------------------------------
  function setEditMode(on) {
    editMode = on;
    if (on && hand.length) dropHandOnFloor(mouse.x, mouse.y);
    $('btnEdit').classList.toggle('active', on);
    $('btnEdit').textContent = on ? '✋ Moving…' : '✋ Move';
    if (!on) selectItem(null);
    $('editPanel').hidden = !on;
    if (on) selectItem(selected);
  }

  function selectItem(it) {
    selected = it;
    const name = !it ? 'Drag a box or decoration to move it'
      : it.kind === 'box' ? `${SHADES[it.obj.color].name} box` : DECOR[it.obj.type].name;
    $('editName').textContent = name;
    $('btnRecolor').hidden = !(it && it.kind === 'box');
    $('btnRecolor').disabled = !(it && it.kind === 'box' && it.obj.count === 0);
    $('btnRecolor').title = it && it.kind === 'box' && it.obj.count > 0 ? 'Empty or pack the box first' : '';
    $('btnPutAway').hidden = !(it && it.kind === 'decor');
  }

  function moveItem(it, x, y) {
    const o = it.obj;
    if (it.kind === 'box') {
      o.x = clamp(x, BW / 2 + 6, W - BW / 2 - 6);
      o.y = clamp(y, WALL + BH / 2 + 20, H - BH / 2 - 6);
    } else {
      const def = DECOR[o.type];
      o.x = clamp(x, def.w / 2 + 4, W - def.w / 2 - 4);
      o.y = def.wall ? clamp(y, def.h / 2 + 4, WALL - def.h / 2 - 6) : clamp(y, WALL + def.h / 2 + 4, H - def.h / 2 - 4);
    }
  }

  function finishMove(it) {
    const o = it.obj;
    if (it.kind === 'box') pushCrayonsOutOf(o.x, o.y, BW, BH);
    else if (!DECOR[o.type].wall && !DECOR[o.type].under) pushCrayonsOutOf(o.x, o.y, DECOR[o.type].w, DECOR[o.type].h);
    save();
  }

  $('btnEdit').onclick = () => setEditMode(!editMode);
  $('btnDoneEdit').onclick = () => setEditMode(false);
  $('btnRecolor').onclick = () => {
    if (selected && selected.kind === 'box') openPicker(selected.obj);
  };
  $('btnPutAway').onclick = () => {
    if (!selected || selected.kind !== 'decor') return;
    const d = selected.obj;
    state.decor = state.decor.filter(x => x !== d);
    state.coins += Math.floor(DECOR[d.type].price / 2);
    toast(`Put away the ${DECOR[d.type].name}.`);
    selectItem(null);
    save();
  };

  // ---------------------------------------------------------------------------
  // Shop
  // ---------------------------------------------------------------------------
  let shopTab = 'storage';
  let shopButtons = [];

  function shopItems() {
    const items = [];
    if (shopTab === 'storage') {
      items.push({
        icon: '📦', name: 'Sorting Box', price: boxCost(),
        desc: `Holds ${capacity()} crayons of one shade. Pick which shade after you buy it.`,
        buy: () => openPicker(null),
      });
      items.push({
        icon: '🪵', name: 'Shelf', price: shelfCost(), soldOut: state.shelves.length >= SHELF_SLOTS,
        level: `${state.shelves.length}/${SHELF_SLOTS}`,
        desc: `Holds ${SHELF_CAP} packed boxes. Every packed box on a shelf earns coins over time.`,
        buy: () => {
          const used = new Set(state.shelves.map(s => s.slot));
          const order = [1, 4, 2, 3, 0, 5];
          const slot = order.find(s => !used.has(s));
          state.shelves.push({ slot, packed: [] });
          toast('New shelf hung on the wall!');
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
            if (u.id === 'bots') toast('Sortbot activated! Beep boop.');
            if (u.id === 'autoPack') state.boxes.forEach(b => { if (b.count >= capacity()) packBox(b); });
          },
        });
      });
    } else if (shopTab === 'decor') {
      Object.entries(DECOR).forEach(([type, def]) => {
        const n = state.decor.filter(d => d.type === type).length;
        items.push({
          icon: { plant: '🪴', rug: '🟣', lamp: '💡', beanbag: '🛋️', fishbowl: '🐟', catbed: '🐈', poster: '🌈', clock: '🕰️', window: '🪟', lights: '✨' }[type],
          name: def.name, price: def.price, level: n ? `${n} owned` : '',
          desc: `+${def.cozy}% cozy (boosts all coins). ${def.wall ? 'Hangs on the wall.' : 'Sits on the floor.'}`,
          buy: () => {
            const spot = freeSpot(def.w, def.h, def.wall);
            const d = { id: uid++, type, x: spot.x, y: spot.y };
            state.decor.push(d);
            if (!def.wall && !def.under) pushCrayonsOutOf(d.x, d.y, def.w, def.h);
            toast(`${def.name} placed! Use ✋ Move to put it where you like.`);
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
      const sw = it.swatches ? `<div class="swatches">${it.swatches.map(c => `<span style="background:${c}"></span>`).join('')}</div>` : '';
      el.innerHTML = `<h3><span>${it.icon}</span>${it.name}<span class="lvl">${it.level || ''}</span></h3>${sw}<p>${it.desc}</p>`;
      const btn = document.createElement('button');
      btn.className = 'primary';
      if (it.soldOut) { btn.textContent = it.level === 'Unlocked' ? 'Unlocked' : 'Maxed'; btn.disabled = true; btn.className = ''; }
      else btn.textContent = `Buy · 🪙 ${fmt(it.price)}`;
      btn.onclick = () => {
        if (it.soldOut || it.locked || state.coins < it.price) return;
        // Sorting boxes are paid for after picking a shade
        if (it.name === 'Sorting Box') { it.buy(); return; }
        state.coins -= it.price;
        it.buy();
        blip(880, 0.1, 'triangle', 0.06);
        save();
        renderShop();
        updateHud();
      };
      el.appendChild(btn);
      list.appendChild(el);
      shopButtons.push({ btn, it });
    });
    refreshShopButtons();
  }

  function refreshShopButtons() {
    shopButtons.forEach(({ btn, it }) => {
      if (it.soldOut) return;
      btn.disabled = it.locked || state.coins < it.price;
    });
  }

  $('btnShop').onclick = () => {
    if (editMode) setEditMode(false);
    $('shop').hidden = false;
    renderShop();
    updateHud();
  };
  document.querySelectorAll('.tabs button').forEach(b => {
    b.onclick = () => { shopTab = b.dataset.tab; renderShop(); };
  });
  document.querySelectorAll('[data-close]').forEach(b => {
    b.onclick = () => { $(b.dataset.close).hidden = true; };
  });
  document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('pointerdown', e => { if (e.target === m) m.hidden = true; });
  });

  // Shade picker, used for buying a new box (box = null) or recoloring one
  function openPicker(box) {
    $('pickerTitle').textContent = box ? 'Change this box to which shade?' : `New box (🪙 ${fmt(boxCost())}): which shade?`;
    const list = $('pickerList');
    list.innerHTML = '';
    const counts = {};
    state.crayons.forEach(c => { counts[c.c] = (counts[c.c] || 0) + 1; });
    // Shades without a box come first, since those are the ones piling up
    allShades().sort((a, b) => (state.boxes.some(x => x.color === a) - state.boxes.some(x => x.color === b)) || a - b).forEach(i => {
      const s = SHADES[i];
      const boxes = state.boxes.filter(b => b.color === i).length;
      const btn = document.createElement('button');
      btn.innerHTML = `<span class="sw" style="background:${s.hex}"></span><span>${s.name}<small>${counts[i] || 0} on floor · ${boxes} box${boxes === 1 ? '' : 'es'}</small></span>`;
      btn.onclick = () => {
        if (box) {
          box.color = i;
          selectItem(selected);
        } else {
          const cost = boxCost();
          if (state.coins < cost) { toast('Not enough coins!'); return; }
          state.coins -= cost;
          state.extraBoxesBought++;
          const spot = freeSpot(BW, BH, false);
          state.boxes.push({ id: uid++, x: spot.x, y: spot.y, color: i, count: 0 });
          pushCrayonsOutOf(spot.x, spot.y, BW, BH);
          blip(880, 0.1, 'triangle', 0.06);
          toast(`New ${s.name} box added! Use ✋ Move to place it.`);
          if (!$('shop').hidden) renderShop();
        }
        $('picker').hidden = true;
        save();
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
    if (state.crayons.length > 300) return;
    if (deliverPile()) state.deliveryT = deliveryInterval(state.upgrades.delivery);
  };
  $('btnSound').onclick = () => {
    muted = !muted;
    $('btnSound').textContent = muted ? '🔇' : '🔊';
  };
  $('btnHelp').onclick = () => { $('help').hidden = false; };
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
    hand = []; bots = []; selected = null;
    newGame();
    touch();
    $('help').hidden = true;
    save();
  };
  window.addEventListener('resize', resize);
  window.addEventListener('beforeunload', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

  // ---------------------------------------------------------------------------
  // Start
  // ---------------------------------------------------------------------------
  load();
  resize();
  updateHud();
  if (!state.seenHelp) { $('help').hidden = false; state.seenHelp = true; }
  requestAnimationFrame(frame);

  // Exposed for debugging in the console
  window.craySorting = { get state() { return state; }, SHADES, save };
})();
