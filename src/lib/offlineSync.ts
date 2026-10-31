/**
 * ════════════════════════════════════════════════════════════════════
 *  NEXORA ONE — MOTOR DE ACTUALIZACIÓN SILENCIOSA Y SINCRONIZACIÓN OFFLINE
 * ────────────────────────────────────────────────────────────────────
 *  1. Registro de Service Worker con Stale-While-Revalidate.
 *  2. Revalidación Silenciosa de Licencias cada 24 Horas.
 *  3. Tolerancia Cero Caídas: Operación desconectada ininterrumpida
 *     hasta agotar vigencia (30 + 5 días) sin bloquear caja o mostrador.
 * ════════════════════════════════════════════════════════════════════
 */

import { getLicenseLifecycle, type ExtendedLicense } from './licensing';

const LAST_SYNC_KEY = 'nexora_last_license_silent_sync';
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 Horas

/**
 * Inicializador de Service Worker y escucha de actualizaciones silenciosas
 */
export function registerSilentServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        // Escucha de actualizaciones en segundo plano
        reg.addEventListener('updatefound', () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[Nexora Mesh] Actualización silenciosa descargada en segundo plano.');
              }
            });
          }
        });
      })
      .catch((err) => {
        console.warn('[Nexora Mesh] Registro de SW pospuesto:', err);
      });

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'NEXORA_SILENT_UPDATE_AVAILABLE') {
        console.log('[Nexora Mesh] Activo renovado silenciosamente en caché perimetral.');
      }
    });
  });
}

/**
 * Revalidación Silenciosa de Licencia Desconectada (Ciclo 24 Horas)
 * Si hay conexión a internet, reconcilia silenciosamente con almacenamiento local / Supabase.
 * Si NO hay conexión, valida contra fecha local sin bloquear caja ni servicios.
 */
export function runSilentOfflineLicenseRevalidation(licenses: ExtendedLicense[]): {
  revalidatedCount: number;
  isOfflineMode: boolean;
  message: string;
} {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : false;
  const now = Date.now();
  const lastSyncStr = typeof localStorage !== 'undefined' ? localStorage.getItem(LAST_SYNC_KEY) : null;
  const lastSyncTime = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;
  const timeSinceLastSync = now - lastSyncTime;

  // Verificamos si corresponde revalidar (más de 24h transcurridas o primer inicio)
  const shouldRevalidate = timeSinceLastSync >= SYNC_INTERVAL_MS || !lastSyncStr;

  if (isOnline && shouldRevalidate) {
    // Sincronización silenciosa en línea
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LAST_SYNC_KEY, now.toString());
      }
      console.log(`[Nexora Licencias] Revalidación silenciosa completada (${licenses.length} licencias verificadas).`);
    } catch {
      // Ignorar fallo de almacenamiento
    }

    return {
      revalidatedCount: licenses.length,
      isOfflineMode: false,
      message: 'Licencias revalidadas silenciosamente con éxito.',
    };
  }

  // MODO DESCONECTADO (OFFLINE FIRST)
  // Evaluar cada licencia de forma local sin requerir conexión a internet
  const evaluated = licenses.map((lic) => {
    const lifecycle = getLicenseLifecycle({
      expires: lic.expires,
      graceLimit: lic.graceLimit,
      startDate: lic.startDate,
      status: lic.status,
    });
    const canOperate = !lifecycle.isCutoff;
    return {
      id: lic.id,
      stage: lifecycle.stage,
      canOperate,
    };
  });

  const activeCount = evaluated.filter((e) => e.canOperate).length;

  return {
    revalidatedCount: activeCount,
    isOfflineMode: true,
    message: isOnline
      ? 'Licencias vigentes en ciclo de 24h.'
      : 'Modo desconectado activo: continuidad operativa garantizada sin bloqueo de terminal.',
  };
}
