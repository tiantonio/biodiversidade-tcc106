/* Service worker do site Biodiversidade Urbana (TCC 2026).
   NÃO edite o arquivo sw.js à mão: ele é gerado por tools/gerar_sw.py a partir deste modelo. */
const CACHE = 'biodiv-5fc9e6b00d';
const ASSETS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "images/galeria-bastidores-gravacao-instagram.webp",
  "images/galeria-dia1-analise-fauna-via-cambui.webp",
  "images/galeria-dia1-coleta-canteiro-colegio.webp",
  "images/galeria-dia1-inicio.webp",
  "images/galeria-dia1-placa-cachorro-do-mato.webp",
  "images/galeria-dia1-placa-lobo-guara.webp",
  "images/galeria-dia1-registro-fauna-cupim.webp",
  "images/galeria-dia2-analise-flora.webp",
  "images/galeria-dia2-canteiro-em-frente-igreja.webp",
  "images/galeria-dia2-coleta-colegio.webp",
  "images/galeria-dia2-em-torno-templos-igreja-2.webp",
  "images/home-via-cambui-hero.webp",
  "images/species-acalifa.webp",
  "images/species-carcara.webp",
  "images/species-girassol.webp",
  "images/species-image1.webp",
  "images/species-image10.webp",
  "images/species-image11.webp",
  "images/species-image12.webp",
  "images/species-image14.webp",
  "images/species-image15.webp",
  "images/species-image16.webp",
  "images/species-image17.webp",
  "images/species-image18.webp",
  "images/species-image19.webp",
  "images/species-image3.webp",
  "images/species-image4.webp",
  "images/species-image5.webp",
  "images/species-image6.webp",
  "images/species-image7.webp",
  "images/species-image9.webp",
  "images/species-ipe.webp",
  "images/species-junipero.webp",
  "images/species-lobo.webp",
  "images/species-maitaca.webp",
  "images/species-sagui.webp",
  "images/species-urubu.webp",
  "images/team-arthur-tomeu.webp",
  "images/team-bruno-tamura.webp",
  "images/team-grupo-106-logo.webp",
  "images/team-henrique-carneiro.webp",
  "images/team-joao-felipe.webp",
  "images/team-leila-ferreira.webp",
  "images/team-miguel-passini.webp",
  "images/team-pedro-jorge.webp",
  "audio/andorinha.mp3",
  "audio/carcara.mp3",
  "audio/coruja.mp3",
  "audio/maitaca.mp3",
  "audio/sagui.mp3",
  "audio/suiriri.mp3",
  "fonts/38ab7206.woff2",
  "fonts/629ed6df.woff2",
  "fonts/a6a0f220.woff2",
  "fonts/be7ddd51.woff2",
  "fonts/da68e5bc.woff2",
  "fonts/de4b69f9.woff2",
  "fonts/e615605c.woff2",
  "fonts/e6fd0146.woff2",
  "js/feira.js",
  "js/quiz.js",
  "js/travessia.js",
  "css/extra.css",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/icon.svg"
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS.map((a) => new Request(a, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith('biodiv-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Navegadores (principalmente Safari) pedem áudio em pedaços (Range); o cache precisa responder 206. */
async function rangeResponse(req) {
  const cached = await caches.match(req.url, { ignoreSearch: true });
  if (!cached) return fetch(req);
  const buf = await cached.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
  let start = m && m[1] ? parseInt(m[1], 10) : 0;
  let end = m && m[2] ? parseInt(m[2], 10) : buf.byteLength - 1;
  if (m && !m[1] && m[2]) { start = Math.max(0, buf.byteLength - parseInt(m[2], 10)); end = buf.byteLength - 1; }
  end = Math.min(end, buf.byteLength - 1);
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': cached.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': 'bytes ' + start + '-' + end + '/' + buf.byteLength,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes'
    }
  });
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 4500);
    const res = await fetch(req, { signal: ctl.signal });
    clearTimeout(timer);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = (await cache.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? await cache.match('./index.html') : null);
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.ok) cache.put(req, res.clone());
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.headers.has('range')) { e.respondWith(rangeResponse(req)); return; }
  const isCode = req.mode === 'navigate' || /\.(html|js|css|webmanifest)$/.test(url.pathname) || url.pathname.endsWith('/');
  e.respondWith(isCode ? networkFirst(req) : cacheFirst(req));
});
