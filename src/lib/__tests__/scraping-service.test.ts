// Mock cheerio before importing anything that uses it
jest.mock('cheerio', () => ({
  load: jest.fn(() => ({
    first: jest.fn(() => ({
      length: 1,
      text: jest.fn(() => '100 TL'),
      attr: jest.fn(() => 'test.jpg'),
    })),
  })),
}));

// Mock @upstash/redis
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn(() => ({
    setex: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    info: jest.fn(),
    ttl: jest.fn(),
    expire: jest.fn(),
  })),
  Ratelimit: jest.fn(() => ({
    limit: jest.fn(),
    reset: jest.fn(),
  })),
}));

import { ScrapingService } from '../services/scraping-service';
import { ConfigurableScraper } from '../scraping/configurable-scraper';
import { RedisCache } from '../cache/redis-cache';
import { RateLimiter } from '../middleware/rate-limiter';

// Mock dependencies
jest.mock('../scraping/configurable-scraper');
jest.mock('../cache/redis-cache');
jest.mock('../middleware/rate-limiter');

describe('ScrapingService', () => {
  let scrapingService: ScrapingService;
  let mockScraper: jest.Mocked<ConfigurableScraper>;
  let mockCache: jest.Mocked<RedisCache>;
  let mockRateLimiter: jest.Mocked<RateLimiter>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock instances
    mockScraper = {
      addRule: jest.fn(),
      removeRule: jest.fn(),
      getRules: jest.fn().mockReturnValue([]),
      scrapeWithRule: jest.fn(),
      scrape: jest.fn(),
      cleanup: jest.fn(),
    } as jest.Mocked<ConfigurableScraper>;

    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      getStats: jest.fn().mockResolvedValue({
        totalKeys: 0,
        memoryUsage: '0B',
      }),
    } as jest.Mocked<RedisCache>;

    mockRateLimiter = {
      checkLimit: jest.fn(),
      resetLimit: jest.fn(),
      getStats: jest.fn().mockResolvedValue({
        limit: 60,
        remaining: 60,
        reset: new Date(),
      }),
    } as jest.Mocked<RateLimiter>;

    // Mock constructors
    (ConfigurableScraper as jest.Mock).mockImplementation(() => mockScraper);
    (RedisCache as jest.Mock).mockImplementation(() => mockCache);
    (RateLimiter as jest.Mock).mockImplementation(() => mockRateLimiter);

    scrapingService = new ScrapingService({
      enableCache: true,
      enableRateLimit: true,
      cacheTTL: 3600,
    });
  });

  afterEach(async () => {
    await scrapingService.cleanup();
  });

  describe('scrapePrice', () => {
    it('should return cached result when available', async () => {
      const url = 'https://example.com/product';
      const cachedData = {
        price: 100,
        title: 'Test Product',
        url,
        timestamp: Date.now(),
      };

      mockRateLimiter.checkLimit.mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: new Date(),
      });

      mockCache.get.mockResolvedValue({
        data: cachedData,
        fromCache: true,
      });

      const result = await scrapingService.scrapePrice(url);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(cachedData);
      expect(result.fromCache).toBe(true);
      expect(mockCache.get).toHaveBeenCalledWith(`scraping:${url}`);
      expect(mockScraper.scrape).not.toHaveBeenCalled();
    });

    it('should scrape and cache result when not in cache', async () => {
      const url = 'https://example.com/product';
      const scrapedData = {
        price: 100,
        title: 'Test Product',
        url,
        timestamp: Date.now(),
      };

      mockRateLimiter.checkLimit.mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: new Date(),
      });

      mockCache.get.mockResolvedValue(null);
      mockScraper.scrape.mockResolvedValue({
        success: true,
        data: scrapedData,
        url,
        timestamp: Date.now(),
        responseTime: 1000,
      });

      const result = await scrapingService.scrapePrice(url);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(scrapedData);
      expect(result.fromCache).toBe(false);
      expect(mockScraper.scrape).toHaveBeenCalledWith(url);
      expect(mockCache.set).toHaveBeenCalledWith(`scraping:${url}`, scrapedData, 3600);
    });

    it('should respect rate limiting', async () => {
      const url = 'https://example.com/product';

      mockRateLimiter.checkLimit.mockResolvedValue({
        success: false,
        limit: 60,
        remaining: 0,
        reset: new Date(Date.now() + 60000),
        retryAfter: 60,
      });

      const result = await scrapingService.scrapePrice(url);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
      expect(mockScraper.scrape).not.toHaveBeenCalled();
    });

    it('should handle scraping errors', async () => {
      const url = 'https://example.com/product';

      mockRateLimiter.checkLimit.mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: new Date(),
      });

      mockCache.get.mockResolvedValue(null);
      mockScraper.scrape.mockResolvedValue({
        success: false,
        error: 'Scraping failed',
        url,
        timestamp: Date.now(),
        responseTime: 1000,
      });

      const result = await scrapingService.scrapePrice(url);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Scraping failed');
    });
  });

  describe('scrapeMultiplePrices', () => {
    it('should scrape multiple URLs in batches', async () => {
      const urls = [
        'https://example.com/product1',
        'https://example.com/product2',
        'https://example.com/product3',
      ];

      mockRateLimiter.checkLimit.mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: new Date(),
      });

      mockCache.get.mockResolvedValue(null);
      mockScraper.scrape.mockResolvedValue({
        success: true,
        data: { price: 100, url: 'test', timestamp: Date.now() },
        url: 'test',
        timestamp: Date.now(),
        responseTime: 1000,
      });

      const results = await scrapingService.scrapeMultiplePrices(urls);

      expect(results).toHaveLength(3);
      expect(mockScraper.scrape).toHaveBeenCalledTimes(3);
    });
  });

  describe('rule management', () => {
    it('should add scraping rule', () => {
      const rule = {
        name: 'test-rule',
        url: 'example.com',
        selectors: {
          price: '.price',
        },
      };

      scrapingService.addRule(rule);

      expect(mockScraper.addRule).toHaveBeenCalledWith(rule);
    });

    it('should remove scraping rule', () => {
      scrapingService.removeRule('test-rule');

      expect(mockScraper.removeRule).toHaveBeenCalledWith('test-rule');
    });

    it('should get all rules', () => {
      const rules = [
        {
          name: 'rule1',
          url: 'example1.com',
          selectors: { price: '.price' },
        },
      ];

      mockScraper.getRules.mockReturnValue(rules as ScrapingRule[]);

      const result = scrapingService.getRules();

      expect(result).toEqual(rules);
    });
  });

  describe('cache management', () => {
    it('should clear all cache', async () => {
      await scrapingService.clearCache();

      expect(mockCache.clear).toHaveBeenCalled();
    });

    it('should clear cache for specific URL', async () => {
      const url = 'https://example.com/product';
      await scrapingService.clearCacheForUrl(url);

      expect(mockCache.delete).toHaveBeenCalledWith(`scraping:${url}`);
    });

    it('should get cache stats', async () => {
      const stats = {
        totalKeys: 10,
        memoryUsage: '1MB',
      };

      mockCache.getStats.mockResolvedValue(stats);

      const result = await scrapingService.getCacheStats();

      expect(result).toEqual(stats);
    });
  });

  describe('rate limiting', () => {
    it('should get rate limit stats', async () => {
      const stats = {
        limit: 60,
        remaining: 30,
        reset: new Date(),
      };

      mockRateLimiter.getStats.mockResolvedValue(stats);

      const result = await scrapingService.getRateLimitStats('test-identifier');

      expect(result).toEqual(stats);
    });
  });
});
