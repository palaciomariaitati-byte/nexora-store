/**
 * ════════════════════════════════════════════════════════════════════
 *  NEXORA ONE — SERVICE WORKER SOBERANO (v2026.1)
 * ────────────────────────────────────────────────────────────────────
 *  Arquitectura: Local-First Offline Mesh
 *  Estrategia de Caché: Stale-While-Revalidate con Actualización Silenciosa
 *  Persistencia: Cero telemetría externa. Datos en hardware del cliente.
 * ════════════════════════════════════════════════════════════════════
 */

const CACHE_NAME = 'nexora-one-v2026.1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/brand/logo-full.png?v=2026',
  '/brand/logo-transparent.png',
  '/brand/nexora-logo.png',
  '/downloads/nexora-induction-kit.json'
];

// 1. INSTALACIÓN INMEDIATA (SKIP WAITING)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Pre-cacheo de activos esenciales sin bloquear
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[Nexora SW] Advertencia en pre-cacheo inicial:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. ACTIVACIÓN Y PURGA DE VERSIONES ANTERIORES
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key.startsWith('nexora-')) {
            console.log('[Nexora SW] Purgando versión obsoleta de caché:', key);
            return caches.delete(key);
          }
          return Promise.resolve(true);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. ESTRATEGIA STALE-WHILE-REVALIDATE (ACTUALIZACIÓN SILENCIOSA)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo gestionar peticiones HTTP(S) y del mismo origen o CDNs de fuentes
  if (req.method !== 'GET' || (!url.protocol.startsWith('http'))) {
    return;
  }

  // Si es una petición a APIs externas de terceros o supabase, permitir paso directo
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(req);

      // Lanzar actualización en segundo plano (Revalidate)
      const fetchPromise = fetch(req).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          cache.put(req, networkResponse.clone());

          // Notificar actualización silenciosa a clientes si hay cambio de versión
          self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: 'NEXORA_SILENT_UPDATE_AVAILABLE',
                cacheName: CACHE_NAME,
                url: req.url,
                timestamp: Date.now()
              });
            });
          });
        }
        return networkResponse;
      }).catch((err) => {
        // En ausencia de red, continuar con la copia de caché
        return cachedResponse;
      });

      // Stale-While-Revalidate: Responder de inmediato con la caché si existe, o esperar a la red
      return cachedResponse || fetchPromise;
    })
  );
});

// 4. VALIDACIÓN DE LICENCIAS DESCONECTADA Y MENSAJERÍA PERIMETRAL
self.addEventListener('message', (event) => {
  if (!event.data) return;

  // Forzar actualización silenciosa sin recarga agresiva
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Consulta de estado offline
  if (event.data.type === 'CHECK_OFFLINE_HEALTH') {
    event.source.postMessage({
      type: 'OFFLINE_HEALTH_STATUS',
      status: 'SOVEREIGN_OPERATIONAL',
      mode: 'Local-First Mesh Runtime',
      version: 'v2026.1',
      online: navigator.onLine
    });
  }
});

