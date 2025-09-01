import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export interface RateLimitConfig {
  requests: number;
  window: string; // e.g., '1 m', '1 h', '1 d'
  prefix?: string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

export class RateLimiter {
  private ratelimit: Ratelimit;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    this.ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.requests, config.window as '1 m' | '1 h' | '1 d'),
      prefix: config.prefix || 'alcpn:ratelimit',
    });
  }

  /**
   * Rate limit kontrolü yap
   */
  async checkLimit(identifier: string): Promise<RateLimitResult> {
    try {
      const result = await this.ratelimit.limit(identifier);
      
      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: new Date(result.reset),
        retryAfter: result.success ? undefined : Math.ceil((new Date(result.reset).getTime() - Date.now()) / 1000),
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      // Hata durumunda rate limit'i geç
      return {
        success: true,
        limit: this.config.requests,
        remaining: this.config.requests,
        reset: new Date(Date.now() + 60000), // 1 dakika sonra
      };
    }
  }

  /**
   * Rate limit'i reset et (Redis key'ini sil)
   */
  async resetLimit(identifier: string): Promise<void> {
    try {
      // @upstash/ratelimit'te reset metodu yok, Redis key'ini manuel olarak silelim
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });
      await redis.del(`${this.config.prefix || 'alcpn:ratelimit'}:${identifier}`);
    } catch (error) {
      console.error('Rate limit reset error:', error);
    }
  }

  /**
   * Rate limit istatistikleri
   */
  async getStats(identifier: string): Promise<{
    limit: number;
    remaining: number;
    reset: Date;
  }> {
    try {
      const result = await this.ratelimit.limit(identifier);
      return {
        limit: result.limit,
        remaining: result.remaining,
        reset: new Date(result.reset),
      };
    } catch (error) {
      console.error('Rate limit stats error:', error);
      return {
        limit: this.config.requests,
        remaining: this.config.requests,
        reset: new Date(),
      };
    }
  }
}

// Farklı rate limit türleri için factory fonksiyonları
export function createScrapingRateLimiter(): RateLimiter {
  return new RateLimiter({
    requests: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '60'),
    window: '1 m',
    prefix: 'alcpn:scraping',
  });
}

export function createAPIRateLimiter(): RateLimiter {
  return new RateLimiter({
    requests: 100,
    window: '1 m',
    prefix: 'alcpn:api',
  });
}

export function createAuthRateLimiter(): RateLimiter {
  return new RateLimiter({
    requests: 5,
    window: '1 m',
    prefix: 'alcpn:auth',
  });
}

// Next.js middleware için rate limiter
export function createNextJSRateLimiter() {
  const rateLimiter = createAPIRateLimiter();
  
  return async (req: { ip?: string; connection?: { remoteAddress?: string } }, res: { setHeader: (key: string, value: string | number) => void; status: (code: number) => { json: (data: object) => void } }, next?: () => void) => {
    const identifier = req.ip || req.connection?.remoteAddress || 'unknown';
    const result = await rateLimiter.checkLimit(identifier);
    
    // Rate limit headers ekle
    res.setHeader('X-RateLimit-Limit', result.limit);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.reset.toISOString());
    
    if (!result.success) {
      res.setHeader('Retry-After', result.retryAfter || 60);
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: result.retryAfter,
      });
    }
    
    if (next) {
      next();
    }
  };
}
