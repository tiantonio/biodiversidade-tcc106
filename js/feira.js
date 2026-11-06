/* Pacote Feira: utilidades, compartilhar, modo apresentação e modo offline */
(function () {
  'use strict';

  /* ---------- armazenamento seguro (pode falhar em aba anônima) ---------- */
  window.lsGet = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  window.lsSet = function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignora */ } };

  window.escHtml = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* ---------- aviso rápido ---------- */
  var toastEl = null, toastTimer = null;
  window.showToast = function (msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, 3200);
  };

  /* ---------- compartilhar ---------- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
    }
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return Promise.resolve(ok);
    } catch (e) { return Promise.resolve(false); }
  }

  window.shareLink = function (data) {
    if (navigator.share) {
      return navigator.share(data).catch(function (e) {
        if (e && e.name === 'AbortError') return;
        return copyText(data.url).then(function (ok) { showToast(ok ? 'Link copiado!' : 'Copie o link: ' + data.url); });
      });
    }
    return copyText(data.url).then(function (ok) { showToast(ok ? 'Link copiado!' : 'Copie o link: ' + data.url); });
  };

  window.shareSite = function () {
    return shareLink({
      title: 'Biodiversidade Urbana — TCC 2026',
      text: 'Conheça a fauna e a flora da Via Cambuí (São José dos Campos) no TCC do Grupo 106.',
      url: siteUrl()
    });
  };

  window.shareSpecies = function (id) {
    var sp = species.filter(function (s) { return s.id === id; })[0];
    if (!sp) return;
    return shareLink({
      title: sp.name + ' — Biodiversidade Urbana (TCC 2026)',
      text: sp.name + ' (' + sp.sci + ') na Via Cambuí.',
      url: siteUrl() + '#especie/' + id
    });
  };

  /* ---------- modo apresentação (QR gigante) ---------- */
  var presentEl = null;
  function qrSvg(url) {
    try {
      var q = qrcode(0, 'M'); q.addData(url); q.make();
      return q.createSvgTag({ cellSize: 6, margin: 0, scalable: true });
    } catch (e) { return ''; }
  }
  window.openPresent = function () {
    if (presentEl) return;
    var url = siteUrl();
    presentEl = document.createElement('div');
    presentEl.className = 'present';
    presentEl.setAttribute('role', 'dialog');
    presentEl.setAttribute('aria-modal', 'true');
    presentEl.setAttribute('aria-label', 'QR code do site em tela cheia');
    presentEl.innerHTML =
      '<button class="btnGhost pClose" type="button" aria-label="Fechar modo apresentação">Fechar ✕</button>' +
      '<span class="pTag">TCC 2026 · GRUPO 106</span>' +
      '<h2>Vida entre o <span>Concreto</span> e o Asfalto</h2>' +
      '<div class="pQr" role="img" aria-label="QR code para abrir o site">' + qrSvg(url) + '</div>' +
      '<p class="pMsg">Aponte a câmera do celular e explore a biodiversidade da Via Cambuí</p>' +
      '<p class="pUrl">' + escHtml(url.replace(/^https?:\/\//, '').replace(/\/$/, '')) + '</p>';
    document.body.appendChild(presentEl);
    document.body.style.overflow = 'hidden';
    var btn = presentEl.querySelector('.pClose');
    btn.addEventListener('click', closePresent);
    btn.focus();
    try { if (document.documentElement.requestFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(function () {}); } catch (e) { /* ignora */ }
  };
  window.closePresent = function () {
    if (!presentEl) return;
    presentEl.remove(); presentEl = null;
    document.body.style.overflow = '';
    try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {}); } catch (e) { /* ignora */ }
    if (location.hash === '#apresentacao') history.replaceState(null, '', location.pathname + location.search);
  };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && presentEl) closePresent(); });

  /* ---------- modo offline (service worker) ---------- */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    var hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!hadController) { hadController = true; showToast('✓ Site salvo: agora funciona sem internet'); }
    });
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* sem offline, segue normal */ });
    });
  }
})();
