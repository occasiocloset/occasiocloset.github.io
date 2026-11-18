/* Occasio · Service worker mínimo: permite instalar la web como app
   (pantalla completa, sin barra del navegador). No guarda nada en caché:
   los datos siempre se piden al servidor. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
