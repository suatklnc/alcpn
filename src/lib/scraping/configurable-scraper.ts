import { BaseScraper, ScrapingResult, ScrapingConfig } from './base-scraper';
import * as cheerio from 'cheerio';

export interface ScrapingRule {
  name: string;
  urlPattern: string;
  selectors: {
    price: SelectorConfig;
    title?: SelectorConfig;
    availability?: SelectorConfig;
    image?: SelectorConfig;
  };
  priceFormat?: 'decimal' | 'currency';
  waitForSelector?: string;
  customHeaders?: Record<string, string>;
}

export interface SelectorConfig {
  selector: string;
  type: 'text' | 'attr';
  attribute?: string;
}

export interface ScrapingData extends Record<string, unknown> {
  price: number | null;
  title?: string;
  availability?: string;
  image?: string;
  url: string;
  timestamp: number;
}

export class ConfigurableScraper extends BaseScraper {
  private rules: Map<string, ScrapingRule> = new Map();

  constructor(config: ScrapingConfig = {}) {
    super(config);
  }

  /**
   * Scraping kuralı ekle
   */
  addRule(rule: ScrapingRule): void {
    this.rules.set(rule.name, rule);
  }

  /**
   * Scraping kuralını kaldır
   */
  removeRule(name: string): void {
    this.rules.delete(name);
  }

  /**
   * Tüm kuralları getir
   */
  getRules(): ScrapingRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Belirli bir kural ile scraping yap
   */
  async scrapeWithRule(ruleName: string, url?: string): Promise<ScrapingResult> {
    const rule = this.rules.get(ruleName);
    if (!rule) {
      return {
        success: false,
        error: `Rule '${ruleName}' not found`,
        url: url || '',
        timestamp: Date.now(),
        responseTime: 0,
      };
    }

    const targetUrl = url || rule.urlPattern;
    return this.scrape(targetUrl, rule);
  }

