const API_BASE = '/api';

// In-memory cache for GET requests.
// Key: API path. Value: { data, expiresAt }.
// Survives across re-renders and screen navigations within the same session,
// so users on mobile data don't re-fetch the same data when going back and forth
// between Home → Provider Profile → Home, etc.
interface CacheEntry {
  data: unknown;
  expiresAt: number;
  promise?: Promise<unknown>;
}
const cache = new Map<string, CacheEntry>();

// Tracks requests currently in-flight so we don't fire duplicate fetches
// when multiple components mount at the same time.
const inflight = new Map<string, Promise<unknown>>();

// ─────────────────────────────────────────────────────────────
// Offline resilience
// ─────────────────────────────────────────────────────────────
// The app must keep working when the device drops connectivity:
//   • Cached GET responses are also mirrored to localStorage so they
//     survive a full page reload (mobile tab swap, app kill, etc.).
//   • When `navigator.onLine === false`, GETs skip the network entirely
//     and return cached data if present (or throw an OFFLINE error if not).
//   • Mutating operations (POST/PUT/PATCH/DELETE) require real network.
//     If they fail because of connectivity, a single toast is shown so the
//     user knows their action didn't go through. We deliberately don't toast
//     for GET failures — the UI already shows cached/empty states.

const LS_CACHE_KEY = 'sintha_api_cache_v1';
const LS_CACHE_MAX_ENTRIES = 60; // keep localStorage bounded

/** Load the persisted cache mirror from localStorage on module init. */
function loadPersistedCache(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(LS_CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Array<{
      path: string;
      data: unknown;
      expiresAt: number;
    }>;
    const now = Date.now();
    for (const entry of parsed) {
      // Drop expired entries on load
      if (entry.expiresAt > now) {
        cache.set(entry.path, {
          data: entry.data,
          expiresAt: entry.expiresAt,
        });
      }
    }
  } catch {
    // Ignore malformed cache
  }
}

/** Persist the current in-memory cache to localStorage (debounced). */
let persistTimer: ReturnType<typeof setTimeout> | null = null;
function persistCache(): void {
  if (typeof window === 'undefined') return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      const now = Date.now();
      const entries: Array<{ path: string; data: unknown; expiresAt: number }> = [];
      // Only persist entries that haven't expired yet
      for (const [path, entry] of cache.entries()) {
        if (entry.expiresAt > now) {
          entries.push({ path, data: entry.data, expiresAt: entry.expiresAt });
        }
        if (entries.length >= LS_CACHE_MAX_ENTRIES) break;
      }
      localStorage.setItem(LS_CACHE_KEY, JSON.stringify(entries));
    } catch {
      // localStorage full or unavailable — drop silently
    }
  }, 500);
}

loadPersistedCache();

/**
 * Show a "No internet" toast. Imported lazily through a getter so we don't
 * create a circular dependency with React hooks.
 */
let toastShower: ((title: string, description?: string) => void) | null = null;
export function setOfflineToastShower(fn: (title: string, description?: string) => void): void {
  toastShower = fn;
}

let lastOfflineToastAt = 0;
function showOfflineToast(): void {
  // Throttle — at most one toast every 4 seconds. Otherwise a flaky
  // connection spamming retries would lock the toast queue.
  const now = Date.now();
  if (now - lastOfflineToastAt < 4000) return;
  lastOfflineToastAt = now;
  if (toastShower) {
    toastShower('No internet connection', 'Please check your network and try again.');
  }
}

