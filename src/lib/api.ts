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
 */
export async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit & { cacheTtl?: number }
): Promise<T> {
  const method = (options?.method || 'GET').toUpperCase();
  const cacheTtl = options?.cacheTtl;

  // Only cache GET requests with cacheTtl > 0
  const canCache = method === 'GET' && cacheTtl && cacheTtl > 0;

  if (canCache) {
    const cached = cache.get(path);
    const now = Date.now();

    if (cached) {
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

    // No cache yet — if a request is already in-flight, wait for it
    if (inflight.has(path)) {
      return (await inflight.get(path)) as T;
    }

    // No cache, no in-flight — make the request
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
          throw new Error(error.error || 'Request failed');
        }
        return res.json();
      })
      .then((data) => {
        cache.set(path, {
          data,
          expiresAt: Date.now() + (cacheTtl as number),
        });
        return data;
      })
      .finally(() => {
        inflight.delete(path);
      });

    inflight.set(path, promise);
    return (await promise) as T;
  }

  // Non-cached path (POST, PUT, DELETE, or GET without cacheTtl)
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  // Invalidate cache for related GET endpoints after a successful mutation.
  // E.g., after POST /bookings, clear cached GET /bookings so next visit is fresh.
  if (method !== 'GET') {
    invalidateRelatedCache(path);
  }

  return res.json();
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
}

/**
 * Manually clear the entire cache. Useful after logout.
 */
export function clearApiCache(): void {
  cache.clear();
  inflight.clear();
}
