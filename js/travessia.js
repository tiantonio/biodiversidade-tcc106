/* Travessia Segura: ajude um animal silvestre a atravessar a rodovia */
(function () {
  'use strict';

  const T = 40, COLS = 9, ROWS = 11, W = COLS * T, H = ROWS * T;
  const ROAD_ROWS = [1, 2, 3, 4, 6, 7, 8, 9];      // linhas (de baixo para cima) com tráfego
  const BEST_KEY = 'biodiv_cross_best';
  const HOP = 0.11;                                // duração do pulo (s)
  const FACTS = [
    'Placas de “Travessia de animais” pedem que o motorista reduza a velocidade: a fauna silvestre também usa as vias.',
    'O lobo-guará é tímido e solitário, e vias movimentadas são um risco para animais silvestres como ele.',
    'O cachorro-do-mato (Cerdocyon thous) aparece na placa da Via Cambuí que fotografamos no campo.',
    'Respeitar a sinalização e reduzir a velocidade ajuda a proteger a fauna que vive perto das vias.',
    'Canteiros arborizados e corredores verdes ajudam os animais a se deslocar com mais segurança na cidade.'
  ];
  const CHARS = {
    lobo:     { name: 'Lobo-guará',        body: '#d9822b', dark: '#2b1d12', ear: '#2b1d12', tail: '#f1dcc0' },
    cachorro: { name: 'Cachorro-do-mato',  body: '#8b7765', dark: '#2e251d', ear: '#4a3d33', tail: '#4a3d33' }
  };
  const CAR_COLORS = ['#e8b04a', '#d96c5f', '#6fa8dc', '#cfd8dc', '#9b8cd9', '#7fc8a9'];
  const TYPES = [
    { k: 'car',   w: 52,  p: 0.55 },
    { k: 'van',   w: 62,  p: 0.20 },
    { k: 'truck', w: 98,  p: 0.15 },
    { k: 'bus',   w: 112, p: 0.10 }
  ];

  let root = null, cv = null, ctx = null, bg = null, raf = 0, last = 0, G = null, charKey = 'lobo', dpr = 1;
  let ovEl = null, factEl = null, factTimer = 0, keyBound = false;

  const rowY = (r) => (ROWS - 1 - r) * T;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const pickType = () => { let x = Math.random(), s = 0; for (const t of TYPES) { s += t.p; if (x <= s) return t; } return TYPES[0]; };
  const gap = (lvl) => rnd(125, 235) - Math.min(lvl, 10) * 6;

  /* ---------- estado do jogo ---------- */
  function newLanes(level) {
    return ROAD_ROWS.map((r, i) => {
      const lane = { row: r, dir: i % 2 === 0 ? 1 : -1, base: 44 + ((i * 17) % 26), cars: [] };
      let x = rnd(-150, -60);
      while (x < W + 260) {
        const t = pickType();
        lane.cars.push({ x, w: t.w, k: t.k, color: pick(CAR_COLORS) });
        x += t.w + gap(level);
      }
      return lane;
    });
  }
  function newGame() {
    return {
      running: false, over: false, lives: 3, score: 0, level: 1, speedMul: 1, t: 0,
      lanes: newLanes(1), invuln: 0, flash: 0, flashColor: '#ff7a70', shake: 0, queued: null,
      p: { col: 4, row: 0, x: 4 * T, y: rowY(0), fx: 0, fy: 0, tx: 0, ty: 0, hopT: 1, dir: 0 },
      pops: []
    };
  }
  const laneSpeed = (lane) => lane.base + Math.min(G.level - 1, 12) * 7;

  /* ---------- movimento ---------- */
  function move(dir) {                       // 0 cima, 1 direita, 2 baixo, 3 esquerda
    if (!G || !G.running) return;
    const p = G.p;
    if (p.hopT < 1) { G.queued = dir; return; }
    let col = p.col, row = p.row;
    if (dir === 0) row++; else if (dir === 2) row--; else if (dir === 1) col++; else col--;
    p.dir = dir;
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    p.fx = p.x; p.fy = p.y; p.col = col; p.row = row; p.tx = col * T; p.ty = rowY(row); p.hopT = 0;
  }
  function resetPlayer() {
    const p = G.p;
    p.col = 4; p.row = 0; p.x = 4 * T; p.y = rowY(0); p.hopT = 1; p.dir = 0; G.queued = null;
  }

  /* ---------- atualização ---------- */
  function update(dt) {
    G.t += dt;
    if (G.invuln > 0) G.invuln -= dt;
    if (G.flash > 0) G.flash -= dt;
    if (G.shake > 0) G.shake -= dt;
    // carros
    for (const lane of G.lanes) {
      const v = laneSpeed(lane) * G.speedMul * dt * lane.dir;
      for (const c of lane.cars) c.x += v;
      for (const c of lane.cars) {
        if (lane.dir > 0 && c.x > W + 140) {
          const t = pickType(); c.w = t.w; c.k = t.k; c.color = pick(CAR_COLORS);
          c.x = Math.min.apply(null, lane.cars.map((k) => k.x)) - c.w - gap(G.level);
        } else if (lane.dir < 0 && c.x + c.w < -140) {
          const t = pickType(); c.w = t.w; c.k = t.k; c.color = pick(CAR_COLORS);
          c.x = Math.max.apply(null, lane.cars.map((k) => k.x + k.w)) + gap(G.level);
        }
      }
    }
    // pulo do animal
    const p = G.p;
    if (p.hopT < 1) {
      p.hopT = Math.min(1, p.hopT + dt / HOP);
      const k = p.hopT;
      p.x = p.fx + (p.tx - p.fx) * k; p.y = p.fy + (p.ty - p.fy) * k;
      if (p.hopT >= 1) {
        if (p.row === ROWS - 1) { crossed(); }
        else if (G.queued !== null) { const q = G.queued; G.queued = null; move(q); }
      }
    }
    // colisão
    if (G.invuln <= 0 && G.running) {
      const px = p.x + 10, py = p.y + 12, pw = T - 20, ph = T - 24;
      for (const lane of G.lanes) {
        const cy = rowY(lane.row) + 8, ch = T - 16;
        if (py + ph < cy || py > cy + ch) continue;
        for (const c of lane.cars) {
          if (px < c.x + c.w && px + pw > c.x) { hit(); return; }
        }
      }
    }
    // efeitos
    G.pops = G.pops.filter((s) => (s.life -= dt) > 0);
    for (const s of G.pops) s.y -= 28 * dt;
  }

  function hud() {
    if (!root) return;
    const best = parseInt(lsGet(BEST_KEY) || '0', 10);
    const set = (id, v) => { const e = root.querySelector(id); if (e) e.textContent = v; };
    set('#cxLives', '♥'.repeat(Math.max(G ? G.lives : 3, 0)) || '–');
    set('#cxScore', 'Travessias: ' + (G ? G.score : 0));
    set('#cxLevel', 'Nível ' + (G ? G.level : 1));
    set('#cxBest', 'Recorde: ' + Math.max(best, G ? G.score : 0));
  }

  function showFact(text) {
    if (!factEl) return;
    factEl.textContent = text; factEl.classList.add('on');
    clearTimeout(factTimer);
    factTimer = setTimeout(() => factEl && factEl.classList.remove('on'), 3600);
  }

  function crossed() {
    G.score++; G.level = 1 + G.score;
    G.flash = 0.3; G.flashColor = '#00e08a';
    G.pops.push({ x: G.p.x + T / 2, y: G.p.y, life: 0.9, text: '+1' });
    showFact(FACTS[(G.score - 1) % FACTS.length]);
    resetPlayer(); hud();
    try { if (navigator.vibrate) navigator.vibrate(25); } catch (e) { /* ignora */ }
  }

  function hit() {
    G.lives--; G.shake = 0.3; G.flash = 0.35; G.flashColor = '#ff7a70'; G.invuln = 1.2;
    try { if (navigator.vibrate) navigator.vibrate([70, 40, 70]); } catch (e) { /* ignora */ }
    resetPlayer(); hud();
    if (G.lives <= 0) gameOver();
  }

  function gameOver() {
    G.running = false; G.over = true;
    cancelAnimationFrame(raf);
    const best = parseInt(lsGet(BEST_KEY) || '0', 10);
    const isBest = G.score > best;
    if (isBest) lsSet(BEST_KEY, String(G.score));
    draw();
    overlay('<h3>Fim de <span>jogo</span></h3>' +
      '<p><b style="color:#f2f7f4;font-size:22px;">' + G.score + '</b><br>' + (G.score === 1 ? 'animal atravessou' : 'animais atravessaram') + ' em segurança' + (isBest && G.score > 0 ? ' · <b style="color:#00e08a">novo recorde!</b>' : '') + '</p>' +
      '<p>Na vida real não existe segunda chance: reduza a velocidade onde há placa de travessia de animais.</p>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;"><button class="btnPrimary" type="button" data-cx="start">Jogar de novo</button>' +
      '<button class="btnGhost" type="button" data-cx="share">Compartilhar</button></div>');
  }

  /* ---------- desenho ---------- */
  function buildBg() {
    bg = document.createElement('canvas'); bg.width = W * dpr; bg.height = H * dpr;
    const c = bg.getContext('2d'); c.scale(dpr, dpr);
    for (let r = 0; r < ROWS; r++) {
      const y = rowY(r);
      if (ROAD_ROWS.indexOf(r) >= 0) {
        c.fillStyle = '#2a302d'; c.fillRect(0, y, W, T);
        c.fillStyle = 'rgba(255,255,255,0.025)'; for (let x = 0; x < W; x += 20) c.fillRect(x + (r % 2) * 10, y + 6, 10, T - 12);
      } else if (r === 0) {
        c.fillStyle = '#1b3a28'; c.fillRect(0, y, W, T);
      } else if (r === 5) {
        c.fillStyle = '#21452f'; c.fillRect(0, y, W, T);
      } else {
        c.fillStyle = '#0f2a1b'; c.fillRect(0, y, W, T);
      }
    }
    // faixas
    c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 2; c.setLineDash([14, 12]);
    [2, 3, 4, 7, 8, 9].forEach((r) => { const y = rowY(r); c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); });
    c.setLineDash([]);
    c.strokeStyle = 'rgba(255,208,80,0.8)'; c.lineWidth = 2;
    [1, 6].forEach((r) => { const y = rowY(r) + T; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); });
    [5, 10].forEach((r) => { const y = rowY(r - 1); c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); });
    // mata (topo) e canteiro (meio)
    const tree = (x, y, rad, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, rad, 0, Math.PI * 2); c.fill(); };
    for (let i = 0; i < 22; i++) { const x = (i * 53) % W + 8, y = rowY(10) + 8 + ((i * 29) % 26); tree(x, y, 10 + (i % 3) * 3, ['#1b5a35', '#17492c', '#226b3f'][i % 3]); }
    for (let i = 0; i < 9; i++) tree(i * T + 20, rowY(5) + 20 + ((i % 2) ? 6 : -6), 7 + (i % 3), '#2f6a43');
    for (let i = 0; i < 12; i++) { c.fillStyle = 'rgba(160,230,180,0.18)'; c.fillRect((i * 31) % W, rowY(0) + ((i * 17) % 30) + 4, 3, 7); }
    c.fillStyle = 'rgba(242,247,244,0.55)'; c.font = '700 11px Manrope, sans-serif'; c.textAlign = 'center';
    c.fillText('MATA', W / 2, rowY(10) + T - 6);
  }

  function rr(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  function drawCar(c, car, dir, y) {
    const x = car.x, h = T - 16, by = y + 8, w = car.w, front = dir > 0 ? x + w : x;
    const lights = () => {
      c.fillStyle = '#ffe9a8'; c.fillRect(front - (dir > 0 ? 4 : 0), by + 3, 4, 5); c.fillRect(front - (dir > 0 ? 4 : 0), by + h - 8, 4, 5);
      const rear = dir > 0 ? x : x + w - 3; c.fillStyle = '#c0392b'; c.fillRect(rear, by + 3, 3, 5); c.fillRect(rear, by + h - 8, 3, 5);
    };
    c.fillStyle = 'rgba(0,0,0,0.28)'; rr(c, x + 2, by + 3, w, h, 7); c.fill();
    if (car.k === 'truck') {
      const cab = 34;
      const tx = dir > 0 ? x : x + cab, cx = dir > 0 ? x + w - cab : x;
      c.fillStyle = '#e8ecea'; rr(c, tx, by, w - cab + 2, h, 5); c.fill();
      c.fillStyle = car.color; rr(c, cx, by, cab, h, 7); c.fill();
      c.fillStyle = '#1b2430'; c.fillRect(dir > 0 ? cx + cab - 12 : cx + 4, by + 4, 8, h - 8);
    } else {
      c.fillStyle = car.color; rr(c, x, by, w, h, 7); c.fill();
      c.fillStyle = '#1b2430';
      if (car.k === 'bus') { for (let i = 0; i < 5; i++) c.fillRect(x + 8 + i * 19, by + 4, 12, h - 8); }
      else { const wx = dir > 0 ? x + w * 0.42 : x + w * 0.12; c.fillRect(wx, by + 4, w * 0.46, h - 8); }
    }
    lights();
  }

  function drawAnimal(c, p) {
    const ch = CHARS[charKey];
    const lift = p.hopT < 1 ? Math.sin(p.hopT * Math.PI) * 6 : 0;
    const bob = p.hopT >= 1 ? Math.sin(G.t * 5) * 0.6 : 0;
    const cx = p.x + T / 2, cy = p.y + T / 2;
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(cx + 2, cy + 4, 11, 13, 0, 0, Math.PI * 2); c.fill();
    c.save(); c.translate(cx, cy - lift + bob); c.rotate(p.dir * Math.PI / 2); c.scale(1.12 + lift / 40, 1.12 + lift / 40);
    c.fillStyle = ch.dark; // patas (abertas para fora do corpo)
    [[-10.5, -6], [10.5, -6], [-10.5, 9], [10.5, 9]].forEach(([x, y]) => { rr(c, x - 2.2, y - 5.5, 4.4, 11, 2.2); c.fill(); });
    c.fillStyle = ch.tail; c.beginPath(); c.ellipse(0, 15.5, 4, 6, 0, 0, Math.PI * 2); c.fill();      // rabo
    c.fillStyle = ch.body; c.beginPath(); c.ellipse(0, 1, 8.5, 12.5, 0, 0, Math.PI * 2); c.fill();   // corpo
    c.fillStyle = ch.dark; c.globalAlpha = 0.6; c.beginPath(); c.ellipse(0, -5, 6.5, 4.5, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; // juba/dorso
    // orelhas grandes na cor do corpo, com o interior escuro
    [[-1, -6.5], [1, 6.5]].forEach(([s, x]) => {
      c.fillStyle = ch.body; c.beginPath(); c.moveTo(x, -13); c.lineTo(x + s * 2.5, -25); c.lineTo(x - s * 6, -16); c.closePath(); c.fill();
      c.fillStyle = ch.ear; c.beginPath(); c.moveTo(x - s * 1.2, -15); c.lineTo(x + s * 1.8, -23); c.lineTo(x - s * 4.2, -16.5); c.closePath(); c.fill();
    });
    c.fillStyle = ch.body; c.beginPath(); c.ellipse(0, -15, 6.2, 6.6, 0, 0, Math.PI * 2); c.fill();   // cabeça
    c.fillStyle = '#efe0cc'; c.beginPath(); c.ellipse(0, -20.8, 3, 3.4, 0, 0, Math.PI * 2); c.fill(); // focinho
    c.fillStyle = '#111'; c.beginPath(); c.arc(0, -23, 1.2, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(-2.9, -16, 1, 0, Math.PI * 2); c.arc(2.9, -16, 1, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  function draw() {
    if (!ctx || !G) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (G.shake > 0) ctx.translate(rnd(-3, 3), rnd(-3, 3));
    ctx.drawImage(bg, 0, 0, W, H);
    for (const lane of G.lanes) { const y = rowY(lane.row); for (const c of lane.cars) drawCar(ctx, c, lane.dir, y); }
    if (!(G.invuln > 0 && Math.floor(G.t * 12) % 2 === 0)) drawAnimal(ctx, G.p);
    ctx.fillStyle = 'rgba(242,247,244,0.95)'; ctx.font = '800 16px Manrope, sans-serif'; ctx.textAlign = 'center';
    for (const s of G.pops) { ctx.globalAlpha = Math.max(0, s.life / 0.9); ctx.fillStyle = '#00e08a'; ctx.fillText(s.text, s.x, s.y); }
    ctx.globalAlpha = 1;
    ctx.restore();
    if (G.flash > 0) { ctx.globalAlpha = Math.min(0.4, G.flash); ctx.fillStyle = G.flashColor; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  }

  /* ---------- laço principal ---------- */
  function frame(ts) {
    if (!G || !G.running) return;
    const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
    update(dt); draw();
    if (G && G.running) raf = requestAnimationFrame(frame);
  }
  function run() { cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame); }

  /* ---------- telas ---------- */
  function overlay(html) { if (ovEl) { ovEl.innerHTML = html; ovEl.style.display = 'flex'; const b = ovEl.querySelector('.btnPrimary'); if (b) b.focus(); } }
  function hideOverlay() { if (ovEl) { ovEl.style.display = 'none'; ovEl.innerHTML = ''; } }

  function startScreen() {
    const best = parseInt(lsGet(BEST_KEY) || '0', 10);
    overlay('<h3>Travessia <span>Segura</span></h3>' +
      '<p>Animais silvestres cruzam as vias da cidade. Ajude o animal a atravessar as duas pistas sem ser atropelado: cada travessia vale 1 ponto e o trânsito fica mais intenso.</p>' +
      '<div class="cxPick" role="group" aria-label="Escolha o animal">' +
      Object.keys(CHARS).map((k) => '<button type="button" data-cx="pick" data-k="' + k + '" aria-pressed="' + (k === charKey) + '">' + CHARS[k].name + '</button>').join('') + '</div>' +
      (best ? '<p style="color:#00e08a;font-weight:700;">Recorde: ' + best + '</p>' : '') +
      '<button class="btnPrimary" type="button" data-cx="start">Jogar</button>');
  }

  function start() {
    G = newGame(); G.running = true;
    hideOverlay(); hud(); run();
    // no celular, deixa o placar, a pista e os botões de direção visíveis juntos
    const h = root.querySelector('.cxHud');
    if (h) window.scrollTo(0, Math.max(0, h.getBoundingClientRect().top + window.scrollY - 8));
  }

  function onClick(e) {
    const t = e.target.closest('[data-cx]');
    if (!t) return;
    const a = t.dataset.cx;
    if (a === 'start') start();
    else if (a === 'pick') {
      charKey = t.dataset.k;
      root.querySelectorAll('[data-cx="pick"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === charKey)));
      if (G) draw();
    } else if (a === 'share') {
      shareLink({ title: 'Travessia Segura — Biodiversidade Urbana', text: 'Ajudei ' + G.score + ' animais a atravessar a rodovia no jogo do nosso TCC. Consegue mais?', url: siteUrl() + '#jogos/travessia' });
    } else if (a === 'dir') {
      move(parseInt(t.dataset.d, 10));
    }
  }

  /* ---------- controles ---------- */
  function onKey(e) {
    if (!root || !G || !G.running) return;
    const m = { ArrowUp: 0, w: 0, W: 0, ArrowRight: 1, d: 1, D: 1, ArrowDown: 2, s: 2, S: 2, ArrowLeft: 3, a: 3, A: 3 };
    if (e.key in m) { e.preventDefault(); move(m[e.key]); }
  }
  let tx0 = 0, ty0 = 0;
  function onTouchStart(e) { const t = e.changedTouches[0]; tx0 = t.clientX; ty0 = t.clientY; }
  function onTouchEnd(e) {
    const t = e.changedTouches[0], dx = t.clientX - tx0, dy = t.clientY - ty0;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) { move(0); return; }
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : 3); else move(dy > 0 ? 2 : 0);
  }
  function onVis() {
    if (!G || !G.running) return;
    if (document.hidden) cancelAnimationFrame(raf); else run();
  }

  /* ---------- montagem ---------- */
  window.Cross = {
    mount(el) {
      root = el; G = null;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      root.innerHTML = '<div class="cx">' +
        '<button class="btnGhost gameBack" type="button" data-go-game="hub">← Jogos</button>' +
        '<div class="cxHud"><span id="cxLevel">Nível 1</span><span id="cxScore">Travessias: 0</span><span class="lives" id="cxLives" aria-label="Vidas">♥♥♥</span></div>' +
        '<div class="cxWrap"><canvas id="cxCanvas" width="' + W * dpr + '" height="' + H * dpr + '" aria-label="Jogo Travessia Segura: ajude o animal a atravessar a rodovia" role="img"></canvas>' +
        '<div class="cxFact" id="cxFact" aria-live="polite"></div><div class="cxOv" id="cxOv"></div></div>' +
        '<div class="cxPad" aria-label="Controles">' +
        '<button type="button" class="up" data-cx="dir" data-d="0" aria-label="Para cima">▲</button>' +
        '<button type="button" class="lf" data-cx="dir" data-d="3" aria-label="Para a esquerda">◀</button>' +
        '<button type="button" class="dn" data-cx="dir" data-d="2" aria-label="Para baixo">▼</button>' +
        '<button type="button" class="rt" data-cx="dir" data-d="1" aria-label="Para a direita">▶</button></div>' +
        '<p class="cxKeys">Use as setas ou W A S D do teclado</p>' +
        '<p class="cxKeys" id="cxBest" style="display:block;margin-top:6px;"></p></div>';
      cv = root.querySelector('#cxCanvas'); ctx = cv.getContext('2d');
      ovEl = root.querySelector('#cxOv'); factEl = root.querySelector('#cxFact');
      buildBg();
      G = newGame(); G.running = false; draw(); hud();
      root.addEventListener('click', onClick);
      cv.addEventListener('touchstart', onTouchStart, { passive: true });
      cv.addEventListener('touchend', onTouchEnd, { passive: true });
      if (!keyBound) { document.addEventListener('keydown', onKey); document.addEventListener('visibilitychange', onVis); keyBound = true; }
      startScreen();
    },
    unmount() {
      cancelAnimationFrame(raf); clearTimeout(factTimer);
      if (root) root.removeEventListener('click', onClick);
      root = null; cv = null; ctx = null; ovEl = null; factEl = null; G = null;
      if (keyBound) { document.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis); keyBound = false; }
    },
    _debug() { return G; }
  };
})();
