import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('message', (evento) => {
  if (evento.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
