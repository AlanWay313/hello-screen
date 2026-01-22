import { useState, useEffect, useCallback, useRef } from "react";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface UseCachedDataOptions {
  /** Tempo em milissegundos para considerar o cache válido (default: 5 minutos) */
  cacheTime?: number;
  /** Chave única para o cache */
  cacheKey: string;
  /** Se deve buscar automaticamente ao montar */
  enabled?: boolean;
}

const cache = new Map<string, CacheEntry<any>>();

export function useCachedData<T>(
  fetchFn: () => Promise<T>,
  options: UseCachedDataOptions
) {
  const { cacheTime = 5 * 60 * 1000, cacheKey, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const isMounted = useRef(true);

  const isCacheValid = useCallback(() => {
    const entry = cache.get(cacheKey);
    if (!entry) return false;
    return Date.now() - entry.timestamp < cacheTime;
  }, [cacheKey, cacheTime]);

  const fetchData = useCallback(async (forceRefresh = false) => {
    // Verificar cache
    if (!forceRefresh && isCacheValid()) {
      const entry = cache.get(cacheKey);
      if (entry) {
        setData(entry.data);
        setLastUpdated(new Date(entry.timestamp));
        return entry.data;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      
      if (isMounted.current) {
        // Salvar no cache
        const timestamp = Date.now();
        cache.set(cacheKey, { data: result, timestamp });
        
        setData(result);
        setLastUpdated(new Date(timestamp));
      }
      
      return result;
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error("Erro desconhecido"));
      }
      throw err;
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [cacheKey, fetchFn, isCacheValid]);

  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  const invalidateCache = useCallback(() => {
    cache.delete(cacheKey);
  }, [cacheKey]);

  useEffect(() => {
    isMounted.current = true;
    
    if (enabled) {
      fetchData();
    }

    return () => {
      isMounted.current = false;
    };
  }, [enabled, fetchData]);

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    refresh,
    invalidateCache,
    isCached: isCacheValid(),
  };
}

// Utilitário para limpar todo o cache
export function clearAllCache() {
  cache.clear();
}

// Utilitário para limpar cache por prefixo
export function clearCacheByPrefix(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}
