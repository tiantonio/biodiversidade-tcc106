/* Quem sou eu? Quiz de biodiversidade (foto, som e pista) */
(function () {
  'use strict';

  const BEST_KEY = 'biodiv_quiz_best';
  const ROUNDS = 10;
  let root = null, S = null, audio = null;

  /* ---------- utilidades ---------- */
  const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const pool = () => species.map((sp) => ({ id: sp.id, name: sp.name, sci: sp.sci, type: sp.type, img: sp.img, short: sp.short, audio: (typeof speciesAudio !== 'undefined' && speciesAudio[sp.id]) || null }));
  // a pista não pode entregar o nome
  const leaks = (sp) => {
    const text = norm(sp.short);
    return norm(sp.name + ' ' + sp.sci).split(/[^a-z]+/).filter((w) => w.length >= 5).some((w) => text.indexOf(w) >= 0);
  };

  function makeQuestion(sp, type) {
    const all = pool().filter((x) => x.id !== sp.id);
    const same = shuffle(all.filter((x) => x.type === sp.type));
    const other = shuffle(all.filter((x) => x.type !== sp.type));
    const distractors = type === 'sound' ? same.slice(0, 3) : same.slice(0, 2).concat(other.slice(0, 1));
    return { sp, type, opts: shuffle([sp].concat(distractors)), fx: 20 + Math.floor(Math.random() * 60), fy: 20 + Math.floor(Math.random() * 60) };
  }

  function buildQuestions() {
    const all = shuffle(pool());
    const withSound = all.filter((s) => s.audio).slice(0, 2);
    const rest = all.filter((s) => withSound.indexOf(s) < 0);
    const clues = rest.filter((s) => !leaks(s)).slice(0, 3);
    const photos = rest.filter((s) => clues.indexOf(s) < 0).slice(0, ROUNDS - withSound.length - clues.length);
    return shuffle([].concat(
      withSound.map((s) => makeQuestion(s, 'sound')),
      clues.map((s) => makeQuestion(s, 'clue')),
      photos.map((s) => makeQuestion(s, 'photo'))
    ));
  }

  const stopAudio = () => { if (audio) { audio.pause(); audio = null; } };
  const back = '<button class="btnGhost gameBack" type="button" data-go-game="hub">← Jogos</button>';

  /* ---------- telas ---------- */
  function renderIntro() {
    const best = parseInt(lsGet(BEST_KEY) || '0', 10);
    root.innerHTML = '<div class="qz">' + back +
      '<div class="qzBox">' +
      '<span class="gameTag">QUIZ</span>' +
      '<h2 class="qzQ" style="font-size:30px;margin:12px 0 10px;">Quem sou eu?</h2>' +
      '<p style="font-size:15.5px;line-height:1.7;color:#b7c2bc;margin:0 0 8px;">Ouça os sons, decifre pistas e reconheça as fotos das espécies que encontramos na Via Cambuí. São <b>' + ROUNDS + ' perguntas</b>: ' +
      'acertar vale 10 pontos (5 se você pedir ajuda na foto).</p>' +
      '<p class="qzNote">Dica: em ambiente barulhento, use fones para as perguntas de som.</p>' +
      (best ? '<p style="font-size:14px;color:#00e08a;font-weight:700;margin:0 0 6px;">Seu recorde: ' + best + ' pontos</p>' : '') +
      '<div class="qzBtns" style="justify-content:flex-start;margin-top:10px;"><button class="btnPrimary" type="button" data-q="start">Começar</button></div>' +
      '</div></div>';
  }

  function renderQuestion() {
    const q = S.qs[S.i];
    S.answered = false; S.hint = false; stopAudio();
    let media = '', title = '';
    if (q.type === 'photo') {
      title = 'Que espécie aparece nesta foto?';
      media = '<div class="qzPhoto" id="qzPhoto"><img src="' + escHtml(q.sp.img) + '" alt="Foto ampliada de uma espécie, para você adivinhar" style="transform-origin:' + q.fx + '% ' + q.fy + '%"></div>' +
        '<button class="btnGhost qzHint" type="button" data-q="hint">Mostrar a foto inteira (vale metade)</button>';
    } else if (q.type === 'clue') {
      title = 'Quem sou eu?';
      media = '<div class="qzClue">“' + escHtml(q.sp.short) + '”</div>';
    } else {
      title = 'Que animal faz este som?';
      let bars = ''; for (let i = 0; i < 18; i++) bars += '<i></i>';
      media = '<div class="qzSound" id="qzSound"><button class="qzPlay" type="button" data-q="play" aria-label="Ouvir o som">' +
        '<svg width="26" height="26" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 2.6v10.8a.6.6 0 0 0 .92.5l8.4-5.4a.6.6 0 0 0 0-1L4.92 2.1A.6.6 0 0 0 4 2.6z"/></svg></button>' +
        '<div class="qzBars" aria-hidden="true">' + bars + '</div></div>' +
        '<p class="qzNote">Toque no botão para ouvir quantas vezes quiser.</p>';
    }
    const pct = Math.round((S.i / ROUNDS) * 100);
    root.innerHTML = '<div class="qz">' + back +
      '<div class="qzTop"><span>Pergunta ' + (S.i + 1) + ' de ' + ROUNDS + '</span><span>' + S.pts + ' pontos</span></div>' +
      '<div class="qzBar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></div>' +
      '<div class="qzBox"><h2 class="qzQ">' + title + '</h2>' + media +
      '<div class="qzOpts" role="group" aria-label="Alternativas">' +
      q.opts.map((o) => '<button class="qzOpt" type="button" data-opt="' + o.id + '">' + escHtml(o.name) + '</button>').join('') + '</div>' +
      '<div id="qzFb" aria-live="polite"></div></div></div>';
  }

  function answer(id) {
    if (S.answered) return;
    S.answered = true;
    const q = S.qs[S.i];
    const right = id === q.sp.id;
    let gain = 0;
    if (right) { gain = (q.type === 'photo' && S.hint) ? 5 : 10; S.pts += gain; S.correct++; } else { S.missed.push(q.sp); }
    root.querySelectorAll('.qzOpt').forEach((b) => {
      b.disabled = true;
      if (b.dataset.opt === q.sp.id) b.classList.add('ok');
      else if (b.dataset.opt === id) b.classList.add('bad');
    });
    const photo = root.querySelector('#qzPhoto'); if (photo) photo.classList.add('full');
    const hint = root.querySelector('.qzHint'); if (hint) hint.remove();
    const last = S.i === ROUNDS - 1;
    root.querySelector('#qzFb').innerHTML =
      '<div class="qzFb' + (right ? '' : ' err') + '">' +
      '<div style="display:flex;gap:14px;align-items:flex-start;">' +
      '<img src="' + escHtml(q.sp.img) + '" alt="" style="width:92px;height:72px;object-fit:cover;border-radius:10px;flex:none;">' +
      '<div><b>' + (right ? 'Correto! +' + gain + ' pontos' : 'Quase! Era ' + escHtml(q.sp.name)) + '</b> ' +
      (right ? '<span>' + escHtml(q.sp.name) + '</span> ' : '') + '<em>' + escHtml(q.sp.sci) + '</em>' +
      '<p>' + escHtml(q.sp.short) + '</p></div></div>' +
      '<button class="btnPrimary qzNext" type="button" data-q="next" id="qzNext">' + (last ? 'Ver resultado' : 'Próxima pergunta →') + '</button></div>';
    const nx = root.querySelector('#qzNext'); if (nx) nx.focus({ preventScroll: false });
  }

  function rank(p) {
    if (p >= 90) return 'Mestre da Biodiversidade';
    if (p >= 70) return 'Biólogo Urbano';
    if (p >= 40) return 'Explorador da Via Cambuí';
    return 'Observador Iniciante';
  }

  function renderEnd() {
    stopAudio();
    const best = parseInt(lsGet(BEST_KEY) || '0', 10);
    const isBest = S.pts > best;
    if (isBest) lsSet(BEST_KEY, String(S.pts));
    const review = S.missed.length
      ? '<div class="qzReview"><p style="margin:0 0 8px;font-weight:800;color:#f2f7f4;">Para rever:</p>' +
        S.missed.map((s) => '<a href="#especie/' + s.id + '">' + escHtml(s.name) + '</a>').join('') + '</div>'
      : '<p style="color:#00e08a;font-weight:700;">Você acertou todas! 🎉</p>';
    root.innerHTML = '<div class="qz">' + back +
      '<div class="qzBox qzEnd"><span class="gameTag">RESULTADO</span>' +
      '<div class="qzScore">' + S.pts + '</div>' +
      '<p style="margin:0;color:#a9b5af;">de 100 pontos · ' + S.correct + ' de ' + ROUNDS + ' acertos</p>' +
      '<div class="qzRank">' + rank(S.pts) + '</div>' +
      (isBest ? '<p style="color:#00e08a;font-weight:800;margin:0 0 6px;">Novo recorde!</p>' : (best ? '<p style="color:#8d9a93;margin:0 0 6px;">Seu recorde: ' + best + ' pontos</p>' : '')) +
      review +
      '<div class="qzBtns"><button class="btnPrimary" type="button" data-q="start">Jogar de novo</button>' +
      '<button class="btnGhost" type="button" data-q="share">Compartilhar</button>' +
      '<a class="btnGhost" href="#especies" style="display:inline-flex;align-items:center;text-decoration:none;">Ver as espécies</a></div>' +
      '</div></div>';
    const b = root.querySelector('[data-q="start"]'); if (b) b.focus();
  }

  /* ---------- eventos ---------- */
  function onClick(e) {
    const t = e.target.closest('[data-q],[data-opt]');
    if (!t) return;
    if (t.dataset.opt) { answer(t.dataset.opt); return; }
    const a = t.dataset.q;
    if (a === 'start') {
      S = { i: 0, pts: 0, correct: 0, qs: buildQuestions(), answered: false, hint: false, missed: [] };
      renderQuestion(); window.scrollTo(0, 0);
    } else if (a === 'next') {
      S.i++;
      if (S.i >= ROUNDS) renderEnd(); else renderQuestion();
      window.scrollTo(0, 0);
    } else if (a === 'hint') {
      S.hint = true;
      const ph = root.querySelector('#qzPhoto'); if (ph) ph.classList.add('full');
      t.remove();
    } else if (a === 'play') {
      const q = S.qs[S.i], box = root.querySelector('#qzSound');
      if (audio) { stopAudio(); box.classList.remove('on'); return; }
      audio = new Audio(q.sp.audio.src);
      audio.addEventListener('ended', () => { box.classList.remove('on'); audio = null; });
      audio.addEventListener('error', () => { box.classList.remove('on'); audio = null; showToast('Não foi possível tocar o som.'); });
      box.classList.add('on');
      audio.play().catch(() => { box.classList.remove('on'); audio = null; });
    } else if (a === 'share') {
      shareLink({ title: 'Quem sou eu? — Biodiversidade Urbana', text: 'Fiz ' + S.pts + ' pontos no quiz da biodiversidade da Via Cambuí (' + rank(S.pts) + '). Consegue me superar?', url: siteUrl() + '#jogos/quiz' });
    }
  }

  window.Quiz = {
    mount(el) { stopAudio(); root = el; S = null; root.addEventListener('click', onClick); renderIntro(); },
    unmount() { stopAudio(); if (root) root.removeEventListener('click', onClick); root = null; S = null; },
    _debug() { return S; }
  };
})();