  /**
   * Geçici kural ile scraping yap (test için)
   */
  async scrapeWithRules(rule: ScrapingRule, url: string): Promise<ScrapingResult> {
    const startTime = Date.now();
    
    try {
      // HTML al
      const html = await this.fetchHTML(url);
      const $ = this.loadHTML(html);

      // Veriyi çıkar
      const data = this.extractDataWithConfig($, rule, url);

      return {
        success: true,
        data,
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
   * Ana scraping metodu
   */
  async scrape(url: string, rule?: ScrapingRule): Promise<ScrapingResult> {
    const startTime = Date.now();
    
    try {
      // Eğer rule belirtilmemişse, URL'ye uygun kuralı bul
      const targetRule = rule || this.findMatchingRule(url);
      
      if (!targetRule) {
        return {
          success: false,
          error: 'No matching rule found for URL',
          url,
          timestamp: Date.now(),
          responseTime: Date.now() - startTime,
        };
      }

      // Özel konfigürasyon ile HTML al
      const html = await this.fetchHTMLWithConfig(url, targetRule);
      const $ = this.loadHTML(html);

      // Veriyi çıkar
      const data = this.extractData($, targetRule, url);

      return {
        success: true,
        data,
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
   * Özel konfigürasyon ile HTML al
   */
  private async fetchHTMLWithConfig(url: string, rule: ScrapingRule): Promise<string> {
    const page = await this.createPage();
    
    try {
      // Özel headers ayarla
      if (rule.customHeaders) {
        await page.setExtraHTTPHeaders(rule.customHeaders);
      }

      // Sayfayı yükle
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: this.config.timeout 
      });

      // Belirli selector için bekle
      if (rule.waitForSelector) {
        await page.waitForSelector(rule.waitForSelector, { 
          timeout: this.config.waitForTimeout 
        });
      }

      return await page.content();
    } finally {
      await page.close();
    }
  }

  /**
   * URL'ye uygun kuralı bul
   */
  private findMatchingRule(url: string): ScrapingRule | null {
    for (const rule of this.rules.values()) {
      if (url.includes(rule.urlPattern) || rule.urlPattern.includes(url)) {
        return rule;
      }
    }
    return null;
  }

  /**
   * HTML'den veriyi çıkar (eski format)
   */
  private extractData($: cheerio.Root, rule: ScrapingRule, url: string): ScrapingData {
    const data: ScrapingData = {
      price: null,
      url,
      timestamp: Date.now(),
    };

    // Fiyat çıkar
    const priceElement = $(rule.selectors.price.selector).first();
    if (priceElement.length > 0) {
      const priceText = priceElement.text().trim();
      data.price = this.parsePrice(priceText);
    }

    // Başlık çıkar
    if (rule.selectors.title) {
      const titleElement = $(rule.selectors.title.selector).first();
      if (titleElement.length > 0) {
        data.title = titleElement.text().trim();
      }
    }

    // Stok durumu çıkar
    if (rule.selectors.availability) {
      const availabilityElement = $(rule.selectors.availability.selector).first();
      if (availabilityElement.length > 0) {
        data.availability = availabilityElement.text().trim();
      }
    }

    // Resim URL'si çıkar
    if (rule.selectors.image) {
      const imageElement = $(rule.selectors.image.selector).first();
      if (imageElement.length > 0) {
        data.image = imageElement.attr('src') || imageElement.attr('data-src') || '';
      }
    }

    return data;
  }

  /**
   * HTML'den veriyi çıkar (yeni config format ile)
   */
  private extractDataWithConfig($: cheerio.Root, rule: ScrapingRule, url: string): ScrapingData {
    const data: ScrapingData = {
      price: null,
      url,
      timestamp: Date.now(),
    };

    // Fiyat çıkar
    const priceElement = $(rule.selectors.price.selector).first();
    if (priceElement.length > 0) {
      if (rule.selectors.price.type === 'attr') {
        const priceText = priceElement.attr(rule.selectors.price.attribute || 'value') || '';
        data.price = this.parsePrice(priceText);
      } else {
        const priceText = priceElement.text().trim();
        data.price = this.parsePrice(priceText);
      }
    }

    // Başlık çıkar
    if (rule.selectors.title) {
      const titleElement = $(rule.selectors.title.selector).first();
      if (titleElement.length > 0) {
        if (rule.selectors.title.type === 'attr') {
          data.title = titleElement.attr(rule.selectors.title.attribute || 'value') || '';
        } else {
          data.title = titleElement.text().trim();
        }
      }
    }

    // Stok durumu çıkar
    if (rule.selectors.availability) {
      const availabilityElement = $(rule.selectors.availability.selector).first();
      if (availabilityElement.length > 0) {
        if (rule.selectors.availability.type === 'attr') {
          data.availability = availabilityElement.attr(rule.selectors.availability.attribute || 'value') || '';
        } else {
          data.availability = availabilityElement.text().trim();
        }
      }
    }

    // Resim URL'si çıkar
    if (rule.selectors.image) {
      const imageElement = $(rule.selectors.image.selector).first();
      if (imageElement.length > 0) {
        if (rule.selectors.image.type === 'attr') {
          data.image = imageElement.attr(rule.selectors.image.attribute || 'src') || '';
        } else {
          data.image = imageElement.text().trim();
        }
      }
    }

    return data;
  }

  /**
   * Toplu scraping yap
   */
  async scrapeMultiple(urls: string[]): Promise<ScrapingResult[]> {
    const results: ScrapingResult[] = [];
    
    // Paralel scraping (rate limiting için batch'ler halinde)
    const batchSize = 3;
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(url => this.scrape(url))
      );
      results.push(...batchResults);
      
      // Batch'ler arası kısa bekleme
      if (i + batchSize < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  /**
   * Fiyat metnini sayıya çevir
   */
  protected parsePrice(priceText: string): number | null {
    if (!priceText) return null;
    
    // Sadece sayıları ve nokta/virgülü al
    const cleanText = priceText.replace(/[^\d.,]/g, '');
    
    if (!cleanText) return null;
    
    // Virgülü noktaya çevir
    const normalizedText = cleanText.replace(',', '.');
    
    const price = parseFloat(normalizedText);
    return isNaN(price) ? null : price;
  }

  /**
   * Scraping kurallarını JSON'dan yükle
   */
  loadRulesFromJSON(rulesJson: string): void {
    try {
      const rules: ScrapingRule[] = JSON.parse(rulesJson);
      rules.forEach(rule => this.addRule(rule));
    } catch (error) {
      throw new Error(`Failed to load rules from JSON: ${error}`);
    }
  }

  /**
   * Scraping kurallarını JSON'a dışa aktar
   */
  exportRulesToJSON(): string {
    return JSON.stringify(this.getRules(), null, 2);
  }
}
