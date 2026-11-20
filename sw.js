// Service worker: guarda la app en el dispositivo para que abra sin conexión.
// Los DATOS no pasan por aquí: viven en IndexedDB, que funciona sin red.

const CACHE = 'gastos-v1';

const ARCHIVOS = [
  './',
  './index.html',
  './app.css',
  './manifest.webmanifest',
  './js/app.js',
  './js/apuntar.js',
  './js/backup.js',
  './js/categorias.js',
  './js/comun.js',
  './js/copia.js',
  './js/estado.js',
  './js/movimientos.js',
  './js/repo.js',
  './js/resumen.js',
  './icons/icono-180.png',
  './icons/icono-192.png',
  './icons/icono-512.png',
  './icons/icono-maskable-512.png',
];

// Al instalar, guardar toda la app.
self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ARCHIVOS)).then(() => self.skipWaiting()),
  );
});

// Al activar una versión nueva, tirar las anteriores.
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nombres) => Promise.all(nombres.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

// Primero lo guardado (así abre al instante y sin conexión); si no está, a la red.
self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  if (peticion.method !== 'GET' || new URL(peticion.url).origin !== self.location.origin) return;

  if (peticion.mode === 'navigate') {
    evento.respondWith(caches.match('./index.html').then((guardada) => guardada || fetch(peticion)));
    return;
  }

  evento.respondWith(
    caches.match(peticion).then(
      (guardada) =>
        guardada ||
        fetch(peticion).then((respuesta) => {
          if (respuesta.ok) {
            const copia = respuesta.clone();
            caches.open(CACHE).then((cache) => cache.put(peticion, copia));
          }
          return respuesta;
        }),
    ),
  );
});
