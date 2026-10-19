/**
 * Single guarded registrar for the offline service worker.
 * Never registers in dev, inside an iframe, or in Lovable preview hosts —
 * offline mode only comes alive on the published app.
 */
const SW_URL = "/sw.js";

function isRefusedContext() {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  if (window.self !== window.top) return true;

  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return true;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return true;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return true;
  if (new URL(window.location.href).searchParams.get("sw") === "off") return true;
  return false;
}

async function unregisterAppWorkers() {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    registrations
      .filter((r) => (r.active?.scriptURL ?? r.installing?.scriptURL ?? "").endsWith(SW_URL))
      .map((r) => r.unregister()),
  );
}

export async function setupOfflineSupport(enabled: boolean) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  if (!enabled || isRefusedContext()) {
    await unregisterAppWorkers();
    return;
  }
  try {
    await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  } catch {
    /* offline mode is best-effort */
  }
}

/** Warm the artwork/audio caches for things the listener opened recently. */
export async function prefetchForOffline(urls: string[]) {
  if (typeof window === "undefined" || urls.length === 0) return;
  await Promise.allSettled(
    urls.slice(0, 60).map((url) => fetch(url, { mode: "no-cors", cache: "force-cache" })),
  );
}

export async function clearOfflineCaches() {
  if (typeof caches === "undefined") return;
  const keys = await caches.keys();
  await Promise.allSettled(
    keys.filter((k) => k.startsWith("reson8-")).map((k) => caches.delete(k)),
  );
}

export async function estimateOfflineUsage() {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  const { usage } = await navigator.storage.estimate();
  return usage ?? null;
}
