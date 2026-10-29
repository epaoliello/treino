// Modo offline: a página vem da rede quando há sinal (para receber atualizações) e do cache quando não há.
// As bibliotecas e fontes, que nunca mudam, vêm direto do cache.
// A versão principal (/treino/) e a de teste (/treino/teste/) usam caches separados.
const BASE = self.registration.scope.includes("/teste/") ? "treino-teste" : "treino";
const CACHE = BASE + "-v3";
const LIBS = [
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["./", "manifest.webmanifest", "icon-180.png", ...LIBS])));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  const minhas = (k) => k === BASE + "-v1" || k.startsWith(BASE + "-v");
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => minhas(k) && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // A versão principal não responde pelas páginas da versão de teste.
  if (BASE === "treino" && url.pathname.includes("/teste/")) return;
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then((res) => {
      const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match("./"))));
  } else if (/cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com|raw\.githubusercontent\.com/.test(url.host)) {
    e.respondWith(caches.match(req).then((r) => r || fetch(req).then((res) => {
      const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res;
    })));
  }
});
