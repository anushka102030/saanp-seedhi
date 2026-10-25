(() => {
  'use strict';

  /* ---------- helpers ---------- */
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const shuffle = arr => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const clean = s => String(s).replace(/[<>&"]/g, '').trim();
  const HI_DIGITS = '०१२३४५६७८९';
  const num = n => settings.digits === 'hi' ? String(n).replace(/\d/g, d => HI_DIGITS[d]) : String(n);
  const NUM_WORDS = ['', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह'];

  /* ---------- board layout ---------- */
  const SNAKES = { 17: 7, 54: 34, 62: 19, 64: 60, 87: 36, 93: 73, 95: 75, 98: 79 };
  const LADDERS = { 4: 14, 9: 31, 20: 38, 28: 84, 40: 59, 51: 67, 63: 81, 71: 91 };
  const DECOR = { 2: '🪔', 12: '🥭', 25: '🪁', 33: '🐘', 45: '🛺', 57: '🪷', 69: '🦚', 77: '🥥', 83: '🐫', 90: '🍵', 46: '🥁', 15: '🌶️', 99: '🎉' };
  const CELL_COLORS = ['#ffadad', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#bdb2ff', '#ffc6ff'];
  const SNAKE_COLORS = [
    ['#2a9d8f', '#e9c46a'], ['#e63946', '#ffb703'], ['#8338ec', '#3a86ff'], ['#06d6a0', '#118ab2'],
    ['#f77f00', '#fcbf49'], ['#ef476f', '#ffd166'], ['#588157', '#c5e1a5'], ['#9d4edd', '#ff9e00'],
  ];

  const AVATARS = ['🐯', '🦚', '🐘', '🐒', '🐫', '🦁', '🐢', '🦜', '🐄', '🐍'];
  const COLORS = ['#ff4d6d', '#00b4d8', '#ffb703', '#8338ec'];
  const DEFAULT_NAMES = ['खिलाड़ी १', 'खिलाड़ी २', 'खिलाड़ी ३', 'खिलाड़ी ४'];

  const MODES = [
    { id: 'dice-first', t: '🎲 ➜ ❓ पहले पासा', d: 'पासा फेंको, फिर सही जवाब दो — तभी गोटी चलेगी।' },
    { id: 'q-first', t: '❓ ➜ 🎲 पहले प्रश्न', d: 'सही जवाब दोगे तभी पासा फेंकने को मिलेगा।' },
    { id: 'free', t: '🎲 सिर्फ़ खेल', d: 'बिना प्रश्नों वाला सादा साँप-सीढ़ी।' },
  ];
  const TOGGLES = [
    { k: 'autoMove', t: '🤖 गोटी अपने-आप चले', d: 'बंद करने पर पासे के बाद अपनी गोटी ख़ुद पकड़कर खिसकानी होगी।' },
    { k: 'snakeQ', t: '🐍 साँप से बचने का मौका', d: 'साँप के मुँह पर पहुँचे तो एक सवाल — सही जवाब = साँप से बचाव!' },
    { k: 'ladderQ', t: '🪜 सीढ़ी के लिए भी सवाल', d: 'सीढ़ी चढ़ने से पहले भी सही जवाब देना होगा।' },
    { k: 'extraSix', t: '6️⃣ छह पर एक और बारी', d: 'पासे पर ६ आए तो फिर से खेलो।' },
  ];
  const TYPE_LABEL = {
    mcq: '🔘 सही विकल्प चुनो',
    tf: '✅ सही या ❌ गलत',
    sort: '🧺 सही टोकरी में डालो',
    match: '🔗 जोड़ी मिलाओ',
    order: '🔢 सही क्रम लगाओ',
  };
  const PRAISE = ['🎉 शाबाश! बिल्कुल सही!', '🌟 वाह! क्या बात है!', '👏 एकदम सही जवाब!', '🥳 कमाल कर दिया!', '💯 बहुत बढ़िया!'];
  const OOPS = ['😅 अरे! यह सही नहीं है।', '🙈 ओहो! इस बार नहीं।', '🤔 क़रीब थे, पर सही नहीं।', '😬 उफ़! अगली बार पक्का!'];

  /* ---------- state ---------- */
  const STORE = 'saanp-seedhi-v1';
  const DEFAULT_SETTINGS = { mode: 'dice-first', autoMove: true, snakeQ: true, ladderQ: false, extraSix: true, level: 'all', digits: 'hi', sound: true };
  let settings = { ...DEFAULT_SETTINGS };
  let game = null;
  let busy = false;

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE));
      if (s) {
        settings = { ...DEFAULT_SETTINGS, ...s.settings };
        game = s.game || null;
      }
    } catch (e) { /* storage unavailable */ }
  }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify({ settings, game })); } catch (e) { /* ignore */ }
  }
  const cur = () => game.players[game.turn];
  const startPhase = () => settings.mode === 'q-first' ? 'ask' : 'roll';
  const asksQuestions = () => settings.mode !== 'free';

  /* ---------- sound ---------- */
  let AC = null;
  function tone(f, d = 0.12, type = 'sine', delay = 0, vol = 0.12, slideTo) {
    if (!settings.sound) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      const t = AC.currentTime + delay;
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + d);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g).connect(AC.destination);
      o.start(t);
      o.stop(t + d + 0.02);
    } catch (e) { /* no audio */ }
  }
  const sfx = {
    tick: () => tone(500 + Math.random() * 400, 0.04, 'square', 0, 0.03),
    step: () => tone(520, 0.07, 'triangle', 0, 0.08),
    pop: () => tone(880, 0.06, 'sine', 0, 0.08),
    right: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', i * 0.09)),
    wrong: () => { tone(300, 0.2, 'sawtooth', 0, 0.05, 180); tone(200, 0.3, 'sawtooth', 0.18, 0.05, 120); },
    hiss: () => tone(1400, 0.45, 'sawtooth', 0, 0.02, 900),
    slide: () => tone(700, 0.9, 'triangle', 0, 0.1, 120),
    climb: () => tone(300, 0.8, 'triangle', 0, 0.1, 1100),
    win: () => [523, 523, 784, 784, 880, 880, 784].forEach((f, i) => tone(f, 0.22, 'triangle', i * 0.18)),
  };

  /* ---------- confetti ---------- */
  const cv = $('#confetti'), cx = cv.getContext('2d');
  const CONF = ['#ff4d6d', '#ffb703', '#06d6a0', '#3a86ff', '#8338ec', '#ff9933', '#138808'];
  let parts = [], raf = null;
  function burst(n) {
    const dpr = window.devicePixelRatio || 1;
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (let i = 0; i < n; i++) {
      parts.push({
        x: innerWidth / 2 + (Math.random() - 0.5) * 240, y: innerHeight * 0.35,
        vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 13 - 4,
        s: 5 + Math.random() * 7, c: pick(CONF), r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
        life: 110 + Math.random() * 70,
      });
    }
    if (!raf) raf = requestAnimationFrame(tickConfetti);
  }
  function tickConfetti() {
    cx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life--;
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r);
      cx.fillStyle = p.c; cx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      cx.restore();
    }
    parts = parts.filter(p => p.life > 0 && p.y < innerHeight + 30);
    if (parts.length) raf = requestAnimationFrame(tickConfetti);
    else { cx.clearRect(0, 0, innerWidth, innerHeight); raf = null; }
  }

  /* ---------- board ---------- */
  function cellXY(n) {
    const r = Math.floor((n - 1) / 10), c0 = (n - 1) % 10;
    const c = r % 2 === 0 ? c0 : 9 - c0;
    return { x: c * 10 + 5, y: (9 - r) * 10 + 5 };
  }
  function cellAt(x, y) {
    if (y > 100) return 0;
    x = Math.min(99.9, Math.max(0, x));
    y = Math.max(0, y);
    const c = Math.floor(x / 10), r = 9 - Math.floor(y / 10);
    return r * 10 + (r % 2 === 0 ? c + 1 : 10 - c);
  }

  function buildBoard() {
    const cells = $('#cells');
    cells.innerHTML = '';
    for (let row = 9; row >= 0; row--) {
      for (let col = 0; col < 10; col++) {
        const n = row * 10 + (row % 2 === 0 ? col + 1 : 10 - col);
        const d = el('div', 'cell');
        d.dataset.n = n;
        d.style.setProperty('--c', CELL_COLORS[(row + col) % CELL_COLORS.length]);
        let decor = DECOR[n] || '';
        if (n === 100) { d.classList.add('home'); decor = '👑'; }
        if (n === 1) d.classList.add('start-cell');
        d.innerHTML = `<span class="cn">${num(n)}</span>${decor ? `<span class="decor">${decor}</span>` : ''}`;
        cells.appendChild(d);
      }
    }
    drawArt();
  }

  function drawArt() {
    let s = '<defs><filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0.35" dy="0.6" stdDeviation="0.35" flood-opacity="0.35"/></filter></defs>';
    for (const [b, t] of Object.entries(LADDERS)) s += ladderSVG(cellXY(+b), cellXY(t));
    Object.entries(SNAKES).forEach(([h, t], i) => { s += snakeSVG(cellXY(+h), cellXY(t), SNAKE_COLORS[i % SNAKE_COLORS.length]); });
    $('#art').innerHTML = s;
  }

  const f2 = v => v.toFixed(2);
  function ladderSVG(B, T) {
    const dx = T.x - B.x, dy = T.y - B.y, L = Math.hypot(dx, dy);
    const ux = dx / L, uy = dy / L, px = -uy * 1.8, py = ux * 1.8;
    const b = { x: B.x - ux * 2, y: B.y - uy * 2 }, t = { x: T.x + ux * 2, y: T.y + uy * 2 };
    const n = Math.max(3, Math.floor((L + 4) / 3.4));
    let g = '<g filter="url(#sh)" stroke-linecap="round">';
    for (let k = 1; k < n; k++) {
      const f = k / n, mx = b.x + (t.x - b.x) * f, my = b.y + (t.y - b.y) * f;
      g += `<line x1="${f2(mx + px)}" y1="${f2(my + py)}" x2="${f2(mx - px)}" y2="${f2(my - py)}" stroke="#e9a35b" stroke-width="0.85"/>`;
    }
    for (const sg of [1, -1]) {
      const a = `x1="${f2(b.x + px * sg)}" y1="${f2(b.y + py * sg)}" x2="${f2(t.x + px * sg)}" y2="${f2(t.y + py * sg)}"`;
      g += `<line ${a} stroke="#8d5524" stroke-width="1.15"/><line ${a} stroke="#c68642" stroke-width="0.45"/>`;
    }
    return g + '</g>';
  }

  function snakeSVG(H, T, [c1, c2]) {
    const dx = T.x - H.x, dy = T.y - H.y, L = Math.hypot(dx, dy);
    const px = -dy / L, py = dx / L;
    const waves = Math.max(1, Math.round(L / 15));
    const amp = Math.min(3.4, 1.6 + L / 22);
    const pt = t => {
      const off = amp * Math.sin(Math.PI * 2 * waves * t) * Math.min(1, 5 * t, 5 * (1 - t));
      return { x: H.x + dx * t + px * off, y: H.y + dy * t + py * off };
    };
    const N = Math.ceil(L * 2.6);
    let g = '<g filter="url(#sh)">';
    for (let k = N; k >= 0; k--) {
      const t = k / N, p = pt(t), r = 0.5 + (1 - t) * 1.55;
      g += `<circle cx="${f2(p.x)}" cy="${f2(p.y)}" r="${f2(r)}" fill="${Math.floor(k / 3) % 2 ? c2 : c1}"/>`;
    }
    // head
    const p1 = pt(0.04);
    let hx = H.x - p1.x, hy = H.y - p1.y;
    const hl = Math.hypot(hx, hy) || 1; hx /= hl; hy /= hl;
    const qx = -hy, qy = hx;
    const deg = Math.atan2(hy, hx) * 180 / Math.PI;
    const tip = { x: H.x + hx * 3.9, y: H.y + hy * 3.9 };
    g += `<path d="M${f2(H.x + hx * 2.2)} ${f2(H.y + hy * 2.2)} L${f2(tip.x)} ${f2(tip.y)} M${f2(tip.x)} ${f2(tip.y)} l${f2(hx * 0.8 + qx * 0.6)} ${f2(hy * 0.8 + qy * 0.6)} M${f2(tip.x)} ${f2(tip.y)} l${f2(hx * 0.8 - qx * 0.6)} ${f2(hy * 0.8 - qy * 0.6)}" stroke="#e5383b" stroke-width="0.35" fill="none" stroke-linecap="round"/>`;
    g += `<ellipse cx="${f2(H.x)}" cy="${f2(H.y)}" rx="3" ry="2.4" transform="rotate(${f2(deg)} ${f2(H.x)} ${f2(H.y)})" fill="${c1}" stroke="rgba(0,0,0,.25)" stroke-width="0.25"/>`;
    for (const sg of [1, -1]) {
      const ex = H.x + hx * 0.7 + qx * 1.15 * sg, ey = H.y + hy * 0.7 + qy * 1.15 * sg;
      g += `<circle cx="${f2(ex)}" cy="${f2(ey)}" r="0.75" fill="#fff"/><circle cx="${f2(ex + hx * 0.25)}" cy="${f2(ey + hy * 0.25)}" r="0.38" fill="#111"/>`;
    }
    return g + '</g>';
  }

  /* ---------- pawns ---------- */
  function pawnXY(i) {
    const p = game.players[i];
    if (p.pos <= 0) return { x: 6 + i * 9, y: 'calc(104.5% + 14px)' };
    const c = cellXY(p.pos);
    const same = game.players.map((q, j) => j).filter(j => game.players[j].pos === p.pos);
    if (same.length < 2) return c;
    const off = [[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]][same.indexOf(i)];
    return { x: c.x + off[0], y: c.y + off[1] };
  }

  function renderPawns() {
    const layer = $('#pawns');
    game.players.forEach((p, i) => {
      let d = layer.querySelector(`[data-i="${i}"]`);
      if (!d) {
        d = el('div', 'pawn', p.avatar);
        d.dataset.i = i;
        d.style.background = p.color;
        d.title = p.name;
        layer.appendChild(d);
        attachPawnDrag(d, i);
      }
      if (d.classList.contains('dragging')) return;
      const pos = pawnXY(i);
      d.style.left = pos.x + '%';
      d.style.top = typeof pos.y === 'number' ? pos.y + '%' : pos.y;
      d.classList.toggle('current', i === game.turn && !game.over);
    });
  }

  function attachPawnDrag(d, i) {
    d.addEventListener('pointerdown', e => {
      if (busy || modalOpen()) return;
      e.preventDefault();
      d.setPointerCapture(e.pointerId);
      const rect = $('#board').getBoundingClientRect();
      const sx = e.clientX, sy = e.clientY;
      let moved = false;
      const rel = ev => ({ x: (ev.clientX - rect.left) / rect.width * 100, y: (ev.clientY - rect.top) / rect.height * 100 });
      const move = ev => {
        if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
        moved = true;
        d.classList.add('dragging');
        const r = rel(ev);
        d.style.left = r.x + '%';
        d.style.top = r.y + '%';
      };
      const up = ev => {
        d.removeEventListener('pointermove', move);
        d.removeEventListener('pointerup', up);
        d.removeEventListener('pointercancel', up);
        d.classList.remove('dragging');
        if (!moved) { renderPawns(); return; }
        const r = rel(ev);
        if (r.x < -6 || r.x > 106 || r.y < -6 || r.y > 118) { renderPawns(); return; }
        onPawnDrop(i, cellAt(r.x, r.y));
      };
      d.addEventListener('pointermove', move);
      d.addEventListener('pointerup', up);
      d.addEventListener('pointercancel', up);
    });
  }

  async function onPawnDrop(i, n) {
    const p = game.players[i];
    p.pos = n;
    sfx.step();
    if (game.phase === 'move' && i === game.turn) {
      renderPawns();
      await afterMove();
    } else {
      renderPawns();
      save();
      say(`✋ ${p.avatar} ${p.name} की गोटी ${n ? 'खाना ' + num(n) + ' पर' : 'शुरुआत पर'} रख दी गई।`);
    }
  }

  function showTarget(n) { $$('.cell.target').forEach(c => c.classList.remove('target')); const c = $(`.cell[data-n="${n}"]`); if (c) c.classList.add('target'); }
  function clearTarget() { $$('.cell.target').forEach(c => c.classList.remove('target')); }

  async function walk(p, to) {
    while (p.pos < to) {
      p.pos++;
      renderPawns();
      sfx.step();
      await sleep(230);
    }
  }
  async function slide(p, to) {
    const d = $(`#pawns [data-i="${game.players.indexOf(p)}"]`);
    if (d) d.classList.add('slide');
    p.pos = to;
    renderPawns();
    await sleep(950);
    if (d) d.classList.remove('slide');
  }

  /* ---------- dice ---------- */
  const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
  function drawDice(v) {
    $('#dice').innerHTML = Array.from({ length: 9 }, (_, k) => `<i class="${PIPS[v].includes(k + 1) ? 'on' : ''}"></i>`).join('');
  }
  async function rollDice() {
    const d = $('#dice');
    d.classList.add('rolling');
    $('#diceWord').textContent = '';
    let v = 1;
    for (let k = 0; k < 11; k++) {
      v = 1 + Math.floor(Math.random() * 6);
      drawDice(v);
      sfx.tick();
      await sleep(65);
    }
    d.classList.remove('rolling');
    drawDice(v);
    $('#diceWord').textContent = `${num(v)} — ${NUM_WORDS[v]}`;
    return v;
  }

  /* ---------- UI rendering ---------- */
  function say(html, append = false) {
    const m = $('#message');
    m.innerHTML = append && m.innerHTML ? m.innerHTML + '<br>' + html : html;
    m.classList.remove('flash');
    void m.offsetWidth;
    m.classList.add('flash');
  }

  function setBusy(b) { busy = b; renderControls(); }

  function renderControls() {
    if (!game) return;
    const p = cur();
    const b = $('#mainBtn');
    const canAct = !busy && !game.over && (game.phase === 'roll' || game.phase === 'ask');
    b.disabled = !canAct;
    b.innerHTML = game.over ? '🏆 खेल ख़त्म' : game.phase === 'ask' ? '❓ प्रश्न लो' : '🎲 पासा फेंको';
    $('#dice').disabled = !(canAct && game.phase === 'roll');
    $('#autoBtn').classList.toggle('hidden', game.phase !== 'move' || busy);
    $('#turnCard').innerHTML = `<div class="tc-avatar" style="background:${p.color}">${p.avatar}</div><div><small>${game.over ? 'विजेता' : 'अब बारी है'}</small><b>${p.name}</b></div>`;
    $('#playerList').innerHTML = game.players.map((q, i) => `
      <li class="${i === game.turn && !game.over ? 'active' : ''}" style="--c:${q.color}">
        <span class="pl-av" style="background:${q.color}">${q.avatar}</span>
        <span class="pl-name">${q.name}</span>
        <span class="pl-meta">खाना <b>${q.pos ? num(q.pos) : '—'}</b><br>✅ ${num(q.correct)}/${num(q.asked)}</span>
      </li>`).join('');
    $('#soundBtn').textContent = settings.sound ? '🔊' : '🔇';
  }

  function renderAll() {
    $('#pawns').innerHTML = '';
    buildBoard();
    renderPawns();
    renderControls();
  }

  /* ---------- turn flow ---------- */
  async function onMain() {
    if (busy || !game || game.over) return;
    const p = cur();
    if (game.phase === 'ask') {
      setBusy(true);
      const ok = await ask({ ribbon: '🎲 पासा फेंकने के लिए सही जवाब दो!' });
      setBusy(false);
      if (ok) {
        game.phase = 'roll';
        say(`👍 शाबाश ${p.name}! अब पासा फेंको 🎲`);
        renderControls();
        save();
      } else {
        say(`😅 ${p.name} की बारी गई।`);
        endTurn(false);
      }
      return;
    }
    if (game.phase !== 'roll') return;
    setBusy(true);
    const v = await rollDice();
    game.lastRoll = v;
    if (p.pos + v > 100) {
      say(`🎲 ${num(v)} आया, पर ${num(100)} तक पहुँचने के लिए ठीक ${num(100 - p.pos)} चाहिए। अगली बारी!`);
      setBusy(false);
      endTurn(false);
      return;
    }
    if (settings.mode === 'dice-first') {
      say(`🎲 ${num(v)} आया! आगे बढ़ने के लिए सवाल का जवाब दो।`);
      const ok = await ask({ ribbon: `🎲 ${num(v)} कदम आगे बढ़ने के लिए सही जवाब दो!` });
      if (!ok) {
        say('इस बार गोटी नहीं चलेगी। 😅');
        setBusy(false);
        endTurn(false);
        return;
      }
    }
    await doMove(v);
  }

  async function doMove(v) {
    const p = cur();
    const target = p.pos + v;
    if (settings.autoMove) {
      say(`${p.avatar} ${num(v)} कदम आगे…`);
      await walk(p, target);
      await afterMove();
    } else {
      game.phase = 'move';
      game.target = target;
      showTarget(target);
      say(`✋ अब ${p.avatar} ${p.name} की गोटी को ${num(v)} कदम आगे — खाना ${num(target)} ⭐ — तक खिसकाओ।`);
      setBusy(false);
      save();
    }
  }

  async function onAuto() {
    if (game.phase !== 'move' || busy) return;
    setBusy(true);
    clearTarget();
    await walk(cur(), game.target);
    await afterMove();
  }

  async function afterMove() {
    game.phase = 'busy';
    clearTarget();
    setBusy(true);
    const p = cur();
    const n = p.pos;
    if (SNAKES[n]) {
      let escaped = false;
      if (asksQuestions() && settings.snakeQ) {
        sfx.hiss();
        say(`🐍 अरे! खाना ${num(n)} पर साँप!`);
        escaped = await ask({ ribbon: '🐍 साँप के मुँह में! बचने के लिए सही जवाब दो!', kind: 'snake' });
      }
      if (escaped) say('🛡️ वाह! साँप से बच गए!');
      else {
        say(`🐍 साँप ने डस लिया! खाना ${num(n)} से ${num(SNAKES[n])} पर फिसल गए।`);
        sfx.slide();
        await slide(p, SNAKES[n]);
      }
    } else if (LADDERS[n]) {
      let climb = true;
      if (asksQuestions() && settings.ladderQ) {
        climb = await ask({ ribbon: '🪜 सीढ़ी! चढ़ने के लिए सही जवाब दो!', kind: 'ladder' });
      }
      if (climb) {
        say(`🪜 वाह! सीढ़ी चढ़कर खाना ${num(LADDERS[n])} पर पहुँच गए!`);
        sfx.climb();
        await slide(p, LADDERS[n]);
      } else say('🪜 सीढ़ी छूट गई। कोई बात नहीं!');
    } else {
      say(`${p.avatar} ${p.name} अब खाना ${num(n || 0)} पर है।`);
    }
    if (p.pos === 100) { win(p); return; }
    setBusy(false);
    endTurn(settings.extraSix && game.lastRoll === 6);
  }

  function endTurn(extra) {
    if (game.over) return;
    if (extra) say('🎉 ६ आया — एक और बारी!', true);
    else game.turn = (game.turn + 1) % game.players.length;
    game.phase = startPhase();
    game.target = null;
    renderPawns();
    renderControls();
    save();
  }

  function win(p) {
    game.over = true;
    game.phase = 'over';
    busy = false;
    save();
    renderPawns();
    renderControls();
    say(`🏆 ${p.avatar} ${p.name} ${num(100)} पर पहुँच गए!`);
    sfx.win();
    burst(220);
    setTimeout(() => burst(180), 700);
    const ranked = [...game.players].sort((a, b) => b.pos - a.pos);
    const card = openModal('win');
    card.innerHTML = `
      <div class="trophy">🏆</div>
      <h2 class="m-title">${p.avatar} ${p.name} जीत गए!</h2>
      <p>मोक्ष मिल गया! 🎉 सबसे पहले खाना ${num(100)} तक पहुँचे।</p>
      <table class="scores">
        ${ranked.map(q => `<tr><td>${q.avatar} <b>${q.name}</b></td><td>खाना ${num(q.pos)}</td><td>✅ ${num(q.correct)}/${num(q.asked)} सही</td></tr>`).join('')}
      </table>
      <div class="q-actions">
        <button class="big-btn" data-act="again">🔁 फिर से खेलो</button>
        <button class="soft-btn" data-act="setup">⚙️ नया खेल</button>
      </div>`;
    $('[data-act=again]', card).onclick = () => { closeModal(); newGame(game.players.map(q => ({ name: q.name, avatar: q.avatar }))); };
    $('[data-act=setup]', card).onclick = () => openSetup();
  }

  function newGame(players) {
    game = {
      players: players.map((p, i) => ({ name: p.name, avatar: p.avatar, color: COLORS[i], pos: 0, correct: 0, asked: 0 })),
      turn: 0,
      phase: startPhase(),
      lastRoll: null,
      target: null,
      deck: [],
      over: false,
    };
    busy = false;
    renderAll();
    drawDice(1);
    $('#diceWord').textContent = '';
    say(`🙏 नमस्ते! ${game.players[0].avatar} ${game.players[0].name} से शुरू करते हैं। ${game.phase === 'ask' ? '“प्रश्न लो” दबाओ!' : 'पासा फेंको! 🎲'}`);
    save();
  }

  /* ---------- questions ---------- */
  const levelOk = q => settings.level === 'all' || String(q.lvl) === settings.level;
  function drawQuestion() {
    if (!game.deck || !game.deck.length) {
      let idx = QUESTIONS.map((q, i) => i).filter(i => levelOk(QUESTIONS[i]));
      if (!idx.length) idx = QUESTIONS.map((q, i) => i);
      game.deck = shuffle(idx);
    }
    return QUESTIONS[game.deck.pop()];
  }

  function ask(ctx = {}) {
    return new Promise(resolve => {
      const q = drawQuestion();
      const p = cur();
      const card = openModal('q-card ' + (ctx.kind || ''));
      card.innerHTML = `
        <div class="q-top"><span class="q-type">${TYPE_LABEL[q.type]}</span><span class="q-lvl" title="कठिनाई">${'⭐'.repeat(q.lvl)}</span></div>
        ${ctx.ribbon ? `<div class="q-ribbon">${ctx.ribbon}</div>` : ''}
        <div class="q-who"><span style="background:${p.color}">${p.avatar}</span> ${p.name} का सवाल</div>
        ${q.img ? `<div class="q-img">${q.img}</div>` : ''}
        <h2 class="q-text">${q.q}</h2>
        <p class="q-en hidden">🔤 ${q.en}</p>
        <div class="q-body"></div>
        <div class="q-result hidden"></div>
        <div class="q-actions">
          <button class="soft-btn" data-act="hint">🔤 English</button>
          <button class="soft-btn" data-act="pass">🤷 पता नहीं</button>
          <button class="big-btn hidden" data-act="check">✔ जाँचो</button>
        </div>`;
      const body = $('.q-body', card);
      let done = false;
      const finish = (ok, revealHTML = '') => {
        if (done) return;
        done = true;
        p.asked++;
        if (ok) { p.correct++; sfx.right(); burst(70); } else sfx.wrong();
        body.classList.add('locked');
        $('.q-actions', card).classList.add('hidden');
        const res = $('.q-result', card);
        res.classList.remove('hidden');
        res.classList.add(ok ? 'good' : 'bad');
        res.innerHTML = `<div class="verdict">${ok ? pick(PRAISE) : pick(OOPS)}</div>${revealHTML}
          ${q.fact ? `<p class="fact">💡 <b>रोचक तथ्य:</b> ${q.fact}</p>` : ''}
          <button class="big-btn" data-act="next">आगे बढ़ो ➜</button>`;
        const next = $('[data-act=next]', res);
        next.onclick = () => { closeModal(); renderControls(); save(); resolve(ok); };
        res.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        next.focus({ preventScroll: true });
      };
      $('[data-act=hint]', card).onclick = () => $('.q-en', card).classList.toggle('hidden');
      const api = RENDER[q.type](q, body, finish, $('[data-act=check]', card));
      $('[data-act=pass]', card).onclick = () => finish(false, api.reveal());
    });
  }

  const answerLine = t => `<p class="answer">सही जवाब: <b>${t}</b></p>`;

  const RENDER = {
    mcq(q, body, finish) {
      body.classList.add('opts');
      const correct = q.options[0];
      const opts = shuffle(q.options);
      const L = ['क', 'ख', 'ग', 'घ'];
      const btns = opts.map((o, k) => {
        const b = el('button', 'opt', `<span class="ol">${L[k]}</span><span>${o}</span>`);
        b.onclick = () => {
          const ok = o === correct;
          if (!ok) b.classList.add('wrong');
          mark();
          finish(ok, ok ? '' : answerLine(correct));
        };
        body.appendChild(b);
        return b;
      });
      const mark = () => btns.forEach((b, k) => { b.disabled = true; if (opts[k] === correct) b.classList.add('right'); });
      return { reveal() { mark(); return answerLine(correct); } };
    },

    tf(q, body, finish) {
      body.classList.add('tf');
      const vals = [[true, '✅ सही'], [false, '❌ गलत']];
      const btns = vals.map(([v, label]) => {
        const b = el('button', 'opt', label);
        b.onclick = () => {
          const ok = v === q.answer;
          if (!ok) b.classList.add('wrong');
          mark();
          finish(ok, ok ? '' : answerLine(q.answer ? 'सही' : 'गलत'));
        };
        body.appendChild(b);
        return b;
      });
      const mark = () => btns.forEach((b, k) => { b.disabled = true; if (vals[k][0] === q.answer) b.classList.add('right'); });
      return { reveal() { mark(); return answerLine(q.answer ? 'सही' : 'गलत'); } };
    },

    sort(q, body, finish, checkBtn) {
      const pool = el('div', 'pool');
      const bins = el('div', 'bins');
      bins.style.setProperty('--n', q.cats.length);
      body.append(pool, bins);
      const binEls = q.cats.map((c, ci) => {
        const b = el('div', 'bin', `<div class="bin-head">${c.e} ${c.n}</div><div class="bin-items"></div>`);
        b.dataset.c = ci;
        bins.appendChild(b);
        return b;
      });
      const chips = shuffle(q.items).map(([t, c]) => {
        const ch = el('div', 'chip', t);
        ch.dataset.c = c;
        pool.appendChild(ch);
        return ch;
      });
      let sel = null;
      const update = () => checkBtn.classList.toggle('hidden', pool.querySelector('.chip') !== null);
      const select = ch => {
        if (sel) sel.classList.remove('sel');
        sel = sel === ch ? null : ch;
        if (sel) sel.classList.add('sel');
      };
      const placeInto = (ch, target) => {
        (target.classList.contains('bin') ? $('.bin-items', target) : target).appendChild(ch);
        ch.classList.remove('sel');
        sel = null;
        sfx.pop();
        update();
      };
      // A click that ends a drag must not also drop the tap-selected chip.
      let justDragged = false;
      [...binEls, pool].forEach(t => t.addEventListener('click', e => {
        if (justDragged || e.target.closest('.chip') || !sel) return;
        placeInto(sel, t);
      }));
      const targetAt = (x, y) => {
        const under = document.elementFromPoint(x, y);
        const t = under && (under.closest('.bin') || under.closest('.pool'));
        return t && body.contains(t) ? t : null;
      };
      // Dragging moves a floating copy ("ghost") attached to <body>; the real chip
      // stays in its box until it is dropped, so nothing is left floating.
      chips.forEach(ch => ch.addEventListener('pointerdown', e => {
        if (body.classList.contains('locked') || e.button > 0) return;
        e.preventDefault();
        const id = e.pointerId, sx = e.clientX, sy = e.clientY;
        let ghost = null, hover = null, ox = 0, oy = 0;
        const move = ev => {
          if (ev.pointerId !== id) return;
          if (!ghost) {
            if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
            if (sel) { sel.classList.remove('sel'); sel = null; }
            const r = ch.getBoundingClientRect();
            ox = sx - r.left; oy = sy - r.top;
            ghost = ch.cloneNode(true);
            ghost.className = 'chip ghost';
            ghost.style.width = r.width + 'px';
            document.body.appendChild(ghost);
            ch.classList.add('placeholder');
          }
          ghost.style.left = (ev.clientX - ox) + 'px';
          ghost.style.top = (ev.clientY - oy) + 'px';
          // scroll the question card when dragging near its top or bottom edge
          const cr = modalCard.getBoundingClientRect();
          if (ev.clientY > cr.bottom - 50) modalCard.scrollTop += 14;
          else if (ev.clientY < cr.top + 50) modalCard.scrollTop -= 14;
          const t = targetAt(ev.clientX, ev.clientY);
          if (t !== hover) { if (hover) hover.classList.remove('hover'); hover = t; if (hover) hover.classList.add('hover'); }
        };
        const end = ev => {
          if (ev.pointerId !== id) return;
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', end);
          window.removeEventListener('pointercancel', end);
          if (hover) hover.classList.remove('hover');
          if (!ghost) { if (ev.type === 'pointerup') select(ch); return; }
          ghost.remove();
          ch.classList.remove('placeholder');
          justDragged = true;
          setTimeout(() => { justDragged = false; }, 0);
          const t = ev.type === 'pointerup' ? targetAt(ev.clientX, ev.clientY) : null;
          if (t) placeInto(ch, t);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', end);
        window.addEventListener('pointercancel', end);
      }));
      checkBtn.onclick = () => {
        let ok = true;
        chips.forEach(ch => {
          const bin = ch.closest('.bin');
          const right = bin && bin.dataset.c === ch.dataset.c;
          ch.classList.add(right ? 'right' : 'wrong');
          if (!right) { ok = false; ch.insertAdjacentHTML('beforeend', ` <small>➜ ${q.cats[ch.dataset.c].n}</small>`); }
        });
        finish(ok, ok ? '' : '<p class="answer">लाल वाले शब्दों की सही टोकरी उनके साथ लिखी है।</p>');
      };
      return {
        reveal() {
          chips.forEach(ch => { $('.bin-items', binEls[ch.dataset.c]).appendChild(ch); ch.classList.add('right'); });
          return '<p class="answer">सही जवाब टोकरियों में दिखाया गया है। 👆</p>';
        },
      };
    },

    match(q, body, finish, checkBtn) {
      body.classList.add('match');
      const left = el('div', 'mcol'), right = el('div', 'mcol');
      body.append(left, right);
      const n = q.pairs.length;
      const pairOf = new Array(n).fill(null);
      const PC = ['#ffc8dd', '#bde0fe', '#ffe5a0', '#b7e4c7', '#e0c3fc'];
      let sl = null, sr = null;
      const lb = q.pairs.map((pr, i) => {
        const b = el('button', 'mitem', pr[0]);
        b.onclick = () => clickL(i);
        left.appendChild(b);
        return b;
      });
      const rb = [];
      shuffle([...Array(n).keys()]).forEach(j => {
        const b = el('button', 'mitem', q.pairs[j][1]);
        b.onclick = () => clickR(j);
        right.appendChild(b);
        rb[j] = b;
      });
      const paint = () => {
        lb.forEach((b, i) => { b.style.background = pairOf[i] != null ? PC[i % PC.length] : ''; b.classList.toggle('sel', sl === i); });
        rb.forEach((b, j) => { const i = pairOf.indexOf(j); b.style.background = i >= 0 ? PC[i % PC.length] : ''; b.classList.toggle('sel', sr === j); });
        checkBtn.classList.toggle('hidden', pairOf.includes(null));
      };
      const tryPair = () => {
        if (sl != null && sr != null) {
          const prev = pairOf.indexOf(sr);
          if (prev >= 0) pairOf[prev] = null;
          pairOf[sl] = sr;
          sl = sr = null;
          sfx.pop();
        }
        paint();
      };
      const clickL = i => {
        if (pairOf[i] != null && sl == null && sr == null) { pairOf[i] = null; paint(); return; }
        sl = sl === i ? null : i;
        tryPair();
      };
      const clickR = j => {
        const i = pairOf.indexOf(j);
        if (i >= 0 && sl == null && sr == null) { pairOf[i] = null; paint(); return; }
        sr = sr === j ? null : j;
        tryPair();
      };
      const answers = () => `<p class="answer">सही जोड़ियाँ:</p><ul class="answer-list">${q.pairs.map(pr => `<li>${pr[0]} ➜ <b>${pr[1]}</b></li>`).join('')}</ul>`;
      checkBtn.onclick = () => {
        let ok = true;
        lb.forEach((b, i) => {
          const r = pairOf[i] === i;
          if (!r) ok = false;
          b.classList.add(r ? 'right' : 'wrong');
          if (pairOf[i] != null) rb[pairOf[i]].classList.add(r ? 'right' : 'wrong');
        });
        finish(ok, ok ? '' : answers());
      };
      paint();
      return { reveal() { return answers(); } };
    },

    order(q, body, finish, checkBtn) {
      let order = [...q.items.keys()];
      do { order = shuffle(order); } while (order.every((v, i) => v === i));
      const list = el('ol', 'olist');
      body.appendChild(list);
      checkBtn.classList.remove('hidden');
      let sel = null;
      const swap = (a, b) => { [order[a], order[b]] = [order[b], order[a]]; sfx.pop(); };
      const draw = () => {
        list.innerHTML = '';
        order.forEach((v, pos) => {
          const li = el('li', 'oitem' + (sel === pos ? ' sel' : ''),
            `<span class="on-num">${num(pos + 1)}</span><span class="ot">${q.items[v]}</span>
             <span class="oarrows"><button data-d="-1" aria-label="ऊपर">▲</button><button data-d="1" aria-label="नीचे">▼</button></span>`);
          $$('button', li).forEach(b => {
            b.onclick = e => {
              e.stopPropagation();
              const np = pos + Number(b.dataset.d);
              if (np < 0 || np >= order.length) return;
              swap(pos, np);
              sel = null;
              draw();
            };
          });
          li.onclick = () => {
            if (sel == null) sel = pos;
            else { if (sel !== pos) swap(sel, pos); sel = null; }
            draw();
          };
          list.appendChild(li);
        });
      };
      draw();
      const answers = () => `<p class="answer">सही क्रम:</p><ol class="answer-list">${q.items.map(t => `<li>${t}</li>`).join('')}</ol>`;
      checkBtn.onclick = () => {
        const ok = order.every((v, i) => v === i);
        [...list.children].forEach((li, i) => li.classList.add(order[i] === i ? 'right' : 'wrong'));
        finish(ok, ok ? '' : answers());
      };
      return { reveal() { return answers(); } };
    },
  };

  /* ---------- modal ---------- */
  const modal = $('#modal'), modalCard = $('#modalCard');
  function openModal(cls) {
    modal.classList.remove('hidden');
    modalCard.className = 'modal-card ' + cls;
    modalCard.innerHTML = '';
    modalCard.scrollTop = 0;
    return modalCard;
  }
  function closeModal() { modal.classList.add('hidden'); modalCard.innerHTML = ''; }
  const modalOpen = () => !modal.classList.contains('hidden');
  const closableModal = () => modalOpen() && (modalCard.classList.contains('rules') || (modalCard.classList.contains('setup') && !modalCard.dataset.first));

  /* ---------- setup screen ---------- */
  function openSetup(first = false) {
    const card = openModal('setup');
    if (first) card.dataset.first = '1'; else delete card.dataset.first;
    const s = { ...settings };
    const existing = game ? game.players : [];
    const ps = [0, 1, 2, 3].map(i => existing[i] ? { name: existing[i].name, avatar: existing[i].avatar } : { name: DEFAULT_NAMES[i], avatar: AVATARS[i] });
    let count = game ? game.players.length : 2;
    const canContinue = !first && game && !game.over;
    card.innerHTML = `
      <h2 class="m-title">🎲 ${first ? 'खेल की तैयारी' : 'सेटिंग / नया खेल'}</h2>
      <section class="field">
        <h3>👥 कितने खिलाड़ी?</h3>
        <div class="seg" id="cnt">${[2, 3, 4].map(n => `<button data-n="${n}">${num(n)}</button>`).join('')}</div>
        <div class="prow-list">${ps.map((p, i) => `
          <div class="prow" data-i="${i}">
            <button class="av" style="background:${COLORS[i]}" title="जानवर बदलो">${p.avatar}</button>
            <input maxlength="14" value="${p.name}" aria-label="खिलाड़ी का नाम">
          </div>`).join('')}</div>
        <p class="hint">जानवर पर दबाकर अपनी गोटी बदलो, और अपना नाम लिखो।</p>
      </section>
      <section class="field">
        <h3>❓ प्रश्न कब आएँ?</h3>
        <div class="mode-cards">${MODES.map(m => `<button class="mode" data-m="${m.id}"><b>${m.t}</b><span>${m.d}</span></button>`).join('')}</div>
      </section>
      <section class="field">
        <h3>🛠️ नियम</h3>
        ${TOGGLES.map(t => `<label class="switch"><input type="checkbox" data-k="${t.k}" ${s[t.k] ? 'checked' : ''}><span class="slider"></span><span><b>${t.t}</b><small>${t.d}</small></span></label>`).join('')}
      </section>
      <section class="field two">
        <div>
          <h3>⭐ कठिनाई</h3>
          <select id="lvl">
            <option value="all">सभी तरह के सवाल</option>
            <option value="1">⭐ आसान</option>
            <option value="2">⭐⭐ मध्यम</option>
            <option value="3">⭐⭐⭐ कठिन</option>
          </select>
        </div>
        <div>
          <h3>🔢 अंक</h3>
          <div class="seg" id="dig"><button data-d="hi">१२३</button><button data-d="en">123</button></div>
        </div>
      </section>
      ${canContinue ? '<p class="hint">खिलाड़ियों की संख्या बदलने के लिए नया खेल शुरू करो।</p>' : ''}
      <div class="q-actions">
        ${canContinue ? '<button class="soft-btn" data-act="cont">↩ खेल जारी रखो</button>' : ''}
        <button class="big-btn" data-act="start">🚀 नया खेल शुरू करो</button>
      </div>`;

    const paint = () => {
      $$('#cnt button', card).forEach(b => b.classList.toggle('on', +b.dataset.n === count));
      $$('.prow', card).forEach((r, i) => r.classList.toggle('hidden', i >= count));
      $$('.mode', card).forEach(b => b.classList.toggle('on', b.dataset.m === s.mode));
      $$('#dig button', card).forEach(b => b.classList.toggle('on', b.dataset.d === s.digits));
    };
    $$('#cnt button', card).forEach(b => b.onclick = () => { count = +b.dataset.n; paint(); });
    $$('.prow', card).forEach((r, i) => {
      $('.av', r).onclick = () => {
        ps[i].avatar = AVATARS[(AVATARS.indexOf(ps[i].avatar) + 1) % AVATARS.length];
        $('.av', r).textContent = ps[i].avatar;
        sfx.pop();
      };
    });
    $$('.mode', card).forEach(b => b.onclick = () => { s.mode = b.dataset.m; paint(); });
    $$('.switch input', card).forEach(inp => inp.onchange = () => { s[inp.dataset.k] = inp.checked; });
    const lvl = $('#lvl', card);
    lvl.value = s.level;
    lvl.onchange = () => { s.level = lvl.value; };
    $$('#dig button', card).forEach(b => b.onclick = () => { s.digits = b.dataset.d; paint(); });
    paint();

    const readPlayers = () => $$('.prow', card).slice(0, count).map((r, i) => ({
      name: clean($('input', r).value) || DEFAULT_NAMES[i],
      avatar: ps[i].avatar,
    }));
    const applySettings = () => {
      const levelChanged = s.level !== settings.level;
      settings = { ...s };
      if (levelChanged && game) game.deck = [];
    };
    $('[data-act=start]', card).onclick = () => {
      const players = readPlayers();
      applySettings();
      closeModal();
      newGame(players);
    };
    const cont = $('[data-act=cont]', card);
    if (cont) cont.onclick = () => {
      const players = readPlayers();
      applySettings();
      players.forEach((p, i) => { if (game.players[i]) Object.assign(game.players[i], p); });
      if (game.phase === 'roll' || game.phase === 'ask') game.phase = startPhase();
      closeModal();
      renderAll();
      if (game.phase === 'move') showTarget(game.target);
      save();
    };
  }

  function openRules() {
    const card = openModal('rules');
    card.innerHTML = `
      <h2 class="m-title">📖 खेल के नियम</h2>
      <ul>
        <li>🎯 <b>लक्ष्य:</b> सबसे पहले खाना ${num(100)} 👑 तक पहुँचो!</li>
        <li>🎲 पासा फेंको और भारत के बारे में सवाल का सही जवाब दो — तभी गोटी आगे बढ़ेगी। (⚙️ सेटिंग में “पहले प्रश्न” भी चुन सकते हो।)</li>
        <li>🐍 साँप के मुँह पर पहुँचे? एक और सवाल! सही जवाब दिया तो बच गए, वरना पूँछ तक फिसलोगे।</li>
        <li>🪜 सीढ़ी के नीचे पहुँचे तो सीधे ऊपर चढ़ जाओ।</li>
        <li>6️⃣ पासे पर छह आए तो एक और बारी मिलती है।</li>
        <li>🏁 ${num(100)} पर पहुँचने के लिए ठीक उतने ही अंक चाहिए।</li>
        <li>✋ किसी भी गोटी को पकड़कर कहीं भी रख सकते हो। “गोटी अपने-आप चले” बंद करो, तो पासे के बाद अपनी गोटी ख़ुद खिसकानी होगी।</li>
        <li>🔤 सवाल समझ न आए तो “English” बटन दबाओ। 🤷 “पता नहीं” दबाने पर सही जवाब दिख जाएगा।</li>
      </ul>
      <h3 style="text-align:center">सवालों के प्रकार</h3>
      <div class="types">${Object.values(TYPE_LABEL).map(t => `<span>${t}</span>`).join('')}</div>
      <p class="hint" style="text-align:center">📜 साँप-सीढ़ी भारत का ही खेल है — पुराने ज़माने में इसे “मोक्षपटम” कहते थे। सीढ़ियाँ अच्छे गुण थीं और साँप बुरे गुण!</p>
      <div class="q-actions"><button class="big-btn" data-act="ok">समझ गए! 👍</button></div>`;
    $('[data-act=ok]', card).onclick = closeModal;
  }

  /* ---------- wire up ---------- */
  $('#mainBtn').onclick = onMain;
  $('#dice').onclick = () => { if (game && game.phase === 'roll') onMain(); };
  $('#autoBtn').onclick = onAuto;
  $('#rulesBtn').onclick = () => { if (!modalOpen()) openRules(); };
  $('#newBtn').onclick = () => { if (!busy && (!modalOpen() || closableModal())) openSetup(); };
  $('#soundBtn').onclick = () => { settings.sound = !settings.sound; renderControls(); save(); sfx.pop(); };
  modal.addEventListener('click', e => { if (e.target === modal && closableModal()) closeModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && closableModal()) closeModal();
  });
  window.addEventListener('resize', () => { if (game) renderPawns(); });

  /* ---------- start ---------- */
  load();
  drawDice(1);
  if (game && game.players && game.players.length) {
    if (!['roll', 'ask', 'move', 'over'].includes(game.phase)) game.phase = startPhase();
    if (game.phase === 'move' && game.target == null) game.phase = startPhase();
    renderAll();
    if (game.phase === 'move') showTarget(game.target);
    say(game.over ? '🏆 पिछला खेल ख़त्म हो गया था। ⚙️ दबाकर नया खेल शुरू करो!' : '↩ पिछला खेल वहीं से जारी है। 🎲');
  } else {
    newGame([0, 1].map(i => ({ name: DEFAULT_NAMES[i], avatar: AVATARS[i] })));
    openSetup(true);
  }
})();
