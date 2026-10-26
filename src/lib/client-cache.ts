// ページをまたいで共有されるインメモリキャッシュ（TTL付き）
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL = 30_000; // 30秒

export async function cachedFetch<T>(
  url: string,
  ttl = DEFAULT_TTL,
  fetchInit?: RequestInit
): Promise<T> {
  const now = Date.now();
  const hit = cache.get(url);
  if (hit && hit.expiresAt > now) {
    return hit.data as T;
  }

  const res = await fetch(url, fetchInit);
  if (!res.ok) throw new Error(`fetch failed: ${res.status} ${url}`);
  const data: T = await res.json();

  cache.set(url, { data, expiresAt: now + ttl });
  return data;
}

export function invalidateCache(urlPrefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(urlPrefix)) cache.delete(key);
  }
}
