import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';

export interface ScrapingResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  url: string;
  timestamp: number;
  responseTime: number;
}

export interface ScrapingConfig {
  userAgent?: string;
  timeout?: number;
  retryAttempts?: number;
  waitForSelector?: string;
  waitForTimeout?: number;
  headers?: Record<string, string>;
}

export abstract class BaseScraper {
  protected browser: Browser | null = null;
  protected config: ScrapingConfig;

  constructor(config: ScrapingConfig = {}) {
    this.config = {
      userAgent: process.env.SCRAPING_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      timeout: parseInt(process.env.SCRAPING_TIMEOUT_MS || '30000'),
      retryAttempts: parseInt(process.env.SCRAPING_RETRY_ATTEMPTS || '3'),
      waitForSelector: undefined,
      waitForTimeout: 5000,
      headers: {},
      ...config,
    };
  }

  /**
   * Browser'ı başlat
   */
  protected async initBrowser(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      });
    }
  }

  /**
   * Browser'ı kapat
   */
  protected async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Yeni sayfa oluştur ve yapılandır
   */
  protected async createPage(): Promise<Page> {
    await this.initBrowser();
    const page = await this.browser!.newPage();
    
    // User agent ayarla
    await page.setUserAgent(this.config.userAgent!);
    
    // Viewport ayarla
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Headers ayarla
    if (this.config.headers) {
      await page.setExtraHTTPHeaders(this.config.headers);
    }
    
    // Timeout ayarla
    page.setDefaultTimeout(this.config.timeout!);
    
    return page;
  }

  /**
   * URL'den HTML içeriğini al
   */
  protected async fetchHTML(url: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts!; attempt++) {
      const page = await this.createPage();
      
      try {
        // Sayfayı yükle
        await page.goto(url, { 
          waitUntil: 'networkidle2',
          timeout: this.config.timeout 
        });

        // Belirli bir selector için bekle (varsa)
        if (this.config.waitForSelector) {
          await page.waitForSelector(this.config.waitForSelector, { 
            timeout: this.config.waitForTimeout 
          });
        }

        // HTML içeriğini al
        const html = await page.content();
        await page.close();
        
        return html;
      } catch (error) {
        lastError = error as Error;
        await page.close();
        
        if (attempt < this.config.retryAttempts!) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Failed to fetch HTML after ${this.config.retryAttempts} attempts: ${lastError?.message}`);
  }

  /**
   * HTML'den Cheerio instance'ı oluştur
   */
  protected loadHTML(html: string): cheerio.Root {
    return cheerio.load(html);
  }

  /**
   * Fiyat metnini temizle ve sayıya çevir
   */
  protected parsePrice(priceText: string): number | null {
    if (!priceText) return null;
    
    // Türkçe fiyat formatını destekle (1.234,56 TL)
    const cleanText = priceText
      .replace(/[^\d.,]/g, '') // Sadece rakam, nokta ve virgül bırak
      .replace(/\./g, '') // Binlik ayracı noktaları kaldır
      .replace(',', '.'); // Ondalık ayracı virgülü noktaya çevir
    
    const price = parseFloat(cleanText);
    return isNaN(price) ? null : price;
  }

  /**
   * Ana scraping metodu - alt sınıflarda implement edilmeli
   */
  abstract scrape(url: string): Promise<ScrapingResult>;

  /**
   * Scraping sonucunu logla
   */
  protected logResult(result: ScrapingResult): void {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} Scraping ${result.url}: ${result.responseTime}ms`);
    
    if (!result.success && result.error) {
      console.error(`Error: ${result.error}`);
    }
  }

  /**
   * Cleanup - browser'ı kapat
   */
  async cleanup(): Promise<void> {
    await this.closeBrowser();
  }
}