/** Sentinel error class so callers can detect offline/network failures. */
export class NetworkError extends Error {
  constructor(message = 'Network error') {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Fetch JSON from the SINTHA API with optional caching.
 *
 * Usage:
 *   - GET endpoints that don't change often (categories, providers list):
 *       apiFetch('/categories', { cacheTtl: 60_000 })
 *     → Returns cached data instantly if available, fetches fresh in background
 *     after TTL expires (stale-while-revalidate pattern).
 *
 *   - Mutating endpoints (POST/PUT/PATCH/DELETE):
 *       Don't pass cacheTtl. Each call always hits the network.
 *
 *   - Always-fresh GET (bookings, messages, notifications):
 *       Don't pass cacheTtl. Each call always hits the network.
 *
 * Offline behaviour:
 *   - If `navigator.onLine === false`:
 *       • GET with cacheTtl: returns cached data (or throws NetworkError).
 *       • GET without cacheTtl: throws NetworkError.
 *       • Mutations: throws NetworkError and shows a "No internet" toast.
 *   - If fetch throws (DNS down, connection refused, etc.):
 *       • Same handling as offline — return cached data for GETs, toast for mutations.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit & { cacheTtl?: number }
): Promise<T> {
  const method = (options?.method || 'GET').toUpperCase();
  const cacheTtl = options?.cacheTtl;
  const isMutation = method !== 'GET';
  const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;

  // Fast-fail mutations when offline — don't even attempt the fetch
  if (isMutation && !isOnline) {
    showOfflineToast();
    throw new NetworkError('Device is offline');
  }

  // Only cache GET requests with cacheTtl > 0
  const canCache = method === 'GET' && cacheTtl && cacheTtl > 0;

  if (canCache) {
    const cached = cache.get(path);
    const now = Date.now();

    if (cached) {
      // Cache hit (fresh or stale). If we're offline, return immediately
      // without attempting revalidation — there's no network to revalidate with.
      if (!isOnline) {
        return cached.data as T;
      }

      if (cached.expiresAt > now) {
        // Cache is fresh — return instantly, no network call
        return cached.data as T;
      }

      // Cache is stale — serve stale data immediately, but revalidate in background
      // (stale-while-revalidate). Don't await the revalidation.
      if (!inflight.has(path)) {
        const revalidation = fetch(`${API_BASE}${path}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
          },
        })
          .then(async (res) => {
            if (res.ok) {
              const data = await res.json();
              cache.set(path, {
                data,
                expiresAt: Date.now() + (cacheTtl as number),
              });
              persistCache();
            }
          })
          .catch(() => {
            // Network failed — keep serving stale data, try again next time
          })
          .finally(() => {
            inflight.delete(path);
          });
        inflight.set(path, revalidation);
      }

      return cached.data as T;
    }

    // No cache yet — if offline, we have nothing to return
    if (!isOnline) {
      throw new NetworkError('Device is offline and no cached data available');
    }

    // No cache, no in-flight — make the request
    if (inflight.has(path)) {
      return (await inflight.get(path)) as T;
    }

    const promise = fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          const error = await res.json().catch(() => ({ error: 'Request failed' }));
          // Include `detail` if the server provided it (helps debugging
          // auth/sync errors where the generic message is unhelpful)
          const msg = error.detail
            ? `${error.error} (${error.detail})`
            : error.error || 'Request failed';
          throw new Error(msg);
        }
        return res.json();
      })
      .then((data) => {
        cache.set(path, {
          data,
          expiresAt: Date.now() + (cacheTtl as number),
        });
        persistCache();
        return data;
      })
      .catch((err) => {
        // Network failure (not an HTTP error response — those were thrown above
        // and re-caught here). Show toast? No — for cached GETs the UI will show
        // an empty state. The user can retry.
        if (err instanceof TypeError && err.message.includes('fetch')) {
          // Bare network failure — convert to NetworkError so callers can detect it
          throw new NetworkError('Network request failed');
        }
        throw err;
      })
      .finally(() => {
        inflight.delete(path);
      });

    inflight.set(path, promise);
    return (await promise) as T;
  }

  // Non-cached path (POST, PUT, DELETE, or GET without cacheTtl)
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      // CRITICAL: Disable browser HTTP cache for non-cached requests.
      // Without this, the browser may serve stale GET responses (e.g.,
      // the admin users list) even after a DELETE succeeds on the server.
      // This was causing deleted users to reappear in the admin panel.
      cache: 'no-store',
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }));
      const msg = error.detail
        ? `${error.error} (${error.detail})`
        : error.error || 'Request failed';
      throw new Error(msg);
    }

    // Invalidate cache for related GET endpoints after a successful mutation.
    // E.g., after POST /bookings, clear cached GET /bookings so next visit is fresh.
    if (method !== 'GET') {
      invalidateRelatedCache(path);
    }

    return res.json();
  } catch (err) {
    // Detect bare network failures (offline, DNS down, server unreachable)
    const isNetworkFailure =
      err instanceof TypeError ||
      (err instanceof Error && err.message.toLowerCase().includes('failed to fetch'));

    if (isNetworkFailure) {
      if (isMutation) {
        showOfflineToast();
      }
      throw new NetworkError(
        isOnline
          ? 'Could not reach the server. Please check your connection.'
          : 'Device is offline'
      );
    }
    throw err;
  }
}

/**
 * Clear cached GET responses that are related to a mutated resource.
 * Called automatically after POST/PUT/PATCH/DELETE.
 */
function invalidateRelatedCache(mutatedPath: string): void {
  // Extract the resource type from the path, e.g. "/bookings/123" → "bookings"
  const match = mutatedPath.match(/^\/?([a-z-]+)/i);
  if (!match) return;
  const resourceType = match[1];

  // Clear all cached entries whose path starts with this resource type
  for (const key of cache.keys()) {
    if (key.startsWith(`/${resourceType}`) || key.startsWith(resourceType)) {
      cache.delete(key);
    }
  }

  // Also clear "list" caches that would include this resource
  // (e.g., after creating a booking, the providers list count changes)
  if (resourceType === 'bookings') {
    cache.delete('/providers');
    cache.delete('/providers?sort=featured');
  }

  persistCache();
}

/**
 * Manually clear the entire cache. Useful after logout.
 */
export function clearApiCache(): void {
  cache.clear();
  inflight.clear();
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(LS_CACHE_KEY);
    } catch {
      // Ignore
    }
  }
}
