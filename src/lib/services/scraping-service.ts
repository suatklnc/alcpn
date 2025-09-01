import { ConfigurableScraper, ScrapingRule, ScrapingData } from '../scraping/configurable-scraper';
import { RedisCache } from '../cache/redis-cache';
import { RateLimiter } from '../middleware/rate-limiter';

export interface ScrapingServiceConfig {
  cacheTTL?: number; // seconds
  enableRateLimit?: boolean;
  enableCache?: boolean;
}

export interface ScrapingServiceResult {
  success: boolean;
  data?: ScrapingData;
  error?: string;
  fromCache?: boolean;
  url: string;
  timestamp: number;
  responseTime: number;
}

export class ScrapingService {
  private scraper: ConfigurableScraper;
  private cache: RedisCache;
  private rateLimiter: RateLimiter;
  private config: Required<ScrapingServiceConfig>;

  constructor(config: ScrapingServiceConfig = {}) {
    this.config = {
      cacheTTL: 3600, // 1 hour
      enableRateLimit: true,
      enableCache: true,
      ...config,
    };

    this.scraper = new ConfigurableScraper();
    this.cache = new RedisCache();
    this.rateLimiter = new RateLimiter({
      requests: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '60'),
      window: '1 m',
      prefix: 'alcpn:scraping',
    });

    // Varsayılan scraping kurallarını yükle
    this.loadDefaultRules();
  }

  /**
   * Varsayılan scraping kurallarını yükle
   */
  private loadDefaultRules(): void {
    const defaultRules: ScrapingRule[] = [
      // Hepsiburada
      {
        name: 'hepsiburada',
        urlPattern: 'hepsiburada.com',
        selectors: {
          price: { selector: '.price-value, .price-current, [data-test-id="price-current-price"]', type: 'text' as const },
          title: { selector: '.product-name, h1, [data-test-id="product-name"]', type: 'text' as const },
          availability: { selector: '.stock-status, .availability, [data-test-id="stock-status"]', type: 'text' as const },
          image: { selector: '.product-image img, .gallery-image img', type: 'attr' as const, attribute: 'src' },
        },
        waitForSelector: '.price-value, .price-current',
      },
      // Trendyol
      {
        name: 'trendyol',
        urlPattern: 'trendyol.com',
        selectors: {
          price: { selector: '.prc-dsc, .prc-org, [data-test-id="price-current-price"]', type: 'text' as const },
          title: { selector: '.pr-new-br, h1, [data-test-id="product-name"]', type: 'text' as const },
          availability: { selector: '.stock-status, .availability', type: 'text' as const },
          image: { selector: '.product-image img, .gallery-image img', type: 'attr' as const, attribute: 'src' },
        },
        waitForSelector: '.prc-dsc, .prc-org',
      },
      // N11
      {
        name: 'n11',
        urlPattern: 'n11.com',
        selectors: {
          price: { selector: '.newPrice, .price, [data-test-id="price-current-price"]', type: 'text' as const },
          title: { selector: '.proName, h1, [data-test-id="product-name"]', type: 'text' as const },
          availability: { selector: '.stock-status, .availability', type: 'text' as const },
          image: { selector: '.product-image img, .gallery-image img', type: 'attr' as const, attribute: 'src' },
        },
        waitForSelector: '.newPrice, .price',
      },
      // İnşaat Market
      {
        name: 'insaat-market',
        urlPattern: 'insaatmarket.com',
        selectors: {
          price: { selector: '.price, .current-price, [data-test-id="price-current-price"]', type: 'text' as const },
          title: { selector: '.product-title, h1, [data-test-id="product-name"]', type: 'text' as const },
          availability: { selector: '.stock-status, .availability', type: 'text' as const },
          image: { selector: '.product-image img, .gallery-image img', type: 'attr' as const, attribute: 'src' },
        },
        waitForSelector: '.price, .current-price',
      },
    ];

    defaultRules.forEach(rule => this.scraper.addRule(rule));
  }

  /**
   * URL'den fiyat bilgisi al
   */
  async scrapePrice(url: string, ruleName?: string): Promise<ScrapingServiceResult> {
    const startTime = Date.now();
    
    try {
      // Rate limiting kontrolü
      if (this.config.enableRateLimit) {
        const rateLimitResult = await this.rateLimiter.checkLimit(url);
        if (!rateLimitResult.success) {
          return {
            success: false,
            error: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`,
            url,
            timestamp: Date.now(),
            responseTime: Date.now() - startTime,
          };
        }
      }

      // Cache kontrolü
      if (this.config.enableCache) {
        const cacheKey = `scraping:${url}`;
        const cached = await this.cache.get<ScrapingData>(cacheKey);
        
        if (cached) {
          return {
            success: true,
            data: cached.data,
            fromCache: true,
            url,
            timestamp: Date.now(),
            responseTime: Date.now() - startTime,
          };
        }
      }

      // Scraping yap
      const result = ruleName 
        ? await this.scraper.scrapeWithRule(ruleName, url)
        : await this.scraper.scrape(url);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          url,
          timestamp: Date.now(),
          responseTime: Date.now() - startTime,
        };
      }

      const data = result.data as ScrapingData;

      // Sonucu cache'e kaydet
      if (this.config.enableCache && data) {
        const cacheKey = `scraping:${url}`;
        await this.cache.set(cacheKey, data, this.config.cacheTTL);
      }

      return {
        success: true,
        data,
        fromCache: false,
        url,
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        url,
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Toplu fiyat scraping
   */
  async scrapeMultiplePrices(urls: string[]): Promise<ScrapingServiceResult[]> {
    const results: ScrapingServiceResult[] = [];
    
    // Paralel scraping (rate limiting için batch'ler halinde)
    const batchSize = 3;
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(url => this.scrapePrice(url))
      );
      results.push(...batchResults);
      
      // Batch'ler arası kısa bekleme
      if (i + batchSize < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return results;
  }

  /**
   * Scraping kuralı ekle
   */
  addRule(rule: ScrapingRule): void {
    this.scraper.addRule(rule);
  }

  /**
   * Scraping kuralını kaldır
   */
  removeRule(ruleName: string): void {
    this.scraper.removeRule(ruleName);
  }

  /**
   * Tüm kuralları getir
   */
  getRules(): ScrapingRule[] {
    return this.scraper.getRules();
  }

  /**
   * Cache'i temizle
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  /**
   * Belirli URL'nin cache'ini temizle
   */
  async clearCacheForUrl(url: string): Promise<void> {
    const cacheKey = `scraping:${url}`;
    await this.cache.delete(cacheKey);
  }

  /**
   * Rate limit istatistikleri
   */
  async getRateLimitStats(identifier: string): Promise<{
    limit: number;
    remaining: number;
    reset: Date;
  }> {
    return this.rateLimiter.getStats(identifier);
  }

  /**
   * Cache istatistikleri
   */
  async getCacheStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
  }> {
    return this.cache.getStats();
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    await this.scraper.cleanup();
  }
}

// Singleton instance
let scrapingServiceInstance: ScrapingService | null = null;

export function getScrapingService(): ScrapingService {
  if (!scrapingServiceInstance) {
    scrapingServiceInstance = new ScrapingService();
  }
  return scrapingServiceInstance;
}
