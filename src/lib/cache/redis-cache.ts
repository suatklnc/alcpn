import { Redis } from '@upstash/redis';

export interface CacheConfig {
  defaultTTL?: number; // seconds
  keyPrefix?: string;
}

export interface CacheResult<T> {
  data: T;
  fromCache: boolean;
  ttl?: number;
}

export class RedisCache {
  private redis: Redis;
  private config: Required<CacheConfig>;

  constructor(config: CacheConfig = {}) {
    this.config = {
      defaultTTL: 3600, // 1 hour
      keyPrefix: 'alcpn:',
      ...config,
    };

    // Redis client'ı oluştur
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }

  /**
   * Cache key oluştur
   */
  private createKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  /**
   * Veriyi cache'e kaydet
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const cacheKey = this.createKey(key);
    const ttlSeconds = ttl || this.config.defaultTTL;
    
    try {
      await this.redis.setex(cacheKey, ttlSeconds, JSON.stringify(data));
    } catch (error) {
      console.error('Redis set error:', error);
      // Cache hatası uygulamayı durdurmasın
    }
  }

  /**
   * Cache'den veri al
   */
  async get<T>(key: string): Promise<CacheResult<T> | null> {
    const cacheKey = this.createKey(key);
    
    try {
      const cached = await this.redis.get(cacheKey);
      
      if (cached === null) {
        return null;
      }

      const data = JSON.parse(cached as string) as T;
      const ttl = await this.redis.ttl(cacheKey);
      
      return {
        data,
        fromCache: true,
        ttl: ttl > 0 ? ttl : undefined,
      };
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  /**
   * Cache'den veri al, yoksa fonksiyonu çalıştır ve sonucu cache'e kaydet
   */
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl?: number
  ): Promise<CacheResult<T>> {
    // Önce cache'den kontrol et
    const cached = await this.get<T>(key);
    if (cached) {
      return cached;
    }

    // Cache'de yoksa fonksiyonu çalıştır
    const data = await fetchFunction();
    
    // Sonucu cache'e kaydet
    await this.set(key, data, ttl);
    
    return {
      data,
      fromCache: false,
    };
  }

  /**
   * Cache'den veri sil
   */
  async delete(key: string): Promise<void> {
    const cacheKey = this.createKey(key);
    
    try {
      await this.redis.del(cacheKey);
    } catch (error) {
      console.error('Redis delete error:', error);
    }
  }

  /**
   * Pattern'e uygun tüm key'leri sil
   */
  async deletePattern(pattern: string): Promise<void> {
    const searchPattern = this.createKey(pattern);
    
    try {
      const keys = await this.redis.keys(searchPattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Redis delete pattern error:', error);
    }
  }

  /**
   * Cache'i temizle
   */
  async clear(): Promise<void> {
    try {
      await this.deletePattern('*');
    } catch (error) {
      console.error('Redis clear error:', error);
    }
  }

  /**
   * Cache istatistikleri
   */
  async getStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    hitRate?: number;
  }> {
    try {
      const keys = await this.redis.keys(this.createKey('*'));
      
      return {
        totalKeys: keys.length,
        memoryUsage: 'Unknown',
      };
    } catch (error) {
      console.error('Redis stats error:', error);
      return {
        totalKeys: 0,
        memoryUsage: 'Unknown',
      };
    }
  }

  /**
   * Cache key'inin TTL'sini kontrol et
   */
  async getTTL(key: string): Promise<number> {
    const cacheKey = this.createKey(key);
    
    try {
      return await this.redis.ttl(cacheKey);
    } catch (error) {
      console.error('Redis TTL error:', error);
      return -1;
    }
  }

  /**
   * Cache key'inin TTL'sini güncelle
   */
  async updateTTL(key: string, ttl: number): Promise<void> {
    const cacheKey = this.createKey(key);
    
    try {
      await this.redis.expire(cacheKey, ttl);
    } catch (error) {
      console.error('Redis update TTL error:', error);
    }
  }
}

// Singleton instance
let redisCacheInstance: RedisCache | null = null;

export function getRedisCache(): RedisCache {
  if (!redisCacheInstance) {
    redisCacheInstance = new RedisCache();
  }
  return redisCacheInstance;
}
