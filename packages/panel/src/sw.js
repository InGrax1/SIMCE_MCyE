import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
const paginaPanel = createHandlerBoundToURL('/panel/index.html');

self.addEventListener('fetch', (evento) => {
  const url = new URL(evento.request.url);
  if (
    evento.request.mode === 'navigate' &&
    url.origin === self.location.origin &&
    url.pathname.startsWith('/panel/') &&
    !['/panel/', '/panel/index.html'].includes(url.pathname)
  )
    evento.respondWith(paginaPanel({ event: evento }));
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(self.clients.claim());
});
